// Digits inside identifiers (V12, CO2, GPT-4) are not measured evidence.
// Standalone quantities, dates, percentages and unit-bearing numbers still
// require grounding. This is lexical classification, not fact verification.
export function numericClaims(value=''){
 const identifiers=[];
 for(const match of String(value).matchAll(/\b(?:[A-Za-z][A-Za-z0-9]*\d[A-Za-z0-9]*|[A-Za-z]{2,}-\d+(?:\.\d+)?|[123]D)\b/g))identifiers.push([match.index,match.index+match[0].length]);
 return [...String(value).matchAll(/\d+(?:[.,]\d+)*(?:%|(?=[\p{L}]|\b))/gu)].filter(match=>!identifiers.some(([start,end])=>match.index>=start&&match.index<end)).map(match=>match[0]);
}
