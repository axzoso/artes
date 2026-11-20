'use strict';
// Confronta due cartelle di screenshot (stessi nomi di file) e scrive le immagini delle differenze.
//   node tools/rev2/diff-dirs.js <cartella-prima> <cartella-dopo> <cartella-differenze> [--tol 10]
const fs = require('fs');
const path = require('path');
const { comparePngs } = require('./png-diff');

const args = process.argv.slice(2); const ti = args.indexOf('--tol'); let tol = 10; if (ti >= 0) { tol = parseInt(args[ti + 1], 10); args.splice(ti, 2); }
const [A, B, D] = args;
if (!A || !B || !D) { console.error('uso: node diff-dirs.js <prima> <dopo> <differenze> [--tol 10]'); process.exit(2); }
fs.mkdirSync(D, { recursive: true });
let ko = 0; let n = 0;
for (const f of fs.readdirSync(A).filter((x) => x.endsWith('.png')).sort()) {
  if (!fs.existsSync(path.join(B, f))) { console.log(`MANCA  ${f}`); ko++; continue; }
  n++;
  const r = comparePngs(path.join(A, f), path.join(B, f), { tol, diffOut: path.join(D, f) });
  const stato = r.diversi === 0 ? 'identica' : (r.percentuale < 0.05 ? 'quasi identica' : 'DIVERSA');
  if (r.diversi) ko++;
  console.log(`${stato.padEnd(15)} ${f.padEnd(46)} ${r.widthA}x${r.heightA} / ${r.widthB}x${r.heightB}  pixel diversi: ${String(r.diversi).padStart(8)} (${r.percentuale}%)${r.bande.length ? '  bande: ' + r.bande.slice(0, 4).map((b) => `${b.da}-${b.a}px ${b.percentuale}%`).join(', ') : ''}`);
}
console.log(`\n${n} confronti, ${ko} con differenze`);
