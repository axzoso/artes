# Classi globali delle pagine di testo (privacy, cookie, cataloghi): colonna di lettura, titoli, paragrafi, elenchi.
# Uso: powershell tools/setup/classi-legale.ps1   (crea quelle mancanti)
$t = Split-Path $PSScriptRoot -Parent
$defs = [ordered]@{
  'legale'     = 'display: block; padding: 24px var(--pad) 110px; gap: 0; @media(--tablet) { padding-bottom: 72px; }'
  'legale-col' = 'display: block; max-width: 820px; padding: 0; gap: 0;'
  'legale-h'   = 'font-family: var(--font-display); font-size: 24px; font-weight: 500; letter-spacing: -.015em; line-height: 1.2; color: #111; margin: 52px 0 14px;'
  'legale-p'   = 'font-size: 16px; line-height: 1.7; color: var(--muted-2); margin: 0 0 14px;'
  'legale-li'  = 'position: relative; padding-left: 24px; margin-bottom: 8px; &::before { content: "—"; position: absolute; left: 0; color: #777; }'
}
$ops = @($defs.GetEnumerator() | ForEach-Object { @{ action = 'create'; label = $_.Key; css = $_.Value } })
$o = & (Join-Path $t 'mcp.ps1') -Server elementor -Tool elementor-manage-classes -ArgsJson (@{ operations = @($ops) } | ConvertTo-Json -Depth 5 -Compress) -Max 40000
try { $r = $o | ConvertFrom-Json } catch { "ERRORE: $o"; return }
"classi create: $(@($r.results | Where-Object status -eq 'ok').Count)/$($ops.Count)"
$r.results | Where-Object status -ne 'ok' | ForEach-Object { "$($_.label): $($_.status) $($_.message)" }
