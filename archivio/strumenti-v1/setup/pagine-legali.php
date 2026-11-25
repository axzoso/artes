// Pagine Cataloghi, Privacy policy e Cookie policy (vuote, in Elementor, lingua it). La privacy riusa la pagina 3
// di WordPress (era in bozza). I contenuti li costruisce tools/rebuild-pagine-legali.ps1. Idempotente.
$out = [];
$def = [['cataloghi', 'Cataloghi PDF', null], ['privacy-policy', 'Privacy policy', 3], ['cookie-policy', 'Cookie policy', null]];
foreach ($def as $d) {
  $id = $d[2];
  if (!$id) { $ex = get_posts(['post_type'=>'page','name'=>$d[0],'post_status'=>'any','numberposts'=>1,'suppress_filters'=>true]); $id = $ex ? $ex[0]->ID : 0; }
  if ($id) { $r = wp_update_post(['ID'=>$id,'post_title'=>$d[1],'post_name'=>$d[0],'post_status'=>'publish','post_type'=>'page'], true); }
  else { $r = wp_insert_post(['post_type'=>'page','post_title'=>$d[1],'post_name'=>$d[0],'post_status'=>'publish'], true); $id = $r; }
  if (is_wp_error($r)) { $out[$d[0]] = $r->get_error_message(); continue; }
  $id = (int) $id;
  $l = apply_filters('wpml_post_language_details', null, $id);
  if (empty($l['language_code'])) { do_action('wpml_set_element_language_details', ['element_id'=>$id,'element_type'=>'post_page','trid'=>false,'language_code'=>'it','source_language_code'=>null]); }
  update_post_meta($id, '_elementor_edit_mode', 'builder'); update_post_meta($id, '_elementor_template_type', 'wp-page');
  if (!get_post_meta($id, '_elementor_version', true)) { update_post_meta($id, '_elementor_version', ELEMENTOR_VERSION); }
  $out[$d[0]] = $id . ' ' . get_permalink($id);
}
update_option('wp_page_for_privacy_policy', (int) explode(' ', $out['privacy-policy'])[0]);
return $out;
