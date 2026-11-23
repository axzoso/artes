'use strict';
// Ricostruzione in grafica rev2 delle 6 pagine attualmente in bozza su dev3:
//   - 152 Contatti             (/contatti/)             -> PUBBLICATA (publish) + modulo e-form funzionante
//   - 154 Richiedi preventivo  (/richiedi-preventivo/)  -> BOZZA (draft)       + modulo e-form preventivo completo
//   - 153 Area progettisti     (/area-progettisti/)     -> BOZZA (draft)
//   - 471 Prodotti             (/prodotti/)             -> BOZZA (draft)
//   - 472 MEPA                 (/mepa/)                 -> BOZZA (draft)
//   - 491 Cataloghi PDF        (/cataloghi/)            -> BOZZA (draft)
//
// Uso:
//   node tools/rev2/pagine-bozze-rev2.js --piano                  offline dry-run: converte le 6 pagine e verifica 0 errori/avvisi
//   node tools/rev2/pagine-bozze-rev2.js --esegui [--solo 152,..] salva backup in tools/out/rev2/bozze-rev2-revisions.json e scrive su dev3
//   node tools/rev2/pagine-bozze-rev2.js --stato                  sola lettura su dev3 (stato WP, _artes_rev2, SEO, HTTP)
//   node tools/rev2/pagine-bozze-rev2.js --rollback [file]        ripristina stato precedente da bozze-rev2-revisions.json
//
// VINCOLI:
//   - Pubblica SOLO Contatti (152); le altre 5 restano sempre in bozza (draft) e NON chiamano elementor-publish-document.
//   - NON tocca [Riserva] (539-541), allegati media, né WPML/EN.

const fs = require('fs');
const path = require('path');
const { parse, trova } = require('./html-parse');
const { converti } = require('./html2elementor');
const { connetti } = require('./mcp-client');

const root = path.resolve(__dirname, '..', '..');
const outDir = path.join(root, 'tools', 'out', 'rev2');
const FILE_REVISIONS = path.join(outDir, 'bozze-rev2-revisions.json');
const FILE_MEDIA = path.join(outDir, 'media-rev2.json');
const FILE_MEDIA_PAGINE = path.join(outDir, 'media-pagine.json');
const FILE_LEGALI = path.join(root, 'tools', 'contenuti-pagine-legali.json');

const DEV3 = 'https://dev3.minimalstudiodev.it';

// Dati reali Artes srl (mai segnaposto)
const ARTES = {
  ragioneSociale: 'Artes srl',
  indirizzo: 'Via A. Nervoso 1, 87036 Rende (CS)',
  telefono: '+39 0984 462039',
  telefonoHref: 'tel:+390984462039',
  email: 'info@artessrl.it',
  emailHref: 'mailto:info@artessrl.it',
  piva: '02343330789',
  privacyHref: '/privacy-policy/',
};

// I 5 settori rev2 (ordine canonico rev2, sempre con "e" e mai "&")
const SETTORI_REV2 = [
  'Arredo uffici e workspace',
  'Arredo negozi e retail',
  'Arredo bar e ristoranti',
  'Arredo negozi food',
  'Arredo hotel e hospitality',
];

// Motivi contatto compatibili con la preselezione ?motivo= in artes-core.php
const MOTIVI_CONTATTO = [
  'Informazioni generali',
  'Parlare con un tecnico',
  'Collaborazione per studi e progettisti',
  'Pubblica amministrazione e MEPA',
  'Assistenza su una fornitura',
  'Fornitori e partner',
  'Lavora con noi',
];

const PROFILI_PREVENTIVO = [
  'Azienda o attività commerciale',
  'Progettista o studio di architettura',
  'Pubblica amministrazione',
  'Impresa di costruzioni',
  'Privato',
];

const FORMATI_ALLEGATI = '.pdf,.dwg,.dxf,.jpg,.jpeg,.png';
const MAX_FILE_SIZE_MB = 10;
const MAX_FILES = 3;

// Classi stub rev2 dedicate alle 6 pagine (prefisso rev2- -> 0 avvisi in html2elementor.js, 0 collisioni con le 51 pagine pubblicate)
const CLASSI_STUB_BOZZE = [
  'rev2-surface-white',
  'rev2-grid-4',
  'rev2-form-wrap',
  'rev2-form-intro',
  'rev2-form-col',
  'rev2-contact-dl',
  'rev2-form',
  'rev2-form-group',
  'rev2-form-legend',
  'rev2-form-fields',
  'rev2-form-options',
  'rev2-form-field',
  'rev2-form-field-wide',
  'rev2-form-label',
  'rev2-form-control',
  'rev2-form-check',
  'rev2-form-final',
  'rev2-form-actions',
  'rev2-form-submit',
  'rev2-form-hint',
  'rev2-form-ok',
  'rev2-form-err',
];

// Percorsi pubblicati ammessi nei link (nessun link a bozze 153/154/471/472/491 né a #contatti né a progetti nel cestino)
const PERCORSI_PUBBLICATI = new Set([
  '/',
  '/contatti/',
  '/arredamento-ufficio/',
  '/arredo-negozi/',
  '/arredamento-bar-ristoranti/',
  '/arredo-negozi-food/',
  '/arredamento-hotel/',
  '/arredamento-su-misura/',
  '/contract/',
  '/chi-siamo/',
  '/realizzazioni/',
  '/realizzazioni/royal-hotel/',
  '/brand-partner/',
  '/privacy-policy/',
  '/cookie-policy/',
]);

const PAROLE_VIETATE = [
  /\baurea\b/i,
  /\bcapo\s+bianco\b/i,
  /\bluigiane\b/i,
  /\bfera\b/i,
  /\bmottura\b/i,
  /0000\s*000\s*000/i,
  /artesarredamenti\.it/i,
  /info@artes\.it/i,
  /Via\s*[—–-]\s*,/i,
  /PEC:\s*[—–-]/i,
  /\[[^\]]*da\s+inserire[^\]]*\]/i,
  /\[\.\.\.\]/,
];

// --- Costruttore nativo e-form Elementor Pro V4 (schema verificato su Elementor Pro 4.4.1 / lib-form.ps1) ---------
function escAttr(s) {
  return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

function buildFormPart({ prefix = 'Fm', nome, oggetto, gruppi, invia, privacyTesto, okTesto }) {
  const element_config = {};
  const classes = {};
  const tag = (elType, id, inner = '') => `<${elType} configuration-id="${escAttr(`${prefix} ${id}`)}">${inner}</${elType}>`;
  const key = (id) => `${prefix} ${id}`;

  let formInner = '';
  let gIdx = 0;

  for (const gr of gruppi) {
    gIdx++;
    let groupInner = '';
    if (gr.legenda) {
      const lid = `G${gIdx} Legenda`;
      groupInner += tag('e-heading', lid);
      element_config[key(lid)] = { tag: 'h3', title: gr.legenda };
      classes[key(lid)] = ['rev2-form-legend'];
    }

    let fieldsInner = '';
    for (const c of gr.campi) {
      const id = c.id;
      const ctrlId = `Campo ${id}`;
      const labelId = `Label ${id}`;
      const rowId = `Riga ${id}`;

      if (c.kind === 'check') {
        fieldsInner += tag('e-div-block', rowId, tag('e-form-checkbox', ctrlId) + tag('e-form-label', labelId));
        element_config[key(ctrlId)] = {
          _cssid: id,
          name: id,
          value: 'sì',
          required: Boolean(c.required),
          'has-default-value': false,
          checked: Boolean(c.checked),
        };
        element_config[key(labelId)] = { tag: 'label', text: c.label, 'input-id': id };
        classes[key(rowId)] = ['rev2-form-check'];
        continue;
      }

      const elType = {
        input: 'e-form-input',
        select: 'e-form-select',
        textarea: 'e-form-textarea',
        file: 'e-form-file-upload',
      }[c.kind];
      if (!elType) throw new Error(`Tipo campo modulo non supportato: ${c.kind}`);

      let inner = tag('e-form-label', labelId) + tag(elType, ctrlId);
      if (c.hint) {
        const hintId = `Hint ${id}`;
        inner += tag('e-paragraph', hintId);
        element_config[key(hintId)] = { paragraph: c.hint, tag: 'p' };
        classes[key(hintId)] = ['rev2-form-hint'];
      }

      fieldsInner += tag('e-div-block', rowId, inner);
      element_config[key(labelId)] = { tag: 'label', text: c.label, 'input-id': id };
      classes[key(labelId)] = ['rev2-form-label'];
      classes[key(rowId)] = c.wide ? ['rev2-form-field', 'rev2-form-field-wide'] : ['rev2-form-field'];

      if (c.kind === 'input') {
        const cfg = { type: c.type, required: Boolean(c.required), _cssid: id };
        if (c.autocomplete) cfg.autocomplete = c.autocomplete;
        if (c.placeholder) cfg.placeholder = c.placeholder;
        element_config[key(ctrlId)] = cfg;
        classes[key(ctrlId)] = ['rev2-form-control'];
      } else if (c.kind === 'select') {
        element_config[key(ctrlId)] = {
          _cssid: id,
          name: id,
          options: c.options.map((opt) => ({ key: opt, value: opt })),
          required: Boolean(c.required),
          'has-default-value': true,
          value: c.options[0],
        };
        classes[key(ctrlId)] = ['rev2-form-control'];
      } else if (c.kind === 'textarea') {
        const cfg = {
          rows: c.rows || 5,
          required: Boolean(c.required),
          resizable: 'vertical',
          _cssid: id,
        };
        if (c.placeholder) cfg.placeholder = c.placeholder;
        element_config[key(ctrlId)] = cfg;
        classes[key(ctrlId)] = ['rev2-form-control'];
      } else if (c.kind === 'file') {
        element_config[key(ctrlId)] = {
          'attachment-type': 'attach',
          'file-types': FORMATI_ALLEGATI,
          _cssid: id,
          'max-file-size': MAX_FILE_SIZE_MB,
          multiple: true,
          'max-files': MAX_FILES,
          required: false,
        };
      }
    }

    const contId = `G${gIdx} Contenuto`;
    groupInner += tag('e-div-block', contId, fieldsInner);
    classes[key(contId)] = gr.tipo === 'opzioni' ? ['rev2-form-options'] : ['rev2-form-fields'];

    const grpId = `G${gIdx}`;
    formInner += tag('e-div-block', grpId, groupInner);
    classes[key(grpId)] = ['rev2-form-group'];
  }

  // Gruppo finale: consenso privacy + azioni invio
  const privacyRow = tag(
    'e-div-block',
    'Riga privacy',
    tag('e-form-checkbox', 'Privacy') + tag('e-form-label', 'Privacy testo')
  );
  const actionsRow = tag(
    'e-div-block',
    'Azioni',
    tag('e-form-submit-button', 'Invia') + tag('e-paragraph', 'Obbligatori')
  );
  formInner += tag('e-div-block', 'Finale', privacyRow + actionsRow);

  element_config[key('Privacy')] = {
    _cssid: 'privacy',
    name: 'privacy',
    value: 'accetto',
    required: true,
    'has-default-value': false,
    checked: false,
  };
  element_config[key('Privacy testo')] = { tag: 'label', 'input-id': 'privacy', text: privacyTesto };
  element_config[key('Invia')] = { text: invia, tag: 'button' };
  element_config[key('Obbligatori')] = { paragraph: '* campi obbligatori', tag: 'p' };

  classes[key('Finale')] = ['rev2-form-group', 'rev2-form-final'];
  classes[key('Riga privacy')] = ['rev2-form-check'];
  classes[key('Azioni')] = ['rev2-form-actions'];
  classes[key('Invia')] = ['rev2-form-submit'];
  classes[key('Obbligatori')] = ['rev2-form-hint'];

  // Messaggi esito (Elementor Pro gestisce la visibilità nativa in risposta all'invio)
  formInner += tag('e-form-success-message', 'Esito ok', tag('e-paragraph', 'Esito ok testo'));
  formInner += tag('e-form-error-message', 'Esito errore', tag('e-paragraph', 'Esito errore testo'));

  element_config[key('Esito ok testo')] = { paragraph: okTesto, tag: 'p' };
  element_config[key('Esito errore testo')] = {
    paragraph: `Non siamo riusciti a inviare il modulo. Riprova fra poco o scrivici a ${ARTES.email}.`,
    tag: 'p',
  };
  classes[key('Esito ok')] = ['rev2-form-ok'];
  classes[key('Esito ok testo')] = ['lead'];
  classes[key('Esito errore')] = ['rev2-form-err'];
  classes[key('Esito errore testo')] = ['lead'];

  const xml = tag('e-form', 'Modulo', formInner);
  element_config[key('Modulo')] = {
    'form-name': nome,
    'actions-after-submit': ['email'],
    email: {
      to: [ARTES.email],
      subject: oggetto,
      message: '[all-fields]',
      'reply-to': '[email]',
      'send-as': 'html',
      'from-name': 'Sito ARTES',
    },
  };
  classes[key('Modulo')] = ['rev2-form'];

  const campiCount = (xml.match(/<[a-z0-9-]+(?:\s|>)/g) || []).length;
  return { xml, element_config, classes, campiCount };
}

function inserisciModuloNelSlot(composizione, slotCssId, moduloPart) {
  const slotEntry = Object.entries(composizione.element_config).find(([, cfg]) => cfg && cfg._cssid === slotCssId);
  if (!slotEntry) throw new Error(`Slot modulo "${slotCssId}" non trovato nella composizione.`);
  const [slotConfigId] = slotEntry;

  // Rimuove l'id provvisorio dallo slot nel DOM finale
  delete composizione.element_config[slotConfigId]._cssid;
  if (!Object.keys(composizione.element_config[slotConfigId]).length) {
    delete composizione.element_config[slotConfigId];
  }

  const target = `<e-div-block configuration-id="${escAttr(slotConfigId)}"></e-div-block>`;
  if (!composizione.xml_structure.includes(target)) {
    throw new Error(`Tag slot "${target}" non trovato in xml_structure.`);
  }
  composizione.xml_structure = composizione.xml_structure.replace(
    target,
    `<e-div-block configuration-id="${escAttr(slotConfigId)}">${moduloPart.xml}</e-div-block>`
  );

  for (const [k, v] of Object.entries(moduloPart.element_config)) {
    if (Object.prototype.hasOwnProperty.call(composizione.element_config, k)) {
      throw new Error(`Collisione element_config su chiave "${k}".`);
    }
    composizione.element_config[k] = v;
  }
  for (const [k, v] of Object.entries(moduloPart.classes)) {
    if (Object.prototype.hasOwnProperty.call(composizione.classes, k)) {
      throw new Error(`Collisione classes su chiave "${k}".`);
    }
    composizione.classes[k] = v;
  }
}

// --- Definizioni delle 6 pagine in grafica rev2 --------------------------------------------------------------------
function buildModuloContatti() {
  return buildFormPart({
    prefix: 'Fm',
    nome: 'Contatti',
    oggetto: 'Nuova richiesta di contatto dal sito ARTES',
    invia: 'Invia il messaggio',
    privacyTesto: `Ho letto l'<a href="${ARTES.privacyHref}" target="_blank">informativa privacy</a> e acconsento al trattamento dei dati per ricevere una risposta. *`,
    okTesto: 'Messaggio inviato. Grazie: ti rispondiamo entro due giorni lavorativi.',
    gruppi: [
      {
        legenda: null,
        tipo: 'campi',
        campi: [
          { id: 'nome', label: 'Nome e cognome *', kind: 'input', type: 'text', required: true, autocomplete: 'name' },
          { id: 'azienda', label: 'Azienda o ente', kind: 'input', type: 'text', autocomplete: 'organization' },
          { id: 'email', label: 'Email *', kind: 'input', type: 'email', required: true, autocomplete: 'email' },
          { id: 'telefono', label: 'Telefono', kind: 'input', type: 'tel', autocomplete: 'tel' },
          { id: 'motivo', label: 'Motivo del contatto', kind: 'select', options: MOTIVI_CONTATTO },
          {
            id: 'richiesta_settore',
            label: 'Settore',
            kind: 'select',
            options: ['Seleziona', ...SETTORI_REV2, 'Altro / più settori'],
          },
          {
            id: 'messaggio',
            label: 'Messaggio *',
            kind: 'textarea',
            required: true,
            wide: true,
            rows: 5,
            placeholder: 'Spazio da arredare, località, tempistiche o eventuale progetto già disponibile…',
          },
          {
            id: 'allegati',
            label: 'Allegati',
            kind: 'file',
            wide: true,
            hint: 'Planimetrie, capitolato o foto dello stato attuale. PDF, DWG, DXF, JPG, PNG (fino a 3 file, max 10 MB ciascuno).',
          },
        ],
      },
    ],
  });
}

function buildModuloPreventivo() {
  return buildFormPart({
    prefix: 'Fm',
    nome: 'Preventivo',
    oggetto: 'Nuova richiesta di preventivo dal sito ARTES',
    invia: 'Invia la richiesta',
    privacyTesto: `Ho letto l'<a href="${ARTES.privacyHref}" target="_blank">informativa privacy</a> e acconsento al trattamento dei dati per ricevere il preventivo. *`,
    okTesto: 'Richiesta inviata. Grazie: un tecnico Artes legge la richiesta e ti richiama entro due giorni lavorativi.',
    gruppi: [
      {
        legenda: 'Chi sei',
        tipo: 'campi',
        campi: [
          { id: 'nome', label: 'Nome e cognome *', kind: 'input', type: 'text', required: true, autocomplete: 'name' },
          { id: 'azienda', label: 'Azienda o ente', kind: 'input', type: 'text', autocomplete: 'organization' },
          { id: 'email', label: 'Email *', kind: 'input', type: 'email', required: true, autocomplete: 'email' },
          { id: 'telefono', label: 'Telefono *', kind: 'input', type: 'tel', required: true, autocomplete: 'tel' },
          { id: 'profilo', label: 'Profilo', kind: 'select', wide: true, options: PROFILI_PREVENTIVO },
        ],
      },
      {
        legenda: 'Il progetto',
        tipo: 'campi',
        campi: [
          {
            id: 'richiesta_settore',
            label: 'Settore *',
            kind: 'select',
            options: ['Seleziona', ...SETTORI_REV2, 'Altro / più settori'],
          },
          {
            id: 'intervento',
            label: 'Tipo di intervento',
            kind: 'select',
            options: [
              'Nuova apertura',
              'Ristrutturazione completa',
              'Rinnovo degli arredi',
              'Ampliamento',
              'Fornitura su capitolato',
            ],
          },
          {
            id: 'localita',
            label: 'Località del cantiere *',
            kind: 'input',
            type: 'text',
            required: true,
            placeholder: 'Città, provincia',
          },
          { id: 'superficie', label: 'Superficie indicativa', kind: 'input', type: 'text', placeholder: 'm²' },
          {
            id: 'tempi',
            label: 'Apertura o consegna prevista',
            kind: 'select',
            options: ['Da definire', 'Entro 3 mesi', 'Da 3 a 6 mesi', 'Da 6 a 12 mesi', 'Oltre 12 mesi'],
          },
          {
            id: 'budget',
            label: 'Budget indicativo',
            kind: 'select',
            options: ['Da definire', 'Fino a 25.000 €', '25.000 – 75.000 €', '75.000 – 150.000 €', 'Oltre 150.000 €'],
          },
          {
            id: 'stato',
            label: 'A che punto è il progetto?',
            kind: 'select',
            wide: true,
            options: [
              "È un'idea: serve anche la progettazione",
              "C'è un progettista, il disegno è in corso",
              'Il progetto esecutivo è pronto',
              'Ho un capitolato da quotare',
            ],
          },
        ],
      },
      {
        legenda: 'Cosa ti serve',
        tipo: 'opzioni',
        campi: [
          { id: 'servizio_rilievo', label: 'Rilievo e sopralluogo', kind: 'check', checked: true },
          { id: 'servizio_progettazione', label: 'Progettazione e render', kind: 'check' },
          { id: 'servizio_su_misura', label: 'Arredi su misura', kind: 'check', checked: true },
          { id: 'servizio_brand', label: 'Arredi e sedute di brand partner', kind: 'check' },
          { id: 'servizio_montaggio', label: 'Consegna e montaggio', kind: 'check', checked: true },
          { id: 'servizio_post_vendita', label: 'Assistenza e manutenzione', kind: 'check' },
        ],
      },
      {
        legenda: 'Dettagli',
        tipo: 'campi',
        campi: [
          {
            id: 'messaggio',
            label: 'Descrizione *',
            kind: 'textarea',
            required: true,
            wide: true,
            rows: 6,
            placeholder: 'Ambienti da arredare, numero di postazioni, coperti o camere, materiali o riferimenti che ti piacciono…',
          },
          {
            id: 'allegati',
            label: 'Allegati',
            kind: 'file',
            wide: true,
            hint: 'Planimetrie, capitolato, render o foto dello stato attuale. PDF, DWG, DXF, JPG, PNG (fino a 3 file, max 10 MB ciascuno).',
          },
          {
            id: 'fonte',
            label: 'Come ci hai conosciuto',
            kind: 'select',
            wide: true,
            options: [
              'Seleziona',
              'Ricerca su Google',
              'Passaparola',
              'Un progettista',
              'Social network',
              'MEPA / Acquisti in Rete PA',
              'Fiere ed eventi',
            ],
          },
        ],
      },
    ],
  });
}

function htmlContatti() {
  return `<main>
  <section class="page-intro">
    <div class="breadcrumb">
      <a href="/">Home</a> / <strong>Contatti</strong>
    </div>
    <div class="page-intro__row">
      <div>
        <div class="eyebrow">Contatti</div>
        <h1 class="page-title">Parliamo<br><strong>del tuo spazio.</strong></h1>
      </div>
      <p class="lead">Una domanda, un sopralluogo, una collaborazione su un progetto già avviato: scrivici o passa in sede. Ti risponde chi segue davvero il lavoro, non un centralino.</p>
    </div>
  </section>

  <section class="section section--tight rev2-surface-white">
    <div class="grid-1px rev2-grid-4">
      <div class="card">
        <div class="card__n">Sede e showroom</div>
        <div class="card__t">Rende (CS)</div>
        <div class="card__d">${ARTES.indirizzo}<br>Visite in showroom su appuntamento.</div>
      </div>
      <div class="card">
        <div class="card__n">Commerciale e ufficio tecnico</div>
        <div class="card__t"><a href="${ARTES.telefonoHref}">${ARTES.telefono}</a></div>
        <div class="card__d"><a href="${ARTES.emailHref}">${ARTES.email}</a><br>Richieste, sopralluoghi e assistenza.</div>
      </div>
      <div class="card">
        <div class="card__n">Pubblica amministrazione</div>
        <div class="card__t">Abilitati MEPA</div>
        <div class="card__d">Forniture su Acquisti in Rete PA per scuole, uffici pubblici ed enti. P.IVA ${ARTES.piva}.</div>
        <a href="/arredamento-ufficio/" class="link-rule link-rule--spaced">Arredo uffici e PA</a>
      </div>
      <div class="card card--dark">
        <div class="card__n">Progettisti e studi</div>
        <div class="card__t">Studi e architetti</div>
        <div class="card__d">Fattibilità, campionature, ingegnerizzazione e capitolati per chi progetta.</div>
        <a href="/contract/#interlocutori" class="link-rule link-rule--spaced">Collaborazione contract</a>
      </div>
    </div>
  </section>

  <section class="section rev2-form-wrap" id="scrivici">
    <div class="rev2-form-intro">
      <div class="eyebrow">Scrivici</div>
      <h2 class="h-section">Una domanda,<br>una risposta vera.</h2>
      <p class="lead">Rispondiamo entro due giorni lavorativi. Se hai già planimetrie o un capitolato da valutare, puoi allegarli direttamente dal modulo.</p>
      <dl class="rev2-contact-dl">
        <div><dt>Sede</dt><dd>${ARTES.indirizzo}</dd></div>
        <div><dt>Telefono</dt><dd><a href="${ARTES.telefonoHref}">T ${ARTES.telefono}</a></dd></div>
        <div><dt>Email</dt><dd><a href="${ARTES.emailHref}">${ARTES.email}</a></dd></div>
        <div><dt>Dati aziendali</dt><dd>${ARTES.ragioneSociale} — P.IVA ${ARTES.piva}</dd></div>
      </dl>
    </div>
    <div class="rev2-form-col" id="rev2-form-slot"></div>
  </section>
</main>`;
}

function htmlPreventivo() {
  return `<main>
  <section class="page-intro">
    <div class="breadcrumb">
      <a href="/">Home</a> / <strong>Richiedi un preventivo</strong>
    </div>
    <div class="page-intro__row">
      <div>
        <div class="eyebrow">Richiedi un preventivo</div>
        <h1 class="page-title">Un preventivo<br><strong>sul tuo progetto reale.</strong></h1>
      </div>
      <p class="lead">Più ci racconti dello spazio, più la prima risposta sarà concreta. Nessun listino generico: un tecnico legge la richiesta, ti richiama entro due giorni lavorativi e, se serve, fissa il sopralluogo.</p>
    </div>
  </section>

  <section class="section section--tight rev2-surface-white">
    <div class="grid-1px grid-1px--3">
      <div class="card">
        <div class="card__n">Entro 48 ore</div>
        <div class="card__t">Ti richiama un tecnico</div>
        <div class="card__d">Non un call center: la persona che segue il settore del tuo progetto, con le prime domande su spazi, tempi e vincoli.</div>
      </div>
      <div class="card">
        <div class="card__n">Sopralluogo</div>
        <div class="card__t">Rilievo in cantiere</div>
        <div class="card__d">Misure, quote impiantistiche e accessi verificati sul posto: il preventivo parte da dati reali, non da stime.</div>
      </div>
      <div class="card card--dark">
        <div class="card__n">Offerta</div>
        <div class="card__t">Un capitolato leggibile</div>
        <div class="card__d">Voci separate per produzione su misura, brand a catalogo, logistica e montaggio, con i tempi di consegna.</div>
      </div>
    </div>
  </section>

  <section class="section rev2-form-wrap" id="richiesta">
    <div class="rev2-form-intro">
      <div class="eyebrow">Il modulo</div>
      <h2 class="h-section">Raccontaci<br>il progetto.</h2>
      <p class="lead">Sono obbligatori solo i campi con l'asterisco. Se hai già planimetrie o un capitolato, allegali: accorciano i tempi della prima risposta.</p>
      <dl class="rev2-contact-dl">
        <div><dt>Sede</dt><dd>${ARTES.indirizzo}</dd></div>
        <div><dt>Preferisci parlarne?</dt><dd><a href="${ARTES.telefonoHref}">T ${ARTES.telefono}</a></dd></div>
        <div><dt>Email</dt><dd><a href="${ARTES.emailHref}">${ARTES.email}</a></dd></div>
        <div><dt>Dati aziendali</dt><dd>${ARTES.ragioneSociale} — P.IVA ${ARTES.piva}</dd></div>
        <div><dt>Solo una domanda</dt><dd><a href="/contatti/" class="link-rule">Scrivici dalla pagina contatti</a></dd></div>
      </dl>
    </div>
    <div class="rev2-form-col" id="rev2-form-slot"></div>
  </section>
</main>`;
}

function htmlAreaProgettisti() {
  return `<main>
  <section class="page-intro">
    <div class="breadcrumb">
      <a href="/">Home</a> / <strong>Area progettisti</strong>
    </div>
    <div class="page-intro__row">
      <div>
        <div class="eyebrow">Area progettisti</div>
        <h1 class="page-title">Il vostro disegno,<br><strong>la nostra officina.</strong></h1>
      </div>
      <p class="lead">Per architetti e studi che hanno già una commessa per un proprio cliente. Lo studio firma il progetto, Artes lo rende costruibile: verifichiamo la fattibilità, ingegnerizziamo il dettaglio, campioniamo i materiali e realizziamo l'arredo finito, senza riscrivere il disegno e senza scavalcare lo studio con la committenza.</p>
    </div>
  </section>

  <div class="page-band">
    <img src="assets/img/sfuse/las-jera.jpg" alt="Prodotti LAS">
  </div>

  <section class="section">
    <div class="section__head">
      <div>
        <div class="eyebrow">01 — Servizi per lo studio</div>
        <h2 class="h-section">Dal concept<br>al pezzo in cantiere.</h2>
      </div>
      <p class="lead">Entriamo nel progetto quando serve: dalla prima verifica di un dettaglio alla produzione completa di un cantiere. Ogni servizio si può chiedere anche da solo.</p>
    </div>
    <div class="grid-1px grid-1px--3">
      <div class="card">
        <div class="card__n">Fattibilità</div>
        <div class="card__t">Verifica tecnica del disegno</div>
        <div class="card__d">Spessori, luci, sbalzi, giunzioni e materiali controllati sul concept, prima che il progetto arrivi in capitolato.</div>
      </div>
      <div class="card">
        <div class="card__n">Ingegnerizzazione</div>
        <div class="card__t">Esecutivi di produzione</div>
        <div class="card__d">Il disegno dello studio diventa distinta materiali, esploso di montaggio e dettaglio costruttivo, da approvare in revisione.</div>
      </div>
      <div class="card">
        <div class="card__n">Campionature</div>
        <div class="card__t">Materiali e finiture reali</div>
        <div class="card__d">Campioni fisici di legni, laccati, lapidei, metalli e tessuti, anche da presentare al cliente dello studio.</div>
      </div>
      <div class="card">
        <div class="card__n">Preventivazione</div>
        <div class="card__t">Quotazione su capitolato</div>
        <div class="card__d">Computo su voci di capitolato, con varianti di materiale e alternative a catalogo per rientrare nel budget.</div>
      </div>
      <div class="card">
        <div class="card__n">Prototipi</div>
        <div class="card__t">Mock-up e campioni in scala 1:1</div>
        <div class="card__d">Una camera, una postazione, un tratto di bancone costruiti prima della serie, per decidere sul pezzo e non sul render.</div>
      </div>
      <div class="card card--dark">
        <div class="card__n">Cantiere</div>
        <div class="card__t">Produzione e posa</div>
        <div class="card__d">Falegnameria interna dal 1985, rete di partner e squadre di montaggio: lo studio segue la direzione artistica, noi tempi e cantiere.</div>
      </div>
    </div>
  </section>

  <section class="produzione">
    <div class="produzione__text">
      <div class="eyebrow">02 — Il ruolo dello studio</div>
      <h2 class="h-section">Il progetto<br>resta vostro.</h2>
      <p class="lead">Lavoriamo come officina dello studio, non come alternativa. Le regole sono semplici e valgono per ogni commessa.</p>
      <ul class="card__list">
        <li>Il rapporto con la committenza resta dello studio</li>
        <li>Nessuna variante al disegno senza l'approvazione del progettista</li>
        <li>Riservatezza sui progetti, anche prima dell'incarico</li>
        <li>Un referente tecnico dedicato allo studio, sempre lo stesso</li>
        <li>Il nome dello studio accompagna il progetto nelle nostre realizzazioni</li>
      </ul>
      <a href="/contract/" class="link-rule">Come funziona una commessa contract</a>
    </div>
    <div class="produzione__media">
      <img src="assets/img/progetti/royal/02.jpg" alt="Lounge hotel con arredi su misura">
    </div>
  </section>

  <section class="section">
    <div class="section__head">
      <div>
        <div class="eyebrow">03 — Risorse</div>
        <h2 class="h-section">Materiale<br>per chi progetta.</h2>
      </div>
      <p class="lead">Quello che serve per valutare Artes come partner di realizzazione: cosa produciamo, i marchi che coordiniamo e i cantieri già consegnati. Schede tecniche e file dei prodotti si richiedono al referente tecnico.</p>
    </div>
    <div class="grid-1px rev2-grid-4 grid-1px--hover">
      <a class="card" href="/contatti/?motivo=progettisti#scrivici">
        <div class="card__n">Documentazione</div>
        <div class="card__t">Schede tecniche e file</div>
        <div class="card__d">File 2D e 3D, certificazioni e schede dei prodotti, inviati dal referente tecnico su richiesta.</div>
      </a>
      <a class="card" href="/realizzazioni/">
        <div class="card__n">Realizzazioni</div>
        <div class="card__t">Cantieri consegnati</div>
        <div class="card__d">L'archivio completo dei progetti consegnati, filtrabile per settore e categoria.</div>
      </a>
      <a class="card" href="/brand-partner/">
        <div class="card__n">Brand partner</div>
        <div class="card__t">I marchi che coordiniamo</div>
        <div class="card__d">Sedute, acustica, pareti e sistemi per uffici, negozi, bar e ristoranti, negozi food e hotel.</div>
      </a>
      <a class="card" href="/arredamento-su-misura/">
        <div class="card__n">Falegnameria</div>
        <div class="card__t">Materiali e lavorazioni</div>
        <div class="card__d">Cosa produciamo in casa, cosa con la rete di partner e le finiture più richieste.</div>
      </a>
    </div>
  </section>

  <section class="section">
    <div class="scheda__specs scheda__specs--boxed">
      <div class="specs">
        <div class="eyebrow">04 — Come lavoriamo con gli studi</div>
        <dl class="specs__list">
          <div class="spec"><dt>Referente</dt><dd>Un tecnico dedicato allo studio per tutte le commesse</dd></div>
          <div class="spec"><dt>Fattibilità</dt><dd>Prima risposta tecnica entro 5 giorni lavorativi</dd></div>
          <div class="spec"><dt>Preventivo</dt><dd>Su capitolato, con voci separate e varianti di materiale</dd></div>
          <div class="spec"><dt>Campionature</dt><dd>Fisiche, spedite allo studio o presentate in showroom a Rende (CS)</dd></div>
          <div class="spec"><dt>Formati</dt><dd>DWG, DXF, PDF, modelli 3D su richiesta</dd></div>
          <div class="spec"><dt>Copertura</dt><dd>Calabria e tutto il territorio nazionale</dd></div>
        </dl>
      </div>
      <div class="finiture">
        <div class="eyebrow">Progetti con gli studi</div>
        <p class="lead lead--flush">Hotel, uffici e locali costruiti sul disegno di studi di progettazione: la scheda di ogni realizzazione riporta il progettista.</p>
        <div class="grid-1px grid-1px--2 grid-1px--hover">
          <a class="card" href="/realizzazioni/royal-hotel/">
            <div class="card__t">Royal Hotel</div>
            <div class="card__d">Arredo hotel e hospitality — Cosenza (Arch. Virginia Oriolo)</div>
          </a>
          <a class="card" href="/realizzazioni/">
            <div class="card__t">Tutte le realizzazioni</div>
            <div class="card__d">L'archivio completo, filtrabile per settore e categoria.</div>
          </a>
        </div>
      </div>
    </div>
  </section>

  <section class="cta-band cta-band--accent">
    <div>
      <h2>Un progetto<br>sul tavolo?</h2>
      <p>Inviateci disegni, planimetrie o capitolato: un referente tecnico Artes risponde entro due giorni lavorativi.</p>
    </div>
    <div class="cta-band__actions">
      <a href="/contatti/?motivo=progettisti#scrivici" class="btn btn--light">Invia il capitolato</a>
      <a href="/contatti/?motivo=tecnico#scrivici" class="btn btn--ghost">Parla con un tecnico</a>
    </div>
  </section>
</main>`;
}

function htmlProdotti() {
  return `<main>
  <section class="page-intro">
    <div class="breadcrumb">
      <a href="/">Home</a> / <strong>Prodotti</strong>
    </div>
    <div class="page-intro__row">
      <div>
        <div class="eyebrow">Prodotti</div>
        <h1 class="page-title">Prodotti scelti<br><strong>per il progetto.</strong></h1>
      </div>
      <p class="lead">Artes non ha un catalogo unico: seleziona, per ogni progetto, i prodotti dei brand partner e li affianca agli arredi su misura prodotti in falegnameria. Qui trovi le categorie e i brand con cui lavoriamo.</p>
    </div>
  </section>

  <section class="section">
    <div class="section__head">
      <div>
        <div class="eyebrow">01 — Categorie</div>
        <h2 class="h-section">Dai brand<br>alla falegnameria.</h2>
      </div>
      <p class="lead">Ogni categoria rimanda ai brand partner che la coprono, con le schede e le realizzazioni in cui sono stati impiegati.</p>
    </div>
    <div class="grid-1px rev2-grid-4 grid-1px--hover">
      <a class="card" href="/brand-partner/">
        <div class="card__n">Ufficio</div>
        <div class="card__t">Arredi per l'ufficio</div>
        <div class="card__d">Postazioni, scrivanie, sistemi operativi e complementi per uffici e spazi di lavoro.</div>
      </a>
      <a class="card" href="/brand-partner/">
        <div class="card__n">Sedute</div>
        <div class="card__t">Sedute e tavoli</div>
        <div class="card__d">Sedute operative, per attesa e per contract, con i tavoli che le accompagnano.</div>
      </a>
      <a class="card" href="/brand-partner/">
        <div class="card__n">Acustica</div>
        <div class="card__t">Comfort acustico</div>
        <div class="card__d">Pannelli e soluzioni per assorbire il rumore in open space, sale riunioni e ristoranti.</div>
      </a>
      <a class="card" href="/brand-partner/">
        <div class="card__n">Pareti e pod</div>
        <div class="card__t">Pareti e cabine</div>
        <div class="card__d">Pareti divisorie vetrate e cabine acustiche per dividere gli spazi senza opere murarie.</div>
      </a>
      <a class="card" href="/brand-partner/">
        <div class="card__n">Retail</div>
        <div class="card__t">Negozi</div>
        <div class="card__d">Sistemi espositivi e attrezzature modulari per negozi e showroom.</div>
      </a>
      <a class="card" href="/brand-partner/">
        <div class="card__n">Food</div>
        <div class="card__t">Attrezzature food</div>
        <div class="card__d">Attrezzature professionali per panetterie, pasticcerie, cucine e laboratori.</div>
      </a>
      <a class="card" href="/brand-partner/">
        <div class="card__n">Outdoor</div>
        <div class="card__t">Spazi esterni</div>
        <div class="card__d">Arredi per terrazze, dehors e aree esterne di bar, ristoranti e hotel.</div>
      </a>
      <a class="card card--dark" href="/arredamento-su-misura/">
        <div class="card__n">Su misura</div>
        <div class="card__t">Prodotto in falegnameria</div>
        <div class="card__d">Quando il catalogo non basta, l'arredo si progetta e si costruisce su misura nella nostra falegnameria.</div>
      </a>
    </div>
  </section>

  <section class="section">
    <div class="split">
      <div class="split__aside">
        <div class="eyebrow">02 — Come selezioniamo</div>
        <h2 class="h-section">Un solo interlocutore,<br>catalogo e misura.</h2>
      </div>
      <div class="prose">
        <p class="prose__lead">Ogni spazio professionale richiede l'equilibrio giusto fra sistemi industriali certificati e arredi costruiti sulle quote reali del cantiere.</p>
        <p>Coordiniamo 18 brand partner specializzati per uffici, retail, bar e ristoranti, negozi food e hotel, integrando le forniture a catalogo con banconi, boiserie, reception e arredi fissi della nostra falegnameria interna. Consegne, montaggio e assistenza restano sotto un'unica responsabilità.</p>
        <p>Esplora l'<a href="/brand-partner/">elenco dei brand partner</a>, scopri come lavora la nostra <a href="/arredamento-su-misura/">falegnameria su misura</a> oppure guarda le <a href="/realizzazioni/">realizzazioni consegnate</a>.</p>
      </div>
    </div>
  </section>

  <section class="cta-band cta-band--accent">
    <div>
      <h2>Cerchi un prodotto<br>per il tuo progetto?</h2>
      <p>Indica esigenze, settore e budget: selezioniamo le soluzioni dei brand partner e gli arredi su misura più adatti.</p>
    </div>
    <div class="cta-band__actions">
      <a href="/contatti/" class="btn btn--light">Richiedi un preventivo</a>
      <a href="/contatti/?motivo=tecnico#scrivici" class="btn btn--ghost">Parla con un tecnico</a>
    </div>
  </section>
</main>`;
}

function htmlMepa() {
  return `<main>
  <section class="page-intro">
    <div class="breadcrumb">
      <a href="/">Home</a> / <strong>MEPA / PA</strong>
    </div>
    <div class="page-intro__row">
      <div>
        <div class="eyebrow">MEPA · Acquisti in Rete PA</div>
        <h1 class="page-title">Arredi per gli<br><strong>enti pubblici.</strong></h1>
      </div>
      <p class="lead">Scuole, università, uffici ed enti pubblici hanno esigenze precise: capitolati, tempi certi, forniture documentate. Artes affianca le amministrazioni dalla definizione della fornitura alla consegna.</p>
    </div>
  </section>

  <section class="section">
    <div class="section__head">
      <div>
        <div class="eyebrow">01 — Come lavoriamo</div>
        <h2 class="h-section">Dal capitolato<br>alla consegna.</h2>
      </div>
      <p class="lead">Ogni fornitura è seguita da un referente tecnico, dalla definizione del capitolato fino al collaudo.</p>
    </div>
    <div class="grid-1px grid-1px--3">
      <div class="card">
        <div class="card__n">Fabbisogno</div>
        <div class="card__t">Analisi e capitolato</div>
        <div class="card__d">Aiutiamo l'ente a tradurre il fabbisogno in una fornitura chiara, coerente con il capitolato e le procedure di affidamento.</div>
      </div>
      <div class="card">
        <div class="card__n">Fornitura</div>
        <div class="card__t">Prodotti e arredi su misura</div>
        <div class="card__d">Prodotti dei brand partner e arredi su misura, corredati dalla documentazione tecnica richiesta (CAM e reazione al fuoco ove previsto).</div>
      </div>
      <div class="card card--dark">
        <div class="card__n">Cantiere</div>
        <div class="card__t">Consegna e montaggio</div>
        <div class="card__d">Consegna, montaggio e verifica finale, con tempi concordati e un referente tecnico unico fino al collaudo.</div>
      </div>
    </div>
  </section>

  <section class="section">
    <div class="split">
      <div class="split__aside">
        <div class="eyebrow">02 — Riferimenti PA</div>
        <h2 class="h-section">Forniture documentate<br>su Acquisti in Rete PA.</h2>
      </div>
      <div class="prose">
        <p class="prose__lead">${ARTES.ragioneSociale} è abilitata al Mercato Elettronico della Pubblica Amministrazione (MePA) e opera con enti pubblici, scuole, università, strutture sanitarie e uffici istituzionali.</p>
        <p>Selezioniamo arredi corredati dalle certificazioni richieste dai bandi, privilegiando soluzioni conformi ai Criteri Ambientali Minimi (CAM) e omologate in classe 1IM per gli imbottiti secondo i requisiti di ciascuna gara.</p>
        <p>Sede operativa: <strong>${ARTES.ragioneSociale}</strong>, ${ARTES.indirizzo}, P.IVA ${ARTES.piva} — tel. <a href="${ARTES.telefonoHref}">${ARTES.telefono}</a>, email <a href="${ARTES.emailHref}">${ARTES.email}</a>. Scopri le soluzioni per <a href="/arredamento-ufficio/">uffici, scuole ed enti pubblici</a> e guarda le <a href="/realizzazioni/?settore=uffici&amp;categoria=enti-e-istituzioni">realizzazioni per enti e istituzioni</a>.</p>
      </div>
    </div>
  </section>

  <section class="cta-band cta-band--accent">
    <div>
      <h2>Un progetto<br>per un ente pubblico?</h2>
      <p>Scrivici indicando l'ente, la tipologia di ambienti e il capitolato: il nostro ufficio gare e tecnica ti affianca fin dall'impostazione.</p>
    </div>
    <div class="cta-band__actions">
      <a href="/contatti/?motivo=pa#scrivici" class="btn btn--light">Richiedi un preventivo</a>
      <a href="/contatti/?motivo=tecnico#scrivici" class="btn btn--ghost">Parla con un tecnico</a>
    </div>
  </section>
</main>`;
}

function htmlCataloghi(legaliJson) {
  const c = legaliJson.cataloghi;
  const blocchi = [];
  for (const s of c.sezioni) {
    blocchi.push(`<h3>${s.h}</h3>`);
    for (const riga of s.b) {
      blocchi.push(`<p>${riga}</p>`);
    }
  }
  blocchi.push(
    `<p>Puoi scrivere a <a href="${ARTES.emailHref}">${ARTES.email}</a>, chiamare il <a href="${ARTES.telefonoHref}">${ARTES.telefono}</a> oppure inviare la richiesta dalla pagina <a href="/contatti/">Contatti</a> indicando il settore e i <a href="/brand-partner/">brand partner</a> di interesse.</p>`
  );

  return `<main>
  <section class="page-intro">
    <div class="breadcrumb">
      <a href="/">Home</a> / <strong>${c.corrente}</strong>
    </div>
    <div class="page-intro__row">
      <div>
        <div class="eyebrow">${c.eyebrow}</div>
        <h1 class="page-title">${c.h1}</h1>
      </div>
      <p class="lead">${c.lead}</p>
    </div>
  </section>

  <section class="section">
    <div class="split">
      <div class="split__aside">
        <div class="eyebrow">Documentazione</div>
        <h2 class="h-section">Cataloghi aggiornati<br>su misura del progetto.</h2>
      </div>
      <div class="prose">
        ${blocchi.join('\n        ')}
      </div>
    </div>
  </section>

  <section class="cta-band cta-band--accent">
    <div>
      <h2>${c.cta.titolo}</h2>
      <p>Indica il settore e i marchi che ti interessano: ti inviamo cataloghi aggiornati, schede tecniche e campionature.</p>
    </div>
    <div class="cta-band__actions">
      <a href="/contatti/" class="btn btn--light">Richiedi i cataloghi</a>
      <a href="/brand-partner/" class="btn btn--ghost">Vedi i brand partner</a>
    </div>
  </section>
</main>`;
}

const PAGINE_DEF = [
  {
    id: 152,
    slug: 'contatti',
    titolo: 'Contatti',
    targetStatus: 'publish',
    seoTitle: 'Contatti — Artes',
    seoDescription:
      'Contatta Artes srl a Rende (CS): sede e showroom in Via A. Nervoso 1, ufficio tecnico, preventivi e forniture MEPA per arredi contract su misura in Calabria e in Italia.',
    html: () => htmlContatti(),
    modulo: () => buildModuloContatti(),
  },
  {
    id: 154,
    slug: 'richiedi-preventivo',
    titolo: 'Richiedi un preventivo',
    targetStatus: 'draft',
    seoTitle: 'Richiedi un preventivo — Artes',
    seoDescription:
      'Richiedi un preventivo ad Artes srl per arredi contract su misura: uffici, negozi, bar e ristoranti, negozi food e hotel. Risposta di un tecnico entro due giorni lavorativi.',
    html: () => htmlPreventivo(),
    modulo: () => buildModuloPreventivo(),
  },
  {
    id: 153,
    slug: 'area-progettisti',
    titolo: 'Area progettisti',
    targetStatus: 'draft',
    seoTitle: 'Area progettisti — Artes',
    seoDescription:
      'Area progettisti Artes srl: per architetti e studi con commesse già acquisite. Fattibilità tecnica, ingegnerizzazione, campionature, preventivazione su capitolato e produzione su misura.',
    html: () => htmlAreaProgettisti(),
    modulo: null,
  },
  {
    id: 471,
    slug: 'prodotti',
    titolo: 'Prodotti',
    targetStatus: 'draft',
    seoTitle: 'Prodotti — Artes',
    seoDescription:
      'Categorie di prodotto e brand partner selezionati da Artes srl per ogni progetto contract, affiancati agli arredi su misura prodotti in falegnameria.',
    html: () => htmlProdotti(),
    modulo: null,
  },
  {
    id: 472,
    slug: 'mepa',
    titolo: 'MEPA / PA',
    targetStatus: 'draft',
    seoTitle: 'MEPA e Pubblica Amministrazione — Artes',
    seoDescription:
      'Arredi per la pubblica amministrazione su MEPA (Acquisti in Rete PA): Artes srl affianca scuole, università, uffici ed enti pubblici dal capitolato al collaudo.',
    html: () => htmlMepa(),
    modulo: null,
  },
  {
    id: 491,
    slug: 'cataloghi',
    titolo: 'Cataloghi PDF',
    targetStatus: 'draft',
    seoTitle: 'Cataloghi PDF e schede tecniche — Artes',
    seoDescription:
      'Cataloghi dei brand partner, schede tecniche e campionature dei materiali: Artes srl seleziona e invia la documentazione aggiornata in base al progetto.',
    html: (legaliJson) => htmlCataloghi(legaliJson),
    modulo: null,
  },
];

// --- Compilazione + verifica offline completa ----------------------------------------------------------------------
function validaHref(href, contesto, errori) {
  const h = String(href || '').trim();
  if (!h) {
    errori.push(`${contesto}: href vuoto`);
    return;
  }
  if (h === '#contatti' || h.includes('#contatti')) {
    errori.push(`${contesto}: link vietato verso #contatti (${h})`);
    return;
  }
  if (/^(mailto:|tel:)/i.test(h)) {
    if (h !== ARTES.emailHref && h !== ARTES.telefonoHref) {
      errori.push(`${contesto}: mailto/tel non allineato ai dati reali Artes srl (${h})`);
    }
    return;
  }
  if (h.startsWith('#')) return;
  const basePath = h.split(/[?#]/)[0];
  if (!PERCORSI_PUBBLICATI.has(basePath)) {
    errori.push(`${contesto}: link non in elenco percorsi rev2 pubblicati (${h})`);
  }
}

function compilaTutte(filtroSet = null) {
  const legaliJson = JSON.parse(fs.readFileSync(FILE_LEGALI, 'utf8'));
  const mediaRev2 = JSON.parse(fs.readFileSync(FILE_MEDIA, 'utf8'));
  const mediaPagine = fs.existsSync(FILE_MEDIA_PAGINE) ? JSON.parse(fs.readFileSync(FILE_MEDIA_PAGINE, 'utf8')) : {};
  const selezionate = filtroSet
    ? PAGINE_DEF.filter((p) => filtroSet.has(String(p.id)) || filtroSet.has(p.slug))
    : PAGINE_DEF;

  const risultati = [];
  const erroriGlobali = [];

  for (const def of selezionate) {
    const html = def.html(legaliJson);
    const errori = [];
    const { radice, avvisi: avvisiParser } = parse(html);
    for (const a of avvisiParser) errori.push(`parser: ${a}`);

    const main = trova(radice, (n) => n.tag === 'main')[0];
    if (!main) {
      errori.push('tag <main> mancante');
      risultati.push({ def, errori, avvisi: [], immagini: [], links: [], sezioni: 0, elementi: 0, classiUsate: [] });
      continue;
    }

    // Controllo link e immagini sull'HTML sorgente
    const links = trova(main, (n) => n.tag === 'a').map((a) => a.attr.href || '');
    for (const href of links) validaHref(href, `${def.slug} (${def.id})`, errori);

    const imgs = trova(main, (n) => n.tag === 'img').map((img) => ({
      src: img.attr.src || '',
      alt: img.attr.alt || '',
    }));
    const immaginiRisolte = [];
    for (const img of imgs) {
      const idCopia = mediaPagine[`${img.src}|${img.alt}`];
      const m = mediaRev2[img.src];
      if (!idCopia && !m) {
        errori.push(`immagine non presente in media-rev2.json: ${img.src}`);
      } else {
        immaginiRisolte.push({ src: img.src, alt: img.alt, attachmentId: idCopia || m.id });
      }
      if (!img.alt.trim()) errori.push(`immagine senza alt: ${img.src}`);
    }

    // Controllo parole vietate e segnaposto sull'HTML + SEO meta
    const testoDaControllare = `${html}\n${def.seoTitle}\n${def.seoDescription}`;
    for (const re of PAROLE_VIETATE) {
      const m = re.exec(testoDaControllare);
      if (m) errori.push(`contenuto vietato/segnaposto trovato: "${m[0]}"`);
    }

    // Conversione HTML -> Elementor tramite convertitore ufficiale rev2
    const conv = converti(main, {
      file: `${def.slug}.html`,
      soloFigli: true,
      radice: { classi: ['page-root'] },
    });
    for (const a of conv.avvisi) errori.push(`html2elementor: ${a}`);

    // Inserimento nativo e-form per Contatti (152) e Preventivo (154)
    let moduloInfo = null;
    if (def.modulo) {
      const moduloPart = def.modulo();
      inserisciModuloNelSlot(conv.composizione, 'rev2-form-slot', moduloPart);

      // Controllo link privacy e testo modulo
      const modJson = JSON.stringify(moduloPart.element_config);
      for (const re of PAROLE_VIETATE) {
        const m = re.exec(modJson);
        if (m) errori.push(`modulo contiene contenuto vietato/segnaposto: "${m[0]}"`);
      }
      const formCfg = Object.values(moduloPart.element_config).find((c) => c && c['form-name']);
      if (!formCfg) {
        errori.push('configurazione e-form mancante');
      } else {
        if (!formCfg.email || !Array.isArray(formCfg.email.to) || formCfg.email.to[0] !== ARTES.email) {
          errori.push(`destinatario email non impostato a ${ARTES.email}`);
        }
        if (formCfg.email['reply-to'] !== '[email]') {
          errori.push(`reply-to non impostato a [email]`);
        }
      }
      const selSettore = Object.values(moduloPart.element_config).find((c) => c && c._cssid === 'richiesta_settore');
      if (!selSettore) {
        errori.push('campo richiesta_settore mancante nel modulo');
      } else {
        const vals = selSettore.options.map((o) => o.value);
        for (const s of SETTORI_REV2) {
          if (!vals.includes(s)) errori.push(`settore rev2 mancante in richiesta_settore: ${s}`);
        }
        if (vals.some((v) => v.includes('&'))) errori.push('carattere "&" non ammesso nei settori rev2');
      }
      const privacyLbl = Object.values(moduloPart.element_config).find((c) => c && c['input-id'] === 'privacy');
      if (!privacyLbl || !String(privacyLbl.text || '').includes(ARTES.privacyHref)) {
        errori.push(`link privacy ${ARTES.privacyHref} mancante nel modulo`);
      }

      moduloInfo = {
        formName: formCfg ? formCfg['form-name'] : '?',
        destinatario: formCfg && formCfg.email ? formCfg.email.to.join(', ') : '?',
        replyTo: formCfg && formCfg.email ? formCfg.email['reply-to'] : '?',
        elementiModulo: moduloPart.campiCount,
      };
    }

    const classiUsate = [...new Set(Object.values(conv.composizione.classes).flat())].sort();
    const sezioni = main.figli.filter((f) => f.tipo === 'el' && (f.tag === 'section' || f.tag === 'div')).length;
    const elementiTotali = conv.elementi + (moduloInfo ? moduloInfo.elementiModulo : 0);

    if (errori.length) erroriGlobali.push(...errori.map((e) => `${def.slug} (${def.id}): ${e}`));
    risultati.push({
      def,
      composizione: conv.composizione,
      avvisi: conv.avvisi,
      errori,
      immagini: immaginiRisolte,
      links,
      sezioni,
      elementi: elementiTotali,
      moduloInfo,
      classiUsate,
    });
  }

  return { risultati, erroriGlobali };
}

// --- Utility PHP sicura via base64 ---------------------------------------------------------------------------------
async function phpConDati(nv, codicePhp, dati = {}) {
  const b64 = Buffer.from(JSON.stringify(dati), 'utf8').toString('base64');
  return nv.php(`$D = json_decode(base64_decode('${b64}'), true);\n${codicePhp}`);
}

// --- Modalità --piano (OFFLINE, zero scritture e zero rete) --------------------------------------------------------
function eseguiPiano(filtroSet) {
  const { risultati, erroriGlobali } = compilaTutte(filtroSet);
  const classiRev2Nuove = new Set();

  console.log('=== PIANO RICOSTRUZIONE 6 PAGINE IN BOZZA -> GRAFICA REV2 (OFFLINE) ===\n');
  for (const r of risultati) {
    const d = r.def;
    for (const c of r.classiUsate) {
      if (CLASSI_STUB_BOZZE.includes(c)) classiRev2Nuove.add(c);
    }
    const modStr = r.moduloInfo
      ? `e-form "${r.moduloInfo.formName}" (to=${r.moduloInfo.destinatario}, reply-to=${r.moduloInfo.replyTo})`
      : 'nessun modulo';
    const imgStr = r.immagini.length
      ? r.immagini.map((i) => `${i.src}#${i.attachmentId}`).join(', ')
      : 'nessuna';
    console.log(
      `[${d.targetStatus.toUpperCase().padEnd(7)}] ${String(d.id).padEnd(4)} /${d.slug}/  (${r.sezioni} sezioni, ${r.elementi} el, ${r.links.length} link, ${r.avvisi.length} avvisi)`
    );
    console.log(`          Modulo:   ${modStr}`);
    console.log(`          Immagini: ${imgStr}`);
    console.log(`          SEO T:    ${d.seoTitle}`);
    console.log(`          SEO D:    ${d.seoDescription}`);
    if (r.errori.length) {
      for (const e of r.errori) console.log(`          ! ERRORE: ${e}`);
    }
  }

  console.log(`\nClassi stub rev2 dedicate usate (${classiRev2Nuove.size}): ${[...classiRev2Nuove].sort().join(', ')}`);
  console.log(`Pubblicazioni previste: SOLO 152 (Contatti) -> publish; le altre 5 (154, 153, 471, 472, 491) -> draft.`);
  console.log(`Backup/undo sarà salvato in: ${path.relative(root, FILE_REVISIONS)}`);

  if (erroriGlobali.length) {
    console.error(`\nFALLITO: ${erroriGlobali.length} errori rilevati.`);
    process.exit(1);
  }
  console.log('\nESITO --piano: OK (0 errori, 0 avvisi di conversione, 0 link rotti/bozze, 0 segnaposto, 0 riferimenti Aurea/Mottura).');
}

// --- Modalità --esegui ---------------------------------------------------------------------------------------------
async function eseguiScrittura(filtroSet) {
  const { risultati, erroriGlobali } = compilaTutte(filtroSet);
  if (erroriGlobali.length) {
    console.error('BLOCCO: errori di validazione locale, nessuna scrittura su dev3:');
    erroriGlobali.forEach((e) => console.error('  - ' + e));
    process.exit(1);
  }

  fs.mkdirSync(outDir, { recursive: true });
  const el = await connetti('elementor');
  const nv = await connetti('novamira');

  const rev = fs.existsSync(FILE_REVISIONS)
    ? JSON.parse(fs.readFileSync(FILE_REVISIONS, 'utf8'))
    : { creato_il: new Date().toISOString(), classi_stub_create: [], pagine: {} };

  // 1. Backup stato corrente delle pagine target su dev3 (preserva prima_* su riesecuzioni)
  const targetIds = risultati.map((r) => r.def.id);
  const statoPrima = await phpConDati(
    nv,
    String.raw`
    $out = [];
    foreach ($D['ids'] as $id) {
      $id = (int) $id;
      $p = get_post($id);
      if (!$p) { $out[$id] = ['trovato' => false]; continue; }
      $prev_autosave = '';
      $av_list = get_posts([
        'post_type' => 'revision',
        'post_parent' => $id,
        'post_status' => 'inherit',
        'orderby' => 'modified',
        'order' => 'DESC',
        'numberposts' => 3,
        'suppress_filters' => true,
      ]);
      foreach ($av_list as $av) {
        if (strpos($av->post_name, '-autosave') !== false) {
          $prev_autosave = (string) $av->post_modified_gmt;
          break;
        }
      }
      $out[$id] = [
        'trovato' => true,
        'post_name' => $p->post_name,
        'post_title' => $p->post_title,
        'post_status' => $p->post_status,
        'prev_autosave_modified_gmt' => $prev_autosave,
        'has_elementor_data' => metadata_exists('post', $id, '_elementor_data'),
        'elementor_data' => get_post_meta($id, '_elementor_data', true),
        'has_page_settings' => metadata_exists('post', $id, '_elementor_page_settings'),
        'page_settings' => get_post_meta($id, '_elementor_page_settings', true),
        'has_rev2' => metadata_exists('post', $id, '_artes_rev2'),
        'artes_rev2' => get_post_meta($id, '_artes_rev2', true),
        'has_seo_title' => metadata_exists('post', $id, '_artes_seo_title'),
        'seo_title' => get_post_meta($id, '_artes_seo_title', true),
        'has_seo_desc' => metadata_exists('post', $id, '_artes_seo_description'),
        'seo_desc' => get_post_meta($id, '_artes_seo_description', true),
      ];
    }
    return $out;
    `,
    { ids: targetIds }
  );

  for (const r of risultati) {
    const id = r.def.id;
    if (!statoPrima[id] || !statoPrima[id].trovato) {
      throw new Error(`Pagina ${id} (${r.def.slug}) non trovata su dev3.`);
    }
    if (!rev.pagine[id]) {
      rev.pagine[id] = {
        slug: r.def.slug,
        target_status: r.def.targetStatus,
        prima: statoPrima[id],
        prima_undo_revision_id: null,
        ultimo_undo_revision_id: null,
      };
    }
  }

  // 2. Assicura l'esistenza nel Kit attivo delle sole classi stub rev2-* usate dalle 6 pagine
  const stubNecessarie = [...new Set(risultati.flatMap((r) => r.classiUsate).filter((c) => CLASSI_STUB_BOZZE.includes(c)))];
  const labelsPrima = await nv.php(
    `return get_post_meta((int) get_option('elementor_active_kit'), '_elementor_global_classes_labels', true) ?: [];`
  );
  const presentiSet = new Set(Object.values(labelsPrima || {}));
  const mancanti = stubNecessarie.filter((c) => !presentiSet.has(c));

  if (mancanti.length) {
    for (let i = 0; i < mancanti.length; i += 25) {
      const lotto = mancanti.slice(i, i + 25);
      const cr = await el.callJson('elementor-manage-classes', {
        operations: lotto.map((label) => ({ action: 'create', label, css: '--a: 0;' })),
      });
      if (cr.errors && cr.errors.length) {
        throw new Error(`Creazione classi stub fallita: ${JSON.stringify(cr.errors)}`);
      }
    }
    const labelsDopo = await nv.php(
      `return get_post_meta((int) get_option('elementor_active_kit'), '_elementor_global_classes_labels', true) ?: [];`
    );
    const idByLabel = new Map(Object.entries(labelsDopo || {}).map(([cid, lbl]) => [String(lbl), cid]));
    for (const lbl of mancanti) {
      const cid = idByLabel.get(lbl);
      if (!cid) throw new Error(`Classe stub "${lbl}" non trovata nel kit dopo la creazione.`);
      if (!rev.classi_stub_create.some((x) => x.id === cid)) {
        rev.classi_stub_create.push({ id: cid, label: lbl });
      }
    }
    console.log(`Classi stub rev2 create nel Kit attivo: ${mancanti.length} (${mancanti.join(', ')})`);
  } else {
    console.log(`Classi stub rev2 già presenti nel Kit attivo (${stubNecessarie.length}/${stubNecessarie.length}).`);
  }

  fs.writeFileSync(FILE_REVISIONS, JSON.stringify(rev, null, 2));

  // 3. Costruzione di ciascuna delle 6 pagine
  for (const r of risultati) {
    const d = r.def;
    await el.callJson('elementor-update-page-settings', {
      post_id: d.id,
      settings: { template: 'elementor_header_footer' },
    });

    const res = await el.callJson('elementor-build-composition', {
      post_id: d.id,
      mode: 'replace_children',
      parent_id: 'document',
      ...r.composizione,
    });
    if (res.errors && res.errors.length) {
      throw new Error(`Composizione fallita su ${d.slug} (${d.id}): ${JSON.stringify(res.errors)}`);
    }

    if (!rev.pagine[d.id].prima_undo_revision_id) {
      rev.pagine[d.id].prima_undo_revision_id = res.undo_revision_id || null;
    }
    rev.pagine[d.id].ultimo_undo_revision_id = res.undo_revision_id || null;

    if (d.targetStatus === 'publish') {
      // SOLO 152 Contatti: pubblica il documento Elementor e imposta post_status = publish
      await el.call('elementor-publish-document', { post_id: d.id });
    }

    // Finalizzazione WP/Elementor via Novamira:
    //  - su 152 (publish): verifica/forza publish + sanitizza eventuali &amp; / &#039; nei select DOPO publish
    //  - sulle 5 bozze (draft): MAI publish; se Elementor ha scritto in autosave, sincronizza _elementor_data sulla bozza
    //    mantenendo post_status = 'draft' (così anteprima e editor mostrano subito la rev2) + sanitizza &#039; nei select
    const esitoPhp = await phpConDati(
      nv,
      String.raw`
      $id = (int) $D['id'];
      $target = (string) $D['targetStatus'];
      $synced_autosave = false;

      if ($target === 'draft') {
        // Sincronizza eventuale autosave creato/aggiornato da questo build sulla bozza senza mai pubblicare
        $parent_post = get_post($id);
        $parent_ts = $parent_post ? strtotime((string) $parent_post->post_modified_gmt) : 0;
        $prev_av_gmt = (string) ($D['prevAutosaveModifiedGmt'] ?? '');
        $autosaves = get_posts([
          'post_type' => 'revision',
          'post_parent' => $id,
          'post_status' => 'inherit',
          'orderby' => 'modified',
          'order' => 'DESC',
          'numberposts' => 3,
          'suppress_filters' => true,
        ]);
        foreach ($autosaves as $av) {
          if (strpos($av->post_name, '-autosave') === false) { continue; }
          $av_gmt = (string) $av->post_modified_gmt;
          $av_ts = strtotime($av_gmt);
          if ($av_gmt === $prev_av_gmt || $av_ts < $parent_ts) { break; }
          $av_data = get_post_meta($av->ID, '_elementor_data', true);
          $cur_data = get_post_meta($id, '_elementor_data', true);
          if (is_string($av_data) && $av_data !== '' && $av_data !== $cur_data) {
            update_post_meta($id, '_elementor_data', wp_slash($av_data));
            $av_ps = get_post_meta($av->ID, '_elementor_page_settings', true);
            if (!empty($av_ps)) {
              update_post_meta($id, '_elementor_page_settings', $av_ps);
            }
            $synced_autosave = true;
          }
          break;
        }
        if (get_post_status($id) !== 'draft') {
          wp_update_post(['ID' => $id, 'post_status' => 'draft']);
        }
      } else {
        if (get_post_status($id) !== 'publish') {
          wp_update_post(['ID' => $id, 'post_status' => 'publish']);
        }
      }

      // Fix apostrofi/ampersand doppi sui widget e-form-select (docs/wp-stato-dev3.md §7)
      $raw = get_post_meta($id, '_elementor_data', true);
      $fixed_amp = 0;
      $fixed_apos = 0;
      if (is_string($raw) && $raw !== '') {
        $new = preg_replace('/&(amp;){2,}/', '&amp;', $raw, -1, $fixed_amp);
        $new = str_replace('&#039;', "'", $new, $fixed_apos);
        if ($fixed_amp || $fixed_apos) {
          update_post_meta($id, '_elementor_data', wp_slash($new));
        }
      }

      update_post_meta($id, '_artes_rev2', '1');
      update_post_meta($id, '_artes_seo_title', wp_slash($D['seoTitle']));
      update_post_meta($id, '_artes_seo_description', wp_slash($D['seoDescription']));
      delete_post_meta($id, '_elementor_css');

      return [
        'status' => get_post_status($id),
        'rev2' => get_post_meta($id, '_artes_rev2', true),
        'seo_title_ok' => (get_post_meta($id, '_artes_seo_title', true) === $D['seoTitle']),
        'seo_desc_ok' => (get_post_meta($id, '_artes_seo_description', true) === $D['seoDescription']),
        'synced_autosave' => $synced_autosave,
        'fixed_amp' => $fixed_amp,
        'fixed_apos' => $fixed_apos,
        'data_len' => strlen((string) get_post_meta($id, '_elementor_data', true)),
      ];
      `,
      {
        id: d.id,
        targetStatus: d.targetStatus,
        seoTitle: d.seoTitle,
        seoDescription: d.seoDescription,
        prevAutosaveModifiedGmt: (statoPrima[d.id] && statoPrima[d.id].prev_autosave_modified_gmt) || '',
      }
    );

    if (esitoPhp.status !== d.targetStatus) {
      throw new Error(`GUARDIA STATUS VIOLATA su ${d.id}: atteso ${d.targetStatus}, trovato ${esitoPhp.status}`);
    }

    console.log(
      `OK  ${String(d.id).padEnd(4)} ${d.slug.padEnd(20)} status=${esitoPhp.status.padEnd(7)} rev2=${esitoPhp.rev2} seo=${esitoPhp.seo_title_ok && esitoPhp.seo_desc_ok ? 'OK' : 'ERR'} el=${r.elementi} fix(amp=${esitoPhp.fixed_amp},apos=${esitoPhp.fixed_apos}) autosaveSync=${esitoPhp.synced_autosave}`
    );
  }

  rev.ultimo_aggiornamento = new Date().toISOString();
  fs.writeFileSync(FILE_REVISIONS, JSON.stringify(rev, null, 2));

  // 4. Svuota cache Elementor e WordPress
  await el.call('elementor-clear-cache', {});
  await nv.php(`if (class_exists('\\Elementor\\Plugin')) { \\Elementor\\Plugin::$instance->files_manager->clear_cache(); } wp_cache_flush(); return true;`);
  console.log(`\nBackup/revisioni salvati in ${path.relative(root, FILE_REVISIONS)}. Cache Elementor e WP svuotate.`);
}

// --- Modalità --stato (sola lettura su dev3) -----------------------------------------------------------------------
async function eseguiStato() {
  const nv = await connetti('novamira');
  const ids = PAGINE_DEF.map((p) => p.id);
  const rows = await phpConDati(
    nv,
    String.raw`
    $out = [];
    foreach ($D['ids'] as $id) {
      $p = get_post((int) $id);
      $out[] = [
        'id' => (int) $id,
        'slug' => $p ? $p->post_name : '(assente)',
        'status' => $p ? $p->post_status : '(assente)',
        'rev2' => get_post_meta((int) $id, '_artes_rev2', true),
        'seo_title' => get_post_meta((int) $id, '_artes_seo_title', true),
        'seo_desc' => get_post_meta((int) $id, '_artes_seo_description', true),
        'data_len' => strlen((string) get_post_meta((int) $id, '_elementor_data', true)),
      ];
    }
    return $out;
    `,
    { ids }
  );

  for (const x of rows) {
    const def = PAGINE_DEF.find((p) => p.id === x.id);
    const resp = await fetch(`${DEV3}/${x.slug}/`, { redirect: 'manual' });
    const attesoHttp = def.targetStatus === 'publish' ? 200 : 404;
    console.log(
      `${String(x.id).padEnd(4)} | /${x.slug}/`.padEnd(32) +
        `| status=${x.status.padEnd(7)} (atteso ${def.targetStatus.padEnd(7)}) | rev2=${x.rev2 || '0'} | SEO=${x.seo_title && x.seo_desc ? 'OK' : 'NO'} | data=${String(x.data_len).padStart(6)}B | HTTP ${resp.status} (atteso ${attesoHttp})`
    );
  }
}

// --- Modalità --rollback -------------------------------------------------------------------------------------------
async function eseguiRollback(fileArg) {
  const revFile = fileArg ? path.resolve(root, fileArg) : FILE_REVISIONS;
  if (!fs.existsSync(revFile)) {
    console.error(`File di backup non trovato: ${revFile}`);
    process.exit(1);
  }
  const rev = JSON.parse(fs.readFileSync(revFile, 'utf8'));
  const el = await connetti('elementor');
  const nv = await connetti('novamira');

  const esito = await phpConDati(
    nv,
    String.raw`
    $out = [];
    foreach (($D['pagine'] ?? []) as $id => $entry) {
      $id = (int) $id;
      $prima = $entry['prima'] ?? null;
      if (!$prima || empty($prima['trovato'])) { continue; }
      wp_update_post(['ID' => $id, 'post_status' => (string) $prima['post_status']]);
      if (!empty($prima['has_elementor_data'])) {
        update_post_meta($id, '_elementor_data', wp_slash((string) $prima['elementor_data']));
      } else {
        delete_post_meta($id, '_elementor_data');
      }
      if (!empty($prima['has_page_settings'])) {
        update_post_meta($id, '_elementor_page_settings', $prima['page_settings']);
      } else {
        delete_post_meta($id, '_elementor_page_settings');
      }
      if (!empty($prima['has_rev2'])) {
        update_post_meta($id, '_artes_rev2', (string) $prima['artes_rev2']);
      } else {
        delete_post_meta($id, '_artes_rev2');
      }
      if (!empty($prima['has_seo_title'])) {
        update_post_meta($id, '_artes_seo_title', wp_slash((string) $prima['seo_title']));
      } else {
        delete_post_meta($id, '_artes_seo_title');
      }
      if (!empty($prima['has_seo_desc'])) {
        update_post_meta($id, '_artes_seo_description', wp_slash((string) $prima['seo_desc']));
      } else {
        delete_post_meta($id, '_artes_seo_description');
      }
      delete_post_meta($id, '_elementor_css');
      $out[$id] = ['slug' => $entry['slug'] ?? '', 'status' => get_post_status($id)];
    }
    return $out;
    `,
    { pagine: rev.pagine || {} }
  );

  // Rimuove eventuali classi stub create in precedenza da questo script
  const stubCreate = Array.isArray(rev.classi_stub_create) ? rev.classi_stub_create : [];
  if (stubCreate.length) {
    for (let i = 0; i < stubCreate.length; i += 25) {
      const lotto = stubCreate.slice(i, i + 25);
      await el.callJson('elementor-manage-classes', {
        operations: lotto.map((c) => ({ action: 'delete', id: c.id })),
      });
    }
  }

  await el.call('elementor-clear-cache', {});
  await nv.php(`if (class_exists('\\Elementor\\Plugin')) { \\Elementor\\Plugin::$instance->files_manager->clear_cache(); } wp_cache_flush(); return true;`);
  console.log(`Rollback completato da ${path.relative(root, revFile)}:`, JSON.stringify(esito));
  if (stubCreate.length) console.log(`Classi stub rimosse: ${stubCreate.length}`);
}

// --- Entrypoint CLI ------------------------------------------------------------------------------------------------
if (require.main === module) {
  const args = process.argv.slice(2);
  const opt = (k) => {
    const i = args.indexOf(k);
    return i >= 0 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : '';
  };
  const soloVal = opt('--solo');
  const filtroSet = soloVal ? new Set(soloVal.split(',').map((s) => s.trim()).filter(Boolean)) : null;

  if (args.includes('--piano')) {
    eseguiPiano(filtroSet);
  } else if (args.includes('--esegui')) {
    eseguiScrittura(filtroSet).catch((e) => {
      console.error(e.message);
      process.exit(1);
    });
  } else if (args.includes('--stato')) {
    eseguiStato().catch((e) => {
      console.error(e.message);
      process.exit(1);
    });
  } else if (args.includes('--rollback')) {
    eseguiRollback(opt('--rollback')).catch((e) => {
      console.error(e.message);
      process.exit(1);
    });
  } else {
    console.error('uso: pagine-bozze-rev2.js --piano | --esegui [--solo 152,154] | --stato | --rollback [file]');
    process.exit(2);
  }
}

module.exports = { PAGINE_DEF, CLASSI_STUB_BOZZE, compilaTutte };
