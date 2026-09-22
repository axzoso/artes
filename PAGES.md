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

Struttura piatta, senza build: si parte copiando una pagina esistente e si
sostituisce il `<main>`. Header e footer arrivano da `assets/js/shell.js`
tramite i due segnaposto `data-artes-header` / `data-artes-footer`: nav,
footer e tendine di settore si modificano **solo lì**, una volta sola per
tutte le pagine. La voce di menu attiva è calcolata dal nome del file.
Dettagli nel README e in `CLAUDE.md`.

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
| ✅ `arredamento-ufficio.html` | 01 Arredo uffici & workspace | ex sezione Workspace di settori.html |
| ✅ `arredo-negozi.html` | 02 Arredo negozi & retail | ex sezione Retail di settori.html |
| ✅ `arredo-negozi-food.html` | 03 Arredo negozi food | micro-cat. Food Retail; fino al 2026-09-22 era `arredamento-bar-ristoranti.html` |
| ✅ `arredamento-bar-ristoranti.html` | 04 Arredo bar & ristoranti | micro-cat. Food & Beverage; fino al 2026-09-22 era `arredamento-alimentari-wine-food.html` |
| ✅ `arredamento-hotel.html` | 05 Arredo hotel & hospitality | ex sezione Hospitality di settori.html |
| ✅ `arredamento-su-misura.html` | Arredamento su misura | rinomina di produzione.html |
| ✅ `chi-siamo.html` | Chi siamo | prima pagina reale, era href="#" |
| ✅ `brand-partner.html` | Brand Partner | archivio filtrabile per categoria |
| ✅ `brand-pedrali.html` | Pedrali (scheda brand) | primo esempio di collegamento bidirezionale brand↔progetto |

## 2. Navigazione principale — priorità alta

La nav principale ha 9 voci su una riga dedicata sotto logo e azioni: a
sinistra i 5 settori, ciascuno con la propria tendina; a destra
Arredamento su misura (ex `produzione.html`), Arredo Contract
(`contract.html`), Blog (ancora `href="#"`) e Chi siamo. La Home non è in
nav: ci porta il logo. `prodotti.html`, `realizzazioni.html` e
`architetti.html` non sono in nav: restano linkate solo da footer e dalle
CTA della home.

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
| — | ~~`settori-food-retail.html`~~ (Food Retail) → `arredo-negozi-food.html` (03), vedi sezione 1 |
| — | ~~`settori-food-beverage.html`~~ (Food & Beverage) → `arredamento-bar-ristoranti.html` (04), vedi sezione 1 |
| — | ~~`settori-hospitality.html`~~ (05 Hospitality) → `arredamento-hotel.html`, vedi sezione 1 |

## 5. Settori — 40 sotto-voci

Le otto voci per settore elencate in ciascuna tendina di nav.

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

1. ~~Guscio condiviso~~ — fatto il 2026-09-22 senza reintrodurre una build:
   header e footer stanno in `assets/js/shell.js` e le pagine li richiamano
   con due segnaposto (vedi README).
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

URL base: `https://axzoso.github.io/artes/`. Le 13 pagine esistenti
(sezione 1) sono tutte pubblicate — tabella aggiornata a ogni push su
`main`.

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
| Boutique Hotel Aurea (template scheda progetto) | https://axzoso.github.io/artes/realizzazione.html |
| Sistema visivo (documento interno) | https://axzoso.github.io/artes/sistema-visivo.html |
