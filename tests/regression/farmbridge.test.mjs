import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { requestedTopics,visibleSlideText } from '../../Service/ai/presentationQuality.mjs';
import { validateQuantitativeGrounding } from '../../Service/ai/sourceGrounding.mjs';
import { fixtures } from '../fixtures/presentationContent.mjs';
process.env.GEMINI_API_KEY ||= 'test-key-never-used';
const {aiService}=await import('../../Service/aiService.mjs');
const request=JSON.parse((await fs.readFile(new URL('../fixtures/farmbridge-request.json',import.meta.url),'utf8')).replace(/^\uFEFF/,''));
const chart={chartType:'column',labels:['Year 1','Year 2','Year 3'],datasets:[{label:'Illustrative revenue (NGN millions)',values:[12,24,48]}],insight:'Illustrative assumptions, not actual company performance.'};

test('exact FarmBridge request reaches slide ten, retries only the malformed revenue chart and completes review',async()=>{
    const types=['title','focused-explanation','focused-explanation','process','focused-explanation','focused-explanation','table','focused-explanation','data-chart','conclusion'];
    const titles=['FarmBridge AI','Agricultural challenges','AI-powered solution','Platform workflow','Target customers','Business model','Competitive advantages','Go-to-market strategy','Illustrative financial projections','Investment opportunity'];
    const topics=requestedTopics(request.textPrompt);
    const plan={outputType:'presentation',strategyId:'business-strategy',title:'FarmBridge AI',subtitle:'Insights for smallholder farmers',
        inferredContext:{userRole:'',purpose:'Illustrative investor pitch',audience:'Investors',topic:'Agritech',tone:'professional',keyInstructions:[]},
        requirements:topics.map(topic=>({topic,slideNumbers:[9],essentialPoints:['Describe the requested illustrative startup concept.']})),
        slides:types.map((slideType,index)=>({slideNumber:index+1,slideType,title:titles[index]}))};
    const keys={title:'titleContent','focused-explanation':'textContent',process:'process',table:'table','data-chart':'chart',conclusion:'conclusion'};
    const logs=[],attempts=new Map();let reviewReached=false;
    const client={models:{generateContent:async providerRequest=>{
        const properties=providerRequest.config.responseJsonSchema.properties;
        let value;
        if(properties.strategyId)value=plan;
        else if(properties.coverage){
            reviewReached=true;assert.match(providerRequest.contents,/hypothetical\/illustrative projections are permitted/);
            value={coverage:topics.map(topic=>({topic,slideNumbers:[9],evidence:chart.insight,adequate:true})),issues:[]};
        } else {
            const current=JSON.parse(providerRequest.contents.split('Current slide: ')[1].split('\n')[0]);
            const attempt=(attempts.get(current.slideNumber)||0)+1;attempts.set(current.slideNumber,attempt);
            const key=keys[current.slideType];value={[key]:structuredClone(key==='chart'?chart:fixtures[key])};
            if(current.slideNumber===9&&attempt===1)value.chart.datasets[0].values=[12,24];
            if(current.slideNumber===9&&attempt===2)assert.match(providerRequest.contents,/contains 2 values but chart has 3 labels/);
        }
        return {text:JSON.stringify(value),candidates:[{finishReason:'STOP'}]};
    }}};
    const result=await aiService('prompt',request.textPrompt,'presentation',{}, {client,logger:entry=>logs.push(entry),sleep:async()=>{}});
    assert.equal(result.generatedContent.slides.length,10);assert.equal(attempts.get(10),1);assert.equal(attempts.get(9),2);
    assert.equal([...attempts.values()].reduce((sum,n)=>sum+n,0),11);assert.equal(reviewReached,true);
    assert.equal(result.generatedContent.quality.reviewed,true);assert.deepEqual(result.generatedContent.slides[8].content.chart,chart);
    assert.match(visibleSlideText(result.generatedContent.slides[8]),/not actual company performance/);
    assert.deepEqual(logs.filter(entry=>entry.status==='failed').map(entry=>entry.slideNumber),[9]);
    assert.ok(!JSON.stringify(logs).includes(request.textPrompt));
});

test('FarmBridge permission does not allow unlabeled projections or invent real company results',()=>{
    const slide={slideNumber:9,slideType:'data-chart',title:'Revenue projections',content:{chart:structuredClone(chart)}};
    validateQuantitativeGrounding(slide,request.textPrompt);
    slide.content.chart.insight='Actual revenue results';
    assert.throws(()=>validateQuantitativeGrounding(slide,request.textPrompt),error=>error.field==='chart.insight');
    slide.content.chart=chart;
    assert.throws(()=>validateQuantitativeGrounding(slide,'Show real company revenue for three years.'),error=>error.field==='chart.datasets');
});
