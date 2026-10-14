import fs from 'node:fs/promises';
import JSZip from 'jszip';
import { load } from 'cheerio';

const normalize = text => text.replace(/\s+/g,' ').trim();
export async function validateRenderedPptx(filePath, presentation) {
    const zip=await JSZip.loadAsync(await fs.readFile(filePath));
    const files=Object.keys(zip.files).filter(name=>/^ppt\/slides\/slide\d+\.xml$/.test(name));
    if(files.length!==presentation.slides.length) throw new Error('Rendered PowerPoint slide count does not match the plan');
    const report=[];
    for(const [i,slide] of presentation.slides.entries()){
        const xml=await zip.file(`ppt/slides/slide${i+1}.xml`).async('string'),$=load(xml,{xmlMode:true});
        const text=normalize($('a\\:t').map((i,node)=>$(node).text()).get().join(' '));
        if(!text || !text.includes(normalize(slide.slideType==='title'?presentation.title:slide.title))) throw new Error(`Rendered slide ${i+1} is missing its title`);
        const subtitle=slide.slideType==='title'?presentation.subtitle:slide.subtitle;
        if(subtitle && !text.includes(normalize(subtitle))) throw new Error(`Rendered slide ${i+1} is missing its intended subtitle`);
        const visual=slide.content?.visualContent?.visual;
        if(visual?.searchQuery && text.includes(visual.searchQuery)) throw new Error(`Rendered slide ${i+1} exposes an internal search query`);
        const hasMedia=$('p\\:pic').length>0;
        if(slide.backgroundAsset && !hasMedia) throw new Error(`Rendered slide ${i+1} is missing its background image`);
        if(slide.resolvedVisual?.diagram) for(const node of slide.resolvedVisual.diagram.nodes) if(!text.includes(normalize(node.label))) throw new Error(`Rendered slide ${i+1} is missing a diagram label`);
        report.push({slideNumber:i+1,titlePresent:true,subtitlePresent:!!subtitle,hasMedia,hasDiagram:!!slide.resolvedVisual?.diagram});
    }
    for(const name of Object.keys(zip.files).filter(name=>/^ppt\/media\//.test(name) && !zip.files[name].dir)) if(!(await zip.file(name).async('nodebuffer')).length) throw new Error('PowerPoint contains an empty image asset');
    return {status:'completed',slides:report};
}
