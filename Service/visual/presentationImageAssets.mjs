import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import {createHash} from 'node:crypto';
import {imagePolicy,generationBudget} from './imagePolicy.mjs';
import {imageBrief} from './imageArtDirection.mjs';
import {PHOTO_FRAMES} from '../../renderer/presentation/photoCompositions.mjs';

export async function normalizePhoto(asset,brief,root,policy){
    if(!asset?.source||!asset.creator||!asset.license||(asset.attributionRequired&&!asset.attribution))throw new Error('Incomplete image usage rights or provenance');
    if(!Buffer.isBuffer(asset.buffer)||asset.buffer.length>12*1024*1024)throw new Error('Image exceeds byte limit');
    const input=sharp(asset.buffer,{limitInputPixels:32000000,failOn:'error'}),meta=await input.metadata();
    if(!['jpeg','png','webp'].includes(meta.format)||meta.pages>1||meta.width<800||meta.height<600)throw new Error('Unsupported, animated or insufficient-resolution image');
    const oriented=await input.rotate().flatten({background:'#'+String(brief.palette?.background||'FFFFFF').replace('#','')}).toBuffer(),dimensionsIn=await sharp(oriented).metadata();
    const sourceStats=await sharp(oriented).stats();
    if(sourceStats.channels.every(c=>c.stdev<2))throw new Error('Image is blank or visually uniform');
    const frame=PHOTO_FRAMES[brief.composition]||PHOTO_FRAMES['photo-editorial'],ratio=frame.w/frame.h;
    const cropW=Math.floor(Math.min(dimensionsIn.width,dimensionsIn.height*ratio)),cropH=Math.floor(cropW/ratio);
    const coordinate=v=>Number.isFinite(Number(v))?Math.max(0,Math.min(1,Number(v))):.5;
    const left=Math.round(Math.max(0,Math.min(dimensionsIn.width-cropW,coordinate(brief.focalPoint?.x)*dimensionsIn.width-cropW/2)));
    const top=Math.round(Math.max(0,Math.min(dimensionsIn.height-cropH,coordinate(brief.focalPoint?.y)*dimensionsIn.height-cropH/2)));
    if(cropW/frame.w<90||cropH/frame.h<90)throw new Error('Source resolution is insufficient after the requested crop');
    const buffer=await sharp(oriented).extract({left,top,width:cropW,height:cropH}).resize({width:2400,height:1800,fit:'inside',withoutEnlargement:true}).jpeg({quality:policy.quality,mozjpeg:true}).toBuffer();
    const dimensions=await sharp(buffer).metadata(),id=createHash('sha256').update(buffer).digest('hex');
    await fs.mkdir(root,{recursive:true});const filePath=path.join(root,id+'.jpg');await fs.writeFile(filePath,buffer);
    const {buffer:unused,...metadata}=asset;
    return {...metadata,id,sourceChecksum:createHash('sha256').update(asset.buffer).digest('hex'),filePath,data:'image/jpeg;base64,'+buffer.toString('base64'),kind:'photo',role:'foreground',status:'resolved',
        sourceType:asset.sourceType||(asset.generationMethod==='ai-generated'?'ai-generated':'licensed-stock'),
        width:dimensions.width,height:dimensions.height,format:'jpeg',bytes:buffer.length,sourceDimensions:{width:meta.width,height:meta.height},
        altText:brief.altText||brief.description,slideNumber:brief.slideNumber,visualPurpose:brief.purpose,imageDescription:brief.description,
        artDirection:brief,crop:{mode:'cover',focalPoint:brief.focalPoint,sourceRect:{left,top,width:cropW,height:cropH},targetAspectRatio:ratio},
        changes:'Resized, metadata stripped and JPEG compressed by Ledify; cropped to the slide frame.',
        synthetic:asset.generationMethod==='ai-generated',disclosure:asset.generationMethod==='ai-generated'?brief.syntheticDisclosure:undefined};
}

// One deck-scoped session: global provider concurrency, generation budget and duplicate detection.
export function createImageAssetSession({providers={},policy=imagePolicy(),root,external=true,userAssets=[]}){
    const budget=generationBudget(policy),diagnostics=[],used=new Set(),usedSources=new Set();let active=0;const waiting=[];
    const deadline=Date.now()+(policy.deadlineMs||45000);
    const limited=async fn=>{if(active>=policy.concurrency)await new Promise(r=>waiting.push(r));else active++;try{return await fn();}finally{const next=waiting.shift();if(next)next();else active--;}};
    let selected=0;
    return {diagnostics,budget,
        async resolve(presentation,slide,theme,context,directOverride){
            if(!policy.enabled||selected>=policy.maxImages)return null;selected++;
            const brief=imageBrief(presentation,slide,theme,context);
            if(directOverride){brief.description=directOverride.description;brief.altText=directOverride.description;brief.composition=directOverride.composition||brief.composition;}
            return limited(async()=>{
                if(Date.now()>=deadline){diagnostics.push({slideNumber:slide.slideNumber,status:'skipped',reason:'Deck image deadline reached'});return null;}
                const direct=directOverride||userAssets.find(a=>a.slideNumber===slide.slideNumber);
                const preference=brief.kind==='illustration'?['generate','search']:['search','generate'];
                const methods=direct?['user',...(external?preference:[])]:external?preference:[];
                for(const method of methods){
                    if(method!=='user'&&!providers[method])continue;
                    // Exact scientific diagrams may never be replaced by synthetic pictures.
                    if(method==='generate'&&(brief.kind==='diagram'||/precise anatomy|histolog|diagnostic (?:scan|image)|radiograph/i.test(brief.description)))continue;
                    const identity=method==='user'?direct.assetId||'user':providers.identity||'injected-provider';
                    const cacheKey=createHash('sha256').update(JSON.stringify({version:2,brief,identity,method,quality:policy.quality})).digest('hex');
                    const cachePath=path.join(root,cacheKey+'.json');
                    if(method!=='user')try{
                        const meta=JSON.parse(await fs.readFile(cachePath,'utf8'));
                        if(Date.now()-meta.cachedAt<policy.cacheDays*86400000){
                            const filePath=path.join(root,meta.id+'.jpg'),buffer=await fs.readFile(filePath);
                            if(createHash('sha256').update(buffer).digest('hex')!==meta.id)throw new Error('Cache checksum failed');
                            await sharp(buffer,{limitInputPixels:32000000}).stats();
                            if(!usedSources.has(meta.sourceChecksum)&&!used.has(meta.id)){used.add(meta.id);usedSources.add(meta.sourceChecksum);return {...meta,filePath,data:'image/jpeg;base64,'+buffer.toString('base64'),cacheHit:true};}
                        }
                    }catch{}
                    for(let attempt=0;attempt<=policy.retries;attempt++){
                        if(Date.now()>=deadline)break;
                        if(method==='generate'&&!budget.reserve())break;
                        const controller=new AbortController();let timer,reservation;
                        try{
                            const candidate=method==='user'?direct:await Promise.race([
                                providers[method]({...brief,attempt,excludeAssetIds:[...used],signal:controller.signal,resolution:policy.resolution}),
                                new Promise((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(new Error('Image provider timed out'));},Math.min(policy.timeoutMs,Math.max(1,deadline-Date.now())));})]);
                            if(!candidate){diagnostics.push({slideNumber:slide.slideNumber,method,status:'empty',attempt:attempt+1});break;}
                            const sourceKey=Buffer.isBuffer(candidate.buffer)?createHash('sha256').update(candidate.buffer).digest('hex'):'';
                            if(usedSources.has(sourceKey))throw new Error('Duplicate image in presentation');
                            usedSources.add(sourceKey);reservation=sourceKey;
                            const asset=await normalizePhoto(candidate,brief,root,policy);
                            if(used.has(asset.id))throw new Error('Duplicate image in presentation');
                            used.add(asset.id);usedSources.add(asset.sourceChecksum);
                            if(method!=='user'){const {data,filePath,...meta}=asset;await fs.writeFile(cachePath,JSON.stringify({...meta,cachedAt:Date.now()}));}
                            diagnostics.push({slideNumber:slide.slideNumber,method,status:'resolved',attempt:attempt+1});return asset;
                        }catch(error){if(reservation)usedSources.delete(reservation);diagnostics.push({slideNumber:slide.slideNumber,method,status:'failed',attempt:attempt+1,reason:error.message.replace(/https?:\/\/\S+/g,'[provider URL]').slice(0,180)});}
                        finally{clearTimeout(timer);controller.abort();}
                    }
                }
                return null;
            });
        }
    };
}
