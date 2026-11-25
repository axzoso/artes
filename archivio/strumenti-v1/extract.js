// Estrae i dati strutturati dalle schede realizzazione-*.html del mockup.
const fs = require('fs');
const path = require('path');
const root = process.argv[2];
const strip = s => s.replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').replace(/&#39;|&apos;/g, "'").replace(/\s+/g, ' ').trim();
const out = [];
for (const f of fs.readdirSync(root).filter(n => /^realizzazione-.+\.html$/.test(n)).sort()) {
  const h = fs.readFileSync(path.join(root, f), 'utf8');
  const m = (re) => { const x = h.match(re); return x ? x[1] : null; };
  const eyebrow = strip(m(/<div class="eyebrow">([\s\S]*?)<\/div>/) || '');
  const [settore, ...rest] = eyebrow.split(' — ');
  const specs = {};
  for (const s of h.matchAll(/<div class="spec"><dt>([\s\S]*?)<\/dt><dd>([\s\S]*?)<\/dd><\/div>/g)) specs[strip(s[1])] = strip(s[2]);
  const hero = h.match(/<div class="scheda__hero">\s*<img src="([^"]+)" alt="([^"]*)"/);
  const gallery = [...h.matchAll(/<div class="ph ph--soft"><img src="([^"]+)" alt="([^"]*)"/g)].map(g => ({ src: g[1], alt: strip(g[2]) }));
  const brandsBlock = m(/<div class="brands-mini">([\s\S]*?)<\/div>/);
  const brands = brandsBlock ? [...brandsBlock.matchAll(/<a [^>]*>([\s\S]*?)<\/a>/g)].map(b => strip(b[1])) : [];
  out.push({
    file: f,
    slug: f.replace(/^realizzazione-/, '').replace(/\.html$/, ''),
    title: strip(m(/<h1 class="scheda__title">([\s\S]*?)<\/h1>/) || ''),
    settore: settore,
    ambito: rest.join(' — ') || null,
    intro: strip(m(/<p class="lead">([\s\S]*?)<\/p>/) || ''),
    metaDescription: m(/<meta name="description" content="([^"]*)"/),
    hero: hero ? { src: hero[1], alt: strip(hero[2]) } : null,
    gallery,
    specs,
    brands,
  });
}
fs.writeFileSync(process.argv[3], JSON.stringify(out, null, 2), 'utf8');
console.log(out.length + ' schede');

