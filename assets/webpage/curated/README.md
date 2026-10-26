# Bundled photograph library

Reviewed expansion: 26 October 2026. **64 photographs across 20 categories**, about **15.9 MiB** total. The previous library contained six photographs. `food.jpg` now contains a vegetarian pizza photograph; the old salad has been replaced.

Browse the local [photo gallery](../../../docs/bundled-photo-gallery.html) to inspect the collection and individual source/licence links.

| Category | Photos |
| --- | ---: |
| Food, bakery, fruit and coffee | 13 |
| Education and libraries | 5 |
| Property and interiors | 4 |
| Renewable energy | 4 |
| Environment, forests and marine wildlife | 4 |
| Sports and fitness | 4 |
| Agriculture | 3 |
| Automotive | 3 |
| Music | 3 |
| Travel landscapes | 3 |
| Technology and computing | 2 |
| Healthcare and laboratory research | 2 |
| Finance and business districts | 2 |
| Construction | 2 |
| Logistics and shipping | 2 |
| Crafts and pottery | 2 |
| Fashion and retail | 2 |
| Space exploration | 2 |
| Legal architecture | 1 |
| Industrial manufacturing | 1 |

## Rights and accuracy

`catalog.json` records the photographer, exact licence, licence URL, source file page, descriptive alt text, dimensions and SHA-256 of every local JPEG. New images were sourced from Wikimedia Commons and visually reviewed. The collection contains CC0, public-domain, CC BY and CC BY-SA works. Retain each photograph's attribution and licence when reusing or adapting it, including applicable share-alike terms for the image. These licences do not impose the image's licence on the entire website's original code or text.

Existing website image credits and presentation source/credit records carry attribution into generated outputs. Photos of identifiable locations, vehicle brands, people or products do not establish affiliation, endorsement, ownership, company premises or an actual fictional product. An MRI scanner on exhibition is labelled accordingly; an Audi e-tron concept is labelled as a concept.

## Selection and limits

Website fallback ranks eligible photographs by concrete subject and placement. Coffee, bread, pizza, jollof and named travel-location checks prevent common substitutions. Used photographs are excluded from subsequent website placements. Missing, corrupt or out-of-root files are skipped, allowing another eligible photo to be tried.

Presentation `PRESENTATION_STOCK_PROVIDER=auto` consults this local library before online stock search, while preserving source, licence, authenticity checks and duplicate detection. Explicit provider choices and paid-generation opt-in/budgets are unchanged.

This is a starter collection, not coverage of every topic, landmark, cuisine, medical procedure or product. Some categories still have only one or two images. Online licensed search, configured generation where appropriate, or authorized user assets remain necessary when no eligible local photo exists. A limited location-name guard is not a general geographic recognition system.

## Verification evidence

The full repository regression run passed **438 tests** with zero failures or skipped tests (`generated/catalog-expansion/full-regression.log`). After the final subject-filter and diagnostic-limit adjustments, **25 targeted tests** passed (`final-targeted.log` in the same directory). Every bundled image was decoded, checked for nonblank content, verified against its checksum and metadata, and checked for duplicate bytes. A real local render created a restaurant website ZIP and embedded three distinct food photos in PPTX, PDF and PNG outputs; the previews were visually inspected (`output-smoke/report.json`). These checks use local fixtures and real renderers without AI calls; they do not assert a production Render deployment or universal topic coverage.

## Maintenance

- `node scripts/acquireWebpageCatalog.mjs` verifies the current manifest, checksums, dimensions and file availability. It no longer replaces the library with the old six-photo list.
- `node scripts/curateBundledPhotos.mjs discover` caches candidate category metadata under ignored `generated/catalog-expansion/`.
- Prepare `picks.json` there with `id`, Commons `title`, `industry`, accurate `alt` and `subject`. Run `acquire`, inspect actual photos and source licence pages, and create `approved.json` with `reviewedOn`, reviewed `files`, and any metadata `corrections`.
- `node scripts/curateBundledPhotos.mjs publish` merges reviewed additions into the current manifest and records checksums. It is an explicit maintenance action, never a generation/deployment step. Do not approve a photo merely because its download succeeded.
- `node --test tests/regression/bundled-photo-library.test.mjs` checks integrity and selection. `node tests/bundledPhotoSamples.mjs` renders a local website ZIP and a three-slide PPTX/PDF/PNG sample without AI calls.
