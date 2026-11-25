'use strict';
// Prova di conversione di tutte le pagine rev2 (nessuna scrittura su dev3): conta elementi e avvisi per pagina e raggruppa gli
// avvisi per tipo, per vedere cosa il convertitore non sa ancora fare.
//   node tools/rev2/converti-tutte.js [--dettagli]
const fs = require('fs');
const path = require('path');
const { parse, trova, classi } = require('./html-parse');
const { converti } = require('./html2elementor');

const rev2 = path.resolve(__dirname, '..', '..', 'artes-sito-rev2');
const dettagli = process.argv.includes('--dettagli');
const gruppi = {}; let tot = 0; let totElementi = 0; const perPagina = [];
for (const f of fs.readdirSync(rev2).filter((n) => n.endsWith('.html')).sort()) {
  const { radice } = parse(fs.readFileSync(path.join(rev2, f), 'utf8'));
  const m = trova(radice, (n) => n.tag === 'main')[0];
  if (!m) { console.log('senza <main>:', f); continue; }
  const r = converti(m, { file: f, soloFigli: true, radice: { classi: ['page-root', ...classi(m)] } });
  tot++; totElementi += r.elementi;
  perPagina.push([f, r.elementi, r.avvisi.length]);
  for (const a of r.avvisi) {
    const tipo = a.replace(/^[^:]+: /, '').replace(/class="[^"]*"/g, 'class="…"').replace(/: .*$/, (x) => (x.length > 60 ? '' : x)).slice(0, 110);
    (gruppi[tipo] = gruppi[tipo] || []).push(f + ' → ' + a.replace(/^[^:]+: /, '').slice(0, 140));
  }
}
console.log(`pagine convertite: ${tot}; elementi Elementor in totale: ${totElementi}`);
console.log('\nAvvisi raggruppati:');
for (const [k, v] of Object.entries(gruppi).sort((a, b) => b[1].length - a[1].length)) {
  console.log(`  ${String(v.length).padStart(4)} × ${k}`);
  if (dettagli) v.slice(0, 3).forEach((x) => console.log('         ' + x));
}
console.log('\nPagine più grandi:', perPagina.sort((a, b) => b[1] - a[1]).slice(0, 5).map((p) => `${p[0]} (${p[1]})`).join(', '));
