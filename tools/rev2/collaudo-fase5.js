'use strict';
// Collaudo delle interazioni della fase 5 (Home e pagine settore): stesso gesto su rev2 e dev3, confronto di stato e screenshot.
//   node tools/rev2/collaudo-fase5.js faq <url-rev2> <@id|url-dev3>
//   node tools/rev2/collaudo-fase5.js home <url-rev2> <@id|url-dev3>
const fs = require('fs');
const path = require('path');
const { openBrowser, sleep } = require('./cdp-session');
const { comparePngs } = require('./png-diff');
const { risolviUrl } = require('./url-dev3');

const [tipo, urlAIn, urlBIn] = process.argv.slice(2);
if (!tipo || !urlAIn || !urlBIn) { console.error('uso: collaudo-fase5.js faq|home <url-rev2> <url-dev3>'); process.exit(2); }
const out = path.resolve(__dirname, '..', 'out', 'rev2', 'collaudo-fase5'); fs.mkdirSync(out, { recursive: true });

const cliccaTesto = (sel, testo) => `(function () { var el = Array.prototype.slice.call(document.querySelectorAll(${JSON.stringify(sel)})).filter(function (e) { return e.textContent.replace(/\\s+/g, ' ').trim() === ${JSON.stringify(testo)} && e.getClientRects().length; })[0]; if (!el) throw new Error('non trovato: ' + ${JSON.stringify(testo)}); el.click(); return 1; })()`;

const CASI = {
  faq: [
    { nome: 'chiuse', w: 1440, h: 1000, sel: '.faq', passi: [] },
    { nome: 'aperta-1', w: 1440, h: 1000, sel: '.faq', passi: ["document.querySelectorAll('.faq__item summary')[0].click(); 1"] },
    { nome: 'aperte-2', w: 1440, h: 1000, sel: '.faq', passi: ["document.querySelectorAll('.faq__item summary')[0].click(); 1", "document.querySelectorAll('.faq__item summary')[2].click(); 1"] },
    { nome: 'aperta-390', w: 390, h: 900, sel: '.faq', passi: ["document.querySelectorAll('.faq__item summary')[0].click(); 1"] },
  ],
  home: [
    { nome: 'slider-next', w: 1440, h: 1000, sel: '.produzione', passi: ["document.querySelectorAll('.produzione-slider__controls button')[1].click(); 1"] },
    { nome: 'slider-prev', w: 1440, h: 1000, sel: '.produzione', passi: ["document.querySelectorAll('.produzione-slider__controls button')[1].click(); 1", "document.querySelectorAll('.produzione-slider__controls button')[0].click(); 1"] },
    { nome: 'filtri-uffici', w: 1440, h: 1100, sel: '.realizzazioni', passi: [cliccaTesto('.realizzazioni .filtro', 'Uffici e workspace')] },
    { nome: 'filtri-hospitality', w: 1440, h: 1100, sel: '.realizzazioni', passi: [cliccaTesto('.realizzazioni .filtro', 'Hotel e hospitality')] },
    { nome: 'steps-mobile', w: 390, h: 900, sel: '.metodo--steps', passi: ["document.querySelectorAll('.steps-dots button')[2].click(); 1"] },
  ],
}[tipo];

function statoFaq() {
  var items = Array.prototype.slice.call(document.querySelectorAll('.faq__item'));
  var ld = Array.prototype.slice.call(document.querySelectorAll('script[type="application/ld+json"]')).some(function (s) { return /FAQPage/.test(s.textContent || ''); });
  return JSON.stringify({ totale: items.length, aperti: items.map(function (d) { return d.hasAttribute('open'); }), faqSchema: ld });
}

function statoHome() {
  var vis = function (sel) { return Array.prototype.slice.call(document.querySelectorAll(sel)).filter(function (e) { return e.getClientRects().length; }); };
  var slides = Array.prototype.slice.call(document.querySelectorAll('.produzione-slide'));
  var progs = vis('.realizzazioni .progetto');
  var dots = Array.prototype.slice.call(document.querySelectorAll('.steps-dots button'));
  return JSON.stringify({
    slideAttiva: slides.findIndex(function (s) { return s.classList.contains('is-active'); }),
    sliderCount: (document.querySelector('.produzione-slider__count') || {}).textContent || '',
    progettiVisibili: progs.length,
    nomiProgetti: progs.map(function (p) { return (p.querySelector('.progetto__nome') || {}).textContent.trim(); }),
    filtroAttivo: vis('.realizzazioni .filtro.is-active').map(function (b) { return b.textContent.trim(); }),
    dotsCount: dots.length,
    dotAttivo: dots.findIndex(function (b) { return b.classList.contains('is-active'); }),
  });
}

(async () => {
  const urlA = await risolviUrl(urlAIn); const urlB = await risolviUrl(urlBIn);
  let tutto = true;
  for (const c of CASI) {
    const foto = {}; const st = {};
    for (const [lato, url] of [['rev2', urlA], ['dev3', urlB]]) {
      const b = await openBrowser({ width: c.w, height: c.h, mobile: c.w < 700 });
      try {
        await b.navigate(url);
        await b.evalJs("document.querySelectorAll('.otgs-development-site-front-end, #wpadminbar').forEach(function (e) { e.remove(); }); 1");
        for (const p of c.passi) { await b.evalJs(p); await sleep(350); }
        await sleep(500);
        const fn = tipo === 'faq' ? statoFaq : statoHome;
        st[lato] = JSON.parse(await b.evalJs(`(${fn.toString()})()`));
        foto[lato] = path.join(out, `${tipo}-${c.nome}-${lato}.png`);
        await b.screenshotSelettore(c.sel, foto[lato]);
      } finally { await b.close(); }
    }
    const r = comparePngs(foto.rev2, foto.dev3, { tol: 10, diffOut: path.join(out, `${tipo}-${c.nome}-diff.png`) });
    // per faqSchema: dev3 aggiunge JSON-LD FAQPage (migliorativo), quindi confrontiamo totale e aperti
    const cmpA = tipo === 'faq' ? { totale: st.rev2.totale, aperti: st.rev2.aperti } : st.rev2;
    const cmpB = tipo === 'faq' ? { totale: st.dev3.totale, aperti: st.dev3.aperti } : st.dev3;
    const statoUguale = JSON.stringify(cmpA) === JSON.stringify(cmpB);
    const ok = statoUguale && r.percentuale < 3; tutto = tutto && ok;
    console.log(`${ok ? 'OK  ' : 'DIFF'} ${c.nome}: pixel diversi ${r.percentuale}%; stato ${statoUguale ? 'identico' : 'DIVERSO'}${tipo === 'faq' ? ` (FAQPage JSON-LD dev3: ${st.dev3.faqSchema})` : ''}`);
    if (!statoUguale) { console.log('      rev2', JSON.stringify(st.rev2)); console.log('      dev3', JSON.stringify(st.dev3)); }
  }
  console.log(tutto ? '\nInterazioni in parità.' : '\nCi sono differenze: vedi ' + out);
  process.exit(tutto ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(2); });
