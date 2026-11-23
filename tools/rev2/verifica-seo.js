'use strict';
// Verifica live SEO on-page (Fase 7) su tutte le 49 pagine rev2 + Privacy (3) + Cookie (493) = 51 pagine su dev3:
//   - HTTP 200
//   - <title>: esattamente 1 nel <head>, corrispondenza 100% con la rev2/atteso, nessuna entità HTML residua
//   - <meta name="description">: esattamente 1 nel <head>, corrispondenza 100% con la rev2/atteso, nessuna entità HTML residua
//   - <h1>: esattamente 1 nel <body>, non vuoto
//   - <img alt>: nessuna immagine senza attributo alt, nessun alt vuoto dove la rev2 lo prevede, e controllo presenza alt attesi
// Salva report JSON in tools/out/rev2/fase7-seo-report.json. Sola lettura.
//
// Uso:
//   node tools/rev2/verifica-seo.js [--base https://dev3.minimalstudiodev.it] [--parallelo 5] [--solo /,/contract/]
const fs = require('fs');
const path = require('path');
const { parse, classi } = require('./html-parse');
const { estraiSeo, pulisciTesto, haEntitaResidue } = require('./fase7-seo');

const root = path.resolve(__dirname, '..', '..');
const outDir = path.join(root, 'tools', 'out', 'rev2');
const DEFAULT_BASE = 'https://dev3.minimalstudiodev.it';

const SALTA_CONTENITORI = new Set(['script', 'style', 'template', 'noscript', 'svg']);

function saltaNodo(n) {
  if (n.tipo !== 'el') return false;
  if (SALTA_CONTENITORI.has(n.tag)) return true;
  if (n.attr && n.attr.id === 'wpadminbar') return true;
  const cls = classi(n);
  if (cls.includes('otgs-development-site-front-end')) return true;
  return false;
}

function trovaPulito(nodo, fn, out = []) {
  if (!nodo || nodo.tipo !== 'el') return out;
  if (saltaNodo(nodo)) return out;
  if (fn(nodo)) out.push(nodo);
  for (const f of nodo.figli) trovaPulito(f, fn, out);
  return out;
}

function testoVisibile(n) {
  if (!n) return '';
  if (n.tipo === 'testo') return n.testo;
  if (n.tipo !== 'el' || saltaNodo(n)) return '';
  if (n.tag === 'br') return ' ';
  return n.figli.map(testoVisibile).join('');
}

function analizzaHtml(html) {
  const { radice } = parse(html);
  const head = trovaPulito(radice, (n) => n.tag === 'head')[0] || radice;
  const body = trovaPulito(radice, (n) => n.tag === 'body')[0] || radice;

  const titles = trovaPulito(head, (n) => n.tag === 'title').map((n) => ({
    raw: testoVisibile(n),
    decoded: pulisciTesto(testoVisibile(n)),
  }));

  const descriptions = trovaPulito(
    head,
    (n) => n.tag === 'meta' && (n.attr.name || '').toLowerCase() === 'description'
  ).map((n) => ({
    raw: n.attr.content || '',
    decoded: pulisciTesto(n.attr.content || ''),
  }));

  const h1s = trovaPulito(body, (n) => n.tag === 'h1').map((n) => pulisciTesto(testoVisibile(n)));

  const imgs = trovaPulito(body, (n) => n.tag === 'img' && Boolean(n.attr && n.attr.src)).map((n) => {
    const hasAlt = Object.prototype.hasOwnProperty.call(n.attr, 'alt');
    const alt = hasAlt ? pulisciTesto(n.attr.alt) : null;
    return {
      src: String(n.attr.src || '').slice(-120),
      hasAlt,
      alt,
    };
  });

  return { titles, descriptions, h1s, imgs };
}

function confrontaAltRev2(attese, trovate) {
  // Conta le occorrenze di ogni alt non vuoto atteso dalla rev2 e verifica che compaia in dev3
  const mappaTrovate = new Map();
  for (const img of trovate) {
    if (img.alt) mappaTrovate.set(img.alt, (mappaTrovate.get(img.alt) || 0) + 1);
  }
  const mancanti = [];
  for (const img of attese) {
    if (!img.alt) continue;
    const c = mappaTrovate.get(img.alt) || 0;
    if (c > 0) mappaTrovate.set(img.alt, c - 1);
    else mancanti.push(img.alt);
  }
  return mancanti;
}

async function verificaPagina(baseUrl, attesa) {
  const url = baseUrl.replace(/\/+$/, '') + attesa.percorso;
  const problemi = [];
  let status = 0;
  let html = '';

  try {
    const resp = await fetch(url, {
      redirect: 'follow',
      headers: { 'User-Agent': 'Artes-SEO-Check/1.0', 'Cache-Control': 'no-cache' },
    });
    status = resp.status;
    html = await resp.text();
  } catch (err) {
    return {
      nome: attesa.nome,
      tipo: attesa.tipo,
      percorso: attesa.percorso,
      url,
      status: 0,
      ok: false,
      problemi: [`errore rete: ${err.message}`],
    };
  }

  if (status !== 200) problemi.push(`HTTP ${status} (atteso 200)`);

  const parsed = analizzaHtml(html);

  // 1. <title>
  const titleCount = parsed.titles.length;
  const titleTrovato = parsed.titles[0] ? parsed.titles[0].decoded : '';
  const titleOk = titleCount === 1 && titleTrovato === attesa.title && !haEntitaResidue(titleTrovato);
  if (titleCount !== 1) problemi.push(`<title> count=${titleCount} (atteso 1)`);
  if (titleTrovato !== attesa.title) problemi.push(`<title> diverso: trovato "${titleTrovato}" != atteso "${attesa.title}"`);
  if (haEntitaResidue(titleTrovato)) problemi.push(`<title> contiene entità HTML residua: "${titleTrovato}"`);

  // 2. <meta name="description">
  const descCount = parsed.descriptions.length;
  const descTrovata = parsed.descriptions[0] ? parsed.descriptions[0].decoded : '';
  const descOk = descCount === 1 && descTrovata === attesa.description && !haEntitaResidue(descTrovata);
  if (descCount !== 1) problemi.push(`<meta name="description"> count=${descCount} (atteso 1)`);
  if (descTrovata !== attesa.description) problemi.push(`description diversa: trovata "${descTrovata}" != attesa "${attesa.description}"`);
  if (haEntitaResidue(descTrovata)) problemi.push(`description contiene entità HTML residua: "${descTrovata}"`);

  // 3. <h1>
  const h1Count = parsed.h1s.length;
  const h1Testo = parsed.h1s[0] || '';
  const h1Ok = h1Count === 1 && h1Testo.length > 0;
  if (h1Count !== 1) problemi.push(`<h1> count=${h1Count} (atteso 1: ${parsed.h1s.join(' | ')})`);
  else if (!h1Testo) problemi.push('<h1> vuoto');

  // 4. <img alt>
  const senzaAttrAlt = parsed.imgs.filter((i) => !i.hasAlt);
  const rev2PrevedeAltPieni = Array.isArray(attesa.immagini)
    ? attesa.immagini.every((i) => i.hasAlt && i.alt && i.alt.length > 0)
    : true; // Privacy/Cookie hanno solo i loghi header/footer con alt non vuoto
  const altVuoti = rev2PrevedeAltPieni ? parsed.imgs.filter((i) => i.hasAlt && !i.alt) : [];
  const altMancantiRev2 = Array.isArray(attesa.immagini) ? confrontaAltRev2(attesa.immagini, parsed.imgs) : [];
  const altOk = senzaAttrAlt.length === 0 && altVuoti.length === 0 && altMancantiRev2.length === 0;

  if (senzaAttrAlt.length) {
    problemi.push(`${senzaAttrAlt.length} immagini senza attributo alt (${senzaAttrAlt.slice(0, 3).map((i) => i.src).join(', ')})`);
  }
  if (altVuoti.length) {
    problemi.push(`${altVuoti.length} immagini con alt vuoto (${altVuoti.slice(0, 3).map((i) => i.src).join(', ')})`);
  }
  if (altMancantiRev2.length) {
    problemi.push(`${altMancantiRev2.length} alt attesi dalla rev2 non trovati (${altMancantiRev2.slice(0, 3).join(' | ')})`);
  }

  return {
    nome: attesa.nome,
    tipo: attesa.tipo,
    percorso: attesa.percorso,
    url,
    status,
    ok: problemi.length === 0,
    title: { ok: titleOk, count: titleCount, atteso: attesa.title, trovato: titleTrovato },
    description: { ok: descOk, count: descCount, attesa: attesa.description, trovata: descTrovata },
    h1: { ok: h1Ok, count: h1Count, testi: parsed.h1s },
    immagini: {
      ok: altOk,
      totale: parsed.imgs.length,
      atteseRev2: Array.isArray(attesa.immagini) ? attesa.immagini.length : null,
      senzaAttrAlt: senzaAttrAlt.length,
      altVuoti: altVuoti.length,
      altMancantiRev2,
    },
    problemi,
  };
}

if (require.main === module) {
  (async () => {
    const args = process.argv.slice(2);
    const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
    const baseUrl = opt('--base', DEFAULT_BASE);
    const parallelo = Math.max(1, parseInt(opt('--parallelo', '5'), 10));
    const soloRaw = opt('--solo', '');
    const solo = soloRaw ? new Set(soloRaw.split(',').map((s) => s.trim()).filter(Boolean)) : null;

    const dati = estraiSeo();
    if (dati.errori.length) {
      console.error('ERRORE estrazione sorgenti rev2:');
      dati.errori.forEach((e) => console.error('  - ' + e));
      process.exit(2);
    }

    const elenco = solo
      ? dati.tutte.filter((p) => solo.has(p.percorso) || solo.has(p.nome))
      : dati.tutte;

    if (!elenco.length) {
      console.error('Nessuna pagina selezionata.');
      process.exit(2);
    }

    const risultati = new Array(elenco.length);
    let idx = 0;
    await Promise.all(
      Array.from({ length: Math.min(parallelo, elenco.length) }, async () => {
        while (idx < elenco.length) {
          const cur = idx++;
          const p = elenco[cur];
          const r = await verificaPagina(baseUrl, p);
          risultati[cur] = r;
          const badge = r.ok ? 'OK  ' : 'FAIL';
          const info = `HTTP ${r.status} | T:${r.title?.ok ? 'OK' : 'KO'}(${r.title?.count ?? 0}) D:${r.description?.ok ? 'OK' : 'KO'}(${r.description?.count ?? 0}) H1:${r.h1?.count ?? 0} IMG:${r.immagini?.totale ?? 0}(alt:${r.immagini?.ok ? 'OK' : 'KO'})`;
          console.log(`${badge} ${p.percorso.padEnd(46)} ${info}`);
          if (!r.ok) {
            r.problemi.forEach((pr) => console.log(`       · ${pr}`));
          }
        }
      })
    );

    const riepilogo = {
      totale: risultati.length,
      ok: risultati.filter((r) => r.ok).length,
      conProblemi: risultati.filter((r) => !r.ok).length,
      http200: risultati.filter((r) => r.status === 200).length,
      titleOk: risultati.filter((r) => r.title && r.title.ok).length,
      descriptionOk: risultati.filter((r) => r.description && r.description.ok).length,
      h1Ok: risultati.filter((r) => r.h1 && r.h1.ok).length,
      altOk: risultati.filter((r) => r.immagini && r.immagini.ok).length,
      duplicatiTitle: risultati.filter((r) => r.title && r.title.count > 1).length,
      duplicatiDescription: risultati.filter((r) => r.description && r.description.count > 1).length,
    };

    fs.mkdirSync(outDir, { recursive: true });
    const reportPath = path.join(outDir, 'fase7-seo-report.json');
    fs.writeFileSync(
      reportPath,
      JSON.stringify({ quando: new Date().toISOString(), baseUrl, riepilogo, pagine: risultati }, null, 2)
    );

    console.log(
      `\nVerifica SEO completata (${riepilogo.ok}/${riepilogo.totale} OK): ` +
      `title ${riepilogo.titleOk}/${riepilogo.totale}, ` +
      `description ${riepilogo.descriptionOk}/${riepilogo.totale}, ` +
      `H1 ${riepilogo.h1Ok}/${riepilogo.totale}, ` +
      `alt ${riepilogo.altOk}/${riepilogo.totale}.`
    );
    console.log(`Report salvato in ${path.relative(root, reportPath)}`);
    process.exit(riepilogo.conProblemi ? 1 : 0);
  })().catch((e) => {
    console.error(e);
    process.exit(2);
  });
}

module.exports = { analizzaHtml, verificaPagina };
