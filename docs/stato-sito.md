# Stato del sito (dev3) — aggiornato al 2026-11-25

## Plugin
`artes-core` **1.0.0**: solo design rev2 (modalità selettiva e design v1 rimossi), menu **ARTES** in amministrazione (Stato, SEO, Moduli,
Testi e lingue, Stile, Manutenzione, Guida), riquadro "SEO ARTES" negli editor, caratteri locali (nessuna richiesta a Google),
compatibile con Yoast/Rank Math/AIOSEO (si fa da parte). Opzioni: `artes_seo_archives`, `artes_antispam_max_link` (3),
`artes_prova_invio` (+ `_log`), `artes_css_aggiuntivo`, `artes_seo_yoast_copiato`. Meta: `_artes_seo_title`, `_artes_seo_description`,
`_artes_alt_en` (allegati).

## Template Theme Builder (IT → EN)
| Template | IT | EN | Stato |
|---|---|---|---|
| Header | 557 | 1285 | pubblicato, `include/general` |
| Footer | 971 | 1286 | pubblicato |
| Singolo realizzazione | 1040 | 1287 | pubblicato |
| Singolo brand | 1049 | 1288 | pubblicato |
| Archivio realizzazioni | 1050 | 1289 | pubblicato |
| Archivio brand | 1051 | 1290 | pubblicato |
| Errore 404 | 1423 | 1424 | pubblicato |
| Articolo del blog | 1459 | — | **bozza** (`include/singular/post`) |
| Archivio blog | 1460 | — | **bozza** (`include/archive/post_archive`) |
| Moduli `[Riserva]` | 539-541 | — | libreria, non usati |

## Pagine (IT → EN)
Home 376 → 1291 · Settori 144-148 → 1292-1296 (`/en/office-workspace-furniture/` …) · Su misura 149 → 1297 · Contract 150 → 1298 ·
Chi siamo 151 → 1299 · Contatti 152 → 1300 (modulo) · Privacy 3 → 1301 · Cookie 493 → 1302.
**In bozza** (anche EN): Area progettisti 153 → 1430, Richiedi preventivo 154 → 1431 (modulo), Prodotti 471 → 1432, MEPA 472 → 1433,
Cataloghi 491 → 1434. Pubblicazione: ARTES → Manutenzione → Pagine in bozza (poi aggiornare i link di header/footer).

## Contenuti
20 realizzazioni, 18 brand, 8 relazioni brand↔progetti, 5 settori, 26 categorie, 8 categorie brand; tutto anche in inglese
(slug EN dei termini da `tools/rev2/wpml-url-en.js`). Basi EN: `/en/projects/`, `/en/brand-partners/`. Blog: 0 articoli.
Testo alternativo EN delle immagini: meta `_artes_alt_en` (252 allegati).

## Impostazioni
noindex attivo (`blog_public` = 0) · WPML configurato, selettore automatico nel footer spento (si usa `[artes_lingue]`) · nessun SMTP
(le email partono dal server: configurare sul dominio definitivo) · cestino vuoto · allegati inutilizzati eliminati (2026-11-25).

## Da fare (decisioni del cliente)
Dominio definitivo + SMTP + testi legali definitivi · eventuale Yoast (consulente SEO) · pubblicazione delle bozze · attivazione del blog
(pagina articoli, `node tools/rev2/blog-template.js --pubblica`, versione EN dei template, link "Blog" nell'header) · togliere noindex in produzione.

## Backup
Backup completo di dev3 del titolare (2026-11-19, prima della rev2) · tag git `pre-rev2` · backup JSON delle operazioni in `tools/out/`
(non versionato), tra cui `pulizia-finale-backup.json` (cestino eliminato il 2026-11-25).
