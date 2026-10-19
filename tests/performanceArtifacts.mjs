import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import express from 'express';
import JSZip from 'jszip';
import {createGenerationRouter} from '../route/generateRoute.mjs';
const phase=process.argv[2]||'after',root=`generated/performance/${phase}`;
const app=express();app.use('/api',createGenerationRouter({generator:async()=>{throw new Error('Artifact verification must not call AI');}}));
const server=await new Promise(resolve=>{const s=app.listen(0,'127.0.0.1',()=>resolve(s));}),base=`http://127.0.0.1:${server.address().port}`,checks=[];
try{
    for(const type of ['presentation','webpage','document']){
        const result=JSON.parse(await fs.readFile(`${root}/${type}-result.json`,'utf8'));
        const urls=type==='presentation'?[result.preview.downloads.pptx,result.preview.downloads.pdf,...result.preview.slides.map(s=>s.url)]:[result.artifacts.previewUrl,result.artifacts.downloadUrl];
        if(type==='presentation'){assert.equal(result.preview.slideCount,10);assert.equal(result.preview.previewCount,10);assert.equal(result.preview.quality.pptx.slidesWithPictures,10);assert.equal(result.preview.quality.preview.images.photographs,10);}
        if(type==='document'){assert.ok(result.generatedContent.length.actualWords>=1120&&result.generatedContent.length.actualWords<=1680);assert.equal(result.generatedContent.sections.length,6);}
        if(type==='webpage'){assert.ok(result.generatedContent.sections.length>=4);assert.ok(result.generatedContent.imageStrategy.resolved>0);}
        for(const url of urls){
            assert.ok(url,'Missing output URL');const response=await fetch(base+url),buffer=Buffer.from(await response.arrayBuffer());assert.equal(response.status,200,url);assert.ok(buffer.length>30);
            if(/\/download$/.test(url)){
                const zip=await JSZip.loadAsync(buffer);assert.ok(Object.keys(zip.files).length>2);
                if(type==='presentation')assert.ok(Object.keys(zip.files).filter(n=>/^ppt\/media\/[^/]+$/.test(n)).length>=10);
                if(type==='document')assert.ok((await zip.file('word/document.xml').async('string')).length>1000);
                if(type==='webpage')assert.ok(Object.keys(zip.files).some(n=>n.startsWith('my-website/assets/images/')));
            }
            checks.push({type,url,status:response.status,bytes:buffer.length});
        }
    }
    await fs.writeFile(`${root}/http-artifact-checks.json`,JSON.stringify(checks,null,2));console.log(JSON.stringify({phase,http200:checks.length,allOutputsVerified:true}));
}finally{await new Promise(resolve=>server.close(resolve));}
