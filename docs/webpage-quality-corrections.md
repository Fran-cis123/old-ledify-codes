# Website quality corrections — confirmed audit

## Investigation before implementation

The live route runs `controller/generateController.mjs` → input extraction (`Service/fileService.mjs`, `urlService.mjs`, `input/combinedInput.mjs`) → `Service/generateService.mjs` → `Service/aiService.mjs` → planning/content prompts in `Service/ai/webpageGeneration.mjs`. Provider and saved-plan schemas are in `templates/webpage/webpageSchema.mjs`; semantic checks are in `Service/webpageContentValidator.mjs` and `Service/webpage/contentGrounding.mjs`. `webpageLayoutService.mjs`, `webpageDesignService.mjs`, `webpage/creativeDirection.mjs` and `webpageThemeService.mjs` normalize and style the page. `webpage/websiteBrief.mjs`, `imageStrategy.mjs`, `imageProviders.mjs`, `providerCache.mjs`, `imagePipeline.mjs` and isolated Sharp optimization acquire images. `renderer/webpage/{components,styles,architectures,creativeStyles,webpageRenderer}.mjs` render trusted HTML/CSS/JS. `webpageStaticValidator.mjs` and `webpage/qualityGate.mjs` inspect files; `webpageArtifactService.mjs` packages the same files for preview and ZIP. `renderer/webpage/previewViewer.mjs` and webpage asset handlers deliver them.

Confirmed architectural causes:

1. `Service/webpage/sparseContent.mjs` writes literal editor instructions into every requested section. This was a deliberate failure-recovery shortcut in the previous bug fix and is unsuitable for finished website copy. `webpageGeneration.mjs` skips the content model entirely on this path, so prompt changes alone cannot fix it.
2. `contentGrounding.mjs` matches regulated-topic nouns in explanatory sentences as though they were claims about a company's operations. This prevents useful general explanations and encouraged the placeholder workaround.
3. `imagePipeline.mjs` ranks a local photograph by counting keyword substrings. It has no central-subject threshold and does not exclude an already-used image hash. A secondary food reference can outrank a literary-gathering subject; a laboratory photograph can recur at several placements.
4. Theme selection repairs only root foregrounds against background/surface. Nested section overrides, textured/gradient backgrounds, captions and hover states are not represented as resolved per-section token sets. UI borders are derived at 22% foreground strength without a non-text contrast threshold.
5. `webpageDesignService.mjs` forces several semantic types into the same layouts and otherwise uses bento/editorial defaults. `components.mjs` repeatedly uses a heading column beside a short paragraph; unchanged section padding creates large empty areas for thin content.
6. Static validation has no prohibition on editor instructions, and optional browser QA checks geometry/images but not resolved text/background contrast. Successful HTML packaging can therefore coexist with editorial or visual defects.

The changes below address these execution-path causes rather than introducing a separate demonstration renderer. Subsequent implementation, measurements, limits and Postman instructions are appended after verification.

## Implemented workflow

1. The existing input routes/extractors and planning model remain in the actual production path. The new `contentSpecification.mjs` compiles a validated content scope before the content-model call. It separates source-grounded organization information from general explanations and identifies facts that require verification. Unsupported products, testimonials, statistics, team profiles, pricing or contact sections are omitted where necessary, with multi-page indexes remapped.
2. Both brief and detailed requests now use the content model. The old `factualSkeleton()` and its literal instruction-filled website copy are removed. Sparse briefs may explain manufacturing, research or other requested concepts without claiming that the organization performs them. Missing fields stay in `generatedContent.contentSpecification.missingInformation`; they are not rendered into sections. A narrow scoped hero rewrite reframes implicit operational wording such as “Delivering…” as an introduction rather than an unverified service claim.
3. Semantic validation distinguishes general explanations from ownership, operations and credential claims. It still rejects unsupported company-specific assertions, fabricated numbers, contact details and attributed testimonials. This is heuristic editorial protection, not a scientific fact-checking service. HTML delivery independently rejects visible editor instructions even if an upstream content check is bypassed.
4. `visualTokens.mjs` resolves explicit hexadecimal root and per-section colors, including alternate/elevated/card surfaces, borders, text, button, hover and focus tokens. It measures normal text at 4.5:1 and UI borders at 3:1; large text uses the stricter normal-text values. Gradient endpoints and texture composites are included in foreground selection. The renderer consumes those resolved section variables rather than relying only on nested generic color overrides.
5. The design compiler preserves explicit choices, introduces coherent contrasting section treatments, avoids consecutive prose layouts where a meaningful alternate exists and reduces padding for thin sections. The renderer implements full-width editorial sections, image/text alternation, image bands, horizontal desktop timelines, bento/showcase/list layouts and mobile stacking. Missing imagery collapses an image composition to a complete editorial layout rather than leaving an empty visual panel.
6. Image plans now retain central subject, purpose, placement, aspect ratio, style, lighting, temperature, focal preference and acquisition method. Candidate review checks semantic metadata, provenance, dimensions and placement. A literary gathering cannot choose a salad hero merely because food appears in its brief. A restaurant can still choose food photography. Word-boundary matching fixes the discovered “collaborators” → “laboratory” error. An unrelated educational topic does not inherit a library photograph solely from the education category.
7. Optimized image hashes reject repeated assets across placements unless repetition was explicitly authorized. Missing gallery images are omitted instead of producing image-less gallery tiles. Remaining targets and provider limits are reported as warnings. The reviewed catalog now includes a clothing photograph: [Tim Wright's CC0 source record](https://commons.wikimedia.org/wiki/File:Clothing_organized_at_home_(Unsplash).jpg), published before the license change. It is labelled illustrative, not a photograph of a generated brand's garments.
8. `websiteSpecification.mjs` creates a schema-validated intermediate representation separating content, visual identity/rationale, layout, image review, interactions and quality state. This reflects the specifications actually consumed by the renderer. Existing JSON response fields and API paths remain compatible; new specification/checklist fields are additive.
9. Every output runs editorial, structural, asset and token checks. Optional isolated browser QA now also runs axe accessibility checks and detects excessive empty sections. Correctable geometry gets at most one trusted repair; failed checks are reported rather than labelled publication-ready. Normal generation returns `completed_with_warnings` when facts, images or visual verification require review. Human aesthetic review remains explicitly required.

## Files modified or created for these corrections

- `Service/ai/webpageGeneration.mjs`
- `Service/generateService.mjs`
- `Service/webpageContentValidator.mjs`
- `Service/webpageStaticValidator.mjs`
- `Service/webpageLayoutService.mjs` (earlier capabilities-anchor fix retained)
- `Service/webpageDesignService.mjs`
- `Service/webpageThemeService.mjs`
- `Service/webpage/{contentSpecification,contentGrounding,sparseContent,creativeDirection,visualTokens,websiteSpecification,imageStrategy,imageReview,imagePipeline,qualityWorker}.mjs`
- `renderer/webpage/{components,creativeStyles}.mjs`
- `scripts/acquireWebpageCatalog.mjs`
- `assets/webpage/curated/catalog.json`, new `clothing.jpg`
- `tests/regression/{webpage,webpage-design-only,webpage-universal,website-production,webpage-quality}.test.mjs`
- `tests/fixtures/generalWebsiteDraft.mjs`
- `tests/webpage/{fixtures,samples,lighthouse,qualityLive,refreshQuality,qualityBrowser}.mjs`
- This report. Existing unrelated pending cleanup/deletions were not included in this correction work.

No new dependency or secret was introduced. Presentation/document generation, PDF/DOCX-only source uploads, source URLs, API routes, capability URLs, viewport controls and ZIP packaging remain covered by regression tests. Raster brand assets continue to use authorized image references/catalogs; they were not added to the source-file upload whitelist.

## Actual live-generation and browser evidence

The final complete regression suite passed **280 tests, zero failures and zero skipped**, in 108.9 seconds. Module syntax checks and `git diff --check` also passed. The final water-cycle image-selection change has a specific regression and targeted browser rerun; it prevents a generic education catalog subject from overriding the actual article topic.

Six actual Gemini planning/content generations were recorded, then their saved AI content was reprocessed through the corrected asset selector and trusted renderer without additional model calls. `rerenderedAt` identifies these asset/render refreshes; original generation timings are preserved. No image-generation API was enabled or used.

| Website | Original measured generation | Hero / palette | Images retained |
| --- | ---: | --- | ---: |
| Pharmaceutical: Pharmax | 43.7 s, one content repair | Full-bleed / navy-jade | 1 |
| Restaurant: Sage & Salt | 34.1 s | Split / forest-brass | 1 |
| Fashion: Thread & Form | 20.3 s | Editorial / plum-ivory | 1 |
| Software: Tandem | 20.8 s | Minimal / forest-brass | 0 |
| School: Cedar Learning | 22.8 s | Split / forest-brass | 1 |
| Portfolio: Maya Chen | 33.0 s, one content repair | Editorial / terracotta | 0 |

The software/portfolio cases use complete content-led compositions because no authorized product/project artwork was supplied. They do not borrow an unrelated laboratory or invent real product screenshots. A single licensed laboratory image is not repeated to fill multiple Pharmax sections; its unmet placement remains in metadata. More imagery requires additional authorized assets or configured providers. Some model-selected palettes remain shared across subjects; variation is not forced with random choices. The six outputs differ in hero architecture, component ordering, section treatment and content, but subjective publication suitability still needs review.

All six live outputs passed **18 viewport checks** (360/768/1440), **18 axe audits with zero configured WCAG A/AA violations**, no horizontal overflow, no broken images, no visible editor instructions, working mobile navigation and preview/ZIP HTTP verification. ZIP responses matched the packaged bytes. The deterministic renderer suite additionally passed **14 sites × five widths = 70 viewport cases**, with 28 desktop/mobile axe audits and navigation, FAQ, search/filter, gallery, no-JS, sandbox, offline-asset and multi-page delivery checks.

Screenshots were actually opened and inspected. This caught the misleading pharmaceutical hero and the unrelated portfolio image before final delivery. Responsive screenshots and raw browser reports are stored under `generated/webpage-quality-live/` and `generated/webpage-samples/`, which remain ignored by Git.

The complete fourteen-site execution log is `generated/webpage-samples/browser-complete-run.log`. The last targeted water-cycle geometry report is `browser-verification-selected.json`; it does not represent all fourteen sites. The six live comparisons are in `generated/webpage-quality-live/comparison.json` and the eighteen live viewport results in `browser-report.json`.

| Actual live website | Desktop | Tablet | Mobile |
| --- | --- | --- | --- |
| Pharmax | [1440px](../generated/webpage-quality-live/pharmaceutical/viewport-1440.png) | [768px](../generated/webpage-quality-live/pharmaceutical/viewport-768.png) | [360px](../generated/webpage-quality-live/pharmaceutical/viewport-360.png) |
| Restaurant | [1440px](../generated/webpage-quality-live/restaurant/viewport-1440.png) | [768px](../generated/webpage-quality-live/restaurant/viewport-768.png) | [360px](../generated/webpage-quality-live/restaurant/viewport-360.png) |
| Fashion | [1440px](../generated/webpage-quality-live/fashion/viewport-1440.png) | [768px](../generated/webpage-quality-live/fashion/viewport-768.png) | [360px](../generated/webpage-quality-live/fashion/viewport-360.png) |
| Software | [1440px](../generated/webpage-quality-live/startup/viewport-1440.png) | [768px](../generated/webpage-quality-live/startup/viewport-768.png) | [360px](../generated/webpage-quality-live/startup/viewport-360.png) |
| School | [1440px](../generated/webpage-quality-live/school/viewport-1440.png) | [768px](../generated/webpage-quality-live/school/viewport-768.png) | [360px](../generated/webpage-quality-live/school/viewport-360.png) |
| Portfolio | [1440px](../generated/webpage-quality-live/portfolio/viewport-1440.png) | [768px](../generated/webpage-quality-live/portfolio/viewport-768.png) | [360px](../generated/webpage-quality-live/portfolio/viewport-360.png) |

## Measured Lighthouse results

Lighthouse 13.5.0, installed Edge/Chromium 155, local static HTTP server, simulated mobile throttling at 375×812, measured sequentially after browser/regression work stopped. These scores describe these actual files, not Render field performance or every future model response.

| Site | Performance | Accessibility | Best Practices | SEO | LCP ms | CLS |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Pharmaceutical | 100 | 100 | 100 | 92 | 1249 | 0 |
| Restaurant | 96 | 100 | 100 | 92 | 1365 | 0 |
| Fashion | 100 | 100 | 100 | 92 | 1504 | 0 |
| Software | 100 | 100 | 100 | 91 | 1210 | 0 |
| School | 100 | 100 | 100 | 92 | 1662 | 0 |
| Portfolio | 99 | 100 | 100 | 91 | 1208 | 0 |

Raw scores: `generated/webpage-quality-live/lighthouse-results-quality.json`; full per-site reports are under `lighthouse-quality/`. The 90+ targets were reached. Remaining findings include unused shared CSS, blocking bootstrap/style resources and the robots audit under restrictive CSP. The CSP was not weakened to inflate scores. No claim of perfect SEO or universal performance is made.

## Postman verification and API use

The user's original long Pharmax JSON was posted to the actual local API and returned **HTTP 201** in **29.4 seconds** after the scope/claim fixes. Earlier live attempts exposed false-positive validation and a provider timeout; those were not counted as successful generations. The recorded response is `generated/pharmax-postman-retest/response.json`. The subsequent narrowly scoped hero reframe has regression coverage and is used by new generations.

Start the backend with `npm run start:dev`, then send `POST http://localhost:5000/api/generate/textPrompt`, Body → raw → JSON, Content-Type `application/json`:

```json
{
  "textPrompt": "Create a professional corporate website for Pharmax, a pharmaceutical manufacturing company. DESIGN DIRECTION: deep navy, cool white and teal, contemporary typography. WEBSITE STRUCTURE: Include About Pharmax, Manufacturing, Research, Quality and Contact. HERO SECTION: use relevant licensed laboratory photography. Explain general industry concepts without claiming that Pharmax owns particular facilities or holds certifications. Do not invent contact details.",
  "outputType": "webpage"
}
```

The longer original request remains valid; this shorter example is not required. For mixed sources use the existing `/api/generate` route with text, URL and/or PDF/DOCX inputs. No endpoint changed.

Read the returned `data.result.artifacts.previewUrl` / `siteUrl` / `downloadUrl`; prefix relative paths with `http://localhost:5000` for local testing. IDs/tokens are generated by the backend. The frontend should show `data.result.generatedContent.contentSpecification.missingInformation` in its review/editor UI, separate from the website iframe. General explanations and omitted unsupported sections are identified in the same specification. `completed_with_warnings` and HTTP 201 mean an artifact was created with disclosed review requirements, not an internal server failure or publication certification.

For a real corporate site, supplying an actual organization description, verified offerings, licensed brand images and a real contact channel produces more specific content. A prompt listing desired sections does not establish those business facts.

## Reproduction and deployment limits

```sh
npm test
npm run test:webpage:samples
npm run test:webpage:browser
# Paid/quota-consuming live text calls:
node tests/webpage/qualityLive.mjs
# Reprocess saved AI content without additional model calls:
node tests/webpage/refreshQuality.mjs
node tests/webpage/qualityBrowser.mjs
# Measure after other workloads finish:
node tests/webpage/lighthouse.mjs --live-quality
# Exact saved Postman payload against the running local server:
node tests/webpage/pharmaxPostman.mjs
```

The existing Gemini image adapter, Pexels adapter, image budgets/cache/worker settings and licensed-source hierarchy remain available. `WEBPAGE_ALLOW_IMAGE_GENERATION=true`, `WEBPAGE_IMAGE_MODEL` and `GEMINI_API_KEY` are required for AI images; no image model or Pexels key was configured in this environment, so live image generation remains unverified. Candidate relevance uses semantic categories plus conservative metadata coverage, provenance, hash/dimension checks; it is not an independent vision model and cannot certify subjective image quality. Caller-authorized assets retain caller responsibility for authenticity/rights.

`WEBPAGE_BROWSER_QA=true` enables the isolated browser gate where development browser tooling and Edge/Chromium are installed; production defaults remain lightweight. On failure its status is explicit, with bounded geometry repair. Browser tools do not run silently inside ordinary Render generation. Retain `LEDIFY_WEBPAGE_ROOT` and image-cache data on suitable persistent storage if links must survive redeploys. Without a persistent disk, Render artifacts remain ephemeral.

Contact submissions, bookings, payments and newsletter persistence still require real integrations. Missing destinations are not represented as working forms. Factual/medical/editorial accuracy and subjective visual quality require human review. The catalog contains six reviewed photographs and cannot satisfy every topic or every requested placement. Generated files are safer and more purposeful, but this report does not claim unrestricted image coverage or publication readiness for every prompt.

The code changes are local. No GitHub push, Render deployment or credential change was performed during this correction task.
