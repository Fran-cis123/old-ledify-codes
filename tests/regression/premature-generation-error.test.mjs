import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {once} from 'node:events';
import {createApp} from '../../src/app.mjs';

import {reviewImageCandidate} from '../../Service/webpage/imageReview.mjs';
import {candidateSuitability,commonsSearch} from '../../Service/visual/imageProviders.mjs';
import {relevantSearchQuery} from '../../Service/visual/imageRelevance.mjs';

const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function until(fn){const deadline=Date.now()+10000;while(Date.now()<deadline){const value=await fn();if(value)return value;await sleep(10);}throw new Error('Test deadline exceeded');}
async function serverFor(t,options){
 const app=createApp(options),server=app.listen(0,'127.0.0.1');await once(server,'listening');
 t.after(()=>{server.closeAllConnections();return new Promise(resolve=>server.close(resolve));});
 return `http://127.0.0.1:${server.address().port}`;
}
test('backend job remains processing while waiting and resumes polling without generating twice',async t=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'ledify-polling-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));
 let release;const gate=new Promise(resolve=>{release=resolve;});t.after(()=>release());let generated=0;const events=[];
 const origin=await serverFor(t,{jobRoot:root,deliveryLogger:event=>events.push(event),model:{create:async value=>({...value,_id:'fixture',save:async()=>{}})},generator:async()=>{generated++;await gate;return {status:'completed_with_warnings',generatedContent:{title:'Renewable energy'},artifacts:{previewUrl:'/api/webpages/site/private/preview'}};}});
 const response=await fetch(origin+'/api/generate/textPrompt',{method:'POST',headers:{'Content-Type':'application/json',Prefer:'respond-async'},body:JSON.stringify({textPrompt:'Explain renewable energy technologies.',outputType:'webpage'})});
 assert.equal(response.status,202);assert.equal(response.headers.get('Retry-After'),'2');
 const receipt=(await response.json()).data;assert.equal(receipt.status,'queued');assert.equal(receipt.result,undefined);
 const poll=async()=>{const response=await fetch(origin+receipt.statusUrl);assert.equal(response.status,200);assert.equal(response.headers.get('Cache-Control'),'no-store');return {response,job:(await response.json()).data};};
 await until(()=>generated===1);
 for(let i=0;i<3;i++){const {response,job}=await poll();assert.equal(job.status,'processing');assert.equal(response.headers.get('Retry-After'),'2');assert.equal(job.result,undefined);}
 release();const completed=await until(async()=>{const {job}=await poll();return job.status==='completed'&&job;});
 assert.equal(completed.result.status,'completed_with_warnings');assert.equal(completed.result.generatedContent.title,'Renewable energy');assert.equal(generated,1);assert.deepEqual(events,[]);
});
test('a disconnected synchronous caller is logged without marking successful generation failed',async t=>{
 let release,started,record,saved=false;const gate=new Promise(resolve=>{release=resolve;}),running=new Promise(resolve=>{started=resolve;});t.after(()=>release());const events=[];
 const origin=await serverFor(t,{deliveryLogger:event=>events.push(event),model:{create:async value=>(record={...value,_id:'fixture',save:async()=>{saved=true;}})},generator:async()=>{started();await gate;return {status:'completed',generatedContent:{title:'Completed output'}};}});
 const controller=new AbortController();const request=fetch(origin+'/api/generate/textPrompt',{method:'POST',signal:controller.signal,headers:{'Content-Type':'application/json'},body:JSON.stringify({textPrompt:'Private renewable energy prompt.',outputType:'webpage'})});
 const rejected=assert.rejects(request,{name:'AbortError'});await running;controller.abort();await rejected;
 await until(()=>events.length);assert.equal(events[0].status,'client-disconnected');assert.equal(events[0].outputType,'webpage');assert.ok(events[0].requestId);assert.ok(events[0].elapsedMs>=0);assert.equal(JSON.stringify(events).includes('Private'),false);
 assert.equal(record.status,'processing');release();await until(()=>saved);assert.equal(record.status,'completed');
});
test('renewable-energy graphs cannot satisfy a photographic hero even with stale photograph metadata',async()=>{
 const target={role:'hero',topic:'Renewable energy systems',query:'Expansive aerial photography of solar panel installations and offshore wind turbines',centralConcepts:['renewable']};
 const graph={source:'Wikimedia Commons',creator:'Author',license:'CC BY 4.0',mediaKind:'photograph',description:'Graph of world renewable energy consumption',alt:'Graph of world renewable energy consumption'};
 assert.equal(candidateSuitability('renewable energy',graph,{partial:true}),-1);
 assert.equal(reviewImageCandidate(graph,target,{width:1200,height:800}).reason,'NON_PHOTOGRAPHIC_STOCK');
 const photo={...graph,description:'Solar farm photovoltaic panels landscape',alt:'Solar farm photovoltaic panels landscape'};assert.equal(reviewImageCandidate(photo,target,{width:1200,height:800}).accepted,true);
 assert.match(relevantSearchQuery(target),/solar farm/);
 assert.equal(await commonsSearch({searchQuery:'renewable energy',maxSearchQueries:1},{find:async()=>[graph],download:async()=>{throw new Error('Graph must not be downloaded');}}),null);
});
