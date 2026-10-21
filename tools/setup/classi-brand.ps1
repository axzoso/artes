# Classi globali dell'archivio Brand Partner (griglia dei brand su fondo chiaro, come brand-partner.html del mockup).
# Uso: powershell tools/setup/classi-brand.ps1   (crea quelle mancanti)
$t = Split-Path $PSScriptRoot -Parent
$mono = 'font-family: var(--font-mono); text-transform: uppercase;'
$defs = [ordered]@{
  'brand-lista'  = 'display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 12px 28px; padding: 0; @media(--tablet) { grid-template-columns: repeat(3, minmax(0, 1fr)); } @media(--mobile) { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px 22px; }'
  'brand-card'   = 'display: flex; flex-direction: column; align-items: flex-start; gap: 8px; min-height: 92px; padding: 14px 0 0; border-top: 1px solid rgba(17,17,17,.18);'
  'brand-card-n' = 'font-family: var(--font-display); font-size: 18.5px; font-weight: 500; letter-spacing: .04em; color: #111; margin: 0;'
  'brand-card-c' = "$mono font-size: 10px; letter-spacing: .12em; color: #777; margin: 0;"
}
$ops = @($defs.GetEnumerator() | ForEach-Object { @{ action = 'create'; label = $_.Key; css = $_.Value } })
$o = & (Join-Path $t 'mcp.ps1') -Server elementor -Tool elementor-manage-classes -ArgsJson (@{ operations = @($ops) } | ConvertTo-Json -Depth 5 -Compress) -Max 40000
try { $r = $o | ConvertFrom-Json } catch { "ERRORE: $o"; return }
"classi create: $(@($r.results | Where-Object status -eq 'ok').Count)/$($ops.Count)"
$r.results | Where-Object status -ne 'ok' | ForEach-Object { "$($_.label): $($_.status) $($_.message)" }
