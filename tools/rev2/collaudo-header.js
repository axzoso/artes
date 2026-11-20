'use strict';
// Collaudo delle interazioni di header e footer: stesso gesto su rev2 e dev3, screenshot del viewport e differenza pixel.
//   node tools/rev2/collaudo-header.js <url-rev2> <url-dev3>
// Casi: tendina "Realizzazioni" (1440), menu mobile aperto (390 e 1024), accordion del menu mobile (390), voce attiva.
const fs = require('fs');
const path = require('path');
const { openBrowser, sleep } = require('./cdp-session');
const { comparePngs } = require('./png-diff');
const { risolviUrl } = require('./url-dev3');

const [urlAIn, urlBIn] = process.argv.slice(2);
if (!urlAIn || !urlBIn) { console.error('uso: collaudo-header.js <url-rev2> <url-dev3>'); process.exit(2); }
const out = path.resolve(__dirname, '..', 'out', 'rev2', 'collaudo-header'); fs.mkdirSync(out, { recursive: true });

function leggiAttive(percorso) {
  window.ArtesRev2.marcaAttivo(percorso);
  return JSON.stringify(Array.from(document.querySelectorAll('.topbar__right > a.is-active, .nav > a.is-active, .nav__trigger.is-active')).map(function (a) { return a.textContent.replace(/\s+/g, ' ').trim(); }));
}

const casi = [
  { nome: 'tendina-1440', w: 1440, h: 700, passi: ["document.querySelector('.nav__trigger').dispatchEvent(new MouseEvent('mouseenter')); 1"] },
  { nome: 'menu-mobile-390', w: 390, h: 800, passi: ["document.querySelector('.nav-toggle').click(); 1"] },
  { nome: 'menu-mobile-accordion-390', w: 390, h: 800, passi: ["document.querySelector('.nav-toggle').click(); 1", "document.querySelector('.mobile-nav__trigger').click(); 1"] },
  { nome: 'menu-mobile-1024', w: 1024, h: 700, passi: ["document.querySelector('.nav-toggle').click(); 1"] },
];

(async () => {
  const urlA = await risolviUrl(urlAIn); const urlB = await risolviUrl(urlBIn);
  let tutto = true;
  for (const c of casi) {
    const foto = {};
    for (const [lato, url] of [['rev2', urlA], ['dev3', urlB]]) {
      const b = await openBrowser({ width: c.w, height: c.h, mobile: c.w < 700 });
      try {
        await b.navigate(url);
        await b.evalJs("document.querySelectorAll('.otgs-development-site-front-end, #wpadminbar').forEach(function (e) { e.remove(); }); 1");
        for (const p of c.passi) { await b.evalJs(p); await sleep(250); }
        const stato = await b.evalJs("JSON.stringify({ drop: (document.querySelector('.drop') || {}).hidden, mobile: (document.querySelector('.mobile-nav') || {}).hidden, toggle: (document.querySelector('.nav-toggle') || { getAttribute: function () { return null; } }).getAttribute('aria-expanded'), accordion: (document.querySelector('.mobile-nav__panel') || {}).hidden, overflow: document.body.style.overflow })");
        const shot = await b.send('Page.captureScreenshot', { format: 'png' });
        foto[lato] = path.join(out, `${c.nome}-${lato}.png`); fs.writeFileSync(foto[lato], Buffer.from(shot.result.data, 'base64'));
        foto[lato + 'Stato'] = stato;
      } finally { await b.close(); }
    }
    const r = comparePngs(foto.rev2, foto.dev3, { tol: 10, diffOut: path.join(out, `${c.nome}-diff.png`) });
    const ok = r.percentuale < 0.5; tutto = tutto && ok;
    console.log(`${ok ? 'OK  ' : 'DIFF'} ${c.nome}: pixel diversi ${r.percentuale}%   rev2 ${foto.rev2Stato}   dev3 ${foto.dev3Stato}`);
  }
  // voce attiva: su dev3 si simula il percorso della pagina (le anteprime non hanno il permalink reale)
  const b = await openBrowser({ width: 1440, height: 700 });
  try {
    await b.navigate(urlB);
    for (const [percorso, atteso] of [['/chi-siamo/', 'Chi siamo'], ['/arredamento-ufficio/', 'Arredo uffici e workspace'], ['/contract/', 'Arredo Contract'], ['/realizzazioni/', 'Realizzazioni'], ['/realizzazioni/royal-hotel/', 'Realizzazioni'], ['/brand-partner/frezza/', ''], ['/', '']]) {
      const attive = JSON.parse(await b.evalJs('(' + leggiAttive.toString() + ')(' + JSON.stringify(percorso) + ')'));
      const ok = (atteso === '' ? attive.length === 0 : attive.length === 1 && attive[0] === atteso); tutto = tutto && ok;
      console.log(`${ok ? 'OK  ' : 'DIFF'} voce attiva su ${percorso}: ${JSON.stringify(attive)} (atteso ${JSON.stringify(atteso)})`);
    }
  } finally { await b.close(); }
  console.log(tutto ? '\nTutto in parità.' : '\nCi sono differenze: vedi le immagini in ' + out);
})().catch((e) => { console.error(e); process.exit(1); });
