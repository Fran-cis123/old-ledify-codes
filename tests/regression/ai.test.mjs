import test from "node:test";
import assert from "node:assert/strict";
import { parseResponse, validateTextSafety, validateSchema } from "../../Service/ai/responseValidation.mjs";
import { generateJsonWithRetry } from "../../Service/ai/generateJsonWithRetry.mjs";
import { buildOutlinePrompt, buildSlidePrompt, validateOutline, outlineProviderSchema } from "../../Service/ai/presentationPrompts.mjs";
import { SLIDE_TYPE_CONTENT_MAP } from "../../templates/presentation/slideContentSchemas.mjs";
import { validateSlideContent } from "../../Service/presentationContentValidator.mjs";
import { validatePresentationContent } from "../../Service/presentationContentValidator.mjs";
import { slideTypes } from "../../templates/presentation/slideTypes.mjs";
import { validateQuantitativeGrounding } from "../../Service/ai/sourceGrounding.mjs";

const schema = { type: "object", properties: { title: { type: "string" } }, required: ["title"] };
const response = (value = { title: "Valid title" }) => ({ text: JSON.stringify(value), candidates: [{ finishReason: "STOP" }], usageMetadata: { promptTokenCount: 12, candidatesTokenCount: 8 } });
const options = { schema, outputType: "presentation" };
test('temporary fetch and nested socket failures recover with bounded retries and unchanged source',async()=>{
    for(const failure of [new TypeError('fetch failed'),new Error('connection',{cause:new AggregateError([Object.assign(new Error('private-host'),{code:'ECONNREFUSED'})])}),Object.assign(new Error('timeout'),{code:'UND_ERR_CONNECT_TIMEOUT'})]){
        const run=await retry([failure,response()]);
        assert.deepEqual(await run.promise,{title:'Valid title'});
        assert.equal(run.calls.length,2);assert.deepEqual(run.delays,[500]);
        assert.equal(run.calls[1].contents,'PRIVATE SOURCE');
    }
    const run=await retry([new TypeError('fetch failed')]);
    await assert.rejects(run.promise,{code:'AI_RETRY_EXHAUSTED',lastErrorCode:'AI_PROVIDER_TRANSIENT',providerReason:'PROVIDER_CONNECTION_FAILED'});
    assert.equal(run.calls.length,3);
});
test('outline provider schema avoids bounded-array complexity without weakening local limits',()=>{
    const local={type:'object',properties:{slides:{type:'array',minItems:8,maxItems:10,items:{type:'object',properties:{kind:{type:'string',enum:['title','summary']},topics:{type:'array',maxItems:3,items:{type:'string'}}},required:['kind'],additionalProperties:false}}},required:['slides']};
    const provider=outlineProviderSchema(local);
    assert.equal(provider.properties.slides.maxItems,undefined);assert.equal(provider.properties.slides.minItems,undefined);
    assert.equal(provider.properties.slides.items.properties.topics.maxItems,3);
    assert.deepEqual(provider.properties.slides.items.required,['kind']);assert.equal(provider.properties.slides.items.additionalProperties,false);
    assert.deepEqual(provider.properties.slides.items.properties.kind.enum,['title','summary']);
    assert.equal(local.properties.slides.maxItems,10);
    assert.throws(()=>validateSchema({slides:[{kind:'title'}]},local),{code:'AI_SCHEMA_VALIDATION_FAILED'});
});
test('provider failures classify key, model, schema and quota errors without exposing raw provider text',async()=>{
    for(const [status,message,reason] of [[400,'API_KEY_INVALID private-secret','INVALID_API_KEY'],[403,'API_KEY_IP_ADDRESS_BLOCKED private-secret','API_KEY_RESTRICTED'],[403,'private-secret','PERMISSION_DENIED'],[404,'private-secret','MODEL_NOT_FOUND'],[400,'private-secret','REQUEST_REJECTED'],[429,'private-secret','QUOTA_OR_BILLING']]){
        const run=await retry([Object.assign(new Error(message),{status})]);
        await assert.rejects(run.promise,error=>error.providerStatus===status&&error.providerReason===reason&&error.model==='fixture'&&!error.message.includes('private-secret'));
        assert.ok(!JSON.stringify(run.logs).includes('private-secret'));
        assert.equal(run.calls.length,status===429?3:1);
    }
});
for (const [name, value, code] of [
    ["empty", { text: "", candidates: [{ finishReason: "STOP" }] }, "AI_RESPONSE_EMPTY"],
    ["malformed", { ...response(), text: '{"title":' }, "AI_JSON_PARSE_FAILED"],
    ["token limit", { ...response(), candidates: [{ finishReason: "MAX_TOKENS" }] }, "AI_RESPONSE_TRUNCATED"],
    ["missing finish", { ...response(), candidates: [] }, "AI_RESPONSE_INCOMPLETE"],
    ["interrupted", { ...response(), candidates: [{ finishReason: "OTHER" }] }, "AI_RESPONSE_INCOMPLETE"],
    ["safety", { ...response(), candidates: [{ finishReason: "SAFETY" }] }, "AI_RESPONSE_BLOCKED"],
    ["missing field", response({}), "AI_SCHEMA_VALIDATION_FAILED"],
    ["unknown field", response({ title: "Title", unexpected: true }), "AI_SCHEMA_VALIDATION_FAILED"],
    ["wrong value", response({ title: 42 }), "AI_SCHEMA_VALIDATION_FAILED"],
    ["repetitive digits", response({ title: "1234567890".repeat(30) }), "AI_REPETITIVE_OUTPUT"],
    ["long title", response({ title: Array.from({ length: 100 }, (_, n) => `word${n}`).join(" ") }), "AI_TEXT_TOO_LONG"]
]) test(`JSON ${name} has a precise error`, () => assert.throws(() => parseResponse(value, options), error => error.code === code));

test("valid and fenced JSON parse", () => {
    assert.equal(parseResponse(response(), options).title, "Valid title");
    assert.equal(parseResponse({ ...response(), text: '```json\n{"title":"Fenced title"}\n```' }, options).title, "Fenced title");
});
test("numeric datasets and long document paragraphs are allowed", () => {
    validateTextSafety({ datasets: [{ values: Array(100).fill(12) }], value: "1000000" }, "presentation");
    validateTextSafety({ paragraph: Array.from({ length: 300 }, (_, n) => `Sentence ${n}.`).join(" ") }, "document");
});

test('code indentation and diagram separators are permitted without admitting repeated prose',()=>{
    validateTextSafety({blocks:[{type:'code',text:'Input\n'+' '.repeat(64)+'Process\n'+'-'.repeat(64)+'\nOutput'}]},'document');
    assert.throws(()=>validateTextSafety({blocks:[{type:'code',text:'Repeated explanation '.repeat(12)}]},'document'),{code:'AI_REPETITIVE_OUTPUT'});
    assert.throws(()=>validateTextSafety({blocks:[{type:'code',text:'-'.repeat(64)+'\n'+'1234567890'.repeat(12)}]},'document'),{code:'AI_REPETITIVE_OUTPUT'});
    assert.throws(()=>validateTextSafety({blocks:[{type:'paragraph',text:'Repeated explanation '.repeat(12)}]},'document'),{code:'AI_REPETITIVE_OUTPUT'});
});
test("schema recursively checks nested values", () => {
    assert.throws(() => validateSchema({ items: [{ title: 2 }] }, { type: "object", properties: { items: { type: "array", items: schema } } }), /items\[0\].title/);
});

async function retry(sequence, extra = {}) {
    const calls = [], logs = [], delays = [];
    const client = { models: { generateContent: async request => {
        calls.push(request);
        const item = sequence[Math.min(calls.length - 1, sequence.length - 1)];
        if (item instanceof Error) throw item;
        return item;
    } } };
    const promise = generateJsonWithRetry({ client, request: { model: "fixture", contents: "PRIVATE SOURCE" }, ...options,
        stage: "fixture", slideNumber: 4, logger: entry => logs.push(entry), sleep: async ms => delays.push(ms), ...extra });
    return { promise, calls, logs, delays };
}
test("first-attempt success logs usage without source or output", async () => {
    const run = await retry([response()]);
    await run.promise;
    assert.equal(run.calls.length, 1);
    assert.equal(run.calls[0].config.httpOptions.retryOptions.attempts, 1);
    assert.equal(run.logs[0].usage.promptTokenCount, 12);
    assert.ok(!JSON.stringify(run.logs).includes("PRIVATE SOURCE"));
    assert.ok(!JSON.stringify(run.logs).includes("Valid title"));
});
test("malformed then successful response retries once", async () => {
    const run = await retry([{ ...response(), text: "{" }, response()]);
    await run.promise;
    assert.equal(run.calls.length, 2);
    assert.ok(run.calls[1].contents.includes("AI_JSON_PARSE_FAILED"));
});
test("retry exhaustion retains final cause and slide", async () => {
    const run = await retry([{ ...response(), text: "{" }]);
    await assert.rejects(run.promise, error => error.code === "AI_RETRY_EXHAUSTED" && error.lastErrorCode === "AI_JSON_PARSE_FAILED" && error.slideNumber === 4);
    assert.equal(run.calls.length, 3);
});
for (const status of [400, 401, 403, 404]) test(`provider ${status} does not retry`, async () => {
    const run = await retry([Object.assign(new Error("Sensitive provider message"), { status })]);
    await assert.rejects(run.promise, error => error.code === "AI_PROVIDER_ERROR" && !error.message.includes("Sensitive"));
    assert.equal(run.calls.length, 1);
});
test("transient errors back off and stop after three attempts", async () => {
    const run = await retry([Object.assign(new Error("Unavailable"), { status: 503 })]);
    await assert.rejects(run.promise, error => error.code === "AI_RETRY_EXHAUSTED" && error.lastErrorCode === "AI_PROVIDER_TRANSIENT");
    assert.deepEqual(run.delays, [500, 1000]);
});
test("invalid slide content is retried inside the slide stage", async () => {
    const run = await retry([response(), response({ title: "Accepted title" })], { validate: value => { if (value.title !== "Accepted title") throw new Error("Missing content.textContent.body"); } });
    await run.promise;
    assert.equal(run.calls.length, 2);
});
test("blocked output is not retried", async () => {
    const run = await retry([{ ...response(), candidates: [{ finishReason: "SAFETY" }] }]);
    await assert.rejects(run.promise, error => error.code === "AI_RESPONSE_BLOCKED");
    assert.equal(run.calls.length, 1);
});

const outline = { title: "Topic", slides: [{ slideNumber: 1, slideType: "title", title: "Topic" }, { slideNumber: 2, slideType: "focused-explanation", title: "Explanation" }] };
test("outline checks numbering, duplicates, slide count and first slide", () => {
    validateOutline(outline);
    for (const slides of [[], [{ slideNumber: 2, slideType: "title", title: "Topic" }], [{ slideNumber: 1, slideType: "process", title: "Topic" }], [...outline.slides, { slideNumber: 3, slideType: "summary", title: "Explanation" }]]) {
        assert.throws(() => validateOutline({ ...outline, slides }));
    }
});
test("canonical contract covers every supported slide type", () => {
    assert.deepEqual(Object.keys(SLIDE_TYPE_CONTENT_MAP).sort(), slideTypes.map(type => type.id).sort());
});

import { fixtures } from "../fixtures/presentationContent.mjs";
for (const [slideType, key] of Object.entries(SLIDE_TYPE_CONTENT_MAP)) {
    test(`${slideType} accepts canonical fixture and rejects missing content`, () => {
        const slide = { slideNumber: 1, slideType, title: "Source review", content: { [key]: fixtures[key] } };
        validateSlideContent(slide);
        assert.throws(() => validateSlideContent({ ...slide, content: {} }));
        assert.throws(() => validateSlideContent({ ...slide, content: { wrongKey: fixtures[key] } }));
    });
}

for (const inputType of ["prompt", "file", "url"]) test(`${inputType} prompts preserve source and grounding constraints`, () => {
    const source = "Trial title only; results not supplied.";
    const prompt = buildOutlinePrompt(inputType, source, { audience: "Researchers" });
    assert.ok(prompt.includes(source));
    assert.ok(prompt.includes("Never invent study-specific"));
    assert.ok(prompt.includes("quantitative data in the input"));
    const slidePrompt = buildSlidePrompt("Results: 12 samples; 8 met the criterion.", {}, outline, outline.slides[1], [{ title: "Topic", content: "Previously covered fact" }]);
    assert.ok(slidePrompt.includes("12 samples; 8"));
    assert.ok(slidePrompt.includes("Previously covered fact"));
});

process.env.GEMINI_API_KEY ||= "test-key-never-used";
const { aiService } = await import("../../Service/aiService.mjs");
const inferredContext = { userRole: "", purpose: "Explain source review", audience: "Readers", topic: "Source review", tone: "professional", keyInstructions: [] };
const plan = { outputType: "presentation", inferredContext, strategyId: "academic-seminar", title: "Source review",
    slides: [{ slideNumber: 1, slideType: "title", title: "Source review" }, { slideNumber: 2, slideType: "focused-explanation", title: "Careful source review" }, { slideNumber: 3, slideType: "summary", title: "Review takeaways" }] };
for (const category of ["educational", "academic research", "business", "startup pitch", "technical"]) {
    test(`${category} runs the actual two-stage service and retries only the invalid slide`, async () => {
        const calls = [], logs = [];
        let textAttempts=0;
        const client = { models: { generateContent: async request => {
            calls.push(request);const properties=request.config.responseJsonSchema.properties;
            return response(properties.coverage?{coverage:[],issues:[]}:properties.strategyId?plan:
                properties.titleContent?{titleContent:fixtures.titleContent}:properties.summary?{summary:fixtures.summary}:
                {textContent:++textAttempts===1?{}:fixtures.textContent});
        } } };
        const result = await aiService("prompt", `Create a ${category} presentation on source review.`, "presentation", { slideCount: 3 }, { client, logger: log => logs.push(log), sleep: async () => {} });
        assert.equal(result.generatedContent.slides.length, 3);
        assert.equal(calls.length, 6);
        assert.ok(calls[0].contents.includes("outline only"));
        assert.ok(calls.find(call=>call.config.responseJsonSchema.properties.summary).contents.includes("Earlier slide content"));
        assert.equal(logs.filter(log => log.status === "failed")[0].slideNumber, 2);
        // Every generated content fixture also conforms to the exact schema sent to Gemini.
        for (const [slideType, key] of Object.entries(SLIDE_TYPE_CONTENT_MAP)) {
            // The outline's slide enum must cover the shared semantic contract.
            assert.ok(calls[0].config.responseJsonSchema.properties.slides.items.properties.slideType.enum.includes(slideType));
        }
    });
}

function fromSchema(schema) {
    if (schema.enum) return schema.enum[0];
    const type = schema.type.toLowerCase();
    if (type === "object") return Object.fromEntries(Object.entries(schema.properties).map(([key, value]) => [key, fromSchema(value)]));
    if (type === "array") return [fromSchema(schema.items)];
    if (type === "integer" || type === "number") return 1;
    if (type === "boolean") return true;
    return "A meaningful fixture paragraph explaining the supplied source.";
}
for (const outputType of ["document"]) test(`${outputType} retains its output shape and supports long paragraphs`, async () => {
    let calls = 0;
    const {documentFixtureClient}=await import('../fixtures/documentFixtures.mjs');
    const result = await aiService("file", "Source review guidelines", outputType, {wordCount:1000}, { logger: () => {}, client:documentFixtureClient({paragraph:Array.from({length:300},(_,n)=>`Paragraph sentence ${n}.`).join(' '),targetWords:1000,onRequest:()=>calls++}) });
    assert.equal(result.outputType, outputType);
    assert.equal(result.generatedContent.outputType, outputType);
    assert.equal(calls, 3);
});

test("quantitative slides require supplied data and preserve percentages", () => {
    const chart = { slideNumber: 2, slideType: "data-chart", content: { chart: fixtures.chart } };
    validateQuantitativeGrounding(chart, "Source data: Draft 12; Reviewed 8.");
    assert.throws(() => validateQuantitativeGrounding(chart, "Make 12 slides about source review."));
    assert.throws(() => validateQuantitativeGrounding(chart, "Source data: Draft 12; Reviewed 7."));
    const statistic = { slideNumber: 2, slideType: "statistics", content: { statistics: [{ value: "12%" }] } };
    validateQuantitativeGrounding(statistic, "The supplied result was 12%.");
    assert.throws(() => validateQuantitativeGrounding(statistic, "There were 12 participants."));
    assert.throws(() => validateQuantitativeGrounding(statistic, "Research title only; no results supplied."));
});

for (const [slideType, key] of Object.entries(SLIDE_TYPE_CONTENT_MAP)) test(`${slideType} fixture matches the actual Gemini content schema`, async () => {
    let calls = 0;
    let captured;
    const chosen = { ...plan, slides: [plan.slides[0], { slideNumber: 2, slideType, title: "Distinct content" }] };
    const client = { models: { generateContent: async request => {
        calls++;
        if (calls === 1) return response(chosen);
        if (calls === 2) return response({ titleContent: fixtures.titleContent });
        captured = request.config.responseJsonSchema;
        throw Object.assign(new Error("End schema capture"), { status: 401 });
    } } };
    await assert.rejects(aiService("prompt", "Source review data: Draft 12; Reviewed 8.", "presentation", { slideCount: 2 }, { client, logger: () => {} }), error => error.providerStatus === 401);
    validateSchema({ [key]: fixtures[key] }, captured);
    assert.throws(() => validateSchema({ [key]: fixtures[key], unexpected: "extra" }, captured));
});

for (const requested of [null, 5, 9, 12]) test(`actual AI service enforces ${requested ?? 'default 8–10'} total slides`, async () => {
    const count = requested ?? 9;
    const types = Object.keys(SLIDE_TYPE_CONTENT_MAP).filter(t => !['title', 'summary'].includes(t));
    const chosen = { ...plan, slides: Array.from({ length: count }, (_, i) => ({ slideNumber: i + 1,
        slideType: i === 0 ? 'title' : i === count - 1 ? 'summary' : types[i - 1], title: `Distinct source topic ${i + 1}` })) };
    let calls = 0;
    const client = { models: { generateContent: async request => {
        if(request.config.responseJsonSchema.properties.coverage){calls++;return response({coverage:[],issues:[]});}
        if (calls++ === 0) {
            const s = request.config.responseJsonSchema.properties.slides;
            assert.equal(s.minItems,undefined);assert.equal(s.maxItems,undefined);
            assert.ok(request.contents.includes(requested?`exactly ${requested}`:'8–10'));
            return response(chosen);
        }
        const key = SLIDE_TYPE_CONTENT_MAP[chosen.slides[calls - 2].slideType];
        return response({ [key]: fixtures[key] });
    } } };
    const result = await aiService('prompt', 'Explain source review.', 'presentation', requested ? { slideCount: requested } : {}, { client, logger: () => {} });
    assert.equal(result.generatedContent.slides.length, count);
    assert.equal(calls, count + 2);
});

test('default outline counts remain enforced locally after simplifying the provider schema',async()=>{
    let calls=0;
    await assert.rejects(aiService('prompt','Explain source review.','presentation',{}, {
        client:{models:{generateContent:async()=>{calls++;return response(plan);}}},logger:()=>{},sleep:async()=>{}
    }),error=>error.code==='AI_RETRY_EXHAUSTED'&&error.stage==='presentation-outline'&&error.lastErrorCode==='AI_SCHEMA_VALIDATION_FAILED');
    assert.equal(calls,3);
});

test('readability repair identifies the field and supplies a concrete character budget', async () => {
    const run = await retry([response(), response({ title: 'Accepted title' })], { validate: value => {
        if (value.title !== 'Accepted title') throw Object.assign(new Error('Too dense'), { field: 'items[0].description', maxCharacters: 70 });
    } });
    await run.promise;
    assert.ok(run.calls[1].contents.includes('items[0].description'));
    assert.ok(run.calls[1].contents.includes('at most 70 characters'));
});

for (const inputType of ['url', 'file']) test(`${inputType} final source validation handles supplied numbers without a ReferenceError`, () => {
    const content = { ...plan, slides: plan.slides.map(slide => ({ ...slide, content: { [SLIDE_TYPE_CONTENT_MAP[slide.slideType]]: structuredClone(fixtures[SLIDE_TYPE_CONTENT_MAP[slide.slideType]]) } })) };
    content.slides[1].content.textContent.body = 'Source review examined 12 files, with 8 reviewed and 4 pending.';
    validatePresentationContent(content, { inputType, input: 'Source review examined 12 files, with 8 reviewed and 4 pending.' });
    content.slides[1].content.textContent.body = 'Source review examined 120 files, with 180 reviewed and 240 pending.';
    assert.throws(() => validatePresentationContent(content, { inputType, input: 'Source review examined 12 files, with 8 reviewed and 4 pending.' }), /unsupported|source|numerical/i);
});
