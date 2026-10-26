// Explicit maintenance workflow. Never runs on request or on deployment.
import fs from 'node:fs/promises';
import path from 'node:path';
import * as cheerio from 'cheerio';
import sharp from 'sharp';
import {createHash} from 'node:crypto';
const root=path.resolve('generated/catalog-expansion');
await fs.mkdir(root,{recursive:true});
const categories={
 food:'Featured pictures of food',fruit:'Featured pictures of fruit',
 computers:'Printed circuit boards',servers:'Server rooms',
 healthcare:'MRI scanners',laboratory:'Laboratory equipment',
 education:'Featured pictures of libraries',finance:'Financial districts',
 solar:'Solar panels',wind:'Wind farms',
 agriculture:'Featured pictures of agriculture',property:'Contemporary houses',
 travel:'Featured pictures of landscapes',space:'Featured pictures of space exploration',
 marine:'Sea turtles underwater',forest:'Featured pictures of forests',
 sports:'Featured pictures of sports',music:'Featured pictures of musical instruments',
 automotive:'Featured pictures of automobiles',construction:'Tower cranes',
 fashion:'Clothing shops',hospitality:'Luxury hotels',
 logistics:'Container ships',manufacturing:'Industrial robots',
 learning:'Classrooms',business:'Meetings',beauty:'Cosmetics',fitness:'Gyms',craft:'Pottery',coffee:'Coffee drinks'
};
const pause=()=>new Promise(r=>setTimeout(r,1200));
async function resource(url){
 if(!['commons.wikimedia.org','upload.wikimedia.org','thumb.wikimedia.org'].includes(new URL(url).hostname))throw new Error('Unapproved maintenance source');
 const response=await fetch(url,{headers:{'User-Agent':'LedifyAssetMaintenance/1.0 (manual licensed-photo curation)'},signal:AbortSignal.timeout(30000)});
 if(!response.ok)throw new Error('HTTP '+response.status);
 const bytes=Buffer.from(await response.arrayBuffer());if(bytes.length>25*1024*1024)throw new Error('Source too large');return bytes;
}
async function html(url,file){try{return await fs.readFile(file,'utf8');}catch{}const value=(await resource(url)).toString();await fs.writeFile(file,value);await pause();return value;}
if(process.argv[2]==='discover'){
 const result={};
 for(const [key,category] of Object.entries(categories)){
  try{const $=cheerio.load(await html('https://commons.wikimedia.org/wiki/Category:'+encodeURIComponent(category.replaceAll(' ','_')),path.join(root,key+'.html')));
   result[key]=$('.gallerybox').map((_,el)=>{const a=$(el).find('.galleryfilename');return {title:a.attr('title')?.replace(/^File:/,''),page:a.attr('href'),thumbnail:$(el).find('img').attr('src')};}).get().filter(v=>v.title&&/\.(?:jpe?g|png)$/i.test(v.title));
   console.log(key,result[key].length);
  }catch(error){console.log(key,error.message);result[key]=[];}
 }
 await fs.writeFile(path.join(root,'discovery.json'),JSON.stringify(result,null,2));
}
if(process.argv[2]==='acquire'){
 const picks=JSON.parse(await fs.readFile(path.join(root,'picks.json'),'utf8'));const records=[];
 for(const pick of picks){
  try{
   const sourceUrl='https://commons.wikimedia.org/wiki/File:'+encodeURIComponent(pick.title.replaceAll(' ','_'));
   const $=cheerio.load(await html(sourceUrl,path.join(root,pick.id+'.source.html')));
   const licenses=$('.licensetpl').map((_,el)=>({name:$(el).find('.licensetpl_short').first().text().trim(),url:$(el).find('.licensetpl_link').first().text().trim()||$(el).find('.licensetpl_link a').first().attr('href')})).get();
   const license=licenses.find(v=>/^(CC0|Public domain|CC BY(?:-SA)? )/i.test(v.name)&&!/(?:NC|ND)/i.test(v.name));
   if(!license)throw new Error('No supported reusable license: '+JSON.stringify(licenses));
   const artist=$('#fileinfotpl_aut').parent().find('td').last().text().replace(/\s+/g,' ').trim();
   if(!artist)throw new Error('No verified artist');
   let original=$('.fullImageLink a').first().attr('href');if(original?.startsWith('//'))original='https:'+original;
   if(!original)throw new Error('No original');
   const thumb=$('.fullImageLink img').first().attr('src');
   let imageUrl=thumb?.replace(/\/\d+px-([^/]+)$/,'/1600px-$1');if(imageUrl?.startsWith('//'))imageUrl='https:'+imageUrl;
   // Use Commons' own offered preview rather than constructing unsupported sizes.
   const offers=$('.fullImageLink').parent().find('a').map((_,el)=>$(el).attr('href')).get().filter(v=>/\/(?:1280|1600|1920)px-/.test(v||''));
   imageUrl=offers.find(v=>v.includes('/1600px-'))||offers.find(v=>v.includes('/1280px-'))||offers[0]||imageUrl||original;
   imageUrl=new URL(imageUrl,sourceUrl).href;
   const filename=pick.id==='food-main'?'food.jpg':pick.id+'.jpg';const file=path.join(root,filename);
   let buffer;try{buffer=await fs.readFile(file);}catch{let bytes;try{bytes=await resource(imageUrl);}catch{bytes=await resource(original);}buffer=await sharp(bytes,{limitInputPixels:100_000_000}).rotate().resize({width:1600,height:1600,fit:'inside',withoutEnlargement:true}).jpeg({quality:86,mozjpeg:true}).toBuffer();await fs.writeFile(file,buffer);await pause();}
   const meta=await sharp(buffer).metadata();if(meta.width<1000||meta.height<600||meta.width/meta.height>2.8||meta.width/meta.height<.6)throw new Error('Unsuitable dimensions '+meta.width+'x'+meta.height);
   const record={industry:pick.industry,file:filename,creator:artist,license:license.name,licenseUrl:license.url||(/CC0/i.test(license.name)?'https://creativecommons.org/publicdomain/zero/1.0/':'https://creativecommons.org/publicdomain/mark/1.0/'),alt:pick.alt,subject:pick.subject,keywords:pick.keywords||[],source:'Wikimedia Commons curated catalog',sourceUrl,originalImageUrl:original,illustrative:true,changes:'Resized and compressed by Ledify.',width:meta.width,height:meta.height};
   records.push(record);console.log('OK',filename,license.name);
  }catch(error){console.log('FAILED',pick.id,error.message);}
  await fs.writeFile(path.join(root,'candidates.json'),JSON.stringify(records,null,2));
 }
}
if(process.argv[2]==='publish'){
 const approval=JSON.parse(await fs.readFile(path.join(root,'approved.json'),'utf8'));
 const candidates=JSON.parse(await fs.readFile(path.join(root,'candidates.json'),'utf8'));
 const destination=path.resolve('assets/webpage/curated');
 const existing=JSON.parse(await fs.readFile(path.join(destination,'catalog.json'),'utf8'));
 const additions=[];
 for(const filename of approval.files){
  const record=candidates.find(v=>v.file===filename);if(!record||!/^[-a-z0-9]+\.jpg$/.test(filename))throw new Error('Unreviewed candidate '+filename);
  const corrected={...record,...approval.corrections?.[filename],quality:'reviewed',reviewedOn:approval.reviewedOn};
  const bytes=await fs.readFile(path.join(root,filename));additions.push({...corrected,sha256:createHash('sha256').update(bytes).digest('hex')});
 }
 const records=[...existing.filter(v=>!additions.some(a=>a.file===v.file)),...additions];
 for(const record of records){
  const bytes=additions.some(a=>a.file===record.file)?await fs.readFile(path.join(root,record.file)):await fs.readFile(path.join(destination,record.file));
  const meta=await sharp(bytes).metadata();record.width=meta.width;record.height=meta.height;record.sha256=createHash('sha256').update(bytes).digest('hex');
  record.licenseUrl=record.licenseUrl.replace(/^http:\/\/creativecommons\.org\//,'https://creativecommons.org/');
  if(additions.some(a=>a.file===record.file))await fs.writeFile(path.join(destination,record.file),bytes);
 }
 await fs.writeFile(path.join(destination,'catalog.json'),JSON.stringify(records,null,2)+'\n');console.log('Published '+records.length+' photos');
}
