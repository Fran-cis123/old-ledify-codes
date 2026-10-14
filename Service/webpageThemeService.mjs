export const palettes = Object.freeze({
    editorial: { primary: '#25251f', accent: '#ce512a', background: '#f5f2e9', surface: '#fffdf7', text: '#25251f', muted: '#5f6058' },
    product: { primary: '#142d36', accent: '#c5f266', background: '#f5f8f7', surface: '#ffffff', text: '#17303a', muted: '#50656c' },
    classic: { primary: '#254c42', accent: '#e6c995', background: '#f7f5ef', surface: '#ffffff', text: '#20372f', muted: '#57675e' },
    academy: { primary: '#165f61', accent: '#fac09e', background: '#fbf8ef', surface: '#ffffff', text: '#173c3d', muted: '#586968' },
    table: { primary: '#702d23', accent: '#f2cd83', background: '#fbf3e7', surface: '#fffaf2', text: '#422a23', muted: '#756052' }
});
export function contrast(a, b) {
    const luminance = hex => {
        const rgb = hex.slice(1).match(/../g).map(v => parseInt(v, 16) / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4);
        return .2126 * rgb[0] + .7152 * rgb[1] + .0722 * rgb[2];
    };
    const x = luminance(a), y = luminance(b);
    return (Math.max(x, y) + .05) / (Math.min(x, y) + .05);
}
export const foreground = bg => contrast('#000000', bg) >= contrast('#ffffff', bg) ? '#000000' : '#ffffff';
export function webpageThemeService(page, context = {}) {
    const categoryPreset = { portfolio: 'editorial', startup: 'product', product: 'product', education: 'academy', restaurant: 'table', event: 'table', business: 'classic', service: 'classic', nonprofit: 'academy', agency: 'editorial', informational: 'classic' };
    const aliases = { modern: 'product', nature: 'academy' };
    const requested = context.designPreferences?.preset || page.design?.preset;
    const preset = palettes[requested] ? requested : aliases[requested] || categoryPreset[page.pageType];
    const colors = { ...palettes[preset] };
    for (const key of ['primary', 'accent']) {
        const value = context.designPreferences?.colors?.[key] || page.design?.[key] || page.design?.colors?.[key];
        if (value && !/^#[\da-f]{6}$/i.test(value)) throw new Error('Invalid design color: ' + key);
        if (value) colors[key] = value;
    }
    colors.onPrimary = foreground(colors.primary); colors.onAccent = foreground(colors.accent);
    return { ...page, theme: { preset, colors } };
}
