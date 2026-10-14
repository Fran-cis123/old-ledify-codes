import * as cheerio from "cheerio";
import { fetchPublicText } from './input/publicUrl.mjs';
import { MAX_SOURCE_CHARACTERS } from './input/sourceLimits.mjs';

export const MAX_URL_TEXT_CHARACTERS=MAX_SOURCE_CHARACTERS;
export function sourceUrlByteLimit() {
    const megabytes=Number(process.env.LEDIFY_URL_MAX_MB||10);
    if(!Number.isInteger(megabytes)||megabytes<1||megabytes>20)throw Object.assign(new Error('LEDIFY_URL_MAX_MB must be an integer from 1 to 20.'),{code:'URL_SOURCE_CONFIGURATION_ERROR'});
    return megabytes*1024*1024;
}
function readableText(text) {
    const value=text.trim();
    if(!value)throw Object.assign(new Error('No readable content was found at this URL'),{code:'INVALID_SOURCE_URL_CONTENT'});
    if(value.length>MAX_URL_TEXT_CHARACTERS)throw Object.assign(new Error('The article contains more than 200,000 readable characters. Use a shorter article or upload a PDF/DOCX containing the relevant excerpt.'),{code:'SOURCE_URL_TEXT_TOO_LARGE',maxCharacters:MAX_URL_TEXT_CHARACTERS});
    return value;
}
export const urlService = async (url, { fetchText = fetchPublicText } = {}) => {

    try {

        const { text: html, contentType } = await fetchText(url,{maxBytes:sourceUrlByteLimit()});
        if (contentType?.startsWith('text/plain')) return readableText(html);

        const $ = cheerio.load(html);

        // Remove elements that normally don't contain
        // useful article/page content
        $("script, style, noscript, nav, footer, aside, form, [role=banner], [role=navigation]").remove();
        // Wikipedia renders large citation/navigation appendices inside main.
        // Remove those widgets while retaining all substantive article sections.
        if($('meta[property="mw:pageId"]').length||$('.mw-body-content').length) {
            $('.references,.reflist,.mw-references-wrap,.navbox,.vertical-navbox,.sidebar,.metadata,.mw-editsection,.catlinks,.mw-footer,.mw-portlet,.noprint,.reference').remove();
        }

        const primary = $("article").first().length ? $("article").first() : $("main").first();
        const root = primary.length && primary.text().trim() ? primary : $("body");
        root.find("h1,h2,h3,h4,p,li,tr,section").append("\n");
        const text = root.text();

        const cleanText = text
            .replace(/[^\S\n]+/g, " ")
            .replace(/ *\n */g, "\n")
            .replace(/\n{3,}/g, "\n\n")
            .trim();

        if (!cleanText) {
            throw new Error("No readable content was found at this URL");
        }

        return readableText(cleanText);

    } catch (error) {

        const message=error.code==='SOURCE_URL_TOO_LARGE'?`The source page exceeds the ${error.maxBytes?error.maxBytes/1024/1024:sourceUrlByteLimit()/1024/1024} MB download limit. Use a shorter article URL or upload the relevant content as PDF/DOCX.`:error.message;
        throw Object.assign(new Error(`URL processing failed: ${message}`), { code: error.code || 'SOURCE_URL_FAILED', stage: 'input-extraction',maxBytes:error.maxBytes,maxCharacters:error.maxCharacters });

    }
};
