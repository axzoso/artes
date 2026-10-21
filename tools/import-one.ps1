param([Parameter(Mandatory)][string]$Slug, [int]$Max = 4000)
# Importa una scheda (da schede.json) come post `realizzazione` su dev3, con immagini scaricate dalla preview GitHub Pages.
$d = $PSScriptRoot
New-Item -ItemType Directory -Force (Join-Path $PSScriptRoot 'out') | Out-Null
$all = Get-Content "$d\out\schede.json" -Raw -Encoding utf8 | ConvertFrom-Json
$s = $all | Where-Object slug -eq $Slug
if (-not $s) { throw "scheda non trovata: $Slug" }
$json = $s | ConvertTo-Json -Depth 8 -Compress
$php = @"
`$s = json_decode(<<<'JSON'
$json
JSON
, true);
require_once ABSPATH . 'wp-admin/includes/media.php';
require_once ABSPATH . 'wp-admin/includes/file.php';
require_once ABSPATH . 'wp-admin/includes/image.php';
`$base = 'https://axzoso.github.io/artes/';
`$t0 = microtime(true);
`$settoreSlug = ['Arredo uffici & workspace'=>'arredo-uffici-workspace','Arredo negozi & retail'=>'arredo-negozi-retail','Arredo negozi food'=>'arredo-negozi-food','Arredo bar & ristoranti'=>'arredo-bar-ristoranti','Arredo hotel & hospitality'=>'arredo-hotel-hospitality'];
`$setLang = function(`$id, `$type) { `$d = apply_filters('wpml_post_language_details', null, `$id); if (empty(`$d['language_code'])) { do_action('wpml_set_element_language_details', ['element_id'=>`$id,'element_type'=>'post_'.`$type,'trid'=>false,'language_code'=>'it','source_language_code'=>null]); } };
`$attach = function(`$img, `$parent) use (`$base, `$setLang) {
  `$url = `$base . `$img['src'];
  `$found = get_posts(['post_type'=>'attachment','post_status'=>'any','numberposts'=>1,'fields'=>'ids','suppress_filters'=>true,'meta_key'=>'_artes_src','meta_value'=>`$img['src']]);
  if (`$found) { `$id = `$found[0]; }
  else {
    `$id = media_sideload_image(`$url, `$parent, `$img['alt'], 'id');
    if (is_wp_error(`$id)) { return `$id; }
    update_post_meta(`$id, '_artes_src', `$img['src']);
  }
  update_post_meta(`$id, '_wp_attachment_image_alt', `$img['alt']);
  wp_update_post(['ID'=>`$id, 'post_title'=>`$img['alt']]);
  `$setLang(`$id, 'attachment');
  return `$id;
};
`$sp = `$s['specs'];
`$meta = [
  'sottotitolo_ambito' => `$s['ambito'],
  'introduzione' => `$s['intro'],
  'cliente' => `$sp['Cliente'] ?? '',
  'localita' => `$sp['Località'] ?? '',
  'superficie' => `$sp['Superficie'] ?? '',
  'ambienti' => `$sp['Ambienti'] ?? '',
  'arredi' => `$sp['Arredi'] ?? '',
  'servizi_artes' => `$sp['Servizi Artes'] ?? '',
  'tempi' => `$sp['Tempi'] ?? '',
  'progettista' => `$sp['Progettista'] ?? '',
];
`$existing = get_posts(['post_type'=>'realizzazione','name'=>`$s['slug'],'post_status'=>'any','numberposts'=>1,'suppress_filters'=>true]);
`$pid = `$existing ? `$existing[0]->ID : wp_insert_post(['post_type'=>'realizzazione','post_title'=>`$s['title'],'post_name'=>`$s['slug'],'post_status'=>'publish'], true);
if (is_wp_error(`$pid)) { return ['errore'=>`$pid->get_error_message()]; }
`$setLang(`$pid, 'realizzazione');
foreach (`$meta as `$k => `$v) { if (`$v !== '') { update_post_meta(`$pid, `$k, `$v); } else { delete_post_meta(`$pid, `$k); } }
wp_set_object_terms(`$pid, [`$settoreSlug[`$s['settore']]], 'settore');
`$err = [];
if (!empty(`$s['hero'])) { `$h = `$attach(`$s['hero'], `$pid); if (is_wp_error(`$h)) { `$err[] = 'hero: '.`$h->get_error_message(); } else { set_post_thumbnail(`$pid, `$h); } }
`$gal = [];
foreach (`$s['gallery'] as `$g) { `$a = `$attach(`$g, `$pid); if (is_wp_error(`$a)) { `$err[] = `$g['src'].': '.`$a->get_error_message(); } else { `$gal[] = `$a; } }
if (`$gal) { update_post_meta(`$pid, 'galleria', implode(',', `$gal)); } else { delete_post_meta(`$pid, 'galleria'); }
return ['id'=>`$pid, 'esistente'=>(bool)`$existing, 'thumb'=>get_post_thumbnail_id(`$pid), 'galleria'=>`$gal, 'errori'=>`$err, 'secondi'=>round(microtime(true)-`$t0,1), 'url'=>get_permalink(`$pid)];
"@
$f = Join-Path $d "out\imp-$Slug.php"
Set-Content $f $php -Encoding utf8
& (Join-Path $d 'php.ps1') -File $f -Max $Max

