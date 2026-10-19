import sharp from 'sharp';
import fs from 'node:fs/promises';

// Checks real converter output; aesthetics and factual accuracy still require human review.
export async function validatePreviewImages(images,expected){
    if(images.length!==expected)throw new Error('Preview count does not match the approved plan');
    const pages=[];
    for(const [index,image] of images.entries()){
        const buffer=await fs.readFile(image.filePath);
        if(buffer.length<24||buffer.subarray(0,8).toString('hex')!=='89504e470d0a1a0a')throw new Error(`Preview ${index+1} is not a valid PNG`);
        const width=buffer.readUInt32BE(16),height=buffer.readUInt32BE(20);
        if(!width||!height||width*height>32_000_000||Math.abs(width/height-16/9)>.04)throw new Error(`Preview ${index+1} has invalid widescreen dimensions`);
        const stats=await sharp(buffer,{limitInputPixels:32_000_000}).resize(96,54,{fit:'fill'}).removeAlpha().stats();
        if(stats.channels.every(c=>c.stdev<1))throw new Error(`Preview ${index+1} appears blank`);
        pages.push({slideNumber:index+1,width,height,nonblank:true});
    }
    return {status:'passed',pages,aestheticReview:'not-automated'};
}
