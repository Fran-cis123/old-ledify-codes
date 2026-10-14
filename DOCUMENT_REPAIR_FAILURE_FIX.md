# Document section repair follow-up

The refined request selects `outputType: "document"` and requests artificial-intelligence coverage and diagrams from the Wikipedia source. Its request ID is `139906dd-7494-470d-af04-5b9ed4cc75b1`. Initial section drafting completed after several retries. Whole-document review completed, then a targeted section repair failed three times: repetition in `$.blocks.2.text`, a section-level semantic failure at `blocks`, and a block failure at `blocks[0]`.

The logs do not contain generated blocks, section IDs or validation-rule identifiers, so they do not establish precisely what the final block violated. Changing the wording from presentation to document did not remove the backend repair failure.

Two reproducible gaps were corrected:

- The repetition guard treated long indentation or code-diagram separator lines as repetitive generated content. It now permits whitespace and structural separators in typed code blocks, while still rejecting repeated words, digits and prose. Ignoring a valid separator cannot hide a later degenerate sequence in the same block.
- The document generator/reviewer lacked explicit visual capability constraints. When no image assets are supplied, image variants are removed from the generation schema. Every planning/drafting/review prompt explains that images cannot be invented and that accurate concise code schematics, tables and prose are supported alternatives. Missing automatic imagery is reported as `DOCUMENT_VISUALS_TEXT_ONLY`; the reviewer must still check factual correctness and coverage.

The selected output type is authoritative. Document prompts now explicitly require Word sections even if copied instructions mention slides or PowerPoint. This is separate from the refined request's backend failure; a valid document request should not fail merely because diagrams were requested.

Diagnostics now include `sectionId` and safe `validationRule` codes in AI logs, retry exhaustion and HTTP errors. Rules distinguish schema errors, section word budgets, unsupported quotations, unknown image assets, duplicate blocks and repeated text. No generated/source excerpts are added to logs. The existing three-attempt limit, substantive quality review and artifact validation remain.

Files changed: `Service/ai/responseValidation.mjs`, `Service/ai/generateJsonWithRetry.mjs`, `Service/document/documentGeneration.mjs`, `Service/document/documentValidation.mjs`, `controller/generateController.mjs`, `tests/regression/ai.test.mjs`, `tests/regression/documents.test.mjs`. `tests/documentLiveRepro.mjs` reproduces the exact attached request with cached source HTML and saves private diagnostic checkpoints under `generated/document-live-repro/`.

Focused tests: **104 passed, zero failed**, including reviewed section repair with a code diagram, rejection of genuine repetitive prose, preserved section/rule metadata and all existing document/AI checks. Output: `generated/document-repair-focused-tests.txt`.

Full regression suite: **216 passed, zero failed**, recorded in `generated/document-repair-regression-tests.txt`.

Live verification of the exact refined request with real Gemini and the cached Wikipedia HTML completed successfully: **six sections, 1,795 words, one successful targeted quality-repair round, 123,024 ms**. DOCX package validation passed and a protected HTML preview was generated. Result metadata is in `generated/document-live-repro/result.json`; the live log is `generated/document-live-repro-log.txt`. Status is `completed_with_warnings` because no image assets were supplied; automatic generated images are not claimed. This verifies one live run and does not guarantee identical provider behavior or latency on future runs.
