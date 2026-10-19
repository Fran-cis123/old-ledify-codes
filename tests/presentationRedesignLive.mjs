import 'dotenv/config';
import fs from 'node:fs/promises';
import path from 'node:path';
import {healthcare} from './fixtures/presentationRedesign.mjs';
import {generateService} from '../Service/generateService.mjs';

const root=path.resolve('generated/presentation-redesign/live-healthcare');await fs.mkdir(root,{recursive:true});
const titles=healthcare.presentation.slides.map(s=>s.title);
const input='Create a professional 10-slide presentation for university students and healthcare professionals. Explain mechanisms, distinctions, limitations and responsible clinical oversight. Do not invent measurements, certifications or study results. Use exactly these slide topics at these positions:\n'+titles.map((title,i)=>`Slide ${i+1}: ${title}`).join('\n');
await fs.writeFile(path.join(root,'request.json'),JSON.stringify({textPrompt:input,outputType:'presentation',context:{...healthcare.context,requiredTopics:titles}},null,2));
try{
    const initialPresentation=process.argv.includes('--review-saved')?JSON.parse(await fs.readFile(path.join(root,'ai-content.json'),'utf8')):undefined;
    const result=await generateService('prompt',input,'presentation',{...healthcare.context,requiredTopics:titles},
        {ai:{initialPresentation,onCheckpoint:content=>fs.writeFile(path.join(root,'ai-content.json'),JSON.stringify(content,null,2))},visuals:{diagramPlanner:false}});
    await fs.writeFile(path.join(root,'result.json'),JSON.stringify(result,null,2));
    await fs.copyFile(result.preview.files.pptxPath,path.join(root,'presentation.pptx'));
    if(result.preview.files.pdfPath)await fs.copyFile(result.preview.files.pdfPath,path.join(root,'presentation.pdf'));
    await fs.mkdir(path.join(root,'slides'),{recursive:true});
    for(const slide of result.preview.slides)await fs.copyFile(slide.filePath,path.join(root,'slides',slide.fileName));
    console.log('[LIVE HEALTHCARE]',result.status,JSON.stringify(result.timings),result.preview.status,result.preview.previewCount);
}catch(error){
    const diagnostic=Object.fromEntries(['code','stage','slideNumber','field','requestId','lastErrorCode','providerReason','providerStatus'].filter(k=>error[k]!=null).map(k=>[k,error[k]]));
    await fs.writeFile(path.join(root,'failure.json'),JSON.stringify(diagnostic,null,2));console.error('[LIVE HEALTHCARE FAILED]',JSON.stringify(diagnostic));process.exitCode=1;
}
