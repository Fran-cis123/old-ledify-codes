import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createCanvas } from '@napi-rs/canvas';
import JSZip from 'jszip';
import { fixtures, fixturePlan, fixtureDraft } from '../webpage/fixtures.mjs';
import { webpageLayoutService } from '../../Service/webpageLayoutService.mjs';
import { webpageThemeService } from '../../Service/webpageThemeService.mjs';
import { validateWebpagePlan, validateWebpageContent } from '../../Service/webpageContentValidator.mjs';
import { resolveWebpageAssets } from '../../Service/webpageAssetService.mjs';
import { webpageRenderer } from '../../renderer/webpage/webpageRenderer.mjs';
import { validateStaticWebsite } from '../../Service/webpageStaticValidator.mjs';
import { webpageArtifactService } from '../../Service/webpageArtifactService.mjs';
import { webpagePlanSchema } from '../../templates/webpage/webpageSchema.mjs';
import { validateSchema } from '../../Service/ai/responseValidation.mjs';

const page=(fixture=fixtures.pharmaceutical)=>webpageThemeService(webpageLayoutService({outputType:'webpage',...fixturePlan(fixture),...fixtureDraft(fixture)}));
async function temporary(t){const root=await fs.mkdtemp(path.join(os.tmpdir(),'ledify-web-design-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));return root;}

test('legacy and new design plans remain valid and reject arbitrary layout directives',()=>{
    const old=fixturePlan(fixtures.pharmaceutical);validateSchema(old,webpagePlanSchema);
    const plan={...old,designBrief:{industry:'healthcare',audience:'Researchers',conversionGoal:'Research inquiry',visualTone:'Scientific',imageDirection:'Laboratory research',density:'compact',heroComposition:'split'}};
    plan.sections[0].composition='editorial';validateSchema(plan,webpagePlanSchema);validateWebpagePlan(plan);
    plan.sections[0].composition='javascript:alert(1)';assert.throws(()=>validateWebpagePlan(plan),/composition/);
    plan.sections[0].composition='editorial';plan.designBrief.heroComposition='invented';assert.throws(()=>validateWebpagePlan(plan));
});

test('industry content determines composition, typography and palette without placeholder art',()=>{
    const pages=Object.values(fixtures).map(f=>page(f));
    assert.equal(page().designBrief.industry,'healthcare');
    assert.equal(page(fixtures.store).designBrief.industry,'retail');
    assert.equal(page(fixtures.restaurant).designBrief.heroComposition,'full-bleed');
    assert.notEqual(page().theme.typography.heading,page(fixtures.portfolio).theme.typography.heading);
    assert.ok(new Set(pages.map(p=>p.designBrief.heroComposition)).size>=3);
    for(const p of pages){const files=webpageRenderer(p),html=files['index.html'];assert.ok(!html.includes('project-art')&&!html.includes('hero.svg'));const report=validateStaticWebsite(files);assert.equal(report.quality.visual,'requires-review');}
    assert.equal(page(fixtures.store).heroTarget,'#section-1');
});

test('licensed catalog images are validated, attributed and retained byte-for-byte in the downloadable ZIP',async t=>{
    const root=await temporary(t),canvas=createCanvas(320,240);canvas.getContext('2d').fillRect(0,0,320,240);
    const image=canvas.toBuffer('image/png');await fs.writeFile(path.join(root,'laboratory.png'),image);
    const manifest=[{industry:'healthcare',role:'hero',file:'laboratory.png',alt:'Licensed laboratory test fixture',license:'Original test image',creator:'Ledify tests'}];
    const manifestPath=path.join(root,'catalog.json');await fs.writeFile(manifestPath,JSON.stringify(manifest));
    const resolved=await resolveWebpageAssets(page(),{manifestPath,strict:true});assert.equal(resolved.warnings.length,0);
    const files=webpageRenderer(resolved.page,resolved.assets);const validation=validateStaticWebsite(files);
    assert.ok(validation.files.includes('assets/images/catalog-1.png'));
    assert.match(files['index.html'],/Licensed laboratory test fixture/);assert.match(files['index.html'],/Image credits/);
    const artifact=await webpageArtifactService(files,{root:path.join(root,'artifacts')});
    const zip=await JSZip.loadAsync(await fs.readFile(artifact.files.zipPath));assert.deepEqual(await zip.file('my-website/assets/images/catalog-1.png').async('nodebuffer'),image);
    const wrongIndustry=await resolveWebpageAssets(page(fixtures.restaurant),{manifestPath,strict:true});assert.equal(Object.keys(wrongIndustry.assets).length,0);
    for(const mutation of [entry=>entry.file='../outside.png',entry=>entry.license='',entry=>entry.alt='']){
        const invalid=structuredClone(manifest);mutation(invalid[0]);await fs.writeFile(manifestPath,JSON.stringify(invalid));
        const fallback=await resolveWebpageAssets(page(),{manifestPath});assert.equal(Object.keys(fallback.assets).length,0);validateStaticWebsite(webpageRenderer(fallback.page,fallback.assets));
    }
});

test('product images require exact brand and item matches; catalog traversal cannot read neighboring files',async t=>{
    const root=await temporary(t),catalogRoot=path.join(root,'catalog');await fs.mkdir(catalogRoot);
    const image=createCanvas(320,240).toBuffer('image/png');await fs.writeFile(path.join(root,'outside.png'),image);await fs.writeFile(path.join(catalogRoot,'cup.png'),image);
    const manifestPath=path.join(catalogRoot,'images.json');
    const entry={industry:'retail',role:'item',brandName:'Common Objects',sectionType:'products',itemTitle:'Stoneware cup',file:'cup.png',alt:'The sample stoneware cup',license:'Original test asset',creator:'Ledify tests'};
    await fs.writeFile(manifestPath,JSON.stringify([entry]));
    const resolved=await resolveWebpageAssets(page(fixtures.store),{manifestPath,strict:true});
    assert.ok(resolved.page.sections[0].items[0].image);assert.equal(resolved.page.sections[0].items[1].image,undefined);
    assert.match(webpageRenderer(resolved.page,resolved.assets)['index.html'],/alt="The sample stoneware cup"/);
    await fs.writeFile(manifestPath,JSON.stringify([{...entry,brandName:'Another brand'}]));
    assert.deepEqual((await resolveWebpageAssets(page(fixtures.store),{manifestPath,strict:true})).assets,{});
    await fs.writeFile(manifestPath,JSON.stringify([{...entry,file:'../outside.png'}]));
    await assert.rejects(resolveWebpageAssets(page(fixtures.store),{manifestPath,strict:true}),/inside its directory/);
});

test('unconfigured or corrupt imagery falls back without broken image tags or fake product screenshots',async t=>{
    const root=await temporary(t);const manifestPath=path.join(root,'missing.json');
    const fallback=await resolveWebpageAssets(page(),{manifestPath});assert.equal(fallback.warnings[0].code,'WEBPAGE_ASSET_CATALOG_INVALID');
    assert.ok(!webpageRenderer(fallback.page)['index.html'].includes('<img'));
    const canvas=createCanvas(320,240);const valid=canvas.toBuffer('image/png');await fs.writeFile(path.join(root,'corrupt.png'),valid.subarray(0,33));
    await fs.writeFile(manifestPath,JSON.stringify([{industry:'healthcare',role:'hero',file:'corrupt.png',alt:'Laboratory',license:'Original',creator:'Test'}]));
    await assert.rejects(resolveWebpageAssets(page(),{manifestPath,strict:true}));
});

test('statistics require supplied values and static validation rejects broken heading hierarchy and assets',()=>{
    const p=page();p.sections[0]={...p.sections[0],type:'statistics',items:[{title:'Supplied value',description:'A test observation.',detail:'91%',url:''}]};
    assert.throws(()=>validateWebpageContent(p,{source:'No observations were supplied.'}));
    const files=webpageRenderer(page());
    assert.throws(()=>validateStaticWebsite({...files,'index.html':files['index.html'].replace('<h3>','<h5>').replace('</h3>','</h5>')}),/Heading/);
    assert.throws(()=>validateStaticWebsite({...files,'assets/images/catalog-1.png':Buffer.from('not an image')}),/raster/);
});
