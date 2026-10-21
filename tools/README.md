# tools/ — script per costruire il sito WordPress da Claude Code

Script PowerShell/Node/PHP usati per portare il mockup su WordPress
(`dev3.minimalstudiodev.it`). Non fanno parte del sito statico e non vengono
pubblicati. Il piano e lo stato sono in
[`docs/wp-migration.md`](../docs/wp-migration.md) e
[`docs/wp-stato-dev3.md`](../docs/wp-stato-dev3.md).

**Nessuna credenziale in questa cartella.** URL e password applicazione si
leggono da `~/.claude.json` (progetto `artes`, ambito locale), dove li ha
messi `claude mcp add`. I file temporanei vanno in `tools/out/` (ignorata da
Git).

Requisiti: Windows + PowerShell, Node 22+, Chrome (solo per `shot.ps1`), i due
server MCP registrati (`artes-elementor`, `novamira-dev3-minimalstud`).

## Perché esistono

Dopo il riavvio di Claude Code gli strumenti dei due server MCP non compaiono
come tool nativi. Questi script parlano con gli stessi server via JSON-RPC.
JetEngine, poi, espone i suoi strumenti solo con un nonce di sessione: si
eseguono dall'interno di WordPress tramite Novamira.

## Script generici

| Script | A cosa serve |
|---|---|
| `mcp.ps1 -Server elementor\|novamira -Tool <nome> -ArgsJson '{…}'` | Chiama un tool MCP. Per Novamira il tool è `mcp-adapter-execute-ability` con `{"ability_name":"…","parameters":{…}}` |
| `php.ps1 -File x.php` | Esegue il PHP del file su dev3 (Novamira `execute-php`). Si usa `return $valore;` |
| `jerun.ps1 -Tool tool-add-cpt -BodyFile x.json` | Esegue un tool MCP di JetEngine (CPT, tassonomie, meta box, query…) con nonce e payload `{"input": …}` |
| `compose.ps1 -File x.json` | Invia un JSON a `elementor-build-composition` |
| `flush.php` (con `php.ps1`) | Svuota cache a oggetti e file di Elementor. **Da lanciare dopo ogni composizione**, altrimenti il sito serve la versione vecchia |
| `shot.ps1 -Url … -Out x.png -W 1440 -H 3000` | Screenshot con Chrome headless. Sotto ~500px di larghezza ritaglia invece di emulare il mobile |
| `node cdp.js shot\|hover\|style <url> …` | Pilota Chrome via protocollo di debug: `shot` fa screenshot anche con **emulazione di un telefono vero** (`--mobile --width 390`), può cliccare (`--click "<selettore>"`, per aprire l'hamburger) e catturare tutta la pagina (`--full`), segnalando lo scroll orizzontale; `hover` simula l'hover e misura **di quanto si sposta** l'elemento, quanto cambia l'altezza della pagina e quali stili cambiano; `style` stampa transizioni, colori e geometria. Mostra cosa fa davvero il browser, cosa che lo screenshot di `shot.ps1` (min. ~500px, senza click) non permette |
| `check-render.ps1 -Slugs …` | Scarica le schede e riassume titolo, galleria, specifiche, brand, altre realizzazioni |

## Template singolo "realizzazione"

`gen-template.ps1` genera la composizione (struttura XML, widget, classi
globali, stili) e `rebuild-template.ps1` la applica al site part 138: genera →
compone → **pubblica** → svuota le cache. Per cambiare il template si modifica
`gen-template.ps1` e si rilancia `rebuild-template.ps1`.

Le classi globali usate dal template (sezione "scheda") sono definite in
Elementor, non qui: l'elenco e i valori sono in `docs/wp-stato-dev3.md`.

## Header e footer

`gen-header-footer.ps1 -Which header|footer` genera la composizione; 
`rebuild-header-footer.ps1` rigenera e pubblica entrambi (site part 199 e 200) e
svuota le cache. Per cambiarli si modifica il generatore e si rilancia lo script.

I menu (widget `nav-menu`) non si stilano dalla composizione: lo stile e il responsive stanno in `wp/artes-core/artes-core.css`, che il **plugin** carica sul sito (non è più nel CSS del kit di Elementor, che deve restare vuoto). Si modifica il file e si rilascia con `install-plugin.ps1`.

## Modulo di contatto

`lib-contatti.ps1` (si include con dot-sourcing) definisce `New-ContattiSection`: intro +
modulo `e-form` come nelle schede del mockup, riusabile nei template e nelle pagine. In testa
al file ci sono il **destinatario temporaneo** (`$DestinatarioEmail`, oggi `info@artes.it`),
i formati degli allegati (DWG compreso), la dimensione massima (10 MB) e il numero massimo
(3). `gen-template.ps1` la include in fondo al template delle realizzazioni.
`fix-form-ampersands.ps1 -Ids <post>` corregge le `&` raddoppiate dal widget select dopo la
pubblicazione (lo fa già `rebuild-template.ps1`).

Per provare un invio vero senza spedire email: un file temporaneo nella sandbox con un filtro
`pre_wp_mail` che registra il messaggio e restituisce `true`, poi
`node cdp.js eval <url> "<js che compila e invia>" --file tools/out/prova.dwg`; **il filtro
va sempre rimosso dopo**. Dettagli e limiti in `docs/wp-stato-dev3.md`.

## Archivio realizzazioni

`gen-archive.ps1` genera la composizione (intestazione, filtri, griglia, paginazione,
fascia finale) e `rebuild-archive.ps1` la applica al site part 213: genera → compone →
pubblica → svuota le cache. Serve sia `/realizzazioni/` sia le pagine dei settori.
`setup/mottura-e-menu-filtri.php` crea il brand Mottura e il menu "Filtri
realizzazioni"; `setup/ordine-realizzazioni.php` imposta l'ordine del mockup.

## Brand Partner

`gen-archive-brand.ps1` (site part 447) e `gen-single-brand.ps1` (448); `rebuild-brand.ps1` li
genera, compone, pubblica e svuota le cache. `setup/classi-brand.ps1` crea le 4 classi della
griglia, `setup/menu-filtri-brand.php` il menu `filtri-brand`.

`setup/campi-brand.php` aggiunge i campi della scheda completa; `setup/contenuti-pedrali.php` compila Pedrali (esempio per gli altri brand).
`setup/pagine-prodotti-mepa.php` crea le pagine Prodotti e MEPA, `setup/menu-footer-prodotti-mepa.php` le mette nel menu footer.

## Pagine (settori, home, istituzionali, contatti, preventivo)

`extract-settori.js`, `extract-home.js`, `extract-pagine.js` leggono il mockup con un piccolo parser
HTML e producono JSON in `out/`; le librerie `lib-blocchi.ps1`, `lib-home.ps1`, `lib-pagine.ps1`,
`lib-form.ps1` trasformano i blocchi in composizioni Elementor; `rebuild-pagine-settori.ps1`,
`rebuild-home.ps1`, `rebuild-pagine.ps1`, `rebuild-pagine-modulo.ps1` le applicano (ID delle pagine
in `lib-home.ps1`, `$PagineIds`). `fix-form-ampersands.ps1 -Ids "154,152,138"` corregge `&` e apostrofi
dei menu a tendina dopo la pubblicazione.

## Import dei contenuti dal mockup

```powershell
node tools/extract.js . tools/out/schede.json     # legge realizzazione-*.html
tools/import-one.ps1 -Slug arpacal                # crea/aggiorna un post (idempotente)
```

`import-one.ps1` scarica le immagini da `https://axzoso.github.io/artes/`
(devono essere pubblicate), le deduplica con la meta `_artes_src`, assegna la
lingua `it` a post e allegati, imposta settore, campi, copertina e galleria.
Per tutte le schede: ciclo su `tools/out/schede.json`. Dopo ogni import fatto
via script serve la lingua WPML (lo script la assegna da solo).

## `setup/` — configurazione una tantum (storico)

Quello che è stato eseguito per creare il modello dati, mantenuto come
riferimento e per ricostruire il sito da zero. Ordine: `cpt-*.json` e
`tax-*.json` (con `jerun.ps1`), `addfields.php` (campi cliente/arredi),
`mkrel.php` (relazione), `setup-permalink-termini.php`, `wpml-*.php`,
`import-brands.php`, `menus-pagine-logo.php` (pagine segnaposto, menu WordPress
e logo: idempotente, ricostruisce le voci dei menu da zero). Sono PHP da lanciare con `php.ps1`; non sono idempotenti
in tutti i casi (i CPT si creano una volta sola).

## Plugin del sito

`wp/artes-core/` contiene il plugin: `artes-core.php` (filtri `elementor/query/artes_*` per i
cicli del template, shortcode `[artes_lingue]`, `[artes_titolo]`, `[artes_settore_ambito]`, voce
di menu attiva, ordine e paginazione dell'archivio) e `artes-core.css` (CSS del sito, caricato
dal plugin per ultimo). **È installato su dev3 come plugin vero.** Per aggiornarlo dopo una
modifica si lancia `install-plugin.ps1`: impacchetta i due file in `tools/out/artes-core.zip`, lo
carica con il link di upload di Novamira (che accetta ZIP ma non file `.php` fuori dalla
sandbox), lo installa con WP-CLI, toglie l'eventuale vecchia copia della sandbox, attiva,
svuota il CSS del kit, verifica e svuota le cache. Lo ZIP si crea con barre `/` nei percorsi (non
usare `Compress-Archive`: rompe il plugin). **In produzione si carica lo stesso ZIP** da
Plugin → Aggiungi.