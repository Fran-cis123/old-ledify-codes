# Professional document generation

Ledify generates editable Word `.docx` files and a protected HTML preview from ordinary text prompts, uploaded PDF/DOCX sources, and public webpage URLs. The document pipeline has no PDF export, PDF download, or production PDF conversion. The engineering sample inspection script uses LibreOffice and the packaged Documents renderer privately to inspect page images; those intermediates are not API artifacts.

## Verified result

The full regression suite passed **192/192 tests**. Five real Gemini sample documents were opened through LibreOffice and rendered for inspection: **31 pages** with no detected text outside page bounds. Code line breaks, compact-table pagination, narrow numeric columns, missing applicant information and overstatements found during inspection were corrected. Source-based editorial corrections to the technical sample are recorded in `tests/refineDocumentSamples.mjs`.

| Sample | Body words | Inspected pages |
|---|---:|---:|
| Cardiovascular academic report | 1,602 | 7 |
| Digital learning business proposal | 1,510 | 7 |
| REST API technical guide | 1,429 | 6 |
| Internship application template | 230 | 1 |
| Renewable energy educational report | 3,699 | 10 |

The long report retained its complete content and reached the requested ten pages using a readable 11 pt, single-spaced layout, 0.75 inch margins and an integrated title. Long page-bounded reports use that compact default; explicit font, spacing, margins and cover-page preferences take priority. `artifacts.formatting` reports the actual selected layout. The live API still marks pagination as estimated; the sample's separate LibreOffice check is not a guarantee of identical Microsoft Word pagination.

## Audit and implementation

Previously, `document` returned one Gemini JSON response. It had no Word renderer, artifact validator, storage workflow or document download endpoint. The shared extractor also accepted TXT uploads, and ZIP magic alone was treated as DOCX validation.

- `Service/document/documentGeneration.mjs`: type/purpose/audience planning, explicit length policy, validated outline, section generation, bounded retries, consistency review and targeted repairs. Model override: `GEMINI_DOCUMENT_MODEL`; default `gemini-3.7-flash`. Uses the existing Gemini retry/usage logging service.
- `Service/document/documentSchema.mjs`: typed block variants for paragraphs, subheadings, lists, editable tables, code, quotations, authorized images, captions and breaks. Gemini receives a simpler schema without multiplied nested array bounds; local validation still enforces all bounds.
- `Service/document/documentValidation.mjs`: meaningful bodies, unique headings/IDs, requested topic mappings, rectangular tables, supplied citation and image IDs, exact source quotations, repeated prose and per-section word budgets.
- `renderer/document/docxRenderer.mjs`: pinned Node `docx` library, real Word Title/Heading styles, A4/Letter, readable typography, margins, widow and heading controls, editable tables, repeated table headers, numbering, monospaced code, embedded images with alternative text, captions, running headers/footers, page fields and landscape sections.
- `Service/document/documentArtifactService.mjs`: validates the actual package, persists DOCX, HTML preview and private metadata, and publishes an unpredictable document ID and capability preview/download URLs. Rendering/writing/validation failures do not return success.
- `renderer/document/documentPreview.mjs`: renders canonical paragraphs, headings, lists, tables, code, quotations, images and references as escaped, responsive HTML using the selected document typography. No model text is executed as markup.
- `controller/documentAssetsController.mjs`: validates ID/token, constant-time token-hash comparison, safe missing-file responses, DOCX MIME and attachment headers. There is no arbitrary filename parameter or document PDF route.
- `Service/aiService.mjs`, `Service/generateService.mjs`, `route/generateRoute.mjs`: integrate documents with the existing generation endpoints and response envelope. Existing presentation and webpage branches remain separate.
- `Service/publicGenerationResult.mjs`: strips image base64 and internal paths before HTTP responses.
- `src/app.mjs` and `src/server.mjs`: application construction is separate from database/listen startup so production middleware is testable. JSON bodies are bounded at 16 MB to accommodate authorized inline image assets; malformed JSON, oversized bodies and other parser errors produce sanitized JSON client errors.

`docx@9.6.1` is the only new application dependency for documents. JSZip, Cheerio, Mammoth and PDF extraction are reused. The application uses its own pinned package dependency; engineering render tools use the bundled runtime.

Other shared files changed for this work are `Service/fileService.mjs`, `Service/input/fileValidation.mjs`, `middleWares/uploadMiddlewares.mjs`, `controller/generateController.mjs`, `Service/ai/generateJsonWithRetry.mjs`, `Service/ai/responseValidation.mjs`, `Service/ai/sourceGrounding.mjs`, and `Service/ai/presentationPrompts.mjs`. `package.json` and `package-lock.json` pin the Word library. `AI_GENERATION.md` and `WEBPAGE_PIPELINE.md` now point to the current document/upload contract instead of advertising obsolete TXT source support.

## API

For a single composer accepting a prompt, PDF/DOCX, URL or any combination, use `POST /api/generate` with `outputType: "document"`. See `UNIFIED_GENERATION_API.md` for JSON/multipart fields and frontend integration. The legacy input-specific endpoints below remain available.

Existing POST endpoints remain `/api/generate/textPrompt`, `/api/generate/file`, and `/api/generate/urlPrompt`. Use `outputType: "document"`. Multipart requests put the upload in `file`; `context` can be a JSON string.

```json
{
  "outputType": "document",
  "textPrompt": "Create technical documentation explaining how a REST API works.",
  "context": {
    "wordCount": 1400,
    "requiredTopics": ["resources", "methods", "responses", "errors"],
    "documentFormatting": {
      "fontFamily": "Calibri", "fontSize": 11,
      "paperSize": "A4", "lineSpacing": 1.15, "marginInches": 1
    }
  }
}
```

The existing v2 `{ message, data: { responseVersion, request, result } }` envelope is preserved. `data.result` includes `outputType`, `status`, `documentId`, `previewUrl`, `downloadUrl`, `generatedContent`, `warnings`, and `artifacts`. The download URL is `/api/documents/<uuid>/<capability>/download`; the preview URL is `/api/documents/<uuid>/<capability>/preview`. Both URLs also appear under `artifacts`. Treat their shared capability as a private share credential. The explicit response-v1 header remains available, but the document content now uses `sections[].blocks` rather than the old unrendered `sections[].content` representation. No frontend application exists in this repository.

Open `data.result.previewUrl` against the backend origin in a browser or same-origin iframe. The preview route returns `text/html`, private/no-store caching, no-referrer protection and a restrictive content security policy that blocks scripts and remote assets. Cross-origin iframe embedding is blocked; a separate frontend origin can open the backend preview in a new tab with `rel="noopener noreferrer"`. The preview includes a relative link to the DOCX download. Invalid capabilities and missing artifacts return HTTP 404. Documents generated before this feature must be regenerated to create their HTML preview.

This is a continuous HTML content preview, not an exact rendering of Word pages. Fonts, cover layout, landscape sections and page breaks can appear differently in Word. The preview states that pagination may differ; downloadable output remains DOCX only.

For uploaded sources or URLs, `context.instructions` carries the requested transformation, and `context.requiredTopics` explicitly lists required coverage. Source content is treated as data rather than privileged instructions. Extraction itself stays shared across all output types.

## Length and formatting

Explicit `context.wordCount` or `context.pageCount` takes priority; common numeric and written page instructions are recognized. Supported operational limits are 100–15,000 words and 1–30 requested pages, with at most 40 sections and 1,000 target words per generated section. Requests beyond these limits fail clearly rather than being truncated. Unspecified length defaults depend on genre (letters 250 words, resumes 450, substantive reports 1,400). Section budgets vary by purpose; closing lines do not receive the same budget as the substantive body.

Page counts are estimates in production, never falsely certified. `generatedContent.length` records requested pages/words, target words, actual words, and `pageCountVerified: false`. Explicit page requests produce `DOCUMENT_PAGINATION_ESTIMATED`. Exact pagination depends on fonts, images, tables and the Word renderer. Samples are separately paginated and inspected with LibreOffice; Microsoft Word can paginate differently.

Formatting accepts Aptos, Calibri, Arial, Cambria, Georgia and Times New Roman; 10–16 pt body text; 1–2.5 line spacing; 0.5–1.5 inch margins; A4 or Letter. Common font/point/single/double-spacing instructions are recognized; structured `documentFormatting` provides the unambiguous contract. Headings use consistent styles. Letters suppress report headings and running headers/footers. Resumes retain section headings with a simple layout. Cover pages are optional for reports and have no displayed footer.

## References and images

`context.references` accepts supplied `{title, url, formattedText?, citationText?}` entries. URLs must be HTTPS. Citation IDs are assigned as `source-1`, `source-2`, etc. Model blocks may cite only those IDs. `formattedText` and `citationText` preserve supplied APA/MLA/Chicago/Harvard/IEEE formatting; missing bibliographic metadata is reported and falls back to explicit numeric labels rather than fabricated authors, dates or DOIs. Supplied URLs are not automatically fetched or independently verified. Academic/research requests without supplied references return `DOCUMENT_REFERENCES_NOT_SUPPLIED` and do not acquire an invented bibliography.

Authorized PNG/JPEG assets can be supplied as `context.documentImages: [{id, base64, alt, attribution?}]`. Up to ten images are supported, with bounded bytes/dimensions, aspect-ratio preservation and page-fit sizing. Only supplied asset IDs can appear in generated image blocks; no arbitrary filesystem paths or remote image downloads are accepted. Original diagrams can be supplied through the same contract. The engine does not invent anatomical drawings or insert random stock images. When there are no authorized images, it produces a clean text/table document. Base64 is removed from the HTTP projection.

These are composition assets, not accepted uploaded source files: the source request must still contain a text prompt, supported URL, PDF or DOCX. PNG checksums/chunk structure, JPEG end markers and bounded actual decoding are checked before AI generation; corrupt images cannot produce successful documents with broken media. JSON requests have a 16 MB total limit; multipart metadata fields have a 1 MB limit, independently of the 50 MB source-file limit.

## Upload requirements across all outputs

Only PDF (`.pdf`, `application/pdf`) and Word (`.docx`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document`) uploads are accepted. Extensions and MIME must agree. TXT, DOC, PPTX and image uploads are rejected with HTTP 415 and `UNSUPPORTED_FILE_FORMAT`. Invalid content uses HTTP 400 and `INVALID_UPLOADED_FILE`; file size above 50 MB uses HTTP 413. Multer errors are handled as client errors.

Multer checks metadata; the generation controller checks content before extraction, even with an injected extractor; `fileService` independently validates direct calls. PDFs require a signature and end marker and must be readable by PDFParse. DOCX files require valid ZIP structure, bounded package expansion, Word content types, a main-document relationship and Word body XML. Unrelated ZIP/PPTX packages, macros, traversal entries, missing Word parts and malformed/unreadable files fail. PDF/DOCX extraction errors do not become generic 500s. OCR is not included; image-only scanned PDFs require OCR before upload.

Frontend upload controls should use `accept=".pdf,.docx"`. This is a browser hint; backend validation is mandatory. Ordinary `textPrompt` inputs and text extracted from PDF/DOCX/URLs remain supported. Internal README/log/diagnostic `.txt` files and public URL `text/plain` extraction are intentionally retained.

## Recovery, validation and tests

Recoverable AI response errors have at most three attempts. Substantive review errors have at most two targeted repair rounds. A failed section does not regenerate the outline or earlier sections. Internal `onPlan`, `onCheckpoint`, `initialPlan`, and `initialSections` hooks permit controlled engineering recovery; these are not exposed as unvalidated HTTP request options. Metadata-only AI logs include field paths and usage, never raw source, generated paragraphs, credentials or provider messages.

Sections now draft in ordered concurrent batches (default three; server setting `LEDIFY_DOCUMENT_CONCURRENCY`, 1–6). Each batch shares the completed earlier sections and full outline; whole-document review remains mandatory in production. New API results include stage timings. See `GENERATION_PERFORMANCE.md` for scheduling behavior, measurement and limitations.

When no image assets are supplied, generation excludes image blocks and review recognizes concise code schematics, tables and prose as supported visual alternatives. Requested visuals produce `DOCUMENT_VISUALS_TEXT_ONLY`; automatic image generation is not implied. Code indentation/separators are allowed while degenerate prose remains rejected. Section failures include `sectionId` and `validationRule` diagnostics. See `DOCUMENT_REPAIR_FAILURE_FIX.md` for the live Wikipedia request verification and repair regression results.

Artifact validation checks ZIP CRCs, required parts, actual canonical text, heading styles, embedded image targets and package structure. Real Word tables and text remain editable. Automated HTTP tests generate, preview and download actual documents for prompts, PDF, DOCX and URL inputs, test unauthorized/missing previews and downloads and verify that there is no document PDF endpoint. The preview follow-up passed all 14 focused document tests, including HTML escaping, safe references, embedded images, canonical content and response headers. The 192-test full-suite result above predates that additional preview test.

Run `npm test`. Focused tests are `tests/regression/documents.test.mjs` and `tests/regression/uploads.test.mjs`. Existing AI, presentation, PDF/PNG and webpage regressions are retained. Most tests use mocked Gemini responses. Live samples use `tests/documentSamples.mjs` and reuse approved content and checkpoints to avoid unnecessary API calls. Engineering render inspection uses `tests/renderDocumentSamples.py` with the packaged Documents renderer. Samples are in `generated/document-samples/{academic,business,technical,letter,renewable}/document.docx`.

Named delivery copies are in `generated/document-samples/final/`. That folder contains only the five editable Word deliverables. Intermediate PDFs, page images and diagnostics stay in separate engineering directories. The renewable-energy sample's synchronous condenser explanation was corrected against [NREL's grid protection material](https://www.nrel.gov/grid/protection.html); verified reference metadata is retained without invented publication details.

Additional modified tests are `ai.test.mjs`, `presentation.test.mjs`, `quality.test.mjs` and `webpage.test.mjs`; old accepted-TXT fixtures were replaced with valid PDF/DOCX sources. `tests/fixtures/documentFixtures.mjs` and `tests/fixtures/uploadFiles.mjs` supply deterministic AI responses and genuine readable file packages. The schema-union approach follows [Google's structured output documentation](https://ai.google.dev/gemini-api/docs/structured-output). Technical editorial corrections were checked against [HTTP semantics](https://www.rfc-editor.org/rfc/rfc9110.html), [Problem Details](https://www.rfc-editor.org/rfc/rfc9457.html), [PATCH](https://www.rfc-editor.org/rfc/rfc5789.html), and [Fielding's REST architecture](https://ics.uci.edu/~fielding/pubs/dissertation/rest_arch_style.htm).

## Presentation failure report

The supplied FarmBridge AI logs establish schema-validation exhaustion but omit the failing fields, so they do not prove one exact root cause. The audit identified a reproducible conflict: the quantitative grounding guard prohibited invented chart numbers even when the user explicitly requested hypothetical projections. It now allows them only with explicit source permission and a visible illustrative/hypothetical qualification. Ordinary factual charts still require matching supplied numbers. Schema and retry diagnostics now retain field paths. A regression tests this policy without presenting invented financial values as real performance. A full live reproduction of that separate ten-slide deck is not implied by document sample testing.

## Limits

AI review is a guard against unsupported or incoherent content, not universal factual verification. Bibliographic details must be supplied; citation-style completeness is not inferred. Production pagination is estimated. Word itself was not automated; sample opening/layout was verified through package inspection and LibreOffice rendering. Queues, account authentication, expiration/retention policies and distributed storage remain deployment concerns. Capability URLs provide private artifact access, not account-level authorization. Generated files and private checkpoints should be subject to deployment retention rules.
