# Classi globali della home (hero, metodo, mosaico dei settori, produzione, brand, doppia CTA).
# Valori del mockup dopo il restyling del 2026-09-30. Uso: powershell tools/setup/classi-home.ps1
$t = Split-Path $PSScriptRoot -Parent
$mono = 'font-family: var(--font-mono); text-transform: uppercase;'
$grad = 'linear-gradient(180deg, rgba(20,20,19,.05) 0%, rgba(20,20,19,.62) 100%)'
$defs = [ordered]@{
  # hero
  'hero'            = 'position: relative; display: flex; flex-direction: column; min-height: clamp(620px, 56vw, 760px); background-color: var(--night); overflow: hidden; padding: 0; gap: 0;'
  'hero-scrim'      = 'position: absolute; inset: 0; padding: 0; background-image: linear-gradient(90deg, rgba(12,12,11,.88) 0%, rgba(12,12,11,.45) 55%, rgba(12,12,11,.15) 100%);'
  'hero-inner'      = 'position: relative; flex: 1 1 auto; display: flex; flex-direction: column; justify-content: center; max-width: 1180px; padding: 72px var(--pad) 40px; gap: 0;'
  'hero-kicker'     = 'display: flex; align-items: center; gap: 14px; margin-bottom: 34px; padding: 0; width: auto;'
  'hero-rule'       = 'width: 44px; min-width: 0; height: 1px; flex: 0 0 44px; padding: 0; background-color: var(--accent);'
  'hero-kicker-lbl' = "$mono font-size: 11.5px; letter-spacing: .18em; color: rgba(255,255,255,.7); margin: 0;"
  'hero-title'      = 'font-family: var(--font-display); font-weight: 400; font-size: clamp(52px, 8vw, 114.5px); line-height: .94; letter-spacing: -.035em; color: #fff; text-wrap: pretty; margin: 0;'
  'hero-lead'       = 'margin: 32px 0 0; max-width: 560px; font-size: clamp(17px, 1.4vw, 20px); line-height: 1.55; color: rgba(255,255,255,.72); text-wrap: pretty;'
  'hero-actions'    = 'display: flex; flex-wrap: wrap; gap: 12px; margin: 44px 0 40px; padding: 0; width: auto;'
  'hero-stats'      = 'position: relative; display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 0; padding: 0; border-top: 1px solid rgba(255,255,255,.14); @media(--tablet) { grid-template-columns: repeat(2, minmax(0, 1fr)); }'
  'stat'            = 'display: block; padding: 22px var(--pad); border-right: 1px solid rgba(255,255,255,.14); gap: 0; @media(--tablet) { padding-block: 18px; }'
  'stat-k'          = 'font-family: var(--font-display); font-size: 28.5px; font-weight: 500; letter-spacing: -.02em; color: #fff; margin: 0;'
  'stat-v'          = "$mono font-size: 11px; letter-spacing: .14em; color: rgba(255,255,255,.5); margin: 6px 0 0;"
  # metodo
  'metodo-grid'     = 'display: grid; grid-template-columns: 340px minmax(0, 1fr); gap: 80px; align-items: start; padding: 120px var(--pad); @media(--tablet) { grid-template-columns: minmax(0, 1fr); gap: 48px; padding: 72px var(--pad); }'
  'metodo-intro'    = 'padding: 0; gap: 0; align-items: flex-start;'
  'fasi-grid'       = 'display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: clamp(18px, 2vw, 34px); padding: 0; @media(--tablet) { grid-template-columns: repeat(2, minmax(0, 1fr)); } @media(--mobile) { grid-template-columns: minmax(0, 1fr); }'
  'fase'            = 'display: flex; flex-direction: column; min-height: 196px; padding: 30px clamp(12px, 1.5vw, 24px) 34px 0; gap: 0;'
  'fase-t'          = 'font-family: var(--font-display); font-size: 22px; font-weight: 500; letter-spacing: -.015em; margin: 0 0 10px;'
  'fase-d'          = 'font-size: 14.5px; line-height: 1.55; color: var(--muted-3); margin: 0;'
  'fase-dark'       = 'display: flex; flex-direction: column; justify-content: space-between; min-height: 196px; padding: 30px 24px; background-color: #111; gap: 0;'
  'fase-dark-n'     = "$mono font-size: 11.5px; color: rgba(255,255,255,.45); margin: 0;"
  'fase-dark-t'     = 'font-family: var(--font-display); font-size: 22px; font-weight: 500; letter-spacing: -.015em; color: #fff; margin: 0;'
  'fase-dark-l'     = "$mono font-size: 11px; letter-spacing: .13em; color: rgba(255,255,255,.45); margin: 12px 0 0;"
  # mosaico settori
  'tiles-grid'      = 'display: grid; grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr) minmax(0, 1fr); grid-template-rows: 300px 300px; gap: 12px; padding: 0; @media(--tablet) { grid-template-columns: repeat(2, minmax(0, 1fr)); grid-template-rows: none; grid-auto-rows: 280px; } @media(--mobile) { grid-template-columns: minmax(0, 1fr); }'
  'tile'            = 'position: relative; display: block; min-width: 0; min-height: 0; padding: 0; overflow: hidden; gap: 0;'
  'tile-tall'       = 'grid-row: span 2; @media(--tablet) { grid-row: auto; }'
  'tile-scrim'      = "position: absolute; inset: 0; padding: 0; background-image: $grad;"
  'tile-body'       = 'position: relative; display: flex; flex-direction: column; justify-content: flex-end; height: 100%; padding: 26px; gap: 0; pointer-events: none;'
  'tile-t'          = 'font-family: var(--font-display); font-size: clamp(24px, 2.3vw, 33px); font-weight: 500; letter-spacing: -.02em; color: #fff; margin: 0;'
  'tile-d'          = 'font-size: 14px; line-height: 1.5; color: rgba(255,255,255,.72); max-width: 340px; margin: 10px 0 0;'
  # produzione
  'lavorazioni-grid' = 'display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 18px 24px; margin: 0 0 38px; padding: 0; @media(--mobile) { grid-template-columns: minmax(0, 1fr); }'
  'lavorazione'     = 'display: block; padding: 24px 24px 24px 0; gap: 0;'
  'lavorazione-t'   = 'font-family: var(--font-display); font-size: 20px; font-weight: 500; letter-spacing: -.015em; margin: 0;'
  'lavorazione-d'   = 'font-size: 14px; line-height: 1.5; color: var(--muted-3); margin: 8px 0 0;'
  # brand partner (fascia scura)
  'brands-sezione'  = 'background-color: #111; padding: 112px var(--pad) 116px; gap: 0; @media(--tablet) { padding: 72px var(--pad); }'
  'brands-testa'    = 'display: flex; justify-content: space-between; align-items: baseline; flex-wrap: wrap; gap: 20px; margin-bottom: 44px; padding: 0;'
  'brands-testa-l'  = 'display: flex; align-items: baseline; flex-wrap: wrap; gap: 8px 22px; padding: 0; width: auto;'
  'brands-eyebrow'  = "$mono font-size: 12px; letter-spacing: .16em; color: var(--sand-ink); margin: 0;"
  'brands-lead'     = 'font-size: 16px; color: var(--sand-muted); max-width: 520px; margin: 0;'
  'brands-grid'     = 'display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 12px 28px; padding: 0; @media(--tablet) { grid-template-columns: repeat(3, minmax(0, 1fr)); } @media(--mobile) { grid-template-columns: repeat(2, minmax(0, 1fr)); }'
  'brand-item'      = 'display: flex; flex-direction: column; align-items: flex-start; gap: 8px; min-height: 92px; padding: 14px 0 0; border-top: 1px solid rgba(255,255,255,.18);'
  'brand-item-n'    = 'font-family: var(--font-display); font-size: 18.5px; font-weight: 500; letter-spacing: .04em; color: #fff; margin: 0;'
  'brand-item-c'    = "$mono font-size: 10px; letter-spacing: .12em; color: #aaa; margin: 0;"
  # doppia CTA
  'cta-duo'         = 'display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0; padding: 0; @media(--tablet) { grid-template-columns: minmax(0, 1fr); }'
  'cta-panel'       = 'display: flex; flex-direction: column; justify-content: space-between; align-items: flex-start; min-height: 420px; gap: 44px;'
  'cta-panel-dark'  = 'background-color: var(--graphite); padding: 96px 60px 96px var(--pad); @media(--tablet) { padding: 64px var(--pad); min-height: 0; }'
  'cta-panel-red'   = 'background-color: var(--accent); padding: 96px var(--pad) 96px 60px; @media(--tablet) { padding: 64px var(--pad); min-height: 0; }'
  'cta-panel-top'   = 'padding: 0; gap: 0;'
  'cta-panel-lbl'   = "$mono font-size: 11px; letter-spacing: .16em; margin: 0 0 22px;"
  'cta-panel-h2'    = 'font-family: var(--font-display); font-weight: 400; font-size: clamp(30px, 3.2vw, 44px); line-height: 1.06; letter-spacing: -.03em; color: #fff; margin: 0;'
  'cta-panel-p'     = 'font-size: 16.5px; line-height: 1.6; margin: 22px 0 0; max-width: 420px;'
}
$ops = @($defs.GetEnumerator() | ForEach-Object { @{ action = 'create'; label = $_.Key; css = $_.Value } })
$ok = 0
# il connettore accetta al massimo 50 operazioni per chiamata
for ($n = 0; $n -lt $ops.Count; $n += 25) {
  $chunk = $ops[$n..([Math]::Min($n + 24, $ops.Count - 1))]
  $o = & (Join-Path $t 'mcp.ps1') -Server elementor -Tool elementor-manage-classes -ArgsJson (@{ operations = @($chunk) } | ConvertTo-Json -Depth 5 -Compress) -Max 40000
  try { $r = $o | ConvertFrom-Json } catch { "ERRORE: $o"; continue }
  $ok += @($r.results | Where-Object status -eq 'ok').Count
  $r.results | Where-Object status -ne 'ok' | ForEach-Object { "$($_.label): $($_.status) $($_.message)" }
}
"classi create: $ok/$($ops.Count)"