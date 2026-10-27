import 'dotenv/config';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {generateService} from '../Service/generateService.mjs';
import {profileGeneration} from '../Service/performance.mjs';
const root=path.resolve(process.argv[2]||'generated/system-reliability/final-2026-10-27'),jobs=path.join(root,'jobs');let payload,completedContent;
for(const id of await fs.readdir(jobs)){
 try{const input=JSON.parse(await fs.readFile(path.join(jobs,id,'input.json'),'utf8'));if(input.outputType==='presentation'&&input.context?.slideCount===10&&/text-only/i.test(input.input)){payload=input;completedContent=JSON.parse(await fs.readFile(path.join(jobs,id,'content.json'),'utf8'));break;}}catch{}
}
assert.ok(completedContent,'The controlled original content checkpoint is required');let report;
const result=await profileGeneration(()=>generateService(payload.kind,payload.input,payload.outputType,payload.context,{completedContent,prefetchImages:false,visuals:{providers:{search:async()=>{throw new Error('No stock calls permitted');},generate:async()=>{throw new Error('No generated-image calls permitted');}}}}),{forceNew:true,onReport:value=>{report=value;}});
assert.equal(report.ai.calls,0);assert.equal(result.generatedContent.slides.length,10);assert.equal(result.preview.slides.length,10);assert.equal(result.preview.stages.pdf,'completed');assert.equal(result.preview.stages.png,'completed');
await fs.writeFile(path.join(root,'text-only-replay.json'),JSON.stringify({scope:'Identical saved AI content, no fresh provider calls; native exports rerun.',status:result.status,performance:report,slides:result.preview.slides.length,previewStages:result.preview.stages},null,2));
console.log('[TEXT_ONLY_REPLAY]',JSON.stringify({aiCalls:report.ai.calls,totalMs:report.totalMs,visualsMs:report.stages['presentation-images'].elapsedMs,slides:result.preview.slides.length}));
