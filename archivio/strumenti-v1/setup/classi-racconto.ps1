# Classi globali del blocco "racconto" (testo discorsivo delle pagine settore): frase d'apertura a tutta larghezza
# e righe titolo / paragrafo. Valori della sezione 17 di assets/css/artes.css.
# Uso: powershell tools/setup/classi-racconto.ps1   (crea quelle mancanti)
$t = Split-Path $PSScriptRoot -Parent
$defs = [ordered]@{
  'racconto'      = 'display: block; padding: 20px var(--pad) 110px; gap: 0; @media(--tablet) { padding-bottom: 72px; }'
  'racconto-head' = 'display: block; max-width: 1080px; padding: 0; margin-bottom: 72px; gap: 0; @media(--tablet) { margin-bottom: 44px; }'
  'racconto-lead' = 'font-family: var(--font-display); font-size: clamp(28px, 3.6vw, 52px); line-height: 1.12; letter-spacing: -.03em; font-weight: 400; color: #111; margin: 22px 0 0; & strong { font-weight: 600; }'
  'racconto-row'  = 'display: grid; grid-template-columns: minmax(0, 4fr) minmax(0, 7fr); gap: 20px clamp(40px, 7vw, 120px); padding: 40px 0 44px; border-top: 1px solid var(--line); &:last-child { border-bottom: 1px solid var(--line); } @media(--tablet) { grid-template-columns: minmax(0, 1fr); padding: 30px 0 34px; }'
  'racconto-h'    = 'font-family: var(--font-display); font-size: clamp(21px, 1.8vw, 26px); font-weight: 500; letter-spacing: -.015em; line-height: 1.2; margin: 0;'
  'racconto-p'    = 'font-size: 18px; line-height: 1.75; color: var(--muted-2); max-width: 64ch; margin: 0; @media(--mobile) { font-size: 16.5px; line-height: 1.7; }'
}
$ops = @($defs.GetEnumerator() | ForEach-Object { @{ action = 'create'; label = $_.Key; css = $_.Value } })
$o = & (Join-Path $t 'mcp.ps1') -Server elementor -Tool elementor-manage-classes -ArgsJson (@{ operations = @($ops) } | ConvertTo-Json -Depth 5 -Compress) -Max 40000
try { $r = $o | ConvertFrom-Json } catch { "ERRORE: $o"; return }
"classi create: $(@($r.results | Where-Object status -eq 'ok').Count)/$($ops.Count)"
$r.results | Where-Object status -ne 'ok' | ForEach-Object { "$($_.label): $($_.status) $($_.message)" }
