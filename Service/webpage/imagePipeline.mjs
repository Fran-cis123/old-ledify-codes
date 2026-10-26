import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {resolveWebpageAssets} from '../webpageAssetService.mjs';
import {optimizeWebsiteImage} from './imageOptimization.mjs';
import {downloadWebsiteImage,websiteImageProviders} from './imageProviders.mjs';
import {userWebsiteBrief} from './websiteBrief.mjs';
import {acquireProviderImage} from './providerCache.mjs';
import {imagePolicy,planWebsiteImages} from './imageStrategy.mjs';
import {reviewImageCandidate} from './imageReview.mjs';
import {rankCuratedPhotos} from './curatedSelection.mjs';
import {relevanceDiagnostic} from '../visual/imageRelevance.mjs';
import {generationConcurrency,generateIndependent} from '../ai/concurrency.mjs';
import {classifyImageError,imageBackoff,imageDiagnostic} from '../visual/imageAssetService.mjs';

const bundledCatalog=fileURLToPath(new URL('../../assets/webpage/curated/catalog.json',import.meta.url));
const safeCreditUrl=value=>{try{const url=new URL(value);url.search='';url.hash='';return url.protocol==='https:'&&!url.username&&!url.password?url.href:'';}catch{return '';}};

export async function acquireWebsiteImages(page,context={},options={}){
    const warnings=[],assets={},selected=[],diagnostics=[],disabled=new Set();
    const requests=planWebsiteImages(page,context);
    const logImage=entry=>{diagnostics.push(entry);imageDiagnostic({generationType:'webpage',...entry},options.logger);};
    const policy={...imagePolicy(),...options.policy},started=Date.now();let generatedCalls=0;
    const user=userWebsiteBrief('',context);
    const optimize=async (record,buffer,target=requests.find(target=>target.role===record.role&&(!record.sectionId||target.sectionId===record.sectionId))||record)=>{
        if(selected.length>=policy.maxAssets||selected.some(asset=>asset.role==='hero'&&record.role==='hero'))return false;
        if(!record.alt?.trim()||!record.license?.trim()||!record.creator?.trim())throw new Error('Missing image provenance');
        const optimized=await optimizeWebsiteImage(buffer,options.optimization);
        // Optimization yields to other targets. Recheck the shared budget here
        // before publishing; concurrent acquisitions may have completed first.
        if(selected.length>=policy.maxAssets||selected.some(asset=>asset.role==='hero'&&record.role==='hero'))return false;
        if(selected.some(asset=>asset.assetId===optimized.id)&&record.allowRepeat!==true){warnings.push({code:'WEBPAGE_DUPLICATE_IMAGE_REJECTED',message:'A repeated image was excluded from another placement.'});return false;}
        const dimensions=optimized.variants.at(-1);
        const review=record.role==='logo'?{accepted:true,method:'caller-authorized-logo',limits:'Caller ownership/representation assertions require review.'}:reviewImageCandidate(record.source==='Google Gemini'?{...record,subject:target.query}:record,target,dimensions);
        if(record.source==='Google Gemini')review.method='generation-intent-and-dimensions';
        relevanceDiagnostic(record,target,review,options.relevanceLogger);
        if(!review.accepted){warnings.push({code:'WEBPAGE_IMAGE_RELEVANCE_REJECTED',message:'An image failed semantic relevance, provenance, resolution or placement checks.'});return false;}
        const variants=optimized.variants.map(variant=>{
            const file=`assets/images/image-${optimized.id}-${variant.width}.webp`;assets[file]=variant.buffer;
            return {url:`./${file}`,width:variant.width,height:variant.height,bytes:variant.buffer.length};
        });
        const largest=variants.at(-1);
        const crop=['left','right','center','top','contain'].includes(page.websiteBrief?.photography.crop)?page.websiteBrief.photography.crop:'center';
        selected.push({...record,buffer:undefined,...largest,assetId:optimized.id,review,variants,crop:record.role==='logo'?'contain':crop,sourceBytes:buffer.length,cacheHit:optimized.cacheHit,sourceUrl:safeCreditUrl(record.sourceUrl),licenseUrl:safeCreditUrl(record.licenseUrl),creatorUrl:safeCreditUrl(record.creatorUrl),caption:record.illustrative===false?(record.caption||''):(record.caption||'Illustrative stock image; not a photograph of this organization.')});
        logImage({provider:record.source,target:record.role,status:'asset-verified',storage:'bundled',validation:'passed',cacheHit:optimized.cacheHit});
        return true;
    };
    // 1. Explicitly supplied image references with rights confirmed by the caller.
    for(const record of user.imageAssets){
        try{await optimize({...record,source:'User supplied',sourceUrl:record.url,illustrative:record.authentic!==true},await (options.download || downloadWebsiteImage)(record.url));}
        catch{warnings.push({code:'WEBPAGE_USER_IMAGE_UNAVAILABLE',message:'A supplied image could not be safely downloaded or processed.'});}
    }
    if(user.logoUrl)try{await optimize({role:'logo',alt:page.brandName+' logo',creator:page.brandName,license:'User-supplied brand logo; use authorized by the caller',source:'User supplied',sourceUrl:user.logoUrl,illustrative:false},await (options.download||downloadWebsiteImage)(user.logoUrl));}catch{warnings.push({code:'WEBPAGE_LOGO_UNAVAILABLE',message:'The supplied brand logo could not be acquired; the brand name remains visible.'});}
    // 2. Deployment-owned brand collections. Preserve the existing catalog contract.
    const configured=options.manifestPath||process.env.LEDIFY_WEBPAGE_IMAGE_MANIFEST;
    if(configured){
        const local=await resolveWebpageAssets(page,{manifestPath:configured});
        const records=[local.page.visualAssets?.hero,...local.page.sections.flatMap(section=>[section.image,...section.items.map(item=>item.image)])].filter(Boolean);
        for(const record of records)try{await optimize({...record,source:record.source||'Authorized brand catalog'},local.assets[record.url.slice(2)]);}catch{warnings.push({code:'WEBPAGE_CATALOG_IMAGE_INVALID',message:'A catalog image could not be optimized.'});}
        if(!records.length)warnings.push(...local.warnings);
    }
    // Licensed search/generation resolve each planned target, not just the hero.
    const providers=options.providers||websiteImageProviders();
    const matches=(asset,target)=>asset.role===target.role&&(target.role==='hero'||(asset.sectionId?asset.sectionId===target.sectionId:asset.sectionType===target.sectionType))&&(target.role!=='item'||asset.itemTitle===target.itemTitle);
    if(options.external!==false){
        if(!providers.some(provider=>provider.id==='gemini-image'))warnings.push({code:'WEBPAGE_IMAGE_GENERATION_NOT_CONFIGURED',message:'AI imagery is unavailable: configure WEBPAGE_ALLOW_IMAGE_GENERATION=true, WEBPAGE_IMAGE_MODEL and GEMINI_API_KEY. Authorized stock/local assets may still be used.'});
        const targets=[...requests].sort((a,b)=>Number(b.required)-Number(a.required)||Number(b.role==='hero')-Number(a.role==='hero')).slice(0,Math.max(0,policy.maxAssets-selected.length));
        await generateIndependent(targets,generationConcurrency(options.concurrency??process.env.WEBPAGE_IMAGE_CONCURRENCY,2),async target=>{
            if(selected.some(asset=>matches(asset,target)))return;
            if(selected.length>=policy.maxAssets||Date.now()-started>=policy.totalMs)return;
            for(const provider of providers){
                if(disabled.has(provider.id))continue;
                let resolved=false;
                for(let attempt=0;attempt<=policy.retries;attempt++){
                    const remaining=policy.totalMs-(Date.now()-started);if(remaining<=0)break;
                    if(provider.id==='gemini-image'&&generatedCalls>=policy.maxGenerated){logImage({provider:provider.id,model:provider.model,target:target.role,status:'skipped',reasonCode:'GENERATION_BUDGET_UNAVAILABLE'});break;}
                    const controller=new AbortController();let timer;
                    const attemptStarted=performance.now();
                    try{
                        if(provider.id==='gemini-image')generatedCalls++;
                        const timeout=new Promise((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(new Error('Image acquisition timed out'));},Math.min(policy.timeoutMs,remaining));});
                        const record=await Promise.race([acquireProviderImage(provider,{...target,signal:controller.signal},{cacheRoot:options.optimization?.cacheRoot}),timeout]);
                        if(record){resolved=await optimize({...record,...target,alt:record.source==='Google Gemini'?target.alt:record.alt||'',buffer:undefined},record.buffer,target);}
                        diagnostics.push(imageDiagnostic({generationType:'webpage',provider:provider.id,model:provider.model,target:target.role,status:resolved?'resolved':'empty',reasonCode:resolved?undefined:'NO_ELIGIBLE_IMAGE',attempt:attempt+1,elapsedMs:performance.now()-attemptStarted,storage:resolved?'optimized':'skipped',validation:resolved?'passed':'rejected',cacheHit:record?.providerCacheHit},options.logger));
                        break;
                    }catch(error){const info=classifyImageError(error);clearTimeout(timer);logImage({provider:provider.id,model:provider.model,target:target.role,status:'failed',attempt:attempt+1,...info,elapsedMs:performance.now()-attemptStarted});warnings.push({code:'WEBPAGE_IMAGE_PROVIDER_UNAVAILABLE',provider:provider.id,target:target.role,reasonCode:info.reasonCode,message:'An image provider failed or exceeded its budget; the next authorized source is used.'});if(['IMAGE_INVALID_CREDENTIALS','IMAGE_ACCESS_DENIED','IMAGE_MODEL_UNAVAILABLE','IMAGE_REQUEST_REJECTED'].includes(info.reasonCode))disabled.add(provider.id);if(!info.retryable||attempt>=policy.retries||!await imageBackoff(error,attempt,{remainingMs:policy.totalMs-(Date.now()-started),sleep:options.sleep}))break;}
                    finally{clearTimeout(timer);controller.abort();}
                }
                if(resolved)break;
            }
        },()=>{});
    }
    // 5. Reviewed local fallback assets. No network access or credentials required.
    if(options.curated!==false&&selected.length<policy.maxAssets){
        try{
            const entries=JSON.parse(await fs.readFile(options.curatedManifest || bundledCatalog,'utf8'));
            for(const target of requests){
                if(selected.length>=policy.maxAssets)break;
                if(selected.some(asset=>matches(asset,target)))continue;
                let rejected=0;
                const ranked=rankCuratedPhotos(entries,target,{onRejected:(entry,review)=>{if(rejected++<3)relevanceDiagnostic(entry,target,review,options.relevanceLogger);}});
                if(rejected>3)logImage({provider:'bundled-catalog',target:target.role,status:'candidates-filtered',rejected});
                if(!ranked.length)continue;
                const root=await fs.realpath(path.dirname(options.curatedManifest || bundledCatalog));
                for(const {entry} of ranked){
                    if(selected.some(asset=>asset.file===entry.file))continue;
                    try{
                    const filename=await fs.realpath(path.join(root,entry.file));
                    if(!filename.startsWith(root+path.sep))throw new Error('Invalid curated asset path');
                    const bytes=await fs.readFile(filename);
                    if(entry.sha256&&createHash('sha256').update(bytes).digest('hex')!==entry.sha256)throw new Error('Bundled image checksum mismatch');
                    if(await optimize({...entry,...target,alt:entry.alt},bytes,target))break;
                    }catch{warnings.push({code:'WEBPAGE_CURATED_IMAGE_UNAVAILABLE',message:'A local fallback image is missing or invalid; another eligible photo is tried.'});}
                }
            }
        }catch{warnings.push({code:'WEBPAGE_CURATED_IMAGE_UNAVAILABLE',message:'The local fallback image could not be loaded.'});}
    }
    const sections=page.sections.map(section=>({...section,
        image:selected.find(asset=>asset.role==='section'&&(asset.sectionId?asset.sectionId===section.id:asset.sectionType===section.type)),
        items:section.items.map(item=>({...item,image:selected.find(asset=>asset.role==='item'&&(asset.sectionId?asset.sectionId===section.id:asset.sectionType===section.type)&&asset.itemTitle===item.title)}))}));
    for(const section of sections)if(['image-text','image-band'].includes(section.composition)&&!section.image)section.composition='editorial';
    for(const section of sections)if(section.type==='gallery')section.items=section.items.filter(item=>item.image);
    const hero=selected.find(asset=>asset.role==='hero');
    if(!hero)warnings.push({code:'WEBPAGE_IMAGERY_UNAVAILABLE',message:'No matching authorized hero image was acquired. The website uses a content-led layout.'});
    const unmet=requests.filter(target=>!selected.some(asset=>matches(asset,target)));
    const requiredMissing=unmet.filter(target=>target.required).map(({role,sectionId,itemTitle})=>({role,sectionId,itemTitle}));
    logImage({provider:'pipeline',status:requiredMissing.length?'incomplete':'verified',requested:requests.length,succeeded:requests.length-unmet.length,failed:unmet.length,requiredMissing:requiredMissing.length,retryCount:diagnostics.filter(d=>d.attempt>1).length,elapsedMs:Date.now()-started,storage:'bundled',validation:requiredMissing.length?'incomplete':'passed'});
    if(unmet.length)warnings.push({code:'WEBPAGE_IMAGE_PLAN_INCOMPLETE',message:'Some planned images could not be acquired within the configured source/budget limits.',targets:unmet.map(({role,sectionId,itemTitle})=>({role,sectionId,itemTitle}))});
    return {page:{...page,sections:sections.filter(section=>section.type!=='gallery'||section.items.length),imageValidation:{status:requiredMissing.length?'incomplete':'passed',requiredMissing},imageStrategy:{plan:requests,planned:requests.length,resolved:selected.filter(a=>a.role!=='logo').length,unmet:unmet.length,generatedCalls,maxAssets:policy.maxAssets,diagnostics},visualAssets:{hero,logo:selected.find(asset=>asset.role==='logo'),credits:selected.map(({buffer,variants,...asset})=>asset)}},assets,warnings};
}
