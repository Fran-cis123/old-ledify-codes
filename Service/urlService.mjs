import * as cheerio from "cheerio";

export const urlService = async (url) => {

    try {

        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(
                `Failed to fetch URL. Status: ${response.status}`
            );
        }

        const html = await response.text();

        const $ = cheerio.load(html);

        // Remove elements that normally don't contain
        // useful article/page content
        $("script, style, noscript, nav, footer").remove();

        const text = $("body").text();

        const cleanText = text
            .replace(/\s+/g, " ")
            .trim();

        if (!cleanText) {
            throw new Error("No readable content was found at this URL");
        }

        return cleanText;

    } catch (error) {

        throw new Error(
            `URL processing failed: ${error.message}`
        );

    }
};