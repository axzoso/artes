# Installa (o aggiorna) il plugin artes-core su dev3 come plugin vero.
#   1. impacchetta wp/artes-core (artes-core.php + artes-core.css) in uno ZIP;
#   2. lo carica con il link di upload di Novamira (i file .php si possono scrivere solo nella
#      sandbox, uno ZIP no: è il canale previsto per i plugin);
#   3. lo installa e attiva con WP-CLI (--force: aggiorna se già presente);
#   4. toglie la vecchia copia nella sandbox di Novamira, se c'è;
#   5. svuota il CSS personalizzato del kit di Elementor (ora il CSS lo carica il plugin);
#   6. verifica che funzioni e svuota le cache.
# Per rilasciare in produzione si carica lo stesso ZIP (tools/out/artes-core.zip) da Plugin → Aggiungi.
$d = $PSScriptRoot
$src = Join-Path $d '..\wp\artes-core'
$out = Join-Path $d 'out'
New-Item -ItemType Directory -Force $out | Out-Null
$mcp = Join-Path $d 'mcp.ps1'
function Ability($name, $params) { & $mcp -Server novamira -Tool mcp-adapter-execute-ability -ArgsJson (@{ ability_name = $name; parameters = $params } | ConvertTo-Json -Depth 8 -Compress) -Max 6000 }
function RunWp($cliArgs) { (Ability 'novamira/run-wp-cli' @{ args = $cliArgs } | ConvertFrom-Json).data }

# 1. pacchetto
$stage = Join-Path $out 'pkg'
Remove-Item $stage -Recurse -Force -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Force (Join-Path $stage 'artes-core') | Out-Null
Copy-Item (Join-Path $src 'artes-core.php'), (Join-Path $src 'artes-core.css') (Join-Path $stage 'artes-core')
$zip = Join-Path $out 'artes-core.zip'
Remove-Item $zip -Force -ErrorAction SilentlyContinue
# ZIP con barre normali nei percorsi: Compress-Archive (PowerShell 7 su Windows) scrive "artes-core\file.php"
# e WordPress lo scompatta in file dal nome sbagliato, rompendo il plugin.
Add-Type -AssemblyName System.IO.Compression, System.IO.Compression.FileSystem
$za = [System.IO.Compression.ZipFile]::Open($zip, 'Create')
foreach ($f in Get-ChildItem (Join-Path $stage 'artes-core') -File) {
  [void][System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($za, $f.FullName, "artes-core/$($f.Name)")
}
$za.Dispose()
"1. pacchetto: $zip ($((Get-Item $zip).Length) byte)"

# 2. upload
$link = (Ability 'novamira/create-upload-link' @{ path = 'wp-content/uploads/artes-core.zip'; overwrite = $true; expires_in = 300 } | ConvertFrom-Json).data
$null = Invoke-WebRequest $link.upload_url -Method Put -Headers @{ $link.token_header = $link.upload_token } -InFile $zip -ContentType 'application/zip' -UseBasicParsing -TimeoutSec 120
"2. caricato su dev3"

# 3. installazione (senza attivare: prima va tolta la vecchia copia della sandbox, che dichiara
#    le stesse funzioni e farebbe un errore fatale)
$inst = RunWp @('plugin', 'install', 'wp-content/uploads/artes-core.zip', '--force')
"3. wp plugin install: exit $($inst.exit_code) | $(($inst.stdout -split "`n" | Where-Object { $_ } | Select-Object -Last 2) -join ' / ')"
if ($inst.exit_code -ne 0) { "ERRORE: $($inst.stderr)"; return }
# 4. vecchia copia nella sandbox (se presente): va tolta prima di attivare il plugin
$del = Ability 'novamira/delete-file' @{ path = 'wp-content/novamira-sandbox/artes-core.php' }
"4. copia sandbox: " + $(if ($del -match '"success":true') { 'rimossa' } else { 'non presente o non rimossa' })
$act = RunWp @('plugin', 'activate', 'artes-core')
"   attivazione: exit $($act.exit_code) | $(($act.stdout -split "`n" | Where-Object { $_ } | Select-Object -Last 1)) $($act.stderr)"
if ($act.exit_code -ne 0) { return }
# 5-6. kit, cache, verifica
$chk = Join-Path $out 'verify-plugin.php'
@'
$kid = (int) get_option('elementor_active_kit');
$m = get_post_meta($kid, '_elementor_page_settings', true);
if (is_array($m) && !empty($m['custom_css'])) { $m['custom_css'] = ''; update_post_meta($kid, '_elementor_page_settings', $m); $kit = 'CSS del kit svuotato'; } else { $kit = 'CSS del kit già vuoto'; }
\Elementor\Plugin::$instance->files_manager->clear_cache();
wp_cache_flush();
$r = new ReflectionFunction('artes_current_post_id');
return [
  'plugin_attivo' => is_plugin_active('artes-core/artes-core.php'),
  'versione' => defined('ARTES_CORE_VERSION') ? ARTES_CORE_VERSION : null,
  'file_funzione' => str_replace(ABSPATH, '', $r->getFileName()),
  'shortcode' => array_map('shortcode_exists', ['artes_lingue', 'artes_titolo', 'artes_settore_ambito']),
  'css_nel_plugin' => file_exists(WP_PLUGIN_DIR . '/artes-core/artes-core.css'),
  'kit' => $kit,
];
'@ | Set-Content $chk -Encoding utf8
"5-6. verifica: " + (& (Join-Path $d 'php.ps1') -File $chk -Max 1500)

# pulizia dello ZIP caricato
$null = Ability 'novamira/delete-file' @{ path = 'wp-content/uploads/artes-core.zip' }
"zip rimosso da dev3"
