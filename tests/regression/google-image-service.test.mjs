import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import {generateGoogleImage,googleImageModel} from '../../Service/visual/googleImageService.mjs';

const env={GEMINI_API_KEY:'test-key',GOOGLE_IMAGE_MODEL:'gemini-3.1-flash-image'};
test('shared Google image service saves validated bytes and reuses a checksum-verified cache',async t=>{
    const root=await fs.mkdtemp(path.join(os.tmpdir(),'ledify-google-image-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));
    const buffer=await fs.readFile('assets/webpage/curated/laboratory.jpg');let calls=0;
    const client={models:{generateContent:async()=>{calls++;return {candidates:[{content:{parts:[{inlineData:{mimeType:'image/jpeg',data:buffer.toString('base64')}}]}}]};}}};
    const options={env,client,cache:true,cacheRoot:root},request={prompt:'A laboratory concept',aspectRatio:'16:9'};
    const [first,second]=await Promise.all([generateGoogleImage(request,options),generateGoogleImage(request,options)]);
    assert.equal(calls,1);assert.deepEqual(first.buffer,second.buffer);
    const hit=await generateGoogleImage(request,options);assert.equal(hit.cacheHit,true);assert.equal(calls,1);
    await fs.writeFile(first.filePath,'corrupt');
    const repaired=await generateGoogleImage(request,options);assert.equal(repaired.cacheHit,false);assert.equal(calls,2);
    await fs.unlink(repaired.filePath);
    assert.equal((await generateGoogleImage(request,options)).cacheHit,false);assert.equal(calls,3);
    const metadataFile=(await fs.readdir(root)).find(name=>name.endsWith('.json'));
    const metadata=JSON.parse(await fs.readFile(path.join(root,metadataFile),'utf8'));
    await fs.writeFile(path.join(root,metadataFile),JSON.stringify({...metadata,createdAt:Date.now()-8*86400000}));
    assert.equal((await generateGoogleImage(request,options)).cacheHit,false);assert.equal(calls,4);
});
test('shared Google image service rejects a blank generated image',async()=>{
    const buffer=await sharp({create:{width:512,height:512,channels:3,background:'#ffffff'}}).png().toBuffer();
    await assert.rejects(generateGoogleImage({prompt:'Laboratory'},{env,client:{models:{generateContent:async()=>({candidates:[{content:{parts:[{inlineData:{mimeType:'image/png',data:buffer.toString('base64')}}]}}]})}}}),{code:'IMAGE_INVALID'});
});
test('shared service rejects empty, blocked and invalid image responses without paid retries',async()=>{
    let calls=0;
    for(const parts of [[],[{inlineData:{mimeType:'image/png',data:Buffer.from('invalid').toString('base64')}}]]){
        await assert.rejects(generateGoogleImage({prompt:'Laboratory'},{env,client:{models:{generateContent:async()=>{calls++;return {candidates:[{content:{parts}}]};}}}}));
    }
    assert.equal(calls,2);
});
test('2.5 image model omits unsupported resolution and legacy pipeline model overrides shared configuration',async()=>{
    let sent;const buffer=await fs.readFile('assets/webpage/curated/laboratory.jpg');
    await generateGoogleImage({prompt:'Laboratory',resolution:'2K'},{env,model:'gemini-2.5-flash-image',client:{models:{generateContent:async value=>{sent=value;return {candidates:[{content:{parts:[{inlineData:{mimeType:'image/jpeg',data:buffer.toString('base64')}}]}}]};}}}});
    assert.equal(sent.config.imageConfig.imageSize,undefined);assert.equal(sent.config.httpOptions.retryOptions.attempts,1);
    assert.equal(googleImageModel({...env,WEBPAGE_IMAGE_MODEL:'legacy'},'WEBPAGE_IMAGE_MODEL'),'legacy');
    assert.equal(googleImageModel(env,'WEBPAGE_IMAGE_MODEL'),'gemini-3.1-flash-image');
});
