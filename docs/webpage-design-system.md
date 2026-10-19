# Website design system

## Pipeline contracts

Content, design and assets are separate. The AI planner emits sections plus optional `designBrief`, `designSpec` and typed page definitions. `webpageDesignService.mjs` normalizes older plans. `websiteBrief.mjs` compiles project, brand, reference, factual, photographic and technical requirements. `webpageThemeService.mjs` produces actual color/type tokens. `imagePipeline.mjs` acquires and optimizes assets. The renderer consumes those objects; AI never writes executable HTML/CSS/JS.

The architecture audit records the prior limitations. Unsupported business facts are rejected by content-grounding guards, in addition to contact, numerical and testimonial validation. A short name-and-industry-only organization prompt uses the AI design plan and a factual content skeleton rather than asking the content model to invent operations. Missing copy is visibly identified and the API returns `completed_with_warnings` / `WEBSITE_FACTS_REQUIRED`. This is a usable design draft requiring business content, not a verified ready-to-publish corporate site.

## Briefing API (additive)

Existing `textPrompt`, `urlPrompt`, `file`, `outputType`, context and routes remain. PDF/DOCX are still the only uploaded input formats. Images are supplied as authorized HTTPS references, not a newly allowed upload format.

```json
{
  "textPrompt": "Create a pharmaceutical website for Pharmax. Supplied services: formulation research and laboratory analysis. Email research@pharmax.example.",
  "outputType": "webpage",
  "context": {
    "websiteBrief": {
      "name": "Pharmax",
      "industry": "healthcare",
      "audience": "Research partners",
      "conversionGoal": "A research inquiry",
      "pages": ["home", "about", "services", "contact"],
      "brandPersonality": "Precise and considered",
      "designAdjectives": ["scientific", "restrained", "clear"],
      "photoSubjects": ["laboratory research"],
      "photographyStyle": "Natural editorial",
      "crop": "right",
      "preferredTypography": "humanist"
    },
    "designPreferences": {
      "paletteId": "navy-jade",
      "heroComposition": "split",
      "colors": {"primary": "#0B1F3A", "accent": "#A4D7C9"}
    }
  }
}
```

Additional brief fields: organizationDescription, purpose, features, preferredElements, dislikedElements, avoidPatterns, referenceUrls, logoUrl and canonicalUrl. References influence the AI plan; the backend does not copy reference-site code or scrape its assets. Logo URLs use the safe image acquisition path. Empty or unavailable values are omitted rather than invented. An explicit description is treated as user-supplied factual material, not independent verification.

## Implemented design properties

| Property | Implementation |
| --- | --- |
| industry | Brief/photo subject defaults, curated asset matching, palettes, typography and industry component rules |
| heroComposition | split, full-bleed, image-led, asymmetric, minimal, editorial and product architectures |
| paletteId | Curated token set with explicit brand overrides and contrast repair |
| fontPair | humanist, technical, editorial or classical system-font pairs; no remote font requests or redistribution |
| density | comfortable or compact responsive section spacing |
| navigation | sticky or static header |
| motion | restrained hover feedback or none; reduced-motion preferences always respected |
| section composition | editorial, showcase, bento, timeline, list, grid, image-text or image-band |
| crop | left, center, right, top or contain; resized assets preserve aspect ratio |
| page plan | home/about/services/products/portfolio/contact, validated section references and relative navigation |
| canonicalUrl | Per-page canonical/OG URL only when a real publication base is provided |

Other briefing fields guide planning and acquisition; they are not arbitrary CSS injection points. Unknown CSS, fonts or layout enums cannot execute. An operator may need to provide authentic brand imagery or a supported font pair to satisfy a highly specific reference design.

## Color and typography

Curated starting points: navy-jade, aubergine-sand, charcoal-saffron, wine-linen, forest-brass, ink-burgundy, cobalt-sand, graphite-lime and plum-ivory. AI/explicit selection can vary the palette within an industry. Explicit brand primary/accent values take priority; neutral surfaces/text are repaired if they would fail 4.5:1 normal-text contrast. Derived border, focus and hover tokens are implemented. Large headings also use AA normal-text colors, exceeding the less strict large-text threshold.

Headlines use bounded fluid sizing and balanced wrapping; body copy starts at 16px with comfortable line height and limited measure. Serif editorial, classical legal, humanist scientific and technical product treatments are system-font stacks. Font availability varies by OS; browser evidence uses installed Windows fonts. No commercial font files are bundled.

## Distinct architectures and interactions

Scientific split photography, restaurant full-bleed photography with a solid readable text panel, asymmetric property imagery, a labelled source-backed product workflow concept, restrained legal editorial composition, and a welcoming school photograph serve different purposes. Products/projects/team can use exact authorized item imagery; no stock face is assigned to an invented employee. Menus, timelines, FAQ details, genuine statistics and contact links retain their semantics.

Mobile navigation, Escape dismissal, visible focus, skip links and no-JS navigation are tested. A tiny trusted pre-paint bootstrap avoids the visible navigation changing height after the first paint. Primary actions resolve to supplied contacts or actual sections/pages. No authentication, checkout, booking confirmation or email-sending form is fabricated. A submission/email service remains unconfigured; forms are therefore not emitted as functioning controls.

## Pages and delivery

Single-page section order is preserved. Multi-page plans produce flat local files and shared assets; existing `/preview`, `/site/*file` and ZIP routes stay intact. Empty unsupported pages are omitted rather than filled with invented copy. Secondary pages have unique titles/descriptions and valid local anchors. Preview controls use real 1280/768/390px iframe widths, with scrolling on narrower hosts. The sandbox still has no same-origin access, storage, forms or external network APIs.
