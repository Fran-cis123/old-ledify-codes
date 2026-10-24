import 'dotenv/config';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {chromium} from 'playwright';
import JSZip from 'jszip';
import {load} from 'cheerio';
import {createApp} from '../src/app.mjs';
import {generateService} from '../Service/generateService.mjs';
const root=path.resolve('generated/image-relevance-live',new Date().toISOString().replace(/[:.]/g,'-'));
await fs.mkdir(root,{recursive:true});
const server=createApp({model:{create:async value=>({...value,_id:'image-relevance-live',save:async()=>{}})},webpageRoot:path.join(root,'webpages'),
 generator:(kind,input,output,context,options)=>generateService(kind,input,output,context,{...options,artifacts:{root:path.join(root,'webpages')}})
}).listen(0,'127.0.0.1');await once(server,'listening');
const base=`http://127.0.0.1:${server.address().port}`;let browser;
try{
 const response=await fetch(base+'/api/generate/urlPrompt',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({urlPrompt:'https://en.wikipedia.org/wiki/Artificial_intelligence',outputType:'webpage'})});
 const result=await response.json();await fs.writeFile(path.join(root,'response.json'),JSON.stringify(result,null,2));
 assert.equal(response.status,201,JSON.stringify(result));const data=result.data.result,hero=data.generatedContent.visualAssets.hero;
 assert.ok(hero,'The regenerated website must contain an actual AI image');
 assert.ok(!/pipett|CDC scientist/i.test([hero.alt,hero.subject,hero.sourceUrl].join(' ')));
 const preview=await fetch(base+data.artifacts.previewUrl);assert.equal(preview.status,200);
 const site=base+data.artifacts.siteUrl,html=await (await fetch(site)).text(),$=load(html);
 const zipBytes=Buffer.from(await (await fetch(base+data.artifacts.downloadUrl)).arrayBuffer());await fs.writeFile(path.join(root,'website.zip'),zipBytes);
 const zip=await JSZip.loadAsync(zipBytes,{checkCRC32:true});const images=[];
 for(const el of $('img').toArray()){
  const src=$(el).attr('src'),image=await fetch(new URL(src,site));assert.equal(image.status,200);
  const bytes=Buffer.from(await image.arrayBuffer());assert.deepEqual(bytes,await zip.file('my-website/'+src.replace(/^\.\//,'')).async('nodebuffer'));
  await fs.writeFile(path.join(root,path.basename(src)),bytes);images.push({src,alt:$(el).attr('alt'),bytes:bytes.length});
 }
 browser=await chromium.launch({headless:true,channel:'msedge'});
 for(const width of [1440,390]){const page=await browser.newPage({viewport:{width,height:1000},reducedMotion:'reduce'});await page.goto(site);await page.locator('img').evaluateAll(images=>Promise.all(images.map(image=>{image.loading='eager';return image.decode();})));await page.screenshot({path:path.join(root,`website-${width}.png`),fullPage:true});await page.close();}
 await fs.writeFile(path.join(root,'report.json'),JSON.stringify({status:'artifact-checks-passed',root,images,hero:{source:hero.source,alt:hero.alt,model:hero.model,review:hero.review},timings:data.timings,visualReview:'pending human inspection'},null,2));
 console.log('[RELEVANCE_LIVE]',JSON.stringify({root,images:images.length,source:hero.source,status:'artifact-checks-passed'}));
}finally{await browser?.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
