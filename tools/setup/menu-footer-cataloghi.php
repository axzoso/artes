// Aggiunge "Cataloghi PDF" (pagina 491) al menu "Footer - Risorse". Idempotente.
$m = wp_get_nav_menu_object('Footer - Risorse'); if (!$m) return 'menu mancante';
$items = wp_get_nav_menu_items($m->term_id); $have = array_map(function ($i) { return (int) $i->object_id; }, $items);
if (!in_array(491, $have, true)) {
	wp_update_nav_menu_item($m->term_id, 0, ['menu-item-object-id' => 491, 'menu-item-object' => 'page', 'menu-item-type' => 'post_type', 'menu-item-title' => 'Cataloghi PDF', 'menu-item-status' => 'publish', 'menu-item-position' => count($items) + 1]);
}
return array_map(function ($i) { return $i->title; }, wp_get_nav_menu_items($m->term_id));
