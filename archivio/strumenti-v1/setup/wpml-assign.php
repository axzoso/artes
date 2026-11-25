$out = ['post'=>0,'termini'=>0,'errori'=>[]];
$types = array_keys(apply_filters('wpml_translatable_documents', [], false));
$types = array_values(array_diff($types, ['wp_template','wp_template_part','wp_block','wp_navigation']));
foreach ($types as $pt) {
  $ids = get_posts(['post_type'=>$pt,'numberposts'=>-1,'post_status'=>'any','fields'=>'ids','suppress_filters'=>true]);
  foreach ($ids as $id) {
    $d = apply_filters('wpml_post_language_details', null, $id);
    if (!empty($d['language_code'])) continue;
    do_action('wpml_set_element_language_details', ['element_id'=>$id,'element_type'=>'post_'.$pt,'trid'=>false,'language_code'=>'it','source_language_code'=>null]);
    $out['post']++;
  }
}
foreach (['settore','categoria_brand','category','post_tag'] as $tx) {
  $terms = get_terms(['taxonomy'=>$tx,'hide_empty'=>false,'suppress_filters'=>true]);
  if (is_wp_error($terms)) { $out['errori'][] = $tx.': '.$terms->get_error_message(); continue; }
  foreach ($terms as $term) {
    $d = apply_filters('wpml_element_language_details', null, ['element_id'=>$term->term_taxonomy_id,'element_type'=>'tax_'.$tx]);
    if (!empty($d->language_code)) continue;
    do_action('wpml_set_element_language_details', ['element_id'=>$term->term_taxonomy_id,'element_type'=>'tax_'.$tx,'trid'=>false,'language_code'=>'it','source_language_code'=>null]);
    $out['termini']++;
  }
}
global $wpdb;
$out['icl_translations'] = $wpdb->get_results("SELECT element_type, language_code, COUNT(*) n FROM {$wpdb->prefix}icl_translations GROUP BY element_type, language_code ORDER BY element_type", ARRAY_A);
return $out;
