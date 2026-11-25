$p = get_posts(['post_type'=>'brand','name'=>'pedrali','numberposts'=>1,'suppress_filters'=>true])[0]->ID;
update_post_meta($p, 'sottotitolo_categoria', 'Sedute e sistemi operativi');
update_post_meta($p, 'ambiti_artes', 'Hospitality, Workspace, Food & Beverage');
update_post_meta($p, 'certificazioni', 'Sedute a norma per uso pubblico e contract');
update_post_meta($p, 'fornitura_artes', 'Selezione, capitolato, coordinamento consegna e montaggio');
update_post_meta($p, 'categorie_prodotto', "Sedute operative | Ufficio\nPoltroncine direzionali | Ufficio\nTavoli riunione | Contract\nCollezioni outdoor | Hospitality");
update_post_meta($p, 'galleria', '274,100,466,57');
set_post_thumbnail($p, 417);
return [$p, get_post_meta($p, 'galleria', true), get_post_thumbnail_id($p)];
