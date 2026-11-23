'use strict';
// Fase 9 dell'adeguamento rev2 — Chiusura tecnica (reversibile, idempotente, senza WPML/EN e senza cancellazione media):
//   node tools/rev2/fase9-chiusura.js --piano [--offline]       sola lettura: mostra il piano operativo completo dai JSON di audit
//   node tools/rev2/fase9-chiusura.js --esegui [--forza-backup] salva tools/out/rev2/fase9-backup.json ed esegue i passi (a)-(f) su dev3
//   node tools/rev2/fase9-chiusura.js --stato                   sola lettura: verifica stato corrente su dev3 (plugin, kit, site part, menu, classi)
//   node tools/rev2/fase9-chiusura.js --rollback [file]         ripristina integralmente lo stato precedente da fase9-backup.json
//
// Passi eseguiti da --esegui:
//   (a) Aggiorna le variabili globali mappate del Kit Elementor attivo alla palette/font rev2 (es. sand=#393E42, night=#2F3438),
//       senza toccare variabili non mappate o font di sistema.
//   (b) Porta Header 557 e Footer 971 a `include/general` (tutto il sito) dopo aver svuotato le condizioni dei vecchi template.
//   (c) Sposta nel CESTINO (wp_trash_post, MAI force_delete) la pagina prova 542 e i 6 template vecchi (199, 200, 138, 448, 213, 447).
//   (d) Elimina i menu dei filtri non più usati (`filtri-realizzazioni`, `filtri-brand`) dopo averli salvati nel backup.
//   (e) Rimuove le sole classi globali Elementor indicate come sicure/orfane in `tools/out/rev2/fase9-audit-classi.json`,
//       con guardia live contro qualsiasi classe rev2 o usata da `[Riserva]` (539-541) o dalle 6 bozze (152-154, 471, 472, 491).
//   (f) Accende l'opzione `artes_rev2_globale = '1'` e svuota le cache Elementor e WordPress.
//
// VINCOLI NON VIOLABILI:
//   - NON cancella MAI allegati media (solo inventario separato in audit-media).
//   - NON tocca WPML / EN / `[artes_lingue]`, `blog_public`, `[Riserva]` (539-541), né le 6 pagine in bozza (152, 153, 154, 471, 472, 491).

const fs = require('fs');
const path = require('path');
const { connetti } = require('./mcp-client');

const root = path.resolve(__dirname, '..', '..');
const rev2CssPath = path.join(root, 'artes-sito-rev2', 'assets', 'css', 'artes.css');
const outDir = path.join(root, 'tools', 'out', 'rev2');

const FILE_AUDIT_CLASSI = path.join(outDir, 'fase9-audit-classi.json');
const FILE_AUDIT_KIT_MENU = path.join(outDir, 'fase9-audit-kit-menu.json');
const FILE_BACKUP_DEFAULT = path.join(outDir, 'fase9-backup.json');
const FILE_CLASSI_REV2 = path.join(outDir, 'classi-rev2.json');

const HEADER_REV2 = 557;
const FOOTER_REV2 = 971;
const SITE_PARTS_REV2 = [557, 971, 1040, 1049, 1050, 1051];

// Unici ID ammessi allo spostamento nel cestino (reversibile, mai force_delete).
const DA_CESTINARE_TEMPLATE = [199, 200, 138, 448, 213, 447];
const DA_CESTINARE_TUTTI = [542, ...DA_CESTINARE_TEMPLATE];

// ID protetti: mai cestinare, mai modificare condizioni, mai rimuovere classi usate da questi documenti.
const ID_RISERVA = [539, 540, 541];
const ID_BOZZE = [152, 153, 154, 471, 472, 491];
const ID_PAGINE_REV2 = [376, 144, 145, 146, 147, 148, 149, 150, 151, 3, 493];
const ID_PROTETTI = [...new Set([...ID_PAGINE_REV2, ...SITE_PARTS_REV2, ...ID_RISERVA, ...ID_BOZZE])];

// Menu dei filtri legacy da rimuovere (dopo backup integrale).
const MENU_FILTRI_DA_ELIMINARE = ['filtri-realizzazioni', 'filtri-brand'];

// Classi di appoggio del convertitore HTML->Elementor (vedi crea-classi.js): sempre protette insieme a classi-rev2.json.
const CLASSI_APPOGGIO_REV2 = [
  'page-root', 'rev2-p', 'rev2-dl', 'rev2-dt', 'rev2-dd', 'rev2-ul', 'rev2-ol', 'rev2-li',
  'rev2-small', 'rev2-strong', 'rev2-em', 'rev2-b', 'rev2-i', 'rev2-t', 'rev2-v',
  'rev2-opz', 'rev2-opzimg', 'rev2-loop', 'rev2-a', 'rev2-dato', 'rev2-mb0',
];

// Mappa tra label delle variabili del Kit Elementor e proprietà CSS in :root di artes-sito-rev2/assets/css/artes.css.
const MAPPA_VARIABILI_COLORI = [
  'bone', 'sand', 'graphite', 'night', 'ink',
  'muted-1', 'muted-2', 'muted-3', 'muted-4',
  'line', 'line-soft', 'line-strong', 'line-btn',
  'accent', 'sand-ink', 'sand-muted',
];
const MAPPA_VARIABILI_FONT = {
  'font-display': 'display',
  'font-body': 'body',
  'font-mono': 'mono',
};
const MAPPA_VARIABILI_SIZE = ['pad', 'gutter'];

const BATCH_CLASSI = 25;

// --- Utility PHP sicura via base64 (come fase7-seo.js) -----------------------------------------------------------
async function phpConDati(nv, codicePhp, dati) {
  const b64 = Buffer.from(JSON.stringify(dati), 'utf8').toString('base64');
  const wrapped = `$D = json_decode(base64_decode('${b64}'), true);\n${codicePhp}`;
  return nv.php(wrapped);
}

/**
 * Svuota realmente le condizioni Theme Builder di una lista di site part:
 * `elementor-manage-site-parts` con `conditions: []` normalizza silenziosamente in `['include/general']`,
 * quindi va usato direttamente `Conditions_Manager::save_conditions($id, [])` + rigenerazione cache.
 */
async function svuotaCondizioniSiteParts(nv, ids) {
  if (!ids || !ids.length) return {};
  return phpConDati(nv, String.raw`
    $out = [];
    if (!class_exists('\ElementorPro\Modules\ThemeBuilder\Module')) {
      throw new \RuntimeException('ElementorPro ThemeBuilder Module non disponibile.');
    }
    $cm = \ElementorPro\Modules\ThemeBuilder\Module::instance()->get_conditions_manager();
    foreach ($D['ids'] as $id) {
      $id = (int) $id;
      $saved = $cm->save_conditions($id, []);
      $residuo = get_post_meta($id, '_elementor_conditions', true);
      if (!empty($residuo)) {
        delete_post_meta($id, '_elementor_conditions');
      }
      $out[$id] = [
        'saved' => (bool) $saved,
        'condizioni_residue' => get_post_meta($id, '_elementor_conditions', true) ?: [],
      ];
    }
    if (method_exists($cm, 'clear_location_cache')) {
      $cm->clear_location_cache();
    } elseif (method_exists($cm, 'get_cache') && $cm->get_cache()) {
      $cm->get_cache()->regenerate();
    }
    return $out;
  `, { ids });
}

// --- Parsing dei token :root top-level dalla rev2 (ignora @media) ------------------------------------------------
function estraiTokenRev2(cssPath = rev2CssPath) {
  const raw = fs.readFileSync(cssPath, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  const tokens = {};
  let depth = 0;
  let i = 0;
  while (i < raw.length) {
    const ch = raw[i];
    if (ch === '{') {
      depth++;
      i++;
      continue;
    }
    if (ch === '}') {
      depth = Math.max(0, depth - 1);
      i++;
      continue;
    }
    if (depth === 0) {
      const m = /^:root\s*\{/.exec(raw.slice(i));
      if (m) {
        const start = i + m[0].length;
        const end = raw.indexOf('}', start);
        if (end === -1) break;
        const body = raw.slice(start, end);
        const reDecl = /--([a-z0-9-]+)\s*:\s*([^;]+);/gi;
        let dm;
        while ((dm = reDecl.exec(body)) !== null) {
          tokens[dm[1].trim().toLowerCase()] = dm[2].trim();
        }
        i = end + 1;
        continue;
      }
    }
    i++;
  }
  return tokens;
}

function normalizzaHex(val) {
  const s = String(val || '').trim();
  if (/^#[0-9a-f]{3}$/i.test(s)) {
    return '#' + s.slice(1).split('').map((c) => c + c).join('').toUpperCase();
  }
  if (/^#[0-9a-f]{6}$/i.test(s)) {
    return s.toUpperCase();
  }
  return s;
}

function estraiPrimoFont(fontStack) {
  const first = String(fontStack || '').split(',')[0] || '';
  return first.trim().replace(/^['"]|['"]$/g, '');
}

function parseSizePx(val) {
  const m = /^(-?\d+(?:\.\d+)?)\s*(px|rem|em|%)$/i.exec(String(val || '').trim());
  if (!m) return null;
  return { size: Number(m[1]), unit: m[2].toLowerCase() };
}

/**
 * Calcola le modifiche alle variabili globali del Kit attivo confrontandole con i token rev2.
 * Tocca SOLO variabili già presenti nel kit che hanno una corrispondenza esplicita nella rev2.
 */
function calcolaDiffVariabiliKit(kitVarsObj, rev2Tokens) {
  const data = (kitVarsObj && typeof kitVarsObj === 'object' && kitVarsObj.data) ? kitVarsObj.data : {};
  const modifiche = [];
  const invariate = [];
  const nonMappate = [];

  for (const [id, entry] of Object.entries(data)) {
    if (!entry || typeof entry !== 'object') continue;
    const label = String(entry.label || '').trim();
    const tipo = String(entry.type || '');

    if (tipo === 'global-color-variable' && MAPPA_VARIABILI_COLORI.includes(label) && rev2Tokens[label]) {
      const corrente = normalizzaHex(entry.value && entry.value.value);
      const target = normalizzaHex(rev2Tokens[label]);
      if (corrente !== target) {
        modifiche.push({ id, label, type: tipo, prima: corrente, dopo: target, valueObj: { $$type: 'color', value: target } });
      } else {
        invariate.push({ id, label, type: tipo, valore: corrente });
      }
      continue;
    }

    if (tipo === 'global-font-variable' && Object.prototype.hasOwnProperty.call(MAPPA_VARIABILI_FONT, label)) {
      const cssKey = MAPPA_VARIABILI_FONT[label];
      if (rev2Tokens[cssKey]) {
        const corrente = String((entry.value && entry.value.value) || '').trim();
        const target = estraiPrimoFont(rev2Tokens[cssKey]);
        if (target && corrente !== target) {
          modifiche.push({ id, label, type: tipo, prima: corrente, dopo: target, valueObj: { $$type: 'string', value: target } });
        } else {
          invariate.push({ id, label, type: tipo, valore: corrente });
        }
        continue;
      }
    }

    if (tipo === 'global-size-variable' && MAPPA_VARIABILI_SIZE.includes(label) && rev2Tokens[label]) {
      const curSize = entry.value && entry.value.value;
      const target = parseSizePx(rev2Tokens[label]);
      if (target && curSize && (Number(curSize.size) !== target.size || String(curSize.unit) !== target.unit)) {
        modifiche.push({
          id,
          label,
          type: tipo,
          prima: `${curSize.size}${curSize.unit}`,
          dopo: `${target.size}${target.unit}`,
          valueObj: { $$type: 'size', value: target },
        });
      } else {
        invariate.push({ id, label, type: tipo, valore: curSize ? `${curSize.size}${curSize.unit}` : '' });
      }
      continue;
    }

    nonMappate.push({ id, label, type: tipo });
  }

  return { modifiche, invariate, nonMappate };
}

function applicaDiffVariabiliKit(kitVarsObj, modifiche, timestampIso) {
  const clone = JSON.parse(JSON.stringify(kitVarsObj));
  const ts = timestampIso || new Date().toISOString().replace('T', ' ').slice(0, 19);
  for (const mod of modifiche) {
    if (!clone.data || !clone.data[mod.id]) continue;
    clone.data[mod.id].value = mod.valueObj;
    clone.data[mod.id].updated_at = ts;
  }
  if (modifiche.length > 0 && typeof clone.watermark === 'number') {
    clone.watermark += 1;
  }
  return clone;
}

// --- Parsing resiliente dei JSON di audit prodotti da audit-media -----------------------------------------------
function normalizzaVoceClasse(item) {
  if (!item) return null;
  if (typeof item === 'string') {
    return /^g-[a-z0-9]+$/i.test(item) ? { id: item, label: '' } : { id: '', label: item };
  }
  if (typeof item === 'object') {
    const id = String(item.id || item.class_id || item.global_class_id || '').trim();
    const label = String(item.label || item.name || item.nome || item.post_title || '').trim();
    if (!id && !label) return null;
    return {
      id,
      label,
      usata_da: item.usata_da || item.used_by || item.documenti || null,
      motivo: item.motivo || item.reason || item.stato || item.categoria || null,
    };
  }
  return null;
}

/**
 * Estrae l'elenco delle classi indicate come sicure/orfane da `fase9-audit-classi.json`.
 * Supporta le varianti di schema più naturali (array dedicato o elenco completo con flag/categoria).
 */
function estraiClassiSicureDaAudit(auditJson) {
  if (!auditJson || typeof auditJson !== 'object') {
    throw new Error('fase9-audit-classi.json non valido (atteso oggetto JSON).');
  }

  const chiaviDirette = [
    'classi_sicure_da_rimuovere_legacy',
    'sicure_da_rimuovere',
    'classi_sicure_da_rimuovere',
    'classi_sicure',
    'sicure',
    'orfane_sicure',
    'da_rimuovere',
    'rimovibili',
    'safe_to_delete',
    'safe_to_remove',
    'orphan_classes',
    'orfane',
  ];

  const contenitori = [
    auditJson,
    auditJson.categorie,
    auditJson.gruppi,
    auditJson.classi,
    auditJson.risultato,
    auditJson.riepilogo,
  ].filter((x) => x && typeof x === 'object' && !Array.isArray(x));

  for (const box of contenitori) {
    for (const k of chiaviDirette) {
      if (Array.isArray(box[k])) {
        return {
          sorgente: k,
          voci: box[k].map(normalizzaVoceClasse).filter(Boolean),
        };
      }
    }
  }

  // Fallback: array unico di classi con campo `categoria` / `stato` / `azione` / `sicura_da_rimuovere`.
  const elenco = Array.isArray(auditJson.classi)
    ? auditJson.classi
    : (Array.isArray(auditJson.tutte) ? auditJson.tutte : (Array.isArray(auditJson.items) ? auditJson.items : null));

  if (elenco) {
    const sicure = elenco.filter((x) => {
      if (!x || typeof x !== 'object') return false;
      if (x.sicura_da_rimuovere === true || x.safe_to_delete === true || x.rimovibile === true) return true;
      const cat = String(x.categoria || x.stato || x.azione || x.gruppo || '').toLowerCase();
      return /^(sicur|orfan|rimuov|legacy_sicur|legacy_orfan|safe_to_delete|delete)/.test(cat);
    });
    return {
      sorgente: 'filtro_elenco',
      voci: sicure.map(normalizzaVoceClasse).filter(Boolean),
    };
  }

  throw new Error(
    `Schema di fase9-audit-classi.json non riconosciuto. Chiavi top-level: ${Object.keys(auditJson).join(', ')}`
  );
}

function caricaSetClassiRev2() {
  const fromFile = fs.existsSync(FILE_CLASSI_REV2)
    ? JSON.parse(fs.readFileSync(FILE_CLASSI_REV2, 'utf8'))
    : [];
  return new Set([...fromFile, ...CLASSI_APPOGGIO_REV2]);
}

/**
 * Filtra le candidate da rimuovere con la guardia live:
 *  - risolve eventuale id mancante tramite la mappa kit labels (id -> label);
 *  - esclude classi già assenti sul kit (idempotenza);
 *  - BLOCCA qualsiasi classe con label nella lista rev2 o referenziata in `_elementor_data`
 *    di pagine pubblicate rev2, site part rev2, `[Riserva]` (539-541) o 6 bozze (152-154, 471, 472, 491).
 */
function validaClassiDaEliminare(candidate, kitLabelsById, usedInProtectedIds, rev2LabelSet) {
  const idByLabel = new Map();
  for (const [id, lbl] of Object.entries(kitLabelsById || {})) {
    idByLabel.set(String(lbl), id);
  }

  const approvate = [];
  const bloccate = [];
  const giaAssenti = [];
  const viste = new Set();

  for (const item of candidate) {
    let id = item.id;
    let label = item.label;
    if (!id && label && idByLabel.has(label)) {
      id = idByLabel.get(label);
    }
    if (id && !label && kitLabelsById && kitLabelsById[id]) {
      label = String(kitLabelsById[id]);
    }
    if (!id || !kitLabelsById || !Object.prototype.hasOwnProperty.call(kitLabelsById, id)) {
      giaAssenti.push({ id: id || '(n/d)', label: label || '(n/d)' });
      continue;
    }
    if (viste.has(id)) continue;
    viste.add(id);

    const actualLabel = String(kitLabelsById[id]);
    if (rev2LabelSet.has(actualLabel)) {
      bloccate.push({ id, label: actualLabel, motivo: 'classe rev2 protetta' });
      continue;
    }
    if (usedInProtectedIds.has(id)) {
      bloccate.push({ id, label: actualLabel, motivo: 'referenziata in documento protetto (rev2 / [Riserva] / bozza)' });
      continue;
    }

    approvate.push({ id, label: actualLabel });
  }

  return { approvate, bloccate, giaAssenti };
}

function leggiAuditFile(filePath, obbligatorio = true) {
  if (!fs.existsSync(filePath)) {
    if (obbligatorio) {
      throw new Error(`File di audit mancante: ${path.relative(root, filePath)} (eseguire prima audit-media).`);
    }
    return null;
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function assertNessunIdProtettoNelCestino() {
  const prot = new Set(ID_PROTETTI);
  for (const id of DA_CESTINARE_TUTTI) {
    if (prot.has(id)) {
      throw new Error(`GUARDIA VIOLATA: ID ${id} è contemporaneamente in DA_CESTINARE_TUTTI e ID_PROTETTI.`);
    }
  }
}

// --- Lettura stato live da dev3 (sola lettura) -------------------------------------------------------------------
async function leggiStatoLive(el, nv) {
  const [sitePartsResp, wpState] = await Promise.all([
    el.callJson('elementor-list-site-parts', {}),
    phpConDati(nv, String.raw`
      global $wpdb;
      $kit_id = (int) get_option('elementor_active_kit');
      $raw_vars = get_post_meta($kit_id, '_elementor_global_variables', true);
      $labels = get_post_meta($kit_id, '_elementor_global_classes_labels', true);
      $post_ids = get_post_meta($kit_id, '_elementor_global_classes_post_ids', true);
      $order = get_post_meta($kit_id, '_elementor_global_classes_order', true);
      $order_preview = get_post_meta($kit_id, '_elementor_global_classes_order_preview', true);
      $sync_v3 = get_post_meta($kit_id, '_elementor_global_classes_sync_to_v3', true);

      // Raccoglie tutte le classi globali (g-...) usate nei documenti protetti (rev2, [Riserva], 6 bozze).
      $used_in_protected = [];
      $protected_docs = [];
      foreach ($D['id_protetti'] as $pid) {
        $p = get_post((int) $pid);
        $raw = get_post_meta((int) $pid, '_elementor_data', true);
        $raw_s = is_string($raw) ? $raw : wp_json_encode($raw);
        $matches = [];
        if ($raw_s && preg_match_all('/\bg-[a-f0-9]{6,12}\b/i', $raw_s, $m)) {
          $matches = array_values(array_unique($m[0]));
          foreach ($matches as $cid) {
            $used_in_protected[$cid] = true;
          }
        }
        $protected_docs[$pid] = [
          'trovato' => (bool) $p,
          'post_type' => $p ? $p->post_type : null,
          'post_status' => $p ? $p->post_status : null,
          'post_title' => $p ? $p->post_title : null,
          'classi_usate' => count($matches),
        ];
      }

      // Stato dei post/template da cestinare (incluso _elementor_data raw per ripristino integrale dopo cleanup classi).
      $cestinare = [];
      foreach ($D['da_cestinare'] as $cid) {
        $p = get_post((int) $cid);
        $has_el_data = metadata_exists('post', (int) $cid, '_elementor_data');
        $raw_el_data = $has_el_data ? get_post_meta((int) $cid, '_elementor_data', true) : null;
        $cestinare[$cid] = [
          'trovato' => (bool) $p,
          'post_type' => $p ? $p->post_type : null,
          'post_status' => $p ? $p->post_status : null,
          'post_title' => $p ? $p->post_title : null,
          'post_name' => $p ? $p->post_name : null,
          'elementor_conditions' => get_post_meta((int) $cid, '_elementor_conditions', true),
          'has_elementor_data' => $has_el_data,
          'elementor_data' => is_string($raw_el_data) ? $raw_el_data : ($has_el_data ? wp_json_encode($raw_el_data) : null),
        ];
      }

      // Stato completo di tutti i menu e controllo uso dei menu filtri su documenti attivi (esclusi quelli da cestinare).
      $escludi = array_map('intval', $D['da_cestinare']);
      $menus = [];
      foreach (wp_get_nav_menus() as $m) {
        $items = [];
        foreach ((array) wp_get_nav_menu_items($m->term_id) as $it) {
          $items[] = [
            'id' => (int) $it->ID,
            'titolo' => (string) $it->title,
            'url' => (string) $it->url,
            'tipo' => (string) $it->type,
            'oggetto' => (string) $it->object,
            'oggetto_id' => (int) $it->object_id,
            'padre' => (int) $it->menu_item_parent,
            'classi' => array_values(array_filter((array) $it->classes, function ($c) { return $c !== ''; })),
            'posizione' => (int) $it->menu_order,
            'target' => (string) $it->target,
            'attr_title' => (string) $it->attr_title,
            'description' => (string) $it->description,
            'xfn' => (string) $it->xfn,
          ];
        }
        $menus[$m->slug] = [
          'term_id' => (int) $m->term_id,
          'nome' => (string) $m->name,
          'slug' => (string) $m->slug,
          'description' => (string) $m->description,
          'voci' => $items,
        ];
      }

      $uso_menu_filtri = [];
      foreach ($D['menu_filtri'] as $slug) {
        $usati = [];
        $like_slug = '%' . $wpdb->esc_like($slug) . '%';
        $rows = $wpdb->get_results($wpdb->prepare(
          "SELECT m.post_id, p.post_type, p.post_status, p.post_title
             FROM {$wpdb->postmeta} m
             JOIN {$wpdb->posts} p ON p.ID = m.post_id
            WHERE m.meta_key = '_elementor_data'
              AND p.post_type <> 'revision'
              AND p.post_status NOT IN ('trash', 'auto-draft')
              AND m.meta_value LIKE %s",
          $like_slug
        ));
        foreach ((array) $rows as $r) {
          $pid = (int) $r->post_id;
          if (in_array($pid, $escludi, true)) { continue; }
          $usati[] = ['id' => $pid, 'post_type' => $r->post_type, 'post_status' => $r->post_status, 'post_title' => $r->post_title];
        }
        $uso_menu_filtri[$slug] = $usati;
      }

      $opt_globale_exists = (false !== get_option('artes_rev2_globale', false));
      $opt_globale_val = get_option('artes_rev2_globale', null);
      $opt_cpt_val = get_option('artes_rev2_cpt', null);

      return [
        'versione_plugin' => defined('ARTES_CORE_VERSION') ? ARTES_CORE_VERSION : null,
        'kit_id' => $kit_id,
        'kit_raw_variables' => is_string($raw_vars) ? $raw_vars : wp_json_encode($raw_vars),
        'kit_labels' => is_array($labels) ? $labels : [],
        'kit_post_ids' => is_array($post_ids) ? $post_ids : [],
        'kit_order' => $order,
        'kit_order_preview' => $order_preview,
        'kit_sync_v3' => $sync_v3,
        'used_in_protected' => array_keys($used_in_protected),
        'protected_docs' => $protected_docs,
        'cestinare' => $cestinare,
        'menus' => $menus,
        'uso_menu_filtri' => $uso_menu_filtri,
        'opzioni' => [
          'artes_rev2_globale' => ['esiste' => $opt_globale_exists, 'valore' => $opt_globale_val],
          'artes_rev2_cpt' => $opt_cpt_val,
          'blog_public' => get_option('blog_public', null),
        ],
      ];
    `, {
      id_protetti: ID_PROTETTI,
      da_cestinare: DA_CESTINARE_TUTTI,
      menu_filtri: MENU_FILTRI_DA_ELIMINARE,
    }),
  ]);

  const sitePartsById = {};
  for (const sp of (sitePartsResp.result || [])) {
    sitePartsById[Number(sp.id)] = sp;
  }

  return { sitePartsById, wpState };
}

// --- Modalità --piano [--offline] --------------------------------------------------------------------------------
async function eseguiPiano(offline) {
  assertNessunIdProtettoNelCestino();
  const rev2Tokens = estraiTokenRev2();
  const rev2LabelSet = caricaSetClassiRev2();

  const auditClassi = leggiAuditFile(FILE_AUDIT_CLASSI, !offline);
  const auditKitMenu = leggiAuditFile(FILE_AUDIT_KIT_MENU, false);

  console.log('=== PIANO FASE 9 (CHIUSURA) — SOLA LETTURA ===');
  console.log(`Modalità: ${offline ? 'OFFLINE (locale)' : 'LIVE READ-ONLY (dev3)'}`);
  console.log(`Token :root estratti dalla rev2: ${Object.keys(rev2Tokens).length} (sand=${rev2Tokens.sand}, night=${rev2Tokens.night}, accent=${rev2Tokens.accent})`);
  console.log(`Audit classi:   ${auditClassi ? path.relative(root, FILE_AUDIT_CLASSI) : '(non ancora presente)'}`);
  console.log(`Audit kit/menu: ${auditKitMenu ? path.relative(root, FILE_AUDIT_KIT_MENU) : '(non ancora presente)'}`);

  if (offline) {
    // Usa snapshot locale backup-2026-11-19/kit.json se l'audit kit non c'è ancora.
    let kitVars = null;
    if (auditKitMenu && auditKitMenu.kit && auditKitMenu.kit.variables) {
      kitVars = auditKitMenu.kit.variables;
    } else {
      const snapKit = path.join(root, 'tools', 'out', 'backup-2026-11-19', 'kit.json');
      if (fs.existsSync(snapKit)) {
        const k = JSON.parse(fs.readFileSync(snapKit, 'utf8'));
        kitVars = JSON.parse(k.kit_meta._elementor_global_variables);
      }
    }
    if (kitVars) {
      const diff = calcolaDiffVariabiliKit(kitVars, rev2Tokens);
      console.log(`\n(a) Variabili Kit Elementor: ${diff.modifiche.length} da aggiornare, ${diff.invariate.length} già allineate, ${diff.nonMappate.length} non mappate (intatte):`);
      for (const m of diff.modifiche) {
        console.log(`    - ${m.label} (${m.id}): ${m.prima} -> ${m.dopo}`);
      }
    }
    console.log(`\n(b) Condizioni Theme Builder:`);
    console.log(`    - Header ${HEADER_REV2} e Footer ${FOOTER_REV2} -> ["include/general"]`);
    console.log(`    - Svuota condizioni vecchi template: ${DA_CESTINARE_TEMPLATE.join(', ')}`);
    console.log(`\n(c) Cestino reversibile (wp_trash_post, MAI force_delete): ${DA_CESTINARE_TUTTI.join(', ')}`);
    console.log(`    - Protetti e intatti: [Riserva] ${ID_RISERVA.join(', ')} | Bozze ${ID_BOZZE.join(', ')}`);
    console.log(`\n(d) Menu filtri da eliminare (previo backup): ${MENU_FILTRI_DA_ELIMINARE.join(', ')}`);
    if (auditClassi) {
      const estr = estraiClassiSicureDaAudit(auditClassi);
      console.log(`\n(e) Classi globali candidate da audit (${estr.sorgente}): ${estr.voci.length}`);
    } else {
      console.log(`\n(e) Classi globali: in attesa di ${path.relative(root, FILE_AUDIT_CLASSI)} (da audit-media).`);
    }
    console.log(`\n(f) Opzione artes_rev2_globale -> '1' + svuotamento cache Elementor/WP.`);
    return;
  }

  const el = await connetti('elementor');
  const nv = await connetti('novamira');
  const { sitePartsById, wpState } = await leggiStatoLive(el, nv);

  const kitVars = JSON.parse(wpState.kit_raw_variables || '{}');
  const diffKit = calcolaDiffVariabiliKit(kitVars, rev2Tokens);
  console.log(`\nPlugin artes-core su dev3: ${wpState.versione_plugin || 'non attivo'} (atteso 0.9.0 prima di --esegui)`);
  console.log(`Kit attivo: ID ${wpState.kit_id}`);

  console.log(`\n(a) Variabili Kit Elementor: ${diffKit.modifiche.length} da aggiornare, ${diffKit.invariate.length} già allineate, ${diffKit.nonMappate.length} non mappate (intatte):`);
  for (const m of diffKit.modifiche) {
    console.log(`    - ${m.label} (${m.id}): ${m.prima} -> ${m.dopo}`);
  }

  console.log(`\n(b) Condizioni Theme Builder:`);
  for (const id of [HEADER_REV2, FOOTER_REV2]) {
    const sp = sitePartsById[id];
    console.log(`    - ${id} (${sp ? sp.title : '?'}): ${JSON.stringify(sp ? sp.conditions : [])} -> ["include/general"]`);
  }
  for (const id of DA_CESTINARE_TEMPLATE) {
    const sp = sitePartsById[id];
    console.log(`    - ${id} (${sp ? sp.title : '?'}, status=${sp ? sp.post_status : '?'}): ${JSON.stringify(sp ? sp.conditions : [])} -> []`);
  }

  console.log(`\n(c) Cestino reversibile (wp_trash_post, MAI force_delete):`);
  for (const id of DA_CESTINARE_TUTTI) {
    const info = wpState.cestinare[id] || {};
    const azione = !info.trovato ? 'NON TROVATO' : (info.post_status === 'trash' ? 'già nel cestino' : `${info.post_status} -> trash`);
    console.log(`    - ${String(id).padEnd(4)} [${info.post_type || '?'}] ${info.post_title || '?'} :: ${azione}`);
  }
  console.log(`    - Verifica protetti intatti: [Riserva] ${ID_RISERVA.map((id) => `${id}:${wpState.protected_docs[id]?.post_status}`).join(', ')} | Bozze ${ID_BOZZE.map((id) => `${id}:${wpState.protected_docs[id]?.post_status}`).join(', ')}`);

  console.log(`\n(d) Menu filtri da eliminare (previo backup):`);
  for (const slug of MENU_FILTRI_DA_ELIMINARE) {
    const m = wpState.menus[slug];
    const usati = wpState.uso_menu_filtri[slug] || [];
    if (!m) {
      console.log(`    - ${slug}: già assente`);
    } else {
      console.log(`    - ${slug} (term_id=${m.term_id}, ${m.voci.length} voci): ${usati.length ? 'ATTENZIONE USATO DA ' + JSON.stringify(usati) : 'nessun uso attivo -> OK eliminare'}`);
    }
  }

  const estr = estraiClassiSicureDaAudit(auditClassi);
  const usedSet = new Set(wpState.used_in_protected || []);
  const val = validaClassiDaEliminare(estr.voci, wpState.kit_labels, usedSet, rev2LabelSet);
  console.log(`\n(e) Classi globali Elementor (totale attuali su dev3: ${Object.keys(wpState.kit_labels || {}).length}):`);
  console.log(`    - Candidate da audit (${estr.sorgente}): ${estr.voci.length}`);
  console.log(`    - Approvate dopo guardia live:          ${val.approvate.length}`);
  console.log(`    - Già assenti (idempotenza):            ${val.giaAssenti.length}`);
  console.log(`    - BLOCCATE dalla guardia live:          ${val.bloccate.length}`);
  if (val.bloccate.length) {
    for (const b of val.bloccate.slice(0, 20)) {
      console.log(`      ! BLOCCATA ${b.id} (${b.label}): ${b.motivo}`);
    }
  }
  if (val.approvate.length) {
    console.log(`    - Campione approvate (prime 15): ${val.approvate.slice(0, 15).map((c) => `${c.label}(${c.id})`).join(', ')}`);
  }

  console.log(`\n(f) Opzione artes_rev2_globale: ${wpState.opzioni.artes_rev2_globale.esiste ? JSON.stringify(wpState.opzioni.artes_rev2_globale.valore) : '(assente)'} -> "1" + flush cache.`);
  console.log(`    Backup di sicurezza verrà scritto in: ${path.relative(root, FILE_BACKUP_DEFAULT)}`);
}

// --- Modalità --esegui -------------------------------------------------------------------------------------------
async function eseguiChiusura(forzaBackup) {
  assertNessunIdProtettoNelCestino();
  fs.mkdirSync(outDir, { recursive: true });

  const auditClassi = leggiAuditFile(FILE_AUDIT_CLASSI, true);
  leggiAuditFile(FILE_AUDIT_KIT_MENU, false); // verificato opzionalmente se presente

  const rev2Tokens = estraiTokenRev2();
  const rev2LabelSet = caricaSetClassiRev2();

  const el = await connetti('elementor');
  const nv = await connetti('novamira');
  const { sitePartsById, wpState } = await leggiStatoLive(el, nv);

  // Controllo sicurezza sui menu: non eliminare un menu ancora referenziato da un documento attivo.
  for (const slug of MENU_FILTRI_DA_ELIMINARE) {
    const usati = wpState.uso_menu_filtri[slug] || [];
    if (usati.length > 0) {
      throw new Error(`BLOCCO SICUREZZA: il menu '${slug}' è ancora referenziato da documenti attivi: ${JSON.stringify(usati)}`);
    }
  }

  // Calcola diff variabili Kit e classi da eliminare con guardia live.
  const kitVarsPrima = JSON.parse(wpState.kit_raw_variables || '{}');
  const diffKit = calcolaDiffVariabiliKit(kitVarsPrima, rev2Tokens);

  const estr = estraiClassiSicureDaAudit(auditClassi);
  const usedSet = new Set(wpState.used_in_protected || []);
  const valClassi = validaClassiDaEliminare(estr.voci, wpState.kit_labels, usedSet, rev2LabelSet);

  // 0. Backup integrale prima di qualsiasi scrittura (non sovrascrive un backup pre-esistente a meno di --forza-backup).
  if (!fs.existsSync(FILE_BACKUP_DEFAULT) || forzaBackup) {
    const idsClassiBackup = valClassi.approvate.map((c) => c.id);
    const classiDettaglio = idsClassiBackup.length
      ? await phpConDati(nv, String.raw`
          global $wpdb;
          $kit_id = (int) $D['kit_id'];
          $post_ids = get_post_meta($kit_id, '_elementor_global_classes_post_ids', true);
          $post_ids = is_array($post_ids) ? $post_ids : [];
          $out = [];
          foreach ($D['class_ids'] as $cid) {
            $pid = isset($post_ids[$cid]) ? (int) $post_ids[$cid] : 0;
            $post_row = $pid ? $wpdb->get_row($wpdb->prepare(
              "SELECT ID, post_name, post_title, post_status, post_content, post_excerpt, menu_order FROM {$wpdb->posts} WHERE ID = %d",
              $pid
            ), ARRAY_A) : null;
            $metas = [];
            if ($pid) {
              $mrows = $wpdb->get_results($wpdb->prepare(
                "SELECT meta_key, meta_value FROM {$wpdb->postmeta} WHERE post_id = %d ORDER BY meta_id",
                $pid
              ), ARRAY_A);
              foreach ((array) $mrows as $mr) {
                $metas[] = ['meta_key' => $mr['meta_key'], 'meta_value' => $mr['meta_value']];
              }
            }
            $out[$cid] = [
              'class_id' => $cid,
              'label' => $D['labels'][$cid] ?? null,
              'post_id' => $pid,
              'post' => $post_row,
              'meta' => $metas,
            ];
          }
          return $out;
        `, { kit_id: wpState.kit_id, class_ids: idsClassiBackup, labels: wpState.kit_labels })
      : {};

    const sitePartsBackup = {};
    for (const id of [HEADER_REV2, FOOTER_REV2, ...DA_CESTINARE_TEMPLATE]) {
      const sp = sitePartsById[id];
      const postInfo = wpState.cestinare[id];
      sitePartsBackup[id] = {
        id,
        title: sp ? sp.title : (postInfo ? postInfo.post_title : null),
        type: sp ? sp.type : null,
        post_status: sp ? sp.post_status : (postInfo ? postInfo.post_status : null),
        conditions: sp ? (sp.conditions || []) : (Array.isArray(postInfo?.elementor_conditions) ? postInfo.elementor_conditions : []),
      };
    }

    const menuBackup = {};
    for (const slug of MENU_FILTRI_DA_ELIMINARE) {
      if (wpState.menus[slug]) {
        menuBackup[slug] = wpState.menus[slug];
      }
    }

    const backup = {
      creato_il: new Date().toISOString(),
      versione_plugin_prima: wpState.versione_plugin,
      kit: {
        kit_id: wpState.kit_id,
        raw_global_variables: wpState.kit_raw_variables,
        diff_applicato: diffKit.modifiche.map(({ id, label, prima, dopo }) => ({ id, label, prima, dopo })),
      },
      site_parts: sitePartsBackup,
      cestinati: wpState.cestinare,
      menu: menuBackup,
      classi: {
        kit_id: wpState.kit_id,
        kit_labels: wpState.kit_labels,
        kit_post_ids: wpState.kit_post_ids,
        kit_order: wpState.kit_order,
        kit_order_preview: wpState.kit_order_preview,
        kit_sync_v3: wpState.kit_sync_v3,
        eliminate: classiDettaglio,
      },
      opzioni: {
        artes_rev2_globale: wpState.opzioni.artes_rev2_globale,
      },
    };
    fs.writeFileSync(FILE_BACKUP_DEFAULT, JSON.stringify(backup, null, 2));
    console.log(`0. Backup salvato in ${path.relative(root, FILE_BACKUP_DEFAULT)}`);
  } else {
    console.log(`0. Backup già presente (${path.relative(root, FILE_BACKUP_DEFAULT)}): preservato (usa --forza-backup per sovrascrivere).`);
  }

  // (a) Aggiorna le variabili globali del Kit Elementor attivo alla palette/font rev2 via MCP ufficiale.
  if (diffKit.modifiche.length > 0) {
    const opsVar = diffKit.modifiche.map((m) => ({
      action: 'update',
      id: m.id,
      label: m.label,
      value: m.dopo,
    }));
    const rVar = await el.callJson('elementor-manage-global-variable', { operations: opsVar });
    const fallite = (rVar.results || []).filter((x) => x.status !== 'ok' && x.status !== 'updated' && !x.success);
    if (fallite.length) {
      throw new Error('Aggiornamento variabili Kit fallito: ' + JSON.stringify(fallite));
    }
    console.log(`(a) Variabili Kit ${wpState.kit_id} aggiornate via MCP (${diffKit.modifiche.length}): ` +
      diffKit.modifiche.map((m) => `${m.label}: ${m.prima}->${m.dopo}`).join(', '));
  } else {
    console.log(`(a) Variabili Kit ${wpState.kit_id}: già allineate alla rev2 (0 modifiche).`);
  }

  // (b) Svuota realmente le condizioni dei vecchi template via Conditions_Manager::save_conditions($id, [])
  //     (elementor-manage-site-parts con [] normalizzerebbe in ['include/general']!) e porta Header 557 / Footer 971 a include/general.
  const idsClearOld = DA_CESTINARE_TEMPLATE.filter((id) => {
    const sp = sitePartsById[id];
    const condMeta = wpState.cestinare[id]?.elementor_conditions;
    return (sp && Array.isArray(sp.conditions) && sp.conditions.length > 0)
      || (Array.isArray(condMeta) && condMeta.length > 0);
  });
  if (idsClearOld.length > 0) {
    const rOld = await svuotaCondizioniSiteParts(nv, idsClearOld);
    const nonVuote = Object.entries(rOld).filter(([, info]) => Array.isArray(info.condizioni_residue) && info.condizioni_residue.length > 0);
    console.log('(b1) Condizioni vecchi template svuotate via Conditions_Manager:',
      Object.entries(rOld).map(([id, info]) => `${id}:${info.condizioni_residue.length === 0 ? 'ok([])' : 'RESIDUO'}`).join(' '));
    if (nonVuote.length) {
      throw new Error('Impossibile svuotare condizioni vecchi template: ' + JSON.stringify(nonVuote));
    }
  } else {
    console.log('(b1) Condizioni vecchi template: già vuote.');
  }

  const rNew = await el.callJson('elementor-manage-site-parts', {
    operations: [
      { action: 'update', post_id: HEADER_REV2, conditions: ['include/general'] },
      { action: 'update', post_id: FOOTER_REV2, conditions: ['include/general'] },
    ],
  });
  const conflitti = (rNew.results || []).filter((x) => x.conflicts && x.conflicts.length);
  console.log('(b2) Condizioni Header 557 / Footer 971 -> include/general:',
    (rNew.results || []).map((x) => `${x.id || x.post_id}:${x.status}${x.conflicts?.length ? ' CONFLITTI ' + JSON.stringify(x.conflicts) : ''}`).join(' '));
  if (conflitti.length) {
    throw new Error('Conflitti Theme Builder su Header 557 / Footer 971: ' + JSON.stringify(conflitti));
  }

  // (c) Sposta nel cestino (wp_trash_post, MAI force_delete) la pagina 542 e i vecchi template 199, 200, 138, 448, 213, 447.
  const resTrash = await phpConDati(nv, String.raw`
    $out = [];
    foreach ($D['ids'] as $id) {
      $id = (int) $id;
      $p = get_post($id);
      if (!$p) { $out[$id] = ['esito' => 'non_trovato']; continue; }
      $prima = $p->post_status;
      if ($prima === 'trash') {
        $out[$id] = ['esito' => 'gia_nel_cestino', 'prima' => $prima, 'dopo' => 'trash'];
        continue;
      }
      $r = wp_trash_post($id);
      $out[$id] = ['esito' => $r ? 'cestinato' : 'errore', 'prima' => $prima, 'dopo' => get_post_status($id)];
    }
    return $out;
  `, { ids: DA_CESTINARE_TUTTI });
  console.log('(c) Cestino reversibile:',
    Object.entries(resTrash).map(([id, r]) => `${id}:${r.esito}(${r.prima || '?'}->${r.dopo || '?'})`).join(' '));

  // (d) Elimina i menu dei filtri non più usati (filtri-realizzazioni, filtri-brand).
  const resMenu = await phpConDati(nv, String.raw`
    $out = [];
    foreach ($D['slugs'] as $slug) {
      $m = wp_get_nav_menu_object($slug);
      if (!$m) { $out[$slug] = 'gia_assente'; continue; }
      $r = wp_delete_nav_menu($m->term_id);
      $out[$slug] = is_wp_error($r) ? ('errore: ' . $r->get_error_message()) : ($r ? 'eliminato' : 'errore');
    }
    return $out;
  `, { slugs: MENU_FILTRI_DA_ELIMINARE });
  console.log('(d) Menu filtri:', JSON.stringify(resMenu));

  // (e) Elimina le sole classi globali sicure/orfane approvate dalla guardia live (lotti da 25 via Elementor MCP).
  let classiEliminate = 0;
  const erroriClassi = [];
  if (valClassi.bloccate.length) {
    console.log(`(e) GUARDIA LIVE: ${valClassi.bloccate.length} classi bloccate e NON eliminate:`,
      valClassi.bloccate.map((b) => `${b.label}(${b.id}): ${b.motivo}`).join('; '));
  }
  for (let i = 0; i < valClassi.approvate.length; i += BATCH_CLASSI) {
    const lotto = valClassi.approvate.slice(i, i + BATCH_CLASSI);
    const r = await el.callJson('elementor-manage-classes', {
      operations: lotto.map((c) => ({ action: 'delete', id: c.id })),
    });
    for (const x of (r.results || [])) {
      if (x.status === 'ok' || x.status === 'deleted' || x.success) {
        classiEliminate++;
      } else {
        erroriClassi.push(x);
      }
    }
    console.log(`(e) Classi globali lotto ${Math.floor(i / BATCH_CLASSI) + 1}: processate ${Math.min(i + BATCH_CLASSI, valClassi.approvate.length)}/${valClassi.approvate.length}`);
  }
  console.log(`(e) Totale classi globali eliminate: ${classiEliminate}/${valClassi.approvate.length} (già assenti: ${valClassi.giaAssenti.length}, errori: ${erroriClassi.length})`);
  if (erroriClassi.length) {
    console.error('    Errori classi (prime 5):', JSON.stringify(erroriClassi.slice(0, 5)));
  }

  // (f) Accende artes_rev2_globale = '1' e svuota le cache Elementor + WP.
  const resOpt = await phpConDati(nv, String.raw`
    update_option('artes_rev2_globale', '1', true);
    if (class_exists('\Elementor\Plugin')) {
      \Elementor\Plugin::$instance->files_manager->clear_cache();
    }
    wp_cache_flush();
    return [
      'artes_rev2_globale' => get_option('artes_rev2_globale'),
      'artes_rev2_cpt' => get_option('artes_rev2_cpt'),
      'versione_plugin' => defined('ARTES_CORE_VERSION') ? ARTES_CORE_VERSION : null,
      'classi_residue' => count((array) get_post_meta((int) get_option('elementor_active_kit'), '_elementor_global_classes_labels', true)),
    ];
  `, {});
  await el.call('elementor-clear-cache', {});
  console.log('(f) Opzione artes_rev2_globale=1 e cache svuotate:', JSON.stringify(resOpt));

  if (erroriClassi.length) process.exit(1);
}

// --- Modalità --stato --------------------------------------------------------------------------------------------
async function eseguiStato() {
  const el = await connetti('elementor');
  const nv = await connetti('novamira');
  const { sitePartsById, wpState } = await leggiStatoLive(el, nv);
  const rev2Tokens = estraiTokenRev2();
  const kitVars = JSON.parse(wpState.kit_raw_variables || '{}');
  const diffKit = calcolaDiffVariabiliKit(kitVars, rev2Tokens);

  console.log('=== STATO FASE 9 SU DEV3 ===');
  console.log(`Plugin artes-core:      ${wpState.versione_plugin || 'non attivo'}`);
  console.log(`artes_rev2_globale:     ${wpState.opzioni.artes_rev2_globale.esiste ? JSON.stringify(wpState.opzioni.artes_rev2_globale.valore) : '(non impostata, default 1 in 0.9.0)'}`);
  console.log(`artes_rev2_cpt:         ${JSON.stringify(wpState.opzioni.artes_rev2_cpt)}`);
  console.log(`blog_public:            ${JSON.stringify(wpState.opzioni.blog_public)}`);
  console.log(`Backup fase9:           ${fs.existsSync(FILE_BACKUP_DEFAULT) ? path.relative(root, FILE_BACKUP_DEFAULT) : '(non ancora creato)'}`);
  console.log(`Classi globali attuali: ${Object.keys(wpState.kit_labels || {}).length}`);
  console.log(`Variabili Kit ${wpState.kit_id}:        ${diffKit.modifiche.length === 0 ? 'ALLINEATE alla rev2' : diffKit.modifiche.length + ' differenze: ' + diffKit.modifiche.map((m) => `${m.label}=${m.prima} (atteso ${m.dopo})`).join(', ')}`);

  console.log('\nSite part attivi rev2:');
  for (const id of SITE_PARTS_REV2) {
    const sp = sitePartsById[id];
    console.log(`  ${String(id).padEnd(4)} | ${(sp ? sp.type : '?').padEnd(8)} | ${(sp ? sp.post_status : '?').padEnd(7)} | ${JSON.stringify(sp ? sp.conditions : [])} | ${sp ? sp.title : '?'}`);
  }

  console.log('\nElementi fase 9 (542 + template vecchi):');
  for (const id of DA_CESTINARE_TUTTI) {
    const info = wpState.cestinare[id] || {};
    console.log(`  ${String(id).padEnd(4)} | ${(info.post_type || '?').padEnd(17)} | ${(info.post_status || '?').padEnd(7)} | ${info.post_title || '?'}`);
  }

  console.log('\nElementi protetti ([Riserva] 539-541 + 6 bozze):');
  for (const id of [...ID_RISERVA, ...ID_BOZZE]) {
    const info = wpState.protected_docs[id] || {};
    console.log(`  ${String(id).padEnd(4)} | ${(info.post_type || '?').padEnd(17)} | ${(info.post_status || '?').padEnd(7)} | classi=${info.classi_usate || 0} | ${info.post_title || '?'}`);
  }

  console.log('\nMenu WordPress:');
  for (const m of Object.values(wpState.menus || {})) {
    console.log(`  ${String(m.term_id).padEnd(4)} | ${m.slug.padEnd(24)} | ${m.voci.length} voci | ${m.nome}`);
  }
}

// --- Modalità --rollback [file] ----------------------------------------------------------------------------------
async function eseguiRollback(fileArg) {
  const backupFile = fileArg ? path.resolve(root, fileArg) : FILE_BACKUP_DEFAULT;
  if (!fs.existsSync(backupFile)) {
    throw new Error(`File di backup non trovato: ${backupFile}`);
  }
  const bk = JSON.parse(fs.readFileSync(backupFile, 'utf8'));
  const el = await connetti('elementor');
  const nv = await connetti('novamira');

  console.log(`=== ROLLBACK FASE 9 DA ${path.relative(root, backupFile)} (creato ${bk.creato_il}) ===`);

  // 1. Ripristina variabili Kit via MCP ufficiale (se presenti nel diff; fallback raw in PHP se mancasse).
  const diffApplicato = (bk.kit && Array.isArray(bk.kit.diff_applicato)) ? bk.kit.diff_applicato : [];
  let kitRipristinatoViaMcp = false;
  if (diffApplicato.length > 0) {
    const opsVarRb = diffApplicato.map((m) => ({
      action: 'update',
      id: m.id,
      label: m.label,
      value: m.prima,
    }));
    const rVarRb = await el.callJson('elementor-manage-global-variable', { operations: opsVarRb });
    const fallite = (rVarRb.results || []).filter((x) => x.status !== 'ok' && x.status !== 'updated' && !x.success);
    if (!fallite.length) {
      kitRipristinatoViaMcp = true;
      console.log('1a. Variabili Kit ripristinate via MCP:', diffApplicato.map((m) => `${m.label}->${m.prima}`).join(', '));
    }
  }

  // 1b. Ripristina opzione artes_rev2_globale, cestino (untrash + status + _elementor_data raw), menu e classi globali.
  const resWp = await phpConDati(nv, String.raw`
    global $wpdb;
    $out = ['opzione' => null, 'kit' => null, 'untrash' => [], 'elementor_data_ripristinati' => 0, 'menu' => [], 'classi_ripristinate' => 0];

    // Opzione artes_rev2_globale
    $opt = $D['bk']['opzioni']['artes_rev2_globale'] ?? null;
    if ($opt && !empty($opt['esiste'])) {
      update_option('artes_rev2_globale', $opt['valore'], true);
      $out['opzione'] = 'ripristinata';
    } else {
      delete_option('artes_rev2_globale');
      $out['opzione'] = 'eliminata';
    }

    // Fallback raw variabili Kit (solo se non già ripristinate via MCP)
    if (empty($D['kit_mcp_ok']) && !empty($D['bk']['kit']['kit_id']) && isset($D['bk']['kit']['raw_global_variables'])) {
      $kit_id = (int) $D['bk']['kit']['kit_id'];
      update_post_meta($kit_id, '_elementor_global_variables', wp_slash((string) $D['bk']['kit']['raw_global_variables']));
      $out['kit'] = 'ripristinato_raw';
    } else {
      $out['kit'] = 'ripristinato_mcp';
    }

    // Untrash 542 e vecchi template + ripristino status originale + ripristino _elementor_data raw
    // (necessario perché elementor-manage-classes delete esegue cleanup rimuovendo i g-* anche dai post nel cestino).
    foreach (($D['bk']['cestinati'] ?? []) as $id => $info) {
      $id = (int) $id;
      if (empty($info['trovato'])) { continue; }
      $p = get_post($id);
      if (!$p) { $out['untrash'][$id] = 'mancante'; continue; }
      if ($p->post_status === 'trash' && $info['post_status'] !== 'trash') {
        wp_untrash_post($id);
      }
      if (get_post_status($id) !== $info['post_status']) {
        wp_update_post(['ID' => $id, 'post_status' => $info['post_status']]);
      }
      if (!empty($info['has_elementor_data']) && isset($info['elementor_data'])) {
        update_post_meta($id, '_elementor_data', wp_slash((string) $info['elementor_data']));
        $out['elementor_data_ripristinati']++;
      }
      $out['untrash'][$id] = get_post_status($id);
    }

    // Ripristino menu dei filtri eliminati
    foreach (($D['bk']['menu'] ?? []) as $slug => $m) {
      $existing = wp_get_nav_menu_object($slug);
      if ($existing) {
        $out['menu'][$slug] = 'gia_presente';
        continue;
      }
      $menu_id = wp_create_nav_menu($m['nome']);
      if (is_wp_error($menu_id)) {
        $out['menu'][$slug] = 'errore: ' . $menu_id->get_error_message();
        continue;
      }
      wp_update_term($menu_id, 'nav_menu', ['slug' => $slug, 'description' => (string) ($m['description'] ?? '')]);
      $id_map = [];
      $voci = $m['voci'] ?? [];
      usort($voci, function ($a, $b) { return ((int) $a['posizione']) - ((int) $b['posizione']); });
      foreach ($voci as $it) {
        $parent_new = 0;
        if (!empty($it['padre']) && isset($id_map[$it['padre']])) {
          $parent_new = $id_map[$it['padre']];
        }
        $args = [
          'menu-item-title' => $it['titolo'],
          'menu-item-type' => $it['tipo'],
          'menu-item-object' => $it['oggetto'],
          'menu-item-object-id' => ($it['tipo'] === 'custom') ? 0 : (int) $it['oggetto_id'],
          'menu-item-url' => $it['url'],
          'menu-item-parent-id' => $parent_new,
          'menu-item-position' => (int) $it['posizione'],
          'menu-item-classes' => implode(' ', (array) ($it['classi'] ?? [])),
          'menu-item-target' => (string) ($it['target'] ?? ''),
          'menu-item-attr-title' => (string) ($it['attr_title'] ?? ''),
          'menu-item-description' => (string) ($it['description'] ?? ''),
          'menu-item-xfn' => (string) ($it['xfn'] ?? ''),
          'menu-item-status' => 'publish',
        ];
        $new_item_id = wp_update_nav_menu_item($menu_id, 0, $args);
        if (!is_wp_error($new_item_id)) {
          $id_map[$it['id']] = (int) $new_item_id;
        }
      }
      $out['menu'][$slug] = 'ripristinato (' . count($id_map) . ' voci)';
    }

    // Ripristino classi globali Elementor eliminate: aggiorna $cur_post_ids / $cur_labels SOLO con i post effettivamente ricreati o esistenti.
    $cl = $D['bk']['classi'] ?? null;
    if ($cl && !empty($cl['kit_id']) && !empty($cl['eliminate'])) {
      $kit_id = (int) $cl['kit_id'];
      $cur_post_ids = get_post_meta($kit_id, '_elementor_global_classes_post_ids', true);
      $cur_post_ids = is_array($cur_post_ids) ? $cur_post_ids : [];
      $cur_labels = get_post_meta($kit_id, '_elementor_global_classes_labels', true);
      $cur_labels = is_array($cur_labels) ? $cur_labels : [];

      foreach ($cl['eliminate'] as $cid => $entry) {
        if (!empty($cur_post_ids[$cid]) && get_post((int) $cur_post_ids[$cid])) {
          if (!isset($cur_labels[$cid]) && isset($entry['label'])) {
            $cur_labels[$cid] = (string) $entry['label'];
          }
          continue;
        }
        $pr = $entry['post'] ?? null;
        if (!$pr) { continue; }
        $new_pid = wp_insert_post([
          'post_type' => 'e_global_class',
          'post_name' => $pr['post_name'],
          'post_title' => $pr['post_title'],
          'post_status' => $pr['post_status'] ?: 'publish',
          'post_content' => $pr['post_content'] ?? '',
          'post_excerpt' => $pr['post_excerpt'] ?? '',
          'menu_order' => (int) ($pr['menu_order'] ?? 0),
        ], true);
        if (is_wp_error($new_pid) || !$new_pid) { continue; }
        foreach (($entry['meta'] ?? []) as $mr) {
          // Scrive il valore raw in postmeta per preservare esattamente i dati serializzati di Elementor.
          $wpdb->insert(
            $wpdb->postmeta,
            ['post_id' => (int) $new_pid, 'meta_key' => $mr['meta_key'], 'meta_value' => $mr['meta_value']],
            ['%d', '%s', '%s']
          );
        }
        $cur_post_ids[$cid] = (int) $new_pid;
        if (isset($entry['label'])) {
          $cur_labels[$cid] = (string) $entry['label'];
        }
        $out['classi_ripristinate']++;
      }

      update_post_meta($kit_id, '_elementor_global_classes_post_ids', $cur_post_ids);
      update_post_meta($kit_id, '_elementor_global_classes_labels', $cur_labels);

      $filtra_ordine = function ($ord) use ($cur_post_ids) {
        if (!is_array($ord) || !isset($ord['order']) || !is_array($ord['order'])) { return null; }
        $valid = array_values(array_filter($ord['order'], function ($cid) use ($cur_post_ids) {
          return isset($cur_post_ids[$cid]);
        }));
        foreach (array_keys($cur_post_ids) as $cid) {
          if (!in_array($cid, $valid, true)) { $valid[] = $cid; }
        }
        return ['order' => $valid];
      };
      if (isset($cl['kit_order']) && ($o = $filtra_ordine($cl['kit_order']))) {
        update_post_meta($kit_id, '_elementor_global_classes_order', $o);
      }
      if (isset($cl['kit_order_preview']) && ($op = $filtra_ordine($cl['kit_order_preview']))) {
        update_post_meta($kit_id, '_elementor_global_classes_order_preview', $op);
      }
      if (isset($cl['kit_sync_v3'])) {
        update_post_meta($kit_id, '_elementor_global_classes_sync_to_v3', $cl['kit_sync_v3']);
      }
    }

    return $out;
  `, { bk, kit_mcp_ok: kitRipristinatoViaMcp });
  console.log('1b. Ripristino WP/Kit/Classi/Menu:', JSON.stringify(resWp));

  // 2. Ripristina le condizioni originali dei site part:
  //    - prima 557/971 (così liberano include/general), poi i vecchi template con condizioni non vuote;
  //    - per eventuali site part con condizioni originariamente vuote ([]), usa Conditions_Manager::save_conditions($id, []).
  const opsRev2 = [];
  const opsVecchi = [];
  const idsVuoti = [];
  for (const id of [HEADER_REV2, FOOTER_REV2, ...DA_CESTINARE_TEMPLATE]) {
    const sp = bk.site_parts && bk.site_parts[String(id)];
    if (!sp || !Array.isArray(sp.conditions)) continue;
    if (sp.conditions.length === 0) {
      idsVuoti.push(id);
    } else if (id === HEADER_REV2 || id === FOOTER_REV2) {
      opsRev2.push({ action: 'update', post_id: id, conditions: sp.conditions });
    } else {
      opsVecchi.push({ action: 'update', post_id: id, conditions: sp.conditions });
    }
  }
  if (idsVuoti.length) {
    const rVuoti = await svuotaCondizioniSiteParts(nv, idsVuoti);
    console.log('2a. Condizioni vuote ripristinate via Conditions_Manager:', JSON.stringify(rVuoti));
  }
  if (opsRev2.length) {
    const rSp1 = await el.callJson('elementor-manage-site-parts', { operations: opsRev2 });
    console.log('2b. Condizioni 557/971 ripristinate:', (rSp1.results || []).map((x) => `${x.id || x.post_id}:${x.status}`).join(' '));
  }
  if (opsVecchi.length) {
    const rSp2 = await el.callJson('elementor-manage-site-parts', { operations: opsVecchi });
    console.log('2c. Condizioni vecchi template ripristinate:', (rSp2.results || []).map((x) => `${x.id || x.post_id}:${x.status}`).join(' '));
  }

  // 3. Svuota cache Elementor e WP.
  await el.call('elementor-clear-cache', {});
  await nv.php(`if (class_exists('\\Elementor\\Plugin')) { \\Elementor\\Plugin::$instance->files_manager->clear_cache(); } wp_cache_flush(); return true;`);
  console.log('3. Cache Elementor e WP svuotate. Rollback completato.');
}

// --- CLI ---------------------------------------------------------------------------------------------------------
if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.includes('--piano')) {
    eseguiPiano(args.includes('--offline')).catch((e) => { console.error(e.message); process.exit(1); });
  } else if (args.includes('--esegui')) {
    eseguiChiusura(args.includes('--forza-backup')).catch((e) => { console.error(e.message); process.exit(1); });
  } else if (args.includes('--stato')) {
    eseguiStato().catch((e) => { console.error(e.message); process.exit(1); });
  } else if (args.includes('--rollback')) {
    const idx = args.indexOf('--rollback');
    const fileArg = args[idx + 1] && !args[idx + 1].startsWith('--') ? args[idx + 1] : '';
    eseguiRollback(fileArg).catch((e) => { console.error(e.message); process.exit(1); });
  } else {
    console.error('uso: fase9-chiusura.js --piano [--offline] | --esegui [--forza-backup] | --stato | --rollback [file]');
    process.exit(2);
  }
}

module.exports = {
  estraiTokenRev2,
  calcolaDiffVariabiliKit,
  applicaDiffVariabiliKit,
  estraiClassiSicureDaAudit,
  validaClassiDaEliminare,
  DA_CESTINARE_TUTTI,
  DA_CESTINARE_TEMPLATE,
  ID_RISERVA,
  ID_BOZZE,
  ID_PROTETTI,
  MENU_FILTRI_DA_ELIMINARE,
};
