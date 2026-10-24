import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {PDFParse} from 'pdf-parse';
const base='https://pan2-backend-ivuf.onrender.com',expected=process.argv[2],root=path.resolve('generated/week6-uat/deployed');await fs.mkdir(root,{recursive:true});const report={base,expectedCommit:expected,checks:[]};
const headers={'Content-Type':'application/json',Origin:'https://ledify-frontend.vercel.app'};
const post=(body,extra={})=>({method:'POST',headers:{...headers,...extra},body:JSON.stringify(body),signal:AbortSignal.timeout(90000)});
try{
 let active;const deadline=Date.now()+180000;
 while(Date.now()<deadline){try{const response=await fetch(base+'/',{signal:AbortSignal.timeout(60000)});if(response.ok){active=await response.json();if(!expected||active.buildCommit?.startsWith(expected))break;}}catch{}await new Promise(resolve=>setTimeout(resolve,5000));}
 assert.ok(active?.buildCommit?.startsWith(expected),'Expected deployment commit is not live');report.buildCommit=active.buildCommit;report.checks.push('expected deployment live');
 const invalid=await fetch(base+'/api/generate/textPrompt',post({textPrompt:'short',outputType:'document'}));assert.equal(invalid.status,400);assert.equal((await invalid.json()).errorCode,'INVALID_TEXT_PROMPT');assert.equal(invalid.headers.get('access-control-allow-origin'),'*');report.checks.push('prompt validation and CORS');
 const unreachable=await fetch(base+'/api/generate/urlPrompt',post({urlPrompt:'https://ledify-uat-unreachable.invalid',outputType:'document'}));assert.equal(unreachable.status,502);assert.equal((await unreachable.json()).errorCode,'SOURCE_URL_UNREACHABLE');report.checks.push('unreachable URL feedback');
 const started=performance.now(),response=await fetch(base+'/api/generate/textPrompt',post({textPrompt:'Create a concise report on government responsibilities and public accountability. Do not invent statistics or citations.',outputType:'document',exportFormat:'pdf',context:{wordCount:100}},{Prefer:'respond-async'})),accepted=await response.json();report.admissionMs=Math.round(performance.now()-started);assert.equal(response.status,202,JSON.stringify({errorCode:accepted.errorCode,stage:accepted.stage}));let job;
 while(performance.now()-started<240000){const response=await fetch(new URL(accepted.data.statusUrl,base),{signal:AbortSignal.timeout(30000)});assert.equal(response.status,200);job=(await response.json()).data;if(['completed','failed'].includes(job.status))break;await new Promise(resolve=>setTimeout(resolve,1500));}
 report.totalMs=Math.round(performance.now()-started);report.jobStatus=job?.status;report.error=job?.error;assert.equal(job?.status,'completed',JSON.stringify(job?.error));const result=job.result;assert.equal(result.artifacts.pdf.status,'completed');report.timings=result.timings;
 for(const [format,url] of Object.entries(result.artifacts.downloads)){const response=await fetch(new URL(url,base),{signal:AbortSignal.timeout(60000)});assert.equal(response.status,200);const bytes=Buffer.from(await response.arrayBuffer());await fs.writeFile(path.join(root,'government.'+format),bytes);if(format==='pdf'){assert.match(response.headers.get('content-type'),/application\/pdf/);const parser=new PDFParse({data:bytes});try{const parsed=await parser.getText();assert.match(parsed.text,/government/i);report.pdfPages=parsed.total;}finally{await parser.destroy();}}report.checks.push(format+' actual download');}
 const preview=await fetch(new URL(result.previewUrl,base));assert.equal(preview.status,200);assert.match(await preview.text(),/Government|government/);report.previewCsp=preview.headers.get('content-security-policy');report.checks.push('document HTML preview');report.status='passed';
}catch(error){report.status='failed';report.failure=String(error.message).slice(0,600);process.exitCode=1;}
await fs.writeFile(path.join(root,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));
