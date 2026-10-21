import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {once} from 'node:events';
import {createApp} from '../../src/app.mjs';
import {createHttpServer} from '../../src/httpServer.mjs';

const origin='https://frontend.example';
async function serve(t,options={}) {
    const server=createHttpServer(createApp({model:{create:async value=>({...value,_id:'fixture',save:async()=>{}})},generator:async()=>({status:'completed',outputType:'document'}),...options}));
    server.listen(0,'127.0.0.1');await once(server,'listening');
    t.after(()=>new Promise(resolve=>{server.close(resolve);server.closeAllConnections();}));
    return {server,request:(url,options={})=>fetch(`http://127.0.0.1:${server.address().port}${url}`,{...options,headers:{Origin:origin,...options.headers}})};
}
const json=body=>({method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
function allowed(response){assert.equal(response.headers.get('access-control-allow-origin'),'*');}

test('browser preflight allows JSON and background-generation headers on every input route',async t=>{
    const {request,server}=await serve(t);
    assert.equal(server.keepAliveTimeout,120000);assert.ok(server.headersTimeout>server.keepAliveTimeout);
    for(const route of ['/generate','/generate/textPrompt','/generate/urlPrompt','/generate/file']) {
        const response=await request('/api'+route,{method:'OPTIONS',headers:{'Access-Control-Request-Method':'POST','Access-Control-Request-Headers':'content-type,prefer,x-ledify-response-version'}});
        assert.equal(response.status,204);allowed(response);
        assert.match(response.headers.get('access-control-allow-methods'),/POST/);
        assert.match(response.headers.get('access-control-allow-headers'),/prefer/);
    }
});

test('success, invalid JSON, oversized JSON and validation failures retain CORS headers',async t=>{
    const {request}=await serve(t);
    for(const [body,status] of [
        [JSON.stringify({textPrompt:'Write a report',outputType:'document'}),201],
        ['{"textPrompt":',400],
        [JSON.stringify({textPrompt:'x'.repeat(16*1024*1024)}),413],
        [JSON.stringify({outputType:'invalid'}),400]
    ]) {
        const response=await request('/api/generate/textPrompt',{method:'POST',headers:{'Content-Type':'application/json'},body});
        assert.equal(response.status,status);allowed(response);await response.json();
    }
});

test('provider and capacity errors remain readable cross-origin with retry advice',async t=>{
    for(const [code,status] of [['AI_PROVIDER_ERROR',502],['AI_PROVIDER_BUSY',503]]) {
        const {request}=await serve(t,{generator:async()=>{throw Object.assign(new Error('fixture'),{code,stage:'presentation-outline'});}});
        const response=await request('/api/generate/textPrompt',json({textPrompt:'Write a report',outputType:'document'}));
        assert.equal(response.status,status);allowed(response);
        assert.equal((await response.json()).errorCode,code);
        assert.match(response.headers.get('access-control-expose-headers'),/Retry-After/);
        if(status===503)assert.equal(response.headers.get('retry-after'),'15');
    }
});

test('background acceptance and polling work cross-origin while generation is still running',async t=>{
    const root=await fs.mkdtemp(path.join(os.tmpdir(),'ledify-cors-'));
    t.after(()=>fs.rm(root,{recursive:true,force:true}));
    let release,finished;const gate=new Promise(resolve=>{release=resolve;}),done=new Promise(resolve=>{finished=resolve;});
    t.after(()=>release());
    const {request}=await serve(t,{jobRoot:root,generator:async()=>{await gate;finished();return {status:'completed',outputType:'document',generatedContent:{title:'Ready'}};}});
    const accepted=await request('/api/generate/textPrompt',{...json({textPrompt:'Write a report',outputType:'document'}),headers:{'Content-Type':'application/json',Prefer:'respond-async'}});
    assert.equal(accepted.status,202);allowed(accepted);
    assert.equal(accepted.headers.get('preference-applied'),'respond-async');
    assert.match(accepted.headers.get('access-control-expose-headers'),/Location/);
    const {data}=await accepted.json();assert.equal(accepted.headers.get('location'),data.statusUrl);
    const pending=await request(data.statusUrl);allowed(pending);assert.equal(pending.status,200);
    assert.ok(['queued','processing'].includes((await pending.json()).data.status));
    release();await done;
    const deadline=Date.now()+10000;
    while(Date.now()<deadline) {
        const response=await request(data.statusUrl);allowed(response);
        const {data:job}=await response.json();
        if(job.status==='completed'){assert.equal(job.result.generatedContent.title,'Ready');return;}
        assert.notEqual(job.status,'failed');await new Promise(resolve=>setTimeout(resolve,25));
    }
    assert.fail('Background completion was not published');
});
