'use strict';
// Anteprima LOCALE dei template del blog (che su dev3 sono in bozza e senza articoli): prende i modelli tools/rev2/modelli/blog-*.html,
// li riempie con un articolo di esempio e li impagina con il CSS e i caratteri veri del plugin (artes-rev2.css, fonts/), dentro a
// <body class="rev2"><div class="elementor"> come su WordPress. Header e footer non sono inclusi.
//   node tools/rev2/anteprima-blog.js      -> tools/out/rev2/anteprima-blog/{articolo,archivio,archivio-vuoto}.html (+ screenshot 1440 e 390)
const fs = require('fs');
const path = require('path');
const { openBrowser } = require('./cdp-session');

const root = path.resolve(__dirname, '..', '..');
const out = path.join(root, 'tools', 'out', 'rev2', 'anteprima-blog');
fs.mkdirSync(out, { recursive: true });
const rel = (p) => path.relative(out, path.join(root, p)).split(path.sep).join('/');
const IMG = (n) => rel('assets/img/' + n);

const ARTICOLO = {
  breadcrumb: '<a href="#">Home</a> / <a href="#">Blog</a> / <strong>Banconi su misura: cinque scelte da fare prima del disegno</strong>',
  eyebrow: '18 novembre 2026 · Bar e ristoranti · 4 min di lettura',
  titolo: 'Banconi su misura: cinque scelte da fare prima del disegno',
  estratto: 'Un bancone è il pezzo che lavora di più in un locale. Ecco le decisioni che, se prese presto, evitano varianti costose in cantiere.',
  corpo: `<p>Il bancone è il cuore operativo di un bar: lì si prepara, si serve, si incassa. Prima di disegnarlo conviene fissare alcune scelte che condizionano tutto il resto.</p>
<h2>1. Il flusso di lavoro</h2><p>Quante persone ci lavorano nelle ore di punta, dove sta la macchina del caffè, dove arrivano i piatti dalla cucina. Il disegno parte da qui.</p>
<h2>2. Materiali che reggono l'uso</h2><ul><li>Piani in quarzo o in laminato HPL dove si lavora con liquidi e calore.</li><li>Frontali in legno trattato o in lamiera verniciata dove passano i clienti.</li><li>Zoccolature alte e lavabili.</li></ul>
<blockquote><p>Un bancone ben progettato si riconosce perché nessuno ci fa caso: tutto è dove deve essere.</p></blockquote>
<h2>3. Impianti e manutenzione</h2><p>Scarichi, prese e collegamenti vanno decisi prima della produzione, insieme all'accesso per la manutenzione. In falegnameria si prevedono pannelli ispezionabili.</p>
<figure><img src="${IMG('progetti/jumecitu/03.jpg')}" alt=""><figcaption>Jumecitu, Rogliano (CS): il bancone della pizzeria</figcaption></figure>
<p>Per un primo confronto puoi <a href="#">scriverci</a>: un tecnico guarda con te pianta e flussi.</p>`,
};
const CARD = [
  { img: IMG('progetti/soft-bar/01.jpg'), meta: '12 novembre 2026 · Bar e ristoranti · 3 min di lettura', titolo: 'Il lounge bar che cambia volto dal giorno alla sera', estratto: 'Luci, sedute e materiali per un locale che lavora dodici ore al giorno.' },
  { img: IMG('progetti/ruffolo-group/01.jpg'), meta: '5 novembre 2026 · Uffici e workspace · 5 min di lettura', titolo: 'Acustica in open space: cosa funziona davvero', estratto: 'Pannelli, pareti e cabine: come scegliere senza riempire l\'ufficio di soluzioni inutili.' },
  { img: null, meta: '28 ottobre 2026 · Falegnameria · 4 min di lettura', titolo: 'Laccato, impiallacciato o laminato? Guida rapida', estratto: 'Tre finiture, tre usi diversi: pro, contro e manutenzione.' },
  { img: IMG('progetti/sakuralab/01.jpg'), meta: '20 ottobre 2026 · Negozi food · 3 min di lettura', titolo: 'Un laboratorio di pasticceria a vista', estratto: 'Come abbiamo unito produzione e vendita in Sakuralab.' },
];

function riempiCard(htmlCard, c, conEstratto) {
  let h = htmlCard.replace(/data-dyn-href="url_post"/, '').replace(/<img data-dyn-src="card_immagine" alt="">/, c.img ? `<img src="${c.img}" alt="">` : '<img alt="">');
  h = h.replace(/(<div class="blog-card__meta")[^>]*>[^<]*</, `$1>${c.meta}<`).replace(/(<h[23] class="blog-card__titolo")[^>]*>[^<]*</, `$1>${c.titolo}<`);
  h = conEstratto ? h.replace(/(<p class="blog-card__estratto")[^>]*>[^<]*</, `$1>${c.estratto}<`) : h;
  return h;
}
function pagina(modello, { carte = 0, vuoto = false } = {}) {
  let h = fs.readFileSync(path.join(__dirname, 'modelli', modello), 'utf8');
  const main = h.slice(h.indexOf('<main'), h.indexOf('</main>') + 7);
  let m = main
    .replace(/(<div class="breadcrumb") data-dyn="breadcrumb">[^<]*</, `$1>${ARTICOLO.breadcrumb}<`)
    .replace(/(<div class="eyebrow") data-dyn="eyebrow_articolo">[^<]*</, `$1>${ARTICOLO.eyebrow}<`)
    .replace(/(<h1 class="blog__titolo") data-dyn="titolo">[^<]*</, `$1>${ARTICOLO.titolo}<`)
    .replace(/(<p class="lead") data-dyn="estratto">[^<]*</, `$1>${ARTICOLO.estratto}<`)
    .replace(/<img data-dyn-src="foto" alt="">/, `<img src="${IMG('progetti/jumecitu/01.jpg')}" alt="">`)
    .replace(/<div class="prose blog__contenuto"[^>]*>[\s\S]*?<\/div>/, `<div class="prose blog__contenuto">${ARTICOLO.corpo}</div>`)
    .replace(/ data-dyn-href="url_blog"/g, '').replace(/ data-opz(img)?/g, '');
  const g = m.match(/(<div class="blog__griglia" data-loop="[^"]+">)([\s\S]*?<\/a>)(<\/div>)/);
  const card = g[2];
  const lista = vuoto ? '' : CARD.slice(0, carte).map((c) => riempiCard(card, c, /blog-card__estratto/.test(card))).join('\n');
  m = m.replace(g[0], `<div class="blog__griglia">${lista}</div>`);
  return `<!doctype html><html lang="it"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Anteprima ${modello}</title>
<link rel="stylesheet" href="${rel('wp/artes-core/fonts/fonts.css')}"><link rel="stylesheet" href="${rel('wp/artes-core/artes-rev2.css')}">
<style>body{margin:0}.elementor a{text-decoration:none}</style></head>
<body class="rev2"><div class="elementor">${m}</div></body></html>`;
}

(async () => {
  const pagine = {
    articolo: pagina('blog-articolo.html', { carte: 3 }),
    archivio: pagina('blog-archivio.html', { carte: 4 }),
    'archivio-vuoto': pagina('blog-archivio.html', { vuoto: true }),
  };
  for (const [n, html] of Object.entries(pagine)) fs.writeFileSync(path.join(out, n + '.html'), html);
  for (const w of [1440, 390]) {
    const b = await openBrowser({ width: w, height: 900, mobile: w < 700 });
    try {
      for (const n of Object.keys(pagine)) {
        await b.navigate('file:///' + path.join(out, n + '.html').split(path.sep).join('/'));
        const r = await b.screenshotFull(path.join(out, `${n}@${w}.png`));
        const sx = await b.evalJs('document.documentElement.scrollWidth - document.documentElement.clientWidth');
        console.log(`${n}@${w}: altezza ${r.height}px, scroll orizzontale ${sx}px`);
      }
    } finally { await b.close(); }
  }
  console.log('anteprime in ' + out);
})().catch((e) => { console.error(e); process.exit(1); });
