# Mappa delle pagine — ARTES Contract

> **Nota (2026-09-04):** i 5 "settori" sono stati esplosi da sezioni
> ancorate di `settori.html` (rimosso) a pagine standalone di primo
> livello in nav. Vedi `docs/superpowers/specs/2026-09-04-menu-restructure-design.md`
> per il design completo.
>
> **Nota (2026-09-22):** nomenclatura settori definitiva del cliente
> (Arredo uffici & workspace · Arredo negozi & retail · Arredo negozi food ·
> Arredo bar & ristoranti · Arredo hotel & hospitality), tutti e 5 in nav.
> Corretta l'inversione fra bar/ristoranti e negozi food: vedi `CLAUDE.md`
> §3 e `docs/diario-sessioni.md`.
>
> **Nota (2026-09-28, riunione col cliente):** niente più tendine: i 5
> settori in nav sono link diretti alle loro pagine, che diventano
> descrittive (foto generiche, testo sul settore, ambiti, progetti del
> settore). Nuova voce di nav **Realizzazioni** → `realizzazioni.html`,
> archivio di tutti i progetti filtrabile per i 5 settori. Form contatti
> completo in coda alla scheda realizzazione. Via le numerazioni annidate
> dentro sezioni già numerate.

Elenco di tutte le pagine citate dai link del template. Ricavato dai 110
link distinti presenti in `index.html`, nella scheda realizzazione e
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

Struttura piatta, senza build: si parte copiando una pagina esistente e si
sostituisce il `<main>`. Header e footer arrivano da `assets/js/shell.js`
tramite i due segnaposto `data-artes-header` / `data-artes-footer`: nav,
footer si modificano **solo lì**, una volta sola per
tutte le pagine. La voce di menu attiva è calcolata dal nome del file.
Dettagli nel README e in `CLAUDE.md`.

---

## 1. Già esistenti

| Percorso | Pagina | Note |
|---|---|---|
| ✅ `index.html` | Home | |
| ✅ `realizzazione-*.html` | **14 schede progetto** | stesso layout (in WordPress: template del CPT); dal 2026-09-30 una per ogni card, Aurea era `realizzazione.html` |
| ✅ `sistema-visivo.html` | Sistema visivo | documento interno, fuori dalla nav pubblica |
| ✅ `contract.html` | Contract — il servizio, le 7 fasi | |
| — | ~~`produzione.html`~~ | rinominato in `arredamento-su-misura.html` (vedi sotto) |
| — | ~~`settori.html`~~ | rimosso: contenuto distribuito nelle 5 pagine di settore standalone sotto |
| ✅ `arredamento-ufficio.html` | 01 Arredo uffici & workspace | ex sezione Workspace di settori.html |
| ✅ `arredo-negozi.html` | 02 Arredo negozi & retail | ex sezione Retail di settori.html |
| ✅ `arredo-negozi-food.html` | 03 Arredo negozi food | micro-cat. Food Retail; fino al 2026-09-22 era `arredamento-bar-ristoranti.html` |
| ✅ `arredamento-bar-ristoranti.html` | 04 Arredo bar & ristoranti | micro-cat. Food & Beverage; fino al 2026-09-22 era `arredamento-alimentari-wine-food.html` |
| ✅ `arredamento-hotel.html` | 05 Arredo hotel & hospitality | ex sezione Hospitality di settori.html |
| ✅ `arredamento-su-misura.html` | Arredamento su misura | rinomina di produzione.html |
| ✅ `chi-siamo.html` | Chi siamo | prima pagina reale, era href="#" |
| ✅ `brand-partner.html` | Brand Partner | archivio filtrabile per categoria |
| ✅ `brand-pedrali.html` | Pedrali (scheda brand) | primo esempio di collegamento bidirezionale brand↔progetto |
| ✅ `realizzazioni.html` | Realizzazioni — archivio con filtri | in nav dal 2026-09-28; `?settore=<nome>` preseleziona il filtro |
| ✅ `contatti.html` | Contatti — recapiti, form, mappa | 2026-09-30; `?motivo=tecnico` preseleziona il motivo ("Parla con un tecnico") |
| ✅ `richiedi-preventivo.html` | Richiesta preventivo — modulo completo a gruppi | 2026-09-30; `?settore=<nome>` preseleziona il settore (CTA delle pagine settore) |
| ✅ `area-progettisti.html` | Area progettisti — pagina pubblica per gli studi | 2026-09-30; header, home, footer, contatti. Ha assorbito `architetti.html` |

## 2. Navigazione principale — priorità alta

La nav principale ha 10 voci su una riga dedicata sotto logo e azioni: a
sinistra i 5 settori (link diretti, senza tendine dal 2026-09-28); a
destra Realizzazioni, Arredamento su misura (ex `produzione.html`), Arredo
Contract (`contract.html`), Blog (ancora `href="#"`) e Chi siamo. La Home
non è in nav: ci porta il logo. `prodotti.html` non è in nav: resta
linkata solo dal footer.

| Percorso | Pagina | Linkata da |
|---|---|---|
| ⬜ `prodotti.html` | Prodotti — catalogo per categoria | footer |

## 3. Utility e conversione — priorità alta

| Percorso | Pagina | Linkata da |
|---|---|---|
| ⬜ `mepa.html` | MEPA / Acquisti in Rete PA | topbar, footer |
| ⬜ `cataloghi.html` | Cataloghi PDF | footer |
| ⬜ `privacy.html` | Privacy policy | footer |
| ⬜ `cookie.html` | Cookie policy | footer |

## 4. Settori — 5 landing

Le 5 landing di settore esistono già come pagine standalone, linkate
dalla nav, dal mosaico home, dal footer e dai breadcrumb —
vedi sezione 1. I nomi di lavoro sotto sono superati: restano solo come
mappa storica verso i nomi reali.

| Percorso | Note |
|---|---|
| — | ~~`settori-workspace.html`~~ (01 Workspace) → `arredamento-ufficio.html`, vedi sezione 1 |
| — | ~~`settori-retail.html`~~ (02 Retail) → `arredo-negozi.html`, vedi sezione 1 |
| — | ~~`settori-food-retail.html`~~ (Food Retail) → `arredo-negozi-food.html` (03), vedi sezione 1 |
| — | ~~`settori-food-beverage.html`~~ (Food & Beverage) → `arredamento-bar-ristoranti.html` (04), vedi sezione 1 |
| — | ~~`settori-hospitality.html`~~ (05 Hospitality) → `arredamento-hotel.html`, vedi sezione 1 |

## 5. Settori — 40 sotto-voci

Le otto voci per settore, elencate come "Ambiti" (testo, non link) in
ciascuna pagina settore. Dal 2026-09-28 il cliente non le vuole nel menu:
per ora nessuna pagina dedicata.

> **Raccomandazione:** non farne 40 pagine separate, almeno all'inizio.
> Con i contenuti attuali sarebbero quasi identiche fra loro e povere per
> il posizionamento. Meglio renderle **sezioni ancorate** dentro la
> landing del settore (`settori-hospitality.html#spa-wellness`), e
> promuoverne a pagina singola solo quelle con realizzazioni proprie da
> mostrare. L'elenco resta completo qui sotto per quando servirà.

**Arredo uffici & workspace** — `uffici-direzionali` · `open-space` ·
`coworking` · `sale-meeting` · `academy-formazione` ·
`scuole-universita-biblioteche` · `reception-corporate` · `business-lounge`

**Arredo negozi & retail** — `boutique-moda` · `showroom-concept-store` ·
`profumerie-beauty` · `gioiellerie-ottiche` · `farmacie` ·
`telefonia-elettronica` · `store-sportivi` · `temporary-franchising`

**Arredo negozi food** — `panetterie-bakery` · `pasticcerie` ·
`gastronomie-salumerie` · `macellerie-pescherie` · `caseifici` ·
`alimentari-market-gourmet` · `chocolate-take-away` · `healthy-food-store`

**Arredo bar & ristoranti** — `bar-caffetterie` · `bistrot-ristoranti` ·
`pizzerie-pub` · `lounge-cocktail-bar` · `wine-bar-enoteche` ·
`gelaterie` · `fast-casual-street-food` · `food-court-rooftop`

**Arredo hotel & hospitality** — `hotel-resort` · `boutique-hotel-bb` ·
`spa-wellness` · `reception-lounge-hotel` · `aree-breakfast` ·
`rooftop-hospitality` · `residence-business-hotel` ·
`studentati-foresterie-co-living`

## 6. Realizzazioni — nessuna pagina da creare

Le schede `realizzazione-*.html` condividono il layout della scheda
progetto, che in WordPress diventa un Custom Post Type gestito con
JetEngine (Crocoblock). Le singole realizzazioni sono record del CPT, non
file statici — il template si costruisce una volta sola.

L'archivio (`realizzazioni.html`) esiste dal 2026-09-28; in WordPress
diventa l'archivio del CPT filtrato per la tassonomia dei 5 settori. In
coda a ogni scheda c'è il form contatti completo (richiesta del cliente).

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

1. ~~Guscio condiviso~~ — fatto il 2026-09-22 senza reintrodurre una build:
   header e footer stanno in `assets/js/shell.js` e le pagine li richiamano
   con due segnaposto (vedi README).
2. ~~`contatti.html` + `richiedi-preventivo.html`~~ — fatte il 2026-09-30;
   tutte le CTA "Contattaci", "Richiedi un preventivo/progetto" e "Parla
   con un tecnico" del sito puntano lì.
3. ~~`settori.html` + le 5 landing di settore~~ — fatto: le 5 landing
   esistono come pagine standalone (sezione 1), `settori.html` è stato
   rimosso.
4. ~~`realizzazioni.html`~~ — fatta il 2026-09-28. Le schede sono record
   del CPT (sezione 6), non file da creare.
5. ~~`architetti.html`~~ — fatta il 2026-09-30, poi unita in
   `area-progettisti.html` (pagina pubblica, non riservata).
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
- fra sezioni chiare consecutive niente filetto: si alterna il fondo con la
  classe `.bg-alt` (token `--stone`);
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

## Pagine live

URL base: `https://axzoso.github.io/artes/`. Tabella aggiornata a ogni
push su `main`: le pagine create dopo l'ultimo push (sezione 1) non sono
ancora online.

| Pagina | Link |
|---|---|
| Home | https://axzoso.github.io/artes/index.html |
| Arredo Contract | https://axzoso.github.io/artes/contract.html |
| Arredo uffici & workspace | https://axzoso.github.io/artes/arredamento-ufficio.html |
| Arredo negozi & retail | https://axzoso.github.io/artes/arredo-negozi.html |
| Arredo negozi food | https://axzoso.github.io/artes/arredo-negozi-food.html |
| Arredo bar & ristoranti | https://axzoso.github.io/artes/arredamento-bar-ristoranti.html |
| Arredo hotel & hospitality | https://axzoso.github.io/artes/arredamento-hotel.html |
| Arredamento su misura | https://axzoso.github.io/artes/arredamento-su-misura.html |
| Chi siamo | https://axzoso.github.io/artes/chi-siamo.html |
| Brand Partner | https://axzoso.github.io/artes/brand-partner.html |
| Pedrali (scheda brand) | https://axzoso.github.io/artes/brand-pedrali.html |
| Boutique Hotel Aurea (scheda progetto) | https://axzoso.github.io/artes/realizzazione-boutique-hotel-aurea.html |
| Sistema visivo (documento interno) | https://axzoso.github.io/artes/sistema-visivo.html |
