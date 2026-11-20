'use strict';
// Confronto dei CONTENUTI tra una pagina rev2 e la sua omologa su dev3: testo visibile (riga per riga), link (testo + destinazione,
// con gli indirizzi rev2 tradotti dalla stessa mappa del convertitore), immagini (nome del file e testo alternativo), titoli.
// Complementa parita.js (aspetto) e geometria.js (struttura).
//   node tools/rev2/contenuti.js <url-rev2> <url-dev3> [--rev2-file realizzazione-arpacal.html] [--w 1440]
// Il contenuto confrontato è quello di <main> (rev2) e della radice .page-root (dev3): header e footer si verificano a parte.
const fs = require('fs');
const path = require('path');
const { openBrowser } = require('./cdp-session');
const { risolviLink } = require('./html2elementor');
const { risolviUrl } = require('./url-dev3');

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); if (i < 0) return d; const v = args[i + 1]; args.splice(i, 2); return v; };
const larghezza = parseInt(opt('--w', '1440'), 10);
const fileRev2 = opt('--rev2-file', '');
const [urlA, urlB] = args;
if (!urlA || !urlB) { console.error('uso: contenuti.js <url-rev2> <url-dev3> [--rev2-file x.html]'); process.exit(2); }

function estrai() {
  const radice = document.querySelector('main') && !document.querySelector('.page-root') ? document.querySelector('main') : document.querySelector('.page-root') || document.querySelector('main');
  const testo = radice.innerText.split('\n').map((r) => r.replace(/\s+/g, ' ').trim()).filter(Boolean);
  const link = Array.from(radice.querySelectorAll('a[href]')).filter((a) => a.getClientRects().length || getComputedStyle(a).display === 'contents').map((a) => ({ testo: (a.innerText || a.textContent || '').replace(/\s+/g, ' ').trim(), raw: (a.textContent || '').replace(/\s+/g, ' ').trim(), href: a.getAttribute('href') }));
  const immagini = Array.from(radice.querySelectorAll('img')).filter((i) => i.getAttribute('src')).map((i) => ({ src: (i.getAttribute('src') || '').split('/').pop(), alt: i.getAttribute('alt') || '', visibile: !!i.getClientRects().length }));
  const titoli = Array.from(radice.querySelectorAll('h1,h2,h3')).filter((h) => h.getClientRects().length).map((h) => h.tagName + ' ' + h.innerText.replace(/\s+/g, ' ').trim());
  return JSON.stringify({ testo, link, immagini, titoli });
}

const nomeFile = (u) => u.replace(/-\d+x\d+(?=\.\w+$)/, '').replace(/-\d+(?=\.\w+$)/, '').replace(/-(card|brand-[a-z0-9-]+)(?=\.\w+$)/, '').toLowerCase();
const percorso = (h) => { try { const u = new URL(h, 'https://dev3.minimalstudiodev.it'); return (u.pathname.replace(/\/+$/, '') || '/') + u.search + u.hash; } catch { return h; } };

(async () => {
  const uA = await risolviUrl(urlA); const uB = await risolviUrl(urlB);
  const dati = [];
  for (const url of [uA, uB]) {
    const b = await openBrowser({ width: larghezza, height: 900, mobile: larghezza < 700 });
    try { await b.navigate(url); await b.evalJs("document.querySelectorAll('.otgs-development-site-front-end, #wpadminbar').forEach(function (e) { e.remove(); }); 1"); dati.push(JSON.parse(await b.evalJs(`(${estrai.toString()})()`))); } finally { await b.close(); }
  }
  const [A, B] = dati; let problemi = 0;
  const riga = (t) => { console.log(t); problemi++; };
  // testo: confronto per riga (l'ordine conta)
  const max = Math.max(A.testo.length, B.testo.length);
  let diverse = 0;
  for (let i = 0; i < max; i++) if ((A.testo[i] || '') !== (B.testo[i] || '')) { if (diverse++ < 12) riga(`TESTO riga ${i + 1}: rev2 "${(A.testo[i] || '∅').slice(0, 90)}" ≠ dev3 "${(B.testo[i] || '∅').slice(0, 90)}"`); }
  if (diverse > 12) console.log(`  … altre ${diverse - 12} righe di testo diverse`);
  // titoli
  if (JSON.stringify(A.titoli) !== JSON.stringify(B.titoli)) riga(`TITOLI diversi:\n   rev2: ${A.titoli.join(' | ')}\n   dev3: ${B.titoli.join(' | ')}`);
  // link: testo + destinazione tradotta
  // i link alle foto (elementi della galleria) non si confrontano: in WordPress gli elementi del ciclo non sono <a>, la lightbox usa l'immagine
  const soloPagine = (l) => !/(^|\/)assets\/img\/|\/wp-content\/uploads\//.test(l.href || '');
  const lA = A.link.filter(soloPagine).map((l) => `${l.testo} → ${percorso(risolviLink(l.href, l.raw || l.testo, fileRev2 || 'rev2', []) || l.href)}`);
  const lB = B.link.filter(soloPagine).map((l) => `${l.testo} → ${percorso(l.href)}`);
  const setB = new Set(lB); const setA = new Set(lA);
  const manca = lA.filter((x) => !setB.has(x)); const inPiu = lB.filter((x) => !setA.has(x));
  manca.slice(0, 10).forEach((x) => riga(`LINK solo in rev2: ${x}`)); inPiu.slice(0, 10).forEach((x) => riga(`LINK solo su dev3: ${x}`));
  if (lA.length !== lB.length) riga(`LINK: numero diverso (rev2 ${lA.length}, dev3 ${lB.length})`);
  // immagini: file (senza suffissi di dimensione) e alt, nell'ordine
  const iA = A.immagini.map((i) => `${i.alt}`); const iB = B.immagini.map((i) => `${i.alt}`);
  if (iA.length !== iB.length) riga(`IMMAGINI: numero diverso (rev2 ${iA.length}, dev3 ${iB.length})`);
  iA.forEach((alt, k) => { if (iB[k] !== undefined && iB[k] !== alt) riga(`ALT immagine ${k + 1}: rev2 "${alt}" ≠ dev3 "${iB[k]}"`); });
  console.log(problemi ? `\n${problemi} differenze di contenuto` : 'contenuti identici (testo, titoli, link, alt delle immagini)');
  process.exit(problemi ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
