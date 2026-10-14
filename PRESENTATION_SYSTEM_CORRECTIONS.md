# Presentation quality and visual-system corrections

Implemented directly in `C:\Users\HP\Desktop\Ledify`, October 2026. This supersedes the earlier handover's description of visual instructions being displayed as slide text. Existing document and webpage functionality remains covered by regression tests.

## Confirmed defects and corrections

| Confirmed root cause | Correction |
| --- | --- |
| `visualContent.visual.description` was drawn as ordinary text; a search query never became an asset | A dedicated visual stage resolves local catalog assets, grounded structured diagrams, licensed photographs or authorized generated backgrounds. Instructions and queries are never displayed. Unresolved requirements receive an explicit text-layout fallback and warning. |
| The shared renderer omitted slide-level subtitles | A reserved subtitle band is rendered on content slides. Presentation title/subtitle are canonical for the title slide. Section-divider metadata is synchronized. Actual PPTX and PDF checks verify intended titles/subtitles. |
| Different layout IDs frequently executed the same grid | Horizontal processes now have directional connectors, vertical processes have stage rows, timelines have an axis, cards distinguish horizontal/grid arrangements, and relationship chains have horizontal/vertical compositions. Surrounding slides influence selection, including switching a chain after two horizontal processes. Explicit consistent comparison series remain supported. |
| Shape validation could accept superficial or inaccurate prose | A separate semantic review checks exact requested topic coverage, visible-body evidence, depth, relationships, factual qualifications, conclusion quality and clarity. Correctable slides receive targeted repairs and another review. Factual warnings are promoted to repairs; persistent substantive issues stop generation. |
| Repairs could change body text but leave a misleading subtitle | Metadata repairs now update titles/subtitles when a review identifies them. Title-slide metadata remains canonical. |
| Speaker notes, citations and runtime assets were being checked as visible slide prose | Canonical visible content is validated separately from optional notes, references and resolved assets. Notes cannot inflate visible word counts or trigger malformed-text checks on URLs/base64. |
| Complex nested coverage constraints caused Gemini HTTP 400 | Provider schemas use standard lowercase JSON Schema types and compact, bounded coverage structures. Exact topic mapping is enforced locally and stated explicitly in prompts. |
| PDF.js/native canvas workers could crash during cleanup | Diagnostic PDF.js rasterization runs in a separate process, with bounded lifetime. |
| Some PDF.js PNG previews clipped text even though the PDF/PPTX text and geometry were correct | **Poppler `pdftoppm` is the default preview renderer.** The defect was reproduced against the same PDF and confirmed by comparison with Poppler. Final PNGs were checked against actual PDF word locations. |
| API output duplicated content and exposed local paths | Response v2 returns generated content once under `data.result.generatedContent`, projects private paths/image payloads out recursively, preserves safe filenames and API URLs, and derives messages/status from warnings and completed stages. Explicit v1 compatibility is documented below. |

## Production flow

```text
Request/extraction → outline + required-topic map → canonical slide content
→ semantic review → bounded slide/metadata repair → optional notes + supplied references
→ layout selection → theme/tokens → visual resolution + readability processing
→ PPTX → actual PPTX structure checks → LibreOffice PDF → Poppler PNGs
→ status, quality report, warnings and public artifact URLs
```

Webpage generation remains on its separate renderer and ZIP pipeline. Document generation retains its established content contract.

Each AI stage has bounded retries through the shared helper. Semantic review allows at most two repair rounds and regenerates only affected slides. A title alone is not evidence that a requested topic is covered. Review evidence must be an exact excerpt of visible body content on a real slide. The original cardiovascular prompt is preserved verbatim in regression fixtures. Explicit `context.requiredTopics` supports requests whose topic lists cannot be extracted by the conservative prose parser.

Review is an additional quality control, not a certified universal fact checker. Supplied source material and reference notes remain important. Generated diagram edges are checked structurally; the planner must provide exact approved-content evidence for every node and connection. This does not mathematically prove the semantic correctness of a paraphrase.

## Visual resolution and provenance

`Service/visual/presentationVisuals.mjs` resolves real assets before rendering. It derives a scientific, technical, educational or editorial visual family using the topic, purpose, audience and existing theme. Explicit registered themes can be used across strategies; strategy catalogs provide recommendations rather than forbidding a user's valid choice.

- Original local SVG theme artwork supports restrained backgrounds, subtle textures and cover illustrations. Full-slide raster assets are 1920 × 1080. Dense charts/tables retain clean backgrounds.
- A domain catalog contains original, referenced heart chamber and valve **schematics**. Domain terminology lives in the catalog and test fixtures, not the general coverage/layout engine. These are accurate alternatives to detailed anatomical images, with explicit simplification warnings.
- Canonical processes and relationships produce native editable visual flows. Text-visual content can carry a structured diagram. Additional diagrams can be planned from approved content, with at most three planner calls per deck and two attempts per plan. Plans use 2–4 readable nodes and require evidence quotes for nodes/edges.
- Pexels search is enabled only when `PEXELS_API_KEY` is configured. Raster downloads reuse the public-address/DNS-pinning/redirect safeguards, enforce timeout/size/type/dimension limits, and retain creator, source, license, original URL, asset ID and attribution metadata.
- Gemini image generation requires **all three** of `GEMINI_API_KEY`, `PRESENTATION_ALLOW_IMAGE_GENERATION=true` and an explicit `PRESENTATION_IMAGE_MODEL`. It is used for conceptual decorative backgrounds, not fabricated scientific evidence or photographs of actual products/events. No paid image API was called during these regressions.
- Background resolution tries configured licensed search, then explicitly authorized generation, then original local artwork. Informative diagrams use semantic assets rather than decorative photo substitutions. Missing/unplaceable visuals retain their requirement and produce warnings; they cannot be silently marked complete.

Pexels API documentation and licensing were reviewed: [API documentation](https://www.pexels.com/api/documentation/), [license](https://www.pexels.com/license/). The implementation includes attribution even where the general license does not require it, and retains API provenance. Generated image use remains subject to the configured provider/account's terms: [Gemini terms](https://ai.google.dev/gemini-api/terms), [image API documentation](https://ai.google.dev/gemini-api/docs/generate-content/image-generation). Review deployment/provider terms for the actual product and region; no arbitrary image scraping is implemented.

Full-slide photos require at least 1920 × 1080 genuine source pixels, preserve aspect ratio with cover cropping and support a bounded focal point. Undersized photos are rejected rather than upscaled. A theme-colored overlay is baked into the final PNG. The contrast check evaluates **every composited pixel** against primary and secondary text colors, targeting at least 4.5:1. Foreground photos use contain sizing and meaningful image alt text. Diagrams use editable labels/connectors and carry a descriptive note; original SVG/PNG assets and provenance remain in the local visual cache. Required attribution is included in PPTX notes and result metadata.

Cache assets are content-addressed under `generated/visual-assets`; reusable provider results have a seven-day cache window. Downloads/planner calls are bounded, and foreground photo requests are capped at two per deck. There is no global storage-retention job or cache-size quota yet.

## Configuration and runtime requirements

The existing Gemini outline/slide model overrides remain. Optional overrides: `GEMINI_REVIEW_MODEL`, `GEMINI_DIAGRAM_MODEL`, and the image configuration above. Do not put provider keys in requests or generated files.

PDF conversion still requires LibreOffice. PNG previews now require Poppler `pdftoppm` on PATH, or `PDFTOPPM_PATH` set to its executable. Both are available on this device. Without Poppler the pipeline preserves the PPTX/PDF and reports a PNG-stage failure; it does not silently switch to the renderer known to clip these samples. `LEDIFY_PDF_ENGINE=pdfjs` is an explicit diagnostic alternative, isolated in a child process; its output needs visual validation.

`@napi-rs/canvas` was already installed transitively and is now an explicit pinned dependency for asset processing. No browser, image service or Python package is required to open the generated PPTX/PDF. Python/pdfplumber/Pillow are only used by the engineering review script.

## API v2 and compatibility

Existing endpoints/inputs remain:

- `POST /api/generate/textPrompt`: `textPrompt`, `outputType`, optional `context`/`slideCount`.
- `POST /api/generate/urlPrompt`: `urlPrompt`, same output/context fields.
- `POST /api/generate/file`: multipart `file`, `outputType`, optional serialized `context`/`slideCount`.

Successful HTTP responses retain `{message, data: {request, result}}` and HTTP 201. `data.responseVersion` and `X-Ledify-Response-Version` identify the projection. In **v2 (default)**, `request` contains request identity/type/status/timestamps; the complete content appears only in `result.generatedContent`. Existing consumers of `data.result.generatedContent` and `result.preview` retain those paths. Consumers of `request.generatedContent` must migrate or temporarily send `X-Ledify-Response-Version: 1`. V1 explicitly retains the duplicate content and returns a deprecation warning, while still removing private paths and image payloads.

The repository contains no separate frontend consumer to update. Do not publish an API update without communicating this versioned change to an external frontend.

Presentation result status is `completed`, `completed_with_warnings`, or `partial_success` when an export stage fails. Substantive unresolved content-review failures return an error instead of shipping a knowingly failed deck. Warnings carry stage, code, message and slide number where applicable. Database request status remains compatible with its existing completed/failed enum; inspect result/stage status for quality and partial exports.

All artifact URLs are **relative to the API base URL**:

- `result.preview.downloads.pptx` → `/api/presentations/<id>/download`
- `result.preview.downloads.pdf` → `/api/presentations/<id>/pdf`
- `result.preview.slides[n].url` → `/api/presentations/<id>/slides/<slideNumber>`

Internal services retain filesystem paths for conversion/testing; HTTP clients receive identifiers, safe filenames and URLs. The existing presentation artifact access policy remains UUID-based. Account-based authorization, rate limits, HTTPS, retention and asynchronous job orchestration remain deployment work; no user authentication system exists in this backend to attach an ownership check to.

Optional explanatory notes are enabled with `context.includeSpeakerNotes=true`. Supplied references use `context.references=[{title,url,slideNumbers?}]`; they are preserved in notes without invented citations. `context.referenceMaterials` provides factual review context. Notes are separated from visible content. LibreOffice PDF export is not claimed to preserve tagged image accessibility metadata; native diagrams remain readable/editable in PPTX, and their labels are visible in PDFs.

## Verification and deliverables

Five live Gemini regressions produced **28 slides**: the exact eight-slide cardiovascular request, plus five-slide business, technology, education and research decks. Approved AI content is saved separately, allowing renderer refinements without paying for another content generation. Semantic repair was exercised on actual technology and education overstatements, and renderer/visual refinements were followed by new exports.

**177/177 regression tests passed.** Tests cover coverage evidence, bounded repairs, canonical subtitles, distinct flow layouts, diagram structure, actual PPTX labels/media/notes, provider failures, photo dimensions/cropping/composited contrast, generation opt-in, API v1/v2 projection, and existing document/webpage/presentation contracts. A deterministic HTTP regression sends the exact cardiovascular prompt through the real generation/layout/theme/visual/PPTX/PDF/PNG pipeline with approved AI content and an in-memory persistence model, then downloads the real PPTX/PDF/PNG endpoints. Provider calls are separate live regressions; a production MongoDB write was not used for engineering tests.

`tests/reviewPresentationCorrections.py` checks actual PDFs and PNGs: slide counts, intended titles/subtitles, word overlaps, page bounds, minimum text size and visible pixel variation in PDF word locations. All **28 slides passed**. Contact sheets and detailed slides were visually reviewed; this review discovered the PNG clipping bug that structural JSON/PPTX checks had missed. The final exports use Poppler.

Commands:

```powershell
npm test
node tests/presentationQualitySamples.mjs --all
node tests/presentationQualitySamples.mjs --all --render-saved
node tests/presentationQualitySamples.mjs technology education --review-saved
node tests/inspectPresentationVisuals.mjs cardiovascular technology education
python tests/reviewPresentationCorrections.py
```

The sample command reuses completed outputs. `--fresh` deliberately makes new paid text-generation calls; `--review-saved` reviews/repairs saved content; `--render-saved` only renders saved content/plans. Add `--resolve-diagrams` to deliberately make bounded missing-diagram planner calls. Use an installed Python environment with pdfplumber/Pillow for the final command; this device uses the bundled Codex runtime.

Final files: `generated/presentation-corrections/<category>/presentation.pptx`, `presentation.pdf`, `contact-sheet.png`, `ai-content.json`, `result.json`. `manifest.json` lists exports; `rendered-verification.json` contains the 28-slide geometric/pixel checks. Generated artifacts, source data and private capabilities remain ignored by Git.

Remaining sample warnings are intentional and explicit: all decks use local artwork because no licensed-image provider or paid-image configuration was enabled; cardiovascular anatomical illustrations are labeled schematics. Technology slide 4, education slide 4 and research slide 3 retain complete readable text/comparison layouts because an extra illustration could not fit without crowding or removing content. Their unresolved visual requirements remain visible in warning metadata. These are **completed with warnings**, not claims of complete photographic/diagram fulfillment.

Scientific reference checks for the cardiovascular fixture and original catalog: [NHLBI blood flow/valves](https://www.nhlbi.nih.gov/health/heart/blood-flow), [NHLBI conduction/cycle](https://www.nhlbi.nih.gov/health/heart/heart-beats), [AHA resting heart rate](https://www.heart.org/en/healthy-living/exercise-and-physical-activity/fitness-basics/target-heart-rates), [cardiac output background](https://www.ncbi.nlm.nih.gov/books/NBK54473/), [papillary muscles/chordae](https://www.ncbi.nlm.nih.gov/books/NBK557802/). These sources support facts; their third-party illustrations were not copied.

No deployment, commit, push, external messaging or provider credential change was performed. Native Microsoft PowerPoint and every viewer/platform were not visually tested; outputs were validated as PPTX packages and rendered through LibreOffice/Poppler. Review factual and visual details in the intended presentation environment before high-stakes use.
