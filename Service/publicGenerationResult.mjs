// Public API projection. Internal services retain paths/assets for conversion,
// but HTTP clients only need identifiers, metadata and API-relative URLs.
const privateKeys = new Set(['filePath','previewDirectory','pptxPath','pdfPath','siteDirectory','slidesDirectory','directory','zipPath','cacheRoot','base64']);
export function publicGenerationResult(value) {
    if(value instanceof Date) return value.toISOString();
    if(Array.isArray(value)) return value.map(publicGenerationResult);
    if(value && typeof value === 'object') return Object.fromEntries(Object.entries(value)
        .filter(([key,child])=>!privateKeys.has(key) && !(key==='files'&&!Array.isArray(child)) && !(key==='data' && typeof child==='string' && /^(?:data:)?image\//.test(child)))
        .map(([key,child])=>[key,publicGenerationResult(child)]));
    return value;
}
export function compactOptionalContext(value) {
    if(Array.isArray(value)) return value.map(compactOptionalContext).filter(v=>v!==undefined);
    if(value && typeof value==='object'){
        const entries=Object.entries(value).map(([k,v])=>[k,compactOptionalContext(v)]).filter(([,v])=>v!==undefined);
        return entries.length?Object.fromEntries(entries):undefined;
    }
    return value === '' || value == null ? undefined : value;
}
