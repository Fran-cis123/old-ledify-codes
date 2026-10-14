import fs from 'node:fs/promises';
import path from 'node:path';
import { timingSafeEqual } from 'node:crypto';
import { DOCUMENT_ROOT, documentTokenHash } from '../Service/document/documentArtifactService.mjs';
function documentAssetHandler(root,preview) {
    return async(req,res)=>{
        const {id,token}=req.params;
        if(!/^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/i.test(id||'')||!/^[\da-f]{64}$/i.test(token||''))return res.status(404).json({message:'Document not found'});
        try {
            const directory=path.join(root,id),metadata=JSON.parse(await fs.readFile(path.join(directory,'metadata.json'),'utf8'));
            if(!/^[\da-f]{64}$/.test(metadata.tokenHash)||!timingSafeEqual(Buffer.from(metadata.tokenHash,'hex'),Buffer.from(documentTokenHash(token),'hex')))throw new Error('Invalid capability');
            await fs.access(path.join(directory,'document.docx'));
            if(preview) {
                const html=await fs.readFile(path.join(directory,'preview.html'),'utf8');
                res.set({'Content-Type':'text/html; charset=utf-8','Cache-Control':'private, no-store','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff',
                    'Content-Security-Policy':"default-src 'none'; style-src 'unsafe-inline'; img-src data:; base-uri 'none'; form-action 'none'; frame-ancestors 'self'",'X-Frame-Options':'SAMEORIGIN'});
                return res.send(html);
            }
            res.set({'Content-Type':'application/vnd.openxmlformats-officedocument.wordprocessingml.document','Cache-Control':'private, no-store','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff'});
            return res.download(path.join(directory,'document.docx'),'generated-document.docx',error=>{if(error&&!res.headersSent)res.status(404).json({message:'Document not found'});});
        } catch {return res.status(404).json({message:'Document not found'});}
    };
}
export const documentDownloadHandler=(root=DOCUMENT_ROOT)=>documentAssetHandler(root,false);
export const documentPreviewHandler=(root=DOCUMENT_ROOT)=>documentAssetHandler(root,true);
