import 'dotenv/config';
import fs from 'node:fs/promises';
import path from 'node:path';
import { generateService } from '../Service/generateService.mjs';
import { presentationLayoutService } from '../Service/presentationLayoutService.mjs';
import { presentationThemeService } from '../Service/presentationThemeService.mjs';
import { presentationRendererService } from '../Service/presentationRendererService.mjs';
import { resolvePresentationVisuals } from '../Service/visual/presentationVisuals.mjs';
import { previewRenderer } from '../renderer/presentation/previewRenderer.mjs';
import { GoogleGenAI } from '@google/genai';
import { createDiagramPlanner } from '../Service/visual/diagramPlanner.mjs';

export const cardiovascularPrompt='Create a professional 8-slide PowerPoint presentation on the human cardiovascular system. Cover the introduction, anatomy of the heart, cardiac chambers and valves, pulmonary circulation, systemic circulation, cardiac conduction system, functions of the cardiovascular system, and conclusion. Give each slide a unique title and meaningful scientific content. Avoid duplicate slides.';
export const sampleRequests = [
    {name:'cardiovascular',prompt:cardiovascularPrompt,context:{audience:'Undergraduate science students',includeSpeakerNotes:true,
        designPreferences:{theme:'scholarly-clean',variant:'ivory-journal',appearance:'light'},
        referenceMaterials:'Verified reference notes: the heart has right and left atria and ventricles. The tricuspid valve separates right atrium/right ventricle; mitral separates left atrium/left ventricle. Pulmonary valve is the right-ventricular outlet to pulmonary artery; aortic valve is the left-ventricular outlet to aorta. Chordae tendineae connect atrioventricular valve leaflets to papillary muscles, resisting prolapse during ventricular contraction; semilunar valves have no chordae. Pulmonary circuit goes right ventricle to lungs to left atrium; systemic circuit goes left ventricle to body to right atrium. SA node initiates impulses, AV node delays conduction, His bundle, bundle branches and Purkinje fibres activate ventricles. For most adults at rest, 60–100 beats/min is a usual range; fitness and circumstances matter. Typical resting cardiac output is about 5 L/min and varies with body size and activity. Transport supports acid-base balance with respiratory and renal regulation; it does not independently maintain pH. Arteries carry blood away, veins return it, and capillaries support exchange. Systole is contraction/ejection and diastole is relaxation/filling. Prioritize the explicitly requested eight sections; use notes for optional depth.',
        references:[{title:'NHLBI: Blood flow and valves',url:'https://www.nhlbi.nih.gov/health/heart/blood-flow'},
            {title:'NHLBI: Heart conduction and cycle',url:'https://www.nhlbi.nih.gov/health/heart/heart-beats'},
            {title:'AHA: Resting heart rate',url:'https://www.heart.org/en/healthy-living/exercise-and-physical-activity/fitness-basics/target-heart-rates'},
            {title:'Control of Cardiac Output: Introduction',url:'https://www.ncbi.nlm.nih.gov/books/NBK54473/'}]}},
    {name:'business',prompt:'Create a professional 5-slide presentation for a small architecture studio evaluating a clearer project handover process. Cover the current handover problem, proposed checklist, review workflow, ownership responsibilities, and conclusion. This is a proposal, not a completed intervention. No measured results, customer names, fees or dates are supplied.',context:{audience:'Studio managers',designPreferences:{appearance:'light'}}},
    {name:'technology',prompt:'Create a professional 5-slide educational technical presentation about secure web request handling. Cover the request lifecycle, input validation, authentication and authorization, safe database access, and conclusion. Explain mechanisms and distinguish authentication from authorization. No benchmark results or company-specific systems are supplied.',context:{audience:'Junior software engineers',designPreferences:{appearance:'dark'}}},
    {name:'education',prompt:'Create a 5-slide classroom presentation about the water cycle. Cover the introduction, evaporation and condensation, precipitation and collection, a proposed classroom demonstration, and conclusion. Use meaningful scientific mechanisms and a labeled cycle diagram. No experimental results are supplied.',context:{audience:'Secondary school students',designPreferences:{appearance:'light'}}},
    {name:'research',prompt:'Create a 5-slide research proposal about urban shade and outdoor thermal comfort. Cover the research question, proposed measurement approach, comparison design, limitations and confounders, and conclusion. No data have been collected. Do not invent temperatures, participant counts, findings, citations or claimed effects.',context:{audience:'Research supervisors',designPreferences:{appearance:'light'}}}
];

const root=path.resolve('generated/presentation-corrections');await fs.mkdir(root,{recursive:true});
const selected=process.argv.includes('--all')?sampleRequests:sampleRequests.filter(s=>process.argv.includes(s.name) || (process.argv.length===2 && s.name==='cardiovascular'));
const manifest=[];
for(const sample of selected){
    const directory=path.join(root,sample.name);await fs.mkdir(directory,{recursive:true});
    const resultFile=path.join(directory,'result.json');let result;
    if(process.argv.includes('--render-saved')){
        let saved={inputType:'prompt',input:sample.prompt,outputType:'presentation',context:sample.context};
        try{saved=JSON.parse(await fs.readFile(resultFile,'utf8'));}catch(error){if(error.code!=='ENOENT')throw error;}
        const content=JSON.parse(await fs.readFile(path.join(directory,'ai-content.json'),'utf8'));
        for(const slide of content.slides) slide.visualPlan=saved.generatedContent?.slides?.find(s=>s.slideNumber===slide.slideNumber)?.visualPlan || slide.visualPlan;
        const ready=presentationRendererService(presentationThemeService(presentationLayoutService(content,sample.context),sample.context));
        const visual=await resolvePresentationVisuals(ready,sample.context,{external:false,...(process.argv.includes('--resolve-diagrams')?{diagramPlanner:createDiagramPlanner()}:{} )});
        const preview=await previewRenderer(visual);
        result={...saved,generatedContent:visual,preview,warnings:[...visual.warnings,...preview.warnings],status:preview.status==='completed'&&visual.warnings.length?'completed_with_warnings':preview.status};
    } else if(!process.argv.includes('--fresh')) {
        try{result=JSON.parse(await fs.readFile(resultFile,'utf8'));await fs.access(result.preview.files.pptxPath);console.log('[SAMPLE REUSED]',sample.name);}catch(error){if(error.code!=='ENOENT')throw error;}
    }
    if(process.argv.includes('--review-saved')) result=null;
    if(!result){
        console.log('[LIVE SAMPLE START]',sample.name);
        // Save approved AI content independently so renderer refinements never
        // incur another provider charge or lose content when conversion fails.
        const {aiService}=await import('../Service/aiService.mjs');
        const provider=new GoogleGenAI({apiKey:process.env.GEMINI_API_KEY});
        const client={models:{generateContent:async request=>{try{return await provider.models.generateContent(request);}catch(error){
            if(process.argv.includes('--probe')){
                await fs.writeFile(path.join(directory,'request-schema.json'),JSON.stringify(request.config.responseJsonSchema,null,2));
                const stripped=structuredClone(request.config.responseJsonSchema);
                delete stripped.properties.requirements; delete stripped.properties.slides.items.properties.visualRequirement;delete stripped.properties.slides.items.properties.objective;
                const reqOnly=structuredClone(stripped); reqOnly.properties.requirements=request.config.responseJsonSchema.properties.requirements;
                const visOnly=structuredClone(stripped); visOnly.properties.slides.items.properties.visualRequirement=request.config.responseJsonSchema.properties.slides.items.properties.visualRequirement;
                for(const [label,config] of [['requirements-only',{...request.config,responseJsonSchema:reqOnly}],['visual-only',{...request.config,responseJsonSchema:visOnly}]]){
                    try{const r=await provider.models.generateContent({model:request.model,contents:'Return a title for a biology presentation.',config});console.log('[PROBE]',label,r.candidates?.[0]?.finishReason);}catch(e){console.log('[PROBE]',label,e.status,String(e.message).split(process.env.GEMINI_API_KEY).join('[redacted]'));}
                }
            }
            const message=String(error.message).split(process.env.GEMINI_API_KEY).join('[redacted]');
            await fs.writeFile(path.join(directory,'provider-diagnostic.txt'),message);throw error;
        }}}};
        const initialPresentation=process.argv.includes('--review-saved')?JSON.parse(await fs.readFile(path.join(directory,'ai-content.json'),'utf8')):undefined;
        const ai=await aiService('prompt',sample.prompt,'presentation',sample.context,{client,initialPresentation,onCheckpoint:content=>fs.writeFile(path.join(directory,'ai-content.json'),JSON.stringify(content,null,2))});
        await fs.writeFile(path.join(directory,'ai-content.json'),JSON.stringify(ai.generatedContent,null,2));
        const ready=presentationRendererService(presentationThemeService(presentationLayoutService(ai.generatedContent,sample.context),sample.context));
        const visual=await resolvePresentationVisuals(ready,sample.context,{external:false,diagramPlanner:createDiagramPlanner({client})});
        const preview=await previewRenderer(visual);
        result={...ai,generatedContent:visual,preview,warnings:[...visual.warnings,...preview.warnings],status:preview.status==='completed'&&visual.warnings.length?'completed_with_warnings':preview.status};
    }
    await fs.writeFile(resultFile,JSON.stringify(result,null,2));
    await fs.copyFile(result.preview.files.pptxPath,path.join(directory,'presentation.pptx'));
    if(result.preview.files.pdfPath) await fs.copyFile(result.preview.files.pdfPath,path.join(directory,'presentation.pdf'));
    manifest.push({name:sample.name,directory,status:result.status,preview:result.preview,warnings:result.warnings});
    await fs.writeFile(path.join(root,'manifest.json'),JSON.stringify(manifest,null,2));
    console.log('[LIVE SAMPLE COMPLETE]',sample.name,result.status,JSON.stringify(result.warnings));
}
