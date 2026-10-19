// With only a name/category there is no honest way to infer products, premises,
// credentials or service lines. Keep the AI design plan, constrain the copy.
export function needsFactualSkeleton(input,context={}){
    if(context.websiteBrief?.organizationDescription)return false;
    // Long extracted articles may contain substantial facts. Long design
    // checklists, however, do not establish the requested business operations.
    const designChecklist=(input.match(/\b(?:design direction|hero section|website structure|quality requirements|responsiveness|interactivity|imagery)\s*:/gi)||[]).length>=2;
    if(input.split(/\s+/).length>120&&!designChecklist)return false;
    return !/\b(?:services|products|areas|courses|features|about|background|menu)\s*:|\bfocused on\b|\bspeciali[sz]|\b(?:we|company|firm|agency|studio)\s+(?:provides|offers|helps)\b|\b(?:fictional|proposed|concept)\b/i.test(input);
}
