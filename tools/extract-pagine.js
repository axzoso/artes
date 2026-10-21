// Legge le pagine istituzionali del mockup con un piccolo parser HTML (nessuna dipendenza) e produce una
// lista normalizzata di blocchi per pagina in tools/out/pagine.json.
// Uso: node tools/extract-pagine.js <cartella-mockup> <out.json> [file.html ...]
const fs = require('fs'); const path = require('path');
const root = process.argv[2]; const out = process.argv[3];
const files = process.argv.slice(4).length ? process.argv.slice(4) : ['chi-siamo.html', 'contract.html', 'arredamento-su-misura.html', 'area-progettisti.html'];

// --- mini parser --------------------------------------------------------------------------------------
const VOID = new Set(['img', 'br', 'hr', 'input', 'meta', 'link', 'source', 'wbr']);
const dec = (s) => s.replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').replace(/&#39;|&apos;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
function parse(html) {
  html = html.replace(/<!--[\s\S]*?-->/g, '').replace(/<script[\s\S]*?<\/script>/g, '').replace(/<style[\s\S]*?<\/style>/g, '');
  const root = { tag: '#root', attrs: {}, children: [] }; const stack = [root];
  const re = /<(\/?)([a-zA-Z][\w-]*)((?:\s+[^>]*?)?)\s*(\/?)>|([^<]+)/g; let m;
  while ((m = re.exec(html))) {
    if (m[5] !== undefined) { const t = m[5]; if (t.trim() || stack[stack.length - 1].tag !== '#root') stack[stack.length - 1].children.push({ tag: '#text', text: t }); continue; }
    const [, close, tag0, attrStr, selfClose] = m; const tag = tag0.toLowerCase();
    if (close) { for (let i = stack.length - 1; i > 0; i--) if (stack[i].tag === tag) { stack.length = i; break; } continue; }
    const attrs = {}; for (const a of attrStr.matchAll(/([\w:-]+)(?:="([^"]*)"|='([^']*)')?/g)) attrs[a[1]] = dec(a[2] ?? a[3] ?? '');
    const node = { tag, attrs, children: [] }; stack[stack.length - 1].children.push(node);
    if (!VOID.has(tag) && !selfClose) stack.push(node);
  }
  return root;
}
const classes = (n) => (n.attrs && n.attrs.class ? n.attrs.class.split(/\s+/) : []);
const has = (n, c) => classes(n).includes(c);
const kids = (n) => (n.children || []).filter((c) => c.tag !== '#text');
const walk = (n, fn) => { fn(n); (n.children || []).forEach((c) => walk(c, fn)); };
const find = (n, pred) => { let r = null; walk(n, (x) => { if (!r && x.tag !== '#text' && pred(x)) r = x; }); return r; };
const findAll = (n, pred) => { const r = []; walk(n, (x) => { if (x.tag !== '#text' && pred(x)) r.push(x); }); return r; };
const byClass = (n, c) => find(n, (x) => has(x, c));
const allByClass = (n, c) => findAll(n, (x) => has(x, c));
function rawText(n) { return n.tag === '#text' ? n.text : (n.children || []).map(rawText).join(''); }
const text = (n) => (n ? dec(rawText(n).replace(/\s+/g, ' ').trim()) : '');
function inner(n) { // HTML interno con solo <br> e <strong> (usati nei titoli)
  if (!n) return '';
  const f = (x) => x.tag === '#text' ? x.text : x.tag === 'br' ? '<br>' : x.tag === 'strong' ? '<strong>' + (x.children || []).map(f).join('') + '</strong>' : x.tag === 'a' ? '<a href="' + (x.attrs.href || '#') + '">' + (x.children || []).map(f).join('') + '</a>' : (x.children || []).map(f).join('');
  return dec(n.children.map(f).join('').replace(/\s+/g, ' ').trim());
}
const img = (n) => { const i = n && find(n, (x) => x.tag === 'img'); return i ? { src: i.attrs.src, alt: i.attrs.alt || '' } : null; };

// --- estrazione blocchi --------------------------------------------------------------------------------
function card(c) {
  const lista = byClass(c, 'card__list');
  return { n: text(byClass(c, 'card__n')), t: text(byClass(c, 'card__t')), d: inner(byClass(c, 'card__d')), lista: lista ? kids(lista).map(text) : [], href: c.tag === 'a' ? c.attrs.href : null, scura: has(c, 'card--dark'), grande: has(c, 'card--lg'), span2: has(c, 'card--span2') };
}
function griglia(g) { return { tipo: 'schede', colonne: has(g, 'grid-1px--2') ? 2 : has(g, 'grid-1px--4') ? 4 : 3, schede: kids(g).filter((c) => has(c, 'card')).map(card) }; }
function testa(sec) {
  const h = byClass(sec, 'section__head'); if (!h) return null;
  const link = find(h, (x) => x.tag === 'a' && has(x, 'link-rule'));
  return { eyebrow: text(byClass(h, 'eyebrow')), titolo: inner(byClass(h, 'h-section')), lead: text(byClass(h, 'lead')), link: link ? { testo: text(link), href: link.attrs.href } : null };
}
function specifiche(sp) {
  const specs = byClass(sp, 'specs'), fin = byClass(sp, 'finiture');
  const dx = fin ? { eyebrow: text(byClass(fin, 'eyebrow')), lead: text(byClass(fin, 'lead')), griglia: byClass(fin, 'grid-1px') ? griglia(byClass(fin, 'grid-1px')) : null, link: (() => { const l = find(fin, (x) => x.tag === 'a' && has(x, 'link-rule')); return l ? { testo: text(l), href: l.attrs.href } : null; })() } : null;
  return { tipo: 'specifiche', eyebrow: text(byClass(specs, 'eyebrow')), righe: allByClass(specs, 'spec').map((s) => ({ dt: text(find(s, (x) => x.tag === 'dt')), dd: text(find(s, (x) => x.tag === 'dd')) })), destra: dx };
}
function sezione(sec) {
  const cls = classes(sec); const b = { tipo: 'sezione', stretta: cls.includes('section--tight'), alt: cls.includes('bg-alt'), testa: testa(sec), contenuto: [] };
  for (const c of kids(sec)) {
    if (has(c, 'grid-1px')) b.contenuto.push(griglia(c));
    else if (has(c, 'fasi-list')) b.contenuto.push({ tipo: 'fasi', righe: kids(c).map((r) => ({ t: text(byClass(r, 'fase-row__t')), d: text(byClass(r, 'fase-row__d')), out: (() => { const dl = byClass(r, 'fase-row__out'); const o = []; if (dl) { let dt = null; for (const x of kids(dl)) { if (x.tag === 'dt') dt = text(x); else if (x.tag === 'dd') o.push({ dt, dd: text(x) }); } } return o; })() })) });
    else if (has(c, 'materiali')) b.contenuto.push({ tipo: 'materiali', voci: kids(c).map((m) => ({ colore: (byClass(m, 'materiale__sw').attrs.style.match(/#[0-9a-fA-F]{3,6}/) || [''])[0], nome: text(byClass(m, 'materiale__n')), cat: text(byClass(m, 'materiale__c')) })) });
    else if (has(c, 'scheda__specs')) b.contenuto.push(specifiche(c));
  }
  return b;
}
function produzione(sec) {
  const t = byClass(sec, 'produzione__text'), m = byClass(sec, 'produzione__media');
  const g = byClass(t, 'grid-1px'); const l = find(t, (x) => x.tag === 'a' && has(x, 'link-rule'));
  const imgs = findAll(m, (x) => x.tag === 'img').map((i) => ({ src: i.attrs.src, alt: i.attrs.alt || '' }));
  return { tipo: 'produzione', eyebrow: text(byClass(t, 'eyebrow')), titolo: inner(byClass(t, 'h-section')), lead: text(byClass(t, 'lead')), griglia: g ? griglia(g) : null, link: l ? { testo: text(l), href: l.attrs.href } : null, immagini: imgs };
}
function cta(sec) { return { tipo: 'cta', titolo: inner(find(sec, (x) => x.tag === 'h2')), bottoni: findAll(sec, (x) => x.tag === 'a' && has(x, 'btn')).map((a) => ({ href: a.attrs.href, testo: text(a) })) }; }

const res = {};
for (const f of files) {
  const tree = parse(fs.readFileSync(path.join(root, f), 'utf8'));
  const main = find(tree, (x) => x.tag === 'main'); const blocchi = [];
  for (const c of kids(main)) {
    if (has(c, 'page-intro')) blocchi.push({ tipo: 'intro', eyebrow: text(byClass(c, 'eyebrow')), h1: inner(byClass(c, 'page-title')), lead: text(byClass(c, 'lead')), corrente: text(find(byClass(c, 'breadcrumb'), (x) => x.tag === 'strong')) });
    else if (has(c, 'page-band')) blocchi.push({ tipo: 'banda', img: img(c) });
    else if (has(c, 'produzione')) blocchi.push(produzione(c));
    else if (has(c, 'cta-band')) blocchi.push(cta(c));
    else if (has(c, 'contatti')) {
      const cta = byClass(c, 'contatti__cta'); const cl = cta && find(cta, (x) => x.tag === 'a');
      const dl = byClass(c, 'contatti__diretti');
      blocchi.push({ tipo: 'modulo', alt: has(c, 'bg-alt'), ancora: c.attrs.id || '', eyebrow: text(byClass(c, 'eyebrow')), titolo: inner(byClass(c, 'h-section')), lead: text(byClass(c, 'lead')), link: cl ? { testo: text(cl), href: cl.attrs.href } : null,
        dati: dl ? kids(dl).map((r) => { const a = find(r, (x) => x.tag === 'a'); return { dt: text(find(r, (x) => x.tag === 'dt')), dd: text(find(r, (x) => x.tag === 'dd')), link: a ? { testo: text(a), href: a.attrs.href } : null }; }) : [] });
    }
    else if (has(c, 'mappa')) { const fr = find(c, (x) => x.tag === 'iframe'); blocchi.push({ tipo: 'mappa', src: fr ? fr.attrs.src : '', titolo: fr ? fr.attrs.title : '' }); }
    else if (c.tag === 'section' && has(c, 'section')) blocchi.push(sezione(c));
    else blocchi.push({ tipo: 'NON_GESTITO', classe: classes(c).join(' ') });
  }
  res[f.replace(/\.html$/, '')] = blocchi;
}
fs.writeFileSync(out, JSON.stringify(res, null, 2), 'utf8');
for (const [k, v] of Object.entries(res)) console.log(k.padEnd(28), v.map((b) => b.tipo + (b.contenuto ? '(' + b.contenuto.map((x) => x.tipo + (x.schede ? ':' + x.schede.length : x.righe ? ':' + x.righe.length : x.voci ? ':' + x.voci.length : '')).join(',') + ')' : '')).join(' > '));
