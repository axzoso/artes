'use strict';
// Tabella degli ALIAS dinamici dei modelli (tools/rev2/modelli/*.html): ogni alias è il tag dinamico di Elementor che fornisce il
// dato. Dove un valore va calcolato (briciole di pane, riga "Settore — Categoria", link con HTML, conteggio foto…) c'è uno
// shortcode del plugin artes-core (artes_*), usato con il tag "Shortcode". Vedi html2elementor.js per gli attributi
// data-dyn / data-dyn-href / data-dyn-src / data-loop / data-opz.
const dyn = (name, settings = {}) => ({ name, settings });
const campo = (meta_field, extra = {}) => dyn('jet-post-custom-field', { meta_field, ...extra });
const termine = (taxonomy, term_field, extra = {}) => dyn('jet-term-field', { taxonomy, term_field, ...extra });
const sc = (shortcode) => dyn('shortcode', { shortcode });
const ciclo = (source, query_id, extra = {}) => ({ query: { template_type: 'post', source, query_id }, extra });

const alias = {
  // --- articolo corrente ---
  titolo: dyn('post-title'),
  url_post: dyn('post-url'),
  foto: dyn('post-featured-image'),
  // --- campi della realizzazione ---
  kw: campo('kw'), introduzione: campo('introduzione'), localita: campo('localita'), tipologia: campo('tipologia'),
  progettista: campo('progettista'), brand_forniture: campo('brand_forniture'),
  descrizione_lead: campo('descrizione_lead'), descrizione_testo: campo('descrizione_testo'),
  // --- campi del brand ---
  settori_artes: campo('settori_artes'), fornitura_artes: campo('fornitura_artes'), assistenza: campo('assistenza'),
  come_lavoriamo: campo('come_lavoriamo'), dove_lo_usiamo: campo('dove_lo_usiamo'),
  // --- valori calcolati (shortcode del plugin, localizzati via WPML / textdomain artes-core) ---
  lingue: sc('[artes_lingue]'),
  breadcrumb: sc('[artes_breadcrumb]'), eyebrow: sc('[artes_eyebrow]'), settore_link: sc('[artes_settore_link]'),
  categoria_link: sc('[artes_categoria_link]'), galleria_titolo: sc('[artes_galleria_titolo]'),
  scopri_testo: sc('[artes_scopri_testo]'), url_pagina_settore: sc('[artes_url_pagina_settore]'), cta_brand: sc('[artes_cta_brand]'),
  url_archivio_settore: sc('[artes_url_archivio_settore]'),
  correlate_titolo: sc('[artes_correlate_titolo]'),
  eyebrow_brand: sc('[artes_eyebrow_brand]'),
  come_titolo: sc('[artes_come_titolo]'),
  correlate_brand_titolo: sc('[artes_correlate_brand_titolo]'),
  // --- blog (articolo e archivio) ---
  eyebrow_articolo: sc('[artes_eyebrow_articolo]'),
  url_blog: sc('[artes_url_blog]'),
  estratto: dyn('post-excerpt'),
  // --- termini ---
  categoria_brand_nome: termine('categoria_brand', 'name'),
  // --- dentro ai cicli ---
  galleria_immagine: dyn('jet-object-property-image', { custom_object_prop: 'ID' }),
  card_immagine: dyn('post-featured-image'),
  card_nome: dyn('post-title'),
  card_luogo: campo('localita'),
  card_categoria: termine('categoria', 'name'),
  card_categoria_brand: termine('categoria_brand', 'name'),
  dato_settore: termine('settore', 'slug'),
  dato_categoria: termine('categoria', 'slug'),
  dato_categoria_brand: sc('[artes_dato_categoria_brand]'),
  dato_home_larghezza: campo('home_larghezza'),
};

const loops = {
  galleria: ciclo('realizzazione', 'artes_galleria'),
  correlate: ciclo('realizzazione', 'artes_altre_realizzazioni'),
  progetti_brand: ciclo('realizzazione', 'artes_progetti_brand'),
  archivio_realizzazioni: ciclo('realizzazione', 'artes_archivio_realizzazioni'),
  archivio_brand: ciclo('brand', 'artes_archivio_brand'),
  progetti_home_rev2: ciclo('realizzazione', 'artes_progetti_home_rev2'),
  archivio_articoli: ciclo('post', 'artes_archivio_articoli'),
  articoli_correlati: ciclo('post', 'artes_articoli_correlati'),
};

module.exports = { alias, loops };
