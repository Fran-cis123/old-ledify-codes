import test from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {numericClaims} from '../../Service/ai/numericClaims.mjs';
import {requestedLabels,validateRequestedLabels} from '../../Service/ai/requestedLabels.mjs';
import {validateWebsiteClaims} from '../../Service/webpage/contentGrounding.mjs';
import {validateWebpageContent} from '../../Service/webpageContentValidator.mjs';
import {generateJsonWithRetry} from '../../Service/ai/generateJsonWithRetry.mjs';
import {matchesImageIdentity,matchesImageDetail,imageIdentityLabel} from '../../Service/visual/imageIdentity.mjs';
import {startBackend} from '../../src/serverLifecycle.mjs';
import {createApp} from '../../src/app.mjs';
import {fixtures,fixtureDraft} from '../webpage/fixtures.mjs';
import {acquireWebsiteImages} from '../../Service/webpage/imagePipeline.mjs';
import {evaluateImageRelevance} from '../../Service/visual/imageRelevance.mjs';
import {reviewImageCandidate} from '../../Service/webpage/imageReview.mjs';
import {classifyImageError} from '../../Service/visual/imageAssetService.mjs';
import {candidateSuitability} from '../../Service/visual/imageProviders.mjs';
const schema={type:'object',properties:{title:{type:'string'}},required:['title']};
test('automotive detail galleries require evidence of the requested component',()=>{
 const product={topic:'Luxury automotive collection',sectionType:'products',itemTitle:'Prestige Sedan'};
 for(const description of ['Military police car','Bentley Showrooms','Mercedes-Benz dealership','Rolls-Royce hood ornament'])assert.equal(matchesImageDetail({description},product),false);
 assert.equal(matchesImageDetail({description:'Luxury car exterior'},product),true);
 for(const [itemTitle,description] of [['Driver Cockpit','Automobile cockpit dashboard'],['Distinctive Headlights','Car headlight close-up'],['Alloy Wheels','Sports car wheel rim'],['Signature Matrix Lighting','Vehicle running lights'],['Leather Tailoring','Car leather upholstery'],['Carbon Fiber Weave','Carbon fiber car body']]){
  const target={topic:'Luxury automotive collection',sectionType:'gallery',itemTitle};
  assert.equal(matchesImageDetail({description:'Sports car exterior on display'},target),false);
  assert.equal(matchesImageDetail({description},target),true);
 }
});
const response=value=>({text:JSON.stringify(value),candidates:[{finishReason:'STOP'}]});
test('permanent image billing failures are non-retryable and unrequested vehicle contexts are rejected',()=>{
 for(const error of [{status:402},{status:429,message:'Billing is disabled'}])assert.equal(classifyImageError(error).retryable,false);
 for(const [description,file] of [['Military police vehicle presentation','Military_police_Mercedes.jpg'],['Car hood ornament and emblem','Car_hood_ornament.jpg']])assert.equal(candidateSuitability('luxury car exterior',{mediaKind:'photograph',description,originalUrl:'https://commons.wikimedia.org/wiki/File:'+file},{partial:true}),-1);
 assert.ok(candidateSuitability('military police car',{mediaKind:'photograph',description:'Military police car patrol',originalUrl:'https://commons.wikimedia.org/wiki/File:Military_police_car.jpg'},{partial:true})>=0);
});
test('metaphorical subject architecture does not admit buildings or libraries into a vehicle gallery',()=>{
 for(const sectionTopic of ['Diamond-Quilted Cockpit Architecture','Center-Lock Alloy Wheels']){
  const target={topic:'Luxury automotive portfolio and performance design',sectionTopic,query:sectionTopic};
  for(const description of ['The glass-walled Farnsworth House','Book-lined galleries in a public library'])assert.equal(evaluateImageRelevance({description},target).accepted,false);
  assert.equal(evaluateImageRelevance({description:'A luxury car cockpit with alloy wheels'},target).accepted,true);
 }
});
test('explicit text-only websites perform no image acquisition or fallback work',async()=>{
 const page={...fixtureDraft(fixtures.business),sections:fixtureDraft(fixtures.business).sections,designBrief:{heroComposition:'split'}};
 const result=await acquireWebsiteImages(page,{instructions:'Create a text-only website. No images.'},{providers:[{id:'trap',acquire:async()=>{throw new Error('Must not acquire images');}}]});
 assert.equal(result.page.imageStrategy.generatedCalls,0);assert.deepEqual(result.assets,{});assert.deepEqual(result.warnings,[]);assert.equal(result.page.imageValidation.status,'passed');
});

test('identifiers differ from numeric evidence across engineering, science and software',()=>{
 assert.deepEqual(numericClaims('V12, CO2, GPT-4 and 3D; 500 hp, 20%, 2024 and 100kg.'),['500','20%','2024','100']);
 const page=fixtureDraft(fixtures.business);page.hero.subheadline='Explore V12 engineering, CO2 chemistry and GPT-4 interfaces.';
 validateWebpageContent(page,{source:fixtures.business.source});
 page.hero.subheadline='This vehicle produces 500hp and reaches 320 km/h.';
 assert.throws(()=>validateWebpageContent(page,{source:fixtures.business.source}),error=>error.validationRule==='UNSUPPORTED_NUMERIC_CLAIM'&&error.field==='hero.subheadline');
});
test('illustrative collection scope applies to its cards; gallery captions do not invent offerings',()=>{
 for(const [title,description] of [['Lightweight chassis','A study of structural efficiency.'],['Molecular simulation','A computational representation of molecular interactions.'],['Minimalist chair','An exploration of a lightweight frame.']]){
  const page={sections:[{type:'products',content:'Illustrative examples for discussion; not actual inventory.',items:[{title,description}]}]};
  validateWebsiteClaims(page,'Create an illustrative educational collection.');
  validateWebsiteClaims({sections:[{...page.sections[0],type:'gallery',content:'A visual study.'}]},'Create an educational gallery.');
  assert.throws(()=>validateWebsiteClaims({sections:[{...page.sections[0],content:'Our available products.'}]},'Create a business website.'),{code:'WEBPAGE_VALIDATION_FAILED'});
 }
 assert.throws(()=>validateWebsiteClaims({sections:[{type:'products',content:'Illustrative examples.',items:[{title:'Sample device',description:'Our facility is FDA approved.'}]}]},'Create an illustrative collection.'),{code:'WEBPAGE_VALIDATION_FAILED'});
});
test('all unsupported offering fields reach one repair instead of one new rejection per retry',async()=>{
 const page={sections:[{type:'products',content:'Available offerings.',items:[{title:'Unprovided precision instrument',description:'A dedicated new instrument.'},{title:'Unprovided research platform',description:'A dedicated new platform.'}]}]};
 assert.throws(()=>validateWebsiteClaims(page,'Create a business website.'),error=>error.validationErrors.length===2);
 let calls=0;const requests=[];
 await generateJsonWithRetry({stage:'webpage-content',outputType:'webpage',schema,logger:()=>{},sleep:async()=>{},request:{contents:'Original source',config:{}},client:{models:{generateContent:async request=>{requests.push(request);return response({title:++calls===1?'invalid':'valid'});}}},validate:value=>{if(value.title==='invalid')validateWebsiteClaims(page,'Create a business website.');}});
 assert.equal(calls,2);assert.match(requests[1].contents,/sections\[0\]\.items\[0\]/);assert.match(requests[1].contents,/sections\[0\]\.items\[1\]/);
});
test('billing exhaustion stops immediately while temporary rate limits retain bounded recovery',async()=>{
 for(const failure of [Object.assign(new Error('Payment required; private'),{status:402}),Object.assign(new Error('Billing is disabled; private'),{status:429})]){
  let calls=0;await assert.rejects(generateJsonWithRetry({stage:'content',outputType:'webpage',schema,request:{contents:'source'},logger:()=>{},sleep:async()=>{},client:{models:{generateContent:async()=>{calls++;throw failure;}}}}),error=>error.code==='AI_PROVIDER_ERROR'&&!error.message.includes('private'));assert.equal(calls,1);
 }
 let calls=0;const result=await generateJsonWithRetry({stage:'content',outputType:'webpage',schema,request:{contents:'source'},logger:()=>{},sleep:async()=>{},client:{models:{generateContent:async()=>{if(++calls===1)throw Object.assign(new Error('Transient throttling'),{status:429});return response({title:'Recovered'});}}}});assert.equal(calls,2);assert.equal(result.title,'Recovered');
});
test('explicitly listed names are preserved across subjects without inventing facts',()=>{
 for(const labels of [['Ferrari','Lamborghini','Porsche'],['Ada Lovelace','Alan Turing'],['Orion X2','Nova X3']]){
  const found=requestedLabels('Create a portfolio featuring '+labels.join(', ')+'.');assert.deepEqual(found,labels);
  assert.throws(()=>validateRequestedLabels({sections:[]},labels),error=>error.validationRule==='REQUEST_COVERAGE');
  validateRequestedLabels({hero:{headline:labels.join(' · ')}},labels);
 }
 assert.deepEqual(requestedLabels('Avoid including Private Product, Other Product.'),[]);
});
test('exact object imagery needs independent identity metadata, not another model or a generated prompt',()=>{
 assert.equal(imageIdentityLabel('Orion X2 Precision Architecture',['Orion']),'Orion X2');
 for(const [expected,matching,wrong] of [['Porsche 911 GT3','Porsche 911 GT3 exterior','Porsche 911 GT4 exterior'],['Orion X2','Orion X2 instrument','Orion X3 instrument'],['Nova Camera A7','Nova Camera A7 portrait','Nova Camera A8 portrait']]){
  assert.equal(matchesImageIdentity({description:matching},{identityLabel:expected}),true);
  assert.equal(matchesImageIdentity({description:wrong},{identityLabel:expected}),false);
  assert.equal(matchesImageIdentity({source:'Google Gemini',subject:expected},{identityLabel:expected}),false);
 }
});
test('HTTP binds before database readiness and job recovery; admission remains blocked without invoking generation',async t=>{
 let release,connected=false,recovered=false,calls=0;const gate=new Promise(resolve=>{release=resolve;});
 const running=startBackend({config:{port:0,host:'127.0.0.1'},connect:async()=>{await gate;connected=true;},recover:async()=>{assert.equal(connected,true);recovered=true;},createApplication:options=>createApp({...options,generator:async()=>{calls++;}})});
 t.after(()=>{release();running.server.closeAllConnections();return new Promise(resolve=>running.server.close(resolve));});
 if(!running.server.listening)await once(running.server,'listening');const base=`http://127.0.0.1:${running.server.address().port}`;
 assert.equal((await fetch(base+'/healthz')).status,200);assert.equal((await fetch(base+'/readyz')).status,503);
 const blocked=await fetch(base+'/api/generate/textPrompt',{method:'POST'});assert.equal(blocked.status,503);assert.equal((await blocked.json()).errorCode,'SERVICE_NOT_READY');assert.equal(calls,0);
 release();await running.ready;assert.equal(recovered,true);assert.equal((await fetch(base+'/readyz')).status,200);
});
test('exhausted AI validation has an actionable response without leaking draft content',async t=>{
 const server=createApp({model:{create:async value=>({...value,save:async()=>{}})},generator:async()=>{throw Object.assign(new Error('private draft content'),{code:'AI_RETRY_EXHAUSTED',stage:'webpage-content',field:'sections[0].items[0]',validationRule:'REQUEST_COVERAGE'});}}).listen(0,'127.0.0.1');await once(server,'listening');t.after(()=>{server.closeAllConnections();return new Promise(resolve=>server.close(resolve));});
 const result=await fetch(`http://127.0.0.1:${server.address().port}/api/generate/textPrompt`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({textPrompt:'Create a useful website.',outputType:'webpage'})});assert.equal(result.status,502);const body=await result.json();assert.equal(body.stage,'webpage-content');assert.equal(body.validationRule,'REQUEST_COVERAGE');assert.equal(body.retryable,false);assert.ok(!JSON.stringify(body).includes('private'));
});
