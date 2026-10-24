# Image relevance correction — 25 October 2026

## Root cause

The reported Render artifact is an AI overview, but its hero is the bundled CDC pipetting photograph. `Service/webpage/imageReview.mjs` had no computing/AI concept. The words “research,” “scientific,” and “learning” placed AI in broad scientific/education groups. A single matching group gave the laboratory photograph a semantic score of 1. The curated fallback selected the first acceptable entry, without independent subject specificity.

Website Pexels search selected its first dimensionally eligible result. Missing provider alt text could be replaced with the requested alt text, making the request appear to describe the candidate. Presentation Commons had lexical/context checks, but Pexels lacked equivalent metadata filtering. Presentation cache checks were provider dependent. The two pipelines shared acquisition infrastructure, not a consistent relevance decision.

## Implementation

`Service/visual/imageRelevance.mjs` now supplies common independent-metadata checks. AI/computing, architecture, marine wildlife, healthcare technology, agriculture, renewable energy, laboratory work, and space have explicit subject anchors. Placement-specific constraints distinguish, for example, solar from wind, turtles from whales, and interiors from mansion exteriors. Computing architecture is distinguished from residential architecture. Unrecognized subjects use conservative lexical evidence; absence of relevant metadata is not proof of relevance.

Website plans carry the overall topic, section/item subject, role, style, purpose, and explicit image exclusions. Original user instructions continue to drive the planning brief and now also supply recognized exclusion clauses. Candidate metadata comes from the image provider/catalog, not the requested alt text. Applicable subject and section checks run before acceptance; provenance, dimensions, aspect ratio, decoding, duplicate checks, and content hashes remain enforced. Broad legacy categories remain available for other established topics, but cannot override a recognized specific subject such as AI.

Pexels considers the returned descriptions. Commons uses bounded query refinement and filters candidates before downloading. Websites can use Commons as an additional keyless authorized source after their existing configured providers. This adds no dependency or API key. Website caches include topic/placement/exclusions in their versioned identity, and cached candidates are re-reviewed. Presentation stock candidates are checked on acquisition and cache reuse before normalization/embedding.

Optional failures produce content-led layouts and warnings. Explicitly required missing images retain incomplete status. No unrelated default photograph is substituted. Caller-mapped presentation images retain their explicit reuse authorization; this is not independent visual certification.

Safe `[IMAGE_RELEVANCE]` diagnostics include bounded topic/purpose/query, independent candidate metadata, decision, and rejection reason. Existing `[IMAGE_ASSET]` records retain provider attempt counts, retry counts, and final outcomes. Credentials and signed URLs are redacted from relevance diagnostics. Full prompts and binary images are not logged.

## Files changed

Production: `Service/visual/imageRelevance.mjs` (new), `imageArtDirection.mjs`, `imageProviders.mjs`, `presentationImageAssets.mjs`; `Service/webpage/imageReview.mjs`, `imageStrategy.mjs`, `imagePipeline.mjs`, `imageProviders.mjs`, and `providerCache.mjs`.

Verification: new `tests/regression/image-relevance.test.mjs` and `tests/imageRelevanceLive.mjs`; updated metadata fixtures in `mandatory-presentation-images.test.mjs`, `performance-pipeline.test.mjs`, `presentation-image-outages.test.mjs`, `presentation-images.test.mjs`, and `presentation-redesign.test.mjs`; updated the authorized-provider expectations in `website-production.test.mjs`. Older embedding tests supplied bytes without candidate descriptions; they now provide explicit fixture metadata. Simulated provider metadata tests do not certify the subject visible in fixture pixels.

No endpoints, text models, credentials, rendering formats, upload policy, or document-generation behavior were changed.

## Verification and evidence

- Twelve new regression cases cover the six requested subjects across hero, section, gallery-item, presentation-background and presentation-foreground roles; the exact CDC/AI defect; irrelevant-result rejection before download and bounded query refinement; optional/required fallback behavior; safe diagnostics; prompt-derived exclusions; and ambiguous brand/home-page labels.
- Full final `npm test`: **422 passed, 0 failed, 0 skipped**, 261 seconds. Log: `generated/image-relevance-final-validation.log`. Final diagnostics/reliability run: 32 passed. Final topic/gallery compatibility run: 26 passed. Earlier targeted compatibility run: 64 passed.
- Real website regeneration used the original Wikipedia AI URL, real Gemini 3.7/3.5 text models, and the configured Gemini 3.1 Flash Image provider. Database admission was stubbed in this isolated runner; URL extraction, text generation, image generation, optimization, renderers, artifact storage, routes, and ZIP creation were real.
- Website result: `generated/image-relevance-live/2026-10-24T22-47-36-641Z/response.json`. One original AI concept image was generated and saved. It depicts computing hardware, neural-network schematics, and computing-history material. The CDC pipetting image is absent. Desktop (1440 px), mobile (390 px), and the original image were visually inspected for topic relevance. Preview/image HTTP delivery passed; image bytes match the CRC-checked downloadable ZIP.
- Website runtime was approximately 115 seconds including extraction. This is a relevance correction, not evidence of a speed improvement. Paid image generation used the existing configured one-image limit.
- Real three-slide AI presentation: `generated/image-relevance-live/presentation/result.json`. Real text generation reused the already-generated, inspected AI illustration as an explicitly supplied image, with external image generation disabled. PPTX/PDF/PNG stages all completed. PPTX package validation confirmed one embedded title image, and PDF-to-PNG image-region comparison passed (mean absolute pixel error 2.35). The title-slide PNG was visually inspected. This verifies actual embedding/conversion of that image; it is not a live six-topic provider benchmark.
- Presentation files: `generated/previews/6bf68713-14f5-47d6-8e0f-e4e3db7847af/`.

The verified replacement is also copied into the normal local website artifact store. Its preview returned HTTP 200:

[Open the regenerated local AI website](http://localhost:5000/api/webpages/b13d7859-944a-4cb0-838c-6d8156f41437/33ab2bbc24333e45d0e736afe128cb31e8ea2a19a6dc9003f8b263f70da8b24d/preview).

Visual evidence: `generated/image-relevance-live/2026-10-24T22-47-36-641Z/website-1440.png`, `website-390.png`, and `image-35fe43502bae05d29d182b1b-1376.webp`.

## Before and after

| Request | Previous risk/behavior | Verified revised behavior |
| --- | --- | --- |
| General artificial intelligence | CDC laboratory photo accepted through “scientific” | Exact CDC metadata rejected; actual regenerated website uses original computing/neural-network concept imagery |
| Real estate / interiors | Shared architecture category could accept another scene | Mansion exterior rejected for interior placement in regression tests |
| Endangered marine species / turtles | Broad topic alone insufficient | Whale rejected for turtle placement |
| Healthcare technology / MRI | Generic laboratory photo might be treated as relevant | Pipetting photo rejected; MRI metadata accepted |
| Agriculture / irrigation | Generic agricultural picture could win | Harvest scene rejected for irrigation placement |
| Renewable energy / solar | Broad renewable category could accept wind | Wind-turbine metadata rejected for solar placement |

Only the AI website and AI presentation were regenerated live. The remaining examples are deterministic metadata/selection regression results.

## Limitations and deployment

Metadata can be incomplete or misleading. This change adds no multimodal visual classifier and does not guarantee relevance for every possible subject. Generated imagery is checked through generation intent, decoding, dimensions and embedding, with the actual AI example manually inspected. Its historical likenesses, labels and diagram details are conceptual and are not validated archival records or teaching diagrams. Human review remains necessary for factual, scientific, geographical, and aesthetic accuracy.

Google/API access, quotas, stock-provider rate limits, and network availability remain external constraints. Persistent Render storage remains a separate requirement for survival across redeployments. Existing saved websites retain their old images; regenerate them after deploying the fix. The reported old Render artifact was not edited in place. Production regeneration/configuration was not changed; the verified replacement is local.

The same shared stock relevance gate is connected to webpages and presentations. Website ZIP byte equality and actual PowerPoint/PDF/PNG embedding have been checked. Document behavior is covered by the full regression suite, with no document code changes.
