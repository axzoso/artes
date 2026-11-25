# Classi globali per i moduli a gruppi (pagine Contatti e Richiedi preventivo).
# Uso: powershell tools/setup/classi-moduli.ps1
$t = Split-Path $PSScriptRoot -Parent
$defs = [ordered]@{
  'form-stack'     = 'display: flex; flex-direction: column; gap: 56px; padding: 0; align-items: stretch;'
  'form-group'     = 'display: block; padding: 0; gap: 0;'
  'form-legend'    = 'font-family: var(--font-display); font-size: 22px; font-weight: 500; letter-spacing: -.015em; color: var(--ink); padding: 16px 0 0; margin: 0 0 28px; border-top: 1px solid var(--graphite);'
  'form-fields'    = 'display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 34px 28px; padding: 0; align-items: start; @media(--mobile) { grid-template-columns: minmax(0, 1fr); }'
  'form-options'   = 'display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 14px 28px; padding: 0; @media(--mobile) { grid-template-columns: minmax(0, 1fr); }'
  'form-check-row' = 'display: flex; flex-direction: row; align-items: flex-start; gap: 12px; padding: 0; width: auto;'
}
$ops = @($defs.GetEnumerator() | ForEach-Object { @{ action = 'create'; label = $_.Key; css = $_.Value } })
$r = (& (Join-Path $t 'mcp.ps1') -Server elementor -Tool elementor-manage-classes -ArgsJson (@{ operations = $ops } | ConvertTo-Json -Depth 5 -Compress) -Max 40000) | ConvertFrom-Json
"classi create: $(@($r.results | Where-Object status -eq 'ok').Count)/$($ops.Count)"
$r.results | Where-Object status -ne 'ok' | ForEach-Object { "$($_.label): $($_.status) $($_.message)" }
