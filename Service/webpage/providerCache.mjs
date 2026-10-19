import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {imagePolicy} from './imageStrategy.mjs';
const inFlight=new Map();

// Disk-backed, short-lived provider results avoid repeating stock searches and
// paid generation for an identical subject. No keys are part of the cache data.
export async function acquireProviderImage(provider,request,options={}){
    if(!['pexels','gemini-image'].includes(provider.id))return provider.acquire(request);
    const root=path.resolve(options.cacheRoot||process.env.LEDIFY_WEBPAGE_ASSET_CACHE||'generated/webpage-image-cache','providers');
    const id=createHash('sha256').update(JSON.stringify({provider:provider.id,query:request.query,style:request.style,purpose:request.purpose,lighting:request.lighting,palette:request.palette,temperature:request.temperature,focalPoint:request.focalPoint,aspectRatio:request.aspectRatio||'16:9',model:provider.model||process.env.WEBPAGE_IMAGE_MODEL||process.env.GOOGLE_IMAGE_MODEL||''})).digest('hex');
    const metadataPath=path.join(root,id+'.json'),imagePath=path.join(root,id+'.bin');
    try{
        const stat=await fs.stat(metadataPath);if(stat.size>16384||Date.now()-stat.mtimeMs>30*60*1000)throw new Error('Expired provider cache');
        const metadata=JSON.parse(await fs.readFile(metadataPath,'utf8'));
        const imageStat=await fs.stat(imagePath);if(imageStat.size>12*1024*1024)throw new Error('Invalid provider cache');
        return {...metadata,buffer:await fs.readFile(imagePath),providerCacheHit:true};
    }catch{}
    if(inFlight.has(id))return inFlight.get(id);
    if(inFlight.size>=imagePolicy().concurrency)throw new Error('Image provider concurrency limit reached');
    const pending=(async()=>{
        const image=await provider.acquire(request);
        if(image?.buffer && Buffer.isBuffer(image.buffer) && image.buffer.length<=12*1024*1024){
            const {buffer,...metadata}=image;
            try{await fs.mkdir(root,{recursive:true});await fs.writeFile(imagePath,buffer);await fs.writeFile(metadataPath,JSON.stringify(metadata));}catch{}
        }
        return image;
    })();
    inFlight.set(id,pending);
    try{return await pending;}finally{inFlight.delete(id);}
}
