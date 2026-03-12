// ═══════════════════════════════════════════════════════════════
// data.js — CONTENUTO MODIFICABILE DEL SITO LECTO
// ═══════════════════════════════════════════════════════════════
//
// Questo file contiene TUTTI i dati delle stanze e degli
// appartamenti. Modificando questo file aggiorni direttamente
// il sito senza toccare nient'altro.
//
// ┌─────────────────────────────────────────────────────────┐
// │  GUIDA AI CAMPI DI OGNI STANZA                          │
// ├─────────────────────────────────────────────────────────┤
// │  id          → numero univoco (non cambiare)            │
// │  name        → nome visualizzato nella card             │
// │  zone        → indirizzo/zona (usato anche nei filtri)  │
// │  price       → prezzo mensile in euro (solo numero)     │
// │  status      → "available" = disponibile                │
// │                "wip"       = in arrivo / in lavori      │
// │  inclusive   → true = tutto incluso / false = escluso   │
// │  size        → dimensione stanza es. "~18 m²"           │
// │  desc        → descrizione lunga (testo libero)         │
// │  tags        → etichette piccole sotto la card          │
// │  gold        → etichette evidenziate in oro             │
// │  servizi     → lista servizi nel pannello dettaglio     │
// │  extra       → voci "extra" in grigio nel dettaglio     │
// │  lat / lng   → coordinate GPS (per la mappa)            │
// │  featured    → true = bordo oro nella lista             │
// │  thumb       → emoji di riserva se non c'è la foto      │
// │  tc          → stile sfondo thumb: "" / "tw" / "tf"     │
// └─────────────────────────────────────────────────────────┘
//
// ════════════════════════════════════════════════════════════
// COME AGGIUNGERE UNA NUOVA STANZA:
//   1. Copia un blocco { id:X, ... } esistente
//   2. Cambia id con il prossimo numero disponibile
//   3. Compila tutti i campi
//   4. Aggiungi una riga in apartments[] se è un nuovo palazzo
// ════════════════════════════════════════════════════════════

// ── FOTO STANZE (base64) ─────────────────────────────────────
// Per cambiare una foto: sostituisci la stringa base64 con la
// nuova immagine convertita su https://www.base64-image.de
const roomImages = {
  1: "images/room-1.jpg",
  2: "images/room-2.jpg",
  3: "images/room-3.jpg",
  4: "images/room-4.jpg",
  5: "images/room-5.jpg",
  6: "images/room-6.jpg",
};


// ── STANZE ──────────────────────────────────────────────────────
// Ogni oggetto {} è una stanza. L'ordine qui è l'ordine nel sito.

const rooms = [

  // ── VIA PONCIONE ───────────────────────────────────────────────
  {
    id: 1,
    name: "Stanza 100",
    zone: "Via Poncione",
    price: 450,                          // € / mese
    status: "wip",                       // "available" | "wip"
    inclusive: false,                    // utenze incluse?
    size: "~18 m²",
    desc: "Camera singola arredata al 4° piano con ascensore. Appartamento da 3 stanze con salotto, cucina attrezzata e 2 bagni. Fermata bus sotto casa.",
    tags: ["Camera privata", "Arredata", "WiFi", "Lavatrice"],
    gold: [],                            // tag evidenziati in oro
    servizi: ["Lavatrice", "WiFi", "Ascensore", "Frigorifero e Freezer"],
    extra: ["Utenze (Luce e Gas)"],
    lat: 45.8357, lng: 9.4136,           // coordinate GPS
    featured: false,
    thumb: "🏠", tc: "",
  },

  {
    id: 2,
    name: "Stanza 2",
    zone: "Via Poncione",
    price: 450,
    status: "wip",
    inclusive: false,
    size: "~18 m²",
    desc: "Camera luminosa con vista verde. Cucina con lavastoviglie, forno e Smart TV nel soggiorno condiviso.",
    tags: ["Camera privata", "Arredata", "WiFi", "Smart TV"],
    gold: [],
    servizi: ["Lavastoviglie", "WiFi", "Forno", "Smart-TV"],
    extra: ["Utenze (Luce e Gas)"],
    lat: 45.8357, lng: 9.4136,
    featured: false,
    thumb: "🛋️", tc: "",
  },

  {
    id: 3,
    name: "Stanza 3",
    zone: "Via Poncione",
    price: 450,
    status: "wip",
    inclusive: false,
    size: "~17 m²",
    desc: "Camera accogliente con ampio spazio studio. Appartamento luminoso con 2 bagni per 3 inquilini.",
    tags: ["Camera privata", "Arredata", "WiFi", "Frigorifero"],
    gold: [],
    servizi: ["Frigorifero e Freezer", "WiFi", "Forno a Microonde", "Lavatrice"],
    extra: ["Utenze (Luce e Gas)"],
    lat: 45.8357, lng: 9.4136,
    featured: false,
    thumb: "🪴", tc: "",
  },

  // ── VIA DELL'ISOLA ─────────────────────────────────────────────
  {
    id: 4,
    name: "Stanza 1 — Bagno privato",
    zone: "Via dell'Isola",
    price: 600,
    status: "wip",                       // in arrivo
    inclusive: false,
    size: "20 m²",
    desc: "La stanza premium del portfolio LECTO. 20 m² con bagno en-suite. 2° piano con ascensore.",
    tags: ["Bagno privato", "Arredata", "2° piano · ascensore"],
    gold: ["Bagno privato"],
    servizi: ["Lavastoviglie", "Lavatrice", "WiFi", "Frigorifero e Freezer", "Forno", "Smart-TV"],
    extra: ["Pulizie"],
    lat: 45.8478, lng: 9.3949,
    featured: false,
    thumb: "✨", tc: "tf",
  },

  {
    id: 5,
    name: "Stanza 2",
    zone: "Via dell'Isola",
    price: 550,
    status: "wip",
    inclusive: false,
    size: "18 m²",
    desc: "Stanza in ristrutturazione. Campus a 5 minuti in bici.",
    tags: ["Camera singola", "Arredata", "WiFi"],
    gold: [],
    servizi: ["WiFi", "Lavatrice", "Frigorifero e Freezer", "Forno a Microonde"],
    extra: ["Pulizie"],
    lat: 45.8478, lng: 9.3949,
    featured: false,
    thumb: "🏗️", tc: "tw",
  },

  {
    id: 6,
    name: "Stanza 3 — Balcone",
    zone: "Via dell'Isola",
    price: 550,
    status: "wip",
    inclusive: false,
    size: "19 m²",
    desc: "Stanza con balcone privato in arrivo.",
    tags: ["Balcone privato", "Arredata", "WiFi"],
    gold: [],
    servizi: ["WiFi", "Lavatrice", "Forno", "Smart-TV"],
    extra: ["Pulizie"],
    lat: 45.8478, lng: 9.3949,
    featured: false,
    thumb: "🌿", tc: "tw",
  },

];

// ── APPARTAMENTI (raggruppamento nella vista lista) ───────────────
// Ogni appartamento raggruppa le stanze con la stessa "zone".
// "sub" è il sottotitolo mostrato nell'intestazione del gruppo.

const apartments = [
  { name: "Via Poncione",   sub: "3 stanze · 4° piano · ascensore", zone: "Via Poncione",   wipLabel: "Disponibili da settembre" },
  { name: "Via dell'Isola", sub: "3 stanze · 2° piano · ascensore", zone: "Via dell'Isola", wipLabel: "Disponibili prossimamente" },
];
