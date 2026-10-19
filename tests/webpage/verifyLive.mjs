import 'dotenv/config';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import express from 'express';
import {chromium} from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import {createGenerationRouter} from '../../route/generateRoute.mjs';
const name=process.argv[2]||'event',root=path.resolve('generated/webpage-universal-live',name);
const result=JSON.parse(await fs.readFile(path.join(root,'result.json'),'utf8'));
const browser=await chromium.launch({headless:true,...(process.platform==='win32'?{channel:process.env.PLAYWRIGHT_CHANNEL||'msedge'}:{})});
const app=express();app.use('/api',createGenerationRouter());const server=await new Promise(resolve=>{const instance=app.listen(0,'127.0.0.1',()=>resolve(instance));});
const base=`http://127.0.0.1:${server.address().port}`,report=[];
try{
    for(const width of [360,768,1440]){
        const context=await browser.newContext({viewport:{width,height:1000},reducedMotion:'reduce'});const page=await context.newPage();const errors=[];page.on('pageerror',error=>errors.push(error.message));
        await page.goto(base+result.artifacts.siteUrl);await page.locator('img').evaluateAll(images=>Promise.all(images.map(image=>{image.loading='eager';return image.decode();})));
        assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
        assert.equal(await page.locator('img').evaluateAll(images=>images.filter(image=>!image.complete||!image.naturalWidth).length),0);
        const axe=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).options({preload:false}).analyze();
        assert.deepEqual(axe.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)})),[]);
        for(const collection of await page.locator('[data-collection]').all())if(await collection.locator('[data-search]').count()){await collection.locator('[data-search]').fill('no matches expected');assert.equal(await collection.locator('[data-collection-item]:visible').count(),0);await collection.locator('[data-search]').fill('');}
        if(await page.locator('[data-gallery-open]').count()){await page.locator('[data-gallery-open]').first().click();assert.ok(await page.locator('.image-dialog').isVisible());await page.keyboard.press('Escape');}
        await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));await page.screenshot({path:path.join(root,`desktop-${width}.png`),fullPage:true});await page.screenshot({path:path.join(root,`hero-${width}.png`)});
        assert.deepEqual(errors,[]);report.push({width,images:await page.locator('img').count(),axeViolations:axe.violations.length,overflow:false});await context.close();
    }
    const page=await browser.newPage();const response=await page.goto(base+result.artifacts.previewUrl);assert.equal(response.status(),200);await page.frameLocator('iframe').locator('h1').waitFor();
    const download=await fetch(base+result.artifacts.downloadUrl);assert.equal(download.status,200);assert.deepEqual(Buffer.from(await download.arrayBuffer()),await fs.readFile(result.artifacts.files.zipPath));
    await fs.writeFile(path.join(root,'browser-report.json'),JSON.stringify({report,preview:true,zip:true},null,2));console.log(JSON.stringify({name,report,preview:true,zip:true}));
}finally{await browser.close();server.close();}
