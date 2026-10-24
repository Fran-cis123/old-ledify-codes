import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {once,EventEmitter} from 'node:events';
import {load} from 'cheerio';
import JSZip from 'jszip';
import {PDFParse} from 'pdf-parse';
import {pdfSource,docxSource,DOCX_MIME} from '../fixtures/uploadFiles.mjs';
import {MAX_FILE_BYTES,validateUploadedFile} from '../../Service/input/fileValidation.mjs';
import {urlService} from '../../Service/urlService.mjs';
import {fetchPublicText} from '../../Service/input/publicUrl.mjs';
import {documentArtifactService} from '../../Service/document/documentArtifactService.mjs';
import {ensureDocumentPdf} from '../../Service/document/documentPdfService.mjs';
import {documentParagraph} from '../fixtures/documentFixtures.mjs';
import {planWebsiteImages} from '../../Service/webpage/imageStrategy.mjs';
import {compileWebsiteBrief} from '../../Service/webpage/websiteBrief.mjs';
process.env.GEMINI_API_KEY||='test-key-never-used';
const {createApp}=await import('../../src/app.mjs');
const {generateService}=await import('../../Service/generateService.mjs');
async function temporary(t){const root=await fs.mkdtemp(path.join(os.tmpdir(),'ledify-week6-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));return root;}
async function api(t,options={}){const app=createApp({model:{create:async v=>({...v,_id:'week6',save:async()=>{}})},generator:async()=>({status:'completed'}),...options}),server=app.listen(0,'127.0.0.1');await once(server,'listening');t.after(()=>{server.closeAllConnections();server.close();});return `http://127.0.0.1:${server.address().port}`;}
const json=body=>({method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});

test('LED-02 and LED-05: exact prompt boundaries and output values on legacy/unified endpoints',async t=>{
 let calls=0;const base=await api(t,{generator:async()=>{calls++;return {status:'completed'};}});
 for(const route of ['/api/generate/textPrompt','/api/generate'])for(const outputType of ['presentation','document','webpage']){
  for(const length of [10,2000])assert.equal((await fetch(base+route,json({textPrompt:'x'.repeat(length),outputType}))).status,201);
  for(const textPrompt of ['', ' ', 'x'.repeat(9),'x'.repeat(2001),null,12,[]])assert.equal((await fetch(base+route,json({textPrompt,outputType}))).status,400);
 }
 assert.equal(calls,12);
 for(const outputType of [undefined,null,'',[],['webpage','document'],'pdf'])assert.equal((await fetch(base+'/api/generate',json({textPrompt:'Explain government',outputType}))).status,400);
 assert.equal(calls,12);
});

function sizedPdf(size){
 const source=pdfSource();if(size===source.length)return source;
 const offset=source.indexOf(Buffer.from('xref\n')),tail=source.subarray(offset).toString();let padding=size-source.length;
 for(let i=0;i<3;i++)padding=size-source.length-String(offset+padding).length+String(offset).length;
 const result=Buffer.concat([source.subarray(0,offset),Buffer.from('%'),Buffer.alloc(padding-2,32),Buffer.from('\n'),Buffer.from(tail.replace(/startxref\n\d+/,`startxref\n${offset+padding}`))]);assert.equal(result.length,size);return result;
}
test('LED-03: valid small files and exact 1 MiB/50 MiB multipart boundaries',async t=>{
 let calls=0;const base=await api(t,{extractFile:async()=> 'Verified source content',generator:async()=>{calls++;return {status:'completed'};}});
 for(const route of ['/api/generate/file','/api/generate'])for(const size of [pdfSource().length,1024*1024,MAX_FILE_BYTES,MAX_FILE_BYTES+1]){
  const body=new FormData();body.set('outputType','document');body.set('file',new Blob([sizedPdf(size)],{type:'application/pdf'}),'source.pdf');
  const response=await fetch(base+route,{method:'POST',body});assert.equal(response.status,size>MAX_FILE_BYTES?413:201);if(response.status===413)assert.equal((await response.json()).errorCode,'UPLOAD_TOO_LARGE');
 }
 const zip=await JSZip.loadAsync(await docxSource());zip.file('padding.bin',Buffer.alloc(0));const overhead=(await zip.generateAsync({type:'nodebuffer',compression:'STORE'})).length;
 for(const size of [1024*1024,MAX_FILE_BYTES,MAX_FILE_BYTES+1]){
  zip.file('padding.bin',Buffer.alloc(size-overhead,32));const buffer=await zip.generateAsync({type:'nodebuffer',compression:'STORE'});assert.equal(buffer.length,size);
  const body=new FormData();body.set('outputType','document');body.set('file',new Blob([buffer],{type:DOCX_MIME}),'source.docx');const response=await fetch(base+'/api/generate/file',{method:'POST',body});assert.equal(response.status,size>MAX_FILE_BYTES?413:201);
 }
 const small=await docxSource();await validateUploadedFile({originalname:'source.docx',mimetype:DOCX_MIME,buffer:small});
 assert.equal(calls,8);
});

const htmlFetch=text=>async()=>({text,contentType:'text/html'});
test('LED-04: login/paywall detection does not mistake public navigation for restricted content',async()=>{
 for(const html of ['<h1>Sign in</h1><form><input type="password"></form>','<script type="application/ld+json">{"isAccessibleForFree":false}</script><main>Article excerpt</main>','<main>Article excerpt</main><div class="paywall">Subscribe to unlock</div>'])await assert.rejects(urlService('https://example.com',{fetchText:htmlFetch(html)}),e=>['SOURCE_URL_AUTH_REQUIRED','SOURCE_URL_PAYWALL'].includes(e.code));
 const extracted=await urlService('https://example.com',{fetchText:htmlFetch('<nav><a href="/login">Sign in</a></nav><article><h1>Public research</h1><p>Open scientific content is readable without an account.</p></article>')});assert.match(extracted,/Open scientific content/);assert.ok(!extracted.includes('Sign in'));
 for(const [status,code] of [[401,'SOURCE_URL_AUTH_REQUIRED'],[402,'SOURCE_URL_PAYWALL'],[403,'SOURCE_URL_ACCESS_DENIED'],[404,'SOURCE_URL_UNREACHABLE'],[429,'SOURCE_URL_RATE_LIMITED'],[503,'SOURCE_URL_UNREACHABLE']])await assert.rejects(urlService('https://example.com',{fetchText:async()=>{throw Object.assign(new Error('upstream'),{status});}}),{code});
 for(const [code,expected] of [['ENOTFOUND','SOURCE_URL_UNREACHABLE'],['ECONNREFUSED','SOURCE_URL_UNREACHABLE'],['SOURCE_URL_TIMEOUT','SOURCE_URL_TIMEOUT']])await assert.rejects(urlService('https://example.com',{fetchText:async()=>{throw Object.assign(new Error('network'),{code});}}),{code:expected});
 await assert.rejects(urlService('https://example.com',{fetchText:htmlFetch('<html><body><script>renderOnly()</script></body></html>')}),{code:'INVALID_SOURCE_URL_CONTENT'});
});

test('LED-04 and LED-16–19: source HTTP errors reach frontend with CORS and no generation',async t=>{
 for(const [status,expected] of [[401,422],[402,422],[403,422],[404,502],[429,429],[503,502]]){
  let calls=0;const base=await api(t,{extractUrl:url=>urlService(url,{fetchText:async()=>{throw Object.assign(new Error('upstream'),{status});}}),generator:async()=>{calls++;return {};}});
  for(const route of ['/api/generate/urlPrompt','/api/generate']){const response=await fetch(base+route,{...json({urlPrompt:'https://example.com/private',outputType:'document'}),headers:{'Content-Type':'application/json',Origin:'https://frontend.example'}});assert.equal(response.status,expected);assert.equal(response.headers.get('access-control-allow-origin'),'*');assert.equal((await response.json()).stage,'input-extraction');}
  assert.equal(calls,0);
 }
 let recovered=0;const base=await api(t,{extractUrl:url=>urlService(url,{fetchText:url.endsWith('/private')?htmlFetch('<form><input type="password"></form>'):htmlFetch('<article><p>Public source content is now accessible.</p></article>')}),generator:async()=>{recovered++;return {status:'completed'};}});
 assert.equal((await fetch(base+'/api/generate',json({urlPrompt:'https://example.com/private',outputType:'document'}))).status,422);
 assert.equal((await fetch(base+'/api/generate',json({urlPrompt:'https://example.com/public',outputType:'document'}))).status,201);assert.equal(recovered,1);
});

test('LED-04: native source transport propagates unreachable and timeout errors',async()=>{
 for(const code of ['ECONNREFUSED','SOURCE_URL_TIMEOUT']){
  const request=()=>{const req=new EventEmitter();req.end=()=>queueMicrotask(()=>{req.emit('error',Object.assign(new Error('connection failed'),{code}));req.emit('close');});return req;};
  await assert.rejects(urlService('https://example.com',{fetchText:(url,options)=>fetchPublicText(url,{...options,lookup:async()=>[{address:'8.8.8.8',family:4}],request})}),{code:code==='ECONNREFUSED'?'SOURCE_URL_UNREACHABLE':'SOURCE_URL_TIMEOUT'});
 }
});

const document=()=>({title:'Government and Public Accountability',documentType:'report',coverPage:false,sections:[{id:'overview',heading:'Government responsibilities',blocks:[{type:'paragraph',text:documentParagraph},{type:'list',items:['Public accountability','Public services']},{type:'table',columns:['Function','Purpose'],rows:[{cells:['Oversight','Review decisions']}]},{type:'code',text:'GET /public-information'}]}],references:[],assets:[],warnings:[]});
test('LED-08/12/14: PDF selection, real Word/PDF downloads, content parity and protected embedding',async t=>{
 const root=await temporary(t),base=await api(t,{documentRoot:root,generator:(kind,input,type,context)=>generateService(kind,input,type,context,{completedContent:{generatedContent:document()},document:{root}})});
 for(const route of ['/api/generate/textPrompt','/api/generate']){
  const response=await fetch(base+route,json({textPrompt:'Create a government report',outputType:'document',exportFormat:'pdf'})),body=await response.json();assert.equal(response.status,201,JSON.stringify(body));const result=body.data.result;assert.equal(result.artifacts.format,'pdf');assert.equal(result.artifacts.pdf.status,'completed');assert.equal(result.downloadUrl,result.artifacts.downloads.pdf);
  const pdf=await fetch(base+result.downloadUrl);assert.equal(pdf.status,200);assert.match(pdf.headers.get('content-type'),/application\/pdf/);assert.match(pdf.headers.get('content-disposition'),/\.pdf/);
  const bytes=Buffer.from(await pdf.arrayBuffer()),parser=new PDFParse({data:bytes});try{const parsed=await parser.getText();for(const text of ['Government and Public Accountability','Public accountability','Oversight','GET /public-information'])assert.ok(parsed.text.includes(text),text);}finally{await parser.destroy();}
  const cached=await fetch(base+result.artifacts.downloads.docx+'?format=pdf');assert.deepEqual(Buffer.from(await cached.arrayBuffer()),bytes);
  assert.equal((await fetch(base+result.artifacts.downloads.docx)).status,200);
  assert.equal((await fetch(base+result.downloadUrl.replace(/\/[a-f0-9]{64}\//,'/'+'0'.repeat(64)+'/'))).status,404);
  const prior=process.env.LEDIFY_FRONTEND_ORIGIN;process.env.LEDIFY_FRONTEND_ORIGIN='https://frontend.example';try{const preview=await fetch(base+result.previewUrl);assert.equal(preview.status,200);assert.match(preview.headers.get('content-security-policy'),/frame-ancestors 'self' https:\/\/frontend.example/);assert.equal(preview.headers.get('x-frame-options'),null);const $=load(await preview.text());assert.equal($('a[href="pdf"]').length,1);}finally{if(prior===undefined)delete process.env.LEDIFY_FRONTEND_ORIGIN;else process.env.LEDIFY_FRONTEND_ORIGIN=prior;}
 }
 for(const exportFormat of ['pptx','PDF',[],12])assert.equal((await fetch(base+'/api/generate',json({textPrompt:'Create a report',outputType:'document',exportFormat}))).status,400);
});

test('LED-14/18: converter failure preserves Word/preview and never claims a successful PDF export',async t=>{
 const root=await temporary(t),base=await api(t,{documentRoot:root,jobRoot:path.join(root,'jobs'),generator:(kind,input,type,context)=>generateService(kind,input,type,context,{completedContent:{generatedContent:document()},document:{root,pdf:{convert:async()=>{throw new Error('controlled failure');}}}})});
 const response=await fetch(base+'/api/generate',json({textPrompt:'Create a government report',outputType:'document',exportFormat:'pdf'})),body=await response.json();assert.equal(response.status,503);assert.equal(body.errorCode,'DOCUMENT_PDF_UNAVAILABLE');assert.equal(body.stage,'document-export');const result=body.data.result;assert.equal(result.status,'incomplete');assert.equal(result.downloadUrl,null);assert.equal(result.artifacts.pdf.status,'failed');assert.equal((await fetch(base+result.artifacts.downloads.docx)).status,200);assert.equal((await fetch(base+result.previewUrl)).status,200);
 const request=json({textPrompt:'Create a government report',outputType:'document',exportFormat:'pdf'});request.headers.Prefer='respond-async';const queued=await fetch(base+'/api/generate',request);assert.equal(queued.status,202);const accepted=await queued.json();let job;
 for(let i=0;i<100;i++){job=(await (await fetch(base+accepted.data.statusUrl)).json()).data;if(job.status==='failed')break;await new Promise(resolve=>setTimeout(resolve,25));}
 assert.equal(job.status,'failed');assert.equal(job.error.errorCode,'DOCUMENT_PDF_UNAVAILABLE');assert.equal(job.result.artifacts.pdf.status,'failed');assert.equal((await fetch(base+job.result.artifacts.downloads.docx)).status,200);
});

test('LED-14: concurrent PDF downloads share one conversion and validated cached output',async t=>{
 const root=await temporary(t),artifact=await documentArtifactService(document(),{},{root}),directory=path.join(root,artifact.id);let calls=0;
 const convert=async({pdfPath})=>{calls++;await fs.writeFile(pdfPath,pdfSource('Government responsibilities and public services are reviewed.'));};
 const [a,b]=await Promise.all([ensureDocumentPdf(directory,{convert}),ensureDocumentPdf(directory,{convert})]);assert.equal(a.pdfPath,b.pdfPath);assert.equal(calls,1);assert.equal((await ensureDocumentPdf(directory,{convert})).cacheHit,true);assert.equal(calls,1);
 await fs.writeFile(a.pdfPath,'corrupt PDF');assert.equal((await ensureDocumentPdf(directory,{convert})).cacheHit,false);assert.equal(calls,2);
});

test('LED-14: missing native converter returns actionable HTTP 503 and preserves Word',async t=>{
 const root=await temporary(t),artifact=await documentArtifactService(document(),{},{root}),base=await api(t,{documentRoot:root});
 const prior=process.env.LIBREOFFICE_PATH;process.env.LIBREOFFICE_PATH=path.join(root,'converter-not-installed');
 try{const response=await fetch(base+artifact.downloads.pdf);assert.equal(response.status,503);assert.equal(response.headers.get('retry-after'),'15');assert.equal((await response.json()).errorCode,'DOCUMENT_PDF_UNAVAILABLE');assert.equal((await fetch(base+artifact.downloads.docx)).status,200);}finally{if(prior===undefined)delete process.env.LIBREOFFICE_PATH;else process.env.LIBREOFFICE_PATH=prior;}
});

test('LED-09: educational topics retain their specific imagery and inferred supporting images are optional',()=>{
 const page={title:'Space exploration',brandName:'Beyond Earth',hero:{headline:'Beyond Earth',subheadline:'Explore space',actionLabel:'Explore'},contact:{},designBrief:{industry:'education',imageDirection:'Lunar landers and orbital spacecraft',heroComposition:'image-led'},sections:[{id:'lunar',type:'topics',heading:'Lunar missions',composition:'image-text',items:[]}]};
 page.websiteBrief=compileWebsiteBrief(page,'Create a space website');assert.deepEqual(page.websiteBrief.photography.subjects,['Lunar landers and orbital spacecraft']);
 const images=planWebsiteImages(page,{instructions:'Use relevant images.'});assert.equal(images.find(p=>p.role==='hero').required,true);assert.equal(images.find(p=>p.role==='section').required,false);assert.ok(!images.some(p=>/library/i.test(p.query)));
 assert.equal(planWebsiteImages(page,{instructions:'Every section must have an image.'}).find(p=>p.role==='section').required,true);
 page.imagePlan=[{role:'section',sectionIndex:0,required:true,subject:'A lunar lander',alt:'Lander',aspectRatio:'16:9'}];assert.equal(planWebsiteImages(page).find(p=>p.role==='section').required,true);
});
