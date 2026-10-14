# Wikipedia URL extraction limit correction

The reported URL was `https://en.wikipedia.org/wiki/Artificial_intelligence`. The production URL reader inherited a generic 2 MB resource cap and rejected the response before article extraction.

During verification, the public page downloaded **2,253,557 bytes**, exceeding that cap. Its initial main text was **223,386 characters**, including reference/navigation appendices. The corrected extractor produced **126,299 characters** after whitespace normalization and removal of Wikipedia reference/navigation widgets, preserving substantive article sections such as reasoning and ethics. These measurements describe the downloaded snapshot; Wikipedia can change.

Changes:

- `Service/urlService.mjs`: URL-specific 10 MB default download cap, server override `LEDIFY_URL_MAX_MB` from 1–20; Wikipedia widget cleanup; explicit empty/oversized readable-text errors.
- `Service/input/sourceLimits.mjs`: shared 200,000-character extracted-source budget.
- `Service/input/combinedInput.mjs` and `Service/ai/webpageGeneration.mjs`: matching combined-input/webpage budgets, preventing a larger URL from failing against the old downstream 80,000-character limit.
- `Service/input/publicUrl.mjs`: checks declared Content-Length before reading and still enforces streamed byte counts, including chunked responses. Generic resource/image download defaults remain unchanged; URL service supplies its own limit. DNS pinning, private-network rejection, redirects and timeouts are retained.
- `controller/generateController.mjs`: URL byte/text-limit failures now return HTTP 413 with an actionable message and limit metadata, for both unified and legacy endpoints.
- `tests/regression/url-extraction.test.mjs`: large HTML with small readable text, Wikipedia cleanup, declared/chunked overflow, long readable articles, empty-source errors and HTTP status behavior.
- `tests/regression/combined-input.test.mjs`: updated shared budget regression.

The exact Wikipedia page was fetched over the public network, then its downloaded HTML was passed through the revised production extractor successfully. No Gemini generation or database writes were performed for this reproduction. Diagnostic measurements are in `generated/wikipedia-ai-extraction-check.json`; the cached HTML remains a private engineering input in `generated/`.

Focused URL and combined-input checks: **11 passed, zero failed**. Sources beyond the configured limits remain unsupported and are rejected explicitly, without silent truncation. Large articles may take longer to generate. Restart the backend before retrying the request.

Full regression suite: **210 passed, zero failed** (`generated/url-extraction-regression-tests.txt`).
