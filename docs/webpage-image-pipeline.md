# Website image pipeline

## Implemented source order

1. `context.websiteBrief.imageAssets`: at most four authorized HTTPS references, each with rightsConfirmed, role, alt, creator and license. Optional authentic=true identifies the caller's actual brand image. Safe public-IP resolution is pinned on every redirect; private/reserved targets are rejected.
2. Deployment-owned brand catalogs via `LEDIFY_WEBPAGE_IMAGE_MANIFEST`, retaining the prior local manifest contract. Use authentic=true only for an actual company-owned photograph. Otherwise the asset is labelled illustrative.
3. Pexels search when `PEXELS_API_KEY` is configured. Requests use its documented endpoint; image downloads are bounded and publicly resolved. Provider/photographer links are visible in the footer, with license/source links retained.
4. Gemini image generation only when WEBPAGE_ALLOW_IMAGE_GENERATION=true, WEBPAGE_IMAGE_MODEL and GEMINI_API_KEY are explicitly configured. It is off by default. Generated artwork is labelled conceptual, never an authentic company photograph.
5. Reviewed bundled photographs in `assets/webpage/curated/catalog.json`. No key or runtime network access is required. Missing subjects produce a truthful diagnostic and content-led layout.

The optional provider adapters are implemented but their live accounts could not be verified because no Pexels key or website image-generation model was configured. Actual bundled-image acquisition, optimization and browser/ZIP delivery were tested.

## Reviewed bundled assets

| File | Subject / creator | Rights source |
| --- | --- | --- |
| laboratory.jpg | Laboratory pipetting / James Gathany, CDC | [Public-domain CDC file record](https://commons.wikimedia.org/wiki/File:CDC_scientist_transfers_H7N9.png) |
| food.jpg | Cobb salad / Daderot | [CC0 file record](https://commons.wikimedia.org/wiki/File:Cobb_salad_-_Cambridge,_MA_-_20191114_122911.jpg) |
| interior.jpg | Residential interior / Jolene Hardy | [CC0 file record](https://commons.wikimedia.org/wiki/File:Modern_wooden_house_interior_(Unsplash).jpg), published before the 2017 Unsplash license change |
| courthouse-facade.jpg | Palace of Justice facade / Jebulon | [CC0 file record](https://commons.wikimedia.org/wiki/File:Courthouse_facade,_Rome,_Italy.jpg) |
| library.jpg | Library stacks / Jorge Mendoza | [CC0 file record](https://commons.wikimedia.org/wiki/File:Estanter%C3%ADa_de_la_Biblioteca_Vasconcelos.jpg) |

The actual downloaded derivatives and attribution records are bundled, not random remote placeholders. The maintenance script first encountered HTTP 429 from the original-image host, then successfully acquired the reviewed published thumbnail variants. It retains completed downloads and does not run in production requests. The files were resized/compressed, which is recorded as a modification. Catalog matching also considers whether the subject makes sense: a general water-cycle explainer does not receive a library photograph simply because it is educational.

Use the supplied license metadata and source links when publishing; licensing is asset-specific. The catalog does not assert that a stock building, laboratory, meal or library belongs to the generated organization. Captions identify illustrative use. The backend does not independently verify a caller's ownership assertion for supplied images.

## Optimization, safety and delivery

`Service/webpage/imagePipeline.mjs` separates acquisition from `imageOptimization.mjs` and its Sharp worker. Inputs are limited to 12 MiB/16 million pixels and supported raster formats. Decoding runs outside the server process with a 12-second timeout. At most two workers run concurrently; the waiting queue is bounded and expires. Corrupt input, provider failure, private URLs, oversized images and worker failures are tested.

Workers auto-orient, preserve aspect ratio, avoid enlargement and strip original metadata. They produce WebP variants up to 480, 960 and 1600 pixels with quality 80; each variant has a byte ceiling. Content hashes cache processed output. HTML uses srcset/sizes, explicit dimensions, high hero fetch priority, and lazy below-fold images. The static validator verifies all referenced variants. Preview and ZIP use the exact same local file map; attribution stays in the website footer. No image CDN is required by a downloaded site.

The cache uses LEDIFY_WEBPAGE_ASSET_CACHE (default generated/webpage-image-cache). Configure storage retention/cleanup as an operator policy. LEDIFY_WEBPAGE_ROOT can point to a writable persistent Render disk; without it generated artifacts can disappear after a redeploy. Curated source assets are repository files and survive image rebuilds.

## Provider decisions

The optimizer defaults to one worker for small Render instances; `LEDIFY_WEBPAGE_IMAGE_WORKERS=2` permits two. Pexels/Gemini results have a 30-minute disk cache and matching concurrent requests share one acquisition. At most two provider acquisitions run concurrently. API keys are excluded from cached metadata. Processed variants have a separate content-hash cache. Storage retention remains an operator responsibility.

- [Pexels API documentation](https://www.pexels.com/api/documentation/) and [license](https://www.pexels.com/license/) were reviewed. The implementation includes provider and photographer attribution; use must remain within the account's current terms.
- [Unsplash API documentation](https://unsplash.com/documentation) requires hotlinking returned image URLs and download tracking. A bulk-download/offline adapter was deliberately not implemented. The old CC0 photograph already on Commons is a separate licensed asset, not an Unsplash API acquisition.
- Shutterstock requires licensed access; no credentials or unsupported adapter were invented.

## Reproduction

```sh
# Deliberate catalog maintenance, with internet access; not a deployment step:
node scripts/acquireWebpageCatalog.mjs
# Routine deterministic verification:
node --test --test-concurrency=1 tests/regression/website-production.test.mjs
npm run test:webpage:samples
npm run test:webpage:browser
```

Example user image reference:

```json
{"url":"https://your-brand.example/authorized-lab.jpg","rightsConfirmed":true,"creator":"Actual rights holder","license":"Your actual usage rights","alt":"Describe the actual scene","role":"hero","authentic":true}
```

Use a real authorized URL and rights metadata; the example is not an image source. Image references do not change the application's PDF/DOCX-only file-upload policy.
