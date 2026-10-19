import 'dotenv/config';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import express from 'express';
import {chromium} from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import {createGenerationRouter} from '../../route/generateRoute.mjs';
import {internalCopy} from '../../Service/webpage/contentSpecification.mjs';
const root=path.resolve('generated/webpage-quality-live'),manifest=JSON.parse(await fs.readFile(path.join(root,'manifest.json'),'utf8'));
assert.equal(manifest.length,6);
const app=express();app.use('/api',createGenerationRouter());const server=await new Promise(resolve=>{const instance=app.listen(0,'127.0.0.1',()=>resolve(instance));});
const base=`http://127.0.0.1:${server.address().port}`,browser=await chromium.launch({headless:true,...(process.platform==='win32'?{channel:'msedge'}:{})}),report=[];
try{
    for(const entry of manifest){
        const saved=JSON.parse(await fs.readFile(path.join(entry.directory,'result.json'),'utf8'));
        const preview=await fetch(base+entry.artifacts.previewUrl);assert.equal(preview.status,200);
        const download=await fetch(base+entry.artifacts.downloadUrl);assert.equal(download.status,200);assert.deepEqual(Buffer.from(await download.arrayBuffer()),await fs.readFile(entry.artifacts.files.zipPath));
        const cases=[];
        for(const width of [360,768,1440]){
            const context=await browser.newContext({viewport:{width,height:1000},reducedMotion:'reduce'}),page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
            await page.goto(base+entry.artifacts.siteUrl);await page.locator('img').evaluateAll(images=>Promise.all(images.map(image=>{image.loading='eager';return image.decode();})));
            assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,entry.name+' overflow');
            assert.equal(internalCopy.test(await page.locator('main').innerText()),false,entry.name+' internal copy');
            const axe=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).options({preload:false}).analyze();
            assert.deepEqual(axe.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)})),[],entry.name+'/'+width);
            assert.equal(await page.locator('img').evaluateAll(images=>images.filter(image=>!image.naturalWidth).length),0);
            if(width===360){const toggle=page.locator('.menu-toggle');await toggle.click();assert.equal(await toggle.getAttribute('aria-expanded'),'true');await page.keyboard.press('Escape');}
            const imageIds=saved.generatedContent.visualAssets.credits.map(asset=>asset.assetId);assert.equal(new Set(imageIds).size,imageIds.length);
            await page.screenshot({path:path.join(entry.directory,`viewport-${width}.png`),fullPage:true});await page.screenshot({path:path.join(entry.directory,`hero-${width}.png`)});
            assert.deepEqual(errors,[]);cases.push({width,axeViolations:0,overflow:false,images:await page.locator('img').count()});await context.close();
        }
        report.push({name:entry.name,cases,preview:true,zip:true});await fs.writeFile(path.join(root,'browser-report.json'),JSON.stringify(report,null,2));console.log('[QUALITY BROWSER PASS] '+entry.name);
    }
}finally{await browser.close();server.close();}
