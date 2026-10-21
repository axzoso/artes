$brands = [
 ['Frezza','ufficio'],['Colombini Office','ufficio'],['LAS','ufficio'],['Della Rovere','ufficio'],['Martex','ufficio'],['Estel','ufficio'],
 ['Pedrali','contract'],['Gaber','contract'],['Et al.','contract'],
 ['Caimi','acustica'],['Snowsound','acustica'],
 ['Vetroin','pareti-pod'],
 ['Kastel','sedute'],['Leyform','sedute'],['SM Milani','sedute'],
 ['Arken','retail'],['Lainox','food'],['Nardi Outdoor','outdoor'],
];
$intro = ['Pedrali' => "Sedute, poltroncine e sistemi per spazi contract e hospitality. Coordiniamo forniture Pedrali sui progetti che richiedono sedute certificate per uso pubblico, in coerenza con il capitolato dell'architetto."];
$out = [];
foreach ($brands as $i => [$name, $cat]) {
  $slug = sanitize_title($name);
  $existing = get_posts(['post_type'=>'brand','name'=>$slug,'post_status'=>'any','numberposts'=>1,'suppress_filters'=>true]);
  $id = $existing ? $existing[0]->ID : wp_insert_post(['post_type'=>'brand','post_title'=>$name,'post_name'=>$slug,'post_status'=>'publish','menu_order'=>$i], true);
  if (is_wp_error($id)) { $out[$name] = $id->get_error_message(); continue; }
  wp_set_object_terms($id, [$cat], 'categoria_brand');
  if (isset($intro[$name])) update_post_meta($id, 'introduzione', $intro[$name]);
  $out[$name] = $id . ' (' . $cat . ')' . ($existing ? ' [esistente]' : '');
}
$lang = [];
foreach (get_posts(['post_type'=>'brand','numberposts'=>-1,'post_status'=>'any','fields'=>'ids','suppress_filters'=>true]) as $pid) { $d = apply_filters('wpml_post_language_details', null, $pid); $lang[$d['language_code'] ?? '?'] = ($lang[$d['language_code'] ?? '?'] ?? 0) + 1; }
return ['brands'=>$out, 'lingua_dei_post'=>$lang];
