# Architecture audit: production website generation

## Confirmed execution path

`route/generateRoute.mjs` → `controller/generateController.mjs` → text/URL/PDF/DOCX extraction → `Service/aiService.mjs` → `Service/ai/webpageGeneration.mjs` (plan and content) → schema/source validators → `Service/webpageLayoutService.mjs` → `Service/webpageThemeService.mjs` → asset resolution → `renderer/webpage/webpageRenderer.mjs` → `Service/webpageStaticValidator.mjs` → `Service/webpageArtifactService.mjs` → capability-protected handlers in `controller/webpageAssetsController.mjs`.

## Why the prior changes were insufficient

1. **No automatic acquisition.** `Service/webpageAssetService.mjs` returned `WEBPAGE_IMAGERY_UNAVAILABLE` when `LEDIFY_WEBPAGE_IMAGE_MANIFEST` was unset. All three image configuration checks were false locally. A generated Pharmax sample returned HTTP 200 with zero image elements. Supporting a catalog did not supply a catalog or an image provider.
2. **Limited hero semantics.** `components.mjs` rendered one two-column wrapper and a repeated content index. `styles.mjs` varied its color/shape or changed it to one column. Neither a full photographic stage nor a real product presentation existed. In image-free results, business, science and education resembled each other.
3. **Incomplete brief consumption.** Industry, density and hero composition were used; audience/conversion/image-direction fields did not meaningfully drive acquisition. Typography had two fixed font choices and a category palette was mostly deterministic by industry.
4. **Single-page restrictions.** `webpageLayoutService.mjs` rejected more than one page. `webpageStaticValidator.mjs` required `index.html` and assumed every fragment targeted that document. Multi-page output required coordinated schema, renderer, delivery and archive validation changes.
5. **No responsive image processing.** Raw local PNG/JPEG assets were bundled unchanged. There was no WebP compression, srcset, width-dependent download or optimization cache.
6. **Measurement gaps.** Browser tests checked geometry, offline files and isolation but omitted 360px, real-estate/legal examples, accessibility auditing and Lighthouse scores. Their artificial image test established delivery correctness, not photographic relevance.
7. **No evidence of a caching defect.** Artifacts use fresh UUID directories. Preview and ZIP are built from the same validated file map. The demonstrated zero-image result came from the actual current renderer, not a stale browser template. Production deployment/version must still be checked separately; local changes do not prove Render is updated.

## Constraints preserved

PDF/DOCX upload restrictions, ordinary text/URL input, generation response versions, MongoDB storage, existing route shapes and opaque-origin preview sandbox remain. Browser testing stays outside production requests. External services require explicit server configuration. Stock imagery must not imply ownership, certification, endorsement or authentic premises.

## Implementation direction

Compile an automatic professional brief; consume a typed design specification; acquire assets through a priority-ordered provider abstraction with a real bundled catalog; optimize images in bounded isolated workers; render purposeful photographic/product/editorial architectures; add flat linked HTML pages without changing existing URLs; retain validated local assets in ZIPs; measure browser behavior, accessibility and Lighthouse performance. Report absent services and unmeasured targets accurately.
