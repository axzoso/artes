# Guida alla manutenzione del sito ARTES

Questa guida è per chi prende in mano il sito senza averlo sviluppato. Si legge anche in WordPress: menu **ARTES → Guida**.

## Com'è fatto il sito

- **WordPress + Elementor 4 (widget "atomici") + Elementor Pro**: pagine, header, footer e modelli delle schede sono costruiti con Elementor.
- **JetEngine**: tipi di contenuto **Realizzazioni** e **Brand partner**, con i loro campi e le tassonomie **Settore**, **Categoria** e **Categoria brand**.
- **WPML**: italiano (lingua principale) e inglese, con indirizzi in `/en/`.
- **Plugin ARTES Core** (`artes-core`, questo plugin): tutto ciò che Elementor non fa da solo. **Senza questo plugin il sito perde grafica, filtri, SEO e anti-spam: non disattivarlo.**

## Cosa contiene il plugin

- `artes-core.php`: logica (dati dei cicli Elementor, shortcode `[artes_*]` per i valori calcolati, SEO, reindirizzamenti, lingue, moduli).
- `artes-rev2.css`: lo stile del sito. **Generato** dal foglio della grafica approvata: non modificarlo a mano, verrebbe sovrascritto. Per ritocchi usare **ARTES → Stile → CSS aggiuntivo**.
- `artes-rev2.js`: interazioni (menu, filtri degli archivi, lightbox delle gallerie, slider).
- `fonts/`: i caratteri del sito (Archivo, Instrument Sans, IBM Plex Mono), serviti dal sito senza richieste a Google.
- `languages/`: traduzioni dei testi del plugin. `wpml-config.xml`: dice a WPML quali campi tradurre o copiare.
- `admin/`: la pagina **ARTES** del menu e il riquadro **SEO ARTES** negli editor.

## Regole d'oro

- Le **classi** dei widget Elementor (es. `hero__title`, `progetto`) sono solo etichette: lo stile vero è nel plugin. Per riusare un componente in una pagina nuova si dà la stessa classe. Non dare stile alle classi dal pannello di Elementor.
- Il **CSS personalizzato del kit** di Elementor deve restare vuoto.
- Nei **moduli** il campo anti-spam "Honeypot" deve essere l'**ultimo** campo: se sta prima del campo allegati, gli allegati vengono persi senza errori. La scheda Stato lo controlla.
- Una modifica alla pagina italiana **non** aggiorna la versione inglese: vanno modificate entrambe.

## Operazioni comuni

### Aggiungere una realizzazione
- Realizzazioni → Aggiungi nuova: titolo, campi (riga parola chiave, introduzione, località, tipologia, descrizione, galleria), **Settore** e **Categoria**, immagine in evidenza (la foto della card).
- Ordine nell'archivio: attributo "Ordine".
- Brand usati: relazione con i brand nel riquadro di JetEngine.
- La scheda si impagina da sola (modello "Singolo Realizzazione (rev2)"). Poi creare la versione inglese dall'icona della lingua.

### Aggiungere un brand
- Brand partner → Aggiungi nuovo: titolo, campi testuali, **Categoria brand**, foto facoltativa (immagine in evidenza).

### Scrivere un articolo del blog
- Il blog è predisposto ma non ancora attivo: vedi **ARTES → Manutenzione → Blog** per accenderlo. Gli articoli si scrivono con l'editor normale di WordPress: titolo, estratto, immagine in evidenza, categoria, testo.

### Creare una pagina nuova
- Pagine → Aggiungi nuova → Modifica con Elementor. Per restare nello stile del sito copiare una sezione da una pagina esistente (tasto destro → Copia / Incolla) e cambiare testi e immagini: le classi vengono con la sezione.
- Header e footer si applicano da soli. Compilare il riquadro **SEO ARTES** (titolo e descrizione).

### Immagini
- Ogni immagine ha due testi alternativi nella Libreria media: "Testo alternativo" (italiano) e "Testo alternativo (EN)".

### SEO
- Pagine, realizzazioni e brand: riquadro **SEO ARTES** nella schermata di modifica. Se vuoto, il testo si calcola dai campi.
- Archivi Realizzazioni e Brand: **ARTES → SEO**.
- **Con Yoast SEO** (o Rank Math / All in One SEO) attivo, il plugin ARTES non scrive titolo e descrizione e nasconde il riquadro: li gestisce Yoast. Il pulsante **ARTES → SEO → Copia in Yoast** trasferisce i testi già scritti. Il plugin non genera dati strutturati; le FAQ in JSON-LD sono dentro le 5 pagine settore.

### Pubblicare una pagina in bozza
- **ARTES → Manutenzione → Pagine in bozza → Pubblica (IT + EN)**, poi aggiornare in Elementor i link di header e footer verso la pagina.

## Lingue

- Testi del plugin (briciole di pane, pulsanti dei filtri, titoli calcolati): **ARTES → Testi e lingue**.
- Indirizzi inglesi: slug delle pagine inglesi; le basi `/en/projects/` e `/en/brand-partners/` sono in WPML → Traduzione stringhe, contesto "WordPress".
- Senza WPML: l'alternativa più vicina è **Polylang** (gratuito), che legge `wpml-config.xml` e supporta le funzioni WPML usate dal plugin; la traduzione delle basi dei tipi di contenuto andrebbe aggiunta al plugin. Provare sempre su una copia del sito.

## Moduli di contatto

- Destinatario, oggetto e campi: in Elementor, sulla pagina del modulo.
- Anti-spam: campo Honeypot (ultimo campo) + limite di link per messaggio (**ARTES → Moduli**).
- Per provarli senza scrivere al cliente: **ARTES → Moduli → Modalità prova** (ricordarsi di spegnerla).
- In produzione configurare un servizio SMTP (es. plugin WP Mail SMTP) per evitare che le email finiscano nello spam.

## Aggiornare il plugin

- Plugin → Aggiungi nuovo → Carica plugin, con lo ZIP nuovo (sostituisce l'installato). Lo ZIP deve contenere le cartelle `admin`, `fonts`, `languages`.
- Dopo: **ARTES → Manutenzione → Svuota le cache**, poi **ARTES → Stato**: tutti i controlli devono essere verdi.

## In caso di problemi gravi

- Il sito ha un solo design (rev2): non esiste più un design precedente da riattivare. Il vecchio mockup è solo nell'archivio del repository.
- Cache: **ARTES → Manutenzione**.
- Prima di interventi importanti: backup completo (database e file) con il plugin di backup installato.

## Per sviluppatori

- Il codice sorgente, gli strumenti con cui il sito è stato costruito e collaudato (`tools/rev2/`, Node.js) e la documentazione completa sono nel repository del progetto (cartelle `wp/artes-core/`, `tools/`, `docs/`). Non servono per la manutenzione ordinaria.
- Il CSS del sito si rigenera con `node tools/rev2/port-css.js` partendo dalla grafica approvata (radice del repository: `assets/css/artes.css`) e da `tools/rev2/css/adattamenti.css`.
- Shortcode del plugin: tutti iniziano con `artes_`; i cicli di Elementor usano un "Query ID" che corrisponde a un filtro `elementor/query/<id>` in `artes-core.php`.
