import 'dotenv/config';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fixtures} from './fixtures.mjs';
import {generateService} from '../../Service/generateService.mjs';
import {GoogleGenAI} from '@google/genai';
import {webpagePlanSchema} from '../../templates/webpage/webpageSchema.mjs';
if(process.argv.includes('--diagnose-schema')){
    const client=new GoogleGenAI({apiKey:process.env.GEMINI_API_KEY});
    const legacy=structuredClone(webpagePlanSchema);delete legacy.properties.creativeDirection;delete legacy.properties.imagePlan;delete legacy.properties.sections.items.properties.background;
    for(const [name,schema] of Object.entries({minimal:{type:'object',properties:{title:{type:'string'}},required:['title']},legacy,creative:{...legacy,properties:{...legacy.properties,creativeDirection:webpagePlanSchema.properties.creativeDirection}},images:{...legacy,properties:{...legacy.properties,imagePlan:webpagePlanSchema.properties.imagePlan}}})){
        try{await client.models.generateContent({model:process.env.GEMINI_WEBPAGE_PLAN_MODEL||'gemini-3.7-flash',contents:'Return a valid website plan for an educational article about reading.',config:{responseMimeType:'application/json',responseJsonSchema:schema,maxOutputTokens:128}});console.log(name+': provider accepted schema');}
        catch(error){console.log(name+': '+String(error.message).split(process.env.GEMINI_API_KEY).join('[redacted]').replace(/AIza[\w-]+/g,'[redacted]').slice(0,1800));}
    }
}
const names=process.argv.includes('--diagnose-schema')?[]:process.argv.slice(2).length?process.argv.slice(2):['nonprofit','event'];
for(const name of names){
    if(!fixtures[name])throw new Error('Unknown fixture name');
    const root=path.resolve('generated/webpage-universal-live',name);await fs.mkdir(root,{recursive:true});
    try{
        const result=await generateService('prompt',fixtures[name].source,'webpage');
        await fs.writeFile(path.join(root,'result.json'),JSON.stringify(result,null,2));
        console.log(JSON.stringify({name,status:result.status,previewUrl:result.artifacts.previewUrl,images:result.generatedContent.imageStrategy,creativeDirection:result.generatedContent.creativeDirection,timings:result.timings,warnings:result.warnings.map(w=>w.code)}));
    }catch(error){
        const failure={name,status:'failed',code:error.code||'GENERATION_FAILED',stage:error.stage,field:error.field,lastCode:error.lastErrorCode};
        await fs.writeFile(path.join(root,'failure.json'),JSON.stringify(failure,null,2));console.log(JSON.stringify(failure));process.exitCode=1;
    }
}
