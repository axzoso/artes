'use strict';
// Parser HTML minimo (senza dipendenze) per i file della rev2: markup scritto a mano, tag minuscoli, attributi tra virgolette,
// chiusure esplicite. Non è un parser HTML5 completo: segnala (in `avvisi`) ciò che non si aspetta, così un cambio di stile
// nella rev2 non produce risultati sbagliati in silenzio.
//
//   const { parse, serializza, testo } = require('./html-parse');
//   const { radice, avvisi } = parse(html);
//   nodo: { tipo:'el', tag, attr:{}, figli:[], padre } | { tipo:'testo', testo } | { tipo:'commento' }
const VUOTI = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr']);
const GREZZI = new Set(['script', 'style']);

function parse(html) {
  const radice = { tipo: 'el', tag: '#root', attr: {}, figli: [], padre: null };
  const avvisi = [];
  let corrente = radice;
  const re = /<!--[\s\S]*?-->|<!doctype[^>]*>|<\/([a-zA-Z][\w-]*)\s*>|<([a-zA-Z][\w-]*)((?:\s+[^\s"'<>\/=]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'=<>`]+))?)*)\s*(\/?)>/gi;
  let ultimo = 0; let m;
  const aggiungiTesto = (t) => { if (t) corrente.figli.push({ tipo: 'testo', testo: t, padre: corrente }); };
  while ((m = re.exec(html))) {
    aggiungiTesto(html.slice(ultimo, m.index));
    ultimo = re.lastIndex;
    const tutto = m[0];
    if (tutto.startsWith('<!--')) { corrente.figli.push({ tipo: 'commento', testo: tutto, padre: corrente }); continue; }
    if (/^<!doctype/i.test(tutto)) continue;
    if (m[1]) { // chiusura
      const tag = m[1].toLowerCase();
      let n = corrente;
      while (n && n.tag !== tag) n = n.padre;
      if (!n || n === radice) { avvisi.push(`chiusura </${tag}> senza apertura`); continue; }
      if (n !== corrente) avvisi.push(`</${tag}> chiude elementi rimasti aperti (${corrente.tag}…)`);
      corrente = n.padre;
      continue;
    }
    const tag = m[2].toLowerCase();
    const attr = {};
    const reA = /([^\s"'<>\/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g; let a;
    while ((a = reA.exec(m[3] || ''))) attr[a[1].toLowerCase()] = a[2] !== undefined ? a[2] : a[3] !== undefined ? a[3] : a[4] !== undefined ? a[4] : '';
    const el = { tipo: 'el', tag, attr, figli: [], padre: corrente };
    corrente.figli.push(el);
    if (GREZZI.has(tag) && !m[4]) { // contenuto grezzo fino alla chiusura
      const fine = html.toLowerCase().indexOf('</' + tag, ultimo);
      if (fine < 0) { avvisi.push(`<${tag}> non chiuso`); break; }
      el.figli.push({ tipo: 'testo', testo: html.slice(ultimo, fine), padre: el });
      re.lastIndex = html.indexOf('>', fine) + 1; ultimo = re.lastIndex;
      continue;
    }
    if (!VUOTI.has(tag) && !m[4]) corrente = el;
  }
  aggiungiTesto(html.slice(ultimo));
  if (corrente !== radice) avvisi.push(`elemento <${corrente.tag}> non chiuso alla fine del file`);
  return { radice, avvisi };
}

const esc = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
function serializza(n, { senzaAttr = false } = {}) {
  if (n.tipo === 'testo') return n.testo;
  if (n.tipo === 'commento') return '';
  const attr = senzaAttr ? '' : Object.entries(n.attr).map(([k, v]) => ` ${k}="${v.includes('"') ? esc(v) : v}"`).join('');
  if (VUOTI.has(n.tag)) return `<${n.tag}${attr}>`;
  return `<${n.tag}${attr}>${n.figli.map((f) => serializza(f, { senzaAttr })).join('')}</${n.tag}>`;
}
const serializzaFigli = (n, o) => n.figli.map((f) => serializza(f, o)).join('');
const testo = (n) => (n.tipo === 'testo' ? n.testo : n.tipo === 'el' ? n.figli.map(testo).join('') : '');
function trova(n, fn, out = []) { if (n.tipo === 'el') { if (fn(n)) out.push(n); n.figli.forEach((f) => trova(f, fn, out)); } return out; }
const classi = (n) => (n.attr && n.attr.class ? n.attr.class.split(/\s+/).filter(Boolean) : []);

module.exports = { parse, serializza, serializzaFigli, testo, trova, classi, VUOTI };
