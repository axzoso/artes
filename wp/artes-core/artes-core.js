/**
 * ARTES Core — lightbox delle gallerie.
 *
 * Un clic su un'immagine di galleria (.gallery-img) o sull'immagine principale di una scheda
 * (.scheda-hero) la apre a tutto schermo, alla risoluzione piena. Le immagini dello stesso blocco
 * (.scheda-media) formano una sequenza: frecce, tastiera (← → Esc) e swipe su touch.
 * Nessuna dipendenza; lo stile sta in artes-core.css (sezione "Lightbox").
 */
( function () {
	'use strict';

	var SELECTOR = 'img.gallery-img, img.scheda-hero';
	var root = null;
	var items = [];
	var index = 0;
	var lastFocus = null;
	var touchX = null;

	/** URL a piena risoluzione: srcset più largo, altrimenti l'URL senza il suffisso -LxA di WordPress. */
	function fullUrl( img ) {
		var best = '';
		var bestW = 0;

		( img.getAttribute( 'srcset' ) || '' ).split( ',' ).forEach( function ( part ) {
			var bits = part.trim().split( /\s+/ );
			var w = parseInt( bits[ 1 ], 10 ) || 0;

			if ( bits[ 0 ] && w > bestW ) {
				best = bits[ 0 ];
				bestW = w;
			}
		} );

		var src = img.currentSrc || img.src;

		return {
			full: src.replace( /-\d+x\d+(\.[a-z0-9]+)(\?.*)?$/i, '$1$2' ),
			fallback: best || src,
			small: src,
		};
	}

	function build() {
		root = document.createElement( 'div' );
		root.className = 'artes-lb';
		root.setAttribute( 'role', 'dialog' );
		root.setAttribute( 'aria-modal', 'true' );
		root.setAttribute( 'aria-label', 'Galleria immagini' );
		root.hidden = true;
		root.innerHTML =
			'<button type="button" class="artes-lb-btn artes-lb-close" aria-label="Chiudi">Chiudi</button>' +
			'<button type="button" class="artes-lb-btn artes-lb-prev" aria-label="Immagine precedente">&larr;</button>' +
			'<figure class="artes-lb-fig"><img class="artes-lb-img" alt=""><figcaption class="artes-lb-cap"></figcaption></figure>' +
			'<button type="button" class="artes-lb-btn artes-lb-next" aria-label="Immagine successiva">&rarr;</button>' +
			'<div class="artes-lb-count" aria-live="polite"></div>';
		document.body.appendChild( root );

		root.addEventListener( 'click', function ( e ) {
			if ( e.target.closest( '.artes-lb-close' ) || e.target === root || e.target.classList.contains( 'artes-lb-fig' ) ) {
				close();
			} else if ( e.target.closest( '.artes-lb-prev' ) ) {
				show( index - 1 );
			} else if ( e.target.closest( '.artes-lb-next' ) ) {
				show( index + 1 );
			}
		} );
		root.addEventListener( 'touchstart', function ( e ) {
			touchX = e.changedTouches[ 0 ].clientX;
		}, { passive: true } );
		root.addEventListener( 'touchend', function ( e ) {
			if ( touchX === null ) {
				return;
			}

			var dx = e.changedTouches[ 0 ].clientX - touchX;
			touchX = null;

			if ( Math.abs( dx ) > 50 ) {
				show( index + ( dx < 0 ? 1 : -1 ) );
			}
		}, { passive: true } );
	}

	function preload( i ) {
		if ( items.length < 2 ) {
			return;
		}

		var img = items[ ( i + items.length ) % items.length ];
		new Image().src = fullUrl( img ).full;
	}

	function show( i ) {
		index = ( i + items.length ) % items.length;

		var img = items[ index ];
		var urls = fullUrl( img );
		var big = root.querySelector( '.artes-lb-img' );

		root.classList.add( 'is-loading' );
		// Subito l'anteprima già caricata, poi la versione a piena risoluzione.
		big.src = urls.small;
		big.alt = img.alt || '';
		root.querySelector( '.artes-lb-cap' ).textContent = img.alt || '';
		root.querySelector( '.artes-lb-count' ).textContent = items.length > 1 ? ( index + 1 ) + ' / ' + items.length : '';
		root.classList.toggle( 'is-single', items.length < 2 );

		var loader = new Image();
		loader.onload = function () {
			if ( items[ index ] === img ) {
				big.src = urls.full;
				root.classList.remove( 'is-loading' );
			}
		};
		loader.onerror = function () {
			if ( items[ index ] === img ) {
				big.src = urls.fallback;
				root.classList.remove( 'is-loading' );
			}
		};
		loader.src = urls.full;

		preload( index + 1 );
		preload( index - 1 );
	}

	function open( img ) {
		var group = img.closest( '.scheda-media' ) || img.parentElement;
		items = Array.prototype.slice.call( group.querySelectorAll( SELECTOR ) );

		if ( items.indexOf( img ) < 0 ) {
			items = [ img ];
		}

		if ( ! root ) {
			build();
		}

		lastFocus = document.activeElement;
		root.hidden = false;
		document.documentElement.classList.add( 'artes-lb-open' );
		show( items.indexOf( img ) );
		root.querySelector( '.artes-lb-close' ).focus();
	}

	function close() {
		if ( ! root || root.hidden ) {
			return;
		}

		root.hidden = true;
		document.documentElement.classList.remove( 'artes-lb-open' );
		root.querySelector( '.artes-lb-img' ).removeAttribute( 'src' );

		if ( lastFocus && lastFocus.focus ) {
			lastFocus.focus();
		}
	}

	document.addEventListener( 'click', function ( e ) {
		var img = e.target.closest ? e.target.closest( SELECTOR ) : null;

		if ( img && img.src ) {
			e.preventDefault();
			open( img );
		}
	} );

	document.addEventListener( 'keydown', function ( e ) {
		var img = e.target.closest ? e.target.closest( SELECTOR ) : null;

		if ( root && ! root.hidden ) {
			if ( 'Escape' === e.key ) {
				close();
			} else if ( 'ArrowRight' === e.key ) {
				show( index + 1 );
			} else if ( 'ArrowLeft' === e.key ) {
				show( index - 1 );
			} else if ( 'Tab' === e.key ) {
				// Il focus resta dentro la finestra.
				var btns = Array.prototype.slice.call( root.querySelectorAll( '.artes-lb-btn' ) ).filter( function ( b ) {
					return b.offsetParent !== null;
				} );
				var pos = btns.indexOf( document.activeElement );
				e.preventDefault();
				btns[ ( pos + ( e.shiftKey ? -1 : 1 ) + btns.length ) % btns.length ].focus();
			}
		} else if ( img && ( 'Enter' === e.key || ' ' === e.key ) ) {
			e.preventDefault();
			open( img );
		}
	} );

	// Le immagini diventano raggiungibili da tastiera e annunciate come pulsanti.
	document.addEventListener( 'DOMContentLoaded', function () {
		Array.prototype.forEach.call( document.querySelectorAll( SELECTOR ), function ( img ) {
			img.setAttribute( 'tabindex', '0' );
			img.setAttribute( 'role', 'button' );
			img.setAttribute( 'aria-label', 'Ingrandisci: ' + ( img.alt || 'immagine' ) );
		} );
	} );
}() );
