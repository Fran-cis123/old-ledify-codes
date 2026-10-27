# Generation delivery and renewable-energy imagery

The supplied Render log for request `e5c535ef-911c-41a3-a2e3-bb1aac1cd6d1` records successful backend generation in 36,480 ms. It contains no generation error. The frontend error screen followed by an available website does not establish a backend generation failure. The precise frontend timeout or response-handling cause has not been verified.

## Backend changes

- Reject graphs, charts and other non-photographic stock metadata before accepting photographic assets, including stale records marked as photographs. Previously the renewable-energy hero accepted a consumption graph.
- Preserve concrete solar/wind/hydro/geothermal subjects in stock searches. Invalidate the older provider cache identity.
- Include `Retry-After: 2` in async acceptance and pending job responses. Job status responses remain `Cache-Control: no-store`.
- Emit `[GENERATION_DELIVERY]` when a caller disconnects before the response finishes. It contains the matching performance request ID, elapsed milliseconds and output type, with no prompt, credentials or private status URL. A disconnect is diagnostic information; it does not mark generation as failed. A timeout inside the frontend that leaves the connection open will not produce this event.

## API handoff for the frontend developer

Existing synchronous requests retain their response contract. For generation that must outlast a browser or proxy waiting limit:

1. POST the normal generation request to the backend with `Prefer: respond-async`.
2. HTTP 202 returns `data.jobId`, `data.status` and `data.statusUrl`; `Location` also contains the status URL. Retain this receipt privately. Its token grants access to the job.
3. GET `data.statusUrl` against the **backend origin**, following `Retry-After`. `queued` and `processing` are pending states, not errors.
4. When `data.status` is `completed`, consume `data.result`. A result with `status: completed_with_warnings` still contains output; show its warnings alongside that output.
5. Report a generation failure when the job explicitly returns `failed`, using its error details. A transient polling/network error or a local waiting limit does not establish that the job failed. Resume polling the retained receipt rather than submitting duplicate generation requests.
6. Resolve relative artifact URLs against the backend origin as well.

The backend cannot update the deployed frontend's waiting/error screen. That integration remains with the frontend developer. Durable job recovery also requires persistent storage for the configured job directory across service restarts.

## Verification

Regression tests exercise actual backend HTTP admission and polling with a blocked generator, successful warning results, polling resumed without duplicate generation, synchronous caller disconnection followed by successful persistence, and rejection of the exact graph metadata seen in the supplied logs. These tests use injected services and do not call paid providers or establish a new live generation success rate.
