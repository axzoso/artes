$args = [
  'name' => 'Realizzazioni - Brand',
  'parent_object' => 'posts::realizzazione',
  'child_object' => 'posts::brand',
  'type' => 'many_to_many',
  'parent_control' => true,
  'child_control' => true,
  'parent_allow_delete' => true,
  'child_allow_delete' => true,
  'labels' => [],
];
jet_engine()->relations->data->set_request($args);
$id = jet_engine()->relations->data->create_item(false);
return ['item_id' => $id, 'notices' => jet_engine()->relations->get_notices(), 'relations' => array_map(function($r){ return ['name'=>$r->get_args('name'), 'id'=>$r->get_id()]; }, jet_engine()->relations->get_active_relations())];
