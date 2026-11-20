'use strict';
// Stampa, per uno o più selettori CSS di una pagina, posizione/dimensioni e gli stili calcolati più utili (per capire perché
// dev3 differisce dalla rev2). Se la pagina ha due URL (rev2 e dev3) li affianca.
//   node tools/rev2/ispeziona.js <url> <selettore> [<selettore> ...] [--w 1440] [--stili display,position,width,...] [--max 3]
//   node tools/rev2/ispeziona.js <url-rev2>@@<url-dev3> <selettore> ...      (confronto)
const { openBrowser } = require('./cdp-session');
const { risolviCoppia } = require('./url-dev3');
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); if (i < 0) return d; const v = args[i + 1]; args.splice(i, 2); return v; };
const larghezza = parseInt(opt('--w', '1440'), 10);
const stili = opt('--stili', 'display,position,width,height,margin,padding,flex,flex-direction,justify-content,align-items,gap,font-size,font-weight,color,background-color,border-bottom,overflow,visibility,opacity,order,grid-template-columns').split(',');
const max = parseInt(opt('--max', '3'), 10);
const [urls, ...selettori] = args;
if (!urls || !selettori.length) { console.error('uso: ispeziona.js <url[@@url2]> <selettore>... [--w 1440] [--stili a,b] [--max 3]'); process.exit(2); }

const funzione = (sels, stili, max) => `(() => {
  const out = {};
  for (const sel of ${JSON.stringify(sels)}) {
    let els; try { els = [...document.querySelectorAll(sel)]; } catch (e) { out[sel] = 'selettore non valido'; continue; }
    out[sel] = { trovati: els.length, elementi: els.slice(0, ${max}).map((e) => {
      const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); const s = {};
      for (const k of ${JSON.stringify(stili)}) s[k] = cs.getPropertyValue(k);
      return { tag: e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + (e.className && typeof e.className === 'string' ? '.' + e.className.trim().split(/\\s+/).join('.') : ''), x: Math.round(r.x), y: Math.round(r.y + scrollY), w: Math.round(r.width), h: Math.round(r.height), testo: (e.textContent || '').trim().replace(/\\s+/g, ' ').slice(0, 40), stili: s };
    }) };
  }
  return JSON.stringify(out);
})()`;

(async () => {
  const lista = (await risolviCoppia(urls)).split('@@');
  const risultati = [];
  for (const url of lista) {
    const b = await openBrowser({ width: larghezza, height: 900, mobile: larghezza < 700 });
    try { await b.navigate(url); risultati.push(JSON.parse(await b.evalJs(funzione(selettori, stili, max)))); } finally { await b.close(); }
  }
  for (const sel of selettori) {
    console.log(`\n### ${sel}`);
    risultati.forEach((r, i) => {
      const d = r[sel];
      const etichetta = lista.length > 1 ? (i === 0 ? 'rev2' : 'dev3') : '';
      if (typeof d === 'string') { console.log(`  ${etichetta} ${d}`); return; }
      console.log(`  ${etichetta} trovati: ${d.trovati}`);
      d.elementi.forEach((e) => console.log(`    ${e.tag} @(${e.x},${e.y}) ${e.w}x${e.h} "${e.testo}"\n      ` + Object.entries(e.stili).filter(([, v]) => v && v !== 'none' && v !== 'normal' && v !== '0px' && v !== 'auto').map(([k, v]) => `${k}:${v}`).join('  ')));
    });
  }
})().catch((e) => { console.error(e); process.exit(1); });
