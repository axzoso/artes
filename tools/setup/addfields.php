$nonce = wp_create_nonce('wp_rest');
$get = new WP_REST_Request('GET', '/jet-engine/v2/get-post-type/1');
$get->set_header('X-WP-Nonce', $nonce);
$data = rest_do_request($get)->get_data()['data'];
$byName = []; foreach ($data['meta_fields'] as $f) { $byName[$f['name']] = $f; }
$tpl = $byName['sottotitolo_ambito'];
$mk = function($name, $title) use ($tpl) { $f = $tpl; $f['name'] = $name; $f['title'] = $title; $f['id'] = mt_rand(10000, 99999); return $f; };
$byName['cliente'] = $mk('cliente', 'Cliente');
$byName['arredi']  = $mk('arredi', 'Arredi');
$order = ['sottotitolo_ambito','introduzione','cliente','localita','superficie','ambienti','arredi','servizi_artes','tempi','progettista','galleria'];
$data['meta_fields'] = array_values(array_map(function($n) use ($byName) { return $byName[$n]; }, $order));
$post = new WP_REST_Request('POST', '/jet-engine/v2/edit-post-type/1');
$post->set_header('X-WP-Nonce', $nonce);
$post->set_header('content-type', 'application/json');
$post->set_body(wp_json_encode($data));
$post->set_body_params($data);
$res = rest_do_request($post);
$chk = rest_do_request((function() use ($nonce){ $g = new WP_REST_Request('GET', '/jet-engine/v2/get-post-type/1'); $g->set_header('X-WP-Nonce', $nonce); return $g; })())->get_data()['data'];
return ['status'=>$res->get_status(), 'resp'=>$res->get_data(), 'fields'=>array_map(function($f){ return $f['name'].':'.$f['type']; }, $chk['meta_fields'])];
