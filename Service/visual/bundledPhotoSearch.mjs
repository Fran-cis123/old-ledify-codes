import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {rankCuratedPhotos} from '../webpage/curatedSelection.mjs';

const catalog=fileURLToPath(new URL('../../assets/webpage/curated/catalog.json',import.meta.url));
export async function bundledPhotoSearch(request,{manifestPath=catalog,acceptCandidate=()=>true}={}){
 if(request.signal?.aborted)return null;
 const entries=JSON.parse(await fs.readFile(manifestPath,'utf8'));
 const target={...request,role:'hero',query:request.searchQuery||request.query||'',topic:request.subject||request.topic||'',sectionTopic:request.slideTitle||request.sectionTopic||''};
 const ranked=rankCuratedPhotos(entries,target);
 const excluded=new Set(request.excludeSourceChecksums||[]);
 const offset=((request.slideNumber||1)-1+(request.attempt||0))%Math.max(ranked.length,1);
 // Rotate only equally ranked alternatives; subject relevance outranks variety.
 const top=ranked.filter(v=>v.score===ranked[0]?.score),rest=ranked.filter(v=>v.score!==ranked[0]?.score);
 const choices=[...top.slice(offset%Math.max(top.length,1)),...top.slice(0,offset%Math.max(top.length,1)),...rest];
 const root=await fs.realpath(path.dirname(manifestPath));
 for(const {entry} of choices){
  const candidate={...entry,description:entry.alt,originalUrl:entry.sourceUrl,mediaKind:'photograph',generationMethod:'licensed-search'};
  if(!acceptCandidate(candidate))continue;
  try{
   const file=await fs.realpath(path.join(root,entry.file));if(!file.startsWith(root+path.sep))continue;
   const bytes=await fs.readFile(file);const checksum=createHash('sha256').update(bytes).digest('hex');
   if(entry.sha256&&checksum!==entry.sha256||excluded.has(checksum))continue;
   if(request.signal?.aborted)return null;
   return {...entry,buffer:bytes,assetId:checksum,description:entry.alt,originalUrl:entry.sourceUrl,
    mediaKind:'photograph',generationMethod:'licensed-search',sourceType:'licensed-stock',
    attributionRequired:/^CC BY/i.test(entry.license),
    attribution:`${entry.creator} — ${entry.license}. Source: ${entry.sourceUrl}. Changes: ${entry.changes||'Resized and compressed by Ledify.'}`};
  }catch{ /* An absent or damaged optional local asset must not block search. */ }
 }
 return null;
}
