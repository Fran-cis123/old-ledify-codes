# Backend generation reliability audit — 27 October 2026

## Outcome and scope

This change repairs shared validation, repair feedback, image acceptance, result reporting, startup readiness and an unnecessary presentation AI call. It includes backend website rendering and browser checks. No frontend code was changed. Existing providers, configured models, public generation endpoints, retry ceilings and paid image-generation budgets remain in place.

This is ready for controlled backend UAT after deployment verification. It is **not evidence that every request will succeed**, nor that the existing frontend error screen has been fixed. APEX remains a partial result when requested photographs are unavailable or exceed the bounded asset budget. Artifacts existing and all user requirements being satisfied are different checks.

## Evidence and root causes

1. **The supplied Render APEX failure was generated-content validation, not input length.** Planning succeeded; three content attempts failed validation and ended in `AI_RETRY_EXHAUSTED` after 36.176 seconds, before image acquisition or rendering. A controlled local reproduction failed in 39.878 seconds. Illustrative product collections were treated as unsupported real inventory; gallery captions were treated as newly invented offerings. The numeric validator also treated identifiers such as V12 as quantitative claims.
2. **Repair feedback could expose one defect at a time.** A draft repaired one field and encountered another on the next attempt. The patch collects relevant semantic and numeric defects and requested-name omissions into the bounded repair loop. Structural/schema constraints still apply; unsupported factual claims are not silently accepted.
3. **Broad topic overlap admitted unsuitable photographs.** Metaphorical automotive “architecture” admitted buildings; matching a brand did not establish a suitable view. Live inspection found unrelated buildings, a police vehicle, a hood ornament and a showroom photograph. Search filters alone were insufficient because cached records could bypass them. Final image acceptance now checks identity, context and requested automotive detail views, including cached assets. Metadata is evidence, not computer-vision certification.
4. **A literal text-only deck made an unnecessary diagram-planning AI call.** The recorded visual stage took 16.629 seconds. Replaying the same content with the fix reduced that stage to 0.331 seconds with zero AI calls. “No photography” still allows requested diagrams; only literal text-only/no-image directions disable this planner.
5. **Required-image omissions could be presented as completed with warnings.** Available downloads now carry `partial_success` if required images are missing. Strict completeness policy continues to return an incomplete result/HTTP 422. Missing image descriptions remain visible without broken image placeholders.
6. **Database discovery delayed HTTP binding.** The supplied log includes a Render port scan failure. The server now binds first and gates generation until MongoDB and persisted-job recovery are ready. `/healthz` is liveness; `/readyz` is readiness. The SIGTERM entry alone does not establish why Render stopped that instance. Render requires binding on `0.0.0.0` and honoring its assigned port: [official port-binding documentation](https://render.com/docs/web-services#port-binding).
7. **AI and overall performance logs used different IDs.** They now share the active request performance ID so stages can be correlated. Safe validation metadata is returned instead of a generic failure or raw private model draft.

The user's actual submitted prompt was shortened to 2,000 characters. The literal pasted APEX fixture is 2,169 characters; the fresh live audit used a 1,980-character equivalent by removing two repeated visual-style sentences while preserving the substantive collection and image requirements. That is not claimed to be an exact reproduction of the user's edited text. A separate presentation live case exercised exactly 2,000 characters. Whitespace removal is not required for otherwise valid inputs.

## Implementation

### Content and bounded recovery

- Section-level illustrative scope applies to collection cards; decorative gallery captions are not inventory assertions. Fabricated credentials, business claims and unsupported measurements still fail.
- Letter/digit identifiers are separated from measured numbers, percentages and dates. This lexical rule does not independently verify specifications.
- Explicit lists of proper labels following “featuring” or “including” receive a generic coverage check, tested across automotive, people and device examples. No brand-specific generation template was added.
- Semantic validation reports multiple actionable fields to the next repair. Attempts remain bounded. Exhausted validation returns safe HTTP 502 metadata: stage, field, rule, request ID and last error code.
- Permanent payment/billing failures stop immediately; transient rate limits retain bounded recovery. Image providers disabled for the request are not repeatedly called. This follows the distinction between recoverable and nonrecoverable provider failures described in [Gemini troubleshooting](https://ai.google.dev/gemini-api/docs/troubleshooting).

### Images, presentation work and output integrity

- Explicit photographs and exact-object requests cannot be satisfied by generated images pretending to establish a real model's identity. Concept scenes retain the separate concept-image path.
- Exact-object checks require independent metadata. Automotive component galleries require evidence of the requested view. Unrequested military/police vehicles, detail-only images and showroom buildings cannot satisfy exterior vehicle cards. Cached records pass the same final checks; provider cache version is advanced.
- Default website asset allowance is eight, within the pre-existing maximum of eight; default paid image budget remains two. Asset and time limits remain bounded. More than eight required placements can legitimately yield partial output.
- Existing exact-slide-count, typography, rendering, embedded-media, PDF/PNG and technical-image-label protections remain covered by regression tests. This patch does not attribute all earlier presentation fixes to the new code.
- Website design profiles, palettes, contrast tokens, responsive headline treatment, editorial compositions and browser interaction checks are included. Explicit caller design choices retain precedence.

### Delivery and startup

- Async admission and persisted job recovery remain available; execution completion does not imply requirement completeness. Inspect the nested result status.
- Generation during startup receives HTTP 503 `SERVICE_NOT_READY` and Retry-After. Opening a port does not claim database readiness. Recovery failure is a startup error.
- Storage persistence, multi-instance behavior and MongoDB connectivity on Render still require deployment verification. A local metadata stub does not test the production database.

## Verification

The deterministic suite exercises valid/invalid prompt boundaries, extraction and URL safeguards, schema repair, transient failures, permanent billing failures, count/typography contracts, required-image outages, safe responses, durable jobs and export failures. The full regression run passed **475/475 tests**, with zero failures or skips. The final image-detail refinements were then checked by **12/12 targeted tests**. Logs: `generated/system-regression-final.log` and `generated/system-image-final.log`.

Five fresh live-provider cases used local HTTP async admission, real AI/stock services and native exports, with a metadata database stub. Checks downloaded and inspected the actual artifacts. Websites were checked in headless Edge at 1,440px and 390px for overflow, broken images, navigation and mobile-menu operation. ZIP images were compared byte-for-byte with preview assets.

| Case | Fresh elapsed | Result | Artifact checks |
|---|---:|---|---|
| APEX website, supported equivalent | 63.179s | Partial | HTML, CSS, JS, ZIP and image delivery passed; initial image semantics failed human review |
| Public URL → text-only website | 16.289s | Completed with warnings | Extraction, site, ZIP, desktop/mobile checks passed |
| Uploaded DOCX → water report | 26.126s | Completed | Word, readable PDF and preview passed |
| Astronaut presentation, three slides | 33.750s | Completed | Exact count, real embedded cover photo, PPTX, PDF and three PNGs passed |
| Exactly 2,000 characters → ten-slide text-only deck | 67.414s | Completed with warnings | Exact count, PPTX, PDF and ten PNGs passed |

The five cases produced five artifact sets, four completed results and one partial result; no terminal generation failure. Average was 41.352s, median 33.750s and descriptive p95 67.414s. This tiny, deliberately selected sample is not a production success-rate estimate. Initial APEX image-semantic defects were found despite artifact checks passing and were repaired afterwards; the initial run is not counted as a complete visual-quality pass.

A fresh APEX retest recovered content in 46.142s with one repair, compared with three failed content attempts in the baseline. It preserved all seven requested brand names but remained partial. Later saved-content replays isolate image acceptance and export behavior; their timings exclude AI drafting and must not be advertised as fresh end-to-end generation speed. The final replay took 3.372s with zero AI calls, delivered four accepted photographs and explicitly reported seven missing required placements. HTML/ZIP/local assets and both browser widths passed. This is a partial result, not a complete visual acceptance pass. Final acceptance rejects inappropriate cached photographs instead of inserting them to manufacture completeness.

The ten-slide controlled replay measured only the visual stage improvement from 16.629s to 0.331s. Its 18.563s total excludes content generation and is not comparable to a fresh request total. No claim of a universal eight-minute-to-seconds speedup is made.

Local evidence (excluded from Git because it contains request/artifact details):

- `generated/performance-audit/system-audit-before-2026-10-27/`: captured rejected content and baseline.
- `generated/system-reliability/final-2026-10-27/report.json`: five fresh cases.
- `generated/system-reliability/apex-final-2026-10-27/report.json`: fresh APEX retest.
- `generated/system-reliability/apex-verified-2026-10-27/report.json`: final saved-content image checks and desktop/mobile screenshots.
- `generated/system-reliability/final-2026-10-27/text-only-replay.json`: controlled visual-stage benchmark.
- `generated/system-regression-final.log`: final regression totals.

## Deployment and frontend handoff

1. Deploy the backend revision; confirm the running revision, configured PORT/host, `/healthz`, `/readyz`, MongoDB access and persistent job/artifact storage. Verify recovery across an intentional restart with a test job. This audit has not deployed or certified the new revision on Render.
2. The frontend developer should use async job admission/polling for long jobs, respect Retry-After, retain the job receipt, and distinguish `partial_success`, incomplete and failed results. Do not turn a polling timeout/client disconnect into a definitive generation failure. No frontend changes were made here.
3. Display available partial downloads together with the missing required components. Offer a bounded retry or user-supplied authorized reference images. Confirm this end-to-end with the frontend developer before release.
4. Confirm provider entitlements and native export tools on Render. Local provider success does not prove production key/quota availability. Do not repeatedly retry billing or invalid-credential failures.

## Remaining limits and UAT decision

Controlled backend UAT is justified by the regression suite and cross-format live checks. Full production acceptance remains conditional on deployment and frontend integration. APEX still does not satisfy every requested photograph; the server reports that honestly. Exact model/view photographs, provider outages, authenticated or inaccessible URLs, unsupported files, conversion availability and bounded budgets can still prevent complete output. Source-grounded facts and subjective design quality need review. This change removes reproducible shared failure mechanisms; it does not promise unlimited generation, automatic factual verification or 100% availability.

## Changed files

- `controller/generateController.mjs`
- `docs/system-reliability-audit-2026-10-27.md`
- `renderer/webpage/components.mjs`
- `renderer/webpage/designSystem.mjs`
- `renderer/webpage/styles.mjs`
- `renderer/webpage/webpageRenderer.mjs`
- `Service/ai/generateJsonWithRetry.mjs`
- `Service/ai/numericClaims.mjs`
- `Service/ai/requestedLabels.mjs`
- `Service/ai/webpageGeneration.mjs`
- `Service/aiService.mjs`
- `Service/document/documentGeneration.mjs`
- `Service/generateService.mjs`
- `Service/performance.mjs`
- `Service/visual/imageAssetService.mjs`
- `Service/visual/imageIdentity.mjs`
- `Service/visual/imageProviders.mjs`
- `Service/visual/imageRelevance.mjs`
- `Service/visual/presentationImageAssets.mjs`
- `Service/visual/presentationVisuals.mjs`
- `Service/webpage/browserChecks.mjs`
- `Service/webpage/contentGrounding.mjs`
- `Service/webpage/designProfiles.mjs`
- `Service/webpage/imagePipeline.mjs`
- `Service/webpage/imageReview.mjs`
- `Service/webpage/imageStrategy.mjs`
- `Service/webpage/providerCache.mjs`
- `Service/webpage/qualityWorker.mjs`
- `Service/webpage/visualTokens.mjs`
- `Service/webpageContentValidator.mjs`
- `Service/webpageDesignService.mjs`
- `Service/webpageStaticValidator.mjs`
- `Service/webpageThemeService.mjs`
- `src/app.mjs`
- `src/server.mjs`
- `src/serverConfig.mjs`
- `src/serverLifecycle.mjs`
- `templates/webpage/webpageSchema.mjs`
- `tests/fixtures/apexMotorsRequest.json`
- `tests/performanceAudit.mjs`
- `tests/regression/presentation-image-outages.test.mjs`
- `tests/regression/systemic-reliability.test.mjs`
- `tests/regression/webpage-concept-delivery.test.mjs`
- `tests/regression/webpage-design-system.test.mjs`
- `tests/systemReliabilityAudit.mjs`
- `tests/textOnlyReplayBenchmark.mjs`
- `tests/webpage/designQualityAudit.mjs`
