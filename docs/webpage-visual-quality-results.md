# Browser and visual quality evidence

Measured locally on Windows on 2026-10-17. These are actual executions, not estimated scores. Production Render was not redeployed or measured.

## Browser verification

Ten deterministic sites: portfolio, startup, professional business, water-cycle education, restaurant, pharmaceutical, store, real estate, legal and school. Fixtures exercise the actual planner normalization, asset pipeline, renderer, static validation and packaging without paid AI requests.

`npm run test:webpage:samples` and `npm run test:webpage:browser` completed successfully. The browser report contains 50 viewport cases: 360, 375, 768, 1024 and 1440px for each site. All passed image-loading, horizontal-overflow, clipped-text, header/hero-overlap and typography-bound checks. Photograph-dependent cases explicitly require a loaded image. Twenty axe audits (desktop and mobile for each site) found no configured WCAG A/AA violations. Automated checks are not a substitute for comprehensive accessibility review.

Additional passing checks: keyboard focus, mobile menu/Escape, FAQ behavior, no-JS navigation, preview width controls, denied sandbox parent/storage access, licensed image delivery in sandbox and offline ZIP, and multi-page navigation in sandbox and downloaded output. `browser-extra-checks.json` records the last four delivery checks. The same validated files feed preview and ZIP.

Evidence is saved under `generated/webpage-samples/`: `manifest.json`, `browser-verification.json`, `browser-extra-checks.json`, per-site extracted files, screenshots at five widths and desktop/mobile accessibility JSON. Outputs are intentionally ignored by Git.

## Actual screenshot review and repairs

Desktop/tablet/mobile screenshots were inspected, including the six principal industry examples. The pharmaceutical site uses split laboratory photography, restaurant uses a full-width food photograph and warm panel, property uses an asymmetric interior photograph, startup uses a labelled workflow concept, legal uses restrained editorial content and a courthouse image band, and school uses welcoming library photography. System font pairs, palettes and content structures differ by purpose.

Review exposed two image-selection defects: a property brief was classified as general professional content, and the initial legal photograph was dominated by a plaza. Source-aware property inference was corrected and the legal asset replaced with a reviewed CC0 courthouse facade. Final screenshots were inspected again. A navigation layout shift was fixed with a trusted pre-paint bootstrap; school initially scored 83 during competing workloads and was remeasured after the repair without those workloads.

Representative screenshots, relative to this document:

- [Pharmaceutical desktop](../generated/webpage-samples/pharmaceutical/screenshots/desktop-hero.png)
- [Restaurant desktop](../generated/webpage-samples/restaurant/screenshots/desktop-hero.png)
- [Property desktop](../generated/webpage-samples/realestate/screenshots/desktop-hero.png)
- [Startup desktop](../generated/webpage-samples/startup/screenshots/desktop-hero.png)
- [Legal mobile](../generated/webpage-samples/legal/screenshots/mobile.png)
- [School mobile](../generated/webpage-samples/school/screenshots/mobile.png)

These links require the locally generated test artifacts; reproduce them with the sample/browser commands.

## Measured Lighthouse results

Lighthouse 13.5.0, headless Edge/Chromium 155, local static Express serving the downloaded website, simulated mobile throttling, 375x812 at DPR 1. Measurements run sequentially after browser tests finished. The preview toolbar/sandbox is not included. No remote fonts or runtime image requests are needed.

| Site | Performance | Accessibility | Best practices | SEO | LCP, ms | CLS |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Pharmaceutical | 99 | 100 | 100 | 92 | 1223 | 0 |
| Restaurant | 100 | 100 | 100 | 92 | 1370 | 0 |
| Real estate | 100 | 100 | 100 | 92 | 1357 | 0 |
| Startup | 100 | 100 | 100 | 91 | 1211 | 0 |
| Legal | 99 | 100 | 100 | 92 | 1371 | 0 |
| School | 98 | 100 | 100 | 92 | 1511 | 0 |

Raw final results: `generated/webpage-samples/lighthouse-results-isolated.json`, with full per-site HTML/JSON under `lighthouse-isolated/`. Earlier reports are retained under `lighthouse/`. Remaining findings include unused shared CSS, render blocking and image delivery opportunities. The robots audit encounters the generated site's restrictive `connect-src 'none'` during Lighthouse's resource fetch; the restriction was retained rather than weakened to inflate a score. These are sample measurements, not guaranteed production or field Core Web Vitals.

## Live Gemini / Pharmax evidence

The actual configured model was called with the short Pharmax organizational brief. The initial generated copy invented facilities despite prompt instructions. New unsupported-claim guards rejected a subsequent detailed attempt rather than publishing those claims. The final sparse-brief path retains AI planning while constructing factual, explicitly editable business content without another speculative content call.

The final live request completed in 9,646ms (AI 9,353ms; rendering 293ms), returned `completed_with_warnings` for missing verified company details, acquired/optimized the CDC laboratory photograph and packaged its WebP assets in the downloadable site. This timing is one measured request, not a five-second or universal latency promise. No paid image-generation service was used.

Receipt: `generated/webpage-live-pharmax/result.json`. The initial unverified output is retained separately for debugging; it is not the approved example. The final preview returned HTTP 200 and its laboratory image was browser-verified as loaded. [Live-generation screenshot](../generated/webpage-live-pharmax/hero.png).

## Regression and limitations

The final full regression suite passed **259 tests, zero failures, zero skipped**, in 119.6 seconds. The focused webpage suite also passed all 50 tests. Coverage includes unsupported uploads and existing presentation/document behavior, source validation, local/authorized assets, corrupt/oversized/SSRF/timeout inputs, provider fallback and cache sharing, contrast and multi-page HTTP/ZIP delivery. All webpage module syntax checks and `git diff --check` also passed.

Pexels and opt-in Gemini image adapters are implemented and tested with controlled providers but were not verified against live accounts. Catalog coverage is limited to five reviewed photographs. Screenshots confirm these representative designs, not every possible model output. Real brand details, authentic images and any submission/commerce backend must still be supplied before a generated business website is published.
