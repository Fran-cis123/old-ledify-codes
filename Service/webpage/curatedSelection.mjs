import {reviewImageCandidate} from './imageReview.mjs';
import {candidateImageText} from '../visual/imageRelevance.mjs';

// Broad categories are useful for admission; concrete subjects decide ranking.
// Do not fill a coffee, pizza or named-destination placement with a different
// member of the same broad category merely because it comes first in the file.
const subjects=[
 /\bpizza\b/i,/\b(?:coffee|espresso|cappuccino|latte)\b/i,/\b(?:bread|sourdough|bakery)\b/i,
 /\b(?:cake|dessert|pastry|buns)\b/i,/\b(?:rice|risotto)\b/i,/\b(?:seafood|fish|shrimp)\b/i,
 /\bsoup\b/i,/\b(?:fruit|citrus|orange|pomegranate)\b/i,
 /\b(?:MRI|magnetic resonance)\b/i,/\b(?:servers?|data cent(?:er|re)s?)\b/i,
 /\bsolar\b/i,/\bwind (?:farm|power|energy|turbines?)\b/i,
 /\b(?:sea turtle|hawksbill)\b/i,/\b(?:piano|cello|guitar)\b/i,/\b(?:clothing|wardrobe|apparel)\b/i
];
const places=[/\b(?:Maldives|Santorini|Bali|Kyoto|Iceland|Norway|Norwegian|Nepal|Himalayas|Lofoten|Gullfoss|Switzerland|Swiss|Japan|Lagos|Abuja|Nigeria|Kenya|Mombasa|London|Sandton|Kuala Lumpur|Mexico|Egypt|Austria)\b/gi];
const exactSubjects=[
 /\bjollof\b/i,/\bpiano\b/i,/\bcello\b/i,/\bguitar\b/i,
 /\b(?:sushi|sashimi)\b/i,/\b(?:salad|salads)\b/i,/\b(?:burger|hamburger)\b/i,
 /\b(?:lunar|moon)\b/i,/\b(?:Mars|martian)\b/i,/\b(?:rocket|launch)\b/i,
 /\bsharks?\b/i,/\bwhales?\b/i,/\bdolphins?\b/i,
 /\b(?:CT scanner|computed tomography)\b/i
];
const stop=new Set(['photograph','photography','image','images','illustrative','editorial','premium','professional','beautiful','stunning','modern','website','hero','section','with','from','that','this','lighting','natural','concept','wide','view','style','high','quality','include','showing']);
const words=text=>[...new Set(String(text).toLowerCase().match(/[\p{L}]{4,}/gu)||[])].filter(w=>!stop.has(w));
const normal=text=>String(text).toLowerCase().replace(/norwegian/g,'norway').replace(/swiss/g,'switzerland');
export function rankCuratedPhotos(entries,target,{onRejected=()=>{}}={}){
 const local=target.sectionTopic||target.itemTitle||'';
 const query=[target.topic,local,target.query].filter(Boolean).join(' ');
 const focus=local||target.query||target.topic||'';
 const concrete=subjects.filter(pattern=>pattern.test(focus));
 const exact=exactSubjects.filter(pattern=>pattern.test(focus));
 const requestedPlaces=[...query.matchAll(places[0])].map(match=>normal(match[0]));
 const terms=words(focus);
 return entries.map(entry=>{
  const review=reviewImageCandidate(entry,target,{width:entry.width,height:entry.height});
  const text=candidateImageText(entry),lower=normal(text);
  const matches=concrete.filter(pattern=>pattern.test(text)).length;
  if(review.accepted&&concrete.length&&!matches)Object.assign(review,{accepted:false,reason:'SPECIFIC_SUBJECT_MISMATCH'});
  if(review.accepted&&exact.length&&!exact.some(pattern=>pattern.test(text)))Object.assign(review,{accepted:false,reason:'SPECIFIC_SUBJECT_MISMATCH'});
  if(review.accepted&&requestedPlaces.length&&!requestedPlaces.some(place=>lower.includes(place)))Object.assign(review,{accepted:false,reason:'LOCATION_MISMATCH'});
  if(!review.accepted)onRejected(entry,review);
  const overlap=terms.filter(term=>lower.includes(term)).length;
  return {entry,review,score:matches*10+overlap*3+Number(entry.quality==='reviewed')};
 }).filter(v=>v.review.accepted).sort((a,b)=>b.score-a.score||a.entry.file.localeCompare(b.entry.file));
}
