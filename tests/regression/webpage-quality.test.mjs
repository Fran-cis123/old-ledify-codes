import test from 'node:test';
import assert from 'node:assert/strict';
import {fixtures,fixturePlan,fixtureDraft} from '../webpage/fixtures.mjs';
import {validateWebsiteClaims} from '../../Service/webpage/contentGrounding.mjs';
import {validateEditorialCopy,specifyWebsiteContent,reframeScopedHero} from '../../Service/webpage/contentSpecification.mjs';
import {centralImageSubject,reviewImageCandidate} from '../../Service/webpage/imageReview.mjs';
import {webpageLayoutService} from '../../Service/webpageLayoutService.mjs';
import {webpageThemeService,contrast} from '../../Service/webpageThemeService.mjs';
import {webpageRenderer} from '../../renderer/webpage/webpageRenderer.mjs';
import {validateStaticWebsite} from '../../Service/webpageStaticValidator.mjs';
import {planWebsiteImages} from '../../Service/webpage/imageStrategy.mjs';

test('general regulated-topic explanations are permitted while invented organizational operations remain blocked',()=>{
    const source='Create a pharmaceutical manufacturing website for Pharmax.';
    validateWebsiteClaims({sections:[{heading:'Sterile manufacturing',content:'Sterile manufacturing requires contamination controls and documented procedures.',items:[]},{heading:'Quality and Compliance',content:'Quality management involves evidence, documentation and review.',items:[]}]},source,{scope:'general-explanatory'});
    validateWebsiteClaims({sections:[{heading:'Aseptic processing',content:'Modern pharmaceutical manufacturing relies on environmental controls and continuous quality monitoring.',items:[{title:'Fluid handling',description:'Sterile fluid handling and barrier isolators minimize contamination risks during parenteral manufacturing.',detail:''}]}]},source,{scope:'general-explanatory'});
    for(const content of ['Our company operates a sterile injectable facility.','We offer formulation testing.','Pharmax owns accredited laboratories.'])assert.throws(()=>validateWebsiteClaims({sections:[{heading:'Overview',content,items:[]}]},source,{scope:'general-explanatory'}));
});
test('explanatory heroes do not imply that an organization delivers unverified capabilities',()=>{
    const page={hero:{subheadline:'Delivering pharmaceutical formulation and manufacturing services.'}};
    reframeScopedHero(page,{mode:'general-explanatory'});assert.equal(page.hero.subheadline,'An introduction to pharmaceutical formulation and manufacturing services.');
    const sourced={hero:{subheadline:'Providing the services described in the supplied company brief.'}};
    reframeScopedHero(sourced,{mode:'source-grounded'});assert.match(sourced.hero.subheadline,/^Providing/);
});
test('placeholder instructions are rejected both before rendering and in raw HTML delivery',()=>{
    const page=webpageThemeService(webpageLayoutService({outputType:'webpage',...fixturePlan(fixtures.school),...fixtureDraft(fixtures.school)}));
    const files=webpageRenderer(page);
    for(const content of ['Information to provide','Add confirmed information here before publication','Specific information has not been provided','Insert company description']){
        assert.throws(()=>validateEditorialCopy({...page,hero:{...page.hero,subheadline:content}}),/metadata/);
        assert.throws(()=>validateStaticWebsite({...files,'index.html':files['index.html'].replace('<main id="main">','<main id="main"><p>'+content+'</p>')}),/editor instructions/);
    }
});
test('missing-specific-facts sections are omitted with remapped pages and a separate checklist',()=>{
    const plan=fixturePlan(fixtures.pharmaceutical);plan.sections.push({type:'team',heading:'Our people',navLabel:'Team',purpose:'Introduce people'});plan.pages=[{slug:'home',title:'Home',sectionIndexes:[0,1]},{slug:'contact',title:'Contact',sectionIndexes:[3,4]}];
    const {plan:scoped,specification}=specifyWebsiteContent(plan,'Create a pharmaceutical company website called Pharmax.');
    assert.equal(scoped.sections.some(section=>['team','contact'].includes(section.type)),false);
    assert.ok(specification.missingInformation.some(entry=>entry.field==='team'));assert.deepEqual(scoped.pages[1].sectionIndexes,[]);
});
test('literary-gathering hero rejects a salad candidate while gallery food placement may accept it',()=>{
    const page={title:'Literary Gatherings',hero:{headline:'Stories and shared experiences',subheadline:'Reading, food and interior discussions'},inferredContext:{topic:'A literary gathering'},websiteBrief:{project:{purpose:'Connect readers through shared stories'}}};
    const central=centralImageSubject(page);assert.ok(central.concepts.includes('literary'));assert.ok(!central.concepts.includes('food'));
    const salad={alt:'A prepared salad',subject:'food photography',creator:'Daderot',license:'CC0'};
    assert.equal(reviewImageCandidate(salad,{role:'hero',query:'food reading',centralConcepts:central.concepts},{width:1280,height:853}).accepted,false);
    assert.equal(reviewImageCandidate(salad,{role:'item',query:'Seasonal food table'},{width:1280,height:853}).accepted,true);
    assert.equal(reviewImageCandidate({...salad,license:''},{role:'item',query:'food'},{width:1280,height:853}).accepted,false);
    assert.equal(centralImageSubject({title:'Creative portfolio',hero:{headline:'Design for collaborators'},inferredContext:{topic:'Visual and digital design'},websiteBrief:{project:{purpose:'Connect with creative collaborators'}}}).concepts.includes('scientific'),false);
    const water=webpageLayoutService({outputType:'webpage',...fixturePlan(fixtures.education),...fixtureDraft(fixtures.education)});
    water.websiteBrief={project:{purpose:'Explain the water cycle'},photography:{subjects:['learning environments','library']}};
    const target=planWebsiteImages(water)[0];
    assert.equal(reviewImageCandidate({alt:'Book stacks in a library',subject:'library learning',creator:'Author',license:'CC0'},target,{width:1280,height:853}).accepted,false);
});
test('actual composited section palettes and non-text controls meet measured thresholds',()=>{
    for(const paletteId of ['navy-jade','midnight-electric','ocean-night','terracotta','plum-ivory'])for(const background of ['plain','tinted','brand','accent','dark','gradient','texture','split']){
        const page=webpageLayoutService({outputType:'webpage',...fixturePlan(fixtures.school),...fixtureDraft(fixtures.school)});page.sections.forEach(section=>section.background=background);
        const themed=webpageThemeService(page,{designPreferences:{paletteId}});
        for(const section of Object.values(themed.theme.sectionTokens)){
            for(const pair of section.contrastPairs)assert.ok(pair.ratio>=pair.minimum,`${paletteId}/${background}/${pair.front}`);
            for(const bg of section.compositedBackgrounds)for(const fg of ['text','muted'])assert.ok(contrast(section.colors[fg],bg)>=4.5);
        }
        assert.ok(/^#[\da-f]{6}$/i.test(themed.theme.colors.alternateBackground));assert.ok(themed.theme.rationale.selection);
    }
});
