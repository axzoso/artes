'use strict';
// Condizioni di visualizzazione dei site part rev2 (fase 4): durante i collaudi valgono solo per alcuni articoli di prova, poi si
// attivano per tutti. Gli ID dei site part nuovi stanno in tools/out/rev2/fase4-ids.json (creati con --crea).
//   node tools/rev2/condizioni.js --crea                 crea (se mancano) i 4 site part nuovi: singolo realizzazione, singolo brand,
//                                                         archivio realizzazioni, archivio brand (titoli "(rev2)", in bozza, senza condizioni)
//   node tools/rev2/condizioni.js --collaudo             header e footer rev2 + singoli nuovi SOLO sugli articoli di prova (e la pagina 542)
//   node tools/rev2/condizioni.js --attiva               attiva i template nuovi per TUTTE le schede e gli archivi, mette in bozza i vecchi
//                                                         (138, 448, 213, 447) e toglie 542 dalle condizioni di header e footer rev2
//   node tools/rev2/condizioni.js --stato                stampa le condizioni attuali
// I vecchi template NON si cancellano: restano in bozza per poter tornare indietro.
const fs = require('fs');
const path = require('path');
const { connetti } = require('./mcp-client');

const root = path.resolve(__dirname, '..', '..');
const fileIds = path.join(root, 'tools', 'out', 'rev2', 'fase4-ids.json');
const ids = fs.existsSync(fileIds) ? JSON.parse(fs.readFileSync(fileIds, 'utf8')) : {};
const HEADER = 557; const FOOTER = 971;
const VECCHI = { singolo_realizzazione: 138, singolo_brand: 448, archivio_realizzazioni: 213, archivio_brand: 447 };
const TITOLI = { singolo_realizzazione: ['single', 'Singolo Realizzazione (rev2)'], singolo_brand: ['single', 'Singolo Brand (rev2)'], archivio_realizzazioni: ['archive', 'Archivio Realizzazioni (rev2)'], archivio_brand: ['archive', 'Archivio Brand (rev2)'] };
// articoli di prova: realizzazioni (progettista + brand con link, nessuna correlata, 19 foto…) e brand (con foto, senza foto, con 3 progetti)
const PROVA = { realizzazione: [55, 81, 1029, 71, 98], brand: [37, 31, 40, 46] };

const modo = process.argv[2];
(async () => {
  const el = await connetti('elementor');
  const aggiorna = async (operazioni) => { const r = await el.callJson('elementor-manage-site-parts', { operations: operazioni }); return r.results.map((x) => `${x.id || x.post_id}:${x.status}${x.conflicts && x.conflicts.length ? ' CONFLITTI ' + JSON.stringify(x.conflicts) : ''}`).join(' '); };
  if (modo === '--crea') {
    for (const [chiave, [tipo, titolo]] of Object.entries(TITOLI)) {
      if (ids[chiave]) { console.log(`${chiave}: già creato (${ids[chiave]})`); continue; }
      const r = await el.callJson('elementor-manage-site-parts', { operations: [{ action: 'create', type: tipo, title: titolo }] });
      ids[chiave] = r.results[0].id; console.log(`${chiave}: creato ${ids[chiave]}`);
    }
    fs.writeFileSync(fileIds, JSON.stringify(ids, null, 1));
  } else if (modo === '--collaudo') {
    const cr = PROVA.realizzazione.map((i) => `include/singular/realizzazione/${i}`); const cb = PROVA.brand.map((i) => `include/singular/brand/${i}`);
    const ops = [
      { action: 'update', post_id: HEADER, conditions: ['include/singular/page/542', ...cr, ...cb] },
      { action: 'update', post_id: FOOTER, conditions: ['include/singular/page/542', ...cr, ...cb] },
    ];
    if (ids.singolo_realizzazione) ops.push({ action: 'update', post_id: ids.singolo_realizzazione, conditions: cr });
    if (ids.singolo_brand) ops.push({ action: 'update', post_id: ids.singolo_brand, conditions: cb });
    console.log(await aggiorna(ops));
  } else if (modo === '--attiva') {
    for (const k of Object.keys(VECCHI)) if (!ids[k]) { console.error('manca il site part nuovo: ' + k); process.exit(1); }
    const generali = { singolo_realizzazione: ['include/singular/realizzazione'], singolo_brand: ['include/singular/brand'], archivio_realizzazioni: ['include/archive/realizzazione_archive'], archivio_brand: ['include/archive/brand_archive'] };
    const ops = [
      ...Object.entries(generali).map(([k, c]) => ({ action: 'update', post_id: ids[k], conditions: c })),
      ...Object.values(VECCHI).map((v) => ({ action: 'update', post_id: v, conditions: [] })),
      { action: 'update', post_id: HEADER, conditions: [...generali.singolo_realizzazione, ...generali.singolo_brand, ...generali.archivio_realizzazioni, ...generali.archivio_brand] },
      { action: 'update', post_id: FOOTER, conditions: [...generali.singolo_realizzazione, ...generali.singolo_brand, ...generali.archivio_realizzazioni, ...generali.archivio_brand] },
    ];
    console.log(await aggiorna(ops));
    console.log('Da fare a mano nello stesso passaggio: mettere in bozza i vecchi template (138, 448, 213, 447) con elementor-manage-... / wp_update_post.');
  } else if (modo === '--stato') {
    const r = await el.callJson('elementor-list-site-parts', {});
    for (const x of (r.result || [])) console.log(`${x.id} | ${x.type} | ${x.title} | ${x.post_status} | ${JSON.stringify(x.conditions)}`);
  } else { console.error('uso: condizioni.js --crea|--collaudo|--attiva|--stato'); process.exit(2); }
})().catch((e) => { console.error(e.message); process.exit(1); });
