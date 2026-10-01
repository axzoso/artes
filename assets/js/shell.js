/* ARTES Contract — guscio del sito: header e footer.

   Unica sorgente dei due blocchi condivisi da tutte le pagine. Si modificano
   qui, una volta sola: le pagine .html contengono soltanto i segnaposto

     <div data-artes-header></div>
     <script src="assets/js/shell.js"></script>
     ...
     <div data-artes-footer></div>

   Lo script non è deferito e sta subito dopo il segnaposto dell'header:
   viene eseguito durante il parsing, quando il segnaposto esiste già e prima
   del primo paint, quindi l'header non "lampeggia". Il footer a quel punto
   non è ancora stato letto dal parser: viene iniettato su DOMContentLoaded.

   In WordPress questi due blocchi diventeranno header.php e footer.php. */

(function () {
  'use strict';

  /* --- Header ------------------------------------------------------------- */

  var HEADER = `
<header class="header">
  <div class="topbar">
    <span>Arredi contract su misura — Calabria / Italia</span>
    <div class="topbar__right">
      <span>MEPA · Acquisti in Rete PA</span>
      <a href="contatti.html">Contatti</a>
      <span>T +39 0000 000 000</span>
      <span class="topbar__lang">IT / EN</span>
    </div>
  </div>

  <div class="masthead">
    <a class="masthead__logo" href="index.html"><img src="assets/artes-logo.png" alt="ARTES Arredamenti"></a>
    <div class="masthead__actions">
      <a href="area-progettisti.html" class="btn-sm btn-sm--outline">Area Progettisti</a>
      <a href="contatti.html" class="btn-sm btn-sm--red">Contattaci</a>
    </div>
    <button type="button" class="nav-toggle" aria-label="Apri il menu" aria-expanded="false" aria-controls="mobile-nav">
      <span class="nav-toggle__bar"></span>
      <span class="nav-toggle__bar"></span>
      <span class="nav-toggle__bar"></span>
    </button>
  </div>

  <nav class="navbar" aria-label="Navigazione principale">
    <div class="nav">
      <a href="arredamento-ufficio.html">Arredo uffici &amp; workspace</a>
      <a href="arredo-negozi.html">Arredo negozi &amp; retail</a>
      <a href="arredo-negozi-food.html">Arredo negozi food</a>
      <a href="arredamento-bar-ristoranti.html">Arredo bar &amp; ristoranti</a>
      <a href="arredamento-hotel.html">Arredo hotel &amp; hospitality</a>
    </div>
    <div class="nav__end">
      <a href="realizzazioni.html" data-nav-alias="realizzazione-*">Realizzazioni</a>
      <a href="arredamento-su-misura.html">Arredamento su misura</a>
      <a href="contract.html">Arredo Contract</a>
      <a href="#">Blog</a>
      <a href="chi-siamo.html">Chi siamo</a>
    </div>
  </nav>

  <div class="mobile-nav" id="mobile-nav" hidden>
    <nav class="mobile-nav__list" aria-label="Navigazione mobile">
      <a href="arredamento-ufficio.html">Arredo uffici &amp; workspace</a>
      <a href="arredo-negozi.html">Arredo negozi &amp; retail</a>
      <a href="arredo-negozi-food.html">Arredo negozi food</a>
      <a href="arredamento-bar-ristoranti.html">Arredo bar &amp; ristoranti</a>
      <a href="arredamento-hotel.html">Arredo hotel &amp; hospitality</a>
      <div class="mobile-nav__divider"></div>
      <a href="realizzazioni.html">Realizzazioni</a>
      <a href="arredamento-su-misura.html">Arredamento su misura</a>
      <a href="contract.html">Arredo Contract</a>
      <a href="#">Blog</a>
      <a href="chi-siamo.html">Chi siamo</a>
      <div class="mobile-nav__divider"></div>
      <a href="contatti.html">Contatti</a>
      <a href="area-progettisti.html" class="btn-sm btn-sm--outline">Area Progettisti</a>
    </nav>
  </div>
</header>
`;

  /* --- Footer ------------------------------------------------------------- */

  var FOOTER = `
<footer class="footer">
  <div class="footer__grid">
    <div>
      <img class="footer__logo" src="assets/artes-logo.png" alt="ARTES Arredamenti">
      <p class="footer__about">Artes: arredi contract. Progettazione, produzione e installazione di arredi su misura per uffici e workspace, negozi e retail, negozi food, bar e ristoranti, hotel e hospitality.</p>
    </div>
    <div>
      <div class="footer__t">Azienda</div>
      <div class="footer__list">
        <a href="chi-siamo.html">Chi siamo</a><a href="contract.html">Arredo Contract</a><a href="arredamento-su-misura.html">Arredamento su misura</a><a href="realizzazioni.html">Realizzazioni</a><a href="contatti.html">Contatti</a>
      </div>
    </div>
    <div>
      <div class="footer__t">Settori</div>
      <div class="footer__list">
        <a href="arredamento-ufficio.html">Arredo uffici &amp; workspace</a><a href="arredo-negozi.html">Arredo negozi &amp; retail</a><a href="arredo-negozi-food.html">Arredo negozi food</a><a href="arredamento-bar-ristoranti.html">Arredo bar &amp; ristoranti</a><a href="arredamento-hotel.html">Arredo hotel &amp; hospitality</a>
      </div>
    </div>
    <div>
      <div class="footer__t">Risorse</div>
      <div class="footer__list">
        <a href="brand-partner.html">Brand Partner</a><a href="#">Prodotti</a><a href="area-progettisti.html">Area progettisti</a><a href="#">MEPA / PA</a><a href="#">Cataloghi PDF</a><a href="#">Blog</a>
      </div>
    </div>
    <div>
      <div class="footer__t">Contatti</div>
      <div class="footer__contact">Via —, Rende (CS)<br>T +39 0000 000 000<br>info@artesarredamenti.it</div>
      <a href="richiedi-preventivo.html" class="footer__cta">Richiedi un progetto</a>
    </div>
  </div>
  <div class="footer__bottom">
    <span>© 2026 Artes Arredamenti — P.IVA 00000000000</span>
    <span>Privacy · Cookie · MEPA</span>
  </div>
</footer>
`;

  /* --- Voce di menu attiva ------------------------------------------------ */
  /* Era l'unica differenza fra i 13 header copiati a mano: ora si ricava dal
     file corrente. Una voce può dichiarare con [data-nav-alias] altre pagine
     che la tengono attiva; un alias che finisce con * vale come prefisso
     (Realizzazioni resta attiva su tutte le schede realizzazione-*.html). */

  function markActive(root) {
    var page = location.pathname.split('/').pop() || 'index.html';

    root.querySelectorAll('.nav a[href], .nav__end a[href]').forEach(function (link) {
      var alias = (link.getAttribute('data-nav-alias') || '').split(/\s+/);
      var match = link.getAttribute('href') === page || alias.some(function (a) {
        return a && (a === page || (a.slice(-1) === '*' && page.indexOf(a.slice(0, -1)) === 0));
      });
      if (match) {
        link.classList.add('is-active');
      }
    });
  }

  /* --- Iniezione ---------------------------------------------------------- */
  /* Il markup si decora prima di entrare nel documento, così la pagina non
     vede mai uno stato intermedio. Il segnaposto sparisce: nel DOM finale
     restano <header> e <footer> come se fossero scritti nella pagina. */

  function render(marker, html, decorate) {
    if (!marker) return;

    var host = document.createElement('div');
    host.innerHTML = html;
    if (decorate) decorate(host);

    var parent = marker.parentNode;
    while (host.firstChild) parent.insertBefore(host.firstChild, marker);
    parent.removeChild(marker);
  }

  render(document.querySelector('[data-artes-header]'), HEADER, markActive);

  function renderFooter() {
    render(document.querySelector('[data-artes-footer]'), FOOTER, null);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', renderFooter);
  } else {
    renderFooter();
  }
})();
