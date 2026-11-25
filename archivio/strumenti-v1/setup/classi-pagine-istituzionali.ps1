# Classi globali per le pagine istituzionali (processo a fasi, materiali, specifiche, varianti delle schede).
# Uso: powershell tools/setup/classi-pagine-istituzionali.ps1
$t = Split-Path $PSScriptRoot -Parent
$mono = 'font-family: var(--font-mono); text-transform: uppercase;'
$defs = [ordered]@{
  'section-tight'   = 'padding-top: 0;'
  'card-lg'         = 'padding: 44px 40px 48px 0;'
  'card-span2'      = 'grid-column: span 2; @media(--mobile) { grid-column: auto; }'
  'lead-flush'      = 'margin: 0 0 26px;'
  # processo: righe a tre colonne (titolo, descrizione, output)
  'fasi-lista'      = 'padding: 0; gap: 0; width: 100%;'
  'fase-row'        = 'display: grid; grid-template-columns: 230px minmax(0, 1fr) 230px; gap: 32px; align-items: start; padding: 30px 0; border-bottom: 1px solid var(--line-soft); @media(--tablet) { grid-template-columns: minmax(0, 1fr); gap: 14px; }'
  'fase-row-t'      = 'font-family: var(--font-display); font-size: 24px; font-weight: 500; letter-spacing: -.02em; margin: 0;'
  'fase-row-d'      = 'font-size: 16px; line-height: 1.6; color: var(--muted-2); margin: 0;'
  'fase-row-out'    = 'padding: 0; gap: 0; text-align: right; @media(--tablet) { text-align: left; }'
  'fase-out-dt'     = "$mono font-size: 10.5px; letter-spacing: .12em; color: var(--muted-4); margin: 14px 0 0;"
  'fase-out-dd'     = 'font-size: 14.5px; line-height: 1.5; color: var(--ink); margin: 5px 0 0;'
  # campioni di materiali
  'materiali-grid'  = 'display: grid; grid-template-columns: repeat(8, minmax(0, 1fr)); gap: 14px; padding: 0; @media(--tablet) { grid-template-columns: repeat(4, minmax(0, 1fr)); } @media(--mobile) { grid-template-columns: repeat(2, minmax(0, 1fr)); }'
  'materiale'       = 'padding: 0; gap: 0;'
  'materiale-sw'    = 'height: 96px; padding: 0; min-width: 0;'
  'materiale-n'     = 'font-size: 14.5px; margin: 10px 0 0;'
  'materiale-c'     = "$mono font-size: 10.5px; letter-spacing: .1em; color: var(--muted-4); margin: 3px 0 0;"
  # colonna destra delle specifiche
  'finiture-panel'  = 'padding: 80px var(--pad) 80px 60px; gap: 0; @media(--tablet) { padding: 48px var(--pad); }'
  'eyebrow-spaced'  = 'margin-bottom: 30px;'
}
$ops = @($defs.GetEnumerator() | ForEach-Object { @{ action = 'create'; label = $_.Key; css = $_.Value } })
$r = (& (Join-Path $t 'mcp.ps1') -Server elementor -Tool elementor-manage-classes -ArgsJson (@{ operations = $ops } | ConvertTo-Json -Depth 5 -Compress) -Max 40000) | ConvertFrom-Json
"classi create: $(@($r.results | Where-Object status -eq 'ok').Count)/$($ops.Count)"
$r.results | Where-Object status -ne 'ok' | ForEach-Object { "$($_.label): $($_.status) $($_.message)" }
