import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
const root=path.resolve('generated/webpage-samples');
const manifest=JSON.parse(await fs.readFile(path.join(root,'manifest.json'),'utf8'));
const rows=[];
for(const item of manifest){
    const result=JSON.parse(await fs.readFile(path.join(item.directory,item.mode==='live'?'live-result.json':'fixture-result.json'),'utf8')),page=result.generatedContent;
    rows.push({name:item.name,category:page.pageType,industry:page.designBrief.industry,hero:page.designBrief.heroComposition,palette:page.theme.paletteId,font:page.designSpec.fontPair,sections:page.sections.map(s=>s.type),compositions:page.sections.map(s=>s.composition),backgrounds:page.sections.map(s=>s.background),interactions:page.creativeDirection.interactions,images:page.visualAssets.credits.length,geometry:page.creativeDirection.geometry,cta:page.creativeDirection.ctaStyle});
}
const regular=rows.find(row=>row.name==='school'),expressive=rows.find(row=>row.name==='schoolExpressive');
assert.equal(regular.industry,expressive.industry);for(const key of ['hero','palette','font'])assert.notEqual(regular[key],expressive[key]);
assert.ok(new Set(rows.map(row=>row.hero)).size>=5);assert.ok(new Set(rows.map(row=>row.palette)).size>=6);assert.ok(new Set(rows.map(row=>row.font)).size>=4);
await fs.writeFile(path.join(root,'cross-category-comparison.json'),JSON.stringify(rows,null,2));console.log(JSON.stringify(rows,null,2));
