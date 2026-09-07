# Versione mobile e tablet — design

Data: 2026-09-07
Stato: approvato, in attesa di piano di implementazione

## Contesto

Il sito ARTES Contract è un mockup statico HTML/CSS/JS (nessuna build,
header/footer duplicati per pagina) pubblicato su GitHub Pages. È stato
costruito **desktop-only fin dall'inizio**: `body { min-width: 1320px; }`,
zero media query di layout in `assets/css/artes.css` (solo una per
`prefers-reduced-motion`), ogni font-size e ogni spaziatura è un valore px
fisso (nessun `rem`). Questo spec introduce due breakpoint — tablet e
mobile — sopra al layout desktop esistente, senza toccarlo.

Il desktop resta l'unica versione curata pixel per pixel; tablet e mobile
sono un adattamento sistematico delle stesse regole (collasso griglie,
riduzione tipografica, stack dei layout affiancati), non un redesign.

## Breakpoint

```css
@media (max-width: 1024px) { /* tablet */ }
@media (max-width: 640px)  { /* mobile */ }
```

Il mobile eredita le regole tablet e le sovrascrive dove serve (mobile-last,
non mobile-first: il file resta organizzato desktop → tablet → mobile,
coerente con com'è scritto oggi).

## Meccanismo di base

- `body { min-width: 1320px; }` va neutralizzato sotto i 1024px:
  `@media (max-width: 1024px) { body { min-width: 0; } }`
- `--pad` (40px) e `--gutter` (20px) sono custom property lette da decine
  di regole in tutto il file. Ridefinirle dentro i media query stringe i
  margini di tutto il sito senza toccare le singole regole:
  - Tablet (≤1024px): `--pad: 28px; --gutter: 16px;`
  - Mobile (≤640px): `--pad: 18px; --gutter: 10px;`

## Header e navigazione mobile

Cambiamento più corposo: la nav desktop (9 voci, 5 tendine ad hover) non
regge sotto i 1024px né come spazio orizzontale né come interazione
(hover non esiste al tocco).

**Markup nuovo, da aggiungere nell'header di tutte le 13 pagine** (stesso
blocco ripetuto, come già fatto per il restyling del menu):
- Un bottone hamburger (`<button class="nav-toggle" aria-label="Apri il
  menu" aria-expanded="false" aria-controls="mobile-nav">`), visibile solo
  ≤1024px, posizionato nel masthead al posto della nav orizzontale.
- Un pannello `<div class="mobile-nav" id="mobile-nav" hidden>` — overlay
  `position: fixed` a schermo intero, sopra tutto (z-index superiore
  all'header) — contenente:
  - Le 9 voci di nav in colonna. Le 5 voci settore sono trigger accordion:
    tap apre/chiude la lista micro-categorie sotto (stesso contenuto già
    presente nei `.drop__list` esistenti — non va duplicato, va riusato
    spostando/riferendo lo stesso markup nel contesto del pannello mobile
    invece che nel dropdown hover).
  - "Contatti" e "Area Progettisti" (oggi in topbar/masthead__actions),
    che sul desktop restano dove sono ma su mobile escono da lì (nascosti)
    e vanno riproposti dentro il pannello.
  - Un bottone di chiusura (la stessa icona hamburger diventa una "X"
    quando il pannello è aperto, pattern standard).

**CSS:**
- `.topbar` e `.nav` (la versione orizzontale): `display: none` ≤1024px.
- `.masthead__actions`: ≤1024px nasconde "Area Progettisti" (duplicato nel
  pannello mobile), mantiene "Contattaci" come bottone compatto in header.
- `.nav-toggle`: `display: none` di default, `display: block` (o `flex`)
  solo ≤1024px.
- `.mobile-nav[hidden]` → nascosto; da aperto: `position: fixed; inset: 0;
  z-index` sopra l'header; scroll interno (`overflow-y: auto`) se il
  contenuto eccede l'altezza viewport; sfondo `--bone`, coerente con il
  tema chiaro dell'header (niente inversione a scuro: il pannello è
  un'estensione dell'header, non una schermata diversa).

**JS nuovo** (in `assets/js/artes.js`, accanto a `initDrops`/`initFiltri`):
- `initMobileNav()`: apre/chiude il pannello al click sull'hamburger,
  aggiorna `aria-expanded` e l'icona hamburger↔X, chiude su Escape,
  blocca lo scroll del `body` mentre il pannello è aperto
  (`document.body.style.overflow`).
- Gestione accordion per le 5 voci settore dentro il pannello: click
  espande/collassa la lista micro-categorie, un accordion aperto alla
  volta (stesso comportamento "chiudi gli altri" già usato in
  `initDrops`, riadattato al contesto click-based invece che hover-based).
- `initDrops()` esistente resta invariato per il comportamento desktop
  (hover) — sopra i 1024px il pannello mobile è comunque nascosto via
  CSS, quindi non c'è conflitto tra i due meccanismi.

## Collasso dei componenti, per sezione del CSS desktop

Regola generale: griglie N-colonne → 1 colonna ≤640px (spesso 2 colonne
nella fascia tablet dove c'è spazio), blocchi testo/immagine affiancati →
impilati, titoli grandi ridotti per breakpoint. Valori concreti:

### Tipografia (i titoli display, non il corpo testo — quello a 14-17px
resta invariato, è già leggibile su mobile)

| Elemento | Desktop | Tablet (≤1024px) | Mobile (≤640px) |
|---|---|---|---|
| `.hero__title` | 114.5px | 72px | 44px |
| `.hero__lead` | 20px | 18px | 16px |
| `.h-section` | 48.5px | 36px | 28px |
| `.page-title` / `.scheda__title` | 79px | 52px | 34px |
| `.tile h3` | 33px | 26px | 22px |
| `.cta-panel h2` | 44px | 34px | 26px |
| `.cta-band h2` | 42px | 32px | 24px |
| `.settore__t` | 44px | 34px | 26px |
| `.correlate h2` | 37.5px | 30px | 24px |
| `.sistema__title` | 61.5px | 44px | 30px |
| `.type-spec__name` | 70.5px | 50px | 34px |

### Sezione 4 — Header
Vedi "Header e navigazione mobile" sopra.

### Sezione 6 — Home
- `.hero`: altezza 760px → 560px (tablet) → 460px (mobile).
- `.hero__stats`: `repeat(4,1fr)` → `repeat(2,1fr)` ≤640px.
- `.metodo__grid`: `340px 1fr` → `1fr` (stack) ≤1024px.
- `.fasi`: `repeat(4,1fr)` → `repeat(2,1fr)` ≤1024px → `repeat(1,1fr)` ≤640px.
- `.tiles`: da `1.4fr 1fr 1fr` / due righe da 300px con `.tile--tall` che
  occupa 2 righe, a colonna singola ≤1024px — `grid-template-columns:
  1fr; grid-template-rows: auto`, `.tile--tall` perde lo span (`grid-row:
  auto`), ogni tile min-height ~240px.
- `.produzione`: `1fr 1fr` → `1fr` (stack) ≤1024px; `.produzione__media`
  min-height 660px → 320px (mobile).
- `.lavorazioni`: resta 2 colonne fino a 640px, poi `1fr`.
- `.progetti`: `repeat(6,1fr)` → `repeat(2,1fr)` ≤1024px → `repeat(1,1fr)`
  ≤640px. Le classi `.progetto--w2/--w4/--w6` (span asimmetrici) vengono
  **resettate a `grid-column: span 1`** già alla soglia tablet: niente
  layout asimmetrico sotto i 1024px, ogni card occupa una cella piena —
  più semplice e prevedibile che provare a mantenere le proporzioni
  originali su una griglia più stretta.
- `.filtri`: `flex-wrap: wrap` ≤1024px (i bottoni vanno a capo invece di
  restare su una riga o scrollare).
- `.brands-section__head`: `flex-direction: column` ≤640px.
- `.brands`: `repeat(6,1fr)` → `repeat(3,1fr)` ≤1024px → `repeat(2,1fr)`
  ≤640px.
- `.cta-duo`: `1fr 1fr` → `1fr` (stack) ≤1024px; `.cta-panel` padding
  ridotto, min-height ridotto.

### Sezione 7 — Scheda realizzazione
- `.scheda__title-row`: `1fr 340px` → `1fr` (stack) ≤1024px.
- `.gallery`: `repeat(4,1fr)` → `repeat(2,1fr)` ≤1024px.
- `.scheda__specs`: `1fr 1fr` → `1fr` (stack) ≤1024px; `.specs` perde il
  `border-right` quando impilato, `.finiture` perde il padding-left extra.
- `.materiali`: `repeat(4,1fr)` → `repeat(2,1fr)` ≤640px.
- `.brands-mini`: `repeat(3,1fr)` → `repeat(2,1fr)` ≤640px.
- `.correlate__grid`: `repeat(3,1fr)` → `repeat(2,1fr)` ≤1024px →
  `repeat(1,1fr)` ≤640px.
- `.cta-band`: `flex-direction: column`, `align-items: flex-start`
  ≤640px.

### Sezione 8 — Sistema visivo (documento interno, priorità più bassa,
ma va comunque collassato perché condivide le classi con il resto del
sito — non deve rompersi)
- `.palette`: `repeat(6,1fr)` → `repeat(3,1fr)` ≤1024px → `repeat(2,1fr)`
  ≤640px.
- `.type-grid`: `1fr 1fr` → `1fr` ≤640px.
- `.regole`: resta 3 colonne fino a 1024px (ci sta), poi `1fr` ≤640px.
- `.scala__row` (`120px 1fr`): invariato, la prima colonna stretta non
  crea problemi neanche a 375px.

### Sezione 9 — Footer
- `.footer__grid`: `1.6fr 1fr 1fr 1fr 1.2fr` → `repeat(2,1fr)` ≤1024px →
  `1fr` (stack) ≤640px.
- `.footer__bottom`: `flex-direction: column`, gap ≤640px.

### Sezione 11 — Pagine interne
- `.page-intro__row`: `1fr 340px` → `1fr` (stack) ≤1024px.
- `.page-band`: altezza 420px → 260px (tablet) → 200px (mobile).
- `.grid-1px--3`, `.grid-1px--4`: → `repeat(2,1fr)` ≤1024px →
  `repeat(1,1fr)` ≤640px. `.grid-1px--2`: resta 2 colonne fino a 640px,
  poi `1fr`.
- `.materiali--wide` (8 colonne): → `repeat(4,1fr)` ≤1024px →
  `repeat(2,1fr)` ≤640px.
- `.fase-row` (griglia `72px 230px 1fr 230px` — numero/titolo/testo/output
  delle 7 fasi contract in versione estesa): non è un collasso N-col
  uniforme, va ristrutturata esplicitamente ≤1024px in blocco verticale
  (numero e titolo sulla stessa riga, descrizione sotto, output in fondo,
  `.fase-row__out` allineato a sinistra invece che a destra).

### Sezione 12 — Indice settori
- `.grid-1px--5`: → `repeat(2,1fr)` ≤1024px → `repeat(1,1fr)` ≤640px.
- `.settore`: `1fr 1fr` → `1fr` (stack) ≤1024px. L'immagine va **sempre
  sopra il testo**, anche nelle righe `.settore--flip` — su una colonna
  sola l'alternanza sinistra/destra non ha più senso, quindi l'ordine
  flip viene resettato (`.settore__media { order: -1 }` per entrambe le
  varianti sotto i 1024px).
- `.settore__media`: min-height 640px → 320px (tablet) → 260px (mobile).
- `.ambiti`: resta 2 colonne fino a 640px, poi `1fr`.
- `.settore__inset` (riquadro decorativo che si sovrappone in alto a
  destra alla foto principale): **nascosto ≤1024px** — a quella
  dimensione sovrapporsi alla foto crea solo confusione, non aggiunge
  nulla al design.

## File coinvolti

- `assets/css/artes.css` — nuova sezione 13 "Responsive", due blocchi
  `@media`, organizzata rispecchiando l'ordine delle sezioni 1-12 per
  restare navigabile.
- `assets/js/artes.js` — nuova funzione `initMobileNav()`, chiamata da
  `init()` insieme a `initDrops()`/`initFiltri()`.
- Tutte le 13 pagine `.html` — header aggiornato con bottone hamburger +
  pannello `.mobile-nav` (stesso blocco ripetuto, nessun build system).

## Verifica

Nessun test automatico possibile (mockup statico). Verifica tramite resize
del browser alle larghezze chiave — 1024px, 768px, 640px, 375px — su tutte
le 13 pagine: nessun overflow orizzontale, nav hamburger funzionante
(apertura, accordion, chiusura via X ed Escape), nessuna griglia rotta,
nessun testo tagliato o sovrapposto.

## Fuori scope

- Nessun redesign dei contenuti o della gerarchia visiva: stessa
  struttura del desktop, solo impilata/ridotta.
- Nessuna versione "print" o altri media type.
- Non si tocca il layout desktop esistente (≥1025px) in alcun modo.
