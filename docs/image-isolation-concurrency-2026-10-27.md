# Image isolation and concurrent generation audit — 27 October 2026

The backend now uses independent request-owned image associations, stricter relevance admission, and bounded concurrent generation. Controlled local tests accepted mixed bursts of 2, 5, 10 and 20 requests, preserved their inputs and artifacts, and recovered deliberately failed jobs without disrupting the others. These results establish a tested workload, not a guarantee for arbitrary prompts or Render capacity.

## Findings and confidence

| Finding | Evidence and consequence |
| --- | --- |
| A broad webpage category match could override a failed shared relevance check | Confirmed in code. A clothing showroom with mixed broad hints could admit a car through this branch without any previous generation. The override is removed. This is a plausible explanation for an apparently contaminated image, but the specific historical boutique result was not recoverable for inspection. |
| Shared in-flight image work returned mutable references | Confirmed by a test that changes one consumer's buffer and nested metadata. Consumers now receive independent copies. No evidence establishes that a production caller actually mutated these objects. |
| Cache reads lacked an explicit stored context-key check | Metadata transplanted between two cache entries is now rejected. Context and image intent are part of keys, and versions invalidate old entries. Cached stock bytes may intentionally be reused for identical requirements; request associations are always created afresh. |
| Branded subjects and photographic settings were conflated | A clothing request's “interior” setting could require the architecture category, while generic luxury/showroom overlap could admit unrelated subjects. General lexical evidence now supplements the existing taxonomy, and a setting cannot redefine an explicit subject outside that taxonomy. No new industry-specific routing or fallback rules were added. |
| A local image exclusion disabled all imagery | A real-model integration produced “Slide 2 must have no images”; the previous global regex suppressed the cover too. Local text-only instructions now leave other placements eligible. Explicit per-slide exclusions still apply. |
| One async worker and eight waiting jobs limited burst admission | Confirmed configuration. Default workers are now two, with 32 waiting jobs, while a shared generation semaphore also bounds synchronous and direct calls. Concurrent retries reserve admission before asynchronous filesystem writes, preventing a backlog-capacity race. This does not turn overload into unlimited acceptance. |
| AI/native capacity could be exhausted by independent synchronous requests | Previously there was no overarching admission around synchronous generation. Parsing, extraction, generation, text AI, stock search and native conversion now have separate bounded capacities. Webpage and presentation stock searches share one two-slot pool. |
| Router construction could start recovery | Recovery no longer starts as an import/router-construction side effect. The existing server lifecycle starts recovery after MongoDB readiness. |

UUID output directories, content-addressed raw image storage and private converter profiles already provided useful isolation. No output-name collision, observed cross-request file overwrite, or successful cross-request token access was found in controlled testing. Those protections were retained.

The linked production result could not be inspected, and its exact request/log/artifacts were unavailable. Therefore **a historical cross-user cache leak is not confirmed**. The code defects and risks above are independently demonstrated; they should not be represented as proof of that incident's precise cause.

## Image lifecycle and validation

1. Derive the current subject, local section/slide, intended scene, photographic/concept intent, exclusions and any exact identity constraints.
2. Check independent candidate metadata before decoding/optimizing. A rejection from the shared checker cannot be reversed by a broad webpage category overlap. Generic style words do not establish subject relevance. Existing media-kind, identity, provenance, dimensions and scene constraints remain.
3. Reuse provider work and cached bytes only under the matching contextual key and checksum. Shared results are copied; user-supplied assets are not added to a searchable fallback catalog.
4. Bind selected bytes to the current request ID, placement key, contextual digest and SHA-256. Cache metadata does not retain a previous request binding.
5. Verify actual placements at HTML/PPTX rendering. Package every responsive webpage raster with its checksum association; validate saved bytes and ZIP parity. Serving a webpage image checks its stored request/checksum association. PPT previews receive a private per-slide association manifest; PPTX embedding and converted previews continue through the existing validation stages.
6. Preserve descriptions and use a content-led layout when optional imagery is unavailable. Required failures remain explicit/incomplete rather than silently borrowing an unrelated image. Acquisition/replacement retries and time/cost budgets remain bounded.

This uses metadata, hashes and existing raster validation. It does **not** add computer vision, certify that metadata describes every pixel, or guarantee exact photographic scene compliance. Generated image intent is identified as intent evidence, not independent verification. Legacy direct renderer fixtures without the new request marker remain supported; new production acquisition supplies the marker and binding checks.

Relevance logs now retain hashed context and candidate metadata plus safe reason/source/status fields. They no longer print full topics, search descriptions or creator strings. Existing capability-token handling and artifact routes remain unchanged.

## Concurrent resource policy

| Resource | Recommended initial configuration | Behavior |
| --- | --- | --- |
| Generation | `LEDIFY_GENERATION_CONCURRENCY=2` | Shared across direct calls, synchronous HTTP and durable job workers; nested layers reuse admission |
| Waiting generation jobs | `LEDIFY_GENERATION_MAX_WAITING=32` | Bounded FIFO admission; overload returns retryable capacity errors |
| Generation admission wait | `LEDIFY_GENERATION_WAIT_MS=600000` | Applies to waiting for a generation slot, not total async job lifetime |
| Body parsing/source extraction | 2 active, 32 waiting, 120 s admission wait | Acquired before JSON/Multer parsing; releases before database/AI work; original upload buffer released after extraction |
| Text AI | `LEDIFY_AI_CONCURRENCY=6` | Shared bounded pool, 32 waiting, 90 s admission wait; per-model cooldown honors provider retry hints |
| Licensed stock acquisition | 2 shared active operations | Shared by webpage and presentation default providers; image deadlines also bound queued work |
| Paid image generation | Existing shared Google pool of 1 | Existing server opt-in and budgets retained; not increased |
| Native PDF/PNG conversion | Existing default of 1 | Shared document/PPT pool, 32 waiting, 300 s queue timeout; isolates native profiles/work dirs |

AI retries retain the existing attempt cap. Transient 429/503 responses establish a model-scoped cooldown from Retry-After/Google retry hints, while other models can progress. Slots are released during cooldown. Permanent billing/daily exhaustion is not converted into an endless retry loop. Stock/photo retry budgets remain bounded; this change does not add a project-wide requests-per-minute quota predictor.

Google quotas are project-level and model-specific, with request/token/day limits dependent on the account and tier. Actual project quotas were not accessible here and are not inferred from a concurrency setting. See [Google's rate-limit documentation](https://ai.google.dev/gemini-api/docs/rate-limits). No paid provider, model upgrade, billing ceiling or image-call budget was increased.

## Controlled native load results

`tests/multiUserAudit.mjs` submitted real concurrent HTTP requests with mocked text/image providers and mocked URL extraction, but real DOCX upload extraction, HTML/ZIP, PPTX, LibreOffice PDF conversion, PNG previews, DOCX and actual HTTP downloads. MongoDB metadata was replaced by an isolated in-memory stub. Six subject families were used: automotive, clothing, residential property, laboratory diagnostics, marine conservation and computing.

All nine input/output combinations appeared: prompt/URL/DOCX input crossed with webpage/PPTX/document output. The five waves totaled **38 distinct requests: 15 webpages, 13 presentations and 10 documents**. Presentations in this load test were one-slide photo decks; documents were concise reports, with a PDF-export document in each larger wave. It is not a test of 20 simultaneous full-length decks or maximum-size uploads.

| Submitted together | Initial successes / deliberate failures | Final successes after retry | Peak active generation | HTTP admission p95 | Queue wait p95 | Whole wave | Health p95 | Node peak RSS |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 (webpage baseline) | 1 / 0 | 1 | 1 | 110 ms | 58 ms | 3.24 s | 16 ms | 175.9 MiB |
| 2 | 2 / 0 | 2 | 2 | 72 ms | 96 ms | 19.47 s | 5 ms | 205.8 MiB |
| 5 | 4 / 1 | 5 | 2 | 107 ms | 14.20 s | 55.36 s | 7 ms | 206.8 MiB |
| 10 | 9 / 1 | 10 | 2 | 329 ms | 65.36 s | 83.50 s | 7 ms | 293.1 MiB |
| 20 | 19 / 1 | 20 | 2 | 439 ms | 111.73 s | 158.75 s | 9 ms | 379.4 MiB |

There were **zero unexpected failures**. Three controlled permanent provider failures were isolated and explicitly retried, restoring all three jobs without duplicate records or changed inputs. Initial success was 35/38 (92.1%) including those injected failures; final success was 38/38. This is a controlled test result, not a measured production success rate.

A repeat 20-request export run after the final image/packaging changes also passed: **19 initial successes, one deliberate failure, 20 final successes, zero unexpected failures**. It finished in **111.08 s**, with two active generations, admission p95 **274 ms**, queue p95 **66.31 s**, health p95 **9 ms** (1,014 samples), Node peak RSS **263.6 MiB**, parent CPU **21.00 s** and event-loop delay p95 **39.6 ms**. It injected three 429s; AI attempt sum was 3.72 s and non-nested render/export sum 108.45 s. Earlier files within that run remained unchanged. Different host/cache/process conditions explain variability; this is not a controlled speedup ratio. The subsequent retry-admission race fix was independently verified by its bounded simultaneous-retry regression.

| Submitted together | AI attempt sum, including failures | Render/export sum | Native queue wait sum | Injected 429s | Node CPU time | Node event-loop delay p95 |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | 1.07 s | 0.32 s | 0 | 1 | 1.25 s | 39.6 ms |
| 2 | 1.10 s | 18.22 s | <1 ms | 1 | 3.75 s | 41.8 ms |
| 5 | 1.20 s | 52.95 s | 11.84 s | 1 | 8.77 s | 40.8 ms |
| 10 | 2.40 s | 80.61 s | 57.50 s | 2 | 12.06 s | 47.9 ms |
| 20 | 3.74 s | 172.32 s | 82.71 s | 3 | 28.86 s | 43.3 ms |

AI values are mock-provider attempts and include the deliberate retry delays; they are not Google latency estimates. Render/export sums use explicit non-nested stages and may overlap across jobs; native queue time is separate. Wave time includes downloads, verification and retries. Queue p95 is the final attempt's wait; retry resets that attempt's queue clock. Raw first-run reports had cumulative rate-limit counts and overlapping render aggregation; `tests/isolationAuditSummary.mjs` derives the corrected table from original structured logs without changing the raw evidence.

At 20 users the parent Node process used about **18.2% of one core averaged across the wave** (28.86 CPU seconds / 158.75 elapsed seconds), and health had 1,442 samples. Native child CPU/RSS, container total memory, GPU resources and host utilization were not measured. Thus the RSS number is not a safe Render memory-budget estimate.

Additional single-output smoke baselines passed: one photo slide plus PDF/PNG took 17.97 s, and one DOCX/PDF report took 12.01 s, using controlled providers. Other local validation was running during those baselines, so they are descriptive, not an isolated before/after performance comparison. A mixed burst's longer queue is justified by two generation workers and one native converter. This audit does not claim to solve every four-minute provider-heavy generation or promise a fixed completion time.

## Isolation, previews and integration checks

The final `npm test` run passed **502/502 tests**, with zero failures, cancellations or skips, in 183.91 seconds. It includes webpage production/universal tests, presentation image/relevance/rendering tests, input validation, startup/recovery, HTTP/CORS, documents, performance and the new isolation/concurrency suite. The targeted shared-stock suite passed 58/58; the final retry/scheduling suite passed 32/32 (these overlap the full suite and are not additional unique tests). Final diff whitespace checks passed. Evidence: `generated/isolation-release-regression.log`.

- The load harness checks request markers in generated HTML, PPTX XML, extracted PDF text and DOCX XML; selected source checksums and actual embedded image bytes; PNG signatures/counts; and website preview-versus-ZIP image equality.
- Every earlier saved artifact is downloaded again after subsequent waves and compared by SHA-256. This covers webpage-to-webpage, presentation-to-presentation and both cross-pipeline directions, as well as documents, without overwriting old artifacts.
- Wrong job capability tokens return 404. Separate tests reject swapped request/placement/context/bytes, transplanted cache metadata, mutation of shared results, duplicate release, admission overflow, failed-worker effects, and long provider cooldown hints. Warm presentation photo caches produce a new request binding; webpage provider caches distinguish identical queries with different subjects.
- Synchronous and asynchronous HTTP admission are tested at 2/5/10/20 requests. Parsing/extraction capacity is independently checked, simultaneous retries cannot bypass the waiting bound, and unrelated models can run during a model cooldown.
- A limited fresh real-provider integration submitted three mixed requests: a clothing webpage from text, a two-slide marine presentation from an actual DOCX upload, and a document from actual `https://example.com` extraction. Fresh text/source generation succeeded. It exposed the local-image-exclusion bug described above.
- Saved real-provider content was then replayed, avoiding more paid text calls. The marine deck passed actual PPTX/PDF/two-PNG downloads and the association manifest; the source document passed DOCX/HTML download. Live stock search also produced a real provider failure, which remained scoped to that acquisition. A stricter fallback correctly refused an accessories-only boutique photo as proof of garments. After correcting subject-versus-setting admission, a relevant illustrative clothing-rail photograph was packaged instead of a car.
- The final boutique replay passed raster delivery bindings, ZIP byte parity, and headless Edge checks at **1440 px and 390 px**, with zero browser-check failures. The clothing rail is illustrative stock, not a claim that it depicts the fictional boutique. Human inspection of the mobile webpage and marine cover confirmed relevant visible photography and readable layouts. Subjective design certification is not implied.
- Paid image generation was disabled throughout these integration checks. Real-provider text was not used for the 20-user stress workload.

## Performance overhead

On this host, 600 checks across six existing representative photo assets measured relevance plus binding creation and verification, including two SHA-256 passes: **1.52 ms mean, 2.64 ms p95**. Disk reads, raster decoding, network and native conversion were excluded from the timed section. The benchmark is the added validation operation, not a whole-pipeline before/after speed claim. It introduces no vision-model calls or extra paid generation.

## Exact changed files

Production image logic and storage:

- `Service/visual/subjectEvidence.mjs` — new generic metadata evidence.
- `Service/visual/imageRelevance.mjs` — subject/settings admission and privacy-safe diagnostics.
- `Service/visual/imageArtDirection.mjs` — local text-only instruction scope.
- `Service/visual/assetBinding.mjs` — new request/placement/checksum bindings and responsive manifest.
- `Service/visual/imageAssetService.mjs` — independent copies of shared results.
- `Service/visual/imageProviders.mjs` — shared licensed-stock capacity.
- `Service/visual/googleImageService.mjs` — generated-image cache request digest validation.
- `Service/visual/presentationImageAssets.mjs` — contextual cache checks and fresh deck bindings.
- `Service/visual/presentationVisuals.mjs` — deck request identity.
- `Service/webpage/imageReview.mjs` — prevent category override of relevance rejection.
- `Service/webpage/imageStrategy.mjs` — primary/enriched subject context.
- `Service/webpage/imagePipeline.mjs` — binding selected optimized bytes.
- `Service/webpage/providerCache.mjs` — contextual cache integrity, binding stripping and shared stock pool.
- `Service/webpageArtifactService.mjs` — saved request and per-raster manifest validation.
- `Service/document/documentArtifactService.mjs` — request tracing metadata.
- `controller/webpageAssetsController.mjs` — delivery association checks.
- `renderer/webpage/webpageRenderer.mjs` — validate actual image placements.
- `renderer/presentation/pptxRenderer.mjs` — validate deck image associations.
- `renderer/presentation/previewRenderer.mjs` — private slide-image manifest.

Production scheduling and admission:

- `Service/generationCapacity.mjs` — new shared, reentrant bounded generation admission.
- `Service/input/admission.mjs` — new pre-parser/source-extraction admission.
- `Service/generateService.mjs` — shared admission, cloned content and bound packaging.
- `Service/generationJobs.mjs` — two bounded workers and isolated performance hooks.
- `Service/ai/providerCapacity.mjs` — bounded model cooldown coordination.
- `Service/ai/generateJsonWithRetry.mjs` — report transient throttling to shared capacity.
- `controller/generateController.mjs` — synchronous admission, release upload memory and retryable capacity responses.
- `renderer/presentation/renderQueue.mjs` — bounded native backlog/wait capacity.
- `route/generateRoute.mjs` — remove premature recovery side effect.
- `src/app.mjs` — admission before body parsing.

Tests and evidence tooling:

- `tests/regression/request-isolation.test.mjs` — new isolation, relevance, cache, mapping, capacity and HTTP burst tests.
- `tests/regression/webpage-speed.test.mjs` — explicit one-worker configuration only for queue-timing unit test.
- `tests/webpage/fixtures.mjs` — clone fixtures to stop test-to-test mutation; this was a test fixture defect, not evidence of production leakage.
- `tests/multiUserAudit.mjs` — reproducible native mixed workload and artifact verification.
- `tests/isolationLive.mjs` — limited fresh/replayed real-provider integration and browser QA.
- `tests/isolationAuditSummary.mjs` — corrected per-wave counters and validation-cost benchmark.
- `docs/image-isolation-concurrency-2026-10-27.md` — this report.

## Operational limits and deployment

The maximum tested burst is **20 submitted requests**, processed by **two active generation workers and one native converter**. Do not label this 20 simultaneous active full generations. Keep the recommended defaults until actual Render container memory, native children, provider quotas and representative full-length decks have been measured. Raising worker count is not an evidence-based fix for quota or memory exhaustion.

The durable queue is local-filesystem, single-process infrastructure. It has restart recovery, but no distributed worker leases or multi-instance claim coordination. It must not be shared by multiple Node processes as a distributed queue. The default Render filesystem is ephemeral; only data under an attached disk's mount persists. No persistent disk or production storage configuration was verified or changed here. See [Render persistent-disk documentation](https://render.com/docs/disks). This remains a deployment requirement for durable recovery/artifact retention across replacements.

This backend does not currently implement account-authenticated tenant ownership. Tests verify independent requests, capability tokens and UUID artifact associations available in the existing architecture, not nonexistent user-account ACLs. Web/document routes use capability tokens; PPT artifact possession is UUID-based. Metadata bindings detect association errors; they are not an authorization or cryptographic-signature system.

No frontend code was changed or analyzed. Async clients must use the existing `Prefer: respond-async` receipt and status polling; the frontend developer owns that behavior. A client timeout cannot be eliminated solely by backend artifact correctness. Existing incorrect historical outputs are not rewritten; regenerate affected outputs after deployment. Deployment and the precise production incident remain unverified until the deployed commit and production artifacts are checked.

Raw local logs and generated artifacts are ignored by Git and contain private capability material; they are not published with this report. Relevant local evidence: `generated/concurrency-audit/final-load/report-verified.json`, `generated/isolation-native-final.log`, `generated/concurrency-audit/final-code-20/report.json`, `generated/isolation-native-final-code-20.log`, `generated/isolation-live/final/report.json`, `generated/isolation-live/final-replay/report.json`, `generated/isolation-live/final-boutique-verified/report.json`, and the final regression log.
