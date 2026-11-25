$out = [];
foreach ([['prodotti','Prodotti'],['mepa','MEPA / PA']] as $pg) {
  $ex = get_posts(['post_type'=>'page','name'=>$pg[0],'post_status'=>'any','numberposts'=>1,'suppress_filters'=>true]);
  $id = $ex ? $ex[0]->ID : wp_insert_post(['post_type'=>'page','post_title'=>$pg[1],'post_name'=>$pg[0],'post_status'=>'publish'], true);
  if (is_wp_error($id)) { $out[$pg[0]] = $id->get_error_message(); continue; }
  $d = apply_filters('wpml_post_language_details', null, $id);
  if (empty($d['language_code'])) { do_action('wpml_set_element_language_details', ['element_id'=>$id,'element_type'=>'post_page','trid'=>false,'language_code'=>'it','source_language_code'=>null]); }
  update_post_meta($id, '_elementor_edit_mode', 'builder'); update_post_meta($id, '_elementor_template_type', 'wp-page');
  if (!get_post_meta($id, '_elementor_version', true)) { update_post_meta($id, '_elementor_version', ELEMENTOR_VERSION); }
  $out[$pg[0]] = $id;
}
return $out;
