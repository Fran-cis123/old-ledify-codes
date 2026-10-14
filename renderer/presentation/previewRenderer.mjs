
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import { validateRenderedPptx } from './renderedOutputValidation.mjs';

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

export const previewRenderer = async (
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

    const previewRootDirectory =
        options.outputDirectory
            ? path.resolve(options.outputDirectory)
            : path.resolve(
                process.cwd(),
                "generated",
                "previews"
            );

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

    let pptxResult;
    const stages = { pptx: "pending", pdf: "pending", png: "pending" };
    const partialResult = (stage, error) => {
        stages[stage] = "failed";
        if (stage === "pdf") stages.png = "skipped";
        console.error(`[PREVIEW ${previewId}] ${stage} failed:`, error);
        return {
            previewId, title: pptxResult.title,
            status: "partial_success", stages,
            slideCount: presentation.slides.length, previewCount: 0, slides: [],
            warnings: [{ stage, code: `${stage.toUpperCase()}_CONVERSION_FAILED`,
                message: stage === "pdf" ? "PowerPoint is available; PDF conversion failed." : "PowerPoint and PDF are available; slide previews failed.",
                ...(error.pageNumber ? { pageNumber: error.pageNumber } : {}) }],
            files: { previewDirectory, pptxPath: pptxResult.filePath,
                pdfPath: stage === "png" ? pdfResult.pdfPath : null, slidesDirectory },
            downloads: { pptx: `/api/presentations/${previewId}/download`,
                pdf: stage === "png" ? `/api/presentations/${previewId}/pdf` : null }
        };
    };

    try {

        pptxResult = await (options.converters?.writePresentationFile || writePresentationFile)(
            presentation,
            pptxPath
        );

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

        if(!options.converters?.writePresentationFile) await validateRenderedPptx(pptxResult.filePath,presentation);
        stages.pptx = "completed";
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

        pdfResult = await (options.converters?.convertPptxToPdf || convertPptxToPdf)({
            pptxPath: pptxResult.filePath,
            pdfPath,
            workingDirectory: previewDirectory
        });

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

    } catch (error) {

        return partialResult("pdf", error);

    }


    // =====================================================
    // 7. CONVERT PDF TO PNG IMAGES
    // =====================================================

    let previewImages;

    try {

        previewImages = await (options.converters?.convertPdfToImages || convertPdfToImages)({
            pdfPath: pdfResult.pdfPath,
            outputDirectory: slidesDirectory
        });

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
        stages,
        warnings: [],
        previewCount: slides.length,
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
