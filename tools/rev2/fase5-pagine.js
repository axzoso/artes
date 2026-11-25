'use strict';
// Gestisce le 9 pagine statiche della Fase 5 (Home + 5 settori + Su misura + Contract + Chi siamo):
//   node tools/rev2/fase5-pagine.js --costruisci [--solo home,chi-siamo]   costruisce, pubblica, accende _artes_rev2 e aggiorna condizioni 557/971
//   node tools/rev2/fase5-pagine.js --parita [--w 1440,390] [--base-rev2 http://127.0.0.1:8765] [--parallelo 3]
//   node tools/rev2/fase5-pagine.js --stato                                mostra meta _artes_rev2, stato e condizioni header/footer
const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');
const { parse, trova, classi } = require('./html-parse');
const { converti } = require('./html2elementor');
const dinamici = require('./dinamici');
const { connetti } = require('./mcp-client');

const root = path.resolve(__dirname, '..', '..');
const rev2 = root;
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

const PAGINE = [
  { nome: 'home', file: 'index.html', id: 376, percorso: '/', modello: 'home' },
  { nome: 'arredamento-ufficio', file: 'arredamento-ufficio.html', id: 144, percorso: '/arredamento-ufficio/' },
  { nome: 'arredo-negozi', file: 'arredo-negozi.html', id: 145, percorso: '/arredo-negozi/' },
  { nome: 'arredo-negozi-food', file: 'arredo-negozi-food.html', id: 146, percorso: '/arredo-negozi-food/' },
  { nome: 'arredamento-bar-ristoranti', file: 'arredamento-bar-ristoranti.html', id: 147, percorso: '/arredamento-bar-ristoranti/' },
  { nome: 'arredamento-hotel', file: 'arredamento-hotel.html', id: 148, percorso: '/arredamento-hotel/' },
  { nome: 'arredamento-su-misura', file: 'arredamento-su-misura.html', id: 149, percorso: '/arredamento-su-misura/' },
  { nome: 'contract', file: 'contract.html', id: 150, percorso: '/contract/' },
  { nome: 'chi-siamo', file: 'chi-siamo.html', id: 151, percorso: '/chi-siamo/' },
];

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const solo = opt('--solo', '') ? new Set(opt('--solo', '').split(',').map((s) => s.trim())) : null;
const selezionate = solo ? PAGINE.filter((p) => solo.has(p.nome)) : PAGINE;

function runNode(script, scriptArgs) {
  return new Promise((res) => {
    execFile(process.execPath, [path.join(__dirname, script), ...scriptArgs], { cwd: root, maxBuffer: 8 * 1024 * 1024 }, (err, stdout, stderr) => {
      res({ code: err ? (err.code || 1) : 0, out: (stdout + '\n' + stderr).trim() });
    });
  });
}

(async () => {
  if (args.includes('--costruisci')) {
    const el = await connetti('elementor');
    const nv = await connetti('novamira');
    const revFile = path.join(outDir, 'fase5-revisions.json');
    const revisions = fs.existsSync(revFile) ? JSON.parse(fs.readFileSync(revFile, 'utf8')) : {};

    for (const p of selezionate) {
      const srcPath = p.modello ? path.join(__dirname, 'modelli', p.modello + '.html') : path.join(rev2, p.file);
      const { radice, avvisi: ap } = parse(fs.readFileSync(srcPath, 'utf8'));
      if (ap.length) console.log(`AVVISI parser ${p.nome}:`, ap);
      const main = trova(radice, (n) => n.tag === 'main')[0];
      const r = converti(main, { file: p.file, soloFigli: true, radice: { classi: ['page-root', ...classi(main)] }, ...(p.modello ? { dinamici } : {}) });
      if (r.avvisi.length) console.log(`AVVISI ${p.nome}:`, r.avvisi);
      const res = await el.callJson('elementor-build-composition', { post_id: p.id, mode: 'replace_children', parent_id: 'document', ...r.composizione });
      if (res.errors && res.errors.length) throw new Error(`${p.nome} (${p.id}): ${JSON.stringify(res.errors)}`);
      if (!revisions[p.id]) revisions[p.id] = { nome: p.nome, prima_undo_revision_id: res.undo_revision_id };
      revisions[p.id].ultimo_undo_revision_id = res.undo_revision_id;
      await el.call('elementor-publish-document', { post_id: p.id });
      await nv.php(`update_post_meta(${p.id}, '_artes_rev2', '1'); return get_post_meta(${p.id}, '_artes_rev2', true);`);
      console.log(`OK  ${p.nome} (${p.id}): ${r.elementi} el, undo=${res.undo_revision_id}, pubblicato, _artes_rev2=1`);
    }
    fs.writeFileSync(revFile, JSON.stringify(revisions, null, 2));

    // Aggiorna le condizioni di Header 557 e Footer 971 (CPT + tutte le pagine con _artes_rev2=1 tranne 542)
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
    console.log('Condizioni 557/971:', sp.results.map((x) => `${x.id || x.post_id}:${x.status}`).join(' '), `(${idsAttivi.length} pagine rev2)`);
    await el.call('elementor-clear-cache', {});
    await nv.php(`if (class_exists('\\Elementor\\Plugin')) { \\Elementor\\Plugin::$instance->files_manager->clear_cache(); } wp_cache_flush(); return true;`);
    console.log('Cache Elementor e WP svuotate.');
  } else if (args.includes('--parita')) {
    const baseRev2 = opt('--base-rev2', 'http://127.0.0.1:8765');
    const w = opt('--w', '1440,390');
    const par = parseInt(opt('--parallelo', '3'), 10);
    const risultati = []; let idx = 0;
    await Promise.all(Array.from({ length: par }, async () => {
      while (idx < selezionate.length) {
        const p = selezionate[idx++];
        const urlA = `${baseRev2}/${p.file}`;
        const urlB = `${DEV3}${p.percorso}`;
        const rP = await runNode('parita.js', [`fase5-${p.nome}`, urlA, urlB, '--w', w]);
        const rC = await runNode('contenuti.js', [urlA, urlB, '--rev2-file', p.file]);
        const misure = [...rP.out.matchAll(/== .*?@(\d+)px: altezza rev2 (\d+) \/ dev3 (\d+) \(Δ (-?\d+)\); pixel diversi ([\d.]+)%; scroll orizzontale dev3: (\d+)px/g)]
          .map((m) => ({ w: +m[1], hA: +m[2], hB: +m[3], dh: +m[4], px: +m[5], scroll: +m[6] }));
        const ok = rP.code === 0 && rC.code === 0 && misure.length > 0 && misure.every((m) => m.dh === 0 && m.scroll === 0 && m.px < 3);
        risultati.push({ nome: p.nome, id: p.id, percorso: p.percorso, ok, misure, contenutiOk: rC.code === 0, contenutiOut: rC.out });
        const sintesi = misure.map((m) => `@${m.w}:Δ${m.dh}/${m.px}%/sx${m.scroll}`).join('  ');
        console.log(`${ok ? 'OK  ' : 'DIFF'} ${p.nome.padEnd(28)} ${sintesi}  contenuti:${rC.code === 0 ? 'OK' : 'DIFF'}`);
        if (rC.code !== 0) console.log('     ' + rC.out.split('\n').slice(0, 6).join('\n     '));
      }
    }));
    risultati.sort((a, b) => PAGINE.findIndex((x) => x.nome === a.nome) - PAGINE.findIndex((x) => x.nome === b.nome));
    fs.writeFileSync(path.join(outDir, 'parita-fase5.json'), JSON.stringify(risultati, null, 2));
    const ko = risultati.filter((r) => !r.ok);
    console.log(`\nFase 5 parità: ${risultati.length - ko.length}/${risultati.length} pagine in parità.`);
    process.exit(ko.length ? 1 : 0);
  } else if (args.includes('--stato')) {
    const nv = await connetti('novamira');
    const r = await nv.php(`
      $out = [];
      foreach ([376,144,145,146,147,148,149,150,151] as $id) {
        $p = get_post($id);
        $out[] = ['id' => $id, 'slug' => $p->post_name, 'status' => $p->post_status, 'rev2' => get_post_meta($id, '_artes_rev2', true)];
      }
      return $out;
    `);
    r.forEach((x) => console.log(`${x.id} | ${x.slug.padEnd(28)} | ${x.status} | _artes_rev2=${x.rev2 || '0'}`));
  } else {
    console.error('uso: fase5-pagine.js --costruisci|--parita|--stato [--solo ...]');
    process.exit(2);
  }
})().catch((e) => { console.error(e.message); process.exit(1); });
