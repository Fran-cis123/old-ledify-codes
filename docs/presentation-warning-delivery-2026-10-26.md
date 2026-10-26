# Presentation image outage delivery correction

## Root cause

The visual resolver correctly used the default `best-effort` policy, retained readable slide layouts, and emitted image warnings. The final presentation result nevertheless mapped any incomplete image validation to top-level `incomplete`. The HTTP controller converted that into 422 `IMAGE_REQUIREMENTS_UNMET`; background jobs also marked usable output failed. This contradicted the requested delivery-with-warnings policy.

## Correction and API contract

`Service/generateService.mjs` now applies strict image enforcement only when the resolved coverage plan explicitly requests it. With successful artifact rendering, a default presentation returns HTTP 201 and `data.result.status: completed_with_warnings`. The saved request and background job are completed. Missing-image evidence remains in `imageValidation.status: incomplete`, `requiredMissing`, and `warnings`; image coverage is never reported as passed when pictures are missing. `IMAGE_REQUIREMENTS_UNMET` is a warning code in this case, not a top-level API error.

The frontend should open available links for completed-with-warnings results and display their warnings. It should use the HTTP response and top-level/job status for success handling, rather than turning every warning or incomplete image-validation field into an exception.

Explicit strict mode, real rendering failures, document PDF failure responses, and webpage image enforcement are unchanged. Existing provider retries, budgets, relevant-image filtering, and refusal to fabricate photographs remain intact. This correction does not make unavailable providers supply images.

## Verification

`tests/regression/presentation-image-outages.test.mjs` exercises a real local HTTP server, production presentation generation and PPTX/PDF/PNG renderers, with approved text fixtures and unavailable image providers. PDF and DOCX upload, text, URL, and combined inputs all return 201. Downloaded PPTX, PDF, and PNG files return 200 with the correct byte signatures. A queued request returns 202 and finishes completed with warnings. The suite also checks strict rejection, partial-image preservation, and bounded provider stalls: **4 passed, zero failures** (`generated/presentation-warning-delivery-runtime.log`).

No live production request or Render deployment is asserted by this test. The company service must run the new commit before frontend testers see this behavior. Previously failed jobs keep their stored status until retried or regenerated.

Related presentation-image, image-reliability, and performance/job regressions: **47 passed, zero failures** (`generated/presentation-warning-related.log`). This includes successful image embedding and explicit incomplete-job handling, which remain protected.
