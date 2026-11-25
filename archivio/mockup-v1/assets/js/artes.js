/* ARTES Contract — interazioni del template.
   Filtri dei progetti/brand, nav mobile, slider della home e invio del form
   contatti (simulato). Tutto il resto è markup statico: la pagina resta
   leggibile senza JS. */

(function () {
  'use strict';

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

    /* ?settore=… preseleziona un filtro: le pagine settore linkano così
       l'archivio Realizzazioni già filtrato sul proprio settore. */
    var richiesto = new URLSearchParams(location.search).get('settore');
    var esiste = Array.prototype.some.call(buttons, function (b) {
      return b.dataset.filtro === richiesto;
    });
    apply(esiste ? richiesto : 'Tutti');
  }

  /* --- Form contatti ------------------------------------------------------ */
  /* Nel mockup l'invio è simulato: se i campi obbligatori sono validi il
     form lascia il posto al messaggio di conferma. In WordPress l'invio
     sarà gestito dal plugin form scelto.
     Un parametro nell'URL con lo stesso nome di una <select> la preseleziona
     (valore o testo dell'opzione): richiedi-preventivo.html?settore=… dalle
     pagine settore, contatti.html?motivo=tecnico da "Parla con un tecnico". */

  function initForm() {
    var params = new URLSearchParams(location.search);

    document.querySelectorAll('[data-contatti]').forEach(function (form) {
      params.forEach(function (valore, nome) {
        var select = form.querySelector('select[name="' + nome + '"]');
        if (!select) return;
        Array.prototype.forEach.call(select.options, function (opt) {
          if (opt.value === valore || opt.text === valore) opt.selected = true;
        });
      });

      var ok = form.parentNode.querySelector('[data-contatti-ok]');
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        if (!form.reportValidity()) return;
        form.hidden = true;
        if (ok) {
          ok.hidden = false;
          ok.focus();
        }
      });
    });
  }

  /* --- Nav mobile (hamburger) ------------------------------------------- */
  /* Fino a 1365px la riga di navigazione sparisce via CSS; questo pannello
     a schermo intero la sostituisce con le stesse voci. */

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

  function init() {
    initFiltri();
    initMobileNav();
    initProduzioneSlider();
    initForm();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
