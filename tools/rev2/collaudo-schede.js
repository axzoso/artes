'use strict';
// Collaudo delle interazioni delle schede (lightbox della galleria): stesso gesto su rev2 e dev3, screenshot del viewport e
// differenza pixel; confronta anche conteggio e didascalia.
//   node tools/rev2/collaudo-schede.js <url-rev2> <url-dev3> [--percorso /realizzazioni/arpacal/]
const fs = require('fs');
const path = require('path');
const { openBrowser, sleep } = require('./cdp-session');
const { comparePngs } = require('./png-diff');

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); if (i < 0) return d; const v = args[i + 1]; args.splice(i, 2); return v; };
const percorso = opt('--percorso', '');
const [urlA, urlB] = args;
if (!urlA || !urlB) { console.error('uso: collaudo-schede.js <url-rev2> <url-dev3>'); process.exit(2); }
const out = path.resolve(__dirname, '..', 'out', 'rev2', 'collaudo-schede'); fs.mkdirSync(out, { recursive: true });

// i gesti sono funzioni della pagina: stesse per rev2 (link <a data-lightbox>) e dev3 (elementi del ciclo)
const SEL_ITEM = "document.querySelectorAll('.caso-gallery__item')";
const casi = [
  { nome: 'lightbox-apri-1440', w: 1440, h: 900, passi: ["document.querySelector('.caso-gallery__open').click(); 1"] },
  { nome: 'lightbox-avanti-1440', w: 1440, h: 900, passi: ["document.querySelector('.caso-gallery__open').click(); 1", "document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' })); 1"] },
  { nome: 'lightbox-terza-1440', w: 1440, h: 900, passi: [`${SEL_ITEM}[2].click(); 1`] },
  { nome: 'lightbox-apri-390', w: 390, h: 800, passi: ["document.querySelector('.caso-gallery__open').click(); 1"] },
];
const stato = () => JSON.stringify({
  aperta: !!document.querySelector('.lightbox') && !document.querySelector('.lightbox').hidden,
  conteggio: (document.querySelector('.lightbox__count') || {}).textContent,
  didascalia: (document.querySelector('.lightbox__caption') || {}).textContent,
  alt: (document.querySelector('.lightbox__img') || {}).alt,
  scroll: document.body.classList.contains('has-lightbox'),
});

(async () => {
  let tutto = true;
  for (const c of casi) {
    const foto = {}; const st = {};
    for (const [lato, url] of [['rev2', urlA], ['dev3', urlB]]) {
      const b = await openBrowser({ width: c.w, height: c.h, mobile: c.w < 700 });
      try {
        await b.navigate(url);
        await b.evalJs("document.querySelectorAll('.otgs-development-site-front-end, #wpadminbar').forEach(function (e) { e.remove(); }); 1");
        if (lato === 'dev3' && percorso) await b.evalJs('window.ArtesRev2 && ArtesRev2.marcaAttivo(' + JSON.stringify(percorso) + '); 1');
        for (const p of c.passi) { await b.evalJs(p); await sleep(350); }
        await sleep(400);
        st[lato] = await b.evalJs(`(${stato.toString()})()`);
        const shot = await b.send('Page.captureScreenshot', { format: 'png' });
        foto[lato] = path.join(out, `${c.nome}-${lato}.png`); fs.writeFileSync(foto[lato], Buffer.from(shot.result.data, 'base64'));
      } finally { await b.close(); }
    }
    const r = comparePngs(foto.rev2, foto.dev3, { tol: 10, diffOut: path.join(out, `${c.nome}-diff.png`) });
    const ok = r.percentuale < 1.5 && st.rev2 === st.dev3; tutto = tutto && ok;
    console.log(`${ok ? 'OK  ' : 'DIFF'} ${c.nome}: pixel diversi ${r.percentuale}%`);
    if (st.rev2 !== st.dev3) console.log(`      rev2 ${st.rev2}\n      dev3 ${st.dev3}`);
  }
  console.log(tutto ? '\nLightbox in parità.' : '\nCi sono differenze: vedi ' + out);
  process.exit(tutto ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(2); });
