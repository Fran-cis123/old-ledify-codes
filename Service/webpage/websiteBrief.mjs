import {safeLink,webpageError} from '../webpageContentValidator.mjs';

export const PAGE_SLUGS=['home','about','services','products','portfolio','contact'];
export function userWebsiteBrief(input,context={}){
    const supplied=context.websiteBrief || {};
    if(typeof supplied!=='object'||Array.isArray(supplied))throw webpageError('websiteBrief must be an object','context.websiteBrief','INVALID_WEBSITE_BRIEF');
    const text=(key,max=500)=>{const value=supplied[key];if(value==null)return '';if(typeof value!=='string'||value.length>max)throw webpageError('Invalid website brief field',`context.websiteBrief.${key}`,'INVALID_WEBSITE_BRIEF');return value.trim();};
    const list=(key,max=10)=>{const value=supplied[key] || [];if(!Array.isArray(value)||value.length>max||value.some(item=>typeof item!=='string'||item.length>200))throw webpageError('Expected a short list',`context.websiteBrief.${key}`,'INVALID_WEBSITE_BRIEF');return value;};
    const explicitPages=list('pages',6).map(name=>name.toLowerCase());
    if(explicitPages.some(name=>!PAGE_SLUGS.includes(name)))throw webpageError('Supported pages: home, about, services, products, portfolio, contact','context.websiteBrief.pages','INVALID_WEBSITE_BRIEF');
    const detected=/multi[ -]?page|separate pages|pages\s*:|\b(?:create|build|include|with|generate|need)\b.{0,150}\bpages?\b/i.test(input)?PAGE_SLUGS.filter(name=>new RegExp(`\\b${name}\\b`,'i').test(input)):[];
    const pages=[...new Set(['home',...(explicitPages.length?explicitPages:detected)])];
    const referenceUrls=list('referenceUrls',5).map(safeLink);
    const imageAssets=supplied.imageAssets || [];
    if(!Array.isArray(imageAssets)||imageAssets.length>4)throw webpageError('Supply at most four authorized image references','context.websiteBrief.imageAssets','INVALID_WEBSITE_BRIEF');
    for(const asset of imageAssets){
        if(!asset||asset.rightsConfirmed!==true||['creator','license','alt'].some(key=>typeof asset[key]!=='string'||!asset[key].trim()||asset[key].length>240)||!['hero','section','item'].includes(asset.role))throw webpageError('Image references require confirmed rights, creator, license, alt text and role','context.websiteBrief.imageAssets','INVALID_WEBSITE_BRIEF');
        safeLink(asset.url);
    }
    const logoUrl=text('logoUrl',500);if(logoUrl)safeLink(logoUrl);
    const canonicalUrl=text('canonicalUrl',500);if(canonicalUrl)safeLink(canonicalUrl);
    return {name:text('name',60),industry:text('industry',40),organizationDescription:text('organizationDescription'),audience:text('audience',200),purpose:text('purpose'),conversionGoal:text('conversionGoal',100),brandPersonality:text('brandPersonality',200),designAdjectives:list('designAdjectives',3),preferredTypography:text('preferredTypography',40),photoSubjects:list('photoSubjects',4),photographyStyle:text('photographyStyle',150),lighting:text('lighting',100),colorTemperature:text('colorTemperature',50),crop:text('crop',50),features:list('features'),preferredElements:list('preferredElements'),dislikedElements:list('dislikedElements'),avoidPatterns:list('avoidPatterns'),referenceUrls,pages,imageAssets,logoUrl,canonicalUrl};
}

export function compileWebsiteBrief(page,input,context={}){
    const user=userWebsiteBrief(input,context),design=page.designBrief || {};
    const subjects={healthcare:['laboratory research','quality-control equipment'],hospitality:['prepared dishes','ingredients'],'real-estate':['residential interiors','architectural details'],legal:['civic architecture'],finance:['financial district architecture'],fitness:['exercise equipment'],education:['learning environments','library'],technology:['source-backed product workflow'],creative:['supplied project work'],retail:['supplied products']};
    return {
        project:{name:user.name||page.brandName,industry:user.industry||design.industry||'',description:user.organizationDescription||page.hero.subheadline,audience:user.audience||design.audience||page.inferredContext?.audience||'',purpose:user.purpose||page.inferredContext?.purpose||'Explain the supplied offering',conversionGoal:user.conversionGoal||design.conversionGoal||page.hero.actionLabel,pages:user.pages,features:user.features},
        brand:{personality:user.brandPersonality||design.visualTone||'considered',adjectives:user.designAdjectives.length?user.designAdjectives:['clear','purposeful','restrained'],colors:context.designPreferences?.colors||page.design||{},logoUrl:user.logoUrl,typography:user.preferredTypography||page.designSpec?.fontPair||'contextual',preferredElements:user.preferredElements,dislikedElements:user.dislikedElements,avoidPatterns:user.avoidPatterns,referenceUrls:user.referenceUrls},
        photography:{subjects:user.photoSubjects.length?user.photoSubjects:design.imageDirection?[design.imageDirection]:subjects[design.industry]||[],style:user.photographyStyle||'natural editorial photography',lighting:user.lighting||'soft natural or task lighting',temperature:user.colorTemperature||'neutral',crop:user.crop||'preserve subject',placements:['hero','relevant section'],licensing:'Only authorized assets with retained provenance; stock must be labelled illustrative'},
        facts:{nameVerified:input.toLowerCase().includes((user.name||page.brandName).toLowerCase()),contact:{...page.contact},services:page.sections.filter(section=>['services','products'].includes(section.type)).flatMap(section=>section.items.map(({title,description,detail})=>({title,description,detail}))),credibility:page.sections.filter(section=>['statistics','testimonials','team','case-studies'].includes(section.type)).map(({type,items})=>({type,items})),unsupportedDetails:'Omitted; no company history, credentials, team or metrics inferred from stock imagery.'},
        technical:{responsive:true,accessibilityTarget:'WCAG 2.2 AA',performanceTarget:'Measure before claiming targets',seo:true,preview:true,downloadableSource:true,interactivity:['navigation','FAQ','email/telephone links'],forms:'Submission service is not configured; no form is represented as sending messages.'},
        canonicalUrl:user.canonicalUrl
    };
}
