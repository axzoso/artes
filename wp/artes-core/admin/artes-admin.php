<?php
/**
 * ARTES Core — pagina di amministrazione "ARTES" (menu laterale) e riquadro "SEO ARTES" negli editor.
 *
 * Pensata per chi prende in mano il sito senza conoscerne la storia: raccoglie in un solo punto le impostazioni del plugin
 * (prima nascoste in opzioni e campi), i controlli di salute, le operazioni di manutenzione e la guida (LEGGIMI-MANUTENZIONE.md).
 * Caricato solo in area amministrazione (vedi artes-core.php). Permessi: manage_options (amministratori).
 *
 * Opzioni gestite: artes_seo_archives, artes_seo_yoast_copiato, artes_antispam_max_link, artes_prova_invio (+ _log), artes_css_aggiuntivo.
 * Meta gestiti: _artes_seo_title, _artes_seo_description (pagine, realizzazioni, brand).
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

const ARTES_ADMIN_SLUG = 'artes';

/* ---------------------------------------------------------------------------------------------------------------- */
/* Menu                                                                                                             */
/* ---------------------------------------------------------------------------------------------------------------- */

add_action(
	'admin_menu',
	function () {
		add_menu_page( 'ARTES', 'ARTES', 'manage_options', ARTES_ADMIN_SLUG, 'artes_admin_pagina', 'dashicons-hammer', 3 );
	}
);

function artes_admin_schede() {
	return array(
		'stato'        => 'Stato',
		'seo'          => 'SEO',
		'moduli'       => 'Moduli',
		'lingue'       => 'Testi e lingue',
		'stile'        => 'Stile',
		'manutenzione' => 'Manutenzione',
		'guida'        => 'Guida',
	);
}

function artes_admin_url( $scheda = 'stato', $extra = array() ) {
	return add_query_arg( array_merge( array( 'page' => ARTES_ADMIN_SLUG, 'tab' => $scheda ), $extra ), admin_url( 'admin.php' ) );
}

function artes_admin_pagina() {
	if ( ! current_user_can( 'manage_options' ) ) {
		return;
	}

	$schede = artes_admin_schede();
	$tab    = isset( $_GET['tab'] ) ? sanitize_key( wp_unslash( $_GET['tab'] ) ) : 'stato'; // phpcs:ignore WordPress.Security.NonceVerification
	$tab    = isset( $schede[ $tab ] ) ? $tab : 'stato';

	echo '<div class="wrap artes-admin"><h1>ARTES <span class="artes-versione">plugin artes-core ' . esc_html( ARTES_CORE_VERSION ) . '</span></h1>';
	echo '<p class="artes-sottotitolo">Impostazioni e manutenzione del sito ARTES. Le pagine si modificano con Elementor; realizzazioni, brand e articoli dai loro menu. Dubbi? Scheda <a href="' . esc_url( artes_admin_url( 'guida' ) ) . '">Guida</a>.</p>';

	if ( isset( $_GET['artes_msg'] ) ) { // phpcs:ignore WordPress.Security.NonceVerification
		echo '<div class="notice notice-success is-dismissible"><p>' . esc_html( sanitize_text_field( wp_unslash( $_GET['artes_msg'] ) ) ) . '</p></div>'; // phpcs:ignore WordPress.Security.NonceVerification
	}

	echo '<nav class="nav-tab-wrapper">';
	foreach ( $schede as $k => $etichetta ) {
		printf( '<a href="%s" class="nav-tab%s">%s</a>', esc_url( artes_admin_url( $k ) ), $k === $tab ? ' nav-tab-active' : '', esc_html( $etichetta ) );
	}
	echo '</nav><div class="artes-scheda">';

	call_user_func( 'artes_admin_scheda_' . $tab );

	echo '</div></div>';
}

add_action(
	'admin_head',
	function () {
		$screen = get_current_screen();

		if ( ! $screen || false === strpos( (string) $screen->id, ARTES_ADMIN_SLUG ) ) {
			return;
		}

		echo '<style>
			.artes-admin .artes-versione{font-size:13px;font-weight:400;color:#646970;margin-left:8px}
			.artes-admin .artes-sottotitolo{color:#50575e;max-width:900px}
			.artes-admin .artes-scheda{max-width:1100px;margin-top:20px}
			.artes-admin .artes-box{background:#fff;border:1px solid #c3c4c7;padding:18px 22px;margin:0 0 20px}
			.artes-admin .artes-box h2{margin-top:0}
			.artes-admin .artes-controlli td,.artes-admin .artes-controlli th{padding:8px 10px;vertical-align:top}
			.artes-admin .artes-ok{color:#008a20;font-weight:600}
			.artes-admin .artes-ko{color:#d63638;font-weight:600}
			.artes-admin .artes-info{color:#996800;font-weight:600}
			.artes-admin textarea.artes-css{width:100%;min-height:320px;font-family:Consolas,Monaco,monospace;font-size:13px}
			.artes-admin .artes-guida{background:#fff;border:1px solid #c3c4c7;padding:10px 30px 30px;max-width:900px;line-height:1.6}
			.artes-admin .artes-guida code{font-size:12px}
			.artes-admin .artes-guida pre{background:#f6f7f7;padding:12px;overflow:auto}
			.artes-admin .descrizione{color:#646970;font-size:12px}
		</style>';
	}
);

/* ---------------------------------------------------------------------------------------------------------------- */
/* Salvataggi (admin-post.php, con nonce)                                                                          */
/* ---------------------------------------------------------------------------------------------------------------- */

function artes_admin_form_apri( $azione ) {
	echo '<form method="post" action="' . esc_url( admin_url( 'admin-post.php' ) ) . '">';
	echo '<input type="hidden" name="action" value="artes_' . esc_attr( $azione ) . '">';
	wp_nonce_field( 'artes_' . $azione );
}

function artes_admin_verifica( $azione ) {
	if ( ! current_user_can( 'manage_options' ) ) {
		wp_die( 'Permessi insufficienti.' );
	}

	check_admin_referer( 'artes_' . $azione );
}

function artes_admin_torna( $scheda, $messaggio ) {
	wp_safe_redirect( artes_admin_url( $scheda, array( 'artes_msg' => rawurlencode( $messaggio ) ) ) );
	exit;
}

function artes_admin_svuota_cache() {
	if ( class_exists( '\Elementor\Plugin' ) ) {
		\Elementor\Plugin::$instance->files_manager->clear_cache();
	}

	wp_cache_flush();
	do_action( 'wpml_cache_clear' );
}

add_action(
	'admin_post_artes_seo',
	function () {
		artes_admin_verifica( 'seo' );
		$dati = isset( $_POST['seo'] ) && is_array( $_POST['seo'] ) ? wp_unslash( $_POST['seo'] ) : array(); // phpcs:ignore WordPress.Security.ValidatedSanitizedInput, WordPress.Security.NonceVerification
		$out  = array();

		foreach ( array( 'realizzazione', 'brand' ) as $tipo ) {
			$out[ $tipo ] = array(
				'title'       => sanitize_text_field( $dati[ $tipo ]['title'] ?? '' ),
				'description' => sanitize_textarea_field( $dati[ $tipo ]['description'] ?? '' ),
			);
		}

		update_option( 'artes_seo_archives', $out );
		artes_admin_torna( 'seo', 'SEO degli archivi salvata. Per l\'inglese: Testi e lingue → traduzione delle stringhe.' );
	}
);

add_action(
	'admin_post_artes_moduli',
	function () {
		artes_admin_verifica( 'moduli' );
		update_option( 'artes_antispam_max_link', max( 0, (int) ( $_POST['max_link'] ?? 3 ) ) ); // phpcs:ignore WordPress.Security.NonceVerification
		update_option( 'artes_prova_invio', ! empty( $_POST['prova_invio'] ) ? 1 : 0, false ); // phpcs:ignore WordPress.Security.NonceVerification

		if ( ! empty( $_POST['svuota_log'] ) ) { // phpcs:ignore WordPress.Security.NonceVerification
			delete_option( 'artes_prova_invio_log' );
		}

		artes_admin_torna( 'moduli', get_option( 'artes_prova_invio' ) ? 'Salvato. ATTENZIONE: modalità prova accesa, le email del sito NON partono.' : 'Impostazioni dei moduli salvate.' );
	}
);

add_action(
	'admin_post_artes_stile',
	function () {
		artes_admin_verifica( 'stile' );
		$css = isset( $_POST['css'] ) ? wp_strip_all_tags( wp_unslash( $_POST['css'] ) ) : ''; // phpcs:ignore WordPress.Security.ValidatedSanitizedInput, WordPress.Security.NonceVerification
		update_option( 'artes_css_aggiuntivo', $css );
		artes_admin_torna( 'stile', 'CSS aggiuntivo salvato.' );
	}
);

add_action(
	'admin_post_artes_copia_yoast',
	function () {
		artes_admin_verifica( 'copia_yoast' );
		$n      = 0;
		$lingue = array_keys( (array) apply_filters( 'wpml_active_languages', null, array( 'skip_missing' => 0 ) ) );
		$lingue = $lingue ? $lingue : array( '' );

		foreach ( $lingue as $lingua ) {
			if ( $lingua ) {
				do_action( 'wpml_switch_language', $lingua );
			}
			$ids = get_posts( array( 'post_type' => array( 'page', 'realizzazione', 'brand' ), 'post_status' => array( 'publish', 'draft' ), 'numberposts' => -1, 'fields' => 'ids', 'suppress_filters' => false ) );
			foreach ( $ids as $id ) {
				$seo = artes_seo_for_post( $id );
				if ( '' !== $seo['title'] && '' === (string) get_post_meta( $id, '_yoast_wpseo_title', true ) ) {
					update_post_meta( $id, '_yoast_wpseo_title', $seo['title'] );
					$n++;
				}
				if ( '' !== $seo['description'] && '' === (string) get_post_meta( $id, '_yoast_wpseo_metadesc', true ) ) {
					update_post_meta( $id, '_yoast_wpseo_metadesc', $seo['description'] );
					$n++;
				}
			}
		}
		if ( $lingue[0] ) {
			do_action( 'wpml_switch_language', apply_filters( 'wpml_default_language', null ) );
		}

		// archivi (lingua principale; le traduzioni dei testi di Yoast si fanno in WPML → Traduzione stringhe)
		$titoli = (array) get_option( 'wpseo_titles', array() );
		foreach ( array( 'realizzazione', 'brand' ) as $tipo ) {
			$m = artes_seo_get_archive_meta( $tipo );
			if ( empty( $titoli[ 'title-ptarchive-' . $tipo ] ) && '' !== $m['title'] ) {
				$titoli[ 'title-ptarchive-' . $tipo ] = $m['title'];
				$n++;
			}
			if ( empty( $titoli[ 'metadesc-ptarchive-' . $tipo ] ) && '' !== $m['description'] ) {
				$titoli[ 'metadesc-ptarchive-' . $tipo ] = $m['description'];
				$n++;
			}
		}
		update_option( 'wpseo_titles', $titoli );
		update_option( 'artes_seo_yoast_copiato', current_time( 'mysql' ) . ' (' . $n . ' campi)' );
		artes_admin_torna( 'seo', 'Copiati in Yoast ' . $n . ' campi.' );
	}
);

add_action(
	'admin_post_artes_pubblica',
	function () {
		artes_admin_verifica( 'pubblica' );
		$id  = (int) ( $_POST['pagina'] ?? 0 ); // phpcs:ignore WordPress.Security.NonceVerification
		$ids = array( $id );
		$tr  = apply_filters( 'wpml_element_trid', null, $id, 'post_page' );
		foreach ( (array) apply_filters( 'wpml_get_element_translations', null, $tr, 'post_page' ) as $t ) {
			$ids[] = (int) $t->element_id;
		}
		$fatte = array();
		foreach ( array_unique( array_filter( $ids ) ) as $p ) {
			if ( 'page' === get_post_type( $p ) && 'draft' === get_post_status( $p ) ) {
				wp_update_post( array( 'ID' => $p, 'post_status' => 'publish' ) );
				$fatte[] = get_the_title( $p );
			}
		}
		artes_admin_svuota_cache();
		artes_admin_torna( 'manutenzione', $fatte ? 'Pubblicate: ' . implode( ', ', $fatte ) . '. Ora aggiorna i link di header e footer (vedi sotto).' : 'Nessuna pagina pubblicata.' );
	}
);

add_action(
	'admin_post_artes_manutenzione',
	function () {
		artes_admin_verifica( 'manutenzione' );
		$fatto = array();

		if ( ! empty( $_POST['cache'] ) ) { // phpcs:ignore WordPress.Security.NonceVerification
			artes_admin_svuota_cache();
			$fatto[] = 'cache svuotate';
		}

		if ( ! empty( $_POST['permalink'] ) ) { // phpcs:ignore WordPress.Security.NonceVerification
			flush_rewrite_rules( false );
			$fatto[] = 'permalink rigenerati';
		}

		artes_admin_torna( 'manutenzione', $fatto ? ucfirst( implode( ', ', $fatto ) ) . '.' : 'Nessuna operazione scelta.' );
	}
);

/* ---------------------------------------------------------------------------------------------------------------- */
/* Controlli di salute                                                                                             */
/* ---------------------------------------------------------------------------------------------------------------- */

/**
 * Documenti Elementor che contengono un modulo (e-form) e, per ciascun modulo, se l'honeypot è l'ultimo campo.
 * Un honeypot PRIMA del campo allegati fa perdere i file in silenzio (difetto di Elementor Pro, verificato il 2026-11-25).
 */
function artes_admin_moduli_honeypot() {
	global $wpdb;
	$righe = $wpdb->get_col( "SELECT post_id FROM {$wpdb->postmeta} m JOIN {$wpdb->posts} p ON p.ID = m.post_id WHERE m.meta_key = '_elementor_data' AND p.post_type <> 'revision' AND p.post_status <> 'trash' AND m.meta_value LIKE '%\"e-form\"%'" ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery
	$out   = array();

	foreach ( $righe as $id ) {
		$data = json_decode( (string) get_post_meta( (int) $id, '_elementor_data', true ), true );
		$cerca = function ( $els ) use ( &$cerca, &$out, $id ) {
			foreach ( (array) $els as $e ) {
				if ( 'e-form' === ( $e['elType'] ?? '' ) || 'e-form' === ( $e['widgetType'] ?? '' ) ) {
					$figli = array_values( (array) ( $e['elements'] ?? array() ) );
					$tipi  = array_map( function ( $f ) { return $f['widgetType'] ?? ( $f['elType'] ?? '' ); }, $figli );
					$pos   = array_search( 'e-form-honeypot', $tipi, true );
					$out[] = array(
						'id'    => (int) $id,
						'stato' => false === $pos ? 'manca' : ( count( $tipi ) - 1 === $pos ? 'ok' : 'non-ultimo' ),
					);
				}
				if ( ! empty( $e['elements'] ) ) {
					$cerca( $e['elements'] );
				}
			}
		};
		$cerca( $data );
	}

	return $out;
}

function artes_admin_controlli() {
	$dir = dirname( __DIR__ ) . '/';
	$c   = array();

	$c[] = array( 'Caratteri serviti dal sito', file_exists( $dir . 'fonts/fonts.css' ) ? 'ok' : 'ko', file_exists( $dir . 'fonts/fonts.css' ) ? 'fonts/fonts.css presente: nessuna richiesta a Google.' : 'Manca la cartella fonts del plugin: reinstallare lo ZIP completo.' );
	$c[] = array( 'CSS generato', file_exists( $dir . 'artes-rev2.css' ) ? 'ok' : 'ko', 'artes-rev2.css ' . ( file_exists( $dir . 'artes-rev2.css' ) ? '(' . size_format( filesize( $dir . 'artes-rev2.css' ) ) . ')' : 'MANCANTE' ) );

	$kit = (int) get_option( 'elementor_active_kit' );
	$ks  = $kit ? get_post_meta( $kit, '_elementor_page_settings', true ) : array();
	$c[] = array( 'CSS personalizzato del kit Elementor', empty( $ks['custom_css'] ) ? 'ok' : 'info', empty( $ks['custom_css'] ) ? 'Vuoto, come deve essere (lo stile è nel plugin).' : 'Contiene del CSS: spostarlo nella scheda Stile per non avere stili in due posti.' );

	$c[] = array( 'Indicizzazione', '0' === (string) get_option( 'blog_public' ) ? 'info' : 'ok', '0' === (string) get_option( 'blog_public' ) ? 'noindex attivo (corretto in staging; da togliere in produzione: Impostazioni → Lettura).' : 'Il sito è indicizzabile dai motori di ricerca.' );

	global $sitepress;
	if ( $sitepress ) {
		$c[] = array( 'WPML', $sitepress->get_setting( 'setup_complete' ) ? 'ok' : 'ko', $sitepress->get_setting( 'setup_complete' ) ? 'Configurazione completata, lingue: ' . implode( ', ', array_keys( (array) apply_filters( 'wpml_active_languages', null, array( 'skip_missing' => 0 ) ) ) ) . '.' : 'Configurazione iniziale NON completata: i contenuti delle lingue si mescolano.' );
	} else {
		$c[] = array( 'Multilingua', 'info', 'WPML non attivo: il sito è solo in italiano. Vedi Guida, sezione Lingue.' );
	}

	$smtp = array_filter( (array) get_option( 'active_plugins' ), function ( $p ) { return false !== stripos( $p, 'smtp' ) || false !== stripos( $p, 'mail' ); } );
	$c[]  = array( 'Invio email', $smtp ? 'ok' : 'info', $smtp ? 'Plugin SMTP attivo: ' . esc_html( implode( ', ', $smtp ) ) : 'Nessun plugin SMTP: le email partono dal server (rischio spam). Da configurare sul dominio definitivo.' );
	$c[]  = array( 'Modalità prova dei moduli', get_option( 'artes_prova_invio' ) ? 'ko' : 'ok', get_option( 'artes_prova_invio' ) ? 'ACCESA: le email del sito non partono. Spegnerla nella scheda Moduli.' : 'Spenta: le email partono normalmente.' );

	foreach ( artes_admin_moduli_honeypot() as $m ) {
		$titolo = get_the_title( $m['id'] ) . ' (#' . $m['id'] . ', ' . get_post_status( $m['id'] ) . ')';
		$testo  = array(
			'ok'         => 'campo anti-spam presente ed è l\'ultimo del modulo.',
			'manca'      => 'manca il campo anti-spam (Honeypot): aggiungerlo in Elementor come ULTIMO campo del modulo.',
			'non-ultimo' => 'il campo anti-spam NON è l\'ultimo: spostarlo in fondo, altrimenti gli allegati vengono persi.',
		);
		// le sezioni "[Riserva]" della libreria non sono in nessuna pagina: solo un promemoria
		if ( 'ok' !== $m['stato'] && 0 === strpos( get_the_title( $m['id'] ), '[Riserva]' ) ) {
			$c[] = array( 'Modulo: ' . $titolo, 'info', 'Sezione di riserva non usata nel sito. Se la si rimette in una pagina, aggiungere il campo Honeypot come ULTIMO campo del modulo.' );
			continue;
		}

		$c[] = array( 'Modulo: ' . $titolo, 'ok' === $m['stato'] ? 'ok' : 'ko', $testo[ $m['stato'] ] );
	}

	return $c;
}

/* ---------------------------------------------------------------------------------------------------------------- */
/* Schede                                                                                                          */
/* ---------------------------------------------------------------------------------------------------------------- */

function artes_admin_scheda_stato() {
	echo '<div class="artes-box"><h2>Controlli</h2><table class="widefat striped artes-controlli"><tbody>';
	foreach ( artes_admin_controlli() as $r ) {
		$segno = array( 'ok' => array( 'artes-ok', '✓' ), 'ko' => array( 'artes-ko', '✗' ), 'info' => array( 'artes-info', '!' ) )[ $r[1] ];
		printf( '<tr><td style="width:30px" class="%s">%s</td><th style="width:300px">%s</th><td>%s</td></tr>', esc_attr( $segno[0] ), esc_html( $segno[1] ), esc_html( $r[0] ), wp_kses_post( $r[2] ) );
	}
	echo '</tbody></table></div>';

	$tpl = get_posts( array( 'post_type' => 'elementor_library', 'post_status' => array( 'publish', 'draft' ), 'numberposts' => -1, 'meta_key' => '_elementor_template_type', 'suppress_filters' => false, 'orderby' => 'title', 'order' => 'ASC' ) );
	echo '<div class="artes-box"><h2>Template del Theme Builder</h2><p class="descrizione">Header, footer, schede e archivi: si modificano con Elementor. Le versioni inglesi si aprono dal selettore di lingua di WPML.</p><table class="widefat striped"><thead><tr><th>Template</th><th>Tipo</th><th>Stato</th><th>Condizioni</th><th></th></tr></thead><tbody>';
	foreach ( $tpl as $t ) {
		$tipo = get_post_meta( $t->ID, '_elementor_template_type', true );
		if ( ! in_array( $tipo, array( 'header', 'footer', 'single', 'single-post', 'single-page', 'archive', 'error-404' ), true ) ) {
			continue;
		}
		$cond = (array) get_post_meta( $t->ID, '_elementor_conditions', true );
		printf(
			'<tr><td>%s <span class="descrizione">#%d</span></td><td>%s</td><td>%s</td><td><code>%s</code></td><td><a href="%s">Modifica con Elementor</a></td></tr>',
			esc_html( $t->post_title ),
			(int) $t->ID,
			esc_html( $tipo ),
			'publish' === $t->post_status ? 'pubblicato' : 'bozza',
			esc_html( implode( ', ', array_filter( $cond ) ) ),
			esc_url( admin_url( 'post.php?post=' . $t->ID . '&action=elementor' ) )
		);
	}
	echo '</tbody></table></div>';
}

function artes_admin_scheda_seo() {
	echo '<div class="artes-box"><h2>Plugin SEO esterno (Yoast)</h2>';
	if ( artes_seo_esterno() ) {
		echo '<p class="artes-ok">Plugin SEO esterno attivo: titolo e descrizione delle pagine li gestisce lui. Il plugin ARTES non li scrive più e il riquadro "SEO ARTES" è nascosto.</p>';
		if ( defined( 'WPSEO_VERSION' ) ) {
			$copiato = get_option( 'artes_seo_yoast_copiato' );
			echo '<p>Copia in Yoast i titoli e le descrizioni scritti finora (pagine, realizzazioni, brand e i due archivi, in tutte le lingue). Non sovrascrive i campi di Yoast già compilati.</p>';
			echo $copiato ? '<p class="descrizione">Ultima copia: ' . esc_html( $copiato ) . '</p>' : '';
			artes_admin_form_apri( 'copia_yoast' );
			submit_button( 'Copia in Yoast', 'primary', 'submit', false );
			echo '</form>';
		}
		echo '<p class="descrizione">Dati strutturati: il plugin ARTES non ne genera. Le uniche FAQ in JSON-LD sono scritte dentro le 5 pagine settore (sezione FAQ): se il consulente SEO le gestisce con Yoast o con i suoi script, toglierle da quelle pagine per non averle doppie.</p>';
	} else {
		echo '<p>Nessun plugin SEO esterno: titolo e descrizione li scrive il plugin ARTES (sotto e nel riquadro "SEO ARTES" degli editor). Se si installa Yoast SEO, il plugin ARTES si fa da parte da solo e qui compare il pulsante per copiare i testi in Yoast.</p>';
	}
	echo '</div>';

	$salvate = (array) get_option( 'artes_seo_archives', array() );
	$def     = function_exists( 'artes_seo_archive_raw_it_defaults' ) ? artes_seo_archive_raw_it_defaults() : array();

	echo '<div class="artes-box"><h2>Archivi</h2><p class="descrizione">Titolo e descrizione per i motori di ricerca degli archivi Realizzazioni e Brand partner. Vuoto = testo predefinito (mostrato in grigio).</p>';
	artes_admin_form_apri( 'seo' );
	echo '<table class="form-table">';
	foreach ( array( 'realizzazione' => 'Archivio Realizzazioni', 'brand' => 'Archivio Brand partner' ) as $tipo => $nome ) {
		$v = $salvate[ $tipo ] ?? array();
		printf( '<tr><th>%s — titolo</th><td><input type="text" class="large-text" name="seo[%s][title]" value="%s" placeholder="%s"></td></tr>', esc_html( $nome ), esc_attr( $tipo ), esc_attr( $v['title'] ?? '' ), esc_attr( $def[ $tipo ]['title'] ?? '' ) );
		printf( '<tr><th>%s — descrizione</th><td><textarea class="large-text" rows="3" name="seo[%s][description]" placeholder="%s">%s</textarea></td></tr>', esc_html( $nome ), esc_attr( $tipo ), esc_attr( $def[ $tipo ]['description'] ?? '' ), esc_textarea( $v['description'] ?? '' ) );
	}
	echo '</table>';
	submit_button( 'Salva SEO degli archivi' );
	echo '</form></div>';

	echo '<div class="artes-box"><h2>Pagine, realizzazioni, brand</h2><p>Ogni pagina, realizzazione e brand ha il riquadro <strong>SEO ARTES</strong> nella schermata di modifica di WordPress (non dentro Elementor): titolo e descrizione per Google. Se vuoti:</p><ul style="list-style:disc;padding-left:20px">';
	echo '<li><strong>Realizzazioni</strong>: titolo = «riga parola chiave: nome — Artes», descrizione = «nome, località: introduzione».</li>';
	echo '<li><strong>Brand</strong>: titolo = «nome — Brand partner Artes», descrizione generata dalla categoria.</li>';
	echo '<li><strong>Pagine</strong>: titolo della pagina + «— Artes».</li></ul>';
	echo '<p class="descrizione">Il testo alternativo delle immagini si scrive nella Libreria media (italiano: "Testo alternativo"; inglese: "Testo alternativo (EN)").</p></div>';
}

function artes_admin_scheda_moduli() {
	$log = (array) get_option( 'artes_prova_invio_log', array() );

	echo '<div class="artes-box"><h2>Anti-spam e prove</h2>';
	artes_admin_form_apri( 'moduli' );
	echo '<table class="form-table">';
	printf( '<tr><th>Link massimi in un messaggio</th><td><input type="number" min="0" max="50" name="max_link" value="%d"> <p class="descrizione">I messaggi con più link vengono rifiutati come spam. 0 = controllo spento. In più ogni modulo ha un campo anti-spam invisibile (Honeypot), che deve essere l\'ULTIMO campo del modulo.</p></td></tr>', (int) get_option( 'artes_antispam_max_link', 3 ) );
	printf( '<tr><th>Modalità prova</th><td><label><input type="checkbox" name="prova_invio" value="1" %s> Accesa: le email del sito NON partono, vengono registrate qui sotto</label><p class="descrizione">Serve a provare i moduli senza scrivere al cliente. Ricordarsi di spegnerla.</p></td></tr>', checked( (bool) get_option( 'artes_prova_invio' ), true, false ) );
	echo '<tr><th>Registro</th><td><label><input type="checkbox" name="svuota_log" value="1"> Svuota il registro delle prove</label></td></tr>';
	echo '</table>';
	submit_button( 'Salva' );
	echo '</form></div>';

	echo '<div class="artes-box"><h2>Registro delle email intercettate (ultime 10)</h2>';
	if ( ! $log ) {
		echo '<p>Nessuna email registrata.</p>';
	} else {
		echo '<table class="widefat striped"><thead><tr><th>Quando</th><th>A</th><th>Oggetto</th><th>Allegati</th><th>Testo</th></tr></thead><tbody>';
		foreach ( array_reverse( $log ) as $e ) {
			$all = implode( ', ', array_map( function ( $a ) { return is_array( $a ) ? ( $a['nome'] ?? '' ) : (string) $a; }, (array) ( $e['allegati'] ?? array() ) ) );
			printf( '<tr><td>%s</td><td>%s</td><td>%s</td><td>%s</td><td>%s</td></tr>', esc_html( $e['quando'] ?? '' ), esc_html( is_array( $e['to'] ?? '' ) ? implode( ', ', $e['to'] ) : ( $e['to'] ?? '' ) ), esc_html( $e['subject'] ?? '' ), esc_html( $all ), esc_html( wp_trim_words( (string) ( $e['message'] ?? '' ), 30 ) ) );
		}
		echo '</tbody></table>';
	}
	echo '</div>';

	echo '<div class="artes-box"><h2>Dove si cambiano destinatario e campi</h2><p>Destinatario, oggetto e campi di ogni modulo si modificano in Elementor, aprendo la pagina (Contatti, Richiedi un preventivo) e selezionando il modulo. Gli allegati arrivano in allegato all\'email e vengono cancellati dal server dopo l\'invio.</p></div>';
}

function artes_admin_scheda_lingue() {
	echo '<div class="artes-box"><h2>Testi del plugin</h2><p>Alcune frasi non stanno nei widget di Elementor ma nel plugin: briciole di pane, "Scopri l\'arredo…", "Galleria fotografica · N foto", testi dei filtri e dei pulsanti, titoli SEO calcolati. L\'italiano è nel codice; le traduzioni si gestiscono qui:</p>';
	if ( defined( 'WPML_ST_VERSION' ) ) {
		printf( '<p><a class="button button-primary" href="%s">Traduzioni delle stringhe ARTES (WPML)</a></p>', esc_url( admin_url( 'admin.php?page=wpml-string-translation/menu/string-translation.php&context=artes-core' ) ) );
	} else {
		echo '<p class="artes-info">WPML String Translation non è attivo: le traduzioni vengono dal file languages/artes-core-en_GB.mo del plugin.</p>';
	}
	echo '</div>';

	echo '<div class="artes-box"><h2>Pagine, template e contenuti</h2><ul style="list-style:disc;padding-left:20px">';
	echo '<li><strong>Pagine e template</strong>: si traducono aprendo la versione inglese (icona della lingua nell\'elenco Pagine o Modelli) e modificandola con Elementor. Una modifica all\'italiano NON aggiorna da sola l\'inglese.</li>';
	echo '<li><strong>Realizzazioni, brand, categorie</strong>: versione inglese dall\'icona della lingua nei rispettivi elenchi.</li>';
	echo '<li><strong>Immagini</strong>: testo alternativo inglese nel campo "Testo alternativo (EN)" della Libreria media.</li>';
	echo '<li><strong>Indirizzi inglesi</strong> (es. /en/projects/, /en/about-us/): slug delle pagine inglesi; le basi "projects" e "brand-partners" sono in WPML → Traduzione stringhe, contesto "WordPress", "URL slug".</li></ul></div>';
}

function artes_admin_scheda_stile() {
	echo '<div class="artes-box"><h2>Come è fatto lo stile</h2><ul style="list-style:disc;padding-left:20px">';
	echo '<li><code>artes-rev2.css</code> (nel plugin) è <strong>generato</strong> dal foglio della rev2: non modificarlo a mano, verrebbe sovrascritto.</li>';
	echo '<li>Le classi di Elementor (es. <code>hero__title</code>) sono solo etichette: lo stile vero è nel CSS del plugin. Per riusare un componente basta dare la stessa classe.</li>';
	echo '<li>Il CSS personalizzato del kit di Elementor deve restare vuoto.</li>';
	echo '<li>Per piccoli ritocchi usare il campo qui sotto: viene caricato dopo il CSS del sito. I selettori vanno scritti come quelli del plugin: <code>body.rev2 .elementor .classe { … }</code>.</li></ul></div>';

	echo '<div class="artes-box"><h2>CSS aggiuntivo</h2>';
	artes_admin_form_apri( 'stile' );
	printf( '<textarea class="artes-css" name="css" spellcheck="false" placeholder="body.rev2 .elementor .classe { … }">%s</textarea>', esc_textarea( (string) get_option( 'artes_css_aggiuntivo', '' ) ) );
	submit_button( 'Salva CSS aggiuntivo' );
	echo '</form></div>';
}

function artes_admin_scheda_manutenzione() {
	$bozze = get_posts( array( 'post_type' => 'page', 'post_status' => 'draft', 'numberposts' => -1, 'suppress_filters' => false, 'orderby' => 'title', 'order' => 'ASC' ) );
	echo '<div class="artes-box"><h2>Pagine in bozza</h2>';
	if ( ! $bozze ) {
		echo '<p>Nessuna pagina in bozza.</p>';
	} else {
		echo '<p class="descrizione">"Pubblica" mette online la pagina italiana e la sua traduzione inglese. Prima compila il riquadro SEO (o Yoast) di entrambe.</p><table class="widefat striped"><thead><tr><th>Pagina</th><th>Inglese</th><th></th></tr></thead><tbody>';
		foreach ( $bozze as $b ) {
			$en = (int) apply_filters( 'wpml_object_id', $b->ID, 'page', false, 'en-gb' );
			echo '<tr><td>' . esc_html( $b->post_title ) . ' <span class="descrizione">/' . esc_html( $b->post_name ) . '/</span></td><td>' . ( $en && $en !== $b->ID ? esc_html( get_the_title( $en ) ) . ' <span class="descrizione">/en/' . esc_html( get_post_field( 'post_name', $en ) ) . '/ (' . esc_html( get_post_status( $en ) ) . ')</span>' : '—' ) . '</td><td>';
			artes_admin_form_apri( 'pubblica' );
			echo '<input type="hidden" name="pagina" value="' . (int) $b->ID . '">';
			submit_button( 'Pubblica (IT + EN)', 'secondary small', 'submit', false );
			echo '</form></td></tr>';
		}
		echo '</tbody></table>';
		echo '<p><strong>Dopo la pubblicazione</strong>: oggi header e footer non puntano a queste pagine (es. "Area progettisti" porta a Contract, "Richiedi un preventivo" a Contatti, "Prodotti" e "Cataloghi" a Brand partner). Aggiorna quei link in Elementor nell\'header e nel footer, in italiano e in inglese.</p>';
	}
	echo '</div>';

	echo '<div class="artes-box"><h2>Operazioni</h2>';
	artes_admin_form_apri( 'manutenzione' );
	echo '<p><label><input type="checkbox" name="cache" value="1" checked> Svuota le cache (CSS di Elementor, cache di WordPress e WPML)</label><br><span class="descrizione">Da fare dopo una modifica a template o classi se il sito non mostra il cambiamento.</span></p>';
	echo '<p><label><input type="checkbox" name="permalink" value="1"> Rigenera i permalink</label><br><span class="descrizione">Da fare se un indirizzo dà 404 dopo aver cambiato slug o lingue.</span></p>';
	submit_button( 'Esegui' );
	echo '</form></div>';

	$blog = get_posts( array( 'post_type' => 'elementor_library', 'post_status' => array( 'publish', 'draft' ), 'numberposts' => 10, 's' => 'blog (rev2)', 'suppress_filters' => false ) );
	echo '<div class="artes-box"><h2>Blog</h2>';
	if ( $blog ) {
		echo '<ul style="list-style:disc;padding-left:20px">';
		foreach ( $blog as $b ) {
			printf( '<li>%s — <strong>%s</strong> (<a href="%s">modifica</a>)</li>', esc_html( $b->post_title ), 'publish' === $b->post_status ? 'pubblicato' : 'bozza', esc_url( admin_url( 'post.php?post=' . $b->ID . '&action=elementor' ) ) );
		}
		echo '</ul>';
	}
	echo '<p>Per accendere il blog: 1) creare la pagina "Blog" e sceglierla come "Pagina articoli" in Impostazioni → Lettura; 2) pubblicare i due template qui sopra (da Elementor, pulsante Pubblica: le condizioni sono già impostate); 3) aggiungere "Blog" al menu dell\'header; 4) tradurre template e pagina in inglese.</p></div>';

	echo '<div class="artes-box"><h2>Aggiornare il plugin</h2><p>Il plugin si aggiorna caricando un nuovo ZIP da Plugin → Aggiungi nuovo → Carica (sostituisce la versione installata). Lo ZIP deve contenere anche le cartelle <code>admin</code>, <code>fonts</code> e <code>languages</code>. Dopo l\'aggiornamento: scheda Stato, controllare che tutto sia verde.</p></div>';
}

function artes_admin_scheda_guida() {
	$file = dirname( __DIR__ ) . '/LEGGIMI-MANUTENZIONE.md';

	if ( ! file_exists( $file ) ) {
		echo '<p>Guida non trovata (LEGGIMI-MANUTENZIONE.md).</p>';
		return;
	}

	echo '<div class="artes-guida">' . artes_admin_markdown( (string) file_get_contents( $file ) ) . '</div>'; // phpcs:ignore WordPress.Security.EscapeOutput -- il testo è escapato dentro la funzione
}

/**
 * Markdown minimo per la guida (titoli, elenchi, grassetto, codice, link, blocchi di codice). Tutto il testo è escapato.
 */
function artes_admin_markdown( $md ) {
	$out    = '';
	$lista  = false;
	$codice = false;

	$inline = function ( $t ) {
		$t = esc_html( $t );
		$t = preg_replace( '/`([^`]+)`/', '<code>$1</code>', $t );
		$t = preg_replace( '/\*\*([^*]+)\*\*/', '<strong>$1</strong>', $t );
		$t = preg_replace_callback( '/\[([^\]]+)\]\(([^)]+)\)/', function ( $m ) { return '<a href="' . esc_url( html_entity_decode( $m[2] ) ) . '">' . $m[1] . '</a>'; }, $t );
		return $t;
	};

	foreach ( preg_split( '/\r?\n/', $md ) as $riga ) {
		if ( 0 === strpos( $riga, '```' ) ) {
			$out   .= $codice ? '</pre>' : ( $lista ? '</ul>' : '' ) . '<pre>';
			$lista  = $codice ? $lista : false;
			$codice = ! $codice;
			continue;
		}
		if ( $codice ) {
			$out .= esc_html( $riga ) . "\n";
			continue;
		}
		if ( preg_match( '/^\s*[-*] (.*)$/', $riga, $m ) ) {
			$out  .= ( $lista ? '' : '<ul style="list-style:disc;padding-left:20px">' ) . '<li>' . $inline( $m[1] ) . '</li>';
			$lista = true;
			continue;
		}
		if ( $lista ) {
			$out  .= '</ul>';
			$lista = false;
		}
		if ( preg_match( '/^(#{1,4}) (.*)$/', $riga, $m ) ) {
			$n    = min( 4, strlen( $m[1] ) + 1 );
			$out .= '<h' . $n . '>' . $inline( $m[2] ) . '</h' . $n . '>';
		} elseif ( '' !== trim( $riga ) ) {
			$out .= '<p>' . $inline( $riga ) . '</p>';
		}
	}

	return $out . ( $lista ? '</ul>' : '' ) . ( $codice ? '</pre>' : '' );
}

/* ---------------------------------------------------------------------------------------------------------------- */
/* Riquadro "SEO ARTES" negli editor di pagine, realizzazioni e brand                                              */
/* ---------------------------------------------------------------------------------------------------------------- */

add_action(
	'add_meta_boxes',
	function () {
		if ( artes_seo_esterno() ) {
			return;
		}

		foreach ( array( 'page', 'realizzazione', 'brand' ) as $tipo ) {
			add_meta_box( 'artes_seo', 'SEO ARTES', 'artes_admin_metabox_seo', $tipo, 'normal', 'default' );
		}
	}
);

function artes_admin_metabox_seo( $post ) {
	wp_nonce_field( 'artes_seo_meta', 'artes_seo_nonce' );
	$auto  = function_exists( 'artes_seo_for_post' ) ? artes_seo_for_post( $post->ID ) : array( 'title' => '', 'description' => '' );
	$title = (string) get_post_meta( $post->ID, '_artes_seo_title', true );
	$desc  = (string) get_post_meta( $post->ID, '_artes_seo_description', true );

	echo '<p class="description">Titolo e descrizione per Google e per la condivisione. Vuoti = testo calcolato automaticamente (mostrato in grigio). Lunghezze consigliate: titolo fino a 60 caratteri, descrizione 120-160.</p>';
	printf( '<p><label for="artes_seo_title"><strong>Titolo SEO</strong></label><br><input type="text" id="artes_seo_title" name="artes_seo_title" class="large-text" value="%s" placeholder="%s"></p>', esc_attr( $title ), esc_attr( $title ? '' : $auto['title'] ) );
	printf( '<p><label for="artes_seo_description"><strong>Descrizione SEO</strong></label><br><textarea id="artes_seo_description" name="artes_seo_description" class="large-text" rows="3" placeholder="%s">%s</textarea></p>', esc_attr( $desc ? '' : $auto['description'] ), esc_textarea( $desc ) );
}

add_action(
	'save_post',
	function ( $post_id ) {
		if ( ! isset( $_POST['artes_seo_nonce'] ) || ! wp_verify_nonce( sanitize_text_field( wp_unslash( $_POST['artes_seo_nonce'] ) ), 'artes_seo_meta' ) ) {
			return;
		}

		if ( ( defined( 'DOING_AUTOSAVE' ) && DOING_AUTOSAVE ) || ! current_user_can( 'edit_post', $post_id ) ) {
			return;
		}

		foreach ( array( 'artes_seo_title' => '_artes_seo_title', 'artes_seo_description' => '_artes_seo_description' ) as $campo => $meta ) {
			$v = isset( $_POST[ $campo ] ) ? sanitize_textarea_field( wp_unslash( $_POST[ $campo ] ) ) : '';
			if ( '' === trim( $v ) ) {
				delete_post_meta( $post_id, $meta );
			} else {
				update_post_meta( $post_id, $meta, $v );
			}
		}
	}
);

/* Collegamento rapido alla pagina ARTES dall'elenco dei plugin */
add_filter(
	'plugin_action_links_artes-core/artes-core.php',
	function ( $links ) {
		array_unshift( $links, '<a href="' . esc_url( artes_admin_url() ) . '">Impostazioni</a>' );
		return $links;
	}
);
