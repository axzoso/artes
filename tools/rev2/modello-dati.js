'use strict';
// Modello dati di dev3 dopo l'adeguamento alla rev2 (fase 3): unica fonte per import-dati.js e verifica-dati.js.
//
// Tassonomie
//   settore         (esistente, su realizzazione)  5 termini, slug = codici rev2, meta `ordine`
//   categoria       (NUOVA, su realizzazione, piatta) 26 termini; descrizione = "tipologie" della pagina settore;
//                   meta `settore` (codice), `ordine_pagina` (posizione nella pagina settore), `ordine_filtro` (posizione nei filtri
//                   dell'archivio, 0 = non compare nei filtri)
//   categoria_brand (esistente, su brand)           8 termini, nomi come i filtri della rev2, meta `ordine`
//
// Campi dei tipi di contenuto (JetEngine). `wpml`: 'translate' = campo tradotto, 'copy' = copiato nelle traduzioni.
// I campi del vecchio modello che la rev2 non usa (CAMPI_DA_TOGLIERE) si tolgono a fine fase 4, quando i template vecchi
// (che li leggono) vengono sostituiti: finché non si cambia template restano definiti.
const CAMPI_REALIZZAZIONE = [
  { name: 'kw', title: 'Riga parola chiave (sotto il titolo; entra nel titolo SEO)', type: 'text', wpml: 'translate' },
  { name: 'introduzione', title: 'Introduzione', type: 'textarea', wpml: 'translate' },
  { name: 'localita', title: 'Località', type: 'text', wpml: 'copy' },
  { name: 'tipologia', title: 'Tipologia', type: 'text', wpml: 'translate' },
  { name: 'progettista', title: 'Progettista (solo se compare)', type: 'text', wpml: 'translate' },
  { name: 'brand_forniture', title: 'Brand e forniture (HTML; i brand con scheda hanno il link)', type: 'wysiwyg', wpml: 'translate' },
  { name: 'descrizione_lead', title: 'Descrizione: paragrafo in evidenza', type: 'textarea', wpml: 'translate' },
  { name: 'descrizione_testo', title: 'Descrizione: testo', type: 'wysiwyg', wpml: 'translate' },
  { name: 'galleria', title: 'Galleria', type: 'gallery', wpml: 'copy' },
  { name: 'home_ordine', title: 'Home: posizione (1-6; vuoto = non compare)', type: 'number', wpml: 'copy' },
  { name: 'home_larghezza', title: 'Home: larghezza della card (w2, w4, w6)', type: 'text', wpml: 'copy' },
];
const CAMPI_BRAND = [
  { name: 'introduzione', title: 'Introduzione (HTML con link ai settori)', type: 'wysiwyg', wpml: 'translate' },
  { name: 'settori_artes', title: 'Settori Artes (HTML con link)', type: 'wysiwyg', wpml: 'translate' },
  { name: 'fornitura_artes', title: 'Fornitura Artes', type: 'text', wpml: 'translate' },
  { name: 'assistenza', title: 'Assistenza', type: 'text', wpml: 'translate' },
  { name: 'come_lavoriamo', title: 'Come lavoriamo con il brand', type: 'wysiwyg', wpml: 'translate' },
  { name: 'dove_lo_usiamo', title: 'Dove lo usiamo (HTML con link ai settori e ai progetti)', type: 'wysiwyg', wpml: 'translate' },
];
const CAMPI_DA_TOGLIERE = {
  realizzazione: ['sottotitolo_ambito', 'cliente', 'superficie', 'ambienti', 'arredi', 'servizi_artes', 'tempi'],
  brand: ['sottotitolo_categoria', 'ambiti_artes', 'certificazioni', 'categorie_prodotto', 'galleria'],
};

// Pagina di ogni settore (slug della pagina WordPress): i termini `settore` la ricordano nel meta `pagina` (ID), così gli shortcode
// del plugin (artes_settore_link, artes_url_pagina_settore) trovano l'indirizzo senza scriverlo nel codice.
const PAGINE_SETTORE = { uffici: 'arredamento-ufficio', retail: 'arredo-negozi', 'bar-ristoranti': 'arredamento-bar-ristoranti', food: 'arredo-negozi-food', hospitality: 'arredamento-hotel' };

// ---- contenuti non presenti in rev2 (vanno nel cestino) ---------------------------------------------------------------
const slugify = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/&/g, ' e ').replace(/['’]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

// Rinomina di articoli già presenti che la rev2 chiama in modo diverso: slug vecchio -> { slug, titolo } della rev2
const RINOMINE_REALIZZAZIONI = { 'bbc-tarsia': 'bcc-tarsia', quotidiano: 'il-quotidiano' };

module.exports = { CAMPI_REALIZZAZIONE, CAMPI_BRAND, CAMPI_DA_TOGLIERE, RINOMINE_REALIZZAZIONI, PAGINE_SETTORE, slugify };
