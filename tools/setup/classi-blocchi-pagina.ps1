# Classi globali dei blocchi di pagina (fascia immagine, schede, settore con ambiti, sezioni testo+immagine,
# riquadro specifiche, elenchi). Valori del mockup dopo il restyling del 2026-09-30.
# Uso: powershell tools/setup/classi-blocchi-pagina.ps1   (crea quelle mancanti, aggiorna le esistenti)
$t = Split-Path $PSScriptRoot -Parent
$mono = 'font-family: var(--font-mono); text-transform: uppercase;'
$defs = [ordered]@{
  # fascia immagine a tutta larghezza sotto l'intestazione
  'page-band'      = 'position: relative; width: calc(100% - 2 * var(--pad)); margin: 0 var(--pad) 96px; height: clamp(360px, 48vw, 680px); padding: 0; overflow: hidden;'
  'fill-img'       = 'display: block; width: 100%; height: 100%; object-fit: cover;'
  'lead-head'      = 'max-width: 400px; margin: 0;'
  # schede (ex .grid-1px + .card)
  'cards-grid'     = 'display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: clamp(18px, 2vw, 34px); padding: 0; @media(--tablet) { grid-template-columns: repeat(2, minmax(0, 1fr)); } @media(--mobile) { grid-template-columns: minmax(0, 1fr); }'
  'cards-grid-2'   = 'display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: clamp(18px, 2vw, 34px); padding: 0; @media(--mobile) { grid-template-columns: minmax(0, 1fr); }'
  'cards-grid-4'   = 'display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: clamp(18px, 2vw, 34px); padding: 0; @media(--tablet) { grid-template-columns: repeat(2, minmax(0, 1fr)); } @media(--mobile) { grid-template-columns: minmax(0, 1fr); }'
  'card'           = 'display: block; padding: 34px clamp(12px, 1.5vw, 24px) 38px 0; gap: 0;'
  'card-dark'      = 'display: block; padding: 34px 24px 38px; background-color: #111; gap: 0;'
  'card-n'         = "$mono font-size: 11.5px; letter-spacing: .12em; color: var(--accent); margin: 0;"
  'card-t'         = 'font-family: var(--font-display); font-size: 23px; font-weight: 500; letter-spacing: -.015em; margin: 14px 0 0;'
  'card-d'         = 'font-size: 15px; line-height: 1.6; color: var(--muted-2); margin: 12px 0 0;'
  'card-dark-t'    = 'color: #fff;'
  'card-dark-d'    = 'color: rgba(255,255,255,.62);'
  'card-dark-n'    = 'color: rgba(255,255,255,.45);'
  # blocco settore: testo + immagine con inserto
  'settore-blocco' = 'display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: clamp(36px, 6vw, 92px); padding: 0 0 clamp(72px, 8vw, 120px); @media(--tablet) { grid-template-columns: minmax(0, 1fr); gap: 0; padding-bottom: 0; }'
  'settore-testo'  = 'padding: 96px var(--pad); gap: 0; @media(--tablet) { padding: 56px var(--pad); }'
  'settore-flip-testo' = 'order: 2; @media(--tablet) { order: 0; }'
  'settore-media'  = 'position: relative; min-height: 640px; padding: 0; overflow: hidden; @media(--tablet) { min-height: 360px; } @media(--mobile) { min-height: 260px; }'
  'settore-flip-media' = 'order: 1; @media(--tablet) { order: 0; }'
  'settore-inset'  = 'position: absolute; top: 0; right: 0; width: 42%; height: 42%; padding: 0; overflow: hidden; @media(--tablet) { display: none; }'
  'settore-inset-flip' = 'right: auto; left: 0;'
  'abs-fill'       = 'position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; display: block;'
  'ambiti-lista'   = 'display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0 36px; margin-top: 34px; padding: 0; @media(--mobile) { grid-template-columns: minmax(0, 1fr); }'
  'ambito-voce'    = 'font-size: 15px; line-height: 1.4; color: var(--muted-1); padding: 11px 0; border-bottom: 1px solid #ececec; margin: 0;'
  'settore-links'  = 'display: flex; flex-wrap: wrap; gap: 28px; margin-top: 34px; padding: 0;'
  'section-more'   = 'margin-top: 44px; padding: 0;'
  # elenco a filetti dentro le schede
  'card-list-item' = 'font-size: 15px; line-height: 1.5; color: var(--muted-1); padding: 11px 0; border-bottom: 1px solid var(--line-soft); margin: 0;'
}
$ops = $defs.GetEnumerator() | ForEach-Object { @{ action = 'create'; label = $_.Key; css = $_.Value } }
$o = & (Join-Path $t 'mcp.ps1') -Server elementor -Tool elementor-manage-classes -ArgsJson (@{ operations = @($ops) } | ConvertTo-Json -Depth 5 -Compress) -Max 40000
$r = $o | ConvertFrom-Json
"classi create: $(@($r.results | Where-Object status -eq 'ok').Count)/$(@($r.results).Count)"
$r.results | Where-Object status -ne 'ok' | ForEach-Object { "$($_.label): $($_.status) $($_.message)" }
