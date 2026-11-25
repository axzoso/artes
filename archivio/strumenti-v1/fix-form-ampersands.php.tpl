$ids = array_map('intval', explode(',', '__IDS__'));
$out = [];
foreach ($ids as $id) {
  $raw = get_post_meta($id, '_elementor_data', true);
  if (!is_string($raw) || $raw === '') { $out[$id] = 'nessun dato'; continue; }
  // Il widget select scrive due volte le "&" dei nomi dei settori (&amp;amp; a video): si riportano a "&".
  $new = preg_replace('/(Arredo (?:uffici|negozi|bar|hotel)) &(?:amp;)+/', '$1 &', $raw, -1, $n);
  // Idem per gli apostrofi nelle opzioni dei menu (&#039; a video).
  $new = str_replace('&#039;', "'", $new, $n2);
  if ($n || $n2) { update_post_meta($id, '_elementor_data', wp_slash($new)); }
  $out[$id] = $n . ' "&" + ' . $n2 . " apostrofi corretti";
}
\Elementor\Plugin::$instance->files_manager->clear_cache();
wp_cache_flush();
return $out;
