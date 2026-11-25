'use strict';
// Pagina 404 del sito (template Theme Builder "Errore 404", non presente nella rev2), italiano + traduzione inglese WPML.
// Sorgenti: tools/rev2/modelli/404.html e 404-en.html; stile: tools/rev2/css/adattamenti.css, sezione "Pagina 404".
//   node tools/rev2/pagina-404.js --esegui     crea (se mancano) le classi e404__*, il template IT con condizione include/singular/not_found404,
//                                              la traduzione EN collegata in WPML (senza condizioni), costruisce e pubblica entrambi
//   node tools/rev2/pagina-404.js --stato      ID, stato e condizioni
//   node tools/rev2/pagina-404.js --rollback   mette nel cestino i due template (la 404 torna quella del tema)
// ID salvati in tools/out/rev2/pagina-404.json.
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { connetti } = require('./mcp-client');

const root = path.resolve(__dirname, '..', '..');
const FILE_IDS = path.join(root, 'tools', 'out', 'rev2', 'pagina-404.json');
const ids = fs.existsSync(FILE_IDS) ? JSON.parse(fs.readFileSync(FILE_IDS, 'utf8')) : {};
const salva = () => fs.writeFileSync(FILE_IDS, JSON.stringify(ids, null, 1));
const modo = process.argv[2];

function classiDelModello() {
  const html = fs.readFileSync(path.join(__dirname, 'modelli', '404.html'), 'utf8');
  return [...new Set([...html.matchAll(/class="([^"]+)"/g)].flatMap((m) => m[1].split(/\s+/)).filter((c) => c.startsWith('e404')))];
}
function costruisci(modello, id) {
  const r = spawnSync(process.execPath, [path.join(__dirname, 'costruisci-modello.js'), modello, '--invia', String(id), '--pubblica'], { cwd: root, encoding: 'utf8' });
  const out = (r.stdout + r.stderr).split('\n').filter((l) => /SCRITTO|pubblicato|errore|Error/i.test(l)).join('\n');
  console.log(`  ${modello} -> ${id}:\n  ${out.slice(0, 600)}`);
  if (r.status !== 0) throw new Error('costruzione fallita: ' + modello);
}

(async () => {
  if (!['--esegui', '--stato', '--rollback'].includes(modo)) { console.error('uso: pagina-404.js --esegui | --stato | --rollback'); process.exit(2); }
  const el = await connetti('elementor'); const nv = await connetti('novamira');
  if (modo === '--stato' || modo === '--rollback') {
    if (!ids.it) { console.log('nessun template 404 creato'); return; }
    if (modo === '--rollback') { console.log(await nv.php(`foreach ([${ids.it}, ${ids.en || 0}] as $i) { if ($i) wp_trash_post($i); } \\Elementor\\Plugin::$instance->files_manager->clear_cache(); return 'cestinati';`)); return; }
    console.log(JSON.stringify(await nv.php(`$o=[]; foreach ([${ids.it}, ${ids.en || 0}] as $i) { if (!$i) continue; $o[$i] = [get_post_status($i), get_post_meta($i,'_elementor_template_type',true), get_post_meta($i,'_elementor_conditions',true), apply_filters('wpml_post_language_details', null, $i)['language_code'] ?? null]; } return $o;`), null, 1));
    return;
  }
  // 1. classi globali (solo etichetta, lo stile è nel CSS del plugin)
  const classi = classiDelModello();
  const esistenti = await el.callJson('elementor-manage-classes', { operations: [{ action: 'list' }] }).catch(() => null);
  const etichette = new Set(JSON.stringify(esistenti || '').match(/"label":"[^"]+"/g)?.map((x) => x.slice(9, -1)) || []);
  const mancanti = classi.filter((c) => !etichette.has(c));
  if (mancanti.length) {
    const r = await el.callJson('elementor-manage-classes', { operations: mancanti.map((label) => ({ action: 'create', label, css: '--a: 0;' })) });
    console.log(`classi create: ${mancanti.length} (${JSON.stringify(r).slice(0, 160)})`);
  } else console.log('classi e404__*: già presenti');
  // 2. template IT
  if (!ids.it) {
    const r = await el.callJson('elementor-manage-site-parts', { operations: [{ action: 'create', type: 'error-404', title: 'Errore 404 (rev2)' }] });
    ids.it = r.results[0].id || r.results[0].post_id; salva(); console.log('template IT creato:', ids.it);
  }
  // 3. traduzione EN: post elementor_library collegato al trid dell'IT, senza condizioni (WPML la sceglie da sé sulle pagine /en/)
  if (!ids.en) {
    const en = await nv.php(String.raw`
      $it = ${ids.it};
      $id = wp_insert_post(['post_type' => 'elementor_library', 'post_status' => 'draft', 'post_title' => 'Error 404 (rev2)', 'post_name' => 'errore-404-rev2-en'], true);
      if (is_wp_error($id)) return 'ERRORE ' . $id->get_error_message();
      update_post_meta($id, '_elementor_template_type', 'error-404'); update_post_meta($id, '_elementor_edit_mode', 'builder');
      update_post_meta($id, '_elementor_version', get_post_meta($it, '_elementor_version', true)); update_post_meta($id, '_artes_rev2', '1');
      wp_set_object_terms($id, 'error-404', 'elementor_library_type');
      $tr = apply_filters('wpml_element_trid', null, $it, 'post_elementor_library');
      do_action('wpml_set_element_language_details', ['element_id' => $id, 'element_type' => 'post_elementor_library', 'trid' => $tr, 'language_code' => 'en-gb', 'source_language_code' => 'it']);
      return $id;`);
    if (!Number.isInteger(en)) throw new Error('traduzione EN non creata: ' + en);
    ids.en = en; salva(); console.log('template EN creato:', ids.en);
  }
  // 4. contenuti e pubblicazione
  costruisci('404', ids.it);
  costruisci('404-en', ids.en);
  // 5. condizione solo sull'IT
  const c = await el.callJson('elementor-manage-site-parts', { operations: [{ action: 'update', post_id: ids.it, conditions: ['include/singular/not_found404'] }] });
  console.log('condizione:', JSON.stringify(c.results.map((x) => x.status)));
  console.log(await nv.php(`delete_post_meta(${ids.en}, '_elementor_conditions'); \\Elementor\\Plugin::$instance->files_manager->clear_cache(); wp_cache_flush(); return 'cache svuotate';`));
})().catch((e) => { console.error(e.message || e); process.exit(1); });
