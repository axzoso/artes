# Diario delle sessioni

Registro delle sessioni di lavoro con Claude Code: cosa è stato chiesto,
cosa è stato fatto, quali decisioni sono state prese e cosa resta aperto.
Voce più recente in alto. A fine sessione si aggiunge una voce nuova e si
aggiorna `CLAUDE.md` se è cambiato qualcosa di strutturale.

Il contesto stabile del progetto (architettura, regole, settori) sta in
[`CLAUDE.md`](../CLAUDE.md): qui solo la cronaca.

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
