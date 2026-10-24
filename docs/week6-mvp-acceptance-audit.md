# Ledify Week 6 MVP acceptance audit

Audit date: 24 October 2026 (Africa/Lagos). Source: `C:\Users\HP\Downloads\Ledify_AI_Week6_MVP_Feature Acceptance Review.xlsx`, sheet `Week 6 MVP Acceptance`, cells A1:H33. All nonempty cells inspected, including priorities, evidence, gaps, actions, owners, gates, four blockers and decision. One visible sheet, no hidden sheets or comments. The workbook's 83.3% QA pass rate is historical source evidence, not this audit's test rate. Original workbook unchanged.

## Initial code comparison, before this audit's fixes

The workbook groups LED-10–12, LED-13–15 and LED-16–19. It does not assign an individual title inside those groups. The IDs below preserve that uncertainty rather than inventing an authoritative mapping.

| ID | Source row / priority / owner / gate | Implementation and initial gap |
| --- | --- | --- |
| LED-01 | 9 / MUST / Frontend + Product / UI retest | This repository is backend-only. Landing page, last CTA and icon refinement cannot be verified or fixed here. API root is intentionally JSON. |
| LED-02 | 10 / MUST / Frontend + Product / Regression | Prompt fields and blank checks exist. Backend does not enforce the accepted 10–2,000 limits consistently. User confirmed backend enforcement for this audit. |
| LED-03 | 11 / MUST / Frontend + Backend / Limit test | Multer and extraction enforce PDF/DOCX signatures and 50 MiB maximum. Need exact boundary HTTP tests. Source mentions DOC/PPTX, conflicting with prior explicit PDF/DOCX-only policy. User confirmed files below 1 MB remain accepted. |
| LED-04 | 12 / MUST / Backend + Product / URL retest | Public HTTP(S), pinned DNS, SSRF, redirects, time and byte limits implemented. No specific login/paywall detection. Network errors can become generic failures. |
| LED-05 | 13 / MUST / Frontend + Product / Regression | Three output values validated on every generation route. No/single selection UI requires frontend verification. |
| LED-06 | 14 / MUST / Backend + Product / Performance retest | Bounded concurrent AI, caching, image prefetch, timings and opt-in durable jobs exist. Prior fresh full-output measurements exceed 10 seconds; queue acknowledgement is not finished generation. |
| LED-07 | 15 / MUST / Backend + Product / Quality retest | PPTX, PDF, PNG and image embedding checks exist. Contextual briefs and metadata/license/relevance filters exist. Human image relevance and speed still need acceptance. |
| LED-08 | 16 / MUST / Backend + Product / Export retest | Canonical content, DOCX generation and HTML preview exist. No document PDF export or selection contract. |
| LED-09 | 17 / MUST / Backend + Product / Quality retest | HTML/CSS/JS, responsive image assets, preview and ZIP exist. Image relevance and full generation speed require new evidence/human review. |
| LED-10 | 18 / MUST / Frontend + Product / Regression | Member of preview group: presentation PNG/PDF, webpage sandbox viewer, document HTML routes exist. Document preview blocks a separate frontend origin. Navigation UI is outside this repo. |
| LED-11 | 18 / MUST / Frontend + Product / Regression | Same source group; exact individual mapping unspecified. Verify webpage preview and HTTP image delivery plus frontend embedding. |
| LED-12 | 18 / MUST / Frontend + Product / Regression | Same source group; exact individual mapping unspecified. Verify document preview and capability-token protection plus frontend embedding. |
| LED-13 | 19 / MUST / Frontend + Backend / Export retest | Member of download/export group: presentation PPTX/PDF download routes exist. Verify bytes, content type and frontend URLs. |
| LED-14 | 19 / MUST / Frontend + Backend / Export retest | Same source group; exact individual mapping unspecified. DOCX exists; document PDF/format workflow missing. |
| LED-15 | 19 / MUST / Frontend + Backend / Export retest | Same source group; exact individual mapping unspecified. Webpage ZIP exists with asset integrity validation. |
| LED-16 | 20 / SHOULD / Product + Dev / Usability test | Feedback/recovery group: validation errors and safe provider diagnostics exist. Protected/unreachable URL messages incomplete. Individual source feature title unspecified. |
| LED-17 | 20 / SHOULD / Product + Dev / Usability test | Same group: async status polling and stage checkpoints exist. Frontend loading UI is unverified. |
| LED-18 | 20 / SHOULD / Product + Dev / Usability test | Same group: incomplete-image status/draft links and bounded retry exist. User-facing failure UI requires frontend usability testing. |
| LED-19 | 20 / SHOULD / Product + Dev / Usability test | Same group: persisted job retry and approved-content recovery exist, conditional on durable storage. Frontend recovery flow unverified. |
| LED-20 | 21 / COULD / Frontend / Post-core MVP | Drag-and-drop is a frontend enhancement. Existing multipart file field supports it; no new backend endpoint is necessary. Not a final MVP blocker. |

Initial findings are based on code inspection; working status requires the tests/evidence recorded below. Source decision at rows 29–33 remains conditional, requiring Must Have fixes, targeted retest, confirmation, then Week 7 UAT review. This audit cannot grant Product acceptance or certify an unavailable frontend.

## Confirmed policy and scope

- User confirmed backend textPrompt validation at 10–2,000 characters. Surrounding whitespace is excluded. Internal PDF/DOCX/URL source text retains its separate 200,000-character limit; it is not shortened to the prompt limit.
- User's final correction explicitly allows valid files below 1 MB. The maximum remains 50 MiB (52,428,800 bytes, labelled 50 MB in the existing API). The frontend should use the same byte limit.
- Existing explicit PDF/DOCX-only input policy is preserved. DOC, PPTX, TXT and images remain unsupported uploaded source formats. The workbook's DOC/PPTX wording needs Product/QA reconciliation; no obsolete formats were silently enabled.
- User clarified that this work is backend-only. Frontend URL supplied: https://ledify-frontend.vercel.app/ . Browser access was declined, and the user subsequently directed that frontend work be left to the frontend developer. No frontend UI was inspected or changed.
- No new optional product scope, AI models, credentials, dependencies or paid infrastructure were added.

## Fixes and confirmed causes

1. **Prompt boundary mismatch.** Dedicated prompt requests only checked presence, while combined requests allowed 20,000 characters. A shared validator now enforces the confirmed limits on both prompt/combined paths before extraction or paid generation. Empty/invalid output selections remain rejected.
2. **Protected URL feedback missing.** Extraction removed forms/scripts without first checking access gates, and upstream/DNS errors lost useful classification. It now detects password-gated pages and explicit subscription/paywall markers before extraction. HTTP 401/402/403, 404/410/5xx, rate limits, DNS/network failures and timeouts produce safe, actionable codes. No authentication/paywall bypass is attempted. Existing SSRF, redirect, DNS-pinning and size limits remain.
3. **Document PDF export absent.** Only DOCX and HTML were produced; there was no document PDF route or format-selection contract. PDF now converts the exact saved DOCX through installed LibreOffice Writer, validates parsed PDF pages/text, saves atomically, coalesces concurrent requests, and uses the existing native-render capacity bound. DOCX-only generation does not incur PDF conversion. Failed PDF conversion preserves Word and preview links and never marks the export completed, including background jobs.
4. **Cross-origin document preview blocked.** The document route always sent SAMEORIGIN and frame-ancestors self. It now permits a specifically configured frontend origin while retaining capability-token authentication, escaped content and a restrictive CSP. No origin is reflected from arbitrary requests; deployment configuration is still necessary.
5. **Topic contamination reproduced.** The fresh educational space website inherited “learning environments, library” subjects from an industry fallback. Specific image direction now takes precedence over generic industry defaults; caller photo subjects still take precedence over both.
6. **Required/optional image mismatch reproduced.** The local image configuration allowed one generated website image, but an inferred supporting layout image was also marked required. The first fresh website job correctly reported incomplete, despite delivering a valid hero. Inferred supporting section images are now optional unless explicitly required or requested for every section. Hero/gallery/explicit mandatory requests remain enforced. Mandatory targets are scheduled before optional ones, and budget skips are logged. No budget was raised and no missing mandatory image was disguised as success.

Changed backend files: `Service/input/{promptValidation,combinedInput,publicUrl}.mjs`, `Service/urlService.mjs`, `Service/document/{documentPdfService,documentArtifactService}.mjs`, `Service/{generateService,generationJobs}.mjs`, `Service/webpage/{imageStrategy,imagePipeline,websiteBrief}.mjs`, `controller/{generateController,documentAssetsController}.mjs`, `renderer/document/documentPreview.mjs`, `route/generateRoute.mjs`. Tests: new `tests/regression/week6-mvp.test.mjs` and `tests/week6LiveAudit.mjs`; existing documents, image-reliability and authentic-photo tests updated. Native binaries were already included in Dockerfile; no dependency change.

## Final feature-by-feature backend assessment

“Verified” below means the specified backend evidence passed, not Product sign-off or a claim about the real frontend. Source acceptance results are retained separately in the appendix.

| ID | Implemented and verified backend behavior | Fix / backend remainder | Frontend / Product action before UAT |
| --- | --- | --- | --- |
| LED-01 | API root intentionally serves backend metadata. No marketing landing page implemented in this repo. | No backend defect identified for the final CTA/icon requirement. | **Unverified/outside scope:** restore last CTA, agreed icons and test page/input CTAs. Owner Frontend + Product. |
| LED-02 | **Verified:** empty, whitespace, type errors, 9/10/2,000/2,001 boundaries on both text and unified endpoints, all three outputs. | **Fixed:** inconsistent backend limits. No remaining demonstrated backend boundary defect. | Retest UI counters, disabled submit and exact displayed messages against the backend limits. |
| LED-03 | **Verified:** small valid PDF/DOCX; exact 1 MiB and 50 MiB multipart admission; maximum+1 rejection; unsupported/MIME/signature/invalid-package cases; normal real extraction across output pipelines. | Existing validation retained. Boundary tests inject extraction to isolate admission; they do not certify rendering arbitrary 50 MiB inputs under Render Free memory limits. | Picker, remove/replace remain unverified. Reconcile DOC/PPTX source wording and binary MB limit with QA. Conduct deployed large-file/load retest. |
| LED-04 | **Verified:** public extraction, malformed/private URL protections, login/paywall fixtures, upstream 401/402/403/404/429/503, native connection failure and timeout propagation, failure then correction without AI on failed sources. Real public and nonexistent-domain checks passed. | **Fixed:** access classification and meaningful feedback. **Partial:** heuristics cannot recognize every JavaScript/custom paywall or anti-bot screen. | Show returned message and alternatives; test agreed real protected sites with Product. Backend never signs into sources. |
| LED-05 | **Verified:** exactly presentation/document/webpage; omitted, empty, array/multiple and unsupported output values rejected. Existing endpoints preserved. | No demonstrated backend selection defect. | No-selection prevention and single-selection UI require frontend regression. |
| LED-06 | **Partial:** real timings, bounded scheduling, overlapping slide-image acquisition, caches and async acceptance/polling verified. | **Open blocker:** fresh complete generation is not within 5–10 seconds. Async acknowledgement is not generation completion. No false performance acceptance. | Product must retain the gate or explicitly agree revised completion/feedback thresholds; frontend should use jobs/loading state for long requests. |
| LED-07 | **Partial:** real five-slide generation, two topic-relevant conceptual images physically embedded, PPTX/PDF/all PNGs verified; all five slides inspected. | Prior reliability controls retained. Fresh case completed; broader image relevance, subjective quality and speed remain open acceptance gates. | Product review across agreed topics and licensed-photo scenarios; frontend slideshow/navigation retest. |
| LED-08 | **Verified backend, UAT pending:** structured content, Word and HTML retained; PDF selected through actual generation/job flow and validated as a two-page PDF. | **Fixed:** PDF/export selection. Content quality and factual review remain Product responsibilities. | Bind export choice to exportFormat and review generated document/PDF alongside preview. |
| LED-09 | **Partial:** real responsive site, local WebP, ZIP byte equality and no 1440/390 px horizontal overflow verified; topic-relevant hero inspected. | **Fixed:** generic-subject contamination and inferred-image/budget mismatch. One configured generated image means supporting imagery can be absent with explicit warnings. Speed still exceeds threshold. | Product judges image density/relevance/design. No arbitrary subjects or unlimited-budget promise. |
| LED-10 | **Preview-group backend verified:** presentation PNG URLs, PDF and download contract tested; five real slide PNGs inspected. | No demonstrated PNG/backend preview regression. Exact individual source mapping is unspecified. | Presentation navigation, embedding and controls unverified here. |
| LED-11 | **Preview-group backend verified:** actual webpage HTML, image MIME/bytes and ZIP assets pass. | No broken local hero references in the tested site; persistent lifecycle depends on storage. Exact source mapping unspecified. | Frontend viewer/iframe remains its developer's responsibility; use returned API URLs. |
| LED-12 | **Preview-group backend verified:** document HTML and token checks, CSP configured-origin behavior, safe content and both export links tested. | **Fixed:** unconditional same-origin-only framing. Deployment needs configured exact origin. Exact source mapping unspecified. | Frontend developer must retest its iframe after origin configuration. |
| LED-13 | **Download-group verified:** real PPTX, presentation PDF and five PNGs fetched; media/preview quality gates pass. | No demonstrated backend presentation-download defect in fresh test. Exact source mapping unspecified. | Resolve relative links against backend origin; do not embed PPTX as a browser preview. |
| LED-14 | **Download-group verified:** default DOCX preserved; PDF route and query alias, selection, correct MIME/disposition, content parity, cache/coalescing, invalid token/format and converter failure tested. | **Fixed:** missing document PDF and failure reporting; PDF errors preserve draft Word/HTML. Exact source mapping unspecified. | Use selected download URL, read PDF availability/error, offer Word fallback truthfully. |
| LED-15 | **Download-group verified:** ZIP CRC and real local image byte comparisons with preview; new real export fetched. | Existing ZIP support preserved. No backend export mutation. Exact source mapping unspecified. | Download/unzip/open locally, verify filename and assets in target browsers. |
| LED-16 | **Feedback-group verified:** validation/source failure codes and CORS-readable actionable messages, no AI invocation for bad inputs. | Protected/unreachable feedback fixed. Exact individual source title unspecified. | Show returned error/message rather than generic “failed”; Product usability test. |
| LED-17 | **Feedback-group partial:** 202 acceptance, job polling and real completion states verified. | No invented progress percentage. Loading UI is absent from backend by design. Exact title unspecified. | Implement/verify queued, processing and completed states; distinguish acknowledgement from completion. |
| LED-18 | **Feedback-group verified backend:** explicit incomplete-image/PDF errors, draft links, 429/503 advice, converter failure and recovery checks. | Safe failure behavior retained/extended. External providers remain fallible. Exact title unspecified. | Display incomplete status/warnings and valid fallback links; do not show success for failed required assets. |
| LED-19 | **Feedback-group partial:** persisted job retry, source restoration, approved-content reuse and restart tests on retained filesystem pass existing regression. | PDF failure is retained as failed, not completed. Actual durability is blocked by ephemeral deployment storage unless configured. Exact title unspecified. | Retry/polling UI and real restart UAT require frontend/operations retest. |
| LED-20 | **Optional, not implemented as a UI:** backend multipart support already accepts a file submitted by drag-and-drop or picker. | No extra backend route or optional scope added. | Frontend may implement later; not an MVP acceptance blocker. |

## Test evidence

- **Full regression:** 406 passed, zero failed, zero skipped. Log: `generated/week6-final-regression.log`. Includes the prior working backend's regression coverage plus new MVP cases.
- **Targeted verification:** 10 passed, zero failed. `tests/regression/week6-mvp.test.mjs` covers prompt/output boundaries, both file formats and upload limits, protected/unreachable URL extraction and HTTP feedback, correction, real document PDF/Word/preview, export failure and cache/coalescing. The final targeted log also covers failed PDF jobs retaining their Word output: `generated/week6-final-targeted.log`.
- **Real AI and renderers:** `node tests/week6LiveAudit.mjs audit-2026-10-24`, followed by a website-only rerun after the reproduced planning fixes. No fixture AI was used in these runs. Local request-record metadata was stubbed, so these are not MongoDB/Render latency measurements. A background poll interval of 500 ms adds sampling delay. Some regression work ran concurrently on this workstation, so these are observed timings rather than controlled model benchmarks.
- **Fresh generation outcomes:** initial presentation and document completed; initial website returned incomplete (retained as failure evidence). After fixing its actual cause, the website rerun completed with warnings and no required missing images. That is three successful attempts out of four overall, not a 100% provider-availability claim. All four attempts' available artifacts passed their technical fetch checks; this does not make the incomplete first website accepted.
- Existing regression covers PDF/DOCX extraction and combined prompt/file/URL requests for all three outputs, text/provider retry limits, presentation native render/media validation, website HTTP/ZIP delivery, CORS, URL SSRF/pinned DNS/redirects, signed artifact URLs, async persistence/recovery and image outages/corruption/concurrency. Those are not frontend UI tests.

Evidence directory `generated/week6-uat/audit-2026-10-24/` contains `report.json`, canonical result JSON, actual PPTX/PDF/ZIP/DOCX, five slide PNGs, two document PDF-page PNGs and website desktop/mobile screenshots. `generated/week6-uat/website-retest-2026-10-24/` contains the corrected website result/report/ZIP and new desktop/mobile screenshots. All are local ignored QA artifacts; no credentials were committed. Visual review confirms readable/nonblank exports and relevant spacecraft/lunar imagery in these samples, not universal factual/visual certification.

## Measured performance and remaining speed gate

| Fresh request | 202 admission | Observed finished job | Content | Render/artifact | Acceptance against ≤10 seconds |
| --- | --- | --- | --- | --- | --- |
| Five slides, two original conceptual images | 63 ms | 66,502 ms | 40,113 ms | 26,106 ms | Not met |
| Website, initial incomplete attempt | 170 ms | 41,832 ms | 28,554 ms | 12,884 ms | Not met; failed image requirements |
| Document requested at 400 words, PDF selected | 1,523 ms | 39,224 ms | 13,813 ms | 23,434 ms | Not met |
| Website after planning fix | 169 ms | 60,799 ms | 46,415 ms | 14,119 ms | Not met; completed with warnings |

The new website was slower because content generation needed an additional provider/validation retry. This is not presented as a speed improvement. Presentation images resolved during content generation (approximately 13.1 s and 10.0 s provider requests); their durations overlap and must not be added again to total time. Provider latency/retries and native conversion dominate. Dropping validation, pretending acknowledgement is an output, or replacing requested images with placeholders would not satisfy acceptance.

This audit avoids extra PDF work for default Word-only requests and prioritizes required images before optional spend. The previous measured parallel-repair/prefetch/cache optimizations remain active (see `docs/performance-audit-2026-10-24.md`). The fixed 5–10-second finished-output threshold is still an explicit unresolved blocker. More representative isolated deployed samples and agreed p50/p95 targets are needed; one successful topic cannot establish a service-wide latency guarantee.

## URL verification

Real public extraction returned 156 readable characters from https://example.com and 127,037 from the supplied Wikipedia artificial-intelligence article. Observed URL-only time ranged from 578–855 ms and 5,365–9,042 ms respectively. The deliberately nonexistent `.invalid` hostname returned `SOURCE_URL_UNREACHABLE` in 122–176 ms. Controlled tests cover protected HTML/upstream status and timeout cases; no protected publisher's access was bypassed and no claim is made that all paywall implementations are detectable.

Frontend-facing source errors: 422 for `SOURCE_URL_AUTH_REQUIRED`, `SOURCE_URL_PAYWALL`, `SOURCE_URL_ACCESS_DENIED`; 502 for `SOURCE_URL_UNREACHABLE`; 504 for `SOURCE_URL_TIMEOUT`; 429 plus retry advice for `SOURCE_URL_RATE_LIMITED`; existing 400 malformed/private/unreadable and 413 size errors remain.

## Backend API handoff for the frontend developer

All generation routes remain available. To select document PDF:

```json
{
  "textPrompt": "Create a concise report about government and accountability.",
  "outputType": "document",
  "exportFormat": "pdf"
}
```

`exportFormat` accepts `docx` or `pdf`, only for document output; default remains docx. `context.exportFormat` is also supported. In multipart requests, send exportFormat as a normal field. Both paths validate before generation. The selected successful format is `data.result.artifacts.format`; use `data.result.downloadUrl` for the selected download. `artifacts.downloads.docx` and `.pdf` expose both links. PDF is `on_demand` for default DOCX, and `completed` only after verified conversion. No frontend code was changed.

- Existing Word: `GET /api/documents/:id/:token/download`.
- New PDF: `GET /api/documents/:id/:token/pdf`.
- Alias: `GET /api/documents/:id/:token/download?format=pdf`.
- HTML preview remains `GET /api/documents/:id/:token/preview`.

Resolve relative links against `https://pan2-backend-ivuf.onrender.com`, not the Vercel origin. Do not fabricate ids/tokens. PDF failure returns 503 with `DOCUMENT_PDF_UNAVAILABLE`, stage `document-export`, and available Word/preview links in data.result for generation failures. Async jobs report failed and retain the same result. Download failures return actionable 503/retry advice. Do not display Word as a successful PDF export.

For long generation, send `Prefer: respond-async`, retain returned capability status URL, poll actual job status, and inspect result.status/warnings. Existing status/retry endpoints remain unchanged. Required-image failures remain incomplete; optional missing support images may complete with warnings. UX/recovery messages and export-control wiring belong to the frontend developer.

## Deployment and UAT gate

No paid plan, key or image-spending limit was changed. Last read-only Render inspection on 24 October confirmed Free compute without a persistent disk. Local artifacts/jobs therefore need durable storage before restart/redeploy recovery can be accepted operationally. Merely setting `LEDIFY_STORAGE_ROOT` does not create a disk. Existing PDF source/conversion binaries are included in Dockerfile (`libreoffice-writer`, Impress and Poppler). The missing-converter regression verifies an actionable failure, not installation on every host.

For the known frontend, deployment must explicitly configure `LEDIFY_FRONTEND_ORIGIN=https://ledify-frontend.vercel.app` for document embedding. Existing webpage embedding uses `WEBPAGE_APP_ORIGIN=https://ledify-frontend.vercel.app`. These settings were not silently applied to the company account. Keep the existing Gemini credentials/models and bounded budgets. A real mounted persistent directory such as `/app/generated` can be used for `LEDIFY_STORAGE_ROOT` after the company provisions storage; legacy root/cache overrides must also stay on retained storage.

Before Product's final acceptance and Week 7 UAT:

1. **Backend + Product:** resolve or explicitly revise the 5–10-second finished-generation threshold using representative deployed measurements. It is not met by this audit.
2. **Backend + Product:** review image relevance across an agreed topic set, including authentic-location photography and constrained budgets. Space samples passed technical checks and manual topic review; universal relevance remains unproven.
3. **Frontend + Backend:** wire document PDF selection/download/error behavior; configure exact embedding origin and retest Word/PDF against preview on the deployed service.
4. **Backend + Product:** test agreed protected/unreachable URLs in the actual user environment; custom JavaScript gates remain an extraction limitation.
5. **Frontend + Product:** restore the final landing CTA and agreed icons; regress input controls, no/multiple selections, remove/replace, preview navigation and loading/failure/retry usability. No frontend acceptance claim is made here.
6. **Frontend + Backend + Product:** reconcile PDF/DOCX-only formats and the precise 50 MiB limit with the acceptance sheet, then run large-file and concurrent-job tests on deployment hardware.
7. **Operations / Backend:** provision durable artifact/job storage and run actual restart/redeploy retention checks. An ephemeral service cannot pass this operational test.
8. **Product:** record targeted retest evidence and sign-off. Keep LED-20 optional; it must not delay Must Have closure.

**Decision: backend fixes and regression evidence are ready for targeted retesting; final MVP acceptance remains conditional.** Performance, human quality approval, frontend integration and operational persistence are still open. This report does not replace the workbook's owners or grant UAT approval.

## Deployed backend verification

Production smoke passed on code commit `19a14df6f6114125976414eccf5100eceff7f1cb` at `https://pan2-backend-ivuf.onrender.com` after automatic deployment. Verified the expected build commit, 400 prompt validation with CORS headers, actionable 502 unreachable-source feedback, real background document generation with PDF selected, and actual DOCX/PDF/HTML downloads. The real deployed database and Linux native PDF renderer were used. Evidence: `generated/week6-uat/deployed/report.json`, copies of both downloaded files, and `generated/week6-deployed-smoke.log`.

This separate 100-word document case acknowledged in 509 ms and finished in 24,429 ms (content 8,282 ms; renderer/artifact 13,602 ms; polling/network/database account for additional time). PDF contained one readable page. It is a different workload from the local 400-word case and is not evidence of a comparable speed improvement or a ≤10-second pass.

The deployed document preview CSP was still `frame-ancestors 'self'`. The exact frontend-origin environment configuration remains necessary for iframe integration. No company environment, plan or storage settings were changed. Deployment verification here is backend-only; frontend acceptance remains with its developer. A subsequent report-only commit does not alter the tested application code. Copies of downloaded evidence are retained locally because the current deployment filesystem is ephemeral.

## Source traceability appendix

Cell-extraction SHA-256: `9b4cd7e059e55e433c6f9e50c8594d40bba3c184cb60c30729fc03e884b605f4`. The source was read successfully at the start; the original Downloads path was no longer available at finalization. The complete cell extraction is retained locally. Each source requirement row is preserved below, including historical QA evidence, gap, action, owner and gate. These are source assertions, not substituted audit pass results. Grouped IDs remain grouped in the source.

### Source row 9

- **Feature / ID:** LED-01 Platform / Landing Page
- **MVP priority:** MUST
- **Evidence demonstrated:** Page loads; purpose, primary CTA and input methods work. Final CTA before footer is not visible.
- **Original acceptance result:** PARTIALLY ACCEPTED
- **Acceptance gap:** Final CTA/UI issue remains; icon enhancement identified in demos.
- **Required action:** Restore final CTA; apply agreed UI refinement and retest.
- **Owner:** Frontend + Product
- **Final gate:** UI retest

### Source row 10

- **Feature / ID:** LED-02 Text Prompt
- **MVP priority:** MUST
- **Evidence demonstrated:** All six prompt checks passed, including empty/below-minimum, 10-character minimum, normal input, 2,000 maximum and over-limit handling.
- **Original acceptance result:** ACCEPTED
- **Acceptance gap:** No material gap demonstrated.
- **Required action:** Retain behaviour; regression test before release.
- **Owner:** Frontend + Product
- **Final gate:** Regression

### Source row 11

- **Feature / ID:** LED-03 File Upload
- **MVP priority:** MUST
- **Evidence demonstrated:** File picker, DOC/PDF/PPTX selection, unsupported format handling, remove and replace passed.
- **Original acceptance result:** PARTIALLY ACCEPTED
- **Acceptance gap:** Maximum file-size limit was not verified in QA.
- **Required action:** Validate agreed 1–50 MB boundary behaviour.
- **Owner:** Frontend + Backend
- **Final gate:** Limit test

### Source row 12

- **Feature / ID:** LED-04 URL Input
- **MVP priority:** MUST
- **Evidence demonstrated:** Public URL, malformed URL and correction passed. Login/paywall feedback failed; unreachable URL was not tested.
- **Original acceptance result:** REQUIRES FIX / VALIDATION
- **Acceptance gap:** Protected-page feedback and unreachable-page behaviour incomplete.
- **Required action:** Fix login/paywall feedback; test unreachable URL.
- **Owner:** Backend + Product
- **Final gate:** URL retest

### Source row 13

- **Feature / ID:** LED-05 Output Selection
- **MVP priority:** MUST
- **Evidence demonstrated:** Presentation, Webpage and Document options available; no-selection prevention and single selection passed.
- **Original acceptance result:** ACCEPTED
- **Acceptance gap:** Document export-format choice has a separate export defect.
- **Required action:** Retain selection behaviour; regression test.
- **Owner:** Frontend + Product
- **Final gate:** Regression

### Source row 14

- **Feature / ID:** LED-06 AI Processing / Performance
- **MVP priority:** MUST
- **Evidence demonstrated:** Generation succeeds for Presentation, Webpage and Document. Repeated demos show noticeable loading delay beyond expected 5–10 seconds.
- **Original acceptance result:** PARTIALLY ACCEPTED
- **Acceptance gap:** Generation performance not yet within expected user experience; exact response time needs measurement.
- **Required action:** Measure response time, optimise and retest agreed threshold.
- **Owner:** Backend + Product
- **Final gate:** Performance retest

### Source row 15

- **Feature / ID:** LED-07 Presentation Generation
- **MVP priority:** MUST
- **Evidence demonstrated:** Presentation generation, preview and PPTX download succeed.
- **Original acceptance result:** PARTIALLY ACCEPTED
- **Acceptance gap:** Generated images are not consistently relevant to the topic; generation is slow.
- **Required action:** Improve contextual image relevance and performance; retest output quality.
- **Owner:** Backend + Product
- **Final gate:** Quality retest

### Source row 16

- **Feature / ID:** LED-08 Document Generation
- **MVP priority:** MUST
- **Evidence demonstrated:** Clear written output is generated; document preview and DOCX download work.
- **Original acceptance result:** ACCEPTED WITH EXPORT CAVEAT
- **Acceptance gap:** PDF/export options remain defective.
- **Required action:** Retain content quality; resolve export defect.
- **Owner:** Backend + Product
- **Final gate:** Export retest

### Source row 17

- **Feature / ID:** LED-09 Webpage Generation
- **MVP priority:** MUST
- **Evidence demonstrated:** Webpage generation, styled preview and download work.
- **Original acceptance result:** PARTIALLY ACCEPTED
- **Acceptance gap:** Images are not consistently relevant to topic and generation is slow.
- **Required action:** Improve contextual image relevance and performance.
- **Owner:** Backend + Product
- **Final gate:** Quality retest

### Source row 18

- **Feature / ID:** LED-10–12 Preview
- **MVP priority:** MUST
- **Evidence demonstrated:** Presentation navigation, webpage preview and document preview passed QA.
- **Original acceptance result:** ACCEPTED
- **Acceptance gap:** No material preview defect demonstrated.
- **Required action:** Retain and regression test.
- **Owner:** Frontend + Product
- **Final gate:** Regression

### Source row 19

- **Feature / ID:** LED-13–15 Download / Export
- **MVP priority:** MUST
- **Evidence demonstrated:** PPTX, DOCX and webpage downloads passed; PDF download failed. Document export options also failed expected test.
- **Original acceptance result:** REQUIRES FIX
- **Acceptance gap:** PDF download and document export-format workflow incomplete.
- **Required action:** Fix export options/PDF download and retest against preview.
- **Owner:** Frontend + Backend
- **Final gate:** Export retest

### Source row 20

- **Feature / ID:** LED-16–19 Feedback / Recovery
- **MVP priority:** SHOULD
- **Evidence demonstrated:** Some validation feedback works; protected URL feedback does not meet expectations. Full recovery/loading/failure set not evidenced as accepted.
- **Original acceptance result:** OUTSTANDING VALIDATION
- **Acceptance gap:** Evidence does not support full acceptance of all feedback/recovery features.
- **Required action:** Validate remaining feedback, loading and generation-failure behaviour.
- **Owner:** Product + Dev
- **Final gate:** Usability test

### Source row 21

- **Feature / ID:** LED-20 Drag-and-Drop
- **MVP priority:** COULD
- **Evidence demonstrated:** Optional feature; no evidence supplied that it is required for MVP acceptance.
- **Original acceptance result:** NOT REQUIRED FOR MVP ACCEPTANCE
- **Acceptance gap:** None for core MVP.
- **Required action:** Do not allow optional enhancement to delay Must Have fixes.
- **Owner:** Frontend
- **Final gate:** Post-core MVP

### Source summary and decision cells

- **A1:** LEDIFY AI MVP – WEEK 6 MVP FEATURE ACCEPTANCE REVIEW
- **A2:** Review period: 19–25 October 2026 | Basis: Week 5 Product Acceptance Review + repeated product demos + Live-Product QA evidence
- **A4:** Core Position
- **B4:** Accepted
- **C4:** Partially Accepted
- **D4:** Requires Fix
- **E4:** Outstanding Validation
- **F4:** QA Pass Rate
- **G4:** Scope Position
- **H4:** MVP Decision
- **A5:** Core journey works
- **B5:** Prompt + core previews/downloads
- **C5:** Several core areas
- **D5:** Known defects remain
- **E5:** Performance / limits / URL case
- **F5:** 83.3%
- **G5:** No new scope
- **H5:** CONDITIONAL – NOT FINAL
- **A23:** BLOCKERS TO FINAL MVP ACCEPTANCE
- **A24:** 1
- **B24:** Performance
- **C24:** Presentation and Webpage generation exceeds the expected 5–10 second experience.
- **G24:** Measure, optimise and retest.
- **A25:** 2
- **B25:** Visual relevance
- **C25:** Presentation and Webpage images are not consistently relevant to generated subject matter.
- **G25:** Improve AI/image-selection relevance and retest.
- **A26:** 3
- **B26:** URL handling
- **C26:** Login/paywall feedback fails and unreachable URL remains untested.
- **G26:** Correct and retest URL scenarios.
- **A27:** 4
- **B27:** Export
- **C27:** Document export options and PDF download fail expected behaviour.
- **G27:** Fix and retest PDF/export workflow.
- **A29:** MVP FEATURE ACCEPTANCE DECISION
- **A30:** CONDITIONAL MVP FEATURE ACCEPTANCE. The evidence supports acceptance of several core capabilities and confirms that the main Ledify creation journey is operational. Final MVP acceptance is not recommended yet because Must Have features still contain quality, performance, URL-handling and export gaps. Development should focus on these identified acceptance blockers rather than introducing new scope. A targeted retest should determine whether the affected features can move to Accepted before UAT.
- **A33:** NEXT GATE: Resolve Must Have acceptance gaps → targeted retest → confirm feature acceptance → proceed to Week 7 UAT Product Review.
