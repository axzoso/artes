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

## Verifica degli hover

`node tools/cdp.js hoverall <url>` forza l'hover (su elemento e genitori) su un elemento per tipo e mostra cosa cambia (colore, sfondo, bordo, opacità, spostamenti, testi interni). `node tools/cdp.js hovercard <url> "<card>" "<figlio>" ...` mostra come cambiano i figli di una card. Regola del progetto: solo colore, bordo e opacità, mai movimento.

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

`wp/artes-core/` contiene il plugin (`artes-core.js` = lightbox delle gallerie): `artes-core.php` (filtri `elementor/query/artes_*` per i
cicli del template, shortcode `[artes_lingue]`, `[artes_titolo]`, `[artes_settore_ambito]`, voce
di menu attiva, ordine e paginazione dell'archivio) e `artes-core.css` (CSS del sito, caricato
dal plugin per ultimo). **È installato su dev3 come plugin vero.** Per aggiornarlo dopo una
modifica si lancia `install-plugin.ps1`: impacchetta i due file in `tools/out/artes-core.zip`, lo
carica con il link di upload di Novamira (che accetta ZIP ma non file `.php` fuori dalla
sandbox), lo installa con WP-CLI, toglie l'eventuale vecchia copia della sandbox, attiva,
svuota il CSS del kit, verifica e svuota le cache. Lo ZIP si crea con barre `/` nei percorsi (non
usare `Compress-Archive`: rompe il plugin). **In produzione si carica lo stesso ZIP** da
Plugin → Aggiungi. Dalla versione 0.5.0 lo ZIP contiene anche `artes-rev2.css` (generato da
`tools/rev2/port-css.js`, non si modifica a mano) e `artes-rev2.js` (scritto a mano): vedi la sezione
"Adeguamento alla rev2" qui sotto.
## Adeguamento alla rev2 (`tools/rev2/`, dal 2026-11-19)

Piano e decisioni: [`docs/piano-adeguamento-rev2.md`](../docs/piano-adeguamento-rev2.md); regole di conversione e cose imparate:
[`docs/rev2-regole-di-conversione.md`](../docs/rev2-regole-di-conversione.md). Tutto in Node (22+, senza dipendenze), tranne dove indicato.
La rev2 (`artes-sito-rev2/`) è in sola lettura. Ciò che dipende dallo stato di dev3 (mappa delle immagini, composizioni) finisce in
`tools/out/rev2/` (ignorata da Git) e si rigenera con questi script.

**Giro di lavoro (nell'ordine)**

| Passo | Comando | Cosa fa |
|---|---|---|
| 1 | `node tools/rev2/inventario-classi.js` | elenca le classi usate dalla rev2 → `classi-rev2.json` (e, con `classi-attuali.json`, le collisioni col vecchio design) |
| 2 | `.\tools\rev2\rinomina-collisioni.ps1` | rinomina con `o-` le classi vecchie che hanno lo stesso nome di classi rev2 (una volta sola; poi `prefissa-css-vecchio.js` per il CSS vecchio) |
| 3 | `node tools/rev2/import-media.js [--prova] [--max N]` | porta nella libreria le immagini della rev2 (riusa quelle identiche già presenti, alt dalla rev2) → `media-rev2.json`. Riprende da dove si era fermato |
| 4 | `node tools/rev2/crea-classi.js [--prova]` | crea le classi globali mancanti (solo etichetta); idempotente |
| 5 | `node tools/rev2/port-css.js` | **genera** `wp/artes-core/artes-rev2.css` dal CSS della rev2 (prefisso `body.rev2 .elementor`, tag → `:is(tag, :where(.rev2-tag))`, CSS morto escluso, `url()` sulla libreria); assembla `css/reset.css` + CSS rev2 + `css/adattamenti.css` |
| 6 | `node tools/rev2/push-asset.js [file…]` | carica subito `artes-rev2.css`/`.js` nel plugin su dev3 (giro veloce). Il rilascio resta `tools/install-plugin.ps1` (che impacchetta anche i file rev2) |
| 7 | `node tools/rev2/costruisci.js header\|footer\|pagina <nome> [--invia <id>] [--prova]` | converte l'HTML rev2 in composizione Elementor (`html2elementor.js`, link da `mappa-link.json`) e la scrive nel documento; `--prova` = dry run. Poi **pubblicare** il site part (`elementor-publish-document`) |
| 8 | `node tools/rev2/anteprima.js <id>` | link di anteprima firmato (scade dopo ~10 minuti) con `&artes_rev2=1` |

**Collaudo di parità** (rev2 locale: `py -3 -m http.server 8765 --directory artes-sito-rev2`; per dev3 si passa `@<id>`, il link di anteprima si genera da solo)

| Comando | Cosa misura |
|---|---|
| `node tools/rev2/parita.js <nome> <url-rev2> <@id> [--w 1440,390] [--percorso /chi-siamo/]` | screenshot a pagina intera di entrambe, % di pixel diversi, fasce più diverse, scroll orizzontale → `out/rev2/parita/<nome>/` |
| `node tools/rev2/affianca.js <nome> <larghezza> <y0> <y1> [--diff]` | ritaglia e affianca rev2 / dev3 (o rev2 / differenze) |
| `node tools/rev2/geometria.js <url-rev2> <@id> [--tol 1.5] [--solo "main, .page-root"]` | abbina gli elementi per classi e confronta dimensioni, posizioni e stili calcolati: dice **quale** elemento differisce e di quanto |
| `node tools/rev2/ispeziona.js "<url-rev2>@@<@id>" <selettore>…` / `regole.js <url> <selettore> [testo]` | stili calcolati di un elemento / regole CSS che lo colpiscono (da quale foglio) |
| `node tools/rev2/collaudo-header.js <url-rev2> <@id>` | tendina, menu mobile (390 e 1024), accordion e voce attiva: stesso gesto su rev2 e dev3 |
| `node tools/rev2/shots.js <cartella> 1440,390 @elenco.txt` + `diff-dirs.js <prima> <dopo> <diff>` | regressione sulle pagine **vecchie** (baseline in `out/regress/`): devono restare pixel-identiche |
| `node tools/rev2/converti-tutte.js [--dettagli]` | prova di conversione di tutte le 49 pagine rev2 (nessuna scrittura): avvisi raggruppati |

Altri: `mcp-client.js` (client MCP in Node: `connetti('elementor'\|'novamira')`, `.call/.callJson/.php`), `html-parse.js` (parser HTML minimo), `cdp-session.js`
(Chrome headless riusabile; `b.on(evento, fn)` ascolta gli eventi del protocollo; `noMotion` iniettato a `DOMContentLoaded` dal 2026-11-20), `png-diff.js`. Sicurezza: `snapshot-dev3.ps1` (snapshot JSON di kit, classi, template, pagine, CPT, menu, media in
`tools/out/backup-<data>/`) e `riserva-moduli.ps1` (salva i moduli come template di libreria `[Riserva]`, vedi `tools/riserva-moduli/README.md`).

**Dati (fase 3, dal 2026-11-20)** — stesso metodo "prima il test": si scrive il controllo, si vede fallire, si importa, si vede passare.

| Comando | A cosa serve |
|---|---|
| `node tools/rev2/dati-rev2.js` | estrae dalla rev2 il modello dati (5 settori, 26 categorie, 20 realizzazioni, 18 brand, relazioni, home) → `out/rev2/dati-rev2.json`. Controlla le regole "derivate" (titoli SEO, didascalie, "altre realizzazioni", testi uniformi dei brand) e segnala ogni scostamento: se la rev2 cambia, ripartire da qui |
| `node tools/rev2/verifica-dati.js [--dettagli]` | **il test**: confronta dev3 con la rev2 (termini, campi, schede, foto e alt, cestino, relazioni e, dalla fine della fase 4, assenza dei campi del vecchio modello). Esce con codice 1 se un controllo fallisce. Sola lettura |
| `node tools/rev2/import-dati.js tassonomie\|campi\|media\|articoli\|relazioni\|cestino\|pulizia\|tutto` | porta i dati su dev3; idempotente. Il cestino è recuperabile (nulla si cancella in modo definitivo). `pulizia` (fine fase 4) toglie i campi del vecchio modello e **prima salva** definizioni e valori in `out/rev2/fase4-campi-rimossi*.json` |
| `node tools/rev2/import-dati.js annulla-pulizia` | (non è in `tutto`) rimette i campi tolti da `pulizia`, leggendo i file salvati: definizioni JetEngine, regole WPML e valori negli articoli |
| `node tools/rev2/controllo-link.js @elenco.txt` | scarica le pagine indicate e verifica che i link interni rispondano (200 o redirect verso 200): lo si usa dopo ogni cambio di indirizzi |

Il modello (nomi dei campi, regole WPML, rinomine) è definito in `tools/rev2/modello-dati.js`; `dev3-dati.js` legge lo stato di dev3 (usato dal test).

**Template e archivi (fase 4, dal 2026-11-20)** — i template dei contenuti non si disegnano in Elementor: la sorgente è un HTML scritto a mano con
attributi che dicono da dove viene ogni dato, e un convertitore lo trasforma in widget con tag dinamici.

| Comando | A cosa serve |
|---|---|
| `tools/rev2/modelli/*.html` | sorgenti dei 4 template: `realizzazione.html`, `brand.html`, `archivio-realizzazioni.html`, `archivio-brand.html`. Attributi letti dal convertitore: `data-dyn="<alias>"` (testo da un dato), `data-dyn-href`, `data-dyn-src`, `data-opz` (riga o blocco che sparisce se manca il dato), `data-opzimg`, `data-loop="<ciclo>"` (elemento ripetuto) |
| `tools/rev2/dinamici.js` | tabella degli alias: ogni alias è un tag dinamico nativo (titolo, indirizzo, immagine in evidenza, campo JetEngine, campo di tassonomia) o uno shortcode del plugin per i valori calcolati (breadcrumb, eyebrow, link con HTML, numero di foto, testo "Scopri l'arredo…") |
| `node tools/rev2/genera-modelli.js` | ricava i due modelli degli archivi da `realizzazioni.html` e `brand-partner.html` della rev2: intestazione, filtri e fascia finale si copiano tali e quali, il blocco dei risultati diventa un ciclo con gli attributi `data-dyn`. I modelli delle schede (`realizzazione.html`, `brand.html`) sono scritti a mano |
| `node tools/rev2/costruisci-modello.js <realizzazione\|brand\|archivio-realizzazioni\|archivio-brand> --invia <id> [--pubblica]` | converte il modello e lo scrive nel site part indicato. **Senza `--pubblica` non pubblica** (la pubblicazione è opt-in: una volta, per errore, una pagina di prova in bozza è diventata pubblica) |
| `node tools/rev2/condizioni.js --crea\|--collaudo\|--attiva\|--stato` | crea i 4 site part "(rev2)", li limita ad articoli di prova (`--collaudo`), li **attiva per tutte le schede e gli archivi** mettendo in bozza i vecchi 138/448/213/447 (`--attiva`), mostra le condizioni (`--stato`). I vecchi non si cancellano: restano per tornare indietro |
| `node tools/rev2/parita-tutte.js [--solo realizzazioni\|brand\|archivi] [--parallelo 3]` | parità di **tutte** le schede e gli archivi (20 + 18 + 2) a 1440 e 390 px, con `parita.js` e `contenuti.js` in parallelo → `out/rev2/parita-tutte.json` |
| `node tools/rev2/contenuti.js <url-rev2> <url-dev3> [--rev2-file <file>]` | confronta testi, titoli, link, immagini e alt delle due pagine (non l'aspetto) |
| `node tools/rev2/salute-pagine.js <percorso\|url>… [--w 1440,390]` / `--cpt` | controlli senza confronto con la rev2 (piano §6): un solo H1, titolo presente, nessuna immagine rotta, nessun errore in console né richiesta 4xx/5xx, nessuno scroll orizzontale. `--cpt` = tutte le schede e gli archivi. Ignora il 404 di `/favicon.ico` (né la rev2 né dev3 hanno un'icona). Da Git Bash i percorsi che iniziano con `/` vengono convertiti in percorsi Windows: lo strumento lo annulla |
| `node tools/rev2/collaudo-redirect.js [https://dev3…]` | codici di risposta e reindirizzamenti degli indirizzi dei contenuti: pagine dei termini → archivio filtrato, vecchi slug rinominati, **indirizzi filtrati `/realizzazioni/?settore=…` (devono dare 200, mai reindirizzare a sé stessi)**, articoli nel cestino (404). Esce con 1 se qualcosa non va |
| `node tools/rev2/collaudo-schede.js <url-rev2> <url-dev3> [--percorso /realizzazioni/arpacal/]` | lightbox della galleria: stesso gesto su rev2 e dev3 (apertura, frecce, tastiera, chiusura), screenshot del viewport, conteggio e didascalia |
| `node tools/rev2/collaudo-archivi.js realizzazioni\|brand <url-rev2> <url-dev3>` | filtri degli archivi con gesti reali (tab dei settori, categorie, `?settore=&categoria=`, filtro dei brand, mobile): stesso stato (conteggio, schede visibili, filtro attivo, indirizzo) e stesso aspetto |

**Pagine statiche (fase 5, dal 2026-11-20)** — Home (dinamica per progetti e brand), 5 settori, Su misura, Contract, Chi siamo.

| Comando | A cosa serve |
|---|---|
| `node tools/rev2/import-media-pagine.js [--prova]` | crea su dev3 le 17 copie fisiche degli allegati con alt dedicato per le pagine statiche (lingua WPML `it`, `_artes_src = rev2:<src>#p-<hash>`) → `out/rev2/media-pagine.json` |
| `node tools/rev2/fase5-pagine.js --costruisci\|--parita\|--stato [--solo …]` | costruisce/pubblica le 9 pagine della fase 5 (Home da `modelli/home.html`), accende `_artes_rev2=1`, aggiorna le condizioni di 557/971, salva `out/rev2/fase5-revisions.json`; `--parita` verifica aspetto e contenuti su tutte le 9 pagine |
| `node tools/rev2/collaudo-fase5.js faq\|home <url-rev2> <@id\|url-dev3>` | interazioni live: FAQ `e-accordion` (apertura multipla, mobile, `FAQPage` JSON-LD) e Home (slider produzione, filtri progetti, pallini metodo mobile) |

**Pagine fuori rev2, SEO e collaudo finale IT (fasi 6–8, dal 2026-11-20)**

| Comando | A cosa serve |
|---|---|
| `node tools/rev2/fase6-pagine.js --esegui\|--stato` | mette in bozza reversibile le 6 pagine fuori rev2 (`152, 153, 154, 471, 472, 491`), ricostruisce Privacy (`3`) e Cookie (`493`) in rev2 con i dati reali di Artes srl, aggiorna Footer `971` (link `Privacy · Cookie · MEPA`) e le condizioni di `557`/`971` (15 contesti), salva `out/rev2/fase6-revisions.json`; `--stato` verifica status, `_artes_rev2` e HTTP pubblico |
| `node tools/rev2/fase7-seo.js --verifica-estrazione\|--applica\|--stato\|--rollback [file]` | gestisce SEO on-page (`<title>` e `<meta name="description">`): `--verifica-estrazione` controlla offline le 49 pagine rev2 + 2 legali e le formule CPT (0 scostamenti); `--applica` scrive in modo idempotente meta `_artes_seo_*` (11 pagine), opzione `artes_seo_archives` (2 archivi) e WPML modo 2 con backup in `out/rev2/fase7-backup.json`; `--stato` legge lo stato live; `--rollback` ripristina dal backup |
| `node tools/rev2/verifica-seo.js [--base <url>] [--parallelo 5] [--solo /,/contract/]` | verifica live in sola lettura su tutte le 51 pagine pubblicate: HTTP 200, `<title>` e `<meta name="description">` unici e identici 100% senza entità residue, singolo `<h1>`, attributi `alt` immagini → `out/rev2/fase7-seo-report.json` |
| `node tools/rev2/fase8-collaudo.js [--step tutto\|parita\|geometria\|salute\|interazioni\|link\|report] [--parallelo 3] [--porta 8769] [--w 1440,1024,768,390] [--riprendi]` | orchestratore di collaudo completo IT in sola lettura (server HTTP locale interno su `127.0.0.1:8769`): parità 49×4 viewport + contenuti, geometria 9×2, salute 51×2, tutte le interazioni live, link 51/51, redirect e 404 bozze → `out/rev2/fase8/report-fase8.json` e `riepilogo.md` |

**Chiusura (fase 9, dal 2026-11-23)**

| Comando / File | A cosa serve |
|---|---|
| `node tools/rev2/fase9-chiusura.js --piano [--offline]` | mostra il piano di chiusura leggendo gli audit locali (`out/rev2/fase9-audit-*.json`) e `:root` di `artes-sito-rev2/assets/css/artes.css`, senza scrivere su dev3 |
| `node tools/rev2/fase9-chiusura.js --esegui [--forza-backup]` | salva prima il backup integrale in `out/rev2/fase9-backup.json` (preservato sui re-run salvo `--forza-backup`), poi esegue in modo sicuro: (a) aggiorna variabili Kit `7` (`sand #393E42`, `night #2F3438`) via `elementor-manage-global-variable`; (b) svuota le condizioni dei 6 vecchi template via `Conditions_Manager::save_conditions($id, [])` e porta Header `557` / Footer `971` a `include/general`; (c) sposta nel **cestino reversibile** (`wp_trash_post`, mai `force_delete`) `542, 199, 200, 138, 448, 213, 447` con guardia su `[Riserva]` (`539–541`) e 6 bozze (`152–154, 471, 472, 491`); (d) elimina i menu `filtri-realizzazioni` e `filtri-brand`; (e) elimina in lotti da 25 solo le 144 classi orfane (`classi_sicure_da_rimuovere_legacy`) con guardia live; (f) imposta `artes_rev2_globale = '1'` e svuota le cache Elementor + WP. **Non tocca mai gli allegati media** |
| `node tools/rev2/fase9-chiusura.js --stato` | verifica in sola lettura lo stato live post-chiusura (variabili Kit `7`, condizioni `557`/`971`, cestino `7/7`, menu residui, conteggio classi `336`, opzioni `artes_rev2_globale`/`blog_public`, integrità `[Riserva]`/bozze/media `256/256`) |
| `node tools/rev2/fase9-chiusura.js --rollback [file]` | ripristina integralmente da `out/rev2/fase9-backup.json` (opzione `artes_rev2_globale`, 144 classi + post/meta, `_elementor_data` raw dei 7 elementi cestinati, restore dal cestino, condizioni site part, 2 menu filtri, variabili Kit `7`, flush cache) |
| `tools/out/rev2/fase9-allegati-orfani.json` | audit in sola lettura dei **256 allegati media**: 224 attivi, 1 solo in bozza (`417`), **31 orfani recuperabili** (`10,654 MB` file principali / `19,464 MB` su disco, non cancellati in attesa di conferma) |
| `tools/out/rev2/fase9-audit-classi.json` e `fase9-audit-kit-menu.json` | audit live delle 480 → 336 classi globali (incrociate su `_elementor_data` dei 33 documenti), delle 27 variabili Kit `7`, dei 6 menu WP e dei site part |
| `tools/out/rev2/fase9-backup.json` | backup integrale pre-esecuzione Fase 9 (`610.649 byte`) usato da `--rollback` |

**Pagine bozza in rev2, pubblicazione Contatti e collegamento link (post-fase 9, dal 2026-11-23)**

| Comando / File | A cosa serve |
|---|---|
| `node tools/rev2/pagine-bozze-rev2.js --piano\|--esegui\|--stato\|--rollback [file] [--solo …]` | ricostruisce in grafica **rev2** le 6 pagine fuori rev2 (`152` Contatti, `153` Area progettisti, `154` Richiedi preventivo, `471` Prodotti, `472` MEPA, `491` Cataloghi PDF): crea idempotente le `22` classi stub `rev2-*` nel Kit `7`, costruisce sezioni rev2 + moduli nativi Elementor Pro `e-form` (`152`, `154`) con dati reali Artes srl e SEO `_artes_seo_*`, pubblica **SOLO `152`** (`publish`) lasciando le altre 5 in **`draft`** (con guardia temporale sull'autosave sync), salva backup/undo in `out/rev2/bozze-rev2-revisions.json` e svuota le cache; `--rollback` ripristina pagine e rimuove le 22 classi stub |
| `node tools/rev2/aggiorna-link-contatti.js --piano\|--esegui\|--stato\|--rollback [file] [--solo …] [--salva-comp]` | rigenera e ripubblica i **15 documenti rev2** (Header `557`, Footer `971` con `Privacy · Cookie · MEPA` e `tel:` preservati, 9 pagine statiche `376, 144–151`, 4 template CPT `1040, 1049, 1050, 1051`) applicando `mappa-link.json` (`#contatti`, segnaposto `Diventa partner di produzione` e CTA `mailto:` senza `@` → `/contatti/`): **38** link sorgente, **`0` `#contatti` residui**, condizioni Theme Builder/loop/FAQ intatti; `--stato` e post-verifica di `--esegui` usano un walker JSON Atomic V4 su `_elementor_data` live; backup e rollback integrale in `out/rev2/link-contatti-revisions.json` |
| `tools/out/rev2/bozze-rev2-revisions.json` e `link-contatti-revisions.json` | snapshot pre-modifica (`_elementor_data` raw, `undo_revision_id`, 22 classi stub create) usati dai rispettivi `--rollback` |

Il rilascio di una modifica al CSS è sempre lo stesso: si cambia `tools/rev2/css/adattamenti.css` (mai `artes-rev2.css`, che è generato), si lancia
`node tools/rev2/port-css.js` e `node tools/rev2/push-asset.js artes-rev2.css`, si rimisura. Lezione della fase 4: un selettore generico in
`adattamenti.css` con la stessa specificità di una regola della rev2 la **annulla** (viene dopo): usare `:where()` per stare sotto le regole della rev2
e sopra quelle di Elementor.

**Versione inglese con WPML (dal 2026-11-24)** — prerequisito: configurazione guidata di WPML completata (`setup_complete = 1`), altrimenti WPML
non filtra i contenuti per lingua e gli articoli EN compaiono anche nel sito italiano. Ogni script ha `--piano` (offline), `--esegui` (con backup) e
`--rollback`.

| Comando | A cosa serve |
|---|---|
| `node tools/rev2/wpml-prepara.js --stato\|--esegui` | configurazione WPML e template IT compatibili (già eseguito) |
| `node tools/rev2/wpml-url-en.js` | **tabella unica degli indirizzi inglesi** (slug delle pagine, basi `projects`/`brand-partners`, slug dei termini nei filtri); stampa le corrispondenze |
| `node tools/rev2/wpml-trad-dati.js` | termini, 20 realizzazioni, 18 brand, relazioni e stringhe in inglese (dataset `traduzioni/en-dati.json`, link localizzati con la tabella) |
| `node tools/rev2/wpml-trad-pagine.js` | 6 template e 12 pagine in inglese (`traduzioni/en-pagine.json`, `en-template.json`), slug EN delle pagine |
| `node tools/rev2/wpml-slug-cpt.js --stato\|--esegui\|--rollback` | traduzione WPML delle basi `realizzazioni` → `projects`, `brand-partner` → `brand-partners` |
| `node tools/rev2/wpml-trad-alt.js` | testi alternativi EN delle immagini (meta `_artes_alt_en`, `traduzioni/en-alt.json`); il plugin li usa sul sito inglese |

Ordine per rifare tutto: `wpml-slug-cpt.js --esegui`, `wpml-trad-dati.js --esegui`, `wpml-trad-pagine.js --esegui`, `wpml-trad-alt.js --esegui`,
poi `salute-pagine.js` sugli indirizzi EN e la non regressione italiana (`verifica-dati.js`, `verifica-seo.js`, `fase5-pagine.js --parita`).
