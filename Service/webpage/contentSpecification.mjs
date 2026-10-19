import {validateSchema} from '../ai/responseValidation.mjs';
import {needsFactualSkeleton} from './sparseContent.mjs';
import {webpageError} from './errors.mjs';
import {isInformationalWebsite} from './contentGrounding.mjs';
const text={type:'string'};
const entry={type:'object',properties:{field:text,reason:text},required:['field','reason'],additionalProperties:false};
export const contentSpecificationSchema={type:'object',properties:{mode:{type:'string',enum:['general-explanatory','source-grounded']},identity:text,audience:text,visitorObjective:text,secondaryObjectives:{type:'array',items:text},missingInformation:{type:'array',items:entry},omittedSections:{type:'array',items:text}},required:['mode','identity','audience','visitorObjective','secondaryObjectives','missingInformation','omittedSections'],additionalProperties:false};

export function specifyWebsiteContent(plan,input,context={}){
    const thin=needsFactualSkeleton(input,context)&&['business','service','restaurant','ecommerce','agency','nonprofit','startup','product','education'].includes(plan.pageType);
    const missingInformation=[],omittedSections=[];
    const contactPresent=/[\w.+-]+@[\w.-]+\.[a-z]{2,}|\+\d[\d ()-]{7,}/i.test(input);
    const original=plan.sections,informational=isInformationalWebsite(plan.pageType,input);
    const retained=original.filter(section=>{
        const omit=thin&&(['products','statistics','testimonials','team','case-studies','pricing'].includes(section.type)||section.type==='contact'&&!contactPresent);
        if(omit){omittedSections.push(section.heading);missingInformation.push({field:section.type,reason:'Organization-specific evidence or a working contact destination is required.'});}
        return !omit;
    }).map(section=>{
        // Business case studies/teams require verbatim source records. A science
        // article about missions or astronauts is an explanatory topic instead;
        // resolve this before drafting, rather than demand impossible quotations.
        if(informational&&['services','products','projects','case-studies','team'].includes(section.type))return {...section,type:'topics',purpose:`Explain ${section.heading} as a scientific or editorial topic. Preserve source facts and distinguish established knowledge from proposed future concepts. Do not invent missions, credentials, people or numerical claims.`};
        return thin?{...section,type:['services','features'].includes(section.type)?'topics':section.type,purpose:`Explain ${section.heading} as a general industry topic. Do not claim that ${plan.brandName} performs these activities or holds credentials.`}:section;
    });
    if(thin)missingInformation.push({field:'organizationFacts',reason:'Supply verified offerings, operational details and credentials before publishing organization-specific claims.'});
    if(thin)for(const [field,pattern]of [['manufacturingCapabilities',/manufacturing capabilit/i],['therapeuticFocus',/therapeutic focus/i],['regulatoryCredentials',/quality.{0,20}compliance|certification/i]])if(pattern.test(input))missingInformation.push({field,reason:'This requested topic is explained generally; verified organization-specific details are needed for factual corporate claims.'});
    if(!contactPresent)missingInformation.push({field:'contact',reason:'Supply a verified email, telephone or integrated inquiry destination.'});
    if(retained.length<2)throw webpageError('Provide enough subject material for at least two useful sections','sections','WEBPAGE_CONTENT_REQUIRED');
    const pages=plan.pages?.map(page=>({...page,sectionIndexes:page.sectionIndexes.map(index=>retained.findIndex(section=>section.heading===original[index]?.heading)).filter(index=>index>=0)}));
    const specification={mode:thin?'general-explanatory':'source-grounded',identity:context.websiteBrief?.name||plan.brandName,audience:context.websiteBrief?.audience||plan.inferredContext.audience,visitorObjective:context.websiteBrief?.conversionGoal||plan.designBrief?.conversionGoal||'Understand the subject',secondaryObjectives:retained.map(section=>section.heading),missingInformation,omittedSections};
    validateSchema(specification,contentSpecificationSchema);
    return {plan:{...plan,sections:retained,pages},specification};
}

export const internalCopy=/\b(?:information to provide|verified details (?:have|has) not been (?:provided|supplied)|add (?:confirmed|verified|information here)|specific information has not been provided|insert company description|editable content|additional verified (?:organization )?information|details have not been provided)\b/i;
export function validateEditorialCopy(page){
    const values=[page.hero?.headline,page.hero?.subheadline,page.description,page.callToAction?.heading,page.callToAction?.text,...(page.sections||[]).flatMap(section=>[section.heading,section.content,...section.items.flatMap(item=>[item.title,item.description,item.detail])])];
    if(values.some(value=>internalCopy.test(value||'')))throw webpageError('Editor instructions and missing-information notices belong in metadata, not website copy. Write a useful general explanation or omit the unsupported section.','sections','WEBPAGE_EDITORIAL_INVALID');
}
export function reframeScopedHero(page,specification){
    if(specification?.mode!=='general-explanatory'||!page.hero)return page;
    const text=page.hero.subheadline;
    if(/^(?:delivering|providing|offering|producing|manufacturing|supplying|operating)\b/i.test(text)){
        const subject=text.replace(/^(?:delivering|providing|offering|producing|manufacturing|supplying|operating)\s+/i,'').replace(/\.$/,'');
        page.hero={...page.hero,subheadline:'An introduction to '+subject[0].toLowerCase()+subject.slice(1)+'.'};
    }
    return page;
}
