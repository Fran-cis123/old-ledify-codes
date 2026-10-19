import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {chromium} from 'playwright';
import JSZip from 'jszip';
const root='generated/pharmax-postman-retest';
const body=JSON.parse(await fs.readFile(root+'/response.json','utf8'));
const result=body.data.result,base='http://127.0.0.1:5000';
const preview=await fetch(base+result.artifacts.previewUrl);assert.equal(preview.status,200);
const download=await fetch(base+result.artifacts.downloadUrl);assert.equal(download.status,200);
const zip=await JSZip.loadAsync(Buffer.from(await download.arrayBuffer()));
assert.ok(zip.file('my-website/index.html'));assert.ok(Object.keys(zip.files).some(name=>name.endsWith('.webp')));
const browser=await chromium.launch({headless:true,...(process.platform==='win32'?{channel:'msedge'}:{})});
const report=[];
try{
    for(const width of [360,768,1440]){
        const context=await browser.newContext({viewport:{width,height:1000},reducedMotion:'reduce'}),page=await context.newPage(),errors=[];
        page.on('pageerror',error=>errors.push(error.message));await page.goto(base+result.artifacts.siteUrl);
        await page.locator('img').evaluateAll(images=>Promise.all(images.map(image=>{image.loading='eager';return image.decode();})));
        assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
        const images=await page.locator('img').count();assert.ok(images>0);assert.equal(await page.locator('img').evaluateAll(images=>images.filter(image=>!image.naturalWidth).length),0);
        const cta=page.getByRole('link',{name:/Explore Our Capabilities/i}).first();const href=await cta.getAttribute('href');assert.match(href,/^#section-\d+$/);assert.ok(await page.locator(href).count());
        await page.screenshot({path:root+`/desktop-${width}.png`,fullPage:true});await page.screenshot({path:root+`/hero-${width}.png`});
        assert.deepEqual(errors,[]);report.push({width,images,overflow:false,capabilitiesLink:href});await context.close();
    }
    await fs.writeFile(root+'/browser-report.json',JSON.stringify({previewHttp:200,downloadHttp:200,zip:true,report},null,2));console.log(JSON.stringify({previewHttp:200,downloadHttp:200,zip:true,report}));
}finally{await browser.close();}
