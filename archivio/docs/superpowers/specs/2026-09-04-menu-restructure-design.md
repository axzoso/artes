# Ristrutturazione menu e settori — design

Data: 2026-09-04
Stato: approvato, in attesa di piano di implementazione

## Contesto

Il sito è un mockup statico HTML/CSS/JS (nessuna build, file piatti in root,
pubblicato su GitHub Pages) usato per far approvare al cliente la struttura
prima di passare allo sviluppo reale su WordPress (Elementor / CrocoBuilder).

Il cliente ha deciso una nuova struttura di menu che sposta i 5 "settori"
(oggi sezioni ancorate dentro `settori.html`) a voci di primo livello nella
navigazione, ciascuna con contenuti e progetti propri. Introduce inoltre un
collegamento bidirezionale fra brand partner e progetti realizzati.

## Nav header — 8 voci

```
Home | Arredamento ufficio ▾ | Arredo negozi ▾ | Arredamento bar e ristoranti ▾ |
Arredamento alimentari, wine e food ▾ | Arredamento hotel ▾ | Arredamento su misura |
Arredo Contract | Chi siamo
```

- Le prime 5 voci aprono ciascuna una tendina indipendente a colonna singola
  (non più un mega menu unico a 5 colonne). `initMega()` in `artes.js` va
  generalizzata per gestire N coppie trigger/pannello invece di una sola,
  mantenendo lo stesso comportamento hover/focus/Escape già implementato.
- Topbar: rimuovere il link "Chi siamo" (ora duplicato in nav principale).
  Restano Contatti, MEPA, telefono, selettore lingua.
- "Area Progettisti" resta bottone in `masthead__actions`, invariato.
- Produzione, Brand Partner, Prodotti, Realizzazioni, Architetti escono
  dalla nav principale: restano raggiungibili solo da footer (nessuna di
  queste è fra le 8 voci).

## Mappatura micro-categorie (confermata dal cliente)

La mappatura non segue l'intuizione semantica del nome — è stata confermata
esplicitamente due volte:

- **Arredamento bar e ristoranti** → eredita le micro-categorie
  dell'attuale "Food Retail": Panetterie e bakery, Pasticcerie, Gastronomie
  e salumerie, Macellerie e pescherie, Caseifici, Market gourmet, Chocolate
  shop e take-away, Healthy food store.
- **Arredamento alimentari, wine e food** → eredita le micro-categorie
  dell'attuale "Food & Beverage": Bar e caffetterie, Bistrot e ristoranti,
  Pizzerie e pub, Lounge e cocktail bar, Wine bar ed enoteche, Gelaterie,
  Fast casual e street food, Food court e rooftop bar.
- Arredamento ufficio (Workspace), Arredo negozi (Retail), Arredamento
  hotel (Hospitality): micro-categorie invariate rispetto a oggi.

## Mappa file

| File | Origine | Contenuto |
|---|---|---|
| `arredamento-ufficio.html` | da `settori.html#workspace` | intro settore + griglia progetti filtrabile |
| `arredo-negozi.html` | da `#retail` | idem |
| `arredamento-bar-ristoranti.html` | da `#food-retail` | idem (micro-cat. Food Retail attuali) |
| `arredamento-alimentari-wine-food.html` | da `#food-beverage` | idem (micro-cat. Food & Beverage attuali) |
| `arredamento-hotel.html` | da `#hospitality` | idem |
| `arredamento-su-misura.html` | rinomina di `produzione.html` | contenuto officina/lavorazioni riscritto sotto la nuova voce di menu |
| `contract.html` | invariato | — |
| `chi-siamo.html` | nuovo | pagina reale (oggi `href="#"` in topbar) |
| `brand-partner.html` | nuovo | archivio brand (griglia già presente in home, spostata qui), filtrabile per categoria |
| `brand-pedrali.html` | nuovo, unico esempio reale | scheda brand: descrizione + griglia progetti che lo usano |
| `settori.html` | rimosso | contenuto distribuito nelle 5 pagine sopra; la sezione "Trasversale" (Metodo/Officina/PA) non viene ricreata altrove — Metodo è già coperto in home, Officina confluisce in su-misura |
| `realizzazione.html` | invariato di struttura | breadcrumb e "Brand partner coinvolti" ripuntati alle nuove pagine |
| `index.html`, `sistema-visivo.html` | invariati di contenuto | solo header/footer aggiornati |

Ogni pagina ha markup duplicato (niente build system, per scelta esplicita
del cliente): header/footer vanno aggiornati a mano su ogni file toccato.

## Template pagina settore (le 5 nuove)

Stesso schema già presente in `settori.html` per ogni settore (eyebrow,
titolo, testo, lista ambiti, immagine) più una sezione nuova con griglia
filtrabile, riusando 1:1 il markup/JS già in home (`.filtri` / `.progetti`
/ `.progetto[data-settore]`) — zero modifiche JS necessarie, i bottoni
filtro diventano le micro-categorie della pagina invece dei 5 settori.
1-2 card reali per pagina (dai progetti già citati in `PAGES.md`) che
linkano a `realizzazione.html`; le micro-categorie senza esempio mostrano
lo stato vuoto già previsto (`.progetti__empty`).

## Sistema brand bidirezionale

- `brand-partner.html`: griglia di tutti i brand (riuso `.brands` da
  home) filtrabile per categoria; solo la card Pedrali linka a una scheda
  reale, le altre restano `href="#"` (stessa logica già in uso per i 9
  progetti, di cui solo Aurea ha pagina vera).
- `brand-pedrali.html`: riusa il layout di `realizzazione.html` ma la
  griglia "correlati" mostra i progetti che usano quel brand invece di
  altri brand.
- `realizzazione.html` → il link "Pedrali" in `.brands-mini` punta a
  `brand-pedrali.html`, completando il verso progetto → brand.

## Fuori scope

- Le altre 18 schede brand (restano voci con `href="#"`).
- L'archivio "Realizzazioni" cross-settore: resta linkato dal footer con
  `href="#"` come oggi, non viene costruito in questo giro.
