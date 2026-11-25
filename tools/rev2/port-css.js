'use strict';
// Porta il CSS della rev2 nel plugin di WordPress, in modo ripetibile.
//   node tools/rev2/port-css.js [cartella-rev2]
// Legge  <rev2>/assets/css/artes.css  e scrive  wp/artes-core/artes-rev2.css  assemblando:
//   1. tools/rev2/css/reset.css        (azzera gli stili base degli elementi atomici di Elementor)
//   2. il CSS della rev2 riscritto     (selettori con prefisso, main/dt/dd rimappati, CSS morto eliminato)
//   3. tools/rev2/css/adattamenti.css  (differenze di markup tra la rev2 e Elementor)
// Il CSS della rev2 NON si modifica a mano: se cambia la rev2 si rilancia lo script.
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..', '..');
const rev2 = path.resolve(process.argv[2] || root);
const sorgente = path.join(rev2, 'assets', 'css', 'artes.css');
const uscita = path.join(root, 'wp', 'artes-core', 'artes-rev2.css');

// --- configurazione ------------------------------------------------------------------------------
const PREFISSO = 'body.rev2 .elementor';                 // vince sulle regole di base di Elementor, non tocca le pagine vecchie
const RADICE = '.page-root';                             // il tag <main> della rev2 diventa il contenitore radice della pagina
// Tag che il convertitore (html2elementor.js) non può riprodurre come tali e che sostituisce con un div/span + classe
// "rev2-<tag>": ogni selettore di tipo diventa ":is(tag, :where(.rev2-tag))", che ha la specificità del solo tag, quindi
// l'ordine di precedenza delle regole resta quello della rev2. Il tag vero (es. <strong> dentro un titolo) continua a valere.
const TAG_IN_CLASSE = ['dl', 'dt', 'dd', 'p', 'small', 'strong', 'em', 'b', 'i', 'li', 'ul', 'ol'];
const FUORI_ELEMENTOR = [/^\.lightbox/, /^\.has-lightbox/];   // elementi creati dal JavaScript e messi sotto <body> (tutta la famiglia .lightbox, __bar, __btn, --single…)
// classi che esistono a runtime senza comparire nell'HTML (stati messi dal JavaScript, o dal plugin)
const CLASSI_EXTRA = new Set(['is-active', 'is-open', 'is-extra', 'has-lightbox', 'is-loading', 'rev2', 'page-root']);

// --- classi usate dalla rev2 (per eliminare il CSS morto) -----------------------------------------
function classiUsate() {
  const set = new Set(CLASSI_EXTRA);
  const agg = (c) => { if (c && !/[^\w-]/.test(c)) set.add(c); };
  for (const f of fs.readdirSync(rev2).filter((n) => n.endsWith('.html'))) {
    const h = fs.readFileSync(path.join(rev2, f), 'utf8');
    for (const m of h.matchAll(/\sclass="([^"]*)"/g)) m[1].split(/\s+/).forEach(agg);
  }
  const js = fs.readFileSync(path.join(rev2, 'assets', 'js', 'artes.js'), 'utf8');
  for (const m of js.matchAll(/classList\.(?:add|remove|toggle|contains)\('([^']+)'/g)) agg(m[1]);
  for (const m of js.matchAll(/class="([^"]+)"/g)) m[1].split(/\s+/).forEach(agg);
  for (const m of js.matchAll(/className\s*=\s*'([^']+)'/g)) m[1].split(/\s+/).forEach(agg);
  return set;
}

// --- riscrittura dei selettori -----------------------------------------------------------------------
function dividiLista(sel) {                              // divide una lista di selettori per virgola, rispettando (...) e [...]
  const out = []; let depth = 0, cur = '';
  for (const ch of sel) {
    if (ch === '(' || ch === '[') depth++; else if (ch === ')' || ch === ']') depth--;
    if (ch === ',' && depth === 0) { out.push(cur); cur = ''; } else cur += ch;
  }
  if (cur.trim()) out.push(cur);
  return out.map((s) => s.trim()).filter(Boolean);
}
function classiFuoriParentesi(sel) {                      // classi del selettore, escluse quelle dentro :not(...), :is(...), :where(...), :has(...)
  let depth = 0, plain = '';
  for (const ch of sel) { if (ch === '(') depth++; else if (ch === ')') depth--; else if (depth === 0) plain += ch; }
  return [...plain.matchAll(/\.([A-Za-z_][\w-]*)/g)].map((m) => m[1]);
}
const RE_TIPI = new RegExp('(^|[\\s>+~(,])(main|span|' + TAG_IN_CLASSE.join('|') + ')(?![\\w-])', 'g');
// Gli <span> veri non vanno confusi con gli span che il convertitore usa al posto di strong/em/small… (classi rev2-*) e come
// involucro del testo semplice (rev2-t): le regole "X span" della rev2 valgono solo per gli span veri. :where() = specificità 0.
const SPAN_VERO = 'span:where(:not(.rev2-strong, .rev2-em, .rev2-b, .rev2-i, .rev2-small, .rev2-t))';
function rimappaTipi(sel) {                               // main -> radice; p, dt, dd, small… -> :is(tag, :where(.rev2-tag))
  // un selettore di tipo è un nome a inizio selettore o dopo un combinatore/spazio, non preceduto da . # [ : -
  return sel.replace(RE_TIPI, (m, pre, tag) => pre + (tag === 'main' ? RADICE : tag === 'span' ? SPAN_VERO : `:is(${tag}, :where(.rev2-${tag}))`));
}
// Classi che nella rev2 dipendono dal numero di elementi e le scrive l'HTML a mano (caso-gallery--n3…): in WordPress la galleria è un
// ciclo, quindi la stessa condizione si esprime in CSS con :has() sul numero di figli. :where() = stessa specificità della classe.
const CONTEGGI = {
  1: ':where(:not(:has(> :nth-child(2))))',
  2: ':where(:has(> :nth-child(2)):not(:has(> :nth-child(3))))',
  3: ':where(:has(> :nth-child(3)):not(:has(> :nth-child(4))))',
  4: ':where(:has(> :nth-child(4)):not(:has(> :nth-child(5))))',
  5: ':where(:has(> :nth-child(5)))',
};
const RE_CONTEGGI = /.caso-gallery--n([1-5])(?![w-])/g;

function riscriviSelettore(sel) {
  let s = sel.trim().replace(RE_CONTEGGI, (m, k) => '.caso-gallery' + CONTEGGI[k]);
  if (s === ':root') return 'body.rev2';
  if (/^html(?![\w-])/.test(s)) return s.replace(/^html/, 'html:has(body.rev2)');
  if (/^body(?![\w-])/.test(s)) return s.replace(/^body/, 'body.rev2');
  if (/^\*/.test(s)) return 'body.rev2 ' + s;
  s = rimappaTipi(s);
  if (FUORI_ELEMENTOR.some((re) => re.test(s))) return 'body.rev2 ' + s;
  return PREFISSO + ' ' + s;
}

// --- scansione del CSS (conserva commenti e formattazione) ----------------------------------------------
const stat = { regole: 0, mantenute: 0, selettoriEliminati: 0, regoleEliminate: 0, mappati: 0 };
const eliminati = new Set();
function elabora(css, usate) {
  let i = 0, out = '';
  const n = css.length;
  const fineStringa = (pos, q) => { let p = pos + 1; while (p < n && css[p] !== q) { if (css[p] === '\\') p++; p++; } return p + 1; };
  while (i < n) {
    // spazi e commenti tra le regole: copiati così come sono
    const ws = /^\s+/.exec(css.slice(i, i + 4096)); if (ws) { out += ws[0]; i += ws[0].length; continue; }
    if (css.startsWith('/*', i)) { const e = css.indexOf('*/', i + 2); const fine = e < 0 ? n : e + 2; out += css.slice(i, fine); i = fine; continue; }
    if (css[i] === '}') { out += '}'; i++; continue; }
    // prelude fino a "{" o ";" (saltando stringhe, commenti, parentesi)
    let j = i, depth = 0;
    while (j < n) {
      const c = css[j];
      if (c === '"' || c === "'") { j = fineStringa(j, c); continue; }
      if (css.startsWith('/*', j)) { const e = css.indexOf('*/', j + 2); j = e < 0 ? n : e + 2; continue; }
      if (c === '(' || c === '[') depth++; else if (c === ')' || c === ']') depth--;
      else if ((c === '{' || c === ';') && depth === 0) break;
      j++;
    }
    const prelude = css.slice(i, j); const term = css[j];
    if (term === ';' || j >= n) { out += prelude + (term || ''); i = j + 1; continue; }     // at-rule senza blocco (@import, @charset)
    // blocco: trova la "}" corrispondente
    let k = j + 1, d = 1;
    while (k < n && d > 0) {
      const c = css[k];
      if (c === '"' || c === "'") { k = fineStringa(k, c); continue; }
      if (css.startsWith('/*', k)) { const e = css.indexOf('*/', k + 2); k = e < 0 ? n : e + 2; continue; }
      if (c === '{') d++; else if (c === '}') d--;
      k++;
    }
    const corpo = css.slice(j + 1, k - 1);
    const trimmed = prelude.trim();
    if (trimmed.startsWith('@')) {
      const nome = /^@([\w-]+)/.exec(trimmed)[1];
      if (nome === 'media' || nome === 'supports') {
        const interno = elabora(corpo, usate);
        out += prelude + '{' + interno + '}';
      } else out += prelude + '{' + corpo + '}';                                                      // @keyframes, @font-face...: verbatim
    } else {
      stat.regole++;
      // eventuali commenti all'inizio del prelude restano davanti
      const mc = /^(\s*(?:\/\*[\s\S]*?\*\/\s*)*)([\s\S]*)$/.exec(prelude);
      const lista = dividiLista(mc[2]);
      const tenuti = [];
      for (const s of lista) {
        const cl = classiFuoriParentesi(s);
        const morta = cl.some((c) => !usate.has(c));
        if (morta) { stat.selettoriEliminati++; eliminati.add(s); continue; }
        tenuti.push(riscriviSelettore(s)); if (rimappaTipi(s) !== s) stat.mappati++;
      }
      if (!tenuti.length) { stat.regoleEliminate++; }
      else { stat.mantenute++; out += mc[1] + tenuti.join(',\n') + ' {' + corpo + '}'; }
    }
    i = k;
  }
  return out;
}

// --- esecuzione ------------------------------------------------------------------------------------
const usate = classiUsate();
const css = fs.readFileSync(sorgente, 'utf8').replace(/\r\n/g, '\n');
let trasformato = elabora(css, usate).replace(/\n{3,}/g, '\n\n');
// url('../img/…') relativi al foglio della rev2: il CSS gira dalla cartella del plugin, quindi vanno puntati alla libreria
// multimediale: mappa versionata tools/rev2/css/immagini.json (immagine della rev2 -> ID e percorso nella libreria di WordPress).
// Si usa il percorso senza dominio, valido anche in produzione finché la cartella uploads è la stessa. Se la rev2 usa una nuova
// immagine nel CSS: caricarla nella libreria e aggiungerla alla mappa, altrimenti lo script si ferma senza scrivere nulla.
const mappaMedia = JSON.parse(fs.readFileSync(path.join(__dirname, 'css', 'immagini.json'), 'utf8'));
let urlRiscritti = 0; const urlSenzaMappa = [];
trasformato = trasformato.replace(/url\((['"]?)\.\.\/(img\/[^)'"]+)\1\)/g, (tutto, q, rel) => {
  const voce = mappaMedia['assets/' + rel];
  if (!voce || !voce.url) { urlSenzaMappa.push(rel); return tutto; }
  urlRiscritti++;
  return `url(${q}${voce.url}${q})`;
});
if (urlSenzaMappa.length) {
  console.error('ERRORE: immagini del CSS non presenti in tools/rev2/css/immagini.json (nessun file scritto):', urlSenzaMappa.join(', '));
  process.exit(1);
}
// Impronta del contenuto (non l'hash del commit, che cambierebbe a ogni commit e renderebbe il file "diverso" senza motivo).
const commit = 'sha1 ' + require('crypto').createHash('sha1').update(css).digest('hex').slice(0, 10);
const parte = (f) => { const p = path.join(__dirname, 'css', f); return fs.existsSync(p) ? fs.readFileSync(p, 'utf8').replace(/\r\n/g, '\n') : ''; };
const intestazione = `/* ARTES rev2 — CSS GENERATO da tools/rev2/port-css.js: NON modificare a mano.
   Sorgente: ${path.relative(root, sorgente).replace(/\\/g, '/')} (impronta: ${commit}).
   Struttura: 1) reset degli stili base di Elementor (tools/rev2/css/reset.css)
              2) CSS della rev2 con selettori prefissati "${PREFISSO}" (e main -> ${RADICE}, dt/dd -> classi)
              3) adattamenti di markup (tools/rev2/css/adattamenti.css)
   Si applica solo con la classe "rev2" sul <body> (vedi artes-core.php). */
`;
fs.writeFileSync(uscita, intestazione + '\n' + parte('reset.css') + '\n/* ===== 2. CSS della rev2 ===== */\n' + trasformato + '\n/* ===== 3. Adattamenti ===== */\n' + parte('adattamenti.css'));
console.log(`CSS rev2: ${css.split('\n').length} righe -> ${fs.readFileSync(uscita, 'utf8').split('\n').length} righe in ${path.relative(root, uscita)}`);
console.log(`regole: ${stat.regole}, mantenute: ${stat.mantenute}, eliminate (CSS morto): ${stat.regoleEliminate}; selettori morti eliminati: ${stat.selettoriEliminati}; main/dt/dd rimappati: ${stat.mappati}; url() riscritti sulla libreria multimediale: ${urlRiscritti}`);
fs.mkdirSync(path.join(root, 'tools', 'out', 'rev2'), { recursive: true });
fs.writeFileSync(path.join(root, 'tools', 'out', 'rev2', 'css-selettori-eliminati.txt'), [...eliminati].sort().join('\n'));
