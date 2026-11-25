$ids = range(144, 154); $out = [];
foreach ($ids as $id) {
  if (get_post_type($id) !== 'page') { $out[$id] = 'non è una pagina'; continue; }
  update_post_meta($id, '_elementor_edit_mode', 'builder');
  update_post_meta($id, '_elementor_template_type', 'wp-page');
  if (!get_post_meta($id, '_elementor_version', true)) { update_post_meta($id, '_elementor_version', ELEMENTOR_VERSION); }
  $out[$id] = get_the_title($id) . ' -> ' . get_post_meta($id, '_elementor_edit_mode', true);
}
return $out;
