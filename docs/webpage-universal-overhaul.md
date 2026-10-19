# Universal webpage engine: implementation and evidence

Implemented in the local Ledify codebase on 2026-10-17. This extends the preceding production webpage work; it is not a Render deployment. Existing pending cleanup changes outside this task were left in place.

## Confirmed limits and architectural corrections

The live path is `controller/generateController.mjs` → `Service/generateService.mjs` → `Service/aiService.mjs` → `Service/ai/webpageGeneration.mjs`, followed by webpage normalization, design/theme, image acquisition, rendering, static validation, artifact preview and ZIP delivery. Text, URL and validated PDF/DOCX source extraction still precede this path.

1. `Service/webpageDesignService.mjs` replaced every section background with plain/tinted. It now preserves typed section treatments and resolves an explicit creative direction. Industry defaults remain fallbacks for older plans, rather than mandatory rules for new AI direction.
2. `Service/webpageThemeService.mjs` had only light palettes and four font stacks. It now supports dark identities, additional warm/playful palettes, seven licensed system-font stacks and a secondary color token. Mood and explicit branding take precedence over industry fallbacks; foreground contrast is repaired.
3. `Service/webpage/imagePipeline.mjs` stopped external acquisition after one hero. `imageStrategy.mjs` now compiles hero, section and individual gallery targets from actual content. Target identity includes section ID/item title; provider-cache metadata cannot move an image into a different target. Reviewed local images are matched by subject as well as industry. There is no automatic repetition of a hero across every gallery item.
4. `renderer/webpage/components.mjs` treated gallery/product/topic collections as static card grids. Collections can now search and filter locally; image galleries enlarge actual assets in a keyboard-accessible dialog with Escape and focus return. The no-JavaScript image link remains usable. No external data persistence is implied.
5. Every generation had static checks, but no optional bounded browser gate. `qualityGate.mjs` now records static/browser status, uses an isolated browser worker when enabled, captures 360/768/1440px evidence, and permits one trusted responsive CSS repair before reporting residual failures. Browser execution remains opt-in to avoid imposing heavyweight work on every small Render request.
6. Live testing exposed a Gemini grammar limit: the full schema combining creative direction, nested image plans and section background branches returned HTTP 400. Minimal, legacy and individual-extension probes succeeded. `webpagePlanningProviderSchema()` retains the accepted creative-direction extension while concrete image placements are compiled from the generated content. The richer saved-plan schema remains backward compatible. A real event request then completed through both model stages.

## Creative direction and API

Existing endpoints/envelopes are unchanged. Use `outputType: "webpage"` with any supported input route. Explicit preferences override inferred direction:

```json
{
  "textPrompt": "Create a fictional learning site called Night School. Topics: reading, science, mathematics. Use a dark expressive identity and searchable topics. No accreditation, facilities, metrics or staff names are supplied.",
  "outputType": "webpage",
  "context": {
    "websiteBrief": {
      "name": "Night School",
      "audience": "Adult learners",
      "features": ["search", "filter"],
      "designAdjectives": ["expressive", "dark", "welcoming"],
      "preferredTypography": "geometric"
    },
    "designPreferences": {
      "paletteId": "midnight-electric",
      "heroComposition": "editorial",
      "background": "gradient",
      "geometry": "round",
      "spacing": "balanced",
      "typeScale": "expressive",
      "ctaStyle": "pill",
      "interactions": ["search", "filter"]
    }
  }
}
```

The planning response's `creativeDirection` contains concept/personality plus implemented background, spacing, geometry, typeScale, ctaStyle and interactions. Free-text concept/personality guide planning and token selection; arbitrary CSS or executable code is not accepted. Background enums: plain/tinted/brand/accent/dark/gradient/texture/split. Spacing: compact/balanced/generous. Geometry: square/soft/round. Type scale: restrained/balanced/expressive. CTAs: solid/outline/pill. Local interactions: search/filter/gallery.

New palettes: midnight-electric, ocean-night, terracotta, sunflower, in addition to the nine preceding curated palettes. New font pairs: geometric, display and mono, alongside humanist/editorial/technical/classical. These are system stacks with platform-dependent availability, not downloaded commercial font files. Full brand color overrides remain available under `context.designPreferences.colors`; primary, secondary, accent, background, surface, text and muted are validated hexadecimal tokens.

One category can deliberately produce different identities. The two school fixtures retain the same education industry but differ in hero, palette, font, backgrounds, geometry and search behavior. There is no random seed or forced novelty. Existing typed multi-page plans and shared relative assets remain supported for home/about/services/products/portfolio/contact.

## Images, configuration and budgets

Provider priority is unchanged: authorized caller references → authorized deployment catalog → Pexels → explicitly enabled Gemini image generation → reviewed local fallback. Images supplied through authorized HTTPS references retain licensing metadata; this does not add raster files to the generation endpoints' PDF/DOCX upload whitelist.

Gemini's adapter uses the configured image model, TEXT/IMAGE modalities, image aspect-ratio configuration, explicit art direction and conceptual-use restrictions. It uses the existing SDK, not an invented service. The request/response adapter was verified with a controlled client, including real raster bytes through optimization. See [Google's image-generation API](https://ai.google.dev/gemini-api/docs/generate-content/image-generation).

| Variable | Default / effect |
| --- | --- |
| `GEMINI_API_KEY` | Existing text/model account key; never returned to clients |
| `WEBPAGE_ALLOW_IMAGE_GENERATION` | Off; must equal `true` to enable generated imagery |
| `WEBPAGE_IMAGE_MODEL` | No default; select an image-capable model available to the account |
| `PEXELS_API_KEY` | Optional licensed stock search |
| `WEBPAGE_IMAGE_MAX_ASSETS` | 4 assets per site; clamped 1–8, including logo |
| `WEBPAGE_IMAGE_MAX_GENERATED` | 2 generated-provider attempts; clamped 0–4 |
| `WEBPAGE_IMAGE_TIMEOUT_MS` | 30000; clamped 1000–60000 per provider attempt |
| `WEBPAGE_IMAGE_TOTAL_MS` | 60000; clamped 1000–120000, elapsed acquisition cutoff checked before external calls |
| `WEBPAGE_IMAGE_RETRIES` | 0; maximum 1 extra attempt |
| `WEBPAGE_IMAGE_CONCURRENCY` | 1; maximum 2 provider acquisitions across requests |
| `LEDIFY_WEBPAGE_IMAGE_WORKERS` | Existing optimizer worker limit, default 1, maximum 2 |
| `LEDIFY_WEBPAGE_ASSET_CACHE` | Existing processed/provider cache path |
| `LEDIFY_WEBPAGE_IMAGE_MANIFEST` | Existing authorized brand catalog |
| `LEDIFY_WEBPAGE_ROOT` | Existing artifact root; use persistent storage for durable Render links |
| `WEBPAGE_BROWSER_QA` | Off; `true` enables an isolated development browser gate |

Retries count toward the generated-provider attempt budget. Cache reuse may reduce actual billed calls. Global concurrency defaults are deliberately conservative; the engine's target loop is sequential within one website. Time budgets do not promise total request latency: text generation, safe downloads and image optimization have their own limits. Missing generation configuration is reported as `WEBPAGE_IMAGE_GENERATION_NOT_CONFIGURED`; missing targets as `WEBPAGE_IMAGE_PLAN_INCOMPLETE`. These warnings do not claim imagery was generated.

No image model or Pexels key is configured in the inspected environment. **Live AI image generation remains blocked by configuration and was not claimed as verified.** Four actual licensed photographs were resolved for the live event, including three distinct gallery items. The live reading initiative found no matching local subject and correctly returned missing-image diagnostics instead of unrelated stock imagery. The bundled catalog has five photographs, not universal subject coverage.

## Quality and actual test evidence

The final complete suite passed **270 tests, zero failures and zero skipped**, in 98.7 seconds. Module syntax checks and `git diff --check` passed. The browser suite completed 13 fixtures × five widths = **65 viewport cases**, with **26 desktop/mobile axe audits**, preview isolation, offline ZIP assets, navigation, FAQ, search/filter results, gallery enlargement/Escape/focus return and no-JS navigation. All passed. The suite was rerun after the final gallery fallback/typography changes.

Categories: corporate/business, education, healthcare, technology, hospitality, e-commerce, creative portfolios, nonprofit, event, professional services, property/legal examples, and a contrasting second school direction. The comparison recorded **seven hero compositions, ten palette selections and five font pairs** across the thirteen fixtures. `generated/webpage-samples/cross-category-comparison.json` records hero, palette, font, section sequence/compositions, backgrounds, interactions and image counts. Fixtures isolate rendering regressions; they do not prove that every model response will meet subjective design expectations.

Visual inspection found an awkward mid-word wrap in the expressive event hero. The renderer now identifies long headline words and uses a more restrained responsive scale for those headlines. Gallery controls also had an accessible-name mismatch; their visible and accessible labels were aligned and axe rerun. The first HTTP browser gate stalled on below-fold lazy images; the verification worker now explicitly loads images with a bounded decode wait. Production lazy loading remains intact.

The actual isolated browser gate passed an event at 360/768/1440 with four loaded source images and no repair required. A controlled regression verifies one repair maximum and immediate reporting of non-repairable broken images. No test claims that those automated checks prove aesthetic quality.

### Two actual live Gemini generations

| Request | Actual result | Measured generation |
| --- | --- | ---: |
| Fictional Open House Sessions event | AI dark geometric/asymmetric direction; search/filter/gallery; four licensed photographs, all targets resolved | 21,920 ms |
| Fictional Shared Chapters reading initiative | AI quiet textured editorial direction; source-grounding rejected one draft and its retry passed; no suitable photograph, warnings retained | 32,577 ms |

Both real outputs passed separate 360/768/1440 browser checks, zero configured axe violations, preview HTTP delivery and byte-for-byte ZIP download verification. The event has four source images; opening its dialog creates a fifth DOM image as expected. Results and actual screenshots are under `generated/webpage-universal-live/{event,nonprofit}/`. `refreshSaved.mjs` can re-render that recorded content without another paid model call; `rerenderedAt` distinguishes it from the original AI timing receipt.

Screenshots: [event desktop](../generated/webpage-universal-live/event/hero-1440.png), [event mobile](../generated/webpage-universal-live/event/desktop-360.png), [reading initiative](../generated/webpage-universal-live/nonprofit/hero-1440.png), [contrasting dark school](../generated/webpage-samples/schoolExpressive/screenshots/desktop-hero.png), [original school](../generated/webpage-samples/school/screenshots/desktop-hero.png). These are local test artifacts, regenerated by the commands below. Earlier Lighthouse figures in the preceding report belong to that earlier renderer revision; no new Lighthouse scores are asserted for this overhaul.

## Reproduce

```sh
npm test
npm run test:webpage:samples
npm run test:webpage:browser
node tests/webpage/compare.mjs
# Optional live calls consume configured provider quota:
node tests/webpage/universalLive.mjs event nonprofit
node tests/webpage/verifyLive.mjs event
node tests/webpage/verifyLive.mjs nonprofit
# Re-render recorded AI output without provider calls:
node tests/webpage/refreshSaved.mjs event
# Optional performance measurement, after other tests finish:
node tests/webpage/lighthouse.mjs --isolated
```

Install development browser dependencies and Edge/Chromium for browser checks. Production `npm ci --omit=dev` does not include browser tooling; keep `WEBPAGE_BROWSER_QA` off there or run a separately provisioned QA environment. Quality metadata explicitly says `browser: not-run`, `unavailable`, `passed` or `failed`; static validation is always performed. Browser worker capacity is one, with a 45-second deadline per audit and at most two audits for one repair. Evidence is written under `generated/webpage-qa/`; arrange retention outside ephemeral storage where needed.

## Files changed in this extension

- Planning/schema: `Service/ai/webpageGeneration.mjs`, `templates/webpage/webpageSchema.mjs`, `Service/webpageContentValidator.mjs`.
- Direction/tokens: `Service/webpageDesignService.mjs`, `Service/webpageThemeService.mjs`, new `Service/webpage/creativeDirection.mjs`.
- Images: `Service/webpage/imagePipeline.mjs`, `imageProviders.mjs`, `providerCache.mjs`, new `imageStrategy.mjs`.
- Rendering: `renderer/webpage/components.mjs`, `styles.mjs`, `webpageRenderer.mjs`, new `creativeStyles.mjs`.
- Quality integration: `Service/generateService.mjs`, new `Service/webpage/{qualityGate,qualityWorker}.mjs`.
- Regression/evidence: new `tests/regression/webpage-universal.test.mjs`, extended `tests/webpage/{fixtures,samples,browser}.mjs`, new `tests/webpage/{compare,universalLive,verifyLive,refreshSaved}.mjs`, this document.

No additional dependency was installed for this extension. Existing presentation/document/upload routes and contracts remain covered by the full suite. Existing multi-page preview/ZIP tests still pass. No MongoDB credentials or Render settings were modified.

## Limits and implementation status

Implemented and browser-tested: typed creative resolution, additional dark/light color/font choices, varied backgrounds, exact gallery images, local search/filter/enlargement, responsive rendering, preview/ZIP delivery, static QA and optional bounded browser repair. Live text planning/content generation is verified for two contrasting requests.

Implemented with controlled integration coverage, not live image-account verification: the configurable Gemini image-generation adapter and Pexels acquisition. Live image generation is blocked until an available image model is configured and enabled. Caller ownership assertions are not independently verified.

Not implemented as external services: contact submission, booking confirmation, newsletter persistence, checkout, payment processing, authenticated dashboards or a general CMS. Genuine supplied email/contact links work; unsupported services are disclosed rather than simulated. Image upload files are not added to the PDF/DOCX generation endpoints; use authorized image references or an owned catalog. Arbitrary custom fonts, arbitrary page types and exact reference-site cloning are not supported. Semantic claim validation remains heuristic and publication needs human factual/aesthetic review.

This is a broader, tested composition engine, not a guarantee that every possible prompt will produce a publication-ready website or a five-second result. All current changes remain local until explicitly committed/pushed and deployed.
