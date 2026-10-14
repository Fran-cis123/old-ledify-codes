// Conservative wrapping estimate, in points/inches. Never truncate or shrink text.
export function assertTextFits(text, { w, h, fontSize }, field, slideNumber) {
    if (!text?.trim()) return;
    const capacity = w * 72 / fontSize;
    let lines = 0;
    for (const paragraph of text.split('\n')) {
        let used = 0;
        lines++;
        for (const word of paragraph.split(/\s+/)) {
            const width = [...word].reduce((n, c) => n + (/[^\u0000-\u024f]/.test(c) ? 1 : /[MW@]/.test(c) ? .85 : /[il.,'!]/.test(c) ? .28 : .56), 0);
            if (width > capacity) fail();
            if (used && used + width + .3 > capacity) { lines++; used = 0; }
            used += width + .3;
        }
    }
    if (lines * fontSize * 1.25 / 72 > h + .01) fail();
    function fail() {
        const maxCharacters = Math.max(10, Math.floor(Math.floor(h * 72 / (fontSize * 1.25)) * capacity / .6 * .85));
        throw Object.assign(new Error(`Slide ${slideNumber}: ${field} is too dense for readable ${fontSize} pt text. Aim for at most ${maxCharacters} characters, or restructure this field; no content was discarded.`), { code: 'PRESENTATION_CONTENT_TOO_DENSE', slideNumber, field, maxCharacters });
    }
}
