'use strict';
// Misura quali stili Elementor aggiunge agli elementi atomici rispetto a un elemento HTML "pulito" dello stesso tag.
// Uso: node tools/rev2/stili-base-elementor.js <url-pagina-con-i-campioni>
// Cerca nella pagina un campione per ogni tipo (e-div-block section, e-heading, e-paragraph p/span, e-button a/button, e-image,
// e-list/li, e-accordion e parti, e-div-block a) e stampa le proprietà calcolate che differiscono da un elemento nuovo.
const { openBrowser } = require('./cdp-session');

const url = process.argv[2];
if (!url) { console.error('uso: node stili-base-elementor.js <url>'); process.exit(2); }

const campioni = [
  ['contenitore section', 'section.e-div-block-base', 'section'],
  ['contenitore div (radice)', 'div.e-div-block-base', 'div'],
  ['contenitore nav', 'nav.e-div-block-base', 'nav'],
  ['contenitore a (link)', 'a.e-div-block-base', 'a'],
  ['titolo h2/h3', '.e-heading-base', 'h2'],
  ['paragrafo p', 'p.e-paragraph-base', 'p'],
  ['paragrafo span', 'span.e-paragraph-base', 'span'],
  ['paragrafo con link (a interno)', '.e-paragraph-link-base', 'a'],
  ['bottone a', 'a.e-button-base', 'a'],
  ['bottone button', 'button.e-button-base', 'button'],
  ['immagine', 'img.e-image-base', 'img'],
  ['lista ul', 'ul.e-list-base', 'ul'],
  ['voce li', 'li.e-list-item-base', 'li'],
  ['contenuto voce', '.e-list-item-content-base', 'div'],
  ['accordion', 'div.e-accordion-base', 'div'],
  ['accordion item (details)', 'details.e-accordion-item-base', 'details'],
  ['accordion summary', 'summary.e-accordion-item-header-base', 'summary'],
  ['accordion titolo', '.e-accordion-item-title-base', 'span'],
  ['accordion contenuto', 'div.e-accordion-item-content-base', 'div'],
];

(async () => {
  const b = await openBrowser({ width: 1440 });
  try {
    await b.navigate(url);
    const out = await b.evalJs(`(() => {
      const campioni = ${JSON.stringify(campioni)};
      const res = [];
      const nuovo = {};
      for (const [nome, sel, tag] of campioni) {
        const el = document.querySelector('.elementor-location-footer ' + sel) ? null : document.querySelector('[data-elementor-type="wp-page"] ' + sel);
        if (!el) { res.push({ nome, trovato: false }); continue; }
        if (!nuovo[tag]) { const n = document.createElement(tag); el.parentElement.appendChild(n); nuovo[tag] = n; }
        const cs = getComputedStyle(el), cn = getComputedStyle(nuovo[tag]);
        const diff = {};
        for (const p of cs) { if (/^(-webkit-|--|inline-size|block-size|perspective-origin|transform-origin|inset-|margin-inline|margin-block|padding-inline|padding-block|border-block|border-inline|min-inline|min-block|max-inline|max-block|translate|rotate|scale|d$|x$|y$|cx|cy|r$|rx|ry|text-wrap|font-size-adjust|view-transition|anchor|position-|field-sizing|interpolate)/.test(p)) continue; if (cs.getPropertyValue(p) !== cn.getPropertyValue(p)) diff[p] = cs.getPropertyValue(p) + '  (normale: ' + cn.getPropertyValue(p) + ')'; }
        res.push({ nome, trovato: true, classi: el.className.replace(/elementor-element-\\w+|data-\\S+/g, '').trim().slice(0, 90), diff });
      }
      return res;
    })()`);
    for (const r of out) {
      if (!r.trovato) { console.log(`\n== ${r.nome}: NON TROVATO`); continue; }
      console.log(`\n== ${r.nome}  [${r.classi}]`);
      const k = Object.keys(r.diff); if (!k.length) console.log('   (nessuna differenza)'); else k.forEach((p) => console.log(`   ${p}: ${r.diff[p]}`));
    }
  } finally { await b.close(); }
})().catch((e) => { console.error(e); process.exit(1); });
