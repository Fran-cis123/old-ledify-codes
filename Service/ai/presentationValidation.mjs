import {validatePresentationContent} from '../presentationContentValidator.mjs';
import {AiGenerationError} from './responseValidation.mjs';
import {canonicalTitles} from './presentationQuality.mjs';
import {presentationLayoutService} from '../presentationLayoutService.mjs';

export function validateCompletedPresentation(presentation,source) {
    validatePresentationContent({
        outputType:presentation.outputType,title:presentation.title,subtitle:presentation.subtitle,
        strategyId:presentation.strategyId,inferredContext:presentation.inferredContext,
        slides:presentation.slides.map(({slideNumber,slideType,title,subtitle,content})=>({slideNumber,slideType,title,subtitle,content}))
    },source);
    presentationLayoutService(presentation,source?.context||{});
    return true;
}

export async function repairPresentationValidation({presentation,source,requestId,repairSlide}) {
    for(let round=0;round<=2;round++){
        try{validateCompletedPresentation(presentation,source);return;}
        catch(error){
            const issues=error.validationErrors||[error.message];
            const targets=new Map();
            for(const issue of issues){
                const numbers=[...issue.matchAll(/\bSlide (\d+)/g)].map(match=>Number(match[1]));
                numbers.push(...[...issue.matchAll(/slides\[(\d+)\]/g)].map(match=>Number(match[1])+1));
                if(/Presentation averages approximately/i.test(issue)) numbers.push(...presentation.slides.map((_,index)=>index+1));
                if(/Presentation (?:title|subtitle)/i.test(issue))numbers.push(1);
                for(const number of numbers)if(presentation.slides[number-1]){
                    if(!targets.has(number))targets.set(number,[]);
                    targets.get(number).push(issue);
                }
            }
            if(round===2||!targets.size)throw new AiGenerationError('AI_SCHEMA_VALIDATION_FAILED','Presentation still fails content validation',{
                requestId,stage:'presentation-validation',validationRule:'PRESENTATION_CONTENT',slideNumber:targets.keys().next().value,validationErrors:issues,cause:error
            });
            for(const [number,requirements] of targets){
                const slide=presentation.slides[number-1];
                const planned=source?.plannedSlides?.find(item=>item.slideNumber===number);
                const instructions=[...requirements,
                    'Resolve these exact validation failures in the visible content. Preserve the slide number, semantic type and approved objective.',
                    `Approved objective: ${JSON.stringify(planned || {title:slide.title})}`,
                    `Other slides (avoid duplicating their title or body): ${JSON.stringify(presentation.slides.filter(item=>item!==slide).map(({slideNumber,title,content})=>({slideNumber,title,content})))}`];
                if(requirements.some(issue=>/drifted away/i.test(issue))) instructions.push('Make the connection to the presentation topic explicit in the visible body, and explain the approved subtopic using its specific terminology.');
                if(requirements.some(issue=>/Presentation averages/i.test(issue))) instructions.push('Reduce visible text to fewer than 100 words while preserving essential facts.');
                const repaired=await repairSlide(structuredClone(slide),instructions.join('\n'));
                // Callbacks may return either complete slide metadata or canonical content.
                const candidate=repaired?.content?{...slide,...repaired}:{...slide,content:repaired};
                candidate.slideNumber=slide.slideNumber;
                candidate.slideType=slide.slideType;
                presentationLayoutService({title:presentation.title,subtitle:presentation.subtitle,slides:[candidate]},source?.context||{});
                Object.assign(slide,candidate);
            }
            canonicalTitles(presentation);
        }
    }
}
