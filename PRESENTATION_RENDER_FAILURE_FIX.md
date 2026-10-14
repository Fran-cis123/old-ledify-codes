# Combined Wikipedia presentation rendering follow-up

The supplied terminal report for request `4c85e6bc-da45-4a57-9c02-4ec0ce93daba` shows successful outline generation, all eight slide bodies, whole-deck quality review, and two diagram plans. Slides 2, 7 and 8 needed successful readability retries. No PDF-generation message follows. The response was a generic `GENERATION_FAILED` without stage or field.

This narrows the failure to the work after content review, around visual resolution/PowerPoint creation. It does not establish the exact historical exception: the original error and generated slide JSON were not supplied. The most recent local preview directory at inspection contains no saved PPTX, consistent with a failure during PowerPoint creation; the supplied log does not link its preview ID to this request.

A reproducible bug was identified: AI-stage readability checks use the full cover width, but visual resolution adds decorative artwork that switches the renderer to a narrower split cover with a larger 42 pt title. A valid full-width title such as “Artificial Intelligence: History, Technologies, Applications and Future Developments” then throws `PRESENTATION_CONTENT_TOO_DENSE` on `title.title`. The renderer and preview wrapper discarded that error metadata, resulting in a generic API failure.

Implemented changes:

- `Service/visual/presentationVisuals.mjs`: final readability preflight after visual resolution for every slide, including early-return visual branches. When decorative cover artwork prevents the complete title/subtitle from fitting, omit that artwork and retain the background and full approved text. Emit `COVER_LAYOUT_FALLBACK`. Unresolved nonrecoverable layout failures retain stage `visual-layout-validation` and field/slide metadata.
- `renderer/presentation/pptxRenderer.mjs`: preserve error cause, code, slide, field and character budget when wrapping layout failures.
- `renderer/presentation/previewRenderer.mjs`: preserve those details with stage `presentation-rendering`; unknown PowerPoint errors receive `PRESENTATION_RENDER_FAILED`.
- `controller/generateController.mjs`: safe terminal diagnostics include code/stage/slide/field/budget, without source text or provider messages. HTTP failures include stage and character budget rather than losing all context.

New regressions verify that the long title creates a real validated PowerPoint with all title text retained; combined input returns precise rendering diagnostics without private error text; and the preview wrapper preserves the original failure metadata. The existing eight-slide HTTP generation/render/download regression remains in the suite.

Verification: **32/32 focused presentation tests** and **213/213 full regression tests** passed. Logs: `generated/presentation-layout-fix-tests.txt` and `generated/presentation-render-regression-tests.txt`.

No live Gemini rerun of the Wikipedia request was performed. Restart the backend and repeat the same JSON request at `POST /api/generate`. A recovered decorative-cover case returns output with a warning. If another rendering problem exists in the original generated content, the new terminal/API diagnostics identify its stage, slide and field so it can be investigated directly.
