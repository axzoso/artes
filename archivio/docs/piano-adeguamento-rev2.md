# Piano di adeguamento di dev3 alla rev2

**Data:** 2026-11-19 · **Stato:** piano approvato (decisioni al §8); **tutte le fasi 0–9 completate (2026-11-23)** (vedi §10);
in attesa del controllo manuale dell'utente (eventuali ritocchi, conferma sui 31 allegati orfani / commit-push) e, come ultimo passo finale, della traduzione EN/WPML + collegamento selettore `IT / EN`
**Riferimento:** cartella `artes-sito-rev2/` (aggiunta nel commit `97b1672`, già pubblicata su
`https://axzoso.github.io/artes/artes-sito-rev2/`).

## 1. Obiettivo

Il sito WordPress su dev3 deve corrispondere alla **rev2**, sviluppata separatamente dal titolare dopo le
modifiche chieste dal cliente: stessa veste grafica, stesse pagine, stessi testi. La struttura cambia poco,
ma ogni dettaglio visivo e testuale della rev2 prevale su quanto costruito finora. La rev2 diventa la nuova
fonte di verità al posto del mockup in radice.

## 2. Stato dei connettori (verificato il 2026-11-19)

| Connettore | Esito | Note |
|---|---|---|
| Novamira (PHP, WP-CLI, file) | **attivo** | WordPress 7.1.5, plugin `artes-core` 0.4.0 |
| Elementor MCP | **attivo dopo un adeguamento** | il server ora usa il protocollo 2025-11-25 e vuole l'intestazione `MCP-Protocol-Version`; gli strumenti sono 36 (prima 22), con in più revisioni/annullamento, caricamento media, informazioni di sistema, pulizia cache |

Corretto oggi in `tools/mcp.ps1`: (1) lettura di `~/.claude.json` quando contiene la stessa cartella con
maiuscole diverse (`C:/…` con i connettori, `c:/…` senza); (2) invio dell'intestazione del protocollo.
**Da sapere:** le sessioni aperte con la lettera di unità minuscola non caricano i connettori come strumenti
nativi (gli script funzionano comunque, leggono la voce giusta). Non ho toccato la configurazione.

Stato di dev3: WordPress 7.1.5, Hello Elementor 3.5.2, Elementor e Pro 4.4.1, JetEngine 3.9.1.2, WPML e String
Translation 5.2.0, Novamira 1.12.16. Contenuti: 17 pagine, 14 realizzazioni, 19 brand, 62 allegati, 7 template.
Nessun contenuto risulta modificato dopo il 5 novembre (indizio parziale: le composizioni Elementor non
aggiornano la data di modifica).

## 3. Cos'è la rev2

### 3.1 In numeri

| | mockup attuale (radice) | rev2 |
|---|---|---|
| Pagine HTML | 32 | 49 |
| CSS | 1.778 righe | 2.444 righe (922 nuove, 256 sparite) |
| JavaScript | `shell.js` + `artes.js` | solo `artes.js` (408 righe); **header e footer ripetuti in ogni pagina** |
| Classi CSS usate | 222 | 245 (109 nuove, 86 non più usate) |
| Immagini | 60 | 179 (130 nuove, 18 sostituite a parità di nome, 11 non più presenti), 47 MB |
| Realizzazioni | 14 (4 fittizie) | 20, senza i 4 fittizi (171 foto in galleria) |
| Schede brand | 1 (Pedrali) | 18 |

I commenti del CSS indicano più giri di revisione (`rev02`, `rev02.2`, `rev03`, `rev05`).

### 3.2 Veste grafica

- **Palette:** antracite `#393E42` (approvato da Artes il 10/11/2026) al posto del nero `#111` per fasce scure,
  footer, brand e hero del Contract; `--night` `#2F3438`. Resto bianco/nero/rosso; **font invariati**
  (Archivo, Instrument Sans, IBM Plex Mono da Google).
- **"Meno fasce nere":** CTA e riquadri scuri passano a fondi chiari (`#efefef`), le tessere scure diventano
  bianche con filetto rosso; in compenso compaiono **fasce rosse piene** (CTA di fine pagina, pannello CTA della
  home, barra dei numeri del Contract).
- **Header:** riga unica con logo e 7 voci (settori, Su misura, Contract) più **"Realizzazioni" con tendina**
  dei 5 settori; topbar con Chi siamo, Blog, Contatti, IT / EN; **niente** pulsanti "Area progettisti" e
  "Contattaci"; su mobile pannello con accordion.
- **Footer:** antracite, logo bianco nuovo (`artes-logo-bianco.png`), dati reali: Via A. Nervoso 1, 87036 Rende
  (CS), T +39 0984 462039, info@artessrl.it, © 2026 Artes srl, P.IVA 02343330789.
- **Componenti nuovi:** metodo in 6 fasi con punti rossi e carosello su mobile; tessere settori numerate 01-05;
  scheda progetto (parola chiave SEO, riquadro fatti, galleria asimmetrica con lightbox e didascalie); blocco
  "split" con colonna laterale fissa e testo discorsivo; categorie con tipologie; domande frequenti
  (`details`); elenco "commesse"; riga dei brand del settore; pagina Contract in 10 blocchi con indice interno;
  team; archivio realizzazioni a due livelli.

### 3.3 Struttura e contenuti

- **Nomenclatura:** "e" al posto di "&" ("Arredo uffici e workspace"). **Ordine dei settori:** uffici, retail,
  **bar e ristoranti (03), negozi food (04)**, hotel: invertito rispetto a `CLAUDE.md` §3 (i nomi dei file
  restano uguali).
- **Pagine settore** completamente nuove: approccio, categorie con tipologie, "cosa facciamo per voi", commesse,
  5 domande frequenti, brand partner del settore, CTA. Il blocco "Il nostro punto di vista" scritto il 5/11 viene
  sostituito.
- **Archivio realizzazioni:** schede per settore + filtri per **categoria** (22 filtri in 5 settori, alcuni senza
  progetti), conteggio, filtri anche da URL (`?settore=…&categoria=…`). Le pagine settore elencano **26**
  categorie (retail ne ha 10 contro 6 filtri: 4 senza progetti e senza filtro) e linkano all'archivio filtrato
  solo quelle con progetti.
- **Scheda progetto:** eyebrow "settore — categoria", titolo, riga parola chiave, introduzione, fatti
  (località, settore, tipologia, progettista), galleria (prime 5 foto visibili, il resto nella lightbox),
  "Scheda del progetto" + testo, CTA rossa, 3 altre realizzazioni dello stesso settore.
- **Scheda brand (18):** quattro righe fisse (categoria, settori Artes, fornitura, assistenza), due sezioni di
  testo ("Come lavoriamo con X", "Dove lo usiamo" con link ai progetti), foto opzionale, progetti collegati.
- **Nessun modulo:** ogni "Richiedi un preventivo" punta a `#contatti` (colonna del footer) o a una mail.
- **Link morti `#`:** Blog (147 occorrenze), Prodotti, Area progettisti, MEPA, Cataloghi PDF (circa 50 ciascuno).
- **Team** in "Chi siamo": 6 segnaposto "Nome Cognome" con silhouette.
- **SEO:** tutte le 49 pagine hanno `<title>` e `meta description` propri.

### 3.4 Regole del progetto che la rev2 supera (da aggiornare in `CLAUDE.md`)

Nessuna tendina nel menu · `&` nei nomi dei settori · ordine dei settori · nessuna ombra (c'è su tendina e
lightbox) · nessun angolo arrotondato (punti delle fasi) · rosso mai come fondale (fasce rosse piene) · hover senza
movimento (zoom delle foto, freccia che si sposta) · modulo di contatto in coda alle schede.

### 3.5 Difetti e limiti della rev2 da conoscere

- CSS morto: `#drop-ufficio .drop__ph` rimanda a una cartella inesistente (`bbc-tarsia`); resti del vecchio
  mega-menu, da **non** portare.
- Segnaposto (team) e link `#` ovunque per le pagine non create; "Privacy · Cookie · MEPA" nel footer è solo
  testo, senza pagine.
- Nessun link a file inesistenti e nessuna immagine rotta (controllato su tutte le 49 pagine).
- Mobile a 390 px su 9 pagine campione (home, settori, Contract, Chi siamo, Su misura, archivio, scheda progetto,
  scheda brand): nessuno scroll orizzontale, un solo H1. Il resto va verificato a ogni fase (§6).
- **Filtri della pagina Brand Partner** (trovato in fase 4, **corretto il 2026-11-20** in `artes-sito-rev2/assets/css/artes.css` e su dev3): aggiunta `.brand[hidden] { display: none; }` e rigenerato `artes-rev2.css`; verificato in parità (`18/18` → `3/3`, `2/2`, `1/1`).
- **Contract a `768 px`** (trovato in fase 5): `.contract-scope__card` deborda di `20 px` a `768 px` sia nella rev2 che su dev3 (nessun overflow a `1440`, `1024` e `390` px).
- Nessuna icona del sito (`favicon`) né nella rev2 né in dev3.

### 3.6 Mappa rev2 ↔ dev3

| rev2 | dev3 oggi | Azione |
|---|---|---|
| `index.html` | Home 376 | ricostruire |
| 5 pagine settore | 144-148 | ricostruire con la nuova struttura; togliere il blocco "racconto" |
| `arredamento-su-misura.html` | 149 | ricostruire |
| `contract.html` | 150 | ricostruire da zero (10 blocchi, indice interno, barra numeri rossa) |
| `chi-siamo.html` | 151 | ricostruire (storia, tappe, come lavoriamo, team) |
| `brand-partner.html` | archivio brand 447 | ricostruire |
| 18 `brand-*.html` | template 448 + 19 brand | nuovo template, aggiornare 18, **togliere Mottura** |
| `realizzazioni.html` | archivio 213 | ricostruire (schede + filtri a 2 livelli + conteggio) |
| 20 `realizzazione-*.html` | template 138 + 14 progetti | nuovo template; aggiornare 10, **creare 10**, **togliere 4 fittizi** (Aurea, Resort Capo Bianco, Spa Terme Luigiane, Business Hotel Fera); rinomine `bbc-tarsia` → `bcc-tarsia`, `quotidiano` → `il-quotidiano` |
| header / footer | 199 / 200 | ricostruire |
| — | Contatti 152, Preventivo 154, Area progettisti 153, Prodotti 471, MEPA 472, Cataloghi 491, Privacy 3, Cookie 493 | **non esistono in rev2: serve una decisione** (§8) |

## 4. Approccio tecnico

1. **rev2 in sola lettura e versione congelata** (commit `97b1672`). Se il titolare la aggiorna, si rilancia la
   pipeline: niente lavoro a mano da rifare.
2. **CSS identico, portato in modo automatico.** `tools/port-css.js` trasforma `artes.css` della rev2 in un file
   del plugin (selettori con prefisso per vincere sugli stili di Elementor e del tema, CSS morto escluso). Le
   classi globali di Elementor servono solo a dare il nome alle classi, con lo stesso nome della rev2. Si
   elimina il CSS scritto a mano finora (hover, menu, pagine) che altrimenti si sovrapporrebbe.
3. **DOM fedele, generato dalla rev2.** `tools/html2elementor.js` converte l'HTML in composizioni Elementor
   (contenitori con lo stesso tag `section`/`nav`/`header`/`aside`, `e-heading`, `e-paragraph`, `e-image`,
   `e-button`, `e-list`, `e-accordion`, `e-carousel`) con le stesse classi. Sostituisce gli estrattori scritti
   pagina per pagina.
4. **Parti dinamiche** (progetti, brand, archivi, correlati, galleria) restano CPT e template, con i dati importati
   dalla rev2.
5. **Costruzioni senza widget equivalente** (elenchi `dl`/`dt`/`dd`, `ol`, attributi `data-*`): regole dichiarate
   nello spike (§5, fase 1); ripiego sul widget HTML per i frammenti semantici.
6. **Parità misurata** con confronti automatici rev2 contro dev3, non a occhio (§6).

Alternative scartate: *una pagina = un blocco HTML* (parità immediata ma non modificabile, non traducibile e
senza dati dinamici) e *ricostruire a mano ogni pagina come finora* (lento e non ripetibile).

## 5. Fasi

| Fase | Contenuto | Esito atteso | Stima |
|---|---|---|---|
| **0. Messa in sicurezza** | Richiesta di backup completo a chi gestisce dev3 (oggi non ce n'è); snapshot JSON di variabili, classi, template, pagine e menu in `tools/out/backup-…`; tag git `pre-rev2`; ripristino provato su una pagina | si può tornare indietro | ½ sessione |
| **1. Spike tecnico** | Su 3 campioni (hero + metodo della home, scheda progetto, FAQ di un settore) verificare: classi globali "solo nome" + CSS portato; specificità; markup di `e-accordion`/`e-list`/`e-carousel` rispetto al CSS rev2; menu con sottomenu e accordion mobile; tag semantici; `strong`/`span` nei testi; filtro lato client sui loop | regole di conversione, go/no-go, stima rivista | 1 sessione |
| **2. Fondamenta** | Variabili del kit (antracite…); port del CSS nel plugin; ≈245 classi; logo bianco e immagini (130 nuove, 18 sostituite, alt dalla rev2) importate dall'URL di Pages; JavaScript del plugin allineato alla rev2 (tendina, lightbox, filtri a due livelli, carosello fasi, slider produzione); **header e footer** con dati reali | base comune pronta | 1-2 sessioni |
| **3. Dati** | Tassonomie: `settore` con nomi "e", nuovo ordine, slug come i codici rev2 (`uffici`, `retail`, `bar-ristoranti`, `food`, `hospitality`); nuova `categoria` figlia (26 voci, 22 mostrate nei filtri dell'archivio); campi dei CPT; import di 20 realizzazioni e 18 brand dalla rev2; relazioni brand ↔ progetti; Mottura e 4 fittizi nel cestino (recuperabili) | contenuti identici alla rev2 | 1-2 sessioni |
| **4. Template e archivi** | Singolo realizzazione, singolo brand, archivio realizzazioni, archivio brand | tutte le schede e gli elenchi | 1-2 sessioni |
| **5. Pagine** | Home, 5 settori, Su misura, **Contract**, Chi siamo | pagine statiche | 2-3 sessioni |
| **6. Pagine fuori rev2** | Secondo la decisione (§8); privacy e cookie con i dati reali di Artes srl | nessun link rotto | ½-1 sessione |
| **7. SEO on-page** | `title` e `description` delle 49 pagine dalla rev2 (campi nel plugin, nessun plugin SEO), alt, H1 | SEO come rev2 | ½ sessione |
| **8. Collaudo di parità** | Dalla fase 2 in poi, a ogni pagina; poi giro completo desktop e mobile | report senza scostamenti | 1-2 sessioni |
| **9. Chiusura** | `CLAUDE.md` (regole nuove), `wp-stato-dev3.md`, diario, `tools/README.md`; commit e push solo su richiesta | tutto documentato | ½ sessione |

**Stima grossolana: 10-14 sessioni di lavoro.** La parte più incerta è la fase 1: l'esito può spostare la stima.

## 6. Verifica di parità

Per ogni pagina rev2 (servita da Pages o in locale) contro la pagina dev3:

- **screenshot** a 1440, 1024, 768 e 390 px con differenza visiva e soglia;
- **geometria e stili calcolati** per elemento abbinato per classe (posizione, dimensioni, font, colori, spazi), con elenco degli scostamenti oltre ±2 px;
- **testo visibile** normalizzato: identico al 100%;
- **link** (destinazioni rev2 tradotte nei permalink WordPress) e **immagini** (file e testo alternativo);
- **interazioni**: tendina, menu mobile, filtri (URL compreso), lightbox, domande frequenti, caroselli;
- controlli già in uso: scroll orizzontale, immagini rotte, un solo H1, errori di console.

## 7. Rischi

1. **Limiti di Elementor V4:** niente attributi `data-*`, niente `ol` né `dl`, markup proprio per accordion e liste → regole di conversione e, dove serve, widget HTML.
2. **Conflitti di specificità** con Elementor e Hello → prefisso nel port e `!important` mirati, misurati nello spike.
3. **La rev2 cambia ancora** → pipeline ripetibile, versione di riferimento congelata.
4. **Nessun backup di dev3** → fase 0 prima di qualsiasi sostituzione.
5. **Decisioni già prese con il cliente contraddette dalla rev2** (§3.4) → seguo la rev2 come richiesto e lo documento.
6. **Peso immagini** (47 MB) → miniature di WordPress, caricamento differito; ottimizzazione solo su richiesta.
7. **Aggiornamenti di dev3** (Elementor 4.4.1, WPML 5.2) → regressione a ogni fase.
8. **Traduzione EN:** i testi cambiano molto, resta in coda come previsto.

## 8. Decisioni (prese dal titolare il 2026-11-19)

| # | Tema | Decisione |
|---|---|---|
| 1 | Pagine che la rev2 non ha | **Contatti (152), Richiedi preventivo (154), Area progettisti (153), Prodotti (471), MEPA (472), Cataloghi (491): in bozza** (si preparano e si toglieranno dalla nav); **Privacy (3) e Cookie policy (493) restano pubblicate** (con i dati reali di Artes srl, fase 6). *Aggiornamento 2026-11-23 (post-fase 9):* tutte e 6 le bozze sono state ricostruite in grafica **rev2** (`tools/rev2/pagine-bozze-rev2.js`); **solo Contatti (`152`)** è stata pubblicata con modulo `e-form` e collegata ai pulsanti/menu rev2 (`aggiorna-link-contatti.js`), mentre le altre 5 restano in `draft` |
| 2 | Moduli | **Tolti**, per seguire la rev2, ma **salvati** per rimetterli: 3 sezioni come template della libreria `[Riserva]` (539 contatti, 540 preventivo, 541 scheda realizzazione; `tools/riserva-moduli.ps1`, `tools/riserva-moduli/README.md`). *Aggiornamento 2026-11-23:* riattivato il modulo `e-form` in grafica rev2 nella sola pagina pubblicata **Contatti (`152`)** (e preparato in bozza su `154` Richiedi preventivo); `[Riserva]` `539–541` preservati |
| 3 | Link `#` e rotti | Replicati come nella rev2; quelli vuoti o rotti **risolti con la logica più immediata del sito**, in un solo file, `tools/rev2/mappa-link.json`: Blog → Realizzazioni · Prodotti e Cataloghi PDF → Brand Partner · Area progettisti → Contract (`#interlocutori`) · MEPA → Arredo uffici e workspace (la pagina che ne parla) · `#contatti`, CTA `mailto:` e Diventa partner di produzione → **`/contatti/`** (aggiornato 2026-11-23 con la pubblicazione di `152`; preservati `tel:` e email esplicite con `@`) |
| 4 | Segnaposto del team ("Nome Cognome") | Replicati |
| 5 | Slug dei termini | Replicati (`uffici`, `retail`, `bar-ristoranti`, `food`, `hospitality`, categorie come rev2) |
| 6 | Dove vive la rev2 | Resta in `artes-sito-rev2/`; può sostituire il mockup in radice **a fine lavoro**, solo con il tuo OK per il push |
| 7 | Backup di dev3 | **Fatto dal titolare in locale (2026-11-19)**; in più snapshot JSON in `tools/out/backup-2026-11-19/` (`tools/snapshot-dev3.ps1`) e tag git `pre-rev2` |
| 8 | CPT `realizzazione` e `brand` | **Replicati dalla rev2** (campi, 20 realizzazioni, 18 brand, relazioni): fase 3 |

## 9. Cosa non faccio senza tua conferma

Modificare la configurazione dei connettori in `~/.claude.json` · installare plugin **nuovi** (l'aggiornamento di
`artes-core` fa parte del lavoro) · mettere nel cestino o eliminare contenuti su dev3 (Mottura, 4 progetti
fittizi, pagine fuori rev2: l'elenco preciso lo chiedo all'inizio della fase 3 e della fase 6) · impostare `noindex`
o altre impostazioni del sito · aggiornare le variabili del kit e accendere la rev2 per tutto il sito (fase 9) ·
commit e push.

## 10. Avanzamento

| Fase | Stato | Esito (dettagli in `diario-sessioni.md` e `wp-stato-dev3.md`) |
|---|---|---|
| 0. Messa in sicurezza | **fatta** (2026-11-19) | backup locale del titolare; snapshot JSON; tag `pre-rev2`; ripristino delle scritture provato con `elementor-manage-revisions` (`undo_revision_id`) |
| 1. Spike tecnico | **fatta** (2026-11-19) | via libera: [`rev2-regole-di-conversione.md`](rev2-regole-di-conversione.md) |
| 2. Fondamenta | **fatta** (2026-11-19) | 180 immagini rev2 nella libreria (149 nuove, 31 riusate) con mappa `tools/out/rev2/media-rev2.json`; 473 classi globali (260 per la rev2; le 23 in collisione col vecchio design rinominate `o-*`); CSS della rev2 portato in modo automatico nel plugin (`artes-rev2.css`) e JavaScript di header/footer (`artes-rev2.js`); header **557** e footer **971** rev2 (condizione: solo la pagina di prova 542); convertitore HTML→Elementor `tools/rev2/html2elementor.js`; strumenti di parità. **Parità misurata**: Chi siamo e Contract, a 1440/1024/768/390 px, altezze identiche e 0,1-0,4% di pixel diversi (solo il ricampionamento delle foto); interazioni di tendina e menu mobile identiche; le 12 pagine vecchie restano pixel-identiche |
| 3. Dati | **fatta** (2026-11-20) | tassonomie (`settore` con slug rev2, **nuova `categoria`** con 26 termini, `categoria_brand` con i nomi rev2); 11 campi nuovi con regole WPML; **20 realizzazioni** (10 aggiornate sul posto, 10 nuove, 2 rinominate con redirect) e **18 brand** con i campi rev2; 27 immagini-copia con alt dedicato; 8 relazioni brand ↔ progetti; **nel cestino** (recuperabili) i 4 progetti fittizi e Mottura. Verificata con `tools/rev2/verifica-dati.js`: **1.028/1.028** controlli (prima dell'import 185/550). Resta da fare, per scelta, a fine fase 4: togliere i campi del vecchio modello (i template vecchi li leggono ancora) |
| 4. Template e archivi | **fatta** (2026-11-20) | site part **1040** (singolo realizzazione), **1049** (singolo brand), **1050** (archivio realizzazioni), **1051** (archivio brand), scritti come HTML con attributi (`tools/rev2/modelli/`) e convertiti in widget con tag dinamici nativi; plugin **0.6.2** (shortcode dei valori calcolati, filtri dei cicli, dati dei filtri, redirect dei termini); header 557 e footer 971 rev2 sulle schede e sugli archivi; i vecchi 138/448/213/447 **in bozza** (ritorno indietro in 5 passi, `wp-stato-dev3.md` §9). **Parità su tutte le 40 pagine** (20 realizzazioni, 18 brand, 2 archivi): altezze identiche a 1440 e 390 px (e a 1024/768 su un campione), nessuno scroll orizzontale, contenuti identici, pixel diversi al massimo 2,6% (foto); lightbox, filtri e header identici anche sugli indirizzi veri; controllo di salute 80/80; reindirizzamenti 17/17. **Campi del vecchio modello tolti** (1.094/1.094; salvataggio e annullamento provati). Restano: eliminare i menu dei filtri con la Home rinnovata (fase 5) e i template vecchi con le altre pulizie (fase 9) |
| 5. Pagine | **fatta** (2026-11-20) | **Home (376)**, **5 settori (144–148)**, **Arredo su misura (149)**, **Contract (150)**, **Chi siamo (151)** pubblicate e attive in modalità rev2 (`_artes_rev2 = 1`, header 557 e footer 971). Home generata da `tools/rev2/modelli/home.html` con cicli dinamici per Realizzazioni (`artes_progetti_home_rev2`) e Brand (`archivio_brand`); FAQ dei 5 settori come `e-accordion` nativi con `FAQPage` JSON-LD; 17 copie immagini con alt dedicato (`import-media-pagine.js`); plugin **0.7.0** (slider produzione, filtri progetti Home, pallini metodo mobile, fix filtro Brand Partner anche in `artes-sito-rev2`); `cdp-session.js` corretto (`DOMContentLoaded`). **Parità 9/9 pagine** (`Δ 0` altezza, `0 px` scroll a 1440/390, contenuti identici, max `1,3%` pixel foto) + campione `1024/768`; interazioni live FAQ/Home/Header in parità; salute `18/18` + `80/80` CPT; non-regressione `40/40` CPT e `6/6` pagine vecchie residue (`0%`); dati `1.099/1.099`, redirect `17/17`, link `0` rotti |
| 6. Pagine fuori rev2 | **fatta** (2026-11-20) | 6 pagine non presenti nella rev2 spostate in **bozza** reversibile (`152` Contatti, `153` Area progettisti, `154` Richiedi preventivo, `471` Prodotti, `472` MEPA, `491` Cataloghi PDF — **6/6 HTTP 404** pubblico); **Privacy policy (`3`)** e **Cookie policy (`493`)** ricostruite in design rev2 (`_artes_rev2 = 1`, HTTP 200) con i dati reali di Artes srl (`Via A. Nervoso 1`, `02343330789`, `info@artessrl.it`, 0 segnaposto `[...]`) e aggiunte alle condizioni di Header `557` e Footer `971` (15 contesti ciascuno); Footer `971` aggiornato con link cliccabili `Privacy · Cookie · MEPA` (`/privacy-policy/`, `/cookie-policy/`, `/arredamento-ufficio/`); revisioni salvate in `tools/out/rev2/fase6-revisions.json`. Verifica: salute `4/4` OK (`1440, 390`), `controllo-link.js` 0 rotti, `collaudo-redirect.js` `17/17`, `verifica-dati.js` `1.099/1.099`. Corretta la regressione CSS su `.footer__bottom a` (`color: inherit; display: inline; min-height: 0;`, che aveva scurito i link e allungato il footer di `+10 px`) in `adattamenti.css` / `artes-rev2.css` e aggiunti i redirect 301 `/realizzazioni/page/N/` → `/realizzazioni/` e `/brand-partner/page/N/` → `/brand-partner/` (plugin `0.7.1` → `0.8.0`) |
| 7. SEO on-page | **fatta** (2026-11-20) | `<title>` e `<meta name="description">` gestiti dal plugin `artes-core` **`0.8.0`** (nessun plugin SEO esterno): `pre_get_document_title` con `esc_html` + `wp_head` priorità 2 con `esc_attr` e soppressione duplicati Hello Elementor; 11 pagine statiche/legali (`376, 144–151, 3, 493`) via meta `_artes_seo_title`/`_artes_seo_description` (registrati anche WPML modo 2), 2 archivi CPT via opzione `artes_seo_archives`, 20 realizzazioni e 18 brand via formule dinamiche (0 eccezioni, con override meta supportato); backup reversibile in `tools/out/rev2/fase7-backup.json` (`fase7-seo.js --rollback`). Verifica live (`verifica-seo.js`, report `tools/out/rev2/fase7-seo-report.json`): **51/51 OK** (HTTP 200, `<title>` e `description` identici 100% senza duplicati né entità residue, singolo `<h1>`, `alt` immagini 100% conformi alla rev2) |
| 8. Collaudo di parità (IT) | **fatta** (2026-11-20) | Collaudo completo IT post-deploy `artes-core 0.8.0` (`tools/rev2/fase8-collaudo.js`, report `tools/out/rev2/fase8/report-fase8.json` e `riepilogo.md`, **0 difetti residui**): parità **49/49 pagine × 4 breakpoint** (`1440, 1024, 768, 390` = **196/196** viewport) con **0/196 scostamenti di altezza (`Δ 0 px`)**, contenuti **49/49 identici**, scroll `0 px` su `195/196` (unico noto `contract @768`: `20 px` identici alla rev2, §3.5), `194/196` `< 2,7%` pixel diff (max `3,619%` su `archivio-realizzazioni @768` per puro ricampionamento JPEG); geometria `18` controlli (9 tipologie × 2, `14/18` a 0 diff; `4/18` CPT singoli con 1 sola diff `y(rel)` wrapper Elementor); salute **51/51 × 2 = 102/102 OK**; Footer `971` `.footer__bottom a` + legali `4/4` OK; interazioni live tutte OK (Header `4/4` + `7/7` voci attive, Home `5/5`, FAQ `4/4` + `5/5` JSON-LD, archivi `6/6` + `4/4`, lightbox `6/6`); link **51/51** (`70` distinti, `1.129` letti, **0 rotti**, 0 verso bozze), redirect `17/17` + `2/2` 301 `/page/2/`, bozze `6/6` 404. *Nota: traduzione EN/WPML e selettore IT / EN lasciati esplicitamente per ultimi, fuori da questa fase* |
| 9. Chiusura | **fatta** (2026-11-23) | Plugin `artes-core` **`0.9.0`** (`artes_rev2_globale = '1'`, supporto 404/ricerca rev2, codice legacy morto rimosso, preservati `[artes_lingue]` e `[Riserva]`); `tools/rev2/fase9-chiusura.js` eseguito con backup integrale in `tools/out/rev2/fase9-backup.json` (`610.649 byte`): Kit `7` allineato (`sand #393E42`, `night #2F3438`), Header `557` e Footer `971` su `include/general` (condizioni dei 6 vecchi template svuotate), **7 elementi nel cestino reversibile** (`542, 199, 200, 138, 448, 213, 447`), **2 menu filtri eliminati** (`filtri-realizzazioni`, `filtri-brand`), **144 classi orfane rimosse** (**336** residue; `[Riserva]` `539–541` e 6 bozze `152–154, 471, 472, 491` intatti). Audit media (`tools/out/rev2/fase9-allegati-orfani.json`): **256 allegati intatti** (0 toccati), di cui **31 orfani recuperabili** (`10,654 MB` file principali / `19,464 MB` su disco, NON cancellati in attesa di conferma; le 8 foto dei 4 fittizi e 3/4 della vecchia galleria Pedrali sono riusate in rev2). Verifica live post-Fase 9 (**0 fallimenti**): parità campione `16/16` (`Δ 0 px`, `scrollX = 0 px`), 404 + ricerca `4/4` OK con Header/Footer rev2, SEO `51/51`, salute `102/102`, link `51/51`, redirect `17/17` + `2/2` 301 `/page/2/`, bozze `6/6` 404, dati `1.099/1.099`. Documentazione allineata (`CLAUDE.md`, `wp-stato-dev3.md`, `diario-sessioni.md`, `tools/README.md`). **Restano:** controllo manuale utente, conferma per i 31 allegati orfani / commit-push, e come ultimo passo traduzione EN/WPML + selettore `IT / EN` |
| Post-fase 9 — Bozze rev2 e pubblicazione Contatti | **fatta** (2026-11-23) | Tutte e 6 le bozze ricostruite in grafica **rev2** (`tools/rev2/pagine-bozze-rev2.js`, +`22` classi stub `rev2-*` → `358` totali, CSS form scoped in `adattamenti.css`/`artes-rev2.css`, backup `bozze-rev2-revisions.json`): **pubblicata solo Contatti (`152`, `/contatti/`)** con modulo nativo `e-form` verso `info@artessrl.it` e SEO `_artes_seo_*` (**52 pagine pubblicate**), mentre `153, 154, 471, 472, 491` restano in **`draft`** (HTTP 404 pubblico). Tutti i pulsanti CTA e le voci di menu Contatti della rev2 collegati a `/contatti/` (`tools/rev2/aggiorna-link-contatti.js`, `mappa-link.json`, `html2elementor.js`, `artes-rev2.js` con voce attiva `/contatti/` desktop+mobile, backup `link-contatti-revisions.json`): **15/15 documenti** rigenerati (**38** link sorgente / **314** occorrenze live, **`0` `#contatti` residui**, `tel:` e `Privacy · Cookie · MEPA` preservati). Verifica live 100% OK: screenshot `/contatti/` @1440/@390, form + preselezione `?motivo=pa`, `collaudo-header.js` `8/8`, parità campione `14/14` (`Δ 0 px`), link `52/52` (`0` rotti), SEO `52/52`, salute `20/20`, redirect `17/17`, dati `1.099/1.099` |

**Cosa resta fuori dalla fase 2 (spostato con le pagine che lo usano):** lightbox, filtri di progetti e brand, slider
della produzione, pallini del metodo e filtro a due livelli dell'archivio — richiedono markup e dati che nascono
con le fasi 3-5 e si collaudano lì. Convertitore: restano da gestire `ul`/`ol` (8 casi), `details`/FAQ (5 pagine
settore) e il carosello `ol.steps` della home: avvisi espliciti nel convertitore, nessuna perdita silenziosa.
**Variabili del kit (antracite…):** si aggiornano al passaggio finale (fase 9): il CSS portato porta con sé la
propria tavolozza (`body.rev2 { --… }`) e le pagine vecchie continuano a usare quella attuale.

**Stima rivista (dopo la fase 3):** markup e dati sono risolti e misurati; restano le fasi 4-9 (template e archivi, pagine, SEO, collaudo,
chiusura), circa 6-9 sessioni.

**Fuori dalla fase 3, stato alla chiusura (2026-11-23):** (a) ~~campi del vecchio modello e relative definizioni JetEngine: fine fase 4~~ **fatto** (2026-11-20); (b) **allegati orfani censiti in fase 9** (`tools/out/rev2/fase9-allegati-orfani.json`): **31 orfani recuperabili** (`10,654 MB` file principali / `19,464 MB` su disco; **NON cancellati**, in attesa di conferma esplicita). *Attenzione:* l'audit ha verificato che tutte le 8 foto dei 4 progetti fittizi cestinati (`50–54, 66, 97, 109`) e 3 su 4 della vecchia galleria Pedrali (`100, 466, 57`) sono **attivamente riusate in rev2** (da NON cancellare; solo `274` è orfano);
(c) ~~menu dei filtri (`Filtri realizzazioni`, `Filtri brand`)~~ **eliminati in fase 9** (2026-11-23, backup in `fase9-backup.json`);
(d) ~~pagine che la rev2 non ha~~ **in bozza dalla fase 6** (2026-11-20);
(e) ~~dalla fase 4: difetto della rev2 sul filtro dei brand (§3.5), strumento di misura~~ **risolti in fase 5**; nessuna icona del sito (`favicon`, come nella rev2).
