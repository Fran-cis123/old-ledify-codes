import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import sharp from 'sharp';
import {imagePolicy} from '../../Service/webpage/imageStrategy.mjs';
import {acquireProviderImage} from '../../Service/webpage/providerCache.mjs';
import {validateImageBytes} from '../../Service/visual/imageAssetService.mjs';
import {generationJobs} from '../../Service/generationJobs.mjs';
import {performanceReport} from '../../Service/performance.mjs';
import {commonsSearch} from '../../Service/visual/imageProviders.mjs';
import {matchesImageIdentity} from '../../Service/visual/imageIdentity.mjs';
import {randomUUID,createHash} from 'node:crypto';

const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function until(read){for(let i=0;i<1000;i++){const value=await read();if(value)return value;await sleep(10);}throw new Error('Test deadline exceeded');}
async function temporary(t){const root=await fs.mkdtemp(path.join(os.tmpdir(),'ledify-speed-test-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));return root;}

test('recovered processing time is not reported as queue wait for the resumed attempt',async t=>{
 const root=await temporary(t),id=randomUUID(),token='b'.repeat(64),directory=path.join(root,id),old=new Date(Date.now()-3600000).toISOString();
 await fs.mkdir(directory);
 await fs.writeFile(path.join(directory,'input.json'),JSON.stringify({kind:'prompt',input:'Recovery fixture',outputType:'webpage'}));
 await fs.writeFile(path.join(directory,'status.json'),JSON.stringify({jobId:id,tokenHash:createHash('sha256').update(token).digest('hex'),status:'processing',createdAt:old,queuedAt:old,progress:{},artifacts:{},runs:1}));
 const jobs=generationJobs({root,logger:()=>{},generator:async()=>({status:'completed'})});await jobs.initialize();
 const result=await until(async()=>{const job=await jobs.read(id,token);return job.status==='completed'&&job;});
 assert.equal(result.createdAt,old);assert.notEqual(result.queuedAt,old);assert.ok(result.timings.queueWaitMs<60000);
});

test('stock search rejects the wrong identity before download and tries the matching candidate',async()=>{
 const downloads=[],target={topic:'Luxury automotive collection',identityLabel:'Orion X2',searchQuery:'luxury car'};
 const candidates=['X3','X2'].map(model=>({description:'Luxury car exterior Orion '+model,source:'Wikimedia Commons',creator:'Author',license:'Public domain',mediaKind:'photograph',downloadUrl:'https://example.com/'+model+'.jpg'}));
 const result=await commonsSearch({...target,acceptCandidate:asset=>matchesImageIdentity(asset,target)},{find:async()=>candidates,download:async url=>{downloads.push(url);return {buffer:Buffer.from('downloaded only after identity check')};}});
 assert.equal(result.description,'Luxury car exterior Orion X2');assert.deepEqual(downloads,['https://example.com/X2.jpg']);
});

test('fast image validation still decodes and rejects truncated rasters; generated variance checks remain strict',async()=>{
 const source=await fs.readFile('assets/webpage/curated/laboratory.jpg');
 for(const format of ['jpeg','png','webp']){
  const buffer=await sharp(source).resize(600,400).toFormat(format).toBuffer();
  const metadata=await validateImageBytes(buffer);assert.equal(metadata.width,600);assert.equal(metadata.format,format);
  await assert.rejects(validateImageBytes(buffer.subarray(0,Math.floor(buffer.length*.75))),{code:'IMAGE_INVALID'});
 }
 const blank=await sharp({create:{width:600,height:400,channels:3,background:'#ffffff'}}).png().toBuffer();
 await validateImageBytes(blank);
 await assert.rejects(validateImageBytes(blank,{requireVariance:true}),{code:'IMAGE_INVALID'});
 await assert.rejects(validateImageBytes(source,{minWidth:100000}),{code:'IMAGE_INVALID'});
});

test('two stock requests overlap without increasing the paid generation concurrency or budgets',async t=>{
 assert.equal(imagePolicy({}).concurrency,2);assert.equal(imagePolicy({WEBPAGE_IMAGE_CONCURRENCY:'1'}).concurrency,1);
 assert.equal(imagePolicy({}).maxGenerated,2);
 const root=await temporary(t),buffer=await fs.readFile('assets/webpage/curated/laboratory.jpg');
 let release,active=0,peak=0;const gate=new Promise(resolve=>{release=resolve;});t.after(()=>release());
 const provider={id:'commons',acquire:async()=>{peak=Math.max(peak,++active);try{await gate;return {buffer};}finally{active--;}}};
 const requests=Promise.all(['first','second','third'].map(query=>acquireProviderImage(provider,{query},{cacheRoot:path.join(root,'stock')})));
 await until(()=>peak===2);assert.equal(active,2);release();await requests;assert.equal(peak,2);
 active=0;peak=0;
 const generated={id:'gemini-image',acquire:async()=>{peak=Math.max(peak,++active);try{await sleep(20);return {buffer};}finally{active--;}}};
 await Promise.all(['first','second'].map(query=>acquireProviderImage(generated,{query},{cacheRoot:path.join(root,'generated')})));assert.equal(peak,1);
});

test('durable jobs separately report queue wait and execution with one correlated performance ID',async t=>{
 const root=await temporary(t),logs=[];let release,started=false;const gate=new Promise(resolve=>{release=resolve;});t.after(()=>release());
 const requestIds=[];
 const jobs=generationJobs({root,workerConcurrency:1,logger:entry=>logs.push(entry),generator:async(kind,input)=>{requestIds.push(performanceReport().requestId);if(input==='first'){started=true;await gate;}return {status:'completed'};}});
 const first=await jobs.enqueue({kind:'prompt',input:'first',outputType:'webpage'});await until(()=>started);
 const second=await jobs.enqueue({kind:'prompt',input:'second',outputType:'webpage'});await sleep(25);release();
 const result=await until(async()=>{const job=await jobs.read(second.jobId,second.statusUrl.split('/').at(-1));return job.status==='completed'&&job;});
 assert.deepEqual(requestIds,[first.jobId,second.jobId]);assert.ok(result.timings.queueWaitMs>=20);
 assert.ok(result.timings.executionMs>=0);assert.equal(result.timings.totalMs,result.timings.queueWaitMs+result.timings.executionMs);
 assert.ok(result.queuedAt&&result.startedAt&&result.completedAt);
 const logged=logs.find(entry=>entry.requestId===second.jobId&&entry.status==='completed');assert.equal(logged.queueWaitMs,result.timings.queueWaitMs);
 assert.ok(!JSON.stringify(logs).includes(second.statusUrl.split('/').at(-1)));
});
