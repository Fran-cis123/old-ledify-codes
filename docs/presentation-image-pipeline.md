# Presentation imagery implementation

Implemented locally on 19 October 2026 as an extension to the presentation redesign. Existing document, webpage and presentation API contracts remain available. No new npm dependencies, image-provider subscription, paid image call, GitHub push or Render deployment was introduced.

## Audit and resulting behavior

The old resolver limited foreground downloads to two, only attempted stock retrieval for foreground photography, and generated only decorative backgrounds. Its background path strongly overlaid the photo and reused that background across multiple slides. There was no deck image-cost budget, image coverage report, source-image selection API or independent proof that a requested photo appeared in the converted preview.

The outline prompt now plans content and imagery together and targets 5–7 appropriate image-led slides in an 8–10-slide presentation. A deterministic coverage plan supplements missing/texture-only plans, aiming for 65% where suitable. Precise diagrams, charts, tables and real processes take precedence; explicit no-image requests are respected. Coverage is a target, not permission to insert irrelevant pictures. Missing providers, insufficient resolution, rejected licenses, repeated images, dense content and exhausted budgets remain visible as warnings.

## Providers and art direction

`imageProviders.mjs` supports configured Pexels, a free Commons fallback, and explicitly enabled Gemini image generation. The text model/key alone does not enable image generation. The local configuration audit found a text key, no Pexels key, no image model and image generation disabled; secrets were not printed or modified.

Commons requests inspect source-specific author and license metadata, accept an explicit license allowlist, reject missing authors/rights and restrictions, and preserve source links. Metadata ranking rejects known ambiguity such as an electronic-tablet press event for a tablet-press machine request. It deprioritizes historical imagery for current topics, excludes diagrams/synthetic images from photographic retrieval, and distinguishes imagery from evidence about actual named organizations. These are metadata heuristics, not an autonomous vision model; human review is still needed.

Every resolved image has a detailed brief derived from the slide message, presentation topic, audience, selected theme/palette, composition, lighting, perspective, aspect ratio, focal point and text space. Gemini receives that brief with an explicit no-fabricated-evidence instruction and a synthetic disclosure. Exact scientific diagrams must use the existing verified/structured diagram path rather than invented anatomy. A rejected stock image can fall back to an authorized generated image within budget, or to the existing native content layout with a warning.

Provider references: [MediaWiki Imageinfo metadata](https://www.mediawiki.org/wiki/API:Imageinfo), [Gemini image-generation configuration](https://ai.google.dev/gemini-api/docs/image-generation), [Pexels License](https://www.pexels.com/license/). Source-specific image records, rather than these general links, determine the attribution retained for each asset.

## Rendering and quality

Photo compositions include a photographic hero with an opaque contrasting title panel, full-width section-divider photography, edge-to-edge side panels, editorial image/text, image-led comparison, and an optional two-photo editorial grid. Photo/process layouts keep native editable step labels and arrows. Dense content that cannot safely fit beside a photo falls back without discarding approved text.

The source is decoded with existing Sharp, checked for supported PNG/JPEG/WebP format, animation, byte/pixel limits and minimum dimensions, oriented, cropped to the actual frame around its focal point, then compressed as JPEG without upscaling. Effective resolution must be at least 90 pixels/inch in the intended frame. This is a screen-preview floor, not a print-quality guarantee. Photos are embedded as bytes in PPTX; no external URL is needed to view the downloaded presentation.

Use `context.designPreferences.noImageSlideNumbers` to reserve individual slides for a clean native composition. Global and per-slide focal coordinates are clamped to 0–1. Transparent inputs are flattened onto the theme canvas before JPEG encoding.

The renderer never places critical copy directly over an uncontrolled photograph: opaque theme panels preserve readable contrast. A full-bleed photograph can occupy a section divider, while its copy stays in a separate panel. The same theme/art-direction brief is used across a deck; different topics can select different existing themes. Stock lighting, subject composition and color matching still need visual review.

The asset session bounds retrieval/generation concurrency, retries and the overall image deadline. It caches normalized assets with a versioned brief/provider key and checksum, rejects exact duplicate source bytes even after different crops, and does not cache user image metadata as shared provider search results. User images are stored as normalized internal assets for rendering. Near-duplicate or differently encoded copies are not perceptually deduplicated.

After writing PPTX, serialized ZIP relationships are checked against the exact expected photo bytes. After actual PPTX → PDF → PNG conversion, each photo frame is compared with its prepared source at a reduced pixel grid. This independently detects missing/replaced image regions after both conversions. The tolerance accommodates rendering/color changes; it is not a semantic image matcher. One bounded PDF-to-PNG retry is allowed for image-region failure, with no new image-generation charge. Continued failure preserves available downloads and reports partial preview success. Existing geometry and nonblank-slide checks still apply.

`generatedContent.visualQuality` reports total slides, image target and actual coverage, visual-type distribution, source types, failed requests, missing slide assets and estimated generation reservations. Decorative shapes do not count as photography/illustration. Charts and meaningful native processes/diagrams are reported separately. Each `photoAsset` records description, purpose, slide number, source type/provider, author, usage rights/license, generation prompt when applicable, dimensions, format, changes and asset ID. Internal paths and base64 payloads are removed from public responses. Source credits, license URLs and changes are also stored in slide notes; visible image captions disclose illustrative photography or AI artwork.

## Server configuration

Defaults preserve the existing generation API. Configure these in the server/Render environment, not in frontend requests. No `.env` credentials were changed.

| Variable | Default / behavior |
| --- | --- |
| `PRESENTATION_IMAGES_ENABLED` | `true`; `false` disables photo resolution, including optional supplied photos |
| `PRESENTATION_STOCK_PROVIDER` | `auto`: Pexels when configured, then Commons; alternatives `pexels`, `commons`, `none` |
| `PEXELS_API_KEY` | Optional stock provider key |
| `PRESENTATION_ALLOW_IMAGE_GENERATION` | `false`; explicit `true` required |
| `PRESENTATION_GENERATION_PROVIDER` | `gemini`; adapter also requires `GEMINI_API_KEY` and `PRESENTATION_IMAGE_MODEL` |
| `PRESENTATION_MAX_GENERATED_IMAGES` | 24 generation attempts per deck, including retries; bounded 0–36 |
| `PRESENTATION_IMAGE_ESTIMATED_UNIT_COST` | 0: generation cannot start until a positive server estimate is supplied |
| `PRESENTATION_IMAGE_MAX_ESTIMATED_COST` | 0: generation cannot start until a positive deck ceiling is supplied |
| `PRESENTATION_IMAGE_RESOLUTION` | `2K`; supported settings `1K`, `2K`, `4K`, subject to the configured model |
| `PRESENTATION_MAX_IMAGES` | 12 image assets per deck, bounded 0–12 |
| `PRESENTATION_IMAGE_CONCURRENCY` | 2, bounded 1–3 |
| `PRESENTATION_IMAGE_RETRIES` | 1 retry, bounded 0–2 |
| `PRESENTATION_IMAGE_TIMEOUT_MS` | 60,000 per provider attempt, bounded 1,000–60,000 |
| `PRESENTATION_STOCK_SEARCH_TIMEOUT_MS` | 12,000 per stock attempt, bounded 1,000–30,000; at most three Commons query variants |
| `PRESENTATION_IMAGE_DEADLINE_MS` | 180,000 for image acquisition; queued requests stop when it expires; bounded 1,000–300,000 |
| `PRESENTATION_IMAGE_JPEG_QUALITY` | 88, bounded 70–95 |
| `PRESENTATION_IMAGE_CACHE_DAYS` | 7, bounded 0–30 |

The cost reservation is an estimate using the configured unit price, including failed attempts. It is not a hard provider billing cap; verify prices, quotas, model capabilities and billing controls with the provider. Generation remains disabled if either estimate or ceiling is zero. Warm cached assets require no provider generation call. Image work adds latency and memory; no universal five-second generation claim is made. The image deadline limits new requests but does not make the whole AI/render pipeline asynchronous.

Keep the existing LibreOffice/Poppler or PDF.js conversion setup and persistent presentation storage. Cache storage also consumes disk and should be managed by the operator. The Node render queue remains per process; replicas need shared artifact storage and coordinated capacity planning. No new infrastructure is assumed.

## Frontend: user images without changing source-upload formats

Source documents remain **PDF and DOCX only**. PNG/JPEG/WebP visual attachments are a separate optional JSON field in the existing generation request, not additional `file` upload formats:

```json
{
  "textPrompt": "Create an 8-slide healthcare presentation",
  "outputType": "presentation",
  "context": {
    "visualAssets": [
      {
        "slideNumber": 2,
        "description": "A laboratory photograph to illustrate research activity",
        "usageRights": "I have permission to reuse this image",
        "dataUrl": "data:image/jpeg;base64,REPLACE_WITH_ACTUAL_BASE64"
      }
    ],
    "designPreferences": {
      "imageFocalPoints": { "2": { "x": 0.55, "y": 0.4 } }
    }
  }
}
```

Use `POST /api/generate` or `/api/generate/textPrompt`; multipart generation also accepts `context` as JSON text. At most eight explicitly mapped visual assets, two per slide, with required descriptions and usage-rights statements. Two mapped images produce an editorial grid when the text fits. Base64 images are bounded to approximately 2 MB each and 12 MB combined encoded content, within the existing 16 MB JSON limit; the service fully decodes and validates them before AI generation. Invalid inputs return HTTP 400 with `INVALID_VISUAL_ASSET`. Binary data is passed internally to the visual service, never placed in the text-model context or public response. User-asserted rights are identified as such, not certified licenses.

## Frontend: images embedded in source PDF/DOCX

1. Send multipart `POST /api/presentations/source-images` with one PDF/DOCX in `file`.
2. The response returns up to eight eligible `images` with `imageName`, dimensions, and PDF page number where applicable. It does not publish or persist source image URLs. PDF inspection is bounded to the first ten pages. Unsupported uploads remain HTTP 415.
3. Send the source file again to `/api/generate` or `/api/generate/file`, with `outputType=presentation` and a JSON `context` containing explicit mappings and a reuse-rights statement:

```json
{
  "documentImageRights": "I have permission to reuse the selected source images",
  "documentImageSlides": [
    {
      "imageName": "word/media/image1.jpg",
      "slideNumber": 3,
      "description": "Laboratory equipment shown in the source document"
    }
  ]
}
```

Use the inventory's exact `imageName`; PDF names are `pageNumber:imageName`. No automatic assumption links a document picture to a slide or grants its reuse rights. DOCX media entries and PDF embedded images are extracted, not screenshots of arbitrary pages. Low-resolution, animated or unsupported embedded formats are omitted/rejected. Existing text extraction, text prompts, URL inputs and PDF/DOCX source validation remain intact.

## Delivery when image providers fail

The default is `PRESENTATION_IMAGE_FAILURE_MODE=warn`. Image download/search,
quota, budget, timeout and relevance failures do not discard approved slide
content. Existing generation endpoints return HTTP 201 with
`data.result.status = "completed_with_warnings"`, usable preview/download URLs,
and `data.result.warnings`. A `PRESENTATION_IMAGES_UNAVAILABLE` warning lists
`missingSlides` and safe `imageFailures`; `generatedContent.visualQuality`
retains the requested target, actual count, and missing images. Show these
warnings to users. No placeholders or unrelated photographs replace failures.

This applies to PDF/DOCX uploads, text, URL and combined presentation inputs.
Resolved images are retained; charts, tables and approved content still render.
The server can explicitly restore mandatory-photo rejection with
`PRESENTATION_IMAGE_FAILURE_MODE=strict`. Internal callers may also set
`visuals.allowIncompleteImages=false`. This setting cannot guarantee external
provider availability, and genuine AI text or converter failures remain errors.
Gemini models, credentials, generation routes and response envelopes are unchanged.
The root API response includes `buildCommit` on Render so the deployed revision
can be checked after a GitHub update.

## Authentic photographs

Requests explicitly requiring real or authentic photography use licensed search
and authorized supplied assets only. They never call paid image generation,
even when the outline requests a generated picture or server generation is
enabled. Synthetic provider results and cached synthetic assets are rejected.

For mixed requests explicitly permitting fictional product concept imagery,
only slides describing those concepts may generate an image. They are labeled
"Illustrative concept"; other slides retain authentic-photo enforcement.
Financial/roadmap slides without their own photo brief reuse an industry photo
subject from the deck instead of searching for a fictional company name.

The shared image concurrency limit covers one attempt at a time. Failed attempts
rejoin the queue behind waiting slides, preventing early retries from starving
slides 10–12. Cache hits bypass network slots. The absolute server deadline and
billing limits remain enforced; late calls are skipped before reserving paid
generation when too little usable time remains.

Commons searches remove visual-style words, try shorter subject/location
queries and use location-constrained alternatives for scene details. Relevant
candidates are ranked against the original brief. It tries other licensed
candidates when a download fails. Licensed image alt text describes the actual
retrieved photograph rather than the model's imagined scene. Network,
licensing, relevance, resolution and deck deadline limits still apply. No
picture-free result is described as meeting a mandatory-photo requirement;
the default delivery instead reports the unmet requirement as a warning.

Relevance uses verified Commons categories as well as filenames/descriptions.
Automotive requests exclude unrelated appliances and wreck/scrap imagery.
Fallback queries do not repeatedly download the same failed URL. Cached stock
photos are checked against the current subject rules before reuse.

Metadata requests share a process-wide queue with one-second spacing, a bounded
five-minute cache (128 queries), cancellation, and one bounded retry respecting
`Retry-After`. Rate limiting stops query fan-out and immediate session retries;
it is reported as `PROVIDER_RATE_LIMITED`. This cannot guarantee availability
when the external provider is unavailable or its cooldown exceeds the request's
deadline. No API key or additional package is needed for the Commons adapter.

For an additional licensed source, configure `PEXELS_API_KEY` and keep
`PRESENTATION_STOCK_PROVIDER=auto`. Wikimedia Commons remains the automatic
fallback. This requires working outbound provider and image-host access.
`PRESENTATION_IMAGES_UNAVAILABLE` now includes safe `imageFailures` entries
with slide number, method, status and reason code. `PROVIDER_TIMEOUT`,
`PROVIDER_NETWORK_ERROR`, `NO_ELIGIBLE_IMAGE`, `DECK_DEADLINE_REACHED` and
`AUTHENTIC_PHOTO_PROVIDER_UNAVAILABLE` distinguish acquisition failures without
exposing raw provider messages or credentials. Increasing Gemini image budget
does not solve an authentic-photo source failure.

## Changed files

- Planning/policy/assets: `Service/ai/presentationPrompts.mjs`, `Service/visual/imageArtDirection.mjs`, `imagePolicy.mjs`, `presentationImageAssets.mjs`, `imageProviders.mjs`, `inputImageAssets.mjs`, `presentationVisuals.mjs`.
- Integration: `Service/generateService.mjs`, `Service/input/publicUrl.mjs` (optional abort signal), `controller/generateController.mjs`, `route/generateRoute.mjs`.
- Rendering/verification: `renderer/presentation/photoCompositions.mjs`, `photoQuality.mjs`, `professionalLayouts.mjs`, `pptxRenderer.mjs`, `renderedOutputValidation.mjs`, `previewRenderer.mjs`.
- Verification artifacts/runners: `tests/fixtures/presentationImagery.mjs`, `tests/presentationImagerySamples.mjs`, `tests/presentationRedesignDelivery.mjs`, `tests/regression/presentation-images.test.mjs`, updated photo assertions in the existing presentation suites, and this report/test report.

Earlier unrelated local changes and deletions were preserved. Representative binaries, photos, source licenses and screenshots remain in ignored `generated/presentation-imagery/`, not committed into source control.
