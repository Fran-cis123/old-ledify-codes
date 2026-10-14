import { validateDiagram } from './svgGraphics.mjs';
import { assertTextFits } from '../contentFit.mjs';

export function renderNativeDiagram({ slide, diagram, box, ink, accent, fontFace, slideNumber }) {
    validateDiagram(diagram);
    const { x,y,w,h }=box,cols=['labeled','cycle'].includes(diagram.kind)?2:1,rows=Math.ceil(diagram.nodes.length/cols),rowH=h/rows;
    const gap=.35,nodeW=cols===2?(w-gap)/2:w-.45;
    const cycleSlots=Array.from({length:rows},(_,i)=>[1,i]).concat(Array.from({length:rows},(_,i)=>[0,rows-1-i]));
    // Cycle order follows the perimeter; a closing edge returns to the start.
    const positions=diagram.nodes.map((node,i)=>{const slot=diagram.kind==='cycle'?cycleSlots[(i+cycleSlots.length-1)%cycleSlots.length]:[i%cols,Math.floor(i/cols)];return {...node,x:x+slot[0]*(nodeW+gap),y:y+slot[1]*rowH};});
    const byId=Object.fromEntries(positions.map(n=>[n.id,n]));
    for(const edge of diagram.edges){
        const a=byId[edge.from],b=byId[edge.to];
        const x1=a.x+nodeW-.08,y1=a.y+rowH*.48,x2=b.x+nodeW-.08,y2=b.y+rowH*.48;
        if(a.x===b.x) slide.addShape('line',{x:x1+.12,y:Math.min(y1,y2),w:0,h:Math.abs(y2-y1),line:{color:accent,width:1.4,...(y2>y1?{endArrowType:'triangle'}:{beginArrowType:'triangle'})}});
        else if(a.y===b.y) slide.addShape('line',{x:Math.min(a.x,b.x)+nodeW,y:y1,w:gap,h:0,line:{color:accent,width:1.4,...(b.x>a.x?{endArrowType:'triangle'}:{beginArrowType:'triangle'})}});
        else {
            const mid=x+nodeW+gap/2,start=b.x>a.x?a.x+nodeW:a.x,end=b.x>a.x?b.x:b.x+nodeW;
            slide.addShape('line',{x:Math.min(start,mid),y:y1,w:Math.abs(mid-start),h:0,line:{color:accent,width:1.4}});
            slide.addShape('line',{x:mid,y:Math.min(y1,y2),w:0,h:Math.abs(y2-y1),line:{color:accent,width:1.4}});
            slide.addShape('line',{x:Math.min(mid,end),y:y2,w:Math.abs(end-mid),h:0,line:{color:accent,width:1.4,...(end>mid?{endArrowType:'triangle'}:{beginArrowType:'triangle'})}});
        }
        if(edge.label && cols===2 && a.x===b.x){
            assertTextFits(edge.label,{w:nodeW-.3,h:.35,fontSize:18},'visual.diagram.edges.label',slideNumber);
            slide.addText(edge.label,{x:a.x,y:Math.min(a.y,b.y)+rowH-.34,w:nodeW-.3,h:.35,fontFace,fontSize:18,color:ink,margin:0});
        }
    }
    for(const [i,node] of positions.entries()){
        const size=cols===2?22:21,labelH=cols===2?.8:.38,descH=Math.min(.8,rowH-labelH-.2);
        const add=(value,yy,hh,fs,bold,field)=>{
            if(!value) return; assertTextFits(value,{w:nodeW-.3,h:hh,fontSize:fs},field,slideNumber);
            slide.addText(value,{x:node.x,y:yy,w:nodeW-.3,h:hh,fontSize:fs,fontFace,color:ink,bold,margin:0,breakLine:false,valign:'top'});
        };
        slide.addShape('line',{x:node.x,y:node.y-.04,w:nodeW-.3,h:0,line:{color:accent,width:2}});
        add(node.label,node.y+.08,labelH,size,true,`visual.diagram.nodes[${i}].label`);
        if(node.description) add(node.description,node.y+labelH+.1,Math.max(.01,descH),18,false,`visual.diagram.nodes[${i}].description`);
    }
}
