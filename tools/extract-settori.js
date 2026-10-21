// Estrae il contenuto delle 5 pagine settore del mockup (stessa struttura) in tools/out/settori.json.
// Uso: node tools/extract-settori.js <cartella-mockup> <out.json>
const fs = require('fs'); const path = require('path');
const root = process.argv[2]; const out = process.argv[3];
const dec = (s) => s.replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').replace(/&#39;|&apos;/g, "'").replace(/&quot;/g, '"');
const inner = (s) => dec(s.replace(/\s+/g, ' ').trim());               // conserva <br> e <strong>
const text = (s) => dec(s.replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim());
const m1 = (h, re) => { const x = h.match(re); return x ? x[1] : null; };
const files = {
  uffici: ['arredamento-ufficio.html', '01', 'arredo-uffici-workspace'],
  negozi: ['arredo-negozi.html', '02', 'arredo-negozi-retail'],
  food: ['arredo-negozi-food.html', '03', 'arredo-negozi-food'],
  bar: ['arredamento-bar-ristoranti.html', '04', 'arredo-bar-ristoranti'],
  hotel: ['arredamento-hotel.html', '05', 'arredo-hotel-hospitality'],
};
const res = {};
for (const [key, [file, num, termSlug]] of Object.entries(files)) {
  const h = fs.readFileSync(path.join(root, file), 'utf8');
  const main = h.match(/<main>([\s\S]*)<\/main>/)[1];
  const intro = main.match(/<section class="page-intro">([\s\S]*?)<\/section>/)[1];
  const band = main.match(/<div class="page-band">\s*<img src="([^"]+)" alt="([^"]*)"/);
  // sezioni "section" (la prima è "Il settore", la seconda "Realizzazioni")
  const secs = [...main.matchAll(/<section class="section">([\s\S]*?)<\/section>/g)].map((m) => m[1]);
  const head = (s) => ({ eyebrow: text(m1(s, /<div class="eyebrow">([\s\S]*?)<\/div>/) || ''), titolo: inner(m1(s, /<h2 class="h-section">([\s\S]*?)<\/h2>/) || ''), lead: text(m1(s, /<p class="lead">([\s\S]*?)<\/p>/) || '') });
  const cards = [...secs[0].matchAll(/<div class="card">\s*<div class="card__n">([\s\S]*?)<\/div>\s*<div class="card__t">([\s\S]*?)<\/div>\s*<div class="card__d">([\s\S]*?)<\/div>/g)].map((c) => ({ n: text(c[1]), t: text(c[2]), d: text(c[3]) }));
  const set = main.match(/<section class="settore([^"]*)"[^>]*>([\s\S]*?)<\/section>/);
  const media = [...set[2].matchAll(/<img src="([^"]+)" alt="([^"]*)"/g)].map((i) => ({ src: i[1], alt: dec(i[2]) }));
  const cta = main.match(/<section class="cta-band">([\s\S]*?)<\/section>/)[1];
  res[key] = {
    file, numero: num, termine: termSlug,
    intro: { eyebrow: text(m1(intro, /<div class="eyebrow">([\s\S]*?)<\/div>/)), h1: inner(m1(intro, /<h1 class="page-title">([\s\S]*?)<\/h1>/)), lead: text(m1(intro, /<p class="lead">([\s\S]*?)<\/p>/)) },
    banda: { src: band[1], alt: dec(band[2]) },
    settore: { ...head(secs[0]), cards },
    ambiti: { flip: /settore--flip/.test(set[1]), alt: /bg-alt/.test(set[1]), eyebrow: text(m1(set[2], /<div class="eyebrow">([\s\S]*?)<\/div>/)), voci: [...set[2].matchAll(/<li><span>([\s\S]*?)<\/span><\/li>/g)].map((x) => text(x[1])), link: { testo: text(m1(set[2], /<a href="[^"]*" class="link-rule">([\s\S]*?)<\/a>/)), href: m1(set[2], /<a href="([^"]*)" class="link-rule">/) }, immagine: media[0], inset: media[1] },
    progetti: { ...head(secs[1]), piu: { testo: text(m1(secs[1], /<div class="section__more">\s*<a [^>]*>([\s\S]*?)<\/a>/)), href: m1(secs[1], /<div class="section__more">\s*<a href="([^"]*)"/) } },
    cta: { titolo: inner(m1(cta, /<h2>([\s\S]*?)<\/h2>/)), bottoni: [...cta.matchAll(/<a href="([^"]*)" class="btn[^"]*">([\s\S]*?)<\/a>/g)].map((b) => ({ href: dec(b[1]), testo: text(b[2]) })) },
  };
}
fs.writeFileSync(out, JSON.stringify(res, null, 2), 'utf8');
console.log(`${Object.keys(res).length} pagine settore -> ${out}`);
