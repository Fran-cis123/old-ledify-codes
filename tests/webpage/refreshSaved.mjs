import fs from 'node:fs/promises';
import path from 'node:path';
import {webpageRenderer} from '../../renderer/webpage/webpageRenderer.mjs';
import {webpageArtifactService} from '../../Service/webpageArtifactService.mjs';
// Re-render a saved AI result with current trusted code; no model/provider call.
const name=process.argv[2]||'event';
if(!['event','nonprofit'].includes(name))throw new Error('Choose a recorded universal live example');
const file=path.resolve('generated/webpage-universal-live',name,'result.json');
const saved=JSON.parse(await fs.readFile(file,'utf8')),assets={};
for(const asset of saved.artifacts.validation.files.filter(name=>name.startsWith('assets/images/')))assets[asset]=await fs.readFile(path.join(saved.artifacts.files.siteDirectory,asset));
saved.artifacts=await webpageArtifactService(webpageRenderer(saved.generatedContent,assets));
saved.rerenderedAt=new Date().toISOString();await fs.writeFile(file,JSON.stringify(saved,null,2));
console.log(JSON.stringify({name,previewUrl:saved.artifacts.previewUrl,originalGenerationTimings:saved.timings}));
