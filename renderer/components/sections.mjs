export const escapeHtml = (v = '') => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const sectionId = (heading, i) => `section-${i + 1}`;
const itemCards = (items) => `<div class="card-grid">${items.map(x => `<article class="card"><span class="card-mark" aria-hidden="true"></span><h3>${escapeHtml(x.title)}</h3><p>${escapeHtml(x.description)}</p></article>`).join('')}</div>`;
export const renderSection = (section, index) => {
  const type = section.type;
  const items = section.items || [];
  const body = type === 'faq' ? `<div class="faq-list">${items.map(x => `<details><summary>${escapeHtml(x.title)}</summary><p>${escapeHtml(x.description)}</p></details>`).join('')}</div>` : items.length ? itemCards(items) : '';
  return `<section id="${sectionId(section.heading, index)}" class="content-section section-${escapeHtml(type)}"><div class="container"><div class="section-heading"><span class="eyebrow">${escapeHtml(type)}</span><h2>${escapeHtml(section.heading)}</h2><p>${escapeHtml(section.content)}</p></div>${body}</div></section>`;
};
