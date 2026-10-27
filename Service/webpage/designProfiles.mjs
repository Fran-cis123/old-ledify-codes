// Purpose-aware defaults; explicit caller preferences always take priority.
export function websiteDesignProfile(page,context={}){
    const subject=[page.title,page.inferredContext?.topic,context.websiteBrief?.organizationDescription].filter(Boolean).join(' ');
    const instructions=[context.instructions,...(Array.isArray(context.keyInstructions)?context.keyInstructions:[])].join(' ');
    const industry=context.websiteBrief?.industry||page.designBrief?.industry;
    let id=/\b(?:real estate|property|properties|residential|luxury homes?)\b/i.test(subject)||industry==='real-estate'?'property':
        /\b(?:healthcare|medical|clinical|pharma\w*)\b/i.test(subject)||industry==='healthcare'?'healthcare':
        /\b(?:financ\w*|wealth|investment|banking)\b/i.test(subject)||industry==='finance'?'finance':
        /\b(?:conservation|biodiversity|environmental|marine species|endangered|ecosystems?)\b/i.test(subject)?'conservation':
        /\b(?:artificial intelligence|machine learning|neural networks?|AI|computing)\b/i.test(subject)?'intelligence':
        industry==='education'||page.pageType==='education'?'education':'editorial';
    const profiles={
        intelligence:{palette:'midnight-blue',font:'geometric',hero:'asymmetric',industry:'technology'},
        property:{palette:'champagne-ivory',font:'editorial',hero:'full-bleed',industry:'real-estate'},
        healthcare:{palette:'clinical-teal',font:'humanist',hero:'split',industry:'healthcare'},
        education:{palette:'scholar-blue',font:'humanist',hero:'image-led',industry:'education'},
        finance:{palette:'emerald-ink',font:'humanist',hero:'minimal',industry:'finance'},
        conservation:{palette:'moss-stone',font:'editorial',hero:'image-led',industry:industry||'professional'},
        editorial:{palette:null,font:null,hero:null,industry}
    };
    const profile={id,...profiles[id]};
    const expressive=/dark|expressive|playful|geometric/i.test([page.creativeDirection?.personality,page.visualDirection].join(' '));
    if(expressive&&page.designSpec?.paletteId&&page.designSpec.paletteId!=='auto')profile.palette=page.designSpec.paletteId;
    if(id!=='intelligence'&&page.designSpec?.fontPair)profile.font=page.designSpec.fontPair;
    const lightRequested=/\b(?:light theme|light background|white background|(?:avoid|no|without) dark)\b/i.test(instructions);
    if(lightRequested)profile.palette=id==='intelligence'?'scholar-blue':profiles[id].palette;
    if(!lightRequested&&/\b(?:dark theme|dark backgrounds?|midnight|night theme)\b/i.test(instructions))profile.palette='midnight-blue';
    if(/\b(?:serif|editorial typography)\b/i.test(instructions)&&! /sans[- ]serif/i.test(instructions))profile.font='editorial';
    return profile;
}
