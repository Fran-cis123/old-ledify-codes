# Webpage generation implementation

The subsequent [universal-engine extension](webpage-universal-overhaul.md) adds creative direction, dark identities, section/gallery images, local collection interactions and optional bounded browser QA. It contains the latest 270-test results and configuration details. This document describes the preceding implementation phase.

Implemented locally on 2026-10-17. These changes are not yet committed, pushed or verified on Render.

## Pipeline and files

The existing generation routes, response envelope, PDF/DOCX uploads, text/URL extraction, presentation pipeline and document pipeline remain intact. `Service/generateService.mjs` passes the source context into webpage design normalization and reports missing verified business content as a warning.

- `Service/ai/webpageGeneration.mjs`: structured planning, source-aware content instructions and a safe minimal-business-brief path. Normal detailed requests retain planning/content calls; short organizational briefs use one planning call and explicitly editable factual content.
- `templates/webpage/webpageSchema.mjs`, `Service/webpageContentValidator.mjs`, `Service/webpageStaticValidator.mjs`: typed design/page metadata, grounded claims, local asset checks and compatible optional extensions.
- `Service/webpage/websiteBrief.mjs`, `contentGrounding.mjs`, `sparseContent.mjs`, `errors.mjs`: automatic briefing, high-risk claim checks and truthful handling of missing facts.
- `Service/webpageDesignService.mjs`, `Service/webpageLayoutService.mjs`, `Service/webpageThemeService.mjs`: industry-aware compositions, selected palettes/font pairs and contrast repair.
- `Service/webpage/imageProviders.mjs`, `providerCache.mjs`, `imagePipeline.mjs`, `imageOptimization.mjs`, `imageOptimizationWorker.mjs`: authorized acquisition, bounded caching, isolated Sharp decoding and local responsive WebP assets. `Service/webpageAssetService.mjs` retains the legacy deployment catalog contract.
- `Service/webpage/sitePages.mjs`, `renderer/webpage/{webpageRenderer,components,styles,architectures,previewViewer}.mjs`: actual composition variants, multi-page navigation, metadata, responsive pictures and working preview viewport controls. The unused geometric illustration module is removed.
- `Service/webpageArtifactService.mjs`: consistent preview/ZIP file maps and optional persistent artifact root.
- `assets/webpage/curated/`, `scripts/acquireWebpageCatalog.mjs`: five reviewed public-domain/CC0 photographs and explicit maintenance acquisition.
- `tests/regression/{webpage,webpage-design,website-production}.test.mjs`, `tests/webpage/{fixtures,browser,lighthouse,livePharmax}.mjs`: regressions, browser/axe checks, independent Lighthouse reports and an optional live model test.
- `package.json`, `package-lock.json`: Sharp production dependency; Playwright, axe and Lighthouse development tooling.

See [architecture audit](webpage-architecture-audit.md), [design/API guide](webpage-design-system.md), [image pipeline](webpage-image-pipeline.md) and [measured results](webpage-visual-quality-results.md).

## Reproduce

Use a supported Node version for the lockfile dependencies. Windows browser tests use installed Edge; Linux needs Playwright Chromium installed explicitly. Browser tools run only during development/testing.

```sh
npm ci
npm test
npm run test:webpage:samples
npm run test:webpage:browser
# Run after the preceding checks finish, without competing test workloads:
node tests/webpage/lighthouse.mjs --isolated
# Optional: uses configured Gemini credentials and consumes provider quota:
node tests/webpage/livePharmax.mjs
# Optional reviewed catalog maintenance; requires internet:
node scripts/acquireWebpageCatalog.mjs
```

Browser screenshots, JSON evidence and extracted websites are under `generated/webpage-samples/`; the live AI receipt is `generated/webpage-live-pharmax/result.json`. Generated output is ignored by Git. Deterministic fixtures test rendering without repeatedly spending AI quota.

## Configuration and deployment

No image-provider key is needed for the reviewed bundled catalog. Optional `PEXELS_API_KEY` enables stock search. Paid image generation additionally requires `WEBPAGE_ALLOW_IMAGE_GENERATION=true`, `WEBPAGE_IMAGE_MODEL` and `GEMINI_API_KEY`. Keep all credentials in the service environment.

`LEDIFY_WEBPAGE_IMAGE_MANIFEST` selects an authorized brand catalog. `LEDIFY_WEBPAGE_ASSET_CACHE` selects the image cache; `LEDIFY_WEBPAGE_IMAGE_WORKERS` defaults to 1, maximum 2. `LEDIFY_WEBPAGE_ROOT` selects artifact storage. Use a writable persistent disk on Render when previews must survive restarts/redeploys; an ephemeral filesystem cannot provide durable links. Do not mount a disk over the bundled source catalog.

Deploy the source catalog, new modules and updated lockfile together. `npm ci --omit=dev` excludes browser tooling; Sharp's Linux optional binaries are present in the lockfile. The existing Docker ignore rules retain source assets and exclude generated artifacts. A Docker build/Render redeploy was not performed during this task.

## Practical limits

The five bundled images cover selected subjects, not every industry. Optional Pexels and image-generation adapters have mocked safety/regression coverage but no live account verification. User-supplied image ownership is asserted by the caller. Unsupported subjects yield diagnostics rather than unrelated photography.

High-risk factual guards are useful heuristics, not comprehensive verification. A sparse business prompt deliberately needs verified offerings/contact details before publication. Stock photos are visibly illustrative. Forms, bookings, accounts, checkout and email submission require separate backend integrations; generated pages do not pretend those services exist.

Multi-page support is bounded to six supported page types and available supplied content. Reference URLs/preferences guide planning; arbitrary reference-site scraping or exact design cloning is not implemented. System font availability varies by platform. Local mobile Lighthouse scores are evidence for these samples, not a promise of identical production scores or universal five-second generation.
