// General visual/style words are not evidence of a concrete subject. This
// vocabulary contains no industry/brand routing or fallback image choices.
const generic=new Set(('the and for with from this that into over under about where which their your our its image images photo photos photograph photography photographic illustration illustrative editorial concept beautiful breathtaking stunning premium luxury luxurious modern sophisticated professional dramatic cinematic elegant elegant sophisticated design designs collection collections portfolio showcase showroom style world exceptional extraordinary quality high fully responsive website section slide cover hero background foreground view angle scene content context subject natural light lighting subtle spacious experience unique relevant interior interiors exterior exteriors architecture architectural public domain source review evaluate evidence explanation').split(/\s+/));
const stem=word=>word.length<5?word:word.replace(/ies$/,'y').replace(/(?:ing|ed|es|s)$/,'');
export function subjectTerms(value=''){
 return [...new Set((String(value).normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().match(/[\p{L}]{3,}/gu)||[]).filter(word=>!generic.has(word)).map(stem))];
}
const matches=(a,b)=>a===b||a.length>=6&&b.length>=6&&(a.startsWith(b)||b.startsWith(a)||a.slice(0,6)===b.slice(0,6));
export function metadataSubjectEvidence(metadata,target={}){
 const actual=subjectTerms(metadata),topic=subjectTerms(target.topic||target.subject||''),local=subjectTerms(target.sectionTopic||target.slideTitle||''),query=subjectTerms(target.query||target.searchQuery||'');
 const overlap=terms=>terms.filter(term=>actual.some(word=>matches(term,word)));
 const topicHits=overlap(topic),localHits=overlap(local),queryHits=overlap(query);
 const contextualHits=overlap(subjectTerms(target.subjectContext||''));
 const focus=query.filter(term=>!topic.some(word=>matches(term,word)));
 const focused=!local.length&&!focus.length||localHits.length>0||overlap(focus).length>0||!focus.length||!local.length&&contextualHits.length>0;
 return {topicTerms:topic.length,topicHits:topicHits.length,localHits:localHits.length,queryHits:queryHits.length,
  // A branded title need not appear in stock metadata. Independent local
  // scene/context evidence can establish relevance; style words cannot.
  supported:focused&&new Set([...topicHits,...localHits,...queryHits,...contextualHits]).size>=1};
}
