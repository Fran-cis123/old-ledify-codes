import 'dotenv/config';
import fs from 'node:fs/promises';
import path from 'node:path';
import {once} from 'node:events';
import assert from 'node:assert/strict';
import JSZip from 'jszip';
import {load} from 'cheerio';
import {chromium} from 'playwright';
import {createApp} from '../src/app.mjs';
import {generateService} from '../Service/generateService.mjs';
import {websiteImageProviders} from '../Service/webpage/imageProviders.mjs';
import {docxSource,DOCX_MIME} from './fixtures/uploadFiles.mjs';
import {checkWebsiteBrowser} from '../Service/webpage/browserChecks.mjs';
const root=path.resolve('generated/isolation-live',process.argv[2]||Date.now().toString());await fs.mkdir(root,{recursive:true});
process.env.LEDIFY_PRESENTATION_ROOT=path.join(root,'presentations');
const source='Marine conservation protects ocean habitats and the species that depend on them. Coral reefs provide complex habitats. Sea turtles face threats from habitat loss and accidental capture. Conservation approaches include habitat protection, responsible fishing practices and research. Decisions should reflect local ecology and community needs. No outcome is guaranteed.';
const cases=[
 {name:'boutique',kind:'textPrompt',body:{outputType:'webpage',textPrompt:'Create a concise, elegant educational clothing boutique website titled THE STYLE ATELIER. Explain textile craftsmanship and considered garment selection. Use one authentic clothing boutique photograph in the hero. Keep the rest text-only. Do not invent inventory, prices, addresses, availability or statistics. Include an introduction, three informative cards and a footer. Use ivory and charcoal, readable typography and responsive layouts.'}},
 {name:'marine',kind:'file',file:await docxSource(source),body:{outputType:'presentation',context:{slideCount:2,instructions:'Create exactly two concise educational slides about marine conservation from the source. Use one authentic ocean or coral photograph on the cover only. The second slide explains habitat protection and limitations. Do not invent statistics or mission claims.',designPreferences:{noImageSlideNumbers:[2]}}}},
 {name:'source-report',kind:'urlPrompt',body:{outputType:'document',urlPrompt:'https://example.com',context:{instructions:'Write a concise source-based educational report of approximately 150 words explaining this supplied page and its purpose. Use text only. Do not invent services, contact details, statistics or citations.',wordCount:150}}}
];
const reports=[],perfs=[];
const checkpoints=new Map();
if(process.argv[3]){const previous=path.resolve(process.argv[3],'jobs');for(const id of await fs.readdir(previous)){try{const input=JSON.parse(await fs.readFile(path.join(previous,id,'input.json'),'utf8')),content=JSON.parse(await fs.readFile(path.join(previous,id,'content.json'),'utf8'));checkpoints.set(input.outputType,content);}catch{}}}
const model={create:async value=>({...value,_id:'isolated-live-metadata',save:async()=>{}}),findByIdAndUpdate:async()=>{}};
const app=createApp({model,jobRoot:path.join(root,'jobs'),jobOptions:{onPerformanceReport:report=>perfs.push(report)},webpageRoot:path.join(root,'webpages'),documentRoot:path.join(root,'documents'),generator:(kind,input,output,context,options)=>generateService(kind,input,output,context,{...options,...(checkpoints.has(output)?{completedContent:checkpoints.get(output)}:{}),artifacts:{root:path.join(root,'webpages')},document:{root:path.join(root,'documents')},webpageAssets:{providers:websiteImageProviders({}),optimization:{cacheRoot:path.join(root,'web-cache')},policy:{maxAssets:1,maxGenerated:0,retries:0,totalMs:20000,timeoutMs:10000}},visuals:{cacheRoot:path.join(root,'slide-cache'),diagramPlanner:false,policy:{maxImages:1,maxGenerated:0,retries:0,deadlineMs:30000}},preview:{...options.preview,outputDirectory:process.env.LEDIFY_PRESENTATION_ROOT}})});
const server=app.listen(0,'127.0.0.1');await once(server,'listening');const origin=`http://127.0.0.1:${server.address().port}`;
async function bytes(url){const response=await fetch(new URL(url,origin));assert.equal(response.status,200);return Buffer.from(await response.arrayBuffer());}
let browser;
try{
 const started=performance.now();
 const pending=await Promise.all(cases.filter(sample=>!process.argv[4]||sample.name===process.argv[4]).map(async sample=>{
  let body,headers={Prefer:'respond-async'};
  if(sample.file){body=new FormData();body.set('file',new Blob([sample.file],{type:DOCX_MIME}),'marine-source.docx');body.set('outputType',sample.body.outputType);body.set('context',JSON.stringify(sample.body.context));}
  else{headers['Content-Type']='application/json';body=JSON.stringify(sample.body);}
  const response=await fetch(origin+'/api/generate/'+sample.kind,{method:'POST',headers,body});const receipt=await response.json();assert.equal(response.status,202,JSON.stringify(receipt));return {sample,receipt:receipt.data,admissionMs:Math.round(performance.now()-started)};
 }));
 for(const {sample,receipt,admissionMs} of pending){
  const report={name:sample.name,input:sample.kind,output:sample.body.outputType,admissionMs,scope:(checkpoints.size?'Saved real-provider text replay':'Fresh existing text models')+', live stock search, real URL/DOCX extraction and native exports; local HTTP and metadata DB stub. Paid image generation disabled.'};
  try{
   let job;while(performance.now()-started<420000){job=(await(await fetch(origin+receipt.statusUrl)).json()).data;if(['completed','failed'].includes(job.status))break;await new Promise(resolve=>setTimeout(resolve,300));}
   report.status=job?.status;report.timings=job?.timings;assert.equal(job?.status,'completed',JSON.stringify(job?.error));const result=job.result;
   report.resultStatus=result.status;report.warningCodes=(result.warnings||[]).map(w=>w.code);
   if(sample.body.outputType==='webpage'){
    const html=(await bytes(result.artifacts.siteUrl)).toString(),$=load(html),zip=await JSZip.loadAsync(await bytes(result.artifacts.downloadUrl),{checkCRC32:true});
    report.images=$('img').length;assert.ok(result.generatedContent.visualAssets.hero,'Expected independently relevant boutique photograph');
    for(const node of $('img').toArray()){const src=$(node).attr('src');assert.deepEqual(await bytes(new URL(src,new URL(result.artifacts.siteUrl,origin)).href),await zip.file('my-website/'+src.replace(/^\.\//,'')).async('nodebuffer'));}
    const privateMetadata=JSON.parse(await fs.readFile(path.join(root,'webpages',result.artifacts.id,'metadata.json'),'utf8'));
    report.deliveryBindings=Boolean(privateMetadata.imageBindings&&Object.keys(privateMetadata.imageBindings).length);
    assert.equal(report.deliveryBindings,true);
    browser=await chromium.launch({headless:true,...(process.platform==='win32'?{channel:'msedge'}:{})});report.browser=[];
    for(const width of [1440,390]){const page=await browser.newPage({viewport:{width,height:1000},reducedMotion:'reduce'});await page.goto(origin+result.artifacts.siteUrl);await page.locator('img').evaluateAll(images=>Promise.all(images.map(image=>{image.loading='eager';return image.decode();})));const checked=await checkWebsiteBrowser(page);report.browser.push({width,...checked});await page.screenshot({path:path.join(root,'boutique-'+width+'.png'),fullPage:true});await page.close();assert.deepEqual(checked.failures,[]);}
   }else if(sample.body.outputType==='presentation'){
    const zip=await JSZip.loadAsync(await bytes(result.preview.downloads.pptx),{checkCRC32:true});assert.equal(Object.keys(zip.files).filter(name=>/^ppt\/slides\/slide\d+\.xml$/.test(name)).length,2);assert.equal(result.preview.slides.length,2);report.embeddedImages=Object.keys(zip.files).filter(name=>/^ppt\/media\//.test(name)&&!zip.files[name].dir).length;assert.ok(report.embeddedImages);
    assert.equal((await bytes(result.preview.downloads.pdf)).subarray(0,4).toString(),'%PDF');
    for(const slide of result.preview.slides){const png=await bytes(slide.url);assert.equal(png.subarray(0,4).toString('hex'),'89504e47');await fs.writeFile(path.join(root,'marine-'+slide.slideNumber+'.png'),png);}
    const dirs=await fs.readdir(process.env.LEDIFY_PRESENTATION_ROOT);let found=false;for(const dir of dirs){const manifest=JSON.parse(await fs.readFile(path.join(process.env.LEDIFY_PRESENTATION_ROOT,dir,'image-associations.json'),'utf8').catch(()=>'null'));if(manifest?.requestId===job.jobId){assert.ok(manifest.slides[0].images.length);found=true;}}assert.ok(found);report.associationManifest=true;
   }else{
    const zip=await JSZip.loadAsync(await bytes(result.artifacts.downloads.docx),{checkCRC32:true});assert.match(await zip.file('word/document.xml').async('string'),/example|illustrat|document/i);await bytes(result.previewUrl);
   }
   report.artifactChecks='passed';
  }catch(error){report.artifactChecks='failed';report.error=String(error.message).slice(0,800);}
  reports.push(report);await fs.writeFile(path.join(root,'report.json'),JSON.stringify({reports,perfs},null,2));console.log('[ISOLATION_LIVE]',JSON.stringify(report));
 }
 if(reports.some(report=>report.artifactChecks!=='passed'))process.exitCode=1;
}finally{await browser?.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
