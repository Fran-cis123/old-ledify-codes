import fs from 'node:fs/promises';
import path from 'node:path';
import { timingSafeEqual } from 'node:crypto';
import { DOCUMENT_ROOT, documentTokenHash } from '../Service/document/documentArtifactService.mjs';
import {ensureDocumentPdf} from '../Service/document/documentPdfService.mjs';
function framePolicy(){
    const configured=process.env.LEDIFY_FRONTEND_ORIGIN||process.env.WEBPAGE_APP_ORIGIN;
    if(!configured)return {ancestors:"'self'",headers:{'X-Frame-Options':'SAMEORIGIN'}};
    const url=new URL(configured);
    if(!['http:','https:'].includes(url.protocol)||url.origin!==configured)throw new Error('Configure an exact frontend HTTP(S) origin');
    return {ancestors:`'self' ${url.origin}`,headers:{}};
}
function documentAssetHandler(root,preview) {
    return async(req,res)=>{
        const {id,token}=req.params;
        if(!/^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/i.test(id||'')||!/^[\da-f]{64}$/i.test(token||''))return res.status(404).json({message:'Document not found'});
        try {
            const directory=path.join(root,id),metadata=JSON.parse(await fs.readFile(path.join(directory,'metadata.json'),'utf8'));
            if(!/^[\da-f]{64}$/.test(metadata.tokenHash)||!timingSafeEqual(Buffer.from(metadata.tokenHash,'hex'),Buffer.from(documentTokenHash(token),'hex')))throw new Error('Invalid capability');
            await fs.access(path.join(directory,'document.docx'));
            if(req.params.format==='pdf'||req.query.format==='pdf'){
                const pdf=await ensureDocumentPdf(directory);
                res.set({'Content-Type':'application/pdf','Cache-Control':'private, no-store','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff'});
                return res.download(pdf.pdfPath,'generated-document.pdf',error=>{if(error&&!res.headersSent)res.status(404).json({message:'Document not found'});});
            }
            if(req.query.format!=null&&req.query.format!=='docx')return res.status(400).json({message:'format must be docx or pdf',errorCode:'INVALID_EXPORT_FORMAT'});
            if(preview) {
                const html=await fs.readFile(path.join(directory,'preview.html'),'utf8');
                const framing=framePolicy();
                res.set({'Content-Type':'text/html; charset=utf-8','Cache-Control':'private, no-store','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff',
                    'Content-Security-Policy':`default-src 'none'; style-src 'unsafe-inline'; img-src data:; base-uri 'none'; form-action 'none'; frame-ancestors ${framing.ancestors}`,...framing.headers});
                return res.send(html);
            }
            res.set({'Content-Type':'application/vnd.openxmlformats-officedocument.wordprocessingml.document','Cache-Control':'private, no-store','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff'});
            return res.download(path.join(directory,'document.docx'),'generated-document.docx',error=>{if(error&&!res.headersSent)res.status(404).json({message:'Document not found'});});
        } catch(error) {if(error.code==='DOCUMENT_PDF_UNAVAILABLE')return res.status(503).set('Retry-After','15').json({message:error.message,errorCode:error.code,stage:error.stage});return res.status(404).json({message:'Document not found'});}
    };
}
export const documentDownloadHandler=(root=DOCUMENT_ROOT)=>documentAssetHandler(root,false);
export const documentPreviewHandler=(root=DOCUMENT_ROOT)=>documentAssetHandler(root,true);
export const documentPdfHandler=(root=DOCUMENT_ROOT)=>{
    const handle=documentAssetHandler(root,false);
    return (req,res)=>{req.params.format='pdf';return handle(req,res);};
};
