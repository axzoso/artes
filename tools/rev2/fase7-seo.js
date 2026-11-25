'use strict';
// Fase 7 dell'adeguamento rev2 — SEO on-page (<title> e <meta name="description">):
//   node tools/rev2/fase7-seo.js --verifica-estrazione    offline: estrae le 49 pagine rev2 + 2 legali e verifica le formule CPT (0 scostamenti)
//   node tools/rev2/fase7-seo.js --applica                scrive su dev3 in modo idempotente (meta pagine, opzione archivi, WPML modo 2) + backup
//   node tools/rev2/fase7-seo.js --stato                  sola lettura: mostra versione artes-core, meta pagine, opzione archivi e WPML su dev3
//   node tools/rev2/fase7-seo.js --rollback [file]        ripristina lo stato precedente da tools/out/rev2/fase7-backup.json
const fs = require('fs');
const path = require('path');
const { parse, trova, testo, classi } = require('./html-parse');
const { connetti } = require('./mcp-client');

const root = path.resolve(__dirname, '..', '..');
const rev2Dir = root;
const outDir = path.join(root, 'tools', 'out', 'rev2');

const ENTITA = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
  mdash: '—', ndash: '–', hellip: '…', middot: '·',
  rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“', laquo: '«', raquo: '»',
  egrave: 'è', eacute: 'é', agrave: 'à', aacute: 'á', igrave: 'ì', iacute: 'í',
  ograve: 'ò', oacute: 'ó', ugrave: 'ù', uacute: 'ú',
  Egrave: 'È', Eacute: 'É', Agrave: 'À', Igrave: 'Ì', Ograve: 'Ò', Ugrave: 'Ù',
  copy: '©', reg: '®', trade: '™',
};

// Decodifica in un singolo passaggio: un'eventuale doppia codifica (&amp;amp;, &amp;#039;) rimane visibile.
function decodificaEntita(s) {
  return String(s || '').replace(/&(#x[0-9a-fA-F]+|#\d+|[a-zA-Z][a-zA-Z0-9]+);/g, (m, code) => {
    if (code.startsWith('#x') || code.startsWith('#X')) {
      const cp = parseInt(code.slice(2), 16);
      return Number.isFinite(cp) ? String.fromCodePoint(cp) : m;
    }
    if (code.startsWith('#')) {
      const cp = parseInt(code.slice(1), 10);
      return Number.isFinite(cp) ? String.fromCodePoint(cp) : m;
    }
    return Object.prototype.hasOwnProperty.call(ENTITA, code) ? ENTITA[code] : m;
  });
}

function pulisciTesto(s) {
  return decodificaEntita(s).replace(/\s+/g, ' ').trim();
}

function haEntitaResidue(s) {
  return /&(?:#x[0-9a-fA-F]+|#\d+|[a-zA-Z][a-zA-Z0-9]+);/.test(String(s || ''));
}

const PAGINE_STATICHE = [
  { nome: 'home', file: 'index.html', id: 376, slugWp: 'home', percorso: '/' },
  { nome: 'arredamento-ufficio', file: 'arredamento-ufficio.html', id: 144, slugWp: 'arredamento-ufficio', percorso: '/arredamento-ufficio/' },
  { nome: 'arredo-negozi', file: 'arredo-negozi.html', id: 145, slugWp: 'arredo-negozi', percorso: '/arredo-negozi/' },
  { nome: 'arredo-negozi-food', file: 'arredo-negozi-food.html', id: 146, slugWp: 'arredo-negozi-food', percorso: '/arredo-negozi-food/' },
  { nome: 'arredamento-bar-ristoranti', file: 'arredamento-bar-ristoranti.html', id: 147, slugWp: 'arredamento-bar-ristoranti', percorso: '/arredamento-bar-ristoranti/' },
  { nome: 'arredamento-hotel', file: 'arredamento-hotel.html', id: 148, slugWp: 'arredamento-hotel', percorso: '/arredamento-hotel/' },
  { nome: 'arredamento-su-misura', file: 'arredamento-su-misura.html', id: 149, slugWp: 'arredamento-su-misura', percorso: '/arredamento-su-misura/' },
  { nome: 'contract', file: 'contract.html', id: 150, slugWp: 'contract', percorso: '/contract/' },
  { nome: 'chi-siamo', file: 'chi-siamo.html', id: 151, slugWp: 'chi-siamo', percorso: '/chi-siamo/' },
];

const ARCHIVI_CPT = [
  { postType: 'realizzazione', file: 'realizzazioni.html', percorso: '/realizzazioni/' },
  { postType: 'brand', file: 'brand-partner.html', percorso: '/brand-partner/' },
];

const SEO_LEGALI = {
  'privacy-policy': {
    percorso: '/privacy-policy/',
    title: 'Privacy policy — Artes',
    description: 'Informativa sul trattamento dei dati personali di Artes srl ai sensi degli artt. 13 e 14 del Regolamento UE 2016/679 (GDPR).',
  },
  'cookie-policy': {
    percorso: '/cookie-policy/',
    title: 'Cookie policy — Artes',
    description: 'Informativa sui cookie di Artes srl: il sito usa solo strumenti tecnici, senza cookie di profilazione o analisi, e spiega come gestirli dal browser.',
  },
};

const uno = (n, fn) => (n ? trova(n, fn)[0] || null : null);
const tutti = (n, fn) => (n ? trova(n, fn) : []);
const tag = (t) => (n) => n.tag === t;
const cl = (c) => (n) => classi(n).includes(c);

function testoConBr(n) {
  if (!n) return '';
  if (n.tipo === 'testo') return n.testo;
  if (n.tipo !== 'el') return '';
  if (n.tag === 'br') return ' ';
  return n.figli.map(testoConBr).join('');
}

function estraiFileRev2(file, errori) {
  const html = fs.readFileSync(path.join(rev2Dir, file), 'utf8');
  const { radice } = parse(html);
  const head = uno(radice, tag('head')) || radice;
  const body = uno(radice, tag('body')) || radice;
  const titles = tutti(head, tag('title'));
  const descs = tutti(head, (n) => n.tag === 'meta' && (n.attr.name || '').toLowerCase() === 'description');
  const h1s = tutti(body, tag('h1'));
  const imgs = tutti(body, tag('img')).map((img) => ({
    src: img.attr.src || '',
    hasAlt: Object.prototype.hasOwnProperty.call(img.attr, 'alt'),
    alt: Object.prototype.hasOwnProperty.call(img.attr, 'alt') ? pulisciTesto(img.attr.alt) : null,
  }));

  if (titles.length !== 1) errori.push(`${file}: trovati ${titles.length} tag <title> (atteso 1)`);
  if (descs.length !== 1) errori.push(`${file}: trovati ${descs.length} tag <meta name="description"> (atteso 1)`);
  if (h1s.length !== 1) errori.push(`${file}: trovati ${h1s.length} tag <h1> (atteso 1)`);

  const title = titles[0] ? pulisciTesto(testo(titles[0])) : '';
  const description = descs[0] ? pulisciTesto(descs[0].attr.content || '') : '';
  const h1 = h1s[0] ? pulisciTesto(testoConBr(h1s[0])) : '';

  if (!title) errori.push(`${file}: <title> vuoto`);
  if (!description) errori.push(`${file}: <meta name="description"> vuoto`);
  if (haEntitaResidue(title)) errori.push(`${file}: entità HTML residua nel <title>: ${title}`);
  if (haEntitaResidue(description)) errori.push(`${file}: entità HTML residua nella description: ${description}`);

  return { radice, title, description, h1, immagini: imgs };
}

function estraiSeo() {
  const errori = [];
  const tuttiFile = fs.readdirSync(rev2Dir).filter((f) => f.endsWith('.html')).sort();
  if (tuttiFile.length !== 49) {
    errori.push(`Attesi 49 file HTML in artes-sito-rev2/, trovati ${tuttiFile.length}`);
  }

  const mappati = new Set();

  // 1. 9 pagine statiche rev2
  const statiche = PAGINE_STATICHE.map((p) => {
    mappati.add(p.file);
    const info = estraiFileRev2(p.file, errori);
    return {
      tipo: 'pagina',
      nome: p.nome,
      file: p.file,
      id: p.id,
      slugWp: p.slugWp,
      percorso: p.percorso,
      title: info.title,
      description: info.description,
      h1: info.h1,
      immagini: info.immagini,
    };
  });

  // 2. 2 archivi CPT rev2
  const archivi = ARCHIVI_CPT.map((a) => {
    mappati.add(a.file);
    const info = estraiFileRev2(a.file, errori);
    return {
      tipo: 'archivio',
      nome: `archivio-${a.postType}`,
      postType: a.postType,
      file: a.file,
      percorso: a.percorso,
      title: info.title,
      description: info.description,
      h1: info.h1,
      immagini: info.immagini,
    };
  });

  // 3. 20 realizzazioni (verifica formula: "{kw}: {titolo} — Artes" e "{titolo}, {localita}: {introduzione}")
  const fileRealizzazioni = tuttiFile.filter((f) => f.startsWith('realizzazione-'));
  const realizzazioni = fileRealizzazioni.map((file) => {
    mappati.add(file);
    const slug = file.replace(/^realizzazione-/, '').replace(/\.html$/, '');
    const info = estraiFileRev2(file, errori);
    const main = uno(info.radice, tag('main')) || info.radice;
    const titolo = pulisciTesto(testo(uno(main, tag('h1')) || { tipo: 'testo', testo: '' }));
    const kw = pulisciTesto(testo(uno(main, cl('caso__kw')) || { tipo: 'testo', testo: '' }));
    const leadNode = uno(main, (n) => n.tag === 'p' && classi(n).includes('lead'));
    const introduzione = leadNode ? pulisciTesto(testo(leadNode)) : '';
    let localita = '';
    for (const d of tutti(uno(main, cl('caso-facts')), tag('div'))) {
      const dt = uno(d, tag('dt'));
      const dd = uno(d, tag('dd'));
      if (dt && dd && pulisciTesto(testo(dt)) === 'Località') {
        localita = pulisciTesto(testo(dd));
      }
    }
    const formulaTitle = `${kw}: ${titolo} — Artes`;
    const formulaDescription = `${titolo}, ${localita}: ${introduzione}`;
    const eccezioneTitle = info.title !== formulaTitle;
    const eccezioneDescription = info.description !== formulaDescription;
    if (eccezioneTitle) errori.push(`realizzazione/${slug}: scostamento formula title ("${info.title}" != "${formulaTitle}")`);
    if (eccezioneDescription) errori.push(`realizzazione/${slug}: scostamento formula description ("${info.description}" != "${formulaDescription}")`);

    return {
      tipo: 'realizzazione',
      nome: `realizzazione-${slug}`,
      slug,
      file,
      percorso: `/realizzazioni/${slug}/`,
      titolo,
      kw,
      localita,
      introduzione,
      title: info.title,
      description: info.description,
      formulaTitle,
      formulaDescription,
      eccezioneTitle,
      eccezioneDescription,
      h1: info.h1,
      immagini: info.immagini,
    };
  });

  // 4. 18 brand (verifica formula: "{titolo} — Brand partner Artes" e "{titolo}, brand partner Artes per la categoria {categoria}: ...")
  const fileBrand = tuttiFile.filter((f) => /^brand-.+\.html$/.test(f) && f !== 'brand-partner.html');
  const brand = fileBrand.map((file) => {
    mappati.add(file);
    const slug = file.replace(/^brand-/, '').replace(/\.html$/, '');
    const info = estraiFileRev2(file, errori);
    const main = uno(info.radice, tag('main')) || info.radice;
    const titolo = pulisciTesto(testo(uno(main, tag('h1')) || { tipo: 'testo', testo: '' }));
    let categoria = '';
    for (const s of tutti(uno(main, cl('specs__list')), cl('spec'))) {
      const dt = uno(s, tag('dt'));
      const dd = uno(s, tag('dd'));
      if (dt && dd && pulisciTesto(testo(dt)) === 'Categoria') {
        categoria = pulisciTesto(testo(dd));
      }
    }
    const formulaTitle = `${titolo} — Brand partner Artes`;
    const formulaDescription = `${titolo}, brand partner Artes per la categoria ${categoria}: dove lo usiamo, come lo coordiniamo con gli arredi su misura e le realizzazioni collegate.`;
    const eccezioneTitle = info.title !== formulaTitle;
    const eccezioneDescription = info.description !== formulaDescription;
    if (eccezioneTitle) errori.push(`brand/${slug}: scostamento formula title ("${info.title}" != "${formulaTitle}")`);
    if (eccezioneDescription) errori.push(`brand/${slug}: scostamento formula description ("${info.description}" != "${formulaDescription}")`);

    return {
      tipo: 'brand',
      nome: `brand-${slug}`,
      slug,
      file,
      percorso: `/brand-partner/${slug}/`,
      titolo,
      categoria,
      title: info.title,
      description: info.description,
      formulaTitle,
      formulaDescription,
      eccezioneTitle,
      eccezioneDescription,
      h1: info.h1,
      immagini: info.immagini,
    };
  });

  // Verifica copertura 100% dei file in artes-sito-rev2/
  const nonMappati = tuttiFile.filter((f) => !mappati.has(f));
  if (nonMappati.length) errori.push(`File rev2 non classificati: ${nonMappati.join(', ')}`);

  // 5. 2 pagine legali (Privacy 3, Cookie 493) da tools/contenuti-pagine-legali.json
  const legaliJson = JSON.parse(fs.readFileSync(path.join(root, 'tools', 'contenuti-pagine-legali.json'), 'utf8'));
  const legali = Object.entries(SEO_LEGALI).map(([slug, seo]) => {
    const def = legaliJson[slug];
    if (!def || !def.id) errori.push(`contenuti-pagine-legali.json: voce mancante per ${slug}`);
    if (haEntitaResidue(seo.title)) errori.push(`${slug}: entità HTML residua nel title`);
    if (haEntitaResidue(seo.description)) errori.push(`${slug}: entità HTML residua nella description`);
    return {
      tipo: 'legale',
      nome: slug,
      file: null,
      id: def ? def.id : 0,
      slugWp: slug,
      percorso: seo.percorso,
      title: seo.title,
      description: seo.description,
      h1: def ? pulisciTesto(String(def.h1 || '').replace(/<[^>]+>/g, ' ')) : '',
      immagini: null,
    };
  });

  const tutte = [...statiche, ...archivi, ...realizzazioni, ...brand, ...legali];
  const lenT = tutte.map((x) => x.title.length);
  const lenD = tutte.map((x) => x.description.length);

  const statistiche = {
    totaleRev2: statiche.length + archivi.length + realizzazioni.length + brand.length,
    totaleConLegali: tutte.length,
    statiche: statiche.length,
    archivi: archivi.length,
    realizzazioni: realizzazioni.length,
    brand: brand.length,
    legali: legali.length,
    eccezioniRealizzazioni: realizzazioni.filter((r) => r.eccezioneTitle || r.eccezioneDescription).length,
    eccezioniBrand: brand.filter((b) => b.eccezioneTitle || b.eccezioneDescription).length,
    titleLen: { min: Math.min(...lenT), max: Math.max(...lenT) },
    descriptionLen: { min: Math.min(...lenD), max: Math.max(...lenD) },
  };

  return { statiche, archivi, realizzazioni, brand, legali, tutte, errori, statistiche };
}

async function phpConDati(nv, codice, dati = {}) {
  const b64 = Buffer.from(JSON.stringify(dati), 'utf8').toString('base64');
  return nv.php(`$D = json_decode(base64_decode('${b64}'), true);\n${codice}`);
}

function percorsoBackupNuovo() {
  fs.mkdirSync(outDir, { recursive: true });
  const base = path.join(outDir, 'fase7-backup.json');
  if (!fs.existsSync(base)) return base;
  for (let n = 2; ; n++) {
    const p = path.join(outDir, `fase7-backup-${n}.json`);
    if (!fs.existsSync(p)) return p;
  }
}

async function eseguiApplica() {
  const dati = estraiSeo();
  if (dati.errori.length) {
    console.error('ERRORE estrazione/formule, applicazione annullata:');
    dati.errori.forEach((e) => console.error('  - ' + e));
    process.exit(1);
  }

  const nv = await connetti('novamira');

  const pagineMeta = [...dati.statiche, ...dati.legali].map((p) => ({
    id: p.id,
    nome: p.nome,
    slug: p.slugWp,
    title: p.title,
    description: p.description,
  }));

  const overrideCpt = [
    ...dati.realizzazioni.filter((r) => r.eccezioneTitle || r.eccezioneDescription).map((r) => ({
      postType: 'realizzazione',
      slug: r.slug,
      title: r.eccezioneTitle ? r.title : null,
      description: r.eccezioneDescription ? r.description : null,
    })),
    ...dati.brand.filter((b) => b.eccezioneTitle || b.eccezioneDescription).map((b) => ({
      postType: 'brand',
      slug: b.slug,
      title: b.eccezioneTitle ? b.title : null,
      description: b.eccezioneDescription ? b.description : null,
    })),
  ];

  const archiviOpt = {};
  for (const a of dati.archivi) {
    archiviOpt[a.postType] = { title: a.title, description: a.description };
  }

  // 1. Backup dello stato precedente su dev3 prima di qualsiasi scrittura
  const statoPrima = await phpConDati(nv, String.raw`
    $out = ['versione_plugin' => defined('ARTES_CORE_VERSION') ? ARTES_CORE_VERSION : null, 'pagine' => [], 'override_cpt' => [], 'opzione_archivi' => null, 'wpml' => []];
    foreach ($D['pagine'] as $p) {
      $id = (int) $p['id'];
      $post = get_post($id);
      if (!$post) { $out['pagine'][$id] = ['trovato' => false]; continue; }
      $out['pagine'][$id] = [
        'trovato' => true,
        'slug' => $post->post_name,
        'status' => $post->post_status,
        'has_title' => metadata_exists('post', $id, '_artes_seo_title'),
        'title' => get_post_meta($id, '_artes_seo_title', true),
        'has_description' => metadata_exists('post', $id, '_artes_seo_description'),
        'description' => get_post_meta($id, '_artes_seo_description', true),
      ];
    }
    foreach ($D['override_cpt'] as $ov) {
      $posts = get_posts(['post_type' => $ov['postType'], 'name' => $ov['slug'], 'post_status' => ['publish', 'draft', 'pending', 'private'], 'numberposts' => 1, 'suppress_filters' => true]);
      if ($posts) {
        $id = (int) $posts[0]->ID;
        $out['override_cpt'][$id] = [
          'post_type' => $ov['postType'],
          'slug' => $ov['slug'],
          'has_title' => metadata_exists('post', $id, '_artes_seo_title'),
          'title' => get_post_meta($id, '_artes_seo_title', true),
          'has_description' => metadata_exists('post', $id, '_artes_seo_description'),
          'description' => get_post_meta($id, '_artes_seo_description', true),
        ];
      }
    }
    $sentinel = '__ARTES_OPT_MISSING__';
    $curOpt = get_option('artes_seo_archives', $sentinel);
    $out['opzione_archivi'] = [
      'esiste' => ($curOpt !== $sentinel),
      'valore' => ($curOpt !== $sentinel) ? $curOpt : null,
    ];
    global $sitepress;
    if ($sitepress) {
      $tm = $sitepress->get_setting('translation-management', []);
      $cf = $tm['custom_fields_translation'] ?? [];
      foreach (['_artes_seo_title', '_artes_seo_description'] as $k) {
        $out['wpml'][$k] = array_key_exists($k, $cf) ? $cf[$k] : null;
      }
    }
    return $out;
  `, { pagine: pagineMeta, override_cpt: overrideCpt });

  const backupPath = percorsoBackupNuovo();
  fs.writeFileSync(backupPath, JSON.stringify({ quando: new Date().toISOString(), ...statoPrima }, null, 2));
  console.log(`Backup salvato in ${path.relative(root, backupPath)} (plugin attivo: ${statoPrima.versione_plugin || 'sconosciuto'})`);

  // 2. Scrittura idempotente su dev3
  const esito = await phpConDati(nv, String.raw`
    $out = ['pagine' => [], 'override_cpt' => [], 'opzione_archivi' => false, 'wpml' => []];
    foreach ($D['pagine'] as $p) {
      $id = (int) $p['id'];
      $post = get_post($id);
      if (!$post) { $out['pagine'][$id] = 'ERRORE: post non trovato'; continue; }
      update_post_meta($id, '_artes_seo_title', wp_slash($p['title']));
      update_post_meta($id, '_artes_seo_description', wp_slash($p['description']));
      $out['pagine'][$id] = [
        'slug' => $post->post_name,
        'title_ok' => (get_post_meta($id, '_artes_seo_title', true) === $p['title']),
        'desc_ok' => (get_post_meta($id, '_artes_seo_description', true) === $p['description']),
      ];
    }
    foreach ($D['override_cpt'] as $ov) {
      $posts = get_posts(['post_type' => $ov['postType'], 'name' => $ov['slug'], 'post_status' => ['publish', 'draft', 'pending', 'private'], 'numberposts' => 1, 'suppress_filters' => true]);
      if (!$posts) { $out['override_cpt'][$ov['slug']] = 'ERRORE: post CPT non trovato'; continue; }
      $id = (int) $posts[0]->ID;
      if ($ov['title'] !== null) { update_post_meta($id, '_artes_seo_title', wp_slash($ov['title'])); }
      if ($ov['description'] !== null) { update_post_meta($id, '_artes_seo_description', wp_slash($ov['description'])); }
      $out['override_cpt'][$id] = 'ok';
    }
    update_option('artes_seo_archives', $D['archivi'], true);
    $out['opzione_archivi'] = (get_option('artes_seo_archives') === $D['archivi']);

    global $sitepress;
    if ($sitepress) {
      $tm = $sitepress->get_setting('translation-management', []);
      $cf = $tm['custom_fields_translation'] ?? [];
      $cf['_artes_seo_title'] = 2;
      $cf['_artes_seo_description'] = 2;
      $tm['custom_fields_translation'] = $cf;
      $sitepress->set_setting('translation-management', $tm, true);
      $out['wpml'] = ['_artes_seo_title' => 2, '_artes_seo_description' => 2];
    }
    if (class_exists('\Elementor\Plugin')) {
      \Elementor\Plugin::$instance->files_manager->clear_cache();
    }
    wp_cache_flush();
    return $out;
  `, { pagine: pagineMeta, override_cpt: overrideCpt, archivi: archiviOpt });

  let erroriScrittura = 0;
  for (const [id, info] of Object.entries(esito.pagine)) {
    if (typeof info === 'string' || !info.title_ok || !info.desc_ok) {
      console.error(`ERRORE pagina ${id}:`, info);
      erroriScrittura++;
    } else {
      console.log(`OK  pagina ${String(id).padEnd(4)} (${info.slug})`);
    }
  }
  console.log(`Opzione artes_seo_archives: ${esito.opzione_archivi ? 'OK (realizzazione, brand)' : 'ERRORE'}`);
  console.log(`Override CPT scritti: ${Object.keys(esito.override_cpt || {}).length}`);
  console.log(`WPML custom_fields_translation: ${JSON.stringify(esito.wpml)}`);
  console.log('Cache Elementor e WP svuotate.');

  if (erroriScrittura || !esito.opzione_archivi) process.exit(1);
}

async function eseguiStato() {
  const dati = estraiSeo();
  const nv = await connetti('novamira');
  const ids = [...dati.statiche, ...dati.legali].map((p) => p.id);
  const res = await phpConDati(nv, String.raw`
    $pagine = [];
    foreach ($D['ids'] as $id) {
      $p = get_post((int) $id);
      $pagine[$id] = [
        'slug' => $p ? $p->post_name : null,
        'status' => $p ? $p->post_status : null,
        'title' => get_post_meta((int) $id, '_artes_seo_title', true),
        'description' => get_post_meta((int) $id, '_artes_seo_description', true),
      ];
    }
    global $sitepress;
    $cf = $sitepress ? ($sitepress->get_setting('translation-management', [])['custom_fields_translation'] ?? []) : [];
    return [
      'versione_plugin' => defined('ARTES_CORE_VERSION') ? ARTES_CORE_VERSION : null,
      'pagine' => $pagine,
      'archivi' => get_option('artes_seo_archives', null),
      'wpml' => [
        '_artes_seo_title' => $cf['_artes_seo_title'] ?? null,
        '_artes_seo_description' => $cf['_artes_seo_description'] ?? null,
      ],
    ];
  `, { ids });

  console.log(`Plugin artes-core su dev3: ${res.versione_plugin || 'non attivo'}`);
  console.log(`WPML: ${JSON.stringify(res.wpml)}`);
  console.log(`Opzione artes_seo_archives: ${res.archivi ? Object.keys(res.archivi).join(', ') : '(non impostata)'}`);
  for (const p of [...dati.statiche, ...dati.legali]) {
    const cur = res.pagine[p.id] || {};
    const tOk = cur.title === p.title;
    const dOk = cur.description === p.description;
    console.log(`${tOk && dOk ? 'OK  ' : 'DIFF'} ${String(p.id).padEnd(4)} ${(cur.slug || p.nome).padEnd(28)} T:${tOk ? 'OK' : 'DIFF'} D:${dOk ? 'OK' : 'DIFF'}`);
  }
}

async function eseguiRollback(fileArg) {
  const backupFile = fileArg ? path.resolve(root, fileArg) : path.join(outDir, 'fase7-backup.json');
  if (!fs.existsSync(backupFile)) {
    console.error(`File di backup non trovato: ${backupFile}`);
    process.exit(1);
  }
  const bk = JSON.parse(fs.readFileSync(backupFile, 'utf8'));
  const nv = await connetti('novamira');
  const res = await phpConDati(nv, String.raw`
    $out = ['pagine' => 0, 'override_cpt' => 0, 'opzione_archivi' => null, 'wpml' => 0];
    foreach (($D['pagine'] ?? []) as $id => $info) {
      if (empty($info['trovato'])) { continue; }
      $id = (int) $id;
      if (!empty($info['has_title'])) { update_post_meta($id, '_artes_seo_title', wp_slash((string) $info['title'])); }
      else { delete_post_meta($id, '_artes_seo_title'); }
      if (!empty($info['has_description'])) { update_post_meta($id, '_artes_seo_description', wp_slash((string) $info['description'])); }
      else { delete_post_meta($id, '_artes_seo_description'); }
      $out['pagine']++;
    }
    foreach (($D['override_cpt'] ?? []) as $id => $info) {
      $id = (int) $id;
      if (!empty($info['has_title'])) { update_post_meta($id, '_artes_seo_title', wp_slash((string) $info['title'])); }
      else { delete_post_meta($id, '_artes_seo_title'); }
      if (!empty($info['has_description'])) { update_post_meta($id, '_artes_seo_description', wp_slash((string) $info['description'])); }
      else { delete_post_meta($id, '_artes_seo_description'); }
      $out['override_cpt']++;
    }
    if (!empty($D['opzione_archivi']['esiste'])) {
      update_option('artes_seo_archives', $D['opzione_archivi']['valore'], true);
      $out['opzione_archivi'] = 'ripristinata';
    } else {
      delete_option('artes_seo_archives');
      $out['opzione_archivi'] = 'eliminata';
    }
    global $sitepress;
    if ($sitepress && is_array($D['wpml'] ?? null)) {
      $tm = $sitepress->get_setting('translation-management', []);
      $cf = $tm['custom_fields_translation'] ?? [];
      foreach ($D['wpml'] as $k => $v) {
        if ($v === null) { unset($cf[$k]); } else { $cf[$k] = $v; }
        $out['wpml']++;
      }
      $tm['custom_fields_translation'] = $cf;
      $sitepress->set_setting('translation-management', $tm, true);
    }
    if (class_exists('\Elementor\Plugin')) {
      \Elementor\Plugin::$instance->files_manager->clear_cache();
    }
    wp_cache_flush();
    return $out;
  `, bk);
  console.log(`Rollback completato da ${path.relative(root, backupFile)}:`, JSON.stringify(res));
}

if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.includes('--verifica-estrazione')) {
    const dati = estraiSeo();
    const s = dati.statistiche;
    console.log(`Estratte ${s.totaleRev2} pagine rev2 (${s.statiche} statiche, ${s.archivi} archivi, ${s.realizzazioni} realizzazioni, ${s.brand} brand) + ${s.legali} legali = ${s.totaleConLegali} pagine totali.`);
    console.log(`Formula CPT realizzazione: ${s.realizzazioni - s.eccezioniRealizzazioni}/${s.realizzazioni} conformi (${s.eccezioniRealizzazioni} eccezioni).`);
    console.log(`Formula CPT brand:         ${s.brand - s.eccezioniBrand}/${s.brand} conformi (${s.eccezioniBrand} eccezioni).`);
    console.log(`Lunghezza <title>:         min ${s.titleLen.min}, max ${s.titleLen.max} caratteri.`);
    console.log(`Lunghezza description:     min ${s.descriptionLen.min}, max ${s.descriptionLen.max} caratteri.`);
    if (args.includes('--dettaglio')) {
      for (const p of dati.tutte) {
        console.log(`\n[${p.tipo}] ${p.percorso}`);
        console.log(`  T (${p.title.length}): ${p.title}`);
        console.log(`  D (${p.description.length}): ${p.description}`);
      }
    }
    if (dati.errori.length) {
      console.error(`\nERRORI (${dati.errori.length}):`);
      dati.errori.forEach((e) => console.error('  - ' + e));
      process.exit(1);
    }
    console.log('\nVerifica estrazione OK: 0 scostamenti.');
  } else if (args.includes('--applica')) {
    eseguiApplica().catch((e) => { console.error(e.message); process.exit(1); });
  } else if (args.includes('--stato')) {
    eseguiStato().catch((e) => { console.error(e.message); process.exit(1); });
  } else if (args.includes('--rollback')) {
    const idx = args.indexOf('--rollback');
    const fileArg = args[idx + 1] && !args[idx + 1].startsWith('--') ? args[idx + 1] : '';
    eseguiRollback(fileArg).catch((e) => { console.error(e.message); process.exit(1); });
  } else {
    console.error('uso: fase7-seo.js --verifica-estrazione [--dettaglio] | --applica | --stato | --rollback [file]');
    process.exit(2);
  }
}

module.exports = {
  decodificaEntita,
  pulisciTesto,
  haEntitaResidue,
  estraiSeo,
  PAGINE_STATICHE,
  ARCHIVI_CPT,
  SEO_LEGALI,
};
