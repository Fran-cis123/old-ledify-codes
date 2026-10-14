import 'dotenv/config';
import fs from 'node:fs/promises';
import path from 'node:path';
import {combineGenerationInput} from '../Service/input/combinedInput.mjs';
import {urlService} from '../Service/urlService.mjs';
import {generateService} from '../Service/generateService.mjs';
const root=path.resolve('generated/document-live-repro');await fs.mkdir(root,{recursive:true});
const attachment=await fs.readFile(process.argv[2],'utf8');
const body=JSON.parse(attachment.match(/\{\s*"urlPrompt"[\s\S]*?\n\}/)[0]);
const html=await fs.readFile('generated/wikipedia-ai-source.html','utf8');
const combined=await combineGenerationInput({body,context:{},extractUrl:url=>urlService(url,{fetchText:async()=>({text:html,contentType:'text/html'})})});
const started=performance.now();
try {
    const result=await generateService(combined.inputType,combined.input,body.outputType,combined.context,{ai:{
        onPlan:plan=>fs.writeFile(path.join(root,'plan.json'),JSON.stringify(plan,null,2)),
        onCheckpoint:document=>fs.writeFile(path.join(root,'checkpoint.json'),JSON.stringify(document,null,2)),
        onReview:(review,round)=>fs.writeFile(path.join(root,`review-${round}.json`),JSON.stringify(review,null,2))
    }});
    const report={status:result.status,elapsedMs:Math.round(performance.now()-started),artifacts:result.artifacts,length:result.generatedContent.length,quality:result.generatedContent.quality,warnings:result.warnings};
    await fs.writeFile(path.join(root,'result.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({status:report.status,elapsedMs:report.elapsedMs,words:report.length.actualWords,sections:result.generatedContent.sections.length,quality:report.quality}));
} catch(error) {
    const report={errorCode:error.code,stage:error.stage,field:error.field,sectionId:error.sectionId,validationRule:error.validationRule,lastErrorCode:error.lastErrorCode,message:error.message};
    await fs.writeFile(path.join(root,'failure.json'),JSON.stringify(report,null,2));console.error(JSON.stringify(report));process.exitCode=1;
}
