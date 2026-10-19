// A per-process bound on native conversion memory. No persistence or job semantics implied.
export function createRenderQueue({concurrency=1,maxWaiting=4,waitMs=90000}={}){
    let active=0;const waiting=[];
    const busy=()=>Object.assign(new Error('Presentation rendering is busy. Retry shortly.'),{code:'PRESENTATION_RENDER_BUSY',stage:'presentation-rendering'});
    function release(){
        active--;const next=waiting.shift();
        if(next){clearTimeout(next.timer);active++;next.resolve(release);}
    }
    return {async acquire(){
        if(active<concurrency){active++;return release;}
        if(waiting.length>=maxWaiting)throw busy();
        return new Promise((resolve,reject)=>{
            const entry={resolve,timer:setTimeout(()=>{const i=waiting.indexOf(entry);if(i>=0)waiting.splice(i,1);reject(busy());},waitMs)};
            waiting.push(entry);
        });
    }};
}
const configured=Number(process.env.LEDIFY_RENDER_CONCURRENCY||1);
export const presentationRenderQueue=createRenderQueue({concurrency:Number.isInteger(configured)?Math.max(1,Math.min(2,configured)):1});
