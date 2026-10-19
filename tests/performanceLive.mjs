import 'dotenv/config';
import fs from 'node:fs/promises';
import path from 'node:path';
import {generateService} from '../Service/generateService.mjs';
const phase=process.argv[2]||'before',root=path.resolve('generated/performance',phase);await fs.mkdir(root,{recursive:true});
const requests=[
    {...JSON.parse(await fs.readFile('tests/fixtures/spacePresentationRequest.json','utf8')),name:'presentation'},
    {name:'webpage',outputType:'webpage',textPrompt:'Create a premium multi-section educational website titled Beyond Earth about space exploration. Include orbital research, reusable rockets, lunar exploration, Mars missions and a conclusion. Use varied editorial layouts, relevant licensed or AI-generated imagery and a cinematic identity. Explain established knowledge without invented future dates. Include all assets in the ZIP.'},
    {name:'document',outputType:'document',textPrompt:'Create a professional structured 1400-word report on sustainable urban transport. Cover public transit, walking and cycling, electrification, accessible street design, implementation challenges and recommendations. Explain trade-offs and practical evaluation criteria without invented statistics, citations or project results.'}
];
console.log('[BENCHMARK]',phase);
for(const request of requests.filter(request=>!process.argv[3]||request.name===process.argv[3])){
    let report;
    try{
        const result=await generateService('prompt',request.textPrompt,request.outputType,{}, {performance:{onReport:value=>{report=value;}},ai:{logger:entry=>console.log('[AI]',JSON.stringify(entry)),onReview:async(review,round)=>fs.writeFile(path.join(root,request.name+'-review-'+round+'.json'),JSON.stringify(review,null,2))}});
        await fs.writeFile(path.join(root,request.name+'-result.json'),JSON.stringify(result,null,2));
        await fs.writeFile(path.join(root,request.name+'-metrics.json'),JSON.stringify({phase,request,report,status:result.status,outputTimings:result.timings,artifacts:result.artifacts,preview:result.preview},null,2));
        console.log('[BENCHMARK RESULT]',request.name,report.totalMs,result.status);
    }catch(error){await fs.writeFile(path.join(root,request.name+'-failure.json'),JSON.stringify({code:error.code,stage:error.stage,field:error.field,message:error.message,report},null,2));console.error('[BENCHMARK FAILED]',request.name,error.code,error.stage);}
}
