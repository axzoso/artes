# Blocchi della home (hero, metodo, mosaico settori, produzione, brand, doppia CTA).
# Va incluso dopo lib-blocchi.ps1:  . "$PSScriptRoot\lib-blocchi.ps1"; . "$PSScriptRoot\lib-home.ps1"

# Pagine di destinazione (ID dei segnaposto): i link a queste usano l'oggetto nativo {id,label}, che WPML traduce.
$script:PagineIds = @{ 'arredamento-ufficio' = 144; 'arredo-negozi' = 145; 'arredo-negozi-food' = 146; 'arredamento-bar-ristoranti' = 147; 'arredamento-hotel' = 148; 'arredamento-su-misura' = 149; 'contract' = 150; 'chi-siamo' = 151; 'contatti' = 152; 'area-progettisti' = 153; 'richiedi-preventivo' = 154; 'prodotti' = 471; 'mepa' = 472 }
function Link-Pagina([string]$href, [string]$label = '') {
  $name = ($href -replace '#.*$', '' -replace '\?.*$', '') -replace '\.html$', ''
  if ($href -notmatch '[?#]' -and $script:PagineIds.ContainsKey($name)) { return @{ destination = @{ id = $script:PagineIds[$name]; label = $(if ($label) { $label } else { $name }) }; tag = 'a' } }
  return @{ destination = (Convert-Url $href); tag = 'a' }
}

function Block-Hero($H) {
  $part = New-Part; $P = 'Hero'
  $kicker = Tg 'e-flexbox' "$P Kicker" ((Tg 'e-div-block' "$P Filetto") + (Tg 'e-paragraph' "$P Kicker testo"))
  $azioni = Tg 'e-flexbox' "$P Azioni" ((Tg 'e-button' "$P CTA 1") + (Tg 'e-button' "$P CTA 2"))
  $inner = Tg 'e-div-block' "$P Interno" ($kicker + (Tg 'e-heading' "$P Titolo") + (Tg 'e-paragraph' "$P Lead") + $azioni)
  $stats = ''; $i = 0
  foreach ($s in $H.stat) { $i++; $stats += Tg 'e-div-block' "$P Stat $i" ((Tg 'e-paragraph' "$P Stat $i K") + (Tg 'e-paragraph' "$P Stat $i V")); $part.cfg["$P Stat $i K"] = @{ paragraph = $s.k }; $part.cfg["$P Stat $i V"] = @{ paragraph = $s.v }
    $part.cls["$P Stat $i"] = @('stat'); $part.cls["$P Stat $i K"] = @('stat-k'); $part.cls["$P Stat $i V"] = @('stat-v') }
  $part.xml = Tg 'e-div-block' "$P Blocco" ((Tg 'e-image' "$P Immagine") + (Tg 'e-div-block' "$P Scrim") + $inner + (Tg 'e-div-block' "$P Statistiche" $stats))
  $part.cfg["$P Immagine"] = @{ image = (ImgCfg $H.img.src 'full') }
  $part.cfg["$P Kicker testo"] = @{ paragraph = $H.kicker }; $part.cfg["$P Titolo"] = @{ tag = 'h1'; title = $H.h1 }; $part.cfg["$P Lead"] = @{ paragraph = $H.lead }
  $part.cfg["$P CTA 1"] = @{ text = $H.bottoni[0].testo; link = (Link-Pagina $H.bottoni[0].href $H.bottoni[0].testo) }
  $part.cfg["$P CTA 2"] = @{ text = $H.bottoni[1].testo; link = (Link-Pagina $H.bottoni[1].href $H.bottoni[1].testo) }
  $part.cls["$P Blocco"] = @('hero'); $part.cls["$P Immagine"] = @('abs-fill'); $part.cls["$P Scrim"] = @('hero-scrim'); $part.cls["$P Interno"] = @('hero-inner')
  $part.cls["$P Kicker"] = @('hero-kicker'); $part.cls["$P Filetto"] = @('hero-rule'); $part.cls["$P Kicker testo"] = @('hero-kicker-lbl'); $part.cls["$P Titolo"] = @('hero-title'); $part.cls["$P Lead"] = @('hero-lead')
  $part.cls["$P Azioni"] = @('hero-actions'); $part.cls["$P Statistiche"] = @('hero-stats')
  $part.cls["$P CTA 1"] = @('btn', 'btn-red'); $part.cls["$P CTA 2"] = @('btn', 'btn-ghost')
  $part.sty["$P CTA 1"] = 'border-radius: 0; border-width: 0;'; $part.sty["$P CTA 2"] = 'border-radius: 0; background-color: transparent;'
  return $part
}

function Block-Metodo($M) {
  $part = New-Part; $P = 'Metodo'
  $intro = Tg 'e-div-block' "$P Intro" ((Tg 'e-paragraph' "$P Eyebrow") + (Tg 'e-heading' "$P Titolo") + (Tg 'e-paragraph' "$P Lead") + (Tg 'e-paragraph' "$P Link"))
  $fasi = ''; $i = 0
  foreach ($f in $M.fasi) { $i++; $fasi += Tg 'e-div-block' "$P Fase $i" ((Tg 'e-heading' "$P Fase $i T") + (Tg 'e-paragraph' "$P Fase $i D")); $part.cfg["$P Fase $i T"] = @{ tag = 'h3'; title = $f.t }; $part.cfg["$P Fase $i D"] = @{ paragraph = $f.d }
    $part.cls["$P Fase $i"] = @('fase'); $part.cls["$P Fase $i T"] = @('fase-t'); $part.cls["$P Fase $i D"] = @('fase-d') }
  $fasi += Tg 'e-div-block' "$P Scura" ((Tg 'e-paragraph' "$P Scura N") + (Tg 'e-div-block' "$P Scura Testo" ((Tg 'e-heading' "$P Scura T") + (Tg 'e-paragraph' "$P Scura L"))))
  $part.xml = Tg 'e-div-block' "$P Blocco" ($intro + (Tg 'e-div-block' "$P Fasi" $fasi))
  $part.cfg["$P Eyebrow"] = @{ paragraph = $M.eyebrow }; $part.cfg["$P Titolo"] = @{ tag = 'h2'; title = $M.titolo }; $part.cfg["$P Lead"] = @{ paragraph = $M.lead }
  $part.cfg["$P Link"] = @{ paragraph = $M.link.testo; link = (Link-Pagina $M.link.href $M.link.testo) }
  $part.cfg["$P Scura N"] = @{ paragraph = $M.scura.n }; $part.cfg["$P Scura T"] = @{ tag = 'h3'; title = $M.scura.t }; $part.cfg["$P Scura L"] = @{ paragraph = $M.scura.l }
  $part.cls["$P Blocco"] = @('metodo-grid'); $part.cls["$P Intro"] = @('metodo-intro'); $part.cls["$P Eyebrow"] = @('eyebrow'); $part.cls["$P Titolo"] = @('h-section'); $part.cls["$P Lead"] = @('lead'); $part.cls["$P Link"] = @('link-rule')
  $part.cls["$P Fasi"] = @('fasi-grid'); $part.cls["$P Scura"] = @('fase-dark'); $part.cls["$P Scura N"] = @('fase-dark-n'); $part.cls["$P Scura T"] = @('fase-dark-t'); $part.cls["$P Scura L"] = @('fase-dark-l')
  $part.sty["$P Lead"] = 'margin: 26px 0 0;'; $part.sty["$P Link"] = 'margin-top: 30px;'; $part.sty["$P Scura Testo"] = 'padding: 0;'; $part.sty["$P Fasi"] = 'padding: 0;'
  return $part
}

function Block-Tiles($S) {
  $part = New-Part; $P = 'Settori'
  $testa = Tg 'e-flexbox' "$P Testa" (Tg 'e-div-block' "$P Titoli" ((Tg 'e-paragraph' "$P Eyebrow") + (Tg 'e-heading' "$P Titolo")))
  $tiles = ''; $i = 0
  foreach ($t in $S.tile) { $i++
    $tiles += Tg 'e-div-block' "$P Tile $i" ((Tg 'e-image' "$P Tile $i Img") + (Tg 'e-div-block' "$P Tile $i Scrim") + (Tg 'e-div-block' "$P Tile $i Corpo" ((Tg 'e-heading' "$P Tile $i T") + (Tg 'e-paragraph' "$P Tile $i D"))))
    $part.cfg["$P Tile $i"] = @{ link = (Link-Pagina $t.href $t.t) }
    $part.cfg["$P Tile $i Img"] = @{ image = (ImgCfg $t.img.src 'large') }; $part.cfg["$P Tile $i T"] = @{ tag = 'h3'; title = $t.t }; $part.cfg["$P Tile $i D"] = @{ paragraph = $t.d }
    $part.cls["$P Tile $i"] = if ($t.alta) { @('tile', 'tile-tall') } else { , @('tile') }
    $part.cls["$P Tile $i Img"] = @('abs-fill'); $part.cls["$P Tile $i Scrim"] = @('tile-scrim'); $part.cls["$P Tile $i Corpo"] = @('tile-body'); $part.cls["$P Tile $i T"] = @('tile-t'); $part.cls["$P Tile $i D"] = @('tile-d') }
  $part.xml = Tg 'e-div-block' "$P Sezione" ($testa + (Tg 'e-div-block' "$P Griglia" $tiles))
  $part.cfg["$P Eyebrow"] = @{ paragraph = $S.eyebrow }; $part.cfg["$P Titolo"] = @{ tag = 'h2'; title = $S.titolo }
  $part.cls["$P Sezione"] = @('section', 'bg-alt'); $part.cls["$P Testa"] = @('section-head'); $part.cls["$P Eyebrow"] = @('eyebrow'); $part.cls["$P Titolo"] = @('h-section'); $part.cls["$P Griglia"] = @('tiles-grid')
  $part.sty["$P Testa"] = 'padding: 0;'; $part.sty["$P Titoli"] = 'padding: 0;'
  return $part
}

# Produzione: testo + lavorazioni a sinistra, immagine con inserto a destra (lo slider del mockup non si porta)
function Block-Produzione($Pr) {
  $part = New-Part; $P = 'Produzione'
  $lav = ''; $i = 0
  foreach ($l in $Pr.lavorazioni) { $i++; $lav += Tg 'e-div-block' "$P Lav $i" ((Tg 'e-heading' "$P Lav $i T") + (Tg 'e-paragraph' "$P Lav $i D")); $part.cfg["$P Lav $i T"] = @{ tag = 'h3'; title = $l.t }; $part.cfg["$P Lav $i D"] = @{ paragraph = $l.d }
    $part.cls["$P Lav $i"] = @('lavorazione'); $part.cls["$P Lav $i T"] = @('lavorazione-t'); $part.cls["$P Lav $i D"] = @('lavorazione-d') }
  $testo = Tg 'e-div-block' "$P Testo" ((Tg 'e-paragraph' "$P Eyebrow") + (Tg 'e-heading' "$P Titolo") + (Tg 'e-paragraph' "$P Lead") + (Tg 'e-div-block' "$P Lavorazioni" $lav) + (Tg 'e-paragraph' "$P Link"))
  $media = Tg 'e-div-block' "$P Media" ((Tg 'e-image' "$P Immagine") + (Tg 'e-div-block' "$P Inserto" (Tg 'e-image' "$P Inserto immagine")))
  $part.xml = Tg 'e-div-block' "$P Sezione" ($testo + $media)
  $part.cfg["$P Eyebrow"] = @{ paragraph = $Pr.eyebrow }; $part.cfg["$P Titolo"] = @{ tag = 'h2'; title = $Pr.titolo }; $part.cfg["$P Lead"] = @{ paragraph = $Pr.lead }
  $part.cfg["$P Link"] = @{ paragraph = $Pr.link.testo; link = (Link-Pagina $Pr.link.href $Pr.link.testo) }
  $part.cfg["$P Immagine"] = @{ image = (ImgCfg $Pr.immagini[0].src 'large') }; $part.cfg["$P Inserto immagine"] = @{ image = (ImgCfg $Pr.immagini[1].src 'large') }
  $part.cls["$P Sezione"] = @('settore-blocco'); $part.cls["$P Testo"] = @('settore-testo'); $part.cls["$P Media"] = @('settore-media'); $part.cls["$P Inserto"] = @('settore-inset')
  $part.cls["$P Eyebrow"] = @('eyebrow'); $part.cls["$P Titolo"] = @('h-section'); $part.cls["$P Lead"] = @('lead'); $part.cls["$P Lavorazioni"] = @('lavorazioni-grid'); $part.cls["$P Link"] = @('link-rule')
  $part.cls["$P Immagine"] = @('abs-fill'); $part.cls["$P Inserto immagine"] = @('abs-fill')
  $part.sty["$P Lead"] = 'margin: 26px 0 42px; max-width: 460px;'
  return $part
}

# Muro dei brand: tutti i brand (ciclo) con categoria, su fondo scuro
function Block-Brands($B) {
  $part = New-Part; $P = 'Brand'
  $sx = Tg 'e-flexbox' "$P Sinistra" ((Tg 'e-paragraph' "$P Eyebrow") + (Tg 'e-paragraph' "$P Lead"))
  $testa = Tg 'e-flexbox' "$P Testa" ($sx + (Tg 'e-paragraph' "$P Link"))
  $item = Tg 'e-collection-loop-item' "$P Voce" (Tg 'e-div-block' "$P Voce corpo" ((Tg 'e-paragraph' "$P Nome") + (Tg 'e-paragraph' "$P Categoria")))
  $loop = Tg 'e-collection-loop' "$P Loop" (Tg 'e-collection-loop-layout' "$P Griglia" $item)
  $part.xml = Tg 'e-div-block' "$P Sezione" ($testa + $loop)
  $part.cfg["$P Eyebrow"] = @{ paragraph = $B.eyebrow }; $part.cfg["$P Lead"] = @{ paragraph = $B.lead }
  $part.cfg["$P Link"] = @{ paragraph = $B.link.testo; link = @{ destination = (Convert-Url $B.link.href); tag = 'a' } }
  $part.cfg["$P Loop"] = @{ query = @{ template_type = 'post'; source = 'brand'; query_id = 'artes_brand_home'; posts_per_page = 40 } }
  $part.cfg["$P Voce corpo"] = @{ link = @{ destination = '/brand-partner/'; tag = 'a' } }
  $part.cfg["$P Nome"] = @{ paragraph = (Dyn 'post-title' @{}) }
  $part.cfg["$P Categoria"] = @{ paragraph = (Dyn 'jet-term-field' @{ taxonomy = 'categoria_brand'; term_field = 'name' }) }
  $part.cls["$P Sezione"] = @('brands-sezione'); $part.cls["$P Testa"] = @('brands-testa'); $part.cls["$P Sinistra"] = @('brands-testa-l'); $part.cls["$P Eyebrow"] = @('brands-eyebrow'); $part.cls["$P Lead"] = @('brands-lead'); $part.cls["$P Link"] = @('link-rule')
  $part.cls["$P Griglia"] = @('brands-grid'); $part.cls["$P Voce corpo"] = @('brand-item'); $part.cls["$P Nome"] = @('brand-item-n'); $part.cls["$P Categoria"] = @('brand-item-c')
  $part.sty["$P Loop"] = 'padding: 0;'; $part.sty["$P Griglia"] = 'padding: 0;'; $part.sty["$P Voce"] = 'padding: 0;'
  return $part
}

function Block-CtaDuo($Pannelli) {
  $part = New-Part; $P = 'Duo'
  $xml = ''; $i = 0
  foreach ($x in $Pannelli) { $i++
    $xml += Tg 'e-div-block' "$P Pannello $i" ((Tg 'e-div-block' "$P Pannello $i Alto" ((Tg 'e-paragraph' "$P Pannello $i Lbl") + (Tg 'e-heading' "$P Pannello $i H2") + (Tg 'e-paragraph' "$P Pannello $i P"))) + (Tg 'e-button' "$P Pannello $i Bottone"))
    $part.cfg["$P Pannello $i Lbl"] = @{ paragraph = $x.lbl }; $part.cfg["$P Pannello $i H2"] = @{ tag = 'h2'; title = $x.h2 }; $part.cfg["$P Pannello $i P"] = @{ paragraph = $x.p }
    $part.cfg["$P Pannello $i Bottone"] = @{ text = $x.testo; link = (Link-Pagina $x.href $x.testo) }
    $part.cls["$P Pannello $i"] = if ($x.variante -eq 'dark') { @('cta-panel', 'cta-panel-dark') } else { @('cta-panel', 'cta-panel-red') }
    $part.cls["$P Pannello $i Alto"] = @('cta-panel-top'); $part.cls["$P Pannello $i Lbl"] = @('cta-panel-lbl'); $part.cls["$P Pannello $i H2"] = @('cta-panel-h2'); $part.cls["$P Pannello $i P"] = @('cta-panel-p')
    if ($x.variante -eq 'dark') { $part.cls["$P Pannello $i Bottone"] = @('btn', 'btn-ghost'); $part.sty["$P Pannello $i Bottone"] = 'border-radius: 0; background-color: transparent;' }
    else { $part.cls["$P Pannello $i Bottone"] = @('btn', 'btn-light'); $part.sty["$P Pannello $i Bottone"] = 'border-radius: 0; border-width: 0;' } }
  $part.xml = Tg 'e-div-block' "$P Blocco" $xml
  $part.cls["$P Blocco"] = @('cta-duo')
  return $part
}
