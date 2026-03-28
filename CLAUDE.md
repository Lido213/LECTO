# CLAUDE.md — LECTO Dev Sessions

Letto automaticamente da Claude Code all'avvio di ogni sessione.
Contiene l'architettura reale del repository — non inventare nulla che non sia qui.

---

## PROGETTO

LECTO è una web app per student housing vicino al Politecnico di Lecco.
Due rami operativi: **SERVICER** (gestione per proprietari) e **INVESTMENT** (riqualificazione in cambio di quota % sul canone).
Interlocutore: Carlo, co-fondatore, programmatore principiante con buona capacità di adattamento.
Spiega le scelte tecniche in modo comprensibile ma preciso.

---

## STRUTTURA REPOSITORY

```
/
├── index.html          ← App principale (studenti: listing + mappa + waitlist)
├── proprietario.html   ← Pagina proprietari (WIP: form multi-step + CTA Instagram)
├── styles.css          ← Tutti gli stili (unico file, CSS custom properties)
├── app.js              ← Logica principale (filtri, mappa Leaflet, sheet, form)
├── data.js             ← DATI MODIFICABILI: stanze, appartamenti, foto
├── waitlist.config.js  ← Config form waitlist (testi, campi, endpoint GAS)
├── extract-images.js   ← Script Node.js: estrae base64 da data.js → images/
└── images/
    ├── room-1.jpg      ← Foto stanze (referenziate da data.js)
    ├── room-2.jpg
    └── ...
```

---

## STACK E VINCOLI

```
HTML5 + CSS3 + Vanilla JS   ← nessun framework, nessun build tool
Leaflet 1.9.4 (CDN)         ← mappa interattiva con pin custom
Lucide (CDN)                ← icone servizi nel detail sheet
Google Fonts (CDN)          ← DM Sans + Playfair Display
Google Apps Script          ← backend form (no-cors POST, JSON body)
```

### Vincoli assoluti — non derogabili

```
✅ Multi-file separati (HTML / CSS / JS / data)  ← architettura attuale
✅ Vanilla JS                                    ← no React, no Vue, no Svelte
✅ CDN only                                      ← no npm, no build tool
✅ Mobile-first                                  ← target principale: smartphone
✅ CSS custom properties in :root                ← non hardcodare colori
❌ No localStorage per dati utente permanenti    ← solo backup form (safety net)
❌ Non tornare a single-file HTML                ← il repo è già multi-file
❌ Non aggiungere dipendenze non già in uso
```

### CDN attualmente caricati

```html
<!-- Leaflet -->
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>

<!-- Lucide icons -->
<script src="https://unpkg.com/lucide@latest/dist/umd/lucide.min.js"></script>

<!-- Google Fonts -->
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Playfair+Display:wght@900&display=swap" rel="stylesheet"/>
```

---

## BRAND — CSS CUSTOM PROPERTIES

Tutti i colori sono in `styles.css` dentro `:root`. Usare sempre le variabili.

```css
:root {
  --navy:        #143654;   /* sfondi principali, testi titolo, bordi */
  --navy-d:      #0d2438;   /* sfondo scuro (gradient) */
  --navy-l:      #1d4d78;   /* sfondo chiaro (gradient) */
  --gold:        #e5b34c;   /* CTA, prezzi, badge, tag evidenziati */
  --gold-l:      #f0c96a;
  --gold-pale:   #fdf5e4;   /* background badge/tag gold */
  --bg:          #ffffff;
  --surface:     #ffffff;   /* card, sheet */
  --border:      #f0f0f0;   /* bordi leggeri */
  --border-dark: #e0e0e0;   /* bordi standard */
  --muted:       #8fa0b0;   /* testo secondario, icone inattive */
  --text:        #143654;
  --text-sm:     #6a8099;
  --green:       #16a34a;   /* semaforo verde */
  --green-bg:    rgba(22,163,74,.1);
  --font-title:  'Cooper BT', 'Cooper Black', Georgia, serif;
  --font-body:   'DM Sans', system-ui, sans-serif;
}
```

### Semafori (hex diretti, non variabili)

```
Verde  #16a34a  → disponibile, pagato, ok
Giallo #f9a825  → in attesa, warning
Rosso  #c62828  → scaduto, problema
```

---

## data.js — STRUTTURA DATI

Questo è il file da modificare per aggiungere/cambiare stanze e appartamenti.
Non toccare app.js per aggiungere contenuto.

```javascript
// Foto stanze — percorso relativo alla cartella images/
const roomImages = {
  1: "images/room-1.jpg",
  // ...
};

// Stanza — tutti i campi
const rooms = [
  {
    id: 1,                         // intero univoco — NON cambiare mai
    name: "Stanza 1",              // nome visualizzato
    zone: "Via Poncione",          // deve corrispondere a apartments[].zone
    price: 450,                    // solo numero, €/mese
    status: "wip",                 // "available" | "wip" | "coming"
    inclusive: false,              // true = tutto incluso
    size: "~18 m²",
    desc: "Descrizione...",
    tags: ["WiFi", "Lavatrice"],   // etichette card e detail
    gold: ["Bagno privato"],       // subset di tags in evidenza oro
    servizi: ["WiFi", "Lavatrice"],// icone nel detail sheet
    extra: ["Pulizie"],            // servizi extra (grigi nel detail)
    lat: 45.8357, lng: 9.4136,     // coordinate GPS per mappa
    featured: false,               // true = bordo oro nella card
    thumb: "🏠",                   // emoji fallback se no foto
    tc: "",                        // classe colore thumb: "" | "tw" | "tf"
  }
];

// Appartamento — raggruppa stanze per zona nel list view
const apartments = [
  {
    name: "Via Poncione",
    sub: "3 stanze · 4° piano · ascensore",
    zone: "Via Poncione",          // deve corrispondere a rooms[].zone
    wipLabel: "Disponibili da settembre",
  }
];
```

### Icone servizi valide (mappate in serviceIcons in app.js)

```
Lavastoviglie | Lavatrice | Forno | Forno a Microonde | Frigorifero e Freezer
WiFi | Ascensore | Smart-TV | Utenze (Luce e Gas) | Pulizie
```

Per aggiungere icone nuove: aggiungere voce in `serviceIcons` in app.js
con il nome dell'icona Lucide corrispondente.

---

## waitlist.config.js — STRUTTURA

```javascript
const WAITLIST_CONFIG = {
  endpoint: 'https://script.google.com/.../exec',  // GAS endpoint
  title: "Lista d'attesa",
  intro: "...",
  submitLabel: "Iscriviti alla lista d'attesa",
  successTitle: "Iscrizione confermata!",
  successSub: "...",
  fields: [
    {
      id: 'wlNome',           // chiave nel payload JSON inviato a GAS
      label: 'Nome e cognome',
      type: 'text',           // 'text'|'email'|'tel'|'select'|'textarea'
      required: true,
      placeholder: '...',
      autocomplete: 'name',   // opzionale
      half: true,             // true = metà riga (si accoppia con il prossimo half)
      options: [...],         // solo per type:'select'
      rows: 3,                // solo per type:'textarea'
    }
  ],
};
```

---

## BACKEND — GOOGLE APPS SCRIPT

Tutti i form (waitlist studenti + form proprietari) usano lo stesso pattern:

```javascript
fetch(endpoint, {
  method: 'POST',
  mode: 'no-cors',                           // obbligatorio per GAS
  headers: { 'Content-Type': 'text/plain' }, // NON application/json
  body: JSON.stringify(payload),
});
// no-cors = nessuna risposta ricevuta — i dati arrivano comunque nel foglio
```

Endpoint attivo:
`https://script.google.com/macros/s/AKfycbxgJCgbWu4s6TGdP88vqIXNAyXT4UHIWzM0tx8AQQ3RCaFvymmTOfnzBI9yWzQyBmu1Mw/exec`

Il form proprietario invia lo stesso endpoint con `tipo: 'proprietario'` nel payload,
distinguendosi dalla waitlist studenti che non ha quel campo.

---

## MAPPA LEAFLET

```javascript
// Tile layer: CartoDB light (no API key necessaria)
L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', { maxZoom: 19 })

// Coordinate di riferimento
const POLI_LAT = 45.8491, POLI_LNG = 9.3971;

const mapApts = {
  poncione: { lat: 45.8614, lng: 9.3887, rooms: [1,2,3] },
  isola:    { lat: 45.8478, lng: 9.3949, rooms: [4,5,6], featured: true },
};

// Pin: L.divIcon con HTML inline — gold=true per Via dell'Isola
// La mappa si inizializza solo quando il tab diventa visibile (lazy init)
// Su tablet+ (≥640px) si inizializza subito (split layout sempre visibile)
```

---

## RESPONSIVE BREAKPOINTS

```
mobile  < 640px   → single column, bottom-nav completa, map tab separato
tablet  ≥ 640px   → split screen: stanze sinistra | mappa destra (sempre visibili)
desktop ≥ 1024px  → sidebar filtri fissa + grid stanze 2+ colonne
```

Su tablet+: i tab "Mappa" e "Instagram" della bottom-nav vengono nascosti via CSS
perché la mappa è sempre visibile nel pannello destro.

Gli overlay (detail sheet, contatti, waitlist) su tablet+ diventano modal centrati
invece di bottom-sheet. Gestito via CSS media query, non JS.

---

## proprietario.html

Pagina separata (non parte di index.html). Contiene:
- Header identico a index.html (stesso logo)
- Stato "Work in progress" con CTA Instagram
- Bottone "Pubblica la tua stanza" → overlay form multi-step (5 step inline in JS)
- Step: tipo alloggio → posizione → prezzo/dettagli → servizi → contatti
- Submit via GAS con `tipo: 'proprietario'` nel payload
- Bottom nav con `href="index.html"` (link tornare a studente)
- CSS aggiuntivo inline nell'`<head>` (specifico per questa pagina)

---

## PATTERN DI SVILUPPO

### Ordine di lettura inizio sessione

```bash
# 1. Questo file (automatico)
# 2. Stato attuale stanze
head -80 data.js
# 3. Config form (se il task riguarda waitlist)
cat waitlist.config.js
# 4. Chiedi a Carlo cosa si lavora oggi se non specificato
```

### Durante la sessione

```
✅ str_replace per modifiche — mai riscrivere file interi senza necessità
✅ Descrivi cosa hai cambiato e perché dopo ogni modifica significativa
✅ Segnala prima di procedere se una modifica può rompere qualcosa
✅ Testa mentalmente il flusso su mobile E tablet dopo ogni cambio UI
✅ CSS in styles.css — non inline, non in <style> nei file HTML
✅ Dati in data.js — non hardcodati in app.js
```

### Quando il contesto si riempie

```
⚠️ CONTESTO IN ESAURIMENTO — suggerisco /compact prima di continuare
```

---

## REPOSITORY GITHUB

```
URL:    https://github.com/Lido213/LECTO
Branch: main (produzione)
```

### Workflow Git

```bash
# Prima di iniziare — allinearsi
git pull origin main

# Commit intermedi (dopo ogni feature stabile)
git add -A
git commit -m "feat: descrizione breve"

# Fine sessione
git push origin main

# Utilità
git log --oneline -10                    # storia recente
git checkout -- styles.css               # annulla modifica non committata
git clone https://github.com/Lido213/LECTO.git  # clona su nuova macchina
```

### Convenzione commit

```
feat:     nuova funzionalità
fix:      correzione bug
ui:       modifica visiva / CSS
data:     aggiornamento stanze, config, foto
docs:     documentazione (incluso CLAUDE.md)
refactor: riorganizzazione senza cambi funzionali
```

---

## DATI FINANZIARI (per grafici/analisi)

```javascript
const viaDellIsola = {
  prezzoAcquisto: 260000,
  mutuo: 208000,
  equityIniziale: 125206,
  investimentoTotale: 333206,
  rataMensile: 1228.89,
  rataAnnua: 14746.68,
  incassoAnnuoOttimistico: 21600,  // 3 × €600 × 12
  incassoAnnuoReale: 21000,        // €600 + €550 + €550 × 12
  costiOperativiAnnui: 3081.78,
  noi: 18518.22,
  cfe: 3771.54,                    // cash flow equity dopo mutuo
  roe20anni: 0.113,
  budgetRiqualificazione: 40000,
};
```

---

## COSE DA NON FARE MAI

```
❌ npm install / package.json / build tools
❌ Framework JS (React, Vue, Angular, Svelte)
❌ Tornare a single-file HTML
❌ CSS colori hardcodati (usare --variabili, eccetto semafori)
❌ Dati stanze hardcodati in app.js (vanno in data.js)
❌ localStorage per dati utente permanenti
❌ force push su main
❌ "certificata" riferito alle stanze (implicazioni legali)
❌ Posizionare LECTO come agenzia immobiliare
❌ Aggiungere CDN non già approvati senza discuterne
```

---

## COMANDI UTILI

```bash
# Server locale (evita problemi CORS con fetch)
python3 -m http.server 8080
# → http://localhost:8080

# Aprire direttamente (macOS)
open index.html
open proprietario.html

# Estrarre immagini base64 da data.js → images/ (richiede Node.js)
node extract-images.js

# Git — fine sessione rapida
git add -A && git commit -m "feat: descrizione" && git push origin main
```

---

*Aggiornare questo file quando cambiano: struttura file, nuove dipendenze CDN,*
*nuovi appartamenti, endpoint GAS, breakpoint responsive.*
*Ultimo aggiornamento: Marzo 2026*
