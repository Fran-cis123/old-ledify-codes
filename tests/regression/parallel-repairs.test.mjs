import test from 'node:test';
import assert from 'node:assert/strict';
import {reviewAndRepairPresentation} from '../../Service/ai/presentationQuality.mjs';
import {profileGeneration} from '../../Service/performance.mjs';
import {generateJsonWithRetry,repairFieldHint,providerRetryDelay} from '../../Service/ai/generateJsonWithRetry.mjs';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {resolvePresentationVisuals} from '../../Service/visual/presentationVisuals.mjs';
import {presentationLayoutService} from '../../Service/presentationLayoutService.mjs';
import {presentationThemeService} from '../../Service/presentationThemeService.mjs';
import {presentationRendererService} from '../../Service/presentationRendererService.mjs';

const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
test('provider backoff honors retry hints within a bounded delay',()=>{
    assert.equal(providerRetryDelay({headers:{'retry-after':'2'}},1),2000);
    assert.equal(providerRetryDelay({error:{details:[{retryDelay:'0.8s'}]}},2),800);
    assert.equal(providerRetryDelay({headers:new Headers({'Retry-After':'900'})},1),60000);
    assert.equal(providerRetryDelay({},2),1000);
});
test('renderer table coordinates map to actual JSON fields for targeted retries',()=>{
    assert.equal(repairFieldHint('table[1][3]'),'table.rows[0].cells[3]');
    assert.equal(repairFieldHint('table[0][2]'),'table.columns[2]');
    assert.equal(repairFieldHint('visualContent.text'),'visualContent.text');
});
export async function repairScenario(run=reviewAndRepairPresentation,{delayMs=30,fail=false}={}) {
    const presentation={title:'Evidence review',slides:Array.from({length:4},(_,i)=>({slideNumber:i+1,slideType:'focused-explanation',title:'Evidence '+i,content:{textContent:{body:'Initial explanation'}}}))};
    let reviews=0,active=0,peak=0;const started=[],finished=[];
    const client={models:{generateContent:async()=>({text:JSON.stringify({coverage:[],issues:reviews++===0?presentation.slides.map(s=>({slideNumber:s.slideNumber,severity:'error',code:'DEPTH',message:'Explain the distinction',repairInstruction:'Preserve source evidence'})):[]}),candidates:[{finishReason:'STOP'}]})}};
    let failure;
    try{await run({presentation,input:'Explain evidence',inputType:'prompt',context:{},client,options:{slideConcurrency:2,logger:()=>{}},repairSlide:async slide=>{
        started.push(slide.slideNumber);peak=Math.max(peak,++active);
        try{await sleep(delayMs+(slide.slideNumber===1?delayMs:0));if(fail&&slide.slideNumber===2)throw new Error('repair failed');finished.push(slide.slideNumber);return {textContent:{body:'Repaired '+slide.slideNumber}};}finally{active--;}
    }});}catch(error){failure=error;}
    return {presentation,active,peak,started,finished,reviews,failure};
}

test('independent semantic repairs overlap within the configured cap and commit by slide number',async()=>{
    const result=await repairScenario();assert.ifError(result.failure);
    assert.equal(result.peak,2);assert.equal(result.active,0);assert.equal(result.reviews,2);
    assert.deepEqual(result.presentation.slides.map(s=>s.content.textContent.body),[1,2,3,4].map(n=>'Repaired '+n));
});
test('a failed semantic repair drains in-flight work and prevents another review',async()=>{
    const result=await repairScenario(undefined,{fail:true});assert.match(result.failure.message,/repair failed/);
    assert.equal(result.active,0);assert.equal(result.reviews,1);assert.deepEqual(result.started,[1,2]);
});
test('timing separates provider time from validation and reports process resource counters',async()=>{
    let report,entry;
    await profileGeneration(()=>generateJsonWithRetry({client:{models:{generateContent:async()=>{await sleep(25);return {text:'{"ok":true}',candidates:[{finishReason:'STOP'}]};}}},request:{model:'fixture',contents:'test',config:{}},schema:{type:'object',properties:{ok:{type:'boolean'}},required:['ok']},outputType:'document',stage:'fixture',logger:value=>{entry=value;}}),{logger:()=>{},onReport:value=>{report=value;}});
    assert.ok(entry.providerMs>=20);assert.ok(entry.queueWaitMs>=0);assert.ok(entry.validationMs>=0);
    assert.equal(report.ai.providerMs,entry.providerMs);assert.ok(report.processCpuMs.user>=0);assert.ok(report.eventLoop.maxDelayMs>=0);
});
test('diagram planning overlaps within its cap, retains its three-call budget and preserves slide order',async t=>{
    const root=await fs.mkdtemp(path.join(os.tmpdir(),'ledify-diagrams-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));
    const deck={outputType:'presentation',strategyId:'academic-seminar',title:'Evidence review',slides:[1,2,3,4].map(slideNumber=>({slideNumber,slideType:'text-visual',title:'Evidence '+slideNumber,visualRequirement:{role:'foreground',kind:'diagram',description:'Evidence comparison'},content:{visualContent:{text:'Compare the supplied evidence with observations.',visual:{type:'diagram',description:'Evidence comparison',searchQuery:'evidence comparison'}}}}))};
    deck.slides= [{slideNumber:1,slideType:'title',title:'Evidence review',content:{titleContent:{title:'Evidence review',subtitle:'A laboratory evidence briefing'}}},...deck.slides.map(slide=>({...slide,slideNumber:slide.slideNumber+1}))];
    const ready=presentationRendererService(presentationThemeService(presentationLayoutService(deck)));
    let active=0,peak=0,calls=0;
    const result=await resolvePresentationVisuals(ready,{instructions:'No photography'},{external:true,cacheRoot:root,userAssets:[{buffer:await fs.readFile('assets/webpage/curated/laboratory.jpg'),slideNumber:1,source:'Authorized test fixture',creator:'Fixture',license:'Test fixture',description:'Laboratory evidence review'}],diagramConcurrency:2,diagramPlanner:async()=>{
        calls++;peak=Math.max(peak,++active);await sleep(40);active--;
        return {kind:'labeled',nodes:[{id:'a',label:'Source',description:'Supplied evidence'},{id:'b',label:'Review',description:'Check observations'}],edges:[],caption:'Simplified comparison'};
    }});
    assert.equal(calls,3);assert.equal(peak,2);assert.equal(active,0);
    assert.deepEqual(result.slides.map(s=>s.slideNumber),[1,2,3,4,5]);
    assert.equal(result.slides.filter(s=>s.resolvedVisual?.kind==='diagram').length,3);
    assert.ok(result.warnings.some(w=>w.code==='VISUAL_UNRESOLVED'&&w.slideNumber===5));
});
