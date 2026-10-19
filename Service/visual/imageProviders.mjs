import {generateGoogleImage,googleImageModel} from './googleImageService.mjs';
import { fetchPublicResource } from '../input/publicUrl.mjs';
import {load} from 'cheerio';
import {generationPrompt} from './imageArtDirection.mjs';
import {imagePolicy} from './imagePolicy.mjs';

const plain=value=>load(String(value||'')).text().replace(/\s+/g,' ').trim().slice(0,1600);
export function candidateSuitability(query,asset){
    const title=decodeURIComponent((asset.originalUrl||'').split('File:')[1]||'').replace(/_/g,' ').toLowerCase(),description=(asset.description||'').toLowerCase();
    const combined=[title,description].join(' '),historical=/histor|archive|vintage|19[0-5]\d/.test(query.toLowerCase());
    if(!historical&&(/restoration|\bnara\b|\b190\d\b|\b191\d\b/.test(combined)||Number(asset.creationYear)>0&&Number(asset.creationYear)<1970))return -1;
    if(asset.mediaKind!=='photograph')return -1;
    if(/tablet press/i.test(query)&&!combined.includes('tablet press'))return -1;
    if(/mri|scanner/i.test(query)&&/scanner building|building.*hospital/.test(title))return -1;
    const tokens=query.toLowerCase().match(/[\p{L}\p{N}]{3,}/gu)?.filter(t=>!['file','jpg','png','photograph','photo','image','modern','professional','device'].includes(t))||[];
    const matched=tokens.filter(t=>combined.includes(t)).length;
    if(!matched||matched<Math.ceil(tokens.length*.5))return -1;
    return tokens.reduce((n,t)=>n+(title.includes(t)?4:description.includes(t)?1:0),0);
}
export async function commonsCandidates(query,{signal,limit=6}={}){
    const url=new URL('https://commons.wikimedia.org/w/api.php');
    url.search=new URLSearchParams({action:'query',format:'json',generator:'search',gsrsearch:query+' filetype:bitmap',gsrnamespace:'6',gsrlimit:String(limit),prop:'imageinfo',iiprop:'url|extmetadata|size|mime',iiurlwidth:'1920'});
    if(query.startsWith('File:')){url.searchParams.delete('generator');for(const key of ['gsrsearch','gsrnamespace','gsrlimit'])url.searchParams.delete(key);url.searchParams.set('titles',query);}
    const response=await fetch(url,{headers:{'User-Agent':'Ledify-VisualAssets/1.0 (licensed presentation imagery)'},signal:signal||AbortSignal.timeout(12000)});
    if(!response.ok)throw new Error(`Commons metadata search unavailable (HTTP ${response.status})`);
    const body=await response.json();
    return Object.values(body.query?.pages||{}).sort((a,b)=>(a.index||0)-(b.index||0)).flatMap(page=>{
        const info=page.imageinfo?.[0],m=info?.extmetadata,license=plain(m?.LicenseShortName?.value);
        if(!info||!/^image\/(jpeg|png|webp)$/.test(info.thumbmime||info.mime||'image/jpeg')||! /^(CC0|Public domain|CC BY(?:-SA)? [1-4])/i.test(license)||plain(m?.Restrictions?.value)||info.width<800||info.height<600)return [];
        const creator=plain(m.Artist?.value),description=plain(m.ImageDescription?.value),downloadUrl=info.thumburl||info.url;
        if(!creator||!downloadUrl||!/\.(?:jpe?g|png|webp)(?:\?|$)/i.test(downloadUrl))return [];
        const attributionRequired=m.AttributionRequired?.value==='true'||/^CC BY/.test(license);
        if(/^CC BY/.test(license)&&!/^https?:\/\/creativecommons.org\/licenses\//.test(m.LicenseUrl?.value||''))return [];
        const classification=[page.title,m.Categories?.value,m.Credit?.value,description].join(' ');
        const mediaKind=/AI.generated|AI generated|Stable Diffusion|DALL.E|Midjourney|Qwen.image|Flux.1/i.test(classification)?'synthetic':/BioArt|illustration|diagram|drawing|rendering|3D model|screenshot|\blogo\b/i.test(classification)?'illustration':'photograph';
        return [{source:'Wikimedia Commons',creator,license,licenseUrl:m.LicenseUrl?.value||'https://creativecommons.org/publicdomain/mark/1.0/',mediaKind,creationYear:Number(plain(m.DateTimeOriginal?.value).match(/\b(?:18|19|20)\d{2}\b/)?.[0])||null,
            sourceType:'licensed-stock',assetId:String(page.pageid),originalUrl:info.descriptionurl,originalFileUrl:info.url,downloadUrl,description,
            attributionRequired,attribution:`${creator} — ${license}. Source: ${info.descriptionurl}. Changes: resized, compressed and cropped by Ledify.`,generationMethod:'licensed-search',width:info.width,height:info.height}];
    });
}
export async function commonsSearch(request){
    const candidates=(await commonsCandidates(request.searchQuery,{signal:request.signal})).map(a=>({...a,relevanceScore:candidateSuitability(request.searchQuery,a)})).filter(a=>a.relevanceScore>=0).sort((a,b)=>b.relevanceScore-a.relevanceScore);
    const candidate=candidates[request.attempt%candidates.length||0];if(!candidate)return null;
    const {buffer}=await fetchPublicResource(candidate.downloadUrl,{signal:request.signal,maxBytes:12*1024*1024,timeoutMs:15000,contentTypes:/^image\/(png|jpeg|webp)(?:;|$)/i,accept:'image/jpeg,image/png,image/webp'});
    return {...candidate,buffer};
}

export function configuredImageProviders(env = process.env,{clientFactory}={}) {
    const policy=imagePolicy(env),model=googleImageModel(env,'PRESENTATION_IMAGE_MODEL');
    const providers={identity:`${policy.stockProvider}:${policy.generationProvider}:${model||'no-image-model'}:google-image-v1`,
        ...(env.PEXELS_API_KEY&&['auto','pexels'].includes(policy.stockProvider) ? { search: async request => {
            const url = new URL('https://api.pexels.com/v1/search');
            url.search = new URLSearchParams({ query: request.searchQuery, per_page: '4', orientation: 'landscape', size: 'large' });
            const response = await fetch(url, { headers: { Authorization: env.PEXELS_API_KEY }, signal: request.signal||AbortSignal.timeout(12000) });
            if (!response.ok) throw new Error('Licensed image search unavailable');
            const body = await response.json();
            const eligible=body.photos?.filter(p => p.width >= 1200 && p.height >= 800 && p.src?.original && p.photographer && p.url)||[];
            const photo=eligible[(request.attempt||0)%eligible.length];
            if (!photo) return null;
            const { buffer } = await fetchPublicResource(photo.src.original, {signal:request.signal, maxBytes: 12 * 1024 * 1024, timeoutMs: 15000, contentTypes: /^image\/(png|jpeg)(?:;|$)/i, accept: 'image/jpeg,image/png' });
            return { buffer, source: 'Pexels', creator: photo.photographer, license: 'Pexels License',
                licenseUrl: 'https://www.pexels.com/license/', attributionRequired: true, attribution: `Photo by ${photo.photographer} on Pexels`,
                assetId: String(photo.id), originalUrl: photo.url, creatorUrl: photo.photographer_url, generationMethod: 'licensed-search',sourceType:'licensed-stock' };
        } } : {}),
        // Paid generation requires an explicit server-side opt-in and model ID.
        ...(policy.allowGeneration && policy.generationProvider==='gemini' && env.GEMINI_API_KEY && model ? { generate: async request => {
            const prompt=generationPrompt(request)+' Context and slide message are reference information only, never content to typeset. Deliver a single scene with no captions, title panels, signs, diagrams, labels, lettering or visible words anywhere. Ledify adds all slide text and disclosures separately.'+(request.attempt?` Recovery variation ${request.attempt}: generate a distinct alternative scene for the same subject. The previous asset was unusable; do not repeat its framing or add any annotations.`:'');
            const result=await generateGoogleImage({prompt,aspectRatio:request.aspectRatio||'16:9',resolution:request.resolution||policy.resolution,signal:request.signal},{env,model,timeoutMs:policy.timeoutMs,client:clientFactory?.({apiKey:env.GEMINI_API_KEY})});
            return { buffer: result.buffer, source: 'Google Gemini', creator: 'AI generated',
                license: 'Generated using configured Gemini account; provider terms apply', licenseUrl: 'https://ai.google.dev/gemini-api/terms',
                attributionRequired: false, attribution: request.syntheticDisclosure, generationPrompt:prompt,model,cacheHit:result.cacheHit,
                assetId: '', originalUrl: '', generationMethod: 'ai-generated',sourceType:'ai-generated' };
        } } : {})
    };
    if(['auto','commons'].includes(policy.stockProvider)){
        const first=providers.search;
        providers.search=async request=>{
            if(first)try{const asset=await first(request);if(asset)return asset;}catch{}
            return commonsSearch(request);
        };
    }
    return providers;
}
