import {validatePresentationContent} from '../presentationContentValidator.mjs';
import {AiGenerationError} from './responseValidation.mjs';
import {canonicalTitles} from './presentationQuality.mjs';
import {validateRenderContent} from '../../renderer/presentation/professionalLayouts.mjs';

export function validateCompletedPresentation(presentation,source) {
    validatePresentationContent({
        outputType:presentation.outputType,title:presentation.title,subtitle:presentation.subtitle,
        strategyId:presentation.strategyId,inferredContext:presentation.inferredContext,
        slides:presentation.slides.map(({slideNumber,slideType,title,subtitle,content})=>({slideNumber,slideType,title,subtitle,content}))
    },source);
    for(const slide of presentation.slides)validateRenderContent(slide);
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
                if(/Presentation (?:title|subtitle)/i.test(issue))numbers.push(1);
                for(const number of numbers)if(presentation.slides[number-1]){
                    if(!targets.has(number))targets.set(number,[]);
                    targets.get(number).push(issue);
                }
            }
            if(round===2||!targets.size)throw new AiGenerationError('AI_SCHEMA_VALIDATION_FAILED','Presentation still fails content validation',{
                requestId,stage:'presentation-validation',validationRule:'PRESENTATION_CONTENT',slideNumber:targets.keys().next().value,cause:error
            });
            for(const [number,requirements] of targets){
                const repaired=await repairSlide(presentation.slides[number-1],requirements.join('\n'));
                Object.assign(presentation.slides[number-1],repaired);
            }
            canonicalTitles(presentation);
        }
    }
}
