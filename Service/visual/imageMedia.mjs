// Independent source metadata, never the requested subject, determines whether
// a licensed search result is a photograph or a rendered graphic.
export function isPhotographicStock(record={}){
 const text=[record.title,record.alt,record.description,record.subject,record.categories,...(record.keywords||[])].filter(Boolean).join(' ');
 if(record.mediaKind&&record.mediaKind!=='photograph')return false;
 return !/\b(?:graphs?|charts?|infographics?|schematics?|diagrams?|illustrations?|drawings?|paintings?|screenshots?|logos?)\b|oil on canvas|3D render/i.test(text);
}
