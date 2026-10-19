import sharp from 'sharp';
import {PHOTO_FRAMES,PHOTO_VISIBLE_FRAMES} from './photoCompositions.mjs';

export async function validatePhotoPreviews(images,presentation){
    const results=[];
    for(const [i,slide] of presentation.slides.entries()){
        if(!slide.photoAsset)continue;
        for(const [assetIndex,asset] of (slide.photoAssets||[slide.photoAsset]).entries()){
        const painted={...(PHOTO_FRAMES[slide.photoComposition]||PHOTO_FRAMES['photo-editorial']),...(assetIndex===1?{y:4.8}:{})};
        const frame={...(PHOTO_VISIBLE_FRAMES[slide.photoComposition]||painted)};
        const file=images[i].filePath,meta=await sharp(file).metadata();
        const left=Math.round(frame.x/13.333333*meta.width),top=Math.round(frame.y/7.5*meta.height);
        const width=Math.min(meta.width-left,Math.round(frame.w/13.333333*meta.width)),height=Math.min(meta.height-top,Math.round(frame.h/7.5*meta.height));
        const sourceMeta=await sharp(asset.filePath).metadata();
        const region={left:Math.round((frame.x-painted.x)/painted.w*sourceMeta.width),top:Math.round((frame.y-painted.y)/painted.h*sourceMeta.height),width:Math.round(frame.w/painted.w*sourceMeta.width),height:Math.round(frame.h/painted.h*sourceMeta.height)};
        region.width=Math.min(region.width,sourceMeta.width-region.left);region.height=Math.min(region.height,sourceMeta.height-region.top);
        const expected=await sharp(asset.filePath).extract(region).resize(48,48,{fit:'fill'}).removeAlpha().raw().toBuffer();
        const actual=await sharp(file).extract({left,top,width,height}).resize(48,48,{fit:'fill'}).removeAlpha().raw().toBuffer();
        if(actual.length!==expected.length)throw Object.assign(new Error('Photo preview channel mismatch'),{code:'PNG_PHOTO_MISSING',slideNumber:i+1});
        const mae=actual.reduce((sum,v,n)=>sum+Math.abs(v-expected[n]),0)/actual.length;
        // Independent evidence after both PDF conversion and PNG rasterization.
        // Allows converter color changes/antialiasing, but rejects absent/replaced imagery.
        if(mae>26)throw Object.assign(new Error(`Slide ${i+1}: photograph differs from the embedded source after conversion`),{code:'PNG_PHOTO_MISSING',slideNumber:i+1});
        const resolution=Math.min(asset.width/painted.w,asset.height/painted.h);
        if(resolution<90)throw Object.assign(new Error('Photograph is below effective 90 pixels/inch'),{code:'PNG_PHOTO_RESOLUTION',slideNumber:i+1});
        results.push({slideNumber:i+1,assetId:asset.id,status:'passed',effectivePixelsPerInch:Math.round(resolution),pixelMeanAbsoluteError:Number(mae.toFixed(2)),frame,
            topicRelevance:'metadata and human review required',subjectCrop:'focal point applied; human review required'});
        }
    }
    return {status:'passed',photographs:results.length,slides:results};
}
