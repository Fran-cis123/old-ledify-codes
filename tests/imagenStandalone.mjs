// Standalone capability check. Never prints keys, raw SDK errors, or image bytes.
import fs from 'node:fs/promises';
import path from 'node:path';
import dotenv from 'dotenv';
import sharp from 'sharp';
import {GoogleGenAI} from '@google/genai';

dotenv.config({quiet:true});
const root=path.resolve('generated/imagen-verification');await fs.mkdir(root,{recursive:true});
const report={checkedAt:new Date().toISOString(),transport:'Google GenAI SDK / Gemini Developer API',sdkMethod:'models.generateImages',
    configuredModel:process.env.IMAGEN_MODEL||null,models:[],modelListingSucceeded:false,listedModelCount:0,status:'pending',generationAttempted:false,verifiedModel:null};
const save=async()=>{await fs.writeFile(path.join(root,'standalone-report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));};
try{
    if(!process.env.GEMINI_API_KEY)throw Object.assign(new Error('Missing configured Google key'),{code:'MISSING_GOOGLE_KEY'});
    const client=new GoogleGenAI({apiKey:process.env.GEMINI_API_KEY,httpOptions:{timeout:30000,retryOptions:{attempts:1}}});
    const listed=await client.models.list({config:{pageSize:100}});
    for await(const model of listed){report.listedModelCount++;if(/(?:^|\/)imagen(?:-|$)/i.test(model.name||''))report.models.push({name:model.name,supportedActions:model.supportedActions||[]});}
    report.modelListingSucceeded=true;
    const option=process.argv.indexOf('--candidate');
    const documentedCandidate=option>=0?process.argv[option+1]:null;
    if(documentedCandidate&&!/^imagen-[a-z0-9.-]+$/.test(documentedCandidate))throw Object.assign(new Error('Invalid candidate model identifier'),{code:'INVALID_MODEL_CANDIDATE'});
    const configured=process.env.IMAGEN_MODEL?.replace(/^models\//,'');
    const candidate=documentedCandidate?{name:documentedCandidate}:configured?report.models.find(m=>m.name.replace(/^models\//,'')===configured):report.models.find(m=>!m.name.includes('ultra'))||report.models[0];
    if(!candidate){
        report.status='blocked';report.errorCode='IMAGEN_NOT_AVAILABLE';
        report.message=report.models.length?'The configured Imagen model is not listed for this API key. No unverified model was invoked.':'No Imagen model is listed by the current Google AI Studio API key. No image-generation call was made.';
        await save();process.exitCode=2;
    }else{
        const model=candidate.name.replace(/^models\//,'');report.generationAttempted=true;report.testedModel=model;
        const response=await client.models.generateImages({model,prompt:'Create exactly one conceptual illustration of an unbranded scientific research laboratory. Restrained navy and teal palette, natural lighting, editorial wide composition, no text, logos, people, diagnostic findings or claims of an actual facility.',config:{numberOfImages:1,aspectRatio:'16:9',outputMimeType:'image/png',httpOptions:{timeout:60000,retryOptions:{attempts:1}}}});
        const bytes=response.generatedImages?.[0]?.image?.imageBytes;
        if(typeof bytes!=='string'||!bytes||bytes.length>24*1024*1024)throw Object.assign(new Error('No valid image payload'),{code:'IMAGEN_NO_VALID_IMAGE'});
        const buffer=Buffer.from(bytes,'base64'),metadata=await sharp(buffer,{limitInputPixels:32000000}).metadata();
        if(!['png','jpeg','webp'].includes(metadata.format)||metadata.width<800||metadata.height<600)throw Object.assign(new Error('Invalid generated image'),{code:'IMAGEN_INVALID_IMAGE'});
        await sharp(buffer,{limitInputPixels:32000000}).stats();
        const filePath=path.join(root,`standalone.${metadata.format==='jpeg'?'jpg':metadata.format}`);await fs.writeFile(filePath,buffer);
        Object.assign(report,{status:'passed',verifiedModel:model,width:metadata.width,height:metadata.height,format:metadata.format,bytes:buffer.length,filePath});await save();
    }
}catch(error){
    report.status='failed';report.providerStatus=Number(error.status)||null;
    report.errorCode=report.providerStatus===404?'IMAGEN_MODEL_UNAVAILABLE':['MISSING_GOOGLE_KEY','IMAGEN_NO_VALID_IMAGE','IMAGEN_INVALID_IMAGE','INVALID_MODEL_CANDIDATE'].includes(error.code)?error.code:'IMAGEN_VERIFICATION_FAILED';
    report.message='Standalone Imagen verification failed. Credentials and raw provider errors are omitted.';
    if(/only supported by the Gemini Enterprise Agent Platform/.test(String(error.message))){
        report.status='blocked';report.errorCode='IMAGEN_REQUIRES_VERTEX';report.providerRequestSent=false;
        report.message='The installed SDK supports generateImages only in cloud platform (Vertex AI) mode. The current AI Studio API-key client cannot invoke this endpoint.';
    }
    await save();process.exitCode=1;
}
