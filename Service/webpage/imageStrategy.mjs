import {centralImageSubject} from './imageReview.mjs';
const bounded=(value,fallback,min,max)=>Number.isFinite(Number(value))?Math.min(max,Math.max(min,Math.floor(Number(value)))):fallback;
export function imagePolicy(env=process.env){
    return {maxAssets:bounded(env.WEBPAGE_IMAGE_MAX_ASSETS,4,1,8),maxGenerated:bounded(env.WEBPAGE_IMAGE_MAX_GENERATED,2,0,4),timeoutMs:bounded(env.WEBPAGE_IMAGE_TIMEOUT_MS,30000,1000,60000),totalMs:bounded(env.WEBPAGE_IMAGE_TOTAL_MS,60000,1000,120000),retries:bounded(env.WEBPAGE_IMAGE_RETRIES,0,0,1),concurrency:bounded(env.WEBPAGE_IMAGE_CONCURRENCY,1,1,2)};
}
export function planWebsiteImages(page){
    const style=[page.websiteBrief?.photography.style,page.websiteBrief?.photography.lighting,page.websiteBrief?.photography.temperature].filter(Boolean).join('; ')||'natural editorial';
    const subjects=page.websiteBrief?.photography.subjects||[];
    const central=centralImageSubject(page);
    const hero={role:'hero',query:central.concepts.length?central.concepts.join(' ')+' '+(page.designBrief.imageDirection||''):central.description+' '+(page.designBrief.imageDirection||''),centralConcepts:central.concepts,alt:`Illustrative imagery for ${page.brandName}`,aspectRatio:'16:9',style,purpose:'Communicate the central subject: '+central.description,lighting:page.websiteBrief?.photography.lighting||'natural',temperature:page.websiteBrief?.photography.temperature||'neutral',focalPoint:page.websiteBrief?.photography.crop||'center',method:'authorized-source-or-configured-generation'};
    const planned=(page.imagePlan||[]).flatMap(image=>{
        const section=page.sections[image.sectionIndex],item=section?.items[image.itemIndex];
        if(image.role!=='hero'&&!section||image.role==='item'&&!item)return [];
        return [{role:image.role,sectionType:section?.type||'',sectionId:section?.id||'',itemTitle:item?.title||'',query:image.subject,alt:image.alt,aspectRatio:image.aspectRatio,style}];
    });
    if(!planned.some(image=>image.role==='hero')&&(page.designBrief.heroComposition!=='product'||subjects.some(subject=>!/workflow/i.test(subject))))planned.unshift(hero);
    for(const section of page.sections){
        if(section.type==='gallery')for(const item of section.items){
            if(!planned.some(image=>image.sectionId===section.id&&image.itemTitle===item.title))planned.push({role:'item',sectionType:section.type,sectionId:section.id,itemTitle:item.title,query:`${item.title}. ${item.description}`,alt:`Illustrative ${item.title}`,aspectRatio:'3:2',style});
        }
        else if(['image-text','image-band'].includes(section.composition)&&!planned.some(image=>image.sectionId===section.id))planned.push({role:'section',sectionType:section.type,sectionId:section.id,query:`${section.heading}. ${subjects.join(', ')}`,alt:`Illustrative imagery: ${section.heading}`,aspectRatio:'16:9',style});
    }
    const seen=new Set();return planned.filter(image=>{const key=[image.role,image.sectionId,image.itemTitle].join(':');if(seen.has(key))return false;seen.add(key);return true;}).map(image=>({...image,purpose:image.purpose||image.sectionType+' content: '+(image.itemTitle||image.query),lighting:image.lighting||page.websiteBrief?.photography.lighting||'natural',temperature:image.temperature||page.websiteBrief?.photography.temperature||'neutral',focalPoint:image.focalPoint||page.websiteBrief?.photography.crop||'center',method:image.method||'authorized-source-or-configured-generation'}));
}
