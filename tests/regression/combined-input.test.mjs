import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {combineGenerationInput} from '../../Service/input/combinedInput.mjs';
import {docxSource,pdfSource,DOCX_MIME} from '../fixtures/uploadFiles.mjs';
import {documentFixtureClient,documentParagraph} from '../fixtures/documentFixtures.mjs';
import {fixtures,fixtureClient} from '../webpage/fixtures.mjs';
import {generateJsonWithRetry} from '../../Service/ai/generateJsonWithRetry.mjs';
process.env.GEMINI_API_KEY ||= 'test-key-never-used';
const {createApp}=await import('../../src/app.mjs');
const {generateService}=await import('../../Service/generateService.mjs');
const model={create:async value=>({...value,_id:'fixture',save:async()=>{}})};
async function serve(t,options) {
    const app=createApp({model,...options});const server=await new Promise(resolve=>{const server=app.listen(0,'127.0.0.1',()=>resolve(server));});
    t.after(()=>server.close());return `http://127.0.0.1:${server.address().port}`;
}

test('generation endpoints expose actionable provider diagnostics with dependency HTTP statuses',async t=>{
    const base=await serve(t,{generator:async()=>generateJsonWithRetry({client:{models:{generateContent:async()=>{throw Object.assign(new Error('API_KEY_INVALID PRIVATE_SECRET'),{status:400});}}},request:{model:'fixture',contents:'PRIVATE_PROMPT'},schema:{type:'object'},stage:'presentation-outline',outputType:'presentation',logger:()=>{}})});
    const response=await fetch(base+'/api/generate/textPrompt',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({textPrompt:'Explain government.',outputType:'presentation'})});
    const body=await response.json();
    assert.equal(response.status,502);assert.equal(body.errorCode,'AI_PROVIDER_ERROR');assert.equal(body.providerStatus,400);
    assert.equal(body.providerReason,'INVALID_API_KEY');assert.equal(body.stage,'presentation-outline');assert.ok(body.requestId);
    assert.match(body.error,/GEMINI_API_KEY/);assert.ok(!JSON.stringify(body).includes('PRIVATE_SECRET'));assert.ok(!JSON.stringify(body).includes('PRIVATE_PROMPT'));
});

test('unified JSON/multipart endpoint supports all seven input combinations for all three output choices',async t=>{
    const seen=[];const base=await serve(t,{extractUrl:async()=> 'Public webpage source.',generator:async(kind,input,outputType,context)=>{
        seen.push({kind,input,outputType,context});return {inputType:kind,outputType,generatedContent:{title:'Result'}};
    }});
    for(const outputType of ['presentation','document','webpage'])for(let combination=1;combination<8;combination++) {
        const prompt=Boolean(combination&1),url=Boolean(combination&2),file=Boolean(combination&4);
        let body,headers;
        const fields={outputType,context:{audience:'Students'},...(prompt?{textPrompt:'Create exactly 5 slides.'}:{}),...(url?{urlPrompt:'https://example.com/source'}:{})};
        if(file){body=new FormData();for(const [name,value]of Object.entries(fields))body.set(name,typeof value==='object'?JSON.stringify(value):value);body.set('file',new Blob([await docxSource()],{type:DOCX_MIME}),'source.docx');}
        else{body=JSON.stringify(fields);headers={'Content-Type':'application/json'};}
        const response=await fetch(base+'/api/generate',{method:'POST',body,headers}),json=await response.json();assert.equal(response.status,201,JSON.stringify(json));
        const call=seen.at(-1);assert.equal(call.outputType,outputType);assert.equal(call.kind,file?'file':url?'url':'prompt');
        if(prompt){assert.match(call.input,/Create exactly 5 slides/);assert.match(call.context.instructions,/Create exactly 5 slides/);}
        if(file)assert.match(call.input,/readable source document/);
        if(url)assert.match(call.input,/Public webpage source/);
        assert.equal(json.data.result.sources.length,Number(prompt)+Number(url)+Number(file));assert.equal(json.data.result.generatedContent.title,'Result');
    }
    assert.equal(seen.length,21);
});

test('unified endpoint rejects invalid combinations before generation and validates attachment before fetching URL',async t=>{
    let generated=0,urls=0;
    const base=await serve(t,{extractUrl:async()=>{urls++;return 'URL source';},generator:async()=>{generated++;return {};}});
    for(const payload of [{outputType:'document'},{outputType:'wrong',textPrompt:'Hello'},{outputType:'document',textPrompt:['Hello']},{outputType:'document',urlPrompt:'file:///private'},{outputType:'document',urlPrompt:'https://user:password@example.com'},{outputType:'document',textPrompt:'x'.repeat(20001)},{outputType:'document',textPrompt:'Hello',context:{instructions:'x'.repeat(20001)}}]) {
        const response=await fetch(base+'/api/generate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});assert.equal(response.status,400);
    }
    for(const [name,mime,bytes,status]of [['source.txt','text/plain',Buffer.from('Text'),415],['fake.pdf','application/pdf',Buffer.from('Renamed TXT'),400],['invalid.docx',DOCX_MIME,Buffer.from('Bad DOCX'),400]]) {
        const body=new FormData();body.set('outputType','document');body.set('urlPrompt','https://example.com');body.set('textPrompt','Use both sources');body.set('file',new Blob([bytes],{type:mime}),name);
        assert.equal((await fetch(base+'/api/generate',{method:'POST',body})).status,status);
    }
    const malformedContext=new FormData();malformedContext.set('outputType','document');malformedContext.set('textPrompt','Hello');malformedContext.set('context','{bad');
    assert.equal((await fetch(base+'/api/generate',{method:'POST',body:malformedContext})).status,400);
    const badCount=await fetch(base+'/api/generate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({outputType:'presentation',textPrompt:'Create 13 slides',urlPrompt:'https://example.com'})});
    assert.equal(badCount.status,400);assert.equal((await badCount.json()).errorCode,'INVALID_SLIDE_COUNT');
    const multiple=new FormData();multiple.set('outputType','document');for(let i=0;i<2;i++)multiple.append('file',new Blob([pdfSource()],{type:'application/pdf'}),`source-${i}.pdf`);
    assert.equal((await fetch(base+'/api/generate',{method:'POST',body:multiple})).status,400);
    assert.equal(generated,0);assert.equal(urls,0);
});

test('combined extraction failures and oversized sources cannot silently produce partial-source output',async()=>{
    const options={body:{outputType:'document',urlPrompt:'https://example.com',textPrompt:'Summarize both'},file:{originalname:'source.pdf',mimetype:'application/pdf',buffer:pdfSource()},context:{},extractFile:async()=> 'File content',extractUrl:async()=>{throw Object.assign(new Error('URL failed'),{code:'SOURCE_URL_FAILED'});}};
    await assert.rejects(combineGenerationInput(options),{code:'SOURCE_URL_FAILED'});
    await assert.rejects(combineGenerationInput({...options,extractUrl:async()=> 'x'.repeat(200001)}),{code:'INVALID_REQUEST'});
    await assert.rejects(combineGenerationInput({...options,extractUrl:async()=> ''}),{code:'INVALID_REQUEST'});
    const combined=await combineGenerationInput({...options,file:undefined,body:{outputType:'document',textPrompt:'Explain API behavior'},context:{instructions:'Write a 100-word guide'},extractUrl:async()=>''});
    assert.match(combined.input,/Write a 100-word guide/);assert.match(combined.input,/Explain API behavior/);
});

test('prompt plus PDF plus URL traverses real Word generation and serves protected preview/download',async t=>{
    const root=await fs.mkdtemp(path.join(os.tmpdir(),'ledify-combined-doc-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));
    let received;
    const base=await serve(t,{documentRoot:root,extractUrl:async()=>documentParagraph,generator:(kind,input,output,context)=>{
        received={kind,input,context};return generateService(kind,input,output,context,{ai:{client:documentFixtureClient(),logger:()=>{}},document:{root}});
    }});
    const body=new FormData();body.set('outputType','document');body.set('textPrompt','Explain REST APIs');body.set('urlPrompt','https://example.com/api');body.set('context',JSON.stringify({wordCount:100}));body.set('file',new Blob([pdfSource(documentParagraph)],{type:'application/pdf'}),'api.pdf');
    const response=await fetch(base+'/api/generate',{method:'POST',body}),json=await response.json();assert.equal(response.status,201,JSON.stringify(json));
    assert.equal(received.kind,'file');assert.match(received.context.instructions,/Explain REST APIs/);assert.match(received.input,/ATTACHED FILE SOURCE/);assert.match(received.input,/URL SOURCE/);
    const result=json.data.result;assert.equal(result.sources.length,3);assert.equal(result.artifacts.format,'docx');assert.ok(!JSON.stringify(json).includes(root));
    const preview=await fetch(base+result.previewUrl);assert.equal(preview.status,200);assert.match(await preview.text(),/A REST API exposes resources/);
    const download=await fetch(base+result.downloadUrl);assert.equal(download.status,200);assert.match(download.headers.get('content-type'),/wordprocessingml/);
});

test('combined inputs traverse real webpage generation, preview and ZIP download',async t=>{
    const root=await fs.mkdtemp(path.join(os.tmpdir(),'ledify-combined-web-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));
    const base=await serve(t,{webpageRoot:root,extractUrl:async()=>fixtures.business.source,
        generator:(kind,input,output,context)=>generateService(kind,input,output,context,{ai:{client:fixtureClient(fixtures.business),logger:()=>{}},artifacts:{root}})});
    const body=new FormData();body.set('outputType','webpage');body.set('textPrompt','Create a business website from both sources');body.set('urlPrompt','https://example.com/business');body.set('file',new Blob([await docxSource(fixtures.business.source)],{type:DOCX_MIME}),'business.docx');
    const response=await fetch(base+'/api/generate',{method:'POST',body}),json=await response.json();assert.equal(response.status,201,JSON.stringify(json));
    const result=json.data.result;assert.equal(result.sources.length,3);
    const preview=await fetch(base+result.artifacts.previewUrl);assert.equal(preview.status,200);
    assert.equal((await fetch(base+result.artifacts.downloadUrl)).status,200);
    assert.ok(!JSON.stringify(json).includes(root));
});

test('unified URL input retains protection against private network requests',async t=>{
    let generated=0;const base=await serve(t,{generator:async()=>{generated++;return {};}});
    const response=await fetch(base+'/api/generate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({outputType:'document',textPrompt:'Summarize this URL',urlPrompt:'http://127.0.0.1/private'})});
    assert.equal(response.status,400);assert.equal(generated,0);assert.equal((await response.json()).errorCode,'INVALID_SOURCE_URL');
});
