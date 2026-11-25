'use strict';
// Collaudo end-to-end dei moduli di contatto SENZA spedire email: accende la "modalità prova" del plugin (opzione artes_prova_invio,
// le email vengono registrate invece che spedite), invia il modulo da Chrome headless e controlla cosa sarebbe partito.
// Scenari: invio normale con 2 allegati (deve arrivare un'email con 2 allegati), honeypot compilato (rifiutato, nessuna email),
// messaggio con 4 link (rifiutato, nessuna email). Alla fine la modalità prova viene SEMPRE spenta.
//   node tools/rev2/collaudo-modulo.js [/contatti/ /en/contact/]
const fs = require('fs');
const os = require('os');
const path = require('path');
const { openBrowser, sleep } = require('./cdp-session');
const { connetti } = require('./mcp-client');

const BASE = 'https://dev3.minimalstudiodev.it';
const pagine = process.argv.slice(2).map((a) => a.replace(/^[A-Za-z]:[\\/]Program Files[\\/]Git(?=[\\/])/, '').split('\\').join('/'));
const PAGINE = pagine.length ? pagine : ['/contatti/', '/en/contact/'];

// due file minimi validi (PDF e PNG) in una cartella temporanea
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'artes-modulo-'));
const pdf = path.join(dir, 'prova-planimetria.pdf');
fs.writeFileSync(pdf, '%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Kids[]/Count 0>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n');
const png = path.join(dir, 'prova-foto.png');
fs.writeFileSync(png, Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64'));

async function invia(url, { allegati = [], honeypot = false, messaggio }) {
  const b = await openBrowser({ width: 1440, height: 1000 });
  try {
    await b.navigate(BASE + url + '?collaudo=' + Date.now());
    await b.evalJs(`(function () {
      var set = function (sel, v) { var e = document.querySelector(sel); if (!e) throw new Error('manca ' + sel); e.value = v; e.dispatchEvent(new Event('input', { bubbles: true })); e.dispatchEvent(new Event('change', { bubbles: true })); };
      set('#nome', 'Collaudo Artes'); set('#email', 'collaudo@example.com');
      var ta = document.querySelector('form textarea'); ta.value = ${JSON.stringify(messaggio)}; ta.dispatchEvent(new Event('input', { bubbles: true }));
      var p = document.querySelector('#privacy'); if (!p.checked) p.click();
      ${honeypot ? "var h = document.querySelector('input[tabindex=\"-1\"][aria-hidden=\"true\"]'); h.value = 'http://spam.example'; h.dispatchEvent(new Event('input', { bubbles: true }));" : ''}
      return 1; })()`);
    if (allegati.length) {
      const doc = await b.send('DOM.getDocument', { depth: -1 });
      const q = await b.send('DOM.querySelector', { nodeId: doc.result.root.nodeId, selector: '#allegati' });
      await b.send('DOM.setFileInputFiles', { nodeId: q.result.nodeId, files: allegati });
    }
    await b.evalJs("document.querySelector('form button[type=submit], form [type=submit]').click(); 1");
    let stato = 'nessuna risposta';
    for (let i = 0; i < 30; i++) {
      await sleep(500);
      stato = await b.evalJs(`(function () { var vis = function (s) { return Array.prototype.some.call(document.querySelectorAll(s), function (e) { return e.getClientRects().length && getComputedStyle(e).display !== 'none' && getComputedStyle(e).visibility !== 'hidden'; }); };
        if (vis('[class*="success"], .e-form-success-message')) return 'successo'; if (vis('[class*="error-message"], .e-form-error-message')) return 'errore'; return ''; })()`) || stato;
      if (stato === 'successo' || stato === 'errore') break;
    }
    return stato;
  } finally { await b.close(); }
}

(async () => {
  const nv = await connetti('novamira');
  const log = async () => (await nv.php("return array_values((array) get_option('artes_prova_invio_log', []));")) || [];
  await nv.php("update_option('artes_prova_invio', 1, false); update_option('artes_prova_invio_log', [], false); return 1;");
  let ko = 0;
  try {
    for (const url of PAGINE) {
      const casi = [
        { nome: 'invio normale con 2 allegati', opz: { allegati: [pdf, png], messaggio: 'Messaggio di collaudo del modulo (nessuna email reale).' }, atteso: 'successo', emailAttese: 1, allegatiAttesi: 2 },
        { nome: 'honeypot compilato (bot)', opz: { honeypot: true, messaggio: 'Messaggio di un bot.' }, atteso: 'errore', emailAttese: 0 },
        { nome: 'messaggio con 4 link', opz: { messaggio: 'http://a.example http://b.example http://c.example www.d.example' }, atteso: 'errore', emailAttese: 0 },
      ];
      for (const c of casi) {
        const prima = (await log()).length;
        const stato = await invia(url, c.opz);
        await sleep(1500);
        const dopo = await log(); const nuove = dopo.slice(prima);
        const nAll = nuove[0] ? (nuove[0].allegati || []).length : 0;
        const ok = stato === c.atteso && nuove.length === c.emailAttese && (c.allegatiAttesi === undefined || nAll === c.allegatiAttesi);
        if (!ok) ko++;
        console.log(`${ok ? 'OK  ' : 'FAIL'} ${url} — ${c.nome}: esito "${stato}" (atteso ${c.atteso}); email registrate ${nuove.length} (attese ${c.emailAttese})${c.allegatiAttesi !== undefined ? `; allegati ${nAll} (attesi ${c.allegatiAttesi})` : ''}`);
        for (const n of nuove) console.log(`       a: ${JSON.stringify(n.to)} | oggetto: ${n.subject} | allegati: ${JSON.stringify(n.allegati)}\n       testo: ${String(n.message).replace(/\s+/g, ' ').slice(0, 260)}`);
      }
    }
  } finally {
    await nv.php("update_option('artes_prova_invio', 0, false); return 1;");
    console.log('\nmodalità prova spenta (le email tornano a partire normalmente)');
  }
  process.exit(ko ? 1 : 0);
})().catch(async (e) => { console.error(e); try { const nv = await connetti('novamira'); await nv.php("update_option('artes_prova_invio', 0, false); return 1;"); } catch { /* */ } process.exit(2); });
