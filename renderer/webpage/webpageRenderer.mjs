import { escapeHtml as e, navigation, hero, renderSection, footer } from './components.mjs';

import { stylesheet, script } from './styles.mjs';

import { illustration } from './illustrations.mjs';

import { validateWebpageContent } from '../../Service/webpageContentValidator.mjs';

export function webpageRenderer(page) {
    if (!page.theme?.colors || !page.sections?.[0]?.id) throw new Error('Expected a normalized, themed webpage');
    validateWebpageContent(page);

    const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="description" content="${e(page.description)}"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src 'self' data:; style-src 'self'; script-src 'self'; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'"><title>${e(page.title)}</title><link rel="icon" href="./assets/icons/favicon.svg" type="image/svg+xml"><link rel="stylesheet" href="./style.css"><script src="./script.js" defer></script></head><body class="preset-${page.theme.preset}"><a class="skip" href="#main">Skip to content</a>${navigation(page)}<main id="main">${hero(page)}${page.sections.map((section,i)=>renderSection(section,i,page)).join('')}</main>${footer(page)}<div id="preview-notice" class="preview-notice" role="status" hidden><p>Contact and external links open from the downloaded website.</p><button type="button" aria-label="Close link notice">Close</button></div></body></html>`;
    return { 'index.html': html, 'style.css': stylesheet(page.theme), 'script.js': script,
        'assets/images/hero.svg': illustration(page.theme.preset, page.theme.colors),
        'assets/icons/favicon.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="16" fill="${page.theme.colors.primary}"/><circle cx="32" cy="32" r="14" fill="${page.theme.colors.accent}"/></svg>` };
}
