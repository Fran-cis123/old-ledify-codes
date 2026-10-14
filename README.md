# Ledify backend

Generate presentations, editable Word documents and static webpages from text prompts, PDF/DOCX uploads, public webpage URLs or combined inputs.

## Run locally

1. Install Node.js 20.16 or newer and run `npm ci`.
2. Copy `.env.example` to `.env` and configure MongoDB, your Gemini API key and port.
3. Install LibreOffice and Poppler for presentation PDF/PNG rendering. Put their executables on PATH or configure `LIBREOFFICE_PATH` and `PDFTOPPM_PATH`. Word generation does not require a PDF converter.
4. Run `npm start` or `npm run start:dev`.

The API defaults to `http://localhost:5000`. A local composer, where enabled by the application, is available at `/composer`. Generated artifacts live under `generated/`; that directory and `.env` are excluded from Git.

## Render environment

Set `MONGO_URL` in Render to the MongoDB Atlas Drivers connection URI itself, beginning `mongodb+srv://` (or `mongodb://` for a reachable standard deployment). Do not paste surrounding quotes, a `MONGO_URL=` assignment, a `mongosh` command or a Postgres connection URL. URL-encode special characters in the database username/password; do not change the database password merely to fix URI formatting. Keep the URI and Gemini API key in Render environment variables, never Git.

The server also accepts `MONGODB_URI` or `MONGO_URI` when `MONGO_URL` is absent. Startup validates URI syntax without logging credentials and binds to `0.0.0.0` on Render's supplied `PORT`. Configure Atlas network access for the service's outbound addresses. Linux presentation rendering requires Linux LibreOffice/Poppler executables; local Windows executable paths cannot be reused on Render.

## Unified generation

`POST /api/generate` accepts JSON without an attachment or multipart form-data with one PDF/DOCX `file`. Supply `outputType` as `presentation`, `document` or `webpage`, plus at least one of `textPrompt`, `urlPrompt` or `file`. All nonempty combinations are supported. Existing input-specific routes remain available.

See [UNIFIED_GENERATION_API.md](UNIFIED_GENERATION_API.md) for frontend/Postman examples, response fields and limits. Output-specific guides: [presentations](PRESENTATION_PIPELINE.md), [documents](DOCUMENT_PIPELINE.md), [webpages](WEBPAGE_PIPELINE.md).

## Tests

Run `npm test` for local regression tests. They use controlled AI responses and include real artifact rendering, so LibreOffice and Poppler must be installed. Optional live sample scripts use the configured Gemini account and are not part of the default test command. Generated test output and local renderer profiles are ignored; existing tracked binary fixtures remain available to the regression suite.

Review [GENERATION_PERFORMANCE.md](GENERATION_PERFORMANCE.md) for timings and concurrency configuration. Fresh AI generation is not guaranteed to complete in five seconds. Deployment needs application authentication, artifact retention and appropriate storage/resource controls.
