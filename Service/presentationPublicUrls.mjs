export function addPresentationPublicUrls(result, req) {
    if(result.outputType!=='presentation' || !result.preview)return result;
    const configured=process.env.PUBLIC_API_BASE_URL || process.env.RENDER_EXTERNAL_URL;
    const forwarded=req.get?.('x-forwarded-proto');
    const protocol=forwarded==='https'?'https':req.protocol || 'http';
    const origin=configured || `${protocol}://${req.get?.('host') || 'localhost'}`;
    const absolute=value=>value?new URL(value,origin).href:null;
    const preview=result.preview;
    return {...result,preview:{...preview,
        pdfPreviewUrl:absolute(preview.previewUrl),
        previewAvailable:!!preview.previewUrl || (preview.slides || []).length>0,
        slideImagesAvailable:(preview.slides || []).length>0,
        downloadUrls:Object.fromEntries(Object.entries(preview.downloads || {}).map(([key,value])=>[key,absolute(value)])),
        slides:(preview.slides || []).map(slide=>({...slide,imageUrl:absolute(slide.url)}))
    }};
}
