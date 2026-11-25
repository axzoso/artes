'use strict';
// Traduzione EN (WPML `en-gb`, URL `/en/...`) deterministica 1:1 dei 6 Theme Builder Site Parts
// e delle 12 Pagine pubblicate su dev3 (Elementor Atomic V4 + WPML 5.2.0).
//
// Modalità CLI:
//   node tools/rev2/wpml-trad-pagine.js --piano [--solo ...]         verifica 100% offline (0 scritture, 0 chiamate di rete)
//   node tools/rev2/wpml-trad-pagine.js --verifica-live [--solo ...] cross-check in SOLA LETTURA sul _elementor_data live di dev3
//   node tools/rev2/wpml-trad-pagine.js --stato                      stato live IT/EN, trid, URL, SEO, condizioni su dev3
//   node tools/rev2/wpml-trad-pagine.js --esegui [--solo ...]        crea/aggiorna i 6+12 post EN su dev3 con backup integrale
//   node tools/rev2/wpml-trad-pagine.js --rollback [file-backup]     rimuove solo i post EN creati dallo script / ripristina snapshot
//
// REGOLE CRITICHE:
//   - NON traduce le 5 bozze (153, 154, 471, 472, 491) né i 3 [Riserva] (539-541).
//   - NON copia MAI `_elementor_conditions` sui 6 Site Parts EN (557, 971, 1040, 1049, 1050, 1051):
//     solo i template IT mantengono `_elementor_conditions`; WPML li sostituisce automaticamente via `wpml_object_id`.
//   - NON altera MAI shortcode dinamici (`[artes_*]`), tag dinamici JetEngine/Elementor, classi CSS, layout,
//     ID ancore (`_cssid`) né i `_cssid`/`name`/`input-id`/`to`/`reply-to`/`message` del modulo Contatti 152.
//   - Copia esplicitamente `_wp_page_template = 'elementor_header_footer'`, `_elementor_edit_mode = 'builder'`,
//     `_elementor_template_type`, `_elementor_version`, `_artes_rev2 = '1'`, `_thumbnail_id`, `settore_collegato`,
//     imposta `native-editor` in `WPML_PB_Last_Translation_Edit_Mode`, e scrive `_artes_seo_title` / `_artes_seo_description` EN.

const fs = require('fs');
const path = require('path');
const { parse, trova } = require('./html-parse');
const { converti } = require('./html2elementor');
const { DOCUMENTI: DOCS_REV2, costruisciDocumento, phpConDati } = require('./aggiorna-link-contatti');
const { compilaTutte: compilaBozzeRev2 } = require('./pagine-bozze-rev2');

const root = path.resolve(__dirname, '..', '..');
const outDir = path.join(root, 'tools', 'out', 'rev2');
const tradDir = path.join(__dirname, 'traduzioni');
const FILE_TRAD_TEMPLATE = path.join(tradDir, 'en-template.json');
const FILE_TRAD_PAGINE = path.join(tradDir, 'en-pagine.json');
const FILE_LEGALI = path.join(root, 'tools', 'contenuti-pagine-legali.json');
const BACKUP_FILE_DEFAULT = path.join(outDir, 'wpml-trad-pagine-backup.json');

const LANG_EN = 'en-gb';
const LANG_IT = 'it';
const URL_PREFIX_EN = '/en';

// ID vietati (3 [Riserva]): non devono mai entrare nel perimetro
const IDS_VIETATI = new Set([539, 540, 541]);
// Pagine fuori rev2 in bozza (2026-11-25: tradotte anche loro, ma la traduzione EN resta in BOZZA come l'italiano)
const IDS_BOZZE = [153, 154, 471, 472, 491];

// Catalogo ordinato dei 6 Theme Builder Site Parts + 12 Pagine pubblicate + 5 bozze
const SITE_PARTS_IDS = [557, 971, 1040, 1049, 1050, 1051];
const PAGINE_IDS = [376, 144, 145, 146, 147, 148, 149, 150, 151, 152, 3, 493, ...IDS_BOZZE];
const TUTTI_IDS = [...SITE_PARTS_IDS, ...PAGINE_IDS];

// Mappa id pagina settore IT -> slug canonico tassonomia `settore`
const PAGINE_SETTORE_MAP = {
  144: 'uffici',
  145: 'retail',
  146: 'food',
  147: 'bar-ristoranti',
  148: 'hospitality',
};

// Campi tecnici del modulo Contatti 152 che NON vanno mai modificati
const FORM_152_CAMPI_TECNICI = [
  'nome', 'azienda', 'email', 'telefono', 'motivo',
  'richiesta_settore', 'messaggio', 'allegati', 'privacy',
];

// Tag HTML ammessi nei testi Atomic V4
const HTML_VOID_TAGS = new Set(['br', 'hr', 'img', 'wbr']);
const HTML_INLINE_TAGS = new Set(['a', 'strong', 'b', 'em', 'i', 'span', 'small', 'sup', 'sub', 'u', 's', 'del', 'br']);

// Lista controllata di parole italiane spia per il controllo residui (esclusi nomi propri/località/URL)
const NOMI_PROPRI_CONSENTITI = [
  'Artes srl',
  'Artes',
  'ARTES',
  'Rende (CS)',
  'Rende',
  'Via A. Nervoso 1',
  'Calabria',
  'Ruffolo Group',
  'Costruzioni Imbrogno',
  'BCC di Tarsia',
  'Il Quotidiano',
  'Ingrediente School',
  'Arpacal',
  'ARPACAL',
  'Free Sport',
  'Lico',
  'Tema Motori',
  'Wellness Universe',
  'Perfect Man',
  'Morgana',
  'Calzature Rao',
  'Sakuralab',
  'Agricola Luigi Benincasa',
  'La bottega del vicinato',
  'Jumecitu',
  'Soft Bar',
  'Lido da Pietro',
  'Royal Hotel',
  'Garante per la protezione dei dati personali',
  'Acquisti in Rete PA',
  'agriturismos',
  'trattorias',
  'osterias',
  'pizzerias',
  'gelaterias',
];

const PAROLE_ITALIANE_SPIA_RE = /\b(arredo|arredi|arredamenti|arredamento|falegnameria|commessa|commesse|sopralluogo|sopralluoghi|preventivo|preventivi|realizzazioni|realizzazione|uffici|negozi|ristoranti|contatti|informativa|titolare|trattamento|diritti|obbligatori|richiedi|scopri|parla|progettazione|montaggio|fornitura|forniture|assistenza|referente|interlocutore|cantiere|capitolato|planimetria|planimetrie|azienda|aziende|settore|settori|categoria|categorie|località|tipologia|tipologie|progettista|progettisti|galleria|schede|scheda|tutti|tutte|nessuna|nessun|invia|scrivici|chi siamo|su misura|dalla|delle|degli|dello|nella|nelle|siamo|abbiamo|nostro|nostra|nostri|vostro|vostra|vostri|perché|cos'è)\b/i;

function caricaDizionari() {
  const tplJson = JSON.parse(fs.readFileSync(FILE_TRAD_TEMPLATE, 'utf8'));
  const pagJson = JSON.parse(fs.readFileSync(FILE_TRAD_PAGINE, 'utf8'));
  const specs = new Map();

  for (const id of SITE_PARTS_IDS) {
    const entry = tplJson.template && tplJson.template[String(id)];
    if (!entry) throw new Error(`en-template.json: voce mancante per template ${id}`);
    specs.set(id, {
      id,
      gruppo: 'template',
      postType: 'elementor_library',
      slugIt: entry.slug_it,
      slugEn: entry.slug_en,
      postTitleEn: entry.post_title_en,
      tipoTemplate: entry.tipo_template,
      copiaElementorConditions: false,
      testi: entry.testi || {},
      invarianti: entry.invarianti || [],
      modulo: null,
      seoTitleEn: null,
      seoDescriptionEn: null,
      settoreSlug: null,
    });
  }

  for (const id of PAGINE_IDS) {
    const entry = pagJson.pagine && pagJson.pagine[String(id)];
    if (!entry) throw new Error(`en-pagine.json: voce mancante per pagina ${id}`);
    specs.set(id, {
      id,
      gruppo: 'pagina',
      postType: 'page',
      slugIt: entry.slug,
      slugEn: URL_EN.PAGINE[entry.slug] || entry.slug, // slug inglese (wpml-url-en.js); la Home resta 'home'
      urlEn: entry.url_en,
      postTitleEn: entry.post_title_en,
      tipoTemplate: 'wp-page',
      copiaElementorConditions: false,
      testi: entry.testi || {},
      invarianti: entry.invarianti || [],
      modulo: entry.modulo || null,
      seoTitleEn: entry.seo_title_en || '',
      seoDescriptionEn: entry.seo_description_en || '',
      settoreSlug: entry.settore_slug || null,
    });
  }

  for (const id of specs.keys()) {
    if (IDS_VIETATI.has(id)) {
      throw new Error(`ID vietato (bozza o Riserva) presente nei dizionari: ${id}`);
    }
  }
  return specs;
}

// --- Costruttore offline dei 18 documenti in formato Elementor Atomic V4 `_elementor_data` -------------------------

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

const CONTAINER_EL_TYPES = new Set([
  'e-div-block',
  'e-flexbox',
  'e-grid',
  'e-accordion',
  'e-accordion-item',
  'e-accordion-item-header',
  'e-accordion-item-title',
  'e-accordion-item-content',
  'e-collection-loop',
  'e-collection-loop-layout',
  'e-collection-loop-item',
  'e-form',
  'e-form-success-message',
  'e-form-error-message',
]);

function wrapAtomicProp(val, preferredType = 'string') {
  if (val === undefined || val === null) return undefined;
  if (typeof val === 'object' && !Array.isArray(val) && typeof val.name === 'string' && val.settings) {
    const dynSettings = {};
    for (const [k, v] of Object.entries(val.settings)) {
      dynSettings[k] = { $$type: 'string', value: String(v) };
    }
    return { $$type: 'dynamic', value: { name: val.name, settings: dynSettings } };
  }
  if (typeof val === 'boolean') return { $$type: 'boolean', value: val };
  if (typeof val === 'number') return { $$type: 'number', value: val };
  return { $$type: preferredType, value: String(val) };
}

function configToAtomicSettings(elType, cfg = {}, cls = []) {
  const settings = {};
  if (cls && cls.length) {
    settings.classes = { $$type: 'classes', value: [...cls] };
  }
  for (const [k, v] of Object.entries(cfg)) {
    if (v === undefined) continue;
    if (k === 'title' || k === 'paragraph' || k === 'text') {
      settings[k] = wrapAtomicProp(v, 'escaped-html');
    } else if (k === 'link' && v && typeof v === 'object') {
      const dest = (typeof v.destination === 'object' && v.destination && v.destination.name)
        ? wrapAtomicProp(v.destination)
        : { $$type: 'url', value: String(v.destination || '') };
      settings.link = {
        $$type: 'link',
        value: {
          destination: dest,
          tag: { $$type: 'string', value: String(v.tag || 'a') },
        },
      };
    } else if (k === 'options' && Array.isArray(v)) {
      settings.options = {
        $$type: 'options',
        value: v.map((opt) => ({
          $$type: 'key-value',
          value: {
            key: { $$type: 'string', value: String(opt.key) },
            value: { $$type: 'string', value: String(opt.value) },
          },
        })),
      };
    } else if (k === 'email' && v && typeof v === 'object') {
      const em = {};
      if (Array.isArray(v.to)) {
        em.to = { $$type: 'string-array', value: v.to.map((x) => ({ $$type: 'string', value: String(x) })) };
      }
      for (const ek of ['subject', 'message', 'reply-to', 'send-as', 'from-name']) {
        if (v[ek] !== undefined) em[ek] = { $$type: 'string', value: String(v[ek]) };
      }
      settings.email = { $$type: 'emails', value: em };
    } else if (k === 'actions-after-submit' && Array.isArray(v)) {
      settings['actions-after-submit'] = {
        $$type: 'string-array',
        value: v.map((x) => ({ $$type: 'string', value: String(x) })),
      };
    } else if (k === 'image' || k === 'query') {
      settings[k] = v;
    } else {
      settings[k] = wrapAtomicProp(v, 'string');
    }
  }
  return settings;
}

// Converte `{ xml_structure, element_config, classes }` (output di html2elementor / pagine-bozze-rev2)
// in un albero identico a `_elementor_data` di Elementor 4.4.1 Atomic V4.
function composizioneToElementorTree(comp) {
  const xml = comp.xml_structure || '';
  const cfgs = comp.element_config || {};
  const clss = comp.classes || {};
  const tokenRe = /<\/([a-z0-9-]+)>|<([a-z0-9-]+)([^>]*)>/gi;

  const rootChildren = [];
  const stack = [{ elements: rootChildren }];
  let seq = 0;

  let m;
  while ((m = tokenRe.exec(xml)) !== null) {
    if (m[1]) {
      if (stack.length <= 1) throw new Error(`XML composizione sbilanciato: </${m[1]}>`);
      stack.pop();
      continue;
    }
    const tag = m[2];
    const attrs = m[3] || '';
    const selfClosing = /\/\s*$/.test(attrs);
    const idMatch = /configuration-id="([^"]*)"/.exec(attrs);
    const cfgId = idMatch
      ? idMatch[1].replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&amp;/g, '&')
      : '';
    const cfg = cfgs[cfgId] || {};
    const cls = clss[cfgId] || [];
    const isContainer = CONTAINER_EL_TYPES.has(tag);

    seq++;
    const node = isContainer
      ? {
          id: `off_${seq}`,
          elType: tag,
          settings: configToAtomicSettings(tag, cfg, cls),
          elements: [],
          isInner: stack.length > 1,
        }
      : {
          id: `off_${seq}`,
          elType: 'widget',
          widgetType: tag,
          settings: configToAtomicSettings(tag, cfg, cls),
          elements: [],
        };

    stack[stack.length - 1].elements.push(node);
    if (!selfClosing) {
      stack.push(node);
    }
  }
  if (stack.length !== 1) {
    throw new Error(`XML composizione incompleto: ${stack.length - 1} nodi non chiusi`);
  }
  return rootChildren;
}

function costruisciAlberoOffline(docId) {
  const rev2Doc = DOCS_REV2.find((d) => d.id === docId);
  if (rev2Doc) {
    const built = costruisciDocumento(rev2Doc);
    if (built.avvisiCritici.length) {
      throw new Error(`Documento ${docId} (${rev2Doc.nome}): avvisi critici offline: ${built.avvisiCritici.join('; ')}`);
    }
    return composizioneToElementorTree(built.risultato.composizione);
  }

  // Contatti (152) e le 5 pagine fuori rev2 (bozze): HTML generato da pagine-bozze-rev2.js
  if ([152, ...IDS_BOZZE].includes(docId)) {
    // compilaTutte restituisce { risultati, erroriGlobali }
    const res = compilaBozzeRev2(new Set([String(docId)])).risultati;
    if (!res.length || res[0].errori.length) {
      throw new Error(`Pagina ${docId} offline fallita: ${res.length ? res[0].errori.join('; ') : 'non trovata'}`);
    }
    return composizioneToElementorTree(res[0].composizione);
  }

  if (docId === 3 || docId === 493) {
    const legali = JSON.parse(fs.readFileSync(FILE_LEGALI, 'utf8'));
    const key = docId === 3 ? 'privacy-policy' : 'cookie-policy';
    const c = legali[key];
    if (!c) throw new Error(`Voce legale mancante in contenuti-pagine-legali.json: ${key}`);
    const html = buildHtmlLegale(c);
    const { radice, avvisi: ap } = parse(html);
    if (ap.length) throw new Error(`Parser legale ${key}: ${ap.join('; ')}`);
    const main = trova(radice, (n) => n.tag === 'main')[0];
    const conv = converti(main, { file: `${key}.html`, soloFigli: true, radice: { classi: ['page-root'] } });
    if (conv.avvisi.length) throw new Error(`html2elementor legale ${key}: ${conv.avvisi.join('; ')}`);
    return composizioneToElementorTree(conv.composizione);
  }

  throw new Error(`Nessun costruttore offline definito per ID ${docId}`);
}

// --- Normalizzazione, riscrittura URL, validazione HTML e motore di traduzione 1:1 --------------------------------

function normalizzaHrefAmp(str) {
  return String(str).replace(/href=(["'])([^"']*)\1/gi, (full, q, url) => {
    const normUrl = url.replace(/&amp;/gi, '&');
    return `href=${q}${normUrl}${q}`;
  });
}

function escapaHrefAmp(str) {
  return String(str).replace(/href=(["'])([^"']*)\1/gi, (full, q, url) => {
    const escUrl = url.replace(/&(?!amp;|lt;|gt;|quot;|#)/gi, '&amp;');
    return `href=${q}${escUrl}${q}`;
  });
}

function classificaUrl(raw) {
  const u = String(raw || '').trim();
  if (!u) return 'vuoto';
  if (u.startsWith('#')) return 'ancora';
  if (/^tel:/i.test(u)) return 'tel';
  if (/^mailto:/i.test(u)) return 'mailto';
  if (/^https?:\/\//i.test(u)) return 'esterno';
  if (u.startsWith('/')) return 'interno';
  return 'altro';
}

// Indirizzi inglesi: tabella unica in tools/rev2/wpml-url-en.js (percorsi delle pagine, basi delle schede, slug dei termini nei filtri).
const URL_EN = require('./wpml-url-en');
function riscriviUrlInterno(raw) {
  const u = String(raw || '').trim();
  if (classificaUrl(u) !== 'interno') return u;
  return URL_EN.localizzaUrl(u);
}

function riscriviLinkInline(html) {
  let countRewritten = 0;
  const out = String(html).replace(/href=(["'])([^"']*)\1/gi, (full, q, url) => {
    if (classificaUrl(url) !== 'interno') return full;
    const rewritten = riscriviUrlInterno(url);
    if (rewritten !== url) countRewritten++;
    return `href=${q}${rewritten}${q}`;
  });
  return { html: escapaHrefAmp(out), countRewritten };
}

function validaBilanciamentoHtml(html, contesto, errori) {
  const s = String(html || '');
  const stack = [];
  const tagCounts = {};
  const tagRe = /<\/?([a-zA-Z][a-zA-Z0-9]*)\b[^>]*>/g;
  let m;
  while ((m = tagRe.exec(s)) !== null) {
    const full = m[0];
    const name = m[1].toLowerCase();
    const isClose = full.startsWith('</');
    const isSelf = /\/>$/.test(full) || HTML_VOID_TAGS.has(name);

    if (!HTML_INLINE_TAGS.has(name)) {
      errori.push(`${contesto}: tag HTML inatteso <${name}>`);
    }
    if (isSelf && !isClose) {
      tagCounts[name] = (tagCounts[name] || 0) + 1;
      continue;
    }
    if (!isClose) {
      stack.push(name);
      tagCounts[name] = (tagCounts[name] || 0) + 1;
    } else {
      const top = stack.pop();
      if (top !== name) {
        errori.push(`${contesto}: tag HTML sbilanciato (trovato </${name}>, atteso ${top ? `</${top}>` : 'nessuno'})`);
      }
    }
  }
  if (stack.length) {
    errori.push(`${contesto}: tag HTML non chiusi: ${stack.map((t) => `<${t}>`).join(', ')}`);
  }
  return tagCounts;
}

function controllaResiduiItaliani(htmlTesto, contesto, errori) {
  let plain = String(htmlTesto || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/\s+/g, ' ')
    .trim();
  if (!plain) return;
  for (const np of NOMI_PROPRI_CONSENTITI) {
    plain = plain.split(np).join(' ');
  }
  if (/\bP\.IVA\b/i.test(plain)) {
    errori.push(`${contesto}: residuo italiano "P.IVA" (usare "VAT") in "${htmlTesto.slice(0, 90)}"`);
  }
  const m = PAROLE_ITALIANE_SPIA_RE.exec(plain);
  if (m) {
    errori.push(`${contesto}: possibile residuo italiano "${m[0]}" in "${htmlTesto.slice(0, 90)}"`);
  }
}

function costruisciIndiceTesti(spec) {
  const exactMap = new Map();
  const normMap = new Map();
  const invExact = new Set(spec.invarianti || []);
  const invNorm = new Set((spec.invarianti || []).map(normalizzaHrefAmp));
  const usedKeys = new Set();

  for (const [k, v] of Object.entries(spec.testi || {})) {
    exactMap.set(k, v);
    normMap.set(normalizzaHrefAmp(k), { origKey: k, val: v });
  }

  return {
    risolvi(rawStr) {
      if (exactMap.has(rawStr)) {
        usedKeys.add(rawStr);
        return { found: true, invariant: false, value: exactMap.get(rawStr) };
      }
      const norm = normalizzaHrefAmp(rawStr);
      if (normMap.has(norm)) {
        const hit = normMap.get(norm);
        usedKeys.add(hit.origKey);
        return { found: true, invariant: false, value: hit.val };
      }
      if (invExact.has(rawStr) || invNorm.has(norm)) {
        return { found: true, invariant: true, value: rawStr };
      }
      return { found: false, invariant: false, value: rawStr };
    },
    chiaviNonUsate() {
      return Object.keys(spec.testi || {}).filter((k) => !usedKeys.has(k));
    },
  };
}

function estraiFirmaStrutturale(tree) {
  let nodes = 0;
  const dynamics = [];
  const cssIds = [];
  const formTech = [];
  const externalLinks = [];
  const internalLinks = [];

  function walk(list) {
    if (!Array.isArray(list)) return;
    for (const n of list) {
      if (!n || typeof n !== 'object') continue;
      nodes++;
      const s = n.settings || {};
      const wt = n.widgetType || n.elType || '';

      if (s._cssid && typeof s._cssid.value === 'string' && s._cssid.value) {
        cssIds.push(`${wt}:${s._cssid.value}`);
      }
      if (wt === 'e-form') {
        const toArr = (((s.email || {}).value || {}).to || {}).value || [];
        formTech.push({
          wt,
          to: toArr.map((x) => x.value),
          replyTo: ((((s.email || {}).value || {})['reply-to']) || {}).value,
          message: ((((s.email || {}).value || {}).message) || {}).value,
          sendAs: ((((s.email || {}).value || {})['send-as']) || {}).value,
          actions: (((s['actions-after-submit'] || {}).value) || []).map((x) => x.value),
        });
      }
      if (wt.startsWith('e-form-') && wt !== 'e-form-success-message' && wt !== 'e-form-error-message') {
        formTech.push({
          wt,
          cssid: s._cssid && s._cssid.value,
          name: s.name && s.name.value,
          inputId: s['input-id'] && s['input-id'].value,
          type: s.type && s.type.value,
        });
      }

      // Dynamic tags (title, paragraph, text, link.value.destination, image)
      const dynCandidates = [
        ['title', s.title],
        ['paragraph', s.paragraph],
        ['text', s.text],
        ['link.dest', s.link && s.link.value && s.link.value.destination],
      ];
      for (const [prop, val] of dynCandidates) {
        if (val && typeof val === 'object' && val.$$type === 'dynamic') {
          dynamics.push(`${wt}.${prop}:${val.value && val.value.name}:${JSON.stringify((val.value && val.value.settings) || {})}`);
        }
      }

      // Links (widget destination)
      const dest = s.link && s.link.value && s.link.value.destination;
      if (dest && dest.$$type === 'url' && typeof dest.value === 'string') {
        const cls = classificaUrl(dest.value);
        if (cls === 'interno') internalLinks.push(dest.value);
        else if (cls !== 'vuoto') externalLinks.push(dest.value);
      }

      // Inline hrefs in text props
      for (const prop of ['title', 'paragraph', 'text']) {
        const pv = s[prop];
        if (pv && (pv.$$type === 'escaped-html' || pv.$$type === 'string') && typeof pv.value === 'string') {
          for (const m of pv.value.matchAll(/href=["']([^"']+)["']/gi)) {
            const href = m[1];
            const cls = classificaUrl(href);
            if (cls === 'interno') internalLinks.push(href);
            else if (cls !== 'vuoto') externalLinks.push(href);
          }
        }
      }

      if (Array.isArray(n.elements)) walk(n.elements);
    }
  }

  walk(tree);
  return { nodes, dynamics, cssIds, formTech, externalLinks, internalLinks };
}

function traduciAlberoElementor(treeIt, spec) {
  const treeEn = JSON.parse(JSON.stringify(treeIt));
  const indice = costruisciIndiceTesti(spec);

  const stats = {
    testiTradotti: 0,
    testiInvarianti: 0,
    testiNonMappati: [],
    opzioniTradotte: 0,
    opzioniNonMappate: [],
    campiModuloTradotti: 0,
    linkWidgetRiscritti: 0,
    linkInlineRiscritti: 0,
    linkPreservatiNonInterni: 0,
    errori: [],
  };

  function traduciPropTesto(obj, propKey, ctx) {
    const pv = obj[propKey];
    if (!pv || typeof pv !== 'object') return;
    if (pv.$$type === 'dynamic') return;
    if (pv.$$type !== 'escaped-html' && pv.$$type !== 'string') return;
    const raw = String(pv.value ?? '');
    if (raw === '') return; // span strutturali vuoti (es. nav-toggle__bar)

    const hit = indice.risolvi(raw);
    if (!hit.found) {
      stats.testiNonMappati.push({ ctx, valore: raw });
      return;
    }

    let translated = String(hit.value);
    const itTags = validaBilanciamentoHtml(raw, `${ctx} (IT)`, stats.errori);
    if (translated !== '') {
      const { html: linkedHtml } = riscriviLinkInline(translated);
      translated = linkedHtml;
      const enTags = validaBilanciamentoHtml(translated, `${ctx} (EN)`, stats.errori);
      for (const t of ['a', 'strong', 'br', 'span']) {
        if ((itTags[t] || 0) !== (enTags[t] || 0)) {
          stats.errori.push(`${ctx}: conteggio tag <${t}> diverso tra IT (${itTags[t] || 0}) ed EN (${enTags[t] || 0})`);
        }
      }
      if (!hit.invariant) {
        controllaResiduiItaliani(translated, ctx, stats.errori);
      }
    }

    // Conta eventuali link inline interni presenti nella stringa tradotta
    for (const m of translated.matchAll(/href=["']([^"']+)["']/gi)) {
      const cls = classificaUrl(m[1]);
      if (cls === 'interno') stats.linkInlineRiscritti++;
      else if (cls !== 'vuoto') stats.linkPreservatiNonInterni++;
    }

    pv.value = translated;
    if (hit.invariant) stats.testiInvarianti++;
    else stats.testiTradotti++;
  }

  function walk(list) {
    if (!Array.isArray(list)) return;
    for (const node of list) {
      if (!node || typeof node !== 'object') continue;
      const s = node.settings || {};
      const wt = node.widgetType || node.elType || 'unknown';
      const ctx = `[${spec.id}] ${wt}#${node.id || '?'}`;

      // 1. Testi visibili nei widget Atomic V4
      if (wt === 'e-heading') {
        traduciPropTesto(s, 'title', `${ctx}.title`);
      } else if (wt === 'e-paragraph') {
        traduciPropTesto(s, 'paragraph', `${ctx}.paragraph`);
      } else if (wt === 'e-button' || wt === 'e-form-label' || wt === 'e-form-submit-button') {
        traduciPropTesto(s, 'text', `${ctx}.text`);
      } else if (wt === 'e-form-textarea' || wt === 'e-form-input') {
        if (s.placeholder && typeof s.placeholder.value === 'string' && s.placeholder.value !== '') {
          traduciPropTesto(s, 'placeholder', `${ctx}.placeholder`);
        }
      } else if (wt === 'e-form-select') {
        const fieldId = (s._cssid && s._cssid.value) || (s.name && s.name.value) || '';
        const mapOpts = spec.modulo && spec.modulo.select_options && spec.modulo.select_options[fieldId];
        if (!mapOpts) {
          stats.errori.push(`${ctx}: manca modulo.select_options["${fieldId}"] in en-pagine.json`);
        } else {
          const opts = (s.options && Array.isArray(s.options.value)) ? s.options.value : [];
          for (let i = 0; i < opts.length; i++) {
            const kv = opts[i] && opts[i].value;
            if (!kv || !kv.key || !kv.value) continue;
            const origKey = String(kv.key.value || '');
            const origVal = String(kv.value.value || '');
            if (!Object.prototype.hasOwnProperty.call(mapOpts, origKey)) {
              stats.opzioniNonMappate.push({ ctx: `${ctx}.options[${i}]`, fieldId, valore: origKey });
            } else {
              const tr = String(mapOpts[origKey]);
              controllaResiduiItaliani(tr, `${ctx}.options[${i}]`, stats.errori);
              kv.key.value = tr;
              kv.value.value = Object.prototype.hasOwnProperty.call(mapOpts, origVal) ? String(mapOpts[origVal]) : tr;
              stats.opzioniTradotte++;
            }
          }
          if (s.value && typeof s.value.value === 'string' && s.value.value !== '') {
            const origDef = s.value.value;
            if (!Object.prototype.hasOwnProperty.call(mapOpts, origDef)) {
              stats.opzioniNonMappate.push({ ctx: `${ctx}.default`, fieldId, valore: origDef });
            } else {
              s.value.value = String(mapOpts[origDef]);
              stats.campiModuloTradotti++;
            }
          }
        }
      } else if (wt === 'e-form-checkbox') {
        const fieldId = (s._cssid && s._cssid.value) || (s.name && s.name.value) || '';
        const cbMap = spec.modulo && spec.modulo.checkbox_values;
        if (s.value && typeof s.value.value === 'string' && s.value.value !== '') {
          if (!cbMap || !Object.prototype.hasOwnProperty.call(cbMap, fieldId)) {
            stats.errori.push(`${ctx}: manca modulo.checkbox_values["${fieldId}"] in en-pagine.json`);
          } else {
            s.value.value = String(cbMap[fieldId]);
            stats.campiModuloTradotti++;
          }
        }
      } else if (wt === 'e-form') {
        if (!spec.modulo) {
          stats.errori.push(`${ctx}: widget e-form presente ma sezione "modulo" mancante in en-pagine.json`);
        } else {
          if (s['form-name'] && typeof s['form-name'].value === 'string') {
            if (!spec.modulo.form_name) stats.errori.push(`${ctx}: modulo.form_name mancante`);
            else { s['form-name'].value = String(spec.modulo.form_name); stats.campiModuloTradotti++; }
          }
          const em = s.email && s.email.value;
          if (em && em.subject && typeof em.subject.value === 'string') {
            if (!spec.modulo.email_subject) stats.errori.push(`${ctx}: modulo.email_subject mancante`);
            else { em.subject.value = String(spec.modulo.email_subject); stats.campiModuloTradotti++; }
          }
          if (em && em['from-name'] && typeof em['from-name'].value === 'string') {
            if (!spec.modulo.email_from_name) stats.errori.push(`${ctx}: modulo.email_from_name mancante`);
            else { em['from-name'].value = String(spec.modulo.email_from_name); stats.campiModuloTradotti++; }
          }
        }
      }

      // 2. Link su widget/contenitori (e-div-block, e-button, e-heading, e-paragraph)
      const dest = s.link && s.link.value && s.link.value.destination;
      if (dest && dest.$$type === 'url' && typeof dest.value === 'string' && dest.value.trim() !== '') {
        const cls = classificaUrl(dest.value);
        if (cls === 'interno') {
          dest.value = riscriviUrlInterno(dest.value);
          stats.linkWidgetRiscritti++;
        } else if (cls !== 'vuoto') {
          stats.linkPreservatiNonInterni++;
        }
      }

      if (Array.isArray(node.elements)) walk(node.elements);
    }
  }

  walk(treeEn);

  // 3. Audit post-traduzione completo
  const unusedKeys = indice.chiaviNonUsate();
  if (stats.testiNonMappati.length) {
    for (const x of stats.testiNonMappati) {
      stats.errori.push(`Stringa IT non mappata in ${x.ctx}: ${JSON.stringify(x.valore)}`);
    }
  }
  if (stats.opzioniNonMappate.length) {
    for (const x of stats.opzioniNonMappate) {
      stats.errori.push(`Opzione select IT non mappata in ${x.ctx} (${x.fieldId}): ${JSON.stringify(x.valore)}`);
    }
  }
  if (unusedKeys.length) {
    for (const k of unusedKeys) {
      stats.errori.push(`[${spec.id}] Chiave dizionario inutilizzata: ${JSON.stringify(k)}`);
    }
  }

  // Parità strutturale IT vs EN
  const firmaIt = estraiFirmaStrutturale(treeIt);
  const firmaEn = estraiFirmaStrutturale(treeEn);

  if (firmaIt.nodes !== firmaEn.nodes) {
    stats.errori.push(`[${spec.id}] Numero nodi alterato: IT=${firmaIt.nodes}, EN=${firmaEn.nodes}`);
  }
  if (JSON.stringify(firmaIt.dynamics) !== JSON.stringify(firmaEn.dynamics)) {
    stats.errori.push(`[${spec.id}] Tag dinamici/shortcode alterati tra IT ed EN`);
  }
  if (JSON.stringify(firmaIt.cssIds) !== JSON.stringify(firmaEn.cssIds)) {
    stats.errori.push(`[${spec.id}] Attributi _cssid alterati: IT=${JSON.stringify(firmaIt.cssIds)} vs EN=${JSON.stringify(firmaEn.cssIds)}`);
  }
  if (JSON.stringify(firmaIt.formTech) !== JSON.stringify(firmaEn.formTech)) {
    stats.errori.push(`[${spec.id}] Proprietà tecniche e-form alterate (name/input-id/to/reply-to/message)`);
  }
  if (JSON.stringify(firmaIt.externalLinks) !== JSON.stringify(firmaEn.externalLinks)) {
    stats.errori.push(`[${spec.id}] Link esterni/tel/mailto/ancore alterati: IT=${JSON.stringify(firmaIt.externalLinks)} vs EN=${JSON.stringify(firmaEn.externalLinks)}`);
  }

  // Controllo 0 link interni residui senza /en/ (e 0 doppi /en/en/)
  const linkResiduiIt = [];
  for (const u of firmaEn.internalLinks) {
    const clean = u.replace(/&amp;/gi, '&');
    if (clean !== '/en/' && !clean.startsWith('/en/')) {
      linkResiduiIt.push(u);
    } else if (clean.startsWith('/en/en/')) {
      linkResiduiIt.push(`DOPPIO_EN:${u}`);
    }
  }
  if (linkResiduiIt.length) {
    stats.errori.push(`[${spec.id}] Link interni senza prefisso /en/ (o doppio /en/en/): ${JSON.stringify(linkResiduiIt)}`);
  }
  if (firmaIt.internalLinks.length !== firmaEn.internalLinks.length) {
    stats.errori.push(`[${spec.id}] Conteggio link interni alterato: IT=${firmaIt.internalLinks.length}, EN=${firmaEn.internalLinks.length}`);
  }

  // Controllo specifico Contatti 152 (tutti e 9 i campi tecnici intatti + link /en/privacy-policy/)
  if (spec.id === 152) {
    const cssSet = new Set(firmaEn.cssIds.map((x) => x.split(':')[1]));
    for (const reqId of FORM_152_CAMPI_TECNICI) {
      if (!cssSet.has(reqId)) {
        stats.errori.push(`[152] Campo tecnico modulo mancante dopo traduzione: _cssid="${reqId}"`);
      }
    }
    if (!firmaEn.internalLinks.includes('/en/privacy-policy/')) {
      stats.errori.push('[152] Link checkbox privacy /en/privacy-policy/ mancante');
    }
  }

  // Controllo specifico Footer 971 (Privacy, Cookie, MEPA -> /en/... + tel:+390984462039)
  if (spec.id === 971) {
    const enIntSet = new Set(firmaEn.internalLinks);
    for (const req of ['/privacy-policy/', '/cookie-policy/', '/arredamento-ufficio/'].map(URL_EN.localizzaUrl)) {
      if (!enIntSet.has(req)) stats.errori.push(`[971] Link footer obbligatorio mancante: ${req}`);
    }
    if (!firmaEn.externalLinks.includes('tel:+390984462039')) {
      stats.errori.push('[971] Link tel:+390984462039 mancante');
    }
  }

  // Controllo specifico Template EN: MAI _elementor_conditions
  if (spec.gruppo === 'template' && spec.copiaElementorConditions !== false) {
    stats.errori.push(`[${spec.id}] Regola violata: copiaElementorConditions deve essere false sui template EN`);
  }

  // Controllo SEO 12/12 sulle Pagine
  if (spec.gruppo === 'pagina') {
    if (!spec.postTitleEn || !spec.postTitleEn.trim()) {
      stats.errori.push(`[${spec.id}] post_title_en vuoto`);
    }
    if (!spec.seoTitleEn || spec.seoTitleEn.length < 10 || spec.seoTitleEn.length > 75) {
      stats.errori.push(`[${spec.id}] seo_title_en mancante o lunghezza anomala (${(spec.seoTitleEn || '').length})`);
    }
    if (!spec.seoDescriptionEn || spec.seoDescriptionEn.length < 70 || spec.seoDescriptionEn.length > 185) {
      stats.errori.push(`[${spec.id}] seo_description_en mancante o lunghezza anomala (${(spec.seoDescriptionEn || '').length})`);
    }
    if (/&(?:#x[0-9a-fA-F]+|#\d+|[a-zA-Z]+);/.test(`${spec.seoTitleEn} ${spec.seoDescriptionEn}`)) {
      stats.errori.push(`[${spec.id}] Entità HTML residua in _artes_seo_title / _artes_seo_description EN`);
    }
    controllaResiduiItaliani(spec.seoTitleEn, `[${spec.id}] seo_title_en`, stats.errori);
    controllaResiduiItaliani(spec.seoDescriptionEn, `[${spec.id}] seo_description_en`, stats.errori);
  }

  return {
    treeEn,
    firmaIt,
    firmaEn,
    stats,
  };
}

function selezionaIds(args, specs) {
  const idx = args.indexOf('--solo');
  if (idx < 0 || !args[idx + 1] || args[idx + 1].startsWith('--')) return TUTTI_IDS;
  const filtri = new Set(args[idx + 1].split(',').map((s) => s.trim().toLowerCase()).filter(Boolean));
  const sel = TUTTI_IDS.filter((id) => {
    const sp = specs.get(id);
    return (
      filtri.has(String(id)) ||
      filtri.has(sp.slugIt.toLowerCase()) ||
      filtri.has(sp.gruppo) ||
      (filtri.has('pagine') && sp.gruppo === 'pagina') ||
      (filtri.has('template') && sp.gruppo === 'template')
    );
  });
  if (!sel.length) throw new Error(`Nessun documento corrisponde a --solo ${args[idx + 1]}`);
  return sel;
}

function stampaRiepilogoAudit(modalita, risultati) {
  console.log(`=== ${modalita} — TRADUZIONE EN 6 SITE PARTS + 12 PAGINE ===\n`);

  let totNodi = 0;
  let totTrad = 0;
  let totInv = 0;
  let totOpt = 0;
  let totForm = 0;
  let totLinkWidget = 0;
  let totLinkInline = 0;
  let totLinkExt = 0;
  let totSeoOk = 0;
  let totErrori = 0;

  for (const r of risultati) {
    const { spec, res } = r;
    const st = res.stats;
    totNodi += res.firmaEn.nodes;
    totTrad += st.testiTradotti;
    totInv += st.testiInvarianti;
    totOpt += st.opzioniTradotte;
    totForm += st.campiModuloTradotti;
    totLinkWidget += st.linkWidgetRiscritti;
    totLinkInline += st.linkInlineRiscritti;
    totLinkExt += st.linkPreservatiNonInterni;
    if (spec.gruppo === 'pagina' && spec.seoTitleEn && spec.seoDescriptionEn) totSeoOk++;
    totErrori += st.errori.length;

    const tagGruppo = spec.gruppo === 'template' ? 'TPL' : 'PAG';
    const extra = [];
    if (spec.gruppo === 'template') extra.push(`cond_EN=0`);
    if (spec.gruppo === 'pagina') extra.push(`SEO=OK(${spec.seoTitleEn.length}/${spec.seoDescriptionEn.length})`);
    if (st.opzioniTradotte) extra.push(`form_opts=${st.opzioniTradotte}`);
    if (st.campiModuloTradotti) extra.push(`form_meta=${st.campiModuloTradotti}`);

    console.log(
      `[${tagGruppo}] ${String(spec.id).padStart(4)} | ${spec.slugIt.padEnd(28)} | ` +
      `nodi=${String(res.firmaEn.nodes).padStart(3)} | ` +
      `testi=${String(st.testiTradotti).padStart(3)}+${String(st.testiInvarianti).padStart(2)}inv | ` +
      `link/en=${String(st.linkWidgetRiscritti + st.linkInlineRiscritti).padStart(2)} (w=${st.linkWidgetRiscritti},i=${st.linkInlineRiscritti}) | ` +
      `${extra.join(' | ')} | err=${st.errori.length}`
    );
    for (const e of st.errori) {
      console.log(`       ! ERRORE: ${e}`);
    }
  }

  const tplCount = risultati.filter((r) => r.spec.gruppo === 'template').length;
  const pagCount = risultati.filter((r) => r.spec.gruppo === 'pagina').length;
  console.log('\n=== RIEPILOGO COPERTURA ===');
  console.log(`Documenti verificati:        ${risultati.length} (${tplCount} Site Parts + ${pagCount} Pagine)`);
  console.log(`Nodi Elementor totali:       ${totNodi}`);
  console.log(`Stringhe tradotte:           ${totTrad} (+ ${totInv} invarianti espliciti = ${totTrad + totInv} nodi testuali, copertura 100%)`);
  console.log(`Modulo Contatti 152:         ${totOpt} opzioni select + ${totForm} metadati/default form`);
  console.log(`Link interni riscritti /en/: ${totLinkWidget + totLinkInline} (widget=${totLinkWidget}, inline=${totLinkInline}) | esterni/tel/mailto/ancore preservati=${totLinkExt}`);
  console.log(`SEO EN (_artes_seo_*):       ${totSeoOk}/${pagCount} pagine`);
  console.log(`_elementor_conditions EN:    0 (regola Theme Builder #88 §2b rispettata)`);
  console.log(`Errori totali:               ${totErrori}`);
  console.log(`\n=== ESITO: ${totErrori === 0 ? 'OK — 100% COPERTURA, 0 ERRORI' : `FALLITO (${totErrori} errori)`} ===`);

  return {
    totNodi,
    totTrad,
    totInv,
    totOpt,
    totForm,
    totLinkWidget,
    totLinkInline,
    totLinkExt,
    totSeoOk,
    totErrori,
  };
}

// --- Modalità LIVE (sola lettura: --verifica-live, --stato; scrittura: --esegui, --rollback) ----------------------

async function leggiDocumentiItLive(nv, ids) {
  return phpConDati(nv, String.raw`
    global $wpdb;
    $out = [];
    foreach ($D['ids'] as $id) {
      $id = (int)$id;
      $p = get_post($id);
      if (!$p) throw new \RuntimeException("Post IT non trovato su dev3: {$id}");
      $elem_type = 'post_' . $p->post_type;
      $icl = $wpdb->get_row($wpdb->prepare(
        "SELECT translation_id, trid, language_code FROM {$wpdb->prefix}icl_translations WHERE element_id = %d AND element_type = %s",
        $id, $elem_type
      ), ARRAY_A);
      $out[(string)$id] = [
        'id' => $id,
        'post_type' => $p->post_type,
        'post_name' => $p->post_name,
        'post_title' => $p->post_title,
        'post_status' => $p->post_status,
        'menu_order' => (int)$p->menu_order,
        'trid' => $icl ? (int)$icl['trid'] : null,
        'language_code' => $icl ? $icl['language_code'] : null,
        'elementor_data_raw' => (string)get_post_meta($id, '_elementor_data', true),
        'elementor_template_type' => (string)get_post_meta($id, '_elementor_template_type', true),
        'elementor_edit_mode' => (string)get_post_meta($id, '_elementor_edit_mode', true),
        'elementor_version' => (string)get_post_meta($id, '_elementor_version', true),
        'elementor_pro_version' => (string)get_post_meta($id, '_elementor_pro_version', true),
        'elementor_page_settings' => get_post_meta($id, '_elementor_page_settings', true),
        'elementor_migrations_state' => (string)get_post_meta($id, '_elementor_migrations_state_d2a1', true),
        'elementor_used_global_class' => get_post_meta($id, '_elementor_used_global_class', false),
        'elementor_conditions' => get_post_meta($id, '_elementor_conditions', true),
        'thumbnail_id' => (string)get_post_meta($id, '_thumbnail_id', true),
        'settore_collegato' => (string)get_post_meta($id, 'settore_collegato', true),
        'library_terms' => ($p->post_type === 'elementor_library')
          ? wp_get_object_terms($id, 'elementor_library_type', ['fields' => 'slugs'])
          : [],
      ];
    }
    return $out;
  `, { ids });
}

async function svuotaCacheGlobali(el, nv) {
  await el.call('elementor-clear-cache', {});
  await nv.php(String.raw`
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
  `);
}

async function eseguiVerificaLive(ids, specs) {
  const { connetti } = require('./mcp-client');
  const nv = await connetti('novamira');
  const liveDocs = await leggiDocumentiItLive(nv, ids);

  const risultati = [];
  for (const id of ids) {
    const spec = specs.get(id);
    const live = liveDocs[String(id)];
    const treeIt = JSON.parse(live.elementor_data_raw || '[]');
    if (!Array.isArray(treeIt) || !treeIt.length) {
      throw new Error(`_elementor_data vuoto o non valido su dev3 per post IT ${id}`);
    }
    const res = traduciAlberoElementor(treeIt, spec);
    if (!live.trid) {
      res.stats.errori.push(`[${id}] Post IT privo di trid in icl_translations (eseguire prima wpml-prepara.js --esegui)`);
    }
    risultati.push({ spec, res });
  }

  const riepilogo = stampaRiepilogoAudit('VERIFICA LIVE SOLA LETTURA (0 SCRITTURE SU DEV3)', risultati);
  if (riepilogo.totErrori > 0) {
    throw new Error(`Verifica live fallita con ${riepilogo.totErrori} errori.`);
  }
}

async function eseguiStato(ids, specs) {
  const { connetti } = require('./mcp-client');
  const nv = await connetti('novamira');

  const stato = await phpConDati(nv, String.raw`
    global $wpdb;
    $rows = [];
    foreach ($D['items'] as $it) {
      $id_it = (int)$it['id'];
      $pt = (string)$it['postType'];
      $et = 'post_' . $pt;
      $icl_it = $wpdb->get_row($wpdb->prepare(
        "SELECT trid, language_code FROM {$wpdb->prefix}icl_translations WHERE element_id = %d AND element_type = %s",
        $id_it, $et
      ), ARRAY_A);
      $id_en = (int)apply_filters('wpml_object_id', $id_it, $pt, false, 'en-gb');
      $en_info = null;
      if ($id_en > 0 && $id_en !== $id_it) {
        $pe = get_post($id_en);
        $icl_en = $wpdb->get_row($wpdb->prepare(
          "SELECT trid, language_code, source_language_code FROM {$wpdb->prefix}icl_translations WHERE element_id = %d AND element_type = %s",
          $id_en, $et
        ), ARRAY_A);
        $cond_en = get_post_meta($id_en, '_elementor_conditions', true);
        $en_info = [
          'id' => $id_en,
          'status' => $pe ? $pe->post_status : null,
          'post_name' => $pe ? $pe->post_name : null,
          'post_title' => $pe ? $pe->post_title : null,
          'trid' => $icl_en ? (int)$icl_en['trid'] : null,
          'lang' => $icl_en ? $icl_en['language_code'] : null,
          'source_lang' => $icl_en ? $icl_en['source_language_code'] : null,
          'page_template' => (string)get_post_meta($id_en, '_wp_page_template', true),
          'el_type' => (string)get_post_meta($id_en, '_elementor_template_type', true),
          'el_mode' => (string)get_post_meta($id_en, '_elementor_edit_mode', true),
          'artes_rev2' => (string)get_post_meta($id_en, '_artes_rev2', true),
          'seo_title' => (string)get_post_meta($id_en, '_artes_seo_title', true),
          'seo_desc' => (string)get_post_meta($id_en, '_artes_seo_description', true),
          'conditions_count' => is_array($cond_en) ? count($cond_en) : (empty($cond_en) ? 0 : 1),
          'native_editor' => class_exists('WPML_PB_Last_Translation_Edit_Mode')
            ? \WPML_PB_Last_Translation_Edit_Mode::is_native_editor($id_en)
            : (get_post_meta($id_en, '_last_translation_edit_mode', true) === 'native-editor'),
          'data_bytes' => strlen((string)get_post_meta($id_en, '_elementor_data', true)),
        ];
      }
      $rows[] = [
        'id_it' => $id_it,
        'gruppo' => $it['gruppo'],
        'slug_it' => $it['slugIt'],
        'trid_it' => $icl_it ? (int)$icl_it['trid'] : null,
        'en' => $en_info,
      ];
    }

    $front_it = (int)get_option('page_on_front');
    $front_en = (int)apply_filters('wpml_object_id', $front_it, 'page', false, 'en-gb');

    // Stato term meta 'pagina' sui termini EN di 'settore'
    $settori_en = [];
    $t_rows = $wpdb->get_results("
      SELECT t.term_id, t.slug, t.name, tr.trid, tr.language_code
      FROM {$wpdb->terms} t
      INNER JOIN {$wpdb->term_taxonomy} tt ON tt.term_id = t.term_id AND tt.taxonomy = 'settore'
      INNER JOIN {$wpdb->prefix}icl_translations tr ON tr.element_id = tt.term_taxonomy_id AND tr.element_type = 'tax_settore'
      WHERE tr.language_code = 'en-gb'
      ORDER BY t.term_id
    ", ARRAY_A);
    foreach ($t_rows as $tr) {
      $settori_en[] = [
        'term_id' => (int)$tr['term_id'],
        'slug' => $tr['slug'],
        'name' => $tr['name'],
        'pagina' => get_term_meta((int)$tr['term_id'], 'pagina', true),
      ];
    }

    return ['rows' => $rows, 'front_it' => $front_it, 'front_en' => $front_en, 'settori_en' => $settori_en];
  `, {
    items: ids.map((id) => {
      const sp = specs.get(id);
      return { id, gruppo: sp.gruppo, postType: sp.postType, slugIt: sp.slugIt };
    }),
  });

  console.log('=== STATO LIVE WPML EN — 6 SITE PARTS + 12 PAGINE SU DEV3 ===\n');
  let presenti = 0;
  for (const r of stato.rows) {
    const tag = r.gruppo === 'template' ? 'TPL' : 'PAG';
    if (!r.en) {
      console.log(`[${tag}] IT=${String(r.id_it).padStart(4)} (trid=${String(r.trid_it || '-').padStart(3)}) | ${r.slug_it.padEnd(28)} | EN: NON PRESENTE`);
    } else {
      presenti++;
      const e = r.en;
      console.log(
        `[${tag}] IT=${String(r.id_it).padStart(4)} -> EN=${String(e.id).padStart(4)} (trid=${e.trid}) | ` +
        `${String(e.post_name).padEnd(30)} | ${e.status} | ` +
        `native=${e.native_editor ? 'Y' : 'N'} | ` +
        (r.gruppo === 'template'
          ? `cond_EN=${e.conditions_count} | el_type=${e.el_type}`
          : `tpl=${e.page_template} | rev2=${e.artes_rev2} | seo=${e.seo_title && e.seo_desc ? 'OK' : 'MISSING'}`) +
        ` | ${e.data_bytes} B`
      );
    }
  }
  console.log(`\nTraduzioni EN presenti: ${presenti}/${stato.rows.length}`);
  console.log(`Front page IT=${stato.front_it} -> EN=${stato.front_en || 'NON COLLEGATA'}`);
  console.log(`Termini EN tassonomia 'settore': ${stato.settori_en.length}` +
    (stato.settori_en.length ? ' -> ' + stato.settori_en.map((s) => `${s.slug}(pagina=${s.pagina || '-'})`).join(', ') : ' (non ancora creati)'));
}

async function eseguiSuDev3(ids, specs) {
  const { connetti } = require('./mcp-client');
  const nv = await connetti('novamira');
  const el = await connetti('elementor');

  // 1. Leggi i sorgenti IT reali da dev3 e genera + valida TUTTI i payload EN prima di scrivere una sola riga!
  const liveDocs = await leggiDocumentiItLive(nv, ids);
  const piani = [];
  for (const id of ids) {
    const spec = specs.get(id);
    const live = liveDocs[String(id)];
    if (!live.trid) {
      throw new Error(`Post IT ${id} (${spec.slugIt}) privo di trid in icl_translations: eseguire prima wpml-prepara.js --esegui.`);
    }
    const treeIt = JSON.parse(live.elementor_data_raw || '[]');
    if (!Array.isArray(treeIt) || !treeIt.length) {
      throw new Error(`Post IT ${id} (${spec.slugIt}): _elementor_data vuoto o non valido su dev3.`);
    }
    const res = traduciAlberoElementor(treeIt, spec);
    if (res.stats.errori.length) {
      throw new Error(`Validazione fallita su [${id}] ${spec.slugIt}:\n  - ${res.stats.errori.join('\n  - ')}`);
    }
    piani.push({
      spec,
      live,
      res,
      enJsonRaw: JSON.stringify(res.treeEn),
    });
  }

  console.log(`Validazione live pre-scrittura OK su ${piani.length} documenti (0 errori).`);

  // 2. Carica o inizializza backup crash-safe
  fs.mkdirSync(outDir, { recursive: true });
  const backup = fs.existsSync(BACKUP_FILE_DEFAULT)
    ? JSON.parse(fs.readFileSync(BACKUP_FILE_DEFAULT, 'utf8'))
    : { creato_il: new Date().toISOString(), documenti: {}, settori_en_pagina_prima: {} };
  backup.ultimo_aggiornamento = new Date().toISOString();
  fs.writeFileSync(BACKUP_FILE_DEFAULT, JSON.stringify(backup, null, 2));

  // 3. Crea o aggiorna ciascun post EN (salvataggio backup crash-safe dopo ogni documento)
  const enIdPerItId = {};
  for (const p of piani) {
    const { spec, live, enJsonRaw } = p;
    const payload = {
      id_it: spec.id,
      gruppo: spec.gruppo,
      post_type: spec.postType,
      trid_it: live.trid,
      slug_en: spec.slugEn,
      // le pagine fuori rev2 restano in bozza anche in inglese
      stato_en: IDS_BOZZE.includes(spec.id) ? 'draft' : 'publish',
      post_title_en: spec.postTitleEn,
      menu_order: live.menu_order,
      elementor_data_raw: enJsonRaw,
      elementor_template_type: spec.gruppo === 'template' ? live.elementor_template_type : 'wp-page',
      elementor_version: live.elementor_version || '4.4.1',
      elementor_pro_version: live.elementor_pro_version || '4.4.1',
      elementor_page_settings: live.elementor_page_settings,
      elementor_migrations_state: live.elementor_migrations_state,
      elementor_used_global_class: Array.isArray(live.elementor_used_global_class) ? live.elementor_used_global_class : [],
      library_terms: live.library_terms || [],
      thumbnail_id: live.thumbnail_id || '',
      settore_collegato: live.settore_collegato || '',
      seo_title_en: spec.seoTitleEn || '',
      seo_description_en: spec.seoDescriptionEn || '',
    };

    const resPost = await phpConDati(nv, String.raw`
      global $wpdb, $sitepress;
      $prev_lang = $sitepress ? $sitepress->get_current_language() : 'it';
      if ($sitepress) $sitepress->switch_lang('en-gb');

      try {
        $id_it = (int)$D['id_it'];
        $pt = (string)$D['post_type'];
        $et = 'post_' . $pt;
        $trid_it = (int)$D['trid_it'];
        $slug_en = (string)$D['slug_en'];

        $existing_en_id = (int)apply_filters('wpml_object_id', $id_it, $pt, false, 'en-gb');
        $created = false;
        $snapshot_before = null;

        if ($existing_en_id > 0 && $existing_en_id !== $id_it && get_post($existing_en_id)) {
          $en_id = $existing_en_id;
          $prev_post = get_post($en_id);
          $snapshot_before = [
            'post_title' => $prev_post->post_title,
            'post_name' => $prev_post->post_name,
            'post_status' => $prev_post->post_status,
            'elementor_data_raw' => (string)get_post_meta($en_id, '_elementor_data', true),
            'seo_title' => (string)get_post_meta($en_id, '_artes_seo_title', true),
            'seo_description' => (string)get_post_meta($en_id, '_artes_seo_description', true),
          ];
          $u = wp_update_post([
            'ID' => $en_id,
            'post_title' => $D['post_title_en'],
            'post_status' => $D['stato_en'] ?? 'publish',
            'menu_order' => (int)$D['menu_order'],
          ], true);
          if (is_wp_error($u)) throw new \RuntimeException($u->get_error_message());
        } else {
          $en_id = wp_insert_post([
            'post_type' => $pt,
            'post_title' => $D['post_title_en'],
            'post_name' => $slug_en,
            'post_status' => $D['stato_en'] ?? 'publish',
            'post_content' => '',
            'menu_order' => (int)$D['menu_order'],
          ], true);
          if (is_wp_error($en_id)) throw new \RuntimeException($en_id->get_error_message());
          $en_id = (int)$en_id;
          $created = true;
        }

        // Collega in icl_translations al trid IT
        do_action('wpml_set_element_language_details', [
          'element_id' => $en_id,
          'element_type' => $et,
          'trid' => $trid_it,
          'language_code' => 'en-gb',
          'source_language_code' => 'it',
        ]);

        // Garantisci slug canonico esatto (evita suffisso -2 da wp_unique_post_slug su pagine multilingua)
        $cur_post = get_post($en_id);
        if ($cur_post && $cur_post->post_name !== $slug_en) {
          $conflict = $wpdb->get_var($wpdb->prepare(
            "SELECT p.ID FROM {$wpdb->posts} p
             INNER JOIN {$wpdb->prefix}icl_translations tr ON tr.element_id = p.ID AND tr.element_type = %s
             WHERE p.post_type = %s AND p.post_name = %s AND tr.language_code = 'en-gb' AND p.ID != %d
             LIMIT 1",
            $et, $pt, $slug_en, $en_id
          ));
          if ($conflict) {
            throw new \RuntimeException("Conflitto slug EN '{$slug_en}' già usato dal post EN #{$conflict}");
          }
          $wpdb->update($wpdb->posts, ['post_name' => $slug_en], ['ID' => $en_id], ['%s'], ['%d']);
          delete_post_meta($en_id, '_wp_old_slug');
          clean_post_cache($en_id);
        }

        // Metadati Elementor comuni
        update_post_meta($en_id, '_elementor_edit_mode', 'builder');
        update_post_meta($en_id, '_elementor_template_type', (string)$D['elementor_template_type']);
        update_post_meta($en_id, '_elementor_version', (string)$D['elementor_version']);
        if (!empty($D['elementor_pro_version'])) {
          update_post_meta($en_id, '_elementor_pro_version', (string)$D['elementor_pro_version']);
        }
        if (!empty($D['elementor_page_settings']) && is_array($D['elementor_page_settings'])) {
          update_post_meta($en_id, '_elementor_page_settings', $D['elementor_page_settings']);
        }
        if (!empty($D['elementor_migrations_state'])) {
          update_post_meta($en_id, '_elementor_migrations_state_d2a1', (string)$D['elementor_migrations_state']);
        }
        delete_post_meta($en_id, '_elementor_used_global_class');
        foreach ($D['elementor_used_global_class'] as $gc) {
          add_post_meta($en_id, '_elementor_used_global_class', (string)$gc);
        }

        // Dati Elementor tradotti 1:1
        update_post_meta($en_id, '_elementor_data', wp_slash((string)$D['elementor_data_raw']));
        delete_post_meta($en_id, '_elementor_css');
        delete_post_meta($en_id, '_elementor_element_cache');
        delete_post_meta($en_id, '_elementor_page_assets');

        if ($D['gruppo'] === 'template') {
          // REGOLA CRITICA #88 §2b: MAI _elementor_conditions sui Site Parts EN!
          delete_post_meta($en_id, '_elementor_conditions');
          if (!empty($D['library_terms'])) {
            wp_set_object_terms($en_id, $D['library_terms'], 'elementor_library_type', false);
          }
        } else {
          // Pagine pubblicate EN
          update_post_meta($en_id, '_wp_page_template', 'elementor_header_footer');
          update_post_meta($en_id, '_artes_rev2', '1');
          if (!empty($D['thumbnail_id'])) {
            update_post_meta($en_id, '_thumbnail_id', (int)$D['thumbnail_id']);
          }
          if (!empty($D['settore_collegato'])) {
            update_post_meta($en_id, 'settore_collegato', (string)$D['settore_collegato']);
          }
          update_post_meta($en_id, '_artes_seo_title', wp_slash((string)$D['seo_title_en']));
          update_post_meta($en_id, '_artes_seo_description', wp_slash((string)$D['seo_description_en']));
        }

        // Imposta native-editor in WPML Page Builders
        if (class_exists('WPML_PB_Last_Translation_Edit_Mode')) {
          \WPML_PB_Last_Translation_Edit_Mode::set_native_editor($en_id);
        } else {
          update_post_meta($en_id, '_last_translation_edit_mode', 'native-editor');
        }

        // Rigenera CSS Elementor per il post tradotto
        clean_post_cache($en_id);
        if (class_exists('\Elementor\Core\Files\CSS\Post')) {
          $css_file = \Elementor\Core\Files\CSS\Post::create($en_id);
          $css_file->update();
        }

        // Verifica post-scrittura immediata
        $final_post = get_post($en_id);
        $final_cond = get_post_meta($en_id, '_elementor_conditions', true);
        if ($D['gruppo'] === 'template' && !empty($final_cond)) {
          throw new \RuntimeException("VIOLAZIONE: _elementor_conditions trovato su template EN #{$en_id}");
        }
        $icl_check = $wpdb->get_row($wpdb->prepare(
          "SELECT trid, language_code, source_language_code FROM {$wpdb->prefix}icl_translations WHERE element_id = %d AND element_type = %s",
          $en_id, $et
        ), ARRAY_A);

        return [
          'id_it' => $id_it,
          'id_en' => $en_id,
          'created' => $created,
          'post_name' => $final_post ? $final_post->post_name : null,
          'post_status' => $final_post ? $final_post->post_status : null,
          'trid' => $icl_check ? (int)$icl_check['trid'] : null,
          'language_code' => $icl_check ? $icl_check['language_code'] : null,
          'conditions_empty' => empty($final_cond),
          'bytes' => strlen((string)get_post_meta($en_id, '_elementor_data', true)),
          'snapshot_before' => $snapshot_before,
        ];
      } finally {
        if ($sitepress) $sitepress->switch_lang($prev_lang);
      }
    `, payload);

    enIdPerItId[spec.id] = resPost.id_en;

    const k = String(spec.id);
    if (!backup.documenti[k]) {
      backup.documenti[k] = {
        id_it: spec.id,
        id_en: resPost.id_en,
        gruppo: spec.gruppo,
        post_type: spec.postType,
        slug_en: spec.slugEn,
        creato_da_script: resPost.created,
        prima_esecuzione: resPost.snapshot_before,
      };
    } else {
      backup.documenti[k].id_en = resPost.id_en;
    }
    backup.documenti[k].ultimo_aggiornamento = new Date().toISOString();
    fs.writeFileSync(BACKUP_FILE_DEFAULT, JSON.stringify(backup, null, 2));

    console.log(
      `  OK [${spec.gruppo === 'template' ? 'TPL' : 'PAG'}] IT=${String(spec.id).padStart(4)} -> ` +
      `EN=${String(resPost.id_en).padStart(4)} (${resPost.created ? 'CREATO' : 'AGGIORNATO'}) | ` +
      `slug=${resPost.post_name} | trid=${resPost.trid} | ${resPost.bytes} B`
    );
  }

  // 4. Aggiorna term meta `pagina` sui 5 termini EN di `settore` (se già presenti su dev3)
  const settoreUpdates = [];
  for (const [pageItStr, settoreSlug] of Object.entries(PAGINE_SETTORE_MAP)) {
    const pageIt = Number(pageItStr);
    if (enIdPerItId[pageIt]) {
      settoreUpdates.push({ page_it: pageIt, page_en: enIdPerItId[pageIt], settore_slug: settoreSlug });
    }
  }
  if (settoreUpdates.length) {
    const termRes = await phpConDati(nv, String.raw`
      global $wpdb;
      $out = [];
      foreach ($D['updates'] as $u) {
        $term_it = get_term_by('slug', $u['settore_slug'], 'settore');
        if (!$term_it || is_wp_error($term_it)) continue;
        $term_en_id = (int)apply_filters('wpml_object_id', (int)$term_it->term_id, 'settore', false, 'en-gb');
        if ($term_en_id > 0 && $term_en_id !== (int)$term_it->term_id) {
          $prev_val = get_term_meta($term_en_id, 'pagina', true);
          update_term_meta($term_en_id, 'pagina', (string)$u['page_en']);
          $out[] = [
            'term_en_id' => $term_en_id,
            'settore_slug' => $u['settore_slug'],
            'pagina_prima' => $prev_val,
            'pagina_dopo' => (string)$u['page_en'],
          ];
        }
      }
      return $out;
    `, { updates: settoreUpdates });

    for (const tr of termRes) {
      const tk = String(tr.term_en_id);
      if (!Object.prototype.hasOwnProperty.call(backup.settori_en_pagina_prima, tk)) {
        backup.settori_en_pagina_prima[tk] = {
          term_en_id: tr.term_en_id,
          settore_slug: tr.settore_slug,
          pagina_prima: tr.pagina_prima,
        };
      }
      console.log(`  OK [TAX] settore EN #${tr.term_en_id} (${tr.settore_slug}): pagina ${tr.pagina_prima || '-'} -> ${tr.pagina_dopo}`);
    }
    fs.writeFileSync(BACKUP_FILE_DEFAULT, JSON.stringify(backup, null, 2));
  }

  // 5. Svuota cache Elementor + WP + WPML
  await svuotaCacheGlobali(el, nv);
  console.log('\nCache Elementor, WordPress e WPML svuotate.');

  // 6. Verifica post-esecuzione: front page EN + zero _elementor_conditions sui template EN
  const postCheck = await phpConDati(nv, String.raw`
    $errors = [];
    foreach ($D['tpl_en_ids'] as $en_id) {
      $c = get_post_meta((int)$en_id, '_elementor_conditions', true);
      if (!empty($c)) $errors[] = "Template EN #{$en_id} ha _elementor_conditions non vuoto";
    }
    foreach ($D['tpl_it_ids'] as $it_id) {
      $c = get_post_meta((int)$it_id, '_elementor_conditions', true);
      if (empty($c)) $errors[] = "Template IT #{$it_id} ha perso _elementor_conditions";
    }
    $front_it = (int)get_option('page_on_front');
    $front_en = (int)apply_filters('wpml_object_id', $front_it, 'page', false, 'en-gb');
    if ($D['expected_home_en'] && $front_en !== (int)$D['expected_home_en']) {
      $errors[] = "Front page EN mismatch: atteso {$D['expected_home_en']}, risolto {$front_en}";
    }
    return ['front_it' => $front_it, 'front_en' => $front_en, 'errors' => $errors];
  `, {
    tpl_en_ids: SITE_PARTS_IDS.filter((id) => enIdPerItId[id]).map((id) => enIdPerItId[id]),
    tpl_it_ids: SITE_PARTS_IDS,
    expected_home_en: enIdPerItId[376] || 0,
  });

  if (postCheck.errors.length) {
    throw new Error(`Verifica post-esecuzione fallita:\n  - ${postCheck.errors.join('\n  - ')}`);
  }
  console.log(`Verifica post-esecuzione OK: front_page IT=${postCheck.front_it} -> EN=${postCheck.front_en}, 0 _elementor_conditions su template EN, 6/6 condizioni IT intatte.`);
}

async function eseguiRollback(fileBackup) {
  if (!fs.existsSync(fileBackup)) {
    throw new Error(`File di backup non trovato: ${fileBackup}`);
  }
  const backup = JSON.parse(fs.readFileSync(fileBackup, 'utf8'));
  const { connetti } = require('./mcp-client');
  const nv = await connetti('novamira');
  const el = await connetti('elementor');

  const docs = Object.values(backup.documenti || {});
  const termSnaps = Object.values(backup.settori_en_pagina_prima || {});

  const res = await phpConDati(nv, String.raw`
    global $wpdb;
    $out = ['eliminati' => [], 'ripristinati' => [], 'termini_ripristinati' => []];
    foreach ($D['docs'] as $doc) {
      $en_id = (int)$doc['id_en'];
      $it_id = (int)$doc['id_it'];
      if ($en_id <= 0 || $en_id === $it_id) continue;
      $p = get_post($en_id);
      if (!$p) continue;
      $et = 'post_' . $p->post_type;
      // Verifica sicurezza: elimina/tocca SOLO post con language_code = 'en-gb'
      $lang = $wpdb->get_var($wpdb->prepare(
        "SELECT language_code FROM {$wpdb->prefix}icl_translations WHERE element_id = %d AND element_type = %s",
        $en_id, $et
      ));
      if ($lang !== 'en-gb') continue;

      if (!empty($doc['creato_da_script'])) {
        wp_delete_post($en_id, true);
        $wpdb->delete($wpdb->prefix . 'icl_translations', ['element_id' => $en_id, 'element_type' => $et], ['%d', '%s']);
        $out['eliminati'][] = $en_id;
      } elseif (!empty($doc['prima_esecuzione'])) {
        $snap = $doc['prima_esecuzione'];
        wp_update_post([
          'ID' => $en_id,
          'post_title' => $snap['post_title'],
          'post_name' => $snap['post_name'],
          'post_status' => $snap['post_status'],
        ]);
        update_post_meta($en_id, '_elementor_data', wp_slash((string)$snap['elementor_data_raw']));
        if (isset($snap['seo_title'])) update_post_meta($en_id, '_artes_seo_title', wp_slash((string)$snap['seo_title']));
        if (isset($snap['seo_description'])) update_post_meta($en_id, '_artes_seo_description', wp_slash((string)$snap['seo_description']));
        delete_post_meta($en_id, '_elementor_css');
        clean_post_cache($en_id);
        $out['ripristinati'][] = $en_id;
      }
    }

    foreach ($D['termSnaps'] as $ts) {
      $tid = (int)$ts['term_en_id'];
      if ($tid <= 0) continue;
      if ($ts['pagina_prima'] === '' || $ts['pagina_prima'] === null) {
        delete_term_meta($tid, 'pagina');
      } else {
        update_term_meta($tid, 'pagina', (string)$ts['pagina_prima']);
      }
      $out['termini_ripristinati'][] = $tid;
    }
    return $out;
  `, { docs, termSnaps });

  await svuotaCacheGlobali(el, nv);
  console.log(`Rollback completato da ${path.relative(root, fileBackup)}:`);
  console.log(`  Post EN eliminati:     ${res.eliminati.length} (${res.eliminati.join(', ') || 'nessuno'})`);
  console.log(`  Post EN ripristinati:  ${res.ripristinati.length} (${res.ripristinati.join(', ') || 'nessuno'})`);
  console.log(`  Termini EN riprist.:   ${res.termini_ripristinati.length}`);
  console.log('Cache Elementor, WordPress e WPML svuotate.');
}

// --- Entrypoint CLI -----------------------------------------------------------------------------------------------

if (require.main === module) {
  (async () => {
    const args = process.argv.slice(2);
    const modePiano = args.includes('--piano');
    const modeVerificaLive = args.includes('--verifica-live');
    const modeStato = args.includes('--stato');
    const modeEsegui = args.includes('--esegui');
    const idxRollback = args.indexOf('--rollback');
    const modeRollback = idxRollback >= 0;

    if (!modePiano && !modeVerificaLive && !modeStato && !modeEsegui && !modeRollback) {
      console.error('Uso: wpml-trad-pagine.js --piano | --verifica-live | --stato | --esegui | --rollback [file] [--solo ...]');
      process.exit(2);
    }

    if (modeRollback) {
      const nextArg = args[idxRollback + 1];
      const fileBackup = (nextArg && !nextArg.startsWith('--')) ? path.resolve(root, nextArg) : BACKUP_FILE_DEFAULT;
      await eseguiRollback(fileBackup);
      return;
    }

    const specs = caricaDizionari();
    const ids = selezionaIds(args, specs);

    if (modeStato) {
      await eseguiStato(ids, specs);
      return;
    }

    if (modeVerificaLive) {
      await eseguiVerificaLive(ids, specs);
      return;
    }

    if (modePiano) {
      const risultati = ids.map((id) => {
        const spec = specs.get(id);
        const treeIt = costruisciAlberoOffline(id);
        const res = traduciAlberoElementor(treeIt, spec);
        return { spec, res };
      });
      const riepilogo = stampaRiepilogoAudit('PIANO OFFLINE (0 SCRITTURE, 0 RETE)', risultati);
      if (riepilogo.totErrori > 0) {
        throw new Error(`Verifica offline fallita con ${riepilogo.totErrori} errori.`);
      }
      return;
    }

    if (modeEsegui) {
      // Prima verifica offline completa
      const risultatiOff = ids.map((id) => {
        const spec = specs.get(id);
        const treeIt = costruisciAlberoOffline(id);
        const res = traduciAlberoElementor(treeIt, spec);
        return { spec, res };
      });
      const errOff = risultatiOff.reduce((acc, r) => acc + r.res.stats.errori.length, 0);
      if (errOff > 0) {
        stampaRiepilogoAudit('PRE-CHECK OFFLINE FALLITO', risultatiOff);
        throw new Error(`Pre-check offline fallito con ${errOff} errori: nessuna scrittura eseguita su dev3.`);
      }
      await eseguiSuDev3(ids, specs);
    }
  })().catch((e) => {
    console.error('ERRORE:', e.message);
    process.exit(1);
  });
}

module.exports = {
  SITE_PARTS_IDS,
  PAGINE_IDS,
  TUTTI_IDS,
  IDS_VIETATI,
  PAGINE_SETTORE_MAP,
  caricaDizionari,
  costruisciAlberoOffline,
  composizioneToElementorTree,
  traduciAlberoElementor,
  riscriviUrlInterno,
  riscriviLinkInline,
  validaBilanciamentoHtml,
};
