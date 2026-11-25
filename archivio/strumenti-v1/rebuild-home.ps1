param([int]$PostId = 0)
# Costruisce la home su dev3 dal contenuto estratto dal mockup (tools/out/home.json, da extract-home.js):
# importa le immagini, compone i blocchi (lib-blocchi.ps1 + lib-home.ps1), imposta la pagina a tutta
# larghezza, pubblica e svuota le cache. Senza -PostId usa la pagina "home" (pagina iniziale del sito).
$d = $PSScriptRoot
New-Item -ItemType Directory -Force (Join-Path $d 'out') | Out-Null
if (-not $PostId) {
  $PostId = [int](((& "$d\php.ps1" -File "$d\setup\pagina-home.php" -Max 500) | ConvertFrom-Json).data.return_value.home_id)
}
$h = Get-Content "$d\out\home.json" -Raw -Encoding utf8 | ConvertFrom-Json

# immagini
$imm = @(@{ src = $h.hero.img.src; alt = $h.hero.img.alt })
foreach ($t in $h.settori.tile) { $imm += @{ src = $t.img.src; alt = $t.img.alt } }
foreach ($i in $h.produzione.immagini) { $imm += @{ src = $i.src; alt = $i.alt } }
$imm | ConvertTo-Json -Depth 3 | Set-Content "$d\out\lista-immagini-home.json" -Encoding utf8
& "$d\import-immagini.ps1" -ListFile "$d\out\lista-immagini-home.json"

. "$d\lib-blocchi.ps1"
. "$d\lib-home.ps1"
$parts = @(
  (Block-Hero $h.hero),
  (Block-Metodo $h.metodo),
  (Block-Tiles $h.settori),
  (Block-Produzione $h.produzione),
  (Block-Progetti $h.realizzazioni.eyebrow $h.realizzazioni.titolo '' $h.realizzazioni.piu.testo (Convert-Url $h.realizzazioni.piu.href) 'artes_progetti_home' -BgAlt -ConFiltri),
  (Block-Brands $h.brands),
  (Block-CtaDuo $h.duo)
)
$comp = Join-Blocks $parts -PostId $PostId
$f = "$d\out\comp-home.json"
$comp | ConvertTo-Json -Depth 30 | Set-Content $f -Encoding utf8
$null = & "$d\mcp.ps1" -Server elementor -Tool elementor-update-page-settings -ArgsJson "{`"post_id`":$PostId,`"settings`":{`"template`":`"elementor_header_footer`"}}" -Max 200
$r = & "$d\compose.ps1" -File $f -Max 900
if ($r -notmatch '"success":true') { "COMPOSIZIONE FALLITA: $($r.Substring(0, [Math]::Min(900, $r.Length)))"; return }
if ($r -match '"warnings"') { "avvisi: " + ([regex]::Match($r, '"warnings".{0,700}').Value) }
$null = & "$d\mcp.ps1" -Server elementor -Tool elementor-publish-document -ArgsJson "{`"post_id`":$PostId}" -Max 100
$null = & "$d\php.ps1" -File "$d\flush.php" -Max 100
"home ($PostId) costruita e pubblicata; cache svuotata"
