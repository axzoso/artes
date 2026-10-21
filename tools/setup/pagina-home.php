$ex = get_posts(['post_type'=>'page','name'=>'home','post_status'=>'any','numberposts'=>1,'suppress_filters'=>true]);
$id = $ex ? $ex[0]->ID : wp_insert_post(['post_type'=>'page','post_title'=>'Home','post_name'=>'home','post_status'=>'publish'], true);
if (is_wp_error($id)) { return ['errore'=>$id->get_error_message()]; }
update_post_meta($id, '_elementor_edit_mode', 'builder');
update_post_meta($id, '_elementor_template_type', 'wp-page');
if (!get_post_meta($id, '_elementor_version', true)) { update_post_meta($id, '_elementor_version', ELEMENTOR_VERSION); }
$d = apply_filters('wpml_post_language_details', null, $id);
if (empty($d['language_code'])) { do_action('wpml_set_element_language_details', ['element_id'=>$id,'element_type'=>'post_page','trid'=>false,'language_code'=>'it','source_language_code'=>null]); }
update_option('show_on_front', 'page');
update_option('page_on_front', $id);
return ['home_id'=>$id, 'front'=>get_option('show_on_front'), 'page_on_front'=>(int)get_option('page_on_front')];
