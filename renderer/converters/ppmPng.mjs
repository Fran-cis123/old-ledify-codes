import sharp from 'sharp';
// Poppler's binary P6 output has a short ASCII header followed by RGB bytes.
// Keeping PNG encoding in libvips avoids Poppler's expensive compression path.
export function ppmRaster(buffer){
 const header=buffer.subarray(0,128).toString('ascii').match(/^P6\s+(\d+)\s+(\d+)\s+255\r?\n/);
 if(!header)throw new Error('Invalid rasterizer PPM header');
 const width=Number(header[1]),height=Number(header[2]),offset=header[0].length;
 if(width<1||height<1||width*height>32000000||buffer.length!==offset+width*height*3)throw new Error('Invalid rasterizer PPM dimensions');
 return {data:buffer.subarray(offset),width,height};
}
export async function ppmToPng(buffer){
 const {data,width,height}=ppmRaster(buffer);
 return sharp(data,{raw:{width,height,channels:3},limitInputPixels:32000000}).png({compressionLevel:1,adaptiveFiltering:false}).toBuffer();
}
