# rev2 → WordPress: esito della prova tecnica e regole di conversione

**Data:** 2026-11-19 · **Fase 1 del** [`piano-adeguamento-rev2.md`](piano-adeguamento-rev2.md) · **Verificato su** dev3
(Elementor e Pro 4.4.1, Hello Elementor 3.5.2, WordPress 7.1.5). Pagina di prova: **542** (bozza). Header di prova:
**557** (condizione solo sulla pagina 542).

## 1. Esito: via libera

L'approccio del piano regge: il CSS della rev2 si può portare identico nel plugin, le pagine si possono generare
dall'HTML della rev2 con le stesse classi, e vecchio e nuovo design possono convivere su dev3 fino al passaggio finale.

## 2. Cosa ho verificato

| Domanda | Risposta |
|---|---|
| Etichette delle classi con `__` e `--` (BEM)? | **Ammesse** (anche punti, maiuscole, `_`). Si usano i nomi esatti della rev2 |
| Limite al numero di classi globali? | **1000** (`MAX_ITEMS` nel codice di Elementor); oggi 209 |
| Classe globale con CSS vuoto? | **Non ammessa** (`css` obbligatorio): per le classi "solo nome" si usa una proprietà innocua (`--a: 0;`) |
| Dove finisce il CSS delle classi globali? | In un file **per documento** (`global-<id>-frontend-desktop.css`), con **solo le classi usate nella pagina e nei suoi template**: le classi non usate non "sporcano" le altre pagine |
| Rinominare una classe esistente? | **Sì** (`update` con `id` e nuovo `label`): DOM e CSS delle pagine che la usano si aggiornano (provato su `eyebrow` → `o-eyebrow` e ripristinato) |
| Tag dei contenitori | `e-div-block` può essere `div`, `header`, `section`, `article`, `aside`, `footer`, `main`, `nav`, `a` (link), `button` |
| `id` sugli elementi (`#contatti`, `#categorie`) | **Funziona** con `_cssid` (anche sui contenitori) |
| HTML dentro titoli e paragrafi | Ammessi `b strong sup sub s em i u a del span br`, ma **gli attributi (anche `class`) vengono eliminati** |
| Lista (`ul/li`) | `e-list`: `<ul><li><div class="e-list-item__content"><p>…` (un `div` in più); marcatori disattivabili (`show_markers: false`) |
| Domande frequenti | `e-accordion` produce **`details/summary` nativi** e, con `faq_schema`, il JSON-LD `FAQPage` |
| Classi su elementi con link | Testo con link: classi sul `<p>`/`<span>` e `<a>` interno senza classi. Bottone (`e-button`): classi sul `<a>`/`<button>`. Contenitore con link (`tag a`): classi sul `<a>`. Immagine con link: classi sull'`<img>`, `<a>` senza classi |
| Voci dei cicli (loop) | **Nessuna classe dei termini e nessun attributo**: per i filtri servono elementi nascosti con settore e categoria, letti dal JavaScript |
| Attributi `data-*`, `aria-*`, `hidden` | **Non impostabili** dai widget: li aggiunge il JavaScript del plugin in base alle classi |
| Widget HTML / shortcode / testo | **Non disponibili** tramite il connettore: i frammenti con `dl`, `dt`, `dd`, `ol` vanno ricondotti a elementi e classi |
| Base dei contenitori | `.elementor .e-div-block-base { min-width:30px; padding:10px; display:block }`; titoli e paragrafi `margin:0`; link dentro testi `all: unset`; bottone con padding 12/24, raggio 2px, sfondo blu: tutto da azzerare |
| Annullare una modifica | `elementor-manage-revisions` con l'`undo_revision_id` restituito da ogni scrittura: **provato** |
| Header/footer solo per alcune pagine | **Funziona**: condizione `include/singular/page/<id>` sul template; le altre pagine restano con il 199/200 |
| Tag HTML della rev2 | `a div strong span p img section dt dd br button h1-h3 nav dl li details summary article ul ol small aside` |

## 3. Strategia di convivenza (vecchio e nuovo)

1. **Le classi vecchie** (209) si rinominano con il prefisso `o-` (le pagine attuali continuano a funzionare e a
   mostrare il vecchio design); le classi nuove nascono con i nomi esatti della rev2.
2. **Interruttore `rev2`** nel plugin: classe `rev2` sul `<body>` per le pagine con meta `_artes_rev2` oppure con
   `?artes_rev2=1` (anteprima). Con l'interruttore acceso il plugin carica il CSS e il JavaScript nuovi, altrimenti
   quelli vecchi.
3. **Il CSS portato** ha il prefisso `body.rev2 .elementor` (batte le regole di base di Elementor e non tocca le
   pagine vecchie).
4. **Header e footer nuovi** sono template separati con condizione sulle sole pagine nuove; al passaggio finale
   diventano `include/general` e i vecchi si tolgono.
5. **Pagine:** il contenuto nuovo si prepara "in staging" nella stessa pagina (le scritture dell'MCP su un documento
   pubblicato restano in una copia di lavoro finché non si pubblica) e si guarda con l'anteprima `?artes_rev2=1`.
6. **Passaggio finale (fase 9):** si pubblicano le pagine, si accende l'interruttore per tutto il sito, si
   cancellano le classi `o-*` e il CSS vecchio, si aggiornano le variabili del kit.

## 4. Regole di conversione HTML → Elementor

| HTML della rev2 | Elementor | Note |
|---|---|---|
| `section`, `nav`, `header`, `footer`, `aside`, `article`, `div` | `e-div-block` con lo stesso `tag` | `main` omesso (lo mette il tema); `id` → `_cssid` |
| contenitore `<a>` con blocchi dentro | `e-div-block` `tag a` + link | classi sul `<a>` |
| `<a class="btn …">testo</a>` | `e-button` + link | classi sul `<a>` |
| `<a class="link-rule">testo</a>` e altri link di solo testo | `e-paragraph` con link | classi sul `<p>`; il CSS usa la classe sul contenitore |
| `<button>` | `e-button` `tag button` | |
| `h1`-`h6` | `e-heading` | inline `strong`, `em`, `br`, `a` senza classi |
| `p` | `e-paragraph` | |
| `span`/testo con classe | `e-paragraph` `tag span` + classe | un `span` per ogni pezzo di testo con classe |
| `strong class="nav__em"` nei link | `e-paragraph` `tag span` + classe (`nav__em`) | evita di perdere la classe |
| `img` | `e-image` (ID della libreria, alt) | classi sull'`<img>` |
| `ul` / `li` | `e-list` / `e-list-item` / `e-list-item-content` | marcatori spenti; il CSS agisce sul `li` |
| `details` / `summary` | `e-accordion` (`faq_schema`) | icona spenta: il `+`/`–` è nel CSS (`::after`) |
| `dl` / `dt` / `dd` | `div` con classe `rev2-dl`/`rev2-dt`/`rev2-dd` | i selettori di tipo del CSS diventano `:is(dt, :where(.rev2-dt))` (stessa specificità del tag): vedi §7 |
| `ol` / `li` | `div` con classi | i selettori `.steps` e `.step` sono già per classe |
| `data-*`, `aria-*`, `hidden` | non impostabili | li aggiunge `artes-rev2.js` dalle classi (tabella nel file) |
| `class` | classe globale con **lo stesso nome** | creata con `--a: 0;` |

## 5. Modello dati dei contenuti (realizzato nella fase 3, 2026-11-20)

**`realizzazione`** (20): titolo · slug (`royal-hotel`, `bcc-tarsia`, `il-quotidiano`…) · termine `settore` (5) · termine
`categoria` (22 usate; 26 elencate nelle pagine settore) · riga parola chiave (SEO) · introduzione · località ·
tipologia · progettista (solo 5) · descrizione (3 paragrafi, il primo in evidenza) · galleria (immagini con alt dalla
rev2) · posizione e dimensione nella griglia della home (solo 6).
**`brand`** (18): titolo · slug · termine `categoria_brand` (8) · introduzione (con link ai settori) · 4 righe scheda
(categoria, settori Artes, fornitura Artes, assistenza) · due sezioni di testo ("Come lavoriamo con X", "Dove lo
usiamo") · foto (7 brand) · progetti collegati (relazione già esistente).
**Tassonomie:** `settore` rinominata ("e" al posto di "&"), slug come i codici rev2 (`uffici`, `retail`,
`bar-ristoranti`, `food`, `hospitality`), ordine 01-05 con bar prima di food; nuova `categoria` (piatta). Nel progetto
si assegnano sia il settore sia la categoria.

**Com'è stato realizzato** (dettaglio, ID e campi in `wp-stato-dev3.md` §3-§4; definizione in `tools/rev2/modello-dati.js`):
- La descrizione della scheda sono **2 paragrafi** (il primo "in evidenza") più un link finale al settore che è generato, non memorizzato:
  campi `descrizione_lead` e `descrizione_testo`.
- Si memorizzano solo i dati; si **calcolano** titolo e descrizione SEO, didascalie della galleria, "altre realizzazioni" (prime 3 del settore in ordine
  d'archivio, esclusa la corrente), titoli delle sezioni e CTA dei brand, paragrafo di chiusura dei brand: formule verificate su tutte le pagine
  (`tools/rev2/dati-rev2.js` segnala ogni scostamento).
- "Fornitura Artes" e "Assistenza" dei brand sono identici nei 18 brand: restano campi (precompilati) per poterli cambiare brand per brand.
- Le 26 categorie includono le 12 senza progetti e le 4 che compaiono solo nella pagina del settore Retail: `ordine_filtro` = 0 per queste 4.
- La foto di una realizzazione ha 3 testi alternativi diversi nella rev2 (card, galleria, foto del brand): allegato "base" con l'alt della galleria e
  **copie fisiche** per gli altri casi (un allegato non può condividere il file di un altro senza rischiare di perderlo cancellandolo).
- Pagine, link e redirect: gli indirizzi vecchi di `bbc-tarsia` e `quotidiano` reindirizzano (301) ai nuovi; i termini non hanno redirect (staging).

## 6. Dettagli da non dimenticare

- `e-image` imposta come `id` del DOM l'ID dell'allegato (duplicato se la stessa immagine compare due volte).
- Il contenuto di primo livello di una pagina viene racchiuso in un `e-div-block` radice con padding di default: va
  azzerato (classe dedicata).
- `aria-label` (nav, bottoni, gallerie) e stato "attivo" della voce di menu (`is-active`) non sono impostabili dai
  widget: li gestisce il JavaScript del plugin (come faceva `shell.js` nel vecchio mockup).
- Le voci dei menu a tendina e dei pannelli usano `hidden` nella rev2: nel plugin si usa una classe di stato e il CSS
  di partenza nasconde il pannello.

## 7. Aggiornamento dopo la fase 2 (2026-11-19): regole definitive e cose imparate

Verificate sulla pagina di prova 542 (Chi siamo e Contract, 1440/1024/768/390 px: altezze identiche, 0,1-0,4% di pixel
diversi, solo ricampionamento delle foto).

**Convertitore (`tools/rev2/html2elementor.js`)**

- *Un widget per ogni elemento con classe*: Elementor toglie le classi dentro ai testi, quindi ogni figlio con classe
  diventa un widget a sé. Testo semplice (solo testo e `strong/em/br/a` senza classe) → un solo widget: `h1-h6` →
  `e-heading`, `p` → `e-paragraph` (p).
- *Contenitore con solo testo* (`div`, `dt`, `dd`, `a`…) → il contenitore (stesso tag, stesse classi) con dentro un
  `e-paragraph` **span** con classe `rev2-t`. Non si usa un `p`: la rev2 ha una regola globale `p { max-width: 68ch }` e
  decine di `.x p` che non devono colpire un `div`.
- *Elementi che cambiano tipo* (`strong/em/b/i/small` in piedi da soli → span; `p` con elementi classati → div; `dl/dt/dd/ul/ol/li` →
  div): ricevono la classe `rev2-<tag>`. `port-css.js` riscrive ogni selettore di tipo come `:is(tag, :where(.rev2-tag))` (specificità
  invariata) e ogni selettore `span` come `span:where(:not(.rev2-strong, …, .rev2-t))`, così uno span fabbricato dal convertitore non prende le regole
  `X span` pensate per gli span veri (caso trovato: `.contract-hero__facts span` colpiva il `strong` con i numeri).
  Gli stili di partenza del browser per quei tag (grassetto, corsivo, `smaller`) tornano con `:where(.rev2-strong)` ecc. in `adattamenti.css`.
- *Span senza classe*: dentro un testo (`p`, titoli) restano `<span>` nel contenuto; dentro un contenitore (`div`, `a`, `article`) sono
  elementi di layout (flex item, regole `X span`) e diventano widget a sé.
- *Link*: fuori dai testi un `<a>` è sempre un contenitore `a` (la classe resta sull'`<a>`, i selettori `parent > a` continuano a valere) con
  l'eventuale testo in uno span `rev2-t`; con classe `btn*` è un `e-button`. Nei testi (breadcrumb, paragrafi) resta `<a href>` senza classi.
- *Radice della pagina*: il `<main>` non si ricrea; un `e-div-block` con classe `page-root` (+ le classi del `main`) contiene tutto.
- *Attributi non impostabili* (`data-*`, `aria-*`, `role`, `hidden`, `type`): li rimette `artes-rev2.js` dalle classi (tabella `decora()`), conteggiati come
  `attr:*` nell'output di `costruisci.js`.
- *Link*: destinazioni risolte da `tools/rev2/mappa-link.json` (pagine → permalink relativi; `realizzazione-*`/`brand-*` → CPT; `#` e vuoti per testo).

**CSS e plugin**

- Base dei contenitori di Elementor, misurata sul serio: `.e-con` ha `width: var(--width)` = **100%**, `height/min-height`, `overflow`, `border-radius`,
  `position: relative`, `padding` 10px, `display: var(--display)`: il reset (`tools/rev2/css/reset.css`) li riporta tutti a `revert`. Senza `width: revert` i link
  contenitore del menu occupavano il 100% e la pagina scorreva in orizzontale.
- *Tema Hello Elementor*: i suoi tre fogli (`reset.css`, `theme.css`, `header-footer.css`) cambiano i valori di partenza (colore dei link e bottoni,
  interlinee dei titoli, margini): in modalità rev2 il plugin li toglie (`wp_dequeue_style`) e disattiva i Google Fonts di Elementor (carica da sé i tre font
  della rev2). Con questo la pagina di prova 542 è diventata identica alla rev2.
- *Attributo `hidden`*: Chrome lo applica come "suggerimento di presentazione" (origine autore, specificità 0); il `display` di Elementor lo annulla e `revert`
  non lo ripristina. `adattamenti.css` aggiunge `:where([hidden]) { display: none }` e tiene chiusi i pannelli finché il JavaScript non ha impostato `data-ready`.
- Il CSS portato non va mai modificato a mano: `node tools/rev2/port-css.js`, poi `node tools/rev2/push-asset.js` (giro veloce) o `tools/install-plugin.ps1` (rilascio).

**Collaudo**

- I link di anteprima firmati di Elementor **scadono dopo circa 10 minuti** (poi WordPress mostra la home): gli strumenti accettano `@<id>` al posto
  dell'URL e ne generano uno nuovo a ogni esecuzione (`tools/rev2/url-dev3.js`).
- Il banner "development site" di WPML (in fondo a ogni pagina di dev3, ~60 px) va tolto prima di misurare: lo fanno `parita.js`, `geometria.js` e `collaudo-header.js`.
- La voce attiva del menu si calcola dal percorso della pagina (`ArtesRev2.marcaAttivo`): le anteprime non hanno il permalink vero, quindi gli strumenti accettano
  `--percorso /chi-siamo/` per simularlo.

## 8. Fase 4 (2026-11-20): template dinamici e archivi — regole e cose imparate

Template e archivi dei due tipi di contenuto sono al **livello della rev2**: tutte le 40 pagine (20 realizzazioni, 18 brand, 2 archivi) hanno la stessa altezza a 1440 e 390 px
(e a 1024 e 768 su un campione), nessuno scroll orizzontale, contenuti identici, pixel diversi al massimo 2,6% (solo ricampionamento delle foto); lightbox, filtri e header hanno lo
stesso stato e lo stesso aspetto. I risultati sono nel diario (2026-11-20, fase 4) e in `docs/piano-adeguamento-rev2.md` §10.

**Come si costruisce un template dinamico**

- *Sorgente = HTML scritto a mano* in `tools/rev2/modelli/` (le due schede) o ricavato dalla pagina statica con `genera-modelli.js` (i due archivi: la parte fissa si
  copia tale e quale). Gli attributi che dicono da dove viene un dato sono letti da `html2elementor.js`: `data-dyn` (testo), `data-dyn-href`, `data-dyn-src`,
  `data-opz` / `data-opzimg` (riga o blocco facoltativo), `data-loop` (elemento ripetuto). La tabella `tools/rev2/dinamici.js` dice, per ogni alias, il tag dinamico
  nativo (titolo, indirizzo, immagine in evidenza, campo JetEngine, campo di tassonomia con prefisso) oppure lo shortcode del plugin con il tag "Shortcode" quando il
  valore si calcola (briciole di pane, riga "Settore — Categoria", link con HTML, numero di foto, testo "Scopri l'arredo…").
- *Cicli* (widget `e-collection-loop`): l'involucro esterno non ha classe e si neutralizza con `display: contents` (classe `rev2-loop`); le classi della card stanno
  sull'**elemento ripetuto** (così `:first-child`/`:nth-child` della rev2 continuano a valere); il link dell'intera card è un contenitore `a` interno con
  `display: contents` (`rev2-a`).
- *Dato mancante*: nella rev2 la riga semplicemente non esiste, in WordPress il widget c'è ma è vuoto. Righe e blocchi facoltativi si nascondono in CSS con
  `:has(.rev2-v:empty)` (valore vuoto), `:has(.rev2-loop > [style*="display: none"])` (ciclo senza risultati: Elementor mette `display: none` in linea al layout vuoto) e
  `:not(:has(img[src]))` (immagine in evidenza assente: il widget scrive un `<img>` senza `src`).
- *Galleria*: le classi `caso-gallery--n1…n5` dipendono dal numero di foto; si ottengono in CSS con `:has(> :nth-child(N))` (nessun JavaScript, nessun salto). Le foto dopo
  la quinta restano nel DOM ma nascoste (`:nth-child(n+6)`), come l'attributo `hidden` della rev2: si vedono solo nella lightbox.
- *Filtri degli archivi*: nessun elenco scritto a mano nel JavaScript. Ogni card porta degli span nascosti `.rev2-dato` (settore e categoria dal termine) e il plugin espone
  `window.ArtesRev2Dati` (settori e categorie letti dai termini, con ordine e pagina): `initArchivio` e `initFiltriBrand` in `artes-rev2.js` ricostruiscono tab, gruppi di
  categorie, conteggio e messaggio "nessun risultato", e tengono `?settore=&categoria=` nell'indirizzo.
- *Attivazione*: header 557 e footer 971 valgono sulle 4 condizioni dei contenuti (scheda e archivio di realizzazioni e brand); i site part nuovi sono **1040, 1049, 1050, 1051**;
  i vecchi 138, 448, 213, 447 sono in **bozza con le condizioni originali** (per tornare indietro: rimetterli in pubblicazione, portare a 0 l'opzione `artes_rev2_cpt` e riportare le
  condizioni di 557/971 alla sola pagina 542; `condizioni.js` descrive i passaggi). L'opzione `artes_rev2_cpt` accende il design rev2 (classe `rev2`, CSS e JS rev2) su tutte le schede
  e gli archivi; le pagine dei termini (`/settore/…`, `/categoria-realizzazione/…`, `/categoria-brand/…`) non esistono nella rev2 e reindirizzano (301) all'archivio con lo stesso filtro.

**Cose imparate**

- *Un selettore generico in `adattamenti.css` annulla le regole della rev2 con la stessa specificità* (viene dopo nel file): una regola `grid-auto-rows: auto` sul widget ciclo
  annullò le righe fisse della galleria (`.caso-gallery { grid-auto-rows: 250px }`) su tutte le schede (pixel diversi al 20-50%, visto subito dalla parità completa e corretto
  prima di andare oltre). Si resta sotto le regole della rev2 e sopra quelle di Elementor con `:where()` (specificità 0,2,1 contro 0,3,1 e 0,2,0). Per questo la parità si
  rilancia **su tutte le pagine** dopo ogni modifica al CSS, non solo su quella che si stava sistemando.
- *Il widget ciclo di Elementor dà alla griglia `grid-auto-rows: 1fr`*: a una colonna (mobile) tutte le card prendono l'altezza della più alta (le "altre realizzazioni" erano 35 px
  più alte su cinque schede a 390 px). La rev2 ha righe automatiche: `:where(.e-collection-loop-layout-base) { grid-auto-rows: auto }`.
- *Lo strumento di misura si sbaglia in silenzio*: con più processi in parallelo una porta di debug scelta a caso poteva coincidere e due sessioni parlavano con lo stesso Chrome
  (pagine scambiate). `cdp-session.js` ora lascia scegliere la porta a Chrome (`--remote-debugging-port=0`) e la legge da `DevToolsActivePort`.
- *Pubblicare è un'azione a parte*: `costruisci-modello.js` pubblicava sempre e una pagina di prova in bozza è rimasta pubblica per pochi minuti; ora serve `--pubblica`.
- *Foto mancante = `<img>` senza `src`*, campo vuoto = widget vuoto: ogni elemento facoltativo del modello va protetto in CSS, non basta "non scriverlo".
- *WordPress legge `?settore=…` come query su tassonomia*: `/realizzazioni/?settore=uffici` (l'indirizzo filtrato della rev2, anche quello che il JavaScript scrive con `replaceState`) è
  per WordPress sia archivio sia pagina di termine (`is_tax()` vero). Il redirect delle pagine dei termini all'archivio scattava quindi anche lì e rimandava a sé stesso (ciclo infinito);
  e un filtro senza risultati o con un termine inesistente dava 404. Soluzione nel plugin (0.6.2): filtro `request` che toglie `settore`, `categoria` e `categoria_brand` dalla query
  dell'archivio (i filtri sono lato browser, come nella rev2) e redirect che non parte mai da un archivio. **Si prova sull'indirizzo vero dell'archivio, con i parametri**, non solo sulla
  pagina di prova: `node tools/rev2/collaudo-redirect.js` (17 controlli, compresi ciclo, categoria vuota, termine inesistente e articoli nel cestino).
- *Cambiare lo slug di un termine non avvisa chi lo legge*: le pagine settore del design vecchio scelgono i progetti dal proprio campo `settore_collegato` (slug del termine); con gli slug
  nuovi della fase 3 il campo puntava a termini inesistenti e i loro elenchi sono rimasti vuoti, senza errori, finché un confronto con la misura precedente non l'ha mostrato. Prima di
  rinominare uno slug cercare chi lo legge (campi delle pagine, query dei cicli nel plugin, link nei contenuti); ora `verifica-dati.js` controlla anche questo campo.
- *Il Bash di Git su Windows converte gli argomenti che iniziano con `/`* ("/realizzazioni/" diventa "C:/Program Files/Git/realizzazioni/"): nei comandi con percorsi dell'URL
  usare indirizzi completi o `MSYS_NO_PATHCONV=1` (`salute-pagine.js` lo corregge da sé).
- **Difetto della rev2 (corretto il 2026-11-20)**: nella pagina Brand Partner `.brand { display: flex }` vinceva su `[hidden]`; aggiunta `.brand[hidden] { display: none; }` in `artes-sito-rev2/assets/css/artes.css` e rigenerato `artes-rev2.css`. Verificato in parità (`collaudo-archivi.js brand`: `18/18` → `3/3`, `2/2`, `1/1`).

## 9. Fase 5 (2026-11-20): pagine statiche, FAQ native e Home dinamica

Tutte e 9 le pagine statiche (`376` Home, `144–148` 5 settori, `149` Su misura, `150` Contract, `151` Chi siamo) sono pubblicate e attive in modalità rev2 con parità misurata (`Δ 0` di altezza a 1440/1024/768/390 px, contenuti identici, max `1,3%` pixel su 1440/390, salute `18/18`, non-regressione `40/40` CPT e `6/6` pagine vecchie residue).

- *FAQ (`e-accordion`)*: `<div class="faq">` con `<details class="faq__item">` si converte in `e-accordion` (`default_state: all_collapsed`, `max_expanded: multiple`, `show_icon: false`, `faq_schema: true`), che genera `<details>/<summary>` nativi + JSON-LD `FAQPage`. In `reset.css` gli stili base `.e-accordion-*` sono riportati a `revert` (specificità `0,2,1` > Elementor `0,2,0`, < rev2 `0,3,2`). Risultato: `0%` di differenza pixel su tutti i 4 scenari di apertura/chiusura.
- *Elenchi (`ul`/`ol`/`li`)*: restano contenitori con classi `rev2-ul`/`rev2-ol`/`rev2-li` + `role="list"/"listitem"` in `artes-rev2.js` (tutti gli elenchi della rev2 hanno `list-style: none` e `ol.steps` usa `grid-template-rows: subgrid`, che un wrapper `e-list` romperebbe).
- *Home (`modelli/home.html`)*: generata da `genera-modelli.js` da `index.html`, con cicli dinamici per Realizzazioni (`artes_progetti_home_rev2`, `home_ordine` 1–6, larghezze `w4/w2/w6` e filtro settore in `initHomeProgetti`) e Brand (`archivio_brand`). L'unico stile inline della rev2 (`style="margin-bottom:0"` in sez. 05) diventa classe d'appoggio `rev2-mb0`.
- *Scoping dei filtri JS*: `initFiltriBrand()` ora cerca `.filtri` solo dentro la stessa `<section>` di `.brands`, così sulla Home (che ha `.filtri` in sez. 04 e `.brands` in sez. 05) non interferisce con i progetti.
- *Copie immagini con alt dedicato*: `import-media-pagine.js` crea 17 copie fisiche (`media-pagine.json`, lingua `it`), usate automaticamente da `html2elementor.js` quando `src|alt` differisce dall'allegato base; le 6 card progetti della Home riusano le copie `#card` della fase 3.
- *Strumenti*: `cdp-session.js` inietta `noMotion` su `DOMContentLoaded` (prima girava prima di `<html>` e falliva); `contenuti.js` usa `textContent` (non `innerText` trasformato in maiuscolo dal CSS) per abbinare i link `#` in `mappa-link.json`.
- *Nota rev2*: `contract.html` a `768 px` presenta uno scroll orizzontale di `20 px` su `.contract-scope__card` sia nella rev2 che su dev3.
