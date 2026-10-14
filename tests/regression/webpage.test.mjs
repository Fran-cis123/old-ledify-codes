import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import { EventEmitter } from 'node:events';
import JSZip from 'jszip';
import express from 'express';
import { fixtures, fixturePlan, fixtureDraft, fixtureClient } from '../webpage/fixtures.mjs';
import { webpageLayoutService } from '../../Service/webpageLayoutService.mjs';
import { webpageThemeService, contrast } from '../../Service/webpageThemeService.mjs';
import { webpageRenderer } from '../../renderer/webpage/webpageRenderer.mjs';
import { validateWebpageContent } from '../../Service/webpageContentValidator.mjs';
import { webpageContentSchema } from '../../templates/webpage/webpageSchema.mjs';
import { validateStaticWebsite } from '../../Service/webpageStaticValidator.mjs';
import { webpageArtifactService } from '../../Service/webpageArtifactService.mjs';
import { isPublicAddress, resolvePublicUrl, fetchPublicText } from '../../Service/input/publicUrl.mjs';
import { validateUploadedFile } from '../../Service/input/fileValidation.mjs';
import { docxSource, DOCX_MIME } from '../fixtures/uploadFiles.mjs';

process.env.GEMINI_API_KEY ||= 'test-key-never-used';
const { generateService } = await import('../../Service/generateService.mjs');
const { createGenerationRouter } = await import('../../route/generateRoute.mjs');
function page(fixture = fixtures.portfolio) {
    return webpageThemeService(webpageLayoutService({ outputType: 'webpage', ...fixturePlan(fixture), ...fixtureDraft(fixture) }));
}
async function temp(t) {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'ledify-webpage-'));
    t.after(() => fs.rm(root, { recursive: true, force: true })); return root;
}
for (const [name, fixture] of Object.entries(fixtures)) test(`${name} preserves content in a complete offline static site with accessible contrast`, () => {
    const rendered = webpageRenderer(page(fixture));
    validateStaticWebsite(rendered);
    for (const section of fixture.sections) {
        assert.ok(rendered['index.html'].includes(section.heading.replaceAll('&', '&amp;')));
        for (const item of section.items) assert.ok(rendered['index.html'].includes(item.title));
    }
    const colors = page(fixture).theme.colors;
    for (const [a, b] of [['text','background'], ['muted','background'], ['text','surface'], ['onPrimary','primary'], ['onAccent','accent']]) assert.ok(contrast(colors[a], colors[b]) >= 4.5, `${a}/${b}`);
});
test('source validation rejects invented contact information, metrics and testimonials', () => {
    const f = fixtures.startup, plan = fixturePlan(f);
    const check = draft => validateWebpageContent(draft, { plan, schema: webpageContentSchema(plan), source: f.source });
    check(fixtureDraft(f));
    const invented = structuredClone(fixtureDraft(f)); invented.contact.email = 'fake@example.com'; assert.throws(() => check(invented), /Contact information/);
    const metric = structuredClone(fixtureDraft(f)); metric.sections[0].content = 'Trusted by 5000 customers.'; assert.throws(() => check(metric), /Numerical/);
    const quote = structuredClone(fixtureDraft(f)); quote.sections[0].type = 'testimonials';
    assert.throws(() => validateWebpageContent(quote, { source: f.source }), /Testimonials/);
});
test('visitor actions reach the named work, menu, resources and supplied contact destinations', () => {
    const portfolio = { outputType: 'webpage', ...fixturePlan(fixtures.portfolio), ...fixtureDraft(fixtures.portfolio) };
    portfolio.hero.actionLabel = 'Explore the work';
    portfolio.callToAction.actionLabel = 'Send an email';
    const p = webpageLayoutService(portfolio);
    assert.equal(p.heroTarget, '#' + p.sections.find(s => s.type === 'projects').id);
    assert.equal(p.primaryTarget, 'mailto:' + p.contact.email);
    const restaurant = { outputType: 'webpage', ...fixturePlan(fixtures.restaurant), ...fixtureDraft(fixtures.restaurant) };
    restaurant.hero.actionLabel = 'Browse the menu';
    const r = webpageLayoutService(restaurant);
    assert.equal(r.heroTarget, '#' + r.sections.find(s => s.type === 'menu').id);
    portfolio.sections.find(s => s.type === 'projects').heading = 'Learning Resources';
    portfolio.callToAction.actionLabel = 'Explore resources';
    const resources = webpageLayoutService(portfolio);
    assert.equal(resources.primaryTarget, '#' + resources.sections.find(s => s.heading === 'Learning Resources').id);
});
test('empty bodies, unsupported sections, repetitive content and excessive items fail clearly', () => {
    for (const mutate of [d => { d.sections[0].content = ''; d.sections[0].items = []; }, d => { d.sections[0].type = 'unsupported'; }, d => { d.sections[1] = structuredClone(d.sections[0]); }, d => { d.sections[0].items = Array(7).fill(d.sections[0].items[0]); }]) {
        const draft = structuredClone(fixtureDraft(fixtures.portfolio)); mutate(draft); assert.throws(() => validateWebpageContent(draft));
    }
    assert.throws(() => webpageLayoutService({ outputType: 'webpage', pages: [{}, {}] }), /one complete page/);
});
test('literal HTML is escaped, and unsafe URLs/styles/scripts are rejected', () => {
    const p = page(); p.hero.headline = '<script>alert("bad")</script>';
    const files = webpageRenderer(p); assert.ok(files['index.html'].includes('&lt;script&gt;')); assert.ok(!files['index.html'].includes('<script>alert'));
    p.sections[0].items[0].url = 'javascript:alert(1)'; assert.throws(() => webpageRenderer(p), /HTTPS/);
    const valid = webpageRenderer(page());
    for (const mutate of [f => { f['index.html'] = f['index.html'].replace('alt=""', 'onerror="alert(1)"'); }, f => { f['script.js'] = 'fetch("https://attacker.example")'; }, f => { f['index.html'] = f['index.html'].replace('./style.css', '../private.css'); }, f => { f['../secret'] = 'value'; }, f => { f['index.html'] = f['index.html'].replace('id="section-2"', 'id="section-1"'); }]) {
        const modified = { ...valid }; mutate(modified); assert.throws(() => validateStaticWebsite(modified));
    }
});
test('ZIP contains the exact validated offline website, and packaging failure retains its preview', async t => {
    const root = await temp(t), files = webpageRenderer(page());
    const artifact = await webpageArtifactService(files, { root });
    const zip = await JSZip.loadAsync(await fs.readFile(artifact.files.zipPath));
    for (const [name, content] of Object.entries(files)) assert.equal(await zip.file(`my-website/${name}`).async('string'), content);
    const partial = await webpageArtifactService(files, { root, buildZip: async () => { throw new Error('Injected packaging error'); } });
    assert.equal(partial.status, 'partial_success'); assert.equal(partial.downloadUrl, null);
    assert.ok((await fs.readFile(path.join(partial.files.siteDirectory, 'index.html'), 'utf8')).includes('<h1>'));
});
test('two-stage webpage AI retries invalid content without regenerating the plan', async t => {
    const f = fixtures.startup, values = [fixturePlan(f), { ...fixtureDraft(f), contact: { email: 'invented@example.com', phone: '', address: '' } }, fixtureDraft(f)];
    let calls = 0;
    const client = { models: { generateContent: async () => ({ text: JSON.stringify(values[calls++]), candidates: [{ finishReason: 'STOP' }] }) } };
    const result = await generateService('prompt', f.source, 'webpage', {}, { ai: { client, logger: () => {}, sleep: async () => {} }, artifacts: { root: await temp(t) } });
    assert.equal(calls, 3); assert.equal(result.status, 'completed'); assert.equal(result.generatedContent.contact.email, f.contact.email);
});
for (const address of ['127.0.0.1','0.0.0.0','10.1.2.3','172.16.1.1','192.168.1.1','169.254.169.254','100.64.1.2','198.18.1.1','203.0.113.1','::1','fe80::1','fc00::1','::ffff:127.0.0.1','2002:7f00:1::','2001:db8::1']) test(`SSRF denies ${address}`, () => assert.equal(isPublicAddress(address), false));
test('public DNS checks every result and pins the chosen address', async () => {
    assert.equal(isPublicAddress('8.8.8.8'), true); assert.equal(isPublicAddress('2606:4700::1111'), true);
    await assert.rejects(resolvePublicUrl('http://example.com', async () => [{ address: '8.8.8.8', family: 4 }, { address: '127.0.0.1', family: 4 }]), /public internet/);
    for (const url of ['file:///etc/passwd', 'http://user:pass@example.com', 'http://2130706433', 'http://[::ffff:127.0.0.1]']) await assert.rejects(resolvePublicUrl(url));
});
test('redirect targets are revalidated before connecting', async () => {
    let connects = 0;
    const request = (url, options, callback) => {
        connects++; const req = new EventEmitter(); req.end = () => {
            const res = new EventEmitter(); res.statusCode = 302; res.headers = { location: 'http://127.0.0.1/private' }; res.resume = () => {}; callback(res); req.emit('close');
        }; return req;
    };
    await assert.rejects(fetchPublicText('http://example.com', { lookup: async () => [{ address: '8.8.8.8', family: 4 }], request }), /public internet/);
    assert.equal(connects, 1);
});
test('file signatures and supported formats are enforced', async () => {
    for (const file of [{ originalname: 'source.pdf', mimetype: 'application/pdf', buffer: Buffer.from('not a pdf') }, { originalname: 'source.txt', mimetype: 'text/plain', buffer: Buffer.from('Source') }, { originalname: 'source.png', mimetype: 'image/png', buffer: Buffer.from('text') }]) await assert.rejects(validateUploadedFile(file));
    assert.equal(await validateUploadedFile({ originalname: 'source.docx', mimetype: DOCX_MIME, buffer: await docxSource() }), true);
});
test('actual generation routes handle text, URL and uploads, persist artifact metadata and enforce private access', async t => {
    const root = await temp(t), records = [], f = fixtures.business;
    const model = { create: async value => { const record = { ...value, _id: String(records.length), async save() {} }; records.push(record); return record; } };
    const app = express(); app.use(express.json());
    app.use('/api', createGenerationRouter({ model, webpageRoot: root, extractUrl: async () => f.source,
        generator: (kind, input, output, context) => generateService(kind, input, output, context, { ai: { client: fixtureClient(f), logger: () => {} }, artifacts: { root } }) }));
    const server = await new Promise(resolve => { const s = app.listen(0, '127.0.0.1', () => resolve(s)); });
    t.after(() => server.close()); const base = `http://127.0.0.1:${server.address().port}`;
    for (const kind of ['textPrompt', 'urlPrompt', 'file']) {
        let body, headers;
        if (kind === 'file') { body = new FormData(); body.set('outputType', 'webpage'); body.set('file', new Blob([await docxSource(f.source)], { type: DOCX_MIME }), 'source.docx'); }
        else { body = JSON.stringify({ outputType: 'webpage', [kind]: kind === 'urlPrompt' ? 'https://example.com' : f.source }); headers = { 'Content-Type': 'application/json' }; }
        const response = await fetch(`${base}/api/generate/${kind}`, { method: 'POST', body, headers });
        assert.equal(response.status, 201); const json = await response.json();
        const artifacts = json.data.result.artifacts;
        assert.equal(records.at(-1).artifacts.id, artifacts.id);
        assert.equal(artifacts.files, undefined, 'HTTP clients must not receive internal filesystem paths');
        assert.equal(records.at(-1).artifacts.files, undefined);
        const preview = await fetch(base + artifacts.previewUrl); assert.equal(preview.status, 200); assert.ok((await preview.text()).includes('sandbox="allow-scripts"'));
        const site = await fetch(base + artifacts.siteUrl); assert.ok(site.headers.get('content-security-policy').includes('sandbox allow-scripts;')); assert.ok(!site.headers.get('content-security-policy').includes('allow-same-origin'));
        const zip = await fetch(base + artifacts.downloadUrl); assert.equal(zip.status, 200); assert.ok((await zip.arrayBuffer()).byteLength > 1000);
        const wrong = artifacts.previewUrl.replace(/\/[\da-f]{64}\//, '/' + '0'.repeat(64) + '/'); assert.equal((await fetch(base + wrong)).status, 404);
        const forbidden = artifacts.siteUrl.replace('index.html', 'metadata.json'); assert.equal((await fetch(base + forbidden)).status, 404);
    }
});
