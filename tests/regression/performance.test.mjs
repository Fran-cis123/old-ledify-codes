import test from 'node:test';
import assert from 'node:assert/strict';
import { generationConcurrency,generateInBatches } from '../../Service/ai/concurrency.mjs';
import { generateDocumentContent } from '../../Service/document/documentGeneration.mjs';
import { documentParagraph } from '../fixtures/documentFixtures.mjs';
import { fixtures } from '../fixtures/presentationContent.mjs';
process.env.GEMINI_API_KEY ||= 'test-key-never-used';
const {aiService}=await import('../../Service/aiService.mjs');
const reply=value=>({text:JSON.stringify(value),candidates:[{finishReason:'STOP'}]});
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
export function presentationLatencyClient(latencyMs=10) {
    const state={active:0,peak:0,calls:0};
    const plan={outputType:'presentation',strategyId:'business-strategy',title:'Source review',
        inferredContext:{userRole:'',purpose:'Explain source review',audience:'Readers',topic:'Source review',tone:'professional',keyInstructions:[]},
        slides:Array.from({length:10},(_,index)=>({slideNumber:index+1,slideType:index===0?'title':index===9?'summary':'focused-explanation',title:`Source review topic ${index+1}`}))};
    const client={models:{generateContent:async request=>{
        state.calls++;state.active++;state.peak=Math.max(state.peak,state.active);
        try {
            await pause(latencyMs);const properties=request.config.responseJsonSchema.properties;
            if(properties.strategyId)return reply(structuredClone(plan));
            if(properties.coverage)return reply({coverage:[],issues:[]});
            const key=Object.keys(properties)[0];return reply({[key]:structuredClone(fixtures[key])});
        } finally {state.active--;}
    }}};
    return {client,state};
}

test('ten-slide AI generation overlaps bounded calls while preserving canonical order and quality review',async()=>{
    const {client,state}=presentationLatencyClient();
    const result=await aiService('prompt','Create exactly 10 slides explaining source review.','presentation',{}, {client,logger:()=>{},slideConcurrency:4});
    assert.equal(state.peak,4);assert.equal(state.active,0);assert.equal(state.calls,12);
    assert.deepEqual(result.generatedContent.slides.map(slide=>slide.slideNumber),[1,2,3,4,5,6,7,8,9,10]);
    assert.equal(result.generatedContent.quality.reviewed,true);
});

test('validated out-of-order slides notify image prefetch before ordered checkpoints advance',async()=>{
 const {client}=presentationLatencyClient(1),original=client.models.generateContent;
 let release;const gate=new Promise(resolve=>{release=resolve;});const ready=[],checkpoints=[],budgets=[];
 client.models.generateContent=async request=>{
  const keys=Object.keys(request.config.responseJsonSchema.properties);
  if(keys.includes('titleContent'))await gate;
  if(!keys.includes('strategyId')&&!keys.includes('coverage'))budgets.push(request.config.thinkingConfig?.thinkingBudget);
  return original(request);
 };
 await aiService('prompt','Create exactly 10 slides explaining source review.','presentation',{}, {
  client,logger:()=>{},slideConcurrency:4,
  onSlideReady:async slide=>{ready.push(slide.slideNumber);assert.ok(slide.content);if(slide.slideNumber===2){assert.ok(!checkpoints.some(numbers=>numbers.includes(2)));release();}},
  onSlideCheckpoint:async deck=>checkpoints.push(deck.slides.filter(s=>s.content).map(s=>s.slideNumber))
 });
 assert.ok(ready.indexOf(2)<ready.indexOf(1));
 assert.ok(budgets.every(value=>value>=128&&value<=8192));
 for(const numbers of checkpoints)assert.deepEqual(numbers,Array.from({length:numbers.length},(_,i)=>i+1));
});

test('document sections overlap, retain ordered checkpoints and complete full-document validation',async()=>{
    let active=0,peak=0;const checkpoints=[];
    const sections=Array.from({length:3},(_,index)=>({id:`section-${index}`,heading:`API topic ${index}`,objective:'Explain REST APIs',topics:[],targetWords:100}));
    const client={models:{generateContent:async request=>{
        const properties=request.config.responseJsonSchema.properties;
        if(properties.documentType)return reply({documentType:'technical-documentation',title:'REST APIs',audience:'Developers',purpose:'Explain API design',tone:'professional',coverPage:false,sections});
        if(properties.issues)return reply({issues:[]});
        const section=JSON.parse(request.contents.split('Generate only ')[1].split('. Target ')[0]);
        active++;peak=Math.max(peak,active);
        try{await pause((3-Number(section.id.at(-1)))*5);return reply({id:section.id,heading:section.heading,blocks:[{type:'paragraph',text:`Topic ${section.id}: ${documentParagraph}`}]});}
        finally{active--;}
    }}};
    const document=await generateDocumentContent({client,inputType:'prompt',input:'Explain REST APIs',context:{wordCount:300},options:{logger:()=>{},sectionConcurrency:3,onCheckpoint:document=>checkpoints.push(document.sections.map(section=>section.id))}});
    assert.equal(peak,3);assert.equal(active,0);assert.equal(document.quality.status,'reviewed');
    assert.deepEqual(document.sections.map(section=>section.id),sections.map(section=>section.id));
    assert.deepEqual(checkpoints,[['section-0'],['section-0','section-1'],['section-0','section-1','section-2']]);
});

test('failed batches drain in-flight work, commit no partial batch and start no later batch',async()=>{
    const started=[],completed=[],committed=[];
    await assert.rejects(generateInBatches([1,2,3,4],2,async value=>{
        started.push(value);if(value===1)throw new Error('Provider failure');await pause(10);completed.push(value);return value;
    },value=>committed.push(value)),/Provider failure/);
    assert.deepEqual(started,[1,2]);assert.deepEqual(completed,[2]);assert.deepEqual(committed,[]);
});

test('concurrency configuration is bounded and serial mode remains available',async()=>{
    assert.equal(generationConcurrency(undefined),4);assert.equal(generationConcurrency('1'),1);
    for(const invalid of [0,7,1.5,'invalid'])assert.throws(()=>generationConcurrency(invalid),{code:'INVALID_GENERATION_CONCURRENCY'});
    const {client,state}=presentationLatencyClient(1);
    await aiService('prompt','Create exactly 10 slides explaining source review.','presentation',{}, {client,logger:()=>{},slideConcurrency:1});assert.equal(state.peak,1);
});
