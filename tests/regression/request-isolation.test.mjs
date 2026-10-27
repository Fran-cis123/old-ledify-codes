import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {randomUUID} from 'node:crypto';
import {reviewImageCandidate} from '../../Service/webpage/imageReview.mjs';
import {evaluateImageRelevance} from '../../Service/visual/imageRelevance.mjs';
import {rankCuratedPhotos} from '../../Service/webpage/curatedSelection.mjs';
import {shareImageWork} from '../../Service/visual/imageAssetService.mjs';
import {bindImageAsset,assertImageBinding,validateWebpageBindings,validatePresentationBindings,webpageImageManifest} from '../../Service/visual/assetBinding.mjs';
import {createGenerationCapacity,withGenerationCapacity,generationCapacity} from '../../Service/generationCapacity.mjs';
import {createAiCapacity} from '../../Service/ai/providerCapacity.mjs';
import {generationJobs} from '../../Service/generationJobs.mjs';
import {createApp} from '../../src/app.mjs';
import {once} from 'node:events';
import {inputCapacity} from '../../Service/input/admission.mjs';
import {docxSource,DOCX_MIME} from '../fixtures/uploadFiles.mjs';
import {acquireProviderImage} from '../../Service/webpage/providerCache.mjs';
import {createImageAssetSession} from '../../Service/visual/presentationImageAssets.mjs';
import {imagePolicy} from '../../Service/visual/imagePolicy.mjs';
import {wantsTextOnly} from '../../Service/visual/imageArtDirection.mjs';
import {configuredImageProviders} from '../../Service/visual/imageProviders.mjs';
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function until(read){for(let i=0;i<1000;i++){const value=await read();if(value)return value;await sleep(10);}throw new Error('Isolation test deadline exceeded');}
async function temporary(t){const root=await fs.mkdtemp(path.join(os.tmpdir(),'ledify-isolation-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));return root;}
const catalog=JSON.parse(await fs.readFile('assets/webpage/curated/catalog.json','utf8'));

test('local text-only instructions do not suppress images requested in another placement',()=>{
 assert.equal(wantsTextOnly({instructions:'Use one photograph in the hero. Keep the rest text-only.'}),false);
 assert.equal(wantsTextOnly({keyInstructions:['One authentic photograph on cover only','Slide 2 must have no images (kind=none)']}),false);
 assert.equal(wantsTextOnly({instructions:'Use text-only layouts. No images.'}),true);
 assert.equal(wantsTextOnly({instructions:'All sections must be text-only.'}),true);
});

test('a clothing showroom rejects cars even without any prior generation and with mixed broad hints',()=>{
 const target={topic:'Luxury clothing boutique',query:'Premium showroom photography',centralConcepts:['fashion','automotive'],role:'hero'};
 const car=catalog.find(entry=>entry.file==='auto-electric.jpg'),fashion=catalog.find(entry=>entry.file==='fashion-boutique.jpg');
 assert.equal(reviewImageCandidate(car,target).accepted,false);
 assert.equal(reviewImageCandidate(fashion,target).accepted,true);
 for(let i=0;i<2;i++)assert.ok(rankCuratedPhotos(catalog,target).every(({entry})=>!entry.file.startsWith('auto-')));
});

test('independent subject evidence works outside the industry taxonomy and across both image roles',()=>{
 for(const [topic,good,bad] of [['Textile weaving','Textile weaving loom and yarn','Sports car design showroom'],['Ceramic vessel glazing','Ceramic vessel glazing workshop','Clinical medical scanner'],['Musical instrument restoration','Musical instrument restoration workbench','Waterfront mansion terrace']]){
  for(const role of ['hero','foreground']){
   const target={topic,sectionTopic:topic,query:topic,role};
   assert.equal(evaluateImageRelevance({description:good},target).accepted,true);
   assert.equal(evaluateImageRelevance({description:bad},target).accepted,false);
  }
 }
});

test('an interior setting cannot turn a clothing subject into residential architecture',()=>{
 const target={topic:'Textile craftsmanship and garment selection',primaryTopic:'Textile craftsmanship and garment selection',subjectContext:'Clothing and garment selection',query:'Fashion clothing boutique interior',role:'hero',centralConcepts:['fashion']};
 assert.equal(reviewImageCandidate(catalog.find(entry=>entry.file==='clothing.jpg'),target).accepted,true);
 assert.equal(reviewImageCandidate(catalog.find(entry=>entry.file==='property-villa.jpg'),target).accepted,false);
});

test('shared provider work returns independent byte buffers and nested metadata to every caller',async()=>{
 let calls=0,release;const gate=new Promise(resolve=>{release=resolve;}),key=randomUUID();
 const work=async()=>{calls++;await gate;return {buffer:Buffer.from('original'),metadata:{keywords:['original']}};};
 const first=shareImageWork(key,work),second=shareImageWork(key,work);release();
 const [a,b]=await Promise.all([first,second]);assert.equal(calls,1);a.buffer[0]=0;a.metadata.keywords[0]='changed';
 assert.equal(b.buffer.toString(),'original');assert.equal(b.metadata.keywords[0],'original');
});

test('webpage and presentation stock searches share one bounded provider pool',async t=>{
 const root=await temporary(t);let active=0,peak=0;
 const invoke=async()=>{peak=Math.max(peak,++active);await sleep(20);active--;return null;};
 t.mock.method(globalThis,'fetch',async()=>{await invoke();return {ok:true,json:async()=>({photos:[]})};});
 const providers=configuredImageProviders({PRESENTATION_STOCK_PROVIDER:'pexels',PEXELS_API_KEY:'test-only'});
 await Promise.all([providers.search({searchQuery:'Marine conservation'}),providers.search({searchQuery:'Computing systems'}),acquireProviderImage({id:'pexels',acquire:invoke},{topic:'Clothing boutique',query:'Clothing boutique'},{cacheRoot:root})]);
 assert.equal(peak,2);assert.equal(active,0);
});

test('identical image queries with different subject contexts have separate caches and reject transplanted metadata',async t=>{
 const root=await temporary(t),buffer=await fs.readFile('assets/webpage/curated/fashion-boutique.jpg');let calls=0;
 const provider={id:'commons',acquire:async request=>{calls++;return {buffer,description:request.topic,source:'Wikimedia Commons',creator:'Author',license:'CC0'};}};
 const first={query:'Editorial showroom',topic:'Clothing boutique'},second={query:'Editorial showroom',topic:'Automotive collection'};
 const [a,b]=await Promise.all([acquireProviderImage(provider,first,{cacheRoot:root}),acquireProviderImage(provider,second,{cacheRoot:root})]);assert.equal(calls,2);assert.notEqual(a.description,b.description);
 const entries=await fs.readdir(path.join(root,'providers')),metadata=await Promise.all(entries.filter(name=>name.endsWith('.json')).map(async name=>({name,data:JSON.parse(await fs.readFile(path.join(root,'providers',name),'utf8'))})));
 const source=metadata.find(entry=>entry.data.description===first.topic),target=metadata.find(entry=>entry.data.description===second.topic);await fs.writeFile(path.join(root,'providers',target.name),JSON.stringify(source.data));
 const recovered=await acquireProviderImage(provider,second,{cacheRoot:root});assert.equal(calls,3);assert.equal(recovered.description,second.topic);
});

test('a warm presentation cache creates a fresh request binding instead of reusing another deck association',async t=>{
 const root=await temporary(t),entry=catalog.find(photo=>photo.file==='marine-hawksbill.jpg'),buffer=await fs.readFile('assets/webpage/curated/'+entry.file);let calls=0;
 const deck={title:'Marine conservation',slides:[]},slide={slideNumber:1,slideType:'title',title:'Sea turtles',visualRequirement:{kind:'photo',description:'Sea turtles underwater',searchQuery:'Sea turtles underwater'}};
 const providers={identity:'shared-marine-test',search:async()=>{calls++;return {...entry,description:entry.subject,buffer,generationMethod:'licensed-search'};}},policy={...imagePolicy({}),retries:0};
 const first=createImageAssetSession({providers,policy,root}),a=await first.resolve(deck,slide,{family:'scientific',palette:{accent:'teal'},style:'editorial'},{});
 const second=createImageAssetSession({providers,policy,root}),b=await second.resolve(deck,slide,{family:'scientific',palette:{accent:'teal'},style:'editorial'},{});
 assert.ok(a&&b);assert.equal(calls,1);assert.equal(b.cacheHit,true);assert.notEqual(a.binding.requestId,b.binding.requestId);assert.equal(a.binding.sha256,b.binding.sha256);assert.equal(b.binding.requestId,second.requestId);
});

test('request, placement and checksum bindings reject exchanged website and slide assets',()=>{
 const bytes=Buffer.from('immutable fixture'),target={topic:'Textile weaving',query:'Textile loom',role:'hero'},a=bindImageAsset({url:'./image.webp'},target,'request-a',bytes);
 assertImageBinding(a,{requestId:'request-a',target,bytes});
 for(const change of [{requestId:'request-b',target,bytes},{requestId:'request-a',target:{...target,query:'Sports car'},bytes},{requestId:'request-a',target,bytes:Buffer.from('corrupt')}])assert.throws(()=>assertImageBinding(a,change),{code:'IMAGE_BINDING_MISMATCH'});
 const page={visualAssets:{requestId:'request-a',hero:a},sections:[],imageStrategy:{plan:[target]}};
 validateWebpageBindings(page,{'image.webp':bytes});assert.throws(()=>validateWebpageBindings({...page,visualAssets:{...page.visualAssets,requestId:'request-b'}},{'image.webp':bytes}),{code:'IMAGE_BINDING_MISMATCH'});
 const slideTarget={subject:'Marine conservation',slideTitle:'Sea turtles',slideNumber:1,role:'foreground',query:'Sea turtles'};
 const photo=bindImageAsset({data:'image/jpeg;base64,'+bytes.toString('base64'),artDirection:slideTarget},slideTarget,'request-a');
 validatePresentationBindings({title:'Marine conservation',imageRequestId:'request-a',slides:[{title:'Sea turtles',slideNumber:1,photoAsset:photo}]});
 assert.throws(()=>validatePresentationBindings({title:'Marine conservation',imageRequestId:'request-b',slides:[{title:'Sea turtles',slideNumber:1,photoAsset:photo}]}),{code:'IMAGE_BINDING_MISMATCH'});
 assert.throws(()=>validatePresentationBindings({title:'Marine conservation',imageRequestId:'request-a',slides:[{title:'Sea turtles',slideNumber:2,photoAsset:photo}]}),{code:'IMAGE_BINDING_MISMATCH'});
});

test('website packaging binds all responsive variants from actual placements without relying on credits',()=>{
 const target={topic:'Textile weaving',role:'hero'},large=Buffer.from('large'),small=Buffer.from('small');
 const hero=bindImageAsset({url:'./large.webp',variants:[{url:'./small.webp'},{url:'./large.webp'}]},target,'request-a',large);
 const page={visualAssets:{hero,credits:[]},sections:[]},files={'small.webp':small,'large.webp':large};
 const manifest=webpageImageManifest(page,files);assert.deepEqual(Object.keys(manifest).sort(),Object.keys(files).sort());
 assert.equal(manifest['small.webp'].requestId,'request-a');assert.notEqual(manifest['small.webp'].sha256,manifest['large.webp'].sha256);
});

test('admission is bounded, releases after errors, and nested pipeline admission cannot deadlock',async()=>{
 const pool=createGenerationCapacity({concurrency:2,maxWaiting:1,waitMs:1000}),a=await pool.acquire(),b=await pool.acquire(),queued=pool.acquire();
 await assert.rejects(pool.acquire(),{code:'GENERATION_CAPACITY_BUSY'});a();a();const c=await queued;b();c();assert.equal(pool.stats().active,0);
 await assert.rejects(withGenerationCapacity(()=>{throw new Error('affected request');}),/affected request/);
 assert.equal(await withGenerationCapacity(()=>withGenerationCapacity(async()=>42)),42);assert.equal(generationCapacity.stats().active,0);
});

test('rate-limit cooldown is shared within a model and does not pause a different model',async()=>{
 let clock=0;const pool=createAiCapacity({limit:2,now:()=>clock,sleep:async ms=>{clock+=ms;}});
 pool.defer({status:429,headers:new Headers({'Retry-After':'2'})},'model-a');
 assert.equal(await pool.run(()=>clock,'model-b'),0);assert.equal(await pool.run(()=>clock,'model-a'),2000);assert.equal(pool.stats().active,0);
 pool.defer({status:429,headers:new Headers({'Retry-After':'120'})},'model-long');await assert.rejects(pool.run(()=>0,'model-long'),{code:'AI_PROVIDER_BUSY'});
});

test('simultaneous retries reserve bounded queue positions before asynchronous writes',async t=>{
 const root=await temporary(t);let hold=false,release;const gate=new Promise(resolve=>{release=resolve;});t.after(()=>release());
 const jobs=generationJobs({root,maxPending:1,logger:()=>{},generator:async()=>{if(hold){await gate;return {status:'completed'};}throw new Error('controlled first attempt');}});
 const receipts=[];
 for(let i=0;i<6;i++){const receipt=await jobs.enqueue({kind:'prompt',input:'Independent retry '+i,outputType:'document'});await until(async()=>{const job=await jobs.read(receipt.jobId,receipt.statusUrl.split('/').at(-1));return job.status==='failed';});receipts.push(receipt);}
 hold=true;
 const retries=await Promise.allSettled(receipts.map(receipt=>jobs.retry(receipt.jobId,receipt.statusUrl.split('/').at(-1))));
 assert.ok(retries.some(result=>result.status==='rejected'&&result.reason.status===503));
 assert.ok(jobs.capacity().queued+jobs.capacity().admissions<=1);
 release();await until(()=>jobs.capacity().active===0&&jobs.capacity().queued===0);
});

for(const count of [2,5,10,20])test(`${count} simultaneous synchronous HTTP requests preserve input and share bounded admission`,async t=>{
 let active=0,peak=0;
 const server=createApp({deliveryLogger:()=>{},model:{create:async value=>({...value,_id:randomUUID(),save:async()=>{}})},generator:async(kind,input)=>{
  peak=Math.max(peak,++active);try{await sleep(15);return {status:'completed',generatedContent:{title:input}};}finally{active--;}
 }}).listen(0,'127.0.0.1');await once(server,'listening');t.after(()=>{server.closeAllConnections();return new Promise(resolve=>server.close(resolve));});
 const origin=`http://127.0.0.1:${server.address().port}`;
 const results=await Promise.all(Array.from({length:count},async(_,i)=>{
  const textPrompt='Private source '+randomUUID(),response=await fetch(origin+'/api/generate/textPrompt',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({textPrompt,outputType:['webpage','presentation','document'][i%3]})});
  assert.equal(response.status,201);assert.equal((await response.json()).data.result.generatedContent.title,textPrompt);
 }));
 assert.equal(results.length,count);assert.equal(peak,2);assert.equal(active,0);assert.equal((await fetch(origin+'/healthz')).status,200);
});

test('multipart parsing and extraction have a separate two-request bound and release before generation',async t=>{
 let active=0,peak=0,release;const gate=new Promise(resolve=>{release=resolve;});t.after(()=>release());
 const server=createApp({deliveryLogger:()=>{},model:{create:async value=>({...value,_id:randomUUID(),save:async()=>{}})},extractFile:async file=>{peak=Math.max(peak,++active);try{await gate;return file.originalname;}finally{active--;}},generator:async(kind,input)=>({status:'completed',generatedContent:{title:input}})}).listen(0,'127.0.0.1');await once(server,'listening');t.after(()=>{server.closeAllConnections();return new Promise(resolve=>server.close(resolve));});
 const origin=`http://127.0.0.1:${server.address().port}`,source=await docxSource('Independent upload source text.');
 const requests=Array.from({length:5},async(_,i)=>{const body=new FormData();body.set('file',new Blob([source],{type:DOCX_MIME}),'source-'+i+'.docx');body.set('outputType','document');const response=await fetch(origin+'/api/generate/file',{method:'POST',body});assert.equal(response.status,201);assert.equal((await response.json()).data.result.generatedContent.title,'source-'+i+'.docx');});
 await until(()=>active===2);assert.equal(peak,2);release();await Promise.all(requests);assert.equal(inputCapacity.stats().active,0);
});

for(const count of [2,5,10,20])test(`${count} simultaneous mixed jobs keep inputs, tokens and failures isolated with two active workers`,async t=>{
 const root=await temporary(t);let active=0,peak=0,release;const gate=new Promise(resolve=>{release=resolve;});t.after(()=>release());const expected=new Map(),updates=new Map();
 const jobs=generationJobs({root,logger:()=>{},model:{findByIdAndUpdate:async(id,change)=>updates.set(id,change.$set)},generator:async(kind,input,output,context)=>{
  peak=Math.max(peak,++active);if(active===2)release();try{await gate;await sleep(15);assert.equal(input,context.marker);assert.equal(expected.get(input),output);if(context.fail)throw Object.assign(new Error('isolated fixture failure'),{code:'CONTROLLED_FAILURE'});return {status:'completed',generatedContent:{title:input,outputType:output},artifacts:{id:randomUUID()}};}finally{active--;}
 }});
 const receipts=await Promise.all(Array.from({length:count},(_,i)=>{const marker='request-'+i,output=['webpage','presentation','document'][i%3];expected.set(marker,output);return jobs.enqueue({kind:['prompt','url','file'][i%3],input:marker,outputType:output,context:{marker,fail:i===count-1&&count>2},recordId:marker});}));
 const results=await Promise.all(receipts.map(receipt=>until(async()=>{const job=await jobs.read(receipt.jobId,receipt.statusUrl.split('/').at(-1));return ['completed','failed'].includes(job.status)&&job;})));
 assert.equal(peak,2);assert.equal(jobs.capacity().workerConcurrency,2);assert.equal(active,0);
 assert.equal(results.filter(job=>job.status==='failed').length,count>2?1:0);
 for(const [i,job] of results.entries())if(job.status==='completed'){assert.equal(job.result.generatedContent.title,'request-'+i);assert.equal(job.result.generatedContent.outputType,expected.get('request-'+i));}
 await until(()=>updates.size===count);assert.equal(new Set(results.filter(job=>job.result).map(job=>job.result.artifacts.id)).size,count-(count>2?1:0));
 await assert.rejects(jobs.read(receipts[0].jobId,receipts[1].statusUrl.split('/').at(-1)),error=>error.status===404);
 for(const [i,receipt] of receipts.entries()){const saved=JSON.parse(await fs.readFile(path.join(root,receipt.jobId,'input.json'),'utf8'));assert.equal(saved.input,'request-'+i);}
});
