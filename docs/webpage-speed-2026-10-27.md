# Webpage speed follow-up — 27 October 2026

## What the supplied Render log establishes

The user observed 236 seconds from submitting APEX to seeing its output. The supplied backend performance entry, request `cd80a9d2-da6d-4d0c-96cd-5693317718df`, records **81.420 seconds**:

| Stage | Seconds |
|---|---:|
| Content planning and drafting, including one repair | 30.399 |
| Website images | 38.799 |
| Packaging | 10.701 |
| Database create/save combined | 0.664 |
| HTML/CSS/JS and static validation combined | 0.804 |

The approximately **154.6 seconds outside this entry are unaccounted for**. The attachment does not establish whether they occurred before application admission, during another request, in hosting/network delivery or while the browser loaded the result. Do not label them AI-generation time or claim a specific frontend/hosting fault from this evidence. The entry includes request-level database creation, so it must not be cited as proof that a background job waited in the queue.

A read-only check of the backend root confirmed Render was serving `c70e44404ffea638b39dfeb12a3c82b7f5fa3a8e` during this audit. The frontend result link could not be read by the web tool; no frontend source was inspected or changed. The user's positive quality assessment is retained as the reference; the backend renderer, templates, models and output image-resolution settings are unchanged by this follow-up.

## Backend changes

1. **Remove hidden stock serialization.** The outer website scheduler already supported two acquisitions, but its provider pool defaulted to one. Stock acquisition now defaults to two across requests, within the existing maximum. Commons metadata serialization, spacing and Retry-After behavior remain unchanged. Paid image generation remains serialized with the existing call/spending limits. An explicit `WEBPAGE_IMAGE_CONCURRENCY=1` still takes priority.
2. **Reject unsuitable metadata before downloading and encoding.** Website Commons/Pexels candidates now pass the existing identity, relevance, provenance and placement review before downloading. Commons continues to other eligible candidates rather than downloading the first broadly related image and failing only afterwards. Final decoded-dimension/placement review remains in place. Provider-cache version advances so old pre-filter results cannot suppress a new search.
3. **Decode without unused statistics.** Ordinary raster validation previously decoded every pixel to calculate channel statistics that were discarded. It now verifies decoding through a tiny raster transformation. Format, byte, pixel, minimum-size and animation limits remain. Generated-image variance checks still calculate full statistics and reject uniform images. Optimized output files are not resized or recompressed differently by this change.
4. **Reject unsuitable records before spawning an optimization worker.** Final output checks remain; this avoids processing images that cannot pass the same metadata review.
5. **Measure the remaining delay.** New packaging sub-stages distinguish image validation, file writes, ZIP generation and ZIP verification. Job records/logs distinguish queue wait and execution. Production job AI/PERF IDs use the job ID. HTTP delivery logs record response completion or client disconnect with elapsed time and HTTP status. Prompts, credentials and private artifact/job tokens are excluded from these logs. This telemetry does not measure time before the request reaches the application or browser rendering time.

## Measurements and verification

The controlled before/after benchmark used the **same saved APEX website: 24 responsive raster files, 2,730,050 image bytes**. Exported website file contents were compared byte-for-byte; ZIP integrity and image hashes were checked. These are local component measurements, not Render end-to-end times.

| Component | Before | After | Qualification |
|---|---:|---:|---|
| Three passes over all raster validations | 5.670s | 0.852s | About 6.7× faster; corrupt/truncated raster and generated-variance tests retained |
| Full packaging | 1.896s | 0.623s | About 67% less time; every extracted website file identical |
| Eight stock calls with simulated 200ms provider latency | 1.736s | 0.884s | Same eight calls; peak concurrency one → two; not a live network speed guarantee |

Evidence: `generated/webpage-speed-before.json`, `generated/webpage-speed-after.json`. Reproduce with `node tests/webpageSpeedBenchmark.mjs <label> <saved-website.zip>` using a Ledify website archive with at least twelve raster variants. The default source is the locally saved prior APEX audit archive.

A **fresh live-provider APEX generation** used the supported 1,980-character equivalent from the prior audit. It took **133.133 seconds** to its job result: content 70.526s, images 60.702s and packaging 1.154s. There was a transient planning-connection failure and a content repair. It returned usable partial output and passed HTML/ZIP/image-byte and 1,440px/390px browser checks. This run does **not** demonstrate an overall speed improvement relative to the supplied 81.420s server entry. External latency and repairs dominated it.

After the final metadata-before-download change, a **saved-content replay with live stock services** took **36.664s** to the job result, with **zero AI calls**: images 35.071s, packaging 0.888s, measured job queue wait 0.123s. It delivered four accepted photographs and reported seven missing required placements as `partial_success`. Desktop/mobile browser checks, local assets and downloaded ZIP passed. This is not a complete APEX visual acceptance pass and does not include fresh AI drafting; it cannot be advertised as a 36-second full generation or a controlled end-to-end comparison with the fresh run.

Local evidence:

- `generated/system-reliability/webpage-speed-live-2026-10-27/`: fresh generation, stage report and screenshots.
- `generated/system-reliability/webpage-speed-prefilter-2026-10-27/`: final saved-content replay, queue timings, screenshots and artifact checks.
- `generated/webpage-speed-final-checks.log`: focused pre-download, decoding, concurrency, delivery and website integration checks.
- `generated/webpage-speed-verified-tests.log`: final full regression results.

New regression cases verify wrong identities are rejected before download, truncated JPEG/PNG/WebP are rejected, generated variance checks remain strict, two stock calls overlap, paid calls remain serialized, queued jobs expose separate timing and correlated IDs, and delivery logs contain no private token. A pre-existing 20ms presentation-deadline test was corrected to accept zero provider calls when cache/filesystem work consumes the deadline before admission; it still enforces at most one call and the deadline diagnostic.

**Final regression result: 480 tests passed, zero failures, zero skips.** An additional focused run passed 15 checks for job timing, interrupted-job recovery and pipeline behavior. Interrupted processing attempts reset their queue timestamp while preserving original creation time, so the previous run is not mislabeled as queue wait after deployment. The test logs are local evidence, not Render load-test results.

## Deployment and next measurement

Deploy this revision and confirm it through the backend root `buildCommit`. If Render explicitly sets `WEBPAGE_IMAGE_CONCURRENCY=1`, it will retain serial stock acquisition; use `2` to enable the tested default. Keep existing model, image count, resolution, retry, timeout and spending settings. No frontend or hosting-plan change is included.

For the next actual frontend test, correlate the same request's browser submit/response/result-visible timestamps with backend PERF and `GENERATION_DELIVERY` entries. For async requests, also inspect `GENERATION_JOB` queue/execution timings. That is the evidence needed to locate the extra 154.6 seconds. The new logs make this possible without another round of guessing from aggregate UI waiting time.

The measured local CPU and scheduling work is improved. **The full 236-second experience is not yet proven resolved on Render**, and provider/model latency can still dominate. Do not promise a fixed generation time or trade away relevant images, validation or truthful partial-result reporting to manufacture a faster success.

## Changed files

- `controller/generateController.mjs`
- `docs/generation-performance.md`
- `docs/webpage-speed-2026-10-27.md`
- `Service/generationJobs.mjs`
- `Service/performance.mjs`
- `Service/visual/imageAssetService.mjs`
- `Service/visual/imageProviders.mjs`
- `Service/webpage/imagePipeline.mjs`
- `Service/webpage/imageProviders.mjs`
- `Service/webpage/imageStrategy.mjs`
- `Service/webpage/providerCache.mjs`
- `Service/webpageArtifactService.mjs`
- `tests/regression/premature-generation-error.test.mjs`
- `tests/regression/presentation-images.test.mjs`
- `tests/regression/webpage-speed.test.mjs`
- `tests/systemReliabilityAudit.mjs`
- `tests/webpageSpeedBenchmark.mjs`
