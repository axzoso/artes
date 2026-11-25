param([int]$PostId = 213)
# Rigenera il template d'archivio delle realizzazioni: genera, compone, pubblica, svuota le cache.
$d = $PSScriptRoot
New-Item -ItemType Directory -Force (Join-Path $d 'out') | Out-Null
$f = "$d\out\comp-archive.json"
& "$d\gen-archive.ps1" -PostId $PostId -Out $f | Out-Null
$r = & "$d\compose.ps1" -File $f -Max 800
if ($r -notmatch '"success":true') { "COMPOSIZIONE FALLITA: $r"; return }
if ($r -match '"warnings"') { "avvisi: " + ([regex]::Match($r, '"warnings".{0,500}').Value) }
& "$d\mcp.ps1" -Server elementor -Tool elementor-publish-document -ArgsJson "{`"post_id`":$PostId}" -Max 100 | Out-Null
& "$d\php.ps1" -File "$d\flush.php" -Max 100 | Out-Null
"archivio $PostId ricostruito e pubblicato; cache svuotata"
