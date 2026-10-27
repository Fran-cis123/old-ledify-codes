import 'dotenv/config';
import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {once} from 'node:events';
import assert from 'node:assert/strict';
import express from 'express';
import {chromium} from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import JSZip from 'jszip';
import {createApp} from '../../src/app.mjs';
import {generateService} from '../../Service/generateService.mjs';
import {webpageLayoutService} from '../../Service/webpageLayoutService.mjs';
import {webpageThemeService} from '../../Service/webpageThemeService.mjs';
import {webpageRenderer} from '../../renderer/webpage/webpageRenderer.mjs';
import {checkWebsiteBrowser} from '../../Service/webpage/browserChecks.mjs';
import {validateStaticWebsite} from '../../Service/webpageStaticValidator.mjs';
import {webpageArtifactService} from '../../Service/webpageArtifactService.mjs';
import {planWebsiteImages} from '../../Service/webpage/imageStrategy.mjs';
const root=path.resolve('generated/webpage-design-quality'),mode=process.argv[2]||'inspect';await fs.mkdir(root,{recursive:true});
const prompts={
 ai:'Create a premium educational website named Neural Atlas about artificial intelligence, machine learning, neural networks, computing infrastructure, applications, and responsible use. Include a focused introduction, core concepts, a workflow, applications, and ethics. Use a sophisticated midnight navy, electric blue and violet identity, modern sans-serif typography, relevant conceptual computing imagery and varied editorial layouts. Do not invent statistics, citations or achievements.',
 realestate:'Create a premium luxury real estate concept website for fictional Élite Havens. Explain proposed waterfront villas, penthouses, thoughtful interiors, smart-home concepts, and the inquiry-to-inspection journey. Use ivory, charcoal, champagne and deep green, elegant editorial typography and a photographic full-width hero. Property examples are illustrative concepts, not available listings. Do not invent prices, returns, locations, customers or company achievements.',
 healthcare:'Create a clean professional educational healthcare technology website named Carefield Review. Explain diagnostic imaging, medical devices, telemedicine and responsible clinical oversight. Use cool white, muted blue, teal and restrained green, readable humanist typography and a balanced image-and-text hero. Do not present this as a hospital, promise patient outcomes, invent certifications or offer medical advice.',
 education:'Create a welcoming professional education website for fictional Cedar Learning. Discuss reading, mathematics, inquiry-led science, learning resources and how to explore the subjects. Use warm neutral backgrounds, trustworthy blue, modern readable typography and an image-and-text hero. Do not invent staff, enrollment, accreditation, testimonials or learning outcomes.',
 finance:'Create a sophisticated educational financial services overview named Northline Financial Perspectives. Explain financial planning concepts, risk awareness, diversification, decision processes and questions to ask a qualified adviser. Use navy, white and restrained emerald with modern typography and an editorial hero. This is general educational content, not personalized advice. Do not invent performance, returns, prices, clients, licenses or company achievements.',
 conservation:'Create a professional environmental conservation website named Living Coast. Explain endangered marine species, coral reefs, sea turtle habitats, conservation pressures and responsible observation. Use natural stone, forest green and marine teal, elegant readable typography and an image-led hero. Do not invent population statistics, partnerships, fieldwork results, donation processing or organizational achievements.'
};
const common=' Include one relevant original conceptual hero image, bundled locally in the ZIP. Additional images are optional. Use 4–6 useful sections with varied compositions and concise prose. No repetitive grids, fake forms, invented contact details or unsupported facts. Use meaningful internal navigation and a clear closing action.';
const app=createApp({model:{create:async value=>({...value,_id:'design-quality-live',save:async()=>{}})},webpageRoot:path.join(root,'artifacts'),generator:(kind,input,output,context,options)=>generateService(kind,input,output,context,{...options,artifacts:{root:path.join(root,'artifacts')}})});
app.use('/qa',express.static(root));const server=app.listen(0,'127.0.0.1');await once(server,'listening');const base=`http://127.0.0.1:${server.address().port}`;
const reports=[];let browser;
try{
 if(mode==='generate')for(const [name,prompt] of Object.entries(prompts)){
  const directory=path.join(root,name);await fs.mkdir(directory,{recursive:true});
  try{const saved=JSON.parse(await fs.readFile(path.join(directory,'response.json'),'utf8'));if(saved.data?.result?.artifacts)continue;}catch{}
  const start=performance.now();const response=await fetch(base+'/api/generate/textPrompt',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({textPrompt:prompt+common,outputType:'webpage'})});
  const value=await response.json();await fs.writeFile(path.join(directory,'response.json'),JSON.stringify(value,null,2));
  await fs.writeFile(path.join(directory,'generation.json'),JSON.stringify({httpStatus:response.status,totalMs:performance.now()-start},null,2));
  console.log('[DESIGN_GENERATED]',JSON.stringify({name,status:response.status,resultStatus:value.data?.result?.status}));
 }
 if(mode==='refine')for(const name of Object.keys(prompts)){
  const directory=path.join(root,name),saved=JSON.parse(await fs.readFile(path.join(directory,'response.json'),'utf8')),result=saved.data?.result;if(!result?.artifacts)continue;
  try{await fs.copyFile(path.join(directory,'response.json'),path.join(directory,'response-original.json'),fs.constants.COPYFILE_EXCL);}catch{}
  const started=performance.now(),page=webpageThemeService(webpageLayoutService(result.generatedContent,{instructions:prompts[name]+common}),{instructions:prompts[name]+common});
  const hero=page.visualAssets?.hero;
  if(hero?.source==='Google Gemini'){
   const planned=planWebsiteImages(page,{instructions:prompts[name]+common}).find(image=>image.role==='hero');
   if(planned){hero.alt=planned.alt;for(const credit of page.visualAssets.credits||[])if(credit.assetId===hero.assetId)credit.alt=planned.alt;}
  }
  const archive=await fetch(base+result.artifacts.downloadUrl);assert.equal(archive.status,200);const zip=await JSZip.loadAsync(await archive.arrayBuffer(),{checkCRC32:true}),assets={};
  for(const [fileName,file] of Object.entries(zip.files))if(!file.dir&&fileName.includes('/assets/images/'))assets[fileName.replace(/^my-website\//,'')]=await file.async('nodebuffer');
  const files=webpageRenderer(page,assets);validateStaticWebsite(files);result.generatedContent=page;result.artifacts=await webpageArtifactService(files,{root:path.join(root,'artifacts')});
  const generation=JSON.parse(await fs.readFile(path.join(directory,'generation.json'),'utf8'));generation.refinementMs=performance.now()-started;await fs.writeFile(path.join(directory,'generation.json'),JSON.stringify(generation,null,2));await fs.writeFile(path.join(directory,'response.json'),JSON.stringify(saved,null,2));
 }
 // Same-content comparison: only planning/theme/rendering change, using saved AI content and exact existing images.
 if(mode==='compare'){
  const old=JSON.parse(await fs.readFile('generated/image-relevance-live/2026-10-24T22-47-36-641Z/response.json','utf8')).data.result;
  const page=webpageThemeService(webpageLayoutService(old.generatedContent));
  const zip=await JSZip.loadAsync(await fs.readFile('generated/image-relevance-live/2026-10-24T22-47-36-641Z/website.zip'));const assets={};
  for(const [name,file] of Object.entries(zip.files))if(!file.dir&&name.includes('/assets/images/'))assets[name.replace(/^my-website\//,'')]=await file.async('nodebuffer');
  const files=webpageRenderer(page,assets);validateStaticWebsite(files);const dir=path.join(root,'same-content-after');await fs.mkdir(dir,{recursive:true});
  for(const [name,bytes] of Object.entries(files)){const out=path.join(dir,name);await fs.mkdir(path.dirname(out),{recursive:true});await fs.writeFile(out,bytes);}
 }
 browser=await chromium.launch({headless:true,channel:'msedge'});
 const selected=process.argv.slice(3);
 if(selected.length&&mode!=='compare')try{reports.push(...JSON.parse(await fs.readFile(path.join(root,'report.json'),'utf8')).filter(report=>!selected.includes(report.name)));}catch{}
 const entries=mode==='compare'?[['same-content-after',null]]:Object.entries(prompts).filter(([name])=>!selected.length||selected.includes(name)).map(([name])=>[name,null]);
 for(const [name] of entries){
  const directory=path.join(root,name);let site;
  const record={name,widths:[],failures:[]};
  if(mode==='compare')site=base+'/qa/same-content-after/index.html';
  else{
   const saved=JSON.parse(await fs.readFile(path.join(directory,'response.json'),'utf8')),result=saved.data?.result;
   if(!result?.artifacts){reports.push({...record,error:saved});continue;}
   record.theme=result.generatedContent.theme;record.generation=JSON.parse(await fs.readFile(path.join(directory,'generation.json'),'utf8'));record.timings=result.timings;record.imageValidation=result.imageValidation;
   record.previewStatus=(await fetch(base+result.artifacts.previewUrl)).status;assert.equal(record.previewStatus,200);
   const archive=await fetch(base+result.artifacts.downloadUrl);assert.equal(archive.status,200);const bytes=Buffer.from(await archive.arrayBuffer());await fs.writeFile(path.join(directory,'website.zip'),bytes);
   const zip=await JSZip.loadAsync(bytes,{checkCRC32:true});
   for(const [fileName,file] of Object.entries(zip.files)){if(file.dir)continue;assert.ok(!fileName.includes('..'));const out=path.join(directory,'extracted',fileName);await fs.mkdir(path.dirname(out),{recursive:true});await fs.writeFile(out,await file.async('nodebuffer'));}
   site=base+result.artifacts.siteUrl;
  }
  for(const width of [1440,768,390]){
   const context=await browser.newContext({viewport:{width,height:1000},reducedMotion:'reduce'}),page=await context.newPage();const errors=[];page.on('pageerror',error=>errors.push(error.message));
   const start=performance.now();await page.goto(site);await page.locator('img').evaluateAll(images=>Promise.all(images.map(image=>{image.loading='eager';return image.decode();})));
   const checks=await checkWebsiteBrowser(page);checks.width=width;checks.loadMs=performance.now()-start;checks.runtimeErrors=errors;
   const axe=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).options({preload:false}).analyze();checks.accessibility=axe.violations.map(v=>({id:v.id,impact:v.impact,targets:v.nodes.map(n=>n.target)}));
   await page.screenshot({path:path.join(directory,`desktop-${width}.png`),fullPage:true});
   if(width===1440)await page.screenshot({path:path.join(directory,'hero-desktop.png'),fullPage:false});
   record.widths.push(checks);record.failures.push(...checks.failures,...checks.accessibility,...errors);await context.close();
  }
  if(mode!=='compare'){
   const context=await browser.newContext({viewport:{width:390,height:900},offline:true,reducedMotion:'reduce'}),page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));const requests=[];page.on('request',r=>{if(/^https?:/.test(r.url()))requests.push(r.url());});
   await page.goto(pathToFileURL(path.join(directory,'extracted/my-website/index.html')).href);await page.locator('img').evaluateAll(images=>Promise.all(images.map(image=>{image.loading='eager';return Promise.race([image.decode(),new Promise((_,reject)=>setTimeout(()=>reject(new Error('Offline image decode timed out')),8000))]);})));record.offline=await checkWebsiteBrowser(page);record.offline.requests=requests;record.offline.runtimeErrors=errors;record.failures.push(...record.offline.failures,...errors,...requests);await context.close();
  }
  reports.push(record);await fs.writeFile(path.join(root,mode==='compare'?'comparison-report.json':'report.json'),JSON.stringify(reports,null,2));console.log('[DESIGN_CHECKED]',JSON.stringify({name,failures:record.failures.length}));
 }
}finally{await browser?.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
if(reports.some(report=>report.error||report.failures.length))process.exitCode=1;
