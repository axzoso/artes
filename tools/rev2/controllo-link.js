'use strict';
// Controlla i link interni di un elenco di pagine di dev3: scarica ogni pagina, estrae gli href verso lo stesso sito e verifica
// che rispondano (200, oppure 301/302 verso una pagina che risponde). Segnala 404 e simili con la pagina da cui partono.
//   node tools/rev2/controllo-link.js <url> [<url> ...]        oppure     node tools/rev2/controllo-link.js @elenco.txt
// Sola lettura (richieste GET anonime come un visitatore).
const fs = require('fs');
const BASE = 'https://dev3.minimalstudiodev.it';
const args = process.argv.slice(2);
const urls = args.flatMap((a) => (a.startsWith('@') ? fs.readFileSync(a.slice(1), 'utf8').split(/\r?\n/).map((s) => s.trim()).filter((s) => s && !s.startsWith('#')) : [a]));
if (!urls.length) { console.error('uso: controllo-link.js <url|@elenco> ...'); process.exit(2); }

const cache = new Map();
async function stato(u) {
  if (cache.has(u)) return cache.get(u);
  let r;
  try { const res = await fetch(u, { redirect: 'manual', headers: { 'user-agent': 'artes-controllo-link' } }); r = { codice: res.status, verso: res.headers.get('location') || '' }; if ([301, 302, 307, 308].includes(res.status) && r.verso) { const f = await fetch(new URL(r.verso, u), { redirect: 'manual' }); r.finale = f.status; } }
  catch (e) { r = { codice: 0, verso: String(e.message) }; }
  cache.set(u, r); return r;
}
const decodifica = (h) => h.replace(/&#x([0-9a-f]+);/gi, (m, n) => String.fromCharCode(parseInt(n, 16))).replace(/&#0*(\d+);/g, (m, n) => String.fromCharCode(parseInt(n, 10))).replace(/&amp;/g, '&');
const normalizza = (h, da) => { try { const u = new URL(decodifica(h), da); if (u.origin !== BASE) return null; u.hash = ''; return u.toString(); } catch { return null; } };

(async () => {
  const problemi = []; let totale = 0;
  for (const p of urls) {
    const pagina = p.startsWith('http') ? p : BASE + p;
    const res = await fetch(pagina, { redirect: 'follow' });
    if (!res.ok) { problemi.push(`${pagina}: la pagina stessa risponde ${res.status}`); continue; }
    const html = await res.text();
    const visti = new Set();
    for (const m of html.matchAll(/<a\b[^>]*\shref=["']([^"'#][^"']*)["']/gi)) {
      const u = normalizza(m[1], pagina); if (!u || visti.has(u) || /\/wp-(admin|login|json|content)\/|\?(p|page_id|elementor_library)=|xmlrpc|feed|\/comments\/|\.(jpe?g|png|webp|gif|svg|pdf|zip)(\?|$)/i.test(u)) continue;
      visti.add(u); totale++;
      const s = await stato(u);
      const ok = s.codice === 200 || ([301, 302, 307, 308].includes(s.codice) && s.finale === 200);
      if (!ok) problemi.push(`${pagina.replace(BASE, '')} → ${u.replace(BASE, '')}: ${s.codice}${s.verso ? ' → ' + s.verso.replace(BASE, '') : ''}${s.finale ? ' (' + s.finale + ')' : ''}`);
    }
  }
  console.log(`pagine controllate: ${urls.length}; link interni distinti verificati: ${cache.size}; collegamenti letti: ${totale}`);
  if (problemi.length) { console.log(`PROBLEMI (${problemi.length}):`); problemi.forEach((x) => console.log('  - ' + x)); process.exit(1); }
  console.log('nessun link interno rotto');
})().catch((e) => { console.error(e); process.exit(2); });
