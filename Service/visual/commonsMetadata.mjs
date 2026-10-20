import {setTimeout as sleep} from 'node:timers/promises';

// Serialize Commons metadata requests across decks. A retry must respect the
// provider's cooldown rather than immediately trying several other queries.
export function createCommonsMetadataClient({request=(...args)=>fetch(...args),wait=(ms,signal)=>sleep(ms,undefined,{signal}),now=Date.now,spacingMs=1000,cacheMs=300000}={}){
    let queue=Promise.resolve(),nextAt=0;
    const cache=new Map();
    return async function metadata(url,{signal}={}){
        const key=String(url),cached=cache.get(key);
        if(cached&&now()-cached.at<cacheMs)return cached.body;
        const previous=queue;let release;queue=new Promise(resolve=>{release=resolve;});
        await previous;
        try{
            signal?.throwIfAborted();
            const existing=cache.get(key);
            if(existing&&now()-existing.at<cacheMs)return existing.body;
            for(let attempt=0;attempt<2;attempt++){
                const delay=Math.max(0,nextAt-now());
                if(delay>30000)throw Object.assign(new Error('Commons search is temporarily rate limited'),{code:'PHOTO_PROVIDER_RATE_LIMITED'});
                if(delay)await wait(delay,signal);
                signal?.throwIfAborted();
                const response=await request(url,{headers:{'User-Agent':'Ledify-VisualAssets/1.0 (licensed presentation imagery)'},signal:signal?AbortSignal.any([signal,AbortSignal.timeout(12000)]):AbortSignal.timeout(12000)});
                nextAt=now()+spacingMs;
                if(response.status===429||response.status===503){
                    const value=response.headers?.get('retry-after');
                    const retryMs=value?(Number.isFinite(Number(value))?Number(value)*1000:Date.parse(value)-now()):5000;
                    nextAt=now()+Math.max(1000,Math.min(300000,Number.isFinite(retryMs)?retryMs:5000));
                    await response.body?.cancel();
                    if(attempt===0)continue;
                    throw Object.assign(new Error('Commons search is temporarily rate limited'),{code:'PHOTO_PROVIDER_RATE_LIMITED'});
                }
                if(!response.ok)throw new Error(`Commons metadata search unavailable (HTTP ${response.status})`);
                const body=await response.json();
                if(/^(ratelimited|maxlag)$/i.test(body.error?.code||'')){
                    nextAt=now()+5000;
                    if(attempt===0)continue;
                    throw Object.assign(new Error('Commons search is temporarily rate limited'),{code:'PHOTO_PROVIDER_RATE_LIMITED'});
                }
                if(body.error)throw Object.assign(new Error(`Commons metadata search failed (${body.error.code||'API_ERROR'})`),{code:'PHOTO_SEARCH_API_ERROR'});
                if(cache.size>=128)cache.delete(cache.keys().next().value);
                cache.set(key,{at:now(),body});return body;
            }
        }finally{release();}
    };
}
export const commonsMetadata=createCommonsMetadataClient();
