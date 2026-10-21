$o = [];
$o['ext_object_cache'] = wp_using_ext_object_cache();
$o['dropin'] = file_exists(WP_CONTENT_DIR.'/object-cache.php');
wp_cache_flush();
if (class_exists('\Elementor\Plugin')) { \Elementor\Plugin::$instance->files_manager->clear_cache(); $o['elementor_cache'] = 'cleared'; }
$o['active_plugins'] = array_values(get_option('active_plugins'));
$o['mu_plugins'] = array_keys(get_mu_plugins());
$o['litespeed_hook'] = has_action('litespeed_purge_all');
do_action('litespeed_purge_all');
return $o;

