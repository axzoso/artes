'use strict';
// Sessione Chrome headless riutilizzabile (protocollo di debug, nessuna dipendenza; serve Node 22+ per WebSocket).
// Una sola istanza di Chrome per più pagine: molto più veloce di tools/cdp.js (che ne avvia una per comando).
//
//   const { openBrowser } = require('./cdp-session');
//   const b = await openBrowser({ width: 1440, mobile: false });
//   await b.navigate(url);
//   const v = await b.evalJs('document.title');
//   await b.screenshotFull('out.png');
//   await b.close();
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const http = require('http');
const os = require('os');

const CHROME = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'].find(fs.existsSync);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const getJson = (u) => new Promise((res, rej) => http.get(u, (r) => { let d = ''; r.on('data', (c) => { d += c; }); r.on('end', () => { try { res(JSON.parse(d)); } catch (e) { rej(e); } }); }).on('error', rej));

async function openBrowser(opts = {}) {
  if (!CHROME) throw new Error('Chrome non trovato');
  const { width = 1440, height = 900, mobile = false, noMotion = true } = opts;
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'artes-cdp-'));
  // porta scelta da Chrome (0) e letta da DevToolsActivePort: con più processi in parallelo una porta casuale poteva coincidere e
  // collegare due sessioni allo stesso browser (pagine scambiate)
  const proc = spawn(CHROME, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--remote-debugging-port=0', `--user-data-dir=${profile}`, `--window-size=${width},${height}`, 'about:blank'], { stdio: 'ignore' });
  let targets;
  let port = 0;
  for (let i = 0; i < 80 && !port; i++) { try { port = parseInt(fs.readFileSync(path.join(profile, 'DevToolsActivePort'), 'utf8').split(/\r?\n/)[0], 10) || 0; } catch { /* non ancora scritto */ } if (!port) await sleep(250); }
  for (let i = 0; i < 80 && port; i++) { try { targets = await getJson(`http://127.0.0.1:${port}/json`); break; } catch { await sleep(250); } }
  if (!targets) { proc.kill(); throw new Error('Chrome non risponde'); }
  const ws = new WebSocket(targets.find((t) => t.type === 'page').webSocketDebuggerUrl);
  await new Promise((r) => ws.addEventListener('open', r));
  let id = 0; const pending = new Map(); const waiters = []; const listeners = [];
  ws.addEventListener('message', (m) => {
    const d = JSON.parse(m.data);
    if (d.id && pending.has(d.id)) { pending.get(d.id)(d); pending.delete(d.id); }
    else if (d.method) {
      for (const w of waiters.slice()) if (w.method === d.method) { waiters.splice(waiters.indexOf(w), 1); w.resolve(d.params); }
      for (const l of listeners) if (l.method === d.method) l.fn(d.params);
    }
  });
  const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
  const waitEvent = (method, timeout = 30000) => new Promise((resolve) => { const w = { method, resolve }; waiters.push(w); setTimeout(() => { const k = waiters.indexOf(w); if (k >= 0) { waiters.splice(k, 1); resolve(null); } }, timeout); });
  const evalJs = async (expr) => {
    const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
    if (r.result && r.result.exceptionDetails) throw new Error('eval: ' + (r.result.exceptionDetails.exception && r.result.exceptionDetails.exception.description || r.result.exceptionDetails.text));
    return r.result.result.value;
  };

  await send('Page.enable'); await send('DOM.enable');
  const setViewport = (w, h) => send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile });
  await setViewport(width, height);
  if (mobile) await send('Emulation.setTouchEmulationEnabled', { enabled: true });
  if (noMotion) {
    // niente transizioni né animazioni: gli screenshot non catturano stati a metà (addScriptToEvaluateOnNewDocument parte prima di <html>)
    await send('Page.addScriptToEvaluateOnNewDocument', { source: "(function(){function f(){if(document.getElementById('artes-nomotion'))return;var t=document.head||document.documentElement;if(!t)return;var s=document.createElement('style');s.id='artes-nomotion';s.textContent='*,*::before,*::after{transition:none!important;animation:none!important;scroll-behavior:auto!important}';t.appendChild(s);}if(document.head||document.documentElement)f();else document.addEventListener('DOMContentLoaded',f,{once:true});})();" });
  }

  const api = {
    send, evalJs, setViewport,
    // ascolto continuo di un evento del protocollo (es. 'Runtime.exceptionThrown'): serve a raccogliere errori e richieste fallite
    on(method, fn) { listeners.push({ method, fn }); },
    async navigate(url, { settle = 1200 } = {}) {
      const loaded = waitEvent('Page.loadEventFired', 45000);
      await send('Page.navigate', { url });
      await loaded;
      try { await evalJs('document.fonts ? document.fonts.ready.then(() => 1) : 1'); } catch { /* ignorato */ }
      await sleep(settle);
    },
    async docHeight() { return evalJs('Math.max(document.documentElement.scrollHeight, document.body ? document.body.scrollHeight : 0)'); },
    async screenshotFull(file, { settle = 1500 } = {}) {
      // il viewport diventa alto quanto la pagina: le immagini "lazy" si caricano tutte
      const h = await api.docHeight();
      await setViewport(width, Math.min(Math.max(h, height), 16000));
      await sleep(settle);
      const h2 = await api.docHeight();
      if (h2 !== h) { await setViewport(width, Math.min(Math.max(h2, height), 16000)); await sleep(600); }
      const hh = Math.min(await api.docHeight(), 16000);
      const shot = await send('Page.captureScreenshot', { format: 'png', clip: { x: 0, y: 0, width, height: hh, scale: 1 } });
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, Buffer.from(shot.result.data, 'base64'));
      await setViewport(width, height);
      return { height: hh };
    },
    // Screenshot di un solo elemento (es. il contenuto di <main>): serve a confrontare il corpo di una pagina senza header e footer.
    async screenshotSelettore(sel, file, { settle = 1500 } = {}) {
      const h = await api.docHeight();
      await setViewport(width, Math.min(Math.max(h, height), 16000));
      await sleep(settle);
      const h2 = await api.docHeight();
      if (h2 !== h) { await setViewport(width, Math.min(Math.max(h2, height), 16000)); await sleep(600); }
      const r = await evalJs(`(() => { const e = document.querySelector(${JSON.stringify(sel)}); if (!e) return null; const b = e.getBoundingClientRect(); return JSON.stringify({ x: Math.round(b.x + scrollX), y: Math.round(b.y + scrollY), w: Math.round(b.width), h: Math.round(b.height) }); })()`);
      if (!r) throw new Error('elemento non trovato: ' + sel);
      const { x, y, w, h: alt } = JSON.parse(r);
      const shot = await send('Page.captureScreenshot', { format: 'png', clip: { x, y, width: w, height: alt, scale: 1 } });
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, Buffer.from(shot.result.data, 'base64'));
      await setViewport(width, height);
      return { height: alt };
    },
    async close() { try { ws.close(); } catch { /* ignorato */ } proc.kill(); await sleep(200); try { fs.rmSync(profile, { recursive: true, force: true }); } catch { /* ignorato */ } },
  };
  return api;
}

module.exports = { openBrowser, sleep };
