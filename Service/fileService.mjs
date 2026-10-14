import { PDFParse } from "pdf-parse";
import mammoth from "mammoth";
import { validateUploadedFile, uploadError } from './input/fileValidation.mjs';

export const fileService = async (file) => {

    if (!file) {
        throw new Error("No file was uploaded");
    }

    await validateUploadedFile(file);
    let extractedText;

    // PDF
    if (file.mimetype === "application/pdf") {

        const parser = new PDFParse({
            data: file.buffer
        });

        try {

            const result = await parser.getText();

            extractedText = result.text?.trim();

        } catch (error) {
            throw uploadError('Unable to read the PDF. Upload a valid, unencrypted PDF document.');
        } finally {

            await parser.destroy();

        }
    }

    // DOCX
    else if (
        file.mimetype ===
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ) {

        try {
            const result = await mammoth.extractRawText({buffer: file.buffer});
            extractedText = result.value?.trim();
        } catch { throw uploadError('Unable to extract text from the Word document.'); }
    }

    else {

        throw new Error(
            "Unsupported file type"
        );
    }

    if (!extractedText) {
        throw uploadError(
            "No readable text was found in the document. Scanned PDFs must be processed with OCR before uploading."
        );
    }

    return extractedText;
};
