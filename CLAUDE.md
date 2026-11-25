# ARTES — contesto di progetto

Sito di **ARTES Arredamenti** (arredi contract su misura, Rende CS). Costruzione chiusa il 2026-11-25: ora si fa **manutenzione**.
Stato dettagliato (ID, impostazioni): [docs/stato-sito.md](docs/stato-sito.md). Cronaca: [docs/diario.md](docs/diario.md) (voci brevi).
Lo storico della costruzione è in `archivio/` e **non va letto** salvo richiesta esplicita.

## Dove sta cosa

- **Radice del repo = grafica approvata (rev2)**: pagine HTML statiche + `assets/` (CSS `assets/css/artes.css`, immagini). È anche l'anteprima
  GitHub Pages `https://axzoso.github.io/artes/`. È la fonte di verità del design: non modificarla senza richiesta.
- **`wp/artes-core/`**: plugin WordPress del sito (indispensabile). `artes-core.php` (logica), `admin/` (menu ARTES), `artes-rev2.css`
  (**generato**, mai a mano), `artes-rev2.js`, `fonts/`, `languages/`, `wpml-config.xml`, `LEGGIMI-MANUTENZIONE.md` (guida per chi subentra).
- **`tools/`**: script di manutenzione e verifica (vedi `tools/README.md`). `tools/out/` è ignorata da Git.
- **`archivio/`**: mockup v1, strumenti e documenti della costruzione. Solo consultazione.

## Sito WordPress

Staging **`https://dev3.minimalstudiodev.it`** (noindex): WordPress + Hello Elementor + Elementor 4 (widget atomici) + Elementor Pro + JetEngine
(CPT `realizzazione`, `brand`; tassonomie `settore`, `categoria`, `categoria_brand`) + WPML (it predefinita, en-gb in `/en/`).
Connettori MCP `artes-elementor` e `novamira-dev3-minimalstud` (in `~/.claude.json`, mai credenziali nel repo): si usano tramite
`tools/rev2/mcp-client.js` (Node) o `tools/mcp.ps1` / `tools/php.ps1`.

## Regole

- **Push solo su richiesta esplicita** (aggiorna l'anteprima vista dal cliente). Niente commit non richiesti.
- Pagine e template si modificano **in Elementor** (fonte dei contenuti). Gli script di costruzione delle pagine sono archiviati: non
  rilanciarli su pagine pubblicate.
- Stile: classi globali = solo etichette; lo stile è in `artes-rev2.css`, generato da `node tools/rev2/port-css.js`
  (`assets/css/artes.css` + `tools/rev2/css/reset.css` + `tools/rev2/css/adattamenti.css`). Le modifiche vanno in `adattamenti.css`
  (selettori `body.rev2 .elementor …`, usare `:where()` per non battere le regole della rev2); ritocchi rapidi in ARTES → Stile.
  Il CSS personalizzato del kit Elementor resta **vuoto**.
- Dopo ogni modifica al plugin: `tools/install-plugin.ps1` (da PowerShell), poi verifiche. Asset CSS/JS al volo: `node tools/rev2/push-asset.js`.
- Moduli: il campo anti-spam Honeypot deve essere l'**ultimo** campo (altrimenti si perdono gli allegati). Prove senza email reali:
  `node tools/rev2/collaudo-modulo.js`.
- Italiano e inglese sono documenti separati: una modifica all'IT non aggiorna l'EN. Indirizzi EN: tabella `tools/rev2/wpml-url-en.js`.
- SEO: il plugin scrive title/description; se si attiva Yoast si fa da parte da solo (ARTES → SEO → Copia in Yoast).
- Nessuna cancellazione definitiva, cambio di impostazioni globali o installazione di plugin senza conferma.

## Verifiche standard (dopo modifiche al sito)

`node tools/rev2/verifica-seo.js` · `node tools/rev2/collaudo-redirect.js` · `node tools/rev2/salute-pagine.js --cpt` ·
`node tools/rev2/verifica-dati.js` · parità con la grafica: `py -3 -m http.server 8765` in radice, poi `node tools/rev2/parita.js <nome>
http://localhost:8765/<file>.html https://dev3.minimalstudiodev.it/<percorso>/`. Controllare sempre 0px di scroll orizzontale a 390px.

## Ambiente (Windows)

- Bash di Git: le barre rovesciate negli heredoc si perdono e gli argomenti che iniziano con `/` diventano percorsi Windows
  (`MSYS_NO_PATHCONV=1`). Per file con regex o apici usare gli strumenti di scrittura, non `sed`/heredoc.
- `install-plugin.ps1` si lancia dallo strumento PowerShell (la policy blocca gli script da Bash).
