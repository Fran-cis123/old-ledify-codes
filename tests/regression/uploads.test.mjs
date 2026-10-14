import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import JSZip from 'jszip';
import { docxSource, pdfSource, DOCX_MIME } from '../fixtures/uploadFiles.mjs';
import { fileService } from '../../Service/fileService.mjs';
import { validateUploadedFile, MAX_FILE_BYTES } from '../../Service/input/fileValidation.mjs';
process.env.GEMINI_API_KEY ||= 'test-key-never-used';
const { createGenerationRouter } = await import('../../route/generateRoute.mjs');

test('service rejects unsupported extensions and MIME mismatches without bypassing extraction', async () => {
    for (const extension of ['txt','doc','jpg','png','pptx']) await assert.rejects(fileService({ originalname: `sample.${extension}`, mimetype: 'text/plain', buffer: Buffer.from('source') }), { code:'UNSUPPORTED_FILE_FORMAT' });
    await assert.rejects(fileService({ originalname:'sample.pdf', mimetype:'application/pdf', buffer:Buffer.from('renamed text') }), { code:'INVALID_UPLOADED_FILE' });
    await assert.rejects(fileService({ originalname:'sample.docx', mimetype:DOCX_MIME, buffer:Buffer.from('invalid docx') }), { code:'INVALID_UPLOADED_FILE' });
    await assert.rejects(fileService({ originalname:'sample.docx', mimetype:'application/pdf', buffer:pdfSource() }), { code:'UNSUPPORTED_FILE_FORMAT' });
    const zip=new JSZip();zip.file('not-word.txt','Text in an unrelated ZIP');
    await assert.rejects(validateUploadedFile({originalname:'fake.docx',mimetype:DOCX_MIME,buffer:await zip.generateAsync({type:'nodebuffer'})}), {code:'INVALID_UPLOADED_FILE'});
    await assert.rejects(validateUploadedFile({originalname:'large.pdf',mimetype:'application/pdf',buffer:Buffer.alloc(MAX_FILE_BYTES+1)}));
});
test('real multipart endpoints enforce PDF and DOCX for every output and preserve text and URLs', async t => {
    const seen=[]; const app=express();app.use(express.json());
    app.use('/api',createGenerationRouter({model:{create:async value=>({...value,_id:'fixture',save:async()=>{}})},extractUrl:async()=> 'URL source text',generator:async(kind,input,outputType)=>{seen.push({kind,input,outputType});return {outputType,generatedContent:{title:'Result'}};}}));
    const server=await new Promise(resolve=>{const s=app.listen(0,'127.0.0.1',()=>resolve(s));});t.after(()=>server.close());
    const base=`http://127.0.0.1:${server.address().port}/api/generate`;
    const sources=[['sample.pdf','application/pdf',pdfSource()],['sample.docx',DOCX_MIME,await docxSource()]];
    for(const output of ['presentation','webpage','document']) {
        for(const [name,mime,buffer] of sources) {
            const form=new FormData();form.set('outputType',output);form.set('file',new Blob([buffer],{type:mime}),name);
            const response=await fetch(base+'/file',{method:'POST',body:form});assert.equal(response.status,201,await response.text());
            assert.match(seen.at(-1).input,/readable source document/);assert.equal(seen.at(-1).outputType,output);
        }
        for(const [name,mime,buffer,status] of [['sample.txt','text/plain',Buffer.from('text'),415],['sample.doc','application/msword',Buffer.from('text'),415],['sample.jpg','image/jpeg',Buffer.from('text'),415],['sample.png','image/png',Buffer.from('text'),415],['sample.pptx',DOCX_MIME,Buffer.from('text'),415],['renamed.pdf','application/pdf',Buffer.from('text'),400],['invalid.docx',DOCX_MIME,Buffer.from('text'),400]]) {
            const before=seen.length,form=new FormData();form.set('outputType',output);form.set('file',new Blob([buffer],{type:mime}),name);
            const response=await fetch(base+'/file',{method:'POST',body:form});assert.equal(response.status,status);const json=await response.json();assert.ok(json.errorCode);assert.equal(seen.length,before);
        }
        for(const [endpoint,field,value] of [['textPrompt','textPrompt','Normal text prompt'],['urlPrompt','urlPrompt','https://example.com']]) {
            const response=await fetch(base+'/'+endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({outputType:output,[field]:value})});assert.equal(response.status,201);
        }
    }
    const form=new FormData();form.set('outputType','document');form.set('wrongField',new Blob([pdfSource()],{type:'application/pdf'}),'source.pdf');
    assert.equal((await fetch(base+'/file',{method:'POST',body:form})).status,400);
});
