// A photograph of an existing subject cannot stand in for an imagined scene.
export function requiresConceptImage(target={}){
 return target.visualIntent==='concept'||/\b(?:conceptual|concept (?:imagery|images?|illustrations?|visualizations?|art)|speculative|futuristic|renderings?|artist['’]?s? (?:impression|vision))\b/i.test(target.query||target.searchQuery||'');
}
export function isConceptAsset(record={}){
 return record.source==='Google Gemini'||record.source==='User supplied'||record.sourceType==='ai-generated'||record.generationMethod==='ai-generated'||['synthetic','illustration'].includes(record.mediaKind);
}
