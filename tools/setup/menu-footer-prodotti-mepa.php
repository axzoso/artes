$m = wp_get_nav_menu_object('Footer - Risorse'); if (!$m) return 'menu mancante';
$items = wp_get_nav_menu_items($m->term_id); $have = array_map(function($i){return (int)$i->object_id;}, $items); $pos = count($items) + 1; $out = [];
foreach ([[471,'Prodotti'],[472,'MEPA / PA']] as $p) {
  if (in_array($p[0], $have, true)) { continue; }
  wp_update_nav_menu_item($m->term_id, 0, ['menu-item-object-id'=>$p[0],'menu-item-object'=>'page','menu-item-type'=>'post_type','menu-item-title'=>$p[1],'menu-item-status'=>'publish','menu-item-position'=>$pos++]); $out[] = $p[1];
}
return ['aggiunte'=>$out, 'voci'=>array_map(function($i){return $i->title;}, wp_get_nav_menu_items($m->term_id))];
