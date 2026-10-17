import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import express from "express";
import { downloadPresentation, downloadPresentationPdf, getPresentationSlide } from "../../controller/presentationAssetsController.mjs";
// This import order reproduced the native Path2D failure before worker isolation.
import { fileService } from "../../Service/fileService.mjs";
import { convertPdfToImages } from "../../renderer/converters/pdfToImages.mjs";
import { previewRenderer } from "../../renderer/presentation/previewRenderer.mjs";

import { renderLayout } from "../../renderer/presentation/layoutRegistry.mjs";
import { fixtures } from "../fixtures/presentationContent.mjs";

const fixtureDirectory = path.resolve("tests/preview/output/renderer-test/e7d16e44-043e-4d27-89ca-4246819959b6");
const fixture = path.join(fixtureDirectory, "presentation.pdf");
async function temp(t) {
    const directory = await fs.mkdtemp(path.join(os.tmpdir(), "ledify-test-"));
    t.after(() => fs.rm(directory, { recursive: true, force: true }));
    return directory;
}

test("PDF extraction then repeated multi-page rendering uses compatible canvas classes", async t => {
    const extracted = await fileService({ originalname: 'source.pdf', mimetype: "application/pdf", buffer: await fs.readFile(fixture) });
    assert.ok(extracted.length > 0);
    const directory = await temp(t);
    for (let run = 0; run < 2; run++) {
        const images = await convertPdfToImages({ pdfPath: fixture, outputDirectory: path.join(directory, String(run)) });
        assert.equal(images.length, 2);
        for (const [index, image] of images.entries()) {
            assert.equal(image.slideNumber, index + 1);
            const bytes = await fs.readFile(image.filePath);
            assert.equal(bytes.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
        }
    }
});

test("invalid PDF rejects with page diagnostics instead of hanging", async t => {
    const directory = await temp(t);
    const pdfPath = path.join(directory, "invalid.pdf");
    await fs.writeFile(pdfPath, "not a PDF");
    await assert.rejects(convertPdfToImages({ pdfPath, outputDirectory: path.join(directory, "slides") }), error => error.stage === "png" && error.pageNumber === 1);
});

test('missing Poppler automatically falls back to isolated PDF.js and produces real slide PNGs',async t=>{
    const previous=process.env.PDFTOPPM_PATH;
    const root=await temp(t);
    process.env.PDFTOPPM_PATH=path.join(root,'missing-pdftoppm');
    try{
        await fileService({originalname:'source.pdf',mimetype:'application/pdf',buffer:await fs.readFile(fixture)});
        const images=await convertPdfToImages({pdfPath:fixture,outputDirectory:path.join(root,'slides'),engine:'auto',timeoutMs:15000});
        assert.equal(images.length,2);
        for(const [index,image] of images.entries()){
            assert.equal(image.slideNumber,index+1);
            assert.equal((await fs.readFile(image.filePath)).subarray(0,8).toString('hex'),'89504e470d0a1a0a');
        }
        await assert.rejects(convertPdfToImages({pdfPath:fixture,outputDirectory:path.join(root,'strict'),engine:'poppler'}),error=>error.code==='PNG_RENDERER_UNAVAILABLE'&&error.cause.code==='ENOENT');
    }finally{if(previous===undefined)delete process.env.PDFTOPPM_PATH;else process.env.PDFTOPPM_PATH=previous;}
});

test("rendering timeout terminates the worker", async t => {
    await assert.rejects(convertPdfToImages({ pdfPath: fixture, outputDirectory: await temp(t), timeoutMs: 1 }), /timed out/);
});

const presentation = { title: "Fixture", slides: [{ slideType: "title", title: "Fixture" }] };
const writePresentationFile = async (_, filePath) => {
    await fs.writeFile(filePath, "fixture pptx");
    return { title: "Fixture", filePath };
};
const convertPptxToPdf = async ({ pdfPath }) => {
    await fs.writeFile(pdfPath, "fixture pdf");
    return { pdfPath };
};
for (const failure of ["pdf", "png", "count"]) {
    test(`${failure} failure preserves completed artifacts`, async t => {
        const directory = await temp(t);
        const result = await previewRenderer(presentation, {
            outputDirectory: directory,
            converters: {
                writePresentationFile,
                convertPptxToPdf: failure === "pdf" ? async () => { throw new Error("PDF fixture failure"); } : convertPptxToPdf,
                convertPdfToImages: failure === "png" ? async () => { throw new Error("PNG fixture failure"); } : async () => [{}, {}]
            }
        });
        assert.equal(result.status, "partial_success");
        assert.equal(result.stages.pptx, "completed");
        assert.equal(result.warnings[0].stage, failure === "pdf" ? "pdf" : "png");
        assert.equal(result.previewCount, 0);
        assert.ok((await fs.stat(result.files.pptxPath)).size);
        if (failure === "pdf") {
            assert.equal(result.files.pdfPath, null);
            assert.equal(result.previewUrl,null);
            assert.equal(result.stages.png, "skipped");
        } else {
            assert.ok((await fs.stat(result.files.pdfPath)).size);
            assert.equal(result.previewUrl,`/api/presentations/${result.previewId}/preview`);
        }
    });
}

test("PowerPoint failure remains fatal", async t => {
    await assert.rejects(previewRenderer(presentation, {
        outputDirectory: await temp(t),
        converters: { writePresentationFile: async () => { throw new Error("PPTX failure"); } }
    }), /Failed to create PowerPoint/);
});

test('PowerPoint preview failures preserve rendering stage slide field and original cause',async t=>{
    const cause=Object.assign(new Error('Readability failure'),{code:'PRESENTATION_CONTENT_TOO_DENSE',slideNumber:1,field:'title.title',maxCharacters:53});
    await assert.rejects(previewRenderer(presentation,{outputDirectory:await temp(t),converters:{writePresentationFile:async()=>{throw cause;}}}),error=>error.code==='PRESENTATION_CONTENT_TOO_DENSE'&&error.stage==='presentation-rendering'&&error.slideNumber===1&&error.field==='title.title'&&error.maxCharacters===53&&error.cause===cause);
});

test("title renders canonical subtitle and supporting text without internal label", () => {
    const texts = [];
    renderLayout({
        slide: { addText: text => texts.push(text), addShape() {} },
        slideData: { slideNumber: 1, layoutId: "title-centered", title: "Presentation", slideType: "title", content: { titleContent: { title: "Presentation", subtitle: "Canonical subtitle", supportingText: "Supporting text" } } },
        tokens: {}, pptx: { ShapeType: { line: "line", rect: "rect" } }
    });
    assert.ok(texts.includes("Canonical subtitle"));
    assert.ok(texts.includes("Supporting text"));
    assert.ok(!texts.some(text => /^title$/i.test(text)));
});

test("artifact routes download available files and reject invalid paths", async t => {
    const app = express();
    app.get("/:previewId/download", downloadPresentation);
    app.get("/:previewId/pdf", downloadPresentationPdf);
    app.get("/:previewId/slides/:slideNumber", getPresentationSlide);
    const server = app.listen(0, "127.0.0.1");
    await new Promise(resolve => server.once("listening", resolve));
    t.after(() => new Promise(resolve => server.close(resolve)));
    const base = `http://127.0.0.1:${server.address().port}`;
    const id = randomUUID();
    const directory = path.resolve("generated", "previews", id);
    await fs.mkdir(directory, { recursive: true });
    t.after(() => fs.rm(directory, { recursive: true, force: true }));
    await fs.copyFile(fixture, path.join(directory, "presentation.pdf"));
    await fs.copyFile(path.join(fixtureDirectory, "presentation.pptx"), path.join(directory, "presentation.pptx"));
    for (const [route, expectedType] of [["pdf", "application/pdf"], ["download", "application/vnd.openxmlformats-officedocument.presentationml.presentation"]]) {
        const response = await fetch(`${base}/${id}/${route}`);
        assert.equal(response.status, 200);
        assert.ok(response.headers.get("content-type").startsWith(expectedType));
        assert.ok((await response.arrayBuffer()).byteLength > 0);
    }
    // Missing artifacts must be 404; neither invalid IDs nor traversal can escape the root.
    assert.equal((await fetch(`${base}/invalid/pdf`)).status, 400);
    assert.equal((await fetch(`${base}/${id}/slides/0`)).status, 400);
    assert.equal((await fetch(`${base}/00000000-0000-4000-8000-000000000000/pdf`)).status, 404);
});

for (const [slideType, content, expected] of [
    ["focused-explanation", { textContent: { heading: "Explanation", body: "Canonical explanation body" } }, "Canonical explanation body"],
    ["summary", { summary: fixtures.summary }, fixtures.summary.points[0]],
    ["conclusion", { conclusion: fixtures.conclusion }, fixtures.conclusion.supportingPoints[0]]
]) {
    test(`${slideType} renders canonical content without internal labels`, () => {
        const texts = [];
        renderLayout({
            slide: { addText: text => texts.push(text), addShape() {} },
            slideData: { slideNumber: 1, layoutId: "focused-statement", title: "Visible title", slideType, content },
            tokens: {}, pptx: { ShapeType: { rect: "rect", line: "line" } }
        });
        assert.ok(texts.some(text => typeof text === "string" && text.includes(expected)));
        assert.ok(!texts.some(text => typeof text === "string" && text.toLowerCase() === slideType.replaceAll("-", " ")));
    });
}

test("split title renders canonical text without a slide type label", () => {
    const texts = [];
    renderLayout({
        slide: { addText: text => texts.push(text), addShape() {} },
        slideData: { slideNumber: 1, layoutId: "title-split", title: "Visible title", slideType: "title", content: { titleContent: { title: "Visible title", subtitle: "Split subtitle", supportingText: "Split supporting text" } } },
        tokens: {}, pptx: { ShapeType: { rect: "rect", line: "line" } }
    });
    assert.ok(texts.includes("Split subtitle"));
    assert.ok(texts.includes("Split supporting text"));
    assert.ok(!texts.some(text => /^title$/i.test(text)));
});
