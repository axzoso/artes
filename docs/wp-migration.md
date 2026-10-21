# Migrazione del mockup su WordPress (Elementor + JetEngine)

Documento di lavoro per costruire su WordPress il sito che oggi esiste come
mockup statico. **Il mockup in questo repo resta la fonte di verità**: ogni
pagina WordPress si confronta con la sua omologa su
`https://axzoso.github.io/artes/`.

Creato il 2026-10-20. Aggiornare a ogni fase conclusa.

**Documenti collegati:** lo stato attuale di dev3 (ID, classi, plugin, cose
imparate, registro modifiche) è in [`wp-stato-dev3.md`](wp-stato-dev3.md);
gli script in [`../tools/README.md`](../tools/README.md); il codice del
plugin dei cicli in `../wp/artes-core/`. Qui restano piano e decisioni.

## 1. Ambiente

| Voce | Valore |
|---|---|
| Sito di destinazione | `https://dev3.minimalstudiodev.it` (staging dell'agenzia) |
| WordPress / PHP | 7.1.3 / 8.3.35, lingua it_IT |
| Tema | Hello Elementor |
| Plugin | Elementor 4.3.5, Elementor Pro 4.3.2, JetEngine 3.9.0, Novamira 1.12.10 |
| Page builder scelto | **Elementor** (editor V4, classi e variabili globali). Non mischiare con Gutenberg |
| CPT / tassonomie / campi | **JetEngine**, mai `register_post_type` in PHP |

Stato iniziale di dev3 al 2026-10-20: solo "Hello world!" e "Privacy Policy"
(bozza), nessuna site part, nessun componente.

### Connettori MCP (ambito locale di questo progetto, in `~/.claude.json`)

- `artes-elementor` → `…/wp-json/elementor/mcp/` — layout: pagine,
  composizioni, classi, variabili, site parts, componenti.
- `novamira-dev3-minimalstud` → `…/wp-json/mcp/novamira` (tramite
  `@automattic/mcp-wordpress-remote`) — tutto il resto: CPT/tassonomie JetEngine,
  import dei contenuti, media, menu, impostazioni. Tre strumenti-ponte:
  `mcp-adapter-discover-abilities`, `-get-ability-info`, `-execute-ability`.

Regole di sicurezza di Novamira: non modificare, disattivare o eliminare il
plugin Novamira; non toccare l'utente ID 1 né le sue password applicazione e
connessioni OAuth.

Il login OAuth della CLI `novamira auth login` fallisce (`full-access scope is
unavailable`): non serve, si usa la password applicazione. Le due password
applicazione sono passate in chiaro in chat: **rigenerarle a fine PoC**.

## 2. Principio guida: contenuti ≠ presentazione

| Tipo | Come si costruisce | Chi lo modifica |
|---|---|---|
| Pagine istituzionali (home, 5 settori, su misura, contract, chi siamo, contatti, preventivo, area progettisti) | Elementor, via MCP | Il cliente, nel builder, con cautela |
| Realizzazioni (14 schede) | CPT `realizzazione` + un solo template singolo + un archivio | Il cliente, dall'admin, compilando campi |
| Brand partner (≈17) | CPT `brand` + relazione con le realizzazioni | Il cliente, dall'admin |
| Header, footer | Site parts Elementor + menu WordPress reale | Agenzia |

Il cliente non deve duplicare sezioni nel builder per aggiungere un progetto:
compila un form e la pagina si genera dal template.

## 3. Modello dati (JetEngine)

### CPT `realizzazione` (slug `realizzazioni`, archivio attivo)
Campi ricavati da `realizzazione-boutique-hotel-aurea.html`:

| Campo | Tipo | Esempio |
|---|---|---|
| titolo | titolo del post | Boutique Hotel Aurea |
| `sottotitolo_ambito` | testo | Boutique hotel |
| `introduzione` | textarea | "Ventotto camere, lounge e area breakfast…" |
| `cliente` | testo | Arpacal (13 schede su 14, al posto di superficie/servizi/tempi/progettista) |
| `localita` | testo | Tropea (VV) |
| `superficie` | testo | 1.100 m² su tre livelli |
| `ambienti` | testo | 28 camere, lounge, reception… |
| `arredi` | testo | Tavoli riunione, sedute, contenitori… (13 schede su 14) |
| `servizi_artes` | testo | Rilievo, progettazione, produzione… |
| `tempi` | testo | 14 settimane dalla firma al collaudo |
| `progettista` | testo | Studio — (su capitolato) |
| immagine in evidenza | media | foto hero |
| `galleria` | gallery | 4 foto |
| `brand_coinvolti` | relazione → `brand` (molti a molti) | Pedrali, Caimi… |
| settore | tassonomia `settore` | Arredo hotel & hospitality |

Tutti i campi tecnici sono **opzionali**: nelle schede di clienti reali non si
inventano superfici, tempi, brand o progettisti (vedi `CLAUDE.md` §6). Il
template deve nascondere la riga se il campo è vuoto. Solo Boutique Hotel
Aurea, Resort Capo Bianco, Spa Terme Luigiane e Business Hotel Fera sono
fittizi.

### Tassonomia `settore` (gerarchica o piatta, 5 termini)
Nomi identici al mockup, ordine 01–05:
1. Arredo uffici & workspace
2. Arredo negozi & retail
3. Arredo negozi food
4. Arredo bar & ristoranti
5. Arredo hotel & hospitality

### CPT `brand` + tassonomia `categoria-brand`
19 brand in `brand-partner.html` (18 originali più **Mottura**, aggiunta il 2026-10-21
nella categoria Contract: Ufficio 6, Contract 4, Acustica 2,
Pareti/pod 1, Sedute 3, Retail 1, Food 1, Outdoor 1); categorie: Ufficio, Contract, Acustica,
Pareti / pod, Sedute, Retail, Food, Outdoor. Solo Pedrali ha scheda propria
(`brand-pedrali.html`): gli altri non devono essere cliccabili finché non
hanno contenuto.

### Dati delle 14 realizzazioni (da `realizzazioni.html`)

| Realizzazione | Settore | Località |
|---|---|---|
| Boutique Hotel Aurea | hotel & hospitality | Tropea (VV) |
| BBC di Tarsia | uffici & workspace | Calabria |
| Jumecitu | bar & ristoranti | Calabria |
| Free Sport | negozi & retail | Calabria |
| Sakuralab | negozi food | Calabria |
| Ruffolo Group | uffici & workspace | Calabria |
| Lico | negozi & retail | Calabria |
| Ingrediente School | uffici & workspace | Calabria |
| Resort Capo Bianco | hotel & hospitality | Calabria |
| Arpacal | uffici & workspace | Calabria |
| Costruzioni Imbrogno | uffici & workspace | Calabria |
| Spa Terme Luigiane | hotel & hospitality | Calabria |
| Quotidiano | uffici & workspace | Calabria |
| Business Hotel Fera | hotel & hospitality | Calabria |

Import: script che legge i `realizzazione-*.html` e crea i post via Novamira,
caricando le immagini da `assets/img/`. Non si costruiscono 14 pagine a mano.

## 4. Design system → variabili e classi globali

Valori **finali** dopo il restyling del 2026-09-30 (sezione 14 di `artes.css`,
che sovrascrive i token della sezione 1).

| Token CSS | Valore | Variabile globale |
|---|---|---|
| `--bone` | #FFFFFF | colore: Fondo |
| `--stone` | #E8E8E8 | colore: Fondo alternato |
| `--sand` | #111111 | colore: Fascia scura |
| `--line` / `--line-soft` / `--line-strong` / `--line-btn` | #D9D9D9 / #EEEEEE / #C9C9C9 / #BDBDBD | colori: Filetto… |
| `--graphite` / `--night` | #111111 / #080808 | colori |
| `--ink` | #242424 | colore: Testo |
| `--muted-1…4` | #3F3F3F / #5E5E5E / #747474 / #999999 | colori: Testo attenuato 1–4 |
| `--accent` | #D71920 | colore: Rosso ARTES |
| `--sand-ink` / `--sand-muted` | #FFFFFF / #C8C8C8 | colori: testo su fascia scura |
| `--display` | Archivo | font: Titoli |
| `--body` | Instrument Sans | font: Testo |
| `--mono` | IBM Plex Mono | font: Mono |
| `--pad` | 40px | dimensione: Margine laterale |
| `--gutter` | 20px | dimensione: Gutter |

Le classi BEM del mockup (`.eyebrow`, `.h-section`, `.lead`, `.link-rule`,
`.btn`, `.section__head`, `.ph`, `.progetto…`) diventano classi globali V4 con
lo stesso nome, in modo che il CSS sia riconoscibile.

Regole di stile da rispettare nei widget (da `CLAUDE.md` §5): nessun
`box-shadow`, nessun angolo arrotondato, rosso massimo tre volte per
schermata, margini laterali 40px, sezioni chiare consecutive staccate dal
fondo `.bg-alt` e non dal filetto.

## 5. Mappa JS → funzione nativa

`artes.js` **non si porta**. Ogni comportamento ha un equivalente nativo:

| Mockup | WordPress |
|---|---|
| Filtri progetti/brand (`data-settore`) | Loop Grid + filtro per tassonomia (JetEngine/Elementor Pro) |
| `?settore=` che preseleziona il filtro | Link all'archivio del termine della tassonomia |
| Nav mobile hamburger | Widget menu di Elementor Pro nel site part header |
| Slider home, sezione Produzione | Carousel nativo |
| Form (`[data-contatti]`) | Widget Form di Elementor Pro, con campi e invio reali |
| Voce di menu attiva da `shell.js` | Gestita da WordPress sul menu |

## 6. Header e footer

Da `assets/js/shell.js`: topbar (payoff, MEPA, contatti, lingua), masthead
(logo, Area Progettisti, Contattaci), navbar a due gruppi (5 settori + 5 voci),
pannello mobile. Il footer ha 5 colonne. In WordPress: **un site part header e
uno footer** in Elementor, alimentati da un menu WordPress. La navbar è
calibrata a 1366px (vedi `CLAUDE.md` §4): ricontrollare lì.

## 7. Ordine di lavoro

1. [~] Backup di dev3: **saltato** su decisione del titolare (2026-10-20).
   Resta da verificare che il sito sia `noindex` / protetto.
2. [x] Variabili globali (colori, font, dimensioni) — 27 create il 2026-10-20,
   emesse nel CSS con lo stesso nome del mockup (`var(--accent)` ecc.).
3. [x] Classi globali di base — 13 create: `lbl`, `eyebrow`, `h-section`, `lead`,
   `link-rule`, `btn`, `btn-red`, `btn-light`, `btn-ghost`, `section`,
   `section-head`, `bg-alt`, `bg-dark`. Verificate sul render della pagina di
   prova (post 28, bozza "TEST classi globali"). Mancano ancora le classi dei
   componenti (`.progetto…`, `.tile…`, `.brand…`, ecc.): si creano man mano.
4. [x] Font: caricati da Google da Elementor (Archivo, Instrument Sans, IBM Plex
   Mono). [ ] Logo `artes-logo.png` da caricare nella libreria media.
5. [x] **WPML** 5.1.0 + String Translation installati dal titolare (it predefinita,
   en-gb seconda lingua, URL a directory). Impostazioni di traduzione fatte il
   2026-10-20 (vedi sotto).
6. [x] Modello dati JetEngine creato il 2026-10-20 e verificato su WordPress:
   - CPT `realizzazione` (archivio `/realizzazioni/`, 9 campi: sottotitolo_ambito,
     introduzione, localita, superficie, ambienti, servizi_artes, tempi,
     progettista, galleria) e CPT `brand` (archivio `/brand-partner/`, campo
     introduzione);
   - tassonomie `settore` (5 termini, slug `arredo-…`) e `categoria_brand`
     (8 termini);
   - relazione molti-a-molti "Realizzazioni - Brand" (id 3, selettori da
     entrambi i lati);
   - permalink portati da `/%year%/%monthnum%/%day%/%postname%/` a `/%postname%/`;
   - WPML: CPT e tassonomie in modalità 2 (traducibili, con ripiego
     sull'italiano finché manca la traduzione); campi *tradotti*: sottotitolo,
     introduzione, ambienti, servizi, tempi, progettista; *copiati*: località,
     superficie, galleria.
   Strumenti usati: i tool MCP di JetEngine (`/jet-engine/v1/mcp-tools`)
   eseguiti internamente come utente 1 con nonce `wp_rest` e payload in
   `{"input": …}`; la relazione con l'API interna `relations->data`.
7. [x] Menu WordPress, site part header (199) e footer (200) con selettore lingua
   — fatto il 2026-10-21, verificato a 1440/1100/800px e confrontato col mockup.
   Restano: apertura del menu hamburger da verificare, voci per pagine non ancora
   esistenti (Blog, Prodotti, MEPA/PA, Cataloghi PDF), logo chiaro per il footer
   (difetto già presente nel mockup), link "Realizzazioni"/"Brand Partner" sensibili
   alla lingua. Le 11 pagine di destinazione esistono come segnaposto vuoti.
7b. [~] Template singolo `realizzazione` (site part 138): **fatto** il 2026-10-20
   (intestazione, immagine e galleria, dettagli tecnici, brand collegati, altre
   realizzazioni; verificato a 1440px su Aurea e Arpacal) e, il 2026-10-21 sera, la
   **sezione contatti con modulo** (email a `info@artes.it`, allegati DWG; test di
   invio verificato, mobile verificato). Mancano: link sensibili alla lingua e
   **protezione anti-spam del modulo** (da fare prima della messa online).
   [x] Archivio con filtro per settore (site part 213) — fatto il 2026-10-21: serve
   `/realizzazioni/` e le pagine dei settori, filtri come link ai settori, 12 per pagina
   con paginazione, ordine del mockup. Verificato a 1440 e 390px emulati.
   **Decisioni sul form di contatto** (2026-10-21, **implementate**): destinatario
   temporaneo `info@artes.it` (poi quello definitivo: `tools/lib-contatti.ps1`,
   `$DestinatarioEmail`), allegati DWG ammessi (fino a 3 file di 10 MB). Resta da
   fare lo stesso modulo nelle pagine Contatti e Richiedi preventivo (stessa libreria).
8. [x] Import delle 14 realizzazioni e dei 18 brand (2026-10-20), verificato:
   14 post pubblicati con settore, 6–8 campi, copertina e galleria; 47
   immagini scaricate da `axzoso.github.io/artes/assets/img/` (deduplicate con
   la meta `_artes_src`), tutte con alt; tutti i contenuti in lingua `it`
   (WPML non l'assegnava da solo ai post creati via PHP: dopo ogni import
   lanciare `wpml_set_element_language_details`). Relazione collegata solo per
   Aurea → Pedrali, Caimi, Frezza, Kastel, Nardi Outdoor (e dal 21/10 Mottura,
   aggiunta come brand; il testo seguente è lo stato del 20/10). **Mottura** (citato
   in Aurea) non è fra i brand del mockup e non è stato collegato.
   Gli script di import sono in `tools/` (`extract.js`, `import-one.ps1`).
9. [x] Pagina PoC settore hotel (2026-10-21).
10. [x] Altre 4 pagine settore (stesso schema), 144–148.
11. [x] Home (376), su misura, contract, chi siamo, area progettisti, contatti, preventivo (2026-10-21).
11b. [x] Archivio Brand Partner (447) e singolo brand (448). [ ] Contenuti dei singoli brand (foto, specifiche) da avere dal cliente. [ ] Blog, Prodotti, MEPA/PA, Cataloghi PDF, informativa privacy, mappa Contatti, anti-spam e SMTP.
12. [ ] Verifica finale: confronto pagina per pagina con la preview, test del cliente.

## 8. Metodo di verifica

- Gli strumenti dei nuovi MCP non compaiono come tool nativi di Claude Code
  dopo il riavvio: si chiamano via JSON-RPC con gli script di `tools/`
  (`mcp.ps1`, `php.ps1`…), che leggono URL e credenziali da `~/.claude.json`.
- Le linee guida di `elementor-build-composition` spingono verso ombre,
  gradienti e angoli arrotondati: **vietati** dal nostro stile. Nelle
  composizioni usare solo classi globali e variabili nostre, senza stili
  inline decorativi.
- I nomi di variabili e classi sono minuscoli (`font-display`, non `Font Display`).

- Dopo ogni pagina: aprirla su dev3 con Chrome e confrontarla con la preview
  del mockup alla stessa larghezza (1440, 1024, 390).
- Non fidarsi del "fatto" restituito dall'API del builder: ricontrollare i dati
  salvati con `elementor-get-page-structure` e la pagina pubblica.
- **Test del cliente**: aggiungere una realizzazione e un brand dall'admin,
  senza aprire Elementor, in meno di 5 minuti.

## 10. Multilingua (WPML)

Italiano lingua predefinita, inglese seconda lingua, URL con directory
(`/en/…`). Principi di costruzione, da rispettare dall'inizio:

- **Nessun testo dentro le immagini** e nessun testo "cotto" in CSS o codice:
  tutto ciò che si legge deve stare in widget, campi o stringhe traducibili.
- **Contenuti ricorrenti in campi, non nel layout**: la scheda realizzazione
  mostra campi dinamici; la traduzione avviene sul post, non sul template.
- **Etichette statiche del template** ("Dettagli tecnici", "Località",
  "Altre realizzazioni"…) sono stringhe del widget: WPML le traduce con
  l'integrazione Elementor/String Translation.
- **Impostazioni di traduzione dei campi JetEngine** (WPML → Impostazioni →
  Traduzione campi personalizzati):
  - *tradurre*: sottotitolo ambito, introduzione, ambienti, servizi, tempi,
    progettista;
  - *copiare*: località, superficie, galleria, immagine in evidenza;
  - relazione realizzazione↔brand: *copiare*, e da collaudare nel PoC (è il
    punto con più rischio di incompatibilità fra JetEngine e WPML).
- **Tassonomie** `settore` e `categoria-brand`: traducibili. I nomi dei 5
  settori in inglese vanno approvati dal cliente come quelli italiani
  (stessa regola di nomenclatura del mockup).
- **Menu, site part header/footer, form**: tradotti con WPML; il form
  Elementor Pro ha etichette e messaggi traducibili. Il selettore `IT / EN`
  della topbar diventa il selettore lingua WPML (shortcode o widget) nel
  site part header.
- **Slug** tradotti (`/en/projects/…`), con redirect dalle pagine non ancora
  tradotte verso la home inglese o il fallback italiano: scelta da fare con il
  cliente.
- Il mockup non ha una versione EN: i testi inglesi nascono in WPML, non
  vanno aggiunti qui.

## 9. Punti aperti

- Pagine ancora `href="#"` nel mockup (Blog, Prodotti, MEPA/PA, Cataloghi PDF,
  informativa privacy): decidere se in WordPress diventano pagine vere o restano
  non cliccabili.
- Lingua EN: **in scope**, con WPML (decisione del 2026-10-20, vedi §10).
  Aperti: chi traduce i contenuti (cliente, agenzia, traduzione automatica ATE),
  e se le 14 realizzazioni vanno tradotte tutte al lancio.
- Invio dei form: destinatari, allegati (DWG) e informativa privacy da definire.
- Dati reali di contatto (telefono, via, P.IVA sono ancora segnaposto).
- Se il cliente userà ancora il mockup per approvare modifiche, congelarlo
  prima di migrare le pagine istituzionali.
