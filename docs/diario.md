# Diario

Voci **brevi** (5-10 righe): data, richiesta, cosa è cambiato, cosa resta. Voce più recente in alto. Lo storico completo della costruzione
(ottobre-novembre 2026) è in `archivio/docs/diario-sessioni-2026-10-20_11-25.md`.

---

## 2026-11-25 — Priorità del logo (`artes-core` 1.0.3)

- Il logo dell'header prendeva `fetchpriority="high"` dal modulo di Elementor "Image loading optimization" (lavora sull'output finale e
  sceglie la prima immagine grande senza priorità), e l'immagine principale lo aveva due volte. Ora il plugin lascia l'immagine principale
  senza attributo e mette `fetchpriority="auto"` sulle altre non lazy: Elementor assegna `high` una sola volta, all'immagine giusta.
- Tolti i due filtri WordPress inefficaci. Verifiche: SEO 51/51, salute 80/80 + 14/14, redirect 17/17.

## 2026-11-25 — Ottimizzazione immagini (`artes-core` 1.0.2) e pulizia `error_log`

- Su autorizzazione del titolare: aggiunta in `wp/artes-core/artes-core.php` (v1.0.2) la gestione automatica di `sizes` (`auto, …` sulle
  immagini lazy con fallback esplicito dai breakpoint di `assets/css/artes.css`), `loading` e `fetchpriority="high"` sull'immagine LCP
  tramite il filtro nativo `elementor/frontend/the_content` (senza toccare i documenti Elementor né usare output buffering).
- Peso ridotto su tutto il sito IT+EN: `/realizzazioni/` @1440 da 2,25 MB a 895,5 KB (-60%, immagini -68%, a scroll completo -70%);
  Home da 1012 a 620 KB (immagini a scroll da 2,75 a 1,08 MB); `arpacal` da 1031 a 466 KB; 0 immagini sottodimensionate (1440 1x e 390 2x).
- Verifiche standard tutte verdi (SEO 51/51, redirect 17/17, dati 1132/1132, salute 80+24+28 OK) e parità su 6 pagine con Δ altezza 0 e 0 px scroll.
- `error_log` in radice archiviato in `tools/out/error-log/` (15.944 righe, 39 tipi) e troncato a 0 byte (`0644`); rimasto a 0 byte dopo i test.
- Resta da decidere con il cliente: icona del sito (favicon) e voci pre-lancio in `docs/stato-sito.md`.

## 2026-11-25 — Check finale di Gemini (Antigravity) e correzioni

- Esito di Gemini: stabile con riserve; si è orientato con CLAUDE.md, stato-sito e tools/README, senza aprire `archivio/`.
- Plugin 1.0.1: etichette inglesi di Realizzazioni/Brand nei feed EN ("Artes » Projects Feed").
- `port-css.js`: mappa delle immagini del CSS versionata (`tools/rev2/css/immagini.json`, prima dipendeva da `tools/out/`), si ferma se
  ne manca una; intestazione con impronta del contenuto invece dell'hash del commit. `dati-rev2.json` si rigenera da solo se manca.
- Errore SQL di WPML nel log (24/11): unico, durante la configurazione guidata; la colonna oggi esiste. Nessuna azione.
- Proposti, non fatti: `sizes` sulle immagini delle card (archivio da 2,25 MB), icona del sito, pulizia di `error_log`.

## 2026-11-25 — Chiusura della costruzione

- Sito WordPress su dev3 allineato alla rev2 (IT + EN), verificato: SEO 51/51, dati 1.132/1.132, redirect 17/17, salute 55/55 pagine,
  parità con la grafica (Δ 0) su pagine statiche e archivi, nessuna richiesta a Google Fonts.
- Plugin `artes-core` 1.0.0: solo design rev2, menu ARTES in amministrazione, compatibilità Yoast (+ "Copia in Yoast"), pubblicazione delle
  bozze IT + EN dal menu, guida `LEGGIMI-MANUTENZIONE.md`.
- dev3 ripulito: cestino eliminato definitivamente (4 progetti fittizi, Mottura, 6 vecchi template, pagina di prova 542), opzioni e meta
  della vecchia modalità selettiva tolti.
- Repository riorganizzato: rev2 in radice, mockup v1 e strumenti/documenti della costruzione in `archivio/`, documentazione ridotta.
- Restano: dominio definitivo, SMTP, testi legali, Yoast, bozze, blog (vedi `docs/stato-sito.md`).
