// Menu "Filtri brand" (Tutti + 8 categorie) usato dall'archivio Brand Partner come filtro.
// La voce "Tutti" ha la classe filtro-tutti-brand: il plugin la rende attiva solo sull'archivio completo.
// Idempotente.
$name = 'Filtri brand';
$menu = wp_get_nav_menu_object($name);
$menu_id = $menu ? $menu->term_id : wp_create_nav_menu($name);
foreach ((array) wp_get_nav_menu_items($menu_id) as $old) { wp_delete_post($old->ID, true); }
wp_update_nav_menu_item($menu_id, 0, ['menu-item-title' => 'Tutti', 'menu-item-url' => '/brand-partner/', 'menu-item-type' => 'custom', 'menu-item-status' => 'publish', 'menu-item-position' => 1, 'menu-item-classes' => 'filtro-tutti-brand']);
$pos = 2;
$out = [];
foreach (['ufficio', 'contract', 'acustica', 'pareti-pod', 'sedute', 'retail', 'food', 'outdoor'] as $slug) {
	$term = get_term_by('slug', $slug, 'categoria_brand');
	if (!$term) { $out['errori'][] = "termine mancante: $slug"; continue; }
	wp_update_nav_menu_item($menu_id, 0, ['menu-item-object-id' => $term->term_id, 'menu-item-object' => 'categoria_brand', 'menu-item-type' => 'taxonomy', 'menu-item-status' => 'publish', 'menu-item-position' => $pos++]);
}
$m = wp_get_nav_menu_object($name);
$out['menu'] = ['slug' => $m->slug, 'voci' => array_map(function ($i) { return $i->title . ' -> ' . $i->url; }, (array) wp_get_nav_menu_items($menu_id))];
return $out;
