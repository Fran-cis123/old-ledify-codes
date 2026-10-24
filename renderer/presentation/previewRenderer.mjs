
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import { presentationStorageRoot } from '../../Service/presentationStorage.mjs';
import { validateRenderedPptx } from './renderedOutputValidation.mjs';
import { validatePreviewImages } from './previewValidation.mjs';
import { presentationRenderQueue } from './renderQueue.mjs';
import {validatePhotoPreviews} from './photoQuality.mjs';
import {measureStage} from '../../Service/performance.mjs';

import {
    writePresentationFile
} from "./pptxRenderer.mjs";

import {
    convertPptxToPdf
} from "../converters/pptxToPdf.mjs";

import {
    convertPdfToImages
} from "../converters/pdfToImages.mjs";


// =========================================================
// PRESENTATION PREVIEW RENDERER
// =========================================================
//
// Pipeline:
//
// Renderer-ready presentation
//          ↓
// PowerPoint (.pptx)
//          ↓
// LibreOffice
//          ↓
// PDF (.pdf)
//          ↓
// PDF-to-IMG
//          ↓
// PNG preview images
//
// =========================================================

export const previewRenderer=async(presentation,options={})=>{
    const release=await measureStage('render-queue',()=>presentationRenderQueue.acquire());
    try{return await renderPreview(presentation,options);}finally{release();}
};
const renderPreview = async (
    presentation,
    options = {}
) => {

    // =====================================================
    // 1. VALIDATE PRESENTATION
    // =====================================================

    if (
        !presentation ||
        typeof presentation !== "object"
    ) {
        throw new Error(
            "Presentation is required for preview generation"
        );
    }

    if (
        !Array.isArray(presentation.slides) ||
        presentation.slides.length === 0
    ) {
        throw new Error(
            "Presentation must contain at least one slide for preview generation"
        );
    }


    // =====================================================
    // 2. RESOLVE PREVIEW ROOT DIRECTORY
    // =====================================================

    const previewRootDirectory = presentationStorageRoot(options.outputDirectory);

    await fs.mkdir(
        previewRootDirectory,
        { recursive: true }
    );


    // =====================================================
    // 3. CREATE UNIQUE PREVIEW DIRECTORY
    // =====================================================

    const previewId = crypto.randomUUID();

    const previewDirectory = path.join(
        previewRootDirectory,
        previewId
    );

    const slidesDirectory = path.join(
        previewDirectory,
        "slides"
    );

    await fs.mkdir(
        slidesDirectory,
        { recursive: true }
    );


    // =====================================================
    // 4. BUILD FILE PATHS
    // =====================================================

    const pptxPath = path.join(
        previewDirectory,
        "presentation.pptx"
    );

    const pdfPath = path.join(
        previewDirectory,
        "presentation.pdf"
    );


    // =====================================================
    // 5. GENERATE POWERPOINT
    // =====================================================

    let pptxResult,outputQuality,previewQuality;
    const stages = { pptx: "pending", pdf: "pending", png: "pending" };
    const partialResult = (stage, error) => {
        stages[stage] = "failed";
        if (stage === "pdf") stages.png = "skipped";
        console.error(`[PREVIEW ${previewId}] ${stage} failed:`, error);
        return {
            previewId, title: pptxResult.title,
            status: "partial_success", stages,
            slideCount: presentation.slides.length, previewCount: 0, slides: [],
            previewUrl: stage === 'png' ? `/api/presentations/${previewId}/preview` : null,
            warnings: [{ stage, code: `${stage.toUpperCase()}_CONVERSION_FAILED`,
                message: stage === "pdf" ? "PowerPoint is available; PDF conversion failed." : "PowerPoint and PDF are available; slide previews failed.",
                ...(/^PNG_[A-Z_]+$/.test(error.code||'')?{reasonCode:error.code}:{}),
                ...(error.pageNumber ? { pageNumber: error.pageNumber } : {}) }],
            files: { previewDirectory, pptxPath: pptxResult.filePath,
                pdfPath: stage === "png" ? pdfResult.pdfPath : null, slidesDirectory },
            downloads: { pptx: `/api/presentations/${previewId}/download`,
                pdf: stage === "png" ? `/api/presentations/${previewId}/pdf` : null }
        };
    };

    try {

        pptxResult = await measureStage('pptx-render',()=>(options.converters?.writePresentationFile || writePresentationFile)(
            presentation,
            pptxPath
        ));

        if (
            !pptxResult ||
            typeof pptxResult.filePath !== "string"
        ) {
            throw new Error(
                "PowerPoint renderer did not return a valid file path"
            );
        }

        const pptxStats = await fs.stat(
            pptxResult.filePath
        );

        if (
            !pptxStats.isFile() ||
            pptxStats.size === 0
        ) {
            throw new Error(
                "Generated PowerPoint file is empty or invalid"
            );
        }

        if(!options.converters?.writePresentationFile) outputQuality=await measureStage('pptx-validation',()=>validateRenderedPptx(pptxResult.filePath,presentation));
        stages.pptx = "completed";
        await options.onArtifact?.({stage:'pptx',previewId,downloadUrl:`/api/presentations/${previewId}/download`});
    } catch (error) {

        throw Object.assign(new Error(
            `Failed to create PowerPoint for preview: ${error.message}`,
            { cause: error }
        ),{code:error.code||'PRESENTATION_RENDER_FAILED',stage:error.stage||'presentation-rendering',slideNumber:error.slideNumber,field:error.field,maxCharacters:error.maxCharacters});

    }


    // =====================================================
    // 6. CONVERT POWERPOINT TO PDF
    // =====================================================

    let pdfResult;

    try {

        pdfResult = await measureStage('pdf-conversion',()=>(options.converters?.convertPptxToPdf || convertPptxToPdf)({
            pptxPath: pptxResult.filePath,
            pdfPath,
            workingDirectory: previewDirectory
        }));

        if (
            !pdfResult ||
            typeof pdfResult.pdfPath !== "string"
        ) {
            throw new Error(
                "PDF converter did not return a valid PDF path"
            );
        }

        const pdfStats = await fs.stat(
            pdfResult.pdfPath
        );

        if (
            !pdfStats.isFile() ||
            pdfStats.size === 0
        ) {
            throw new Error(
                "Generated PDF file is empty or invalid"
            );
        }

        console.log(
            "[PREVIEW] PDF generated successfully"
        );
        stages.pdf = "completed";
        await options.onArtifact?.({stage:'pdf',previewId,downloadUrl:`/api/presentations/${previewId}/pdf`,previewUrl:`/api/presentations/${previewId}/preview`});

    } catch (error) {

        return partialResult("pdf", error);

    }


    // =====================================================
    // 7. CONVERT PDF TO PNG IMAGES
    // =====================================================

    let previewImages;

    try {

        previewImages = await measureStage('png-conversion',()=>(options.converters?.convertPdfToImages || convertPdfToImages)({
            pdfPath: pdfResult.pdfPath,
            outputDirectory: slidesDirectory
        }));

        if (
            !Array.isArray(previewImages) ||
            previewImages.length === 0
        ) {
            throw new Error(
                "PDF converter did not generate any preview images"
            );
        }

        console.log(
            `[PREVIEW] Generated ${previewImages.length} PNG images`
        );
        if (previewImages.length !== presentation.slides.length) {
            throw new Error(`Expected ${presentation.slides.length} previews, received ${previewImages.length}`);
        }
        if(!options.converters?.convertPdfToImages){
            previewQuality=await measureStage('png-validation',()=>validatePreviewImages(previewImages,presentation.slides.length));
            try{previewQuality.images=await measureStage('photo-validation',()=>validatePhotoPreviews(previewImages,presentation));}
            catch(error){
                // One bounded conversion repair. Do not regenerate or bill for new images.
                if(!['PNG_PHOTO_MISSING','PNG_PHOTO_RESOLUTION'].includes(error.code))throw error;
                previewImages=await measureStage('png-conversion-repair',()=>convertPdfToImages({pdfPath:pdfResult.pdfPath,outputDirectory:slidesDirectory}));
                previewQuality=await measureStage('png-validation',()=>validatePreviewImages(previewImages,presentation.slides.length));
                previewQuality.images=await measureStage('photo-validation',()=>validatePhotoPreviews(previewImages,presentation));
                previewQuality.imageRepairRounds=1;
            }
        }
        stages.png = "completed";

    } catch (error) {

        return partialResult("png", error);

    }


    // =====================================================
    // 8. VERIFY SLIDE COUNT
    // =====================================================

    if (
        previewImages.length !==
        presentation.slides.length
    ) {
        throw new Error(
            `Preview slide count mismatch. Expected ${presentation.slides.length} slide(s) but generated ${previewImages.length} preview image(s)`
        );
    }


    // =====================================================
    // 9. BUILD PREVIEW SLIDE METADATA
    // =====================================================

    const slides = previewImages.map(
        (image, index) => {

            const sourceSlide =
                presentation.slides[index];

            return {
                slideNumber: image.slideNumber,

                slideType: sourceSlide.slideType,

                layoutId: sourceSlide.layoutId,

                title: sourceSlide.title || "",

                fileName: image.fileName,
                url: `/api/presentations/${previewId}/slides/${image.slideNumber}`,

                filePath: image.filePath
            };

        }
    );


    // =====================================================
    // 10. RETURN PREVIEW RESULT
    // =====================================================

    return {
        previewId,
        status: "completed",
        quality:{pptx:outputQuality,preview:previewQuality},
        stages,
        warnings: [],
        previewCount: slides.length,
        previewUrl: `/api/presentations/${previewId}/preview`,
        downloads: { pptx: `/api/presentations/${previewId}/download`, pdf: `/api/presentations/${previewId}/pdf` },

        title: pptxResult.title,

        slideCount: slides.length,

        slides,

        files: {
            previewDirectory,

            pptxPath: pptxResult.filePath,

            pdfPath: pdfResult.pdfPath,

            slidesDirectory
        }
    };

};
