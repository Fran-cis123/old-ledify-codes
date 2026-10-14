# Ledify static webpage pipeline

**API update:** The subsequent [presentation system corrections](PRESENTATION_SYSTEM_CORRECTIONS.md) introduce response v2 across generation endpoints. The request metadata no longer duplicates `generatedContent`; use `data.result.generatedContent`. Explicit response v1 remains available during migration.

Implemented and verified locally on 13 October 2026 in `C:\Users\HP\Desktop\Ledify`.

## Result

The existing generation endpoints now produce a validated, responsive single-page website, an isolated preview with desktop/tablet/mobile controls, and an offline ZIP. Generated sites use HTML5, CSS3, local SVG assets and a small fixed vanilla JavaScript file. They require no Node.js, package installation, framework, development server, fonts service or runtime fetch.

The repository contains an Express backend, not a separate Ledify frontend application. The preview viewer is implemented and served by that backend; the frontend can embed its returned `previewUrl`. No external frontend repository or deployed environment was modified.

## Architecture and files

| Stage | Implementation |
| --- | --- |
| Input extraction | `Service/fileService.mjs`, `Service/urlService.mjs`, `Service/input/` |
| Typed planning and content contracts | `templates/webpage/webpageSchema.mjs` |
| Separate Gemini planning and drafting | `Service/ai/webpageGeneration.mjs`, called by `Service/aiService.mjs` |
| Content and source validation | `Service/webpageContentValidator.mjs` |
| Canonical sections, navigation and action destinations | `Service/webpageLayoutService.mjs` |
| Category design tokens and contrasting foregrounds | `Service/webpageThemeService.mjs` |
| Escaped HTML components, responsive CSS, trusted script and original SVGs | `renderer/webpage/` |
| Actual output structure and asset validation | `Service/webpageStaticValidator.mjs` |
| Unique output directories, ZIP and stage status | `Service/webpageArtifactService.mjs` |
| Capability-protected preview, files and downloads | `controller/webpageAssetsController.mjs`, `route/generateRoute.mjs` |
| Existing generation orchestration and persistence | `Service/generateService.mjs`, `controller/generateController.mjs`, `model/generateModel.mjs` |

Planning chooses category, short brand name, browser title, visual direction, palette, ordered sections and concise navigation labels. Drafting follows that exact plan. Both stages use strict JSON schemas, bounded retries and typed validation. Invalid content is repaired without repeating a successful planning stage. The shared retry helper now includes specific validation repair instructions, while retaining presentation readability hints.

Default models are `gemini-3.7-flash` for planning and `gemini-3.5-flash` for drafting; override with `GEMINI_WEBPAGE_PLAN_MODEL` and `GEMINI_WEBPAGE_CONTENT_MODEL`. Planning has a 4,096-token output budget; drafting has 8,192. Each stage allows at most three attempts through the shared retry layer. Webpage source input is limited to 200,000 characters, matching URL extraction and combined-input budgets. URL page downloads default to 10 MB (server override `LEDIFY_URL_MAX_MB`, 1–20); see `URL_EXTRACTION_FIX.md`. Provider usage logs contain metadata, not source text, generated content or keys.

There are five design directions: editorial portfolios, product/startup, classic professional business, academy/education and restaurant/event. Supported categories also include agency, nonprofit, service and informational. Components vary by content: projects, services/menu rows, feature cards, ordered processes, native FAQ disclosures, sourced quotations, contact details and final actions. Text-only introductions use balanced heading/copy columns. All content remains editable in the extracted HTML/CSS.

## Existing API contract

Mount the existing router at `/api`, as `src/server.mjs` does. Do not replace these field names with the illustrative names from the brief.

```http
POST /api/generate/textPrompt
Content-Type: application/json

{
  "textPrompt": "Create a portfolio for Maya Chen. Contact: maya@example.com. ...",
  "outputType": "webpage",
  "context": {
    "audience": "Potential collaborators",
    "designPreferences": {
      "preset": "editorial",
      "colors": { "primary": "#25251f", "accent": "#ce512a" }
    }
  }
}
```

URL generation uses `POST /api/generate/urlPrompt` with `urlPrompt`, `outputType`, optional `context`. Uploads use `POST /api/generate/file`, multipart field `file`, `outputType=webpage`, and optional JSON-string `context`. Only PDF and DOCX uploads are supported, up to 50 MB; extensions, MIME types and file content are checked. TXT uploads are rejected. Scanned image-only PDFs require OCR first. Ordinary text prompts and text extracted from URLs remain supported.

The existing successful envelope remains HTTP 201:

```json
{
  "message": "Service called Successfully",
  "data": {
    "request": { "status": "completed", "generatedContent": {}, "artifacts": {} },
    "result": {
      "outputType": "webpage",
      "status": "completed",
      "generatedContent": {},
      "warnings": [],
      "artifacts": {
        "id": "<uuid>",
        "status": "completed",
        "stages": { "site": "completed", "zip": "completed" },
        "previewUrl": "/api/webpages/<uuid>/<private-capability>/preview",
        "siteUrl": "/api/webpages/<uuid>/<private-capability>/site/index.html",
        "downloadUrl": "/api/webpages/<uuid>/<private-capability>/download",
        "embed": { "sandbox": "allow-scripts", "referrerPolicy": "no-referrer" },
        "viewports": { "desktop": 1280, "tablet": 768, "mobile": 390 },
        "validation": { "valid": true, "files": [], "sections": 4 },
        "warnings": []
      }
    }
  }
}
```

This example abbreviates content and validation file lists. HTTP responses and persisted webpage artifact metadata omit internal filesystem paths. Internal service calls retain paths for packaging and engineering tools. A later ZIP failure returns `partial_success` with an available preview, a null `downloadUrl` and a warning; completed HTML is retained. The database request remains `completed` once the generator returns, while the result/artifact stage status communicates partial success.

Errors include `errorCode`, `stage`, and relevant field/AI diagnostics when available. Invalid requests and URL/source/website validation failures use HTTP 400. Multer rejects oversized uploads with 413. Upstream generation failures use 500; blocked sites and unsupported content are reported rather than bypassed.

For same-origin frontend embedding, use the returned preview URL in an iframe. The viewer itself contains the restricted generated-site iframe. If the frontend uses a different origin, set `WEBPAGE_APP_ORIGIN` to its exact HTTP(S) origin; do not include a path or trailing slash. The inner website must retain `sandbox="allow-scripts"` without `allow-same-origin`. Preview contact/external links explain that they open from the downloaded site. Internal section links, menu and FAQ work in the preview.

## Download and security

ZIP layout:

```text
my-website/
  index.html
  style.css
  script.js
  README.txt
  assets/images/hero.svg
  assets/icons/favicon.svg
```

Extract the ZIP and double-click `my-website/index.html`. Essential rendering is offline. Contact links use the user's configured email/telephone application; externally supplied links need an internet connection. There are no fake submissions, accounts, payments or databases.

Generated text is escaped, not interpreted as markup. The renderer owns HTML/CSS/JS; Gemini supplies structured content only. Validation rejects untrusted scripts, event handlers, unsupported files, dangerous links, missing references, duplicate IDs, missing metadata and empty sections. Local SVG illustrations are decorative and carry empty alt text; no downloaded stock imagery or third-party fonts are required.

Both iframe sandboxing and HTTP CSP isolate previews, including direct visits to generated HTML. The generated page cannot read the parent's DOM/storage, submit forms, open popups, navigate the top page or fetch network data. Trusted preview assets are delivered with no-store, no-referrer and nosniff headers. Only validated filenames are served. Metadata and arbitrary filesystem files are inaccessible through artifact routes. See the [MDN iframe reference](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/iframe) and [CSP sandbox reference](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/sandbox).

Artifact access uses a random 256-bit bearer capability plus UUID. Only the token hash is stored in artifact metadata; wrong tokens return 404. Capability URLs are private: possession grants access. This is not account-based ownership authorization. For a public multiuser deployment, integrate the application's authenticated ownership policy, rate limits, HTTPS, access-log redaction and artifact retention/expiry. This repository has no existing user authentication to attach to. No automatic artifact expiry or storage quota is implemented. Generated sample manifests contain capabilities and are ignored by Git.

URL ingestion validates every DNS result, pins the chosen public address for the connection, and revalidates redirects. Private, loopback, link-local, mapped/transition and reserved addresses are rejected. Requests have time/redirect/body-size limits and accept text/HTML only. Uploaded file MIME, signatures and text encoding are checked before extraction. URL ingestion extracts text; it does not scrape JavaScript-only pages or evade authentication/bot restrictions.

Source checks reject unsupported numeric claims, contact details and URLs; testimonials require exact supplied quotations/attribution and pricing requires supporting source information. These checks and prompts reduce fabrication but are not a universal semantic fact-checker. Users should review factual claims before publishing. Static-scope limitations are returned in `warnings`.

## Verification and samples

Run from the repository root:

```powershell
npm test
node tests/webpage/samples.mjs
node tests/webpage/samples.mjs live
node tests/webpage/browser.mjs
```

The first sample command uses deterministic AI fixtures without provider calls. `live` uses Gemini and reuses completed live results; add `--fresh` only to deliberately regenerate all five with paid provider calls. `live --render-saved` rebuilds the current renderer/ZIP using saved AI content without calling Gemini. Browser verification uses the latest `generated/webpage-samples/manifest.json`.

Browser QA requires Playwright and a browser. On this device it uses the bundled Codex Playwright runtime and installed Microsoft Edge. Elsewhere install Playwright separately or set `LEDIFY_PLAYWRIGHT_MODULE` to a resolvable module/path. On Windows, `PLAYWRIGHT_CHANNEL` defaults to `msedge`. These engineering dependencies are not dependencies of downloaded websites.

Final results:

- **161/161 regression tests passed**, including existing presentation/document contracts and native PDF rendering tests. A subsequent focused 30-test webpage pass covered removal of internal paths from HTTP responses.
- **Five live Gemini sites completed**: portfolio, startup, professional business, education and restaurant. Business source was an actual generated PDF processed through PDF extraction. Education source was the public NASA GPM water-cycle page processed through the secured URL extractor. Other categories used supplied fictional text briefs; example contacts and menu prices were part of those briefs.
- Actual Express HTTP text/URL/upload endpoints, artifact persistence shape, capability rejection, CSP and downloads were exercised using an in-memory model and injected AI responses. Live Gemini, native PDF and public URL extraction were exercised separately by the real samples. No production MongoDB write was used for these engineering tests.
- Each final ZIP was downloaded through its route, compared with the stored archive, extracted and opened using **`file://` with the browser offline** at **1440, 768 and 390 pixels**. Styles/scripts/images loaded without essential network requests, console warnings/errors or horizontal overflow.
- Browser tests covered mobile menu/Escape/link closing, FAQ when present, no-JS navigation, preview mobile controls, opaque-origin parent/storage isolation, and informative handling of external/contact links.
- All five categories were visually reviewed at desktop/tablet/mobile sizes. Refinements included short visual brand names, more useful hero copy, contrast-safe button text, meaningful action destinations, 44px navigation targets and balanced text-only introductions. Updated affected screenshots were reviewed after refinement.

Artifacts are in `generated/webpage-samples/<portfolio|startup|business|education|restaurant>/`: `generated-website.zip`, `extracted/my-website/index.html`, `live-result.json`, and `screenshots/{desktop,tablet,mobile,desktop-hero,isolated-preview}.png`. Browser measurements are in `generated/webpage-samples/browser-verification.json`. Source PDF/URL evidence is in the respective business/education directories.

## Practical limits

Initial output is one complete multi-section static page, currently rendered with English document language and system fonts. Backend features are not implemented in generated sites. Illustrations are intentional generic category artwork, not photographs or evidence of completed client work. Preview isolation deliberately prevents external navigation; downloaded sites retain normal links. Visual tests cover Edge/Chromium, not a complete cross-browser/device accessibility audit. URL sources may reject automated access; that failure is surfaced clearly.

The existing presentation branch and document generation contract remain in place. Express, CORS and Mongoose are now runtime dependencies so production installs retain the server. JSZip, parse5 and ipaddr.js are explicit dependencies. Nothing was pushed, deployed or published.
