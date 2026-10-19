import {creativeDirectionSchema,BACKGROUNDS} from '../../templates/webpage/webpageSchema.mjs';
import {validateSchema} from '../ai/responseValidation.mjs';
import {webpageError} from './errors.mjs';

// Dedicated direction resolution, using AI planning without another model call.
export function directWebsite(page,context={}){
    const given=page.creativeDirection||{};
    if(page.creativeDirection)validateSchema(given,creativeDirectionSchema);
    const preferences=context.designPreferences||{};
    const words=[context.instructions,context.topic,context.websiteBrief?.brandPersonality,...(context.websiteBrief?.designAdjectives||[]),page.visualDirection].filter(Boolean).join(' ');
    const expressive=/expressive|playful|vibrant|maximal|festival/i.test(words);
    const restrained=/minimal|restrained|quiet|understated/i.test(words);
    const defaults={concept:page.visualDirection||'Content-led composition',personality:context.websiteBrief?.brandPersonality||page.designBrief.visualTone||'clear',background:/gradient/i.test(words)?'gradient':/textur/i.test(words)?'texture':'plain',spacing:page.designBrief.density==='compact'?'compact':'balanced',geometry:expressive?'round':restrained?'square':'soft',typeScale:expressive?'expressive':restrained?'restrained':'balanced',ctaStyle:expressive?'pill':'solid',interactions:[]};
    const direction={...defaults,...given};
    for(const key of ['background','spacing','geometry','typeScale','ctaStyle','interactions'])if(preferences[key]!==undefined)direction[key]=preferences[key];
    validateSchema(direction,creativeDirectionSchema);
    if(direction.concept.length>500||direction.personality.length>200)throw webpageError('Keep creative direction concise','creativeDirection');
    const features=(context.websiteBrief?.features||[]).join(' ');
    if(/\bsearch\b/i.test(features)&&!direction.interactions.includes('search'))direction.interactions.push('search');
    if(/\bfilter/i.test(features)&&!direction.interactions.includes('filter'))direction.interactions.push('filter');
    if(page.sections.some(s=>s.type==='gallery'&&s.items.length)&&!direction.interactions.includes('gallery'))direction.interactions.push('gallery');
    direction.interactions=[...new Set(direction.interactions)];
    const sections=page.sections.map((section,index)=>{
        const quiet=restrained||/minimal|quiet|restrained/i.test(direction.personality);
        const sequence=quiet?['plain','tinted','plain','tinted']:['plain',direction.background==='plain'?'brand':direction.background,'tinted','accent','plain','brand'];
        const background=section.background||sequence[index%sequence.length];
        if(!BACKGROUNDS.includes(background))throw webpageError('Unsupported section background',`sections[${index}].background`);
        return {...section,background};
    });
    return {...page,creativeDirection:direction,sections};
}
