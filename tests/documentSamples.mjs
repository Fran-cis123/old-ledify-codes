import 'dotenv/config';
import fs from 'node:fs/promises';
import path from 'node:path';
import { GoogleGenAI } from '@google/genai';
import { generateDocumentContent } from '../Service/document/documentGeneration.mjs';
import { documentArtifactService } from '../Service/document/documentArtifactService.mjs';
const root=path.resolve('generated/document-samples');
const exportNames={academic:'Cardiovascular Academic Report.docx',business:'Digital Learning Business Proposal.docx',technical:'REST API Technical Guide.docx',letter:'Internship Application Letter.docx',renewable:'Renewable Energy Report.docx'};
const samples={
    academic:{prompt:'Create a comprehensive academic report on the human cardiovascular system, covering anatomy, physiology, circulation, and conclusion.',context:{requiredTopics:['anatomy','physiology','circulation','conclusion']}},
    business:{prompt:'Create a professional business proposal for a digital learning platform.',context:{}},
    technical:{prompt:'Create technical documentation explaining how a REST API works.',context:{}},
    letter:{prompt:'Create a formal application letter for an internship.',context:{}},
    renewable:{prompt:'Create a detailed ten-page educational report on renewable energy.',context:{}}
};
const selected=process.argv.slice(2).filter(name=>samples[name]);
const provider=new GoogleGenAI({apiKey:process.env.GEMINI_API_KEY});
const client={models:{generateContent:async request=>{try{const response=await provider.models.generateContent(request);await fs.writeFile(path.join(root,'last-provider-response.json'),response.text||'');return response;}catch(error){await fs.mkdir(root,{recursive:true});await fs.writeFile(path.join(root,'provider-diagnostic.txt'),String(error.message).replaceAll(process.env.GEMINI_API_KEY||'no-key','[REDACTED]'));throw error;}}}};
for(const name of selected.length?selected:Object.keys(samples)) {
    const sample=samples[name],directory=path.join(root,name);await fs.mkdir(directory,{recursive:true});
    const checkpoint=path.join(directory,'content.json');let document;
    try{document=JSON.parse(await fs.readFile(checkpoint,'utf8'));console.log(name,'using saved approved content');}
    catch(error){
        if(error.code!=='ENOENT')throw error;
        const initialPlan=await fs.readFile(path.join(directory,'plan.json'),'utf8').then(JSON.parse).catch(()=>undefined);
        const saved=initialPlan?await fs.readFile(path.join(directory,'checkpoint.json'),'utf8').then(JSON.parse).catch(()=>undefined):undefined;
        document=await generateDocumentContent({client,inputType:'prompt',input:sample.prompt,context:sample.context,options:{initialPlan,initialSections:saved?.sections,
            onReview:(review,round)=>fs.writeFile(path.join(directory,`review-${round}.json`),JSON.stringify(review,null,2)),
            onPlan:plan=>fs.writeFile(path.join(directory,'plan.json'),JSON.stringify(plan,null,2)),
            onCheckpoint:doc=>fs.writeFile(path.join(directory,'checkpoint.json'),JSON.stringify(doc,null,2))}});
        await fs.writeFile(checkpoint,JSON.stringify(document,null,2));
    }
    const artifacts=await documentArtifactService(document,{instructions:sample.prompt,...sample.context});
    await fs.copyFile(path.resolve('generated/documents',artifacts.id,'document.docx'),path.join(directory,'document.docx'));
    await fs.mkdir(path.join(root,'final'),{recursive:true});
    await fs.copyFile(path.join(directory,'document.docx'),path.join(root,'final',exportNames[name]));
    await fs.writeFile(path.join(directory,'result.json'),JSON.stringify({prompt:sample.prompt,artifacts,length:document.length,warnings:document.warnings},null,2));
    console.log(name,'completed',document.length.actualWords,'words',artifacts.validation);
}
