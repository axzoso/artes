'use strict';
// Testi alternativi EN delle immagini (WPML, lingua en-gb).
// In Elementor V4 il widget immagine non memorizza l'alt: lo legge dall'allegato (_wp_attachment_image_alt) a ogni visualizzazione, e lo
// stesso vale per gallerie, immagini in evidenza e card dei cicli. Invece di duplicare gli allegati per lingua, ogni allegato riceve il meta
// `_artes_alt_en`; il plugin (artes-core, filtro su get_post_metadata) lo restituisce al posto dell'alt italiano quando la lingua è en-gb.
// Il campo è modificabile da Media → allegato ("Testo alternativo (EN)").
//
//   node tools/rev2/wpml-trad-alt.js --piano            genera tools/rev2/traduzioni/en-alt.json e controlla che ogni alt italiano abbia la sua traduzione
//   node tools/rev2/wpml-trad-alt.js --esegui           scrive `_artes_alt_en` su dev3 (backup dei valori precedenti in tools/out/rev2/wpml-trad-alt-backup.json)
//   node tools/rev2/wpml-trad-alt.js --rollback         rimette i valori del backup (o cancella i meta creati)
// Fonte degli alt italiani: dev3 (tutti gli allegati con alt non vuoto).
const fs = require('fs');
const path = require('path');
const { connetti } = require('./mcp-client');

const root = path.resolve(__dirname, '..', '..');
const FILE_EN = path.join(__dirname, 'traduzioni', 'en-alt.json');
const FILE_BACKUP = path.join(root, 'tools', 'out', 'rev2', 'wpml-trad-alt-backup.json');
const modo = process.argv[2];

// Traduzioni puntuali (alt descrittivi delle pagine statiche, nomi di schede, brand)
const MANUALI = {
  'Sala riunioni Arpacal': 'Arpacal meeting room',
  'Ufficio con contenitori': 'Office with storage units',
  'Postazione operativa': 'Workstation',
  'Ufficio di direzione BBC di Tarsia': 'BCC di Tarsia executive office',
  'Parete attrezzata in legno chiaro': 'Light wood fitted wall unit',
  'Uffici open space': 'Open-plan offices',
  'Scrivania direzionale, dettaglio': 'Executive desk, detail',
  'Store Free Sport': 'Free Sport store',
  'Parete scarpiera': 'Footwear display wall',
  'Espositore borse e accessori': 'Bags and accessories display',
  'Aula e cucina didattica Ingrediente School': 'Ingrediente School classroom and teaching kitchen',
  'Banco della cucina didattica': 'Teaching kitchen counter',
  'Postazioni di cucina': 'Cooking stations',
  'Sala bistrot con cucina a vista': 'Bistro dining room with open kitchen',
  'Sala e bancone': 'Dining room and counter',
  'Pareti espositive Lico': 'Lico display walls',
  'Banchi vetrina': 'Display counters',
  'Isola espositiva': 'Display island',
  'Sala conferenze Quotidiano': 'Il Quotidiano conference hall',
  'Platea con poltroncine': 'Auditorium seating',
  'Tavolo dei relatori': 'Speakers’ table',
  'Pedana e schermo': 'Stage and screen',
  'Team ARTES in ufficio': 'ARTES team at the office',
  'Ufficio direzionale Ruffolo Group': 'Ruffolo Group executive office',
  'Postazione con doppio monitor': 'Dual-monitor workstation',
  'Ingresso con pareti attrezzate': 'Entrance with fitted walls',
  'Wine bar': 'Wine bar',
  'ARTES Arredamenti': 'ARTES Arredamenti',
  'Sala riunioni con tavolo su misura': 'Meeting room with bespoke table',
  'Negozio con banco e pareti espositive su misura': 'Store with bespoke counter and display walls',
  'Showroom retail': 'Retail showroom',
  'Libreria espositiva per negozio': 'Store display shelving',
  'Banco bakery su misura': 'Bespoke bakery counter',
  'Bancone bar su misura': 'Bespoke bar counter',
  'Prodotti LAS': 'LAS products',
  'Prodotti Arken': 'Arken products',
  'Sistema espositivo per negozio': 'Store display system',
  'Camera hotel arredata su misura': 'Hotel room with bespoke furniture',
  'Banco bakery': 'Bakery counter',
  'Camera hotel': 'Hotel room',
  'Lavorazione su misura in laboratorio': 'Bespoke work in the workshop',
  'Arredo ufficio realizzato su misura': 'Bespoke office furniture',
  'Uffici operativi arredati su misura': 'Operational offices with bespoke furniture',
  'Uffici con pareti vetrate, dettaglio': 'Offices with glass partitions, detail',
  'Sistema espositivo modulare': 'Modular display system',
  'Sala ristorante, dettaglio': 'Restaurant dining room, detail',
  'Laboratorio, dettaglio': 'Workshop, detail',
  'Lounge hotel con arredi su misura': 'Hotel lounge with bespoke furniture',
  'Camera hotel, dettaglio': 'Hotel room, detail',
  'Cantiere in allestimento': 'Fit-out in progress',
  'Centro di lavoro, dettaglio costruttivo': 'CNC machining centre, construction detail',
  'Cantiere, dettaglio': 'Site, detail',
  'Cantiere contract in allestimento': 'Contract fit-out in progress',
};

function generaMappa(altIt) {
  const E = JSON.parse(fs.readFileSync(path.join(root, 'tools', 'out', 'rev2', 'dati-rev2.json'), 'utf8'));
  const EN = JSON.parse(fs.readFileSync(path.join(__dirname, 'traduzioni', 'en-dati.json'), 'utf8'));
  const enDi = Object.fromEntries((EN.realizzazioni || []).map((r) => [r.slug, r]));
  const titoli = new Set(E.realizzazioni.map((r) => r.titolo));
  const tipologie = {}; // tipologia IT (minuscola) -> EN (minuscola iniziale)
  for (const r of E.realizzazioni) { const en = enDi[r.slug]; if (en && en.tipologia) tipologie[r.tipologia.toLowerCase()] = en.tipologia.charAt(0).toLowerCase() + en.tipologia.slice(1); }
  const mappa = {}; const mancanti = [];
  for (const it of altIt) {
    let en = MANUALI[it];
    if (!en && titoli.has(it)) en = it; // nome del progetto (card): invariato
    let m;
    if (!en && (m = it.match(/^Arredi (.+) nella realizzazione (.+)$/))) en = `${m[1]} furniture in the ${m[2]} project`;
    if (!en && (m = it.match(/^(.+), (.+) a (.+): foto (\d+)$/))) { const t = tipologie[m[2].toLowerCase()]; if (t) en = `${m[1]}, ${t} in ${m[3]}: photo ${m[4]}`; }
    if (en) mappa[it] = en; else mancanti.push(it);
  }
  return { mappa, mancanti };
}

async function altDaDev3(nv) {
  const r = await nv.php(String.raw`global $wpdb; return $wpdb->get_results("SELECT p.ID id, m.meta_value alt, (SELECT meta_value FROM {$wpdb->postmeta} WHERE post_id=p.ID AND meta_key='_artes_alt_en' LIMIT 1) en FROM {$wpdb->posts} p JOIN {$wpdb->postmeta} m ON m.post_id=p.ID AND m.meta_key='_wp_attachment_image_alt' WHERE p.post_type='attachment' AND m.meta_value<>'' ORDER BY p.ID", ARRAY_A);`);
  return r.map((x) => ({ id: +x.id, alt: x.alt, en: x.en }));
}

(async () => {
  if (!['--piano', '--esegui', '--rollback'].includes(modo)) { console.error('uso: wpml-trad-alt.js --piano | --esegui | --rollback'); process.exit(2); }
  const nv = await connetti('novamira');
  if (modo === '--rollback') {
    const b = JSON.parse(fs.readFileSync(FILE_BACKUP, 'utf8'));
    const b64 = Buffer.from(JSON.stringify(b)).toString('base64');
    const r = await nv.php(`$B = json_decode(base64_decode('${b64}'), true); $n = 0; foreach ($B as $id => $v) { if ($v === null) { delete_post_meta((int) $id, '_artes_alt_en'); } else { update_post_meta((int) $id, '_artes_alt_en', wp_slash($v)); } $n++; } wp_cache_flush(); return $n;`);
    console.log('rollback: allegati ripristinati', r); return;
  }
  const att = await altDaDev3(nv);
  const { mappa, mancanti } = generaMappa([...new Set(att.map((a) => a.alt))]);
  fs.writeFileSync(FILE_EN, JSON.stringify(mappa, null, 1));
  const residui = Object.values(mappa).filter((v) => /\b(foto|della|degli|nella|uffici|negozio|arredi|su misura|dettaglio|cantiere)\b/i.test(v) && !/Della Rovere/.test(v));
  console.log(`allegati con alt: ${att.length}; testi distinti: ${new Set(att.map((a) => a.alt)).size}; tradotti: ${Object.keys(mappa).length}; mancanti: ${mancanti.length}; con parole italiane: ${residui.length}`);
  mancanti.forEach((m) => console.log('  MANCA: ' + m)); residui.forEach((m) => console.log('  ITALIANO?: ' + m));
  if (mancanti.length || residui.length) process.exit(1);
  if (modo === '--piano') { console.log('piano OK -> ' + path.relative(root, FILE_EN)); return; }
  const backup = Object.fromEntries(att.map((a) => [a.id, a.en === undefined ? null : a.en]));
  if (!fs.existsSync(FILE_BACKUP)) fs.writeFileSync(FILE_BACKUP, JSON.stringify(backup, null, 1));
  const voci = att.map((a) => [a.id, mappa[a.alt]]);
  const b64 = Buffer.from(JSON.stringify(voci)).toString('base64');
  const r = await nv.php(`$V = json_decode(base64_decode('${b64}'), true); $n = 0; foreach ($V as $v) { update_post_meta((int) $v[0], '_artes_alt_en', wp_slash($v[1])); $n++; } \\Elementor\\Plugin::$instance->files_manager->clear_cache(); wp_cache_flush(); return $n;`);
  console.log('scritti _artes_alt_en su ' + r + ' allegati (backup: ' + path.relative(root, FILE_BACKUP) + ')');
})().catch((e) => { console.error(e); process.exit(1); });
