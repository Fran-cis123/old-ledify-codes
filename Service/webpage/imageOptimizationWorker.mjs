import sharp from 'sharp';
sharp.cache({memory:24,files:0,items:10});
sharp.concurrency(1);
process.once('message',async ({buffer})=>{
    try{
        if(!Buffer.isBuffer(buffer)||buffer.length>12*1024*1024)throw new Error('Image byte limit exceeded');
        const metadata=await sharp(buffer,{limitInputPixels:16_000_000,failOn:'error'}).metadata();
        if(!['jpeg','png','webp'].includes(metadata.format)||metadata.pages>1||metadata.width<100||metadata.height<100)throw new Error('Unsupported image');
        const widths=[...new Set([480,960,1600].map(width=>Math.min(width,metadata.width)))].sort((a,b)=>a-b);
        const variants=[];
        for(const width of widths){
            const {data,info}=await sharp(buffer,{limitInputPixels:16_000_000,failOn:'error'}).rotate().resize({width,height:1600,fit:'inside',withoutEnlargement:true}).webp({quality:80,effort:3}).toBuffer({resolveWithObject:true});
            if(data.length>1024*1024)throw new Error('Optimized image exceeds byte limit');
            variants.push({buffer:data,width:info.width,height:info.height});
        }
        process.send({variants},()=>process.disconnect());
    }catch{process.send({error:'Image could not be safely decoded and optimized'},()=>process.disconnect());}
});
