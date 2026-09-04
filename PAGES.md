# Mappa delle pagine — ARTES Contract

> **Nota (2026-09-04):** i 5 "settori" sono stati esplosi da sezioni
> ancorate di `settori.html` (rimosso) a pagine standalone di primo
> livello in nav. Vedi `docs/superpowers/specs/2026-09-04-menu-restructure-design.md`
> per il design completo.

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

Struttura piatta, senza build: si parte copiando una pagina esistente con
header (nav + le 5 tendine di settore) e footer già dentro, si sostituisce
il `<main>` e si aggiorna il link nel menu — nav, footer e le tendine di
settore vanno aggiornati a mano su ogni pagina esistente. Dettagli nel
README.

---

## 1. Già esistenti

| Percorso | Pagina | Note |
|---|---|---|
| ✅ `index.html` | Home | |
| ✅ `realizzazione.html` | **Template scheda progetto** | non è una pagina: è il layout del CPT |
| ✅ `sistema-visivo.html` | Sistema visivo | documento interno, fuori dalla nav pubblica |
| ✅ `contract.html` | Contract — il servizio, le 7 fasi | |
| — | ~~`produzione.html`~~ | rinominato in `arredamento-su-misura.html` (vedi sotto) |
| — | ~~`settori.html`~~ | rimosso: contenuto distribuito nelle 5 pagine di settore standalone sotto |
| ✅ `arredamento-ufficio.html` | Arredamento ufficio | ex sezione Workspace di settori.html |
| ✅ `arredo-negozi.html` | Arredo negozi | ex sezione Retail di settori.html |
| ✅ `arredamento-bar-ristoranti.html` | Arredamento bar e ristoranti | eredita micro-cat. Food Retail |
| ✅ `arredamento-alimentari-wine-food.html` | Arredamento alimentari, wine e food | eredita micro-cat. Food & Beverage |
| ✅ `arredamento-hotel.html` | Arredamento hotel | ex sezione Hospitality di settori.html |
| ✅ `arredamento-su-misura.html` | Arredamento su misura | rinomina di produzione.html |
| ✅ `chi-siamo.html` | Chi siamo | prima pagina reale, era href="#" |
| ✅ `brand-partner.html` | Brand Partner | archivio filtrabile per categoria |
| ✅ `brand-pedrali.html` | Pedrali (scheda brand) | primo esempio di collegamento bidirezionale brand↔progetto |

## 2. Navigazione principale — priorità alta

La nav principale ha 9 voci, tutte già fatte (sezione 1): Home, le 5
tendine di settore, Arredamento su misura (ex `produzione.html`), Arredo
Contract (`contract.html`), Chi siamo. `prodotti.html`,
`realizzazioni.html` e `architetti.html` non sono più in nav: restano
linkate solo da footer e dalle CTA della home.

| Percorso | Pagina | Linkata da |
|---|---|---|
| ⬜ `prodotti.html` | Prodotti — catalogo per categoria | footer |
| ⬜ `realizzazioni.html` | Realizzazioni — archivio con filtri | footer, CTA "Tutte le realizzazioni", "Archivio completo" |
| ⬜ `architetti.html` | Architetti — servizi per studi | footer |

## 3. Utility e conversione — priorità alta

| Percorso | Pagina | Linkata da |
|---|---|---|
| ⬜ `contatti.html` | Contatti — sedi, form, mappa | topbar, footer, "Contattaci", "Parla con un tecnico" |
| ⬜ `richiedi-preventivo.html` | Richiesta progetto / preventivo | "Richiedi un progetto", "Richiedi un preventivo" (5 CTA) |
| ⬜ `area-progettisti.html` | Area progettisti — accesso riservato | header, hero, "Accedi all'area progettisti" |
| ⬜ `mepa.html` | MEPA / Acquisti in Rete PA | topbar, footer |
| ⬜ `cataloghi.html` | Cataloghi PDF | footer |
| ⬜ `privacy.html` | Privacy policy | footer |
| ⬜ `cookie.html` | Cookie policy | footer |

## 4. Settori — 5 landing

Le 5 landing di settore esistono già come pagine standalone, linkate
dalle tendine di nav, dal mosaico home, dal footer e dai breadcrumb —
vedi sezione 1. I nomi di lavoro sotto sono superati: restano solo come
mappa storica verso i nomi reali.

| Percorso | Note |
|---|---|
| — | ~~`settori-workspace.html`~~ (01 Workspace) → `arredamento-ufficio.html`, vedi sezione 1 |
| — | ~~`settori-retail.html`~~ (02 Retail) → `arredo-negozi.html`, vedi sezione 1 |
| — | ~~`settori-food-beverage.html`~~ (03 Food & Beverage) → `arredamento-alimentari-wine-food.html`, vedi sezione 1 |
| — | ~~`settori-food-retail.html`~~ (04 Food Retail) → `arredamento-bar-ristoranti.html`, vedi sezione 1 |
| — | ~~`settori-hospitality.html`~~ (05 Hospitality) → `arredamento-hotel.html`, vedi sezione 1 |

## 5. Settori — 40 sotto-voci

Le otto voci per settore elencate in ciascuna tendina di nav.

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
| ✅ `brand-pedrali.html` | Pedrali | Contract — vedi sezione 1 |
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

1. ~~Guscio condiviso~~ — superato: il sito è ora completamente statico,
   senza build step; `build.py` e `src/` sono stati rimossi (vedi
   README).
2. **`contatti.html` + `richiedi-preventivo.html`** — chiudono 7 CTA su 8
   della home; senza queste il template resta una vetrina cieca.
3. ~~`settori.html` + le 5 landing di settore~~ — fatto: le 5 landing
   esistono come pagine standalone (sezione 1), `settori.html` è stato
   rimosso.
4. **`realizzazioni.html`** — l'archivio; poi le 8 schede a seguire, che
   riusano un impianto già pronto.
5. **`architetti.html`** — pagina narrativa, `contract.html` e
   `arredamento-su-misura.html` sono già fatte (sezione 1).
6. **`prodotti.html`.** `brand-partner.html` e `chi-siamo.html` sono già
   fatte (sezione 1).
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

## Nota sulla preview su GitHub Pages

Il sito è live su GitHub Pages (branch `main`, root). Le pagine non ancora
create restano `href="#"`: meglio lasciarle così che puntare a file
inesistenti, che su Pages darebbero 404.
