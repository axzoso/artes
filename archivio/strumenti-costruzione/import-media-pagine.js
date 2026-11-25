'use strict';
// Crea su dev3 le copie fisiche degli allegati per le PAGINE STATICHE (fase 5) dove lo stesso file immagine compare
// con un testo alternativo (alt) diverso da quello dell'allegato base in media-rev2.json.
// Regola identica alla fase 3 (docs/wp-stato-dev3.md §3): una copia per ogni coppia (file, alt), lingua WPML `it`,
// idempotente via meta `_artes_src` = `rev2:<src>#p-<hash8>`. Scrive `tools/out/rev2/media-pagine.json` (`{ "<src>|<alt>": id }`).
//   node tools/rev2/import-media-pagine.js [--prova]
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { parse, trova, classi } = require('./html-parse');
const { connetti } = require('./mcp-client');

const root = path.resolve(__dirname, '..', '..');
const rev2 = path.join(root, 'artes-sito-rev2');
const MEDIA = JSON.parse(fs.readFileSync(path.join(root, 'tools', 'out', 'rev2', 'media-rev2.json'), 'utf8'));
const prova = process.argv.includes('--prova');

const PAGINE = [
  'index.html',
  'arredamento-ufficio.html',
  'arredo-negozi.html',
  'arredamento-bar-ristoranti.html',
  'arredo-negozi-food.html',
  'arredamento-hotel.html',
  'arredamento-su-misura.html',
  'contract.html',
  'chi-siamo.html',
];

function dentroProgettiHome(n, pagina) {
  if (pagina !== 'index.html') return false;
  for (let p = n.padre; p; p = p.padre) if (p.tipo === 'el' && classi(p).includes('progetti')) return true;
  return false;
}

const coppie = new Map(); // "<src>|<alt>" -> { src, alt, etichetta }
for (const p of PAGINE) {
  const { radice } = parse(fs.readFileSync(path.join(rev2, p), 'utf8'));
  const main = trova(radice, (n) => n.tag === 'main')[0];
  for (const im of trova(main, (n) => n.tag === 'img')) {
    if (dentroProgettiHome(im, p)) continue; // in home le 6 card progetto usano il ciclo dinamico (#card)
    const src = im.attr.src;
    const alt = im.attr.alt || '';
    const base = MEDIA[src];
    if (!base) throw new Error(`${p}: immagine non presente in media-rev2.json: ${src}`);
    if ((base.alt || '') === alt) continue;
    const k = `${src}|${alt}`;
    if (!coppie.has(k)) {
      const h = crypto.createHash('sha1').update(alt, 'utf8').digest('hex').slice(0, 8);
      coppie.set(k, { src, alt, etichetta: 'p-' + h, baseId: base.id });
    }
  }
}

console.log(`Pagine statiche: ${coppie.size} coppie (file, alt) diverse dall'allegato base.`);
if (prova) {
  for (const v of coppie.values()) console.log(`  ${v.src} | "${v.alt}" (#${v.etichetta}, base ${v.baseId})`);
  process.exit(0);
}

const php = (nv, code, dati) => nv.php(`$D = json_decode(${JSON.stringify(JSON.stringify(dati))}, true);\n${code}`);

(async () => {
  const nv = await connetti('novamira');
  const voci = [...coppie.values()];
  const mappa = {};
  let nuove = 0;
  for (let i = 0; i < voci.length; i += 4) {
    const lotto = voci.slice(i, i + 4);
    const r = await php(nv, String.raw`
      require_once ABSPATH . 'wp-admin/includes/image.php';
      $out = [];
      foreach ($D['voci'] as $v) {
        $baseId = (int) $v['baseId'];
        $chiave = 'rev2:' . $v['src'] . '#' . $v['etichetta'];
        $es = get_posts(['post_type' => 'attachment', 'post_status' => 'inherit', 'numberposts' => 1, 'fields' => 'ids', 'meta_key' => '_artes_src', 'meta_value' => $chiave, 'suppress_filters' => true]);
        if ($es) {
          $nid = (int) $es[0];
          update_post_meta($nid, '_wp_attachment_image_alt', $v['alt']);
          $out[$v['src'] . '|' . $v['alt']] = ['id' => $nid, 'nuova' => false];
          continue;
        }
        $file = get_attached_file($baseId);
        if (!$file || !file_exists($file)) { $out[$v['src'] . '|' . $v['alt']] = ['errore' => 'file base mancante ' . $baseId]; continue; }
        $dir = dirname($file); $info = pathinfo($file);
        $nome = wp_unique_filename($dir, $info['filename'] . '-' . $v['etichetta'] . '.' . $info['extension']);
        if (!copy($file, $dir . '/' . $nome)) { $out[$v['src'] . '|' . $v['alt']] = ['errore' => 'copia fallita']; continue; }
        $nid = wp_insert_attachment(['post_mime_type' => get_post_mime_type($baseId), 'post_title' => $v['alt'], 'post_content' => '', 'post_status' => 'inherit'], $dir . '/' . $nome);
        if (is_wp_error($nid) || !$nid) { $out[$v['src'] . '|' . $v['alt']] = ['errore' => 'insert fallito']; continue; }
        wp_update_attachment_metadata($nid, wp_generate_attachment_metadata($nid, $dir . '/' . $nome));
        update_post_meta($nid, '_wp_attachment_image_alt', $v['alt']);
        update_post_meta($nid, '_artes_src', $chiave);
        do_action('wpml_set_element_language_details', ['element_id' => $nid, 'element_type' => 'post_attachment', 'trid' => false, 'language_code' => 'it', 'source_language_code' => null]);
        $out[$v['src'] . '|' . $v['alt']] = ['id' => $nid, 'nuova' => true];
      }
      return $out;`, { voci: lotto });
    for (const [k, res] of Object.entries(r)) {
      if (res.errore) throw new Error(`${k}: ${res.errore}`);
      mappa[k] = res.id;
      if (res.nuova) nuove++;
    }
  }
  const dest = path.join(root, 'tools', 'out', 'rev2', 'media-pagine.json');
  fs.writeFileSync(dest, JSON.stringify(mappa, null, 1));
  console.log(`Completato: ${Object.keys(mappa).length} copie in media-pagine.json (nuove: ${nuove}).`);
})().catch((e) => { console.error(e.message); process.exit(1); });
