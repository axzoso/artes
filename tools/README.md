# tools/ — manutenzione e verifica del sito WordPress

Script Node (22+, senza dipendenze) e PowerShell per lavorare su dev3 da Claude Code. **Nessuna credenziale qui**: URL e password
applicazione si leggono da `~/.claude.json` (server MCP `artes-elementor`, `novamira-dev3-minimalstud`). I file temporanei e i backup vanno in
`tools/out/` (ignorata da Git). Gli script della costruzione (fasi 1-9, import, conversione delle pagine) sono in `archivio/strumenti-*`.

## Base

| Comando | A cosa serve |
|---|---|
| `tools/install-plugin.ps1` (da PowerShell) | impacchetta `wp/artes-core/` in `tools/out/artes-core.zip`, lo installa su dev3, verifica, svuota le cache. In produzione si carica lo stesso ZIP |
| `node tools/rev2/port-css.js` | **genera** `wp/artes-core/artes-rev2.css` da `assets/css/artes.css` + `rev2/css/reset.css` + `rev2/css/adattamenti.css`; le immagini usate nel CSS sono mappate sulla libreria in `rev2/css/immagini.json` (se ne manca una si ferma) |
| `node tools/rev2/push-asset.js [artes-rev2.css\|artes-rev2.js]` | carica subito CSS/JS del plugin su dev3 (giro veloce) |
| `mcp.ps1`, `php.ps1 -File x.php [-Max 20000]`, `jerun.ps1`, `flush.php` | chiamate MCP, PHP su dev3 (passato a `eval`: niente `<?php`, si usa `return`; output tagliato a 8000 caratteri), tool JetEngine, svuota cache |
| `rev2/mcp-client.js` | client MCP in Node: `connetti('novamira'\|'elementor')` → `.call/.callJson/.php` |
| `rev2/cdp-session.js` | Chrome headless riusabile (usato dalle verifiche) |
| `snapshot-dev3.ps1`, `riserva-moduli.ps1` | snapshot JSON di dev3; copia dei moduli come template `[Riserva]` |

## Verifiche (sola lettura, escono con 1 se qualcosa non va)

| Comando | Controlla |
|---|---|
| `node tools/rev2/verifica-seo.js` | 51 pagine: HTTP 200, title/description attesi, un solo H1, alt |
| `node tools/rev2/verifica-dati.js [--dettagli]` | dati di dev3 = grafica (termini, campi, schede, foto, relazioni). Usa `tools/out/rev2/dati-rev2.json`, rigenerato da solo da `dati-rev2.js` se manca |
| `node tools/rev2/collaudo-redirect.js` | redirect dei termini, indirizzi filtrati, 404 |
| `node tools/rev2/salute-pagine.js <percorso…> \| --cpt` | H1, immagini rotte, errori console/4xx, scroll orizzontale. `--cpt` = 40 schede e archivi; le pagine statiche vanno elencate |
| `node tools/rev2/verifica-font.js` | nessuna richiesta a Google Fonts |
| `node tools/rev2/collaudo-modulo.js` | invio reale dei moduli con allegati **senza email** (modalità prova) |
| `node tools/rev2/parita.js <nome> <url-locale> <url-dev3>` | confronto a pixel con la grafica (`py -3 -m http.server 8765` in radice) |
| `parita-tutte.js`, `fase5-pagine.js --parita`, `contenuti.js`, `geometria.js`, `collaudo-*.js` | parità estesa, contenuti, geometria, interazioni (archivi, schede, header, FAQ) |
| `controllo-link.js @elenco.txt` | link interni |

## Contenuti e lingue

- `rev2/wpml-url-en.js`: **tabella unica degli indirizzi inglesi** (lanciato da solo stampa pagine, basi e termini). `wpml-trad-dati.js`, `wpml-trad-pagine.js`, `wpml-trad-alt.js`,
  `wpml-slug-cpt.js` (tutti `--piano`/`--esegui`/`--rollback`): traduzioni EN già fatte; da rilanciare solo per rifare l'inglese da zero.
- `rev2/modelli/*.html` + `dinamici.js` + `costruisci-modello.js`: sorgenti dei template dinamici (realizzazione, brand, archivi, 404, blog).
  **Non rilanciare su template già modificati in Elementor.**
- `blog-template.js --stato|--pubblica`, `anteprima-blog.js`: blog (template in bozza). `pagina-404.js`, `modulo-honeypot.js`, `font-locali.js`,
  `favicon.py` (Python + Pillow: icone del sito dal simbolo del logo in `wp/artes-core/icone/`).
