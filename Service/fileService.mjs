import { PDFParse } from "pdf-parse";
import mammoth from "mammoth";

export const fileService = async (file) => {

    if (!file) {
        throw new Error("No file was uploaded");
    }

    let extractedText;

    // PDF
    if (file.mimetype === "application/pdf") {

        const parser = new PDFParse({
            data: file.buffer
        });

        try {

            const result = await parser.getText();

            extractedText = result.text?.trim();

        } finally {

            await parser.destroy();

        }
    }

    // DOCX
    else if (
        file.mimetype ===
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ) {

        const result = await mammoth.extractRawText({
            buffer: file.buffer
        });

        extractedText = result.value?.trim();
    }

    // TXT
    else if (file.mimetype === "text/plain") {

        extractedText = file.buffer
            .toString("utf-8")
            .trim();
    }

    else {

        throw new Error(
            "Unsupported file type"
        );
    }

    if (!extractedText) {
        throw new Error(
            "No readable text was found in the document"
        );
    }

    return extractedText;
};