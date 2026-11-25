// Estrae il contenuto della home del mockup in tools/out/home.json. Uso: node tools/extract-home.js <cartella> <out.json>
const fs = require('fs'); const path = require('path');
const root = process.argv[2]; const out = process.argv[3];
const dec = (s) => s.replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').replace(/&#39;|&apos;/g, "'").replace(/&quot;/g, '"');
const inner = (s) => dec((s || '').replace(/\s+/g, ' ').trim());
const text = (s) => dec((s || '').replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim());
const m1 = (h, re) => { const x = h.match(re); return x ? x[1] : null; };
const all = (h, re) => [...h.matchAll(re)];
const h = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const main = h.match(/<main>([\s\S]*)<\/main>/)[1];
const sec = (cls) => (main.match(new RegExp('<section class="' + cls + '[^"]*"[^>]*>([\\s\\S]*?)</section>')) || [])[1] || '';

const hero = sec('hero');
const metodo = sec('metodo');
const settori = main.match(/<section class="section bg-alt">([\s\S]*?)<\/section>/)[1];
const produzione = sec('produzione');
const realizz = sec('section realizzazioni');
const brands = sec('brands-section');
const duo = sec('cta-duo');

const res = {
  hero: {
    img: { src: m1(hero, /<img class="hero__texture" src="([^"]+)"/), alt: dec(m1(hero, /<img class="hero__texture"[^>]*alt="([^"]*)"/)) },
    kicker: text(m1(hero, /<span class="lbl">([\s\S]*?)<\/span>/)),
    h1: inner(m1(hero, /<h1 class="hero__title">([\s\S]*?)<\/h1>/)),
    lead: text(m1(hero, /<p class="hero__lead">([\s\S]*?)<\/p>/)),
    bottoni: all(hero, /<a href="([^"]*)" class="btn[^"]*">([\s\S]*?)<\/a>/g).map((b) => ({ href: b[1], testo: text(b[2]) })),
    stat: all(hero, /<div class="stat"><div class="stat__k">([\s\S]*?)<\/div><div class="stat__v">([\s\S]*?)<\/div>/g).map((s) => ({ k: text(s[1]), v: text(s[2]) })),
  },
  metodo: {
    eyebrow: text(m1(metodo, /<div class="eyebrow">([\s\S]*?)<\/div>/)), titolo: inner(m1(metodo, /<h2 class="h-section">([\s\S]*?)<\/h2>/)), lead: text(m1(metodo, /<p class="lead">([\s\S]*?)<\/p>/)),
    link: { testo: text(m1(metodo, /<a href="[^"]*" class="link-rule">([\s\S]*?)<\/a>/)), href: m1(metodo, /<a href="([^"]*)" class="link-rule">/) },
    fasi: all(metodo, /<div class="fase"><h3>([\s\S]*?)<\/h3><p>([\s\S]*?)<\/p><\/div>/g).map((f) => ({ t: text(f[1]), d: text(f[2]) })),
    scura: { n: text(m1(metodo, /<span class="fase__n">([\s\S]*?)<\/span>/)), t: inner(m1(metodo, /<strong>([\s\S]*?)<\/strong>/)), l: text(m1(metodo, /<span class="lbl">([\s\S]*?)<\/span>\s*<\/div>\s*<\/div>/)) },
  },
  settori: {
    eyebrow: text(m1(settori, /<div class="eyebrow">([\s\S]*?)<\/div>/)), titolo: inner(m1(settori, /<h2 class="h-section">([\s\S]*?)<\/h2>/)),
    tile: all(settori, /<a class="tile( tile--tall)?" href="([^"]*)">\s*<img class="tile__texture" src="([^"]+)" alt="([^"]*)">[\s\S]*?<h3>([\s\S]*?)<\/h3><p>([\s\S]*?)<\/p>/g).map((t) => ({ alta: !!t[1], href: t[2], img: { src: t[3], alt: dec(t[4]) }, t: text(t[5]), d: text(t[6]) })),
  },
  produzione: {
    eyebrow: text(m1(produzione, /<div class="eyebrow">([\s\S]*?)<\/div>/)), titolo: inner(m1(produzione, /<h2 class="h-section">([\s\S]*?)<\/h2>/)), lead: text(m1(produzione, /<p class="lead">([\s\S]*?)<\/p>/)),
    lavorazioni: all(produzione, /<div class="lavorazione__t">([\s\S]*?)<\/div>\s*<div class="lavorazione__d">([\s\S]*?)<\/div>/g).map((l) => ({ t: text(l[1]), d: text(l[2]) })),
    link: { testo: text(m1(produzione, /<a href="[^"]*" class="link-rule">([\s\S]*?)<\/a>/)), href: m1(produzione, /<a href="([^"]*)" class="link-rule">/) },
    immagini: all(produzione, /<div class="produzione-slide[^"]*"[^>]*>\s*<img src="([^"]+)" alt="([^"]*)"/g).map((i) => ({ src: i[1], alt: dec(i[2]) })),
  },
  realizzazioni: { eyebrow: text(m1(realizz, /<div class="eyebrow">([\s\S]*?)<\/div>/)), titolo: inner(m1(realizz, /<h2 class="h-section">([\s\S]*?)<\/h2>/)), piu: { testo: text(m1(realizz, /<div class="section__more">\s*<a [^>]*>([\s\S]*?)<\/a>/)), href: m1(realizz, /<div class="section__more">\s*<a href="([^"]*)"/) } },
  brands: { eyebrow: text(m1(brands, /<div class="eyebrow"[^>]*>([\s\S]*?)<\/div>/)), lead: text(m1(brands, /<p>([\s\S]*?)<\/p>/)), link: { testo: text(m1(brands, /<a href="[^"]*" class="link-rule">([\s\S]*?)<\/a>/)), href: m1(brands, /<a href="([^"]*)" class="link-rule">/) } },
  duo: all(duo, /<div class="cta-panel cta-panel--(dark|red)">[\s\S]*?<span class="lbl">([\s\S]*?)<\/span>\s*<h2>([\s\S]*?)<\/h2>\s*<p>([\s\S]*?)<\/p>[\s\S]*?<a href="([^"]*)" class="btn[^"]*">([\s\S]*?)<\/a>/g).map((p) => ({ variante: p[1], lbl: text(p[2]), h2: inner(p[3]), p: text(p[4]), href: p[5], testo: text(p[6]) })),
};
fs.writeFileSync(out, JSON.stringify(res, null, 2), 'utf8');
console.log(`home -> ${out} | stat ${res.hero.stat.length}, fasi ${res.metodo.fasi.length}, tile ${res.settori.tile.length}, lavorazioni ${res.produzione.lavorazioni.length}, immagini produzione ${res.produzione.immagini.length}, duo ${res.duo.length}`);
