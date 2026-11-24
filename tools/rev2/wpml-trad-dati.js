'use strict';
// Traduzione EN (en-gb) idempotente di Tassonomie, CPT (realizzazione, brand), Relazioni JetEngine
// e WPML String Translation su dev3, con validazione offline completa, backup incrementale e rollback chirurgico.
//
//   node tools/rev2/wpml-trad-dati.js --piano
//   node tools/rev2/wpml-trad-dati.js --stato
//   node tools/rev2/wpml-trad-dati.js --esegui [--solo tax|realizzazioni|brand|relazioni|stringhe]
//   node tools/rev2/wpml-trad-dati.js --rollback [percorso-backup.json]
//
// Fonti dati:
//   - tools/rev2/traduzioni/en-dati.json   (dataset EN autoritativo)
//   - tools/out/rev2/dati-rev2.json        (sorgente IT per controlli di parita 1:1)
// Backup:
//   - tools/out/rev2/wpml-trad-dati-backup.json
//
// Regole WPML rispettate:
//   - Lingua sorgente: 'it' | Lingua destinazione: 'en-gb' (prefisso URL '/en/', locale 'en_GB').
//   - Termini EN: slug '<slug_it>-en' (zero collisioni in wp_terms), trid condiviso con il termine IT
//     su element_id = term_taxonomy_id, copia esplicita dei 5 term meta (ordine, pagina, settore,
//     ordine_pagina, ordine_filtro).
//   - CPT EN (20 realizzazione, 18 brand): stesso post_name canonico dell'IT sotto /en/realizzazioni/<slug>/
//     e /en/brand-partner/<slug>/, trid condiviso con il post IT, copia esplicita di menu_order,
//     _thumbnail_id, _artes_rev2, localita, galleria, home_ordine, home_larghezza e assegnazione termini EN.
//   - Relazioni JetEngine (rel_id = 3): 8 righe EN<->EN in wpgm_jet_rel_default (le 8 IT<->IT restano intatte).
//   - WPML String Translation: admin_texts_artes_seo_archives (4), WP/Tagline (1), artes-core (57),
//     garantendo language='it' sulla sorgente prima di registrare la traduzione 'en-gb' (status=10).

const fs = require('fs');
const path = require('path');
const M = require('./modello-dati');

const root = path.resolve(__dirname, '..', '..');
const EN_DATI_PATH = path.join(root, 'tools', 'rev2', 'traduzioni', 'en-dati.json');
const IT_DATI_PATH = path.join(root, 'tools', 'out', 'rev2', 'dati-rev2.json');
const OUT_DIR = path.join(root, 'tools', 'out', 'rev2');
const BACKUP_FILE_DEFAULT = path.join(OUT_DIR, 'wpml-trad-dati-backup.json');

const LANG_IT = 'it';
const LANG_EN = 'en-gb';
const SOLO_VALIDI = ['tax', 'realizzazioni', 'brand', 'relazioni', 'stringhe'];

// Glossario EN canonico concordato tra dati (audit-i18n) e pagine/template (trad-pagine)
const GLOSSARIO_SETTORI_EN = {
  uffici: { nome: 'Office and workspace furniture', nome_breve: 'Offices & workspace' },
  retail: { nome: 'Retail and store furniture', nome_breve: 'Retail & stores' },
  'bar-ristoranti': { nome: 'Bar and restaurant furniture', nome_breve: 'Bars & restaurants' },
  food: { nome: 'Food retail furniture', nome_breve: 'Food stores' },
  hospitality: { nome: 'Hotel and hospitality furniture', nome_breve: 'Hotels & hospitality' },
};

const GLOSSARIO_CAT_BRAND_EN = {
  ufficio: 'Office',
  contract: 'Contract',
  acustica: 'Acoustics',
  'pareti-e-pod': 'Partitions & pods',
  sedute: 'Seating',
  retail: 'Retail',
  food: 'Food',
  outdoor: 'Outdoor',
};

const VOID_HTML_TAGS = new Set(['br', 'hr', 'img', 'input', 'meta', 'link']);

// Pattern di residui italiani che non devono mai apparire nei testi tradotti in EN
const PATTERN_RESIDUI_IT = [
  /\bArredo\s+(?:uffici|negozi|bar|hotel)/i,
  /\buffici e workspace\b/i,
  /\bnegozi e retail\b/i,
  /\bbar e ristoranti\b/i,
  /\bnegozi food\b/i,
  /\bhotel e hospitality\b/i,
  /\bSelezione,\s*capitolato\b/i,
  /\bGaranzia e ricambi\b/i,
  /\bRealizzazioni di arredi\b/i,
  /\bBrand partner Artes\b/i,
  /\bUsiamo\s+[A-Z]/,
  /\bLo trovi in\b/i,
  /\bè uno dei brand partner\b/i,
  /\bper la categoria\b/i,
  /\babbiamo\s+(?:seguito|fornito|realizzato|curato|progettato)\b/i,
];

// Indirizzi inglesi (tools/rev2/wpml-url-en.js): slug EN dei termini e link interni dei campi HTML.
const URL_EN = require('./wpml-url-en');
function localizzaHref(html) {
  return String(html).replace(/href=(["'])([^"']*)\1/gi, (full, q, url) => 'href=' + q + URL_EN.localizzaUrl(url) + q);
}
function slugEnCategoria(c) { return URL_EN.terminiEn().categoria[c.slug]; }
function localizzaDatasetEn(en) {
  const T = URL_EN.terminiEn();
  for (const x of en.settori) { x.slug_en = T.settore[x.codice]; x.url_en = URL_EN.localizzaUrl(x.url_en); }
  for (const x of en.categorie) x.slug_en = T.categoria[x.slug];
  for (const x of en.categorie_brand) x.slug_en = T.categoria_brand[x.slug];
  for (const gruppo of [en.realizzazioni, en.brand]) for (const r of gruppo) for (const k of Object.keys(r)) if (typeof r[k] === 'string' && /href=/.test(r[k])) r[k] = localizzaHref(r[k]);
  return en;
}

function caricaJson(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File non trovato: ${path.relative(root, filePath)}`);
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function estraiLinkHtml(html) {
  const out = [];
  const s = String(html || '');
  const re = /<a\s+href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi;
  let m;
  while ((m = re.exec(s)) !== null) {
    out.push({ href: m[1], testo: m[2] });
  }
  return out;
}

function controllaTagHtmlBilanciati(html) {
  const s = String(html || '');
  const errori = [];
  const stack = [];
  const re = /<\/?([a-zA-Z][a-zA-Z0-9]*)(?:\s+[^<>]*?)?\s*\/?>/g;
  let m;
  let idx = 0;

  while ((m = re.exec(s)) !== null) {
    const tra = s.slice(idx, m.index);
    if (tra.includes('<') || tra.includes('>')) {
      errori.push(`carattere '<' o '>' isolato vicino a "${tra.trim().slice(0, 40)}"`);
    }
    idx = re.lastIndex;

    const full = m[0];
    const tag = m[1].toLowerCase();
    const isClose = full.startsWith('</');
    const isSelf = full.endsWith('/>') || VOID_HTML_TAGS.has(tag);

    if (isClose) {
      if (!stack.length || stack[stack.length - 1] !== tag) {
        errori.push(`tag di chiusura </${tag}> non bilanciato (stack: [${stack.join(', ')}])`);
      } else {
        stack.pop();
      }
    } else if (!isSelf) {
      stack.push(tag);
    }
  }

  const resto = s.slice(idx);
  if (resto.includes('<') || resto.includes('>')) {
    errori.push(`carattere '<' o '>' isolato in coda "${resto.trim().slice(0, 40)}"`);
  }
  if (stack.length) {
    errori.push(`tag non chiusi: [${stack.join(', ')}]`);
  }
  if (/&(?:amp;amp|#0*39|quot|#x[0-9a-f]+);/i.test(s)) {
    errori.push('entita HTML residua o doppiamente codificata');
  }
  return errori;
}

function haResiduiIt(testo) {
  const s = String(testo || '');
  for (const re of PATTERN_RESIDUI_IT) {
    if (re.test(s)) return re.toString();
  }
  return null;
}

function validaOffline(enDati, itDati) {
  const errori = [];
  const avvisi = [];

  const stats = {
    settori: 0,
    categorie: 0,
    categorie_brand: 0,
    realizzazioni: 0,
    brand: 0,
    relazioni: 0,
    stringhe_seo_archivi: 0,
    stringhe_wp: 0,
    stringhe_artes_core: 0,
    link_html_totali: 0,
    link_html_en: 0,
    link_html_it_residui: 0,
    campi_html_controllati: 0,
    tag_sbilanciati: 0,
  };

  // 0. Meta
  const meta = enDati.meta || {};
  if (meta.lang_code !== LANG_EN) errori.push(`meta.lang_code atteso "${LANG_EN}", trovato "${meta.lang_code}"`);
  if (meta.source_lang !== LANG_IT) errori.push(`meta.source_lang atteso "${LANG_IT}", trovato "${meta.source_lang}"`);
  if (meta.locale !== 'en_GB') errori.push(`meta.locale atteso "en_GB", trovato "${meta.locale}"`);
  if (meta.url_prefix !== '/en/') errori.push(`meta.url_prefix atteso "/en/", trovato "${meta.url_prefix}"`);

  // 1. Settori (5)
  const enSettori = Array.isArray(enDati.settori) ? enDati.settori : [];
  const itSettori = Array.isArray(itDati.settori) ? itDati.settori : [];
  stats.settori = enSettori.length;
  if (enSettori.length !== itSettori.length || enSettori.length !== 5) {
    errori.push(`settori: attesi 5 (IT=${itSettori.length}), trovati ${enSettori.length}`);
  }
  const mapEnSettori = new Map();
  const slugEnSettoriVisti = new Set();
  for (const s of enSettori) {
    if (!s.codice) { errori.push('settore senza codice'); continue; }
    if (mapEnSettori.has(s.codice)) errori.push(`settore duplicato: ${s.codice}`);
    mapEnSettori.set(s.codice, s);
    if (!s.slug_en || s.slug_en !== URL_EN.terminiEn().settore[s.codice] || s.slug_en === s.codice) {
      errori.push(`settore/${s.codice}: slug_en non valido ("${s.slug_en}")`);
    }
    if (slugEnSettoriVisti.has(s.slug_en)) errori.push(`settore slug_en duplicato: ${s.slug_en}`);
    slugEnSettoriVisti.add(s.slug_en);

    const g = GLOSSARIO_SETTORI_EN[s.codice];
    if (!g) {
      errori.push(`settore/${s.codice}: assente dal glossario canonico`);
    } else {
      if (s.nome !== g.nome) errori.push(`settore/${s.codice}: nome "${s.nome}" != glossario "${g.nome}"`);
      if (s.nome_breve !== g.nome_breve) errori.push(`settore/${s.codice}: nome_breve "${s.nome_breve}" != glossario "${g.nome_breve}"`);
    }
    const pagAttesa = M.PAGINE_SETTORE[s.codice];
    if (s.pagina_it_slug !== pagAttesa) errori.push(`settore/${s.codice}: pagina_it_slug "${s.pagina_it_slug}" != "${pagAttesa}"`);
    if (s.url_en !== URL_EN.localizzaUrl(`/${pagAttesa}/`)) errori.push(`settore/${s.codice}: url_en "${s.url_en}" != "${URL_EN.localizzaUrl(`/${pagAttesa}/`)}"`);
  }
  for (const itS of itSettori) {
    const enS = mapEnSettori.get(itS.codice);
    if (!enS) { errori.push(`settore IT mancante in EN: ${itS.codice}`); continue; }
    if (enS.ordine !== itS.ordine) errori.push(`settore/${itS.codice}: ordine EN (${enS.ordine}) != IT (${itS.ordine})`);
  }

  // 2. Categorie (26)
  const enCat = Array.isArray(enDati.categorie) ? enDati.categorie : [];
  const itCat = itSettori.flatMap((s) => s.categorie.map((c) => ({ ...c, settore: s.codice })));
  stats.categorie = enCat.length;
  if (enCat.length !== itCat.length || enCat.length !== 26) {
    errori.push(`categorie: attese 26 (IT=${itCat.length}), trovate ${enCat.length}`);
  }
  const mapEnCat = new Map();
  const slugEnCatVisti = new Set();
  for (const c of enCat) {
    if (!c.slug) { errori.push('categoria senza slug'); continue; }
    if (mapEnCat.has(c.slug)) errori.push(`categoria duplicata: ${c.slug}`);
    mapEnCat.set(c.slug, c);
    if (!c.slug_en || slugEnCategoria(c) !== c.slug_en || c.slug_en === c.slug) {
      errori.push(`categoria/${c.slug}: slug_en non valido ("${c.slug_en}")`);
    }
    if (slugEnCatVisti.has(c.slug_en)) errori.push(`categoria slug_en duplicato: ${c.slug_en}`);
    slugEnCatVisti.add(c.slug_en);
    if (!String(c.nome || '').trim()) errori.push(`categoria/${c.slug}: nome vuoto`);
    if (!String(c.descrizione || '').trim()) errori.push(`categoria/${c.slug}: descrizione vuota`);
    if (!mapEnSettori.has(c.settore)) errori.push(`categoria/${c.slug}: settore sconosciuto "${c.settore}"`);
    const leakN = haResiduiIt(c.nome);
    const leakD = haResiduiIt(c.descrizione);
    if (leakN) errori.push(`categoria/${c.slug}.nome: residuo IT (${leakN})`);
    if (leakD) errori.push(`categoria/${c.slug}.descrizione: residuo IT (${leakD})`);
  }
  for (const itC of itCat) {
    const enC = mapEnCat.get(itC.slug);
    if (!enC) { errori.push(`categoria IT mancante in EN: ${itC.slug}`); continue; }
    if (enC.settore !== itC.settore) errori.push(`categoria/${itC.slug}: settore EN (${enC.settore}) != IT (${itC.settore})`);
    if (enC.ordine_pagina !== itC.ordinePagina) errori.push(`categoria/${itC.slug}: ordine_pagina EN (${enC.ordine_pagina}) != IT (${itC.ordinePagina})`);
    if (enC.ordine_filtro !== itC.ordineFiltro) errori.push(`categoria/${itC.slug}: ordine_filtro EN (${enC.ordine_filtro}) != IT (${itC.ordineFiltro})`);
  }

  // 3. Categorie brand (8)
  const enCb = Array.isArray(enDati.categorie_brand) ? enDati.categorie_brand : [];
  const itCb = Array.isArray(itDati.categorieBrand) ? itDati.categorieBrand : [];
  stats.categorie_brand = enCb.length;
  if (enCb.length !== itCb.length || enCb.length !== 8) {
    errori.push(`categorie_brand: attese 8 (IT=${itCb.length}), trovate ${enCb.length}`);
  }
  const mapEnCb = new Map();
  const slugEnCbVisti = new Set();
  for (const cb of enCb) {
    if (!cb.slug) { errori.push('categoria_brand senza slug'); continue; }
    if (mapEnCb.has(cb.slug)) errori.push(`categoria_brand duplicata: ${cb.slug}`);
    mapEnCb.set(cb.slug, cb);
    if (!cb.slug_en || cb.slug_en !== URL_EN.terminiEn().categoria_brand[cb.slug] || cb.slug_en === cb.slug) {
      errori.push(`categoria_brand/${cb.slug}: slug_en non valido ("${cb.slug_en}")`);
    }
    if (slugEnCbVisti.has(cb.slug_en)) errori.push(`categoria_brand slug_en duplicato: ${cb.slug_en}`);
    slugEnCbVisti.add(cb.slug_en);
    const att = GLOSSARIO_CAT_BRAND_EN[cb.slug];
    if (!att) errori.push(`categoria_brand/${cb.slug}: assente dal glossario canonico`);
    else if (cb.nome !== att) errori.push(`categoria_brand/${cb.slug}: nome "${cb.nome}" != glossario "${att}"`);
  }
  for (const itItem of itCb) {
    const enItem = mapEnCb.get(itItem.slug);
    if (!enItem) { errori.push(`categoria_brand IT mancante in EN: ${itItem.slug}`); continue; }
    if (enItem.ordine !== itItem.ordine) errori.push(`categoria_brand/${itItem.slug}: ordine EN (${enItem.ordine}) != IT (${itItem.ordine})`);
  }

  // Helper verifica campo HTML rispetto all'IT
  const verificaCampoHtml = (etichetta, htmlEn, htmlIt) => {
    stats.campi_html_controllati++;
    const tagErr = controllaTagHtmlBilanciati(htmlEn);
    if (tagErr.length) {
      stats.tag_sbilanciati += tagErr.length;
      errori.push(`${etichetta}: HTML non valido (${tagErr.join('; ')})`);
    }
    const leak = haResiduiIt(htmlEn);
    if (leak) errori.push(`${etichetta}: possibile residuo IT (${leak})`);

    const linksIt = estraiLinkHtml(htmlIt);
    const linksEn = estraiLinkHtml(htmlEn);
    stats.link_html_totali += linksEn.length;

    for (const l of linksEn) {
      if (!String(l.testo || '').trim()) {
        errori.push(`${etichetta}: anchor link vuoto per href="${l.href}"`);
      }
      if (l.href.startsWith('/') && !l.href.startsWith('/en/')) {
        stats.link_html_it_residui++;
        errori.push(`${etichetta}: link interno privo di prefisso /en/: "${l.href}"`);
      } else if (l.href.startsWith('/en/')) {
        stats.link_html_en++;
      }
    }

    if (linksIt.length !== linksEn.length) {
      errori.push(`${etichetta}: numero link EN (${linksEn.length}) != IT (${linksIt.length})`);
    } else {
      for (let i = 0; i < linksIt.length; i++) {
        const hrefIt = linksIt[i].href;
        const attesoEn = URL_EN.localizzaUrl(hrefIt);
        if (linksEn[i].href !== attesoEn) {
          errori.push(`${etichetta}: link[${i}] href="${linksEn[i].href}", atteso "${attesoEn}" (da IT "${hrefIt}")`);
        }
      }
    }
  };

  // 4. Realizzazioni (20)
  const enReal = Array.isArray(enDati.realizzazioni) ? enDati.realizzazioni : [];
  const itReal = Array.isArray(itDati.realizzazioni) ? itDati.realizzazioni : [];
  stats.realizzazioni = enReal.length;
  if (enReal.length !== itReal.length || enReal.length !== 20) {
    errori.push(`realizzazioni: attese 20 (IT=${itReal.length}), trovate ${enReal.length}`);
  }
  const mapEnReal = new Map();
  for (const r of enReal) {
    if (!r.slug) { errori.push('realizzazione senza slug'); continue; }
    if (mapEnReal.has(r.slug)) errori.push(`realizzazione duplicata: ${r.slug}`);
    mapEnReal.set(r.slug, r);
  }
  for (const itR of itReal) {
    const r = mapEnReal.get(itR.slug);
    if (!r) { errori.push(`realizzazione IT mancante in EN: ${itR.slug}`); continue; }
    if (r.ordine !== itR.ordine) errori.push(`realizzazione/${itR.slug}: ordine EN (${r.ordine}) != IT (${itR.ordine})`);
    if (r.settore !== itR.settore) errori.push(`realizzazione/${itR.slug}: settore EN (${r.settore}) != IT (${itR.settore})`);
    if (r.categoria !== itR.categoria) errori.push(`realizzazione/${itR.slug}: categoria EN (${r.categoria}) != IT (${itR.categoria})`);
    if (r.titolo !== itR.titolo) errori.push(`realizzazione/${itR.slug}: titolo modificato ("${r.titolo}" != "${itR.titolo}")`);
    if (r.localita !== itR.localita) errori.push(`realizzazione/${itR.slug}: localita modificata ("${r.localita}" != "${itR.localita}")`);

    for (const campo of ['kw', 'introduzione', 'tipologia', 'descrizione_lead', 'descrizione_testo']) {
      if (!String(r[campo] || '').trim()) {
        errori.push(`realizzazione/${itR.slug}.${campo}: campo obbligatorio vuoto`);
      }
      const leak = haResiduiIt(r[campo]);
      if (leak) errori.push(`realizzazione/${itR.slug}.${campo}: possibile residuo IT (${leak})`);
    }
    const itProg = String(itR.progettista || '').trim();
    const enProg = String(r.progettista || '').trim();
    if (Boolean(itProg) !== Boolean(enProg)) {
      errori.push(`realizzazione/${itR.slug}.progettista: presenza disallineata (IT="${itProg}", EN="${enProg}")`);
    }
    const itBf = itR.brandForniture ? String(itR.brandForniture.html || '') : '';
    const enBf = String(r.brand_forniture || '');
    if (Boolean(itBf.trim()) !== Boolean(enBf.trim())) {
      errori.push(`realizzazione/${itR.slug}.brand_forniture: presenza disallineata`);
    }
    verificaCampoHtml(`realizzazione/${itR.slug}.brand_forniture`, enBf, itBf);
    verificaCampoHtml(`realizzazione/${itR.slug}.descrizione_lead`, r.descrizione_lead, itR.descrizione[0].html);
    verificaCampoHtml(
      `realizzazione/${itR.slug}.descrizione_testo`,
      r.descrizione_testo,
      itR.descrizione.slice(1).map((d) => d.html).join('\n\n')
    );

    const seoT = `${r.kw}: ${r.titolo} — Artes`;
    const seoD = `${r.titolo}, ${r.localita}: ${r.introduzione}`;
    if (seoT.length > 90) avvisi.push(`realizzazione/${itR.slug}: SEO title lungo (${seoT.length} car.)`);
    if (seoD.length > 200) avvisi.push(`realizzazione/${itR.slug}: SEO description lunga (${seoD.length} car.)`);
  }

  // 5. Brand (18)
  const enBrand = Array.isArray(enDati.brand) ? enDati.brand : [];
  const itBrand = Array.isArray(itDati.brand) ? itDati.brand : [];
  stats.brand = enBrand.length;
  if (enBrand.length !== itBrand.length || enBrand.length !== 18) {
    errori.push(`brand: attesi 18 (IT=${itBrand.length}), trovati ${enBrand.length}`);
  }
  const mapEnBrand = new Map();
  for (const b of enBrand) {
    if (!b.slug) { errori.push('brand senza slug'); continue; }
    if (mapEnBrand.has(b.slug)) errori.push(`brand duplicato: ${b.slug}`);
    mapEnBrand.set(b.slug, b);
  }
  for (const itB of itBrand) {
    const b = mapEnBrand.get(itB.slug);
    if (!b) { errori.push(`brand IT mancante in EN: ${itB.slug}`); continue; }
    const catSlugIt = M.slugify(itB.categoria);
    if (b.ordine !== itB.ordine) errori.push(`brand/${itB.slug}: ordine EN (${b.ordine}) != IT (${itB.ordine})`);
    if (b.categoria_brand !== catSlugIt) errori.push(`brand/${itB.slug}: categoria_brand EN (${b.categoria_brand}) != IT (${catSlugIt})`);
    if (b.titolo !== itB.titolo) errori.push(`brand/${itB.slug}: titolo modificato ("${b.titolo}" != "${itB.titolo}")`);

    for (const campo of ['introduzione', 'settori_artes', 'fornitura_artes', 'assistenza', 'come_lavoriamo', 'dove_lo_usiamo']) {
      if (!String(b[campo] || '').trim()) {
        errori.push(`brand/${itB.slug}.${campo}: campo obbligatorio vuoto`);
      }
      const leak = haResiduiIt(b[campo]);
      if (leak) errori.push(`brand/${itB.slug}.${campo}: possibile residuo IT (${leak})`);
    }

    verificaCampoHtml(`brand/${itB.slug}.introduzione`, b.introduzione, itB.introduzione);
    verificaCampoHtml(`brand/${itB.slug}.settori_artes`, b.settori_artes, itB.settoriArtes.html);
    verificaCampoHtml(`brand/${itB.slug}.come_lavoriamo`, b.come_lavoriamo, itB.sezioni[0].paragrafi[0].html);
    verificaCampoHtml(`brand/${itB.slug}.dove_lo_usiamo`, b.dove_lo_usiamo, itB.sezioni[1].paragrafi[0].html);
  }

  // Conteggio esatto atteso: 100 link interni EN (8 brand_forniture + 92 brand)
  if (stats.link_html_en !== 100 || stats.link_html_totali !== 100) {
    errori.push(`link HTML inline: attesi esattamente 100 link /en/..., trovati totali=${stats.link_html_totali}, en=${stats.link_html_en}`);
  }

  // 6. Relazioni (8)
  const enRel = Array.isArray(enDati.relazioni) ? enDati.relazioni : [];
  const itRel = Array.isArray(itDati.relazioni) ? itDati.relazioni : [];
  stats.relazioni = enRel.length;
  if (enRel.length !== itRel.length || enRel.length !== 8) {
    errori.push(`relazioni: attese 8 (IT=${itRel.length}), trovate ${enRel.length}`);
  }
  const setItRel = new Set(itRel.map((p) => `${p[0]}|${p[1]}`));
  const setEnRel = new Set();
  for (const p of enRel) {
    if (!Array.isArray(p) || p.length !== 2) { errori.push(`relazione malformata: ${JSON.stringify(p)}`); continue; }
    const k = `${p[0]}|${p[1]}`;
    if (setEnRel.has(k)) errori.push(`relazione duplicata: ${k}`);
    setEnRel.add(k);
    if (!setItRel.has(k)) errori.push(`relazione non presente in IT: ${k}`);
    if (!mapEnReal.has(p[0])) errori.push(`relazione ${k}: realizzazione sconosciuta "${p[0]}"`);
    if (!mapEnBrand.has(p[1])) errori.push(`relazione ${k}: brand sconosciuto "${p[1]}"`);
  }

  // 7. WPML String Translation
  const ws = enDati.wpml_strings || {};
  const seoArch = Array.isArray(ws.artes_seo_archives) ? ws.artes_seo_archives : [];
  const wpOpts = Array.isArray(ws.wp_options) ? ws.wp_options : [];
  const acStr = Array.isArray(ws.artes_core) ? ws.artes_core : [];
  stats.stringhe_seo_archivi = seoArch.length;
  stats.stringhe_wp = wpOpts.length;
  stats.stringhe_artes_core = acStr.length;

  if (seoArch.length !== 4) errori.push(`wpml_strings.artes_seo_archives: attese 4 voci, trovate ${seoArch.length}`);
  if (wpOpts.length !== 1) errori.push(`wpml_strings.wp_options: attesa 1 voce (Tagline), trovate ${wpOpts.length}`);
  if (acStr.length < 50) errori.push(`wpml_strings.artes_core: attese >=50 voci, trovate ${acStr.length}`);

  const nomiStVisti = new Set();
  for (const [grpName, arr] of [
    ['artes_seo_archives', seoArch],
    ['wp_options', wpOpts],
    ['artes_core', acStr],
  ]) {
    for (const s of arr) {
      const idKey = `${s.context}::${s.name}`;
      if (!s.context || !s.name) errori.push(`wpml_strings.${grpName}: context o name mancante`);
      if (nomiStVisti.has(idKey)) errori.push(`wpml_strings.${grpName}: chiave duplicata ${idKey}`);
      nomiStVisti.add(idKey);
      if (!String(s.it || '').trim() || !String(s.en || '').trim()) {
        errori.push(`wpml_strings.${grpName}/${s.name}: it o en vuoto`);
      }
      const tagErr = controllaTagHtmlBilanciati(s.en);
      if (tagErr.length) errori.push(`wpml_strings.${grpName}/${s.name}: HTML non valido (${tagErr.join('; ')})`);
      const leak = haResiduiIt(s.en);
      if (leak) errori.push(`wpml_strings.${grpName}/${s.name}: possibile residuo IT (${leak})`);
    }
  }

  return { errori, avvisi, stats };
}

function stampaPiano(enDati, validazione) {
  const { errori, avvisi, stats } = validazione;
  console.log('=== PIANO TRADUZIONE EN DATI (OFFLINE, 0 SCRITTURE SU DEV3) ===\n');
  console.log(`Dataset EN: ${path.relative(root, EN_DATI_PATH)}`);
  console.log(`Sorgente IT: ${path.relative(root, IT_DATI_PATH)}`);
  console.log(`Lingua WPML: ${enDati.meta.source_lang} -> ${enDati.meta.lang_code} (locale ${enDati.meta.locale}, URL ${enDati.meta.url_prefix})\n`);

  console.log('COPERTURA & INTEGRITA:');
  console.log(`  1. Tassonomie (39 termini EN, slug "<slug_it>-en", term meta copiati):`);
  console.log(`     - settore:         ${stats.settori}/5  (${enDati.settori.map((s) => `${s.codice} -> "${s.nome}"`).join(' | ')})`);
  console.log(`     - categoria:       ${stats.categorie}/26 (22 con ordine_filtro>0 + 4 solo pagina retail)`);
  console.log(`     - categoria_brand: ${stats.categorie_brand}/8  (${enDati.categorie_brand.map((c) => c.nome).join(', ')})`);
  console.log(`  2. CPT realizzazione: ${stats.realizzazioni}/20 (slug identici sotto /en/realizzazioni/<slug>/, thumb+galleria+home_*+localita+menu_order copiati)`);
  console.log(`  3. CPT brand:         ${stats.brand}/18 (slug identici sotto /en/brand-partner/<slug>/, thumb+menu_order copiati)`);
  console.log(`  4. Relazioni JetEngine (rel_id=3): ${stats.relazioni}/8 righe EN<->EN (8 IT<->IT intatte)`);
  console.log(`  5. WPML String Translation: ${stats.stringhe_seo_archivi + stats.stringhe_wp + stats.stringhe_artes_core} stringhe`);
  console.log(`     - admin_texts_artes_seo_archives: ${stats.stringhe_seo_archivi}`);
  console.log(`     - WP (Tagline / blogdescription): ${stats.stringhe_wp}`);
  console.log(`     - artes-core (UI/SEO/JS):         ${stats.stringhe_artes_core}`);
  console.log(`  6. HTML & Link inline (su ${stats.campi_html_controllati} campi HTML):`);
  console.log(`     - Link /en/... verificati 1:1: ${stats.link_html_en}/${stats.link_html_totali}`);
  console.log(`     - Link IT residui senza /en/:  ${stats.link_html_it_residui}`);
  console.log(`     - Tag HTML sbilanciati:        ${stats.tag_sbilanciati}`);

  console.log('\nBACKUP & ROLLBACK:');
  console.log(`  - Backup incrementale salvato in: ${path.relative(root, BACKUP_FILE_DEFAULT)}`);
  console.log('  - Rollback chirurgico (solo entita EN): node tools/rev2/wpml-trad-dati.js --rollback');

  if (avvisi.length) {
    console.log(`\nAVVISI (${avvisi.length}):`);
    for (const a of avvisi) console.log(`  ~ ${a}`);
  }
  if (errori.length) {
    console.log(`\nERRORI (${errori.length}):`);
    for (const e of errori) console.log(`  ! ${e}`);
  }

  console.log(`\n=== ESITO VERIFICA OFFLINE: ${errori.length === 0 ? 'OK (0 errori)' : `FALLITA (${errori.length} errori)`} ===`);
  return errori.length;
}

// Esecuzione PHP sicura via Novamira MCP passando JSON in base64 (nessun problema di quoting)
async function phpConDati(nv, codice, dati = {}) {
  const b64 = Buffer.from(JSON.stringify(dati), 'utf8').toString('base64');
  return nv.php(`$D = json_decode(base64_decode('${b64}'), true);\n${codice}`);
}

// =================================================================================================
// SNIPPET PHP (separati per consentire lint automatico con `php -l` in verifica offline)
// =================================================================================================

const PHP_STATO_LIVE = String.raw`
global $wpdb, $sitepress;

$lang_en = $D['lang_en'];
$lang_it = $D['lang_it'];

$tax_report = [];
foreach (['settore', 'categoria', 'categoria_brand'] as $tax) {
  $rows = $wpdb->get_results($wpdb->prepare("
    SELECT t.term_id, tt.term_taxonomy_id, t.slug, t.name, tr.trid, tr.language_code, tr.source_language_code
    FROM {$wpdb->terms} t
    INNER JOIN {$wpdb->term_taxonomy} tt ON tt.term_id = t.term_id AND tt.taxonomy = %s
    LEFT JOIN {$wpdb->prefix}icl_translations tr ON tr.element_id = tt.term_taxonomy_id AND tr.element_type = %s
    ORDER BY t.term_id
  ", $tax, 'tax_' . $tax), ARRAY_A);
  $it_cnt = 0; $en_cnt = 0; $meta_ok = 0;
  foreach ($rows as $r) {
    if ($r['language_code'] === $lang_it) $it_cnt++;
    if ($r['language_code'] === $lang_en) {
      $en_cnt++;
      $tid = (int)$r['term_id'];
      if ($tax === 'settore') {
        $has_o = metadata_exists('term', $tid, 'ordine');
        $has_p = metadata_exists('term', $tid, 'pagina');
        if ($has_o && $has_p) $meta_ok++;
      } elseif ($tax === 'categoria') {
        if (metadata_exists('term', $tid, 'settore') && metadata_exists('term', $tid, 'ordine_pagina') && metadata_exists('term', $tid, 'ordine_filtro')) $meta_ok++;
      } else {
        if (metadata_exists('term', $tid, 'ordine')) $meta_ok++;
      }
    }
  }
  $tax_report[$tax] = ['it' => $it_cnt, 'en' => $en_cnt, 'en_meta_ok' => $meta_ok];
}

$cpt_report = [];
foreach (['realizzazione', 'brand'] as $pt) {
  $rows = $wpdb->get_results($wpdb->prepare("
    SELECT p.ID, p.post_name, p.post_title, p.menu_order, tr.trid, tr.language_code, tr.source_language_code
    FROM {$wpdb->posts} p
    INNER JOIN {$wpdb->prefix}icl_translations tr ON tr.element_id = p.ID AND tr.element_type = %s
    WHERE p.post_type = %s AND p.post_status = 'publish'
    ORDER BY p.menu_order ASC, p.ID ASC
  ", 'post_' . $pt, $pt), ARRAY_A);
  $it_by_trid = [];
  $en_rows = [];
  foreach ($rows as $r) {
    if ($r['language_code'] === $lang_it) $it_by_trid[(int)$r['trid']] = $r;
    if ($r['language_code'] === $lang_en) $en_rows[] = $r;
  }
  $slug_ok = 0; $thumb_ok = 0; $order_ok = 0; $terms_ok = 0;
  foreach ($en_rows as $er) {
    $it_r = $it_by_trid[(int)$er['trid']] ?? null;
    if (!$it_r) continue;
    if ($er['post_name'] === $it_r['post_name']) $slug_ok++;
    if ((int)$er['menu_order'] === (int)$it_r['menu_order']) $order_ok++;
    $t_en = (int)get_post_meta((int)$er['ID'], '_thumbnail_id', true);
    $t_it = (int)get_post_meta((int)$it_r['ID'], '_thumbnail_id', true);
    if ($t_en === $t_it) $thumb_ok++;

    $pid_en = (int)$er['ID'];
    $req_taxes = ($pt === 'realizzazione') ? ['settore', 'categoria'] : ['categoria_brand'];
    $all_en_t = true;
    foreach ($req_taxes as $rtax) {
      $t_lang_cnt = (int)$wpdb->get_var($wpdb->prepare("
        SELECT COUNT(*)
        FROM {$wpdb->term_relationships} rel
        INNER JOIN {$wpdb->term_taxonomy} tt ON tt.term_taxonomy_id = rel.term_taxonomy_id AND tt.taxonomy = %s
        INNER JOIN {$wpdb->prefix}icl_translations tr ON tr.element_id = tt.term_taxonomy_id AND tr.element_type = %s AND tr.language_code = %s
        WHERE rel.object_id = %d
      ", $rtax, 'tax_' . $rtax, $lang_en, $pid_en));
      if ($t_lang_cnt < 1) { $all_en_t = false; break; }
    }
    if ($all_en_t) $terms_ok++;
  }
  $cpt_report[$pt] = [
    'it_publish' => count($it_by_trid),
    'en_publish' => count($en_rows),
    'slug_match' => $slug_ok,
    'order_match' => $order_ok,
    'thumb_match' => $thumb_ok,
    'terms_en_ok' => $terms_ok,
  ];
}

$rel_table = $wpdb->prefix . 'jet_rel_default';
$rel_rows = $wpdb->get_results("
  SELECT r._ID, r.parent_object_id, r.child_object_id, tp.language_code AS p_lang, tc.language_code AS c_lang
  FROM {$rel_table} r
  LEFT JOIN {$wpdb->prefix}icl_translations tp ON tp.element_id = r.parent_object_id AND tp.element_type = 'post_realizzazione'
  LEFT JOIN {$wpdb->prefix}icl_translations tc ON tc.element_id = r.child_object_id AND tc.element_type = 'post_brand'
  WHERE r.rel_id = 3
  ORDER BY r._ID
", ARRAY_A);
$rel_it = 0; $rel_en = 0; $rel_mixed = 0;
foreach ($rel_rows as $rr) {
  if ($rr['p_lang'] === $lang_it && $rr['c_lang'] === $lang_it) $rel_it++;
  elseif ($rr['p_lang'] === $lang_en && $rr['c_lang'] === $lang_en) $rel_en++;
  else $rel_mixed++;
}

$st_report = [];
foreach ($D['st_groups'] as $grp => $items) {
  $reg = 0; $tr_ok = 0; $lang_it_ok = 0;
  foreach ($items as $it) {
    $row = $wpdb->get_row($wpdb->prepare(
      "SELECT id, language, status FROM {$wpdb->prefix}icl_strings WHERE context = %s AND name = %s LIMIT 1",
      $it['context'], $it['name']
    ), ARRAY_A);
    if (!$row) continue;
    $reg++;
    if ($row['language'] === $lang_it) $lang_it_ok++;
    $tr = $wpdb->get_row($wpdb->prepare(
      "SELECT value, status FROM {$wpdb->prefix}icl_string_translations WHERE string_id = %d AND language = %s LIMIT 1",
      (int)$row['id'], $lang_en
    ), ARRAY_A);
    if ($tr && (int)$tr['status'] === 10 && trim((string)$tr['value']) !== '') $tr_ok++;
  }
  $st_report[$grp] = ['attese' => count($items), 'registrate' => $reg, 'source_it' => $lang_it_ok, 'tradotte_en' => $tr_ok];
}

return [
  'plugin_version' => defined('ARTES_CORE_VERSION') ? ARTES_CORE_VERSION : null,
  'active_languages' => array_keys((array)apply_filters('wpml_active_languages', [], ['skip_missing' => 0])),
  'tax' => $tax_report,
  'cpt' => $cpt_report,
  'relazioni' => ['it_it' => $rel_it, 'en_en' => $rel_en, 'miste' => $rel_mixed, 'totale' => count($rel_rows)],
  'stringhe' => $st_report,
];
`;

const PHP_ESEGUI_TAX = String.raw`
global $wpdb, $sitepress;

$lang_it = $D['lang_it'];
$lang_en = $D['lang_en'];
$orig_lang = $sitepress ? $sitepress->get_current_language() : $lang_it;

$report = ['settore' => [], 'categoria' => [], 'categoria_brand' => []];
$backup_entries = [];

$find_it_term = function($taxonomy, $slug_it) use ($wpdb, $lang_it) {
  return $wpdb->get_row($wpdb->prepare("
    SELECT t.term_id, tt.term_taxonomy_id, t.slug, t.name, tr.trid
    FROM {$wpdb->terms} t
    INNER JOIN {$wpdb->term_taxonomy} tt ON tt.term_id = t.term_id AND tt.taxonomy = %s
    INNER JOIN {$wpdb->prefix}icl_translations tr ON tr.element_id = tt.term_taxonomy_id AND tr.element_type = %s
    WHERE t.slug = %s AND tr.language_code = %s
    LIMIT 1
  ", $taxonomy, 'tax_' . $taxonomy, $slug_it, $lang_it), ARRAY_A);
};

$find_en_term = function($taxonomy, $trid, $slug_en) use ($wpdb, $lang_en) {
  $row = $wpdb->get_row($wpdb->prepare("
    SELECT t.term_id, tt.term_taxonomy_id, t.slug, t.name, tt.description, tr.translation_id, tr.trid, tr.language_code, tr.source_language_code
    FROM {$wpdb->prefix}icl_translations tr
    INNER JOIN {$wpdb->term_taxonomy} tt ON tt.term_taxonomy_id = tr.element_id AND tt.taxonomy = %s
    INNER JOIN {$wpdb->terms} t ON t.term_id = tt.term_id
    WHERE tr.trid = %d AND tr.element_type = %s AND tr.language_code = %s
    LIMIT 1
  ", $taxonomy, (int)$trid, 'tax_' . $taxonomy, $lang_en), ARRAY_A);
  if ($row) return $row;

  return $wpdb->get_row($wpdb->prepare("
    SELECT t.term_id, tt.term_taxonomy_id, t.slug, t.name, tt.description, tr.translation_id, tr.trid, tr.language_code, tr.source_language_code
    FROM {$wpdb->terms} t
    INNER JOIN {$wpdb->term_taxonomy} tt ON tt.term_id = t.term_id AND tt.taxonomy = %s
    LEFT JOIN {$wpdb->prefix}icl_translations tr ON tr.element_id = tt.term_taxonomy_id AND tr.element_type = %s
    WHERE t.slug = %s
    LIMIT 1
  ", $taxonomy, 'tax_' . $taxonomy, $slug_en), ARRAY_A);
};

$upsert_term = function($taxonomy, $slug_it, $slug_en, $nome_en, $desc_en, $meta_map) use (
  $wpdb, $sitepress, $lang_it, $lang_en, $find_it_term, $find_en_term, &$report, &$backup_entries
) {
  $it = $find_it_term($taxonomy, $slug_it);
  if (!$it || empty($it['trid'])) {
    throw new \RuntimeException("Termine IT non trovato o senza trid: {$taxonomy}/{$slug_it}");
  }
  $trid = (int)$it['trid'];
  $existing = $find_en_term($taxonomy, $trid, $slug_en);

  if ($sitepress) $sitepress->switch_lang($lang_en);

  if ($existing) {
    $en_tid = (int)$existing['term_id'];
    $en_ttid = (int)$existing['term_taxonomy_id'];
    $meta_prima = [];
    foreach (array_keys($meta_map) as $mk) {
      $meta_prima[$mk] = [
        'esiste' => metadata_exists('term', $en_tid, $mk),
        'valore' => get_term_meta($en_tid, $mk, true),
      ];
    }
    $r = wp_update_term($en_tid, $taxonomy, [
      'name' => $nome_en,
      'slug' => $slug_en,
      'description' => $desc_en,
    ]);
    if (is_wp_error($r)) {
      throw new \RuntimeException("wp_update_term fallito ({$taxonomy}/{$slug_en}): " . $r->get_error_message());
    }
    $en_ttid = (int)$r['term_taxonomy_id'];
    $azione = 'updated';
    $bk = [
      'azione' => 'updated',
      'taxonomy' => $taxonomy,
      'slug_it' => $slug_it,
      'term_id' => $en_tid,
      'term_taxonomy_id' => $en_ttid,
      'prima' => [
        'name' => $existing['name'],
        'slug' => $existing['slug'],
        'description' => $existing['description'],
        'meta' => $meta_prima,
      ],
    ];
  } else {
    $r = wp_insert_term($nome_en, $taxonomy, [
      'slug' => $slug_en,
      'description' => $desc_en,
    ]);
    if (is_wp_error($r)) {
      throw new \RuntimeException("wp_insert_term fallito ({$taxonomy}/{$slug_en}): " . $r->get_error_message());
    }
    $en_tid = (int)$r['term_id'];
    $en_ttid = (int)$r['term_taxonomy_id'];
    $azione = 'created';
    $bk = [
      'azione' => 'created',
      'taxonomy' => $taxonomy,
      'slug_it' => $slug_it,
      'slug_en' => $slug_en,
      'term_id' => $en_tid,
      'term_taxonomy_id' => $en_ttid,
      'trid' => $trid,
    ];
  }

  do_action('wpml_set_element_language_details', [
    'element_id' => $en_ttid,
    'element_type' => 'tax_' . $taxonomy,
    'trid' => $trid,
    'language_code' => $lang_en,
    'source_language_code' => $lang_it,
  ]);

  $verify_icl = $wpdb->get_row($wpdb->prepare(
    "SELECT trid, language_code, source_language_code FROM {$wpdb->prefix}icl_translations WHERE element_id = %d AND element_type = %s LIMIT 1",
    $en_ttid, 'tax_' . $taxonomy
  ), ARRAY_A);
  if (!$verify_icl || (int)$verify_icl['trid'] !== $trid || $verify_icl['language_code'] !== $lang_en) {
    throw new \RuntimeException("Link WPML fallito per termine {$taxonomy}/{$slug_en} (tt_id={$en_ttid}, trid atteso={$trid})");
  }

  foreach ($meta_map as $mk => $mv) {
    if ($mv === null || $mv === '') continue;
    update_term_meta($en_tid, $mk, is_string($mv) ? wp_slash($mv) : $mv);
  }
  clean_term_cache($en_tid, $taxonomy);

  $backup_entries[] = $bk;
  $report[$taxonomy][] = [
    'slug_it' => $slug_it,
    'slug_en' => $slug_en,
    'term_id' => $en_tid,
    'term_taxonomy_id' => $en_ttid,
    'trid' => $trid,
    'azione' => $azione,
  ];
};

try {
  // 1. settore (5)
  foreach ($D['settori'] as $s) {
    $it_s = $find_it_term('settore', $s['codice']);
    $it_pagina = $it_s ? (int)get_term_meta((int)$it_s['term_id'], 'pagina', true) : 0;
    if ($it_pagina <= 0 && !empty($s['pagina_it_slug'])) {
      $pg_it = get_page_by_path($s['pagina_it_slug']);
      if ($pg_it) $it_pagina = (int)$pg_it->ID;
    }
    $target_pagina = $it_pagina;
    if ($it_pagina > 0) {
      $tr_pg = (int)apply_filters('wpml_object_id', $it_pagina, 'page', false, $lang_en);
      if ($tr_pg > 0) $target_pagina = $tr_pg;
    }
    $meta_settore = ['ordine' => (int)$s['ordine']];
    if ($target_pagina > 0) $meta_settore['pagina'] = $target_pagina;
    $upsert_term('settore', $s['codice'], $s['slug_en'], $s['nome'], '', $meta_settore);
  }

  // 2. categoria (26)
  foreach ($D['categorie'] as $c) {
    $upsert_term('categoria', $c['slug'], $c['slug_en'], $c['nome'], $c['descrizione'], [
      'settore' => $c['settore'],
      'ordine_pagina' => (int)$c['ordine_pagina'],
      'ordine_filtro' => (int)$c['ordine_filtro'],
    ]);
  }

  // 3. categoria_brand (8)
  foreach ($D['categorie_brand'] as $cb) {
    $upsert_term('categoria_brand', $cb['slug'], $cb['slug_en'], $cb['nome'], '', [
      'ordine' => (int)$cb['ordine'],
    ]);
  }
} finally {
  if ($sitepress) $sitepress->switch_lang($orig_lang);
}

return ['report' => $report, 'backup' => $backup_entries];
`;

const PHP_ESEGUI_REALIZZAZIONI = String.raw`
global $wpdb, $sitepress;

$lang_it = $D['lang_it'];
$lang_en = $D['lang_en'];
$orig_lang = $sitepress ? $sitepress->get_current_language() : $lang_it;

$resolve_en_term_id = function($taxonomy, $slug_it, $slug_en) use ($wpdb, $lang_it, $lang_en) {
  $it_tt = $wpdb->get_row($wpdb->prepare("
    SELECT t.term_id, tt.term_taxonomy_id, tr.trid
    FROM {$wpdb->terms} t
    INNER JOIN {$wpdb->term_taxonomy} tt ON tt.term_id = t.term_id AND tt.taxonomy = %s
    INNER JOIN {$wpdb->prefix}icl_translations tr ON tr.element_id = tt.term_taxonomy_id AND tr.element_type = %s
    WHERE t.slug = %s AND tr.language_code = %s
    LIMIT 1
  ", $taxonomy, 'tax_' . $taxonomy, $slug_it, $lang_it), ARRAY_A);
  if ($it_tt && !empty($it_tt['trid'])) {
    $en_tid = (int)$wpdb->get_var($wpdb->prepare("
      SELECT tt.term_id
      FROM {$wpdb->prefix}icl_translations tr
      INNER JOIN {$wpdb->term_taxonomy} tt ON tt.term_taxonomy_id = tr.element_id AND tt.taxonomy = %s
      WHERE tr.trid = %d AND tr.element_type = %s AND tr.language_code = %s
      LIMIT 1
    ", $taxonomy, (int)$it_tt['trid'], 'tax_' . $taxonomy, $lang_en));
    if ($en_tid > 0) return $en_tid;
  }
  $by_slug = (int)$wpdb->get_var($wpdb->prepare("
    SELECT t.term_id
    FROM {$wpdb->terms} t
    INNER JOIN {$wpdb->term_taxonomy} tt ON tt.term_id = t.term_id AND tt.taxonomy = %s
    WHERE t.slug = %s
    LIMIT 1
  ", $taxonomy, $slug_en));
  return $by_slug;
};

$meta_keys_all = [
  'kw', 'introduzione', 'localita', 'tipologia', 'progettista', 'brand_forniture',
  'descrizione_lead', 'descrizione_testo', 'galleria', 'home_ordine', 'home_larghezza',
  '_artes_rev2', '_thumbnail_id',
];

$report = [];
$backup_entries = [];

try {
  foreach ($D['items'] as $item) {
    $slug = $item['slug'];

    // 1. Trova il post sorgente IT pubblicato
    $it = $wpdb->get_row($wpdb->prepare("
      SELECT p.ID, p.post_name, p.post_title, p.menu_order, tr.trid
      FROM {$wpdb->posts} p
      INNER JOIN {$wpdb->prefix}icl_translations tr ON tr.element_id = p.ID AND tr.element_type = 'post_realizzazione'
      WHERE p.post_type = 'realizzazione' AND p.post_status = 'publish' AND p.post_name = %s AND tr.language_code = %s
      LIMIT 1
    ", $slug, $lang_it), ARRAY_A);
    if (!$it || empty($it['trid'])) {
      throw new \RuntimeException("Realizzazione IT non trovata o senza trid: {$slug}");
    }
    $it_id = (int)$it['ID'];
    $trid = (int)$it['trid'];

    // 2. Leggi campi copiati dall'IT
    $it_thumb = (int)get_post_meta($it_id, '_thumbnail_id', true);
    $it_localita = (string)get_post_meta($it_id, 'localita', true);
    $it_galleria = (string)get_post_meta($it_id, 'galleria', true);
    $it_home_ord = (string)get_post_meta($it_id, 'home_ordine', true);
    $it_home_w = (string)get_post_meta($it_id, 'home_larghezza', true);

    // 3. Risolvi i termini EN obbligatori
    $en_settore_id = $resolve_en_term_id('settore', $item['settore'], $item['settore_slug_en']);
    $en_cat_id = $resolve_en_term_id('categoria', $item['categoria'], $item['categoria_slug_en']);
    if ($en_settore_id <= 0 || $en_cat_id <= 0) {
      throw new \RuntimeException("Termini EN mancanti per realizzazione/{$slug} (settore={$en_settore_id}, cat={$en_cat_id}): eseguire prima --solo tax");
    }

    // 4. Verifica se traduzione EN gia esiste per questo trid
    $en_id = (int)$wpdb->get_var($wpdb->prepare("
      SELECT tr.element_id
      FROM {$wpdb->prefix}icl_translations tr
      INNER JOIN {$wpdb->posts} p ON p.ID = tr.element_id AND p.post_type = 'realizzazione' AND p.post_status != 'trash'
      WHERE tr.trid = %d AND tr.element_type = 'post_realizzazione' AND tr.language_code = %s
      LIMIT 1
    ", $trid, $lang_en));

    if ($sitepress) $sitepress->switch_lang($lang_en);

    if ($en_id > 0) {
      $p_before = get_post($en_id);
      $meta_before = [];
      foreach ($meta_keys_all as $mk) {
        $meta_before[$mk] = [
          'esiste' => metadata_exists('post', $en_id, $mk),
          'valore' => get_post_meta($en_id, $mk, true),
        ];
      }
      $bk = [
        'azione' => 'updated',
        'post_type' => 'realizzazione',
        'slug' => $slug,
        'post_id' => $en_id,
        'it_id' => $it_id,
        'trid' => $trid,
        'prima' => [
          'post_title' => $p_before->post_title,
          'post_name' => $p_before->post_name,
          'post_status' => $p_before->post_status,
          'menu_order' => (int)$p_before->menu_order,
          'meta' => $meta_before,
          'terms_settore' => wp_get_object_terms($en_id, 'settore', ['fields' => 'ids']),
          'terms_categoria' => wp_get_object_terms($en_id, 'categoria', ['fields' => 'ids']),
        ],
      ];
      $res_id = wp_update_post([
        'ID' => $en_id,
        'post_title' => $item['titolo'],
        'post_name' => $slug,
        'post_status' => 'publish',
        'menu_order' => (int)$item['ordine'],
      ], true);
      if (is_wp_error($res_id)) {
        throw new \RuntimeException("wp_update_post fallito (realizzazione/{$slug}): " . $res_id->get_error_message());
      }
      $azione = 'updated';
    } else {
      $res_id = wp_insert_post([
        'post_type' => 'realizzazione',
        'post_title' => $item['titolo'],
        'post_name' => $slug,
        'post_status' => 'publish',
        'menu_order' => (int)$item['ordine'],
      ], true);
      if (is_wp_error($res_id)) {
        throw new \RuntimeException("wp_insert_post fallito (realizzazione/{$slug}): " . $res_id->get_error_message());
      }
      $en_id = (int)$res_id;
      $azione = 'created';
      $bk = [
        'azione' => 'created',
        'post_type' => 'realizzazione',
        'slug' => $slug,
        'post_id' => $en_id,
        'it_id' => $it_id,
        'trid' => $trid,
      ];
    }

    // 5. Associa in icl_translations al trid IT come 'en-gb'
    do_action('wpml_set_element_language_details', [
      'element_id' => $en_id,
      'element_type' => 'post_realizzazione',
      'trid' => $trid,
      'language_code' => $lang_en,
      'source_language_code' => $lang_it,
    ]);

    // 6. Garantisci post_name canonico identico all'IT (senza suffisso '-2')
    if (get_post_field('post_name', $en_id) !== $slug) {
      $wpdb->update($wpdb->posts, ['post_name' => $slug], ['ID' => $en_id], ['%s'], ['%d']);
      clean_post_cache($en_id);
    }

    // 7. Scrivi meta tradotti + meta copiati con wp_slash()
    $meta_to_write = [
      'kw' => $item['kw'],
      'introduzione' => $item['introduzione'],
      'localita' => $it_localita !== '' ? $it_localita : $item['localita'],
      'tipologia' => $item['tipologia'],
      'progettista' => $item['progettista'],
      'brand_forniture' => $item['brand_forniture'],
      'descrizione_lead' => $item['descrizione_lead'],
      'descrizione_testo' => $item['descrizione_testo'],
      'galleria' => $it_galleria,
      'home_ordine' => $it_home_ord,
      'home_larghezza' => $it_home_w,
      '_artes_rev2' => '1',
    ];
    foreach ($meta_to_write as $mk => $mv) {
      if ($mv === '' || $mv === null) {
        delete_post_meta($en_id, $mk);
      } else {
        update_post_meta($en_id, $mk, wp_slash((string)$mv));
      }
    }
    if ($it_thumb > 0) {
      set_post_thumbnail($en_id, $it_thumb);
    } else {
      delete_post_thumbnail($en_id);
    }

    // 8. Assegna termini EN per ID esatto
    wp_set_object_terms($en_id, [$en_settore_id], 'settore', false);
    wp_set_object_terms($en_id, [$en_cat_id], 'categoria', false);

    // 9. Verifica finale post-scrittura
    $verify_icl = $wpdb->get_row($wpdb->prepare(
      "SELECT trid, language_code, source_language_code FROM {$wpdb->prefix}icl_translations WHERE element_id = %d AND element_type = 'post_realizzazione' LIMIT 1",
      $en_id
    ), ARRAY_A);
    $actual_slug = (string)get_post_field('post_name', $en_id);
    if (!$verify_icl || (int)$verify_icl['trid'] !== $trid || $verify_icl['language_code'] !== $lang_en || $actual_slug !== $slug) {
      throw new \RuntimeException("Verifica post-scrittura fallita per realizzazione/{$slug} (id={$en_id}, slug={$actual_slug})");
    }

    $backup_entries[] = $bk;
    $report[] = [
      'slug' => $slug,
      'it_id' => $it_id,
      'en_id' => $en_id,
      'trid' => $trid,
      'thumb_id' => (int)get_post_meta($en_id, '_thumbnail_id', true),
      'azione' => $azione,
    ];
  }
} finally {
  if ($sitepress) $sitepress->switch_lang($orig_lang);
}

return ['report' => $report, 'backup' => $backup_entries];
`;

const PHP_ESEGUI_BRAND = String.raw`
global $wpdb, $sitepress;

$lang_it = $D['lang_it'];
$lang_en = $D['lang_en'];
$orig_lang = $sitepress ? $sitepress->get_current_language() : $lang_it;

$resolve_en_cb_id = function($slug_it, $slug_en) use ($wpdb, $lang_it, $lang_en) {
  $it_tt = $wpdb->get_row($wpdb->prepare("
    SELECT t.term_id, tt.term_taxonomy_id, tr.trid
    FROM {$wpdb->terms} t
    INNER JOIN {$wpdb->term_taxonomy} tt ON tt.term_id = t.term_id AND tt.taxonomy = 'categoria_brand'
    INNER JOIN {$wpdb->prefix}icl_translations tr ON tr.element_id = tt.term_taxonomy_id AND tr.element_type = 'tax_categoria_brand'
    WHERE t.slug = %s AND tr.language_code = %s
    LIMIT 1
  ", $slug_it, $lang_it), ARRAY_A);
  if ($it_tt && !empty($it_tt['trid'])) {
    $en_tid = (int)$wpdb->get_var($wpdb->prepare("
      SELECT tt.term_id
      FROM {$wpdb->prefix}icl_translations tr
      INNER JOIN {$wpdb->term_taxonomy} tt ON tt.term_taxonomy_id = tr.element_id AND tt.taxonomy = 'categoria_brand'
      WHERE tr.trid = %d AND tr.element_type = 'tax_categoria_brand' AND tr.language_code = %s
      LIMIT 1
    ", (int)$it_tt['trid'], $lang_en));
    if ($en_tid > 0) return $en_tid;
  }
  return (int)$wpdb->get_var($wpdb->prepare("
    SELECT t.term_id
    FROM {$wpdb->terms} t
    INNER JOIN {$wpdb->term_taxonomy} tt ON tt.term_id = t.term_id AND tt.taxonomy = 'categoria_brand'
    WHERE t.slug = %s
    LIMIT 1
  ", $slug_en));
};

$meta_keys_all = [
  'introduzione', 'settori_artes', 'fornitura_artes', 'assistenza',
  'come_lavoriamo', 'dove_lo_usiamo', '_artes_rev2', '_thumbnail_id',
];

$report = [];
$backup_entries = [];

try {
  foreach ($D['items'] as $item) {
    $slug = $item['slug'];

    $it = $wpdb->get_row($wpdb->prepare("
      SELECT p.ID, p.post_name, p.post_title, p.menu_order, tr.trid
      FROM {$wpdb->posts} p
      INNER JOIN {$wpdb->prefix}icl_translations tr ON tr.element_id = p.ID AND tr.element_type = 'post_brand'
      WHERE p.post_type = 'brand' AND p.post_status = 'publish' AND p.post_name = %s AND tr.language_code = %s
      LIMIT 1
    ", $slug, $lang_it), ARRAY_A);
    if (!$it || empty($it['trid'])) {
      throw new \RuntimeException("Brand IT non trovato o senza trid: {$slug}");
    }
    $it_id = (int)$it['ID'];
    $trid = (int)$it['trid'];
    $it_thumb = (int)get_post_meta($it_id, '_thumbnail_id', true);

    $en_cb_id = $resolve_en_cb_id($item['categoria_brand'], $item['categoria_brand_slug_en']);
    if ($en_cb_id <= 0) {
      throw new \RuntimeException("Termine EN categoria_brand mancante per brand/{$slug}: eseguire prima --solo tax");
    }

    $en_id = (int)$wpdb->get_var($wpdb->prepare("
      SELECT tr.element_id
      FROM {$wpdb->prefix}icl_translations tr
      INNER JOIN {$wpdb->posts} p ON p.ID = tr.element_id AND p.post_type = 'brand' AND p.post_status != 'trash'
      WHERE tr.trid = %d AND tr.element_type = 'post_brand' AND tr.language_code = %s
      LIMIT 1
    ", $trid, $lang_en));

    if ($sitepress) $sitepress->switch_lang($lang_en);

    if ($en_id > 0) {
      $p_before = get_post($en_id);
      $meta_before = [];
      foreach ($meta_keys_all as $mk) {
        $meta_before[$mk] = [
          'esiste' => metadata_exists('post', $en_id, $mk),
          'valore' => get_post_meta($en_id, $mk, true),
        ];
      }
      $bk = [
        'azione' => 'updated',
        'post_type' => 'brand',
        'slug' => $slug,
        'post_id' => $en_id,
        'it_id' => $it_id,
        'trid' => $trid,
        'prima' => [
          'post_title' => $p_before->post_title,
          'post_name' => $p_before->post_name,
          'post_status' => $p_before->post_status,
          'menu_order' => (int)$p_before->menu_order,
          'meta' => $meta_before,
          'terms_categoria_brand' => wp_get_object_terms($en_id, 'categoria_brand', ['fields' => 'ids']),
        ],
      ];
      $res_id = wp_update_post([
        'ID' => $en_id,
        'post_title' => $item['titolo'],
        'post_name' => $slug,
        'post_status' => 'publish',
        'menu_order' => (int)$item['ordine'],
      ], true);
      if (is_wp_error($res_id)) {
        throw new \RuntimeException("wp_update_post fallito (brand/{$slug}): " . $res_id->get_error_message());
      }
      $azione = 'updated';
    } else {
      $res_id = wp_insert_post([
        'post_type' => 'brand',
        'post_title' => $item['titolo'],
        'post_name' => $slug,
        'post_status' => 'publish',
        'menu_order' => (int)$item['ordine'],
      ], true);
      if (is_wp_error($res_id)) {
        throw new \RuntimeException("wp_insert_post fallito (brand/{$slug}): " . $res_id->get_error_message());
      }
      $en_id = (int)$res_id;
      $azione = 'created';
      $bk = [
        'azione' => 'created',
        'post_type' => 'brand',
        'slug' => $slug,
        'post_id' => $en_id,
        'it_id' => $it_id,
        'trid' => $trid,
      ];
    }

    do_action('wpml_set_element_language_details', [
      'element_id' => $en_id,
      'element_type' => 'post_brand',
      'trid' => $trid,
      'language_code' => $lang_en,
      'source_language_code' => $lang_it,
    ]);

    if (get_post_field('post_name', $en_id) !== $slug) {
      $wpdb->update($wpdb->posts, ['post_name' => $slug], ['ID' => $en_id], ['%s'], ['%d']);
      clean_post_cache($en_id);
    }

    $meta_to_write = [
      'introduzione' => $item['introduzione'],
      'settori_artes' => $item['settori_artes'],
      'fornitura_artes' => $item['fornitura_artes'],
      'assistenza' => $item['assistenza'],
      'come_lavoriamo' => $item['come_lavoriamo'],
      'dove_lo_usiamo' => $item['dove_lo_usiamo'],
      '_artes_rev2' => '1',
    ];
    foreach ($meta_to_write as $mk => $mv) {
      update_post_meta($en_id, $mk, wp_slash((string)$mv));
    }
    if ($it_thumb > 0) {
      set_post_thumbnail($en_id, $it_thumb);
    } else {
      delete_post_thumbnail($en_id);
    }

    wp_set_object_terms($en_id, [$en_cb_id], 'categoria_brand', false);

    $verify_icl = $wpdb->get_row($wpdb->prepare(
      "SELECT trid, language_code, source_language_code FROM {$wpdb->prefix}icl_translations WHERE element_id = %d AND element_type = 'post_brand' LIMIT 1",
      $en_id
    ), ARRAY_A);
    $actual_slug = (string)get_post_field('post_name', $en_id);
    if (!$verify_icl || (int)$verify_icl['trid'] !== $trid || $verify_icl['language_code'] !== $lang_en || $actual_slug !== $slug) {
      throw new \RuntimeException("Verifica post-scrittura fallita per brand/{$slug} (id={$en_id}, slug={$actual_slug})");
    }

    $backup_entries[] = $bk;
    $report[] = [
      'slug' => $slug,
      'it_id' => $it_id,
      'en_id' => $en_id,
      'trid' => $trid,
      'thumb_id' => (int)get_post_meta($en_id, '_thumbnail_id', true),
      'azione' => $azione,
    ];
  }
} finally {
  if ($sitepress) $sitepress->switch_lang($orig_lang);
}

return ['report' => $report, 'backup' => $backup_entries];
`;

const PHP_ESEGUI_RELAZIONI = String.raw`
global $wpdb;

$lang_en = $D['lang_en'];
$table = $wpdb->prefix . 'jet_rel_default';

$find_en_post = function($post_type, $slug) use ($wpdb, $lang_en) {
  return (int)$wpdb->get_var($wpdb->prepare("
    SELECT p.ID
    FROM {$wpdb->posts} p
    INNER JOIN {$wpdb->prefix}icl_translations tr ON tr.element_id = p.ID AND tr.element_type = %s
    WHERE p.post_type = %s AND p.post_status = 'publish' AND p.post_name = %s AND tr.language_code = %s
    LIMIT 1
  ", 'post_' . $post_type, $post_type, $slug, $lang_en));
};

$resolved = [];
foreach ($D['relazioni'] as $pair) {
  $p_id = $find_en_post('realizzazione', $pair[0]);
  $c_id = $find_en_post('brand', $pair[1]);
  if ($p_id <= 0 || $c_id <= 0) {
    throw new \RuntimeException("Post EN mancante per relazione {$pair[0]} -> {$pair[1]} (p={$p_id}, c={$c_id}): eseguire prima realizzazioni e brand");
  }
  $resolved[] = ['real_slug' => $pair[0], 'brand_slug' => $pair[1], 'parent_id' => $p_id, 'child_id' => $c_id];
}

$report = [];
$backup_added = [];

foreach ($resolved as $r) {
  $exists_id = (int)$wpdb->get_var($wpdb->prepare(
    "SELECT _ID FROM {$table} WHERE rel_id = 3 AND parent_object_id = %d AND child_object_id = %d LIMIT 1",
    $r['parent_id'], $r['child_id']
  ));
  if ($exists_id > 0) {
    $report[] = [
      'pair' => $r['real_slug'] . ' -> ' . $r['brand_slug'],
      'row_id' => $exists_id,
      'parent_id' => $r['parent_id'],
      'child_id' => $r['child_id'],
      'azione' => 'already_present',
    ];
    continue;
  }

  $ok = $wpdb->insert(
    $table,
    [
      'created' => current_time('mysql'),
      'rel_id' => 3,
      'parent_rel' => 0,
      'parent_object_id' => $r['parent_id'],
      'child_object_id' => $r['child_id'],
    ],
    ['%s', '%d', '%d', '%d', '%d']
  );
  if (!$ok) {
    throw new \RuntimeException("Inserimento jet_rel_default fallito per {$r['real_slug']} -> {$r['brand_slug']}");
  }
  $new_id = (int)$wpdb->insert_id;
  $backup_added[] = [
    'row_id' => $new_id,
    'rel_id' => 3,
    'parent_object_id' => $r['parent_id'],
    'child_object_id' => $r['child_id'],
    'pair' => [$r['real_slug'], $r['brand_slug']],
  ];
  $report[] = [
    'pair' => $r['real_slug'] . ' -> ' . $r['brand_slug'],
    'row_id' => $new_id,
    'parent_id' => $r['parent_id'],
    'child_id' => $r['child_id'],
    'azione' => 'inserted',
  ];
}

return ['report' => $report, 'backup' => $backup_added];
`;

const PHP_ESEGUI_STRINGHE = String.raw`
global $wpdb;

$lang_it = $D['lang_it'];
$lang_en = $D['lang_en'];
$status_complete = defined('ICL_TM_COMPLETE') ? (int)ICL_TM_COMPLETE : 10;

$live_arch = get_option('artes_seo_archives', []);
$live_tagline = (string)get_option('blogdescription', '');

$report = ['created_strings' => 0, 'updated_language_to_it' => 0, 'translations_saved' => 0, 'items' => []];
$backup_entries = [];

foreach ($D['items'] as $it) {
  $context = (string)$it['context'];
  $name = (string)$it['name'];
  $source_it = (string)$it['it'];
  $tr_en = (string)$it['en'];

  // Allinea il testo sorgente con il valore live delle opzioni WP dove applicabile
  if ($context === 'WP' && $name === 'Tagline' && trim($live_tagline) !== '') {
    $source_it = $live_tagline;
  } elseif ($context === 'admin_texts_artes_seo_archives' && !empty($it['post_type']) && !empty($it['field'])) {
    $pt = $it['post_type']; $fld = $it['field'];
    if (is_array($live_arch) && !empty($live_arch[$pt][$fld])) {
      $source_it = (string)$live_arch[$pt][$fld];
    }
  }

  $existing = $wpdb->get_row($wpdb->prepare(
    "SELECT id, language, value, status FROM {$wpdb->prefix}icl_strings WHERE context = %s AND name = %s LIMIT 1",
    $context, $name
  ), ARRAY_A);

  $bk = [
    'context' => $context,
    'name' => $name,
    'string_created' => false,
    'string_id' => 0,
    'string_prima' => null,
    'translation_prima' => null,
  ];

  if ($existing) {
    $string_id = (int)$existing['id'];
    $bk['string_id'] = $string_id;
    $bk['string_prima'] = [
      'language' => $existing['language'],
      'value' => $existing['value'],
      'status' => (int)$existing['status'],
    ];
    $tr_before = $wpdb->get_row($wpdb->prepare(
      "SELECT id, value, status FROM {$wpdb->prefix}icl_string_translations WHERE string_id = %d AND language = %s LIMIT 1",
      $string_id, $lang_en
    ), ARRAY_A);
    if ($tr_before) {
      $bk['translation_prima'] = [
        'id' => (int)$tr_before['id'],
        'value' => $tr_before['value'],
        'status' => (int)$tr_before['status'],
      ];
    }
  } else {
    if (function_exists('icl_register_string')) {
      icl_register_string($context, $name, $source_it, false, $lang_it);
    } else {
      do_action('wpml_register_single_string', $context, $name, $source_it, false, $lang_it);
    }
    $created_row = $wpdb->get_row($wpdb->prepare(
      "SELECT id, language, value, status FROM {$wpdb->prefix}icl_strings WHERE context = %s AND name = %s LIMIT 1",
      $context, $name
    ), ARRAY_A);
    if (!$created_row) {
      throw new \RuntimeException("Registrazione stringa WPML ST fallita: {$context}::{$name}");
    }
    $string_id = (int)$created_row['id'];
    $bk['string_created'] = true;
    $bk['string_id'] = $string_id;
    $existing = $created_row;
    $report['created_strings']++;
  }

  // Guardia critica WPML ST su dev3: assicurarsi che la lingua sorgente sia 'it' prima di salvare la traduzione 'en-gb'
  if ($existing['language'] !== $lang_it) {
    $wpdb->update(
      $wpdb->prefix . 'icl_strings',
      ['language' => $lang_it],
      ['id' => $string_id],
      ['%s'],
      ['%d']
    );
    wp_cache_flush();
    $report['updated_language_to_it']++;
  }

  if (function_exists('icl_add_string_translation')) {
    $tr_id = icl_add_string_translation($string_id, $lang_en, $tr_en, $status_complete);
    if (!$tr_id) {
      throw new \RuntimeException("icl_add_string_translation fallito per {$context}::{$name} (string_id={$string_id})");
    }
  } else {
    throw new \RuntimeException('WPML String Translation non attivo (icl_add_string_translation assente)');
  }

  $verify_tr = $wpdb->get_row($wpdb->prepare(
    "SELECT id, value, status FROM {$wpdb->prefix}icl_string_translations WHERE string_id = %d AND language = %s LIMIT 1",
    $string_id, $lang_en
  ), ARRAY_A);
  if (!$verify_tr || (int)$verify_tr['status'] !== $status_complete || (string)$verify_tr['value'] !== $tr_en) {
    throw new \RuntimeException("Verifica traduzione WPML ST fallita per {$context}::{$name}");
  }

  $bk['translation_id'] = (int)$verify_tr['id'];
  $backup_entries[] = $bk;
  $report['translations_saved']++;
  $report['items'][] = [
    'context' => $context,
    'name' => $name,
    'string_id' => $string_id,
    'translation_id' => (int)$verify_tr['id'],
  ];
}

return ['report' => $report, 'backup' => $backup_entries];
`;

const PHP_SVUOTA_CACHE = String.raw`
if (class_exists('\Elementor\Plugin')) {
  \Elementor\Plugin::$instance->files_manager->clear_cache();
}
if (function_exists('icl_cache_clear')) {
  icl_cache_clear(true);
}
do_action('wpml_cache_clear');
do_action('wpml_st_cache_clear');
wp_cache_flush();
return true;
`;

const PHP_ROLLBACK = String.raw`
global $wpdb, $sitepress;

$lang_en = $D['lang_en'];
$orig_lang = $sitepress ? $sitepress->get_current_language() : 'it';
$out = [
  'stringhe_rimosse' => 0,
  'stringhe_ripristinate' => 0,
  'relazioni_rimosse' => 0,
  'brand_rimossi' => 0,
  'brand_ripristinati' => 0,
  'realizzazioni_rimosse' => 0,
  'realizzazioni_ripristinate' => 0,
  'tax_rimossi' => 0,
  'tax_ripristinati' => 0,
];

try {
  // 1. Stringhe WPML ST
  foreach (array_reverse($D['stringhe'] ?? []) as $s) {
    $sid = (int)($s['string_id'] ?? 0);
    if ($sid <= 0) continue;
    if (!empty($s['string_created'])) {
      $wpdb->delete($wpdb->prefix . 'icl_string_translations', ['string_id' => $sid], ['%d']);
      $wpdb->delete($wpdb->prefix . 'icl_strings', ['id' => $sid], ['%d']);
      $out['stringhe_rimosse']++;
    } else {
      if (!empty($s['translation_prima'])) {
        $wpdb->update(
          $wpdb->prefix . 'icl_string_translations',
          ['value' => (string)$s['translation_prima']['value'], 'status' => (int)$s['translation_prima']['status']],
          ['string_id' => $sid, 'language' => $lang_en],
          ['%s', '%d'],
          ['%d', '%s']
        );
      } else {
        $wpdb->delete($wpdb->prefix . 'icl_string_translations', ['string_id' => $sid, 'language' => $lang_en], ['%d', '%s']);
      }
      if (!empty($s['string_prima'])) {
        $wpdb->update(
          $wpdb->prefix . 'icl_strings',
          [
            'language' => (string)$s['string_prima']['language'],
            'value' => (string)$s['string_prima']['value'],
            'status' => (int)$s['string_prima']['status'],
          ],
          ['id' => $sid],
          ['%s', '%s', '%d'],
          ['%d']
        );
      }
      $out['stringhe_ripristinate']++;
    }
  }

  // 2. Relazioni JetEngine EN<->EN (solo righe inserite dallo script)
  $rel_table = $wpdb->prefix . 'jet_rel_default';
  foreach (array_reverse($D['relazioni'] ?? []) as $r) {
    $rid = (int)($r['row_id'] ?? 0);
    $pid = (int)($r['parent_object_id'] ?? 0);
    $cid = (int)($r['child_object_id'] ?? 0);
    if ($rid <= 0 || $pid <= 0 || $cid <= 0) continue;
    $n = $wpdb->delete(
      $rel_table,
      ['_ID' => $rid, 'rel_id' => 3, 'parent_object_id' => $pid, 'child_object_id' => $cid],
      ['%d', '%d', '%d', '%d']
    );
    if ($n) $out['relazioni_rimosse'] += (int)$n;
  }

  // Helper rollback CPT (con guardia rigorosa: non elimina MAI un post che non sia 'en-gb')
  $rollback_posts = function($entries, $post_type, $key_del, $key_rest) use ($wpdb, $sitepress, $lang_en, &$out) {
    if ($sitepress) $sitepress->switch_lang($lang_en);
    foreach (array_reverse($entries) as $e) {
      $pid = (int)($e['post_id'] ?? 0);
      if ($pid <= 0) continue;
      $lang_check = $wpdb->get_var($wpdb->prepare(
        "SELECT language_code FROM {$wpdb->prefix}icl_translations WHERE element_id = %d AND element_type = %s LIMIT 1",
        $pid, 'post_' . $post_type
      ));
      if ($lang_check !== $lang_en) {
        continue; // Guardia assoluta: mai toccare contenuti IT
      }
      if (($e['azione'] ?? '') === 'created') {
        wp_delete_post($pid, true);
        $wpdb->delete($wpdb->prefix . 'icl_translations', ['element_id' => $pid, 'element_type' => 'post_' . $post_type], ['%d', '%s']);
        $out[$key_del]++;
      } elseif (($e['azione'] ?? '') === 'updated' && !empty($e['prima'])) {
        $pr = $e['prima'];
        wp_update_post([
          'ID' => $pid,
          'post_title' => $pr['post_title'],
          'post_name' => $pr['post_name'],
          'post_status' => $pr['post_status'],
          'menu_order' => (int)$pr['menu_order'],
        ]);
        foreach (($pr['meta'] ?? []) as $mk => $info) {
          if (!empty($info['esiste'])) {
            update_post_meta($pid, $mk, wp_slash((string)$info['valore']));
          } else {
            delete_post_meta($pid, $mk);
          }
        }
        if (isset($pr['terms_settore'])) wp_set_object_terms($pid, array_map('intval', (array)$pr['terms_settore']), 'settore', false);
        if (isset($pr['terms_categoria'])) wp_set_object_terms($pid, array_map('intval', (array)$pr['terms_categoria']), 'categoria', false);
        if (isset($pr['terms_categoria_brand'])) wp_set_object_terms($pid, array_map('intval', (array)$pr['terms_categoria_brand']), 'categoria_brand', false);
        $out[$key_rest]++;
      }
    }
  };

  // 3. Brand EN, poi 4. Realizzazioni EN
  $rollback_posts($D['brand'] ?? [], 'brand', 'brand_rimossi', 'brand_ripristinati');
  $rollback_posts($D['realizzazioni'] ?? [], 'realizzazione', 'realizzazioni_rimosse', 'realizzazioni_ripristinate');

  // 5. Tassonomie EN (con guardia rigorosa: mai toccare termini IT)
  if ($sitepress) $sitepress->switch_lang($lang_en);
  foreach (array_reverse($D['tax'] ?? []) as $t) {
    $tid = (int)($t['term_id'] ?? 0);
    $ttid = (int)($t['term_taxonomy_id'] ?? 0);
    $tax = (string)($t['taxonomy'] ?? '');
    if ($tid <= 0 || $ttid <= 0 || $tax === '') continue;
    $lang_check = $wpdb->get_var($wpdb->prepare(
      "SELECT language_code FROM {$wpdb->prefix}icl_translations WHERE element_id = %d AND element_type = %s LIMIT 1",
      $ttid, 'tax_' . $tax
    ));
    if ($lang_check !== $lang_en) {
      continue;
    }
    if (($t['azione'] ?? '') === 'created') {
      wp_delete_term($tid, $tax);
      $wpdb->delete($wpdb->prefix . 'icl_translations', ['element_id' => $ttid, 'element_type' => 'tax_' . $tax], ['%d', '%s']);
      $out['tax_rimossi']++;
    } elseif (($t['azione'] ?? '') === 'updated' && !empty($t['prima'])) {
      $pr = $t['prima'];
      wp_update_term($tid, $tax, [
        'name' => $pr['name'],
        'slug' => $pr['slug'],
        'description' => $pr['description'],
      ]);
      foreach (($pr['meta'] ?? []) as $mk => $info) {
        if (!empty($info['esiste'])) {
          update_term_meta($tid, $mk, is_string($info['valore']) ? wp_slash($info['valore']) : $info['valore']);
        } else {
          delete_term_meta($tid, $mk);
        }
      }
      $out['tax_ripristinati']++;
    }
  }
} finally {
  if ($sitepress) $sitepress->switch_lang($orig_lang);
}

return $out;
`;

const PHP_SNIPPETS = {
  PHP_STATO_LIVE,
  PHP_ESEGUI_TAX,
  PHP_ESEGUI_REALIZZAZIONI,
  PHP_ESEGUI_BRAND,
  PHP_ESEGUI_RELAZIONI,
  PHP_ESEGUI_STRINGHE,
  PHP_SVUOTA_CACHE,
  PHP_ROLLBACK,
};

// =================================================================================================
// AZIONI LIVE (--stato, --esegui, --rollback)
// =================================================================================================

function tutteLeStringhe(enDati) {
  const ws = enDati.wpml_strings || {};
  return [
    ...(ws.artes_seo_archives || []),
    ...(ws.wp_options || []),
    ...(ws.artes_core || []),
  ];
}

async function leggiStatoLive(nv, enDati) {
  const ws = enDati.wpml_strings || {};
  return phpConDati(nv, PHP_STATO_LIVE, {
    lang_it: LANG_IT,
    lang_en: LANG_EN,
    st_groups: {
      artes_seo_archives: ws.artes_seo_archives || [],
      wp_options: ws.wp_options || [],
      artes_core: ws.artes_core || [],
    },
  });
}

function stampaStatoLive(stato) {
  console.log('\n=== STATO LIVE TRADUZIONE EN DATI SU DEV3 ===');
  console.log(`Plugin artes-core: ${stato.plugin_version || 'non attivo'} | Lingue WPML attive: ${(stato.active_languages || []).join(', ')}`);
  console.log('Tassonomie:');
  for (const [tax, info] of Object.entries(stato.tax || {})) {
    console.log(`  - ${tax.padEnd(16)} IT=${info.it} | EN=${info.en} (term meta OK: ${info.en_meta_ok}/${info.en})`);
  }
  console.log('CPT pubblicati:');
  for (const [pt, info] of Object.entries(stato.cpt || {})) {
    console.log(
      `  - ${pt.padEnd(16)} IT=${info.it_publish} | EN=${info.en_publish} ` +
      `(slug=${info.slug_match}/${info.en_publish}, order=${info.order_match}/${info.en_publish}, ` +
      `thumb=${info.thumb_match}/${info.en_publish}, terms_en=${info.terms_en_ok}/${info.en_publish})`
    );
  }
  const r = stato.relazioni || {};
  console.log(`Relazioni JetEngine (rel_id=3): IT<->IT=${r.it_it}, EN<->EN=${r.en_en}, miste=${r.miste} (totale=${r.totale})`);
  console.log('WPML String Translation:');
  for (const [grp, info] of Object.entries(stato.stringhe || {})) {
    console.log(`  - ${grp.padEnd(20)} registrate=${info.registrate}/${info.attese}, source_it=${info.source_it}/${info.attese}, tradotte_en=${info.tradotte_en}/${info.attese}`);
  }
}

function caricaOCreaBackup() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  if (fs.existsSync(BACKUP_FILE_DEFAULT)) {
    return JSON.parse(fs.readFileSync(BACKUP_FILE_DEFAULT, 'utf8'));
  }
  return {
    creato_il: new Date().toISOString(),
    lang_it: LANG_IT,
    lang_en: LANG_EN,
    tax: [],
    realizzazioni: [],
    brand: [],
    relazioni: [],
    stringhe: [],
  };
}

function salvaBackup(backup) {
  backup.ultimo_aggiornamento = new Date().toISOString();
  fs.writeFileSync(BACKUP_FILE_DEFAULT, JSON.stringify(backup, null, 2));
}

function unisciBackupPerChiave(esistenti, nuovi, fnChiave) {
  const visti = new Set(esistenti.map(fnChiave));
  for (const item of nuovi) {
    const k = fnChiave(item);
    if (!visti.has(k)) {
      esistenti.push(item);
      visti.add(k);
    }
  }
}

async function eseguiSuDev3(enDati, solo) {
  const { connetti } = require('./mcp-client');
  const nv = await connetti('novamira');

  const backup = caricaOCreaBackup();
  salvaBackup(backup);
  console.log(`Backup attivo: ${path.relative(root, BACKUP_FILE_DEFAULT)}`);

  const passi = solo ? [solo] : SOLO_VALIDI;

  const mapSettoreSlugEn = Object.fromEntries(enDati.settori.map((s) => [s.codice, s.slug_en]));
  const mapCatSlugEn = Object.fromEntries(enDati.categorie.map((c) => [c.slug, c.slug_en]));
  const mapCbSlugEn = Object.fromEntries(enDati.categorie_brand.map((c) => [c.slug, c.slug_en]));

  if (passi.includes('tax')) {
    console.log('\n=== [1/5] TASSONOMIE EN (settore 5, categoria 26, categoria_brand 8) ===');
    const res = await phpConDati(nv, PHP_ESEGUI_TAX, {
      lang_it: LANG_IT,
      lang_en: LANG_EN,
      settori: enDati.settori,
      categorie: enDati.categorie,
      categorie_brand: enDati.categorie_brand,
    });
    unisciBackupPerChiave(backup.tax, res.backup || [], (x) => `${x.taxonomy}::${x.term_id}`);
    salvaBackup(backup);
    for (const tax of ['settore', 'categoria', 'categoria_brand']) {
      const list = (res.report && res.report[tax]) || [];
      const creati = list.filter((x) => x.azione === 'created').length;
      const agg = list.filter((x) => x.azione === 'updated').length;
      console.log(`  OK ${tax.padEnd(16)} totale=${list.length} (creati=${creati}, aggiornati=${agg})`);
    }
  }

  if (passi.includes('realizzazioni')) {
    console.log('\n=== [2/5] CPT REALIZZAZIONE EN (20) ===');
    const items = enDati.realizzazioni.map((r) => ({
      ...r,
      settore_slug_en: mapSettoreSlugEn[r.settore],
      categoria_slug_en: mapCatSlugEn[r.categoria],
    }));
    const res = await phpConDati(nv, PHP_ESEGUI_REALIZZAZIONI, {
      lang_it: LANG_IT,
      lang_en: LANG_EN,
      items,
    });
    unisciBackupPerChiave(backup.realizzazioni, res.backup || [], (x) => `realizzazione::${x.post_id}`);
    salvaBackup(backup);
    const list = res.report || [];
    const creati = list.filter((x) => x.azione === 'created').length;
    const agg = list.filter((x) => x.azione === 'updated').length;
    console.log(`  OK realizzazioni: totale=${list.length} (create=${creati}, aggiornate=${agg})`);
    for (const r of list) {
      console.log(`     [${String(r.en_id).padStart(4)}] ${r.slug.padEnd(24)} trid=${r.trid} thumb=${r.thumb_id} (${r.azione})`);
    }
  }

  if (passi.includes('brand')) {
    console.log('\n=== [3/5] CPT BRAND EN (18) ===');
    const items = enDati.brand.map((b) => ({
      ...b,
      categoria_brand_slug_en: mapCbSlugEn[b.categoria_brand],
    }));
    const res = await phpConDati(nv, PHP_ESEGUI_BRAND, {
      lang_it: LANG_IT,
      lang_en: LANG_EN,
      items,
    });
    unisciBackupPerChiave(backup.brand, res.backup || [], (x) => `brand::${x.post_id}`);
    salvaBackup(backup);
    const list = res.report || [];
    const creati = list.filter((x) => x.azione === 'created').length;
    const agg = list.filter((x) => x.azione === 'updated').length;
    console.log(`  OK brand: totale=${list.length} (creati=${creati}, aggiornati=${agg})`);
    for (const b of list) {
      console.log(`     [${String(b.en_id).padStart(4)}] ${b.slug.padEnd(20)} trid=${b.trid} thumb=${b.thumb_id} (${b.azione})`);
    }
  }

  if (passi.includes('relazioni')) {
    console.log('\n=== [4/5] RELAZIONI JETENGINE EN<->EN (8, rel_id=3) ===');
    const res = await phpConDati(nv, PHP_ESEGUI_RELAZIONI, {
      lang_en: LANG_EN,
      relazioni: enDati.relazioni,
    });
    unisciBackupPerChiave(backup.relazioni, res.backup || [], (x) => `rel::${x.row_id}`);
    salvaBackup(backup);
    const list = res.report || [];
    for (const r of list) {
      console.log(`  OK #${String(r.row_id).padStart(3)} ${r.pair.padEnd(42)} (${r.parent_id} -> ${r.child_id}, ${r.azione})`);
    }
  }

  if (passi.includes('stringhe')) {
    console.log('\n=== [5/5] WPML STRING TRANSLATION (admin_texts + WP Tagline + artes-core) ===');
    const res = await phpConDati(nv, PHP_ESEGUI_STRINGHE, {
      lang_it: LANG_IT,
      lang_en: LANG_EN,
      items: tutteLeStringhe(enDati),
    });
    unisciBackupPerChiave(backup.stringhe, res.backup || [], (x) => `${x.context}::${x.name}`);
    salvaBackup(backup);
    const rep = res.report || {};
    console.log(
      `  OK stringhe: tradotte=${rep.translations_saved}, nuove_registrate=${rep.created_strings}, ` +
      `source_lang_corrette_a_it=${rep.updated_language_to_it}`
    );
  }

  // Svuota tutte le cache (Elementor + WPML + ST + WP)
  await phpConDati(nv, PHP_SVUOTA_CACHE, {});
  console.log('\nCache Elementor, WPML, WPML ST e WordPress svuotate.');

  // Verifica finale live post-esecuzione
  const stato = await leggiStatoLive(nv, enDati);
  stampaStatoLive(stato);

  const errLive = [];
  if (passi.includes('tax')) {
    if (stato.tax.settore.en !== 5 || stato.tax.settore.en_meta_ok !== 5) errLive.push(`settore EN incompleto: ${JSON.stringify(stato.tax.settore)}`);
    if (stato.tax.categoria.en !== 26 || stato.tax.categoria.en_meta_ok !== 26) errLive.push(`categoria EN incompleta: ${JSON.stringify(stato.tax.categoria)}`);
    if (stato.tax.categoria_brand.en !== 8 || stato.tax.categoria_brand.en_meta_ok !== 8) errLive.push(`categoria_brand EN incompleta: ${JSON.stringify(stato.tax.categoria_brand)}`);
  }
  if (passi.includes('realizzazioni')) {
    const r = stato.cpt.realizzazione;
    if (r.en_publish !== 20 || r.slug_match !== 20 || r.order_match !== 20 || r.thumb_match !== 20 || r.terms_en_ok !== 20) {
      errLive.push(`realizzazione EN non conforme: ${JSON.stringify(r)}`);
    }
  }
  if (passi.includes('brand')) {
    const b = stato.cpt.brand;
    if (b.en_publish !== 18 || b.slug_match !== 18 || b.order_match !== 18 || b.thumb_match !== 18 || b.terms_en_ok !== 18) {
      errLive.push(`brand EN non conforme: ${JSON.stringify(b)}`);
    }
  }
  if (passi.includes('relazioni')) {
    const rel = stato.relazioni;
    if (rel.it_it !== 8 || rel.en_en !== 8 || rel.miste !== 0) {
      errLive.push(`relazioni JetEngine non conformi: ${JSON.stringify(rel)}`);
    }
  }
  if (passi.includes('stringhe')) {
    for (const [grp, info] of Object.entries(stato.stringhe || {})) {
      if (info.tradotte_en !== info.attese || info.source_it !== info.attese) {
        errLive.push(`stringhe ${grp} incomplete: ${JSON.stringify(info)}`);
      }
    }
  }

  if (errLive.length) {
    throw new Error(`Verifica live post-esecuzione fallita:\n  - ${errLive.join('\n  - ')}`);
  }
  console.log('\n=== VERIFICA LIVE POST-ESECUZIONE: TUTTO OK ===');
}

async function rollbackDaBackup(fileBackup) {
  if (!fs.existsSync(fileBackup)) {
    throw new Error(`File di backup non trovato: ${fileBackup}`);
  }
  const backup = JSON.parse(fs.readFileSync(fileBackup, 'utf8'));
  const { connetti } = require('./mcp-client');
  const nv = await connetti('novamira');

  console.log(`=== ROLLBACK TRADUZIONE EN DATI DA ${path.relative(root, fileBackup)} ===`);
  const res = await phpConDati(nv, PHP_ROLLBACK, {
    lang_en: backup.lang_en || LANG_EN,
    stringhe: backup.stringhe || [],
    relazioni: backup.relazioni || [],
    brand: backup.brand || [],
    realizzazioni: backup.realizzazioni || [],
    tax: backup.tax || [],
  });
  await phpConDati(nv, PHP_SVUOTA_CACHE, {});
  console.log('Risultato rollback:', JSON.stringify(res, null, 2));
  console.log('Cache Elementor, WPML, WPML ST e WordPress svuotate. Rollback completato (contenuti IT intatti).');
}

if (require.main === module) {
  (async () => {
    const args = process.argv.slice(2);
    const modePiano = args.includes('--piano');
    const modeStato = args.includes('--stato');
    const modeEsegui = args.includes('--esegui');
    const idxRollback = args.indexOf('--rollback');
    const modeRollback = idxRollback >= 0;
    const idxSolo = args.indexOf('--solo');
    const solo = idxSolo >= 0 ? (args[idxSolo + 1] || '').toLowerCase() : null;

    if (!modePiano && !modeStato && !modeEsegui && !modeRollback) {
      console.error('Uso: wpml-trad-dati.js --piano | --stato | --esegui [--solo tax|realizzazioni|brand|relazioni|stringhe] | --rollback [file]');
      process.exit(2);
    }
    if (solo && !SOLO_VALIDI.includes(solo)) {
      throw new Error(`Valore --solo non valido: "${solo}" (attesi: ${SOLO_VALIDI.join(', ')})`);
    }

    if (modeRollback) {
      const nextArg = args[idxRollback + 1];
      const fileBackup = (nextArg && !nextArg.startsWith('--')) ? path.resolve(root, nextArg) : BACKUP_FILE_DEFAULT;
      await rollbackDaBackup(fileBackup);
      return;
    }

    const enDati = localizzaDatasetEn(caricaJson(EN_DATI_PATH));

    if (modeStato) {
      const { connetti } = require('./mcp-client');
      const nv = await connetti('novamira');
      const stato = await leggiStatoLive(nv, enDati);
      stampaStatoLive(stato);
      return;
    }

    const itDati = caricaJson(IT_DATI_PATH);
    const validazione = validaOffline(enDati, itDati);
    const nErrori = stampaPiano(enDati, validazione);
    if (nErrori > 0) {
      throw new Error(`Verifica offline fallita con ${nErrori} errori: nessuna scrittura eseguita.`);
    }

    if (modeEsegui) {
      await eseguiSuDev3(enDati, solo);
    }
  })().catch((e) => {
    console.error('ERRORE:', e.message);
    process.exit(1);
  });
}

module.exports = {
  EN_DATI_PATH,
  IT_DATI_PATH,
  BACKUP_FILE_DEFAULT,
  GLOSSARIO_SETTORI_EN,
  GLOSSARIO_CAT_BRAND_EN,
  PHP_SNIPPETS,
  caricaJson,
  estraiLinkHtml,
  controllaTagHtmlBilanciati,
  validaOffline,
};
