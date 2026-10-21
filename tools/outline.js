// Elenca la sequenza di blocchi (<section> e <div class="page-band">) di ogni pagina del mockup,
// per vedere quali schemi si ripetono. Uso: node tools/outline.js [cartella]
const fs = require('fs'); const path = require('path');
const root = process.argv[2] || '.';
const skip = /^(realizzazione-|sistema-visivo)/;
for (const f of fs.readdirSync(root).filter((n) => n.endsWith('.html') && !skip.test(n)).sort()) {
  const h = fs.readFileSync(path.join(root, f), 'utf8');
  const main = (h.match(/<main[\s\S]*<\/main>/) || [h])[0];
  const blocks = [...main.matchAll(/<(section|div) class="(page-intro|page-band|section[^"]*|settore[^"]*|cta-band|hero[^"]*|metodo[^"]*|produzione[^"]*|brands-section[^"]*|cta-duo[^"]*|realizzazioni[^"]*|contatti[^"]*|scheda[^"]*|correlate[^"]*)"/g)].map((m) => m[2].split(' ').slice(0, 2).join('.'));
  const h1 = (main.match(/<h1[^>]*>([\s\S]*?)<\/h1>/) || [])[1];
  console.log(`${f.padEnd(34)} ${blocks.join(' > ')}`);
  if (h1) console.log(`${''.padEnd(34)} h1: ${h1.replace(/<br\s*\/?>/g, ' ').replace(/<[^>]+>/g, '').trim()}`);
}
