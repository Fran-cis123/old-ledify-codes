// Explicit maintenance command, never run during generation or deployment.
import fs from 'node:fs/promises';
import path from 'node:path';
import * as cheerio from 'cheerio';
import sharp from 'sharp';
import {createHash} from 'node:crypto';
import { fetchPublicResource, fetchPublicText } from '../Service/input/publicUrl.mjs';

const entries=[
    {industry:'healthcare',file:'laboratory.jpg',title:'CDC scientist transfers H7N9.png',creator:'James Gathany / CDC',license:'Public domain (US federal government)',licenseUrl:'https://creativecommons.org/publicdomain/mark/1.0/',alt:'A CDC scientist pipetting samples in a laboratory',subject:'laboratory research',thumbnail:true},
    {industry:'hospitality',file:'food.jpg',title:'Cobb salad - Cambridge, MA - 20191114 122911.jpg',creator:'Daderot',license:'CC0 1.0',licenseUrl:'https://creativecommons.org/publicdomain/zero/1.0/',alt:'A prepared Cobb salad photographed in Cambridge, Massachusetts',subject:'food photography'},
    {industry:'real-estate',file:'interior.jpg',title:'Modern wooden house interior (Unsplash).jpg',creator:'Jolene Hardy',license:'CC0 1.0 (published before 5 June 2017)',licenseUrl:'https://creativecommons.org/publicdomain/zero/1.0/',alt:'A modern wooden interior with a lounge, bar and pool table',subject:'residential interior'},
    {industry:'legal',file:'courthouse-facade.jpg',title:'Courthouse facade, Rome, Italy.jpg',creator:'Jebulon',license:'CC0 1.0',licenseUrl:'https://creativecommons.org/publicdomain/zero/1.0/',alt:'The facade of the Palace of Justice in Rome, Italy',subject:'court architecture'},
    {industry:'education',file:'library.jpg',title:'Estantería de la Biblioteca Vasconcelos.jpg',creator:'Jorge Mendoza',license:'CC0 1.0',licenseUrl:'https://creativecommons.org/publicdomain/zero/1.0/',alt:'Book stacks and walkways inside the Vasconcelos public library in Mexico City',subject:'library and learning environment'},
    {industry:'retail',file:'clothing.jpg',title:'Clothing organized at home (Unsplash).jpg',creator:'Tim Wright',license:'CC0 1.0 (published before 5 June 2017)',licenseUrl:'https://creativecommons.org/publicdomain/zero/1.0/',alt:'Shirts and jackets hanging on a clothing rail in a home in San Diego',subject:'fashion clothing wardrobe',keywords:['apparel','garments','textiles']}
];
const root=path.resolve('assets/webpage/curated');await fs.mkdir(root,{recursive:true});
const manifest=[];
for(const entry of entries){
    const sourceUrl='https://commons.wikimedia.org/wiki/File:'+encodeURIComponent(entry.title.replaceAll(' ','_'));
    const existing=path.join(root,entry.file);
    try{await fs.access(existing);manifest.push({...entry,title:undefined,thumbnail:undefined,role:'hero',source:'Wikimedia Commons curated catalog',sourceUrl,illustrative:true,changes:'Resized and compressed by Ledify.'});continue;}catch{}
    try{
    const title=entry.title.replaceAll(' ','_'),hash=createHash('md5').update(title).digest('hex');
    let imageUrl=`https://thumb.wikimedia.org/wikipedia/commons/thumb/${hash[0]}/${hash.slice(0,2)}/${encodeURIComponent(title)}/1280px-${encodeURIComponent(title)}`;
    if(entry.thumbnail){
    const {text}=await fetchPublicText(sourceUrl,{maxBytes:1024*1024,timeoutMs:30000});
    const $=cheerio.load(text);
    imageUrl=$('.fullImageLink a').first().attr('href');
    if(entry.thumbnail)imageUrl=$('a').map((_,node)=>$(node).attr('href')).get().find(url=>url?.includes('1280px-CDC_scientist_transfers_H7N9.png')) || $('.fullImageLink img').attr('src');
    }
    if(!imageUrl)throw new Error('No image URL for '+entry.title);
    imageUrl=new URL(imageUrl,sourceUrl).href;
    if(!/(^|\.)wikimedia\.org$/.test(new URL(imageUrl).hostname))throw new Error('Unexpected media host');
    const {buffer}=await fetchPublicResource(imageUrl,{maxBytes:20*1024*1024,timeoutMs:45000,contentTypes:/^image\/(png|jpeg)(?:;|$)/i,accept:'image/jpeg,image/png'});
    const output=await sharp(buffer,{limitInputPixels:20_000_000,failOn:'error'}).rotate().resize({width:1600,height:1600,fit:'inside',withoutEnlargement:true}).jpeg({quality:84,mozjpeg:true}).toBuffer();
    await fs.writeFile(path.join(root,entry.file),output);
    manifest.push({...entry,title:undefined,thumbnail:undefined,role:'hero',source:'Wikimedia Commons curated catalog',sourceUrl,originalImageUrl:imageUrl,illustrative:true,changes:'Resized and compressed by Ledify; further responsive derivatives may be created.'});
    console.log(JSON.stringify({file:entry.file,bytes:output.length,sourceUrl}));
    }catch(error){console.log(JSON.stringify({file:entry.file,status:'unavailable',reason:error.code || error.message}));}
    await fs.writeFile(path.join(root,'catalog.json'),JSON.stringify(manifest,null,2));
    await new Promise(resolve=>setTimeout(resolve,1500));
}
await fs.writeFile(path.join(root,'catalog.json'),JSON.stringify(manifest,null,2));
