import JSZip from 'jszip';
import {PDFParse} from 'pdf-parse';
import {validateUploadedFile} from '../input/fileValidation.mjs';
import sharp from 'sharp';

const invalid=message=>Object.assign(new Error(message),{code:'INVALID_VISUAL_ASSET',stage:'input-extraction'});
export function validateVisualAssetInputs(context={}){
    if(context.visualAssets!=null&&(!Array.isArray(context.visualAssets)||context.visualAssets.length>8))throw invalid('context.visualAssets must contain at most eight image objects.');
    let bytes=0;
    for(const asset of context.visualAssets||[]){
        if(!asset||typeof asset!=='object'||!Number.isInteger(asset.slideNumber)||asset.slideNumber<1||asset.slideNumber>12||typeof asset.description!=='string'||asset.description.length<3||asset.description.length>600||typeof asset.usageRights!=='string'||asset.usageRights.length<3||asset.usageRights.length>600)throw invalid('Each visual asset needs slideNumber (1–12), description and an explicit usageRights statement.');
        if(typeof asset.dataUrl!=='string'||!/^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(asset.dataUrl)||asset.dataUrl.length>2800000)throw invalid('Visual assets must be PNG, JPEG or WebP base64 data URLs no larger than 2 MB each.');
        bytes+=asset.dataUrl.length;
    }
    if(bytes>12000000)throw invalid('Combined visual assets exceed the request budget.');
    if(context.documentImageSlides!=null&&(!Array.isArray(context.documentImageSlides)||context.documentImageSlides.length>8))throw invalid('documentImageSlides must contain at most eight explicit mappings.');
    for(const entry of context.documentImageSlides||[])if(!entry||!Number.isInteger(entry.slideNumber)||entry.slideNumber<1||entry.slideNumber>12||typeof entry.imageName!=='string'||entry.imageName.length>150||typeof entry.description!=='string'||entry.description.length>600)throw invalid('Document image mappings need imageName, slideNumber and description.');
    if(context.documentImageSlides?.length&&(typeof context.documentImageRights!=='string'||context.documentImageRights.length<3||context.documentImageRights.length>600))throw invalid('Provide documentImageRights before reusing embedded document pictures.');
}
export async function prepareInputImageAssets(context={},file){
    validateVisualAssetInputs(context);
    const assets=(context.visualAssets||[]).map((a,i)=>({buffer:Buffer.from(a.dataUrl.split(',')[1],'base64'),source:'User-provided image',sourceType:'user-upload',creator:'User-supplied; not independently verified',license:a.usageRights,attributionRequired:false,slideNumber:a.slideNumber,description:a.description,assetId:`user-${i}`,generationMethod:'user-provided'}));
    const mappings=context.documentImageSlides||[];
    if(mappings.length){
        if(!file)throw invalid('Attach a PDF or DOCX file to reuse its embedded images.');
        await validateUploadedFile(file);
        const extracted=[];
        if(file.mimetype==='application/pdf'){
            const parser=new PDFParse({data:file.buffer});
            try{
                // Bound pages and minimum dimensions. Names are pageNumber:imageName.
                const pages=[...new Set(mappings.map(m=>Number(m.imageName.split(':')[0])))];
                if(pages.some(p=>!Number.isInteger(p)||p<1||p>10))throw invalid('PDF image mappings use pageNumber:imageName on pages 1–10.');
                const result=await parser.getImage({partial:pages,imageThreshold:600,imageBuffer:true,imageDataUrl:false});
                for(const page of result.pages)for(const image of page.images)if(image.data?.length<=12*1024*1024)extracted.push({name:`${page.pageNumber}:${image.name}`,buffer:Buffer.from(image.data)});
            }catch(error){if(error.code==='INVALID_VISUAL_ASSET')throw error;throw invalid('Unable to extract embedded images from this PDF. Use a valid, unencrypted document.');}finally{await parser.destroy();}
        }else{
            const zip=await JSZip.loadAsync(file.buffer);
            for(const m of mappings){
                if(!/^word\/media\/[^/]+\.(?:png|jpe?g|webp)$/i.test(m.imageName))continue;
                const entry=zip.file(m.imageName);if(entry&&entry._data?.uncompressedSize<=12*1024*1024)extracted.push({name:m.imageName,buffer:await entry.async('nodebuffer')});
            }
        }
        for(const mapping of mappings){
            const image=extracted.find(a=>a.name===mapping.imageName);if(!image)throw invalid(`Mapped document image was not found within extraction limits: ${mapping.imageName}`);
            assets.push({buffer:image.buffer,source:'User document',sourceType:'document-extracted',creator:'Original document author; rights asserted by uploader',license:context.documentImageRights,attributionRequired:false,slideNumber:mapping.slideNumber,description:mapping.description,assetId:mapping.imageName,generationMethod:'document-extracted'});
        }
    }
    if(assets.length>8||assets.some(a=>assets.filter(b=>b.slideNumber===a.slideNumber).length>2))throw invalid('Provide at most eight images and at most two explicitly mapped images per slide.');
    for(const asset of assets)try{
        const meta=await sharp(asset.buffer,{limitInputPixels:32000000,failOn:'error'}).metadata();
        if(!['png','jpeg','webp'].includes(meta.format)||meta.pages>1||meta.width<800||meta.height<600)throw new Error('Unsupported format or dimensions');
        await sharp(asset.buffer,{limitInputPixels:32000000,failOn:'error'}).stats();
    }catch{throw invalid('A supplied image is invalid, animated, oversized, or below 800 × 600 pixels.');}
    const {visualAssets,documentImageSlides,documentImageRights,...cleanContext}=context;
    if(assets.length)cleanContext.imageAssetHints=assets.map(a=>({slideNumber:a.slideNumber,description:a.description,sourceType:a.sourceType}));
    return {assets,context:cleanContext};
}

export async function documentImageInventory(file){
    if(!file)throw invalid('Attach a PDF or DOCX in the file field.');
    await validateUploadedFile(file);const images=[];
    if(file.mimetype==='application/pdf'){
        const parser=new PDFParse({data:file.buffer});
        try{
            const result=await parser.getImage({first:10,imageThreshold:600,imageBuffer:false,imageDataUrl:false});
            for(const page of result.pages)for(const image of page.images)if(images.length<8&&image.width>=800&&image.height>=600)images.push({imageName:`${page.pageNumber}:${image.name}`,pageNumber:page.pageNumber,width:image.width,height:image.height});
        }catch{throw invalid('Unable to inspect images in this PDF. Use a valid, unencrypted document.');}finally{await parser.destroy();}
    }else{
        const zip=await JSZip.loadAsync(file.buffer);
        for(const entry of Object.values(zip.files).filter(e=>/^word\/media\/[^/]+\.(?:png|jpe?g|webp)$/i.test(e.name)&&e._data?.uncompressedSize<=12*1024*1024).slice(0,8))try{
            const meta=await sharp(await entry.async('nodebuffer'),{limitInputPixels:32000000}).metadata();
            if(meta.width>=800&&meta.height>=600)images.push({imageName:entry.name,width:meta.width,height:meta.height});
        }catch{}
    }
    return {images,limits:{maxImages:8,pdfFirstPages:10},usageRights:'Not verified. Supply documentImageRights and explicit slide mappings to reuse images.'};
}
