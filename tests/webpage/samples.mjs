import 'dotenv/config';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fixtures, fixtureClient } from './fixtures.mjs';
import { generateService } from '../../Service/generateService.mjs';
import { fileService } from '../../Service/fileService.mjs';
import { urlService } from '../../Service/urlService.mjs';
import { webpageLayoutService } from '../../Service/webpageLayoutService.mjs';
import { webpageThemeService } from '../../Service/webpageThemeService.mjs';
import { webpageRenderer } from '../../renderer/webpage/webpageRenderer.mjs';
import { webpageArtifactService } from '../../Service/webpageArtifactService.mjs';

export const samplesRoot = path.resolve('generated/webpage-samples');
const live = process.argv.includes('live');
await fs.mkdir(samplesRoot, { recursive: true });
const manifest = [];
for (const [name, fixture] of Object.entries(fixtures)) {
    const directory = path.join(samplesRoot, name);
    await fs.mkdir(directory, { recursive: true });
    if (process.argv.includes('--render-saved')) {
        const saved = JSON.parse(await fs.readFile(path.join(directory, live ? 'live-result.json' : 'fixture-result.json'), 'utf8'));
        const page = webpageThemeService(webpageLayoutService(saved.generatedContent));
        saved.generatedContent = page;
        saved.artifacts = await webpageArtifactService(webpageRenderer(page));
        await fs.writeFile(path.join(directory, live ? 'live-result.json' : 'fixture-result.json'), JSON.stringify(saved, null, 2));
        await fs.copyFile(saved.artifacts.files.zipPath, path.join(directory, 'generated-website.zip'));
        manifest.push({ name, mode: live ? 'live' : 'fixture', inputType: saved.inputType, directory, artifacts: saved.artifacts });
        console.log(`[WEBPAGE RENDERED] ${name}: saved AI content, no provider request`);
        continue;
    }
    if (live && !process.argv.includes('--fresh')) {
        try {
            const saved = JSON.parse(await fs.readFile(path.join(directory, 'live-result.json'), 'utf8'));
            await fs.access(saved.artifacts.files.zipPath);
            if (saved.status === 'completed') {
                manifest.push({ name, mode: 'live', inputType: saved.inputType, directory, artifacts: saved.artifacts });
                console.log(`[WEBPAGE REUSED] ${name}`);
                continue;
            }
        } catch (error) { if (error.code !== 'ENOENT') throw error; }
    }
    let input = fixture.source, inputType = 'prompt';
    let context = { audience: name === 'education' ? 'Curious students' : 'Interested visitors', designPreferences: { preset: fixture.preset }, keyInstructions: ['Build a complete single-page static website. Keep all claims grounded in the source.'] };
    if (live && name === 'business') {
        const buffer = sourcePdf(fixture.source);
        await fs.writeFile(path.join(directory, 'source.pdf'), buffer);
        input = await fileService({ mimetype: 'application/pdf', buffer }); inputType = 'file';
    }
    if (live && name === 'education') {
        const urls = process.env.LEDIFY_SAMPLE_SOURCE_URL ? [process.env.LEDIFY_SAMPLE_SOURCE_URL] : ['https://gpm.nasa.gov/education/water-cycle', 'https://science.nasa.gov/earth/water-cycle/', 'https://en.wikipedia.org/wiki/Water_cycle'];
        let url, lastError;
        for (const candidate of urls) {
            try { input = await urlService(candidate); if (input.length > 80000) throw new Error('Source exceeds webpage input limit'); url = candidate; break; }
            catch (error) { lastError = error; console.log('[SOURCE UNAVAILABLE]', new URL(candidate).hostname, error.code || 'SOURCE_FAILED'); }
        }
        if (!url) throw lastError;
        inputType = 'url';
        context = { ...context, purpose: 'Create an independent educational water-cycle explainer called Water in Motion. Do not imply source-organization endorsement or affiliation. Use only the supplied article. Omit pricing and testimonials.' };
        await fs.writeFile(path.join(directory, 'source-url.txt'), url);
    }
    console.log(`[WEBPAGE START] ${name} (${live ? 'live Gemini' : 'deterministic fixture'}, ${inputType})`);
    const result = await generateService(inputType, input, 'webpage', context,
        live ? {} : { ai: { client: fixtureClient(fixture), logger: () => {} } });
    if (result.status !== 'completed') throw new Error(`Incomplete sample: ${name}`);
    await fs.writeFile(path.join(directory, live ? 'live-result.json' : 'fixture-result.json'), JSON.stringify(result, null, 2));
    await fs.copyFile(result.artifacts.files.zipPath, path.join(directory, 'generated-website.zip'));
    manifest.push({ name, mode: live ? 'live' : 'fixture', inputType, directory, artifacts: result.artifacts });
    await fs.writeFile(path.join(samplesRoot, 'manifest.json'), JSON.stringify(manifest, null, 2));
    console.log(`[WEBPAGE COMPLETE] ${name}: ${result.generatedContent.sections.length} sections, local ZIP saved`);
}
await fs.writeFile(path.join(samplesRoot, live ? 'live-manifest.json' : 'fixture-manifest.json'), JSON.stringify(manifest, null, 2));
await fs.writeFile(path.join(samplesRoot, 'manifest.json'), JSON.stringify(manifest, null, 2));
function sourcePdf(text) {
    const lines = text.match(/.{1,85}(?:\s|$)/g).map(line => line.trim());
    const content = `BT /F1 11 Tf 45 750 Td 15 TL ${lines.map((line, i) => `${i ? 'T* ' : ''}(${line.replace(/[\\()]/g, '\\$&')}) Tj`).join('\n')} ET`;
    const objects = ['<< /Type /Catalog /Pages 2 0 R >>', '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
        '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
        '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>', `<< /Length ${Buffer.byteLength(content)} >>\nstream\n${content}\nendstream`];
    let pdf = '%PDF-1.4\n', offsets = [0];
    for (const [i, object] of objects.entries()) { offsets.push(Buffer.byteLength(pdf)); pdf += `${i + 1} 0 obj\n${object}\nendobj\n`; }
    const xref = Buffer.byteLength(pdf);
    pdf += `xref\n0 6\n0000000000 65535 f \n${offsets.slice(1).map(offset => String(offset).padStart(10, '0') + ' 00000 n \n').join('')}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
    return Buffer.from(pdf);
}
