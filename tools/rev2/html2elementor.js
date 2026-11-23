'use strict';
// Converte l'HTML della rev2 in composizioni per elementor-build-composition (XML + element_config + classes), seguendo le
// regole di docs/rev2-regole-di-conversione.md. Principio: stesso DOM, stesse classi, stessi testi; dove Elementor non può
// riprodurre un tag o un attributo, la regola è esplicita e viene riportata negli avvisi (mai perdite silenziose).
//
//   const { converti } = require('./html2elementor');
//   const r = converti(nodoElemento, { file: 'chi-siamo.html', radice: { classi: ['page-root'] } });
//   r.composizione  -> { xml_structure, element_config, classes }  (da unire a post_id / mode / parent_id)
//   r.avvisi        -> cose da guardare;  r.statistiche -> conteggi per widget
//
// Decisioni di fedeltà:
//  - contenitori: e-div-block con lo stesso tag (section, nav, header, footer, aside, article, div, a, button); tag che
//    Elementor non ammette (dl, dt, dd, ul, ol, li, figure…) -> div con classe rev2-<tag> (il CSS portato li riconosce);
//  - testo semplice (solo testo e formattazione senza classe): h1-h6 -> e-heading; p -> e-paragraph (p); un div/dt/dd/li…
//    con solo testo resta un contenitore con un e-paragraph "span" dentro (così nessuna regola 'p {…}' del CSS lo colpisce);
//  - ogni elemento figlio con classe diventa un widget a sé (le classi dentro ai testi vengono eliminate da Elementor);
//  - a: con classe btn -> e-button; altrimenti, fuori dai testi, contenitore 'a' (la classe resta sull'<a>);
//  - id -> _cssid; data-*, aria-*, hidden, role, target: non impostabili, li aggiunge artes-rev2.js dalle classi;
//  - classi di stato (is-active…): non si scrivono, le gestisce il JavaScript.
//
// Modelli dinamici (schede e archivi, fase 4): l'HTML sorgente può avere attributi che legano un elemento a un dato di WordPress
// (la tabella degli alias è in tools/rev2/dinamici.js, passata in opzioni.dinamici):
//  - data-dyn="alias"       il testo (titolo, paragrafo, testo del bottone) viene dal tag dinamico; il widget riceve la classe rev2-v
//  - data-dyn-href="alias"  la destinazione del link viene dal tag dinamico
//  - data-dyn-src="alias"   la sorgente dell'immagine viene dal tag dinamico (alt dall'allegato)
//  - data-opz               riga/blocco facoltativo: classe rev2-opz, nascosto dal CSS se il suo valore dinamico è vuoto
//  - data-opzimg            blocco con una foto facoltativa: classe rev2-opzimg, nascosto dal CSS se non c'è l'immagine
//  - data-loop="alias"      il contenitore diventa un ciclo (Loop): il primo figlio elemento è l'elemento ripetuto, le sue classi
//                           passano all'elemento del ciclo; se è un <a data-dyn-href>, il link dell'intera card è un contenitore
//                           'a' interno (classe rev2-a, display: contents)
const fs = require('fs');
const path = require('path');
const { classi, testo, serializza, serializzaFigli } = require('./html-parse');

const root = path.resolve(__dirname, '..', '..');
const MAPPA_LINK = JSON.parse(fs.readFileSync(path.join(__dirname, 'mappa-link.json'), 'utf8'));
const FILE_MEDIA = path.join(root, 'tools', 'out', 'rev2', 'media-rev2.json');
const MEDIA = fs.existsSync(FILE_MEDIA) ? JSON.parse(fs.readFileSync(FILE_MEDIA, 'utf8')) : {};
const FILE_MEDIA_PAGINE = path.join(root, 'tools', 'out', 'rev2', 'media-pagine.json');
const MEDIA_PAGINE = fs.existsSync(FILE_MEDIA_PAGINE) ? JSON.parse(fs.readFileSync(FILE_MEDIA_PAGINE, 'utf8')) : {};
const FILE_CLASSI = path.join(root, 'tools', 'out', 'rev2', 'classi-rev2.json');
const CLASSI_NOTE = new Set(fs.existsSync(FILE_CLASSI) ? JSON.parse(fs.readFileSync(FILE_CLASSI, 'utf8')) : []);

const INLINE = new Set(['span', 'strong', 'b', 'em', 'i', 'small', 'sup', 'sub', 'u', 's', 'del', 'abbr', 'mark', 'code', 'time', 'wbr', 'br', 'a']);
const FORMATTAZIONE = new Set(['strong', 'b', 'em', 'i', 'sup', 'sub', 'u', 's', 'del', 'br', 'a', 'span']); // ammessi da Elementor dentro ai testi
const TAG_BLOCCO = new Set(['div', 'header', 'section', 'article', 'aside', 'footer', 'main', 'nav']);       // tag di e-div-block (più 'a' e 'button')
const TESTO_TAG = new Set(['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'dt', 'dd', 'summary', 'span', 'strong', 'em', 'b', 'i', 'small', 'button', 'label']);   // i tag con testo "in flusso" (un <a> è invece un contenitore di layout)
const STATO = new Set(['is-active', 'is-open', 'is-visible', 'is-current']);
// tag da sostituire con div/span + classe: devono coincidere con TAG_IN_CLASSE di port-css.js (che li rimappa nei selettori)
const TAG_IN_CLASSE = { dl: 'rev2-dl', dt: 'rev2-dt', dd: 'rev2-dd', ul: 'rev2-ul', ol: 'rev2-ol', li: 'rev2-li', small: 'rev2-small', strong: 'rev2-strong', em: 'rev2-em', b: 'rev2-b', i: 'rev2-i', p: 'rev2-p' };

const sp = (s) => s.replace(/\s+/g, ' ');
const decodifica = (s) => s.replace(/&amp;/g, '&').replace(/&#x27;|&#39;|&apos;/g, "'").replace(/&quot;/g, '"').replace(/&nbsp;/g, ' ');
const frazione = (s) => s.replace(/"/g, '&quot;');

function risolviLink(href, testoLink, file, avvisi) {
  if (href === undefined) return null;
  let h = decodifica(href).trim();
  const testoPulito = sp(testoLink || '').trim();
  if (h === '' || h === '#') {
    const dest = MAPPA_LINK.segnaposto[testoPulito];
    if (dest) return dest;
    avvisi.push(`${file}: link vuoto senza destinazione in mappa-link.json: "${testoPulito}"`);
    return '#';
  }
  if (/^mailto:/i.test(h)) {
    const mailtoCta = MAPPA_LINK.mailto_cta || {};
    // I link diretti con indirizzo email esplicito nel testo (es. "info@artessrl.it" in Privacy/Cookie/Contatti) restano mailto:;
    // i pulsanti/CTA della rev2 statica che usavano mailto: come fallback prima della pagina Contatti puntano a /contatti/.
    if (!testoPulito.includes('@') && mailtoCta[h]) return mailtoCta[h];
    return h;
  }
  if (/^(https?:|tel:)/i.test(h)) return h;
  if (h.startsWith('#')) {
    const ancore = MAPPA_LINK.ancore || {};
    if (ancore[h]) return ancore[h];
    return h;
  }
  if (h.startsWith('/')) return h;
  const m = /^([^?#]*)(\?[^#]*)?(#.*)?$/.exec(h);
  const base = m[1].replace(/^\.\//, ''); const q = m[2] || ''; const frag = m[3] || '';
  if (MAPPA_LINK.pagine[base]) return MAPPA_LINK.pagine[base] + q + frag;
  for (const [pref, modello] of Object.entries(MAPPA_LINK.prefissi)) {
    if (base.startsWith(pref) && base.endsWith('.html')) return modello.replace('{slug}', base.slice(pref.length, -5)) + q + frag;
  }
  if (/^assets\//.test(base)) { const v = MEDIA[base]; return v && v.url ? new URL(v.url).pathname : h; }   // link a una foto (lightbox)
  avvisi.push(`${file}: link non risolto: ${h}`);
  return h;
}

function converti(nodo, opzioni = {}) {
  const file = opzioni.file || '';
  const avvisi = []; const stat = {};
  const conta = (k) => { stat[k] = (stat[k] || 0) + 1; };
  const usati = new Set(); let contatore = 0;
  const nuovoId = (base) => { const b = String(base || 'el').replace(/[^\w\- ]/g, '').trim().slice(0, 40) || 'el'; contatore++; return `${b} ${contatore}`; };

  const DIN = opzioni.dinamici || { alias: {}, loops: {} };
  const dinamico = (n, attr) => {
    const nome = n.attr && n.attr[attr]; if (nome === undefined) return undefined;
    const d = DIN.alias[nome]; if (!d) throw new Error(`${file}: alias dinamico sconosciuto "${nome}" (${attr} su <${n.tag}>)`);
    return d;
  };
  const opzionale = (n) => [...(n.attr && n.attr['data-opz'] !== undefined ? ['rev2-opz'] : []), ...(n.attr && n.attr['data-opzimg'] !== undefined ? ['rev2-opzimg'] : [])];

  // ---- classificazione ---------------------------------------------------------------------------
  const significativi = (n) => n.figli.filter((f) => f.tipo === 'el' || (f.tipo === 'testo' && f.testo.trim() !== ''));
  const frasale = (n) => n.tipo === 'testo' || n.tipo === 'commento' || (n.tipo === 'el' && INLINE.has(n.tag) && n.figli.every(frasale));
  const classiPulite = (n) => classi(n).filter((c) => !STATO.has(c));
  const haClasseOId = (n) => classiPulite(n).length > 0 || (n.attr.id !== undefined);
  // contenuto "di solo testo": nessun figlio a blocchi, nessun inline con classe/id, e (per i tag che non sono di testo)
  // testo vero tra gli elementi oppure un solo figlio
  function soloTesto(n) {
    const k = significativi(n);
    if (!k.length) return false;
    const flusso = TESTO_TAG.has(n.tag);
    if (!k.every((f) => f.tipo === 'testo' || (frasale(f) && f.tag !== undefined && FORMATTAZIONE.has(f.tag) && inlineSemplice(f, flusso)))) return false;
    if (flusso) return true;
    return k.some((f) => f.tipo === 'testo') || k.length === 1;
  }
  // nessuna classe/id sull'elemento e sui discendenti, tag ammessi da Elementor. Uno <span> senza classi è formattazione solo
  // dentro a un testo (p, titoli…); dentro a un contenitore (div, a, article…) è un elemento di layout (flex item, regole 'X span'
  // del CSS) e resta un widget a sé.
  function inlineSemplice(n, inFlusso = true) {
    if (n.tipo !== 'el') return true;
    if (haClasseOId(n) || !FORMATTAZIONE.has(n.tag)) return false;
    if (n.tag === 'span' && !inFlusso) return false;
    return n.figli.every((f) => inlineSemplice(f, true));
  }
  // HTML interno di un testo: solo formattazione ammessa, link risolti, senza attributi (tranne href)
  function htmlTesto(n) {
    const out = [];
    for (const f of n.figli) {
      if (f.tipo === 'testo') { out.push(f.testo); continue; }
      if (f.tipo !== 'el') continue;
      const dentro = htmlTesto(f);
      if (f.tag === 'br') { out.push('<br>'); continue; }
      if (f.tag === 'a') { const d = risolviLink(f.attr.href, testo(f), file, avvisi); out.push(d === null ? dentro : `<a href="${frazione(d)}">${dentro}</a>`); continue; }
      out.push(`<${f.tag}>${dentro}</${f.tag}>`);
    }
    return out.join('');
  }
  const pulisciTesto = (s) => sp(s);

  // ---- costruzione dei widget ---------------------------------------------------------------------
  const W = (tipo, cfg, cls, figli, nome) => ({ tipo, cfg: cfg || {}, cls: cls || [], figli: figli || [], nome });
  function classiDi(n, extra = []) {
    const out = [...extra, ...classiPulite(n)];
    for (const c of out) if (!CLASSI_NOTE.has(c) && !/^rev2-/.test(c)) avvisi.push(`${file}: classe non presente nell'inventario: ${c}`);
    return out;
  }
  function attributiPersi(n) {
    for (const k of Object.keys(n.attr)) {
      if (k === 'class' || k === 'href' || k === 'src' || k === 'alt' || k === 'id' || k === 'data-dyn' || k === 'data-dyn-href' || k === 'data-dyn-src' || k === 'data-opz' || k === 'data-opzimg' || k === 'data-loop') continue;
      if (k === 'style' && n.attr[k].replace(/\s+/g, '') === 'margin-bottom:0') continue;
      if (k === 'hidden' || k.startsWith('data-') || k.startsWith('aria-') || k === 'role' || k === 'type' || k === 'target' || k === 'rel' || k === 'loading' || k === 'width' || k === 'height' || k === 'decoding') { stat['attr:' + k.replace(/-.*/, '-*')] = (stat['attr:' + k.replace(/-.*/, '-*')] || 0) + 1; continue; }
      avvisi.push(`${file}: attributo non gestito <${n.tag} ${k}="${n.attr[k]}">`);
    }
  }
  const tagContenitore = (n) => (TAG_BLOCCO.has(n.tag) ? n.tag : 'div');
  function extraClasse(n) {
    const out = [];
    if (TAG_IN_CLASSE[n.tag]) out.push(TAG_IN_CLASSE[n.tag]);
    if (n.attr && n.attr.style && n.attr.style.replace(/\s+/g, '') === 'margin-bottom:0') out.push('rev2-mb0');
    return out;
  }
  function cssid(cfg, n) { if (n.attr.id !== undefined) cfg._cssid = n.attr.id; return cfg; }

  function paragrafoDaRun(nodi) {          // sequenza di nodi inline senza classi -> un paragrafo "span"
    const tmp = { figli: nodi };
    const t = pulisciTesto(htmlTesto(tmp));
    if (t.trim() === '') return null;
    return W('e-paragraph', { paragraph: t, tag: 'span' }, ['rev2-t'], [], 'testo');
  }

  // converte i figli di n in widget. Gli inline senza classe e il testo vengono raggruppati in "run".
  function figliWidget(n) {
    const out = []; let run = [];
    const chiudiRun = () => { if (run.length) { const w = paragrafoDaRun(run); if (w) out.push(w); run = []; } };
    const ks = n.figli.filter((f) => f.tipo !== 'commento');
    // se ci sono elementi a blocchi o elementi con classe, i nodi di solo testo/inline semplici in mezzo vanno raggruppati;
    // se ci sono solo elementi (senza testo vero tra l'uno e l'altro), ogni elemento è un widget (flex/grid li trattano come item)
    const testoVero = ks.some((f) => f.tipo === 'testo' && f.testo.trim() !== '');
    for (const f of ks) {
      if (f.tipo === 'testo') { if (f.testo.trim() === '' && !testoVero) continue; run.push(f); continue; }
      if (testoVero && frasale(f) && inlineSemplice(f, TESTO_TAG.has(n.tag))) { run.push(f); continue; }
      chiudiRun();
      out.push(...elemento(f));
    }
    chiudiRun();
    return out;
  }

  // ciclo: contenitore -> e-collection-loop > layout (classi del contenitore) > elemento ripetuto (classi del primo figlio)
  function ciclo(n) {
    const spec = DIN.loops[n.attr['data-loop']];
    if (!spec) throw new Error(`${file}: ciclo sconosciuto "${n.attr['data-loop']}"`);
    const rip = significativi(n).find((x) => x.tipo === 'el');
    if (!rip) throw new Error(`${file}: ciclo "${n.attr['data-loop']}" senza elemento ripetuto`);
    attributiPersi(rip);
    const dest = dinamico(rip, 'data-dyn-href');
    const interno = (rip.tag === 'a' && dest)
      ? [W('e-div-block', { tag: 'a', link: { destination: dest, tag: 'a' } }, ['rev2-a'], figliWidget(rip), 'link scheda')]
      : figliWidget(rip);
    conta('ciclo');
    const item = W('e-collection-loop-item', {}, classiDi(rip, opzionale(rip)), interno, 'elemento');
    const layout = W('e-collection-loop-layout', cssid({}, n), classiDi(n, opzionale(n)), [item], 'ciclo ' + (classi(n)[0] || ''));
    return [W('e-collection-loop', { query: spec.query, ...(spec.extra || {}) }, ['rev2-loop'], [layout], 'ciclo')];
  }

  function elemento(n) {
    attributiPersi(n);
    if (n.attr['data-loop'] !== undefined) return ciclo(n);
    const tag = n.tag;
    const dyn = dinamico(n, 'data-dyn');
    if (['script', 'style', 'link', 'meta', 'noscript'].includes(tag)) { avvisi.push(`${file}: <${tag}> ignorato`); return []; }
    if (/^h[1-6]$/.test(tag)) {
      if (!soloTesto(n)) { avvisi.push(`${file}: titolo con elementi dentro (classi?) non convertibile come e-heading: <${tag} class="${n.attr.class || ''}">`); }
      conta('e-heading');
      return [W('e-heading', cssid({ tag, title: dyn || pulisciTesto(htmlTesto(n)) }, n), classiDi(n, opzionale(n)), [], tag)];
    }
    if (tag === 'img') {
      const dsrc = dinamico(n, 'data-dyn-src');
      if (dsrc) { conta('e-image'); return [W('e-image', cssid({ image: { src: dsrc, size: 'full' } }, n), classiDi(n, opzionale(n)), [], 'immagine')]; }
      const src = n.attr.src; const alt = n.attr.alt || '';
      const idCopia = MEDIA_PAGINE[`${src}|${alt}`];
      const m = MEDIA[src];
      if (!idCopia && !m) { avvisi.push(`${file}: immagine non importata: ${src}`); return []; }
      conta('e-image');
      return [W('e-image', cssid({ image: { src: { id: idCopia || m.id }, size: 'full' } }, n), classiDi(n), [], 'immagine')];
    }
    if (tag === 'div' && classi(n).includes('faq') && significativi(n).some((f) => f.tipo === 'el' && f.tag === 'details')) {
      const items = [];
      for (const d of significativi(n)) {
        if (d.tipo !== 'el' || d.tag !== 'details') continue;
        attributiPersi(d);
        const sum = d.figli.find((f) => f.tipo === 'el' && f.tag === 'summary');
        const corpoNodi = d.figli.filter((f) => f !== sum && f.tipo !== 'commento');
        const titoloTesto = sum ? pulisciTesto(htmlTesto(sum)).trim() : '';
        const titleWidget = W('e-accordion-item-title', {}, [], [W('e-paragraph', { paragraph: titoloTesto, tag: 'span' }, ['rev2-t'], [], 'domanda')], 'titolo');
        const headerWidget = W('e-accordion-item-header', {}, [], [titleWidget], 'summary');
        const contentWidget = W('e-accordion-item-content', {}, [], figliWidget({ tag: 'div', figli: corpoNodi, attr: {} }), 'risposta');
        items.push(W('e-accordion-item', cssid({}, d), classiDi(d, opzionale(d)), [headerWidget, contentWidget], 'faq-item'));
      }
      conta('e-accordion');
      return [W('e-accordion', cssid({ default_state: 'all_collapsed', max_expanded: 'multiple', show_icon: false, faq_schema: true }, n), classiDi(n, opzionale(n)), items, 'faq')];
    }
    if (tag === 'p') {
      if (soloTesto(n) || dyn) { conta('e-paragraph'); return [W('e-paragraph', cssid({ paragraph: dyn || pulisciTesto(htmlTesto(n)), tag: 'p' }, n), classiDi(n, [...opzionale(n), ...(dyn ? ['rev2-v'] : [])]), [], 'p')]; }
      // p con link/elementi classati dentro: contenitore div con classe rev2-p
      avvisi.push(`${file}: <p class="${n.attr.class || ''}"> con elementi classati: diventa div (classe rev2-p)`);
      conta('p->div');
      return [W('e-div-block', cssid({ tag: 'div' }, n), classiDi(n, extraClasse(n)), figliWidget(n), 'p')];
    }
    if (tag === 'a') return linkAutonomo(n);
    if (tag === 'button') {
      if (soloTesto(n)) { conta('e-button'); return [W('e-button', cssid({ text: dyn || pulisciTesto(testo(n)).trim(), tag: 'button' }, n), classiDi(n, opzionale(n)), [], 'bottone')]; }
      conta('button-contenitore');
      return [W('e-div-block', cssid({ tag: 'button' }, n), classiDi(n), figliWidget(n), 'button')];
    }
    if (INLINE.has(tag)) {                 // span/strong/small… "in piedi da soli" dentro a un contenitore
      conta('e-paragraph');
      const cls = classiDi(n, [...extraClasse(n), ...opzionale(n), ...(dyn ? ['rev2-v'] : [])]);
      if (soloTesto(n) || dyn || !significativi(n).length) return [W('e-paragraph', cssid({ paragraph: dyn || pulisciTesto(htmlTesto(n)), tag: 'span' }, n), cls, [], tag)];
      return [W('e-div-block', cssid({ tag: 'div' }, n), cls, figliWidget(n), tag)];
    }
    if (['details', 'summary'].includes(tag)) {
      avvisi.push(`${file}: <${tag} class="${n.attr.class || ''}"> fuori da .faq; reso come contenitore`);
    }
    // contenitore
    const cls = classiDi(n, [...extraClasse(n), ...opzionale(n)]);
    const tg = tagContenitore(n);
    if (tag !== tg && !TAG_IN_CLASSE[tag]) avvisi.push(`${file}: <${tag}> reso come div senza classe di appoggio`);
    conta('e-div-block');
    if (soloTesto(n) || dyn) return [W('e-div-block', cssid({ tag: tg }, n), cls, [W('e-paragraph', { paragraph: dyn || pulisciTesto(htmlTesto(n)), tag: 'span' }, ['rev2-t', ...(dyn ? ['rev2-v'] : [])], [], 'testo')], tag)];
    return [W('e-div-block', cssid({ tag: tg }, n), cls, figliWidget(n), tag)];
  }

  function linkAutonomo(n) {
    const cl = classi(n);
    const ddest = dinamico(n, 'data-dyn-href'); const dtesto = dinamico(n, 'data-dyn');
    const dest = ddest || risolviLink(n.attr.href, testo(n), file, avvisi);
    const link = dest === null ? undefined : { destination: dest, tag: 'a' };
    if (cl.some((c) => c === 'btn' || c.startsWith('btn--')) && soloTesto(n)) {
      conta('e-button');
      return [W('e-button', cssid({ text: dtesto || pulisciTesto(testo(n)).trim(), ...(link ? { link } : {}) }, n), classiDi(n, opzionale(n)), [], 'bottone')];
    }
    conta('e-div-block[a]');
    const figli = (soloTesto(n) || dtesto) ? [W('e-paragraph', { paragraph: dtesto || pulisciTesto(htmlTesto(n)), tag: 'span' }, ['rev2-t', ...(dtesto ? ['rev2-v'] : [])], [], 'testo')] : figliWidget(n);
    return [W('e-div-block', cssid({ tag: 'a', ...(link ? { link } : {}) }, n), classiDi(n, opzionale(n)), figli, 'link ' + sp(testo(n)).trim().slice(0, 28))];
  }

  // ---- radice -------------------------------------------------------------------------------------
  let alberi;
  if (opzioni.soloFigli) alberi = figliWidget(nodo);
  else alberi = elemento(nodo);
  if (opzioni.radice) alberi = [W('e-div-block', cssid({ tag: opzioni.radice.tag || 'div' }, { attr: opzioni.radice.id ? { id: opzioni.radice.id } : {} }), opzioni.radice.classi || [], alberi, 'radice')];

  // ---- serializzazione in XML + mappe ------------------------------------------------------------
  const element_config = {}; const classes = {};
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
  function xml(w) {
    const id = nuovoId(w.cls[0] || w.nome);
    if (Object.keys(w.cfg).length) element_config[id] = w.cfg;
    if (w.cls.length) classes[id] = [...new Set(w.cls)];
    const inner = w.figli.map(xml).join('');
    return `<${w.tipo} configuration-id="${esc(id)}">${inner}</${w.tipo}>`;
  }
  const xml_structure = alberi.map(xml).join('');
  return { composizione: { xml_structure, element_config, classes }, avvisi: [...new Set(avvisi)], statistiche: stat, elementi: contatore };
}

module.exports = { converti, risolviLink };
