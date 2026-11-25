# ARTES Arredamenti — sito

- **Radice**: grafica approvata del sito (HTML/CSS statici, anteprima su GitHub Pages: https://axzoso.github.io/artes/).
- **`wp/artes-core/`**: plugin WordPress del sito reale (WordPress + Elementor + JetEngine + WPML). Guida per la manutenzione:
  [`wp/artes-core/LEGGIMI-MANUTENZIONE.md`](wp/artes-core/LEGGIMI-MANUTENZIONE.md), anche nel menu **ARTES** di WordPress.
- **`tools/`**: script di manutenzione e verifica (Node.js 22+, PowerShell). Vedi [`tools/README.md`](tools/README.md).
- **`docs/`**: stato del sito e diario. **`archivio/`**: mockup precedente e materiale della fase di costruzione.

Pacchetto del plugin per l'installazione: `tools/install-plugin.ps1` (crea `tools/out/artes-core.zip`, da caricare in Plugin → Aggiungi nuovo).
