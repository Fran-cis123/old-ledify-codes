import { renderProfessionalSlide } from './professionalLayouts.mjs';

// Preserve public layout IDs while sharing the canonical content contract.
const supported = new Set([
    "title-centered",
    "title-split",
    "section-divider-centered",
    "focused-statement",
    "text-visual-split",
    "text-visual-text-fallback",
    "key-points-stack",
    "cards-grid",
    "cards-horizontal",
    "process-horizontal",
    "process-vertical",
    "comparison-two-column",
    "comparison-multi-column",
    "timeline-horizontal",
    "roadmap-phases",
    "statistics-highlight",
    "chart-primary",
    "chart-with-insight",
    "table-focus",
    "relationship-network",
    "relationship-chain-vertical",
    "quote-emphasis",
    "case-study-flow",
    "cta-focus"
]);
export const getRegisteredLayoutIds = () => [...supported];
export const hasLayoutRenderer = id => supported.has(id);
export function renderLayout(args) {
    if (!args.slide || !args.tokens || !args.slideData) throw new Error('Slide, slide data and design tokens are required');
    if (!supported.has(args.slideData.layoutId)) throw new Error(`Slide ${args.slideData.slideNumber}: unsupported layout "${args.slideData.layoutId}"`);
    return renderProfessionalSlide(args);
}
