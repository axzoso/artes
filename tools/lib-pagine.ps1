# Blocchi generici per le pagine istituzionali, guidati dal JSON di extract-pagine.js.
# Va incluso dopo lib-blocchi.ps1 e lib-home.ps1:
#   . lib-blocchi.ps1; . lib-home.ps1; . lib-pagine.ps1
#   $parts = Convert-Blocchi $blocchi        # lista di blocchi estratti -> lista di parti
#   $comp  = Join-Blocks $parts -PostId <id>

# Converte i link <a href="x.html"> dentro un testo HTML nei percorsi di WordPress
function Fix-Html([string]$s) {
  if (-not $s) { return $s }
  [regex]::Replace($s, '<a href="([^"]*)">', { param($m) '<a href="' + (Convert-Url $m.Groups[1].Value) + '">' })
}

# Schede (card) con titolo, testo, elenco, link, variante scura/grande
function Build-Schede($P, $g) {
  $part = New-Part
  $xml = ''; $i = 0
  foreach ($c in $g.schede) {
    $i++; $k = "$P Scheda $i"; $in = ''
    if ($c.n) { $in += Tg 'e-paragraph' "$k N"; $part.cfg["$k N"] = @{ paragraph = $c.n }; $part.cls["$k N"] = if ($c.scura) { @('card-n', 'card-dark-n') } else { , @('card-n') } }
    if ($c.t) { $in += Tg 'e-heading' "$k T"; $part.cfg["$k T"] = @{ tag = 'h3'; title = $c.t }; $part.cls["$k T"] = if ($c.scura) { @('card-t', 'card-dark-t') } else { , @('card-t') } }
    if ($c.d) { $in += Tg 'e-paragraph' "$k D"; $part.cfg["$k D"] = @{ paragraph = (Fix-Html $c.d) }; $part.cls["$k D"] = if ($c.scura) { @('card-d', 'card-dark-d') } else { , @('card-d') } }
    if ($c.lista -and $c.lista.Count) {
      $j = 0; foreach ($li in $c.lista) { $j++; $in += Tg 'e-paragraph' "$k L$j"; $part.cfg["$k L$j"] = @{ paragraph = $li }; $part.cls["$k L$j"] = @('card-list-item') }
    }
    $xml += Tg 'e-div-block' $k $in
    $cl = @(); if ($c.scura) { $cl += 'card-dark' } else { $cl += 'card' }; if ($c.grande) { $cl += 'card-lg' }; if ($c.span2) { $cl += 'card-span2' }
    $part.cls[$k] = $cl
    if ($c.href) { $part.cfg[$k] = @{ link = (Link-Pagina $c.href $c.t) } }
  }
  $grid = switch ([int]$g.colonne) { 2 { 'cards-grid-2' } 4 { 'cards-grid-4' } default { 'cards-grid' } }
  $part.xml = Tg 'e-div-block' "$P Griglia" $xml
  $part.cls["$P Griglia"] = @($grid)
  return $part
}

function Build-Fasi($P, $b) {
  $part = New-Part; $xml = ''; $i = 0
  foreach ($r in $b.righe) {
    $i++; $k = "$P Fase $i"; $out = ''; $j = 0
    foreach ($o in $r.out) { $j++; $out += (Tg 'e-paragraph' "$k O$j DT") + (Tg 'e-paragraph' "$k O$j DD"); $part.cfg["$k O$j DT"] = @{ paragraph = $o.dt }; $part.cfg["$k O$j DD"] = @{ paragraph = $o.dd }; $part.cls["$k O$j DT"] = @('fase-out-dt'); $part.cls["$k O$j DD"] = @('fase-out-dd') }
    $xml += Tg 'e-div-block' $k ((Tg 'e-heading' "$k T") + (Tg 'e-paragraph' "$k D") + (Tg 'e-div-block' "$k Out" $out))
    $part.cfg["$k T"] = @{ tag = 'h3'; title = $r.t }; $part.cfg["$k D"] = @{ paragraph = $r.d }
    $part.cls[$k] = @('fase-row'); $part.cls["$k T"] = @('fase-row-t'); $part.cls["$k D"] = @('fase-row-d'); $part.cls["$k Out"] = @('fase-row-out')
  }
  $part.xml = Tg 'e-div-block' "$P Fasi" $xml
  $part.cls["$P Fasi"] = @('fasi-lista')
  return $part
}

function Build-Materiali($P, $b) {
  $part = New-Part; $xml = ''; $i = 0
  foreach ($m in $b.voci) {
    $i++; $k = "$P Mat $i"
    $xml += Tg 'e-div-block' $k ((Tg 'e-div-block' "$k Sw") + (Tg 'e-paragraph' "$k N") + (Tg 'e-paragraph' "$k C"))
    $part.cfg["$k N"] = @{ paragraph = $m.nome }; $part.cfg["$k C"] = @{ paragraph = $m.cat }
    $part.cls[$k] = @('materiale'); $part.cls["$k Sw"] = @('materiale-sw'); $part.cls["$k N"] = @('materiale-n'); $part.cls["$k C"] = @('materiale-c')
    $part.sty["$k Sw"] = "background-color: $($m.colore);"
  }
  $part.xml = Tg 'e-div-block' "$P Materiali" $xml
  $part.cls["$P Materiali"] = @('materiali-grid')
  return $part
}

# Riquadro delle specifiche: elenco a sinistra, pannello a destra (testo, schede, link)
function Build-Specifiche($P, $b) {
  $part = New-Part
  $rows = ''; $i = 0
  foreach ($r in $b.righe) { $i++; $k = "$P Spec $i"; $rows += Tg 'e-div-block' $k ((Tg 'e-paragraph' "$k L") + (Tg 'e-paragraph' "$k V")); $part.cfg["$k L"] = @{ paragraph = $r.dt }; $part.cfg["$k V"] = @{ paragraph = $r.dd }
    $part.cls[$k] = @('spec'); $part.cls["$k L"] = @('spec-l'); $part.cls["$k V"] = @('spec-v'); $part.sty[$k] = 'padding-inline: 0;' }
  $sx = Tg 'e-div-block' "$P Sinistra" ((Tg 'e-paragraph' "$P Sx Eyebrow") + (Tg 'e-div-block' "$P Elenco" $rows))
  $part.cfg["$P Sx Eyebrow"] = @{ paragraph = $b.eyebrow }
  $part.cls["$P Sinistra"] = @('specs-panel'); $part.cls["$P Sx Eyebrow"] = @('eyebrow', 'eyebrow-spaced'); $part.cls["$P Elenco"] = @('specs-list'); $part.sty["$P Elenco"] = 'padding: 0;'
  $xml = $sx
  if ($b.destra) {
    $d = $b.destra; $in = Tg 'e-paragraph' "$P Dx Eyebrow"
    $part.cfg["$P Dx Eyebrow"] = @{ paragraph = $d.eyebrow }; $part.cls["$P Dx Eyebrow"] = @('eyebrow', 'eyebrow-spaced')
    if ($d.lead) { $in += Tg 'e-paragraph' "$P Dx Lead"; $part.cfg["$P Dx Lead"] = @{ paragraph = $d.lead }; $part.cls["$P Dx Lead"] = @('lead', 'lead-flush') }
    if ($d.griglia) { $g = Build-Schede "$P Dx" $d.griglia; $in += $g.xml; foreach ($e in $g.cfg.GetEnumerator()) { $part.cfg[$e.Key] = $e.Value }; foreach ($e in $g.cls.GetEnumerator()) { $part.cls[$e.Key] = $e.Value }; foreach ($e in $g.sty.GetEnumerator()) { $part.sty[$e.Key] = $e.Value } }
    if ($d.link) { $in += Tg 'e-paragraph' "$P Dx Link"; $part.cfg["$P Dx Link"] = @{ paragraph = $d.link.testo; link = @{ destination = (Convert-Url $d.link.href); tag = 'a' } }; $part.cls["$P Dx Link"] = @('link-rule'); $part.sty["$P Dx Link"] = 'margin-top: 26px;' }
    $xml += Tg 'e-div-block' "$P Destra" $in
    $part.cls["$P Destra"] = @('finiture-panel')
  } else { $part.cls["$P Sinistra"] = @('specs-panel') }
  $part.xml = Tg 'e-div-block' "$P Specifiche" $xml
  $part.cls["$P Specifiche"] = @('scheda-specs')
  $part.sty["$P Specifiche"] = 'padding: 0;'
  return $part
}

# Sezione con testata (titolo, testo o link a destra) e contenuti in sequenza
function Build-Sezione($P, $b) {
  $part = New-Part; $xml = ''
  $t = $b.testa
  if ($t) {
    $dx = ''
    if ($t.lead) { $dx = Tg 'e-paragraph' "$P Lead"; $part.cfg["$P Lead"] = @{ paragraph = $t.lead }; $part.cls["$P Lead"] = @('lead', 'lead-head') }
    elseif ($t.link) { $dx = Tg 'e-paragraph' "$P Link"; $part.cfg["$P Link"] = @{ paragraph = $t.link.testo; link = @{ destination = (Convert-Url $t.link.href); tag = 'a' } }; $part.cls["$P Link"] = @('link-rule') }
    $xml += Tg 'e-flexbox' "$P Testa" ((Tg 'e-div-block' "$P Titoli" ((Tg 'e-paragraph' "$P Eyebrow") + (Tg 'e-heading' "$P Titolo"))) + $dx)
    $part.cfg["$P Eyebrow"] = @{ paragraph = $t.eyebrow }; $part.cfg["$P Titolo"] = @{ tag = 'h2'; title = $t.titolo }
    $part.cls["$P Testa"] = @('section-head'); $part.cls["$P Eyebrow"] = @('eyebrow'); $part.cls["$P Titolo"] = @('h-section'); $part.sty["$P Testa"] = 'padding: 0;'; $part.sty["$P Titoli"] = 'padding: 0;'
  }
  $n = 0
  foreach ($c in $b.contenuto) {
    $n++; $sub = "$P C$n"
    $sp = switch ($c.tipo) { 'schede' { Build-Schede $sub $c } 'fasi' { Build-Fasi $sub $c } 'materiali' { Build-Materiali $sub $c } 'specifiche' { Build-Specifiche $sub $c } default { throw "contenuto non gestito: $($c.tipo)" } }
    $xml += $sp.xml
    foreach ($e in $sp.cfg.GetEnumerator()) { $part.cfg[$e.Key] = $e.Value }; foreach ($e in $sp.cls.GetEnumerator()) { $part.cls[$e.Key] = $e.Value }; foreach ($e in $sp.sty.GetEnumerator()) { $part.sty[$e.Key] = $e.Value }
  }
  $part.xml = Tg 'e-div-block' "$P Sezione" $xml
  $cl = @('section'); if ($b.stretta) { $cl += 'section-tight' }; if ($b.alt) { $cl += 'bg-alt' }
  $part.cls["$P Sezione"] = $cl
  return $part
}

# Blocco testo + immagini (produzione): testo con eventuale griglia di schede, immagine con inserto
function Build-ProduzioneGen($P, $b) {
  $part = New-Part
  $in = (Tg 'e-paragraph' "$P Eyebrow") + (Tg 'e-heading' "$P Titolo") + (Tg 'e-paragraph' "$P Lead")
  $part.cfg["$P Eyebrow"] = @{ paragraph = $b.eyebrow }; $part.cfg["$P Titolo"] = @{ tag = 'h2'; title = $b.titolo }; $part.cfg["$P Lead"] = @{ paragraph = $b.lead }
  $part.cls["$P Eyebrow"] = @('eyebrow'); $part.cls["$P Titolo"] = @('h-section'); $part.cls["$P Lead"] = @('lead'); $part.sty["$P Lead"] = 'margin: 26px 0 42px; max-width: 460px;'
  if ($b.griglia) { $g = Build-Schede "$P G" $b.griglia; $in += $g.xml; foreach ($e in $g.cfg.GetEnumerator()) { $part.cfg[$e.Key] = $e.Value }; foreach ($e in $g.cls.GetEnumerator()) { $part.cls[$e.Key] = $e.Value }; foreach ($e in $g.sty.GetEnumerator()) { $part.sty[$e.Key] = $e.Value } }
  if ($b.link) { $in += Tg 'e-paragraph' "$P Link"; $part.cfg["$P Link"] = @{ paragraph = $b.link.testo; link = (Link-Pagina $b.link.href $b.link.testo) }; $part.cls["$P Link"] = @('link-rule'); $part.sty["$P Link"] = 'margin-top: 38px;' }
  $media = Tg 'e-image' "$P Immagine"
  $part.cfg["$P Immagine"] = @{ image = (ImgCfg $b.immagini[0].src 'large') }; $part.cls["$P Immagine"] = @('abs-fill')
  if ($b.immagini.Count -gt 1) { $media += Tg 'e-div-block' "$P Inserto" (Tg 'e-image' "$P Inserto immagine"); $part.cfg["$P Inserto immagine"] = @{ image = (ImgCfg $b.immagini[1].src 'large') }; $part.cls["$P Inserto immagine"] = @('abs-fill'); $part.cls["$P Inserto"] = @('settore-inset') }
  $part.xml = Tg 'e-div-block' "$P Sezione" ((Tg 'e-div-block' "$P Testo" $in) + (Tg 'e-div-block' "$P Media" $media))
  $part.cls["$P Sezione"] = @('settore-blocco'); $part.cls["$P Testo"] = @('settore-testo'); $part.cls["$P Media"] = @('settore-media')
  return $part
}

# Converte la lista di blocchi estratti in parti componibili
function Convert-Blocchi($blocchi) {
  $parts = @(); $n = 0
  foreach ($b in $blocchi) {
    $n++
    switch ($b.tipo) {
      'intro' { $parts += Block-Intro $b.eyebrow $b.h1 $b.lead $b.corrente }
      'banda' { $parts += Block-Band $b.img.src }
      'sezione' { $parts += Build-Sezione "S$n" $b }
      'produzione' { $parts += Build-ProduzioneGen "Pr$n" $b }
      'cta' { $parts += Block-Cta $b.titolo $b.bottoni }
      default { throw "blocco non gestito: $($b.tipo)" }
    }
  }
  return $parts
}
