global $sitepress;
$o = [];
$posts = $sitepress->get_setting('custom_posts_sync_option', []);
$posts['realizzazione'] = 2;  // traducibile, con ripiego sull'italiano finché manca la traduzione
$posts['brand'] = 2;
$sitepress->set_setting('custom_posts_sync_option', $posts, true);

$tax = $sitepress->get_setting('taxonomies_sync_option', []);
$tax['settore'] = 2;
$tax['categoria_brand'] = 2;
$sitepress->set_setting('taxonomies_sync_option', $tax, true);

$tm = $sitepress->get_setting('translation-management', []);
$cf = $tm['custom_fields_translation'] ?? [];
foreach (['sottotitolo_ambito','introduzione','ambienti','servizi_artes','tempi','progettista'] as $k) { $cf[$k] = 2; } // tradurre
foreach (['localita','superficie','galleria'] as $k) { $cf[$k] = 1; } // copiare
$tm['custom_fields_translation'] = $cf;
$sitepress->set_setting('translation-management', $tm, true);

// rilettura
$sitepress = $GLOBALS['sitepress'];
$o['posts'] = array_intersect_key($sitepress->get_setting('custom_posts_sync_option'), ['realizzazione'=>1,'brand'=>1]);
$o['tax'] = array_intersect_key($sitepress->get_setting('taxonomies_sync_option'), ['settore'=>1,'categoria_brand'=>1]);
$tm2 = $sitepress->get_setting('translation-management');
$o['cf'] = array_intersect_key($tm2['custom_fields_translation'], array_flip(['sottotitolo_ambito','introduzione','ambienti','servizi_artes','tempi','progettista','localita','superficie','galleria']));
$o['translatable_cpt'] = array_keys(apply_filters('wpml_translatable_documents', [], false));
return $o;
