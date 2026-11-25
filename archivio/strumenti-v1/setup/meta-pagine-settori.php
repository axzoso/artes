global $sitepress;
$tm = $sitepress->get_setting('translation-management', []);
$tm['custom_fields_translation']['settore_collegato'] = 1;
$sitepress->set_setting('translation-management', $tm, true);
// pagine settore -> settore collegato
$map = [144 => 'arredo-uffici-workspace', 145 => 'arredo-negozi-retail', 146 => 'arredo-negozi-food', 147 => 'arredo-bar-ristoranti', 148 => 'arredo-hotel-hospitality'];
foreach ($map as $pid => $slug) { update_post_meta($pid, 'settore_collegato', $slug); }
return ['wpml' => $sitepress->get_setting('translation-management')['custom_fields_translation']['settore_collegato'], 'meta' => array_map(function($p){ return get_post_meta($p,'settore_collegato',true); }, array_keys($map))];
