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
- Se il sito live non riflette `main`, controllare prima quale branch
  pubblica Pages (Settings → Pages). Dall'11 al 22 settembre 2026 era
  impostato sul branch di prova `test-sfondi-alternati` e i push su `main`
  non venivano pubblicati. Controllo rapido senza accesso alle impostazioni:
  `curl -s "https://api.github.com/repos/axzoso/artes/actions/runs?per_page=3"`
  mostra lo SHA dell'ultimo deploy.
- Preview locale: `py -3 -m http.server` nella root, poi `localhost:8000`.
  Lo shell è caricato come `<script src>` e non via `fetch`, quindi il sito
  si vede completo anche aprendo i file con doppio clic (`file://`).

## 2. Architettura

```
*.html                 30 pagine, file piatti in root (niente sottocartelle)
assets/css/artes.css   foglio unico, sezioni numerate 1-16
assets/js/shell.js     >>> UNICA SORGENTE di header e footer <<<
assets/js/artes.js     filtri progetti/brand, nav mobile, slider home, form
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
La voce "Realizzazioni" resta attiva anche sulle schede `realizzazione-*.html`
grazie a `data-nav-alias` (un alias che finisce con `*` vale come prefisso).

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

Header a due righe (solo da 1366px in su):

```
riga 1   [LOGO]                                   [AREA PROGETTISTI] [CONTATTACI]
riga 2   i 5 settori │ Realizzazioni · Su misura · Contract · Blog · Chi siamo
```

**Nessuna tendina** (decisione della riunione del 2026-09-28): i 5 settori
sono link diretti alle loro pagine. Le sotto-voci (ambiti) compaiono solo
come testo dentro ciascuna pagina settore.

Sopra c'è la topbar (payoff, MEPA, contatti, lingua). Fino a 1365px topbar
e riga nav spariscono e subentra il pannello hamburger `.mobile-nav`, con
le stesse voci come link semplici (regole in sezione 14 di `artes.css`).

La riga nav è calibrata su 1366px, la larghezza minima in cui appare:
corpo 13px, ~60px di stacco fra i due gruppi (sotto ~1300px sfora).
**Aggiungere una voce o allungare un nome richiede di ricontrollare a
1366px** e, se serve, alzare il breakpoint. Le tre righe dell'header
(topbar, logo, menu) condividono la stessa larghezza: sopra i 1600px il
contenuto si centra su 1600px (regola `@media (min-width: 1600px)` in
sezione 14).

## 5. Convenzioni di stile

Vincolanti, definite in `sistema-visivo.html` e in `PAGES.md` §"Regole di
stile", **aggiornate dal restyling del 2026-09-30** (sezioni 14-15 di
`artes.css`, vedi sotto):

- palette bianco / nero / rosso: fondo `--bone` #FFF, fasce scure
  (`--sand`, footer, brand) #111, rosso `--accent` #D71920;
- nessun `box-shadow`, nessun angolo arrotondato; le separazioni sono
  soprattutto spazio: le griglie (`.fasi`, `.lavorazioni`, `.brands`,
  `.grid-1px`) hanno gap di 18-34px su fondo trasparente, non più `gap: 1px`
  su fondo `--line`;
- lo stacco fra sezioni chiare consecutive si fa col fondo, non col
  filetto: classe `.bg-alt` (token `--stone`, #E8E8E8) sulla sezione. I
  filetti restano solo dentro i componenti (griglie, liste, colonne);
- margini laterali fissi 40px (`--pad`), gutter 20px;
- rosso `--accent` massimo tre volte per schermata (numerazione di sezione,
  CTA primaria, stato attivo) — mai come fondale;
- spazi verticali sulla scala 20 / 34 / 44 / 80 / 110px, sezioni 96-120px;
- riusare le classi esistenti prima di scriverne di nuove: `.eyebrow`,
  `.h-section`, `.lead`, `.link-rule`, `.btn`, `.section__head`, `.ph`;
- numerazione solo a livello di sezione ("01 — Il metodo"): dentro una
  sezione numerata gli elenchi non si numerano (richiesta del cliente,
  2026-09-28). Se serve un'etichetta, una parola (`.card__n` "Officina
  interna", "Acustica"), non un numero;
- layout fluido (`body { min-width: 0 }` dal restyling) con breakpoint
  ≤1365 (header hamburger), ≤1180, ≤1024, ≤780, ≤640, ≤460px. Le sezioni
  13 (originale) e 14-15 (restyling) coesistono: le 14-15 vengono dopo e
  vincono a parità di specificità.

### Restyling del 2026-09-30

Il titolare ha rifatto la grafica con ChatGPT partendo dal commit `0d21fa1`
(prima di sfondi alternati e shell). Le sue modifiche erano tutte in coda al
CSS e sono state riportate come sezioni 14 e 15, più lo slider della
sezione Produzione in home (`initProduzioneSlider` in `artes.js`). Per
confrontare di nuovo con la sua versione, fare il diff del suo
`assets/css/artes.css` contro `git show 0d21fa1:assets/css/artes.css`.

## 6. Pagine

30 pagine: home, i 5 settori, `arredamento-su-misura.html`,
`contract.html`, `chi-siamo.html`, `brand-partner.html`, `brand-pedrali.html`,
`realizzazioni.html` + 14 schede `realizzazione-*.html`, `contatti.html`,
`richiedi-preventivo.html`, `area-progettisti.html`, `sistema-visivo.html`.

- Le 5 pagine settore seguono tutte lo stesso schema: intro → foto
  generica (`.page-band`) → "Il settore" (testo + 3 schede) → ambiti →
  progetti del settore con filtro per ambito → link all'archivio già
  filtrato (`realizzazioni.html?settore=<nome settore>`) → CTA.
- `realizzazioni.html` è l'archivio di tutti i progetti, filtrabile per i
  5 settori; il parametro `?settore=` preseleziona il filtro (`artes.js`).
- I form (`[data-contatti]`: scheda realizzazione, contatti, richiedi
  preventivo) condividono le classi `.contatti`/`.form` e l'invio simulato.
  Un parametro URL con il nome di una `<select>` la preseleziona: le CTA
  "Richiedi un preventivo" delle pagine settore passano `?settore=`,
  "Parla con un tecnico" passa `contatti.html?motivo=tecnico#scrivici`.
  Nuove CTA verso queste pagine vanno scritte allo stesso modo.

- Le **schede realizzazione** sono 14 file `realizzazione-<slug>.html`, tutti
  con la stessa struttura: intro, foto, dettagli tecnici (niente sezione
  "Materiali e finiture", tolta su richiesta il 2026-09-30; solo Aurea ha
  a fianco i brand coinvolti), altre realizzazioni, form contatti completo (`.contatti`/`.form`, sezione 16 del
  CSS; invio simulato da `initForm` in `artes.js`). In WordPress diventano
  un unico template del CPT gestito con JetEngine: qui sono file separati
  solo perché il sito sia navigabile. Per aggiungere un progetto si copia
  una scheda, si aggiunge la card in `realizzazioni.html` (e nella pagina
  settore) con lo stesso nome in `.progetto__nome`.
- Nelle schede di clienti reali non si inventano superfici, tempi, brand o
  progettisti: solo ambienti e arredi visibili nelle foto. Cifre e brand
  compaiono solo in Boutique Hotel Aurea, progetto fittizio con foto reali.
  Anche Resort Capo Bianco, Spa Terme Luigiane e Business Hotel Fera sono
  fittizi e hanno solo foto di repertorio: da sostituire con progetti veri.
- `area-progettisti.html` è una pagina **pubblica** per attirare gli studi
  che hanno già una commessa per un proprio cliente (non un'area riservata).
  Ci portano il pulsante "Area Progettisti" dell'header, le CTA della home e
  il footer.
- `sistema-visivo.html` è un documento interno, fuori dalla nav pubblica.
- Le pagine non ancora create restano `href="#"` (su Pages un link a un file
  inesistente darebbe 404). Al 2026-09-30 restano solo: Blog, Prodotti,
  MEPA / PA, Cataloghi PDF (footer) e l'informativa privacy dei form. Un
  elemento senza destinazione è meglio non cliccabile (es. i brand senza
  scheda in `brand-partner.html` sono `<div>`).

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
