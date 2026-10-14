// Editorial corrections identified during source/content review. Keep raw model
// output so the samples do not conceal limitations of automated fact checking.
import fs from 'node:fs/promises';
import path from 'node:path';
const root = path.resolve('generated/quality-audit');
const changes = [];
for (const name of ['text-default', 'text-5', 'url-9', 'pdf-12']) {
    const file = path.join(root, name, 'result.json');
    const r = JSON.parse(await fs.readFile(file, 'utf8'));
    try { await fs.copyFile(file, path.join(root, name, 'raw-generation.json'), fs.constants.COPYFILE_EXCL); }
    catch (error) { if (error.code !== 'EEXIST') throw error; }
    function set(object, key, value, field) {
        if (object[key] === value) return;
        changes.push({ sample: name, field, before: object[key], after: value });
        object[key] = value;
    }
    for (const s of r.generatedContent.slides) {
        const v = s.content;
        if (v.summary) v.summary.points.forEach((p, i) => {
            if (/clouds that fall/i.test(p)) set(v.summary.points, i, 'Cloud droplets grow and fall as rain or snow.', `slide${s.slideNumber}.summary.points[${i}]`);
            if (/land cover dictates/i.test(p)) set(v.summary.points, i, 'Land cover influences runoff and soil infiltration.', `slide${s.slideNumber}.summary.points[${i}]`);
        });
        if (name === 'pdf-12' && v.cards) for (const card of v.cards) {
            if (card.title === 'Soil and Groundwater') set(card, 'description', 'Store water below ground; groundwater can feed springs.', `slide${s.slideNumber}.cards.description`);
        }
        if (v.relationship) {
            const graph = v.relationship;
            for (const n of graph.nodes) {
                if (name === 'text-default' && n.label === 'Vegetation') set(n, 'description', 'Slows runoff; aids infiltration.', `slide${s.slideNumber}.node.${n.id}`);
                if (name === 'text-default' && n.label === 'Watershed') set(n, 'description', 'Links upstream to downstream.', `slide${s.slideNumber}.node.${n.id}`);
                if (name === 'text-5' && n.label === 'Rivers and Oceans') {
                    set(n, 'label', 'Surface Water', `slide${s.slideNumber}.node.${n.id}.label`);
                    set(n, 'description', 'Streams, rivers and lakes.', `slide${s.slideNumber}.node.${n.id}.description`);
                }
            }
            for (const edge of graph.relationships) {
                const label = graph.nodes.find(n => n.id === edge.to)?.label;
                const from = graph.nodes.find(n => n.id === edge.from)?.label;
                let relation;
                if (/Feeds springs/i.test(edge.label) && /Surface Water|Rivers and Lakes/.test(label)) relation = 'Can feed';
                if (/Precipitation/.test(from) && /Infiltration/.test(label)) relation = 'Can lead to';
                if (/Precipitation/.test(from) && /Runoff/.test(label)) relation = 'Can generate';
                if (/Infiltration/.test(from) && /Groundwater/.test(label)) relation = 'Can recharge';
                if (name === 'text-5' && /Runoff/.test(from) && label === 'Surface Water') relation = 'Flows into';
                if (relation) set(edge, 'label', relation, `slide${s.slideNumber}.edge.${edge.from}.${edge.to}`);
            }
        }
    }
    await fs.writeFile(file, JSON.stringify(r, null, 2));
}
await fs.writeFile(path.join(root, 'editorial-corrections.json'), JSON.stringify(changes, null, 2));
console.log(`Recorded ${changes.length} source/editorial corrections; raw model responses retained.`);
