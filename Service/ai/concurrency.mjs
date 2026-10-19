export function generationConcurrency(value, fallback=4) {
    const parsed=value==null||value===''?fallback:Number(value);
    if(!Number.isInteger(parsed)||parsed<1||parsed>6)throw Object.assign(new Error('Generation concurrency must be an integer from 1 to 6.'),{code:'INVALID_GENERATION_CONCURRENCY'});
    return parsed;
}

// A batch shares one stable snapshot of earlier content. Commit results in
// outline order only after every in-flight call settles, including on failure.
export async function generateInBatches(items,concurrency,generate,commit) {
    for(let offset=0;offset<items.length;offset+=concurrency) {
        const batch=items.slice(offset,offset+concurrency);
        const results=await Promise.allSettled(batch.map((item,index)=>Promise.resolve().then(()=>generate(item,offset+index))));
        const failed=results.find(result=>result.status==='rejected');
        if(failed)throw failed.reason;
        for(let index=0;index<batch.length;index++)await commit(results[index].value,batch[index],offset+index);
    }
}

// Keep independent provider slots busy when another unit is a straggler.
// Commit only the completed outline prefix; drain in-flight work on failure.
export async function generateIndependent(items,concurrency,generate,commit){
    const results=new Map();let next=0,committed=0,failure,commitTail=Promise.resolve();
    async function flush(){
        while(results.has(committed)){
            const index=committed,value=results.get(index);results.delete(index);
            await commit(value,items[index],index);committed++;
        }
    }
    async function worker(){
        while(!failure&&next<items.length){
            const index=next++;
            try{
                results.set(index,await generate(items[index],index));
                commitTail=commitTail.then(flush);await commitTail;
            }catch(error){failure??=error;}
        }
    }
    await Promise.all(Array.from({length:Math.min(concurrency,items.length)},worker));
    if(failure)throw failure;
}
export function generateContentUnits(...args){
    return process.env.LEDIFY_GENERATION_SCHEDULER==='batch'?generateInBatches(...args):generateIndependent(...args);
}
