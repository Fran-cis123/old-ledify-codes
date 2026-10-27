import {getTextClient,textModel} from '../ai/textProvider.mjs';
import { generateJsonWithRetry } from '../ai/generateJsonWithRetry.mjs';
import { visibleSlideText } from '../ai/presentationQuality.mjs';
import { diagramSchema } from '../../templates/presentation/visualSchemas.mjs';
import { validateDiagram } from '../../renderer/presentation/visuals/svgGraphics.mjs';

export function createDiagramPlanner(options = {}) {
    const client=options.client || getTextClient();
    return async({slide,presentation})=>{
        const source=presentation.slides.map(visibleSlideText).join('\n');
        const schema={type:'object',properties:{diagram:structuredClone(diagramSchema),grounding:{type:'array',maxItems:8,items:{type:'object',properties:{elementId:{type:'string'},quote:{type:'string'}},required:['elementId','quote'],additionalProperties:false}}},required:['diagram','grounding'],additionalProperties:false};
        schema.properties.diagram.properties.nodes.maxItems=4;schema.properties.diagram.properties.edges.maxItems=4;
        const result=await generateJsonWithRetry({client,schema,outputType:'presentation',stage:'visual-diagram-planning',slideNumber:slide.slideNumber,
            logger:options.logger,sleep:options.sleep,maxAttempts:2,
            request:{model:textModel('visual-diagram-planning'),contents:`Resolve the requested visual into a small, accurate schematic using ONLY approved presentation content as evidence. No code, invented anatomy, photographs, or spatial claims. Use 2–4 nodes, labels under 23 characters, descriptions under 23 characters, and at most 4 edges. Every node and every edge needs one grounding entry with its elementId (node ID, or from->to for edges) and an exact supporting quote from approved content. Relationship arrows must encode the correct direction and meaning; do not turn boundaries or proximity into flow. Use kind cycle only if a return path is supported. A labeled schematic is an alternative to precise spatial anatomy. Caption under 60 characters; identify simplification. If a truthful useful diagram cannot be grounded, return an invalid/empty plan rather than fabricate evidence; the caller will use an explicit fallback warning.
Requested visual: ${JSON.stringify(slide.visualRequirement || slide.content?.visualContent?.visual)}
Current slide: ${JSON.stringify(slide.content)}
Approved presentation content: ${JSON.stringify(source)}`,
                config:{responseMimeType:'application/json',responseJsonSchema:schema,maxOutputTokens:4096}},
            validate:value=>{
                validateDiagram(value.diagram);
                const ids=[...value.diagram.nodes.map(n=>n.id),...value.diagram.edges.map(e=>e.from+'->'+e.to)];
                if(value.diagram.nodes.some(n=>n.label.length>22 || n.description.length>22))throw new Error('Diagram labels and descriptions must fit their short readable fields');
                for(const id of ids) if(!value.grounding.some(g=>g.elementId===id && g.quote.trim() && source.includes(g.quote)))throw new Error('Each diagram element must have an exact approved-content evidence quote');
                if(value.diagram.caption.length>60)throw new Error('Diagram caption must be under 61 characters');
            }});
        return result.diagram;
    };
}
