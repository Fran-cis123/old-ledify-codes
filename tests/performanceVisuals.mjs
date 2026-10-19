import fs from 'node:fs/promises';
import path from 'node:path';
import express from 'express';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import {chromium} from 'playwright';
import {createGenerationRouter} from '../route/generateRoute.mjs';
const root=path.resolve('generated/performance/after'),shots=path.join(root,'screenshots');await fs.mkdir(shots,{recursive:true});
const app=express();app.use('/api',createGenerationRouter({generator:async()=>{throw new Error('No AI in visual QA');}}));
const server=await new Promise(resolve=>{const s=app.listen(0,'127.0.0.1',()=>resolve(s));}),base=`http://127.0.0.1:${server.address().port}`;
let browser;
try{
    browser=await chromium.launch({headless:true,...(process.platform==='win32'?{channel:'msedge'}:{})});
    const web=JSON.parse(await fs.readFile(path.join(root,'webpage-result.json'),'utf8')),doc=JSON.parse(await fs.readFile(path.join(root,'document-result.json'),'utf8')),deck=JSON.parse(await fs.readFile(path.join(root,'presentation-result.json'),'utf8')),checks=[];
    for(const [type,width,url] of [['website',1440,web.artifacts.siteUrl],['website',390,web.artifacts.siteUrl],['document',1100,doc.artifacts.previewUrl]]){
        const page=await browser.newPage({viewport:{width,height:1000},reducedMotion:'reduce'});
        await page.goto(base+url,{waitUntil:'networkidle'});
        await page.locator('img').evaluateAll(images=>Promise.all(images.map(image=>{image.loading='eager';return image.decode().catch(()=>{});})));await page.waitForTimeout(100);
        const result=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth+1,brokenImages:[...document.images].filter(i=>!i.naturalWidth).length,textCharacters:document.body.textContent.length,images:document.images.length}));
        assert.equal(result.brokenImages,0);assert.ok(result.textCharacters>300);if(type==='website')assert.equal(result.overflow,false);
        await page.screenshot({path:path.join(shots,`${type}-${width}.png`),fullPage:true});checks.push({type,width,...result});await page.close();
    }
    const layers=await Promise.all(deck.preview.slides.map(async(slide,i)=>({input:await sharp(slide.filePath).resize(640,360).png().toBuffer(),left:i%2*650,top:Math.floor(i/2)*370})));
    await sharp({create:{width:1290,height:1840,channels:3,background:'#333333'}}).composite(layers).jpeg({quality:85}).toFile(path.join(shots,'presentation-contact-sheet.jpg'));
    await fs.writeFile(path.join(root,'visual-checks.json'),JSON.stringify(checks,null,2));console.log(JSON.stringify({checks,screenshots:shots}));
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
