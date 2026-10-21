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
  ws.close(); proc.kill(); process.exit(0);
})().catch((e) => { console.error(e); proc.kill(); process.exit(1); });
