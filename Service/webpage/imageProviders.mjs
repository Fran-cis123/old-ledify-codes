import {fetchPublicResource} from '../input/publicUrl.mjs';
import {generateImage,imageGenerationSettings} from '../visual/imageGenerationService.mjs';
import {imagePolicy} from './imageStrategy.mjs';
import {createHash} from 'node:crypto';
import {commonsSearch} from '../visual/imageProviders.mjs';
import {relevantSearchQuery,relevanceDiagnostic} from '../visual/imageRelevance.mjs';
import {reviewImageCandidate} from './imageReview.mjs';

export async function downloadWebsiteImage(url,options={}){
    if(new URL(url).protocol!=='https:')throw new Error('Image references must use HTTPS');
    try{return (await fetchPublicResource(url,{maxBytes:12*1024*1024,timeoutMs:12000,contentTypes:/^image\/(jpeg|png|webp)(?:;|$)/i,accept:'image/jpeg,image/png,image/webp',...options})).buffer;}catch(error){throw Object.assign(error,{imageOperation:'download'});}
}

async function boundedJson(response){
    if(!response.ok)throw Object.assign(new Error('Image search provider unavailable'),{status:response.status,headers:response.headers});
    let size=0;const chunks=[];
    for await(const chunk of response.body){size+=chunk.length;if(size>256*1024){await response.body.cancel?.().catch(()=>{});throw new Error('Image search response exceeds budget');}chunks.push(chunk);}
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

export function websiteImageProviders(env=process.env,options={}){
    const policy=imagePolicy(env),settings=imageGenerationSettings(env),model=settings.model;
    const providers=[];
    if(env.PEXELS_API_KEY)providers.push({id:'pexels',cacheScope:createHash('sha256').update(env.PEXELS_API_KEY).digest('hex'),acquire:async request=>{
        const query=new URL('https://api.pexels.com/v1/search');query.search=new URLSearchParams({query:relevantSearchQuery(request),per_page:'3',orientation:request.aspectRatio==='3:4'?'portrait':request.aspectRatio==='1:1'?'square':'landscape',size:'large'});
        const body=await boundedJson(await fetch(query,{headers:{Authorization:env.PEXELS_API_KEY},redirect:'error',signal:request.signal?AbortSignal.any([request.signal,AbortSignal.timeout(12000)]):AbortSignal.timeout(12000)}));
        const photo=body.photos?.find(photo=>{const record={alt:photo.alt,source:'Pexels',creator:photo.photographer,license:'Pexels License'};const review=reviewImageCandidate(record,request,{width:photo.width,height:photo.height});relevanceDiagnostic(record,request,review);return photo.width>=960&&photo.src?.large2x&&photo.photographer&&photo.url&&review.accepted;});
        if(!photo)return null;
        if(new URL(photo.src.large2x).hostname!=='images.pexels.com')throw new Error('Unexpected image host');
        return {buffer:await downloadWebsiteImage(photo.src.large2x,{signal:request.signal}),alt:photo.alt||'',creator:photo.photographer,license:'Pexels License',licenseUrl:'https://www.pexels.com/license/',source:'Pexels',sourceUrl:photo.url,creatorUrl:photo.photographer_url,illustrative:true,role:request.role,sectionType:request.sectionType||'',caption:'Illustrative stock photography. Not a photograph of this organization.'};
    }});
    if(env.WEBPAGE_ALLOW_IMAGE_GENERATION==='true'&&settings.ready)providers.push({id:'generated-image',kind:'generation',model,cacheScope:createHash('sha256').update(settings.provider+':'+(env.AI_IMAGE_API_KEY||env.GEMINI_API_KEY||'')).digest('hex'),acquire:async request=>{
        const prompt=`Create editorial concept imagery for a static website: ${request.query}. Style: ${request.style}. Placement: ${request.role}. Purpose: ${request.purpose||request.query}. Lighting: ${request.lighting||"natural"}. Palette and temperature: ${request.palette||request.temperature||"balanced"}. Composition and focal point: ${request.focalPoint||"clear focal subject with copy space"}. No text, logos, real company premises, identifiable customers or claims of clinical proof. Preserve the subject and allow room for surrounding website copy.`;
        const result=await (options.imageGenerator||generateImage)({prompt,aspectRatio:request.aspectRatio||'16:9',signal:request.signal,generationType:'webpage'},{env,model,client:settings.provider==='google-rollback'?options.client:undefined,timeoutMs:policy.timeoutMs});
        return {buffer:result.buffer,model,cacheHit:result.cacheHit,alt:request.alt,creator:'AI generated',license:'Explicitly approved image provider terms apply',licenseUrl:settings.provider==='bfl'?'https://bfl.ai/legal/flux-api-service-terms':'https://ai.google.dev/gemini-api/terms',source:settings.provider==='bfl'?'Black Forest Labs FLUX':'Google Gemini',sourceType:'ai-generated',generationMethod:'ai-generated',synthetic:true,illustrative:true,role:request.role,caption:'AI-generated conceptual illustration; not an actual photograph of this organization.'};
    }});
    providers.push({id:'commons',acquire:async request=>{
        const image=await commonsSearch({...request,searchQuery:relevantSearchQuery(request),maxSearchQueries:2,acceptCandidate:record=>reviewImageCandidate(record,request,{width:record.width,height:record.height}).accepted});
        return image?{...image,alt:image.description,sourceUrl:image.originalUrl,illustrative:true}:null;
    }});
    return providers;
}
