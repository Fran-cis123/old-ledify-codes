const s = { type: 'string' };
const object = properties => ({ type: 'object', properties, required: Object.keys(properties), additionalProperties: false });
export const visualRequirementSchema = object({ role: { type: 'string', enum: ['none', 'background', 'foreground'] },
    kind: { type: 'string', enum: ['photo', 'illustration', 'diagram', 'texture', 'none'] }, required: { type: 'boolean' },
    description: s, searchQuery: s, altText: s });
export const diagramSchema = object({ kind: { type: 'string', enum: ['flowchart', 'cycle', 'labeled'] },
    nodes: { type: 'array', minItems: 2, maxItems: 8, items: object({ id: s, label: s, description: s }) },
    edges: { type: 'array', maxItems: 12, items: object({ from: s, to: s, label: s }) }, caption: s });
