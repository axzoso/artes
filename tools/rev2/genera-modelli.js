'use strict';
// Genera i modelli degli ARCHIVI (tools/rev2/modelli/archivio-*.html) a partire dalle pagine statiche della rev2: la parte fissa
// (intestazione, filtri, fascia finale) si copia tale e quale, così non si ricopia a mano nulla; il blocco dei risultati viene
// sostituito da un ciclo con gli attributi data-dyn. I modelli delle schede (realizzazione.html, brand.html) sono scritti a mano.
//   node tools/rev2/genera-modelli.js
const fs = require('fs');
const path = require('path');
const { parse, trova, classi, serializza } = require('./html-parse');

const rev2 = path.resolve(__dirname, '..', '..', 'artes-sito-rev2');
const modelli = path.join(__dirname, 'modelli');

const carica = (f) => parse(fs.readFileSync(path.join(rev2, f), 'utf8')).radice;
const main = (dom) => trova(dom, (n) => n.tag === 'main')[0];
const frammento = (html) => parse(html).radice.figli.filter((n) => n.tipo === 'el');
const sostituisciFigli = (nodo, nuovi) => { nodo.figli = nuovi; nuovi.forEach((n) => { n.padre = nodo; }); };
const intestazione = (nome) => `<!-- Modello generato da tools/rev2/genera-modelli.js da artes-sito-rev2/${nome}: NON modificare a mano, si rigenera. -->\n`;

// ---- archivio realizzazioni -----------------------------------------------------------------------------------------------
{
  const m = main(carica('realizzazioni.html'));
  const griglia = trova(m, (n) => n.tag === 'div' && classi(n).includes('archivio__grid'))[0];
  const vuoto = trova(griglia, (n) => classi(n).includes('progetti__empty'))[0];
  const card = [
    `<a class="progetto progetto--w2" href="#" data-dyn-href="url_post">
        <div class="progetto__media"><div class="progetto__wash"></div><img data-dyn-src="card_immagine" alt=""></div>
        <div class="progetto__meta">
          <div><div class="progetto__nome" data-dyn="card_nome">Nome</div><div class="progetto__luogo" data-dyn="card_luogo">Luogo</div></div>
          <div class="progetto__settore" data-dyn="card_categoria">Categoria</div>
        </div>
        <span class="rev2-dato" data-dyn="dato_settore">settore</span>
        <span class="rev2-dato" data-dyn="dato_categoria">categoria</span>
      </a>`,
  ];
  // il ciclo prende le classi della griglia (progetti archivio__grid); il messaggio "nessuna realizzazione" resta subito dopo
  const sezione = griglia.padre;
  const nuovaGriglia = frammento(`<div class="progetti archivio__grid" data-loop="archivio_realizzazioni">${card.join('')}</div>`)[0];
  const idx = sezione.figli.indexOf(griglia);
  const vuotoPulito = frammento(serializza(vuoto))[0];
  sezione.figli.splice(idx, 1, nuovaGriglia, vuotoPulito);
  [nuovaGriglia, vuotoPulito].forEach((n) => { n.padre = sezione; });
  fs.writeFileSync(path.join(modelli, 'archivio-realizzazioni.html'), intestazione('realizzazioni.html') + serializza(m) + '\n');
  console.log('archivio-realizzazioni.html generato');
}

// ---- archivio brand ---------------------------------------------------------------------------------------------------------
{
  const m = main(carica('brand-partner.html'));
  const griglia = trova(m, (n) => n.tag === 'div' && classi(n).includes('brands'))[0];
  const vuoto = trova(griglia, (n) => classi(n).includes('progetti__empty'))[0];
  const sezione = griglia.padre;
  const nuovaGriglia = frammento(`<div class="brands" data-loop="archivio_brand"><a class="brand" href="#" data-dyn-href="url_post"><span class="brand__n" data-dyn="card_nome">Nome</span><span class="brand__c" data-dyn="card_categoria_brand">Categoria</span></a></div>`)[0];
  const idx = sezione.figli.indexOf(griglia);
  const vuotoPulito = frammento(serializza(vuoto))[0];
  sezione.figli.splice(idx, 1, nuovaGriglia, vuotoPulito);
  [nuovaGriglia, vuotoPulito].forEach((n) => { n.padre = sezione; });
  fs.writeFileSync(path.join(modelli, 'archivio-brand.html'), intestazione('brand-partner.html') + serializza(m) + '\n');
  console.log('archivio-brand.html generato');
}

// ---- home (sezioni 04 Realizzazioni e 05 Brand partner dinamiche dai CPT, resto dalla rev2) ---------------------------------
{
  const m = main(carica('index.html'));
  const grigliaProg = trova(m, (n) => n.tag === 'div' && classi(n).includes('progetti'))[0];
  const vuotoProg = trova(grigliaProg, (n) => classi(n).includes('progetti__empty'))[0];
  const cardProg = `<a class="progetto progetto--w2" href="#" data-dyn-href="url_post">
        <div class="progetto__media"><div class="progetto__wash"></div><img data-dyn-src="card_immagine" alt=""></div>
        <div class="progetto__meta">
          <div><div class="progetto__nome" data-dyn="card_nome">Nome</div><div class="progetto__luogo" data-dyn="card_luogo">Luogo</div></div>
          <div class="progetto__settore" data-dyn="card_categoria">Categoria</div>
        </div>
        <span class="rev2-dato" data-dyn="dato_settore">settore</span>
        <span class="rev2-dato" data-dyn="dato_home_larghezza">larghezza</span>
      </a>`;
  const sezProg = grigliaProg.padre;
  const nuovaProg = frammento(`<div class="progetti" data-loop="progetti_home_rev2">${cardProg}</div>`)[0];
  const vuotoPulito = frammento(serializza(vuotoProg))[0];
  const idxP = sezProg.figli.indexOf(grigliaProg);
  sezProg.figli.splice(idxP, 1, nuovaProg, vuotoPulito);
  [nuovaProg, vuotoPulito].forEach((n) => { n.padre = sezProg; });

  const grigliaBrand = trova(m, (n) => n.tag === 'div' && classi(n).includes('brands'))[0];
  const sezBrand = grigliaBrand.padre;
  const nuovaBrand = frammento(`<div class="brands" data-loop="archivio_brand"><a class="brand" href="#" data-dyn-href="url_post"><span class="brand__n" data-dyn="card_nome">Nome</span><span class="brand__c" data-dyn="card_categoria_brand">Categoria</span></a></div>`)[0];
  const idxB = sezBrand.figli.indexOf(grigliaBrand);
  sezBrand.figli.splice(idxB, 1, nuovaBrand);
  nuovaBrand.padre = sezBrand;

  fs.writeFileSync(path.join(modelli, 'home.html'), intestazione('index.html') + serializza(m) + '\n');
  console.log('home.html generato');
}
