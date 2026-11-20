'use strict';
// Genera la composizione Elementor di un MODELLO DINAMICO (scheda realizzazione, scheda brand, archivi) da
// tools/rev2/modelli/<nome>.html e (con --invia) la scrive nel site part indicato e lo pubblica.
//   node tools/rev2/costruisci-modello.js realizzazione                      -> tools/out/rev2/comp/modello-realizzazione.json
//   node tools/rev2/costruisci-modello.js realizzazione --invia 1040 --pubblica   scrive e pubblica il site part 1040 (senza --pubblica scrive soltanto)
//   ... --prova                                                               dry run (nessuna scrittura)
// Gli attributi data-dyn / data-dyn-href / data-dyn-src / data-loop / data-opz dei modelli sono spiegati in html2elementor.js;
// la tabella degli alias è tools/rev2/dinamici.js.
const fs = require('fs');
const path = require('path');
const { parse, trova, classi } = require('./html-parse');
const { converti } = require('./html2elementor');
const dinamici = require('./dinamici');

const root = path.resolve(__dirname, '..', '..');
const uscita = path.join(root, 'tools', 'out', 'rev2', 'comp');
fs.mkdirSync(uscita, { recursive: true });

const args = process.argv.slice(2);
const nome = args[0];
const iv = args.indexOf('--invia'); const postId = iv >= 0 ? parseInt(args[iv + 1], 10) : null;
const prova = args.includes('--prova');
if (!nome) { console.error('uso: costruisci-modello.js <nome> [--invia <id>] [--prova]'); process.exit(1); }

const file = path.join(__dirname, 'modelli', nome + '.html');
const { radice, avvisi: avvisiParser } = parse(fs.readFileSync(file, 'utf8'));
if (avvisiParser.length) console.log('AVVISI parser:', avvisiParser);
const main = trova(radice, (n) => n.tag === 'main')[0];
if (!main) { console.error('nessun <main> in ' + file); process.exit(1); }

const r = converti(main, { file: nome + '.html', soloFigli: true, radice: { classi: ['page-root', ...classi(main)] }, dinamici });
fs.writeFileSync(path.join(uscita, `modello-${nome}.json`), JSON.stringify(r.composizione, null, 1));
console.log(`modello ${nome}: ${r.elementi} elementi; widget: ${JSON.stringify(r.statistiche)}`);
if (r.avvisi.length) { console.log(`AVVISI (${r.avvisi.length}):`); r.avvisi.forEach((a) => console.log('  - ' + a)); }

if (postId) {
  const { connetti } = require('./mcp-client');
  (async () => {
    const el = await connetti('elementor');
    const richiesta = { post_id: postId, mode: 'replace_children', parent_id: 'document', ...r.composizione, ...(prova ? { dry_run: true } : {}) };
    const t = await el.call('elementor-build-composition', richiesta);
    let j; try { j = JSON.parse(t); } catch { j = t; }
    if (typeof j === 'string') console.log(prova ? 'DRY RUN:' : 'SCRITTO:', j.slice(0, 800));
    else {
      console.log(prova ? 'DRY RUN:' : 'SCRITTO:', JSON.stringify({ root_element_ids: j.root_element_ids, undo_revision_id: j.undo_revision_id, validation: j.validation, errors: j.errors }).slice(0, 600));
      (j.warnings || []).slice(0, 12).forEach((w) => console.log('  warning:', String(w).slice(0, 240)));
    }
    // La pubblicazione è esplicita: un site part va pubblicato per entrare in funzione, ma una pagina di prova in bozza (es. 542) non deve diventare pubblica.
    if (!prova && args.includes('--pubblica')) { const p = await el.call('elementor-publish-document', { post_id: postId }); console.log('pubblicato:', p.slice(0, 80)); }
    else if (!prova) console.log('scritto ma NON pubblicato (aggiungere --pubblica per un site part)');
  })().catch((e) => { console.error(e.message); process.exit(1); });
}
