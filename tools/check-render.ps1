param([string[]]$Slugs = @('boutique-hotel-aurea', 'arpacal', 'resort-capo-bianco'), [string]$Base = 'https://dev3.minimalstudiodev.it/realizzazioni/')
# Scarica le schede renderizzate e riassume cosa mostrano (nessun render grafico: solo struttura e contenuti).
foreach ($s in $Slugs) {
  try { $h = (Invoke-WebRequest ($Base + $s + '/') -UseBasicParsing -TimeoutSec 60).Content } catch { "$s -> ERRORE $($_.Exception.Message)"; continue }
  $m = [regex]::Match($h, '(?s)<div[^>]*data-elementor-type="single".*?(?=<footer|<div id="wpml|</body>)')
  $t = if ($m.Success) { $m.Value } else { $h }
  $t = [regex]::Replace($t, '(?s)<script.*?</script>', '')
  "=== $s (len $($t.Length))"
  $h1 = [regex]::Match($t, '<h1[^>]*>(.*?)</h1>').Groups[1].Value
  "h1: $h1"
  $eb = [regex]::Matches($t, 'class="eyebrow-inline[^"]*"[^>]*>(.*?)</p>') | ForEach-Object { $_.Groups[1].Value.Trim() }
  "eyebrow: $($eb -join '')"
  $imgs = [regex]::Matches($t, '<img[^>]*gallery-img[^>]*>')
  $withSrc = ($imgs | Where-Object { $_.Value -match 'src="https?://' }).Count
  "galleria: $($imgs.Count) immagini, $withSrc con src"
  $specs = [regex]::Matches($t, '(?s)class="spec-l[^"]*"[^>]*>(.*?)</p>\s*<p[^>]*class="spec-v[^"]*"[^>]*>(.*?)</p>')
  "righe specifiche: $($specs.Count)"
  foreach ($x in $specs) { $v = ($x.Groups[2].Value -replace '\s+', ' ').Trim(); "  - $($x.Groups[1].Value.Trim()): " + $(if ($v) { $v } else { '(vuoto -> nascosto da CSS)' }) }
  $chips = [regex]::Matches($t, 'class="[^"]*brand-chip[^"]*"[^>]*>(.*?)</') | ForEach-Object { ($_.Groups[1].Value -replace '<[^>]+>', '').Trim() }
  "brand: $($chips.Count) -> $($chips -join ', ')"
  $altre = [regex]::Matches($t, 'class="[^"]*correlate-name[^"]*"[^>]*>\s*(?:<a[^>]*>)?\s*([^<]*)') | ForEach-Object { $_.Groups[1].Value.Trim() }
  "altre realizzazioni: $($altre.Count) -> $($altre -join ' | ')"
}

