param([string]$Out = '')
# Snapshot di dev3 in JSON (sola lettura): kit di Elementor (variabili, ordine delle classi), 209+ classi globali,
# template e pagine con i dati di Elementor, realizzazioni e brand con campi e termini, relazioni, menu, media,
# definizioni di JetEngine e impostazioni principali. Serve da punto di ripristino consultabile e per i confronti
# prima e dopo le modifiche; NON sostituisce un backup completo (database + uploads).
# Uso: powershell tools/snapshot-dev3.ps1 [-Out cartella]     (default: tools/out/backup-AAAA-MM-GG, non versionata)
$d = $PSScriptRoot
if (-not $Out) { $Out = Join-Path $d ("out\backup-" + (Get-Date -Format 'yyyy-MM-dd')) }
New-Item -ItemType Directory -Force $Out | Out-Null
$tmp = Join-Path $env:TEMP 'artes-snapshot'; New-Item -ItemType Directory -Force $tmp | Out-Null

function Run-Php([string]$name, [string]$code) {
  $f = Join-Path $tmp "$name.php"; Set-Content $f $code -Encoding utf8
  $raw = & (Join-Path $d 'php.ps1') -File $f -Max 400000000
  try { $j = $raw | ConvertFrom-Json } catch { throw "chunk ${name}: risposta non valida ($($raw.Substring(0, [Math]::Min(300, $raw.Length))))" }
  if (-not $j.data.success) { throw "chunk ${name} fallito: $($raw.Substring(0, [Math]::Min(600, $raw.Length)))" }
  return $j.data.return_value
}
function Save-Json([string]$name, $data) {
  $p = Join-Path $Out "$name.json"
  ($data | ConvertTo-Json -Depth 80) | Set-Content $p -Encoding utf8
  $len = (Get-Item $p).Length
  $hash = (Get-FileHash $p -Algorithm SHA256).Hash.Substring(0, 12)
  "{0,-22} {1,10:N0} byte  sha256:{2}" -f $name, $len, $hash
}
$meta = @'
global $wpdb;
$metaOf = function ($id) use ($wpdb) { $m = []; foreach ($wpdb->get_results($wpdb->prepare("SELECT meta_key, meta_value FROM {$wpdb->postmeta} WHERE post_id=%d ORDER BY meta_id", $id)) as $x) { $m[$x->meta_key] = $x->meta_value; } return $m; };
'@

# 1. kit e opzioni
Save-Json 'kit' (Run-Php 'kit' ($meta + @'
$kit = (int) get_option('elementor_active_kit');
$opt = [];
foreach (['blogname','blogdescription','permalink_structure','show_on_front','page_on_front','page_for_posts','wp_page_for_privacy_policy','active_plugins','elementor_pro_theme_builder_conditions','elementor_active_kit','blog_public','site_icon','template','stylesheet','elementor_version','elementor_pro_version'] as $o) { $opt[$o] = get_option($o); }
return ['kit_id' => $kit, 'kit_meta' => $metaOf($kit), 'opzioni' => $opt];
'@))
# 2. classi globali (un articolo "e_global_class" per classe)
Save-Json 'classi-globali' (Run-Php 'classi' ($meta + @'
$rows = $wpdb->get_results("SELECT ID, post_name, post_title, post_status, post_content, post_excerpt, menu_order FROM {$wpdb->posts} WHERE post_type='e_global_class' ORDER BY ID");
$out = []; foreach ($rows as $r) { $out[] = ['post' => $r, 'meta' => $metaOf($r->ID)]; }
return $out;
'@))
# 3. template (header, footer, singoli, archivi)
Save-Json 'template' (Run-Php 'template' ($meta + @'
$rows = $wpdb->get_results("SELECT ID, post_title, post_name, post_status, post_type, post_modified FROM {$wpdb->posts} WHERE post_type='elementor_library' AND post_status <> 'trash' ORDER BY ID");
$out = []; foreach ($rows as $r) { $out[] = ['post' => $r, 'meta' => $metaOf($r->ID)]; }
return $out;
'@))
# 4. pagine (a gruppi di 5, per restare nei tempi della chiamata)
$ids = @((Run-Php 'idpagine' @'
global $wpdb;
return array_map('intval', $wpdb->get_col("SELECT ID FROM {$wpdb->posts} WHERE post_type='page' AND post_status <> 'trash' AND post_status <> 'auto-draft' ORDER BY ID"));
'@))
$pagine = @()
for ($i = 0; $i -lt $ids.Count; $i += 5) {
  $grp = ($ids[$i..([Math]::Min($i + 4, $ids.Count - 1))]) -join ','
  $pagine += @(Run-Php "pagine$i" ($meta + @"
`$rows = `$wpdb->get_results("SELECT ID, post_title, post_name, post_status, post_parent, menu_order, post_modified FROM {`$wpdb->posts} WHERE ID IN ($grp) ORDER BY ID");
`$out = []; foreach (`$rows as `$r) { `$out[] = ['post' => `$r, 'meta' => `$metaOf(`$r->ID)]; }
return `$out;
"@))
}
Save-Json 'pagine' $pagine
# 5. realizzazioni, brand, termini, relazioni
Save-Json 'cpt-e-termini' (Run-Php 'cpt' ($meta + @'
$out = ['post' => []];
foreach (['realizzazione', 'brand'] as $t) {
  $rows = $wpdb->get_results($wpdb->prepare("SELECT ID, post_title, post_name, post_status, post_type, menu_order, post_modified FROM {$wpdb->posts} WHERE post_type=%s AND post_status <> 'trash' ORDER BY ID", $t));
  foreach ($rows as $r) { $out['post'][] = ['post' => $r, 'meta' => $metaOf($r->ID), 'termini' => wp_get_object_terms($r->ID, get_object_taxonomies($t), ['fields' => 'all']), 'immagine_in_evidenza' => (int) get_post_thumbnail_id($r->ID)]; }
}
$out['tassonomie'] = [];
foreach (['settore', 'categoria_brand'] as $tx) { $out['tassonomie'][$tx] = get_terms(['taxonomy' => $tx, 'hide_empty' => false]); }
$out['relazioni_jet'] = $wpdb->get_results("SELECT * FROM {$wpdb->prefix}jet_rel_default");
return $out;
'@))
# 6. menu
Save-Json 'menu' (Run-Php 'menu' @'
$out = ['posizioni' => get_nav_menu_locations(), 'menu' => []];
foreach (wp_get_nav_menus() as $m) { $items = []; foreach ((array) wp_get_nav_menu_items($m->term_id) as $i) { $items[] = ['id' => $i->ID, 'titolo' => $i->title, 'url' => $i->url, 'tipo' => $i->type, 'oggetto' => $i->object, 'oggetto_id' => (int) $i->object_id, 'padre' => (int) $i->menu_item_parent, 'classi' => $i->classes, 'posizione' => $i->menu_order]; } $out['menu'][] = ['id' => $m->term_id, 'nome' => $m->name, 'slug' => $m->slug, 'voci' => $items]; }
return $out;
'@)
# 7. media
Save-Json 'media' (Run-Php 'media' ($meta + @'
$rows = $wpdb->get_results("SELECT ID, post_title, post_name, post_parent, post_mime_type, post_date FROM {$wpdb->posts} WHERE post_type='attachment' ORDER BY ID");
$out = []; foreach ($rows as $r) { $out[] = ['id' => (int) $r->ID, 'titolo' => $r->post_title, 'slug' => $r->post_name, 'file' => get_post_meta($r->ID, '_wp_attached_file', true), 'alt' => get_post_meta($r->ID, '_wp_attachment_image_alt', true), 'origine' => get_post_meta($r->ID, '_artes_src', true), 'genitore' => (int) $r->post_parent, 'mime' => $r->post_mime_type]; }
return $out;
'@))
# 8. definizioni JetEngine e WPML
Save-Json 'jetengine-wpml' (Run-Php 'jet' @'
global $wpdb;
$out = ['tipi_di_contenuto' => $wpdb->get_results("SELECT * FROM {$wpdb->prefix}jet_post_types"), 'tassonomie' => $wpdb->get_results("SELECT * FROM {$wpdb->prefix}jet_taxonomies")];
$out['wpml'] = ['lingue' => array_keys((array) apply_filters('wpml_active_languages', null)), 'impostazioni' => get_option('icl_sitepress_settings')];
return $out;
'@)
"snapshot in: $Out"
