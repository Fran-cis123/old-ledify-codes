import fs from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
import {reviewAndRepairPresentation} from '../Service/ai/presentationQuality.mjs';
const root=path.resolve('generated/performance-audit');await fs.mkdir(root,{recursive:true});
const baselineRevision=process.argv[2]||'7504f2f';
let source=execFileSync('git',['show',`${baselineRevision}:Service/ai/presentationQuality.mjs`],{encoding:'utf8'});
source=source.replace(/from '([^']+)'/g,(_,relative)=>`from '${new URL(relative,pathToFileURL(path.resolve('Service/ai/presentationQuality.mjs'))).href}'`);
const file=path.join(root,'baseline-quality.mjs');await fs.writeFile(file,source);
const old=(await import(pathToFileURL(file).href)).reviewAndRepairPresentation;
const records=[];
for(const [phase,run] of [['baseline',old],['optimized',reviewAndRepairPresentation]]){
 let calls=0,active=0,peak=0;
 const presentation={title:'Evidence',slides:[1,2,3,4].map(slideNumber=>({slideNumber,title:'Evidence '+slideNumber,slideType:'focused-explanation',content:{textContent:{body:'Initial explanation'}}}))};
 const client={models:{generateContent:async()=>({text:JSON.stringify({coverage:[],issues:calls++===0?presentation.slides.map(s=>({slideNumber:s.slideNumber,severity:'error',code:'DEPTH',message:'Develop content',repairInstruction:'Explain the distinction'})):[]}),candidates:[{finishReason:'STOP'}]})}};
 const start=performance.now();
 await run({presentation,input:'Explain evidence',inputType:'prompt',context:{},client,options:{slideConcurrency:2,logger:()=>{}},repairSlide:async s=>{peak=Math.max(peak,++active);await new Promise(r=>setTimeout(r,150));active--;return {textContent:{body:'Repaired '+s.slideNumber}};}});
 records.push({phase,elapsedMs:performance.now()-start,peakConcurrentRepairs:peak,reviewCalls:calls,content:presentation.slides.map(s=>s.content)});
}
await fs.writeFile(path.join(root,'repair-scheduling-comparison.json'),JSON.stringify({baselineRevision,note:'Controlled scheduler measurement: real review orchestration, deterministic provider fixture, four 150 ms repair operations. This is not an end-to-end Gemini speed claim.',records},null,2));
console.log(JSON.stringify(records.map(({content,...record})=>record)));
