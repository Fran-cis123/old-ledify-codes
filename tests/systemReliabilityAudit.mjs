import 'dotenv/config';
import fs from 'node:fs/promises';
import path from 'node:path';
import {once} from 'node:events';
import assert from 'node:assert/strict';
import JSZip from 'jszip';
import {load} from 'cheerio';
import {PDFParse} from 'pdf-parse';
import {chromium} from 'playwright';
import {createApp} from '../src/app.mjs';
import {generateService} from '../Service/generateService.mjs';
import {docxSource,DOCX_MIME} from './fixtures/uploadFiles.mjs';
import {checkWebsiteBrowser} from '../Service/webpage/browserChecks.mjs';
import {isAutomaticImageLabel} from '../renderer/imageLabels.mjs';
import {reviewImageCandidate} from '../Service/webpage/imageReview.mjs';
const root=path.resolve('generated/system-reliability',process.argv[2]||Date.now().toString()),reports=[];await fs.mkdir(root,{recursive:true});
const apex=JSON.parse(await fs.readFile(new URL('./fixtures/apexMotorsRequest.json',import.meta.url),'utf8'));
// Preserve all collection requirements; remove two repeated visual sentences.
apex.textPrompt=apex.textPrompt.replace("The website must deliver a breathtaking digital experience that immediately captures visitors' attention. ",'').replace('Every section should feel polished, modern, immersive, and visually extraordinary. ','');
const basePrompt='Create exactly 10 slides explaining the circular economy for students and policy teams. Cover material cycles, waste prevention, product durability, repair, reuse, remanufacturing, recycling, implementation trade-offs and conclusion. Use text-only layouts and native editable diagrams. No photographs or generated images. Do not invent statistics, dates, prices or citations. Keep heading and body sizes consistent and all content readable. ';
const longPrompt=(basePrompt+' Use distinct professional compositions, concise explanations and clear examples. Explain limitations without unsupported guarantees.'.repeat(20)).slice(0,1999)+'.';
const cases=[
 {name:'apex-webpage',kind:'textPrompt',body:apex},
 {name:'public-url-webpage',kind:'urlPrompt',body:{urlPrompt:'https://example.com',outputType:'webpage',context:{instructions:'Create a concise educational page explaining this supplied source and its purpose. Use text-only design. No images, invented contacts, statistics or services.'}}},
 {name:'water-document-file',kind:'file',body:{outputType:'document',exportFormat:'pdf',context:{instructions:'Write an approximately 300-word educational report based on the source. Explain household water use, agricultural water use, conservation methods and conclusion. No invented data or citations.',wordCount:300}},file:await docxSource('Water conservation helps communities use finite freshwater supplies responsibly. Households can repair leaks and choose efficient fittings. Agriculture can improve irrigation scheduling and soil moisture management. Conservation approaches depend on climate, infrastructure, access and local needs. Practical plans should compare water use, maintenance needs, affordability and environmental effects. A conclusion should explain that conservation requires both individual practices and coordinated public infrastructure.')},
 {name:'astronaut-presentation3',kind:'textPrompt',body:{outputType:'presentation',textPrompt:'Create exactly 3 professional educational slides about astronauts and orbital research. Use one authentic astronaut photograph on the cover only. Explain microgravity research, spacewalk operations and limitations without invented mission records or statistics. Keep all text concise and fonts consistent. Use a dark navy and white design. Include PDF and PNG previews.',context:{slideCount:3,designPreferences:{noImageSlideNumbers:[2,3]}}}},
 {name:'boundary-presentation10',kind:'textPrompt',body:{outputType:'presentation',textPrompt:longPrompt,context:{slideCount:10}}}
];
const model={create:async value=>({...value,_id:'system-audit',save:async()=>{}}),findByIdAndUpdate:async()=>{}};
const checkpoints=new Map();
if(process.argv[4])for(const id of await fs.readdir(path.resolve(process.argv[4],'jobs'))){
 try{const directory=path.resolve(process.argv[4],'jobs',id),input=JSON.parse(await fs.readFile(path.join(directory,'input.json'),'utf8')),content=JSON.parse(await fs.readFile(path.join(directory,'content.json'),'utf8'));checkpoints.set(input.outputType+':'+input.input,content);}catch{}
}
let currentCase='unknown';
const app=createApp({model,jobRoot:path.join(root,'jobs'),webpageRoot:path.join(root,'webpages'),documentRoot:path.join(root,'documents'),generator:(kind,input,output,context,options)=>generateService(kind,input,output,context,{...options,...(checkpoints.has(output+':'+input)?{completedContent:checkpoints.get(output+':'+input)}:{}),artifacts:{root:path.join(root,'webpages')},document:{root:path.join(root,'documents')},ai:{...options.ai,onInvalidContent:details=>fs.writeFile(path.join(root,currentCase+'-invalid.json'),JSON.stringify(details,null,2))},performance:{forceNew:true,onReport:report=>fs.writeFile(path.join(root,currentCase+'-perf.json'),JSON.stringify(report,null,2))}})});
const server=app.listen(0,'127.0.0.1');await once(server,'listening');const origin=`http://127.0.0.1:${server.address().port}`;
async function bytes(url){const r=await fetch(new URL(url,origin));assert.equal(r.status,200);return Buffer.from(await r.arrayBuffer());}
let browser;
try{
 for(const sample of cases.filter(sample=>!process.argv[3]||sample.name===process.argv[3])){
  currentCase=sample.name;const started=performance.now(),report={name:sample.name,inputType:sample.kind,outputType:sample.body.outputType,promptCharacters:sample.body.textPrompt?.length,scope:process.argv[4]?'Saved AI content replay; live stock providers, local HTTP and native exports; metadata database stub. Not fresh generation timing.':'Real providers and native exports, local HTTP; MongoDB metadata stub. No production success-rate inference.'};
  try{
   let body,headers={Prefer:'respond-async'};
   if(sample.file){body=new FormData();body.set('file',new Blob([sample.file],{type:DOCX_MIME}),'source.docx');body.set('outputType',sample.body.outputType);body.set('exportFormat',sample.body.exportFormat);body.set('context',JSON.stringify(sample.body.context));}else{headers['Content-Type']='application/json';body=JSON.stringify(sample.body);}
   const response=await fetch(origin+'/api/generate/'+sample.kind,{method:'POST',headers,body});report.admissionMs=Math.round(performance.now()-started);report.admissionStatus=response.status;const receipt=await response.json();assert.equal(response.status,202,JSON.stringify(receipt));
   let job;while(performance.now()-started<420000){job=(await (await fetch(origin+receipt.data.statusUrl)).json()).data;if(['completed','failed'].includes(job.status))break;await new Promise(resolve=>setTimeout(resolve,300));}
   report.totalMs=Math.round(performance.now()-started);report.jobStatus=job?.status;report.error=job?.error;assert.ok(job?.result,JSON.stringify(job?.error));const result=job.result;
   await fs.writeFile(path.join(root,sample.name+'-result.json'),JSON.stringify(result,null,2));report.resultStatus=result.status;report.imageValidation=result.imageValidation;report.timings=result.timings;report.warningCodes=(result.warnings||[]).map(w=>w.code);report.artifacts=[];
   if(sample.body.outputType==='presentation'){
    const pptx=await bytes(result.preview.downloads.pptx),zip=await JSZip.loadAsync(pptx,{checkCRC32:true});const slideFiles=Object.keys(zip.files).filter(name=>/^ppt\/slides\/slide\d+\.xml$/.test(name));
    const expected=sample.body.context.slideCount;assert.equal(slideFiles.length,expected);assert.equal(result.preview.slides.length,expected);report.slideCount=slideFiles.length;
    report.embeddedImages=Object.keys(zip.files).filter(name=>/^ppt\/media\//.test(name)).length;
    for(const slide of result.preview.slides){const buffer=await bytes(slide.url);assert.equal(buffer.subarray(0,4).toString('hex'),'89504e47');await fs.writeFile(path.join(root,sample.name+'-'+slide.slideNumber+'.png'),buffer);}
    const pdf=await bytes(result.preview.downloads.pdf);assert.equal(pdf.subarray(0,4).toString(),'%PDF');await fs.writeFile(path.join(root,sample.name+'.pptx'),pptx);await fs.writeFile(path.join(root,sample.name+'.pdf'),pdf);report.artifacts=['PPTX','PDF',`${expected} PNGs`];
   }else if(sample.body.outputType==='document'){
    for(const [format,url] of Object.entries(result.artifacts.downloads)){if(!url)continue;const buffer=await bytes(url);await fs.writeFile(path.join(root,sample.name+'.'+format),buffer);if(format==='docx')await JSZip.loadAsync(buffer,{checkCRC32:true});if(format==='pdf'){const parser=new PDFParse({data:buffer});try{const parsed=await parser.getText();assert.match(parsed.text,/water/i);report.pdfPages=parsed.total;}finally{await parser.destroy();}}report.artifacts.push(format);}
    await bytes(result.previewUrl);
   }else{
    const html=(await bytes(result.artifacts.siteUrl)).toString(),$=load(html),archive=await bytes(result.artifacts.downloadUrl),zip=await JSZip.loadAsync(archive,{checkCRC32:true});await bytes(result.artifacts.previewUrl);await fs.writeFile(path.join(root,sample.name+'.zip'),archive);
    report.images=$('img').length;report.technicalImageLabels=$('figcaption').toArray().map(node=>$(node).text()).filter(isAutomaticImageLabel);assert.equal(report.technicalImageLabels.length,0);
    report.imageMetadataChecks=[];
    for(const asset of result.generatedContent.visualAssets.credits||[]){
     const target=result.generatedContent.imageStrategy.plan.find(target=>target.role===asset.role&&(!target.sectionId||target.sectionId===asset.sectionId)&&(!target.itemTitle||target.itemTitle===asset.itemTitle));if(!target)continue;
     const check=reviewImageCandidate(asset.source==='Google Gemini'?{...asset,subject:target.query}:asset,target,{width:asset.width,height:asset.height});report.imageMetadataChecks.push({accepted:check.accepted,reason:check.reason,source:asset.source,alt:asset.alt});assert.equal(check.accepted,true,'Image metadata failed current placement checks');
    }
    for(const image of $('img').toArray()){const src=$(image).attr('src'),buffer=await bytes(new URL(src,new URL(result.artifacts.siteUrl,origin)).href);assert.deepEqual(buffer,await zip.file('my-website/'+src.replace(/^\.\//,'')).async('nodebuffer'));}
    for(const asset of ['style.css','script.js'])await bytes(new URL(asset,new URL(result.artifacts.siteUrl,origin)).href);
    browser??=await chromium.launch({headless:true,...(process.platform==='win32'?{channel:'msedge'}:{})});report.browser=[];
    for(const width of [1440,390]){const page=await browser.newPage({viewport:{width,height:1000},reducedMotion:'reduce'});await page.goto(origin+result.artifacts.siteUrl);await page.locator('img').evaluateAll(images=>Promise.all(images.map(image=>{image.loading='eager';return image.decode();})));const checked=await checkWebsiteBrowser(page);report.browser.push({width,...checked});await page.screenshot({path:path.join(root,sample.name+'-'+width+'.png'),fullPage:true});await page.close();assert.deepEqual(checked.failures,[]);}
    if(sample.name==='apex-webpage'){const text=$('main').text();for(const name of ['Ferrari','Lamborghini','Porsche','Rolls-Royce','Bentley','Mercedes-Benz','BMW'])assert.ok(text.includes(name),'Missing source-supplied name: '+name);}
    report.artifacts=['HTML preview','ZIP','local CSS/JS/images'];
   }
   report.artifactChecks='passed';
  }catch(error){report.totalMs=Math.round(performance.now()-started);report.artifactChecks='failed';report.failure=String(error.message).slice(0,1000);}
  reports.push(report);await fs.writeFile(path.join(root,'report.json'),JSON.stringify({reports},null,2));console.log('[SYSTEM_AUDIT]',JSON.stringify({name:report.name,ms:report.totalMs,status:report.resultStatus,artifactChecks:report.artifactChecks,failure:report.failure}));
 }
 const durations=reports.map(r=>r.totalMs).sort((a,b)=>a-b),percentile=p=>durations[Math.max(0,Math.ceil(durations.length*p)-1)];
 const summary={attempted:reports.length,artifactChecksPassed:reports.filter(r=>r.artifactChecks==='passed').length,complete:reports.filter(r=>r.artifactChecks==='passed'&&['completed','completed_with_warnings'].includes(r.resultStatus)).length,partial:reports.filter(r=>r.resultStatus==='partial_success').length,failed:reports.filter(r=>r.artifactChecks!=='passed').length,averageMs:Math.round(durations.reduce((a,b)=>a+b,0)/durations.length),medianMs:percentile(.5),p95Ms:percentile(.95),statisticalLimit:'Small controlled sample; p95 is descriptive only, not production reliability.'};
 await fs.writeFile(path.join(root,'report.json'),JSON.stringify({summary,reports},null,2));console.log('[SYSTEM_SUMMARY]',JSON.stringify(summary));
}finally{await browser?.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
