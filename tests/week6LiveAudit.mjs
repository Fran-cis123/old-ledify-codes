import 'dotenv/config';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {chromium} from 'playwright';
import JSZip from 'jszip';
import {load} from 'cheerio';
import {PDFParse} from 'pdf-parse';
import {createApp} from '../src/app.mjs';
import {urlService} from '../Service/urlService.mjs';
import {convertPdfToImages} from '../renderer/converters/pdfToImages.mjs';
const run=process.argv[2]||new Date().toISOString().replace(/[:.]/g,'-'),root=path.resolve('generated/week6-uat',run);await fs.mkdir(root,{recursive:true});
const reports=[];
const samples=[
 {name:'presentation',outputType:'presentation',textPrompt:'Create exactly 5 professional slides on reusable rockets, orbital docking, lunar missions, and space engineering challenges. Use original conceptual space imagery on the title and lunar slide, and native editable explanations elsewhere. Use concise scientifically careful content without invented statistics, dates or mission achievements. Use varied readable dark editorial layouts.',context:{slideCount:5,designPreferences:{noImageSlideNumbers:[2,3,5]}}},
 {name:'webpage',outputType:'webpage',textPrompt:'Create a premium responsive educational website titled Beyond Earth about space exploration. Include reusable rockets, orbital research, lunar exploration, Mars robotics and engineering challenges. Use relevant original conceptual images of spacecraft or lunar exploration, cinematic dark editorial layouts and clear navigation. Do not invent mission achievements, statistics or claims. Include local image assets in the ZIP.'},
 {name:'document',outputType:'document',exportFormat:'pdf',textPrompt:'Create a clear professional 400-word report on government and public accountability. Explain public services, the separation of powers, oversight mechanisms and a practical conclusion. Use concise headings and useful bullet lists. Do not invent statistics or citations.',context:{wordCount:400}}
];
const app=createApp({model:{create:async value=>({...value,_id:'week6-live',save:async()=>{}})},jobRoot:path.join(root,'jobs')}),server=app.listen(0,'127.0.0.1');await once(server,'listening');const base=`http://127.0.0.1:${server.address().port}`;
let browser;
try{
 for(const request of samples.filter(sample=>!process.argv[3]||sample.name===process.argv[3])){
  const start=performance.now();let record={name:request.name,outputType:request.outputType,scope:'Fresh real configured AI, image providers and production renderers; local HTTP, metadata database stub; no MongoDB latency.',thresholdMs:10000};
  try{
   const response=await fetch(base+'/api/generate/textPrompt',{method:'POST',headers:{'Content-Type':'application/json',Prefer:'respond-async'},body:JSON.stringify(request)}),accepted=await response.json();record.admissionMs=Math.round(performance.now()-start);assert.equal(response.status,202,JSON.stringify(accepted));let job;
   while(performance.now()-start<420000){job=(await (await fetch(base+accepted.data.statusUrl)).json()).data;if(['completed','failed'].includes(job.status))break;await new Promise(resolve=>setTimeout(resolve,500));}
   record.jobStatus=job?.status;record.error=job?.error;record.totalMs=Math.round(performance.now()-start);record.within10Seconds=record.totalMs<=10000;assert.ok(job?.result,JSON.stringify(job?.error));const result=job.result;record.resultStatus=result.status;record.timings=result.timings;record.imageValidation=result.imageValidation;record.warnings=result.warnings?.map(w=>({code:w.code,stage:w.stage,slideNumber:w.slideNumber}));await fs.writeFile(path.join(root,request.name+'-result.json'),JSON.stringify(result,null,2));
   if(request.outputType==='presentation'){
    record.imageCoverage=result.generatedContent.visualQuality?.coverage||result.generatedContent.visualQuality;record.previewStages=result.preview.stages;record.slides=[];
    for(const slide of result.preview.slides){const response=await fetch(base+slide.url);assert.equal(response.status,200);await fs.writeFile(path.join(root,`slide-${slide.slideNumber}.png`),Buffer.from(await response.arrayBuffer()));record.slides.push({number:slide.slideNumber,title:slide.title});}
    for(const [format,url] of Object.entries(result.preview.downloads)){const response=await fetch(base+url);assert.equal(response.status,200);const bytes=Buffer.from(await response.arrayBuffer());await fs.writeFile(path.join(root,'presentation.'+format),bytes);if(format==='pptx'){const zip=await JSZip.loadAsync(bytes,{checkCRC32:true});record.embeddedMedia=Object.keys(zip.files).filter(name=>/^ppt\/media\/.*\.(?:png|jpe?g)$/i.test(name)).length;}}
   }else if(request.outputType==='webpage'){
    const site=base+result.artifacts.siteUrl,response=await fetch(site);assert.equal(response.status,200);const $=load(await response.text()),archive=await fetch(base+result.artifacts.downloadUrl);assert.equal(archive.status,200);const bytes=Buffer.from(await archive.arrayBuffer());await fs.writeFile(path.join(root,'website.zip'),bytes);const zip=await JSZip.loadAsync(bytes,{checkCRC32:true});record.images=[];
    for(const el of $('img').toArray()){const url=$(el).attr('src'),asset=await fetch(new URL(url,site));assert.equal(asset.status,200);const data=Buffer.from(await asset.arrayBuffer());assert.deepEqual(data,await zip.file('my-website/'+url.replace(/^\.\//,'')).async('nodebuffer'));record.images.push({alt:$(el).attr('alt'),mime:asset.headers.get('content-type'),bytes:data.length});}
    browser??=await chromium.launch({headless:true,...(process.platform==='win32'?{channel:'msedge'}:{})});
    for(const width of [1440,390]){const page=await browser.newPage({viewport:{width,height:1000},reducedMotion:'reduce'});await page.goto(site);await page.locator('img').evaluateAll(images=>Promise.all(images.map(image=>{image.loading='eager';return image.decode();})));record['overflow'+width]=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);assert.equal(record['overflow'+width],false);await page.screenshot({path:path.join(root,`website-${width}.png`),fullPage:true});await page.close();}
   }else{
    for(const [format,url] of Object.entries(result.artifacts.downloads)){const response=await fetch(base+url);assert.equal(response.status,200);const bytes=Buffer.from(await response.arrayBuffer());await fs.writeFile(path.join(root,'document.'+format),bytes);if(format==='pdf'){const parser=new PDFParse({data:bytes});try{const parsed=await parser.getText();record.pdfPages=parsed.total;record.pdfCharacters=parsed.text.length;assert.match(parsed.text,/accountability/i);}finally{await parser.destroy();}}}
    await convertPdfToImages({pdfPath:path.join(root,'document.pdf'),outputDirectory:path.join(root,'document-pages')});
    const preview=await fetch(base+result.previewUrl);assert.equal(preview.status,200);record.previewPassed=true;
   }
   record.artifactChecks='passed';
  }catch(error){record.failure=String(error.message).slice(0,500);record.artifactChecks='failed';}
  reports.push(record);await fs.writeFile(path.join(root,'report.json'),JSON.stringify({run,root,reports},null,2));console.log('[WEEK6]',JSON.stringify({name:record.name,admissionMs:record.admissionMs,totalMs:record.totalMs,status:record.jobStatus,resultStatus:record.resultStatus,artifactChecks:record.artifactChecks,failure:record.failure}));
 }
 const urls=[];for(const url of ['https://example.com','https://en.wikipedia.org/wiki/Artificial_intelligence','https://ledify-uat-unreachable.invalid']){const started=performance.now();try{const text=await urlService(url);urls.push({url,status:'extracted',characters:text.length,elapsedMs:Math.round(performance.now()-started)});}catch(error){urls.push({url,status:'rejected',errorCode:error.code,elapsedMs:Math.round(performance.now()-started)});}}
 await fs.writeFile(path.join(root,'report.json'),JSON.stringify({run,root,reports,urls},null,2));console.log('[WEEK6 URLs]',JSON.stringify(urls));
}finally{await browser?.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
