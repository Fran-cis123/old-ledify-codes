import 'dotenv/config';
import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import assert from 'node:assert/strict';
import pptxgen from 'pptxgenjs';
import { fixtures } from './fixtures/presentationContent.mjs';
import { SLIDE_TYPE_CONTENT_MAP } from '../templates/presentation/slideContentSchemas.mjs';
import { presentationLayoutService } from '../Service/presentationLayoutService.mjs';
import { presentationThemeService } from '../Service/presentationThemeService.mjs';
import { presentationRendererService } from '../Service/presentationRendererService.mjs';
import { previewRenderer } from '../renderer/presentation/previewRenderer.mjs';
import { convertPptxToPdf } from '../renderer/converters/pptxToPdf.mjs';
import { fileService } from '../Service/fileService.mjs';
import { urlService } from '../Service/urlService.mjs';
import { generateService } from '../Service/generateService.mjs';

const output = path.resolve('generated/quality-audit');
await fs.mkdir(output, { recursive: true });
const mode = process.argv[2] || 'fixtures';
const results = [];
async function save(name, result, count) {
    assert.equal(result.status, 'completed');
    assert.equal(result.preview.previewCount, count);
    const dir = path.join(output, name);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, 'result.json'), JSON.stringify(result, null, 2));
    await fs.copyFile(result.preview.files.pptxPath, path.join(dir, 'presentation.pptx'));
    await fs.copyFile(result.preview.files.pdfPath, path.join(dir, 'presentation.pdf'));
    results.push({ name, count, directory: dir, preview: result.preview });
    console.log('[QUALITY SAMPLE]', JSON.stringify({ name, count, directory: dir, previewDirectory: result.preview.files.previewDirectory }));
}

if (mode === 'fixtures') {
    const entries = Object.entries(SLIDE_TYPE_CONTENT_MAP);
    for (let batch = 0; batch < 2; batch++) {
        const selected = entries.slice(batch * 11, batch * 11 + 11);
        const slides = selected.map(([type, key], i) => ({ slideNumber: i + 1, slideType: type, title: type === 'title' ? 'Clear communication starts with source review' : fixtures[key].heading || fixtures[key].title || `Source review: ${type.replaceAll('-', ' ')}`, content: { [key]: structuredClone(fixtures[key]) } }));
        const content = { outputType: 'presentation', title: 'Source review layout verification', strategyId: 'academic-seminar', slides };
        const themed = presentationThemeService(presentationLayoutService(content), { designPreferences: { appearance: batch ? 'dark' : 'light' } });
        const ready = presentationRendererService(themed);
        const preview = await previewRenderer(ready);
        await save(`layouts-${batch ? 'dark' : 'light'}`, { generatedContent: themed, preview, status: preview.status }, slides.length);
    }
} else if (mode === 'refresh') {
    const manifest = JSON.parse(await fs.readFile(path.join(output, 'live-manifest.json'), 'utf8'));
    for (const entry of manifest) {
        const saved = JSON.parse(await fs.readFile(path.join(entry.directory, 'result.json'), 'utf8'));
        const ready = presentationRendererService(saved.generatedContent);
        const preview = await previewRenderer(ready);
        await save(entry.name, { ...saved, preview, status: preview.status }, entry.count);
    }
    await fs.writeFile(path.join(output, 'live-manifest.json'), JSON.stringify(results, null, 2));
} else if (mode === 'live') {
    const paragraphs = [
        'The water cycle describes the continuous movement of water between the atmosphere, land, oceans and living organisms. It is powered largely by solar energy and gravity.',
        'Evaporation changes liquid water into water vapour. Transpiration releases water vapour from plants. Together these processes move water into the atmosphere.',
        'Condensation occurs when water vapour cools and forms liquid droplets. Cloud droplets can grow and fall as precipitation, including rain and snow.',
        'Infiltration moves water into the soil. Some water reaches groundwater stores; groundwater can move through permeable rock and feed rivers and springs.',
        'Surface runoff moves water over land into streams, rivers and lakes. Watersheds connect upstream activities to downstream water quality.',
        'Oceans, glaciers, lakes, soil and groundwater store water for different lengths of time. Storage and movement vary across places and seasons.',
        'Paved surfaces can reduce infiltration and increase runoff. Vegetation can slow runoff and support infiltration. Local outcomes depend on soil, slope and rainfall.',
        'Water conservation and protecting wetlands can support local water management. These are practical recommendations; no measured outcomes or statistics are supplied.',
        'A useful classroom activity is to observe condensation on a cool surface. Present this as a proposed demonstration rather than a completed experiment.',
        'The source contains no quantitative measurements, study results, dates or verified quotations. Avoid charts, fabricated numbers and invented citations.'
    ];
    const source = paragraphs.join('\n\n');
    const sourcePptx = new pptxgen(); sourcePptx.layout = 'LAYOUT_WIDE';
    for (let i = 0; i < paragraphs.length; i += 2) {
        const slide = sourcePptx.addSlide();
        slide.addText('Water cycle source notes', { x: .6, y: .5, w: 12, h: .7, fontSize: 30 });
        slide.addText(paragraphs.slice(i, i + 2).join('\n\n'), { x: .6, y: 1.6, w: 12, h: 5.2, fontSize: 24, margin: 0 });
    }
    const sourcePath = path.join(output, 'water-cycle-source.pptx');
    await sourcePptx.writeFile({ fileName: sourcePath });
    const pdf = await convertPptxToPdf({ pptxPath: sourcePath, pdfPath: path.join(output, "water-cycle-source.pdf"), workingDirectory: output });
    const pdfSource = await fileService({ mimetype: 'application/pdf', buffer: await fs.readFile(pdf.pdfPath) });
    const server = http.createServer((req, res) => {
        res.setHeader('Content-Type', 'text/html');
        res.end(`<html><body><nav>Ignore menu content</nav><article><h1>The water cycle</h1>${paragraphs.map(p => `<p>${p}</p>`).join('')}</article></body></html>`);
    });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    try {
        const urlSource = await urlService(`http://127.0.0.1:${server.address().port}`, { fetchText: async url => { const response = await fetch(url); return { text: await response.text(), contentType: "text/html" }; } });
        for (const scenario of [
            { name: 'text-default', inputType: 'prompt', input: `Explain the water cycle to secondary school students using these source notes.\n${source}`, context: {} },
            { name: 'text-5', inputType: 'prompt', input: `Create exactly five slides explaining the water cycle to secondary school students.\n${source}`, context: {} },
            { name: 'url-9', inputType: 'url', input: urlSource, context: { slideCount: 9, audience: 'Secondary school students' } },
            { name: 'pdf-12', inputType: 'file', input: pdfSource, context: { slideCount: 12, audience: 'Secondary school students' } }
        ]) {
            try {
                const saved = JSON.parse(await fs.readFile(path.join(output, scenario.name, 'result.json'), 'utf8'));
                if (saved.status === 'completed') { await save(scenario.name, saved, saved.generatedContent.slides.length); continue; }
            } catch (error) { if (error.code !== 'ENOENT') throw error; }
            console.log('[QUALITY START]', scenario.name);
            const result = await generateService(scenario.inputType, scenario.input, 'presentation', scenario.context);
            const count = result.generatedContent.slides.length;
            if (scenario.name === 'text-default') assert.ok(count >= 8 && count <= 10);
            else assert.equal(count, Number(scenario.name.split('-')[1]));
            await save(scenario.name, result, count);
            await fs.writeFile(path.join(output, 'live-manifest.json'), JSON.stringify(results, null, 2));
        }
    } finally { server.close(); }
} else throw new Error('Use fixtures or live');
await fs.writeFile(path.join(output, `${mode}-manifest.json`), JSON.stringify(results, null, 2));
