import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {evaluateImageRelevance,relevanceDiagnostic,imageContextExclusions,imageTopicDomains} from '../../Service/visual/imageRelevance.mjs';
import {centralImageSubject,reviewImageCandidate} from '../../Service/webpage/imageReview.mjs';
import {commonsSearch,configuredImageProviders} from '../../Service/visual/imageProviders.mjs';
import {planWebsiteImages} from '../../Service/webpage/imageStrategy.mjs';
import {acquireWebsiteImages} from '../../Service/webpage/imagePipeline.mjs';
import {fixtures,fixturePlan,fixtureDraft} from '../webpage/fixtures.mjs';
import {webpageLayoutService} from '../../Service/webpageLayoutService.mjs';
import {webpageThemeService} from '../../Service/webpageThemeService.mjs';

const rights={creator:'Fixture author',license:'CC0',source:'Wikimedia Commons',mediaKind:'photograph'};
const lab={...rights,subject:'laboratory research',alt:'A CDC scientist pipetting samples in a laboratory'};
for(const [topic,section,good,bad] of [
 ['Artificial intelligence','Robotics','Computer-controlled industrial robot arm','A scientist pipetting samples in a laboratory'],
 ['Luxury real estate','Premium interiors','Residential living room interior','Mansion exterior with swimming pool'],
 ['Endangered marine species','Sea turtles','A hawksbill sea turtle swimming over coral','Whale breaching in ocean'],
 ['Healthcare technology','MRI diagnostic imaging','MRI scanner in a radiology department','A scientist pipetting samples'],
 ['Agriculture','Crop irrigation','Agricultural crop irrigation equipment','Tractor harvesting wheat'],
 ['Renewable energy','Solar power','Photovoltaic solar panels','Wind turbines generating power']
])test(`${topic}: both pipelines reject wrong section metadata and accept the specific scene`,()=>{
 for(const role of ['hero','section','item','background','foreground']){
  const target={topic,sectionTopic:section,query:section,searchQuery:section,role};
  assert.equal(evaluateImageRelevance({...rights,description:good},target).accepted,true);
  assert.equal(evaluateImageRelevance({...rights,description:bad},target).accepted,false);
  assert.equal(reviewImageCandidate({...rights,description:good},target,{width:1280,height:900}).accepted,true);
  assert.equal(reviewImageCandidate({...rights,description:bad},target,{width:1280,height:900}).accepted,false);
  assert.equal(configuredImageProviders({}).validateSearchAsset(target,{...rights,description:bad}),false);
 }
});
test('exact AI production case rejects CDC metadata despite research and education wording',()=>{
 const page={title:'Artificial Intelligence: Principles, Techniques & Societal Impact',inferredContext:{topic:'Foundations, methodologies, applications, and ethical dilemmas of artificial intelligence research and development.'},hero:{headline:'Computational Goal Maximization Across Reasoning Learning and Perception'},websiteBrief:{project:{purpose:'Educational research'}}};
 assert.deepEqual(centralImageSubject(page).concepts,['computing']);
 const target={topic:page.inferredContext.topic,query:'scientific education archival computation hardware research laboratory atmospheres',role:'hero'};
 assert.equal(reviewImageCandidate(lab,target,{width:1280,height:864}).accepted,false);
 assert.equal(reviewImageCandidate({...rights,description:'Computer servers and neural network processing hardware'},target,{width:1280,height:864}).accepted,true);
 assert.equal(evaluateImageRelevance({...lab,query:'Artificial intelligence'},target).accepted,false,'request text cannot certify the candidate');
 assert.equal(evaluateImageRelevance({...rights,description:'Residential architecture and mansion exterior'},{topic:'Artificial intelligence and neural network architectures',query:'Neural networks'}).accepted,false);
});
test('Commons rejects irrelevant results before download, then refines within a fixed search budget',async()=>{
 let searches=0,downloads=0;
 const result=await commonsSearch({topic:'Artificial intelligence',slideTitle:'AI computing',searchQuery:'artificial intelligence computer hardware',maxSearchQueries:2},{find:async()=>++searches===1?[{...lab,description:lab.alt}]:[{...rights,description:'Artificial intelligence computer hardware',downloadUrl:'fixture'}],download:async()=>{downloads++;return {buffer:Buffer.from('fixture')};}});
 assert.ok(result);assert.equal(searches,2);assert.equal(downloads,1);
});
test('optional irrelevant hero is omitted; required hero remains explicitly incomplete',async t=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'ledify-relevance-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));
 const f=fixtures.pharmaceutical,base=webpageThemeService(webpageLayoutService({outputType:'webpage',...fixturePlan(f),...fixtureDraft(f)}));
 base.title='Artificial Intelligence';base.inferredContext.topic='Artificial intelligence';base.imagePlan=[{role:'hero',subject:'Artificial intelligence computing',alt:'AI computing',required:false,aspectRatio:'16:9'}];
 const buffer=await fs.readFile('assets/webpage/curated/laboratory.jpg');
 for(const required of [false,true]){
  base.imagePlan[0].required=required;
  const result=await acquireWebsiteImages(base,{}, {curated:false,optimization:{cacheRoot:root},providers:[{id:'fixture',acquire:async()=>({...lab,buffer})}],logger:()=>{},relevanceLogger:()=>{}});
  assert.equal(result.page.visualAssets.hero,undefined);assert.equal(Object.keys(result.assets).length,0);
  assert.equal(result.page.imageValidation.status,required?'incomplete':'passed');
 }
 const plan=planWebsiteImages(base)[0];assert.equal(plan.topic,'Artificial intelligence');
});
test('relevance diagnostics retain bounded metadata and redact credentials and signed URLs',()=>{
 const entry=relevanceDiagnostic(lab,{topic:'AI',query:'API_KEY=secret https://private.test/?token=secret',purpose:'hero'}, {accepted:false,reason:'TOPIC_MISMATCH'},()=>{});
 assert.equal(entry.accepted,false);assert.ok(!JSON.stringify(entry).includes('secret'));assert.ok(!JSON.stringify(entry).includes('private.test'));
});
test('explicit image exclusions from user instructions apply before embedding',()=>{
 const exclusions=imageContextExclusions({instructions:'Create a real estate website. Avoid interior photos. No laboratory images.'});
 assert.deepEqual(exclusions,['interior','laboratory']);
 assert.equal(evaluateImageRelevance({...rights,description:'Residential interior living room'},{topic:'Luxury real estate',query:'Real estate',exclusions}).reason,'EXCLUDED_SUBJECT');
});
test('brand names and home-page labels do not imply property imagery',()=>{
 assert.deepEqual(imageTopicDomains('Open House Sessions'),[]);
 assert.deepEqual(imageTopicDomains('Home page for Artificial Intelligence'),['computing']);
});
