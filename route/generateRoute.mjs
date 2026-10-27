import express from 'express';

import { createGenerationHandlers } from '../controller/generateController.mjs';

import upload from '../middleWares/uploadMiddlewares.mjs';

import { getPresentationSlide, downloadPresentation, downloadPresentationPdf, previewPresentationPdf } from '../controller/presentationAssetsController.mjs';

import { webpageAssetHandlers } from '../controller/webpageAssetsController.mjs';

import { UPLOAD_FORMAT_MESSAGE } from '../Service/input/fileValidation.mjs';

import { documentDownloadHandler, documentPreviewHandler,documentPdfHandler } from '../controller/documentAssetsController.mjs';
import {documentImageInventory} from '../Service/visual/inputImageAssets.mjs';
import {generationJobs} from '../Service/generationJobs.mjs';
import {generateService} from '../Service/generateService.mjs';
import generateModel from '../model/generateModel.mjs';
import {addPresentationPublicUrls} from '../Service/presentationPublicUrls.mjs';

export function createGenerationRouter(options = {}) {

    const router = express.Router();

    const handlers = createGenerationHandlers(options);
    const jobs=()=>generationJobs({generator:options.generator||generateService,model:options.model||generateModel,root:options.jobRoot});
    router.get('/generation-jobs/:id/:token',async(req,res)=>{
        try{const job=await jobs().read(req.params.id,req.params.token);if(job.result)job.result=addPresentationPublicUrls(job.result,req);res.set('Cache-Control','no-store');if(['queued','processing'].includes(job.status))res.set('Retry-After','2');res.json({data:job});}
        catch(error){res.status(error.status||500).json({message:error.status===404?'Job not found':'Unable to read generation job'});}
    });
    router.post('/generation-jobs/:id/:token/retry',async(req,res)=>{
        try{res.status(202).json({data:await jobs().retry(req.params.id,req.params.token)});}
        catch(error){res.status(error.status||500).json({message:error.status===404?'Job not found':error.message});}
    });
    // Recover accepted unfinished work when the API starts, without waiting for
    // a frontend poll to trigger recovery. One worker per persisted queue.
    if(!options.generator)jobs().initialize().catch(error=>console.error('[JOBS]',error.code||'JOB_STORAGE_UNAVAILABLE'));

    router.post('/generate',upload.single('file'),handlers.userCombined);

    router.post('/generate/textPrompt', handlers.userText);

    router.post('/generate/urlPrompt', handlers.userUrl);

    router.post('/generate/file', upload.single('file'), handlers.userFile);
    router.post('/presentations/source-images',upload.single('file'),async(req,res,next)=>{
        try{res.json(await documentImageInventory(req.file));}catch(error){next(error);}
    });

    router.get('/documents/:id/:token/download',documentDownloadHandler(options.documentRoot));

    router.get('/documents/:id/:token/preview',documentPreviewHandler(options.documentRoot));
    router.get('/documents/:id/:token/pdf',documentPdfHandler(options.documentRoot));

    router.get('/presentations/:previewId/slides/:slideNumber', getPresentationSlide);

    router.get('/presentations/:previewId/download', downloadPresentation);

    router.get('/presentations/:previewId/pdf', downloadPresentationPdf);
    router.get('/presentations/:previewId/preview', previewPresentationPdf);

    const assets = webpageAssetHandlers(options.webpageRoot);

    router.get('/webpages/:id/:token/preview', assets.preview);

    router.get('/webpages/:id/:token/:asset', (req,res,next) => req.params.asset === 'download' ? assets.download(req,res,next) : assets.viewerAsset(req,res,next));

    router.get('/webpages/:id/:token/site/*file', assets.site);

    router.use((error,req,res,next) => {
        if (res.headersSent) return next(error);
        if (error.code === 'UNSUPPORTED_FILE_FORMAT') return res.status(415).json({ message: 'Unsupported file format', error: UPLOAD_FORMAT_MESSAGE, errorCode: error.code });
        if(error.code==='INVALID_VISUAL_ASSET')return res.status(400).json({message:error.message,errorCode:error.code});

        if (!error.code?.startsWith('LIMIT_') && error.code !== 'INVALID_UPLOADED_FILE') {
            return res.status(500).json({ message: 'Unable to deliver the requested artifact', errorCode: 'ARTIFACT_DELIVERY_FAILED' });
        }

        const tooLarge = error.code === 'LIMIT_FILE_SIZE';

        res.status(tooLarge ? 413 : 400).json({ message: tooLarge ? 'Upload must be no larger than 50 MB' : 'Invalid file upload', error: tooLarge ? 'The maximum upload size is 50 MB.' : error.code === 'INVALID_UPLOADED_FILE' ? error.message : 'Upload one PDF (.pdf) or Word (.docx) file in the file field.', errorCode: tooLarge ? 'UPLOAD_TOO_LARGE' : 'INVALID_UPLOADED_FILE' });
    });

    return router;
}

export default createGenerationRouter();
