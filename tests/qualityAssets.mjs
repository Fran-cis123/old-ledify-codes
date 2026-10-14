import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import express from 'express';
import JSZip from 'jszip';
import { downloadPresentation, downloadPresentationPdf, getPresentationSlide } from '../controller/presentationAssetsController.mjs';

const root = path.resolve('generated/quality-audit');
const manifest = JSON.parse(await fs.readFile(path.join(root, 'live-manifest.json'), 'utf8'));
assert.equal(manifest.length, 4, 'Complete all four live scenarios first');
const app = express();
app.get('/api/presentations/:previewId/download', downloadPresentation);
app.get('/api/presentations/:previewId/pdf', downloadPresentationPdf);
app.get('/api/presentations/:previewId/slides/:slideNumber', getPresentationSlide);
const server = await new Promise(resolve => { const server = app.listen(0, '127.0.0.1', () => resolve(server)); });
const base = `http://127.0.0.1:${server.address().port}`;
try {
    for (const entry of manifest) {
        const r = JSON.parse(await fs.readFile(path.join(entry.directory, 'result.json'), 'utf8'));
        assert.equal(r.generatedContent.slides.length, entry.count);
        assert.equal(r.preview.previewCount, entry.count);
        const pptx = await fs.readFile(r.preview.files.pptxPath);
        const zip = await JSZip.loadAsync(pptx);
        const slides = Object.keys(zip.files).filter(name => /^ppt\/slides\/slide\d+\.xml$/.test(name));
        assert.equal(slides.length, entry.count);
        for (const name of slides) {
            const xml = await zip.file(name).async('string');
            assert.ok((xml.match(/<a:t>/g) || []).length >= 3, `Empty slide: ${name}`);
            assert.ok(!/<a:t>(?:title|focused-explanation|summary|conclusion)<\/a:t>/.test(xml), 'Internal slide type leaked');
        }
        for (const [url, file, type] of [
            [r.preview.downloads.pptx, r.preview.files.pptxPath, 'application/vnd.openxmlformats-officedocument.presentationml.presentation'],
            [r.preview.downloads.pdf, r.preview.files.pdfPath, 'application/pdf']
        ]) {
            const response = await fetch(base + url);
            assert.equal(response.status, 200);
            assert.ok(response.headers.get('content-type').startsWith(type));
            assert.deepEqual(Buffer.from(await response.arrayBuffer()), await fs.readFile(file));
        }
        for (let i = 1; i <= entry.count; i++) {
            const response = await fetch(`${base}/api/presentations/${r.preview.previewId}/slides/${i}`);
            assert.equal(response.status, 200);
            const png = Buffer.from(await response.arrayBuffer());
            assert.equal(png.subarray(1, 4).toString(), 'PNG');
        }
        console.log(`[ASSETS PASS] ${entry.name}: ${entry.count} editable PPTX slides, PDF download, ${entry.count} PNG routes`);
    }
} finally { server.close(); }
await fs.writeFile(path.join(root, 'asset-verification.json'), JSON.stringify({ scenarios: manifest.map(({ name, count }) => ({ name, count })), allDownloadsMatched: true }, null, 2));
