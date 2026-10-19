// Preserve explicit numbered instructions. Values are user supplied, never facts inferred by the renderer.
export function numberedSlideRequirements(input='',context={}) {
    const text=[input,...(Array.isArray(context.keyInstructions)?context.keyInstructions:[])].join('\n');
    const requirements=[];
    const pattern=/\bslide\s+(\d{1,3})\s*(?::|[–—-]|(?:must|should)\s+(?:cover|discuss|explain|include)|(?:covers?|discuss|explain))\s*([^\n;.!?]+?)(?=\s+slide\s+\d|[\n;.!?]|$)/gi;
    for(const m of text.matchAll(pattern))requirements.push({slideNumber:Number(m[1]),topic:m[2].trim()});
    return requirements;
}
export function validateNumberedRequirements(presentation,requirements=[]) {
    for(const r of requirements){
        const slide=presentation.slides[r.slideNumber-1];
        const tokens=r.topic.toLowerCase().match(/[\p{L}\p{N}]{2,}/gu)?.filter(w=>!['the','and','with','about','include','cover'].includes(w))||[];
        const actual=[slide?.title,slide?.objective].join(' ').toLowerCase();
        if(!slide||!tokens.length||tokens.filter(t=>actual.includes(t)).length<Math.ceil(tokens.length*.5))throw Object.assign(new Error(`Slide ${r.slideNumber} must cover the explicit instruction: ${r.topic}`),{code:'AI_SCHEMA_VALIDATION_FAILED',slideNumber:r.slideNumber,field:`slides[${r.slideNumber-1}].objective`,repairHint:`Preserve the requested topic on slide ${r.slideNumber}: ${r.topic}`});
    }
}

export function visualIntent(slide){
    const c=slide.content||{};
    const treatment=c.process?'ordered-flow':c.timeline?'chronology':c.roadmap?'phase-progression':c.comparison?'parallel-comparison':c.relationship?'relationships':c.chart?'supplied-data':c.table?'precise-comparison':c.summary||c.conclusion?'synthesis':c.cards||c.items?'grouped-concepts':c.visualContent?'explanatory-visual':c.textContent?'editorial-explanation':'opening';
    return {treatment,reason:`Selected from the canonical ${Object.keys(c)[0]||'title'} structure; no data or causal links inferred.`};
}
