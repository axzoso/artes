// Pagine segnaposto, menu WordPress e logo per header e footer. Idempotente.
// Le pagine hanno gli stessi slug dei file del mockup (senza .html) e verranno
// riempite quando si costruiranno le pagine vere.
require_once ABSPATH . 'wp-admin/includes/media.php';
require_once ABSPATH . 'wp-admin/includes/file.php';
require_once ABSPATH . 'wp-admin/includes/image.php';

$out = [];
$setLang = function ($id, $type) {
	$d = apply_filters('wpml_post_language_details', null, $id);
	if (empty($d['language_code'])) {
		do_action('wpml_set_element_language_details', ['element_id' => $id, 'element_type' => 'post_' . $type, 'trid' => false, 'language_code' => 'it', 'source_language_code' => null]);
	}
};

// --- Pagine ----------------------------------------------------------------
$pages = [
	'arredamento-ufficio'         => 'Arredo uffici & workspace',
	'arredo-negozi'               => 'Arredo negozi & retail',
	'arredo-negozi-food'          => 'Arredo negozi food',
	'arredamento-bar-ristoranti'  => 'Arredo bar & ristoranti',
	'arredamento-hotel'           => 'Arredo hotel & hospitality',
	'arredamento-su-misura'       => 'Arredamento su misura',
	'contract'                    => 'Arredo Contract',
	'chi-siamo'                   => 'Chi siamo',
	'contatti'                    => 'Contatti',
	'area-progettisti'            => 'Area Progettisti',
	'richiedi-preventivo'         => 'Richiedi un preventivo',
];
$pid = [];
foreach ($pages as $slug => $title) {
	$ex = get_posts(['post_type' => 'page', 'name' => $slug, 'post_status' => 'any', 'numberposts' => 1, 'suppress_filters' => true]);
	$id = $ex ? $ex[0]->ID : wp_insert_post(['post_type' => 'page', 'post_title' => $title, 'post_name' => $slug, 'post_status' => 'publish'], true);
	if (is_wp_error($id)) { $out['errori'][] = $slug . ': ' . $id->get_error_message(); continue; }
	$setLang($id, 'page');
	$pid[$slug] = $id;
}
$out['pagine'] = $pid;

// --- Menu ------------------------------------------------------------------
$page = function ($slug, $classes = []) use ($pid, $pages) { return ['type' => 'page', 'id' => $pid[$slug], 'title' => $pages[$slug], 'classes' => $classes]; };
$link = function ($title, $url, $classes = []) { return ['type' => 'custom', 'url' => $url, 'title' => $title, 'classes' => $classes]; };
$settori = ['arredamento-ufficio', 'arredo-negozi', 'arredo-negozi-food', 'arredamento-bar-ristoranti', 'arredamento-hotel'];

$menus = [
	'Header' => array_merge(
		array_map(function ($s) use ($page) { return $page($s); }, $settori),
		[$link('Realizzazioni', '/realizzazioni/', ['nav-sep']), $page('arredamento-su-misura'), $page('contract'), $page('chi-siamo')]
	),
	'Footer - Azienda' => [$page('chi-siamo'), $page('contract'), $page('arredamento-su-misura'), $link('Realizzazioni', '/realizzazioni/'), $page('contatti')],
	'Footer - Settori' => array_map(function ($s) use ($page) { return $page($s); }, $settori),
	'Footer - Risorse' => [$link('Brand Partner', '/brand-partner/'), $page('area-progettisti')],
];
foreach ($menus as $name => $items) {
	$menu = wp_get_nav_menu_object($name);
	$menu_id = $menu ? $menu->term_id : wp_create_nav_menu($name);
	if (is_wp_error($menu_id)) { $out['errori'][] = $name . ': ' . $menu_id->get_error_message(); continue; }
	// ricostruisce le voci da zero (idempotente)
	foreach ((array) wp_get_nav_menu_items($menu_id) as $old) { wp_delete_post($old->ID, true); }
	foreach ($items as $pos => $it) {
		$args = ['menu-item-title' => $it['title'], 'menu-item-position' => $pos + 1, 'menu-item-status' => 'publish', 'menu-item-classes' => implode(' ', $it['classes'])];
		if ($it['type'] === 'page') { $args += ['menu-item-type' => 'post_type', 'menu-item-object' => 'page', 'menu-item-object-id' => $it['id']]; }
		else { $args += ['menu-item-type' => 'custom', 'menu-item-url' => $it['url']]; }
		wp_update_nav_menu_item($menu_id, 0, $args);
	}
	$m = wp_get_nav_menu_object($name);
	$out['menu'][$name] = ['slug' => $m->slug, 'voci' => count(wp_get_nav_menu_items($menu_id))];
}

// --- Logo ------------------------------------------------------------------
$src = 'assets/artes-logo.png';
$found = get_posts(['post_type' => 'attachment', 'post_status' => 'any', 'numberposts' => 1, 'fields' => 'ids', 'suppress_filters' => true, 'meta_key' => '_artes_src', 'meta_value' => $src]);
if ($found) { $logo = $found[0]; }
else {
	$logo = media_sideload_image('https://axzoso.github.io/artes/' . $src, 0, 'ARTES Arredamenti', 'id');
	if (is_wp_error($logo)) { $out['errori'][] = 'logo: ' . $logo->get_error_message(); $logo = 0; }
	else { update_post_meta($logo, '_artes_src', $src); }
}
if ($logo) {
	update_post_meta($logo, '_wp_attachment_image_alt', 'ARTES Arredamenti');
	$setLang($logo, 'attachment');
	set_theme_mod('custom_logo', $logo);
	$out['logo'] = $logo;
}
return $out;
