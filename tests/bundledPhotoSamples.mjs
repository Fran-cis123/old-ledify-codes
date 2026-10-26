// Offline smoke evidence: real renderers and licensed local photographs; no AI calls.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import JSZip from 'jszip';
import {generateService} from '../Service/generateService.mjs';
import {bundledPhotoSearch} from '../Service/visual/bundledPhotoSearch.mjs';
import {imagePolicy} from '../Service/visual/imagePolicy.mjs';
import {fixtures,fixturePlan,fixtureDraft} from './webpage/fixtures.mjs';
import {validateRenderedPptx} from '../renderer/presentation/renderedOutputValidation.mjs';

const root=path.resolve('generated/catalog-expansion/output-smoke');await fs.mkdir(root,{recursive:true});
const fixture=fixtures.restaurant;
const webpage={outputType:'webpage',...fixturePlan(fixture),...fixtureDraft(fixture),sections:fixture.sections};
webpage.designBrief={industry:'hospitality',density:'comfortable',audience:'Restaurant visitors',conversionGoal:'Explore the menu',visualTone:'Warm and inviting',imageDirection:'Restaurant food with colourful vegetable dishes and pizza',heroComposition:'split'};
const website=await generateService('prompt',fixture.source,'webpage',{}, {completedContent:{generatedContent:webpage},webpageAssets:{external:false,policy:{maxAssets:3},optimization:{cacheRoot:path.join(root,'web-cache')}},artifacts:{root:path.join(root,'webpages')}});
assert.equal(website.imageValidation.status,'passed');assert.ok(website.generatedContent.visualAssets.hero);
const archive=await JSZip.loadAsync(await fs.readFile(website.artifacts.files.zipPath));
const html=await archive.file('my-website/index.html').async('string');assert.match(html,/Image credits/);
for(const photo of website.generatedContent.visualAssets.credits){assert.ok(archive.file('my-website/'+photo.url.replace(/^\.\//,'')));assert.ok(html.includes(photo.creator));}
await fs.copyFile(website.artifacts.files.zipPath,path.join(root,'restaurant-website.zip'));
const titles=[['Coffee, Considered','coffee cafe'],['Bread, Made Slowly','artisan bakery bread sourdough'],['A Slice of Colour','vegetarian pizza restaurant']];
const slides=titles.map(([title,query],i)=>({slideNumber:i+1,slideType:'title',title,subtitle:'Bundled photography quality sample',objective:'Demonstrate embedded licensed food photography',visualRequirement:{role:'background',kind:'photo',required:true,description:query,searchQuery:query,altText:query},content:{titleContent:{title,subtitle:'Bundled photography quality sample',supportingText:'Illustrative stock photography with retained credits'}}}));
slides[0].title='Food Photography';slides[0].subtitle='Local library verification';slides[0].content.titleContent.title=slides[0].title;slides[0].content.titleContent.subtitle=slides[0].subtitle;
for(let i=1;i<slides.length;i++){
 const slide=slides[i],query=titles[i][1];slide.slideType='text-visual';slide.layoutId='text-visual-split';slide.subtitle='';slide.visualRequirement.role='foreground';
 slide.content={visualContent:{text:'This sample demonstrates a licensed food photograph selected from the local image library. Source and licence information accompany the image.',visual:{type:'photo',description:query,searchQuery:query}}};
}
const presentation={outputType:'presentation',title:'Food Photography',subtitle:'Local library verification',strategyId:'general-presentation',slides};
const deck=await generateService('prompt','Create a three-slide food photography presentation. Use real photographs.','presentation',{}, {completedContent:{generatedContent:presentation},visuals:{providers:{search:bundledPhotoSearch,identity:'bundled-smoke'},policy:{...imagePolicy({}),allowGeneration:false,retries:0},diagramPlanner:false,cacheRoot:path.join(root,'deck-cache')},preview:{outputDirectory:path.join(root,'presentations')}});
assert.equal(deck.preview.status,'completed');assert.equal(deck.imageValidation.status,'passed');
const validation=await validateRenderedPptx(deck.preview.files.pptxPath,deck.generatedContent);assert.equal(validation.embeddedImages,3);
assert.equal(deck.preview.slides.length,3);for(const slide of deck.preview.slides)assert.ok((await fs.stat(slide.filePath)).size>1000);
await fs.copyFile(deck.preview.files.pptxPath,path.join(root,'food-photography.pptx'));await fs.copyFile(deck.preview.files.pdfPath,path.join(root,'food-photography.pdf'));
await fs.writeFile(path.join(root,'report.json'),JSON.stringify({website:{hero:website.generatedContent.visualAssets.hero.file,photos:website.generatedContent.visualAssets.credits.length,zip:'restaurant-website.zip'},presentation:{validation,preview:deck.preview,photos:deck.generatedContent.slides.map(s=>s.photoAsset?.sourceUrl||s.backgroundPhoto?.sourceUrl||s.photoAsset?.originalUrl)}},null,2));
console.log('Verified restaurant website ZIP and three embedded food photos in PPTX/PDF/PNG outputs.');
