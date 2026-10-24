import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {once} from 'node:events';
import JSZip from 'jszip';
import {load} from 'cheerio';
import {createApp} from '../../src/app.mjs';
import {webpageLayoutService} from '../../Service/webpageLayoutService.mjs';
import {webpageThemeService} from '../../Service/webpageThemeService.mjs';
import {acquireWebsiteImages} from '../../Service/webpage/imagePipeline.mjs';
import {webpageRenderer} from '../../renderer/webpage/webpageRenderer.mjs';
import {webpageArtifactService} from '../../Service/webpageArtifactService.mjs';
import {fixtures,fixturePlan,fixtureDraft} from '../webpage/fixtures.mjs';
import {commonsSearch} from '../../Service/visual/imageProviders.mjs';
import {classifyImageError} from '../../Service/visual/imageAssetService.mjs';

const close=server=>new Promise(resolve=>{server.close(resolve);server.closeAllConnections();});
async function start(root){const server=createApp({webpageRoot:root,generator:async()=>{throw new Error('Delivery tests must not generate');}}).listen(0,'127.0.0.1');await once(server,'listening');return {server,base:`http://127.0.0.1:${server.address().port}`};}
test('preview HTTP images, CSS references and ZIP bytes stay identical across server reconstruction',async t=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'ledify-image-delivery-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));
 const fixture=fixtures.pharmaceutical,page=webpageThemeService(webpageLayoutService({outputType:'webpage',...fixturePlan(fixture),...fixtureDraft(fixture)}));
 const acquired=await acquireWebsiteImages(page,{}, {external:false,optimization:{cacheRoot:path.join(root,'cache')},logger:()=>{}});assert.ok(acquired.page.visualAssets.hero);
 const files=webpageRenderer(acquired.page,acquired.assets),firstImage=Object.keys(acquired.assets)[0];files['style.css']+=`\n.test-photo{background-image:url("./${firstImage}")}\n`;
 const artifact=await webpageArtifactService(files,{root});let current;
 try{for(let run=0;run<2;run++){
   current=await start(root);const preview=await fetch(current.base+artifact.previewUrl);assert.equal(preview.status,200);assert.match(await preview.text(),/iframe/);
   const site=await fetch(current.base+artifact.siteUrl),html=await site.text(),$=load(html);assert.ok($('img').length);
   const download=await fetch(current.base+artifact.downloadUrl);assert.equal(download.status,200);const archive=await JSZip.loadAsync(await download.arrayBuffer(),{checkCRC32:true});
   for(const [name,bytes] of Object.entries(acquired.assets)){
    const response=await fetch(new URL('./'+name,current.base+artifact.siteUrl));assert.equal(response.status,200);assert.match(response.headers.get('content-type'),/^image\/webp/);assert.deepEqual(Buffer.from(await response.arrayBuffer()),bytes);assert.deepEqual(await archive.file('my-website/'+name).async('nodebuffer'),bytes);
   }
   const css=await fetch(new URL('./style.css',current.base+artifact.siteUrl));assert.equal(css.status,200);assert.match(await css.text(),/test-photo/);
   await close(current.server);current=null;
  }
  current=await start(root);const filename=path.join(artifact.files.siteDirectory,firstImage);await fs.writeFile(filename,'corrupt');let response=await fetch(new URL('./'+firstImage,current.base+artifact.siteUrl));assert.equal(response.status,404);assert.equal((await response.json()).errorCode,'IMAGE_DELIVERY_FAILED');
  await fs.unlink(filename);response=await fetch(new URL('./'+firstImage,current.base+artifact.siteUrl));assert.equal(response.status,404);
 }finally{if(current)await close(current.server);}
});
test('failed or expired image downloads do not return external links as successful assets',async()=>{
 const candidate={source:'Wikimedia Commons',creator:'Fixture',license:'CC0',mediaKind:'photograph',originalUrl:'https://commons.wikimedia.org/wiki/File:Laboratory.jpg',description:'Laboratory photo',downloadUrl:'https://example.org/expired.jpg'};
 let calls=0;await assert.rejects(commonsSearch({searchQuery:'Laboratory'},{find:async()=>[candidate],download:async()=>{calls++;throw Object.assign(new Error('Expired signed URL'),{status:410,imageOperation:'download'});}}),e=>classifyImageError(e).reasonCode==='IMAGE_DOWNLOAD_UNAVAILABLE');assert.equal(calls,1);
});
