'use strict';
// Porta su dev3 i DATI della rev2 (fase 3 dell'adeguamento): tassonomie, campi, immagini, articoli, relazioni, cestino.
//   node tools/rev2/dati-rev2.js                       (prima: estrae i dati dalla rev2)
//   node tools/rev2/import-dati.js <passo> [--prova]
// Passi (in quest'ordine; ognuno è idempotente e si può rilanciare):
//   tassonomie  settore (rinomina, slug, ordine) · crea "categoria" (26 termini) · categoria_brand (nomi, ordine)
//   campi       definisce in JetEngine i campi nuovi di realizzazione e brand + regole WPML
//   media       alt delle foto di galleria, copie per card (immagine in evidenza) e per la foto dei brand
//   articoli    crea/aggiorna le 20 realizzazioni e i 18 brand (campi, termini, lingua, immagini, ordine)
//   relazioni   riscrive le relazioni brand ↔ realizzazioni come nella rev2
//   cestino     manda nel cestino realizzazioni e brand che la rev2 non ha
//   pulizia     (fine fase 4) toglie i campi del vecchio modello: definizioni JetEngine, regole WPML, valori negli articoli che restano;
//               prima salva tutto in tools/out/rev2/fase4-campi-rimossi*.json
//   tutto       tutti i passi in ordine
//   annulla-pulizia   (non è in "tutto") rimette i campi tolti da "pulizia", leggendo i file salvati
// Verifica: node tools/rev2/verifica-dati.js. Il cestino è recuperabile; nulla viene eliminato in modo definitivo.
const fs = require('fs');
const path = require('path');
const { connetti } = require('./mcp-client');
const M = require('./modello-dati');

const root = path.resolve(__dirname, '..', '..');
const E = JSON.parse(fs.readFileSync(path.join(root, 'tools', 'out', 'rev2', 'dati-rev2.json'), 'utf8'));
const MEDIA = JSON.parse(fs.readFileSync(path.join(root, 'tools', 'out', 'rev2', 'media-rev2.json'), 'utf8'));
const passo = process.argv[2] || '';
const prova = process.argv.includes('--prova');

// esegue codice PHP su dev3 con $D = dati passati (JSON in base64: nessun problema di virgolette)
async function php(nv, codice, dati = {}) {
  const b64 = Buffer.from(JSON.stringify(dati), 'utf8').toString('base64');
  return nv.php(`$D = json_decode(base64_decode('${b64}'), true);\n${codice}`);
}
const log = (...a) => console.log(...a);

// ---- 1. tassonomie -----------------------------------------------------------------------------------------------------
const VECCHI_SLUG_SETTORE = { uffici: 'arredo-uffici-workspace', retail: 'arredo-negozi-retail', 'bar-ristoranti': 'arredo-bar-ristoranti', food: 'arredo-negozi-food', hospitality: 'arredo-hotel-hospitality' };
const VECCHI_SLUG_CATBRAND = { 'pareti-e-pod': 'pareti-pod' };

async function tassonomie(nv) {
  // 1a. settore: nome, slug (codici rev2), ordine
  const s = await php(nv, String.raw`
    $out = [];
    foreach ($D['settori'] as $s) {
      $t = get_term_by('slug', $s['codice'], 'settore'); if (!$t) { $t = get_term_by('slug', $s['vecchio'], 'settore'); }
      if (!$t) { $r = wp_insert_term($s['nome'], 'settore', ['slug' => $s['codice']]); if (is_wp_error($r)) { $out[$s['codice']] = 'ERRORE ' . $r->get_error_message(); continue; } $tid = (int) $r['term_id']; }
      else { $r = wp_update_term($t->term_id, 'settore', ['name' => $s['nome'], 'slug' => $s['codice']]); if (is_wp_error($r)) { $out[$s['codice']] = 'ERRORE ' . $r->get_error_message(); continue; } $tid = (int) $t->term_id; }
      update_term_meta($tid, 'ordine', (int) $s['ordine']);
      // legame in entrambi i sensi: il termine conosce la sua pagina e la pagina (design vecchio: l'elenco progetti legge "settore_collegato")
      // conosce il suo termine per slug. Se lo slug cambia e il campo no, l'elenco resta vuoto senza errori.
      $pg = get_page_by_path($s['pagina']); if ($pg) { update_term_meta($tid, 'pagina', (int) $pg->ID); update_post_meta($pg->ID, 'settore_collegato', $s['codice']); }
      $out[$s['codice']] = $tid;
    }
    return $out;`, { settori: E.settori.map((x) => ({ codice: x.codice, nome: x.nome, ordine: x.ordine, vecchio: VECCHI_SLUG_SETTORE[x.codice], pagina: M.PAGINE_SETTORE[x.codice] })) });
  log('settore:', JSON.stringify(s));

  // 1b. categoria_brand: nomi come i filtri della rev2, ordine
  const b = await php(nv, String.raw`
    $out = [];
    foreach ($D['cat'] as $c) {
      $t = get_term_by('slug', $c['slug'], 'categoria_brand'); if (!$t && $c['vecchio']) { $t = get_term_by('slug', $c['vecchio'], 'categoria_brand'); }
      if (!$t) { $r = wp_insert_term($c['nome'], 'categoria_brand', ['slug' => $c['slug']]); if (is_wp_error($r)) { $out[$c['slug']] = 'ERRORE ' . $r->get_error_message(); continue; } $tid = (int) $r['term_id']; }
      else { $r = wp_update_term($t->term_id, 'categoria_brand', ['name' => $c['nome'], 'slug' => $c['slug']]); if (is_wp_error($r)) { $out[$c['slug']] = 'ERRORE ' . $r->get_error_message(); continue; } $tid = (int) $t->term_id; }
      update_term_meta($tid, 'ordine', (int) $c['ordine']);
      $out[$c['slug']] = $tid;
    }
    return $out;`, { cat: E.categorieBrand.map((c) => ({ ...c, vecchio: VECCHI_SLUG_CATBRAND[c.slug] || null })) });
  log('categoria_brand:', JSON.stringify(b));

  // 1c. nuova tassonomia "categoria" (JetEngine) — l'esistenza si vede alla richiesta successiva
  const esiste = await nv.php("return taxonomy_exists('categoria');");
  if (!esiste) {
    const r = await php(nv, String.raw`
      $in = ['general_settings' => ['name' => 'Categorie', 'slug' => 'categoria', 'object_type' => ['realizzazione'], 'show_edit_link' => true],
        'labels' => ['singular_name' => 'Categoria', 'menu_name' => 'Categorie', 'all_items' => 'Tutte le categorie', 'edit_item' => 'Modifica categoria', 'add_new_item' => 'Aggiungi nuova categoria', 'search_items' => 'Cerca categorie', 'not_found' => 'Nessuna categoria trovata'],
        'advanced_settings' => ['public' => true, 'show_ui' => true, 'show_in_rest' => true, 'hierarchical' => false, 'rewrite_slug' => 'categoria-realizzazione']];
      $req = new WP_REST_Request('POST', '/jet-engine/v1/mcp-tools/run/tool-add-taxonomy');
      $req->set_header('content-type', 'application/json'); $req->set_header('X-WP-Nonce', wp_create_nonce('wp_rest'));
      $p = ['input' => $in]; $req->set_body(wp_json_encode($p)); $req->set_body_params($p);
      $res = rest_do_request($req);
      return ['status' => $res->get_status(), 'data' => $res->get_data()];`);
    log('tassonomia "categoria" creata:', JSON.stringify(r).slice(0, 300));
  } else log('tassonomia "categoria" già presente');
  // regola WPML della nuova tassonomia (traducibile, con ripiego sull'italiano) e termini
  const t = await php(nv, String.raw`
    if (!taxonomy_exists('categoria')) { return 'la tassonomia categoria non è ancora registrata: rilanciare il passo'; }
    global $sitepress;
    if ($sitepress) { $o = $sitepress->get_setting('taxonomies_sync_option', []); if (($o['categoria'] ?? null) != 2) { $o['categoria'] = 2; $sitepress->set_setting('taxonomies_sync_option', $o, true); } }
    $out = [];
    foreach ($D['categorie'] as $c) {
      $t = get_term_by('slug', $c['slug'], 'categoria');
      if (!$t) { $r = wp_insert_term($c['nome'], 'categoria', ['slug' => $c['slug'], 'description' => $c['tipologie']]); if (is_wp_error($r)) { $out[$c['slug']] = 'ERRORE ' . $r->get_error_message(); continue; } $tid = (int) $r['term_id']; $nuovo = true; }
      else { $r = wp_update_term($t->term_id, 'categoria', ['name' => $c['nome'], 'description' => $c['tipologie']]); $tid = (int) $t->term_id; $nuovo = false; }
      update_term_meta($tid, 'settore', $c['settore']); update_term_meta($tid, 'ordine_pagina', (int) $c['ordinePagina']); update_term_meta($tid, 'ordine_filtro', (int) $c['ordineFiltro']);
      $tt = (int) get_term($tid)->term_taxonomy_id;
      $d = apply_filters('wpml_element_language_details', null, ['element_id' => $tt, 'element_type' => 'categoria']);
      if (empty($d->language_code)) { do_action('wpml_set_element_language_details', ['element_id' => $tt, 'element_type' => 'tax_categoria', 'trid' => false, 'language_code' => 'it', 'source_language_code' => null]); }
      $out[$c['slug']] = $tid . ($nuovo ? ' (nuovo)' : '');
    }
    return $out;`, { categorie: E.settori.flatMap((s) => s.categorie.map((c) => ({ ...c, settore: s.codice }))) });
  log('categoria (termini):', typeof t === 'string' ? t : Object.keys(t).length + ' termini; ' + Object.values(t).filter((v) => /nuovo/.test(v)).length + ' nuovi');
}

// ---- 2. campi (JetEngine + WPML) ------------------------------------------------------------------------------------------
async function campi(nv) {
  const r = await php(nv, String.raw`
    $nonce = wp_create_nonce('wp_rest');
    $req = function ($m, $r, $body = null) use ($nonce) { $q = new WP_REST_Request($m, $r); $q->set_header('X-WP-Nonce', $nonce); if ($body) { $q->set_header('content-type', 'application/json'); $q->set_body(wp_json_encode($body)); $q->set_body_params($body); } return rest_do_request($q); };
    $base = function ($name, $title, $type) { return ['title' => $title, 'name' => $name, 'object_type' => 'field', 'width' => '100%', 'type' => $type, 'id' => mt_rand(10000, 99999), 'isNested' => false, 'is_nested' => false, 'options' => [], 'quick_editable' => true, 'is_required' => false, 'default' => '', 'description' => '', 'placeholder' => '', 'args' => [], 'conditions' => [], 'repeater-fields' => []]; };
    $out = [];
    foreach ($D['tipi'] as $jid => $def) {
      $data = $req('GET', '/jet-engine/v2/get-post-type/' . $jid)->get_data()['data'];
      $esist = []; foreach ($data['meta_fields'] as $f) { $esist[$f['name']] = $f; }
      $nuovi = [];
      foreach ($def['campi'] as $c) {
        if (isset($esist[$c['name']])) { $f = $esist[$c['name']]; if ($f['type'] !== $c['type']) { $f['type'] = $c['type']; } $f['title'] = $c['title']; $esist[$c['name']] = $f; }
        else { $esist[$c['name']] = $base($c['name'], $c['title'], $c['type']); $nuovi[] = $c['name']; }
      }
      // ordine: prima i campi della rev2, poi quelli del vecchio modello (si tolgono a fine fase 4)
      $ordine = array_merge(array_map(function ($c) { return $c['name']; }, $def['campi']), array_values(array_diff(array_keys($esist), array_map(function ($c) { return $c['name']; }, $def['campi']))));
      $data['meta_fields'] = array_values(array_map(function ($n) use ($esist) { return $esist[$n]; }, $ordine));
      $res = $req('POST', '/jet-engine/v2/edit-post-type/' . $jid, $data);
      $out[$def['nome']] = ['stato' => $res->get_status(), 'nuovi' => $nuovi];
    }
    global $sitepress;
    if ($sitepress) {
      $tm = $sitepress->get_setting('translation-management', []); $cf = $tm['custom_fields_translation'] ?? [];
      foreach ($D['wpml'] as $nome => $modo) { $cf[$nome] = $modo; }
      $tm['custom_fields_translation'] = $cf; $sitepress->set_setting('translation-management', $tm, true);
    }
    return $out;`, {
    tipi: { 1: { nome: 'realizzazione', campi: M.CAMPI_REALIZZAZIONE }, 2: { nome: 'brand', campi: M.CAMPI_BRAND } },
    wpml: Object.fromEntries([...M.CAMPI_REALIZZAZIONE, ...M.CAMPI_BRAND].map((c) => [c.name, c.wpml === 'translate' ? 2 : 1])),
  });
  log('campi:', JSON.stringify(r));
}

// ---- 3. media ------------------------------------------------------------------------------------------------------------
// Alt per contesto: la foto base (media-rev2.json) ha l'alt della galleria; card e foto dei brand hanno testi diversi per lo stesso
// file, quindi si creano copie fisiche (un allegato non può condividere il file con un altro: cancellandolo si perderebbe l'altro).
async function media(nv) {
  const richieste = []; // {chiave, base (id), alt, etichetta}
  for (const r of E.realizzazioni) {
    for (const g of r.galleria) richieste.push({ tipo: 'base', src: g.src, alt: g.alt });
    richieste.push({ tipo: 'copia', src: r.cardImg, alt: r.cardAlt, etichetta: 'card' });
  }
  for (const b of E.brand) if (b.foto) richieste.push({ tipo: 'copia', src: b.foto.src, alt: b.foto.alt, etichetta: 'brand-' + b.slug });
  const mancanti = richieste.filter((x) => !MEDIA[x.src]);
  if (mancanti.length) throw new Error('immagini non importate in media-rev2.json: ' + [...new Set(mancanti.map((x) => x.src))].join(', '));
  const lotti = [];
  for (let i = 0; i < richieste.length; i += 4) lotti.push(richieste.slice(i, i + 4));
  const mappaCopie = {}; let basi = 0;
  for (const lotto of lotti) {
    const r = await php(nv, String.raw`
      require_once ABSPATH . 'wp-admin/includes/image.php';
      $out = ['basi' => 0, 'copie' => []];
      foreach ($D['voci'] as $v) {
        $baseId = (int) $v['id'];
        if ($v['tipo'] === 'base') { update_post_meta($baseId, '_wp_attachment_image_alt', $v['alt']); $out['basi']++; continue; }
        $chiave = 'rev2:' . $v['src'] . '#' . $v['etichetta'];
        $es = get_posts(['post_type' => 'attachment', 'post_status' => 'inherit', 'numberposts' => 1, 'fields' => 'ids', 'meta_key' => '_artes_src', 'meta_value' => $chiave, 'suppress_filters' => true]);
        if ($es) { $nid = (int) $es[0]; update_post_meta($nid, '_wp_attachment_image_alt', $v['alt']); $out['copie'][$chiave] = $nid; continue; }
        $file = get_attached_file($baseId); if (!$file || !file_exists($file)) { $out['copie'][$chiave] = 'ERRORE: file base mancante (' . $baseId . ')'; continue; }
        $dir = dirname($file); $info = pathinfo($file);
        $nome = wp_unique_filename($dir, $info['filename'] . '-' . $v['etichetta'] . '.' . $info['extension']);
        if (!copy($file, $dir . '/' . $nome)) { $out['copie'][$chiave] = 'ERRORE: copia non riuscita'; continue; }
        $nid = wp_insert_attachment(['post_mime_type' => get_post_mime_type($baseId), 'post_title' => $v['alt'], 'post_content' => '', 'post_status' => 'inherit'], $dir . '/' . $nome);
        if (is_wp_error($nid) || !$nid) { $out['copie'][$chiave] = 'ERRORE: allegato non creato'; continue; }
        wp_update_attachment_metadata($nid, wp_generate_attachment_metadata($nid, $dir . '/' . $nome));
        update_post_meta($nid, '_wp_attachment_image_alt', $v['alt']); update_post_meta($nid, '_artes_src', $chiave);
        do_action('wpml_set_element_language_details', ['element_id' => $nid, 'element_type' => 'post_attachment', 'trid' => false, 'language_code' => 'it', 'source_language_code' => null]);
        $out['copie'][$chiave] = $nid . ' (nuova)';
      }
      return $out;`, { voci: lotto.map((x) => ({ ...x, id: MEDIA[x.src].id })) });
    basi += r.basi; Object.assign(mappaCopie, r.copie || {});
  }
  const errori = Object.entries(mappaCopie).filter(([, v]) => String(v).startsWith('ERRORE'));
  log(`media: alt aggiornato su ${basi} foto di galleria; copie per card/brand: ${Object.keys(mappaCopie).length} (nuove: ${Object.values(mappaCopie).filter((v) => /nuova/.test(String(v))).length}); errori: ${errori.length}`);
  errori.forEach(([k, v]) => log('  ' + k + ': ' + v));
  if (errori.length) throw new Error(`media: ${errori.length} copie non riuscite: rilanciare il passo prima di importare gli articoli`);
  fs.writeFileSync(path.join(root, 'tools', 'out', 'rev2', 'media-copie.json'), JSON.stringify(Object.fromEntries(Object.entries(mappaCopie).map(([k, v]) => [k, parseInt(v, 10)])), null, 1));
}

// ---- 4. articoli -----------------------------------------------------------------------------------------------------------
async function articoli(nv) {
  const copie = JSON.parse(fs.readFileSync(path.join(root, 'tools', 'out', 'rev2', 'media-copie.json'), 'utf8'));
  const vecchioSlug = Object.fromEntries(Object.entries(M.RINOMINE_REALIZZAZIONI).map(([v, n]) => [n, v]));
  // 4a. realizzazioni
  for (const r of E.realizzazioni) {
    const idCard = copie[`rev2:${r.cardImg}#card`];
    if (!Number.isInteger(idCard) || idCard <= 0) throw new Error(`articoli: nessuna copia-card per ${r.slug} (${r.cardImg}): eseguire prima il passo media`);
    const dati = {
      slug: r.slug, vecchio: vecchioSlug[r.slug] || null, titolo: r.titolo, ordine: r.ordine, settore: r.settore, categoria: r.categoria,
      meta: {
        kw: r.kw, introduzione: r.introduzione, localita: r.localita, tipologia: r.tipologia, progettista: r.progettista || '',
        brand_forniture: r.brandForniture ? r.brandForniture.html : '', descrizione_lead: r.descrizione[0].html,
        descrizione_testo: r.descrizione.slice(1).map((d) => d.html).join('\n\n'),
        home_ordine: r.home ? String(r.home.ordine) : '', home_larghezza: r.home ? r.home.larghezza : '',
        galleria: r.galleria.map((g) => MEDIA[g.src].id).join(','),
      },
      thumb: idCard,
    };
    const esito = await php(nv, String.raw`
      $x = $D;
      $p = get_posts(['post_type' => 'realizzazione', 'name' => $x['slug'], 'post_status' => ['publish', 'draft', 'pending', 'private'], 'numberposts' => 1, 'suppress_filters' => true]);
      if (!$p && $x['vecchio']) { $p = get_posts(['post_type' => 'realizzazione', 'name' => $x['vecchio'], 'post_status' => ['publish', 'draft', 'pending', 'private'], 'numberposts' => 1, 'suppress_filters' => true]); }
      $arr = ['post_type' => 'realizzazione', 'post_title' => $x['titolo'], 'post_name' => $x['slug'], 'post_status' => 'publish', 'menu_order' => (int) $x['ordine']];
      if ($p) { $arr['ID'] = $p[0]->ID; $id = wp_update_post($arr, true); $nuovo = false; } else { $id = wp_insert_post($arr, true); $nuovo = true; }
      if (is_wp_error($id)) { return 'ERRORE ' . $id->get_error_message(); }
      foreach ($x['meta'] as $k => $v) { if ($v === '' || $v === null) { delete_post_meta($id, $k); } else { update_post_meta($id, $k, $v); } }
      set_post_thumbnail($id, (int) $x['thumb']);
      wp_set_object_terms($id, [$x['settore']], 'settore'); wp_set_object_terms($id, [$x['categoria']], 'categoria');
      $d = apply_filters('wpml_post_language_details', null, $id);
      if (is_wp_error($d) || empty($d['language_code'])) { do_action('wpml_set_element_language_details', ['element_id' => $id, 'element_type' => 'post_realizzazione', 'trid' => false, 'language_code' => 'it', 'source_language_code' => null]); }
      return $id . ($nuovo ? ' (nuova)' : ' (aggiornata)') . ' slug=' . get_post_field('post_name', $id);`, dati);
    log(`realizzazione ${r.slug}: ${esito}`);
  }
  // 4b. brand
  for (const b of E.brand) {
    const dati = {
      slug: b.slug, titolo: b.titolo, ordine: b.ordine, cat: M.slugify(b.categoria),
      meta: {
        introduzione: b.introduzione, settori_artes: b.settoriArtes.html, fornitura_artes: b.fornituraArtes, assistenza: b.assistenza,
        come_lavoriamo: b.sezioni[0].paragrafi[0].html, dove_lo_usiamo: b.sezioni[1].paragrafi[0].html,
      },
      thumb: b.foto ? copie[`rev2:${b.foto.src}#brand-${b.slug}`] : 0,
    };
    const esito = await php(nv, String.raw`
      $x = $D;
      $p = get_posts(['post_type' => 'brand', 'name' => $x['slug'], 'post_status' => ['publish', 'draft', 'pending', 'private'], 'numberposts' => 1, 'suppress_filters' => true]);
      $arr = ['post_type' => 'brand', 'post_title' => $x['titolo'], 'post_name' => $x['slug'], 'post_status' => 'publish', 'menu_order' => (int) $x['ordine']];
      if ($p) { $arr['ID'] = $p[0]->ID; $id = wp_update_post($arr, true); $nuovo = false; } else { $id = wp_insert_post($arr, true); $nuovo = true; }
      if (is_wp_error($id)) { return 'ERRORE ' . $id->get_error_message(); }
      foreach ($x['meta'] as $k => $v) { update_post_meta($id, $k, $v); }
      if ($x['thumb']) { set_post_thumbnail($id, (int) $x['thumb']); } else { delete_post_thumbnail($id); }
      wp_set_object_terms($id, [$x['cat']], 'categoria_brand');
      $d = apply_filters('wpml_post_language_details', null, $id);
      if (is_wp_error($d) || empty($d['language_code'])) { do_action('wpml_set_element_language_details', ['element_id' => $id, 'element_type' => 'post_brand', 'trid' => false, 'language_code' => 'it', 'source_language_code' => null]); }
      return $id . ($nuovo ? ' (nuovo)' : ' (aggiornato)');`, dati);
    log(`brand ${b.slug}: ${esito}`);
  }
}

// ---- 5. relazioni ------------------------------------------------------------------------------------------------------------
async function relazioni(nv) {
  const r = await php(nv, String.raw`
    global $wpdb; $t = $wpdb->prefix . 'jet_rel_default';
    $id = function ($tipo, $slug) { $p = get_posts(['post_type' => $tipo, 'name' => $slug, 'post_status' => 'publish', 'numberposts' => 1, 'suppress_filters' => true, 'fields' => 'ids']); return $p ? (int) $p[0] : 0; };
    $coppie = []; $mancano = [];
    foreach ($D['rel'] as $c) { $a = $id('realizzazione', $c[0]); $b = $id('brand', $c[1]); if ($a && $b) { $coppie[] = [$a, $b]; } else { $mancano[] = implode('|', $c); } }
    if ($mancano) { return ['ERRORE' => 'articoli non trovati: ' . implode(', ', $mancano)]; }
    $wpdb->query("DELETE FROM {$t} WHERE rel_id = 3");
    foreach ($coppie as $c) { $wpdb->insert($t, ['created' => current_time('mysql'), 'rel_id' => 3, 'parent_rel' => 0, 'parent_object_id' => $c[0], 'child_object_id' => $c[1]]); }
    wp_cache_flush();
    return ['relazioni' => count($coppie)];`, { rel: E.relazioni });
  log('relazioni:', JSON.stringify(r));
}

// ---- 6. cestino --------------------------------------------------------------------------------------------------------------
async function cestino(nv) {
  if (E.realizzazioni.length < 15 || E.brand.length < 10) throw new Error('cestino: dati rev2 incompleti (' + E.realizzazioni.length + ' realizzazioni, ' + E.brand.length + ' brand): non si cestina nulla');
  const r = await php(nv, String.raw`
    $out = [];
    foreach (['realizzazione' => $D['realizzazioni'], 'brand' => $D['brand']] as $tipo => $ok) {
      $ids = get_posts(['post_type' => $tipo, 'post_status' => ['publish', 'draft', 'pending', 'private'], 'numberposts' => -1, 'suppress_filters' => true]);
      foreach ($ids as $p) { if (!in_array($p->post_name, $ok, true)) { wp_trash_post($p->ID); $out[] = $tipo . ' ' . $p->post_name . ' (' . $p->post_title . ') -> cestino'; } }
    }
    return $out ?: ['niente da cestinare'];`, { realizzazioni: E.realizzazioni.map((x) => x.slug), brand: E.brand.map((x) => x.slug) });
  r.forEach((x) => log('cestino:', x));
}

// ---- 7. pulizia: campi del vecchio modello (fine fase 4) -------------------------------------------------------------------
// Toglie ciò che la rev2 non usa (M.CAMPI_DA_TOGLIERE): definizioni JetEngine, regole WPML e valori negli articoli che restano.
// Gli articoli nel cestino non si toccano (se si recuperano, tornano com'erano). Prima di scrivere si salva in
// tools/out/rev2/fase4-campi-rimossi.json tutto ciò che sta per sparire (definizioni complete, valori, regole WPML): il file non si
// sovrascrive mai (un secondo prelievo va in -2, -3...) e il passo "annulla-pulizia" rimette le cose com'erano.
const FILE_RIMOSSI = path.join(root, 'tools', 'out', 'rev2', 'fase4-campi-rimossi.json');
const STATI_PHP = "['publish', 'draft', 'pending', 'private', 'future']";
const REST_PHP = String.raw`
  $nonce = wp_create_nonce('wp_rest');
  $req = function ($m, $r, $body = null) use ($nonce) { $q = new WP_REST_Request($m, $r); $q->set_header('X-WP-Nonce', $nonce); if ($body) { $q->set_header('content-type', 'application/json'); $q->set_body(wp_json_encode($body)); $q->set_body_params($body); } return rest_do_request($q); };`;

function datiPulizia() {
  const nomiNuovi = new Set([...M.CAMPI_REALIZZAZIONE, ...M.CAMPI_BRAND].map((c) => c.name));
  return {
    tipi: { 1: { nome: 'realizzazione', togli: M.CAMPI_DA_TOGLIERE.realizzazione }, 2: { nome: 'brand', togli: M.CAMPI_DA_TOGLIERE.brand } },
    // una regola WPML vale per nome di campo su tutti i tipi: si toglie solo se il modello nuovo non usa più quel nome ("galleria" resta)
    wpmlTogli: [...new Set(Object.values(M.CAMPI_DA_TOGLIERE).flat())].filter((n) => !nomiNuovi.has(n)),
  };
}
// gli array vuoti di PHP arrivano come [] invece di {}
const comeMappa = (x) => (Array.isArray(x) ? {} : x || {});

async function pulizia(nv) {
  const dati = datiPulizia();
  const prelievo = await php(nv, REST_PHP + String.raw`
    $out = ['definizioni' => [], 'valori' => [], 'wpml' => []];
    foreach ($D['tipi'] as $jid => $def) {
      $data = $req('GET', '/jet-engine/v2/get-post-type/' . $jid)->get_data()['data'];
      foreach ($data['meta_fields'] as $f) { if (in_array($f['name'], $def['togli'], true)) { $out['definizioni'][$def['nome']][] = $f; } }
      foreach (get_posts(['post_type' => $def['nome'], 'post_status' => ${STATI_PHP}, 'numberposts' => -1, 'suppress_filters' => true, 'fields' => 'ids']) as $id) {
        foreach ($def['togli'] as $n) { if (metadata_exists('post', $id, $n)) { $out['valori'][$id][$n] = get_post_meta($id, $n, false); } }
      }
    }
    global $sitepress;
    $cf = $sitepress ? ($sitepress->get_setting('translation-management', [])['custom_fields_translation'] ?? []) : [];
    foreach ($D['wpmlTogli'] as $n) { if (array_key_exists($n, $cf)) { $out['wpml'][$n] = $cf[$n]; } }
    return $out;`, dati);
  prelievo.definizioni = comeMappa(prelievo.definizioni); prelievo.valori = comeMappa(prelievo.valori); prelievo.wpml = comeMappa(prelievo.wpml);
  const nDef = Object.values(prelievo.definizioni).reduce((s, l) => s + l.length, 0);
  const nVal = Object.values(prelievo.valori).reduce((s, o) => s + Object.keys(o).length, 0);
  const nWpml = Object.keys(prelievo.wpml).length;
  if (!nDef && !nVal && !nWpml) { log('pulizia: niente da togliere (già fatta)'); return; }
  let file = FILE_RIMOSSI; for (let n = 2; fs.existsSync(file); n++) file = FILE_RIMOSSI.replace(/\.json$/, `-${n}.json`);
  fs.writeFileSync(file, JSON.stringify({ quando: new Date().toISOString(), ...prelievo }, null, 1));
  log(`pulizia: salvato ${path.relative(root, file)} (${nDef} definizioni, ${nVal} valori su ${Object.keys(prelievo.valori).length} articoli, ${nWpml} regole WPML)`);
  // il file è scritto: ora si può togliere
  const r = await php(nv, REST_PHP + String.raw`
    $out = ['definizioni' => [], 'valori' => 0, 'wpml' => []];
    foreach ($D['tipi'] as $jid => $def) {
      $data = $req('GET', '/jet-engine/v2/get-post-type/' . $jid)->get_data()['data'];
      $restano = array_values(array_filter($data['meta_fields'], function ($f) use ($def) { return !in_array($f['name'], $def['togli'], true); }));
      $tolti = count($data['meta_fields']) - count($restano);
      if ($tolti) { $data['meta_fields'] = $restano; $res = $req('POST', '/jet-engine/v2/edit-post-type/' . $jid, $data); $out['definizioni'][$def['nome']] = ['tolti' => $tolti, 'stato' => $res->get_status()]; }
      foreach (get_posts(['post_type' => $def['nome'], 'post_status' => ${STATI_PHP}, 'numberposts' => -1, 'suppress_filters' => true, 'fields' => 'ids']) as $id) {
        foreach ($def['togli'] as $n) { if (metadata_exists('post', $id, $n)) { delete_post_meta($id, $n); $out['valori']++; } }
      }
    }
    global $sitepress;
    if ($sitepress) {
      $tm = $sitepress->get_setting('translation-management', []); $cf = $tm['custom_fields_translation'] ?? [];
      foreach ($D['wpmlTogli'] as $n) { if (array_key_exists($n, $cf)) { unset($cf[$n]); $out['wpml'][] = $n; } }
      if ($out['wpml']) { $tm['custom_fields_translation'] = $cf; $sitepress->set_setting('translation-management', $tm, true); }
    }
    return $out;`, dati);
  log('pulizia:', JSON.stringify(r));
}

// Rimette ciò che "pulizia" ha tolto, leggendo i file fase4-campi-rimossi*.json (nell'ordine in cui sono stati scritti). Non è nel
// passo "tutto": serve solo a tornare indietro.
async function annullaPulizia(nv) {
  const dir = path.dirname(FILE_RIMOSSI); const base = path.basename(FILE_RIMOSSI, '.json');
  const files = fs.readdirSync(dir).filter((f) => new RegExp(`^${base}(-\\d+)?\\.json$`).test(f)).sort((a, b) => (parseInt((a.match(/-(\d+)\.json$/) || [0, 1])[1], 10)) - (parseInt((b.match(/-(\d+)\.json$/) || [0, 1])[1], 10)));
  if (!files.length) { log('annulla-pulizia: nessun file ' + base + '*.json: niente da rimettere'); return; }
  for (const f of files) {
    const salvato = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
    const r = await php(nv, REST_PHP + String.raw`
      $out = ['definizioni' => 0, 'valori' => 0, 'wpml' => 0];
      foreach ($D['tipi'] as $jid => $def) {
        $data = $req('GET', '/jet-engine/v2/get-post-type/' . $jid)->get_data()['data'];
        $nomi = array_map(function ($f) { return $f['name']; }, $data['meta_fields']); $aggiunti = 0;
        foreach (($D['definizioni'][$def['nome']] ?? []) as $f) { if (!in_array($f['name'], $nomi, true)) { $data['meta_fields'][] = $f; $aggiunti++; } }
        if ($aggiunti) { $req('POST', '/jet-engine/v2/edit-post-type/' . $jid, $data); $out['definizioni'] += $aggiunti; }
      }
      foreach ($D['valori'] as $id => $campi) { foreach ($campi as $n => $vals) { if (!metadata_exists('post', (int) $id, $n)) { foreach ($vals as $v) { add_post_meta((int) $id, $n, wp_slash($v)); } $out['valori']++; } } }
      global $sitepress;
      if ($sitepress && $D['wpml']) { $tm = $sitepress->get_setting('translation-management', []); $cf = $tm['custom_fields_translation'] ?? []; foreach ($D['wpml'] as $n => $m) { $cf[$n] = $m; $out['wpml']++; } $tm['custom_fields_translation'] = $cf; $sitepress->set_setting('translation-management', $tm, true); }
      return $out;`, { tipi: datiPulizia().tipi, definizioni: salvato.definizioni, valori: salvato.valori, wpml: salvato.wpml });
    log(`annulla-pulizia (${f}):`, JSON.stringify(r));
  }
}

async function svuotaCache(nv) {
  await nv.php("\\Elementor\\Plugin::$instance->files_manager->clear_cache(); wp_cache_flush(); return 'cache svuotate';");
}

(async () => {
  const passi = { tassonomie, campi, media, articoli, relazioni, cestino, pulizia };
  const speciali = { 'annulla-pulizia': annullaPulizia };
  if (!passo || (passo !== 'tutto' && !passi[passo] && !speciali[passo])) { console.error('uso: import-dati.js ' + [...Object.keys(passi), 'tutto', ...Object.keys(speciali)].join('|')); process.exit(2); }
  if (prova) { console.log('--prova: nessuna scrittura (questo script scrive solo se lanciato senza --prova)'); return; }
  const nv = await connetti('novamira');
  if (speciali[passo]) { log(`\n=== passo: ${passo} ===`); await speciali[passo](nv); }
  else for (const nome of passo === 'tutto' ? Object.keys(passi) : [passo]) { log(`\n=== passo: ${nome} ===`); await passi[nome](nv); }
  await svuotaCache(nv);
})().catch((e) => { console.error(e); process.exit(1); });
