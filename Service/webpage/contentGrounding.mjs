import {webpageError} from './errors.mjs';

// Design requests and lists of things NOT supplied are not evidence that a
// business owns facilities, holds approvals or offers particular products.
export function factualSource(source){
    return source.split(/(?<=[.!?])\s+|\n/).filter(sentence=>!/(?:\b(?:do not|don't|never)\s+(?:invent|fabricate|claim)|\bno\b.*\b(?:supplied|provided)|\b(?:not|aren't|isn't)\s+(?:supplied|provided)|\b(?:imagery|photograph|image|design direction|palette|typography)\b)/i.test(sentence)).join(' ').toLowerCase();
}
const qualified=text=>/\b(?:proposed|concept|could|would|suggested|illustrative|not supplied|not provided|not been (?:supplied|provided)|not available|unavailable|no .{0,60}(?:supplied|provided|represented)|does not|do not|cannot|not (?:a|an|actual)|no claim|add verified|add confirmed)\b/i.test(text);
const claims=[
    /\binfrastructure\b/i,/\bclean[ -]?rooms?\b/i,/\bsteril(?:e|ity)\b/i,/\binjectable\w*\b/i,/\btableting\b/i,/\bencapsulation\b/i,/\bsynthesis\b/i,
    /\bfacilit(?:y|ies)\b/i,/\bcertif\w*\b/i,/\baccredit\w*\b/i,/\bregulatory\b/i,/\bapproved\b/i,/\bcompliance\b/i,/\bGMP\b/i,/\bISO\b/i,/\bFDA\b/i,/\bNAFDAC\b/i,
    /\bin[ -]house\b/i,/\b(?:every|each) batch\b/i,/\bclinical (?:trials?|outcomes?)\b/i,/\bpatent\w*\b/i,/\bstandard operating procedures\b/i,/\b(?:comprehensive|continuous|strictly monitored)\b/i,
    /\b(?:will be|pending|once published|formal corporate registration)\b/i
];

export function isInformationalWebsite(pageType,source=''){
    const organization='(?:company|business|school|university|academy|institution|organization|organisation|nonprofit|store)';
    // "Do not invent a company" and "rather than verified business
    // achievements" are instructions, not evidence of a corporate website.
    const negative=new RegExp(`\\b(?:do not|don't|never|avoid|without|rather than)\\b[^.!?\\n]{0,120}\\b${organization}\\b`,'i');
    const affirmative=source.split(/(?<=[.!?])\s+|\n/).filter(sentence=>!negative.test(sentence)).join(' ');
    return pageType==='informational'||pageType==='education'&&!new RegExp(`\\b${organization}\\b`,'i').test(affirmative);
}
export function validateWebsiteClaims(page,source,{scope,identity=page.brandName,pageType=page.pageType}={}){
    if(!source)return;
    identity ||= source.match(/\b(?:called|named|for)\s+([A-Z][A-Za-z0-9&-]*)\b/)?.[1]||source.match(/^([A-Z][A-Za-z0-9&-]*)\s+is\b/)?.[1];
    const evidence=factualSource(source);
    const failures=[];
    const attempt=fn=>{try{fn();}catch(error){if(error.code!=='WEBPAGE_VALIDATION_FAILED')throw error;failures.push(error);}};
    // An editorial/science topic is not an organization claiming that it owns
    // infrastructure, facilities or patents. Keep credential/guarantee checks,
    // but do not treat ordinary subject vocabulary as a corporate assertion.
    const informational=isInformationalWebsite(pageType,source);
    const attribution=value=>/\b(?:we|our|this company|the company|our organization)\b/i.test(value)||Boolean(identity&&value.toLowerCase().includes(identity.toLowerCase()));
    const explanatory=value=>!attribution(value)&&/^(?:in (?:the |a )?[\w -]+,|(?:generally|typically|for example|in general|as a discipline)[,: ]|(?:pharmaceutical |quality |research |scientific |therapeutic |manufacturing |laboratory |clinical |regulatory |sterile |analytical |compliance |documentation |formulation |testing |patient |healthcare |certification )[\w ,()-]*\b(?:involves?|refers? to|means?|requires?|examines?|evaluates?|describes?|helps?|can |is |are |focuses?|supports?|includes?|covers?|connects?)\b)/i.test(value);
    const check=(value,field,{topic=false}={})=>{
        if(typeof value!=='string')return;
        // A neutral topic label does not assert that a credential is held or
        // that a facility exists. Assertions such as "FDA approved" still fail.
        if(/\.(?:heading|title)$/.test(field)&&/^(?:quality\s*(?:and|&)\s*compliance|quality|compliance|certifications?|facilities|regulatory information)(?: overview| information)?$/i.test(value.trim()))return;
        for(const sentence of value.split(/(?<=[.!?])\s+/)){
            if(qualified(sentence))continue;
            if(informational&&!/\b(?:certified|approved|accredited|guarantee\w*|owns?|equipped)\b/i.test(sentence)&&!/\b(?:our (?:company|organization|facilities)|we (?:own|operate|manufacture|offer|provide))\b/i.test(sentence))continue;
            if(explanatory(sentence))continue;
            if(topic&&!/\b(?:certified|approved|accredited|leading|our|we|operates?|owns?|equipped|guaranteed)\b/i.test(sentence))continue;
            if(scope==='general-explanatory'&&attribution(sentence)&&/\b(?:operates?|owns?|offers?|provides?|manufactures?|holds?|equipped|certified|approved)\b/i.test(sentence))throw webpageError('Do not attribute unsupplied operations or credentials to the organization. Explain the general subject without claiming that this company performs it.',field);
            if(scope==='general-explanatory'&&!attribution(sentence)&&!/^\s*(?:dedicated facilities|the facility|the laboratory|equipped with|state-of-the-art)/i.test(sentence)&&!(/\.(?:heading|title)$/.test(field)&&/\b(?:certified|approved|accredited)\b/i.test(sentence))){
                if(/\b(?:guarantee\w*|ensure\w*)\b.{0,60}\b(?:purity|safety|efficacy|clinical outcomes?)\b/i.test(sentence))throw webpageError('Avoid absolute medical, purity or safety assurances. Explain the general method and its limitations without guaranteeing an outcome.',field);
                continue;
            }
            for(const pattern of claims){const match=sentence.match(pattern);if(match&&!pattern.test(evidence))throw webpageError(`Unsupported business claim (${match[0]}). Remove this claim or state clearly that the information has not been supplied; industry and photo directions are not evidence.`,field);}
            if(/committed to (?:delivering )?excellence|innovative solutions|world[ -]class|industry[ -]leading/i.test(sentence)&&!evidence.includes(sentence.toLowerCase()))throw webpageError('Replace generic or unsupported promotional claims with specific supplied information',field);
        }
    };
    if(page.hero)for(const [field,value]of Object.entries(page.hero))attempt(()=>check(value,'hero.'+field));
    for(const [index,section]of (page.sections||[]).entries()){
        const general=explanatory(section.content||'')||section.items?.some(item=>explanatory(item.description));
        attempt(()=>check(section.heading,`sections[${index}].heading`,{topic:general}));attempt(()=>check(section.content,`sections[${index}].content`));
        const illustrativeSection=/\b(?:illustrative|fictional|hypothetical|concept(?:ual)?)\b/i.test(section.content||'');
        for(const [itemIndex,item]of (section.items||[]).entries()){
            const field=`sections[${index}].items[${itemIndex}]`;
            for(const key of ['title','description','detail'])attempt(()=>check(item[key],field+'.'+key,{topic:key==='title'&&explanatory(item.description||'')}));
            if(!informational&&['services','products','projects'].includes(section.type)&&!illustrativeSection&&!explanatory(item.description||'')&&!qualified(item.title+' '+item.description)){
                const tokens=(item.title.toLowerCase().match(/[a-z]{4,}/g)||[]).filter(word=>!['professional','services','service','product','products','information','overview','approach'].includes(word));
                if(tokens.length&&!tokens.some(word=>evidence.includes(word)))failures.push(webpageError('Do not invent named services, products or projects. Use supplied offerings or clearly label the collection or item as illustrative examples.',field));
            }
        }
    }
    if(page.callToAction)for(const [field,value]of Object.entries(page.callToAction))attempt(()=>check(value,'callToAction.'+field));
    if(failures.length)throw Object.assign(failures[0],{validationErrors:failures.slice(0,16).map(error=>({field:error.field,repairHint:error.repairHint,validationRule:error.validationRule}))});
}
