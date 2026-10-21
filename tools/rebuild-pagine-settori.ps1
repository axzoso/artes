param([string[]]$Only = @())
# Costruisce le 5 pagine settore su dev3 (o solo quelle indicate: -Only hotel,bar) dal contenuto estratto
# dal mockup (tools/out/settori.json, generato da extract-settori.js) con i blocchi di lib-blocchi.ps1.
# Per ogni pagina: impostazioni (tutta larghezza) -> composizione -> pubblicazione. Poi svuota le cache.
$d = $PSScriptRoot
. "$d\lib-blocchi.ps1"
New-Item -ItemType Directory -Force (Join-Path $d 'out') | Out-Null
$settori = Get-Content "$d\out\settori.json" -Raw -Encoding utf8 | ConvertFrom-Json
$ids = [ordered]@{ uffici = 144; negozi = 145; food = 146; bar = 147; hotel = 148 }
$nomi = @{ uffici = 'Arredo uffici & workspace'; negozi = 'Arredo negozi & retail'; food = 'Arredo negozi food'; bar = 'Arredo bar & ristoranti'; hotel = 'Arredo hotel & hospitality' }

foreach ($k in $ids.Keys) {
  if ($Only.Count -and ($Only -notcontains $k)) { continue }
  $s = $settori.$k; $id = $ids[$k]
  $parts = @(
    (Block-Intro $s.intro.eyebrow $s.intro.h1 $s.intro.lead $nomi[$k]),
    (Block-Band $s.banda.src),
    (Block-Schede 'Sez' $s.settore.eyebrow $s.settore.titolo $s.settore.lead $s.settore.cards),
    (Block-Settore $s.ambiti -BgAlt:([bool]$s.ambiti.alt)),
    (Block-Progetti $s.progetti.eyebrow $s.progetti.titolo 'I cantieri che abbiamo consegnato in questo settore.' $s.progetti.piu.testo (Convert-Url $s.progetti.piu.href $s.termine)),
    (Block-Cta $s.cta.titolo $s.cta.bottoni)
  )
  $comp = Join-Blocks $parts -PostId $id
  $f = "$d\out\comp-settore-$k.json"
  $comp | ConvertTo-Json -Depth 30 | Set-Content $f -Encoding utf8
  $null = & "$d\mcp.ps1" -Server elementor -Tool elementor-update-page-settings -ArgsJson "{`"post_id`":$id,`"settings`":{`"template`":`"elementor_header_footer`"}}" -Max 200
  $r = & "$d\compose.ps1" -File $f -Max 800
  if ($r -notmatch '"success":true') { "$k ($id): COMPOSIZIONE FALLITA: $($r.Substring(0, [Math]::Min(600, $r.Length)))"; continue }
  if ($r -match '"warnings"') { "$k avvisi: " + ([regex]::Match($r, '"warnings".{0,500}').Value) }
  $null = & "$d\mcp.ps1" -Server elementor -Tool elementor-publish-document -ArgsJson "{`"post_id`":$id}" -Max 100
  "$k -> pagina $id costruita e pubblicata"
}
$null = & "$d\php.ps1" -File "$d\flush.php" -Max 100
"cache svuotata"
