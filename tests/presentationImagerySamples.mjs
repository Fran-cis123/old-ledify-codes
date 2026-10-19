import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import {commonsCandidates,candidateSuitability} from '../Service/visual/imageProviders.mjs';
import {fetchPublicResource} from '../Service/input/publicUrl.mjs';
import {imagerySamples} from './fixtures/presentationImagery.mjs';
import {presentationLayoutService} from '../Service/presentationLayoutService.mjs';
import {presentationThemeService} from '../Service/presentationThemeService.mjs';
import {presentationRendererService} from '../Service/presentationRendererService.mjs';
import {resolvePresentationVisuals} from '../Service/visual/presentationVisuals.mjs';
import {previewRenderer} from '../renderer/presentation/previewRenderer.mjs';
import {publicGenerationResult} from '../Service/publicGenerationResult.mjs';
import {imagePolicy} from '../Service/visual/imagePolicy.mjs';

const root=path.resolve('generated/presentation-imagery');await fs.mkdir(root,{recursive:true});
const selected=imagerySamples.filter(s=>!process.argv.includes('--only')||s.name===process.argv[process.argv.indexOf('--only')+1]);
const manifest=[];
const reviewedSearches={healthcare:{1:'File:MRI machine with patient (23423505123).jpg',2:'File:USMC-101012-M-3392W-001.jpg',4:'File:Wx camera 1507509040946.jpg',5:'File:Female scientist samples DNA for a round in the thermocycler, as preparation for a polymerase chain reaction (PCR).jpg'},marine:{1:'File:Sea Turtle over Coral Reef in the Abacos, Bahamas.jpg'},business:{3:'File:IKEA New Haven warehouse interior.jpg'},pharmaceutical:{2:'vaccine vials'}};
for(const sample of selected){
    const dir=path.join(root,sample.name);await fs.mkdir(path.join(dir,'sources'),{recursive:true});
    const sources=[];
    for(const slide of sample.presentation.slides.filter(s=>s.visualRequirement.kind==='photo')){
        const metadataPath=path.join(dir,'sources',slide.slideNumber+'.json'),bufferPath=path.join(dir,'sources',slide.slideNumber+'.image');
        let asset;try{asset={...JSON.parse(await fs.readFile(metadataPath,'utf8')),buffer:await fs.readFile(bufferPath)};}catch{}
        const query=reviewedSearches[sample.name]?.[slide.slideNumber]||slide.visualRequirement.searchQuery;
        if(asset&&asset.reviewedQuery!==query&&reviewedSearches[sample.name]?.[slide.slideNumber])asset=undefined;
        if(!asset&&sample.name==='healthcare'&&slide.slideNumber===5)try{
            const local=JSON.parse(await fs.readFile(path.join(root,'pharmaceutical/sources/5.json'),'utf8'));
            const buffer=await fs.readFile(path.join(root,'pharmaceutical/sources/5.image'));
            asset={...local,buffer,slideNumber:5,reviewedQuery:query};
            const {buffer:unused,...metadata}=asset;await fs.writeFile(bufferPath,buffer);await fs.writeFile(metadataPath,JSON.stringify(metadata,null,2));
        }catch{}
        if(!asset&&sample.name==='marine'&&slide.slideNumber===1)try{
            const local=JSON.parse(await fs.readFile(path.join(root,'marine/sources/8.json'),'utf8'));
            const buffer=await fs.readFile(path.join(root,'marine/sources/8.image'));
            asset={...local,buffer,slideNumber:1,reviewedQuery:query};
            const {buffer:unused,...metadata}=asset;await fs.writeFile(bufferPath,buffer);await fs.writeFile(metadataPath,JSON.stringify(metadata,null,2));
        }catch{}
        if(!asset&&process.argv.includes('--acquire')){
            let candidates,last;
            for(let n=0;n<3;n++)try{candidates=await commonsCandidates(query,{limit:8});break;}catch(e){last=e;await new Promise(r=>setTimeout(r,2000*(n+1)));}
            if(!candidates)throw last;
            for(const candidate of candidates){
                if(sources.some(s=>s.assetId===candidate.assetId))continue;
                try{
                    let downloaded;for(let n=0;n<3;n++)try{downloaded=await fetchPublicResource(n>0&&candidate.originalFileUrl?candidate.originalFileUrl:candidate.downloadUrl,{timeoutMs:25000,maxBytes:12*1024*1024,contentTypes:/^image\/(jpeg|png|webp)(?:;|$)/i,accept:'image/jpeg,image/png,image/webp'});break;}catch(e){last=e;await new Promise(r=>setTimeout(r,3000*(n+1)));}if(!downloaded)throw last;
                    const {buffer}=downloaded;
                    const meta=await sharp(buffer,{limitInputPixels:32000000}).metadata();if(meta.width<800||meta.height<600)continue;
                    asset={...candidate,buffer,slideNumber:slide.slideNumber,reviewedQuery:query};
                    await fs.writeFile(bufferPath,buffer);await fs.writeFile(metadataPath,JSON.stringify({...candidate,slideNumber:slide.slideNumber,reviewedQuery:query},null,2));break;
                }catch(error){last=error;}
            }
            if(!asset)throw new Error(`No suitable sample photo: ${sample.name}, slide ${slide.slideNumber}, ${slide.visualRequirement.searchQuery}: ${last?.message}`);
        }
        if(!asset)throw new Error('Acquire licensed sources first using --acquire');
        sources.push(asset);console.log('[SOURCE]',sample.name,slide.slideNumber,asset.assetId,asset.license);
    }
    if(process.argv.includes('--acquire-only'))continue;
    const start=performance.now();
    const ready=presentationRendererService(presentationThemeService(presentationLayoutService(structuredClone(sample.presentation),sample.context),sample.context));
    const visual=await resolvePresentationVisuals(ready,sample.context,{cacheRoot:path.join(root,'cache'),policy:{...imagePolicy({}),retries:0},providers:{identity:'reviewed-commons-samples-v2:'+sources.map(s=>s.assetId).join(','),search:async request=>sources.find(s=>s.slideNumber===request.slideNumber)},diagramPlanner:false,onDiagnostic:d=>console.log('[FIT]',JSON.stringify(d))});
    const preview=await previewRenderer(visual);
    if(preview.status!=='completed')throw new Error(JSON.stringify(preview.warnings));
    if(visual.visualQuality.actual<5)throw new Error(`Insufficient rendered photographs: ${sample.name}: ${JSON.stringify(visual.visualQuality)}`);
    await fs.copyFile(preview.files.pptxPath,path.join(dir,'presentation.pptx'));await fs.copyFile(preview.files.pdfPath,path.join(dir,'presentation.pdf'));
    await fs.mkdir(path.join(dir,'slides'),{recursive:true});
    const tiles=[];
    for(const [i,image] of preview.slides.entries()){
        await fs.copyFile(image.filePath,path.join(dir,'slides',image.fileName));
        tiles.push({input:await sharp(image.filePath).resize(800,450).png().toBuffer(),left:i%2*800,top:Math.floor(i/2)*450});
    }
    await sharp({create:{width:1600,height:Math.ceil(tiles.length/2)*450,channels:3,background:'#ddd'}}).composite(tiles).png().toFile(path.join(dir,'contact-sheet.png'));
    const result={presentation:publicGenerationResult(visual),preview,elapsedMs:Math.round(performance.now()-start)};
    await fs.writeFile(path.join(dir,'result.json'),JSON.stringify(result,null,2));
    await fs.writeFile(path.join(dir,'image-provenance.json'),JSON.stringify(publicGenerationResult(visual.slides.filter(s=>s.photoAsset).map(s=>s.photoAsset)),null,2));
    manifest.push({name:sample.name,title:sample.title,quality:visual.visualQuality,preview,elapsedMs:result.elapsedMs});
    await fs.writeFile(path.join(root,process.argv.includes('--only')?'manifest-selected.json':'manifest.json'),JSON.stringify(manifest,null,2));
    if(process.argv.includes('--only'))try{
        const all=JSON.parse(await fs.readFile(path.join(root,'manifest.json'),'utf8'));
        await fs.writeFile(path.join(root,'manifest.json'),JSON.stringify(all.map(entry=>entry.name===sample.name?manifest[manifest.length-1]:entry),null,2));
    }catch{}
    console.log('[IMAGERY]',sample.name,visual.visualQuality.actual,preview.status,result.elapsedMs);
}
