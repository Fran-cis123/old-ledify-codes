// Image-focused production pipeline checks: approved text fixtures avoid
// unrelated text-generation costs. The configured image provider is real.
import 'dotenv/config';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {load} from 'cheerio';
import JSZip from 'jszip';
import {chromium} from 'playwright';
import {createApp} from '../src/app.mjs';
import {generateService} from '../Service/generateService.mjs';
import {configuredImageProviders} from '../Service/visual/imageProviders.mjs';
import {imagePolicy} from '../Service/visual/imagePolicy.mjs';
import {websiteImageProviders} from '../Service/webpage/imageProviders.mjs';
import {fixtures,fixturePlan,fixtureDraft} from './webpage/fixtures.mjs';
import {imagerySamples} from './fixtures/presentationImagery.mjs';

const root=path.resolve('generated/image-reliability-live',new Date().toISOString().replace(/[:.]/g,'-'));await fs.mkdir(root,{recursive:true});
const env={...process.env,PRESENTATION_STOCK_PROVIDER:'none',PRESENTATION_IMAGE_RESOLUTION:'1K',PRESENTATION_ALLOW_IMAGE_GENERATION:'true',PRESENTATION_MAX_IMAGES:'1',PRESENTATION_MAX_GENERATED_IMAGES:'2',PRESENTATION_IMAGE_RETRIES:'1',PRESENTATION_IMAGE_CONCURRENCY:'1',PRESENTATION_IMAGE_DEADLINE_MS:'120000',PRESENTATION_IMAGE_ESTIMATED_UNIT_COST:'1',PRESENTATION_IMAGE_MAX_ESTIMATED_COST:'2'};
const providers=configuredImageProviders(env),webProviders=websiteImageProviders(env).filter(p=>p.id==='gemini-image');
const fixture=fixtures.pharmaceutical,plan=fixturePlan(fixture),draft=fixtureDraft(fixture);
const web={outputType:'webpage',...plan,...draft,sections:draft.sections.map(s=>({...s,composition:'editorial'})),imagePlan:[{role:'hero',sectionIndex:0,itemIndex:0,subject:'Unbranded pharmaceutical research laboratory, soft daylight, conceptual scientific equipment',alt:'Conceptual laboratory illustration',aspectRatio:'16:9'}]};
const deck=structuredClone(imagerySamples.find(s=>s.name==='pharmaceutical').presentation);deck.slides=deck.slides.slice(0,1);
const records=[];let latestSite;
const app=createApp({model:{create:async v=>({...v,_id:'image-live-check',save:async()=>{}})},generator:async(kind,input,type,context)=>generateService(kind,input,type,context,{completedContent:{inputType:kind,input,outputType:type,generatedContent:structuredClone(type==='webpage'?web:deck)},visuals:{providers,policy:imagePolicy(env),cacheRoot:path.join(root,'presentation-cache'),diagramPlanner:false},webpageAssets:{providers:webProviders,curated:false,policy:{maxAssets:1,maxGenerated:2,retries:1,concurrency:1,timeoutMs:60000,totalMs:120000},optimization:{cacheRoot:path.join(root,'web-cache')}}})});
const server=app.listen(0,'127.0.0.1');await once(server,'listening');const base=`http://127.0.0.1:${server.address().port}`;
try{
 for(let cycle=1;cycle<=3;cycle++)for(const type of ['webpage','presentation']){
  const started=performance.now();let record={cycle,type,model:env.GOOGLE_IMAGE_MODEL};
  try{
   const response=await fetch(base+'/api/generate/textPrompt',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({textPrompt:'Use a required laboratory hero image.',outputType:type})}),body=await response.json();
   record.httpStatus=response.status;record.status=body.data?.result?.status;assert.equal(response.status,201,JSON.stringify({errorCode:body.errorCode,stage:body.stage,imageValidation:body.data?.result?.imageValidation}));
   const result=body.data.result;assert.equal(result.imageValidation.status,'passed');
   await fs.writeFile(path.join(root,`${type}-${cycle}.json`),JSON.stringify(result,null,2));
   if(type==='webpage'){
    latestSite=base+result.artifacts.siteUrl;const html=await (await fetch(latestSite)).text(),$=load(html),images=$('img').toArray();assert.ok(images.length);
    const archive=await fetch(base+result.artifacts.downloadUrl);assert.equal(archive.status,200);const zip=await JSZip.loadAsync(await archive.arrayBuffer(),{checkCRC32:true});
    const urls=new Set();for(const element of images){urls.add($(element).attr('src'));for(const src of ($(element).attr('srcset')||'').split(',').filter(Boolean))urls.add(src.trim().split(/\s+/)[0]);}
    for(const url of urls){const asset=await fetch(new URL(url,latestSite));assert.equal(asset.status,200);assert.match(asset.headers.get('content-type'),/^image\//);const bytes=Buffer.from(await asset.arrayBuffer());assert.deepEqual(bytes,await zip.file('my-website/'+url.replace(/^\.\//,'')).async('nodebuffer'));}
    record.imageResponses=urls.size;record.zipImagesVerified=true;record.cacheHits=result.generatedContent.visualAssets.credits.filter(a=>a.cacheHit).length;
   }else{
    const downloaded=await fetch(base+result.preview.downloads.pptx);assert.equal(downloaded.status,200);const zip=await JSZip.loadAsync(await downloaded.arrayBuffer(),{checkCRC32:true});assert.ok(Object.keys(zip.files).some(n=>/^ppt\/media\//.test(n)));
    assert.equal(result.preview.quality.preview.images.photographs,1);
    const pdf=await fetch(base+result.preview.downloads.pdf);assert.equal(pdf.status,200);assert.ok(Buffer.from(await pdf.arrayBuffer()).subarray(0,4).toString()==='%PDF');
    const png=await fetch(base+result.preview.slides[0].url);assert.equal(png.status,200);const bytes=Buffer.from(await png.arrayBuffer());assert.equal(bytes.subarray(0,8).toString('hex'),'89504e470d0a1a0a');await fs.writeFile(path.join(root,`presentation-${cycle}.png`),bytes);
    record.embeddedAndRendered=true;record.cacheHits=result.generatedContent.visualQuality.diagnostics.filter(d=>d.cacheHit).length;
   }
   record.passed=true;
  }catch(error){record.passed=false;record.error=String(error.message).slice(0,800);}
  record.elapsedMs=Math.round(performance.now()-started);records.push(record);console.log('[IMAGE RELIABILITY LIVE]',JSON.stringify(record));await fs.writeFile(path.join(root,'report.json'),JSON.stringify({root,model:env.GOOGLE_IMAGE_MODEL,scope:'Approved text fixtures; real configured image provider, actual renderers and HTTP delivery. Repeated cycles intentionally test validated caches.',records},null,2));
 }
 if(latestSite){const browser=await chromium.launch({headless:true,...(process.platform==='win32'?{channel:'msedge'}:{})});try{for(const width of [1440,390]){const page=await browser.newPage({viewport:{width,height:1000},reducedMotion:'reduce'});await page.goto(latestSite);await page.locator('img').evaluateAll(images=>Promise.all(images.map(image=>{image.loading='eager';return image.decode();})));assert.equal(await page.locator('img').evaluateAll(images=>images.some(i=>!i.complete||!i.naturalWidth)),false);await page.screenshot({path:path.join(root,`webpage-${width}.png`),fullPage:true});await page.close();}}finally{await browser.close();}}
 console.log(JSON.stringify({root,passed:records.filter(r=>r.passed).length,total:records.length}));if(records.some(r=>!r.passed))process.exitCode=1;
}finally{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
