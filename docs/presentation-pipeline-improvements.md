# Presentation pipeline improvements

The subsequent imagery extension is documented in [presentation-image-pipeline.md](presentation-image-pipeline.md), with five-topic rendered evidence in [presentation-image-test-results.md](presentation-image-test-results.md). It replaces the earlier two-photo/decorative-background provider path with budgeted per-slide imagery. The original redesign notes below describe that earlier implementation stage.

Implemented locally on 19 October 2026. The generation routes and v2 response envelope remain compatible. No new package was installed for this work.

## Planning and instruction adherence

`Service/ai/presentationPrompts.mjs` now explicitly asks the planner to choose a communication structure before writing prose: parallel architectures use comparison/categories, ordered work uses process, chronology uses timeline, conceptual/proposed evolution uses roadmap, relationships use diagrams, and conclusions synthesize implications. This is a general instruction, not a healthcare-specific template. Unsupported measurements and invented charts remain forbidden.

`Service/ai/presentationIntent.mjs` extracts explicit `Slide 3: …` / `Slide 6 should cover …` instructions, checks their approximate topic correspondence at the requested position, and records the visual treatment implied by canonical content. `aiService.mjs` rejects impossible positions before a provider call. Existing count policy remains 1–12 slides, with an 8–10 default including the cover/ending. The positional check uses Unicode tokens and a conservative lexical threshold; it complements semantic review rather than proving instruction compliance.

The clinical test exposed a broad assertion that legal liability stays with a human. `presentationQuality.mjs` now flags that pattern for the existing bounded repair stage, and the prompts distinguish operational review from jurisdiction-dependent liability. This is a targeted guard, not a comprehensive fact checker.

## Composition and rendering

`presentationLayoutService.mjs`, `presentationLayouts.mjs`, `layoutRegistry.mjs`, and `professionalLayouts.mjs` add/select three compatible compositions:

- `title-editorial`: large, high-contrast typography with room for a complete title and supporting context, without arbitrary rings.
- `explanation-editorial`: the exact first sentence forms the lead and the remaining sentences form supporting explanation. No paraphrase, invented headings, or claims are introduced. Other layouts remain candidates if fitting fails.
- `closing-synthesis`: a dominant message beside supporting implications, rather than only a long bullet list.

Existing layouts now have additional real behavior: horizontal timelines and phase roadmaps render labeled progression instead of generic cards; dense progressions use wider rows. Star relationships use orthogonal parent/child connections with real edge labels. `chart-with-insight` reserves a separate interpretation column. Nonnegative bar/column charts start at zero, avoiding misleading truncated bar lengths. Editable comparison, process, statistics, case-study, quote, table, chart and diagram capabilities remain available.

Header title and subtitle boxes no longer overlap. Visible body text stays at least 18 pt; normal text is generally 20–28 pt, main headings 34 pt, covers 44 pt, with 12 pt page markers and 17 pt captions. Existing theme families/palettes/fonts and explicit preferences remain authoritative. Colors are checked against actual flat surfaces by the renderer's contrast fallback. Figures are not fabricated to fill space.

## Images and diagrams

`Service/visual/presentationVisuals.mjs` no longer rasterizes unconditional cover rings, textures and decorative artwork. A missing optional image yields a plain readable composition plus a truthful warning. An unresolved extra illustration no longer replaces a working category/comparison/process layout. Duplicate downloaded photo hashes are not repeated as separate foreground imagery.

The existing optional Pexels integration remains enabled only with `PEXELS_API_KEY`. Paid background generation still requires all of `PRESENTATION_ALLOW_IMAGE_GENERATION=true`, `PRESENTATION_IMAGE_MODEL` and `GEMINI_API_KEY`; no provider account or model is assumed. Existing provenance, attribution, resolution/byte checks, image aspect fitting and speaker-note attribution remain in force. Metadata-based/provider relevance still requires review; this change does not add an independent vision model.

`nativeDiagram.mjs` reserves space between descriptions and edge annotations, renders previously omitted flow/cross-column labels, and uses native editable lines/text. `svgGraphics.mjs` validates unique edges, connected closed cycles, and acyclic flowcharts. The local factual catalog remains an explicitly simplified alternative to detailed scientific anatomy. A catalog may replace an inaccurate schematic; native geometry alone cannot establish scientific correctness.

## Safety and quality checks

`geometry.mjs` records the actual draw operations for both dry candidate rendering and final PPTX creation. It rejects invalid bounds, off-slide objects, critical text-box intersections and body sizes below the readability floor. Layout selection clears a stale input layout ID and accepts a candidate only after successful validation. The finite compatible candidate list is the local repair bound; no repeated paid model call is added by this stage.

`renderedOutputValidation.mjs` independently rechecks the serialized PPTX ZIP/XML for counts, titles/subtitles, text-box geometry, empty media, missing internal relationship targets and expected diagram labels. It records visible words and layout diversity. Search-query checks allow ordinary words already present in intended copy, preventing a valid laboratory photo slide from being rejected just because its query is `laboratory`.

`previewValidation.mjs` checks actual PNG signatures, widescreen dimensions, expected count and nonblank pixels. The additive `preview.quality` metadata reports technical results and explicitly states that aesthetics are not automatically certified. Conversion failure behavior remains partial-success with surviving downloads. No claim is made that these checks detect every glyph clipping, every graphical collision, misleading image, or weak aesthetic composition. The current post-render stage rejects technical failures; it does not autonomously rewrite content from PNG images.

## Performance and deployment

`renderQueue.mjs` bounds native rendering/conversion to one active deck per Node process by default, at most four waiting decks and a 90-second wait. `LEDIFY_RENDER_CONCURRENCY` can raise concurrency to two; larger values are capped. The controller returns HTTP 503, `PRESENTATION_RENDER_BUSY` and `Retry-After: 15` for overflow/timeouts. Slots are released on failure. This is a bounded in-memory conversion queue, not a durable background job queue, and waiting clients still need suitable HTTP timeouts.

Existing AI generation batching, three-attempt request limits, bounded quality rounds and optional notes remain unchanged. Removing automatic artwork avoids unnecessary asset decoding/rasterizing and full-frame contrast scans. It does not eliminate model/network latency. See the measured timings in the test report.

Use the existing Dockerfile on Render: it installs LibreOffice Impress/Writer, Poppler and fonts. For native deployment provide `LIBREOFFICE_PATH` and optionally `PDFTOPPM_PATH`; missing Poppler can use the existing isolated PDF.js fallback. `LEDIFY_PRESENTATION_ROOT` must point to a persistent mounted directory shared by generation and asset delivery to preserve artifacts across deployments/restarts. Without persistence old preview IDs can return 404. Horizontal replicas need shared artifact storage and their own concurrency planning. No Render deployment was performed by this task.

## Files changed for this task

- Planning/service: `Service/ai/presentationIntent.mjs` (new), `Service/ai/presentationPrompts.mjs`, `Service/ai/presentationQuality.mjs`, `Service/aiService.mjs`, `Service/presentationLayoutService.mjs`, `Service/visual/presentationVisuals.mjs`.
- Renderer: `renderer/presentation/geometry.mjs` (new), `previewValidation.mjs` (new), `renderQueue.mjs` (new), `professionalLayouts.mjs`, `layoutRegistry.mjs`, `previewRenderer.mjs`, `renderedOutputValidation.mjs`, `visuals/nativeDiagram.mjs`, `visuals/svgGraphics.mjs`.
- Contract/configuration: `templates/presentation/presentationLayouts.mjs`, `controller/generateController.mjs` (busy response only).
- Tests: `tests/fixtures/presentationRedesign.mjs` (new), `tests/regression/presentation-redesign.test.mjs` (new), `tests/regression/presentation-quality.test.mjs`, `tests/presentationRedesignSamples.mjs`, `tests/presentationRedesignLive.mjs`, `tests/presentationRedesignDelivery.mjs`, `tests/presentationImageSample.mjs` (new runners).
- Documentation: the audit, this improvement guide, and `presentation-quality-test-results.md`.

Earlier webpage work, existing `renderHelpers.mjs` changes, deleted legacy layouts/documents, and unrelated untracked files were preserved. Generated binaries/screenshots live under ignored `generated/presentation-redesign/` and are not staged for Git.
