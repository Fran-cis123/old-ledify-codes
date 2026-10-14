import test from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {fetchPublicText} from '../../Service/input/publicUrl.mjs';
import {urlService,MAX_URL_TEXT_CHARACTERS,sourceUrlByteLimit} from '../../Service/urlService.mjs';
process.env.GEMINI_API_KEY ||= 'test-key-never-used';
const {createApp}=await import('../../src/app.mjs');
const lookup=async()=>[{address:'8.8.8.8',family:4}];
function resourceRequest({chunks,headers={}}) {
    const state={destroyed:false,delivered:0};
    const request=(url,options,callback)=>{
        const req=new EventEmitter();
        req.destroy=()=>{state.destroyed=true;req.emit('close');};
        req.end=()=>queueMicrotask(()=>{
            const res=new EventEmitter();res.statusCode=200;res.headers={'content-type':'text/html',...headers};res.resume=()=>{};callback(res);
            for(const chunk of chunks){if(state.destroyed)break;state.delivered+=chunk.length;res.emit('data',chunk);}
            if(!state.destroyed)res.emit('end');req.emit('close');
        });return req;
    };
    return {request,state};
}

test('webpage extraction accepts HTML over the old 2 MB limit while retaining readable article text',async()=>{
    const html=`<html><body><main><h1>Artificial intelligence</h1><script>${'x'.repeat(3*1024*1024)}</script><p>Reasoning, learning and ethics remain part of the article.</p></main></body></html>`;
    const {request}=resourceRequest({chunks:[Buffer.from(html)]});
    const text=await urlService('https://example.com/article',{fetchText:(url,options)=>fetchPublicText(url,{...options,lookup,request})});
    assert.match(text,/Artificial intelligence/);assert.match(text,/Reasoning, learning and ethics/);assert.ok(text.length<200);
});

test('Wikipedia citation/navigation widgets are removed while substantive article sections remain',async()=>{
    const html='<html><body><main class="mw-body-content"><h1>Artificial intelligence</h1><p>Article overview.</p><div class="navbox">Site navigation</div><div class="reflist">Long reference appendix</div><h2>Ethics</h2><p>Substantive ethical discussion.</p></main></body></html>';
    const text=await urlService('https://en.wikipedia.org/wiki/Artificial_intelligence',{fetchText:async()=>({text:html,contentType:'text/html'})});
    assert.match(text,/Article overview/);assert.match(text,/Substantive ethical discussion/);assert.ok(!text.includes('Long reference appendix'));assert.ok(!text.includes('Site navigation'));
});

test('download limits reject both declared oversized resources and chunked oversized streams',async()=>{
    const declared=resourceRequest({chunks:[Buffer.from('unused')],headers:{'content-length':'100'}});
    await assert.rejects(fetchPublicText('https://example.com',{lookup,request:declared.request,maxBytes:10}),error=>error.code==='SOURCE_URL_TOO_LARGE'&&error.maxBytes===10);
    assert.equal(declared.state.destroyed,true);assert.equal(declared.state.delivered,0);
    const chunked=resourceRequest({chunks:[Buffer.alloc(6),Buffer.alloc(6)]});
    await assert.rejects(fetchPublicText('https://example.com',{lookup,request:chunked.request,maxBytes:10}),{code:'SOURCE_URL_TOO_LARGE'});assert.equal(chunked.state.destroyed,true);
});

test('long readable articles below 200,000 characters survive intact; larger and empty sources fail explicitly',async()=>{
    const content='Article content. '.repeat(6000);
    for(const contentType of ['text/html','text/plain']) {
        const text=contentType==='text/html'?`<main><p>${content}</p></main>`:content;
        const extracted=await urlService('https://example.com',{fetchText:async()=>({text,contentType})});
        if(contentType==='text/plain')assert.equal(extracted,content.trim());
        else assert.ok(extracted.endsWith('Article content.'));
        assert.ok(extracted.length>80000);
    }
    await assert.rejects(urlService('https://example.com',{fetchText:async()=>({text:'x'.repeat(MAX_URL_TEXT_CHARACTERS+1),contentType:'text/plain'})}),{code:'SOURCE_URL_TEXT_TOO_LARGE'});
    await assert.rejects(urlService('https://example.com',{fetchText:async()=>({text:'  ',contentType:'text/plain'})}),{code:'INVALID_SOURCE_URL_CONTENT'});
    assert.ok(sourceUrlByteLimit()>=1024*1024&&sourceUrlByteLimit()<=20*1024*1024);
});

test('legacy and unified URL endpoints return actionable HTTP 413 for download/text limits',async t=>{
    for(const code of ['SOURCE_URL_TOO_LARGE','SOURCE_URL_TEXT_TOO_LARGE']) {
        let generated=0;const app=createApp({extractUrl:async()=>{throw Object.assign(new Error('Source is too large; use a shorter article.'),{code,stage:'input-extraction',maxBytes:10485760,maxCharacters:200000});},generator:async()=>{generated++;return {};}});
        const server=await new Promise(resolve=>{const server=app.listen(0,'127.0.0.1',()=>resolve(server));});t.after(()=>server.close());
        for(const endpoint of ['/api/generate','/api/generate/urlPrompt']) {
            const response=await fetch(`http://127.0.0.1:${server.address().port}${endpoint}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({outputType:'document',urlPrompt:'https://example.com'})});
            assert.equal(response.status,413);const body=await response.json();assert.equal(body.errorCode,code);assert.equal(body.stage,'input-extraction');assert.match(body.message,/shorter article/);
        }
        assert.equal(generated,0);
    }
});
