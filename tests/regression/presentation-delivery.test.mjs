import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {createApp} from '../../src/app.mjs';
import {presentationStorageRoot} from '../../Service/presentationStorage.mjs';
import {addPresentationPublicUrls} from '../../Service/presentationPublicUrls.mjs';

test('frontend image URL delivers real PNG bytes from the configured presentation disk',async t=>{
    const root=await fs.mkdtemp(path.join(os.tmpdir(),'ledify-delivery-'));
    const previous=process.env.LEDIFY_PRESENTATION_ROOT;
    process.env.LEDIFY_PRESENTATION_ROOT=root;
    t.after(async()=>{if(previous===undefined)delete process.env.LEDIFY_PRESENTATION_ROOT;else process.env.LEDIFY_PRESENTATION_ROOT=previous;await fs.rm(root,{recursive:true,force:true});});
    assert.equal(presentationStorageRoot(),root);
    const id=randomUUID(),directory=path.join(root,id,'slides');
    await fs.mkdir(directory,{recursive:true});
    const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=','base64');
    await fs.writeFile(path.join(directory,'slide-1.png'),png);
    const pdf=await fs.readFile(path.resolve('tests/preview/output/renderer-test/e7d16e44-043e-4d27-89ca-4246819959b6/presentation.pdf'));
    await fs.writeFile(path.join(root,id,'presentation.pdf'),pdf);
    const app=createApp(),server=app.listen(0,'127.0.0.1');
    await new Promise(resolve=>server.once('listening',resolve));
    t.after(()=>new Promise(resolve=>server.close(resolve)));
    const base=`http://127.0.0.1:${server.address().port}`;
    const response=await fetch(`${base}/api/presentations/${id}/slides/1`,{headers:{Origin:'https://frontend.example'}});
    assert.equal(response.status,200);
    assert.match(response.headers.get('content-type'),/^image\/png/);
    assert.equal(response.headers.get('access-control-allow-origin'),'*');
    assert.equal(response.headers.get('content-disposition'),null);
    assert.deepEqual(Buffer.from(await response.arrayBuffer()),png);
    const inline=await fetch(`${base}/api/presentations/${id}/preview`,{headers:{Origin:'https://frontend.example'}});
    assert.equal(inline.status,200);assert.match(inline.headers.get('content-type'),/^application\/pdf/);
    assert.match(inline.headers.get('content-disposition'),/^inline;/);
    assert.equal(inline.headers.get('access-control-allow-origin'),'*');
    assert.deepEqual(Buffer.from(await inline.arrayBuffer()),pdf);
    const download=await fetch(`${base}/api/presentations/${id}/pdf`);
    assert.match(download.headers.get('content-disposition'),/^attachment;/);
    const missing=await fetch(`${base}/api/presentations/${id}/slides/2`);
    assert.equal(missing.status,404);
    assert.equal((await missing.json()).errorCode,'PRESENTATION_ASSET_NOT_FOUND');
    assert.equal((await fetch(`${base}/api/presentations/:previewId/slides/:slideNumber`)).status,400);
});

test('absolute frontend links preserve relative API compatibility and missing PDF state',()=>{
    const previous=process.env.PUBLIC_API_BASE_URL;
    process.env.PUBLIC_API_BASE_URL='https://backend.example';
    try {
        const result=addPresentationPublicUrls({outputType:'presentation',preview:{downloads:{pptx:'/api/presentations/id/download',pdf:null},slides:[{url:'/api/presentations/id/slides/1'}]}},{});
        assert.equal(result.preview.slides[0].imageUrl,'https://backend.example/api/presentations/id/slides/1');
        assert.equal(result.preview.slides[0].url,'/api/presentations/id/slides/1');
        assert.equal(result.preview.downloadUrls.pptx,'https://backend.example/api/presentations/id/download');
        assert.equal(result.preview.downloadUrls.pdf,null);
        assert.equal(result.preview.pdfPreviewUrl,null);
        assert.equal(result.preview.slideImagesAvailable,true);
        assert.equal(result.preview.previewAvailable,true);
        const unavailable=addPresentationPublicUrls({outputType:'presentation',preview:{previewUrl:null,slides:[],downloads:{pptx:'/api/presentations/id/download',pdf:null}}},{});
        assert.equal(unavailable.preview.previewAvailable,false);
        assert.equal(unavailable.preview.slideImagesAvailable,false);
        const pdfOnly=addPresentationPublicUrls({outputType:'presentation',preview:{previewUrl:'/api/presentations/id/preview',slides:[]}},{});
        assert.equal(pdfOnly.preview.pdfPreviewUrl,'https://backend.example/api/presentations/id/preview');
        assert.equal(pdfOnly.preview.previewAvailable,true);
    } finally {if(previous===undefined)delete process.env.PUBLIC_API_BASE_URL;else process.env.PUBLIC_API_BASE_URL=previous;}
});

test('locally generated assets keep their local origin instead of advertising missing Render files',()=>{
    const previousBase=process.env.PUBLIC_API_BASE_URL,previousRender=process.env.RENDER_EXTERNAL_URL;
    delete process.env.PUBLIC_API_BASE_URL;delete process.env.RENDER_EXTERNAL_URL;
    try{
        const result=addPresentationPublicUrls({outputType:'presentation',preview:{slides:[{url:'/api/presentations/id/slides/1'}]}},{protocol:'http',get:key=>key==='host'?'localhost:5000':undefined});
        assert.equal(result.preview.slides[0].imageUrl,'http://localhost:5000/api/presentations/id/slides/1');
    }finally{
        if(previousBase===undefined)delete process.env.PUBLIC_API_BASE_URL;else process.env.PUBLIC_API_BASE_URL=previousBase;
        if(previousRender===undefined)delete process.env.RENDER_EXTERNAL_URL;else process.env.RENDER_EXTERNAL_URL=previousRender;
    }
});

test('generation HTTP response exposes absolute image and download URLs',async t=>{
    const app=createApp({model:{create:async()=>({save:async()=>{}})},generator:async()=>({outputType:'presentation',status:'completed',generatedContent:{slides:[]},preview:{downloads:{pptx:'/api/presentations/id/download'},slides:[{url:'/api/presentations/id/slides/1'}]}})});
    const server=app.listen(0,'127.0.0.1');
    await new Promise(resolve=>server.once('listening',resolve));
    t.after(()=>new Promise(resolve=>server.close(resolve)));
    const base=`http://127.0.0.1:${server.address().port}`;
    const response=await fetch(`${base}/api/generate/textPrompt`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({textPrompt:'Explain healthcare AI',outputType:'presentation'})});
    assert.equal(response.status,201);
    const preview=(await response.json()).data.result.preview;
    const origin=process.env.PUBLIC_API_BASE_URL || process.env.RENDER_EXTERNAL_URL || base;
    assert.equal(preview.slides[0].imageUrl,new URL('/api/presentations/id/slides/1',origin).href);
    assert.equal(preview.downloadUrls.pptx,new URL('/api/presentations/id/download',origin).href);
});
