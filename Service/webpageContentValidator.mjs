import { validateSchema, validateTextSafety } from './ai/responseValidation.mjs';
import { PAGE_TYPES, SECTION_TYPES, COMPOSITIONS, webpagePlanSchema } from '../templates/webpage/webpageSchema.mjs';
import { validateWebsiteClaims } from './webpage/contentGrounding.mjs';
import {validateEditorialCopy,contentSpecificationSchema} from './webpage/contentSpecification.mjs';
import {webpageError} from './webpage/errors.mjs';
export {webpageError} from './webpage/errors.mjs';

export function safeLink(value) {
    if (!value) return '';
    if (typeof value !== 'string' || /[\u0000-\u0020<>"'\\]/.test(value)) throw webpageError('Unsafe link', 'url');
    let url;
    try { url = new URL(value); } catch { throw webpageError('Links must be complete HTTPS URLs', 'url'); }
    if (url.protocol !== 'https:' || url.username || url.password) throw webpageError('Only HTTPS links without credentials are allowed', 'url');
    return url.href;
}
const normalize = s => s.toLowerCase().replace(/\s+/g, ' ').trim();
export function validateWebpagePlan(plan, source = '') {
    validateWebsiteClaims({hero:{title:plan.title}},source,{pageType:plan.pageType});
    if(plan.designSpec)validateSchema(plan.designSpec,webpagePlanSchema.properties.designSpec);
    if(plan.creativeDirection)validateSchema(plan.creativeDirection,webpagePlanSchema.properties.creativeDirection);
    if(plan.imagePlan){
        validateSchema(plan.imagePlan,webpagePlanSchema.properties.imagePlan);
        for(const image of plan.imagePlan)if(!image.subject.trim()||image.subject.length>300||!image.alt.trim()||image.alt.length>240||image.role!=='hero'&&(image.sectionIndex<0||image.sectionIndex>=plan.sections.length)||image.role==='item'&&(image.itemIndex<0||image.itemIndex>5))throw webpageError('Invalid image target or direction','imagePlan');
    }
    if(plan.pages){
        validateSchema(plan.pages,webpagePlanSchema.properties.pages);
        const slugs=new Set();
        for(const page of plan.pages){if(slugs.has(page.slug)||!page.title.trim()||page.title.length>80||page.sectionIndexes.some(index=>index<0||index>=plan.sections.length))throw webpageError('Invalid page plan','pages');slugs.add(page.slug);}
        if(!slugs.has('home'))throw webpageError('Multi-page plans need a home page','pages');
    }
    if (plan.designBrief) {
        validateSchema(plan.designBrief, webpagePlanSchema.properties.designBrief);
        for(const key of ['audience','conversionGoal','visualTone','imageDirection'])if(plan.designBrief[key].length>300)throw webpageError('Keep design intent under 300 characters',`designBrief.${key}`);
    }
    if (!PAGE_TYPES.includes(plan.pageType)) throw webpageError('Unsupported page category', 'pageType');
    if (!plan.title?.trim() || plan.title.length > 80) throw webpageError('Supply a concise website title', 'title');
    if (!plan.brandName?.trim() || plan.brandName.length > 60) throw webpageError('Use the supplied short brand name or a concise descriptive topic label, not an SEO title', 'brandName');
    if (plan.sections.length < 2 || plan.sections.length > 8) throw webpageError('Use 2–8 purposeful sections', 'sections');
    const seen = new Set();
    for (const [i, section] of plan.sections.entries()) {
        if (section.composition && !COMPOSITIONS.includes(section.composition)) throw webpageError('Unsupported section composition', `sections[${i}].composition`);
        if (!section.heading?.trim() || !section.purpose?.trim()) throw webpageError('Every planned section needs a heading and purpose', `sections[${i}]`);
        if (section.navLabel.length > 32) throw webpageError('Keep navigation labels under 32 characters', `sections[${i}].navLabel`);
        if (source && section.type === 'pricing' && !/[$£€₦]\s*\d|\d\s*(?:USD|NGN|EUR|GBP)|(?:contact|request|ask).{0,20}(?:quote|pricing)/i.test(source)) throw webpageError('Omit pricing unless a price or pricing policy is supplied', `sections[${i}].type`);
        const heading = normalize(section.heading);
        if (seen.has(heading)) throw webpageError('Duplicate planned section', `sections[${i}].heading`);
        seen.add(heading);
    }
    for (const color of ['primary', 'accent']) if (plan.design[color] && !/^#[\da-f]{6}$/i.test(plan.design[color])) throw webpageError('Colors must use #RRGGBB', `design.${color}`);
    return true;
}

export function validateWebpageContent(page, { plan, schema, source = '',scope=page.contentSpecification?.mode,identity=page.contentSpecification?.identity||page.brandName } = {}) {
    if (schema) validateSchema(page, schema);
    if(page.contentSpecification)validateSchema(page.contentSpecification,contentSpecificationSchema);
    validateTextSafety(page, 'webpage');
    validateEditorialCopy(page);
    validateWebsiteClaims(page,source,{scope,identity,pageType:plan?.pageType||page.pageType});
    const requireText = (value, field, limit) => {
        if (typeof value !== 'string' || !value.trim() || value.length > limit) throw Object.assign(webpageError(`Required readable text in ${field} (maximum ${limit} characters)`, field),{maxCharacters:limit,validationRule:'READABLE_TEXT'});
    };
    requireText(page.hero?.headline, 'hero.headline', 120);
    requireText(page.description || page.hero?.subheadline, 'description', 240);
    requireText(page.hero?.subheadline, 'hero.subheadline', 320);
    requireText(page.hero?.actionLabel || 'Explore', 'hero.actionLabel', 45);
    if (!Array.isArray(page.sections) || page.sections.length < 2 || page.sections.length > 8) throw webpageError('Expected 2–8 complete sections', 'sections');
    const headings = new Set(), bodies = new Set(), sourceText = normalize(source);
    for (const [i, section] of page.sections.entries()) {
        const field = `sections[${i}]`;
        if (!SECTION_TYPES.includes(section.type) || (plan && section.type !== plan.sections[i]?.type)) throw webpageError(`Section type does not match the page plan${plan?.sections[i]?`; use exactly "${plan.sections[i].type}" at this position`:''}`, `${field}.type`);
        requireText(section.heading, `${field}.heading`, 100);
        if (headings.has(normalize(section.heading))) throw webpageError('Duplicate section heading', `${field}.heading`);
        headings.add(normalize(section.heading));
        if (section.content) requireText(section.content, `${field}.content`, 1400);
        if (!section.content?.trim() && !section.items?.length) throw webpageError('Empty section body', field);
        if (!Array.isArray(section.items) || section.items.length > 6) throw webpageError('Expected up to six items', `${field}.items`);
        if (!['about', 'contact'].includes(section.type) && !section.items.length) throw webpageError('This section requires meaningful items', `${field}.items`);
        const fingerprint = normalize(section.content || JSON.stringify(section.items));
        if (bodies.has(fingerprint)) throw webpageError('Repeated section content', field);
        bodies.add(fingerprint);
        for (const [j, item] of section.items.entries()) {
            requireText(item.title, `${field}.items[${j}].title`, 90);
            requireText(item.description, `${field}.items[${j}].description`, 420);
            if (item.detail?.length > 100) throw webpageError('Item detail is too long', `${field}.items[${j}].detail`);
            safeLink(item.url);
            if (source && item.url && !sourceText.includes(normalize(item.url))) throw webpageError('A project/link URL was not supplied', `${field}.items[${j}].url`);
            if (source && section.type === 'testimonials' && (!sourceText.includes(normalize(item.description).replace(/^[“"]|[”"]$/g, '')) || !sourceText.includes(normalize(item.title)))) {
                throw webpageError('Testimonials and attributions must be quoted from the source', `${field}.items[${j}]`);
            }
            if(source && ['team','case-studies'].includes(section.type) && (!sourceText.includes(normalize(item.title)) || !sourceText.includes(normalize(item.description))))throw webpageError('Team and case-study facts must be quoted from the supplied source',`${field}.items[${j}]`);
            if (source && section.type === 'pricing' && !item.detail.trim()) throw webpageError('Pricing needs a supplied price or supplied pricing policy', `${field}.items[${j}].detail`);
            if (section.type === 'statistics' && (!item.detail?.trim() || (source && !sourceText.includes(normalize(item.detail))))) throw webpageError('Statistics need an exact supplied value', `${field}.items[${j}].detail`);
        }
    }
    const contact = page.contact || { email: '', phone: '', address: '' };
    if (contact.email && !/^[\w.!#$%&'*+/=?^`{|}~-]+@[\w.-]+\.[a-z]{2,}$/i.test(contact.email)) throw webpageError('Invalid contact email', 'contact.email');
    if (contact.phone && !/^[+\d\s().-]{5,35}$/.test(contact.phone)) throw webpageError('Invalid telephone number', 'contact.phone');
    if (source) {
        for (const [field, value] of Object.entries(contact)) if (value && !sourceText.includes(normalize(value))) throw webpageError('Contact information must occur in the source', `contact.${field}`);
        // Restrict numerical claims to supplied values; numbering is added by the renderer.
        const supplied = new Set(source.match(/\d+(?:[.,]\d+)*(?:%|\b)/g) || []);
        for (const value of strings({ hero: page.hero, sections: page.sections, callToAction: page.callToAction })) {
            for (const number of value.match(/\d+(?:[.,]\d+)*(?:%|\b)/g) || []) if (!supplied.has(number)) throw webpageError(`Numerical claims must be supplied in the source. Remove unsupported number ${number}; do not add item or step numbers, which the renderer supplies.`, 'sections');
        }
    }
    requireText(page.callToAction?.heading, 'callToAction.heading', 120);
    requireText(page.callToAction?.text, 'callToAction.text', 360);
    requireText(page.callToAction?.actionLabel || 'Explore', 'callToAction.actionLabel', 45);
    return true;
}
function strings(value) {
    if (typeof value === 'string') return [value];
    return value && typeof value === 'object' ? Object.values(value).flatMap(strings) : [];
}
