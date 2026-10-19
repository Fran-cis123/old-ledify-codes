// Inch coordinates shared by dry candidate rendering and the actual renderer.
export const SLIDE_GEOMETRY = Object.freeze({width:13.333333,height:7.5,margin:.72,minBodySize:18});
export function checkGeometry(elements, slideNumber) {
    const {width,height}=SLIDE_GEOMETRY;
    const fail=(message,field)=>{throw Object.assign(new Error(`Slide ${slideNumber}: ${message}`),{code:'PRESENTATION_LAYOUT_UNSAFE',stage:'layout-validation',slideNumber,field});};
    for(const e of elements){
        if(![e.x,e.y,e.w,e.h].every(Number.isFinite)||e.w<0||e.h<0||e.x<-.015||e.y<-.015||e.x+e.w>width+.015||e.y+e.h>height+.015) fail('element extends outside the slide',e.field);
        if(e.kind==='text'&&e.fontSize<18&& !['slideNumber','visual.caption'].includes(e.field)) fail('critical text is smaller than 18 pt',e.field);
    }
    const texts=elements.filter(e=>e.kind==='text');
    for(let i=0;i<texts.length;i++)for(let j=i+1;j<texts.length;j++){
        const a=texts[i],b=texts[j];
        const x=Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x),y=Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y);
        if(x>.035&&y>.035)fail(`text boxes overlap: ${a.field} and ${b.field}`,b.field);
    }
    return {status:'passed',elementCount:elements.length,textBoxes:texts.length};
}

export function geometryRecorder(target,slideNumber) {
    const elements=[];
    const wrapper={
        set background(value){target.background=value;},
        addText(value,options){if(String(value).trim())elements.push({kind:'text',...options,field:options._field||'diagram.text'});const {_field,...clean}=options;return target.addText(value,clean);},
        addImage(options){elements.push({kind:'image',...options,field:'image'});return target.addImage(options);},
        addShape(type,options){elements.push({kind:'shape',...options,field:'shape'});return target.addShape(type,options);},
        addChart(type,data,options){elements.push({kind:'chart',...options,field:'chart'});return target.addChart(type,data,options);}
    };
    return {slide:wrapper,elements,validate:()=>checkGeometry(elements,slideNumber)};
}
