# Space presentation performance investigation

## Evidence from the supplied Render logs

Both attachments contain the same partial log. Two AI request streams (`1c02165f-c4bd-451c-b151-d78c5555f31e` and `d41c88c7-39d2-4393-9441-fd2fa2c53f0f`) generate the same topic concurrently. Image diagnostics also contain two generation request IDs. One caller disconnected after 8,617 ms. This is evidence of overlapping work and a lost connection, not evidence that either generation finished in 8.6 seconds.

Stock searches repeatedly reach their 12-second timeout. The relevance filter wrongly rejects an atmospheric-limb photograph taken during ISS Expedition 6 as `TOPIC_MISMATCH`, and Mars-rover photographs as `SECTION_MISMATCH`. The first case lacks recognized space vocabulary; the second matches "robotic" in the slide title but does not recognize "rover" as relevant robotic imagery.

The log also includes an npm `SIGTERM` entry. It does not identify why the process was terminated. No final `[PERF]`, export completion or terminal generation failure is present, so this excerpt cannot establish the reported eight-minute duration or isolate its full breakdown. Do not add overlapping per-call timings to calculate elapsed time.

## Backend changes

- Recognize ISS, atmospheric/Earth limb, orbit, spaceflight, spacewalks, planets, galaxies and space telescopes in independent image metadata. Recognize rovers as robotic imagery while keeping the subject-domain check, so a Mars rover cannot satisfy an industrial-robot request.
- After a stock-search timeout, stop that slide's search method instead of scheduling another complete timeout cycle. This now applies to authentic-photo requests too. The existing bounded query and alternative-candidate search remains available within the first attempt. Transient network failures retain their existing retry behavior.
- Authentic-photo requests still cannot substitute generated pictures. Missing images remain explicit in the existing warning/strict-failure contract.
- Add the exact reported prompt as a separate audit fixture and the opt-in `space10` performance case. Existing space fixtures remain intact.

## Measured verification

The exact prompt ran once through the local async HTTP API, real configured Gemini/stock providers and native export tools. Database metadata used the existing benchmark stub; this excludes MongoDB/network latency on Render. The suite was also running locally, so this is an observed run, not an isolated throughput benchmark or a Render service-level guarantee.

| Measurement | Result |
| --- | --- |
| Initial async acceptance | 118 ms |
| Observed completion | 72,349 ms |
| Backend pipeline | 71,929 ms |
| Content, including outline/review | 38,966 ms |
| Remaining image acquisition after content | 8,492 ms |
| PDF conversion | 12,313 ms |
| PNG conversion | 8,256 ms |
| Slides / PNG previews | 10 / 10 |
| Licensed photographs resolved | 6 of 6 requested |
| Missing requested images / image retries | 0 / 0 |

PPTX, PDF and all ten PNG endpoints returned HTTP 200 in the audit. Image embedding and export validation passed. The result was `completed_with_warnings`: the semantic reviewer retained one `CONTENT_CLARITY` warning about a diagram relationship on slide 4. This timing run does not certify conference-ready visual polish.

Run the opt-in live audit with `node tests/performanceAudit.mjs <unique-run-name> space10`. It uses the configured provider accounts. Detailed local reports are under `generated/performance-audit/space-performance-2026-10-27/`.

The existing frontend handoff still applies: keep the async job receipt, poll the same job, and do not start a replacement generation merely because the initial connection or local waiting period ended. Backend-only changes do not update the deployed frontend behavior.
