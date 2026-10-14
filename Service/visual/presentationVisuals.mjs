import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { getColors } from '../../renderer/presentation/renderHelpers.mjs';
import { diagramLibrary } from '../../renderer/presentation/visuals/diagramLibrary.mjs';
import { diagramSvg, validateDiagram, themeBackgroundSvg } from '../../renderer/presentation/visuals/svgGraphics.mjs';
import { configuredImageProviders } from './imageProviders.mjs';
import { validateRenderContent } from '../../renderer/presentation/professionalLayouts.mjs';

export function imageDimensions(buffer) {
    if (!Buffer.isBuffer(buffer) || buffer.length > 12 * 1024 * 1024) throw new Error('Image exceeds the byte limit');
    let width, height;
    if (buffer.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])) && buffer.length >= 24) {
        width = buffer.readUInt32BE(16); height = buffer.readUInt32BE(20);
    } else if (buffer[0] === 255 && buffer[1] === 216) {
        let offset = 2;
        while (offset + 8 < buffer.length) {
            if (buffer[offset] !== 255) throw new Error('Malformed JPEG');
            const marker = buffer[offset + 1], size = buffer.readUInt16BE(offset + 2);
            if ([192,193,194].includes(marker)) { height = buffer.readUInt16BE(offset + 5); width = buffer.readUInt16BE(offset + 7); break; }
            if (size < 2) break; offset += 2 + size;
        }
    }
    if (!width || !height || width > 8192 || height > 8192 || width * height > 32_000_000) throw new Error('Unsupported or excessive image dimensions');
    return { width, height };
}
const rgb = hex => hex.replace('#','').match(/../g).map(v => parseInt(v,16));
const luminance = color => color.map(v => v / 255).map(v => v <= .04045 ? v / 12.92 : ((v+.055)/1.055)**2.4).reduce((sum,v,i) => sum + v * [.2126,.7152,.0722][i],0);
export function contrastRatio(a,b) { const x=luminance(a),y=luminance(b); return (Math.max(x,y)+.05)/(Math.min(x,y)+.05); }
export function deriveVisualTheme(presentation, context = {}) {
    const input = [presentation.title, context.topic, context.purpose, presentation.inferredContext?.topic, presentation.inferredContext?.purpose, presentation.strategyId].filter(Boolean).join(' ');
    const family = /medical|scientific|biology|physiolog|anatom|research|laboratory|clinical/i.test(input) ? 'scientific'
        : /technology|technical|engineering|software|network|cyber|comput|web|security|database|http|cloud/i.test(input) ? 'technical'
        : /education|classroom|learn|school|lesson|teach/i.test(input) ? 'educational' : 'editorial';
    const palette=getColors(presentation.design.tokens);
    for(const key of ['textPrimary','textSecondary']) if(contrastRatio(rgb(palette[key]),rgb(palette.background))<4.5) palette[key]=luminance(rgb(palette.background))>.4?'152536':'F5F7FA';
    return { family, topic: context.topic || presentation.title, palette,
        style: context.designPreferences?.visualStyle || 'restrained editorial', audience: context.audience || presentation.inferredContext?.audience || '' };
}
async function bounded(call, ms) {
    let timer; try { return await Promise.race([call(),new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('Image provider timed out')),ms);})]); }
    finally { clearTimeout(timer); }
}
async function storeAsset(buffer, metadata, root, svg) {
    const id = createHash('sha256').update(buffer).digest('hex');
    await fs.mkdir(root,{recursive:true});
    const filePath = path.join(root,id+'.png');
    await fs.writeFile(filePath,buffer);
    if (svg) await fs.writeFile(path.join(root,id+'.svg'),svg);
    return { ...metadata, id, filePath, data: 'image/png;base64,'+buffer.toString('base64'), ...imageDimensions(buffer) };
}
async function localAsset(svg, metadata, root, theme) {
    const image = await loadImage(Buffer.from(svg));
    const canvas = createCanvas(image.width,image.height); canvas.getContext('2d').drawImage(image,0,0);
    const provenance = { source: 'Ledify original artwork', creator: 'Ledify', license: 'Original artwork; project license', attributionRequired: false, generationMethod: 'local-svg', status: 'resolved', ...metadata };
    if (theme) {
        const asset = await prepareBackground({ ...provenance, buffer: canvas.toBuffer('image/png') },theme,root);
        await fs.writeFile(path.join(root,asset.id+'.svg'),svg); return asset;
    }
    return storeAsset(canvas.toBuffer('image/png'),provenance,root,svg);
}
export async function prepareBackground(providerAsset, theme, root, focal = { x: .5, y: .5 }) {
    const {width,height} = imageDimensions(providerAsset.buffer);
    if (width < 1920 || height < 1080) throw new Error('Full-slide photos must be at least 1920 × 1080; no artificial upscaling');
    const canvas=createCanvas(1920,1080),ctx=canvas.getContext('2d'),img=await loadImage(providerAsset.buffer);
    const scale=Math.max(1920/width,1080/height),sw=1920/scale,sh=1080/scale;
    const coordinate=value=>Number.isFinite(Number(value))?Math.max(0,Math.min(1,Number(value))):.5;
    const fx=coordinate(focal.x),fy=coordinate(focal.y);
    const sx=(width-sw)*fx,sy=(height-sh)*fy;
    ctx.drawImage(img,sx,sy,sw,sh,0,0,1920,1080);
    const original=ctx.getImageData(0,0,1920,1080),overlay=rgb(theme.palette.background);
    const foregrounds=[rgb(theme.palette.textPrimary),rgb(theme.palette.textSecondary)].map(luminance);
    const linear = Array.from({length:256},(_,v)=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;});
    let opacity=.78,minContrast=0;
    for (let pass=0;pass<7;pass++) {
        opacity=Math.min(1,.78+pass*.04);
        minContrast=Infinity;
        // Check every composited pixel, not a mean color or assumed black scrim.
        const alpha=Math.min(1,opacity);
        for(let i=0;i<original.data.length;i+=4){const a=linear[Math.round(overlay[0]*alpha+original.data[i]*(1-alpha))],b=linear[Math.round(overlay[1]*alpha+original.data[i+1]*(1-alpha))],c=linear[Math.round(overlay[2]*alpha+original.data[i+2]*(1-alpha))];
            const lum=.2126*a+.7152*b+.0722*c;
            for(const fg of foregrounds) minContrast=Math.min(minContrast,(Math.max(lum,fg)+.05)/(Math.min(lum,fg)+.05)); }
        if(minContrast>=4.5) break;
    }
    if(minContrast<4.5) throw new Error('Theme cannot provide readable image-overlay contrast');
    ctx.fillStyle='#'+theme.palette.background;ctx.globalAlpha=Math.min(1,opacity);ctx.fillRect(0,0,1920,1080);ctx.globalAlpha=1;
    return storeAsset(canvas.toBuffer('image/png'),{...providerAsset,buffer:undefined,role:'background',status:'resolved',decorative:true,
        altText:'',crop:{mode:'cover',focalPoint:{x:fx,y:fy},sourceWidth:width,sourceHeight:height},overlay:{color:theme.palette.background,opacity:Math.min(1,opacity),minimumContrast:minContrast}},root);
}

export async function resolvePresentationVisuals(presentation, context = {}, options = {}) {
    const theme=deriveVisualTheme(presentation,context),root=path.resolve(options.cacheRoot || 'generated/visual-assets');
    const providers=options.providers || configuredImageProviders(),warnings=[],slides=[];
    const backgroundRequest=presentation.slides.find(s=>s.visualRequirement?.role==='background')?.visualRequirement;
    let background;
    if (backgroundRequest && options.external !== false) {
        const request={...backgroundRequest,theme:theme.family,palette:JSON.stringify(theme.palette)};
        const cacheKey=createHash('sha256').update(JSON.stringify({request,provider:process.env.PRESENTATION_IMAGE_MODEL || 'configured-search'})).digest('hex');
        const cacheMeta=path.join(root,cacheKey+'.json');
        try {
            const cached=JSON.parse(await fs.readFile(cacheMeta,'utf8'));
            const buffer=await fs.readFile(path.join(root,cached.id+'.png'));imageDimensions(buffer);
            if(Date.now()-cached.cachedAt<7*86400000) background={...cached,data:'image/png;base64,'+buffer.toString('base64')};
        } catch {}
        for (const method of ['search','generate']) {
            if(background || !providers[method]) continue;
            try {
                const asset=await bounded(()=>providers[method](request),options.providerTimeoutMs || 45000);
                if(!asset) continue;
                if(!asset.source || !asset.creator || !asset.license || (asset.attributionRequired && !asset.attribution)) throw new Error('Image provenance/attribution is incomplete');
                background=await prepareBackground(asset,theme,root,context.designPreferences?.imageFocalPoint);
                const {data,filePath,...metadata}=background; await fs.writeFile(cacheMeta,JSON.stringify({...metadata,cachedAt:Date.now()}));
            } catch { warnings.push({code:'IMAGE_PROVIDER_FALLBACK',stage:'visual-resolution',message:`${method === 'search' ? 'Licensed image search' : 'Authorized image generation'} was unavailable or returned an unsuitable asset; using the next safe visual option.`}); }
        }
    }
    if(backgroundRequest && !background) warnings.push({code:'BACKGROUND_LOCAL_FALLBACK',stage:'visual-resolution',message:'The requested background uses original theme artwork because no suitable authorized external image was resolved.'});
    const cover=background || await localAsset(themeBackgroundSvg(theme.family,theme.palette,true),{role:'background',decorative:true,altText:'',kind:'theme-artwork'},root,theme);
    const texture=await localAsset(themeBackgroundSvg(theme.family,theme.palette,false),{role:'background',decorative:true,altText:'',kind:'subtle-texture'},root,theme);
    const artworkSvg=themeBackgroundSvg(theme.family,theme.palette,true).replace('width="1920" height="1080" viewBox="0 0 1920 1080"','width="1000" height="1000" viewBox="1000 0 920 1080"');
    const coverArtwork=await localAsset(artworkSvg,{role:'foreground',decorative:true,altText:'',kind:'theme-artwork'},root);
    let foregroundDownloads=0;
    let plannedDiagrams=0;
    for(const original of presentation.slides){
        const slide={...original},request=slide.visualRequirement || (slide.content?.visualContent ? {role:'foreground',kind:'diagram',required:true,...slide.content.visualContent.visual} : null);
        if(slide.slideType==='title') slide.coverArtwork=coverArtwork;
        if(['title','section-divider','conclusion','summary'].includes(slide.slideType)) slide.backgroundAsset=cover;
        else if(slide.slideNumber%3===0 && !['table','data-chart'].includes(slide.slideType)) slide.backgroundAsset=texture;
        if(request?.role==='foreground' || slide.content?.visualContent){
            if(['data-chart','table'].includes(slide.slideType)){
                slide.visualResolution={status:'fallback',method:'native-data-visual'};
                warnings.push({code:'VISUAL_NATIVE_ALTERNATIVE',stage:'visual-resolution',slideNumber:slide.slideNumber,message:'The supplied data is communicated with an editable native chart/table; the additional requested illustration is not used.'});
                slides.push(slide);continue;
            }
            if(['title','section-divider'].includes(slide.slideType)){
                slide.visualResolution={status:'unresolved',method:'cover-theme-artwork'};
                warnings.push({code:'VISUAL_UNRESOLVED',stage:'visual-resolution',slideNumber:slide.slideNumber,message:'The cover uses theme artwork; the additional informative foreground visual could not be placed without compromising its title.'});
                slides.push(slide);continue;
            }
            const description=[slide.title,request?.description,request?.searchQuery].filter(Boolean).join(' ');
            const catalog=diagramLibrary.find(asset=>asset.matches.test(description));
            if(request?.kind==='photo' && providers.search && options.external!==false && foregroundDownloads<2){
                foregroundDownloads++;
                try{
                    const asset=await bounded(()=>providers.search({...request,theme:theme.family,palette:JSON.stringify(theme.palette)}),options.providerTimeoutMs||20000);
                    if(asset){
                        if(!asset.source||!asset.creator||!asset.license||(asset.attributionRequired&&!asset.attribution))throw new Error('Image provenance is incomplete');
                        const dimensions=imageDimensions(asset.buffer);
                        if(dimensions.width<800||dimensions.height<600)throw new Error('Foreground image resolution is insufficient');
                        const img=await loadImage(asset.buffer),canvas=createCanvas(dimensions.width,dimensions.height);canvas.getContext('2d').drawImage(img,0,0);
                        slide.resolvedVisual=await storeAsset(canvas.toBuffer('image/png'),{...asset,buffer:undefined,role:'foreground',kind:'photo',status:'resolved',altText:request.altText||request.description},root);
                        slide.visualResolution={status:'resolved',method:'licensed-search'};
                    }
                }catch{warnings.push({code:'IMAGE_PROVIDER_FALLBACK',stage:'visual-resolution',slideNumber:slide.slideNumber,message:'The requested foreground photograph could not be resolved from an authorized provider; trying a semantic alternative.'});}
            }
            let diagram=catalog?.diagram || slide.visualPlan || slide.content?.visualContent?.visual?.diagram;
            if(!diagram && slide.content?.process) {
                const steps=slide.content.process.steps;
                diagram={kind:'flowchart',nodes:steps.map((s,i)=>({id:'step-'+i,label:s.title,description:s.description})),
                    edges:steps.slice(1).map((s,i)=>({from:'step-'+i,to:'step-'+(i+1),label:''})),caption:'Ordered pathway'};
            }
            if(!diagram && slide.content?.relationship){
                const graph=slide.content.relationship;
                diagram={kind:'labeled',nodes:graph.nodes,edges:graph.relationships,caption:'Schematic of the specified relationships'};
            }
            if(!diagram && request?.kind!=='photo' && options.diagramPlanner && plannedDiagrams<3){
                plannedDiagrams++;
                try{diagram=await options.diagramPlanner({slide,presentation});slide.visualPlan=diagram;}catch{ /* Explicit unresolved warning below. */ }
            }
            if(diagram && !slide.resolvedVisual){
                try {
                    validateDiagram(diagram);
                    slide.resolvedVisual=await localAsset(diagramSvg(diagram,theme.palette),{role:'foreground',kind:'diagram',diagram,
                        altText:request?.altText || catalog?.altText || `Schematic showing ${diagram.nodes.map(n=>n.label).join(', ')} and their specified relationships.`,
                        caption:catalog?.caption || diagram.caption || 'Simplified schematic',references:catalog?.references || [],catalogId:catalog?.id},root);
                    slide.visualResolution={status:'resolved',method:catalog ? 'local-catalog' : 'structured-diagram'};
                    if(catalog) warnings.push({code:'DIAGRAM_SIMPLIFIED',stage:'visual-resolution',slideNumber:slide.slideNumber,message:'An original labeled schematic is used as an accurate alternative; it does not depict fine anatomical geometry or tissue detail.'});
                    validateRenderContent(slide);
                } catch(error) { diagram=null; delete slide.resolvedVisual; options.onDiagnostic?.({slideNumber:slide.slideNumber,message:error.message,field:error.field}); }
            }
            if(!slide.resolvedVisual){
                slide.visualResolution={status:'unresolved',method:'text-layout-fallback'};
                warnings.push({code:'VISUAL_UNRESOLVED',stage:'visual-resolution',slideNumber:slide.slideNumber,message:'The requested informative visual could not be resolved accurately; a complete text layout is used and the visual requirement remains unmet.'});
                // Keep the requirement and status, never put its instructions on slide.
                slide.layoutId='text-visual-text-fallback';
            }
            else if(!diagram){
                try{validateRenderContent(slide);}catch{
                    delete slide.resolvedVisual;slide.visualResolution={status:'unresolved',method:'text-layout-fallback'};
                    warnings.push({code:'VISUAL_LAYOUT_FALLBACK',stage:'visual-resolution',slideNumber:slide.slideNumber,message:'The resolved photograph could not fit alongside complete readable content; a text layout is used.'});
                }
            }
        }
        slides.push(slide);
    }
    for(const slide of slides) {
        // Visuals can change geometry after AI-stage fit validation. Preserve
        // all approved text by removing optional artwork before final rendering.
        try {validateRenderContent(slide);} catch(error) {
            if(slide.coverArtwork) {
                delete slide.coverArtwork;
                try{validateRenderContent(slide);}catch(failure){throw Object.assign(failure,{stage:'visual-layout-validation'});}
                warnings.push({code:'COVER_LAYOUT_FALLBACK',stage:'visual-resolution',slideNumber:slide.slideNumber,message:'Decorative cover artwork was omitted so the complete title and subtitle remain readable.'});
            } else {
                throw Object.assign(error,{stage:'visual-layout-validation'});
            }
        }
    }
    return {...presentation,slides,visualTheme:{family:theme.family,style:theme.style},warnings:[...(presentation.warnings||[]),...warnings]};
}
