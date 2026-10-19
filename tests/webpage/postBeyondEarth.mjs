// Actual local HTTP endpoint smoke test using the user's complete request.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import JSZip from 'jszip';
const root='generated/webpage-live-beyond-earth';await fs.mkdir(root,{recursive:true});
const request=JSON.parse(await fs.readFile('tests/fixtures/beyondEarthRequest.json','utf8'));
const started=Date.now(),base='http://localhost:5000';
const response=process.argv.includes('--verify-saved')?null:await fetch(base+'/api/generate/textPrompt',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(request),signal:AbortSignal.timeout(240000)});
const body=response?await response.json():JSON.parse(await fs.readFile(root+'/http-response.json','utf8'));
if(response){await fs.writeFile(root+'/http-response.json',JSON.stringify(body,null,2));assert.ok(response.ok,JSON.stringify({httpStatus:response.status,errorCode:body.errorCode,stage:body.stage,field:body.field}));}
const result=body.data.result,artifacts=result.artifacts;
assert.equal(artifacts.stages.site,'completed');assert.equal(artifacts.stages.zip,'completed');
const preview=await fetch(new URL(artifacts.previewUrl,base));assert.equal(preview.status,200);
const download=await fetch(new URL(artifacts.downloadUrl,base));assert.equal(download.status,200);
const zipBytes=Buffer.from(await download.arrayBuffer());await fs.writeFile(root+'/beyond-earth.zip',zipBytes);
const zip=await JSZip.loadAsync(zipBytes),images=Object.values(zip.files).filter(file=>/\.(webp|png|jpe?g)$/.test(file.name));assert.ok(images.length>0);
console.log(JSON.stringify({httpStatus:response?.status,reusedSavedResponse:!response,message:body.message,elapsedMs:Date.now()-started,previewStatus:preview.status,downloadStatus:download.status,bundledImages:images.length,warnings:result.warnings?.map(w=>w.code),previewUrl:new URL(artifacts.previewUrl,base).href,siteUrl:new URL(artifacts.siteUrl,base).href}));
