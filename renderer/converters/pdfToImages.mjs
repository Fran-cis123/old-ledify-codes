import fs from "fs/promises";
import path from "path";

import {
    pdf
} from "pdf-to-img";


// =========================================================
// PDF TO IMAGES CONVERTER
// =========================================================
//
// Responsibility:
//
// Converts a PDF presentation into PNG preview images.
//
// Each PDF page represents one presentation slide.
//
// Example:
//
// presentation.pdf
//      ↓
// slide-1.png
// slide-2.png
// slide-3.png
//
// Returns:
//
// [
//     {
//         slideNumber: 1,
//         fileName: "slide-1.png",
//         filePath: "..."
//     },
//     ...
// ]
//
// =========================================================


export const convertPdfToImages = async ({
    pdfPath,
    outputDirectory
}) => {

    // =====================================================
    // 1. VALIDATE INPUT
    // =====================================================

    if (
        !pdfPath ||
        typeof pdfPath !== "string"
    ) {

        throw new Error(
            "PDF file path is required"
        );

    }


    if (
        !outputDirectory ||
        typeof outputDirectory !== "string"
    ) {

        throw new Error(
            "Preview output directory is required"
        );

    }


    // =====================================================
    // 2. VERIFY PDF EXISTS
    // =====================================================

    try {

        await fs.access(
            pdfPath
        );

    } catch {

        throw new Error(
            `PDF file does not exist: ${pdfPath}`
        );

    }


    // =====================================================
    // 3. CREATE OUTPUT DIRECTORY
    // =====================================================

    await fs.mkdir(
        outputDirectory,
        {
            recursive: true
        }
    );


    // =====================================================
    // 4. OPEN PDF
    // =====================================================
    //
    // scale controls preview resolution.
    //
    // A scale of 2 gives us a reasonably sharp browser
    // preview without creating unnecessarily huge images.
    //
    // =====================================================

    let document;


    try {

        document =
            await pdf(
                pdfPath,
                {
                    scale: 2
                }
            );

    } catch (error) {

        throw new Error(
            `Unable to open PDF for preview generation: ${error.message}`
        );

    }


    // =====================================================
    // 5. CONVERT EACH PAGE
    // =====================================================

    const previewImages = [];


    try {

        let slideNumber = 1;


        for await (
            const imageBuffer
            of document
        ) {

            const fileName =
                `slide-${slideNumber}.png`;


            const filePath =
                path.join(
                    outputDirectory,
                    fileName
                );


            // =============================================
            // WRITE PNG TO DISK
            // =============================================

            await fs.writeFile(
                filePath,
                imageBuffer
            );


            // =============================================
            // STORE PREVIEW METADATA
            // =============================================

            previewImages.push({

                slideNumber,

                fileName,

                filePath

            });


            slideNumber += 1;

        }

    } catch (error) {

        throw new Error(
            `Failed to convert PDF pages to preview images: ${error.message}`
        );

    } finally {

        // =================================================
        // 6. RELEASE PDF RESOURCES
        // =================================================
        //
        // Different pdf-to-img versions may expose cleanup
        // differently, so we only call destroy when the
        // returned document provides it.
        //
        // =================================================

        if (
            document &&
            typeof document.destroy === "function"
        ) {

            await document.destroy();

        }

    }


    // =====================================================
    // 7. VERIFY IMAGES WERE GENERATED
    // =====================================================

    if (
        previewImages.length === 0
    ) {

        throw new Error(
            "PDF conversion produced no preview images"
        );

    }


    // =====================================================
    // 8. RETURN PREVIEW IMAGES
    // =====================================================

    return previewImages;

};