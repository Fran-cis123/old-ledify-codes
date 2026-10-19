import {assertTextFits} from './contentFit.mjs';

export const PHOTO_FRAMES={
    'hero-photo':{x:5.75,y:0,w:7.583333,h:7.5},
    'photo-divider':{x:0,y:0,w:13.333333,h:4.05},
    'photo-panel':{x:0,y:0,w:5.3,h:7.5},
    'photo-editorial':{x:.72,y:2.4,w:6.15,h:4.5},
    'photo-grid':{x:.72,y:2.4,w:6.15,h:2.08},
    'photo-comparison':{x:7.7,y:2.4,w:4.91,h:4.5}
};
export function renderPhotoComposition({slide,d,c,t,ink,muted,accent}){
    const mode=d.photoComposition||'photo-editorial',frame=PHOTO_FRAMES[mode]||PHOTO_FRAMES['photo-editorial'],asset=d.photoAsset;
    if(!asset?.data)return false;
    d.photoFrame={...frame};
    const rect=(x,y,w,h,color)=>slide.addShape('rect',{x,y,w,h,line:{color,transparency:100},fill:{color}});
    const text=(value,x,y,w,h,size,bold=false,color=ink,field='content.photo')=>{
        if(!value)return;assertTextFits(String(value),{w,h,fontSize:size},field,d.slideNumber);
        slide.addText(String(value),{x,y,w,h,fontSize:size,bold,color,fontFace:bold?t.headingFamily:t.bodyFamily,margin:0,valign:'top',breakLine:false,_field:field});
    };
    slide.background={color:c.background};
    slide.addImage({data:asset.data,...frame,altText:asset.altText});
    if(mode==='photo-grid'&&d.photoAssets?.[1])slide.addImage({data:d.photoAssets[1].data,...frame,y:4.8,altText:d.photoAssets[1].altText});
    const disclosure=(d.photoAssets||[asset]).some(a=>a.synthetic)?'AI-generated illustration':'Illustrative photograph';
    if(mode==='hero-photo'){
        const dark=ink,light=c.background;
        rect(0,0,5.75,7.5,dark);
        const v=d.content.titleContent||d.content.sectionContent;
        text(v.title,.65,1.05,4.48,2.9,36,true,light,'title.photo');
        text(v.subtitle,.65,4.18,4.48,1.18,23,false,light,'title.subtitle');
        text(v.supportingText,.65,5.7,4.48,.8,18,false,light,'title.supporting');
        text(disclosure,.65,6.96,4.48,.42,17,false,light,'visual.caption');return true;
    }
    if(mode==='photo-divider'){
        const v=d.content.sectionContent||d.content.titleContent;
        text(v.title,.72,4.4,11.89,1.25,34,true,ink,'title.photo');
        text(v.subtitle,.72,5.83,11.89,.7,23,false,muted,'title.subtitle');
        text(v.supportingText,.72,6.6,11.89,.4,18,false,muted,'title.supporting');
        text(disclosure,.72,7.06,11.89,.4,17,false,muted,'visual.caption');return true;
    }
    const panel=mode==='photo-panel',x=panel?5.95:.72,w=panel?6.65:11.89;
    text(d.title,x,.42,w,1.2,32,true,ink,'title');
    text(d.subtitle,x,1.7,w,.42,18,false,muted,'subtitle');
    rect(x,2.17,.65,.045,accent);
    const tx=panel?5.95:mode==='photo-comparison'?.72:7.47,tw=panel?6.65:mode==='photo-comparison'?6.3:5.14;
    const content=d.content;
    if(content.comparison){
        const values=content.comparison.items,h=4.25/values.length;
        values.forEach((item,i)=>{
            const y=2.4+i*h;text(item.label,tx,y,tw,.5,23,true,ink,`comparison.items[${i}].label`);
            text(item.points.map(p=>'• '+p).join('\n'),tx,y+.61,tw,h-.72,20,false,muted,`comparison.items[${i}].points`);
        });
    }else if(content.process){
        const steps=content.process.steps,h=4.25/steps.length;
        steps.forEach((s,i)=>{const y=2.4+i*h;
            text(`${s.stepNumber}. ${s.title}`,tx,y,tw,.5,22,true,ink,`process.steps[${i}].title`);
            text(s.description,tx,y+.6,tw,h-.71,20,false,muted,`process.steps[${i}].description`);
            if(i<steps.length-1)slide.addShape('line',{x:tx+tw-.12,y:y+.45,w:0,h:Math.max(.02,h-.5),line:{color:accent,width:1.5,endArrowType:'triangle'}});
        });
    }else{
        const blocks=[];
        const collect=(v,key='')=>{
            if(['id','from','to','type','visual','searchQuery','heading'].includes(key))return;
            if(typeof v==='string'&&v&&v!==d.title)blocks.push(v);
            else if(Array.isArray(v))v.forEach(n=>collect(n));
            else if(v&&typeof v==='object')Object.entries(v).forEach(([k,n])=>collect(n,k));
        };
        collect(content);
        text(blocks.join('\n\n'),tx,2.52,tw,4.1,22,false,ink,'content.photo');
    }
    text(disclosure,tx,6.96,tw,.42,17,false,muted,'visual.caption');return true;
}
