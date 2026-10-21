# Costruttore generico di moduli a gruppi (e-form di Elementor Pro) per le pagine Contatti e Preventivo.
# Va incluso dopo lib-blocchi.ps1:  . lib-blocchi.ps1; . lib-contatti.ps1 (per destinatario e formati); . lib-form.ps1
#   $m = New-Modulo -Prefix 'Fm' -Nome 'Contatti' -Oggetto '...' -Gruppi $gruppi -Invia 'Invia il messaggio' -PrivacyTesto '...' -OkTesto '...'
# Un gruppo: @{ legenda = 'Chi sei'|$null; tipo = 'campi'|'opzioni'; campi = @( ... ) }
# Un campo:  @{ id; label; kind = input|select|textarea|file|check; type; required; wide; options; autocomplete; placeholder; hint }
# I campi si chiamano con il loro id (_cssid): nell'email compaiono con l'etichetta. Il destinatario è quello
# TEMPORANEO definito in lib-contatti.ps1 ($DestinatarioEmail).

function New-Modulo {
  param([string]$Prefix, [string]$Nome, [string]$Oggetto, $Gruppi, [string]$Invia, [string]$PrivacyTesto, [string]$OkTesto)
  $part = New-Part
  $T = { param($t, $id, $inner = '') "<$t configuration-id=`"$Prefix $id`">$inner</$t>" }
  $K = { param($id) "$Prefix $id" }
  $form = ''; $g = 0
  foreach ($gr in $Gruppi) {
    $g++; $gx = ''
    if ($gr.legenda) { $gx += & $T 'e-heading' "G$g Legenda"; $part.cfg[(& $K "G$g Legenda")] = @{ tag = 'h3'; title = $gr.legenda }; $part.cls[(& $K "G$g Legenda")] = @('form-legend') }
    $cx = ''
    foreach ($c in $gr.campi) {
      $id = $c.id; $ctrl = "Campo $id"
      if ($c.kind -eq 'check') {
        $cx += & $T 'e-div-block' "Riga $id" ((& $T 'e-form-checkbox' $ctrl) + (& $T 'e-form-label' "Label $id"))
        $part.cfg[(& $K $ctrl)] = @{ _cssid = $id; name = $id; value = 'sì'; required = [bool]$c.required; 'has-default-value' = $false; checked = [bool]$c.checked }
        $part.cfg[(& $K "Label $id")] = @{ tag = 'label'; text = $c.label; 'input-id' = $id }
        $part.cls[(& $K "Riga $id")] = @('form-check-row')
        $part.sty[(& $K "Riga $id")] = 'font-size: 14px; line-height: 1.5;'
        continue
      }
      $tag = switch ($c.kind) { 'input' { 'e-form-input' } 'select' { 'e-form-select' } 'textarea' { 'e-form-textarea' } 'file' { 'e-form-file-upload' } }
      $in = (& $T 'e-form-label' "Label $id") + (& $T $tag $ctrl)
      if ($c.hint) { $in += & $T 'e-paragraph' "Hint $id"; $part.cfg[(& $K "Hint $id")] = @{ paragraph = $c.hint }; $part.cls[(& $K "Hint $id")] = @('form-hint') }
      $cx += & $T 'e-div-block' "Riga $id" $in
      $part.cfg[(& $K "Label $id")] = @{ tag = 'label'; text = $c.label; 'input-id' = $id }; $part.cls[(& $K "Label $id")] = @('form-label')
      $part.cls[(& $K "Riga $id")] = if ($c.wide) { @('form-field', 'form-field-wide') } else { , @('form-field') }
      switch ($c.kind) {
        'input' { $x = @{ type = $c.type; required = [bool]$c.required; _cssid = $id }; if ($c.autocomplete) { $x['autocomplete'] = $c.autocomplete }; if ($c.placeholder) { $x['placeholder'] = $c.placeholder }; $part.cfg[(& $K $ctrl)] = $x; $part.cls[(& $K $ctrl)] = @('form-control') }
        'select' { $part.cfg[(& $K $ctrl)] = @{ _cssid = $id; name = $id; options = @($c.options | ForEach-Object { @{ key = $_; value = $_ } }); required = [bool]$c.required; 'has-default-value' = $true; value = $c.options[0] }; $part.cls[(& $K $ctrl)] = @('form-control') }
        'textarea' { $part.cfg[(& $K $ctrl)] = @{ placeholder = $c.placeholder; rows = $(if ($c.rows) { $c.rows } else { 5 }); required = [bool]$c.required; resizable = 'vertical'; _cssid = $id }; $part.cls[(& $K $ctrl)] = @('form-control') }
        'file' { $part.cfg[(& $K $ctrl)] = @{ 'attachment-type' = 'attach'; 'file-types' = $script:FormatiAllegati; _cssid = $id; 'max-file-size' = $script:DimensioneMaxAllegatoMB; multiple = $true; 'max-files' = $script:NumeroMaxAllegati; required = $false } }
      }
    }
    $gx += & $T 'e-div-block' "G$g Contenuto" $cx
    $part.cls[(& $K "G$g Contenuto")] = if ($gr.tipo -eq 'opzioni') { , @('form-options') } else { , @('form-fields') }
    $form += & $T 'e-div-block' "G$g" $gx
    $part.cls[(& $K "G$g")] = @('form-group'); $part.sty[(& $K "G$g")] = 'padding: 0;'
  }
  # privacy + invio
  $form += & $T 'e-div-block' 'Finale' ((& $T 'e-div-block' 'Riga privacy' ((& $T 'e-form-checkbox' 'Privacy') + (& $T 'e-form-label' 'Privacy testo'))) + (& $T 'e-div-block' 'Azioni' ((& $T 'e-form-submit-button' 'Invia') + (& $T 'e-paragraph' 'Obbligatori'))))
  $part.cfg[(& $K 'Privacy')] = @{ _cssid = 'privacy'; name = 'privacy'; value = 'accetto'; required = $true; 'has-default-value' = $false; checked = $false }
  $part.cfg[(& $K 'Privacy testo')] = @{ tag = 'label'; 'input-id' = 'privacy'; text = $PrivacyTesto }
  $part.cfg[(& $K 'Invia')] = @{ text = $Invia; tag = 'button' }; $part.cfg[(& $K 'Obbligatori')] = @{ paragraph = '* campi obbligatori' }
  $part.cls[(& $K 'Finale')] = @('form-group'); $part.cls[(& $K 'Riga privacy')] = @('form-check-row'); $part.cls[(& $K 'Azioni')] = @('form-actions'); $part.cls[(& $K 'Invia')] = @('form-submit'); $part.cls[(& $K 'Obbligatori')] = @('form-hint')
  $part.sty[(& $K 'Finale')] = 'padding: 0; display: flex; flex-direction: column; gap: 34px;'; $part.sty[(& $K 'Riga privacy')] = 'font-size: 14px; line-height: 1.5;'
  # esito
  $form += (& $T 'e-form-success-message' 'Esito ok' (& $T 'e-paragraph' 'Esito ok testo')) + (& $T 'e-form-error-message' 'Esito errore' (& $T 'e-paragraph' 'Esito errore testo'))
  $part.cfg[(& $K 'Esito ok testo')] = @{ paragraph = $OkTesto }
  $part.cfg[(& $K 'Esito errore testo')] = @{ paragraph = "Non siamo riusciti a inviare il modulo. Riprova fra poco o scrivici a $script:DestinatarioEmail." }
  $part.cls[(& $K 'Esito ok testo')] = @('lead'); $part.cls[(& $K 'Esito errore testo')] = @('lead')
  $part.sty[(& $K 'Esito ok')] = 'border-top: 2px solid var(--accent); padding: 34px 0;'; $part.sty[(& $K 'Esito errore')] = 'padding: 34px 0;'
  $part.xml = & $T 'e-form' 'Modulo' $form
  $part.cfg[(& $K 'Modulo')] = [ordered]@{ 'form-name' = $Nome; 'actions-after-submit' = @('email'); email = [ordered]@{ to = @($script:DestinatarioEmail); subject = $Oggetto; message = '[all-fields]'; 'reply-to' = '[email]'; 'send-as' = 'html'; 'from-name' = 'Sito ARTES' } }
  $part.cls[(& $K 'Modulo')] = @('form-stack')
  return $part
}

# Sezione "contatti" generica: intro a sinistra (titolo, testo, link o elenco dati) e modulo a destra
function Block-SezioneModulo($b, $modulo) {
  $part = New-Part; $P = 'Mod'
  $intro = (Tg 'e-paragraph' "$P Eyebrow") + (Tg 'e-heading' "$P Titolo") + (Tg 'e-paragraph' "$P Lead")
  $part.cfg["$P Eyebrow"] = @{ paragraph = $b.eyebrow }; $part.cfg["$P Titolo"] = @{ tag = 'h2'; title = $b.titolo }; $part.cfg["$P Lead"] = @{ paragraph = $b.lead }
  $part.cls["$P Eyebrow"] = @('eyebrow'); $part.cls["$P Titolo"] = @('h-section'); $part.cls["$P Lead"] = @('lead'); $part.sty["$P Lead"] = 'margin: 26px 0 0;'
  if ($b.link) { $intro += Tg 'e-paragraph' "$P Link"; $part.cfg["$P Link"] = @{ paragraph = $b.link.testo; link = (Link-Pagina $b.link.href $b.link.testo) }; $part.cls["$P Link"] = @('link-rule'); $part.sty["$P Link"] = 'margin-top: 34px;' }
  if ($b.dati -and $b.dati.Count) {
    $righe = ''; $i = 0
    foreach ($d in $b.dati) { $i++; $righe += Tg 'e-div-block' "$P Dato $i" ((Tg 'e-paragraph' "$P Dato $i L") + (Tg 'e-paragraph' "$P Dato $i V"))
      $part.cfg["$P Dato $i L"] = @{ paragraph = $d.dt }
      $part.cfg["$P Dato $i V"] = if ($d.link) { @{ paragraph = $d.link.testo; link = (Link-Pagina $d.link.href $d.link.testo) } } else { @{ paragraph = $d.dd } }
      $part.cls["$P Dato $i L"] = @('contatti-dl-label'); $part.cls["$P Dato $i V"] = if ($d.link) { @('contatti-dl-value', 'link-rule') } else { , @('contatti-dl-value') }; $part.sty["$P Dato $i"] = 'padding: 0;' }
    $intro += Tg 'e-div-block' "$P Dati" $righe; $part.cls["$P Dati"] = @('contatti-diretti')
  }
  $part.xml = Tg 'e-div-block' "$P Sezione" ((Tg 'e-div-block' "$P Intro" $intro) + (Tg 'e-div-block' "$P Colonna" $modulo.xml))
  $part.cls["$P Sezione"] = if ($b.alt) { @('contatti', 'bg-alt') } else { , @('contatti') }; $part.cls["$P Intro"] = @('contatti-intro'); $part.sty["$P Colonna"] = 'padding: 0;'
  foreach ($e in $modulo.cfg.GetEnumerator()) { $part.cfg[$e.Key] = $e.Value }; foreach ($e in $modulo.cls.GetEnumerator()) { $part.cls[$e.Key] = $e.Value }; foreach ($e in $modulo.sty.GetEnumerator()) { $part.sty[$e.Key] = $e.Value }
  return $part
}
