import {createHash} from 'node:crypto';
const hash=value=>createHash('sha256').update(value).digest('hex');
export const imageContextHash=target=>hash(JSON.stringify([target.topic||target.subject||'',target.subjectContext||'',target.primaryTopic||'',target.sectionTopic||target.slideTitle||'',target.query||target.searchQuery||'',target.description||'',target.identityLabel||'',target.visualIntent||'',[...(target.exclusions||[])].sort()]));
export const imageTargetKey=target=>JSON.stringify([target.role||'',target.slideNumber||null,target.sectionId||'',target.itemTitle||'']);
const bytesOf=asset=>Buffer.isBuffer(asset.buffer)?asset.buffer:typeof asset.data==='string'&&asset.data.includes('base64,')?Buffer.from(asset.data.split('base64,')[1],'base64'):null;
const invalid=()=>Object.assign(new Error('Image request, placement or checksum does not match its output.'),{code:'IMAGE_BINDING_MISMATCH',stage:'image-mapping'});
export function bindImageAsset(asset,target,requestId,bytes=bytesOf(asset)){
 if(!requestId||!Buffer.isBuffer(bytes))throw invalid();
 return {...asset,binding:{requestId,targetKey:imageTargetKey(target),contextHash:imageContextHash(target),sha256:hash(bytes)}};
}
export function assertImageBinding(asset,{requestId,target,bytes=bytesOf(asset)}={}){
 const binding=asset?.binding;
 if(!binding||!Buffer.isBuffer(bytes)||binding.requestId!==requestId||target&&(binding.targetKey!==imageTargetKey(target)||binding.contextHash!==imageContextHash(target))||hash(bytes)!==binding.sha256)throw invalid();
 return true;
}
export function validateWebpageBindings(page,files){
 const requestId=page.visualAssets?.requestId;if(!requestId)return;
 const check=(asset,slot)=>{if(!asset)return;const target=page.imageStrategy?.plan.find(plan=>plan.role===slot.role&&(!slot.sectionId||plan.sectionId===slot.sectionId)&&(!slot.itemTitle||plan.itemTitle===slot.itemTitle));if(!target&&slot.role!=='logo')throw invalid();const bytes=files[asset.url?.replace(/^\.\//,'')];if(!Buffer.isBuffer(bytes))throw invalid();assertImageBinding(asset,{requestId,target,bytes});};
 check(page.visualAssets.hero,{role:'hero'});check(page.visualAssets.logo,{role:'logo'});
 for(const section of page.sections){check(section.image,{role:'section',sectionId:section.id});for(const item of section.items)check(item.image,{role:'item',sectionId:section.id,itemTitle:item.title});}
}
export function webpageImageManifest(page,files){
 const manifest={};
 // Credits deliberately omit responsive variants. Bind the actual rendered
 // placements so every packaged raster, including smaller variants, is covered.
 const placements=[page.visualAssets?.hero,page.visualAssets?.logo,...page.sections.flatMap(section=>[section.image,...section.items.map(item=>item.image)])].filter(Boolean);
 for(const asset of placements)for(const variant of asset.variants||[]){
  const name=variant.url.replace(/^\.\//,''),bytes=files[name];if(!Buffer.isBuffer(bytes)||!asset.binding)throw invalid();
  manifest[name]={...asset.binding,sha256:hash(bytes)};
 }
 return manifest;
}
export function validatePresentationBindings(presentation){
 if(presentation.imageCoveragePlan?.coverRequired&&(!presentation.slides[0]?.photoAsset||presentation.slides[0].photoComposition!=='hero-full-bleed'))throw Object.assign(new Error('The first slide requires its embedded full-slide background.'),{code:'PPTX_REQUIRED_IMAGE_MISSING',stage:'presentation-cover',slideNumber:1});
 if(!presentation.imageRequestId)return;
 for(const slide of presentation.slides)for(const asset of slide.photoAssets||[slide.photoAsset].filter(Boolean)){
  const target={...asset.artDirection,subject:presentation.title,slideNumber:slide.slideNumber,slideTitle:slide.title};
  assertImageBinding(asset,{requestId:presentation.imageRequestId,target});
 }
}
