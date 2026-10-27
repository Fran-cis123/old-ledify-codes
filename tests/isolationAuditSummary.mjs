// Derive per-wave counters from the original structured logs without modifying
// the raw reports. Nested packaging timings must not be counted twice.
import fs from 'node:fs/promises';
import path from 'node:path';
import {evaluateImageRelevance} from '../Service/visual/imageRelevance.mjs';
import {bindImageAsset,assertImageBinding} from '../Service/visual/assetBinding.mjs';
const root=path.resolve('generated/concurrency-audit/final-load');
const lines=(await fs.readFile('generated/isolation-native-final.log','utf8')).split(/\r?\n/);
const reports=[];let ids=new Set(),perfs=[],lastRateLimits=0;
const renderStages=new Set(['pptx-render','pdf-conversion','png-conversion','docx-render','document-preview','document-pdf','website-html-css-js','website-packaging']);
for(const line of lines){
 const match=line.match(/^\[(GENERATION_JOB|PERF|CONCURRENCY_AUDIT)\] (\{.*\})$/);if(!match)continue;const value=JSON.parse(match[2]);
 if(match[1]==='GENERATION_JOB'&&value.status==='processing')ids.add(value.requestId);
 if(match[1]==='PERF')perfs.push(value);
 if(match[1]==='CONCURRENCY_AUDIT'){
  const jobs=perfs.filter(report=>ids.has(report.requestId));
  const {aiMs:rawAiMs,renderMs:rawRenderMs,rateLimitResponses:cumulativeRateLimitResponses,...rest}=value;
  reports.push({...rest,rateLimitResponses:cumulativeRateLimitResponses-lastRateLimits,aiAllAttemptsMs:jobs.reduce((n,r)=>n+r.ai.elapsedMs,0),renderNonNestedSumMs:jobs.reduce((n,r)=>n+Object.entries(r.stages).filter(([stage])=>renderStages.has(stage)).reduce((n,[,stage])=>n+stage.elapsedMs,0),0),renderQueueSumMs:jobs.reduce((n,r)=>n+(r.stages['render-queue']?.elapsedMs||0),0),profiledAttempts:jobs.length,rawAiMs,rawRenderMs,cumulativeRateLimitResponses});
  lastRateLimits=cumulativeRateLimitResponses;ids=new Set();perfs=[];
 }
}
const inputs={},outputs={};
for(const id of await fs.readdir(path.join(root,'jobs'))){const input=JSON.parse(await fs.readFile(path.join(root,'jobs',id,'input.json'),'utf8'));outputs[input.outputType]=(outputs[input.outputType]||0)+1;inputs[input.kind+':'+input.outputType]=(inputs[input.kind+':'+input.outputType]||0)+1;}
const catalog=JSON.parse(await fs.readFile('assets/webpage/curated/catalog.json','utf8'));
const cases=[['Automotive collection','auto-electric.jpg'],['Clothing boutique','fashion-boutique.jpg'],['Residential real estate','property-villa.jpg'],['Laboratory diagnostics','laboratory.jpg'],['Marine conservation','marine-hawksbill.jpg'],['Computing systems','computing-cern.jpg']];
const timings=[];let checks=0;
for(let round=0;round<100;round++)for(const [topic,file] of cases){const entry=catalog.find(item=>item.file===file),bytes=await fs.readFile('assets/webpage/curated/'+file),target={topic,query:topic,role:'hero'};const start=performance.now();evaluateImageRelevance(entry,target);const asset=bindImageAsset({},target,'benchmark-request',bytes);assertImageBinding(asset,{requestId:'benchmark-request',target,bytes});timings.push(performance.now()-start);checks++;}
timings.sort((a,b)=>a-b);
const summary={scope:'Derived measured local native load; per-wave AI includes failed attempts; render is sum of explicit non-nested stages, not wall time. Benchmark excludes disk read, decoding, native conversion and network; includes relevance plus binding creation and verification (two SHA-256 passes).',outputs,inputOutputCombinations:inputs,reports,validationBenchmark:{checks,meanMs:timings.reduce((a,b)=>a+b,0)/checks,p95Ms:timings[Math.ceil(checks*.95)-1],maxMs:timings.at(-1)}};
await fs.writeFile(path.join(root,'report-verified.json'),JSON.stringify(summary,null,2));console.log(JSON.stringify(summary));
