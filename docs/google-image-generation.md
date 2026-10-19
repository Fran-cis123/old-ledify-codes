# Google image generation

Verified on 2026-10-19 using the existing Gemini API key. All 63 returned model names and supported actions are recorded in `generated/google-image-verification/report.json` (ignored runtime output). Both `gemini-3.1-flash-image` and `gemini-2.5-flash-image` returned decoded images saved by `tests/googleImageStandalone.mjs`. The selected model is `gemini-3.1-flash-image`.

`Service/visual/googleImageService.mjs` uses `models.generateContent` with IMAGE/TEXT modalities. It does not use Imagen or change the text models. Both website and presentation image adapters call it. Each pipeline still owns its count limits and retries; the SDK makes one attempt per invocation. Shared concurrency, timeouts, signature/decoder validation, size limits and a seven-day checksum-verified file cache apply. Failed or blocked responses cannot become embedded images. Website responsive WebP variants are bundled in ZIP files; presentation JPEGs are embedded in PPTX files and checked after PDF/PNG rendering. Synthetic provenance is retained.

The following non-secret settings enable a conservative initial limit of **one generated image per output**. Existing `GEMINI_API_KEY` remains unchanged. Configure these in Render as well to enable the deployed service; local `.env` is not deployed.

```ini
GOOGLE_IMAGE_MODEL=gemini-3.1-flash-image
GOOGLE_IMAGE_CONCURRENCY=1
WEBPAGE_ALLOW_IMAGE_GENERATION=true
WEBPAGE_IMAGE_MAX_GENERATED=1
WEBPAGE_IMAGE_RETRIES=0
WEBPAGE_IMAGE_TIMEOUT_MS=60000
PRESENTATION_ALLOW_IMAGE_GENERATION=true
PRESENTATION_MAX_GENERATED_IMAGES=1
PRESENTATION_IMAGE_RETRIES=0
PRESENTATION_IMAGE_RESOLUTION=1K
PRESENTATION_IMAGE_TIMEOUT_MS=60000
PRESENTATION_IMAGE_DEADLINE_MS=65000
PRESENTATION_IMAGE_ESTIMATED_UNIT_COST=1
PRESENTATION_IMAGE_MAX_ESTIMATED_COST=1
```

The cost settings are deliberately conservative **server reservation values**, not verified Google prices or a billing guarantee. The actual charge depends on the provider/model/account. Count limits include failed calls and retries. Raise limits only with a matching estimated budget. Existing licensed-image/user-asset priority remains; generation can be skipped where those assets already resolve a request. `WEBPAGE_IMAGE_MODEL` and `PRESENTATION_IMAGE_MODEL`, if set, override the shared model for backwards compatibility. Use a model verified for the same account. Gemini 2.5 Flash Image omits the unsupported image-size option.

Verification commands:

```sh
node tests/googleImageStandalone.mjs
node tests/googleImagePipelineLive.mjs
npm test
```

The first two commands make paid API calls. The pipeline check uses existing validated text fixtures to isolate the real image providers, optimizers, renderers and packaging. It asserts local website images survive ZIP extraction and that PPTX, PDF and every slide PNG complete. It does not re-test live text generation. No endpoints or response contracts change. Existing output warnings remain possible for factual review, unavailable imagery, timeouts or exhausted budgets. Cache storage on Render is ephemeral unless backed by persistent storage.
