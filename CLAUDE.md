# ARTES Contract — contesto di progetto

Documento di riferimento per riprendere il lavoro senza rileggere tutto il
sito. Claude Code lo carica in automatico a ogni sessione.

**Storico delle sessioni:** [docs/diario-sessioni.md](docs/diario-sessioni.md)
— cosa è stato chiesto, cosa è stato fatto e perché, sessione per sessione.
Leggere la voce più recente (in alto) per sapere cosa è rimasto aperto.
A fine sessione: aggiungere una voce al diario e aggiornare questo file se
è cambiato qualcosa di strutturale.

---

## 1. Cos'è questo progetto

Mockup statico HTML/CSS/JS del sito **ARTES Arredamenti** (arredi contract su
misura, Rende CS). Serve a far approvare al cliente struttura, nomenclatura e
contenuti **prima** dello sviluppo reale, che avverrà su WordPress (Elementor
o CrocoBuilder/Crocoblock).

- Live su GitHub Pages: `https://axzoso.github.io/artes/` (branch `main`, root).
  Ogni push su `main` aggiorna la preview che il cliente sta guardando →
  **push solo quando richiesto esplicitamente.**
- Preview locale: `py -3 -m http.server` nella root, poi `localhost:8000`.
  Lo shell è caricato come `<script src>` e non via `fetch`, quindi il sito
  si vede completo anche aprendo i file con doppio clic (`file://`).

## 2. Architettura

```
*.html                 13 pagine, file piatti in root (niente sottocartelle)
assets/css/artes.css   foglio unico, sezioni numerate 1-13 in testa al file
assets/js/shell.js     >>> UNICA SORGENTE di header e footer <<<
assets/js/artes.js     tendine di settore, filtri progetti/brand, nav mobile
assets/img/            foto reali (progetti/ per cliente, sfuse/ per i blocchi)
assets/artes-logo.png  logo 800×217, usato a 28px (header) e 26px (footer)
```

Nessuna build: si modificano i file `.html` direttamente.

### Regola operativa più importante

**Header e footer si modificano solo in `assets/js/shell.js`.** Ogni pagina
contiene due segnaposto e carica lo shell:

```html
<body>
<div data-artes-header></div>
<script src="assets/js/shell.js"></script>

<main> … contenuto della pagina … </main>

<div data-artes-footer></div>
<script src="assets/js/artes.js"></script>
</body>
```

Lo `<script>` dello shell sta **subito dopo** il segnaposto header e non è
deferito: viene eseguito durante il parsing, quando il segnaposto esiste già
e prima del primo paint (niente flash). Il footer viene iniettato su
`DOMContentLoaded`. La classe `is-active` della voce di menu è calcolata a
runtime dal nome del file corrente: non va scritta nelle pagine.

Non reintrodurre header/footer copiati nelle pagine: prima del 2026-09-22 lo
erano, e una modifica al menu costava 162 righe identiche × 13 file.

Trade-off accettato: header e footer non sono nel sorgente HTML statico.
Va bene per un mockup di approvazione che in WordPress diventerà
`header.php`/`footer.php`; da ricordare se si valuta la SEO del mockup.

## 3. I 5 settori

Nomenclatura approvata dal cliente (mail del 2026-09-22). I nomi vanno usati
identici in nav, footer, `<title>`, breadcrumb, eyebrow, mosaico home e
filtri progetti.

| # | Nome | File | Ambiti |
|---|---|---|---|
| 01 | Arredo uffici & workspace | `arredamento-ufficio.html` | uffici, open space, coworking, sale meeting, scuole, enti pubblici |
| 02 | Arredo negozi & retail | `arredo-negozi.html` | boutique, showroom, farmacie, store sportivi (no food) |
| 03 | Arredo negozi food | `arredo-negozi-food.html` | panetterie, pasticcerie, gastronomie, macellerie, market |
| 04 | Arredo bar & ristoranti | `arredamento-bar-ristoranti.html` | bar, bistrot, pizzerie, cocktail bar, gelaterie |
| 05 | Arredo hotel & hospitality | `arredamento-hotel.html` | hotel, resort, spa, lounge, residence, studentati |

Criteri del cliente: termini cercati sul web + posizionamento professionale
(target di clientela selezionata). "Workspace", "retail" e "hospitality"
servono ad allargare il settore oltre l'arredo di base.

**Storia da conoscere:** fino al 2026-09-22 i settori 03 e 04 erano
invertiti — il file `arredamento-bar-ristoranti.html` conteneva panetterie e
pasticcerie, `arredamento-alimentari-wine-food.html` conteneva bar e
bistrot. L'inversione nasceva da una mappatura confermata due volte dal
cliente a settembre (vedi
`docs/superpowers/specs/2026-09-04-menu-restructure-design.md`) e poi
smentita. È stata risolta scambiando i nomi file, non i contenuti.

## 4. Struttura del menu

Header a due righe (solo sopra i 1024px):

```
riga 1   [LOGO]                            [AREA PROGETTISTI] [CONTATTACI]
riga 2   i 5 settori, ognuno con tendina │ Su misura · Contract · Blog · Chi siamo
```

Sopra c'è la topbar (payoff, MEPA, contatti, lingua). Sotto i 1024px topbar
e riga nav spariscono e subentra il pannello hamburger `.mobile-nav`, con i
5 settori come accordion.

La riga nav è calibrata sulla larghezza minima desktop (1320px): corpo
13,5px per i settori e 13px per le voci aziendali, ~75px di stacco fra i
due gruppi. **Aggiungere una voce o allungare un nome richiede di
ricontrollare a 1320px** che la riga non sfori. Le tendine si aprono
allineate sotto la propria voce (`--drop-x`, calcolata da `artes.js`).

## 5. Convenzioni di stile

Vincolanti, definite in `sistema-visivo.html` e in `PAGES.md` §"Regole di
stile":

- nessun `box-shadow`, nessun angolo arrotondato: filetti 1px, fondi
  alterni, spazio bianco; griglie con `gap: 1px` su fondo `--line`;
- margini laterali fissi 40px (`--pad`), gutter 20px;
- rosso `--accent` massimo tre volte per schermata (numerazione di sezione,
  CTA primaria, stato attivo) — mai come fondale;
- spazi verticali sulla scala 20 / 34 / 44 / 80 / 110px, sezioni 96-120px;
- riusare le classi esistenti prima di scriverne di nuove: `.eyebrow`,
  `.h-section`, `.lead`, `.link-rule`, `.btn`, `.section__head`, `.ph`;
- il CSS è desktop-first: `body { min-width: 1320px }` e due breakpoint di
  adattamento (≤1024px tablet, ≤640px mobile) nella sezione 13.

## 6. Pagine

13 pagine esistenti: home, i 5 settori, `arredamento-su-misura.html`,
`contract.html`, `chi-siamo.html`, `brand-partner.html`, `brand-pedrali.html`,
`realizzazione.html`, `sistema-visivo.html`.

- `realizzazione.html` **non è una pagina**: è il layout della scheda
  progetto, che in WordPress diventa un CPT gestito con JetEngine.
- `sistema-visivo.html` è un documento interno, fuori dalla nav pubblica.
- Le pagine non ancora create restano `href="#"` (su Pages un link a un file
  inesistente darebbe 404).

Mappa completa delle pagine fatte e da fare, con priorità: **`PAGES.md`**.

## 7. Dove sta la documentazione

| File | Contenuto |
|---|---|
| `CLAUDE.md` | questo file: contesto, architettura, regole |
| `docs/diario-sessioni.md` | storico delle sessioni di lavoro |
| `PAGES.md` | mappa pagine fatte/da fare, regole di stile, link live |
| `README.md` | descrizione breve del repo e convenzioni del template |
| `docs/superpowers/specs/` | design spec delle ristrutturazioni passate |
| `docs/superpowers/plans/` | piani di implementazione relativi |
