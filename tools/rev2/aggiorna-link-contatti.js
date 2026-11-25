'use strict';
// Aggiorna tutti i link/pulsanti/voci di menu Contatti della rev2 (Header 557, Footer 971, 9 pagine statiche,
// 4 template CPT) verso la pagina pubblicata `/contatti/`, usando la pipeline ufficiale `html2elementor.js` +
// `mappa-link.json` + `dinamici.js` (100% ripetibile, idempotente, con backup e rollback completo).
//
//   node tools/rev2/aggiorna-link-contatti.js --piano [--solo header,footer,376] [--salva-comp]
//   node tools/rev2/aggiorna-link-contatti.js --esegui [--solo ...]
//   node tools/rev2/aggiorna-link-contatti.js --stato
//   node tools/rev2/aggiorna-link-contatti.js --rollback [percorso-backup.json]
//
// VINCOLI:
//   - NON tocca Theme Builder conditions (`557`/`971` restano su `include/general`), SEO meta, `_artes_rev2`,
//     WPML/EN, `[Riserva]` (539-541), bozze (152-154, 471, 472, 491) né allegati media.
//   - Nel Footer 971 preserva `tel:+390984462039` e i link `Privacy · Cookie · MEPA` introdotti in Fase 6.

const fs = require('fs');
const path = require('path');
const { parse, trova, testo, classi } = require('./html-parse');
const { converti, risolviLink } = require('./html2elementor');
const dinamici = require('./dinamici');

const root = path.resolve(__dirname, '..', '..');
const rev2Dir = root;
const modelliDir = path.join(__dirname, 'modelli');
const outDir = path.join(root, 'tools', 'out', 'rev2');
const compDir = path.join(outDir, 'comp');
const REV_FILE_DEFAULT = path.join(outDir, 'link-contatti-revisions.json');

const FOOTER_PRIVACY_SRC = '<span>Privacy · Cookie · MEPA</span>';
const FOOTER_PRIVACY_DST = '<span><a href="/privacy-policy/">Privacy</a> · <a href="/cookie-policy/">Cookie</a> · <a href="/arredamento-ufficio/">MEPA</a></span>';
const HEADER_LANG_DESKTOP_SRC = '<span class="topbar__lang">IT / EN</span>';
const HEADER_LANG_DESKTOP_DST = '<span class="topbar__lang" data-dyn="lingue">IT / EN</span>';
const HEADER_CONTATTI_MOBILE_SRC = '<a href="#contatti" class="mobile-nav__sec">Contatti</a>';
const HEADER_CONTATTI_MOBILE_DST = '<a href="#contatti" class="mobile-nav__sec">Contatti</a>\n      <span class="mobile-nav__sec topbar__lang" data-dyn="lingue">IT / EN</span>';

function preparaHtmlHeader(html) {
  if (!html.includes(HEADER_LANG_DESKTOP_SRC)) {
    throw new Error(`Header sorgente senza "${HEADER_LANG_DESKTOP_SRC}"`);
  }
  if (!html.includes(HEADER_CONTATTI_MOBILE_SRC)) {
    throw new Error(`Header sorgente senza "${HEADER_CONTATTI_MOBILE_SRC}"`);
  }
  return html
    .replace(HEADER_LANG_DESKTOP_SRC, HEADER_LANG_DESKTOP_DST)
    .replace(HEADER_CONTATTI_MOBILE_SRC, HEADER_CONTATTI_MOBILE_DST);
}

const DOCUMENTI = [
  // Site part globali (da artes-sito-rev2/index.html, identici su tutte le 49 pagine rev2)
  { id: 557, tipo: 'header', nome: 'header', etichetta: 'Header globale', sorgente: path.join(rev2Dir, 'index.html'), fileLog: 'header (index.html)', compFile: 'header.json' },
  { id: 971, tipo: 'footer', nome: 'footer', etichetta: 'Footer globale', sorgente: path.join(rev2Dir, 'index.html'), fileLog: 'footer (index.html)', compFile: 'footer.json' },
  // 9 pagine statiche rev2 (Fase 5)
  { id: 376, tipo: 'pagina', nome: 'home', etichetta: 'Home', sorgente: path.join(modelliDir, 'home.html'), fileLog: 'index.html', dinamico: true, compFile: 'pagina-home.json' },
  { id: 144, tipo: 'pagina', nome: 'arredamento-ufficio', etichetta: 'Arredo uffici e workspace', sorgente: path.join(rev2Dir, 'arredamento-ufficio.html'), fileLog: 'arredamento-ufficio.html', compFile: 'pagina-arredamento-ufficio.json' },
  { id: 145, tipo: 'pagina', nome: 'arredo-negozi', etichetta: 'Arredo negozi e retail', sorgente: path.join(rev2Dir, 'arredo-negozi.html'), fileLog: 'arredo-negozi.html', compFile: 'pagina-arredo-negozi.json' },
  { id: 146, tipo: 'pagina', nome: 'arredo-negozi-food', etichetta: 'Arredo negozi food', sorgente: path.join(rev2Dir, 'arredo-negozi-food.html'), fileLog: 'arredo-negozi-food.html', compFile: 'pagina-arredo-negozi-food.json' },
  { id: 147, tipo: 'pagina', nome: 'arredamento-bar-ristoranti', etichetta: 'Arredo bar e ristoranti', sorgente: path.join(rev2Dir, 'arredamento-bar-ristoranti.html'), fileLog: 'arredamento-bar-ristoranti.html', compFile: 'pagina-arredamento-bar-ristoranti.json' },
  { id: 148, tipo: 'pagina', nome: 'arredamento-hotel', etichetta: 'Arredo hotel e hospitality', sorgente: path.join(rev2Dir, 'arredamento-hotel.html'), fileLog: 'arredamento-hotel.html', compFile: 'pagina-arredamento-hotel.json' },
  { id: 149, tipo: 'pagina', nome: 'arredamento-su-misura', etichetta: 'Arredo su misura', sorgente: path.join(rev2Dir, 'arredamento-su-misura.html'), fileLog: 'arredamento-su-misura.html', compFile: 'pagina-arredamento-su-misura.json' },
  { id: 150, tipo: 'pagina', nome: 'contract', etichetta: 'Arredo Contract', sorgente: path.join(rev2Dir, 'contract.html'), fileLog: 'contract.html', compFile: 'pagina-contract.json' },
  { id: 151, tipo: 'pagina', nome: 'chi-siamo', etichetta: 'Chi siamo', sorgente: path.join(rev2Dir, 'chi-siamo.html'), fileLog: 'chi-siamo.html', compFile: 'pagina-chi-siamo.json' },
  // 4 template CPT (Fase 4)
  { id: 1040, tipo: 'cpt', nome: 'realizzazione', etichetta: 'Template Singolo Realizzazione', sorgente: path.join(modelliDir, 'realizzazione.html'), fileLog: 'realizzazione.html', dinamico: true, compFile: 'modello-realizzazione.json' },
  { id: 1049, tipo: 'cpt', nome: 'brand', etichetta: 'Template Singolo Brand', sorgente: path.join(modelliDir, 'brand.html'), fileLog: 'brand.html', dinamico: true, compFile: 'modello-brand.json' },
  { id: 1050, tipo: 'cpt', nome: 'archivio-realizzazioni', etichetta: 'Template Archivio Realizzazioni', sorgente: path.join(modelliDir, 'archivio-realizzazioni.html'), fileLog: 'archivio-realizzazioni.html', dinamico: true, compFile: 'modello-archivio-realizzazioni.json' },
  { id: 1051, tipo: 'cpt', nome: 'archivio-brand', etichetta: 'Template Archivio Brand', sorgente: path.join(modelliDir, 'archivio-brand.html'), fileLog: 'archivio-brand.html', dinamico: true, compFile: 'modello-archivio-brand.json' },
];

// Avviso informativo noto del convertitore (non è un errore): <p> con link classato diventa div.rev2-p.
const AVVISO_BENIGNO_RE = /con elementi classati: diventa div \(classe rev2-p\)$/;

async function phpConDati(nv, codicePhp, dati) {
  const b64 = Buffer.from(JSON.stringify(dati), 'utf8').toString('base64');
  return nv.php(`$D = json_decode(base64_decode('${b64}'), true);\n${codicePhp}`);
}

function estraiLinkDaComposizione(composizione) {
  const out = [];
  for (const [elId, cfg] of Object.entries(composizione.element_config || {})) {
    if (cfg && cfg.link && typeof cfg.link.destination === 'string') {
      out.push({ elId, dest: cfg.link.destination, fonte: 'widget' });
    }
    if (cfg && typeof cfg.paragraph === 'string' && cfg.paragraph.includes('href=')) {
      for (const m of cfg.paragraph.matchAll(/href="([^"]*)"/g)) {
        out.push({ elId, dest: m[1], fonte: 'inline' });
      }
    }
  }
  return out;
}

function classificaOrigine(hrefOrig) {
  const h = (hrefOrig || '').trim();
  if (h === '#contatti') return '#contatti';
  if (h === '#' || h === '') return '# (segnaposto)';
  if (/^mailto:/i.test(h)) return 'mailto: CTA';
  return h;
}

function costruisciDocumento(doc) {
  let html = fs.readFileSync(doc.sorgente, 'utf8');
  if (doc.tipo === 'header') {
    html = preparaHtmlHeader(html);
  }
  if (doc.tipo === 'footer') {
    if (!html.includes(FOOTER_PRIVACY_SRC)) {
      throw new Error(`Footer sorgente senza "${FOOTER_PRIVACY_SRC}"`);
    }
    html = html.replace(FOOTER_PRIVACY_SRC, FOOTER_PRIVACY_DST);
  }
  const { radice, avvisi: avvisiParser } = parse(html);
  const tagTarget = doc.tipo === 'header' ? 'header' : (doc.tipo === 'footer' ? 'footer' : 'main');
  const nodo = trova(radice, (n) => n.tag === tagTarget)[0];
  if (!nodo) throw new Error(`${doc.nome}: tag <${tagTarget}> non trovato in ${doc.sorgente}`);

  // Audit dei link sorgente che verranno convertiti in /contatti/
  const linkConvertiti = [];
  for (const a of trova(nodo, (n) => n.tag === 'a')) {
    if (a.attr['data-dyn-href']) continue;
    const hrefOrig = (a.attr.href || '').trim();
    const txt = testo(a).replace(/\s+/g, ' ').trim();
    const risolto = risolviLink(hrefOrig, txt, doc.fileLog, []);
    if (risolto === '/contatti/') {
      linkConvertiti.push({
        origine: classificaOrigine(hrefOrig),
        hrefOrig,
        testo: txt,
        classi: (a.attr.class || '').trim(),
      });
    }
  }

  // Conversione ufficiale tramite html2elementor.js
  const opzioni = doc.tipo === 'header'
    ? { file: doc.fileLog, dinamici }
    : (doc.tipo === 'footer'
      ? { file: doc.fileLog }
      : { file: doc.fileLog, soloFigli: true, radice: { classi: ['page-root', ...classi(nodo)] }, ...(doc.dinamico ? { dinamici } : {}) });

  const r = converti(nodo, opzioni);
  const avvisiCritici = [...avvisiParser, ...r.avvisi.filter((a) => !AVVISO_BENIGNO_RE.test(a))];
  const avvisiInfo = r.avvisi.filter((a) => AVVISO_BENIGNO_RE.test(a));

  // Controllo post-conversione sulla composizione generata
  const linkComp = estraiLinkDaComposizione(r.composizione);
  const destContatti = linkComp.filter((x) => x.dest === '/contatti/');
  const residuiHashContatti = linkComp.filter((x) => x.dest === '#contatti');
  const residuiMailto = linkComp.filter((x) => /^mailto:/i.test(x.dest));
  const linkTel = linkComp.filter((x) => /^tel:/i.test(x.dest));

  if (destContatti.length !== linkConvertiti.length) {
    throw new Error(`${doc.nome} (${doc.id}): discordanza conteggio /contatti/ (sorgente=${linkConvertiti.length}, composizione=${destContatti.length})`);
  }
  if (residuiHashContatti.length > 0) {
    throw new Error(`${doc.nome} (${doc.id}): trovati ${residuiHashContatti.length} link residui a #contatti`);
  }
  if (doc.tipo === 'header') {
    let lingueDesktop = 0;
    let lingueMobile = 0;
    for (const [elId, cfg] of Object.entries(r.composizione.element_config || {})) {
      if (cfg && cfg.paragraph && typeof cfg.paragraph === 'object' && cfg.paragraph.name === 'shortcode' && cfg.paragraph.settings && cfg.paragraph.settings.shortcode === '[artes_lingue]') {
        const cl = (r.composizione.classes && r.composizione.classes[elId]) || [];
        if (cl.includes('mobile-nav__sec') && cl.includes('topbar__lang')) lingueMobile++;
        else if (cl.includes('topbar__lang')) lingueDesktop++;
      }
      if (cfg && typeof cfg.paragraph === 'string' && /IT\s*\/\s*EN/.test(cfg.paragraph)) {
        throw new Error(`Header (${doc.id}): testo statico "IT / EN" residuo in ${elId}`);
      }
    }
    if (lingueDesktop !== 1 || lingueMobile !== 1) {
      throw new Error(`Header (${doc.id}): [artes_lingue] atteso 1 desktop + 1 mobile (trovati desktop=${lingueDesktop}, mobile=${lingueMobile})`);
    }
  }
  if (doc.tipo === 'footer') {
    const destSet = new Set(linkComp.map((x) => x.dest));
    for (const richiesto of ['tel:+390984462039', '/privacy-policy/', '/cookie-policy/', '/arredamento-ufficio/']) {
      if (!destSet.has(richiesto)) {
        throw new Error(`Footer (${doc.id}): link atteso mancante dopo conversione: ${richiesto}`);
      }
    }
  }

  return {
    doc,
    risultato: r,
    avvisiCritici,
    avvisiInfo,
    linkConvertiti,
    destContatti,
    residuiHashContatti,
    residuiMailto,
    linkTel,
  };
}

function selezionaDocumenti(args) {
  const i = args.indexOf('--solo');
  if (i < 0 || !args[i + 1]) return DOCUMENTI;
  const filtro = new Set(args[i + 1].split(',').map((s) => s.trim().toLowerCase()).filter(Boolean));
  const sel = DOCUMENTI.filter((d) => filtro.has(d.nome.toLowerCase()) || filtro.has(String(d.id)) || filtro.has(d.tipo));
  if (!sel.length) throw new Error(`Nessun documento corrisponde a --solo ${args[i + 1]}`);
  return sel;
}

function stampaPiano(builtList) {
  let totContatti = 0;
  let totHash = 0;
  let totSegnaposto = 0;
  let totMailtoCta = 0;
  let totCritici = 0;
  let totInfo = 0;
  let totElementi = 0;

  const perGruppo = { header: 0, footer: 0, pagina: 0, cpt: 0 };

  console.log('=== PIANO AGGIORNAMENTO LINK CONTATTI -> /contatti/ (OFFLINE) ===\n');
  for (const b of builtList) {
    const { doc, risultato, linkConvertiti, avvisiCritici, avvisiInfo, residuiMailto, linkTel } = b;
    totElementi += risultato.elementi;
    totCritici += avvisiCritici.length;
    totInfo += avvisiInfo.length;
    totContatti += linkConvertiti.length;
    perGruppo[doc.tipo] = (perGruppo[doc.tipo] || 0) + linkConvertiti.length;

    const cHash = linkConvertiti.filter((x) => x.origine === '#contatti').length;
    const cSeg = linkConvertiti.filter((x) => x.origine === '# (segnaposto)').length;
    const cMail = linkConvertiti.filter((x) => x.origine === 'mailto: CTA').length;
    totHash += cHash;
    totSegnaposto += cSeg;
    totMailtoCta += cMail;

    const extra = [];
    if (risultato.statistiche['e-accordion']) extra.push(`FAQ:${risultato.statistiche['e-accordion']}`);
    if (risultato.statistiche.ciclo) extra.push(`loop:${risultato.statistiche.ciclo}`);
    if (linkTel.length) extra.push(`tel:${linkTel.length}`);
    if (residuiMailto.length) extra.push(`mailto-residuo:${residuiMailto.length}`);

    console.log(
      `[${doc.tipo.padEnd(6)}] ${String(doc.id).padStart(4)} | ${doc.nome.padEnd(26)} | ${String(risultato.elementi).padStart(3)} el | ` +
      `/contatti/: ${linkConvertiti.length} (#contatti=${cHash}, #=${cSeg}, mailto=${cMail})` +
      (extra.length ? ` | ${extra.join(', ')}` : '') +
      ` | avvisi critici: ${avvisiCritici.length}`
    );
    for (const l of linkConvertiti) {
      console.log(`         - ${l.hrefOrig} -> /contatti/  ["${l.testo}"${l.classi ? `, .${l.classi.split(/\s+/).join('.')}` : ''}]`);
    }
    for (const a of avvisiCritici) console.log(`         ! AVVISO CRITICO: ${a}`);
  }

  console.log('\n=== RIEPILOGO ===');
  console.log(`Documenti analizzati: ${builtList.length} (elementi totali: ${totElementi})`);
  console.log(`Link collegati a /contatti/: ${totContatti} (Header: ${perGruppo.header}, Footer: ${perGruppo.footer}, Pagine statiche: ${perGruppo.pagina}, Template CPT: ${perGruppo.cpt})`);
  console.log(`  per origine: #contatti=${totHash}, # segnaposto=${totSegnaposto}, mailto: CTA=${totMailtoCta}`);
  console.log(`Link residui #contatti: 0`);
  console.log(`Avvisi critici: ${totCritici} (note informative rev2-p: ${totInfo})`);
  return { totContatti, totCritici };
}

async function svuotaCache(el, nv) {
  await el.call('elementor-clear-cache', {});
  await nv.php(`if (class_exists('\\Elementor\\Plugin')) { \\Elementor\\Plugin::$instance->files_manager->clear_cache(); } wp_cache_flush(); return true;`);
}

async function eseguiSuDev3(builtList) {
  const { connetti } = require('./mcp-client');
  const el = await connetti('elementor');
  const nv = await connetti('novamira');

  fs.mkdirSync(outDir, { recursive: true });
  const ids = builtList.map((b) => b.doc.id);

  // 1. Backup integrale _elementor_data (preserva sempre la prima fotografia pre-modifica)
  const snapshotLive = await phpConDati(nv, String.raw`
    $out = [];
    foreach ($D['ids'] as $id) {
      $id = (int) $id;
      $p = get_post($id);
      if (!$p) {
        throw new \RuntimeException("Documento non trovato su dev3: {$id}");
      }
      $out[(string) $id] = [
        'id' => $id,
        'post_type' => $p->post_type,
        'post_name' => $p->post_name,
        'post_status' => $p->post_status,
        'elementor_edit_mode' => get_post_meta($id, '_elementor_edit_mode', true),
        'elementor_data_raw' => get_post_meta($id, '_elementor_data', true),
      ];
    }
    return $out;
  `, { ids });

  const backup = fs.existsSync(REV_FILE_DEFAULT)
    ? JSON.parse(fs.readFileSync(REV_FILE_DEFAULT, 'utf8'))
    : { creato_il: new Date().toISOString(), documenti: {} };

  backup.ultimo_aggiornamento = new Date().toISOString();
  for (const b of builtList) {
    const key = String(b.doc.id);
    if (!backup.documenti[key]) {
      backup.documenti[key] = {
        id: b.doc.id,
        nome: b.doc.nome,
        tipo: b.doc.tipo,
        prima_esecuzione: snapshotLive[key],
      };
    }
  }
  fs.writeFileSync(REV_FILE_DEFAULT, JSON.stringify(backup, null, 2));
  console.log(`Backup salvato in ${path.relative(root, REV_FILE_DEFAULT)} (${Object.keys(backup.documenti).length} documenti).`);

  // 2. Scrittura e pubblicazione tramite Elementor MCP
  for (const b of builtList) {
    const { doc, risultato, linkConvertiti } = b;
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

    const entry = backup.documenti[String(doc.id)];
    if (!entry.prima_undo_revision_id) entry.prima_undo_revision_id = res.undo_revision_id;
    entry.ultimo_undo_revision_id = res.undo_revision_id;
    entry.link_contatti_attesi = linkConvertiti.length;
    entry.eseguito_il = new Date().toISOString();

    console.log(`OK  [${doc.tipo.padEnd(6)}] ${String(doc.id).padStart(4)} ${doc.nome.padEnd(26)} (${risultato.elementi} el, /contatti/=${linkConvertiti.length}, undo=${res.undo_revision_id})`);
  }

  fs.writeFileSync(REV_FILE_DEFAULT, JSON.stringify(backup, null, 2));

  // 3. Svuota cache Elementor + WordPress
  await svuotaCache(el, nv);
  console.log('Cache Elementor e WordPress svuotate.');

  // 4. Verifica immediata post-scrittura su _elementor_data live (fallisce se #contatti > 0 o conteggio non coincide)
  const attesiPerId = new Map(builtList.map((b) => [b.doc.id, b.linkConvertiti.length]));
  await stampaStatoDev3(builtList.map((b) => b.doc), nv, attesiPerId);
}

async function stampaStatoDev3(docs, nvEsistente, attesiPerId = null) {
  let nv = nvEsistente;
  if (!nv) {
    const { connetti } = require('./mcp-client');
    nv = await connetti('novamira');
  }
  const ids = docs.map((d) => d.id);
  const stato = await phpConDati(nv, String.raw`
    $estraiDestinazioni = function ($node, &$dests) use (&$estraiDestinazioni) {
      if (!is_array($node)) {
        return;
      }
      // 1. Elementor Atomic V4: ['$$type' => 'link', 'value' => ['destination' => ['$$type' => 'url', 'value' => '...']]]
      if (($node['$$type'] ?? '') === 'link' && is_array($node['value'] ?? null)) {
        $d = $node['value']['destination'] ?? null;
        if (is_array($d) && ($d['$$type'] ?? '') === 'url' && is_string($d['value'] ?? null)) {
          $dests[] = trim($d['value']);
          return;
        }
        if (is_string($d)) {
          $dests[] = trim($d);
          return;
        }
      }
      // 2. Forma piatta eventuale: ['destination' => '...'] o ['destination' => ['$$type' => 'url', 'value' => '...']]
      if (array_key_exists('destination', $node) && !isset($node['$$type'])) {
        $d = $node['destination'];
        if (is_string($d)) {
          $dests[] = trim($d);
        } elseif (is_array($d) && ($d['$$type'] ?? '') === 'url' && is_string($d['value'] ?? null)) {
          $dests[] = trim($d['value']);
        }
      }
      // 3. Link HTML inline dentro paragrafi/testi (escaped-html, string, html-v3)
      foreach ($node as $k => $v) {
        if ($k === 'destination') {
          continue;
        }
        if (is_string($v) && stripos($v, 'href=') !== false) {
          if (preg_match_all('/href=["\']([^"\']+)["\']/i', $v, $m)) {
            foreach ($m[1] as $h) {
              $dests[] = trim(html_entity_decode($h, ENT_QUOTES, 'UTF-8'));
            }
          }
        } elseif (is_array($v)) {
          $estraiDestinazioni($v, $dests);
        }
      }
    };

    $out = [];
    foreach ($D['ids'] as $id) {
      $id = (int) $id;
      $p = get_post($id);
      $raw = (string) get_post_meta($id, '_elementor_data', true);
      $albero = json_decode($raw, true);
      $dests = [];
      if (is_array($albero)) {
        $estraiDestinazioni($albero, $dests);
      }
      $contatti = 0;
      $hash = 0;
      $mailto = 0;
      $tel = 0;
      foreach ($dests as $u) {
        if ($u === '/contatti/' || $u === '/contatti') {
          $contatti++;
        } elseif ($u === '#contatti') {
          $hash++;
        } elseif (stripos($u, 'mailto:') === 0) {
          $mailto++;
        } elseif (stripos($u, 'tel:') === 0) {
          $tel++;
        }
      }
      $footerMancanti = [];
      if ($id === 971) {
        foreach (['/privacy-policy/', '/cookie-policy/', '/arredamento-ufficio/', 'tel:+390984462039'] as $req) {
          if (!in_array($req, $dests, true)) {
            $footerMancanti[] = $req;
          }
        }
      }
      $cond = get_post_meta($id, '_elementor_conditions', true);
      $out[] = [
        'id' => $id,
        'slug' => $p ? $p->post_name : 'MANCANTE',
        'status' => $p ? $p->post_status : 'missing',
        'json_ok' => is_array($albero),
        'contatti' => $contatti,
        'hash_contatti' => $hash,
        'mailto' => $mailto,
        'tel' => $tel,
        'footer_mancanti' => $footerMancanti,
        'cond' => is_array($cond) ? $cond : [],
      ];
    }
    return $out;
  `, { ids });

  const byId = new Map(docs.map((d) => [d.id, d]));
  let totContatti = 0;
  let totHash = 0;
  const erroriVerifica = [];
  console.log('\n=== STATO LIVE DEV3 ===');
  for (const r of stato) {
    const d = byId.get(r.id);
    const nome = d ? d.nome : r.slug;
    totContatti += r.contatti;
    totHash += r.hash_contatti;
    const extra = [];
    if (r.cond.length) extra.push(`cond=${JSON.stringify(r.cond)}`);
    if (r.id === 971) extra.push(r.footer_mancanti.length ? `FOOTER-MANCANTI=${JSON.stringify(r.footer_mancanti)}` : 'footer-links=OK');
    console.log(
      `${String(r.id).padStart(4)} | ${nome.padEnd(26)} | ${r.status.padEnd(7)} | ` +
      `/contatti/=${String(r.contatti).padStart(2)} | #contatti=${r.hash_contatti} | mailto=${r.mailto} | tel=${r.tel}` +
      (extra.length ? ` | ${extra.join(' | ')}` : '')
    );
    if (attesiPerId) {
      const atteso = attesiPerId.get(r.id);
      if (!r.json_ok) erroriVerifica.push(`${nome} (${r.id}): _elementor_data JSON non valido`);
      if (r.hash_contatti > 0) erroriVerifica.push(`${nome} (${r.id}): trovati ${r.hash_contatti} residui #contatti live`);
      if (atteso !== undefined && r.contatti !== atteso) {
        erroriVerifica.push(`${nome} (${r.id}): /contatti/ live=${r.contatti}, atteso=${atteso}`);
      }
      if (r.id === 971 && r.footer_mancanti.length) {
        erroriVerifica.push(`Footer (971): link obbligatori mancanti live: ${r.footer_mancanti.join(', ')}`);
      }
    }
  }
  console.log(`Totale live: /contatti/=${totContatti}, residui #contatti=${totHash}`);
  if (erroriVerifica.length) {
    throw new Error(`Verifica live post-scrittura fallita:\n  - ${erroriVerifica.join('\n  - ')}`);
  }
}

async function rollbackDaBackup(fileBackup) {
  if (!fs.existsSync(fileBackup)) {
    throw new Error(`File di backup non trovato: ${fileBackup}`);
  }
  const backup = JSON.parse(fs.readFileSync(fileBackup, 'utf8'));
  const entries = Object.values(backup.documenti || {});
  if (!entries.length) throw new Error('Nessun documento nel file di backup.');

  const { connetti } = require('./mcp-client');
  const el = await connetti('elementor');
  const nv = await connetti('novamira');

  const items = entries.map((e) => ({
    id: e.id,
    nome: e.nome,
    elementor_data_raw: e.prima_esecuzione.elementor_data_raw,
    elementor_edit_mode: e.prima_esecuzione.elementor_edit_mode || 'builder',
  }));

  const res = await phpConDati(nv, String.raw`
    $out = [];
    foreach ($D['items'] as $it) {
      $id = (int) $it['id'];
      update_post_meta($id, '_elementor_data', wp_slash((string) $it['elementor_data_raw']));
      update_post_meta($id, '_elementor_edit_mode', (string) $it['elementor_edit_mode']);
      delete_post_meta($id, '_elementor_css');
      clean_post_cache($id);
      $out[] = ['id' => $id, 'nome' => $it['nome'], 'bytes' => strlen((string) get_post_meta($id, '_elementor_data', true))];
    }
    return $out;
  `, { items });

  await svuotaCache(el, nv);
  console.log(`Rollback completato da ${path.relative(root, fileBackup)}:`);
  for (const r of res) console.log(`  RIPRISTINATO ${String(r.id).padStart(4)} ${r.nome.padEnd(26)} (${r.bytes} byte)`);
  console.log('Cache Elementor e WordPress svuotate.');
}

if (require.main === module) {
  (async () => {
    const args = process.argv.slice(2);
    const modePiano = args.includes('--piano');
    const modeEsegui = args.includes('--esegui');
    const modeStato = args.includes('--stato');
    const idxRollback = args.indexOf('--rollback');
    const modeRollback = idxRollback >= 0;

    if (!modePiano && !modeEsegui && !modeStato && !modeRollback) {
      console.error('Uso: aggiorna-link-contatti.js --piano | --esegui | --stato | --rollback [file] [--solo ...] [--salva-comp]');
      process.exit(2);
    }

    if (modeRollback) {
      const nextArg = args[idxRollback + 1];
      const fileBackup = (nextArg && !nextArg.startsWith('--')) ? path.resolve(root, nextArg) : REV_FILE_DEFAULT;
      await rollbackDaBackup(fileBackup);
      return;
    }

    const docs = selezionaDocumenti(args);

    if (modeStato) {
      await stampaStatoDev3(docs);
      return;
    }

    // Costruzione e validazione locale completa prima di qualsiasi scrittura
    const builtList = docs.map(costruisciDocumento);
    if (args.includes('--salva-comp')) {
      fs.mkdirSync(compDir, { recursive: true });
      for (const b of builtList) {
        fs.writeFileSync(path.join(compDir, b.doc.compFile), JSON.stringify(b.risultato.composizione, null, 1));
      }
      console.log(`Composizioni salvate in ${path.relative(root, compDir)} (${builtList.length} file).\n`);
    }

    const { totCritici } = stampaPiano(builtList);
    if (totCritici > 0) {
      throw new Error(`Trovati ${totCritici} avvisi critici di conversione: operazione interrotta.`);
    }

    if (modeEsegui) {
      console.log('\n=== ESECUZIONE SU DEV3 ===');
      await eseguiSuDev3(builtList);
    }
  })().catch((e) => {
    console.error('ERRORE:', e.message);
    process.exit(1);
  });
}

module.exports = {
  DOCUMENTI,
  preparaHtmlHeader,
  costruisciDocumento,
  estraiLinkDaComposizione,
  svuotaCache,
  phpConDati,
};
