import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {imagePolicy} from './imageStrategy.mjs';
import {validateImageBytes,atomicImageJson,withImageCapacity,shareImageWork} from '../visual/imageAssetService.mjs';
import {randomUUID} from 'node:crypto';
import {storageRoot} from '../storageRoot.mjs';

// Disk-backed, short-lived provider results avoid repeating stock searches and
// paid generation for an identical subject. No keys are part of the cache data.
export async function acquireProviderImage(provider,request,options={}){
    if(!['pexels','gemini-image','commons'].includes(provider.id))return provider.acquire(request);
    const root=path.resolve(options.cacheRoot||process.env.LEDIFY_WEBPAGE_ASSET_CACHE||storageRoot('webpage-image-cache'),'providers');
    const id=createHash('sha256').update(JSON.stringify({version:7,provider:provider.id,scope:provider.cacheScope||'',identityLabel:request.identityLabel,topic:request.topic,sectionTopic:request.sectionTopic,exclusions:request.exclusions,query:request.query,style:request.style,purpose:request.purpose,lighting:request.lighting,palette:request.palette,temperature:request.temperature,focalPoint:request.focalPoint,aspectRatio:request.aspectRatio||'16:9',model:provider.model||process.env.WEBPAGE_IMAGE_MODEL||process.env.GOOGLE_IMAGE_MODEL||''})).digest('hex');
    const metadataPath=path.join(root,id+'.json'),imagePath=path.join(root,id+'.bin');
    try{
        const stat=await fs.stat(metadataPath);if(stat.size>16384||Date.now()-stat.mtimeMs>30*60*1000)throw new Error('Expired provider cache');
        const metadata=JSON.parse(await fs.readFile(metadataPath,'utf8'));
        const imageStat=await fs.stat(imagePath);if(imageStat.size>12*1024*1024)throw new Error('Invalid provider cache');
        const buffer=await fs.readFile(imagePath);if(createHash('sha256').update(buffer).digest('hex')!==metadata.sha256)throw new Error('Image checksum mismatch');await validateImageBytes(buffer);
        return {...metadata,buffer,providerCacheHit:true};
    }catch{}
    const key=root+':'+id;
    return shareImageWork('website:'+key,async sharedSignal=>{
        const image=await withImageCapacity('website-'+provider.id,()=>provider.acquire({...request,signal:sharedSignal}),{concurrency:provider.id==='gemini-image'?1:imagePolicy().concurrency,signal:sharedSignal});
        if(image?.buffer && Buffer.isBuffer(image.buffer) && image.buffer.length<=12*1024*1024){
            const {buffer,...metadata}=image;
            await validateImageBytes(buffer);
            try{await fs.mkdir(root,{recursive:true});const temp=imagePath+'.'+randomUUID()+'.tmp';try{await fs.writeFile(temp,buffer);await fs.rename(temp,imagePath);}finally{await fs.unlink(temp).catch(()=>{});}await atomicImageJson(metadataPath,{...metadata,sha256:createHash('sha256').update(buffer).digest('hex')});}catch{image.providerCacheStored=false;}
        }
        return image;
    },{signal:request.signal});
}
