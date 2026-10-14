# FarmBridge presentation failure follow-up

The supplied report records request `31de70a6-1bc7-4554-93b3-38fb80c2aab7`, slide 9 failing three times with `AI_SCHEMA_VALIDATION_FAILED`, and successful `STOP` finish reasons. It does not contain provider response bodies or failing fields, so the original cause cannot be established from this evidence. STOP means generation finished; it does not mean the JSON satisfies Ledify's schema or semantic rules.

The current quantitative guard already allows explicitly requested hypothetical projections when visibly labeled. That earlier correction remains intact; actual company results must still match supplied data.

This follow-up fixes a separate reproducible retry gap: ordinary errors thrown by slide semantic validators previously lost their actionable requirement when wrapped for retry. They now pass a bounded requirement into the private next-attempt prompt. Raw validation messages and content are not added to terminal logs or public API errors. Text-length and repetition errors now retain their field paths, with character budgets for length errors. Existing retry limits remain three attempts.

Slide instructions now specify equal label/value counts, numeric values, currency in dataset labels, visible hypothetical labels, and rectangular tables. Whole-deck review instructions explicitly permit qualified hypothetical projections so review does not unnecessarily remove the requested chart.

Changed implementation files:

- `Service/ai/generateJsonWithRetry.mjs`
- `Service/ai/responseValidation.mjs`
- `Service/ai/presentationPrompts.mjs`
- `Service/ai/presentationQuality.mjs`

`tests/fixtures/farmbridge-request.json` preserves the exact submitted Postman request. `tests/regression/farmbridge.test.mjs` runs that request through the actual ten-slide AI orchestration with mocked provider responses, intentionally returns a malformed slide-9 chart, verifies the specific correction appears in the next attempt, verifies earlier slides are not regenerated, reaches slide ten and completes quality review. It also rejects unlabeled hypothetical data and unsupported real financial data. This is a content-orchestration regression, not a live Gemini/PPTX/photo/render verification or proof of the historical root cause.

Focused tests: `node --test tests/regression/farmbridge.test.mjs tests/regression/ai.test.mjs` — **89 passed, zero failed**.

Full `npm test` result: **195 passed, zero failed**. Output is saved in `generated/farmbridge-regression-tests.txt`.

Restart the running backend before repeating the Postman request. New failures include field paths when supplied by the validator; preserve those logs for diagnosis. The exact request remains subject to live provider behavior and downstream visual/rendering availability.
