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
| CPT `realizzazione` (id JetEngine 1) | archivio `/realizzazioni/`, supporta titolo, immagine in evidenza, riassunto, revisioni. Campi: `sottotitolo_ambito` `introduzione` (textarea) `cliente` `localita` `superficie` `ambienti` `arredi` `servizi_artes` `tempi` `progettista` `galleria` (gallery, ID separati da virgola) |
| CPT `brand` (id 2) | archivio `/brand-partner/`, campo `introduzione` |
| Tassonomia `settore` (id 1) | su `realizzazione`, non gerarchica; termini 3–7: Arredo uffici & workspace, negozi & retail, negozi food, bar & ristoranti, hotel & hospitality (slug `arredo-…`) |
| Tassonomia `categoria_brand` (id 2) | su `brand`; termini 8–15: Ufficio, Contract, Acustica, Pareti / pod, Sedute, Retail, Food, Outdoor |
| Relazione "Realizzazioni - Brand" (id 3) | molti-a-molti, selettore da entrambi i lati |

Le tre query del Query Builder create il 20/10 sono state **eliminate**: non
servono, perché il widget Loop di Elementor non usa il Query Builder
(vedi §6).

### WPML sul modello dati
- CPT e tassonomie in modalità 2 (traducibili, ripiego sull'italiano se manca
  la traduzione).
- Campi *tradotti*: `sottotitolo_ambito introduzione ambienti arredi
  servizi_artes tempi progettista`. Campi *copiati*: `cliente localita
  superficie galleria`.
- **WPML non assegna da solo la lingua ai contenuti creati via PHP/REST.** Nei
  contenuti esistenti non era assegnata nemmeno a "Hello world!": assegnato `it`
  a tutto il 2026-10-20. Gli script di import la impostano
  (`wpml_set_element_language_details`).

## 4. Contenuti

| Cosa | Quanti | Note |
|---|---|---|
| Realizzazioni | 14, pubblicate, lingua `it` | importate da `realizzazione-*.html` |
| Brand | 19, pubblicati | Pedrali con introduzione, gli altri senza. **Mottura** (ID 214) aggiunta il 2026-10-21 su richiesta, categoria *Contract* (**ipotesi mia, da confermare**); aggiunta anche a `brand-partner.html` del mockup |
| Allegati | 47 | scaricati da GitHub Pages, tutti con alt, lingua `it` |
| Collegamenti relazione | Aurea → Pedrali, Caimi, Frezza, Kastel, Nardi Outdoor, Mottura | gli altri progetti non hanno brand nel mockup |

ID dei post `realizzazione`: Aurea 49, Arpacal 55, BBC Tarsia 60, Business
Hotel Fera 65, Costruzioni Imbrogno 67, Free Sport 71, Ingrediente School 76,
Jumecitu 81, Lico 86, Quotidiano 91, Resort Capo Bianco 96, Ruffolo Group 98,
Sakuralab 103, Spa Terme Luigiane 108. Brand: ID 31–48.

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
| Site part `single` "Singolo Realizzazione" | 138 | **pubblicato**, condizione `include/singular/realizzazione`. Generato da `tools/gen-template.ps1` |
| Site part `header` "Header ARTES" | 199 | **pubblicato**, `include/general`. Generato da `tools/gen-header-footer.ps1` |
| Site part `footer` "Footer ARTES" | 200 | **pubblicato**, `include/general`. Stesso generatore |
| Site part `archive` "Archivio Realizzazioni" | 213 | **pubblicato**, condizioni `include/archive/realizzazione_archive` e `include/archive/settore`: serve `/realizzazioni/` **e** le pagine dei settori (`/settore/<slug>/`). Generato da `tools/gen-archive.ps1` |
| Menu "Filtri realizzazioni" | — | slug `filtri-realizzazioni`: Tutti + 5 settori, mostrato come chip dal CSS del kit |
| Site part `archive` "Archivio Brand" | 447 | **pubblicato**, condizioni `include/archive/brand_archive` e `include/archive/categoria_brand`: serve `/brand-partner/` **e** le pagine delle categorie (`/categoria-brand/<slug>/`). Intestazione, filtri (menu `filtri-brand`: Tutti + 8 categorie, link alle categorie), griglia dei 19 brand su fondo alternato (tutti in una pagina, ordine del mockup), CTA "Vuoi diventare un brand partner?". Generato da `tools/gen-archive-brand.ps1` |
| Site part `single` "Singolo Brand" | 448 | **pubblicato**, condizione `include/singular/brand`. Intestazione (breadcrumb, categoria, nome, introduzione), "Progetti con <brand>" (ciclo `artes_progetti_brand` via relazione; **sezione nascosta dal CSS se il brand non ha progetti**), CTA. Generato da `tools/gen-single-brand.ps1`. Tutti i 19 brand sono cliccabili (nel mockup solo Pedrali). Scheda completa dal 2026-10-21: immagine principale (in evidenza) e galleria, specifiche (categoria estesa, ambiti, certificazioni, fornitura) e categorie prodotto, tutti **nascosti se vuoti**. Compilato solo **Pedrali** (da `setup/contenuti-pedrali.php`); gli altri 18 aspettano i contenuti del cliente. Campi aggiunti da `setup/campi-brand.php` (`sottotitolo_categoria`, `ambiti_artes`, `certificazioni`, `fornitura_artes`, `categorie_prodotto` una per riga "Nome | Ambito", `galleria`; WPML: testi tradotti, galleria copiata) |
| Home | 376 | **costruita e pubblicata**, impostata come pagina iniziale (`show_on_front=page`). Hero, metodo in 7 fasi, mosaico dei 5 settori, produzione, ultimi progetti con filtri, muro dei 19 brand, doppia CTA. Generata da `tools/rebuild-home.ps1` |
| Pagine dei 5 settori | 144–148 | **costruite e pubblicate** (`arredamento-ufficio`, `arredo-negozi`, `arredo-negozi-food`, `arredamento-bar-ristoranti`, `arredamento-hotel`): intestazione, fascia immagine, "Il settore" con 3 schede, ambiti con immagini, progetti del settore, CTA. Generate da `tools/rebuild-pagine-settori.ps1` |
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

- Il widget Paragrafo toglie le classi dall'HTML degli shortcode (e chiude il `<p>` prima di un `<ul>`): l'HTML degli shortcode si stila per struttura (`.finiture-panel ul li span`), non per classe.
- `.scheda-specs` ha una sola colonna se dentro non c'è `.brand-chip` (regola della classe globale): il plugin la riporta a due colonne quando c'è la lista categorie prodotto.
- Titoli lunghi in grassetto (`<strong>`) possono sforare a 390px: controllare sempre lo scroll orizzontale.

## 8. Registro modifiche

| Data | Cosa |
|---|---|
| 2026-10-21 (notte, 2) | Scheda brand completa (6 campi nuovi, shortcode `[artes_categoria_brand]` e `[artes_categorie_prodotto]`, template 448 esteso), Pedrali compilato, 3 immagini importate. Pagine **Prodotti (471)** e **MEPA / PA (472)** nel mockup e su dev3, voci nel menu footer. Il link del footer del mockup ora punta a `prodotti.html` e `mepa.html` |
| 2026-10-21 (notte) | Pagine settore, home, 4 istituzionali, Contatti e Preventivo costruite (vedi §5). **Brand Partner**: archivio (447) e singolo brand (448), menu `filtri-brand`, 4 classi (`brand-lista`, `brand-card`, `brand-card-n`, `brand-card-c`). Plugin 0.3.5: ordine/tutti i brand in archivio, query `artes_progetti_brand`, voce "Tutti" del filtro brand, CSS che nasconde "Progetti con…" se vuoto. **`install-plugin.ps1` corretto**: lo ZIP si crea con barre normali (vedi §7) |
| 2026-10-21 (sera, 7) | Sezione contatti con modulo e invio email nel template 138 (destinatario temporaneo `info@artes.it`, DWG ammessi), 13 classi nuove. Plugin 0.2.4: DWG, cancellazione degli allegati dopo l'invio, link nell'email, preselezione del settore. Test end-to-end con invio vero e intercettazione (poi rimossa). Pagina di prova 28 nel cestino. Verificato mobile e desktop |
| 2026-10-21 (sera, 6) | Plugin `artes-core` 0.2.0 **installato come plugin vero** (ZIP + WP-CLI), vecchia copia della sandbox rimossa. Il CSS del sito ora lo carica il plugin (priorità 9999) e il CSS del kit è stato svuotato. Nuovo `tools/install-plugin.ps1` al posto di `apply-kit-css.ps1` e `deploy-plugin.ps1` (eliminati). Rifatte tutte le misure (transizioni, hover, mobile): invariate |
| 2026-10-21 (sera, 5) | Archivio realizzazioni (site part 213, anche per le pagine dei settori) con menu filtri, 16 classi nuove, ordine del mockup (`menu_order`), 12 per pagina con paginazione. Brand Mottura (214) aggiunto e collegato ad Aurea (anche nel mockup). Plugin: ordine e paginazione dell'archivio, voce "Tutti" del filtro |
| 2026-10-21 (sera, 4) | Menu mobile: pannello hamburger ancorato (non più fuori schermo); footer senza hamburger su mobile (`dropdown: none`); voci di menu ferme in hover (padding fissato in ogni stato). Nuovo strumento `tools/cdp.js` (emulazione telefono, click, misura dell'hover) al posto di `computed-style.js` |
| 2026-10-21 (sera, 3) | Hover non più a scatto: transizione unica `--artes-hover` (.25s ease, solo colore/sfondo/bordo/opacità) su link, pulsanti, campi e componenti; menu invariati. Verificato con stili calcolati |
| 2026-10-21 (sera, 2) | Menu di header, hamburger e footer senza animazioni di base di Elementor né hover (CSS del kit) |
| 2026-10-21 (sera) | Disattivate le animazioni predefinite del tema Hello Elementor (CSS del kit): transizioni su pulsanti, campi modulo e menu del tema |
| 2026-10-21 | Pagine segnaposto (11), 4 menu WordPress, logo. 22 classi di header/footer. Site part header (199) e footer (200) pubblicati. CSS del kit applicato da file. Plugin: shortcode `[artes_lingue]`, `[artes_titolo]`, `[artes_settore_ambito]` e filtro del menu attivo. Template 138: titolo con ultima parola in grassetto, riga Settore con ambito, fondo alternato. Confronto visivo con il mockup a 1440 e header a 1100/800px |
| 2026-10-20 | Collegati i connettori MCP di dev3 (Elementor e Novamira). Variabili (27) e classi base (13). Modello dati JetEngine, WPML configurato, permalink. Import 14 realizzazioni, 18 brand, 47 immagini. Aggiunti campi `cliente` e `arredi`. Template singolo realizzazione (site part 138), 28 classi scheda, plugin `artes-core`. Eliminate 3 query JetEngine inutilizzate |
