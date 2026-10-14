// Synthetic provider latency measures scheduling only, not live Gemini speed.
import fs from 'node:fs/promises';
import {fixtures} from './fixtures/presentationContent.mjs';
process.env.GEMINI_API_KEY ||= 'test-key-never-used';
const {aiService}=await import('../Service/aiService.mjs');
const latencyMs=100,results=[];
for(const concurrency of [1,4]) {
    let calls=0;
    const plan={outputType:'presentation',strategyId:'business-strategy',title:'Source review',
        inferredContext:{userRole:'',purpose:'Explain source review',audience:'Readers',topic:'Source review',tone:'professional',keyInstructions:[]},
        slides:Array.from({length:10},(_,index)=>({slideNumber:index+1,slideType:index===0?'title':index===9?'summary':'focused-explanation',title:`Source review topic ${index+1}`}))};
    const client={models:{generateContent:async request=>{
        calls++;await new Promise(resolve=>setTimeout(resolve,latencyMs));
        const properties=request.config.responseJsonSchema.properties,key=Object.keys(properties)[0];
        const value=properties.strategyId?structuredClone(plan):properties.coverage?{coverage:[],issues:[]}:{[key]:structuredClone(fixtures[key])};
        return {text:JSON.stringify(value),candidates:[{finishReason:'STOP'}]};
    }}};
    const started=performance.now();
    const result=await aiService('prompt','Create exactly 10 slides explaining source review.','presentation',{}, {client,logger:()=>{},slideConcurrency:concurrency});
    results.push({concurrency,elapsedMs:Math.round(performance.now()-started),providerCalls:calls,slides:result.generatedContent.slides.length,reviewed:result.generatedContent.quality.reviewed});
}
const report={kind:'synthetic-provider-latency',latencyPerCallMs:latencyMs,includesRendering:false,results,reductionPercent:Math.round((1-results[1].elapsedMs/results[0].elapsedMs)*100)};
await fs.mkdir('generated',{recursive:true});await fs.writeFile('generated/generation-latency-benchmark.json',JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));
