# Diario delle sessioni

Registro delle sessioni di lavoro con Claude Code: cosa è stato chiesto,
cosa è stato fatto, quali decisioni sono state prese e cosa resta aperto.
Voce più recente in alto. A fine sessione si aggiunge una voce nuova e si
aggiorna `CLAUDE.md` se è cambiato qualcosa di strutturale.

Il contesto stabile del progetto (architettura, regole, settori) sta in
[`CLAUDE.md`](../CLAUDE.md): qui solo la cronaca.

---

## 2026-11-24 (quarta parte) — Testi alternativi e indirizzi in inglese

**Richiesta**: tradurre i testi alternativi delle immagini e rendere inglesi anche gli indirizzi della versione EN.

**Fatto**
- *Testi alternativi*: in Elementor V4 l'alt si legge dall'allegato a ogni visualizzazione, quindi niente allegati duplicati: meta `_artes_alt_en` su
  ogni allegato (252, 249 testi distinti, tradotti in `tools/rev2/traduzioni/en-alt.json`; didascalie delle gallerie col glossario dei dati:
  "Royal Hotel, hotel in Cosenza: photo 1") e filtro nel plugin che in inglese lo restituisce al posto dell'alt italiano. Campo
  "Testo alternativo (EN)" in Media → allegato. Script `tools/rev2/wpml-trad-alt.js` (`--piano`, `--esegui`, `--rollback`).
- *Indirizzi*: tabella unica `tools/rev2/wpml-url-en.js` usata dagli script dei dati e delle pagine. Pagine: `/en/office-workspace-furniture/`,
  `/en/retail-store-furniture/`, `/en/food-store-furniture/`, `/en/bar-restaurant-furniture/`, `/en/hotel-hospitality-furniture/`,
  `/en/bespoke-furniture/`, `/en/about-us/`, `/en/contact/` (Contract, Privacy e Cookie invariati). Basi: `/en/projects/` e `/en/brand-partners/`
  (traduzione degli slug dei tipi di contenuto di WPML, `tools/rev2/wpml-slug-cpt.js`). Termini EN con slug inglesi (`offices-workspace`,
  `fashion-and-sport`…) al posto di `…-en`, quindi anche i filtri: `/en/projects/?settore=offices-workspace&categoria=public-bodies-and-institutions`.
  I vecchi indirizzi inglesi rimandano ai nuovi con 301.
- *Plugin `artes-core` 0.10.3*: alt per lingua; 301 dell'archivio EN con la base italiana; slug originale dei termini letto dal database
  (`get_term` viene "riaggiustato" da WPML sulla lingua corrente); redirect delle categorie EN con lo slug EN del settore.

**Difetti trovati e corretti (c'erano già prima di questa sessione)**: in inglese i link filtrati delle pagine settore usavano `?settore=uffici`
(il filtro mostrava 20 progetti invece di 6) e il filtro per categoria non funzionava mai (il JavaScript riceveva per ogni categoria il codice
italiano del settore). Ora: settore 6/6, categoria 1/1, uguale all'italiano.

**Verifica**: EN 52 pagine × 2 larghezze 104/104 in salute, 137 link interni distinti 0 rotti, nessun testo italiano residuo (restano solo "Della
Rovere", nome di brand, e il titolo del feed RSS "Realizzazioni", etichetta del tipo di contenuto). IT invariato: 9 pagine statiche, 2 archivi e
Arpacal in parità (Δ 0), SEO 51/51, dati 1.137/1.137, redirect 17/17, archivi 20/18.

**Aperto**: etichetta del tipo di contenuto nel feed RSS inglese; `fase8-collaudo.js` non conosce la versione EN; 5 bozze non tradotte (restano bozze).

---

## 2026-11-24 (terza parte) — Traduzione EN pubblicata su dev3

**Richiesta**: l'utente ha completato la configurazione guidata di WPML (`setup_complete = 1`, traduzione automatica spenta, URL `/en/`); procedere.

**Fatto**
- `wpml-trad-dati.js --esegui`: 39 termini, 20 realizzazioni, 18 brand, 8 relazioni, 62 stringhe EN. Controllato **subito** che il sito italiano non avesse doppioni
  (archivi IT 20/18, EN 20/18): ora WPML filtra per lingua.
- `wpml-trad-pagine.js --esegui`: 6 template EN (header 1285, footer 1286, singolo realizzazione 1287, singolo brand 1288, archivi 1289/1290) e 12 pagine EN
  (Home 1291 collegata come pagina iniziale EN, settori 1292-1296, Su misura, Contract 1298, Chi siamo, Contatti, Privacy, Cookie). Ogni indirizzo `/en/…` usa
  la propria pagina e i propri template (verificato dagli ID nel markup).
- **Selettore lingua automatico di WPML in fondo alle pagine spento** (attivato dalla procedura guidata: bandierine senza alt, elemento che la rev2 non ha; il sito
  usa `[artes_lingue]` nella topbar). Backup dell'opzione: `tools/out/rev2/wpml-ls-backup.b64`.
- `verifica-dati.js` reso consapevole della lingua (conta solo gli articoli italiani; le copie e le relazioni EN non sono "in più").

**Verifica**: IT invariato — 9 pagine statiche, 2 archivi, Arpacal e Pedrali in parità con la rev2 (Δ 0), SEO 51/51, dati 1.137/1.137, redirect 17/17.
EN — 52 pagine × 2 larghezze 104/104 in salute (HTTP 200, un H1, nessun errore, nessuno scroll orizzontale), link interni 0 rotti, titoli/testi/menu/modulo in inglese;
gli unici link senza `/en/` sono quelli del selettore verso la pagina italiana corrispondente.

**Aperto**
- **221 testi alternativi delle immagini ancora in italiano** nelle pagine EN (alt degli allegati della libreria: "Uffici open space", "Ruffolo Group, uffici aziendali a
  Rende (CS): foto 1"…). Non previsti dagli script né dai dataset dell'altro agente: servono le traduzioni degli allegati (WPML Media) o un filtro nel plugin.
- Indirizzi EN con slug italiani (`/en/arredamento-ufficio/`, `/en/realizzazioni/…`): scelta dello script (slug identici); slug inglesi sono possibili ma da decidere.
- `fase8-collaudo.js` non conosce ancora la versione EN né le modifiche del 23/11.

---

## 2026-11-24 (seconda parte) — Traduzione EN con WPML: ripresa, tentativo, annullamento

**Richiesta**: riprendere il lavoro di un altro agente (Gemini/Antigravity, fermato dai limiti d'uso) che doveva verificare che non ci fossero testi
italiani "cablati" che WPML interpreterebbe male, e poi tradurre il sito in inglese.

**Stato trovato** (non era nel diario): audit i18n fatto (`tools/out/rev2/wpml-audit-codice.json`: 25 problemi, 11 bloccanti) e **risolto nel codice**
(plugin `artes-core` 0.10.0 con textdomain, `languages/` `.po/.mo` en_GB, `wpml-config.xml`, testi UI/ARIA del JS letti da `window.ArtesRev2Dati.i18n`,
nessun filtro che dipenda da parole italiane, `wpml_object_id` nelle query; su dev3 i file sono identici al locale, verificato con md5).
`wpml-prepara.js --esegui` già eseguito (Translate Everything spento, 9 template registrati in lingua `it`, configurazione dei widget V4, pacchetto en_GB,
template IT 557/1040/1049/1051 ricostruiti con gli shortcode traducibili). Dataset EN pronti in `tools/rev2/traduzioni/`. Script delle pagine
`wpml-trad-pagine.js` **non eseguibile**: errore di sintassi (apici inversi in un commento PHP dentro `String.raw`) e chiamata sbagliata a `compilaTutte`
(restituisce `{ risultati }`, non un array). Corretti entrambi; le tre verifiche offline danno 0 errori (dati 100/100 link EN, pagine 908 stringhe + 82
invarianti, 211 link riscritti, 0 condizioni sui template EN).

**Esecuzione e problema**: `wpml-trad-dati.js --esegui` (39 termini, 20 realizzazioni, 18 brand, 8 relazioni, 62 stringhe EN) e `wpml-trad-pagine.js --esegui`
(6 template + 12 pagine EN) sono andati a buon fine, ma il collaudo live ha mostrato che **WPML non filtra i contenuti per lingua**: `/en/contract/`
serviva la pagina italiana 150, le schede EN usavano i template italiani, e soprattutto **il sito italiano mostrava 40 realizzazioni e 36 brand** (ogni
articolo doppio). Causa: in WPML `setup_complete = false` (la procedura guidata iniziale di WPML non è mai stata completata): così WPML assegna lingue e
calcola i link ma non filtra le query.

**Annullato** con i rollback degli script (`wpml-trad-pagine.js --rollback`, `wpml-trad-dati.js --rollback`): 18 post EN, 39 termini, 38 articoli, 8
relazioni e 58 stringhe rimossi. Sito italiano verificato com'era: archivi 20/18, Home 6 card senza doppioni, dati 1.099/1.099, redirect 17/17, SEO 51/51,
condizioni dei template intatte. Restano attivi (innocui) i passi di `wpml-prepara.js`.

**Per ripartire**: completare la configurazione di WPML dal pannello (WPML → Configurazione: lingue it + en-gb, URL in cartella `/en/`, nessuna traduzione
automatica, chiave del sito se richiesta), poi verificare che WPML filtri (`setup_complete = true`) e rilanciare, in quest'ordine,
`wpml-trad-dati.js --esegui`, `wpml-trad-pagine.js --esegui` e il collaudo (archivi 20/18 in entrambe le lingue, `/en/…` con contenuti e template EN, nessun
testo italiano: controllo `tools/out/rev2/_residui-it.js`).

---

## 2026-11-24 — Fix allineamento pulsante hamburger mobile nell'header su `dev3`

**Richiesta**

Spostare il pulsante hamburger (`≡`) dell'header mobile tutto a destra sul margine destro dell'header anziché vicino al logo `ARTES ARREDAMENTI`, senza alterare il layout desktop (`>1180 px`).

**Diagnosi e fix**

- **Causa**: in `artes-sito-rev2/assets/css/artes.css`, `.masthead` è un contenitore flex (`align-items: center; gap: 28px`, senza `justify-content: space-between`). Su desktop (`>1180 px`) è `.nav` (`flex: 1 1 auto`) a distribuire lo spazio tra logo e bordo destro; sotto i `1180 px` `.nav` passa a `display: none` e i soli due figli visibili restano `.masthead__logo` e `.nav-toggle` (entrambi `flex: 0 0 auto; margin-left: 0`), quindi l'hamburger finiva subito dopo il logo a distanza `28 px` (`left: 170 px` @1180/1024, `left: 162 px` @768/390).
- **Intervento** (`tools/rev2/css/adattamenti.css` → rigenerato `wp/artes-core/artes-rev2.css` con `node tools/rev2/port-css.js`, deployato con `tools/install-plugin.ps1`, plugin `0.9.0`, ZIP rimosso e cache svuotate; annotata la divergenza intenzionale in `tools/rev2/collaudo-header.js`):
  - Aggiunte nel blocco `@media (max-width: 1180px)` di `adattamenti.css`: `body.rev2 .elementor .masthead { justify-content: space-between; }` e `body.rev2 .elementor .masthead .nav-toggle { margin-left: auto; }`.
- **Verifica live e ispezione visiva su `dev3`** (`tools/out/rev2/fix-burger/`):
  - Screenshot ispezionati a `390`, `768`, `1024`, `1180`, `1440` px (chiuso + menu aperto a `390` e `1024` px): logo a sinistra (`left: 20` ≤780 px / `28` 781–1180 px), hamburger (40×40) allineato esattamente al margine destro meno `--pad` (`390`: `330–370`; `768`: `708–748`; `1024`: `956–996`; `1180`: `1112–1152`), `×` aperto nella stessa posizione, `scrollX = 0 px`.
  - Desktop `1440 px` invariato (`logo 40–154`, `nav 240–1400`, `.nav-toggle` nascosto; `parita.js` `/` @`1440`: `7406/7406 px`, `Δ 0 px`, `0,813%` diff, 0% in header); `salute-pagine.js` `/` (`1440, 390`): **2/2 OK**.

---

## 2026-11-23 (quinta parte) — Controllo generale di dev3 (sola lettura)

**Richiesta**: controllo generale del passaggio alla rev2 per trovare pezzi in sospeso o parti rotte. Nessuna scrittura su dev3.

**Esito**: nessuna parte rotta. Parità 49 pagine × 4 larghezze **196/196** (altezze identiche, contenuti 49/49, unico scroll orizzontale `contract@768` già presente nella rev2);
salute **102/102** + Contatti, 404 e ricerca 6/6; link **51 pagine, 71 indirizzi, 0 rotti**; redirect **17/17**; SEO **51/51**; dati **1.099/1.099**; nessun `debug.log`,
plugin 0.9.0, CSS del kit vuoto. Le differenze di `fase8-collaudo.js` sono **volute** (griglia filtrata della Home, filtri vuoti nascosti, Contatti pubblicata): lo script di
collaudo va aggiornato (si ferma sullo scenario "Student housing e co-living", pulsante ora nascosto, e conta `/contatti/` come bozza).

**In sospeso trovato**: modulo Contatti senza anti-spam e senza SMTP (invio con `mail()` del server di staging); nome del campo allegati scritto come
`allegati&#x5B;&#x5D;` (con più file potrebbe arrivarne solo uno: da provare con un invio reale); `?settore=` sul modulo accetta il nome del settore, non lo slug (nessun link
lo usa); staging indicizzabile (`blog_public` = 1, sitemap pubblica); 31 allegati orfani, mockup in radice, 18 file modificati non committati, versione inglese: come da voce precedente.

---

## 2026-11-23 (quarta parte) — Fix griglia filtrata Home e occultamento dinamico filtri vuoti su `dev3`

**Richiesta**

Risolvere 2 comportamenti segnalati nel controllo manuale su `dev3`:
1. In Home (`04 — REALIZZAZIONI`, *"Spazi realizzati."*), filtrando per `UFFICI E WORKSPACE`, la card *"Il Quotidiano"* (`progetto--w6`) restava a tutta larghezza su una seconda riga invece di affiancarsi a *"Ruffolo Group"*, mentre in vista `TUTTI` deve restare a tutta larghezza.
2. Nascondere dinamicamente da tutte le barre filtri del sito le categorie/settori senza realizzazioni (o brand) associate, così che ricompaiano automaticamente se in futuro vengono aggiunti contenuti.

**Fatto**

- **Griglia filtrata Home (`tools/rev2/css/adattamenti.css` → `wp/artes-core/artes-rev2.css`, `wp/artes-core/artes-rev2.js`)**:
  - In `initHomeProgetti()` aggiunte le classi di stato `.progetti--filtrati` (attiva con qualunque filtro diverso da `Tutti`) e `.progetti--filtrati-3plus` (se ≥3 card visibili).
  - In vista `Tutti` le classi vengono rimosse e il mosaico asimmetrico originale (`w4`, `w2`, `w6`) resta intatto (`"Il Quotidiano"` full-width `1360 px`, `parita.js` a `Δ 0 px`).
  - Con filtro attivo: su desktop (`>1024 px`) `span 3` (`min-height: 460 px`, 2 colonne uguali da `666 px` fianco a fianco; `span 2` / `380 px` se ≥3 card); su tablet (`≤1024 px`) 2 colonne regolari (`span 1`); su mobile (`≤780 px`) colonna singola (`470 px`).
- **Occultamento dinamico filtri vuoti (`wp/artes-core/artes-rev2.js`, `tools/rev2/css/adattamenti.css`)**:
  - Aggiunto `body.rev2 .elementor .filtro[hidden], .settori-tabs__btn[hidden], .filtri--categorie[hidden] { display: none !important; }` così gli stili di Elementor non possono riaprire i bottoni nascosti.
  - **`initArchivio()` (`/realizzazioni/`)**: conta dinamicamente le card per settore e `(settore, categoria)` e nasconde tab/bottoni a 0 realizzazioni (e il gruppo `.filtri--categorie` se un settore non ha categorie popolate). Gestisce con ripiego grazioso gli URL diretti verso filtri vuoti o inesistenti (`?settore=hospitality&categoria=student-housing-e-co-living` → `Tutte` del settore; `?settore=inesistente` → `Tutti i settori`). **8 filtri categoria vuoti nascosti**: `uffici` → *Sanità* (1); `retail` → *Salute, bellezza e lusso*, *Cultura e tempo libero*, *Negozi specializzati* (3); `bar-ristoranti` → nessuno (0); `food` → *Gastronomia*, *Vino e bevande* (2); `hospitality` → *Student housing e co-living*, *Sale ricevimenti e location per eventi* (2).
  - **`initHomeProgetti()` (Home sez. 04)** e **`initFiltriBrand()` (`/brand-partner/`)**: nascondono dinamicamente eventuali settori/categorie con 0 elementi (attualmente 0 nascosti perché tutti i 5 settori Home e tutte le 8 categorie brand hanno ≥1 elemento; verificate anche le 5 pagine settore `144–148`: nessuna barra filtri presente).
- **Deploy e verifica live su `dev3`** (`port-css.js`, `node --check`, `tools/install-plugin.ps1`, ZIP rimosso e cache svuotate; annotate le divergenze intenzionali in `tools/rev2/collaudo-archivi.js` e `tools/rev2/collaudo-fase5.js`):
  - Screenshot ispezionati visivamente in `tools/out/rev2/fix-filtri-grid/`: Home `Tutti` (`Il Quotidiano` `1360×460` full-width) e ritorno da filtro OK; Home `Uffici e workspace` (`Ruffolo Group` e `Il Quotidiano` affiancate `666×460` a `y=4201`, mobile `@390` singola colonna `scrollX=0`); `/realizzazioni/` tutti e 5 i settori `@1440` + `uffici`/`retail` `@390` (ogni filtro visibile cliccato produce `≥1` card, 0 filtri vuoti, URL diretti con ripiego OK); `/brand-partner/` tutti gli 8 filtri (`≥1` brand ciascuno).
  - `salute-pagine.js` su `/`, `/realizzazioni/`, `/brand-partner/` (`1440, 390`): **6/6 OK** (`0` errori console/overflow); `parita.js` Home (`Tutti` @`1440` e @`390`): **`Δ 0 px`**, `0,705%` / `1,304%` pixel diff, `scrollX = 0 px`.

---

## 2026-11-23 (terza parte) — Fix header sticky e barra indice `/contract/` su `dev3`

**Richiesta**

Risolvere il comportamento anomalo segnalato nel controllo manuale su `/contract/`: la barra indice (`01 PROCESSO · 02 PERIMETRO · 03 COLLABORAZIONE · 04 IMPEGNI`) rimaneva fluttuante a mezz'aria (~116 px dal bordo superiore) durante lo scroll, senza ancorarsi a nulla sopra di sé.

**Diagnosi e fix**

- **Causa principale**: nella rev2 `<header class="header">` è figlio diretto di `<body>` (`position: sticky; top: 0; z-index: 60`), mentre in WordPress Elementor lo incapsula dentro `.elementor-location-header` (alto quanto l'header: `111 px` >1180 px, `77 px` ≤1180 px, `position: static`). Allo scroll l'intero header usciva dallo schermo, lasciando `.contract-index` (figlia di `.page-root`) appesa a `top: 116 px` / `82 px` nel vuoto.
- **Disallineamenti secondari corretti**:
  - `artes.css` impostava `.contract-index` a `top: 116 px` (>1024 px) e `82 px` (≤1024 px), creando comunque uno spiraglio di `5 px` / `39 px` / `5 px` rispetto all'altezza reale dell'header (`111 px` >1180 px, `77 px` ≤1180 px);
  - `scroll-margin-top: 0` sulle sezioni con ancora (`#processo`, `#perimetro`, `#interlocutori`, `#garanzie`) faceva finire occhiello e titolo sotto header + barra indice al click;
  - `body.admin-bar` non era gestito (`32 px` >782 px, `46 px` 601–782 px, `0` ≤600 px dove `#wpadminbar` è `absolute`); `overflow-x: clip` su `body.rev2` evita conflitti con `position: sticky`.
- **Intervento** (`tools/rev2/css/adattamenti.css` → rigenerato `wp/artes-core/artes-rev2.css` con `node tools/rev2/port-css.js`, deployato con `tools/install-plugin.ps1`, versione `0.9.0`, ZIP rimosso e cache svuotate):
  - Reso sticky `body.rev2:not(.elementor-editor-active) .elementor-location-header` (`top: var(--artes-admin-bar); z-index: 60; background-color: #fff`), con `.header` interno `position: relative; top: auto`.
  - Allineati via variabili `--artes-admin-bar` / `--artes-header-h` (`111px`/`77px`) / `--artes-contract-index-h` (`52px`/`64px`): `.contract-index`, `.split__aside`, `.contract-page .split__aside`, `.rev2-form-intro`, `.mobile-nav:not([hidden])` (con `admin-bar`) e `scroll-margin-top` su `.page-root [id]` e `.contract-page [id]`.
- **Verifica live su `dev3`**:
  - Screenshot scrollati (`y = 0, 700, 1600`, click sulle 4 ancore, `admin-bar` simulata `32/46/0 px`, Home `/`, Chi siamo `/chi-siamo/`, Contatti `/contatti/`) salvati e ispezionati visivamente in `tools/out/rev2/fix-sticky/`: `gap = 0 px` tra header e `.contract-index` su tutti i breakpoint (`1440, 1180, 1024, 768, 390`), atterraggio pulito su tutte e 4 le ancore (`clearance` `109–120 px` @1440, `72–79 px` @390), `.split__aside` e `.rev2-form-intro` sticky OK.
  - `collaudo-header.js`: tutto in parità (`tendina-1440 0%`, `menu-mobile-1024 0%`, `menu-mobile-390 0.144%`, `8/8` voci attive); `parita.js` (`contract`, `home`, `chi-siamo` @`1440/390`): **6/6 a `Δ 0 px` e `scrollX = 0 px`**; `salute-pagine.js` (10 pagine × 2): **20/20 OK**.

---

## 2026-11-23 (seconda parte) — 6 pagine bozza aggiornate in rev2, pubblicazione Contatti e collegamento link

**Richiesta**

Aggiornare in grafica **rev2** tutte e 6 le pagine rimaste in bozza dalla versione precedente (`152` Contatti, `153` Area progettisti, `154` Richiedi preventivo, `471` Prodotti, `472` MEPA, `491` Cataloghi PDF), pubblicando **solo Contatti (`152`)** (le altre 5 restano in `draft`), e collegare a `/contatti/` tutti i pulsanti CTA e le voci di menu già presenti nella rev2 su `dev3`. Nessun `git commit` né `git push`, WPML/EN invariato.

**Fatto**

- *Stile CSS rev2 per form `e-form` e pagine bozza* (`tools/rev2/css/adattamenti.css` → `wp/artes-core/artes-rev2.css` rigenerato con `port-css.js`, deployato con `tools/install-plugin.ps1`):
  - Regole strettamente scoped (`body.rev2 .elementor` + `.rev2-surface-white`, `.rev2-grid-4`, `.rev2-form-wrap`, `.rev2-form-*`, `.rev2-contact-dl`), 0 impatto sulle 51 pagine già pubblicate, palette rev2 (`#393E42`/`#2F3438`/`#efefef`/`#D71920`), 0 ombre, 0 border-radius, responsive `1440/390`.
  - **2 fix CSS reali trovati in ispezione visiva live degli screenshot `/contatti/` @1440/@390 e corretti subito**:
    1. `body.rev2 .e-con { display: revert; }` (`(0,2,1)`) sovrascriveva `display: none` di Elementor sui box esito (`Esito ok` / `Esito errore` entrambi visibili al caricamento): aggiunte regole esplicite su `.rev2-form:not(.form-state-success) .rev2-form-ok` / `:not(.form-state-error) .rev2-form-err` (`display: none`), ripristino `display: block` sugli stati attivi e `text-align: left`.
    2. Elementor Pro Atomic V4 rende il `<form>` con `.e-form-base` / `.rev2-form` (senza classe `.e-form`): sostituito `.e-form` con `.rev2-form` su tutte le regole dentro `.rev2-form-wrap` (incluso `input[type="file"]` / `::file-selector-button` `SCEGLI FILE`, `:hover`, `:focus`, `::placeholder`, submit).
- *Ricostruzione 6 pagine bozza in rev2 e pubblicazione della sola Contatti `152`* (`tools/rev2/pagine-bozze-rev2.js --esegui` + `--stato`, backup in `tools/out/rev2/bozze-rev2-revisions.json`):
  - Create nel Kit `7` le **`22` classi stub `rev2-*`** mancanti (`336 → 358` classi globali, reversibili con `--rollback`).
  - **`152` Contatti (`/contatti/`) — `publish` (HTTP 200)**: dati reali Artes srl (`Via A. Nervoso 1, 87036 Rende (CS)`, `+39 0984 462039`, `info@artessrl.it`, P.IVA `02343330789`), modulo nativo Elementor Pro **`e-form`** (`to: info@artessrl.it`, `reply-to: [email]`, 7 motivi allineati ad `artes-core.php`, 5 settori rev2 con `"e"`, allegati `.pdf/.dwg/.dxf/.jpg/.jpeg/.png` max 3×10 MB `attach`, privacy `/privacy-policy/`), `_artes_rev2 = 1`, SEO `_artes_seo_*`.
  - **5 bozze aggiornate in grafica rev2 ma lasciate in `draft` (HTTP 404 pubblico, `_artes_rev2 = 1`, SEO OK, `_elementor_data` rev2 salvato)**: `154` Richiedi preventivo (`e-form` completo + fix `apos=4`), `153` Area progettisti (immagini rev2 `#417`, `#1081`; rimossi riferimenti Aurea/fittizi), `471` Prodotti, `472` MEPA, `491` Cataloghi PDF.
- *Collegamento di tutti i pulsanti e voci di menu Contatti verso `/contatti/`*:
  - Aggiornati `tools/rev2/mappa-link.json` (`pagine.contatti.html`, `ancore.#contatti`, `mailto_cta`, segnaposto `Diventa partner di produzione` → `/contatti/`), `tools/rev2/html2elementor.js` (`risolviLink` preserva link email espliciti con `@` nel testo e `tel:`), `wp/artes-core/artes-rev2.js` (`marcaAttivo` attiva `Contatti` su desktop `.topbar__right` e mobile `.mobile-nav__list` con `is-active` + `aria-current="page"`, escludendo il segnaposto `Blog` su `/realizzazioni/`), `tools/rev2/collaudo-header.js`.
  - Creato ed eseguito `tools/rev2/aggiorna-link-contatti.js --esegui` + `--stato` (backup in `tools/out/rev2/link-contatti-revisions.json`, undo `1152–1180`, walker JSON Atomic V4 per verifica live): rigenerati e pubblicati **15/15 documenti** (`557` Header `2`, `971` Footer `2` preservando `tel:` e `Privacy · Cookie · MEPA`, 9 pagine statiche `376, 144–151` = `26`, 4 template CPT `1040, 1049, 1050, 1051` = `8`): **`38/38` link collegati a `/contatti/`** (`30` `#contatti` + `1` `#` segnaposto + `7` `mailto:` CTA), **`0` residui `#contatti`**, condizioni Theme Builder e FAQ/loop intatti.
- *Verifica live completa su `dev3`* (**100% OK, 0 fallimenti**):
  - Screenshot `/contatti/` @1440 (`2668px`) e @390 (`4777px`) ispezionati in `tools/out/rev2/contatti/`: esiti `display:none` in default + toggle ok/err verificato, `SCEGLI FILE` stilato rev2, `scrollX=0`, preselezione `?motivo=pa#scrivici` e `?motivo=progettisti&settore=...` OK, voce attiva `Contatti` desktop+mobile OK, `<title>Contatti — Artes</title>`, `H1: 1`, `0` errori console.
  - 5 bozze `5/5` `draft` + HTTP 404 pubblico; `collaudo-header.js` tutto in parità (`8/8` voci attive incluso `/contatti/`); parità campione `7 × 2 = 14/14` a **`Δ 0 px`** + `contenuti identici`; `controllo-link.js` **52/52 pagine pubblicate** = **0 rotti** (`71` distinti, `1.199` letti; `314` occorrenze live `href="/contatti/"`, `0` residui `#contatti`; `mailto:`/`tel:` preservati su Privacy/Cookie/Contatti); `salute-pagine.js` **20/20**; `verifica-seo.js` **51/51** + `/contatti/` = **52/52**; `collaudo-redirect.js` **17/17**; `verifica-dati.js` **1.099/1.099**.

**Decisioni e perché**

- *Distinzione tra CTA `mailto:` e indirizzi email espliciti*: i 7 pulsanti/link CTA della rev2 statica che usavano `mailto:info@artessrl.it` come fallback (`footer__cta`, `149` Su misura, 5 CTA in `150` Contract) puntano ora a `/contatti/`, mentre i link con indirizzo email esplicito nel testo (`info@artessrl.it` su Privacy, Cookie e Contatti — guardia `!testo.includes('@')`) e `tel:+390984462039` restano link diretti `mailto:`/`tel:`.
- *Stato delle 5 bozze*: ricostruite in grafica rev2 senza mai pubblicarle (`post_status = 'draft'` con guardia temporale sull'autosave sync), pronte per eventuale futura attivazione selettiva; `[Riserva]` `539–541` preservati.

**Aperto**

- Invariato rispetto alla Fase 9: controllo manuale del sito IT su `dev3` (incl. `/contatti/`), conferme esplicite per i **31 allegati orfani** (`fase9-allegati-orfani.json`), `blog_public = '1'`, eventuale sostituzione mockup in radice + **`git commit` / `git push`**, e come ultimo passo traduzione **WPML / EN** + selettore `IT / EN`.

---

## 2026-11-23 — Adeguamento alla rev2: fase 9 (chiusura, senza WPML/EN)

**Richiesta**

Chiudere l'adeguamento di `dev3` alla **rev2** (fase 9): accensione globale del design rev2, allineamento variabili del Kit Elementor, pulizia dei residui del vecchio design (template, pagina di prova, menu filtri, classi globali orfane), audit in sola lettura degli allegati orfani senza eliminarli, verifica live post-chiusura e aggiornamento della documentazione. Traduzione EN/WPML e collegamento selettore `IT / EN` restano esplicitamente come ultimo passo dopo il controllo manuale. Nessun `git commit` né `git push`.

**Fatto**

- *Audit preliminare in sola lettura su `dev3`* (salvati 3 JSON in `tools/out/rev2/`):
  - **`fase9-allegati-orfani.json`**: censiti **256 allegati totali** (`73,365 MB` file principali / `158,844 MB` su disco incluse miniature): **224 attivi** in rev2, **1 usato solo in bozza** (`417` `las-jera.jpg` in `153` Area progettisti), **31 orfani recuperabili** (`10,654 MB` file principali / `19,464 MB` su disco: 28 completamente orfani + 3 screenshot automatici Elementor `209, 210, 487` dei vecchi template `199, 200, 213`). **Scoperta critica:** tutte le 8 foto dei 4 progetti fittizi cestinati (`50–54, 66, 97, 109`) e 3 su 4 della vecchia galleria Pedrali (`100, 466, 57`) sono **attivamente usate in rev2** (da non cancellare; solo `274` è orfano). **Nessun file/allegato è stato cancellato.**
  - **`fase9-audit-classi.json`**: incrociate tutte le **480** classi globali di Kit `7` direttamente sull'albero JSON `_elementor_data` dei 33 documenti Elementor (l'indice cache interno di Elementor era obsoleto su 158 classi): **245** rev2 attive + **69** usate da `[Riserva]` (`539–541`) e 6 bozze (`152–154, 471, 472, 491`, inclusi 13 `o-*` protetti) + **22** stub rev2 (`crea-classi.js`/JS) + **144** `classi_sicure_da_rimuovere_legacy` (inclusi 10 `o-*` e 4 test spike).
  - **`fase9-audit-kit-menu.json`**: verificate le 27 variabili globali di Kit `7` (19 già allineate, 2 da aggiornare: `sand` e `night`, 6 non mappate `stone`/`space-*`), i 6 menu WP e le condizioni dei site part.
- *Plugin `artes-core` **`0.9.0`*** (`wp/artes-core/artes-core.php`, deployato con `tools/install-plugin.ps1`, CSS del kit vuoto):
  - Introdotta `artes_rev2_globale_attiva()` + accensione globale in `artes_is_rev2()` tramite opzione `artes_rev2_globale` (default `'1'` su tutto il frontend inclusi 404, ricerca e anteprime; `false` in `is_admin()`; kill-switch reversibile con `'0'`), estesa a `pre_get_posts`, `request` e `template_redirect`.
  - Supporto pulito per **404** e **ricerca** (`/?s=…`) in rev2: `hello_elementor_page_title` attivo su `is_404() || is_search()` (preserva l'`<h1>`) + CSS inline minimale scoped solo a `body.rev2.error404 .site-main` e `body.rev2.search .site-main` (zero impatto sulle 51 pagine).
  - Rimosso codice legacy verificato morto (`artes_related_brand_ids`, `artes_brand_collegati`, `[artes_titolo]`, `[artes_settore_ambito]`, `[artes_categoria_brand]`, `[artes_categorie_prodotto]`, `artes_progetti_settore`, `artes_progetti_home`, `artes_brand_home`, `nav_menu_css_class`).
  - Preservati intatti: SEO on-page `0.8.0`, redirect 301 (tassonomie + `/page/N/`), 8 shortcode e 6 query rev2, `[artes_lingue]` (per WPML finale), gestione DWG/DXF + pulizia upload + preselezione `#richiesta_settore`/`#motivo` (senza blocco `if (artes_is_rev2()) return` così resta pronta per `[Riserva]`/`152`/`154`), `artes-core.css` e `artes-core.js`.
- *Esecuzione Fase 9 su `dev3`* (`tools/rev2/fase9-chiusura.js --esegui` + `--stato`):
  - Salvato backup integrale reversibile in **`tools/out/rev2/fase9-backup.json`** (`610.649 byte`: 144 classi con post/meta completi, `_elementor_data` raw dei 7 elementi cestinati, 2 menu filtri, variabili Kit `7`, condizioni site part, opzione).
  - **(a) Variabili Kit `7`**: aggiornate via `elementor-manage-global-variable` (`sand` `#111111` → **`#393E42`**, `night` `#080808` → **`#2F3438`**); `19` già allineate e `6` non mappate intatte.
  - **(b) Theme Builder**: condizioni dei 6 vecchi template (`138, 199, 200, 213, 447, 448`) svuotate via `Conditions_Manager::save_conditions($id, [])` (`6/6`, aggirando la normalizzazione di `elementor-manage-site-parts` che converte `[]` in `include/general`); **Header `557`** e **Footer `971`** portati a **`include/general`** (`0` conflitti); `1040, 1049, 1050, 1051` intatti.
  - **(c) Cestino reversibile (`wp_trash_post`, mai `force_delete`)**: **`7/7`** in `trash` — pagina di prova `542`, vecchi Header/Footer `199, 200`, vecchi template `138, 448, 213, 447`.
  - **(d) Menu filtri**: eliminati `filtri-realizzazioni` e `filtri-brand` (restano `header`, `footer-azienda`, `footer-settori`, `footer-risorse`).
  - **(e) Classi globali Elementor**: eliminate **`144/144`** classi sicure/orfane in 6 lotti da 25 (`0` errori); **`336`** classi residue su Kit `7` (`480 − 144 = 336`).
  - **(f) Opzioni e integrità**: `artes_rev2_globale = '1'`, `artes_rev2_cpt = '1'`, `blog_public = '1'` (invariato), cache Elementor + WP svuotate; `256/256` allegati media intatti; `[Riserva]` `539–541` (`publish`) e 6 bozze `152, 153, 154, 471, 472, 491` (`draft`) intatti; WPML (`it`, `en-gb`) e `[artes_lingue]` intatti.
- *Verifica live post-Fase 9 in sola lettura* (**0 fallimenti su tutta la suite**):
  - **Parità campione (`16/16` viewport, `1440` e `390` px)**: `home`, `chi-siamo`, `contract`, `arredamento-ufficio`, `archivio-realizzazioni`, `archivio-brand`, `r-arpacal`, `b-pedrali` — **16/16 a `Δ 0 px` e `scrollX = 0 px`** (max diff `2,626%` su `archivio-realizzazioni @390`).
  - **Pagine di sistema (`4/4` @`1440` e @`390` px)**: **404** (`/pagina-inesistente-fase9-check/`, HTTP 404) e **ricerca** (`/?s=ufficio`, HTTP 200) entrambe con `body.rev2 = true`, Header `557` + Footer `971` rev2 attivi, singolo `<h1>`, `scrollX = 0 px`, `0` errori console/JS/asset.
  - **`verifica-seo.js`**: **51/51 OK** · **`salute-pagine.js`**: **102/102 OK** (`51 × 2`) · **`controllo-link.js`**: **51/51 OK** (`70` distinti, `1.129` collegamenti, `0` rotti) · **`collaudo-redirect.js` + paginazione + bozze**: **17/17** + **2/2** 301 `/page/2/` + **6/6** bozze 404 · **`verifica-dati.js`**: **1.099/1.099 OK**.
- *Documentazione allineata alla rev2*: aggiornati `CLAUDE.md` (ora fonte di verità rev2 senza vecchie contraddizioni), `docs/piano-adeguamento-rev2.md`, `docs/wp-stato-dev3.md`, `docs/diario-sessioni.md` e `tools/README.md`.

**Decisioni e perché**

- *Pulizia conservativa delle classi globali (`144` eliminate, `336` mantenute)*: preservate tutte le 69 classi (inclusi 13 `o-*`) usate da `[Riserva]` (`539–541`) e dalle 6 bozze (`152–154, 471, 472, 491`), più i 22 stub rev2 per mantenere idempotente `crea-classi.js`.
- *Nessuna eliminazione di allegati media senza conferma*: i 31 orfani (`10,654 MB` / `19,464 MB` su disco) sono elencati con ID e percorsi in `tools/out/rev2/fase9-allegati-orfani.json`; la cancellazione di file su disco è irreversibile.
- *Rollback integrale*: in `fase9-backup.json` è salvato anche il `_elementor_data` raw dei 7 documenti cestinati (perché `elementor-manage-classes delete` innesca il cleanup Elementor anche sui post nel cestino), così `node tools/rev2/fase9-chiusura.js --rollback` può ripristinare tutto integralmente.

**Aperto**

- **Controllo manuale dell'utente** sul sito italiano su `dev3` (e eventuali ritocchi).
- **Conferme esplicite richieste prima di procedere**:
  1. eventuale eliminazione dei **31 allegati orfani** (`tools/out/rev2/fase9-allegati-orfani.json`, `10,654 MB` / `19,464 MB` su disco);
  2. impostazione indicizzazione staging (`blog_public` è attualmente `1`, nessun `noindex`);
  3. eventuale sostituzione del mockup congelato in radice con `artes-sito-rev2/` e autorizzazione a **`git commit`** e **`git push`**.
- **Ultimo passo finale (dopo il controllo manuale)**: traduzione in inglese con **WPML** e collegamento del selettore **`IT / EN`** nella topbar (`[artes_lingue]` già pronto in `artes-core 0.9.0`).

---

## 2026-11-20 (quarta parte) — Adeguamento alla rev2: fasi 6, 7 e 8 (pagine fuori rev2, SEO on-page, collaudo completo IT)

**Richiesta**

Chiudere e verificare la **fase 6** (pagine fuori rev2 e legali), implementare e verificare la **fase 7** (SEO on-page per tutte le 49 pagine rev2 + Privacy/Cookie, senza plugin esterni) e completare il collaudo della **fase 8** su tutto il sito italiano (senza toccare traduzioni EN/WPML né selettore `IT / EN`, che restano come ultimo passo finale).

**Fatto**

- *Fase 6 — Pagine fuori rev2, Privacy/Cookie e fix regressioni*:
  - Spostate in **bozza** reversibile (`tools/rev2/fase6-pagine.js`) le 6 pagine non presenti nella rev2: **Contatti (`152`)**, **Area progettisti (`153`)**, **Richiedi preventivo (`154`)**, **Prodotti (`471`)**, **MEPA (`472`)**, **Cataloghi PDF (`491`)** — verificate tutte **HTTP 404** pubblicamente.
  - Ricostruite in design rev2 (`_artes_rev2 = 1`, HTTP 200) **Privacy policy (`3`)** e **Cookie policy (`493`)** con i dati reali di Artes srl (`Artes srl`, `Via A. Nervoso 1`, `87036 Rende (CS)`, `P.IVA 02343330789`, `info@artessrl.it`, **0 segnaposto `[...]`**); aggiunte entrambe alle condizioni di Header `557` e Footer `971` (15 contesti ciascuno: 4 CPT + 9 statiche + 2 legali). Revisioni pre-fase 6 salvate in `tools/out/rev2/fase6-revisions.json`.
  - Aggiornato Footer `971` con i link cliccabili `Privacy · Cookie · MEPA` (`/privacy-policy/`, `/cookie-policy/`, `/arredamento-ufficio/`).
  - Verificato `artes-core 0.7.1` su `dev3` (rimosso script legacy `richiesta_settore` su rev2 e `posts_per_page = -1` su archivio `realizzazione`), quindi emersi e corretti due difetti (vedi sotto) rilasciati nel deploy atomico **`0.8.0`**.
- *Fase 7 — SEO on-page (`artes-core 0.8.0` + `fase7-seo.js` + `verifica-seo.js`)*:
  - Esteso `wp/artes-core/artes-core.php` alla versione **`0.8.0`** (con gestione `<title>` via `pre_get_document_title` + `esc_html`, `<meta name="description">` in `wp_head` priorità 2 + `esc_attr` e soppressione duplicati Hello Elementor tramite `hello_elementor_description_meta_tag`; esclusioni esplicite su `404`/`search`/`feed`/`admin`; aggiunti anche i redirect 301 per archivi CPT paginati `/page/N/`).
  - Scritto `tools/rev2/fase7-seo.js` (`--verifica-estrazione`, `--applica`, `--stato`, `--rollback`) ed eseguito `--applica` su `dev3` con backup in `tools/out/rev2/fase7-backup.json`: meta `_artes_seo_title` e `_artes_seo_description` sulle 11 pagine statiche/legali (`376, 144–151, 3, 493`), opzione `artes_seo_archives` per i 2 archivi CPT, formule dinamiche su `20/20` realizzazioni e `18/18` brand (**0 eccezioni**), registrazione WPML `custom_fields_translation = 2` per entrambi i meta (senza toccare IT/EN).
  - Deploy atomico su `dev3` di `artes-core 0.8.0` (incluso `artes-rev2.css` rigenerato con il fix `.footer__bottom a` e i redirect 301 `/page/N/`).
  - Verifica live con `tools/rev2/verifica-seo.js` (`tools/out/rev2/fase7-seo-report.json`): **51/51 pagine OK** (49 rev2 + Privacy `3` + Cookie `493`: HTTP 200, `<title>` e `<meta name="description">` identici al 100% senza duplicati né entità HTML residue, singolo `<h1>`, attributi `alt` conformi al 100%).
- *Fase 8 — Collaudo completo IT post-deploy (`tools/rev2/fase8-collaudo.js`)*:
  - Report completo in `tools/out/rev2/fase8/report-fase8.json` e sintesi in `tools/out/rev2/fase8/riepilogo.md` (**0 difetti residui**):
  - **Parità 49/49 pagine rev2 × 4 breakpoint (`1440, 1024, 768, 390` px) = `196/196` viewport**: **0/196** scostamenti di altezza (`Δ 0 px` ovunque; scomparso il `+10 px` del Footer `971`), **49/49** contenuti normalizzati identici, scroll orizzontale `0 px` su `195/196` (unico noto `contract @768`: `20 px` identici alla rev2 originale), `194/196` `< 2,7%` pixel diff (unici 2 `≥ 3%`: `archivio-realizzazioni @768` `3,619%` e `@1024` `3,232%`, puro ricampionamento JPEG con `Δ 0 px`).
  - **Geometria (`geometria.js`, tol ±2 px)**: 9 tipologie × 2 breakpoint = `18` controlli (`14/18` a 0 differenze; sui 4 controlli CPT singoli `1` sola diff `y(rel)` di `page-root#1` per il wrapper Elementor, posizione assoluta identica).
  - **Salute (`salute-pagine.js`)**: **51/51 pagine × 2 (`1440, 390`) = `102/102` OK** (`0` errori console, `0` richieste fallite escluso `/favicon.ico`, `0` immagini rotte o senza `alt`, `H1` unico, `0` overflow).
  - **Verifica post-deploy Footer `971` e legali**: `4/4` OK su `/privacy-policy/` e `/cookie-policy/` (`1440, 390`), link `Privacy · Cookie · MEPA` con `color: rgb(200, 200, 200)`, `display: inline`, `min-height: 0px`; screenshot aggiornati in `tools/out/rev2/fase6/`.
  - **Interazioni live**: Header `4/4` visivi + `7/7` voci attive; Home `5/5`; Settori FAQ `4/4` accordion + `5/5` `FAQPage` JSON-LD; Archivi Realizzazioni `6/6` + Brand `4/4`; Schede Lightbox `6/6`.
  - **Link, redirect, bozze e dati**: `controllo-link.js` **51/51** (`70` link interni distinti, `1.129` collegamenti, **0 rotti**, 0 verso le 6 bozze); `collaudo-redirect.js` **17/17** + **2/2** redirect 301 archivi paginati (`/realizzazioni/page/2/`, `/brand-partner/page/2/`); 6 bozze **6/6 HTTP 404**; `verifica-dati.js` **1.099/1.099**.

**Errori trovati e corretti lungo la strada**

- *Regressione visiva su `.footer__bottom a` (Fase 6)*: la sostituzione di `<span>Privacy · Cookie · MEPA</span>` con tre `<a>` aveva fatto ereditare `color: var(--graphite)` (testo scuro illeggibile su antracite `#393E42`) e `min-height: 28px` da `.footer a` (gonfiando il footer di `+10 px` su tutte le pagine). Corretto in `tools/rev2/css/adattamenti.css` (`color: inherit; display: inline; min-height: 0;` + `:hover`/`:focus-visible` in `var(--sand-ink)`), rigenerato `wp/artes-core/artes-rev2.css` e verificato `Δ 0 px` su tutti i 196 viewport.
- *Archivi CPT paginati `/realizzazioni/page/2/` e `/brand-partner/page/2/`*: con `posts_per_page = -1` (WP `nopaging = true`), rispondevano HTTP 200 duplicando l'archivio. Aggiunto redirect **301** su `template_redirect` in `artes-core 0.8.0` verso l'URL canonico dell'archivio.

**Aperto**

- **Fase 9 (chiusura)** in attesa del via: accensione globale della modalità rev2, aggiornamento variabili del kit Elementor, rimozione dei residui vecchi (menu `filtri-realizzazioni`/`filtri-brand`, classi `o-*`, template vecchi in bozza `138/448/213/447`, header/footer vecchi `199/200`, pagina di prova `542`) e valutazione degli allegati orfani con conferma esplicita del titolare.
- **Traduzione EN/WPML e selettore `IT / EN`**: da fare per ultimo, dopo la chiusura della fase 9 (decisione confermata dal titolare).
- **Segnalazione minore rev2** (invariata): `contract.html` a `768 px` presenta `20 px` di scroll orizzontale su `.contract-scope__card` (identico nella `rev2` originale e su `dev3`).
- **Nessun commit né push**: tutte le modifiche locali (`artes-core 0.8.0`, `adattamenti.css`/`artes-rev2.css`, script fasi 6–8, documentazione) sono non committate in attesa del via.

---

## 2026-11-20 (terza parte) — Fix filtro Brand Partner + Adeguamento alla rev2: fase 5 (pagine statiche)

**Richiesta**

Correggere il bug dei filtri Brand Partner direttamente nella rev2 e su dev3, poi procedere con la **fase 5** (Home, 5 pagine settore, Arredo su misura, Contract, Chi siamo).

**Fatto**

- *Fix filtro Brand Partner (rev2 + dev3)*: aggiunta `.brand[hidden] { display: none; }` in `artes-sito-rev2/assets/css/artes.css`, rigenerato `wp/artes-core/artes-rev2.css` (`port-css.js`) e caricato su dev3. Verificato con `collaudo-archivi.js brand`: le card si nascondono davvero (`18/18` → `3/3` Sedute, `2/2` Acustica, `1/1` Outdoor; pixel diversi `0–0,1%`, stato identico).
- *Fix strumento di misura (`tools/rev2/cdp-session.js`)*: lo script `noMotion` (che disattiva transizioni/animazioni prima degli screenshot) viene ora iniettato su `DOMContentLoaded` anziché prima che esista `<html>`, rendendo stabili anche le misure di pagine con slider e caroselli come la Home.
- *Estensione convertitore e modelli*:
  - `tools/rev2/html2elementor.js`: conversione di `<div class="faq">` / `<details class="faq__item">` nel widget nativo **`e-accordion`** (`default_state: all_collapsed`, `max_expanded: multiple`, `show_icon: false`, `faq_schema: true` → `<details>/<summary>` nativi + JSON-LD `FAQPage`); gestione di `style="margin-bottom:0"` tramite classe d'appoggio `rev2-mb0` (creata su dev3 con `crea-classi.js`, totale 480 classi globali); risoluzione automatica delle copie immagine con alt dedicato da `media-pagine.json`. `converti-tutte.js` scende a **0 avvisi** di tag/attributi non gestiti su tutte le 49 pagine.
  - `tools/rev2/css/reset.css` e `adattamenti.css`: reset degli stili base dei widget `e-accordion-*`, regola `.rev2-mb0` e visibilità immediata della prima slide dello slider produzione prima dell'avvio JS (zero flash).
  - `tools/rev2/import-media-pagine.js`: create le **17 copie fisiche** con alt dedicato per le immagini usate sulle pagine statiche con alt diverso dall'allegato base (stessa regola della fase 3, lingua WPML `it`, mappa in `tools/out/rev2/media-pagine.json`).
  - `tools/rev2/genera-modelli.js` + `dinamici.js`: generato `tools/rev2/modelli/home.html` da `index.html` rendendo **dinamiche dai CPT** la sezione 04 Realizzazioni (ciclo `progetti_home_rev2` ordinato per `home_ordine` 1–6, larghezze `w4/w2/w6` e filtri settore) e la sezione 05 Brand Partner (ciclo `archivio_brand`).
- *Plugin `artes-core` **0.7.0***: aggiunta query `elementor/query/artes_progetti_home_rev2`; in `artes-rev2.js` fissato lo scope di `initFiltriBrand()` (solo nella stessa `<section>` di `.brands`, evitando conflitti con i filtri progetti della Home), aggiunte `initProduzioneSlider()`, `initHomeProgetti()`, `initStepsDots()` e attributi di accessibilità (`role="list"/"listitem"`, `aria-label`, `aria-hidden`).
- *Costruzione e attivazione delle 9 pagine* (`tools/rev2/fase5-pagine.js --costruisci`): pubblicate e attivate con `_artes_rev2 = 1` e condizioni di Header `557` e Footer `971` su tutte e 9: **Home (`376`)**, **Arredo uffici (`144`)**, **Arredo negozi (`145`)**, **Arredo negozi food (`146`)**, **Arredo bar e ristoranti (`147`)**, **Arredo hotel (`148`)**, **Arredo su misura (`149`)**, **Contract (`150`)**, **Chi siamo (`151`)**. Revisioni pre-fase 5 salvate in `tools/out/rev2/fase5-revisions.json` per eventuale rollback.
- *Collaudo completo*:
  - **Parità 9/9 pagine fase 5** a `1440` e `390` px (`fase5-pagine.js --parita`, e campione `1024/768` su 6 pagine): **tutte `Δ 0` di altezza**, `0 px` di scroll orizzontale (eccetto `contract @768`: `20 px` identici alla `rev2` originale su `.contract-scope__card`), **contenuti 100% identici** (testi, titoli, link, alt), pixel diversi al massimo `1,303%` (Home `@390`, solo ricampionamento foto).
  - **Interazioni live su `dev3`**: FAQ (`collaudo-fase5.js faq`, 4/4 scenari `0%` diff + `FAQPage` JSON-LD attivo), Home (`collaudo-fase5.js home`, 5/5 scenari: slider next/prev, filtri uffici/hospitality, pallini metodo mobile `0%–1,198%` diff), Header (`collaudo-header.js`, 11/11 controlli).
  - **Salute**: 9 pagine fase 5 (`18/18`) + 40 pagine CPT (`80/80`) = **98/98 controlli ok**.
  - **Non-regressione 40 pagine CPT** (`parita-tutte.js`): **40/40** (`0` altezze diverse, `0` scroll orizzontale, `0` contenuti diversi, max `2,625%` foto).
  - **Dati, redirect, link, pagine vecchie**: `verifica-dati.js` **1.099/1.099**, `collaudo-redirect.js` **17/17**, `controllo-link.js` **11 pagine / 68 link interni / 0 rotti**, pagine residue vecchio design (`privacy-policy`, `contatti`, `prodotti`) **6/6 pixel-identiche (0%)** rispetto alla baseline di fine fase 4.

**Decisioni e perché**

- *Home con cicli dinamici per Realizzazioni (sez. 04) e Brand Partner (sez. 05)*: sfrutta i campi `home_ordine`/`home_larghezza` importati in fase 3 e il ciclo brand della fase 4, mantenendo la separazione contenuti/presentazione e riusando le 6 immagini `#card` senza ulteriori duplicati.
- *Elenchi `ul`/`ol` convertiti come `rev2-ul`/`rev2-ol`/`rev2-li` + `role="list"/"listitem"`*: evita il wrapper aggiuntivo di `e-list` che avrebbe rotto `grid-template-rows: subgrid` in `ol.steps` della Home; tutti gli elenchi della rev2 hanno `list-style: none`.
- *Menu `filtri-realizzazioni` e `filtri-brand` non ancora eliminati*: ora non servono più a nessuna pagina pubblicata, ma lasciarli fino alla fase 9 mantiene intatto il rollback della fase 5 senza dover ricreare i menu.
- *Bug minore in `contenuti.js` corretto*: usava `innerText` (maiuscolo per `text-transform: uppercase`) per risolvere i link `#` in `mappa-link.json`; ora usa `textContent` grezzo.

**Aperto**

- **Fase 6** (pagine fuori rev2: mettere in bozza Contatti 152, Preventivo 154, Area progettisti 153, Prodotti 471, MEPA 472, Cataloghi 491; aggiornare Privacy 3 e Cookie 493 con i dati reali di Artes srl) in attesa del via.
- **Segnalazione minore rev2**: `contract.html` a `768 px` ha uno scroll orizzontale di `20 px` su `.contract-scope__card` (presente identico in `artes-sito-rev2` e replicato su `dev3`).
- Restano per le fasi 7–9: SEO on-page (`title`/`meta description`, fase 7), collaudo finale e traduzione EN/WPML (fase 8), accensione globale rev2 + variabili kit + rimozione menu filtri, classi `o-*`, template vecchi, pagina prova `542` e valutazione allegati orfani con tuo OK (fase 9).
- **Nessun commit né push**: modifiche locali non committate (incluso il fix in `artes-sito-rev2/assets/css/artes.css`).

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
