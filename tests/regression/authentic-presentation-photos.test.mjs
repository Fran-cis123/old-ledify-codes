import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {requiresAuthenticPhotography,planImageCoverage} from '../../Service/visual/imageArtDirection.mjs';
import {createImageAssetSession} from '../../Service/visual/presentationImageAssets.mjs';
import {imagePolicy} from '../../Service/visual/imagePolicy.mjs';
import {commonsSearch,commonsCandidates,stockSearchQueries} from '../../Service/visual/imageProviders.mjs';
import {createGenerationHandlers} from '../../controller/generateController.mjs';
import {createCommonsMetadataClient} from '../../Service/visual/commonsMetadata.mjs';

const instructions="Every slide must contain at least one real, high-quality photographic image. Use authentic destination photography; do not present AI-generated scenes as real photographs of specific locations.";
const deck={title:'Travel destinations',slides:[{slideNumber:1,slideType:'title',title:'Swiss Alps',visualRequirement:{kind:'photo',searchQuery:'Swiss Alps',sourceStrategy:'generate-first'}}]};
const theme={family:'editorial',style:'cinematic',palette:{background:'FFFFFF'}};
test('the travel prompt forces authentic stock photography even when the outline requests generation',()=>{
    assert.equal(requiresAuthenticPhotography({instructions}),true);
    assert.equal(requiresAuthenticPhotography({instructions:'Use AI-generated editorial illustrations.'}),false);
    const planned=planImageCoverage(deck,{instructions});
    assert.equal(planned.slides[0].imageRequirement.authenticPhotoOnly,true);
    assert.equal(planned.slides[0].imageRequirement.sourceStrategy,'licensed-search-first');
});

test('authentic photo acquisition never calls or reserves paid generation on stock failure',async t=>{
    const root=await fs.mkdtemp(path.join(os.tmpdir(),'ledify-authentic-'));
    t.after(()=>fs.rm(root,{recursive:true,force:true}));
    let generated=0,searched=0;
    const session=createImageAssetSession({root,policy:{...imagePolicy({}),allowGeneration:true,estimatedUnitCost:.1,maxEstimatedCost:10,retries:0},providers:{search:async()=>{searched++;return null;},generate:async()=>{generated++;throw new Error('Must never generate');}}});
    const planned=planImageCoverage(deck,{instructions});
    assert.equal(await session.resolve(planned,planned.slides[0],theme,{instructions}),null);
    assert.equal(searched,1);assert.equal(generated,0);assert.equal(session.budget.report().attempts,0);
    assert.equal(session.diagnostics[0].reasonCode,'NO_ELIGIBLE_IMAGE');
});

test('stock providers cannot smuggle synthetic scenes into an authentic-photo request',async t=>{
    const root=await fs.mkdtemp(path.join(os.tmpdir(),'ledify-authentic-'));
    t.after(()=>fs.rm(root,{recursive:true,force:true}));
    const session=createImageAssetSession({root,policy:{...imagePolicy({}),retries:0},providers:{search:async()=>({generationMethod:'ai-generated',buffer:Buffer.from('fixture')})}});
    const planned=planImageCoverage(deck,{instructions});
    assert.equal(await session.resolve(planned,planned.slides[0],theme,{instructions}),null);
    assert.equal(session.diagnostics[0].reasonCode,'AUTHENTIC_PHOTO_REQUIRED');
});

test('a generation-only configuration reports the missing authentic-photo provider',async t=>{
    const root=await fs.mkdtemp(path.join(os.tmpdir(),'ledify-authentic-'));
    t.after(()=>fs.rm(root,{recursive:true,force:true}));
    const session=createImageAssetSession({root,policy:imagePolicy({}),providers:{generate:async()=>{throw new Error('Must not generate');}}});
    const planned=planImageCoverage(deck,{instructions});
    assert.equal(await session.resolve(planned,planned.slides[0],theme,{instructions}),null);
    assert.equal(session.diagnostics[0].reasonCode,'AUTHENTIC_PHOTO_PROVIDER_UNAVAILABLE');
});

test('Commons recovers an overdescribed search and tries the next licensed candidate after download failure',async()=>{
    const query='breathtaking cinematic Swiss Alps photograph',queries=[],downloads=[];
    assert.deepEqual(stockSearchQueries(query),['Swiss Alps']);
    const result=await commonsSearch({searchQuery:query},{find:async q=>{
        queries.push(q);return q===query?[]:[1,2].map(id=>({mediaKind:'photograph',originalUrl:`https://commons.wikimedia.org/wiki/File:Swiss_Alps_${id}.jpg`,description:'Swiss Alps landscape',downloadUrl:`https://example.org/${id}.jpg`}));
    },download:async url=>{downloads.push(url);if(downloads.length===1)throw new Error('Image unavailable');return {buffer:Buffer.from('photo fixture')};}});
    assert.deepEqual(queries,['Swiss Alps']);assert.equal(downloads.length,2);assert.equal(result.buffer.toString(),'photo fixture');
});

test('destination scene directions fall back to concise location searches without adding another location',async()=>{
    const queries=[];
    const result=await commonsSearch({searchQuery:'Maldives overwater bungalows turquoise ocean aerial view',slideTitle:'Maldives',subject:'Travel destinations'}, {find:async q=>{
        queries.push(q);return q==='Maldives'?[{mediaKind:'photograph',originalUrl:'https://commons.wikimedia.org/wiki/File:Maldives_lagoon.jpg',description:'Maldives lagoon',downloadUrl:'https://example.org/maldives.jpg'}]:[];
    },download:async()=>({buffer:Buffer.from('photo')})});
    assert.equal(result.buffer.toString(),'photo');assert.equal(queries.at(-1),'Maldives');assert.ok(queries.length<=5);
    assert.ok(stockSearchQueries('Bali Tegallalang rice terraces morning mist Indonesia lush',{slideTitle:'Bali in Indonesia'}).includes('Bali Indonesia'));
    assert.deepEqual(stockSearchQueries('File:Swiss Alps.jpg'),['File:Swiss Alps.jpg']);
    assert.ok(stockSearchQueries('scenic landscape golden hour mountains ocean',{slideTitle:'Travel destinations',subject:'Travel destinations'}).includes('scenic landscape'));
});

test('Commons API errors are failures, not an empty successful search',async t=>{
    t.mock.method(globalThis,'fetch',async()=>({ok:true,json:async()=>({error:{code:'badvalue',info:'Invalid search parameter'}})}));
    await assert.rejects(commonsCandidates('Maldives'),{code:'PHOTO_SEARCH_API_ERROR'});
});

test('Commons serializes concurrent searches, paces requests and reuses successful metadata',async()=>{
    let clock=0,calls=0,active=0,peak=0;const starts=[];
    const client=createCommonsMetadataClient({now:()=>clock,wait:async ms=>{clock+=ms;},request:async()=>{
        starts.push(clock);calls++;peak=Math.max(peak,++active);await Promise.resolve();active--;
        return {ok:true,json:async()=>({query:{pages:{}}})};
    }});
    await Promise.all([client('one'),client('two'),client('one')]);
    assert.equal(calls,2);assert.equal(peak,1);assert.deepEqual(starts,[0,1000]);
});

test('Commons honors Retry-After with one bounded retry and does not cache failures',async()=>{
    let clock=0,calls=0;const starts=[];
    const client=createCommonsMetadataClient({now:()=>clock,wait:async ms=>{clock+=ms;},request:async()=>{
        starts.push(clock);calls++;return calls===1?{status:429,headers:new Headers({'Retry-After':'3'})}:{ok:true,json:async()=>({query:{pages:{}}})};
    }});
    await client('one');assert.deepEqual(starts,[0,3000]);
    const limited=createCommonsMetadataClient({now:()=>clock,wait:async ms=>{clock+=ms;},request:async()=>({status:429,headers:new Headers({'Retry-After':'120'})})});
    await assert.rejects(limited('one'),{code:'PHOTO_PROVIDER_RATE_LIMITED'});
    await assert.rejects(limited('two'),{code:'PHOTO_PROVIDER_RATE_LIMITED'});
});

test('a focused search retains the destination and favors the requested scene',async()=>{
    const query='Maldives overwater villas aerial view turquoise lagoon coral reef';
    const focused=stockSearchQueries(query,{slideTitle:'The Maldives: Atolls of Azure'}).find(q=>q.includes(' OR '));
    assert.ok(focused.startsWith('Maldives ('));let requested;
    const result=await commonsSearch({searchQuery:query,slideTitle:'The Maldives: Atolls of Azure'}, {find:async q=>q===focused?[
        {mediaKind:'photograph',originalUrl:'https://commons.wikimedia.org/wiki/File:Maldives_plane.jpg',description:'Maldives plane',downloadUrl:'https://example.org/plane.jpg'},
        {mediaKind:'photograph',originalUrl:'https://commons.wikimedia.org/wiki/File:Maldives_lagoon_reef.jpg',description:'Maldives turquoise lagoon and coral reef',downloadUrl:'https://example.org/lagoon.jpg'}]:[],download:async url=>{requested=url;return {buffer:Buffer.from('photo')};}});
    assert.ok(result);assert.equal(requested,'https://example.org/lagoon.jpg');
});

test('rate limited searches do not fan out across alternative queries or session retries',async t=>{
    let calls=0;const limited=async()=>{calls++;throw Object.assign(new Error('Rate limited'),{code:'PHOTO_PROVIDER_RATE_LIMITED'});};
    await assert.rejects(commonsSearch({searchQuery:'Maldives luxury overwater lagoon'},{find:limited}),{code:'PHOTO_PROVIDER_RATE_LIMITED'});assert.equal(calls,1);
    const root=await fs.mkdtemp(path.join(os.tmpdir(),'ledify-photo-limit-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));
    const session=createImageAssetSession({root,policy:{...imagePolicy({}),retries:2},providers:{search:limited}});
    const planned=planImageCoverage(deck,{instructions});
    assert.equal(await session.resolve(planned,planned.slides[0],theme,{instructions}),null);
    assert.equal(calls,2);assert.equal(session.diagnostics[0].reasonCode,'PROVIDER_RATE_LIMITED');
});

test('a cancelled queued search never contacts Commons',async()=>{
    let calls=0;const controller=new AbortController();controller.abort();
    const client=createCommonsMetadataClient({request:async()=>{calls++;}});
    await assert.rejects(client('one',{signal:controller.signal}),{name:'AbortError'});assert.equal(calls,0);
});

test('image failure API exposes safe reason codes without raw provider errors',async()=>{
    const handlers=createGenerationHandlers({model:{create:async()=>({save:async()=>{}})},generator:async()=>{throw Object.assign(new Error('Authentic photos unavailable'),{code:'PRESENTATION_IMAGES_UNAVAILABLE',stage:'presentation-images',missingSlides:[5],imageDiagnostics:[{slideNumber:5,method:'search',status:'failed',reasonCode:'PROVIDER_TIMEOUT',reason:'private provider details'}]});}});
    let body,status;
    await handlers.userText({body:{textPrompt:'Travel',outputType:'presentation'}},{status(code){status=code;return this;},json(value){body=value;}});
    assert.equal(status,503);assert.equal(body.imageFailures[0].reasonCode,'PROVIDER_TIMEOUT');assert.ok(!JSON.stringify(body).includes('private provider'));
});
