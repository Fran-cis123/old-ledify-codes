import 'dotenv/config';
import fs from 'node:fs/promises';
import path from 'node:path';
import {once} from 'node:events';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import JSZip from 'jszip';
import {load} from 'cheerio';
import sharp from 'sharp';
import {createApp} from '../src/app.mjs';
import {generateService} from '../Service/generateService.mjs';
const phase=process.argv[2]||'baseline',count=Number(process.argv[3]||1),root=path.resolve('generated/presentation-speed',phase);
await fs.mkdir(root,{recursive:true});process.env.LEDIFY_PRESENTATION_ROOT=path.join(root,'presentations');
const prompts=[
 'Create exactly 10 polished introductory slides for AERONOVA AIRLINES, a fictional proposed airline. Cover these ten topics in order: brand introduction; proposed purpose; passenger needs; service principles; cabin experience; safety culture; the customer journey; ground operations; sustainability trade-offs; conclusion. Do not invent actual aircraft fleets, routes, prices, operating certificates, safety records, statistics or contact details. Use authentic aviation photographs on slides 1, 5 and 8 only, matching aircraft, cabin experience and ground operations respectively. Keep all three pictures, every requested topic, concise meaningful content, consistent typography and varied professional editable layouts. Use a relevant full-slide cover photograph with readable title text. Use navy, white and subtle teal.',
 'Create exactly 10 polished educational slides about marine conservation for students and policymakers. Cover these ten topics in order: introduction; ocean habitats; coral reefs; sea turtles; reef ecosystems; fishing impacts; protection strategies; marine research; practical trade-offs; conclusion. Do not invent statistics, research results, guarantees or citations. Use authentic marine photographs on slides 1, 5 and 8 only, matching ocean habitats, coral reefs and marine research respectively. Keep all three pictures, every requested topic, concise meaningful content, consistent typography and varied professional editable layouts. Use a relevant full-slide cover photograph with readable title text. Use navy, ivory and subtle teal.'
];
const context={slideCount:10,designPreferences:{noImageSlideNumbers:[2,3,4,6,7,9,10]}};
const reports=[],perfs=[],checkpoints=new Map();
if(process.argv[4]){const previous=path.resolve(process.argv[4],'jobs');for(const id of await fs.readdir(previous)){try{const input=JSON.parse(await fs.readFile(path.join(previous,id,'input.json'),'utf8')),content=JSON.parse(await fs.readFile(path.join(previous,id,'content.json'),'utf8'));checkpoints.set(input.input,content);}catch{}}}
const model={create:async value=>({...value,_id:'speed-audit',save:async()=>{}}),findByIdAndUpdate:async()=>{}};
const app=createApp({model,jobRoot:path.join(root,'jobs'),jobOptions:{onPerformanceReport:report=>perfs.push(report)},generator:(kind,input,output,context,options)=>generateService(kind,input,output,context,{...options,...(checkpoints.has(input)?{completedContent:checkpoints.get(input)}:{}),visuals:{cacheRoot:path.join(root,'photo-cache'),policy:{maxGenerated:0}},preview:{...options.preview,outputDirectory:process.env.LEDIFY_PRESENTATION_ROOT}})});
const server=app.listen(0,'127.0.0.1');await once(server,'listening');const origin=`http://127.0.0.1:${server.address().port}`,history=[];
async function bytes(url){const response=await fetch(new URL(url,origin));assert.equal(response.status,200);return Buffer.from(await response.arrayBuffer());}
const digest=buffer=>createHash('sha256').update(buffer).digest('hex');
try{
 const start=performance.now(),cpu=process.cpuUsage(),health=[];let peak=process.memoryUsage().rss;
 const sampler=setInterval(()=>{peak=Math.max(peak,process.memoryUsage().rss);const at=performance.now();fetch(origin+'/healthz').then(response=>{assert.equal(response.status,200);health.push(performance.now()-at);}).catch(()=>{});},200);sampler.unref();
 const receipts=await Promise.all(Array.from({length:count},async(_,index)=>{const prompt=prompts[index%prompts.length],response=await fetch(origin+'/api/generate/textPrompt',{method:'POST',headers:{'Content-Type':'application/json',Prefer:'respond-async'},body:JSON.stringify({textPrompt:prompt,outputType:'presentation',context})});assert.equal(response.status,202);return {prompt,...(await response.json()).data,admissionMs:performance.now()-start};}));
 for(const receipt of receipts){
  const report={requestHash:digest(Buffer.from(receipt.prompt)),phase,admissionMs:Math.round(receipt.admissionMs),scope:(checkpoints.size?'Saved identical AI content; ':'Fresh configured text models; ')+'stock only; local HTTP, real native exports, metadata database stub.'};
  try{
   let job;while(performance.now()-start<600000){job=(await(await fetch(origin+receipt.statusUrl)).json()).data;if(['completed','failed'].includes(job.status))break;await new Promise(resolve=>setTimeout(resolve,250));}
   report.status=job?.status;report.timings=job?.timings;assert.equal(job?.status,'completed',JSON.stringify(job?.error));const result=job.result;
   report.resultStatus=result.status;report.coverage=result.generatedContent.imageCoverage;report.imageValidation=result.imageValidation;report.warnings=(result.warnings||[]).map(w=>w.code);
   const pptx=await bytes(result.preview.downloads.pptx),zip=await JSZip.loadAsync(pptx,{checkCRC32:true});
   assert.equal(Object.keys(zip.files).filter(name=>/^ppt\/slides\/slide\d+\.xml$/.test(name)).length,10);assert.equal(result.preview.slides.length,10);
   const photoSlides=result.generatedContent.slides.filter(slide=>slide.photoAsset);report.photoSlides=photoSlides.map(s=>s.slideNumber);report.photographs=photoSlides.map(s=>({slideNumber:s.slideNumber,source:s.photoAsset.source,id:s.photoAsset.id,width:s.photoAsset.width,height:s.photoAsset.height,sourceChecksum:s.photoAsset.sourceChecksum}));
   const cover=load(await zip.file('ppt/slides/slide1.xml').async('string'),{xmlMode:true}),pics=cover('p\\:pic').toArray();report.fullSlideCover=pics.some(node=>{const x=cover(node).find('a\\:xfrm'),off=x.find('a\\:off'),ext=x.find('a\\:ext');return Number(off.attr('x'))===0&&Number(off.attr('y'))===0&&Math.abs(Number(ext.attr('cx'))/914400-13.333333)<.01&&Math.abs(Number(ext.attr('cy'))/914400-7.5)<.01;});
   const pdf=await bytes(result.preview.downloads.pdf);assert.equal(pdf.subarray(0,4).toString(),'%PDF');
   for(const [i,url] of [result.preview.downloads.pptx,result.preview.downloads.pdf,...result.preview.slides.map(slide=>slide.url)].entries()){const buffer=i===0?pptx:i===1?pdf:await bytes(url);history.push({url,hash:digest(buffer)});if(i>1){assert.equal(buffer.subarray(0,4).toString('hex'),'89504e47');await sharp(buffer).metadata();if(i===2)await fs.writeFile(path.join(root,'cover-'+reports.length+'.png'),buffer);}}
   report.previewQuality=result.preview.quality;report.artifactChecks='passed';
  }catch(error){report.artifactChecks='failed';report.error=String(error.message).slice(0,1000);}
  reports.push(report);
 }
 for(const artifact of history)assert.equal(digest(await bytes(artifact.url)),artifact.hash);
 clearInterval(sampler);health.sort((a,b)=>a-b);const used=process.cpuUsage(cpu);
 const summary={phase,users:count,totalMs:Math.round(performance.now()-start),nodePeakRss:peak,nodeCpuMs:(used.user+used.system)/1000,healthP95Ms:health[Math.max(0,Math.ceil(health.length*.95)-1)],reports,perfs};
 await fs.writeFile(path.join(root,'report.json'),JSON.stringify(summary,null,2));console.log('[PRESENTATION_SPEED]',JSON.stringify({phase,users:count,totalMs:summary.totalMs,statuses:reports.map(r=>r.artifactChecks),photoSlides:reports.map(r=>r.photoSlides)}));
 if(reports.some(report=>report.artifactChecks!=='passed'))process.exitCode=1;
}finally{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
