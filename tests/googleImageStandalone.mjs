// Discover and test image-capable Gemini models without changing the application.
import dotenv from 'dotenv';
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import {GoogleGenAI} from '@google/genai';

dotenv.config({quiet:true});
const root=path.resolve('generated/google-image-verification');await fs.mkdir(root,{recursive:true});
const report={checkedAt:new Date().toISOString(),modelListingSucceeded:false,models:[],imageCandidates:[],tests:[],verifiedModel:null,status:'pending'};
const save=async()=>{await fs.writeFile(path.join(root,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({...report,models:undefined},null,2));};
const reason=error=>{
    const status=Number(error.status)||null,text=String(error.message||'');
    return {status,reason:status===429||status===402?'QUOTA_OR_BILLING':status===403?'PERMISSION_DENIED':status===401||/API key not valid/i.test(text)?'INVALID_API_KEY':status===404?'MODEL_NOT_FOUND':status===400?'REQUEST_REJECTED':/EACCES|EPERM/.test(String(error.cause?.code||''))?'NETWORK_PERMISSION':'PROVIDER_CONNECTION_OR_SERVICE_ERROR',
        quotaZero:/limit\s*[:=]\s*0\b|limit.*?zero/i.test(text),billingRequired:/billing|paid tier/i.test(text)};
};
try{
    if(!process.env.GEMINI_API_KEY)throw new Error('Missing configured Google key');
    const client=new GoogleGenAI({apiKey:process.env.GEMINI_API_KEY,httpOptions:{timeout:30000,retryOptions:{attempts:1}}});
    const listed=await client.models.list({config:{pageSize:100}});
    for await(const model of listed)report.models.push({name:model.name,supportedActions:model.supportedActions||[]});
    report.modelListingSucceeded=true;
    report.imageCandidates=report.models.filter(m=>/^models\/gemini-.*image/i.test(m.name)&&! /embedding/i.test(m.name));
    const preferred=['gemini-3.1-flash-image','gemini-2.5-flash-image'];
    const selected=preferred.flatMap(id=>report.imageCandidates.filter(m=>m.name==='models/'+id));
    if(!selected.length)selected.push(...report.imageCandidates.filter(m=>! /preview|exp/i.test(m.name)).slice(0,1));
    for(const candidate of selected){
        const model=candidate.name.replace(/^models\//,''),start=Date.now();
        try{
            const response=await client.models.generateContent({model,contents:'Generate exactly one conceptual editorial image of an unbranded scientific research laboratory, navy and teal palette, soft natural light, balanced wide composition, no people, text, logos, diagnostic findings or claims about an actual facility.',
                config:{responseModalities:['TEXT','IMAGE'],imageConfig:{aspectRatio:'16:9'},httpOptions:{timeout:90000,retryOptions:{attempts:1}}}});
            const inline=response.candidates?.[0]?.content?.parts?.find(p=>/^image\/(png|jpeg|webp)$/.test(p.inlineData?.mimeType||''))?.inlineData;
            if(!inline?.data||inline.data.length>24*1024*1024){report.tests.push({model,responseStatus:'success_without_valid_image',httpStatus:200,validImage:false,finishReason:response.candidates?.[0]?.finishReason,elapsedMs:Date.now()-start});continue;}
            const buffer=Buffer.from(inline.data,'base64'),meta=await sharp(buffer,{limitInputPixels:32000000,failOn:'error'}).metadata();
            if(!['png','jpeg','webp'].includes(meta.format)||meta.width<800||meta.height<600)throw new Error('Returned image failed dimension/format validation');
            await sharp(buffer,{limitInputPixels:32000000,failOn:'error'}).stats();
            const filePath=path.join(root,model+'.'+(meta.format==='jpeg'?'jpg':meta.format));await fs.writeFile(filePath,buffer);
            report.tests.push({model,responseStatus:'success',httpStatus:200,validImage:true,width:meta.width,height:meta.height,format:meta.format,bytes:buffer.length,filePath,elapsedMs:Date.now()-start});
            if(!report.verifiedModel)report.verifiedModel=model;
        }catch(error){report.tests.push({model,responseStatus:'failed',...reason(error),validImage:false,elapsedMs:Date.now()-start});}
        await save();
    }
    report.status=report.verifiedModel?'passed':'blocked';
    if(!report.tests.length)report.accessLimitation='No supported Gemini image-generation model was listed for this key.';
    await save();if(!report.verifiedModel)process.exitCode=2;
}catch(error){report.status='failed';report.discoveryFailure=reason(error);await save();process.exitCode=1;}
