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
