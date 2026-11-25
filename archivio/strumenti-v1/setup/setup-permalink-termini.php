$o = [];
// permalink
global $wp_rewrite;
$wp_rewrite->set_permalink_structure('/%postname%/');
$wp_rewrite->flush_rules(true);
$o['permalink'] = get_option('permalink_structure');

// termini
$settori = ['Arredo uffici & workspace','Arredo negozi & retail','Arredo negozi food','Arredo bar & ristoranti','Arredo hotel & hospitality'];
$slugs = ['arredo-uffici-workspace','arredo-negozi-retail','arredo-negozi-food','arredo-bar-ristoranti','arredo-hotel-hospitality'];
foreach ($settori as $i => $n) {
  $e = term_exists($slugs[$i], 'settore');
  $r = $e ? $e : wp_insert_term($n, 'settore', ['slug'=>$slugs[$i]]);
  $o['settore'][] = is_wp_error($r) ? $r->get_error_message() : ($n . ' #' . (is_array($r)?$r['term_id']:$r));
}
$cats = ['Ufficio'=>'ufficio','Contract'=>'contract','Acustica'=>'acustica','Pareti / pod'=>'pareti-pod','Sedute'=>'sedute','Retail'=>'retail','Food'=>'food','Outdoor'=>'outdoor'];
foreach ($cats as $n => $s) {
  $e = term_exists($s, 'categoria_brand');
  $r = $e ? $e : wp_insert_term($n, 'categoria_brand', ['slug'=>$s]);
  $o['categoria_brand'][] = is_wp_error($r) ? $r->get_error_message() : ($n . ' #' . (is_array($r)?$r['term_id']:$r));
}
// WPML: impostazioni attuali
global $sitepress;
$o['wpml_posts_sync'] = $sitepress->get_setting('custom_posts_sync_option');
$o['wpml_tax_sync'] = $sitepress->get_setting('taxonomies_sync_option');
$tm = $sitepress->get_setting('translation-management');
$o['wpml_cf'] = $tm['custom_fields_translation'] ?? null;
$o['wpml_urlfmt'] = $sitepress->get_setting('language_negotiation_type');
$o['wpml_langs_codes'] = array_keys($sitepress->get_active_languages());
return $o;
