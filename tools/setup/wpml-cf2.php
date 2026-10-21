global $sitepress;
$tm = $sitepress->get_setting('translation-management', []);
$cf = $tm['custom_fields_translation'] ?? [];
$cf['cliente'] = 1;  // nome del cliente: si copia
$cf['arredi'] = 2;   // elenco arredi: si traduce
$tm['custom_fields_translation'] = $cf;
$sitepress->set_setting('translation-management', $tm, true);
$tm2 = $sitepress->get_setting('translation-management');
return array_intersect_key($tm2['custom_fields_translation'], array_flip(['cliente','arredi']));
