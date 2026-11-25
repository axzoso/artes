'use strict';
// Genera le composizioni Elementor di header, footer e pagine della rev2 e (con --invia) le scrive su dev3.
//   node tools/rev2/costruisci.js header                       -> tools/out/rev2/comp/header.json
//   node tools/rev2/costruisci.js footer
//   node tools/rev2/costruisci.js pagina chi-siamo             -> tools/out/rev2/comp/pagina-chi-siamo.json
//   ... --invia <post_id>                                        scrive la composizione nel documento (replace_children)
//   ... --prova                                                  dry_run (nessuna scrittura)
// Header e footer sono identici in tutte le pagine rev2 (cambia solo la voce attiva, che gestisce il JavaScript): si
// prendono da index.html.
const fs = require('fs');
const path = require('path');
const { parse, trova, classi } = require('./html-parse');
const { converti } = require('./html2elementor');
const dinamici = require('./dinamici');

const HEADER_LANG_DESKTOP_SRC = '<span class="topbar__lang">IT / EN</span>';
const HEADER_LANG_DESKTOP_DST = '<span class="topbar__lang" data-dyn="lingue">IT / EN</span>';
const HEADER_CONTATTI_MOBILE_SRC = '<a href="#contatti" class="mobile-nav__sec">Contatti</a>';
const HEADER_CONTATTI_MOBILE_DST = '<a href="#contatti" class="mobile-nav__sec">Contatti</a>\n      <span class="mobile-nav__sec topbar__lang" data-dyn="lingue">IT / EN</span>';

const root = path.resolve(__dirname, '..', '..');
const rev2 = path.join(root, 'artes-sito-rev2');
const uscita = path.join(root, 'tools', 'out', 'rev2', 'comp');
fs.mkdirSync(uscita, { recursive: true });

const args = process.argv.slice(2);
const cosa = args[0]; const nome = cosa === 'pagina' ? args[1] : null;
const iv = args.indexOf('--invia'); const postId = iv >= 0 ? parseInt(args[iv + 1], 10) : null;
const prova = args.includes('--prova');

function carica(file) { const { radice, avvisi } = parse(fs.readFileSync(path.join(rev2, file), 'utf8')); if (avvisi.length) console.log('AVVISI parser', file, avvisi); return radice; }

let r; let etichetta;
if (cosa === 'header') {
  const raw = fs.readFileSync(path.join(rev2, 'index.html'), 'utf8');
  if (!raw.includes(HEADER_LANG_DESKTOP_SRC) || !raw.includes(HEADER_CONTATTI_MOBILE_SRC)) {
    throw new Error('Header sorgente (index.html) senza marcatori attesi per [artes_lingue]');
  }
  const html = raw
    .replace(HEADER_LANG_DESKTOP_SRC, HEADER_LANG_DESKTOP_DST)
    .replace(HEADER_CONTATTI_MOBILE_SRC, HEADER_CONTATTI_MOBILE_DST);
  const { radice, avvisi } = parse(html); if (avvisi.length) console.log('AVVISI parser header', avvisi);
  const h = trova(radice, (n) => n.tag === 'header')[0];
  r = converti(h, { file: 'header (index.html)', dinamici }); etichetta = 'header';
} else if (cosa === 'footer') {
  const html = fs.readFileSync(path.join(rev2, 'index.html'), 'utf8')
    .replace('<span>Privacy · Cookie · MEPA</span>', '<span><a href="/privacy-policy/">Privacy</a> · <a href="/cookie-policy/">Cookie</a> · <a href="/arredamento-ufficio/">MEPA</a></span>');
  const { radice, avvisi } = parse(html); if (avvisi.length) console.log('AVVISI parser footer', avvisi);
  const f = trova(radice, (n) => n.tag === 'footer')[0];
  r = converti(f, { file: 'footer (index.html)' }); etichetta = 'footer';
} else if (cosa === 'pagina') {
  const file = nome.endsWith('.html') ? nome : nome + '.html';
  const dom = carica(file); const m = trova(dom, (n) => n.tag === 'main')[0];
  // il <main> non si ricrea (lo mette il tema): una radice con la classe 'page-root' e le classi di <main>
  r = converti(m, { file, soloFigli: true, radice: { classi: ['page-root', ...classi(m)] } }); etichetta = 'pagina-' + nome.replace(/\.html$/, '');
} else { console.error('uso: costruisci.js header|footer|pagina <nome> [--invia <id>] [--prova]'); process.exit(1); }

fs.writeFileSync(path.join(uscita, etichetta + '.json'), JSON.stringify(r.composizione, null, 1));
console.log(`${etichetta}: ${r.elementi} elementi; widget: ${JSON.stringify(r.statistiche)}`);
if (r.avvisi.length) { console.log(`AVVISI (${r.avvisi.length}):`); r.avvisi.forEach((a) => console.log('  - ' + a)); }

if (postId) {
  const { connetti } = require('./mcp-client');
  (async () => {
    const el = await connetti('elementor');
    const richiesta = { post_id: postId, mode: 'replace_children', parent_id: 'document', ...r.composizione, ...(prova ? { dry_run: true } : {}) };
    const t = await el.call('elementor-build-composition', richiesta);
    let j; try { j = JSON.parse(t); } catch { j = t; }
    if (typeof j === 'string') console.log(prova ? 'DRY RUN:' : 'SCRITTO:', j.slice(0, 800)); else { console.log(prova ? 'DRY RUN:' : 'SCRITTO:', JSON.stringify({ status: j.status, root_element_ids: j.root_element_ids, undo_revision_id: j.undo_revision_id, validation: j.validation, errors: j.errors }).slice(0, 700)); (j.warnings || []).slice(0, 12).forEach((w) => console.log('  warning:', String(w).slice(0, 220))); if ((j.warnings || []).length > 12) console.log('  … altri', j.warnings.length - 12, 'avvisi'); }
  })().catch((e) => { console.error(e.message); process.exit(1); });
}
