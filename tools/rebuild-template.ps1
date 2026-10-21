param([int]$PostId = 138)
# Rigenera il template singolo realizzazione: genera, compone, pubblica e svuota le cache di Elementor.
$d = $PSScriptRoot
New-Item -ItemType Directory -Force (Join-Path $PSScriptRoot 'out') | Out-Null
& "$d\gen-template.ps1" -PostId $PostId -Out "$d\out\comp-full.json" | Out-Null
$r = & "$d\compose.ps1" -File "$d\out\comp-full.json" -Max 400
if ($r -notmatch '"success":true') { "COMPOSIZIONE FALLITA: $r"; return }
& "$d\mcp.ps1" -Server elementor -Tool elementor-publish-document -ArgsJson "{`"post_id`":$PostId}" -Max 100 | Out-Null
# dopo la pubblicazione: pubblicare copia i dati dalla bozza e rimetterebbe le "&" doppie
& "$d\fix-form-ampersands.ps1" -Ids $PostId | Out-Null
& "$d\php.ps1" -File "$d\flush.php" -Max 100 | Out-Null
"template $PostId ricostruito e pubblicato; cache svuotata"

