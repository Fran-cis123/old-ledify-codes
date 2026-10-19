import test from 'node:test';
import assert from 'node:assert/strict';
import {checkGeometry,geometryRecorder} from '../../renderer/presentation/geometry.mjs';
import {numberedSlideRequirements,validateNumberedRequirements,visualIntent} from '../../Service/ai/presentationIntent.mjs';
import {presentationLayoutService} from '../../Service/presentationLayoutService.mjs';
import {validateRenderContent,renderProfessionalSlide} from '../../renderer/presentation/professionalLayouts.mjs';
import {categorySamples,healthcare} from '../fixtures/presentationRedesign.mjs';
import {resolveSlideCount} from '../../Service/ai/slideCount.mjs';
import {createRenderQueue} from '../../renderer/presentation/renderQueue.mjs';
import {validateDiagram} from '../../renderer/presentation/visuals/svgGraphics.mjs';
import {unsupportedAbsoluteClaims} from '../../Service/ai/presentationQuality.mjs';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import JSZip from 'jszip';
import sharp from 'sharp';
import {presentationThemeService} from '../../Service/presentationThemeService.mjs';
import {presentationRendererService} from '../../Service/presentationRendererService.mjs';
import {resolvePresentationVisuals} from '../../Service/visual/presentationVisuals.mjs';
import {generatePresentationBuffer} from '../../renderer/presentation/pptxRenderer.mjs';
import {validatePreviewImages} from '../../renderer/presentation/previewValidation.mjs';

test('numbered slide instructions preserve their positions and report the exact failed field',()=>{
    const requirements=numberedSlideRequirements('Create 10 slides. Slide 3: Foundational AI Architectures; Slide 6 should cover Clinical Workflow.');
    assert.deepEqual(requirements.map(r=>r.slideNumber),[3,6]);
    validateNumberedRequirements(healthcare.presentation,requirements);
    validateNumberedRequirements({slides:[{title:'AI',objective:'AI'}]},[{slideNumber:1,topic:'AI'}]);
    validateNumberedRequirements({slides:[{title:'Gouvernement français',objective:'Présentation'}]},[{slideNumber:1,topic:'Gouvernement français'}]);
    const bad=structuredClone(healthcare.presentation);bad.slides[5].title='Unrelated finance';bad.slides[5].objective='Unrelated finance';
    assert.throws(()=>validateNumberedRequirements(bad,requirements),e=>e.slideNumber===6&&e.field==='slides[5].objective');
    assert.equal(resolveSlideCount('Create 10 slides.').min,10);assert.deepEqual(resolveSlideCount('Make a deck'),{min:8,max:10,source:'default'});
    assert.throws(()=>resolveSlideCount('Make 13 slides'),e=>e.code==='INVALID_SLIDE_COUNT');
});
test('geometry rejects off-slide objects, critical collisions and tiny body text',()=>{
    assert.throws(()=>checkGeometry([{kind:'shape',x:13,y:1,w:1,h:1,field:'shape'}],3),e=>e.code==='PRESENTATION_LAYOUT_UNSAFE'&&e.slideNumber===3);
    const text={kind:'text',x:1,y:1,w:2,h:1,fontSize:20,field:'body'};
    assert.throws(()=>checkGeometry([text,{...text,x:2}],2),/overlap/);
    assert.throws(()=>checkGeometry([{...text,fontSize:12}],2),/18 pt/);
    assert.equal(checkGeometry([text,{...text,x:4}],2).status,'passed');
});
test('all seven category fixtures select renderable layouts and retain their content',()=>{
    for(const sample of categorySamples){
        const original=structuredClone(sample.presentation),result=presentationLayoutService(original,sample.context);
        assert.equal(result.slides.length,sample.presentation.slides.length);
        for(const [i,s] of result.slides.entries()){validateRenderContent(s);assert.deepEqual(s.content,sample.presentation.slides[i].content);assert.equal(s.visualIntent.treatment,visualIntent(s).treatment);}
    }
});
test('real phase progression and synthesis differ from generic card and bullet geometry',()=>{
    const result=presentationLayoutService(structuredClone(healthcare.presentation));
    assert.equal(result.slides[0].layoutId,'title-editorial');assert.equal(result.slides[9].layoutId,'closing-synthesis');
    const ops=[];renderProfessionalSlide({slide:{addShape:(type,o)=>ops.push({type,...o}),addText(){},addImage(){},addChart(){}},slideData:result.slides[8]});
    assert.ok(ops.some(o=>o.type==='line'&&o.line.endArrowType==='triangle'));
    assert.ok(!ops.some(o=>o.type==='rect'&&o.h>1));
});
test('stale valid-looking layout IDs cannot bypass candidate readability validation',()=>{
    const presentation=structuredClone(healthcare.presentation);presentation.slides[1].layoutId='key-points-stack';presentation.slides[1].content.items[0].description='long '.repeat(200);
    assert.throws(()=>presentationLayoutService(presentation),e=>e.code==='PRESENTATION_CONTENT_TOO_DENSE'||e.message.includes('Hard limit'));
});
test('conversion queue bounds work and releases a slot after failure or completion',async()=>{
    const queue=createRenderQueue({concurrency:1,maxWaiting:1,waitMs:1000});
    const release=await queue.acquire(),next=queue.acquire();
    await assert.rejects(queue.acquire(),e=>e.code==='PRESENTATION_RENDER_BUSY');
    release();const secondRelease=await next;secondRelease();const thirdRelease=await queue.acquire();thirdRelease();
});
test('diagrams reject false cycles, duplicate edges and cyclic flowcharts',()=>{
    const nodes=[{id:'a',label:'First'},{id:'b',label:'Second'}],edges=[{from:'a',to:'b',label:'Followed by'}];
    assert.throws(()=>validateDiagram({kind:'cycle',nodes,edges}),/incoming/);
    assert.throws(()=>validateDiagram({kind:'labeled',nodes,edges:[...edges,...edges]}),/unique/);
    assert.throws(()=>validateDiagram({kind:'flowchart',nodes,edges:[...edges,{from:'b',to:'a'}]}),/cycle/);
    assert.equal(validateDiagram({kind:'cycle',nodes,edges:[...edges,{from:'b',to:'a'}]}),true);
});
test('clinical accountability is not treated as automatic legal liability',()=>{
    assert.equal(unsupportedAbsoluteClaims([{slideNumber:7,content:{textContent:{body:'Legal liability stays with human.'}}}]).length,1);
    assert.equal(unsupportedAbsoluteClaims([{slideNumber:7,content:{textContent:{body:'Liability depends on jurisdiction and circumstances.'}}}]).length,0);
});
test('authorized photos are embedded once, preserve aspect ratio and retain attribution in notes',async t=>{
    const root=await fs.mkdtemp(path.join(os.tmpdir(),'ledify-presentation-photo-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));
    const buffer=await fs.readFile(new URL('../../assets/webpage/curated/laboratory.jpg',import.meta.url));
    const photo={buffer,source:'CDC',creator:'James Gathany',license:'Public domain',attributionRequired:true,attribution:'James Gathany / CDC',originalUrl:'https://phil.cdc.gov/'};
    const presentation=structuredClone(healthcare.presentation);presentation.slides=presentation.slides.slice(0,1);
    for(let i=2;i<=3;i++)presentation.slides.push({slideNumber:i,slideType:'text-visual',title:'Laboratory context '+i,layoutId:'text-visual-split',content:{visualContent:{text:'Illustrative laboratory photograph, rather than evidence about a particular facility.',visual:{type:'photo',description:'A laboratory photograph',searchQuery:'laboratory'}}},visualRequirement:{role:'foreground',kind:'photo',required:true,description:'Laboratory',altText:'Illustrative laboratory photograph',searchQuery:'laboratory'}});
    const ready=presentationRendererService(presentationThemeService(presentationLayoutService(presentation),healthcare.context));
    const resolved=await resolvePresentationVisuals(ready,{}, {cacheRoot:root,providers:{search:async()=>photo}});
    assert.ok(resolved.slides[1].photoAsset);assert.equal(resolved.slides[2].photoAsset,undefined);
    assert.ok(Math.abs(resolved.slides[1].photoAsset.width/resolved.slides[1].photoAsset.height-resolved.slides[1].photoAsset.crop.targetAspectRatio)<.01);
    const {buffer:pptx}=await generatePresentationBuffer(resolved),zip=await JSZip.loadAsync(pptx);
    const xml=await zip.file('ppt/slides/slide2.xml').async('string');assert.ok(xml.includes('<p:pic>'));
    assert.ok((await zip.file('ppt/notesSlides/notesSlide2.xml').async('string')).includes('James Gathany'));
    assert.ok(resolved.warnings.some(w=>w.slideNumber===3));
});
test('real preview inspection rejects a blank PNG and incorrect dimensions',async t=>{
    const root=await fs.mkdtemp(path.join(os.tmpdir(),'ledify-presentation-pixels-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));
    const filePath=path.join(root,'blank.png');await sharp({create:{width:1600,height:900,channels:3,background:'white'}}).png().toFile(filePath);
    await assert.rejects(validatePreviewImages([{filePath}],1),/blank/);
    await sharp({create:{width:200,height:200,channels:3,background:'white'}}).png().toFile(filePath);
    await assert.rejects(validatePreviewImages([{filePath}],1),/dimensions/);
});
