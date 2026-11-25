param([Parameter(Mandatory)][string]$File, [int]$Max = 6000)
# Invia un file JSON a elementor-build-composition su dev3.
$args1 = (Get-Content $File -Raw -Encoding utf8 | ConvertFrom-Json | ConvertTo-Json -Depth 30 -Compress)
& (Join-Path $PSScriptRoot 'mcp.ps1') -Server elementor -Tool elementor-build-composition -ArgsJson $args1 -Max $Max

