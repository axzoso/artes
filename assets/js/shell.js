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
      <a href="#">Contatti</a>
      <span>T +39 0000 000 000</span>
      <span class="topbar__lang">IT / EN</span>
    </div>
  </div>

  <div class="masthead">
    <a class="masthead__logo" href="index.html"><img src="assets/artes-logo.png" alt="ARTES Arredamenti"></a>
    <nav class="nav" aria-label="Navigazione principale">
      <a href="arredamento-ufficio.html" class="nav__trigger" data-drop-trigger aria-expanded="false" aria-controls="drop-ufficio">Arredamento ufficio</a>
      <a href="arredo-negozi.html" class="nav__trigger" data-drop-trigger aria-expanded="false" aria-controls="drop-negozi-food" data-nav-alias="arredamento-bar-ristoranti.html arredamento-alimentari-wine-food.html">Arredamento negozi e food</a>
      <a href="arredamento-hotel.html" class="nav__trigger" data-drop-trigger aria-expanded="false" aria-controls="drop-hotel">Arredamento hotel</a>
      <a href="arredamento-su-misura.html">Arredamento su misura</a>
      <a href="contract.html">Arredo Contract</a>
      <a href="#">Blog</a>
      <a href="chi-siamo.html">Chi siamo</a>
    </nav>
    <div class="masthead__actions">
      <a href="#" class="btn-sm btn-sm--outline">Area Progettisti</a>
      <a href="#" class="btn-sm btn-sm--red">Contattaci</a>
    </div>
    <button type="button" class="nav-toggle" aria-label="Apri il menu" aria-expanded="false" aria-controls="mobile-nav">
      <span class="nav-toggle__bar"></span>
      <span class="nav-toggle__bar"></span>
      <span class="nav-toggle__bar"></span>
    </button>
  </div>

  <div class="drop" id="drop-ufficio" hidden>
    <div class="drop__inner">
      <div class="drop__ph"></div>
      <div class="drop__list">
        <a href="#">Uffici direzionali</a>
        <a href="#">Open space</a>
        <a href="#">Coworking</a>
        <a href="#">Sale meeting e conferenze</a>
        <a href="#">Academy e aule formazione</a>
        <a href="#">Scuole, università, biblioteche</a>
        <a href="#">Reception corporate</a>
        <a href="#">Business lounge e aree break</a>
      </div>
    </div>
  </div>
  <div class="drop" id="drop-negozi-food" hidden>
    <div class="drop__cols">
      <div class="drop__col">
        <div class="drop__col-title"><a href="arredo-negozi.html">Arredo negozi</a></div>
        <div class="drop__list">
          <a href="#">Boutique e negozi moda</a>
          <a href="#">Showroom e concept store</a>
          <a href="#">Profumerie e retail beauty</a>
          <a href="#">Gioiellerie e ottiche</a>
          <a href="#">Farmacie e parafarmacie</a>
          <a href="#">Telefonia ed elettronica</a>
          <a href="#">Store sportivi</a>
          <a href="#">Temporary shop e franchising</a>
        </div>
      </div>
      <div class="drop__col">
        <div class="drop__col-title"><a href="arredamento-bar-ristoranti.html">Arredamento bar e ristoranti</a></div>
        <div class="drop__list">
          <a href="#">Panetterie e bakery</a>
          <a href="#">Pasticcerie</a>
          <a href="#">Gastronomie e salumerie</a>
          <a href="#">Macellerie e pescherie</a>
          <a href="#">Caseifici</a>
          <a href="#">Market gourmet</a>
          <a href="#">Chocolate shop e take-away</a>
          <a href="#">Healthy food store</a>
        </div>
      </div>
      <div class="drop__col">
        <div class="drop__col-title"><a href="arredamento-alimentari-wine-food.html">Arredamento alimentari, wine e food</a></div>
        <div class="drop__list">
          <a href="#">Bar e caffetterie</a>
          <a href="#">Bistrot e ristoranti</a>
          <a href="#">Pizzerie e pub</a>
          <a href="#">Lounge e cocktail bar</a>
          <a href="#">Wine bar ed enoteche</a>
          <a href="#">Gelaterie</a>
          <a href="#">Fast casual e street food</a>
          <a href="#">Food court e rooftop bar</a>
        </div>
      </div>
    </div>
  </div>
  <div class="drop" id="drop-hotel" hidden>
    <div class="drop__inner">
      <div class="drop__ph"></div>
      <div class="drop__list">
        <a href="#">Hotel e resort</a>
        <a href="#">Boutique hotel e b&amp;b premium</a>
        <a href="#">Spa e wellness center</a>
        <a href="#">Reception e lounge hotel</a>
        <a href="#">Aree breakfast</a>
        <a href="#">Rooftop hospitality</a>
        <a href="#">Residence e business hotel</a>
        <a href="#">Co-living e serviced apartment</a>
      </div>
    </div>
  </div>

  <div class="mobile-nav" id="mobile-nav" hidden>
    <nav class="mobile-nav__list" aria-label="Navigazione mobile">
      <div class="mobile-nav__item">
        <button type="button" class="mobile-nav__trigger" aria-expanded="false" aria-controls="mnav-ufficio">Arredamento ufficio</button>
        <div class="mobile-nav__panel" id="mnav-ufficio" hidden>
          <a href="arredamento-ufficio.html">Vedi tutto</a>
          <a href="#">Uffici direzionali</a>
          <a href="#">Open space</a>
          <a href="#">Coworking</a>
          <a href="#">Sale meeting e conferenze</a>
          <a href="#">Academy e aule formazione</a>
          <a href="#">Scuole, università, biblioteche</a>
          <a href="#">Reception corporate</a>
          <a href="#">Business lounge e aree break</a>
        </div>
      </div>
      <div class="mobile-nav__item">
        <button type="button" class="mobile-nav__trigger" aria-expanded="false" aria-controls="mnav-negozi-food">Arredamento negozi e food</button>
        <div class="mobile-nav__panel" id="mnav-negozi-food" hidden>
          <div class="mobile-nav__group">
            <a href="arredo-negozi.html" class="mobile-nav__group-title">Arredo negozi</a>
            <a href="#">Boutique e negozi moda</a>
            <a href="#">Showroom e concept store</a>
            <a href="#">Profumerie e retail beauty</a>
            <a href="#">Gioiellerie e ottiche</a>
            <a href="#">Farmacie e parafarmacie</a>
            <a href="#">Telefonia ed elettronica</a>
            <a href="#">Store sportivi</a>
            <a href="#">Temporary shop e franchising</a>
          </div>
          <div class="mobile-nav__group">
            <a href="arredamento-bar-ristoranti.html" class="mobile-nav__group-title">Arredamento bar e ristoranti</a>
            <a href="#">Panetterie e bakery</a>
            <a href="#">Pasticcerie</a>
            <a href="#">Gastronomie e salumerie</a>
            <a href="#">Macellerie e pescherie</a>
            <a href="#">Caseifici</a>
            <a href="#">Market gourmet</a>
            <a href="#">Chocolate shop e take-away</a>
            <a href="#">Healthy food store</a>
          </div>
          <div class="mobile-nav__group">
            <a href="arredamento-alimentari-wine-food.html" class="mobile-nav__group-title">Arredamento alimentari, wine e food</a>
            <a href="#">Bar e caffetterie</a>
            <a href="#">Bistrot e ristoranti</a>
            <a href="#">Pizzerie e pub</a>
            <a href="#">Lounge e cocktail bar</a>
            <a href="#">Wine bar ed enoteche</a>
            <a href="#">Gelaterie</a>
            <a href="#">Fast casual e street food</a>
            <a href="#">Food court e rooftop bar</a>
          </div>
        </div>
      </div>
      <div class="mobile-nav__item">
        <button type="button" class="mobile-nav__trigger" aria-expanded="false" aria-controls="mnav-hotel">Arredamento hotel</button>
        <div class="mobile-nav__panel" id="mnav-hotel" hidden>
          <a href="arredamento-hotel.html">Vedi tutto</a>
          <a href="#">Hotel e resort</a>
          <a href="#">Boutique hotel e b&amp;b premium</a>
          <a href="#">Spa e wellness center</a>
          <a href="#">Reception e lounge hotel</a>
          <a href="#">Aree breakfast</a>
          <a href="#">Rooftop hospitality</a>
          <a href="#">Residence e business hotel</a>
          <a href="#">Co-living e serviced apartment</a>
        </div>
      </div>
      <a href="arredamento-su-misura.html">Arredamento su misura</a>
      <a href="contract.html">Arredo Contract</a>
      <a href="#">Blog</a>
      <a href="chi-siamo.html">Chi siamo</a>
      <div class="mobile-nav__divider"></div>
      <a href="#">Contatti</a>
      <a href="#" class="btn-sm btn-sm--outline">Area Progettisti</a>
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
      <p class="footer__about">Artes: arredi contract. Progettazione, produzione e installazione di arredi su misura per uffici, negozi, bar e ristoranti, alimentari e hotel.</p>
    </div>
    <div>
      <div class="footer__t">Azienda</div>
      <div class="footer__list">
        <a href="chi-siamo.html">Chi siamo</a><a href="contract.html">Arredo Contract</a><a href="arredamento-su-misura.html">Arredamento su misura</a><a href="#">Realizzazioni</a><a href="#">Contatti</a>
      </div>
    </div>
    <div>
      <div class="footer__t">Settori</div>
      <div class="footer__list">
        <a href="arredamento-ufficio.html">Arredamento ufficio</a><a href="arredo-negozi.html">Arredo negozi</a><a href="arredamento-bar-ristoranti.html">Arredamento bar e ristoranti</a><a href="arredamento-alimentari-wine-food.html">Arredamento alimentari, wine e food</a><a href="arredamento-hotel.html">Arredamento hotel</a>
      </div>
    </div>
    <div>
      <div class="footer__t">Risorse</div>
      <div class="footer__list">
        <a href="brand-partner.html">Brand Partner</a><a href="#">Prodotti</a><a href="#">Architetti</a><a href="#">MEPA / PA</a><a href="#">Cataloghi PDF</a><a href="#">Blog</a>
      </div>
    </div>
    <div>
      <div class="footer__t">Contatti</div>
      <div class="footer__contact">Via —, Rende (CS)<br>T +39 0000 000 000<br>info@artesarredamenti.it</div>
      <a href="#" class="footer__cta">Richiedi un progetto</a>
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
     che la tengono attiva — serve alle pagine figlie di un settore. */

  function markActive(root) {
    var page = location.pathname.split('/').pop() || 'index.html';

    root.querySelectorAll('.nav a[href], .nav__end a[href]').forEach(function (link) {
      var alias = (link.getAttribute('data-nav-alias') || '').split(/\s+/);
      if (link.getAttribute('href') === page || alias.indexOf(page) !== -1) {
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
