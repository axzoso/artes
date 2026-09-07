# ARTES Contract — mockup live

Struttura statica HTML/CSS/JS del sito **ARTES Contract**, pubblicata su
GitHub Pages come mockup live da far visionare al cliente per
l'approvazione. Da qui parte poi lo sviluppo reale su WordPress (Elementor
o CrocoBuilder di Crocoblock).

## Struttura

```
*.html                Pagine del sito, file piatti — una per pagina
assets/css/artes.css  Foglio di stile unico, organizzato per sezioni
assets/js/artes.js    Tendine di settore in nav + filtri del portfolio
assets/artes-logo.png Logo, 800×217px, ottimizzato per l'uso a schermo (28px/26px)
PAGES.md              Mappa delle pagine ancora da creare
```

Nessuna build: si modificano i file `.html` direttamente. Header (con le
5 tendine indipendenti di settore) e footer sono duplicati in ogni
pagina — un cambiamento a uno di questi blocchi va riportato a mano su
tutte le pagine esistenti.

`realizzazione.html` non è una pagina ma il **layout della scheda
progetto**, che in WordPress diventa un CPT gestito con JetEngine.

## Anteprima

```
python3 -m http.server     # anteprima su localhost:8000
```

## Convenzioni del template

- **Accento**: `--accent` in `:root`. Il canvas prevedeva anche `#171716`
  e `#8A7259` come alternative — cambiare quella variabile è sufficiente.
- **Immagini**: gli slot foto sono `div` con un fondo a righe diagonali
  (`.ph`, `.tile__texture`, `.hero__texture`) e una didascalia tecnica.
  Sostituirli con `<img>` a copertura mantenendo i formati fissi.
- **Nessuna ombra**: la gerarchia nasce da filetti 1px, fondi alterni e
  spazio bianco. Le griglie usano `gap: 1px` su fondo `--line`.
- **Rosso**: massimo tre occorrenze per schermata (numerazione di sezione,
  CTA primaria, stato attivo).
- **Larghezza**: il canvas è desktop-only (`min-width: 1320px`). Il
  template conserva questo vincolo; non è stato inventato un layout
  responsive che il design non definisce.
