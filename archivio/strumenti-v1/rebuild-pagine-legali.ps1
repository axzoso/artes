param([string[]]$Only = @())
# Costruisce le pagine di testo (cataloghi, privacy policy, cookie policy) da tools/contenuti-pagine-legali.json:
# intestazione + colonna di lettura (titoli, paragrafi, elenchi) + eventuale fascia finale. Poi impostazioni
# (tutta larghezza), pubblicazione e cache. -Only privacy-policy per limitare.
# Nel testo si possono usare <a href="/percorso/"> e <br>; una riga che inizia con "- " diventa una voce di elenco.
$d = $PSScriptRoot
New-Item -ItemType Directory -Force (Join-Path $d 'out') | Out-Null
. "$d\lib-blocchi.ps1"
$pagine = Get-Content "$d\contenuti-pagine-legali.json" -Raw -Encoding utf8 | ConvertFrom-Json

function Block-Testo($Sezioni) {
  $part = New-Part; $col = ''; $i = 0
  foreach ($s in $Sezioni) {
    $i++
    $col += Tg 'e-heading' "T$i H"; $part.cfg["T$i H"] = @{ tag = 'h2'; title = $s.h }; $part.cls["T$i H"] = @('legale-h')
    $j = 0
    foreach ($riga in $s.b) {
      $j++; $k = "T$i R$j"; $col += Tg 'e-paragraph' $k
      if ($riga.StartsWith('- ')) { $part.cfg[$k] = @{ paragraph = $riga.Substring(2) }; $part.cls[$k] = @('legale-p', 'legale-li') }
      else { $part.cfg[$k] = @{ paragraph = $riga }; $part.cls[$k] = @('legale-p') }
    }
  }
  $part.xml = Tg 'e-div-block' 'Testo sezione' (Tg 'e-div-block' 'Testo colonna' $col)
  $part.cls['Testo sezione'] = @('legale'); $part.cls['Testo colonna'] = @('legale-col')
  return $part
}

foreach ($p in $pagine.PSObject.Properties) {
  $k = $p.Name; if ($Only.Count -and ($Only -notcontains $k)) { continue }
  $c = $p.Value; $id = [int]$c.id
  $parts = @((Block-Intro $c.eyebrow $c.h1 $c.lead $c.corrente), (Block-Testo $c.sezioni))
  if ($c.cta) { $parts += Block-Cta $c.cta.titolo @($c.cta.bottoni | ForEach-Object { @{ testo = $_.testo; href = $_.href } }) }
  $comp = Join-Blocks $parts -PostId $id
  $f = "$d\out\comp-legale-$k.json"
  $comp | ConvertTo-Json -Depth 30 | Set-Content $f -Encoding utf8
  $null = & "$d\mcp.ps1" -Server elementor -Tool elementor-update-page-settings -ArgsJson "{`"post_id`":$id,`"settings`":{`"template`":`"elementor_header_footer`"}}" -Max 200
  $r = & "$d\compose.ps1" -File $f -Max 900
  if ($r -notmatch '"success":true') { "$k ($id): COMPOSIZIONE FALLITA: $($r.Substring(0, [Math]::Min(700, $r.Length)))"; continue }
  if ($r -match '"warnings"') { "$k avvisi: " + ([regex]::Match($r, '"warnings".{0,600}').Value) }
  $null = & "$d\mcp.ps1" -Server elementor -Tool elementor-publish-document -ArgsJson "{`"post_id`":$id}" -Max 100
  "$k -> pagina $id costruita e pubblicata"
}
$null = & "$d\php.ps1" -File "$d\flush.php" -Max 100
"cache svuotata"
