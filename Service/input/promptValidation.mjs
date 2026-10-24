export const MIN_PROMPT_CHARACTERS=10,MAX_PROMPT_CHARACTERS=2000;
export function validateTextPrompt(value,{optional=false}={}){
    if(optional&&(value==null||value===''))return '';
    if(typeof value!=='string')throw Object.assign(new Error('textPrompt must be text.'),{code:'INVALID_TEXT_PROMPT',field:'textPrompt'});
    const prompt=value.trim();
    if(optional&&!prompt)return '';
    if(prompt.length<MIN_PROMPT_CHARACTERS||prompt.length>MAX_PROMPT_CHARACTERS)throw Object.assign(new Error('textPrompt must contain between 10 and 2,000 characters, excluding surrounding whitespace.'),{code:'INVALID_TEXT_PROMPT',field:'textPrompt',minCharacters:MIN_PROMPT_CHARACTERS,maxCharacters:MAX_PROMPT_CHARACTERS});
    return prompt;
}
