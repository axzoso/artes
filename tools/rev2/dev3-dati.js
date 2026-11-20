'use strict';
// Legge da dev3 (Novamira, PHP) tutto ciò che serve a confrontare i dati con la rev2: termini delle tre tassonomie, articoli di
// realizzazione e brand (compresi quelli nel cestino) con campi, termini, lingua, immagine in evidenza e galleria, relazioni
// brand ↔ realizzazioni, campi definiti in JetEngine e impostazioni WPML dei campi.
//   const { leggiDev3 } = require('./dev3-dati'); const A = await leggiDev3(nv);
const PHP = String.raw`
global $wpdb;
$dec = function ($s) { return html_entity_decode((string) $s, ENT_QUOTES, 'UTF-8'); };
$out = ['tax' => [], 'post' => [], 'att' => [], 'rel' => [], 'campi' => [], 'wpml_campi' => [], 'altro' => []];
foreach (['settore', 'categoria', 'categoria_brand'] as $tx) {
  if (!taxonomy_exists($tx)) { $out['tax'][$tx] = null; continue; }
  $lista = [];
  foreach (get_terms(['taxonomy' => $tx, 'hide_empty' => false, 'orderby' => 'term_id', 'order' => 'ASC']) as $t) {
    $mm = []; foreach (get_term_meta($t->term_id) as $k => $v) { if ($k[0] !== '_') { $mm[$k] = $v[0]; } }
    $lista[] = ['id' => (int) $t->term_id, 'nome' => $dec($t->name), 'slug' => $t->slug, 'descrizione' => $dec($t->description), 'conteggio' => (int) $t->count, 'meta' => $mm];
  }
  $out['tax'][$tx] = $lista;
}
$ids = $wpdb->get_col("SELECT ID FROM {$wpdb->posts} WHERE post_type IN ('realizzazione', 'brand') AND post_status NOT IN ('auto-draft', 'inherit') ORDER BY ID");
$attIds = [];
foreach ($ids as $id) {
  $p = get_post($id); $meta = [];
  foreach (get_post_meta($id) as $k => $v) { if ($k[0] === '_' && $k !== '_thumbnail_id') { continue; } $meta[$k] = $v[0]; }
  $terms = []; foreach (get_object_taxonomies($p->post_type) as $tx) { $terms[$tx] = array_values(wp_get_object_terms($id, $tx, ['fields' => 'slugs'])); }
  $lang = apply_filters('wpml_post_language_details', null, $id);
  $out['post'][] = ['id' => (int) $id, 'tipo' => $p->post_type, 'stato' => $p->post_status, 'slug' => $p->post_name, 'titolo' => $dec($p->post_title), 'ordine' => (int) $p->menu_order, 'lingua' => is_array($lang) ? ($lang['language_code'] ?? null) : null, 'meta' => $meta, 'termini' => $terms];
  if (!empty($meta['_thumbnail_id'])) { $attIds[(int) $meta['_thumbnail_id']] = 1; }
  if (!empty($meta['galleria'])) { foreach (explode(',', $meta['galleria']) as $g) { if ((int) $g) { $attIds[(int) $g] = 1; } } }
}
foreach (array_keys($attIds) as $a) {
  $out['att'][$a] = ['alt' => $dec(get_post_meta($a, '_wp_attachment_image_alt', true)), 'src' => get_post_meta($a, '_artes_src', true), 'file' => get_post_meta($a, '_wp_attached_file', true), 'stato' => get_post_status($a)];
}
foreach ($wpdb->get_results("SELECT parent_object_id AS p, child_object_id AS c FROM {$wpdb->prefix}jet_rel_default WHERE rel_id = 3") as $r) { $out['rel'][] = [(int) $r->p, (int) $r->c]; }
$nonce = wp_create_nonce('wp_rest');
foreach ([1 => 'realizzazione', 2 => 'brand'] as $jid => $nome) {
  $rq = new WP_REST_Request('GET', '/jet-engine/v2/get-post-type/' . $jid); $rq->set_header('X-WP-Nonce', $nonce);
  $d = rest_do_request($rq)->get_data()['data'];
  $out['campi'][$nome] = array_map(function ($f) { return ['name' => $f['name'], 'type' => $f['type'], 'title' => $f['title']]; }, $d['meta_fields']);
}
global $sitepress;
$tm = $sitepress ? $sitepress->get_setting('translation-management', []) : [];
$out['wpml_campi'] = $tm['custom_fields_translation'] ?? [];
$out['pagine'] = []; $out['settore_collegato'] = [];
foreach (['arredamento-ufficio', 'arredo-negozi', 'arredamento-bar-ristoranti', 'arredo-negozi-food', 'arredamento-hotel'] as $slug) { $pg = get_page_by_path($slug); $out['pagine'][$slug] = $pg ? (int) $pg->ID : 0; $out['settore_collegato'][$slug] = $pg ? (string) get_post_meta($pg->ID, 'settore_collegato', true) : ''; }
$out['altro']['hello_world'] = array_map(function ($p) { return ['id' => $p->ID, 'stato' => $p->post_status, 'titolo' => $p->post_title]; }, get_posts(['post_type' => 'post', 'post_status' => ['publish', 'draft', 'pending', 'private', 'trash'], 'numberposts' => -1, 'suppress_filters' => true]));
return $out;
`;

async function leggiDev3(nv) {
  const r = await nv.php(PHP);
  // gli array vuoti di PHP arrivano come [] invece di {}: si normalizzano gli oggetti usati come mappe
  for (const k of ['att', 'wpml_campi']) if (Array.isArray(r[k])) r[k] = {};
  return r;
}

module.exports = { leggiDev3 };
