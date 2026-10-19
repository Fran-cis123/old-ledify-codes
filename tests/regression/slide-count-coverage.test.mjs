import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveSlideCount} from '../../Service/ai/slideCount.mjs';
import {createGenerationHandlers} from '../../controller/generateController.mjs';

const request="Create a premium, visually stunning 10-slide PowerPoint presentation titled 'The Future of Space Exploration: From Earth to Mars'. Cover the history of space exploration, reusable rockets, the International Space Station, lunar exploration, Mars rovers, technologies for human missions to Mars, deep-space challenges, future missions, and a powerful conclusion. Use scientifically accurate content and compelling visual storytelling. Incorporate high-quality, topic-relevant imagery of spacecraft, astronauts, rocket launches, lunar landscapes, Mars, and futuristic space technologies. Where AI image generation is available, generate original conceptual illustrations and embed them into the PPTX. Aim for meaningful imagery on at least 7 slides where appropriate. Use cinematic dark backgrounds, elegant typography, strong contrast, and diverse slide compositions including full-bleed imagery, split-screen layouts, timelines, comparisons, and diagrams. Avoid repetitive templates, empty slides, unreadable text, and generic decorative shapes. Ensure all images remain visible in the PPTX, PDF, and PNG previews.";
test('exact Earth-to-Mars request keeps ten total slides and treats seven as image coverage',()=>{
    assert.deepEqual(resolveSlideCount(request),{min:10,max:10,source:'prompt'});
});
test('image, chart and diagram subset requirements do not override or conflict with deck length',()=>{
    for(const text of ['Create 10 slides. Use images on 7 slides.','Create a ten-slide deck. Include diagrams across exactly five slides.','Make 10 slides. Seven slides should contain images.','Create 10 slides with images.','Create a presentation in 10 slides.','Make 10 slides; use charts in at least 3 slides.','Create 10 slides. Add images to 7 slides.'])assert.equal(resolveSlideCount(text).min,10,text);
    assert.deepEqual(resolveSlideCount('Use images on at least 7 slides.'),{min:8,max:10,source:'default'});
    assert.equal(resolveSlideCount('Create 10 slides',{keyInstructions:['Use imagery on at least 7 slides.']}).min,10);
});
test('actual conflicting totals, invalid counts and explicit context retain their validation behavior',()=>{
    assert.throws(()=>resolveSlideCount('Create 10 slides. Create 7 slides.'),{code:'INVALID_SLIDE_COUNT'});
    assert.throws(()=>resolveSlideCount('5 slides or 9 slides'),{code:'INVALID_SLIDE_COUNT'});
    assert.throws(()=>resolveSlideCount('Create 13 slides with images.'),{code:'INVALID_SLIDE_COUNT'});
    assert.equal(resolveSlideCount(request,{slideCount:12}).min,12);
    assert.equal(resolveSlideCount('Slide count: 10. Include images on 7 slides.').min,10);
});
test('presentation API handler passes the exact prompt through to generation with ten total slides',async()=>{
    let status,payload,reached=false;
    const handlers=createGenerationHandlers({model:{create:async value=>({...value,save:async()=>{}})},generator:async(kind,input,outputType,context)=>{
        reached=true;assert.equal(kind,'prompt');assert.equal(outputType,'presentation');assert.equal(resolveSlideCount(input,context).min,10);
        return {status:'completed',outputType,generatedContent:{outputType,slides:Array.from({length:10},(_,i)=>({slideNumber:i+1,title:`Slide ${i+1}`}))}};
    }});
    const res={status(value){status=value;return this;},json(value){payload=value;return this;},set(){return this;}};
    await handlers.userText({body:{textPrompt:request,outputType:'presentation'}},res);
    assert.equal(reached,true);assert.equal(status,201);assert.equal(payload.data.result.generatedContent.slides.length,10);
});
