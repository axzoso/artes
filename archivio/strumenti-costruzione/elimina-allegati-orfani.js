'use strict';
// Eliminazione DEFINITIVA degli allegati non usati (elenco: tools/out/rev2/fase9-allegati-orfani.json, autorizzata dall'utente il 2026-11-25).
// Prima di cancellare ricontrolla OGNI allegato contro: _elementor_data di tutti i post (qualunque stato, anche cestino e traduzioni EN),
// _thumbnail_id, campo galleria, post_content, opzioni, meta dei termini e CSS del plugin locale. Si cancella solo se non c'è nessun riferimento.
//   node tools/rev2/elimina-allegati-orfani.js --verifica    sola lettura
//   node tools/rev2/elimina-allegati-orfani.js --esegui      cancella (file compresi) e scrive il resoconto in tools/out/rev2/allegati-eliminati.json
const fs = require('fs');
const path = require('path');
const { connetti } = require('./mcp-client');

const root = path.resolve(__dirname, '..', '..');
const elenco = JSON.parse(fs.readFileSync(path.join(root, 'tools', 'out', 'rev2', 'fase9-allegati-orfani.json'), 'utf8')).allegati_orfani;
// prova del controllo: ALLEGATI_PROVA='id:file,...' sostituisce l'elenco (solo con --verifica)
if (process.env.ALLEGATI_PROVA) elenco.splice(0, elenco.length, ...process.env.ALLEGATI_PROVA.split(',').map((x) => { const [id, filename] = x.split(':'); return { id: +id, filename, title: 'prova' }; }));
const modo = process.argv[2];
const cssLocale = ['artes-rev2.css', 'artes-core.css'].map((f) => fs.readFileSync(path.join(root, 'wp', 'artes-core', f), 'utf8')).join('\n');

(async () => {
  if (!['--verifica', '--esegui'].includes(modo)) { console.error('uso: --verifica | --esegui'); process.exit(2); }
  const nv = await connetti('novamira');
  const voci = elenco.map((a) => ({ id: a.id, file: a.filename, titolo: a.title }));
  const b64 = Buffer.from(JSON.stringify(voci)).toString('base64');
  const rif = await nv.php(`$V = json_decode(base64_decode('${b64}'), true);\n` + String.raw`
    global $wpdb; $out = [];
    foreach ($V as $v) {
      $id = (int) $v['id']; $base = basename($v['file']); $senzaEst = preg_replace('/\.[a-z0-9]+$/i', '', $base); $r = [];
      if (get_post_type($id) !== 'attachment') { $out[$id] = ['GIA_ASSENTE']; continue; }
      $dir = dirname($v['file']); $like = '%uploads/' . $wpdb->esc_like($dir . '/' . $senzaEst) . '.%'; $like2 = '%uploads/' . $wpdb->esc_like($dir . '/' . $senzaEst) . '-%';
      foreach ($wpdb->get_results($wpdb->prepare("SELECT m.post_id FROM {$wpdb->postmeta} m JOIN {$wpdb->posts} p ON p.ID=m.post_id AND p.post_type<>'revision' AND p.ID<>542 WHERE m.meta_key='_elementor_data' AND (m.meta_value LIKE %s OR m.meta_value LIKE %s OR m.meta_value LIKE %s OR m.meta_value LIKE %s)", '%"value":' . $id . '}%', '%"id":' . $id . ',%', $like, $like2)) as $x) $r[] = 'elementor:' . $x->post_id . ':' . get_post_status($x->post_id);
      foreach ($wpdb->get_col($wpdb->prepare("SELECT post_id FROM {$wpdb->postmeta} WHERE meta_key='_thumbnail_id' AND meta_value=%s", (string) $id)) as $p) $r[] = 'thumbnail:' . $p . ':' . get_post_status($p);
      foreach ($wpdb->get_results("SELECT post_id, meta_value FROM {$wpdb->postmeta} WHERE meta_key='galleria'") as $x) if (in_array((string) $id, array_map('trim', explode(',', $x->meta_value)), true)) $r[] = 'galleria:' . $x->post_id . ':' . get_post_status($x->post_id);
      foreach ($wpdb->get_col($wpdb->prepare("SELECT ID FROM {$wpdb->posts} WHERE post_type<>'revision' AND post_type<>'attachment' AND ID<>542 AND (post_content LIKE %s OR post_content LIKE %s OR post_content LIKE %s)", $like, $like2, '%wp-image-' . $id . '"%')) as $p) $r[] = 'contenuto:' . $p . ':' . get_post_status($p);
      foreach ($wpdb->get_col($wpdb->prepare("SELECT option_name FROM {$wpdb->options} WHERE option_value LIKE %s OR option_value LIKE %s", $like, $like2)) as $o) if (!in_array($o, ['_transient_doing_cron'], true)) $r[] = 'opzione:' . $o;
      foreach ($wpdb->get_col($wpdb->prepare("SELECT term_id FROM {$wpdb->termmeta} WHERE meta_value LIKE %s OR meta_value LIKE %s", $like, $like2)) as $t) $r[] = 'termine:' . $t;
      $out[$id] = $r;
    }
    return $out;`);
  const liberi = []; const usati = [];
  for (const v of voci) {
    const r = (rif[v.id] || []).slice();
    if (cssLocale.includes(v.file.replace(/\.[a-z0-9]+$/i, '') + '.') || cssLocale.includes(v.file.replace(/\.[a-z0-9]+$/i, '') + '-')) r.push('css del plugin');
    // i riferimenti dalle revisioni sono già esclusi; quelli da post nel cestino o dai vecchi template contano comunque come "usato"
    (r.length ? usati : liberi).push({ ...v, riferimenti: r });
  }
  console.log(`allegati in elenco: ${voci.length}; senza riferimenti: ${liberi.length}; con riferimenti (NON si toccano): ${usati.length}`);
  usati.forEach((u) => console.log(`  USATO ${u.id} ${u.file}: ${u.riferimenti.slice(0, 4).join(', ')}`));
  if (modo === '--verifica' || process.env.ALLEGATI_PROVA) return;
  const ids = liberi.map((l) => l.id);
  const res = await nv.php(`$I = json_decode('${JSON.stringify(ids)}', true); $o = []; foreach ($I as $id) { $f = get_attached_file($id); $r = wp_delete_attachment((int) $id, true); $o[$id] = ($r ? 'eliminato' : 'ERRORE') . ($f && file_exists($f) ? ' (file ancora presente!)' : ''); } wp_cache_flush(); return $o;`);
  const esito = liberi.map((l) => ({ ...l, esito: res[l.id] }));
  fs.writeFileSync(path.join(root, 'tools', 'out', 'rev2', 'allegati-eliminati.json'), JSON.stringify({ quando: new Date().toISOString(), eliminati: esito, non_toccati: usati }, null, 1));
  const ko = esito.filter((e) => !/^eliminato$/.test(e.esito));
  console.log(`eliminati: ${esito.length - ko.length}; problemi: ${ko.length}`); ko.forEach((k) => console.log('  ' + k.id + ' ' + k.esito));
})().catch((e) => { console.error(e); process.exit(1); });
