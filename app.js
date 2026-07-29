// ===== Moth app (Snapchat-style shell) =====
const state = {
  spots: [],          // populated by initMoth() in pb.js (backend or offline fallback)
  online: false,
  mode: localStorage.getItem("moth.mode") || "cool",  // "cool" (bars/food/coffee) or "urbex" (abandoned)
  filter: "all",
  sketchFilter: null, // "chill" (<=2) | "sketchy" (>=4) | null
  search: "",
  placing: false,
  pendingLatLng: null,
  reviewStars: 5,
  openSpotId: null,
  likes: JSON.parse(localStorage.getItem("moth.likes") || "{}"),
};

function loadSpots() {
  try {
    const saved = JSON.parse(localStorage.getItem("moth.spots.v2"));
    if (Array.isArray(saved) && saved.length) return saved;
  } catch (e) {}
  return JSON.parse(JSON.stringify(SEED_SPOTS));
}
function saveSpots() { localStorage.setItem("moth.spots.v2", JSON.stringify(state.spots)); }

function avgStars(s) {
  if (!s.reviews.length) return 0;
  return s.reviews.reduce((a, r) => a + r.stars, 0) / s.reviews.length;
}
// Prefer the real Google/Yelp rating when we have it; fall back to review average.
function rateOf(s) {
  const ex = (window.SPOT_EXTRAS && window.SPOT_EXTRAS[s.id]) || {};
  const real = (typeof s.rating === "number" && s.rating > 0) ? s.rating
    : (typeof ex.rating === "number" && ex.rating > 0) ? ex.rating : 0;
  return real || avgStars(s);
}
function starStr(n) {
  const full = Math.round(n);
  return "★".repeat(full) + "☆".repeat(5 - full);
}
const SKETCH_WORDS = ["", "Chill", "Easy", "Moderate", "Sketchy", "Extreme"];

// ===== Theme: night only. One look, always dark. =====
const savedTheme = "night";
document.documentElement.dataset.theme = "night";

// ===== Map =====
const map = L.map("map", {
  zoomControl: false,
  // Continuous zoom: no snapping to whole levels, so pinch and wheel glide
  // instead of clunking between steps.
  zoomSnap: 0, zoomDelta: 1,                // a tap/button moves a full level
  // Leaflet does not scale linearly here: it runs the wheel delta through a
  // log curve, so the effective levels-per-notch is well under delta/px. At 20
  // a normal 100px notch lands around 2.5 levels, which actually feels fast.
  wheelPxPerZoomLevel: 20,
  wheelDebounceTime: 0,                     // no waiting, every scroll registers instantly
  bounceAtZoomLimits: false,                // no rubber-band snap at the ends
  zoomAnimation: true, zoomAnimationThreshold: 12,
  fadeAnimation: true, markerZoomAnimation: true,
  inertia: true, inertiaDeceleration: 2400, easeLinearity: 0.22,
}).setView([32.79, -96.82], 12);

// Snap Map approach: a LIGHT, richly labeled basemap (streets, businesses,
// neighborhoods all readable) with the app's dark UI floating on top. A dark
// map under dark chrome hides everything, which is the opposite of useful.
// CARTO Voyager: compared side by side against raw OSM, Positron and Esri, this
// is the one that is both PRETTY and detailed. Cream base, clean white roads,
// real building footprints, street labels drawn ON TOP (the old
// voyager_labels_under hid names behind buildings, which is why names only
// showed when zoomed out).
const TILE_URL = "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";
let tileLayer = null;
function setBasemap() {
  if (tileLayer) map.removeLayer(tileLayer);
  tileLayer = L.tileLayer(TILE_URL, {
    attribution: '&copy; OpenStreetMap &copy; CARTO',
    maxZoom: 21, maxNativeZoom: 20,
    detectRetina: false,      // half the requests = tiles land before you see gaps
    updateWhenIdle: false, updateWhenZooming: false,
    keepBuffer: 4,            // hold a ring of off-screen tiles so panning is seamless
  }).addTo(map);
}
setBasemap();

// The old blue "heat glow" circles are gone on purpose: they buried the streets
// and told you nothing the pins do not already say.
function renderGlow() {}

const cluster = L.markerClusterGroup({
  showCoverageOnHover: false,
  // Break apart early and easily. A tight cluster you have to fight to open is
  // worse than a few overlapping pins.
  maxClusterRadius: 30,
  disableClusteringAtZoom: 15,   // real pins as soon as you are into a neighborhood
  spiderfyOnMaxZoom: true,
  spiderfyDistanceMultiplier: 1.6,
  animateAddingMarkers: false,
  iconCreateFunction: c => L.divIcon({
    className: "",
    html: `<div class="bubble-cluster">${c.getChildCount()}</div>`,
    iconSize: [46, 46], iconAnchor: [23, 23],
  }),
});
map.addLayer(cluster);

// Keep the map correctly sized on resize / rotate / mobile address-bar changes
let _resizeT;
function fixMapSize() { clearTimeout(_resizeT); _resizeT = setTimeout(() => { try { map.invalidateSize(); } catch (e) {} }, 150); }
window.addEventListener("resize", fixMapSize);
window.addEventListener("orientationchange", () => setTimeout(fixMapSize, 300));
if (window.visualViewport) window.visualViewport.addEventListener("resize", fixMapSize);

// Presence: who's here right now (demo data)
const HERE = { 3: 4, 4: 3, 8: 6, 9: 2, 12: 1 };
function hereCount(s) { return HERE[s.id] || 0; }

// ===== Visual identity: real photo, else a clean category logo =====
// Fake stock photos are intentionally ignored. A spot's face is its category
// logo unless we hold a REAL licensed photo (photoCredit). Any video plays on tap.
const CAT_ICON = {
  abandoned: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M4 11l8-6 8 6"/><path d="M6 10v9h12v-9"/><path d="M10 19v-4h4v4"/><path d="M9 8l1.6 1.8M14.5 12.5l1.5 1.5"/></svg>',
  tunnel:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20v-6a8 8 0 0 1 16 0v6"/><path d="M9 20v-3a3 3 0 0 1 6 0v3"/></svg>',
  rooftop:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18"/><path d="M6 21V8l5-3v16"/><path d="M11 21V11l7-3v13"/></svg>',
  bar:       '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M5 4h14l-7 8z"/><path d="M12 12v6"/><path d="M8 21h8"/></svg>',
  coffee:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8h13v4a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5z"/><path d="M17 9h2a2 2 0 0 1 0 4h-2"/><path d="M8 3v2.5M11 3v2.5M14 3v2.5"/></svg>',
  food:      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9a8 4 0 0 1 16 0z"/><path d="M5 12h14"/><path d="M5 15h14a7 3 0 0 1-14 0z"/></svg>',
  hangout:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M5 11V9a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v2"/><path d="M3 11a2 2 0 0 1 2 2v3h14v-3a2 2 0 0 1 2-2"/><path d="M6 19v2M18 19v2"/></svg>',
  nature:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l5 7h-3l3 5H7l3-5H7z"/><path d="M12 15v6"/></svg>',
};
// Distinct, meaningful color per category so a glance tells you what it is.
const CAT_COLOR = {
  abandoned: "#5c6b7a",  // slate
  tunnel:    "#3b424b",  // dark gray
  rooftop:   "#4b5c8a",  // indigo
  bar:       "#7a4bc4",  // purple
  coffee:    "#8a5a3c",  // brown
  food:      "#e0733a",  // orange
  hangout:   "#2f8f8a",  // teal
  nature:    "#3a9d5d",  // green
};
function catColor(cat) { return CAT_COLOR[cat] || "#5c6b7a"; }
function catLogo(cat) { return `<span class="cat-logo">${CAT_ICON[cat] || CAT_ICON.abandoned}</span>`; }
function realPhoto(s) { return (s.photoCredit && s.photos && s.photos.length) ? s.photos[0] : null; }
// Video preview thumbnail (TikTok oEmbed frame) shown as a credited link-preview.
function videoThumb(s) { return (window.VIDEO_THUMBS && window.VIDEO_THUMBS[s.id]) || null; }
// The image to show as a spot's face: a real licensed photo wins, else a video
// preview frame, else nothing (falls back to the category logo).
function previewImg(s) { return realPhoto(s) || (videoThumb(s) ? videoThumb(s).thumb : null); }
function hasVideo(s) { return (s.embeds || []).some(e => e.type === "tiktok" || e.type === "instagram"); }
function firstVideoUrl(s) { const e = (s.embeds || []).find(e => e.type === "tiktok" || e.type === "instagram"); return e ? e.url : null; }
function faceStyle(s) {
  const p = previewImg(s);
  return p ? `style="background-image:url('${p}')"` : `style="background:${catColor(s.cat)}"`;
}
function faceInner(s) { return previewImg(s) ? "" : catLogo(s.cat); }
function playBadge(s) { return hasVideo(s) ? `<span class="play-badge">▶</span>` : ""; }

function pinFace(s) { return faceStyle(s); }
function renderMarkers() {
  cluster.clearLayers();
  visibleSpots().forEach(s => {
    // Name rides under the pin, like Snap Map labels its places. Our curated
    // spots ARE the POIs, so this is where the business names come from.
    const icon = L.divIcon({
      className: "",
      html: `<div class="pin-wrap"><div class="bubble-pin ${s.sponsored ? "sponsored" : ""} ${s.id === state.openSpotId ? "selected" : ""}" data-sid="${s.id}" ${pinFace(s)}>${faceInner(s)}${playBadge(s)}${hereCount(s) ? `<span class="here-dot">${hereCount(s)}</span>` : ""}${s.sponsored ? `<span class="sponsor-tag">Featured</span>` : ""}</div><span class="pin-label">${s.name}</span></div>`,
      iconSize: [48, 48], iconAnchor: [24, 24],
    });
    const m = L.marker([s.lat, s.lng], { icon });
    m.on("click", () => openSheet(s.id));
    cluster.addLayer(m);
  });
  const sc = document.getElementById("spotCount");
  if (sc) sc.textContent = visibleSpots().length;   // badge removed from map screen
  syncLabelZoom();
}
// Names appear once you are close enough for them not to collide.
function syncLabelZoom() {
  document.body.classList.toggle("show-pin-labels", map.getZoom() >= 14);
}
// Redraw only when the reveal tier actually changes, so zooming stays smooth
// instead of rebuilding every pin on every tick.
let lastShare = null;
map.on("zoomend", () => {
  syncLabelZoom();
  const share = revealShare();
  if (share !== lastShare) { lastShare = share; renderMarkers(); }
});
// Lift + ring the selected pin without a full re-render
function highlightSelectedPin() {
  document.querySelectorAll(".bubble-pin").forEach(p => {
    p.classList.toggle("selected", +p.dataset.sid === state.openSpotId);
  });
}

// ===== In-app directions: route ON our own map (OSRM) with a full nav readout =====
// Destination-only link (fallback when we don't have the user's location yet).
function extMapsUrl(s) { return `https://www.google.com/maps/dir/?api=1&destination=${s.lat},${s.lng}`; }
// Real turn-by-turn handoff: opens the phone's Maps app straight into navigation.
function extNavUrl(s, from) {
  const origin = from ? `&origin=${from.lat},${from.lng}` : "";
  return `https://www.google.com/maps/dir/?api=1${origin}&destination=${s.lat},${s.lng}&travelmode=driving&dir_action=navigate`;
}
function accentColor() { return (getComputedStyle(document.body).getPropertyValue("--accent") || "#35bdf7").trim(); }

function fmtDuration(seconds) {
  const m = Math.max(1, Math.round(seconds / 60));
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60), r = m % 60;
  return r ? `${h} hr ${r} min` : `${h} hr`;
}
function fmtEta(seconds) {
  return new Date(Date.now() + seconds * 1000)
    .toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}
// Arrow glyph for a maneuver, matched to how every maps app draws it.
function maneuverArrow(m) {
  if (!m) return "→";
  if (m.type === "depart") return "●";
  if (m.type === "arrive") return "◎";
  if (m.type === "roundabout" || m.type === "rotary") return "↻";
  const mod = m.modifier || "";
  if (mod.includes("uturn")) return "↩";
  if (mod === "sharp left" || mod === "slight left" || mod === "left") return "↰";
  if (mod === "sharp right" || mod === "slight right" || mod === "right") return "↱";
  return "↑";
}
// Human sentence for an OSRM step (OSRM gives type/modifier/road name, not prose).
function maneuverText(step, destName) {
  const m = step.maneuver || {}, road = step.name || "";
  const onRoad = road ? ` onto ${road}` : "";
  const onRoad2 = road ? ` on ${road}` : "";
  switch (m.type) {
    case "depart":   return `Head ${m.modifier || "out"}${onRoad2}`;
    case "turn":     return `Turn ${m.modifier || ""}${onRoad}`.replace(/\s+/g, " ").trim();
    case "merge":    return `Merge${m.modifier ? " " + m.modifier : ""}${onRoad}`;
    case "on ramp":  return `Take the ramp${m.modifier ? " " + m.modifier : ""}${onRoad}`;
    case "off ramp": return `Take the exit${m.modifier ? " " + m.modifier : ""}${onRoad}`;
    case "fork":     return `Keep ${m.modifier || "straight"}${onRoad}`;
    case "end of road": return `Turn ${m.modifier || ""}${onRoad}`.replace(/\s+/g, " ").trim();
    case "roundabout":
    case "rotary":   return `Enter the roundabout${m.exit ? `, take exit ${m.exit}` : ""}${onRoad}`;
    case "continue":
    case "new name": return `Continue${onRoad2}`;
    case "arrive":   return `Arrive at ${destName || "your spot"}`;
    default:         return `${m.type || "Continue"}${m.modifier ? " " + m.modifier : ""}${onRoad}`;
  }
}

function clearRoute() {
  endDrive();
  state.pendingRoute = null;
  document.getElementById("routeBanner").classList.remove("open");
}
// ===== Drive mode: real in-app turn-by-turn =====
// Follows you at street zoom, calls the next maneuver, advances steps as you
// pass them, and re-routes when you leave the line. No handoff to Maps.
const nav = { on: false, steps: [], i: 0, dest: null, watch: null, line: null, me: null, lastReroute: 0 };

function fmtFeet(m) {
  if (m >= 1609.34) return `${(m / 1609.34).toFixed(1)} mi`;
  if (m >= 305) return `${(Math.round(m / 0.3048 / 100) * 100)} ft`;
  return `${Math.max(50, Math.round(m / 0.3048 / 10) * 10)} ft`;
}
function navHud() { return document.getElementById("navHud"); }

function drawRoute(route) {
  if (nav.line) map.removeLayer(nav.line);
  const line = route.geometry.coordinates.map(c => [c[1], c[0]]);
  // Casing under the route so it reads on any street color.
  nav.line = L.layerGroup([
    L.polyline(line, { color: "#0b0f16", weight: 11, opacity: .9, lineCap: "round", lineJoin: "round" }),
    L.polyline(line, { color: accentColor(), weight: 6, opacity: 1, lineCap: "round", lineJoin: "round" }),
  ]).addTo(map);
  nav.steps = (route.legs && route.legs[0] && route.legs[0].steps) || [];
  nav.i = 0;
  return line;
}

async function fetchRoute(from, to) {
  const url = `https://router.project-osrm.org/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}`
            + `?overview=full&geometries=geojson&steps=true`;
  const j = await (await fetch(url)).json();
  if (!j.routes || !j.routes.length) throw new Error("no route");
  return j.routes[0];
}

function stepPoint(st) {
  const l = st && st.maneuver && st.maneuver.location;
  return l ? { lat: l[1], lng: l[0] } : null;
}

// Distance from the user to the route line, to detect going off course.
function metersOffRoute(lat, lng) {
  if (!nav.steps.length) return 0;
  let best = Infinity;
  for (let k = nav.i; k < Math.min(nav.i + 3, nav.steps.length); k++) {
    const geo = nav.steps[k].geometry && nav.steps[k].geometry.coordinates;
    if (!geo) continue;
    for (const c of geo) best = Math.min(best, map.distance([lat, lng], [c[1], c[0]]));
  }
  return best === Infinity ? 0 : best;
}

// Drop a marker on the map exactly where the next turn happens, so you can SEE
// the turn coming, not just read it.
function setTurnMarker(p, arrow) {
  if (!p) { if (nav.turn) { map.removeLayer(nav.turn); nav.turn = null; } return; }
  const icon = L.divIcon({
    className: "", iconSize: [38, 38], iconAnchor: [19, 19],
    html: `<div class="turn-pin">${arrow}</div>`,
  });
  if (nav.turn) { nav.turn.setLatLng([p.lat, p.lng]); nav.turn.setIcon(icon); }
  else nav.turn = L.marker([p.lat, p.lng], { icon, zIndexOffset: 950, interactive: false }).addTo(map);
}

function renderNavHud(lat, lng) {
  const hud = navHud();
  if (!hud || !nav.steps.length) return;
  const st = nav.steps[Math.min(nav.i, nav.steps.length - 1)];
  const next = nav.steps[nav.i + 1];
  const p = stepPoint(next || st);
  const toManeuver = p ? map.distance([lat, lng], [p.lat, p.lng]) : 0;
  const toDest = map.distance([lat, lng], [nav.dest.lat, nav.dest.lng]);
  const arrow = maneuverArrow((next || st).maneuver);

  document.getElementById("navArrow").textContent = arrow;
  document.getElementById("navInstr").textContent = maneuverText(next || st, nav.dest.name);
  document.getElementById("navDist").textContent = fmtFeet(toManeuver);
  const mins = Math.max(1, Math.round((toDest / 1609.34) / 0.5));
  document.getElementById("navEta").textContent =
    `${(toDest / 1609.34).toFixed(1)} mi · ~${mins} min · ${fmtEta(mins * 60)}`;
  const after = nav.steps[nav.i + 2];
  document.getElementById("navThen").textContent =
    after ? `then ${maneuverText(after, nav.dest.name)}` : "";

  setTurnMarker(p, arrow);
  // Close in as the turn approaches, like a real guide talking you through it.
  const wantZoom = toManeuver < 120 ? 19 : toManeuver < 400 ? 18 : 17;
  if (map.getZoom() !== wantZoom) map.setZoom(wantZoom, { animate: false });

  // Advance once we are on top of the maneuver.
  if (p && toManeuver < 35 && nav.i < nav.steps.length - 1) nav.i++;
}

async function reroute(lat, lng) {
  const now = Date.now ? 0 : 0;                      // Date.now avoided; throttle by flag
  if (nav.rerouting) return;
  nav.rerouting = true;
  try {
    toast("Re-routing…");
    const route = await fetchRoute({ lat, lng }, nav.dest);
    drawRoute(route);
    renderNavHud(lat, lng);
  } catch (e) { /* keep the old line if the reroute fails */ }
  nav.rerouting = false;
}

function startDrive(s, route, from) {
  nav.on = true; nav.dest = s;
  document.body.classList.add("driving");
  closeSheet();
  document.getElementById("routeBanner").classList.remove("open");
  navHud().classList.add("open");

  if (!nav.me) {
    nav.me = L.marker([from.lat, from.lng], {
      icon: L.divIcon({ className: "", iconSize: [40, 40], iconAnchor: [20, 20],
        html: `<div class="nav-me" style="--me:${state.avatar.color}"></div>` }),
      zIndexOffset: 1000, interactive: false,
    }).addTo(map);
  }
  map.setView([from.lat, from.lng], 18, { animate: false });  // snap in tight on you, like a real guide
  renderNavHud(from.lat, from.lng);

  if (nav.watch) navigator.geolocation.clearWatch(nav.watch);
  nav.watch = navigator.geolocation.watchPosition((pos) => {
    if (!nav.on) return;
    const lat = pos.coords.latitude, lng = pos.coords.longitude;
    nav.me.setLatLng([lat, lng]);
    map.panTo([lat, lng], { animate: true, duration: 0.9 });

    if (map.distance([lat, lng], [s.lat, s.lng]) < 55) {   // arrived
      document.getElementById("navInstr").textContent = `You've arrived at ${s.name}`;
      document.getElementById("navArrow").textContent = "★";
      document.getElementById("navDist").textContent = "";
      document.getElementById("navThen").textContent = "";
      toast(`Welcome to ${s.name} 🎉`);
      if (nav.watch) { navigator.geolocation.clearWatch(nav.watch); nav.watch = null; }
      return;
    }
    if (metersOffRoute(lat, lng) > 60) reroute(lat, lng);
    else renderNavHud(lat, lng);
  }, null, { enableHighAccuracy: true, maximumAge: 2000, timeout: 15000 });
}

function endDrive() {
  nav.on = false;
  document.body.classList.remove("driving");
  const hud = navHud(); if (hud) hud.classList.remove("open");
  if (nav.watch) { navigator.geolocation.clearWatch(nav.watch); nav.watch = null; }
  if (nav.line) { map.removeLayer(nav.line); nav.line = null; }
  if (nav.me) { map.removeLayer(nav.me); nav.me = null; }
  if (nav.turn) { map.removeLayer(nav.turn); nav.turn = null; }
  nav.steps = []; nav.i = 0; nav.dest = null;
}
function showRouteBanner(s, route, from) {
  const mi = (route.distance / 1609.34).toFixed(1);
  document.getElementById("rbName").textContent = s.name;
  document.getElementById("rbMeta").innerHTML =
    `<span class="rb-eta">${fmtEta(route.duration)}</span>` +
    `<span class="rb-dot">·</span>${fmtDuration(route.duration)}` +
    `<span class="rb-dot">·</span>${mi} mi`;
  // Turn-by-turn steps (skip the trailing zero-distance duplicates OSRM emits).
  const steps = (route.legs && route.legs[0] && route.legs[0].steps) || [];
  document.getElementById("rbSteps").innerHTML = steps.map((st, i) => {
    const last = i === steps.length - 1;
    const dist = st.distance >= 1609.34 ? `${(st.distance / 1609.34).toFixed(1)} mi`
               : st.distance > 0 ? `${Math.round(st.distance / 0.3048)} ft` : "";
    return `<li class="rb-step">
      <span class="rb-arrow">${maneuverArrow(st.maneuver)}</span>
      <span class="rb-instr">${maneuverText(st, s.name)}</span>
      ${dist && !last ? `<small>${dist}</small>` : ""}
    </li>`;
  }).join("");
  // Start drives IN the app now. Maps stays as an escape hatch.
  const start = document.getElementById("rbStart");
  start.removeAttribute("href");
  start.onclick = () => {
    const p = state.pendingRoute;
    if (p) startDrive(p.s, p.route, p.from);
  };
  document.getElementById("rbExt").href = extMapsUrl(s);
  document.getElementById("routeBanner").classList.add("open");
}
function routeToSpot(s) {
  clearRoute();
  // Geolocation only works on a secure (https) page. The PocketBase http copy
  // can't use it, so hand off to Maps with a clear reason.
  if (!navigator.geolocation || !window.isSecureContext) {
    if (navigator.geolocation && !window.isSecureContext)
      toast("Open the https link to route in-app — opening Maps");
    window.open(extNavUrl(s), "_blank"); return;
  }
  toast("Finding your location…");
  navigator.geolocation.getCurrentPosition(async (pos) => {
    const lat = pos.coords.latitude, lng = pos.coords.longitude;
    try {
      const route = await fetchRoute({ lat, lng }, s);
      drawRoute(route);
      closeSheet();
      map.fitBounds(L.latLngBounds(route.geometry.coordinates.map(c => [c[1], c[0]])), { padding: [70, 90] });
      state.pendingRoute = { s, route, from: { lat, lng } };
      showRouteBanner(s, route, { lat, lng });   // preview + Start
    } catch (e) {
      toast("Couldn't draw the route — opening Maps");
      window.open(extNavUrl(s), "_blank");
    }
  }, (err) => {
    toast(err && err.code === 1
      ? "Turn on location for this site to route in-app — opening Maps"
      : "Couldn't get your location — opening Maps");
    window.open(extNavUrl(s), "_blank");
  }, { enableHighAccuracy: false, timeout: 12000, maximumAge: 60000 });
}
document.getElementById("rbClose").onclick = clearRoute;
document.getElementById("navEnd").onclick = clearRoute;

// Zoom buttons. A press moves a clean whole level in either direction.
function stepZoom(dir) {
  const target = Math.round(map.getZoom()) + dir;
  map.setZoom(Math.max(map.getMinZoom(), Math.min(map.getMaxZoom(), target)));
}
document.getElementById("zoomIn").onclick = () => stepZoom(1);
document.getElementById("zoomOut").onclick = () => stepZoom(-1);

// ===== Story strip =====
function renderStories() {
  // Cool mode leads with what's buzzing; Abandoned leads with the sketchiest.
  const inMode = state.spots.filter(s => spotMode(s.cat) === state.mode);
  inMode.sort((a, b) => state.mode === "urbex"
    ? (b.danger + avgStars(b)) - (a.danger + avgStars(a))
    : (hereCount(b) + avgStars(b)) - (hereCount(a) + avgStars(a)));
  const hot = inMode.slice(0, 8);
  document.getElementById("storyStrip").innerHTML = hot.map(s => {
    const seen = (JSON.parse(localStorage.getItem("moth.seenStories") || "[]")).includes(s.id);
    return `<button class="story ${seen ? "seen" : ""}" data-id="${s.id}">
      <span class="story-ring"><span class="story-face" ${faceStyle(s)}>${faceInner(s)}${playBadge(s)}</span></span>
      <span class="story-name">${s.name.split(" ").slice(0, 2).join(" ")}</span>
    </button>`;
  }).join("");
  document.querySelectorAll(".story").forEach(b => b.onclick = () => openStory(+b.dataset.id));
}

// ===== Story viewer (Snapchat tap-through) =====
const sv = {
  el: document.getElementById("storyViewer"),
  idx: 0, spot: null, timer: null,
};
function openStory(id) {
  const s = state.spots.find(x => x.id === id);
  if (!s || !realPhoto(s)) { openSheet(id); return; }  // no real photo -> straight to the sheet (which shows the video)
  sv.spot = s; sv.idx = 0;
  document.getElementById("svFace").style.background = CAT_META[s.cat].grad;
  document.getElementById("svFace").textContent = CAT_META[s.cat].emoji;
  document.getElementById("svName").textContent = s.name;
  document.getElementById("svMeta").textContent = `ZIP ${s.zip} · ${SKETCH_WORDS[s.danger]}`;
  const seen = JSON.parse(localStorage.getItem("moth.seenStories") || "[]");
  if (!seen.includes(s.id)) { seen.push(s.id); localStorage.setItem("moth.seenStories", JSON.stringify(seen)); }
  sv.el.classList.add("open");
  showStoryFrame();
}
const SV_DUR = 5000;
function showStoryFrame() {
  const s = sv.spot;
  const media = document.getElementById("svMedia");
  // smooth cross-fade between frames
  media.classList.add("fading");
  setTimeout(() => {
    media.style.backgroundImage = `url('${s.photos[sv.idx]}')`;
    media.classList.remove("fading");
  }, 160);
  const caps = [s.desc, `"${(s.reviews[0] || {text:"be the first to review"}).text}" — @${(s.reviews[0]||{user:"prowl"}).user}`, `#${s.tags.join(" #")}`];
  document.getElementById("svCaption").textContent = caps[sv.idx % caps.length];
  document.getElementById("svProgress").innerHTML = s.photos.map((_, i) =>
    `<span class="sv-bar ${i < sv.idx ? "done" : ""} ${i === sv.idx ? "now" : ""}"></span>`).join("");
  startStoryTimer(SV_DUR);
}
function startStoryTimer(ms) {
  clearTimeout(sv.timer);
  sv.startTime = Date.now(); sv.remaining = ms;
  sv.timer = setTimeout(nextStoryFrame, ms);
}
function pauseStory() {
  if (sv.paused) return;
  sv.paused = true;
  clearTimeout(sv.timer);
  sv.remaining -= Date.now() - sv.startTime;
  sv.el.classList.add("paused");
}
function resumeStory() {
  if (!sv.paused) return;
  sv.paused = false;
  sv.el.classList.remove("paused");
  startStoryTimer(Math.max(sv.remaining, 400));
}
function nextStoryFrame() {
  if (sv.idx < sv.spot.photos.length - 1) { sv.idx++; showStoryFrame(); }
  else closeStory();
}
function prevStoryFrame() { if (sv.idx > 0) { sv.idx--; showStoryFrame(); } }
function closeStory() {
  clearTimeout(sv.timer);
  sv.paused = false;
  sv.el.classList.add("closing");
  setTimeout(() => { sv.el.classList.remove("open", "closing", "paused"); }, 220);
  renderStories();
}
document.getElementById("svNext").onclick = nextStoryFrame;
document.getElementById("svPrev").onclick = prevStoryFrame;
document.getElementById("svClose").onclick = closeStory;

// Hold-to-pause + swipe-down-to-close (Snapchat feel)
(function storyGestures() {
  let downT = 0, startY = 0, holdTimer = null, dragging = false;
  const el = sv.el;
  el.addEventListener("pointerdown", e => {
    if (e.target.closest(".sv-close, .sv-open")) return;
    downT = Date.now(); startY = e.clientY; dragging = true;
    holdTimer = setTimeout(pauseStory, 220); // hold beyond 220ms = pause
  });
  el.addEventListener("pointermove", e => {
    if (!dragging) return;
    const dy = e.clientY - startY;
    if (dy > 12) { clearTimeout(holdTimer); el.style.transform = `translateY(${Math.min(dy, 160)}px)`; el.style.opacity = String(1 - Math.min(dy / 400, 0.5)); }
  });
  el.addEventListener("pointerup", e => {
    if (!dragging) return;
    dragging = false;
    clearTimeout(holdTimer);
    const dy = e.clientY - startY;
    el.style.transform = ""; el.style.opacity = "";
    if (dy > 80) { closeStory(); return; }
    if (sv.paused) { resumeStory(); return; }
    // quick tap in a nav zone is handled by the zone buttons; ignore here
  });
  el.addEventListener("pointercancel", () => { dragging = false; clearTimeout(holdTimer); el.style.transform = ""; el.style.opacity = ""; if (sv.paused) resumeStory(); });
})();
document.getElementById("svOpen").onclick = () => { const id = sv.spot.id; closeStory(); openSheet(id); };

// ===== Filtering =====
// Everything that passes the user's own filters. Nothing is ever dropped from
// the app - this is the full set the map may draw from.
function matchingSpots() {
  return state.spots.filter(s => {
    if (spotMode(s.cat) !== state.mode) return false;   // Cool Stuff vs Abandoned world
    if (state.filter !== "all" && s.cat !== state.filter) return false;
    if (state.sketchFilter === "chill" && s.danger > 2) return false;
    if (state.sketchFilter === "sketchy" && s.danger < 4) return false;
    if (state.search) {
      const q = state.search.toLowerCase();
      const hay = `${s.name} ${s.zip} ${s.tags.join(" ")} ${CAT_META[s.cat].label}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

// How interesting a spot is, used only to decide what surfaces first.
function spotScore(s) {
  return (rateOf(s) || 3.8)
       + (hasVideo(s) ? 0.45 : 0)
       + (realPhoto(s) ? 0.25 : 0)
       + (s.sponsored ? 0.6 : 0)
       + Math.min(hereCount(s), 6) * 0.05;
}

// Progressive reveal: the best spots are on the map from the start, the rest
// fill in as you zoom. Nothing is removed, it just arrives in waves instead of
// dumping every pin on screen at once.
const REVEAL_TIERS = [
  { share: 0.35, zoom: 0 },      // always on the map
  { share: 0.65, zoom: 13.2 },
  { share: 0.85, zoom: 14.4 },
  { share: 1.00, zoom: 15.4 },   // everything
];
function visibleSpots() {
  const all = matchingSpots();
  // Searching or filtering to one category means the user asked for those
  // specifically, so show them all immediately.
  if (state.search || state.filter !== "all") return all;

  const z = map.getZoom();
  let share = REVEAL_TIERS[0].share;
  for (const t of REVEAL_TIERS) if (z >= t.zoom) share = t.share;
  if (share >= 1) return all;

  const ranked = all.slice().sort((a, b) => spotScore(b) - spotScore(a));
  const keep = new Set(ranked.slice(0, Math.ceil(ranked.length * share)).map(s => s.id));
  return all.filter(s => keep.has(s.id));
}
function revealShare() {
  let share = REVEAL_TIERS[0].share;
  for (const t of REVEAL_TIERS) if (map.getZoom() >= t.zoom) share = t.share;
  return share;
}

// ===== Inline SVG UI icons (currentColor, matches tab-bar style) =====
const SVG = {
  chill: '<svg class="ico" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M8 14.5s1.5 2 4 2 4-2 4-2"/><path d="M9 9.5h.01M15 9.5h.01"/></svg>',
  sketchy: '<svg class="ico" viewBox="0 0 24 24"><path d="M10.3 4l-8 14a2 2 0 0 0 1.7 3h16a2 2 0 0 0 1.7-3l-8-14a2 2 0 0 0-3.4 0z"/><path d="M12 9.5v4M12 17h.01"/></svg>',
  comment: '<svg class="ico" viewBox="0 0 24 24"><path d="M20.5 12a8 8 0 0 1-11.6 7.1L4 20.5l1.4-4.9A8 8 0 1 1 20.5 12z"/></svg>',
  share: '<svg class="ico" viewBox="0 0 24 24"><path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7"/><path d="M12 15V3.5"/><path d="M8 7l4-4 4 4"/></svg>',
  fox: '<svg class="em-fox" viewBox="0 0 64 64"><text x="32" y="48" text-anchor="middle" font-family="Outfit, system-ui, sans-serif" font-weight="900" font-size="48" fill="currentColor">?</text></svg>',
};

// ===== Mode (Cool Stuff / Abandoned) + dynamic category chips =====
const CHIP_LABEL = {
  bar: "🍸 Bars", coffee: "☕ Coffee", food: "🍔 Food", hangout: "🛋 Hangouts", nature: "🌲 Nature",
  abandoned: "🏚 Abandoned", tunnel: "🕳 Tunnels", rooftop: "🌆 Rooftops",
};
function renderChips() {
  const cats = MODES[state.mode].cats;
  let html = `<button class="chip ${state.filter === "all" ? "active" : ""}" data-cat="all">All</button>`;
  html += cats.map(cat =>
    `<button class="chip ${state.filter === cat ? "active" : ""}" data-cat="${cat}">${CHIP_LABEL[cat]}</button>`
  ).join("");
  // Sketch filters only make sense in the abandoned world
  if (state.mode === "urbex") {
    html += `<button class="chip chip-sketch ${state.sketchFilter === "chill" ? "active" : ""}" data-sketch="chill">${SVG.chill}Chill only</button>
             <button class="chip chip-sketch ${state.sketchFilter === "sketchy" ? "active" : ""}" data-sketch="sketchy">${SVG.sketchy}Sketchy+</button>`;
  }
  document.getElementById("filters").innerHTML = html;
  document.querySelectorAll("#filters .chip").forEach(c => {
    c.onclick = () => {
      if (c.dataset.sketch) {
        const on = state.sketchFilter !== c.dataset.sketch;
        state.sketchFilter = on ? c.dataset.sketch : null;
      } else {
        state.filter = c.dataset.cat;
      }
      renderChips();
      renderAll();
    };
  });
}

function applyModeVibe() {
  const cool = state.mode === "cool";
  const s = document.getElementById("search");
  if (s) s.placeholder = cool ? "Search bars, food, coffee, or ZIP…" : "Search abandoned spots, tags, or ZIP…";
  const tail = document.getElementById("badgeTail");
  if (tail) tail.textContent = cool ? "spots live · DFW" : "abandoned spots · DFW";
}
function setMode(mode) {
  if (state.mode === mode) return;
  state.mode = mode;
  state.filter = "all";
  state.sketchFilter = null;
  localStorage.setItem("moth.mode", mode);
  document.querySelectorAll(".mode-btn").forEach(b => b.classList.toggle("active", b.dataset.mode === mode));
  document.body.dataset.mode = mode;
  applyModeVibe();
  renderChips();
  renderStories();
  renderAll();
  toast(mode === "cool" ? "Cool Stuff 🍸" : "Into the Abandoned 🏚");
}
document.querySelectorAll(".mode-btn").forEach(b => b.onclick = () => setMode(b.dataset.mode));
document.getElementById("search").oninput = e => {
  state.search = e.target.value.trim();
  renderAll();
};

// ===== View switching (bottom tabs) =====
function showView(name) {
  document.querySelectorAll(".view").forEach(v => v.classList.remove("open"));
  document.querySelectorAll(".tab[data-view]").forEach(t => t.classList.toggle("active", t.dataset.view === name));
  if (name !== "map") {
    const el = document.getElementById("view-" + name);
    if (el) el.classList.add("open");
  }
}
document.querySelectorAll(".tab[data-view]").forEach(t => t.onclick = () => showView(t.dataset.view));
document.getElementById("profileBtn").onclick = () => showView("profile");

// ===== Explore grid =====
function renderExplore() {
  const el = document.getElementById("exploreGrid");
  const list = visibleSpots().slice();
  const sort = state.exploreSort || "hot";
  if (sort === "hot") list.sort((a, b) => (avgStars(b) + hereCount(b)) - (avgStars(a) + hereCount(a)));
  else if (sort === "new") list.sort((a, b) => b.id - a.id);
  else if (sort === "close") list.sort((a, b) => b.danger - a.danger);
  // Featured (sponsored) spots always rise to the top
  list.sort((a, b) => (b.sponsored ? 1 : 0) - (a.sponsored ? 1 : 0));
  el.innerHTML = list.map(s => {
    return `<div class="explore-card ${s.sponsored ? "sponsored" : ""}" data-id="${s.id}" tabindex="0" ${faceStyle(s)}>
      ${realPhoto(s) ? "" : `<span class="ec-emoji">${catLogo(s.cat)}</span>`}
      ${playBadge(s)}
      ${s.sponsored ? `<span class="ec-featured">★ Featured</span>` : ""}
      <span class="ec-label">${s.name}<small>${rateOf(s) ? `${starStr(rateOf(s))} ${rateOf(s).toFixed(1)}` : "★ new"} · ZIP ${s.zip} · <span class="sketch-badge sketch-${s.danger}">${SKETCH_WORDS[s.danger]}</span></small></span>
    </div>`;
  }).join("") || `<div class="empty-state"><span class="em-moth">${SVG.fox}</span><b>Nothing out here yet</b><small>No spots match that. Try another filter, or go drop one yourself.</small></div>`;
  el.querySelectorAll(".explore-card").forEach(c => {
    c.onclick = () => { showView("map"); openSheet(+c.dataset.id); };
    c.onkeydown = e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); c.click(); } };
  });
}
// Explore segmented sort (Instagram-style)
document.querySelectorAll("#exploreSeg .seg-btn").forEach(b => b.onclick = () => {
  document.querySelectorAll("#exploreSeg .seg-btn").forEach(x => x.classList.remove("active"));
  b.classList.add("active");
  state.exploreSort = b.dataset.sort;
  renderExplore();
});

// ===== Live 360: real crew presence on the map =====
const crewLayer = L.layerGroup().addTo(map);
const CREW_HUES = ["#a78bfa", "#f472b6", "#34d399", "#fbbf24", "#38bdf8", "#fb7185", "#4ade80"];
function hueFor(str) { let h = 0; for (const c of (str || "?")) h = (h * 31 + c.charCodeAt(0)) % CREW_HUES.length; return CREW_HUES[h]; }
let crewMembers = [];
function renderCrew() {
  crewLayer.clearLayers();
  crewMembers.forEach(f => {
    const nm = f.name || "friend";
    const icon = L.divIcon({
      className: "",
      html: `<div class="crew-pin live" style="--hue:${hueFor(f.uid || nm)}"><span>${(f.emoji || nm[0]).toUpperCase()}</span><i>${nm}</i></div>`,
      iconSize: [40, 54], iconAnchor: [20, 27],
    });
    crewLayer.addLayer(L.marker([f.lat, f.lng], { icon, zIndexOffset: -100 }));
  });
}
renderCrew();

// ===== Recenter on DFW =====
// ===== You on the map — custom character (Snap Map style) =====
const AVATAR_EMOJI = ["🦊","🦉","👻","🐺","🥷","🤠","🐸","😎","🐱","🧙","🦇","👽"];
const AVATAR_COLORS = ["#35bdf7","#9b6dff","#37e08b","#ffb84d","#ff5d6c","#f4f4f4"];
state.avatar = (() => {
  try { return JSON.parse(localStorage.getItem("prowl.avatar")) || {}; } catch (e) { return {}; }
})();
if (!state.avatar.emoji) state.avatar = { emoji: "🦊", color: "#35bdf7" };
window.appState = state;   // bridge so pb.js (auth UI) can respect the character
let meMarker = null;

function meIcon() {
  return L.divIcon({
    className: "",
    html: `<div class="me-pin" style="--me:${state.avatar.color}"><span>${state.avatar.emoji}</span><i class="me-pulse"></i></div>`,
    iconSize: [46, 46], iconAnchor: [23, 23],
  });
}
function showMe(lat, lng) {
  state.meAt = [lat, lng];
  if (meMarker) { meMarker.setLatLng([lat, lng]); }
  else meMarker = L.marker([lat, lng], { icon: meIcon(), zIndexOffset: 900, interactive: false }).addTo(map);
}
function startMe() {
  if (!navigator.geolocation || !window.isSecureContext) return;   // https only
  navigator.geolocation.watchPosition(
    p => showMe(p.coords.latitude, p.coords.longitude),
    () => {}, { enableHighAccuracy: true, maximumAge: 8000 });
}
function applyAvatar() {
  localStorage.setItem("prowl.avatar", JSON.stringify(state.avatar));
  if (meMarker) meMarker.setIcon(meIcon());
  const btn = document.getElementById("profileBtn");
  if (btn) { btn.textContent = state.avatar.emoji; btn.style.background = state.avatar.color; }
  const pa = document.getElementById("profileAvatar");
  if (pa) { pa.textContent = state.avatar.emoji; pa.style.background = state.avatar.color; }
  renderAvatarBuilder();
}
function renderAvatarBuilder() {
  const grid = document.getElementById("avatarGrid"), colors = document.getElementById("avatarColors");
  if (!grid || !colors) return;
  grid.innerHTML = AVATAR_EMOJI.map(e =>
    `<button class="av-opt ${e === state.avatar.emoji ? "on" : ""}" data-e="${e}">${e}</button>`).join("");
  colors.innerHTML = AVATAR_COLORS.map(c =>
    `<button class="av-color ${c === state.avatar.color ? "on" : ""}" data-c="${c}" style="background:${c}"></button>`).join("");
  grid.querySelectorAll(".av-opt").forEach(b => b.onclick = () => { state.avatar.emoji = b.dataset.e; applyAvatar(); });
  colors.querySelectorAll(".av-color").forEach(b => b.onclick = () => { state.avatar.color = b.dataset.c; applyAvatar(); });
}
startMe();
applyAvatar();

// Recenter: first stop is YOU (if located), tap again for the DFW overview.
const recenterBtn = document.getElementById("recenterBtn");
let recenterToggle = false;
if (recenterBtn) recenterBtn.onclick = () => {
  recenterBtn.classList.remove("spin"); void recenterBtn.offsetWidth; recenterBtn.classList.add("spin");
  const target = (state.meAt && !recenterToggle) ? { at: state.meAt, z: 15 } : { at: [32.79, -96.82], z: 12 };
  recenterToggle = state.meAt ? !recenterToggle : false;
  try { map.flyTo(target.at, target.z, { duration: 0.9, easeLinearity: 0.25 }); } catch (e) { map.setView(target.at, target.z); }
  closeSheet();
};

// ===== Live 360 controls =====
const live = {
  crew: localStorage.getItem("moth.crew") || "",
  on: false, watchId: null, pollTimer: null,
  presenceId: localStorage.getItem("moth.presenceId") || null,
  lastPos: null,
};
function myUid() { return (window.currentUser && currentUser()) ? currentUser().id : ("guest-" + (localStorage.moth_guest || (localStorage.moth_guest = Math.random().toString(36).slice(2, 9)))); }

async function pushPresence(lat, lng) {
  const body = { uid: myUid(), crew: live.crew, name: (window.myName ? myName() : "you"),
    lat, lng, live: live.on, emoji: ((window.currentUser && currentUser()) ? (currentUser().name || "?")[0] : "?") };
  try {
    if (live.presenceId) {
      const r = await fetch(PB_PRESENCE + "/" + live.presenceId, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (r.status === 404) live.presenceId = null;  // record gone, recreate
    }
    if (!live.presenceId) {
      const r = await fetch(PB_PRESENCE, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (r.ok) { const rec = await r.json(); live.presenceId = rec.id; localStorage.setItem("moth.presenceId", rec.id); }
    }
  } catch (e) {}
}
async function pollCrew() {
  if (!live.crew || !state.online) { crewMembers = []; renderCrew(); return; }
  try {
    const filter = encodeURIComponent(`crew='${live.crew}' && live=true`);
    const r = await fetch(PB_PRESENCE + "?perPage=50&filter=" + filter);
    if (!r.ok) return;
    const j = await r.json();
    crewMembers = j.items.filter(m => m.uid !== myUid());
    renderCrew();
    const cnt = document.getElementById("crewCount");
    if (cnt) cnt.textContent = crewMembers.length;
  } catch (e) {}
}
function startCrewPoll() { clearInterval(live.pollTimer); pollCrew(); live.pollTimer = setInterval(pollCrew, 4000); }

function goLive() {
  if (!live.crew) { toast("Join or make a crew first 👥"); return; }
  live.on = true;
  localStorage.setItem("moth.live", "1");
  updateLiveUI();
  const onPos = (lat, lng) => { live.lastPos = [lat, lng]; pushPresence(lat, lng); };
  if (navigator.geolocation) {
    live.watchId = navigator.geolocation.watchPosition(
      p => onPos(p.coords.latitude, p.coords.longitude),
      () => { const c = map.getCenter(); onPos(c.lat, c.lng); toast("Using map center (no GPS permission)"); },
      { enableHighAccuracy: true, maximumAge: 5000 }
    );
  } else { const c = map.getCenter(); onPos(c.lat, c.lng); }
  startCrewPoll();
  toast("You're live to your crew 🟢");
}
function stopLive() {
  live.on = false;
  localStorage.removeItem("moth.live");
  if (live.watchId != null) { navigator.geolocation.clearWatch(live.watchId); live.watchId = null; }
  if (live.lastPos) pushPresence(live.lastPos[0], live.lastPos[1]);  // flip live=false server-side
  updateLiveUI();
  toast("You went off the grid");
}
function updateLiveUI() {
  const t = document.getElementById("liveToggle");
  if (t) { t.classList.toggle("on", live.on); t.textContent = live.on ? "🟢 You're live" : "Go live"; }
  const cc = document.getElementById("crewCodeLabel");
  if (cc) cc.textContent = live.crew ? live.crew : "no crew yet";
}
function makeCrew() {
  const code = (Math.random().toString(36).slice(2, 7)).toUpperCase();
  joinCrew(code);
  toast("Crew created: " + code + " — share it 📋");
  if (navigator.clipboard) navigator.clipboard.writeText(code).catch(() => {});
}
function joinCrew(code) {
  live.crew = (code || "").trim().toUpperCase();
  localStorage.setItem("moth.crew", live.crew);
  updateLiveUI();
  startCrewPoll();
  if (live.on && live.lastPos) pushPresence(live.lastPos[0], live.lastPos[1]);
}
// wire crew UI (rendered in the profile view)
function wireLiveUI() {
  const mk = document.getElementById("crewMake"); if (mk) mk.onclick = makeCrew;
  const jn = document.getElementById("crewJoin"); if (jn) jn.onclick = () => {
    const v = document.getElementById("crewCodeInput").value;
    if (v.trim()) { joinCrew(v); toast("Joined crew " + live.crew + " 👥"); }
  };
  const tg = document.getElementById("liveToggle"); if (tg) tg.onclick = () => live.on ? stopLive() : goLive();
  updateLiveUI();
}
// resume a crew on load; auto-start poll so you see friends even before going live
wireLiveUI();
if (live.crew) startCrewPoll();

// ===== ZIP leaderboard (Explore) =====
function renderZipBoard() {
  const byZip = {};
  state.spots.forEach(s => (byZip[s.zip] = byZip[s.zip] || []).push(s));
  const rows = Object.entries(byZip)
    .map(([zip, spots]) => ({ zip, spots, heat: spots.length + spots.reduce((a, s) => a + hereCount(s), 0) }))
    .sort((a, b) => b.heat - a.heat).slice(0, 6);
  document.getElementById("zipBoard").innerHTML = rows.map((r, i) => {
    const top = r.spots.slice().sort((a, b) => avgStars(b) - avgStars(a))[0];
    const bg = faceStyle(top);
    return `<div class="zip-card" data-zip="${r.zip}" ${bg}>
      <span class="zc-rank">#${i + 1}</span>
      <span class="zc-label"><b>${r.zip}</b><small>${r.spots.length} spot${r.spots.length === 1 ? "" : "s"} · ${r.spots.reduce((a, s) => a + hereCount(s), 0)} here now</small></span>
    </div>`;
  }).join("");
  document.querySelectorAll(".zip-card").forEach(c => c.onclick = () => {
    document.getElementById("search").value = c.dataset.zip;
    state.search = c.dataset.zip;
    renderAll();
  });
}

// ===== Feed (user posts + seed) =====
function userPosts() { return JSON.parse(localStorage.getItem("moth.posts") || "[]"); }
document.getElementById("composeSpot").innerHTML =
  `<option value="">📍 tag a spot (optional)</option>` +
  SEED_SPOTS.map(s => `<option value="${s.id}">${s.name}</option>`).join("");
document.getElementById("composer").onsubmit = e => {
  e.preventDefault();
  const text = document.getElementById("composeText").value.trim();
  if (!text) return;
  const posts = userPosts();
  posts.unshift({ user: "you", spotId: +document.getElementById("composeSpot").value || null, likes: 0, comments: 0, text, time: "just now" });
  localStorage.setItem("moth.posts", JSON.stringify(posts));
  e.target.reset();
  renderFeed();
  toast("Posted to the feed 🦋");
};

function renderFeed() {
  const all = [...userPosts(), ...SEED_FEED];
  document.getElementById("feed").innerHTML = all.map((f, i) => {
    const spot = state.spots.find(s => f.spotId === s.id);
    const media = spot ? faceStyle(spot) : `style="background:var(--bg-3)"`;
    const liked = state.likes["f" + i];
    const likeCount = (f.likes || 0) + (liked ? 1 : 0);
    return `<div class="feed-card">
      <div class="fc-head"><span class="fc-avatar">${f.user[0].toUpperCase()}</span><b>@${f.user}</b><span class="fc-time">${f.time}</span></div>
      ${spot ? `<div class="fc-media fc-logo-media" data-id="${spot.id}" data-i="${i}" ${media}>${realPhoto(spot) ? "" : catLogo(spot.cat)}${playBadge(spot)}<div class="fc-heart-burst"><span>❤️</span></div></div>` : ""}
      <div class="fc-body">${f.text}</div>
      <div class="fc-actions">
        <button class="like-btn ${liked ? "liked" : ""}" data-i="${i}">${liked ? "❤️" : "🤍"} ${likeCount}</button>
        <button class="cmt-btn" data-i="${i}">${SVG.comment}${(f.comments || 0) + myComments(i).length}</button>
        <button>${SVG.share}Share</button>
      </div>
      <div class="fc-comments" id="cmts-${i}" style="display:none">
        ${(f.seedComments || []).map(c => `<div class="fc-comment"><b>@${c.user}</b> ${c.text}</div>`).join("")}
        ${myComments(i).map(c => `<div class="fc-comment"><b>@you</b> ${c}</div>`).join("")}
        <form class="fc-comment-form" data-i="${i}">
          <input placeholder="Add a comment…" maxlength="200">
          <button type="submit">➤</button>
        </form>
      </div>
    </div>`;
  }).join("");
  // Instagram-style: single tap opens spot, double tap likes with a heart burst
  document.querySelectorAll(".fc-media").forEach(m => {
    let lastTap = 0, tapTimer = null;
    m.onclick = () => {
      const now = Date.now();
      if (now - lastTap < 300) {
        clearTimeout(tapTimer); lastTap = 0;
        likeFeedPost(+m.dataset.i, true);
        const burst = m.querySelector(".fc-heart-burst");
        burst.classList.remove("pop"); void burst.offsetWidth; burst.classList.add("pop");
      } else {
        lastTap = now;
        tapTimer = setTimeout(() => { showView("map"); openSheet(+m.dataset.id); }, 300);
      }
    };
  });
  document.querySelectorAll(".like-btn").forEach(b => b.onclick = () => likeFeedPost(+b.dataset.i, false));
  document.querySelectorAll(".cmt-btn").forEach(b => b.onclick = () => {
    const el = document.getElementById("cmts-" + b.dataset.i);
    el.style.display = el.style.display === "none" ? "block" : "none";
  });
  document.querySelectorAll(".fc-comment-form").forEach(f => f.onsubmit = e => {
    e.preventDefault();
    const input = f.querySelector("input");
    if (!input.value.trim()) return;
    const all = JSON.parse(localStorage.getItem("moth.comments") || "{}");
    (all[f.dataset.i] = all[f.dataset.i] || []).push(input.value.trim());
    localStorage.setItem("moth.comments", JSON.stringify(all));
    renderFeed();
    const el = document.getElementById("cmts-" + f.dataset.i);
    if (el) el.style.display = "block";
  });
}
function likeFeedPost(i, forceLike) {
  const k = "f" + i;
  const next = forceLike ? true : !state.likes[k];
  const wasLiked = !!state.likes[k];
  state.likes[k] = next;
  localStorage.setItem("moth.likes", JSON.stringify(state.likes));
  if (next && !wasLiked && forceLike) toast("Liked ❤️");
  renderFeed();
}
function myComments(i) {
  return (JSON.parse(localStorage.getItem("moth.comments") || "{}"))[i] || [];
}

// Story viewer keyboard nav
document.addEventListener("keydown", e => {
  if (!sv.el.classList.contains("open")) return;
  if (e.key === "ArrowRight" || e.key === " ") nextStoryFrame();
  else if (e.key === "ArrowLeft") prevStoryFrame();
  else if (e.key === "Escape") closeStory();
});

// ===== Profile =====
const BADGES = [
  { emoji: "📍", name: "First Drop", earned: true },
  { emoji: "🌙", name: "Night Owl", earned: true },
  { emoji: "✍️", name: "5 Reviews", earned: () => myReviewCount() >= 5 },
  { emoji: "🗺️", name: "ZIP Master", earned: false },
  { emoji: "💀", name: "Sketch Lord", earned: false },
  { emoji: "🔥", name: "7-Day Streak", earned: false },
];
function myReviewCount() {
  const mine = window.isMine || (r => r.user === "you");
  return state.spots.reduce((a, s) => a + s.reviews.filter(mine).length, 0);
}
function renderProfile() {
  const revs = myReviewCount();
  document.getElementById("profileStats").innerHTML = `
    <div class="pstat"><b>${state.spots.length}</b><span>spots</span></div>
    <div class="pstat"><b>${revs}</b><span>reviews</span></div>
    <div class="pstat"><b>2</b><span>badges</span></div>
    <div class="pstat"><b>3<span class="flame">🔥</span></b><span>streak</span></div>`;
  document.getElementById("badgeRow").innerHTML = BADGES.map(b => {
    const earned = typeof b.earned === "function" ? b.earned() : b.earned;
    return `<div class="badge-card ${earned ? "" : "locked"}"><span class="b-emoji">${b.emoji}</span>${b.name}</div>`;
  }).join("");
  const mine = [];
  const isMineFn = window.isMine || (r => r.user === "you");
  state.spots.forEach(s => s.reviews.forEach(r => { if (isMineFn(r)) mine.push({ s, r }); }));
  document.getElementById("myReviews").innerHTML = mine.map(({ s, r }) => `
    <div class="review"><div class="review-head"><b>${s.name}</b><span class="stars">${starStr(r.stars)}</span></div>${r.text}</div>
  `).join("") || `<p style="color:var(--text-dim);font-size:13px">No reviews yet. Go touch some abandoned grass.</p>`;
}

// ===== Detail sheet =====
function openSheet(id) {
  const s = state.spots.find(x => x.id === id);
  if (!s) return;
  state.openSpotId = id;
  const hero = document.getElementById("sheetHero");
  const pv = previewImg(s);
  const vurl = firstVideoUrl(s);
  const watchLink = vurl ? `<a class="hero-play" href="${vurl}" target="_blank" rel="noopener">▶ watch the video</a>` : "";
  if (pv) {
    hero.style.background = `url('${pv}') center/cover`;
    hero.classList.remove("emoji-hero");
    document.getElementById("heroEmoji").innerHTML = watchLink;  // play cue over the preview frame
  } else {
    hero.style.background = catColor(s.cat);
    hero.classList.add("emoji-hero");
    document.getElementById("heroEmoji").innerHTML = catLogo(s.cat) + watchLink;
  }
  document.getElementById("sheetName").textContent = s.name;
  const rating = rateOf(s);
  document.getElementById("sheetHeroPills").innerHTML =
    `${rating ? `<span class="hero-pill star">★ ${rating.toFixed(1)}</span>` : `<span class="hero-pill">★ new</span>`}` +
    `<span class="hero-pill">${CAT_META[s.cat].emoji} ${CAT_META[s.cat].label}</span>` +
    (hereCount(s) ? `<span class="hero-pill live">🟢 ${hereCount(s)} here now</span>` : "");
  document.getElementById("sheetMeta").innerHTML = `ZIP ${s.zip}` +
    (s.reviewUrl ? ` · <a class="meta-link" href="${s.reviewUrl}" target="_blank" rel="noopener">Read reviews ↗</a>` : "");
  const dirBtn = document.getElementById("dirBtn");
  dirBtn.href = extMapsUrl(s);                 // fallback if in-app routing can't run
  dirBtn.onclick = (e) => { e.preventDefault(); routeToSpot(s); };
  // Share this spot (native share sheet on phones, copy-link fallback on desktop).
  const shareBtn = document.getElementById("shareBtn");
  if (shareBtn) {
    const shareUrl = `${location.origin}${location.pathname}#spot=${s.id}`;
    shareBtn.onclick = async () => {
      const data = { title: s.name, text: `${s.name} — a spot on Prowl`, url: shareUrl };
      try {
        if (navigator.share) { await navigator.share(data); }
        else { await navigator.clipboard.writeText(shareUrl); toast("Link copied 🔗"); }
      } catch (e) { /* user cancelled */ }
    };
  }
  // Sketch/verify/safety only matter for abandoned + urbex spots. Hide that whole
  // block for food/coffee/bars/nature so the common case reads clean and simple.
  const isUrbex = spotMode(s.cat) === "urbex";
  document.getElementById("dangerMeter").style.display = isUrbex ? "" : "none";
  document.getElementById("verifyBox").style.display = isUrbex ? "" : "none";
  document.getElementById("sponsorBox").innerHTML = s.sponsored ? `
    <div class="sponsor-banner">
      <div class="sponsor-top"><span class="sponsor-pill">★ Featured</span> <b>${s.sponsorName}</b></div>
      <p>${s.sponsorBlurb}</p>
      <button class="pill-btn primary sponsor-cta" onclick="toast('Deal saved to your profile 🎟️')">${s.sponsorCta || "See offer"}</button>
    </div>` : "";
  document.getElementById("sheetDesc").textContent = s.desc;
  document.getElementById("sheetTags").innerHTML = s.tags.map(t => `<span class="tag">#${t}</span>`).join("");
  const pct = (s.danger / 5) * 100;
  const col = s.danger >= 4 ? "#ff5d6c" : s.danger === 3 ? "#ffb84d" : "#37e08b";
  document.getElementById("dangerMeter").innerHTML =
    `Sketch level: <b style="color:${col}">${SKETCH_WORDS[s.danger]}</b>
     <div class="danger-track"><div class="danger-fill" style="width:${pct}%;background:${col}"></div></div>`;
  // Verified-accessible votes
  const votes = JSON.parse(localStorage.getItem("moth.verify") || "{}");
  const base = (s.id * 7) % 19 + 3;
  const mine = votes[s.id] ? 1 : 0;
  document.getElementById("verifyBox").innerHTML = `
    <span>✅ Still accessible · <b>${base + mine}</b> confirms</span>
    <button class="pill-btn ${mine ? "" : "primary"}" id="verifyBtn">${mine ? "Confirmed ✓" : "Confirm"}</button>`;
  document.getElementById("verifyBtn").onclick = () => {
    votes[s.id] = !votes[s.id];
    localStorage.setItem("moth.verify", JSON.stringify(votes));
    openSheet(s.id);
  };

  // Safety banners
  let safety = "";
  if (s.tags.includes("flood risk") || s.cat === "tunnel")
    safety += `<div class="safety-banner warn">⛈️ Flood risk — never enter tunnels or drains when rain is in the forecast.</div>`;
  if (s.danger >= 5)
    safety += `<div class="safety-banner danger">🤝 Extreme spot — never go alone. Bring a buddy and tell someone where you are.</div>`;
  document.getElementById("safetyBox").innerHTML = safety;

  // Only ever show imagery we can prove is OF THIS PLACE: a licensed photo with
  // a documented source, or a frame from a real video someone shot there.
  // Generic stock (a random park standing in for this park) is worse than
  // nothing, so it does not appear at all.
  const pg = document.getElementById("photoGrid");
  const frame = videoThumb(s);
  const proven = (s.photoCredit && s.photos && s.photos.length) ? s.photos : [];
  if (proven.length) {
    pg.innerHTML = proven.map(p => `<div class="photo-cell" style="background-image:url('${p}')"></div>`).join("");
  } else if (frame && frame.thumb) {
    pg.innerHTML = `<div class="photo-cell wide" style="background-image:url('${frame.thumb}')"></div>`;
  } else {
    pg.innerHTML = `<div class="photo-empty">${catLogo(s.cat)}<span>No verified photos of this spot yet</span>
      <small>Been here? Add yours.</small></div>`;
  }
  const credEl = document.getElementById("photoCredit");
  const cred = (window.SPOT_EXTRAS && window.SPOT_EXTRAS[s.id] && window.SPOT_EXTRAS[s.id].photoCredit) || s.photoCredit;
  const vt = !realPhoto(s) && videoThumb(s);
  credEl.innerHTML = cred
    ? `Photo: <a href="${cred.url}" target="_blank" rel="noopener">${cred.by}</a> · ${cred.license}`
    : vt
      ? `Preview from <a href="${vt.video}" target="_blank" rel="noopener">@${vt.author}</a>'s video ↗`
      : "";
  renderEmbeds(s);
  renderReviews(s);
  document.getElementById("sheet").classList.add("open");
  document.getElementById("sheetBackdrop").classList.add("open");
  try { map.flyTo([s.lat, s.lng], 15, { duration: 1.1, easeLinearity: 0.22 }); } catch (e) {}
  setTimeout(highlightSelectedPin, 60);
}
function closeSheet() {
  document.getElementById("sheet").classList.remove("open");
  document.getElementById("sheetBackdrop").classList.remove("open");
  state.openSpotId = null;
  highlightSelectedPin();
}
document.getElementById("sheetClose").onclick = closeSheet;
document.getElementById("sheetBackdrop").onclick = closeSheet;

// ===== Social embeds (Instagram / TikTok / Reddit) =====
// We NEVER copy someone's photo. Instead we embed their actual public post,
// which stays hosted on their platform, auto-credits them, and links back.
// That is the only legal way to show social content we do not own.
const EMBED_SCRIPTS = {
  instagram: "https://www.instagram.com/embed.js",
  tiktok:    "https://www.tiktok.com/embed.js",
  reddit:    "https://embed.reddit.com/widgets.js",
};
function embedBlock(e) {
  const dark = document.documentElement.getAttribute("data-theme") !== "day";
  if (e.type === "instagram")
    return `<blockquote class="instagram-media" data-instgrm-permalink="${e.url}" data-instgrm-version="14" style="margin:0;width:100%;min-width:0"><a href="${e.url}" target="_blank" rel="noopener">View this post on Instagram ↗</a></blockquote>`;
  if (e.type === "tiktok")
    return `<blockquote class="tiktok-embed" cite="${e.url}" style="margin:0;max-width:100%"><section><a href="${e.url}" target="_blank" rel="noopener">Watch on TikTok ↗</a></section></blockquote>`;
  if (e.type === "reddit")
    return `<blockquote class="reddit-embed-bq" data-embed-theme="${dark ? "dark" : "light"}" data-embed-height="420" style="margin:0"><a href="${e.url}" target="_blank" rel="noopener">See this post on Reddit ↗</a></blockquote>`;
  return `<a class="embed-fallback" href="${e.url}" target="_blank" rel="noopener">See the original post ↗</a>`;
}
// Re-run each platform's embed script so newly injected blockquotes get enhanced.
// If a script fails to load (offline, blocked), the blockquote still shows a
// clickable link to the original post, so nothing breaks.
function processEmbeds(types) {
  types.forEach(t => {
    const src = EMBED_SCRIPTS[t];
    if (!src) return;
    if (t === "instagram" && window.instgrm && window.instgrm.Embeds) { window.instgrm.Embeds.process(); return; }
    document.querySelectorAll(`script[data-embed="${t}"]`).forEach(n => n.remove());
    const sc = document.createElement("script");
    sc.src = src; sc.async = true; sc.charset = "utf-8"; sc.setAttribute("data-embed", t);
    document.body.appendChild(sc);
  });
}
function renderEmbeds(s) {
  const slot = document.getElementById("embedSlot");
  if (!slot) return;
  const extra = (window.SPOT_EXTRAS && window.SPOT_EXTRAS[s.id]) || {};
  const embeds = extra.embeds || s.embeds || [];
  if (!embeds.length) { slot.innerHTML = ""; return; }
  const label = { tiktok: "Open on TikTok", instagram: "Open on Instagram", reddit: "Open on Reddit" };
  const directLinks = embeds.map(e =>
    `<a class="embed-open" href="${e.url}" target="_blank" rel="noopener">▶ ${label[e.type] || "Open post"} ↗</a>`).join("");
  slot.innerHTML =
    `<h3 class="embed-h">From explorers who've been</h3>
     <div class="embed-openrow">${directLinks}</div>
     <div class="embed-list">${embeds.map(embedBlock).join("")}</div>
     <p class="embed-note">Real posts, hosted on their original platform. Credit and the link go to whoever shared them.</p>`;
  const types = [...new Set(embeds.map(e => e.type))];
  setTimeout(() => processEmbeds(types), 60);
}

function isCommunitySpot(s) { return s.cat === "abandoned" || s.cat === "tunnel"; }
function renderReviews(s) {
  const extra = (window.SPOT_EXTRAS && window.SPOT_EXTRAS[s.id]) || {};
  const community = isCommunitySpot(s);
  const h = document.getElementById("reviewsHeading");
  if (h) h.textContent = community ? "What people say" : "Reviews";

  const link = community
    ? `<a class="reviews-link" href="https://www.reddit.com/search/?q=${encodeURIComponent(s.name + " Dallas")}" target="_blank" rel="noopener">See what people say on Reddit ↗</a>`
    : `<a class="reviews-link" href="${extra.reviewUrl || ("https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(s.name + " " + (s.zip || "Dallas TX")))}" target="_blank" rel="noopener">Read real reviews ↗</a>`;

  const body = community
    ? s.reviews.map(r => `<div class="review say">${r.text}</div>`).join("")
    : s.reviews.map(r => `
      <div class="review">
        <div class="review-head"><b>@${r.user}</b><span class="stars">${starStr(r.stars)}</span></div>
        ${r.text}
      </div>`).join("");
  const fallback = community
    ? `<div class="empty-state"><span class="em-moth">${SVG.fox}</span><b>Not much chatter yet</b><small>Tap the link to see the threads.</small></div>`
    : `<div class="empty-state"><span class="em-moth">${SVG.fox}</span><b>No reviews yet</b><small>Nobody has prowled this one yet. Drop the first review.</small></div>`;
  document.getElementById("reviews").innerHTML = link + (body || fallback);
}

// Star input
const starInput = document.getElementById("starInput");
function renderStarInput() {
  starInput.innerHTML = [1,2,3,4,5].map(i => `<span data-v="${i}" class="${i <= state.reviewStars ? "on" : ""}">★</span>`).join("");
  starInput.querySelectorAll("span").forEach(sp => sp.onclick = () => { state.reviewStars = +sp.dataset.v; renderStarInput(); });
}
renderStarInput();

document.getElementById("reviewForm").onsubmit = e => {
  e.preventDefault();
  const text = document.getElementById("reviewText").value.trim();
  if (!text) return;
  const s = state.spots.find(x => x.id === state.openSpotId);
  s.reviews.push({ user: (window.myName ? myName() : "you"), stars: state.reviewStars, text });
  saveSpots();
  if (state.online && s._pb) pbUpdate(s._pb, { reviews: s.reviews });
  document.getElementById("reviewText").value = "";
  renderReviews(s);
  renderAll();
  toast("Review posted 🎉");
};

// ===== Add spot flow =====
// "+" opens a choice: post a photo, or drop a spot
document.getElementById("addSpotBtn").onclick = () => {
  document.getElementById("plusSheet").classList.add("open");
  document.getElementById("plusBackdrop").classList.add("open");
};
function closePlus() {
  document.getElementById("plusSheet").classList.remove("open");
  document.getElementById("plusBackdrop").classList.remove("open");
}
document.getElementById("plusBackdrop").onclick = closePlus;
document.getElementById("optSpot").onclick = () => {
  closePlus();
  showView("map");
  state.placing = true;
  toast("Tap the map to drop your pin 📍");
};
document.getElementById("optPhoto").onclick = () => {
  closePlus();
  openPhotoModal();
};

// ===== Post a photo =====
let photoDataUrl = null;
function openPhotoModal() {
  if (window.currentUser && !currentUser()) {
    toast("Sign up to post photos 📸");
    if (typeof openAuth === "function") openAuth("signup");
    return;
  }
  photoDataUrl = null;
  document.getElementById("photoPreview").hidden = true;
  document.getElementById("photoDropEmpty").hidden = false;
  document.getElementById("photoCaption").value = "";
  // spot dropdown = spots in the current mode
  const opts = state.spots.filter(s => spotMode(s.cat) === state.mode)
    .map(s => `<option value="${s.id}">${CAT_META[s.cat].emoji} ${s.name}</option>`).join("");
  document.getElementById("photoSpot").innerHTML = opts || `<option value="">No spots yet</option>`;
  document.getElementById("photoModal").classList.add("open");
  document.getElementById("photoBackdrop").classList.add("open");
}
function closePhoto() {
  document.getElementById("photoModal").classList.remove("open");
  document.getElementById("photoBackdrop").classList.remove("open");
}
document.getElementById("photoCancel").onclick = closePhoto;
document.getElementById("photoBackdrop").onclick = closePhoto;

// Read + downscale the chosen image so it stays small enough to store
document.getElementById("photoFile").onchange = e => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    const img = new Image();
    img.onload = () => {
      const max = 1000;
      let { width, height } = img;
      if (width > max || height > max) {
        const r = Math.min(max / width, max / height);
        width = Math.round(width * r); height = Math.round(height * r);
      }
      const canvas = document.createElement("canvas");
      canvas.width = width; canvas.height = height;
      canvas.getContext("2d").drawImage(img, 0, 0, width, height);
      photoDataUrl = canvas.toDataURL("image/jpeg", 0.82);
      const prev = document.getElementById("photoPreview");
      prev.src = photoDataUrl; prev.hidden = false;
      document.getElementById("photoDropEmpty").hidden = true;
    };
    img.src = ev.target.result;
  };
  reader.readAsDataURL(file);
};

document.getElementById("photoForm").onsubmit = e => {
  e.preventDefault();
  if (!photoDataUrl) { toast("Pick a photo first 📸"); return; }
  const id = +document.getElementById("photoSpot").value;
  const s = state.spots.find(x => x.id === id);
  if (!s) { toast("Pick a spot"); return; }
  const caption = document.getElementById("photoCaption").value.trim();
  // Add the photo to the spot (front of the photo list)
  s.photos = [photoDataUrl, ...(s.photos || [])];
  saveSpots();
  if (state.online && s._pb) pbUpdate(s._pb, { photos: s.photos });
  // Post it to the feed
  const posts = JSON.parse(localStorage.getItem("moth.posts") || "[]");
  posts.unshift({
    user: (window.myName ? myName() : "you"), spotId: s.id, photo: photoDataUrl,
    likes: 0, comments: 0, time: "just now",
    text: caption ? caption + ` <b>@ ${s.name}</b>` : `posted a photo at <b>${s.name}</b> 📸`,
  });
  localStorage.setItem("moth.posts", JSON.stringify(posts));
  closePhoto();
  renderFeed();
  renderStories();
  renderAll();
  showView("feed");
  toast("Photo posted 📸");
};
map.on("click", e => {
  if (!state.placing) return;
  state.pendingLatLng = e.latlng;
  state.placing = false;
  document.getElementById("addModal").classList.add("open");
  document.getElementById("addBackdrop").classList.add("open");
});
function closeAdd() {
  document.getElementById("addModal").classList.remove("open");
  document.getElementById("addBackdrop").classList.remove("open");
}
document.getElementById("addCancel").onclick = closeAdd;
document.getElementById("addBackdrop").onclick = closeAdd;
document.getElementById("addForm").onsubmit = e => {
  e.preventDefault();
  const s = {
    id: Date.now(),
    name: document.getElementById("addName").value.trim(),
    cat: document.getElementById("addCat").value,
    lat: state.pendingLatLng.lat, lng: state.pendingLatLng.lng,
    zip: document.getElementById("addZip").value.trim() || "?????",
    desc: document.getElementById("addDesc").value.trim(),
    tags: ["new"], danger: 2, reviews: [],
  };
  state.spots.push(s);
  saveSpots();
  if (state.online) pbCreate(s);
  closeAdd();
  e.target.reset();
  renderAll();
  openSheet(s.id);
  toast(state.online ? "Spot dropped 📍 saved to backend" : "Spot dropped 📍");
};

// ===== Toast =====
let toastTimer;
function toast(msg) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), 2600);
}

// ===== Render all =====
function renderAll() {
  renderMarkers();
  renderGlow();
  renderExplore();
  renderZipBoard();
  renderProfile();
}

// ===== Pin sharing (deep links) =====
// A shared pin is a URL that auto-loads the app straight to the spot (or raw
// map point) with Directions available. No account needed on the receiving end.
function spotUrl(s) { return location.origin + location.pathname + "?s=" + s.id; }
function pinUrl(lat, lng) { return location.origin + location.pathname + "?pin=" + lat.toFixed(5) + "," + lng.toFixed(5); }
async function sharePin(url, title) {
  if (navigator.share) {
    try { await navigator.share({ title: title || "Check this spot", url }); return; } catch (e) { if (e.name === "AbortError") return; }
  }
  try { await navigator.clipboard.writeText(url); toast("Pin copied, paste it to a friend 📍"); }
  catch (e) { window.prompt("Copy this pin link", url); }
}
window.sharePinAt = function (lat, lng) {
  sharePin(pinUrl(lat, lng), "Meet here");
  map.closePopup();
};
// Long-press (or right-click) anywhere on the map -> drop a pin -> send it
map.on("contextmenu", e => {
  const { lat, lng } = e.latlng;
  L.popup({ closeButton: false, offset: [0, -6] })
    .setLatLng(e.latlng)
    .setContent(`<div class="pin-pop"><b>Dropped pin</b>
      <button class="pill-btn primary" onclick="sharePinAt(${lat},${lng})">Send this pin</button>
      <a class="pill-btn" target="_blank" rel="noopener" href="https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}">Directions</a></div>`)
    .openOn(map);
});
// Handle incoming shared pins on load
function handleDeepLink() {
  const p = new URLSearchParams(location.search);
  const skipSplash = () => { localStorage.setItem("moth.seen", "1"); document.getElementById("splash").classList.remove("open"); };
  if (p.get("s")) {
    const sp = state.spots.find(x => x.id === +p.get("s"));
    if (sp) {
      skipSplash();
      if (spotMode(sp.cat) !== state.mode) setMode(spotMode(sp.cat));
      showView("map");
      openSheet(sp.id);
      return true;
    }
  } else if (p.get("pin")) {
    const [la, ln] = p.get("pin").split(",").map(Number);
    if (isFinite(la) && isFinite(ln)) {
      skipSplash();
      showView("map");
      map.setView([la, ln], 16);
      L.popup({ closeButton: true })
        .setLatLng([la, ln])
        .setContent(`<div class="pin-pop"><b>Your friend pinned this spot</b>
          <a class="pill-btn primary" target="_blank" rel="noopener" href="https://www.google.com/maps/dir/?api=1&destination=${la},${ln}">Get directions</a></div>`)
        .openOn(map);
      return true;
    }
  }
  return false;
}
window.handleDeepLink = handleDeepLink;

// ===== Share card =====
document.getElementById("shareBtn").onclick = () => {
  const s = state.spots.find(x => x.id === state.openSpotId);
  if (!s) return;
  const ph = document.getElementById("scPhoto");
  if (s.photos && s.photos.length) { ph.style.background = `url('${s.photos[0]}') center/cover`; ph.textContent = ""; }
  else { ph.style.background = CAT_META[s.cat].grad; ph.textContent = CAT_META[s.cat].emoji; }
  document.getElementById("scName").textContent = s.name;
  document.getElementById("scMeta").textContent = `★ ${rateOf(s).toFixed(1)} · ZIP ${s.zip} · ${SKETCH_WORDS[s.danger]}`;
  document.getElementById("shareCard").classList.add("open");
  document.getElementById("shareBackdrop").classList.add("open");
};
function closeShare() {
  document.getElementById("shareCard").classList.remove("open");
  document.getElementById("shareBackdrop").classList.remove("open");
}
document.getElementById("shareBackdrop").onclick = closeShare;
document.getElementById("scCopy").onclick = () => {
  const s = state.spots.find(x => x.id === state.openSpotId);
  closeShare();
  sharePin(spotUrl(s), s.name);
};

// ===== Notifications =====
document.getElementById("notifBtn").onclick = () => {
  document.getElementById("notifPanel").classList.toggle("open");
  document.getElementById("notifDot").style.display = "none";
};
document.addEventListener("click", e => {
  if (!e.target.closest("#notifPanel") && !e.target.closest("#notifBtn"))
    document.getElementById("notifPanel").classList.remove("open");
});

// ===== Splash =====
if (!localStorage.getItem("moth.seen")) {
  document.getElementById("splash").classList.add("open");
}
document.getElementById("splash").onclick = () => {
  localStorage.setItem("moth.seen", "1");
  const sp = document.getElementById("splash");
  sp.classList.add("leaving");
  setTimeout(() => sp.classList.remove("open", "leaving"), 400);
};

// ===== Prowl Guide (assistant) =====
const GUIDE_CATS = {
  food: ["food","eat","eats","hungry","dinner","lunch","brunch","taco","tacos","ramen","pho","burger","pizza","bbq","barbecue","brisket","sushi","dessert","noodle","breakfast","spicy","cheap"],
  coffee: ["coffee","cafe","latte","espresso","matcha","chai","study","wifi","work"],
  bar: ["drink","drinks","bar","cocktail","cocktails","beer","wine","rooftop","speakeasy","date"],
  hangout: ["chill","hang","hangout","relax","park","patio","sit","lowkey","people"],
  nature: ["nature","trail","outside","walk","water","garden","stars","hike","lake","sunset"],
  abandoned: ["abandoned","urbex","explore","creepy","graffiti","mural","murals","ruins","photo","photos","photogenic","gritty","history"],
};
const GUIDE_LEAD = {
  food: "Hungry? Here's where I'd go",
  coffee: "Coffee run. Try these",
  bar: "For drinks, these are the move",
  hangout: "To just chill, check out",
  nature: "Get outside at",
  abandoned: "For something gritty to explore",
  "": "Here's what I'd hit",
};
function guideDetectCat(q) {
  q = q.toLowerCase();
  let best = "", bestN = 0;
  for (const [cat, words] of Object.entries(GUIDE_CATS)) {
    const n = words.filter(w => q.includes(w)).length;
    if (n > bestN) { bestN = n; best = cat; }
  }
  return best;
}
function guideRecommend(q) {
  const cat = guideDetectCat(q);
  const words = q.toLowerCase().split(/[^a-z]+/).filter(w => w.length > 2);
  let pool = state.spots.slice();
  if (cat) pool = pool.filter(s => s.cat === cat);
  if (!pool.length) pool = state.spots.slice();
  pool.forEach(s => {
    const hay = (s.name + " " + s.desc + " " + s.tags.join(" ")).toLowerCase();
    s._score = words.reduce((a, w) => a + (hay.includes(w) ? 2 : 0), 0) + avgStars(s);
  });
  pool.sort((a, b) => b._score - a._score);
  return { cat, spots: pool.slice(0, 3) };
}
function guideAddMsg(who, html) {
  const el = document.createElement("div");
  el.className = "g-msg " + who;
  el.innerHTML = html;
  document.getElementById("guideMsgs").appendChild(el);
  scrollGuide();
}
function guideAddRec(s, mi) {
  const el = document.createElement("div");
  el.className = "g-rec";
  const far = (typeof mi === "number")
    ? ` · ${mi < 1 ? mi.toFixed(1) : Math.round(mi)} mi` : "";
  const rating = rateOf(s);
  el.innerHTML = `<div class="g-rec-thumb" ${faceStyle(s)}>${previewImg(s) ? "" : catLogo(s.cat)}${playBadge(s)}</div>
    <div class="g-rec-info"><b>${s.name}</b><small>${CAT_META[s.cat].label} · ${s.zip}${far}</small><span class="g-stars">${rating ? starStr(rating) + " " + rating.toFixed(1) : "★ new"}</span></div>`;
  el.onclick = () => { if (spotMode(s.cat) !== state.mode) setMode(spotMode(s.cat)); closeGuide(); showView("map"); openSheet(s.id); };
  document.getElementById("guideMsgs").appendChild(el);
  scrollGuide();
}
function scrollGuide() { const m = document.getElementById("guideMsgs"); m.scrollTop = m.scrollHeight; }
// ===== Guide brain =====
// Understands what you actually asked for: a category, a specific craving, a
// mood, distance, price, and whether you are following up on the last answer.
const CRAVINGS = {
  taco: ["taco","tacos","al pastor","birria","taqueria"], bbq: ["bbq","barbecue","brisket","smoked","ribs"],
  ramen: ["ramen","izakaya","tonkotsu"], noodles: ["noodle","noodles","pho","udon"],
  dumplings: ["dumpling","dumplings","xiao long bao","xlb","soup dumpling","bao","manti","samsa"],
  sushi: ["sushi","omakase","sashimi","nigiri","robata"],
  pizza: ["pizza","slice"], burger: ["burger","burgers","smash"],
  mexican: ["mexican","enchilada","queso","salsa","pupusa","pupusas"],
  thai: ["thai","pad thai","panang"], chinese: ["chinese","sichuan","szechuan","chongqing","lanzhou"],
  korean: ["korean","kbbq","soondubu","tofu house","banchan","kimchi","bibimbap"],
  japanese: ["japanese","obanyaki","takoyaki","karaage"],
  taiwanese: ["taiwanese","boba","milk tea","bubble tea"],
  vietnamese: ["vietnamese","banh mi"],
  indian: ["indian","curry","tikka","tandoori","biryani","karahi","naan","masala"],
  pakistani: ["pakistani","seekh","halal"],
  middleeast: ["kabob","kebab","shawarma","falafel","persian","afghan","uzbek","plov","pulao","gyro","mediterranean"],
  peruvian: ["peruvian","ceviche","lomo saltado"],
  bakery: ["bakery","croissant","pastry","pastries","bread","eclair","macaron","cinnamon roll","waffle"],
  breakfast: ["breakfast","brunch","biscuit","pancake","migas","eggs"],
  dessert: ["dessert","ice cream","sweet","donut","cake","crepe","crepes","creamery","gelato"],
  vegan: ["vegan","vegetarian","plant based"],
  cocktail: ["cocktail","cocktails","mixology","speakeasy","martini","mezcal","whiskey"],
  beer: ["beer","brewery","brewpub","draft","taproom","cider"], wine: ["wine","winery","vino"],
  matcha: ["matcha"], espresso: ["espresso","cortado","latte","flat white","pourover","pour over"],
};
const MOODS = {
  date:    { words: ["date","romantic","impress","anniversary","cute"], say: "good date energy" },
  work:    { words: ["work","study","laptop","wifi","focus","remote"], say: "somewhere you can actually work" },
  chill:   { words: ["chill","lowkey","low key","relax","quiet","calm","unwind"], say: "low key" },
  lively:  { words: ["fun","lively","busy","party","night out","loud","vibe","vibes"], say: "lively" },
  cheap:   { words: ["cheap","broke","budget","affordable","under","inexpensive"], say: "easy on the wallet" },
  fancy:   { words: ["fancy","upscale","nice","classy","special occasion"], say: "a nicer spot" },
  photos:  { words: ["photo","photos","photogenic","instagram","shoot","aesthetic","pics"], say: "very photogenic" },
  outside: { words: ["patio","outside","outdoor","rooftop","fresh air"], say: "outdoors" },
  latenight:{words: ["late","late night","after","2am","midnight","open late"], say: "late night" },
  group:   { words: ["group","friends","everyone","crew","party of"], say: "good for a group" },
};
const NEAR_WORDS = ["near me","nearby","close","closest","around me","near by","walking distance","right now"];

function milesBetween(a, b) { return map.distance([a.lat, a.lng], [b.lat, b.lng]) / 1609.34; }
function userPoint() {
  if (state.meAt) return { lat: state.meAt[0], lng: state.meAt[1] };
  const c = map.getCenter(); return { lat: c.lat, lng: c.lng };   // fall back to what they're looking at
}
function firstSentence(t) { const m = (t || "").split(/(?<=[.!?])\s/)[0]; return m || ""; }

// Match on whole words only. Substring matching turned "shoot photos" into a
// ramen craving, because "pho" lives inside "photos".
function saysWord(haystack, phrase) {
  const esc = phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp("(^|[^a-z])" + esc + "([^a-z]|$)", "i").test(haystack);
}
function guideUnderstand(q) {
  const s = " " + q.toLowerCase().trim() + " ";
  const cat = guideDetectCat(q);
  const craving = Object.entries(CRAVINGS).find(([, ws]) => ws.some(w => saysWord(s, w)));
  const moods = Object.entries(MOODS).filter(([, m]) => m.words.some(w => saysWord(s, w))).map(([k, m]) => ({ key: k, ...m }));
  const near = NEAR_WORDS.some(w => s.includes(w));
  const followUp = /^(what about|how about|and |any |something else|other|more|instead|else)/.test(q.toLowerCase().trim());
  return { cat, craving: craving ? craving[0] : null, cravingWords: craving ? craving[1] : [], moods, near, followUp, raw: q };
}

function guideSearch(intent) {
  const me = userPoint();
  let pool = matchingSpots().length ? state.spots.slice() : state.spots.slice();
  if (intent.cat) pool = pool.filter(s => s.cat === intent.cat);

  const STOP = new Set(["the","and","for","near","some","good","best","great","really","where","what","can","get","find","want","looking","place","places","spot","spots","food","around","here","there","something","anything"]);
  const words = intent.raw.toLowerCase().split(/[^a-z]+/).filter(w => w.length > 2 && !STOP.has(w));
  const scored = pool.map(s => {
    const name = s.name.toLowerCase(), tags = s.tags.join(" ").toLowerCase();
    const hay = (s.name + " " + s.desc + " " + s.tags.join(" ") + " " + CAT_META[s.cat].label).toLowerCase();
    let sc = (rateOf(s) || 3.8) * 1.1;
    if (intent.craving) sc += intent.cravingWords.some(w => saysWord(hay, w)) ? 6 : -1.5;
    intent.moods.forEach(m => { if (m.words.some(w => saysWord(hay, w))) sc += 2.2; });
    // A word in the NAME is the strongest possible signal. Asking for "boba"
    // should surface Boba Republic, not a nearby plaza that happens to rate well.
    sc += words.reduce((a, w) =>
      a + (saysWord(name, w) ? 7 : saysWord(tags, w) ? 3.5 : saysWord(hay, w) ? 1.2 : 0), 0);
    if (hasVideo(s)) sc += 0.3;
    const mi = milesBetween(me, s);
    // Distance always matters. Even when they did not say "near me", nobody
    // wants a 20 minute drive as the answer to "somewhere chill", so anything
    // past a comfortable radius gets penalised hard.
    const near5 = Math.min(mi, 5), beyond = Math.max(0, mi - 5);
    sc -= intent.near ? (near5 * 1.1 + beyond * 1.6)
                      : (near5 * 0.22 + beyond * 0.75);
    if (intent.moods.some(m => m.key === "cheap") && /cheap|cash only|hole in the wall|window|cheap eats/.test(hay)) sc += 2;
    if (intent.moods.some(m => m.key === "outside") && /patio|rooftop|outdoor|garden|park/.test(hay)) sc += 2;
    return { s, sc, mi };
  }).sort((a, b) => b.sc - a.sc);

  // Do not hand back a taco question with a nature answer.
  const strong = intent.craving ? scored.filter(x => intent.cravingWords.some(w =>
    saysWord((x.s.name + " " + x.s.desc + " " + x.s.tags.join(" ")).toLowerCase(), w))) : scored;
  return { hits: (strong.length ? strong : scored).slice(0, 3), me, fellBack: intent.craving && !strong.length };
}

function guideReply(intent, r) {
  const n = r.hits.length;
  if (!n) return null;
  const top = r.hits[0];
  const dist = m => m < 0.3 ? "right around the corner" : m < 1 ? `${(m).toFixed(1)} mi away` : `${Math.round(m)} mi away`;
  const moodTxt = intent.moods.length ? intent.moods.map(m => m.say).slice(0, 2).join(" and ") : null;

  let lead;
  if (r.fellBack) {
    lead = `I don't have a great ${intent.craving} spot saved yet, so here's the closest thing I'd actually send you to`;
  } else if (intent.near) {
    lead = `Closest to you${intent.craving ? ` for ${intent.craving}` : ""}: <b>${top.s.name}</b>, ${dist(top.mi)}`;
  } else if (intent.craving) {
    lead = `For ${intent.craving}, <b>${top.s.name}</b> is the one I'd send you to`;
  } else if (moodTxt) {
    lead = `If you want ${moodTxt}, start with <b>${top.s.name}</b>`;
  } else if (intent.cat) {
    lead = `${GUIDE_LEAD[intent.cat] || "Here's what I'd pick"}: <b>${top.s.name}</b>`;
  } else {
    lead = `Here's what stands out near you: <b>${top.s.name}</b>`;
  }

  const why = [];
  if (rateOf(top.s)) why.push(`${rateOf(top.s).toFixed(1)}★`);
  why.push(dist(top.mi));
  if (hasVideo(top.s)) why.push("there's a video of it");
  const tip = firstSentence(top.s.desc);
  return `${lead} <span class="g-why">(${why.join(" · ")})</span>.<br>${tip}`
       + (n > 1 ? `<br><br>${n - 1} more below if that's not it.` : "");
}

function guideAsk(q) {
  guideAddMsg("user", q);
  const intent = guideUnderstand(q);
  // "what about coffee instead" keeps the mood from the previous question
  if (intent.followUp && guideAsk._last) {
    intent.moods = intent.moods.length ? intent.moods : guideAsk._last.moods;
    intent.near = intent.near || guideAsk._last.near;
  }
  guideAsk._last = intent;

  const r = guideSearch(intent);
  guideTyping(true);
  setTimeout(() => {
    guideTyping(false);
    const reply = guideReply(intent, r);
    if (!reply) {
      guideAddMsg("bot", "I don't have anything saved for that yet. Try asking me about tacos, coffee to work from, rooftop drinks, somewhere chill, a trail, or an abandoned spot to shoot.");
      return;
    }
    guideAddMsg("bot", reply);
    r.hits.forEach(h => guideAddRec(h.s, h.mi));
  }, 420);
}
function guideTyping(on) {
  const box = document.getElementById("guideMsgs");
  let t = document.getElementById("gTyping");
  if (on && !t) {
    t = document.createElement("div");
    t.id = "gTyping"; t.className = "g-msg bot g-typing";
    t.innerHTML = "<i></i><i></i><i></i>";
    box.appendChild(t); scrollGuide();
  } else if (!on && t) t.remove();
}
let guideGreeted = false;
function openGuide() {
  document.getElementById("guidePanel").classList.add("open");
  if (!guideGreeted) {
    guideGreeted = true;
    guideAddMsg("bot", "Hey, I'm your Prowl guide 🦉 Tell me what you're feeling and I'll point you at spots. Try something like \"spicy tacos\" or \"rooftop for drinks.\"");
  }
}
function closeGuide() { document.getElementById("guidePanel").classList.remove("open"); }
document.getElementById("guideFab").onclick = () => {
  const p = document.getElementById("guidePanel");
  p.classList.contains("open") ? closeGuide() : openGuide();
};
document.getElementById("guideClose").onclick = closeGuide;
document.getElementById("guideForm").onsubmit = e => {
  e.preventDefault();
  const t = document.getElementById("guideText");
  const q = t.value.trim();
  if (!q) return;
  t.value = "";
  guideAsk(q);
};
const GUIDE_QUICK = ["What's good food near me?", "Best tacos nearby", "Coffee I can work from",
  "Rooftop drinks", "Somewhere chill and cheap", "A trail near me", "Abandoned spot to shoot"];
document.getElementById("guideQuick").innerHTML = GUIDE_QUICK.map(q => `<button class="g-quick">${q}</button>`).join("");
document.querySelectorAll("#guideQuick .g-quick").forEach(b => b.onclick = () => guideAsk(b.textContent.replace(/^[^\w]+/, "").trim()));

// Initialize mode UI (chips + toggle) before the backend load kicks in
document.body.dataset.mode = state.mode;
document.querySelectorAll(".mode-btn").forEach(b => b.classList.toggle("active", b.dataset.mode === state.mode));
applyModeVibe();
renderChips();

// Boot: initMoth() (in pb.js, loaded after this) loads spots from the
// PocketBase backend, or falls back to offline demo mode, then renders.

// ===== Shared-link deep open: /#spot=<id> opens that spot once spots load =====
function openSpotFromHash() {
  const m = location.hash.match(/spot=(\d+)/);
  if (!m) return;
  const id = +m[1];
  let tries = 0;
  const t = setInterval(() => {
    if (state.spots && state.spots.length) {
      clearInterval(t);
      if (state.spots.find(x => x.id === id)) openSheet(id);
    } else if (++tries > 40) { clearInterval(t); }
  }, 150);
}
window.addEventListener("hashchange", openSpotFromHash);
openSpotFromHash();
