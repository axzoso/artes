# Sezione "contatti" (intro + modulo) come nella scheda realizzazione del mockup, riusabile nei
# template e nelle pagine. Si usa con dot-sourcing:
#   . "$PSScriptRoot\lib-contatti.ps1"
#   $s = New-ContattiSection -Prefix 'Ct'        # -> @{ xml; cfg; cls; sty }
# I nomi degli elementi (configuration-id) hanno il prefisso, così la sezione si può usare più
# volte nella stessa composizione.
#
# Destinatario dell'email: TEMPORANEO (info@artes.it) finché il cliente non fornisce quello definitivo.
# Per cambiarlo basta $DestinatarioEmail qui sotto e rigenerare il template.

$DestinatarioEmail = 'info@artes.it'
$FormatiAllegati = '.pdf,.dwg,.dxf,.jpg,.jpeg,.png'   # DWG ammessi (decisione del 2026-10-21)
$DimensioneMaxAllegatoMB = 10
$NumeroMaxAllegati = 3

function New-ContattiSection {
  param([string]$Prefix = 'Ct', [switch]$ConProgetto)
  $dyn = { param($n, $s) @{ name = $n; settings = $s } }
  $cfg = [ordered]@{}; $cls = [ordered]@{}; $sty = [ordered]@{}
  $T = { param($t, $id, $inner = '') "<$t configuration-id=`"$Prefix $id`">$inner</$t>" }
  $k = { param($id) "$Prefix $id" }   # chiave di configurazione

  # --- Intro ---------------------------------------------------------------
  $dati = @(@('Telefono', '+39 0000 000 000'), @('Email', 'info@artesarredamenti.it'), @('Sede', 'Via —, Rende (CS)'))
  $righe = ''
  $i = 0
  foreach ($d in $dati) {
    $i++
    $righe += & $T 'e-div-block' "Dato $i" ((& $T 'e-paragraph' "Dato $i etichetta") + (& $T 'e-paragraph' "Dato $i valore"))
    $cfg[(& $k "Dato $i etichetta")] = @{ paragraph = $d[0] }; $cfg[(& $k "Dato $i valore")] = @{ paragraph = $d[1] }
    $cls[(& $k "Dato $i etichetta")] = @('contatti-dl-label'); $cls[(& $k "Dato $i valore")] = @('contatti-dl-value')
    $sty[(& $k "Dato $i")] = 'padding: 0;'
  }
  $intro = & $T 'e-div-block' 'Intro' ((& $T 'e-paragraph' 'Eyebrow') + (& $T 'e-heading' 'Titolo') + (& $T 'e-paragraph' 'Lead') + (& $T 'e-div-block' 'Dati diretti' $righe))
  $cfg[(& $k 'Eyebrow')] = @{ paragraph = 'Contatti' }
  $cfg[(& $k 'Titolo')] = @{ tag = 'h2'; title = 'Un progetto simile<br>in programma?' }
  $cfg[(& $k 'Lead')] = @{ paragraph = 'Raccontaci spazio, tempi e obiettivi: ti ricontatta un tecnico entro due giorni lavorativi, con una prima valutazione e le domande per il sopralluogo.' }
  $cls[(& $k 'Intro')] = @('contatti-intro'); $cls[(& $k 'Eyebrow')] = @('eyebrow'); $cls[(& $k 'Titolo')] = @('h-section'); $cls[(& $k 'Lead')] = @('lead'); $cls[(& $k 'Dati diretti')] = @('contatti-diretti')
  $sty[(& $k 'Lead')] = 'margin: 26px 0 0;'

  # --- Campi del modulo ---------------------------------------------------
  $settori = @('Arredo uffici & workspace', 'Arredo negozi & retail', 'Arredo negozi food', 'Arredo bar & ristoranti', 'Arredo hotel & hospitality')
  $campi = @(
    @{ id = 'nome'; label = 'Nome e cognome *'; kind = 'input'; type = 'text'; required = $true; autocomplete = 'name' },
    @{ id = 'azienda'; label = 'Azienda o ente'; kind = 'input'; type = 'text'; autocomplete = 'organization' },
    @{ id = 'email'; label = 'Email *'; kind = 'input'; type = 'email'; required = $true; autocomplete = 'email' },
    @{ id = 'telefono'; label = 'Telefono'; kind = 'input'; type = 'tel'; autocomplete = 'tel' },
    @{ id = 'profilo'; label = 'Chi sei'; kind = 'select'; options = @('Azienda o attività commerciale', 'Progettista o studio di architettura', 'Pubblica amministrazione', 'Impresa di costruzioni', 'Privato') },
    @{ id = 'richiesta_settore'; label = 'Settore'; kind = 'select'; options = $settori },
    @{ id = 'localita'; label = 'Località del progetto'; kind = 'input'; type = 'text'; placeholder = 'Città, provincia' },
    @{ id = 'tempi'; label = 'Tempistiche'; kind = 'select'; options = @('Da definire', 'Entro 3 mesi', 'Da 3 a 6 mesi', 'Oltre 6 mesi') },
    @{ id = 'messaggio'; label = 'Messaggio *'; kind = 'textarea'; required = $true; wide = $true; placeholder = 'Metri quadri, ambienti da arredare, eventuale progetto già disponibile…' },
    @{ id = 'allegati'; label = 'Allegati'; kind = 'file'; wide = $true }
  )
  $form = ''
  foreach ($c in $campi) {
    $id = $c.id; $fid = $id
    $ctrlKey = "Campo $id"
    $tag = switch ($c.kind) { 'input' { 'e-form-input' } 'select' { 'e-form-select' } 'textarea' { 'e-form-textarea' } 'file' { 'e-form-file-upload' } }
    $inner = (& $T 'e-form-label' "Label $id") + (& $T $tag $ctrlKey)
    if ($c.kind -eq 'file') { $inner += (& $T 'e-paragraph' "Hint $id") }
    $form += & $T 'e-div-block' "Riga $id" $inner
    $cfg[(& $k "Label $id")] = @{ tag = 'label'; text = $c.label; 'input-id' = $fid }
    $cls[(& $k "Label $id")] = @('form-label')
    $cls[(& $k "Riga $id")] = if ($c.wide) { @('form-field', 'form-field-wide') } else { ,@('form-field') }
    switch ($c.kind) {
      'input' { $cfg[(& $k $ctrlKey)] = @{ type = $c.type; required = [bool]$c.required; _cssid = $fid }
        if ($c.autocomplete) { $cfg[(& $k $ctrlKey)]['autocomplete'] = $c.autocomplete }
        if ($c.placeholder) { $cfg[(& $k $ctrlKey)]['placeholder'] = $c.placeholder }
        $cls[(& $k $ctrlKey)] = @('form-control') }
      'select' { $cfg[(& $k $ctrlKey)] = @{ _cssid = $fid; name = $id; options = @($c.options | ForEach-Object { @{ key = $_; value = $_ } }); required = $false; 'has-default-value' = $true; value = $c.options[0] }
        $cls[(& $k $ctrlKey)] = @('form-control') }
      'textarea' { $cfg[(& $k $ctrlKey)] = @{ placeholder = $c.placeholder; rows = 5; required = [bool]$c.required; resizable = 'vertical'; _cssid = $fid }
        $cls[(& $k $ctrlKey)] = @('form-control') }
      'file' { $cfg[(& $k $ctrlKey)] = @{ 'attachment-type' = 'attach'; 'file-types' = $FormatiAllegati; _cssid = $fid; 'max-file-size' = $DimensioneMaxAllegatoMB; multiple = $true; 'max-files' = $NumeroMaxAllegati; required = $false }
        $cfg[(& $k "Hint $id")] = @{ paragraph = 'Planimetrie, capitolato o foto dello stato attuale. PDF, DWG, JPG, PNG.' }
        $cls[(& $k "Hint $id")] = @('form-hint') }
    }
  }
  # progetto di provenienza (solo nelle schede): campo nascosto con il titolo
  if ($ConProgetto) {
    $form += & $T 'e-form-input' 'Campo progetto'
    $cfg[(& $k 'Campo progetto')] = @{ type = 'text'; required = $false; readonly = $true; 'has-default-value' = $true; value = (& $dyn 'post-title' @{}); _cssid = 'progetto' }
    $sty[(& $k 'Campo progetto')] = 'display: none;'
  }
  # privacy e invio
  $form += & $T 'e-div-block' 'Riga privacy' ((& $T 'e-form-checkbox' 'Privacy') + (& $T 'e-form-label' 'Privacy testo'))
  $cfg[(& $k 'Privacy')] = @{ _cssid = 'privacy'; name = 'privacy'; value = 'accetto'; required = $true; 'has-default-value' = $false; checked = $false }
  $cfg[(& $k 'Privacy testo')] = @{ tag = 'label'; 'input-id' = 'privacy'; text = "Ho letto l'informativa privacy e acconsento al trattamento dei dati per ricevere una risposta. *" }
  $cls[(& $k 'Riga privacy')] = @('form-field', 'form-field-wide')
  $sty[(& $k 'Riga privacy')] = 'flex-direction: row; align-items: flex-start; gap: 12px;'
  $form += & $T 'e-div-block' 'Azioni' ((& $T 'e-form-submit-button' 'Invia') + (& $T 'e-paragraph' 'Obbligatori'))
  $cfg[(& $k 'Invia')] = @{ text = 'Invia la richiesta'; tag = 'button' }
  $cfg[(& $k 'Obbligatori')] = @{ paragraph = '* campi obbligatori' }
  $cls[(& $k 'Azioni')] = @('form-actions'); $cls[(& $k 'Invia')] = @('form-submit'); $cls[(& $k 'Obbligatori')] = @('form-hint')

  # esito
  $form += & $T 'e-form-success-message' 'Esito ok' (& $T 'e-paragraph' 'Esito ok testo')
  $form += & $T 'e-form-error-message' 'Esito errore' (& $T 'e-paragraph' 'Esito errore testo')
  $cfg[(& $k 'Esito ok testo')] = @{ paragraph = 'Richiesta inviata. Grazie: un tecnico Artes ti ricontatterà entro due giorni lavorativi.' }
  $cfg[(& $k 'Esito errore testo')] = @{ paragraph = "Non siamo riusciti a inviare la richiesta. Riprova fra poco o scrivici a $DestinatarioEmail." }
  $cls[(& $k 'Esito ok testo')] = @('lead'); $cls[(& $k 'Esito errore testo')] = @('lead')
  $sty[(& $k 'Esito ok')] = 'grid-column: 1 / -1; border-top: 2px solid var(--accent); padding: 34px 0;'
  $sty[(& $k 'Esito errore')] = 'grid-column: 1 / -1; padding: 34px 0;'

  $formXml = & $T 'e-form' 'Modulo' $form
  $cfg[(& $k 'Modulo')] = [ordered]@{
    'form-name' = 'Contatti'
    'actions-after-submit' = @('email')
    email = [ordered]@{ to = @($DestinatarioEmail); subject = 'Nuova richiesta dal sito ARTES'; message = '[all-fields]'; 'reply-to' = '[email]'; 'send-as' = 'html'; 'from-name' = 'Sito ARTES' }
  }
  $cls[(& $k 'Modulo')] = @('form-grid')

  $root = & $T 'e-div-block' 'Sezione' ($intro + (& $T 'e-div-block' 'Colonna modulo' $formXml))
  $cls[(& $k 'Sezione')] = @('contatti')
  $sty[(& $k 'Colonna modulo')] = 'padding: 0;'
  return @{ xml = $root; cfg = $cfg; cls = $cls; sty = $sty }
}
