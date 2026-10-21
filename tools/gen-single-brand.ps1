param([int]$PostId = 448, [string]$Out)
# Genera la composizione del template singolo "brand" (brand-pedrali.html del mockup).
# Dati disponibili nel modello: titolo, categoria, introduzione e progetti collegati (relazione). La parte
# fotografica e le specifiche del mockup (foto, certificazioni, categorie prodotto) non hanno campi: si
# aggiungono quando il cliente fornisce i contenuti dei singoli brand.
$dyn = { param($n, $s) @{ name = $n; settings = $s } }
$to = { param($id, $label) @{ destination = @{ id = [int]$id; label = $label }; tag = 'a' } }
$cfg = [ordered]@{}; $cls = [ordered]@{}; $sty = [ordered]@{}
function Tag($t, $id, $inner = '') { "<$t configuration-id=`"$id`">$inner</$t>" }
$P = @{ contatti = 152; preventivo = 154 }

# --- Intestazione ------------------------------------------------------------
$bc = (Tag 'e-paragraph' 'BC Home') + (Tag 'e-paragraph' 'BC Sep 1') + (Tag 'e-paragraph' 'BC Brand') + (Tag 'e-paragraph' 'BC Sep 2') + (Tag 'e-paragraph' 'BC Corrente')
$titolo = Tag 'e-div-block' 'Titolo blocco' ((Tag 'e-paragraph' 'Eyebrow') + (Tag 'e-heading' 'Titolo scheda'))
$intro = Tag 'e-div-block' 'Scheda intro' ((Tag 'e-flexbox' 'Breadcrumb' $bc) + (Tag 'e-div-block' 'Riga titolo' ($titolo + (Tag 'e-paragraph' 'Introduzione'))))
$cfg['BC Home'] = @{ paragraph = 'Home'; link = @{ destination = '/'; tag = 'a' } }
$cfg['BC Sep 1'] = @{ paragraph = '/' }
$cfg['BC Brand'] = @{ paragraph = 'Brand Partner'; link = @{ destination = '/brand-partner/'; tag = 'a' } }
$cfg['BC Sep 2'] = @{ paragraph = '/' }
$cfg['BC Corrente'] = @{ paragraph = (& $dyn 'post-title' @{}) }
$cfg['Eyebrow'] = @{ paragraph = (& $dyn 'jet-term-field' @{ taxonomy = 'categoria_brand'; term_field = 'name' }) }
$cfg['Titolo scheda'] = @{ tag = 'h1'; title = (& $dyn 'post-title' @{}) }
$cfg['Introduzione'] = @{ paragraph = (& $dyn 'jet-post-custom-field' @{ meta_field = 'introduzione' }) }
foreach ($k in 'BC Home', 'BC Sep 1', 'BC Brand', 'BC Sep 2') { $cls[$k] = @('breadcrumb') }
$cls['Scheda intro'] = @('scheda-intro'); $cls['Breadcrumb'] = @('breadcrumb'); $cls['BC Corrente'] = @('breadcrumb', 'breadcrumb-current')
$cls['Riga titolo'] = @('scheda-title-row'); $cls['Eyebrow'] = @('eyebrow'); $cls['Titolo scheda'] = @('scheda-title'); $cls['Introduzione'] = @('lead')
$sty['Breadcrumb'] = 'padding: 0; gap: 8px;'; $sty['Titolo blocco'] = 'padding: 0;'

# --- Progetti con il brand (la sezione si nasconde da sola senza progetti) -----------------------
$head = Tag 'e-flexbox' 'Altre testa' ((Tag 'e-flexbox' 'Altre titolo riga' ((Tag 'e-heading' 'Altre titolo') + (Tag 'e-heading' 'Altre brand'))) + (Tag 'e-paragraph' 'Archivio link'))
$item = Tag 'e-collection-loop-item' 'Altre item' ((Tag 'e-image' 'Altre immagine') + (Tag 'e-flexbox' 'Altre meta' ((Tag 'e-paragraph' 'Altre nome') + (Tag 'e-paragraph' 'Altre settore voce'))))
$altre = Tag 'e-div-block' 'Progetti con il brand' ($head + (Tag 'e-collection-loop' 'Altre loop' (Tag 'e-collection-loop-layout' 'Altre layout' $item)))
$cfg['Altre titolo'] = @{ tag = 'h2'; title = 'Progetti con' }
$cfg['Altre brand'] = @{ tag = 'h2'; title = (& $dyn 'post-title' @{}) }
$cfg['Archivio link'] = @{ paragraph = 'Tutti i brand'; link = @{ destination = '/brand-partner/'; tag = 'a' } }
$cfg['Altre loop'] = @{ query = @{ template_type = 'post'; source = 'realizzazione'; query_id = 'artes_progetti_brand' } }
$cfg['Altre immagine'] = @{ image = @{ src = (& $dyn 'post-featured-image' @{}); size = 'large' }; link = @{ destination = (& $dyn 'post-url' @{}); tag = 'a' } }
$cfg['Altre nome'] = @{ paragraph = (& $dyn 'post-title' @{}); link = @{ destination = (& $dyn 'post-url' @{}); tag = 'a' } }
$cfg['Altre settore voce'] = @{ paragraph = (& $dyn 'jet-term-field' @{ taxonomy = 'settore'; term_field = 'name' }) }
$cls['Progetti con il brand'] = @('correlate', 'bg-alt'); $cls['Altre titolo'] = @('correlate-title'); $cls['Altre brand'] = @('correlate-title')
$cls['Archivio link'] = @('link-rule'); $cls['Altre layout'] = @('correlate-grid'); $cls['Altre immagine'] = @('img-cover', 'correlate-img')
$cls['Altre meta'] = @('correlate-meta'); $cls['Altre nome'] = @('correlate-name'); $cls['Altre settore voce'] = @('correlate-sector'); $cls['Altre testa'] = @('section-head')
$sty['Altre testa'] = 'padding: 0;'; $sty['Altre titolo riga'] = 'padding: 0; gap: .3em; align-items: baseline; flex-wrap: wrap;'; $sty['Altre item'] = 'padding: 0;'; $sty['Altre loop'] = 'padding: 0;'; $sty['Altre layout'] = 'padding: 0;'; $sty['Altre meta'] = 'padding-inline: 0; padding-bottom: 0;'

# --- Fascia finale -----------------------------------------------------------
$cta = Tag 'e-div-block' 'CTA band' ((Tag 'e-heading' 'CTA titolo') + (Tag 'e-flexbox' 'CTA azioni' ((Tag 'e-button' 'CTA preventivo') + (Tag 'e-button' 'CTA tecnico'))))
$cfg['CTA titolo'] = @{ tag = 'h2'; title = 'Un progetto<br>con questo brand?' }
$cfg['CTA preventivo'] = @{ text = 'Richiedi un preventivo'; link = (& $to $P.preventivo 'Richiedi un preventivo') }
$cfg['CTA tecnico'] = @{ text = 'Parla con un tecnico'; link = (& $to $P.contatti 'Contatti') }
$cls['CTA band'] = @('cta-band'); $cls['CTA titolo'] = @('cta-title'); $cls['CTA azioni'] = @('cta-actions')
$cls['CTA preventivo'] = @('btn', 'btn-red'); $cls['CTA tecnico'] = @('btn', 'btn-ghost')
$sty['CTA preventivo'] = 'border-radius: 0; border-width: 0;'; $sty['CTA tecnico'] = 'border-radius: 0; background-color: transparent;'

$comp = [ordered]@{ post_id = $PostId; mode = 'replace_children'; parent_id = 'document'; xml_structure = $intro + $altre + $cta; element_config = $cfg; classes = $cls; style = $sty }
$comp | ConvertTo-Json -Depth 30 | Set-Content $Out -Encoding utf8
"ok singolo brand -> $Out ($($cfg.Count) config)"
