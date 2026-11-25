param([int]$PostId = 447, [string]$Out)
# Genera la composizione del template d'archivio dei brand (brand-partner.html del mockup).
# Serve sia /brand-partner/ sia le pagine delle categorie (/categoria-brand/<slug>/): i filtri sono link alle categorie.
$dyn = { param($n, $s) @{ name = $n; settings = $s } }
$to = { param($id, $label) @{ destination = @{ id = [int]$id; label = $label }; tag = 'a' } }
$cfg = [ordered]@{}; $cls = [ordered]@{}; $sty = [ordered]@{}
function Tag($t, $id, $inner = '') { "<$t configuration-id=`"$id`">$inner</$t>" }
$P = @{ contatti = 152; contract = 150 }

# --- Intestazione ------------------------------------------------------------
$bc = (Tag 'e-paragraph' 'BC Home') + (Tag 'e-paragraph' 'BC Sep') + (Tag 'e-paragraph' 'BC Corrente')
$titolo = Tag 'e-div-block' 'Titolo blocco' ((Tag 'e-paragraph' 'Eyebrow') + (Tag 'e-heading' 'Titolo archivio'))
$intro = Tag 'e-div-block' 'Archivio intro' ((Tag 'e-flexbox' 'Breadcrumb' $bc) + (Tag 'e-div-block' 'Riga titolo' ($titolo + (Tag 'e-paragraph' 'Lead'))))
$cfg['BC Home'] = @{ paragraph = 'Home'; link = @{ destination = '/'; tag = 'a' } }
$cfg['BC Sep'] = @{ paragraph = '/' }
$cfg['BC Corrente'] = @{ paragraph = 'Brand Partner' }
$cfg['Eyebrow'] = @{ paragraph = '40+ brand distribuiti' }
$cfg['Titolo archivio'] = @{ tag = 'h1'; title = 'I brand<br><strong>con cui costruiamo.</strong>' }
$cfg['Lead'] = @{ paragraph = 'Coordiniamo brand partner selezionati per ogni categoria di prodotto. Ogni brand è collegato ai progetti reali in cui è stato impiegato: filtra per categoria o apri una scheda per vedere dove è stato usato.' }
$cls['Archivio intro'] = @('page-intro'); $cls['Breadcrumb'] = @('breadcrumb'); $cls['BC Home'] = @('breadcrumb'); $cls['BC Sep'] = @('breadcrumb'); $cls['BC Corrente'] = @('breadcrumb', 'breadcrumb-current')
$cls['Riga titolo'] = @('page-intro-row'); $cls['Eyebrow'] = @('eyebrow'); $cls['Titolo archivio'] = @('page-title'); $cls['Lead'] = @('lead')
$sty['Breadcrumb'] = 'padding: 0; gap: 8px;'; $sty['Titolo blocco'] = 'padding: 0;'

# --- Filtri e griglia (su fondo alternato, come nel mockup) -------------------
$card = Tag 'e-collection-loop-item' 'Card' (Tag 'e-div-block' 'Card corpo' ((Tag 'e-paragraph' 'Card nome') + (Tag 'e-paragraph' 'Card categoria')))
$vuoto = Tag 'e-collection-loop-empty-state' 'Nessun risultato' (Tag 'e-paragraph' 'Nessun risultato testo')
$loop = Tag 'e-collection-loop' 'Brand loop' ((Tag 'e-collection-loop-layout' 'Brand layout' $card) + $vuoto)
$corpo = Tag 'e-div-block' 'Archivio corpo' ((Tag 'e-flexbox' 'Filtri' (Tag 'nav-menu' 'Menu filtri')) + $loop)

$cfg['Menu filtri'] = @{ menu = 'filtri-brand'; layout = 'horizontal'; pointer = 'none'; dropdown = 'none' }
$cfg['Brand loop'] = @{ query = @{ template_type = 'post'; source = 'current_query'; posts_per_page = 40 }; pagination = $false; empty_state = $true }
$cfg['Card corpo'] = @{ link = @{ destination = (& $dyn 'post-url' @{}); tag = 'a' } }
$cfg['Card nome'] = @{ paragraph = (& $dyn 'post-title' @{}) }
$cfg['Card categoria'] = @{ paragraph = (& $dyn 'jet-term-field' @{ taxonomy = 'categoria_brand'; term_field = 'name' }) }
$cfg['Nessun risultato testo'] = @{ paragraph = 'Nessun brand pubblicato per questa categoria.' }
$cls['Archivio corpo'] = @('archivio-body', 'bg-alt'); $cls['Filtri'] = @('filtri'); $cls['Brand layout'] = @('brand-lista')
$cls['Card corpo'] = @('brand-card'); $cls['Card nome'] = @('brand-card-n'); $cls['Card categoria'] = @('brand-card-c'); $cls['Nessun risultato testo'] = @('lead')
$sty['Filtri'] = 'padding: 0;'; $sty['Brand loop'] = 'padding: 0;'; $sty['Brand layout'] = 'padding: 0;'; $sty['Card'] = 'padding: 0;'

# --- Fascia finale -----------------------------------------------------------
$cta = Tag 'e-div-block' 'CTA band' ((Tag 'e-heading' 'CTA titolo') + (Tag 'e-flexbox' 'CTA azioni' ((Tag 'e-button' 'CTA contatti') + (Tag 'e-button' 'CTA contract'))))
$cfg['CTA titolo'] = @{ tag = 'h2'; title = 'Vuoi diventare<br>un brand partner?' }
$cfg['CTA contatti'] = @{ text = 'Contattaci'; link = (& $to $P.contatti 'Contatti') }
$cfg['CTA contract'] = @{ text = 'Scopri il processo contract'; link = (& $to $P.contract 'Contract') }
$cls['CTA band'] = @('cta-band'); $cls['CTA titolo'] = @('cta-title'); $cls['CTA azioni'] = @('cta-actions')
$cls['CTA contatti'] = @('btn', 'btn-red'); $cls['CTA contract'] = @('btn', 'btn-ghost')
$sty['CTA contatti'] = 'border-radius: 0; border-width: 0;'; $sty['CTA contract'] = 'border-radius: 0; background-color: transparent;'

$comp = [ordered]@{ post_id = $PostId; mode = 'replace_children'; parent_id = 'document'; xml_structure = $intro + $corpo + $cta; element_config = $cfg; classes = $cls; style = $sty }
$comp | ConvertTo-Json -Depth 30 | Set-Content $Out -Encoding utf8
"ok archivio brand -> $Out ($($cfg.Count) config)"
