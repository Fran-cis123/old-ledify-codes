import fs from 'node:fs/promises';
import path from 'node:path';
import {once} from 'node:events';
import {randomUUID,createHash} from 'node:crypto';
import {monitorEventLoopDelay} from 'node:perf_hooks';
import assert from 'node:assert/strict';
import JSZip from 'jszip';
import {PDFParse} from 'pdf-parse';
import {load} from 'cheerio';
import {createApp} from '../src/app.mjs';
import {generateService} from '../Service/generateService.mjs';
import {generationJobs} from '../Service/generationJobs.mjs';
import {generationCapacity} from '../Service/generationCapacity.mjs';
import {generateJsonWithRetry} from '../Service/ai/generateJsonWithRetry.mjs';
import {fixtures,fixturePlan,fixtureDraft} from './webpage/fixtures.mjs';
import {docxSource,DOCX_MIME} from './fixtures/uploadFiles.mjs';
import {documentParagraph} from './fixtures/documentFixtures.mjs';

const root=path.resolve('generated/concurrency-audit',process.argv[2]||randomUUID());await fs.mkdir(root,{recursive:true});
process.env.LEDIFY_PRESENTATION_ROOT=path.join(root,'presentations');
const counts=process.argv.slice(3).map(Number);if(!counts.length)counts.push(1,2,5,10,20);
const catalog=JSON.parse(await fs.readFile('assets/webpage/curated/catalog.json','utf8'));
const subjects=[
 {name:'Automotive collection',file:'auto-sedan.jpg',fixture:'store'},
 {name:'Clothing boutique',file:'fashion-boutique.jpg',fixture:'fashion'},
 {name:'Residential real estate',file:'property-villa.jpg',fixture:'realestate'},
 {name:'Laboratory diagnostics',file:'laboratory.jpg'},
 {name:'Marine conservation',file:'marine-hawksbill.jpg'},
 {name:'Computing systems',file:'computing-cern.jpg'}
];
for(const subject of subjects){subject.photo=catalog.find(entry=>entry.file===subject.file);assert.ok(subject.photo);subject.buffer=await fs.readFile(path.join('assets/webpage/curated',subject.file));}
const ledger=new Map(),specs=new Map(),perfs=[],attempts=new Map(),aiEvents=[],history=[],reports=[];
const model={create:async value=>{const record={...value,_id:randomUUID(),save:async()=>ledger.set(record._id,{...record})};ledger.set(record._id,{...record});return record;},findByIdAndUpdate:async(id,change)=>ledger.set(id,{...ledger.get(id),...change.$set})};
const failure=()=>Object.assign(new Error('Controlled permanent provider failure'),{status:403});
const fixtureContent=spec=>{
 const {marker,subject,output}=spec;
 if(output==='webpage'){
  const f=fixtures[subject.fixture],page={...fixturePlan(f),...fixtureDraft(f),outputType:'webpage'};
  page.title=subject.name+' '+marker;page.brandName=page.title;page.inferredContext.topic=subject.name;
  page.hero={...page.hero,headline:subject.name,subheadline:subject.name+'. '+marker};
  page.description=page.hero.subheadline;page.contact={email:'',phone:'',address:''};
  page.sections=[{type:'about',heading:'A considered introduction',content:subject.name+'. '+marker+'. An illustrative educational overview without inventory, price or availability claims.',items:[]},{type:'features',heading:'Explore the subject',content:'Read the context and review the supplied visual example.',items:[{title:'Context',description:'Understand '+subject.name.toLowerCase()+'.',detail:'',url:''},{title:'Observation',description:'Review the visual example in its stated context.',detail:'',url:''},{title:'Reflection',description:'Compare the subject with the accompanying explanation.',detail:'',url:''}]}];
  page.navigation=['Introduction','Explore'];page.callToAction={heading:'Continue exploring',text:'Review the illustrative material and its context.',actionLabel:'Explore'};
  page.imagePlan=[{role:'hero',required:true,subject:subject.photo.subject,alt:subject.photo.alt,aspectRatio:'16:9'}];
  return {outputType:output,generatedContent:page};
 }
 if(output==='document')return {outputType:output,generatedContent:{title:subject.name,subtitle:marker,documentType:'report',coverPage:false,sections:[{id:'overview',heading:'Overview',blocks:[{type:'paragraph',text:marker+'. '+documentParagraph}]}],references:[],assets:[],warnings:[]}};
 return {outputType:output,generatedContent:{outputType:output,strategyId:'academic-seminar',title:subject.name,subtitle:marker,inferredContext:{topic:subject.name},slides:[{slideNumber:1,slideType:'title',title:subject.name,objective:'Explain '+subject.name,visualRequirement:{role:'background',kind:'photo',required:true,description:subject.photo.alt,searchQuery:subject.photo.subject},content:{titleContent:{title:subject.name,subtitle:marker,supportingText:'A controlled request isolation audit'}}}]}};
};
let active=0,peakActive=0;
const generator=async(kind,input,output,context,options)=>{
 const spec=specs.get(context.marker);assert.ok(spec);assert.ok(input.includes(spec.marker));assert.equal(output,spec.output);
 peakActive=Math.max(peakActive,++active);
 try{
  const run=(attempts.get(spec.marker)||0)+1;attempts.set(spec.marker,run);
  let calls=0;
  await generateJsonWithRetry({stage:'audit-fixture-ai',outputType:output,request:{model:'audit-fixture',contents:input},schema:{type:'object',properties:{marker:{type:'string'}},required:['marker']},logger:event=>aiEvents.push(event),client:{models:{generateContent:async()=>{await new Promise(resolve=>setTimeout(resolve,20));if(spec.fail&&run===1)throw failure();if(++calls===1&&spec.index%7===0)throw Object.assign(new Error('Controlled throttle'),{status:429,headers:new Headers({'Retry-After':'0'})});return {text:JSON.stringify({marker:spec.marker}),candidates:[{finishReason:'STOP'}]};}}},validate:value=>assert.equal(value.marker,spec.marker)});
  const provider={id:'commons',acquire:async()=>({...spec.subject.photo,buffer:Buffer.from(spec.subject.buffer)})};
  const result=await generateService(kind,input,output,context,{...options,completedContent:fixtureContent(spec),prefetchImages:false,
   artifacts:{root:path.join(root,'webpages')},document:{root:path.join(root,'documents')},
   webpageAssets:{providers:[provider],curated:false,optimization:{cacheRoot:path.join(root,'web-cache')}},
   visuals:{cacheRoot:path.join(root,'slide-cache'),diagramPlanner:false,policy:{retries:0,maxImages:1,maxGenerated:0,deadlineMs:120000},providers:{identity:'audit-'+spec.subject.file,search:async()=>({...spec.subject.photo,description:spec.subject.photo.subject+' '+spec.subject.photo.alt,buffer:Buffer.from(spec.subject.buffer),generationMethod:'licensed-search'})}},
   preview:{...options.preview,outputDirectory:process.env.LEDIFY_PRESENTATION_ROOT}
  });
  return result;
 }finally{active--;}
};
const jobRoot=path.join(root,'jobs'),app=createApp({model,generator,jobRoot,jobOptions:{onPerformanceReport:report=>perfs.push(report)},webpageRoot:path.join(root,'webpages'),documentRoot:path.join(root,'documents'),extractUrl:async url=>new URL(url).searchParams.get('source')});
const server=app.listen(0,'127.0.0.1');await once(server,'listening');const origin=`http://127.0.0.1:${server.address().port}`;
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const percentile=(items,p)=>items.length?[...items].sort((a,b)=>a-b)[Math.max(0,Math.ceil(items.length*p)-1)]:0;
async function bytes(url,remember=false){const response=await fetch(new URL(url,origin));assert.equal(response.status,200);const data=Buffer.from(await response.arrayBuffer());if(remember)history.push({url,digest:hash(data)});return data;}
async function poll(receipt){const deadline=Date.now()+1200000;while(Date.now()<deadline){const response=await fetch(origin+receipt.statusUrl);assert.equal(response.status,200);const job=(await response.json()).data;if(['completed','failed'].includes(job.status))return job;await new Promise(resolve=>setTimeout(resolve,200));}throw new Error('Load audit deadline exceeded');}
async function verify(spec,job){
 const result=job.result;assert.equal(job.status,'completed');assert.ok(['completed','completed_with_warnings'].includes(result.status),JSON.stringify(result.imageValidation));
 if(spec.output==='webpage'){
  const html=(await bytes(result.artifacts.siteUrl,true)).toString(),$=load(html);assert.ok($('main').text().includes(spec.marker));
  const zip=await JSZip.loadAsync(await bytes(result.artifacts.downloadUrl,true),{checkCRC32:true});
  const photo=result.generatedContent.visualAssets.hero;assert.equal(photo.binding.requestId,job.jobId);
  assert.equal(photo.assetId,createHash('sha256').update('webp-v1').update(spec.subject.buffer).digest('hex').slice(0,24));
  for(const image of $('img').toArray()){const src=$(image).attr('src');assert.deepEqual(await bytes(new URL(src,new URL(result.artifacts.siteUrl,origin)).href,true),await zip.file('my-website/'+src.replace(/^\.\//,'')).async('nodebuffer'));}
  await bytes(result.artifacts.previewUrl);
 }else if(spec.output==='presentation'){
  const zip=await JSZip.loadAsync(await bytes(result.preview.downloads.pptx,true),{checkCRC32:true});
  const text=await zip.file('ppt/slides/slide1.xml').async('string');assert.ok(text.includes(spec.marker));assert.equal(result.preview.slides.length,1);
  const asset=result.generatedContent.slides[0].photoAsset;assert.equal(asset.sourceChecksum,hash(spec.subject.buffer));assert.equal(asset.binding.requestId,job.jobId);
  const embedded=await Promise.all(Object.entries(zip.files).filter(([name,file])=>name.startsWith('ppt/media/')&&!file.dir).map(([,file])=>file.async('nodebuffer')));assert.ok(embedded.some(buffer=>hash(buffer)===asset.id));
  const pdf=await bytes(result.preview.downloads.pdf,true),parser=new PDFParse({data:pdf});try{assert.ok((await parser.getText()).text.includes(spec.marker));}finally{await parser.destroy();}
  for(const slide of result.preview.slides)assert.equal((await bytes(slide.url,true)).subarray(0,4).toString('hex'),'89504e47');
 }else{
  const zip=await JSZip.loadAsync(await bytes(result.artifacts.downloads.docx,true),{checkCRC32:true});assert.ok((await zip.file('word/document.xml').async('string')).includes(spec.marker));assert.ok((await bytes(result.previewUrl)).toString().includes(spec.marker));
  if(spec.pdf){const parser=new PDFParse({data:await bytes(result.artifacts.downloads.pdf,true)});try{assert.ok((await parser.getText()).text.includes(spec.marker));}finally{await parser.destroy();}}
 }
 assert.ok([...ledger.values()].some(record=>record.status==='completed'&&JSON.stringify(record.generatedContent).includes(spec.marker)));
}
try{
 for(const count of counts){
  const perfOffset=perfs.length,eventOffset=aiEvents.length;
  const started=performance.now(),cpu=process.cpuUsage(),rssStart=process.memoryUsage().rss,loop=monitorEventLoopDelay({resolution:20});loop.enable();let rssPeak=rssStart;peakActive=0;const health=[];
  const sampler=setInterval(()=>{rssPeak=Math.max(rssPeak,process.memoryUsage().rss);const started=performance.now();fetch(origin+'/healthz').then(response=>{assert.equal(response.status,200);health.push(performance.now()-started);}).catch(()=>health.push(Infinity));},100);sampler.unref();
  const wave=Array.from({length:count},(_,index)=>{const output=process.env.AUDIT_SINGLE_OUTPUT||['webpage','presentation','document'][index%3];assert.ok(['webpage','presentation','document'].includes(output));const subject=subjects[(output==='webpage'?0:3)+Math.floor(index/3)%3],marker='TRACE'+randomUUID().replace(/[^a-z]/g,'').slice(0,12).toUpperCase();const spec={index,output,subject,marker,kind:['textPrompt','urlPrompt','file'][Math.floor(index/3)%3],fail:count>=5&&index===count-1,pdf:index===2||process.env.AUDIT_SINGLE_OUTPUT==='document'};specs.set(marker,spec);return spec;});
  const receipts=await Promise.all(wave.map(async spec=>{
   const source=`Create ${spec.output==='presentation'?'exactly one slide':'a '+spec.output} about ${spec.subject.name}. Preserve ${spec.marker}. Use relevant imagery and concise accurate content.`,context={marker:spec.marker,...(spec.output==='presentation'?{slideCount:1,instructions:'Use authentic photography.'}:{}),...(spec.output==='document'?{exportFormat:spec.pdf?'pdf':'docx'}:{})};
   let body,headers={Prefer:'respond-async'};
   if(spec.kind==='file'){const form=new FormData();form.set('file',new Blob([await docxSource(source)],{type:DOCX_MIME}),spec.marker+'.docx');form.set('outputType',spec.output);form.set('context',JSON.stringify(context));body=form;}
   else{headers['Content-Type']='application/json';body=JSON.stringify({outputType:spec.output,context,...(spec.kind==='urlPrompt'?{urlPrompt:'https://source.example/article?source='+encodeURIComponent(source)}:{textPrompt:source})});}
   const at=performance.now(),response=await fetch(origin+'/api/generate/'+spec.kind,{method:'POST',headers,body});assert.equal(response.status,202);return {...(await response.json()).data,admissionMs:performance.now()-at};
  }));
  const jobs=await Promise.all(receipts.map(poll)),initialSuccess=jobs.filter(job=>job.status==='completed').length;
  assert.equal(initialSuccess,count-(count>=5?1:0));
  for(const [index,job] of jobs.entries()){
   if(job.status==='failed'){assert.equal(job.error.errorCode,'AI_PROVIDER_ERROR');const response=await fetch(origin+receipts[index].statusUrl+'/retry',{method:'POST'});assert.equal(response.status,202);jobs[index]=await poll(receipts[index]);}
   await verify(wave[index],jobs[index]);
  }
  for(const saved of history)assert.equal(hash(await bytes(saved.url)),saved.digest,'Previously generated artifact changed after later requests');
  if(count>1){const wrong=receipts[0].statusUrl.split('/');wrong[wrong.length-1]=receipts[1].statusUrl.split('/').at(-1);assert.equal((await fetch(origin+wrong.join('/'))).status,404);}
  clearInterval(sampler);loop.disable();const used=process.cpuUsage(cpu),metrics=perfs.slice(perfOffset);
  const report={users:count,scope:'Mock text/image providers and URL extraction; real DOCX upload extraction, file rendering, LibreOffice/PDF/PNG exports and HTTP downloads. Local host, metadata DB stub.',initialSuccess,controlledFailures:count-initialSuccess,unexpectedFailures:0,recovered:count-initialSuccess,finalSuccess:jobs.length,peakActiveGenerations:peakActive,configuredGenerationConcurrency:generationCapacity.stats().concurrency,queueWaitP95Ms:percentile(jobs.map(job=>job.timings.queueWaitMs),.95),admissionP95Ms:Math.round(percentile(receipts.map(receipt=>receipt.admissionMs),.95)),aiMs:metrics.reduce((sum,metric)=>sum+metric.ai.elapsedMs,0),renderMs:metrics.reduce((sum,metric)=>sum+Object.entries(metric.stages).filter(([stage])=>['pptx-render','pdf-conversion','png-conversion','docx-render','document-preview','document-pdf','website-html-css-js','website-packaging'].includes(stage)).reduce((n,[,value])=>n+value.elapsedMs,0),0),totalMs:Math.round(performance.now()-started),healthP95Ms:Math.round(percentile(health,.95)),healthSamples:health.length,nodeRssStart:rssStart,nodeRssPeak:rssPeak,nodeCpuMs:Math.round((used.user+used.system)/1000),eventLoopP95Ms:loop.percentile(95)/1e6,rateLimitResponses:aiEvents.slice(eventOffset).filter(event=>event.status==='failed'&&event.providerReason==='QUOTA_OR_BILLING').length,artifactChecks:'passed',oldArtifactsUnchanged:true};
  reports.push(report);await fs.writeFile(path.join(root,'report.json'),JSON.stringify({reports},null,2));console.log('[CONCURRENCY_AUDIT]',JSON.stringify(report));
 }
}finally{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
