import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import express from 'express';
import path from 'node:path';
import {getPresentationSlide,downloadPresentation,downloadPresentationPdf,previewPresentationPdf} from '../controller/presentationAssetsController.mjs';
const manifestPath=process.argv[2]||'generated/presentation-redesign/manifest.json';
const manifest=JSON.parse(await fs.readFile(manifestPath,'utf8'));
const app=express();
app.get('/api/presentations/:previewId/slides/:slideNumber',getPresentationSlide);
app.get('/api/presentations/:previewId/download',downloadPresentation);
app.get('/api/presentations/:previewId/pdf',downloadPresentationPdf);
app.get('/api/presentations/:previewId/preview',previewPresentationPdf);
const server=await new Promise(resolve=>{const s=app.listen(0,'127.0.0.1',()=>resolve(s));});
const base=`http://127.0.0.1:${server.address().port}`;let requests=0;
try{
    for(const entry of manifest){
        const {preview}=entry;
        const files=[[preview.downloads.pptx,preview.files.pptxPath],[preview.downloads.pdf,preview.files.pdfPath],...preview.slides.map(s=>[s.url,s.filePath])];
        for(const [url,file] of files){
            const response=await fetch(base+url);requests++;
            if(response.status!==200)throw new Error(`HTTP ${response.status}: ${url}`);
            const hash=b=>createHash('sha256').update(b).digest('hex');
            if(hash(Buffer.from(await response.arrayBuffer()))!==hash(await fs.readFile(file)))throw new Error('Downloaded bytes differ from rendered artifact');
        }
        const response=await fetch(base+preview.previewUrl);requests++;if(response.status!==200||!response.headers.get('content-disposition')?.startsWith('inline'))throw new Error('PDF preview must be inline');await response.arrayBuffer();
    }
    const report={status:'passed',decks:manifest.length,slides:manifest.reduce((n,s)=>n+(s.slideCount||s.preview.slideCount),0),requests,byteEquality:true};
    await fs.writeFile(path.join(path.dirname(manifestPath),'delivery-report.json'),JSON.stringify(report,null,2));console.log(report);
}finally{server.close();}
