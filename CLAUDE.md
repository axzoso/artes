# ARTES Contract — contesto di progetto

Documento di riferimento per riprendere il lavoro senza rileggere tutto il
sito. Claude Code lo carica in automatico a ogni sessione.

**Storico delle sessioni:** [docs/diario-sessioni.md](docs/diario-sessioni.md)
— cosa è stato chiesto, cosa è stato fatto e perché, sessione per sessione.
Leggere la voce più recente (in alto) per sapere cosa è rimasto aperto.
A fine sessione: aggiungere una voce al diario e aggiornare `docs/wp-stato-dev3.md`
(e questo file se cambia qualcosa di strutturale).

---

## 1. Cos'è questo progetto e fonte di verità

Sito **ARTES Arredamenti** (arredi contract su misura, Rende CS), sviluppato in
WordPress su staging **`https://dev3.minimalstudiodev.it`** a partire dal mockup
statico approvato.

- **Fonte di verità (design e contenuti):** **`artes-sito-rev2/`** (revisione
  del titolare con le modifiche del cliente, in sola lettura; pubblicata su
  GitHub Pages in `https://axzoso.github.io/artes/artes-sito-rev2/`). Ogni
  pagina WordPress si confronta con la sua omologa in `artes-sito-rev2/`.
- **Mockup in radice (`*.html`, `assets/`):** versione precedente, pubblicata su
  `https://axzoso.github.io/artes/` (branch `main`, root). **Resta congelata**
  finché l'utente non approva esplicitamente la sostituzione con `artes-sito-rev2/`
  e il push.
- **Push solo su richiesta esplicita:** ogni push su `main` aggiorna la preview
  GitHub Pages vista dal cliente. Se la preview live non riflette `main`,
  verificare quale branch pubblica Pages (`Settings → Pages`, oppure rapido:
  `curl -s "https://api.github.com/repos/axzoso/artes/actions/runs?per_page=3"`).
- **Preview locale della rev2:** `py -3 -m http.server 8765 --directory artes-sito-rev2`
  (poi `localhost:8765`).

---

## 2. Struttura del repository

```
artes-sito-rev2/       >>> FONTE DI VERITÀ <<< 49 pagine HTML, CSS/JS, 179 immagini
  assets/css/artes.css foglio unico rev2 (sorgente del CSS portato su WP)
  assets/js/artes.js   tendina, menu mobile, slider produzione, filtri, lightbox
wp/artes-core/         plugin WordPress installato su dev3 (PHP, CSS generato, JS)
tools/rev2/            pipeline Node per portare e collaudare la rev2 su dev3
tools/                 script generici MCP/WP/CDP e backup (out/ ignorata da Git)
docs/                  piano rev2, stato dev3, regole conversione, diario (vedi §9)
*.html, assets/        mockup statico precedente (congelato in radice; usa shell.js)
```

In `artes-sito-rev2/` header e footer sono scritti direttamente in ciascuna
pagina HTML (senza `shell.js`); su WordPress diventano veri site part del Theme
Builder Elementor (`557` e `971`).

---

## 3. I 5 settori e il modello dati

Nomenclatura e ordine definitivi della **rev2**: **"e" al posto di "&"** ovunque
(nav, footer, `<title>`, breadcrumb, eyebrow, mosaico Home, filtri). Rispetto al
vecchio mockup i settori `03` e `04` sono in ordine **bar e ristoranti prima di
negozi food** (i nomi file restano invariati).

| # | Nome (rev2) | File rev2 | Slug `settore` | Pagina WP | Ambiti principali |
|---|---|---|---|---|---|
| 01 | Arredo uffici e workspace | `arredamento-ufficio.html` | `uffici` (ID 3) | `144` | uffici, open space, coworking, sale meeting, scuole, enti pubblici |
| 02 | Arredo negozi e retail | `arredo-negozi.html` | `retail` (ID 4) | `145` | boutique, showroom, farmacie, store sportivi (no food) |
| 03 | Arredo bar e ristoranti | `arredamento-bar-ristoranti.html` | `bar-ristoranti` (ID 6) | `147` | bar, bistrot, pizzerie, cocktail bar, gelaterie |
| 04 | Arredo negozi food | `arredo-negozi-food.html` | `food` (ID 5) | `146` | panetterie, pasticcerie, gastronomie, macellerie, market |
| 05 | Arredo hotel e hospitality | `arredamento-hotel.html` | `hospitality` (ID 7) | `148` | hotel, resort, spa, lounge, residence, studentati |

- **CPT `realizzazione`**: **20 realizzazioni** dalla rev2 (ordinate via
  `menu_order`, 171 foto in galleria). I 4 progetti fittizi del vecchio mockup
  (Boutique Hotel Aurea, Resort Capo Bianco, Spa Terme Luigiane, Business Hotel
  Fera) sono nel **cestino** su dev3. Rinomine gestite con redirect 301:
  `bbc-tarsia` → `bcc-tarsia`, `quotidiano` → `il-quotidiano`.
- **CPT `brand`**: **18 brand** dalla rev2 (con scheda completa e 8 relazioni
  brand ↔ progetti). **Mottura** non è nella rev2 ed è nel **cestino** su dev3.
- **Tassonomia `categoria` (a due livelli con `settore`)**: 26 termini associati
  ciascuno a un settore (term meta `settore`, `ordine_pagina`, `ordine_filtro`).
  Le pagine settore elencano tutte le 26 categorie con le relative tipologie e
  linkano all'archivio filtrato solo quelle con progetti; l'archivio
  realizzazioni espone **22 filtri categoria** sotto le 5 tab settore (URL
  `?settore=…&categoria=…`).
- **Tassonomia `categoria_brand`**: 8 termini (`Ufficio`, `Contract`, `Acustica`,
  `Pareti e pod` / `pareti-e-pod`, `Sedute`, `Retail`, `Food`, `Outdoor`).
- **Immagini e `alt`**: in WordPress l'`alt` vive sull'allegato. Quando lo
  stesso file ha testi alternativi diversi in punti diversi (galleria, card,
  brand, pagine statiche), si usano copie fisiche con `_artes_src` distinto.

---

## 4. Header e footer (rev2)

- **Topbar** (sopra l'header, visibile da `1181px` in su): `Chi siamo`, `Blog`,
  `Contatti` e selettore lingua **`IT / EN`** (da collegare nell'ultima fase
  WPML).
- **Header a riga unica** (da `1181px` in su; fra `1181` e `1365px` il prefisso
  `Arredo` delle voci settore si nasconde con `.nav__pre` per tenere tutto su una
  riga): logo + 7 link diretti (i 5 settori, `Su misura`, `Contract`) +
  **`Realizzazioni` con tendina semplice** (`.drop--simple`) dei 5 settori e link
  all'archivio completo. **Nessun pulsante** "Area progettisti" o "Contattaci"
  in header. Sotto `1180px` subentra il pannello hamburger `.mobile-nav` con
  accordion per Realizzazioni.
- **Footer** (sfondo antracite `#393E42`, logo bianco `artes-logo-bianco.png`):
  colonne navigazione (voce `Contatti` → `/contatti/`) + colonna contatti
  `#contatti` con CTA `Richiedi un preventivo` → `/contatti/` e dati reali di
  Artes srl:
  - `Via A. Nervoso 1, 87036 Rende (CS)`
  - `T +39 0984 462039` (`tel:`) · `info@artessrl.it`
  - `© 2026 Artes srl` · `P.IVA 02343330789`
  - Barra inferiore con link cliccabili **`Privacy · Cookie · MEPA`**
    (`/privacy-policy/`, `/cookie-policy/`, `/arredamento-ufficio/`).

---

## 5. Convenzioni di stile (rev2)

Definite in `artes-sito-rev2/assets/css/artes.css` (sezioni finali di revisione
cromatica e `rev02`/`rev02.2`/`rev03`/`rev05`):

- **Palette**:
  - fondo primario `--bone: #FFFFFF`; alternanze chiare `--surface-soft: #f5f5f5`,
    `--surface-mid: #e9e9e9`, CTA/riquadri chiari `#efefef`;
  - fasce scure (footer, sezione brand, hero Contract): **antracite**
    `--antracite` / `--sand: #393E42` (approvato da Artes il 10/11/2026) e
    `--antracite-deep` / `--night: #2F3438` (al posto del vecchio `#111`, che
    resta `--graphite: #111111` per il testo);
  - rosso `--accent: #D71920`: usato sia come accento sia come **fasce rosse
    piene** (CTA di fine pagina `.cta-band--accent`, pannello CTA Home, barra
    numeri e fasce di conversione del Contract);
  - "meno fasce nere": le vecchie CTA/tessere scure passano a `#efefef` o sfondo
    bianco con filetto superiore rosso (`border-top: 2px solid var(--accent)`).
- **Tipografia**: `Archivo` (`--display`), `Instrument Sans` (`--body`),
  `IBM Plex Mono` (`--mono`) da Google Fonts (invariati).
- **Griglia e ritmo**: margini laterali `--pad: 40px` (`28px` ≤1180, `20px`
  ≤780, `18px` ≤640), `--gutter: 20px`; separazioni soprattutto di spazio (gap
  `18–34px`, niente `gap: 1px` su sfondo scuro); layout fluido (`min-width: 0`),
  contenuto centrato su `1600px` oltre `1600px`; breakpoint `≤1365`, `≤1180`,
  `≤1024`, `≤780`, `≤640`, `≤460px`.
- **Eccezioni consentite dalla rev2** (superano i vecchi divieti rigidi):
  - **ombre** su tendina del menu (`.drop--simple`) e immagine in lightbox
    (`.lightbox__img`);
  - **angoli arrotondati** sui pallini rossi delle fasi del metodo
    (`.step::before`, `.steps-dots button`, `border-radius: 50%`);
  - **hover con movimento**: leggero zoom delle foto (`scale(1.025)` / `1.03`),
    spostamento freccia categorie (`.categorie__go`) e lieve lift su card/step
    del Contract (`translateY`);
  - **fasce rosse piene** come sfondo per conversione e numeri chiave.
- **Numerazione e riuso**: numerazione a livello di sezione (`01 — Il metodo`);
  riuso delle classi esistenti della rev2 prima di introdurne di nuove.
- **Limiti noti della rev2** (ereditati fedelmente): `.contract-scope__card`
  deborda di `20px` a `768px` (nessun overflow a `1440`, `1024`, `390`);
  nessuna `favicon` né in rev2 né su dev3; in `Chi siamo` 6 segnaposto team
  ("Nome Cognome").

---

## 6. Pagine, moduli e pagine fuori rev2

Su `dev3` sono pubblicate **52 pagine** in design rev2 (le 49 della rev2 +
Privacy, Cookie e **Contatti `152`**):

- **Home (`376`)**: hero, metodo in 6 fasi (con pallini rossi e carosello
  mobile), mosaico 5 settori `01–05`, slider produzione, realizzazioni dinamiche
  (`artes_progetti_home_rev2`) con filtri, fascia brand dinamica
  (`artes_archivio_brand`), pannello CTA.
- **5 pagine settore (`144–148`)**: approccio, categorie con tipologie e link
  filtrati, cosa facciamo per voi, elenco commesse, **5 FAQ native**
  (`e-accordion` con `FAQPage` JSON-LD), brand partner del settore, CTA.
- **Pagine istituzionali**: Arredo su misura (`149`), Contract (`150`, 10 blocchi
  con indice interno sticky), Chi siamo (`151`).
- **Archivi e schede CPT**: archivio Realizzazioni (`1050`, tab settori + 22
  filtri categoria + conteggio), archivio Brand Partner (`1051`, filtri per
  categoria), 20 schede Realizzazione (`1040`, riga parola chiave, fatti,
  galleria asimmetrica 5 foto + lightbox, descrizione, CTA rossa, 3 correlate),
  18 schede Brand (`1049`, 4 righe fisse, "Come lavoriamo con X", "Dove lo
  usiamo", foto opzionale, progetti collegati).
- **Contatti (`152`, `/contatti/`)**: **pubblicata in grafica rev2** (`2026-11-23`,
  `_artes_rev2 = 1`, SEO `_artes_seo_*`) con dati reali Artes srl e modulo nativo
  Elementor Pro **`e-form`** (`to: info@artessrl.it`, `reply-to: [email]`, 5
  settori rev2 con `"e"`, 7 motivi con preselezione `?motivo=`/`?settore=`,
  allegati `.pdf/.dwg/.dxf/.jpg/.jpeg/.png` max 3×10 MB `attach`, privacy
  `/privacy-policy/`). Collegata da tutti i pulsanti CTA e le voci di menu
  Contatti già presenti nella rev2 (**15 documenti**, **38** link di sorgente /
  **314** occorrenze HTML live, `0` `#contatti` residui): Header `557`, Footer
  `971`, 9 pagine statiche (`376, 144–151`) e 4 template CPT (`1040, 1049,
  1050, 1051`). Le 3 sezioni modulo storiche restano preservate in libreria come
  template **`[Riserva]`** (`539–541`; vedi `tools/riserva-moduli/README.md`).
- **Privacy (`3`) e Cookie policy (`493`)**: pubblicate in design rev2 con i
  dati reali di Artes srl (0 segnaposto `[...]`).
- **5 pagine fuori rev2 aggiornate in grafica rev2 ma lasciate in bozza**
  (`draft`, HTTP 404 pubblico, `_artes_rev2 = 1`): Area progettisti (`153`),
  Richiedi preventivo (`154`, con `e-form` completo rev2), Prodotti (`471`),
  MEPA (`472`), Cataloghi PDF (`491`).
- **Link `#`, `#contatti` e CTA `mailto:` della rev2**: risolti centralmente in
  **`tools/rev2/mappa-link.json`** (`#contatti` e CTA `mailto:` senza `@` nel
  testo → `/contatti/`, Blog → `/realizzazioni/`, Prodotti e Cataloghi PDF →
  `/brand-partner/`, Area progettisti → `/contract/#interlocutori`, MEPA →
  `/arredamento-ufficio/`, Diventa partner di produzione → `/contatti/`; link
  diretti `mailto:info@artessrl.it` con indirizzo esplicito e `tel:` preservati).
  Modificare solo quel file e rigenerare i documenti (`aggiorna-link-contatti.js`).

---

## 7. Architettura WordPress (`dev3`) e pipeline `tools/rev2/`

Staging **`https://dev3.minimalstudiodev.it`**: WordPress 7.1.5, Hello
Elementor, Elementor 4 + Elementor Pro, JetEngine, WPML (`it` predefinita,
`en-gb`), Novamira.

- **Connettori MCP** (`~/.claude.json`, ambito locale del progetto):
  `artes-elementor` e `novamira-dev3-minimalstud`. Non compaiono come tool
  nativi: si usano gli script di `tools/` (`mcp.ps1`, `php.ps1`, `jerun.ps1`,
  `tools/rev2/mcp-client.js`). **Mai scrivere credenziali nel repo** e non
  modificare `~/.claude.json`.
- **Theme Builder Elementor (site part veri)**: Header rev2 **`557`**, Footer
  rev2 **`971`**, Single Realizzazione **`1040`**, Single Brand **`1049`**,
  Archive Realizzazioni **`1050`**, Archive Brand **`1051`**. Nessun header o
  footer duplicato dentro le pagine.
- **Plugin `wp/artes-core/` (`0.9.0`)** (installato come plugin vero; deploy con
  `tools/install-plugin.ps1` → `tools/out/artes-core.zip`, giro rapido asset con
  `node tools/rev2/push-asset.js`):
  - **Modalità rev2 globale (`artes_rev2_globale = '1'`)**: attiva su tutto il
    frontend (incluse pagine `404` e ricerca `/?s=…`, con `hello_elementor_page_title`
    e CSS inline minimale scoped a `body.rev2.error404` / `body.rev2.search`),
    `false` in `is_admin()`, kill-switch reversibile a `'0'`.
  - **CSS rev2 generato** (`artes-rev2.css`): non si modifica mai a mano. Si
    rigenera con `node tools/rev2/port-css.js` a partire da
    `artes-sito-rev2/assets/css/artes.css` + `tools/rev2/css/reset.css` +
    `tools/rev2/css/adattamenti.css` (CSS morto rev2 escluso). In
    `adattamenti.css` usare `:where()` per restare sotto la rev2 e sopra
    Elementor; dopo ogni modifica rilanciare la parità su tutte le pagine. Il
    CSS personalizzato del kit Elementor deve restare **vuoto**.
  - **JS rev2** (`artes-rev2.js`): tendina, menu mobile, voce attiva, lightbox,
    filtri a due livelli realizzazioni, filtri brand, slider produzione, filtri
    progetti Home, pallini metodo mobile.
  - **Dati e cicli**: shortcode rev2 e filtri `elementor/query/*`
    (`artes_progetti_home_rev2`, `artes_archivio_brand`, `artes_altre_realizzazioni`,
    `artes_progetti_brand`, ecc.), `window.ArtesRev2Dati`.
  - **SEO on-page (senza plugin esterni)**: `<title>` via
    `pre_get_document_title` e `<meta name="description">` in `wp_head` (con
    soppressione duplicati Hello Elementor); meta `_artes_seo_title` /
    `_artes_seo_description` sulle 11 pagine statiche/legali (registrati WPML
    modo 2), opzione `artes_seo_archives` sui 2 archivi CPT, formule dinamiche
    con override opzionale su 20 realizzazioni e 18 brand.
  - **Redirect 301**: vecchi slug di `settore` e `categoria_brand` verso gli
    archivi filtrati, rinomine `bbc-tarsia`/`quotidiano`, paginazione
    `/realizzazioni/page/N/` e `/brand-partner/page/N/` verso l'archivio
    canonico.
- **Pipeline di conversione e verifica (`tools/rev2/`)**:
  - `port-css.js` (CSS), `html2elementor.js` + `costruisci.js` (pagine/header/footer),
    `costruisci-modello.js` (template in `tools/rev2/modelli/` con `data-dyn`/`data-loop`),
    `fase5-pagine.js`, `fase6-pagine.js`, `fase7-seo.js`, `fase8-collaudo.js`,
    `fase9-chiusura.js` (chiusura e rollback), `pagine-bozze-rev2.js` (6 pagine
    bozza in rev2 / pubblicazione `152`), `aggiorna-link-contatti.js`
    (rigenerazione link `/contatti/` sui 15 documenti rev2).
  - **Collaudo**: usare sempre CDP (`tools/cdp.js` / `tools/rev2/cdp-session.js`)
    per mobile (`390px`), menu aperto e interazioni; verificare sempre `0px` di
    scroll orizzontale (eccezione nota `contract @768`). Suite di controllo:
    `verifica-dati.js`, `parita-tutte.js`, `fase5-pagine.js --parita`,
    `salute-pagine.js`, `verifica-seo.js`, `collaudo-redirect.js`,
    `controllo-link.js`.
  - Dopo ogni scrittura Elementor su documenti pubblicati: **ripubblicare e
    svuotare le cache di Elementor** (`tools/flush.php`).
- **Backup e vincoli di sicurezza**:
  - Backup completo scaricato dal titolare il 2026-11-19 + snapshot JSON in
    `tools/out/backup-2026-11-19/` + tag git `pre-rev2` + revisioni/backup in
    `tools/out/rev2/fase*-revisions.json`, `fase7-backup.json`,
    `fase9-backup.json`, `bozze-rev2-revisions.json` e
    `link-contatti-revisions.json`.
  - **Non fare senza conferma esplicita:** installare nuovi plugin · cancellare
    definitivamente contenuti o allegati/file media (irreversibile) · modificare
    impostazioni globali del sito (`noindex`, permalink, ecc.) · modificare
    `~/.claude.json` · eseguire `git commit` o `git push` · sostituire il mockup
    in radice.

---

## 8. Stato attuale e ordine finale

- **Completate (Fasi 0–9, 2026-11-19/23):** adeguamento completo di `dev3` alla
  rev2 (versione IT) chiuso e verificato live con **0 fallimenti**:
  - plugin **`artes-core 0.9.0`** attivo con **`artes_rev2_globale = '1'`**
    (Header **`557`** e Footer **`971`** su `include/general`, supporto 404 e
    ricerca rev2);
  - Kit Elementor `7` allineato (`sand #393E42`, `night #2F3438`), **`358`**
    classi globali attive (`336` post-Fase 9 + `22` stub `rev2-*` per pagine
    bozza e moduli `e-form`; `[Riserva]` `539–541` intatti);
  - **52 pagine pubblicate** in grafica rev2 (incluse **Contatti `152`** con
    modulo `e-form` collegata da **38** link su 15 documenti = **314** istanze
    live, `0` `#contatti` residui) + **5 bozze** (`153, 154, 471, 472, 491`)
    aggiornate in grafica rev2 ma lasciate in `draft` (HTTP 404 pubblico);
  - vecchi template (`199, 200, 138, 448, 213, 447`) e pagina di prova (`542`)
    nel **cestino reversibile**; menu `filtri-realizzazioni` e `filtri-brand`
    eliminati (backup completo in `tools/out/rev2/fase9-backup.json`);
  - **`256` allegati media** intatti, di cui **`31` orfani** (`10,654 MB` /
    `19,464 MB` su disco) censiti in `tools/out/rev2/fase9-allegati-orfani.json`
    in attesa di conferma esplicita prima di qualsiasi eliminazione.
- **In attesa dell'utente:** controllo manuale del sito IT su `dev3`, eventuali
  ritocchi, conferma per i 31 allegati orfani / `blog_public` (`1`) /
  sostituzione mockup in radice + `git commit` e `git push`.
- **Ultimo passo finale (dopo il controllo manuale):** traduzione in inglese
  con **WPML** e collegamento del selettore **`IT / EN`** nella topbar
  (`[artes_lingue]` preservato nel plugin).

---

## 9. Dove sta la documentazione

| File | Contenuto |
|---|---|
| `CLAUDE.md` | questo file: contesto, regole rev2, architettura e vincoli |
| `docs/diario-sessioni.md` | storico cronologico delle sessioni e punti aperti |
| `docs/piano-adeguamento-rev2.md` | piano di adeguamento alla rev2, decisioni (§8) e avanzamento (§10) |
| `docs/rev2-regole-di-conversione.md` | regole di conversione HTML → Elementor V4 e cose imparate |
| `docs/wp-stato-dev3.md` | **inventario live di dev3** (ID, CPT, template, plugin, registro) |
| `tools/README.md` | guida agli script `tools/` e alla pipeline `tools/rev2/` |
| `docs/wp-migration.md` | storico del piano iniziale di migrazione WordPress |
| `PAGES.md` | mappa storica del mockup in radice (pre-rev2) |
| `docs/superpowers/specs/` e `plans/` | spec e piani delle ristrutturazioni storiche |
