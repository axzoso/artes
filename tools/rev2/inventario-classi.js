'use strict';
// Inventario delle classi CSS usate dalla rev2 (pagine HTML + JavaScript) e confronto con le classi globali già presenti su dev3.
//   node tools/rev2/inventario-classi.js [cartella-rev2] [classi-attuali.json]
// Scrive tools/out/rev2/classi-rev2.json (elenco ordinato) e stampa le collisioni di nome.
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..', '..');
const rev2 = path.resolve(process.argv[2] || path.join(root, 'artes-sito-rev2'));
const attuali = process.argv[3] || path.join(root, 'tools', 'out', 'rev2', 'classi-attuali.json');
const out = path.join(root, 'tools', 'out', 'rev2');
fs.mkdirSync(out, { recursive: true });

const classi = new Map();
const aggiungi = (c, dove) => { if (!c || /[^\w-]/.test(c)) return; if (!classi.has(c)) classi.set(c, new Set()); classi.get(c).add(dove); };
for (const f of fs.readdirSync(rev2).filter((n) => n.endsWith('.html'))) {
  const h = fs.readFileSync(path.join(rev2, f), 'utf8');
  for (const m of h.matchAll(/\sclass="([^"]*)"/g)) for (const c of m[1].split(/\s+/)) aggiungi(c, f);
}
// classi aggiunte o attivate dal JavaScript (classList.add/toggle, className=)
const js = fs.readFileSync(path.join(rev2, 'assets', 'js', 'artes.js'), 'utf8');
for (const m of js.matchAll(/classList\.(?:add|remove|toggle|contains)\('([^']+)'/g)) aggiungi(m[1], 'artes.js');
for (const m of js.matchAll(/className\s*=\s*'([^']+)'/g)) for (const c of m[1].split(/\s+/)) aggiungi(c, 'artes.js');
for (const m of js.matchAll(/class="([^"]+)"/g)) for (const c of m[1].split(/\s+/)) aggiungi(c, 'artes.js');

const elenco = [...classi.keys()].sort();
fs.writeFileSync(path.join(out, 'classi-rev2.json'), JSON.stringify(elenco, null, 1));
console.log(`classi usate dalla rev2: ${elenco.length}`);

if (fs.existsSync(attuali)) {
  const mappa = JSON.parse(fs.readFileSync(attuali, 'utf8'));            // id -> etichetta
  const etichette = new Set(Object.values(mappa));
  const collisioni = elenco.filter((c) => etichette.has(c));
  const nuove = elenco.filter((c) => !etichette.has(c));
  fs.writeFileSync(path.join(out, 'classi-collisioni.json'), JSON.stringify(collisioni, null, 1));
  fs.writeFileSync(path.join(out, 'classi-nuove.json'), JSON.stringify(nuove, null, 1));
  console.log(`classi già presenti su dev3 con lo stesso nome (da rinominare con "o-"): ${collisioni.length}`);
  console.log(`classi nuove da creare: ${nuove.length}`);
  console.log('collisioni:', collisioni.join(' '));
}
