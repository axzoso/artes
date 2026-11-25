# Diario

Voci **brevi** (5-10 righe): data, richiesta, cosa è cambiato, cosa resta. Voce più recente in alto. Lo storico completo della costruzione
(ottobre-novembre 2026) è in `archivio/docs/diario-sessioni-2026-10-20_11-25.md`.

---

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
