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

  function init() {
    initDrops();
    initFiltri();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
