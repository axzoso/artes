# ARTES Contract — template sito

Implementazione statica del canvas Claude Design **ARTES Contract**
(`ARTES Contract.dc.html`), riportato da prototipo a sito reale.

## Struttura

```
index.html            Home — hero, metodo (7 fasi), settori, produzione,
                      realizzazioni con filtri, brand partner, doppia CTA
realizzazione.html    Scheda realizzazione — Boutique Hotel Aurea
sistema-visivo.html   Palette, tipografia, scala, regole di griglia
assets/css/artes.css  Foglio di stile unico, organizzato per sezioni
assets/js/artes.js    Mega menu "Settori" + filtri del portfolio
assets/artes-logo-black.png   ⚠️ da fornire (vedi sotto)
```

Le tre pagine corrispondono alle tre viste del canvas. La barra grigia
sotto l'header ("Bozza template — v1") è il selettore di vista del
prototipo: nel sito reale va rimossa insieme al blocco `.screenbar`.

## Avvio

Nessuna build. Serve un server statico qualsiasi:

```
python3 -m http.server 8000
```

## Logo mancante

`assets/artes-logo-black.png` non è incluso: il trasferimento del binario
dal progetto Design non è andato a buon fine e il file corrotto è stato
rimosso invece di essere pubblicato. Scaricare `assets/artes-logo-black.png`
dal progetto Claude Design e collocarlo in `assets/`. Il markup lo
referenzia già in header (`height: 28px`) e footer (`height: 26px`).

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
