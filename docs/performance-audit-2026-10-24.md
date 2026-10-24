# Ledify performance audit — 24 October 2026

## Measurements and limits

Real configured Gemini models, actual image providers, PPTX/LibreOffice/PNG,
website ZIP and DOCX generation were exercised through the HTTP job API. Local
database metadata used an in-memory test double, so local figures exclude MongoDB
latency. Render used its actual database and deployed code before this patch.
No models, credentials, endpoints, response contracts or image budgets changed.

One live sample per case is not a controlled speed guarantee. AI output, retry
counts, image-provider availability, cache state and native process startup vary.
The local API was already imported/listening before timing; process import time
is not included. Background acceptance time is not generation completion time.

| Local case | Before, seconds | After, seconds | AI calls / retries before → after |
|---|---:|---:|---|
| 10-slide presentation | 109.6 | 86.9 | 16 / 3 → 15 / 2 |
| 12-slide presentation | 81.0 | 82.1 | 19 / 5 → 18 / 4 |
| Multi-section website | 67.9 | 53.8 | 4 / 2 → 2 / 0 |
| 1,000-word document | 27.3 | 21.8 | 8 / 2 → 7 / 0 |

The first optimized 12-slide attempt **failed after 63.4 seconds** with
`AI_RETRY_EXHAUSTED` on `table[1][3]`. It is retained in the raw results, not
counted as a speed improvement. The successful rerun followed the table retry
guidance fix and included three embedded images. It was slightly slower than
baseline. The 10-slide baseline and after-run both had missing-image warnings
and no embedded photographs; they do not demonstrate image-provider reliability.
The website had two loaded images, and the final document had 918 words.

After-run local HTTP 202 acceptance: 61 ms (10 slides), 85 ms (12-slide rerun),
12 ms (website), 10 ms (document). These exclude production database/network
latency and are not guarantees for file/URL extraction or Render startup.

| After-run case | AI/content stage, s | Render/artifact stage, s | Peak Node RSS, MiB |
|---|---:|---:|---:|
| 10 slides | 55.52 | 17.25 | 157.7 |
| 12-slide rerun | 60.18 | 21.71 | 171.9 |
| Website | 27.39 | 26.28 | 165.8 |
| Document | 21.54 | 0.13 | 170.1 |

Presentation image resolution is a separate stage (13.91 s for the 10-slide
after-run, 0.01 s remaining after prefetch for the 12-slide rerun). Website
artifact time includes image acquisition/optimization. These columns are not
all of the stages, and overlapping image/AI durations cannot simply be summed.

## Causes supported by profiling

- AI calls and retries dominate. Before: presentation content alone took 60.2 s
  and 64.1 s; website content took 54.7 s; document content took 26.8 s. These
  stages include validation/retries, rather than pure provider compute time.
- Gemini requests for different slides/sections already overlap. Their summed
  request durations exceed wall time and must not be added to total generation
  time. The new metrics separate queue wait, provider round-trip and validation.
  Provider round-trip includes outbound network transit, not just model compute.
- Diagram calls were sequential; one baseline call took 15.25 s. Multiple
  independent semantic quality repairs were also sequential.
- Renderer table coordinates in retry hints did not identify canonical JSON
  cells. The failed 12-slide run spent three paid attempts on the same cell.
- LibreOffice and rasterization are material: the 10-slide baseline PDF/PNG
  stages took 26.36/4.91 s, versus 12.66/3.73 s afterward. Cold/warm process and
  generated-layout differences confound attributing that drop to code changes.
  Local PPTX packaging itself took only 92 ms before and 61 ms after.
- The document renderer was already cheap locally: about 160 ms before and
  128 ms after for DOCX generation, validation and HTML preview together.
  Replacing it or removing validation would not address the dominant delay.
- No major main-process CPU bottleneck was observed in the after-run samples:
  process CPU was about 3.9 s over 86.7 s for 10 slides and 1.1 s over 21.7 s for
  the document. CPU/event-loop measurements cover the whole Node process,
  including overlapping requests; child-process CPU and memory are excluded.

## Implemented changes

- `Service/ai/presentationQuality.mjs`: bounded parallel independent repairs,
  preserving commit order and the existing complete-deck review afterward.
- `Service/visual/presentationVisuals.mjs`: bounded parallel diagram planning
  and local visual resolution; retain the three-call planning budget, per-slide
  validation, deterministic slide/warning order and explicit fallback warnings.
- `Service/ai/generateJsonWithRetry.mjs`: monotonic timing separates queue,
  provider and validation; private table repair hints map to actual JSON paths;
  transient backoff honors Retry-After/Google retry-delay hints, capped at 60 s.
  Attempt limits and default backoff remain unchanged.
- `Service/ai/presentationContentBudget.mjs`: initial table guidance requests
  concise cells or fewer columns/rows while preserving exact terms and facts.
- `Service/performance.mjs`: sub-millisecond stage measurements, process CPU,
  event-loop delay/utilization, existing RSS sampling, awaited report callbacks.
- `renderer/presentation/previewRenderer.mjs`: expose render queue, PNG/photo
  validation and the existing bounded rasterization repair as separate stages.
- `Service/generationJobs.mjs`: bounded atomic rename lock retries were extended
  after a Windows EPERM failure was reproduced. No non-atomic delete fallback.
- New reusable checks: `tests/performanceAudit.mjs`,
  `tests/repairSchedulingBenchmark.mjs`, `tests/performanceOutputQa.mjs`,
  `tests/regression/parallel-repairs.test.mjs`.

No dependencies were installed. Existing bounded workers, image caches,
compression, native renderers, grounding checks and semantic review remain.
No paid infrastructure was introduced. Concurrency remains bounded by the
existing global AI admission limit. Actual project RPM/TPM quota values were
not available; concurrency alone is not a complete RPM/TPM rate limiter.

Controlled scheduler measurement: four identical 150 ms repair operations took
644.9 ms serially versus 308.6 ms at concurrency two, with identical output and
two review calls in both runs. This isolates scheduling overhead and overlap;
it is not an end-to-end Gemini speed claim.

## Verification and remaining bottlenecks

Actual PPTX, PDF, every returned slide PNG, website preview/ZIP and DOCX
preview/download were retrieved over HTTP. All returned artifact URLs responded
200. Desktop/mobile browser checks found no broken website images or horizontal
overflow at actual 1280/390 px website frame widths. Document previews also
loaded at desktop/mobile widths. PPTX/DOCX packages were inspected and contact
sheets/screenshots saved. Editorial review still applies; acquisition metadata
and embedding checks do not establish that every picture is a suitable photograph.

Raw metrics, the failed run, package checks and screenshots are under ignored
`generated/performance-audit/`. Baseline code was already loaded before production
edits. Image/native caches were not cleared. Runs are therefore not cold-cache,
paired-output or statistical benchmarks. The report retains these limitations.

Final regression run: **373 passed, zero failed**. The preceding full run
reproduced an atomic job-status rename lock failure on Windows; its bounded
retry fix was included before the final run. The new concurrency checks verify
ordered repairs, in-flight draining on failure, the three-diagram budget,
provider retry hints and timing counters.

Render document comparison: 79.6 s observed end-to-end, including 42.0 s before
202 acceptance; reported server generation 37.5 s, AI stage 35.1 s, local artifact
work about 2.4 s. That sample used 13 AI calls, unlike the local sample's eight
before/seven after, so it is not an isolated CPU comparison. Render logs/metrics
are needed to distinguish wake-up, database, queue and network admission delay.
The service tier and native child-process memory were not inspected.

## Render and Postman

Deploy the latest commit. No new environment values are required.
`LEDIFY_DIAGRAM_CONCURRENCY=2` is the new default; set it to 1 to serialize
diagram resolution. Retain existing AI/slide/document/image concurrency limits
until production CPU, child-process RAM and provider quotas support an increase.
Changing text models requires a separate approved decision.

Background jobs already exist and do not require BullMQ/Redis. They support one
Node process per storage root. Persist the entire `/app/generated` directory for
jobs, checkpoints and downloads across deployments; an ephemeral filesystem
cannot provide that guarantee. Do not scale multiple independent instances
against this local queue. Paid disks or Redis require a separate infrastructure
decision. Background jobs improve responsiveness, not Gemini completion time.

Postman:

1. POST `https://pan2-backend-ivuf.onrender.com/api/generate/textPrompt` (or local
   `http://localhost:5000/api/generate/textPrompt`). Use the same existing JSON
   body, `Content-Type: application/json` and `Prefer: respond-async`.
2. Expect HTTP 202 with `data.jobId` and `data.statusUrl`. GET that returned path
   against the same backend origin every two seconds; do not resubmit the POST.
3. Observe `data.status` and `data.progress`; on completion use `data.result`
   and its returned preview/download URLs. Show warnings. On failure inspect
   `data.error`. For files use the existing `/api/generate/file` multipart file
   field and let Postman set the multipart boundary; only PDF/DOCX are accepted.
4. Without Prefer, the existing synchronous HTTP 201 contract remains intact.

Repeat local benchmarks with `node tests/performanceAudit.mjs <new-label>`.
Supply a third argument to select one case, e.g. `presentation12`. These are real
billable provider calls; preserve prior labels rather than overwriting evidence.
