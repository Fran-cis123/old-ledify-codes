// Fixed sizes by semantic role. Layouts change position, never shrink copy.
export const PRESENTATION_TYPE_SCALE=Object.freeze({title:30,subtitle:18,heading:20,body:18,statistic:44,quote:24,footer:12});
export function presentationFontSize(field='',{bold=false}={}){
 if(field==='slideNumber')return PRESENTATION_TYPE_SCALE.footer;
 if(/^(?:title(?:\.title|\.photo)?|section-divider\.title)$/.test(field))return PRESENTATION_TYPE_SCALE.title;
 if(/subtitle/i.test(field))return PRESENTATION_TYPE_SCALE.subtitle;
 if(/^statistics\[\d+\]\.value$/.test(field))return PRESENTATION_TYPE_SCALE.statistic;
 if(field==='quote.text')return PRESENTATION_TYPE_SCALE.quote;
 if(/^table\[|relationships?\.|^visual\./.test(field))return PRESENTATION_TYPE_SCALE.body;
 return bold?PRESENTATION_TYPE_SCALE.heading:PRESENTATION_TYPE_SCALE.body;
}
