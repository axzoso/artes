# Mappa delle pagine — ARTES Contract

Elenco di tutte le pagine citate dai link del template. Ricavato dai 110
link distinti presenti in `index.html`, `realizzazione.html` e
`sistema-visivo.html`: ogni `href="#"` del prototipo corrisponde a una
voce qui sotto.

**Legenda:** ✅ fatta · ⬜ da fare

---

## Convenzione URL

File **piatti nella root**, nomi con trattini: `contract.html`,
`settori-hospitality.html`, `realizzazioni-boutique-hotel-aurea.html`.

Motivo: su GitHub Pages un project site vive sotto
`https://<utente>.github.io/artes/`. Con i file in sottocartelle ogni
pagina dovrebbe risalire con `../assets/…` a profondità diversa, e basta
un errore per rompere CSS e logo solo su alcune pagine. Piatto significa
che `assets/css/artes.css` resta identico ovunque, in locale e in preview.

Le URL parlanti (`/settori/hospitality/`) si possono introdurre dopo, in
un passaggio unico, quando il sito va in produzione su dominio proprio.

## Come si aggiunge una pagina

Il guscio non è più duplicato: sta in `src/shell.html` e le pagine in
`src/pages/` contengono solo il proprio `<main>`. Si crea il sorgente, si
lancia `python3 build.py`, e il link nel menu si aggiunge una volta sola
nel guscio. Dettagli nel README.

---

## 1. Già esistenti

| Percorso | Pagina | Note |
|---|---|---|
| ✅ `index.html` | Home | |
| ✅ `realizzazione.html` | **Template scheda progetto** | non è una pagina: è il layout del CPT |
| ✅ `sistema-visivo.html` | Sistema visivo | documento interno, fuori dalla nav pubblica |
| ✅ `contract.html` | Contract — il servizio, le 7 fasi | |
| ✅ `produzione.html` | Produzione — lavorazioni e officina | |
| ✅ `settori.html` | Settori — indice delle 5 macro-aree | |

## 2. Navigazione principale — priorità alta

Delle sette voci del menu ne restano quattro. `contract.html`,
`produzione.html` e `settori.html` sono fatte (sezione 1) e i loro link
sono già attivi in nav, footer, mega menu e CTA della home.

| Percorso | Pagina | Linkata da |
|---|---|---|
| ⬜ `brand-partner.html` | Brand Partner — griglia completa | nav, footer, CTA "Tutti i brand" |
| ⬜ `prodotti.html` | Prodotti — catalogo per categoria | nav, footer |
| ⬜ `realizzazioni.html` | Realizzazioni — archivio con filtri | nav, footer, CTA "Tutte le realizzazioni", "Archivio completo" |
| ⬜ `architetti.html` | Architetti — servizi per studi | nav, footer |

## 3. Utility e conversione — priorità alta

| Percorso | Pagina | Linkata da |
|---|---|---|
| ⬜ `chi-siamo.html` | Chi siamo | topbar, footer |
| ⬜ `contatti.html` | Contatti — sedi, form, mappa | topbar, footer, "Contattaci", "Parla con un tecnico" |
| ⬜ `richiedi-preventivo.html` | Richiesta progetto / preventivo | "Richiedi un progetto", "Richiedi un preventivo" (5 CTA) |
| ⬜ `area-progettisti.html` | Area progettisti — accesso riservato | header, hero, "Accedi all'area progettisti" |
| ⬜ `mepa.html` | MEPA / Acquisti in Rete PA | topbar, footer |
| ⬜ `cataloghi.html` | Cataloghi PDF | footer |
| ⬜ `privacy.html` | Privacy policy | footer |
| ⬜ `cookie.html` | Cookie policy | footer |

## 4. Settori — 5 landing

Linkate da mega menu, mosaico home, footer, breadcrumb.

| Percorso | Pagina |
|---|---|
| ⬜ `settori-workspace.html` | 01 Workspace |
| ⬜ `settori-retail.html` | 02 Retail |
| ⬜ `settori-food-beverage.html` | 03 Food & Beverage |
| ⬜ `settori-food-retail.html` | 04 Food Retail |
| ⬜ `settori-hospitality.html` | 05 Hospitality |

## 5. Settori — 40 sotto-voci

Le otto voci per settore elencate nel mega menu.

> **Raccomandazione:** non farne 40 pagine separate, almeno all'inizio.
> Con i contenuti attuali sarebbero quasi identiche fra loro e povere per
> il posizionamento. Meglio renderle **sezioni ancorate** dentro la
> landing del settore (`settori-hospitality.html#spa-wellness`), e
> promuoverne a pagina singola solo quelle con realizzazioni proprie da
> mostrare. L'elenco resta completo qui sotto per quando servirà.

**Workspace** — `uffici-direzionali` · `open-space` · `coworking` ·
`sale-meeting` · `academy-formazione` · `scuole-universita-biblioteche` ·
`reception-corporate` · `business-lounge`

**Retail** — `boutique-moda` · `showroom-concept-store` ·
`profumerie-beauty` · `gioiellerie-ottiche` · `farmacie` ·
`telefonia-elettronica` · `store-sportivi` · `temporary-franchising`

**Food & Beverage** — `bar-caffetterie` · `bistrot-ristoranti` ·
`pizzerie-pub` · `lounge-cocktail-bar` · `wine-bar-enoteche` ·
`gelaterie` · `fast-casual-street-food` · `food-court-rooftop`

**Food Retail** — `panetterie-bakery` · `pasticcerie` ·
`gastronomie-salumerie` · `macellerie-pescherie` · `caseifici` ·
`market-gourmet` · `chocolate-take-away` · `healthy-food-store`

**Hospitality** — `hotel-resort` · `boutique-hotel-bb` · `spa-wellness` ·
`reception-lounge-hotel` · `aree-breakfast` · `rooftop-hospitality` ·
`residence-business-hotel` · `co-living-serviced-apartment`

## 6. Realizzazioni — nessuna pagina da creare

`realizzazione.html` **non è una pagina**: è il layout della scheda
progetto, che in WordPress diventa un Custom Post Type gestito con
JetEngine (Crocoblock). Le singole realizzazioni sono record del CPT, non
file statici — il template si costruisce una volta sola.

Restano quindi da creare solo l'archivio (`realizzazioni.html`, sezione 2)
e le tassonomie di settore che lo filtrano.

I progetti citati nel template servono come dati di prova per il CPT:
Boutique Hotel Aurea, Headquarter Mediterranea, Panificio Grani Antichi,
Concept store Sila, Rooftop Bar Levante, Academy Ferrara Group, Resort
Capo Bianco, Spa Terme Luigiane, Business Hotel Fera.

Da verificare se anche **brand partner** (sezione 7) vada trattato come
CPT: la struttura è identica — un archivio più N schede uguali fra loro.
Se sì, quelle 19 pagine spariscono allo stesso modo.

## 7. Brand partner — 19 schede

Priorità bassa: valutare se servano pagine singole o se basti la scheda
espansa dentro `brand-partner.html`.

| Percorso | Brand | Categoria |
|---|---|---|
| ⬜ `brand-frezza.html` | Frezza | Ufficio |
| ⬜ `brand-colombini-office.html` | Colombini Office | Ufficio |
| ⬜ `brand-las.html` | LAS | Ufficio |
| ⬜ `brand-della-rovere.html` | Della Rovere | Ufficio |
| ⬜ `brand-martex.html` | Martex | Ufficio |
| ⬜ `brand-estel.html` | Estel | Ufficio |
| ⬜ `brand-pedrali.html` | Pedrali | Contract |
| ⬜ `brand-gaber.html` | Gaber | Contract |
| ⬜ `brand-et-al.html` | Et al. | Contract |
| ⬜ `brand-caimi.html` | Caimi | Acustica |
| ⬜ `brand-snowsound.html` | Snowsound | Acustica |
| ⬜ `brand-vetroin.html` | Vetroin | Pareti / pod |
| ⬜ `brand-kastel.html` | Kastel | Sedute |
| ⬜ `brand-leyform.html` | Leyform | Sedute |
| ⬜ `brand-sm-milani.html` | SM Milani | Sedute |
| ⬜ `brand-arken.html` | Arken | Retail |
| ⬜ `brand-lainox.html` | Lainox | Food |
| ⬜ `brand-nardi-outdoor.html` | Nardi Outdoor | Outdoor |
| ⬜ `brand-mottura.html` | Mottura | citato solo nella scheda Aurea |

---

## Ordine di costruzione consigliato

1. ~~Guscio condiviso~~ — fatto: `build.py` + `src/`.
2. **`contatti.html` + `richiedi-preventivo.html`** — chiudono 7 CTA su 8
   della home; senza queste il template resta una vetrina cieca.
3. **`settori.html` + le 5 landing di settore** — sbloccano mega menu,
   mosaico e breadcrumb tutti insieme.
4. **`realizzazioni.html`** — l'archivio; poi le 8 schede a seguire, che
   riusano un impianto già pronto.
5. **`contract.html`, `produzione.html`, `architetti.html`** — le pagine
   narrative, le più lente da scrivere come testi.
6. **`brand-partner.html`, `prodotti.html`, `chi-siamo.html`.**
7. **Utility e legali** — `mepa`, `cataloghi`, `privacy`, `cookie`.
8. **Schede brand e sotto-voci di settore**, solo dove servono davvero.

## Regole di stile da rispettare

Vincolanti per ogni pagina nuova, come da `sistema-visivo.html`:

- margini laterali fissi 40px, gutter 20px, griglie con `gap: 1px` su
  fondo `--line`;
- nessun `box-shadow`, nessun angolo arrotondato: solo filetti 1px, fondi
  alterni e spazio bianco;
- il rosso `--accent` massimo tre volte per schermata (numerazione di
  sezione, CTA primaria, stato attivo) — mai come fondale;
- spazi verticali sulla scala 20 / 34 / 44 / 80 / 110px, sezioni fra
  96 e 120px;
- classi esistenti da riusare prima di scriverne di nuove: `.eyebrow`,
  `.h-section`, `.lead`, `.link-rule`, `.btn`, `.section__head`, `.ph`.

## Nota per la preview su GitHub Pages

Il progetto non è ancora un repository git. Per la preview servono:
`git init`, un repo remoto, e Pages attivo sul branch scelto. Le pagine
non ancora create restano `href="#"`: meglio lasciarle così che puntare a
file inesistenti, che su Pages darebbero 404.
