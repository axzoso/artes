'use strict';
// Screenshot a pagina intera di più URL e più larghezze con una sola istanza di Chrome per larghezza.
//   node tools/rev2/shots.js <cartella-uscita> <larghezze,separate,da,virgola> <url|file-elenco> [...]
// Il nome del file è ricavato dall'URL (percorso + eventuale query). Con "@elenco.txt" legge gli URL da un file (uno per riga).
const fs = require('fs');
const path = require('path');
const { openBrowser } = require('./cdp-session');

function nomeFile(url) {
  const u = new URL(url);
  let n = (u.pathname === '/' ? 'home' : u.pathname.replace(/^\/|\/$/g, '').replace(/[\/\\]/g, '_')) + (u.search ? '_' + u.search.slice(1).replace(/[^\w=&-]/g, '').replace(/[=&]/g, '-') : '');
  return n.replace(/\.html$/, '') || 'home';
}

async function shots(outDir, widths, urls, { mobileBelow = 700 } = {}) {
  const risultati = [];
  for (const w of widths) {
    const b = await openBrowser({ width: w, height: 900, mobile: w < mobileBelow });
    try {
      for (const url of urls) {
        const file = path.join(outDir, `${nomeFile(url)}@${w}.png`);
        try { await b.navigate(url); const r = await b.screenshotFull(file); risultati.push({ url, w, file, altezza: r.height }); console.log(`${String(w).padStart(5)} ${String(r.height).padStart(6)}px  ${url}`); }
        catch (e) { console.log(`${String(w).padStart(5)}  ERRORE ${url}: ${e.message}`); risultati.push({ url, w, errore: e.message }); }
      }
    } finally { await b.close(); }
  }
  return risultati;
}

module.exports = { shots, nomeFile };

if (require.main === module) {
  const [outDir, larghezze, ...resto] = process.argv.slice(2);
  if (!outDir || !larghezze || !resto.length) { console.error('uso: node shots.js <cartella> <1440,390> <url|@elenco.txt> ...'); process.exit(2); }
  let urls = [];
  for (const r of resto) { if (r.startsWith('@')) urls.push(...fs.readFileSync(r.slice(1), 'utf8').split(/\r?\n/).map((s) => s.trim()).filter((s) => s && !s.startsWith('#'))); else urls.push(r); }
  shots(outDir, larghezze.split(',').map(Number), urls).then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
}
