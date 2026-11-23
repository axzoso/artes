'use strict';
// Fase 6 dell'adeguamento rev2 — Pagine fuori rev2:
//   1. Mette in bozza (reversibile) le 6 pagine non presenti nella rev2: Contatti (152), Area progettisti (153),
//      Richiedi preventivo (154), Prodotti (471), MEPA (472), Cataloghi PDF (491).
//   2. Ricostruisce Privacy policy (3) e Cookie policy (493) in design rev2 da tools/contenuti-pagine-legali.json
//      con i dati reali di Artes srl, pubblica, accende _artes_rev2=1.
//   3. Aggiorna Footer 971 (link cliccabili Privacy · Cookie · MEPA, identici visivamente alla rev2) e le condizioni
//      di Header 557 / Footer 971 per includere anche 3 e 493.
//   node tools/rev2/fase6-pagine.js --esegui
//   node tools/rev2/fase6-pagine.js --stato
const fs = require('fs');
const path = require('path');
const { parse, trova } = require('./html-parse');
const { converti } = require('./html2elementor');
const { connetti } = require('./mcp-client');

const root = path.resolve(__dirname, '..', '..');
const rev2 = path.join(root, 'artes-sito-rev2');
const outDir = path.join(root, 'tools', 'out', 'rev2');
fs.mkdirSync(outDir, { recursive: true });

const DEV3 = 'https://dev3.minimalstudiodev.it';
const HEADER = 557;
const FOOTER = 971;
const CPT_COND = [
  'include/singular/realizzazione',
  'include/singular/brand',
  'include/archive/realizzazione_archive',
  'include/archive/brand_archive',
];

const BOZZE = [
  { id: 152, slug: 'contatti' },
  { id: 153, slug: 'area-progettisti' },
  { id: 154, slug: 'richiedi-preventivo' },
  { id: 471, slug: 'prodotti' },
  { id: 472, slug: 'mepa' },
  { id: 491, slug: 'cataloghi' },
];

const LEGALI = ['privacy-policy', 'cookie-policy'];

function buildHtmlLegale(c) {
  const blocchi = [];
  for (const s of c.sezioni) {
    blocchi.push(`<h3>${s.h}</h3>`);
    let inList = false;
    for (const riga of s.b) {
      if (riga.startsWith('- ')) {
        if (!inList) { blocchi.push('<ul class="scala-list">'); inList = true; }
        blocchi.push(`<li>${riga.slice(2)}</li>`);
      } else {
        if (inList) { blocchi.push('</ul>'); inList = false; }
        blocchi.push(`<p>${riga}</p>`);
      }
    }
    if (inList) blocchi.push('</ul>');
  }
  return `<main>
  <section class="page-intro">
    <div class="breadcrumb"><a href="index.html">Home</a> / <strong>${c.corrente}</strong></div>
    <div class="page-intro__row">
      <div>
        <div class="eyebrow">${c.eyebrow}</div>
        <h1 class="page-title">${c.h1}</h1>
      </div>
      <p class="lead">${c.lead}</p>
    </div>
  </section>
  <section class="section">
    <div class="split">
      <div class="split__aside">
        <div class="eyebrow">${c.asideEyebrow || 'Informativa'}</div>
        <h2 class="h-section">${c.asideTitolo || c.corrente}</h2>
      </div>
      <div class="prose">
        ${blocchi.join('\n        ')}
      </div>
    </div>
  </section>
</main>`;
}

const args = process.argv.slice(2);

(async () => {
  if (args.includes('--esegui')) {
    const el = await connetti('elementor');
    const nv = await connetti('novamira');
    const legaliJson = JSON.parse(fs.readFileSync(path.join(root, 'tools', 'contenuti-pagine-legali.json'), 'utf8'));
    const revFile = path.join(outDir, 'fase6-revisions.json');
    const revisions = fs.existsSync(revFile) ? JSON.parse(fs.readFileSync(revFile, 'utf8')) : { bozze: {}, legali: {} };

    // 1. Sposta in bozza le 6 pagine fuori rev2
    const idsBozze = BOZZE.map((b) => b.id);
    const resBozze = await nv.php(`
      $out = [];
      foreach (${JSON.stringify(idsBozze)} as $id) {
        $p = get_post($id);
        if (!$p) { $out[$id] = 'NON TROVATA'; continue; }
        $prima = $p->post_status;
        if ($prima !== 'draft') {
          wp_update_post(['ID' => $id, 'post_status' => 'draft']);
        }
        $out[$id] = ['slug' => $p->post_name, 'prima' => $prima, 'dopo' => get_post_status($id)];
      }
      return $out;
    `);
    for (const [id, info] of Object.entries(resBozze)) {
      if (!revisions.bozze[id]) revisions.bozze[id] = info;
      console.log(`BOZZA ${id} (${info.slug}): ${info.prima} -> ${info.dopo}`);
    }

    // 2. Ricostruisce Privacy (3) e Cookie (493) in design rev2 con i dati reali di Artes srl
    for (const key of LEGALI) {
      const c = legaliJson[key];
      const html = buildHtmlLegale(c);
      const { radice, avvisi: ap } = parse(html);
      if (ap.length) console.log(`AVVISI parser ${key}:`, ap);
      const main = trova(radice, (n) => n.tag === 'main')[0];
      const r = converti(main, { file: key + '.html', soloFigli: true, radice: { classi: ['page-root'] } });
      if (r.avvisi.length) console.log(`AVVISI ${key}:`, r.avvisi);
      const res = await el.callJson('elementor-build-composition', { post_id: c.id, mode: 'replace_children', parent_id: 'document', ...r.composizione });
      if (res.errors && res.errors.length) throw new Error(`${key} (${c.id}): ${JSON.stringify(res.errors)}`);
      if (!revisions.legali[c.id]) revisions.legali[c.id] = { slug: key, prima_undo_revision_id: res.undo_revision_id };
      revisions.legali[c.id].ultimo_undo_revision_id = res.undo_revision_id;
      await el.call('elementor-publish-document', { post_id: c.id });
      await nv.php(`update_post_meta(${c.id}, '_artes_rev2', '1'); return get_post_meta(${c.id}, '_artes_rev2', true);`);
      console.log(`OK    ${key} (${c.id}): ${r.elementi} el, undo=${res.undo_revision_id}, pubblicato, _artes_rev2=1`);
    }

    // 3. Aggiorna Footer 971 con link reali Privacy · Cookie · MEPA (aspetto identico alla rev2)
    const fHtml = fs.readFileSync(path.join(rev2, 'index.html'), 'utf8')
      .replace('<span>Privacy · Cookie · MEPA</span>', '<span><a href="/privacy-policy/">Privacy</a> · <a href="/cookie-policy/">Cookie</a> · <a href="/arredamento-ufficio/">MEPA</a></span>');
    const fNode = trova(parse(fHtml).radice, (n) => n.tag === 'footer')[0];
    const rF = converti(fNode, { file: 'footer (index.html)' });
    const resF = await el.callJson('elementor-build-composition', { post_id: FOOTER, mode: 'replace_children', parent_id: 'document', ...rF.composizione });
    if (resF.errors && resF.errors.length) throw new Error(`footer (${FOOTER}): ${JSON.stringify(resF.errors)}`);
    revisions.footer_undo_revision_id = resF.undo_revision_id;
    await el.call('elementor-publish-document', { post_id: FOOTER });
    console.log(`OK    Footer ${FOOTER}: ${rF.elementi} el, undo=${resF.undo_revision_id}, pubblicato (link Privacy · Cookie · MEPA attivi)`);

    fs.writeFileSync(revFile, JSON.stringify(revisions, null, 2));

    // 4. Aggiorna condizioni Header 557 / Footer 971 su tutte le pagine pubblicate con _artes_rev2=1
    const idsAttivi = await nv.php(`
      $ids = get_posts(['post_type' => 'page', 'post_status' => 'publish', 'numberposts' => -1, 'fields' => 'ids', 'meta_key' => '_artes_rev2', 'meta_value' => '1', 'suppress_filters' => true]);
      return array_values(array_map('intval', $ids));
    `);
    const cond = [...CPT_COND, ...idsAttivi.map((id) => `include/singular/page/${id}`)];
    const sp = await el.callJson('elementor-manage-site-parts', {
      operations: [
        { action: 'update', post_id: HEADER, conditions: cond },
        { action: 'update', post_id: FOOTER, conditions: cond },
      ],
    });
    console.log('Condizioni 557/971:', sp.results.map((x) => `${x.id || x.post_id}:${x.status}`).join(' '), `(${idsAttivi.length} pagine rev2 pubblicate)`);

    // 5. Svuota cache
    await el.call('elementor-clear-cache', {});
    await nv.php(`if (class_exists('\\Elementor\\Plugin')) { \\Elementor\\Plugin::$instance->files_manager->clear_cache(); } wp_cache_flush(); return true;`);
    console.log('Cache Elementor e WP svuotate.');
  } else if (args.includes('--stato')) {
    const nv = await connetti('novamira');
    const r = await nv.php(`
      $out = [];
      foreach ([152,153,154,471,472,491,3,493] as $id) {
        $p = get_post($id);
        $out[] = ['id' => $id, 'slug' => $p->post_name, 'status' => $p->post_status, 'rev2' => get_post_meta($id, '_artes_rev2', true)];
      }
      return $out;
    `);
    for (const x of r) {
      const resp = await fetch(`${DEV3}/${x.slug}/`, { redirect: 'manual' });
      console.log(`${String(x.id).padEnd(4)} | ${x.slug.padEnd(22)} | ${x.status.padEnd(7)} | rev2=${x.rev2 || '0'} | HTTP ${resp.status}`);
    }
  } else {
    console.error('uso: fase6-pagine.js --esegui | --stato');
    process.exit(2);
  }
})().catch((e) => { console.error(e.message); process.exit(1); });
