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
const require = createRequire(import.meta.url);
let playwright;
try { playwright = require(process.env.LEDIFY_PLAYWRIGHT_MODULE || 'playwright'); }
catch { playwright = require(path.join(os.homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')); }
const browser = await playwright.chromium.launch({ headless: true, ...(process.platform === 'win32' ? { channel: process.env.PLAYWRIGHT_CHANNEL || 'msedge' } : {}) });
const root = path.resolve('generated/webpage-samples');
const manifest = JSON.parse(await fs.readFile(path.join(root, 'manifest.json'), 'utf8'));
assert.equal(manifest.length, 5, 'Complete all five samples before browser verification');
const app = express(); app.use('/api', createGenerationRouter());
const server = await new Promise(resolve => { const s = app.listen(0, '127.0.0.1', () => resolve(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const results = [];
try {
    for (const entry of manifest) {
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
        for (const [name, width, height] of [['desktop', 1440, 1000], ['tablet', 768, 1024], ['mobile', 390, 844]]) {
            const context = await browser.newContext({ viewport: { width, height }, reducedMotion: 'reduce', offline: true });
            const page = await context.newPage(); const errors = [], requests = [];
            page.on('pageerror', error => errors.push(error.message));
            page.on('console', message => { if (['error','warning'].includes(message.type())) errors.push(message.text()); });
            page.on('request', request => { if (/^https?:/.test(request.url())) requests.push(request.url()); });
            await page.goto(pathToFileURL(path.join(extracted, 'my-website/index.html')).href);
            await page.locator('.hero-art img').evaluate(image => image.decode());
            const geometry = await page.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth,
                h1: getComputedStyle(document.querySelector('h1')).fontSize,
                failedImages: [...document.images].filter(image => !image.complete || !image.naturalWidth).length,
                outside: [...document.querySelectorAll('main p,main h1,main h2,main h3,main article')].filter(node => { const box = node.getBoundingClientRect(); return box.right > innerWidth + 1 || box.left < -1; }).map(node => node.tagName) }));
            assert.ok(geometry.scroll <= geometry.width + 1, `${entry.name}/${name}: horizontal overflow`);
            assert.equal(geometry.failedImages, 0); assert.deepEqual(geometry.outside, []);
            assert.ok(parseFloat(geometry.h1) >= 38, 'Stylesheet must load offline');
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
            await page.evaluate(() => scrollTo(0, 0));
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
        await frame.locator('.menu-toggle').click(); assert.equal(await frame.locator('.menu-toggle').getAttribute('aria-expanded'), 'true');
        const isolation = await frame.locator('body').evaluate(() => {
            let parentDenied = false, storageDenied = false;
            try { void parent.document.body; } catch { parentDenied = true; }
            try { localStorage.setItem('test', 'value'); } catch { storageDenied = true; }
            return { parentDenied, storageDenied };
        });
        assert.deepEqual(isolation, { parentDenied: true, storageDenied: true });
        const external = frame.locator('a[href^="mailto:"],a[href^="https://"],a[href^="tel:"]').first();
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
        await fs.writeFile(path.join(root, 'browser-verification.json'), JSON.stringify(results, null, 2));
        console.log(`[BROWSER PASS] ${entry.name}: extracted ZIP offline at desktop/tablet/mobile; navigation, FAQ, no-JS fallback and isolated preview`);
    }
} finally { await browser.close(); server.close(); }
