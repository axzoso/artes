param([Parameter(Mandatory)][string]$ListFile)
# Porta nella libreria multimediale di dev3 le immagini del mockup elencate in un file JSON
# [{ "src": "assets/img/...", "alt": "..." }, ...] (percorsi relativi alla radice del mockup) e
# aggiorna tools/out/media-map.json (src -> ID allegato). Le scarica da GitHub Pages (devono
# essere pubblicate), le riconosce se già importate (meta _artes_src), imposta alt e lingua `it`.
# Lavora a lotti di 4 immagini per restare nel limite di 30 secondi di una chiamata PHP.
$d = $PSScriptRoot
New-Item -ItemType Directory -Force (Join-Path $d 'out') | Out-Null
$mapFile = Join-Path $d 'out\media-map.json'
$map = @{}
if (Test-Path $mapFile) { (Get-Content $mapFile -Raw -Encoding utf8 | ConvertFrom-Json).PSObject.Properties | ForEach-Object { $map[$_.Name] = [int]$_.Value } }
$items = @(Get-Content $ListFile -Raw -Encoding utf8 | ConvertFrom-Json)
$seen = @{}; $todo = @()
foreach ($i in $items) { if (-not $seen.ContainsKey($i.src)) { $seen[$i.src] = $true; $todo += $i } }
for ($n = 0; $n -lt $todo.Count; $n += 4) {
  $batch = $todo[$n..([Math]::Min($n + 3, $todo.Count - 1))]
  $json = $batch | ConvertTo-Json -Depth 4 -Compress
  if ($batch.Count -eq 1) { $json = "[$json]" }
  $php = @"
require_once ABSPATH . 'wp-admin/includes/media.php';
require_once ABSPATH . 'wp-admin/includes/file.php';
require_once ABSPATH . 'wp-admin/includes/image.php';
`$items = json_decode(<<<'JSON'
$json
JSON
, true);
`$out = [];
foreach (`$items as `$it) {
  `$found = get_posts(['post_type'=>'attachment','post_status'=>'any','numberposts'=>1,'fields'=>'ids','suppress_filters'=>true,'meta_key'=>'_artes_src','meta_value'=>`$it['src']]);
  if (`$found) { `$id = `$found[0]; }
  else {
    `$id = media_sideload_image('https://axzoso.github.io/artes/' . `$it['src'], 0, `$it['alt'], 'id');
    if (is_wp_error(`$id)) { `$out[`$it['src']] = 'ERRORE: ' . `$id->get_error_message(); continue; }
    update_post_meta(`$id, '_artes_src', `$it['src']);
  }
  if (!empty(`$it['alt'])) { update_post_meta(`$id, '_wp_attachment_image_alt', `$it['alt']); wp_update_post(['ID'=>`$id, 'post_title'=>`$it['alt']]); }
  `$d = apply_filters('wpml_post_language_details', null, `$id);
  if (empty(`$d['language_code'])) { do_action('wpml_set_element_language_details', ['element_id'=>`$id,'element_type'=>'post_attachment','trid'=>false,'language_code'=>'it','source_language_code'=>null]); }
  `$out[`$it['src']] = `$id;
}
return `$out;
"@
  $f = Join-Path $d 'out\imp-immagini.php'
  Set-Content $f $php -Encoding utf8
  $r = (& (Join-Path $d 'php.ps1') -File $f -Max 3000 | ConvertFrom-Json).data.return_value
  foreach ($p in $r.PSObject.Properties) { if ("$($p.Value)" -match '^\d+$') { $map[$p.Name] = [int]$p.Value } else { "  $($p.Name): $($p.Value)" } }
}
$map | ConvertTo-Json | Set-Content $mapFile -Encoding utf8
"immagini nella mappa: $($map.Count) (richieste: $($todo.Count))"
