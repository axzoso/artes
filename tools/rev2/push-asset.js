'use strict';
// Carica direttamente su dev3 i file CSS/JS della rev2 nella cartella del plugin (senza reinstallare tutto lo ZIP): è il
// giro veloce per iterare sul CSS. Il rilascio vero resta tools/install-plugin.ps1 (che impacchetta gli stessi file).
//   node tools/rev2/push-asset.js [artes-rev2.css] [artes-rev2.js]      (senza argomenti: entrambi, se esistono)
const fs = require('fs');
const path = require('path');
const { connetti } = require('./mcp-client');

const dir = path.resolve(__dirname, '..', '..', 'wp', 'artes-core');
const file = process.argv.slice(2).length ? process.argv.slice(2) : ['artes-rev2.css', 'artes-rev2.js'];
(async () => {
  const nv = await connetti('novamira');
  for (const f of file) {
    const locale = path.join(dir, f);
    if (!fs.existsSync(locale)) { console.log('salto (non esiste):', f); continue; }
    const t = await nv.call('mcp-adapter-execute-ability', { ability_name: 'novamira/create-upload-link', parameters: { path: `wp-content/plugins/artes-core/${f}`, overwrite: true, expires_in: 120 } });
    const link = JSON.parse(t).data;
    const tipo = f.endsWith('.css') ? 'text/css' : f.endsWith('.js') ? 'application/javascript' : 'application/octet-stream';
    const r = await fetch(link.upload_url, { method: 'PUT', headers: { [link.token_header]: link.upload_token, 'Content-Type': tipo }, body: fs.readFileSync(locale) });
    const v = await nv.php(`$p = WP_PLUGIN_DIR . '/artes-core/${f}'; return ['esiste' => file_exists($p), 'byte' => file_exists($p) ? filesize($p) : 0, 'md5' => file_exists($p) ? md5_file($p) : null];`);
    const md5 = require('crypto').createHash('md5').update(fs.readFileSync(locale)).digest('hex');
    console.log(`${f}: HTTP ${r.status}; su dev3 ${v.byte} byte; ${v.md5 === md5 ? 'identico al locale' : 'DIVERSO dal locale'}`);
  }
})().catch((e) => { console.error(e.message); process.exit(1); });
