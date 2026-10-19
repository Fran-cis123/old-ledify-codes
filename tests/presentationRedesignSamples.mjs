import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import JSZip from 'jszip';
import {load} from 'cheerio';
import {categorySamples} from './fixtures/presentationRedesign.mjs';
import {presentationLayoutService} from '../Service/presentationLayoutService.mjs';
import {presentationThemeService} from '../Service/presentationThemeService.mjs';
import {presentationRendererService} from '../Service/presentationRendererService.mjs';
import {resolvePresentationVisuals} from '../Service/visual/presentationVisuals.mjs';
import {previewRenderer} from '../renderer/presentation/previewRenderer.mjs';
import {convertPdfToImages} from '../renderer/converters/pdfToImages.mjs';

const root=path.resolve('generated/presentation-redesign');await fs.mkdir(root,{recursive:true});
async function contactSheet(files,target){
    const tiles=[];for(const [i,file] of files.entries())tiles.push({input:await sharp(file).resize(800,450,{fit:'contain'}).png().toBuffer(),left:(i%2)*800,top:Math.floor(i/2)*450});
    await sharp({create:{width:1600,height:Math.ceil(files.length/2)*450,channels:3,background:'#ddd'}}).composite(tiles).png().toFile(target);
}
const manifest=[];
for(const sample of categorySamples.filter(s=>!process.argv.includes('--only')||process.argv[process.argv.indexOf('--only')+1]===s.name)){
    const start=performance.now(),directory=path.join(root,sample.name);await fs.mkdir(directory,{recursive:true});
    const layout=presentationLayoutService(structuredClone(sample.presentation),sample.context);
    const ready=presentationRendererService(presentationThemeService(layout,sample.context));
    const visual=await resolvePresentationVisuals(ready,sample.context,{external:false,diagramPlanner:false,cacheRoot:path.join(root,'assets')});
    const preview=await previewRenderer(visual);
    if(preview.status!=='completed')throw new Error(`${sample.name}: incomplete conversion ${JSON.stringify(preview.warnings)}`);
    await fs.copyFile(preview.files.pptxPath,path.join(directory,'presentation.pptx'));
    await fs.copyFile(preview.files.pdfPath,path.join(directory,'presentation.pdf'));
    await fs.mkdir(path.join(directory,'slides'),{recursive:true});
    for(const image of preview.slides)await fs.copyFile(image.filePath,path.join(directory,'slides',image.fileName));
    await contactSheet(preview.slides.map(s=>s.filePath),path.join(directory,'contact-sheet.png'));
    await fs.writeFile(path.join(directory,'result.json'),JSON.stringify({presentation:visual,preview},null,2));
    const entry={name:sample.name,slideCount:visual.slides.length,layouts:visual.slides.map(s=>s.layoutId),theme:visual.design.themeId,variant:visual.design.variantId,elapsedMs:Math.round(performance.now()-start),preview,quality:preview.quality};
    manifest.push(entry);console.log('[REDESIGN]',sample.name,entry.slideCount,entry.elapsedMs,JSON.stringify(entry.layouts));
    await fs.writeFile(path.join(root,process.argv.includes('--only')?'manifest-selected.json':'manifest.json'),JSON.stringify(manifest,null,2));
}
if(!process.argv.includes('--only')||process.argv.includes('healthcare')){
    const original=path.resolve('generated/previews/061f5241-311f-4ff5-b0b7-3690c670b717');
    const before=path.join(root,'healthcare-before');await fs.mkdir(before,{recursive:true});
    const zip=await JSZip.loadAsync(await fs.readFile(path.join(original,'presentation.pptx')));
    const text=[];for(let i=1;i<=10;i++){const $=load(await zip.file(`ppt/slides/slide${i}.xml`).async('string'),{xmlMode:true});text.push({slideNumber:i,text:$('a\\:t').map((_,n)=>$(n).text()).get()});}
    await fs.writeFile(path.join(before,'original-text.json'),JSON.stringify(text,null,2));
    const pages=await convertPdfToImages({pdfPath:path.join(original,'presentation.pdf'),outputDirectory:path.join(before,'slides')});
    await contactSheet(pages.map(s=>s.filePath),path.join(before,'contact-sheet.png'));
    const pairs=[];for(const n of [1,3,6,9,10])pairs.push(path.join(before,'slides',`slide-${n}.png`),path.join(root,'healthcare','slides',`slide-${n}.png`));
    await contactSheet(pairs,path.join(root,'healthcare','before-after.png'));
}
