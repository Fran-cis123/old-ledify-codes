const string = { type: 'string' };
const object = properties => ({ type: 'object', properties, required: Object.keys(properties), additionalProperties: false });
export const PAGE_TYPES = ['portfolio', 'startup', 'business', 'education', 'restaurant', 'event', 'product', 'agency', 'nonprofit', 'service', 'informational'];
export const SECTION_TYPES = ['about', 'features', 'services', 'projects', 'process', 'topics', 'menu', 'schedule', 'faq', 'pricing', 'testimonials', 'contact', 'values', 'gallery'];
export const PRESETS = ['editorial', 'product', 'classic', 'academy', 'table'];
const context = object({ userRole: string, purpose: string, audience: string, topic: string, tone: string, keyInstructions: { type: 'array', items: string, maxItems: 8 } });
export const webpagePlanSchema = object({
    pageType: { type: 'string', enum: PAGE_TYPES }, title: string, brandName: string, inferredContext: context,
    design: object({ preset: { type: 'string', enum: PRESETS }, primary: string, accent: string }),
    visualDirection: string,
    sections: { type: 'array', minItems: 2, maxItems: 8, items: object({ type: { type: 'string', enum: SECTION_TYPES }, heading: string, navLabel: string, purpose: string }) },
    limitations: { type: 'array', maxItems: 6, items: string }
});
const item = object({ title: string, description: string, detail: string, url: string });
export function webpageContentSchema(plan) {
    return object({
        description: string,
        hero: object({ headline: string, subheadline: string, actionLabel: string }),
        sections: { type: 'array', minItems: plan.sections.length, maxItems: plan.sections.length,
            items: object({ type: { type: 'string', enum: SECTION_TYPES }, heading: string, content: string,
                items: { type: 'array', maxItems: 6, items: item } }) },
        contact: object({ email: string, phone: string, address: string }),
        callToAction: object({ heading: string, text: string, actionLabel: string })
    });
}
