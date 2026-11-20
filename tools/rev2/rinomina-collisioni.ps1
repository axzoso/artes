param([switch]$Ripristina)
# Rinomina su dev3 (con il prefisso "o-") le classi globali vecchie il cui nome coincide con una classe della rev2,
# così le classi nuove possono avere i nomi esatti della rev2 mentre le pagine attuali restano uguali.
# Elenco: tools/out/rev2/classi-collisioni.json (da tools/rev2/inventario-classi.js).
#   powershell tools/rev2/rinomina-collisioni.ps1               rinomina  (eyebrow -> o-eyebrow ...)
#   powershell tools/rev2/rinomina-collisioni.ps1 -Ripristina   riporta i nomi originali
$d = Split-Path $PSScriptRoot -Parent
$coll = Get-Content (Join-Path $d 'out\rev2\classi-collisioni.json') -Raw | ConvertFrom-Json
# stato attuale delle etichette (id -> etichetta) letto da dev3
Set-Content (Join-Path $env:TEMP 'rev2-labels.php') 'return get_post_meta(7, "_elementor_global_classes_labels", true);' -Encoding utf8
$cur = ((& (Join-Path $d 'php.ps1') -File (Join-Path $env:TEMP 'rev2-labels.php') -Max 2000000) | ConvertFrom-Json).data.return_value
$byLabel = @{}; foreach ($p in $cur.PSObject.Properties) { $byLabel[[string]$p.Value] = $p.Name }
$ops = @()
foreach ($c in $coll) {
  if ($Ripristina) { $from = "o-$c"; $to = $c } else { $from = $c; $to = "o-$c" }
  if (-not $byLabel.ContainsKey($from)) { if ($byLabel.ContainsKey($to)) { "già a posto: $to" } else { "ATTENZIONE: classe '$from' non trovata" }; continue }
  $ops += @{ action = 'update'; id = $byLabel[$from]; label = $to }
}
"operazioni da eseguire: $($ops.Count)"
$ok = 0; $err = 0
for ($i = 0; $i -lt $ops.Count; $i += 50) {
  $chunk = @($ops[$i..([Math]::Min($i + 49, $ops.Count - 1))])
  $a = @{ operations = $chunk } | ConvertTo-Json -Depth 5 -Compress
  $raw = & (Join-Path $d 'mcp.ps1') -Server elementor -Tool elementor-manage-classes -ArgsJson $a -Max 4000000
  $j = $raw | ConvertFrom-Json
  foreach ($r in $j.results) { if ($r.status -eq 'ok') { $ok++ } else { $err++; "ERRORE $($r.label): $($r.message)" } }
}
& (Join-Path $d 'php.ps1') -File (Join-Path $d 'flush.php') -Max 200 | Out-Null
"rinominate: $ok, errori: $err; cache di Elementor svuotata"
