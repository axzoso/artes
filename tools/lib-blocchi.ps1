# Blocchi di pagina riusabili (come nel mockup). Si includono con dot-sourcing:
#   . "$PSScriptRoot\lib-blocchi.ps1"
#   $parts = @( (Block-Intro ...), (Block-Band ...), ... )
#   $comp  = Join-Blocks $parts -PostId 148
# Ogni blocco restituisce @{ xml; cfg; cls; sty } con i nomi degli elementi prefissati, così più blocchi
# convivono nella stessa composizione. Le immagini si risolvono con tools/out/media-map.json
# (vedi import-immagini.ps1).

$script:MediaMap = @{}
$mapFile = Join-Path $PSScriptRoot 'out\media-map.json'
if (Test-Path $mapFile) { (Get-Content $mapFile -Raw -Encoding utf8 | ConvertFrom-Json).PSObject.Properties | ForEach-Object { $script:MediaMap[$_.Name] = [int]$_.Value } }

function Dyn($n, $s) { @{ name = $n; settings = $s } }
function Tg($t, $id, $inner = '') { "<$t configuration-id=`"$id`">$inner</$t>" }

# Immagine dalla libreria: { src: { id }, size }
function ImgCfg($src, $size = 'large') {
  if (-not $script:MediaMap.ContainsKey($src)) { throw "immagine non importata: $src (usare import-immagini.ps1)" }
  @{ src = @{ id = $script:MediaMap[$src] }; size = $size }
}

# Converte un link del mockup (file .html con eventuale query) nell'URL relativo di WordPress.
# Le pagine hanno lo stesso slug del file; i link con query restano relativi (non seguono la lingua).
function Convert-Url([string]$href, [string]$settoreSlug = '') {
  if (-not $href) { return '#' }
  if ($href -match '^(https?:|mailto:|tel:|#)') { return $href }
  $frag = ''; if ($href -match '^(.*?)(#.*)$') { $href = $Matches[1]; $frag = $Matches[2] }
  $q = ''; if ($href -match '^(.*?)(\?.*)$') { $href = $Matches[1]; $q = $Matches[2] }
  $name = $href -replace '\.html$', ''
  switch ($name) {
    'index' { return '/' + $q + $frag }
    'realizzazioni' { if ($settoreSlug) { return "/settore/$settoreSlug/" } else { return '/realizzazioni/' + $q + $frag } }
    'brand-partner' { return '/brand-partner/' + $q + $frag }
    'brand-pedrali' { return '/brand-partner/pedrali/' + $q + $frag }
    default { return "/$name/" + $q + $frag }
  }
}

function New-Part { @{ xml = ''; cfg = [ordered]@{}; cls = [ordered]@{}; sty = [ordered]@{} } }

# --- Intestazione di pagina (page-intro) ------------------------------------------------------------
function Block-Intro($Eyebrow, $H1, $Lead, $Corrente) {
  $part = New-Part; $P = 'Intro'
  $bc = (Tg 'e-paragraph' "$P BC Home") + (Tg 'e-paragraph' "$P BC Sep") + (Tg 'e-paragraph' "$P BC Corrente")
  $titolo = Tg 'e-div-block' "$P Titolo" ((Tg 'e-paragraph' "$P Eyebrow") + (Tg 'e-heading' "$P H1"))
  $part.xml = Tg 'e-div-block' "$P Blocco" ((Tg 'e-flexbox' "$P Breadcrumb" $bc) + (Tg 'e-div-block' "$P Riga" ($titolo + (Tg 'e-paragraph' "$P Lead"))))
  $part.cfg["$P BC Home"] = @{ paragraph = 'Home'; link = @{ destination = '/'; tag = 'a' } }
  $part.cfg["$P BC Sep"] = @{ paragraph = '/' }
  $part.cfg["$P BC Corrente"] = @{ paragraph = $Corrente }
  $part.cfg["$P Eyebrow"] = @{ paragraph = $Eyebrow }
  $part.cfg["$P H1"] = @{ tag = 'h1'; title = $H1 }
  $part.cfg["$P Lead"] = @{ paragraph = $Lead }
  $part.cls["$P Blocco"] = @('page-intro'); $part.cls["$P Breadcrumb"] = @('breadcrumb'); $part.cls["$P BC Home"] = @('breadcrumb'); $part.cls["$P BC Sep"] = @('breadcrumb')
  $part.cls["$P BC Corrente"] = @('breadcrumb', 'breadcrumb-current'); $part.cls["$P Riga"] = @('page-intro-row'); $part.cls["$P Eyebrow"] = @('eyebrow')
  $part.cls["$P H1"] = @('page-title'); $part.cls["$P Lead"] = @('lead')
  $part.sty["$P Breadcrumb"] = 'padding: 0; gap: 8px;'; $part.sty["$P Titolo"] = 'padding: 0;'
  return $part
}

# --- Fascia immagine --------------------------------------------------------------------------------
function Block-Band($Src) {
  $part = New-Part; $P = 'Banda'
  $part.xml = Tg 'e-div-block' "$P Blocco" (Tg 'e-image' "$P Immagine")
  $part.cfg["$P Immagine"] = @{ image = (ImgCfg $Src 'full') }
  $part.cls["$P Blocco"] = @('page-band'); $part.cls["$P Immagine"] = @('fill-img')
  return $part
}

# --- Sezione con titolo e schede (ex section + grid-1px) --------------------------------------------
function Block-Schede($P, $Eyebrow, $Titolo, $Lead, $Cards, [switch]$BgAlt, [int]$Colonne = 3) {
  $part = New-Part
  $testa = Tg 'e-flexbox' "$P Testa" ((Tg 'e-div-block' "$P Titoli" ((Tg 'e-paragraph' "$P Eyebrow") + (Tg 'e-heading' "$P Titolo"))) + (Tg 'e-paragraph' "$P Lead"))
  $schede = ''
  $i = 0
  foreach ($c in $Cards) {
    $i++
    $schede += Tg 'e-div-block' "$P Scheda $i" ((Tg 'e-paragraph' "$P Scheda $i N") + (Tg 'e-heading' "$P Scheda $i T") + (Tg 'e-paragraph' "$P Scheda $i D"))
    $part.cfg["$P Scheda $i N"] = @{ paragraph = $c.n }; $part.cfg["$P Scheda $i T"] = @{ tag = 'h3'; title = $c.t }; $part.cfg["$P Scheda $i D"] = @{ paragraph = $c.d }
    $part.cls["$P Scheda $i"] = @('card'); $part.cls["$P Scheda $i N"] = @('card-n'); $part.cls["$P Scheda $i T"] = @('card-t'); $part.cls["$P Scheda $i D"] = @('card-d')
  }
  $grid = switch ($Colonne) { 2 { 'cards-grid-2' } 4 { 'cards-grid-4' } default { 'cards-grid' } }
  $part.xml = Tg 'e-div-block' "$P Sezione" ($testa + (Tg 'e-div-block' "$P Griglia" $schede))
  $part.cfg["$P Eyebrow"] = @{ paragraph = $Eyebrow }; $part.cfg["$P Titolo"] = @{ tag = 'h2'; title = $Titolo }; $part.cfg["$P Lead"] = @{ paragraph = $Lead }
  $part.cls["$P Sezione"] = if ($BgAlt) { @('section', 'bg-alt') } else { , @('section') }
  $part.cls["$P Testa"] = @('section-head'); $part.cls["$P Eyebrow"] = @('eyebrow'); $part.cls["$P Titolo"] = @('h-section'); $part.cls["$P Lead"] = @('lead', 'lead-head')
  $part.cls["$P Griglia"] = @($grid)
  $part.sty["$P Testa"] = 'padding: 0;'; $part.sty["$P Titoli"] = 'padding: 0;'
  return $part
}

# --- Blocco settore: elenco ambiti + immagine con inserto -------------------------------------------
function Block-Settore($S, [switch]$BgAlt) {
  $part = New-Part; $P = 'Settore'
  $voci = ''; $i = 0
  foreach ($v in $S.voci) { $i++; $voci += Tg 'e-paragraph' "$P Voce $i"; $part.cfg["$P Voce $i"] = @{ paragraph = $v }; $part.cls["$P Voce $i"] = @('ambito-voce') }
  $links = Tg 'e-flexbox' "$P Links" (Tg 'e-paragraph' "$P Link")
  $testo = Tg 'e-div-block' "$P Testo" ((Tg 'e-paragraph' "$P Eyebrow") + (Tg 'e-div-block' "$P Ambiti" $voci) + $links)
  $media = Tg 'e-div-block' "$P Media" ((Tg 'e-image' "$P Immagine") + (Tg 'e-div-block' "$P Inserto" (Tg 'e-image' "$P Inserto immagine")))
  $part.xml = Tg 'e-div-block' "$P Sezione" ($testo + $media)
  $part.cfg["$P Eyebrow"] = @{ paragraph = $S.eyebrow }
  $part.cfg["$P Link"] = @{ paragraph = $S.link.testo; link = @{ destination = (Convert-Url $S.link.href); tag = 'a' } }
  $part.cfg["$P Immagine"] = @{ image = (ImgCfg $S.immagine.src 'large') }
  $part.cfg["$P Inserto immagine"] = @{ image = (ImgCfg $S.inset.src 'large') }
  $flip = [bool]$S.flip
  $part.cls["$P Sezione"] = if ($BgAlt) { @('settore-blocco', 'bg-alt') } else { , @('settore-blocco') }
  $part.cls["$P Testo"] = if ($flip) { @('settore-testo', 'settore-flip-testo') } else { , @('settore-testo') }
  $part.cls["$P Media"] = if ($flip) { @('settore-media', 'settore-flip-media') } else { , @('settore-media') }
  $part.cls["$P Inserto"] = if ($flip) { @('settore-inset', 'settore-inset-flip') } else { , @('settore-inset') }
  $part.cls["$P Eyebrow"] = @('eyebrow'); $part.cls["$P Ambiti"] = @('ambiti-lista'); $part.cls["$P Links"] = @('settore-links'); $part.cls["$P Link"] = @('link-rule')
  $part.cls["$P Immagine"] = @('abs-fill'); $part.cls["$P Inserto immagine"] = @('abs-fill')
  return $part
}

# --- Elenco progetti (ciclo) con link "tutte le realizzazioni" ---------------------------------------
function Block-Progetti($Eyebrow, $Titolo, $Lead, $PiuTesto, $PiuUrl, $QueryId = 'artes_progetti_settore', [switch]$BgAlt, [switch]$ConFiltri) {
  $part = New-Part; $P = 'Progetti'
  $destra = if ($ConFiltri) { Tg 'e-flexbox' "$P Filtri" (Tg 'nav-menu' "$P Menu filtri") } elseif ($Lead) { Tg 'e-paragraph' "$P Lead" } else { '' }
  $testa = Tg 'e-flexbox' "$P Testa" ((Tg 'e-div-block' "$P Titoli" ((Tg 'e-paragraph' "$P Eyebrow") + (Tg 'e-heading' "$P Titolo"))) + $destra)
  $card = Tg 'e-collection-loop-item' "$P Card" ((Tg 'e-image' "$P Card immagine") + (Tg 'e-flexbox' "$P Card meta" ((Tg 'e-div-block' "$P Card testo" ((Tg 'e-paragraph' "$P Card nome") + (Tg 'e-paragraph' "$P Card luogo"))) + (Tg 'e-paragraph' "$P Card settore"))))
  $loop = Tg 'e-collection-loop' "$P Loop" (Tg 'e-collection-loop-layout' "$P Layout" $card)
  $piu = Tg 'e-div-block' "$P Piu" (Tg 'e-paragraph' "$P Piu link")
  $part.xml = Tg 'e-div-block' "$P Sezione" ($testa + $loop + $piu)
  $part.cfg["$P Eyebrow"] = @{ paragraph = $Eyebrow }; $part.cfg["$P Titolo"] = @{ tag = 'h2'; title = $Titolo }
  if ($Lead -and -not $ConFiltri) { $part.cfg["$P Lead"] = @{ paragraph = $Lead }; $part.cls["$P Lead"] = @('lead', 'lead-head') }
  if ($ConFiltri) { $part.cfg["$P Menu filtri"] = @{ menu = 'filtri-realizzazioni'; layout = 'horizontal'; pointer = 'none'; dropdown = 'none' }; $part.cls["$P Filtri"] = @('filtri'); $part.sty["$P Filtri"] = 'padding: 0; margin: 0; width: auto;' }
  $part.cfg["$P Loop"] = @{ query = @{ template_type = 'post'; source = 'realizzazione'; query_id = $QueryId; posts_per_page = 6 } }
  $part.cfg["$P Card immagine"] = @{ image = @{ src = (Dyn 'post-featured-image' @{}); size = 'large' }; link = @{ destination = (Dyn 'post-url' @{}); tag = 'a' } }
  $part.cfg["$P Card nome"] = @{ paragraph = (Dyn 'post-title' @{}); link = @{ destination = (Dyn 'post-url' @{}); tag = 'a' } }
  $part.cfg["$P Card luogo"] = @{ paragraph = (Dyn 'jet-post-custom-field' @{ meta_field = 'localita' }) }
  $part.cfg["$P Card settore"] = @{ paragraph = (Dyn 'jet-term-field' @{ taxonomy = 'settore'; term_field = 'name' }) }
  $part.cfg["$P Piu link"] = @{ paragraph = $PiuTesto; link = @{ destination = $PiuUrl; tag = 'a' } }
  $part.cls["$P Sezione"] = if ($BgAlt) { @('section', 'bg-alt') } else { ,@('section') }; $part.cls["$P Testa"] = @('section-head'); $part.cls["$P Eyebrow"] = @('eyebrow'); $part.cls["$P Titolo"] = @('h-section')
  $part.cls["$P Layout"] = @('progetti-grid'); $part.cls["$P Card immagine"] = @('img-cover', 'progetto-img'); $part.cls["$P Card meta"] = @('progetto-meta')
  $part.cls["$P Card nome"] = @('progetto-nome'); $part.cls["$P Card luogo"] = @('progetto-luogo'); $part.cls["$P Card settore"] = @('progetto-settore')
  $part.cls["$P Piu"] = @('section-more'); $part.cls["$P Piu link"] = @('link-rule')
  $part.sty["$P Testa"] = 'padding: 0; margin-bottom: 38px;'; $part.sty["$P Titoli"] = 'padding: 0;'; $part.sty["$P Loop"] = 'padding: 0;'; $part.sty["$P Layout"] = 'padding: 0;'
  $part.sty["$P Card"] = 'padding: 0;'; $part.sty["$P Card meta"] = 'padding-inline: 0; padding-bottom: 0;'; $part.sty["$P Card testo"] = 'padding: 0; width: auto;'
  return $part
}

# --- Fascia finale (CTA) -----------------------------------------------------------------------------
function Block-Cta($Titolo, $Bottoni) {
  $part = New-Part; $P = 'Cta'
  $b = ''; $i = 0
  foreach ($x in $Bottoni) { $i++; $b += Tg 'e-button' "$P Bottone $i"; $part.cfg["$P Bottone $i"] = @{ text = $x.testo; link = @{ destination = (Convert-Url $x.href); tag = 'a' } }
    $part.cls["$P Bottone $i"] = if ($i -eq 1) { @('btn', 'btn-red') } else { @('btn', 'btn-ghost') }
    $part.sty["$P Bottone $i"] = if ($i -eq 1) { 'border-radius: 0; border-width: 0;' } else { 'border-radius: 0; background-color: transparent;' } }
  $part.xml = Tg 'e-div-block' "$P Blocco" ((Tg 'e-heading' "$P Titolo") + (Tg 'e-flexbox' "$P Azioni" $b))
  $part.cfg["$P Titolo"] = @{ tag = 'h2'; title = $Titolo }
  $part.cls["$P Blocco"] = @('cta-band'); $part.cls["$P Titolo"] = @('cta-title'); $part.cls["$P Azioni"] = @('cta-actions')
  return $part
}

# --- Unione dei blocchi in una composizione ----------------------------------------------------------
function Join-Blocks($Parts, [int]$PostId) {
  $xml = ''; $cfg = [ordered]@{}; $cls = [ordered]@{}; $sty = [ordered]@{}
  foreach ($pt in $Parts) {
    $xml += $pt.xml
    foreach ($e in $pt.cfg.GetEnumerator()) { $cfg[$e.Key] = $e.Value }
    foreach ($e in $pt.cls.GetEnumerator()) { $cls[$e.Key] = $e.Value }
    foreach ($e in $pt.sty.GetEnumerator()) { $sty[$e.Key] = $e.Value }
  }
  [ordered]@{ post_id = $PostId; mode = 'replace_children'; parent_id = 'document'; xml_structure = $xml; element_config = $cfg; classes = $cls; style = $sty }
}
