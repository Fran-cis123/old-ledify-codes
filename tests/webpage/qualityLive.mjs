import 'dotenv/config';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fixtures} from './fixtures.mjs';
import {generateService} from '../../Service/generateService.mjs';
const names=process.argv.slice(2).length?process.argv.slice(2):['pharmaceutical','restaurant','fashion','startup','school','portfolio'];
const manifest=[];await fs.mkdir('generated/webpage-quality-live',{recursive:true});
for(const name of names){
    const fixture=fixtures[name];if(!fixture)throw new Error('Unknown fixture');
    const source=name==='pharmaceutical'?JSON.parse(await fs.readFile('tests/fixtures/pharmaxDesignRequest.json','utf8')).textPrompt:fixture.source;
    const directory=path.resolve('generated/webpage-quality-live',name);await fs.mkdir(directory,{recursive:true});
    const invalid=[];
    try{
        const result=await generateService('prompt',source,'webpage',{}, {ai:{onInvalidContent:entry=>invalid.push(entry)}});await fs.writeFile(path.join(directory,'result.json'),JSON.stringify(result,null,2));
        manifest.push({name,directory,artifacts:result.artifacts});
        console.log(JSON.stringify({name,status:result.status,timings:result.timings,previewUrl:result.artifacts.previewUrl,images:result.generatedContent.imageStrategy,contentScope:result.generatedContent.contentSpecification}));
    }catch(error){const failure={name,errorCode:error.code,stage:error.stage,field:error.field,lastErrorCode:error.lastErrorCode,providerReason:error.providerReason,providerStatus:error.providerStatus};await fs.writeFile(path.join(directory,'failure.json'),JSON.stringify(failure,null,2));console.log(JSON.stringify(failure));process.exitCode=1;}
    if(invalid.length)await fs.writeFile(path.join(directory,'invalid-drafts.json'),JSON.stringify(invalid,null,2));
    await fs.writeFile('generated/webpage-quality-live/manifest.json',JSON.stringify(manifest,null,2));
}
