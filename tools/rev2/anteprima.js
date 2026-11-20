'use strict';
// Crea un link di anteprima (firmato e a tempo) per un documento di dev3 e lo scrive in tools/out/rev2/anteprima-<id>.txt.
// Aggiunge &artes_rev2=1 (carica CSS e JavaScript della rev2 anche se la pagina non è ancora marcata come rev2).
//   node tools/rev2/anteprima.js <post_id>
const fs = require('fs');
const path = require('path');
const { connetti } = require('./mcp-client');
const id = parseInt(process.argv[2], 10);
if (!id) { console.error('uso: anteprima.js <post_id>'); process.exit(2); }
(async () => {
  const el = await connetti('elementor');
  const p = await el.callJson('elementor-create-preview-link', { post_id: id });
  if (!p.url) throw new Error('nessun url: ' + JSON.stringify(p).slice(0, 300));
  const url = p.url + '&artes_rev2=1';
  fs.writeFileSync(path.resolve(__dirname, '..', 'out', 'rev2', `anteprima-${id}.txt`), url);
  console.log(url);
})().catch((e) => { console.error(e.message); process.exit(1); });
