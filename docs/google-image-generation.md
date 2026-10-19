# Google image generation

Verified on 2026-10-19 using the existing Gemini API key. All 63 returned model names and supported actions are recorded in `generated/google-image-verification/report.json` (ignored runtime output). Both `gemini-3.1-flash-image` and `gemini-2.5-flash-image` returned decoded images saved by `tests/googleImageStandalone.mjs`. The selected model is `gemini-3.1-flash-image`.

`Service/visual/googleImageService.mjs` uses `models.generateContent` with IMAGE/TEXT modalities. It does not use Imagen or change the text models. Both website and presentation image adapters call it. Each pipeline still owns its count limits and retries; the SDK makes one attempt per invocation. Shared concurrency, timeouts, signature/decoder validation, size limits and a seven-day checksum-verified file cache apply. Failed or blocked responses cannot become embedded images. Website responsive WebP variants are bundled in ZIP files; presentation JPEGs are embedded in PPTX files and checked after PDF/PNG rendering. Synthetic provenance is retained.

Websites retain their initial one-generated-image limit. Standard presentations now require a relevant picture on every slide, including the cover and slides with charts/diagrams. Explicit text-only requests and explicit per-slide exclusions are respected. Missing required images fail with `PRESENTATION_IMAGES_UNAVAILABLE` (HTTP 503), not an image-free success. The PPTX package is checked for embedded, decodable picture relationships; PDF/PNG verification checks visible pixels against the embedded sources.

Use these non-secret settings in Render as well as locally. Existing `GEMINI_API_KEY` remains unchanged; local `.env` is not deployed. The image-attempt ceiling permits one bounded retry while the successful-image limit stays at twelve.

```ini
GOOGLE_IMAGE_MODEL=gemini-3.1-flash-image
GOOGLE_IMAGE_CONCURRENCY=2
WEBPAGE_ALLOW_IMAGE_GENERATION=true
WEBPAGE_IMAGE_MAX_GENERATED=1
WEBPAGE_IMAGE_RETRIES=0
WEBPAGE_IMAGE_TIMEOUT_MS=60000
PRESENTATION_ALLOW_IMAGE_GENERATION=true
PRESENTATION_MAX_GENERATED_IMAGES=24
PRESENTATION_MAX_IMAGES=12
PRESENTATION_IMAGE_CONCURRENCY=2
PRESENTATION_IMAGE_RETRIES=1
PRESENTATION_IMAGE_RESOLUTION=1K
PRESENTATION_IMAGE_TIMEOUT_MS=60000
PRESENTATION_IMAGE_DEADLINE_MS=180000
PRESENTATION_IMAGE_ESTIMATED_UNIT_COST=1
PRESENTATION_IMAGE_MAX_ESTIMATED_COST=24
```

The cost settings are deliberately conservative **server reservation values**, not a billing guarantee. Google's [official standard pricing](https://ai.google.dev/gemini-api/docs/pricing#gemini-3.1-flash-image) checked on 2026-10-19 lists approximately $0.067 per 1K output image, plus input/text charges. Ten newly generated 1K images therefore imply about $0.67 in image-output charges before input tokens, text generation, retries or account-specific adjustments. Actual charges must be confirmed in provider billing. Counts include failures and retries; cached photos do not make another paid image request. Two requests run concurrently within a presentation, subject to the shared service cap. No third-party paid provider or duplicate API key was added.

Supplied assets take priority. The planner can request licensed-search-first for authentic evidence, or generation-first for conceptual imagery. A source failing within its bounded budget can fall back to another authorized source, but missing coverage cannot silently become a completed deck. `WEBPAGE_IMAGE_MODEL` and `PRESENTATION_IMAGE_MODEL`, if set, override the shared model for backwards compatibility. Production uses the verified 3.1 model. Generated conceptual images remain labeled and require human review for fine scientific or historic accuracy; pixel checks establish visibility, not factual certification.

Verification commands:

```sh
node tests/googleImageStandalone.mjs
node tests/googleImagePipelineLive.mjs
npm test
```

The first two commands make paid API calls. The earlier pipeline check uses validated text fixtures; `node tests/mandatoryPresentationImagesLive.mjs space` runs actual text and image generation for the ten-slide regression topic. Its `business` and `medical` scenarios verify unrelated subjects. The failed `presentation (4).pptx` is preserved as `tests/fixtures/zero-image-space.pptx` and fails the mandatory package gate. No endpoints change. Image-related failures now include clear error codes and missing slide numbers. Cache storage on Render is ephemeral unless backed by persistent storage.
