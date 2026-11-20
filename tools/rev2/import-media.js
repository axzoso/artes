'use strict';
// Porta nella libreria multimediale di dev3 le immagini della rev2 e scrive la mappa percorso -> allegato.
//   node tools/rev2/import-media.js [--prova] [--max N]
// Per ogni immagine usata dalle pagine rev2 (e per i due loghi):
//   - se su dev3 esiste già un allegato con lo stesso file (stesso contenuto, riconosciuto dal meta _artes_src del vecchio import),
//     lo riusa e ne aggiorna il testo alternativo con quello della rev2;
//   - altrimenti lo carica con elementor-upload-media dall'URL pubblico su GitHub Pages (5 per chiamata);
//   - a tutti i nuovi allegati assegna il meta _artes_src = "rev2:<percorso>" e la lingua italiana (WPML).
// Mappa scritta in tools/out/rev2/media-rev2.json (percorso relativo alla rev2 -> { id, url, alt }). Idempotente.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { connetti } = require('./mcp-client');

const root = path.resolve(__dirname, '..', '..');
const rev2 = path.join(root, 'artes-sito-rev2');
const BASE = 'https://axzoso.github.io/artes/artes-sito-rev2/';
const prova = process.argv.includes('--prova');
const mi = process.argv.indexOf('--max'); const MAX = mi > 0 ? parseInt(process.argv[mi + 1], 10) : Infinity;
const dec = (s) => s.replace(/&amp;/g, '&').replace(/&#x27;|&#39;|&apos;/g, "'").replace(/&quot;/g, '"').replace(/&nbsp;/g, ' ');
const md5 = (f) => crypto.createHash('md5').update(fs.readFileSync(f)).digest('hex');

// 1. immagini usate dalle pagine rev2 con il loro testo alternativo (si tiene il più descrittivo)
const imgs = new Map();
const aggiungi = (src, alt) => { if (!src || !/^assets\/.*\.(jpe?g|png|webp)$/i.test(src)) return; const a = dec(alt || ''); const k = src; if (!imgs.has(k) || a.length > imgs.get(k).alt.length) imgs.set(k, { src, alt: a }); else if (!imgs.get(k)) imgs.set(k, { src, alt: a }); };
for (const f of fs.readdirSync(rev2).filter((n) => n.endsWith('.html'))) {
  const h = fs.readFileSync(path.join(rev2, f), 'utf8');
  for (const m of h.matchAll(/<img\b[^>]*>/g)) { const t = m[0]; aggiungi((/\ssrc="([^"]+)"/.exec(t) || [])[1], (/\salt="([^"]*)"/.exec(t) || [])[1]); }
  for (const m of h.matchAll(/<a\b[^>]*data-lightbox[^>]*>/g)) aggiungi((/\shref="([^"]+)"/.exec(m[0]) || [])[1], '');
}
const css = fs.readFileSync(path.join(rev2, 'assets', 'css', 'artes.css'), 'utf8');
for (const m of css.matchAll(/url\(['"]?\.\.\/(img\/[^)'"]+)/g)) aggiungi('assets/' + m[1], '');
const elenco = [...imgs.values()].filter((x) => fs.existsSync(path.join(rev2, x.src))).sort((a, b) => a.src.localeCompare(b.src));
console.log(`immagini usate dalla rev2: ${elenco.length} (${[...imgs.keys()].length - elenco.length} riferimenti a file inesistenti ignorati)`);

(async () => {
  const nv = await connetti('novamira');
  // 2. allegati già presenti: percorso del vecchio mockup -> id (meta _artes_src), e quelli già importati dalla rev2
  const esistenti = await nv.php('global $wpdb; $r = $wpdb->get_results("SELECT post_id, meta_value FROM {$wpdb->postmeta} WHERE meta_key=\'_artes_src\'"); $o = []; foreach ($r as $x) { $o[] = [(int) $x->post_id, $x->meta_value]; } return $o;');
  const vecchi = new Map(); const gia = new Map();
  for (const [id, v] of esistenti) { if (v.startsWith('rev2:')) gia.set(v.slice(5), id); else vecchi.set(v, id); }
  const mappa = {}; const daCaricare = []; const daAggiornare = [];
  for (const x of elenco) {
    if (gia.has(x.src)) { mappa[x.src] = { id: gia.get(x.src), alt: x.alt, nuovo: false }; continue; }
    const vecchio = path.join(root, x.src);
    if (vecchi.has(x.src) && fs.existsSync(vecchio) && md5(vecchio) === md5(path.join(rev2, x.src))) { mappa[x.src] = { id: vecchi.get(x.src), alt: x.alt, riuso: true }; daAggiornare.push([vecchi.get(x.src), x.alt, x.src]); continue; }
    daCaricare.push(x);
  }
  console.log(`già importate dalla rev2: ${gia.size}; da riusare (stesso file nel vecchio import): ${daAggiornare.length}; da caricare: ${daCaricare.length}`);
  if (prova) { console.log('prova: nessuna modifica'); return; }

  // 3. caricamento (5 per volta). Subito dopo ogni lotto si scrive il meta di origine (e la lingua), così se lo script si
  //    interrompe a metà la volta dopo riparte da dove era arrivato invece di ricaricare tutto.
  const el = await connetti('elementor');
  const lotti = daCaricare.slice(0, MAX);
  let ok = 0; const errori = []; let primo = true;
  for (let i = 0; i < lotti.length; i += 5) {
    const gruppo = lotti.slice(i, i + 5);
    const r = await el.callJson('elementor-upload-media', { consent: true, images: gruppo.map((x) => ({ source_url: BASE + x.src, title: (x.alt || path.basename(x.src)).slice(0, 255), alt: x.alt.slice(0, 255) })) });
    if (primo) { console.log('risposta di esempio:', JSON.stringify(r).slice(0, 700)); primo = false; }
    const nuoviLotto = [];
    for (const u of (r.uploads || r.results || [])) {
      const x = gruppo[u.index];
      const id = u.attachment_id || u.id;
      if (x && id && (u.status === 'ok' || u.status === 'uploaded' || u.success)) { mappa[x.src] = { id, url: u.url, alt: x.alt, nuovo: true }; nuoviLotto.push([x.src, id]); ok++; }
      else errori.push(`${x ? x.src : '?'}: ${JSON.stringify(u).slice(0, 200)}`);
    }
    if (nuoviLotto.length) await nv.php(`$o = ${JSON.stringify(nuoviLotto)}; foreach ($o as $x) { update_post_meta($x[1], '_artes_src', 'rev2:' . $x[0]); $l = apply_filters('wpml_post_language_details', null, $x[1]); if (is_wp_error($l) || empty($l['language_code'])) { do_action('wpml_set_element_language_details', ['element_id' => $x[1], 'element_type' => 'post_attachment', 'trid' => false, 'language_code' => 'it', 'source_language_code' => null]); } } return count($o);`);
    console.log(`caricate ${Math.min(i + 5, lotti.length)}/${lotti.length}`);
  }
  // 4. testo alternativo delle immagini riusate dal vecchio import (più sotto)
  if (daAggiornare.length) {
    for (let i = 0; i < daAggiornare.length; i += 40) {
      const parte = daAggiornare.slice(i, i + 40);
      await nv.php(`$o = ${JSON.stringify(parte)}; foreach ($o as $x) { if ($x[1] !== '') { update_post_meta($x[0], '_wp_attachment_image_alt', $x[1]); } update_post_meta($x[0], '_artes_src_rev2', 'rev2:' . $x[2]); } return count($o);`);
    }
  }
  // 5. url e dimensioni di tutti gli allegati mappati
  const ids = Object.values(mappa).map((v) => v.id);
  const info = {};
  for (let i = 0; i < ids.length; i += 60) {
    const r = await nv.php(`$o = []; foreach (${JSON.stringify(ids.slice(i, i + 60))} as $id) { $m = wp_get_attachment_metadata($id); $o[$id] = ['url' => wp_get_attachment_url($id), 'w' => isset($m['width']) ? $m['width'] : null, 'h' => isset($m['height']) ? $m['height'] : null]; } return $o;`);
    Object.assign(info, r);
  }
  for (const v of Object.values(mappa)) Object.assign(v, info[v.id] || {});
  fs.mkdirSync(path.join(root, 'tools', 'out', 'rev2'), { recursive: true });
  fs.writeFileSync(path.join(root, 'tools', 'out', 'rev2', 'media-rev2.json'), JSON.stringify(mappa, null, 1));
  console.log(`\nmappa scritta: ${Object.keys(mappa).length} immagini (nuove: ${ok}, riusate: ${daAggiornare.length}); errori: ${errori.length}`);
  errori.forEach((e) => console.log('  ERRORE ' + e));
})().catch((e) => { console.error(e); process.exit(1); });
