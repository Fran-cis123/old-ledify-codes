import "dotenv/config";
import fs from "node:fs/promises";
import path from "node:path";
import { generateService } from "../Service/generateService.mjs";

const started = Date.now();
const scenarios = {
    education: "Explain the water cycle to secondary school students. No quantitative data or charts.",
    research: "Prepare a research proposal presentation titled Effects of sleep duration on student concentration. Only the title is supplied. No methods, sample sizes, results, measurements or citations have been supplied. Accurately identify missing evidence; do not invent any.",
    business: "Explain this supplied operational report to a manager: 12 support tickets were received; 8 were resolved and 4 remain open. Present the supplied figures faithfully and suggest next steps as recommendations, without inventing causes or performance metrics.",
    startup: "Pitch a proposed appointment-booking product for small salons. Only the concept is supplied. No customers, revenue, funding, market size or launch dates are known. Distinguish proposed value from proven results.",
    technical: "Explain database transactions and atomicity to junior developers. Use a clearly hypothetical money transfer example without invented benchmarks or citations."
};
const scenario = process.argv[2] || "education";
if (!scenarios[scenario]) throw new Error("Unknown smoke test scenario");
try {
    const result = await generateService("prompt",
        `Create exactly 3 slides: a title, a focused explanation, and a summary. ${scenarios[scenario]}`,
        "presentation");
    if (result.status !== "completed" || result.preview.previewCount !== 3) throw new Error("Live presentation did not complete all stages");
    const file = path.join(result.preview.files.previewDirectory, "generation.json");
    await fs.writeFile(file, JSON.stringify(result, null, 2));
    console.info("[LIVE RESULT]", JSON.stringify({ scenario, status: result.status, slides: result.preview.slideCount,
        previewId: result.preview.previewId, elapsedMs: Date.now() - started, savedResult: file }));
} catch (error) {
    console.error("[LIVE FAILURE]", JSON.stringify({ code: error.code, stage: error.stage,
        lastErrorCode: error.lastErrorCode, message: error.message }));
    process.exitCode = 1;
}
