# One input box: backend integration

Use **POST `/api/generate`** for the frontend's single composer. It accepts JSON when no file is attached and `multipart/form-data` when a file is attached. The existing `/api/generate/textPrompt`, `/api/generate/urlPrompt` and `/api/generate/file` routes remain supported.

| Field | Requirement |
|---|---|
| `outputType` | Required: `presentation`, `document` or `webpage` |
| `textPrompt` | Optional typed instruction; at most 20,000 characters |
| `urlPrompt` | Optional single public HTTP(S) webpage URL; at most 2,048 characters |
| `file` | Optional single PDF or DOCX attachment; multipart only; up to 50 MB |
| `context` | Optional JSON object; stringify this field for multipart requests |
| `slideCount` | Optional presentation count, 1–12, or use `context.slideCount` |

Supply at least one of `textPrompt`, `urlPrompt` or `file`. All seven nonempty combinations are supported for every output type. The prompt tells Ledify what to do with the supplied file and URL; both sources are extracted and supplied together to generation. A URL merely mentioned inside `textPrompt` is not fetched automatically: the frontend must send it as `urlPrompt`. This contract supports one attachment and one URL per request.

## JSON: prompt and URL

```http
POST /api/generate
Content-Type: application/json
```

```json
{
  "outputType": "presentation",
  "textPrompt": "Use this article to create a clear presentation for students.",
  "urlPrompt": "https://example.com/article",
  "context": { "slideCount": 5, "audience": "Students" }
}
```

Omit `urlPrompt` for prompt-only requests, or omit `textPrompt` for URL-only requests. Choose `document` or `webpage` to generate those outputs instead. The URL must be a publicly accessible readable webpage, not a private network address, login-only page or arbitrary downloadable binary.

## Multipart: prompt, URL and attachment

In Postman, select **Body → form-data**:

| Key | Type | Example |
|---|---|---|
| `outputType` | Text | `document` |
| `textPrompt` | Text | `Compare both sources and write a concise report.` |
| `urlPrompt` | Text | `https://example.com/article` |
| `file` | File | Select `source.pdf` or `source.docx` |
| `context` | Text | `{"wordCount":1000,"audience":"Students"}` |

The following is integration code for the frontend developer; no frontend UI was added to this backend repository:

```js
const form = new FormData();
form.set('outputType', selectedOutputType);
if (prompt.trim()) form.set('textPrompt', prompt.trim());
if (url.trim()) form.set('urlPrompt', url.trim());
if (selectedFile) form.set('file', selectedFile);
form.set('context', JSON.stringify(context || {}));

const response = await fetch(`${backendOrigin}/api/generate`, {
  method: 'POST',
  body: form
});
// Let the browser set Content-Type and the multipart boundary.
const payload = await response.json();
if (!response.ok) throw new Error(payload.error || payload.message);
const result = payload.data.result;
```

`FormData` also works without an attachment. The file input should use `accept=".pdf,.docx"`; the server independently checks the file extension, MIME and actual content. TXT, DOC, images and PPTX are not supported source attachments. Ordinary typed text remains supported.

## Response and preview integration

Successful creation returns HTTP 201 with the existing envelope `{message, data: {responseVersion, request, result}}`. Use `result.outputType` and `result.status` to choose the frontend view. Check warnings even on HTTP 201; a rendering stage may return `partial_success` while retaining available downloads.

- Presentation: `result.preview.slides[].url`, `result.preview.downloads.pptx` and `.pdf` where available.
- Document: `result.previewUrl` and `result.downloadUrl` (also under `result.artifacts`). HTML preview; downloadable Word DOCX.
- Webpage: `result.artifacts.previewUrl` and `result.artifacts.downloadUrl` (website ZIP).

URLs are backend-relative. Resolve against `backendOrigin`, preserve private document/webpage capability tokens, and do not log those tokens. Document preview is viewable in a new tab or same-origin iframe; cross-origin framing is blocked by its content security policy.

`result.sources` identifies which inputs were used, e.g. `[{type:"file",name:"source.pdf"},{type:"url",url:"https://example.com/article"},{type:"prompt"}]`. The existing internal `inputType` remains `file` when an attachment is present, otherwise `url` when a URL is supplied, otherwise `prompt`; it is not the complete source inventory. No database enum migration is needed.

## Validation and limits

Empty input, invalid fields/context, unreadable sources, bad source content and combined text beyond 200,000 characters return client errors. `context.instructions`, when used, is limited to 20,000 characters and combined with the typed prompt. Unsupported attachment formats return 415; oversized attachments return 413; invalid uploaded content returns 400. Multipart metadata fields retain their 1 MB limit; JSON retains the 16 MB request limit.

URL webpages have a 10 MB download limit by default, configurable on the server with `LEDIFY_URL_MAX_MB` (integer 1–20). Readable URL text and combined-source input are bounded at 200,000 characters, including instructions and source labels for combined requests. Webpage generation uses that same character budget. Wikipedia reference/navigation widgets are excluded from extracted article text; substantive sections remain. Above-limit URL sources return HTTP 413 with `SOURCE_URL_TOO_LARGE` or `SOURCE_URL_TEXT_TOO_LARGE`, plus `maxBytes` or `maxCharacters`. Text is never silently truncated. Larger inputs can increase generation time.

The existing URL service protects against private IPs, unsafe redirects and DNS rebinding and bounds downloads/timeouts. Valid file and URL extraction run concurrently. Invalid attachments are rejected before fetching the URL. Failure of either supplied source prevents generation; Ledify does not silently omit a source the user requested. Generation itself retains existing schema validation, bounded retries, quality checks and output-specific rendering.

This is a single generation request, not persistent multi-turn chat history. The frontend owns the composer, attachment selection, loading state and result display. No authentication/session-history or background-job API is implied by this endpoint.

Regression coverage: all seven input combinations for all three output choices, invalid requests and attachments, source failures and length bounds, private-network URL rejection, real Word preview/download and real webpage preview/ZIP generation. Tests use mocked AI providers and local HTTP servers; no paid calls or external database writes are required.

Verification: full suite **205/205 passed** (`generated/combined-input-regression-tests.txt`); the six focused combined-input tests also passed after the final validation-order change and early slide-count check.
