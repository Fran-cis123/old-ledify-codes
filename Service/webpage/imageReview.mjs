import {evaluateImageRelevance,imageTopicDomains} from '../visual/imageRelevance.mjs';
const concepts={
    space:/\b(?:spacecraft|astronauts?|rockets?|lunar|martian|mars|orbital|planetary|deep[ -]space)\b/i,
    literary:/\b(?:reading|literary|books?|library|stories|storytelling|chapters)\b/i,
    community:/\b(?:community|gathering|gatherings|conversation|conversations|shared experiences)\b/i,
    scientific:/\b(?:pharma\w*|laborator\w*|biotech\w*|scientific|pipett\w*|research|clinical|manufactur\w*)\b/i,
    food:/\b(?:food|salad|dish|dining|restaurant|kitchen|ingredients|meal)\b/i,
    architecture:/\b(?:interior|interiors|property|residential|architecture|house|home)\b/i,
    legal:/\b(?:legal|law|courthouse|justice|attorney)\b/i,
    education:/\b(?:school|education|learning|classroom|library|curriculum)\b/i,
    fashion:/\b(?:fashion|garment|clothing|textile|apparel|linen|wardrobe)\b/i,
    travel:/\b(?:travel|destination|coast|mountain|landscape|tourism)\b/i,
    software:/\b(?:software|digital|workflow|dashboard|SaaS)\b/i
};
const groups=text=>concepts.space.test(text)?['space']:Object.entries(concepts).filter(([,pattern])=>pattern.test(text)).map(([name])=>name);
export function centralImageSubject(page){
    const central=[page.inferredContext?.topic,page.websiteBrief?.project.purpose,page.title,page.hero.headline].filter(Boolean).join('. ');
    let preferred=groups(central);
    const specific=imageTopicDomains([page.inferredContext?.topic,page.title].join(' '));
    if(specific.length)return {description:central,concepts:specific};
    const primary=groups([page.inferredContext?.topic,page.title].join(' '));
    if(page.pageType==='restaurant'||primary.includes('food')&&!primary.includes('literary'))preferred=['food'];
    else if(primary.includes('literary')||preferred.includes('community')&&!primary.includes('food'))preferred=preferred.filter(name=>!['food','architecture'].includes(name));
    if(!preferred.length)preferred=groups([page.title,page.hero.subheadline,page.designBrief?.imageDirection].join(' '));
    return {description:central,concepts:preferred};
}
export function reviewImageCandidate(record,target,{width,height}={}){
    const provenance=Boolean(record.creator?.trim()&&record.license?.trim());
    const candidate=groups([record.subject,record.alt,...(record.keywords||[])].join(' '));
    const desired=target.centralConcepts?.length?target.centralConcepts:groups(target.query);
    const compatible=desired.some(name=>candidate.includes(name)||(name==='community'&&candidate.includes('literary')));
    const queryWords=[...new Set((target.query||'').toLowerCase().match(/[a-z]{5,}/g)||[])].filter(word=>!['illustrative','editorial','imagery','photography','photograph','website','concept','image'].includes(word));
    const candidateText=[record.subject,record.alt,...(record.keywords||[])].join(' ').toLowerCase();
    const shared=queryWords.filter(word=>new RegExp('\\b'+word+'\\b').test(candidateText)).length;
    const relevance=evaluateImageRelevance(record,target);
    const semanticScore=relevance.desiredDomains.length?(relevance.accepted?1:0):desired.length?(compatible&&!['SECTION_MISMATCH','EXCLUDED_SUBJECT'].includes(relevance.reason)?1:0):shared>=2&&shared/Math.max(queryWords.length,1)>=.45&&relevance.accepted?1:0;
    const minimum=target.role==='hero'?800:400;
    const resolutionScore=width&&height?Math.min(1,Math.min(width,height*1.6)/minimum):1;
    const aspect=width&&height?width/height:1.5;
    const placementSuitability=aspect>=.6&&aspect<=3.2;
    return {accepted:provenance&&semanticScore>=.8&&resolutionScore>=.75&&placementSuitability,semanticScore,resolutionScore,placementSuitability,provenance,reason:semanticScore>=.8?'METADATA_MATCH':relevance.reason,method:'metadata-and-dimensions',limits:'No independent computer-vision or subjective aesthetic certification.'};
}
