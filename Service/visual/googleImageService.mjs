import {GoogleGenAI} from '@google/genai';
import sharp from 'sharp';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash,randomUUID} from 'node:crypto';

const pending=new Map();
let active=0;
const digest=buffer=>createHash('sha256').update(buffer).digest('hex');
const failure=(code,message)=>Object.assign(new Error(message),{code,stage:'image-generation'});
export const googleImageModel=(env=process.env,legacyName)=>env[legacyName]||env.GOOGLE_IMAGE_MODEL||'';

async function validate(buffer){
    if(!buffer.length||buffer.length>12*1024*1024)throw failure('IMAGE_INVALID','Generated image exceeds its byte limit or is empty');
    const metadata=await sharp(buffer,{limitInputPixels:32_000_000}).metadata();
    if(!['jpeg','png','webp'].includes(metadata.format)||metadata.pages>1||metadata.width<512||metadata.height<512)throw failure('IMAGE_INVALID','Generated image has an unsupported format or dimensions');
    await sharp(buffer,{limitInputPixels:32_000_000}).stats();
    return metadata;
}

// Callers own per-output budgets and bounded retries. One invocation makes at
// most one paid request; the SDK must not silently multiply those attempts.
export async function generateGoogleImage(request,options={}){
    const env=options.env||process.env,model=options.model||env.GOOGLE_IMAGE_MODEL;
    if(!model||!env.GEMINI_API_KEY)throw failure('IMAGE_NOT_CONFIGURED','Configure an accessible Google image model and the existing Gemini API key');
    const prompt=String(request.prompt||'').trim();
    if(!prompt||prompt.length>16000)throw failure('IMAGE_BRIEF_INVALID','Image brief is empty or too long');
    const aspectRatio=request.aspectRatio||'16:9';
    if(!['1:1','2:3','3:2','3:4','4:3','4:5','5:4','9:16','16:9','21:9'].includes(aspectRatio))throw failure('IMAGE_BRIEF_INVALID','Unsupported image aspect ratio');
    // Flash 2.5 Image has fixed output size; newer image models accept imageSize.
    const imageConfig={aspectRatio,...(request.resolution&&!/gemini-2\.5-flash-image/.test(model)?{imageSize:request.resolution}:{})};
    const id=digest(JSON.stringify({version:1,model,prompt,imageConfig}));
    const cache=options.cache??!options.client;
    const root=path.resolve(options.cacheRoot||env.GOOGLE_IMAGE_CACHE_DIR||'generated/google-image-cache');
    if(cache)try{
        const meta=JSON.parse(await fs.readFile(path.join(root,id+'.json'),'utf8'));
        if(Date.now()-meta.createdAt>7*86400000)throw new Error('Expired');
        const buffer=await fs.readFile(path.join(root,id+'.bin'));
        if(digest(buffer)!==meta.sha256)throw new Error('Cache checksum mismatch');
        await validate(buffer);
        return {...meta,buffer,cacheHit:true};
    }catch{}
    const key=cache?id:randomUUID();
    if(pending.has(key))return pending.get(key);
    const task=(async()=>{
        const timeoutMs=Math.min(60000,Math.max(1000,Number(options.timeoutMs)||30000));
        const signal=request.signal?AbortSignal.any([request.signal,AbortSignal.timeout(timeoutMs)]):AbortSignal.timeout(timeoutMs);
        const concurrency=Math.min(3,Math.max(1,Number(env.GOOGLE_IMAGE_CONCURRENCY)||1));
        while(active>=concurrency){
            signal.throwIfAborted();
            await new Promise(resolve=>setTimeout(resolve,25));
        }
        signal.throwIfAborted();active++;
        try{
            const client=options.client||new GoogleGenAI({apiKey:env.GEMINI_API_KEY});
            const result=await client.models.generateContent({model,contents:prompt,config:{responseModalities:['TEXT','IMAGE'],imageConfig,abortSignal:signal,httpOptions:{timeout:timeoutMs,retryOptions:{attempts:1}}}});
            const inline=result.candidates?.[0]?.content?.parts?.find(part=>/^image\/(png|jpeg|webp)$/.test(part.inlineData?.mimeType||''))?.inlineData;
            if(!inline?.data||inline.data.length>16*1024*1024)throw failure('IMAGE_EMPTY_RESPONSE','Google returned no usable image data');
            const buffer=Buffer.from(inline.data,'base64'),metadata=await validate(buffer);
            const meta={model,sha256:digest(buffer),createdAt:Date.now(),mimeType:`image/${metadata.format}`,width:metadata.width,height:metadata.height};
            // Save a verified source even when caching is disabled for a live run.
            if(cache||!options.client){
                await fs.mkdir(root,{recursive:true});
                const temp=path.join(root,id+'.'+randomUUID()+'.tmp');
                await fs.writeFile(temp,buffer);await fs.rename(temp,path.join(root,id+'.bin'));
                await fs.writeFile(path.join(root,id+'.json'),JSON.stringify(meta));
            }
            return {...meta,buffer,cacheHit:false};
        }finally{active--;}
    })();
    pending.set(key,task);
    try{return await task;}finally{pending.delete(key);}
}
