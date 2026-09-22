# Diario delle sessioni

Registro delle sessioni di lavoro con Claude Code: cosa è stato chiesto,
cosa è stato fatto, quali decisioni sono state prese e cosa resta aperto.
Voce più recente in alto. A fine sessione si aggiunge una voce nuova e si
aggiorna `CLAUDE.md` se è cambiato qualcosa di strutturale.

Il contesto stabile del progetto (architettura, regole, settori) sta in
[`CLAUDE.md`](../CLAUDE.md): qui solo la cronaca.

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

- **Sorgente di GitHub Pages da riportare su `main`** (Settings → Pages →
  Branch: `main` / root). Finché resta su `test-sfondi-alternati` il sito
  online non si aggiorna. Solo dalle impostazioni del repo: `gh` non è
  installato su questa macchina.
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
