'use strict';
// Estrae i DATI della rev2 (settori, categorie, realizzazioni, brand) dall'HTML in un modello unico e normalizzato:
//   node tools/rev2/dati-rev2.js        -> tools/out/rev2/dati-rev2.json + riepilogo e controlli di coerenza a video
// È la fonte da cui la fase 3 costruisce su dev3 tassonomie, schede e relazioni (import-dati.js) e da cui verifica-dati.js
// ricava lo stato atteso. Nessuna scrittura su dev3. I controlli di coerenza (regole "derivate": titoli SEO, correlate,
// didascalie…) servono a sapere cosa va memorizzato e cosa si può calcolare in fase di rendering.
const fs = require('fs');
const path = require('path');
const { parse, trova, testo, classi, serializzaFigli } = require('./html-parse');
const { risolviLink } = require('./html2elementor');

const root = path.resolve(__dirname, '..', '..');
const rev2 = root;
const out = path.join(root, 'tools', 'out', 'rev2');
fs.mkdirSync(out, { recursive: true });
const avvisi = [];

const dec = (s) => (s || '').replace(/&amp;/g, '&').replace(/&#x27;|&#39;|&apos;/g, "'").replace(/&quot;/g, '"').replace(/&nbsp;/g, ' ').replace(/&rsquo;/g, '’').replace(/&egrave;/g, 'è').replace(/&agrave;/g, 'à').replace(/&ugrave;/g, 'ù').replace(/&ograve;/g, 'ò').replace(/&igrave;/g, 'ì').replace(/&eacute;/g, 'é').replace(/&middot;/g, '·').replace(/&mdash;/g, '—').replace(/&ndash;/g, '–').replace(/&hellip;/g, '…');
const pulisci = (s) => dec(s).replace(/\s+/g, ' ').trim();
const T = (n) => (n ? pulisci(testo(n)) : '');
const carica = (f) => parse(fs.readFileSync(path.join(rev2, f), 'utf8')).radice;
const uno = (n, fn) => (n ? trova(n, fn)[0] || null : null);
const tutti = (n, fn) => (n ? trova(n, fn) : []);
const tag = (t) => (n) => n.tag === t;
const cl = (c) => (n) => classi(n).includes(c);
const meta = (dom, nome) => { const m = uno(dom, (n) => n.tag === 'meta' && n.attr.name === nome); return m ? dec(m.attr.content || '') : ''; };
const titoloPagina = (dom) => T(uno(dom, tag('title')));
// HTML interno con i link rev2 riscritti come permalink WordPress (stessa mappa del convertitore: mappa-link.json)
function htmlWp(n, file) {
  const raw = dec(serializzaFigli(n)).replace(/\s+/g, ' ').trim();
  return raw.replace(/href="([^"]*)"/g, (m, h) => `href="${risolviLink(h, '', file, avvisi)}"`);
}
const slugDa = (href, pref) => href.replace(/\.html$/, '').replace(new RegExp('^' + pref), '');

// ---- settori e categorie (pagine settore + archivio) ---------------------------------------------------------------
const SETTORI = [
  { codice: 'uffici', file: 'arredamento-ufficio.html' }, { codice: 'retail', file: 'arredo-negozi.html' },
  { codice: 'bar-ristoranti', file: 'arredamento-bar-ristoranti.html' }, { codice: 'food', file: 'arredo-negozi-food.html' },
  { codice: 'hospitality', file: 'arredamento-hotel.html' },
];
const archivioDom = carica('realizzazioni.html');
const tabs = tutti(archivioDom, cl('settori-tabs__btn')).map((b) => ({ codice: b.attr['data-settore-key'] || '', nome: T(b) })).filter((t) => t.codice);
const filtriArchivio = {};        // codice settore -> [{slug, nome}]
for (const g of tutti(archivioDom, (n) => n.attr['data-categorie'] !== undefined)) {
  filtriArchivio[g.attr['data-categorie']] = tutti(g, cl('filtro')).map((b) => ({ slug: b.attr['data-categoria'] || '', nome: T(b) })).filter((c) => c.slug);
}
const settori = SETTORI.map((s, i) => {
  const dom = carica(s.file);
  const nome = (tabs.find((t) => t.codice === s.codice) || {}).nome;
  const categorie = tutti(dom, (n) => n.tag === 'article' && classi(n).includes('categoria')).map((c, k) => {
    const h3 = uno(c, tag('h3')); const a = uno(h3, tag('a')); const m = a ? /categoria=([^"&]+)/.exec(a.attr.href) : null;
    const tip = uno(c, cl('categoria__tip')); const lab = uno(tip, tag('span'));
    const nomeCat = T(h3);
    const filtro = (filtriArchivio[s.codice] || []).find((f) => f.nome === nomeCat);
    const slug = m ? m[1] : filtro ? filtro.slug : null;
    return { nome: nomeCat, slug, conLink: !!a, tipologie: tip ? pulisci(testo(tip).replace(testo(lab), '')) : '', ordinePagina: k + 1, inFiltro: !!filtro, ordineFiltro: filtro ? (filtriArchivio[s.codice].indexOf(filtro) + 1) : 0 };
  });
  return { codice: s.codice, nome, file: s.file, ordine: i + 1, categorie };
});
// slug delle categorie senza link e senza filtro: derivato dal nome (come fa WordPress)
const { slugify } = require('./modello-dati');
for (const s of settori) for (const c of s.categorie) if (!c.slug) { c.slug = slugify(c.nome); c.slugDerivato = true; }
// i filtri dell'archivio devono essere un sottoinsieme delle categorie delle pagine settore
for (const [cod, lista] of Object.entries(filtriArchivio)) for (const f of lista) { const s = settori.find((x) => x.codice === cod); if (!s.categorie.some((c) => c.slug === f.slug)) avvisi.push(`filtro dell'archivio senza categoria nella pagina settore: ${cod}/${f.slug}`); }

// ---- archivio: ordine e card ----------------------------------------------------------------------------------------
const card = tutti(archivioDom, (n) => n.attr['data-key'] !== undefined).map((a, i) => ({
  ordine: i + 1, settore: a.attr['data-key'], categoria: a.attr['data-cat'], slug: slugDa(a.attr.href, 'realizzazione-'),
  nome: T(uno(a, cl('progetto__nome'))), luogo: T(uno(a, cl('progetto__luogo'))), categoriaNome: T(uno(a, cl('progetto__settore'))),
  img: (uno(a, tag('img')) || { attr: {} }).attr.src, alt: dec((uno(a, tag('img')) || { attr: {} }).attr.alt), larghezza: (classi(a).find((c) => /^progetto--w\d+$/.test(c)) || '').replace('progetto--', ''),
}));

// ---- home: progetti in evidenza --------------------------------------------------------------------------------------
const homeDom = carica('index.html');
const home = tutti(homeDom, (n) => n.tag === 'a' && classi(n).includes('progetto')).map((a, i) => ({
  ordine: i + 1, slug: slugDa(a.attr.href, 'realizzazione-'), larghezza: (classi(a).find((c) => /^progetto--w\d+$/.test(c)) || '').replace('progetto--', ''),
  luogo: T(uno(a, cl('progetto__luogo'))), categoriaNome: T(uno(a, cl('progetto__settore'))), alt: dec((uno(a, tag('img')) || { attr: {} }).attr.alt),
}));

// ---- realizzazioni --------------------------------------------------------------------------------------------------
function leggiRealizzazione(file) {
  const dom = carica(file); const main = uno(dom, tag('main'));
  const slug = slugDa(file, 'realizzazione-');
  const eyebrow = T(uno(main, cl('eyebrow')));
  const titolo = T(uno(main, tag('h1')));
  const kw = T(uno(main, cl('caso__kw')));
  const lead = uno(main, (n) => n.tag === 'p' && classi(n).includes('lead'));
  const facts = {}; for (const d of tutti(uno(main, cl('caso-facts')), tag('div'))) { const dt = uno(d, tag('dt')), dd = uno(d, tag('dd')); if (dt && dd) facts[T(dt)] = T(dd); }
  const specs = {}; const specsHtml = {};
  for (const s of tutti(uno(main, cl('specs__list')), cl('spec'))) { const dd = uno(s, tag('dd')); const k = T(uno(s, tag('dt'))); specs[k] = T(dd); specsHtml[k] = htmlWp(dd, file); }
  const brandLink = tutti(uno(main, cl('specs__list')), (n) => n.tag === 'a' && /^brand-/.test(n.attr.href || '')).map((a) => slugDa(a.attr.href, 'brand-'));
  const catLink = uno(uno(main, cl('specs__list')), (n) => n.tag === 'a' && /categoria=/.test(n.attr.href || ''));
  const mc = catLink ? /settore=([^&]+)&amp;categoria=([^"&]+)/.exec(catLink.attr.href) : null;
  const prose = uno(main, cl('prose'));
  const par = prose ? prose.figli.filter((n) => n.tipo === 'el' && n.tag === 'p') : [];
  const ultimo = par[par.length - 1];
  const linkSettore = ultimo && classi(uno(ultimo, tag('a')) || { attr: {} }).includes('link-rule') ? T(ultimo) : null;
  const descrizione = par.filter((p) => p !== ultimo || !linkSettore).map((p) => ({ lead: classi(p).includes('prose__lead'), html: htmlWp(p, file), testo: T(p) }));
  const galleria = tutti(main, cl('caso-gallery__item')).map((a, i, arr) => { const img = uno(a, tag('img')); return { src: a.attr.href, alt: dec(img ? img.attr.alt : ''), didascalia: dec(a.attr['data-caption'] || ''), nascosta: a.attr.hidden !== undefined, indice: i + 1, totale: arr.length }; });
  const correlate = tutti(uno(main, cl('correlate__grid')), tag('a')).map((a) => slugDa(a.attr.href, 'realizzazione-'));
  const r = {
    file, slug, titolo, eyebrow, kw, introduzione: T(lead), localita: facts['Località'] || '', tipologia: facts['Tipologia'] || '',
    progettista: facts['Progetto'] || specs['Progettista'] || null,
    settore: mc ? mc[1] : null, categoria: mc ? mc[2] : null, categoriaNome: specs['Categoria'] || '',
    brandForniture: specs['Brand e forniture'] ? { html: specsHtml['Brand e forniture'], testo: specs['Brand e forniture'], brand: brandLink } : null,
    descrizione, linkSettore, galleria, correlate, specEtichette: Object.keys(specs),
    seo: { titolo: titoloPagina(dom), descrizione: meta(dom, 'description') },
  };
  // controlli di coerenza (regole derivate)
  const ctl = (ok, msg) => { if (!ok) avvisi.push(`${slug}: ${msg}`); };
  ctl(r.seo.titolo === `${kw}: ${titolo} — Artes`, `titolo SEO non derivabile: "${r.seo.titolo}"`);
  ctl(r.seo.descrizione === `${titolo}, ${r.localita}: ${r.introduzione}`, `descrizione SEO non derivabile: "${r.seo.descrizione}"`);
  ctl(r.galleria.every((g) => g.didascalia === `${titolo} — foto ${g.indice} di ${g.totale}`), 'didascalie della galleria non derivabili');
  ctl(r.galleria.filter((g) => !g.nascosta).length === Math.min(5, r.galleria.length), 'immagini visibili in galleria diverse da min(5, totale)');
  ctl(!!r.progettista === (facts['Progetto'] !== undefined && specs['Progettista'] !== undefined) || !r.progettista, 'progettista incoerente tra riepilogo e scheda');
  return r;
}
const files = fs.readdirSync(rev2).filter((n) => n.endsWith('.html'));
const realizzazioni = files.filter((f) => f.startsWith('realizzazione-')).map(leggiRealizzazione);
for (const r of realizzazioni) {
  const c = card.find((x) => x.slug === r.slug); r.ordine = c ? c.ordine : null; r.cardAlt = c ? c.alt : null; r.cardImg = c ? c.img : null; r.cardLuogo = c ? c.luogo : null; r.larghezzaArchivio = c ? c.larghezza : null;
  r.settoreArchivio = c ? c.settore : null; r.categoriaArchivio = c ? c.categoria : null;
  const h = home.find((x) => x.slug === r.slug); r.home = h ? { ordine: h.ordine, larghezza: h.larghezza } : null;
  if (c && (c.settore !== r.settore || c.categoria !== r.categoria)) avvisi.push(`${r.slug}: settore/categoria della scheda (${r.settore}/${r.categoria}) diversi dall'archivio (${c.settore}/${c.categoria})`);
  if (c && c.luogo !== r.localita) avvisi.push(`${r.slug}: località della scheda "${r.localita}" ≠ card "${c.luogo}"`);
  if (c && c.img !== r.galleria[0].src) avvisi.push(`${r.slug}: immagine della card (${c.img}) ≠ prima foto della galleria (${r.galleria[0].src})`);
}
realizzazioni.sort((a, b) => a.ordine - b.ordine);
// regola delle "altre realizzazioni": le prime 3 dello stesso settore, in ordine d'archivio, esclusa la corrente
for (const r of realizzazioni) {
  const attese = realizzazioni.filter((x) => x.settore === r.settore && x.slug !== r.slug).slice(0, 3).map((x) => x.slug);
  if (attese.join() !== r.correlate.join()) avvisi.push(`${r.slug}: correlate (${r.correlate.join(',') || '-'}) diverse dalla regola "prime 3 del settore" (${attese.join(',') || '-'})`);
}

// ---- brand -----------------------------------------------------------------------------------------------------------
const brandDom = carica('brand-partner.html');
const brandArch = tutti(brandDom, (n) => n.tag === 'a' && classi(n).includes('brand')).map((a, i) => ({ ordine: i + 1, slug: slugDa(a.attr.href, 'brand-'), nome: T(uno(a, cl('brand__n'))), categoria: T(uno(a, cl('brand__c'))) }));
const categorieBrand = [...new Set(tutti(brandDom, (n) => n.tag === 'button' && classi(n).includes('filtro')).map((b) => T(b)).filter((n) => n !== 'Tutti'))].map((nome, i) => ({ nome, ordine: i + 1, slug: slugify(nome) }));
function leggiBrand(file) {
  const dom = carica(file); const main = uno(dom, tag('main'));
  const slug = slugDa(file, 'brand-');
  const titolo = T(uno(main, tag('h1')));
  const eyebrow = T(uno(main, cl('eyebrow')));
  const lead = uno(main, (n) => n.tag === 'p' && classi(n).includes('lead'));
  const specs = {}; const specsHtml = {};
  for (const s of tutti(uno(main, cl('specs__list')), cl('spec'))) { const dd = uno(s, tag('dd')); const k = T(uno(s, tag('dt'))); specs[k] = T(dd); specsHtml[k] = htmlWp(dd, file); }
  const prose = uno(main, cl('prose'));
  const figli = prose ? prose.figli.filter((n) => n.tipo === 'el') : [];
  const sezioni = []; let corrente = null;
  for (const f of figli) { if (f.tag === 'h2') { corrente = { titolo: T(f), paragrafi: [] }; sezioni.push(corrente); } else if (f.tag === 'p' && corrente) corrente.paragrafi.push({ html: htmlWp(f, file), testo: T(f) }); }
  const slide = uno(main, cl('produzione-slide')); const img = slide ? uno(slide, tag('img')) : null;
  const corr = tutti(uno(main, cl('correlate__grid')), tag('a')).map((a) => slugDa(a.attr.href, 'realizzazione-'));
  const cta = uno(main, cl('cta-band'));
  const arch = brandArch.find((b) => b.slug === slug);
  const b = {
    file, slug, titolo, ordine: arch ? arch.ordine : null, categoria: specs['Categoria'] || '', categoriaArchivio: arch ? arch.categoria : null,
    introduzione: htmlWp(lead, file), introduzioneTesto: T(lead), settoriArtes: { html: specsHtml['Settori Artes'], testo: specs['Settori Artes'] },
    fornituraArtes: specs['Fornitura Artes'] || '', assistenza: specs['Assistenza'] || '',
    sezioni, foto: img ? { src: img.attr.src, alt: dec(img.attr.alt) } : null, progetti: corr, titoloCorrelate: T(uno(uno(main, cl('correlate')), tag('h2'))),
    ctaTitolo: T(uno(cta, tag('h2'))), seo: { titolo: titoloPagina(dom), descrizione: meta(dom, 'description') },
  };
  const ctl = (ok, msg) => { if (!ok) avvisi.push(`brand ${slug}: ${msg}`); };
  ctl(b.titolo === (arch || {}).nome, `titolo "${b.titolo}" ≠ archivio "${(arch || {}).nome}"`);
  ctl(`Brand partner — ${b.categoria}` === eyebrow, `eyebrow "${eyebrow}" ≠ "Brand partner — ${b.categoria}"`);
  ctl(b.categoria === b.categoriaArchivio, `categoria della scheda "${b.categoria}" ≠ archivio "${b.categoriaArchivio}"`);
  ctl(sezioni.length === 2 && sezioni[0].titolo === `Come lavoriamo con ${titolo}` && sezioni[1].titolo === 'Dove lo usiamo', 'struttura delle sezioni di testo diversa dall\'attesa');
  ctl(sezioni.length === 2 && sezioni[0].paragrafi.length === 1 && sezioni[1].paragrafi.length === 2, 'numero di paragrafi per sezione diverso dall\'atteso (1 + 2)');
  return b;
}
const brand = files.filter((f) => /^brand-.+\.html$/.test(f) && f !== 'brand-partner.html').map(leggiBrand).sort((a, b) => a.ordine - b.ordine);
// il paragrafo di chiusura è uguale per tutti? (allora è testo del modello, non dato)
const chiusure = new Set(brand.map((b) => b.sezioni[1].paragrafi[1].testo));
if (chiusure.size !== 1) avvisi.push(`paragrafo di chiusura dei brand non uniforme (${chiusure.size} varianti)`);
const fornitureDistinte = new Set(brand.map((b) => b.fornituraArtes)); const assistenzeDistinte = new Set(brand.map((b) => b.assistenza));
// relazione brand ↔ progetti: dal lato brand (correlate) e dal lato progetto ("Brand e forniture" con link)
const relBrand = new Set(); for (const b of brand) for (const p of b.progetti) relBrand.add(`${p}|${b.slug}`);
const relProgetto = new Set(); for (const r of realizzazioni) if (r.brandForniture) for (const bs of r.brandForniture.brand) relProgetto.add(`${r.slug}|${bs}`);
for (const k of relBrand) if (!relProgetto.has(k)) avvisi.push(`relazione ${k} presente nella scheda brand ma non in "Brand e forniture" del progetto`);
for (const k of relProgetto) if (!relBrand.has(k)) avvisi.push(`relazione ${k} presente in "Brand e forniture" del progetto ma non nella scheda brand`);

const dati = { settori, filtriArchivio, card, home, realizzazioni, brand, categorieBrand, relazioni: [...relBrand].map((k) => k.split('|')), chiusuraBrand: [...chiusure][0], fornitura: [...fornitureDistinte], assistenza: [...assistenzeDistinte] };
fs.writeFileSync(path.join(out, 'dati-rev2.json'), JSON.stringify(dati, null, 1));

console.log(`settori ${settori.length}; categorie ${settori.reduce((n, s) => n + s.categorie.length, 0)} (in filtro ${settori.reduce((n, s) => n + s.categorie.filter((c) => c.inFiltro).length, 0)}); realizzazioni ${realizzazioni.length}; brand ${brand.length}; categorie brand ${categorieBrand.length}; relazioni ${dati.relazioni.length}`);
console.log('forniture distinte:', fornitureDistinte.size, '| assistenze distinte:', assistenzeDistinte.size);
console.log('home:', home.map((h) => `${h.ordine}:${h.slug}(${h.larghezza})`).join(' '));
console.log('progettisti:', realizzazioni.filter((r) => r.progettista).map((r) => `${r.slug}="${r.progettista}"`).join(' | '));
console.log('paragrafi descrizione per progetto:', realizzazioni.map((r) => `${r.slug}:${r.descrizione.length}`).join(' '));
console.log(`\nAVVISI (${avvisi.length}):`); [...new Set(avvisi)].forEach((a) => console.log('  - ' + a));
