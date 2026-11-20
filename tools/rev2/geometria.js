'use strict';
// Confronto strutturale rev2 / dev3: abbina gli elementi per classi (stessa lista di classi + stessa posizione tra quelli con
// la stessa lista) e confronta dimensioni, posizione relativa al genitore abbinato e stili calcolati. Individua quali elementi
// differiscono e di quanto, senza guardare gli screenshot.
//   node tools/rev2/geometria.js <url-rev2> <url-dev3> [--w 1440] [--tol 1.5] [--max 40] [--solo selettore-radice]
// Dopo il caricamento rimuove dal DOM il banner di sviluppo di WPML (non fa parte del design).
const { openBrowser } = require('./cdp-session');
const { risolviUrl } = require('./url-dev3');
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); if (i < 0) return d; const v = args[i + 1]; args.splice(i, 2); return v; };
const larghezza = parseInt(opt('--w', '1440'), 10); const tol = parseFloat(opt('--tol', '1.5')); const max = parseInt(opt('--max', '40'), 10);
const radiceSel = opt('--solo', '');
const percorso = opt('--percorso', '');   // percorso simulato per la voce attiva del menu
const [urlA, urlB] = args;
if (!urlA || !urlB) { console.error('uso: geometria.js <url-rev2> <url-dev3> [--w 1440] [--tol 1.5] [--max 40] [--solo selettore]'); process.exit(2); }

const STILI = ['display', 'position', 'font-size', 'font-weight', 'font-family', 'line-height', 'letter-spacing', 'text-transform', 'text-align', 'color', 'background-color', 'border-top-width', 'border-bottom-width', 'border-top-color', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left', 'margin-top', 'margin-bottom', 'flex-direction', 'justify-content', 'align-items', 'gap', 'opacity', 'object-fit', 'text-decoration-line'];

function raccogli(stili, radiceSel) {
  const out = [];
  const radice = radiceSel ? document.querySelector(radiceSel) : document.body;
  const scarta = /^(elementor|e-|rev2-|wpml|otgs|admin-bar|home|page-template|page-id|page$|page-|singular|wp-|no-js|has-|is-)/;
  const els = [radice, ...radice.querySelectorAll('*')];
  const conteggio = {};
  const idDi = new Map();
  for (const e of els) {
    if (['SCRIPT', 'STYLE', 'LINK', 'NOSCRIPT', 'META', 'BR'].includes(e.tagName)) continue;
    if (e.closest('#wpadminbar, .otgs-development-site-front-end, [class*="wpml-"]')) continue;
    if (!e.getClientRects().length && getComputedStyle(e).display !== 'contents') continue;   // non si vede (display:none, anche ereditato): non si confronta (le righe facoltative vuote esistono solo su dev3)
    // le classi caso-gallery--nK in WordPress sono condizioni :has(): non compaiono nel DOM, quindi non entrano nella chiave
    let cl = (typeof e.className === 'string' ? e.className : '').split(/\s+/).filter((c) => c && !scarta.test(c) && !/^caso-gallery--n\d$/.test(c));
    if (e.tagName === 'MAIN' || (e.classList && e.classList.contains('page-root'))) cl = ['page-root'];
    if (!cl.length) continue;
    const chiave = cl.slice().sort().join('.');
    conteggio[chiave] = (conteggio[chiave] || 0) + 1;
    const id = chiave + '#' + conteggio[chiave];
    idDi.set(e, id);
    const r = e.getBoundingClientRect(); const cs = getComputedStyle(e);
    const s = {}; for (const k of stili) s[k] = cs.getPropertyValue(k);
    // genitore abbinato più vicino (per la posizione relativa)
    let p = e.parentElement; while (p && !idDi.has(p)) p = p.parentElement;
    const pr = p ? p.getBoundingClientRect() : { x: 0, y: 0 };
    out.push({ id, chiave, tag: e.tagName.toLowerCase(), x: r.x - pr.x, y: r.y - pr.y, w: r.width, h: r.height, yAss: r.y + scrollY, padre: p ? idDi.get(p) : null, testo: (e.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 30), stili: s });
  }
  return JSON.stringify(out);
}

(async () => {
  const dati = [];
  const urlsRisolti = [await risolviUrl(urlA), await risolviUrl(urlB)];
  for (const url of urlsRisolti) {
    const b = await openBrowser({ width: larghezza, height: 900, mobile: larghezza < 700 });
    try {
      await b.navigate(url);
      await b.evalJs("document.querySelectorAll('.otgs-development-site-front-end, #wpadminbar').forEach(function (e) { e.remove(); }); 1");
      if (percorso && url !== urlsRisolti[0]) await b.evalJs('window.ArtesRev2 && ArtesRev2.marcaAttivo(' + JSON.stringify(percorso) + '); 1');
      dati.push(JSON.parse(await b.evalJs(`(${raccogli.toString()})(${JSON.stringify(STILI)}, ${JSON.stringify(radiceSel)})`)));
    } finally { await b.close(); }
  }
  const [A, B] = dati; const mappaB = new Map(B.map((e) => [e.id, e]));
  let senza = 0; const diff = [];
  for (const a of A) {
    const b = mappaB.get(a.id);
    if (!b) { senza++; diff.push({ y: a.yAss, id: a.id, righe: ['manca su dev3'] }); continue; }
    const righe = [];
    const num = (campo, va, vb) => { if (Math.abs(va - vb) > tol) righe.push(`${campo}: ${va.toFixed(1)} → ${vb.toFixed(1)} (Δ ${(vb - va).toFixed(1)})`); };
    num('w', a.w, b.w); num('h', a.h, b.h); num('x(rel)', a.x, b.x); num('y(rel)', a.y, b.y);
    for (const k of STILI) if (a.stili[k] !== b.stili[k]) { const na = parseFloat(a.stili[k]), nb = parseFloat(b.stili[k]); if (!isNaN(na) && !isNaN(nb) && /^-?[\d.]+(px)?$/.test(a.stili[k]) && /^-?[\d.]+(px)?$/.test(b.stili[k]) && Math.abs(na - nb) <= tol) continue; righe.push(`${k}: ${a.stili[k]} → ${b.stili[k]}`); }
    if (righe.length) diff.push({ y: a.yAss, id: a.id, tag: a.tag, testo: a.testo, righe });
  }
  const soloB = B.filter((e) => !A.some((a) => a.id === e.id)).length;
  console.log(`elementi con classe: rev2 ${A.length}, dev3 ${B.length}; senza corrispondente su dev3: ${senza}; solo su dev3: ${soloB}; elementi con differenze: ${diff.length}`);
  diff.sort((p, q) => p.y - q.y).slice(0, max).forEach((d) => console.log(`\n[y≈${Math.round(d.y)}] ${d.id} ${d.testo ? '"' + d.testo + '"' : ''}\n   ` + d.righe.slice(0, 8).join('\n   ')));
  if (diff.length > max) console.log(`\n… altre ${diff.length - max} (aumenta --max)`);
})().catch((e) => { console.error(e); process.exit(1); });
