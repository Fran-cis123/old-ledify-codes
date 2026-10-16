import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { resolveSlideCount } from '../../Service/ai/slideCount.mjs';
import { validateOutline } from '../../Service/ai/presentationPrompts.mjs';
import { renderProfessionalSlide, validateRenderContent } from '../../renderer/presentation/professionalLayouts.mjs';
import { renderLayout } from '../../renderer/presentation/layoutRegistry.mjs';
import { SLIDE_TYPE_CONTENT_MAP } from '../../templates/presentation/slideContentSchemas.mjs';
import { fixtures } from '../fixtures/presentationContent.mjs';
import { urlService } from '../../Service/urlService.mjs';
import { pdfSource } from '../fixtures/uploadFiles.mjs';
import {repairPresentationValidation,validateCompletedPresentation} from '../../Service/ai/presentationValidation.mjs';

test('approved outline objectives prevent false topic drift without admitting unrelated slide bodies',()=>{
    const presentation={outputType:'presentation',title:'Government',inferredContext:{topic:'Government'},slides:[
        {slideNumber:1,slideType:'title',title:'Government',content:{titleContent:{title:'Government',subtitle:'Public institutions and civic roles',supportingText:'A practical introduction.'}}},
        {slideNumber:2,slideType:'cards',title:'Core Functions of Governance',content:{cards:[
            {title:'Maintaining Order',description:'Establishing legal frameworks and law enforcement to ensure public safety.'},
            {title:'Providing Public Goods',description:'Delivering essential infrastructure, public education, and health services.'},
            {title:'Protecting Rights',description:'Safeguarding individual freedoms, equal justice, and constitutional liberties.'},
            {title:'National Security',description:'Defending territorial sovereignty and foreign interests from external threats.'}
        ]}}
    ]};
    const source={inputType:'prompt',input:'Explain government.',plannedSlides:[{slideNumber:2,title:'Core Functions of Governance',objective:'Survey the responsibilities of government including maintaining order, providing public goods, and defending rights.'}]};
    assert.throws(()=>validateCompletedPresentation(presentation,{inputType:source.inputType,input:source.input}),/drifted/);
    assert.doesNotThrow(()=>validateCompletedPresentation(presentation,source));
    presentation.slides[1]={slideNumber:2,slideType:'focused-explanation',title:'Preparing artisan bread',content:{textContent:{heading:'Baking sourdough',body:'Combine flour water yeast salt sugar butter eggs milk oats seeds nuts berries cinnamon vanilla honey chocolate raisins citrus zest cocoa almonds hazelnuts rye barley bran ginger nutmeg cloves cardamom sesame poppy coconut walnuts pecans pistachios dates figs apricots.'}}};
    assert.throws(()=>validateCompletedPresentation(presentation,source),/drifted/);
});

const duplicateDeck=()=>({outputType:'presentation',title:'Content review',slides:[
    {slideNumber:1,slideType:'title',title:'Content review',content:{titleContent:structuredClone(fixtures.titleContent)}},
    ...[2,3].map(slideNumber=>({slideNumber,slideType:'focused-explanation',title:'Careful source review',content:{textContent:structuredClone(fixtures.textContent)}}))
]});

test('whole-presentation validation repairs the duplicate slide rather than discarding a generated deck',async()=>{
    const presentation=duplicateDeck(),repaired=[];
    await repairPresentationValidation({presentation,source:{},requestId:'fixture',repairSlide:async(slide,instructions)=>{
        repaired.push(slide.slideNumber);assert.match(instructions,/duplicates slide/);
        return {...slide,title:'Communicating reviewed evidence',content:{textContent:{heading:'Explain the findings',body:'Communicate the reviewed evidence clearly so readers can understand the conclusions and their limitations.'}}};
    }});
    assert.deepEqual(repaired,[3]);assert.equal(presentation.slides.length,3);
});

test('unsuccessful whole-presentation repairs stop after two rounds and retain safe diagnostics',async()=>{
    let attempts=0;
    await assert.rejects(repairPresentationValidation({presentation:duplicateDeck(),source:{},requestId:'fixture',repairSlide:async slide=>{attempts++;return slide;}}),error=>error.code==='AI_SCHEMA_VALIDATION_FAILED'&&error.stage==='presentation-validation'&&error.validationRule==='PRESENTATION_CONTENT'&&error.slideNumber===3);
    assert.equal(attempts,2);
});

test('validation repair accepts canonical content and supplies the neighboring slide context',async()=>{
    const presentation=duplicateDeck();
    await repairPresentationValidation({presentation,source:{plannedSlides:[{slideNumber:3,title:'Apply findings',objective:'Communicate limitations.'}]},requestId:'fixture',repairSlide:async(slide,instructions)=>{
        assert.match(instructions,/Communicate limitations/);
        assert.match(instructions,/Other slides/);
        slide.slideNumber=99; // Callback mutations must not corrupt canonical identity.
        return {textContent:{heading:'Apply findings carefully',body:'Explain limitations clearly before applying reviewed findings to a new decision or unfamiliar setting.'}};
    }});
    assert.equal(presentation.slides[2].slideNumber,3);
    assert.equal(presentation.slides[2].content.textContent.heading,'Apply findings carefully');
    assert.doesNotThrow(()=>validateCompletedPresentation(presentation,{}));
});

test('exhausted repairs expose underlying validation reasons to server diagnostics',async()=>{
    await assert.rejects(repairPresentationValidation({presentation:duplicateDeck(),source:{},requestId:'fixture',repairSlide:async slide=>slide}),error=>{
        assert.ok(error.validationErrors.some(issue=>/duplicates/.test(issue)));
        assert.equal(error.requestId,'fixture');return true;
    });
});

test('count defaults, explicit fields, natural language and actionable limits', () => {
    assert.deepEqual(resolveSlideCount('Explain water'), { min: 8, max: 10, source: 'default' });
    for (const n of [5, 9, 12]) assert.equal(resolveSlideCount(`Create ${n}-slide presentation`).min, n);
    assert.equal(resolveSlideCount('Create five slides').min, 5);
    assert.equal(resolveSlideCount('Slide count: 9').min, 9);
    assert.equal(resolveSlideCount('', { keyInstructions: ['Create five slides'] }).min, 5);
    assert.equal(resolveSlideCount('Create 9 slides', { slideCount: '12' }).min, 12);
    for (const n of [0, 13, 2.5, 'invalid']) assert.throws(() => resolveSlideCount('', { slideCount: n }), /1 to 12/);
    for (const prompt of ['8.5 slides', '-5 slides', 'thirteen slides', 'twenty-one slides']) assert.throws(() => resolveSlideCount(prompt), /1 to 12/);
    assert.throws(() => resolveSlideCount('5 slides or 9 slides'), /Conflicting/);
});

for (const [type, key] of Object.entries(SLIDE_TYPE_CONTENT_MAP)) test(`canonical ${type} renders every supplied field without placeholders`, () => {
    const texts = [], shapes = [], charts = [];
    const slide = { addText: (v, o) => texts.push([v, o]), addShape: (v, o) => shapes.push([v, o]), addChart: (v, data, o) => charts.push([data, o]) };
    const data = { slideNumber: 2, slideType: type, title: 'Source review', content: { [key]: fixtures[key] } };
    renderProfessionalSlide({ slide, slideData: data });
    const visible = texts.map(([v]) => v).join('\n');
    assert.ok(texts.length > 2, 'Must contain visible content beyond title and page number');
    assert.ok(!visible.includes(type), 'Internal type label must be absent');
    for (const [v, o] of [...texts, ...shapes]) {
        assert.ok(o.x >= 0 && o.y >= 0 && o.x + o.w <= 13.334 && o.y + o.h <= 7.501, `Bounds: ${v}`);
        if (typeof v === 'string' && o.fontSize && o.fontSize < 18) assert.equal(o.fontSize, 12, 'Only page numbers may be small');
    }
    // Inspect canonical leaves, excluding metadata that should never be drawn.
    function leaves(value, path = '') {
        if (Array.isArray(value)) return value.flatMap((v, i) => leaves(v, `${path}.${i}`));
        if (value && typeof value === 'object') return Object.entries(value).flatMap(([k, v]) => /^(visual|id|from|to|type|searchQuery|chartType|stepNumber)$/.test(k) ? [] : leaves(v, `${path}.${k}`));
        return typeof value === 'string' && value ? [value] : [];
    }
    const chartText = charts.map(([data]) => JSON.stringify(data)).join('');
    for (const leaf of leaves(fixtures[key])) assert.ok(visible.includes(leaf) || chartText.includes(leaf), `Missing supplied content: ${leaf}`);
});

test('dense content, empty bodies, unsupported layouts and chart types fail clearly', () => {
    const base = { slideNumber: 4, slideType: 'focused-explanation', title: 'Readable long title with useful specific information', content: { textContent: { heading: 'Meaningful explanation', body: 'A concise body preserves important supplied facts while remaining readable.' } } };
    validateRenderContent(base);
    assert.throws(() => validateRenderContent({ ...base, content: { textContent: { heading: 'Heading', body: '' } } }), /body/);
    assert.throws(() => validateRenderContent({ ...base, content: { textContent: { heading: 'Heading', body: Array.from({ length: 45 }, (_, n) => `Distinct statement ${n} examines the relevant source.`).join(' ') } } }), /Slide 4/);
    assert.throws(() => renderLayout({ slide: {}, tokens: {}, slideData: { ...base, layoutId: 'unknown' } }), /Slide 4.*unsupported layout/);
    assert.throws(() => validateRenderContent({ slideNumber: 4, slideType: 'data-chart', title: 'Chart', content: { chart: { ...fixtures.chart, chartType: 'unsupported' } } }), /chartType/);
});

test('heading-only item slides are rejected with their exact body field', () => {
    assert.throws(() => validateRenderContent({ slideNumber: 3, slideType: 'cards', title: 'Evidence review', content: {
        cards: [{ title: 'Preparation', description: '' }, { title: 'Review', description: '' }]
    } }), /content.cards\[0\].description must contain meaningful text/);
});

test('five-node relationships retain complete scientific terms at readable sizes', () => {
    validateRenderContent({ slideNumber: 3, slideType: 'relationship', title: 'Water cycle connections', content: { relationship: {
        nodes: ['Evaporation', 'Condensation', 'Precipitation', 'Infiltration', 'Groundwater'].map((label, i) => ({ id: String(i), label, description: 'Water changes and moves.' })),
        relationships: [{ from: '0', to: '1', label: 'Can lead to' }, { from: '2', to: '3', label: 'Can support' }]
    } } });
});

test('count policy validates the outline before any slide is drafted', () => {
    const plan = { title: 'Topic', slides: Array.from({ length: 5 }, (_, i) => ({ slideNumber: i + 1, slideType: i ? 'focused-explanation' : 'title', title: `Distinct heading ${i}` })) };
    validateOutline(plan, resolveSlideCount('5 slides'));
    assert.throws(() => validateOutline(plan, resolveSlideCount('9 slides')), /Expected 9/);
    assert.throws(() => validateOutline(plan, resolveSlideCount('No count')), /Expected 8/);
});

test('URL extraction retains article structure and excludes unrelated navigation', async t => {
    const server = http.createServer((req, res) => res.end('<html><body><nav>Unrelated menu</nav><aside>Advertisement</aside><main><h1>Water cycle</h1><p>Evaporation moves water into the atmosphere.</p><p>Condensation forms droplets.</p></main><footer>Legal links</footer></body></html>'));
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    t.after(() => server.close());
    const text = await urlService(`http://127.0.0.1:${server.address().port}`, { fetchText: async url => { const response = await fetch(url); return { text: await response.text(), contentType: "text/html" }; } });
    assert.ok(text.includes('Water cycle\n'));
    assert.ok(text.includes('Condensation forms droplets.'));
    assert.ok(!/Unrelated|Advertisement|Legal/.test(text));
});

process.env.GEMINI_API_KEY ||= 'test-key-never-used';
const { userText, userUrl, userFile } = await import('../../controller/generateController.mjs');
for (const [name, handler, extra] of [
    ['text', userText, { textPrompt: 'Create five slides' }],
    ['URL', userUrl, { urlPrompt: 'https://example.invalid' }],
    ['file', userFile, {}]
]) test(`${name} API rejects invalid top-level count before database or AI access`, { timeout: 3000 }, async () => {
    let status, payload;
    const res = { status(code) { status = code; return this; }, json(value) { payload = value; return value; } };
    await handler({ body: { outputType: 'presentation', ...extra, context: name === 'file' ? '{"slideCount":5}' : { slideCount: 5 }, slideCount: 13 }, file: { buffer: pdfSource(), mimetype: 'application/pdf', originalname: 'notes.pdf' } }, res);
    assert.equal(status, 400);
    assert.equal(payload.errorCode, 'INVALID_SLIDE_COUNT');
    assert.match(payload.error, /1 to 12/);
});
