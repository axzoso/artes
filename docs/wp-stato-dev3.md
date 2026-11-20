# Stato di dev3 (WordPress)

Inventario di cosa esiste oggi su `https://dev3.minimalstudiodev.it`, con gli
ID, e registro cronologico delle modifiche. Il **piano** e le decisioni stanno
in [`wp-migration.md`](wp-migration.md); gli **script** per ricostruire tutto
in [`../tools/README.md`](../tools/README.md). Aggiornare questo file a ogni
modifica fatta sul sito, con data.

Ultimo aggiornamento: **2026-10-22**.

## 1. Ambiente

| Voce | Valore |
|---|---|
| WordPress / PHP / lingua | 7.1.3 / 8.3.35 / it_IT |
| Server | LiteSpeed (nessun plugin di cache attivo; la cache che morde è quella dei file di Elementor) |
| Tema | Hello Elementor (header e footer del tema sostituiti dai site part 199 e 200) |
| Plugin attivi | Elementor 4.3.5, Elementor Pro 4.3.2, JetEngine 3.9.0, Novamira 1.12.10, WPML Multilingual CMS 5.1.0, WPML String Translation 5.1.0 |
| Permalink | `/%postname%/` (erano con data) |
| Lingue WPML | it (predefinita), en-gb. Gli URL inglesi sono `/en/…` (verificato 2026-10-21: `/en/`, `/en/contatti/` e le schede rispondono 200; la versione non tradotta mostra l'italiano) |
| Banner | il sito mostra "registered on wpml.org as a development site": normale in sviluppo |
| Backup | **nessuno** (scelta del titolare, 2026-10-20) |
| Indicizzazione | da verificare che sia `noindex` / protetto |

### Connettori MCP (ambito locale del progetto `artes`, in `~/.claude.json`)

| Nome | Endpoint | Uso |
|---|---|---|
| `artes-elementor` | `/wp-json/elementor/mcp/` | Elementor: pagine, composizioni, classi, variabili, site parts |
| `novamira-dev3-minimalstud` | `/wp-json/mcp/novamira` via `@automattic/mcp-wordpress-remote` | PHP, file, WP-CLI, abilities WordPress |

Autenticazione con password applicazione dell'utente `minimalstudio` (ID 1).
Le due password sono passate in chiaro in chat il 2026-10-20: **da
rigenerare a fine PoC** (non revocare/eliminare quelle usate da Novamira
mentre la connessione è in uso). `novamira auth login` (OAuth) non funziona:
`server_unsupported: full-access OAuth scope unavailable`. Gli strumenti MCP
non compaiono come tool nativi dopo il riavvio: si usano gli script in
`tools/`.

Il connettore del sito personale `elementor-claudio-antonucci` non è più
configurato in questo progetto.

## 2. Design system in Elementor (kit attivo)

**27 variabili globali** (nomi minuscoli, usabili come `var(--nome)`):
colori `bone stone sand graphite night ink muted-1…4 line line-soft
line-strong line-btn accent sand-ink sand-muted`, font `font-display`
(Archivo) `font-body` (Instrument Sans) `font-mono` (IBM Plex Mono),
dimensioni `pad gutter space-20 space-34 space-44 space-80 space-110`.
Valori in `wp-migration.md` §4. Elementor porta anche i font del kit di
default (Roboto, Roboto Slab): da togliere.

**92 classi globali** (41 del 20/10 + 22 di header e footer + 16 dell'archivio + 13 del modulo di contatto)
- *Base (13)*: `lbl eyebrow h-section lead link-rule btn btn-red btn-light
  btn-ghost section section-head bg-alt bg-dark`.
- *Scheda realizzazione (28)*: `scheda-intro breadcrumb breadcrumb-current
  scheda-title-row scheda-title eyebrow-row eyebrow-inline scheda-media
  img-cover scheda-hero gallery-grid gallery-img scheda-specs specs-panel
  specs-list spec spec-l spec-v brands-panel brands-mini brand-chip correlate
  correlate-title correlate-grid correlate-img correlate-meta correlate-name
  correlate-sector`.

- *Contatti e modulo (13)*: `contatti contatti-intro contatti-diretti contatti-dl-label
  contatti-dl-value form-grid form-field form-field-wide form-label form-control
  form-hint form-actions form-submit`.
- *Archivio (16)*: `page-intro page-intro-row page-title archivio-body filtri
  progetti-grid progetto-img progetto-meta progetto-nome progetto-luogo
  progetto-settore cta-band cta-title cta-actions pag pag-btn`.
- *Header e footer (22)*: `site-header hdr-topbar hdr-topbar-right topbar-item
  topbar-link hdr-masthead hdr-logo hdr-actions btn-sm btn-sm-outline
  btn-sm-red hdr-navbar site-footer footer-grid footer-col footer-logo
  footer-about footer-title footer-contact footer-cta footer-bottom
  footer-bottom-item`.

Le classi accettano CSS annidato (`&:hover`, `&:has(...)`, `@media(--tablet)`,
`@media(--mobile)`). Solo le classi *usate* in una pagina finiscono nel CSS
emesso. A parità di specificità vince la classe **più in alto nell'elenco**
(non l'ultima nell'elemento): per una regola che deve prevalere si usa il CSS
del kit.

**CSS del sito** (dal 2026-10-21 sera nel plugin, non più nel kit): sorgente
`wp/artes-core/artes-core.css`, caricato dal plugin `artes-core` con `wp_enqueue_scripts`
a priorità 9999, quindi **dopo** tema ed Elementor (posizione 18 su 18 nell'elenco dei
CSS della pagina). Il CSS personalizzato del kit 7 è **vuoto** di proposito: non
rimetterci nulla. Contiene ciò che i widget non esprimono: stile dei menu (widget
`nav-menu`), header sticky, passaggio all'hamburger sotto i 1366px, colori dei link,
grassetto dell'ultima parola del titolo, filtri dell'archivio. Le regole che nascondono
elementi usano `!important`. Si modifica il file e si rilascia con
`tools/install-plugin.ps1`. Vantaggio: viaggia con il plugin in produzione, senza
dipendere dalle impostazioni del kit nel database.

**Animazioni del tema e hover** (2026-10-21, Hello Elementor 3.5.1): `reset.css`
metteva `transition: all .3s` su pulsanti e campi modulo, `header-footer.css`
animava il menu e l'icona del tema (non usati). Prima le avevo azzerate con
`transition: none`, ma gli hover rimasti scattavano. Ora il kit definisce **una sola
transizione per tutto ciò che ha un hover**: `var(--artes-hover)` = `.25s ease`, solo
su colore, sfondo, bordo e opacità (mai `all`), con `!important` perché sovrascrive
quelle del tema e delle singole classi. Si applica a link, pulsanti, campi, `.btn`,
`.btn-sm`, `.footer-cta`, `.brand-chip`, `.link-rule`. **Per cambiare la durata di
tutto il sito basta modificare `--artes-hover`** in `artes-core.css`. Il menu del
tema resta a `none`. **Non toccate**: le transizioni di Elementor su contenitori e
widget e le animazioni di entrata (disattivate di default).

**Menu senza animazioni né hover** (2026-10-21, su richiesta): nelle voci del menu
dell'header, dell'hamburger e del footer sono tolte le transizioni e le animazioni
del widget `nav-menu` di Elementor (`.4s` sui link, `.3s` sugli pseudo-elementi,
animazione di apertura del pannello) con `transition/animation: none !important`, e
il colore resta uguale al passaggio del mouse (le vecchie regole che lo portavano a
rosso sono state tolte). Resta solo la voce attiva, sottolineata. Verificato con gli
stili calcolati del browser (`tools/cdp.js style`): le voci del menu e
l'hamburger risultano `transition: none` e senza animazione. Gli altri hover del
sito (link generici, pulsanti, chip dei brand, link del breadcrumb) restano, con la
transizione morbida descritta sopra.

## 3. Modello dati (JetEngine)

| Elemento | Dettagli |
|---|---|
**Dal 2026-11-20 il modello dati è quello della rev2** (fase 3 dell'adeguamento, `docs/piano-adeguamento-rev2.md`); la definizione
sta in `tools/rev2/modello-dati.js`, il controllo in `tools/rev2/verifica-dati.js`.

| Elemento | Dettagli |
|---|---|
| CPT `realizzazione` (id JetEngine 1) | archivio `/realizzazioni/`, supporta titolo, immagine in evidenza (= foto della card), riassunto, revisioni, attributi di pagina (`menu_order` = ordine dell'archivio rev2). **Campi rev2**: `kw` (riga parola chiave) `introduzione` `localita` `tipologia` `progettista` (solo 5 progetti) `brand_forniture` (HTML, link ai brand con scheda) `descrizione_lead` `descrizione_testo` `galleria` (gallery, ID separati da virgola) `home_ordine` e `home_larghezza` (solo i 6 della home). **Campi del vecchio modello tolti il 2026-11-20** (fine fase 4): `sottotitolo_ambito` `cliente` `superficie` `ambienti` `arredi` `servizi_artes` `tempi` (salvati in `tools/out/rev2/fase4-campi-rimossi.json`; `import-dati.js annulla-pulizia` li rimette) |
| CPT `brand` (id 2) | archivio `/brand-partner/`, `menu_order` = ordine rev2. **Campi rev2**: `introduzione` `settori_artes` (HTML con link ai settori) `fornitura_artes` `assistenza` `come_lavoriamo` `dove_lo_usiamo`; immagine in evidenza = foto della scheda (7 brand). **Vecchi, tolti il 2026-11-20**: `sottotitolo_categoria` `ambiti_artes` `certificazioni` `categorie_prodotto` `galleria` (la galleria del vecchio Pedrali era negli allegati 274, 100, 466, 57: vedi elenco della fase 9) |
| Tassonomia `settore` (id 1) | su `realizzazione`; 5 termini: **uffici** 3, **retail** 4, **food** 5, **bar-ristoranti** 6, **hospitality** 7 (nomi "Arredo uffici e workspace"…, slug = codici rev2; term meta `ordine` 1-5: uffici, retail, bar-ristoranti, food, hospitality; term meta `pagina` = ID della pagina settore). Le 5 pagine settore del design vecchio (144-148) hanno il campo `settore_collegato` = slug del termine (lo legge il filtro `artes_progetti_settore` per l'elenco progetti): dal 2026-11-20 è aggiornato agli slug rev2 e lo controlla `verifica-dati.js` |
| Tassonomia `categoria` (id 3, **nuova**) | su `realizzazione`, piatta, 26 termini (ID 27-52): nome, slug e `descrizione` (le "tipologie") dalla pagina settore; term meta `settore` (codice), `ordine_pagina` (posizione nella pagina settore), `ordine_filtro` (posizione nei filtri dell'archivio, 0 = non compare: 22 sì, 4 no). Ogni progetto ha un settore **e** una categoria; 14 categorie hanno progetti, 12 sono vuote come nella rev2 |
| Tassonomia `categoria_brand` (id 2) | su `brand`; 8 termini ID 8–15 con i nomi dei filtri rev2: Ufficio, Contract, Acustica, **Pareti e pod** (slug `pareti-e-pod`), Sedute, Retail, Food, Outdoor; term meta `ordine` |
| Relazione "Realizzazioni - Brand" (id 3) | molti-a-molti, selettore da entrambi i lati; 8 coppie come la rev2 (Frezza → Ruffolo Group, BCC di Tarsia, Agricola Benincasa; Colombini Office → Costruzioni Imbrogno; Della Rovere → Ruffolo Group; Gaber → Ingrediente School, Agricola Benincasa; Pedrali → Jumecitu). Tabella `jet_rel_default`, `rel_id` 3 |

**Cosa NON si memorizza (si calcola al rendering, formule verificate su tutte le 20 schede):** titolo SEO `"{kw}: {titolo} — Artes"`;
descrizione SEO `"{titolo}, {località}: {introduzione}"`; didascalie della galleria `"{titolo} — foto N di M"` e conteggio "N foto"
(le prime 5 sono visibili, le altre nella lightbox); "Altre realizzazioni" = le prime 3 dello stesso settore in ordine d'archivio,
esclusa la corrente (vuote se il settore ha un solo progetto); righe "Settore", "Categoria" e link finale "Scopri l'arredo…" della scheda;
per i brand: eyebrow, titoli "Come lavoriamo con X"/"Dove lo usiamo", "Realizzazioni con X", titolo del CTA e il paragrafo di chiusura
("Il cliente ha un solo interlocutore…", identico in tutti i 18).

**Immagini e testo alternativo.** Nella rev2 lo stesso file ha alt diversi a seconda del punto (card = nome del progetto; galleria =
"Nome, tipologia a località: foto N"; foto del brand = "Arredi X nella realizzazione Y"), ma in WordPress l'alt sta sull'allegato. Regola: l'allegato
"base" (`tools/out/rev2/media-rev2.json`) ha l'alt della galleria; per card e foto dei brand si usano **copie fisiche** con alt proprio
(meta `_artes_src` = `rev2:<percorso>#card` o `#brand-<slug>`; 27 allegati). Le pagine statiche (fase 5) useranno lo stesso criterio: una copia per ogni coppia file + alt.

Le tre query del Query Builder create il 20/10 sono state **eliminate**: non
servono, perché il widget Loop di Elementor non usa il Query Builder
(vedi §6).

### WPML sul modello dati
- CPT e tassonomie in modalità 2 (traducibili, ripiego sull'italiano se manca
  la traduzione).
- Campi *tradotti* (modo 2): `kw introduzione tipologia progettista brand_forniture descrizione_lead descrizione_testo` (realizzazione),
  `introduzione settori_artes fornitura_artes assistenza come_lavoriamo dove_lo_usiamo` (brand). Campi *copiati* (modo 1):
  `localita galleria home_ordine home_larghezza`. Le regole dei campi del vecchio modello sono state tolte il 2026-11-20 (tranne `galleria`,
  che il modello nuovo usa). La tassonomia `categoria` è traducibile (modo 2, come le altre).
- **WPML non assegna da solo la lingua ai contenuti creati via PHP/REST.** Nei
  contenuti esistenti non era assegnata nemmeno a "Hello world!": assegnato `it`
  a tutto il 2026-10-20. Gli script di import la impostano
  (`wpml_set_element_language_details`).

## 4. Contenuti

| Cosa | Quanti | Note |
|---|---|---|
Stato dopo la fase 3 (2026-11-20): i contenuti sono quelli della rev2.

| Cosa | Quanti | Note |
|---|---|---|
| Realizzazioni | **20** pubblicate, lingua `it` | le 10 già presenti sono state **aggiornate sul posto** (stessi ID) ai dati rev2, 10 nuove; la rev2 le chiama diversamente in due casi: `bbc-tarsia` → **`bcc-tarsia`** ("BCC di Tarsia") e `quotidiano` → **`il-quotidiano`** ("Il Quotidiano"), con redirect 301 dai vecchi indirizzi |
| Brand | **18** pubblicati | gli stessi 18 di prima, ora con i campi rev2; **Mottura** (ID 214, aggiunta il 2026-10-21 su richiesta) non è nella rev2 → cestino |
| Cestino (recuperabili) | 4 realizzazioni + 1 brand | Boutique Hotel Aurea 49, Business Hotel Fera 65, Resort Capo Bianco 96, Spa Terme Luigiane 108 (i 4 fittizi) e Mottura 214; i loro indirizzi diventano `…__trashed` |
| Allegati | 238 | + 27 copie con alt dedicato (card e foto dei brand); alt della galleria allineati alla rev2. Restano nella libreria le immagini dei progetti cestinati e quelle sostituite: **non si cancellano finché non lo confermi** (cancellare un allegato elimina il file) |
| Relazioni brand ↔ realizzazioni | 8 | vedi §3; le vecchie (Aurea → 6 brand) sono state rimosse |

ID dei post `realizzazione` (ordine d'archivio rev2): ruffolo-group 98, costruzioni-imbrogno 67, bcc-tarsia 60, il-quotidiano 91,
ingrediente-school 76, arpacal 55, free-sport 71, lico 86, tema-motori 1020, wellness-universe 1021, perfect-man 1022, morgana 1023,
calzature-rao 1024, jumecitu 81, soft-bar 1025, lido-da-pietro 1026, sakuralab 103, agricola-benincasa 1027, bottega-del-vicinato 1028,
royal-hotel 1029. Brand (ordine rev2): frezza 31, colombini-office 32, las 33, della-rovere 34, martex 35, estel 36, pedrali 37, gaber 38,
et-al 39, caimi 40, snowsound 41, vetroin 42, kastel 43, leyform 44, sm-milani 45, arken 46, lainox 47, nardi-outdoor 48.

**Verifica e rigenerazione.** `node tools/rev2/dati-rev2.js` estrae i dati dalla rev2; `node tools/rev2/verifica-dati.js` li confronta con dev3
(1.094 controlli: termini, campi, 20+18 schede, foto e alt, cestino, relazioni, assenza dei campi del vecchio modello); `node tools/rev2/import-dati.js <passo>` li scrive
(idempotente). Le vecchie pagine settore (144-148) avevano un link con lo slug vecchio dei termini (`/settore/arredo-…/`): aggiornato.

**Pagine segnaposto** (pubblicate, vuote, lingua `it`, slug uguali ai file del
mockup senza `.html`; servono come destinazione di menu e link e vanno riempite
con le pagine vere): `arredamento-ufficio` 144, `arredo-negozi` 145,
`arredo-negozi-food` 146, `arredamento-bar-ristoranti` 147, `arredamento-hotel`
148, `arredamento-su-misura` 149, `contract` 150, `chi-siamo` 151, `contatti`
152, `area-progettisti` 153, `richiedi-preventivo` 154.

**Menu WordPress** (creati da `tools/setup/menus-pagine-logo.php`):
`Header` (slug `header`: 5 settori, Realizzazioni, Su misura, Contract, Chi siamo;
la voce Realizzazioni ha la classe `nav-sep` che apre il secondo gruppo),
`Footer - Azienda`, `Footer - Settori`, `Footer - Risorse` (solo Brand Partner e
Area progettisti). **Mancano** le voci verso pagine che non esistono ancora:
Blog, Prodotti, MEPA / PA, Cataloghi PDF. Le voci "Realizzazioni" e "Brand
Partner" sono link personalizzati con percorso relativo (`/realizzazioni/`,
`/brand-partner/`): da rendere sensibili alla lingua.

**Logo**: `artes-logo.png` (allegato 176), impostato come logo del sito. Nel
footer il logo scuro si perde sullo sfondo nero: **è lo stesso difetto del
mockup**, da risolvere con una versione chiara del logo.

Altri contenuti su dev3: "Hello world!" (post 1), "Privacy Policy" (pagina 3,
bozza). La pagina di prova 28 ("TEST classi globali") è stata messa nel **cestino**
il 2026-10-21 (conteneva il prototipo del modulo).

## 5. Template e pagine

| Cosa | ID | Stato |
|---|---|---|
| Site part `single` "Singolo Realizzazione (rev2)" | **1040** | **pubblicato** (fase 4, 2026-11-20), condizione `include/singular/realizzazione`: il template che vale oggi. Generato dal modello `tools/rev2/modelli/realizzazione.html` con `costruisci-modello.js` (vedi §9) |
| Site part `single` "Singolo Brand (rev2)" | **1049** | **pubblicato**, condizione `include/singular/brand`. Modello `brand.html` |
| Site part `archive` "Archivio Realizzazioni (rev2)" | **1050** | **pubblicato**, condizione `include/archive/realizzazione_archive`. Modello `archivio-realizzazioni.html`; i filtri a due livelli (settore → categoria) sono nel JavaScript del plugin |
| Site part `archive` "Archivio Brand (rev2)" | **1051** | **pubblicato**, condizione `include/archive/brand_archive`. Modello `archivio-brand.html` |
| *(vecchio)* Site part `single` "Singolo Realizzazione" | 138 | **in bozza dal 2026-11-20** (sostituito da 1040), condizione originale `include/singular/realizzazione` conservata per tornare indietro. Generato da `tools/gen-template.ps1`. Legge ancora i campi del vecchio modello (che dalla fine della fase 4 non esistono più: vedi §3) |
| Site part `header` "Header ARTES" | 199 | **pubblicato**, `include/general`. Generato da `tools/gen-header-footer.ps1` |
| Site part `footer` "Footer ARTES" | 200 | **pubblicato**, `include/general`. Stesso generatore |
| *(vecchio)* Site part `archive` "Archivio Realizzazioni" | 213 | **in bozza dal 2026-11-20** (sostituito da 1050), condizioni originali `include/archive/realizzazione_archive` e `include/archive/settore` conservate. Serviva `/realizzazioni/` **e** le pagine dei settori (`/settore/<slug>/`, oggi reindirizzate all'archivio filtrato). Generato da `tools/gen-archive.ps1` |
| Menu "Filtri realizzazioni" | — | slug `filtri-realizzazioni`: Tutti + 5 settori, mostrato come chip dal CSS del kit. **Ancora usato dalla Home (376, design vecchio)**: si elimina quando la Home viene ricostruita con la rev2 (fase 5) |
| *(vecchio)* Site part `archive` "Archivio Brand" | 447 | **in bozza dal 2026-11-20** (sostituito da 1051). Prima: **pubblicato**, condizioni `include/archive/brand_archive` e `include/archive/categoria_brand`: serve `/brand-partner/` **e** le pagine delle categorie (`/categoria-brand/<slug>/`). Intestazione, filtri (menu `filtri-brand`: Tutti + 8 categorie, link alle categorie), griglia dei 19 brand su fondo alternato (tutti in una pagina, ordine del mockup), CTA "Vuoi diventare un brand partner?". Generato da `tools/gen-archive-brand.ps1` |
| *(vecchio)* Site part `single` "Singolo Brand" | 448 | **in bozza dal 2026-11-20** (sostituito da 1049). Prima: **pubblicato**, condizione `include/singular/brand`. Intestazione (breadcrumb, categoria, nome, introduzione), "Progetti con <brand>" (ciclo `artes_progetti_brand` via relazione; **sezione nascosta dal CSS se il brand non ha progetti**), CTA. Generato da `tools/gen-single-brand.ps1`. Tutti i 19 brand sono cliccabili (nel mockup solo Pedrali). Scheda completa dal 2026-10-21: immagine principale (in evidenza) e galleria, specifiche (categoria estesa, ambiti, certificazioni, fornitura) e categorie prodotto, tutti **nascosti se vuoti**. Compilato solo **Pedrali** (da `setup/contenuti-pedrali.php`); gli altri 18 aspettano i contenuti del cliente. Campi aggiunti da `setup/campi-brand.php` (`sottotitolo_categoria`, `ambiti_artes`, `certificazioni`, `fornitura_artes`, `categorie_prodotto` una per riga "Nome | Ambito", `galleria`; WPML: testi tradotti, galleria copiata) |
| Home | 376 | **costruita e pubblicata**, impostata come pagina iniziale (`show_on_front=page`). Hero, metodo in 7 fasi, mosaico dei 5 settori, produzione, ultimi progetti con filtri, muro dei 19 brand, doppia CTA. Generata da `tools/rebuild-home.ps1` |
| Pagine dei 5 settori | 144–148 | **costruite e pubblicate** (`arredamento-ufficio`, `arredo-negozi`, `arredo-negozi-food`, `arredamento-bar-ristoranti`, `arredamento-hotel`): intestazione, fascia immagine, "Il settore" con 3 schede, ambiti con immagini, progetti del settore, CTA. Generate da `tools/rebuild-pagine-settori.ps1` |
| Cataloghi PDF 491, Privacy policy 3, Cookie policy 493 | 491, 3, 493 | **costruite e pubblicate** da `tools/rebuild-pagine-legali.ps1` con i testi di `tools/contenuti-pagine-legali.json` (una riga che inizia con "- " è una voce di elenco). Privacy = pagina 3 di WordPress, impostata come pagina privacy del sito. **Testi di bozza**: i dati del titolare sono segnaposto tra parentesi quadre (ragione sociale, indirizzo, P.IVA, email privacy) e vanno completati e fatti rivedere a chi cura gli aspetti legali; Cataloghi non ha PDF (rimanda a "Contatti" e ai brand). Nel footer: link Privacy · Cookie · MEPA in fondo, "Cataloghi PDF" nel menu Risorse; la casella di consenso dei moduli linka l'informativa |
| Prodotti 471 e MEPA / PA 472 | 471, 472 | **costruite e pubblicate** (nuove, anche nel mockup: `prodotti.html`, `mepa.html`), nel menu `Footer - Risorse`. Il testo MEPA è una **bozza da confermare**. Pagine create da `setup/pagine-prodotti-mepa.php`, costruite da `rebuild-pagine.ps1 -Only prodotti,mepa` |
| Pagine istituzionali (su misura 149, contract 150, chi siamo 151, area progettisti 153) | 149–153 | **costruite e pubblicate** da `tools/rebuild-pagine.ps1` (blocchi estratti dal mockup con `extract-pagine.js`) |
| Contatti 152 e Richiedi preventivo 154 | 152, 154 | **costruite e pubblicate** da `tools/rebuild-pagine-modulo.ps1`: modulo e-form a gruppi (`lib-form.ps1`), email a `info@artes.it` (temporaneo), allegati DWG/DXF/PDF/JPG/PNG. Mappa della pagina Contatti non inclusa (serve un widget HTML) |

### Template singolo realizzazione (138)
Sezioni, come nella scheda del mockup:
1. Intestazione: breadcrumb, settore + ambito, titolo, introduzione.
2. Immagine principale (immagine in evidenza) e galleria (ciclo).
3. Dettagli tecnici (9 righe, le vuote si nascondono) e brand collegati
   (pannello nascosto se non ce ne sono).
4. Altre realizzazioni dello stesso settore (3, esclusa la corrente).

Dal 2026-10-21: titolo con l'ultima parola in semigrassetto (shortcode
`[artes_titolo]`), riga "Settore" con settore e ambito (`[artes_settore_ambito]`),
fondo grigio alternato su "Altre realizzazioni", voce di menu "Realizzazioni"
sottolineata nelle schede.

Dal 2026-10-21 sera: sezione **contatti con modulo** in fondo (vedi sotto).

**Non ancora**: link "Archivio completo" già filtrato per settore, link multilingua (oggi
`/` e `/realizzazioni/` del breadcrumb sono relativi: con `/en/` vanno resi sensibili alla
lingua), protezione anti-spam del modulo.

Verificato con Chrome headless a 1440px e confrontato con la preview del mockup
(2026-10-20 e 21). **Il mobile non è stato verificato**: lo screenshot headless
non scende sotto ~500px.

### Header e footer (199 e 200)
- **Header**: topbar (payoff, MEPA, Contatti, telefono, selettore lingua
  `[artes_lingue]` = "IT / EN"), riga logo con "Area Progettisti" e
  "Contattaci", riga menu a due gruppi con il widget `nav-menu` sul menu
  `Header`. Il logo viene dal tag `site-logo`. I link a pagine interne usano
  l'oggetto nativo `{id, label}` (WPML li traduce per lingua), non il tag
  `internal-url`, che non viene applicato.
- **Responsive**: sotto i 1366px spariscono topbar e riga menu e compare un
  secondo widget `nav-menu` in modalità hamburger (stessa soglia del mockup); sotto
  i 1024px sparisce "Area Progettisti", sotto i 641 anche "Contattaci".
  Verificato a 1440, 1100 e 800px. **Non verificata l'apertura del menu
  hamburger** (richiede un click) né il menu aperto su mobile.
- **Footer**: 5 colonne (logo e testo, Azienda, Settori, Risorse, Contatti con
  CTA "Richiedi un progetto") e barra inferiore. I tre elenchi sono menu
  WordPress. Fondo `--sand` (#111).
- Header sticky tramite CSS del kit sul contenitore `.elementor-location-header`.
- **Menu mobile (correzioni del 2026-10-21 sera)**: aprendo l'hamburger il pannello
  finiva fuori schermo (pagina larga 696px su 390). Elementor lo posiziona con uno
  spostamento calcolato in JavaScript sul widget; qui il widget è largo 44px, quindi
  il calcolo sbaglia. Il kit ora ancora il pannello alla riga del logo
  (`.hdr-masthead { position: relative }`, pannello `left: 0; width: 100%`) senza
  toccare `max-height` e `transform` (sono lo stato aperto/chiuso). Verificato con
  emulazione di un telefono a 390px: pannello a tutta larghezza, nessuno scroll
  orizzontale.
- **Footer su mobile**: i tre elenchi non devono diventare hamburger. Il widget
  `nav-menu` ha come default `dropdown: tablet`: nei footer è `dropdown: none`.
- **Le voci di menu non si muovono**: al passaggio del mouse Elementor applica il
  suo padding (`13px 20px`), che allargava la voce di 40px e la alzava di 5px; nel
  footer spingeva giù tutto (+19px di altezza della pagina). Il padding è ora fissato
  in ogni stato (normale, hover, focus, attivo) con `!important`. Misurato con
  `tools/cdp.js hover`: spostamento 0, larghezza e altezza invariate, pagina invariata.
  Stessa misura su pulsanti, chip dei brand e link: nessuno si sposta, cambiano solo
  colore, sfondo o bordo (con la transizione di 0.25s).
- Voci del mockup non ancora presenti: Blog nel menu principale; Prodotti, MEPA / PA,
  Cataloghi PDF, Blog nel footer; informativa privacy.

### Sezione contatti e modulo (in fondo al template 138)
Come nelle schede del mockup: a sinistra intro ("Un progetto simile in programma?",
testo, telefono, email, sede), a destra il **modulo** con il widget `e-form` di Elementor
Pro. Sorgente: `tools/lib-contatti.ps1` (funzione `New-ContattiSection`), pensata per
essere riusata nelle pagine Contatti e Richiedi preventivo.
- **Campi**: nome e cognome*, azienda o ente, email*, telefono, chi sei (menu), settore
  (menu, preselezionato dal settore della scheda), località, tempistiche (menu),
  messaggio*, allegati (PDF, DWG, JPG, PNG; **fino a 3 file di 10 MB**), privacy*, più il
  campo nascosto `progetto` con il titolo della scheda. Esito: messaggio di conferma o di
  errore (richiesta del mockup: "un tecnico ti ricontatta entro due giorni lavorativi").
- **Invio**: azione `email` verso **`info@artes.it` (destinatario TEMPORANEO**, da
  sostituire con quello definitivo in `lib-contatti.ps1`, variabile
  `$DestinatarioEmail`, e rigenerare). Oggetto "Nuova richiesta dal sito ARTES", corpo con
  tutti i campi, **Reply-To = email di chi scrive** (`[email]`), HTML.
- **Allegati**: modalità "attach" (l'allegato viaggia con l'email). Il plugin ammette i
  `.dwg` (WordPress non li conosce) e **cancella i file dal server appena l'email è partita**
  (Elementor li lascia in `uploads/elementor/forms` con il nome originale, raggiungibili da
  chiunque indovini l'indirizzo); una pulizia giornaliera elimina quelli rimasti.
- **Verificato end-to-end** (2026-10-21) con invio vero dal browser, email intercettata
  senza inviarla: tutti i campi e le etichette corrette, Reply-To giusto, allegato DWG
  presente al momento dell'invio e rimosso subito dopo, progetto e settore corretti. Layout
  a 1440px e a 390px emulati.
- **Limiti noti**: (1) **nessuna protezione anti-spam** (il widget non ha captcha né
  honeypot): serve prima della messa online; (2) nei menu a tendina e nella casella privacy
  l'`id` lo genera Elementor solo se si imposta `_cssid` (fatto), ma il testo della casella
  privacy non è un link all'informativa (la pagina non esiste ancora); (3) il mittente
  ("From") è l'indirizzo generico del sito: per un recapito affidabile serve un plugin SMTP;
  (4) l'email arriva con la funzione di posta di default di WordPress, **non verificata su un
  invio reale**.

### Archivio realizzazioni (213)
Corrisponde a `realizzazioni.html` del mockup: intestazione ("Progetti consegnati." e
testo), filtri per settore, griglia a 3 colonne di card (immagine, nome, località,
settore), fascia finale "Un progetto simile in programma?" con i due pulsanti.
- **Un solo template per archivio e settori.** I filtri non usano JavaScript: sono un
  menu WordPress ("Filtri realizzazioni") i cui link portano alle pagine dei settori
  (`/settore/arredo-hotel-hospitality/`…). Vantaggi: URL indicizzabili, nessun JS,
  WPML traduce il menu. Il chip attivo è la voce `current-menu-item`; "Tutti" è
  attivo solo sull'archivio completo (classe `filtro-tutti`, gestita dal plugin).
- **Ordine**: come nel mockup (Aurea, BBC di Tarsia, Jumecitu…), dal campo `menu_order`
  (1–14, `tools/setup/ordine-realizzazioni.php`). I progetti nuovi hanno ordine 0 e
  compaiono per primi. Il campo "Ordine" è abilitato nel CPT (`page-attributes`).
- **Paginazione**: 12 per pagina, con "Precedente / Successiva" (il widget Loop ha solo
  quella; non numera le pagine). Elementor la nasconde con una sola pagina; il
  pulsante disattivato si nasconde dal CSS del kit.
- Il loop usa `source: current_query`, ma **il widget ha un suo `posts_per_page`
  (predefinito 3) che prevale**: va impostato (12) anche nella composizione.
- Verificato: 12 + 2 card (14), `uffici` 6, `hotel` 4, `food` 1; layout a 1440px e a
  390px emulati, senza scroll orizzontale.
- **Non portato dal mockup**: lo zoom dell'immagine e il velo rosso al passaggio del
  mouse sulle card (sono hover che si muovono: coerente con la richiesta di hover
  senza spostamenti). I chip dei filtri non hanno hover (sono un menu).

## 6. Plugin `artes-core` (filtri dei cicli)

File: `wp/artes-core/artes-core.php`. Elementor chiama
`elementor/query/<query_id>` prima di eseguire la query di un widget Loop; il
"Query ID" del widget è il nome del filtro. Tre filtri: `artes_galleria`
(allegati del campo `galleria`), `artes_brand_collegati` (relazione JetEngine),
`artes_altre_realizzazioni` (stesso settore, esclusa la corrente). Un
`post__in` vuoto restituirebbe tutti gli articoli: il codice usa `[0]`.

Dal 2026-10-21 sera (versione 0.2.4) il plugin contiene anche:
- **DWG negli allegati**: filtri `upload_mimes` e `wp_check_filetype_and_ext` (il DWG è
  accettato solo se l'estensione è `.dwg` e il tipo letto dal server è uno dei tipi dei CAD);
- **privacy degli allegati**: `wp_mail_succeeded` cancella i file in
  `uploads/elementor/forms` dopo l'invio, e un evento giornaliero (`artes_core_clean_form_uploads`)
  elimina quelli più vecchi di un giorno;
- filtro `elementor_pro/atomic_forms/email_message`: sostituisce nel corpo dell'email il link
  al file (non più valido) con "nome.ext (in allegato)";
- script nel footer che **preseleziona il menu "Settore"** del modulo (settore della scheda, o
  parametro `?settore=`), perché il widget select non accetta un valore dinamico;

- shortcode `[artes_lingue]`: selettore lingua "IT / EN" per la topbar, basato
  sul filtro `wpml_active_languages` (gli shortcode `wpml_language_*` non
  esistono in WPML 5.1);
- shortcode `[artes_titolo]` (ultima parola del titolo in `<strong>`) e
  `[artes_settore_ambito]` (riga "Settore"), usati nei widget tramite il tag
  dinamico "Shortcode";
- filtro `nav_menu_css_class`: tiene attiva la voce "Realizzazioni" su schede,
  archivio e settori; la voce "Tutti" del filtro solo sull'archivio completo;
- `pre_get_posts`: nell'archivio e nei settori 12 progetti per pagina, ordinati
  per `menu_order` crescente e poi per data decrescente.

Il plugin carica anche il CSS del sito (`artes-core.css`, vedi §2).

**Installazione (2026-10-21 sera): è un plugin vero** su dev3 (oggi versione 0.2.4), cartella
`wp-content/plugins/artes-core/` (file `artes-core.php` e `artes-core.css`). La vecchia
copia nella sandbox di Novamira è stata **rimossa**. Novamira non scrive file `.php`
fuori dalla sandbox, nemmeno con l'upload; accetta però uno ZIP, che si installa con
WP-CLI: lo fa `tools/install-plugin.ps1` (impacchetta, carica, installa, toglie la
sandbox, attiva, verifica, svuota cache). Lo stesso ZIP (`tools/out/artes-core.zip`) si
carica in produzione da Plugin → Aggiungi. Per modificare: cambiare i file in
`wp/artes-core/` e rilanciare lo script. Il plugin è sicuro se ne esiste una seconda
copia (`ARTES_CORE_VERSION`), ma la vecchia copia 0.1 della sandbox non aveva il guard:
per questo lo script la rimuove **prima** di attivare.

## 7. Cose imparate (valgono per il lavoro futuro)

- **Plugin su dev3**: Novamira scrive `.php` solo nella sandbox; per un plugin vero si
  carica uno ZIP con il link di upload e si installa con WP-CLI (`tools/install-plugin.ps1`).
  Prima di attivare va tolta la vecchia copia della sandbox (stesse funzioni = errore
  fatale in attivazione, che però non rompe il sito: il plugin resta inattivo).
- **Loop Elementor o Listing Grid di JetEngine?** Il widget `jet-listing-grid` è
  *sconosciuto* al connettore Elementor (`Unknown widget type`): non si può costruire con
  questi strumenti. Resta il Loop V4 con i filtri `elementor/query/<id>` del plugin
  (verificato e funzionante). Il Listing Grid richiederebbe di inserirlo a mano
  nell'editor, più i template di listing; il plugin servirebbe comunque per shortcode,
  selettore lingua, menu e archivio.
- In PowerShell `cli` è un alias di `Clear-Item`: non chiamare così una funzione.
- **Moduli (`e-form`)**: il `name` e l'`id` del campo vengono dal `_cssid` (anche se lo schema
  non lo elenca per select, file e checkbox: funziona); senza `_cssid` l'email mostra nomi
  tecnici (`e-form-select-33`). Un `_cssid` uguale a una variabile di query di WordPress
  (`settore` è anche una tassonomia) dà un'etichetta sbagliata (`0`): il campo si chiama
  `richiesta_settore`. Per il Reply-To si usa `[cssid]` (es. `[email]`); `[field id="…"]`
  vuole l'id interno dell'elemento e restava vuoto.
- **Il widget select raddoppia le `&`** (`&amp;amp;` a video, valore che non combacia). Si
  corregge dopo la pubblicazione con `tools/fix-form-ampersands.ps1` (parte da
  `rebuild-template.ps1`). **Pubblicare copia i dati dalla bozza**: la correzione va fatta
  *dopo* `publish`, non prima.
- L'**anteprima di una pagina in bozza** mostra una revisione salvata alla creazione del link:
  modifiche fatte dopo direttamente nei dati non si vedono. Per provare davvero si usa il
  template pubblicato.
- Un test di invio vero senza spedire nulla: file temporaneo nella sandbox con un filtro
  `pre_wp_mail` che registra il messaggio e restituisce `true` (da **rimuovere sempre dopo**,
  altrimenti le richieste vere non partono). `tools/cdp.js eval … --file` compila il modulo
  e carica un allegato.
- Il file di allegati resta sul server con il nome originale: vedi il plugin.

- Dopo `build-composition` su un documento già pubblicato bisogna
  **ripubblicare** e **svuotare le cache di Elementor** (`tools/flush.php`),
  altrimenti il sito serve la versione vecchia. `rebuild-template.ps1` fa tutto.
- Il campo `query_id` del widget Loop non è una query JetEngine.
- I widget Loop e i loro layout/item hanno padding di default: azzerarlo con
  `padding: 0` nello stile locale per allinearli al resto.
- I tag dinamici accettano `before`/`after` che compaiono solo se il valore non
  è vuoto: usati per il trattino fra settore e ambito.
- Nascondere una riga con valore vuoto: classe con `&:has(.valore:empty)
  { display: none }`. Gli elementi V4 non hanno condizioni di visualizzazione.
- Per le immagini dentro un ciclo di allegati: tag `jet-object-property-image`
  con `custom_object_prop = ID` (non `object_prop`).
- Le linee guida di `build-composition` incoraggiano ombre, gradienti e angoli
  arrotondati, vietati dal nostro stile: usare solo classi e variabili nostre.
- I tool MCP di JetEngine richiedono nonce `wp_rest` e payload `{"input": …}`;
  il campo `__dynamic_posts` della query contiene le macro, non i valori.
- `elementor/manage-site-parts` crea i site part in **bozza**: vanno pubblicati.
- Link a una pagina interna in un widget: oggetto nativo `{"id": 152, "label":
  "Contatti"}` come `destination`. Il tag dinamico `internal-url` non viene
  applicato (resta un `<button>` o un testo senza link).
- Gli shortcode di WPML per il selettore lingua non esistono in 5.1: serve uno
  shortcode proprio (`[artes_lingue]`). Il tag dinamico "Shortcode" accetta
  HTML dentro ai widget titolo e paragrafo.
- Il widget `nav-menu` (V3) accetta solo menu, layout e hamburger: stile e
  responsive passano dal CSS del kit. I `classes` globali non servono su di lui;
  una voce di menu con classe CSS (`nav-sep`) funziona.
- Le regole che nascondono un elemento con `display: none` perdono contro gli
  stili dei contenitori Elementor: usare `!important`.
- La voce di menu attiva si basa su `current-menu-item`: un link personalizzato
  non lo ottiene da solo (filtro `nav_menu_css_class` nel plugin).

- **`Compress-Archive` di PowerShell 7 su Windows scrive i percorsi dello ZIP con la barra rovesciata**: WordPress scompatta file chiamati `artes-coreartes-core.php` e il plugin sparisce (sito senza CSS/filtri). `install-plugin.ps1` ora usa `System.IO.Compression` con `/`. Se capita: cancellare la cartella `wp-content/plugins/artes-core` e rilanciare lo script.
- Un ciclo (Loop) senza risultati riceve `display: none` inline: si usa `:has(.correlate-grid[style*="display: none"])` per nascondere anche titolo e fascia.
- Il widget select raddoppia `&` e gli apostrofi nelle opzioni: dopo `publish` si lancia `fix-form-ampersands.ps1 -Ids "154,152,138"` (stringa, non array).
- Il connettore accetta al massimo 50 operazioni per chiamata (usare lotti da 25); `elementor/manage-site-parts` vuole `operations:[{action:create|update,...}]` e crea in bozza.

- **Stato del sito dopo il giro di controllo**: nessun meta description, nessuna favicon (`site_icon` = 0), sito **indicizzabile** (`blog_public` = 1, nessun noindex), post "Hello world!" pubblico, nessun plugin SMTP / anti-spam / cookie banner, banner WPML di sviluppo in fondo alle pagine (sparisce con la chiave di produzione).
- La lightbox riconosce le immagini dalle classi `gallery-img` e `scheda-hero` (gruppo = `.scheda-media`): per una gallery nuova basta dare quelle classi alle immagini, nessun codice.
- Il widget Paragrafo toglie le classi dall'HTML degli shortcode (e chiude il `<p>` prima di un `<ul>`): l'HTML degli shortcode si stila per struttura (`.finiture-panel ul li span`), non per classe.
- `.scheda-specs` ha una sola colonna se dentro non c'è `.brand-chip` (regola della classe globale): il plugin la riporta a due colonne quando c'è la lista categorie prodotto.
- Titoli lunghi in grassetto (`<strong>`) possono sforare a 390px: controllare sempre lo scroll orizzontale.

## 8. Registro modifiche

| Data | Cosa |
|---|---|
| 2026-11-20 (seconda parte) | **Adeguamento alla rev2, fase 4 (template e archivi)**: site part **1040** (singolo realizzazione), **1049** (singolo brand), **1050** (archivio realizzazioni), **1051** (archivio brand) pubblicati con condizioni generali; header 557 e footer 971 rev2 sulle 4 condizioni dei contenuti; vecchi 138/448/213/447 in bozza (condizioni originali conservate); opzione `artes_rev2_cpt` = 1; plugin `artes-core` **0.6.2** (8 shortcode, filtri dei cicli, `window.ArtesRev2Dati`, redirect 301 dei termini, filtro `request` che toglie `settore`/`categoria` dalla query degli archivi); JavaScript rev2 con lightbox e filtri; **campi del vecchio modello tolti** (12 definizioni, 45 valori su 11 articoli, 11 regole WPML; salvati e annullabili). Verifica: parità su 40 pagine, salute 80/80, reindirizzamenti 17/17, `verifica-dati.js` 1094/1094. I menu `filtri-realizzazioni` e `filtri-brand` restano (la Home vecchia usa il primo) |
| 2026-11-20 | **Adeguamento alla rev2, fase 3 (dati)**: `settore` rinominata e riordinata (slug `uffici`, `retail`, `bar-ristoranti`, `food`, `hospitality`); **nuova tassonomia `categoria`** (26 termini); `categoria_brand` con i nomi rev2 ("Pareti e pod"); 11 campi nuovi (7 su `realizzazione`, 4 su `brand`) con regole WPML; **20 realizzazioni e 18 brand** allineati alla rev2 (10 realizzazioni nuove, 2 rinominate con redirect); 27 allegati-copia con alt dedicato; 8 relazioni brand ↔ progetti; **nel cestino** i 4 progetti fittizi e Mottura; link vecchi delle pagine settore 144-148 aggiornati. Verifica: `tools/rev2/verifica-dati.js` 1028/1028 (prima 185/550) |
| 2026-11-19 | **Adeguamento alla rev2, fasi 0-2** (dettagli in §9): backup/snapshot; 149 immagini nuove nella libreria; 246 classi globali nuove + 14 di appoggio, 23 vecchie rinominate `o-*` (le pagine vecchie restano pixel-identiche); plugin `artes-core` **0.5.0** (modalità `rev2`: `artes-rev2.css`/`.js`); header **557** e footer **971** rev2 con condizione solo sulla pagina di prova **542**; pagine di prova Chi siamo e Contract in parità con la rev2; modelli `[Riserva]` dei moduli (539-541) |
| 2026-11-05 | **Testi discorsivi nelle 5 pagine settore** (blocco `racconto` dopo la foto principale: frase d'apertura grande + 4 righe titolo/paragrafo a tutta larghezza, niente riquadro in alto a destra). Testi **inventati come bozza**, il cliente li riscriverà. Aggiunto prima nel mockup (sezione 17 di `artes.css`, `extract-settori.js`) e poi su WordPress (`Block-Racconto` in `lib-blocchi.ps1`, 6 classi da `setup/classi-racconto.ps1`, `rebuild-pagine-settori.ps1`). Per cambiare i testi: si modifica l'HTML del mockup e si rilanciano estrazione e ricostruzione |
| 2026-11-04 | Pagine **Cataloghi PDF (491), Privacy policy (3), Cookie policy (493)**: testi di bozza, 5 classi nuove (`legale`, `legale-col`, `legale-h`, `legale-p`, `legale-li`), footer con link legali, consenso dei moduli con link all'informativa. Verificato che il sito non imposta cookie a un visitatore anonimo; **i caratteri sono caricati da Google Fonts** (dichiarato nell'informativa; da scaricare in locale prima della produzione). `extract-pagine.js` ora estrae di default tutte e 8 le pagine (prima `rebuild-pagine-modulo` falliva se `pagine.json` era stato rigenerato con meno file) |
| 2026-10-28 | **Lightbox delle gallerie** (plugin 0.4.0, nuovo file `artes-core.js`): clic su immagine di galleria o sull'immagine principale di realizzazioni e brand → schermo intero a piena risoluzione (URL senza suffisso -LxA), frecce, tastiera (← → Esc), swipe, contatore, didascalia dall'alt, scroll bloccato, focus gestito. Stile come i pulsanti del sito. `install-plugin.ps1` ora impacchetta anche il JS |
| 2026-10-21 (notte, 4) | **Verifica degli hover** su 7 tipi di pagina (nuovi comandi `cdp.js hoverall` e `hovercard`). Regola unica: testo cliccabile → rosso; pulsanti e chip → bordo/sfondo grafite; card con immagine → titolo rosso e immagine a opacità .88; mosaico settori → velo scuro. Corretti: chip dei filtri e pulsanti di paginazione (senza hover), titoli delle card progetto/brand/correlate (restavano neri), mosaico home. Voci dei menu header/footer: su richiesta dopo il controllo, **solo cambio colore in rosso** (transizione morbida, padding fisso, nessun movimento); la voce attiva dell'header resta com'è |
| 2026-10-21 (notte, 3) | **Giro di controllo di tutto il sito** (62 URL, desktop 1440 e mobile 390: scroll orizzontale, immagini, titoli, link, testi sospetti; 123 link interni verificati). Corretto: link di Area progettisti verso Aurea (`Convert-Url` ora mappa `realizzazione-*` e `brand-*`), logo del footer reso visibile con un filtro CSS (`.footer-logo`), filtri della home su mobile sotto il titolo. Plugin: regole nuove nel CSS. Nessun altro difetto trovato |
| 2026-10-21 (notte, 2) | Scheda brand completa (6 campi nuovi, shortcode `[artes_categoria_brand]` e `[artes_categorie_prodotto]`, template 448 esteso), Pedrali compilato, 3 immagini importate. Pagine **Prodotti (471)** e **MEPA / PA (472)** nel mockup e su dev3, voci nel menu footer. Il link del footer del mockup ora punta a `prodotti.html` e `mepa.html` |
| 2026-10-21 (notte) | Pagine settore, home, 4 istituzionali, Contatti e Preventivo costruite (vedi §5). **Brand Partner**: archivio (447) e singolo brand (448), menu `filtri-brand`, 4 classi (`brand-lista`, `brand-card`, `brand-card-n`, `brand-card-c`). Plugin 0.3.5: ordine/tutti i brand in archivio, query `artes_progetti_brand`, voce "Tutti" del filtro brand, CSS che nasconde "Progetti con…" se vuoto. **`install-plugin.ps1` corretto**: lo ZIP si crea con barre normali (vedi §7) |
| 2026-10-21 (sera, 7) | Sezione contatti con modulo e invio email nel template 138 (destinatario temporaneo `info@artes.it`, DWG ammessi), 13 classi nuove. Plugin 0.2.4: DWG, cancellazione degli allegati dopo l'invio, link nell'email, preselezione del settore. Test end-to-end con invio vero e intercettazione (poi rimossa). Pagina di prova 28 nel cestino. Verificato mobile e desktop |
| 2026-10-21 (sera, 6) | Plugin `artes-core` 0.2.0 **installato come plugin vero** (ZIP + WP-CLI), vecchia copia della sandbox rimossa. Il CSS del sito ora lo carica il plugin (priorità 9999) e il CSS del kit è stato svuotato. Nuovo `tools/install-plugin.ps1` al posto di `apply-kit-css.ps1` e `deploy-plugin.ps1` (eliminati). Rifatte tutte le misure (transizioni, hover, mobile): invariate |
| 2026-10-21 (sera, 5) | Archivio realizzazioni (site part 213, anche per le pagine dei settori) con menu filtri, 16 classi nuove, ordine del mockup (`menu_order`), 12 per pagina con paginazione. Brand Mottura (214) aggiunto e collegato ad Aurea (anche nel mockup). Plugin: ordine e paginazione dell'archivio, voce "Tutti" del filtro |
| 2026-10-21 (sera, 4) | Menu mobile: pannello hamburger ancorato (non più fuori schermo); footer senza hamburger su mobile (`dropdown: none`); voci di menu ferme in hover (padding fissato in ogni stato). Nuovo strumento `tools/cdp.js` (emulazione telefono, click, misura dell'hover) al posto di `computed-style.js` |
| 2026-10-21 (sera, 3) | Hover non più a scatto: transizione unica `--artes-hover` (.25s ease, solo colore/sfondo/bordo/opacità) su link, pulsanti, campi e componenti; menu invariati (poi: solo colore in hover, vedi registro 2026-10-21 notte, 4). Verificato con stili calcolati |
| 2026-10-21 (sera, 2) | Menu di header, hamburger e footer senza animazioni di base di Elementor né hover (CSS del kit) |
| 2026-10-21 (sera) | Disattivate le animazioni predefinite del tema Hello Elementor (CSS del kit): transizioni su pulsanti, campi modulo e menu del tema |
| 2026-10-21 | Pagine segnaposto (11), 4 menu WordPress, logo. 22 classi di header/footer. Site part header (199) e footer (200) pubblicati. CSS del kit applicato da file. Plugin: shortcode `[artes_lingue]`, `[artes_titolo]`, `[artes_settore_ambito]` e filtro del menu attivo. Template 138: titolo con ultima parola in grassetto, riga Settore con ambito, fondo alternato. Confronto visivo con il mockup a 1440 e header a 1100/800px |
| 2026-10-20 | Collegati i connettori MCP di dev3 (Elementor e Novamira). Variabili (27) e classi base (13). Modello dati JetEngine, WPML configurato, permalink. Import 14 realizzazioni, 18 brand, 47 immagini. Aggiunti campi `cliente` e `arredi`. Template singolo realizzazione (site part 138), 28 classi scheda, plugin `artes-core`. Eliminate 3 query JetEngine inutilizzate |

## 9. Adeguamento alla rev2 (in corso dal 2026-11-19)

Piano e decisioni: [`piano-adeguamento-rev2.md`](piano-adeguamento-rev2.md); regole di conversione: [`rev2-regole-di-conversione.md`](rev2-regole-di-conversione.md).
**Convivenza di vecchio e nuovo design**: finché non si arriva al passaggio finale (fase 9) il sito mostra il design vecchio; il design rev2
si accende solo dove richiesto (pagine con meta `_artes_rev2`, oppure URL con `?artes_rev2=1`).

**Oggetti su dev3 legati alla rev2**

| Oggetto | ID | Note |
|---|---|---|
| Plugin `artes-core` | — | **0.6.1** (0.5.0 fase 2, 0.6.0-0.6.1 fase 4): in modalità rev2 carica `artes-rev2.css`/`.js` al posto di `artes-core.css`/`.js`, aggiunge la classe `rev2` al `<body>`, toglie i fogli del tema Hello e i font di Elementor e carica i font della rev2. Fase 4: shortcode `artes_breadcrumb`, `artes_eyebrow`, `artes_settore_link`, `artes_categoria_link`, `artes_galleria_titolo`, `artes_scopri_testo`, `artes_url_pagina_settore`, `artes_cta_brand`; filtri dei cicli `artes_archivio_realizzazioni`, `artes_archivio_brand` e `artes_altre_realizzazioni` (ordine come la rev2); `window.ArtesRev2Dati` (settori e categorie dai termini, per i filtri); redirect 301 delle pagine dei termini all'archivio filtrato. Gli shortcode del vecchio modello (`artes_settore_ambito`, `artes_categoria_brand`, `artes_categorie_prodotto`) restano per i template vecchi in bozza |
| Opzione `artes_rev2_cpt` | — | `1` dal 2026-11-20: la modalità rev2 vale per tutte le schede e gli archivi di realizzazioni e brand (e accende i redirect dei termini). Per tornare indietro: `0`, vedi "Tornare indietro" sotto |
| Header rev2 | **557** | "Header ARTES (rev2)"; **condizioni dal 2026-11-20**: `include/singular/realizzazione`, `include/singular/brand`, `include/archive/realizzazione_archive`, `include/archive/brand_archive` (le altre pagine hanno ancora l'header vecchio 199, `include/general`) |
| Footer rev2 | **971** | "Footer ARTES (rev2)"; stesse condizioni. Dati reali di Artes srl (rev2) |
| Template dei contenuti rev2 | **1040**, **1049**, **1050**, **1051** | site part pubblicati: singolo realizzazione, singolo brand, archivio realizzazioni, archivio brand (§5). Sorgenti in `tools/rev2/modelli/`; si rigenerano con `node tools/rev2/costruisci-modello.js <nome> --invia <id> --pubblica` |
| Pagina di prova | **542** | bozza "SPIKE rev2 - prova tecnica (da eliminare)": ospita via via le pagine in collaudo (oggi ha il modello dell'archivio brand, `_artes_rev2`=1); da eliminare con la fase 9 |
| Modelli dei moduli | 539, 540, 541 | libreria Elementor, prefisso "[Riserva]": le 3 sezioni con modulo tolte dalla rev2, per rimetterle |
| Header/footer vecchi | 199, 200 | restano finché non si accende la rev2 per tutto il sito |
| Immagini rev2 | — | 180 allegati usati dalle pagine rev2: 149 nuovi (meta `_artes_src` = `rev2:<percorso>`, testo alternativo dalla rev2) e 31 riusati dal vecchio import (alt aggiornato); mappa percorso→ID in `tools/out/rev2/media-rev2.json` |
| Classi globali | — | 473 totali: 213 del vecchio design (23 rinominate `o-<nome>` perché in collisione), 260 della rev2 (stesso nome della rev2; solo etichetta, `--a: 0;`, lo stile è nel CSS del plugin) |

**Cose da sapere**

- Il CSS della rev2 non si scrive a mano: `tools/rev2/port-css.js` lo genera da `artes-sito-rev2/assets/css/artes.css` (`wp/artes-core/artes-rev2.css`);
  il JavaScript (`artes-rev2.js`) è scritto a mano e ripropone le interazioni della rev2 (tendina, menu mobile, voce attiva) più il rimettere gli attributi
  che i widget non possono scrivere. Rilascio: `tools/install-plugin.ps1`; giro veloce durante il collaudo: `node tools/rev2/push-asset.js`.
- Le pagine rev2 si generano dall'HTML con `node tools/rev2/costruisci.js pagina <nome> --invia <id>` (e `header`/`footer`); si guardano con
  `node tools/rev2/anteprima.js <id>` e si misurano con `parita.js`, `geometria.js`, `collaudo-header.js` (vedi `tools/README.md`).
- Il banner "development site" di WPML è sempre in fondo alle pagine di dev3: non fa parte del design.
- Il kit di Elementor (variabili, tipografia) **non è stato toccato**: si aggiorna al passaggio finale.
- **Dati (fase 3, 2026-11-20)**: modello, ID e regole al §3 e §4. I campi del vecchio modello sono stati tolti a fine fase 4 (vedi sotto); le immagini non più usate
  si elencano per la fase 9 (la cancellazione dei file richiede conferma).
- **Template e archivi (fase 4, 2026-11-20)**: le schede e gli archivi di realizzazioni e brand usano i site part 1040/1049/1050/1051, scritti come HTML con attributi
  `data-dyn`/`data-loop` (`tools/rev2/modelli/`) e convertiti in widget con tag dinamici nativi di Elementor/JetEngine e shortcode del plugin per i valori calcolati.
  Regole e cose imparate: [`rev2-regole-di-conversione.md`](rev2-regole-di-conversione.md) §8. Misurati su **tutte** le schede (20 + 18) e i 2 archivi con
  `tools/rev2/parita-tutte.js`.
- **Campi del vecchio modello tolti (fine fase 4)**: `realizzazione` → `sottotitolo_ambito`, `cliente`, `superficie`, `ambienti`, `arredi`, `servizi_artes`, `tempi`;
  `brand` → `sottotitolo_categoria`, `ambiti_artes`, `certificazioni`, `categorie_prodotto`, `galleria` (la `galleria` delle realizzazioni resta). Tolti dalle definizioni
  JetEngine, dalle regole WPML (tranne `galleria`, usata dal modello nuovo) e dagli articoli che restano; **gli articoli nel cestino non sono stati toccati**. Prima di
  scrivere, `import-dati.js pulizia` ha salvato tutto in `tools/out/rev2/fase4-campi-rimossi.json` (definizioni complete, valori, regole WPML). I template vecchi in bozza
  (138, 448) e gli shortcode del vecchio modello nel plugin li leggono ancora ma restano vuoti: si eliminano insieme ai template vecchi nella fase 9.
- **Menu dei filtri** (`filtri-realizzazioni`, `filtri-brand`): **non eliminati**. Il primo serve ancora alla Home pubblicata (376, design vecchio), il secondo all'archivio brand
  vecchio in bozza (447). Le voci sono di tipo tassonomia e seguono i termini. Si eliminano quando la Home viene ricostruita con la rev2 (fase 5) o al più tardi alla chiusura (fase 9);
  l'istantanea con la loro struttura è in `tools/out/backup-2026-11-19/menu.json`.
- **Tornare indietro** (se le schede o gli archivi nuovi dovessero dare problemi): 1) opzione `artes_rev2_cpt` a `0`; 2) rimettere in pubblicazione 138, 448, 213, 447 (le loro
  condizioni originali sono conservate) e in bozza 1040, 1049, 1050, 1051; 3) condizioni di 557 e 971 solo `include/singular/page/542`; 4) se servono i campi vecchi:
  `node tools/rev2/import-dati.js annulla-pulizia`; 5) svuotare le cache di Elementor (`tools/rebuild-template.ps1` lo fa). Il backup completo del titolare (2026-11-19) resta l'ultima rete.
