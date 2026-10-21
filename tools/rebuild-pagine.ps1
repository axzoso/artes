param([string[]]$Only = @())
# Costruisce su dev3 le pagine istituzionali (chi siamo, contract, su misura, area progettisti) dal contenuto
# estratto dal mockup (tools/out/pagine.json, da extract-pagine.js): immagini -> composizione -> impostazioni
# (tutta larghezza) -> pubblicazione, poi svuota le cache. -Only chi-siamo,contract per limitare.
$d = $PSScriptRoot
New-Item -ItemType Directory -Force (Join-Path $d 'out') | Out-Null
$pagine = Get-Content "$d\out\pagine.json" -Raw -Encoding utf8 | ConvertFrom-Json
$ids = [ordered]@{ 'chi-siamo' = 151; 'contract' = 150; 'arredamento-su-misura' = 149; 'area-progettisti' = 153 }

$chiavi = @($ids.Keys | Where-Object { (-not $Only.Count) -or ($Only -contains $_) })
$imm = @()
foreach ($k in $chiavi) { foreach ($b in $pagine.$k) {
  if ($b.tipo -eq 'banda') { $imm += @{ src = $b.img.src; alt = $b.img.alt } }
  if ($b.tipo -eq 'produzione') { foreach ($i in $b.immagini) { $imm += @{ src = $i.src; alt = $i.alt } } }
} }
$imm | ConvertTo-Json -Depth 3 | Set-Content "$d\out\lista-immagini-pagine.json" -Encoding utf8
& "$d\import-immagini.ps1" -ListFile "$d\out\lista-immagini-pagine.json"

. "$d\lib-blocchi.ps1"; . "$d\lib-home.ps1"; . "$d\lib-pagine.ps1"
foreach ($k in $chiavi) {
  $id = $ids[$k]
  $comp = Join-Blocks (Convert-Blocchi $pagine.$k) -PostId $id
  $f = "$d\out\comp-pagina-$k.json"
  $comp | ConvertTo-Json -Depth 30 | Set-Content $f -Encoding utf8
  $null = & "$d\mcp.ps1" -Server elementor -Tool elementor-update-page-settings -ArgsJson "{`"post_id`":$id,`"settings`":{`"template`":`"elementor_header_footer`"}}" -Max 200
  $r = & "$d\compose.ps1" -File $f -Max 900
  if ($r -notmatch '"success":true') { "$k ($id): COMPOSIZIONE FALLITA: $($r.Substring(0, [Math]::Min(700, $r.Length)))"; continue }
  if ($r -match '"warnings"') { "$k avvisi: " + ([regex]::Match($r, '"warnings".{0,600}').Value) }
  $null = & "$d\mcp.ps1" -Server elementor -Tool elementor-publish-document -ArgsJson "{`"post_id`":$id}" -Max 100
  "$k -> pagina $id costruita e pubblicata"
}
$null = & "$d\php.ps1" -File "$d\flush.php" -Max 100
"cache svuotata"
