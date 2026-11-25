/* ARTES Contract — interazioni del template.
   Due comportamenti soltanto: le tendine di settore in header e i filtri
   dei progetti/brand. Tutto il resto è markup statico: la pagina resta
   leggibile senza JS. */

(function () {
  'use strict';

  /* --- Tendine di settore ------------------------------------------------ */
  /* Ogni voce di nav con [data-drop-trigger] apre il proprio pannello
     (aria-controls). Aprirne una chiude le altre. Stesso comportamento di
     prima: hover con piccolo ritardo di chiusura, focus apre, Escape chiude,
     un click fuori chiude. */

  function initDrops() {
    var triggers = document.querySelectorAll('[data-drop-trigger]');
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
      // Il trigger è un link alla pagina di settore: il click naviga, non intercettiamo.
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

  /* --- Filtri (progetti o brand) ----------------------------------------- */
  /* Generico: filtra qualunque figlio diretto con [data-settore] dentro
     [data-progetti], in base al bottone .filtro[data-filtro] attivo dentro
     [data-filtri]. Usato sia per le griglie progetti sia per la griglia
     brand partner. */

  function initFiltri() {
    var bar = document.querySelector('[data-filtri]');
    var grid = document.querySelector('[data-progetti]');
    if (!bar || !grid) return;

    var buttons = bar.querySelectorAll('.filtro');
    var items = grid.querySelectorAll('[data-settore]');
    var empty = grid.querySelector('[data-empty]');

    function apply(valore) {
      var visibili = 0;

      items.forEach(function (item) {
        var match = valore === 'Tutti' || item.dataset.settore === valore;
        item.hidden = !match;
        if (match) visibili++;
      });

      buttons.forEach(function (b) {
        var active = b.dataset.filtro === valore;
        b.classList.toggle('is-active', active);
        b.setAttribute('aria-pressed', String(active));
      });

      if (empty) empty.hidden = visibili > 0;
    }

    bar.addEventListener('click', function (e) {
      var btn = e.target.closest('.filtro');
      if (btn) apply(btn.dataset.filtro);
    });

    apply('Tutti');
  }

  /* --- Nav mobile (hamburger + accordion) -------------------------------- */
  /* Sotto i 1024px la nav orizzontale e le tendine hover spariscono via CSS;
     questo pannello a schermo intero le sostituisce. Le 5 voci di settore
     diventano accordion: un pannello aperto alla volta. */

  function initMobileNav() {
    var toggle = document.querySelector('.nav-toggle');
    var panel = document.getElementById('mobile-nav');
    if (!toggle || !panel) return;

    function open() {
      panel.hidden = false;
      toggle.setAttribute('aria-expanded', 'true');
      toggle.classList.add('is-open');
      document.body.style.overflow = 'hidden';
    }

    function close() {
      panel.hidden = true;
      toggle.setAttribute('aria-expanded', 'false');
      toggle.classList.remove('is-open');
      document.body.style.overflow = '';
    }

    toggle.addEventListener('click', function () {
      if (panel.hidden) open(); else close();
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !panel.hidden) close();
    });

    var triggers = panel.querySelectorAll('.mobile-nav__trigger');
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

  /* --- Slider produzione ------------------------------------------------- */
  function initProduzioneSlider() {
    var slider = document.querySelector('[data-produzione-slider]');
    if (!slider) return;

    var slides = Array.prototype.slice.call(slider.querySelectorAll('.produzione-slide'));
    var prev = slider.querySelector('[data-slide-prev]');
    var next = slider.querySelector('[data-slide-next]');
    var count = slider.querySelector('.produzione-slider__count');
    if (slides.length < 2 || !prev || !next) return;

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

  /* --- Archivio realizzazioni (rev02) ------------------------------------ */
  /* Gallery per settore con filtri sulle sole Categorie (2° livello).
     Settore e categoria arrivano anche dall'URL (?settore=…&categoria=…),
     così i link del menu e delle pagine settore aprono la gallery filtrata. */

  function initRealizzazioni() {
    var root = document.querySelector('[data-archivio]');
    if (!root) return;

    var tabs = root.querySelectorAll('.settori-tabs__btn');
    var groups = root.querySelectorAll('[data-categorie]');
    var items = root.querySelectorAll('[data-key]');
    var empty = root.querySelector('[data-archivio-empty]');
    var count = root.querySelector('[data-archivio-count]');
    var params = new URLSearchParams(window.location.search);
    var state = { settore: params.get('settore') || '', categoria: params.get('categoria') || '' };

    function apply(updateUrl) {
      var visibili = 0;

      tabs.forEach(function (t) {
        var active = t.dataset.settoreKey === state.settore;
        t.classList.toggle('is-active', active);
        t.setAttribute('aria-pressed', String(active));
      });

      groups.forEach(function (g) {
        g.hidden = g.dataset.categorie !== state.settore;
        g.querySelectorAll('.filtro').forEach(function (b) {
          var active = b.dataset.categoria === state.categoria;
          b.classList.toggle('is-active', active);
          b.setAttribute('aria-pressed', String(active));
        });
      });

      items.forEach(function (item) {
        var match = (!state.settore || item.dataset.key === state.settore) &&
                    (!state.categoria || item.dataset.cat === state.categoria);
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
        state.settore = tab.dataset.settoreKey;
        state.categoria = '';
        apply(true);
        return;
      }
      var btn = e.target.closest('[data-categorie] .filtro');
      if (btn) {
        state.categoria = btn.dataset.categoria;
        apply(true);
      }
    });

    apply(false);
  }

  function initLightbox() {
    var links = Array.prototype.slice.call(document.querySelectorAll('[data-lightbox]'));
    if (!links.length) return;
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
    var group = [], index = 0, lastFocus = null;

    function show(i) {
      index = (i + group.length) % group.length;
      var a = group[index], thumb = a.querySelector('img');
      img.src = a.getAttribute('href');
      img.alt = thumb ? thumb.alt : '';
      count.textContent = (index + 1) + ' / ' + group.length;
      caption.textContent = a.dataset.caption || '';
      var next = group[(index + 1) % group.length];
      if (next) { var pre = new Image(); pre.src = next.getAttribute('href'); }
    }
    function open(name, i) {
      group = links.filter(function (l) { return l.dataset.lightbox === name; });
      if (!group.length) return;
      lastFocus = document.activeElement;
      box.classList.toggle('lightbox--single', group.length < 2);
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

    links.forEach(function (a) {
      a.addEventListener('click', function (e) {
        e.preventDefault();
        var name = a.dataset.lightbox;
        var g = links.filter(function (l) { return l.dataset.lightbox === name; });
        open(name, g.indexOf(a));
      });
    });
    document.querySelectorAll('[data-lightbox-open]').forEach(function (b) {
      b.addEventListener('click', function () { open(b.dataset.lightboxOpen, 0); });
    });
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

  function init() {
    initDrops();
    initFiltri();
    initMobileNav();
    initProduzioneSlider();
    initRealizzazioni();
    initLightbox();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

/* Metodo home — pallini del carousel su mobile. */
(function () {
  var list = document.querySelector('[data-steps]');
  var dots = document.querySelector('[data-steps-dots]');
  if (!list || !dots) return;
  var items = Array.prototype.slice.call(list.children);
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
    var idx = Math.min(items.length - 1, Math.round(list.scrollLeft / w));
    for (var i = 0; i < buttons.length; i++) buttons[i].classList.toggle('is-active', i === idx);
  }
  list.addEventListener('scroll', update, { passive: true });
  update();
})();
