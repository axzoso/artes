# Diario delle sessioni

Registro delle sessioni di lavoro con Claude Code: cosa è stato chiesto,
cosa è stato fatto, quali decisioni sono state prese e cosa resta aperto.
Voce più recente in alto. A fine sessione si aggiunge una voce nuova e si
aggiorna `CLAUDE.md` se è cambiato qualcosa di strutturale.

Il contesto stabile del progetto (architettura, regole, settori) sta in
[`CLAUDE.md`](../CLAUDE.md): qui solo la cronaca.

---

## 2026-11-20 (seconda parte) — Adeguamento alla rev2: fase 4 (template e archivi)

**Richiesta**

"Procedi con la fase 4." (Resta valida l'indicazione della fase 3: tutto ciò che non è nella rev2 deve andare via.)

**Fatto**

- *Template nuovi* (site part pubblicati, condizione generale per tipo): **1040** Singolo Realizzazione (rev2), **1049** Singolo Brand (rev2), **1050** Archivio
  Realizzazioni (rev2), **1051** Archivio Brand (rev2). Non si disegnano in Elementor: la sorgente è un HTML scritto a mano con attributi che dicono da dove viene ogni
  dato (`tools/rev2/modelli/`), il convertitore (`html2elementor.js`, esteso con `data-dyn`, `data-dyn-href`, `data-dyn-src`, `data-opz`, `data-loop`) lo trasforma in
  widget con tag dinamici nativi di Elementor/JetEngine; i valori calcolati (briciole di pane, riga "Settore — Categoria", numero di foto…) sono shortcode del plugin.
  Strumenti: `dinamici.js` (alias), `costruisci-modello.js`, `genera-modelli.js` (i due archivi si ricavano dalle pagine statiche), `condizioni.js`.
- *Plugin `artes-core` 0.6.2*: 8 shortcode nuovi, filtri dei cicli degli archivi (ordine della rev2), `window.ArtesRev2Dati` (settori e categorie dai termini), opzione
  `artes_rev2_cpt` (accende il design rev2 su schede e archivi), redirect 301 delle pagine dei termini, pulizia dei parametri `?settore=`. JavaScript rev2: lightbox,
  filtri a due livelli dell'archivio, filtro dei brand. CSS: adattamenti per i cicli, la galleria (`:has()`), le righe e i blocchi facoltativi.
- *Attivazione*: header 557 e footer 971 sui 4 contesti (scheda e archivio di realizzazioni e brand); i vecchi 138, 448, 213, 447 sono **in bozza con le condizioni
  originali** (si torna indietro in 5 passi, vedi `wp-stato-dev3.md` §9); le pagine dei termini reindirizzano all'archivio filtrato.
- *Parità misurata su tutte le pagine* (`tools/rev2/parita-tutte.js`): **20 realizzazioni, 18 brand e 2 archivi** a 1440 e 390 px: **altezze identiche**, nessuno scroll
  orizzontale, **contenuti identici** (testi, titoli, link, immagini e alt), pixel diversi al massimo 2,2% sulle realizzazioni, 1,2% sui brand, 2,6% sugli archivi (solo
  ricampionamento delle foto). A 1024 e 768 px su un campione di 9 pagine (gallerie da 3, 4, 5 e 19 foto, brand con e senza foto, i due archivi): altezze identiche
  (18 misure su 18). Interazioni, provate sugli **indirizzi veri** di dev3: lightbox (4 scenari, 0% di differenza), filtri dell'archivio realizzazioni (6 scenari, compreso
  `?settore=retail&categoria=moda-e-sport`) e dei brand (4 scenari) con lo stesso stato e lo stesso aspetto della rev2, header (tendina, menu mobile a 390 e 1024 px, accordion,
  voce attiva).
- *Salute* (`tools/rev2/salute-pagine.js --cpt`, nuovo): 40 pagine × 2 larghezze = **80/80** senza problemi (un solo H1, nessuna immagine rotta, nessun errore in console,
  nessuna richiesta fallita, nessuno scroll orizzontale).
- *Campi del vecchio modello tolti* (7 su `realizzazione`, 5 su `brand`): prima il test (`verifica-dati.js`, gruppo "10 campi vecchi tolti": 34 falliti), poi il passo
  `import-dati.js pulizia`, che **salva prima** definizioni, valori e regole WPML in `tools/out/rev2/fase4-campi-rimossi.json`; `annulla-pulizia` li rimette.
  Eseguita: 12 definizioni, 45 valori su 11 articoli (10 realizzazioni e Pedrali) e 11 regole WPML (`galleria` resta: la usa il modello nuovo delle realizzazioni);
  **1.094/1.094** controlli superati. Provata anche l'andata e ritorno: `annulla-pulizia` ha riportato i 34 controlli in rosso, la seconda `pulizia` ha prodotto un prelievo
  identico al primo (il file `-2` è il risultato di questa prova). Gli articoli nel cestino non sono stati toccati.
- *Non regressione delle pagine vecchie* (misura precedente = fine fase 2, 24 screenshot): le 6 pagine statiche (Su misura, Contract, Chi siamo, Contatti, Prodotti, Privacy) sono
  **pixel-identiche** a 1440 e 390 px; Home e Hotel cambiano soltanto per i dati nuovi della fase 3 (card dei progetti: stesso layout); le 4 pagine dei contenuti (archivi e schede)
  ora sono rev2. **Link check**: 20 pagine, 78 indirizzi interni distinti, nessun link rotto. Nuova misura di riferimento in `tools/out/regress/fase4` (e `settori`).
- Documentazione aggiornata: `wp-stato-dev3.md` (§3, §5, §8, §9), piano (§10), regole di conversione (nuovo §8), `tools/README.md`, `CLAUDE.md`, ledger della fase.

**Errori miei trovati e corretti lungo la strada**

- *Pubblicazione per errore*: `costruisci-modello.js` pubblicava sempre e la pagina di prova (bozza) è stata pubblica per pochi minuti; rimessa in bozza (404 verificato).
  Ora la pubblicazione è opt-in (`--pubblica`).
- *Regola CSS troppo generica*: per riportare le righe automatiche dei cicli a una colonna (le "altre realizzazioni" erano 35 px più alte su 5 schede a 390 px) avevo scritto
  un selettore con la stessa specificità delle regole della galleria, e veniva dopo: le annullava su tutte le schede. L'ha mostrato subito la parità completa (altezze
  sbagliate, 20-50% di pixel diversi); corretta con `:where()`. Lezione scritta nei documenti: dopo ogni modifica a `adattamenti.css` si rilancia la parità su **tutte** le pagine.
- *Ciclo di reindirizzamenti*: il redirect delle pagine dei termini scattava anche su `/realizzazioni/?settore=uffici` (WordPress legge il parametro come query sulla
  tassonomia) e rimandava a sé stesso. Non era emerso perché i collaudi dei filtri giravano sulla pagina di prova e non sull'archivio vero. Trovato con un controllo dei
  codici di risposta; test scritto prima (`tools/rev2/collaudo-redirect.js`, 8 controlli rossi), poi correzione nel plugin (0.6.2: un filtro `request` toglie `settore` e
  `categoria` dalla query dell'archivio e il redirect non parte mai dall'archivio stesso). Ora **17/17**, compresi `?settore=inesistente` e una categoria senza progetti
  (200, come la rev2) e gli articoli nel cestino (404).
- *Elenchi vuoti nelle pagine settore vecchie (effetto della fase 3, trovato qui)*: confrontando le pagine vecchie con la misura precedente, la pagina Hotel aveva perso le card
  dei progetti. Le 5 pagine settore del design vecchio scelgono i progetti dal proprio campo `settore_collegato` (slug del termine) e la fase 3, rinominando gli slug dei
  termini, non l'aveva aggiornato: da allora tutte e 5 mostravano un elenco vuoto senza alcun errore. Test prima (`verifica-dati.js`, gruppo "1 settore": 5 falliti), poi
  correzione nel passo `tassonomie` (il legame termine ↔ pagina ora è scritto in entrambi i sensi): **1.099/1.099**; le pagine mostrano di nuovo 6, 6, 3, 3 e 1 progetto
  (Royal Hotel è l'unico di Hospitality nella rev2).

**Decisioni e perché**

- *Template come site part nuovi*, vecchi in bozza e non cancellati (ritorno indietro); attivazione solo a parità raggiunta.
- *Dati nei widget con tag dinamici nativi*, shortcode del plugin solo per i valori calcolati: il contenuto resta modificabile da chi gestisce il sito.
- *Il difetto della rev2 sul filtro dei brand è stato replicato*, non corretto: la rev2 prevale (vedi "Aperto").
- *Menu `Filtri realizzazioni` e `Filtri brand` non eliminati* (il piano parlava di allinearli): il primo serve ancora alla Home pubblicata (376, design vecchio) e il secondo
  al template vecchio in bozza; si eliminano quando la Home passa alla rev2.
- *Campi vecchi tolti ora* (come previsto dal piano a fine fase 4 e dalla tua indicazione): solo dopo aver verificato che nessun documento pubblicato li legga (li leggono
  solo i template vecchi in bozza 138 e 448) e con il salvataggio annullabile. Gli articoli nel cestino non sono stati toccati.
- *Revisione finale*: autoverifica (lettura del codice PHP e JS della fase per escaping, query e redirect); non ho lanciato un revisore separato perché lo strumento per
  farlo parte solo su richiesta dell'utente.

**Aperto**

- **Fase 5** (pagine: Home, 5 settori, Su misura, Contract, Chi siamo) in attesa del via.
- **Difetto della rev2 da segnalare al titolare**: nella pagina Brand Partner i filtri per categoria non nascondono le card (`.brand { display: flex }` vince sull'attributo
  `hidden`); cambia solo il pulsante attivo. Replicato com'è; in rev2 basta `.brand[hidden] { display: none }`.
- Menu dei filtri da eliminare con la Home rinnovata; template vecchi (138, 448, 213, 447) e shortcode del vecchio modello nel plugin da eliminare alla chiusura (fase 9).
- Allegati non più usati (foto dei 4 progetti fittizi, immagini sostituite, galleria del vecchio Pedrali: allegati 274, 100, 466, 57, da verificare se servono ancora altrove):
  elenco per la fase 9, **cancellazione solo con il tuo OK**.
- Strumento di misura da sistemare prima della Home (che ha animazioni): lo script iniettato da `cdp-session.js` per spegnere transizioni e animazioni viene eseguito prima
  che esista `<html>` e non si applica mai (verificato). Le misure della fase 4 sono valide (stesso strumento su entrambi i lati, attese di assestamento), ma con
  sliders e caroselli serve un'iniezione che parta a `DOMContentLoaded`.
- Header e footer sono rev2 sulle schede e sugli archivi e ancora quelli vecchi sulle altre pagine: chi naviga dev3 vedrà due stili finché non si passa alla fase 5.
- Nessuna icona del sito (`/favicon.ico` dà 404): è così anche nella rev2, da decidere a fine lavoro.
- Inglese (fase 8): i filtri dell'archivio abbinano il testo dei pulsanti ai termini; con le pagine tradotte va riverificato. Il selettore di lingua nell'header rev2 è solo il testo
  "IT / EN" non cliccabile (come nella rev2): in fase 8 va collegato allo shortcode `[artes_lingue]`. Titoli e descrizioni SEO delle schede: fase 7.
- **Nessun commit né push**: modifiche locali non committate.

---

## 2026-11-20 — Adeguamento alla rev2: fase 3 (dati)

**Richiesta**

"Va nel cestino tutto quello che non è presente in rev2: se in rev2 ci sono brand partner o realizzazioni già presenti in dev3 lasciamole, ma in generale
tutto ciò che non è presente in rev2 deve andare via. Procedi con la fase 3."

**Fatto** (il test viene prima: `tools/rev2/verifica-dati.js` era a **185/550**, dopo l'import è a **1.028/1.028**)

- *Estrazione*: `tools/rev2/dati-rev2.js` ricava dalla rev2 5 settori, 26 categorie (22 nei filtri), 20 realizzazioni, 18 brand, 8 relazioni, 6 card della
  home, e verifica le regole derivate (titolo e descrizione SEO, didascalie, "altre realizzazioni", testi uniformi dei brand): nessuno scostamento.
- *Tassonomie*: `settore` rinominata e riordinata con gli slug rev2; **nuova `categoria`** (26 termini con tipologie, settore e ordini); `categoria_brand` con i
  nomi della rev2 ("Pareti e pod").
- *Campi*: 7 nuovi su `realizzazione`, 4 su `brand`, con regole WPML. Definizione in `tools/rev2/modello-dati.js`.
- *Immagini*: alt della galleria allineati alla rev2 (171 foto) e 27 **copie** con alt proprio per card e foto dei brand (nella rev2 lo stesso file ha testi diversi
  a seconda del punto, in WordPress l'alt è dell'allegato).
- *Articoli*: **20 realizzazioni** (10 aggiornate sul posto, 10 nuove) e **18 brand**; `bbc-tarsia` → `bcc-tarsia` e `quotidiano` → `il-quotidiano` come nella rev2
  (redirect 301 dai vecchi indirizzi); 8 relazioni brand ↔ progetti riscritte.
- *Cestino* (recuperabile): Boutique Hotel Aurea, Business Hotel Fera, Resort Capo Bianco, Spa Terme Luigiane (fittizi) e il brand Mottura.
- *Controlli oltre al test*: rilancio completo dell'import = nessun duplicato (allegati 238 → 238); lingua `it` su termini, articoli e allegati; redirect 301 e 404
  verificati; **link check** delle 16 pagine vecchie interessate (`tools/rev2/controllo-link.js`): trovati e corretti 5 link rotti (le pagine settore 144-148
  puntavano ai vecchi slug dei termini); le pagine vecchie mostrano i dati nuovi con il layout vecchio (provato su Royal Hotel).
- Documentazione aggiornata: `wp-stato-dev3.md` (§3, §4, §9, registro), piano (§10), regole di conversione (§5), `tools/README.md`, `CLAUDE.md`.

**Decisioni e perché**

- *Cestino = solo articoli dei due tipi di contenuto* (recuperabile). Le pagine che la rev2 non ha restano alla fase 6 (bozza, come deciso il 19/11); gli **allegati non più
  usati non si cancellano**: eliminare un allegato elimina il file, non c'è ritorno. Elenco e conferma alla fase 9.
- *Campi del vecchio modello* (cliente, ambienti, arredi… e, sui brand, certificazioni, categorie prodotto…) **non ancora tolti**: i template vecchi li leggono
  ancora. Si tolgono a fine fase 4, quando i template vengono sostituiti.
- *Si memorizzano solo i dati*; titolo/descrizione SEO, didascalie, "altre realizzazioni", titoli di sezione dei brand si calcolano (formule verificate).
- *`categoria` piatta* con meta `settore`, `ordine_pagina`, `ordine_filtro` (invece di un albero): coerente con il piano e con i filtri a due livelli della rev2.
- *Copie fisiche* delle foto per avere gli alt esatti della rev2 (+27 allegati, 9 MB di originali e altrettanti di miniature): un allegato non può condividere
  il file di un altro senza rischiare di perderlo cancellandolo.
- *"Fornitura" e "Assistenza" dei brand* sono identiche nei 18: restano campi precompilati, modificabili brand per brand.
- *Slug `pareti-e-pod`* (la rev2 non ha slug per le categorie dei brand: derivato dal nome come per le altre).
- *Verifica*: il test era troppo stretto sull'origine dei file (le 31 foto riusate dal vecchio import non hanno il prefisso `rev2:`): corretto il test, non i dati.
- *Revisione finale*: fatta da me (autoverifica); non ho lanciato un revisore separato perché lo strumento per farlo parte solo su richiesta dell'utente.

**Aperto**

- **Fase 4** (template singolo realizzazione e brand, archivi, menu dei filtri con bar prima di food) e, a fine fase, tolta dei campi vecchi: in attesa del via.
- Allegati orfani (foto dei 4 progetti fittizi, immagini sostituite): elenco per la fase 9, cancellazione solo con il tuo OK.
- Le pagine vecchie sul sito mostrano già i dati rev2 col layout vecchio: provvisorio fino alla fase 4.
- **Nessun commit né push**: modifiche locali non committate.

---

## 2026-11-19 (seconda sessione) — Adeguamento alla rev2: fasi 0, 1 e 2

**Richiesta**

Il titolare ha approvato il piano ([`piano-adeguamento-rev2.md`](piano-adeguamento-rev2.md)) rispondendo alle decisioni aperte (pagine che la
rev2 non ha in bozza, Privacy e Cookie policy pubblicate; moduli tolti ma salvati; link `#` sistemati con la logica più immediata; segnaposto
e slug dei termini replicati; CPT `realizzazione` e `brand` replicati dalla rev2; backup di dev3 fatto in locale) e ha chiesto di partire dalle
**fasi 0, 1 e 2**, poi fermarsi.

**Fatto**

- *Fase 0*: snapshot JSON di kit, classi, template, pagine, CPT e termini, menu, media, JetEngine/WPML (`tools/snapshot-dev3.ps1`); tag git
  `pre-rev2`; i 3 moduli (contatti, preventivo, scheda realizzazione) salvati come template di libreria `[Riserva]` 539-541
  (`tools/riserva-moduli.ps1`); annullamento delle scritture con `undo_revision_id` provato.
- *Fase 1 (spike)*: ogni dubbio del piano verificato su dev3 → [`rev2-regole-di-conversione.md`](rev2-regole-di-conversione.md). Via libera.
- *Fase 2 (fondamenta)*:
  - 23 classi del vecchio design in collisione coi nomi della rev2 rinominate `o-*` (12 pagine vecchie × 2 larghezze **pixel-identiche** prima e dopo);
    246 classi nuove + 14 di appoggio create come classi globali "solo nome" (totale 473; limite 1000).
  - 149 immagini caricate nella libreria da Pages (31 riusate perché identiche), alt dalla rev2, mappa in `tools/out/rev2/media-rev2.json`.
  - **CSS della rev2 portato in modo automatico** (`tools/rev2/port-css.js` → `wp/artes-core/artes-rev2.css`): selettori con prefisso, tag sostituiti
    gestiti con `:is(tag, :where(.rev2-tag))`, reset degli stili base di Elementor, CSS morto escluso. Plugin `artes-core` **0.5.0**: modalità `rev2`
    (meta `_artes_rev2` o `?artes_rev2=1`), tolti i fogli del tema Hello e i font di Elementor, font della rev2.
  - **Convertitore HTML → Elementor** (`tools/rev2/html2elementor.js`, `costruisci.js`): header, footer e pagine dalla rev2, link risolti con
    `tools/rev2/mappa-link.json`. Tutte le 49 pagine si convertono (5.291 elementi); avvisi espliciti per ciò che manca (`ul`/`ol`, `details`/FAQ, `ol.steps`).
  - **Header 557 e footer 971 rev2** (dati reali) + JavaScript `artes-rev2.js` (tendina, menu mobile con accordion, voce attiva calcolata dal percorso,
    attributi `aria-*`/`data-*`/`hidden` rimessi dalle classi). Condizione: solo la pagina di prova 542.
  - **Strumenti di parità** (rev2 locale contro dev3): screenshot + differenza pixel, confronto per classi di geometria e stili calcolati, ispezione delle
    regole CSS, collaudo delle interazioni, regressione sulle pagine vecchie. Risultato sulla pagina di prova: **Chi siamo e Contract identiche alla rev2**
    a 1440/1024/768/390 px (stesse altezze; 0,1-0,4% di pixel diversi, solo ricampionamento delle foto); tendina e menu mobile identici.
- Documentazione aggiornata: piano (§8 decisioni, §10 avanzamento), regole di conversione (§7), `wp-stato-dev3.md` (§9 e registro), `wp-migration.md`,
  `tools/README.md`, `CLAUDE.md`.
- Pulizia: eliminate le 4 classi di prova `spk-*` (referenziate solo da revisioni della pagina di prova di cui sono l'autore).

**Decisioni e perché**

- *Convivenza vecchio/nuovo* invece di sostituire subito: si verifica pagina per pagina e il sito pubblico non cambia finché non si accende la rev2
  (fase 9). La regressione sulle 12 pagine vecchie lo dimostra.
- *CSS portato, non riscritto*: un solo gesto rigenera il CSS se la rev2 cambia; le classi globali servono solo a dare il nome alle classi.
- *Tag fedeli*: dove Elementor non può riprodurre un tag (`strong` da solo, `dl/dt/dd`, `p` con link) si usa un elemento con classe `rev2-<tag>` e il CSS
  portato li riconosce senza cambiare le specificità; gli `span` fabbricati dal convertitore non prendono le regole degli span veri.
- *Tema Hello fuori dalle pagine rev2*: i suoi fogli cambiavano colori di link e bottoni, interlinee e margini; senza di loro la pagina è identica alla rev2.
- *JavaScript*: ora solo header e footer; lightbox, filtri, slider e pallini del metodo si portano con le pagine che li usano (fasi 4-5), perché
  richiedono markup e dati che oggi non esistono e non sarebbero collaudabili.
- *Variabili del kit* non toccate: il CSS rev2 ha la sua tavolozza; si aggiornano al passaggio finale (fase 9).
- *Link `#`*: Blog → Realizzazioni, Prodotti e Cataloghi → Brand Partner, Area progettisti → Contract (`#interlocutori`), MEPA → Arredo uffici e workspace
  (ne parla), Diventa partner di produzione → `#contatti`. Tutto in `tools/rev2/mappa-link.json`: si cambia lì e si rigenera.

**Aperto**

- **Fase 3 (dati)** in attesa del via: prima di toccare i contenuti chiedo conferma sull'elenco preciso (Mottura e i 4 progetti fittizi nel cestino, ecc.).
- Convertitore da completare con le pagine (fase 5): `ul`/`ol` (8 casi), `details`/FAQ (5 pagine settore), `ol.steps` della home, uno `style=""` in home.
- Interazioni rimaste (lightbox, filtri a due livelli, slider produzione, pallini del metodo): fasi 4-5.
- Chiedere al titolare conferma della mappa dei link `#` e dei segnaposto del team ("Nome Cognome") prima della pubblicazione.
- Da eliminare a fine lavoro: pagina di prova 542 (ospita le pagine in collaudo).
- **Nessun commit né push** (non richiesti): modifiche locali non committate in `CLAUDE.md`, `docs/`, `tools/`, `wp/artes-core/`.

---

## 2026-11-19 — Analisi della rev2 e piano di adeguamento

**Richiesta**

Il titolare ha sviluppato a parte, dopo le modifiche del cliente, una nuova versione del sito nella cartella
`artes-sito-rev2/`. Verificare che i connettori Novamira ed Elementor funzionino, analizzare la rev2 e proporre un
piano perché WordPress corrisponda esattamente alla rev2 (veste grafica, pagine, testi).

**Fatto**

- Connettori verificati. Elementor MCP era cambiato (protocollo 2025-11-25, 36 strumenti): `tools/mcp.ps1` ora
  manda l'intestazione `MCP-Protocol-Version` e legge `~/.claude.json` anche con due voci della cartella che
  differiscono per le maiuscole (`C:/…` con i connettori, `c:/…` senza: le sessioni aperte con la minuscola non
  caricano i connettori come strumenti nativi). Configurazione dell'utente non toccata.
- Analisi della rev2 (49 pagine, CSS di 2.444 righe, 179 immagini, 20 realizzazioni, 18 brand) e confronto con il
  mockup attuale e con dev3. Piano completo in [`piano-adeguamento-rev2.md`](piano-adeguamento-rev2.md).
- dev3 è stato aggiornato dall'ultima volta (WordPress 7.1.5, Elementor e Pro 4.4.1, WPML 5.2.0).

**Decisioni e perché**

- *Nessuna modifica a dev3 in questa sessione*: la rev2 stravolge pagine, dati e regole di stile già approvate;
  prima serve l'approvazione del piano e le risposte alle decisioni aperte (§8 del piano).

**Aperto**

- Pagine che la rev2 non ha (Contatti, Preventivo, Area progettisti, Prodotti, MEPA, Cataloghi, Privacy, Cookie),
  moduli sì/no, link `#`, segnaposto del team, slug dei termini, dove vive la rev2, backup di dev3.

---

## 2026-11-05 — Testi discorsivi nelle pagine settore

**Richiesta**

Le 5 pagine settore devono spiegare cosa Artes pensa di ogni tipo di arredo: dopo la foto principale almeno 3-4 paragrafi discorsivi, testo inventato (lo rivedrà il cliente), nello stile del sito ma senza il classico blocco di testo in alto a destra.

**Fatto**

- Nuovo blocco "Il nostro punto di vista" in tutte e 5 le pagine (mockup e WordPress): una frase d'apertura grande e quattro righe con titolo a sinistra e paragrafo a destra, separate da filetti. Testi scritti ex novo per ogni settore, senza cifre né dati su clienti.
- Verificato a 1440 e 390px, nessuno scroll orizzontale, un solo H1 per pagina.

**Decisioni e perché**

- *Prima il mockup, poi WordPress*: il mockup resta la fonte di verità e la pipeline (estrazione → costruzione) rigenera la pagina WordPress dai suoi file.
- *Layout a righe e non a colonne di testo*: è lungo da leggere ma resta ordinato, e si distingue dal riquadro di testo usato nel resto del sito.

**Aperto**

- I testi sono bozze: il cliente li riscriverà; alcune affermazioni (consegne fuori orario, camera campione, attrezzature dei brand partner) vanno confermate. Il mockup su GitHub Pages non è ancora aggiornato (push da chiedere).

---

## 2026-11-04 — Cataloghi, privacy e cookie policy

**Richiesta**

Completare su WordPress le pagine Cataloghi, Privacy policy e Cookie policy.

**Fatto**

- Tre pagine pubblicate (491, 3, 493) con testi in `tools/contenuti-pagine-legali.json`, costruite da `rebuild-pagine-legali.ps1`; 5 classi per la colonna di lettura.
- Footer: link Privacy · Cookie · MEPA, "Cataloghi PDF" nel menu Risorse; consenso dei moduli con link all'informativa.
- Controllati i cookie reali (nessuno per un visitatore anonimo) e le risorse esterne (solo Google Fonts).

**Decisioni e perché**

- *Testi legali di bozza con segnaposto*: i dati del titolare non li abbiamo e non vanno inventati; l'informativa descrive solo ciò che il sito fa davvero (moduli, allegati cancellati dopo l'invio, Google Fonts, nessun cookie di profilazione).
- *Cataloghi senza PDF*: non ne abbiamo; la pagina spiega come richiederli e rimanda a contatti e brand.

**Aperto**

- Dati del titolare e revisione legale dei testi; PDF dei cataloghi, se il cliente li fornisce; caratteri in locale (niente Google Fonts); banner cookie solo se si aggiungono analytics o contenuti di terzi.

---

## 2026-10-28 — Lightbox delle gallerie

**Richiesta**

Le immagini delle realizzazioni e di tutte le gallery devono potersi aprire singolarmente, grandi a pieno schermo.

**Fatto**

- Verificata la connessione a Novamira (WordPress 7.1.3).
- Lightbox nel plugin (0.4.0, `artes-core.js` + CSS): vale per realizzazioni e brand (`gallery-img`, `scheda-hero`); frecce, tastiera, swipe, contatore, didascalia. Verificata a 1440 e 390px, apertura a 1800×1200.

**Decisioni**

- *Script nel plugin e non widget Elementor*: i widget V4 non offrono la lightbox; il plugin è già il posto della logica del sito e viaggia in produzione.

---

## 2026-10-21 (notte, 4) — Coerenza degli hover

**Richiesta**

Controllare che tutti gli hover siano coerenti con il tema grafico, i colori e gli stili del progetto.

**Fatto**

- Due comandi nuovi in `tools/cdp.js` (`hoverall`, `hovercard`) e audit su home, archivio, brand, scheda, settore, prodotti, contatti.
- Già coerenti: pulsanti (rosso, ghost, chiaro, piccoli, footer, invio), link di testo e breadcrumb, voce Contatti della topbar.
- Corretti: chip dei filtri e paginazione (ora bordo/testo grafite), titolo delle card in rosso su progetti, correlati, brand e Prodotti, immagini card a opacità .88, velo scuro sul mosaico della home.
- Voci dei menu di header e footer: aggiunto in un secondo momento, su richiesta, un **cambio colore in rosso senza movimento** (prima non avevano hover per scelta del cliente).

---

## 2026-10-21 (notte, 3) — Giro di controllo del sito

**Richiesta**

Controllare tutto dev3 (desktop e mobile) in cerca di bug, e valutare la coerenza con l'obiettivo iniziale e le richieste del cliente.

**Fatto**

- Controllo automatico di 62 URL a 1440 e 390px e dei 123 link interni; controllo visivo di home (mobile), scheda brand, Prodotti, footer.
- Corretti: un link rotto in Area progettisti, logo invisibile nel footer, filtri home su mobile (già in sessione).
- Emersi (non risolti): nessun meta description né favicon; sito indicizzabile; "Hello world!" pubblico; manca SMTP, anti-spam, cookie banner; dati segnaposto (telefono, indirizzo, P.IVA).

**Aperto**

- Impostare noindex su dev3 e togliere "Hello world!" (impostazione del sito: da fare con conferma); SEO di base; link sensibili alla lingua prima della traduzione EN.

---

## 2026-10-21 (notte, 2) — Schede brand complete, Prodotti e MEPA

**Richiesta**

Completare le schede dei singoli brand; chiarire se le pagine delle sezioni 2 e 3 di `PAGES.md` vanno prima nel mockup o direttamente su WordPress; procedere per quanto possibile senza l'approvazione del cliente. Prodotti: versione "b" (la più semplice).

**Fatto**

- **Scheda brand completa**: 6 campi nuovi sul CPT, shortcode nel plugin, template 448 esteso (foto, galleria, specifiche, categorie prodotto, tutto nascosto se vuoto). Pedrali compilato come nel mockup; gli altri brand restano senza foto e specifiche.
- **Mockup**: `prodotti.html` (categorie con rimando ai brand) e `mepa.html` (**testo di bozza**); footer dello shell aggiornato. Su WordPress pagine 471 e 472 e voci nel menu footer.
- **Decisione sulle pagine mancanti**: mockup solo dove serve approvazione (Prodotti, MEPA); `cataloghi` aspetta i PDF; `privacy` e `cookie` sono testi legali del cliente, direttamente su WordPress.

**Aperto**

- Contenuti degli altri 18 brand; conferma del testo MEPA (abilitazione, categorie merceologiche); PDF per `cataloghi`; testi di privacy e cookie. Mockup nuovo non ancora pubblicato su GitHub Pages (push da chiedere).

---

## 2026-10-21 (notte) — Pagine vere del sito e Brand Partner

**Richiesta**

"Iniziamo a costruire le vere pagine del sito, andiamo avanti con lo sviluppo per far vedere
qualcosa di concreto al cliente."

**Fatto**

- Costruite e pubblicate su dev3: 5 pagine settore (144–148), home (376), 4 istituzionali
  (149–151, 153), Contatti (152) e Richiedi preventivo (154, modulo con allegati e invio email
  verificato con intercettazione poi rimossa). Contenuti estratti dal mockup con un parser HTML
  e trasformati da librerie `lib-*.ps1`.
- **Brand Partner**: archivio (site part 447, anche per le categorie) con filtri per categoria e
  CTA; scheda brand (448) con intestazione, "Progetti con <brand>" via relazione, CTA. Menu
  `filtri-brand`, 4 classi, plugin 0.3.5.
- **Incidente risolto**: `Compress-Archive` produceva uno ZIP con percorsi a barra rovesciata e
  il plugin è sparito per qualche minuto. Cartella ripulita, plugin reinstallato, script
  corretto (ZIP con `System.IO.Compression`). Verificato: home, realizzazioni, brand, 200 OK.
- Documentazione aggiornata (stato dev3, migrazione, README tools).

**Decisioni e perché**

- *Tutti i 19 brand cliccabili* (nel mockup solo Pedrali): la scheda si adatta ai campi vuoti e
  nasconde "Progetti con…" se non ci sono progetti.
- *Niente foto/specifiche brand*: il modello dati ha solo `introduzione`; non si inventano dati.

**Aperto**

- Contenuti dei singoli brand dal cliente; Blog, Prodotti, MEPA/PA, Cataloghi PDF, informativa
  privacy; mappa Contatti; anti-spam e SMTP, destinatario email definitivo; filtro per ambito nelle
  pagine settore; link sensibili alla lingua; logo chiaro nel footer; conferma categoria Mottura;
  rigenerare le password applicazione; noindex e backup di dev3. File nuovi non ancora committati.

---

## 2026-10-21 (sera, 2) — Plugin definitivo e modulo di contatto

**Richiesta**

Procedere con il form. Domande dell'utente: il plugin `artes-core` può essere installato
come plugin vero per renderlo definitivo? Oppure si possono usare i Listing di JetEngine al
posto dei Loop di Elementor?

**Fatto**

- **Plugin installato come plugin vero** su dev3 (0.2.4): `tools/install-plugin.ps1`
  impacchetta uno ZIP, lo carica con il link di upload di Novamira (i `.php` solo in
  sandbox, gli ZIP no), lo installa con WP-CLI, rimuove la vecchia copia della sandbox.
  Il CSS del sito ora lo carica il plugin e il CSS del kit è vuoto. Rifatte tutte le misure
  (transizioni, hover, mobile): invariate. Script obsoleti eliminati.
- **Listing JetEngine**: verificato che il widget `jet-listing-grid` non è costruibile con il
  connettore (`Unknown widget type`): si resta sul Loop V4. Il plugin servirebbe comunque.
- **Modulo di contatto** in fondo al template realizzazione (libreria `tools/lib-contatti.ps1`):
  email a `info@artes.it` (temporaneo), allegati DWG, Reply-To a chi scrive, settore
  preselezionato. Test di invio vero con intercettazione dell'email (poi rimossa).
- Plugin: DWG ammessi, **cancellazione degli allegati dal server dopo l'invio** (Elementor li
  lasciava pubblici con il nome originale), pulizia giornaliera, link nell'email.
- Pagina di prova 28 nel cestino.

**Decisioni e perché**

- *Plugin vero e non sandbox*: la sandbox di Novamira non c'è in produzione.
- *Loop V4 e non Listing Grid*: è costruibile dall'AI, verificato e funzionante.
- *Cancellare gli allegati dopo l'invio*: planimetrie e capitolati dei clienti non devono
  restare raggiungibili da un indirizzo indovinabile.

**Scoperte da ricordare**

- Pubblicare un documento copia i dati dalla bozza: le correzioni vanno dopo `publish`.
- Il widget select raddoppia le `&`; un `_cssid` uguale a una variabile di query dà
  etichette sbagliate; il Reply-To si scrive `[cssid]`.
- L'anteprima di una bozza è una revisione: non rispecchia modifiche successive ai dati.

**Aperto**

- **Protezione anti-spam del modulo** (assente) e **invio email reale non verificato** (serve
  un SMTP e il destinatario definitivo). Stesso modulo nelle pagine Contatti e Preventivo.
- Link a pagine sensibili alla lingua; informativa privacy; il resto dell'elenco precedente.

---

## 2026-10-21 (sera) — Archivio realizzazioni, Mottura, form deciso

**Richiesta**

Decisioni dell'utente: il form usa temporaneamente `info@artes.it` (poi quello
definitivo), allegati DWG ammessi, Mottura resta come brand. Poi: costruire l'archivio
e spiegare a cosa serve il plugin `artes-core`.

**Fatto**

- Brand **Mottura** creato (ID 214, categoria Contract, ipotesi da confermare), collegato
  ad Aurea e aggiunto a `brand-partner.html` del mockup (modifica locale, non
  committata né pubblicata).
- Archivio realizzazioni (site part 213) per `/realizzazioni/` e per le pagine dei
  settori; menu "Filtri realizzazioni" come filtro; 16 classi nuove; 12 per pagina con
  paginazione; ordine del mockup (`menu_order`); campo "Ordine" nell'admin del CPT.
- Plugin: ordine e paginazione dell'archivio, voce "Tutti" del filtro.
- Script nuovi: `gen-archive.ps1`, `rebuild-archive.ps1`,
  `setup/mottura-e-menu-filtri.php`, `setup/ordine-realizzazioni.php`.

**Decisioni e perché**

- *Filtri come link ai settori, non JavaScript*: URL indicizzabili, WPML traduce il
  menu, niente codice da portare.
- *Un solo template per archivio e settori* (condizioni `realizzazione_archive` e
  `settore`).
- *Hover delle card del mockup non portati* (zoom e velo rosso): sono movimenti, in
  linea con la richiesta di hover senza spostamenti.
- *Progetti nuovi per primi*: ordine 0 → in cima; i 14 esistenti restano nell'ordine
  del mockup.

**Scoperte da ricordare**

- Il widget Loop ha un suo `posts_per_page` (3) che prevale anche con `current_query`.
- La paginazione del Loop ha solo Precedente/Successiva.
- Un menu WordPress con voci di tassonomia ottiene `current-menu-item` da solo sulle
  pagine del termine.

**Aperto**

- Il form di contatto (dati decisi sopra, da costruire) e la CTA nel template
  realizzazione; la CTA dell'archivio ha già i due pulsanti verso pagine segnaposto.
- Classificare Mottura con il cliente. Tutto il resto dell'elenco precedente.

---

## 2026-10-21 — Header e footer su dev3, rifiniture del template

**Richiesta**

Procedere con header e footer della versione WordPress.

**Fatto** (lato WordPress su dev3; file nuovi nel repo non committati)

- 11 pagine segnaposto (slug come i file del mockup), 4 menu WordPress (Header e
  tre del footer), logo del sito.
- Site part header (199) e footer (200) pubblicati, con 22 classi globali nuove.
  Header a due righe con due gruppi di menu, topbar, selettore lingua "IT / EN",
  hamburger sotto i 1366px; footer a 5 colonne con menu WordPress.
- CSS personalizzato del kit applicato da file (`wp/artes-core/kit-custom.css` →
  `tools/apply-kit-css.ps1`): stile dei menu, header sticky, responsive.
- Plugin `artes-core`: shortcode `[artes_lingue]`, `[artes_titolo]`,
  `[artes_settore_ambito]` e filtro per la voce di menu attiva.
- Template realizzazione: titolo con ultima parola in grassetto, riga "Settore —
  ambito", fondo grigio alternato su "Altre realizzazioni" (differenze trovate
  confrontando lo screenshot col mockup).
- Script nuovi in `tools/`: `gen-header-footer`, `rebuild-header-footer`,
  `apply-kit-css`, `deploy-plugin`, `setup/menus-pagine-logo.php`.
- Su richiesta: disattivate le animazioni predefinite del tema Hello Elementor
  (transizioni di pulsanti, campi modulo e menu del tema) nel CSS del kit.
- Poi, su richiesta: le voci dei menu (header, hamburger, footer) senza le
  animazioni di base di Elementor e senza hover (colore invariato al passaggio
  del mouse). Restano le transizioni di Elementor su contenitori e widget e gli
  hover degli altri elementi (link, pulsanti, chip dei brand).
- Infine gli hover rimasti scattavano (dopo aver tolto le transizioni del tema):
  messa una transizione unica `--artes-hover` (.25s ease, solo colore, sfondo,
  bordo, opacità) su tutto ciò che ha un hover; i menu restano senza. Verificato
  con gli stili calcolati di Chrome (`tools/cdp.js style`).
- Segnalati dall'utente con uno screenshot: menu mobile fuori schermo, footer con
  hamburger su mobile, voci di menu che si spostano in hover. Cause e correzioni nel
  dettaglio in `wp-stato-dev3.md` §5. Per verificarli è nato `tools/cdp.js`
  (emulazione di un telefono vero, click, misura dell'hover): da usare sempre per il
  mobile, al posto dello screenshot headless semplice.

**Decisioni e perché**

- *Menu WordPress veri* (widget `nav-menu`): il cliente li modifica e WPML li
  traduce. Lo stile passa dal CSS del kit perché il widget accetta solo la parte
  strutturale.
- *Shortcode proprio per la lingua*: gli shortcode `wpml_language_*` non esistono
  in WPML 5.1.
- *Link con l'oggetto nativo `{id, label}`*: il tag `internal-url` non viene
  applicato; l'oggetto nativo segue la lingua.
- *Voci non ancora esistenti omesse dai menu* (Blog, Prodotti, MEPA/PA, Cataloghi
  PDF): meglio niente che un link morto.

**Scoperte da ricordare**

- Gli URL inglesi sono già `/en/…`: non serve cambiare nulla (correzione di quanto
  scritto il 20/10).
- Le regole `display: none` nel CSS del kit vanno con `!important`.
- A parità di specificità vince la classe globale più in alto nell'elenco, non
  l'ultima applicata all'elemento.
- Il logo scuro non si vede sul footer nero: succede anche nel mockup.
- Confrontare lo screenshot con la preview del mockup fa emergere differenze che
  l'ispezione del markup non mostra.

**Aperto**

- Apertura del menu hamburger e mobile da verificare (lo screenshot headless non
  simula il click e non scende sotto ~500px).
- Logo chiaro per il footer, link sensibili alla lingua nelle voci personalizzate
  e nel breadcrumb, pagine vere al posto dei segnaposto.
- Form di contatto e CTA nel template realizzazione; archivio con filtro;
  singolo e archivio brand.
- Tutto il resto dell'elenco del 20/10 (password, backup, `noindex`, Mottura,
  commit dei file nuovi).

---

## 2026-10-20 — Inizio della versione WordPress su dev3

**Richiesta**

Tradurre il mockup in un sito WordPress da mettere in produzione, facendo
costruire le pagine all'AI tramite connettori (Elementor MCP / Crocoblock) invece
di rifare tutto a mano. Poi: sviluppare già pensando al multilingua (WPML,
traduzione a fine lavori), creare il template delle realizzazioni, salvare gli
script in `tools/` e tenere traccia di tutto nei file `.md`.

**Fatto** (lato WordPress su dev3, più file nuovi nel repo non committati)

- Scelto Elementor 4 + JetEngine (CrocoBuilder è beta e non installato su dev3).
  Collegati i connettori MCP `artes-elementor` e `novamira-dev3-minimalstud`.
  Il login OAuth di Novamira non funziona (scope non disponibile): si usa la
  password applicazione.
- Design system: 27 variabili globali e 41 classi globali (13 base + 28 per la
  scheda) ricavate da `artes.css`, con i valori dopo il restyling del 30/09.
- Modello dati JetEngine: CPT `realizzazione` e `brand`, tassonomie `settore` e
  `categoria_brand`, relazione molti-a-molti. WPML configurato (CPT e campi
  traducibili, ripiego sull'italiano). Permalink portati a `/%postname%/`.
- Import da script: 14 realizzazioni, 18 brand, 47 immagini (scaricate da
  GitHub Pages), tutto in lingua `it`. Aggiunti i campi `cliente` e `arredi`,
  perché 13 schede su 14 non hanno superficie/servizi/tempi/progettista.
- Template singolo realizzazione (site part 138) con intestazione, immagine e
  galleria, dettagli tecnici, brand collegati, altre realizzazioni. Verificato a
  1440px su Aurea e Arpacal.
- Nel repo: `docs/wp-migration.md` (piano), `docs/wp-stato-dev3.md` (stato),
  `tools/` (script), `wp/artes-core/` (plugin dei cicli). `CLAUDE.md` ha una
  sezione 8 sulla versione WordPress.

**Decisioni e perché**

- *Elementor prima di CrocoBuilder*: è già collegato e funzionante; il lavoro
  sul modello dati vale con entrambi.
- *WPML prima del modello dati*: così CPT e tassonomie nascono traducibili e
  l'import non va rifatto.
- *Campi, non pagine*: le realizzazioni sono post con campi e un solo
  template; il cliente le gestisce dall'admin.
- *Filtri PHP per i cicli* (plugin `artes-core`): il widget Loop non usa il
  Query Builder di JetEngine, ma `elementor/query/<id>`. Eliminate le tre
  query JetEngine create per errore.
- *Le righe vuote delle specifiche si nascondono in CSS* (`:has(:empty)`):
  gli elementi V4 non hanno condizioni di visualizzazione.
- *Backup saltato* su decisione del titolare.

**Scoperte da ricordare**

- WPML non assegna la lingua ai contenuti creati via PHP/REST.
- Dopo una composizione su un documento pubblicato: ripubblicare e svuotare
  le cache di Elementor, altrimenti il sito serve la versione vecchia.
- JetEngine vuole un nonce `wp_rest` e payload `{"input": …}`.
- Gli strumenti MCP nuovi non compaiono come tool nativi dopo il riavvio.
- Lo screenshot headless di Chrome non scende sotto ~500px: il mobile non è
  stato verificato.

**Aperto**

- Template realizzazione: sezione contatti con form, CTA, verifica mobile, link
  sensibili alla lingua, ultima parola del titolo in grassetto.
- Header e footer (site part + menu), archivio realizzazioni con filtro per
  settore, singolo e archivio brand, pagine istituzionali e dei settori.
- Portare il codice lingua `en-gb` a `/en/` prima di creare altre pagine.
- Rigenerare le due password applicazione (passate in chiaro in chat).
- Collegare Mottura ad Aurea o toglierla dalla scheda (non è un brand del mockup).
- `noindex` e backup di dev3; il plugin `artes-core` va installato come plugin
  vero in produzione (su dev3 gira dalla sandbox di Novamira).
- Pagina di prova 28 e file `tools/`, `wp/`, `docs/` non ancora committati.

---

## 2026-09-30 (4) — Area progettisti e schede di tutte le realizzazioni

**Richiesta**

1. "Area progettisti" non è un'area riservata: è una pagina pubblica per
   attirare i progettisti che hanno già commesse per i propri clienti.
2. Creare le schede di tutte le realizzazioni e linkarle dalle card; il
   sito deve essere navigabile con pulsanti e link funzionanti.

**Fatto** (non committato, insieme alle voci precedenti)

- `architetti.html` → `area-progettisti.html` (erano la stessa pagina):
  testi riscritti per chi ha già una commessa, tolto ogni riferimento
  all'accesso riservato. Ci puntano il pulsante dell'header, le due CTA
  della home ("Accedi…" → "Scopri l'area progettisti"), su misura, footer
  e contatti.
- `realizzazione.html` → `realizzazione-boutique-hotel-aurea.html` e 13
  schede nuove, una per progetto. Card di home, pagine settore, archivio,
  Pedrali e "Altre realizzazioni" linkano la scheda giusta (abbinamento
  per nome). Form con settore preselezionato e progetto nel campo nascosto.
- `shell.js`: alias `realizzazione-*` (prefisso) per tenere attiva la voce
  Realizzazioni su tutte le schede.
- Link vuoti sistemati: brand in home → Brand partner; brand senza scheda
  in `brand-partner.html` → non cliccabili; "Scopri il processo contract"
  → contract; "Diventa partner di produzione" → contatti (fornitori); i
  brand della scheda Aurea senza scheda → Brand partner.

**Decisioni e perché**

- *Nessun dato inventato sui clienti reali*: come deciso quando sono state
  inserite le foto vere, le 10 schede reali riportano solo settore, cliente,
  "Calabria", ambienti e materiali visibili nelle foto.
- *Tre progetti fittizi tenuti* (Capo Bianco, Terme Luigiane, Fera): erano
  già nel sito; hanno solo foto di repertorio (una o due), la foto della
  "spa" è in realtà un'enoteca e quella di Fera è dell'Hotel Royal di Aurea.

**Verifiche** (Chrome headless)

- 30 pagine × 1440 e 390px: nessun overflow, nessun errore JS, voce di
  menu attiva corretta, nessun link interno verso file inesistenti.

**Seguito:** su richiesta tolta da tutte le 14 schede la sezione "Materiali
e finiture". Aurea mantiene nella colonna destra i brand coinvolti; nelle
altre i dettagli tecnici occupano la riga (`.scheda__specs--solo`).

**Aperto**

- Link ancora vuoti: Blog, Prodotti, MEPA / PA, Cataloghi PDF, informativa
  privacy (pagine non ancora create, punti 6-7 di `PAGES.md`).
- Sostituire o togliere i tre progetti fittizi; completare le schede reali
  con i dati del cliente (superfici, tempi, brand, progettista).

---

## 2026-09-30 (3) — Contatti, richiesta preventivo, architetti

**Richiesta**

Procedere con i primi due punti dell'ordine di costruzione di `PAGES.md`.
Punti 1, 3 e 4 erano già fatti: si sono presi il 2 (`contatti.html` +
`richiedi-preventivo.html`) e il 5 (`architetti.html`).

**Fatto** (non committato, insieme alle due voci precedenti)

- `richiedi-preventivo.html`: tre schede su cosa succede dopo, modulo a
  gruppi (Chi sei · Il progetto · Cosa ti serve · Dettagli) con settore,
  intervento, località, superficie, tempi, budget, stato del progetto,
  servizi, allegati, privacy.
- `contatti.html`: quattro recapiti (sede, commerciale/tecnico, PA/MEPA,
  progettisti), form breve con motivo del contatto, mappa OpenStreetMap.
- `architetti.html`: servizi per lo studio, "Il progetto resta vostro",
  risorse, impegni verso gli studi, CTA "Invia il capitolato".
- CSS sezione 16: gruppi di campi (`.form--stack`, `.form__group`,
  `.form__legend`), opzioni radio/checkbox (`.form__options`), intro del
  form sticky, `.mappa`. JS: preselezione delle `<select>` da URL.
- Link: "Contattaci", "Contatti", "Richiedi un preventivo/progetto",
  "Parla con un tecnico" e "Architetti" in tutto il sito puntano alle
  nuove pagine, al posto di `#` o dei `mailto:` del restyling. Resta
  `mailto:` solo "Richiedi il capitolato tipo" (è un documento).
- Contract, sezione 03: schede A/B/C → Studio/Impresa/Committente (era una
  numerazione annidata sfuggita la volta scorsa).

**Decisioni e perché**

- *OpenStreetMap invece di Google Maps*: l'embed Google senza chiave in
  test mostrava la pagina di consenso; OSM non ha consenso né chiave. Il
  segnaposto è su Rende centro finché non c'è l'indirizzo vero.
- *Dati segnaposto*: indirizzo, PEC, telefono restano "—" / 0000 come nel
  resto del sito. Impegni verso gli studi (es. fattibilità in 5 giorni) e
  fasce di budget sono proposte da validare.

**Verifiche** (Chrome headless)

- 17 pagine × 1920/1440/1366/1100/768/390px: nessun overflow, nessun
  errore JS; nessun link interno verso file inesistenti.
- Preventivo: vuoto bloccato, compilato inviato, `?settore=` e
  `?profilo=` preselezionano; contatti: `?motivo=tecnico` preseleziona.

**Aperto**

- Area progettisti (`#`): pagina ad accesso riservato non ancora prevista.
- Validare con il cliente testi, impegni e fasce di budget.

---

## 2026-09-30 (2) — Modifiche dalla riunione del 28 settembre

**Richiesta**

1. Menu: i 5 settori restano, ma senza sotto-menu.
2. Nuova voce "Realizzazioni": pagina con tutti i progetti, filtrabile per
   i 5 settori.
3. Pagine settore più descrittive, con foto generiche, oltre ai progetti.
4. Riga del menu larga come le due righe dell'header sopra, non a tutto
   schermo.
5. Form contatti completo in fondo a ogni realizzazione.
6. Via le numerazioni annidate (es. su misura: sezione 01 con elenchi 01…).

**Fatto** (non committato, insieme al lavoro della voce precedente)

- `shell.js`: tolte le 5 tendine e i 5 accordion mobile; settori come link
  semplici; "Realizzazioni" prima delle voci aziendali (attiva anche su
  `realizzazione.html` via `data-nav-alias`); link nel footer.
  `artes.js`: rimossi `initDrops` e gli accordion. CSS: rimosse `.drop*`,
  `.nav__trigger`, regole accordion.
- Larghezza menu: sopra i 1600px topbar e riga logo erano centrate su
  1600px, la riga menu no. Aggiunta `.navbar` alla stessa regola.
- `realizzazioni.html` (nuova): 14 progetti, filtri per settore,
  `?settore=` preseleziona il filtro. Aggiunti 4 progetti reali di uffici
  mai usati come card: Ruffolo Group, Costruzioni Imbrogno, Arpacal,
  Quotidiano (sala conferenze). Aggiunti anche nella pagina uffici.
- Pagine settore: foto generica a tutta larghezza (render dei brand),
  sezione "Il settore" con testo e 3 schede, ambiti come testo (non più
  link), link "Tutte le realizzazioni …" all'archivio filtrato.
- `realizzazione.html`: la fascia CTA finale diventa il form contatti
  (nome, azienda, email, telefono, profilo, settore preselezionato,
  località, tempistiche, messaggio, allegati, privacy). Invio simulato con
  messaggio di conferma. Breadcrumb Home / Realizzazioni / progetto.
- Numerazioni annidate tolte: home (fasi del metodo, tessere settori,
  lavorazioni), su misura (reparti → "Officina interna"/"Rete di partner",
  ciclo produttivo), contract (7 fasi, card settori). Le card settori di
  contract avevano ancora i nomi vecchi (Workspace, Food Retail…): ora
  hanno i 5 nomi e linkano le pagine. Corretto anche un testo in chi-siamo.
- Home: link "Tutte le realizzazioni" sotto la griglia progetti.

**Decisioni e perché**

- *Hamburger fino a 1365px* (era 1279): con "Realizzazioni" la riga
  sfora sotto ~1300px. A 1366px (portatili comuni) i due gruppi sono
  staccati di 60px contro i ~18 fra le voci.
- *Testi descrittivi dei settori scritti da noi*: sono bozze coerenti col
  tono del sito, da far validare al cliente.
- *Agricola Benincasa non messa in archivio*: le foto mostrano un punto
  vendita con ufficio, non è chiaro in che settore vada.

**Verifiche** (Chrome headless, cache disabilitata)

- 14 pagine × 1920/1440/1366/1365/1280/1100/768/390px: nessun overflow
  orizzontale, nessun errore JS, voce attiva corretta.
- Filtro da URL (valore valido e non valido), form (vuoto bloccato,
  compilato → conferma), screenshot di archivio, pagina settore, scheda
  desktop e mobile, header a 1920px.

**Aperto**

- Far validare al cliente i testi "Il settore" delle 5 pagine.
- Settore di Agricola Benincasa.
- Invariato dalla voce precedente: `.bg-alt` da confermare,
  `sistema-visivo.html` e §"Regole di stile" di `PAGES.md` da aggiornare.

---

## 2026-09-30 — Allineamento al restyling del titolare (ChatGPT)

**Richiesta**

Il titolare ha rifatto la grafica di 9 pagine con ChatGPT
(`artes-contract.minimalstudio.chatgpt.site`). Portare le modifiche grafiche
sul nostro codice per tornare a lavorare sul mockup.

**Analisi**

- La sua versione parte dal commit `0d21fa1` (diff HTML quasi nullo, CSS
  identico salvo le aggiunte): non ha il menu a due righe, lo shell, i nomi
  settore del cliente né gli sfondi alternati `.bg-alt`.
- Le modifiche sono: due blocchi accodati al CSS ("Restyling 2026" e
  "Revisione cromatica bianco/nero/rosso"), `margin-bottom` sulle azioni
  dell'hero, uno slider nella sezione Produzione della home (HTML + JS),
  3 link "Richiedi preventivo/capitolato" diventati `mailto:`.

**Fatto** (non committato)

- `artes.css`: i due blocchi diventano le sezioni 14 e 15, adattati al
  nostro header (`.navbar` al posto di `.nav`). Le regole header/nav mobile
  sono state spostate dal breakpoint 1024px al nuovo breakpoint header,
  senza duplicarle.
- Foto nelle tendine: lui ne aveva messe 2 su 3; qui tutte e 5
  (bbc-tarsia, arken-cage, sakuralab, jumecitu, royal).
- `index.html` + `artes.js`: slider Produzione. `contract.html`,
  `arredamento-su-misura.html`: link `mailto:`.
- `CLAUDE.md` §4-5 aggiornati con le nuove regole di stile.

**Decisioni e perché**

- *Hamburger a ≤1279px invece di ≤1180px*: il suo menu era su una riga con
  3 settori; i nostri 5 settori stanno nella riga solo da ~1200px e sotto i
  1280px i due gruppi si toccano (28px). A 1280px lo stacco è 72px.
- *Altezza hero `100svh - 160px` invece di `- 110px`*: il nostro header è
  alto 161px contro i ~110 del suo.
- *`.bg-alt` mantenuto*: è l'unica differenza visibile rispetto alla sua
  versione (fasce #E8E8E8 su fondo ora bianco). Da confermare col titolare.

**Verifiche** (Chrome headless via CDP)

- Screenshot affiancati suo/nostro di home, ufficio, contract: allineati
  salvo `.bg-alt`.
- 13 pagine × 1440/1280/1100/390px: nessuno scroll orizzontale, nessun
  errore JS, navbar sopra 1280 e hamburger sotto.
- Slider (avanti/contatore), tendina con foto, nav mobile aperta.

**Aperto**

- Confermare col titolare se tenere le fasce grigie `.bg-alt`.
- `sistema-visivo.html` e `PAGES.md` §"Regole di stile" descrivono ancora
  le vecchie regole (griglie `gap: 1px`, palette calda).

---

## 2026-09-22 — Header/footer unici + nomenclatura settori del cliente

**Richiesta**

1. Creare un documento di contesto per non dover rileggere tutto il sito a
   ogni sessione.
2. Rendere header e footer un'unica sorgente condivisa da tutte le pagine,
   come già avviene per CSS e JS.
3. Applicare la mail del cliente sulla nomenclatura dei settori: 5 nomi
   nuovi, tutti e 5 visibili nel menu principale (niente più voce
   accorpata "Arredamento negozi e food"), correzione dell'inversione fra
   "Bar & ristoranti" e "negozi food".

**Fatto**

- `CLAUDE.md` in root + questo diario.
- Commit `9eea402` — header e footer estratti in `assets/js/shell.js`. Le 13
  pagine contengono solo i segnaposto `data-artes-header` /
  `data-artes-footer`: −2.860 righe duplicate. La voce di menu attiva è
  calcolata dal nome del file (`markActive`), con alias opzionali via
  `data-nav-alias` per future pagine figlie di un settore.
- Commit `141394c` — nuova nomenclatura e menu:
  - nomi: Arredo uffici & workspace · Arredo negozi & retail · Arredo
    negozi food · Arredo bar & ristoranti · Arredo hotel & hospitality;
  - scambio dei file invertiti: `arredamento-bar-ristoranti.html` →
    `arredo-negozi-food.html`, `arredamento-alimentari-wine-food.html` →
    `arredamento-bar-ristoranti.html`;
  - header su due righe (logo + azioni / navigazione), 5 tendine
    indipendenti, nav mobile con 5 accordion;
  - tendine allineate sotto la propria voce (`--drop-x`, impostata da
    `align()` in `artes.js`);
  - sotto-voci: "Alimentari e market gourmet", "Studentati, foresterie e
    co-living".

**Decisioni e perché**

- *Shell JS invece di Jekyll o di uno script di build*: nessuna build da
  lanciare, preview locale invariata, funziona anche via `file://`. Una
  build era già stata rimossa dal progetto in passato.
- *Header a due righe*: le 9 voci con i nomi lunghi del cliente richiedono
  ~1.200px; su una riga con logo e bottoni non ci stanno. Misurato con
  Chrome headless: a 1320px (larghezza minima del desktop) i due gruppi
  restano separati da 75px, nessuno scroll orizzontale. Corpo nav 13,5px
  per i settori, 13px per le voci aziendali.
- *Scambio dei nomi file invece dei contenuti*: i contenuti di ciascuna
  pagina (ambiti, testi, foto, progetti, numerazione 03/04) erano già
  coerenti fra loro; era sbagliata solo l'etichetta. Così 4 URL su 5
  restano identici.
- *"Residence e business hotel" non toccata*: è la categoria del progetto
  reale Business Hotel Fera; per allargare a studentati e foresterie si è
  modificata invece "Co-living e serviced apartment".

**Verifiche eseguite** (Chrome headless via DevTools Protocol)

- 13 pagine: header e footer iniettati, segnaposto spariti, voce attiva
  corretta, nessun errore JS, nessuno scroll orizzontale a 1320px.
- Tendine: hover e focus aprono il pannello giusto, Escape chiude, una
  aperta per volta.
- Mobile 390px: hamburger, 5 accordion, uno aperto alla volta, "Vedi tutto"
  punta alla pagina giusta.
- Filtri progetti di home e pagine settore: ogni card ha il suo filtro,
  nessun filtro vuoto senza messaggio.

**Seguito: perché il menu nuovo non si vedeva online**

- Il push di `main` era avvenuto, ma GitHub Pages non pubblicava `main`:
  la sorgente era impostata dall'11 settembre sul branch di prova
  `test-sfondi-alternati` (commit `8d53776`, sfondi alternati al posto dei
  filetti fra sezioni). Online restava quindi il menu vecchio e
  `shell.js` dava 404. Verificato confrontando il sito live con quel
  commit (identici) e con l'elenco dei deploy via API pubblica GitHub.
- Deciso con Claudio (opzione B): la prova degli sfondi era approvata, va
  in `main`. Commit di merge `311099d`. Conflitti solo sui due settori
  scambiati, risolti portando `bg-alt` sul file che ora contiene quel
  contenuto. Rifatte le verifiche su 13 pagine: tutto regolare.
- Regola aggiunta a `CLAUDE.md` e `PAGES.md`: stacco fra sezioni chiare
  col fondo `.bg-alt`, non col filetto.

**Aperto**

- ~~Sorgente di GitHub Pages da riportare su `main`~~ — fatto: il push di
  `6c40f81` ha avviato il deploy da `main`, e il sito live mostra menu
  nuovo e sfondi alternati (verificato in Chrome headless sul dominio
  pubblico).
- **"Enoteche"**: la mail la elenca fra le sotto-categorie di negozi food,
  ma oggi sta sotto bar & ristoranti ("Wine bar ed enoteche"). Da chiarire
  col cliente prima di spostarla.
- **Altre sotto-categorie citate nella mail e non ancora nelle tendine**:
  "enti pubblici" (uffici & workspace), "residenze collettive" e "camerate"
  (hotel & hospitality). Proposte a Claudio, in attesa di risposta.
- **Contenuti**: il cliente ha annunciato proposte di modifica dei testi.
  I titoli H1 e le lead delle pagine settore sono rimasti quelli di prima.
  Anche le meta description non sono cambiate: quella hotel potrebbe
  citare studentati e residenze.
- **Link rotto preesistente**: `richiedi-preventivo.html` è linkata da
  `contract.html` (×2) e `arredamento-su-misura.html` ma non esiste ancora.
  Su Pages dà 404: va creata o riportata a `href="#"`.
- **History git**: per la storia di `arredo-negozi-food.html` prima del
  2026-09-22 bisogna guardare `arredamento-bar-ristoranti.html` (git non
  collega la rinomina, perché il vecchio percorso è stato riusato nello
  stesso commit).
