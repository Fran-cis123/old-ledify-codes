import test from 'node:test';
import assert from 'node:assert/strict';
import {fixtures,fixturePlan,fixtureDraft} from '../webpage/fixtures.mjs';
import {webpageLayoutService} from '../../Service/webpageLayoutService.mjs';
import {webpageThemeService,contrast} from '../../Service/webpageThemeService.mjs';
import {sectionVisualTokens} from '../../Service/webpage/visualTokens.mjs';
import {webpageRenderer} from '../../renderer/webpage/webpageRenderer.mjs';
import {validateStaticWebsite} from '../../Service/webpageStaticValidator.mjs';
import {evaluateImageRelevance} from '../../Service/visual/imageRelevance.mjs';
import {planWebsiteImages} from '../../Service/webpage/imageStrategy.mjs';
const sample=(topic,context={})=>{
 const f=fixtures.business,page={outputType:'webpage',...fixturePlan(f),...fixtureDraft(f)};
 page.title=topic;page.inferredContext.topic=topic;page.designBrief={industry:'general',audience:'Visitors',conversionGoal:'Learn more',visualTone:'clear',imageDirection:'',density:'comfortable',heroComposition:'split'};delete page.designSpec;
 return webpageThemeService(webpageLayoutService(page,context),context);
};
for(const [topic,id,palette] of [['Artificial Intelligence','intelligence','midnight-blue'],['Luxury Real Estate','property','champagne-ivory'],['Healthcare Technology','healthcare','clinical-teal'],['Education','education','scholar-blue'],['Financial Services','finance','emerald-ink'],['Environmental Conservation','conservation','moss-stone']])test(`${topic} receives a coherent accessible profile`,()=>{
 const page=sample(topic==='Education'?'Education':topic,topic==='Education'?{websiteBrief:{industry:'education'}}:{});
 assert.equal(page.theme.profileId,id);assert.equal(page.theme.paletteId,palette);
 for(const treatment of ['plain','tinted','brand','accent','dark','gradient','texture','split'])for(const pair of sectionVisualTokens(page.theme.colors,treatment).contrastPairs)assert.ok(pair.ratio>=pair.minimum,`${topic}/${treatment}/${pair.front}`);
 assert.ok(contrast(page.theme.colors.rule,page.theme.colors.background)<contrast(page.theme.colors.border,page.theme.colors.background),'decorative rules are distinct from control boundaries');
 assert.equal(validateStaticWebsite(webpageRenderer(page)).valid,true);
});
test('caller branding and explicit light/hero/font preferences win over profiles',()=>{
 const page=sample('Artificial Intelligence',{instructions:'Use a light background.',designPreferences:{paletteId:'forest-brass',colors:{primary:'#305040'},heroComposition:'minimal',fontPair:'classical',geometry:'square'}});
 assert.equal(page.theme.colors.primary,'#305040');assert.equal(page.theme.paletteId,'forest-brass');assert.equal(page.designSpec.fontPair,'classical');assert.equal(page.designBrief.heroComposition,'minimal');
 assert.match(webpageRenderer(page)['style.css'],/--radius:0px/);
 const light=sample('Artificial Intelligence',{instructions:'Use a white background.'});assert.equal(light.theme.paletteId,'scholar-blue');
 assert.equal(sample('Artificial Intelligence',{instructions:'Avoid dark themes. Use a white background.'}).theme.paletteId,'scholar-blue');
});
test('editorial sections render stories rather than another card grid',()=>{
 const page=sample('Education',{websiteBrief:{industry:'education'}});const section=page.sections.find(section=>section.items.length);section.type='features';section.composition='editorial';
 const files=webpageRenderer(page);assert.match(files['index.html'],/editorial-stories/);assert.match(files['style.css'],/prefers-reduced-motion/);assert.match(files['style.css'],/img\.crop-contain/);
 assert.ok(Buffer.byteLength(files['style.css'])<64000,'styles remain a small local asset');
 assert.throws(()=>validateStaticWebsite({...files,'style.css':'body{color:black}'}),{code:'WEBPAGE_STATIC_INVALID'});
});
test('long words alone do not demote normal descriptive hero typography',()=>{
 const page=sample('Artificial Intelligence');page.hero.headline='Understanding intelligence through computing';
 assert.doesNotMatch(webpageRenderer(page)['index.html'],/headline-long/);
});
test('medical-college exteriors cannot satisfy a diagnostic technology hero',()=>{
 const target={topic:'Healthcare technology and diagnostic systems',query:'Medical technology diagnostic scanner'};
 assert.equal(evaluateImageRelevance({description:'Yuanpei University of Medical Technology campus entrance'},target).accepted,false);
 assert.equal(evaluateImageRelevance({description:'MRI scanner in a medical diagnostic imaging room'},target).accepted,true);
});
test('finance plans reject residential stock and avoid unrequested geometric placeholders',()=>{
 const page=sample('Financial Services');page.designBrief.imageDirection='Conceptual architectural forms and geometric balance';
 assert.match(planWebsiteImages(page)[0].query,/Financial planning workspace/);
 assert.match(planWebsiteImages(page)[0].alt,/Financial planning workspace/);
 assert.equal(evaluateImageRelevance({description:'A residential lounge interior with a bar'},{topic:'Financial planning and risk management',query:'Diversification'}).accepted,false);
});
