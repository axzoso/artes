param([Parameter(Mandatory)][string]$File, [int]$Max = 8000)
# Esegue su dev3 (via Novamira execute-php) il codice PHP del file indicato.
$code = Get-Content $File -Raw
$args1 = @{ ability_name = 'novamira/execute-php'; parameters = @{ code = $code } } | ConvertTo-Json -Depth 6 -Compress
$p = Join-Path $PSScriptRoot 'mcp.ps1'
& $p -Server novamira -Tool mcp-adapter-execute-ability -ArgsJson $args1 -Max $Max

