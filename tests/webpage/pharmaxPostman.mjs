import fs from 'node:fs/promises';
const request=JSON.parse(await fs.readFile(new URL('../fixtures/pharmaxDesignRequest.json',import.meta.url),'utf8'));
const url='http://127.0.0.1:5000/api/generate/textPrompt',started=Date.now();
const response=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(request),signal:AbortSignal.timeout(120000)});
const body=await response.json();await fs.mkdir('generated/pharmax-postman-retest',{recursive:true});
await fs.writeFile('generated/pharmax-postman-retest/response.json',JSON.stringify(body,null,2));
const result=body.data?.result;
console.log(JSON.stringify({httpStatus:response.status,message:body.message,elapsedMs:Date.now()-started,errorCode:body.errorCode,stage:body.stage,sections:result?.generatedContent?.sections?.map(s=>s.heading),previewUrl:result?.artifacts?.previewUrl,images:result?.generatedContent?.imageStrategy,warnings:result?.warnings?.map(w=>w.code)}));
if(!response.ok)process.exitCode=1;
