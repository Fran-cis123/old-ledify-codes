import {escapeHtml as e,navigation,hero,renderSection,footer} from './components.mjs';
import {stylesheet,script,bootstrap} from './styles.mjs';
import {validateWebpageContent} from '../../Service/webpageContentValidator.mjs';
import {defineSitePages,pageLink} from '../../Service/webpage/sitePages.mjs';
import {validateWebpageBindings} from '../../Service/visual/assetBinding.mjs';

export function webpageRenderer(page,assets={}){
    if(!page.theme?.colors||!page.sections?.[0]?.id)throw new Error('Expected a normalized, themed webpage');
    validateWebpageContent(page);
    validateWebpageBindings(page,assets);
    const pages=defineSitePages(page);
    const files={'style.css':stylesheet(page.theme),'script.js':script,'bootstrap.js':bootstrap,...assets,
        'assets/icons/favicon.svg':`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="12" fill="${page.theme.colors.primary}"/><path d="M18 18h10v28H18zm18 0h10v28H36z" fill="${page.theme.colors.accent}"/></svg>`};
    for(const current of pages){
        const secondary=current.slug!=='home';
        const first=current.sections[0];
        const view={...page,sections:current.sections,currentFile:current.file,pageNavigation:pages.map(p=>({file:p.file,label:p.slug==='home'?'Home':p.title})),
            title:secondary?`${current.title} · ${page.brandName}`:page.title,
            description:secondary?(first.content||page.description).slice(0,240):page.description,
            hero:secondary?{...page.hero,headline:current.title,subheadline:(first.content||page.hero.subheadline).slice(0,320),actionLabel:page.callToAction.actionLabel}:page.hero,
            designBrief:secondary?{...page.designBrief,heroComposition:'minimal'}:page.designBrief,
            visualAssets:secondary?{...page.visualAssets,hero:undefined}:page.visualAssets,
            heroTarget:pageLink(page.heroTarget,current,pages),primaryTarget:pageLink(page.primaryTarget,current,pages)};
        let canonical='';
        if(page.websiteBrief?.canonicalUrl){const base=page.websiteBrief.canonicalUrl.endsWith('/')?page.websiteBrief.canonicalUrl:page.websiteBrief.canonicalUrl+'/';canonical=new URL(current.file==='index.html'?'':current.file,base).href;}
        const seo=`<meta property="og:type" content="website"><meta property="og:title" content="${e(view.title)}"><meta property="og:description" content="${e(view.description)}">${canonical?`<link rel="canonical" href="${e(canonical)}"><meta property="og:url" content="${e(canonical)}">`:''}`;
        const facts=page.websiteBrief?.facts;
        const structured=facts?.nameVerified?{ '@context':'https://schema.org','@type':'Organization',name:page.brandName,...(canonical?{url:page.websiteBrief.canonicalUrl}:{}),...(page.contact.email?{email:page.contact.email}:{}),...(page.contact.phone?{telephone:page.contact.phone}:{})}:null;
        const ld=structured?`<script type="application/ld+json">${JSON.stringify(structured).replaceAll('<','\\u003c')}</script>`:'';
        const bodyClass=`design-profile-${page.theme.profileId||'editorial'} geometry-${page.creativeDirection?.geometry||'soft'} preset-${page.theme.preset} industry-${page.designBrief?.industry||'general'} motion-${page.designSpec?.motion||'restrained'} navigation-${page.designSpec?.navigation||'sticky'} cta-${page.creativeDirection?.ctaStyle||'solid'}`;
        files[current.file]=`<!doctype html><html lang="en"><head><meta charset="utf-8"><script src="./bootstrap.js"></script><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="description" content="${e(view.description)}">${seo}<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src 'self' data:; style-src 'self'; script-src 'self'; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'"><title>${e(view.title)}</title><link rel="icon" href="./assets/icons/favicon.svg" type="image/svg+xml"><link rel="stylesheet" href="./style.css"><script src="./script.js" defer></script>${ld}</head><body class="${e(bodyClass)}"><a class="skip" href="#main">Skip to content</a>${navigation(view)}<main id="main">${hero(view)}${view.sections.map((section,i)=>renderSection(section,i,view)).join('')}</main>${footer(view)}${view.sections.some(section=>section.type==='gallery'&&section.items.some(item=>item.image))?'<dialog id="image-dialog" class="image-dialog" aria-labelledby="image-dialog-title"><h2 id="image-dialog-title">Image preview</h2><button type="button">Close image</button><div data-dialog-media></div><p></p></dialog>':''}<div id="preview-notice" class="preview-notice" role="status" hidden><p>Contact and external links open from the downloaded website.</p><button type="button" aria-label="Close link notice">Close</button></div></body></html>`;
    }
    return files;
}
