import 'dotenv/config';
import fs from 'node:fs/promises';
import path from 'node:path';
import {GoogleGenAI} from '@google/genai';
import {generateWebpageContent} from '../../Service/ai/webpageGeneration.mjs';
import {generateService} from '../../Service/generateService.mjs';

const root=path.resolve('generated/webpage-live-beyond-earth');await fs.mkdir(root,{recursive:true});
const request=JSON.parse(await fs.readFile('tests/fixtures/beyondEarthRequest.json','utf8'));
const invalid=[];
const options={client:new GoogleGenAI({apiKey:process.env.GEMINI_API_KEY}),onPlan:plan=>fs.writeFile(path.join(root,'plan.json'),JSON.stringify(plan,null,2)),onInvalidContent:entry=>{invalid.push(entry);console.log('[INVALID CONTENT]',JSON.stringify({field:entry.field,message:entry.message}));}};
try{
    const result=process.argv.includes('--content-only')?await generateWebpageContent({client:options.client,inputType:'prompt',input:request.textPrompt,options}):await generateService('prompt',request.textPrompt,'webpage',{}, {ai:options});
    await fs.writeFile(path.join(root,process.argv.includes('--content-only')?'content.json':'result.json'),JSON.stringify(result,null,2));
    console.log('[BEYOND EARTH]',JSON.stringify({status:result.status||'content-completed',artifacts:result.artifacts,timings:result.timings}));
}catch(error){console.error('[BEYOND EARTH FAILED]',JSON.stringify({code:error.code,stage:error.stage,field:error.field,validationRule:error.validationRule,message:error.cause?.message||error.message}));process.exitCode=1;}
finally{await fs.writeFile(path.join(root,'invalid-content.json'),JSON.stringify(invalid,null,2));}
