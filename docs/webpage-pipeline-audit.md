# Webpage pipeline audit

## Discovered flow

`route/generateRoute.mjs` exposes combined, text, URL and file generation endpoints. `controller/generateController.mjs` validates requests and persists generation records. `Service/input`, `fileService.mjs` and `urlService.mjs` extract sources without changing the selected output type. `Service/aiService.mjs` delegates webpages to `Service/ai/webpageGeneration.mjs`: a planning request followed by a content request, both using bounded structured-output retries. `templates/webpage/webpageSchema.mjs` and `Service/webpageContentValidator.mjs` enforce structure and source grounding.

`Service/generateService.mjs` normalizes content with `webpageLayoutService.mjs`, applies `webpageThemeService.mjs`, calls `renderer/webpage/webpageRenderer.mjs`, then validates and packages with `webpageArtifactService.mjs`. Components, CSS and trusted interactions live under `renderer/webpage`. `controller/webpageAssetsController.mjs` serves token-protected previews, bundled files and ZIPs. `previewViewer.mjs` wraps the site in an opaque-origin sandbox. Regression tests and deterministic sample/browser scripts already exist under `tests`.

## Confirmed limitations before this change

- Every hero embeds a preset abstract SVG, irrespective of industry or source. Projects use repeated decorative rectangles/circles, even without real project imagery.
- Five palettes change styling but most sections share the same narrow heading column and card/list body. No section composition or conversion objective is represented in the plan.
- Restaurant headlines can reach 104px; mobile overrides and fixed character widths create awkward wrapping. All body copy uses Arial.
- The static validator has a fixed five-file allowlist, preventing legitimate bundled photographs and image-led content.
- Browser checks require five saved samples and omit pharmaceutical/store cases, 375px and 1024px widths. They check overflow and images but do not assess heading hierarchy or keyboard focus.
- Preview widths are capped to the host viewport; a Mobile/Tablet/Desktop label can describe a narrower actual viewport.
- No runtime diagnostic distinguishes structural validity from aesthetic quality. No licensed image catalog is configured by default.
- Default output storage is ephemeral on Render. Existing capability URLs cannot recover artifacts deleted by restart/redeploy.

## Implementation priorities

1. Preserve APIs, source validation, trusted scripts, sandbox restrictions and offline ZIPs.
2. Add optional validated design intent and purposeful section compositions; keep legacy structured outputs valid.
3. Replace placeholder art with content-led fallback compositions; support a bounded, licensed local image catalog without remote fetching or paid services.
4. Introduce industry typography/palettes, readable fluid sizing, balanced grids and genuine mobile navigation.
5. Expand structural/accessibility diagnostics, deterministic industry fixtures and browser checks across four widths, including preview isolation and downloads.

Automated geometry checks are engineering evidence, not a guarantee of visual beauty. Screenshots require review. A runtime browser is deliberately not required.
