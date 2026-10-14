// Recorded editorial corrections to sample content; no domain-specific engine rules.
import fs from 'node:fs/promises';
import { wordCount,sectionText } from '../Service/document/documentValidation.mjs';
const file='generated/document-samples/academic/content.json';
const document=JSON.parse(await fs.readFile(file,'utf8'));
for(const section of document.sections)for(const block of section.blocks)if(block.type==='paragraph')block.text=block.text.replace('guarantees circulatory stability','supports circulatory stability under healthy physiological conditions');
document.length.actualWords=wordCount(document.sections.map(sectionText).join('\n'));
document.quality.editorialCorrections=['Qualified the unsupported circulatory stability guarantee.'];
await fs.writeFile(file,JSON.stringify(document,null,2));

const technicalFile='generated/document-samples/technical/content.json';
try {
    const technical=JSON.parse(await fs.readFile(technicalFile,'utf8'));
    technical.references=[
        {id:'http-semantics',title:'RFC 9110 HTTP Semantics',url:'https://www.rfc-editor.org/rfc/rfc9110.html',provenance:'engineering-verified'},
        {id:'problem-details',title:'RFC 9457 Problem Details for HTTP APIs',url:'https://www.rfc-editor.org/rfc/rfc9457.html',provenance:'engineering-verified'},
        {id:'patch-method',title:'RFC 5789 PATCH Method for HTTP',url:'https://www.rfc-editor.org/rfc/rfc5789.html',provenance:'engineering-verified'},
        {id:'rest-architecture',title:'Fielding dissertation Chapter 5 Representational State Transfer',url:'https://ics.uci.edu/~fielding/pubs/dissertation/rest_arch_style.htm',provenance:'engineering-verified'}
    ];
    for(const section of technical.sections)for(const block of section.blocks) {
        if(block.type==='paragraph'&&block.text.startsWith('If an origin server cannot produce')) {
            block.text='When available representations do not match the Accept preferences, a server may return 406 Not Acceptable or disregard those preferences and send an available representation. APIs should document their negotiation policy. Unsupported request content can be rejected with 415 Unsupported Media Type.';block.referenceIds=['http-semantics'];
        }
        if(block.type==='paragraph'&&block.text.startsWith('Production REST services require')) {
            block.text='A production API should protect data in transit, authorize each operation, and document compatibility rules. REST statelessness requires each request to carry the context needed to process it; it does not mandate JWTs or prohibit server-side credential validation. Authentication can use opaque tokens, signed tokens, or another suitable scheme. Versioning and clear change policies help clients adapt to evolving representations.';block.referenceIds=['rest-architecture'];
        }
        if(block.type==='paragraph'&&block.text.includes('RFC 7807')) {block.text=block.text.replace('RFC 7807 specifies','RFC 9457, which supersedes RFC 7807, specifies');block.referenceIds=['problem-details'];}
        if(block.type==='table'&&block.columns.includes('HTTP Method'))for(const row of block.rows) {
            if(['POST','PATCH'].includes(row.cells[0]))row.cells[4]='Not guaranteed';
            if(row.cells[0]==='POST')row.cells[2]='Resource endpoint';
            block.referenceIds=['http-semantics','patch-method'];
        }
        if(block.type==='list')block.items=block.items.map(item=>item.startsWith('Implement rate limiting with standard header feedback')?'Document rate-limit behavior and any limit or retry headers used by the API.':item);
    }
    technical.length.actualWords=wordCount(technical.sections.map(sectionText).join('\n'));
    technical.quality.editorialCorrections=['Checked HTTP negotiation, PATCH semantics, stateless authentication and current Problem Details specification against primary sources.'];
    await fs.writeFile(technicalFile,JSON.stringify(technical,null,2));
} catch(error) {if(error.code!=='ENOENT')throw error;}

try {
    const energyFile='generated/document-samples/renewable/content.json';
    const energy=JSON.parse(await fs.readFile(energyFile,'utf8'));
    energy.references=[{id:'grid-protection',title:'Protection Grid Modernization NREL',url:'https://www.nrel.gov/grid/protection.html',provenance:'engineering-verified'}];
    for(const section of energy.sections)for(const block of section.blocks)if(block.type==='list')block.items=block.items.map(item=>item.startsWith('Synchronous Condensers:')?'Synchronous Condensers: Synchronous machines operated without a mechanical output load support grid voltage through controlled excitation and also provide rotational inertia and fault current. [1]':item);
    energy.length.actualWords=wordCount(energy.sections.map(sectionText).join('\n'));
    energy.quality.editorialCorrections=['Corrected synchronous condenser operation against the NREL grid protection reference.'];
    await fs.writeFile(energyFile,JSON.stringify(energy,null,2));
} catch(error) {if(error.code!=='ENOENT')throw error;}

try {
    const letterFile='generated/document-samples/letter/content.json';
    const letter=JSON.parse(await fs.readFile(letterFile,'utf8'));
    letter.sections[0].blocks=[
        {type:'paragraph',text:'[Your Address]\n[City and Postal Code]\n[Your Email Address] | [Your Phone Number]'},
        {type:'paragraph',text:'[Date]'},
        {type:'paragraph',text:'[Recipient Name or Department]\n[Organization Name]\n[Organization Address]'},
        {type:'paragraph',text:'Dear [Hiring Manager Name or Selection Committee],'},
        {type:'paragraph',text:'I am writing to apply for [Internship Title] at [Organization Name]. I am interested in an opportunity to learn through practical work and contribute to clearly defined tasks under the guidance of your team. [If relevant, state where you learned about this opening.]'}
    ];
    letter.sections[1].blocks=[
        {type:'paragraph',text:'My relevant preparation includes [Describe your verified education, training, or experience]. [Give one genuine example of a project or responsibility, explain what you did, and identify the skill it demonstrates. Include outcomes only when you can support them.] I would welcome the opportunity to discuss how this preparation relates to the requirements of the internship.'},
        {type:'paragraph',text:'I am interested in [Organization Name] because [Explain a specific reason supported by your knowledge of the organization]. I would value the chance to develop relevant professional skills, receive constructive feedback, and learn how your team approaches its work. I would approach agreed tasks with care and seek clarification when expectations or priorities need to be confirmed.'}
    ];
    letter.sections[2].blocks=[
        {type:'paragraph',text:'Thank you for considering my application. I would welcome a conversation about the position, the responsibilities involved, and the next steps in your selection process. [State your availability, if known.] You may contact me at [Your Phone Number] or [Your Email Address].'},
        {type:'paragraph',text:'Sincerely,'},{type:'paragraph',text:'[Your Full Name]'}
    ];
    letter.length.actualWords=wordCount(letter.sections.map(sectionText).join('\n'));
    letter.quality.editorialCorrections=['Replaced unverified applicant achievements with full editable fields; added contact, date and recipient blocks.'];
    await fs.writeFile(letterFile,JSON.stringify(letter,null,2));
} catch(error) {if(error.code!=='ENOENT')throw error;}

try {
    const businessFile='generated/document-samples/business/content.json';
    const business=JSON.parse(await fs.readFile(businessFile,'utf8'));
    for(const section of business.sections)for(const block of section.blocks)if(block.type==='table')for(const row of block.rows)row.cells=row.cells.map(cell=>cell.replace('comprehensive end-to-end encryption for data in transit and at rest','transport encryption and encryption of stored data'));
    business.length.actualWords=wordCount(business.sections.map(sectionText).join('\n'));
    business.quality.editorialCorrections=['Distinguished transport encryption from encryption of stored data.'];
    await fs.writeFile(businessFile,JSON.stringify(business,null,2));
} catch(error) {if(error.code!=='ENOENT')throw error;}
