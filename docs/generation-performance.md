# Generation performance and background requests

All existing generation endpoints retain their synchronous HTTP 201 behavior.
Gemini 3.7 Flash and Gemini 3.5 Flash retain their existing text responsibilities.

Browser integration on Render: use background requests for long generations.
Keep the existing JSON body and send these headers to
`https://pan2-backend-ivuf.onrender.com/api/generate/textPrompt` (or any other
generation endpoint):

```http
Content-Type: application/json
Prefer: respond-async
```

On HTTP 202, resolve `data.statusUrl` against the backend origin, then GET it
every two seconds until `data.status` is `completed` or `failed`. Read the final
output from `data.result`; show its warnings and use its returned preview and
download URLs. The initial 202 has no final output yet. Do not resend the POST
while polling. For multipart uploads, let the browser set Content-Type with
its boundary. These endpoints do not require cookies; use the default fetch
credentials policy rather than `credentials: 'include'`.

CORS runs before JSON validation and exposes `Location`, `Preference-Applied`,
`Retry-After`, response-version and timing headers. Preflight accepts the Prefer
header. Node uses a 120-second idle keep-alive and a 125-second header timeout
to reduce proxy connection reuse races. These are not generation time limits.

An HTML/plain-text 502 produced by Render can lack application CORS headers
because it did not come from Express. This cannot be corrected by adding more
Express CORS headers. Check Render's runtime logs, restart events and memory
metrics at that request's timestamp. A JSON AI provider error from Ledify has
`errorCode` and `stage` and does carry CORS headers. See
[Render's 502 troubleshooting](https://render.com/docs/troubleshooting-deploys#502-bad-gateway).

For a background request, send `Prefer: respond-async` to any existing generation
endpoint, with the same JSON or multipart body. Validation, extraction and the
MongoDB request record are completed before HTTP 202 acceptance:

```json
{"message":"Generation queued","data":{"jobId":"<generated-id>","status":"queued","statusUrl":"/api/generation-jobs/<id>/<private-token>"}}
```

Poll the returned `statusUrl` every two seconds. `data.status` is `queued`,
`processing`, `completed` or `failed`. `data.progress` contains observed stages,
slide/section IDs, attempt numbers and timestamps; there is no estimated percent.
The final output uses the existing response contract under `data.result`.
For presentations, `data.artifacts.pptx.downloadUrl` becomes available after
package validation, while PDF/PNG conversion continues. PDF availability is
published separately. Do not build artifact IDs or tokens yourself.

A failed job may be explicitly retried with
`POST /api/generation-jobs/<id>/<private-token>/retry`. Saved outlines, approved
sections/slides and completed content are reused. Image caches remain validated.
Unfinished jobs recover on process restart, with at most three interrupted runs.
An unfinished PDF/PNG stage may need to rerender the saved deck; no new text
generation is needed once its completed content checkpoint exists.

The private token authorizes reading the result; do not publish or log it.

Job polling also exposes `queuedAt`, `startedAt`, `completedAt` and `timings`
(`queueWaitMs`, `executionMs`, `totalMs`). Timings describe the current attempt;
an explicit retry or resumed interrupted processing attempt resets them. `[GENERATION_JOB]` logs these measurements without
the private token or prompt. A job's ID is also its AI/PERF request ID.
`[GENERATION_DELIVERY]` records HTTP response completion and disconnected clients,
including HTTP status and elapsed time after request handling started. These
measurements exclude time before the request reaches the application and do not
measure browser rendering or iframe loading.

Website stock acquisition defaults to two concurrent requests, with an explicit
`WEBPAGE_IMAGE_CONCURRENCY=1` override for more restrictive deployments. Paid
image generation remains serialized and retains its existing call budget.
Commons metadata spacing and Retry-After handling remain unchanged. Packaging
PERF sub-stages separate raster validation, file writing, ZIP creation and ZIP
verification; their times are included in the overall packaging stage, not extra
time to add to it.
Input, checkpoints and status are written atomically under `generated/jobs` (or
`LEDIFY_JOB_ROOT`). One background job runs at a time, with at most eight pending
jobs. Capacity errors return HTTP 503 and `Retry-After`. This queue supports one
Node process/instance per storage root, not distributed workers.

Deployments must persist the entire `generated/` tree, including jobs, caches and
downloadable artifacts. With the Dockerfile's `/app` working directory, mount
storage at `/app/generated`. A disk-backed queue cannot survive the loss of that
disk. Render's default filesystem is ephemeral; Free instances cannot attach a
persistent disk and spin down after 15 idle minutes, with roughly a minute to
wake. See [Render's Free service limitations](https://render.com/docs/free) and
[persistent disks](https://render.com/docs/disks). The account's actual service
tier was not changed or inspected in this local optimization task.

Performance controls (defaults; no new dependencies or keys):

```ini
LEDIFY_AI_CONCURRENCY=6
LEDIFY_SLIDE_CONCURRENCY=4
LEDIFY_DOCUMENT_CONCURRENCY=3
WEBPAGE_IMAGE_CONCURRENCY=2
GEMINI_DOCUMENT_THINKING_BUDGET=1024
LEDIFY_RENDER_CONCURRENCY=1
```

The global text queue holds at most 32 waiting calls. Image-provider budgets,
duplicate detection, provenance, minimum resolution, retries and output QC are
retained. Approved presentation slides can acquire pictures while later text
and semantic review continue; a shared deck session prevents duplicate billing
or separate budgets. Failed text generation cancels outstanding acquisition.
Native conversions remain limited to one by default. Website image processing
keeps its existing worker/memory limits. Do not increase these limits without
checking the host's memory and provider quota.

`[PERF]` logs include stage durations, AI calls/retries/token usage and sampled
Node RSS. Concurrent stage durations overlap and must not be summed into wall
time. RSS excludes LibreOffice, Poppler and image worker processes. HTTP traces
also include extraction and MongoDB operations; service-only benchmarks exclude
client network transfer and database latency. Prompts and credentials are not
included in performance reports. API output adds `performance` metadata while
preserving existing content and download fields.

Run live measurements with `node tests/performanceLive.mjs <label>` and verify
their actual HTTP downloads with `node tests/performanceArtifacts.mjs <label>`.
Live calls use the configured account and can incur charges. Reports and outputs
are written under ignored `generated/performance/`. Retain raw failures when
evaluating a change; do not count failed or partial output as a speed improvement.
