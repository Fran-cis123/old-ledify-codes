import {candidateImageText} from './imageRelevance.mjs';
const tokens=value=>String(value).normalize('NFKD').replace(/\p{M}/gu,'').replace(/([\p{L}])(\d)/gu,'$1 $2').replace(/(\d)([\p{L}])/gu,'$1 $2').toLowerCase().match(/[\p{L}\p{N}]+/gu)||[];
export function imageIdentityLabel(title,providedLabels=[]){
 const words=new Set(tokens(title)),named=providedLabels.filter(label=>tokens(label).every(token=>words.has(token)));
 if(!named.length)return title;
 const identifiers=String(title).match(/\b(?:[A-Z][A-Z0-9-]*\d[A-Z0-9-]*|\d{2,}|[A-Z])\b/g)||[];
 return [...new Set([...named,...identifiers])].join(' ');
}
// Exact labeled objects need independent metadata for every identity token.
// Broad topical similarity and a generation prompt cannot certify a model.
export function matchesImageIdentity(record,target={}){
 if(!target.identityLabel)return true;
 if(record.source==='Google Gemini'||record.generationMethod==='ai-generated'||record.sourceType==='ai-generated')return false;
 const expected=tokens(target.identityLabel),observed=new Set(tokens(candidateImageText(record)));
 return expected.length>0&&expected.every(token=>observed.has(token));
}

// A subject-domain match cannot certify a close-up of a particular component.
// Use independent metadata, never the requested alt text, to verify that view.
export function matchesImageDetail(record,target={}){
 if(! /\b(?:automotive|cars?|vehicles?|motors)\b/i.test(target.topic||''))return true;
 const requested=target.itemTitle||target.sectionTopic||'',observed=candidateImageText(record);
 const special=/\b(?:military|police|ambulance|fire engine)\b/i;
 if(special.test(observed)&&!special.test([target.query,target.topic,requested].join(' ')))return false;
 if(['products','projects'].includes(target.sectionType)&&/\b(?:hood ornaments?|emblems?|badges?|logos?|showrooms?|dealerships?|museums?|dashboard|cockpit|headlights?|headlamps?|interiors?|wheels?)\b/i.test(observed)&&! /\b(?:interior|cockpit|dashboard|headlights?|wheels?)\b/i.test(requested))return false;
 if(target.sectionType!=='gallery')return true;
 const details=[/\b(?:cockpit|dashboard|instrument cluster)\b/i,/\b(?:interiors?|upholstery|leather|tailoring)\b/i,/\b(?:headlights?|headlamps?|lighting|running lights?)\b/i,/\b(?:wheels?|rims?)\b/i,/\b(?:engine|powertrain)\b/i,/\b(?:carbon fiber|carbon fibre)\b/i];
 return details.filter(pattern=>pattern.test(requested)).every(pattern=>pattern.test(observed));
}
