'use strict';
// Aggiunge il prefisso "o-" alle classi vecchie che in dev3 vengono rinominate (quelle con lo stesso nome di una classe della rev2),
// dentro il CSS vecchio del plugin (wp/artes-core/artes-core.css). Idempotente: non tocca ciò che ha già il prefisso.
//   node tools/rev2/prefissa-css-vecchio.js [--indietro]     (con --indietro toglie il prefisso)
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..', '..');
const elenco = JSON.parse(fs.readFileSync(path.join(root, 'tools', 'out', 'rev2', 'classi-collisioni.json'), 'utf8'));
const file = path.join(root, 'wp', 'artes-core', 'artes-core.css');
const indietro = process.argv.includes('--indietro');
let css = fs.readFileSync(file, 'utf8');
const alt = elenco.map((c) => c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
const re = indietro
  ? new RegExp('(?<![\\w-])\\.o-(' + alt + ')(?![\\w-])', 'g')
  : new RegExp('(?<![\\w-])\\.(' + alt + ')(?![\\w-])', 'g');
let n = 0;
css = css.replace(re, (m, c) => { n++; return indietro ? '.' + c : '.o-' + c; });
fs.writeFileSync(file, css);
console.log(`${indietro ? 'tolto' : 'aggiunto'} il prefisso in ${n} punti di ${path.relative(root, file)}`);
