# Futuristic website imagery and delivery

The user confirmed the request used 2080. The supplied Render log records 85,689 ms total, including 31,286 ms content generation, 47,251 ms image acquisition and 5,504 ms packaging. Website files were saved, but one required image was missing. The image pipeline reported `incomplete`; the prior generation result consequently returned `incomplete` even with available website files. This provides a backend explanation for an error response, although it does not establish the frontend's exact timing or handling.

The log also shows incorrect fallbacks: spacewalk photos for futuristic city/transit scenes and a library photo for an arcology concept. Broad domain matching does not establish that existing photographs depict a speculative future scene.

## Changes

- Requested hero scenes such as "a photorealistic futuristic city" override a broader generated image direction. Original prompt instructions reach both layout/design and image planning once.
- Explicit speculative/futuristic image direction and conceptual/rendered scene requests require concept imagery. Automatic Commons/Pexels and bundled-photo fallbacks are skipped for these placements. Such imagery is acquired from configured generation or caller-authorized assets, with normal provenance and relevance checks retained.
- Concept placements are reviewed against their own scene instead of unrelated subjects elsewhere in a broad future-technology topic. The check represents generation intent and metadata, not independent computer vision certification.
- Unavailable gallery images preserve approved titles and descriptions using the existing text-capable renderer. No broken-image placeholder is inserted.
- When website files are successfully packaged, missing images produce `completed_with_warnings` and HTTP 201 by default. `imageValidation.status` remains `incomplete`, with `requiredMissing` and an `IMAGE_REQUIREMENTS_UNMET` warning. Actual packaging failures retain their existing status.
- Deployments requiring all images before success can set `WEBPAGE_IMAGE_FAILURE_MODE=strict`, retaining the incomplete/HTTP 422 response. An injected server policy can select the same mode for tests or internal callers.

## Render configuration

The supplied log contains Commons and bundled-catalog attempts, with no Gemini image attempt shown. It does not disclose the deployed environment settings. Concept generation requires the existing explicit server opt-in:

```text
WEBPAGE_ALLOW_IMAGE_GENERATION=true
WEBPAGE_IMAGE_MODEL=gemini-3.1-flash-image
```

It also uses the existing `GEMINI_API_KEY`; `GOOGLE_IMAGE_MODEL` can supply the model when the webpage-specific setting is absent. The default webpage generation cap is two image attempts per request (`WEBPAGE_IMAGE_MAX_GENERATED`). These changes do not enable paid generation or raise its limits automatically. If generation is unavailable or its budget is exhausted, the response lists the missing images instead of using unrelated photographs.

## Verification

All 463 regression tests passed, including actual HTTP tests for warning delivery (201), strict mode (422), available ZIP downloads, skipped stock sources for concept scenes, preserved gallery descriptions and explicit hero direction.

A local live audit of the corrected 2080 prompt completed in 34,053 ms (backend pipeline 33,822 ms), using real configured AI providers and an in-memory database metadata stub. It generated two concept images, including a futuristic city hero that was visually inspected, and retained warnings for two missing planned images under the configured generation cap. Both preview and ZIP returned HTTP 200. This is a local observation, not a Render timing guarantee or full browser/aesthetic certification.

Detailed reports are in `generated/performance-audit/future-website-2026-10-27/`. Run the opt-in live audit using `node tests/performanceAudit.mjs <unique-run-name> future2080`; it uses configured provider accounts. Frontend handling of async jobs and `completed_with_warnings` still follows the existing API handoff.
