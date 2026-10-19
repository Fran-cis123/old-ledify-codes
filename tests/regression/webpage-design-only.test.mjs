import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {fixturePlan,fixtures} from '../webpage/fixtures.mjs';
import {needsFactualSkeleton} from '../../Service/webpage/sparseContent.mjs';
import {generateWebpageContent} from '../../Service/ai/webpageGeneration.mjs';
import {validateWebpageContent} from '../../Service/webpageContentValidator.mjs';
import {webpageLayoutService} from '../../Service/webpageLayoutService.mjs';
import {validateWebsiteClaims} from '../../Service/webpage/contentGrounding.mjs';
import {specifyWebsiteContent,internalCopy} from '../../Service/webpage/contentSpecification.mjs';
import {generalWebsiteDraft} from '../fixtures/generalWebsiteDraft.mjs';
const request=JSON.parse(await fs.readFile(new URL('../fixtures/pharmaxDesignRequest.json',import.meta.url),'utf8'));
test('the exact long Pharmax design request does not masquerade as verified business facts',async()=>{
    assert.ok(request.textPrompt.split(/\s+/).length>120);assert.equal(needsFactualSkeleton(request.textPrompt),true);
    const plan=fixturePlan(fixtures.pharmaceutical);
    plan.sections=[['about','About Pharmax'],['services','Manufacturing Capabilities'],['topics','Research and Innovation'],['topics','Therapeutic Focus Areas'],['about','Quality and Compliance'],['contact','Partnership Inquiries']].map(([type,heading])=>({type,heading,navLabel:heading.slice(0,30),purpose:'Present this requested topic without inventing facts',composition:'editorial'}));
    let calls=0;
    const scoped=specifyWebsiteContent(plan,request.textPrompt);
    const content=await generateWebpageContent({client:{models:{generateContent:async()=>({text:JSON.stringify(calls++===0?plan:generalWebsiteDraft(scoped.plan)),candidates:[{finishReason:'STOP'}]})}},inputType:'prompt',input:request.textPrompt,options:{logger:()=>{}}});
    assert.equal(calls,2);assert.deepEqual(content.sections.map(s=>s.heading),plan.sections.filter(s=>s.type!=='contact').map(s=>s.heading));assert.equal(content.hero.actionLabel,'Explore Our Capabilities');
    assert.equal(content.quality.status,'requires_fact_review');validateWebpageContent(content,{source:request.textPrompt});
    const page=webpageLayoutService(content);assert.equal(page.heroTarget,'#section-2');
    assert.ok(!internalCopy.test(JSON.stringify(content.sections)));assert.ok(content.contentSpecification.missingInformation.some(entry=>entry.field==='contact'));
});
test('topic labels are allowed while unsupported certification and facility assertions remain rejected',()=>{
    const page={sections:[{heading:'Quality and Compliance',content:'Quality management involves documented controls and consistent review.',items:[]}]};
    assert.doesNotThrow(()=>validateWebsiteClaims(page,request.textPrompt));
    for(const heading of ['FDA approved','GMP certified','Our sterile injectable facilities'])assert.throws(()=>validateWebsiteClaims({sections:[{heading,content:'',items:[]}]},'Pharmax is a pharmaceutical company.'),/Unsupported business claim/);
});
test('actual supplied services and long extracted material still use source-grounded content generation',()=>{
    assert.equal(needsFactualSkeleton(request.textPrompt+' Services: laboratory analysis, research communication.'),false);
    assert.equal(needsFactualSkeleton('The organization offers laboratory analysis and research communication. '.repeat(40)),false);
    assert.equal(needsFactualSkeleton(request.textPrompt,{websiteBrief:{organizationDescription:'Pharmax provides formulation research.'}}),false);
});
