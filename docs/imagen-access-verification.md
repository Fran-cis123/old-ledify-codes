# Imagen access verification — blocked

Checked on 19 October 2026 before modifying Ledify's working generation pipelines, as required by the task. This is an access audit, not a completed Imagen integration.

## Actual checks

- Installed `@google/genai` supports the public `models.generateImages()` method, but its current implementation rejects Gemini Developer API mode and permits this method only in Google cloud platform mode (formerly Vertex AI).
- Using the existing `GEMINI_API_KEY`, SDK model listing succeeded and returned **63 models, none named Imagen**. No credentials or raw provider errors were logged.
- An explicit standalone SDK invocation with the officially documented candidate `imagen-4.0-generate-001` was attempted. It failed at the SDK's cloud-platform-only guard before an image-generation HTTP request was sent. This candidate is **not verified as accessible** and was not configured as `IMAGEN_MODEL`.
- No valid Imagen image was returned, saved, embedded or rendered. No Imagen screenshots or end-to-end success are claimed.
- Local environment checks found no `IMAGEN_MODEL`, `GOOGLE_CLOUD_PROJECT`, `GOOGLE_CLOUD_LOCATION` or credential-file environment setting. The user subsequently confirmed that they do not have a Vertex AI project with Imagen enabled.

## External confirmation

[Google's current Imagen guide](https://ai.google.dev/gemini-api/docs/imagen), updated 17 September 2026, states that Imagen has shut down and is no longer available in the Gemini API. [The Imagen model page](https://ai.google.dev/gemini-api/docs/models/imagen) documents the retired model identifiers and the August 2026 shutdown notice.

Google's [cloud-platform image guide](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/image/generate-images) also includes discontinued-endpoint warnings. A newly created cloud project is therefore not proof that a particular Imagen endpoint is usable. Access must be confirmed against an actual authorized project before integration or billing changes.

## Files added and verification evidence

- `tests/imagenStandalone.mjs`: reproducible model-listing and one-image verification script, with binary validation and secret-safe reporting. It uses `generateImages()`, never substitutes a Gemini image model, and does not change text-model configuration.
- `generated/imagen-verification/standalone-report.json`: ignored local diagnostic artifact from the verification attempt. Its original generic failure is explained by the SDK source inspection above. Subsequent runs classify that local guard as `IMAGEN_REQUIRES_VERTEX`.
- This audit report.

No main-pipeline code, Google keys, model defaults, dependencies, Render settings or existing endpoint contracts were changed by this verification task. No separate image API key was introduced. Existing Gemini 3.7 Flash / 3.5 Flash text responsibilities remain intact.

## Reproduction

```powershell
# Read-only model discovery; generates at most one image if an Imagen model is listed.
node tests/imagenStandalone.mjs
# Explicit diagnostic probe of a documented candidate, not a verified production model:
node tests/imagenStandalone.mjs --candidate imagen-4.0-generate-001
```

The candidate probe currently fails at the installed SDK guard for the existing API-key client. A successful generation on an authorized, supported endpoint would be necessary before choosing `IMAGEN_MODEL` or wiring real image output into website ZIPs and PPTX/PDF/PNG files.

## Required decision

The requested Imagen-only integration cannot pass its standalone verification gate with the current setup. Continuing requires either a Google-confirmed accessible Imagen endpoint with securely configured server authentication, or an explicit change to the requirement allowing a currently supported image-generation provider. No replacement provider has been selected or enabled.
