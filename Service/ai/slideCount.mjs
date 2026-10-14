export const MAX_SLIDES = 12;

// Explicit API context wins over natural-language instructions. Counts include covers.
export function resolveSlideCount(input, context = {}) {
    let count = context.slideCount;
    if (count == null) {
        const words = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12,
            thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19,
            twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90, hundred: 100 };
        const instructions = [input, ...(Array.isArray(context.keyInstructions) ? context.keyInstructions : [])].join('\n');
        const number = `(?:-?\\d+(?:\\.\\d+)?|(?:twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety)(?:[ -](?:one|two|three|four|five|six|seven|eight|nine))?|${Object.keys(words).join('|')})`;
        const matches = [...instructions.matchAll(new RegExp(`(?<![\\w.\\-])(${number})[\\s-]+slides?\\b`, 'gi')),
            ...instructions.matchAll(/\b(?:slide\s*count|number\s*of\s*slides|slides)\s*[:=]\s*(-?\d+(?:\.\d+)?)\b/gi)];
        const counts = [...new Set(matches.map(m => {
            const token = m[1].toLowerCase();
            return /^-?\d/.test(token) ? Number(token) : token.split(/[ -]/).reduce((n, part) => n + words[part], 0);
        }))];
        if (counts.length > 1) throw Object.assign(new Error('Conflicting slide counts in the prompt; supply context.slideCount explicitly.'), { code: 'INVALID_SLIDE_COUNT' });
        count = counts[0];
    }
    if (count == null) return { min: 8, max: 10, source: 'default' };
    count = typeof count === 'string' && /^\d+$/.test(count.trim()) ? Number(count) : count;
    if (!Number.isInteger(count) || count < 1 || count > MAX_SLIDES) {
        throw Object.assign(new Error(`slideCount must be a whole number from 1 to ${MAX_SLIDES}, including title and conclusion. Split larger presentations into separate decks.`), { code: 'INVALID_SLIDE_COUNT' });
    }
    return { min: count, max: count, source: context.slideCount == null ? 'prompt' : 'field' };
}
