# Versione mobile e tablet — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Aggiungere due breakpoint responsive (tablet ≤1024px, mobile ≤640px) sopra al layout desktop esistente del mockup ARTES Contract, con una navigazione mobile a hamburger/overlay, senza toccare il layout desktop (≥1025px).

**Architecture:** Sito statico piatto, nessuna build: le regole responsive vivono tutte in una nuova sezione 13 di `assets/css/artes.css` (due blocchi `@media`), la nav mobile in una nuova funzione JS in `assets/js/artes.js`, il markup nuovo (bottone hamburger + pannello `.mobile-nav`) è identico byte-per-byte e va aggiunto in fondo all'header di tutte le 13 pagine.

**Tech Stack:** HTML/CSS/JS puro, nessuna dipendenza. Verifica tramite `python3 -m http.server` + resize del browser alle larghezze 1024/768/640/375px (nessuna test suite: mockup statico).

**Spec:** `docs/superpowers/specs/2026-09-07-responsive-mobile-design.md`

## Global Constraints

- Due breakpoint: `@media (max-width: 1024px)` (tablet) e `@media (max-width: 640px)` (mobile). Il mobile eredita le regole tablet e le sovrascrive.
- `--pad`/`--gutter` vanno ridefinite nei media query (leva su tutte le regole che le usano): tablet `--pad: 28px; --gutter: 16px;`, mobile `--pad: 18px; --gutter: 10px;`.
- `body { min-width: 1320px; }` va neutralizzato con `body { min-width: 0; }` dentro `@media (max-width: 1024px)`.
- Il layout desktop (≥1025px, nessun media query attivo) non va toccato in nessun task: solo aggiunte dentro i blocchi `@media`, mai modifiche alle regole esistenti fuori da essi.
- Il markup nuovo per la nav mobile (bottone `.nav-toggle` + pannello `.mobile-nav`) è **identico su tutte le 13 pagine**, incluso il contenuto degli accordion — non riflette lo stato `is-active` della pagina corrente (fuori scope per questo giro, è un dettaglio cosmetico non essenziale al funzionamento).
- Le 13 pagine: `index.html`, `contract.html`, `arredamento-ufficio.html`, `arredo-negozi.html`, `arredamento-bar-ristoranti.html`, `arredamento-alimentari-wine-food.html`, `arredamento-hotel.html`, `arredamento-su-misura.html`, `chi-siamo.html`, `brand-partner.html`, `brand-pedrali.html`, `realizzazione.html`, `sistema-visivo.html`.

---

## Task 1: JS — nav mobile (hamburger + accordion)

**Files:**
- Modify: `assets/js/artes.js`

**Interfaces:**
- Consumes: markup con `.nav-toggle` (bottone), `#mobile-nav` (pannello, attributo `hidden` di default), `.mobile-nav__trigger` (bottoni accordion dentro il pannello, ciascuno con `aria-controls` che punta a un `.mobile-nav__panel` con lo stesso `id`) — questo markup viene aggiunto al Task 3, ma la funzione deve gestire con grazia la sua assenza (nessun errore se gli elementi non esistono ancora, stesso pattern già usato da `initDrops`/`initFiltri`).
- Produces: `initMobileNav()`, chiamata da `init()` insieme a `initDrops()` e `initFiltri()`.

- [ ] **Step 1: Aggiungere `initMobileNav()` a `assets/js/artes.js`**

Aggiungere questa funzione subito dopo `initFiltri()` (prima della funzione `init()`):

```js
  /* --- Nav mobile (hamburger + accordion) -------------------------------- */
  /* Sotto i 1024px la nav orizzontale e le tendine hover spariscono via CSS;
     questo pannello a schermo intero le sostituisce. Le 5 voci di settore
     diventano accordion: un pannello aperto alla volta. */

  function initMobileNav() {
    var toggle = document.querySelector('.nav-toggle');
    var panel = document.getElementById('mobile-nav');
    if (!toggle || !panel) return;

    function open() {
      panel.hidden = false;
      toggle.setAttribute('aria-expanded', 'true');
      toggle.classList.add('is-open');
      document.body.style.overflow = 'hidden';
    }

    function close() {
      panel.hidden = true;
      toggle.setAttribute('aria-expanded', 'false');
      toggle.classList.remove('is-open');
      document.body.style.overflow = '';
    }

    toggle.addEventListener('click', function () {
      if (panel.hidden) open(); else close();
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !panel.hidden) close();
    });

    var triggers = panel.querySelectorAll('.mobile-nav__trigger');
    triggers.forEach(function (trigger) {
      var sub = document.getElementById(trigger.getAttribute('aria-controls'));
      if (!sub) return;

      trigger.addEventListener('click', function () {
        var wasOpen = !sub.hidden;

        triggers.forEach(function (t) {
          var s = document.getElementById(t.getAttribute('aria-controls'));
          if (!s) return;
          s.hidden = true;
          t.setAttribute('aria-expanded', 'false');
        });

        if (!wasOpen) {
          sub.hidden = false;
          trigger.setAttribute('aria-expanded', 'true');
        }
      });
    });
  }
```

- [ ] **Step 2: Chiamare `initMobileNav()` da `init()`**

Nella funzione `init()` esistente, che oggi è:

```js
  function init() {
    initDrops();
    initFiltri();
  }
```

sostituirla con:

```js
  function init() {
    initDrops();
    initFiltri();
    initMobileNav();
  }
```

- [ ] **Step 3: Verifica sintattica**

Run: `node --check assets/js/artes.js`
Expected: nessun output (sintassi valida).

- [ ] **Step 4: Commit**

```bash
git add assets/js/artes.js
git commit -m "$(cat <<'EOF'
Aggiunge la nav mobile: pannello hamburger con accordion di settore

initMobileNav() apre/chiude un pannello a schermo intero (Escape lo
chiude, blocca lo scroll del body mentre è aperto) e gestisce i 5
accordion di settore, un pannello aperto alla volta. Non fa nulla se il
markup (.nav-toggle/#mobile-nav) non è ancora presente — verrà aggiunto
al Task 3.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Venfae1nDKBSDNYX5U6any
EOF
)"
```

---

## Task 2: CSS — meccanismo di base + header/nav responsive

**Files:**
- Modify: `assets/css/artes.css`

**Interfaces:**
- Consumes: nessuna.
- Produces: classi `.nav-toggle`, `.nav-toggle__bar`, `.mobile-nav`, `.mobile-nav__list`, `.mobile-nav__item`, `.mobile-nav__trigger`, `.mobile-nav__panel`, `.mobile-nav__divider`, usate dal markup del Task 3. Ridefinisce `--pad`/`--gutter` nei due media query, usate da moltissime regole esistenti nei task successivi.

- [ ] **Step 1: Aggiungere la nuova sezione 13 in fondo al file**

Alla fine di `assets/css/artes.css` (dopo l'ultima riga, `.settore__links { display: flex; gap: 28px; margin-top: 34px; }`), aggiungere:

```css

/* --- 13. Responsive ------------------------------------------------------ */
/* Due breakpoint sopra al layout desktop esistente (che resta invariato
   sopra i 1025px): tablet ≤1024px, mobile ≤640px. Il mobile eredita le
   regole tablet e le sovrascrive. Ogni blocco rispecchia l'ordine delle
   sezioni 1-12 sopra, per restare navigabile. */

/* Nav mobile — markup sempre presente nel DOM, nascosto via CSS sopra i
   1024px (dove restano attivi nav orizzontale e tendine hover). */
.nav-toggle {
  display: none;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 5px;
  width: 40px;
  height: 40px;
  padding: 0;
  border: 1px solid var(--line-btn);
  background: none;
  cursor: pointer;
  flex: 0 0 auto;
}
.nav-toggle__bar {
  display: block;
  width: 20px;
  height: 1px;
  background: var(--graphite);
  transition: transform .2s, opacity .2s;
}
.nav-toggle.is-open .nav-toggle__bar:nth-child(1) { transform: translateY(6px) rotate(45deg); }
.nav-toggle.is-open .nav-toggle__bar:nth-child(2) { opacity: 0; }
.nav-toggle.is-open .nav-toggle__bar:nth-child(3) { transform: translateY(-6px) rotate(-45deg); }

.mobile-nav[hidden] { display: none; }

@media (max-width: 1024px) {
  :root { --pad: 28px; --gutter: 16px; }
  body { min-width: 0; }

  /* --- 4. Header --- */
  .topbar, .nav { display: none; }
  .masthead { height: 64px; }
  .masthead__actions .btn-sm--outline { display: none; }
  .nav-toggle { display: flex; }

  .mobile-nav:not([hidden]) {
    display: block;
    position: fixed;
    top: 64px;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 70;
    background: var(--bone);
    overflow-y: auto;
    padding: 24px var(--pad) 40px;
  }
  .mobile-nav__list { display: flex; flex-direction: column; }
  .mobile-nav__list > a {
    padding: 16px 0;
    border-bottom: 1px solid var(--line-soft);
    font-size: 17px;
  }
  .mobile-nav__item { border-bottom: 1px solid var(--line-soft); }
  .mobile-nav__trigger {
    width: 100%;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px 0;
    border: 0;
    background: none;
    font: inherit;
    font-size: 17px;
    color: inherit;
    cursor: pointer;
  }
  .mobile-nav__trigger::after { content: '+'; font-family: var(--mono); font-size: 16px; color: var(--muted-3); }
  .mobile-nav__trigger[aria-expanded="true"]::after { content: '\2013'; }
  .mobile-nav__panel[hidden] { display: none; }
  .mobile-nav__panel { display: flex; flex-direction: column; padding: 0 0 16px; }
  .mobile-nav__panel a { padding: 10px 0; font-size: 15px; color: var(--muted-2); }
  .mobile-nav__panel a:first-child { color: var(--accent); font-family: var(--mono); font-size: 11.5px; letter-spacing: .12em; text-transform: uppercase; padding-bottom: 14px; }
  .mobile-nav__divider { height: 1px; background: var(--line-soft); margin: 16px 0; }
}

@media (max-width: 640px) {
  :root { --pad: 18px; --gutter: 10px; }
}
```

- [ ] **Step 2: Verifica**

```bash
grep -c "@media (max-width: 1024px)" assets/css/artes.css
grep -c "@media (max-width: 640px)" assets/css/artes.css
```
Expected: `1` per entrambi (a questo punto del piano; i task successivi aggiungono regole DENTRO questi stessi due blocchi, non nuovi blocchi — vedi nota nel Task 4).

```bash
node -e "require('fs').readFileSync('assets/css/artes.css','utf8')" 2>&1 | head -1
```
(sanity check che il file si legga; non è un parser CSS, solo verifica che l'edit non abbia rotto la codifica del file)

- [ ] **Step 3: Commit**

```bash
git add assets/css/artes.css
git commit -m "$(cat <<'EOF'
Aggiunge la sezione 13 Responsive: meccanismo di base + header/nav

Due breakpoint (tablet ≤1024px, mobile ≤640px) sopra al layout desktop
esistente, che resta invariato. --pad/--gutter ridefinite nei media
query. Nav orizzontale e tendine hover nascoste ≤1024px, sostituite dal
pannello .mobile-nav (markup al Task 3) con accordion sui 5 settori.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Venfae1nDKBSDNYX5U6any
EOF
)"
```

---

## Task 3: HTML — bottone hamburger + pannello mobile-nav su tutte le 13 pagine

**Files:**
- Modify: `index.html`, `contract.html`, `arredamento-ufficio.html`, `arredo-negozi.html`, `arredamento-bar-ristoranti.html`, `arredamento-alimentari-wine-food.html`, `arredamento-hotel.html`, `arredamento-su-misura.html`, `chi-siamo.html`, `brand-partner.html`, `brand-pedrali.html`, `realizzazione.html`, `sistema-visivo.html`

**Interfaces:**
- Consumes: classi CSS del Task 2 (`.nav-toggle`, `.mobile-nav`, ecc.), `initMobileNav()` del Task 1.
- Produces: markup che i task successivi non toccano più.

- [ ] **Step 1: Verificare che l'header sia identico su tutte le 13 pagine**

Prima di applicare lo script, confermare che il blocco header sia byte-identico ovunque (a parte `is-active`, che questo task non tocca):

```bash
for f in index.html contract.html arredamento-ufficio.html arredo-negozi.html \
  arredamento-bar-ristoranti.html arredamento-alimentari-wine-food.html \
  arredamento-hotel.html arredamento-su-misura.html chi-siamo.html \
  brand-partner.html brand-pedrali.html realizzazione.html sistema-visivo.html; do
  sed -n '/<div class="masthead__actions">/,/<\/header>/p' "$f" | sed 's/class="[a-z_-]* is-active"/class="X"/g; s/ is-active//g' | md5 
done
```
Expected: lo stesso hash MD5 su tutte le 13 righe (l'`is-active` viene normalizzato via `sed` prima dell'hash). Se un file diverge, fermarsi e riportarlo — non applicare lo script alla cieca su un header che non corrisponde a quanto assunto sotto.

- [ ] **Step 2: Scrivere ed eseguire lo script di inserimento**

Creare `/tmp/add_mobile_nav.py` (o nella scratchpad directory):

```python
import pathlib

OLD_TOGGLE_ANCHOR = '''    <div class="masthead__actions">
      <a href="#" class="btn-sm btn-sm--outline">Area Progettisti</a>
      <a href="#" class="btn-sm btn-sm--red">Contattaci</a>
    </div>
  </div>'''

NEW_TOGGLE_ANCHOR = '''    <div class="masthead__actions">
      <a href="#" class="btn-sm btn-sm--outline">Area Progettisti</a>
      <a href="#" class="btn-sm btn-sm--red">Contattaci</a>
    </div>
    <button type="button" class="nav-toggle" aria-label="Apri il menu" aria-expanded="false" aria-controls="mobile-nav">
      <span class="nav-toggle__bar"></span>
      <span class="nav-toggle__bar"></span>
      <span class="nav-toggle__bar"></span>
    </button>
  </div>'''

OLD_HEADER_CLOSE = '''  <div class="drop" id="drop-hotel" hidden>
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

MOBILE_NAV = '''  <div class="drop" id="drop-hotel" hidden>
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

  <div class="mobile-nav" id="mobile-nav" hidden>
    <nav class="mobile-nav__list" aria-label="Navigazione mobile">
      <a href="index.html">Home</a>
      <div class="mobile-nav__item">
        <button type="button" class="mobile-nav__trigger" aria-expanded="false" aria-controls="mnav-ufficio">Arredamento ufficio</button>
        <div class="mobile-nav__panel" id="mnav-ufficio" hidden>
          <a href="arredamento-ufficio.html">Vedi tutto</a>
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
      <div class="mobile-nav__item">
        <button type="button" class="mobile-nav__trigger" aria-expanded="false" aria-controls="mnav-negozi">Arredo negozi</button>
        <div class="mobile-nav__panel" id="mnav-negozi" hidden>
          <a href="arredo-negozi.html">Vedi tutto</a>
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
      <div class="mobile-nav__item">
        <button type="button" class="mobile-nav__trigger" aria-expanded="false" aria-controls="mnav-bar-ristoranti">Arredamento bar e ristoranti</button>
        <div class="mobile-nav__panel" id="mnav-bar-ristoranti" hidden>
          <a href="arredamento-bar-ristoranti.html">Vedi tutto</a>
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
      <div class="mobile-nav__item">
        <button type="button" class="mobile-nav__trigger" aria-expanded="false" aria-controls="mnav-alimentari">Arredamento alimentari, wine e food</button>
        <div class="mobile-nav__panel" id="mnav-alimentari" hidden>
          <a href="arredamento-alimentari-wine-food.html">Vedi tutto</a>
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
      <div class="mobile-nav__item">
        <button type="button" class="mobile-nav__trigger" aria-expanded="false" aria-controls="mnav-hotel">Arredamento hotel</button>
        <div class="mobile-nav__panel" id="mnav-hotel" hidden>
          <a href="arredamento-hotel.html">Vedi tutto</a>
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
      <a href="arredamento-su-misura.html">Arredamento su misura</a>
      <a href="contract.html">Arredo Contract</a>
      <a href="chi-siamo.html">Chi siamo</a>
      <div class="mobile-nav__divider"></div>
      <a href="#">Contatti</a>
      <a href="#" class="btn-sm btn-sm--outline">Area Progettisti</a>
    </nav>
  </div>
</header>'''

FILES = [
    'index.html', 'contract.html', 'arredamento-ufficio.html', 'arredo-negozi.html',
    'arredamento-bar-ristoranti.html', 'arredamento-alimentari-wine-food.html',
    'arredamento-hotel.html', 'arredamento-su-misura.html', 'chi-siamo.html',
    'brand-partner.html', 'brand-pedrali.html', 'realizzazione.html', 'sistema-visivo.html',
]

for name in FILES:
    p = pathlib.Path(name)
    text = p.read_text()

    if OLD_TOGGLE_ANCHOR not in text:
        raise SystemExit(f'{name}: ancora masthead__actions non trovata (verificare is-active sulla nav — questo blocco non deve contenerne)')
    text = text.replace(OLD_TOGGLE_ANCHOR, NEW_TOGGLE_ANCHOR, 1)

    if OLD_HEADER_CLOSE not in text:
        raise SystemExit(f'{name}: chiusura header (drop-hotel + </header>) non trovata')
    text = text.replace(OLD_HEADER_CLOSE, MOBILE_NAV, 1)

    p.write_text(text)
    print(f'{name}: nav mobile aggiunta')
```

Nota sulla verifica dello Step 1: l'ancora `OLD_TOGGLE_ANCHOR` (il blocco `masthead__actions`) non contiene mai `is-active` in nessuna delle 13 pagine — quella classe compare solo sui link della `<nav class="nav">`, mai sui bottoni "Area Progettisti"/"Contattaci". Lo stesso vale per `OLD_HEADER_CLOSE` (l'ultimo pannello `.drop`, che non ha mai `is-active`). Lo script quindi funziona identico su tutte le 13 pagine senza eccezioni, a differenza del Task 3 del piano precedente (restructure del menu) che doveva gestire due file con `is-active` dentro l'ancora.

- [ ] **Step 3: Eseguire lo script dalla root del progetto**

Run: `python3 /tmp/add_mobile_nav.py`
Expected output: tredici righe `<file>: nav mobile aggiunta`.

- [ ] **Step 4: Verifica**

```bash
grep -L "nav-toggle" index.html contract.html arredamento-ufficio.html arredo-negozi.html \
  arredamento-bar-ristoranti.html arredamento-alimentari-wine-food.html \
  arredamento-hotel.html arredamento-su-misura.html chi-siamo.html \
  brand-partner.html brand-pedrali.html realizzazione.html sistema-visivo.html
```
Expected: nessun output (tutti i 13 file contengono `nav-toggle`).

```bash
grep -c 'id="mobile-nav"' index.html contract.html arredamento-ufficio.html arredo-negozi.html \
  arredamento-bar-ristoranti.html arredamento-alimentari-wine-food.html \
  arredamento-hotel.html arredamento-su-misura.html chi-siamo.html \
  brand-partner.html brand-pedrali.html realizzazione.html sistema-visivo.html
```
Expected: `1` per ciascun file.

```bash
python3 -m http.server 8799 & sleep 1
for f in index.html contract.html arredamento-ufficio.html arredo-negozi.html \
  arredamento-bar-ristoranti.html arredamento-alimentari-wine-food.html \
  arredamento-hotel.html arredamento-su-misura.html chi-siamo.html \
  brand-partner.html brand-pedrali.html realizzazione.html sistema-visivo.html; do
  curl -s -o /dev/null -w "%{http_code} $f\n" "http://localhost:8799/$f"
done
kill %1
```
Expected: `200` per tutti e 13.

- [ ] **Step 5: Commit**

```bash
git add index.html contract.html arredamento-ufficio.html arredo-negozi.html \
  arredamento-bar-ristoranti.html arredamento-alimentari-wine-food.html \
  arredamento-hotel.html arredamento-su-misura.html chi-siamo.html \
  brand-partner.html brand-pedrali.html realizzazione.html sistema-visivo.html
git commit -m "$(cat <<'EOF'
Aggiunge il bottone hamburger e il pannello nav mobile a tutte le pagine

Markup identico su tutte le 13 pagine (nessuna variazione is-active):
bottone .nav-toggle nel masthead, pannello #mobile-nav in fondo
all'header con le 9 voci di nav e i 5 accordion di settore, ciascuno
con un link "Vedi tutto" alla pagina del settore oltre alle 8
micro-categorie già presenti nelle tendine desktop.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Venfae1nDKBSDNYX5U6any
EOF
)"
```

---

## Task 4: CSS — responsive Home (sezione 6)

**Files:**
- Modify: `assets/css/artes.css`

**Interfaces:**
- Consumes: nessuna.
- Produces: nessuna consumata da altri task (le regole home non sono riusate altrove).

**Nota per tutti i task CSS da qui in poi (4-7):** le regole vanno aggiunte **dentro i due blocchi `@media` già aperti dal Task 2** (`@media (max-width: 1024px) { ... }` e `@media (max-width: 640px) { ... }`), non in nuovi blocchi separati — altrimenti il file finirebbe con `@media` duplicati e la cascata diventerebbe più difficile da seguire. Il modo più semplice: aprire il file, trovare la chiusura `}` del blocco tablet (quella prima di `@media (max-width: 640px) {`) e aggiungere le nuove regole subito prima di quella `}`; stesso per il blocco mobile, prima della sua `}` finale di file.

- [ ] **Step 1: Aggiungere le regole Home al blocco tablet (`@media (max-width: 1024px)`)**

Subito prima della `}` che chiude il blocco tablet (quella che precede `@media (max-width: 640px) {`), aggiungere:

```css

  /* --- 6. Home --- */
  .hero { height: 560px; }
  .hero__title { font-size: 72px; }
  .hero__lead { font-size: 18px; }
  .h-section { font-size: 36px; }

  .metodo__grid { grid-template-columns: 1fr; gap: 40px; }
  .fasi { grid-template-columns: repeat(2, 1fr); }

  .tiles { grid-template-columns: 1fr; grid-template-rows: none; }
  .tile { min-height: 240px; }
  .tile--tall { grid-row: auto; }
  .tile h3 { font-size: 26px; }

  .produzione { grid-template-columns: 1fr; }
  .produzione__media { min-height: 400px; border-left: 0; border-top: 1px solid var(--line); }

  .progetti { grid-template-columns: repeat(2, 1fr); }
  .progetto--w2, .progetto--w4, .progetto--w6 { grid-column: span 1; }
  .filtri { flex-wrap: wrap; }

  .brands { grid-template-columns: repeat(3, 1fr); }

  .cta-duo { grid-template-columns: 1fr; }
  .cta-panel { min-height: 320px; padding: 60px var(--pad) !important; }
  .cta-panel h2 { font-size: 34px; }
```

- [ ] **Step 2: Aggiungere le regole Home al blocco mobile (`@media (max-width: 640px)`)**

Subito prima della `}` finale che chiude il blocco mobile (in fondo al file), aggiungere:

```css

  /* --- 6. Home --- */
  .hero { height: 460px; }
  .hero__title { font-size: 44px; }
  .hero__lead { font-size: 16px; }
  .hero__stats { grid-template-columns: repeat(2, 1fr); }
  .h-section { font-size: 28px; }

  .fasi { grid-template-columns: 1fr; }

  .tile h3 { font-size: 22px; }

  .lavorazioni { grid-template-columns: 1fr; }

  .progetti { grid-template-columns: 1fr; }

  .brands-section__head { flex-direction: column; align-items: flex-start; gap: 12px; }
  .brands { grid-template-columns: repeat(2, 1fr); }

  .cta-panel h2 { font-size: 26px; }
```

- [ ] **Step 3: Verifica**

```bash
python3 -m http.server 8799 & sleep 1
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8799/index.html
kill %1
node --check assets/js/artes.js
```
(il check JS è solo per confermare che non si sia toccato per errore un file sbagliato — questo task modifica solo il CSS)

```bash
grep -c "@media (max-width: 1024px)" assets/css/artes.css
grep -c "@media (max-width: 640px)" assets/css/artes.css
```
Expected: `1` per entrambi — se il numero è salito a 2, le regole sono finite in un nuovo blocco invece che dentro quello esistente: correggere prima di procedere.

- [ ] **Step 4: Commit**

```bash
git add assets/css/artes.css
git commit -m "$(cat <<'EOF'
Responsive: collassa i componenti Home (hero, metodo, mosaico, produzione, realizzazioni, brand, cta-duo)

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Venfae1nDKBSDNYX5U6any
EOF
)"
```

---

## Task 5: CSS — responsive Scheda realizzazione + Sistema visivo (sezioni 7-8)

**Files:**
- Modify: `assets/css/artes.css`

**Interfaces:** stesso meccanismo del Task 4 — aggiungere dentro i blocchi `@media` già esistenti, non crearne di nuovi.

- [ ] **Step 1: Blocco tablet — aggiungere prima della `}` che chiude `@media (max-width: 1024px)`**

```css

  /* --- 7. Scheda realizzazione --- */
  .scheda__title-row { grid-template-columns: 1fr; gap: 24px; padding: 40px 0 32px; }
  .scheda__title { font-size: 52px; }
  .gallery { grid-template-columns: repeat(2, 1fr); }
  .scheda__specs { grid-template-columns: 1fr; }
  .specs { border-right: 0; border-bottom: 1px solid var(--line); padding: 48px var(--pad); }
  .finiture { padding: 48px var(--pad); }
  .correlate__grid { grid-template-columns: repeat(2, 1fr); }
  .correlate h2 { font-size: 30px; }

  /* --- 8. Sistema visivo --- */
  .sistema__title { font-size: 44px; }
  .palette { grid-template-columns: repeat(3, 1fr); }
  .type-spec__name { font-size: 50px; }
```

- [ ] **Step 2: Blocco mobile — aggiungere prima della `}` finale**

```css

  /* --- 7. Scheda realizzazione --- */
  .scheda__title { font-size: 34px; }
  .materiali { grid-template-columns: repeat(2, 1fr); }
  .brands-mini { grid-template-columns: repeat(2, 1fr); }
  .correlate__grid { grid-template-columns: 1fr; }
  .correlate h2 { font-size: 24px; }
  .cta-band { flex-direction: column; align-items: flex-start; gap: 24px; }
  .cta-band h2 { font-size: 24px; }

  /* --- 8. Sistema visivo --- */
  .sistema__title { font-size: 30px; }
  .palette { grid-template-columns: repeat(2, 1fr); }
  .type-grid { grid-template-columns: 1fr; }
  .type-spec__name { font-size: 34px; }
  .regole { grid-template-columns: 1fr; }
```

- [ ] **Step 3: Verifica**

```bash
python3 -m http.server 8799 & sleep 1
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8799/realizzazione.html
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8799/sistema-visivo.html
kill %1
grep -c "@media (max-width: 1024px)" assets/css/artes.css
grep -c "@media (max-width: 640px)" assets/css/artes.css
```
Expected: entrambi `200`, entrambi i conteggi `1`.

- [ ] **Step 4: Commit**

```bash
git add assets/css/artes.css
git commit -m "$(cat <<'EOF'
Responsive: collassa Scheda realizzazione e Sistema visivo

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Venfae1nDKBSDNYX5U6any
EOF
)"
```

---

## Task 6: CSS — responsive Footer + Pagine interne (sezioni 9, 11)

**Files:**
- Modify: `assets/css/artes.css`

**Interfaces:** stesso meccanismo dei Task 4-5.

Questo task include l'unica ristrutturazione non meccanica del piano: `.fase-row` (la riga a 4 colonne fisse — numero/titolo/descrizione/output — usata dalla versione estesa delle 7 fasi contract) non collassa in modo uniforme come le griglie N-colonne, va ridisegnata a blocco verticale.

- [ ] **Step 1: Blocco tablet — aggiungere prima della `}` che chiude `@media (max-width: 1024px)`**

```css

  /* --- 9. Footer --- */
  .footer__grid { grid-template-columns: repeat(2, 1fr); gap: 32px; }

  /* --- 11. Pagine interne --- */
  .page-intro__row { grid-template-columns: 1fr; gap: 24px; padding: 40px 0 32px; }
  .page-title { font-size: 52px; }
  .page-band { height: 260px; }
  .grid-1px--3, .grid-1px--4 { grid-template-columns: repeat(2, 1fr); }
  .materiali--wide { grid-template-columns: repeat(4, 1fr); }

  .fase-row {
    grid-template-columns: 1fr;
    gap: 8px;
    padding: 24px 0;
  }
  .fase-row__out { text-align: left; }
  .fase-row__out dd + dt { margin-top: 10px; }
```

- [ ] **Step 2: Blocco mobile — aggiungere prima della `}` finale**

```css

  /* --- 9. Footer --- */
  .footer__grid { grid-template-columns: 1fr; gap: 28px; }
  .footer__bottom { flex-direction: column; align-items: flex-start; gap: 8px; }

  /* --- 11. Pagine interne --- */
  .page-title { font-size: 34px; }
  .page-band { height: 200px; }
  .grid-1px--2, .grid-1px--3, .grid-1px--4 { grid-template-columns: 1fr; }
  .materiali--wide { grid-template-columns: repeat(2, 1fr); }
```

- [ ] **Step 3: Verifica**

```bash
python3 -m http.server 8799 & sleep 1
for f in index.html contract.html arredamento-su-misura.html; do
  curl -s -o /dev/null -w "%{http_code} $f\n" "http://localhost:8799/$f"
done
kill %1
grep -c "@media (max-width: 1024px)" assets/css/artes.css
grep -c "@media (max-width: 640px)" assets/css/artes.css
```
Expected: tutti `200`, entrambi i conteggi `1`.

- [ ] **Step 4: Commit**

```bash
git add assets/css/artes.css
git commit -m "$(cat <<'EOF'
Responsive: collassa Footer e i pattern condivisi delle pagine interne

.fase-row (le 7 fasi contract in versione estesa, oggi una griglia a 4
colonne fisse) passa a blocco verticale sotto i 1024px invece di un
collasso N-col uniforme — è l'unico componente del piano che richiede
una ristrutturazione invece di un semplice cambio di
grid-template-columns.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Venfae1nDKBSDNYX5U6any
EOF
)"
```

---

## Task 7: CSS — responsive Indice settori (sezione 12)

**Files:**
- Modify: `assets/css/artes.css`

**Interfaces:** stesso meccanismo dei Task 4-6. Riguarda le 5 pagine settore (`arredamento-ufficio.html`, `arredo-negozi.html`, `arredamento-bar-ristoranti.html`, `arredamento-alimentari-wine-food.html`, `arredamento-hotel.html`), che condividono tutte le classi `.settore`/`.settore__text`/`.settore__media`/`.settore--flip`/`.ambiti`.

- [ ] **Step 1: Blocco tablet — aggiungere prima della `}` che chiude `@media (max-width: 1024px)`**

```css

  /* --- 12. Indice settori --- */
  .grid-1px--5 { grid-template-columns: repeat(2, 1fr); }

  .settore { grid-template-columns: 1fr; }
  .settore__text { padding: 56px var(--pad); }
  .settore--flip .settore__text { padding: 56px var(--pad); }
  .settore__media,
  .settore--flip .settore__media {
    order: -1;
    min-height: 320px;
    border-left: 0;
    border-right: 0;
    border-bottom: 1px solid var(--line);
  }
  .settore__inset { display: none; }
  .settore__t { font-size: 34px; }
```

- [ ] **Step 2: Blocco mobile — aggiungere prima della `}` finale**

```css

  /* --- 12. Indice settori --- */
  .grid-1px--5 { grid-template-columns: 1fr; }
  .settore__media,
  .settore--flip .settore__media { min-height: 260px; }
  .settore__t { font-size: 26px; }
  .ambiti { grid-template-columns: 1fr; }
```

- [ ] **Step 3: Verifica**

```bash
python3 -m http.server 8799 & sleep 1
for f in arredamento-ufficio.html arredo-negozi.html arredamento-bar-ristoranti.html \
  arredamento-alimentari-wine-food.html arredamento-hotel.html; do
  curl -s -o /dev/null -w "%{http_code} $f\n" "http://localhost:8799/$f"
done
kill %1
grep -c "@media (max-width: 1024px)" assets/css/artes.css
grep -c "@media (max-width: 640px)" assets/css/artes.css
```
Expected: tutti `200`, entrambi i conteggi `1`.

- [ ] **Step 4: Commit**

```bash
git add assets/css/artes.css
git commit -m "$(cat <<'EOF'
Responsive: collassa i blocchi settore nelle 5 pagine di categoria

L'immagine passa sempre sopra il testo (anche nelle righe .settore--flip,
il cui ordine alternato perde senso su una colonna sola), il riquadro
decorativo .settore__inset viene nascosto: a questa dimensione
sovrapporsi alla foto principale crea solo confusione.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Venfae1nDKBSDNYX5U6any
EOF
)"
```

---

## Task 8: Verifica finale — resize su tutte le 13 pagine, 4 larghezze

**Files:**
- Modify: `assets/css/artes.css` (solo fix puntuali dentro i blocchi `@media` esistenti, se la verifica trova problemi — nessuna nuova funzionalità)

**Interfaces:** nessuna prodotta — è l'ultimo task del piano.

Questo task è di verifica visiva, non di scrittura di codice nuovo: usa i tool del browser per controllare il risultato dei Task 1-7 e corregge solo quello che trova rotto, restando dentro i pattern già stabiliti (nessuna nuova classe, nessuna riprogettazione).

- [ ] **Step 1: Servire il sito e verificare ogni pagina a 4 larghezze**

Per ciascuna delle 13 pagine elencate nei Global Constraints, con `python3 -m http.server` attivo:
1. Aprire la pagina nel browser (via i tool `mcp__claude-in-chrome__*`, già usati in sessioni precedenti su questo stesso progetto).
2. Ridimensionare la finestra (tool `resize_window`, o `computer` con viewport equivalente) a 1024px, 768px, 640px, 375px di larghezza.
3. A ciascuna larghezza, controllare: nessuno scroll orizzontale del body, nessun testo tagliato/sovrapposto, nessuna griglia che esce dal contenitore, immagini che riempiono correttamente i loro slot.
4. A 1024px e 768px (tablet): il bottone hamburger deve essere visibile e funzionante — click apre il pannello, un tap su una delle 5 voci settore apre/chiude il relativo accordion (uno alla volta), Escape e un secondo click sull'hamburger chiudono il pannello.
5. A 640px e 375px (mobile): stesso controllo del punto 4, più verifica che `--pad`/`--gutter` più stretti diano margini coerenti (non troppo stretti, non troppo larghi).

- [ ] **Step 2: Correggere quello che si trova**

Per ogni problema trovato, il fix va dentro il blocco `@media` già esistente pertinente (tablet o mobile), riusando i pattern già presenti nei Task 4-7 (cambiare un `grid-template-columns`, ridurre un `font-size`, aggiungere un `flex-direction: column` dove serve). Non introdurre nuove classi HTML in questo task: se un problema richiede markup nuovo, è un gap del design che va segnalato invece di essere risolto con una soluzione improvvisata.

- [ ] **Step 3: Verifica finale di regressione sul desktop**

```bash
python3 -m http.server 8799 & sleep 1
for f in index.html contract.html arredamento-ufficio.html arredo-negozi.html \
  arredamento-bar-ristoranti.html arredamento-alimentari-wine-food.html \
  arredamento-hotel.html arredamento-su-misura.html chi-siamo.html \
  brand-partner.html brand-pedrali.html realizzazione.html sistema-visivo.html; do
  curl -s -o /dev/null -w "%{http_code} $f\n" "http://localhost:8799/$f"
done
kill %1
```
Expected: `200` per tutte e 13. Aprire almeno `index.html` a larghezza desktop (≥1320px) nel browser e confermare che sia visivamente identico a prima di questo piano — nessuna regressione fuori dai media query.

- [ ] **Step 4: Commit (solo se lo Step 2 ha prodotto modifiche)**

```bash
git add assets/css/artes.css
git commit -m "$(cat <<'EOF'
Responsive: fix puntuali trovati nella verifica su 13 pagine × 4 larghezze

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Venfae1nDKBSDNYX5U6any
EOF
)"
```

Se lo Step 2 non ha trovato nulla da correggere, non c'è nulla da committare — riportarlo esplicitamente nel report invece di creare un commit vuoto.

---

## Riepilogo

Al termine: `assets/css/artes.css` ha una nuova sezione 13 con due blocchi `@media` (tablet ≤1024px, mobile ≤640px) che coprono header/nav, home, scheda realizzazione, sistema visivo, footer, pagine interne e indice settori; `assets/js/artes.js` ha `initMobileNav()`; tutte le 13 pagine hanno il bottone hamburger e il pannello `.mobile-nav`. Il layout desktop (≥1025px) non viene toccato in nessun task.
