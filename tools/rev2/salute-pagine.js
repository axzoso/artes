'use strict';
// Controlli di "salute" delle pagine, senza confronto con la rev2 (piano §6): un solo H1, titolo della scheda presente, nessuna
// immagine rotta, nessun errore in console né eccezione, nessuna richiesta fallita o con risposta 4xx/5xx, nessuno scroll orizzontale.
// Sola lettura.
//   node tools/rev2/salute-pagine.js <percorso|url>… [--w 1440,390] [--parallelo 3]
//   node tools/rev2/salute-pagine.js --cpt        tutte le schede e gli archivi dei contenuti (20 realizzazioni, 18 brand, 2 archivi)
// I percorsi che iniziano con "/" si risolvono su dev3. Esce con codice 1 se un controllo fallisce.
const fs = require('fs');
const path = require('path');
const { openBrowser, sleep } = require('./cdp-session');

const root = path.resolve(__dirname, '..', '..');
const DEV3 = 'https://dev3.minimalstudiodev.it';
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); if (i < 0) return d; const v = args[i + 1]; args.splice(i, 2); return v; };
const larghezze = opt('--w', '1440,390').split(',').map(Number);
const parallelo = parseInt(opt('--parallelo', '3'), 10);
// Git Bash (MSYS) converte gli argomenti che iniziano con "/" in percorsi di Windows ("/x/" diventa "C:/Program Files/Git/x/"): si annulla
const rimettiPercorso = (a) => a.replace(/^[A-Za-z]:[\\/]Program Files[\\/]Git(?=[\\/])/, '').split('\\').join('/');
let pagine = args.filter((a) => !a.startsWith('--')).map(rimettiPercorso);
if (args.includes('--cpt')) {
  const E = require('./dati-rev2-carica')();
  pagine = ['/realizzazioni/', '/brand-partner/', ...E.realizzazioni.map((r) => `/realizzazioni/${r.slug}/`), ...E.brand.map((b) => `/brand-partner/${b.slug}/`)];
}
if (!pagine.length) { console.error('uso: salute-pagine.js <percorso|url>… | --cpt [--w 1440,390] [--parallelo 3]'); process.exit(2); }

// eseguita nella pagina
function inPagina() {
  var testo = function (e) { return e.textContent.split(/\s+/).join(' ').trim(); };
  var h1 = Array.prototype.slice.call(document.querySelectorAll('h1'));
  var imgs = Array.prototype.slice.call(document.images).filter(function (i) { return i.getAttribute('src'); });
  return JSON.stringify({
    titolo: document.title,
    h1: h1.length, h1testo: h1.map(function (h) { return testo(h).slice(0, 60); }),
    scrollX: document.documentElement.scrollWidth - window.innerWidth,
    rotte: imgs.filter(function (i) { return i.complete && i.naturalWidth === 0; }).map(function (i) { return i.getAttribute('src').slice(-90); }),
    immagini: imgs.length,
    senzaAlt: imgs.filter(function (i) { return !i.hasAttribute('alt'); }).length,
    rev2: document.body.classList.contains('rev2'),
  });
}

async function controlla(percorso, w) {
  const url = percorso.startsWith('/') ? DEV3 + percorso : percorso;
  const b = await openBrowser({ width: w, height: 900, mobile: w < 700 });
  const consola = []; const falliti = []; const url_di = new Map();
  try {
    await b.send('Network.enable'); await b.send('Log.enable'); await b.send('Runtime.enable');
    b.on('Network.requestWillBeSent', (p) => { url_di.set(p.requestId, p.request.url); });
    b.on('Network.responseReceived', (p) => { if (p.response.status >= 400) falliti.push(`${p.response.status} ${p.response.url}`.slice(0, 200)); });
    b.on('Network.loadingFailed', (p) => { if (p.errorText !== 'net::ERR_ABORTED') falliti.push(`${p.errorText} ${(url_di.get(p.requestId) || '').slice(0, 160)}`); });
    // un'eccezione senza indirizzo dello script viene dallo script che lo strumento inietta (animazioni spente), non dalla pagina
    b.on('Runtime.exceptionThrown', (p) => { const d = p.exceptionDetails; if (!d.url) return; consola.push('eccezione: ' + String((d.exception && d.exception.description) || d.text).split('\n')[0].slice(0, 200) + ' (' + d.url.slice(-80) + ')'); });
    b.on('Runtime.consoleAPICalled', (p) => { if (p.type === 'error') consola.push('console.error: ' + p.args.map((a) => a.value || a.description || '').join(' ').slice(0, 200)); });
    b.on('Log.entryAdded', (p) => { if (p.entry.level === 'error') consola.push(`log: ${p.entry.text} ${p.entry.url || ''}`.slice(0, 220)); });
    await b.navigate(url);
    await b.evalJs("document.querySelectorAll('.otgs-development-site-front-end, #wpadminbar').forEach(function (e) { e.remove(); }); 1");
    // viewport alto quanto la pagina: le immagini "lazy" si caricano tutte prima di controllarle
    const h = await b.docHeight(); await b.setViewport(w, Math.min(Math.max(h, 900), 16000)); await sleep(1800);
    const r = JSON.parse(await b.evalJs(`(${inPagina.toString()})()`));
    const problemi = [];
    // /favicon.ico: né la rev2 né dev3 dichiarano un'icona del sito (parità): il 404 del browser non è un difetto della pagina
    const senzaFavicon = (l) => l.filter((x) => !/\/favicon\.ico/.test(x));
    const fallitiVeri = senzaFavicon(falliti); const consolaVera = senzaFavicon(consola);
    if (r.h1 !== 1) problemi.push(`H1: ${r.h1} (${r.h1testo.join(' | ')})`);
    if (!r.titolo) problemi.push('titolo della pagina vuoto');
    if (r.scrollX > 0) problemi.push(`scroll orizzontale ${r.scrollX}px`);
    if (r.rotte.length) problemi.push(`immagini rotte: ${r.rotte.join(', ')}`);
    if (fallitiVeri.length) problemi.push(`richieste fallite: ${[...new Set(fallitiVeri)].join(' ; ')}`);
    if (consolaVera.length) problemi.push(`console: ${[...new Set(consolaVera)].join(' ; ')}`);
    return { percorso, w, r, problemi };
  } finally { await b.close(); }
}

(async () => {
  const lavori = pagine.flatMap((p) => larghezze.map((w) => ({ p, w })));
  const esiti = []; let i = 0;
  await Promise.all(Array.from({ length: parallelo }, async () => {
    while (i < lavori.length) {
      const l = lavori[i++];
      let e; try { e = await controlla(l.p, l.w); } catch (err) { e = { percorso: l.p, w: l.w, r: {}, problemi: ['errore dello strumento: ' + err.message] }; }
      esiti.push(e);
      console.log(`${e.problemi.length ? 'FAIL' : 'OK  '} ${e.percorso} @${e.w}px  H1 ${e.r.h1}  immagini ${e.r.immagini}${e.r.senzaAlt ? ` (senza alt ${e.r.senzaAlt})` : ''}${e.problemi.length ? '\n       · ' + e.problemi.join('\n       · ') : ''}`);
    }
  }));
  const ko = esiti.filter((e) => e.problemi.length);
  console.log(`\n${esiti.length} controlli (${pagine.length} pagine × ${larghezze.length} larghezze): ${esiti.length - ko.length} ok, ${ko.length} con problemi`);
  process.exit(ko.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
