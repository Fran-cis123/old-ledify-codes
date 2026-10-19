import fs from 'node:fs/promises';
import path from 'node:path';
import { inflate } from 'node:zlib';
import { promisify } from 'node:util';
import { webpageError } from './webpageContentValidator.mjs';

// Deployment-owned catalog only. Source text and AI output never select a file path.
export async function resolveWebpageAssets(page, options = {}) {
    const manifestPath = options.manifestPath || process.env.LEDIFY_WEBPAGE_IMAGE_MANIFEST;
    const assets = {}, warnings = [];
    if (!manifestPath) return {page,assets,warnings:[{code:'WEBPAGE_IMAGERY_UNAVAILABLE',message:'No licensed image catalog is configured; a content-led composition is used.'}]};
    try {
        const catalogPath = path.resolve(manifestPath), root = await fs.realpath(path.dirname(catalogPath));
        const manifestInfo = await fs.stat(catalogPath);
        if (manifestInfo.size > 65536) throw new Error('Image catalog is too large');
        const entries = JSON.parse(await fs.readFile(catalogPath,'utf8'));
        if (!Array.isArray(entries) || entries.length > 100) throw new Error('Expected a bounded image catalog');
        const candidates = entries.filter(entry=>entry.industry === page.designBrief.industry && (!entry.brandName || entry.brandName === page.brandName));
        const selected = [], used = new Set();
        for (const entry of candidates) {
            if (selected.length === 4) break;
            if (!['hero','section','item'].includes(entry.role) || !entry.alt?.trim() || entry.alt.length>240 || !entry.license?.trim() || !entry.creator?.trim() || !entry.file || used.has(entry.file)) continue;
            if(entry.role==='hero' && selected.some(asset=>asset.role==='hero'))continue;
            if(entry.role==='item' && (entry.brandName!==page.brandName || !page.sections.some(section=>section.type===entry.sectionType && section.items.some(item=>item.title===entry.itemTitle))))continue;
            if (/[/\\]/.test(entry.file) && path.isAbsolute(entry.file)) throw new Error('Absolute catalog image paths are not allowed');
            const filename = await fs.realpath(path.resolve(root,entry.file));
            if (!filename.startsWith(root+path.sep)) throw new Error('Catalog image must stay inside its directory');
            const stat = await fs.stat(filename);
            if (!stat.isFile() || stat.size > 2*1024*1024) throw new Error('Catalog image exceeds the two MiB limit');
            const bytes = await fs.readFile(filename);
            const dimensions = rasterDimensions(bytes);
            if (!dimensions || dimensions.width<100 || dimensions.height<100 || dimensions.width>2400 || dimensions.height>2400) throw new Error('Use a valid PNG/JPEG between 100 and 2400 pixels per side');
            await validateRaster(bytes,dimensions);
            const output = `assets/images/catalog-${selected.length+1}.${dimensions.extension}`;
            assets[output]=bytes;
            selected.push({url:`./${output}`,alt:entry.alt,width:dimensions.width,height:dimensions.height,license:entry.license,creator:entry.creator,role:entry.role,sectionType:entry.sectionType || '',itemTitle:entry.itemTitle || '',caption:entry.caption || '',source:entry.source,sourceUrl:entry.sourceUrl,licenseUrl:entry.licenseUrl,illustrative:entry.authentic!==true});
            used.add(entry.file);
        }
        const hero=selected.find(asset=>asset.role==='hero');
        const usedSections=new Set();
        const sections=page.sections.map(section=>{
            const asset=selected.find(asset=>asset.role==='section' && asset.sectionType===section.type && !usedSections.has(asset.url));
            if(asset)usedSections.add(asset.url);
            const items=section.items.map(item=>{
                const image=selected.find(asset=>asset.role==='item' && asset.sectionType===section.type && asset.itemTitle===item.title);
                return {...item,...(image?{image}:{})};
            });
            return {...section,items,...(asset?{image:asset}:{})};
        });
        const credits=selected.map(({url,creator,license})=>({url,creator,license}));
        if(!hero)warnings.push({code:'WEBPAGE_IMAGERY_UNAVAILABLE',message:'No matching licensed hero image; the website uses its own content as the hero composition.'});
        return {page:{...page,sections,visualAssets:{hero,credits}},assets,warnings};
    } catch (error) {
        if(options.strict)throw webpageError(error.message,'imageCatalog','WEBPAGE_ASSET_INVALID');
        return {page,assets:{},warnings:[{code:'WEBPAGE_ASSET_CATALOG_INVALID',message:'The configured image catalog could not be used; a content-led composition is used.'}]};
    }
}

export function rasterDimensions(bytes) {
    if(bytes.length>=30 && bytes.toString('ascii',0,4)==='RIFF' && bytes.toString('ascii',8,12)==='WEBP'){
        const chunk=bytes.toString('ascii',12,16);
        if(chunk==='VP8X')return {width:bytes.readUIntLE(24,3)+1,height:bytes.readUIntLE(27,3)+1,extension:'webp'};
        if(chunk==='VP8 ')return {width:bytes.readUInt16LE(26)&0x3fff,height:bytes.readUInt16LE(28)&0x3fff,extension:'webp'};
        if(chunk==='VP8L'){const bits=bytes.readUInt32LE(21);return {width:(bits&0x3fff)+1,height:((bits>>>14)&0x3fff)+1,extension:'webp'};}
    }
    if(bytes.length>=33 && bytes.subarray(0,8).toString('hex')==='89504e470d0a1a0a' && bytes.toString('ascii',12,16)==='IHDR')return {width:bytes.readUInt32BE(16),height:bytes.readUInt32BE(20),extension:'png'};
    if(bytes.length<4 || bytes[0]!==255 || bytes[1]!==216)return null;
    let position=2;
    while(position+4<bytes.length){
        if(bytes[position++]!==255)return null;
        while(bytes[position]===255)position++;
        const marker=bytes[position++];
        if(marker===217 || marker===218)return null;
        const length=bytes.readUInt16BE(position);
        if(length<2 || position+length>bytes.length)return null;
        if([192,193,194].includes(marker) && length>=8)return {height:bytes.readUInt16BE(position+3),width:bytes.readUInt16BE(position+5),extension:'jpg'};
        position+=length;
    }
    return null;
}

// Validate before bundling without passing potentially corrupt input to a native decoder.
export async function validateRaster(bytes,dimensions=rasterDimensions(bytes)) {
    if(!dimensions)throw new Error('Invalid raster image');
    if(dimensions.extension==='jpg'){
        if(bytes.at(-2)!==255 || bytes.at(-1)!==217 || bytes.indexOf(Buffer.from([255,218]))<0)throw new Error('Truncated JPEG image');
        return;
    }
    let position=8,ended=false;const data=[];
    while(position+12<=bytes.length){
        const size=bytes.readUInt32BE(position),end=position+12+size;
        if(end>bytes.length)throw new Error('Truncated PNG chunk');
        const type=bytes.toString('ascii',position+4,position+8);
        if(crc32(bytes.subarray(position+4,end-4))!==bytes.readUInt32BE(end-4))throw new Error('Invalid PNG checksum');
        if(type==='IDAT')data.push(bytes.subarray(position+8,end-4));
        if(type==='IEND'){ended=true;position=end;break;}
        position=end;
    }
    if(!ended || position!==bytes.length || !data.length)throw new Error('Incomplete PNG image');
    const channels={0:1,2:3,3:1,4:2,6:4}[bytes[25]];
    if(bytes[24]!==8 || !channels || bytes[28]!==0)throw new Error('Catalog PNGs must use eight-bit, non-interlaced encoding');
    const stride=dimensions.width*channels+1;
    const decoded=await promisify(inflate)(Buffer.concat(data),{maxOutputLength:32*1024*1024});
    if(decoded.length!==stride*dimensions.height)throw new Error('Invalid PNG raster length');
    for(let row=0;row<dimensions.height;row++)if(decoded[row*stride]>4)throw new Error('Invalid PNG filter');
}
const crcTable=Uint32Array.from({length:256},(_,index)=>{let c=index;for(let bit=0;bit<8;bit++)c=c&1?0xedb88320^(c>>>1):c>>>1;return c>>>0;});
function crc32(bytes){let crc=0xffffffff;for(const byte of bytes)crc=crcTable[(crc^byte)&255]^(crc>>>8);return (crc^0xffffffff)>>>0;}
