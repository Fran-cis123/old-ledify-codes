import { AiGenerationError } from "./responseValidation.mjs";

const numberTokens = value => String(value).match(/-?\d+(?:,\d{3})*(?:\.\d+)?%?/g) || [];
const normalize = value => Number(String(value).replaceAll(",", "").replace("%", ""));

// Deliberately narrow: source membership is a guard against invented data,
// not a claim that a matching number or arbitrary prose has been fact checked.
export function validateQuantitativeGrounding(slide, input) {
    if (!["data-chart", "statistics"].includes(slide.slideType)) return;
    // Invented numbers are permitted only when the user explicitly requests a
    // hypothetical dataset and the actual slide visibly labels it as such.
    const hypotheticalRequested = /\b(?:hypothetical|illustrative|simulated|fictional)\b[\s\S]{0,100}\b(?:projections?|figures?|revenue|data|assumptions?|chart)\b|\b(?:projections?|figures?|revenue|data)\b[\s\S]{0,100}\b(?:hypothetical|illustrative|simulated)\b/i.test(input);
    if (hypotheticalRequested) {
        const visible = [slide.title, slide.subtitle, slide.content.chart?.insight, ...(slide.content.statistics || []).map(item => [item.label,item.description].join(' '))].join(' ');
        if (/\b(?:hypothetical|illustrative|simulated)\b/i.test(visible)) return;
        throw new AiGenerationError('AI_SCHEMA_VALIDATION_FAILED', 'Hypothetical data must be visibly labeled as illustrative assumptions.', { field: slide.slideType === 'data-chart' ? 'chart.insight' : 'statistics', repairHint: 'Explicitly label the figures as illustrative assumptions, not actual company performance.' });
    }
    const source = input.replace(/\b\d+\s*[- ]?slides?\b/gi, "");
    const supplied = numberTokens(source);
    const fail = () => { throw new AiGenerationError("AI_SCHEMA_VALIDATION_FAILED", `Slide ${slide.slideNumber}: quantitative content requires matching supplied source data`, { field: slide.slideType === 'data-chart' ? 'chart.datasets' : 'statistics', repairHint: 'Use only numbers supplied in the source. Do not invent quantitative evidence.' }); };
    if (!supplied.length) fail();
    if (slide.slideType === "data-chart") {
        const values = slide.content.chart.datasets.flatMap(dataset => dataset.values);
        const sourceValues = new Set(supplied.map(normalize));
        if (values.some(value => !sourceValues.has(value))) fail();
    } else {
        const sourceTokens = new Set(supplied.map(value => value.replaceAll(",", "")));
        for (const statistic of slide.content.statistics) {
            const tokens = numberTokens(statistic.value);
            if (!tokens.length || tokens.some(token => !sourceTokens.has(token.replaceAll(",", "")))) fail();
        }
    }
}
