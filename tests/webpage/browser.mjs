import 'dotenv/config';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import express from 'express';
import JSZip from 'jszip';
import { createGenerationRouter } from '../../route/generateRoute.mjs';
import { resolveWebpageAssets } from '../../Service/webpageAssetService.mjs';
import { webpageRenderer } from '../../renderer/webpage/webpageRenderer.mjs';
import { webpageArtifactService } from '../../Service/webpageArtifactService.mjs';
import { createCanvas } from '@napi-rs/canvas';
import AxeBuilder from '@axe-core/playwright';
const require = createRequire(import.meta.url);
let playwright;
try { playwright = require(process.env.LEDIFY_PLAYWRIGHT_MODULE || 'playwright'); }
catch { playwright = require(path.join(os.homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')); }
const browser = await playwright.chromium.launch({ headless: true, ...(process.platform === 'win32' ? { channel: process.env.PLAYWRIGHT_CHANNEL || 'msedge' } : {}) });
const root = path.resolve('generated/webpage-samples');
const manifest = JSON.parse(await fs.readFile(path.join(root, 'manifest.json'), 'utf8'));
assert.ok(manifest.length >= 10, 'Complete all ten industry samples before browser verification');
const app = express(); app.use('/api', createGenerationRouter());
const server = await new Promise(resolve => { const s = app.listen(0, '127.0.0.1', () => resolve(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const results = [];
const onlyIndex=process.argv.indexOf('--only'),only=onlyIndex>=0?process.argv.slice(onlyIndex+1):[];
const reportName=only.length?'browser-verification-selected.json':'browser-verification.json';
for(const name of only)assert.ok(manifest.some(entry=>entry.name===name),'Unknown sample '+name);
try {
    for (const entry of manifest.filter(entry=>!only.length||only.includes(entry.name))) {
        const response = await fetch(base + entry.artifacts.downloadUrl);
        assert.equal(response.status, 200);
        const archive = Buffer.from(await response.arrayBuffer());
        assert.deepEqual(archive, await fs.readFile(entry.artifacts.files.zipPath));
        const zip = await JSZip.loadAsync(archive), extracted = path.join(entry.directory, 'extracted');
        await fs.mkdir(extracted, { recursive: true });
        for (const [name, file] of Object.entries(zip.files)) {
            if (file.dir) continue;
            assert.ok(name.startsWith('my-website/') && !name.includes('..') && !name.includes('\\'));
            const destination = path.resolve(extracted, name);
            assert.ok(destination.startsWith(extracted + path.sep));
            await fs.mkdir(path.dirname(destination), { recursive: true });
            await fs.writeFile(destination, await file.async('nodebuffer'));
        }
        const screenshots = path.join(entry.directory, 'screenshots'); await fs.mkdir(screenshots, { recursive: true });
        const report = { name: entry.name, mode: entry.mode, fileProtocol: true, widths: [] };
        for (const [name, width, height] of [['desktop', 1440, 1000], ['laptop', 1024, 900], ['tablet', 768, 1024], ['mobile', 375, 812], ['small-mobile',360,800]]) {
            const context = await browser.newContext({ viewport: { width, height }, reducedMotion: 'reduce', offline: true });
            const page = await context.newPage(); const errors = [], requests = [];
            page.on('pageerror', error => errors.push(error.message));
            page.on('console', message => { if (['error','warning'].includes(message.type())) errors.push(message.text()); });
            page.on('request', request => { if (/^https?:/.test(request.url())) requests.push(request.url()); });
            await page.goto(pathToFileURL(path.join(extracted, 'my-website/index.html')).href);
            await page.locator('img').evaluateAll(images => Promise.all(images.map(image => image.decode())));
            const geometry = await page.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth,
                h1: getComputedStyle(document.querySelector('h1')).fontSize,
                bodyFont: getComputedStyle(document.body).fontSize,
                failedImages: [...document.images].filter(image => !image.complete || !image.naturalWidth).length,
                clipped: [...document.querySelectorAll('main p,main h1,main h2,main h3')].filter(node=>node.scrollHeight>node.clientHeight+2 && ['hidden','clip'].includes(getComputedStyle(node).overflowY)).length,
                overlaps: (()=>{const nodes=[...document.querySelectorAll('.header .brand,.header .menu-toggle,.header .nav a,.hero h1,.hero-description,.hero-actions')].filter(node=>node.getClientRects().length);const pairs=[];for(let i=0;i<nodes.length;i++)for(let j=i+1;j<nodes.length;j++){const a=nodes[i],b=nodes[j];if(a.contains(b)||b.contains(a))continue;const x=a.getBoundingClientRect(),y=b.getBoundingClientRect();if(Math.min(x.right,y.right)-Math.max(x.left,y.left)>2&&Math.min(x.bottom,y.bottom)-Math.max(x.top,y.top)>2)pairs.push([a.className,b.className]);}return pairs;})(),
                outside: [...document.querySelectorAll('main p,main h1,main h2,main h3,main article')].filter(node => { const box = node.getBoundingClientRect(); return box.right > innerWidth + 1 || box.left < -1; }).map(node => node.tagName) }));
            assert.ok(geometry.scroll <= geometry.width + 1, `${entry.name}/${name}: horizontal overflow`);
            assert.equal(geometry.failedImages, 0); assert.deepEqual(geometry.outside, []);
            if(['pharmaceutical','restaurant','realestate','legal','school'].includes(entry.name))assert.ok(await page.locator('img').count()>0,`${entry.name}: required illustrative photography must actually be present`);
            assert.equal(geometry.clipped,0,'No clipped content');
            assert.deepEqual(geometry.overlaps,[],'No overlap between navigation and hero content controls');
            assert.ok(parseFloat(geometry.bodyFont)>=16,'Body text remains readable');
            assert.ok(parseFloat(geometry.h1)<=84,'Headline size remains controlled');
            assert.ok(parseFloat(geometry.h1) >= 32, 'Stylesheet must load offline');
            if(name==='desktop'||name==='mobile'){
                const accessibility=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).options({preload:false}).analyze();
                const failures=accessibility.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>n.target)}));
                await fs.writeFile(path.join(screenshots,`${name}-accessibility.json`),JSON.stringify(failures,null,2));
                assert.deepEqual(failures,[],`${entry.name}/${name}: WCAG accessibility violations`);
            }
            await page.keyboard.press('Tab');
            assert.equal(await page.locator('.skip').evaluate(node=>node===document.activeElement),true,'Keyboard users can skip navigation');
            assert.notEqual(await page.locator('.skip').evaluate(node=>getComputedStyle(node).outlineStyle),'none','Keyboard focus remains visible');
            if (width <= 820) {
                const toggle = page.locator('.menu-toggle'); await toggle.click();
                assert.equal(await toggle.getAttribute('aria-expanded'), 'true'); assert.ok(await page.locator('.nav').isVisible());
                await page.keyboard.press('Escape'); assert.equal(await toggle.getAttribute('aria-expanded'), 'false');
                await toggle.click(); await page.locator('.nav a').first().click(); assert.equal(await toggle.getAttribute('aria-expanded'), 'false');
            }
            if (await page.locator('details').count()) {
                const summary = page.locator('details summary').first(); await summary.click();
                assert.equal(await page.locator('details').first().getAttribute('open'), '');
            }
            for(const collection of await page.locator('[data-collection]').all()){
                const count=await collection.locator('[data-collection-item]').count();
                if(await collection.locator('[data-search]').count()){
                    await collection.locator('[data-search]').fill('no matching phrase anywhere');
                    assert.equal(await collection.locator('[data-collection-item]:visible').count(),0);
                    assert.match(await collection.locator('[data-status]').textContent(),/Try another/);
                    await collection.locator('[data-search]').fill('');assert.equal(await collection.locator('[data-collection-item]:visible').count(),count);
                }
                if(await collection.locator('[data-filter]').count()){
                    await collection.locator('[data-filter]').selectOption({index:1});
                    assert.equal(await collection.locator('[data-collection-item]:visible').count(),1);
                    await collection.locator('[data-filter]').selectOption('');
                }
            }
            if(await page.locator('[data-gallery-open]').count()){
                const trigger=page.locator('[data-gallery-open]').first();await trigger.click();
                await page.locator('.image-dialog img').evaluate(image=>image.decode());assert.ok(await page.locator('.image-dialog').isVisible());
                await page.keyboard.press('Escape');assert.equal(await page.locator('.image-dialog').isVisible(),false);assert.ok(await trigger.evaluate(node=>node===document.activeElement));
            }
            await page.evaluate(() => scrollTo(0, 0));
            await page.evaluate(()=>document.activeElement?.blur());
            await page.screenshot({ path: path.join(screenshots, `${name}.png`), fullPage: true });
            if (name === 'desktop') await page.screenshot({ path: path.join(screenshots, 'desktop-hero.png') });
            assert.deepEqual(errors, [], `${entry.name}/${name}: console errors/warnings`); assert.deepEqual(requests, [], 'Essential rendering must remain offline');
            report.widths.push({ name, width, ...geometry }); await context.close();
        }
        const nojs = await browser.newContext({ viewport: { width: 390, height: 844 }, javaScriptEnabled: false, offline: true });
        const fallback = await nojs.newPage(); await fallback.goto(pathToFileURL(path.join(extracted, 'my-website/index.html')).href);
        assert.ok(await fallback.locator('.nav a').first().isVisible(), 'Navigation must remain usable without JS'); await nojs.close();
        const online = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
        const preview = await online.newPage(); const previewErrors = [];
        preview.on('pageerror', error => previewErrors.push(error.message));
        preview.on('console', message => { if (message.type() === 'error') previewErrors.push(message.text()); });
        await preview.goto(base + entry.artifacts.previewUrl);
        const frame = preview.frameLocator('iframe'); await frame.locator('h1').waitFor();
        await preview.getByRole('button', { name: 'Mobile', exact: true }).click();
        assert.equal(Math.round((await preview.locator('iframe').boundingBox()).width), 390);
        await preview.getByRole('button',{name:'Tablet',exact:true}).click();
        assert.equal(Math.round((await preview.locator('iframe').boundingBox()).width),768);
        await preview.getByRole('button',{name:'Desktop',exact:true}).click();
        assert.equal(Math.round((await preview.locator('iframe').boundingBox()).width),1280);
        await preview.setViewportSize({width:375,height:812});
        assert.equal(Math.round((await preview.locator('iframe').boundingBox()).width),1280,'Desktop keeps its real viewport on a narrow preview host');
        await preview.getByRole('button',{name:'Mobile',exact:true}).click();
        await frame.locator('.menu-toggle').click(); assert.equal(await frame.locator('.menu-toggle').getAttribute('aria-expanded'), 'true');
        const isolation = await frame.locator('body').evaluate(() => {
            let parentDenied = false, storageDenied = false;
            try { void parent.document.body; } catch { parentDenied = true; }
            try { localStorage.setItem('test', 'value'); } catch { storageDenied = true; }
            return { parentDenied, storageDenied };
        });
        assert.deepEqual(isolation, { parentDenied: true, storageDenied: true });
        const external = frame.locator('a[href^="mailto:"],a[href^="https://"],a[href^="tel:"]').filter({visible:true}).first();
        if (await external.count()) {
            await external.click();
            assert.ok(await frame.locator('.preview-notice').isVisible(), 'Sandboxed links explain how to use the downloaded site');
            await frame.locator('.preview-notice button').click();
            assert.equal(await frame.locator('.preview-notice').isVisible(), false);
        }
        assert.deepEqual(previewErrors, [], 'Preview CSP/assets must work without console errors');
        await preview.screenshot({ path: path.join(screenshots, 'isolated-preview.png') });
        await online.close();
        report.previewIsolation = isolation; results.push(report);
        await fs.writeFile(path.join(root, reportName), JSON.stringify(results, null, 2));
        console.log(`[BROWSER PASS] ${entry.name}: extracted ZIP offline at desktop/tablet/mobile; navigation, FAQ, no-JS fallback and isolated preview`);
    }
    // A deliberately artificial test image exercises the actual image path;
    // it is not included in the seven design samples or presented as stock photography.
    const imageRoot=path.join(root,'image-loading-test');await fs.mkdir(imageRoot,{recursive:true});
    const canvas=createCanvas(320,240),paint=canvas.getContext('2d');paint.fillStyle='#163f51';paint.fillRect(0,0,320,240);
    await fs.writeFile(path.join(imageRoot,'test.png'),canvas.toBuffer('image/png'));
    const manifestPath=path.join(imageRoot,'catalog.json');
    await fs.writeFile(manifestPath,JSON.stringify([{industry:'healthcare',role:'hero',file:'test.png',alt:'Automated image loading test',creator:'Ledify tests',license:'Original test fixture'}]));
    const saved=JSON.parse(await fs.readFile(path.join(root,'pharmaceutical','fixture-result.json'),'utf8'));
    const resolved=await resolveWebpageAssets(saved.generatedContent,{manifestPath,strict:true});
    const artifact=await webpageArtifactService(webpageRenderer(resolved.page,resolved.assets));
    const imageContext=await browser.newContext({viewport:{width:375,height:812}});
    try{
        const imagePage=await imageContext.newPage();await imagePage.goto(base+artifact.previewUrl);
        const img=imagePage.frameLocator('iframe').locator('img');await img.evaluate(node=>node.decode());assert.equal(await img.getAttribute('alt'),'Automated image loading test');
        assert.equal(await img.evaluate(node=>node.naturalWidth),320);
        await imageContext.setOffline(true);await imagePage.goto(pathToFileURL(path.join(artifact.files.siteDirectory,'index.html')).href);
        await imagePage.locator('img').evaluate(node=>node.decode());assert.equal(await imagePage.locator('img').evaluate(node=>node.naturalWidth),320);
        console.log('[BROWSER PASS] licensed local image delivery in sandbox and offline website');
    }finally{await imageContext.close();}
    const original=JSON.parse(await fs.readFile(path.join(root,'pharmaceutical','fixture-result.json'),'utf8'));
    original.generatedContent.websiteBrief.project.pages=['home','about','services','contact'];
    const imageFiles={};for(const filename of original.artifacts.validation.files.filter(name=>name.startsWith('assets/images/')))imageFiles[filename]=await fs.readFile(path.join(original.artifacts.files.siteDirectory,filename));
    const multipage=await webpageArtifactService(webpageRenderer(original.generatedContent,imageFiles));
    const navigationContext=await browser.newContext({viewport:{width:1440,height:1000}});
    try{
        const navigationPage=await navigationContext.newPage();await navigationPage.goto(base+multipage.previewUrl);
        const frame=navigationPage.frameLocator('iframe');await frame.getByRole('link',{name:'About',exact:true}).click();assert.equal(await frame.locator('h1').textContent(),'About');
        await frame.getByRole('link',{name:'Contact',exact:true}).click();assert.equal(await frame.locator('h1').textContent(),'Contact');
        await navigationContext.setOffline(true);await navigationPage.goto(pathToFileURL(path.join(multipage.files.siteDirectory,'index.html')).href);
        await navigationPage.getByRole('link',{name:'Services',exact:true}).first().click();assert.equal(await navigationPage.locator('h1').textContent(),'Services');
        await fs.writeFile(path.join(root,'browser-extra-checks.json'),JSON.stringify({licensedImageSandbox:true,licensedImageOffline:true,multiPageSandbox:true,multiPageOffline:true},null,2));
        console.log('[BROWSER PASS] multi-page navigation inside the sandbox and in downloaded source');
    }finally{await navigationContext.close();}
} finally { await browser.close(); server.close(); }
