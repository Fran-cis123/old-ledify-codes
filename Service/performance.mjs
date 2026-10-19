import {AsyncLocalStorage} from 'node:async_hooks';
import {randomUUID} from 'node:crypto';
const storage=new AsyncLocalStorage();
export function performanceReport(){
    const state=storage.getStore();if(!state)return undefined;
    return {requestId:state.id,totalMs:Math.round(performance.now()-state.started),stages:state.stages,ai:state.ai,
        memory:{startRssBytes:state.startRss,peakRssBytes:state.peakRss,endRssBytes:process.memoryUsage().rss}};
}
export function recordAiAttempt(entry){
    const state=storage.getStore();if(!state)return;
    const stage=state.ai.stages[entry.stage]??={calls:0,retries:0,elapsedMs:0,promptTokens:0,outputTokens:0,totalTokens:0};
    for(const target of [state.ai,stage]){
        target.calls++;target.retries+=entry.attempt>1?1:0;target.elapsedMs+=entry.elapsedMs||0;
        target.promptTokens+=entry.usage?.promptTokenCount||0;target.outputTokens+=entry.usage?.candidatesTokenCount||0;target.totalTokens+=entry.usage?.totalTokenCount||0;
    }
    state.onProgress?.({stage:entry.stage,status:entry.status,slideNumber:entry.slideNumber,sectionId:entry.sectionId,attempt:entry.attempt});
}
export async function measureStage(name,fn){
    const state=storage.getStore();if(!state)return fn();
    const started=performance.now();state.onProgress?.({stage:name,status:'processing'});
    try{const value=await fn();state.onProgress?.({stage:name,status:'completed'});return value;}
    catch(error){state.onProgress?.({stage:name,status:'failed'});throw error;}
    finally{const metric=state.stages[name]??={calls:0,elapsedMs:0};metric.calls++;metric.elapsedMs+=Math.round(performance.now()-started);}
}
export async function profileGeneration(fn,options={}){
    if(storage.getStore()&&!options.forceNew)return fn();
    const state={id:randomUUID(),started:performance.now(),startRss:process.memoryUsage().rss,peakRss:0,stages:{},onProgress:options.onProgress,
        ai:{calls:0,retries:0,elapsedMs:0,promptTokens:0,outputTokens:0,totalTokens:0,stages:{}}};
    state.peakRss=state.startRss;
    return storage.run(state,async()=>{
        const timer=setInterval(()=>{state.peakRss=Math.max(state.peakRss,process.memoryUsage().rss);},100);timer.unref();
        try{return await fn();}finally{
            clearInterval(timer);state.peakRss=Math.max(state.peakRss,process.memoryUsage().rss);
            const report=performanceReport();options.onReport?.(report);
            (options.logger||((report)=>console.info('[PERF]',JSON.stringify(report))))(report);
        }
    });
}
