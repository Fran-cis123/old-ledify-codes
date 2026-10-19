import fs from 'node:fs/promises';
import path from 'node:path';
import JSZip from 'jszip';
import { load } from 'cheerio';
import { checkGeometry } from './geometry.mjs';
import { visibleSlideText } from '../../Service/ai/presentationQuality.mjs';
import {createHash} from 'node:crypto';

const normalize = text => text.replace(/\s+/g,' ').trim();
export async function validateRenderedPptx(filePath, presentation) {
    const zip=await JSZip.loadAsync(await fs.readFile(filePath));
    const files=Object.keys(zip.files).filter(name=>/^ppt\/slides\/slide\d+\.xml$/.test(name));
    if(files.length!==presentation.slides.length) throw new Error('Rendered PowerPoint slide count does not match the plan');
    const report=[];
    for(const [i,slide] of presentation.slides.entries()){
        const xml=await zip.file(`ppt/slides/slide${i+1}.xml`).async('string'),$=load(xml,{xmlMode:true});
        const text=normalize($('a\\:t').map((i,node)=>$(node).text()).get().join(' '));
        const elements=[];
        $('p\\:sp,p\\:pic,p\\:graphicFrame').each((index,node)=>{
            const item=$(node),transform=item.find('a\\:xfrm,p\\:xfrm').first();
            if(!transform.length)return;
            const off=transform.find('a\\:off').first(),ext=transform.find('a\\:ext').first();
            const visible=normalize(item.find('a\\:t').map((i,n)=>$(n).text()).get().join(' '));
            const sizes=item.find('a\\:rPr').map((i,n)=>Number($(n).attr('sz'))/100).get().filter(v=>v>0);
            const y=Number(off.attr('y'))/914400;
            elements.push({kind:visible?'text':'shape',x:Number(off.attr('x'))/914400,y,w:Number(ext.attr('cx'))/914400,h:Number(ext.attr('cy'))/914400,
                fontSize:sizes.length?Math.min(...sizes):18,field:y>=7?'slideNumber':y>=6.3?'visual.caption':`xml.object[${index}]`});
        });
        const geometry=checkGeometry(elements,i+1);
        if(!text || !text.includes(normalize(slide.slideType==='title'?presentation.title:slide.title))) throw new Error(`Rendered slide ${i+1} is missing its title`);
        const subtitle=slide.slideType==='title'?presentation.subtitle:slide.subtitle;
        if(subtitle && !text.includes(normalize(subtitle))) throw new Error(`Rendered slide ${i+1} is missing its intended subtitle`);
        const visual=slide.content?.visualContent?.visual;
        const intended=[slide.title,slide.subtitle,visibleSlideText(slide)].filter(Boolean).join(' ');
        if(visual?.searchQuery && text.includes(visual.searchQuery) && !intended.includes(visual.searchQuery)) throw Object.assign(new Error(`Rendered slide ${i+1} exposes an internal search query`),{slideNumber:i+1,field:'renderedOutput.searchQuery'});
        const hasMedia=$('p\\:pic').length>0;
        for(const photo of slide.photoAssets||[slide.photoAsset].filter(Boolean)){
            const rels=load(await zip.file(`ppt/slides/_rels/slide${i+1}.xml.rels`).async('string'),{xmlMode:true});
            let embedded=false;
            for(const node of $('p\\:pic a\\:blip').toArray()){
                const id=$(node).attr('r:embed');
                const relation=rels('Relationship').toArray().find(n=>rels(n).attr('Id')===id);
                if(!relation||rels(relation).attr('TargetMode')==='External')continue;
                const target=path.posix.normalize(path.posix.join('ppt/slides',rels(relation).attr('Target')));
                const entry=zip.file(target);if(entry&&createHash('sha256').update(await entry.async('nodebuffer')).digest('hex')===photo.id)embedded=true;
            }
            if(!embedded)throw new Error(`Rendered slide ${i+1} is missing its self-contained photo asset`);
        }
        if(slide.backgroundAsset && !hasMedia) throw new Error(`Rendered slide ${i+1} is missing its background image`);
        if(slide.resolvedVisual?.diagram) for(const node of slide.resolvedVisual.diagram.nodes) if(!text.includes(normalize(node.label))) throw new Error(`Rendered slide ${i+1} is missing a diagram label`);
        report.push({slideNumber:i+1,titlePresent:true,subtitlePresent:!!subtitle,hasMedia,hasDiagram:!!slide.resolvedVisual?.diagram,layoutId:slide.layoutId,visibleWords:text.split(/\s+/).length,geometry});
    }
    for(const name of Object.keys(zip.files).filter(name=>/^ppt\/media\//.test(name) && !zip.files[name].dir)) if(!(await zip.file(name).async('nodebuffer')).length) throw new Error('PowerPoint contains an empty image asset');
    for(const name of Object.keys(zip.files).filter(name=>name.endsWith('.rels'))){
        const $=load(await zip.file(name).async('string'),{xmlMode:true});
        const base=name==='_rels/.rels'?'':path.posix.dirname(name.replace('/_rels/','/').replace(/\.rels$/,''));
        $('Relationship').each((_,node)=>{
            const rel=$(node);if(rel.attr('TargetMode')==='External')return;
            const target=rel.attr('Target');if(!target)return;
            const resolved=target.startsWith('/')?target.slice(1):path.posix.normalize(path.posix.join(base,target));
            if(!zip.file(resolved))throw new Error(`PowerPoint has a missing internal asset relationship: ${resolved}`);
        });
    }
    return {status:'completed',slides:report,layoutDiversity:{distinct:new Set(presentation.slides.map(s=>s.layoutId)).size,total:report.length},aestheticReview:'requires-human-review'};
}
