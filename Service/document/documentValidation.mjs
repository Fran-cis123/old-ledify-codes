import { AiGenerationError, validateSchema } from '../ai/responseValidation.mjs';
import { sectionSchema } from './documentSchema.mjs';
export function documentFailure(message, field,validationRule='DOCUMENT_CONTENT_INVALID') { throw new AiGenerationError('AI_SCHEMA_VALIDATION_FAILED',message,{field,validationRule,repairHint:message.slice(0,300)}); }
export const wordCount = text => (String(text).match(/\S+/g)||[]).length;
export function blockText(block) { return [block.text,...(block.items||[]),...(block.columns||[]),...(block.rows||[]).flatMap(row=>row.cells),block.caption].filter(Boolean).join(' '); }
export const sectionText = section => section.blocks.map(blockText).join('\n');
const normalized = text => String(text).toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();
export function validateDocumentOutline(plan, policy, topics=[]) {
    if(!plan.title?.trim() || !plan.documentType?.trim() || !plan.sections?.length) documentFailure('A document needs a meaningful title, type and sections.','sections');
    if(plan.sections.length>40) documentFailure('A maximum of 40 sections is supported.','sections');
    const ids=new Set(),headings=new Set();
    for(const section of plan.sections) {
        if(!/^[a-zA-Z0-9_-]{1,60}$/.test(section.id)||ids.has(section.id)||!section.objective?.trim()||!section.heading?.trim()||headings.has(normalized(section.heading))) documentFailure('Outline sections need unique IDs, headings and meaningful objectives.','sections');
        ids.add(section.id);headings.add(normalized(section.heading));
        if(!Number.isInteger(section.targetWords)||section.targetWords<10||section.targetWords>1000)documentFailure('Each section needs a realistic targetWords budget from 10 to 1000.','sections');
    }
    for(const topic of topics) if(!plan.sections.some(section=>section.topics.some(item=>normalized(item)===normalized(topic)))) documentFailure(`Map requested topic "${topic}" to at least one outline section.`,'sections');
    if(policy.targetWords/plan.sections.length>1000) documentFailure('Split the outline into enough sections to keep section generation below 1000 words.','sections');
    const planned=plan.sections.reduce((sum,section)=>sum+section.targetWords,0);
    if(planned<policy.targetWords*.85||planned>policy.targetWords*1.15)documentFailure(`Section word budgets must add up to approximately ${policy.targetWords}.`,'sections');
    if(/letter|resume/i.test(plan.documentType)&&plan.coverPage) documentFailure('Letters and resumes must not have a separate cover page.','coverPage');
}
export function validateDocumentSection(section, expected, {references=[],assets=[],source='',targetWords=0,minRatio=.65,maxRatio=1.5,documentType=''}={}) {
    validateSchema(section,sectionSchema);
    if(section.id!==expected.id || section.heading!==expected.heading) documentFailure('Preserve the exact planned section ID and heading.','heading');
    if(!section.blocks.length || !sectionText(section).trim()) documentFailure('Every section needs substantive content.','blocks');
    const seen=new Set();
    for(const [i,block] of section.blocks.entries()) {
        const field=`blocks[${i}]`;
        const allowed={paragraph:['text','referenceIds'],heading:['text','level'],list:['ordered','items','referenceIds'],table:['columns','rows','caption','referenceIds'],code:['text'],quote:['text','referenceIds'],image:['assetId','caption','referenceIds'],caption:['text'],pageBreak:[],sectionBreak:['orientation']}[block.type];
        const invalidFields=Object.keys(block).filter(key=>key!=='type'&&!allowed.includes(key));
        if(invalidFields.length) documentFailure(`${block.type} blocks support only ${allowed.join(', ')}. Move content in ${invalidFields.join(', ')} into separate appropriate blocks; preserve substantive text.`,field);
        if(['paragraph','heading','code','quote','caption'].includes(block.type)&&!block.text?.trim()) documentFailure('Text blocks must not be empty.',field);
        if(block.type==='heading'&&(![2,3].includes(block.level)||block.text.length>160)) documentFailure('Subheadings require level 2 or 3 and concise text.',field);
        if(block.type==='list'&&(!block.items?.length||block.items.some(item=>!item.trim()))) documentFailure('Lists need nonempty items.',field);
        if(block.type==='table'&&(!block.columns?.length||block.columns.length<2||!block.rows?.length||block.columns.some(cell=>!cell.trim())||block.rows.some(row=>row.cells.length!==block.columns.length||row.cells.some(cell=>!cell.trim())))) documentFailure('Tables need 2 to 8 columns and complete rectangular rows.',field);
        if(block.type==='image'&&!assets.some(asset=>asset.id===block.assetId)) documentFailure('Image asset must match an explicitly supplied authorized asset ID.',field,'UNKNOWN_IMAGE_ASSET');
        if(block.type==='sectionBreak'&&!block.orientation) documentFailure('Section breaks require orientation.',field);
        for(const id of block.referenceIds||[]) if(!references.some(ref=>ref.id===id)) documentFailure('Cite only reference IDs supplied by the user.',field);
        if(block.type==='quote'&&!source.includes(block.text)) documentFailure('Direct quotations must match supplied source text exactly.',field,'UNSUPPORTED_QUOTATION');
        if(block.type==='paragraph'&&/\b(?:lorem ipsum|insert (?:content|paragraph)|as an ai)\b/i.test(block.text)) documentFailure('Replace filler with complete meaningful content.',field);
        if(block.type==='paragraph'&&/\bguarantees? (?:success|safety|security|circulatory stability)\b|\bzero (?:risk|downtime)\b/i.test(block.text)&&!source.includes(block.text))documentFailure('Remove unsupported guarantees. State intended benefits with appropriate conditions and limitations.',field);
        if(/letter|resume/i.test(documentType)&&!/\b(?:education|qualifications|skills|experience|I am|I have|university|college|degree)\b/i.test(source)&&block.text) {
            const unfilled=block.text.replace(/\[[^\]]*\]/g,'');
            const claim=unfilled.match(/\b(?:academic training|academic preparation|rigorous academic|proven capabilities|possess practical familiarity|comprehensive understanding|have developed (?:advanced|extensive|expert|professional|research|technical|functional)|have established|leadership and ongoing work|enclosed|attached (?:resume|CV))\b/i);
            if(claim)documentFailure(`No applicant facts support "${claim[0]}". Use a full editable placeholder for that claim, or write neutral future intent without asserting prior achievements.`,field);
        }
        if(['paragraph','quote','caption'].includes(block.type))for(const url of block.text.match(/https?:\/\/[^\s<>]+/g)||[])if(!source.includes(url)&&!references.some(ref=>url.replace(/[).,;]+$/,'')===ref.url))documentFailure('Do not invent source URLs; use only supplied source references.',field);
        const text=normalized(blockText(block));
        if(text.length>80&&seen.has(text)) documentFailure('Repeated content must be replaced with distinct explanations.',field,'DUPLICATE_BLOCK');
        if(text.length>80)seen.add(text);
    }
    const words=wordCount(sectionText(section));
    if(targetWords && (words<targetWords*minRatio || words>targetWords*maxRatio)) documentFailure(`This section needs approximately ${targetWords} words; currently ${words}. Develop distinct content without filler or truncation.`,'blocks','SECTION_WORD_BUDGET');
}
export function validateDocumentContent(document) {
    if(!document.title?.trim()||!document.sections?.length) documentFailure('Document title and sections are required.','title');
    const seen=new Set(),headings=new Set();
    for(const section of document.sections) {
        if(headings.has(normalized(section.heading))) documentFailure('Duplicate document headings.','sections');headings.add(normalized(section.heading));
        validateDocumentSection(section,section,{references:document.references,assets:document.assets,source:document.sourceText,documentType:document.documentType});
        for(const block of section.blocks) {const text=normalized(blockText(block));if(text.length>120&&seen.has(text)) documentFailure('Repeated paragraphs across sections.','sections');if(text.length>120)seen.add(text);}
    }
    return true;
}
