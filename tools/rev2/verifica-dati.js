'use strict';
// Verifica che i DATI di dev3 corrispondano a quelli della rev2 (fase 3): tassonomie, articoli, campi, immagini, relazioni,
// cestino, e (fine fase 4) assenza dei campi del vecchio modello. È il "test" dell'import: prima dell'import deve fallire,
// dopo deve passare.
//   node tools/rev2/dati-rev2.js && node tools/rev2/verifica-dati.js [--dettagli]
// Esce con codice 1 se c'è anche un solo controllo fallito. Sola lettura.
const fs = require('fs');
const path = require('path');
const { connetti } = require('./mcp-client');
const { leggiDev3 } = require('./dev3-dati');
const M = require('./modello-dati');

const root = path.resolve(__dirname, '..', '..');
const E = require('./dati-rev2-carica')();
const dettagli = process.argv.includes('--dettagli');
const norm = (s) => String(s === undefined || s === null ? '' : s).replace(/\s+/g, ' ').trim();

const gruppi = new Map(); let totale = 0; let falliti = 0;
function check(gruppo, nome, ok, dettaglio) {
  totale++; if (!ok) falliti++;
  if (!gruppi.has(gruppo)) gruppi.set(gruppo, { ok: 0, ko: [] });
  const g = gruppi.get(gruppo);
  if (ok) g.ok++; else g.ko.push(`${nome}${dettaglio !== undefined ? ' — ' + dettaglio : ''}`);
}
const eq = (g, nome, atteso, attuale) => check(g, nome, norm(atteso) === norm(attuale), `atteso "${norm(atteso).slice(0, 90)}" / trovato "${norm(attuale).slice(0, 90)}"`);

(async () => {
  const nv = await connetti('novamira');
  const A = await leggiDev3(nv);
  const att = A.att;
  // dalla traduzione EN (WPML) ogni articolo ha una copia en-gb: i controlli sulla rev2 riguardano l'italiano; l'inglese ha i suoi script (wpml-trad-dati.js --stato)
  const it = (p) => p.lingua !== 'en-gb';
  const idEn = new Set(A.post.filter((p) => !it(p)).map((p) => p.id));
  const attivi = (tipo) => A.post.filter((p) => p.tipo === tipo && p.stato === 'publish' && it(p));
  const perSlug = (tipo, slug, stato = 'publish') => A.post.find((p) => p.tipo === tipo && p.slug === slug && p.stato === stato && it(p));
  // Origine del file di un allegato (meta _artes_src): "rev2:<percorso>" per i nuovi, "<percorso>" per quelli del vecchio import che
  // import-media.js ha riusato perché il file è identico (confronto md5); le copie per card/brand aggiungono "#etichetta".
  const srcOk = (a, src) => !!(a && a.src && String(a.src).replace(/^rev2:/, '').split('#')[0] === src);

  // ---- 1. settore --------------------------------------------------------------------------------------------------
  const ts = A.tax.settore || [];
  check('1 settore', 'ci sono esattamente 5 termini', ts.length === 5, `trovati ${ts.length}`);
  for (const s of E.settori) {
    const t = ts.find((x) => x.slug === s.codice);
    check('1 settore', `termine "${s.codice}" esiste`, !!t, 'slug non trovato');
    if (t) {
      eq('1 settore', `nome di ${s.codice}`, s.nome, t.nome); eq('1 settore', `ordine di ${s.codice}`, s.ordine, t.meta.ordine);
      const slugPagina = M.PAGINE_SETTORE[s.codice]; const idPagina = (A.pagine || {})[slugPagina];
      check('1 settore', `pagina del settore ${s.codice} (${slugPagina}) nel meta "pagina"`, !!idPagina && String(t.meta.pagina) === String(idPagina), `atteso ID ${idPagina}, trovato "${t.meta.pagina}"`);
      // la pagina settore (design vecchio) sceglie i progetti dal proprio campo "settore_collegato" = slug del termine: se lo slug cambia e il
      // campo no, l'elenco progetti della pagina resta vuoto senza alcun errore
      eq('1 settore', `campo "settore_collegato" della pagina ${slugPagina}`, s.codice, (A.settore_collegato || {})[slugPagina]);
    }
  }

  // ---- 2. categoria (nuova) ----------------------------------------------------------------------------------------
  const tc = A.tax.categoria;
  check('2 categoria', 'la tassonomia "categoria" esiste', Array.isArray(tc), 'non esiste');
  if (Array.isArray(tc)) {
    const attese = E.settori.flatMap((s) => s.categorie.map((c) => ({ ...c, settore: s.codice })));
    check('2 categoria', `ci sono esattamente ${attese.length} termini`, tc.length === attese.length, `trovati ${tc.length}`);
    for (const c of attese) {
      const t = tc.find((x) => x.slug === c.slug);
      check('2 categoria', `termine "${c.slug}" esiste`, !!t, 'slug non trovato');
      if (t) {
        eq('2 categoria', `nome di ${c.slug}`, c.nome, t.nome); eq('2 categoria', `tipologie di ${c.slug}`, c.tipologie, t.descrizione);
        eq('2 categoria', `settore di ${c.slug}`, c.settore, t.meta.settore); eq('2 categoria', `ordine_pagina di ${c.slug}`, c.ordinePagina, t.meta.ordine_pagina);
        eq('2 categoria', `ordine_filtro di ${c.slug}`, c.ordineFiltro, t.meta.ordine_filtro || 0);
      }
    }
  }

  // ---- 3. categoria_brand ------------------------------------------------------------------------------------------
  const tb = A.tax.categoria_brand || [];
  check('3 categoria_brand', `ci sono esattamente ${E.categorieBrand.length} termini`, tb.length === E.categorieBrand.length, `trovati ${tb.length}`);
  for (const c of E.categorieBrand) {
    const t = tb.find((x) => x.slug === c.slug);
    check('3 categoria_brand', `termine "${c.slug}" esiste`, !!t, 'slug non trovato');
    if (t) { eq('3 categoria_brand', `nome di ${c.slug}`, c.nome, t.nome); eq('3 categoria_brand', `ordine di ${c.slug}`, c.ordine, t.meta.ordine); }
  }

  // ---- 4. campi definiti in JetEngine + WPML -------------------------------------------------------------------------
  for (const [tipo, campi] of [['realizzazione', M.CAMPI_REALIZZAZIONE], ['brand', M.CAMPI_BRAND]]) {
    const nomi = (A.campi[tipo] || []).map((f) => f.name);
    for (const c of campi) {
      check('4 campi', `${tipo}.${c.name} definito`, nomi.includes(c.name), 'campo mancante');
      const modo = A.wpml_campi[c.name];
      check('4 campi', `${tipo}.${c.name} con regola WPML (${c.wpml})`, c.wpml === 'translate' ? Number(modo) === 2 : Number(modo) === 1, `modo WPML trovato: ${modo}`);
    }
  }

  // ---- 5. realizzazioni: insieme, cestino, dettaglio -------------------------------------------------------------------
  const pub = attivi('realizzazione');
  const slugAttesi = E.realizzazioni.map((r) => r.slug);
  check('5 realizzazioni', `pubblicate esattamente ${slugAttesi.length}`, pub.length === slugAttesi.length, `pubblicate ${pub.length}`);
  for (const p of pub) check('5 realizzazioni', `"${p.slug}" è nella rev2`, slugAttesi.includes(p.slug), 'pubblicata ma non presente nella rev2');
  const idDi = {}; // slug -> id
  for (const r of E.realizzazioni) {
    const p = perSlug('realizzazione', r.slug); const G = `6 realizzazione ${r.slug}`;
    check('5 realizzazioni', `"${r.slug}" pubblicata`, !!p, 'non trovata');
    if (!p) continue;
    idDi[r.slug] = p.id;
    eq(G, 'titolo', r.titolo, p.titolo); eq(G, 'ordine archivio (menu_order)', r.ordine, p.ordine);
    eq(G, 'lingua', 'it', p.lingua);
    eq(G, 'settore', r.settore, (p.termini.settore || []).join(',')); eq(G, 'categoria', r.categoria, (p.termini.categoria || []).join(','));
    for (const [campo, val] of [['kw', r.kw], ['introduzione', r.introduzione], ['localita', r.localita], ['tipologia', r.tipologia], ['progettista', r.progettista || '']]) eq(G, campo, val, p.meta[campo]);
    eq(G, 'brand_forniture', r.brandForniture ? r.brandForniture.html : '', p.meta.brand_forniture);
    eq(G, 'descrizione_lead', r.descrizione[0].html, p.meta.descrizione_lead);
    eq(G, 'descrizione_testo', r.descrizione.slice(1).map((d) => d.html).join('\n\n'), p.meta.descrizione_testo);
    eq(G, 'home_ordine', r.home ? r.home.ordine : '', p.meta.home_ordine); eq(G, 'home_larghezza', r.home ? r.home.larghezza : '', p.meta.home_larghezza);
    // galleria: stesso numero di foto, stesso ordine, alt della rev2, file della rev2
    const ids = norm(p.meta.galleria).split(',').filter(Boolean).map(Number);
    eq(G, 'numero di foto in galleria', r.galleria.length, ids.length);
    r.galleria.forEach((g, i) => { const a = att[ids[i]]; check(G, `foto ${i + 1}: file e alt della rev2`, srcOk(a, g.src) && norm(a.alt) === norm(g.alt), `atteso ${g.src} / "${norm(g.alt).slice(0, 60)}"; trovato ${a ? a.src : 'nessun allegato'} / "${a ? norm(a.alt).slice(0, 60) : ''}"`); });
    const th = att[Number(p.meta._thumbnail_id)];
    check(G, 'immagine in evidenza (card): file e alt della rev2', srcOk(th, r.cardImg) && norm(th.alt) === norm(r.cardAlt), `atteso ${r.cardImg} / "${r.cardAlt}"; trovato ${th ? th.src : 'nessuna'} / "${th ? th.alt : ''}"`);
  }
  // ---- 6. brand ---------------------------------------------------------------------------------------------------------
  const pubB = attivi('brand'); const slugBAttesi = E.brand.map((b) => b.slug);
  check('7 brand', `pubblicati esattamente ${slugBAttesi.length}`, pubB.length === slugBAttesi.length, `pubblicati ${pubB.length}`);
  for (const p of pubB) check('7 brand', `"${p.slug}" è nella rev2`, slugBAttesi.includes(p.slug), 'pubblicato ma non presente nella rev2');
  const idBrand = {};
  for (const b of E.brand) {
    const p = perSlug('brand', b.slug); const G = `7 brand ${b.slug}`;
    check('7 brand', `"${b.slug}" pubblicato`, !!p, 'non trovato');
    if (!p) continue;
    idBrand[b.slug] = p.id;
    eq(G, 'titolo', b.titolo, p.titolo); eq(G, 'ordine archivio (menu_order)', b.ordine, p.ordine); eq(G, 'lingua', 'it', p.lingua);
    eq(G, 'categoria_brand', M.slugify(b.categoria), (p.termini.categoria_brand || []).join(','));
    eq(G, 'introduzione', b.introduzione, p.meta.introduzione); eq(G, 'settori_artes', b.settoriArtes.html, p.meta.settori_artes);
    eq(G, 'fornitura_artes', b.fornituraArtes, p.meta.fornitura_artes); eq(G, 'assistenza', b.assistenza, p.meta.assistenza);
    eq(G, 'come_lavoriamo', b.sezioni[0].paragrafi[0].html, p.meta.come_lavoriamo); eq(G, 'dove_lo_usiamo', b.sezioni[1].paragrafi[0].html, p.meta.dove_lo_usiamo);
    const th = p.meta._thumbnail_id ? att[Number(p.meta._thumbnail_id)] : null;
    if (b.foto) check(G, 'foto del brand: file e alt della rev2', srcOk(th, b.foto.src) && norm(th.alt) === norm(b.foto.alt), `atteso ${b.foto.src} / "${b.foto.alt}"; trovato ${th ? th.src : 'nessuna'} / "${th ? th.alt : ''}"`);
    else check(G, 'nessuna foto (come nella rev2)', !th, `trovata un'immagine in evidenza (${th ? th.src : ''})`);
  }
  // ---- 7. cestino: tutto ciò che non è nella rev2 --------------------------------------------------------------------
  for (const p of A.post) {
    const inRev2 = p.tipo === 'realizzazione' ? slugAttesi.includes(p.slug) : slugBAttesi.includes(p.slug);
    if (!inRev2) check('8 cestino', `${p.tipo} "${p.slug}" (${p.titolo}) non è nella rev2: deve essere nel cestino`, p.stato === 'trash', `stato attuale: ${p.stato}`);
  }
  const hw = (A.altro.hello_world || []).filter((x) => x.stato !== 'trash');
  check('8 cestino', 'nessun articolo di blog di prova ("Hello world!") fuori dal cestino', hw.length === 0, hw.map((x) => `${x.id} ${x.titolo} (${x.stato})`).join(', '));
  // ---- 8. relazioni brand ↔ realizzazioni --------------------------------------------------------------------------------
  const attiviIds = new Set([...Object.values(idDi), ...Object.values(idBrand)]);
  const coppieAtt = new Set(A.rel.map(([p, c]) => `${p}|${c}`));
  const coppieExp = new Set(E.relazioni.filter(([pr, br]) => idDi[pr] && idBrand[br]).map(([pr, br]) => `${idDi[pr]}|${idBrand[br]}`));
  check('9 relazioni', `${E.relazioni.length} coppie brand ↔ progetto come nella rev2`, coppieExp.size === E.relazioni.length && [...coppieExp].every((k) => coppieAtt.has(k)), `attese ${E.relazioni.length}, presenti ${[...coppieExp].filter((k) => coppieAtt.has(k)).length}`);
  const estranee = A.rel.filter(([p, c]) => !(idEn.has(p) && idEn.has(c)) && !coppieExp.has(`${p}|${c}`));
  check('9 relazioni', 'nessuna relazione in più (né verso articoli nel cestino)', estranee.length === 0, `relazioni estranee: ${estranee.map((r) => r.join('→')).join(', ')}`);

  // ---- 9. campi del vecchio modello tolti (fine fase 4) -------------------------------------------------------------------
  // Fuori dalla rev2: via dalle definizioni JetEngine, dalle regole WPML e dagli articoli che restano. Gli articoli nel cestino
  // non si toccano (se si recuperano, tornano com'erano). Una regola WPML vale per nome di campo su tutti i tipi: un nome ancora
  // usato dal modello nuovo (es. "galleria" delle realizzazioni) la tiene.
  const nomiNuovi = new Set([...M.CAMPI_REALIZZAZIONE, ...M.CAMPI_BRAND].map((c) => c.name));
  const G10 = '10 campi vecchi tolti';
  for (const [tipo, lista] of Object.entries(M.CAMPI_DA_TOGLIERE)) {
    const nomi = (A.campi[tipo] || []).map((f) => f.name);
    for (const n of lista) check(G10, `${tipo}.${n} non è più definito in JetEngine`, !nomi.includes(n), 'campo ancora definito');
    for (const n of lista.filter((x) => !nomiNuovi.has(x))) check(G10, `${n}: nessuna regola WPML residua`, !Object.prototype.hasOwnProperty.call(A.wpml_campi, n), `modo WPML trovato: ${A.wpml_campi[n]}`);
    for (const p of A.post.filter((x) => x.tipo === tipo && x.stato !== 'trash')) {
      const resta = lista.filter((n) => Object.prototype.hasOwnProperty.call(p.meta, n));
      check(G10, `${tipo} "${p.slug}": nessun valore dei campi vecchi`, resta.length === 0, `ancora presenti: ${resta.join(', ')}`);
    }
  }

  // ---- riepilogo ---------------------------------------------------------------------------------------------------------
  console.log(`\nVerifica dati dev3 ↔ rev2: ${totale - falliti}/${totale} controlli superati, ${falliti} falliti\n`);
  for (const [nome, g] of [...gruppi.entries()].sort((a, b) => a[0].localeCompare(b[0], 'it', { numeric: true }))) {
    const stato = g.ko.length ? 'FAIL' : 'ok  ';
    console.log(`${stato} ${nome}: ${g.ok} ok${g.ko.length ? `, ${g.ko.length} falliti` : ''}`);
    if (g.ko.length && (dettagli || gruppi.size < 14)) g.ko.slice(0, dettagli ? 400 : 3).forEach((k) => console.log('       · ' + k));
  }
  process.exit(falliti ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
