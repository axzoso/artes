'use strict';
// Crea su dev3 le classi globali che la rev2 usa e che ancora non esistono (solo l'etichetta: lo stile arriva dal CSS del
// plugin, artes-rev2.css; la dichiarazione "--a: 0" serve solo perché Elementor non accetta una classe senza CSS).
//   node tools/rev2/crea-classi.js [--prova]
// Va eseguito DOPO la rinomina delle classi in collisione (rinomina-collisioni.ps1): confronta con le etichette attuali.
// Idempotente: crea solo quelle mancanti.
const fs = require('fs');
const path = require('path');
const { connetti } = require('./mcp-client');

const root = path.resolve(__dirname, '..', '..');
const prova = process.argv.includes('--prova');
// classi usate dalle pagine rev2 + classi di appoggio del convertitore (radice della pagina e tag sostituiti da div/span: vedi html2elementor.js)
const APPOGGIO = ['page-root', 'rev2-p', 'rev2-dl', 'rev2-dt', 'rev2-dd', 'rev2-ul', 'rev2-ol', 'rev2-li', 'rev2-small', 'rev2-strong', 'rev2-em', 'rev2-b', 'rev2-i', 'rev2-t', 'rev2-v', 'rev2-opz', 'rev2-opzimg', 'rev2-loop', 'rev2-a', 'rev2-dato', 'rev2-mb0'];
const rev2 = [...new Set([...JSON.parse(fs.readFileSync(path.join(root, 'tools', 'out', 'rev2', 'classi-rev2.json'), 'utf8')), ...APPOGGIO])];

(async () => {
  const nv = await connetti('novamira');
  const el = await connetti('elementor');
  const leggi = async () => Object.values(await nv.php(`return get_post_meta((int) get_option('elementor_active_kit'), '_elementor_global_classes_labels', true);`));
  const attuali = new Set(await leggi());
  const mancanti = rev2.filter((c) => !attuali.has(c));
  console.log(`classi della rev2: ${rev2.length}; già presenti: ${rev2.length - mancanti.length}; da creare: ${mancanti.length}; totale classi globali ora: ${attuali.size} (limite 1000)`);
  if (prova || !mancanti.length) return;
  if (attuali.size + mancanti.length > 1000) throw new Error('si supererebbe il limite di 1000 classi globali');
  let creati = 0; const problemi = [];
  for (let i = 0; i < mancanti.length; i += 50) {
    const lotto = mancanti.slice(i, i + 50);
    const r = await el.callJson('elementor-manage-classes', { operations: lotto.map((label) => ({ action: 'create', label, css: '--a: 0;' })) });
    for (const x of (r.results || [])) { if (x.status === 'ok' || x.status === 'created' || x.success) creati++; else problemi.push(JSON.stringify(x).slice(0, 200)); }
    console.log(`creati ${Math.min(i + 50, mancanti.length)}/${mancanti.length} (stato: ${r.status})`);
  }
  const dopo = new Set(await leggi());
  const ancora = rev2.filter((c) => !dopo.has(c));
  const rinominate = [...dopo].filter((c) => c.startsWith('DUP_'));
  console.log(`\nclassi globali ora: ${dopo.size}; mancanti dopo la creazione: ${ancora.length}; rinominate DUP_: ${rinominate.length}`);
  if (ancora.length) console.log('mancanti:', ancora.join(' '));
  if (rinominate.length) console.log('DUP_:', rinominate.join(' '));
  if (problemi.length) { console.log('PROBLEMI:'); problemi.slice(0, 10).forEach((p) => console.log('  ' + p)); }
})().catch((e) => { console.error(e); process.exit(1); });
