# Presentation image verification results

Date: 19 October 2026. Local verification only; no Render deployment or GitHub push.

## Results

Five complete presentations were generated through the actual layout/theme, visual-resolution, PPTX, LibreOffice PDF and PNG pipeline. They contain **40 slides, 29 embedded photographs and 10 native editable process/relationship visuals**. All five produced valid PowerPoint files, PDFs and all eight slide PNGs. All expected photo regions passed comparison with the prepared source after conversion; all recorded image frames exceed the effective 90-pixels/inch floor. Measured effective resolution ranges from 143 to 312 pixels/inch in these samples.

The fixtures use authored, qualified content to isolate image/renderer behavior, with real licensed Commons source files. They are not five freshly generated Gemini outlines or five live paid image-generation jobs. Source retrieval involved actual public metadata and image downloads, followed by human selection and cropping corrections. Final repeatable renders use a controlled provider returning those reviewed files. This demonstrates acquisition, asset normalization, self-contained embedding, conversion, quality checks and delivery without repeated provider costs; it does not prove that blind stock search always chooses the best image.

| Presentation | Slides | Photo slides | Native diagram/process slides | Charts | Source types | Failed requests / missing assets in final render | PPTX / PDF / PNG |
| --- | ---: | ---: | ---: | ---: | --- | --- | --- |
| Artificial Intelligence in Modern Healthcare | 8 | 6 | 2 | 0 | Licensed stock, including public-domain CDC/NIH imagery | 0 / 0 | Passed / Passed / 8 passed |
| Endangered Marine Species | 8 | 5 | 2 | 0 | Licensed underwater/coastal photography | 0 / 0 | Passed / Passed / 8 passed |
| Business Strategy and Market Expansion | 8 | 6 | 2 | 0 | Licensed city, port, warehouse and meeting-space photographs | 0 / 0 | Passed / Passed / 8 passed |
| Renewable Energy and Climate Change | 8 | 6 | 2 | 0 | Licensed wind, solar, hydro, grid and geothermal photographs | 0 / 0 | Passed / Passed / 8 passed |
| Pharmaceutical Manufacturing | 8 | 6 | 2 | 0 | Licensed facility, vial, analytical instrument, bioreactor and laboratory photographs | 0 / 0 | Passed / Passed / 8 passed |

The marine conclusion deliberately uses a native synthesis composition. Its image target is five after excluding that slide; other decks target six. No quantitative input was supplied, so charts were not invented merely to fill a chart quota. The existing finance/chart regression and previous rendered finance sample continue to cover native charts.

## Actual files to review

All paths below are relative to this report. Each directory also includes eight individual slide images, `result.json`, `image-provenance.json` and original source/rights metadata in `sources/`.

| Topic | Rendered screenshots | Editable PowerPoint | PDF |
| --- | --- | --- | --- |
| Healthcare | [All slides](../generated/presentation-imagery/healthcare/contact-sheet.png) | [PPTX](../generated/presentation-imagery/healthcare/presentation.pptx) | [PDF](../generated/presentation-imagery/healthcare/presentation.pdf) |
| Marine species | [All slides](../generated/presentation-imagery/marine/contact-sheet.png) | [PPTX](../generated/presentation-imagery/marine/presentation.pptx) | [PDF](../generated/presentation-imagery/marine/presentation.pdf) |
| Business | [All slides](../generated/presentation-imagery/business/contact-sheet.png) | [PPTX](../generated/presentation-imagery/business/presentation.pptx) | [PDF](../generated/presentation-imagery/business/presentation.pdf) |
| Renewable energy | [All slides](../generated/presentation-imagery/energy/contact-sheet.png) | [PPTX](../generated/presentation-imagery/energy/presentation.pptx) | [PDF](../generated/presentation-imagery/energy/presentation.pdf) |
| Pharmaceutical | [All slides](../generated/presentation-imagery/pharmaceutical/contact-sheet.png) | [PPTX](../generated/presentation-imagery/pharmaceutical/presentation.pptx) | [PDF](../generated/presentation-imagery/pharmaceutical/presentation.pdf) |

`generated/presentation-imagery/manifest.json` identifies the final backend preview IDs and quality checks. Files are ignored by Git and have not been staged.

## Visual findings and repairs

Actual rendered screenshots were reviewed for all five subjects. The photographic hero/side-panel/editorial compositions preserve readable theme panels and show different subjects and palettes. Editable diagrams remain distinct from photographs. No obvious critical text overlap, missing photo region or distorted aspect ratio was observed in the final reviewed slides.

Review found unsuitable early results: an unrelated industrial mixer, a scanner-building exterior, a scanner illustration, an old laboratory archive portrait, a construction-site photo returned for a laboratory query, and an unrelated electronic-tablet press event. Those were replaced with appropriate licensed photographs. Production retrieval gained metadata classification, topical ranking and ambiguity checks. Review also replaced a hazy marine cover with a clear turtle photograph and adjusted laboratory-image focal points to preserve the face and action. Image search remains fallible; these manual reviews are documented rather than represented as autonomous semantic vision.

Commons returned temporary errors and HTTP 429 for some individual candidate files. Source acquisition used bounded retries and then stopped using those candidates. The final source pack is available offline. The final rendering table's zero failures applies to the controlled final runs, not to all earlier public-network attempts. Acquisition logs are retained under `generated/presentation-imagery-*acquisition.log` and the source provenance files retain author/license/source URLs. No licenses were invented.

## Automated tests and delivery

- Full regression suite: **307 passed, 0 failed, 0 skipped**, 86.78 seconds, including existing documents, webpages, uploads, URLs, presentation generation, artifact security and response compatibility. Log: `generated/presentation-imagery-full-tests-final.log`. The final image-specific rerun also passed all 17 tests after the last source-validation refinements.
- Image-specific tests cover server cost policy, retry reservations, concurrency, deck deadline, source deduplication, cache integrity, decoding/blank images, resolution/cropping, no-image requests, focal coordinates, invalid user payloads, actual embedded DOCX/PDF images, new source-image inventory behavior, private binary transport, exact PPTX photo embedding, two-photo grids and missing photo regions after conversion.
- The Gemini image adapter is tested with an injected model client: detailed art direction, configured model, aspect ratio, resolution, budget reservation, synthetic metadata and visible disclosure are checked. This is not a paid provider call or proof of live account eligibility. Pexels and a live Gemini image-generation model were not enabled in this environment.
- The actual backend asset controllers passed **55 HTTP delivery requests** across all five final decks: 10 PPTX/PDF downloads, 40 PNG previews and 5 inline PDF previews. Downloaded bytes matched the rendered files using SHA-256. See `generated/presentation-imagery/delivery-report.json`.

Final local render/check measurements, excluding source downloads and text AI: healthcare 24.963 s; marine 28.964 s; business 50.313 s; energy 44.585 s; pharmaceutical 23.165 s. Some runs shared machine resources with other verification, so these are observations rather than comparative performance benchmarks or latency guarantees.

## Reproduction

```powershell
npm test
node --test tests/regression/presentation-images.test.mjs
# Reuse already downloaded, reviewed stock assets without new API calls:
node tests/presentationImagerySamples.mjs
node tests/presentationRedesignDelivery.mjs generated/presentation-imagery/manifest.json
# One selected deck; also updates its entry in the full manifest:
node tests/presentationImagerySamples.mjs --only healthcare
```

On a fresh checkout, the large source photos are intentionally absent. `node tests/presentationImagerySamples.mjs --acquire` retrieves candidate sources over the public network and then renders; it may be rate-limited or return different search results, which need review. Already downloaded reviewed sources can be reused across appropriate topics; otherwise the selected source is retrieved from Commons. These commands do not enable paid generation. Existing LibreOffice/Poppler or the supported PDF.js fallback must be available for real conversion.

## Limits

No universal aesthetic, semantic-relevance, legal-rights, subject-crop or scientific-accuracy guarantee is made. Metadata guards, focal points and region comparison are meaningful technical checks, not a vision critic. Stock lighting/color can differ, and 90 pixels/inch is a screen-oriented minimum rather than print certification. Exact duplicates are detected; perceptually similar or re-encoded images can evade byte hashing. Rights asserted by users remain user assertions. First-ten-page PDF and supported DOCX-media limits are deliberate. No paid image-generation account, Pexels account, Microsoft PowerPoint application or Render production workload was exercised in this task.

See [implementation and frontend/API instructions](presentation-image-pipeline.md) for file changes, provider choices, budgets, performance implications and deployment settings.
