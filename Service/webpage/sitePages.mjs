import {PAGE_SLUGS} from './websiteBrief.mjs';
import {webpageError} from '../webpageContentValidator.mjs';

export function defineSitePages(page){
    const requested=page.websiteBrief?.project.pages || page.requestedPages || ['home'];
    const definitions=page.pages?.length?page.pages:null;
    const slugs=[...new Set(['home',...(definitions?definitions.map(p=>p.slug):requested)])];
    if(slugs.length>6||slugs.some(slug=>!PAGE_SLUGS.includes(slug)))throw webpageError('Unsupported page definition','pages');
    if(slugs.length===1)return [{slug:'home',file:'index.html',title:page.title,sections:[...page.sections]}];
    const groups={about:['about','values','team'],services:['services','process','comparison'],products:['products','pricing','features'],portfolio:['projects','gallery','case-studies'],contact:['contact','faq']};
    const pages=slugs.map(slug=>{
        const plan=definitions?.find(p=>p.slug===slug);
        const indexes=plan?.sectionIndexes;
        if(indexes && (indexes.some(i=>!Number.isInteger(i)||i<0||i>=page.sections.length)||new Set(indexes).size!==indexes.length))throw webpageError('Invalid page section references','pages');
        const sections=indexes?indexes.map(i=>page.sections[i]):slug==='home'?page.sections.filter(s=>!['contact','faq','team'].includes(s.type)):page.sections.filter(s=>groups[slug].includes(s.type));
        return {slug,file:slug==='home'?'index.html':slug+'.html',title:plan?.title || (slug==='home'?page.title:slug[0].toUpperCase()+slug.slice(1)),sections};
    });
    // Do not invent page content for a requested page with no supporting source.
    const retained=pages.filter(p=>p.slug==='home'||p.sections.length);
    const home=retained.find(p=>p.slug==='home');if(!home.sections.length)home.sections=page.sections.slice(0,1);
    const assigned=new Set(retained.flatMap(p=>p.sections.map(s=>s.id)));
    home.sections.push(...page.sections.filter(s=>!assigned.has(s.id)));
    return retained;
}

export function pageLink(href,current,pages){
    if(!href?.startsWith('#')||href==='#main')return href;
    const id=href.slice(1);
    if(current.sections.some(s=>s.id===id))return href;
    const target=pages.find(p=>p.sections.some(s=>s.id===id));
    return target?`./${target.file}#${id}`:'#main';
}
