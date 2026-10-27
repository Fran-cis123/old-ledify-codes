import fs from 'node:fs/promises';
import path from 'node:path';
import {randomBytes,randomUUID,createHash,timingSafeEqual} from 'node:crypto';
import {profileGeneration} from './performance.mjs';
import {publicGenerationResult} from './publicGenerationResult.mjs';
import {storageRoot} from './storageRoot.mjs';

const hash=value=>createHash('sha256').update(value).digest('hex');
const queues=new Map();
export function generationJobs({generator,model,root=process.env.LEDIFY_JOB_ROOT||storageRoot('jobs'),maxPending=8,onError,logger=entry=>console.info('[GENERATION_JOB]',JSON.stringify(entry))}={}){
    root=path.resolve(root);
    if(queues.has(root))return queues.get(root);
    let ready,active=false,admissions=0;const pending=[],retrying=new Set();
    const filename=(id,name)=>path.join(root,id,name);
    const validId=id=>/^[a-f0-9-]{36}$/.test(id);
    const log=entry=>{try{logger(entry);}catch{}};
    async function atomic(file,value){
        const temp=file+'.'+randomUUID()+'.tmp';await fs.writeFile(temp,JSON.stringify(value));
        try{for(let attempt=0;;attempt++){
            try{await fs.rename(temp,file);return;}
            // Windows scanners/readers can hold status.json briefly. Preserve
            // atomic replacement and retry that lock, never delete the last
            // durable status or rerun the completed AI work because of it.
            catch(error){if(attempt>=10||!['EPERM','EACCES','EBUSY'].includes(error.code))throw error;await new Promise(resolve=>setTimeout(resolve,Math.min(250,10*2**attempt)));}
        }}finally{await fs.unlink(temp).catch(()=>{});}
    }
    async function load(id){if(!validId(id))throw Object.assign(new Error('Job not found'),{status:404});return JSON.parse(await fs.readFile(filename(id,'status.json'),'utf8'));}
    async function init(){
        if(!ready)ready=(async()=>{
            await fs.mkdir(root,{recursive:true});
            for(const id of await fs.readdir(root))if(validId(id)){
                try{const job=await load(id);if(['queued','processing'].includes(job.status)){
                    if((job.runs||0)>=3){job.status='failed';job.error={errorCode:'JOB_INTERRUPTED',message:'Generation was interrupted repeatedly; resubmit the request.'};await atomic(filename(id,'status.json'),job);}
                    else {
                        // A resumed attempt must not label the previous run's
                        // processing time as queue wait after a deployment.
                        if(job.status==='processing'){
                            job.status='queued';job.queuedAt=new Date().toISOString();
                            delete job.timings;delete job.startedAt;delete job.completedAt;
                            await atomic(filename(id,'status.json'),job);
                        }
                        pending.push(id);
                    }
                }}catch{}
            }
            setImmediate(pump);
        })();
        return ready;
    }
    async function pump(){
        if(active)return;active=true;
        try{while(pending.length){
            const id=pending.shift();let job,payload,writes=Promise.resolve(),progressPending=false,executionStarted;
            try{
                job=await load(id);job.status='processing';job.runs=(job.runs||0)+1;
                executionStarted=performance.now();job.startedAt=new Date().toISOString();
                const queuedAt=Date.parse(job.queuedAt||job.createdAt);
                job.timings={queueWaitMs:Number.isFinite(queuedAt)?Math.max(0,Date.now()-queuedAt):0};
                log({requestId:id,status:'processing',attempt:job.runs,queueWaitMs:job.timings.queueWaitMs});
                await atomic(filename(id,'status.json'),job);
                payload=JSON.parse(await fs.readFile(filename(id,'input.json'),'utf8'),(key,value)=>value?.type==='Buffer'&&Array.isArray(value.data)&&value.data.length<=12*1024*1024?Buffer.from(value.data):value);
                let completedContent;try{completedContent=JSON.parse(await fs.readFile(filename(id,'content.json'),'utf8'));}catch{}
                let plan,partial;try{plan=JSON.parse(await fs.readFile(filename(id,'plan.json'),'utf8'));}catch{}
                try{partial=JSON.parse(await fs.readFile(filename(id,'partial.json'),'utf8'));}catch{}
                const update=change=>{Object.assign(job,change,{updatedAt:new Date().toISOString()});writes=writes.then(()=>atomic(filename(id,'status.json'),job));return writes;};
                const result=await profileGeneration(()=>generator(payload.kind,payload.input,payload.outputType,payload.context,{
                    ...payload.options,completedContent,
                    ai:{...payload.options?.ai,
                        ...(payload.outputType==='presentation'?{initialPresentation:partial}:{initialPlan:plan,...(payload.outputType==='document'?{initialSections:partial?.sections}:{})}),
                        onPlan:plan=>atomic(filename(id,'plan.json'),plan),
                        onSlideCheckpoint:partial=>atomic(filename(id,'partial.json'),partial),
                        onCheckpoint:partial=>atomic(filename(id,'partial.json'),partial)},
                    onContentReady:content=>atomic(filename(id,'content.json'),content),
                    preview:{onArtifact:artifact=>update({artifacts:{...job.artifacts,[artifact.stage]:artifact}})}
                }),{forceNew:true,requestId:id,onProgress:event=>{
                    const key=[event.stage,event.slideNumber||event.sectionId||''].join(':');
                    job.progress[key]={...event,updatedAt:new Date().toISOString()};
                    if(!progressPending){progressPending=true;update({progress:job.progress}).finally(()=>{progressPending=false;}).catch(()=>{});}
                }});
                await writes;
                job.completedAt=new Date().toISOString();
                job.timings.executionMs=Math.round(performance.now()-executionStarted);
                job.timings.totalMs=job.timings.queueWaitMs+job.timings.executionMs;
                const safe=publicGenerationResult(result);
                const incomplete=safe.status==='incomplete';
                const pdfFailed=safe.exportValidation?.status==='incomplete';
                await update({status:incomplete?'failed':'completed',result:safe,...(incomplete?{error:pdfFailed?{errorCode:'DOCUMENT_PDF_UNAVAILABLE',stage:'document-export',message:'PDF export is unavailable; Word and preview remain available.'}:{errorCode:'IMAGE_REQUIREMENTS_UNMET',stage:'image-validation',message:'Required images are missing. Available artifacts are incomplete; retry or provide authorized assets.'}}:{})});
                log({requestId:id,status:job.status,resultStatus:safe.status,outputType:payload.outputType,...job.timings});
                try{await model?.findByIdAndUpdate?.(payload.recordId,{$set:{status:incomplete?'failed':'completed',generatedContent:safe.generatedContent,artifacts:safe.artifacts||safe.preview}});}
                catch{await update({warnings:[{code:'JOB_RECORD_UPDATE_FAILED',message:'Output is available; its MongoDB request record could not be updated.'}]});}
            }catch(error){
                await writes.catch(()=>{});
                try{onError?.(error);}catch{}
                if(job){job.status='failed';job.completedAt=new Date().toISOString();job.timings={...job.timings,executionMs:executionStarted===undefined?0:Math.round(performance.now()-executionStarted)};job.timings.totalMs=(job.timings.queueWaitMs||0)+job.timings.executionMs;job.error={errorCode:error.code||'GENERATION_FAILED',stage:error.stage,field:error.field,message:'Generation could not complete. See errorCode and stage.'};await atomic(filename(id,'status.json'),job).catch(()=>{});log({requestId:id,status:'failed',errorCode:job.error.errorCode,...job.timings});}
                if(payload)await model?.findByIdAndUpdate?.(payload.recordId,{$set:{status:'failed'}}).catch(()=>{});
            }
        }}finally{active=false;}
    }
    const api={
        async enqueue(payload){
            await init();if(pending.length+admissions>=maxPending)throw Object.assign(new Error('Generation queue is full. Retry shortly.'),{code:'GENERATION_QUEUE_FULL'});
            admissions++;
            try{
            const id=randomUUID(),token=randomBytes(32).toString('hex');await fs.mkdir(path.join(root,id));
            const queuedAt=new Date().toISOString();
            const job={jobId:id,tokenHash:hash(token),status:'queued',createdAt:queuedAt,queuedAt,progress:{},artifacts:{},runs:0};
            // Publish status last: a job is never accepted without its durable input.
            await atomic(filename(id,'input.json'),payload);await atomic(filename(id,'status.json'),job);
            pending.push(id);setImmediate(pump);
            log({requestId:id,status:'queued',outputType:payload.outputType,queueDepth:pending.length,workerBusy:active});
            return {jobId:id,status:'queued',statusUrl:`/api/generation-jobs/${id}/${token}`};
            }finally{admissions--;}
        },
        async read(id,token){
            await init();let job;try{job=await load(id);}catch{throw Object.assign(new Error('Job not found'),{status:404});}
            if(typeof token!=='string'||token.length!==64||!timingSafeEqual(Buffer.from(hash(token)),Buffer.from(job.tokenHash)))throw Object.assign(new Error('Job not found'),{status:404});
            const {tokenHash,runs,...safe}=job;return safe;
        },
        async retry(id,token){
            if(retrying.has(id))throw Object.assign(new Error('A retry is already being scheduled'),{status:409});
            retrying.add(id);try{
            const safe=await api.read(id,token);
            if(safe.status!=='failed')throw Object.assign(new Error('Only failed jobs can be retried'),{status:409});
            if(pending.length>=maxPending)throw Object.assign(new Error('Generation queue is full'),{status:503});
            const job=await load(id);job.status='queued';job.runs=0;job.queuedAt=new Date().toISOString();delete job.error;delete job.timings;delete job.startedAt;delete job.completedAt;await atomic(filename(id,'status.json'),job);
            pending.push(id);setImmediate(pump);return {jobId:id,status:'queued'};
            }finally{retrying.delete(id);}
        },
        initialize:init
    };
    queues.set(root,api);return api;
}
