import { validateWebpageContent, webpageError } from './webpageContentValidator.mjs';
import { PAGE_TYPES, SECTION_TYPES } from '../templates/webpage/webpageSchema.mjs';
export function webpageLayoutService(input) {
    if (!input || input.outputType !== 'webpage') throw webpageError('Expected outputType: webpage');
    if (input.pages?.length > 1) throw webpageError('This generator supports one complete page with multiple sections', 'pages');
    const source = input.pages?.[0] || input;
    const aliases = { cards: 'features', text: 'about', steps: 'process', benefits: 'features' };
    const sections = (source.sections || []).map((section, i) => {
        const type = aliases[section.type] || section.type;
        if (!SECTION_TYPES.includes(type)) throw webpageError('Unsupported section type', 'sections[' + i + '].type');
        return { ...section, type, id: 'section-' + (i + 1), content: section.content || '',
            navLabel: input.navigation?.[i] ?? section.heading,
            items: (section.items || []).map(item => ({ detail: '', url: '', ...item })) };
    });
    const page = { ...input, pageType: input.pageType, brandName: input.brandName || input.title, description: input.description || source.hero?.subheadline || '',
        hero: { actionLabel: 'Explore', ...source.hero }, sections,
        contact: { email: '', phone: '', address: '', ...input.contact },
        callToAction: { actionLabel: 'Explore', ...source.callToAction } };
    if (!PAGE_TYPES.includes(page.pageType) || !page.title?.trim()) throw webpageError('Website title and supported category are required');
    validateWebpageContent(page);
    const target = label => {
        if (/contact|touch|hello|talk|feedback|inquir|email|table|book|reserv/i.test(label) && page.contact.email) return 'mailto:' + page.contact.email;
        if (/resource|lesson|activit/i.test(label)) {
            const resource = sections.find(s => /resource|reading|lesson|activit|media/i.test(s.heading + ' ' + s.navLabel));
            if (resource) return '#' + resource.id;
        }
        const matches = [['projects', /work|project|portfolio/i], ['menu', /menu|dish/i], ['topics', /learn|topic|study|explor|cycle/i], ['services', /service|advis/i], ['process', /process|approach|how/i], ['features', /feature|capabilit|concept/i], ['contact', /contact|touch|hello|talk|feedback/i]];
        for (const [type, pattern] of matches) { const section = sections.find(s => s.type === type); if (section && pattern.test(label)) return '#' + section.id; }
        return '#' + sections[0].id;
    };
    page.heroTarget = target(page.hero.actionLabel);
    page.primaryTarget = target(page.callToAction.actionLabel);
    return page;
}
