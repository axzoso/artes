/* ARTES — JavaScript delle pagine rev2 (plugin artes-core).
   Fa due cose:
   1. DECORA il markup: i widget di Elementor non possono impostare attributi (data-*, aria-*, hidden, role), che la rev2
      scrive a mano nell'HTML. Qui vengono rimessi in base alle classi, così il codice sotto è quello della rev2.
   2. Riproduce le interazioni della rev2 (assets/js/artes.js): tendina "Realizzazioni", menu mobile, voce attiva, lightbox
      delle gallerie, filtri dell'archivio realizzazioni e dei brand (fase 4). Slider della produzione e pallini del metodo
      si portano con la home (fase 5 di docs/piano-adeguamento-rev2.md). */
(function () {
  'use strict';

  /* Dentro l'editor di Elementor non si tocca nulla. */
  if (document.body && document.body.classList.contains('elementor-editor-active')) return;

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function set(el, attrs) { Object.keys(attrs).forEach(function (k) { if (!el.hasAttribute(k)) el.setAttribute(k, attrs[k]); }); }
  function pannelloDi(trigger, contenitore, selPannello) {
    var wrap = trigger.closest(contenitore);
    return wrap ? wrap.querySelector(selPannello) : null;
  }

  /* --- 1. Attributi ------------------------------------------------------------------------------------------------ */
  function decora() {
    $$('.nav').forEach(function (n) { set(n, { 'aria-label': 'Navigazione principale' }); });
    $$('.mobile-nav__list').forEach(function (n) { set(n, { 'aria-label': 'Navigazione mobile' }); });

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
      set(toggle, { type: 'button', 'aria-label': 'Apri il menu', 'aria-expanded': 'false' });
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
    $$('.team-card__foto').forEach(function (f) { set(f, { role: 'img', 'aria-label': 'Foto in arrivo' }); });

    /* Semantica degli elenchi sostituiti da contenitori (ul/ol/li) e landmark delle pagine statiche (fase 5). */
    $$('.rev2-ul, .rev2-ol').forEach(function (el) { set(el, { role: 'list' }); });
    $$('.rev2-li').forEach(function (el) { set(el, { role: 'listitem' }); });
    $$('.steps-dots').forEach(function (el) { set(el, { 'aria-hidden': 'true' }); });
    $$('.contract-hero__facts').forEach(function (el) { set(el, { 'aria-label': 'Dati principali del servizio' }); });
    $$('.contract-index').forEach(function (el) { set(el, { 'aria-label': 'Indice della pagina' }); });
    $$('.produzione-slider__controls').forEach(function (el) { set(el, { 'aria-label': 'Controlli galleria produzione' }); });
    $$('.produzione-slider__count').forEach(function (el) { set(el, { 'aria-live': 'polite' }); });
  }

  /* --- Voce attiva del menu ----------------------------------------------------------------------------------------- */
  /* Nella rev2 la classe is-active è scritta a mano in ogni pagina; qui si calcola dall'indirizzo: stessa pagina =
     voce attiva; le schede /realizzazioni/<nome>/ tengono attiva "Realizzazioni". Le pagine dei brand non ne hanno. */
  function normalizza(p) { return p.replace(/\/+$/, '') || '/'; }
  function marcaAttivo(percorso) {
    var corrente = normalizza(percorso || window.location.pathname);
    /* Nella barra in alto può essere attiva solo la prima voce ("Chi siamo"): Blog e Contatti non sono pagine attive e Blog, finché
       non esiste, punta a una pagina già presente nel menu (mappa dei link: tools/rev2/mappa-link.json). */
    var voci = $$('.topbar__right > a:first-child, .nav > a, .nav__trigger');
    voci.forEach(function (a) {
      var href = a.getAttribute('href');
      if (!href || href.charAt(0) === '#') return;
      var u;
      try { u = new URL(href, window.location.href); } catch (e) { return; }
      var p = normalizza(u.pathname);
      var attivo = !u.search && p !== '/' && (p === corrente || (a.classList.contains('nav__trigger') && corrente.indexOf(p + '/') === 0));
      a.classList.toggle('is-active', attivo);
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
      toggle.setAttribute('aria-label', 'Chiudi il menu');
      toggle.classList.add('is-open');
      document.body.style.overflow = 'hidden';
    }

    function close() {
      panel.hidden = true;
      toggle.setAttribute('aria-expanded', 'false');
      toggle.setAttribute('aria-label', 'Apri il menu');
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

        triggers.forEach(function (t) {
          var s = document.getElementById(t.getAttribute('aria-controls'));
          if (!s) return;
          s.hidden = true;
          t.setAttribute('aria-expanded', 'false');
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
     la foto grande è la sorgente dell'immagine a tutta dimensione e la didascalia "Titolo — foto N di M" si ricava dal
     titolo della scheda (nella rev2 sta in data-caption). Il pulsante "Apri la galleria" parte dalla prima foto. */
  function initLightbox() {
    var items = $$('.caso-gallery__item');
    if (!items.length) return;
    var titolo = (($('.scheda__title') || {}).textContent || '').replace(/\s+/g, ' ').trim();
    var box = document.createElement('div');
    box.className = 'lightbox';
    box.hidden = true;
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-modal', 'true');
    box.setAttribute('aria-label', 'Galleria fotografica');
    box.innerHTML =
      '<div class="lightbox__bar"><span class="lightbox__count"></span>' +
      '<button type="button" class="lightbox__btn lightbox__close" aria-label="Chiudi">&times;</button></div>' +
      '<div class="lightbox__stage">' +
      '<button type="button" class="lightbox__btn lightbox__prev" aria-label="Foto precedente">&larr;</button>' +
      '<img class="lightbox__img" alt="">' +
      '<button type="button" class="lightbox__btn lightbox__next" aria-label="Foto successiva">&rarr;</button></div>' +
      '<div class="lightbox__caption"></div>';
    document.body.appendChild(box);
    var img = box.querySelector('.lightbox__img');
    var count = box.querySelector('.lightbox__count');
    var caption = box.querySelector('.lightbox__caption');
    var index = 0, lastFocus = null;

    function sorgente(i) { var t = items[i].querySelector('img'); return t ? (t.getAttribute('src') || '') : ''; }

    function show(i) {
      index = (i + items.length) % items.length;
      var thumb = items[index].querySelector('img');
      img.src = sorgente(index);
      img.alt = thumb ? thumb.alt : '';
      count.textContent = (index + 1) + ' / ' + items.length;
      caption.textContent = titolo + ' — foto ' + (index + 1) + ' di ' + items.length;
      var next = sorgente((index + 1) % items.length);
      if (next) { var pre = new Image(); pre.src = next; }
    }
    function open(i) {
      lastFocus = document.activeElement;
      box.classList.toggle('lightbox--single', items.length < 2);
      show(i || 0);
      box.hidden = false;
      document.body.classList.add('has-lightbox');
      box.querySelector('.lightbox__close').focus();
    }
    function close() {
      box.hidden = true;
      document.body.classList.remove('has-lightbox');
      if (lastFocus) lastFocus.focus();
    }

    items.forEach(function (it, i) {
      set(it, { role: 'button', tabindex: '0', 'aria-label': 'Apri la foto ' + (i + 1) + ' di ' + items.length });
      it.addEventListener('click', function () { open(i); });
      it.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(i); } });
    });
    $$('.caso-gallery__open').forEach(function (b) { b.addEventListener('click', function () { open(0); }); });
    box.querySelector('.lightbox__close').addEventListener('click', close);
    box.querySelector('.lightbox__prev').addEventListener('click', function () { show(index - 1); });
    box.querySelector('.lightbox__next').addEventListener('click', function () { show(index + 1); });
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
     (?settore=uffici&categoria=enti-e-istituzioni), così i link del menu e delle pagine settore aprono l'archivio già filtrato.
     Differenze dalla rev2: i bottoni non hanno data-* (non impostabili dai widget) e le card sono elementi di un ciclo, quindi
     settore e categoria di ogni card si leggono da due spans nascosti (.rev2-dato) e le chiavi dei bottoni da ArtesRev2Dati,
     che il plugin ricava dai termini (nomi e slug). */
  function initArchivio() {
    var root = $('.archivio');
    if (!root || !$('.settori-tabs__btn', root)) return;
    var dati = window.ArtesRev2Dati || { settori: [], categorie: [] };
    var tabs = $$('.settori-tabs__btn', root);
    var groups = $$('.filtri--categorie', root);
    var items = $$('.progetto', root);
    var empty = $('.progetti__empty', root);
    var count = $('.archivio__count', root);

    var chiaveSettore = {};
    dati.settori.forEach(function (s) { chiaveSettore[s.nome] = s.slug; });
    var chiaveCategoria = {};
    dati.categorie.forEach(function (c) { chiaveCategoria[c.settore + '|' + c.nome] = c.slug; });

    tabs.forEach(function (t, i) {
      t.setAttribute('data-settore-key', i === 0 ? '' : (chiaveSettore[t.textContent.replace(/\s+/g, ' ').trim()] || ''));
      set(t, { type: 'button', 'aria-pressed': 'false' });
    });
    if (tabs[0] && tabs[0].parentNode) set(tabs[0].parentNode, { role: 'group', 'aria-label': 'Filtra per settore' });
    groups.forEach(function (g, i) {
      var tab = tabs[i + 1];
      var key = tab ? tab.getAttribute('data-settore-key') : '';
      g.setAttribute('data-categorie', key);
      set(g, { role: 'group', 'aria-label': 'Filtra ' + (tab ? tab.textContent.replace(/\s+/g, ' ').trim() : '') + ' per categoria' });
      $$('.filtro', g).forEach(function (b, k) {
        b.setAttribute('data-categoria', k === 0 ? '' : (chiaveCategoria[key + '|' + b.textContent.replace(/\s+/g, ' ').trim()] || ''));
        set(b, { type: 'button', 'aria-pressed': 'false' });
      });
      g.hidden = true;
      g.setAttribute('data-ready', '');
    });
    items.forEach(function (it) {
      var d = $$('.rev2-dato', it);
      it.setAttribute('data-key', d[0] ? d[0].textContent.trim() : '');
      it.setAttribute('data-cat', d[1] ? d[1].textContent.trim() : '');
    });
    if (count) set(count, { 'aria-live': 'polite' });
    if (empty) { empty.hidden = true; empty.setAttribute('data-ready', ''); }

    var params = new URLSearchParams(window.location.search);
    var state = { settore: params.get('settore') || '', categoria: params.get('categoria') || '' };

    function apply(updateUrl) {
      var visibili = 0;

      tabs.forEach(function (t) {
        var active = t.getAttribute('data-settore-key') === state.settore;
        t.classList.toggle('is-active', active);
        t.setAttribute('aria-pressed', String(active));
      });

      groups.forEach(function (g) {
        g.hidden = g.getAttribute('data-categorie') !== state.settore;
        $$('.filtro', g).forEach(function (b) {
          var active = b.getAttribute('data-categoria') === state.categoria;
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
      if (count) count.textContent = visibili === 1 ? '1 realizzazione' : visibili + ' realizzazioni';

      if (updateUrl && window.history.replaceState) {
        var q = new URLSearchParams();
        if (state.settore) q.set('settore', state.settore);
        if (state.categoria) q.set('categoria', state.categoria);
        var qs = q.toString();
        window.history.replaceState(null, '', window.location.pathname + (qs ? '?' + qs : ''));
      }
    }

    root.addEventListener('click', function (e) {
      var tab = e.target.closest('.settori-tabs__btn');
      if (tab) {
        state.settore = tab.getAttribute('data-settore-key');
        state.categoria = '';
        apply(true);
        return;
      }
      var btn = e.target.closest('.filtri--categorie .filtro');
      if (btn) {
        state.categoria = btn.getAttribute('data-categoria');
        apply(true);
      }
    });

    apply(false);
  }

  /* --- 6. Archivio brand: filtro per categoria (da rev2/artes.js, initFiltri) ---------------------------------------- */
  /* La categoria di ogni brand è il testo del suo .brand__c; il valore dei bottoni è il loro testo ("Tutti" = nessun filtro).
     Cerca .filtri nella stessa sezione di .brands così sulla Home (che ha .brands in sez. 05 e .filtri in sez. 04) non interferisce. */
  function initFiltriBrand() {
    var grid = $('.brands');
    var section = grid ? grid.closest('section') : null;
    var bar = section ? $('.filtri:not(.filtri--categorie)', section) : null;
    if (!bar || !grid || !$('.filtro', bar)) return;
    var buttons = $$('.filtro', bar);
    var items = $$('.brand', grid);
    var empty = $('.progetti__empty', section);

    function etichetta(el) { return el.textContent.replace(/\s+/g, ' ').trim(); }
    buttons.forEach(function (b) { b.setAttribute('data-filtro', etichetta(b)); set(b, { type: 'button', 'aria-pressed': 'false' }); });
    set(bar, { role: 'group', 'aria-label': 'Filtra per categoria' });
    items.forEach(function (it) { var c = $('.brand__c', it); it.setAttribute('data-settore', c ? etichetta(c) : ''); });
    if (empty) { empty.hidden = true; empty.setAttribute('data-ready', ''); }

    function apply(valore) {
      var visibili = 0;
      items.forEach(function (item) {
        var match = valore === 'Tutti' || item.getAttribute('data-settore') === valore;
        item.hidden = !match;
        if (match) visibili++;
      });
      buttons.forEach(function (b) {
        var active = b.getAttribute('data-filtro') === valore;
        b.classList.toggle('is-active', active);
        b.setAttribute('aria-pressed', String(active));
      });
      if (empty) empty.hidden = visibili > 0;
    }

    bar.addEventListener('click', function (e) {
      var btn = e.target.closest('.filtro');
      if (btn) apply(btn.getAttribute('data-filtro'));
    });

    apply('Tutti');
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

    set(prev, { type: 'button', 'aria-label': 'Foto precedente' });
    set(next, { type: 'button', 'aria-label': 'Foto successiva' });
    slider.setAttribute('data-ready', '');

    var current = 0;
    var timer = null;
    var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

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
  function initHomeProgetti() {
    var section = $('.realizzazioni');
    if (!section) return;
    var bar = $('.filtri', section);
    var grid = $('.progetti', section);
    if (!bar || !grid) return;

    var dati = window.ArtesRev2Dati || { settori: [] };
    var buttons = $$('.filtro', bar);
    var items = $$('.progetto', grid);
    var empty = $('.progetti__empty', section);

    function etichetta(el) { return el.textContent.replace(/\s+/g, ' ').trim(); }
    /* Mappa il testo corto del bottone ("Uffici e workspace") allo slug del settore ("uffici") usando i termini di WP. */
    var slugDaTesto = {};
    dati.settori.forEach(function (s) {
      var n = s.nome.toLowerCase();
      slugDaTesto[n] = s.slug;
      slugDaTesto[n.replace(/^arredo\s+/, '')] = s.slug;
    });

    set(bar, { role: 'group', 'aria-label': 'Filtra per settore' });
    buttons.forEach(function (b, i) {
      var lbl = etichetta(b);
      var key = i === 0 ? '' : (slugDaTesto[lbl.toLowerCase()] || lbl.toLowerCase());
      b.setAttribute('data-filtro', key);
      set(b, { type: 'button', 'aria-pressed': 'false' });
    });

    items.forEach(function (it) {
      var d = $$('.rev2-dato', it);
      var slug = d[0] ? d[0].textContent.trim() : '';
      var largh = d[1] ? d[1].textContent.trim() : '';
      it.setAttribute('data-settore', slug);
      if (largh && /^w[246]$/.test(largh)) {
        it.classList.remove('progetto--w2', 'progetto--w4', 'progetto--w6');
        it.classList.add('progetto--' + largh);
      }
    });
    if (empty) { empty.hidden = true; empty.setAttribute('data-ready', ''); }

    function apply(valore) {
      var visibili = 0;
      items.forEach(function (item) {
        var match = !valore || item.getAttribute('data-settore') === valore;
        item.hidden = !match;
        if (match) visibili++;
      });
      buttons.forEach(function (b) {
        var active = b.getAttribute('data-filtro') === valore;
        b.classList.toggle('is-active', active);
        b.setAttribute('aria-pressed', String(active));
      });
      if (empty) empty.hidden = visibili > 0;
    }

    bar.addEventListener('click', function (e) {
      var btn = e.target.closest('.filtro');
      if (btn) apply(btn.getAttribute('data-filtro'));
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

  /* Esposto per i collaudi (tools/rev2) e per le interazioni aggiunte con le pagine delle fasi successive. */
  window.ArtesRev2 = { decora: decora, marcaAttivo: marcaAttivo, $: $, $$: $$, set: set };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
