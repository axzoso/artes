'use strict';
// Risolve gli indirizzi passati agli strumenti di collaudo. I link di anteprima firmati di Elementor scadono dopo circa 10
// minuti, quindi si genera un link nuovo a ogni esecuzione:
//   @542            -> anteprima della pagina/documento 542 (con &artes_rev2=1)
//   @542?x=y        -> come sopra, con parametri aggiunti
//   http://…        -> invariato
const { connetti } = require('./mcp-client');

let el = null;
async function risolviUrl(u) {
  const m = /^@(\d+)(\?.*)?$/.exec(u || '');
  if (!m) return u;
  el = el || (await connetti('elementor'));
  const p = await el.callJson('elementor-create-preview-link', { post_id: parseInt(m[1], 10) });
  if (!p.url) throw new Error('anteprima non disponibile per ' + m[1] + ': ' + JSON.stringify(p).slice(0, 200));
  return p.url + '&artes_rev2=1' + (m[2] ? '&' + m[2].slice(1) : '');
}
// risolve una stringa "a@@b" (due indirizzi separati da @@) o un solo indirizzo
async function risolviCoppia(s) { return (await Promise.all(s.split('@@').map(risolviUrl))).join('@@'); }

module.exports = { risolviUrl, risolviCoppia };
