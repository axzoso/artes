<?php
/**
 * Plugin Name: ARTES Core
 * Description: Logica su misura del sito ARTES (rev2): modalità globale rev2, dati dei cicli Elementor, shortcode, redirect 301, SEO on-page, gestione allegati moduli e asset CSS/JS del sito.
 * Version:     0.9.0
 *
 * Elementor chiama `elementor/query/<query_id>` prima di eseguire la query di un
 * widget Loop: il "Query ID" del widget è il nome del filtro, non una query del
 * Query Builder di JetEngine. Qui sta la logica che il builder non offre di serie.
 *
 * Si installa come plugin (cartella artes-core con questo file e gli asset):
 * tools/install-plugin.ps1 su dev3, upload dello ZIP in produzione.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

// Se esiste una seconda copia caricata prima (es. la vecchia copia della sandbox di
// Novamira su dev3), questa non si carica: evita funzioni e hook duplicati.
if ( defined( 'ARTES_CORE_VERSION' ) ) {
	return;
}

define( 'ARTES_CORE_VERSION', '0.9.0' );

/**
 * CSS del sito (menu, header sticky, hover, archivio): vive nel plugin, non nel database
 * di Elementor, quindi viaggia con il plugin in produzione. Si carica per ultimo perché
 * deve prevalere sui CSS del tema e di Elementor.
 */
add_action(
	'wp_enqueue_scripts',
	function () {
		// Pagine con il design nuovo (rev2): CSS e JavaScript propri al posto di quelli vecchi.
		if ( artes_is_rev2() ) {
			artes_enqueue_rev2();

			return;
		}

		$file = plugin_dir_path( __FILE__ ) . 'artes-core.css';

		// Lightbox delle gallerie (clic sull'immagine -> schermo intero).
		$js = plugin_dir_path( __FILE__ ) . 'artes-core.js';

		if ( file_exists( $js ) ) {
			wp_enqueue_script( 'artes-core', plugins_url( 'artes-core.js', __FILE__ ), array(), (string) filemtime( $js ), true );
		}

		if ( file_exists( $file ) ) {
			wp_enqueue_style( 'artes-core', plugins_url( 'artes-core.css', __FILE__ ), array(), (string) filemtime( $file ) );
		}
	},
	9999
);

/**
 * Allegati dei moduli: i file CAD (DWG, DXF) sono ammessi su richiesta del cliente. WordPress non li
 * conosce, quindi si registra il tipo; il controllo sul contenuto vale solo per i file con quell'estensione
 * e solo se il tipo letto dal server è uno di quelli attesi per i CAD.
 */
function artes_cad_types() {
	return array(
		'dwg' => array( 'image/vnd.dwg', array( 'image/vnd.dwg', 'image/x-dwg', 'application/acad', 'application/x-acad', 'application/dwg', 'application/octet-stream' ) ),
		'dxf' => array( 'image/vnd.dxf', array( 'image/vnd.dxf', 'image/x-dxf', 'application/dxf', 'application/x-dxf', 'text/plain', 'application/octet-stream' ) ),
	);
}

add_filter(
	'upload_mimes',
	function ( $mimes ) {
		foreach ( artes_cad_types() as $ext => $info ) {
			$mimes[ $ext ] = $info[0];
		}

		return $mimes;
	}
);

add_filter(
	'wp_check_filetype_and_ext',
	function ( $data, $file, $filename, $mimes, $real_mime = '' ) {
		$ext   = strtolower( pathinfo( (string) $filename, PATHINFO_EXTENSION ) );
		$types = artes_cad_types();

		if ( isset( $types[ $ext ] ) && in_array( $real_mime, $types[ $ext ][1], true ) ) {
			$data['ext']             = $ext;
			$data['type']            = $types[ $ext ][0];
			$data['proper_filename'] = false;
		}

		return $data;
	},
	10,
	5
);

/**
 * Privacy degli allegati dei moduli. Elementor salva i file in uploads/elementor/forms con il nome
 * originale, in una cartella che chiunque può leggere se ne indovina l'indirizzo (anche con l'invio
 * "come allegato"): per planimetrie e capitolati dei clienti non va bene. Il file viene quindi
 * cancellato appena l'email con l'allegato è partita; una pulizia giornaliera elimina quelli rimasti
 * (invio fallito).
 */
function artes_forms_upload_dir() {
	$uploads = wp_get_upload_dir();

	return trailingslashit( $uploads['basedir'] ) . 'elementor/forms';
}

add_action(
	'wp_mail_succeeded',
	function ( $mail_data ) {
		$dir = realpath( artes_forms_upload_dir() );

		if ( ! $dir || empty( $mail_data['attachments'] ) ) {
			return;
		}

		foreach ( (array) $mail_data['attachments'] as $path ) {
			$real = realpath( $path );

			if ( $real && 0 === strpos( $real, $dir . DIRECTORY_SEPARATOR ) && is_file( $real ) ) {
				wp_delete_file( $real );
			}
		}
	}
);

add_action(
	'init',
	function () {
		if ( ! wp_next_scheduled( 'artes_core_clean_form_uploads' ) ) {
			wp_schedule_event( time() + HOUR_IN_SECONDS, 'daily', 'artes_core_clean_form_uploads' );
		}
	}
);

add_action(
	'artes_core_clean_form_uploads',
	function () {
		$dir = artes_forms_upload_dir();

		if ( ! is_dir( $dir ) ) {
			return;
		}

		foreach ( (array) glob( $dir . '/*' ) as $file ) { // il glob esclude .htaccess
			if ( is_file( $file ) && ! in_array( basename( $file ), array( 'index.php', 'index.html' ), true ) && filemtime( $file ) < time() - DAY_IN_SECONDS ) {
				wp_delete_file( $file );
			}
		}
	}
);

/**
 * Il corpo dell'email dei moduli contiene il link al file allegato; dopo la cancellazione del file
 * (vedi sopra) il link non funziona più e il file è comunque allegato: lo si sostituisce con una nota.
 */
add_filter(
	'elementor_pro/atomic_forms/email_message',
	function ( $message ) {
		return preg_replace_callback(
			'#https?://[^\s<"]*/uploads/elementor/forms/([^\s<"]+)#',
			function ( $m ) {
				return rawurldecode( $m[1] ) . ' (in allegato)';
			},
			(string) $message
		);
	}
);

/**
 * Preselezione dei menu del modulo, come nel mockup (il widget select di Elementor non accetta un valore
 * dinamico, quindi un piccolo script nel footer):
 * - "Settore" (#richiesta_settore): nelle schede realizzazione parte dal settore del progetto; altrove dal
 *   parametro ?settore= (le CTA delle pagine settore lo passano);
 * - "Motivo del contatto" (#motivo): dal parametro ?motivo= (tecnico, progettisti, pa, assistenza, fornitori, lavoro).
 */
add_action(
	'wp_footer',
	function () {
		$settore = '';

		if ( is_singular( 'realizzazione' ) ) {
			$terms   = wp_get_object_terms( get_queried_object_id(), 'settore', array( 'fields' => 'names' ) );
			$settore = ( $terms && ! is_wp_error( $terms ) ) ? html_entity_decode( $terms[0], ENT_QUOTES, 'UTF-8' ) : '';
		} elseif ( isset( $_GET['settore'] ) ) { // phpcs:ignore WordPress.Security.NonceVerification
			$settore = sanitize_text_field( wp_unslash( $_GET['settore'] ) ); // phpcs:ignore WordPress.Security.NonceVerification
		}

		$motivo = isset( $_GET['motivo'] ) ? sanitize_key( wp_unslash( $_GET['motivo'] ) ) : ''; // phpcs:ignore WordPress.Security.NonceVerification

		if ( '' === $settore && '' === $motivo ) {
			return;
		}

		$motivi = array(
			'informazioni' => 'Informazioni generali',
			'tecnico'      => 'Parlare con un tecnico',
			'progettisti'  => 'Collaborazione per studi e progettisti',
			'pa'           => 'Pubblica amministrazione e MEPA',
			'assistenza'   => 'Assistenza su una fornitura',
			'fornitori'    => 'Fornitori e partner',
			'lavoro'       => 'Lavora con noi',
		);
		?>
<script>
(function () {
	function pick(id, v) {
		var s = document.getElementById(id);
		if (!s || !v) { return; }
		for (var i = 0; i < s.options.length; i++) {
			if (s.options[i].value === v) { s.selectedIndex = i; break; }
		}
	}
	pick('richiesta_settore', <?php echo wp_json_encode( $settore ); ?>);
	pick('motivo', <?php echo wp_json_encode( isset( $motivi[ $motivo ] ) ? $motivi[ $motivo ] : '' ); ?>);
})();
</script>
		<?php
	}
);

register_deactivation_hook(
	__FILE__,
	function () {
		wp_clear_scheduled_hook( 'artes_core_clean_form_uploads' );
	}
);

/**
 * ID del post della pagina corrente (la scheda realizzazione/brand mostrata).
 */
function artes_current_post_id() {
	$id = get_queried_object_id();

	return $id ? $id : (int) get_the_ID();
}

/**
 * Selettore lingua per la topbar: [artes_lingue] -> "IT / EN".
 *
 * Usa il filtro `wpml_active_languages`. Il codice mostrato è il prefisso a due
 * lettere della lingua (en-gb -> EN); la lingua corrente non è un link.
 * Mantenuto per la fase finale di traduzione WPML / EN.
 */
add_shortcode(
	'artes_lingue',
	function () {
		$languages = apply_filters( 'wpml_active_languages', null, array( 'skip_missing' => 0 ) );

		if ( empty( $languages ) || ! is_array( $languages ) ) {
			return '';
		}

		// La lingua predefinita per prima: "IT / EN".
		$default = apply_filters( 'wpml_default_language', null );
		uasort(
			$languages,
			function ( $a, $b ) use ( $default ) {
				return (int) ( $b['language_code'] === $default ) - (int) ( $a['language_code'] === $default );
			}
		);

		$items = array();

		foreach ( $languages as $language ) {
			$label = strtoupper( substr( $language['language_code'], 0, 2 ) );

			if ( ! empty( $language['active'] ) ) {
				$items[] = '<span class="lang-current">' . esc_html( $label ) . '</span>';
			} else {
				$items[] = '<a href="' . esc_url( $language['url'] ) . '" hreflang="' . esc_attr( $language['code'] ) . '">' . esc_html( $label ) . '</a>';
			}
		}

		return '<span class="lang-switch">' . implode( ' / ', $items ) . '</span>';
	}
);

/**
 * Archivio realizzazioni e pagine dei settori: in rev2 tutti i progetti in una pagina (filtri lato client),
 * con fallback a 12 per pagina in caso di kill-switch completo (`artes_rev2_globale = 0` e `artes_rev2_cpt = 0`).
 */
add_action(
	'pre_get_posts',
	function ( $query ) {
		if ( is_admin() || ! $query->is_main_query() ) {
			return;
		}

		if ( $query->is_post_type_archive( 'realizzazione' ) || $query->is_tax( 'settore' ) ) {
			$query->set( 'posts_per_page', ( artes_rev2_globale_attiva() || get_option( 'artes_rev2_cpt' ) ) ? -1 : 12 );
			// Prima l'ordine scelto (campo "Ordine" nell'admin), poi i più recenti: un progetto
			// nuovo ha ordine 0 e compare per primo.
			$query->set(
				'orderby',
				array(
					'menu_order' => 'ASC',
					'date'       => 'DESC',
				)
			);
		}
	}
);

/**
 * Archivio dei brand e pagine delle categorie: tutti in una pagina, nell'ordine del mockup
 * (campo "Ordine", poi ID).
 */
add_action(
	'pre_get_posts',
	function ( $query ) {
		if ( is_admin() || ! $query->is_main_query() ) {
			return;
		}

		if ( $query->is_post_type_archive( 'brand' ) || $query->is_tax( 'categoria_brand' ) ) {
			$query->set( 'posts_per_page', -1 );
			$query->set(
				'orderby',
				array(
					'menu_order' => 'ASC',
					'ID'         => 'ASC',
				)
			);
		}
	}
);

/**
 * Progetti in cui è stato usato il brand corrente ("Progetti con Pedrali"), via relazione
 * JetEngine realizzazione -> brand.
 */
add_action(
	'elementor/query/artes_progetti_brand',
	function ( $query ) {
		$ids = array();

		if ( function_exists( 'jet_engine' ) && ! empty( jet_engine()->relations ) ) {
			foreach ( (array) jet_engine()->relations->get_active_relations() as $relation ) {
				if (
					'posts::realizzazione' === $relation->get_args( 'parent_object' )
					&& 'posts::brand' === $relation->get_args( 'child_object' )
				) {
					// Dal lato del figlio (il brand) si leggono i genitori (le realizzazioni).
					$rows = (array) $relation->get_parents( artes_current_post_id() );
					$ids  = array_filter( array_map( 'absint', wp_list_pluck( $rows, 'parent_object_id' ) ) );
					break;
				}
			}
		}

		$query->set( 'post_type', 'realizzazione' );
		$query->set( 'post__in', $ids ? $ids : array( 0 ) );
		$query->set(
			'orderby',
			array(
				'menu_order' => 'ASC',
				'date'       => 'DESC',
			)
		);
		$query->set( 'posts_per_page', 6 );
	}
);

/**
 * Galleria: gli allegati elencati nel campo `galleria` (ID separati da virgola),
 * nell'ordine in cui sono stati scelti.
 */
add_action(
	'elementor/query/artes_galleria',
	function ( $query ) {
		$ids = array_filter( array_map( 'absint', explode( ',', (string) get_post_meta( artes_current_post_id(), 'galleria', true ) ) ) );

		$query->set( 'post_type', 'attachment' );
		$query->set( 'post_status', 'inherit' );
		$query->set( 'post__in', $ids ? $ids : array( 0 ) ); // 0: nessun risultato invece di "tutti".
		$query->set( 'orderby', 'post__in' );
		$query->set( 'posts_per_page', -1 );
	}
);

/**
 * Le pagine costruite con Elementor hanno già il proprio titolo (h1): si toglie quello che il tema
 * Hello Elementor aggiunge sopra il contenuto, ma lo si mantiene sulle pagine di sistema (404 e ricerca)
 * che usano i template del tema tra Header 557 e Footer 971.
 */
add_filter(
	'hello_elementor_page_title',
	function ( $show ) {
		if ( is_404() || is_search() ) {
			return true;
		}

		return false;
	}
);

/**
 * Altre realizzazioni dello stesso settore, esclusa quella corrente.
 */
add_action(
	'elementor/query/artes_altre_realizzazioni',
	function ( $query ) {
		$current = artes_current_post_id();
		$terms   = wp_get_object_terms( $current, 'settore', array( 'fields' => 'ids' ) );

		$query->set( 'post_type', 'realizzazione' );
		$query->set( 'post__not_in', array( $current ) );
		$query->set( 'posts_per_page', 3 );
		// Come nella rev2: le prime 3 dello stesso settore nell'ordine dell'archivio.
		$query->set(
			'orderby',
			array(
				'menu_order' => 'ASC',
				'ID'         => 'ASC',
			)
		);

		if ( $terms && ! is_wp_error( $terms ) ) {
			$query->set(
				'tax_query',
				array(
					array(
						'taxonomy' => 'settore',
						'field'    => 'term_id',
						'terms'    => $terms,
					),
				)
			);
		}
	}
);
/**
 * ===== Schede e archivi della rev2 (fase 4, novembre 2026) =====================================================
 *
 * Valori calcolati che i widget di Elementor non possono produrre da soli, usati con il tag dinamico "Shortcode".
 * Funzionano sulla scheda corrente (realizzazione o brand): gli indirizzi sono quelli della rev2
 * (`/realizzazioni/?settore=<slug>&categoria=<slug>`), non le pagine dei termini.
 */

/**
 * Primo termine di una tassonomia per un articolo (o null).
 */
function artes_primo_termine( $post_id, $taxonomy ) {
	$terms = wp_get_object_terms( $post_id, $taxonomy );

	return ( $terms && ! is_wp_error( $terms ) ) ? $terms[0] : null;
}

/**
 * Indirizzo dell'archivio realizzazioni con filtri (settore, categoria), come `realizzazioni.html?settore=…` della rev2.
 */
function artes_url_archivio_filtrato( $settore = '', $categoria = '' ) {
	$base = get_post_type_archive_link( 'realizzazione' );

	if ( ! $base ) {
		return '';
	}

	$args = array();

	if ( $settore ) {
		$args['settore'] = $settore;
	}

	if ( $categoria ) {
		$args['categoria'] = $categoria;
	}

	return add_query_arg( $args, $base );
}

/**
 * Indirizzo della pagina del settore (meta del termine `pagina` = ID della pagina; tradotto da WPML).
 */
function artes_url_pagina_settore( $term ) {
	if ( ! $term ) {
		return '';
	}

	$page_id = (int) get_term_meta( $term->term_id, 'pagina', true );

	if ( $page_id ) {
		$page_id = (int) apply_filters( 'wpml_object_id', $page_id, 'page', true );
	}

	return $page_id ? (string) get_permalink( $page_id ) : '';
}

/**
 * Briciole di pane della scheda: "Home / Realizzazioni / Settore / Titolo" (realizzazione) o
 * "Home / Brand partner / Titolo" (brand). Stesso HTML della rev2.
 */
add_shortcode(
	'artes_breadcrumb',
	function () {
		$id    = artes_current_post_id();
		$home  = '<a href="' . esc_url( home_url( '/' ) ) . '">Home</a>';
		$title = '<strong>' . esc_html( wp_strip_all_tags( get_the_title( $id ) ) ) . '</strong>';

		if ( 'brand' === get_post_type( $id ) ) {
			return $home . ' / <a href="' . esc_url( get_post_type_archive_link( 'brand' ) ) . '">Brand partner</a> / ' . $title;
		}

		$settore = artes_primo_termine( $id, 'settore' );
		$out     = $home . ' / <a href="' . esc_url( get_post_type_archive_link( 'realizzazione' ) ) . '">Realizzazioni</a> / ';

		if ( $settore ) {
			$out .= '<a href="' . esc_url( artes_url_archivio_filtrato( $settore->slug ) ) . '">' . esc_html( $settore->name ) . '</a> / ';
		}

		return $out . $title;
	}
);

/**
 * Riga sopra il titolo della scheda realizzazione: "Arredo uffici e workspace — Enti e istituzioni".
 */
add_shortcode(
	'artes_eyebrow',
	function () {
		$id      = artes_current_post_id();
		$settore = artes_primo_termine( $id, 'settore' );
		$cat     = artes_primo_termine( $id, 'categoria' );
		$parti   = array_filter( array( $settore ? $settore->name : '', $cat ? $cat->name : '' ) );

		return esc_html( implode( ' — ', $parti ) );
	}
);

/**
 * "Settore" tra i dati della scheda: nome del settore con il link alla sua pagina.
 */
add_shortcode(
	'artes_settore_link',
	function () {
		$settore = artes_primo_termine( artes_current_post_id(), 'settore' );

		if ( ! $settore ) {
			return '';
		}

		$url = artes_url_pagina_settore( $settore );

		return $url ? '<a href="' . esc_url( $url ) . '">' . esc_html( $settore->name ) . '</a>' : esc_html( $settore->name );
	}
);

/**
 * "Categoria" nella scheda del progetto: nome con il link all'archivio filtrato per settore e categoria.
 */
add_shortcode(
	'artes_categoria_link',
	function () {
		$id      = artes_current_post_id();
		$settore = artes_primo_termine( $id, 'settore' );
		$cat     = artes_primo_termine( $id, 'categoria' );

		if ( ! $cat ) {
			return '';
		}

		$url = artes_url_archivio_filtrato( $settore ? $settore->slug : '', $cat->slug );

		return '<a href="' . esc_url( $url ) . '">' . esc_html( $cat->name ) . '</a>';
	}
);

/**
 * Testata della galleria: "Galleria fotografica · 7 foto".
 */
add_shortcode(
	'artes_galleria_titolo',
	function () {
		$ids = array_filter( array_map( 'absint', explode( ',', (string) get_post_meta( artes_current_post_id(), 'galleria', true ) ) ) );

		return esc_html( 'Galleria fotografica · ' . count( $ids ) . ' foto' );
	}
);

/**
 * Link in fondo alla descrizione: testo "Scopri l'arredo uffici e workspace" e indirizzo della pagina del settore.
 */
add_shortcode(
	'artes_scopri_testo',
	function () {
		$settore = artes_primo_termine( artes_current_post_id(), 'settore' );

		if ( ! $settore ) {
			return '';
		}

		return esc_html( "Scopri l'arredo " . preg_replace( '/^Arredo\s+/u', '', $settore->name ) );
	}
);

add_shortcode(
	'artes_url_pagina_settore',
	function () {
		return esc_url( artes_url_pagina_settore( artes_primo_termine( artes_current_post_id(), 'settore' ) ) );
	}
);

/**
 * Titolo della fascia finale della scheda brand: "Arredi Pedrali<br>per il tuo spazio?".
 */
add_shortcode(
	'artes_cta_brand',
	function () {
		return 'Arredi ' . esc_html( wp_strip_all_tags( get_the_title( artes_current_post_id() ) ) ) . '<br>per il tuo spazio?';
	}
);

/**
 * Cicli degli archivi rev2: tutte le realizzazioni (o tutti i brand) in una pagina, nell'ordine d'archivio. Non si usa la
 * query della pagina: i filtri per settore e categoria sono lato browser (come nella rev2) e `?settore=` / `?categoria=`
 * nell'indirizzo restringerebbero la query principale.
 */
add_action(
	'elementor/query/artes_archivio_realizzazioni',
	function ( $query ) {
		$query->set( 'post_type', 'realizzazione' );
		$query->set( 'post_status', 'publish' );
		$query->set( 'posts_per_page', -1 );
		$query->set(
			'orderby',
			array(
				'menu_order' => 'ASC',
				'ID'         => 'ASC',
			)
		);
	}
);

add_action(
	'elementor/query/artes_archivio_brand',
	function ( $query ) {
		$query->set( 'post_type', 'brand' );
		$query->set( 'post_status', 'publish' );
		$query->set( 'posts_per_page', -1 );
		$query->set(
			'orderby',
			array(
				'menu_order' => 'ASC',
				'ID'         => 'ASC',
			)
		);
	}
);

/**
 * Home rev2 (sezione 04 Realizzazioni): le 6 realizzazioni in evidenza, ordinate per campo `home_ordine` (1–6).
 */
add_action(
	'elementor/query/artes_progetti_home_rev2',
	function ( $query ) {
		$query->set( 'post_type', 'realizzazione' );
		$query->set( 'post_status', 'publish' );
		$query->set( 'posts_per_page', 6 );
		$query->set( 'meta_key', 'home_ordine' ); // phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_meta_key
		$query->set( 'orderby', 'meta_value_num' );
		$query->set( 'order', 'ASC' );
		$query->set(
			'meta_query',
			array( // phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_meta_query
				array(
					'key'     => 'home_ordine',
					'value'   => 0,
					'compare' => '>',
					'type'    => 'NUMERIC',
				),
			)
		);
	}
);

/**
 * I filtri degli archivi sono lato browser, come nella rev2: `/realizzazioni/?settore=uffici&categoria=…` è la pagina dell'archivio
 * con un filtro nell'indirizzo, non una query di WordPress. Senza questa pulizia `settore` e `categoria` (parametri pubblici delle
 * tassonomie) diventerebbero una query sull'archivio: `is_tax()` sarebbe vero (il reindirizzamento qui sotto punterebbe a sé stesso
 * e il browser andrebbe in ciclo) e un filtro senza risultati o con un termine inesistente darebbe 404, mentre la rev2 risponde sempre.
 */
add_filter(
	'request',
	function ( $vars ) {
		if ( ( artes_rev2_globale_attiva() || get_option( 'artes_rev2_cpt' ) ) && isset( $vars['post_type'] ) && in_array( $vars['post_type'], array( 'realizzazione', 'brand' ), true ) && empty( $vars['name'] ) ) {
			unset( $vars['settore'], $vars['categoria'], $vars['categoria_brand'] );
		}

		return $vars;
	}
);

/**
 * Le pagine dei termini (/settore/uffici/, /categoria-realizzazione/…, /categoria-brand/…) e la paginazione
 * degli archivi (/realizzazioni/page/2/, /brand-partner/page/2/) non esistono nella rev2: tutti gli elementi
 * sono in un'unica pagina con filtri lato browser. Chi arriva da un vecchio link viene reindirizzato con 301.
 */
add_action(
	'template_redirect',
	function () {
		if ( ! artes_rev2_globale_attiva() && ! get_option( 'artes_rev2_cpt' ) ) {
			return;
		}

		// Con posts_per_page = -1 WordPress risponderebbe 200 anche su /page/2/ con contenuto duplicato: 301 all'archivio.
		if ( is_post_type_archive() ) {
			if ( is_paged() && is_post_type_archive( array( 'realizzazione', 'brand' ) ) ) {
				$post_type = is_post_type_archive( 'realizzazione' ) ? 'realizzazione' : 'brand';
				$url       = (string) get_post_type_archive_link( $post_type );

				if ( $url ) {
					wp_safe_redirect( $url, 301 );
					exit;
				}
			}

			// Mai reindirizzare dalla pagina principale dell'archivio stesso: sarebbe un ciclo.
			return;
		}

		$url = '';

		if ( is_tax( 'settore' ) ) {
			$term = get_queried_object();

			if ( $term instanceof WP_Term ) {
				$url = artes_url_archivio_filtrato( $term->slug );
			}
		} elseif ( is_tax( 'categoria' ) ) {
			$term = get_queried_object();

			if ( $term instanceof WP_Term ) {
				$url = artes_url_archivio_filtrato( (string) get_term_meta( $term->term_id, 'settore', true ), $term->slug );
			}
		} elseif ( is_tax( 'categoria_brand' ) ) {
			$url = (string) get_post_type_archive_link( 'brand' );
		}

		if ( $url ) {
			wp_safe_redirect( $url, 301 );
			exit;
		}
	}
);

/**
 * Modalità rev2 (adeguamento alla versione 2 del sito, novembre 2026 — accensione globale fase 9).
 *
 * Dalla versione 0.9.0 la rev2 è attiva globalmente su tutto il frontend (pagine, CPT, archivi, 404, ricerca,
 * anteprime frontend) tramite l'opzione `artes_rev2_globale` (default attivo: `'1'`).
 * Kill-switch reversibile: impostare l'opzione `artes_rev2_globale` a `'0'` riporta alla modalità selettiva
 * (`?artes_rev2=1`, meta `_artes_rev2` e opzione `artes_rev2_cpt`). In area admin (`is_admin()`) restituisce sempre `false`.
 */
function artes_rev2_globale_attiva() {
	$opt = get_option( 'artes_rev2_globale', '1' );

	if ( is_bool( $opt ) ) {
		return $opt;
	}

	$val = strtolower( trim( (string) $opt ) );

	return ! in_array( $val, array( '', '0', 'false', 'off', 'no' ), true );
}

/**
 * Indica se la richiesta corrente deve essere renderizzata con il design rev2.
 */
function artes_is_rev2() {
	static $rev2 = null;

	if ( is_admin() ) {
		return false;
	}

	if ( null !== $rev2 && did_action( 'wp' ) ) {
		return $rev2;
	}

	$flag = false;

	if ( artes_rev2_globale_attiva() ) {
		$flag = true;
	} elseif ( isset( $_GET['artes_rev2'] ) && '1' === $_GET['artes_rev2'] ) { // phpcs:ignore WordPress.Security.NonceVerification.Recommended
		$flag = true;
	} elseif ( is_singular() ) {
		$flag = (bool) get_post_meta( get_queried_object_id(), '_artes_rev2', true );
	}

	// Schede e archivi di realizzazioni e brand: i template rev2 (fase 4) restano attivi se `artes_rev2_cpt` è acceso
	// anche quando il kill-switch `artes_rev2_globale = '0'` è impostato.
	if ( ! $flag && get_option( 'artes_rev2_cpt' ) ) {
		$flag = is_singular( array( 'realizzazione', 'brand' ) ) || is_post_type_archive( array( 'realizzazione', 'brand' ) );
	}

	$flag = (bool) apply_filters( 'artes_is_rev2', $flag );

	if ( did_action( 'wp' ) ) {
		$rev2 = $flag;
	}

	return $flag;
}

/**
 * Stili minimi per le pagine di sistema (404 e ricerca) renderizzate con Hello Elementor tra Header 557 e Footer 971.
 * Caricati solo quando `is_404() || is_search()`: nessun impatto sulle 51 pagine Elementor rev2.
 */
function artes_rev2_system_pages_css() {
	return 'body.rev2.error404 .site-main,body.rev2.search .site-main{width:100%;max-width:960px;margin:0 auto;padding:96px var(--pad,40px) 120px;}'
		. 'body.rev2.error404 .site-main .page-header,body.rev2.search .site-main .page-header{margin-bottom:24px;}'
		. 'body.rev2.error404 .site-main .entry-title,body.rev2.search .site-main .entry-title{font-family:var(--display);font-weight:400;font-size:clamp(32px,4vw,48px);line-height:1.08;letter-spacing:-.025em;color:var(--graphite);margin:0 0 16px;}'
		. 'body.rev2.search .site-main article{padding:24px 0;border-top:1px solid var(--line-soft,#EEEEEE);}'
		. 'body.rev2.search .site-main article .entry-title{font-size:clamp(20px,2vw,26px);margin-bottom:8px;}'
		. 'body.rev2.search .site-main article img{max-width:100%;height:auto;display:block;}'
		. 'body.rev2.error404 .site-main p,body.rev2.search .site-main p{font-size:16px;line-height:1.65;color:var(--muted-2,#5E5E5E);margin:0 0 16px;}'
		. 'body.rev2.error404 .site-main a,body.rev2.search .site-main a{color:var(--graphite);text-decoration:underline;text-underline-offset:3px;}'
		. 'body.rev2.error404 .site-main a:hover,body.rev2.search .site-main a:hover{color:var(--accent);}';
}

/**
 * Carica CSS e JavaScript della rev2 (se i file esistono).
 */
function artes_enqueue_rev2() {
	$dir = plugin_dir_path( __FILE__ );

	// La rev2 è un design completo e autonomo: gli stili di base del tema (reset, theme e header-footer di Hello Elementor)
	// ne cambierebbero i valori di partenza (colore dei link e dei bottoni, interlinee, margini), che nella rev2 sono quelli
	// del browser. Il design resta governato da Elementor (frontend + kit) e dal CSS del plugin.
	foreach ( array( 'hello-elementor', 'hello-elementor-theme-style', 'hello-elementor-header-footer' ) as $handle ) {
		wp_dequeue_style( $handle );
	}

	// I font li carica il plugin (sotto, con i soli pesi usati): non quelli, completi, delle impostazioni del kit di Elementor.
	add_filter( 'elementor/frontend/print_google_fonts', '__return_false' );

	// Stessi font della rev2 (Archivo, Instrument Sans, IBM Plex Mono): non dipendono dalle impostazioni di Elementor.
	wp_enqueue_style( 'artes-rev2-fonts', 'https://fonts.googleapis.com/css2?family=Archivo:wght@300;400;500;600&family=Instrument+Sans:wght@400;500&family=IBM+Plex+Mono:wght@400;500&display=swap', array(), null ); // phpcs:ignore WordPress.WP.EnqueuedResourceParameters.MissingVersion

	if ( file_exists( $dir . 'artes-rev2.css' ) ) {
		wp_enqueue_style( 'artes-rev2', plugins_url( 'artes-rev2.css', __FILE__ ), array(), (string) filemtime( $dir . 'artes-rev2.css' ) );

		if ( is_404() || is_search() ) {
			wp_add_inline_style( 'artes-rev2', artes_rev2_system_pages_css() );
		}
	}

	if ( file_exists( $dir . 'artes-rev2.js' ) ) {
		wp_enqueue_script( 'artes-rev2', plugins_url( 'artes-rev2.js', __FILE__ ), array(), (string) filemtime( $dir . 'artes-rev2.js' ), true );
		wp_add_inline_script( 'artes-rev2', 'window.ArtesRev2Dati = ' . wp_json_encode( artes_dati_filtri() ) . ';', 'before' );
	}
}

/**
 * Dati dei filtri dell'archivio realizzazioni per il JavaScript: settori e categorie (nome, slug, settore) nell'ordine della rev2.
 * I bottoni dei filtri sono widget senza attributi: il JavaScript abbina il loro testo agli slug con questa tabella.
 */
function artes_dati_filtri() {
	$dati = array(
		'settori'   => array(),
		'categorie' => array(),
	);

	if ( ! taxonomy_exists( 'settore' ) ) {
		return $dati;
	}

	$settori = get_terms(
		array(
			'taxonomy'   => 'settore',
			'hide_empty' => false,
			'meta_key'   => 'ordine', // phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_meta_key
			'orderby'    => 'meta_value_num',
		)
	);

	if ( ! is_wp_error( $settori ) ) {
		foreach ( (array) $settori as $s ) {
			$dati['settori'][] = array(
				'slug' => $s->slug,
				'nome' => $s->name,
			);
		}
	}

	if ( taxonomy_exists( 'categoria' ) ) {
		$categorie = get_terms(
			array(
				'taxonomy'   => 'categoria',
				'hide_empty' => false,
				'meta_key'   => 'ordine_filtro', // phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_meta_key
				'orderby'    => 'meta_value_num',
				'meta_query' => array( // phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_meta_query
					array(
						'key'     => 'ordine_filtro',
						'value'   => 0,
						'compare' => '>',
						'type'    => 'NUMERIC',
					),
				),
			)
		);

		if ( ! is_wp_error( $categorie ) ) {
			foreach ( (array) $categorie as $c ) {
				$dati['categorie'][] = array(
					'slug'    => $c->slug,
					'nome'    => $c->name,
					'settore' => (string) get_term_meta( $c->term_id, 'settore', true ),
				);
			}
		}
	}

	return $dati;
}

add_filter(
	'body_class',
	function ( $classes ) {
		if ( artes_is_rev2() ) {
			$classes[] = 'rev2';
		}

		return $classes;
	}
);

// Collegamento anticipato ai server dei font nelle pagine rev2.
add_filter(
	'wp_resource_hints',
	function ( $urls, $relation_type ) {
		if ( 'preconnect' === $relation_type && artes_is_rev2() ) {
			$urls[] = 'https://fonts.googleapis.com';
			$urls[] = array(
				'href'        => 'https://fonts.gstatic.com',
				'crossorigin' => 'anonymous',
			);
		}

		return $urls;
	},
	10,
	2
);

/**
 * ===== SEO on-page (fase 7, novembre 2026) ====================================================================
 *
 * Gestione integrata di <title> e <meta name="description"> senza plugin SEO esterni:
 * - Pagine statiche (Home, 5 settori, Su misura, Contract, Chi siamo, Privacy, Cookie): meta `_artes_seo_title`
 *   e `_artes_seo_description` (registrati e compatibili con WPML modo 2).
 * - Schede CPT `realizzazione` e `brand`: formule verificate al 100% rispetto alla rev2, con override opzionale
 *   tramite gli stessi meta `_artes_seo_title` e `_artes_seo_description`.
 * - Archivi CPT (`realizzazione`, `brand`): opzione `artes_seo_archives` (con fallback ai valori della rev2 e
 *   filtro `artes_seo_archive_meta`).
 */

/**
 * Normalizza un testo SEO in testo semplice UTF-8 senza tag HTML né entità residue.
 */
function artes_seo_clean_text( $text ) {
	$text = wp_strip_all_tags( (string) $text );
	$text = html_entity_decode( $text, ENT_QUOTES | ENT_HTML5, 'UTF-8' );
	$text = preg_replace( '/\s+/u', ' ', $text );

	return trim( (string) $text );
}

/**
 * Valori predefiniti per gli archivi CPT (allineati alla rev2).
 */
function artes_seo_archive_defaults() {
	return array(
		'realizzazione' => array(
			'title'       => 'Realizzazioni di arredi su misura — Artes',
			'description' => 'Le realizzazioni Artes per uffici, negozi, bar e ristoranti, negozi food e hotel: case history di arredi su misura progettati, prodotti e montati, filtrabili per settore e categoria.',
		),
		'brand'         => array(
			'title'       => 'Brand Partner — ARTES Contract',
			'description' => 'I brand partner con cui Artes lavora: mobili per ufficio, sedute contract, acustica, lapidei e outdoor. Ogni brand è collegato alle realizzazioni in cui è stato impiegato.',
		),
	);
}

/**
 * Titolo e descrizione per un archivio CPT (`realizzazione` o `brand`): legge l'opzione `artes_seo_archives`
 * con fallback ai valori predefiniti e filtro `artes_seo_archive_meta`.
 */
function artes_seo_get_archive_meta( $post_type ) {
	$defaults = artes_seo_archive_defaults();
	$saved    = get_option( 'artes_seo_archives', array() );
	$saved    = is_array( $saved ) ? $saved : array();
	$entry    = array(
		'title'       => '',
		'description' => '',
	);

	if ( isset( $defaults[ $post_type ] ) && is_array( $defaults[ $post_type ] ) ) {
		$entry = array_merge( $entry, $defaults[ $post_type ] );
	}

	if ( isset( $saved[ $post_type ] ) && is_array( $saved[ $post_type ] ) ) {
		if ( isset( $saved[ $post_type ]['title'] ) && '' !== trim( (string) $saved[ $post_type ]['title'] ) ) {
			$entry['title'] = (string) $saved[ $post_type ]['title'];
		}

		if ( isset( $saved[ $post_type ]['description'] ) && '' !== trim( (string) $saved[ $post_type ]['description'] ) ) {
			$entry['description'] = (string) $saved[ $post_type ]['description'];
		}
	}

	$entry = apply_filters( 'artes_seo_archive_meta', $entry, $post_type );

	return array(
		'title'       => artes_seo_clean_text( isset( $entry['title'] ) ? $entry['title'] : '' ),
		'description' => artes_seo_clean_text( isset( $entry['description'] ) ? $entry['description'] : '' ),
	);
}

/**
 * Registra i meta SEO dedicati su pagine e CPT (priorità 20 per eseguirsi dopo la registrazione dei CPT JetEngine).
 */
add_action(
	'init',
	function () {
		$args = array(
			'single'            => true,
			'type'              => 'string',
			'sanitize_callback' => 'artes_seo_clean_text',
			'show_in_rest'      => false,
			'auth_callback'     => function () {
				return current_user_can( 'edit_posts' );
			},
		);

		foreach ( array( 'page', 'realizzazione', 'brand' ) as $post_type ) {
			register_post_meta( $post_type, '_artes_seo_title', $args );
			register_post_meta( $post_type, '_artes_seo_description', $args );
		}
	},
	20
);

/**
 * Calcola titolo e descrizione SEO per un singolo contenuto (pagina, realizzazione o brand).
 * I campi meta `_artes_seo_title` e `_artes_seo_description` hanno sempre precedenza come override.
 */
function artes_seo_for_post( $post_id ) {
	$post_id = (int) $post_id;

	if ( $post_id <= 0 ) {
		return array(
			'title'       => '',
			'description' => '',
		);
	}

	$title = artes_seo_clean_text( get_post_meta( $post_id, '_artes_seo_title', true ) );
	$desc  = artes_seo_clean_text( get_post_meta( $post_id, '_artes_seo_description', true ) );
	$type  = get_post_type( $post_id );

	if ( 'realizzazione' === $type ) {
		$post_title = artes_seo_clean_text( get_post_field( 'post_title', $post_id, 'raw' ) );

		if ( '' === $title && '' !== $post_title ) {
			$kw    = artes_seo_clean_text( get_post_meta( $post_id, 'kw', true ) );
			$title = '' !== $kw ? $kw . ': ' . $post_title . ' — Artes' : $post_title . ' — Artes';
		}

		if ( '' === $desc ) {
			$localita = artes_seo_clean_text( get_post_meta( $post_id, 'localita', true ) );
			$intro    = artes_seo_clean_text( get_post_meta( $post_id, 'introduzione', true ) );

			if ( '' !== $post_title && '' !== $localita && '' !== $intro ) {
				$desc = $post_title . ', ' . $localita . ': ' . $intro;
			} elseif ( '' !== $post_title && '' !== $intro ) {
				$desc = $post_title . ': ' . $intro;
			} elseif ( '' !== $intro ) {
				$desc = $intro;
			}
		}
	} elseif ( 'brand' === $type ) {
		$post_title = artes_seo_clean_text( get_post_field( 'post_title', $post_id, 'raw' ) );

		if ( '' === $title && '' !== $post_title ) {
			$title = $post_title . ' — Brand partner Artes';
		}

		if ( '' === $desc && '' !== $post_title ) {
			$cat_term = artes_primo_termine( $post_id, 'categoria_brand' );
			$cat_name = $cat_term ? artes_seo_clean_text( $cat_term->name ) : '';

			if ( '' !== $cat_name ) {
				$desc = $post_title . ', brand partner Artes per la categoria ' . $cat_name . ': dove lo usiamo, come lo coordiniamo con gli arredi su misura e le realizzazioni collegate.';
			} else {
				$desc = $post_title . ', brand partner Artes: dove lo usiamo, come lo coordiniamo con gli arredi su misura e le realizzazioni collegate.';
			}
		}
	}

	return array(
		'title'       => $title,
		'description' => $desc,
	);
}

/**
 * Risolve titolo e meta description per la richiesta corrente (con cache solo dopo l'azione `wp`).
 */
function artes_seo_data() {
	static $cache = null;

	if ( null !== $cache && did_action( 'wp' ) ) {
		return $cache;
	}

	$data    = array(
		'title'       => '',
		'description' => '',
	);
	$context = 'other';

	if ( ! is_admin() && ! is_feed() && ! is_404() && ! is_search() ) {
		if ( is_front_page() ) {
			$context = 'front_page';
			$post_id = (int) get_queried_object_id();

			if ( $post_id <= 0 && 'page' === get_option( 'show_on_front' ) ) {
				$post_id = (int) get_option( 'page_on_front' );

				if ( $post_id > 0 ) {
					$post_id = (int) apply_filters( 'wpml_object_id', $post_id, 'page', true );
				}
			}

			if ( $post_id > 0 ) {
				$data = artes_seo_for_post( $post_id );
			}
		} elseif ( is_singular() ) {
			$post_id = (int) get_queried_object_id();
			$context = 'singular:' . (string) get_post_type( $post_id );
			$data    = artes_seo_for_post( $post_id );
		} elseif ( is_post_type_archive( array( 'realizzazione', 'brand' ) ) ) {
			$post_type = is_post_type_archive( 'realizzazione' ) ? 'realizzazione' : 'brand';
			$context   = 'archive:' . $post_type;
			$data      = artes_seo_get_archive_meta( $post_type );
		}
	}

	$data['title']       = artes_seo_clean_text( apply_filters( 'artes_seo_title', $data['title'], $context ) );
	$data['description'] = artes_seo_clean_text( apply_filters( 'artes_seo_description', $data['description'], $context ) );

	if ( did_action( 'wp' ) ) {
		$cache = $data;
	}

	return $data;
}

/**
 * Titolo del documento via `pre_get_document_title` (usato da `_wp_render_title_tag()` di WordPress + Hello Elementor:
 * evita `<title>` duplicati e bypassa `wptexturize`, mantenendo i testi identici alla rev2).
 */
add_filter(
	'pre_get_document_title',
	function ( $title ) {
		$seo = artes_seo_data();

		if ( '' !== $seo['title'] ) {
			return esc_html( $seo['title'] );
		}

		return $title;
	},
	20
);

/**
 * Evita un `<meta name="description">` duplicato dal tema Hello Elementor (che lo stampa dall'estratto sulle pagine singole).
 */
add_filter(
	'hello_elementor_description_meta_tag',
	function ( $enabled ) {
		$seo = artes_seo_data();

		return '' !== $seo['description'] ? false : $enabled;
	}
);

/**
 * Stampa `<meta name="description">` in `wp_head` subito dopo `<title>`.
 */
add_action(
	'wp_head',
	function () {
		$seo = artes_seo_data();

		if ( '' !== $seo['description'] ) {
			echo '<meta name="description" content="' . esc_attr( $seo['description'] ) . '">' . "\n";
		}
	},
	2
);
