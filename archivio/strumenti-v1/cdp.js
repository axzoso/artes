// Pilota Chrome headless via protocollo di debug (Node 22+, nessuna dipendenza).
// Sostituisce shot.ps1 quando serve emulare un telefono, cliccare o simulare l'hover.
//
//   node tools/cdp.js shot  <url> <out.png> [--width 1440] [--height 900] [--mobile] [--click "<selettore>"] [--full]
//   node tools/cdp.js hover <url> "<selettore>" [--width 1440] [--mobile]
//   node tools/cdp.js style <url> "<selettore>" ... [--width 1440] [--mobile]
//
// shot  : screenshot (con --mobile emula un telefono vero; --click apre ad esempio l'hamburger;
//         --full cattura tutta la pagina).
// hover : misura la posizione dell'elemento prima e dopo l'hover forzato e mostra gli stili
//         calcolati che cambiano (serve a scoprire spostamenti, bordi, trasformazioni).
// style : stampa transizioni, colori e geometria degli elementi.
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const http = require('http');

const args = process.argv.slice(2);
const cmd = args.shift();
const flag = (n, d) => { const i = args.indexOf(`--${n}`); if (i < 0) return d; const v = args[i + 1]; args.splice(i, 2); return v; };
const bool = (n) => { const i = args.indexOf(`--${n}`); if (i < 0) return false; args.splice(i, 1); return true; };
const width = parseInt(flag('width', '1440'), 10);
const height = parseInt(flag('height', '900'), 10);
const clickSel = flag('click', null);
const fileArg = flag('file', null);
const mobile = bool('mobile');
const full = bool('full');
const rest = args;

const chrome = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'].find(fs.existsSync);
const profile = path.join(__dirname, 'out', 'cdp-profile');
fs.mkdirSync(profile, { recursive: true });
const port = 9333 + Math.floor(Math.random() * 500);
const proc = spawn(chrome, ['--headless=new', '--disable-gpu', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, `--window-size=${width},${height}`, 'about:blank'], { stdio: 'ignore' });
const getJson = (u) => new Promise((res, rej) => http.get(u, (r) => { let d = ''; r.on('data', (c) => d += c); r.on('end', () => res(JSON.parse(d))); }).on('error', rej));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  let targets;
  for (let i = 0; i < 60; i++) { try { targets = await getJson(`http://127.0.0.1:${port}/json`); break; } catch { await sleep(250); } }
  const ws = new WebSocket(targets.find((t) => t.type === 'page').webSocketDebuggerUrl);
  await new Promise((r) => ws.addEventListener('open', r));
  let id = 0; const pending = new Map();
  ws.addEventListener('message', (m) => { const d = JSON.parse(m.data); if (d.id && pending.has(d.id)) { pending.get(d.id)(d); pending.delete(d.id); } });
  const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
  const evalJs = async (expr) => (await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true })).result.result.value;

  await send('Page.enable'); await send('DOM.enable'); await send('CSS.enable');
  await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile });
  if (mobile) await send('Emulation.setTouchEmulationEnabled', { enabled: true });
  const url = rest.shift();
  await send('Page.navigate', { url });
  await sleep(6000);

  if (cmd === 'shot') {
    const out = rest.shift();
    if (clickSel) { await evalJs(`document.querySelector(${JSON.stringify(clickSel)})?.click()`); await sleep(1200); }
    let clip;
    if (full) { const h = await evalJs('document.documentElement.scrollHeight'); clip = { x: 0, y: 0, width, height: h, scale: 1 }; await send('Emulation.setDeviceMetricsOverride', { width, height: h, deviceScaleFactor: 1, mobile }); await sleep(500); }
    const shot = await send('Page.captureScreenshot', { format: 'png', ...(clip ? { clip } : {}) });
    fs.writeFileSync(out, Buffer.from(shot.result.data, 'base64'));
    const overflow = await evalJs('({scrollW: document.documentElement.scrollWidth, innerW: window.innerWidth})');
    console.log(`salvato ${out} | larghezza pagina ${overflow.scrollW}px su viewport ${overflow.innerW}px${overflow.scrollW > overflow.innerW ? '  <-- SCROLL ORIZZONTALE' : ''}`);
  }

  if (cmd === 'eval') {
    // node cdp.js eval <url> "<js>" [--file <percorso>] [--width ..] [--mobile]: esegue JavaScript nella
    // pagina (anche asincrono) e stampa il risultato. Con --file prima carica quel file (o più, separati
    // da virgola) nel primo <input type="file">: serve a provare i moduli con allegati.
    const js = rest.shift();
    if (fileArg) {
      const doc = await send('DOM.getDocument', { depth: 0 });
      const q = await send('DOM.querySelector', { nodeId: doc.result.root.nodeId, selector: 'input[type=file]' });
      const r = await send('DOM.setFileInputFiles', { nodeId: q.result.nodeId, files: fileArg.split(',').map((p) => path.resolve(p)) });
      if (r.error) console.error('upload file:', r.error.message);
    }
    const v = await evalJs(`(async () => { ${js} })()`);
    console.log(typeof v === 'string' ? v : JSON.stringify(v, null, 1));
  }

  if (cmd === 'style') {
    const expr = `(${(sels) => sels.map((s) => { const el = document.querySelector(s); if (!el) return { sel: s, trovato: false }; const c = getComputedStyle(el), r = el.getBoundingClientRect(); return { sel: s, x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), transition: `${c.transitionProperty} ${c.transitionDuration}`, transform: c.transform, color: c.color, display: c.display, position: c.position }; })})(${JSON.stringify(rest)})`;
    console.log(JSON.stringify(await evalJs(expr), null, 1));
  }

  if (cmd === 'hover') {
    const sel = rest.shift();
    const measure = `(() => { const el = document.querySelector(${JSON.stringify(sel)}); if (!el) return null; const r = el.getBoundingClientRect(); const c = getComputedStyle(el); const st = {}; for (const p of c) st[p] = c.getPropertyValue(p); return { rect: { x: r.x, y: r.y, w: r.width, h: r.height }, st, docH: document.documentElement.scrollHeight, footerY: document.querySelector('.elementor-location-footer')?.getBoundingClientRect().y }; })()`;
    await evalJs(`document.querySelector(${JSON.stringify(sel)})?.scrollIntoView({ block: 'center' })`);
    await sleep(400);
    const before = await evalJs(measure);
    if (!before) { console.log('elemento non trovato'); }
    else {
      const doc = await send('DOM.getDocument', { depth: 0 });
      const q = await send('DOM.querySelector', { nodeId: doc.result.root.nodeId, selector: sel });
      await send('CSS.forcePseudoState', { nodeId: q.result.nodeId, forcedPseudoClasses: ['hover'] });
      await sleep(800);
      const after = await evalJs(measure);
      const move = { dx: after.rect.x - before.rect.x, dy: after.rect.y - before.rect.y, dw: after.rect.w - before.rect.w, dh: after.rect.h - before.rect.h, dDocH: after.docH - before.docH, dFooterY: (after.footerY ?? 0) - (before.footerY ?? 0) };
      const diff = {}; for (const k of Object.keys(before.st)) if (before.st[k] !== after.st[k]) diff[k] = `${before.st[k]} -> ${after.st[k]}`;
      console.log(JSON.stringify({ sel, spostamento: move, stili_cambiati: diff }, null, 1));
    }
  }
  if (cmd === 'hovercard') {
    // node tools/cdp.js hovercard <url> "<selettore card>" "<selettore figlio>" ...: forza l'hover sulla card (e i suoi
    // genitori) e mostra come cambiano colore, opacità e sfondo dei figli indicati.
    const cardSel = rest.shift(); const kidSels = rest.slice();
    await evalJs(`document.querySelector(${JSON.stringify(cardSel)}).scrollIntoView({ block: 'center' })`); await sleep(300);
    const m = () => evalJs(`(() => { const card = document.querySelector(${JSON.stringify(cardSel)}); return ${JSON.stringify(kidSels)}.map((s) => { const el = card.querySelector(s) || document.querySelector(s); if (!el) return s + ': non trovato'; const c = getComputedStyle(el); return s + ' | color ' + c.color + ' | opacity ' + c.opacity + ' | bg ' + c.backgroundColor; }); })()`);
    const before = await m();
    await evalJs(`(() => { for (let e = document.querySelector(${JSON.stringify(cardSel)}); e; e = e.parentElement) e.setAttribute('data-hz', '1'); })()`);
    const doc = await send('DOM.getDocument', { depth: 0 });
    const chain = (await send('DOM.querySelectorAll', { nodeId: doc.result.root.nodeId, selector: '[data-hz]' })).result.nodeIds;
    for (const nid of chain) await send('CSS.forcePseudoState', { nodeId: nid, forcedPseudoClasses: ['hover'] });
    await sleep(600);
    const after = await m();
    before.forEach((b, i) => console.log(b === after[i] ? '(invariato) ' + b : b + String.fromCharCode(10) + '   --> ' + after[i]));
  }
  if (cmd === 'hoverall') {
    // node tools/cdp.js hoverall <url> [--width ..]: per ogni tipo di elemento interattivo (link, pulsanti,
    // campi) forza l'hover su di lui e sui genitori e riporta colore, sfondo, bordo, contorno, opacità,
    // trasformazioni, spostamenti e colore dei testi interni. Un elemento per "firma" (tag + classi).
    const picked = await evalJs(`(() => {
      const seen = new Map();
      const sel = 'a, button, input, select, textarea, [role=button]';
      for (const el of document.querySelectorAll(sel)) {
        const r = el.getBoundingClientRect(); if (!r.width || !r.height || getComputedStyle(el).visibility === 'hidden') continue;
        const sig = el.tagName + '.' + String(el.className).replace(/elementor-element-\\S+|e-[0-9a-f]{6,}\\S*|e-con|e-atomic-element|e-default-\\S+|e-\\S+-base|data-\\S+/g, '').trim().replace(/\\s+/g, '.') + (el.closest('.elementor-location-header') ? '@header' : el.closest('.elementor-location-footer') ? '@footer' : '');
        if (!seen.has(sig)) { seen.set(sig, el); el.setAttribute('data-ha', String(seen.size)); }
      }
      return [...seen.entries()].map(([sig, el], i) => ({ sig, n: el.getAttribute('data-ha'), txt: (el.innerText || el.value || '').trim().slice(0, 28) }));
    })()`);
    const props = ['color', 'background-color', 'border-top-color', 'border-bottom-color', 'border-left-color', 'outline-style', 'outline-color', 'opacity', 'transform', 'text-decoration-line', 'box-shadow', 'filter', 'padding-left', 'padding-top'];
    const measure = (n) => `(() => { const el = document.querySelector('[data-ha="${n}"]'); const r = el.getBoundingClientRect(); const c = getComputedStyle(el); const st = {}; for (const p of ${JSON.stringify(props)}) st[p] = c.getPropertyValue(p); return { x: Math.round(r.x), y: Math.round(r.y + scrollY), w: Math.round(r.width), h: Math.round(r.height), st, tr: c.transitionProperty + ' ' + c.transitionDuration, kids: [...el.querySelectorAll('*')].filter((k) => [...k.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())).slice(0, 8).map((k) => ({ n: k.tagName + '.' + String(k.className).split(' ').filter((x) => x && !/^(e-|elementor)/.test(x)).join('.'), c: getComputedStyle(k).color, o: getComputedStyle(k).opacity })) }; })()`;
    const doc = await send('DOM.getDocument', { depth: 0 });
    for (const p of picked) {
      await evalJs(`document.querySelector('[data-ha="${p.n}"]').scrollIntoView({ block: 'center' })`);
      await sleep(150);
      const before = await evalJs(measure(p.n));
      // hover forzato sull'elemento e su tutti i genitori (come un mouse vero)
      await evalJs(`(() => { for (let e = document.querySelector('[data-ha="${p.n}"]'); e; e = e.parentElement) e.setAttribute('data-hz', '1'); })()`);
      const chain = (await send('DOM.querySelectorAll', { nodeId: doc.result.root.nodeId, selector: '[data-hz]' })).result.nodeIds;
      for (const nid of chain) await send('CSS.forcePseudoState', { nodeId: nid, forcedPseudoClasses: ['hover'] });
      await sleep(600);
      const after = await evalJs(measure(p.n));
      for (const nid of chain) await send('CSS.forcePseudoState', { nodeId: nid, forcedPseudoClasses: [] });
      await evalJs(`document.querySelectorAll('[data-hz]').forEach((e) => e.removeAttribute('data-hz'))`);
      const diff = []; for (const k of props) if (before.st[k] !== after.st[k]) diff.push(`${k}: ${before.st[k]} -> ${after.st[k]}`);
      const mv = (after.x - before.x) || (after.y - before.y) || (after.w - before.w) || (after.h - before.h) ? ` SPOSTAMENTO dx${after.x - before.x} dy${after.y - before.y} dw${after.w - before.w} dh${after.h - before.h}` : '';
      const kd = []; (before.kids || []).forEach((k, i) => { const a = (after.kids || [])[i]; if (a && (k.c !== a.c || k.o !== a.o)) kd.push(`↳ ${k.n}: ${k.c} -> ${a.c}${k.o !== a.o ? ' opacità ' + k.o + '->' + a.o : ''}`); });
      if (kd.length) diff.push(...kd);
      console.log(`${p.sig} "${p.txt}" [transizione ${before.tr}]${mv}\n    ` + (diff.length ? diff.join('\n    ') : '(nessun cambio)'));
    }
  }
  ws.close(); proc.kill(); process.exit(0);
})().catch((e) => { console.error(e); proc.kill(); process.exit(1); });
