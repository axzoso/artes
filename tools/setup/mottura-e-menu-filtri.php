// 1) Brand Mottura (citato nella scheda di Boutique Hotel Aurea) e collegamento ad Aurea.
// 2) Menu "Filtri realizzazioni" (Tutti + 5 settori) usato dall'archivio come filtro.
// Idempotente.
$out = [];
$setLang = function ($id, $type) {
	$d = apply_filters('wpml_post_language_details', null, $id);
	if (empty($d['language_code'])) {
		do_action('wpml_set_element_language_details', ['element_id' => $id, 'element_type' => 'post_' . $type, 'trid' => false, 'language_code' => 'it', 'source_language_code' => null]);
	}
};

// --- Mottura ---------------------------------------------------------------
$ex = get_posts(['post_type' => 'brand', 'name' => 'mottura', 'post_status' => 'any', 'numberposts' => 1, 'suppress_filters' => true]);
$bid = $ex ? $ex[0]->ID : wp_insert_post(['post_type' => 'brand', 'post_title' => 'Mottura', 'post_name' => 'mottura', 'post_status' => 'publish'], true);
if (is_wp_error($bid)) { return ['errore' => $bid->get_error_message()]; }
$setLang($bid, 'brand');
wp_set_object_terms($bid, ['contract'], 'categoria_brand'); // ipotesi: da confermare con il cliente
$aurea = get_posts(['post_type' => 'realizzazione', 'name' => 'boutique-hotel-aurea', 'numberposts' => 1, 'suppress_filters' => true])[0]->ID;
$rel = jet_engine()->relations->get_active_relations(3);
$already = array_map('absint', wp_list_pluck((array) $rel->get_children($aurea), 'child_object_id'));
if (!in_array($bid, $already, true)) { $rel->update($aurea, $bid); }
$out['mottura'] = ['id' => $bid, 'brand_di_aurea' => array_map('absint', wp_list_pluck((array) $rel->get_children($aurea), 'child_object_id'))];

// --- Menu filtri -----------------------------------------------------------
$name = 'Filtri realizzazioni';
$menu = wp_get_nav_menu_object($name);
$menu_id = $menu ? $menu->term_id : wp_create_nav_menu($name);
foreach ((array) wp_get_nav_menu_items($menu_id) as $old) { wp_delete_post($old->ID, true); }
wp_update_nav_menu_item($menu_id, 0, ['menu-item-title' => 'Tutti', 'menu-item-url' => '/realizzazioni/', 'menu-item-type' => 'custom', 'menu-item-status' => 'publish', 'menu-item-position' => 1, 'menu-item-classes' => 'filtro-tutti']);
$pos = 2;
foreach (['arredo-uffici-workspace', 'arredo-negozi-retail', 'arredo-negozi-food', 'arredo-bar-ristoranti', 'arredo-hotel-hospitality'] as $slug) {
	$term = get_term_by('slug', $slug, 'settore');
	if (!$term) { $out['errori'][] = "termine mancante: $slug"; continue; }
	wp_update_nav_menu_item($menu_id, 0, ['menu-item-object-id' => $term->term_id, 'menu-item-object' => 'settore', 'menu-item-type' => 'taxonomy', 'menu-item-status' => 'publish', 'menu-item-position' => $pos++]);
}
$m = wp_get_nav_menu_object($name);
$out['menu'] = ['slug' => $m->slug, 'voci' => array_map(function ($i) { return $i->title . ' -> ' . $i->url; }, (array) wp_get_nav_menu_items($menu_id))];
return $out;
