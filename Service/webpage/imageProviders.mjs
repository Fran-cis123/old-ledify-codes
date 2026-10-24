import {fetchPublicResource} from '../input/publicUrl.mjs';
import {generateGoogleImage,googleImageModel} from '../visual/googleImageService.mjs';
import {imagePolicy} from './imageStrategy.mjs';
import {createHash} from 'node:crypto';

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
    const policy=imagePolicy(env),model=googleImageModel(env,'WEBPAGE_IMAGE_MODEL');
    const providers=[];
    if(env.PEXELS_API_KEY)providers.push({id:'pexels',cacheScope:createHash('sha256').update(env.PEXELS_API_KEY).digest('hex'),acquire:async request=>{
        const query=new URL('https://api.pexels.com/v1/search');query.search=new URLSearchParams({query:request.query,per_page:'3',orientation:request.aspectRatio==='3:4'?'portrait':request.aspectRatio==='1:1'?'square':'landscape',size:'large'});
        const body=await boundedJson(await fetch(query,{headers:{Authorization:env.PEXELS_API_KEY},redirect:'error',signal:request.signal?AbortSignal.any([request.signal,AbortSignal.timeout(12000)]):AbortSignal.timeout(12000)}));
        const photo=body.photos?.find(photo=>photo.width>=960&&photo.src?.large2x&&photo.photographer&&photo.url);
        if(!photo)return null;
        if(new URL(photo.src.large2x).hostname!=='images.pexels.com')throw new Error('Unexpected image host');
        return {buffer:await downloadWebsiteImage(photo.src.large2x,{signal:request.signal}),alt:photo.alt||request.alt,creator:photo.photographer,license:'Pexels License',licenseUrl:'https://www.pexels.com/license/',source:'Pexels',sourceUrl:photo.url,creatorUrl:photo.photographer_url,illustrative:true,role:request.role,sectionType:request.sectionType||'',caption:'Illustrative stock photography. Not a photograph of this organization.'};
    }});
    if(env.WEBPAGE_ALLOW_IMAGE_GENERATION==='true'&&model&&env.GEMINI_API_KEY)providers.push({id:'gemini-image',model,cacheScope:createHash('sha256').update(env.GEMINI_API_KEY).digest('hex'),acquire:async request=>{
        const prompt=`Create editorial concept imagery for a static website: ${request.query}. Style: ${request.style}. Placement: ${request.role}. Purpose: ${request.purpose||request.query}. Lighting: ${request.lighting||"natural"}. Palette and temperature: ${request.palette||request.temperature||"balanced"}. Composition and focal point: ${request.focalPoint||"clear focal subject with copy space"}. No text, logos, real company premises, identifiable customers or claims of clinical proof. Preserve the subject and allow room for surrounding website copy.`;
        const result=await generateGoogleImage({prompt,aspectRatio:request.aspectRatio||'16:9',signal:request.signal,generationType:'webpage'},{env,model,client:options.client,timeoutMs:policy.timeoutMs});
        return {buffer:result.buffer,model,cacheHit:result.cacheHit,alt:request.alt,creator:'AI generated',license:'Configured Gemini account terms apply',licenseUrl:'https://ai.google.dev/gemini-api/terms',source:'Google Gemini',illustrative:true,role:request.role,caption:'AI-generated conceptual illustration; not an actual photograph of this organization.'};
    }});
    return providers;
}
