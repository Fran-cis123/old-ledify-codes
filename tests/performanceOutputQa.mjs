import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import JSZip from 'jszip';
import {chromium} from 'playwright';
import {createApp} from '../src/app.mjs';
import {once} from 'node:events';
import assert from 'node:assert/strict';

const root=path.resolve('generated/performance-audit'),checks=[];
for(const [phase,name] of [['optimized','presentation10'],['optimized-rerun','presentation12']]){
 const result=JSON.parse(await fs.readFile(path.join(root,phase,name+'-result.json'),'utf8'));
 const directory=path.resolve('generated/previews',result.preview.previewId),zip=await JSZip.loadAsync(await fs.readFile(path.join(directory,'presentation.pptx')));
 assert.equal(result.preview.slideCount,name==='presentation10'?10:12);assert.equal(result.preview.previewCount,result.preview.slideCount);
 const media=Object.keys(zip.files).filter(n=>/^ppt\/media\/[^/]+$/.test(n));
 const tiles=await Promise.all(result.preview.slides.map((slide,i)=>sharp(path.join(directory,'slides',slide.fileName)).resize(400,225).png().toBuffer().then(input=>({input,left:i%3*400,top:Math.floor(i/3)*225}))));
 await sharp({create:{width:1200,height:Math.ceil(tiles.length/3)*225,channels:3,background:'#eeeeee'}}).composite(tiles).png().toFile(path.join(root,name+'-contact-sheet.png'));
 checks.push({name,slides:result.preview.previewCount,photographs:result.generatedContent.visualQuality.actual,embeddedMedia:media.length,warnings:result.warnings.map(w=>w.code)});
}
const app=createApp({generator:async()=>{throw new Error('QA must not generate');}}),server=app.listen(0,'127.0.0.1');await once(server,'listening');
let browser;
try{
 browser=await chromium.launch({headless:true,...(process.platform==='win32'?{channel:'msedge'}:{})});
 for(const name of ['webpage','document']) {
  const result=JSON.parse(await fs.readFile(path.join(root,'optimized',name+'-result.json'),'utf8'));
  if(name==='document'){
   const zip=await JSZip.loadAsync(await fs.readFile(path.resolve('generated/documents',result.artifacts.id,'document.docx')));assert.ok(zip.file('word/document.xml'));assert.ok(result.generatedContent.length.actualWords>=800);
  }
  for(const width of [1440,390]) {
   const page=await browser.newPage({viewport:{width,height:950},reducedMotion:'reduce'});
   await page.goto(`http://127.0.0.1:${server.address().port}${result.artifacts.previewUrl}`,{waitUntil:'networkidle'});
   if(name==='webpage'&&width===390)await page.locator('button[data-size="mobile"]').click();
   // Website preview contains the generated site in its isolated frame.
   const frame=page.frames().find(frame=>frame.url().includes('/site/'))||page.mainFrame();
   await frame.locator('img').evaluateAll(images=>Promise.all(images.map(image=>{image.loading='eager';return image.decode().catch(()=>{});})));
   const measured=await frame.evaluate(()=>({viewportWidth:innerWidth,images:document.images.length,brokenImages:[...document.images].filter(i=>!i.complete||!i.naturalWidth).length,horizontalOverflow:document.documentElement.scrollWidth>innerWidth+2}));
   if(name==='webpage'&&width===390)assert.equal(measured.viewportWidth,390);
   assert.equal(measured.brokenImages,0);if(name==='webpage')assert.equal(measured.horizontalOverflow,false);
   await page.screenshot({path:path.join(root,`${name}-${width}.png`),fullPage:true});checks.push({name,width,...measured});await page.close();
  }
 }
 await fs.writeFile(path.join(root,'output-qa.json'),JSON.stringify(checks,null,2));console.log(JSON.stringify(checks));
}finally{await browser?.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
