import * as cheerio from 'cheerio';
import { parse } from 'parse5';
import { safeLink, webpageError } from './webpageContentValidator.mjs';
import { script } from '../renderer/webpage/styles.mjs';

export const SITE_FILES = Object.freeze(['index.html', 'style.css', 'script.js', 'assets/images/hero.svg', 'assets/icons/favicon.svg']);
export function validateStaticWebsite(files) {
    const fail = message => { throw webpageError(message, 'files', 'WEBPAGE_STATIC_INVALID'); };
    for (const name of Object.keys(files)) if (!SITE_FILES.includes(name)) fail(`Unexpected or unsafe output path: ${name}`);
    for (const name of SITE_FILES) if (typeof files[name] !== 'string' || !files[name].trim()) fail(`Missing output file: ${name}`);
    const errors = [];
    parse(files['index.html'], { onParseError: error => errors.push(error.code) });
    if (errors.length) fail(`Invalid HTML structure: ${errors.join(', ')}`);
    const $ = cheerio.load(files['index.html']);
    if ($('html').attr('lang') !== 'en' || !$('meta[charset]').length || !$('meta[name=viewport]').length || !$('meta[name=description]').attr('content')) fail('Missing required document metadata');
    if ($('h1').length !== 1 || !$('title').text().trim() || !$('main').length) fail('Expected one main heading, title and main landmark');
    const ids = new Set();
    $('[id]').each((_, node) => {
        const id = $(node).attr('id');
        if (ids.has(id)) fail(`Duplicate ID: ${id}`);
        ids.add(id);
    });
    $('*').each((_, node) => {
        for (const name of Object.keys(node.attribs || {})) if (/^on/i.test(name) || ['srcdoc', 'style'].includes(name)) fail(`Unsafe HTML attribute: ${name}`);
    });
    if ($('iframe,object,embed,base,form').length) fail('Generated static sites cannot contain embedded code or submission forms');
    $('script').each((_, node) => { if ($(node).attr('src') !== './script.js' || $(node).text().trim()) fail('Only the trusted local interaction script is allowed'); });
    if ($('script').length !== 1 || files['script.js'] !== script) fail('Unexpected JavaScript implementation');
    $('[href],[src]').each((_, node) => {
        for (const attr of ['href', 'src']) {
            const value = $(node).attr(attr);
            if (value == null) continue;
            if (value.startsWith('#')) { if (!ids.has(value.slice(1))) fail(`Broken anchor: ${value}`); }
            else if (value.startsWith('./')) { if (!Object.hasOwn(files, value.slice(2))) fail(`Missing local asset: ${value}`); }
            else if (value.startsWith('https:')) safeLink(value);
            else if (value.startsWith('mailto:') || value.startsWith('tel:')) { if (/[\r\n<>]/.test(value)) fail('Unsafe contact link'); }
            else fail(`Unsupported file or URL reference: ${value}`);
        }
    });
    $('img').each((_, node) => { if (!Object.hasOwn(node.attribs, 'alt')) fail('Image is missing alt text'); });
    $('section').each((_, node) => { if (!$(node).find('h1,h2').length || $(node).text().trim().length < 8) fail('Empty or unlabelled section'); });
    if (/@import|expression\s*\(|javascript:/i.test(files['style.css'])) fail('Unsafe or network-dependent CSS');
    for (const match of files['style.css'].matchAll(/url\(\s*['"]?([^)'"\s]+)/g)) if (!Object.hasOwn(files, match[1].replace(/^\.\//, ''))) fail('Unbundled CSS asset');
    for (const name of SITE_FILES.filter(name => name.endsWith('.svg'))) {
        if (/<(?:script|foreignObject)\b|\bon\w+\s*=|(?:href|src)\s*=/i.test(files[name])) fail('Unsafe SVG content');
    }
    return { valid: true, files: [...SITE_FILES], sections: $('main>section').length };
}
