'use strict';
// Template del BLOG (Theme Builder): "Articolo del blog (rev2)" e "Archivio blog (rev2)", creati e lasciati IN BOZZA (decisione del
// 2026-11-25: si pubblicano più avanti). Sorgenti: tools/rev2/modelli/blog-articolo.html e blog-archivio.html; stile: adattamenti.css, "Blog".
//   node tools/rev2/blog-template.js --esegui      crea (se mancano) classi blog__* / blog-card__*, i due site part (bozza), li costruisce,
//                                                  mette nell'articolo il widget nativo "Contenuto articolo" e imposta le condizioni
//                                                  (articolo: include/singular/post; archivio: include/archive/post_archive) senza pubblicare
//   node tools/rev2/blog-template.js --stato
//   node tools/rev2/blog-template.js --pubblica    (solo quando deciso) pubblica i due template
// ID in tools/out/rev2/blog-template.json. Per attivare l'archivio serve anche una "Pagina articoli" (Impostazioni → Lettura).
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawnSync } = require('child_process');
const { connetti } = require('./mcp-client');

const root = path.resolve(__dirname, '..', '..');
const FILE_IDS = path.join(root, 'tools', 'out', 'rev2', 'blog-template.json');
const ids = fs.existsSync(FILE_IDS) ? JSON.parse(fs.readFileSync(FILE_IDS, 'utf8')) : {};
const salva = () => fs.writeFileSync(FILE_IDS, JSON.stringify(ids, null, 1));
const modo = process.argv[2];
const TEMPLATE = {
  articolo: { modello: 'blog-articolo', tipo: 'single-post', titolo: 'Articolo del blog (rev2)', condizioni: ['include/singular/post'] },
  archivio: { modello: 'blog-archivio', tipo: 'archive', titolo: 'Archivio blog (rev2)', condizioni: ['include/archive/post_archive'] },
};
const SEGNAPOSTO = "Contenuto dell'articolo";

function classiNuove() {
  const set = new Set();
  for (const m of ['blog-articolo', 'blog-archivio']) {
    const html = fs.readFileSync(path.join(__dirname, 'modelli', m + '.html'), 'utf8');
    for (const x of html.matchAll(/class="([^"]+)"/g)) for (const c of x[1].split(/\s+/)) if (/^blog(-card)?(__|$|-archivio$)/.test(c)) set.add(c);
  }
  return [...set];
}

(async () => {
  if (!['--esegui', '--stato', '--pubblica'].includes(modo)) { console.error('uso: blog-template.js --esegui | --stato | --pubblica'); process.exit(2); }
  const el = await connetti('elementor'); const nv = await connetti('novamira');
  const stato = async () => nv.php(`$o = []; foreach (json_decode('${JSON.stringify(ids)}', true) as $k => $i) { $o[$k] = [$i, get_post_status($i), get_post_meta($i, '_elementor_template_type', true), get_post_meta($i, '_elementor_conditions', true)]; } return $o;`);
  if (modo === '--stato') { console.log(JSON.stringify(await stato(), null, 1)); return; }
  if (modo === '--pubblica') {
    for (const k of Object.keys(TEMPLATE)) console.log(k, (await el.call('elementor-publish-document', { post_id: ids[k] })).slice(0, 80));
    console.log(await nv.php("\\Elementor\\Plugin::$instance->files_manager->clear_cache(); return 'cache svuotate';"));
    return;
  }
  // 1. classi (solo etichetta: lo stile è nel CSS del plugin). Se esistono già, la creazione fallisce in modo innocuo.
  const classi = classiNuove();
  const r = await el.callJson('elementor-manage-classes', { operations: classi.map((label) => ({ action: 'create', label, css: '--a: 0;' })) });
  const create = (r.results || []).filter((x) => x.status === 'ok').length;
  console.log(`classi blog: ${classi.length} (create ora: ${create}; le altre esistevano già)`);
  // 2. site part in bozza
  for (const [k, t] of Object.entries(TEMPLATE)) {
    if (ids[k]) continue;
    const c = await el.callJson('elementor-manage-site-parts', { operations: [{ action: 'create', type: t.tipo, title: t.titolo }] });
    const ris = c.results[0];
    if (ris.status !== 'ok') throw new Error(`creazione ${k} fallita: ${JSON.stringify(ris)}`);
    ids[k] = ris.id || ris.post_id; salva(); console.log(`${k}: creato ${ids[k]} (${t.tipo})`);
  }
  // 3. contenuti, SENZA pubblicare
  for (const [k, t] of Object.entries(TEMPLATE)) {
    const out = spawnSync(process.execPath, [path.join(__dirname, 'costruisci-modello.js'), t.modello, '--invia', String(ids[k])], { cwd: root, encoding: 'utf8' });
    console.log(`${k}: ` + (out.stdout + out.stderr).split('\n').filter((l) => /SCRITTO|NON pubblicato|rror/.test(l)).join(' | ').slice(0, 300));
    if (out.status !== 0) throw new Error('costruzione fallita: ' + t.modello);
  }
  // 4. articolo: il segnaposto diventa il widget nativo "Contenuto articolo" (theme-post-content), dentro al contenitore .prose
  const raw = await nv.php(`return (string) get_post_meta(${ids.articolo}, '_elementor_data', true);`);
  const data = JSON.parse(raw); let sostituiti = 0;
  const visita = (els) => { for (const e of els) {
    const figli = e.elements || [];
    const i = figli.findIndex((f) => f.widgetType === 'e-paragraph' && f.settings && f.settings.paragraph && String(f.settings.paragraph.value || '').includes(SEGNAPOSTO));
    if (i >= 0) { figli[i] = { id: crypto.randomBytes(4).toString('hex').slice(0, 7), elType: 'widget', widgetType: 'theme-post-content', settings: {}, elements: [] }; sostituiti++; }
    if (figli.length) visita(figli);
  } };
  visita(data);
  if (sostituiti !== 1) throw new Error('segnaposto del contenuto non trovato (trovati ' + sostituiti + ')');
  const b64 = Buffer.from(JSON.stringify(data)).toString('base64');
  await nv.php(`update_post_meta(${ids.articolo}, '_elementor_data', wp_slash(base64_decode('${b64}'))); return 1;`);
  console.log('articolo: widget "Contenuto articolo" inserito');
  // 5. condizioni pronte (valgono solo quando il template sarà pubblicato); stato forzato a bozza
  for (const [k, t] of Object.entries(TEMPLATE)) {
    const u = await el.callJson('elementor-manage-site-parts', { operations: [{ action: 'update', post_id: ids[k], conditions: t.condizioni }] });
    console.log(`${k}: condizioni ${JSON.stringify(t.condizioni)} -> ${u.results[0].status}`);
  }
  await nv.php(`foreach ([${ids.articolo}, ${ids.archivio}] as $i) { if (get_post_status($i) !== 'draft') wp_update_post(['ID' => $i, 'post_status' => 'draft']); } \\Elementor\\Plugin::$instance->files_manager->clear_cache(); return 1;`);
  console.log(JSON.stringify(await stato(), null, 1));
})().catch((e) => { console.error(e.message || e); process.exit(1); });
