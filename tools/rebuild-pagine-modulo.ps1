param([string[]]$Only = @())
# Costruisce le pagine Contatti (152) e Richiedi preventivo (154): blocchi del mockup (tools/out/pagine.json)
# + modulo generato da lib-form.ps1. Destinatario email e formati allegati sono in lib-contatti.ps1
# (destinatario TEMPORANEO). La mappa di Contatti non è inclusa (serve un widget HTML: vedi docs/wp-stato-dev3.md).
$d = $PSScriptRoot
New-Item -ItemType Directory -Force (Join-Path $d 'out') | Out-Null
$pagine = Get-Content "$d\out\pagine.json" -Raw -Encoding utf8 | ConvertFrom-Json
. "$d\lib-blocchi.ps1"; . "$d\lib-home.ps1"; . "$d\lib-pagine.ps1"; . "$d\lib-contatti.ps1"; . "$d\lib-form.ps1"

$sel = { param($o) , @($o) }
$settori = @('Arredo uffici & workspace', 'Arredo negozi & retail', 'Arredo negozi food', 'Arredo bar & ristoranti', 'Arredo hotel & hospitality')
$profili = @('Azienda o attività commerciale', 'Progettista o studio di architettura', 'Pubblica amministrazione', 'Impresa di costruzioni', 'Privato')

$moduli = @{
  'contatti' = New-Modulo -Prefix 'Fm' -Nome 'Contatti' -Oggetto 'Nuova richiesta di contatto dal sito ARTES' -Invia 'Invia il messaggio' `
    -PrivacyTesto "Ho letto l'informativa privacy e acconsento al trattamento dei dati per ricevere una risposta. *" `
    -OkTesto 'Messaggio inviato. Grazie: ti rispondiamo entro due giorni lavorativi.' `
    -Gruppi @(@{ legenda = $null; tipo = 'campi'; campi = @(
      @{ id = 'nome'; label = 'Nome e cognome *'; kind = 'input'; type = 'text'; required = $true; autocomplete = 'name' },
      @{ id = 'azienda'; label = 'Azienda o ente'; kind = 'input'; type = 'text'; autocomplete = 'organization' },
      @{ id = 'email'; label = 'Email *'; kind = 'input'; type = 'email'; required = $true; autocomplete = 'email' },
      @{ id = 'telefono'; label = 'Telefono'; kind = 'input'; type = 'tel'; autocomplete = 'tel' },
      @{ id = 'motivo'; label = 'Motivo del contatto'; kind = 'select'; wide = $true; options = @('Informazioni generali', 'Parlare con un tecnico', 'Collaborazione per studi e progettisti', 'Pubblica amministrazione e MEPA', 'Assistenza su una fornitura', 'Fornitori e partner', 'Lavora con noi') },
      @{ id = 'messaggio'; label = 'Messaggio *'; kind = 'textarea'; required = $true; wide = $true } ) })
  'richiedi-preventivo' = New-Modulo -Prefix 'Fm' -Nome 'Preventivo' -Oggetto 'Nuova richiesta di preventivo dal sito ARTES' -Invia 'Invia la richiesta' `
    -PrivacyTesto "Ho letto l'informativa privacy e acconsento al trattamento dei dati per ricevere il preventivo. *" `
    -OkTesto 'Richiesta inviata. Grazie: un tecnico Artes legge la richiesta e ti richiama entro due giorni lavorativi.' `
    -Gruppi @(
      @{ legenda = 'Chi sei'; tipo = 'campi'; campi = @(
        @{ id = 'nome'; label = 'Nome e cognome *'; kind = 'input'; type = 'text'; required = $true; autocomplete = 'name' },
        @{ id = 'azienda'; label = 'Azienda o ente'; kind = 'input'; type = 'text'; autocomplete = 'organization' },
        @{ id = 'email'; label = 'Email *'; kind = 'input'; type = 'email'; required = $true; autocomplete = 'email' },
        @{ id = 'telefono'; label = 'Telefono *'; kind = 'input'; type = 'tel'; required = $true; autocomplete = 'tel' },
        @{ id = 'profilo'; label = 'Profilo'; kind = 'select'; wide = $true; options = $profili } ) },
      @{ legenda = 'Il progetto'; tipo = 'campi'; campi = @(
        @{ id = 'richiesta_settore'; label = 'Settore *'; kind = 'select'; options = (@('Seleziona') + $settori + @('Altro / più settori')) },
        @{ id = 'intervento'; label = 'Tipo di intervento'; kind = 'select'; options = @('Nuova apertura', 'Ristrutturazione completa', 'Rinnovo degli arredi', 'Ampliamento', 'Fornitura su capitolato') },
        @{ id = 'localita'; label = 'Località del cantiere *'; kind = 'input'; type = 'text'; required = $true; placeholder = 'Città, provincia' },
        @{ id = 'superficie'; label = 'Superficie indicativa'; kind = 'input'; type = 'text'; placeholder = 'm²' },
        @{ id = 'tempi'; label = 'Apertura o consegna prevista'; kind = 'select'; options = @('Da definire', 'Entro 3 mesi', 'Da 3 a 6 mesi', 'Da 6 a 12 mesi', 'Oltre 12 mesi') },
        @{ id = 'budget'; label = 'Budget indicativo'; kind = 'select'; options = @('Da definire', 'Fino a 25.000 €', '25.000 – 75.000 €', '75.000 – 150.000 €', 'Oltre 150.000 €') },
        @{ id = 'stato'; label = 'A che punto è il progetto?'; kind = 'select'; wide = $true; options = @("È un'idea: serve anche la progettazione", "C'è un progettista, il disegno è in corso", 'Il progetto esecutivo è pronto', 'Ho un capitolato da quotare') } ) },
      @{ legenda = 'Cosa ti serve'; tipo = 'opzioni'; campi = @(
        @{ id = 'servizio_rilievo'; label = 'Rilievo e sopralluogo'; kind = 'check'; checked = $true },
        @{ id = 'servizio_progettazione'; label = 'Progettazione e render'; kind = 'check' },
        @{ id = 'servizio_su_misura'; label = 'Arredi su misura'; kind = 'check'; checked = $true },
        @{ id = 'servizio_brand'; label = 'Arredi e sedute di brand partner'; kind = 'check' },
        @{ id = 'servizio_montaggio'; label = 'Consegna e montaggio'; kind = 'check'; checked = $true },
        @{ id = 'servizio_post_vendita'; label = 'Assistenza e manutenzione'; kind = 'check' } ) },
      @{ legenda = 'Dettagli'; tipo = 'campi'; campi = @(
        @{ id = 'messaggio'; label = 'Descrizione *'; kind = 'textarea'; required = $true; wide = $true; rows = 6; placeholder = 'Ambienti da arredare, numero di postazioni, coperti o camere, materiali o riferimenti che ti piacciono…' },
        @{ id = 'allegati'; label = 'Allegati'; kind = 'file'; wide = $true; hint = 'Planimetrie, capitolato, render o foto dello stato attuale. PDF, DWG, DXF, JPG, PNG.' },
        @{ id = 'fonte'; label = 'Come ci hai conosciuto'; kind = 'select'; wide = $true; options = @('Seleziona', 'Ricerca su Google', 'Passaparola', 'Un progettista', 'Social network', 'MEPA / Acquisti in Rete PA', 'Fiere ed eventi') } ) }
    )
}
$ids = [ordered]@{ 'contatti' = 152; 'richiedi-preventivo' = 154 }
foreach ($k in $ids.Keys) {
  if ($Only.Count -and ($Only -notcontains $k)) { continue }
  $id = $ids[$k]; $parts = @(); $n = 0
  foreach ($b in $pagine.$k) {
    $n++
    switch ($b.tipo) {
      'intro' { $parts += Block-Intro $b.eyebrow $b.h1 $b.lead $b.corrente }
      'sezione' { $parts += Build-Sezione "S$n" $b }
      'modulo' { $parts += Block-SezioneModulo $b $moduli[$k] }
      'mappa' { }
      default { throw "blocco non gestito: $($b.tipo)" }
    }
  }
  $comp = Join-Blocks $parts -PostId $id
  $f = "$d\out\comp-pagina-$k.json"
  $comp | ConvertTo-Json -Depth 30 | Set-Content $f -Encoding utf8
  $null = & "$d\mcp.ps1" -Server elementor -Tool elementor-update-page-settings -ArgsJson "{`"post_id`":$id,`"settings`":{`"template`":`"elementor_header_footer`"}}" -Max 200
  $r = & "$d\compose.ps1" -File $f -Max 900
  if ($r -notmatch '"success":true') { "$k ($id): COMPOSIZIONE FALLITA: $($r.Substring(0, [Math]::Min(800, $r.Length)))"; continue }
  if ($r -match '"warnings"') { "$k avvisi: " + ([regex]::Match($r, '"warnings".{0,800}').Value) }
  $null = & "$d\mcp.ps1" -Server elementor -Tool elementor-publish-document -ArgsJson "{`"post_id`":$id}" -Max 100
  # dopo la pubblicazione: il widget select raddoppia le "&" dei settori
  $null = & "$d\fix-form-ampersands.ps1" -Ids $id
  "$k -> pagina $id costruita e pubblicata"
}
$null = & "$d\php.ps1" -File "$d\flush.php" -Max 100
"cache svuotata"
