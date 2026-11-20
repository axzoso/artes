param([switch]$SoloFile)
# Mette "in riserva" i moduli di contatto che la rev2 non prevede, così si possono reinserire in futuro:
#   1. esporta da dev3 le tre sezioni che contengono il modulo (pagina Contatti 152, pagina Richiedi un preventivo
#      154, template Singolo Realizzazione 138) in tools/riserva-moduli/*.sezione.json (versionati);
#   2. le salva come template "Container" nella libreria di Elementor (Modelli > Salvati), con il prefisso
#      "[Riserva]": nell'editor basta "Inserisci modello". Si possono rilanciare: aggiornano i template esistenti.
# Uso: powershell tools/riserva-moduli.ps1 [-SoloFile]   (con -SoloFile esporta soltanto i file, senza toccare dev3)
$d = $PSScriptRoot
$dest = Join-Path $d 'riserva-moduli'
New-Item -ItemType Directory -Force $dest | Out-Null

function Run-Php([string]$name, [string]$code) {
  $f = Join-Path $env:TEMP "riserva-$name.php"; Set-Content $f $code -Encoding utf8
  $raw = & (Join-Path $d 'php.ps1') -File $f -Max 50000000
  $j = $raw | ConvertFrom-Json
  if (-not $j.data.success) { throw "php $name fallito: $($raw.Substring(0, [Math]::Min(500, $raw.Length)))" }
  return $j.data.return_value
}

# 1. esportazione dei tre blocchi che contengono un e-form
$r = Run-Php 'export' @'
$has = function ($n) use (&$has) { if (($n['elType'] ?? '') === 'e-form' || ($n['widgetType'] ?? '') === 'e-form') { return true; } foreach (($n['elements'] ?? []) as $c) { if ($has($c)) { return true; } } return false; };
$get = function ($id) use ($has) { $data = json_decode(get_post_meta($id, '_elementor_data', true), true); foreach ((array) $data as $n) { if ($has($n)) { return wp_json_encode($n, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES); } } return null; };
return ['contatti' => $get(152), 'preventivo' => $get(154), 'scheda' => $get(138)];
'@
$nomi = [ordered]@{
  contatti    = @{ file = 'modulo-contatti.sezione.json';              titolo = '[Riserva] Modulo contatti (sezione completa)' }
  preventivo  = @{ file = 'modulo-preventivo.sezione.json';            titolo = '[Riserva] Modulo richiesta preventivo (sezione completa)' }
  scheda      = @{ file = 'modulo-scheda-realizzazione.sezione.json';  titolo = '[Riserva] Modulo in coda alla scheda realizzazione (sezione completa)' }
}
foreach ($k in $nomi.Keys) {
  $json = [string]$r.$k
  if (-not $json) { throw "sezione '$k' non trovata" }
  [IO.File]::WriteAllText((Join-Path $dest $nomi[$k].file), $json, (New-Object Text.UTF8Encoding($false)))
  "{0,-12} {1,8:N0} caratteri -> riserva-moduli/{2}" -f $k, $json.Length, $nomi[$k].file
}
if ($SoloFile) { return }

# 2. template nella libreria di Elementor (tipo Container)
$def = @()
foreach ($k in $nomi.Keys) { $b64 = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes([string]$r.$k)); $t = $nomi[$k].titolo.Replace("'", "\'"); $def += "['$t', '$b64']" }
$out = Run-Php 'salva' @"
`$def = [$($def -join ', ')];
`$res = [];
foreach (`$def as `$x) {
  `$data = base64_decode(`$x[1]);
  `$ex = get_posts(['post_type' => 'elementor_library', 'title' => `$x[0], 'post_status' => 'any', 'numberposts' => 1, 'suppress_filters' => true]);
  `$id = `$ex ? `$ex[0]->ID : wp_insert_post(['post_type' => 'elementor_library', 'post_title' => `$x[0], 'post_status' => 'publish'], true);
  if (is_wp_error(`$id)) { `$res[] = `$id->get_error_message(); continue; }
  update_post_meta(`$id, '_elementor_data', wp_slash('[' . `$data . ']'));
  update_post_meta(`$id, '_elementor_template_type', 'container');
  update_post_meta(`$id, '_elementor_edit_mode', 'builder');
  update_post_meta(`$id, '_elementor_version', ELEMENTOR_VERSION);
  wp_set_object_terms(`$id, 'container', 'elementor_library_type');
  `$res[] = `$id . ' ' . `$x[0] . ' (' . strlen(`$data) . ' caratteri)';
}
return `$res;
"@
$out | ForEach-Object { "template: $_" }
