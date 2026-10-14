export const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const e = escapeHtml;
export const button = (label, href, secondary = false) => `<a class="button${secondary ? ' button-secondary' : ''}" href="${e(href)}">${e(label)}<span aria-hidden="true">↗</span></a>`;
export function navigation(page) {
    return `<header class="header"><div class="container header-inner"><a class="brand" href="#main"><span class="brand-mark" aria-hidden="true">${e(page.brandName[0])}</span>${e(page.brandName)}</a><button class="menu-toggle" type="button" aria-controls="main-nav" aria-expanded="false">Menu <span aria-hidden="true">☰</span></button><nav id="main-nav" class="nav" aria-label="Main navigation">${page.sections.filter(s => s.navLabel).map(s => `<a href="#${s.id}">${e(s.navLabel)}</a>`).join('')}</nav></div></header>`;
}
export function hero(page) {
    const categories = { portfolio: 'Selected work & ideas', startup: 'A new way forward', business: 'Thoughtful professional services', education: 'A place for curiosity', restaurant: 'At the table', event: 'Come together', product: 'Made with purpose', agency: 'Creative perspectives', nonprofit: 'Working toward change', service: 'Here to help', informational: 'An introduction' };
    return `<section class="hero"><div class="container hero-grid"><div class="hero-copy"><p class="eyebrow">${categories[page.pageType]}</p><h1>${e(page.hero.headline)}</h1><p class="hero-description">${e(page.hero.subheadline)}</p><div class="hero-actions">${button(page.hero.actionLabel, page.heroTarget)}${page.contact.email ? `<a class="text-link" href="mailto:${e(page.contact.email)}">Get in touch <span aria-hidden="true">↗</span></a>` : ''}</div></div><figure class="hero-art"><img src="./assets/images/hero.svg" width="600" height="600" alt="" fetchpriority="high"><figcaption>${page.pageType === 'startup' || page.pageType === 'product' ? 'Concept illustration' : e(page.brandName)}</figcaption></figure></div></section>`;
}
export function renderSection(section, index, page) {
    const prose = section.items.length === 0 && section.type !== 'contact';
    const intro = `<div class="section-heading"><p class="section-number" aria-hidden="true">${String(index + 1).padStart(2, '0')}</p><h2>${e(section.heading)}</h2>${section.content && !prose ? `<p>${e(section.content)}</p>` : ''}</div>`;
    const items = section.items;
    const itemText = item => `<h3>${e(item.title)}</h3><p>${e(item.description)}</p>${item.detail ? `<p class="item-detail">${e(item.detail)}</p>` : ''}${item.url ? `<a class="text-link" href="${e(item.url)}" rel="noopener noreferrer">Explore ${e(item.title)} <span aria-hidden="true">↗</span></a>` : ''}`;
    let body = prose ? `<p class="prose-copy">${e(section.content)}</p>` : '';
    if (section.type === 'faq') body = `<div class="faq-list">${items.map(item => `<details><summary>${e(item.title)}<span aria-hidden="true">+</span></summary><p>${e(item.description)}</p>${item.detail ? `<p>${e(item.detail)}</p>` : ''}</details>`).join('')}</div>`;
    else if (section.type === 'process') body = `<ol class="process-list">${items.map(item => `<li>${itemText(item)}</li>`).join('')}</ol>`;
    else if (section.type === 'projects' || section.type === 'gallery') body = `<div class="project-grid">${items.map((item, i) => `<article class="project"><div class="project-art art-${i % 3}" aria-hidden="true"><span></span><span></span><span></span></div><div class="project-copy">${itemText(item)}</div></article>`).join('')}</div>`;
    else if (section.type === 'menu' || section.type === 'schedule' || section.type === 'services') body = `<div class="editorial-list">${items.map(item => `<article><div>${itemText({ ...item, detail: '' })}</div>${item.detail ? `<span class="item-detail">${e(item.detail)}</span>` : ''}</article>`).join('')}</div>`;
    else if (section.type === 'testimonials') body = `<div class="quotes">${items.map(item => `<figure><blockquote>${e(item.description)}</blockquote><figcaption>${e(item.title)}${item.detail ? ` · ${e(item.detail)}` : ''}</figcaption></figure>`).join('')}</div>`;
    else if (items.length) body = `<div class="card-grid">${items.map(item => `<article class="card">${itemText(item)}</article>`).join('')}</div>`;
    if (section.type === 'contact') body += contactDetails(page.contact);
    return `<section id="${section.id}" class="content-section section-${section.type}"><div class="container section-layout">${intro}<div class="section-body">${body}</div></div></section>`;
}
export function contactDetails(contact) {
    return `<div class="contact-details">${contact.email ? `<a href="mailto:${e(contact.email)}">${e(contact.email)}</a>` : ''}${contact.phone ? `<a href="tel:${e(contact.phone.replace(/[^+\d]/g, ''))}">${e(contact.phone)}</a>` : ''}${contact.address ? `<p>${e(contact.address)}</p>` : ''}</div>`;
}
export function footer(page) {
    return `<section class="cta"><div class="container cta-inner"><div><h2>${e(page.callToAction.heading)}</h2><p>${e(page.callToAction.text)}</p></div>${button(page.callToAction.actionLabel, page.primaryTarget)}</div></section><footer class="footer"><div class="container footer-top"><a class="brand" href="#main">${e(page.brandName)}</a>${contactDetails(page.contact)}<a href="#main">Back to top ↑</a></div><div class="container footer-bottom"><span>© ${new Date().getFullYear()} ${e(page.brandName)}</span><span>${e(page.description)}</span></div></footer>`;
}
