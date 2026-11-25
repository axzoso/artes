'use strict';
// Parità di TUTTE le schede e gli archivi dei tipi di contenuto (20 realizzazioni, 18 brand, 2 archivi): per ognuna lancia
// parita.js (aspetto a 1440 e 390 px) e contenuti.js (testo, titoli, link, alt) con alcuni processi in parallelo e stampa una tabella.
//   node tools/rev2/parita-tutte.js [--solo realizzazioni|brand|archivi] [--parallelo 4] [--w 1440,390]
// Rev2 in locale (py -3 -m http.server 8765 (dalla radice del repository)); dev3 agli indirizzi veri (senza ?artes_rev2=1: i template
// rev2 sono attivi per tutte le schede dopo condizioni.js --attiva). Esito in tools/out/rev2/parita-tutte.json.
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const root = path.resolve(__dirname, '..', '..');
const E = JSON.parse(fs.readFileSync(path.join(root, 'tools', 'out', 'rev2', 'dati-rev2.json'), 'utf8'));
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const solo = opt('--solo', ''); const parallelo = parseInt(opt('--parallelo', '4'), 10); const larghezze = opt('--w', '1440,390');
const REV2 = 'http://localhost:8765/'; const DEV3 = 'https://dev3.minimalstudiodev.it';

const pagine = [];
if (!solo || solo === 'realizzazioni') for (const r of E.realizzazioni) pagine.push({ nome: 'r-' + r.slug, file: `realizzazione-${r.slug}.html`, dev3: `/realizzazioni/${r.slug}/` });
if (!solo || solo === 'brand') for (const b of E.brand) pagine.push({ nome: 'b-' + b.slug, file: `brand-${b.slug}.html`, dev3: `/brand-partner/${b.slug}/` });
if (!solo || solo === 'archivi') { pagine.push({ nome: 'a-realizzazioni', file: 'realizzazioni.html', dev3: '/realizzazioni/' }); pagine.push({ nome: 'a-brand', file: 'brand-partner.html', dev3: '/brand-partner/' }); }

const esegui = (cmd, argv) => new Promise((res) => { let out = ''; const p = spawn(process.execPath, [path.join(__dirname, cmd), ...argv], { cwd: root }); p.stdout.on('data', (d) => { out += d; }); p.stderr.on('data', (d) => { out += d; }); p.on('close', (code) => res({ code, out })); });

async function una(p) {
  const argParita = [p.nome, REV2 + p.file, DEV3 + p.dev3, '--w', larghezze, '--percorso', p.dev3];
  let par = await esegui('parita.js', argParita);
  // con più processi in parallelo qualche foto può non essere ancora caricata allo scatto: un risultato anomalo si ripete una volta
  const peggiore = (o) => Math.max(0, ...[...o.matchAll(/pixel diversi ([d.]+)%/g)].map((m) => +m[1]));
  if (peggiore(par.out) > 6) { const seconda = await esegui('parita.js', argParita); if (peggiore(seconda.out) < peggiore(par.out)) par = seconda; }
  const con = await esegui('contenuti.js', [REV2 + p.file, DEV3 + p.dev3, '--rev2-file', p.file]);
  const righe = [...par.out.matchAll(/== \S+ @(\d+)px: altezza rev2 (\d+) \/ dev3 (\d+) \(Δ (-?\d+)\); pixel diversi ([\d.]+)%; scroll orizzontale dev3: (-?\d+)px/g)];
  const misure = righe.map((m) => ({ w: +m[1], altezzaRev2: +m[2], altezzaDev3: +m[3], delta: +m[4], pixel: +m[5], scrollX: +m[6] }));
  return { ...p, misure, contenuti: con.code === 0 ? 'ok' : con.out.split('\n').filter((l) => /^(TESTO|LINK|ALT|TITOLI|IMMAGINI)/.test(l)).slice(0, 3).join(' | ') || 'errore (' + con.code + ')', errore: righe.length ? null : par.out.slice(0, 300) };
}

(async () => {
  const risultati = []; let i = 0;
  const lavoratori = Array.from({ length: parallelo }, async () => { while (i < pagine.length) { const p = pagine[i++]; const r = await una(p); risultati.push(r); const m = r.misure.map((x) => `${x.w}px Δ${x.delta} ${x.pixel}%`).join(' | '); console.log(`${r.nome.padEnd(30)} ${m}  contenuti: ${r.contenuti}`); } });
  await Promise.all(lavoratori);
  risultati.sort((a, b) => a.nome.localeCompare(b.nome));
  fs.writeFileSync(path.join(root, 'tools', 'out', 'rev2', 'parita-tutte.json'), JSON.stringify(risultati, null, 1));
  const peggiori = risultati.flatMap((r) => r.misure.map((m) => ({ nome: r.nome, ...m }))).sort((a, b) => b.pixel - a.pixel).slice(0, 6);
  const altezzeDiverse = risultati.flatMap((r) => r.misure.filter((m) => m.delta !== 0).map((m) => `${r.nome}@${m.w} Δ${m.delta}`));
  const scrollX = risultati.flatMap((r) => r.misure.filter((m) => m.scrollX > 0).map((m) => `${r.nome}@${m.w}`));
  const contenutiKo = risultati.filter((r) => r.contenuti !== 'ok');
  console.log(`\npagine: ${risultati.length}; con altezza diversa: ${altezzeDiverse.length}${altezzeDiverse.length ? ' (' + altezzeDiverse.slice(0, 8).join(', ') + ')' : ''}; con scroll orizzontale: ${scrollX.length}; con contenuti diversi: ${contenutiKo.length}`);
  console.log('pixel più diversi: ' + peggiori.map((m) => `${m.nome}@${m.w} ${m.pixel}%`).join(', '));
  contenutiKo.forEach((r) => console.log(`  CONTENUTI ${r.nome}: ${r.contenuti}`));
  const errori = risultati.filter((r) => r.errore); errori.forEach((r) => console.log(`  ERRORE ${r.nome}: ${r.errore}`));
})().catch((e) => { console.error(e); process.exit(1); });
