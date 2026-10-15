import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const match=require('nodemon/lib/monitor/match');
const config=JSON.parse(await fs.readFile(new URL('../../nodemon.json',import.meta.url),'utf8'));
const rules=()=>match.rulesToMonitor(config.watch,config.ignore,{dirs:[]});
const watched=file=>match([path.resolve(file)],rules(),config.ext).result.length>0;

test('development watcher excludes runtime artifacts across all output pipelines',()=>{
    for(const file of ['generated/documents/id/metadata.json','generated/documents/id/preview.html','generated/webpages/id/metadata.json','generated/webpages/id/site/script.js','generated/previews/id/metadata.json','generated/checkpoints/document.json','tests/preview/output/metadata.json'])assert.equal(watched(file),false,file);
});
test('development watcher still reloads application code and configuration',()=>{
    for(const file of ['src/server.mjs','controller/generateController.mjs','Service/document/documentArtifactService.mjs','middleWares/uploadMiddlewares.mjs','model/generateModel.mjs','renderer/document/docxRenderer.mjs','route/generateRoute.mjs','templates/presentation/schema.json','package.json','nodemon.json'])assert.equal(watched(file),true,file);
});
