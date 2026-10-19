import test from 'node:test';
import assert from 'node:assert/strict';
import {generateJsonWithRetry} from '../../Service/ai/generateJsonWithRetry.mjs';
import {AiGenerationError,validateSchema} from '../../Service/ai/responseValidation.mjs';
import {validateWebsiteClaims} from '../../Service/webpage/contentGrounding.mjs';
import {webpageContentSchema} from '../../templates/webpage/webpageSchema.mjs';
import {generateWebpageContent} from '../../Service/ai/webpageGeneration.mjs';
import {specifyWebsiteContent} from '../../Service/webpage/contentSpecification.mjs';
import {centralImageSubject,reviewImageCandidate} from '../../Service/webpage/imageReview.mjs';
import {fixtures,fixturePlan,fixtureDraft} from '../webpage/fixtures.mjs';

const response=value=>({text:JSON.stringify(value),candidates:[{finishReason:'STOP'}]});
for(const outputType of ['webpage','document','presentation'])test(`${outputType} retries keep earlier repair requirements and the last complete draft`,async()=>{
    const calls=[],logs=[];
    const sequence=[{title:'First draft',body:'Private draft A'},{title:'Repaired title',body:'Private draft B'},{title:'Final title',body:'Complete body'}];
    const schema={type:'object',properties:{title:{type:'string'},body:{type:'string'}},required:['title','body'],additionalProperties:false};
    const result=await generateJsonWithRetry({outputType,stage:`${outputType}-content`,schema,request:{model:'fixture',contents:'Original source'},client:{models:{generateContent:async request=>{calls.push(request);return response(sequence[calls.length-1]);}}},sleep:async()=>{},logger:entry=>logs.push(entry),validate:value=>{
        if(value.title==='First draft')throw Object.assign(new Error('Use a substantive title'),{field:'title',validationRule:'DISTINCT_TITLE'});
        if(value.body==='Private draft B')throw new AiGenerationError('AI_SCHEMA_VALIDATION_FAILED','Complete the body',{field:'body',repairHint:'Explain the mechanism',validationRule:'MECHANISM_REQUIRED'});
    }});
    assert.equal(result.body,'Complete body');assert.equal(calls.length,3);
    assert.match(calls[2].contents,/Use a substantive title/);assert.match(calls[2].contents,/Explain the mechanism/);assert.match(calls[2].contents,/Private draft B/);
    assert.equal(logs[0].validationRule,'DISTINCT_TITLE');assert.ok(!JSON.stringify(logs).includes('Private draft'));
});
test('informational science copy accepts infrastructure, synthesis and future concepts without being treated as a business',()=>{
    const page={hero:{subheadline:'Explore how we could build the infrastructure for deep-space travel.'},sections:[{type:'gallery',heading:'Future mission concepts',content:'Infrastructure supports scientific exploration. Propellant synthesis is a subject of research.',items:[{title:'Lunar habitats',description:'Surface facilities support scientific investigations.',detail:''},{title:'Deep-space propulsion',description:'Propulsion concepts will be explored through research.',detail:''}]}]};
    for(const pageType of ['informational','education'])assert.doesNotThrow(()=>validateWebsiteClaims(page,'Create a science website about space exploration.',{pageType}));
    for(const content of ['We operate GMP certified laboratories.','Our company owns approved facilities.'])assert.throws(()=>validateWebsiteClaims({sections:[{type:'about',heading:'Overview',content,items:[]}]},'Create a science website.',{pageType:'informational'}));
    assert.throws(()=>validateWebsiteClaims({hero:{subheadline:'Pharmax owns sterile infrastructure.'}},'Create a pharmaceutical company website for Pharmax.',{pageType:'business'}));
});
test('provider website field bounds match local readability validation and give precise repair budgets',()=>{
    const schema=webpageContentSchema({sections:[{},{}]});
    assert.equal(schema.properties.hero.properties.subheadline.maxLength,320);
    assert.equal(schema.properties.sections.items.properties.content.maxLength,1400);
    assert.equal(schema.properties.sections.items.properties.items.items.properties.description.maxLength,420);
    assert.throws(()=>validateSchema({text:'x'.repeat(11)},{type:'object',properties:{text:{type:'string',maxLength:10}}}),error=>error.field==='$.text'&&error.maxCharacters===10);
    assert.throws(()=>validateSchema({text:''},{type:'object',properties:{text:{type:'string',minLength:1}}}));
});
test('science plans normalize business-only section types before requesting content instead of demanding unavailable source quotations',()=>{
    const plan=fixturePlan(fixtures.pharmaceutical);plan.pageType='informational';
    plan.sections[0].type='case-studies';plan.sections[1].type='team';
    const {plan:normalized}=specifyWebsiteContent(plan,'Create an informational science website about lunar missions and astronauts.');
    assert.equal(normalized.sections[0].type,'topics');assert.equal(normalized.sections[1].type,'topics');
    assert.equal(normalized.sections[0].heading,plan.sections[0].heading);
    assert.equal(plan.sections[0].type,'case-studies');
});
test('space habitats and research require space imagery rather than unrelated architecture or laboratory photographs',()=>{
    const page={title:'Beyond Earth',pageType:'informational',inferredContext:{topic:'The technological architecture of orbital habitats and planetary research'},hero:{headline:'Future space exploration'}};
    assert.deepEqual(centralImageSubject(page).concepts,['space']);
    const target={query:'Orbital Habitat Module. Architecture for international research crews.',role:'item'};
    assert.equal(reviewImageCandidate({subject:'laboratory research',alt:'A scientist pipetting samples',creator:'CDC',license:'Public domain'},target,{width:1280,height:864}).accepted,false);
    assert.equal(reviewImageCandidate({subject:'orbital spacecraft',alt:'An orbital habitat module',creator:'NASA',license:'Public domain'},target,{width:1280,height:864}).accepted,true);
});
test('real website generator accepts explanatory science copy at first attempt, with factual business checks retained',async()=>{
    const plan=fixturePlan(fixtures.pharmaceutical);plan.pageType='informational';plan.title='Beyond Earth';plan.brandName='Beyond Earth';
    const draft=fixtureDraft(fixtures.pharmaceutical);draft.hero.subheadline='Infrastructure and propellant synthesis are important subjects in space exploration.';
    draft.contact={email:'',phone:'',address:''};
    const calls=[];
    const page=await generateWebpageContent({client:{models:{generateContent:async request=>{calls.push(request);return response(calls.length===1?plan:draft);}}},inputType:'prompt',input:'Create an informational science website about space exploration.',options:{logger:()=>{},sleep:async()=>{},onPlan:approved=>{draft.sections.forEach((section,i)=>{section.type=approved.sections[i].type;});}}});
    assert.equal(calls.length,2);assert.equal(page.hero.subheadline,draft.hero.subheadline);
});
