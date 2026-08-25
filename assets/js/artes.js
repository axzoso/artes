/* ARTES Contract — interazioni del template.
   Due comportamenti soltanto: il mega menu "Settori" e i filtri del portfolio.
   Tutto il resto è markup statico: la pagina resta leggibile senza JS. */

(function () {
  'use strict';

  /* --- Mega menu ------------------------------------------------------- */
  /* Apre in hover come nel design, ma resta raggiungibile da tastiera:
     focus apre, Escape chiude, un click fuori chiude. */

  function initMega() {
    var trigger = document.querySelector('[data-mega-trigger]');
    var panel = document.getElementById('mega');
    if (!trigger || !panel) return;

    var closeTimer = null;

    function open() {
      clearTimeout(closeTimer);
      panel.hidden = false;
      trigger.setAttribute('aria-expanded', 'true');
    }

    /* Ritardo breve: il puntatore attraversa un vuoto fra trigger e pannello. */
    function scheduleClose() {
      clearTimeout(closeTimer);
      closeTimer = setTimeout(close, 120);
    }

    function close() {
      clearTimeout(closeTimer);
      panel.hidden = true;
      trigger.setAttribute('aria-expanded', 'false');
    }

    [trigger, panel].forEach(function (el) {
      el.addEventListener('mouseenter', open);
      el.addEventListener('mouseleave', scheduleClose);
    });

    // Il trigger è un link a settori.html: il click naviga, non intercettiamo.
    // Da tastiera il focus apre il pannello, Escape lo chiude.
    trigger.addEventListener('focus', open);

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !panel.hidden) {
        close();
        trigger.focus();
      }
    });

    document.addEventListener('focusin', function (e) {
      if (panel.hidden) return;
      if (!panel.contains(e.target) && e.target !== trigger) close();
    });
  }

  /* --- Filtri realizzazioni -------------------------------------------- */
  /* I progetti sono già nel markup con il loro span di griglia: filtrare
     significa nasconderli, così la griglia si ricompone da sola. */

  function initFiltri() {
    var bar = document.querySelector('[data-filtri]');
    var grid = document.querySelector('[data-progetti]');
    if (!bar || !grid) return;

    var buttons = bar.querySelectorAll('.filtro');
    var progetti = grid.querySelectorAll('.progetto');
    var empty = grid.querySelector('.progetti__empty');

    function apply(settore) {
      var visibili = 0;

      progetti.forEach(function (p) {
        var match = settore === 'Tutti' || p.dataset.settore === settore;
        p.hidden = !match;
        if (match) visibili++;
      });

      buttons.forEach(function (b) {
        var active = b.dataset.filtro === settore;
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

  function init() {
    initMega();
    initFiltri();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
