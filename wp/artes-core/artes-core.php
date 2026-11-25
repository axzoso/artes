<?php
/**
 * Plugin Name: ARTES Core
 * Description: Logica su misura del sito ARTES (rev2): modalità globale rev2, dati dei cicli Elementor, shortcode, redirect 301, SEO on-page, i18n/WPML, gestione allegati moduli e asset CSS/JS del sito.
 * Version:     1.0.4
 * Text Domain: artes-core
 * Domain Path: /languages
 *
 * Elementor chiama `elementor/query/<query_id>` prima di eseguire la query di un
 * widget Loop: il "Query ID" del widget è il nome del filtro, non una query del
 * Query Builder di JetEngine. Qui sta la logica che il builder non offre di serie.
 *
 * Si installa come plugin (cartella artes-core con questo file, wpml-config.xml,
 * languages/ e gli asset): tools/install-plugin.ps1 su dev3, upload dello ZIP in produzione.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

// Se esiste una seconda copia caricata prima (es. la vecchia copia della sandbox di
// Novamira su dev3), questa non si carica: evita funzioni e hook duplicati.
if ( defined( 'ARTES_CORE_VERSION' ) ) {
	return;
}

define( 'ARTES_CORE_VERSION', '1.0.4' );

// Pagina "ARTES" nel menu di amministrazione (impostazioni, controlli, manutenzione, guida) e riquadro "SEO ARTES" negli editor.
if ( is_admin() ) {
	require_once __DIR__ . '/admin/artes-admin.php';
}

/**
 * ===== Internazionalizzazione (i18n) e compatibilità WPML (0.10.0) ==========================================
 */

add_action(
	'init',
	function () {
		load_plugin_textdomain( 'artes-core', false, dirname( plugin_basename( __FILE__ ) ) . '/languages' );
	},
	1
);

/**
 * Codice lingua corrente normalizzato (es. `it`, `en-gb`, `en`).
 */
function artes_current_lang() {
	$lang = apply_filters( 'wpml_current_language', null );

	if ( is_string( $lang ) && '' !== $lang ) {
		return strtolower( $lang );
	}

	$locale = function_exists( 'determine_locale' ) ? determine_locale() : get_locale();

	return strtolower( str_replace( '_', '-', (string) $locale ) );
}

/**
 * Vero quando la lingua corrente è inglese (`en`, `en-gb`, `en-us`, …).
 */
function artes_is_english() {
	$lang = artes_current_lang();

	return 'en' === $lang || 0 === strpos( $lang, 'en-' ) || 0 === strpos( $lang, 'en_' );
}

/**
 * Catalogo inglese integrato (`en-GB`) per tutte le stringhe del plugin:
 * garantisce copertura immediata su `/en/` e resta sempre sovrascrivibile da
 * WPML String Translation (`wpml_translate_single_string`, dominio `artes-core`)
 * o da un file `.mo` compilato in `languages/`.
 */
function artes_en_dictionary() {
	static $dict = null;

	if ( null !== $dict ) {
		return $dict;
	}

	$dict = array(
		// Email allegati.
		'email_in_allegato'                 => '(attached)',
		// Motivi modulo Contatti.
		'motivo_informazioni'               => 'General enquiries',
		'motivo_tecnico'                    => 'Speak with a technician',
		'motivo_progettisti'                => 'Collaboration for architects and studios',
		'motivo_pa'                         => 'Public administration and MEPA',
		'motivo_assistenza'                 => 'After-sales support',
		'motivo_fornitori'                  => 'Suppliers and partners',
		'motivo_lavoro'                     => 'Careers',
		// Breadcrumb e shortcode schede/archivi.
		'breadcrumb_home'                   => 'Home',
		'breadcrumb_brand'                  => 'Brand partners',
		'breadcrumb_realizzazioni'          => 'Projects',
		'galleria_titolo_singolare'         => 'Photo gallery · %d photo',
		'galleria_titolo_plurale'           => 'Photo gallery · %d photos',
		'scopri_arredo_testo'               => 'Explore %s',
		'cta_brand'                         => '%s furniture<br>for your space?',
		'correlate_titolo'                  => 'More projects — %s',
		'correlate_titolo_vuoto'            => 'More projects',
		'eyebrow_brand'                     => 'Brand partner — %s',
		'eyebrow_brand_vuoto'               => 'Brand partner',
		'come_titolo'                       => 'How we work with %s',
		'correlate_brand_titolo'            => 'Projects with %s',
		// SEO archivi e schede brand.
		'seo_archive_realizzazione_title'   => 'Bespoke furniture projects — Artes',
		'seo_archive_realizzazione_desc'    => 'Artes projects for offices, retail stores, bars and restaurants, food shops and hotels: bespoke furniture case studies designed, crafted and installed, filterable by sector and category.',
		'seo_archive_brand_title'           => 'Brand Partners — ARTES Contract',
		'seo_archive_brand_desc'            => 'The partner brands Artes works with: office furniture, contract seating, acoustics, stone surfaces and outdoor furniture. Each brand is linked to the projects in which it was used.',
		'seo_brand_title'                   => '%s — Artes Brand Partner',
		'seo_brand_desc_cat'                => '%1$s, Artes brand partner for %2$s: where we use it, how we coordinate it with bespoke furniture and related projects.',
		'seo_brand_desc'                    => '%s, Artes brand partner: where we use it, how we coordinate it with bespoke furniture and related projects.',
		// UI e ARIA JavaScript (artes-rev2.js).
		'js_tutti'                          => 'All',
		'js_tutte'                          => 'All',
		'js_tutti_settori'                  => 'All sectors',
		'js_nav_principale'                 => 'Main navigation',
		'js_nav_mobile'                     => 'Mobile navigation',
		'js_apri_menu'                      => 'Open menu',
		'js_chiudi_menu'                    => 'Close menu',
		'js_foto_in_arrivo'                 => 'Photo coming soon',
		'js_dati_servizio'                  => 'Key service facts',
		'js_indice_pagina'                  => 'Page index',
		'js_controlli_slider'               => 'Production gallery controls',
		'js_galleria_dialog'                => 'Photo gallery',
		'js_chiudi'                         => 'Close',
		'js_precedente'                     => 'Previous photo',
		'js_successiva'                     => 'Next photo',
		'js_foto_di'                        => '{titolo} — photo {n} of {tot}',
		'js_apri_immagine'                  => 'Open photo {n} of {tot}',
		'js_filtra_settore'                 => 'Filter by sector',
		'js_filtra_categoria_di'            => 'Filter {settore} by category',
		'js_filtra_categoria'               => 'Filter by category',
		'js_progetto_uno'                   => '1 project',
		'js_progetti_molti'                 => '{n} projects',
		'js_nessun_progetto'                => 'No published projects in this category.',
	);

	return $dict;
}

/**
 * Traduce una stringa del plugin nel dominio `artes-core`.
 * Ordine di precedenza:
 * 1. Override esplicito da WPML String Translation (`wpml_translate_single_string`), se presente;
 * 2. Traduzione gettext WordPress (`_x()` se `$context` è valorizzato, altrimenti `__()`, da file `.mo` o hook WPML ST);
 * 3. Catalogo inglese integrato (`artes_en_dictionary()`) quando la lingua corrente è EN;
 * 4. Testo sorgente italiano immutato.
 */
function artes_t( $text, $name = '', $context = '' ) {
	$text    = (string) $text;
	$name    = (string) $name;
	$context = (string) $context;

	if ( '' !== $name && has_filter( 'wpml_translate_single_string' ) ) {
		$st = apply_filters( 'wpml_translate_single_string', $text, 'artes-core', $name );

		if ( is_string( $st ) && '' !== $st && $st !== $text ) {
			return $st;
		}
	}

	if ( '' !== $context ) {
		$translated = _x( $text, $context, 'artes-core' ); // phpcs:ignore WordPress.WP.I18n.NonSingularStringLiteralText,WordPress.WP.I18n.NonSingularStringLiteralContext
	} else {
		$translated = __( $text, 'artes-core' ); // phpcs:ignore WordPress.WP.I18n.NonSingularStringLiteralText
	}

	if ( $translated !== $text ) {
		return $translated;
	}

	if ( artes_is_english() ) {
		$dict = artes_en_dictionary();

		if ( '' !== $name && isset( $dict[ $name ] ) ) {
			return $dict[ $name ];
		}

		if ( isset( $dict[ $text ] ) ) {
			return $dict[ $text ];
		}
	}

	return $text;
}

/**
 * Mette in minuscolo solo la prima lettera UTF-8, preservando gli acronimi (es. "MEPA", "PA").
 */
function artes_lcfirst_utf8( $text ) {
	$text = (string) $text;

	if ( '' === $text ) {
		return '';
	}

	if ( function_exists( 'mb_substr' ) && function_exists( 'mb_strtolower' ) ) {
		$first  = mb_substr( $text, 0, 1, 'UTF-8' );
		$second = mb_substr( $text, 1, 1, 'UTF-8' );

		if ( '' !== $second && $second === mb_strtoupper( $second, 'UTF-8' ) && $second !== mb_strtolower( $second, 'UTF-8' ) ) {
			return $text;
		}

		return mb_strtolower( $first, 'UTF-8' ) . mb_substr( $text, 1, null, 'UTF-8' );
	}

	return lcfirst( $text );
}

/**
 * Workaround al bug WPML 5.2.0 (`WPML_Locale::_language_attributes()` sovrascrive `lang="..."`
 * riportandolo a `it-IT` sulle pagine `/en/*` perché il globale `$locale` resta `it_IT`).
 * Aggiorna `lang="..."` al tag BCP-47 della lingua WPML attiva (es. `en-GB`), senza toccare `it-IT`.
 */
add_filter(
	'language_attributes',
	function ( $output ) {
		$current = apply_filters( 'wpml_current_language', null );

		if ( ! is_string( $current ) || '' === $current ) {
			return $output;
		}

		$default = apply_filters( 'wpml_default_language', null );

		if ( is_string( $default ) && $current === $default ) {
			return $output;
		}

		$tag       = '';
		$languages = apply_filters( 'wpml_active_languages', null, array( 'skip_missing' => 0 ) );

		if ( is_array( $languages ) && ! empty( $languages[ $current ]['tag'] ) ) {
			$tag = (string) $languages[ $current ]['tag'];
		} elseif ( 'en-gb' === strtolower( $current ) ) {
			$tag = 'en-GB';
		} elseif ( 'en' === strtolower( $current ) ) {
			$tag = 'en';
		} else {
			$tag = str_replace( '_', '-', $current );
		}

		if ( '' === $tag ) {
			return $output;
		}

		$escaped = esc_attr( $tag );

		if ( preg_match( '/\blang=(["\'])[^"\']*\1/i', (string) $output ) ) {
			return (string) preg_replace( '/\blang=(["\'])[^"\']*\1/i', 'lang="' . $escaped . '"', (string) $output, 1 );
		}

		return trim( (string) $output . ' lang="' . $escaped . '"' );
	},
	99
);

/**
 * URL home nella lingua corrente WPML (coerente su frontend, REST e CLI).
 */
function artes_home_url( $path = '/' ) {
	$base = (string) apply_filters( 'wpml_home_url', home_url( '/' ) );

	if ( '' === $base ) {
		$base = (string) home_url( '/' );
	}

	$base = trailingslashit( $base );
	$rel  = ltrim( (string) $path, '/' );

	return '' === $rel ? $base : $base . $rel;
}

/**
 * URL dell'archivio CPT nella lingua corrente WPML (coerente su frontend, REST e CLI).
 */
function artes_archive_url( $post_type ) {
	$url = (string) get_post_type_archive_link( $post_type );

	if ( '' === $url ) {
		return '';
	}

	$current = apply_filters( 'wpml_current_language', null );
	$default = apply_filters( 'wpml_default_language', null );

	if ( is_string( $current ) && '' !== $current && $current !== $default ) {
		$converted = (string) apply_filters( 'wpml_permalink', $url, $current );

		if ( '' !== $converted && $converted !== $url ) {
			return $converted;
		}

		$lang_home = artes_home_url( '/' );
		$raw_home  = trailingslashit( (string) home_url( '/' ) );

		if ( $lang_home !== $raw_home && 0 === strpos( $url, $raw_home ) && 0 !== strpos( $url, $lang_home ) ) {
			$url = $lang_home . ltrim( substr( $url, strlen( $raw_home ) ), '/' );
		}
	}

	return $url;
}

/**
 * Estrae il pathname normalizzato senza slash finale (eccetto `'/'`).
 */
function artes_url_path( $url ) {
	$path = wp_parse_url( (string) $url, PHP_URL_PATH );

	if ( ! is_string( $path ) || '' === $path ) {
		return '/';
	}

	$norm = rtrim( $path, '/' );

	return '' === $norm ? '/' : $norm;
}

/**
 * Risolve il pathname localizzato di una pagina WP a partire dallo slug italiano canonico.
 */
function artes_page_route( $slug ) {
	$page_id = 0;
	$page    = get_page_by_path( $slug );

	if ( $page instanceof WP_Post ) {
		$page_id = (int) $page->ID;
	} else {
		$found = get_posts(
			array(
				'post_type'        => 'page',
				'name'             => $slug,
				'post_status'      => 'publish',
				'numberposts'      => 1,
				'suppress_filters' => true,
				'fields'           => 'ids',
			)
		);

		if ( ! empty( $found ) ) {
			$page_id = (int) $found[0];
		}
	}

	if ( $page_id <= 0 ) {
		return '';
	}

	$translated_id = (int) apply_filters( 'wpml_object_id', $page_id, 'page', true );
	$target_id     = $translated_id > 0 ? $translated_id : $page_id;
	$permalink     = (string) get_permalink( $target_id );

	return '' !== $permalink ? artes_url_path( $permalink ) : '';
}

/**
 * Legge un term meta con fallback automatico sul termine nella lingua predefinita WPML
 * (evita filtri/link rotti se i term meta non sono ancora stati sincronizzati su un termine tradotto).
 */
function artes_term_meta_with_fallback( $term_id, $taxonomy, $meta_key ) {
	$term_id = (int) $term_id;
	$val     = get_term_meta( $term_id, $meta_key, true );

	if ( '' !== $val && false !== $val && null !== $val ) {
		return $val;
	}

	$default = apply_filters( 'wpml_default_language', null );

	if ( is_string( $default ) && '' !== $default ) {
		$orig_id = (int) apply_filters( 'wpml_object_id', $term_id, $taxonomy, false, $default );

		if ( $orig_id > 0 && $orig_id !== $term_id ) {
			return get_term_meta( $orig_id, $meta_key, true );
		}
	}

	return $val;
}

/**
 * Slug del termine nella lingua predefinita WPML (utile per mappare slug canonici `uffici`, `retail`, …).
 */
function artes_term_original_slug( $term, $taxonomy ) {
	if ( ! $term instanceof WP_Term ) {
		return '';
	}

	$default = apply_filters( 'wpml_default_language', null );

	if ( is_string( $default ) && '' !== $default ) {
		$orig_id = (int) apply_filters( 'wpml_object_id', (int) $term->term_id, $taxonomy, false, $default );

		if ( $orig_id > 0 && $orig_id !== (int) $term->term_id ) {
			// Non get_term(): con "Adjust IDs" WPML lo riporterebbe al termine della lingua corrente (slug EN).
			global $wpdb;
			$slug = $wpdb->get_var( $wpdb->prepare( "SELECT slug FROM {$wpdb->terms} WHERE term_id = %d", $orig_id ) ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery

			if ( is_string( $slug ) && '' !== $slug ) {
				return $slug;
			}
		}
	}

	return (string) $term->slug;
}

/**
 * CSS, caratteri e JavaScript del sito (design rev2, l'unico dal 2026-11-25): si caricano per ultimi perché devono prevalere
 * sui CSS del tema e di Elementor.
 */
add_action(
	'wp_enqueue_scripts',
	function () {
		if ( artes_is_rev2() ) {
			artes_enqueue_rev2();
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
		$nota = artes_t( '(in allegato)', 'email_in_allegato' );

		return preg_replace_callback(
			'#https?://[^\s<"]*/uploads/elementor/forms/([^\s<"]+)#',
			function ( $m ) use ( $nota ) {
				return rawurldecode( $m[1] ) . ' ' . $nota;
			},
			(string) $message
		);
	}
);

/**
 * Indice canonico dei 5 settori rev2 nella select `#richiesta_settore` (opzione 0 = "Seleziona").
 */
function artes_settori_indici_canonici() {
	return array(
		'uffici'         => 1,
		'retail'         => 2,
		'bar-ristoranti' => 3,
		'food'           => 4,
		'hospitality'    => 5,
	);
}

/**
 * Calcola i dati language-safe per la preselezione di `#richiesta_settore` e `#motivo` nel modulo Contatti.
 * Supporta `?motivo=<slug>` e `?settore=<slug|nome>` (o il settore della realizzazione corrente),
 * restituendo `{ key, label, index }` così il JS nel footer seleziona l'opzione giusta sia in IT sia in EN.
 */
function artes_form_preselection_data( $settore_input = '', $motivo_input = '', $settore_term = null ) {
	$motivi_map = array(
		'informazioni' => array(
			'index' => 0,
			'label' => artes_t( 'Informazioni generali', 'motivo_informazioni' ),
		),
		'tecnico'      => array(
			'index' => 1,
			'label' => artes_t( 'Parlare con un tecnico', 'motivo_tecnico' ),
		),
		'progettisti'  => array(
			'index' => 2,
			'label' => artes_t( 'Collaborazione per studi e progettisti', 'motivo_progettisti' ),
		),
		'pa'           => array(
			'index' => 3,
			'label' => artes_t( 'Pubblica amministrazione e MEPA', 'motivo_pa' ),
		),
		'assistenza'   => array(
			'index' => 4,
			'label' => artes_t( 'Assistenza su una fornitura', 'motivo_assistenza' ),
		),
		'fornitori'    => array(
			'index' => 5,
			'label' => artes_t( 'Fornitori e partner', 'motivo_fornitori' ),
		),
		'lavoro'       => array(
			'index' => 6,
			'label' => artes_t( 'Lavora con noi', 'motivo_lavoro' ),
		),
	);

	$motivo_key  = sanitize_key( (string) $motivo_input );
	$motivo_data = null;

	if ( '' !== $motivo_key && isset( $motivi_map[ $motivo_key ] ) ) {
		$motivo_data = array(
			'key'   => $motivo_key,
			'label' => $motivi_map[ $motivo_key ]['label'],
			'index' => $motivi_map[ $motivo_key ]['index'],
		);
	}

	$settore_data = null;
	$indici       = artes_settori_indici_canonici();
	$raw_settore  = trim( html_entity_decode( (string) $settore_input, ENT_QUOTES | ENT_HTML5, 'UTF-8' ) );

	if ( $settore_term instanceof WP_Term ) {
		$orig_slug = artes_term_original_slug( $settore_term, 'settore' );
		$ordine    = (int) artes_term_meta_with_fallback( $settore_term->term_id, 'settore', 'ordine' );
		$idx       = isset( $indici[ $orig_slug ] ) ? $indici[ $orig_slug ] : ( $ordine > 0 ? $ordine : -1 );

		$settore_data = array(
			'key'   => '' !== $orig_slug ? $orig_slug : (string) $settore_term->slug,
			'label' => html_entity_decode( (string) $settore_term->name, ENT_QUOTES | ENT_HTML5, 'UTF-8' ),
			'index' => $idx,
		);
	} elseif ( '' !== $raw_settore ) {
		$norm_in = strtolower( $raw_settore );
		$slug_in = sanitize_title( $raw_settore );
		$matched = null;

		if ( taxonomy_exists( 'settore' ) ) {
			$terms = get_terms(
				array(
					'taxonomy'   => 'settore',
					'hide_empty' => false,
				)
			);

			if ( ! is_wp_error( $terms ) ) {
				foreach ( (array) $terms as $t ) {
					$t_name = html_entity_decode( (string) $t->name, ENT_QUOTES | ENT_HTML5, 'UTF-8' );
					$t_orig = artes_term_original_slug( $t, 'settore' );
					$t_it   = '';
					$default = apply_filters( 'wpml_default_language', null );

					if ( is_string( $default ) && '' !== $default ) {
						$orig_id = (int) apply_filters( 'wpml_object_id', (int) $t->term_id, 'settore', false, $default );

						if ( $orig_id > 0 && $orig_id !== (int) $t->term_id ) {
							$orig_term = get_term( $orig_id, 'settore' );

							if ( $orig_term instanceof WP_Term ) {
								$t_it = html_entity_decode( (string) $orig_term->name, ENT_QUOTES | ENT_HTML5, 'UTF-8' );
							}
						}
					}

					if (
						strtolower( (string) $t->slug ) === $norm_in
						|| strtolower( $t_orig ) === $norm_in
						|| strtolower( (string) $t->slug ) === $slug_in
						|| strtolower( $t_orig ) === $slug_in
						|| strtolower( $t_name ) === $norm_in
						|| ( '' !== $t_it && strtolower( $t_it ) === $norm_in )
					) {
						$matched = $t;
						break;
					}
				}
			}
		}

		if ( $matched instanceof WP_Term ) {
			$orig_slug = artes_term_original_slug( $matched, 'settore' );
			$ordine    = (int) artes_term_meta_with_fallback( $matched->term_id, 'settore', 'ordine' );
			$idx       = isset( $indici[ $orig_slug ] ) ? $indici[ $orig_slug ] : ( $ordine > 0 ? $ordine : -1 );

			$settore_data = array(
				'key'   => '' !== $orig_slug ? $orig_slug : (string) $matched->slug,
				'label' => html_entity_decode( (string) $matched->name, ENT_QUOTES | ENT_HTML5, 'UTF-8' ),
				'index' => $idx,
			);
		} else {
			$idx = isset( $indici[ $slug_in ] ) ? $indici[ $slug_in ] : -1;

			$settore_data = array(
				'key'   => $slug_in,
				'label' => $raw_settore,
				'index' => $idx,
			);
		}
	}

	return array(
		'settore' => $settore_data,
		'motivo'  => $motivo_data,
	);
}

/**
 * Preselezione dei menu del modulo, come nel mockup (il widget select di Elementor non accetta un valore
 * dinamico, quindi un piccolo script nel footer):
 * - "Settore" (#richiesta_settore): nelle schede realizzazione parte dal settore del progetto; altrove dal
 *   parametro ?settore= (accetta sia lo slug canonico `uffici`, `retail`, … sia il nome localizzato);
 * - "Motivo del contatto" (#motivo): dal parametro ?motivo= (informazioni, tecnico, progettisti, pa, assistenza, fornitori, lavoro).
 */
add_action(
	'wp_footer',
	function () {
		$settore_term = null;
		$settore_raw  = '';

		if ( is_singular( 'realizzazione' ) ) {
			$settore_term = artes_primo_termine( get_queried_object_id(), 'settore' );
		} elseif ( isset( $_GET['settore'] ) ) { // phpcs:ignore WordPress.Security.NonceVerification
			$settore_raw = sanitize_text_field( wp_unslash( $_GET['settore'] ) ); // phpcs:ignore WordPress.Security.NonceVerification
		}

		$motivo_raw = isset( $_GET['motivo'] ) ? sanitize_key( wp_unslash( $_GET['motivo'] ) ) : ''; // phpcs:ignore WordPress.Security.NonceVerification

		if ( ! $settore_term && '' === $settore_raw && '' === $motivo_raw ) {
			return;
		}

		$pre = artes_form_preselection_data( $settore_raw, $motivo_raw, $settore_term );

		if ( empty( $pre['settore'] ) && empty( $pre['motivo'] ) ) {
			return;
		}
		?>
<script>
(function () {
	function norm(v) { return String(v || '').replace(/\s+/g, ' ').trim().toLowerCase(); }
	function pick(id, cfg) {
		var s = document.getElementById(id);
		if (!s || !cfg) { return; }
		var lbl = norm(cfg.label);
		var key = norm(cfg.key);
		for (var i = 0; i < s.options.length; i++) {
			var ov = norm(s.options[i].value);
			var ot = norm(s.options[i].text);
			if ((lbl && (ov === lbl || ot === lbl)) || (key && ov === key)) {
				s.selectedIndex = i;
				return;
			}
		}
		if (typeof cfg.index === 'number' && cfg.index >= 0 && cfg.index < s.options.length) {
			s.selectedIndex = cfg.index;
		}
	}
	pick('richiesta_settore', <?php echo wp_json_encode( $pre['settore'] ); ?>);
	pick('motivo', <?php echo wp_json_encode( $pre['motivo'] ); ?>);
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
 * ID dell'elemento corrente dentro un ciclo Loop Elementor (priorità a `get_the_ID()`,
 * con ripiego su `artes_current_post_id()` fuori dai cicli).
 */
function artes_current_loop_post_id() {
	$id = (int) get_the_ID();

	return $id ? $id : artes_current_post_id();
}

/**
 * Selettore lingua per la topbar desktop e il menu mobile: [artes_lingue] -> "IT / EN".
 *
 * Usa il filtro `wpml_active_languages`. Il codice mostrato è il prefisso a due
 * lettere della lingua (en-gb -> EN); la lingua corrente non è un link e porta `aria-current="true"`.
 * L'attributo `hreflang` usa il tag BCP-47 completo restituito da WPML (es. `it-IT`, `en-GB`).
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
			$code     = isset( $language['language_code'] ) ? (string) $language['language_code'] : ( isset( $language['code'] ) ? (string) $language['code'] : '' );
			$label    = strtoupper( substr( $code, 0, 2 ) );
			$hreflang = ! empty( $language['tag'] ) ? (string) $language['tag'] : $code;

			if ( ! empty( $language['active'] ) ) {
				$items[] = '<span class="lang-current" aria-current="true">' . esc_html( $label ) . '</span>';
			} else {
				$items[] = '<a href="' . esc_url( $language['url'] ) . '" hreflang="' . esc_attr( $hreflang ) . '" lang="' . esc_attr( $hreflang ) . '">' . esc_html( $label ) . '</a>';
			}
		}

		return '<span class="lang-switch">' . implode( ' / ', $items ) . '</span>';
	}
);

/**
 * Archivio realizzazioni e pagine dei settori: in rev2 tutti i progetti in una pagina (filtri lato client),
 * (filtri lato browser).
 */
add_action(
	'pre_get_posts',
	function ( $query ) {
		if ( is_admin() || ! $query->is_main_query() ) {
			return;
		}

		if ( $query->is_post_type_archive( 'realizzazione' ) || $query->is_tax( 'settore' ) ) {
			$query->set( 'posts_per_page', -1 );
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
 * Risolve gli ID delle realizzazioni collegate a un brand tramite la relazione JetEngine `realizzazione -> brand`,
 * gestendo sia le righe native nella lingua corrente sia il fallback WPML sulla lingua predefinita.
 */
function artes_progetti_ids_per_brand( $brand_id ) {
	$brand_id = (int) $brand_id;
	$ids      = array();

	if ( $brand_id <= 0 || ! function_exists( 'jet_engine' ) || empty( jet_engine()->relations ) ) {
		return $ids;
	}

	$current_lang = apply_filters( 'wpml_current_language', null );
	$default_lang = apply_filters( 'wpml_default_language', null );

	foreach ( (array) jet_engine()->relations->get_active_relations() as $relation ) {
		if (
			'posts::realizzazione' === $relation->get_args( 'parent_object' )
			&& 'posts::brand' === $relation->get_args( 'child_object' )
		) {
			// 1. Dal lato del figlio (il brand corrente) si leggono i genitori (le realizzazioni).
			$rows = (array) $relation->get_parents( $brand_id );
			$ids  = array_values( array_filter( array_map( 'absint', wp_list_pluck( $rows, 'parent_object_id' ) ) ) );

			// 2. Se su una lingua non predefinita le relazioni EN non sono presenti in `jet_rel_default`,
			//    risale all'ID del brand nella lingua predefinita e recupera i genitori originali.
			if ( empty( $ids ) && is_string( $current_lang ) && is_string( $default_lang ) && '' !== $current_lang && $current_lang !== $default_lang ) {
				$orig_brand_id = (int) apply_filters( 'wpml_object_id', $brand_id, 'brand', true, $default_lang );

				if ( $orig_brand_id > 0 && $orig_brand_id !== $brand_id ) {
					$orig_rows = (array) $relation->get_parents( $orig_brand_id );
					$ids       = array_values( array_filter( array_map( 'absint', wp_list_pluck( $orig_rows, 'parent_object_id' ) ) ) );
				}
			}

			// 3. Mappa sempre ciascuna realizzazione alla lingua corrente WPML (con ripiego sull'originale se display-as-translated).
			if ( ! empty( $ids ) && is_string( $current_lang ) && '' !== $current_lang ) {
				$mapped = array();

				foreach ( $ids as $pid ) {
					$tr_id    = (int) apply_filters( 'wpml_object_id', $pid, 'realizzazione', true, $current_lang );
					$mapped[] = $tr_id > 0 ? $tr_id : $pid;
				}

				$ids = array_values( array_unique( array_filter( $mapped ) ) );
			}

			break;
		}
	}

	return $ids;
}

/**
 * Progetti in cui è stato usato il brand corrente ("Progetti con Pedrali"), via relazione
 * JetEngine realizzazione -> brand (WPML-aware).
 */
add_action(
	'elementor/query/artes_progetti_brand',
	function ( $query ) {
		$ids = artes_progetti_ids_per_brand( artes_current_post_id() );

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
 * nell'ordine in cui sono stati scelti (mappati via `wpml_object_id` se tradotti).
 */
add_action(
	'elementor/query/artes_galleria',
	function ( $query ) {
		$raw_ids = array_filter( array_map( 'absint', explode( ',', (string) get_post_meta( artes_current_post_id(), 'galleria', true ) ) ) );
		$ids     = array();

		foreach ( $raw_ids as $att_id ) {
			$mapped = (int) apply_filters( 'wpml_object_id', $att_id, 'attachment', true );
			$ids[]  = $mapped > 0 ? $mapped : $att_id;
		}

		$ids = array_values( array_unique( $ids ) );

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
 * ===== Moduli: anti-spam e modalità prova (0.10.5) ===========================================================
 *
 * Anti-spam: il campo honeypot nativo di Elementor Pro (`e-form-honeypot`, invisibile) è dentro i moduli, come ULTIMO campo
 * (prima del campo allegati farebbe perdere i file: tools/rev2/modulo-honeypot.js); in più qui si
 * scartano i messaggi con più di 3 link (tipico dello spam automatico). Il filtro non sostituisce un servizio dedicato
 * (reCAPTCHA v3 è disponibile nelle impostazioni di Elementor Pro se servirà).
 */
add_filter(
	'elementor_pro/atomic_forms/spam_check',
	function ( $is_spam, $form_fields, $widget_settings, $post_id, $form_data = array() ) {
		if ( $is_spam ) {
			return true;
		}

		$testo = '';

		foreach ( (array) $form_data as $valore ) {
			$testo .= ' ' . ( is_array( $valore ) ? implode( ' ', array_map( 'strval', $valore ) ) : (string) $valore );
		}

		// soglia modificabile da ARTES → Moduli (0 = controllo spento)
		$massimo = (int) get_option( 'artes_antispam_max_link', 3 );

		return $massimo > 0 && preg_match_all( '#https?://|www\.#i', $testo ) > $massimo;
	},
	10,
	5
);

/**
 * Modalità prova degli invii: con l'opzione `artes_prova_invio` = 1 le email del sito NON partono, vengono registrate
 * (destinatario, oggetto, testo, allegati) nell'opzione `artes_prova_invio_log` (ultime 10). Serve a collaudare i moduli
 * senza scrivere davvero al cliente. Spenta di default; la accende e la spegne tools/rev2/collaudo-modulo.js.
 */
add_filter(
	'pre_wp_mail',
	function ( $risultato, $atts ) {
		if ( ! get_option( 'artes_prova_invio' ) ) {
			return $risultato;
		}

		$log   = (array) get_option( 'artes_prova_invio_log', array() );
		$log[] = array(
			'quando'   => current_time( 'mysql' ),
			'to'       => $atts['to'] ?? '',
			'subject'  => $atts['subject'] ?? '',
			'headers'  => $atts['headers'] ?? '',
			'message'  => substr( wp_strip_all_tags( (string) ( $atts['message'] ?? '' ) ), 0, 3000 ),
			'allegati' => array_map(
				function ( $f ) {
					return array(
						'nome'  => basename( (string) $f ),
						'byte'  => file_exists( $f ) ? filesize( $f ) : null,
					);
				},
				(array) ( $atts['attachments'] ?? array() )
			),
		);
		update_option( 'artes_prova_invio_log', array_slice( $log, -10 ), false );

		return true;
	},
	10,
	2
);

/**
 * ===== Testo alternativo delle immagini per lingua (0.10.1) ===================================================
 *
 * I widget immagine di Elementor V4, le gallerie, le immagini in evidenza e le card dei cicli leggono l'alt dall'allegato
 * (`_wp_attachment_image_alt`) a ogni visualizzazione. Invece di duplicare gli allegati per lingua, ogni allegato ha il meta
 * `_artes_alt_en` (testo alternativo inglese): sul sito in inglese (WPML `en-gb`) viene restituito al posto dell'alt italiano.
 * Se manca, resta l'alt italiano. Si modifica da Media → allegato, campo "Testo alternativo (EN)"; i valori iniziali li scrive
 * tools/rev2/wpml-trad-alt.js.
 */
function artes_meta_alt_lingua() {
	$cur = apply_filters( 'wpml_current_language', null );
	$def = apply_filters( 'wpml_default_language', null );

	return ( $cur && $cur !== $def && 'en' === substr( (string) $cur, 0, 2 ) ) ? '_artes_alt_en' : '';
}

add_filter(
	'get_post_metadata',
	function ( $value, $object_id, $meta_key, $single ) {
		if ( '_wp_attachment_image_alt' !== $meta_key || is_admin() ) {
			return $value;
		}

		$chiave = artes_meta_alt_lingua();

		if ( '' === $chiave || 'attachment' !== get_post_type( $object_id ) ) {
			return $value;
		}

		$alt = (string) get_post_meta( $object_id, $chiave, true );

		if ( '' === $alt ) {
			return $value;
		}

		return $single ? $alt : array( $alt );
	},
	10,
	4
);

add_filter(
	'attachment_fields_to_edit',
	function ( $fields, $post ) {
		if ( 0 === strpos( (string) get_post_mime_type( $post ), 'image/' ) ) {
			$fields['artes_alt_en'] = array(
				'label' => 'Testo alternativo (EN)',
				'input' => 'text',
				'value' => (string) get_post_meta( $post->ID, '_artes_alt_en', true ),
				'helps' => 'Usato sul sito in inglese al posto del testo alternativo italiano.',
			);
		}

		return $fields;
	},
	10,
	2
);

add_filter(
	'attachment_fields_to_save',
	function ( $post, $attachment ) {
		if ( isset( $attachment['artes_alt_en'] ) ) {
			update_post_meta( (int) $post['ID'], '_artes_alt_en', sanitize_text_field( wp_unslash( $attachment['artes_alt_en'] ) ) );
		}

		return $post;
	},
	10,
	2
);

/**
 * ===== Schede e archivi della rev2 (fase 4, novembre 2026 + i18n 0.10.0) ======================================
 *
 * Valori calcolati che i widget di Elementor non possono produrre da soli, usati con il tag dinamico "Shortcode".
 * Funzionano sulla scheda corrente (realizzazione o brand): gli indirizzi sono quelli della rev2
 * (`/realizzazioni/?settore=<slug>&categoria=<slug>` o `/en/realizzazioni/?settore=<slug>&categoria=<slug>`).
 */

/**
 * Primo termine di una tassonomia per un articolo (o null).
 */
function artes_primo_termine( $post_id, $taxonomy ) {
	$terms = wp_get_object_terms( $post_id, $taxonomy );

	return ( $terms && ! is_wp_error( $terms ) ) ? $terms[0] : null;
}

/**
 * Indirizzo dell'archivio realizzazioni con filtri (settore, categoria) nella lingua corrente WPML.
 */
function artes_url_archivio_filtrato( $settore = '', $categoria = '' ) {
	$base = artes_archive_url( 'realizzazione' );

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

	$page_id = (int) artes_term_meta_with_fallback( $term->term_id, 'settore', 'pagina' );

	if ( $page_id ) {
		$page_id = (int) apply_filters( 'wpml_object_id', $page_id, 'page', true );
	}

	return $page_id ? (string) get_permalink( $page_id ) : '';
}

/**
 * Briciole di pane della scheda: "Home / Realizzazioni / Settore / Titolo" (realizzazione) o
 * "Home / Brand partner / Titolo" (brand), localizzate per lingua corrente.
 */
add_shortcode(
	'artes_breadcrumb',
	function () {
		$id    = artes_current_post_id();
		$home  = '<a href="' . esc_url( artes_home_url( '/' ) ) . '">' . esc_html( artes_t( 'Home', 'breadcrumb_home' ) ) . '</a>';
		$title = '<strong>' . esc_html( wp_strip_all_tags( get_the_title( $id ) ) ) . '</strong>';

		if ( 'brand' === get_post_type( $id ) ) {
			return $home . ' / <a href="' . esc_url( artes_archive_url( 'brand' ) ) . '">' . esc_html( artes_t( 'Brand partner', 'breadcrumb_brand', 'breadcrumb' ) ) . '</a> / ' . $title;
		}

		if ( 'post' === get_post_type( $id ) ) {
			return $home . ' / <a href="' . esc_url( artes_url_blog() ) . '">' . esc_html( artes_t( 'Blog', 'breadcrumb_blog' ) ) . '</a> / ' . $title;
		}

		$settore = artes_primo_termine( $id, 'settore' );
		$out     = $home . ' / <a href="' . esc_url( artes_archive_url( 'realizzazione' ) ) . '">' . esc_html( artes_t( 'Realizzazioni', 'breadcrumb_realizzazioni' ) ) . '</a> / ';

		if ( $settore ) {
			$out .= '<a href="' . esc_url( artes_url_archivio_filtrato( $settore->slug ) ) . '">' . esc_html( $settore->name ) . '</a> / ';
		}

		return $out . $title;
	}
);

/**
 * ===== Blog (template "Articolo" e "Archivio blog", 0.11.0 — in bozza finché non si decide di pubblicarli) =========
 *
 * Indirizzo dell'archivio del blog: la "Pagina articoli" di WordPress (Impostazioni → Lettura) se esiste, nella lingua corrente;
 * altrimenti la home. Oggi non c'è (il blog non è ancora attivo).
 */
function artes_url_blog() {
	$page_id = (int) get_option( 'page_for_posts' );

	if ( $page_id ) {
		$page_id = (int) apply_filters( 'wpml_object_id', $page_id, 'page', true );

		return (string) get_permalink( $page_id );
	}

	return artes_home_url( '/' );
}

add_shortcode(
	'artes_url_blog',
	function () {
		return esc_url( artes_url_blog() );
	}
);

/**
 * Riga sopra il titolo dell'articolo e meta delle card: "12 novembre 2026 · Categoria · 4 min di lettura" (data nella lingua corrente).
 */
add_shortcode(
	'artes_eyebrow_articolo',
	function () {
		$id    = artes_current_post_id();
		$parti = array( date_i18n( get_option( 'date_format' ), get_post_timestamp( $id ) ) );
		$cat   = artes_primo_termine( $id, 'category' );

		if ( $cat && 'senza-categoria' !== $cat->slug && 'uncategorized' !== $cat->slug ) {
			$parti[] = $cat->name;
		}

		$parole = str_word_count( wp_strip_all_tags( (string) get_post_field( 'post_content', $id ) ) );
		$parti[] = str_replace( '{n}', (string) max( 1, (int) ceil( $parole / 200 ) ), artes_t( '{n} min di lettura', 'blog_minuti_lettura' ) );

		return esc_html( implode( ' · ', $parti ) );
	}
);

/**
 * Ciclo dell'archivio del blog: tutti gli articoli pubblicati, dal più recente (i filtri, se serviranno, lato browser come gli altri archivi).
 */
add_action(
	'elementor/query/artes_archivio_articoli',
	function ( $query ) {
		$query->set( 'post_type', 'post' );
		$query->set( 'post_status', 'publish' );
		$query->set( 'posts_per_page', -1 );
		$query->set( 'ignore_sticky_posts', true );
		$query->set( 'orderby', array( 'date' => 'DESC', 'ID' => 'DESC' ) );
	}
);

/**
 * Articoli correlati (in fondo all'articolo): 3, della stessa categoria se c'è, esclusa la corrente, dal più recente.
 */
add_action(
	'elementor/query/artes_articoli_correlati',
	function ( $query ) {
		$current = artes_current_post_id();
		$cats    = wp_get_post_categories( $current );

		$query->set( 'post_type', 'post' );
		$query->set( 'post_status', 'publish' );
		$query->set( 'post__not_in', array( $current ) );
		$query->set( 'posts_per_page', 3 );
		$query->set( 'ignore_sticky_posts', true );
		$query->set( 'orderby', array( 'date' => 'DESC', 'ID' => 'DESC' ) );

		if ( $cats ) {
			$query->set( 'category__in', $cats );
		}
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
 * Testata della galleria: "Galleria fotografica · 7 foto" (EN: "Photo gallery · 1 photo" / "Photo gallery · 7 photos").
 */
add_shortcode(
	'artes_galleria_titolo',
	function () {
		$ids   = array_filter( array_map( 'absint', explode( ',', (string) get_post_meta( artes_current_post_id(), 'galleria', true ) ) ) );
		$count = count( $ids );
		$fmt   = 1 === $count
			? artes_t( 'Galleria fotografica · %d foto', 'galleria_titolo_singolare', 'singular' )
			: artes_t( 'Galleria fotografica · %d foto', 'galleria_titolo_plurale', 'plural' );

		return esc_html( sprintf( $fmt, $count ) );
	}
);

/**
 * Link in fondo alla descrizione: testo "Scopri l'arredo uffici e workspace" (EN: "Explore office and workspace furniture")
 * e indirizzo della pagina del settore.
 */
add_shortcode(
	'artes_scopri_testo',
	function () {
		$settore = artes_primo_termine( artes_current_post_id(), 'settore' );

		if ( ! $settore ) {
			return '';
		}

		$template = artes_t( "Scopri l'arredo %s", 'scopri_arredo_testo' );

		if ( ! artes_is_english() && 0 === strpos( $template, "Scopri l'arredo" ) ) {
			$nome = (string) preg_replace( '/^Arredo\s+/u', '', (string) $settore->name );
		} else {
			$nome = artes_lcfirst_utf8( (string) $settore->name );
		}

		return esc_html( sprintf( $template, $nome ) );
	}
);

add_shortcode(
	'artes_url_pagina_settore',
	function () {
		return esc_url( artes_url_pagina_settore( artes_primo_termine( artes_current_post_id(), 'settore' ) ) );
	}
);

/**
 * Titolo della fascia finale della scheda brand: "Arredi Pedrali<br>per il tuo spazio?"
 * (EN: "Pedrali furniture<br>for your space?").
 */
add_shortcode(
	'artes_cta_brand',
	function () {
		$title    = wp_strip_all_tags( get_the_title( artes_current_post_id() ) );
		$template = wp_kses( artes_t( 'Arredi %s<br>per il tuo spazio?', 'cta_brand' ), array( 'br' => array() ) );

		return sprintf( $template, esc_html( $title ) );
	}
);

/**
 * URL dell'archivio realizzazioni filtrato per il settore della scheda corrente
 * (sostituisce il `before: "/realizzazioni/?settore="` hardcoded in Elementor).
 */
add_shortcode(
	'artes_url_archivio_settore',
	function () {
		$settore = artes_primo_termine( artes_current_post_id(), 'settore' );

		return esc_url( $settore ? artes_url_archivio_filtrato( $settore->slug ) : artes_archive_url( 'realizzazione' ) );
	}
);

/**
 * Titolo della sezione "Altre realizzazioni <Settore>" nella scheda realizzazione (1040).
 */
add_shortcode(
	'artes_correlate_titolo',
	function () {
		$settore = artes_primo_termine( artes_current_post_id(), 'settore' );

		if ( ! $settore ) {
			return esc_html( artes_t( 'Altre realizzazioni', 'correlate_titolo_vuoto' ) );
		}

		return esc_html( sprintf( artes_t( 'Altre realizzazioni %s', 'correlate_titolo' ), $settore->name ) );
	}
);

/**
 * Eyebrow della scheda brand (1049): "Brand partner — <Categoria>".
 */
add_shortcode(
	'artes_eyebrow_brand',
	function () {
		$cat = artes_primo_termine( artes_current_post_id(), 'categoria_brand' );

		if ( ! $cat ) {
			return esc_html( artes_t( 'Brand partner', 'eyebrow_brand_vuoto', 'eyebrow singular' ) );
		}

		return esc_html( sprintf( artes_t( 'Brand partner — %s', 'eyebrow_brand' ), $cat->name ) );
	}
);

/**
 * Titolo sezione "Come lavoriamo con <Brand>" nella scheda brand (1049).
 */
add_shortcode(
	'artes_come_titolo',
	function () {
		$title = wp_strip_all_tags( get_the_title( artes_current_post_id() ) );

		return esc_html( sprintf( artes_t( 'Come lavoriamo con %s', 'come_titolo' ), $title ) );
	}
);

/**
 * Titolo sezione "Realizzazioni con <Brand>" nella scheda brand (1049).
 */
add_shortcode(
	'artes_correlate_brand_titolo',
	function () {
		$title = wp_strip_all_tags( get_the_title( artes_current_post_id() ) );

		return esc_html( sprintf( artes_t( 'Realizzazioni con %s', 'correlate_brand_titolo' ), $title ) );
	}
);

/**
 * Dato nascosto (.rev2-dato) della card brand nell'archivio brand (1051):
 * emette lo slug della `categoria_brand` corrente (usato da `initFiltriBrand()` in modo language-independent).
 */
add_shortcode(
	'artes_dato_categoria_brand',
	function () {
		$cat = artes_primo_termine( artes_current_loop_post_id(), 'categoria_brand' );

		return $cat ? esc_html( (string) $cat->slug ) : '';
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
		if (
			isset( $vars['post_type'] )
			&& is_string( $vars['post_type'] )
			&& in_array( $vars['post_type'], array( 'realizzazione', 'brand' ), true )
			&& empty( $vars['name'] )
		) {
			unset( $vars['settore'], $vars['categoria'], $vars['categoria_brand'] );
		}

		return $vars;
	}
);

/**
 * Archivi nelle lingue secondarie con la base italiana (/en/realizzazioni/ invece di /en/projects/): WPML traduce lo slug del tipo
 * di contenuto e reindirizza le schede, ma l'archivio risponde anche con la base vecchia. 301 all'indirizzo tradotto, filtri compresi.
 */
add_action(
	'template_redirect',
	function () {
		if ( ! is_post_type_archive( array( 'realizzazione', 'brand' ) ) ) {
			return;
		}

		$cur = apply_filters( 'wpml_current_language', null );

		if ( ! $cur || apply_filters( 'wpml_default_language', null ) === $cur ) {
			return;
		}

		$tipo    = is_post_type_archive( 'realizzazione' ) ? 'realizzazione' : 'brand';
		$giusto  = (string) get_post_type_archive_link( $tipo );
		$atteso  = untrailingslashit( (string) wp_parse_url( $giusto, PHP_URL_PATH ) );
		$attuale = untrailingslashit( (string) wp_parse_url( isset( $_SERVER['REQUEST_URI'] ) ? wp_unslash( $_SERVER['REQUEST_URI'] ) : '', PHP_URL_PATH ) ); // phpcs:ignore WordPress.Security.ValidatedSanitizedInput

		if ( '' === $atteso || $atteso === $attuale ) {
			return;
		}

		$query = (string) wp_parse_url( isset( $_SERVER['REQUEST_URI'] ) ? wp_unslash( $_SERVER['REQUEST_URI'] ) : '', PHP_URL_QUERY ); // phpcs:ignore WordPress.Security.ValidatedSanitizedInput
		wp_safe_redirect( $giusto . ( '' !== $query ? '?' . $query : '' ), 301 );
		exit;
	},
	5
);

/**
 * Le pagine dei termini (/settore/uffici/, /categoria-realizzazione/…, /categoria-brand/…) e la paginazione
 * degli archivi (/realizzazioni/page/2/, /brand-partner/page/2/) non esistono nella rev2: tutti gli elementi
 * sono in un'unica pagina con filtri lato browser. Chi arriva da un vecchio link viene reindirizzato con 301.
 */
add_action(
	'template_redirect',
	function () {
		// Con posts_per_page = -1 WordPress risponderebbe 200 anche su /page/2/ con contenuto duplicato: 301 all'archivio.
		if ( is_post_type_archive() ) {
			if ( is_paged() && is_post_type_archive( array( 'realizzazione', 'brand' ) ) ) {
				$post_type = is_post_type_archive( 'realizzazione' ) ? 'realizzazione' : 'brand';
				$url       = artes_archive_url( $post_type );

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
				// il meta `settore` è il codice italiano (copiato nelle traduzioni): si usa lo slug del settore nella lingua corrente
				$settore_meta = (string) artes_term_meta_with_fallback( $term->term_id, 'categoria', 'settore' );
				global $wpdb; // query dirette: get_term_by/get_term vengono filtrati da WPML sulla lingua corrente
				$settore_it   = (int) $wpdb->get_var( $wpdb->prepare( "SELECT t.term_id FROM {$wpdb->terms} t JOIN {$wpdb->term_taxonomy} tt ON tt.term_id = t.term_id AND tt.taxonomy = 'settore' WHERE t.slug = %s", $settore_meta ) ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery
				$settore_id   = $settore_it ? (int) apply_filters( 'wpml_object_id', $settore_it, 'settore', true ) : 0;
				$settore_slug = $settore_id ? (string) $wpdb->get_var( $wpdb->prepare( "SELECT slug FROM {$wpdb->terms} WHERE term_id = %d", $settore_id ) ) : ''; // phpcs:ignore WordPress.DB.DirectDatabaseQuery
				$url          = artes_url_archivio_filtrato( '' !== $settore_slug ? $settore_slug : $settore_meta, $term->slug );
			}
		} elseif ( is_tax( 'categoria_brand' ) ) {
			$url = artes_archive_url( 'brand' );
		}

		if ( $url ) {
			wp_safe_redirect( $url, 301 );
			exit;
		}
	}
);

/**
 * Design rev2: dal 2026-11-25 è l'unico design del sito (modalità selettiva e design precedente rimossi; il vecchio mockup è
 * archiviato nel repository). Le due funzioni restano perché le usano altri punti del codice: in area admin il design non si applica.
 */
function artes_rev2_globale_attiva() {
	return true;
}

/**
 * La richiesta corrente usa il design rev2 (sempre, tranne l'area di amministrazione). Filtro `artes_is_rev2` per eccezioni future.
 */
function artes_is_rev2() {
	return ! is_admin() && (bool) apply_filters( 'artes_is_rev2', true );
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

	// Stessi font della rev2 (Archivo, Instrument Sans, IBM Plex Mono), serviti dal plugin: nessuna richiesta ai server di Google
	// (privacy). File e @font-face generati da tools/rev2/font-locali.js in fonts/.
	if ( file_exists( $dir . 'fonts/fonts.css' ) ) {
		wp_enqueue_style( 'artes-rev2-fonts', plugins_url( 'fonts/fonts.css', __FILE__ ), array(), (string) filemtime( $dir . 'fonts/fonts.css' ) );
	}

	if ( file_exists( $dir . 'artes-rev2.css' ) ) {
		wp_enqueue_style( 'artes-rev2', plugins_url( 'artes-rev2.css', __FILE__ ), array(), (string) filemtime( $dir . 'artes-rev2.css' ) );

		// CSS aggiuntivo (ARTES → Stile): piccoli ritocchi senza rigenerare artes-rev2.css; caricato dopo, quindi prevale a parità di selettore
		$css_extra = trim( (string) get_option( 'artes_css_aggiuntivo', '' ) );

		if ( '' !== $css_extra ) {
			wp_add_inline_style( 'artes-rev2', $css_extra );
		}

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
 * Dati localizzati per il JavaScript rev2 (`window.ArtesRev2Dati`):
 * - `lang`: codice lingua WPML corrente (`it`, `en-gb`, …);
 * - `rotte`: pathname normalizzati per `marcaAttivo()` (home, archivi, pagine istituzionali e 5 settori);
 * - `settori`, `categorie`, `categorie_brand`: termini nella lingua corrente ordinati per meta (con fallback sui termini originali);
 * - `i18n`: tutte le etichette UI e ARIA tradotte per la lingua attiva.
 */
function artes_dati_filtri() {
	$dati = array(
		'lang'            => artes_current_lang(),
		'rotte'           => array(
			'home'          => artes_url_path( artes_home_url( '/' ) ),
			'realizzazioni' => artes_url_path( artes_archive_url( 'realizzazione' ) ),
			'brand'         => artes_url_path( artes_archive_url( 'brand' ) ),
			'contatti'      => artes_page_route( 'contatti' ),
			'chi_siamo'     => artes_page_route( 'chi-siamo' ),
			'contract'      => artes_page_route( 'contract' ),
			'su_misura'     => artes_page_route( 'arredamento-su-misura' ),
			'settori'       => array(),
		),
		'settori'         => array(),
		'categorie'       => array(),
		'categorie_brand' => array(),
		'i18n'            => array(
			'tutti'               => artes_t( 'Tutti', 'js_tutti' ),
			'tutte'               => artes_t( 'Tutte', 'js_tutte' ),
			'tutti_settori'       => artes_t( 'Tutti i settori', 'js_tutti_settori' ),
			'nav_principale'      => artes_t( 'Navigazione principale', 'js_nav_principale' ),
			'nav_mobile'          => artes_t( 'Navigazione mobile', 'js_nav_mobile' ),
			'apri_menu'           => artes_t( 'Apri il menu', 'js_apri_menu' ),
			'chiudi_menu'         => artes_t( 'Chiudi il menu', 'js_chiudi_menu' ),
			'foto_in_arrivo'      => artes_t( 'Foto in arrivo', 'js_foto_in_arrivo' ),
			'dati_servizio'       => artes_t( 'Dati principali del servizio', 'js_dati_servizio' ),
			'indice_pagina'       => artes_t( 'Indice della pagina', 'js_indice_pagina' ),
			'controlli_slider'    => artes_t( 'Controlli galleria produzione', 'js_controlli_slider' ),
			'galleria_dialog'     => artes_t( 'Galleria fotografica', 'js_galleria_dialog' ),
			'chiudi'              => artes_t( 'Chiudi', 'js_chiudi' ),
			'precedente'          => artes_t( 'Foto precedente', 'js_precedente' ),
			'successiva'          => artes_t( 'Foto successiva', 'js_successiva' ),
			'foto_di'             => artes_t( '{titolo} — foto {n} di {tot}', 'js_foto_di' ),
			'apri_immagine'       => artes_t( 'Apri la foto {n} di {tot}', 'js_apri_immagine' ),
			'filtra_settore'      => artes_t( 'Filtra per settore', 'js_filtra_settore' ),
			'filtra_categoria_di' => artes_t( 'Filtra {settore} per categoria', 'js_filtra_categoria_di' ),
			'filtra_categoria'    => artes_t( 'Filtra per categoria', 'js_filtra_categoria' ),
			'progetto_uno'        => artes_t( '1 realizzazione', 'js_progetto_uno' ),
			'progetti_molti'      => artes_t( '{n} realizzazioni', 'js_progetti_molti' ),
			'nessun_progetto'     => artes_t( 'Nessuna realizzazione pubblicata per questa categoria.', 'js_nessun_progetto' ),
		),
	);

	// Mappa slug settore lingua predefinita -> slug settore lingua corrente (utile se gli slug EN vengono tradotti).
	$mappa_slug_settore = array();

	if ( taxonomy_exists( 'settore' ) ) {
		$settori = get_terms(
			array(
				'taxonomy'   => 'settore',
				'hide_empty' => false,
			)
		);

		if ( ! is_wp_error( $settori ) && ! empty( $settori ) ) {
			$rows = array();

			foreach ( (array) $settori as $s ) {
				$ordine    = (int) artes_term_meta_with_fallback( $s->term_id, 'settore', 'ordine' );
				$orig_slug = artes_term_original_slug( $s, 'settore' );
				$rows[]    = array(
					'term'      => $s,
					'ordine'    => $ordine > 0 ? $ordine : 999,
					'orig_slug' => $orig_slug,
				);
			}

			usort(
				$rows,
				function ( $a, $b ) {
					if ( $a['ordine'] !== $b['ordine'] ) {
						return $a['ordine'] - $b['ordine'];
					}

					return (int) $a['term']->term_id - (int) $b['term']->term_id;
				}
			);

			foreach ( $rows as $row ) {
				$s = $row['term'];
				$dati['settori'][] = array(
					'slug'           => (string) $s->slug,
					'nome'           => html_entity_decode( (string) $s->name, ENT_QUOTES | ENT_HTML5, 'UTF-8' ),
					'slug_originale' => $row['orig_slug'],
					'ordine'         => $row['ordine'],
				);
				$mappa_slug_settore[ (string) $s->slug ] = (string) $s->slug;

				if ( '' !== $row['orig_slug'] ) {
					$mappa_slug_settore[ $row['orig_slug'] ] = (string) $s->slug;
				}

				$url_settore = artes_url_pagina_settore( $s );

				if ( '' !== $url_settore ) {
					$dati['rotte']['settori'][ (string) $s->slug ] = artes_url_path( $url_settore );
				}
			}
		}
	}

	if ( taxonomy_exists( 'categoria' ) ) {
		$categorie = get_terms(
			array(
				'taxonomy'   => 'categoria',
				'hide_empty' => false,
			)
		);

		if ( ! is_wp_error( $categorie ) && ! empty( $categorie ) ) {
			$cat_rows = array();

			foreach ( (array) $categorie as $c ) {
				$ord_filtro = (int) artes_term_meta_with_fallback( $c->term_id, 'categoria', 'ordine_filtro' );

				if ( $ord_filtro <= 0 ) {
					continue;
				}

				$settore_meta = (string) artes_term_meta_with_fallback( $c->term_id, 'categoria', 'settore' );
				$settore_curr = isset( $mappa_slug_settore[ $settore_meta ] ) ? $mappa_slug_settore[ $settore_meta ] : $settore_meta;
				$orig_slug    = artes_term_original_slug( $c, 'categoria' );

				$cat_rows[] = array(
					'slug'           => (string) $c->slug,
					'nome'           => html_entity_decode( (string) $c->name, ENT_QUOTES | ENT_HTML5, 'UTF-8' ),
					'settore'        => $settore_curr,
					'slug_originale' => $orig_slug,
					'ordine_filtro'  => $ord_filtro,
					'term_id'        => (int) $c->term_id,
				);
			}

			usort(
				$cat_rows,
				function ( $a, $b ) {
					if ( $a['ordine_filtro'] !== $b['ordine_filtro'] ) {
						return $a['ordine_filtro'] - $b['ordine_filtro'];
					}

					return $a['term_id'] - $b['term_id'];
				}
			);

			foreach ( $cat_rows as $cr ) {
				unset( $cr['term_id'] );
				$dati['categorie'][] = $cr;
			}
		}
	}

	if ( taxonomy_exists( 'categoria_brand' ) ) {
		$cat_brand = get_terms(
			array(
				'taxonomy'   => 'categoria_brand',
				'hide_empty' => false,
			)
		);

		if ( ! is_wp_error( $cat_brand ) && ! empty( $cat_brand ) ) {
			$cb_rows = array();

			foreach ( (array) $cat_brand as $cb ) {
				$ordine    = (int) artes_term_meta_with_fallback( $cb->term_id, 'categoria_brand', 'ordine' );
				$orig_slug = artes_term_original_slug( $cb, 'categoria_brand' );
				$cb_rows[] = array(
					'slug'           => (string) $cb->slug,
					'nome'           => html_entity_decode( (string) $cb->name, ENT_QUOTES | ENT_HTML5, 'UTF-8' ),
					'slug_originale' => $orig_slug,
					'ordine'         => $ordine > 0 ? $ordine : 999,
					'term_id'        => (int) $cb->term_id,
				);
			}

			usort(
				$cb_rows,
				function ( $a, $b ) {
					if ( $a['ordine'] !== $b['ordine'] ) {
						return $a['ordine'] - $b['ordine'];
					}

					return $a['term_id'] - $b['term_id'];
				}
			);

			foreach ( $cb_rows as $cbr ) {
				unset( $cbr['term_id'] );
				$dati['categorie_brand'][] = $cbr;
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

// Precaricamento dei tre file di carattere usati in ogni pagina (alfabeto latino): evitano il "salto" del testo al caricamento.
add_action(
	'wp_head',
	function () {
		if ( ! artes_is_rev2() ) {
			return;
		}

		foreach ( array( 'archivo-variabile-latin', 'instrument-sans-variabile-latin', 'ibm-plex-mono-400-latin' ) as $f ) {
			if ( file_exists( plugin_dir_path( __FILE__ ) . 'fonts/' . $f . '.woff2' ) ) {
				printf( '<link rel="preload" href="%s" as="font" type="font/woff2" crossorigin>' . "\n", esc_url( plugins_url( 'fonts/' . $f . '.woff2', __FILE__ ) ) );
			}
		}
	},
	2
);

/**
 * ===== SEO on-page (fase 7, novembre 2026 + i18n 0.10.0) ======================================================
 *
 * Gestione integrata di <title> e <meta name="description"> senza plugin SEO esterni:
 * - Pagine statiche (Home, 5 settori, Su misura, Contract, Chi siamo, Contatti, Privacy, Cookie): meta `_artes_seo_title`
 *   e `_artes_seo_description` (dichiarati `translate` in `wpml-config.xml`).
 * - Schede CPT `realizzazione` e `brand`: formule localizzate (verificate al 100% in IT rispetto alla rev2),
 *   con override opzionale tramite gli stessi meta `_artes_seo_title` e `_artes_seo_description`.
 * - Archivi CPT (`realizzazione`, `brand`): opzione `artes_seo_archives` (dichiarata in `<admin-texts>` di `wpml-config.xml`),
 *   con fallback localizzato per lingua corrente e filtro `artes_seo_archive_meta`.
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
 * Valori sorgente italiani degli archivi CPT (usati per rilevare se `artes_seo_archives` nel DB non è ancora stata tradotta in ST).
 */
function artes_seo_archive_raw_it_defaults() {
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
 * Valori predefiniti localizzati per gli archivi CPT (allineati alla rev2 in IT, tradotti in EN).
 */
function artes_seo_archive_defaults() {
	$raw = artes_seo_archive_raw_it_defaults();

	return array(
		'realizzazione' => array(
			'title'       => artes_t( $raw['realizzazione']['title'], 'seo_archive_realizzazione_title' ),
			'description' => artes_t( $raw['realizzazione']['description'], 'seo_archive_realizzazione_desc' ),
		),
		'brand'         => array(
			'title'       => artes_t( $raw['brand']['title'], 'seo_archive_brand_title' ),
			'description' => artes_t( $raw['brand']['description'], 'seo_archive_brand_desc' ),
		),
	);
}

/**
 * Titolo e descrizione per un archivio CPT (`realizzazione` o `brand`): legge l'opzione `artes_seo_archives`
 * (tradotta da WPML `<admin-texts>` quando presente in String Translation) con fallback localizzato
 * se in lingua secondaria il valore salvato coincide ancora con la stringa sorgente italiana.
 */
function artes_seo_get_archive_meta( $post_type ) {
	$raw_it   = artes_seo_archive_raw_it_defaults();
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

	$current = apply_filters( 'wpml_current_language', null );
	$default = apply_filters( 'wpml_default_language', null );
	$is_sec  = ( is_string( $current ) && is_string( $default ) && '' !== $current && $current !== $default ) || artes_is_english();

	if ( isset( $saved[ $post_type ] ) && is_array( $saved[ $post_type ] ) ) {
		foreach ( array( 'title', 'description' ) as $field ) {
			if ( isset( $saved[ $post_type ][ $field ] ) && '' !== trim( (string) $saved[ $post_type ][ $field ] ) ) {
				$val     = (string) $saved[ $post_type ][ $field ];
				$raw_val = isset( $raw_it[ $post_type ][ $field ] ) ? $raw_it[ $post_type ][ $field ] : '';

				// Se siamo su una lingua secondaria e WPML ST non ha ancora tradotto l'opzione admin-texts
				// (il valore coincide con il default italiano grezzo), prevale il default localizzato.
				if ( $is_sec && '' !== $raw_val && artes_seo_clean_text( $val ) === artes_seo_clean_text( $raw_val ) ) {
					continue;
				}

				$entry[ $field ] = $val;
			}
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
			$title = sprintf( artes_t( '%s — Brand partner Artes', 'seo_brand_title' ), $post_title );
		}

		if ( '' === $desc && '' !== $post_title ) {
			$cat_term = artes_primo_termine( $post_id, 'categoria_brand' );
			$cat_name = $cat_term ? artes_seo_clean_text( $cat_term->name ) : '';

			if ( '' !== $cat_name ) {
				$desc = sprintf(
					artes_t( '%1$s, brand partner Artes per la categoria %2$s: dove lo usiamo, come lo coordiniamo con gli arredi su misura e le realizzazioni collegate.', 'seo_brand_desc_cat' ),
					$post_title,
					$cat_name
				);
			} else {
				$desc = sprintf(
					artes_t( '%s, brand partner Artes: dove lo usiamo, come lo coordiniamo con gli arredi su misura e le realizzazioni collegate.', 'seo_brand_desc' ),
					$post_title
				);
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
 * Plugin SEO esterno (Yoast SEO, Rank Math, All in One SEO): se è attivo, il plugin ARTES non scrive titolo e meta description
 * (li gestisce quel plugin) e nasconde il riquadro "SEO ARTES". I testi già scritti si copiano in Yoast da ARTES → SEO.
 */
function artes_seo_esterno() {
	return defined( 'WPSEO_VERSION' ) || defined( 'RANK_MATH_VERSION' ) || defined( 'AIOSEO_VERSION' );
}

/**
 * Titolo del documento via `pre_get_document_title` (usato da `_wp_render_title_tag()` di WordPress + Hello Elementor:
 * evita `<title>` duplicati e bypassa `wptexturize`, mantenendo i testi identici alla rev2).
 */
add_filter(
	'pre_get_document_title',
	function ( $title ) {
		if ( artes_seo_esterno() ) {
			return $title;
		}

		$seo = artes_seo_data();

		if ( '' !== $seo['title'] ) {
			return esc_html( $seo['title'] );
		}

		// Pagina 404 (template "Errore 404"): stesso formato "Titolo — Artes" del resto del sito.
		if ( is_404() ) {
			return esc_html( artes_t( 'Pagina non trovata', 'seo_404_title' ) . ' — Artes' );
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
		if ( artes_seo_esterno() ) {
			return $enabled;
		}

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
		if ( artes_seo_esterno() ) {
			return;
		}

		$seo = artes_seo_data();

		if ( '' !== $seo['description'] ) {
			echo '<meta name="description" content="' . esc_attr( $seo['description'] ) . '">' . "\n";
		}
	},
	2
);

/**
 * Etichette inglesi dei tipi di contenuto sul sito pubblico in inglese: WordPress le usa nel titolo dei feed
 * ("Artes » Projects Feed") e nei titoli d'archivio generati. In italiano restano quelle di JetEngine.
 */
add_action(
	'wp',
	function () {
		if ( is_admin() || ! artes_is_english() ) {
			return;
		}
		$nomi = array(
			'realizzazione' => artes_t( 'Realizzazioni', 'breadcrumb_realizzazioni', 'breadcrumb' ),
			'brand'         => artes_t( 'Brand partner', 'breadcrumb_brand', 'breadcrumb' ),
		);
		foreach ( $nomi as $tipo => $nome ) {
			$oggetto = get_post_type_object( $tipo );
			if ( $oggetto && isset( $oggetto->labels ) ) {
				$oggetto->labels->name          = $nome;
				$oggetto->labels->menu_name     = $nome;
				$oggetto->labels->archives      = $nome;
			}
		}
	}
);

/**
 * ===== Ottimizzazione immagini responsive (`sizes`, `loading`, `fetchpriority`) (1.0.2) =======================
 *
 * Il widget immagine atomico di Elementor V4 (`Image_Transformer`) emette `srcset` senza `sizes`: senza `sizes`
 * il browser assume `100vw` e scarica le versioni da 1536–1800 px anche per card da 336–440 px. Inoltre WordPress
 * assegna `fetchpriority="high"` al logo dell'header (prima immagine in ordine DOM con dimensioni naturali > 50k px²)
 * sottraendo la priorità alla vera immagine principale (LCP) della pagina.
 *
 * Qui si interviene sul filtro nativo `elementor/frontend/the_content` (eseguito su pagine, header, footer, schede e
 * archivi del Theme Builder, senza output buffering) leggendo il contesto reale dalle classi CSS dei contenitori
 * (allineate ai breakpoint di `assets/css/artes.css`). `fetchpriority="high"` lo assegna poi il modulo di Elementor (vedi sotto).
 */

/**
 * Verifica se almeno un antenato nello stack HTML possiede una determinata classe CSS.
 */
function artes_img_has_ancestor( $stack, $class_name ) {
	for ( $i = count( $stack ) - 1; $i >= 0; $i-- ) {
		if ( isset( $stack[ $i ]['classes'][ $class_name ] ) ) {
			return true;
		}
	}

	return false;
}

/**
 * Verifica se almeno un antenato nello stack HTML ha un determinato nome tag (es. `header`, `footer`).
 */
function artes_img_has_ancestor_tag( $stack, $tag_name ) {
	for ( $i = count( $stack ) - 1; $i >= 0; $i-- ) {
		if ( $stack[ $i ]['tag'] === $tag_name ) {
			return true;
		}
	}

	return false;
}

/**
 * Imposta o sostituisce un attributo HTML su una stringa di attributi `<img>` (senza toccare `width`/`height`).
 */
function artes_img_set_attr( $attrs, $name, $value ) {
	$pattern     = '/\s+\b' . preg_quote( $name, '/' ) . '=(?:"[^"]*"|\'[^\']*\'|[^\s>]+)/i';
	$replacement = ' ' . $name . '="' . esc_attr( $value ) . '"';

	if ( preg_match( $pattern, $attrs ) ) {
		return (string) preg_replace( $pattern, $replacement, $attrs, 1 );
	}

	return rtrim( $attrs ) . $replacement;
}

/**
 * Rimuove un attributo HTML da una stringa di attributi `<img>`.
 */
function artes_img_remove_attr( $attrs, $name ) {
	return (string) preg_replace( '/\s+\b' . preg_quote( $name, '/' ) . '(?:=(?:"[^"]*"|\'[^\']*\'|[^\s>]+))?/i', '', $attrs );
}

/**
 * Determina `sizes` (valore di riserva esplicito) e modalità di caricamento (`lcp`, `eager`, `logo`, `lazy`, `lazy-low`, `keep`)
 * per un `<img>` in base alle sue classi, agli antenati CSS e alla posizione nei cicli.
 */
function artes_img_context_rule( $self_classes, $stack, $counters ) {
	// 1. Loghi header e footer (800×217 naturali, resi a 114×31 e 96×26 px).
	if ( artes_img_has_ancestor( $stack, 'masthead__logo' ) || artes_img_has_ancestor_tag( $stack, 'header' ) ) {
		return array(
			'sizes' => '114px',
			'mode'  => 'logo',
		);
	}

	if ( isset( $self_classes['footer__logo'] ) || artes_img_has_ancestor_tag( $stack, 'footer' ) ) {
		return array(
			'sizes' => '96px',
			'mode'  => 'lazy',
		);
	}

	// 2. Hero home a tutta larghezza.
	if ( isset( $self_classes['hero__texture'] ) || artes_img_has_ancestor( $stack, 'hero' ) ) {
		return array(
			'sizes' => '100vw',
			'mode'  => 'lcp',
		);
	}

	// 3. Riquadri sovrapposti (inset) di settori e produzione (42–44% di metà schermo su desktop).
	if ( artes_img_has_ancestor( $stack, 'settore__inset' ) || artes_img_has_ancestor( $stack, 'produzione__inset' ) ) {
		return array(
			'sizes' => '(max-width: 1024px) 44vw, 22vw',
			'mode'  => 'lazy',
		);
	}

	// 4. Foto principale delle pagine settore (metà schermo su desktop, 100vw sotto 1024 px).
	if ( artes_img_has_ancestor( $stack, 'settore__media' ) ) {
		return array(
			'sizes' => '(max-width: 1024px) 100vw, 50vw',
			'mode'  => 'lcp',
		);
	}

	// 5. Foto hero pagina Contract (~42% su desktop, 1 col sotto 1024 px).
	if ( artes_img_has_ancestor( $stack, 'contract-hero__media' ) ) {
		return array(
			'sizes' => '(max-width: 1024px) calc(100vw - 40px), 42vw',
			'mode'  => 'lcp',
		);
	}

	// 6. Banda fotografica orizzontale (Chi siamo, Su misura).
	if ( artes_img_has_ancestor( $stack, 'page-band' ) ) {
		return array(
			'sizes' => '(max-width: 640px) calc(100vw - 40px), calc(100vw - 80px)',
			'mode'  => 'lcp',
		);
	}

	// 7. Slider fotografico della scheda brand (prima slide LCP, successive nascoste deprioritizzate).
	if ( artes_img_has_ancestor( $stack, 'scheda__slider' ) ) {
		$idx = (int) ( $counters['slider'] ?? 1 );

		return array(
			'sizes' => '(max-width: 640px) calc(100vw - 40px), calc(100vw - 80px)',
			'mode'  => $idx <= 1 ? 'lcp' : 'lazy-low',
		);
	}

	// 8. Blocco Produzione (Home e Su misura, sotto il primo schermo: 50vw su desktop, 100vw sotto 1024 px).
	if ( artes_img_has_ancestor( $stack, 'produzione__media' ) ) {
		$idx = (int) ( $counters['slider'] ?? 1 );

		return array(
			'sizes' => '(max-width: 1024px) 100vw, 50vw',
			'mode'  => $idx > 1 ? 'lazy-low' : 'lazy',
		);
	}

	// 9. Mosaico 5 settori in Home (1.4fr 1fr 1fr su desktop; 1 colonna sotto 1024 px).
	if ( isset( $self_classes['tile__texture'] ) || artes_img_has_ancestor( $stack, 'tile' ) ) {
		$is_tall = artes_img_has_ancestor( $stack, 'tile--tall' );

		return array(
			'sizes' => $is_tall
				? '(max-width: 1024px) calc(100vw - 40px), 41vw'
				: '(max-width: 1024px) calc(100vw - 40px), 29vw',
			'mode'  => 'lazy',
		);
	}

	// 10. Galleria della scheda realizzazione (griglie .caso-gallery--n1..n5 in artes.css).
	if ( artes_img_has_ancestor( $stack, 'caso-gallery__item' ) ) {
		$n   = max( 1, min( 5, (int) ( $counters['gallery_total'] ?? 5 ) ) );
		$idx = max( 1, (int) ( $counters['gallery'] ?? 1 ) );

		if ( 1 === $n ) {
			$sizes = '(max-width: 640px) calc(100vw - 32px), calc(100vw - 80px)';
		} elseif ( 2 === $n ) {
			$sizes = '(max-width: 640px) calc(100vw - 32px), calc(50vw - 44px)';
		} elseif ( 3 === $n ) {
			$sizes = 1 === $idx
				? '(max-width: 900px) calc(100vw - 32px), calc(66.67vw - 56px)'
				: '(max-width: 900px) calc(50vw - 20px), calc(33.33vw - 30px)';
		} elseif ( 4 === $n && ( 1 === $idx || 4 === $idx ) ) {
			$sizes = 1 === $idx
				? '(max-width: 900px) calc(100vw - 32px), calc(50vw - 44px)'
				: '(max-width: 900px) calc(50vw - 20px), calc(50vw - 44px)';
		} else {
			$sizes = 1 === $idx
				? '(max-width: 900px) calc(100vw - 32px), calc(50vw - 44px)'
				: '(max-width: 900px) calc(50vw - 20px), calc(25vw - 24px)';
		}

		$mode = 1 === $idx ? 'lcp' : ( $idx <= 3 ? 'eager' : 'lazy' );

		return array(
			'sizes' => $sizes,
			'mode'  => $mode,
		);
	}

	// 11. Card dell'archivio realizzazioni (3 col desktop, 2 col ≤1024, 1 col ≤780).
	if ( artes_img_has_ancestor( $stack, 'progetto__media' ) && artes_img_has_ancestor( $stack, 'archivio__grid' ) ) {
		$idx = max( 1, (int) ( $counters['progetti'] ?? 1 ) );

		return array(
			'sizes' => '(max-width: 780px) calc(100vw - 40px), (max-width: 1024px) calc(50vw - 30px), calc(33.33vw - 40px)',
			'mode'  => 1 === $idx ? 'lcp' : ( $idx <= 3 ? 'eager' : 'lazy' ),
		);
	}

	// 12. Card dei 6 progetti in evidenza in Home (card 1 = 4/6 col, card 2–5 = 2/6 col, card 6 = 6/6 col).
	if ( artes_img_has_ancestor( $stack, 'progetto__media' ) && artes_img_has_ancestor( $stack, 'progetti' ) ) {
		$idx = max( 1, (int) ( $counters['progetti'] ?? 1 ) );

		if ( 1 === $idx || artes_img_has_ancestor( $stack, 'progetto--w4' ) ) {
			$sizes = '(max-width: 780px) calc(100vw - 40px), (max-width: 1024px) calc(50vw - 30px), calc(66.67vw - 60px)';
		} elseif ( 6 === $idx || artes_img_has_ancestor( $stack, 'progetto--w6' ) ) {
			$sizes = '(max-width: 780px) calc(100vw - 40px), calc(100vw - 80px)';
		} else {
			$sizes = '(max-width: 780px) calc(100vw - 40px), (max-width: 1024px) calc(50vw - 30px), calc(33.33vw - 40px)';
		}

		return array(
			'sizes' => $sizes,
			'mode'  => 'lazy',
		);
	}

	// 13. Card "Altre realizzazioni" / "Realizzazioni con <Brand>" in fondo alle schede (3 col → 2 col → 1 col).
	if ( artes_img_has_ancestor( $stack, 'correlate__grid' ) ) {
		return array(
			'sizes' => '(max-width: 640px) calc(100vw - 40px), (max-width: 1024px) calc(50vw - 30px), calc(33.33vw - 40px)',
			'mode'  => 'lazy',
		);
	}

	// 14. Riserva generica per qualsiasi altra immagine con srcset.
	return array(
		'sizes' => '(max-width: 640px) calc(100vw - 40px), calc(100vw - 80px)',
		'mode'  => 'keep',
	);
}

/**
 * Arricchisce gli `<img>` con `srcset` prodotti da Elementor con `sizes` contestuale, `loading` e `fetchpriority`
 * corretti, senza alterare `width`/`height` né toccare l'editor.
 */
function artes_optimize_elementor_images( $html ) {
	if ( ! is_string( $html ) || false === stripos( $html, '<img' ) ) {
		return $html;
	}

	if ( is_admin() ) {
		return $html;
	}

	if ( class_exists( '\Elementor\Plugin' ) && \Elementor\Plugin::$instance ) {
		if ( ! empty( \Elementor\Plugin::$instance->editor ) && \Elementor\Plugin::$instance->editor->is_edit_mode() ) {
			return $html;
		}
		if ( ! empty( \Elementor\Plugin::$instance->preview ) && \Elementor\Plugin::$instance->preview->is_preview_mode() ) {
			return $html;
		}
	}

	$void_tags     = array_flip( array( 'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr' ) );
	$stack         = array();
	$in_raw        = '';
	$lcp_assigned  = false;
	$gallery_total = preg_match_all( '/\bcaso-gallery__item\b/', $html );
	$counters      = array(
		'progetti'      => 0,
		'gallery'       => 0,
		'gallery_total' => (int) $gallery_total,
		'slider'        => 0,
	);

	return (string) preg_replace_callback(
		'/<(\/?)([a-zA-Z][a-zA-Z0-9-]*)\b((?:"[^"]*"|\'[^\']*\'|[^\'">])*?)(\/?)>/',
		function ( $m ) use ( $void_tags, &$stack, &$in_raw, &$lcp_assigned, &$counters ) {
			$is_close = '/' === $m[1];
			$tag      = strtolower( $m[2] );
			$attrs    = $m[3];
			$is_self  = '/' === $m[4] || isset( $void_tags[ $tag ] );

			if ( '' !== $in_raw ) {
				if ( $is_close && $tag === $in_raw ) {
					$in_raw = '';
				}

				return $m[0];
			}

			if ( ! $is_close && ( 'script' === $tag || 'style' === $tag ) && ! $is_self ) {
				$in_raw = $tag;

				return $m[0];
			}

			if ( $is_close ) {
				for ( $i = count( $stack ) - 1; $i >= 0; $i-- ) {
					if ( $stack[ $i ]['tag'] === $tag ) {
						if ( isset( $stack[ $i ]['classes']['progetti'] ) ) {
							$counters['progetti'] = 0;
						}
						if ( isset( $stack[ $i ]['classes']['caso-gallery'] ) ) {
							$counters['gallery'] = 0;
						}
						if ( isset( $stack[ $i ]['classes']['produzione-slider'] ) || isset( $stack[ $i ]['classes']['scheda__slider'] ) ) {
							$counters['slider'] = 0;
						}
						array_splice( $stack, $i );
						break;
					}
				}

				return $m[0];
			}

			$classes = array();

			if ( preg_match( '/\bclass=(?:"([^"]*)"|\'([^\']*)\')/i', $attrs, $cm ) ) {
				$raw_cls = '' !== $cm[1] ? $cm[1] : ( $cm[2] ?? '' );
				foreach ( preg_split( '/\s+/', trim( $raw_cls ) ) as $c ) {
					if ( '' !== $c ) {
						$classes[ $c ] = true;
					}
				}
			}

			if ( 'img' !== $tag ) {
				if ( isset( $classes['progetto'] ) ) {
					$counters['progetti']++;
				}
				if ( isset( $classes['caso-gallery__item'] ) ) {
					$counters['gallery']++;
				}
				if ( isset( $classes['produzione-slide'] ) ) {
					$counters['slider']++;
				}
				if ( ! $is_self ) {
					$stack[] = array(
						'tag'     => $tag,
						'classes' => $classes,
					);
				}

				return $m[0];
			}

			// Solo immagini con srcset (o loghi header/footer per correggere fetchpriority/loading).
			$has_srcset = (bool) preg_match( '/\bsrcset=/i', $attrs );

			if ( ! $has_srcset ) {
				return $m[0];
			}

			$rule = artes_img_context_rule( $classes, $stack, $counters );
			$mode = $rule['mode'];

			// fetchpriority="high" lo mette Elementor (modulo "Image loading optimization", sull'output finale) alla PRIMA
			// immagine grande, non lazy e senza fetchpriority. Se lo scrivessimo noi, Elementor lo aggiungerebbe una seconda
			// volta. Quindi: l'immagine principale resta senza fetchpriority e non lazy; tutte le altre immagini non lazy
			// (logo compreso, che viene prima nel DOM) ricevono fetchpriority="auto" e Elementor le salta.
			if ( 'lcp' === $mode && ! $lcp_assigned ) {
				$attrs        = artes_img_remove_attr( $attrs, 'loading' );
				$attrs        = artes_img_remove_attr( $attrs, 'fetchpriority' );
				$lcp_assigned = true;
			} elseif ( 'lcp' === $mode || 'eager' === $mode || 'logo' === $mode ) {
				$attrs = artes_img_set_attr( $attrs, 'loading', 'eager' );
				$attrs = artes_img_set_attr( $attrs, 'fetchpriority', 'auto' );
			} elseif ( 'keep' === $mode && ! preg_match( '/\bloading=["\']?lazy/i', $attrs ) ) {
				$attrs = artes_img_set_attr( $attrs, 'fetchpriority', 'auto' );
			} elseif ( 'lazy' === $mode ) {
				$attrs = artes_img_set_attr( $attrs, 'loading', 'lazy' );
				$attrs = artes_img_remove_attr( $attrs, 'fetchpriority' );
			} elseif ( 'lazy-low' === $mode ) {
				$attrs = artes_img_set_attr( $attrs, 'loading', 'lazy' );
				$attrs = artes_img_set_attr( $attrs, 'fetchpriority', 'low' );
			}

			$is_lazy = (bool) preg_match( '/\bloading=(?:"lazy"|\'lazy\'|lazy)/i', $attrs );

			if ( ! preg_match( '/\bsizes=/i', $attrs ) && '' !== $rule['sizes'] ) {
				// `sizes="auto, …"` è valido solo con `loading="lazy"`: i browser moderni usano la larghezza
				// effettiva del box, gli altri il valore esplicito di riserva ricavato da artes.css.
				$sizes_val = $is_lazy ? 'auto, ' . $rule['sizes'] : $rule['sizes'];
				$attrs     = artes_img_set_attr( $attrs, 'sizes', $sizes_val );
			}

			return '<img' . $attrs . ( '/' === $m[4] ? ' />' : '>' );
		},
		$html
	);
}

add_filter( 'elementor/frontend/the_content', 'artes_optimize_elementor_images', 99 );

/**
 * Icone del sito (favicon) ricavate dal simbolo del logo: file in `icone/`, generati da tools/rev2/favicon.py.
 * Se in WordPress si imposta un'"Icona del sito" (Aspetto → Personalizza → Identità del sito), vale quella e queste non si stampano.
 */
add_action(
	'wp_head',
	function () {
		if ( has_site_icon() ) {
			return;
		}
		$url = function ( $file ) {
			return esc_url( plugins_url( 'icone/' . $file, __FILE__ ) . '?v=' . ARTES_CORE_VERSION );
		};
		echo '<link rel="icon" href="' . $url( 'favicon.ico' ) . '" sizes="32x32">' . "\n";
		echo '<link rel="icon" href="' . $url( 'icona.svg' ) . '" type="image/svg+xml">' . "\n";
		echo '<link rel="apple-touch-icon" href="' . $url( 'apple-touch-icon.png' ) . '">' . "\n";
	},
	3
);
