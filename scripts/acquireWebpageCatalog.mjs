// Compatibility entry point: verify the current curated manifest. The previous
// six-photo acquisition list must never overwrite a larger reviewed collection.
// Use curateBundledPhotos.mjs discover/acquire/publish for reviewed additions.
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import sharp from 'sharp';

const root=path.resolve('assets/webpage/curated');
const entries=JSON.parse(await fs.readFile(path.join(root,'catalog.json'),'utf8'));
let failed=0,total=0;
for(const entry of entries){
 try{
  if(!/^[-a-z0-9]+\.jpg$/.test(entry.file))throw new Error('Invalid local filename');
  const bytes=await fs.readFile(path.join(root,entry.file));
  if(createHash('sha256').update(bytes).digest('hex')!==entry.sha256)throw new Error('Checksum mismatch');
  const metadata=await sharp(bytes).metadata();
  if(metadata.width!==entry.width||metadata.height!==entry.height||metadata.format!=='jpeg')throw new Error('Invalid dimensions or format');
  if(!entry.creator||!entry.license||!entry.sourceUrl||!entry.licenseUrl)throw new Error('Missing provenance');
  total+=bytes.length;
 }catch(error){failed++;console.error(entry.file,error.message);}
}
console.log(JSON.stringify({photos:entries.length,bytes:total,failed}));
if(failed)process.exitCode=1;
