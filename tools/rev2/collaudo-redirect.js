'use strict';
// Collaudo dei reindirizzamenti e dei codici di risposta degli indirizzi dei contenuti su dev3 (fase 4): pagine dei termini che
// reindirizzano all'archivio, vecchi indirizzi rinominati, indirizzi filtrati dell'archivio (devono rispondere 200, MAI reindirizzare a
// sé stessi), articoli nel cestino (404). Sola lettura.
//   node tools/rev2/collaudo-redirect.js [https://dev3.minimalstudiodev.it]
// Esce con codice 1 se un controllo fallisce.
const BASE = (process.argv[2] || 'https://dev3.minimalstudiodev.it').replace(/\/$/, '');

// [indirizzo, stato finale atteso, indirizzo finale atteso (null = lo stesso), numero di reindirizzamenti attesi]
const CASI = [
  ['/settore/uffici/', 200, '/realizzazioni/?settore=uffici', 1],
  ['/settore/bar-ristoranti/', 200, '/realizzazioni/?settore=bar-ristoranti', 1],
  ['/categoria-realizzazione/enti-e-istituzioni/', 200, '/realizzazioni/?settore=uffici&categoria=enti-e-istituzioni', 1],
  ['/categoria-brand/sedute/', 200, '/brand-partner/', 1],
  ['/realizzazioni/bbc-tarsia/', 200, '/realizzazioni/bcc-tarsia/', 1],
  ['/realizzazioni/quotidiano/', 200, '/realizzazioni/il-quotidiano/', 1],
  ['/realizzazioni/', 200, null, 0],
  ['/brand-partner/', 200, null, 0],
  ['/realizzazioni/arpacal/', 200, null, 0],
  ['/brand-partner/pedrali/', 200, null, 0],
  // indirizzi filtrati dell'archivio: sono la pagina dell'archivio con un filtro in URL (come nella rev2), non pagine di termini
  ['/realizzazioni/?settore=uffici', 200, null, 0],
  ['/realizzazioni/?settore=uffici&categoria=enti-e-istituzioni', 200, null, 0],
  ['/realizzazioni/?settore=retail&categoria=moda-e-sport', 200, null, 0],
  ['/realizzazioni/?settore=hospitality&categoria=student-housing-e-co-living', 200, null, 0], // categoria senza progetti
  ['/realizzazioni/?settore=inesistente', 200, null, 0], // la rev2 (statica) risponde sempre: qualunque parametro è ignorato
  // articoli che la rev2 non ha: nel cestino
  ['/realizzazioni/boutique-hotel-aurea/', 404, null, 0],
  ['/brand-partner/mottura/', 404, null, 0],
];

(async () => {
  let ko = 0;
  for (const [percorso, statoAtteso, finaleAtteso, redirAttesi] of CASI) {
    let url = BASE + percorso; let redir = 0; let stato = 0;
    for (; redir <= 6; redir++) {
      const r = await fetch(url, { redirect: 'manual' });
      stato = r.status;
      if (stato >= 300 && stato < 400 && r.headers.get('location')) { if (redir === 6) break; url = new URL(r.headers.get('location'), url).href; continue; }
      break;
    }
    const finale = url.replace(BASE, '');
    const attesoFinale = finaleAtteso === null ? percorso : finaleAtteso;
    const ok = stato === statoAtteso && finale === attesoFinale && redir === redirAttesi;
    if (!ok) ko++;
    console.log(`${ok ? 'OK  ' : 'FAIL'} ${percorso} -> ${stato}${redir ? ` dopo ${redir} reindirizzament${redir === 1 ? 'o' : 'i'}` : ''}${finale !== percorso ? ' a ' + finale : ''}${ok ? '' : `   (atteso: ${statoAtteso}${redirAttesi ? ` dopo ${redirAttesi}` : ''} a ${attesoFinale})`}`);
  }
  console.log(ko ? `\n${ko} controlli falliti su ${CASI.length}` : `\nTutti i ${CASI.length} controlli superati`);
  process.exit(ko ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
