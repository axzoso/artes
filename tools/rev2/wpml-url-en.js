'use strict';
// Indirizzi inglesi del sito (WPML en-gb): UNICA tabella di corrispondenza italiano -> inglese, usata da wpml-trad-pagine.js (link nei
// contenuti Elementor e slug delle pagine EN), wpml-trad-dati.js (slug dei termini EN e link nei campi HTML) e wpml-slug-cpt.js (basi delle
// schede e degli archivi). Cambiare un indirizzo inglese = cambiare questo file e rilanciare i tre script.
//
//   /en/arredamento-ufficio/                 -> /en/office-workspace-furniture/
//   /en/realizzazioni/arpacal/               -> /en/projects/arpacal/
//   /en/realizzazioni/?settore=uffici&categoria=enti-e-istituzioni -> /en/projects/?settore=offices-workspace&categoria=public-bodies-and-institutions
const fs = require('fs');
const path = require('path');

// Slug delle pagine (post_name della traduzione EN)
const PAGINE = {
  'arredamento-ufficio': 'office-workspace-furniture',
  'arredo-negozi': 'retail-store-furniture',
  'arredo-negozi-food': 'food-store-furniture',
  'arredamento-bar-ristoranti': 'bar-restaurant-furniture',
  'arredamento-hotel': 'hotel-hospitality-furniture',
  'arredamento-su-misura': 'bespoke-furniture',
  'contract': 'contract',
  'chi-siamo': 'about-us',
  'contatti': 'contact',
  'privacy-policy': 'privacy-policy',
  'cookie-policy': 'cookie-policy',
  // pagine fuori rev2, in bozza (tradotte il 2026-11-25, anche la versione EN resta in bozza)
  'area-progettisti': 'architects-area',
  'richiedi-preventivo': 'request-a-quote',
  prodotti: 'products',
  mepa: 'public-sector-mepa',
  cataloghi: 'catalogues',
};

// Basi dei tipi di contenuto (slug di riscrittura: valgono per schede e archivi)
const BASI = { realizzazioni: 'projects', 'brand-partner': 'brand-partners' };
const BASI_PER_TIPO = { realizzazione: ['realizzazioni', 'projects'], brand: ['brand-partner', 'brand-partners'] };

const slugify = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/&/g, ' ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

// Slug dei termini EN, ricavati dai nomi inglesi del dataset (en-dati.json). Mai uguali a uno slug italiano della stessa tassonomia.
let _termini = null;
function terminiEn() {
  if (_termini) return _termini;
  const en = JSON.parse(fs.readFileSync(path.join(__dirname, 'traduzioni', 'en-dati.json'), 'utf8'));
  const settore = {}; const categoria = {}; const categoria_brand = {};
  for (const s of en.settori) settore[s.codice] = slugify(s.nome_breve);
  for (const c of en.categorie) categoria[c.slug] = slugify(c.nome);
  for (const c of en.categorie_brand) categoria_brand[c.slug] = slugify(c.nome);
  const itSlug = { settore: new Set(Object.keys(settore)), categoria: new Set(Object.keys(categoria)), categoria_brand: new Set(Object.keys(categoria_brand)) };
  for (const [tax, mappa, suffisso] of [['settore', settore, '-sector'], ['categoria', categoria, '-projects'], ['categoria_brand', categoria_brand, '-furniture']]) {
    const visti = new Set();
    for (const k of Object.keys(mappa)) {
      if (itSlug[tax].has(mappa[k])) mappa[k] += suffisso;
      if (visti.has(mappa[k])) throw new Error(`wpml-url-en: slug EN duplicato ${tax}/${mappa[k]}`);
      visti.add(mappa[k]);
    }
  }
  _termini = { settore, categoria, categoria_brand };
  return _termini;
}

// Converte un indirizzo interno (italiano, con o senza /en, relativo o assoluto su dev3) nell'indirizzo inglese.
const HOST_RE = /^https?:\/\/dev3\.minimalstudiodev\.it/;
function localizzaUrl(raw) {
  const s = String(raw || '');
  const host = (s.match(HOST_RE) || [''])[0];
  let u = s.slice(host.length);
  if (!u.startsWith('/')) return s; // esterni, mailto, tel, ancore pure
  const [prima, hash = null] = u.split('#');
  const [percorso, query = null] = prima.split('?');
  let parti = percorso.split('/').filter(Boolean);
  if (parti[0] === 'en') parti = parti.slice(1);
  if (parti[0] === 'wp-content' || parti[0] === 'wp-admin') return s;
  if (parti.length && BASI[parti[0]]) parti[0] = BASI[parti[0]];
  else if (parti.length === 1 && PAGINE[parti[0]]) parti[0] = PAGINE[parti[0]];
  let out = '/en/' + parti.join('/') + (parti.length ? '/' : '');
  if (query !== null) {
    const T = terminiEn();
    const q = query.split('&').map((kv) => {
      const [k, v = ''] = kv.split('=');
      const val = decodeURIComponent(v);
      if (k === 'settore' && T.settore[val]) return `${k}=${T.settore[val]}`;
      if (k === 'categoria' && T.categoria[val]) return `${k}=${T.categoria[val]}`;
      return kv;
    });
    out += '?' + q.join('&');
  }
  if (hash !== null) out += '#' + hash;
  return host + out;
}

module.exports = { PAGINE, BASI, BASI_PER_TIPO, terminiEn, localizzaUrl, slugify };

if (require.main === module) {
  for (const u of ['/', '/arredamento-ufficio/', '/en/realizzazioni/arpacal/', '/realizzazioni/?settore=uffici&categoria=enti-e-istituzioni', '/contract/#interlocutori', '/brand-partner/', 'https://dev3.minimalstudiodev.it/chi-siamo/', 'mailto:x@y.it', '/wp-content/uploads/a.jpg']) console.log(u.padEnd(64), '->', localizzaUrl(u));
  console.log(JSON.stringify(terminiEn(), null, 1));
}
