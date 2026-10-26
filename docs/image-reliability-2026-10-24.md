# Image reliability audit — 24 October 2026

## Confirmed findings

The audit reproduced these code paths; the original demo's exact request/log pair was not available, so these are not claimed as its single root cause.

- Presentation planning requested pictures on every eligible slide, including native diagram/table/chart slides. This consumed image budgets unnecessarily.
- Website provider admission rejected requests when concurrency slots were occupied instead of queueing them. Parallel requests could consequently omit images.
- Provider cache writes were not consistently atomic or checksum verified. Corrupted/missing/expired cache files now become cache misses and are reacquired.
- Generic catches discarded HTTP error classifications. Fatal authentication/model errors and transient outages were not consistently distinguished.
- Shared work could inherit one consumer's cancellation. It now cancels only after all consumers leave.
- Background jobs could mark required-image failures completed. They now retain available draft links but report failure/incomplete status.
- Persisted uploaded-image Buffers needed reconstruction when jobs resumed from JSON.
- Render's company service `srv-db8kc0k9v7es73eiu0h0` was inspected read-only: Docker, Free compute, no persistent disk. Its Disk page explicitly requires an upgrade. Local artifacts are therefore not durable across restarts/redeploys/spin-down. Recent one-hour logs showed startup, document requests, deployment and SIGTERM, but no matching image failure proving the demo's cause.

## Implementation and files

Shared infrastructure:

- `Service/visual/imageAssetService.mjs`: decoded image validation, optional blank-output rejection, SHA-256 source storage, atomic writes, queue admission, subscriber-safe shared work, safe diagnostics, classification and bounded backoff/jitter.
- `Service/storageRoot.mjs`: shared optional `LEDIFY_STORAGE_ROOT`, preserving individual legacy directory overrides.
- `Service/visual/googleImageService.mjs`: verified disk cache scoped by model/account/brief, generated-byte validation, one SDK attempt per budgeted invocation, timeout/cancellation and source persistence.

Presentation pipeline:

- `Service/visual/{imageArtDirection,imageProviders,presentationImageAssets,presentationPrefetch,presentationVisuals}.mjs`: selective image planning, required/optional coverage, classified failures, authorized fallbacks, bounded recovery and diagnostics.
- `Service/aiService.mjs`, `Service/ai/presentationPrompts.mjs`: reserve photo layouts only for planned image-bearing slides; preserve Gemini text responsibilities.
- `Service/presentationStorage.mjs`: shared storage root.

Website pipeline:

- `Service/webpage/{providerCache,imageProviders,imageStrategy,imagePipeline,imageOptimization}.mjs`: queueing, verified caches, download cancellation, explicit required targets, per-provider diagnostics and shared storage.
- `Service/webpageArtifactService.mjs`: verify saved image hashes and ZIP CRC/image bytes before completing packaging.
- `controller/webpageAssetsController.mjs`: verify served image hashes, correct MIME, explicit 404 for missing/corrupt assets.

API/job lifecycle:

- `Service/generateService.mjs`, `controller/generateController.mjs`, `Service/generationJobs.mjs`: required-image completion gate and retained draft artifacts; restore persisted image Buffers.
- `Service/document/documentArtifactService.mjs`: shared artifact root; document generation unchanged.

Tests added: `tests/regression/image-reliability.test.mjs`, `tests/regression/image-delivery-reliability.test.mjs`, `tests/imageReliabilityLive.mjs`. Existing Google-image, presentation-image, outage, quality, performance and website regression fixtures were updated to assert the new selective planning and incomplete-result behavior.

## Providers actually verified

Using the existing local key, the standalone model listing and real image requests succeeded:

| Model | Response | Valid saved image | Latency |
| --- | --- | --- | --- |
| `gemini-3.1-flash-image` | HTTP 200 | JPEG, 1376 × 768, 885,530 bytes | approximately 11.8 s |
| `gemini-2.5-flash-image` | HTTP 200 | PNG, 1344 × 768, 1,409,183 bytes | approximately 6.7 s |

Runtime remains configured for `gemini-3.1-flash-image`; there is no automatic switch to the other model. Gemini 3.7/3.5 text integrations and credentials were not changed. Probe evidence: `generated/google-image-verification/report.json` and the actual JPEG/PNG files beside it. This verifies the local key, not a different deployment's key.

Locally, website generation had the Gemini image provider configured. Presentation generation used the existing automatic licensed-source/Google-image chain. No Pexels key was configured. Bundled curated assets remain subject/relevance/license checked. No unrelated hardcoded image fallback, new subscription, or new dependency was added.

## Failure and frontend behavior

Only transient network/timeouts, HTTP 429 and eligible 5xx failures retry, within existing attempt, time, concurrency and cost limits. Backoff honors Retry-After, adds jitter and stops at the request deadline. Invalid credentials, access denial, rejected requests and missing models stop that provider; only already-authorized sources may follow. Empty/corrupt/blank generated output is rejected. Missing images are not replaced by fabricated success.

Updated 2026-10-26: presentations default to delivery with warnings, including required-image outages. When artifacts render successfully, synchronous requests return HTTP **201**, `result.status: "completed_with_warnings"`, and request status `completed`. Async jobs finish as `completed` with the same result. `imageValidation.status: "incomplete"`, `requiredMissing`, and the warning codes `PRESENTATION_IMAGES_UNAVAILABLE` / `IMAGE_REQUIREMENTS_UNMET` retain the image-quality evidence; they must not be interpreted as top-level request failures. Available PPTX/PDF/PNG links remain usable. Preview conversion failures keep their existing partial-success behavior. Explicit strict presentation mode still rejects unmet requirements. Required webpage image failures and document PDF failures retain their existing incomplete/error responses.

All existing routes remain. Presentation required-image rendering must also finish PDF/PNG verification before the top-level result completes. Diagnostics use request IDs and omit prompts/credentials.

## Verification and performance

The final full regression suite passed **395 tests, zero failures, zero skipped**, including the cancellation and blank-output additions. Release evidence is recorded in `generated/image-reliability-release-tests.log`.

Mocked/local tests cover success, timeout, HTTP 429 recovery, fatal 401/403/404/400, empty/blocked/corrupt/blank output, failed/expired downloads, missing/corrupt local files, concurrent admission and duplicate coalescing, individual cancellation, cache expiration/recovery, persisted job image restoration, restart on the same retained filesystem, ZIP integrity, actual HTTP image MIME/bytes and existing PPTX/PDF/PNG image visibility checks.

Six repeated real-image pipeline checks passed: three websites and three presentations. These use approved text fixtures, real configured Google image generation, actual `generateService`, HTTP routes and production renderers. Each test output has one required hero/title image. The first pair generates fresh images; subsequent pairs intentionally reuse verified caches. They do not constitute six independent provider requests or a full live-text multi-slide benchmark.

| Output | Fresh image cycle | Cached cycle 2 | Cached cycle 3 |
| --- | --- | --- | --- |
| Website | 12,228 ms | 289 ms | 452 ms |
| Presentation, one slide | 20,439 ms | 13,620 ms | 14,294 ms |

Website tests fetched all three responsive image variants through real HTTP and compared them byte-for-byte with the ZIP. Desktop 1440 px and mobile 390 px browser images decoded successfully. Presentation tests downloaded PPTX/PDF/PNG, checked physical PPTX media and the renderer's image visibility gate. Screenshots were inspected. Evidence directory: `generated/image-reliability-live/2026-10-24T15-16-44-186Z/` (`report.json`, desktop/mobile screenshots, presentation screenshots and output JSON). These timings include image/render/package/delivery stages with fixture text; cache benefits are not a universal generation-speed guarantee. Validation adds bounded decode/hash/ZIP work while avoiding duplicate paid generation.

## Render configuration still required

No paid plan or environment setting was changed. To preserve artifacts, an account owner must choose durable storage. For the current Docker app, one supported setup after attaching a real disk is:

```ini
# The disk itself must be mounted here; this variable does not create storage.
LEDIFY_STORAGE_ROOT=/app/generated
GOOGLE_IMAGE_MODEL=gemini-3.1-flash-image
GOOGLE_IMAGE_CONCURRENCY=1
```

Keep the existing `GEMINI_API_KEY`. Existing `LEDIFY_PRESENTATION_ROOT`, `LEDIFY_DOCUMENT_ROOT`, `LEDIFY_WEBPAGE_ROOT`, `LEDIFY_JOB_ROOT`, `LEDIFY_IMAGE_ASSET_ROOT`, `GOOGLE_IMAGE_CACHE_DIR` and cache overrides take precedence where applicable; if set, they must also point under durable storage. Keep existing approved generation budgets and timeouts; do not increase spend limits merely to hide outages. Google presentation generation still requires `PRESENTATION_ALLOW_IMAGE_GENERATION=true` plus positive server-configured estimated-unit-cost and cost-ceiling settings. Licensed-only requests intentionally cannot fall back to AI scenes portrayed as authentic photographs.

Render documentation: https://render.com/docs/disks and https://render.com/docs/free . Free instances cannot attach disks. Only paths under a real mounted disk persist. External object storage is an alternative, but no such provider was provisioned or integrated in this change. The restart tests verify retained storage, not persistence on an ephemeral Render instance.

Remaining risks: external quota, safety restrictions, model availability and network outages; provider relevance/rights; finite deadline/cost budgets; disk exhaustion and artifact expiry; native renderer CPU/memory; Free-plan cold starts and filesystem loss. A failure is now explicit and diagnosable, but no 100% availability claim is made. Previously lost files cannot be recovered by these code changes.
