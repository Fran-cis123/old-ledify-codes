import path from "node:path";
import fs from "node:fs/promises";

const PREVIEW_ROOT = path.resolve(process.cwd(), "generated", "previews");
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function resolvePreviewDirectory(previewId) {
    if (!UUID_PATTERN.test(previewId)) return null;
    return path.join(PREVIEW_ROOT, previewId);
}

async function sendExistingFile(res, filePath, contentType, downloadName = null) {
    try {
        const stat = await fs.stat(filePath);
        if (!stat.isFile()) return res.status(404).json({ message: "File not found" });
    } catch (error) {
        if (error.code === "ENOENT") return res.status(404).json({ message: "File not found" });
        console.error("Presentation file lookup failed:", error);
        return res.status(500).json({ message: "Unable to access presentation file" });
    }

    res.type(contentType);
    res.set("Cache-Control", "private, no-store");
    if (downloadName) res.attachment(downloadName);
    return res.sendFile(filePath, (error) => {
        if (error && !res.headersSent) {
            console.error("Presentation file delivery failed:", error);
            res.status(500).json({ message: "Unable to send presentation file" });
        }
    });
}

export async function getPresentationSlide(req, res) {
    const directory = resolvePreviewDirectory(req.params.previewId);
    const number = Number(req.params.slideNumber);
    if (!directory || !Number.isSafeInteger(number) || number < 1) {
        return res.status(400).json({ message: "Invalid preview or slide number" });
    }
    const imagePath = path.join(directory, "slides", `slide-${number}.png`);
    return sendExistingFile(res, imagePath, "image/png");
}

export async function downloadPresentation(req, res) {
    const directory = resolvePreviewDirectory(req.params.previewId);
    if (!directory) return res.status(400).json({ message: "Invalid preview ID" });
    const pptxPath = path.join(directory, "presentation.pptx");
    return sendExistingFile(res, pptxPath, "application/vnd.openxmlformats-officedocument.presentationml.presentation", "presentation.pptx");
}

export async function downloadPresentationPdf(req, res) {
    const directory = resolvePreviewDirectory(req.params.previewId);
    if (!directory) return res.status(400).json({ message: "Invalid preview ID" });
    return sendExistingFile(res, path.join(directory, "presentation.pdf"), "application/pdf", "presentation.pdf");
}
