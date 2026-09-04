# Ristrutturazione menu e settori — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sostituire la nav a 8 voci attuale con le 8 nuove voci del cliente, esplodere i 5 "settori" da sezioni ancorate a pagine standalone con griglia progetti filtrabile, rinominare `produzione.html` in `arredamento-su-misura.html`, e introdurre il collegamento bidirezionale brand↔progetto (`brand-partner.html` + `brand-pedrali.html`).

**Architecture:** Sito statico piatto, nessuna build (per scelta esplicita del cliente): ogni pagina contiene il proprio header/footer duplicato. Le modifiche a header/footer vanno applicate a mano/script su ogni file esistente toccato; le pagine nuove nascono già con la versione aggiornata. Riuso massimo dei componenti CSS/JS esistenti (`.filtri`/`.progetti`/`.progetto`, `.settore`, `.page-intro`, `.brands`, `.correlate`).

**Tech Stack:** HTML/CSS/JS puro, nessuna dipendenza. Verifica tramite `python3 -m http.server` + `curl` + `grep` (non esiste una test suite: è un mockup statico).

**Spec:** `docs/superpowers/specs/2026-09-04-menu-restructure-design.md`

## Global Constraints

- Nessun build system: ogni file `.html` è indipendente, header/footer duplicati (scelta esplicita del cliente, vedi spec).
- Larghezza desktop-only (`min-width: 1320px`), nessuna media query responsive da inventare.
- Nessun `box-shadow`, nessun angolo arrotondato: solo filetti 1px, fondi alterni, spazio bianco (`sistema-visivo.html`).
- Rosso `--accent` massimo tre occorrenze per schermata.
- Le pagine non ancora costruite restano `href="#"`, mai un link a file inesistente (convenzione `PAGES.md`).
- Mappatura confermata dal cliente: **Arredamento bar e ristoranti** eredita le micro-categorie dell'attuale "Food Retail" (panetterie, pasticcerie, gastronomie, macellerie, caseifici, market gourmet, chocolate shop, healthy food store). **Arredamento alimentari, wine e food** eredita le micro-categorie dell'attuale "Food & Beverage" (bar, bistrot/ristoranti, pizzerie/pub, lounge/cocktail bar, wine bar, gelaterie, street food, rooftop bar).
- Classi esistenti da riusare prima di scriverne di nuove: `.eyebrow`, `.h-section`, `.page-title`, `.lead`, `.link-rule`, `.btn`, `.section__head`, `.ph__note`, `.settore`/`.settore__text`/`.settore__media`, `.filtri`/`.progetti`/`.progetto`, `.brands`/`.brand`, `.correlate`, `.specs`.

---

## Task 1: Generalizzare `artes.js` (dropdown multipli + filtro generico)

**Files:**
- Modify: `assets/js/artes.js` (intero file)

**Interfaces:**
- Consumes: markup con `[data-drop-trigger]` + `aria-controls` (Task 3), `[data-filtri]`/`.filtro[data-filtro]`/`[data-progetti]`/elementi con `data-settore` (Task 3, 5-13).
- Produces: `initDrops()` (sostituisce `initMega()`), `initFiltri()` generalizzato a qualunque figlio con `data-settore` dentro `[data-progetti]` (non più legato alla classe `.progetto`).

- [ ] **Step 1: Riscrivere `assets/js/artes.js`**

```js
/* ARTES Contract — interazioni del template.
   Due comportamenti soltanto: le tendine di settore in header e i filtri
   dei progetti/brand. Tutto il resto è markup statico: la pagina resta
   leggibile senza JS. */

(function () {
  'use strict';

  /* --- Tendine di settore ------------------------------------------------ */
  /* Ogni voce di nav con [data-drop-trigger] apre il proprio pannello
     (aria-controls). Aprirne una chiude le altre. Stesso comportamento di
     prima: hover con piccolo ritardo di chiusura, focus apre, Escape chiude,
     un click fuori chiude. */

  function initDrops() {
    var triggers = document.querySelectorAll('[data-drop-trigger]');
    if (!triggers.length) return;

    var pairs = [];
    triggers.forEach(function (trigger) {
      var panel = document.getElementById(trigger.getAttribute('aria-controls'));
      if (panel) pairs.push({ trigger: trigger, panel: panel });
    });
    if (!pairs.length) return;

    var closeTimer = null;

    function closeAll(exceptPanel) {
      pairs.forEach(function (pair) {
        if (pair.panel === exceptPanel) return;
        pair.panel.hidden = true;
        pair.trigger.setAttribute('aria-expanded', 'false');
      });
    }

    function open(pair) {
      clearTimeout(closeTimer);
      closeAll(pair.panel);
      pair.panel.hidden = false;
      pair.trigger.setAttribute('aria-expanded', 'true');
    }

    function scheduleCloseAll() {
      clearTimeout(closeTimer);
      closeTimer = setTimeout(function () { closeAll(null); }, 120);
    }

    pairs.forEach(function (pair) {
      [pair.trigger, pair.panel].forEach(function (el) {
        el.addEventListener('mouseenter', function () { open(pair); });
        el.addEventListener('mouseleave', scheduleCloseAll);
      });
      // Il trigger è un link alla pagina di settore: il click naviga, non intercettiamo.
      pair.trigger.addEventListener('focus', function () { open(pair); });
    });

    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      var openPair = pairs.filter(function (p) { return !p.panel.hidden; })[0];
      if (!openPair) return;
      closeAll(null);
      openPair.trigger.focus();
    });

    document.addEventListener('focusin', function (e) {
      pairs.forEach(function (pair) {
        if (pair.panel.hidden) return;
        if (!pair.panel.contains(e.target) && e.target !== pair.trigger) {
          pair.panel.hidden = true;
          pair.trigger.setAttribute('aria-expanded', 'false');
        }
      });
    });
  }

  /* --- Filtri (progetti o brand) ----------------------------------------- */
  /* Generico: filtra qualunque figlio diretto con [data-settore] dentro
     [data-progetti], in base al bottone .filtro[data-filtro] attivo dentro
     [data-filtri]. Usato sia per le griglie progetti sia per la griglia
     brand partner. */

  function initFiltri() {
    var bar = document.querySelector('[data-filtri]');
    var grid = document.querySelector('[data-progetti]');
    if (!bar || !grid) return;

    var buttons = bar.querySelectorAll('.filtro');
    var items = grid.querySelectorAll('[data-settore]');
    var empty = grid.querySelector('[data-empty]');

    function apply(valore) {
      var visibili = 0;

      items.forEach(function (item) {
        var match = valore === 'Tutti' || item.dataset.settore === valore;
        item.hidden = !match;
        if (match) visibili++;
      });

      buttons.forEach(function (b) {
        var active = b.dataset.filtro === valore;
        b.classList.toggle('is-active', active);
        b.setAttribute('aria-pressed', String(active));
      });

      if (empty) empty.hidden = visibili > 0;
    }

    bar.addEventListener('click', function (e) {
      var btn = e.target.closest('.filtro');
      if (btn) apply(btn.dataset.filtro);
    });

    apply('Tutti');
  }

  function init() {
    initDrops();
    initFiltri();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
```

- [ ] **Step 2: Verifica statica**

Run: `node --check assets/js/artes.js`
Expected: nessun output (sintassi valida). Se `node` non è disponibile, verificare con `python3 -c "import re; s=open('assets/js/artes.js').read(); assert s.count('{')==s.count('}')"`.

- [ ] **Step 3: Commit**

```bash
git add assets/js/artes.js
git commit -m "$(cat <<'EOF'
Generalizza il JS per tendine multiple e filtri generici

initMega() diventa initDrops() e gestisce N coppie trigger/pannello
invece di una sola; initFiltri() ora filtra qualunque figlio con
data-settore dentro [data-progetti], non solo .progetto, così lo stesso
meccanismo serve sia le griglie progetti sia la griglia brand partner.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Venfae1nDKBSDNYX5U6any
EOF
)"
```

---

## Task 2: CSS delle tendine singole, ritiro del mega menu, spaziatura nav

**Files:**
- Modify: `assets/css/artes.css`

**Interfaces:**
- Consumes: nessuna (solo CSS).
- Produces: classi `.drop`, `.drop__inner`, `.drop__ph`, `.drop__list` usate da Task 3 e da tutte le pagine nuove.

- [ ] **Step 1: Sostituire il blocco mega menu con le classi `.drop`**

Nel file `assets/css/artes.css`, cercare il commento `/* Mega menu — Settori */` e l'intero blocco `.mega`/`.mega__*` che lo segue (fino alla riga `.mega__foot a { color: var(--accent); }`), e sostituirlo con:

```css
/* Tendine di settore — un pannello per voce di nav */
.drop {
  border-top: 1px solid var(--line);
  background: #fff;
  padding: 30px var(--pad) 34px;
}
.drop[hidden] { display: none; }
.drop__inner { max-width: 300px; }
.drop__ph { height: 76px; margin-bottom: 16px; background: var(--hatch-b-wide); }
.drop__list { display: flex; flex-direction: column; gap: 6px; }
.drop__list a { font-size: 12.5px; color: var(--muted-2); line-height: 1.35; }
```

- [ ] **Step 2: Restringere leggermente la nav per ospitare 9 voci**

Nello stesso file, nel blocco `.nav { ... }`, cambiare `gap: 18px;` in `gap: 13px;` e `font-size: 13px;` in `font-size: 12.5px;`. Lasciare invariato il resto del blocco (`flex-wrap: nowrap`, `white-space: nowrap`).

- [ ] **Step 3: Verifica**

```bash
grep -c "\.mega" assets/css/artes.css
```
Expected: `0` (nessun residuo del mega menu).

```bash
grep -c "\.drop " assets/css/artes.css
```
Expected: `>= 1`.

- [ ] **Step 4: Commit**

```bash
git add assets/css/artes.css
git commit -m "$(cat <<'EOF'
Sostituisce il mega menu a 5 colonne con tendine singole per voce

Le 5 tendine di settore diventano pannelli indipendenti a colonna
singola (.drop), coerenti con il nuovo header a 9 voci. Restringe
leggermente gap e font-size della nav per ospitare le etichette più
lunghe senza andare a capo.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Venfae1nDKBSDNYX5U6any
EOF
)"
```

---

## Task 3: Nuovo header su tutte le pagine esistenti

**Files:**
- Modify: `index.html`, `contract.html`, `realizzazione.html`, `sistema-visivo.html` (blocco `<header class="header">...</header>`, righe 15-125 in ciascun file)

**Interfaces:**
- Consumes: `.drop`/`.drop__inner`/`.drop__ph`/`.drop__list` (Task 2), `initDrops()` (Task 1).
- Produces: markup header condiviso, riusato identico nelle pagine nuove dei Task 5-13.

- [ ] **Step 1: Scrivere lo script di sostituzione**

Creare `/tmp/replace_header.py` (o nella scratchpad directory) con questo contenuto — cerca il blocco header esatto attuale (identico in tutti i file) e lo sostituisce con quello nuovo:

```python
import pathlib

OLD = '''<header class="header">
  <div class="topbar">
    <span>Arredi contract su misura — Calabria / Italia</span>
    <div class="topbar__right">
      <span>MEPA · Acquisti in Rete PA</span>
      <a href="#">Chi siamo</a>
      <a href="#">Contatti</a>
      <span>T +39 0000 000 000</span>
      <span class="topbar__lang">IT / EN</span>
    </div>
  </div>

  <div class="masthead">
    <a class="masthead__logo" href="index.html"><img src="assets/artes-logo-black.png" alt="ARTES Arredamenti"></a>
    <nav class="nav" aria-label="Navigazione principale">
      <a href="index.html">Home</a>
      <a href="contract.html">Contract</a>
      <a href="produzione.html">Produzione</a>
      <a href="settori.html" class="nav__trigger" data-mega-trigger aria-expanded="false" aria-controls="mega">
        <span>Settori</span><span class="nav__count">05</span>
      </a>
      <a href="#">Brand Partner</a>
      <a href="#">Prodotti</a>
      <a href="#">Realizzazioni</a>
      <a href="#">Architetti</a>
    </nav>
    <div class="masthead__actions">
      <a href="#" class="btn-sm btn-sm--outline">Area Progettisti</a>
      <a href="#" class="btn-sm btn-sm--red">Contattaci</a>
    </div>
  </div>

  <div class="mega" id="mega" hidden>
    <div class="mega__grid">
      <div class="mega__col">
        <div class="mega__head"><span class="mega__num">01</span><a class="mega__title" href="#">Workspace</a></div>
        <div class="mega__ph"></div>
        <div class="mega__list">
          <a href="#">Uffici direzionali</a>
          <a href="#">Open space</a>
          <a href="#">Coworking</a>
          <a href="#">Sale meeting e conferenze</a>
          <a href="#">Academy e aule formazione</a>
          <a href="#">Scuole, università, biblioteche</a>
          <a href="#">Reception corporate</a>
          <a href="#">Business lounge e aree break</a>
        </div>
      </div>
      <div class="mega__col">
        <div class="mega__head"><span class="mega__num">02</span><a class="mega__title" href="#">Retail</a></div>
        <div class="mega__ph"></div>
        <div class="mega__list">
          <a href="#">Boutique e negozi moda</a>
          <a href="#">Showroom e concept store</a>
          <a href="#">Profumerie e retail beauty</a>
          <a href="#">Gioiellerie e ottiche</a>
          <a href="#">Farmacie e parafarmacie</a>
          <a href="#">Telefonia ed elettronica</a>
          <a href="#">Store sportivi</a>
          <a href="#">Temporary shop e franchising</a>
        </div>
      </div>
      <div class="mega__col">
        <div class="mega__head"><span class="mega__num">03</span><a class="mega__title" href="#">Food &amp; Beverage</a></div>
        <div class="mega__ph"></div>
        <div class="mega__list">
          <a href="#">Bar e caffetterie</a>
          <a href="#">Bistrot e ristoranti</a>
          <a href="#">Pizzerie e pub</a>
          <a href="#">Lounge e cocktail bar</a>
          <a href="#">Wine bar ed enoteche</a>
          <a href="#">Gelaterie</a>
          <a href="#">Fast casual e street food</a>
          <a href="#">Food court e rooftop bar</a>
        </div>
      </div>
      <div class="mega__col">
        <div class="mega__head"><span class="mega__num">04</span><a class="mega__title" href="#">Food Retail</a></div>
        <div class="mega__ph"></div>
        <div class="mega__list">
          <a href="#">Panetterie e bakery</a>
          <a href="#">Pasticcerie</a>
          <a href="#">Gastronomie e salumerie</a>
          <a href="#">Macellerie e pescherie</a>
          <a href="#">Caseifici</a>
          <a href="#">Market gourmet</a>
          <a href="#">Chocolate shop e take-away</a>
          <a href="#">Healthy food store</a>
        </div>
      </div>
      <div class="mega__col">
        <div class="mega__head"><span class="mega__num">05</span><a class="mega__title" href="#">Hospitality</a></div>
        <div class="mega__ph"></div>
        <div class="mega__list">
          <a href="#">Hotel e resort</a>
          <a href="#">Boutique hotel e b&amp;b premium</a>
          <a href="#">Spa e wellness center</a>
          <a href="#">Reception e lounge hotel</a>
          <a href="#">Aree breakfast</a>
          <a href="#">Rooftop hospitality</a>
          <a href="#">Residence e business hotel</a>
          <a href="#">Co-living e serviced apartment</a>
        </div>
      </div>
    </div>
    <div class="mega__foot">
      <span>Ogni settore raccoglie realizzazioni, brand partner e prodotti collegati</span>
      <a href="#">Tutte le realizzazioni →</a>
    </div>
  </div>
</header>'''

NEW = '''<header class="header">
  <div class="topbar">
    <span>Arredi contract su misura — Calabria / Italia</span>
    <div class="topbar__right">
      <span>MEPA · Acquisti in Rete PA</span>
      <a href="#">Contatti</a>
      <span>T +39 0000 000 000</span>
      <span class="topbar__lang">IT / EN</span>
    </div>
  </div>

  <div class="masthead">
    <a class="masthead__logo" href="index.html"><img src="assets/artes-logo-black.png" alt="ARTES Arredamenti"></a>
    <nav class="nav" aria-label="Navigazione principale">
      <a href="index.html">Home</a>
      <a href="arredamento-ufficio.html" class="nav__trigger" data-drop-trigger aria-expanded="false" aria-controls="drop-ufficio">Arredamento ufficio</a>
      <a href="arredo-negozi.html" class="nav__trigger" data-drop-trigger aria-expanded="false" aria-controls="drop-negozi">Arredo negozi</a>
      <a href="arredamento-bar-ristoranti.html" class="nav__trigger" data-drop-trigger aria-expanded="false" aria-controls="drop-bar-ristoranti">Arredamento bar e ristoranti</a>
      <a href="arredamento-alimentari-wine-food.html" class="nav__trigger" data-drop-trigger aria-expanded="false" aria-controls="drop-alimentari">Arredamento alimentari, wine e food</a>
      <a href="arredamento-hotel.html" class="nav__trigger" data-drop-trigger aria-expanded="false" aria-controls="drop-hotel">Arredamento hotel</a>
      <a href="arredamento-su-misura.html">Arredamento su misura</a>
      <a href="contract.html">Arredo Contract</a>
      <a href="chi-siamo.html">Chi siamo</a>
    </nav>
    <div class="masthead__actions">
      <a href="#" class="btn-sm btn-sm--outline">Area Progettisti</a>
      <a href="#" class="btn-sm btn-sm--red">Contattaci</a>
    </div>
  </div>

  <div class="drop" id="drop-ufficio" hidden>
    <div class="drop__inner">
      <div class="drop__ph"></div>
      <div class="drop__list">
        <a href="#">Uffici direzionali</a>
        <a href="#">Open space</a>
        <a href="#">Coworking</a>
        <a href="#">Sale meeting e conferenze</a>
        <a href="#">Academy e aule formazione</a>
        <a href="#">Scuole, università, biblioteche</a>
        <a href="#">Reception corporate</a>
        <a href="#">Business lounge e aree break</a>
      </div>
    </div>
  </div>
  <div class="drop" id="drop-negozi" hidden>
    <div class="drop__inner">
      <div class="drop__ph"></div>
      <div class="drop__list">
        <a href="#">Boutique e negozi moda</a>
        <a href="#">Showroom e concept store</a>
        <a href="#">Profumerie e retail beauty</a>
        <a href="#">Gioiellerie e ottiche</a>
        <a href="#">Farmacie e parafarmacie</a>
        <a href="#">Telefonia ed elettronica</a>
        <a href="#">Store sportivi</a>
        <a href="#">Temporary shop e franchising</a>
      </div>
    </div>
  </div>
  <div class="drop" id="drop-bar-ristoranti" hidden>
    <div class="drop__inner">
      <div class="drop__ph"></div>
      <div class="drop__list">
        <a href="#">Panetterie e bakery</a>
        <a href="#">Pasticcerie</a>
        <a href="#">Gastronomie e salumerie</a>
        <a href="#">Macellerie e pescherie</a>
        <a href="#">Caseifici</a>
        <a href="#">Market gourmet</a>
        <a href="#">Chocolate shop e take-away</a>
        <a href="#">Healthy food store</a>
      </div>
    </div>
  </div>
  <div class="drop" id="drop-alimentari" hidden>
    <div class="drop__inner">
      <div class="drop__ph"></div>
      <div class="drop__list">
        <a href="#">Bar e caffetterie</a>
        <a href="#">Bistrot e ristoranti</a>
        <a href="#">Pizzerie e pub</a>
        <a href="#">Lounge e cocktail bar</a>
        <a href="#">Wine bar ed enoteche</a>
        <a href="#">Gelaterie</a>
        <a href="#">Fast casual e street food</a>
        <a href="#">Food court e rooftop bar</a>
      </div>
    </div>
  </div>
  <div class="drop" id="drop-hotel" hidden>
    <div class="drop__inner">
      <div class="drop__ph"></div>
      <div class="drop__list">
        <a href="#">Hotel e resort</a>
        <a href="#">Boutique hotel e b&amp;b premium</a>
        <a href="#">Spa e wellness center</a>
        <a href="#">Reception e lounge hotel</a>
        <a href="#">Aree breakfast</a>
        <a href="#">Rooftop hospitality</a>
        <a href="#">Residence e business hotel</a>
        <a href="#">Co-living e serviced apartment</a>
      </div>
    </div>
  </div>
</header>'''

FILES = ['index.html', 'contract.html', 'realizzazione.html', 'sistema-visivo.html']

for name in FILES:
    p = pathlib.Path(name)
    text = p.read_text()
    if OLD not in text:
        raise SystemExit(f'{name}: blocco header atteso non trovato')
    p.write_text(text.replace(OLD, NEW, 1))
    print(f'{name}: header sostituito')
```

- [ ] **Step 2: Eseguire lo script dalla root del progetto**

Run: `python3 /tmp/replace_header.py`
Expected output: quattro righe `<file>: header sostituito`.

Nota: in ciascuno di questi 4 file il vecchio header conteneva già un attributo `is-active` su una delle voci (es. `href="index.html" class="is-active"` in `index.html`, `href="contract.html" class="is-active"` in `contract.html`). Se lo script fallisce con "blocco header atteso non trovato" su uno di questi file, individuare manualmente quella singola differenza, rimuovere temporaneamente `class="is-active"` dal blocco `OLD` per quel file, rieseguire solo per quel file, poi far ripristinare `is-active` sulla voce corrispondente nel nuovo header (`index.html` → `<a href="index.html" class="is-active">Home</a>`; `contract.html` → `<a href="contract.html" class="is-active">Arredo Contract</a>`; `realizzazione.html` e `sistema-visivo.html` non avevano `is-active` in nav, nessuna azione).

- [ ] **Step 3: Verifica**

```bash
grep -L "data-drop-trigger" index.html contract.html realizzazione.html sistema-visivo.html
```
Expected: nessun output (tutti e 4 i file contengono `data-drop-trigger`).

```bash
grep -rn "data-mega-trigger\|id=\"mega\"" index.html contract.html realizzazione.html sistema-visivo.html
```
Expected: nessun output.

```bash
python3 -m http.server 8799 & sleep 1
for f in index.html contract.html realizzazione.html sistema-visivo.html; do
  curl -s -o /dev/null -w "%{http_code} $f\n" "http://localhost:8799/$f"
done
kill %1
```
Expected: `200` per tutti e 4.

- [ ] **Step 4: Commit**

```bash
git add index.html contract.html realizzazione.html sistema-visivo.html
git commit -m "$(cat <<'EOF'
Applica il nuovo header a 8 voci alle pagine esistenti

Sostituisce il mega menu unico "Settori" con 5 tendine indipendenti
(una per voce), aggiunge le nuove voci Arredamento su misura/Arredo
Contract/Chi siamo, rimuove Produzione/Brand Partner/Prodotti/
Realizzazioni/Architetti dalla nav principale (restano in footer) e
toglie "Chi siamo" dalla topbar (ora duplicato in nav).

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Venfae1nDKBSDNYX5U6any
EOF
)"
```

---

## Task 4: Nuovo footer su tutte le pagine esistenti

**Files:**
- Modify: `index.html`, `contract.html`, `realizzazione.html`, `sistema-visivo.html` (blocco `<footer class="footer">...</footer>`)

**Interfaces:**
- Consumes: nessuna.
- Produces: markup footer condiviso, riusato identico nelle pagine nuove dei Task 5-13.

- [ ] **Step 1: Scrivere lo script di sostituzione**

Creare `/tmp/replace_footer.py`:

```python
import pathlib

OLD = '''<footer class="footer">
  <div class="footer__grid">
    <div>
      <img class="footer__logo" src="assets/artes-logo-black.png" alt="ARTES Arredamenti">
      <p class="footer__about">Artes: arredi contract. Progettazione, produzione e installazione di arredi su misura per workspace, retail, food e hospitality.</p>
    </div>
    <div>
      <div class="footer__t">Azienda</div>
      <div class="footer__list">
        <a href="#">Chi siamo</a><a href="contract.html">Contract</a><a href="produzione.html">Produzione</a><a href="#">Realizzazioni</a><a href="#">Contatti</a>
      </div>
    </div>
    <div>
      <div class="footer__t">Settori</div>
      <div class="footer__list">
        <a href="#">Workspace</a><a href="#">Retail</a><a href="#">Food &amp; Beverage</a><a href="#">Food Retail</a><a href="#">Hospitality</a>
      </div>
    </div>
    <div>
      <div class="footer__t">Risorse</div>
      <div class="footer__list">
        <a href="#">Brand Partner</a><a href="#">Prodotti</a><a href="#">Architetti</a><a href="#">MEPA / PA</a><a href="#">Cataloghi PDF</a>
      </div>
    </div>
    <div>
      <div class="footer__t">Contatti</div>
      <div class="footer__contact">Via —, Catanzaro (CZ)<br>T +39 0000 000 000<br>info@artesarredamenti.it</div>
      <a href="#" class="footer__cta">Richiedi un progetto</a>
    </div>
  </div>
  <div class="footer__bottom">
    <span>© 2026 Artes Arredamenti — P.IVA 00000000000</span>
    <span>Privacy · Cookie · MEPA</span>
  </div>
</footer>'''

NEW = '''<footer class="footer">
  <div class="footer__grid">
    <div>
      <img class="footer__logo" src="assets/artes-logo-black.png" alt="ARTES Arredamenti">
      <p class="footer__about">Artes: arredi contract. Progettazione, produzione e installazione di arredi su misura per uffici, negozi, bar e ristoranti, alimentari e hotel.</p>
    </div>
    <div>
      <div class="footer__t">Azienda</div>
      <div class="footer__list">
        <a href="chi-siamo.html">Chi siamo</a><a href="contract.html">Arredo Contract</a><a href="arredamento-su-misura.html">Arredamento su misura</a><a href="#">Realizzazioni</a><a href="#">Contatti</a>
      </div>
    </div>
    <div>
      <div class="footer__t">Settori</div>
      <div class="footer__list">
        <a href="arredamento-ufficio.html">Arredamento ufficio</a><a href="arredo-negozi.html">Arredo negozi</a><a href="arredamento-bar-ristoranti.html">Arredamento bar e ristoranti</a><a href="arredamento-alimentari-wine-food.html">Arredamento alimentari, wine e food</a><a href="arredamento-hotel.html">Arredamento hotel</a>
      </div>
    </div>
    <div>
      <div class="footer__t">Risorse</div>
      <div class="footer__list">
        <a href="brand-partner.html">Brand Partner</a><a href="#">Prodotti</a><a href="#">Architetti</a><a href="#">MEPA / PA</a><a href="#">Cataloghi PDF</a>
      </div>
    </div>
    <div>
      <div class="footer__t">Contatti</div>
      <div class="footer__contact">Via —, Catanzaro (CZ)<br>T +39 0000 000 000<br>info@artesarredamenti.it</div>
      <a href="#" class="footer__cta">Richiedi un progetto</a>
    </div>
  </div>
  <div class="footer__bottom">
    <span>© 2026 Artes Arredamenti — P.IVA 00000000000</span>
    <span>Privacy · Cookie · MEPA</span>
  </div>
</footer>'''

FILES = ['index.html', 'contract.html', 'realizzazione.html', 'sistema-visivo.html']

for name in FILES:
    p = pathlib.Path(name)
    text = p.read_text()
    if OLD not in text:
        raise SystemExit(f'{name}: blocco footer atteso non trovato')
    p.write_text(text.replace(OLD, NEW, 1))
    print(f'{name}: footer sostituito')
```

- [ ] **Step 2: Eseguire**

Run: `python3 /tmp/replace_footer.py`
Expected output: quattro righe `<file>: footer sostituito`.

- [ ] **Step 3: Verifica**

```bash
grep -L "arredamento-su-misura.html" index.html contract.html realizzazione.html sistema-visivo.html
```
Expected: nessun output.

```bash
grep -c "produzione.html\|settori.html" index.html contract.html realizzazione.html sistema-visivo.html
```
Expected per ciascun file: `0` per `settori.html`; per `produzione.html` potrebbe restare >0 solo in `index.html` (link "Dentro la produzione", risolto al Task 14) — negli altri tre file deve essere `0`.

- [ ] **Step 4: Commit**

```bash
git add index.html contract.html realizzazione.html sistema-visivo.html
git commit -m "$(cat <<'EOF'
Aggiorna il footer con la nuova nomenclatura settori/pagine

Colonna Settori rilinkata alle 5 nuove pagine, Azienda aggiornata
(Chi siamo/Arredo Contract/Arredamento su misura), Brand Partner
punta al nuovo archivio.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Venfae1nDKBSDNYX5U6any
EOF
)"
```

---

## Task 5: Creare `arredamento-ufficio.html`

**Files:**
- Create: `arredamento-ufficio.html`

**Interfaces:**
- Consumes: header/footer da Task 3-4, `.drop`/`initDrops` da Task 1-2, filtro generico da Task 1.
- Produces: pagina raggiungibile da nav voce 1 e da footer; card progetto linkata da `realizzazione.html` (Task 14).

- [ ] **Step 1: Scrivere il file**

```html
<!DOCTYPE html>
<html lang="it">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Arredamento ufficio — ARTES Contract</title>
<meta name="description" content="Arredi su misura per uffici direzionali, open space, coworking, sale meeting, academy e reception corporate. Progetto, produzione e montaggio con un unico referente.">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Archivo:wght@300;400;500;600&family=Instrument+Sans:wght@400;500&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet">
<link rel="stylesheet" href="assets/css/artes.css">
</head>
<body>

<header class="header">
  <div class="topbar">
    <span>Arredi contract su misura — Calabria / Italia</span>
    <div class="topbar__right">
      <span>MEPA · Acquisti in Rete PA</span>
      <a href="#">Contatti</a>
      <span>T +39 0000 000 000</span>
      <span class="topbar__lang">IT / EN</span>
    </div>
  </div>

  <div class="masthead">
    <a class="masthead__logo" href="index.html"><img src="assets/artes-logo-black.png" alt="ARTES Arredamenti"></a>
    <nav class="nav" aria-label="Navigazione principale">
      <a href="index.html">Home</a>
      <a href="arredamento-ufficio.html" class="nav__trigger is-active" data-drop-trigger aria-expanded="false" aria-controls="drop-ufficio">Arredamento ufficio</a>
      <a href="arredo-negozi.html" class="nav__trigger" data-drop-trigger aria-expanded="false" aria-controls="drop-negozi">Arredo negozi</a>
      <a href="arredamento-bar-ristoranti.html" class="nav__trigger" data-drop-trigger aria-expanded="false" aria-controls="drop-bar-ristoranti">Arredamento bar e ristoranti</a>
      <a href="arredamento-alimentari-wine-food.html" class="nav__trigger" data-drop-trigger aria-expanded="false" aria-controls="drop-alimentari">Arredamento alimentari, wine e food</a>
      <a href="arredamento-hotel.html" class="nav__trigger" data-drop-trigger aria-expanded="false" aria-controls="drop-hotel">Arredamento hotel</a>
      <a href="arredamento-su-misura.html">Arredamento su misura</a>
      <a href="contract.html">Arredo Contract</a>
      <a href="chi-siamo.html">Chi siamo</a>
    </nav>
    <div class="masthead__actions">
      <a href="#" class="btn-sm btn-sm--outline">Area Progettisti</a>
      <a href="#" class="btn-sm btn-sm--red">Contattaci</a>
    </div>
  </div>

  <div class="drop" id="drop-ufficio" hidden>
    <div class="drop__inner">
      <div class="drop__ph"></div>
      <div class="drop__list">
        <a href="#">Uffici direzionali</a>
        <a href="#">Open space</a>
        <a href="#">Coworking</a>
        <a href="#">Sale meeting e conferenze</a>
        <a href="#">Academy e aule formazione</a>
        <a href="#">Scuole, università, biblioteche</a>
        <a href="#">Reception corporate</a>
        <a href="#">Business lounge e aree break</a>
      </div>
    </div>
  </div>
  <div class="drop" id="drop-negozi" hidden>
    <div class="drop__inner">
      <div class="drop__ph"></div>
      <div class="drop__list">
        <a href="#">Boutique e negozi moda</a>
        <a href="#">Showroom e concept store</a>
        <a href="#">Profumerie e retail beauty</a>
        <a href="#">Gioiellerie e ottiche</a>
        <a href="#">Farmacie e parafarmacie</a>
        <a href="#">Telefonia ed elettronica</a>
        <a href="#">Store sportivi</a>
        <a href="#">Temporary shop e franchising</a>
      </div>
    </div>
  </div>
  <div class="drop" id="drop-bar-ristoranti" hidden>
    <div class="drop__inner">
      <div class="drop__ph"></div>
      <div class="drop__list">
        <a href="#">Panetterie e bakery</a>
        <a href="#">Pasticcerie</a>
        <a href="#">Gastronomie e salumerie</a>
        <a href="#">Macellerie e pescherie</a>
        <a href="#">Caseifici</a>
        <a href="#">Market gourmet</a>
        <a href="#">Chocolate shop e take-away</a>
        <a href="#">Healthy food store</a>
      </div>
    </div>
  </div>
  <div class="drop" id="drop-alimentari" hidden>
    <div class="drop__inner">
      <div class="drop__ph"></div>
      <div class="drop__list">
        <a href="#">Bar e caffetterie</a>
        <a href="#">Bistrot e ristoranti</a>
        <a href="#">Pizzerie e pub</a>
        <a href="#">Lounge e cocktail bar</a>
        <a href="#">Wine bar ed enoteche</a>
        <a href="#">Gelaterie</a>
        <a href="#">Fast casual e street food</a>
        <a href="#">Food court e rooftop bar</a>
      </div>
    </div>
  </div>
  <div class="drop" id="drop-hotel" hidden>
    <div class="drop__inner">
      <div class="drop__ph"></div>
      <div class="drop__list">
        <a href="#">Hotel e resort</a>
        <a href="#">Boutique hotel e b&amp;b premium</a>
        <a href="#">Spa e wellness center</a>
        <a href="#">Reception e lounge hotel</a>
        <a href="#">Aree breakfast</a>
        <a href="#">Rooftop hospitality</a>
        <a href="#">Residence e business hotel</a>
        <a href="#">Co-living e serviced apartment</a>
      </div>
    </div>
  </div>
</header>
<main>

  <section class="page-intro">
    <div class="breadcrumb">
      <a href="index.html">Home</a> / <strong>Arredamento ufficio</strong>
    </div>
    <div class="page-intro__row">
      <div>
        <div class="eyebrow">01 — Workspace</div>
        <h1 class="page-title">L'ufficio non è<br><strong>più una fila di postazioni.</strong></h1>
      </div>
      <p class="lead">Meno scrivanie fisse, più aree di relazione: il layout deve reggere riorganizzazioni che una volta avvenivano ogni dieci anni e oggi ogni due. Progettiamo partendo da acustica, riservatezza e flessibilità, non dall'estetica della postazione.</p>
    </div>
  </section>

  <section class="settore" id="workspace">
    <div class="settore__text">
      <div class="eyebrow">Ambiti</div>
      <ul class="ambiti">
        <li><a href="#">Uffici direzionali</a></li>
        <li><a href="#">Open space</a></li>
        <li><a href="#">Coworking</a></li>
        <li><a href="#">Sale meeting e conferenze</a></li>
        <li><a href="#">Academy e aule formazione</a></li>
        <li><a href="#">Scuole, università, biblioteche</a></li>
        <li><a href="#">Reception corporate</a></li>
        <li><a href="#">Business lounge e aree break</a></li>
      </ul>
      <div class="settore__links">
        <a href="brand-partner.html" class="link-rule">Brand collegati</a>
      </div>
    </div>
    <div class="settore__media">
      <div class="ph__note">[ foto — open space con cabine acustiche ]</div>
      <div class="settore__inset"></div>
    </div>
  </section>

  <section class="section">
    <div class="section__head">
      <div>
        <div class="eyebrow">Realizzazioni</div>
        <h2 class="h-section">Progetti<br>Arredamento ufficio.</h2>
      </div>
      <p class="lead">Filtra per ambito per vedere solo i progetti della categoria che ti interessa.</p>
    </div>
    <div class="filtri" data-filtri role="group" aria-label="Filtra per ambito">
      <button type="button" class="filtro is-active" data-filtro="Tutti" aria-pressed="true">Tutti</button>
      <button type="button" class="filtro" data-filtro="Uffici direzionali" aria-pressed="false">Uffici direzionali</button>
      <button type="button" class="filtro" data-filtro="Open space" aria-pressed="false">Open space</button>
      <button type="button" class="filtro" data-filtro="Coworking" aria-pressed="false">Coworking</button>
      <button type="button" class="filtro" data-filtro="Sale meeting e conferenze" aria-pressed="false">Sale meeting e conferenze</button>
      <button type="button" class="filtro" data-filtro="Academy e aule formazione" aria-pressed="false">Academy e aule formazione</button>
      <button type="button" class="filtro" data-filtro="Scuole, università, biblioteche" aria-pressed="false">Scuole, università, biblioteche</button>
      <button type="button" class="filtro" data-filtro="Reception corporate" aria-pressed="false">Reception corporate</button>
      <button type="button" class="filtro" data-filtro="Business lounge e aree break" aria-pressed="false">Business lounge e aree break</button>
    </div>
    <div class="progetti" data-progetti>
      <a class="progetto progetto--w2" href="realizzazione.html" data-settore="Uffici direzionali">
        <div class="progetto__media"><div class="progetto__wash"></div><div class="ph__note">[ foto — open space ]</div></div>
        <div class="progetto__meta">
          <div><div class="progetto__nome">Headquarter Mediterranea</div><div class="progetto__luogo">Catanzaro — 1.400 m²</div></div>
          <div class="progetto__settore">Uffici direzionali</div>
        </div>
      </a>
      <a class="progetto progetto--w2" href="realizzazione.html" data-settore="Academy e aule formazione">
        <div class="progetto__media"><div class="progetto__wash"></div><div class="ph__note">[ foto — aula formazione ]</div></div>
        <div class="progetto__meta">
          <div><div class="progetto__nome">Academy Ferrara Group</div><div class="progetto__luogo">Crotone — aula 90 posti</div></div>
          <div class="progetto__settore">Academy e aule formazione</div>
        </div>
      </a>
      <p class="progetti__empty" data-empty hidden>Nessuna realizzazione pubblicata per questo ambito.</p>
    </div>
  </section>

  <section class="cta-band">
    <h2>Un ufficio<br>da riprogettare?</h2>
    <div class="cta-band__actions">
      <a href="#" class="btn btn--red">Richiedi un preventivo</a>
      <a href="#" class="btn btn--ghost">Parla con un tecnico</a>
    </div>
  </section>

</main>

<footer class="footer">
  <div class="footer__grid">
    <div>
      <img class="footer__logo" src="assets/artes-logo-black.png" alt="ARTES Arredamenti">
      <p class="footer__about">Artes: arredi contract. Progettazione, produzione e installazione di arredi su misura per uffici, negozi, bar e ristoranti, alimentari e hotel.</p>
    </div>
    <div>
      <div class="footer__t">Azienda</div>
      <div class="footer__list">
        <a href="chi-siamo.html">Chi siamo</a><a href="contract.html">Arredo Contract</a><a href="arredamento-su-misura.html">Arredamento su misura</a><a href="#">Realizzazioni</a><a href="#">Contatti</a>
      </div>
    </div>
    <div>
      <div class="footer__t">Settori</div>
      <div class="footer__list">
        <a href="arredamento-ufficio.html">Arredamento ufficio</a><a href="arredo-negozi.html">Arredo negozi</a><a href="arredamento-bar-ristoranti.html">Arredamento bar e ristoranti</a><a href="arredamento-alimentari-wine-food.html">Arredamento alimentari, wine e food</a><a href="arredamento-hotel.html">Arredamento hotel</a>
      </div>
    </div>
    <div>
      <div class="footer__t">Risorse</div>
      <div class="footer__list">
        <a href="brand-partner.html">Brand Partner</a><a href="#">Prodotti</a><a href="#">Architetti</a><a href="#">MEPA / PA</a><a href="#">Cataloghi PDF</a>
      </div>
    </div>
    <div>
      <div class="footer__t">Contatti</div>
      <div class="footer__contact">Via —, Catanzaro (CZ)<br>T +39 0000 000 000<br>info@artesarredamenti.it</div>
      <a href="#" class="footer__cta">Richiedi un progetto</a>
    </div>
  </div>
  <div class="footer__bottom">
    <span>© 2026 Artes Arredamenti — P.IVA 00000000000</span>
    <span>Privacy · Cookie · MEPA</span>
  </div>
</footer>

<script src="assets/js/artes.js"></script>
</body>
</html>
```

- [ ] **Step 2: Verifica**

```bash
python3 -m http.server 8799 & sleep 1
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8799/arredamento-ufficio.html
kill %1
```
Expected: `200`.

```bash
grep -c 'data-settore="Uffici direzionali"' arredamento-ufficio.html
```
Expected: `1` (esattamente una card usa quel valore, coerente col bottone filtro).

- [ ] **Step 3: Commit**

```bash
git add arredamento-ufficio.html
git commit -m "$(cat <<'EOF'
Crea arredamento-ufficio.html (ex sezione Workspace di settori.html)

Pagina standalone con intro, ambiti, griglia progetti filtrabile per
micro-categoria. Sostituisce la sezione ancorata #workspace.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Venfae1nDKBSDNYX5U6any
EOF
)"
```

---

## Task 6: Creare `arredo-negozi.html`

**Files:**
- Create: `arredo-negozi.html`

**Interfaces:** identiche al Task 5 (stesso header/footer, stesso meccanismo filtri).

- [ ] **Step 1: Scrivere il file**

Stesso `<head>`/header/footer del Task 5 (aggiornare solo `<title>` in `Arredo negozi — ARTES Contract`, `<meta name="description">` in `Arredi su misura per boutique, showroom, concept store, farmacie e store sportivi. Progetto, produzione e montaggio con un unico referente.`, e nel blocco nav il trigger attivo è `arredo-negozi.html` — aggiungere `is-active` lì invece che su `arredamento-ufficio.html`). Il `<main>`:

```html
<main>

  <section class="page-intro">
    <div class="breadcrumb">
      <a href="index.html">Home</a> / <strong>Arredo negozi</strong>
    </div>
    <div class="page-intro__row">
      <div>
        <div class="eyebrow">02 — Retail</div>
        <h1 class="page-title">Il negozio compete<br><strong>sull'esperienza, non sul prezzo.</strong></h1>
      </div>
      <p class="lead">L'arredo retail ha due vite: quella lunga della struttura e quella breve dell'esposizione, che cambia a ogni stagione. Costruiamo la prima perché duri e la seconda perché si riconfiguri senza chiamare un falegname.</p>
    </div>
  </section>

  <section class="settore settore--flip" id="retail">
    <div class="settore__text">
      <div class="eyebrow">Ambiti</div>
      <ul class="ambiti">
        <li><a href="#">Boutique e negozi moda</a></li>
        <li><a href="#">Showroom e concept store</a></li>
        <li><a href="#">Profumerie e retail beauty</a></li>
        <li><a href="#">Gioiellerie e ottiche</a></li>
        <li><a href="#">Farmacie e parafarmacie</a></li>
        <li><a href="#">Telefonia ed elettronica</a></li>
        <li><a href="#">Store sportivi</a></li>
        <li><a href="#">Temporary shop e franchising</a></li>
      </ul>
      <div class="settore__links">
        <a href="brand-partner.html" class="link-rule">Brand collegati</a>
      </div>
    </div>
    <div class="settore__media">
      <div class="ph__note">[ foto — sistema espositivo modulare ]</div>
      <div class="settore__inset"></div>
    </div>
  </section>

  <section class="section">
    <div class="section__head">
      <div>
        <div class="eyebrow">Realizzazioni</div>
        <h2 class="h-section">Progetti<br>Arredo negozi.</h2>
      </div>
      <p class="lead">Filtra per ambito per vedere solo i progetti della categoria che ti interessa.</p>
    </div>
    <div class="filtri" data-filtri role="group" aria-label="Filtra per ambito">
      <button type="button" class="filtro is-active" data-filtro="Tutti" aria-pressed="true">Tutti</button>
      <button type="button" class="filtro" data-filtro="Boutique e negozi moda" aria-pressed="false">Boutique e negozi moda</button>
      <button type="button" class="filtro" data-filtro="Showroom e concept store" aria-pressed="false">Showroom e concept store</button>
      <button type="button" class="filtro" data-filtro="Profumerie e retail beauty" aria-pressed="false">Profumerie e retail beauty</button>
      <button type="button" class="filtro" data-filtro="Gioiellerie e ottiche" aria-pressed="false">Gioiellerie e ottiche</button>
      <button type="button" class="filtro" data-filtro="Farmacie e parafarmacie" aria-pressed="false">Farmacie e parafarmacie</button>
      <button type="button" class="filtro" data-filtro="Telefonia ed elettronica" aria-pressed="false">Telefonia ed elettronica</button>
      <button type="button" class="filtro" data-filtro="Store sportivi" aria-pressed="false">Store sportivi</button>
      <button type="button" class="filtro" data-filtro="Temporary shop e franchising" aria-pressed="false">Temporary shop e franchising</button>
    </div>
    <div class="progetti" data-progetti>
      <a class="progetto progetto--w2" href="realizzazione.html" data-settore="Showroom e concept store">
        <div class="progetto__media"><div class="progetto__wash"></div><div class="ph__note">[ foto — retail display ]</div></div>
        <div class="progetto__meta">
          <div><div class="progetto__nome">Concept store Sila</div><div class="progetto__luogo">Cosenza — 240 m²</div></div>
          <div class="progetto__settore">Showroom e concept store</div>
        </div>
      </a>
      <p class="progetti__empty" data-empty hidden>Nessuna realizzazione pubblicata per questo ambito.</p>
    </div>
  </section>

  <section class="cta-band">
    <h2>Un negozio<br>da riprogettare?</h2>
    <div class="cta-band__actions">
      <a href="#" class="btn btn--red">Richiedi un preventivo</a>
      <a href="#" class="btn btn--ghost">Parla con un tecnico</a>
    </div>
  </section>

</main>
```

- [ ] **Step 2: Verifica**

```bash
python3 -m http.server 8799 & sleep 1
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8799/arredo-negozi.html
kill %1
grep -c 'data-settore="Showroom e concept store"' arredo-negozi.html
```
Expected: `200`, poi `1`.

- [ ] **Step 3: Commit**

```bash
git add arredo-negozi.html
git commit -m "$(cat <<'EOF'
Crea arredo-negozi.html (ex sezione Retail di settori.html)

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Venfae1nDKBSDNYX5U6any
EOF
)"
```

---

## Task 7: Creare `arredamento-bar-ristoranti.html`

**Files:**
- Create: `arredamento-bar-ristoranti.html`

**Interfaces:** identiche al Task 5. Eredita le micro-categorie dell'attuale "Food Retail" (mappatura confermata, vedi Global Constraints).

- [ ] **Step 1: Scrivere il file**

Stesso `<head>`/header/footer del Task 5 (`<title>Arredamento bar e ristoranti — ARTES Contract</title>`, description `Arredi su misura per panetterie, pasticcerie, gastronomie, macellerie e market gourmet. Progetto, produzione e montaggio con un unico referente.`, `is-active` sul trigger `arredamento-bar-ristoranti.html`). Il `<main>`:

```html
<main>

  <section class="page-intro">
    <div class="breadcrumb">
      <a href="index.html">Home</a> / <strong>Arredamento bar e ristoranti</strong>
    </div>
    <div class="page-intro__row">
      <div>
        <div class="eyebrow">03 — Food Retail</div>
        <h1 class="page-title">Dove il freddo<br><strong>e il carattere convivono.</strong></h1>
      </div>
      <p class="lead">Banchi refrigerati, retrobanco, esposizione a vista: qui il capitolato parte da superfici certificate, pulibilità e continuità della catena del freddo. Il progetto comincia da questi vincoli e trova lo stile dentro, non sopra.</p>
    </div>
  </section>

  <section class="settore" id="bar-ristoranti">
    <div class="settore__text">
      <div class="eyebrow">Ambiti</div>
      <ul class="ambiti">
        <li><a href="#">Panetterie e bakery</a></li>
        <li><a href="#">Pasticcerie</a></li>
        <li><a href="#">Gastronomie e salumerie</a></li>
        <li><a href="#">Macellerie e pescherie</a></li>
        <li><a href="#">Caseifici</a></li>
        <li><a href="#">Market gourmet</a></li>
        <li><a href="#">Chocolate shop e take-away</a></li>
        <li><a href="#">Healthy food store</a></li>
      </ul>
      <div class="settore__links">
        <a href="brand-partner.html" class="link-rule">Brand collegati</a>
      </div>
    </div>
    <div class="settore__media">
      <div class="ph__note">[ foto — banco bakery in rovere e pietra ]</div>
      <div class="settore__inset"></div>
    </div>
  </section>

  <section class="section">
    <div class="section__head">
      <div>
        <div class="eyebrow">Realizzazioni</div>
        <h2 class="h-section">Progetti<br>Arredamento bar e ristoranti.</h2>
      </div>
      <p class="lead">Filtra per ambito per vedere solo i progetti della categoria che ti interessa.</p>
    </div>
    <div class="filtri" data-filtri role="group" aria-label="Filtra per ambito">
      <button type="button" class="filtro is-active" data-filtro="Tutti" aria-pressed="true">Tutti</button>
      <button type="button" class="filtro" data-filtro="Panetterie e bakery" aria-pressed="false">Panetterie e bakery</button>
      <button type="button" class="filtro" data-filtro="Pasticcerie" aria-pressed="false">Pasticcerie</button>
      <button type="button" class="filtro" data-filtro="Gastronomie e salumerie" aria-pressed="false">Gastronomie e salumerie</button>
      <button type="button" class="filtro" data-filtro="Macellerie e pescherie" aria-pressed="false">Macellerie e pescherie</button>
      <button type="button" class="filtro" data-filtro="Caseifici" aria-pressed="false">Caseifici</button>
      <button type="button" class="filtro" data-filtro="Market gourmet" aria-pressed="false">Market gourmet</button>
      <button type="button" class="filtro" data-filtro="Chocolate shop e take-away" aria-pressed="false">Chocolate shop e take-away</button>
      <button type="button" class="filtro" data-filtro="Healthy food store" aria-pressed="false">Healthy food store</button>
    </div>
    <div class="progetti" data-progetti>
      <a class="progetto progetto--w2" href="realizzazione.html" data-settore="Panetterie e bakery">
        <div class="progetto__media"><div class="progetto__wash"></div><div class="ph__note">[ foto — banco bakery ]</div></div>
        <div class="progetto__meta">
          <div><div class="progetto__nome">Panificio Grani Antichi</div><div class="progetto__luogo">Lamezia Terme — bakery</div></div>
          <div class="progetto__settore">Panetterie e bakery</div>
        </div>
      </a>
      <p class="progetti__empty" data-empty hidden>Nessuna realizzazione pubblicata per questo ambito.</p>
    </div>
  </section>

  <section class="cta-band">
    <h2>Un locale<br>da riprogettare?</h2>
    <div class="cta-band__actions">
      <a href="#" class="btn btn--red">Richiedi un preventivo</a>
      <a href="#" class="btn btn--ghost">Parla con un tecnico</a>
    </div>
  </section>

</main>
```

- [ ] **Step 2: Verifica**

```bash
python3 -m http.server 8799 & sleep 1
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8799/arredamento-bar-ristoranti.html
kill %1
grep -c 'data-settore="Panetterie e bakery"' arredamento-bar-ristoranti.html
```
Expected: `200`, poi `1`.

- [ ] **Step 3: Commit**

```bash
git add arredamento-bar-ristoranti.html
git commit -m "$(cat <<'EOF'
Crea arredamento-bar-ristoranti.html (eredita micro-cat. Food Retail)

Mappatura confermata dal cliente: questa voce prende le micro-categorie
dell'attuale settore Food Retail (panetterie, pasticcerie, gastronomie,
macellerie, caseifici, market gourmet, chocolate shop, healthy food).

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Venfae1nDKBSDNYX5U6any
EOF
)"
```

---

## Task 8: Creare `arredamento-alimentari-wine-food.html`

**Files:**
- Create: `arredamento-alimentari-wine-food.html`

**Interfaces:** identiche al Task 5. Eredita le micro-categorie dell'attuale "Food & Beverage".

- [ ] **Step 1: Scrivere il file**

Stesso `<head>`/header/footer del Task 5 (`<title>Arredamento alimentari, wine e food — ARTES Contract</title>`, description `Arredi su misura per bar, bistrot, wine bar, gelaterie e rooftop bar. Progetto, produzione e montaggio con un unico referente.`, `is-active` sul trigger `arredamento-alimentari-wine-food.html`). Il `<main>`:

```html
<main>

  <section class="page-intro">
    <div class="breadcrumb">
      <a href="index.html">Home</a> / <strong>Arredamento alimentari, wine e food</strong>
    </div>
    <div class="page-intro__row">
      <div>
        <div class="eyebrow">04 — Food &amp; Beverage</div>
        <h1 class="page-title">Il bancone è<br><strong>la macchina del locale.</strong></h1>
      </div>
      <p class="lead">Prima di essere un oggetto di design è una postazione di lavoro: distanze, attrezzature sottopiano, passaggi del personale nelle ore di punta. Lo disegniamo sul flusso reale del servizio, poi lo vestiamo con i materiali del progetto.</p>
    </div>
  </section>

  <section class="settore settore--flip" id="alimentari-wine-food">
    <div class="settore__text">
      <div class="eyebrow">Ambiti</div>
      <ul class="ambiti">
        <li><a href="#">Bar e caffetterie</a></li>
        <li><a href="#">Bistrot e ristoranti</a></li>
        <li><a href="#">Pizzerie e pub</a></li>
        <li><a href="#">Lounge e cocktail bar</a></li>
        <li><a href="#">Wine bar ed enoteche</a></li>
        <li><a href="#">Gelaterie</a></li>
        <li><a href="#">Fast casual e street food</a></li>
        <li><a href="#">Food court e rooftop bar</a></li>
      </ul>
      <div class="settore__links">
        <a href="brand-partner.html" class="link-rule">Brand collegati</a>
      </div>
    </div>
    <div class="settore__media">
      <div class="ph__note">[ foto — bancone bar, dettaglio top ]</div>
      <div class="settore__inset"></div>
    </div>
  </section>

  <section class="section">
    <div class="section__head">
      <div>
        <div class="eyebrow">Realizzazioni</div>
        <h2 class="h-section">Progetti<br>Arredamento alimentari, wine e food.</h2>
      </div>
      <p class="lead">Filtra per ambito per vedere solo i progetti della categoria che ti interessa.</p>
    </div>
    <div class="filtri" data-filtri role="group" aria-label="Filtra per ambito">
      <button type="button" class="filtro is-active" data-filtro="Tutti" aria-pressed="true">Tutti</button>
      <button type="button" class="filtro" data-filtro="Bar e caffetterie" aria-pressed="false">Bar e caffetterie</button>
      <button type="button" class="filtro" data-filtro="Bistrot e ristoranti" aria-pressed="false">Bistrot e ristoranti</button>
      <button type="button" class="filtro" data-filtro="Pizzerie e pub" aria-pressed="false">Pizzerie e pub</button>
      <button type="button" class="filtro" data-filtro="Lounge e cocktail bar" aria-pressed="false">Lounge e cocktail bar</button>
      <button type="button" class="filtro" data-filtro="Wine bar ed enoteche" aria-pressed="false">Wine bar ed enoteche</button>
      <button type="button" class="filtro" data-filtro="Gelaterie" aria-pressed="false">Gelaterie</button>
      <button type="button" class="filtro" data-filtro="Fast casual e street food" aria-pressed="false">Fast casual e street food</button>
      <button type="button" class="filtro" data-filtro="Food court e rooftop bar" aria-pressed="false">Food court e rooftop bar</button>
    </div>
    <div class="progetti" data-progetti>
      <a class="progetto progetto--w2" href="realizzazione.html" data-settore="Food court e rooftop bar">
        <div class="progetto__media"><div class="progetto__wash"></div><div class="ph__note">[ foto — bancone bar ]</div></div>
        <div class="progetto__meta">
          <div><div class="progetto__nome">Rooftop Bar Levante</div><div class="progetto__luogo">Reggio Calabria</div></div>
          <div class="progetto__settore">Food court e rooftop bar</div>
        </div>
      </a>
      <p class="progetti__empty" data-empty hidden>Nessuna realizzazione pubblicata per questo ambito.</p>
    </div>
  </section>

  <section class="cta-band">
    <h2>Un locale<br>da riprogettare?</h2>
    <div class="cta-band__actions">
      <a href="#" class="btn btn--red">Richiedi un preventivo</a>
      <a href="#" class="btn btn--ghost">Parla con un tecnico</a>
    </div>
  </section>

</main>
```

- [ ] **Step 2: Verifica**

```bash
python3 -m http.server 8799 & sleep 1
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8799/arredamento-alimentari-wine-food.html
kill %1
grep -c 'data-settore="Food court e rooftop bar"' arredamento-alimentari-wine-food.html
```
Expected: `200`, poi `1`.

- [ ] **Step 3: Commit**

```bash
git add arredamento-alimentari-wine-food.html
git commit -m "$(cat <<'EOF'
Crea arredamento-alimentari-wine-food.html (eredita micro-cat. Food & Beverage)

Mappatura confermata dal cliente: questa voce prende le micro-categorie
dell'attuale settore Food & Beverage (bar, bistrot/ristoranti, pizzerie,
wine bar, gelaterie, street food, rooftop bar).

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Venfae1nDKBSDNYX5U6any
EOF
)"
```

---

## Task 9: Creare `arredamento-hotel.html`

**Files:**
- Create: `arredamento-hotel.html`

**Interfaces:** identiche al Task 5. Le card progetto includono `Boutique Hotel Aurea`, la scheda reale che `realizzazione.html` rappresenta.

- [ ] **Step 1: Scrivere il file**

Stesso `<head>`/header/footer del Task 5 (`<title>Arredamento hotel — ARTES Contract</title>`, description `Arredi su misura per hotel, resort, spa e boutique hotel. Progetto, produzione e montaggio con un unico referente.`, `is-active` sul trigger `arredamento-hotel.html`). Il `<main>`:

```html
<main>

  <section class="page-intro">
    <div class="breadcrumb">
      <a href="index.html">Home</a> / <strong>Arredamento hotel</strong>
    </div>
    <div class="page-intro__row">
      <div>
        <div class="eyebrow">05 — Hospitality</div>
        <h1 class="page-title">Il contract<br><strong>più esigente sui tempi.</strong></h1>
      </div>
      <p class="lead">In un hotel ogni settimana di ritardo è una settimana di mancato incasso. Per questo lavoriamo su mock-up di camera approvati prima della produzione in serie e consegniamo per lotti, piano per piano, seguendo l'apertura commerciale.</p>
    </div>
  </section>

  <section class="settore" id="hotel">
    <div class="settore__text">
      <div class="eyebrow">Ambiti</div>
      <ul class="ambiti">
        <li><a href="#">Hotel e resort</a></li>
        <li><a href="#">Boutique hotel e b&amp;b premium</a></li>
        <li><a href="#">Spa e wellness center</a></li>
        <li><a href="#">Reception e lounge hotel</a></li>
        <li><a href="#">Aree breakfast</a></li>
        <li><a href="#">Rooftop hospitality</a></li>
        <li><a href="#">Residence e business hotel</a></li>
        <li><a href="#">Co-living e serviced apartment</a></li>
      </ul>
      <div class="settore__links">
        <a href="brand-partner.html" class="link-rule">Brand collegati</a>
      </div>
    </div>
    <div class="settore__media">
      <div class="ph__note">[ foto — lounge hotel, arredi su misura ]</div>
      <div class="settore__inset"></div>
    </div>
  </section>

  <section class="section">
    <div class="section__head">
      <div>
        <div class="eyebrow">Realizzazioni</div>
        <h2 class="h-section">Progetti<br>Arredamento hotel.</h2>
      </div>
      <p class="lead">Filtra per ambito per vedere solo i progetti della categoria che ti interessa.</p>
    </div>
    <div class="filtri" data-filtri role="group" aria-label="Filtra per ambito">
      <button type="button" class="filtro is-active" data-filtro="Tutti" aria-pressed="true">Tutti</button>
      <button type="button" class="filtro" data-filtro="Hotel e resort" aria-pressed="false">Hotel e resort</button>
      <button type="button" class="filtro" data-filtro="Boutique hotel e b&amp;b premium" aria-pressed="false">Boutique hotel e b&amp;b premium</button>
      <button type="button" class="filtro" data-filtro="Spa e wellness center" aria-pressed="false">Spa e wellness center</button>
      <button type="button" class="filtro" data-filtro="Reception e lounge hotel" aria-pressed="false">Reception e lounge hotel</button>
      <button type="button" class="filtro" data-filtro="Aree breakfast" aria-pressed="false">Aree breakfast</button>
      <button type="button" class="filtro" data-filtro="Rooftop hospitality" aria-pressed="false">Rooftop hospitality</button>
      <button type="button" class="filtro" data-filtro="Residence e business hotel" aria-pressed="false">Residence e business hotel</button>
      <button type="button" class="filtro" data-filtro="Co-living e serviced apartment" aria-pressed="false">Co-living e serviced apartment</button>
    </div>
    <div class="progetti" data-progetti>
      <a class="progetto progetto--w4" href="realizzazione.html" data-settore="Boutique hotel e b&amp;b premium">
        <div class="progetto__media"><div class="progetto__wash"></div><div class="ph__note">[ foto — lounge hotel ]</div></div>
        <div class="progetto__meta">
          <div><div class="progetto__nome">Boutique Hotel Aurea</div><div class="progetto__luogo">Tropea (VV) — 28 camere</div></div>
          <div class="progetto__settore">Boutique hotel e b&amp;b premium</div>
        </div>
      </a>
      <a class="progetto progetto--w2" href="#" data-settore="Hotel e resort">
        <div class="progetto__media"><div class="progetto__wash"></div><div class="ph__note">[ foto — resort lounge ]</div></div>
        <div class="progetto__meta">
          <div><div class="progetto__nome">Resort Capo Bianco</div><div class="progetto__luogo">Hospitality</div></div>
          <div class="progetto__settore">Hotel e resort</div>
        </div>
      </a>
      <a class="progetto progetto--w2" href="#" data-settore="Spa e wellness center">
        <div class="progetto__media"><div class="progetto__wash"></div><div class="ph__note">[ foto — area wellness ]</div></div>
        <div class="progetto__meta">
          <div><div class="progetto__nome">Spa Terme Luigiane</div><div class="progetto__luogo">Hospitality</div></div>
          <div class="progetto__settore">Spa e wellness center</div>
        </div>
      </a>
      <a class="progetto progetto--w2" href="#" data-settore="Residence e business hotel">
        <div class="progetto__media"><div class="progetto__wash"></div><div class="ph__note">[ foto — reception ]</div></div>
        <div class="progetto__meta">
          <div><div class="progetto__nome">Business Hotel Fera</div><div class="progetto__luogo">Hospitality</div></div>
          <div class="progetto__settore">Residence e business hotel</div>
        </div>
      </a>
      <p class="progetti__empty" data-empty hidden>Nessuna realizzazione pubblicata per questo ambito.</p>
    </div>
  </section>

  <section class="cta-band">
    <h2>Un hotel<br>da riprogettare?</h2>
    <div class="cta-band__actions">
      <a href="#" class="btn btn--red">Richiedi un preventivo</a>
      <a href="#" class="btn btn--ghost">Parla con un tecnico</a>
    </div>
  </section>

</main>
```

- [ ] **Step 2: Verifica**

```bash
python3 -m http.server 8799 & sleep 1
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8799/arredamento-hotel.html
kill %1
grep -c 'href="realizzazione.html"' arredamento-hotel.html
```
Expected: `200`, poi `1` (solo Boutique Hotel Aurea linka alla scheda reale).

- [ ] **Step 3: Commit**

```bash
git add arredamento-hotel.html
git commit -m "$(cat <<'EOF'
Crea arredamento-hotel.html (ex sezione Hospitality di settori.html)

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Venfae1nDKBSDNYX5U6any
EOF
)"
```

---

## Task 10: Rinominare `produzione.html` in `arredamento-su-misura.html`

**Files:**
- Create: `arredamento-su-misura.html` (contenuto derivato da `produzione.html`)
- Delete: `produzione.html`

**Interfaces:** identiche al Task 5 per header/footer. Il corpo riusa il contenuto attuale di `produzione.html` (lavorazioni, ciclo produttivo, materiali, fuori standard, capacità produttiva), solo breadcrumb/eyebrow aggiornati.

- [ ] **Step 1: Copiare e adattare il file**

```bash
git mv produzione.html arredamento-su-misura.html
```

- [ ] **Step 2: Aggiornare `<title>` e meta description**

In `arredamento-su-misura.html`, sostituire:
```html
<title>Produzione — Officina e rete di partner ARTES</title>
```
con (verificare il testo esatto presente nel file prima di sostituire, con `grep -n "<title>" arredamento-su-misura.html`):
```html
<title>Arredamento su misura — Officina e rete di partner ARTES</title>
```

- [ ] **Step 3: Sostituire header e footer con le versioni Task 3/4**

Applicare lo stesso `OLD`/`NEW` header dello script del Task 3 e lo stesso `OLD`/`NEW` footer dello script del Task 4 anche a questo file (può essere fatto aggiungendo `'arredamento-su-misura.html'` alla lista `FILES` di entrambi gli script e rieseguendoli, oppure ripetendo manualmente la stessa sostituzione). Nel nuovo header, impostare `is-active` sulla voce `<a href="arredamento-su-misura.html">Arredamento su misura</a>` → `<a href="arredamento-su-misura.html" class="is-active">Arredamento su misura</a>`.

- [ ] **Step 4: Aggiornare breadcrumb e testo introduttivo**

```bash
grep -n 'Produzione</strong>\|Officina e rete di partner' arredamento-su-misura.html
```

Sostituire:
```html
<a href="index.html">Home</a> / <strong>Produzione</strong>
```
con:
```html
<a href="index.html">Home</a> / <strong>Arredamento su misura</strong>
```

Sostituire:
```html
<div class="eyebrow">Officina e rete di partner</div>
```
con:
```html
<div class="eyebrow">Arredamento su misura — officina e rete di partner</div>
```

Il resto del corpo (lavorazioni, ciclo produttivo, materiali, fuori standard, capacità produttiva, CTA) resta invariato: descrive esattamente il servizio di arredamento su misura.

- [ ] **Step 5: Verifica**

```bash
test -f produzione.html && echo "ERRORE: produzione.html esiste ancora" || echo "OK: produzione.html rimosso"
python3 -m http.server 8799 & sleep 1
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8799/arredamento-su-misura.html
kill %1
grep -c "data-drop-trigger" arredamento-su-misura.html
```
Expected: `OK: produzione.html rimosso`, poi `200`, poi `5`.

- [ ] **Step 6: Commit**

```bash
git add -A produzione.html arredamento-su-misura.html
git commit -m "$(cat <<'EOF'
Rinomina produzione.html in arredamento-su-misura.html

Il contenuto (lavorazioni, ciclo produttivo, materiali, capacità
produttiva) resta lo stesso: descrive esattamente il servizio di
arredamento su misura. Aggiornati solo header/footer, title,
breadcrumb ed eyebrow.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Venfae1nDKBSDNYX5U6any
EOF
)"
```

---

## Task 11: Creare `chi-siamo.html`

**Files:**
- Create: `chi-siamo.html`

**Interfaces:** identiche al Task 5. Prima pagina reale per un link che oggi è `href="#"` in tutte le pagine (topbar/footer/nav).

- [ ] **Step 1: Scrivere il file**

Stesso `<head>`/header/footer del Task 5 (`<title>Chi siamo — ARTES Contract</title>`, description `Dal 1987 progettiamo, produciamo e installiamo arredi contract su misura in Calabria e in tutta Italia. Un unico interlocutore dal rilievo al post-vendita.`, `is-active` sulla voce `<a href="chi-siamo.html">Chi siamo</a>`). Il `<main>`:

```html
<main>

  <section class="page-intro">
    <div class="breadcrumb">
      <a href="index.html">Home</a> / <strong>Chi siamo</strong>
    </div>
    <div class="page-intro__row">
      <div>
        <div class="eyebrow">Dal 1987</div>
        <h1 class="page-title">Un cantiere,<br><strong>un solo interlocutore.</strong></h1>
      </div>
      <p class="lead">Artes nasce come falegnameria e cresce fino a diventare un interlocutore unico per il contract: progettazione, produzione interna, rete di partner selezionati e montaggio, seguiti dallo stesso team dal rilievo al collaudo.</p>
    </div>
  </section>

  <div class="page-band">
    <div class="ph__note">[ foto — team in cantiere / officina, 2560×1440 ]</div>
  </div>

  <section class="section section--tight">
    <div class="section__head">
      <div>
        <div class="eyebrow">01 — Il percorso</div>
        <h2 class="h-section">Dalla falegnameria<br>al contract integrato.</h2>
      </div>
      <p class="lead">Quattro tappe che raccontano perché oggi seguiamo l'intero cantiere invece di fornire solo gli arredi.</p>
    </div>
    <div class="grid-1px grid-1px--2 grid-1px--hover">
      <div class="card card--lg">
        <div class="card__n">1987</div>
        <div class="card__t">Primo cantiere</div>
        <div class="card__d">Nasce l'officina di falegnameria: arredi su disegno per i primi clienti locali.</div>
      </div>
      <div class="card card--lg">
        <div class="card__n">Anni '90 — 2000</div>
        <div class="card__t">Rete di partner</div>
        <div class="card__d">Si struttura la rete di partner qualificati per lapidei, vetro, metalli e imbottiti.</div>
      </div>
      <div class="card card--lg">
        <div class="card__n">2010</div>
        <div class="card__t">Metodo contract</div>
        <div class="card__d">Il processo si formalizza in sette fasi con un unico project manager per commessa.</div>
      </div>
      <div class="card card--lg">
        <div class="card__n">Oggi</div>
        <div class="card__t">Cinque settori</div>
        <div class="card__d">Workspace, retail, food e hospitality: lo stesso metodo applicato a spazi molto diversi tra loro.</div>
      </div>
    </div>
  </section>

  <section class="section">
    <div class="section__head">
      <div>
        <div class="eyebrow">02 — Come lavoriamo</div>
        <h2 class="h-section">Quello che<br>ci contraddistingue.</h2>
      </div>
    </div>
    <div class="grid-1px grid-1px--3">
      <a class="card" href="contract.html">
        <div class="card__n">Metodo</div>
        <div class="card__t">Sette fasi, un referente</div>
        <div class="card__d">Rilievo, progettazione, produzione, fornitura, logistica, montaggio, post-vendita seguiti dallo stesso project manager.</div>
      </a>
      <a class="card" href="arredamento-su-misura.html">
        <div class="card__n">Officina</div>
        <div class="card__t">Fuori standard su disegno</div>
        <div class="card__d">Falegnameria e metalli interni, rete qualificata per lapidei, vetro e imbottiti. Nessun lotto minimo.</div>
      </a>
      <div class="card card--dark">
        <div class="card__n">Pubblica amministrazione</div>
        <div class="card__t">Abilitati MEPA</div>
        <div class="card__d">Scuole, biblioteche, uffici pubblici e strutture sanitarie: presenti su Acquisti in Rete PA con procedura gestita da noi.</div>
      </div>
    </div>
  </section>

  <section class="cta-band">
    <h2>Vuoi conoscerci<br>di persona?</h2>
    <div class="cta-band__actions">
      <a href="#" class="btn btn--red">Contattaci</a>
      <a href="#" class="btn btn--ghost">Parla con un tecnico</a>
    </div>
  </section>

</main>
```

- [ ] **Step 2: Verifica**

```bash
python3 -m http.server 8799 & sleep 1
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8799/chi-siamo.html
kill %1
```
Expected: `200`.

- [ ] **Step 3: Commit**

```bash
git add chi-siamo.html
git commit -m "$(cat <<'EOF'
Crea chi-siamo.html

Prima pagina reale per un link presente da subito in topbar/footer/nav
ma sempre stato href="#".

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Venfae1nDKBSDNYX5U6any
EOF
)"
```

---

## Task 12: Creare `brand-partner.html`

**Files:**
- Create: `brand-partner.html`

**Interfaces:**
- Consumes: filtro generico da Task 1 (`[data-settore]` dentro `[data-progetti]`), `.brands`/`.brand` CSS già esistente.
- Produces: pagina raggiungibile da footer "Risorse"; la card "Pedrali" linka a `brand-pedrali.html` (Task 13).

- [ ] **Step 1: Scrivere il file**

Stesso `<head>`/header/footer del Task 5 (`<title>Brand Partner — ARTES Contract</title>`, description `I brand partner con cui Artes lavora: mobili per ufficio, sedute contract, acustica, lapidei e outdoor. Ogni brand è collegato ai progetti in cui è stato impiegato.`, nessun `is-active` in nav — questa voce non è tra le 8 principali). Il `<main>`:

```html
<main>

  <section class="page-intro">
    <div class="breadcrumb">
      <a href="index.html">Home</a> / <strong>Brand Partner</strong>
    </div>
    <div class="page-intro__row">
      <div>
        <div class="eyebrow">40+ brand distribuiti</div>
        <h1 class="page-title">I brand<br><strong>con cui costruiamo.</strong></h1>
      </div>
      <p class="lead">Coordiniamo brand partner selezionati per ogni categoria di prodotto. Ogni brand è collegato ai progetti reali in cui è stato impiegato: filtra per categoria o apri una scheda per vedere dove è stato usato.</p>
    </div>
  </section>

  <section class="section">
    <div class="filtri" data-filtri role="group" aria-label="Filtra per categoria">
      <button type="button" class="filtro is-active" data-filtro="Tutti" aria-pressed="true">Tutti</button>
      <button type="button" class="filtro" data-filtro="Ufficio" aria-pressed="false">Ufficio</button>
      <button type="button" class="filtro" data-filtro="Contract" aria-pressed="false">Contract</button>
      <button type="button" class="filtro" data-filtro="Acustica" aria-pressed="false">Acustica</button>
      <button type="button" class="filtro" data-filtro="Pareti / pod" aria-pressed="false">Pareti / pod</button>
      <button type="button" class="filtro" data-filtro="Sedute" aria-pressed="false">Sedute</button>
      <button type="button" class="filtro" data-filtro="Retail" aria-pressed="false">Retail</button>
      <button type="button" class="filtro" data-filtro="Food" aria-pressed="false">Food</button>
      <button type="button" class="filtro" data-filtro="Outdoor" aria-pressed="false">Outdoor</button>
    </div>
    <div class="brands" data-progetti>
      <a class="brand" href="#" data-settore="Ufficio"><span class="brand__n">Frezza</span><span class="brand__c">Ufficio</span></a>
      <a class="brand" href="#" data-settore="Ufficio"><span class="brand__n">Colombini Office</span><span class="brand__c">Ufficio</span></a>
      <a class="brand" href="#" data-settore="Ufficio"><span class="brand__n">LAS</span><span class="brand__c">Ufficio</span></a>
      <a class="brand" href="#" data-settore="Ufficio"><span class="brand__n">Della Rovere</span><span class="brand__c">Ufficio</span></a>
      <a class="brand" href="#" data-settore="Ufficio"><span class="brand__n">Martex</span><span class="brand__c">Ufficio</span></a>
      <a class="brand" href="#" data-settore="Ufficio"><span class="brand__n">Estel</span><span class="brand__c">Ufficio</span></a>
      <a class="brand" href="brand-pedrali.html" data-settore="Contract"><span class="brand__n">Pedrali</span><span class="brand__c">Contract</span></a>
      <a class="brand" href="#" data-settore="Contract"><span class="brand__n">Gaber</span><span class="brand__c">Contract</span></a>
      <a class="brand" href="#" data-settore="Contract"><span class="brand__n">Et al.</span><span class="brand__c">Contract</span></a>
      <a class="brand" href="#" data-settore="Acustica"><span class="brand__n">Caimi</span><span class="brand__c">Acustica</span></a>
      <a class="brand" href="#" data-settore="Acustica"><span class="brand__n">Snowsound</span><span class="brand__c">Acustica</span></a>
      <a class="brand" href="#" data-settore="Pareti / pod"><span class="brand__n">Vetroin</span><span class="brand__c">Pareti / pod</span></a>
      <a class="brand" href="#" data-settore="Sedute"><span class="brand__n">Kastel</span><span class="brand__c">Sedute</span></a>
      <a class="brand" href="#" data-settore="Sedute"><span class="brand__n">Leyform</span><span class="brand__c">Sedute</span></a>
      <a class="brand" href="#" data-settore="Sedute"><span class="brand__n">SM Milani</span><span class="brand__c">Sedute</span></a>
      <a class="brand" href="#" data-settore="Retail"><span class="brand__n">Arken</span><span class="brand__c">Retail</span></a>
      <a class="brand" href="#" data-settore="Food"><span class="brand__n">Lainox</span><span class="brand__c">Food</span></a>
      <a class="brand" href="#" data-settore="Outdoor"><span class="brand__n">Nardi Outdoor</span><span class="brand__c">Outdoor</span></a>
      <p class="progetti__empty" data-empty hidden>Nessun brand pubblicato per questa categoria.</p>
    </div>
  </section>

  <section class="cta-band">
    <h2>Vuoi diventare<br>un brand partner?</h2>
    <div class="cta-band__actions">
      <a href="#" class="btn btn--red">Contattaci</a>
      <a href="#" class="btn btn--ghost">Scopri il processo contract</a>
    </div>
  </section>

</main>
```

- [ ] **Step 2: Verifica**

```bash
python3 -m http.server 8799 & sleep 1
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8799/brand-partner.html
kill %1
grep -c 'href="brand-pedrali.html"' brand-partner.html
```
Expected: `200`, poi `1`.

- [ ] **Step 3: Commit**

```bash
git add brand-partner.html
git commit -m "$(cat <<'EOF'
Crea brand-partner.html, archivio brand filtrabile per categoria

Riusa .brands/.brand da index.html e il filtro generico [data-settore]
generalizzato al Task 1. Solo la card Pedrali linka a una scheda brand
reale (brand-pedrali.html); le altre restano href="#" come i progetti
non ancora pubblicati.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Venfae1nDKBSDNYX5U6any
EOF
)"
```

---

## Task 13: Creare `brand-pedrali.html`

**Files:**
- Create: `brand-pedrali.html`

**Interfaces:**
- Consumes: layout `.scheda__specs`/`.correlate` già usato in `realizzazione.html`.
- Produces: pagina linkata da `brand-partner.html` (Task 12) e da `realizzazione.html` (Task 14) — dimostra il verso progetto → brand e brand → progetto.

- [ ] **Step 1: Scrivere il file**

Stesso `<head>`/header/footer del Task 5 (`<title>Pedrali — Brand Partner ARTES</title>`, description `Pedrali: sedute e sistemi per spazi contract. Brand partner Artes, impiegato in progetti hospitality e contract su misura.`, nessun `is-active` in nav). Il `<main>`:

```html
<main>

  <section class="scheda__intro">
    <div class="breadcrumb">
      <a href="index.html">Home</a> / <a href="brand-partner.html">Brand Partner</a> / <strong>Pedrali</strong>
    </div>
    <div class="scheda__title-row">
      <div>
        <div class="eyebrow">Contract — Sedute e sistemi operativi</div>
        <h1 class="scheda__title">Pedrali</h1>
      </div>
      <p class="lead">Sedute, poltroncine e sistemi per spazi contract e hospitality. Coordiniamo forniture Pedrali sui progetti che richiedono sedute certificate per uso pubblico, in coerenza con il capitolato dell'architetto.</p>
    </div>
  </section>

  <section class="scheda__media">
    <div class="scheda__hero">
      <div class="ph__note">[ foto principale — showroom / collezione, 2560×1440 ]</div>
    </div>
    <div class="gallery">
      <div class="ph ph--soft"><div class="ph__note">[ dettaglio seduta ]</div></div>
      <div class="ph ph--soft"><div class="ph__note">[ collezione outdoor ]</div></div>
      <div class="ph ph--soft"><div class="ph__note">[ sedia impilabile ]</div></div>
      <div class="ph ph--soft"><div class="ph__note">[ tavolo riunione ]</div></div>
    </div>
  </section>

  <section class="scheda__specs">
    <div class="specs">
      <div class="eyebrow">Scheda brand</div>
      <dl class="specs__list">
        <div class="spec"><dt>Categoria</dt><dd>Contract — Sedute e sistemi operativi</dd></div>
        <div class="spec"><dt>Ambiti Artes</dt><dd>Hospitality, Workspace, Food &amp; Beverage</dd></div>
        <div class="spec"><dt>Certificazioni</dt><dd>Sedute a norma per uso pubblico e contract</dd></div>
        <div class="spec"><dt>Fornitura Artes</dt><dd>Selezione, capitolato, coordinamento consegna e montaggio</dd></div>
      </dl>
    </div>
    <div class="finiture">
      <div class="eyebrow">Categorie prodotto</div>
      <div class="materiali">
        <div><div class="materiale__sw" style="background:#4A4741"></div><div class="materiale__n">Sedute operative</div><div class="materiale__c">Ufficio</div></div>
        <div><div class="materiale__sw" style="background:#8A7259"></div><div class="materiale__n">Poltroncine direzionali</div><div class="materiale__c">Ufficio</div></div>
        <div><div class="materiale__sw" style="background:#B7B4AE"></div><div class="materiale__n">Tavoli riunione</div><div class="materiale__c">Contract</div></div>
        <div><div class="materiale__sw" style="background:#D9CFC0"></div><div class="materiale__n">Collezioni outdoor</div><div class="materiale__c">Hospitality</div></div>
      </div>
    </div>
  </section>

  <section class="correlate">
    <div class="section__head">
      <h2>Progetti con Pedrali</h2>
      <a href="brand-partner.html" class="link-rule">Tutti i brand</a>
    </div>
    <div class="correlate__grid">
      <a href="realizzazione.html">
        <div class="ph"><div class="ph__note">[ foto — lounge hotel ]</div></div>
        <div class="correlate__meta">
          <div class="correlate__n">Boutique Hotel Aurea</div>
          <div class="correlate__s">Arredamento hotel</div>
        </div>
      </a>
    </div>
  </section>

  <section class="cta-band">
    <h2>Un progetto<br>con questo brand?</h2>
    <div class="cta-band__actions">
      <a href="#" class="btn btn--red">Richiedi un preventivo</a>
      <a href="#" class="btn btn--ghost">Parla con un tecnico</a>
    </div>
  </section>

</main>
```

- [ ] **Step 2: Verifica**

```bash
python3 -m http.server 8799 & sleep 1
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8799/brand-pedrali.html
kill %1
grep -c 'href="realizzazione.html"' brand-pedrali.html
```
Expected: `200`, poi `1`.

- [ ] **Step 3: Commit**

```bash
git add brand-pedrali.html
git commit -m "$(cat <<'EOF'
Crea brand-pedrali.html, prima scheda brand con collegamento bidirezionale

Riusa il layout di realizzazione.html (specs + griglia correlati), ma
la griglia correlati mostra i progetti che usano il brand invece di
altri brand — completa il verso brand → progetto.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Venfae1nDKBSDNYX5U6any
EOF
)"
```

---

## Task 14: Ricollegare `realizzazione.html` e `index.html` alle nuove pagine

**Files:**
- Modify: `realizzazione.html`
- Modify: `index.html`

**Interfaces:**
- Consumes: `arredamento-hotel.html` (Task 9), `brand-pedrali.html` (Task 13), `brand-partner.html` (Task 12), `arredamento-su-misura.html` (Task 10).

- [ ] **Step 1: Aggiornare `realizzazione.html`**

```bash
grep -n 'settori.html\|Hospitality\|>Pedrali<' realizzazione.html
```

Sostituire ciascuna occorrenza:

1. Breadcrumb — da:
```html
<a href="index.html">Home</a> / <a href="settori.html">Settori</a> / <a href="#">Hospitality</a> / <strong>Boutique Hotel Aurea</strong>
```
a:
```html
<a href="index.html">Home</a> / <a href="arredamento-hotel.html">Arredamento hotel</a> / <strong>Boutique Hotel Aurea</strong>
```

2. Eyebrow — da `<div class="eyebrow">Hospitality — Boutique hotel</div>` a `<div class="eyebrow">Arredamento hotel — Boutique hotel</div>`.

3. Spec settore — da `<div class="spec"><dt>Settore</dt><dd>Hospitality — Boutique hotel</dd></div>` a `<div class="spec"><dt>Settore</dt><dd>Arredamento hotel — Boutique hotel</dd></div>`.

4. Link brand — da `<a href="#">Pedrali</a>` (dentro `.brands-mini`) a `<a href="brand-pedrali.html">Pedrali</a>`.

5. Titolo correlate — da `<h2>Altre realizzazioni Hospitality</h2>` a `<h2>Altre realizzazioni Arredamento hotel</h2>`.

6. Le tre occorrenze di `<div class="correlate__s">Hospitality</div>` → `<div class="correlate__s">Arredamento hotel</div>`.

- [ ] **Step 2: Aggiornare `index.html` — sezione "02 — Settori" (mosaico)**

```bash
grep -n '02 — Settori\|Tutti i settori\|tile--tall\|class="tile"' index.html
```

Rimuovere il link "Tutti i settori" (righe `<a href="settori.html" class="link-rule">Tutti i settori</a>`): il `.section__head` diventa solo:
```html
<div class="section__head">
  <div>
    <div class="eyebrow">02 — Settori</div>
    <h2 class="h-section">Cinque macro-aree<br>di intervento.</h2>
  </div>
</div>
```

Aggiornare le 5 tile (href e titolo, testo descrittivo invariato):

```html
<a class="tile tile--tall" href="arredamento-ufficio.html">
  <div class="tile__texture"></div><div class="tile__scrim"></div>
  <div class="tile__body">
    <span class="tile__num">01</span>
    <div><h3>Arredamento ufficio</h3><p>Uffici direzionali, open space, coworking, sale conferenze, academy.</p></div>
  </div>
</a>
<a class="tile" href="arredo-negozi.html">
  <div class="tile__texture"></div><div class="tile__scrim"></div>
  <div class="tile__body">
    <span class="tile__num">02</span>
    <div><h3>Arredo negozi</h3><p>Boutique, showroom, concept store, farmacie, retail tech.</p></div>
  </div>
</a>
<a class="tile" href="arredamento-bar-ristoranti.html">
  <div class="tile__texture"></div><div class="tile__scrim"></div>
  <div class="tile__body">
    <span class="tile__num">03</span>
    <div><h3>Arredamento bar e ristoranti</h3><p>Bakery, pasticcerie, gastronomie, market gourmet.</p></div>
  </div>
</a>
<a class="tile" href="arredamento-alimentari-wine-food.html">
  <div class="tile__texture"></div><div class="tile__scrim"></div>
  <div class="tile__body">
    <span class="tile__num">04</span>
    <div><h3>Arredamento alimentari, wine e food</h3><p>Bar, bistrot, ristoranti, cocktail e wine bar, rooftop.</p></div>
  </div>
</a>
<a class="tile" href="arredamento-hotel.html">
  <div class="tile__texture"></div><div class="tile__scrim"></div>
  <div class="tile__body">
    <span class="tile__num">05</span>
    <div><h3>Arredamento hotel</h3><p>Hotel, resort, spa, lounge, aree breakfast.</p></div>
  </div>
</a>
```

Nota: il testo descrittivo di "Arredamento bar e ristoranti" cita bakery/pasticcerie/gastronomie perché eredita le micro-categorie dell'attuale Food Retail (mappatura confermata) — coerente con `arredamento-bar-ristoranti.html`.

- [ ] **Step 3: Aggiornare `index.html` — sezione "03 — Produzione" (link)**

Sostituire `<a href="produzione.html" class="link-rule">Dentro la produzione</a>` con `<a href="arredamento-su-misura.html" class="link-rule">Dentro la produzione</a>`.

- [ ] **Step 4: Aggiornare `index.html` — filtri e badge della griglia "04 — Realizzazioni"**

```bash
grep -n 'data-filtro=\|data-settore=\|progetto__settore' index.html
```

Sostituire i valori dei bottoni filtro:
```html
<button type="button" class="filtro" data-filtro="Workspace" aria-pressed="false">Workspace</button>
<button type="button" class="filtro" data-filtro="Retail" aria-pressed="false">Retail</button>
<button type="button" class="filtro" data-filtro="Food &amp; Beverage" aria-pressed="false">Food &amp; Beverage</button>
<button type="button" class="filtro" data-filtro="Food Retail" aria-pressed="false">Food Retail</button>
<button type="button" class="filtro" data-filtro="Hospitality" aria-pressed="false">Hospitality</button>
```
con:
```html
<button type="button" class="filtro" data-filtro="Arredamento ufficio" aria-pressed="false">Arredamento ufficio</button>
<button type="button" class="filtro" data-filtro="Arredo negozi" aria-pressed="false">Arredo negozi</button>
<button type="button" class="filtro" data-filtro="Arredamento bar e ristoranti" aria-pressed="false">Arredamento bar e ristoranti</button>
<button type="button" class="filtro" data-filtro="Arredamento alimentari, wine e food" aria-pressed="false">Arredamento alimentari, wine e food</button>
<button type="button" class="filtro" data-filtro="Arredamento hotel" aria-pressed="false">Arredamento hotel</button>
```

E ciascuna card `.progetto`, aggiornando `data-settore` e il testo in `.progetto__settore` secondo la mappatura (nome vecchio → nuovo):
`Hospitality`→`Arredamento hotel`, `Workspace`→`Arredamento ufficio` (×2, Headquarter Mediterranea e Academy Ferrara Group), `Food Retail`→`Arredamento bar e ristoranti` (Panificio Grani Antichi), `Retail`→`Arredo negozi` (Concept store Sila), `Food &amp; Beverage`→`Arredamento alimentari, wine e food` (Rooftop Bar Levante).

- [ ] **Step 5: Aggiornare `index.html` — "Tutti i brand"**

Sostituire `<a href="#" class="link-rule">Tutti i brand</a>` (nella sezione `05 — Brand partner`) con `<a href="brand-partner.html" class="link-rule">Tutti i brand</a>`, e la card Pedrali `<a class="brand" href="#"><span class="brand__n">Pedrali</span>...` con `<a class="brand" href="brand-pedrali.html"><span class="brand__n">Pedrali</span>...`.

- [ ] **Step 6: Verifica**

```bash
grep -c "settori.html\|produzione.html" realizzazione.html index.html
```
Expected: `0` per entrambi i file.

```bash
grep -c 'data-filtro="Hospitality"\|data-filtro="Workspace"\|data-filtro="Retail"\|data-filtro="Food Retail"\|data-filtro="Food &amp; Beverage"' index.html
```
Expected: `0`.

```bash
python3 -m http.server 8799 & sleep 1
curl -s -o /dev/null -w "index: %{http_code}\n" http://localhost:8799/index.html
curl -s -o /dev/null -w "realizzazione: %{http_code}\n" http://localhost:8799/realizzazione.html
kill %1
```
Expected: entrambi `200`.

- [ ] **Step 7: Commit**

```bash
git add index.html realizzazione.html
git commit -m "$(cat <<'EOF'
Ricollega index.html e realizzazione.html alla nuova struttura settori

Mosaico settori, filtri/badge della griglia realizzazioni e link
Produzione/Brand partner in home ripuntati alle nuove pagine;
breadcrumb, eyebrow e correlati di realizzazione.html aggiornati ad
Arredamento hotel; il link a Pedrali punta alla sua scheda brand.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Venfae1nDKBSDNYX5U6any
EOF
)"
```

---

## Task 15: Rimuovere `settori.html`, aggiornare `PAGES.md`, verifica finale

**Files:**
- Delete: `settori.html`
- Modify: `PAGES.md`

**Interfaces:** nessuna (chiusura).

- [ ] **Step 1: Verificare che nessun file rimandi ancora a `settori.html`**

```bash
grep -rln "settori.html" *.html
```
Expected: nessun output. Se compare qualcosa, risolverlo prima di procedere (i Task 3, 4, 14 dovrebbero averli già coperti tutti).

- [ ] **Step 2: Rimuovere il file**

```bash
git rm settori.html
```

- [ ] **Step 3: Aggiornare `PAGES.md`**

Nella sezione "1. Già esistenti", sostituire la riga:
```
| ✅ `settori.html` | Settori | |
```
con una nota che il contenuto è stato distribuito nelle 5 pagine, e aggiungere le pagine nuove alla tabella. Aggiungere in cima al file, subito dopo il titolo, un paragrafo:

```markdown
> **Nota (2026-09-04):** i 5 "settori" sono stati esplosi da sezioni
> ancorate di `settori.html` (rimosso) a pagine standalone di primo
> livello in nav. Vedi `docs/superpowers/specs/2026-09-04-menu-restructure-design.md`
> per il design completo.
```

Nella sezione "1. Già esistenti", aggiungere le righe per le pagine create in questo piano:

```
| ✅ `arredamento-ufficio.html` | Arredamento ufficio | ex sezione Workspace di settori.html |
| ✅ `arredo-negozi.html` | Arredo negozi | ex sezione Retail di settori.html |
| ✅ `arredamento-bar-ristoranti.html` | Arredamento bar e ristoranti | eredita micro-cat. Food Retail |
| ✅ `arredamento-alimentari-wine-food.html` | Arredamento alimentari, wine e food | eredita micro-cat. Food & Beverage |
| ✅ `arredamento-hotel.html` | Arredamento hotel | ex sezione Hospitality di settori.html |
| ✅ `arredamento-su-misura.html` | Arredamento su misura | rinomina di produzione.html |
| ✅ `chi-siamo.html` | Chi siamo | prima pagina reale, era href="#" |
| ✅ `brand-partner.html` | Brand Partner | archivio filtrabile per categoria |
| ✅ `brand-pedrali.html` | Pedrali (scheda brand) | primo esempio di collegamento bidirezionale brand↔progetto |
```

- [ ] **Step 4: Verifica finale completa**

```bash
test -f settori.html && echo "ERRORE" || echo "OK: settori.html rimosso"

python3 -m http.server 8799 & sleep 1
for f in index.html contract.html arredamento-ufficio.html arredo-negozi.html \
  arredamento-bar-ristoranti.html arredamento-alimentari-wine-food.html \
  arredamento-hotel.html arredamento-su-misura.html chi-siamo.html \
  brand-partner.html brand-pedrali.html realizzazione.html sistema-visivo.html; do
  code=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:8799/$f")
  echo "$f -> $code"
done
kill %1

grep -rln "settori.html\|produzione.html\|data-mega-trigger\|id=\"mega\"" *.html
```
Expected: tutte le 13 pagine `200`; l'ultimo grep senza output.

- [ ] **Step 5: Commit**

```bash
git add -A settori.html PAGES.md
git commit -m "$(cat <<'EOF'
Rimuove settori.html e aggiorna PAGES.md con la nuova mappa pagine

Il contenuto di settori.html è ora distribuito nelle 5 pagine di
settore standalone. PAGES.md documenta le 9 pagine create in questo
giro di lavoro.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Venfae1nDKBSDNYX5U6any
EOF
)"
```

---

## Riepilogo pagine dopo questo piano

**Create:** `arredamento-ufficio.html`, `arredo-negozi.html`, `arredamento-bar-ristoranti.html`, `arredamento-alimentari-wine-food.html`, `arredamento-hotel.html`, `arredamento-su-misura.html` (da rinomina), `chi-siamo.html`, `brand-partner.html`, `brand-pedrali.html`.

**Rimosse:** `settori.html`, `produzione.html` (rinominato).

**Ancora mancanti / fuori scope di questo piano** (restano `href="#"`, coerenti con `PAGES.md`): `contatti.html`, `richiedi-preventivo.html`, `area-progettisti.html`, `prodotti.html`, `architetti.html`, `mepa.html`, `cataloghi.html`, `privacy.html`, `cookie.html`, l'archivio cross-settore `realizzazioni.html`, e le altre 18 schede brand (solo Pedrali è reale in questo giro).
