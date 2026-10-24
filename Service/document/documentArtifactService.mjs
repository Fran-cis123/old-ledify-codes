import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID, randomBytes, createHash } from 'node:crypto';
import { renderDocumentDocx, validateDocxArtifact, documentStyle } from '../../renderer/document/docxRenderer.mjs';
import { renderDocumentPreview } from '../../renderer/document/documentPreview.mjs';
import {measureStage} from '../performance.mjs';
import {storageRoot} from '../storageRoot.mjs';
export const DOCUMENT_ROOT=path.resolve(process.env.LEDIFY_DOCUMENT_ROOT||storageRoot('documents'));
export const documentTokenHash=token=>createHash('sha256').update(token).digest('hex');
export async function documentArtifactService(document,context={},options={}) {
    const id=randomUUID(),token=randomBytes(32).toString('hex'),root=path.resolve(options.root||DOCUMENT_ROOT),directory=path.join(root,id);
    if(path.dirname(directory)!==root)throw new Error('Document artifact directory escaped its root.');
    try {
        const buffer=await measureStage('docx-render',()=>(options.render||renderDocumentDocx)(document,context));
        const style=documentStyle(document,context);
        const validation=await measureStage('docx-validation',()=>validateDocxArtifact(buffer,document));
        const preview=await measureStage('document-preview',()=>renderDocumentPreview(document,context));
        await fs.mkdir(directory,{recursive:true});
        await fs.writeFile(path.join(directory,'document.docx'),buffer,{flag:'wx'});
        await fs.writeFile(path.join(directory,'preview.html'),preview,{flag:'wx'});
        await fs.writeFile(path.join(directory,'metadata.json'),JSON.stringify({id,tokenHash:documentTokenHash(token),title:document.title,createdAt:new Date().toISOString(),format:'docx'}),{flag:'wx'});
        return {id,documentId:id,outputType:'document',format:'docx',status:document.warnings?.length?'completed_with_warnings':'completed',previewUrl:`/api/documents/${id}/${token}/preview`,downloadUrl:`/api/documents/${id}/${token}/download`,validation,formatting:{fontFamily:style.font,fontSize:style.size,paperSize:style.paper,lineSpacing:style.lineSpacing,marginInches:style.margin/1440,coverPage:style.cover}};
    } catch(error) {
        await fs.rm(directory,{recursive:true,force:true}).catch(()=>{});
        if(error.code?.startsWith('DOCUMENT_')||error.code?.startsWith('INVALID_'))throw error;
        throw Object.assign(new Error('Unable to create the Word document.'),{code:'DOCUMENT_RENDER_FAILED',stage:'document-rendering',cause:error});
    }
}
