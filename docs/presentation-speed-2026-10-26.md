# Presentation latency investigation — 26 October 2026

The user's exact 12-slide ÉLITE HAVENS request previously took 247.196 seconds. A local HTTP rerun with the changes below completed in 134.753 seconds (134.925 seconds observed through job polling): 112.443 seconds less, approximately 45.5% faster. This is one observed comparison, not a latency guarantee. The local audit uses real configured Gemini services, renderers and artifact downloads, with an in-memory database metadata stub; the supplied original log includes about one second of database operations. Provider response times and generated outlines vary.

| Stage | Supplied original log | Updated local run |
| --- | ---: | ---: |
| Content, including outline and independent review | 74.326 s | 42.470 s |
| Remaining image wait after content | 117.521 s | 58.266 s |
| PPTX render and validation | 2.683 s | 1.174 s |
| PDF conversion | 26.436 s | 21.578 s |
| PNG conversion | 21.177 s | 9.443 s |
| PNG and embedded-photo checks | 3.945 s | 1.674 s |
| Total backend time | 247.196 s | 134.753 s |

The biggest original mismatch was 11 requested images despite “Use additional images selectively.” Online searches for several slides took 45–51 seconds, occupying image capacity and delaying fallback. Some accepted images were also irrelevant.

Changes:

- Remove the contradictory outline instruction requiring a supporting photo on every slide. For explicit selective/sparing requests, enforce an image ceiling of `ceil(slides / 3)` before text layout budgeting and image prefetch. Preserve the cover, spread supporting images, respect exclusions, and retain every-slide or explicit minimum-quantity instructions.
- Bound each presentation stock attempt to 12 seconds by default, with at most three Commons query variants. Existing bounded retry policy remains. Failed stock acquisition can use Gemini where generation is authorized; authentic-only requests still prohibit synthetic substitution.
- Require scene matching for bundled photographs and cached stock as well as Commons candidates. Reject libraries for mansions/living rooms, inland villas for waterfront scenes, carpark signs for spas and university buildings for penthouses. Classify schematics as illustrations. Keep provenance, resolution, checksums and duplicate checks.
- Start image prefetch when an individual slide has passed local content validation, even if an earlier slide has not finished. Durable content checkpoints retain their ordered prefix.
- Set a bounded slide-content thinking budget, default 1024, retaining schema/layout validation, retries and independent semantic review. No text or image model was replaced.

Final audit: `generated/performance-audit/presentation-speed-elite-final-2026-10-26/elite-havens12-metrics.json`; full log: `generated/presentation-speed-elite-final-2026-10-26.log`. The generated deck contains 12 slides, 10 distinct layouts and three embedded pictures: two fresh Gemini images (cover mansion and waterfront villa) and one Commons interior photograph. Both image generation calls reported `cacheHit:false`; they took about 58.4 and 27.1 seconds. PPTX, PDF and all 12 PNG downloads returned HTTP 200. All preview pages are 1921×1080 and passed nonblank checks. The three image-bearing previews were visually inspected for their actual subjects and embedding. General aesthetic certification remains a human review task.

An earlier 97.552-second run was rejected as quality evidence after visual metadata inspection found mismatched catalogue photos. A separate initial transport benchmark failed content validation and is not a successful latency baseline. Neither is counted as the final result.

Reproduce with `node tests/performanceAudit.mjs <phase-name> elite-havens12`. This invokes configured paid providers. Existing presentation10/presentation12 fixtures remain available. The new fixture runs only when selected explicitly, to avoid adding paid work to the audit's default batch.

Server settings: `PRESENTATION_STOCK_SEARCH_TIMEOUT_MS` defaults to 12000 and is bounded to 1000–30000; `PRESENTATION_IMAGE_TIMEOUT_MS` continues to bound each overall provider attempt; `GEMINI_SLIDE_THINKING_BUDGET` defaults to 1024 and is bounded to 128–8192. Existing provider billing limits and deadlines remain active. No production deployment was performed as part of the benchmark.

Validation: all 444 regression tests passed (`generated/presentation-speed-full-regression.log`). The suite includes selective-count enforcement, every-slide/minimum-count preservation, catalogue/cache scene rejection, bounded stock acquisition with authorized AI fallback, authentic-photo restrictions, content callback ordering, real PPTX/PDF/PNG pipelines and existing image warning/strict-delivery contracts. The focused final group also passed all 15 tests (`generated/presentation-speed-final-targeted.log`). `git diff --check` passed.
