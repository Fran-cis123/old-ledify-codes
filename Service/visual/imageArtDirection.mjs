export function imageBrief(presentation,slide,theme,context={}){
    const request=slide.visualRequirement||{};
    const point=context.designPreferences?.imageFocalPoints?.[slide.slideNumber]||context.designPreferences?.imageFocalPoint||{x:.5,y:.5};
    const coordinate=v=>Number.isFinite(Number(v))?Math.max(0,Math.min(1,Number(v))):.5;
    const composition=slide.slideType==='title'?'hero-photo':slide.slideType==='section-divider'?'photo-divider':slide.content?.comparison?'photo-comparison':slide.slideNumber%3===0?'photo-panel':'photo-editorial';
    return {...request,slideNumber:slide.slideNumber,subject:presentation.title,message:slide.objective||slide.title,
        audience:context.audience||presentation.inferredContext?.audience||'general audience',
        description:request.description||`${slide.title}; illustrative context for ${presentation.title}`,
        searchQuery:request.searchQuery||[presentation.title,slide.title].join(' ').slice(0,160),
        purpose:request.role==='background'?'opening context':slide.objective||slide.title,
        theme:theme.family,palette:theme.palette,style:theme.style,
        composition,aspectRatio:composition==='hero-photo'?'16:9':'4:3',
        lighting:'natural, restrained contrast, consistent daylight',perspective:'editorial eye-level or subject-appropriate wide view',
        focalPoint:{x:coordinate(point.x),y:coordinate(point.y)},
        textSpace:'Text sits on a separate opaque theme panel; preserve the subject in the image area.',
        syntheticDisclosure:'Illustrative AI-generated artwork; not a photograph of an actual person, event, product or facility.',
        scientificAccuracy:'No invented diagnostic findings, anatomical structures, certifications, logos or real-world evidence.'};
}
export function generationPrompt(brief){
    return `Create exactly one professional editorial image supporting a presentation. Subject: ${brief.subject}. Slide message: ${brief.message}. Audience: ${brief.audience}. Specific scene: ${brief.description}. Composition: ${brief.composition}; aspect ${brief.aspectRatio}; focal point ${JSON.stringify(brief.focalPoint)}. Lighting: ${brief.lighting}. Perspective: ${brief.perspective}. Visual tone: ${brief.style}; theme ${brief.theme}; palette ${JSON.stringify(brief.palette)}. ${brief.textSpace} ${brief.scientificAccuracy} No text, logos, watermarks or charts. ${brief.syntheticDisclosure}`;
}
export function planImageCoverage(presentation,context={}){
    const noPhotos=/\b(no|without|avoid)\s+(?:any\s+)?(?:photos?|photographs?|photography|images?)\b/i.test([context.instructions,...(Array.isArray(context.keyInstructions)?context.keyInstructions:[])].join(' '));
    const slides=presentation.slides.map(s=>({...s}));
    const excluded=new Set(Array.isArray(context.designPreferences?.noImageSlideNumbers)?context.designPreferences.noImageSlideNumbers:[]);
    for(const s of slides)if(excluded.has(s.slideNumber)&&['photo','illustration','texture'].includes(s.visualRequirement?.kind))s.visualRequirement={role:'none',kind:'none',required:false,description:'',searchQuery:'',altText:''};
    const eligible=slides.filter(s=>!excluded.has(s.slideNumber)&&!s.content?.chart&&!s.content?.table&&!s.content?.relationship&&!s.content?.process&&!['diagram'].includes(s.visualRequirement?.kind));
    const target=noPhotos?0:Math.min(eligible.length,Math.ceil(slides.length*.65));
    // Supplement missing visual plans without replacing a requested precise diagram or data visual.
    for(const s of eligible.slice(0,target)){
        if(noPhotos)break;
        if(!s.visualRequirement||s.visualRequirement.kind==='none'||s.visualRequirement.kind==='texture')s.visualRequirement={role:s.slideType==='title'?'background':'foreground',kind:'photo',required:false,description:`Editorial context for ${s.title}; illustrative, not evidence of a specific named organization.`,searchQuery:[presentation.title,s.title].join(' '),altText:`Illustrative context for ${s.title}`,plannedBy:'coverage-default'};
    }
    if(noPhotos)for(const s of slides)if(['photo','illustration','texture'].includes(s.visualRequirement?.kind))s.visualRequirement={role:'none',kind:'none',required:false,description:'',searchQuery:'',altText:''};
    return {...presentation,slides,imageCoveragePlan:{target,eligibleSlides:eligible.length,totalSlides:slides.length,reason:noPhotos?'User requested no images':'Approximately 65% where photography/illustration is suitable; precise diagrams and data take precedence'}};
}
export function imageCoverage(presentation,diagnostics=[],budget={}){
    const counts={photographs:0,illustrations:0,diagrams:0,charts:0,tables:0,textOnly:0};const sources={};
    for(const slide of presentation.slides){
        const photo=slide.photoAsset||slide.resolvedVisual?.kind==='photo'&&slide.resolvedVisual;
        if(photo){counts[photo.generationMethod==='ai-generated'?'illustrations':'photographs']++;sources[photo.sourceType||photo.source]=(sources[photo.sourceType||photo.source]||0)+1;}
        else if(slide.resolvedVisual?.diagram||slide.content?.process||slide.content?.relationship||slide.content?.timeline||slide.content?.roadmap)counts.diagrams++;
        else if(slide.content?.chart)counts.charts++;
        else if(slide.content?.table)counts.tables++;
        else counts.textOnly++;
    }
    const actual=counts.photographs+counts.illustrations,target=presentation.imageCoveragePlan?.target||0;
    return {totalSlides:presentation.slides.length,target,actual,meetsTarget:actual>=target,distribution:counts,sourceTypes:sources,failedRequests:diagnostics.filter(d=>d.status==='failed'),missingAssets:presentation.slides.filter(s=>['photo','illustration'].includes(s.visualRequirement?.kind)&&!s.photoAsset&&!s.resolvedVisual).map(s=>s.slideNumber),budget,aestheticReview:'requires rendered human review'};
}
