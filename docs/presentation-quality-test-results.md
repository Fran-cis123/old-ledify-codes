# Presentation quality test results

Verified locally on 19 October 2026. No deployment or GitHub push was performed. Generated binaries are ignored by Git and remain available under `generated/presentation-redesign/`.

## Automated verification

- Full regression suite: **290 passed, 0 failed, 0 skipped**, 61.10 seconds in the final run. This includes the existing document, webpage, input/upload, URL, API and presentation regressions. Log: `generated/presentation-redesign-full-tests.log`.
- Focused redesign suite: **10 passed**, covering numbered slide instructions, Unicode/abbreviation matching, geometry and typography, layout preservation, queue overflow/release, diagram graph validation, unsupported liability claims, photo embedding/deduplication, and blank/malformed preview rejection.
- Seven deterministic decks: **40 actual PPTX slides, 7 PDFs and 40 PNGs**. All completed serialized-package, relationship-target, geometry and preview checks. These use meaningful authored fixtures, not provider calls or fabricated screenshots.
- Asset-controller integration: **61 successful HTTP requests** across all seven decks: 14 downloads, 40 slide images and 7 inline PDF previews. Downloaded bytes match the actual generated files by SHA-256. Report: `generated/presentation-redesign/delivery-report.json`.
- Additional licensed-photo sample: 2 slides rendered to PPTX/PDF/PNG. The public-domain CDC laboratory photograph is visibly embedded; its attribution and duplicate-photo handling are covered by tests. This uses a controlled provider response with a real local photo, not a live image-provider account.
- A fresh Gemini healthcare generation produced ten real slides and previews. A subsequent bounded review of the saved content repaired one overbroad liability claim. Details below distinguish these operations from fixture rendering.

## Seven-category rendering matrix

Times include local artifact creation/conversion and checks, without AI generation. They are measurements, not service latency promises.

| Category | Slides | Render/check time | Representative capabilities |
| --- | ---: | ---: | --- |
| Healthcare | 10 | 17.669 s | Architectures comparison, diagnostic workflow, clinical handover, roadmap, closing synthesis |
| Business | 5 | 12.126 s | Proposed handover, comparison, process progression |
| Research | 5 | 11.433 s | Research proposal, editorial explanation, methods table |
| Finance | 5 | 11.666 s | Editable column/line charts, units, interpretation, explicitly synthetic values |
| Technology | 5 | 11.729 s | Request lifecycle, comparison, native hierarchy with labeled connectors |
| Environment | 5 | 10.488 s | Validated closed water-cycle schematic and explanatory content |
| Academic | 5 | 12.071 s | Critical-reading categories, horizontal timeline, quotation, closing synthesis |

Each category directory contains `presentation.pptx`, `presentation.pdf`, `slides/slide-N.png`, `contact-sheet.png` and `result.json`. The complete machine-readable run is `manifest.json`. Six theme variants were exercised. The five-slide fixtures intentionally exercise short decks; the live healthcare test independently verifies an explicit ten-slide request, and the existing 1–12/default 8–10 policy remains tested.

## Before and after

The original healthcare deck was located at `generated/previews/061f5241-311f-4ff5-b0b7-3690c670b717/presentation.pptx`; its original PDF was rendered for comparison. It was not overwritten.

- Original: `healthcare-before/contact-sheet.png` and `healthcare-before/original-text.json`.
- Redesigned fixture: `healthcare/contact-sheet.png`.
- Side-by-side original-left/redesigned-right examples: `healthcare/before-after.png` (slides 1, 3, 6, 9 and 10).

The fixture keeps the original ten topic positions but uses authored, qualified copy to isolate rendering behavior. It is not an identical-content A/B experiment. The changes visibly replace arbitrary cover rings with typography, turn an architecture paragraph into comparison columns, use an explicit operational sequence, express proposed phases as a roadmap, and give the closing statement a distinct composition.

Contact sheets for all seven categories were visually inspected. The final live healthcare sheet, final finance charts, environmental cycle and photographic slide were also inspected. No obvious clipped text, blank slides, or critical text overlaps were observed in these samples. Human inspection of selected artifacts does not establish universal aesthetic or scientific correctness.

## Live AI verification

`tests/presentationRedesignLive.mjs` issued a fresh ten-slide healthcare request with explicit numbered topics. Existing configured Gemini outline/content models were used. External image lookup and extra diagram-planner calls were disabled for this controlled test.

- Fresh generation: request `7dd10b2a-73aa-488d-bc31-14d24ea45e9a`; total **157.259 s** (AI 142.232 s, layout 9 ms, visuals 171 ms, rendering 14.848 s). Provider latency and bounded content-fit retries dominate this example.
- Saved-content review: request `7adee62e-87c2-4e82-b470-905af32f2519`; **38.632 s** (AI 18.567 s, rendering 19.868 s). This reused the outline/content checkpoint and performed one targeted repair round; it was not another complete generation benchmark.
- Final artifacts: `live-healthcare/presentation.pptx`, `presentation.pdf`, ten slide PNGs and `contact-sheet.png`. `result.json` records the saved-content review result and timings; full-generation logs are `generated/presentation-redesign-live.log`.
- The final result is truthfully `completed_with_warnings`: an unavailable background uses the plain theme, and optional informative illustrations on slides 3 and 8 remain unresolved. The working native content layouts are preserved. Technical preview completion does not imply every visual requirement was fulfilled.

The initial sandbox-blocked network attempt is retained separately in the live runner's `failure.json` for diagnostics; it is not the outcome of the successful subsequent network-enabled run. No API credentials are included in these reports.

## Reproduction

Run from the repository root with existing dependencies and working converter binaries:

```powershell
npm test
node --test tests/regression/presentation-redesign.test.mjs
node tests/presentationRedesignSamples.mjs
node tests/presentationRedesignDelivery.mjs
node tests/presentationImageSample.mjs
```

The sample/delivery/photo commands do not need paid model calls. The sample runner creates actual artifacts in the configured preview root and copies reviewable files into the ignored test-artifact directory. The delivery test must follow sample generation so its manifest refers to existing assets.

The following is optional and incurs provider usage; it requires the existing AI environment settings and network access:

```powershell
node tests/presentationRedesignLive.mjs
# Reuse its saved content for bounded review, without generating another outline:
node tests/presentationRedesignLive.mjs --review-saved
```

## Remaining limits

- No universal five-second generation claim: even conversion alone took roughly 10–18 seconds per fixture on this machine. The render queue bounds conversion pressure; AI concurrency and provider latency still affect end-to-end time.
- Geometry, package and nonblank-pixel checks detect technical defects, not every glyph-level clipping issue, misleading image, unsupported causal relation or poor artistic choice. There is no autonomous post-PNG vision critic/repair loop.
- Numbered-topic matching is a bounded lexical guard alongside the existing semantic review. It does not prove complete instruction understanding. Scientific content, detailed anatomy, jurisdiction-dependent claims and real financial data still require appropriate review.
- Native diagrams/charts remain editable. Photos are raster images; image relevance/provenance cannot be guaranteed solely by provider metadata. Live external photography and paid image-generation services were not verified by this run.
- PowerPoint output was inspected through its actual LibreOffice PDF/PNG conversion and XML/package checks; Microsoft PowerPoint itself was not opened for this run. Font substitution may vary by deployment.
- HTTP delivery was tested locally against the actual asset controllers. Render was not deployed or load-tested. Persistent/shared artifact storage is required to keep preview URLs valid across restarts or replicas.

See `presentation-pipeline-audit.md` for root causes and `presentation-pipeline-improvements.md` for changed files, architecture, API behavior and deployment configuration.
