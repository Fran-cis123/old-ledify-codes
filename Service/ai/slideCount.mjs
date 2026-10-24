export const MAX_SLIDES = 12;

function describesSubset(match,instructions){
    const before=instructions.slice(0,match.index).split(/[.!?;\n]/).at(-1).toLowerCase();
    const after=instructions.slice(match.index+match[0].length).split(/[.!?;\n]/)[0].toLowerCase();
    const feature=/\b(?:imagery|images?|photos?|photographs?|illustrations?|diagrams?|charts?|tables?|videos?|visuals?|animations?|timelines?|comparisons?|citations?|references?|speaker notes|bullet points)\b/;
    // A count governing the presentation itself remains authoritative even
    // when the same sentence subsequently asks for visual content.
    if(/\b(?:create|make|generate|build|produce|prepare|deliver|write|design)\b[^.!?;\n]{0,35}$/.test(before)&&!/(?:\bon|\bacross|\bwithin|\bthroughout)\s+(?:(?:at least|at most|exactly|only|about)\s+)?$/.test(before))return false;
    if(feature.test(before)&&/\b(?:on|across|in|within|throughout|over|for|to|covering)\s+(?:(?:at least|at most|exactly|only|about|approximately)\s+)?(?:the\s+)?$/.test(before))return true;
    // "Seven slides should contain images" is coverage, not deck length.
    return /^\s*(?:(?:must|should|will|can)\s+)?(?:contain|include|feature|show|use|have|with)\b/.test(after)&&feature.test(after)&&! /\b(?:presentation|powerpoint|deck|total|overall)\b/.test(before);
}

// Explicit API context wins over natural-language instructions. Counts include covers.
export function resolveSlideCount(input, context = {}) {
    let count = context.slideCount;
    if (count == null) {
        const words = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12,
            thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19,
            twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90, hundred: 100 };
        const instructions = [input, ...(Array.isArray(context.keyInstructions) ? context.keyInstructions : [])].join('\n');
        const number = `(?:-?\\d+(?:\\.\\d+)?|(?:twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety)(?:[ -](?:one|two|three|four|five|six|seven|eight|nine))?|${Object.keys(words).join('|')})`;
        const matches = [
            ...[...instructions.matchAll(new RegExp(`(?<![\\w.\\-])(${number})[\\s-]+slides?\\b`, 'gi'))].filter(match=>!describesSubset(match,instructions)),
            ...[...instructions.matchAll(/\b(?:slide\s*count|number\s*of\s*slides|slides)\s*[:=]\s*(-?\d+(?:\.\d+)?)\b/gi)].filter(match => {
                // "Slides: 1. Cover, 2. Introduction" starts an outline.
                // Explicit "slide count: 1" still specifies a one-slide deck.
                const tail=instructions.slice(match.index + match[0].length);
                const outline=/^slides\s*:/i.test(match[0]) && match[1]==='1' && /^\s*[.)]\s*\S/.test(tail) && /\b2[.)]\s+\S/.test(tail);
                return !outline;
            })
        ];
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
