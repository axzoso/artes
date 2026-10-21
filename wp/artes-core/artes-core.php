<?php
/**
 * Plugin Name: ARTES Core
 * Description: Logica su misura del sito ARTES: dati dei cicli Elementor (galleria, brand collegati, altre realizzazioni), shortcode (selettore lingua, titolo), voce di menu attiva, ordine dell'archivio e CSS del sito.
 * Version:     0.3.5
 *
 * Elementor chiama `elementor/query/<query_id>` prima di eseguire la query di un
 * widget Loop: il "Query ID" del widget è il nome del filtro, non una query del
 * Query Builder di JetEngine. Qui sta la logica che il builder non offre di serie.
 *
 * Si installa come plugin (cartella artes-core con questo file e artes-core.css):
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

define( 'ARTES_CORE_VERSION', '0.3.5' );

/**
 * CSS del sito (menu, header sticky, hover, archivio): vive nel plugin, non nel database
 * di Elementor, quindi viaggia con il plugin in produzione. Si carica per ultimo perché
 * deve prevalere sui CSS del tema e di Elementor.
 */
add_action(
	'wp_enqueue_scripts',
	function () {
		$file = plugin_dir_path( __FILE__ ) . 'artes-core.css';

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
 * ID del post della pagina corrente (la scheda realizzazione mostrata).
 */
function artes_current_post_id() {
	$id = get_queried_object_id();

	return $id ? $id : (int) get_the_ID();
}

/**
 * ID dei brand collegati a una realizzazione tramite la relazione JetEngine
 * realizzazione -> brand. Array vuoto se non ce ne sono.
 */
function artes_related_brand_ids( $post_id ) {
	if ( ! function_exists( 'jet_engine' ) || empty( jet_engine()->relations ) ) {
		return array();
	}

	foreach ( (array) jet_engine()->relations->get_active_relations() as $relation ) {
		if (
			'posts::realizzazione' === $relation->get_args( 'parent_object' )
			&& 'posts::brand' === $relation->get_args( 'child_object' )
		) {
			// get_children() restituisce le righe della tabella della relazione.
			$rows = (array) $relation->get_children( $post_id );

			return array_filter( array_map( 'absint', wp_list_pluck( $rows, 'child_object_id' ) ) );
		}
	}

	return array();
}

/**
 * Selettore lingua per la topbar: [artes_lingue] -> "IT / EN".
 *
 * Usa il filtro `wpml_active_languages`. Il codice mostrato è il prefisso a due
 * lettere della lingua (en-gb -> EN); la lingua corrente non è un link.
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
 * Titolo della scheda con l'ultima parola in grassetto, come nel mockup:
 * "Boutique Hotel <strong>Aurea</strong>". Si usa nel widget titolo tramite il
 * tag dinamico "Shortcode": [artes_titolo].
 */
add_shortcode(
	'artes_titolo',
	function () {
		$title = trim( wp_strip_all_tags( get_the_title( artes_current_post_id() ) ) );
		$words = preg_split( '/\s+/', $title );

		if ( ! $words || '' === $words[0] ) {
			return '';
		}

		$last = array_pop( $words );

		return ( $words ? esc_html( implode( ' ', $words ) ) . ' ' : '' ) . '<strong>' . esc_html( $last ) . '</strong>';
	}
);

/**
 * "Settore — ambito" della realizzazione corrente, per la riga "Settore" dei
 * dettagli tecnici: [artes_settore_ambito]. L'ambito si omette se è vuoto.
 */
add_shortcode(
	'artes_settore_ambito',
	function () {
		$id    = artes_current_post_id();
		$terms = wp_get_object_terms( $id, 'settore', array( 'fields' => 'names' ) );
		$out   = ( $terms && ! is_wp_error( $terms ) ) ? $terms[0] : '';
		$sub   = (string) get_post_meta( $id, 'sottotitolo_ambito', true );

		if ( '' !== $sub ) {
			$out .= ( '' !== $out ? ' — ' : '' ) . $sub;
		}

		return esc_html( $out );
	}
);

/**
 * Scheda brand: [artes_categoria_brand] -> "Contract — Sedute e sistemi operativi" (categoria
 * più, se c'è, la categoria estesa del campo `sottotitolo_categoria`).
 */
add_shortcode(
	'artes_categoria_brand',
	function () {
		$id    = artes_current_post_id();
		$terms = wp_get_object_terms( $id, 'categoria_brand', array( 'fields' => 'names' ) );
		$out   = ( $terms && ! is_wp_error( $terms ) ) ? $terms[0] : '';
		$sub   = trim( (string) get_post_meta( $id, 'sottotitolo_categoria', true ) );

		if ( '' !== $sub ) {
			$out .= ( '' !== $out ? ' — ' : '' ) . $sub;
		}

		return esc_html( $out );
	}
);

/**
 * Scheda brand: [artes_categorie_prodotto] -> elenco delle categorie prodotto. Il campo
 * `categorie_prodotto` ha una voce per riga, nel formato "Nome | Ambito".
 */
add_shortcode(
	'artes_categorie_prodotto',
	function () {
		$righe = preg_split( '/\r\n|\r|\n/', (string) get_post_meta( artes_current_post_id(), 'categorie_prodotto', true ) );
		$out   = '';

		foreach ( (array) $righe as $riga ) {
			$parti = array_map( 'trim', explode( '|', $riga, 2 ) );

			if ( '' === $parti[0] ) {
				continue;
			}

			$out .= '<li class="cat-prodotto"><span class="cat-prodotto-n">' . esc_html( $parti[0] ) . '</span>';

			if ( ! empty( $parti[1] ) ) {
				$out .= '<span class="cat-prodotto-c">' . esc_html( $parti[1] ) . '</span>';
			}

			$out .= '</li>';
		}

		return '' === $out ? '' : '<ul class="cat-prodotto-lista">' . $out . '</ul>';
	}
);

/**
 * Voce di menu "Realizzazioni" attiva anche sulle schede e sull'archivio dei
 * settori, come in shell.js (data-nav-alias="realizzazione-*"). La voce è un
 * link personalizzato, quindi WordPress non la riconosce da solo.
 */
add_filter(
	'nav_menu_css_class',
	function ( $classes, $item ) {
		// "Tutti" nel filtro dei brand: attiva solo sull'archivio completo, non sulle categorie.
		if ( 'custom' === $item->type && in_array( 'filtro-tutti-brand', (array) $classes, true ) ) {
			if ( is_post_type_archive( 'brand' ) ) {
				$classes[] = 'current-menu-item';
			}

			return $classes;
		}

		if ( 'custom' !== $item->type || false === strpos( (string) $item->url, '/realizzazioni' ) ) {
			return $classes;
		}

		// "Tutti" nel filtro dell'archivio: attiva solo sull'archivio completo, non sui settori.
		if ( in_array( 'filtro-tutti', (array) $classes, true ) ) {
			if ( is_post_type_archive( 'realizzazione' ) ) {
				$classes[] = 'current-menu-item';
			}

			return $classes;
		}

		if ( is_singular( 'realizzazione' ) || is_post_type_archive( 'realizzazione' ) || is_tax( 'settore' ) ) {
			$classes[] = 'current-menu-item';
		}

		return $classes;
	},
	10,
	2
);

/**
 * Archivio realizzazioni e pagine dei settori: 12 progetti per pagina (il default di
 * WordPress è 10 e va bene per gli articoli, non per questa griglia a 3 colonne).
 */
add_action(
	'pre_get_posts',
	function ( $query ) {
		if ( is_admin() || ! $query->is_main_query() ) {
			return;
		}

		if ( $query->is_post_type_archive( 'realizzazione' ) || $query->is_tax( 'settore' ) ) {
			$query->set( 'posts_per_page', 12 );
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
 * Elenco progetti di una pagina settore: le realizzazioni del settore indicato nel campo
 * "Settore collegato" della pagina (meta `settore_collegato`, slug del termine). Il termine si
 * cerca nella lingua corrente (WPML). Senza settore valido non mostra nulla.
 */
add_action(
	'elementor/query/artes_progetti_settore',
	function ( $query ) {
		$slug = (string) get_post_meta( artes_current_post_id(), 'settore_collegato', true );
		$term = $slug ? get_term_by( 'slug', $slug, 'settore' ) : false;

		$query->set( 'post_type', 'realizzazione' );
		$query->set( 'posts_per_page', 6 );
		$query->set(
			'orderby',
			array(
				'menu_order' => 'ASC',
				'date'       => 'DESC',
			)
		);

		if ( ! $term ) {
			$query->set( 'post__in', array( 0 ) );

			return;
		}

		$term_id = (int) apply_filters( 'wpml_object_id', $term->term_id, 'settore', true );
		$query->set(
			'tax_query',
			array(
				array(
					'taxonomy' => 'settore',
					'field'    => 'term_id',
					'terms'    => array( $term_id ),
				),
			)
		);
	}
);

/**
 * Home: gli ultimi progetti (6, nell'ordine dell'archivio) e il muro dei brand (tutti, nell'ordine
 * di inserimento).
 */
add_action(
	'elementor/query/artes_progetti_home',
	function ( $query ) {
		$query->set( 'post_type', 'realizzazione' );
		$query->set( 'posts_per_page', 6 );
		$query->set(
			'orderby',
			array(
				'menu_order' => 'ASC',
				'date'       => 'DESC',
			)
		);
	}
);

add_action(
	'elementor/query/artes_brand_home',
	function ( $query ) {
		$query->set( 'post_type', 'brand' );
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
 * Le pagine costruite con Elementor hanno già il proprio titolo (h1): si toglie quello che il tema
 * Hello Elementor aggiunge sopra il contenuto.
 */
add_filter( 'hello_elementor_page_title', '__return_false' );

/**
 * Brand collegati alla realizzazione corrente.
 */
add_action(
	'elementor/query/artes_brand_collegati',
	function ( $query ) {
		$ids = artes_related_brand_ids( artes_current_post_id() );

		$query->set( 'post_type', 'brand' );
		$query->set( 'post__in', $ids ? $ids : array( 0 ) );
		$query->set( 'orderby', 'post__in' );
		$query->set( 'posts_per_page', -1 );
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