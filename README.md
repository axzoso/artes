# ARTES Contract — template sito

Implementazione statica del canvas Claude Design **ARTES Contract**
(`ARTES Contract.dc.html`), riportato da prototipo a sito reale.

## Struttura

```
build.py              Assembla le pagine: src/ → root
src/shell.html        Il guscio: head, header, mega menu, barra viste, footer
src/pages/*.html      Una per pagina: front-matter + solo il <main>
*.html                Pagine generate — NON modificare a mano
assets/css/artes.css  Foglio di stile unico, organizzato per sezioni
assets/js/artes.js    Mega menu "Settori" + filtri del portfolio
assets/artes-logo-black.png   ⚠️ da fornire (vedi sotto)
PAGES.md              Mappa delle pagine ancora da creare
```

`realizzazione.html` non è una pagina ma il **layout della scheda
progetto**, che in WordPress diventa un CPT gestito con JetEngine.

La barra grigia sotto l'header ("Bozza template — v1") è il selettore di
vista del prototipo: nel sito reale va rimossa dal guscio insieme al
blocco `.screenbar`.

## Come si lavora

Le pagine in root sono **generate**: modificarle a mano significa perdere
le modifiche al build successivo. Si tocca `src/`, poi si ricostruisce.

```
python3 build.py           # rigenera tutte le pagine
python3 build.py --check   # verifica se la root è allineata a src/
python3 -m http.server     # anteprima su localhost:8000
```

### Aggiungere una pagina

Creare `src/pages/nome-pagina.html`:

```html
<!--
title: Titolo della pagina
description: Meta description per i motori di ricerca.
nav: nome-pagina.html   # voce di menu da evidenziare (opzionale)
view: index.html        # vista del prototipo da evidenziare (opzionale)
-->
<main>
  …
</main>
```

Poi `python3 build.py`. Se la pagina va anche nel menu, il link si
aggiunge in `src/shell.html` — una volta sola, vale per tutte.

La voce "Settori" si evidenzia con `nav: settori`: nel menu è il trigger
del mega menu, non un link come gli altri.

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
