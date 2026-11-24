'use strict';
// Basi inglesi dei tipi di contenuto (WPML "traduzione degli slug dei tipi di contenuto"): /en/realizzazioni/ -> /en/projects/,
// /en/brand-partner/ -> /en/brand-partners/ (schede e archivi). I valori stanno in tools/rev2/wpml-url-en.js (BASI_PER_TIPO).
//   node tools/rev2/wpml-slug-cpt.js --stato | --esegui | --rollback
// --esegui accende la traduzione degli slug per `realizzazione` e `brand`, registra la stringa "URL slug: <tipo>" (contesto WordPress) con la
// traduzione en-gb e rigenera i permalink. Backup dell'impostazione WPML in tools/out/rev2/wpml-slug-cpt-backup.json.
const fs = require('fs');
const path = require('path');
const { connetti } = require('./mcp-client');
const { BASI_PER_TIPO } = require('./wpml-url-en');

const FILE_BACKUP = path.resolve(__dirname, '..', 'out', 'rev2', 'wpml-slug-cpt-backup.json');
const modo = process.argv[2];
const D = Buffer.from(JSON.stringify(BASI_PER_TIPO)).toString('base64');

const STATO = String.raw`
  global $sitepress, $wpdb; $out = ['impostazione' => $sitepress->get_setting('posts_slug_translation'), 'stringhe' => []];
  foreach ($T as $tipo => $v) {
    $out['stringhe'][$tipo] = $wpdb->get_row($wpdb->prepare("SELECT s.id, s.value, s.language, (SELECT CONCAT(t.value,'/',t.status) FROM {$wpdb->prefix}icl_string_translations t WHERE t.string_id=s.id AND t.language='en-gb') en FROM {$wpdb->prefix}icl_strings s WHERE s.context='WordPress' AND s.name=%s", 'URL slug: ' . $tipo), ARRAY_A);
    do_action('wpml_switch_language', 'en-gb'); $out['link_en'][$tipo] = get_post_type_archive_link($tipo); do_action('wpml_switch_language', 'it');
  }
  return $out;`;

(async () => {
  if (!['--stato', '--esegui', '--rollback'].includes(modo)) { console.error('uso: wpml-slug-cpt.js --stato | --esegui | --rollback'); process.exit(2); }
  const nv = await connetti('novamira');
  const php = (codice) => nv.php(`$T = json_decode(base64_decode('${D}'), true);\n${codice}`);
  if (modo === '--stato') { console.log(JSON.stringify(await php(STATO), null, 1)); return; }
  if (modo === '--rollback') {
    const b = JSON.parse(fs.readFileSync(FILE_BACKUP, 'utf8'));
    const b64 = Buffer.from(JSON.stringify(b)).toString('base64');
    console.log(JSON.stringify(await php(`$B = json_decode(base64_decode('${b64}'), true); global $sitepress, $wpdb;
      $sitepress->set_setting('posts_slug_translation', $B['impostazione'], true);
      foreach ($T as $tipo => $v) { $sid = $wpdb->get_var($wpdb->prepare("SELECT id FROM {$wpdb->prefix}icl_strings WHERE context='WordPress' AND name=%s", 'URL slug: ' . $tipo)); if ($sid && empty($B['stringhe'][$tipo])) { $wpdb->delete($wpdb->prefix . 'icl_string_translations', ['string_id' => $sid]); $wpdb->delete($wpdb->prefix . 'icl_strings', ['id' => $sid]); } }
      flush_rewrite_rules(false); wp_cache_flush(); return 'ripristinato';`)));
    return;
  }
  const prima = await php(STATO);
  if (!fs.existsSync(FILE_BACKUP)) fs.writeFileSync(FILE_BACKUP, JSON.stringify(prima, null, 1));
  const r = await php(String.raw`
    global $sitepress, $wpdb;
    $imp = (array) $sitepress->get_setting('posts_slug_translation', []); $imp['on'] = 1; $imp['types'] = isset($imp['types']) ? (array) $imp['types'] : [];
    foreach ($T as $tipo => $v) { $imp['types'][$tipo] = 1; }
    $sitepress->set_setting('posts_slug_translation', $imp, true);
    $out = [];
    foreach ($T as $tipo => $v) {
      list($it, $en) = $v;
      $sid = icl_register_string('WordPress', 'URL slug: ' . $tipo, $it, false, 'it');
      $wpdb->update($wpdb->prefix . 'icl_strings', ['language' => 'it'], ['id' => $sid]);
      icl_add_string_translation($sid, 'en-gb', $en, ICL_TM_COMPLETE);
      $out[$tipo] = $sid;
    }
    do_action('wpml_st_flush_slug_cache'); flush_rewrite_rules(false); wp_cache_flush();
    \Elementor\Plugin::$instance->files_manager->clear_cache();
    return $out;`);
  console.log('stringhe registrate:', JSON.stringify(r));
  console.log(JSON.stringify(await php(STATO), null, 1));
})().catch((e) => { console.error(e); process.exit(1); });
