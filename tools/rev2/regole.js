'use strict';
// Elenca le regole CSS (da tutti i fogli di stile della pagina) che si applicano a un elemento: serve a capire da dove viene
// uno stile inatteso. Mostra il file, il selettore e le dichiarazioni.
//   node tools/rev2/regole.js <url> <selettore> [testo-da-cercare-nelle-regole] [--w 1440]
const { openBrowser } = require('./cdp-session');
const { risolviUrl } = require('./url-dev3');
const args = process.argv.slice(2);
const wi = args.indexOf('--w'); const larghezza = wi >= 0 ? parseInt(args[wi + 1], 10) : 1440; if (wi >= 0) args.splice(wi, 2);
const [url, sel, filtro = ''] = args;
if (!url || !sel) { console.error('uso: regole.js <url> <selettore> [filtro] [--w 1440]'); process.exit(2); }

function inPagina(sel, filtro) {
  const el = document.querySelector(sel); const out = [];
  if (!el) return JSON.stringify(['elemento non trovato']);
  const visita = (rules, sheet) => {
    for (const r of rules) {
      if (r.type !== 1) { if (r.cssRules) visita(r.cssRules, sheet); continue; }
      let ok = false; try { ok = el.matches(r.selectorText); } catch (e) { ok = false; }
      if (ok && filtro && r.cssText.indexOf(filtro) < 0) ok = false;
      if (ok) out.push(String(sheet.href || 'inline').split('/').pop().slice(0, 40) + ' | ' + r.selectorText.slice(0, 140) + ' { ' + r.style.cssText.slice(0, 4000) + ' }');
    }
  };
  for (const s of document.styleSheets) { try { visita(s.cssRules, s); } catch (e) { /* foglio di altro dominio */ } }
  return JSON.stringify(out);
}

(async () => {
  const b = await openBrowser({ width: larghezza, height: 900, mobile: larghezza < 700 });
  try {
    await b.navigate(await risolviUrl(url));
    JSON.parse(await b.evalJs(`(${inPagina.toString()})(${JSON.stringify(sel)}, ${JSON.stringify(filtro)})`)).forEach((x) => console.log(x + '\n'));
  } finally { await b.close(); }
})().catch((e) => { console.error(e.message); process.exit(1); });
