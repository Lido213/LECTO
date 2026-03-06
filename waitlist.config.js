// ── CONFIGURAZIONE LISTA D'ATTESA ────────────────────────
// Modifica questo file per cambiare testi, campi e opzioni
// del form senza toccare app.js o index.html.

const WAITLIST_CONFIG = {

  // ── ENDPOINT ─────────────────────────────────────────────────────────────────
  // Lascia '' per salvare solo in localStorage (nessun backend).
  //
  // ▶ GOOGLE SHEETS (consigliato — gratuito, illimitato):
  //   1. Apri il tuo Google Foglio
  //   2. Estensioni → Apps Script → incolla il codice da README o dalla guida
  //   3. Distribuisci → Nuova distribuzione → App Web
  //      (Esegui come: Tu · Accesso: Chiunque)
  //   4. Copia l'URL e incollalo qui sotto
  //   Nota: la chiamata usa mode:'no-cors', quindi non ricevi risposta —
  //         i dati arrivano comunque nel foglio.
  //
  // ▶ AIRTABLE (interfaccia comoda, gratuito fino a 1.000 righe):
  //   endpoint: 'https://api.airtable.com/v0/<BASE_ID>/<NOME_TABELLA>'
  //   + aggiungi in app.js il header: Authorization: 'Bearer <TOKEN>'
  // ─────────────────────────────────────────────────────────────────────────────
  endpoint: 'https://script.google.com/macros/s/AKfycbxfdvMseokZ1YQPicf8viShxCJqr-6VOa5zKggMwA42ii4Fy-KzYjkFUZKhawcS6dsvng/exec',

  // Testi UI
  title:        "Lista d'attesa",
  intro:        "Lasciaci i tuoi dati: ti contatteremo non appena si libera una stanza adatta a te.",
  submitLabel:  "Iscriviti alla lista d'attesa",
  successTitle: "Iscrizione confermata!",
  successSub:   "Ti contatteremo appena si libera una stanza adatta a te.",

  // Campi del form.
  // Tipi supportati: 'text' | 'email' | 'tel' | 'select' | 'textarea'
  // half: true → il campo occupa metà riga (i campi half consecutivi vengono
  //              raggruppati automaticamente in una riga a due colonne)
  fields: [
    {
      id:           'wlNome',
      label:        'Nome e cognome',
      type:         'text',
      required:     true,
      placeholder:  'Es. Mario Rossi',
      autocomplete: 'name',
    },
    {
      id:           'wlEmail',
      label:        'Email',
      type:         'email',
      required:     true,
      placeholder:  'Es. mario@mail.com',
      autocomplete: 'email',
    },
    {
      id:           'wlTel',
      label:        'Telefono',
      type:         'tel',
      required:     false,
      placeholder:  'Es. +39 333 1234567',
      autocomplete: 'tel',
    },
    {
      id:          'wlCorso',
      label:       'Corso di laurea / Facoltà',
      type:        'text',
      required:    false,
      placeholder: 'Es. Ingegneria Civile',
    },
    {
      id:       'wlDa',
      label:    'Disponibilità da',
      type:     'select',
      required: true,
      half:     true,
      options: [
        'Settembre 2025', 'Ottobre 2025', 'Novembre 2025', 'Dicembre 2025',
        'Gennaio 2026',   'Febbraio 2026', 'Marzo 2026',   'Aprile 2026',
        'Maggio 2026',    'Giugno 2026',   'Luglio 2026',  'Agosto 2026',
        'Settembre 2026', 'Ottobre 2026',  'Non so ancora',
      ],
    },
    {
      id:       'wlBudget',
      label:    'Budget mensile',
      type:     'select',
      required: true,
      half:     true,
      options: [
        'Fino a 400 €',
        '400–500 €',
        '500–600 €',
        'Oltre 600 €',
      ],
    },
    {
      id:          'wlNote',
      label:       'Note o preferenze',
      type:        'textarea',
      required:    false,
      placeholder: 'Es. camera singola, arredata, WiFi incluso…',
      rows:        3,
    },
  ],
};
