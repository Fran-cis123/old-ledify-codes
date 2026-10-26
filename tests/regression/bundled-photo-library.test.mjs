import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
import {rankCuratedPhotos} from '../../Service/webpage/curatedSelection.mjs';
import {bundledPhotoSearch} from '../../Service/visual/bundledPhotoSearch.mjs';
import {configuredImageProviders} from '../../Service/visual/imageProviders.mjs';

const root=path.resolve('assets/webpage/curated');
const catalog=()=>fs.readFile(path.join(root,'catalog.json'),'utf8').then(JSON.parse);
test('bundled photos decode, have distinct bytes and retain complete source and license metadata',async()=>{
 const entries=await catalog(),seen=new Set();assert.ok(entries.length>=50);
 assert.ok(new Set(entries.map(v=>v.industry)).size>=15);
 for(const entry of entries){
  assert.match(entry.file,/^[a-z0-9-]+\.jpg$/);assert.ok(entry.creator.trim());assert.ok(entry.alt.trim());assert.ok(entry.subject.trim());
  assert.match(entry.sourceUrl,/^https:\/\/commons\.wikimedia\.org\/wiki\/File:/);
  assert.match(entry.license,/^(?:CC0|CC BY(?:-SA)? [1-4]|Public domain)/);
  assert.match(entry.licenseUrl,/^https:\/\/creativecommons\.org\/(?:licenses|publicdomain)\//);
  const bytes=await fs.readFile(path.join(root,entry.file));const digest=createHash('sha256').update(bytes).digest('hex');
  assert.equal(entry.sha256,digest,entry.file);assert.ok(!seen.has(digest),'Duplicate '+entry.file);seen.add(digest);
  const metadata=await sharp(bytes).metadata();assert.equal(metadata.format,'jpeg');assert.equal(metadata.width,entry.width);assert.equal(metadata.height,entry.height);
  assert.ok(metadata.width>=800&&metadata.height>=600);assert.ok(bytes.length<1500000);
  const stats=await sharp(bytes).stats();assert.ok(stats.channels.some(c=>c.stdev>5),'Blank '+entry.file);
 }
});
test('food selection ranks concrete subjects ahead of broad food-category matches',async()=>{
 const entries=await catalog();
 for(const [query,expected] of [['Pizza restaurant','food.jpg'],['Artisan bread bakery','bread'],['Coffee cafe','coffee'],['Chocolate cake dessert','dessert'],['West African jollof rice restaurant','jollof']]){
  const ranked=rankCuratedPhotos(entries,{role:'hero',query,topic:query,centralConcepts:['food']});
  assert.ok(ranked.length,query);assert.ok(ranked[0].entry.file.includes(expected),query+': '+ranked[0].entry.file);
 }
});
test('named travel locations and specific technologies cannot silently use unrelated bundled photos',async()=>{
 const entries=await catalog();
 const norway=rankCuratedPhotos(entries,{role:'hero',query:'Norwegian fjords',topic:'Norwegian fjords'});
 assert.ok(norway.every(v=>/Norway|Norwegian/i.test(v.entry.alt+' '+v.entry.subject)));
 assert.equal(rankCuratedPhotos(entries,{role:'hero',query:'Maldives beach resort',topic:'Maldives beach resort'}).length,0);
 assert.equal(rankCuratedPhotos(entries,{role:'hero',query:'Sushi restaurant',topic:'Sushi restaurant',centralConcepts:['food']}).length,0);
 assert.equal(rankCuratedPhotos(entries,{role:'hero',query:'Mars rover landscape',topic:'Mars exploration'}).length,0);
 const scanner=rankCuratedPhotos(entries,{role:'hero',query:'medical technology MRI scanner',topic:'medical technology'});
 assert.ok(scanner.length);assert.ok(scanner.every(v=>/MRI|magnetic resonance/i.test(v.entry.alt+' '+v.entry.subject)));
});
test('presentation auto-search resolves local photography without a network or generation call, preserves credits and avoids used sources',async()=>{
 const providers=configuredImageProviders({});const request={searchQuery:'coffee cafe',subject:'Coffee',slideTitle:'Coffee',slideNumber:1};
 const first=await providers.search(request);assert.ok(Buffer.isBuffer(first.buffer));assert.equal(first.mediaKind,'photograph');
 assert.equal(first.generationMethod,'licensed-search');assert.ok(first.attribution.includes(first.creator));assert.ok(first.originalUrl);
 const checksum=createHash('sha256').update(first.buffer).digest('hex');
 const next=await bundledPhotoSearch({...request,excludeSourceChecksums:[checksum]});
 assert.ok(next);assert.notEqual(createHash('sha256').update(next.buffer).digest('hex'),checksum);
});
test('bundled search rejects traversal and corrupted optional files without leaking their contents',async t=>{
 const temporary=await fs.mkdtemp(path.join(os.tmpdir(),'ledify-bundled-'));t.after(()=>fs.rm(temporary,{recursive:true,force:true}));
 const [entry]=(await catalog()).filter(e=>e.file==='coffee-beans.jpg');
 const manifestPath=path.join(temporary,'catalog.json');
 await fs.writeFile(path.join(temporary,'photo.jpg'),'corrupt');
 await fs.writeFile(manifestPath,JSON.stringify([{...entry,file:'photo.jpg'}]));
 assert.equal(await bundledPhotoSearch({query:'coffee',subject:'Coffee'},{manifestPath}),null);
 await fs.writeFile(manifestPath,JSON.stringify([{...entry,file:'../secret.jpg'}]));
 assert.equal(await bundledPhotoSearch({query:'coffee',subject:'Coffee'},{manifestPath}),null);
});
