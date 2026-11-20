'use strict';
// Confronto di parità: una pagina della rev2 contro la sua omologa su dev3 (screenshot a pagina intera + differenza pixel).
//   node tools/rev2/parita.js <nome> <url-rev2> <url-dev3> [--w 1440,390] [--tol 10] [--band 100] [--solo-corpo] [--percorso /x/]
// Scrive tools/out/rev2/parita/<nome>/{rev2,dev3,diff}@<larghezza>.png e stampa altezze, % di pixel diversi e le fasce
// verticali con più differenze (dove guardare). Rosso = pixel diverso; arancio = presente solo in una delle due immagini.
const fs = require('fs');
const path = require('path');
const { openBrowser } = require('./cdp-session');
const { comparePngs } = require('./png-diff');
const { risolviUrl } = require('./url-dev3');

const args = process.argv.slice(2);
const [nome, urlRev2In, urlDev3In] = args;
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
if (!nome || !urlRev2In || !urlDev3In) { console.error('uso: parita.js <nome> <url-rev2> <url-dev3> [--w 1440,390] [--tol 10] [--band 100]'); process.exit(2); }
const larghezze = opt('--w', '1440,390').split(',').map(Number);
const soloCorpo = args.includes('--solo-corpo'); if (soloCorpo) args.splice(args.indexOf('--solo-corpo'), 1);   // confronta solo <main> (rev2) e .page-root (dev3): niente header e footer
const percorso = opt('--percorso', '');   // percorso simulato per la voce attiva del menu (le anteprime non hanno il permalink vero)
const tol = parseInt(opt('--tol', '10'), 10); const band = parseInt(opt('--band', '100'), 10);
const out = path.resolve(__dirname, '..', 'out', 'rev2', 'parita', nome);
fs.mkdirSync(out, { recursive: true });

(async () => {
  const urlRev2 = await risolviUrl(urlRev2In); const urlDev3 = await risolviUrl(urlDev3In);
  for (const w of larghezze) {
    const b = await openBrowser({ width: w, height: 900, mobile: w < 700 });
    try {
      const fa = path.join(out, `rev2@${w}.png`); const fb = path.join(out, `dev3@${w}.png`); const fd = path.join(out, `diff@${w}.png`);
      await b.navigate(urlRev2); const ra = soloCorpo ? await b.screenshotSelettore('main', fa) : await b.screenshotFull(fa);
      await b.navigate(urlDev3);
      await b.evalJs("document.querySelectorAll('.otgs-development-site-front-end, #wpadminbar').forEach(function (e) { e.remove(); }); 1");   // banner di sviluppo di WPML: non fa parte del design
      if (percorso) await b.evalJs('window.ArtesRev2 && ArtesRev2.marcaAttivo(' + JSON.stringify(percorso) + '); 1');
      const rb = soloCorpo ? await b.screenshotSelettore('.page-root', fb) : await b.screenshotFull(fb);
      const c = comparePngs(fa, fb, { tol, diffOut: fd, band });
      const scroll = await b.evalJs('document.documentElement.scrollWidth - document.documentElement.clientWidth');
      console.log(`\n== ${nome} @${w}px: altezza rev2 ${ra.height} / dev3 ${rb.height} (Δ ${rb.height - ra.height}); pixel diversi ${c.percentuale}%; scroll orizzontale dev3: ${scroll}px`);
      const fasce = (c.bande || []).slice().sort((x, y) => y.percentuale - x.percentuale).slice(0, 8);
      if (fasce.length) console.log('   fasce più diverse (y da-a: % pixel): ' + fasce.map((x) => `${x.da}-${x.a}: ${x.percentuale}%`).join('  '));
    } finally { await b.close(); }
  }
})().catch((e) => { console.error(e); process.exit(1); });
