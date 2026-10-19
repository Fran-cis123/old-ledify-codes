// Text requests share one process-wide provider budget across HTTP requests and
// background jobs. Image generation retains its separate, smaller budget.
const limit=Math.max(1,Math.min(12,Number(process.env.LEDIFY_AI_CONCURRENCY)||6));
let active=0;const waiting=[];
export async function withAiCapacity(fn){
    if(active>=limit){
        if(waiting.length>=32)throw Object.assign(new Error('AI request capacity is occupied'),{code:'AI_PROVIDER_BUSY'});
        await new Promise((resolve,reject)=>{
            const entry={resolve};entry.timer=setTimeout(()=>{const i=waiting.indexOf(entry);if(i>=0)waiting.splice(i,1);reject(Object.assign(new Error('AI queue timed out'),{code:'AI_PROVIDER_BUSY'}));},90000);waiting.push(entry);
        });
    }else active++;
    try{return await fn();}finally{
        const next=waiting.shift();if(next){clearTimeout(next.timer);next.resolve();}else active--;
    }
}
