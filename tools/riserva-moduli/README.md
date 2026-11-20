# Moduli in riserva

La rev2 non ha moduli (ogni "Richiedi un preventivo" punta a `#contatti` o a una mail), quindi dal 2026-11-19 il
sito WordPress non li mostra più. Questa cartella li conserva per poterli **reinserire in futuro**.

## Cosa c'è

| File | Contenuto | Template in Elementor (Modelli > Salvati) |
|---|---|---|
| `modulo-contatti.sezione.json` | sezione completa della pagina Contatti: titolo, dati diretti e modulo (nome, azienda, email, telefono, profilo, motivo, messaggio, allegati, privacy) | `[Riserva] Modulo contatti (sezione completa)` |
| `modulo-preventivo.sezione.json` | sezione completa della pagina Richiedi un preventivo (modulo a gruppi: chi sei, progetto, spazio, tempi, allegati, privacy) | `[Riserva] Modulo richiesta preventivo (sezione completa)` |
| `modulo-scheda-realizzazione.sezione.json` | sezione in coda alla scheda realizzazione, con il campo nascosto del progetto di provenienza | `[Riserva] Modulo in coda alla scheda realizzazione (sezione completa)` |

Le pagine **Contatti (152)** e **Richiedi un preventivo (154)** restano su dev3 **in bozza**, intatte, con il modulo
funzionante.

## Come reinserire un modulo

1. **Dall'editor di Elementor (il più semplice):** apri la pagina o il template, "Aggiungi modello" (cartella),
   scheda *Salvati*, scegli il modello `[Riserva] …` e premi *Inserisci*.
2. **Rimettendo online la pagina in bozza:** Pagine > Contatti (o Richiedi un preventivo) > Pubblica, e ricollega
   i pulsanti.
3. **Da file:** i `.json` sono l'elemento di primo livello di Elementor: si possono reinserire nei dati di un
   documento (`_elementor_data`) o ricostruire da zero con `tools/rebuild-pagine-modulo.ps1` (usa `lib-form.ps1` e
   `lib-contatti.ps1`).

## Cosa NON va eliminato, altrimenti il modulo si rompe o cambia aspetto

- **Classi globali** del kit con prefisso `form-`, `contatti-` e simili (usate dai tre moduli).
- **Plugin `artes-core`:** gestione degli allegati (DWG/DXF/PDF/JPG/PNG ammessi, cancellazione dal server dopo
  l'invio, link nell'email), preselezione dei menu a tendina da URL e CSS del modulo.
- **Menu a tendina:** dopo ogni `publish` vanno corretti `&` e apostrofi con `tools/fix-form-ampersands.ps1 -Ids "…"`.

## Da aggiornare quando si reinserisce

- Destinatario dell'email: oggi `info@artes.it` (temporaneo, in `lib-contatti.ps1`); la rev2 usa **info@artessrl.it**.
- Testo e link dell'informativa privacy (pagina Privacy policy, già pubblicata).
- Anti-spam e invio reale (SMTP) non sono configurati.
