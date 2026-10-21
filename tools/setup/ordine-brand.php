$ordine = ['frezza','colombini-office','las','della-rovere','martex','estel','pedrali','gaber','et-al','mottura','caimi','snowsound','vetroin','kastel','leyform','sm-milani','arken','lainox','nardi-outdoor'];
$out = [];
foreach ($ordine as $i => $slug) { $p = get_posts(['post_type'=>'brand','name'=>$slug,'post_status'=>'any','numberposts'=>1,'suppress_filters'=>true]); if (!$p) { $out['mancanti'][] = $slug; continue; } wp_update_post(['ID'=>$p[0]->ID,'menu_order'=>$i]); }
$out['ordine'] = array_map(function($p){ return $p->post_title; }, get_posts(['post_type'=>'brand','numberposts'=>-1,'orderby'=>['menu_order'=>'ASC','ID'=>'ASC'],'suppress_filters'=>true]));
return $out;
