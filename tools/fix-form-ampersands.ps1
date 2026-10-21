param([Parameter(Mandatory)][string]$Ids)
# Dopo build-composition: corregge le "&" dei nomi dei settori nei menu a tendina dei moduli.
# Il widget select le scrive due volte (&amp;amp;): senza questo passaggio a video si vede "&amp;" e il valore
# scelto non coincide con l'opzione. Uso: fix-form-ampersands.ps1 -Ids 138,28
$d = $PSScriptRoot
New-Item -ItemType Directory -Force (Join-Path $d 'out') | Out-Null
$f = Join-Path $d 'out\fix-form-ampersands.php'
(Get-Content (Join-Path $d 'fix-form-ampersands.php.tpl') -Raw).Replace('__IDS__', $Ids) | Set-Content $f -Encoding utf8
(& (Join-Path $d 'php.ps1') -File $f -Max 1500)
