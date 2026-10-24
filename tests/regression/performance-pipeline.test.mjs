import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {randomUUID,createHash} from 'node:crypto';
import {generateIndependent,generateInBatches} from '../../Service/ai/concurrency.mjs';
import {profileGeneration,measureStage,recordAiAttempt} from '../../Service/performance.mjs';
import {generationJobs} from '../../Service/generationJobs.mjs';
import {createGenerationHandlers} from '../../controller/generateController.mjs';
import {withAiCapacity} from '../../Service/ai/providerCapacity.mjs';
import sharp from 'sharp';
import {presentationPrefetch} from '../../Service/visual/presentationPrefetch.mjs';
import {resolvePresentationVisuals} from '../../Service/visual/presentationVisuals.mjs';
import {presentationLayoutService} from '../../Service/presentationLayoutService.mjs';
import {presentationThemeService} from '../../Service/presentationThemeService.mjs';
import {presentationRendererService} from '../../Service/presentationRendererService.mjs';
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function root(t){const dir=await fs.mkdtemp(path.join(os.tmpdir(),'ledify-jobs-'));t.after(()=>fs.rm(dir,{recursive:true,force:true}));return dir;}
// These are durable-file correctness checks, not a disk-speed benchmark.
// Windows file scanning can delay atomic writes beyond a two-second poll loop.
async function until(fn){const deadline=Date.now()+10000;while(Date.now()<deadline){const value=await fn();if(value)return value;await sleep(10);}throw new Error('Job test deadline exceeded');}

test('rolling scheduling refills free slots before a slow sibling finishes and preserves ordered checkpoints',async()=>{
    let release;const barrier=new Promise(r=>{release=r;}),events=[],saved=[];
    const work=generateIndependent([0,1,2,3],2,async value=>{events.push(value);if(value===0)await barrier;return value;},value=>saved.push(value));
    await until(()=>events.includes(3));assert.deepEqual(saved,[]);release();await work;assert.deepEqual(saved,[0,1,2,3]);
});
test('rolling failure drains calls, stops later work and retains only the approved prefix',async()=>{
    const started=[],saved=[];let active=0;
    await assert.rejects(generateIndependent([0,1,2,3,4],2,async value=>{started.push(value);active++;try{await sleep(value===1?5:20);if(value===1)throw new Error('fixture failure');return value;}finally{active--;}},value=>saved.push(value)),/fixture failure/);
    assert.equal(active,0);assert.deepEqual(started,[0,1]);assert.deepEqual(saved,[0]);
});
test('performance measurements isolate concurrent requests and include real provider usage and failures',async()=>{
    const reports=[];
    await Promise.all([1,2].map(n=>profileGeneration(()=>measureStage('draft',async()=>{recordAiAttempt({stage:'section',attempt:n,elapsedMs:3,usage:{promptTokenCount:5,totalTokenCount:9}});await sleep(5);}),{logger:()=>{},onReport:r=>reports.push(r)})));
    assert.equal(reports.length,2);assert.notEqual(reports[0].requestId,reports[1].requestId);
    for(const r of reports){assert.equal(r.ai.calls,1);assert.equal(r.ai.totalTokens,9);assert.equal(r.stages.draft.calls,1);assert.ok(r.memory.peakRssBytes>=r.memory.startRssBytes);}
});
test('process-wide text provider admission remains bounded across independent requests',async()=>{
    let active=0,max=0;
    await Promise.all(Array.from({length:12},()=>withAiCapacity(async()=>{max=Math.max(max,++active);await sleep(5);active--;})));
    assert.ok(max<=6);assert.equal(active,0);
});
test('durable jobs expose actual early artifacts, keep input private and reuse completed content after failure',async t=>{
    const directory=await root(t);let runs=0,contentCalls=0;const failures=[];
    const jobs=generationJobs({root:directory,onError:error=>failures.push(error),generator:async(kind,input,type,context,options)=>{
        runs++;if(!options.completedContent){contentCalls++;await options.onContentReady({generatedContent:{title:'Approved content'}});}
        await measureStage('conversion',async()=>{await options.preview.onArtifact({stage:'pptx',downloadUrl:'/api/presentations/fixture/download'});await sleep(20);});
        if(runs===1)throw Object.assign(new Error('private provider details'),{code:'PNG_FIXTURE_FAILED',stage:'png'});
        return {status:'completed',generatedContent:{title:'Approved content'},preview:{downloads:{pptx:'/api/presentations/fixture/download'}}};
    }});
    const queued=await jobs.enqueue({kind:'prompt',input:'Private source content',outputType:'presentation',context:{},options:{}}),token=queued.statusUrl.split('/').at(-1);
    const early=await until(async()=>{const job=await jobs.read(queued.jobId,token);return job.artifacts.pptx&&job;});
    assert.ok(early.progress['conversion:']);assert.ok(!JSON.stringify(early).includes('Private source'));
    await assert.rejects(jobs.read(queued.jobId,'0'.repeat(64)),e=>e.status===404);
    await until(async()=>(await jobs.read(queued.jobId,token)).status==='failed');
    await jobs.retry(queued.jobId,token);
    const completed=await until(async()=>{if(failures.length>1)throw failures.at(-1);const job=await jobs.read(queued.jobId,token);return job.status==='completed'&&job;});
    assert.equal(contentCalls,1);assert.equal(runs,2);assert.equal(completed.result.status,'completed');
});
test('unfinished persisted jobs recover after restart without repeating their completed AI stage',async t=>{
    const directory=await root(t),id=randomUUID(),token='a'.repeat(64),jobDir=path.join(directory,id);await fs.mkdir(jobDir);
    await fs.writeFile(path.join(jobDir,'input.json'),JSON.stringify({kind:'prompt',input:'Source',outputType:'document',context:{},options:{}}));
    await fs.writeFile(path.join(jobDir,'status.json'),JSON.stringify({jobId:id,tokenHash:createHash('sha256').update(token).digest('hex'),status:'processing',progress:{},artifacts:{},runs:1}));
    await fs.writeFile(path.join(jobDir,'content.json'),JSON.stringify({generatedContent:{title:'Saved'}}));
    const jobs=generationJobs({root:directory,generator:async(a,b,c,d,options)=>{assert.equal(options.completedContent.generatedContent.title,'Saved');return {status:'completed'};}});
    await jobs.initialize();await until(async()=>(await jobs.read(id,token)).status==='completed');
});
test('a database metadata outage cannot turn an available completed output back into a failed job',async t=>{
    const directory=await root(t),jobs=generationJobs({root:directory,model:{findByIdAndUpdate:async()=>{throw new Error('database fixture outage');}},generator:async()=>({status:'completed',generatedContent:{title:'Available output'}})});
    const job=await jobs.enqueue({kind:'prompt',input:'Source',outputType:'document',context:{},options:{}}),token=job.statusUrl.split('/').at(-1);
    const completed=await until(async()=>{const result=await jobs.read(job.jobId,token);return result.warnings?.length&&result;});
    assert.equal(completed.status,'completed');assert.equal(completed.result.generatedContent.title,'Available output');assert.equal(completed.warnings[0].code,'JOB_RECORD_UPDATE_FAILED');
});
test('the existing text endpoint opts into HTTP 202 without changing synchronous generation',async t=>{
    let jobError;
    const directory=await root(t),handlers=createGenerationHandlers({jobRoot:directory,jobOptions:{onError:error=>{jobError=error;}},model:{create:async value=>({...value,_id:'fixture',save:async()=>{}})},generator:async()=>({status:'completed',outputType:'document',generatedContent:{title:'Test'}})});
    function response(){return {headers:{},set(k,v){this.headers[k]=v;},status(n){this.code=n;return this;},json(value){this.body=value;return value;}};}
    const req={body:{outputType:'document',textPrompt:'Create a report'},get:name=>name==='Prefer'?'respond-async':undefined},asyncRes=response();
    await handlers.userText(req,asyncRes);assert.equal(asyncRes.code,202);assert.ok(asyncRes.body.data.statusUrl.startsWith('/api/generation-jobs/'));
    const [,id,token]=asyncRes.body.data.statusUrl.split('/').slice(2),jobs=generationJobs({root:directory});
    await until(async()=>{if(jobError)throw jobError;return(await jobs.read(id,token)).status==='completed';});
    const syncRes=response();await handlers.userText({...req,get:()=>undefined},syncRes);assert.equal(syncRes.code,201);
});

test('approved-slide image work overlaps drafting and the final renderer reuses one session without duplicate provider calls',async t=>{
    const directory=await root(t),source=await fs.readFile('assets/webpage/curated/laboratory.jpg');let calls=0,release;
    const gate=new Promise(r=>{release=r;}),deck={outputType:'presentation',strategyId:'academic-seminar',title:'Source review',subtitle:'A concise explanation',slides:[
        {slideNumber:1,slideType:'title',title:'Source review',visualRequirement:{kind:'photo',required:true,description:'Laboratory',searchQuery:'Laboratory'},content:{titleContent:{title:'Source review',subtitle:'A concise explanation',supportingText:'Preserve the evidence'}}},
        {slideNumber:2,slideType:'focused-explanation',title:'Evaluate evidence',visualRequirement:{kind:'photo',required:true,description:'Research',searchQuery:'Research'},imageLayoutPlanned:true}
    ]};
    const options={cacheRoot:directory,onImageDiagnostic:()=>{},diagramPlanner:false,policy:{concurrency:2,retries:0},providers:{search:async brief=>{calls++;await gate;return {buffer:await sharp(source).modulate({brightness:.7+brief.slideNumber*.1}).jpeg().toBuffer(),source:'Public-domain fixture',creator:'CDC',license:'Public domain',generationMethod:'licensed-search'};}}};
    const early=presentationPrefetch({inputType:'prompt',input:'Explain source review',context:{},options});early.update(deck);
    await until(()=>calls===1);
    deck.slides[1].content={textContent:{heading:'Evaluate evidence',body:'Separate observations from assumptions and review their limitations.'}};
    early.update(deck);await until(()=>calls===2);release();
    const ready=presentationRendererService(presentationThemeService(presentationLayoutService(deck)));
    const resolved=await resolvePresentationVisuals(ready,{instructions:'Explain source review'},{...options,prefetch:early});
    assert.equal(calls,2);assert.equal(resolved.visualQuality.actual,2);assert.equal(resolved.visualQuality.meetsTarget,true);
});
test('prefetch cancellation aborts active providers and starts no queued paid work',async t=>{
    const directory=await root(t);let calls=0;
    const deck={strategyId:'academic-seminar',title:'Source review',slides:[1,2].map(slideNumber=>({slideNumber,slideType:'focused-explanation',title:'Evidence '+slideNumber,visualRequirement:{kind:'photo',required:true,description:'Research',searchQuery:'Research'},content:{textContent:{heading:'Evidence',body:'Review the source.'}}}))};
    const early=presentationPrefetch({inputType:'prompt',input:'Review sources',context:{},options:{cacheRoot:directory,policy:{concurrency:1,retries:1},onImageDiagnostic:()=>{},providers:{search:({signal})=>{calls++;return new Promise((resolve,reject)=>signal.addEventListener('abort',()=>reject(new Error('aborted')),{once:true}));}}}});
    early.update(deck);await until(()=>calls===1);early.cancel();
    await Promise.all([...early.entries.values()].map(entry=>entry.promise));assert.equal(calls,1);
});
