# Presentation conversion and recovery

PNG rendering runs in a fresh Node worker. `pdf-parse` and `pdf-to-img`
currently resolve different PDF.js/native canvas versions. Importing extraction
first initializes global Path2D with the older canvas implementation; rendering
in that process fails when the newer canvas consumes that object. Worker isolation
prevents this conflict without altering dependency versions or adding system tools.

Each conversion has a 120-second rendering timeout and reports the failing page.
The worker destroys its PDF document and exits before conversion settles. Partial
PNG files are retained for diagnosis but never advertised as a complete preview.
Each LibreOffice conversion uses its own profile beneath the preview directory,
avoiding interference with other conversions and an interactive LibreOffice session.
Preview directories, including diagnostic files and profiles, need a deployment
retention policy; automatic deletion of generated presentations is not implemented.

## Requirements and tests

Use the Node version supported by the installed `pdf-to-img` (development: Node
24.14.0), install from the lockfile with `npm ci`, and install LibreOffice.
Windows defaults to `C:\Program Files\LibreOffice\program\soffice.exe`;
override it using `LIBREOFFICE_PATH`. No Poppler installation is required.

- `npm test`: deterministic regression tests, including extraction before rendering,
  repeated conversion, invalid PDF diagnostics, partial success, title content, and routes.
- `npm run test:preview`: real PPTX → LibreOffice PDF → PNG conversion; requires
  LibreOffice. Asserts complete status and image count so partial success cannot pass.

## Response contract

Existing `preview.files`, `preview.slides`, and presentation fields remain. Added:

- `result.status` and `preview.status`: `completed` or `partial_success`.
- `preview.stages`: `pptx`, `pdf`, `png`, each with `completed`, `failed`, or `skipped`.
- `preview.slideCount`: source slide count; `preview.previewCount`: available previews.
- `preview.warnings`: safe stage-specific codes/messages, with page number when known.
- `preview.downloads.pptx` and `.pdf`: relative API URLs; unavailable PDF is null.

PowerPoint creation failure remains fatal. PDF failure returns the PowerPoint;
PNG or preview-count failure returns PowerPoint and PDF with an empty previews list.
The existing HTTP 201 envelope and MongoDB `completed` status are retained for a
successfully created presentation. Clients should inspect `result.status` and warnings
to distinguish a complete preview from a usable presentation with failed conversions.

Routes: `GET /api/presentations/:previewId/download` (PPTX),
`GET /api/presentations/:previewId/pdf` (PDF), and
`GET /api/presentations/:previewId/slides/:slideNumber` (PNG).
Default artifacts are served from `generated/previews`; custom output directories
are for local tests and their returned API URLs are not served by these routes.

## Current rendering and count contract

The production layout registry now uses the shared canonical renderer in
`renderer/presentation/professionalLayouts.mjs`. Legacy layout files remain for
compatibility with direct imports; application generation uses the registry.
The shared renderer validates content and readable capacities before drawing,
preserves supplied fields, and rejects unknown layouts without fallback slides.
See [the complete audit](PRESENTATION_QUALITY_AUDIT.md) for current count precedence,
visual verification, sample files, changed modules and remaining limitations.
