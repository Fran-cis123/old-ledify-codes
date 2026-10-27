// Preserve explicitly enumerated proper labels across industries. This is a
// narrow request contract, not entity inference from arbitrary source articles.
export function requestedLabels(instructions=''){
 const labels=[];
 for(const sentence of instructions.split(/(?<=[.!?])\s+|\n/)){
  if(/\b(?:avoid|exclude|without|do not include)\b/i.test(sentence))continue;
  for(const match of sentence.matchAll(/\b(?:featuring|including)\s+([^.!?\n]{3,400})/gi)){
   const parts=match[1].split(/,|\s+and\s+/).map(value=>value.trim()).filter(Boolean);
   if(parts.length<2||parts.length>12||parts.some(value=>value.length>60||!/^\p{Lu}[\p{L}\p{N} '&()-]*$/u.test(value)))continue;
   labels.push(...parts);
  }
 }
 return [...new Set(labels)];
}
export function validateRequestedLabels(page,labels=[]){
 const text=[page.hero?.headline,page.hero?.subheadline,...(page.sections||[]).flatMap(section=>[section.heading,section.content,...section.items.flatMap(item=>[item.title,item.description])])].join(' ').toLowerCase();
 const missing=labels.filter(label=>!text.includes(label.toLowerCase()));
 if(missing.length)throw Object.assign(new Error('Preserve these explicitly requested labels in visible content: '+missing.join(', ')),{code:'AI_SCHEMA_VALIDATION_FAILED',field:'sections',validationRule:'REQUEST_COVERAGE',repairHint:'Include all these source-supplied labels without inventing specifications, availability or inventory: '+missing.join(', ')});
}
