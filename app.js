// ── DATI ─────────────────────────────────────────────────
// Tutti i dati (stanze, foto, appartamenti) sono in data.js

// ── CONFIG LISTA D'ATTESA ─────────────────────────────────
// Incolla qui l'URL del tuo Google Apps Script (vedi README o istruzioni sotto).
// Lascia vuoto per salvare solo in localStorage durante lo sviluppo.
//
// COME CONFIGURARE GOOGLE SHEETS:
// 1. Crea un nuovo Google Sheet con le colonne:
//    Data | Nome | Email | Telefono | Corso | Da quando | Budget | Note
// 2. Nel menu Estensioni > Apps Script, incolla questo codice:
//
//    var EMAILS = ['carlo.giudici213@gmail.com', 'lecto.student@gmail.com'];
//
//    function doPost(e) {
//      var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
//      var d = JSON.parse(e.postData.contents);
//      sheet.appendRow([new Date(), d.nome, d.email, d.telefono||'',
//        d.corso||'', d.da||'', d.budget||'', d.note||'']);
//
//      var righe = Object.entries(d).map(function(kv) {
//        return '• ' + kv[0] + ': ' + (kv[1] || '—');
//      }).join('\n');
//      MailApp.sendEmail({
//        to: EMAILS.join(','),
//        subject: 'LECTO — Nuova iscrizione lista d\'attesa',
//        body: 'Nuova iscrizione ricevuta:\n\n' + righe +
//              '\n\nTimestamp: ' + new Date().toLocaleString('it-IT'),
//      });
//
//      return ContentService.createTextOutput(JSON.stringify({ok:true}))
//        .setMimeType(ContentService.MimeType.JSON);
//    }
//
// 3. Clicca "Distribuisci > Nuova distribuzione" > tipo "App web"
//    Esegui come: Me | Chi ha accesso: Chiunque → copia l'URL
// 4. Incollalo qui sotto:


// ── STATE ─────────────────────────────────────────────────
const state = { zone:"all", maxPrice:650, sortAsc:true, sortActive:false, activeRoom:null };

// ── MAPPA ─────────────────────────────────────────────────
const POLI_LAT = 45.8491, POLI_LNG = 9.3971;
let activeMapRoom = null;

// Apartment-level data for the map
const mapApts = {
  poncione: {
    name: "Via Poncione",
    sub: "3 stanze disponibili · 4° piano",
    lat: 45.8357, lng: 9.4136,
    priceFrom: 450,
    rooms: [1,2,3],
  },
  isola: {
    name: "Via dell'Isola",
    sub: "3 stanze · 2° piano · ascensore",
    lat: 45.8478, lng: 9.3949,
    priceFrom: 550,
    rooms: [4,5,6],
    featured: true,
  }
};

let _map = null;

function initMap() {
  const el = document.getElementById('leaflet-map');
  if (!el) return;

  if (_map) {
    setTimeout(() => _map.invalidateSize(), 10);
    return;
  }

  _map = L.map('leaflet-map', {
    zoomControl: false,
    attributionControl: false
  }).setView([45.843, 9.406], 15);

  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    maxZoom: 19
  }).addTo(_map);

  L.control.zoom({ position: 'bottomright' }).addTo(_map);

  // Pin factory
  function makePin(label, gold) {
    const bg     = gold ? '#fff9ec' : '#ffffff';
    const border = gold ? '#c99a2e' : '#143654';
    const color  = gold ? '#7a5500' : '#143654';
    // Estimate label width: ~7.5px per char at 11px bold + 28px padding
    const w = Math.round(label.length * 7.5 + 28);
    const h = 42; // label height (~28px) + triangle (8px) + margin
    return L.divIcon({
      className: '',
      iconSize: [w, h],
      iconAnchor: [Math.round(w / 2), h], // punta del triangolo al centro-basso
      html: `<div style="display:flex;flex-direction:column;align-items:center;cursor:pointer;width:${w}px;">
        <div style="background:${bg};border:2.5px solid ${border};border-radius:12px 12px 12px 3px;
          padding:7px 14px;font:800 11px/1 'DM Sans',sans-serif;color:${color};
          white-space:nowrap;box-shadow:0 4px 16px rgba(0,0,0,.18);">${label}</div>
        <div style="width:0;height:0;border-left:6px solid transparent;
          border-right:6px solid transparent;border-top:8px solid ${border};margin-top:-1px;"></div>
      </div>`
    });
  }

  // Politecnico pin
  const poliLabel = '🎓 Politecnico';
  const poliW = 130;
  const poliH = 36;
  L.marker([45.8491, 9.3971], {
    interactive: false,
    icon: L.divIcon({
      className: '',
      iconSize: [poliW, poliH],
      iconAnchor: [Math.round(poliW / 2), poliH],
      html: `<div style="display:flex;flex-direction:column;align-items:center;width:${poliW}px;">
        <div style="background:#143654;color:#fff;border-radius:20px;padding:5px 13px;
          font:700 10px/1 'DM Sans',sans-serif;white-space:nowrap;
          box-shadow:0 3px 10px rgba(20,54,84,.4);">${poliLabel}</div>
        <div style="width:0;height:0;border-left:5px solid transparent;
          border-right:5px solid transparent;border-top:6px solid #143654;margin-top:-1px;"></div>
      </div>`
    })
  }).addTo(_map);

  // Via Poncione
  L.marker([45.8357, 9.4136], { icon: makePin('Via Poncione', false) })
    .addTo(_map)
    .on('click', (e) => { L.DomEvent.stopPropagation(e); selectMapApt('poncione'); });

  // Via dell'Isola
  L.marker([45.8478, 9.3949], { icon: makePin("Via dell'Isola", true) })
    .addTo(_map)
    .on('click', (e) => { L.DomEvent.stopPropagation(e); selectMapApt('isola'); });

  // Click sulla mappa → chiude il card
  _map.on('click', closeMapCard);
}

function closeMapCard() {
  const card = document.getElementById('mapCard');
  card.style.transform = '';
  card.classList.remove('visible');
}

// Swipe-to-dismiss sul bottom sheet della mappa
(function initMapCardDrag() {
  document.addEventListener('DOMContentLoaded', () => {
    const card = document.getElementById('mapCard');
    let startY = 0, dy = 0;

    card.addEventListener('touchstart', e => {
      startY = e.touches[0].clientY;
      dy = 0;
      card.style.transition = 'none';
    }, { passive: true });

    card.addEventListener('touchmove', e => {
      dy = e.touches[0].clientY - startY;
      if (dy > 0) card.style.transform = `translateY(${dy}px)`;
    }, { passive: true });

    card.addEventListener('touchend', () => {
      card.style.transition = '';
      if (dy > 80) {
        closeMapCard();
      } else {
        card.style.transform = card.classList.contains('visible') ? 'translateY(0)' : 'translateY(110%)';
      }
    });
  });
})();

function selectMapApt(aptKey) {
  const apt = mapApts[aptKey];
  if (!apt) return;

  activeMapRoom = rooms.find(r => r.id === apt.rooms[0]);

  // Header
  document.getElementById('mcZone').textContent = apt.sub;
  document.getElementById('mcName').textContent = apt.name;

  const dLat = (apt.lat - POLI_LAT) * 111000;
  const dLng = (apt.lng - POLI_LNG) * 111000 * Math.cos(apt.lat * Math.PI / 180);
  const distM = Math.round(Math.sqrt(dLat*dLat + dLng*dLng));
  const walkMin = Math.round(distM / 83);
  document.getElementById('mcWalk').textContent = `🚶 ~${walkMin} min`;

  // Render all rooms of this apartment
  const aptRooms = apt.rooms.map(id => rooms.find(r => r.id === id)).filter(Boolean);
  const listEl = document.getElementById('mcRoomsList');
  listEl.innerHTML = aptRooms.map(r => {
    const img = roomImages[r.id]
      ? `<img src="${roomImages[r.id]}" alt="${r.name}" style="width:100%;height:100%;object-fit:cover;object-position:center 25%;border-radius:10px;display:block;"/>`
      : `<div style="font-size:1.4rem;line-height:60px;text-align:center;">${r.thumb}</div>`;
    const tags = r.tags.slice(0,2).map(t => `<span class="rtag${r.gold.includes(t)?' tg':''}">${t}</span>`).join('');
    return `<div class="mc-room-row" onclick="openDetail(${r.id})">
      <div class="mc-room-thumb">${img}</div>
      <div class="mc-room-info">
        <div class="mc-room-name">${r.name}</div>
        <div class="mc-room-price"><sup>€</sup>${r.price}<sub>/m</sub> <span style="font-size:.65rem;font-weight:400;color:var(--muted);">${r.inclusive?'tutto inc.':'+ utenze'}</span></div>
        <div class="mc-room-tags">${tags}</div>
      </div>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#ccc" stroke-width="2" stroke-linecap="round"><path d="M9 18l6-6-6-6"/></svg>
    </div>`;
  }).join('');

  document.getElementById('mapCard').classList.add('visible');
}

function openInGoogleMaps() {
  if (!activeMapRoom) return;
  window.open(`https://www.google.com/maps/dir/?api=1&origin=${activeMapRoom.lat},${activeMapRoom.lng}&destination=${POLI_LAT},${POLI_LNG}&travelmode=walking`, '_blank');
}

function openInAppleMaps() {
  if (!activeMapRoom) return;
  window.open(`https://maps.apple.com/?saddr=${activeMapRoom.lat},${activeMapRoom.lng}&daddr=${POLI_LAT},${POLI_LNG}&dirflg=w`, '_blank');
}

function openDetailFromMap() {
  if (activeMapRoom) openDetail(activeMapRoom.id);
}

function openRouteInMaps() { openInGoogleMaps(); }


// ── NAV SWITCH ────────────────────────────────────────────
function goToMap(aptKey) {
  // Switch to mappa tab
  const mapBtn = document.querySelector('.nav-item[onclick*="mappa"]');
  switchNav('mappa', mapBtn);
  // Wait for map to init then open the pin card
  requestAnimationFrame(() => requestAnimationFrame(() => {
    setTimeout(() => selectMapApt(aptKey), 120);
  }));
}

function switchNav(view, btn) {
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  btn.classList.add('active');
  document.querySelectorAll('.view-content').forEach(v => v.classList.remove('active'));
  document.getElementById('view-' + view).classList.add('active');
  if (view === 'mappa') {
    // Double rAF: attende che il browser abbia calcolato il layout dopo display:flex
    requestAnimationFrame(() => requestAnimationFrame(() => initMap()));
  }
  // Restore hero when switching back to stanze
  if (view === 'stanze') {
    const scrollEl = document.getElementById('stanze-scroll-el');
    if (scrollEl) scrollEl.scrollTop = 0;
  }
}

// Hero strip sempre visibile

let _suppressScrollHero = false;

// ── TOGGLE FILTRI PANEL ──────────────────────────────────────
function toggleFiltersPanel(event) {
  if (event) event.stopPropagation();
  const bar = document.getElementById('filtersBar');
  bar.classList.toggle('open');
}

// Chiudi panel filtri se si clicca fuori
document.addEventListener('click', e => {
  const bar = document.getElementById('filtersBar');
  if (bar && !bar.contains(e.target)) {
    bar.classList.remove('open');
  }
});

// Aggiorna i chip nella barra filtri
function updateFilterChips() {
  const chipZona   = document.getElementById('chipZona');
  const chipPrezzo = document.getElementById('chipPrezzo');
  if (!chipZona || !chipPrezzo) return;

  if (state.zone !== 'all') {
    chipZona.textContent = state.zone === 'Via Poncione' ? 'Poncione' : 'Isola';
    chipZona.classList.add('visible');
  } else {
    chipZona.classList.remove('visible');
  }

  if (state.maxPrice < 650) {
    chipPrezzo.textContent = '≤ ' + state.maxPrice + '€';
    chipPrezzo.classList.add('visible');
  } else {
    chipPrezzo.classList.remove('visible');
  }
}

// ── HISTOGRAM ─────────────────────────────────────────────
const BUCKETS = [300,350,400,450,500,550,600,650];
const N = BUCKETS.length - 1;

function renderHistogram() {
  const zoneRooms = state.zone === "all" ? rooms : rooms.filter(r => r.zone === state.zone);
  const counts = Array(N).fill(0);
  zoneRooms.forEach(r => {
    for (let i = 0; i < N; i++) {
      if (r.price >= BUCKETS[i] && (r.price < BUCKETS[i+1] || i===N-1)) { counts[i]++; break; }
    }
  });
  const maxC = Math.max(...counts, 1);
  document.getElementById("histoBars").innerHTML = counts.map((c, i) => {
    const lo = BUCKETS[i], hi = BUCKETS[i+1] || '650+';
    const inRange = lo < state.maxPrice;
    const h = c > 0 ? Math.max(Math.round((c / maxC) * 100), 18) : 5;
    const tip = c > 0 ? `€${lo}–${hi}: ${c} stanz${c===1?'a':'e'}` : `€${lo}–${hi}: nessuna`;
    return `<div class="hbar ${inRange && c>0 ? 'in' : 'out'}" style="height:${h}%" data-tip="${tip}" title="${tip}"></div>`;
  }).join("");
}

// ── HELPERS ───────────────────────────────────────────────
function getFiltered() {
  return rooms
    .filter(r => (state.zone==="all" || r.zone===state.zone) && r.price <= state.maxPrice)
    .sort((a,b) => state.sortActive ? (state.sortAsc ? a.price-b.price : b.price-a.price) : a.id-b.id);
}
function badgeList(status) {
  if (status==="available") return `<span class="rbadge ba">Disponibile</span>`;
  if (status==="coming")    return `<span class="rbadge bn">↗ In arrivo</span>`;
  return `<span class="rbadge bw">🏗️ Disponibile presto</span>`;
}
function dotClass(status) {
  return status==="available" ? "dot-a" : status==="coming" ? "dot-n" : "dot-w";
}

// ── RENDER LIST ───────────────────────────────────────────
function renderList(filtered) {
  return filtered.map(r => {
    const dim = false; // wip cards shown at full color
    const tags = r.tags.map(t => `<span class="rtag${r.gold.includes(t)?" tg":""}">${t}</span>`).join("");
    return `
    <article class="room-card${r.featured?" featured":""}${dim?" dimmed":""}"
      onclick="openDetail(${r.id})" role="button" tabindex="0"
      onkeydown="if(event.key==='Enter')openDetail(${r.id})">
      <div class="card-header">
        <span class="card-header-left">LECTO ↘</span>
        <span>${r.zone} · ${r.size}</span>
      </div>
      <div class="room-thumb ${r.tc}">${r.thumb}${badgeList(r.status)}</div>
      <div class="room-body">
        <div class="room-name">${r.name}</div>
        <div class="room-desc-row">
          <div class="gold-bar"></div>
          <div class="room-desc-text">${r.desc.substring(0, 80)}${r.desc.length>80?'…':''}</div>
        </div>
        <div class="room-footer">
          <div>
            <div class="room-price"><sup>€</sup>${r.price}<sub>/mese</sub></div>
            <div class="room-price-note">${r.inclusive?"tutto incluso":"+ utenze"}</div>
          </div>
          <div class="room-tags">${tags}</div>
        </div>
      </div>
    </article>`;
  }).join("");
}

// ── RENDER ROW ────────────────────────────────────────────
function renderRow(filtered) {
  const groups = apartments.map(a => ({
    ...a, rooms: filtered.filter(r => r.zone === a.zone)
  })).filter(g => g.rooms.length > 0);
  if (!groups.length) return "";
  return groups.map(g => {
    const allWip = g.rooms.every(r => r.status === 'wip');
    const wipBanner = allWip ? `<div class="wip-notice wip-notice-btn" onclick="openWaitlist()">📅 ${g.wipLabel || 'Disponibili prossimamente'} — Iscriviti alla lista d'attesa ›</div>` : '';
    return `
    <div class="apt-group">
      <div class="apt-group-header">
        <div>
          <div class="apt-group-name">${g.name}</div>
          <div class="apt-group-sub">${g.sub}</div>
        </div>
        <button class="apt-map-btn" onclick="goToMap('${g.zone === 'Via Poncione' ? 'poncione' : 'isola'}')">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#c99a2e" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="2.5"/></svg>
          Vedi in mappa
        </button>
      </div>
      ${wipBanner}
      <div class="apt-row-wrap">
        <div class="apt-row">
          ${g.rooms.map(r => {
            const dim = false;
            const tags = r.tags.slice(0,2).map(t=>`<span class="mtag${r.gold.includes(t)?" tg":""}">${t}</span>`).join("");
            return `
            <article class="mini-card${r.featured?" featured":""}${dim?" dimmed":""}"
              onclick="openDetail(${r.id})" role="button" tabindex="0">
              <div class="mini-thumb ${r.tc}">
                ${roomImages[r.id] ? `<img src="${roomImages[r.id]}" alt="${r.name}" loading="lazy"/>` : r.thumb}
                <div class="mini-dot ${dotClass(r.status)}"></div>
              </div>
              <div class="mini-body">
                <div class="mini-name">${r.name}</div>
                <div class="mini-price"><sup>€</sup>${r.price}<sub>/m</sub></div>
                <div class="mini-note">${r.inclusive?"tutto inc.":"+ utenze"}</div>
                <div class="mini-tags">${tags}</div>
              </div>
            </article>`;
          }).join("")}
        </div>
      </div>
    </div>`;
  }).join("");
}

// ── MAIN RENDER ───────────────────────────────────────────
function render() {
  const filtered = getFiltered();
  document.getElementById("countNum").textContent = filtered.length;
  renderHistogram();

  const rowEl = document.getElementById("aptView");
  const empty = document.getElementById("emptyState");
  const scrollEl = document.getElementById("stanze-scroll-el");
  const savedScroll = scrollEl ? scrollEl.scrollTop : 0;

  if (!filtered.length) {
    rowEl.innerHTML = "";
    empty.classList.add("show");
    return;
  }
  empty.classList.remove("show");
  rowEl.innerHTML = renderRow(filtered);

  if (scrollEl && savedScroll > 0) scrollEl.scrollTop = savedScroll;
}

// ── CONTROLS ─────────────────────────────────────────────
// ── CUSTOM DROPDOWN ────────────────────────────────────────
function toggleDropdown(id, event) {
  if (event) { event.stopPropagation(); }
  const el = document.getElementById(id);
  const isOpen = el.classList.contains('open');
  // Close all dropdowns first
  document.querySelectorAll('.custom-select.open').forEach(d => d.classList.remove('open'));
  if (!isOpen) {
    el.classList.add('open');
    // Position the options panel using fixed coords to avoid iOS scroll-to-top
    const trigger = el.querySelector('.custom-select-trigger');
    const opts = el.querySelector('.custom-select-options');
    const rect = trigger.getBoundingClientRect();
    opts.style.left = rect.left + 'px';
    opts.style.width = rect.width + 'px';
    opts.style.top = rect.bottom + 'px';
  }
}
function selectZone(value, label, optEl, event) {
  if (event) { event.stopPropagation(); event.preventDefault(); }
  state.zone = value;
  document.getElementById('zoneLabel').textContent = label;
  document.querySelectorAll('#zoneDropdown .custom-select-option').forEach(o => o.classList.remove('selected'));
  optEl.classList.add('selected');
  document.getElementById('zoneDropdown').classList.remove('open');
  updateFilterChips();
  render();
}
// Close dropdown on outside click/tap
// Using only 'click' to avoid double-fire on iOS (touchend + click both fire)
document.addEventListener('click', e => {
  if (!e.target.closest('.custom-select')) {
    document.querySelectorAll('.custom-select.open').forEach(d => d.classList.remove('open'));
  }
});

function applyFilters() { render(); }
function updateSlider(val) {
  state.maxPrice = parseInt(val);
  document.getElementById("sliderVal").textContent = val >= 650 ? "650+ €" : val + " €";
  updateFilterChips();
  render();
}
function toggleSort() {
  if (!state.sortActive) {
    state.sortActive = true;
    state.sortAsc = true;
  } else {
    state.sortAsc = !state.sortAsc;
  }
  document.getElementById("sortLabel").textContent = state.sortAsc ? "Prezzo ↑" : "Prezzo ↓";
  render();
}
function resetFilters() {
  state.zone = "all"; state.maxPrice = 650;
  document.getElementById('zoneLabel').textContent = 'Tutte le zone';
  document.querySelectorAll('#zoneDropdown .custom-select-option').forEach((o, i) => o.classList.toggle('selected', i === 0));
  document.getElementById("priceSlider").value = 650;
  document.getElementById("sliderVal").textContent = "650+ €";
  render();
}
function focusFilters() {
  document.getElementById("filtersBar").scrollIntoView({ behavior: "smooth", block: "start" });
  setTimeout(() => document.getElementById('zoneDropdown').querySelector('.custom-select-trigger').click(), 300);
}

// ── SERVICES ICONS ────────────────────────────────────────
const serviceIcons = {
  "Lavastoviglie":        "droplets",
  "Lavatrice":            "washing-machine",
  "Forno":                "flame",
  "Forno a Microonde":    "cooking-pot",
  "Frigorifero e Freezer":"refrigerator",
  "WiFi":                 "wifi",
  "Ascensore":            "arrow-up-down",
  "Smart-TV":             "tv",
  "Utenze (Luce e Gas)":  "zap",
  "Pulizie":              "sparkles",
};

function getServiceIcon(name) {
  const icon = serviceIcons[name] || "circle-help";
  return `<i data-lucide="${icon}"></i>`;
}

function renderServices(r) {
  if (!r.servizi || !r.servizi.length) return '';
  const serviziHTML = r.servizi.map(s => `
    <div class="service-item">
      <div class="service-icon">${getServiceIcon(s)}</div>
      <span class="service-label">${s}</span>
    </div>`).join('');
  const extraHTML = (r.extra && r.extra.length) ? r.extra.map(s => `
    <div class="service-item extra-item">
      <div class="service-icon">${getServiceIcon(s)}</div>
      <span class="service-label">${s}</span>
    </div>`).join('') : '';
  return `
    <div class="detail-divider"></div>
    <div class="detail-services-title gold">Servizi</div>
    <div class="services-grid">${serviziHTML}</div>
    ${extraHTML ? `<div class="detail-services-title navy" style="font-size:1.1rem; margin-top:.25rem;">Extra</div><div class="services-grid">${extraHTML}</div>` : ''}
  `;
}

// ── DETAIL SHEET ─────────────────────────────────────────
function openDetail(id) {
  const r = rooms.find(x => x.id===id); if (!r) return;
  state.activeRoom = id;
  const th = document.getElementById("dThumb");
  if (roomImages[r.id]) {
    th.innerHTML = `<img src="${roomImages[r.id]}" alt="${r.name}" style="width:100%;height:100%;object-fit:cover;object-position:center 25%;display:block;"/>`;
    th.style.background = "";
  } else {
    th.innerHTML = r.thumb;
    th.style.background = r.tc==="tf" ? "linear-gradient(140deg,#143654,#2a6fa8)"
                         : r.tc==="tw" ? "linear-gradient(140deg,#d8d5cc,#c8c5bc)"
                         : "linear-gradient(140deg,#0d2438,#1d4d78)";
  }
  document.getElementById("dZone").textContent  = r.zone + " · " + r.size;
  document.getElementById("dName").textContent  = r.name;
  document.getElementById("dPrice").textContent = `€ ${r.price}`;
  document.getElementById("dNote").textContent  = r.inclusive ? "tutto incluso — nessuna spesa extra" : "utenze escluse (condivise)";
  document.getElementById("dDesc").textContent  = r.desc;
  document.getElementById("dServices").innerHTML = renderServices(r);
  lucide.createIcons();
  document.getElementById("dFeats").innerHTML   = r.tags.map(t=>`<span class="dfeat${r.gold.includes(t)?" tg":""}">${t}</span>`).join("");
  const wip = r.status==="wip";
  document.getElementById("dCtaTxt").textContent = wip ? "Iscriviti alla lista d'attesa ›" : r.status==="coming" ? "Prenota in anteprima ↗" : "Contattaci ↗";
  const cta = document.getElementById("dCta");
  cta.style.background = "";
  cta.style.color = "";
  cta.style.cursor = "";
  document.getElementById("detailOverlay").classList.add("open");
  document.body.style.overflow = "hidden";
}
function closeDetail(e) {
  if (e && e.target !== document.getElementById("detailOverlay")) return;
  document.getElementById("detailOverlay").classList.remove("open");
  document.body.style.overflow = ""; state.activeRoom = null;
}
function handleCta() {
  const r = rooms.find(x => x.id===state.activeRoom);
  if (!r) return;
  if (r.status==="wip") {
    closeDetail(null);
    setTimeout(openWaitlist, 320);
    return;
  }
  window.open("https://www.instagram.com/lecto2025", "_blank");
  closeDetail(null);
}

document.addEventListener("keydown", e => { if (e.key==="Escape") closeDetail(null); });

// ── HAMBURGER MENU ───────────────────────────────────────
function toggleMenu(event) {
  event.stopPropagation();
  const btn = document.getElementById('menuBtn');
  const dropdown = document.getElementById('menuDropdown');
  const wrap = document.getElementById('menuWrap');
  const isOpen = dropdown.classList.contains('open');

  if (!isOpen) {
    // Position dropdown relative to button
    const rect = wrap.getBoundingClientRect();
    dropdown.style.top = rect.bottom + 'px';
    dropdown.style.right = (window.innerWidth - rect.right) + 'px';
    dropdown.style.left = 'auto';
  }

  btn.classList.toggle('open', !isOpen);
  dropdown.classList.toggle('open', !isOpen);
}

document.addEventListener('click', e => {
  if (!e.target.closest('#menuWrap')) {
    document.getElementById('menuBtn').classList.remove('open');
    document.getElementById('menuDropdown').classList.remove('open');
  }
});

// ── CHI SIAMO ─────────────────────────────────────────────
function toggleChiSiamo() {
  document.getElementById('chiSiamoOverlay').classList.add('open');
}
function closeChiSiamo(e) {
  if (e && e.target !== document.getElementById('chiSiamoOverlay')) return;
  document.getElementById('chiSiamoOverlay').classList.remove('open');
}

// ── FAQ ───────────────────────────────────────────────────
function toggleFaq() {
  document.getElementById('faqOverlay').classList.add('open');
}
function closeFaq(e) {
  if (e && e.target !== document.getElementById('faqOverlay')) return;
  document.getElementById('faqOverlay').classList.remove('open');
}

// ── CONTATTI ─────────────────────────────────────────────
function toggleContatti(btn) {
  const overlay = document.getElementById('contattiOverlay');
  const isOpen = overlay.classList.contains('open');
  if (isOpen) {
    overlay.classList.remove('open');
    if (btn) btn.classList.remove('active');
  } else {
    overlay.classList.add('open');
    if (btn) btn.classList.add('active');
  }
}

function closeContatti(e) {
  if (e && e.target !== document.getElementById('contattiOverlay')) return;
  document.getElementById('contattiOverlay').classList.remove('open');
  document.querySelectorAll('.nav-item').forEach(n => {
    if (n.getAttribute('onclick') && n.getAttribute('onclick').includes('toggleContatti')) {
      n.classList.remove('active');
    }
  });
}

// ── FORWARD SCROLL FROM HERO/FILTERS TO SCROLL CONTAINER ──
document.addEventListener('DOMContentLoaded', () => {
  const scrollEl = document.getElementById('stanze-scroll-el');
  const hero     = document.getElementById('heroStrip');
  const filters  = document.getElementById('filtersBar');
  if (!scrollEl || !hero || !filters) return;

  let _touchStartY = 0;

  function forwardTouchStart(e) {
    _touchStartY = e.touches[0].clientY;
  }

  function forwardTouchMove(e) {
    const dy = _touchStartY - e.touches[0].clientY;
    _touchStartY = e.touches[0].clientY;
    scrollEl.scrollTop += dy;
    // Prevent default only if we actually scrolled
    if (Math.abs(dy) > 0) e.preventDefault();
  }

  [hero, filters].forEach(el => {
    el.addEventListener('touchstart', forwardTouchStart, { passive: true });
    el.addEventListener('touchmove', forwardTouchMove, { passive: false });
  });
});

// ── LISTA D'ATTESA ────────────────────────────────────────

function buildWaitlistForm() {
  const cfg = WAITLIST_CONFIG;
  const req = '<span class="wl-req">*</span>';

  // Raggruppa i campi half consecutivi in righe a 2 colonne
  const rows = [];
  let i = 0;
  while (i < cfg.fields.length) {
    const f = cfg.fields[i];
    if (f.half && cfg.fields[i + 1]?.half) {
      rows.push({ type: 'row2', fields: [f, cfg.fields[i + 1]] });
      i += 2;
    } else {
      rows.push({ type: 'single', fields: [f] });
      i++;
    }
  }

  function renderField(f) {
    const label = `<label class="wl-label" for="${f.id}">${f.label}${f.required ? ' ' + req : ''}</label>`;
    let input;
    if (f.type === 'select') {
      const opts = f.options.map(o => `<option>${o}</option>`).join('');
      input = `<select class="wl-input wl-select" id="${f.id}"><option value="">Seleziona…</option>${opts}</select>`;
    } else if (f.type === 'textarea') {
      input = `<textarea class="wl-input wl-textarea" id="${f.id}" placeholder="${f.placeholder || ''}" rows="${f.rows || 3}"></textarea>`;
    } else {
      const ac = f.autocomplete ? ` autocomplete="${f.autocomplete}"` : '';
      input = `<input class="wl-input" id="${f.id}" type="${f.type}" placeholder="${f.placeholder || ''}"${ac}/>`;
    }
    return `<div class="wl-field">${label}${input}</div>`;
  }

  const bodyHtml = rows.map(r =>
    r.type === 'row2'
      ? `<div class="wl-row-2">${r.fields.map(renderField).join('')}</div>`
      : renderField(r.fields[0])
  ).join('');

  document.getElementById('waitlistForm').innerHTML = `
    <div class="contatti-header">
      <div class="contatti-title">${cfg.title}</div>
      <button class="contatti-close" onclick="closeWaitlist(null)">✕</button>
    </div>
    <div class="waitlist-intro">${cfg.intro}</div>
    <div class="waitlist-body">
      ${bodyHtml}
      <div class="wl-error" id="wlError"></div>
      <button class="detail-cta wl-submit" id="wlSubmitBtn" onclick="submitWaitlist()">
        ${cfg.submitLabel}
      </button>
    </div>`;

  document.getElementById('waitlistSuccess').innerHTML = `
    <div class="contatti-header">
      <div class="contatti-title">${cfg.title}</div>
      <button class="contatti-close" onclick="closeWaitlist(null)">✕</button>
    </div>
    <div class="wl-success">
      <div class="wl-success-icon">✓</div>
      <div class="wl-success-title">${cfg.successTitle}</div>
      <div class="wl-success-sub">${cfg.successSub}</div>
    </div>`;
}

function openWaitlist() {
  document.getElementById('waitlistOverlay').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeWaitlist(e) {
  if (e && e.target !== document.getElementById('waitlistOverlay')) return;
  document.getElementById('waitlistOverlay').classList.remove('open');
  document.body.style.overflow = '';
  // reset form dopo l'animazione di chiusura
  setTimeout(() => {
    document.getElementById('waitlistForm').style.display = '';
    document.getElementById('waitlistSuccess').style.display = 'none';
    document.getElementById('wlError').textContent = '';
    document.getElementById('wlSubmitBtn').disabled = false;
    document.getElementById('wlSubmitBtn').textContent = WAITLIST_CONFIG.submitLabel;
    WAITLIST_CONFIG.fields.forEach(f => {
      const el = document.getElementById(f.id);
      if (el) el.value = '';
    });
  }, 350);
}

async function submitWaitlist() {
  const cfg    = WAITLIST_CONFIG;
  const errEl  = document.getElementById('wlError');

  // Valida campi obbligatori
  const missing = cfg.fields.filter(f => f.required && !document.getElementById(f.id)?.value.trim());
  if (missing.length) {
    errEl.textContent = 'Compila tutti i campi obbligatori (*)';
    return;
  }
  const emailField = cfg.fields.find(f => f.type === 'email');
  if (emailField) {
    const val = document.getElementById(emailField.id).value.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
      errEl.textContent = 'Inserisci un indirizzo email valido.';
      return;
    }
  }
  errEl.textContent = '';

  // Costruisce payload con le chiavi attese dal GAS (wlNome, wlEmail, …)
  const payload = {};
  cfg.fields.forEach(f => {
    const el = document.getElementById(f.id);
    if (el) payload[f.id] = el.value.trim();
  });

  const btn = document.getElementById('wlSubmitBtn');
  btn.disabled = true;
  btn.textContent = 'Invio in corso…';

  try {
    // Salva in localStorage come backup
    const lista = JSON.parse(localStorage.getItem('waitlist') || '[]');
    lista.push({ ...payload, ts: new Date().toISOString() });
    localStorage.setItem('waitlist', JSON.stringify(lista));

    if (cfg.endpoint) {
      // Google Apps Script + no-cors: occorre Content-Type: text/plain
      // (application/json non è un "simple header" e viene bloccato dal browser).
      // Il corpo è comunque JSON valido e GAS lo legge via e.postData.contents.
      try {
        await fetch(cfg.endpoint, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'text/plain' },
          body: JSON.stringify(payload),
        });
      } catch (_) {
        // errore di rete: i dati sono già salvati in localStorage
      }
    }

    document.getElementById('waitlistForm').style.display = 'none';
    document.getElementById('waitlistSuccess').style.display = '';
  } catch (err) {
    // Errore JS inatteso: ripristina il pulsante e mostra un messaggio
    btn.disabled = false;
    btn.textContent = cfg.submitLabel;
    errEl.textContent = 'Si è verificato un errore. Riprova.';
  }
}

// ── INIT ──────────────────────────────────────────────────
buildWaitlistForm();
render();

// On tablet/desktop the map panel is always visible (split layout),
// so initialize Leaflet immediately without waiting for tab click.
if (window.matchMedia('(min-width: 640px)').matches) {
  requestAnimationFrame(() => requestAnimationFrame(() => initMap()));
}
