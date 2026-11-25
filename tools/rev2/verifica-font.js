'use strict';
// Verifica che le pagine NON contattino Google Fonts e che i tre caratteri del sito siano davvero caricati dai file locali del plugin.
//   node tools/rev2/verifica-font.js [percorso…]      (predefiniti: home IT/EN, una scheda, un archivio, contatti, 404)
const { openBrowser, sleep } = require('./cdp-session');
const BASE = 'https://dev3.minimalstudiodev.it';
const arg = process.argv.slice(2).map((a) => a.replace(/^[A-Za-z]:[\\/]Program Files[\\/]Git(?=[\\/])/, '').split('\\').join('/'));
const pagine = arg.length ? arg : ['/', '/en/', '/realizzazioni/arpacal/', '/brand-partner/', '/contatti/', '/pagina-inesistente/'];

(async () => {
  let ko = 0;
  for (const p of pagine) {
    const b = await openBrowser({ width: 1440 });
    const richieste = [];
    try {
      await b.send('Network.enable');
      b.on('Network.requestWillBeSent', (e) => richieste.push(e.request.url));
      await b.navigate(BASE + p);
      await sleep(800);
      const st = JSON.parse(await b.evalJs(`JSON.stringify({
        caricati: Array.from(document.fonts).filter(function (f) { return f.status === 'loaded'; }).map(function (f) { return f.family.replace(/"/g, '') + ' ' + f.weight; }),
        titolo: getComputedStyle(document.querySelector('h1') || document.body).fontFamily.split(',')[0],
        testo: getComputedStyle(document.querySelector('p') || document.body).fontFamily.split(',')[0]
      })`));
      const google = richieste.filter((u) => /fonts\.(googleapis|gstatic)\.com/.test(u));
      const locali = richieste.filter((u) => /artes-core\/fonts\/.+\.woff2/.test(u)).map((u) => u.split('/').pop());
      const famiglie = new Set(st.caricati.map((c) => c.split(' ').slice(0, -1).join(' ')));
      const ok = google.length === 0 && locali.length > 0 && ['Archivo', 'Instrument Sans', 'IBM Plex Mono'].every((f) => famiglie.has(f));
      if (!ok) ko++;
      console.log(`${ok ? 'OK  ' : 'FAIL'} ${p}: richieste a Google ${google.length}; file locali ${locali.length} (${[...new Set(locali)].join(', ')}); caricati: ${[...new Set(st.caricati)].join(', ')}`);
      google.forEach((g) => console.log('       Google: ' + g.slice(0, 120)));
    } finally { await b.close(); }
  }
  process.exit(ko ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
