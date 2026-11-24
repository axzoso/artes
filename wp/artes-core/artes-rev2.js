/* ARTES — JavaScript delle pagine rev2 (plugin artes-core).
   Fa due cose:
   1. DECORA il markup: i widget di Elementor non possono impostare attributi (data-*, aria-*, hidden, role), che la rev2
      scrive a mano nell'HTML. Qui vengono rimessi in base alle classi, così il codice sotto è quello della rev2.
   2. Riproduce le interazioni della rev2 (assets/js/artes.js): tendina "Realizzazioni", menu mobile, voce attiva, lightbox
      delle gallerie, filtri dell'archivio realizzazioni e dei brand, slider produzione, filtri progetti Home, pallini metodo.
   Tutti i testi UI/ARIA e le rotte sono letti da `window.ArtesRev2Dati` (localizzato per lingua WPML da artes-core.php),
   con fallback italiano sicuro; nessun filtro dipende da parole o prefissi italiani hardcoded. */
(function () {
  'use strict';

  /* Dentro l'editor di Elementor non si tocca nulla. */
  if (document.body && document.body.classList.contains('elementor-editor-active')) return;

  var I18N_DEFAULT = {
    tutti: 'Tutti',
    tutte: 'Tutte',
    tutti_settori: 'Tutti i settori',
    nav_principale: 'Navigazione principale',
    nav_mobile: 'Navigazione mobile',
    apri_menu: 'Apri il menu',
    chiudi_menu: 'Chiudi il menu',
    foto_in_arrivo: 'Foto in arrivo',
    dati_servizio: 'Dati principali del servizio',
    indice_pagina: 'Indice della pagina',
    controlli_slider: 'Controlli galleria produzione',
    galleria_dialog: 'Galleria fotografica',
    chiudi: 'Chiudi',
    precedente: 'Foto precedente',
    successiva: 'Foto successiva',
    foto_di: '{titolo} — foto {n} di {tot}',
    apri_immagine: 'Apri la foto {n} di {tot}',
    filtra_settore: 'Filtra per settore',
    filtra_categoria_di: 'Filtra {settore} per categoria',
    filtra_categoria: 'Filtra per categoria',
    progetto_uno: '1 realizzazione',
    progetti_molti: '{n} realizzazioni',
    nessun_progetto: 'Nessuna realizzazione pubblicata per questa categoria.'
  };

  function datiPlugin() { return window.ArtesRev2Dati || {}; }
  function t(key, vars) {
    var i18n = datiPlugin().i18n || {};
    var str = (typeof i18n[key] === 'string' && i18n[key] !== '') ? i18n[key] : (I18N_DEFAULT[key] || '');
    if (vars) {
      Object.keys(vars).forEach(function (k) {
        str = str.split('{' + k + '}').join(String(vars[k]));
      });
    }
    return str;
  }

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function set(el, attrs) { Object.keys(attrs).forEach(function (k) { if (!el.hasAttribute(k)) el.setAttribute(k, attrs[k]); }); }
  function normKey(s) { return String(s || '').replace(/\s+/g, ' ').trim().toLowerCase(); }
  function etichetta(el) { return (el && el.textContent ? el.textContent : '').replace(/\s+/g, ' ').trim(); }

  /* --- 1. Attributi ------------------------------------------------------------------------------------------------ */
  function decora() {
    $$('.nav').forEach(function (n) { set(n, { 'aria-label': t('nav_principale') }); });
    $$('.mobile-nav__list').forEach(function (n) { set(n, { 'aria-label': t('nav_mobile') }); });

    /* Selettore lingua WPML [artes_lingue]: Elementor Atomic V4 `e-paragraph` (Escaped_Html_Prop_Type) rimuove
       `class`, `aria-current`, `hreflang` e `lang` dall'HTML dinamico; si ripristinano qui in modo idempotente. */
    var langTags = { it: 'it-IT', en: 'en-GB' };
    $$('.topbar__lang').forEach(function (box) {
      var wrap = box.firstElementChild;
      if (wrap && wrap.tagName === 'SPAN') {
        wrap.classList.add('lang-switch');
        Array.prototype.slice.call(wrap.children).forEach(function (ch) {
          if (ch.tagName === 'SPAN') {
            ch.classList.add('lang-current');
            set(ch, { 'aria-current': 'true' });
          }
        });
      }
      $$('a', box).forEach(function (a) {
        var code = etichetta(a).toLowerCase();
        var tag = langTags[code];
        if (tag) set(a, { hreflang: tag, lang: tag });
      });
    });

    /* Tendina desktop: link "Realizzazioni" + pannello .drop (chiuso all'inizio). */
    $$('.nav__item').forEach(function (item) {
      var trigger = item.querySelector('.nav__trigger');
      var panel = item.querySelector('.drop');
      if (!trigger || !panel) return;
      if (!panel.id) panel.id = 'drop-' + Math.random().toString(36).slice(2, 8);
      trigger.setAttribute('data-drop-trigger', '');
      trigger.setAttribute('aria-expanded', 'false');
      trigger.setAttribute('aria-controls', panel.id);
      panel.hidden = true;
      panel.setAttribute('data-ready', '');
    });

    /* Menu mobile: pulsante hamburger + pannello a schermo intero con accordion. */
    var toggle = $('.nav-toggle');
    var mobile = $('.mobile-nav');
    if (mobile) {
      if (!mobile.id) mobile.id = 'mobile-nav';
      mobile.hidden = true;
      mobile.setAttribute('data-ready', '');
    }
    if (toggle) {
      set(toggle, { type: 'button', 'aria-label': t('apri_menu'), 'aria-expanded': 'false' });
      if (mobile) toggle.setAttribute('aria-controls', mobile.id);
    }
    $$('.mobile-nav__item').forEach(function (item) {
      var trigger = item.querySelector('.mobile-nav__trigger');
      var panel = item.querySelector('.mobile-nav__panel');
      if (!trigger || !panel) return;
      if (!panel.id) panel.id = 'mnav-' + Math.random().toString(36).slice(2, 8);
      set(trigger, { type: 'button', 'aria-expanded': 'false', 'aria-controls': panel.id });
      panel.hidden = true;
      panel.setAttribute('data-ready', '');
    });

    /* Segnaposto delle foto del team: decorativi ma annunciati come "foto in arrivo", come nella rev2. */
    $$('.team-card__foto').forEach(function (f) { set(f, { role: 'img', 'aria-label': t('foto_in_arrivo') }); });

    /* Semantica degli elenchi sostituiti da contenitori (ul/ol/li) e landmark delle pagine statiche (fase 5). */
    $$('.rev2-ul, .rev2-ol').forEach(function (el) { set(el, { role: 'list' }); });
    $$('.rev2-li').forEach(function (el) { set(el, { role: 'listitem' }); });
    $$('.steps-dots').forEach(function (el) { set(el, { 'aria-hidden': 'true' }); });
    $$('.contract-hero__facts').forEach(function (el) { set(el, { 'aria-label': t('dati_servizio') }); });
    $$('.contract-index').forEach(function (el) { set(el, { 'aria-label': t('indice_pagina') }); });
    $$('.produzione-slider__controls').forEach(function (el) { set(el, { 'aria-label': t('controlli_slider') }); });
    $$('.produzione-slider__count').forEach(function (el) { set(el, { 'aria-live': 'polite' }); });
  }

  /* --- Voce attiva del menu ----------------------------------------------------------------------------------------- */
  /* Nella rev2 la classe is-active è scritta a mano in ogni pagina; qui si calcola dall'indirizzo: stessa pagina =
     voce attiva; le schede /realizzazioni/<nome>/ (o /en/realizzazioni/<nome>/) tengono attiva "Realizzazioni"/"Projects".
     Usa `ArtesRev2Dati.rotte` (con fallback su .nav__trigger) per restare indipendente da lingua e slug. */
  function normalizza(p) { return String(p || '').replace(/\/+$/, '') || '/'; }
  function marcaAttivo(percorso) {
    var corrente = normalizza(percorso || window.location.pathname);
    var rotte = datiPlugin().rotte || {};
    var homePath = normalizza(rotte.home || '/');
    var archivioRealPath = normalizza(rotte.realizzazioni || '/realizzazioni');

    var triggerEl = $('.nav__trigger');
    var triggerPath = '';
    if (triggerEl && triggerEl.getAttribute('href')) {
      try { triggerPath = normalizza(new URL(triggerEl.getAttribute('href'), window.location.href).pathname); } catch (e) { triggerPath = ''; }
    }

    /* Nella barra in alto e nella sezione secondaria mobile possono essere attive "Chi siamo" e "Contatti".
       "Blog", finché non esiste come pagina dedicata, punta all'archivio realizzazioni e va escluso
       per non duplicare la voce attiva di .nav__trigger quando si è sull'archivio realizzazioni. */
    var voci = $$('.topbar__right > a, .nav > a, .nav__trigger, .mobile-nav__list > a');
    voci.forEach(function (a) {
      var href = a.getAttribute('href');
      if (!href || href.charAt(0) === '#') return;
      var u;
      try { u = new URL(href, window.location.href); } catch (e) { return; }
      var p = normalizza(u.pathname);
      var isSec = Boolean((a.closest && a.closest('.topbar__right')) || a.classList.contains('mobile-nav__sec'));
      if (isSec && (p === archivioRealPath || p === '/realizzazioni' || (triggerPath && p === triggerPath))) {
        a.classList.remove('is-active');
        a.removeAttribute('aria-current');
        return;
      }
      var attivo = !u.search && p !== '/' && p !== homePath && (p === corrente || (a.classList.contains('nav__trigger') && corrente.indexOf(p + '/') === 0));
      a.classList.toggle('is-active', attivo);
      if (attivo) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });
  }

  /* --- 2. Tendine di settore (da rev2/artes.js) ------------------------------------------------------------------- */
  function initDrops() {
    var triggers = $$('[data-drop-trigger]');
    if (!triggers.length) return;

    var pairs = [];
    triggers.forEach(function (trigger) {
      var panel = document.getElementById(trigger.getAttribute('aria-controls'));
      if (panel) pairs.push({ trigger: trigger, panel: panel });
    });
    if (!pairs.length) return;

    var closeTimer = null;

    function closeAll(exceptPanel) {
      pairs.forEach(function (pair) {
        if (pair.panel === exceptPanel) return;
        pair.panel.hidden = true;
        pair.trigger.setAttribute('aria-expanded', 'false');
      });
    }

    function open(pair) {
      clearTimeout(closeTimer);
      closeAll(pair.panel);
      pair.panel.hidden = false;
      pair.trigger.setAttribute('aria-expanded', 'true');
    }

    function scheduleCloseAll() {
      clearTimeout(closeTimer);
      closeTimer = setTimeout(function () { closeAll(null); }, 120);
    }

    pairs.forEach(function (pair) {
      [pair.trigger, pair.panel].forEach(function (el) {
        el.addEventListener('mouseenter', function () { open(pair); });
        el.addEventListener('mouseleave', scheduleCloseAll);
      });
      /* Il trigger è un link alla pagina: il click naviga, non si intercetta. */
      pair.trigger.addEventListener('focus', function () { open(pair); });
    });

    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      var openPair = pairs.filter(function (p) { return !p.panel.hidden; })[0];
      if (!openPair) return;
      closeAll(null);
      openPair.trigger.focus();
    });

    document.addEventListener('focusin', function (e) {
      pairs.forEach(function (pair) {
        if (pair.panel.hidden) return;
        if (!pair.panel.contains(e.target) && e.target !== pair.trigger) {
          pair.panel.hidden = true;
          pair.trigger.setAttribute('aria-expanded', 'false');
        }
      });
    });
  }

  /* --- 3. Menu mobile (da rev2/artes.js) -------------------------------------------------------------------------- */
  function initMobileNav() {
    var toggle = $('.nav-toggle');
    var panel = $('.mobile-nav');
    if (!toggle || !panel) return;

    function open() {
      panel.hidden = false;
      toggle.setAttribute('aria-expanded', 'true');
      toggle.setAttribute('aria-label', t('chiudi_menu'));
      toggle.classList.add('is-open');
      document.body.style.overflow = 'hidden';
    }

    function close() {
      panel.hidden = true;
      toggle.setAttribute('aria-expanded', 'false');
      toggle.setAttribute('aria-label', t('apri_menu'));
      toggle.classList.remove('is-open');
      document.body.style.overflow = '';
    }

    toggle.addEventListener('click', function () {
      if (panel.hidden) open(); else close();
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !panel.hidden) close();
    });

    /* Passando a una larghezza da desktop il pannello si chiude da solo (sul sito rev2 sparisce via CSS). */
    window.addEventListener('resize', function () {
      if (!panel.hidden && window.matchMedia('(min-width: 1366px)').matches) close();
    });

    var triggers = $$('.mobile-nav__trigger', panel);
    triggers.forEach(function (trigger) {
      var sub = document.getElementById(trigger.getAttribute('aria-controls'));
      if (!sub) return;

      trigger.addEventListener('click', function () {
        var wasOpen = !sub.hidden;

        triggers.forEach(function (tBtn) {
          var s = document.getElementById(tBtn.getAttribute('aria-controls'));
          if (!s) return;
          s.hidden = true;
          tBtn.setAttribute('aria-expanded', 'false');
        });

        if (!wasOpen) {
          sub.hidden = false;
          trigger.setAttribute('aria-expanded', 'true');
        }
      });
    });
  }

  /* --- 4. Lightbox delle gallerie (da rev2/artes.js) ---------------------------------------------------------------- */
  /* Gli elementi della galleria sono i .caso-gallery__item: non sono link (sono elementi di un ciclo di Elementor), quindi
     la foto grande è la sorgente dell'immagine a tutta dimensione e la didascalia localizzata ("Titolo — foto N di M" /
     "Title — photo N of M") si ricava dal titolo della scheda e da ArtesRev2Dati.i18n. */
  function initLightbox() {
    var items = $$('.caso-gallery__item');
    if (!items.length) return;
    var titolo = (($('.scheda__title') || {}).textContent || '').replace(/\s+/g, ' ').trim();
    var box = document.createElement('div');
    box.className = 'lightbox';
    box.hidden = true;
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-modal', 'true');
    box.setAttribute('aria-label', t('galleria_dialog'));
    box.innerHTML =
      '<div class="lightbox__bar"><span class="lightbox__count"></span>' +
      '<button type="button" class="lightbox__btn lightbox__close">&times;</button></div>' +
      '<div class="lightbox__stage">' +
      '<button type="button" class="lightbox__btn lightbox__prev">&larr;</button>' +
      '<img class="lightbox__img" alt="">' +
      '<button type="button" class="lightbox__btn lightbox__next">&rarr;</button></div>' +
      '<div class="lightbox__caption"></div>';
    var btnClose = box.querySelector('.lightbox__close');
    var btnPrev = box.querySelector('.lightbox__prev');
    var btnNext = box.querySelector('.lightbox__next');
    btnClose.setAttribute('aria-label', t('chiudi'));
    btnPrev.setAttribute('aria-label', t('precedente'));
    btnNext.setAttribute('aria-label', t('successiva'));
    document.body.appendChild(box);

    var img = box.querySelector('.lightbox__img');
    var count = box.querySelector('.lightbox__count');
    var caption = box.querySelector('.lightbox__caption');
    var index = 0, lastFocus = null;

    function sorgente(i) { var thumb = items[i].querySelector('img'); return thumb ? (thumb.getAttribute('src') || '') : ''; }

    function show(i) {
      index = (i + items.length) % items.length;
      var thumb = items[index].querySelector('img');
      img.src = sorgente(index);
      img.alt = thumb ? thumb.alt : '';
      count.textContent = (index + 1) + ' / ' + items.length;
      caption.textContent = t('foto_di', { titolo: titolo, n: index + 1, tot: items.length });
      var next = sorgente((index + 1) % items.length);
      if (next && typeof Image !== 'undefined') { var pre = new Image(); pre.src = next; }
    }
    function open(i) {
      lastFocus = document.activeElement;
      box.classList.toggle('lightbox--single', items.length < 2);
      show(i || 0);
      box.hidden = false;
      document.body.classList.add('has-lightbox');
      btnClose.focus();
    }
    function close() {
      box.hidden = true;
      document.body.classList.remove('has-lightbox');
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    }

    items.forEach(function (it, i) {
      set(it, { role: 'button', tabindex: '0', 'aria-label': t('apri_immagine', { n: i + 1, tot: items.length }) });
      it.addEventListener('click', function () { open(i); });
      it.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(i); } });
    });
    $$('.caso-gallery__open').forEach(function (b) { b.addEventListener('click', function () { open(0); }); });
    btnClose.addEventListener('click', close);
    btnPrev.addEventListener('click', function () { show(index - 1); });
    btnNext.addEventListener('click', function () { show(index + 1); });
    box.addEventListener('click', function (e) {
      if (e.target === box || e.target.classList.contains('lightbox__stage')) close();
    });
    document.addEventListener('keydown', function (e) {
      if (box.hidden) return;
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowLeft') show(index - 1);
      else if (e.key === 'ArrowRight') show(index + 1);
      else if (e.key === 'Tab') {
        var f = Array.prototype.slice.call(box.querySelectorAll('button')).filter(function (b) { return b.offsetParent; });
        var first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
    var x0 = null;
    box.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; }, { passive: true });
    box.addEventListener('touchend', function (e) {
      if (x0 === null) return;
      var dx = e.changedTouches[0].clientX - x0;
      if (Math.abs(dx) > 40) show(index + (dx < 0 ? 1 : -1));
      x0 = null;
    });
  }

  /* --- 5. Archivio realizzazioni: filtri a due livelli (da rev2/artes.js, initRealizzazioni) ----------------------------- */
  /* Settore (tab) e categoria (filtri) restringono la griglia lato browser; lo stato sta anche nell'indirizzo
     (?settore=uffici&categoria=enti-e-istituzioni). Ogni card espone settore/categoria nei due `.rev2-dato`;
     i bottoni tab e categoria si abbinano tramite `ArtesRev2Dati` per nome/slug localizzato con fallback posizionale
     (ordine `ordine` / `ordine_filtro`), così eventuali sfumature di traduzione non rompono mai i filtri. */
  function initArchivio() {
    var root = $('.archivio');
    if (!root || !$('.settori-tabs__btn', root)) return;
    var dati = datiPlugin();
    var listaSettori = Array.isArray(dati.settori) ? dati.settori : [];
    var listaCategorie = Array.isArray(dati.categorie) ? dati.categorie : [];
    var tabs = $$('.settori-tabs__btn', root);
    var groups = $$('.filtri--categorie', root);
    var items = $$('.progetto', root);
    var empty = $('.progetti__empty', root);
    var count = $('.archivio__count', root);

    var chiaveSettore = {};
    var settoreAlias = {};
    listaSettori.forEach(function (s) {
      chiaveSettore[normKey(s.nome)] = s.slug;
      chiaveSettore[normKey(s.slug)] = s.slug;
      settoreAlias[s.slug] = s.slug;
      if (s.slug_originale) {
        chiaveSettore[normKey(s.slug_originale)] = s.slug;
        settoreAlias[s.slug_originale] = s.slug;
      }
    });

    var chiaveCategoria = {};
    var categoriePerSettore = {};
    var catAlias = {};
    listaCategorie.forEach(function (c) {
      var sKey = settoreAlias[c.settore] || c.settore;
      if (!categoriePerSettore[sKey]) categoriePerSettore[sKey] = [];
      categoriePerSettore[sKey].push(c);
      chiaveCategoria[sKey + '|' + normKey(c.nome)] = c.slug;
      chiaveCategoria[sKey + '|' + normKey(c.slug)] = c.slug;
      catAlias[sKey + '|' + c.slug] = c.slug;
      if (c.slug_originale) {
        chiaveCategoria[sKey + '|' + normKey(c.slug_originale)] = c.slug;
        catAlias[sKey + '|' + c.slug_originale] = c.slug;
      }
    });

    var conteggioSettore = {};
    var conteggioCategoria = {};
    items.forEach(function (it) {
      var d = $$('.rev2-dato', it);
      var kRaw = d[0] ? d[0].textContent.trim() : '';
      var cRaw = d[1] ? d[1].textContent.trim() : '';
      var k = settoreAlias[kRaw] || kRaw;
      var c = catAlias[k + '|' + cRaw] || cRaw;
      it.setAttribute('data-key', k);
      it.setAttribute('data-cat', c);
      if (k) {
        conteggioSettore[k] = (conteggioSettore[k] || 0) + 1;
        if (c) {
          var pair = k + '|' + c;
          conteggioCategoria[pair] = (conteggioCategoria[pair] || 0) + 1;
        }
      }
    });

    var settoriDisponibili = {};
    tabs.forEach(function (tab, i) {
      var key = '';
      if (i > 0) {
        key = chiaveSettore[normKey(etichetta(tab))] || (listaSettori[i - 1] ? listaSettori[i - 1].slug : '');
      }
      tab.setAttribute('data-settore-key', key);
      set(tab, { type: 'button', 'aria-pressed': 'false' });
      var vuoto = Boolean(key) && !conteggioSettore[key];
      tab.hidden = vuoto;
      if (key && !vuoto) settoriDisponibili[key] = true;
    });
    if (tabs[0] && tabs[0].parentNode) set(tabs[0].parentNode, { role: 'group', 'aria-label': t('filtra_settore') });

    var categorieDisponibili = {};
    groups.forEach(function (g, i) {
      var tab = tabs[i + 1];
      var key = tab ? tab.getAttribute('data-settore-key') : '';
      var catsSettore = categoriePerSettore[key] || [];
      g.setAttribute('data-categorie', key);
      set(g, { role: 'group', 'aria-label': t('filtra_categoria_di', { settore: tab ? etichetta(tab) : '' }) });
      var catVisibili = 0;
      $$('.filtro', g).forEach(function (b, k) {
        var cat = '';
        if (k > 0) {
          cat = chiaveCategoria[key + '|' + normKey(etichetta(b))] || (catsSettore[k - 1] ? catsSettore[k - 1].slug : '');
        }
        b.setAttribute('data-categoria', cat);
        set(b, { type: 'button', 'aria-pressed': 'false' });
        if (cat) {
          var vuota = !conteggioCategoria[key + '|' + cat];
          b.hidden = vuota;
          if (!vuota) {
            catVisibili++;
            categorieDisponibili[key + '|' + cat] = true;
          }
        } else {
          b.hidden = false;
        }
      });
      g.setAttribute('data-has-categorie', catVisibili > 0 ? '1' : '0');
      g.hidden = true;
      g.setAttribute('data-ready', '');
    });
    if (count) set(count, { 'aria-live': 'polite' });
    if (empty) { empty.hidden = true; empty.setAttribute('data-ready', ''); }

    var params = new URLSearchParams(window.location.search);
    var pSettore = params.get('settore') || '';
    var pCat = params.get('categoria') || '';
    var normSettore = settoreAlias[pSettore] || pSettore;
    var normCat = catAlias[normSettore + '|' + pCat] || pCat;
    var state = { settore: normSettore, categoria: normCat };
    /* Se l'URL punta a un settore o a una categoria senza realizzazioni (filtro nascosto), ripiega su "Tutti i settori" o su "Tutte". */
    if (state.settore && !settoriDisponibili[state.settore]) {
      state.settore = '';
      state.categoria = '';
    } else if (state.categoria && (!state.settore || !categorieDisponibili[state.settore + '|' + state.categoria])) {
      state.categoria = '';
    }

    function apply(updateUrl) {
      var visibili = 0;

      tabs.forEach(function (tab) {
        var active = !tab.hidden && tab.getAttribute('data-settore-key') === state.settore;
        tab.classList.toggle('is-active', active);
        tab.setAttribute('aria-pressed', String(active));
      });

      groups.forEach(function (g) {
        g.hidden = !state.settore || g.getAttribute('data-categorie') !== state.settore || g.getAttribute('data-has-categorie') !== '1';
        $$('.filtro', g).forEach(function (b) {
          var active = !b.hidden && b.getAttribute('data-categoria') === state.categoria;
          b.classList.toggle('is-active', active);
          b.setAttribute('aria-pressed', String(active));
        });
      });

      items.forEach(function (item) {
        var match = (!state.settore || item.getAttribute('data-key') === state.settore) &&
                    (!state.categoria || item.getAttribute('data-cat') === state.categoria);
        item.hidden = !match;
        if (match) visibili++;
      });

      if (empty) empty.hidden = visibili > 0;
      if (count) count.textContent = visibili === 1 ? t('progetto_uno') : t('progetti_molti', { n: visibili });

      if (updateUrl && window.history && window.history.replaceState) {
        var q = new URLSearchParams();
        if (state.settore) q.set('settore', state.settore);
        if (state.categoria) q.set('categoria', state.categoria);
        var qs = q.toString();
        window.history.replaceState(null, '', window.location.pathname + (qs ? '?' + qs : ''));
      }
    }

    root.addEventListener('click', function (e) {
      var tab = e.target.closest('.settori-tabs__btn');
      if (tab && !tab.hidden) {
        state.settore = tab.getAttribute('data-settore-key');
        state.categoria = '';
        apply(true);
        return;
      }
      var btn = e.target.closest('.filtri--categorie .filtro');
      if (btn && !btn.hidden) {
        state.categoria = btn.getAttribute('data-categoria');
        apply(true);
      }
    });

    apply(false);
  }

  /* --- 6. Archivio brand: filtro per categoria (da rev2/artes.js, initFiltri) ---------------------------------------- */
  /* Il primo pulsante (indice 0 = "Tutti" / "All") mostra sempre tutti i brand (valore '').
     Ogni card .brand legge lo slug da .rev2-dato ([artes_dato_categoria_brand], con fallback al testo di .brand__c
     mappato via ArtesRev2Dati.categorie_brand). I pulsanti si abbinano per slug/nome o posizione `ordine`. */
  function initFiltriBrand() {
    var grid = $('.brands');
    var section = grid ? grid.closest('section') : null;
    var bar = section ? $('.filtri:not(.filtri--categorie)', section) : null;
    if (!bar || !grid || !$('.filtro', bar)) return;
    var dati = datiPlugin();
    var catBrand = Array.isArray(dati.categorie_brand) ? dati.categorie_brand : [];
    var buttons = $$('.filtro', bar);
    var items = $$('.brand', grid);
    var empty = $('.progetti__empty', section);

    var slugDaTesto = {};
    var aliasSlug = {};
    catBrand.forEach(function (c) {
      slugDaTesto[normKey(c.nome)] = c.slug;
      slugDaTesto[normKey(c.slug)] = c.slug;
      aliasSlug[c.slug] = c.slug;
      if (c.slug_originale) {
        slugDaTesto[normKey(c.slug_originale)] = c.slug;
        aliasSlug[c.slug_originale] = c.slug;
      }
    });

    var conteggio = {};
    items.forEach(function (it) {
      var d = $('.rev2-dato', it);
      var rawSlug = d ? d.textContent.trim() : '';
      var key = '';
      if (rawSlug) {
        key = aliasSlug[rawSlug] || slugDaTesto[normKey(rawSlug)] || rawSlug;
      } else {
        var c = $('.brand__c', it);
        var txt = c ? etichetta(c) : '';
        key = slugDaTesto[normKey(txt)] || normKey(txt);
      }
      it.setAttribute('data-settore', key);
      if (key) conteggio[key] = (conteggio[key] || 0) + 1;
    });

    buttons.forEach(function (b, i) {
      var key = '';
      if (i > 0) {
        var lbl = etichetta(b);
        key = slugDaTesto[normKey(lbl)] || (catBrand[i - 1] ? catBrand[i - 1].slug : normKey(lbl));
      }
      b.setAttribute('data-filtro', key);
      set(b, { type: 'button', 'aria-pressed': 'false' });
      b.hidden = Boolean(key) && !conteggio[key];
    });
    set(bar, { role: 'group', 'aria-label': t('filtra_categoria') });
    if (empty) { empty.hidden = true; empty.setAttribute('data-ready', ''); }

    function apply(valore) {
      var visibili = 0;
      items.forEach(function (item) {
        var match = !valore || item.getAttribute('data-settore') === valore;
        item.hidden = !match;
        if (match) visibili++;
      });
      buttons.forEach(function (b) {
        var active = !b.hidden && b.getAttribute('data-filtro') === valore;
        b.classList.toggle('is-active', active);
        b.setAttribute('aria-pressed', String(active));
      });
      if (empty) empty.hidden = visibili > 0;
    }

    bar.addEventListener('click', function (e) {
      var btn = e.target.closest('.filtro');
      if (btn && !btn.hidden) apply(btn.getAttribute('data-filtro'));
    });

    apply('');
  }

  /* --- 7. Home: slider produzione (da rev2/artes.js, initProduzioneSlider) ------------------------------------------- */
  function initProduzioneSlider() {
    var slider = $('.produzione-slider');
    if (!slider) return;
    var slides = $$('.produzione-slide', slider);
    var controls = $('.produzione-slider__controls', slider);
    var btns = controls ? $$('button', controls) : [];
    var prev = btns[0], next = btns[1];
    var count = $('.produzione-slider__count', slider);
    if (slides.length < 2 || !prev || !next) return;

    set(prev, { type: 'button', 'aria-label': t('precedente') });
    set(next, { type: 'button', 'aria-label': t('successiva') });
    slider.setAttribute('data-ready', '');

    var current = 0;
    var timer = null;
    var reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function show(index) {
      current = (index + slides.length) % slides.length;
      slides.forEach(function (slide, i) {
        var active = i === current;
        slide.classList.toggle('is-active', active);
        slide.setAttribute('aria-hidden', String(!active));
      });
      if (count) count.textContent = String(current + 1).padStart(2, '0') + ' / ' + String(slides.length).padStart(2, '0');
    }

    function restart() {
      if (reducedMotion) return;
      clearInterval(timer);
      timer = setInterval(function () { show(current + 1); }, 6000);
    }

    prev.addEventListener('click', function () { show(current - 1); restart(); });
    next.addEventListener('click', function () { show(current + 1); restart(); });
    slider.addEventListener('mouseenter', function () { clearInterval(timer); });
    slider.addEventListener('mouseleave', restart);
    show(0);
    restart();
  }

  /* --- 8. Home: realizzazioni in evidenza (larghezze w4/w2/w6 + filtri per settore) ---------------------------------- */
  /* Il pulsante 0 è sempre "Tutti" / "All" (valore ''); i pulsanti successivi si abbinano a `ArtesRev2Dati.settori`
     (ordinato per `ordine`) tramite match nome/slug e fallback posizionale `i - 1`, senza dipendere dal prefisso "Arredo ". */
  function initHomeProgetti() {
    var section = $('.realizzazioni');
    if (!section) return;
    var bar = $('.filtri', section);
    var grid = $('.progetti', section);
    if (!bar || !grid) return;

    var dati = datiPlugin();
    var listaSettori = Array.isArray(dati.settori) ? dati.settori : [];
    var buttons = $$('.filtro', bar);
    var items = $$('.progetto', grid);
    var empty = $('.progetti__empty', section);

    var slugDaTesto = {};
    var settoreAlias = {};
    listaSettori.forEach(function (s) {
      var n = normKey(s.nome);
      slugDaTesto[n] = s.slug;
      slugDaTesto[normKey(s.slug)] = s.slug;
      slugDaTesto[n.replace(/^arredo\s+/, '')] = s.slug;
      settoreAlias[s.slug] = s.slug;
      if (s.slug_originale) {
        slugDaTesto[normKey(s.slug_originale)] = s.slug;
        settoreAlias[s.slug_originale] = s.slug;
      }
    });

    var conteggio = {};
    items.forEach(function (it) {
      var d = $$('.rev2-dato', it);
      var rawSlug = d[0] ? d[0].textContent.trim() : '';
      var slug = settoreAlias[rawSlug] || rawSlug;
      var largh = d[1] ? d[1].textContent.trim() : '';
      it.setAttribute('data-settore', slug);
      if (slug) conteggio[slug] = (conteggio[slug] || 0) + 1;
      if (largh && /^w[246]$/.test(largh)) {
        it.classList.remove('progetto--w2', 'progetto--w4', 'progetto--w6');
        it.classList.add('progetto--' + largh);
      }
    });

    set(bar, { role: 'group', 'aria-label': t('filtra_settore') });
    buttons.forEach(function (b, i) {
      var key = '';
      if (i > 0) {
        var lbl = normKey(etichetta(b));
        key = slugDaTesto[lbl] || (listaSettori[i - 1] ? listaSettori[i - 1].slug : lbl);
      }
      b.setAttribute('data-filtro', key);
      set(b, { type: 'button', 'aria-pressed': 'false' });
      b.hidden = Boolean(key) && !conteggio[key];
    });
    if (empty) { empty.hidden = true; empty.setAttribute('data-ready', ''); }

    function apply(valore) {
      var visibili = 0;
      items.forEach(function (item) {
        var match = !valore || item.getAttribute('data-settore') === valore;
        item.hidden = !match;
        if (match) visibili++;
      });
      var filtrato = Boolean(valore);
      grid.classList.toggle('progetti--filtrati', filtrato);
      grid.classList.toggle('progetti--filtrati-3plus', filtrato && visibili >= 3);
      buttons.forEach(function (b) {
        var active = !b.hidden && b.getAttribute('data-filtro') === valore;
        b.classList.toggle('is-active', active);
        b.setAttribute('aria-pressed', String(active));
      });
      if (empty) empty.hidden = visibili > 0;
    }

    bar.addEventListener('click', function (e) {
      var btn = e.target.closest('.filtro');
      if (btn && !btn.hidden) apply(btn.getAttribute('data-filtro'));
    });

    apply('');
  }

  /* --- 9. Home: pallini del carousel del metodo su mobile (da rev2/artes.js) ----------------------------------------- */
  function initStepsDots() {
    var list = $('.steps');
    var dots = $('.steps-dots');
    if (!list || !dots) return;
    var items = $$('.step', list);
    if (!items.length) return;
    dots.innerHTML = '';
    items.forEach(function (item, i) {
      var b = document.createElement('button');
      b.type = 'button';
      b.tabIndex = -1;
      b.addEventListener('click', function () { list.scrollTo({ left: i * (items[0].getBoundingClientRect().width + 16), behavior: 'smooth' }); });
      dots.appendChild(b);
    });
    var buttons = dots.children;
    function update() {
      var w = items[0].getBoundingClientRect().width + 16;
      if (!w) return;
      var idx = Math.min(items.length - 1, Math.round(list.scrollLeft / w));
      for (var i = 0; i < buttons.length; i++) buttons[i].classList.toggle('is-active', i === idx);
    }
    list.addEventListener('scroll', update, { passive: true });
    update();
  }

  function init() {
    decora();
    marcaAttivo();
    initDrops();
    initMobileNav();
    initLightbox();
    initArchivio();
    initFiltriBrand();
    initProduzioneSlider();
    initHomeProgetti();
    initStepsDots();
  }

  /* Esposto per i collaudi (tools/rev2) e per i test unitari i18n. */
  window.ArtesRev2 = {
    decora: decora,
    marcaAttivo: marcaAttivo,
    initLightbox: initLightbox,
    initArchivio: initArchivio,
    initFiltriBrand: initFiltriBrand,
    initHomeProgetti: initHomeProgetti,
    t: t,
    $: $,
    $$: $$,
    set: set
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
