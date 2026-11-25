// Campi aggiuntivi del CPT brand (id JetEngine 2) per la scheda completa del mockup (brand-pedrali.html):
// categoria estesa, ambiti, certificazioni, fornitura, categorie prodotto (una per riga: "Nome | Ambito")
// e galleria (ID allegati separati da virgola). L'immagine principale è l'immagine in evidenza.
// Imposta anche WPML: testi tradotti, galleria copiata. Idempotente.
$nonce = wp_create_nonce('wp_rest');
$req = function ($m, $r, $body = null) use ($nonce) { $q = new WP_REST_Request($m, $r); $q->set_header('X-WP-Nonce', $nonce); if ($body) { $q->set_header('content-type', 'application/json'); $q->set_body(wp_json_encode($body)); $q->set_body_params($body); } return rest_do_request($q); };
$real = $req('GET', '/jet-engine/v2/get-post-type/1')->get_data()['data'];
$rf = []; foreach ($real['meta_fields'] as $f) { $rf[$f['name']] = $f; }
$data = $req('GET', '/jet-engine/v2/get-post-type/2')->get_data()['data'];
$bf = []; foreach ($data['meta_fields'] as $f) { $bf[$f['name']] = $f; }
$mk = function ($tpl, $name, $title) { $f = $tpl; $f['name'] = $name; $f['title'] = $title; $f['id'] = mt_rand(10000, 99999); return $f; };
$text = $rf['sottotitolo_ambito']; $area = $rf['introduzione']; $gal = $rf['galleria'];
$new = [
	'sottotitolo_categoria' => $mk($text, 'sottotitolo_categoria', 'Categoria estesa'),
	'ambiti_artes'          => $mk($text, 'ambiti_artes', 'Ambiti Artes'),
	'certificazioni'        => $mk($text, 'certificazioni', 'Certificazioni'),
	'fornitura_artes'       => $mk($text, 'fornitura_artes', 'Fornitura Artes'),
	'categorie_prodotto'    => $mk($area, 'categorie_prodotto', 'Categorie prodotto (una per riga: Nome | Ambito)'),
	'galleria'              => $mk($gal, 'galleria', 'Galleria'),
];
foreach ($new as $n => $f) { if (!isset($bf[$n])) { $bf[$n] = $f; } }
$order = ['introduzione', 'sottotitolo_categoria', 'ambiti_artes', 'certificazioni', 'fornitura_artes', 'categorie_prodotto', 'galleria'];
$data['meta_fields'] = array_values(array_map(function ($n) use ($bf) { return $bf[$n]; }, $order));
$res = $req('POST', '/jet-engine/v2/edit-post-type/2', $data);
global $sitepress;
$tm = $sitepress->get_setting('translation-management', []);
$cf = $tm['custom_fields_translation'] ?? [];
foreach (['sottotitolo_categoria', 'ambiti_artes', 'certificazioni', 'fornitura_artes', 'categorie_prodotto'] as $n) { $cf[$n] = 2; }
$cf['galleria'] = 1;
$tm['custom_fields_translation'] = $cf; $sitepress->set_setting('translation-management', $tm, true);
$chk = $req('GET', '/jet-engine/v2/get-post-type/2')->get_data()['data'];
return ['status' => $res->get_status(), 'campi' => array_map(function ($f) { return $f['name'] . ':' . $f['type']; }, $chk['meta_fields'])];
