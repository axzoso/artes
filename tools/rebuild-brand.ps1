param([int]$ArchiveId = 447, [int]$SingleId = 448)
# Rigenera archivio brand (447) e singolo brand (448): genera, compone, pubblica, svuota le cache.
$d = $PSScriptRoot
New-Item -ItemType Directory -Force (Join-Path $d 'out') | Out-Null
foreach ($x in @(@{ gen = 'gen-archive-brand.ps1'; id = $ArchiveId; f = 'comp-archive-brand.json' }, @{ gen = 'gen-single-brand.ps1'; id = $SingleId; f = 'comp-single-brand.json' })) {
  $f = "$d\out\$($x.f)"
  & "$d\$($x.gen)" -PostId $x.id -Out $f | Out-Null
  $r = & "$d\compose.ps1" -File $f -Max 800
  if ($r -notmatch '"success":true') { "COMPOSIZIONE FALLITA ($($x.id)): $r"; continue }
  if ($r -match '"warnings"') { "avvisi $($x.id): " + ([regex]::Match($r, '"warnings".{0,500}').Value) }
  & "$d\mcp.ps1" -Server elementor -Tool elementor-publish-document -ArgsJson "{`"post_id`":$($x.id)}" -Max 100 | Out-Null
  "$($x.id) ricostruito e pubblicato"
}
& "$d\php.ps1" -File "$d\flush.php" -Max 100 | Out-Null
"cache svuotata"
