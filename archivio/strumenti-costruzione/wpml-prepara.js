'use strict';
// Preparazione WPML + ricostruzione IT compatibile WPML su dev3 (Step 1 multilingua).
// Idempotente, con backup integrale in tools/out/rev2/wpml-prepara-backup.json e rollback completo.
//
//   node tools/rev2/wpml-prepara.js --piano [--salva-comp]   piano offline (0 scritture su dev3)
//   node tools/rev2/wpml-prepara.js --stato                  stato live in sola lettura su dev3
//   node tools/rev2/wpml-prepara.js --esegui [--solo passo1|passo2]
//   node tools/rev2/wpml-prepara.js --rollback [percorso-backup.json]
//
// PASSO 1 (WPML DB/config):
//   1. Disattiva WPML(setup/translate-everything) -> false (evita traduzioni automatiche ATE).
//   2. Registra come lingua 'it' in wpgm_icl_translations (post_elementor_library) i 6 site part rev2
//      (557, 971, 1040, 1049, 1050, 1051) + i 3 [Riserva] (539, 540, 541) se ancora privi di trid.
//   3. Imposta in icl_sitepress_settings: custom_term_fields_translation (ordine, pagina, ordine_filtro,
//      ordine_pagina, settore = 1 copy) e custom_fields_translation._artes_rev2 = 1.
//   4. Ripopola WPML(api-pb-config/elementor) dall'XML remoto Elementor in wpml_config_files_arr (23 widget V4).
//   5. Verifica e installa (via WP-CLI `language core install en_GB`, fallback wp_download_language_pack) il pack en_GB.
//
// PASSO 2 (Ricostruzione IT compatibile WPML):
//   - Ricostruisce e ripubblica in IT preservando le condizioni Theme Builder:
//       557  Header ARTES (rev2)          ([artes_lingue] desktop + mobile, /contatti/ intatti)
//       1040 Singolo Realizzazione (rev2) ([artes_correlate_titolo], [artes_url_archivio_settore], 0 before IT)
//       1049 Singolo Brand (rev2)         ([artes_eyebrow_brand], [artes_come_titolo], [artes_correlate_brand_titolo], 0 before IT)
//       1051 Archivio Brand (rev2)        (.rev2-dato [artes_dato_categoria_brand] nella card .brand)
//   - Svuota cache Elementor + WordPress + WPML.

const fs = require('fs');
const path = require('path');
const { DOCUMENTI, costruisciDocumento, phpConDati } = require('./aggiorna-link-contatti');

const root = path.resolve(__dirname, '..', '..');
const outDir = path.join(root, 'tools', 'out', 'rev2');
const compDir = path.join(outDir, 'comp');
const BACKUP_FILE_DEFAULT = path.join(outDir, 'wpml-prepara-backup.json');

// Tutti gli ID elementor_library IT da registrare in icl_translations (6 site part rev2 + 3 [Riserva])
const SITE_PARTS_ATTIVI = [557, 971, 1040, 1049, 1050, 1051];
const RISERVA_IDS = [539, 540, 541];
const ELEMENTOR_LIBRARY_ICL_IDS = [...SITE_PARTS_ATTIVI, ...RISERVA_IDS];

// Condizioni Theme Builder attese (mai modificate/rimosse durante Passo 2)
const CONDIZIONI_ATTESE = {
  557: ['include/general'],
  971: ['include/general'],
  1040: ['include/singular/realizzazione'],
  1049: ['include/singular/brand'],
  1050: ['include/archive/realizzazione_archive'],
  1051: ['include/archive/brand_archive'],
};

// Mappa location nell'opzione cache elementor_pro_theme_builder_conditions
const TB_LOCATION_ATTESE = {
  557: 'header',
  971: 'footer',
  1040: 'single',
  1049: 'single',
  1050: 'archive',
  1051: 'archive',
};

// Shortcode obbligatori sui template 1040 e 1049 (usati sia in verifica offline sia in verifica live Passo 2)
const SHORTCODES_RICHIESTI_TEMPLATE = {
  1040: ['[artes_correlate_titolo]', '[artes_url_archivio_settore]', '[artes_breadcrumb]', '[artes_scopri_testo]'],
  1049: ['[artes_eyebrow_brand]', '[artes_come_titolo]', '[artes_correlate_brand_titolo]', '[artes_cta_brand]', '[artes_breadcrumb]'],
};

// Term meta da copiare (modo 1 = copy) in icl_sitepress_settings.translation-management.custom_term_fields_translation
const TERM_META_COPY = ['ordine', 'pagina', 'ordine_filtro', 'ordine_pagina', 'settore'];

// Widget Atomic V4 obbligatori dopo il popolamento di WPML(api-pb-config/elementor)
const V4_WIDGETS_OBBLIGATORI = [
  'e-heading', 'e-paragraph', 'e-button', 'e-div-block', 'e-flexbox',
  'e-image', 'e-form', 'e-form-label', 'e-form-input', 'e-form-textarea',
  'e-form-select', 'e-form-submit-button',
];

// I 4 documenti IT da ricostruire nel Passo 2
const TARGET_DOC_IDS = [557, 1040, 1049, 1051];
const TARGET_DOCS = TARGET_DOC_IDS.map((id) => {
  const found = DOCUMENTI.find((d) => d.id === id);
  if (!found) throw new Error(`Documento ${id} non trovato in aggiorna-link-contatti.DOCUMENTI`);
  return found;
});

function ispezionaComposizioneOffline(built) {
  const { doc, risultato } = built;
  const comp = risultato.composizione;
  const cfgs = comp.element_config || {};
  const clsMap = comp.classes || {};

  const shortcodes = [];
  const beforeHardcoded = [];
  const staticItEn = [];
  let rev2DatoBrand = 0;

  const visitaValore = (val, elId, chiave) => {
    if (!val || typeof val !== 'object') return;
    if (typeof val.name === 'string' && val.settings && typeof val.settings === 'object') {
      if (val.name === 'shortcode' && typeof val.settings.shortcode === 'string') {
        shortcodes.push({ elId, chiave, shortcode: val.settings.shortcode, classi: clsMap[elId] || [] });
      }
      if (typeof val.settings.before === 'string' && val.settings.before.trim() !== '') {
        beforeHardcoded.push({ elId, chiave, name: val.name, before: val.settings.before });
      }
      if (typeof val.settings.after === 'string' && val.settings.after.trim() !== '') {
        beforeHardcoded.push({ elId, chiave, name: val.name, after: val.settings.after });
      }
      return;
    }
    for (const [k, v] of Object.entries(val)) {
      if (v && typeof v === 'object') visitaValore(v, elId, `${chiave}.${k}`);
    }
  };

  for (const [elId, cfg] of Object.entries(cfgs)) {
    visitaValore(cfg, elId, '');
    if (typeof cfg.paragraph === 'string' && /IT\s*\/\s*EN/.test(cfg.paragraph)) {
      staticItEn.push({ elId, val: cfg.paragraph });
    }
    const cl = clsMap[elId] || [];
    if (
      cl.includes('rev2-dato') &&
      cfg.paragraph &&
      cfg.paragraph.name === 'shortcode' &&
      cfg.paragraph.settings &&
      cfg.paragraph.settings.shortcode === '[artes_dato_categoria_brand]'
    ) {
      rev2DatoBrand++;
    }
  }

  const errori = [];
  if (built.avvisiCritici.length > 0) {
    errori.push(`Avvisi critici conversione: ${built.avvisiCritici.join('; ')}`);
  }
  if (built.residuiHashContatti.length > 0) {
    errori.push(`Link residui #contatti: ${built.residuiHashContatti.length}`);
  }
  if (beforeHardcoded.length > 0) {
    errori.push(`Dynamic tag con before/after hardcoded: ${JSON.stringify(beforeHardcoded)}`);
  }

  const scSet = new Set(shortcodes.map((s) => s.shortcode));
  if (doc.id === 557) {
    const desk = shortcodes.filter((s) => s.shortcode === '[artes_lingue]' && s.classi.includes('topbar__lang') && !s.classi.includes('mobile-nav__sec'));
    const mob = shortcodes.filter((s) => s.shortcode === '[artes_lingue]' && s.classi.includes('topbar__lang') && s.classi.includes('mobile-nav__sec'));
    if (desk.length !== 1) errori.push(`Header 557: atteso 1 [artes_lingue] desktop (.topbar__lang), trovati ${desk.length}`);
    if (mob.length !== 1) errori.push(`Header 557: atteso 1 [artes_lingue] mobile (.mobile-nav__sec.topbar__lang), trovati ${mob.length}`);
    if (staticItEn.length > 0) errori.push(`Header 557: testo statico IT / EN residuo (${staticItEn.length})`);
    if (built.destContatti.length !== 2) errori.push(`Header 557: attesi 2 link /contatti/, trovati ${built.destContatti.length}`);
  } else if (doc.id === 1040 || doc.id === 1049) {
    for (const req of SHORTCODES_RICHIESTI_TEMPLATE[doc.id]) {
      if (!scSet.has(req)) errori.push(`Template ${doc.id}: shortcode atteso mancante: ${req}`);
    }
  } else if (doc.id === 1051) {
    if (rev2DatoBrand !== 1) errori.push(`Template 1051: atteso 1 widget .rev2-dato [artes_dato_categoria_brand], trovati ${rev2DatoBrand}`);
  }

  return {
    id: doc.id,
    nome: doc.nome,
    elementi: risultato.elementi,
    linkContatti: built.destContatti.length,
    residuiHashContatti: built.residuiHashContatti.length,
    shortcodes: shortcodes.map((s) => s.shortcode),
    beforeHardcoded,
    rev2DatoBrand,
    avvisiCritici: built.avvisiCritici,
    errori,
  };
}

function costruisciEValidaOffline(salvaComp = false) {
  const builtList = TARGET_DOCS.map((doc) => costruisciDocumento(doc));
  const verifiche = builtList.map(ispezionaComposizioneOffline);

  if (salvaComp) {
    fs.mkdirSync(compDir, { recursive: true });
    for (const b of builtList) {
      fs.writeFileSync(path.join(compDir, b.doc.compFile), JSON.stringify(b.risultato.composizione, null, 1));
    }
  }

  return { builtList, verifiche };
}

function stampaPiano(verifiche, salvaComp) {
  console.log('=== PIANO PREPARAZIONE WPML + RICOSTRUZIONE IT (OFFLINE, 0 SCRITTURE SU DEV3) ===\n');

  console.log('PASSO 1 — Configurazione WPML & DB su dev3:');
  console.log('  1.1 Disattiva WPML(setup/translate-everything) -> false (via WPML\\Setup\\Option::setTranslateEverything(false))');
  console.log(`  1.2 Registra in wpgm_icl_translations (language='it', element_type='post_elementor_library') i post senza trid:`);
  console.log(`      - Site part rev2 attivi: ${SITE_PARTS_ATTIVI.join(', ')}`);
  console.log(`      - Modelli [Riserva]:     ${RISERVA_IDS.join(', ')}`);
  console.log(`  1.3 Aggiorna icl_sitepress_settings.translation-management:`);
  console.log(`      - custom_term_fields_translation: ${TERM_META_COPY.map((k) => `${k}=1`).join(', ')}`);
  console.log(`      - custom_fields_translation._artes_rev2 = 1 (copy)`);
  console.log(`  1.4 Popola WPML(api-pb-config/elementor) dall'XML remoto cached in wpml_config_files_arr (23 widget Atomic V4)`);
  console.log('  1.5 Verifica / installa language pack WordPress en_GB (`wp language core install en_GB`)');

  console.log('\nPASSO 2 — Ricostruzione & ripubblicazione IT compatibile WPML (preservando condizioni Theme Builder):');
  let totErrori = 0;
  for (const v of verifiche) {
    totErrori += v.errori.length;
    const cond = CONDIZIONI_ATTESE[v.id] || [];
    const scUnici = [...new Set(v.shortcodes)];
    console.log(
      `  [${String(v.id).padStart(4)}] ${v.nome.padEnd(16)} | ${String(v.elementi).padStart(3)} el | ` +
      `/contatti/=${v.linkContatti} | #contatti=${v.residuiHashContatti} | before-IT=${v.beforeHardcoded.length} | ` +
      `cond=${JSON.stringify(cond)} | errori=${v.errori.length}`
    );
    console.log(`         shortcodes (${v.shortcodes.length}): ${scUnici.join(', ')}`);
    if (v.id === 1051) console.log(`         .rev2-dato [artes_dato_categoria_brand]: ${v.rev2DatoBrand}`);
    for (const err of v.errori) console.log(`         ! ERRORE: ${err}`);
  }

  console.log('\nBACKUP & ROLLBACK:');
  console.log(`  - Backup integrale salvato prima di ogni scrittura in: ${path.relative(root, BACKUP_FILE_DEFAULT)}`);
  console.log('  - Rollback completo disponibile via: node tools/rev2/wpml-prepara.js --rollback');
  if (salvaComp) {
    console.log(`  - Composizioni salvate in: ${path.relative(root, compDir)}`);
  }

  console.log(`\n=== ESITO VERIFICA OFFLINE: ${totErrori === 0 ? 'OK (0 errori)' : `FALLITA (${totErrori} errori)`} ===`);
  return totErrori;
}

async function runWpCli(nv, cliArgs) {
  const raw = await nv.call('mcp-adapter-execute-ability', {
    ability_name: 'novamira/run-wp-cli',
    parameters: { args: cliArgs },
  });
  const j = JSON.parse(raw);
  return j.data || j;
}

async function svuotaTutteCache(el, nv) {
  await el.call('elementor-clear-cache', {});
  await nv.php(`
    if (class_exists('\\Elementor\\Plugin')) {
      \\Elementor\\Plugin::$instance->files_manager->clear_cache();
    }
    if (function_exists('icl_cache_clear')) {
      icl_cache_clear(true);
    }
    do_action('wpml_cache_clear');
    do_action('wpml_st_cache_clear');
    do_action('wpml_elementor_auto_config_clear_cache');
    wp_cache_flush();
    return true;
  `);
}

async function leggiStatoLive(nv) {
  return phpConDati(nv, String.raw`
    global $wpdb, $sitepress;

    // 1. Translate everything
    $te_class = class_exists('\WPML\Setup\Option') ? \WPML\Setup\Option::getTranslateEverything() : null;
    $te_opt = get_option('WPML(setup/translate-everything)', '__MISSING__');
    $setup_opt = get_option('WPML(setup)', '__MISSING__');

    // 2. icl_translations per i 9 elementor_library
    $ids_sql = implode(',', array_map('intval', $D['icl_ids']));
    $icl_rows = $wpdb->get_results("
      SELECT p.ID, p.post_title, p.post_status, t.translation_id, t.trid, t.language_code, t.source_language_code
      FROM {$wpdb->posts} p
      LEFT JOIN {$wpdb->prefix}icl_translations t
        ON t.element_id = p.ID AND t.element_type = 'post_elementor_library'
      WHERE p.ID IN ({$ids_sql})
      ORDER BY p.ID
    ", ARRAY_A);

    // 3. icl_sitepress_settings (term meta + _artes_rev2)
    $tm = $sitepress->get_setting('translation-management', []);
    $ctft = $tm['custom_term_fields_translation'] ?? [];
    $cft = $tm['custom_fields_translation'] ?? [];
    $term_meta_stato = [];
    foreach ($D['term_meta'] as $k) {
      $term_meta_stato[$k] = array_key_exists($k, $ctft) ? $ctft[$k] : null;
    }

    // 4. WPML(api-pb-config/elementor)
    $om = new \WPML\WP\OptionManager();
    $pb_el = $om->get('api-pb-config', 'elementor', []);
    $pb_el_arr = is_array($pb_el) ? $pb_el : [];
    $v4_keys = array_values(array_filter(array_keys($pb_el_arr), fn($k) => strpos((string)$k, 'e-') === 0));
    $v4_mancanti = array_values(array_diff($D['v4_obbligatori'], $v4_keys));

    // 5. en_GB language pack
    $en_gb_mo = file_exists(WP_LANG_DIR . '/en_GB.mo');
    $en_gb_l10n = file_exists(WP_LANG_DIR . '/en_GB.l10n.php');

    // 6. Condizioni Theme Builder su tutti i 6 site part attivi + opzione cache
    $cond_site_parts = [];
    foreach ($D['site_parts'] as $sp_id) {
      $c = get_post_meta((int)$sp_id, '_elementor_conditions', true);
      $cond_site_parts[(string)$sp_id] = is_array($c) ? $c : [];
    }
    $tb_cache = get_option('elementor_pro_theme_builder_conditions', []);

    // 7. Verifica _elementor_data sui 4 documenti target (557, 1040, 1049, 1051)
    $walk = function($els, &$out) use (&$walk) {
      if (!is_array($els)) return;
      foreach ($els as $el) {
        if (!is_array($el)) continue;
        $out[] = $el;
        if (!empty($el['elements']) && is_array($el['elements'])) $walk($el['elements'], $out);
      }
    };

    $docs_live = [];
    foreach ($D['target_ids'] as $pid) {
      $pid = (int)$pid;
      $raw = (string)get_post_meta($pid, '_elementor_data', true);
      $tree = json_decode($raw, true);
      $nodes = [];
      $walk($tree, $nodes);

      $shortcodes = [];
      $before_non_vuoti = [];
      $static_it_en = 0;
      $hash_contatti = 0;
      $contatti_links = 0;
      $lingue_count = 0;
      $dato_cat_brand = 0;

      foreach ($nodes as $n) {
        $s = $n['settings'] ?? [];
        if (!is_array($s)) continue;
        $json_s = wp_json_encode($s, JSON_UNESCAPED_SLASHES);
        if (strpos($json_s, '#contatti') !== false) $hash_contatti++;
        $ld = $s['link']['value']['destination'] ?? null;
        if (is_array($ld) && ($ld['$$type'] ?? '') === 'url' && trim((string)($ld['value'] ?? '')) === '/contatti/') {
          $contatti_links++;
        }

        // Ispeziona dynamic props (paragraph, title, text, link.value.destination)
        $props = [
          'paragraph' => $s['paragraph'] ?? null,
          'title' => $s['title'] ?? null,
          'text' => $s['text'] ?? null,
          'link_dest' => $s['link']['value']['destination'] ?? null,
        ];
        foreach ($props as $pname => $pval) {
          if (!is_array($pval)) continue;
          $t = $pval['$$type'] ?? '';
          if ($t === 'escaped-html' || $t === 'string') {
            $str = (string)($pval['value'] ?? '');
            if (preg_match('/IT\s*\/\s*EN/', $str)) $static_it_en++;
          } elseif ($t === 'dynamic' && is_array($pval['value'] ?? null)) {
            $dname = (string)($pval['value']['name'] ?? '');
            $dset = $pval['value']['settings'] ?? [];
            if ($dname === 'shortcode') {
              $sc = (string)($dset['shortcode']['value'] ?? '');
              if ($sc !== '') {
                $shortcodes[] = $sc;
                if ($sc === '[artes_lingue]') $lingue_count++;
                if ($sc === '[artes_dato_categoria_brand]') $dato_cat_brand++;
              }
            }
            $bef = (string)($dset['before']['value'] ?? '');
            $aft = (string)($dset['after']['value'] ?? '');
            if (trim($bef) !== '' || trim($aft) !== '') {
              $before_non_vuoti[] = ['id' => $n['id'] ?? '', 'prop' => $pname, 'name' => $dname, 'before' => $bef, 'after' => $aft];
            }
          }
        }
      }

      $docs_live[(string)$pid] = [
        'id' => $pid,
        'status' => get_post_status($pid),
        'json_ok' => is_array($tree),
        'nodes' => count($nodes),
        'shortcodes' => array_values(array_unique($shortcodes)),
        'lingue_count' => $lingue_count,
        'dato_cat_brand' => $dato_cat_brand,
        'static_it_en' => $static_it_en,
        'before_non_vuoti' => $before_non_vuoti,
        'contatti_links' => $contatti_links,
        'hash_contatti' => $hash_contatti,
        'conditions' => $cond_site_parts[(string)$pid] ?? [],
      ];
    }

    return [
      'translate_everything' => [
        'api' => $te_class,
        'option' => $te_opt,
        'setup_flag' => is_array($setup_opt) ? ($setup_opt['translate-everything'] ?? null) : null,
      ],
      'icl_elementor_library' => $icl_rows,
      'term_meta_translation' => $term_meta_stato,
      'artes_rev2_cf' => array_key_exists('_artes_rev2', $cft) ? $cft['_artes_rev2'] : null,
      'api_pb_elementor' => [
        'total_widgets' => count($pb_el_arr),
        'v4_widgets_count' => count($v4_keys),
        'v4_mancanti' => $v4_mancanti,
      ],
      'en_gb_pack' => [
        'installed' => ($en_gb_mo || $en_gb_l10n),
        'en_GB_mo' => $en_gb_mo,
        'en_GB_l10n_php' => $en_gb_l10n,
      ],
      'condizioni_site_parts' => $cond_site_parts,
      'tb_cache' => $tb_cache,
      'docs_live' => $docs_live,
    ];
  `, {
    icl_ids: ELEMENTOR_LIBRARY_ICL_IDS,
    term_meta: TERM_META_COPY,
    v4_obbligatori: V4_WIDGETS_OBBLIGATORI,
    site_parts: SITE_PARTS_ATTIVI,
    target_ids: TARGET_DOC_IDS,
  });
}

function stampaStatoLive(stato) {
  console.log('\n=== STATO LIVE WPML & TEMPLATE SU DEV3 ===');
  console.log(`Translate Everything: api=${JSON.stringify(stato.translate_everything.api)}, setup_flag=${JSON.stringify(stato.translate_everything.setup_flag)}`);

  const mancantiIcl = stato.icl_elementor_library.filter((r) => !r.trid);
  console.log(`icl_translations (elementor_library): ${stato.icl_elementor_library.length - mancantiIcl.length}/${stato.icl_elementor_library.length} registrati` +
    (mancantiIcl.length ? ` (mancanti: ${mancantiIcl.map((r) => r.ID).join(', ')})` : ' (tutti OK)'));

  console.log(`custom_term_fields_translation: ${JSON.stringify(stato.term_meta_translation)}`);
  console.log(`custom_fields_translation._artes_rev2: ${JSON.stringify(stato.artes_rev2_cf)}`);
  console.log(`WPML(api-pb-config/elementor): total=${stato.api_pb_elementor.total_widgets}, V4=${stato.api_pb_elementor.v4_widgets_count}, mancanti=${JSON.stringify(stato.api_pb_elementor.v4_mancanti)}`);
  console.log(`Language pack en_GB: installed=${stato.en_gb_pack.installed} (.mo=${stato.en_gb_pack.en_GB_mo}, .l10n.php=${stato.en_gb_pack.en_GB_l10n_php})`);

  console.log('\nCondizioni Theme Builder (6 site part attivi):');
  for (const id of SITE_PARTS_ATTIVI) {
    const c = stato.condizioni_site_parts[String(id)] || [];
    const att = CONDIZIONI_ATTESE[id];
    const ok = JSON.stringify(c) === JSON.stringify(att);
    const loc = TB_LOCATION_ATTESE[id];
    const cached = (stato.tb_cache && stato.tb_cache[loc] && stato.tb_cache[loc][String(id)]) || null;
    const okCache = JSON.stringify(cached) === JSON.stringify(att);
    console.log(
      `  ${String(id).padStart(4)} (${loc.padEnd(7)}): meta=${JSON.stringify(c)} ${ok ? 'OK' : `ATTESO ${JSON.stringify(att)}`} | ` +
      `tb_cache=${okCache ? 'OK' : JSON.stringify(cached)}`
    );
  }

  console.log('\nDocumenti target IT (557, 1040, 1049, 1051):');
  for (const id of TARGET_DOC_IDS) {
    const d = stato.docs_live[String(id)];
    console.log(
      `  ${String(id).padStart(4)} | ${d.status.padEnd(7)} | nodes=${String(d.nodes).padStart(3)} | ` +
      `/contatti/=${d.contatti_links} | #contatti=${d.hash_contatti} | before-IT=${d.before_non_vuoti.length} | ` +
      (id === 557 ? `[artes_lingue]=${d.lingue_count} | static_IT_EN=${d.static_it_en}` : '') +
      (id === 1051 ? `[artes_dato_categoria_brand]=${d.dato_cat_brand}` : '') +
      (id === 1040 || id === 1049 ? `sc=${d.shortcodes.join(',')}` : '')
    );
  }
}

async function eseguiSuDev3(builtList, solo) {
  const { connetti } = require('./mcp-client');
  const nv = await connetti('novamira');
  const el = await connetti('elementor');

  const faiPasso1 = !solo || solo === 'passo1';
  const faiPasso2 = !solo || solo === 'passo2';

  fs.mkdirSync(outDir, { recursive: true });
  const backup = fs.existsSync(BACKUP_FILE_DEFAULT)
    ? JSON.parse(fs.readFileSync(BACKUP_FILE_DEFAULT, 'utf8'))
    : { creato_il: new Date().toISOString(), passo1: null, passo2: { documenti: {} } };

  backup.ultimo_aggiornamento = new Date().toISOString();

  // ---- Snapshot pre-modifica Passo 1 (salvato solo la prima volta per garantire rollback al vero stato iniziale) ----
  if (faiPasso1 && !backup.passo1) {
    const snap1 = await phpConDati(nv, String.raw`
      global $wpdb, $sitepress;
      $tm = $sitepress->get_setting('translation-management', []);
      $ctft = $tm['custom_term_fields_translation'] ?? [];
      $cft = $tm['custom_fields_translation'] ?? [];
      $om = new \WPML\WP\OptionManager();
      $ids_sql = implode(',', array_map('intval', $D['icl_ids']));
      $icl_before = $wpdb->get_results("
        SELECT element_id, translation_id, trid, language_code
        FROM {$wpdb->prefix}icl_translations
        WHERE element_type = 'post_elementor_library' AND element_id IN ({$ids_sql})
      ", ARRAY_A);
      $get_autoload = function($opt_name) use ($wpdb) {
        $v = $wpdb->get_var($wpdb->prepare(
          "SELECT autoload FROM {$wpdb->options} WHERE option_name = %s LIMIT 1",
          $opt_name
        ));
        if ($v === null) return null;
        return in_array($v, ['yes', 'on', 'auto', 'auto-on', '1'], true);
      };
      $gk = get_option('WPML_Group_Keys', []);
      $gk_pb = is_array($gk)
        ? array_values(array_intersect($gk, ['WPML(api-pb-config)', 'WPML(api-pb-config/elementor)']))
        : [];
      return [
        'translate_everything_api' => class_exists('\WPML\Setup\Option') ? \WPML\Setup\Option::getTranslateEverything() : null,
        'wpml_setup_option' => get_option('WPML(setup)', null),
        'wpml_setup_autoload' => $get_autoload('WPML(setup)'),
        'wpml_setup_te_option' => get_option('WPML(setup/translate-everything)', null),
        'wpml_setup_te_autoload' => $get_autoload('WPML(setup/translate-everything)'),
        'custom_term_fields_translation' => $ctft,
        'artes_rev2_existed' => array_key_exists('_artes_rev2', $cft),
        'artes_rev2_value' => $cft['_artes_rev2'] ?? null,
        'api_pb_elementor_raw' => get_option('WPML(api-pb-config/elementor)', '__MISSING__'),
        'api_pb_elementor_autoload' => $get_autoload('WPML(api-pb-config/elementor)'),
        'api_pb_group_raw' => get_option('WPML(api-pb-config)', '__MISSING__'),
        'api_pb_group_autoload' => $get_autoload('WPML(api-pb-config)'),
        'api_pb_elementor_om' => $om->get('api-pb-config', 'elementor', null),
        'wpml_group_keys_pb_before' => $gk_pb,
        'icl_before' => $icl_before,
        'en_gb_installed_before' => (file_exists(WP_LANG_DIR . '/en_GB.mo') || file_exists(WP_LANG_DIR . '/en_GB.l10n.php')),
      ];
    `, { icl_ids: ELEMENTOR_LIBRARY_ICL_IDS });

    backup.passo1 = {
      prima_esecuzione: snap1,
      added_icl_translations: [],
      installed_en_gb_pack: false,
    };
    fs.writeFileSync(BACKUP_FILE_DEFAULT, JSON.stringify(backup, null, 2));
  }

  // ---- Snapshot pre-modifica Passo 2 ----
  if (faiPasso2) {
    const snap2 = await phpConDati(nv, String.raw`
      $out = ['tb_cache' => get_option('elementor_pro_theme_builder_conditions', []), 'docs' => []];
      foreach ($D['ids'] as $id) {
        $id = (int)$id;
        $p = get_post($id);
        if (!$p) throw new \RuntimeException("Documento non trovato su dev3: {$id}");
        $out['docs'][(string)$id] = [
          'id' => $id,
          'post_type' => $p->post_type,
          'post_name' => $p->post_name,
          'post_status' => $p->post_status,
          'elementor_edit_mode' => get_post_meta($id, '_elementor_edit_mode', true),
          'elementor_conditions' => get_post_meta($id, '_elementor_conditions', true),
          'elementor_data_raw' => get_post_meta($id, '_elementor_data', true),
        ];
      }
      return $out;
    `, { ids: TARGET_DOC_IDS });

    if (!backup.passo2) backup.passo2 = { documenti: {} };
    if (!backup.passo2.tb_cache_prima) backup.passo2.tb_cache_prima = snap2.tb_cache;
    for (const b of builtList) {
      const k = String(b.doc.id);
      if (!backup.passo2.documenti[k]) {
        backup.passo2.documenti[k] = {
          id: b.doc.id,
          nome: b.doc.nome,
          tipo: b.doc.tipo,
          prima_esecuzione: snap2.docs[k],
        };
      }
    }
    fs.writeFileSync(BACKUP_FILE_DEFAULT, JSON.stringify(backup, null, 2));
  }

  console.log(`Backup pre-modifica salvato in ${path.relative(root, BACKUP_FILE_DEFAULT)}.`);

  // ---- ESECUZIONE PASSO 1 ----
  if (faiPasso1) {
    console.log('\n=== PASSO 1: WPML DB & CONFIG ===');
    const res1 = await phpConDati(nv, String.raw`
      global $wpdb, $sitepress;
      $report = [
        'translate_everything' => null,
        'icl_added' => [],
        'icl_already_present' => [],
        'term_meta_updated' => [],
        'artes_rev2_set' => false,
        'api_pb_elementor' => null,
      ];

      // 1.1 Disattiva Translate Everything (Option::setTranslateEverything aggiorna sia WPML(setup/translate-everything) sia WPML(setup) con autoload=true)
      if (class_exists('\WPML\Setup\Option')) {
        \WPML\Setup\Option::setTranslateEverything(false);
        $report['translate_everything'] = \WPML\Setup\Option::getTranslateEverything();
      } else {
        $om = new \WPML\WP\OptionManager();
        $om->set('setup', 'translate-everything', false, true);
        $report['translate_everything'] = false;
      }
      // Guardia difensiva su WPML(setup) preservando autoload=true
      $setup_arr = get_option('WPML(setup)', null);
      if (is_array($setup_arr) && !empty($setup_arr['translate-everything'])) {
        $setup_arr['translate-everything'] = false;
        update_option('WPML(setup)', $setup_arr, true);
      }

      // 1.2 Registra elementor_library mancanti come 'it' in icl_translations
      foreach ($D['icl_ids'] as $pid) {
        $pid = (int)$pid;
        if (!get_post($pid)) continue;
        $exists = $wpdb->get_row($wpdb->prepare(
          "SELECT translation_id, trid, language_code FROM {$wpdb->prefix}icl_translations WHERE element_id = %d AND element_type = 'post_elementor_library'",
          $pid
        ), ARRAY_A);
        if ($exists && !empty($exists['trid'])) {
          $report['icl_already_present'][] = $pid;
          continue;
        }
        do_action('wpml_set_element_language_details', [
          'element_id' => $pid,
          'element_type' => 'post_elementor_library',
          'trid' => false,
          'language_code' => 'it',
          'source_language_code' => null,
        ]);
        $created = $wpdb->get_row($wpdb->prepare(
          "SELECT translation_id, trid, language_code FROM {$wpdb->prefix}icl_translations WHERE element_id = %d AND element_type = 'post_elementor_library'",
          $pid
        ), ARRAY_A);
        if (!$created || empty($created['trid'])) {
          throw new \RuntimeException("Registrazione icl_translations fallita per post_elementor_library #{$pid}");
        }
        $report['icl_added'][] = [
          'element_id' => $pid,
          'translation_id' => (int)$created['translation_id'],
          'trid' => (int)$created['trid'],
          'language_code' => $created['language_code'],
        ];
      }

      // 1.3 Imposta custom_term_fields_translation e custom_fields_translation._artes_rev2
      $tm = $sitepress->get_setting('translation-management', []);
      if (!is_array($tm)) $tm = [];
      if (!isset($tm['custom_term_fields_translation']) || !is_array($tm['custom_term_fields_translation'])) {
        $tm['custom_term_fields_translation'] = [];
      }
      foreach ($D['term_meta'] as $k) {
        $tm['custom_term_fields_translation'][$k] = 1;
        $report['term_meta_updated'][$k] = 1;
      }
      if (!isset($tm['custom_fields_translation']) || !is_array($tm['custom_fields_translation'])) {
        $tm['custom_fields_translation'] = [];
      }
      $tm['custom_fields_translation']['_artes_rev2'] = 1;
      $report['artes_rev2_set'] = true;
      $sitepress->set_setting('translation-management', $tm, true);

      // 1.4 Popola WPML(api-pb-config/elementor) dall'XML remoto Elementor in wpml_config_files_arr (se vuoto o incompleto rispetto a V4_WIDGETS_OBBLIGATORI)
      $om = new \WPML\WP\OptionManager();
      $cur_pb = $om->get('api-pb-config', 'elementor', []);
      $has_v4 = is_array($cur_pb);
      if ($has_v4) {
        foreach ($D['v4_obbligatori'] as $req_w) {
          if (!isset($cur_pb[$req_w])) {
            $has_v4 = false;
            break;
          }
        }
      }
      if (!$has_v4) {
        $cfg_arr = get_option('wpml_config_files_arr', null);
        $el_xml = (is_object($cfg_arr) && isset($cfg_arr->plugins['Elementor'])) ? $cfg_arr->plugins['Elementor'] : null;
        if (!$el_xml) {
          throw new \RuntimeException('XML remoto Elementor assente in wpml_config_files_arr');
        }
        if (!function_exists('icl_xml2array')) {
          require_once WP_PLUGIN_DIR . '/sitepress-multilingual-cms/inc/functions-load.php';
        }
        $xml_arr = icl_xml2array($el_xml);
        $parser = new \WPML\PB\Config\Parser('elementor-widgets', 'widgetType');
        $parsed = $parser->extract($xml_arr);
        foreach ($D['v4_obbligatori'] as $req_w) {
          if (!isset($parsed[$req_w])) {
            throw new \RuntimeException("Widget V4 mancante dopo il parsing XML remoto: {$req_w}");
          }
        }
        $storage = new \WPML\PB\Config\Storage($om, 'elementor');
        $storage->update($parsed);
        do_action('wpml_elementor_auto_config_clear_cache');
        $v4_cnt = count(array_filter(array_keys($parsed), fn($k) => strpos((string)$k, 'e-') === 0));
        $report['api_pb_elementor'] = ['action' => 'populated', 'total' => count($parsed), 'v4' => $v4_cnt];
      } else {
        $v4_cnt = count(array_filter(array_keys($cur_pb), fn($k) => strpos((string)$k, 'e-') === 0));
        $report['api_pb_elementor'] = ['action' => 'already_populated', 'total' => count($cur_pb), 'v4' => $v4_cnt];
      }

      $report['en_gb_present'] = (file_exists(WP_LANG_DIR . '/en_GB.mo') || file_exists(WP_LANG_DIR . '/en_GB.l10n.php'));
      return $report;
    `, {
      icl_ids: ELEMENTOR_LIBRARY_ICL_IDS,
      term_meta: TERM_META_COPY,
      v4_obbligatori: V4_WIDGETS_OBBLIGATORI,
    });

    if (res1.icl_added && res1.icl_added.length) {
      backup.passo1.added_icl_translations = [
        ...(backup.passo1.added_icl_translations || []),
        ...res1.icl_added,
      ];
    }
    // Persistenza crash-safe su disco prima di 1.5 (rete/WP-CLI): se 1.5 fallisce, --rollback rimuove comunque le righe icl_translations aggiunte.
    fs.writeFileSync(BACKUP_FILE_DEFAULT, JSON.stringify(backup, null, 2));

    console.log('  1.1 Translate Everything:', res1.translate_everything);
    console.log(`  1.2 icl_translations aggiunti: ${res1.icl_added.length} (${res1.icl_added.map((x) => x.element_id).join(', ') || 'nessuno'}), già presenti: ${res1.icl_already_present.length}`);
    console.log('  1.3 term meta & _artes_rev2:', JSON.stringify(res1.term_meta_updated), '_artes_rev2=1');
    console.log('  1.4 WPML(api-pb-config/elementor):', JSON.stringify(res1.api_pb_elementor));

    // 1.5 Installa language pack en_GB se mancante
    if (!res1.en_gb_present) {
      let installed = false;
      try {
        const cliRes = await runWpCli(nv, ['language', 'core', 'install', 'en_GB']);
        if (cliRes && cliRes.exit_code === 0) {
          installed = true;
          console.log('  1.5 Language pack en_GB installato via WP-CLI.');
        } else {
          console.log('  1.5 WP-CLI language install non riuscito, provo fallback wp_download_language_pack...');
        }
      } catch (e) {
        console.log(`  1.5 WP-CLI non disponibile (${e.message}), provo fallback wp_download_language_pack...`);
      }
      if (!installed) {
        const dl = await nv.php(`
          require_once ABSPATH . 'wp-admin/includes/translation-install.php';
          require_once ABSPATH . 'wp-admin/includes/file.php';
          $r = wp_download_language_pack('en_GB');
          return [
            'res' => $r,
            'present' => (file_exists(WP_LANG_DIR . '/en_GB.mo') || file_exists(WP_LANG_DIR . '/en_GB.l10n.php')),
          ];
        `);
        if (!dl.present) {
          throw new Error(`Installazione language pack en_GB fallita: ${JSON.stringify(dl)}`);
        }
        installed = true;
        console.log('  1.5 Language pack en_GB installato via wp_download_language_pack().');
      }
      if (installed) backup.passo1.installed_en_gb_pack = true;
    } else {
      console.log('  1.5 Language pack en_GB già presente.');
    }

    fs.writeFileSync(BACKUP_FILE_DEFAULT, JSON.stringify(backup, null, 2));
  }

  // ---- ESECUZIONE PASSO 2 ----
  if (faiPasso2) {
    console.log('\n=== PASSO 2: RICOSTRUZIONE IT COMPATIBILE WPML (557, 1040, 1049, 1051) ===');
    for (const b of builtList) {
      const { doc, risultato } = b;
      const res = await el.callJson('elementor-build-composition', {
        post_id: doc.id,
        mode: 'replace_children',
        parent_id: 'document',
        ...risultato.composizione,
      });
      if (res.errors && res.errors.length) {
        throw new Error(`${doc.nome} (${doc.id}): ${JSON.stringify(res.errors)}`);
      }
      await el.call('elementor-publish-document', { post_id: doc.id });

      const entry = backup.passo2.documenti[String(doc.id)];
      if (!entry.prima_undo_revision_id) entry.prima_undo_revision_id = res.undo_revision_id;
      entry.ultimo_undo_revision_id = res.undo_revision_id;
      entry.eseguito_il = new Date().toISOString();
      fs.writeFileSync(BACKUP_FILE_DEFAULT, JSON.stringify(backup, null, 2));

      console.log(`  OK [${String(doc.id).padStart(4)}] ${doc.nome.padEnd(16)} (${risultato.elementi} el, undo=${res.undo_revision_id})`);
    }

    // Verifica e (solo se alterate) ripristina condizioni Theme Builder e cache tb_cache su tutti i 6 site part
    const condCheck = await phpConDati(nv, String.raw`
      $ripristinate = [];
      foreach ($D['attese'] as $id_str => $att) {
        $id = (int)$id_str;
        $cur = get_post_meta($id, '_elementor_conditions', true);
        if (!is_array($cur) || $cur !== $att) {
          update_post_meta($id, '_elementor_conditions', $att);
          $ripristinate[] = $id;
        }
      }
      $tb_cache = get_option('elementor_pro_theme_builder_conditions', []);
      $tb_stale = [];
      foreach ($D['attese'] as $id_str => $att) {
        $loc = $D['locations'][$id_str] ?? '';
        $cached = (is_array($tb_cache) && isset($tb_cache[$loc][$id_str])) ? $tb_cache[$loc][$id_str] : null;
        if (!is_array($cached) || $cached !== $att) {
          $tb_stale[] = (int)$id_str;
        }
      }
      if ((!empty($ripristinate) || !empty($tb_stale)) && class_exists('\ElementorPro\Modules\ThemeBuilder\Module')) {
        \ElementorPro\Modules\ThemeBuilder\Module::instance()->get_conditions_manager()->get_cache()->regenerate();
      }
      return ['ripristinate' => $ripristinate, 'tb_stale' => $tb_stale];
    `, { attese: CONDIZIONI_ATTESE, locations: TB_LOCATION_ATTESE });
    if (condCheck.ripristinate.length || condCheck.tb_stale.length) {
      console.log(`  Condizioni Theme Builder / cache rigenerate (meta=${JSON.stringify(condCheck.ripristinate)}, tb_cache=${JSON.stringify(condCheck.tb_stale)}).`);
    } else {
      console.log('  Condizioni Theme Builder e tb_cache intatte su tutti e 6 i site part.');
    }

    fs.writeFileSync(BACKUP_FILE_DEFAULT, JSON.stringify(backup, null, 2));
  }

  // Svuota tutte le cache (Elementor + WP + WPML)
  await svuotaTutteCache(el, nv);
  console.log('\nCache Elementor, WordPress e WPML svuotate.');

  // Verifica finale live post-esecuzione
  const statoFinale = await leggiStatoLive(nv);
  stampaStatoLive(statoFinale);

  const erroriLive = [];
  if (faiPasso1) {
    if (statoFinale.translate_everything.api !== false) erroriLive.push('Translate Everything non disattivato');
    const mancIcl = statoFinale.icl_elementor_library.filter((r) => !r.trid);
    if (mancIcl.length) erroriLive.push(`icl_translations ancora mancanti: ${mancIcl.map((r) => r.ID).join(', ')}`);
    for (const k of TERM_META_COPY) {
      if (statoFinale.term_meta_translation[k] !== 1) erroriLive.push(`custom_term_fields_translation.${k} != 1`);
    }
    if (statoFinale.artes_rev2_cf !== 1) erroriLive.push('custom_fields_translation._artes_rev2 != 1');
    if (statoFinale.api_pb_elementor.v4_mancanti.length) {
      erroriLive.push(`WPML(api-pb-config/elementor) incompleto: ${statoFinale.api_pb_elementor.v4_mancanti.join(', ')}`);
    }
    if (!statoFinale.en_gb_pack.installed) erroriLive.push('Language pack en_GB non rilevato dopo installazione');
  }
  if (faiPasso2) {
    for (const id of SITE_PARTS_ATTIVI) {
      if (JSON.stringify(statoFinale.condizioni_site_parts[String(id)]) !== JSON.stringify(CONDIZIONI_ATTESE[id])) {
        erroriLive.push(`Condizioni Theme Builder alterate su ${id}`);
      }
      const loc = TB_LOCATION_ATTESE[id];
      const cached = (statoFinale.tb_cache && statoFinale.tb_cache[loc] && statoFinale.tb_cache[loc][String(id)]) || null;
      if (JSON.stringify(cached) !== JSON.stringify(CONDIZIONI_ATTESE[id])) {
        erroriLive.push(`Cache Theme Builder (tb_cache.${loc}.${id}) non allineata: ${JSON.stringify(cached)}`);
      }
    }
    const d557 = statoFinale.docs_live['557'];
    if (d557.lingue_count !== 2 || d557.static_it_en !== 0 || d557.hash_contatti !== 0 || d557.contatti_links !== 2) {
      erroriLive.push(`Header 557 live non conforme: lingue=${d557.lingue_count}, static_it_en=${d557.static_it_en}, /contatti/=${d557.contatti_links}, #contatti=${d557.hash_contatti}`);
    }
    for (const tid of [1040, 1049]) {
      const d = statoFinale.docs_live[String(tid)];
      const scSet = new Set(d.shortcodes || []);
      const scMancanti = (SHORTCODES_RICHIESTI_TEMPLATE[tid] || []).filter((req) => !scSet.has(req));
      if (d.before_non_vuoti.length > 0 || d.hash_contatti !== 0 || d.contatti_links !== 2 || scMancanti.length > 0) {
        erroriLive.push(
          `Template ${tid} live non conforme: before_non_vuoti=${JSON.stringify(d.before_non_vuoti)}, ` +
          `/contatti/=${d.contatti_links}, #contatti=${d.hash_contatti}, sc_mancanti=${JSON.stringify(scMancanti)}`
        );
      }
    }
    const d1051 = statoFinale.docs_live['1051'];
    if (d1051.dato_cat_brand !== 1 || d1051.hash_contatti !== 0 || d1051.contatti_links !== 1) {
      erroriLive.push(`Template 1051 live non conforme: dato_cat_brand=${d1051.dato_cat_brand}, /contatti/=${d1051.contatti_links}, #contatti=${d1051.hash_contatti}`);
    }
  }
  if (erroriLive.length) {
    throw new Error(`Verifica live post-esecuzione fallita:\n  - ${erroriLive.join('\n  - ')}`);
  }
  console.log('\n=== VERIFICA LIVE POST-ESECUZIONE: TUTTO OK ===');
}

async function rollbackDaBackup(fileBackup) {
  if (!fs.existsSync(fileBackup)) {
    throw new Error(`File di backup non trovato: ${fileBackup}`);
  }
  const backup = JSON.parse(fs.readFileSync(fileBackup, 'utf8'));
  const { connetti } = require('./mcp-client');
  const nv = await connetti('novamira');
  const el = await connetti('elementor');

  console.log(`=== ROLLBACK DA ${path.relative(root, fileBackup)} ===`);

  if (backup.passo1 && backup.passo1.prima_esecuzione) {
    const p1 = backup.passo1;
    const res1 = await phpConDati(nv, String.raw`
      global $wpdb, $sitepress;
      $snap = $D['prima'];
      $out = [];

      // 1.1 Ripristina Translate Everything preservando autoload='on' e senza sovrascrivere altre chiavi di WPML(setup)
      if (class_exists('\WPML\Setup\Option') && is_bool($snap['translate_everything_api'])) {
        \WPML\Setup\Option::setTranslateEverything($snap['translate_everything_api']);
      } else {
        $setup_al = (array_key_exists('wpml_setup_autoload', $snap) && is_bool($snap['wpml_setup_autoload'])) ? $snap['wpml_setup_autoload'] : true;
        $te_al = (array_key_exists('wpml_setup_te_autoload', $snap) && is_bool($snap['wpml_setup_te_autoload'])) ? $snap['wpml_setup_te_autoload'] : true;
        if ($snap['wpml_setup_option'] !== null) {
          update_option('WPML(setup)', $snap['wpml_setup_option'], $setup_al);
        }
        if ($snap['wpml_setup_te_option'] !== null) {
          update_option('WPML(setup/translate-everything)', $snap['wpml_setup_te_option'], $te_al);
        }
      }
      $out['translate_everything_restored'] = $snap['translate_everything_api'];

      // 1.2 Rimuovi SOLO le righe icl_translations aggiunte dallo script
      $deleted_icl = 0;
      foreach ($D['added_icl'] as $row) {
        $n = $wpdb->delete(
          $wpdb->prefix . 'icl_translations',
          [
            'translation_id' => (int)$row['translation_id'],
            'element_id' => (int)$row['element_id'],
            'element_type' => 'post_elementor_library',
          ],
          ['%d', '%d', '%s']
        );
        if ($n) $deleted_icl += (int)$n;
      }
      $out['icl_deleted'] = $deleted_icl;

      // 1.3 Ripristina custom_term_fields_translation e _artes_rev2
      $tm = $sitepress->get_setting('translation-management', []);
      if (!is_array($tm)) $tm = [];
      $tm['custom_term_fields_translation'] = is_array($snap['custom_term_fields_translation']) ? $snap['custom_term_fields_translation'] : [];
      if (!isset($tm['custom_fields_translation']) || !is_array($tm['custom_fields_translation'])) {
        $tm['custom_fields_translation'] = [];
      }
      if (!empty($snap['artes_rev2_existed'])) {
        $tm['custom_fields_translation']['_artes_rev2'] = $snap['artes_rev2_value'];
      } else {
        unset($tm['custom_fields_translation']['_artes_rev2']);
      }
      $sitepress->set_setting('translation-management', $tm, true);
      $out['settings_restored'] = true;

      // 1.4 Ripristina WPML(api-pb-config/elementor), la riga gruppo legacy WPML(api-pb-config) e WPML_Group_Keys scritti da OptionManager::set()
      $pb_el_al = (array_key_exists('api_pb_elementor_autoload', $snap) && is_bool($snap['api_pb_elementor_autoload'])) ? $snap['api_pb_elementor_autoload'] : true;
      if ($snap['api_pb_elementor_raw'] === '__MISSING__') {
        delete_option('WPML(api-pb-config/elementor)');
      } else {
        update_option('WPML(api-pb-config/elementor)', $snap['api_pb_elementor_raw'], $pb_el_al);
      }
      $pb_grp_raw = array_key_exists('api_pb_group_raw', $snap) ? $snap['api_pb_group_raw'] : '__MISSING__';
      $pb_grp_al = (array_key_exists('api_pb_group_autoload', $snap) && is_bool($snap['api_pb_group_autoload'])) ? $snap['api_pb_group_autoload'] : false;
      if ($pb_grp_raw === '__MISSING__') {
        delete_option('WPML(api-pb-config)');
      } else {
        update_option('WPML(api-pb-config)', $pb_grp_raw, $pb_grp_al);
      }
      $gk_before = is_array($snap['wpml_group_keys_pb_before'] ?? null) ? $snap['wpml_group_keys_pb_before'] : [];
      $gk_cur = get_option('WPML_Group_Keys', null);
      if (is_array($gk_cur)) {
        $gk_new = array_values(array_filter($gk_cur, function($k) use ($gk_before) {
          if ($k === 'WPML(api-pb-config)' || $k === 'WPML(api-pb-config/elementor)') {
            return in_array($k, $gk_before, true);
          }
          return true;
        }));
        if ($gk_new !== $gk_cur) {
          update_option('WPML_Group_Keys', $gk_new);
        }
      }
      do_action('wpml_elementor_auto_config_clear_cache');
      $out['api_pb_restored'] = true;

      return $out;
    `, {
      prima: p1.prima_esecuzione,
      added_icl: p1.added_icl_translations || [],
    });
    console.log('  Passo 1 ripristinato:', JSON.stringify(res1));

    if (p1.installed_en_gb_pack && !p1.prima_esecuzione.en_gb_installed_before) {
      try {
        const u = await runWpCli(nv, ['language', 'core', 'uninstall', 'en_GB']);
        console.log(`  Language pack en_GB rimosso via WP-CLI (exit=${u.exit_code}).`);
      } catch (e) {
        console.log(`  Avviso: rimozione language pack en_GB non eseguita (${e.message}).`);
      }
    }
  }

  const docsEntries = Object.values((backup.passo2 && backup.passo2.documenti) || {});
  if (docsEntries.length) {
    const items = docsEntries.map((e) => ({
      id: e.id,
      nome: e.nome,
      elementor_data_raw: e.prima_esecuzione.elementor_data_raw,
      elementor_edit_mode: e.prima_esecuzione.elementor_edit_mode || 'builder',
      elementor_conditions: e.prima_esecuzione.elementor_conditions,
    }));
    const res2 = await phpConDati(nv, String.raw`
      $out = [];
      foreach ($D['items'] as $it) {
        $id = (int)$it['id'];
        update_post_meta($id, '_elementor_data', wp_slash((string)$it['elementor_data_raw']));
        update_post_meta($id, '_elementor_edit_mode', (string)$it['elementor_edit_mode']);
        if (is_array($it['elementor_conditions']) && !empty($it['elementor_conditions'])) {
          update_post_meta($id, '_elementor_conditions', $it['elementor_conditions']);
        }
        delete_post_meta($id, '_elementor_css');
        clean_post_cache($id);
        $out[] = ['id' => $id, 'nome' => $it['nome'], 'bytes' => strlen((string)get_post_meta($id, '_elementor_data', true))];
      }
      if (is_array($D['tb_cache'])) {
        update_option('elementor_pro_theme_builder_conditions', $D['tb_cache']);
      }
      return $out;
    `, { items, tb_cache: backup.passo2.tb_cache_prima || null });
    for (const r of res2) {
      console.log(`  RIPRISTINATO [${String(r.id).padStart(4)}] ${r.nome.padEnd(16)} (${r.bytes} byte)`);
    }
  }

  await svuotaTutteCache(el, nv);
  console.log('Cache Elementor, WordPress e WPML svuotate. Rollback completato.');
}

if (require.main === module) {
  (async () => {
    const args = process.argv.slice(2);
    const modePiano = args.includes('--piano');
    const modeEsegui = args.includes('--esegui');
    const modeStato = args.includes('--stato');
    const idxRollback = args.indexOf('--rollback');
    const modeRollback = idxRollback >= 0;
    const salvaComp = args.includes('--salva-comp');
    const idxSolo = args.indexOf('--solo');
    const solo = idxSolo >= 0 ? (args[idxSolo + 1] || '').toLowerCase() : null;

    if (!modePiano && !modeEsegui && !modeStato && !modeRollback) {
      console.error('Uso: wpml-prepara.js --piano [--salva-comp] | --stato | --esegui [--solo passo1|passo2] | --rollback [file]');
      process.exit(2);
    }
    if (solo && !['passo1', 'passo2'].includes(solo)) {
      throw new Error(`Valore --solo non valido: "${solo}" (atteso passo1 o passo2)`);
    }

    if (modeRollback) {
      const nextArg = args[idxRollback + 1];
      const fileBackup = (nextArg && !nextArg.startsWith('--')) ? path.resolve(root, nextArg) : BACKUP_FILE_DEFAULT;
      await rollbackDaBackup(fileBackup);
      return;
    }

    if (modeStato) {
      const { connetti } = require('./mcp-client');
      const nv = await connetti('novamira');
      const stato = await leggiStatoLive(nv);
      stampaStatoLive(stato);
      return;
    }

    const { builtList, verifiche } = costruisciEValidaOffline(salvaComp);
    const totErrori = stampaPiano(verifiche, salvaComp);
    if (totErrori > 0) {
      throw new Error(`Verifica offline fallita con ${totErrori} errori: nessuna scrittura eseguita.`);
    }

    if (modeEsegui) {
      await eseguiSuDev3(builtList, solo);
    }
  })().catch((e) => {
    console.error('ERRORE:', e.message);
    process.exit(1);
  });
}

module.exports = {
  SITE_PARTS_ATTIVI,
  RISERVA_IDS,
  ELEMENTOR_LIBRARY_ICL_IDS,
  CONDIZIONI_ATTESE,
  TERM_META_COPY,
  TARGET_DOC_IDS,
  costruisciEValidaOffline,
  ispezionaComposizioneOffline,
};
