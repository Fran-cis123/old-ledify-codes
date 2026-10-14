# AI generation audit and reliability changes

Document generation now uses the structured section pipeline, editable DOCX renderer and secure downloads described in [DOCUMENT_PIPELINE.md](DOCUMENT_PIPELINE.md). That handover supersedes this earlier document JSON/schema compatibility description. Uploaded source files are restricted to PDF and DOCX across all output types.

The executed service had a working outline-then-content flow but no
`generateJsonWithRetry`, numeric-pattern guard, or per-slide validation before
moving to the next slide. Outline validation only distinguished MAX_TOKENS and
empty text from parsing errors; other finish reasons could be accepted. Full
responses and candidates were logged. The outline still received the large
presentation-writing instructions. Earlier repetition is established by the
handover, but the precise provider-side cause cannot be reconstructed from it.
Prompt complexity is a hypothesis, not a proven cause.

## Changes and contracts

`aiService(inputType, input, outputType, context)` still returns the same fields.
Its optional fifth argument injects a mock client/logger/sleep for tests.
Presentation planning and slide content remain independent model requests.
The detailed response schemas and the existing document/webpage prompts remain.
Obsolete presentation prompt catalogs were removed from this file and replaced
with compact outline and slide builders under `Service/ai`.

The slide-type-to-content mapping is now derived from `slideContentSchemas.mjs`
and shared with the AI service and content validator. Each outline is checked
against the local response schema, supported strategies/types, sequential numbers,
distinct nonempty titles, a title first slide, and a 1–12 slide limit. Each content
response passes its exact schema and the existing semantic slide validator before
the next slide is requested. Final presentation-level topic, repetition, density,
duplicate and source checks remain in place. Earlier slide summaries are supplied
to subsequent calls for narrative continuity.

Strict presentation validation rejects unknown properties, even when nested.
Existing document/webpage extra fields remain allowed for compatibility; known
fields and required fields are checked. String limits vary by field and format:
titles/headings 180 characters, subtitles 240, presentation bodies 1,200, other
presentation text 1,600, other document/webpage fields 50,000. Existing presentation
word and collection limits also apply. Numeric arrays are not classified as
repetitive text merely for containing repeated values.

## Retries and diagnostics

Every independent stage has at most three attempts. SDK automatic retries are
disabled per request so the limit cannot multiply silently. Each request has a
90-second timeout. Malformed, empty, incomplete, truncated, repetitive, overlong,
and schema-invalid output can retry. Transient HTTP errors use bounded exponential
backoff; 400/401/403/404 and blocked output fail immediately. Token limits are
unchanged (8,192 outline; 4,096 slide), rather than increased to mask repetition.
The previously working outline thinking budget of 1,024 is preserved.

Structured logs contain request ID, stage, slide, attempt, model, elapsed time,
finish reason, error code and provider token usage. They omit source text, output
text, credentials and provider error bodies. API error envelopes retain `message`
and `error`, adding `errorCode`, `stage`, `slideNumber`, `requestId`, and
`lastErrorCode` for AI errors. Exhaustion retains the final error as its cause.

Models default to the previously working `gemini-3.7-flash` and
`gemini-3.5-flash`; override with `GEMINI_OUTLINE_MODEL` and `GEMINI_SLIDE_MODEL`.
Both defaults succeeded with this project's API access during live verification.
Provider model access can change; unsupported models produce a non-retryable error.

## Grounding and limits

Prompts preserve source facts and uncertainty, prohibit invented study-specific
results/methods/sample sizes/citations, distinguish proposed work from evidence,
and require legitimate source data for quantitative slides. Charts must use numeric
values present in the input. Statistics must preserve supplied numeric/percentage
tokens; requested slide counts are excluded as evidence. Calculated or converted
figures are conservatively rejected unless explicitly included in the source.

These checks are not a general fact checker. A number occurring in the source does
not prove that its generated interpretation is correct. Arbitrary prose, research
claims without numbers, topic relevance, and source attribution still need broader
evaluation and human review. Passing fixtures or one live request does not prove
production reliability across all subjects. Prompt/source tests do not exercise
the PDF extraction or URL fetch implementations.

## Verification

`npm test` runs the AI and existing presentation regressions without paid API calls.
AI tests cover response failure categories, retry bounds and exhaustion, provider
errors, field limits, all 22 slide types and exact content schemas, source modes,
quantitative grounding, and mocked educational/research/business/startup/technical
orchestration. Document/webpage generation is mocked separately to protect their
output contracts. The separate existing webpage rendering import problem remains
outside this AI task.

`node tests/aiLiveSmoke.mjs [education|research|business|startup|technical]`
runs a paid three-slide generation through PPTX/PDF/PNG and saves the complete
synthetic result as `generation.json` under its preview directory. Inspect the
structured console logs for usage and latency. The first live educational run
completed all stages in 48.6 seconds with no retries. Its outline used 1,646 input
tokens versus 16,451 in the earlier, longer-prompt water-cycle test; this is an
observed comparison between two requests, not a controlled performance benchmark.
Its four AI calls reported 5,704 total tokens, including thinking, in aggregate.
Currency cost is not inferred without account pricing and billing information.

MongoDB-backed HTTP generation endpoints were not exercised by these tests.

Earlier AI-hardening verification: 94 deterministic tests passed. Five live three-slide requests
(educational, research without results, business with supplied figures, startup
concept, and technical explanation) completed AI validation and PPTX/PDF/PNG with
no retries. The research response explicitly identified missing methods, samples,
measurements and preliminary data. Saved results are under `generated/previews`:

| Scenario | Preview ID | Total elapsed seconds | AI total tokens |
| --- | --- | ---: | ---: |
| Education | 08db0e9e-cd62-4cf8-802f-b63e08a5bb6a | 48.6 | 5,704 |
| Research | 89c04bad-0941-4d55-9e6a-ae974b2abb65 | 59.4 | 5,952 |
| Business | 2f8307f2-8f98-48c7-8e9c-6eaa0f85649f | 91.9 | 5,576 |
| Startup | c7155840-870b-4cd1-b7ce-6599af6a8d70 | 94.2 | 5,576 |
| Technical | 32049444-4478-4df9-a7b7-abeadcb19f15 | 60.1 | 5,357 |

The last three ran concurrently on this Windows machine; end-to-end latency
includes conversion and resource contention and is not a provider latency benchmark.
All five outputs used title/explanation/summary as explicitly requested. Other
slide structures and provider failure recovery are covered deterministically,
not by these five live calls. The later presentation-quality audit additionally verifies URL/PDF extraction and
5-, 9-, 10-, and 12-slide decks. Real research results and production-scale evaluation
remain outside this verification. See [the current audit](PRESENTATION_QUALITY_AUDIT.md).

Provider references: [structured outputs](https://ai.google.dev/gemini-api/docs/structured-output)
and [troubleshooting](https://ai.google.dev/gemini-api/docs/troubleshooting).

Current count policy: no count selects 8–10 slides; explicit fields override natural-language instructions, and valid explicit counts are exact. Shared collection limits and readable field checks now run within per-slide retries. See PRESENTATION_QUALITY_AUDIT.md for the current 132-test result and sample artifacts.
