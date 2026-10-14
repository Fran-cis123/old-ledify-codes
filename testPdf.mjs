
import fs from "node:fs/promises";
import path from "node:path";

import { convertPptxToPdf } from "./renderer/converters/pptxToPdf.mjs";
import { convertPdfToImages } from "./renderer/converters/pdfToImages.mjs";

// Existing presentation generated through Postman
const previewId = "b834be08-e426-4bd3-80d2-d271f82d4ddb";

const pptxPath = path.resolve(
    "generated",
    "previews",
    previewId,
    "presentation.pptx"
);

// Fresh output directory for this test
const workingDirectory = path.resolve(
    "test-pipeline-output-2"
);

const pdfPath = path.join(
    workingDirectory,
    "presentation.pdf"
);

const slidesDirectory = path.join(
    workingDirectory,
    "slides"
);

try {

    await fs.mkdir(workingDirectory, {
        recursive: true
    });

    console.log("\n===== FULL PIPELINE TEST =====");

    console.log("Starting PPTX to PDF conversion...");

    const pdfResult = await convertPptxToPdf({
        pptxPath,
        pdfPath,
        workingDirectory
    });

    console.log("PDF generated:", pdfResult.pdfPath);

    console.log("Starting PDF to PNG conversion...");

    const images = await convertPdfToImages({
        pdfPath: pdfResult.pdfPath,
        outputDirectory: slidesDirectory
    });

    console.log("\n===== TEST RESULT =====");
    console.log("Conversion successful!");
    console.log("Total slides:", images.length);
    console.log("Images saved to:", slidesDirectory);

} catch (error) {

    console.error("\n===== PIPELINE FAILED =====");
    console.error(error.stack || error.message);

}
