// Live paid image checks through the production asset and rendering pipelines.
// Text fixtures isolate image integration; this does not test live text inference.
import 'dotenv/config';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import JSZip from 'jszip';
import {imagerySamples} from './fixtures/presentationImagery.mjs';
import {fixtures,fixturePlan,fixtureDraft} from './webpage/fixtures.mjs';
import {webpageLayoutService} from '../Service/webpageLayoutService.mjs';
import {webpageThemeService} from '../Service/webpageThemeService.mjs';
import {compileWebsiteBrief} from '../Service/webpage/websiteBrief.mjs';
import {websiteImageProviders} from '../Service/webpage/imageProviders.mjs';
import {acquireWebsiteImages} from '../Service/webpage/imagePipeline.mjs';
import {webpageRenderer} from '../renderer/webpage/webpageRenderer.mjs';
import {webpageArtifactService} from '../Service/webpageArtifactService.mjs';
import {presentationLayoutService} from '../Service/presentationLayoutService.mjs';
import {presentationThemeService} from '../Service/presentationThemeService.mjs';
import {presentationRendererService} from '../Service/presentationRendererService.mjs';
import {configuredImageProviders} from '../Service/visual/imageProviders.mjs';
import {imagePolicy} from '../Service/visual/imagePolicy.mjs';
import {resolvePresentationVisuals} from '../Service/visual/presentationVisuals.mjs';
import {previewRenderer} from '../renderer/presentation/previewRenderer.mjs';

const root=path.resolve('generated/google-image-pipeline-verification');await fs.mkdir(root,{recursive:true});
const env={...process.env,GOOGLE_IMAGE_MODEL:'gemini-3.1-flash-image',WEBPAGE_IMAGE_MODEL:'gemini-3.1-flash-image',WEBPAGE_ALLOW_IMAGE_GENERATION:'true',PRESENTATION_IMAGE_MODEL:'gemini-3.1-flash-image',PRESENTATION_ALLOW_IMAGE_GENERATION:'true',PRESENTATION_STOCK_PROVIDER:'none',PRESENTATION_IMAGE_RESOLUTION:'1K',PRESENTATION_MAX_GENERATED_IMAGES:'1',PRESENTATION_MAX_IMAGES:'1',PRESENTATION_IMAGE_CONCURRENCY:'1',PRESENTATION_IMAGE_RETRIES:'0',PRESENTATION_IMAGE_TIMEOUT_MS:'60000',PRESENTATION_IMAGE_DEADLINE_MS:'65000',PRESENTATION_IMAGE_ESTIMATED_UNIT_COST:'1',PRESENTATION_IMAGE_MAX_ESTIMATED_COST:'1'};
// $1 is a conservative test reservation, not a statement of provider pricing.
const providers=websiteImageProviders(env).filter(p=>p.id==='gemini-image');
let page=webpageThemeService(webpageLayoutService({outputType:'webpage',...fixturePlan(fixtures.pharmaceutical),...fixtureDraft(fixtures.pharmaceutical)}));
page.websiteBrief=compileWebsiteBrief(page,fixtures.pharmaceutical.source);
const web=await acquireWebsiteImages(page,{}, {providers,curated:false,policy:{maxAssets:1,maxGenerated:1,retries:0,timeoutMs:60000,totalMs:65000},optimization:{cacheRoot:path.join(root,'web-cache')}});
assert.equal(web.page.visualAssets.hero?.source,'Google Gemini','Live generated hero must resolve');
const files=webpageRenderer(web.page,web.assets),website=await webpageArtifactService(files,{root:path.join(root,'websites')});
const zip=await JSZip.loadAsync(await fs.readFile(website.files.zipPath));
for(const [name,buffer] of Object.entries(web.assets))assert.deepEqual(await zip.file('my-website/'+name).async('nodebuffer'),buffer);
console.log('[GOOGLE IMAGE WEBSITE]',JSON.stringify({model:env.GOOGLE_IMAGE_MODEL,localImages:Object.keys(web.assets).length,zipVerified:true}));
const sample=structuredClone(imagerySamples.find(s=>s.name==='pharmaceutical'));sample.presentation.slides=sample.presentation.slides.slice(0,1);
const ready=presentationRendererService(presentationThemeService(presentationLayoutService(sample.presentation),sample.context));
const presentation=await resolvePresentationVisuals(ready,sample.context,{providers:configuredImageProviders(env),policy:imagePolicy(env),cacheRoot:path.join(root,'presentation-cache'),diagramPlanner:false});
assert.ok(presentation.slides[0].photoAsset?.synthetic,'Live generated title image must resolve');
const preview=await previewRenderer(presentation,{outputDirectory:path.join(root,'presentations')});
assert.equal(preview.stages.pptx,'completed');assert.equal(preview.stages.pdf,'completed');assert.equal(preview.stages.png,'completed');assert.equal(preview.previewCount,presentation.slides.length);
await fs.copyFile(preview.slides[0].filePath,path.join(root,'presentation-title.png'));
const report={model:env.GOOGLE_IMAGE_MODEL,textInput:'Existing validated fixtures; live text inference not exercised',website,presentation:{previewId:preview.previewId,stages:preview.stages,previewCount:preview.previewCount,files:preview.files,visualQuality:presentation.visualQuality},websiteImages: web.page.visualAssets,verifiedAt:new Date().toISOString()};
await fs.writeFile(path.join(root,'report.json'),JSON.stringify(report,null,2));
console.log('[GOOGLE IMAGE PRESENTATION]',JSON.stringify({stages:preview.stages,slideCount:preview.previewCount,report:path.join(root,'report.json')}));
