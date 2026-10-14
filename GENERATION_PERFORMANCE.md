# Generation latency improvements

## Implemented

Presentation slide content now runs in batches of four independent AI requests instead of one request at a time. Word document sections run in batches of three. Outline planning precedes drafting, and the whole-output quality review runs after all content is assembled. Webpage planning and drafting remain dependent stages and retain their existing sequence.

Each batch reads a stable snapshot of earlier completed batches plus the complete outline and original source. Results are committed in outline order. Each item retains its own validation and bounded retry, so one invalid slide does not regenerate successful siblings. Failed batches wait for in-flight requests to settle and do not start later batches or return incomplete output. Document checkpoints remain ordered. Final quality review can still repair repetition or inconsistencies across concurrently drafted sections.

Concurrency limits apply per generation request. This increases simultaneous provider requests without increasing normal call count; provider quotas and simultaneous users can still cause rate-limit retries. Operators can select serial mode or lower concurrency when needed. No model changes, reduced content budgets, skipped reviews, shared result caches or new dependencies were introduced.

Optional server environment settings (integers 1–6):

```dotenv
LEDIFY_SLIDE_CONCURRENCY=4
LEDIFY_DOCUMENT_CONCURRENCY=3
```

Defaults already activate the optimizations; no environment changes are required. Restart the backend to load updated code. These settings are server configuration, not public request options.

## Timing evidence

New `data.result.timings` reports milliseconds for `aiMs`, `renderMs`, and `totalMs`. Presentations also report `layoutMs` and `visualsMs`. The HTTP `Server-Timing` header exposes the same measurements. Total covers the generation service; source extraction, database writes and network transit add to the complete HTTP duration. Timing metadata contains no source text or credentials.

The controlled ten-slide benchmark used the actual AI orchestration with a mocked provider taking 100 ms per call. Both runs made 12 calls and retained the quality review:

| Scheduling | Measured AI orchestration |
|---|---:|
| Sequential | 1,429 ms |
| Four slides concurrently | 549 ms |

That is a 62% reduction in this synthetic run. It excludes real Gemini variability, images and artifact rendering. It is not a live end-to-end latency claim. Reproduce with `node tests/generationLatencyBenchmark.mjs`; results are written to `generated/generation-latency-benchmark.json`.

The user's prior FarmBridge terminal report showed roughly 18 seconds for outline planning alone, multiple 4–9 second slide requests, and another 13 seconds for diagram planning. A fresh fully reviewed ten-slide presentation with PDF/PNG conversion therefore has no demonstrated five-second completion time. Parallel drafting removes a substantial sequential bottleneck, but cannot guarantee that target. Returning an early job acknowledgment would measure a different outcome and is not represented as completed generation.

## Verification and changed files

Full regression suite: **199 passed, zero failed**, saved to `generated/performance-regression-tests.txt`. After the final HTTP timing-header addition, all **14 document tests** passed again. New tests verify actual concurrent slide/section calls, ordered content and checkpoints, full quality review, serial configuration, bounded concurrency and draining failures before returning.

- `Service/ai/concurrency.mjs`: bounded batch scheduling.
- `Service/aiService.mjs`: concurrent slide drafting.
- `Service/document/documentGeneration.mjs`: concurrent section drafting.
- `Service/generateService.mjs`: measured stage timings across all three outputs.
- `controller/generateController.mjs`: HTTP timing header.
- `tests/regression/performance.test.mjs`: concurrency and failure regressions.
- `tests/regression/ai.test.mjs`: provider fixtures respond by schema rather than relying on sequential call completion.
- `tests/regression/documents.test.mjs`: API timing verification.
- `tests/generationLatencyBenchmark.mjs`: repeatable synthetic scheduling benchmark.
