param([int]$PostId = 213, [string]$Out)
# Genera la composizione del template d'archivio delle realizzazioni (realizzazioni.html del mockup).
# Serve sia /realizzazioni/ sia le pagine dei settori (/settore/<slug>/): i filtri sono link ai settori.
$dyn = { param($n, $s) @{ name = $n; settings = $s } }
$to = { param($id, $label) @{ destination = @{ id = [int]$id; label = $label }; tag = 'a' } }
$cfg = [ordered]@{}; $cls = [ordered]@{}; $sty = [ordered]@{}
function Tag($t, $id, $inner = '') { "<$t configuration-id=`"$id`">$inner</$t>" }
$P = @{ contatti = 152; preventivo = 154 }

# --- Intestazione ------------------------------------------------------------
$bc = (Tag 'e-paragraph' 'BC Home') + (Tag 'e-paragraph' 'BC Sep') + (Tag 'e-paragraph' 'BC Corrente')
$titolo = Tag 'e-div-block' 'Titolo blocco' ((Tag 'e-paragraph' 'Eyebrow') + (Tag 'e-heading' 'Titolo archivio'))
$intro = Tag 'e-div-block' 'Archivio intro' ((Tag 'e-flexbox' 'Breadcrumb' $bc) + (Tag 'e-div-block' 'Riga titolo' ($titolo + (Tag 'e-paragraph' 'Lead'))))
$cfg['BC Home'] = @{ paragraph = 'Home'; link = @{ destination = '/'; tag = 'a' } }
$cfg['BC Sep'] = @{ paragraph = '/' }
$cfg['BC Corrente'] = @{ paragraph = 'Realizzazioni' }
$cfg['Eyebrow'] = @{ paragraph = 'Realizzazioni' }
$cfg['Titolo archivio'] = @{ tag = 'h1'; title = 'Progetti<br><strong>consegnati.</strong>' }
$cfg['Lead'] = @{ paragraph = "L'archivio dei cantieri seguiti da Artes, dal rilievo al collaudo. Filtra per settore per vedere i progetti più vicini al tuo." }
$cls['Archivio intro'] = @('page-intro'); $cls['Breadcrumb'] = @('breadcrumb'); $cls['BC Home'] = @('breadcrumb'); $cls['BC Sep'] = @('breadcrumb'); $cls['BC Corrente'] = @('breadcrumb', 'breadcrumb-current')
$cls['Riga titolo'] = @('page-intro-row'); $cls['Eyebrow'] = @('eyebrow'); $cls['Titolo archivio'] = @('page-title'); $cls['Lead'] = @('lead')
$sty['Breadcrumb'] = 'padding: 0; gap: 8px;'; $sty['Titolo blocco'] = 'padding: 0;'

# --- Filtri e griglia --------------------------------------------------------
$card = Tag 'e-collection-loop-item' 'Card' ((Tag 'e-image' 'Card immagine') + (Tag 'e-flexbox' 'Card meta' ((Tag 'e-div-block' 'Card testo' ((Tag 'e-paragraph' 'Card nome') + (Tag 'e-paragraph' 'Card luogo'))) + (Tag 'e-paragraph' 'Card settore'))))
$vuoto = Tag 'e-collection-loop-empty-state' 'Nessun risultato' (Tag 'e-paragraph' 'Nessun risultato testo')
$pag = Tag 'e-pagination' 'Paginazione' ((Tag 'e-pagination-prev' 'Pagina precedente' (Tag 'e-paragraph' 'Precedente testo')) + (Tag 'e-pagination-next' 'Pagina successiva' (Tag 'e-paragraph' 'Successiva testo')))
$loop = Tag 'e-collection-loop' 'Progetti loop' ((Tag 'e-collection-loop-layout' 'Progetti layout' $card) + $vuoto + $pag)
$corpo = Tag 'e-div-block' 'Archivio corpo' ((Tag 'e-flexbox' 'Filtri' (Tag 'nav-menu' 'Menu filtri')) + $loop)

$cfg['Menu filtri'] = @{ menu = 'filtri-realizzazioni'; layout = 'horizontal'; pointer = 'none'; dropdown = 'none' }
$cfg['Progetti loop'] = @{ query = @{ template_type = 'post'; source = 'current_query'; posts_per_page = 12 }; pagination = $true; pagination_type = 'prev_next'; pagination_load_type = 'page_reload'; empty_state = $true }
$cfg['Card immagine'] = @{ image = @{ src = (& $dyn 'post-featured-image' @{}); size = 'large' }; link = @{ destination = (& $dyn 'post-url' @{}); tag = 'a' } }
$cfg['Card nome'] = @{ paragraph = (& $dyn 'post-title' @{}); link = @{ destination = (& $dyn 'post-url' @{}); tag = 'a' } }
$cfg['Card luogo'] = @{ paragraph = (& $dyn 'jet-post-custom-field' @{ meta_field = 'localita' }) }
$cfg['Card settore'] = @{ paragraph = (& $dyn 'jet-term-field' @{ taxonomy = 'settore'; term_field = 'name' }) }
$cfg['Nessun risultato testo'] = @{ paragraph = 'Nessuna realizzazione pubblicata per questo settore.' }
$cfg['Precedente testo'] = @{ paragraph = '← Precedente' }
$cfg['Successiva testo'] = @{ paragraph = 'Successiva →' }
$cls['Archivio corpo'] = @('archivio-body'); $cls['Filtri'] = @('filtri'); $cls['Progetti layout'] = @('progetti-grid')
$cls['Card immagine'] = @('img-cover', 'progetto-img'); $cls['Card meta'] = @('progetto-meta'); $cls['Card nome'] = @('progetto-nome')
$cls['Card luogo'] = @('progetto-luogo'); $cls['Card settore'] = @('progetto-settore'); $cls['Nessun risultato testo'] = @('lead')
$cls['Paginazione'] = @('pag'); $cls['Pagina precedente'] = @('pag-btn'); $cls['Pagina successiva'] = @('pag-btn')
$sty['Filtri'] = 'padding: 0;'; $sty['Progetti loop'] = 'padding: 0;'; $sty['Progetti layout'] = 'padding: 0;'; $sty['Card'] = 'padding: 0;'
$sty['Card meta'] = 'padding-inline: 0; padding-bottom: 0;'; $sty['Card testo'] = 'padding: 0; width: auto;'

# --- Fascia finale -----------------------------------------------------------
$cta = Tag 'e-div-block' 'CTA band' ((Tag 'e-heading' 'CTA titolo') + (Tag 'e-flexbox' 'CTA azioni' ((Tag 'e-button' 'CTA preventivo') + (Tag 'e-button' 'CTA tecnico'))))
$cfg['CTA titolo'] = @{ tag = 'h2'; title = 'Un progetto simile<br>in programma?' }
$cfg['CTA preventivo'] = @{ text = 'Richiedi un preventivo'; link = (& $to $P.preventivo 'Richiedi un preventivo') }
$cfg['CTA tecnico'] = @{ text = 'Parla con un tecnico'; link = (& $to $P.contatti 'Contatti') }
$cls['CTA band'] = @('cta-band'); $cls['CTA titolo'] = @('cta-title'); $cls['CTA azioni'] = @('cta-actions')
$cls['CTA preventivo'] = @('btn', 'btn-red'); $cls['CTA tecnico'] = @('btn', 'btn-ghost')
$sty['CTA preventivo'] = 'border-radius: 0; border-width: 0;'; $sty['CTA tecnico'] = 'border-radius: 0; background-color: transparent;'

$comp = [ordered]@{ post_id = $PostId; mode = 'replace_children'; parent_id = 'document'; xml_structure = $intro + $corpo + $cta; element_config = $cfg; classes = $cls; style = $sty }
$comp | ConvertTo-Json -Depth 30 | Set-Content $Out -Encoding utf8
"ok archivio -> $Out ($($cfg.Count) config)"

