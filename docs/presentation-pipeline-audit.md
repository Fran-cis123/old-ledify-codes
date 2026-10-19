# Presentation pipeline audit

Audit date: 19 October 2026. Existing local webpage changes and legacy-file deletions were present before this task and are preserved.

## Actual execution path

`route/generateRoute.mjs` exposes combined, prompt, URL and PDF/DOCX upload routes. `controller/generateController.mjs` creates a MongoDB request and invokes `Service/generateService.mjs`; extraction remains shared with documents/webpages. `Service/aiService.mjs` uses `ai/slideCount.mjs`, `presentationPrompts.mjs`, canonical content schemas, per-slide generation in bounded batches, deterministic validation and a bounded semantic review. Optional speaker notes already exist. `presentationLayoutService.mjs` dry-renders compatible layouts, `presentationThemeService.mjs` resolves strategy/preferences, and `presentationRendererService.mjs` resolves design tokens. `visual/presentationVisuals.mjs` resolves licensed providers or structured/local diagrams. `renderer/presentation/pptxRenderer.mjs` uses PptxGenJS, native shapes/charts and notes. `previewRenderer.mjs` validates the ZIP, converts with LibreOffice, then Poppler or isolated PDF.js. `controller/presentationAssetsController.mjs` serves slide PNGs, PPTX, PDF and inline PDF. Public URLs are normalized through `presentationPublicUrls.mjs` and `publicGenerationResult.mjs`.

## Confirmed strengths

- Explicit slide-count policy already supports 1–12, default 8–10; no eight-slide cap.
- Strict canonical content keys, numerical grounding, bounded retries, semantic coverage review and notes exist.
- Font-size fit estimates reject dense content rather than truncate it. Diagrams and charts can be editable.
- Conversion failures preserve downloadable files and truthful partial-success metadata. Docker installs LibreOffice, Poppler and substitute fonts. PDF.js fallback is isolated.

## Confirmed weaknesses before changes

- `professionalLayouts.mjs` dispatches primarily by content key. Multiple registered IDs produce identical geometry; `timeline-horizontal` actually renders vertical rows and roadmaps call the generic card grid.
- Paragraph-only explanations receive a full-width block despite an empty heading area; the planner does not specifically distinguish architectures/categories from prose explanations.
- Summary/conclusion use a bold sentence followed by plain bullet rows. Cover/title uses the same text positions, plus automatically injected theme artwork.
- `presentationVisuals.mjs` creates cover, texture and coverArtwork SVG/PNG assets for every deck, including concentric scientific rings, irrespective of their explanatory value. This also spends CPU on full-canvas contrast scans for unnecessary decoration.
- Native non-chain relationships can degrade into textual edge lists. Native diagram connector labels are omitted for some orientations.
- `renderedOutputValidation.mjs` checks count, visible titles/subtitles, labels and nonempty media, but does not inspect XML text-box geometry or pairwise text collisions.
- Explicit numbered slide requests are not checked against their requested positions; topic mapping alone cannot enforce them.
- Conversion concurrency is not centrally bounded. Render storage is ephemeral unless a persistent storage root is configured.

## Primary regression source

The original PPTX is available at `generated/previews/061f5241-311f-4ff5-b0b7-3690c670b717/presentation.pptx`. Preserve it. Extract its real slide text and render its PDF/PNG for before/after comparison. No invented before screenshots.

## Implementation priorities

1. Content-aware visual plans and explicit numbered-slide adherence without fabricating data or rewriting approved claims locally.
2. Distinct editorial opening/closing, real phase progression, comparison and process composition; preserve all canonical content and readable minimum sizes.
3. Remove unconditional geometric artwork; keep optional licensed images and informative diagrams with provenance/fallback warnings.
4. Shared geometry checks during candidate selection and again against real PPTX XML; bounded compatible-layout alternatives, no silent clipping.
5. Render the real healthcare regression and seven deterministic categories through PPTX/PDF/PNG, inspect representative slides and verify downloads plus full application regressions.
