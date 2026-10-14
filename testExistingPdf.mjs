import fs from "fs/promises";
import path from "path";

import {
    convertPdfToImages
} from "./renderer/converters/pdfToImages.mjs";

const previewRoot = path.resolve(
    "generated",
    "previews"
);

try {
    const directories = await fs.readdir(
        previewRoot,
        { withFileTypes: true }
    );

    const pdfFiles = [];

    for (const directory of directories) {
        if (!directory.isDirectory()) continue;

        const pdfPath = path.join(
            previewRoot,
            directory.name,
            "presentation.pdf"
        );

        try {
            const stats = await fs.stat(pdfPath);

            pdfFiles.push({
                pdfPath,
                modified: stats.mtimeMs
            });
        } catch {
            // This preview directory has no PDF.
        }
    }

    if (pdfFiles.length === 0) {
        throw new Error(
            "No existing presentation.pdf found in generated/previews"
        );
    }

    pdfFiles.sort(
        (a, b) => b.modified - a.modified
    );

    const latestPdf = pdfFiles[0].pdfPath;

    console.log("Testing PDF:", latestPdf);

    const images = await convertPdfToImages({
        pdfPath: latestPdf,
        outputDirectory: path.resolve(
            "test-existing-pdf-images"
        )
    });

    console.log(
        "Conversion successful:",
        images.length,
        "slides"
    );

} catch (error) {
    console.error(
        "Conversion failed:",
        error.stack || error
    );
}