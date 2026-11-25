param([int]$HeaderId = 199, [int]$FooterId = 200)
# Rigenera header e footer: genera, compone, pubblica e svuota le cache di Elementor.
$d = $PSScriptRoot
New-Item -ItemType Directory -Force (Join-Path $d 'out') | Out-Null
foreach ($x in @(@('header', $HeaderId), @('footer', $FooterId))) {
  $f = "$d\out\comp-$($x[0]).json"
  & "$d\gen-header-footer.ps1" -Which $x[0] -PostId $x[1] -Out $f | Out-Null
  $r = & "$d\compose.ps1" -File $f -Max 600
  if ($r -notmatch '"success":true') { "COMPOSIZIONE $($x[0]) FALLITA: $r"; return }
  if ($r -match 'warnings') { "avvisi $($x[0]): " + ([regex]::Match($r, '"warnings".{0,400}').Value) }
  & "$d\mcp.ps1" -Server elementor -Tool elementor-publish-document -ArgsJson "{`"post_id`":$($x[1])}" -Max 100 | Out-Null
  "$($x[0]) $($x[1]) ricostruito e pubblicato"
}
& "$d\php.ps1" -File "$d\flush.php" -Max 100 | Out-Null
"cache svuotata"
