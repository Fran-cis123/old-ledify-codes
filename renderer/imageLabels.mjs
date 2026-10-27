export function isAutomaticImageLabel(value=''){
 return /^(?:AI[- ]generated (?:conceptual )?(?:illustration|artwork|image)|Illustrative (?:photograph|photography|stock (?:image|photography)|concept))(?:[;:.\s]|$)/i.test(String(value).trim());
}
