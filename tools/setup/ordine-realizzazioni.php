// Ordine delle realizzazioni nell'archivio: quello di realizzazioni.html del mockup (1..14).
// I progetti nuovi hanno ordine 0 e quindi compaiono per primi (l'archivio ordina per
// menu_order crescente, poi per data decrescente: vedi artes-core.php).
// Abilita anche il campo "Ordine" (page-attributes) nel CPT, così il cliente lo modifica dall'admin.
$order = ['boutique-hotel-aurea', 'bbc-tarsia', 'jumecitu', 'free-sport', 'sakuralab', 'ruffolo-group', 'lico', 'ingrediente-school', 'resort-capo-bianco', 'arpacal', 'costruzioni-imbrogno', 'spa-terme-luigiane', 'quotidiano', 'business-hotel-fera'];
$out = ['ordine' => []];
foreach ($order as $i => $slug) {
	$p = get_posts(['post_type' => 'realizzazione', 'name' => $slug, 'post_status' => 'any', 'numberposts' => 1, 'suppress_filters' => true]);
	if (!$p) { $out['mancanti'][] = $slug; continue; }
	wp_update_post(['ID' => $p[0]->ID, 'menu_order' => $i + 1]);
	$out['ordine'][$slug] = $i + 1;
}

// supporto page-attributes nel CPT (JetEngine: advanced_settings.supports)
$nonce = wp_create_nonce('wp_rest');
$get = new WP_REST_Request('GET', '/jet-engine/v2/get-post-type/1');
$get->set_header('X-WP-Nonce', $nonce);
$data = rest_do_request($get)->get_data()['data'];
$sup = (array) ($data['advanced_settings']['supports'] ?? []);
if (!in_array('page-attributes', $sup, true)) {
	$sup[] = 'page-attributes';
	$data['advanced_settings']['supports'] = array_values($sup);
	$post = new WP_REST_Request('POST', '/jet-engine/v2/edit-post-type/1');
	$post->set_header('X-WP-Nonce', $nonce);
	$post->set_header('content-type', 'application/json');
	$post->set_body(wp_json_encode($data));
	$post->set_body_params($data);
	$out['salvataggio_cpt'] = rest_do_request($post)->get_status();
}
global $wpdb;
$row = $wpdb->get_row("SELECT args FROM {$wpdb->prefix}jet_post_types WHERE id = 1", ARRAY_A);
$args = maybe_unserialize($row['args']);
$out['supports_nel_db'] = $args['supports'] ?? null;
return $out;
