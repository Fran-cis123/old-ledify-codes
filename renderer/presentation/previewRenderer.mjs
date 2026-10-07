import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

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
// Responsibility:
//
// Generates browser-displayable preview images for a
// renderer-ready Ledify presentation.
//
// Pipeline:
//
// renderer-ready presentation
//          ↓
// temporary .pptx
//          ↓
// LibreOffice
//          ↓
// temporary .pdf
//          ↓
// pdf-to-img
//          ↓
// PNG preview images
//
// This renderer does NOT return the PowerPoint download.
//
// It prepares the slide images used by the preview layer.
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
        !Array.isArray(
            presentation.slides
        ) ||
        presentation.slides.length === 0
    ) {

        throw new Error(
            "Presentation must contain at least one slide for preview generation"
        );

    }


    // =====================================================
    // 2. RESOLVE PREVIEW ROOT DIRECTORY
    // =====================================================
    //
    // By default:
    //
    // <project>/generated/previews/
    //
    // The caller may provide another directory:
    //
    // previewRenderer(presentation, {
    //     outputDirectory: "..."
    // });
    //
    // =====================================================

    const previewRootDirectory =
        options.outputDirectory
            ? path.resolve(
                options.outputDirectory
            )
            : path.resolve(
                process.cwd(),
                "generated",
                "previews"
            );


    await fs.mkdir(
        previewRootDirectory,
        {
            recursive: true
        }
    );


    // =====================================================
    // 3. CREATE UNIQUE PREVIEW ID
    // =====================================================
    //
    // Every preview gets its own directory.
    //
    // This prevents two users generating presentations at
    // the same time from overwriting each other's files.
    //
    // Example:
    //
    // generated/previews/
    //     6c10.../
    //         presentation.pptx
    //         presentation.pdf
    //         slides/
    //
    // =====================================================

    const previewId =
        crypto.randomUUID();


    const previewDirectory =
        path.join(
            previewRootDirectory,
            previewId
        );


    const slidesDirectory =
        path.join(
            previewDirectory,
            "slides"
        );


    await fs.mkdir(
        slidesDirectory,
        {
            recursive: true
        }
    );


    // =====================================================
    // 4. BUILD TEMPORARY FILE PATHS
    // =====================================================

    const pptxPath =
        path.join(
            previewDirectory,
            "presentation.pptx"
        );


    const pdfPath =
        path.join(
            previewDirectory,
            "presentation.pdf"
        );


    // =====================================================
    // 5. CREATE PPTX
    // =====================================================

    let pptxResult;


    try {

        pptxResult =
            await writePresentationFile(
                presentation,
                pptxPath
            );

    } catch (error) {

        throw new Error(
            `Failed to create PowerPoint for preview: ${error.message}`
        );

    }


    // =====================================================
    // 6. CONVERT PPTX TO PDF
    // =====================================================

    let pdfResult;


    try {

        pdfResult =
            await convertPptxToPdf({
                pptxPath:
                    pptxResult.filePath,

                pdfPath,

                workingDirectory:
                    previewDirectory
            });

    } catch (error) {

        throw new Error(
            `Failed to convert preview PowerPoint to PDF: ${error.message}`
        );

    }


    // =====================================================
    // 7. CONVERT PDF TO PNG IMAGES
    // =====================================================

    let previewImages;


    try {

        previewImages =
            await convertPdfToImages({
                pdfPath:
                    pdfResult.pdfPath,

                outputDirectory:
                    slidesDirectory
            });

    } catch (error) {

        throw new Error(
            `Failed to create slide preview images: ${error.message}`
        );

    }


    // =====================================================
    // 8. VERIFY SLIDE COUNT
    // =====================================================
    //
    // Normally:
    //
    // presentation slide count
    //          ===
    // generated preview image count
    //
    // If these differ, something happened during rendering
    // or conversion and the frontend should not receive a
    // silently incomplete preview.
    //
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
    //
    // IMPORTANT:
    //
    // filePath is an internal server filesystem path.
    //
    // We do NOT want the frontend depending directly on
    // C:\Users\...\generated\...
    //
    // Later, the preview route will expose these images
    // through HTTP URLs.
    //
    // For now we preserve filePath internally so the
    // service/controller layer can locate the files.
    //
    // =====================================================

    const slides =
        previewImages.map(
            (image, index) => {

                const sourceSlide =
                    presentation.slides[index];


                return {

                    slideNumber:
                        image.slideNumber,

                    slideType:
                        sourceSlide.slideType,

                    layoutId:
                        sourceSlide.layoutId,

                    title:
                        sourceSlide.title || "",

                    fileName:
                        image.fileName,

                    filePath:
                        image.filePath

                };

            }
        );


    // =====================================================
    // 10. RETURN PREVIEW RESULT
    // =====================================================

    return {

        previewId,

        title:
            pptxResult.title,

        slideCount:
            slides.length,

        slides,


        // -------------------------------------------------
        // INTERNAL PATHS
        // -------------------------------------------------
        //
        // These are useful to the backend but should not
        // ultimately be exposed directly to the frontend.
        //
        // -------------------------------------------------

        files: {

            previewDirectory,

            pptxPath:
                pptxResult.filePath,

            pdfPath:
                pdfResult.pdfPath,

            slidesDirectory

        }

    };

};