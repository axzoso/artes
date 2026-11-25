'use strict';
// Caratteri del sito serviti dal sito stesso (niente richieste a Google: privacy/GDPR). Legge il CSS di Google Fonts per i pesi usati,
// tiene solo gli alfabeti latino e latino esteso, scarica i file woff2 in wp/artes-core/fonts/ e scrive wp/artes-core/fonts/fonts.css
// con le stesse dichiarazioni @font-face (stessi unicode-range e font-display: swap) e indirizzi relativi.
//   node tools/rev2/font-locali.js            (riscarica e rigenera; da rilanciare solo se cambiano famiglie o pesi)
// Licenza: Archivo, Instrument Sans e IBM Plex Mono sono SIL Open Font License 1.1 (uso e ridistribuzione consentiti).
const fs = require('fs');
const path = require('path');

const URL_CSS = 'https://fonts.googleapis.com/css2?family=Archivo:wght@300;400;500;600&family=Instrument+Sans:wght@400;500&family=IBM+Plex+Mono:wght@400;500&display=swap';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';
const SUBSET = new Set(['latin', 'latin-ext']);
const dir = path.resolve(__dirname, '..', '..', 'wp', 'artes-core', 'fonts');
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-');

(async () => {
  const css = await (await fetch(URL_CSS, { headers: { 'User-Agent': UA } })).text();
  const blocchi = [...css.matchAll(/\/\* ([a-z-]+) \*\/\s*(@font-face \{[^}]+\})/g)].filter((m) => SUBSET.has(m[1]));
  fs.mkdirSync(dir, { recursive: true });
  const scaricati = new Map(); const regole = [];
  // un file usato da più pesi è un carattere variabile: lo si chiama così, non col primo peso
  const pesiPerUrl = new Map(); for (const [, , b] of blocchi) { const u = b.match(/url\((https:[^)]+)\)/)[1]; pesiPerUrl.set(u, (pesiPerUrl.get(u) || 0) + 1); }
  for (const [, subset, blocco] of blocchi) {
    const fam = blocco.match(/font-family: '([^']+)'/)[1];
    const peso = blocco.match(/font-weight: ([^;]+);/)[1].replace(/\s+/g, '-');
    const url = blocco.match(/url\((https:[^)]+)\)/)[1];
    let nome = scaricati.get(url);
    if (!nome) {
      nome = `${slug(fam)}-${pesiPerUrl.get(url) > 1 ? 'variabile' : peso}-${subset}.woff2`;
      const buf = Buffer.from(await (await fetch(url, { headers: { 'User-Agent': UA } })).arrayBuffer());
      if (buf.length < 1000 || buf.slice(0, 4).toString() !== 'wOF2') throw new Error('file non valido: ' + url);
      fs.writeFileSync(path.join(dir, nome), buf); scaricati.set(url, nome);
      console.log(`  ${nome}  ${(buf.length / 1024).toFixed(1)} KB`);
    }
    regole.push(`/* ${fam} ${peso} — ${subset} */\n` + blocco.replace(/url\([^)]+\)/, `url(${nome})`));
  }
  const intestazione = '/* Caratteri del sito ARTES serviti localmente (generato da tools/rev2/font-locali.js, non modificare a mano).\n   Archivo, Instrument Sans, IBM Plex Mono — SIL Open Font License 1.1. Alfabeti: latino e latino esteso. */\n';
  fs.writeFileSync(path.join(dir, 'fonts.css'), intestazione + regole.join('\n') + '\n');
  const tot = [...scaricati.values()].reduce((s, n) => s + fs.statSync(path.join(dir, n)).size, 0);
  console.log(`regole @font-face: ${regole.length}; file: ${scaricati.size}; totale ${(tot / 1024).toFixed(0)} KB -> ${dir}`);
})().catch((e) => { console.error(e); process.exit(1); });
