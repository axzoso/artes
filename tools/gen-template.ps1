param([int]$PostId = 138, [string]$Out)
# Genera la composizione del template singolo "realizzazione" (stessa struttura della scheda del mockup).
$dyn = { param($n, $s) @{ name = $n; settings = $s } }
$cfg = [ordered]@{}; $cls = [ordered]@{}; $sty = [ordered]@{}
$xml = New-Object System.Text.StringBuilder
function Tag($t, $id, $inner = '') { "<$t configuration-id=`"$id`">$inner</$t>" }

# --- 1. Intestazione --------------------------------------------------------
$bc = (Tag 'e-paragraph' 'BC Home') + (Tag 'e-paragraph' 'BC Sep 1') + (Tag 'e-paragraph' 'BC Realizzazioni') + (Tag 'e-paragraph' 'BC Sep 2') + (Tag 'e-paragraph' 'BC Corrente')
$titolo = (Tag 'e-div-block' 'Titolo blocco' ((Tag 'e-flexbox' 'Eyebrow riga' ((Tag 'e-paragraph' 'Eyebrow settore') + (Tag 'e-paragraph' 'Eyebrow ambito'))) + (Tag 'e-heading' 'Titolo scheda')))
$intro = Tag 'e-div-block' 'Scheda intro' ((Tag 'e-flexbox' 'Breadcrumb' $bc) + (Tag 'e-div-block' 'Riga titolo' ($titolo + (Tag 'e-paragraph' 'Introduzione'))))

$cfg['BC Home'] = @{ paragraph = 'Home'; link = @{ destination = '/'; tag = 'a' } }
$cfg['BC Sep 1'] = @{ paragraph = '/' }
$cfg['BC Realizzazioni'] = @{ paragraph = 'Realizzazioni'; link = @{ destination = '/realizzazioni/'; tag = 'a' } }
$cfg['BC Sep 2'] = @{ paragraph = '/' }
$cfg['BC Corrente'] = @{ paragraph = (& $dyn 'post-title' @{}) }
$cfg['Eyebrow settore'] = @{ paragraph = (& $dyn 'jet-term-field' @{ taxonomy = 'settore'; term_field = 'name' }) }
$cfg['Eyebrow ambito'] = @{ paragraph = (& $dyn 'jet-post-custom-field' @{ meta_field = 'sottotitolo_ambito'; before = '— ' }) }
$cfg['Titolo scheda'] = @{ tag = 'h1'; title = (& $dyn 'shortcode' @{ shortcode = '[artes_titolo]' }) }
$cfg['Introduzione'] = @{ paragraph = (& $dyn 'jet-post-custom-field' @{ meta_field = 'introduzione' }) }
foreach ($k in 'BC Home', 'BC Sep 1', 'BC Realizzazioni', 'BC Sep 2') { $cls[$k] = @('breadcrumb') }
$cls['Scheda intro'] = @('scheda-intro'); $cls['Breadcrumb'] = @('breadcrumb'); $cls['BC Corrente'] = @('breadcrumb', 'breadcrumb-current')
$cls['Riga titolo'] = @('scheda-title-row'); $cls['Eyebrow riga'] = @('eyebrow-row')
$cls['Eyebrow settore'] = @('eyebrow-inline'); $cls['Eyebrow ambito'] = @('eyebrow-inline')
$cls['Titolo scheda'] = @('scheda-title'); $cls['Introduzione'] = @('lead')
$sty['Breadcrumb'] = 'padding: 0; gap: 8px;'; $sty['Titolo blocco'] = 'padding: 0;'; $sty['Eyebrow riga'] = 'padding: 0;'

# --- 2. Immagine principale e galleria -------------------------------------
$galleria = Tag 'e-collection-loop' 'Galleria loop' (Tag 'e-collection-loop-layout' 'Galleria layout' (Tag 'e-collection-loop-item' 'Galleria item' (Tag 'e-image' 'Galleria immagine')))
$media = Tag 'e-div-block' 'Scheda media' ((Tag 'e-div-block' 'Hero wrap' (Tag 'e-image' 'Immagine principale')) + $galleria)
$cfg['Immagine principale'] = @{ image = @{ src = (& $dyn 'post-featured-image' @{}); size = 'full' } }
$cfg['Galleria loop'] = @{ query = @{ template_type = 'post'; source = 'realizzazione'; query_id = 'artes_galleria' } }
$cfg['Galleria immagine'] = @{ image = @{ src = (& $dyn 'jet-object-property-image' @{ custom_object_prop = 'ID' }); size = 'large' } }
$cls['Scheda media'] = @('scheda-media', 'bg-alt'); $cls['Immagine principale'] = @('img-cover', 'scheda-hero')
$cls['Galleria layout'] = @('gallery-grid'); $cls['Galleria immagine'] = @('img-cover', 'gallery-img')
$sty['Hero wrap'] = 'padding: 0;'; $sty['Galleria item'] = 'padding: 0;'; $sty['Galleria loop'] = 'padding: 0;'; $sty['Galleria layout'] = 'padding: 0;'

# --- 3. Dettagli tecnici e brand -------------------------------------------
$rows = @(
  @('Settore', 'Settore', $null), @('Cliente', 'Cliente', 'cliente'), @('Località', 'Localita', 'localita'),
  @('Superficie', 'Superficie', 'superficie'), @('Ambienti', 'Ambienti', 'ambienti'), @('Arredi', 'Arredi', 'arredi'),
  @('Servizi Artes', 'Servizi', 'servizi_artes'), @('Tempi', 'Tempi', 'tempi'), @('Progettista', 'Progettista', 'progettista')
)
$rowsXml = ''
foreach ($r in $rows) {
  $id = $r[1]
  $rowsXml += Tag 'e-div-block' "Riga $id" ((Tag 'e-paragraph' "Etichetta $id") + (Tag 'e-paragraph' "Valore $id"))
  $cfg["Etichetta $id"] = @{ paragraph = $r[0] }
  $cfg["Valore $id"] = if ($r[2]) { @{ paragraph = (& $dyn 'jet-post-custom-field' @{ meta_field = $r[2] }) } } else { @{ paragraph = (& $dyn 'shortcode' @{ shortcode = '[artes_settore_ambito]' }) } }
  $cls["Riga $id"] = @('spec'); $cls["Etichetta $id"] = @('spec-l'); $cls["Valore $id"] = @('spec-v')
  $sty["Riga $id"] = 'padding-inline: 0;'
}
$specs = Tag 'e-div-block' 'Pannello specifiche' ((Tag 'e-paragraph' 'Titolo specifiche') + (Tag 'e-div-block' 'Elenco specifiche' $rowsXml))
$brands = Tag 'e-div-block' 'Pannello brand' ((Tag 'e-paragraph' 'Titolo brand') + (Tag 'e-collection-loop' 'Brand loop' (Tag 'e-collection-loop-layout' 'Brand layout' (Tag 'e-collection-loop-item' 'Brand item' (Tag 'e-paragraph' 'Brand nome')))))
$cfg['Titolo specifiche'] = @{ paragraph = 'Dettagli tecnici' }
$cfg['Titolo brand'] = @{ paragraph = 'Brand partner coinvolti' }
$cfg['Brand loop'] = @{ query = @{ template_type = 'post'; source = 'brand'; query_id = 'artes_brand_collegati' } }
$cfg['Brand nome'] = @{ paragraph = (& $dyn 'post-title' @{}); link = @{ destination = (& $dyn 'post-url' @{}); tag = 'a' } }
$cls['Pannello specifiche'] = @('specs-panel'); $cls['Elenco specifiche'] = @('specs-list'); $cls['Titolo specifiche'] = @('eyebrow')
$cls['Pannello brand'] = @('brands-panel'); $cls['Titolo brand'] = @('eyebrow'); $cls['Brand layout'] = @('brands-mini'); $cls['Brand nome'] = @('brand-chip')
$cls['Dettagli e brand'] = @('scheda-specs')
$sty['Elenco specifiche'] = 'padding: 0;'; $sty['Brand item'] = 'padding: 0;'; $sty['Brand loop'] = 'padding: 0;'; $sty['Brand layout'] = 'padding: 0;'
$dettagli = Tag 'e-div-block' 'Dettagli e brand' ($specs + $brands)

# --- 4. Altre realizzazioni -------------------------------------------------
$head = Tag 'e-flexbox' 'Altre testa' ((Tag 'e-flexbox' 'Altre titolo riga' ((Tag 'e-heading' 'Altre titolo') + (Tag 'e-heading' 'Altre settore'))) + (Tag 'e-paragraph' 'Archivio link'))
$item = Tag 'e-collection-loop-item' 'Altre item' ((Tag 'e-image' 'Altre immagine') + (Tag 'e-flexbox' 'Altre meta' ((Tag 'e-paragraph' 'Altre nome') + (Tag 'e-paragraph' 'Altre settore voce'))))
$altre = Tag 'e-div-block' 'Altre realizzazioni' ($head + (Tag 'e-collection-loop' 'Altre loop' (Tag 'e-collection-loop-layout' 'Altre layout' $item)))
$cfg['Altre titolo'] = @{ tag = 'h2'; title = 'Altre realizzazioni' }
$cfg['Altre settore'] = @{ tag = 'h2'; title = (& $dyn 'jet-term-field' @{ taxonomy = 'settore'; term_field = 'name' }) }
$cfg['Archivio link'] = @{ paragraph = 'Archivio completo'; link = @{ destination = '/realizzazioni/'; tag = 'a' } }
$cfg['Altre loop'] = @{ query = @{ template_type = 'post'; source = 'realizzazione'; query_id = 'artes_altre_realizzazioni' } }
$cfg['Altre immagine'] = @{ image = @{ src = (& $dyn 'post-featured-image' @{}); size = 'large' }; link = @{ destination = (& $dyn 'post-url' @{}); tag = 'a' } }
$cfg['Altre nome'] = @{ paragraph = (& $dyn 'post-title' @{}); link = @{ destination = (& $dyn 'post-url' @{}); tag = 'a' } }
$cfg['Altre settore voce'] = @{ paragraph = (& $dyn 'jet-term-field' @{ taxonomy = 'settore'; term_field = 'name' }) }
$cls['Altre realizzazioni'] = @('correlate', 'bg-alt'); $cls['Altre titolo'] = @('correlate-title'); $cls['Altre settore'] = @('correlate-title')
$cls['Archivio link'] = @('link-rule'); $cls['Altre layout'] = @('correlate-grid'); $cls['Altre immagine'] = @('img-cover', 'correlate-img')
$cls['Altre meta'] = @('correlate-meta'); $cls['Altre nome'] = @('correlate-name'); $cls['Altre settore voce'] = @('correlate-sector'); $cls['Altre testa'] = @('section-head')
$sty['Altre testa'] = 'padding: 0;'; $sty['Altre titolo riga'] = 'padding: 0; gap: 14px; align-items: baseline; flex-wrap: wrap;'; $sty['Altre item'] = 'padding: 0;'; $sty['Altre loop'] = 'padding: 0;'; $sty['Altre layout'] = 'padding: 0;'; $sty['Altre meta'] = 'padding-inline: 0; padding-bottom: 0;'

# --- 5. Contatti (intro + modulo): stessa sezione delle pagine contatti e preventivo ----------------
. "$PSScriptRoot\lib-contatti.ps1"
$ct = New-ContattiSection -Prefix 'Ct' -ConProgetto
foreach ($e in $ct.cfg.GetEnumerator()) { $cfg[$e.Key] = $e.Value }
foreach ($e in $ct.cls.GetEnumerator()) { $cls[$e.Key] = $e.Value }
foreach ($e in $ct.sty.GetEnumerator()) { $sty[$e.Key] = $e.Value }

$comp = [ordered]@{
  post_id = $PostId; mode = 'replace_children'; parent_id = 'document'
  xml_structure = $intro + $media + $dettagli + $altre + $ct.xml
  element_config = $cfg; classes = $cls; style = $sty
}
$comp | ConvertTo-Json -Depth 30 | Set-Content $Out -Encoding utf8
"ok -> $Out ($($cfg.Count) config, $($cls.Count) classi)"




