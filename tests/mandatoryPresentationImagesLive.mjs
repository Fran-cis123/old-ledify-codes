import 'dotenv/config';
import fs from 'node:fs/promises';
import {appendFileSync} from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {generateService} from '../Service/generateService.mjs';

const name=process.argv[2]||'space',root=path.resolve('generated/mandatory-presentation-images',process.env.LEDIFY_LIVE_RUN_DIRECTORY||name);await fs.mkdir(root,{recursive:true});
const scenario={space:JSON.parse(await fs.readFile('tests/fixtures/spacePresentationRequest.json','utf8')),business:{textPrompt:'Create a professional 3-slide presentation titled Evidence-Based Business Expansion. Slide 1: Evidence-Based Business Expansion. Slide 2: Market Evaluation. Slide 3: Expansion Decisions. Explain customer discovery, operational readiness and evidence-based pilot decisions without invented performance data or clients. Use distinct relevant conceptual photographs on all three slides, a refined corporate theme and readable layouts.'},medical:{textPrompt:'Create a professional 3-slide presentation titled Scientific Laboratory Quality. Slide 1: Scientific Laboratory Quality. Slide 2: Sample Handling. Slide 3: Reliable Laboratory Practice. Explain sample traceability, contamination control and documented review. Use distinct relevant conceptual laboratory photographs on all three slides. Do not invent test results or portray generated photographs as diagnostic evidence.'}}[name];
assert.ok(scenario,'Unknown live scenario');
await fs.writeFile(path.join(root,'request.json'),JSON.stringify(scenario,null,2));
const log=entry=>{appendFileSync(path.join(root,'ai.log'),JSON.stringify(entry)+'\n');console.log('[AI]',JSON.stringify(entry));};
try{
    let initialPresentation;
    if(process.argv.includes('--resume')){
        try{initialPresentation=JSON.parse(await fs.readFile(path.join(root,'ai-content.json'),'utf8'));}
        catch{try{initialPresentation=JSON.parse(await fs.readFile(path.join(root,'ai-partial.json'),'utf8'));}catch{}}
    }
    const result=await generateService('prompt',scenario.textPrompt,'presentation',{}, {ai:{initialPresentation,logger:log,onSlideCheckpoint:content=>fs.writeFile(path.join(root,'ai-partial.json'),JSON.stringify(content,null,2)),onCheckpoint:content=>fs.writeFile(path.join(root,'ai-content.json'),JSON.stringify(content,null,2))},visuals:{diagramPlanner:false},preview:{outputDirectory:path.join(root,'previews')}});
    await fs.writeFile(path.join(root,'result.json'),JSON.stringify(result,null,2));
    assert.equal(result.preview.stages.pptx,'completed');assert.equal(result.preview.stages.pdf,'completed');assert.equal(result.preview.stages.png,'completed');
    const count=name==='space'?10:3;
    assert.equal(result.preview.slideCount,count);assert.equal(result.preview.quality.pptx.slidesWithPictures,count);assert.ok(result.preview.quality.pptx.embeddedImages>=count);assert.equal(result.preview.quality.preview.images.photographs,count);
    await fs.copyFile(result.preview.files.pptxPath,path.join(root,'presentation.pptx'));await fs.copyFile(result.preview.files.pdfPath,path.join(root,'presentation.pdf'));
    await fs.mkdir(path.join(root,'slides'),{recursive:true});for(const slide of result.preview.slides)await fs.copyFile(slide.filePath,path.join(root,'slides',slide.fileName));
    const summary={scenario:name,status:result.status,slideCount:count,embeddedImages:result.preview.quality.pptx.embeddedImages,slidesWithPictures:result.preview.quality.pptx.slidesWithPictures,pixelChecks:result.preview.quality.preview.images,perSlide:result.preview.quality.pptx.slides,model:process.env.GOOGLE_IMAGE_MODEL,timings:result.timings};await fs.writeFile(path.join(root,'verification.json'),JSON.stringify(summary,null,2));console.log('[MANDATORY IMAGES VERIFIED]',JSON.stringify({...summary,pixelChecks:undefined,perSlide:undefined}));
}catch(error){const failure={code:error.code,stage:error.stage,field:error.field,slideNumber:error.slideNumber,missingSlides:error.missingSlides,imageDiagnostics:error.imageDiagnostics,imageBudget:error.imageBudget,validationErrors:error.validationErrors,message:error.message,cause:error.cause?.message};await fs.writeFile(path.join(root,'failure.json'),JSON.stringify(failure,null,2));console.error('[MANDATORY IMAGES FAILED]',JSON.stringify(failure));process.exitCode=1;}
