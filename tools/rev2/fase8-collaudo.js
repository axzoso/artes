'use strict';
// Orchestratore di collaudo completo Fase 8 (solo IT, sola lettura su dev3).
// Usa un server HTTP interno su 127.0.0.1:8769 per artes-sito-rev2/ e scrive TUTTI gli output in tools/out/rev2/fase8/.
//
// Uso:
//   node tools/rev2/fase8-collaudo.js [--step tutto|parita|geometria|salute|interazioni|link|report] [--parallelo 3] [--porta 8769] [--w 1440,1024,768,390] [--riprendi]
//
// Copertura:
//   1. parita:      49/49 pagine rev2 × 4 breakpoint (1440, 1024, 768, 390) + contenuti normalizzati (testi, titoli, link, immagini/alt)
//   2. geometria:   geometria.js su 9 tipologie di pagina rappresentative (1440 e 390 px, tol 2px)
//   3. salute:      salute-pagine.js su tutte le 51 pagine pubblicate (49 rev2 + privacy-policy + cookie-policy) a 1440 e 390 px
//   4. interazioni: header (tendina, menu mobile 390/1024, accordion, 7 voci attive), fase5 Home (slider, filtri, pallini mobile),
//                   fase5 Settori (FAQ accordion + FAQPage JSON-LD su tutti e 5 i settori), archivi (realizzazioni 2 livelli + query URL, brand),
//                   schede (lightbox apertura, frecce tastiera/bottoni, terza foto, chiusura Escape, mobile 390)
//   5. link:        controllo-link.js su tutte le 51 pagine + verifica 0 link verso le 6 bozze + collaudo-redirect.js (17 casi) + 404 delle 6 bozze
//   6. report:      genera tools/out/rev2/fase8/report-fase8.json e tools/out/rev2/fase8/riepilogo.md

const fs = require('fs');
const path = require('path');
const http = require('http');
const { execFile } = require('child_process');
const { openBrowser, sleep } = require('./cdp-session');
const { comparePngs } = require('./png-diff');
const { risolviLink } = require('./html2elementor');

const ROOT = path.resolve(__dirname, '..', '..');
const REV2_DIR = ROOT;
const OUT_DIR = path.join(ROOT, 'tools', 'out', 'rev2', 'fase8');
const DEV3 = 'https://dev3.minimalstudiodev.it';

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const STEP = opt('--step', 'tutto');
const PARALLELO = parseInt(opt('--parallelo', '3'), 10);
const PORTA = parseInt(opt('--porta', '8769'), 10);
const LARGHEZZE = opt('--w', '1440,1024,768,390').split(',').map(Number);
const RIPRENDI = args.includes('--riprendi');
const REV2_BASE = `http://127.0.0.1:${PORTA}`;

fs.mkdirSync(OUT_DIR, { recursive: true });

// --- Catalogo pagine ---
const DATI = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools', 'out', 'rev2', 'dati-rev2.json'), 'utf8'));

const PAGINE_STATICHE = [
  { nome: 'home', gruppo: 'home', file: 'index.html', percorso: '/' },
  { nome: 'arredamento-ufficio', gruppo: 'settori', file: 'arredamento-ufficio.html', percorso: '/arredamento-ufficio/' },
  { nome: 'arredo-negozi', gruppo: 'settori', file: 'arredo-negozi.html', percorso: '/arredo-negozi/' },
  { nome: 'arredamento-bar-ristoranti', gruppo: 'settori', file: 'arredamento-bar-ristoranti.html', percorso: '/arredamento-bar-ristoranti/' },
  { nome: 'arredo-negozi-food', gruppo: 'settori', file: 'arredo-negozi-food.html', percorso: '/arredo-negozi-food/' },
  { nome: 'arredamento-hotel', gruppo: 'settori', file: 'arredamento-hotel.html', percorso: '/arredamento-hotel/' },
  { nome: 'arredamento-su-misura', gruppo: 'servizi', file: 'arredamento-su-misura.html', percorso: '/arredamento-su-misura/' },
  { nome: 'contract', gruppo: 'servizi', file: 'contract.html', percorso: '/contract/' },
  { nome: 'chi-siamo', gruppo: 'istituzionali', file: 'chi-siamo.html', percorso: '/chi-siamo/' },
];

const PAGINE_ARCHIVI = [
  { nome: 'archivio-realizzazioni', gruppo: 'archivi', file: 'realizzazioni.html', percorso: '/realizzazioni/' },
  { nome: 'archivio-brand', gruppo: 'archivi', file: 'brand-partner.html', percorso: '/brand-partner/' },
];

const PAGINE_REALIZZAZIONI = DATI.realizzazioni.map((r) => ({
  nome: 'r-' + r.slug,
  gruppo: 'realizzazioni',
  file: `realizzazione-${r.slug}.html`,
  percorso: `/realizzazioni/${r.slug}/`,
}));

const PAGINE_BRAND = DATI.brand.map((b) => ({
  nome: 'b-' + b.slug,
  gruppo: 'brand',
  file: `brand-${b.slug}.html`,
  percorso: `/brand-partner/${b.slug}/`,
}));

const PAGINE_REV2 = [
  ...PAGINE_STATICHE,
  ...PAGINE_ARCHIVI,
  ...PAGINE_REALIZZAZIONI,
  ...PAGINE_BRAND,
];

const PAGINE_LEGALI = [
  { nome: 'privacy-policy', gruppo: 'legali', file: null, percorso: '/privacy-policy/' },
  { nome: 'cookie-policy', gruppo: 'legali', file: null, percorso: '/cookie-policy/' },
];

const PAGINE_PUBBLICATE = [...PAGINE_REV2, ...PAGINE_LEGALI];

const PAGINE_BOZZE = [
  { id: 152, slug: 'contatti', percorso: '/contatti/' },
  { id: 153, slug: 'area-progettisti', percorso: '/area-progettisti/' },
  { id: 154, slug: 'richiedi-preventivo', percorso: '/richiedi-preventivo/' },
  { id: 471, slug: 'prodotti', percorso: '/prodotti/' },
  { id: 472, slug: 'mepa', percorso: '/mepa/' },
  { id: 491, slug: 'cataloghi', percorso: '/cataloghi/' },
];

const CAMPIONE_GEOMETRIA = [
  { tipo: 'Home', file: 'index.html', percorso: '/' },
  { tipo: 'Settore (Uffici)', file: 'arredamento-ufficio.html', percorso: '/arredamento-ufficio/' },
  { tipo: 'Su misura', file: 'arredamento-su-misura.html', percorso: '/arredamento-su-misura/' },
  { tipo: 'Contract', file: 'contract.html', percorso: '/contract/' },
  { tipo: 'Chi siamo', file: 'chi-siamo.html', percorso: '/chi-siamo/' },
  { tipo: 'Archivio realizzazioni', file: 'realizzazioni.html', percorso: '/realizzazioni/' },
  { tipo: 'Archivio brand', file: 'brand-partner.html', percorso: '/brand-partner/' },
  { tipo: 'Realizzazione (ARPACAL)', file: 'realizzazione-arpacal.html', percorso: '/realizzazioni/arpacal/' },
  { tipo: 'Brand (Pedrali)', file: 'brand-pedrali.html', percorso: '/brand-partner/pedrali/' },
];

// --- Server HTTP statico per artes-sito-rev2 ---
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
};

function avviaServerRev2(porta) {
  return new Promise((resolve, reject) => {
    const srv = http.createServer((req, res) => {
      try {
        const u = new URL(req.url, `http://127.0.0.1:${porta}`);
        let rel = decodeURIComponent(u.pathname);
        if (rel === '/') rel = '/index.html';
        const full = path.resolve(REV2_DIR, '.' + rel);
        if (!full.startsWith(REV2_DIR) || !fs.existsSync(full) || fs.statSync(full).isDirectory()) {
          res.writeHead(404); res.end('Not Found'); return;
        }
        const ext = path.extname(full).toLowerCase();
        res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
        fs.createReadStream(full).pipe(res);
      } catch (e) {
        res.writeHead(500); res.end(String(e.message));
      }
    });
    srv.on('error', reject);
    srv.listen(porta, '127.0.0.1', () => resolve(srv));
  });
}

function runNode(script, scriptArgs, timeoutMs = 180000) {
  return new Promise((resolve) => {
    execFile(process.execPath, [path.join(__dirname, script), ...scriptArgs], { cwd: ROOT, maxBuffer: 16 * 1024 * 1024, timeout: timeoutMs }, (err, stdout, stderr) => {
      resolve({ code: err ? (typeof err.code === 'number' ? err.code : 1) : 0, out: (stdout + (stderr ? '\n' + stderr : '')).trim() });
    });
  });
}

function salvaJson(nome, data) {
  const p = path.join(OUT_DIR, nome);
  fs.writeFileSync(p, JSON.stringify(data, null, 2));
  return p;
}

function leggiJson(nome) {
  const p = path.join(OUT_DIR, nome);
  return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : null;
}

// --- Estrazione contenuti (stessa logica di contenuti.js) ---
function estraiContenutiInPagina() {
  const radice = document.querySelector('main') && !document.querySelector('.page-root')
    ? document.querySelector('main')
    : document.querySelector('.page-root') || document.querySelector('main');
  const testo = radice.innerText.split('\n').map((r) => r.replace(/\s+/g, ' ').trim()).filter(Boolean);
  const link = Array.from(radice.querySelectorAll('a[href]'))
    .filter((a) => a.getClientRects().length || getComputedStyle(a).display === 'contents')
    .map((a) => ({
      testo: (a.innerText || a.textContent || '').replace(/\s+/g, ' ').trim(),
      raw: (a.textContent || '').replace(/\s+/g, ' ').trim(),
      href: a.getAttribute('href'),
    }));
  const immagini = Array.from(radice.querySelectorAll('img'))
    .filter((i) => i.getAttribute('src'))
    .map((i) => ({
      src: (i.getAttribute('src') || '').split('/').pop(),
      alt: i.getAttribute('alt') || '',
      visibile: !!i.getClientRects().length,
    }));
  const titoli = Array.from(radice.querySelectorAll('h1,h2,h3'))
    .filter((h) => h.getClientRects().length)
    .map((h) => h.tagName + ' ' + h.innerText.replace(/\s+/g, ' ').trim());
  return JSON.stringify({ testo, link, immagini, titoli });
}

function confrontaContenuti(A, B, fileRev2) {
  const percorso = (h) => {
    try {
      const u = new URL(h, DEV3);
      return (u.pathname.replace(/\/+$/, '') || '/') + u.search + u.hash;
    } catch {
      return h;
    }
  };
  const problemi = [];
  const max = Math.max(A.testo.length, B.testo.length);
  let diverse = 0;
  for (let i = 0; i < max; i++) {
    if ((A.testo[i] || '') !== (B.testo[i] || '')) {
      if (diverse++ < 12) problemi.push(`TESTO riga ${i + 1}: rev2 "${(A.testo[i] || '∅').slice(0, 90)}" ≠ dev3 "${(B.testo[i] || '∅').slice(0, 90)}"`);
    }
  }
  if (diverse > 12) problemi.push(`… altre ${diverse - 12} righe di testo diverse`);
  if (JSON.stringify(A.titoli) !== JSON.stringify(B.titoli)) {
    problemi.push(`TITOLI diversi: rev2=${A.titoli.length} vs dev3=${B.titoli.length}`);
  }
  const soloPagine = (l) => !/(^|\/)assets\/img\/|\/wp-content\/uploads\//.test(l.href || '');
  const lA = A.link.filter(soloPagine).map((l) => `${l.testo} → ${percorso(risolviLink(l.href, l.raw || l.testo, fileRev2 || 'rev2', []) || l.href)}`);
  const lB = B.link.filter(soloPagine).map((l) => `${l.testo} → ${percorso(l.href)}`);
  const setB = new Set(lB); const setA = new Set(lA);
  lA.filter((x) => !setB.has(x)).slice(0, 10).forEach((x) => problemi.push(`LINK solo in rev2: ${x}`));
  lB.filter((x) => !setA.has(x)).slice(0, 10).forEach((x) => problemi.push(`LINK solo su dev3: ${x}`));
  if (lA.length !== lB.length) problemi.push(`LINK: numero diverso (rev2 ${lA.length}, dev3 ${lB.length})`);
  const iA = A.immagini.map((i) => `${i.alt}`);
  const iB = B.immagini.map((i) => `${i.alt}`);
  if (iA.length !== iB.length) problemi.push(`IMMAGINI: numero diverso (rev2 ${iA.length}, dev3 ${iB.length})`);
  iA.forEach((alt, k) => {
    if (iB[k] !== undefined && iB[k] !== alt) problemi.push(`ALT immagine ${k + 1}: rev2 "${alt}" ≠ dev3 "${iB[k]}"`);
  });
  return {
    ok: problemi.length === 0,
    problemi,
    conteggi: { righeTestoRev2: A.testo.length, righeTestoDev3: B.testo.length, titoli: B.titoli.length, link: lB.length, immagini: iB.length },
  };
}

// --- STEP 1: PARITÀ 49 × 4 + CONTENUTI ---
async function stepParita() {
  console.log(`\n=== STEP 1: PARITÀ VISIVA E CONTENUTI (${PAGINE_REV2.length} pagine × ${LARGHEZZE.length} breakpoint: ${LARGHEZZE.join(', ')}) ===`);
  const paritaDir = path.join(OUT_DIR, 'parita');
  fs.mkdirSync(paritaDir, { recursive: true });
  const prev = RIPRENDI ? leggiJson('step-parita.json') : null;
  const mappaPrev = new Map((prev && prev.pagine ? prev.pagine : []).map((x) => [x.nome, x]));

  const risultati = new Map();
  const daFare = [];
  for (const p of PAGINE_REV2) {
    const old = mappaPrev.get(p.nome);
    if (old && !old.errore && old.misure && old.misure.length === LARGHEZZE.length && old.contenuti && old.contenuti.ok) {
      risultati.set(p.nome, old);
    } else {
      risultati.set(p.nome, { nome: p.nome, gruppo: p.gruppo, file: p.file, percorso: p.percorso, misure: [], contenuti: null, errore: null });
      daFare.push(p);
    }
  }
  console.log(`Da eseguire: ${daFare.length}/${PAGINE_REV2.length} pagine (parallelo=${PARALLELO})`);

  async function misuraUna(b, p, w, raccogliContenuti) {
    const tmpDir = path.join(paritaDir, p.nome);
    fs.mkdirSync(tmpDir, { recursive: true });
    const fa = path.join(tmpDir, `rev2@${w}.png`);
    const fb = path.join(tmpDir, `dev3@${w}.png`);
    const fd = path.join(tmpDir, `diff@${w}.png`);
    const urlA = `${REV2_BASE}/${p.file}`;
    const urlB = `${DEV3}${p.percorso}`;

    await b.navigate(urlA);
    const ra = await b.screenshotFull(fa);
    const scrollA = await b.evalJs('document.documentElement.scrollWidth - document.documentElement.clientWidth');
    let contA = null;
    if (raccogliContenuti) contA = JSON.parse(await b.evalJs(`(${estraiContenutiInPagina.toString()})()`));

    await b.navigate(urlB);
    await b.evalJs("document.querySelectorAll('.otgs-development-site-front-end, #wpadminbar').forEach(function (e) { e.remove(); }); 1");
    const rb = await b.screenshotFull(fb);
    const scrollB = await b.evalJs('document.documentElement.scrollWidth - document.documentElement.clientWidth');
    let contB = null;
    if (raccogliContenuti) contB = JSON.parse(await b.evalJs(`(${estraiContenutiInPagina.toString()})()`));

    const delta = rb.height - ra.height;
    let c = comparePngs(fa, fb, { tol: 10, diffOut: null, band: 100 });
    const anomalo = delta !== 0 || c.percentuale > 3 || scrollB > 0;
    if (anomalo) {
      c = comparePngs(fa, fb, { tol: 10, diffOut: fd, band: 100 });
    } else {
      try { fs.unlinkSync(fa); fs.unlinkSync(fb); } catch { /* ignore */ }
      try { if (fs.readdirSync(tmpDir).length === 0) fs.rmdirSync(tmpDir); } catch { /* ignore */ }
    }
    const fasce = (c.bande || []).slice().sort((x, y) => y.percentuale - x.percentuale).slice(0, 5);
    return {
      misura: { w, altezzaRev2: ra.height, altezzaDev3: rb.height, delta, pixel: c.percentuale, scrollXRev2: scrollA, scrollXDev3: scrollB, fasce },
      contenuti: raccogliContenuti ? confrontaContenuti(contA, contB, p.file) : null,
    };
  }

  // Esegui per larghezza così ogni worker riusa la sessione Chrome (max 8 pagine per istanza per tenere bassa la RAM)
  for (const w of LARGHEZZE) {
    console.log(`\n--- Breakpoint @${w}px ---`);
    const coda = daFare.slice();
    let idx = 0;
    let completate = 0;

    await Promise.all(Array.from({ length: PARALLELO }, async () => {
      let b = null;
      let usi = 0;
      const chiudi = async () => { if (b) { try { await b.close(); } catch { /* ignore */ } b = null; usi = 0; } };
      try {
        while (idx < coda.length) {
          const p = coda[idx++];
          const rec = risultati.get(p.nome);
          const needCont = w === LARGHEZZE[0] && !rec.contenuti;
          let esito = null;
          let errMsg = null;

          for (let tentativo = 1; tentativo <= 2; tentativo++) {
            try {
              if (!b || usi >= 8) {
                await chiudi();
                b = await openBrowser({ width: w, height: 900, mobile: w < 700 });
                usi = 0;
              }
              const r = await misuraUna(b, p, w, needCont);
              usi++;
              // Ripeti una volta se pixel > 6% o altezza diversa (es. foto remota in ritardo)
              if (tentativo === 1 && (r.misura.pixel > 6 || r.misura.delta !== 0)) {
                await chiudi();
                esito = r;
                continue;
              }
              if (!esito || (r.misura.delta === 0 && esito.misura.delta !== 0) || r.misura.pixel < esito.misura.pixel) {
                esito = r;
              }
              errMsg = null;
              break;
            } catch (err) {
              errMsg = err.message;
              await chiudi();
            }
          }

          if (esito) {
            rec.misure = rec.misure.filter((m) => m.w !== w);
            rec.misure.push(esito.misura);
            if (esito.contenuti) rec.contenuti = esito.contenuti;
          } else {
            rec.errore = (rec.errore ? rec.errore + '; ' : '') + `@${w}px: ${errMsg}`;
          }
          completate++;
          const m = esito ? esito.misura : null;
          const tag = !m ? 'ERR ' : (m.delta === 0 && m.pixel < 3 && m.scrollXDev3 === 0 ? 'OK  ' : 'NOTE');
          const cTag = needCont && rec.contenuti ? ` | cont:${rec.contenuti.ok ? 'OK' : 'DIFF(' + rec.contenuti.problemi.length + ')'}` : '';
          console.log(`[${String(completate).padStart(2)}/${coda.length}] ${tag} ${p.nome.padEnd(30)} @${w}px  H:${m ? `${m.altezzaRev2}/${m.altezzaDev3} Δ${m.delta}` : 'ERR'}  px:${m ? m.pixel + '%' : '-'}  sx:${m ? `${m.scrollXRev2}/${m.scrollXDev3}` : '-'}${cTag}`);
        }
      } finally {
        await chiudi();
      }
    }));

    // Salva progresso incrementale dopo ogni breakpoint
    const arrParz = PAGINE_REV2.map((p) => risultati.get(p.nome));
    salvaJson('step-parita.json', { timestamp: new Date().toISOString(), larghezze: LARGHEZZE, pagine: arrParz });
  }

  const pagineOut = PAGINE_REV2.map((p) => {
    const r = risultati.get(p.nome);
    r.misure.sort((a, b) => b.w - a.w);
    return r;
  });

  const tutteMisure = pagineOut.flatMap((p) => p.misure.map((m) => ({ nome: p.nome, gruppo: p.gruppo, percorso: p.percorso, ...m })));
  const altezzeDiverse = tutteMisure.filter((m) => m.delta !== 0);
  const scrollXDev3 = tutteMisure.filter((m) => m.scrollXDev3 > 0);
  const pixelSopra3 = tutteMisure.filter((m) => m.pixel >= 3);
  const contenutiKo = pagineOut.filter((p) => !p.contenuti || !p.contenuti.ok);
  const errori = pagineOut.filter((p) => p.errore);
  const peggioriPixel = tutteMisure.slice().sort((a, b) => b.pixel - a.pixel).slice(0, 10);

  const out = {
    timestamp: new Date().toISOString(),
    totalePagine: pagineOut.length,
    breakpoint: LARGHEZZE,
    totaleViewport: tutteMisure.length,
    attesiViewport: pagineOut.length * LARGHEZZE.length,
    riepilogo: {
      altezzeDiverse: altezzeDiverse.map((m) => ({ nome: m.nome, w: m.w, rev2: m.altezzaRev2, dev3: m.altezzaDev3, delta: m.delta })),
      scrollXDev3: scrollXDev3.map((m) => ({ nome: m.nome, w: m.w, scrollXRev2: m.scrollXRev2, scrollXDev3: m.scrollXDev3 })),
      pixelSopra3: pixelSopra3.map((m) => ({ nome: m.nome, w: m.w, pixel: m.pixel })),
      maxPixel: peggioriPixel[0] ? { nome: peggioriPixel[0].nome, w: peggioriPixel[0].w, pixel: peggioriPixel[0].pixel } : null,
      peggioriPixel: peggioriPixel.map((m) => ({ nome: m.nome, w: m.w, pixel: m.pixel })),
      contenutiOk: pagineOut.length - contenutiKo.length,
      contenutiKo: contenutiKo.map((p) => ({ nome: p.nome, problemi: p.contenuti ? p.contenuti.problemi : ['non eseguito'] })),
      errori: errori.map((p) => ({ nome: p.nome, errore: p.errore })),
    },
    pagine: pagineOut,
  };
  salvaJson('step-parita.json', out);
  console.log(`\nParità completata: ${out.totaleViewport}/${out.attesiViewport} viewport | Δaltezza≠0: ${altezzeDiverse.length} | scrollX>0: ${scrollXDev3.length} | px>=3%: ${pixelSopra3.length} | contenuti OK: ${out.riepilogo.contenutiOk}/${pagineOut.length} | errori: ${errori.length}`);
  return out;
}

// --- STEP 2: GEOMETRIA SU 9 TIPOLOGIE RAPPRESENTATIVE ---
async function stepGeometria() {
  console.log(`\n=== STEP 2: GEOMETRIA (${CAMPIONE_GEOMETRIA.length} tipologie × 2 breakpoint: 1440, 390, tol=2px) ===`);
  const risultati = [];
  for (const c of CAMPIONE_GEOMETRIA) {
    for (const w of [1440, 390]) {
      const urlA = `${REV2_BASE}/${c.file}`;
      const urlB = `${DEV3}${c.percorso}`;
      const r = await runNode('geometria.js', [urlA, urlB, '--w', String(w), '--tol', '2', '--max', '30']);
      const prima = r.out.split('\n')[0] || '';
      const m = prima.match(/elementi con classe: rev2 (\d+), dev3 (\d+); senza corrispondente su dev3: (\d+); solo su dev3: (\d+); elementi con differenze: (\d+)/);
      const rec = {
        tipo: c.tipo,
        percorso: c.percorso,
        w,
        code: r.code,
        rev2Elementi: m ? +m[1] : null,
        dev3Elementi: m ? +m[2] : null,
        senzaCorrispondente: m ? +m[3] : null,
        soloDev3: m ? +m[4] : null,
        differenze: m ? +m[5] : null,
        dettagli: r.out.split('\n').slice(1, 35).join('\n').trim(),
      };
      risultati.push(rec);
      console.log(`GEO  ${c.tipo.padEnd(26)} @${w}px  rev2:${rec.rev2Elementi} dev3:${rec.dev3Elementi} mancanti:${rec.senzaCorrispondente} soloDev3:${rec.soloDev3} diff:${rec.differenze}`);
    }
  }
  const out = { timestamp: new Date().toISOString(), tolleranzaPx: 2, campioni: risultati };
  salvaJson('step-geometria.json', out);
  return out;
}

// --- STEP 3: SALUTE COMPLETA SU 51 PAGINE × 2 BREAKPOINT (1440, 390) ---
async function stepSalute() {
  console.log(`\n=== STEP 3: SALUTE PAGINE (${PAGINE_PUBBLICATE.length} pagine × 2 breakpoint: 1440, 390) ===`);
  const percorsi = PAGINE_PUBBLICATE.map((p) => p.percorso);
  const r = await runNode('salute-pagine.js', [...percorsi, '--w', '1440,390', '--parallelo', String(PARALLELO)], 600000);
  const righe = r.out.split('\n');
  const controlli = [];
  let cur = null;
  for (const l of righe) {
    const m = l.match(/^(OK  |FAIL)\s+(\S+)\s+@(\d+)px\s+H1\s+(\d+)\s+immagini\s+(\d+)(?:\s+\(senza alt (\d+)\))?/);
    if (m) {
      cur = { ok: m[1].trim() === 'OK', percorso: m[2], w: +m[3], h1: +m[4], immagini: +m[5], senzaAlt: m[6] ? +m[6] : 0, problemi: [] };
      controlli.push(cur);
    } else if (cur && l.trim().startsWith('· ')) {
      cur.problemi.push(l.trim().slice(2));
    }
  }
  const ko = controlli.filter((c) => !c.ok);
  const senzaAlt = controlli.filter((c) => c.senzaAlt > 0);
  const out = {
    timestamp: new Date().toISOString(),
    exitCode: r.code,
    totalePagine: PAGINE_PUBBLICATE.length,
    totaleControlli: controlli.length,
    ok: controlli.length - ko.length,
    ko: ko.length,
    problemi: ko,
    conImmaginiSenzaAlt: senzaAlt,
    controlli,
  };
  salvaJson('step-salute.json', out);
  console.log(`Salute: ${out.ok}/${out.totaleControlli} OK, ${out.ko} KO (immagini senza alt: ${senzaAlt.length})`);
  ko.forEach((x) => console.log(`  FAIL ${x.percorso} @${x.w}px: ${x.problemi.join(' | ')}`));
  return out;
}

// --- STEP 4: INTERAZIONI LIVE SU DEV3 VS REV2 (output PNG in tools/out/rev2/fase8/interazioni/) ---
async function stepInterazioni() {
  console.log('\n=== STEP 4: INTERAZIONI LIVE SU DEV3 VS REV2 ===');
  const intDir = path.join(OUT_DIR, 'interazioni');
  fs.mkdirSync(intDir, { recursive: true });
  const cliccaTesto = (sel, testo) => `(function () { var el = Array.prototype.slice.call(document.querySelectorAll(${JSON.stringify(sel)})).filter(function (e) { return e.textContent.replace(/\\s+/g, ' ').trim() === ${JSON.stringify(testo)} && e.getClientRects().length; })[0]; if (!el) throw new Error('non trovato: ' + ${JSON.stringify(testo)}); el.click(); return 1; })()`;

  // 4.1 Header (collaudo-header.js)
  console.log('\n-- 4.1 Header (tendina desktop, menu mobile 390/1024, accordion, 7 voci attive) --');
  const headerRes = { casi: [], vociAttive: [], ok: true };
  const casiHeader = [
    { nome: 'tendina-1440', w: 1440, h: 700, passi: ["document.querySelector('.nav__trigger').dispatchEvent(new MouseEvent('mouseenter')); 1"] },
    { nome: 'menu-mobile-390', w: 390, h: 800, passi: ["document.querySelector('.nav-toggle').click(); 1"] },
    { nome: 'menu-mobile-accordion-390', w: 390, h: 800, passi: ["document.querySelector('.nav-toggle').click(); 1", "document.querySelector('.mobile-nav__trigger').click(); 1"] },
    { nome: 'menu-mobile-1024', w: 1024, h: 700, passi: ["document.querySelector('.nav-toggle').click(); 1"] },
  ];
  for (const c of casiHeader) {
    const foto = {}; const st = {};
    for (const [lato, url] of [['rev2', `${REV2_BASE}/chi-siamo.html`], ['dev3', `${DEV3}/chi-siamo/`]]) {
      const b = await openBrowser({ width: c.w, height: c.h, mobile: c.w < 700 });
      try {
        await b.navigate(url);
        await b.evalJs("document.querySelectorAll('.otgs-development-site-front-end, #wpadminbar').forEach(function (e) { e.remove(); }); 1");
        for (const p of c.passi) { await b.evalJs(p); await sleep(250); }
        st[lato] = JSON.parse(await b.evalJs("JSON.stringify({ drop: (document.querySelector('.drop') || {}).hidden, mobile: (document.querySelector('.mobile-nav') || {}).hidden, toggle: (document.querySelector('.nav-toggle') || { getAttribute: function () { return null; } }).getAttribute('aria-expanded'), accordion: (document.querySelector('.mobile-nav__panel') || {}).hidden, overflow: document.body.style.overflow })"));
        const shot = await b.send('Page.captureScreenshot', { format: 'png' });
        foto[lato] = path.join(intDir, `header-${c.nome}-${lato}.png`);
        fs.writeFileSync(foto[lato], Buffer.from(shot.result.data, 'base64'));
      } finally { await b.close(); }
    }
    const r = comparePngs(foto.rev2, foto.dev3, { tol: 10, diffOut: path.join(intDir, `header-${c.nome}-diff.png`) });
    const statoUguale = JSON.stringify(st.rev2) === JSON.stringify(st.dev3);
    const ok = r.percentuale < 0.5 && statoUguale;
    headerRes.ok = headerRes.ok && ok;
    headerRes.casi.push({ nome: c.nome, w: c.w, pixel: r.percentuale, statoUguale, ok, rev2: st.rev2, dev3: st.dev3 });
    console.log(`${ok ? 'OK  ' : 'DIFF'} header/${c.nome}: px ${r.percentuale}%, stato ${statoUguale ? 'identico' : 'DIVERSO'}`);
  }
  {
    const b = await openBrowser({ width: 1440, height: 700 });
    try {
      await b.navigate(`${DEV3}/chi-siamo/`);
      const leggiAttive = (percorso) => {
        window.ArtesRev2.marcaAttivo(percorso);
        return JSON.stringify(Array.from(document.querySelectorAll('.topbar__right > a.is-active, .nav > a.is-active, .nav__trigger.is-active')).map(function (a) { return a.textContent.replace(/\s+/g, ' ').trim(); }));
      };
      for (const [percorso, atteso] of [
        ['/chi-siamo/', 'Chi siamo'],
        ['/arredamento-ufficio/', 'Arredo uffici e workspace'],
        ['/contract/', 'Arredo Contract'],
        ['/realizzazioni/', 'Realizzazioni'],
        ['/realizzazioni/royal-hotel/', 'Realizzazioni'],
        ['/brand-partner/frezza/', ''],
        ['/', ''],
      ]) {
        const attive = JSON.parse(await b.evalJs('(' + leggiAttive.toString() + ')(' + JSON.stringify(percorso) + ')'));
        const ok = (atteso === '' ? attive.length === 0 : attive.length === 1 && attive[0] === atteso);
        headerRes.ok = headerRes.ok && ok;
        headerRes.vociAttive.push({ percorso, atteso, attive, ok });
        console.log(`${ok ? 'OK  ' : 'DIFF'} header/voce-attiva ${percorso}: ${JSON.stringify(attive)}`);
      }
    } finally { await b.close(); }
  }

  // 4.2 Fase 5 Home (collaudo-fase5.js home)
  console.log('\n-- 4.2 Home (slider produzione, filtri progetti, pallini metodo mobile) --');
  const homeRes = { casi: [], ok: true };
  const statoHome = () => {
    var vis = function (sel) { return Array.prototype.slice.call(document.querySelectorAll(sel)).filter(function (e) { return e.getClientRects().length; }); };
    var slides = Array.prototype.slice.call(document.querySelectorAll('.produzione-slide'));
    var progs = vis('.realizzazioni .progetto');
    var dots = Array.prototype.slice.call(document.querySelectorAll('.steps-dots button'));
    return JSON.stringify({
      slideAttiva: slides.findIndex(function (s) { return s.classList.contains('is-active'); }),
      sliderCount: (document.querySelector('.produzione-slider__count') || {}).textContent || '',
      progettiVisibili: progs.length,
      nomiProgetti: progs.map(function (p) { return (p.querySelector('.progetto__nome') || {}).textContent.trim(); }),
      filtroAttivo: vis('.realizzazioni .filtro.is-active').map(function (b) { return b.textContent.trim(); }),
      dotsCount: dots.length,
      dotAttivo: dots.findIndex(function (b) { return b.classList.contains('is-active'); }),
    });
  };
  const casiHome = [
    { nome: 'slider-next', w: 1440, h: 1000, sel: '.produzione', passi: ["document.querySelectorAll('.produzione-slider__controls button')[1].click(); 1"] },
    { nome: 'slider-prev', w: 1440, h: 1000, sel: '.produzione', passi: ["document.querySelectorAll('.produzione-slider__controls button')[1].click(); 1", "document.querySelectorAll('.produzione-slider__controls button')[0].click(); 1"] },
    { nome: 'filtri-uffici', w: 1440, h: 1100, sel: '.realizzazioni', passi: [cliccaTesto('.realizzazioni .filtro', 'Uffici e workspace')] },
    { nome: 'filtri-hospitality', w: 1440, h: 1100, sel: '.realizzazioni', passi: [cliccaTesto('.realizzazioni .filtro', 'Hotel e hospitality')] },
    { nome: 'steps-mobile', w: 390, h: 900, sel: '.metodo--steps', passi: ["document.querySelectorAll('.steps-dots button')[2].click(); 1"] },
  ];
  for (const c of casiHome) {
    const foto = {}; const st = {};
    for (const [lato, url] of [['rev2', `${REV2_BASE}/index.html`], ['dev3', `${DEV3}/`]]) {
      const b = await openBrowser({ width: c.w, height: c.h, mobile: c.w < 700 });
      try {
        await b.navigate(url);
        await b.evalJs("document.querySelectorAll('.otgs-development-site-front-end, #wpadminbar').forEach(function (e) { e.remove(); }); 1");
        for (const p of c.passi) { await b.evalJs(p); await sleep(350); }
        await sleep(500);
        st[lato] = JSON.parse(await b.evalJs(`(${statoHome.toString()})()`));
        foto[lato] = path.join(intDir, `home-${c.nome}-${lato}.png`);
        await b.screenshotSelettore(c.sel, foto[lato]);
      } finally { await b.close(); }
    }
    const r = comparePngs(foto.rev2, foto.dev3, { tol: 10, diffOut: path.join(intDir, `home-${c.nome}-diff.png`) });
    const statoUguale = JSON.stringify(st.rev2) === JSON.stringify(st.dev3);
    const ok = statoUguale && r.percentuale < 3;
    homeRes.ok = homeRes.ok && ok;
    homeRes.casi.push({ nome: c.nome, w: c.w, pixel: r.percentuale, statoUguale, ok, rev2: st.rev2, dev3: st.dev3 });
    console.log(`${ok ? 'OK  ' : 'DIFF'} home/${c.nome}: px ${r.percentuale}%, stato ${statoUguale ? 'identico' : 'DIVERSO'}`);
  }

  // 4.3 Fase 5 Settori FAQ (collaudo-fase5.js faq + FAQPage JSON-LD su tutti e 5 i settori)
  console.log('\n-- 4.3 Settori FAQ (accordion su arredamento-ufficio + FAQPage JSON-LD su tutti i 5 settori) --');
  const faqRes = { casi: [], jsonLdSettori: [], ok: true };
  const statoFaq = () => {
    var items = Array.prototype.slice.call(document.querySelectorAll('.faq__item'));
    var ld = Array.prototype.slice.call(document.querySelectorAll('script[type="application/ld+json"]')).some(function (s) { return /FAQPage/.test(s.textContent || ''); });
    return JSON.stringify({ totale: items.length, aperti: items.map(function (d) { return d.hasAttribute('open'); }), faqSchema: ld });
  };
  const casiFaq = [
    { nome: 'chiuse', w: 1440, h: 1000, sel: '.faq', passi: [] },
    { nome: 'aperta-1', w: 1440, h: 1000, sel: '.faq', passi: ["document.querySelectorAll('.faq__item summary')[0].click(); 1"] },
    { nome: 'aperte-2', w: 1440, h: 1000, sel: '.faq', passi: ["document.querySelectorAll('.faq__item summary')[0].click(); 1", "document.querySelectorAll('.faq__item summary')[2].click(); 1"] },
    { nome: 'aperta-390', w: 390, h: 900, sel: '.faq', passi: ["document.querySelectorAll('.faq__item summary')[0].click(); 1"] },
  ];
  for (const c of casiFaq) {
    const foto = {}; const st = {};
    for (const [lato, url] of [['rev2', `${REV2_BASE}/arredamento-ufficio.html`], ['dev3', `${DEV3}/arredamento-ufficio/`]]) {
      const b = await openBrowser({ width: c.w, height: c.h, mobile: c.w < 700 });
      try {
        await b.navigate(url);
        await b.evalJs("document.querySelectorAll('.otgs-development-site-front-end, #wpadminbar').forEach(function (e) { e.remove(); }); 1");
        for (const p of c.passi) { await b.evalJs(p); await sleep(350); }
        await sleep(500);
        st[lato] = JSON.parse(await b.evalJs(`(${statoFaq.toString()})()`));
        foto[lato] = path.join(intDir, `faq-${c.nome}-${lato}.png`);
        await b.screenshotSelettore(c.sel, foto[lato]);
      } finally { await b.close(); }
    }
    const r = comparePngs(foto.rev2, foto.dev3, { tol: 10, diffOut: path.join(intDir, `faq-${c.nome}-diff.png`) });
    const statoUguale = JSON.stringify({ totale: st.rev2.totale, aperti: st.rev2.aperti }) === JSON.stringify({ totale: st.dev3.totale, aperti: st.dev3.aperti });
    const ok = statoUguale && r.percentuale < 3 && st.dev3.faqSchema === true;
    faqRes.ok = faqRes.ok && ok;
    faqRes.casi.push({ nome: c.nome, w: c.w, pixel: r.percentuale, statoUguale, faqSchemaDev3: st.dev3.faqSchema, ok });
    console.log(`${ok ? 'OK  ' : 'DIFF'} faq/${c.nome}: px ${r.percentuale}%, stato ${statoUguale ? 'identico' : 'DIVERSO'}, FAQPage JSON-LD: ${st.dev3.faqSchema}`);
  }
  // Verifica FAQPage JSON-LD e 5 FAQ su tutti i 5 settori via fetch
  for (const s of PAGINE_STATICHE.filter((x) => x.gruppo === 'settori')) {
    const html = await (await fetch(DEV3 + s.percorso)).text();
    const haFaqLd = /"@type"\s*:\s*"FAQPage"/.test(html);
    const nFaq = (html.match(/class="[^"]*\bfaq__item\b/g) || []).length;
    const ok = haFaqLd && nFaq === 5;
    faqRes.ok = faqRes.ok && ok;
    faqRes.jsonLdSettori.push({ percorso: s.percorso, haFaqLd, nFaq, ok });
    console.log(`${ok ? 'OK  ' : 'DIFF'} faq-schema ${s.percorso}: FAQPage=${haFaqLd}, faq__item=${nFaq}`);
  }

  // 4.4 Archivi (collaudo-archivi.js realizzazioni + brand)
  console.log('\n-- 4.4 Archivi (realizzazioni 2 livelli + query URL; brand partner) --');
  const archiviRes = { realizzazioni: [], brand: [], ok: true };
  const statoArchivio = () => {
    var visibili = function (sel) { return Array.prototype.slice.call(document.querySelectorAll(sel)).filter(function (e) { return e.getClientRects().length; }); };
    var sel = document.querySelector('.archivio') ? '.progetto' : '.brand';
    var cards = visibili((document.querySelector('.archivio') ? '.archivio ' : '.brands ') + sel);
    return JSON.stringify({
      conteggio: (document.querySelector('.archivio__count') || {}).textContent || null,
      schede: cards.length,
      nomi: cards.slice(0, 40).map(function (c) { var n = c.querySelector('.progetto__nome, .brand__n'); return n ? n.textContent.replace(/\s+/g, ' ').trim() : ''; }),
      attivi: visibili('.is-active').filter(function (e) { return /settori-tabs__btn|filtro/.test(e.className); }).map(function (e) { return e.textContent.replace(/\s+/g, ' ').trim(); }),
      gruppoVisibile: visibili('.filtri--categorie').length,
      vuoto: visibili('.progetti__empty').length,
      indirizzo: location.search,
    });
  };
  const casiArchivi = {
    realizzazioni: {
      urlA: `${REV2_BASE}/realizzazioni.html`,
      urlB: `${DEV3}/realizzazioni/`,
      casi: [
        { nome: 'iniziale', w: 1440, h: 1100, passi: [] },
        { nome: 'tab-uffici', w: 1440, h: 1100, passi: [cliccaTesto('.settori-tabs__btn', 'Arredo uffici e workspace')] },
        { nome: 'categoria-enti', w: 1440, h: 1100, passi: [cliccaTesto('.settori-tabs__btn', 'Arredo uffici e workspace'), cliccaTesto('.filtri--categorie .filtro', 'Enti e istituzioni')] },
        { nome: 'tab-hospitality-vuota', w: 1440, h: 1100, passi: [cliccaTesto('.settori-tabs__btn', 'Arredo hotel e hospitality'), cliccaTesto('.filtri--categorie .filtro', 'Student housing e co-living')] },
        { nome: 'url-retail-moda', w: 1440, h: 1100, query: '?settore=retail&categoria=moda-e-sport', passi: [] },
        { nome: 'tab-food-390', w: 390, h: 900, passi: [cliccaTesto('.settori-tabs__btn', 'Arredo negozi food')] },
      ],
    },
    brand: {
      urlA: `${REV2_BASE}/brand-partner.html`,
      urlB: `${DEV3}/brand-partner/`,
      casi: [
        { nome: 'iniziale', w: 1440, h: 1100, passi: [] },
        { nome: 'sedute', w: 1440, h: 1100, passi: [cliccaTesto('.filtro', 'Sedute')] },
        { nome: 'acustica', w: 1440, h: 1100, passi: [cliccaTesto('.filtro', 'Acustica')] },
        { nome: 'outdoor-390', w: 390, h: 900, passi: [cliccaTesto('.filtro', 'Outdoor')] },
      ],
    },
  };
  for (const [tipo, cfg] of Object.entries(casiArchivi)) {
    for (const c of cfg.casi) {
      const foto = {}; const st = {};
      for (const [lato, base] of [['rev2', cfg.urlA], ['dev3', cfg.urlB]]) {
        const url = c.query ? base + c.query : base;
        const b = await openBrowser({ width: c.w, height: c.h, mobile: c.w < 700 });
        try {
          await b.navigate(url);
          await b.evalJs("document.querySelectorAll('.otgs-development-site-front-end, #wpadminbar').forEach(function (e) { e.remove(); }); 1");
          for (const p of c.passi) { await b.evalJs(p); await sleep(300); }
          await sleep(500);
          st[lato] = JSON.parse(await b.evalJs(`(${statoArchivio.toString()})()`));
          st[lato].indirizzo = (st[lato].indirizzo.match(/(settore|categoria)=[^&]*/g) || []).join('&');
          foto[lato] = path.join(intDir, `archivio-${tipo}-${c.nome}-${lato}.png`);
          await b.screenshotSelettore(lato === 'rev2' ? 'main' : '.page-root', foto[lato]);
        } finally { await b.close(); }
      }
      const r = comparePngs(foto.rev2, foto.dev3, { tol: 10, diffOut: path.join(intDir, `archivio-${tipo}-${c.nome}-diff.png`) });
      const statoUguale = JSON.stringify(st.rev2) === JSON.stringify(st.dev3);
      const ok = statoUguale && r.percentuale < 3;
      archiviRes.ok = archiviRes.ok && ok;
      archiviRes[tipo].push({ nome: c.nome, w: c.w, pixel: r.percentuale, statoUguale, schedeRev2: st.rev2.schede, schedeDev3: st.dev3.schede, conteggio: st.dev3.conteggio, indirizzo: st.dev3.indirizzo, ok });
      console.log(`${ok ? 'OK  ' : 'DIFF'} archivio-${tipo}/${c.nome}: px ${r.percentuale}%, schede ${st.rev2.schede}/${st.dev3.schede}, stato ${statoUguale ? 'identico' : 'DIVERSO'}`);
    }
  }

  // 4.5 Schede Lightbox (collaudo-schede.js + frecce + Escape)
  console.log('\n-- 4.5 Schede Lightbox (apertura, frecce click/tastiera, terza foto, Escape, mobile 390) --');
  const schedeRes = { casi: [], ok: true };
  const statoLb = () => JSON.stringify({
    aperta: !!document.querySelector('.lightbox') && !document.querySelector('.lightbox').hidden,
    conteggio: (document.querySelector('.lightbox__count') || {}).textContent,
    didascalia: (document.querySelector('.lightbox__caption') || {}).textContent,
    alt: (document.querySelector('.lightbox__img') || {}).alt,
    scroll: document.body.classList.contains('has-lightbox'),
  });
  const casiSchede = [
    { nome: 'lightbox-apri-1440', w: 1440, h: 900, passi: ["document.querySelector('.caso-gallery__open').click(); 1"] },
    { nome: 'lightbox-avanti-tastiera-1440', w: 1440, h: 900, passi: ["document.querySelector('.caso-gallery__open').click(); 1", "document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' })); 1"] },
    { nome: 'lightbox-frecce-click-1440', w: 1440, h: 900, passi: ["document.querySelector('.caso-gallery__open').click(); 1", "document.querySelector('.lightbox__next').click(); 1", "document.querySelector('.lightbox__next').click(); 1", "document.querySelector('.lightbox__prev').click(); 1"] },
    { nome: 'lightbox-terza-1440', w: 1440, h: 900, passi: ["document.querySelectorAll('.caso-gallery__item')[2].click(); 1"] },
    { nome: 'lightbox-chiudi-esc-1440', w: 1440, h: 900, passi: ["document.querySelector('.caso-gallery__open').click(); 1", "document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })); 1"], noShotDiff: true },
    { nome: 'lightbox-apri-390', w: 390, h: 800, passi: ["document.querySelector('.caso-gallery__open').click(); 1"] },
  ];
  for (const c of casiSchede) {
    const foto = {}; const st = {};
    for (const [lato, url] of [['rev2', `${REV2_BASE}/realizzazione-arpacal.html`], ['dev3', `${DEV3}/realizzazioni/arpacal/`]]) {
      const b = await openBrowser({ width: c.w, height: c.h, mobile: c.w < 700 });
      try {
        await b.navigate(url);
        await b.evalJs("document.querySelectorAll('.otgs-development-site-front-end, #wpadminbar').forEach(function (e) { e.remove(); }); 1");
        for (const p of c.passi) { await b.evalJs(p); await sleep(350); }
        await sleep(400);
        st[lato] = JSON.parse(await b.evalJs(`(${statoLb.toString()})()`));
        if (!c.noShotDiff) {
          const shot = await b.send('Page.captureScreenshot', { format: 'png' });
          foto[lato] = path.join(intDir, `schede-${c.nome}-${lato}.png`);
          fs.writeFileSync(foto[lato], Buffer.from(shot.result.data, 'base64'));
        }
      } finally { await b.close(); }
    }
    let px = 0;
    if (!c.noShotDiff) {
      const r = comparePngs(foto.rev2, foto.dev3, { tol: 10, diffOut: path.join(intDir, `schede-${c.nome}-diff.png`) });
      px = r.percentuale;
    }
    const statoUguale = JSON.stringify(st.rev2) === JSON.stringify(st.dev3);
    const extraEscOk = c.nome === 'lightbox-chiudi-esc-1440' ? (st.dev3.aperta === false && st.dev3.scroll === false) : true;
    const ok = statoUguale && px < 1.5 && extraEscOk;
    schedeRes.ok = schedeRes.ok && ok;
    schedeRes.casi.push({ nome: c.nome, w: c.w, pixel: px, statoUguale, ok, dev3: st.dev3 });
    console.log(`${ok ? 'OK  ' : 'DIFF'} schede/${c.nome}: px ${px}%, aperta=${st.dev3.aperta}, count="${st.dev3.conteggio}", stato ${statoUguale ? 'identico' : 'DIVERSO'}`);
  }

  const out = {
    timestamp: new Date().toISOString(),
    tuttoOk: headerRes.ok && homeRes.ok && faqRes.ok && archiviRes.ok && schedeRes.ok,
    header: headerRes,
    fase5Home: homeRes,
    fase5Faq: faqRes,
    archivi: archiviRes,
    schede: schedeRes,
  };
  salvaJson('step-interazioni.json', out);
  console.log(`\nInterazioni: ${out.tuttoOk ? 'TUTTE OK' : 'CI SONO DIFFERENZE'}`);
  return out;
}

// --- STEP 5: LINK INTERNI (51 PAGINE), 0 LINK VERSO 6 BOZZE, REDIRECT (17 CASI), 404 BOZZE (6 CASI) ---
async function stepLink() {
  console.log(`\n=== STEP 5: LINK INTERNI (${PAGINE_PUBBLICATE.length} pagine), REDIRECT, 404 BOZZE ===`);
  const elencoFile = path.join(OUT_DIR, 'elenco-51.txt');
  fs.writeFileSync(elencoFile, PAGINE_PUBBLICATE.map((p) => p.percorso).join('\n') + '\n');

  // 5.1 controllo-link.js su tutte le 51 pagine
  const rLink = await runNode('controllo-link.js', [`@${elencoFile}`], 300000);
  const mLink = rLink.out.match(/pagine controllate: (\d+); link interni distinti verificati: (\d+); collegamenti letti: (\d+)/);
  console.log(`controllo-link.js (exit ${rLink.code}): ${rLink.out.split('\n').slice(0, 5).join(' | ')}`);

  // 5.2 Scansione esplicita di tutti i link interni sulle 51 pagine per verificare che nessuno punti alle 6 bozze
  const slugBozze = new Set(PAGINE_BOZZE.map((b) => '/' + b.slug));
  const linkVersoBozze = [];
  for (const p of PAGINE_PUBBLICATE) {
    const res = await fetch(DEV3 + p.percorso, { redirect: 'follow' });
    const html = await res.text();
    for (const m of html.matchAll(/<a\b[^>]*\shref=["']([^"'#][^"']*)["']/gi)) {
      try {
        const u = new URL(m[1].replace(/&amp;/g, '&'), DEV3 + p.percorso);
        if (u.origin !== DEV3) continue;
        const norm = u.pathname.replace(/\/+$/, '');
        if (slugBozze.has(norm)) {
          linkVersoBozze.push({ da: p.percorso, verso: u.pathname + u.search + u.hash });
        }
      } catch { /* ignore */ }
    }
  }
  console.log(`Link verso le 6 pagine in bozza: ${linkVersoBozze.length}`);

  // 5.3 collaudo-redirect.js
  const rRedir = await runNode('collaudo-redirect.js', [DEV3], 120000);
  const redirRighe = rRedir.out.split('\n').filter((l) => /^(OK  |FAIL)/.test(l));
  const redirOk = redirRighe.filter((l) => l.startsWith('OK  ')).length;
  console.log(`collaudo-redirect.js (exit ${rRedir.code}): ${redirOk}/${redirRighe.length} OK`);

  // 5.4 Verifica 404 pubblico delle 6 pagine in bozza
  const bozzeEsiti = [];
  for (const b of PAGINE_BOZZE) {
    const resp = await fetch(DEV3 + b.percorso, { redirect: 'manual' });
    const ok = resp.status === 404;
    bozzeEsiti.push({ id: b.id, slug: b.slug, percorso: b.percorso, status: resp.status, location: resp.headers.get('location') || null, ok });
    console.log(`${ok ? 'OK  ' : 'FAIL'} bozza ${b.percorso} -> HTTP ${resp.status}`);
  }

  const out = {
    timestamp: new Date().toISOString(),
    controlloLink: {
      ok: rLink.code === 0,
      pagineControllate: mLink ? +mLink[1] : null,
      linkDistinti: mLink ? +mLink[2] : null,
      collegamentiLetti: mLink ? +mLink[3] : null,
      output: rLink.out,
    },
    linkVersoBozze: {
      ok: linkVersoBozze.length === 0,
      trovati: linkVersoBozze,
    },
    redirect: {
      ok: rRedir.code === 0,
      superati: redirOk,
      totale: redirRighe.length,
      dettagli: redirRighe,
    },
    bozze404: {
      ok: bozzeEsiti.every((x) => x.ok),
      superati: bozzeEsiti.filter((x) => x.ok).length,
      totale: bozzeEsiti.length,
      dettagli: bozzeEsiti,
    },
  };
  salvaJson('step-link.json', out);
  return out;
}

// --- STEP 5B: VERIFICA FOOTER .footer__bottom a + SCREENSHOT PRIVACY/COOKIE + 301 /page/2/ ---
async function stepFooterLegali() {
  console.log('\n=== STEP 5B: VERIFICA FOOTER (.footer__bottom a), SCREENSHOT PRIVACY/COOKIE, 301 /page/2/ ===');
  const fase6Dir = path.join(ROOT, 'tools', 'out', 'rev2', 'fase6');
  fs.mkdirSync(fase6Dir, { recursive: true });
  const legali = [
    { nome: 'privacy', percorso: '/privacy-policy/' },
    { nome: 'cookie', percorso: '/cookie-policy/' },
  ];
  const stiliFooter = [];
  for (const p of legali) {
    for (const w of [1440, 390]) {
      const b = await openBrowser({ width: w, height: 900, mobile: w < 700 });
      try {
        await b.navigate(DEV3 + p.percorso);
        await b.evalJs("document.querySelectorAll('.otgs-development-site-front-end, #wpadminbar').forEach(function (e) { e.remove(); }); 1");
        const shotPath = path.join(fase6Dir, `${p.nome}@${w}.png`);
        const rShot = await b.screenshotFull(shotPath);
        const info = JSON.parse(await b.evalJs(`(() => {
          const span = document.querySelector('.footer__bottom span');
          const links = Array.from(document.querySelectorAll('.footer__bottom a'));
          const csSpan = span ? getComputedStyle(span) : null;
          return JSON.stringify({
            spanColor: csSpan ? csSpan.color : null,
            links: links.map((a) => {
              const cs = getComputedStyle(a);
              return { testo: a.textContent.trim(), href: a.getAttribute('href'), color: cs.color, display: cs.display, minHeight: cs.minHeight };
            }),
          });
        })()`));
        const ok = info.links.length === 3 && info.links.every((l) => l.color === info.spanColor && l.display === 'inline' && l.minHeight === '0px');
        stiliFooter.push({ pagina: p.percorso, w, altezza: rShot.height, screenshot: shotPath, ...info, ok });
        console.log(`${ok ? 'OK  ' : 'DIFF'} footer ${p.percorso} @${w}px: span=${info.spanColor}, links=${info.links.length} (${info.links.map((l) => `${l.testo}:${l.color}/${l.display}/${l.minHeight}`).join(', ')})`);
      } finally { await b.close(); }
    }
  }
  const paged301 = [];
  for (const [src, atteso] of [['/realizzazioni/page/2/', '/realizzazioni/'], ['/brand-partner/page/2/', '/brand-partner/']]) {
    const r = await fetch(DEV3 + src, { redirect: 'manual' });
    const loc = r.headers.get('location') || '';
    const locRel = loc.replace(DEV3, '');
    const ok = r.status === 301 && locRel === atteso;
    paged301.push({ percorso: src, status: r.status, location: locRel, atteso, ok });
    console.log(`${ok ? 'OK  ' : 'FAIL'} redirect ${src} -> ${r.status} ${locRel}`);
  }
  const seoPath = path.join(ROOT, 'tools', 'out', 'rev2', 'fase7-seo-report.json');
  let seoRef = null;
  if (fs.existsSync(seoPath)) {
    const j = JSON.parse(fs.readFileSync(seoPath, 'utf8'));
    seoRef = {
      file: 'tools/out/rev2/fase7-seo-report.json',
      totale: j.totale ?? (j.pagine ? j.pagine.length : null),
      ok: j.ok ?? (j.pagine ? j.pagine.filter((x) => x.ok).length : null),
      ko: j.ko ?? (j.pagine ? j.pagine.filter((x) => !x.ok).length : null),
    };
  }
  const out = {
    timestamp: new Date().toISOString(),
    footerOk: stiliFooter.every((x) => x.ok),
    stiliFooter,
    paged301Ok: paged301.every((x) => x.ok),
    paged301,
    seoRef,
  };
  salvaJson('step-footer-legali.json', out);
  return out;
}

// --- STEP 6: REPORT JSON + RIEPILOGO MARKDOWN ---
function stepReport() {
  const parita = leggiJson('step-parita.json');
  const geometria = leggiJson('step-geometria.json');
  const salute = leggiJson('step-salute.json');
  const interazioni = leggiJson('step-interazioni.json');
  const link = leggiJson('step-link.json');
  const footerLegali = leggiJson('step-footer-legali.json');

  const report = {
    fase: 'Fase 8 — Collaudo completo di parità (IT)',
    generatoIl: new Date().toISOString(),
    target: DEV3,
    ambito: 'Solo IT (senza selettore IT/EN e senza pagine WPML/EN)',
    parita,
    geometria,
    salute,
    interazioni,
    link,
    footerLegali,
  };
  const jsonPath = salvaJson('report-fase8.json', report);

  const md = [];
  md.push('# Riepilogo Collaudo Fase 8 — Parità completa IT (`dev3` vs `rev2`)');
  md.push('');
  md.push(`**Data:** ${report.generatoIl} · **Target:** \`${DEV3}\` · **Ambito:** solo italiano (escluso selettore \`IT / EN\` e pagine EN/WPML).`);
  md.push('');

  md.push('## 1. Sintesi esecutiva');
  md.push('');
  md.push('| Area | Copertura | Esito | Note |');
  md.push('|---|---|---|---|');
  if (parita) {
    const r = parita.riepilogo;
    const altOk = r.altezzeDiverse.length === 0;
    const contOk = r.contenutiKo.length === 0;
    const sxNote = r.scrollXDev3.length
      ? r.scrollXDev3.map((x) => `${x.nome}@${x.w}px (rev2:${x.scrollXRev2}px / dev3:${x.scrollXDev3}px)`).join(', ')
      : '0 px ovunque';
    md.push(`| Parità visiva + contenuti | ${parita.totalePagine}/49 pagine × ${parita.breakpoint.length} breakpoint (${parita.totaleViewport}/${parita.attesiViewport} viewport) | ${altOk && contOk && r.errori.length === 0 ? '**OK**' : '**ATTENZIONE**'} | Δ altezza ≠ 0: ${r.altezzeDiverse.length}; contenuti OK: ${r.contenutiOk}/${parita.totalePagine}; max pixel diff: ${r.maxPixel ? `${r.maxPixel.pixel}% (${r.maxPixel.nome}@${r.maxPixel.w})` : '-'}; scroll X: ${sxNote} |`);
  }
  if (geometria) {
    const tot = geometria.campioni.length;
    const conDiff = geometria.campioni.filter((c) => c.differenze > 0 || c.senzaCorrispondente > 0).length;
    md.push(`| Geometria (` + '`geometria.js`' + `) | ${tot} controlli (9 tipologie × 1440/390, tol ±${geometria.tolleranzaPx}px) | ${conDiff === 0 ? '**OK**' : `**${tot - conDiff}/${tot} a 0 diff**`} | ${conDiff ? `${conDiff} campioni con differenze segnalate (vedi §3)` : '0 differenze oltre ±2px'} |`);
  }
  if (salute) {
    md.push(`| Salute completa (` + '`salute-pagine.js`' + `) | ${salute.totalePagine}/51 pagine × 2 breakpoint (${salute.totaleControlli} controlli) | ${salute.ko === 0 ? '**OK**' : `**${salute.ko} KO**`} | ${salute.ok}/${salute.totaleControlli} superati (escluso 404 noto \`/favicon.ico\`) |`);
  }
  if (interazioni) {
    md.push(`| Interazioni live | Header (4+7), Home (5), FAQ (4+5 schema), Archivi (6+4), Lightbox (6) | ${interazioni.tuttoOk ? '**OK**' : '**DIFF**'} | Header:${interazioni.header.ok ? 'OK' : 'KO'} · Home:${interazioni.fase5Home.ok ? 'OK' : 'KO'} · FAQ:${interazioni.fase5Faq.ok ? 'OK' : 'KO'} · Archivi:${interazioni.archivi.ok ? 'OK' : 'KO'} · Schede:${interazioni.schede.ok ? 'OK' : 'KO'} |`);
  }
  if (link) {
    md.push(`| Link interni, redirect e bozze | ${link.controlloLink.pagineControllate}/51 pagine · ${link.controlloLink.linkDistinti} link distinti · ${link.redirect.totale} redirect · ${link.bozze404.totale} bozze | ${link.controlloLink.ok && link.linkVersoBozze.ok && link.redirect.ok && link.bozze404.ok ? '**OK**' : '**KO**'} | Link rotti: ${link.controlloLink.ok ? '0' : 'SÌ'}; link a bozze: ${link.linkVersoBozze.trovati.length}; redirect: ${link.redirect.superati}/${link.redirect.totale}; 404 bozze: ${link.bozze404.superati}/${link.bozze404.totale} |`);
  }
  md.push('');

  if (parita) {
    md.push('## 2. Parità 49 pagine × 4 breakpoint (1440, 1024, 768, 390 px)');
    md.push('');
    const r = parita.riepilogo;
    md.push(`- **Viewport verificati:** ${parita.totaleViewport}/${parita.attesiViewport}`);
    md.push(`- **Altezze diverse (Δ ≠ 0):** ${r.altezzeDiverse.length}` + (r.altezzeDiverse.length ? ' — ' + r.altezzeDiverse.map((x) => `\`${x.nome}@${x.w}\` (${x.rev2}→${x.dev3}, Δ${x.delta})`).join(', ') : ''));
    md.push(`- **Scroll orizzontale dev3 (> 0 px):** ${r.scrollXDev3.length}` + (r.scrollXDev3.length ? ' — ' + r.scrollXDev3.map((x) => `\`${x.nome}@${x.w}\`: rev2=${x.scrollXRev2}px / dev3=${x.scrollXDev3}px`).join(', ') : ''));
    md.push(`- **Viewport con pixel diff ≥ 3%:** ${r.pixelSopra3.length}` + (r.pixelSopra3.length ? ' — ' + r.pixelSopra3.map((x) => `\`${x.nome}@${x.w}\` (${x.pixel}%)`).join(', ') : ''));
    md.push(`- **Top 10 pixel diff:** ` + r.peggioriPixel.map((x) => `\`${x.nome}@${x.w}\` ${x.pixel}%`).join(', '));
    md.push(`- **Contenuti normalizzati (testi, titoli, link, immagini/alt):** ${r.contenutiOk}/${parita.totalePagine} identici`);
    if (r.contenutiKo.length) {
      md.push('');
      md.push('### Differenze di contenuto');
      for (const c of r.contenutiKo) {
        md.push(`- \`${c.nome}\`: ${c.problemi.slice(0, 5).join(' ; ')}`);
      }
    }
    if (r.errori.length) {
      md.push('');
      md.push('### Errori di cattura');
      for (const e of r.errori) md.push(`- \`${e.nome}\`: ${e.errore}`);
    }
    md.push('');
    md.push('<details><summary>Tabella completa 49 pagine × 4 breakpoint</summary>');
    md.push('');
    md.push('| Pagina | Gruppo | 1440 px | 1024 px | 768 px | 390 px | Contenuti |');
    md.push('|---|---|---|---|---|---|---|');
    for (const p of parita.pagine) {
      const cell = (w) => {
        const m = p.misure.find((x) => x.w === w);
        if (!m) return 'ERR';
        return `Δ${m.delta} · ${m.pixel}%${m.scrollXDev3 ? ` · sx${m.scrollXDev3}` : ''}`;
      };
      md.push(`| \`${p.percorso}\` | ${p.gruppo} | ${cell(1440)} | ${cell(1024)} | ${cell(768)} | ${cell(390)} | ${p.contenuti && p.contenuti.ok ? 'OK' : 'DIFF'} |`);
    }
    md.push('');
    md.push('</details>');
    md.push('');
  }

  if (geometria) {
    md.push('## 3. Controllo geometria (`geometria.js`, tol ±2 px)');
    md.push('');
    md.push('| Tipologia | Percorso | Width | Elementi rev2/dev3 | Mancanti | Solo dev3 | Differenze |');
    md.push('|---|---|---:|---:|---:|---:|---:|');
    for (const c of geometria.campioni) {
      md.push(`| ${c.tipo} | \`${c.percorso}\` | ${c.w} | ${c.rev2Elementi}/${c.dev3Elementi} | ${c.senzaCorrispondente} | ${c.soloDev3} | ${c.differenze} |`);
    }
    const conDettagli = geometria.campioni.filter((c) => c.differenze > 0 || c.senzaCorrispondente > 0);
    if (conDettagli.length) {
      md.push('');
      md.push('### Dettaglio scostamenti geometria');
      for (const c of conDettagli) {
        md.push(`\n**${c.tipo} @${c.w}px** (\`${c.percorso}\`):`);
        md.push('```');
        md.push(c.dettagli.slice(0, 1500));
        md.push('```');
      }
    }
    md.push('');
  }

  if (salute) {
    md.push('## 4. Salute completa (51 pagine pubblicate × 1440/390 px)');
    md.push('');
    md.push(`- **Controlli superati:** ${salute.ok}/${salute.totaleControlli} (${salute.totalePagine} pagine × 2 breakpoint)`);
    md.push(`- **Controlli con problemi:** ${salute.ko}`);
    md.push(`- **Pagine con immagini senza attributo \`alt\`:** ${salute.conImmaginiSenzaAlt.length}`);
    if (salute.problemi.length) {
      md.push('');
      for (const x of salute.problemi) md.push(`- \`${x.percorso}\` @${x.w}px: ${x.problemi.join(' ; ')}`);
    }
    md.push('');
  }

  if (interazioni) {
    md.push('## 5. Interazioni live (`dev3` vs `rev2`)');
    md.push('');
    md.push(`- **Header:** ${interazioni.header.casi.filter((x) => x.ok).length}/${interazioni.header.casi.length} casi visivi OK (` + interazioni.header.casi.map((x) => `${x.nome}:${x.pixel}%`).join(', ') + `); voci attive ${interazioni.header.vociAttive.filter((x) => x.ok).length}/${interazioni.header.vociAttive.length} OK.`);
    md.push(`- **Home (Fase 5):** ${interazioni.fase5Home.casi.filter((x) => x.ok).length}/${interazioni.fase5Home.casi.length} casi OK (` + interazioni.fase5Home.casi.map((x) => `${x.nome}:${x.pixel}%`).join(', ') + ').');
    md.push(`- **Settori FAQ (Fase 5):** ${interazioni.fase5Faq.casi.filter((x) => x.ok).length}/${interazioni.fase5Faq.casi.length} casi accordion OK (` + interazioni.fase5Faq.casi.map((x) => `${x.nome}:${x.pixel}%`).join(', ') + `); \`FAQPage\` JSON-LD presente su ${interazioni.fase5Faq.jsonLdSettori.filter((x) => x.ok).length}/${interazioni.fase5Faq.jsonLdSettori.length} pagine settore.`);
    md.push(`- **Archivio Realizzazioni:** ${interazioni.archivi.realizzazioni.filter((x) => x.ok).length}/${interazioni.archivi.realizzazioni.length} casi OK (` + interazioni.archivi.realizzazioni.map((x) => `${x.nome}:${x.schedeDev3} schede,${x.pixel}%`).join(', ') + ').');
    md.push(`- **Archivio Brand:** ${interazioni.archivi.brand.filter((x) => x.ok).length}/${interazioni.archivi.brand.length} casi OK (` + interazioni.archivi.brand.map((x) => `${x.nome}:${x.schedeDev3} schede,${x.pixel}%`).join(', ') + ').');
    md.push(`- **Schede Lightbox:** ${interazioni.schede.casi.filter((x) => x.ok).length}/${interazioni.schede.casi.length} casi OK (` + interazioni.schede.casi.map((x) => `${x.nome}:${x.pixel}%`).join(', ') + ').');
    md.push('');
  }

  if (link) {
    md.push('## 6. Link interni, redirect e pagine in bozza');
    md.push('');
    md.push(`- **Link interni (` + '`controllo-link.js`' + `):** ${link.controlloLink.pagineControllate}/51 pagine controllate, ${link.controlloLink.linkDistinti} link interni distinti (${link.controlloLink.collegamentiLetti} collegamenti totali), esito **${link.controlloLink.ok ? '0 link rotti' : 'PROBLEMI'}**.`);
    md.push(`- **Link verso le 6 pagine in bozza:** ${link.linkVersoBozze.trovati.length} trovati.`);
    if (link.linkVersoBozze.trovati.length) {
      for (const x of link.linkVersoBozze.trovati) md.push(`  - \`${x.da}\` → \`${x.verso}\``);
    }
    md.push(`- **Redirect (` + '`collaudo-redirect.js`' + `):** ${link.redirect.superati}/${link.redirect.totale} superati.`);
    md.push(`- **6 pagine in bozza (HTTP 404):** ${link.bozze404.superati}/${link.bozze404.totale} restituiscono 404 (` + link.bozze404.dettagli.map((b) => `\`/${b.slug}/\`: ${b.status}`).join(', ') + ').');
    if (footerLegali) {
      md.push(`- **Redirect 301 archivi paginati:** ${footerLegali.paged301.filter((x) => x.ok).length}/${footerLegali.paged301.length} OK (` + footerLegali.paged301.map((x) => `\`${x.percorso}\` → ${x.status} \`${x.location}\``).join(', ') + ').');
    }
    md.push('');
  }

  if (footerLegali) {
    md.push('## 7. Verifica post-deploy Footer `971` (`.footer__bottom a`), pagine legali e riferimento SEO');
    md.push('');
    md.push(`- **Stili calcolati \`.footer__bottom a\` su \`/privacy-policy/\` e \`/cookie-policy/\` (1440/390 px):** **${footerLegali.footerOk ? '4/4 OK' : 'DIFF'}**`);
    for (const f of footerLegali.stiliFooter) {
      const sample = f.links[0] || {};
      md.push(`  - \`${f.pagina}\` @${f.w}px (H=${f.altezza}px): \`span\`=${f.spanColor}, link (\`${f.links.map((l) => l.testo).join(' · ')}\`) color=\`${sample.color}\`, display=\`${sample.display}\`, min-height=\`${sample.minHeight}\` — screenshot rigenerato in \`tools/out/rev2/fase6/${path.basename(f.screenshot)}\`.`);
    }
    if (footerLegali.seoRef) {
      md.push(`- **Riferimento SEO Fase 7 (\`${footerLegali.seoRef.file}\`):** ${footerLegali.seoRef.ok}/${footerLegali.seoRef.totale} pagine OK (0 scostamenti su \`<title>\`, \`<meta name="description">\`, singolo \`<h1>\`, attributi \`alt\`).`);
    }
    md.push('');
  }

  const mdPath = path.join(OUT_DIR, 'riepilogo.md');
  fs.writeFileSync(mdPath, md.join('\n'));
  console.log(`\nReport generati:\n  - ${jsonPath}\n  - ${mdPath}`);
  return { jsonPath, mdPath };
}

// --- MAIN ---
(async () => {
  const serveRev2 = ['tutto', 'parita', 'geometria', 'interazioni'].includes(STEP);
  let srv = null;
  if (serveRev2) {
    srv = await avviaServerRev2(PORTA);
    console.log(`Server rev2 avviato su ${REV2_BASE} (${REV2_DIR})`);
  }
  try {
    if (STEP === 'tutto' || STEP === 'link') await stepLink();
    if (STEP === 'tutto' || STEP === 'interazioni') await stepInterazioni();
    if (STEP === 'tutto' || STEP === 'geometria') await stepGeometria();
    if (STEP === 'tutto' || STEP === 'salute') await stepSalute();
    if (STEP === 'tutto' || STEP === 'footer-legali') await stepFooterLegali();
    if (STEP === 'tutto' || STEP === 'parita') await stepParita();
    if (STEP === 'tutto' || STEP === 'report') stepReport();
  } finally {
    if (srv) await new Promise((r) => srv.close(r));
  }
})().catch((e) => { console.error(e); process.exit(1); });
