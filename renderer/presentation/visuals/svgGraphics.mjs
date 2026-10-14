const e = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const svg = (w, h, body) => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${body}</svg>`;
export function validateDiagram(d) {
    if (!d || !['flowchart','cycle','labeled'].includes(d.kind) || !Array.isArray(d.nodes) || d.nodes.length < 2 || d.nodes.length > 8 || !Array.isArray(d.edges) || d.edges.length > 12) throw new Error('Diagram requires 2–8 nodes and at most 12 valid relationships');
    const ids = new Set();
    for (const n of d.nodes) {
        if (!n.id || ids.has(n.id) || !n.label?.trim() || n.label.length > 54 || (n.description || '').length > 90) throw new Error('Diagram nodes require unique IDs, labels under 55 characters and concise descriptions');
        ids.add(n.id);
    }
    for (const edge of d.edges) if (!ids.has(edge.from) || !ids.has(edge.to) || edge.from === edge.to || (edge.label || '').length > 32) throw new Error('Diagram connections require existing distinct nodes and concise labels');
    if (d.kind !== 'labeled' && !d.edges.length) throw new Error('A flow/cycle diagram must specify its real connections');
    return true;
}
export function diagramSvg(d, colors) {
    validateDiagram(d);
    const W = 1200, H = 1000, ink = '#' + colors.textPrimary, accent = '#' + colors.accent, bg = '#' + colors.background;
    const cols = 2, rows = Math.ceil(d.nodes.length / cols), rowH = Math.min(280, 830 / rows);
    const positions = d.nodes.map((n, i) => ({ ...n, x: 40 + (i % cols) * 600, y: 50 + Math.floor(i / cols) * rowH }));
    const byId = Object.fromEntries(positions.map(p => [p.id, p]));
    const wrap = (value, max = 20) => {
        const lines = []; let line = '';
        for (const word of String(value).split(/\s+/)) { if (line && (line + ' ' + word).length > max) { lines.push(line); line = word; } else line += (line ? ' ' : '') + word; }
        if (line) lines.push(line); return lines;
    };
    const label = (value, x, y, size, color, max) => wrap(value,max).map((l,i) => `<text x="${x}" y="${y + i * size * 1.15}" fill="${color}" font-family="Arial" font-size="${size}">${e(l)}</text>`).join('');
    const lines = d.edges.map(edge => {
        const a = byId[edge.from], b = byId[edge.to], vertical = a.x === b.x;
        const x1 = a.x + (vertical ? 255 : 520), y1 = a.y + (vertical ? rowH - 70 : 75);
        const x2 = b.x + (vertical ? 255 : 0), y2 = b.y + (vertical ? -14 : 75);
        return `<path d="M ${x1} ${y1} L ${x2} ${y2}" stroke="${accent}" stroke-width="5" fill="none" marker-end="url(#arrow)"/>`;
    }).join('');
    const nodes = positions.map(p => `<path d="M ${p.x} ${p.y+8} h 470" stroke="${accent}" stroke-width="5"/>${label(p.label,p.x,p.y+76,52,ink,18)}${label(p.description,p.x,p.y+170,36,ink,27)}`).join('');
    const edgeLegend = d.edges.filter(r=>r.label).map(r=> `${byId[r.from].label} → ${byId[r.to].label}: ${r.label}`).join(' • ');
    return svg(W,H,`<rect width="1200" height="1000" fill="${bg}"/><defs><marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10z" fill="${accent}"/></marker></defs>${lines}${nodes}${label(edgeLegend || d.caption,40,915,32,ink,64)}`);
}
export function themeBackgroundSvg(theme, colors, fullBleed = false) {
    const bg = '#' + colors.background, accent = '#' + colors.accent, ink = '#' + colors.textPrimary;
    const strokes = theme === 'technical' ? Array.from({length:12},(_,i)=>`<path d="M ${1000+i*72} 0 v ${180+i*50} h ${900-i*65}"/>`).join('')
        : theme === 'scientific' ? Array.from({length:7},(_,i)=>`<ellipse cx="1500" cy="540" rx="${100+i*65}" ry="${100+i*55}" transform="rotate(${i*15} 1500 540)"/>`).join('')
        : theme === 'educational' ? '<path d="M 1140 850 V 260 Q 1350 150 1500 270 Q 1700 150 1840 260 V850 Q1650 740 1500 850 Q1300 740 1140 850 Z M1500 270 V850"/>'
        : '<path d="M1100 1080 L1680 0 M1290 1080 L1870 0 M1030 700 H1920 M1160 460 H1920 M1300 220 H1920"/>';
    return svg(1920,1080,`<rect width="1920" height="1080" fill="${bg}"/><g fill="none" stroke="${accent}" stroke-width="${fullBleed ? 5 : 2}" opacity="${fullBleed ? .7 : .12}">${strokes}</g><path d="M 1080 0 V1080" stroke="${ink}" opacity=".06"/>`);
}
