import fs from 'node:fs/promises';
import path from 'node:path';
const root=path.resolve('generated/performance'),read=async(file)=>JSON.parse(await fs.readFile(path.join(root,file),'utf8'));
const rows=[],usage=[],outputs=[];
for(const type of ['presentation','webpage','document']){
    const before=await read(`before/${type}-metrics.json`),after=await read(`after/${type}-metrics.json`),b=before.report,a=after.report;
    rows.push(`| ${type} | ${(b.totalMs/1000).toFixed(1)} s | ${(a.totalMs/1000).toFixed(1)} s | ${((1-a.totalMs/b.totalMs)*100).toFixed(1)}% |`);
    usage.push(`| ${type} | ${b.ai.calls} → ${a.ai.calls} | ${b.ai.retries} → ${a.ai.retries} | ${b.ai.totalTokens.toLocaleString('en-US')} → ${a.ai.totalTokens.toLocaleString('en-US')} | ${(b.memory.peakRssBytes/1048576).toFixed(1)} → ${(a.memory.peakRssBytes/1048576).toFixed(1)} |`);
    outputs.push({type,before:await read(`before/${type}-result.json`),after:await read(`after/${type}-result.json`)});
}
const component=await read('controlled-components.json'),p=outputs[0].after,w=outputs[1].after,d=outputs[2].after;
const fileLink=(label,file)=>`[${label}](<${path.resolve(file).replaceAll('\\','/')}>)`;
const modified=['Service/performance.mjs','Service/generationJobs.mjs','Service/ai/providerCapacity.mjs','Service/ai/concurrency.mjs','Service/ai/generateJsonWithRetry.mjs','Service/aiService.mjs','Service/ai/webpageGeneration.mjs','Service/document/documentGeneration.mjs','Service/document/documentArtifactService.mjs','Service/generateService.mjs','Service/webpage/imagePipeline.mjs','Service/webpageArtifactService.mjs','Service/visual/imageArtDirection.mjs','Service/visual/presentationPrefetch.mjs','Service/visual/presentationImageAssets.mjs','Service/visual/presentationVisuals.mjs','controller/generateController.mjs','route/generateRoute.mjs','renderer/presentation/previewRenderer.mjs','tests/performanceLive.mjs','tests/performanceArtifacts.mjs','tests/performanceVisuals.mjs','tests/performanceComponents.mjs','tests/performanceReport.mjs','tests/regression/performance-pipeline.test.mjs','docs/generation-performance.md'];
const report=`# Ledify performance audit — 19 October 2026

Implemented directly in the local backend. Existing uncommitted presentation fixes were preserved. These changes have not been pushed or deployed to Render.

## Measured live results

The same three prompts used real configured Google text/image APIs and the actual renderers. Each successful run produced complete downloadable outputs. Times are service wall time through final artifact availability, not merely HTTP acceptance.

| Output | Before | After | Observed reduction |
| --- | ---: | ---: | ---: |
${rows.join('\n')}

These are individual successful live trials, not statistical guarantees. Provider latency, generated outlines and shared CPU load vary. A failed lower-reasoning presentation experiment and an intermediate slower presentation run remain in the raw logs; neither is counted as an improvement. The final presentation/webpage retain their original reasoning settings. Only document stages use the new configurable reasoning budget.

## Actual bottlenecks and changes

- Presentations: the baseline spent 52.5 seconds drafting, approximately a minute acquiring imagery, 17.9 seconds converting PDF and 20.6 seconds rasterizing PNGs. Images previously started only after all text and review finished. Pictures now begin for locally approved slides while remaining text and semantic review continue. One shared session retains the original image count, concurrency, provenance, duplicate detection and paid-attempt budget. Failed text generation cancels active/queued acquisition. Final output still requires package and post-conversion image validation. The final AI stage took 47.1 seconds; the remaining image wait was 37.5 seconds. Native converter algorithms/resolution were not reduced; their individual timings also vary with host load.
- Documents: batch barriers left provider slots idle behind slow sections. Initial drafting and subsequent independent section repairs now refill bounded slots as soon as work completes, with checkpoints committed in outline order. The baseline needed three review rounds and nine generation retries. Explicit section word ranges and a 1,024-token reasoning budget for structured document tasks reduced excess drafting/reasoning and repeated repairs. The complete semantic review and deterministic length/content/DOCX validation remain enabled. The final review found no substantive issues. Both documents contain six sections; baseline length was 1,458 words and optimized length 1,227, both inside the unchanged 1,400-word ±20% contract. This stochastic length difference contributes to timing variation.
- Websites: independent image targets use bounded concurrency (default two), with race-safe image and paid-generation limits. File writes are bounded to four concurrent operations. ZIP packaging stores already-compressed images/fonts without recompressing them, while keeping text compressed. Text planning and drafting remain two coherent AI calls; splitting one small draft into many calls would add unnecessary work. Both live websites retain five sections and one actual image under the existing configured image budget. The observed end-to-end improvement here was modest, not a dramatic speedup.
- Shared: text requests now have a process-wide six-call cap and bounded waiting queue. Existing per-slide/section limits and bounded retries remain. Performance tracing records stage timings, provider calls/retries/tokens, request extraction, MongoDB operations and sampled Node RSS without logging prompts or credentials.
- HTTP behavior: an opt-in durable background queue accepts the existing validated request with HTTP 202 when the client sends Prefer: respond-async. Actual stage/unit events and early PPTX/PDF availability are exposed through token-protected polling. Default synchronous endpoints and response contracts are retained. Outlines, approved units and completed content are checkpointed; failed jobs can resume without repeating completed AI work. One background job runs at a time, at most eight wait. A later MongoDB metadata failure does not invalidate an already available output.
- Existing safeguards retained: one native presentation conversion by default, bounded website image workers, decode/size/provenance checks, SSRF protection, file signature/type validation, source length limits, source ordering and the shared startup MongoDB connection. No new dependencies, API keys or text-model substitutions were added. Input extraction already ran independent URL/file work concurrently; no unnecessary rewrite was made there.

## API and resource usage

| Output | Text API calls before → after | Retries | Total text tokens | Sampled Node peak RSS, MiB |
| --- | ---: | ---: | ---: | ---: |
${usage.join('\n')}

The presentation remains a 10-slide/10-image output. API calls did not decrease there; time was saved through scheduling/overlap. Token totals include provider-reported thinking tokens. Image API costs are additional and the original bounded image budgets remain in force. Existing caches were available in both phases; no cold-cache guarantee is claimed.

RSS is the parent Node process only, excluding LibreOffice, Poppler and image workers. The baseline ran all outputs sequentially in one process; later isolated reruns started with different retained memory. Therefore the RSS values are observations, not a controlled memory-reduction claim. MongoDB and client-transfer latency are excluded from these service benchmarks; actual HTTP traces now measure database/extraction stages separately. The Render account's tier and production CPU/memory were not inspected or changed.

## Controlled component measurements

The scheduling tests used identical fixed simulated provider delays and identical ordered results, without paid API calls: ten-slide scheduling ${component['ten-slide-scheduler'].batchMs} → ${component['ten-slide-scheduler'].rollingMs} ms; six-section scheduling ${component['six-section-scheduler'].batchMs} → ${component['six-section-scheduler'].rollingMs} ms. These are component tests, not full AI-generation times.

For ten ZIP builds of the exact same actual website files, wall time was ${component.originalZip.totalMs} → ${component.optimizedZip.totalMs} ms and parent-process CPU ${component.originalZip.cpuMs} → ${component.optimizedZip.cpuMs} ms. Archive size was ${component.originalZip.zipBytes} → ${component.optimizedZip.zipBytes} bytes. Every extracted file was byte-for-byte identical. The small archive-size increase preserves image quality and avoids wasteful recompression.

## Verification

- Full regression run: 340 tests passed, zero failures. After adding the database-outage terminal-state case, all 10 focused job/concurrency/prefetch tests passed. Across those runs, 341 distinct regression cases were exercised. Logs: generated/performance-verified-regression.log and generated/performance-jobs-final.log.
- 16 actual HTTP preview/download checks per phase, 32 HTTP 200 responses total. PPTX media, DOCX XML, website image assets and ZIP structures were inspected.
- Both presentation outputs have ten embedded pictures and ten PNG previews; post-PDF image-region comparisons passed.
- Website browser checks at 1440 px and 390 px found no horizontal overflow or broken images. Document HTML preview also passed and was visually inspected. All ten presentation PNGs were inspected as a contact sheet. This is not independent scientific fact verification or Word pagination certification.
- Background tests cover capability-token isolation, early artifact/progress publication, ordered work, cancellation, restart recovery, content reuse on retry, process-wide provider capacity, unchanged synchronous HTTP 201 behavior and database metadata outages. Windows sandbox file replacement restrictions required running recovery tests outside the sandbox; normal atomic replacement was verified there.

## Outputs and raw measurements

- ${fileLink('Optimized PowerPoint',p.preview.files.pptxPath)}
- ${fileLink('Optimized PDF',p.preview.files.pdfPath)}
- ${fileLink('Optimized Word document',path.join('generated/documents',d.artifacts.id,'document.docx'))}
- ${fileLink('Optimized website ZIP',w.artifacts.files.zipPath)}
- ${fileLink('Presentation contact sheet',path.join(root,'after/screenshots/presentation-contact-sheet.jpg'))}
- ${fileLink('Website desktop screenshot',path.join(root,'after/screenshots/website-1440.png'))}
- ${fileLink('Website mobile screenshot',path.join(root,'after/screenshots/website-390.png'))}
- ${fileLink('Document preview screenshot',path.join(root,'after/screenshots/document-1100.png'))}

Per-output raw metrics and artifact checks are in generated/performance/before/ and after/. Controlled measurements are in controlled-components.json. Raw failed experiments were retained so the comparison does not hide failures.

## Frontend use and deployment limits

Send the same generation request with Prefer: respond-async, poll the returned data.statusUrl every two seconds, display the actual data.progress stages, and use data.artifacts.pptx.downloadUrl as soon as present. Completed results are under data.result. POST the status URL plus /retry to resume a failed job. Full examples and settings: ${fileLink('API and deployment guide','docs/generation-performance.md')}.

The queue supports one Node instance per storage root. Persist the entire generated/ tree and any custom artifact roots before relying on recovery across Render restarts/deployments. Free Render services cannot attach persistent disks, lose local files on restart and may take about a minute to wake after idle spin-down. See [Render Free limitations](https://render.com/docs/free) and [persistent disks](https://render.com/docs/disks). None of these local benchmarks establishes performance on a cold Render service.

Remaining dominant costs are fresh Google imagery, large source/context generation, necessary semantic repairs and LibreOffice/PNG conversion. Complete fresh 10-image generation is not a five-second operation; background acceptance is not completion. For production, benchmark this build on the actual Render tier, use persistent storage, keep conversion concurrency at one until measured memory permits more, and use a distributed queue/object storage before scaling to multiple instances. Add an explicit artifact-expiry/retention policy before long-term disk growth becomes a problem. Provider quota and latency remain external limits.

## Files changed for this performance task

${modified.map(name=>'- '+fileLink(name,name)).join('\n')}
`;
await fs.writeFile(path.join(root,'REPORT.md'),report);console.log(path.join(root,'REPORT.md'));
