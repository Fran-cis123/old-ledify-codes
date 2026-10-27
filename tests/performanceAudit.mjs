import 'dotenv/config';
import fs from 'node:fs/promises';
import {writeFileSync} from 'node:fs';
import path from 'node:path';
import {once} from 'node:events';
import {createApp} from '../src/app.mjs';
import {generateService} from '../Service/generateService.mjs';
import {testingIssuesRequests} from './fixtures/testingIssuesRequests.mjs';

const phase=process.argv[2]||'baseline',root=path.resolve('generated/performance-audit',phase);
await fs.mkdir(root,{recursive:true});
const requests=[
 {name:'apex',auditOnly:true,...JSON.parse(await fs.readFile(new URL('./fixtures/apexMotorsRequest.json',import.meta.url),'utf8')),textPrompt:JSON.parse(await fs.readFile(new URL('./fixtures/apexMotorsRequest.json',import.meta.url),'utf8')).textPrompt.replace("The website must deliver a breathtaking digital experience that immediately captures visitors' attention. ",'').replace('Every section should feel polished, modern, immersive, and visually extraordinary. ','')},
 {name:'future2080',auditOnly:true,...JSON.parse(await fs.readFile(new URL('./fixtures/futureHumanityWebpageRequest.json',import.meta.url),'utf8'))},
 {name:'space10',auditOnly:true,...JSON.parse(await fs.readFile(new URL('./fixtures/beyondEarthPresentationRequest.json',import.meta.url),'utf8'))},
 ...testingIssuesRequests,
 {name:'elite-havens12',outputType:'presentation',textPrompt:"Create a stunning luxury real estate advertising presentation for ÉLITE HAVENS REAL ESTATE, a fictional Nigerian property company. Tagline: 'Exceptional Homes. Extraordinary Living.' Target affluent homebuyers and investors. Include a spectacular mansion cover, company introduction, waterfront villas, luxury penthouses, exclusive gated estates, premium interior design, smart-home technology, lifestyle amenities, property investment benefits without guaranteed-return claims, illustrative property portfolio, customer journey, and a compelling closing call to action. Use sophisticated ivory, charcoal, champagne gold and forest green branding. Create elegant typography, varied layouts, strong contrast, excellent spacing and concise persuasive content. The title slide MUST contain one beautiful, relevant photograph embedded in the PPTX. Use additional images selectively where appropriate. Ensure all images appear correctly in PPTX, PDF and slide previews. Label fictional property examples as illustrative. Avoid generic designs, empty slides, unreadable text and fabricated business claims.",context:{slideCount:12}},
 {name:'presentation10',outputType:'presentation',textPrompt:'Create exactly 10 professional teaching slides about sustainable urban transport. Cover public transport, walking, cycling, electric buses, accessibility, street design, implementation challenges and evaluation. Use three relevant photographs on the title, cycling and electric bus slides only; use native editable content elsewhere. Keep factual explanations accurate without invented statistics. Use varied readable layouts and include a conclusion.',context:{slideCount:10,designPreferences:{noImageSlideNumbers:[2,3,5,6,7,8,10]}}},
 {name:'presentation12',outputType:'presentation',textPrompt:'Create exactly 12 professional stakeholder slides about a proposed sustainable urban transport strategy. Cover the problem, objectives, public transport, walking and cycling, electrification, accessibility, street allocation, a qualitative options comparison table, implementation risks, an illustrative phased roadmap, evaluation criteria and conclusion. No invented statistics or real project results. Include native editable diagrams, comparison tables and concise explanatory content. Use three relevant photographs only and varied sophisticated editorial layouts.',context:{slideCount:12,designPreferences:{noImageSlideNumbers:[2,3,5,6,7,8,9,11,12]}}},
 {name:'webpage',outputType:'webpage',textPrompt:'Create a professional responsive multi-section educational website about sustainable urban transport. Include public transit, walking and cycling, electric buses, inclusive street design, implementation challenges and practical evaluation criteria. Use varied editorial layouts and relevant licensed or conceptual imagery. No invented statistics or real company claims. Include all images in the downloadable ZIP.'},
 {name:'document',outputType:'document',textPrompt:'Create a professional structured 1000-word report on sustainable urban transport. Cover public transit, walking and cycling, electrification, accessible street design, implementation challenges and recommendations. Explain trade-offs and practical evaluation criteria without invented statistics, citations or project results.'}
];
const model={create:async value=>({...value,_id:'benchmark',save:async()=>{}})};
let invalidAttempt=0;
const app=createApp({model,jobRoot:path.join(root,'jobs'),generator:async(...args)=>generateService(...args.slice(0,4),{...args[4],ai:{...args[4]?.ai,onQualityReview:(review,round)=>fs.writeFile(path.join(root,`review-${round}.json`),JSON.stringify(review,null,2)),onInvalidContent:invalid=>writeFileSync(path.join(root,`invalid-${++invalidAttempt}.json`),JSON.stringify(invalid,null,2))},performance:{forceNew:true,onReport:report=>fs.writeFile(path.join(root,'latest-report.json'),JSON.stringify(report))}})});
const remote=process.argv[4];
const server=remote?null:app.listen(0,'127.0.0.1');if(server)await once(server,'listening');const base=remote||`http://127.0.0.1:${server.address().port}`;
try{
 for(const request of requests.filter(r=>process.argv[3]==='testing-issues'?r.auditOnly:process.argv[3]?r.name===process.argv[3]:!r.auditOnly&&r.name!=='elite-havens12')) {
  const start=performance.now();
  const response=await fetch(base+'/api/generate/textPrompt',{method:'POST',headers:{'Content-Type':'application/json',Prefer:'respond-async'},body:JSON.stringify(request)});
  const initialMs=performance.now()-start,accepted=await response.json();
  if(response.status!==202)throw new Error(`Benchmark admission failed: ${response.status}`);
  let job;
  while(performance.now()-start<900000){
   const poll=await fetch(base+accepted.data.statusUrl);job=(await poll.json()).data;
   if(['completed','failed'].includes(job.status))break;
   await new Promise(resolve=>setTimeout(resolve,250));
  }
  const record={phase,name:request.name,request,initialMs,totalObservedMs:performance.now()-start,status:job?.status,error:job?.error,notes:remote?'Remote deployed API including real database; poll interval 250 ms; Node RSS excludes native child processes.':'Local HTTP + real configured AI and renderers. In-memory database metadata stub; excludes MongoDB latency. Poll interval 250 ms; Node RSS excludes native child processes.'};
  if(job?.result){
   record.timings=job.result.timings;record.performance=remote?job.result.performance:JSON.parse(await fs.readFile(path.join(root,'latest-report.json'),'utf8'));
   await fs.writeFile(path.join(root,request.name+'-result.json'),JSON.stringify(job.result,null,2));
   const urls=request.outputType==='presentation'?[...Object.values(job.result.preview.downloads),...job.result.preview.slides.map(s=>s.url)]:[job.result.artifacts.previewUrl,job.result.artifacts.downloadUrl];
   record.downloads=[];
   for(const url of urls.filter(Boolean)){const r=await fetch(base+url);const bytes=Buffer.from(await r.arrayBuffer());record.downloads.push({status:r.status,bytes:bytes.length,type:r.headers.get('content-type')});}
  }
  await fs.writeFile(path.join(root,request.name+'-metrics.json'),JSON.stringify(record,null,2));
  console.log('[AUDIT]',JSON.stringify({name:request.name,status:record.status,initialMs:Math.round(initialMs),totalMs:Math.round(record.totalObservedMs),error:record.error}));
 }
}finally{if(server){server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}}
