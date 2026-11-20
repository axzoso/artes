'use strict';
// Collaudo dei filtri degli archivi (realizzazioni a due livelli, brand per categoria): stesso gesto su rev2 e dev3, confronto dello
// stato (conteggio, schede visibili, filtro attivo, indirizzo) e screenshot del viewport.
//   node tools/rev2/collaudo-archivi.js realizzazioni <url-rev2> <@id|url-dev3>
//   node tools/rev2/collaudo-archivi.js brand <url-rev2> <@id|url-dev3>
const fs = require('fs');
const path = require('path');
const { openBrowser, sleep } = require('./cdp-session');
const { comparePngs } = require('./png-diff');
const { risolviUrl } = require('./url-dev3');

const [tipo, urlAIn, urlBIn] = process.argv.slice(2);
if (!tipo || !urlAIn || !urlBIn) { console.error('uso: collaudo-archivi.js realizzazioni|brand <url-rev2> <url-dev3>'); process.exit(2); }
const out = path.resolve(__dirname, '..', 'out', 'rev2', 'collaudo-archivi'); fs.mkdirSync(out, { recursive: true });

const cliccaTesto = (sel, testo) => `(function () { var el = Array.prototype.slice.call(document.querySelectorAll(${JSON.stringify(sel)})).filter(function (e) { return e.textContent.replace(/\\s+/g, ' ').trim() === ${JSON.stringify(testo)} && e.getClientRects().length; })[0]; if (!el) throw new Error('non trovato: ' + ${JSON.stringify(testo)}); el.click(); return 1; })()`;
const CASI = {
  realizzazioni: [
    { nome: 'iniziale', w: 1440, h: 1100, passi: [] },
    { nome: 'tab-uffici', w: 1440, h: 1100, passi: [cliccaTesto('.settori-tabs__btn', 'Arredo uffici e workspace')] },
    { nome: 'categoria-enti', w: 1440, h: 1100, passi: [cliccaTesto('.settori-tabs__btn', 'Arredo uffici e workspace'), cliccaTesto('.filtri--categorie .filtro', 'Enti e istituzioni')] },
    { nome: 'tab-hospitality-vuota', w: 1440, h: 1100, passi: [cliccaTesto('.settori-tabs__btn', 'Arredo hotel e hospitality'), cliccaTesto('.filtri--categorie .filtro', 'Student housing e co-living')] },
    { nome: 'url-retail-moda', w: 1440, h: 1100, query: '?settore=retail&categoria=moda-e-sport', passi: [] },
    { nome: 'tab-food-390', w: 390, h: 900, passi: [cliccaTesto('.settori-tabs__btn', 'Arredo negozi food')] },
  ],
  brand: [
    { nome: 'iniziale', w: 1440, h: 1100, passi: [] },
    { nome: 'sedute', w: 1440, h: 1100, passi: [cliccaTesto('.filtro', 'Sedute')] },
    { nome: 'acustica', w: 1440, h: 1100, passi: [cliccaTesto('.filtro', 'Acustica')] },
    { nome: 'outdoor-390', w: 390, h: 900, passi: [cliccaTesto('.filtro', 'Outdoor')] },
  ],
}[tipo];

function stato() {
  var visibili = function (sel) { return Array.prototype.slice.call(document.querySelectorAll(sel)).filter(function (e) { return e.getClientRects().length; }); };
  var sel = document.querySelector('.archivio') ? '.progetto' : '.brand';
  var cards = visibili((document.querySelector('.archivio') ? '.archivio ' : '.brands ') + sel);
  return JSON.stringify({
    conteggio: (document.querySelector('.archivio__count') || {}).textContent || null,
    schede: cards.length,
    nomi: cards.slice(0, 40).map(function (c) { var n = c.querySelector('.progetto__nome, .brand__n'); return n ? n.textContent.replace(/\s+/g, ' ').trim() : ''; }),
    attivi: visibili('.is-active').filter(function (e) { return /settori-tabs__btn|filtro/.test(e.className); }).map(function (e) { return e.textContent.replace(/\s+/g, ' ').trim(); }),
    gruppoVisibile: visibili('.filtri--categorie').length,
    vuoto: visibili('.progetti__empty').length,
    indirizzo: location.search,
  });
}

(async () => {
  const urlA = await risolviUrl(urlAIn); const urlB0 = await risolviUrl(urlBIn);
  let tutto = true;
  for (const c of CASI) {
    const foto = {}; const st = {};
    for (const [lato, base] of [['rev2', urlA], ['dev3', urlB0]]) {
      const url = c.query ? base + (base.includes('?') ? '&' + c.query.slice(1) : c.query) : base;
      const b = await openBrowser({ width: c.w, height: c.h, mobile: c.w < 700 });
      try {
        await b.navigate(url);
        await b.evalJs("document.querySelectorAll('.otgs-development-site-front-end, #wpadminbar').forEach(function (e) { e.remove(); }); 1");
        for (const p of c.passi) { await b.evalJs(p); await sleep(300); }
        await sleep(500);
        st[lato] = JSON.parse(await b.evalJs(`(${stato.toString()})()`));
        // le anteprime hanno già un parametro nell'indirizzo: si confrontano solo settore e categoria
        st[lato].indirizzo = (st[lato].indirizzo.match(/(settore|categoria)=[^&]*/g) || []).join('&');
        // si fotografa il corpo della pagina (<main> / .page-root): niente scroll, niente header sticky
        foto[lato] = path.join(out, `${tipo}-${c.nome}-${lato}.png`);
        await b.screenshotSelettore(lato === 'rev2' ? 'main' : '.page-root', foto[lato]);
      } finally { await b.close(); }
    }
    const r = comparePngs(foto.rev2, foto.dev3, { tol: 10, diffOut: path.join(out, `${tipo}-${c.nome}-diff.png`) });
    const statoUguale = JSON.stringify(st.rev2) === JSON.stringify(st.dev3);
    const ok = statoUguale && r.percentuale < 3; tutto = tutto && ok;
    console.log(`${ok ? 'OK  ' : 'DIFF'} ${c.nome}: pixel diversi ${r.percentuale}%; schede ${st.rev2.schede}/${st.dev3.schede}; conteggio "${st.rev2.conteggio}"/"${st.dev3.conteggio}"`);
    if (!statoUguale) { console.log('      rev2', JSON.stringify(st.rev2)); console.log('      dev3', JSON.stringify(st.dev3)); }
  }
  console.log(tutto ? '\nFiltri in parità.' : '\nCi sono differenze: vedi ' + out);
  process.exit(tutto ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(2); });
