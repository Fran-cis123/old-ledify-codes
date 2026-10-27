# Testing issues investigated on 27 October 2026

The supplied logs establish repeated late layout failures, not a prompt-length rejection. Requests `7fc3315a-76ac-4b99-b846-957561782918` and `26e34dca-08e8-434b-822b-a84df70da5fd` failed after text generation/review with `PRESENTATION_CONTENT_TOO_DENSE`, slide 11, `process.steps[0].description`, maximum 75 characters. Image requests continued after the failed response. The 248.738-second successful request in the same log contains **12 slides**, not one.

## Changes

1. **Typography:** presentation layouts now share a fixed semantic scale: slide titles 30 pt, subtitles/body 18 pt, secondary headings 20 pt, statistics 44 pt, quotations 24 pt and page numbers 12 pt. Diagram labels use consistent 20 pt headings and 18 pt detail/edge text; chart axes and legends use 18 pt. Copy must fit at the assigned size; there is no automatic shrinking or discarded content. Cover and image layouts use the same title/subtitle/body scale as ordinary slides.
2. **Reliability:** per-slide and complete-deck validation now use the real final layout candidate selection instead of a generic dry layout. Thus a process that fits a grid but not a horizontal composition selects a fitting alternative or is repaired while bounded AI retries are available. A second deterministic pass checks the deck after semantic repairs. A `finally` block cancels outstanding image prefetch on all later failures, including artifact/layout errors and failed content persistence callbacks.
3. **Visible image labels:** remove the automatic presentation photo captions and suppress automatic AI/illustrative image boilerplate in webpage captions. Provenance, licensing, accessibility descriptions, genuine content captions and required credits remain available. Raster image prompts already prohibit text/captions; existing saved files are not retroactively edited.
4. **Slide count:** accept explicit counts in `context.instructions` and normalize Unicode hyphens in phrases such as `10‑slide`. Existing explicit `slideCount` field precedence and 1–12 range remain. A final export guard prevents resumed/stale content from silently returning eight slides for an explicit ten-slide request; no missing slides are fabricated or duplicated.
5. **Long prompts:** exactly 2,000 characters are accepted through production HTTP middleware for both presentation and webpage output; 2,001 is rejected before generation. A real educational webpage case exposed a separate false positive: instructions saying “do not invent a company” or “rather than verified business achievements” caused the page to be classified as a corporate site. Ordinary charging infrastructure/facilities were then rejected as unsupported business claims. Negative instructions no longer create that corporate classification; actual organization/factual-claim checks remain.
6. **Speed:** stock timeouts now proceed to authorized AI fallback without another stock timeout attempt, except authentic-only requests which retain their bounded stock recovery. Existing image concurrency, budgets and authentic-only restrictions remain. Webpage drafting has a 1024-token thinking budget, retaining schema, editorial and grounding checks. Editorial presentation concerns remaining after bounded repairs return usable artifacts with `PRESENTATION_REVIEW_REQUIRED` and truthful review status; factual/coverage errors and unsupported absolute claims still block approval. This is not a general bypass of content validation.

Image review also rejects forensic evidence photographs for property advertising, paintings represented as photographs, explicit old construction dates for contemporary scenes, and rural reconstructions for luxury interiors. For modern residential scenes, metadata must substantiate modern/contemporary style rather than matching only a broad house/mansion term. This stricter final metadata filter was added after visual inspection of the paid sample runs; it was verified with the targeted image suite. Independent visual understanding of every stock photograph is not claimed.

## Measured local outputs

| Request | Observed result | Artifacts |
| --- | --- | --- |
| Exactly 2,000 characters, explicit ten-slide presentation | 90.280 s observed; 89.892 s backend | Exactly 10 slides, PPTX, PDF and 10 PNGs, all downloads HTTP 200 |
| Exactly 2,000 characters, educational webpage | 33.287 s observed; 32.979 s backend; two text calls, no retries | Preview and self-contained ZIP, downloads HTTP 200 |
| Explicit single-slide presentation | 37.414 s observed in diagnostic run | Exactly one slide, PPTX, PDF and PNG |

These are real configured Gemini calls and real renderers over local HTTP with an in-memory metadata database stub. Provider latency, selected images, content repairs, server load and conversion performance vary. The ten-slide deck retained two generated images and licensed photographs, with editorial warnings exposed. Initial long-prompt runs failed, and a subsequent diagnostic ten-slide run took 83.593 seconds; these were retained as evidence rather than substituted for the latest reported measurement. Measurements are not an estimate of the production success percentage and do not establish that 100 user requests will all succeed.

Evidence (ignored local artifacts):

- `generated/performance-audit/testing-issues-presentation-final-2026-10-27/long-presentation10-metrics.json`
- `generated/performance-audit/testing-issues-webpage-final-2026-10-27/long-webpage-metrics.json`
- `generated/performance-audit/testing-issues-diagnostics-2026-10-27/single-presentation-metrics.json`
- `generated/testing-issues-verified-full-2026-10-27.log`: 453/453 full regression tests passed.
- `generated/testing-issues-final-images-2026-10-27.log`: 45/45 targeted checks passed after the final stock filter/caption tests. This includes 10 current issue-specific tests.
- `git diff --check` passed.

The latest presentation cover and a content slide were visually inspected for readable typography and absence of automatic labels; earlier diagnostic slides were inspected as well. Export validation covers actual embedded media, slide/page counts and nonblank PNGs, not aesthetic certification.

## Frontend testing and deployment

Deploy the new backend commit before retesting. Existing artifacts retain their previous fonts and captions and should be regenerated. For long-running requests, the existing `Prefer: respond-async` API returns HTTP 202 with `data.statusUrl`; poll that URL and show queued/processing/completed/failed states. This avoids depending on a single browser/proxy HTTP connection throughout generation; it does not claim to eliminate the work's execution time. Synchronous behavior remains compatible.

When a new failure occurs, retain its request ID, HTTP response/error code, stage and matching `[PERF]` report. The supplied logs do not include the complete failed Postman bodies/responses or establish the claimed production failure percentage. A production rate/load audit remains necessary to measure that percentage and identify any remaining provider, queue, deployment or frontend failures.
