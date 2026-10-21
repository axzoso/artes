param([ValidateSet('header', 'footer')][string]$Which, [int]$PostId, [string]$Out)
# Genera la composizione di header o footer (stessa struttura di assets/js/shell.js).
# I link usano il tag dinamico internal-url con l'ID della pagina: WPML li traduce per lingua.
$dyn = { param($n, $s) @{ name = $n; settings = $s } }
$to = { param($id, $label) @{ destination = @{ id = [int]$id; label = $label }; tag = 'a' } }
$cfg = [ordered]@{}; $cls = [ordered]@{}; $sty = [ordered]@{}
function Tag($t, $id, $inner = '') { "<$t configuration-id=`"$id`">$inner</$t>" }

# ID delle pagine segnaposto (vedi tools/setup/menus-pagine-logo.php)
$P = @{ ufficio = 144; contatti = 152; progettisti = 153; preventivo = 154 }

if ($Which -eq 'header') {
  $topRight = (Tag 'e-paragraph' 'Topbar MEPA') + (Tag 'e-paragraph' 'Topbar contatti') + (Tag 'e-paragraph' 'Topbar telefono') + (Tag 'e-paragraph' 'Topbar lingua')
  $topbar = Tag 'e-flexbox' 'Topbar' ((Tag 'e-paragraph' 'Topbar payoff') + (Tag 'e-flexbox' 'Topbar destra' $topRight))
  $masthead = Tag 'e-flexbox' 'Masthead' ((Tag 'e-image' 'Logo') + (Tag 'e-flexbox' 'Azioni' ((Tag 'e-button' 'Btn progettisti') + (Tag 'e-button' 'Btn contattaci'))) + (Tag 'nav-menu' 'Menu mobile'))
  $navbar = Tag 'e-flexbox' 'Navbar' (Tag 'nav-menu' 'Menu principale')
  $xml = Tag 'e-div-block' 'Header ARTES' ($topbar + $masthead + $navbar)

  $cfg['Topbar payoff'] = @{ paragraph = 'Arredi contract su misura — Calabria / Italia' }
  $cfg['Topbar MEPA'] = @{ paragraph = 'MEPA · Acquisti in Rete PA' }
  $cfg['Topbar contatti'] = @{ paragraph = 'Contatti'; link = (& $to $P.contatti 'Contatti') }
  $cfg['Topbar telefono'] = @{ paragraph = 'T +39 0000 000 000' }
  $cfg['Topbar lingua'] = @{ paragraph = (& $dyn 'shortcode' @{ shortcode = '[artes_lingue]' }) }
  $cfg['Logo'] = @{ image = @{ src = (& $dyn 'site-logo' @{}); size = 'full' }; link = @{ destination = (& $dyn 'site-url' @{}); tag = 'a' } }
  $cfg['Btn progettisti'] = @{ text = 'Area Progettisti'; link = (& $to $P.progettisti 'Area Progettisti') }
  $cfg['Btn contattaci'] = @{ text = 'Contattaci'; link = (& $to $P.contatti 'Contatti') }
  $cfg['Menu mobile'] = @{ menu = 'header'; layout = 'dropdown'; toggle = 'burger'; toggle_align = 'right'; full_width = 'yes' }
  $cfg['Menu principale'] = @{ menu = 'header'; layout = 'horizontal'; pointer = 'none'; dropdown = 'none' }

  $cls['Header ARTES'] = @('site-header'); $cls['Topbar'] = @('hdr-topbar'); $cls['Topbar destra'] = @('hdr-topbar-right')
  foreach ($k in 'Topbar payoff', 'Topbar MEPA', 'Topbar telefono', 'Topbar lingua') { $cls[$k] = @('topbar-item') }
  $cls['Topbar contatti'] = @('topbar-item', 'topbar-link')
  $cls['Masthead'] = @('hdr-masthead'); $cls['Logo'] = @('hdr-logo'); $cls['Azioni'] = @('hdr-actions')
  $cls['Btn progettisti'] = @('btn-sm', 'btn-sm-outline'); $cls['Btn contattaci'] = @('btn-sm', 'btn-sm-red')
  $cls['Navbar'] = @('hdr-navbar')
  $sty['Topbar'] = 'width: 100%;'; $sty['Masthead'] = 'width: 100%;'; $sty['Navbar'] = 'width: 100%;'
  foreach ($k in 'Btn progettisti', 'Btn contattaci') { $sty[$k] = 'border-radius: 0; border-width: 1px;' }
  $sty['Btn contattaci'] = 'border-radius: 0; border-width: 0;'
}
else {
  $col = { param($id, $title, $body) Tag 'e-div-block' "Col $id" ((Tag 'e-paragraph' "Titolo $id") + $body) }
  $c1 = Tag 'e-div-block' 'Col logo' ((Tag 'e-image' 'Footer logo') + (Tag 'e-paragraph' 'Footer about'))
  $c2 = & $col 'Azienda' 'Azienda' (Tag 'nav-menu' 'Menu azienda')
  $c3 = & $col 'Settori' 'Settori' (Tag 'nav-menu' 'Menu settori')
  $c4 = & $col 'Risorse' 'Risorse' (Tag 'nav-menu' 'Menu risorse')
  $c5 = Tag 'e-div-block' 'Col contatti' ((Tag 'e-paragraph' 'Titolo Contatti') + (Tag 'e-paragraph' 'Footer contatti') + (Tag 'e-button' 'Footer CTA'))
  $grid = Tag 'e-div-block' 'Footer grid' ($c1 + $c2 + $c3 + $c4 + $c5)
  $bottom = Tag 'e-flexbox' 'Footer bottom' ((Tag 'e-paragraph' 'Bottom copyright') + (Tag 'e-paragraph' 'Bottom legale'))
  $xml = Tag 'e-div-block' 'Footer ARTES' ($grid + $bottom)

  $cfg['Footer logo'] = @{ image = @{ src = (& $dyn 'site-logo' @{}); size = 'full' } }
  $cfg['Footer about'] = @{ paragraph = 'Artes: arredi contract. Progettazione, produzione e installazione di arredi su misura per uffici e workspace, negozi e retail, negozi food, bar e ristoranti, hotel e hospitality.' }
  $cfg['Titolo Azienda'] = @{ paragraph = 'Azienda' }; $cfg['Titolo Settori'] = @{ paragraph = 'Settori' }; $cfg['Titolo Risorse'] = @{ paragraph = 'Risorse' }; $cfg['Titolo Contatti'] = @{ paragraph = 'Contatti' }
  $cfg['Menu azienda'] = @{ menu = 'footer-azienda'; layout = 'vertical'; pointer = 'none'; dropdown = 'none' }
  $cfg['Menu settori'] = @{ menu = 'footer-settori'; layout = 'vertical'; pointer = 'none'; dropdown = 'none' }
  $cfg['Menu risorse'] = @{ menu = 'footer-risorse'; layout = 'vertical'; pointer = 'none'; dropdown = 'none' }
  $cfg['Footer contatti'] = @{ paragraph = 'Via —, Rende (CS)<br>T +39 0000 000 000<br>info@artesarredamenti.it' }
  $cfg['Footer CTA'] = @{ text = 'Richiedi un progetto'; link = (& $to $P.preventivo 'Richiedi un preventivo') }
  $cfg['Bottom copyright'] = @{ paragraph = '© 2026 Artes Arredamenti — P.IVA 00000000000' }
  $cfg['Bottom legale'] = @{ paragraph = 'Privacy · Cookie · MEPA' }

  $cls['Footer ARTES'] = @('site-footer'); $cls['Footer grid'] = @('footer-grid')
  foreach ($k in 'Col logo', 'Col Azienda', 'Col Settori', 'Col Risorse', 'Col contatti') { $cls[$k] = @('footer-col') }
  $cls['Footer logo'] = @('footer-logo'); $cls['Footer about'] = @('footer-about')
  foreach ($k in 'Titolo Azienda', 'Titolo Settori', 'Titolo Risorse', 'Titolo Contatti') { $cls[$k] = @('footer-title') }
  $cls['Footer contatti'] = @('footer-contact'); $cls['Footer CTA'] = @('footer-cta')
  $cls['Footer bottom'] = @('footer-bottom'); $cls['Bottom copyright'] = @('footer-bottom-item'); $cls['Bottom legale'] = @('footer-bottom-item')
  $sty['Footer CTA'] = 'border-radius: 0; background-color: transparent; justify-content: center; align-self: flex-start;'
  $sty['Footer bottom'] = 'width: 100%;'
}

$comp = [ordered]@{ post_id = $PostId; mode = 'replace_children'; parent_id = 'document'; xml_structure = $xml; element_config = $cfg; classes = $cls; style = $sty }
$comp | ConvertTo-Json -Depth 30 | Set-Content $Out -Encoding utf8
"ok $Which -> $Out"



