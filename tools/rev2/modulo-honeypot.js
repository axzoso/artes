'use strict';
// Aggiunge il campo anti-spam nativo di Elementor Pro (`e-form-honeypot`, invisibile, uno per modulo) come ULTIMO figlio di ogni
// `e-form` dei documenti indicati. Idempotente; backup del _elementor_data in tools/out/rev2/modulo-honeypot-backup.json.
//   node tools/rev2/modulo-honeypot.js [id …]      (predefiniti: 152 Contatti IT, 1300 Contatti EN, 154 Richiedi preventivo IT)
//   node tools/rev2/modulo-honeypot.js --rollback
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { connetti } = require('./mcp-client');

const FILE_BACKUP = path.resolve(__dirname, '..', 'out', 'rev2', 'modulo-honeypot-backup.json');
const args = process.argv.slice(2);
const ids = args.filter((a) => /^\d+$/.test(a)).map(Number);
const elenco = ids.length ? ids : [152, 1300, 154];

(async () => {
  const nv = await connetti('novamira');
  if (args.includes('--rollback')) {
    const b = JSON.parse(fs.readFileSync(FILE_BACKUP, 'utf8'));
    const b64 = Buffer.from(JSON.stringify(b)).toString('base64');
    console.log(await nv.php(`$B = json_decode(base64_decode('${b64}'), true); foreach ($B as $id => $d) { update_post_meta((int) $id, '_elementor_data', wp_slash($d)); } \\Elementor\\Plugin::$instance->files_manager->clear_cache(); return 'ripristinati ' . count($B);`));
    return;
  }
  const backup = fs.existsSync(FILE_BACKUP) ? JSON.parse(fs.readFileSync(FILE_BACKUP, 'utf8')) : {};
  for (const id of elenco) {
    const raw = await nv.php(`return (string) get_post_meta(${id}, '_elementor_data', true);`);
    if (!raw) { console.log(`${id}: nessun dato Elementor, saltato`); continue; }
    if (!backup[id]) backup[id] = raw;
    // L'honeypot va per ULTIMO: Elementor Pro, quando lo scarta, rinumera i campi (array_values) ma abbina i file caricati con i
    // numeri originali; un honeypot PRIMA del campo allegati fa ignorare i file in silenzio (verificato 2026-11-25). Ultimo = nessuno spostamento.
    const data = JSON.parse(raw); let aggiunti = 0; let presenti = 0; let spostati = 0;
    const visita = (els) => { for (const e of els) {
      if (e.elType === 'e-form' || e.widgetType === 'e-form') {
        const figli = e.elements || [];
        const i = figli.findIndex((f) => f.widgetType === 'e-form-honeypot');
        if (i === -1) { figli.push({ id: crypto.randomBytes(4).toString('hex').slice(0, 7), elType: 'widget', settings: {}, elements: [], widgetType: 'e-form-honeypot', version: '0.0' }); aggiunti++; }
        else if (i !== figli.length - 1) { figli.push(figli.splice(i, 1)[0]); spostati++; }
        else presenti++;
        e.elements = figli;
      }
      if (e.elements) visita(e.elements);
    } };
    visita(data);
    if (aggiunti || spostati) {
      const b64 = Buffer.from(JSON.stringify(data)).toString('base64');
      await nv.php(`update_post_meta(${id}, '_elementor_data', wp_slash(base64_decode('${b64}'))); return 1;`);
    }
    console.log(`${id}: honeypot aggiunti ${aggiunti}, spostati in fondo ${spostati}, già a posto ${presenti}`);
  }
  fs.writeFileSync(FILE_BACKUP, JSON.stringify(backup));
  console.log(await nv.php("\\Elementor\\Plugin::$instance->files_manager->clear_cache(); wp_cache_flush(); return 'cache svuotate';"));
})().catch((e) => { console.error(e); process.exit(1); });
