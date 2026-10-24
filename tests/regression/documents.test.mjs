import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import JSZip from 'jszip';
import express from 'express';
import { load } from 'cheerio';
import { createCanvas } from '@napi-rs/canvas';
import { documentFixtureClient,documentParagraph } from '../fixtures/documentFixtures.mjs';
import { docxSource,pdfSource,DOCX_MIME } from '../fixtures/uploadFiles.mjs';
import { resolveDocumentPolicy,generateDocumentContent } from '../../Service/document/documentGeneration.mjs';
import { validateDocumentSection,validateDocumentOutline,validateDocumentContent } from '../../Service/document/documentValidation.mjs';
import { renderDocumentDocx,validateDocxArtifact,documentStyle } from '../../renderer/document/docxRenderer.mjs';
import { documentArtifactService } from '../../Service/document/documentArtifactService.mjs';
import { renderDocumentPreview } from '../../renderer/document/documentPreview.mjs';
import { validateQuantitativeGrounding } from '../../Service/ai/sourceGrounding.mjs';
process.env.GEMINI_API_KEY ||= 'test-key-never-used';
const {generateService}=await import('../../Service/generateService.mjs');
const {createGenerationRouter}=await import('../../route/generateRoute.mjs');
const {createApp}=await import('../../src/app.mjs');
const draft=()=>({title:'Understanding REST APIs',documentType:'technical-documentation',coverPage:false,sections:[{id:'overview',heading:'API overview',blocks:[{type:'paragraph',text:documentParagraph}]}],references:[],assets:[],warnings:[]});
test('length policy respects requested pages and words without claiming verified pagination',()=>{
    assert.equal(resolveDocumentPolicy('Write a detailed ten-page report').targetWords,3500);
    assert.equal(resolveDocumentPolicy('Write a two-page report',{wordCount:900}).targetWords,900);
    assert.equal(resolveDocumentPolicy('Formal application letter').targetWords,250);
    assert.equal(resolveDocumentPolicy('A report').pageCountVerified,false);
    const longStyle=documentStyle({...draft(),length:{requestedPages:10},coverPage:true});assert.equal(longStyle.size,11);assert.equal(longStyle.margin,1080);assert.equal(longStyle.cover,false);
    assert.equal(documentStyle({...draft(),length:{requestedPages:10},coverPage:true},{documentFormatting:{coverPage:true}}).cover,true);
    for(const context of [{pageCount:31},{pageCount:0},{wordCount:20000},{wordCount:0}])assert.throws(()=>resolveDocumentPolicy('Report',context));
});
test('outline rejects duplicates and missing topic mapping before drafting',()=>{
    const plan={title:'Report',documentType:'report',sections:[{id:'one',heading:'Overview',objective:'Explain',topics:['anatomy'],targetWords:100}]};
    validateDocumentOutline(plan,{targetWords:100},['anatomy']);
    assert.throws(()=>validateDocumentOutline(plan,{targetWords:100},['physiology']));
    assert.throws(()=>validateDocumentOutline({...plan,sections:[...plan.sections,...plan.sections]},{targetWords:200}));
});
test('content validation rejects empty, invalid, repeated, unsupported citation and image blocks',()=>{
    const expected={id:'overview',heading:'API overview'};
    for(const blocks of [[],[{type:'paragraph',text:''}],[{type:'table',columns:['A','B'],rows:[{cells:['Only one']}]}],[{type:'paragraph',text:documentParagraph,referenceIds:['fake']}],[{type:'image',assetId:'missing'}],[{type:'quote',text:'An invented quotation'}],[{type:'list',items:[]}],[{type:'paragraph',text:documentParagraph},{type:'paragraph',text:documentParagraph}]])assert.throws(()=>validateDocumentSection({...expected,blocks},expected));
    const d=draft();d.sections.push({...d.sections[0],id:'other',heading:'Another section'});assert.throws(()=>validateDocumentContent(d));
    assert.throws(()=>validateDocumentSection({...expected,blocks:[{type:'paragraph',text:'I have developed advanced research skills while pursuing a degree.'}]},expected,{documentType:'formal-letter',source:'Create an internship application letter'}));
    validateDocumentSection({...expected,blocks:[{type:'paragraph',text:'[Describe your verified education and relevant experience here.]'}]},expected,{documentType:'formal-letter',source:'Create an internship application letter'});
    assert.throws(()=>validateDocumentSection({...expected,blocks:[{type:'paragraph',text:'This product guarantees success with zero risk.'}]},expected));
});
test('section retries preserve the outline and completed content',async()=>{
    const base=documentFixtureClient();let outlineCalls=0,sectionCalls=0;
    const client={models:{generateContent:async request=>{if(request.config.responseJsonSchema.properties.documentType)outlineCalls++;if(request.config.responseJsonSchema.properties.blocks&&++sectionCalls===1)return {text:JSON.stringify({id:'overview',heading:'API overview',blocks:[]}),candidates:[{finishReason:'STOP'}]};return base.models.generateContent(request);}}};
    const result=await generateDocumentContent({client,inputType:'prompt',input:'Explain REST APIs',context:{wordCount:100},options:{logger:()=>{},sleep:async()=>{}}});
    assert.equal(outlineCalls,1);assert.equal(sectionCalls,2);assert.equal(result.quality.status,'reviewed');
});
test('persistent substantive quality errors fail after bounded targeted repairs',async()=>{
    const base=documentFixtureClient();let sections=0;
    const client={models:{generateContent:async request=>{const props=request.config.responseJsonSchema.properties;if(props.blocks)sections++;if(props.issues)return {text:JSON.stringify({issues:[{sectionId:'overview',instruction:'Correct the explanation'}]}),candidates:[{finishReason:'STOP'}]};return base.models.generateContent(request);}}};
    await assert.rejects(generateDocumentContent({client,inputType:'prompt',input:'Explain REST APIs',context:{wordCount:100},options:{logger:()=>{}}}),{code:'DOCUMENT_QUALITY_FAILED'});assert.equal(sections,3);
});

test('quality repair of a requested diagram respects available assets and permits formatted code schematics',async()=>{
    const base=documentFixtureClient();let sections=0,reviews=0;const logs=[];
    const client={models:{generateContent:async request=>{
        const properties=request.config.responseJsonSchema.properties;
        assert.match(request.contents,/No image assets are available/);
        if(properties.blocks) {
            sections++;assert.ok(!properties.blocks.items.anyOf.some(branch=>branch.properties.type.enum.includes('image')));
            const result=await base.models.generateContent(request);
            if(sections===2){const value=JSON.parse(result.text);value.blocks.push({type:'code',text:'Input\n'+' '.repeat(64)+'Model\n'+'-'.repeat(64)+'\nOutput'});return {...result,text:JSON.stringify(value)};}
            return result;
        }
        if(properties.issues)return {text:JSON.stringify({issues:++reviews===1?[{sectionId:'overview',instruction:'Explain the request-response relationship with a concise text schematic.'}]:[]}),candidates:[{finishReason:'STOP'}]};
        return base.models.generateContent(request);
    }}};
    const document=await generateDocumentContent({client,inputType:'url',input:documentParagraph,context:{instructions:'Create a document explaining REST APIs with diagrams.',wordCount:100},options:{logger:entry=>logs.push(entry),sleep:async()=>{}}});
    assert.equal(sections,2);assert.equal(document.quality.repairRounds,1);assert.equal(document.sections[0].blocks.at(-1).type,'code');
    assert.ok(document.warnings.some(warning=>warning.code==='DOCUMENT_VISUALS_TEXT_ONLY'));
    assert.ok(logs.filter(entry=>entry.stage==='document-section').every(entry=>entry.sectionId==='overview'));
});

test('document repair exhaustion identifies the affected section and semantic validation rule',async()=>{
    const base=documentFixtureClient();let reviews=0;
    const client={models:{generateContent:async request=>{
        const properties=request.config.responseJsonSchema.properties;
        if(properties.issues){reviews++;return {text:JSON.stringify({issues:[{sectionId:'overview',instruction:'Repair the unsupported quotation.'}]}),candidates:[{finishReason:'STOP'}]};}
        const result=await base.models.generateContent(request);
        if(properties.blocks&&reviews){const value=JSON.parse(result.text);value.blocks=[{type:'quote',text:'A quotation not present in the source.'}];return {...result,text:JSON.stringify(value)};}
        return result;
    }}};
    await assert.rejects(generateDocumentContent({client,inputType:'prompt',input:'Explain REST APIs',context:{wordCount:100},options:{logger:()=>{},sleep:async()=>{}}}),error=>error.code==='AI_RETRY_EXHAUSTED'&&error.sectionId==='overview'&&error.validationRule==='UNSUPPORTED_QUOTATION'&&error.field==='blocks[0]');
});
test('letter review excludes internal headings and does not trigger impossible metadata repairs',async()=>{
    const base=documentFixtureClient();let sawReview=false;
    const client={models:{generateContent:async request=>{
        const result=await base.models.generateContent(request),value=JSON.parse(result.text);
        if(request.config.responseJsonSchema.properties.documentType)value.documentType='formal-letter';
        if(request.config.responseJsonSchema.properties.issues){sawReview=true;const visible=JSON.parse(request.contents.split('\nDocument: ').at(-1));assert.equal(visible.sections[0].heading,undefined);assert.equal(visible.sections[0].id,'overview');assert.ok(visible.sections[0].blocks.length);}
        return {...result,text:JSON.stringify(value)};
    }}};
    await generateDocumentContent({client,inputType:'prompt',input:'Create a formal internship letter',context:{wordCount:100},options:{logger:()=>{}}});assert.equal(sawReview,true);
});
test('Word package has editable styles, tables, numbering, code, fields and page settings',async()=>{
    const d=draft();d.sections[0].blocks.push({type:'heading',text:'HTTP operations',level:2},{type:'list',ordered:true,items:['Validate the request','Return a response']},{type:'code',text:'GET /resources HTTP/1.1\nAccept: application/json\n\nHTTP/1.1 200 OK'},{type:'table',columns:['Method','Purpose'],rows:[{cells:['GET','Read a resource']},{cells:['POST','Submit a representation']}]},{type:'sectionBreak',orientation:'landscape'},{type:'paragraph',text:'Landscape content remains editable.'});
    const buffer=await renderDocumentDocx(d,{documentFormatting:{paperSize:'Letter',fontFamily:'Arial',fontSize:11}});const result=await validateDocxArtifact(buffer,d);assert.equal(result.tables,1);
    const zip=await JSZip.loadAsync(buffer);const xml=await zip.file('word/document.xml').async('string');
    assert.match(xml,/Heading1/);assert.match(xml,/Heading2/);assert.match(xml,/landscape/);assert.match(xml,/numPr/);assert.match(xml,/D9D9D9/);assert.match(xml,/tblHeader/);assert.match(xml,/cantSplit/);assert.match(xml,/w:w="12240"/);
    assert.ok((xml.match(/<w:br\/>/g)||[]).length>=3,'Code line breaks must be native Word breaks rather than collapsed XML whitespace');
    const footer=await zip.file('word/footer1.xml').async('string');assert.match(footer,/PAGE/);
    await assert.rejects(validateDocxArtifact(Buffer.from('not docx'),d),{code:'DOCUMENT_ARTIFACT_INVALID'});
});
test('wrapped document titles retain font-relative line spacing instead of overlapping fixed leading',async()=>{
    const d=draft();d.title='Government Responsibilities and Public Accountability';
    const zip=await JSZip.loadAsync(await renderDocumentDocx(d)), $=load(await zip.file('word/document.xml').async('string'),{xml:true});
    const title=$('w\\:p').filter((i,p)=>$(p).find('w\\:pStyle').attr('w:val')==='Title').first();
    assert.equal(title.find('w\\:spacing').attr('w:lineRule'),'auto');assert.ok(Number(title.find('w\\:spacing').attr('w:line'))>=240);assert.equal(title.find('w\\:t').text(),d.title);
});
test('letters suppress report headings and running headers and accept explicit typography',async()=>{
    const d=draft();d.documentType='formal-letter';d.coverPage=true;const b=await renderDocumentDocx(d);const zip=await JSZip.loadAsync(b);const xml=await zip.file('word/document.xml').async('string');assert.ok(!xml.includes('Heading1'));assert.ok(!xml.includes('headerReference'));assert.ok(!xml.includes('footerReference'));
    assert.equal(documentStyle(d,{instructions:'Arial 12-point double-spaced Letter paper'}).font,'Arial');assert.equal(documentStyle(d,{instructions:'Arial 12-point double-spaced Letter paper'}).lineSpacing,2);assert.throws(()=>documentStyle(d,{documentFormatting:{marginInches:0}}));
});
test('authorized original images embed with alternative text and attribution',async()=>{
    const canvas=createCanvas(1000,500),ctx=canvas.getContext('2d');ctx.fillStyle='#ffffff';ctx.fillRect(0,0,1000,500);ctx.fillStyle='#000000';ctx.font='36px Arial';ctx.fillText('Client request',80,250);ctx.fillText('Server response',600,250);ctx.beginPath();ctx.moveTo(350,240);ctx.lineTo(560,240);ctx.stroke();
    const d=draft();d.assets=[{id:'request-response',base64:canvas.toBuffer('image/png').toString('base64'),alt:'Client sends a request and the server returns a response.',attribution:'Original Ledify schematic'}];d.sections[0].blocks.push({type:'image',assetId:'request-response',caption:'Request and response overview'});
    const buffer=await renderDocumentDocx(d);assert.equal((await validateDocxArtifact(buffer,d)).embeddedImages,1);const zip=await JSZip.loadAsync(buffer);const xml=await zip.file('word/document.xml').async('string');assert.match(xml,/Client sends a request/);assert.match(xml,/Original Ledify schematic/);assert.match(xml,/Request and response overview/);
});
test('supplied citation formatting is retained without invented bibliography details',async()=>{
    const d=draft();d.citationStyle='APA';d.references=[{id:'source-1',title:'Supplied API reference',url:'https://example.com/api',formattedText:'Author. (2026). Supplied API reference.',citationText:'(Author, 2026)'}];d.sections[0].blocks[0].referenceIds=['source-1'];
    const b=await renderDocumentDocx(d);await validateDocxArtifact(b,d);const zip=await JSZip.loadAsync(b),xml=await zip.file('word/document.xml').async('string');assert.match(xml,/Author, 2026/);assert.match(xml,/Supplied API reference/);assert.ok(!xml.includes('[1]'),'Preformatted APA entries must not acquire numeric bibliography labels');assert.match(await zip.file('word/_rels/document.xml.rels').async('string'),/https:\/\/example.com\/api/);
});
test('missing authorized image fails and rendering failure never yields success or leftovers',async t=>{
    const root=await fs.mkdtemp(path.join(os.tmpdir(),'ledify-doc-failure-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));
    await assert.rejects(documentArtifactService(draft(),{}, {root,render:async()=>{throw new Error('write failure')}}),{code:'DOCUMENT_RENDER_FAILED'});assert.deepEqual(await fs.readdir(root),[]);
    const d=draft();d.assets=[{id:'bad',alt:'Invalid',base64:'not-image'}];await assert.rejects(renderDocumentDocx(d),{code:'INVALID_DOCUMENT_IMAGE'});
    const truncated=Buffer.alloc(40);Buffer.from([137,80,78,71,13,10,26,10]).copy(truncated);truncated.writeUInt32BE(10,16);truncated.writeUInt32BE(10,20);
    d.assets=[{id:'truncated',alt:'Broken PNG',base64:truncated.toString('base64')}];await assert.rejects(renderDocumentDocx(d),{code:'INVALID_DOCUMENT_IMAGE'});
});
test('HTML preview preserves blocks and escapes executable markup and unsafe references',async()=>{
    const d=draft();d.title='<script>alert(1)</script>';d.sections[0].blocks.push(
        {type:'paragraph',text:'<img src=x onerror=alert(1)>'},
        {type:'heading',text:'Subheading',level:2},
        {type:'list',ordered:true,items:['First','Second']},
        {type:'table',caption:'Editable table',columns:['Method','Purpose'],rows:[{cells:['GET','Read']}]},
        {type:'code',text:'GET /api\nAccept: application/json'},
        {type:'quote',text:'Quoted text'},
        {type:'pageBreak'},{type:'sectionBreak',orientation:'landscape'});
    d.references=[{id:'source-1',title:'Unsafe link',url:'javascript:alert(1)'}];
    const html=await renderDocumentPreview(d),$=load(html);
    assert.equal($('script').length,0);assert.equal($('img').length,0);assert.equal($('[onerror]').length,0);
    assert.equal($('h1').text(),d.title);assert.equal($('table tbody td').first().text(),'GET');assert.equal($('ol li').first().text(),'First');
    assert.equal($('code').text(),'GET /api\nAccept: application/json');assert.equal($('a[href^="javascript:"]').length,0);
    assert.equal($('a[href="download"]').length,1);assert.match($('main').text(),/API overview/);
    d.documentType='formal-letter';assert.ok(!load(await renderDocumentPreview(d))('main').text().includes('API overview'));
    const canvas=createCanvas(10,10);d.assets=[{id:'image',alt:'A <safe> image',base64:canvas.toBuffer('image/png').toString('base64')}];
    d.sections[0].blocks.push({type:'image',assetId:'image',caption:'Image caption'});
    const image=load(await renderDocumentPreview(d))('img');assert.equal(image.attr('alt'),'A <safe> image');assert.match(image.attr('src'),/^data:image\/png;base64,/);
});
test('actual DOCX generation and protected previews and downloads work for text PDF DOCX and URLs',async t=>{
    const root=await fs.mkdtemp(path.join(os.tmpdir(),'ledify-doc-api-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));
    const app=createApp({documentRoot:root,model:{create:async value=>({...value,_id:'fixture',save:async()=>{}})},extractUrl:async()=>documentParagraph,generator:(kind,input,output,context)=>generateService(kind,input,output,context,{ai:{client:documentFixtureClient(),logger:()=>{}},document:{root}})});
    const server=await new Promise(resolve=>{const s=app.listen(0,'127.0.0.1',()=>resolve(s));});t.after(()=>server.close());const base=`http://127.0.0.1:${server.address().port}`;
    const malformed=await fetch(base+'/api/generate/textPrompt',{method:'POST',headers:{'Content-Type':'application/json'},body:'{invalid'});assert.equal(malformed.status,400);assert.equal((await malformed.json()).errorCode,'INVALID_JSON');
    const charset=await fetch(base+'/api/generate/textPrompt',{method:'POST',headers:{'Content-Type':'application/json; charset=unsupported'},body:'{}'});assert.equal(charset.status,415);assert.equal((await charset.json()).errorCode,'INVALID_REQUEST');
    const wrongEndpoint=new FormData();wrongEndpoint.set('outputType','document');wrongEndpoint.set('file',new Blob(['Unsupported text upload'],{type:'text/plain'}),'source.txt');assert.equal((await fetch(base+'/api/generate/textPrompt',{method:'POST',body:wrongEndpoint})).status,400);
    for(const kind of ['textPrompt','urlPrompt','pdf','docx']) {
        let body,headers,endpoint=kind;
        if(['pdf','docx'].includes(kind)){endpoint='file';body=new FormData();body.set('outputType','document');body.set('context',JSON.stringify({wordCount:100}));body.set('file',new Blob([kind==='pdf'?pdfSource():await docxSource()],{type:kind==='pdf'?'application/pdf':DOCX_MIME}),`source.${kind}`);}
        else {headers={'Content-Type':'application/json'};body=JSON.stringify({outputType:'document',context:{wordCount:100},[kind]:kind==='urlPrompt'?'https://example.com':'Explain REST APIs'});}
        const response=await fetch(`${base}/api/generate/${endpoint}`,{method:'POST',body,headers});const json=await response.json();assert.equal(response.status,201,JSON.stringify(json));const result=json.data.result;assert.ok(result.documentId);assert.equal(result.artifacts.format,'docx');assert.ok(!JSON.stringify(json).includes(root));assert.ok(!result.preview);
        const download=await fetch(base+result.downloadUrl);assert.equal(download.status,200);assert.match(download.headers.get('content-type'),/wordprocessingml/);assert.match(download.headers.get('content-disposition'),/\.docx/);await validateDocxArtifact(Buffer.from(await download.arrayBuffer()),result.generatedContent);
        assert.equal(result.previewUrl,result.artifacts.previewUrl);
        assert.ok(result.timings.totalMs>=result.timings.aiMs);assert.ok(result.timings.renderMs>=0);assert.match(response.headers.get('server-timing'),/ai;dur=/);
        const preview=await fetch(base+result.previewUrl);assert.equal(preview.status,200);assert.match(preview.headers.get('content-type'),/text\/html/);
        assert.match(preview.headers.get('content-security-policy'),/default-src 'none'/);assert.equal(preview.headers.get('referrer-policy'),'no-referrer');assert.match(preview.headers.get('cache-control'),/no-store/);
        const $=load(await preview.text());assert.ok($('main').text().includes(documentParagraph));assert.equal(new URL($('a[href="download"]').attr('href'),base+result.previewUrl).pathname,result.downloadUrl);
        assert.equal((await fetch(base+result.previewUrl.replace(/\/[\da-f]{64}\//,'/'+'0'.repeat(64)+'/'))).status,404);
        const wrong=result.downloadUrl.replace(/\/[\da-f]{64}\//,'/'+'0'.repeat(64)+'/');assert.equal((await fetch(base+wrong)).status,404);
        const pdf=await fetch(base+result.artifacts.downloads.pdf);assert.equal(pdf.status,200);assert.match(pdf.headers.get('content-type'),/application\/pdf/);assert.equal(Buffer.from(await pdf.arrayBuffer()).subarray(0,5).toString(),'%PDF-');
        await fs.unlink(path.join(root,result.documentId,'preview.html'));assert.equal((await fetch(base+result.previewUrl)).status,404);
        assert.equal((await fetch(base+result.downloadUrl)).status,200);
        await fs.unlink(path.join(root,result.documentId,'document.docx'));assert.equal((await fetch(base+result.downloadUrl)).status,404);assert.equal((await fetch(base+result.previewUrl)).status,404);
    }
});
test('illustrative chart figures require explicit authorization and visible qualification',()=>{
    const slide={slideNumber:9,slideType:'data-chart',title:'Financial projections',content:{chart:{labels:['Year 1','Year 2','Year 3'],datasets:[{label:'Revenue',values:[12,24,48]}],insight:'Illustrative assumptions, not actual company performance.'}}};
    validateQuantitativeGrounding(slide,'Show hypothetical three-year revenue projections');assert.throws(()=>validateQuantitativeGrounding(slide,'Show real revenue projections'));slide.content.chart.insight='Projected revenue';assert.throws(()=>validateQuantitativeGrounding(slide,'Show hypothetical revenue projections'),{field:'chart.insight'});
});
