// ===== Moth app (Snapchat-style shell) =====
const state = {
  spots: [],          // populated by initMoth() in pb.js (backend or offline fallback)
  online: false,
  mode: localStorage.getItem("moth.mode") || "cool",  // "cool" (bars/food/coffee) or "urbex" (abandoned)
  filter: "all",
  feedFilter: "all",  // feed-tab category filter (food/nature/bar/…) independent of the map
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
// "Here now" must reflect REAL presence, never invented numbers. Until it is
// wired to live presence counts near each spot, it stays empty so the app never
// shows a fake crowd. (Was a hardcoded demo map; removed as a fake signal.)
const HERE = {};
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
  const mod = m.modifier || "";
  // A U-turn is its own phrasing; "Turn uturn onto X" reads like broken English.
  if (mod.includes("uturn")) return `Make a U-turn${onRoad}`;
  switch (m.type) {
    case "depart":   return road ? `Head ${mod || "out"} on ${road}` : "Start driving";
    case "turn":     return mod === "straight" ? `Continue${onRoad}` : `Turn ${mod}${onRoad}`.replace(/\s+/g, " ").trim();
    case "merge":    return `Merge${mod ? " " + mod : ""}${onRoad}`;
    case "on ramp":  return `Take the ramp${mod ? " " + mod : ""}${onRoad}`;
    case "off ramp": return `Take the exit${mod ? " " + mod : ""}${onRoad}`;
    case "fork":     return `Keep ${mod || "straight"}${onRoad}`;
    case "end of road": return `Turn ${mod}${onRoad}`.replace(/\s+/g, " ").trim();
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
const nav = { on: false, steps: [], i: 0, dest: null, watch: null, line: null, me: null, lastReroute: 0,
  bearing: 0, _cont: null, lastPt: null, destMark: null };

// Compass bearing (deg, 0=N clockwise) from point a to point b.
function bearingDeg(a, b) {
  const rad = d => d * Math.PI / 180, deg = r => r * 180 / Math.PI;
  const y = Math.sin(rad(b.lng - a.lng)) * Math.cos(rad(b.lat));
  const x = Math.cos(rad(a.lat)) * Math.sin(rad(b.lat)) -
            Math.sin(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.cos(rad(b.lng - a.lng));
  return (deg(Math.atan2(y, x)) + 360) % 360;
}
// Turn the map so the direction of travel points UP, like Google Maps nav.
// Rotation is a CSS transform on the (oversized, while driving) #map container,
// so it never touches Leaflet's own pane math. We unwrap the angle to a
// continuous value so we always rotate the short way — no 360° spins at N.
// North-up navigation (like Apple/Google Maps' north-up mode). We deliberately
// do NOT rotate the map: the old CSS-transform "heading-up" camera flipped the
// whole map on mobile and fought Leaflet's tile math. Heading is tracked only.
function setNavBearing(deg) {
  if (deg == null || isNaN(deg)) return;
  nav.bearing = deg;
}

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
    L.polyline(line, { color: "#0b0f16", weight: 14, opacity: .9, lineCap: "round", lineJoin: "round" }),
    L.polyline(line, { color: accentColor(), weight: 9, opacity: 1, lineCap: "round", lineJoin: "round" }),
  ]).addTo(map);
  nav.steps = (route.legs && route.legs[0] && route.legs[0].steps) || [];
  // Progress tracking: cumulative meters along the polyline, and the cumulative
  // distance at the END of each step (where its next turn happens). This is how
  // we know which instruction to show and how far the next turn is — measuring
  // straight-line distance to a maneuver point (the old way) broke as soon as
  // you passed it, so the readout never advanced.
  nav.geom = line;
  nav.cum = [0];
  for (let k = 1; k < line.length; k++) nav.cum[k] = nav.cum[k - 1] + map.distance(line[k - 1], line[k]);
  nav.total = nav.cum[nav.cum.length - 1] || 0;
  nav.stepEnd = [];
  let acc = 0;
  for (let s = 0; s < nav.steps.length; s++) { acc += (nav.steps[s].distance || 0); nav.stepEnd[s] = acc; }
  nav.i = 0;
  return line;
}

// Project the user onto the route: how far along (meters) the nearest point is,
// and how far off the line they are. Dense geometry (overview=full) makes the
// nearest-vertex approximation plenty accurate for guidance.
function alongRoute(lat, lng) {
  if (!nav.geom || !nav.geom.length) return { dist: 0, off: 0, idx: 0 };
  let best = Infinity, bi = 0;
  for (let k = 0; k < nav.geom.length; k++) {
    const d = map.distance([lat, lng], nav.geom[k]);
    if (d < best) { best = d; bi = k; }
  }
  return { dist: nav.cum[bi] || 0, off: best === Infinity ? 0 : best, idx: bi };
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
function metersOffRoute(lat, lng) { return alongRoute(lat, lng).off; }

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
  const d = alongRoute(lat, lng).dist;   // meters traveled along the route

  // The step you're currently driving = the first whose end is still ahead.
  let c = 0;
  while (c < nav.stepEnd.length - 1 && nav.stepEnd[c] <= d + 1) c++;
  nav.i = c;

  const cur = nav.steps[c];
  const upcoming = nav.steps[c + 1] || cur;             // the next turn (or arrival)
  const toManeuver = Math.max(0, (nav.stepEnd[c] || 0) - d);
  const toDest = Math.max(0, nav.total - d);
  const p = stepPoint(upcoming);
  const arrow = maneuverArrow(upcoming.maneuver);

  document.getElementById("navArrow").textContent = arrow;
  document.getElementById("navInstr").textContent = maneuverText(upcoming, nav.dest.name);
  document.getElementById("navDist").textContent = fmtFeet(toManeuver);
  const mins = Math.max(1, Math.round((toDest / 1609.34) / 0.5));
  document.getElementById("navEta").textContent =
    `${(toDest / 1609.34).toFixed(1)} mi · ~${mins} min · ${fmtEta(mins * 60)}`;
  const after = nav.steps[c + 2];
  document.getElementById("navThen").textContent =
    after ? `then ${maneuverText(after, nav.dest.name)}` : "";

  setTurnMarker(p, arrow);
  // Stay zoomed in so streets are big and readable the whole drive; close in a
  // notch more right before a turn.
  const wantZoom = toManeuver < 150 ? 19 : 18;
  if (Math.abs(map.getZoom() - wantZoom) >= 0.5) map.setZoom(wantZoom, { animate: false });
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

// Turn the heading-up camera on/off. Oversizing the container while driving
// means the rotated map still fills the screen with real (crisp) tiles instead
// of black corners; invalidateSize lets Leaflet render into the bigger box.
function setNavCamera(on) {
  const mapEl = document.getElementById("map");
  if (!mapEl) return;
  // Clean nav view: hide the spot cluster so it's just the route, you, and the
  // next turn. North-up, no rotation (see setNavBearing).
  if (on) {
    if (map.hasLayer(cluster)) map.removeLayer(cluster);
  } else {
    mapEl.style.removeProperty("--bearing");
    document.body.style.removeProperty("--nav-bearing");
    if (!map.hasLayer(cluster)) map.addLayer(cluster);
  }
  setTimeout(() => { try { map.invalidateSize({ animate: false }); } catch (e) {} }, 60);
}

function startDrive(s, route, from) {
  nav.on = true; nav.dest = s;
  nav._cont = null; nav.lastPt = { lat: from.lat, lng: from.lng };
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
  // A destination pin so you can see where you're headed, like every maps app.
  if (nav.destMark) map.removeLayer(nav.destMark);
  nav.destMark = L.marker([s.lat, s.lng], {
    icon: L.divIcon({ className: "", iconSize: [30, 30], iconAnchor: [15, 30],
      html: `<div class="nav-dest">◎</div>` }),
    zIndexOffset: 900, interactive: false,
  }).addTo(map);

  setNavCamera(true);
  // Point the camera along the first leg right away.
  const firstAim = (route.geometry.coordinates[1] || route.geometry.coordinates[0]);
  if (firstAim) setNavBearing(bearingDeg(from, { lat: firstAim[1], lng: firstAim[0] }));
  map.setView([from.lat, from.lng], 18, { animate: false });  // snap in tight on you, like a real guide
  renderNavHud(from.lat, from.lng);

  if (nav.watch) navigator.geolocation.clearWatch(nav.watch);
  nav.watch = navigator.geolocation.watchPosition((pos) => {
    if (!nav.on) return;
    const lat = pos.coords.latitude, lng = pos.coords.longitude;
    nav.me.setLatLng([lat, lng]);
    map.panTo([lat, lng], { animate: true, duration: 0.9 });

    // Heading: use the GPS-reported heading when moving, else derive it from how
    // far we've traveled since the last fix (ignoring tiny GPS jitter).
    const gh = pos.coords.heading;
    if (typeof gh === "number" && !isNaN(gh) && (pos.coords.speed == null || pos.coords.speed > 0.5)) {
      setNavBearing(gh);
    } else if (nav.lastPt && map.distance([lat, lng], [nav.lastPt.lat, nav.lastPt.lng]) > 6) {
      setNavBearing(bearingDeg(nav.lastPt, { lat, lng }));
    }
    nav.lastPt = { lat, lng };

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
  setNavCamera(false);
  if (nav.watch) { navigator.geolocation.clearWatch(nav.watch); nav.watch = null; }
  if (nav.line) { map.removeLayer(nav.line); nav.line = null; }
  if (nav.me) { map.removeLayer(nav.me); nav.me = null; }
  if (nav.turn) { map.removeLayer(nav.turn); nav.turn = null; }
  if (nav.destMark) { map.removeLayer(nav.destMark); nav.destMark = null; }
  nav.steps = []; nav.i = 0; nav.dest = null; nav._cont = null; nav.lastPt = null;
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
  // Stories were folded into the immersive reels feed; the strip may not exist.
  const strip = document.getElementById("storyStrip");
  if (!strip) return;
  // Cool mode leads with what's buzzing; Abandoned leads with the sketchiest.
  const inMode = state.spots.filter(s => spotMode(s.cat) === state.mode);
  inMode.sort((a, b) => state.mode === "urbex"
    ? (b.danger + avgStars(b)) - (a.danger + avgStars(a))
    : (hereCount(b) + avgStars(b)) - (hereCount(a) + avgStars(a)));
  const hot = inMode.slice(0, 8);
  strip.innerHTML = hot.map(s => {
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
  document.getElementById("svMeta").textContent = `${cityOf(s.zip) || "ZIP " + s.zip} · ${SKETCH_WORDS[s.danger]}`;
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
  const caps = [s.desc, `"${(s.reviews[0] || {text:"be the first to review"}).text}" — @${(s.reviews[0]||{user:"themove"}).user}`, `#${s.tags.join(" #")}`];
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
// ===== Saved spots =====
// Your own catalog. Kept locally so it works signed out and offline.
function savedIds() {
  try { return JSON.parse(localStorage.getItem("prowl.saved") || "[]"); } catch (e) { return []; }
}
function isSaved(id) { return savedIds().includes(id); }
function toggleSaved(id) {
  const list = savedIds();
  const i = list.indexOf(id);
  if (i >= 0) list.splice(i, 1); else list.unshift(id);
  localStorage.setItem("prowl.saved", JSON.stringify(list));
  const spot = state.spots.find(s => s.id === id);
  toast(i >= 0 ? "Removed from saved" : `Saved ${spot ? spot.name : "spot"} ✓`);
  syncSaveBtn(id);
  renderSaved();
  return i < 0;
}
function syncSaveBtn(id) {
  const b = document.getElementById("saveBtn");
  if (!b || state.openSpotId !== id) return;
  const on = isSaved(id);
  b.classList.toggle("on", on);
  b.innerHTML = `<svg class="ico" viewBox="0 0 24 24" fill="${on ? "currentColor" : "none"}"><path d="M6 3h12a1 1 0 0 1 1 1v16l-7-4-7 4V4a1 1 0 0 1 1-1z"/></svg>${on ? "Saved" : "Save"}`;
}
function renderSaved() {
  const wrap = document.getElementById("savedList");
  if (!wrap) return;
  const ids = savedIds();
  const spots = ids.map(id => state.spots.find(s => s.id === id)).filter(Boolean);
  document.getElementById("savedCount").textContent = spots.length;
  if (!spots.length) {
    wrap.innerHTML = `<div class="saved-empty">Nothing saved yet.<small>Tap Save on any spot to build your list.</small></div>`;
    return;
  }
  wrap.innerHTML = spots.map(s => `
    <div class="saved-row" data-id="${s.id}">
      <div class="saved-thumb" ${faceStyle(s)}>${previewImg(s) ? "" : catLogo(s.cat)}${playBadge(s)}</div>
      <div class="saved-info">
        <b>${s.name}</b>
        <small>${CAT_META[s.cat].label} · ${cityOf(s.zip) || s.zip}${rateOf(s) ? ` · ★ ${rateOf(s).toFixed(1)}` : ""}</small>
      </div>
      <button class="saved-x" data-remove="${s.id}" aria-label="Remove">✕</button>
    </div>`).join("");
  wrap.querySelectorAll(".saved-row").forEach(r => {
    r.onclick = e => {
      if (e.target.dataset.remove) return;
      const s = state.spots.find(x => x.id === +r.dataset.id);
      if (!s) return;
      if (spotMode(s.cat) !== state.mode) setMode(spotMode(s.cat));
      showView("map"); openSheet(s.id);
    };
  });
  wrap.querySelectorAll("[data-remove]").forEach(b => b.onclick = ev => {
    ev.stopPropagation(); toggleSaved(+b.dataset.remove);
  });
}

// ===== Places you can search by name =====
// Spots only carry a ZIP, so "Plano" matched nothing. This maps ZIPs to the
// city (and the neighborhood where one is well known) so typing a place name
// works the way people expect.
const ZIP_PLACE = {
  // Dallas
  "75201": ["Dallas", "Downtown"], "75202": ["Dallas", "Downtown"], "75204": ["Dallas", "Uptown"],
  "75206": ["Dallas", "Lower Greenville", "Knox Henderson"], "75207": ["Dallas", "Design District"],
  "75208": ["Dallas", "Bishop Arts", "Oak Cliff"], "75212": ["Dallas", "West Dallas"],
  "75215": ["Dallas", "South Dallas"], "75217": ["Dallas"], "75218": ["Dallas", "White Rock"],
  "75219": ["Dallas", "Oak Lawn"], "75220": ["Dallas"], "75226": ["Dallas", "Deep Ellum"],
  "75231": ["Dallas"], "75249": ["Dallas", "Cedar Hill"], "75210": ["Dallas"], "75203": ["Dallas"],
  "75214": ["Dallas", "Lakewood"], "75216": ["Dallas"], "75235": ["Dallas"], "75246": ["Dallas"],
  // Plano
  "75023": ["Plano"], "75024": ["Plano", "Legacy West"], "75025": ["Plano"], "75026": ["Plano"],
  "75074": ["Plano", "Downtown Plano"], "75075": ["Plano"], "75093": ["Plano", "West Plano"],
  "75094": ["Plano"],
  // Nearby suburbs
  "75034": ["Frisco"], "75035": ["Frisco"], "75081": ["Richardson"], "75080": ["Richardson"],
  "75082": ["Richardson"], "75044": ["Garland"], "75040": ["Garland"], "75042": ["Garland"],
  "75104": ["Cedar Hill"], "76226": ["Denton", "Argyle"], "76247": ["Denton"],
  "76067": ["Mineral Wells"], "76104": ["Fort Worth"], "76164": ["Fort Worth"],
  "76102": ["Fort Worth"], "76458": ["Thurber"], "76043": ["Glen Rose"], "76078": ["Rhome"],
};
function placesFor(zip) { return ZIP_PLACE[String(zip)] || []; }
function cityOf(zip) { return (placesFor(zip)[0]) || ""; }

// Every place name we know about, for detecting "take me to Plano".
const ALL_PLACES = (() => {
  const set = new Set();
  Object.values(ZIP_PLACE).forEach(list => list.forEach(p => set.add(p.toLowerCase())));
  return set;
})();
function searchIsPlace(q) {
  const s = q.toLowerCase().trim().replace(/^(take me to|go to|show me|in)\s+/, "");
  return ALL_PLACES.has(s) || /^\d{5}$/.test(s) ? s : null;
}

// Everything that passes the user's own filters. Nothing is ever dropped from
// the app - this is the full set the map may draw from.
function matchingSpots() {
  return state.spots.filter(s => {
    if (spotMode(s.cat) !== state.mode) return false;   // Cool Stuff vs Abandoned world
    if (state.filter !== "all" && s.cat !== state.filter) return false;
    if (state.sketchFilter === "chill" && s.danger > 2) return false;
    if (state.sketchFilter === "sketchy" && s.danger < 4) return false;
    if (state.search) {
      const q = state.search.toLowerCase().trim().replace(/^(take me to|go to|show me|in)\s+/, "");
      const hay = `${s.name} ${s.zip} ${placesFor(s.zip).join(" ")} ${s.tags.join(" ")} ${CAT_META[s.cat].label}`.toLowerCase();
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

// Every spot in the current mode/filter is on the map at all times. Clustering
// keeps dense areas tidy and breaks apart as you zoom, so there's no need to
// hide pins — hiding them just made spots feel missing, which they aren't.
function visibleSpots() { return matchingSpots(); }
// Kept so the zoom handler stays stable; the full set is always shown now.
function revealShare() { return 1; }

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
  if (s) s.placeholder = cool ? "Try Plano, tacos, coffee, or a ZIP…" : "Try Dallas, tunnels, rooftops, or a ZIP…";
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
// Typing a place name should take you there, not just filter the list.
let flewFor = "";
function flyToSearchResults() {
  const place = searchIsPlace(state.search);
  if (!place) { flewFor = ""; return; }
  if (place === flewFor) return;              // already there, do not fight the user
  const hits = matchingSpots();
  if (!hits.length) return;
  flewFor = place;
  showView("map");
  const b = L.latLngBounds(hits.map(s => [s.lat, s.lng]));
  map.fitBounds(b, { padding: [60, 90], maxZoom: 14.5, animate: false });
  toast(`${hits.length} spot${hits.length === 1 ? "" : "s"} in ${place.replace(/\b\w/g, c => c.toUpperCase())}`);
}
document.getElementById("search").oninput = e => {
  state.search = e.target.value.trim();
  renderAll();
  flyToSearchResults();
};
// Enter jumps to the results even for a partial place name
document.getElementById("search").onkeydown = e => {
  if (e.key !== "Enter") return;
  e.target.blur();
  const hits = matchingSpots();
  if (!hits.length) return;
  showView("map");
  map.fitBounds(L.latLngBounds(hits.map(s => [s.lat, s.lng])), { padding: [60, 90], maxZoom: 15, animate: false });
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

// ===== Explore: visual, proximity-sorted search =====
// A Pinterest-style image grid that always answers "what good spots are near
// me right now?" Type anything (name, cuisine, tag, category, ZIP, city), tap a
// category chip to filter, and results auto-sort nearest-first with a real
// distance on every tile.
state.exSearch = "";
state.exCat = "all";
state.exNear = false;   // "Near me": hard-sort + gently hide far ones

// Chips are the current world's categories plus a couple of common cuisines
// people actually search for, mapped onto the Food category.
const EX_CUISINE = {
  bbq:    { label: "🍖 BBQ",     match: ["bbq","barbecue","brisket","smoked","ribs"] },
  tacos:  { label: "🌮 Tacos",   match: ["taco","tacos","taqueria","birria","al pastor"] },
  sweets: { label: "🍰 Sweets",  match: ["dessert","ice cream","bakery","donut","boba","cake","gelato","pastry"] },
};
function exCatLabel(key) {
  if (key === "all") return "All";
  if (CHIP_LABEL[key]) return CHIP_LABEL[key];
  return (EX_CUISINE[key] && EX_CUISINE[key].label) || key;
}
function renderExChips() {
  const el = document.getElementById("exChips");
  if (!el) return;
  const cats = ["all", ...MODES[state.mode].cats];
  // Cuisine shortcuts only make sense in the Cool world (they filter Food).
  const extra = state.mode === "cool" ? Object.keys(EX_CUISINE) : [];
  el.innerHTML = [...cats, ...extra].map(c =>
    `<button class="chip ${state.exCat === c ? "active" : ""}" data-excat="${c}">${exCatLabel(c)}</button>`
  ).join("");
  el.querySelectorAll(".chip").forEach(c => c.onclick = () => {
    state.exCat = state.exCat === c.dataset.excat ? "all" : c.dataset.excat; // toggle off
    renderExChips();
    renderExplore();
  });
}
// Does this spot pass the active category / cuisine chip?
function exMatchesCat(s) {
  const c = state.exCat;
  if (c === "all") return true;
  if (EX_CUISINE[c]) {
    const hay = (s.name + " " + s.desc + " " + s.tags.join(" ")).toLowerCase();
    return EX_CUISINE[c].match.some(w => hay.includes(w));
  }
  return s.cat === c;
}
function renderExplore() {
  const el = document.getElementById("exploreGrid");
  if (!el) return;
  renderExChips();
  const q = (state.exSearch || "").toLowerCase().trim();
  const me = userPoint();
  const haveLoc = !!state.meAt;   // real GPS fix vs. map-center fallback
  let list = state.spots.filter(s => spotMode(s.cat) === state.mode);
  list = list.filter(exMatchesCat);
  if (q) {
    list = list.filter(s => {
      const hay = `${s.name} ${s.desc} ${s.tags.join(" ")} ${CAT_META[s.cat].label} ${s.zip} ${placesFor(s.zip).join(" ")}`.toLowerCase();
      return hay.includes(q);
    });
  }
  // Attach distance, then AUTO-SORT nearest-first (the whole point of Explore).
  list = list.map(s => ({ s, mi: milesBetween(me, s) }));
  list.sort((a, b) => a.mi - b.mi);
  // "Near me" tightens the aperture: drop anything past a sane radius so the
  // grid is only genuinely-close spots.
  if (state.exNear && haveLoc) list = list.filter(x => x.mi <= 15);

  const cnt = document.getElementById("exCount");
  if (cnt) cnt.textContent = list.length
    ? `${list.length} spot${list.length === 1 ? "" : "s"}${haveLoc ? " near you" : ""}`
    : "";

  el.innerHTML = list.map(({ s, mi }) => {
    const rating = rateOf(s);
    const dist = mi < 10 ? mi.toFixed(1) : Math.round(mi);
    return `<div class="explore-card ${s.sponsored ? "sponsored" : ""}" data-id="${s.id}" tabindex="0" ${faceStyle(s)}>
      ${realPhoto(s) ? "" : `<span class="ec-emoji">${catLogo(s.cat)}</span>`}
      ${playBadge(s)}
      ${s.sponsored ? `<span class="ec-featured">★ Featured</span>` : ""}
      <span class="ec-dist">◎ ${dist} mi</span>
      <span class="ec-label">${s.name}<small>${CAT_META[s.cat].emoji} ${CAT_META[s.cat].label} · ${rating ? `★ ${rating.toFixed(1)}` : "new"}</small></span>
    </div>`;
  }).join("") || `<div class="empty-state"><span class="em-moth">${SVG.fox}</span><b>Nothing matches that</b><small>Try a different word or category, clear the filters, or drop a new spot yourself.</small></div>`;
  el.querySelectorAll(".explore-card").forEach(c => {
    c.onclick = () => { const s = state.spots.find(x => x.id === +c.dataset.id); showView("map"); openSheet(+c.dataset.id); };
    c.onkeydown = e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); c.click(); } };
  });
}
// Wire the Explore search box, clear button, and Near-me toggle.
(function wireExplore() {
  const box = document.getElementById("exSearch");
  const clear = document.getElementById("exClear");
  const near = document.getElementById("exNear");
  if (box) box.oninput = () => {
    state.exSearch = box.value;
    if (clear) clear.hidden = !box.value;
    renderExplore();
  };
  if (clear) clear.onclick = () => { box.value = ""; state.exSearch = ""; clear.hidden = true; renderExplore(); box.focus(); };
  if (near) near.onclick = () => {
    state.exNear = !state.exNear;
    near.classList.toggle("on", state.exNear);
    near.setAttribute("aria-pressed", state.exNear ? "true" : "false");
    if (state.exNear && !state.meAt && navigator.geolocation && window.isSecureContext) {
      toast("Finding your location…");
      navigator.geolocation.getCurrentPosition(
        p => { showMe(p.coords.latitude, p.coords.longitude); renderExplore(); },
        () => { toast("Using map center for distances"); renderExplore(); },
        { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 });
    } else renderExplore();
  };
})();

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

// ===== Map layers: Places vs Friends (toggleable, so neither buries the other) =====
// Places = all the spot pins (existing cluster). Friends = Live 360 crew presence
// (reusing crewLayer / crewMembers, no new presence code). Your own marker
// (meMarker) is always shown and is visually distinct. Default: Places only.
const mapLayers = { places: true, friends: false };
map.removeLayer(crewLayer);   // friends off by default so it isn't noise
function applyLayers() {
  if (mapLayers.places) { if (!map.hasLayer(cluster)) map.addLayer(cluster); }
  else if (map.hasLayer(cluster)) map.removeLayer(cluster);
  if (mapLayers.friends) { if (!map.hasLayer(crewLayer)) map.addLayer(crewLayer); if (typeof startCrewPoll === "function") startCrewPoll(); }
  else if (map.hasLayer(crewLayer)) map.removeLayer(crewLayer);
}
document.querySelectorAll("#layerCtrl .layer-btn").forEach(b => b.onclick = () => {
  const key = b.dataset.layer;
  mapLayers[key] = !mapLayers[key];
  b.classList.toggle("active", mapLayers[key]);
  b.setAttribute("aria-pressed", mapLayers[key] ? "true" : "false");
  applyLayers();
  if (key === "friends") toast(mapLayers.friends
    ? (live.crew ? "Showing your crew 👥" : "Make or join a crew to see friends here")
    : "Crew hidden");
});

// ===== Recenter on DFW =====
// ===== You on the map — custom character (Snap Map style) =====
const AVATAR_GROUPS = {
  "Creatures": ["🦊","🦉","🐺","🐸","🐱","🦇","🐝","🦝","🐙","🦎","🐊","🦅"],
  "Characters": ["🥷","🤠","🧙","👽","🤖","🧛","🧜","🦸","🕵️","👻","💀","🎃"],
  "Moods": ["😎","🔥","👀","💫","🌙","⚡","🍄","🌵","🎧","🛹","📸","🗝️"],
};
const AVATAR_EMOJI = Object.values(AVATAR_GROUPS).flat();
const AVATAR_COLORS = ["#35bdf7","#9b6dff","#37e08b","#ffb84d","#ff5d6c",
                       "#f4f4f4","#ff8fd0","#00d4c8","#ffd93d","#7c8cff"];
const AVATAR_FRAMES = [
  { key: "solid",  label: "Solid" },
  { key: "ring",   label: "Ring" },
  { key: "glow",   label: "Glow" },
  { key: "gradient", label: "Gradient" },
];
state.avatar = (() => {
  try { return JSON.parse(localStorage.getItem("prowl.avatar")) || {}; } catch (e) { return {}; }
})();
if (!state.avatar.emoji) state.avatar = { emoji: "🦊", color: "#35bdf7" };
window.appState = state;   // bridge so pb.js (auth UI) can respect the character
let meMarker = null;

function meIcon() {
  return L.divIcon({
    className: "",
    html: `<div class="me-pin frame-${state.avatar.frame || "solid"}" style="--me:${state.avatar.color}"><span>${state.avatar.emoji}</span><i class="me-pulse"></i></div>`,
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
  const prev = document.getElementById("avPreview");
  if (prev) {
    prev.className = "av-preview frame-" + (state.avatar.frame || "solid");
    prev.style.setProperty("--me", state.avatar.color);
    prev.textContent = state.avatar.emoji;
  }
  grid.innerHTML = Object.entries(AVATAR_GROUPS).map(([label, list]) => `
    <div class="av-group"><span class="av-group-label">${label}</span>
      <div class="av-group-grid">${list.map(e =>
        `<button class="av-opt ${e === state.avatar.emoji ? "on" : ""}" data-e="${e}">${e}</button>`).join("")}</div>
    </div>`).join("");
  colors.innerHTML =
    `<div class="av-row-label">Color</div>
     <div class="av-swatches">${AVATAR_COLORS.map(c =>
       `<button class="av-color ${c === state.avatar.color ? "on" : ""}" data-c="${c}" style="background:${c}"></button>`).join("")}</div>
     <div class="av-row-label">Style</div>
     <div class="av-frames">${AVATAR_FRAMES.map(f =>
       `<button class="av-frame ${(state.avatar.frame || "solid") === f.key ? "on" : ""}" data-f="${f.key}">${f.label}</button>`).join("")}</div>`;

  grid.querySelectorAll(".av-opt").forEach(b => b.onclick = () => { state.avatar.emoji = b.dataset.e; applyAvatar(); });
  colors.querySelectorAll(".av-color").forEach(b => b.onclick = () => { state.avatar.color = b.dataset.c; applyAvatar(); });
  colors.querySelectorAll(".av-frame").forEach(b => b.onclick = () => { state.avatar.frame = b.dataset.f; applyAvatar(); });
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
  if (!window.sb) return;  // offline / not configured
  const row = { uid: myUid(), crew: live.crew, name: (window.myName ? myName() : "you"),
    lat, lng, live: live.on, emoji: ((window.currentUser && currentUser()) ? (currentUser().name || "?")[0] : "?"),
    updated_at: new Date().toISOString() };
  try { await window.sb.from("presence").upsert(row, { onConflict: "uid" }); } catch (e) {}
}
async function pollCrew() {
  if (!live.crew || !state.online || !window.sb) { crewMembers = []; renderCrew(); return; }
  try {
    const { data, error } = await window.sb.from("presence").select("*")
      .eq("crew", live.crew).eq("live", true);
    if (error) return;
    crewMembers = (data || []).filter(m => m.uid !== myUid());
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
  // The ZIP leaderboard was replaced by the visual-search Explore; guard so
  // renderAll() never trips when the board isn't in the DOM.
  if (!document.getElementById("zipBoard")) return;
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

// ===== Feed: real posts from real spots, filterable by type =====
// Captions read like a local telling you why to go, per category.
const FEED_CAPTIONS = {
  food:      ["the food at <b>{name}</b> is unreal 🔥 go hungry", "found my new go-to at <b>{name}</b> 🍴 everything hits", "late plate at <b>{name}</b>, worth every bite 🌮"],
  coffee:    ["slow morning at <b>{name}</b> ☕ best pour in town", "posted up at <b>{name}</b> all afternoon, perfect patio ☕", "<b>{name}</b> latte + a good book = reset button"],
  bar:       ["<b>{name}</b> hits different at night 🍸 pull up", "<b>{name}</b> was buzzing tonight, found the good seats", "cocktails at <b>{name}</b> 🍸 speakeasy energy"],
  hangout:   ["whole crew ended up at <b>{name}</b> tonight 🛋", "chill day at <b>{name}</b>, easy vibes all around", "<b>{name}</b> is where everyone's hanging lately"],
  nature:    ["golden hour at <b>{name}</b> 🌳 absolutely worth it", "trail day at <b>{name}</b> 🥾 quiet and green", "<b>{name}</b> in the morning, had it to myself"],
  abandoned: ["explored <b>{name}</b> today 🏚 frozen in time", "<b>{name}</b> at dusk is eerie in the best way", "made it into <b>{name}</b> 🔦 wild place"],
  tunnel:    ["went deep into <b>{name}</b> 🕳 flashlights only", "<b>{name}</b> echoes forever, unreal down there"],
  rooftop:   ["caught the skyline from <b>{name}</b> 🌆 worth the climb", "<b>{name}</b> at sunset, whole city glowing"],
};
const FEED_USERS = ["dfw.wanderer","mena.j","lens.leo","nightowl.dfw","kaylaroams","grindcity","smokestackjenny","trailmix.tx","urbex.kate","sunset.sam","forklore","quietwalks","backroads.bee","cityclimber"];
const FEED_TIMES = ["12m ago","28m ago","45m ago","1h ago","2h ago","3h ago","5h ago","7h ago","yesterday"];
// Build a stable, spot-driven feed: 6 curated posts up top, then auto posts for
// the strongest spots in every category (media first) so each filter has life.
let _genFeed = null;
function buildGenFeed() {
  if (_genFeed) return _genFeed;
  const out = [];
  const byCat = {};
  SEED_SPOTS.forEach(s => (byCat[s.cat] = byCat[s.cat] || []).push(s));
  Object.keys(byCat).forEach(cat => {
    const caps = FEED_CAPTIONS[cat] || FEED_CAPTIONS.hangout;
    // Media-bearing spots first so cards look real, then by interest.
    const ranked = byCat[cat].slice().sort((a, b) =>
      ((previewImg(b) ? 1 : 0) - (previewImg(a) ? 1 : 0)) || (spotScore(b) - spotScore(a)));
    ranked.slice(0, 6).forEach((s, k) => {
      out.push({
        user: FEED_USERS[(s.id + k) % FEED_USERS.length],
        spotId: s.id,
        likes: 8 + ((s.id * 7) % 80),
        comments: (s.id * 3) % 14,
        time: FEED_TIMES[(s.id + k) % FEED_TIMES.length],
        text: caps[(s.id + k) % caps.length].replace("{name}", s.name),
        _gen: true,
      });
    });
  });
  _genFeed = out;
  return out;
}
// One flat list, newest-first-ish: your posts, the curated 6, then generated.
// Each post carries a STABLE key so like/comment state survives filtering
// (a list index would point at a different post once a filter is applied).
function allFeedPosts() {
  const list = [...userPosts(), ...SEED_FEED, ...buildGenFeed()];
  return list.map((f, i) => ({ ...f, _key: f._gen ? `g${f.spotId}_${f.user}` : `${f.user}|${f.spotId}|${f.time}|${i}` }));
}
function feedCatOf(f) {
  const s = SEED_SPOTS.find(x => x.id === f.spotId);
  return s ? s.cat : null;
}
// Which categories actually have posts, in a sensible order, for the chip row.
const FEED_CHIP_ORDER = ["food","coffee","bar","hangout","nature","abandoned","tunnel","rooftop"];
function renderFeedChips() {
  const el = document.getElementById("feedFilters");
  if (!el) return;
  const present = new Set(allFeedPosts().map(feedCatOf).filter(Boolean));
  const cats = FEED_CHIP_ORDER.filter(c => present.has(c));
  el.innerHTML =
    `<button class="chip ${state.feedFilter === "all" ? "active" : ""}" data-fcat="all">All</button>` +
    cats.map(c => `<button class="chip ${state.feedFilter === c ? "active" : ""}" data-fcat="${c}">${CHIP_LABEL[c] || c}</button>`).join("");
  el.querySelectorAll(".chip").forEach(c => c.onclick = () => {
    state.feedFilter = c.dataset.fcat;
    renderFeedChips();
    renderFeed();
    el.scrollIntoView({ block: "nearest" });
  });
}

// Feed is now the immersive reels experience (see renderReels below). The old
// card feed is preserved as renderFeedLegacy in case we want it back.
function renderFeed() { return renderReels(); }

// ===== Immersive reels feed (TikTok / Reels style) =====
// Full-viewport vertical cards, one spot per screen, CSS scroll-snap. Each card
// fills the screen with the spot's media. IMPORTANT reality check on video:
//   - youtube / mp4 CAN muted-autoplay, so those play inline when in view.
//   - TikTok / Instagram iframes CANNOT be autoplayed by us (the platforms
//     block it), so for those we show the real preview frame with a big play
//     button; tapping expands the official embed in place (still their player,
//     still credited, still linking back). We are honest about this limit.
// Only the card in view loads/plays its media (IntersectionObserver); the rest
// stay as cheap static frames so scrolling stays smooth.
state.reelCat = "all";
let reelObserver = null;

function reelSpots() {
  let list = state.spots.filter(s => spotMode(s.cat) === state.mode && previewImg(s));
  if (state.reelCat !== "all") list = list.filter(s => s.cat === state.reelCat);
  // Media-rich, highly-rated, buzzing spots lead.
  list.sort((a, b) => (spotScore(b) + (hasVideo(b) ? 0.5 : 0)) - (spotScore(a) + (hasVideo(a) ? 0.5 : 0)));
  return list.slice(0, 40);
}
function renderReelFilters(cats) {
  const el = document.getElementById("reelFilters");
  if (!el) return;
  const present = cats;
  el.innerHTML =
    `<button class="reel-chip ${state.reelCat === "all" ? "active" : ""}" data-rcat="all">All</button>` +
    present.map(c => `<button class="reel-chip ${state.reelCat === c ? "active" : ""}" data-rcat="${c}">${CHIP_LABEL[c] || c}</button>`).join("");
  el.querySelectorAll(".reel-chip").forEach(b => b.onclick = () => {
    state.reelCat = b.dataset.rcat;
    renderReels();
  });
}
// Categories that have a license-clear ambient loop in vid/<cat>.mp4
const AMBIENT_CATS = new Set(["food","coffee","bar","hangout","nature","abandoned","tunnel","rooftop"]);
const PREFERS_REDUCED_MOTION = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function renderReels() {
  const wrap = document.getElementById("reels");
  if (!wrap) return;
  // Category chips from the categories that actually have media in this mode.
  const modeMedia = state.spots.filter(s => spotMode(s.cat) === state.mode && previewImg(s));
  const catOrder = ["food","coffee","bar","hangout","nature","abandoned","tunnel","rooftop"];
  const present = catOrder.filter(c => modeMedia.some(s => s.cat === c) && MODES[state.mode].cats.includes(c));
  renderReelFilters(present);

  const list = reelSpots();
  const haveLoc = !!state.meAt;
  const me = userPoint();
  if (!list.length) {
    wrap.innerHTML = `<div class="reel-empty"><span class="em-moth">${SVG.fox}</span><b>Nothing to show here</b><small>No spots with media in this filter. Try another category.</small></div>`;
    return;
  }
  wrap.innerHTML = list.map(s => {
    const pv = previewImg(s);
    const vt = videoThumb(s);
    const vurl = firstVideoUrl(s);
    const rating = rateOf(s);
    const mi = milesBetween(me, s);
    const dist = haveLoc ? `<span class="rl-pill">◎ ${mi < 10 ? mi.toFixed(1) : Math.round(mi)} mi</span>` : "";
    const vtype = (s.embeds || []).find(e => e.type === "tiktok" || e.type === "instagram");
    const photoLayer = pv
      ? `<div class="rl-media kb" style="background-image:url('${pv}')"></div>`
      : `<div class="rl-media rl-solid" style="background:${catColor(s.cat)}">${catLogo(s.cat)}</div>`;
    // Ambient category clip (license-clear Pexels loop) autoplays muted so the
    // feed feels alive like TikTok. It's mood video for the category, not the
    // spot's own footage (TikTok/IG block real autoplay); the spot photo is the
    // poster so it stays coherent, and the real clip is still tap-to-watch.
    // Several clips per category; pick one deterministically by spot id so
    // neighbouring spots in the same category don't show the same loop.
    const clipN = (window.AMBIENT_CLIPS && window.AMBIENT_CLIPS[s.cat]) || 0;
    const clipIdx = clipN ? (Math.abs(s.id) % clipN) + 1 : 0;
    const ambient = clipN
      ? `<video class="rl-vid" muted loop playsinline preload="none"${pv ? ` poster="${pv}"` : ""}><source src="vid/${s.cat}-${clipIdx}.mp4?v=2" type="video/mp4"></video>`
      : "";
    const mediaBg = photoLayer + ambient;
    const playBtn = vurl
      ? `<button class="rl-play" data-vtype="${vtype ? vtype.type : ""}" data-vurl="${vurl}" aria-label="Play video">
           <svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
         </button>` : "";
    const credit = vt && vt.author ? `<span class="rl-credit">▶ video by @${vt.author}</span>` : "";
    return `<article class="reel" data-id="${s.id}">
      ${mediaBg}
      <div class="rl-shade"></div>
      ${playBtn}
      <div class="rl-overlay">
        <div class="rl-info">
          <span class="rl-cat">${CAT_META[s.cat].emoji} ${CAT_META[s.cat].label}</span>
          <h2 class="rl-name">${s.name}</h2>
          <div class="rl-meta">${rating ? `<span class="rl-pill star">★ ${rating.toFixed(1)}</span>` : ""}${dist}${cityOf(s.zip) ? `<span class="rl-pill">${cityOf(s.zip)}</span>` : ""}</div>
          <p class="rl-desc">${firstSentence(s.desc) || s.desc}</p>
          ${credit}
        </div>
      </div>
      <div class="rl-rail">
        <button class="rl-act rl-save ${isSaved(s.id) ? "on" : ""}" data-act="save" aria-label="Save">
          <svg viewBox="0 0 24 24" fill="${isSaved(s.id) ? "currentColor" : "none"}" stroke="currentColor" stroke-width="2"><path d="M6 3h12a1 1 0 0 1 1 1v16l-7-4-7 4V4a1 1 0 0 1 1-1z"/></svg>
          <span>${isSaved(s.id) ? "Saved" : "Save"}</span>
        </button>
        <button class="rl-act" data-act="dir" aria-label="Directions">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M12 21s7-6.3 7-11a7 7 0 1 0-14 0c0 4.7 7 11 7 11z"/><circle cx="12" cy="10" r="2.5"/></svg>
          <span>Go</span>
        </button>
        <button class="rl-act" data-act="share" aria-label="Share">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7"/><path d="M12 15V3.5"/><path d="M8 7l4-4 4 4"/></svg>
          <span>Share</span>
        </button>
        <button class="rl-act" data-act="open" aria-label="Open details">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 8h.01M11 12h1v4h1"/></svg>
          <span>Info</span>
        </button>
      </div>
    </article>`;
  }).join("");

  // Tapping the card (outside the rail / play button) opens the existing detail.
  wrap.querySelectorAll(".reel").forEach(card => {
    const s = state.spots.find(x => x.id === +card.dataset.id);
    if (!s) return;
    card.addEventListener("click", e => {
      if (e.target.closest(".rl-rail") || e.target.closest(".rl-play")) return;
      showView("map"); openSheet(s.id);
    });
    card.querySelectorAll(".rl-act").forEach(b => b.onclick = () => {
      const act = b.dataset.act;
      if (act === "save") {
        const nowOn = toggleSaved(s.id);
        b.classList.toggle("on", nowOn);
        b.querySelector("svg").setAttribute("fill", nowOn ? "currentColor" : "none");
        b.querySelector("span").textContent = nowOn ? "Saved" : "Save";
      } else if (act === "dir") { routeToSpot(s); }
      else if (act === "share") {
        const url = `${location.origin}${location.pathname}#spot=${s.id}`;
        if (navigator.share) navigator.share({ title: s.name, text: `${s.name} — a spot on What's the Move?`, url }).catch(() => {});
        else navigator.clipboard.writeText(url).then(() => toast("Link copied 🔗")).catch(() => {});
      } else if (act === "open") { showView("map"); openSheet(s.id); }
    });
    // Play button: expand the official embed in place (honest about no autoplay).
    const play = card.querySelector(".rl-play");
    if (play) play.onclick = () => expandReelEmbed(card, play.dataset.vtype, play.dataset.vurl);
  });

  // Only the card in view is "active": Ken Burns animates and any real video
  // plays; off-screen cards are paused so scrolling stays cheap.
  if (reelObserver) reelObserver.disconnect();
  reelObserver = new IntersectionObserver(entries => {
    entries.forEach(en => {
      en.target.classList.toggle("in-view", en.isIntersecting && en.intersectionRatio > 0.6);
      const v = en.target.querySelector("video");
      if (v) {
        if (en.isIntersecting && en.intersectionRatio > 0.6 && !PREFERS_REDUCED_MOTION) v.play().catch(() => {});
        else v.pause();
      }
    });
  }, { root: wrap, threshold: [0, 0.6, 1] });
  wrap.querySelectorAll(".reel").forEach(c => reelObserver.observe(c));
  // Prime the first card so it feels alive immediately (best-effort autoplay).
  const first = wrap.querySelector(".reel");
  if (first) {
    first.classList.add("in-view");
    const fv = first.querySelector("video");
    if (fv && !PREFERS_REDUCED_MOTION) fv.play().catch(() => {});
  }
  // A few mobile browsers won't start even a muted clip until the first user
  // interaction. Kick the in-view card's video on the first touch/scroll so it
  // never stays frozen after the user starts using the feed.
  const kick = () => {
    const v = wrap.querySelector(".reel.in-view video") || wrap.querySelector(".reel video");
    if (v && !PREFERS_REDUCED_MOTION) v.play().catch(() => {});
  };
  ["touchstart", "pointerdown", "scroll"].forEach(ev =>
    wrap.addEventListener(ev, kick, { once: true, passive: true }));
}
// Swap a reel's static frame for the platform's real embed player on tap.
// TikTok/IG will not let us autoplay, so this is the honest "press play" path.
function expandReelEmbed(card, type, url) {
  const media = card.querySelector(".rl-media");
  const play = card.querySelector(".rl-play");
  if (!media) return;
  if (type === "youtube" || type === "mp4") return; // (handled inline elsewhere)
  media.classList.remove("kb");
  media.style.backgroundImage = "";
  media.innerHTML = `<div class="rl-embed">${embedBlock({ type, url })}</div>`;
  if (play) play.remove();
  processEmbeds([type]);
}

function renderFeedLegacy() {
  renderFeedChips();
  const all = allFeedPosts().filter(f => {
    if (state.feedFilter === "all") return true;
    return feedCatOf(f) === state.feedFilter;
  });
  const feedEl = document.getElementById("feed");
  if (!all.length) {
    feedEl.innerHTML = `<div class="empty-state"><span class="em-moth">${SVG.fox}</span><b>Nothing here yet</b><small>No posts in that category. Try another type, or post the first one.</small></div>`;
    return;
  }
  feedEl.innerHTML = all.map((f) => {
    const key = f._key, cid = "cmts-" + cssId(key);
    const spot = state.spots.find(s => f.spotId === s.id);
    const media = spot ? faceStyle(spot) : `style="background:var(--bg-3)"`;
    const liked = state.likes["f" + key];
    const likeCount = (f.likes || 0) + (liked ? 1 : 0);
    return `<div class="feed-card">
      <div class="fc-head"><span class="fc-avatar">${f.user[0].toUpperCase()}</span><b>@${f.user}</b><span class="fc-time">${f.time}</span></div>
      ${spot ? `<div class="fc-media fc-logo-media" data-id="${spot.id}" data-key="${key}" ${media}>${realPhoto(spot) ? "" : catLogo(spot.cat)}${playBadge(spot)}<div class="fc-heart-burst"><span>❤️</span></div></div>` : ""}
      <div class="fc-body">${f.text}</div>
      <div class="fc-actions">
        <button class="like-btn ${liked ? "liked" : ""}" data-key="${key}">${liked ? "❤️" : "🤍"} ${likeCount}</button>
        <button class="cmt-btn" data-cid="${cid}">${SVG.comment}${(f.comments || 0) + myComments(key).length}</button>
        <button>${SVG.share}Share</button>
      </div>
      <div class="fc-comments" id="${cid}" style="display:none">
        ${(f.seedComments || []).map(c => `<div class="fc-comment"><b>@${c.user}</b> ${c.text}</div>`).join("")}
        ${myComments(key).map(c => `<div class="fc-comment"><b>@you</b> ${c}</div>`).join("")}
        <form class="fc-comment-form" data-key="${key}" data-cid="${cid}">
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
        likeFeedPost(m.dataset.key, true);
        const burst = m.querySelector(".fc-heart-burst");
        burst.classList.remove("pop"); void burst.offsetWidth; burst.classList.add("pop");
      } else {
        lastTap = now;
        tapTimer = setTimeout(() => { showView("map"); openSheet(+m.dataset.id); }, 300);
      }
    };
  });
  document.querySelectorAll(".like-btn").forEach(b => b.onclick = () => likeFeedPost(b.dataset.key, false));
  document.querySelectorAll(".cmt-btn").forEach(b => b.onclick = () => {
    const el = document.getElementById(b.dataset.cid);
    el.style.display = el.style.display === "none" ? "block" : "none";
  });
  document.querySelectorAll(".fc-comment-form").forEach(f => f.onsubmit = e => {
    e.preventDefault();
    const input = f.querySelector("input");
    if (!input.value.trim()) return;
    const all = JSON.parse(localStorage.getItem("moth.comments") || "{}");
    (all[f.dataset.key] = all[f.dataset.key] || []).push(input.value.trim());
    localStorage.setItem("moth.comments", JSON.stringify(all));
    renderFeed();
    const el = document.getElementById(f.dataset.cid);
    if (el) el.style.display = "block";
  });
}
// Safe DOM id from a stable post key (keys contain | and other chars).
function cssId(key) { return String(key).replace(/[^a-zA-Z0-9_-]/g, "_"); }
function likeFeedPost(key, forceLike) {
  const k = "f" + key;
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
  document.getElementById("sheetMeta").innerHTML = `${cityOf(s.zip) ? cityOf(s.zip) + " · " : ""}ZIP ${s.zip}` +
    (s.reviewUrl ? ` · <a class="meta-link" href="${s.reviewUrl}" target="_blank" rel="noopener">Read reviews ↗</a>` : "");
  const dirBtn = document.getElementById("dirBtn");
  dirBtn.href = extMapsUrl(s);                 // fallback if in-app routing can't run
  dirBtn.onclick = (e) => { e.preventDefault(); routeToSpot(s); };
  const saveBtn = document.getElementById("saveBtn");
  if (saveBtn) { saveBtn.onclick = () => toggleSaved(s.id); syncSaveBtn(s.id); }
  // Share this spot (native share sheet on phones, copy-link fallback on desktop).
  const shareBtn = document.getElementById("shareBtn");
  if (shareBtn) {
    const shareUrl = `${location.origin}${location.pathname}#spot=${s.id}`;
    shareBtn.onclick = async () => {
      const data = { title: s.name, text: `${s.name} — a spot on What's the Move?`, url: shareUrl };
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
    ? (typeof cred === "string"
        ? cred                                                   // plain-text attribution
        : `Photo: <a href="${cred.url}" target="_blank" rel="noopener">${cred.by}</a> · ${cred.license}`)
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
  // We deliberately do NOT render the platform embed player any more. It very
  // often resolved to a "video currently unavailable" box even when the post is
  // fine, which looked broken. The preview frame plus a direct link does the
  // same job and always works.
  const label = { tiktok: "Open on TikTok", instagram: "Open on Instagram", reddit: "Open on Reddit" };
  const who = videoThumb(s);
  const directLinks = embeds.map(e =>
    `<a class="embed-open" href="${e.url}" target="_blank" rel="noopener">▶ ${label[e.type] || "Open post"} ↗</a>`).join("");
  slot.innerHTML =
    `<h3 class="embed-h">From explorers who've been</h3>
     <div class="embed-openrow">${directLinks}</div>
     <p class="embed-note">${who && who.author ? `Shot by <b>@${who.author}</b>. ` : ""}Opens on their platform, where they posted it.</p>`;
}

function isCommunitySpot(s) { return s.cat === "abandoned" || s.cat === "tunnel"; }
// Reviews are handled honestly. The seeded lines are a researcher's summary of
// what a place is like, NOT quotes from real named users, so they are no longer
// dressed up with invented @handles and star ratings. The real rating and the
// link to the real reviews are what carry weight, so those lead.
function renderReviews(s) {
  const extra = (window.SPOT_EXTRAS && window.SPOT_EXTRAS[s.id]) || {};
  const community = isCommunitySpot(s);
  const h = document.getElementById("reviewsHeading");
  if (h) h.textContent = "What people say";

  const userWritten = s.reviews.filter(r => r.mine);       // reviews left in-app are real
  const seeded = s.reviews.filter(r => !r.mine);
  const rating = rateOf(s);

  let href, label;
  if (community) {
    href = `https://www.reddit.com/search/?q=${encodeURIComponent(s.name + " Texas")}`;
    label = "See the threads on Reddit ↗";
  } else if (extra.reviewUrl && /yelp\.com\/biz/.test(extra.reviewUrl)) {
    href = extra.reviewUrl; label = "Read the real reviews on Yelp ↗";
  } else if (extra.reviewUrl && /google\./.test(extra.reviewUrl)) {
    href = extra.reviewUrl; label = "Read the real reviews on Google ↗";
  } else {
    href = "https://www.google.com/maps/search/?api=1&query=" +
           encodeURIComponent(s.name + " " + (cityOf(s.zip) || "Dallas") + " TX");
    label = "Read the real reviews on Google ↗";
  }

  const head = `<a class="reviews-cta" href="${href}" target="_blank" rel="noopener">
      ${rating ? `<span class="rc-score">${rating.toFixed(1)}</span>` : ""}
      <span class="rc-text"><b>${label}</b><small>${rating ? "Rated by real customers" : "See what people are saying"}</small></span>
    </a>`;

  const mine = userWritten.map(r => `
      <div class="review">
        <div class="review-head"><b>@${r.user}</b><span class="stars">${starStr(r.stars)}</span></div>
        ${r.text}
      </div>`).join("");
  const gist = seeded.length
    ? `<div class="gist-label">The gist</div>` + seeded.map(r => `<div class="review say">${r.text}</div>`).join("")
    : "";
  const fallback = `<div class="empty-state"><span class="em-moth">${SVG.fox}</span><b>Be the first</b><small>Nobody has reviewed this one yet.</small></div>`;
  document.getElementById("reviews").innerHTML = head + mine + gist + (mine || gist ? "" : fallback);
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
  // mine: true marks a genuinely user-written review, so it renders with a real
  // handle and stars while seeded summary lines stay unattributed.
  s.reviews.unshift({ user: (window.myName ? myName() : "you"), stars: state.reviewStars, text, mine: true });
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
  renderSaved();
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
  document.getElementById("scMeta").textContent = `★ ${rateOf(s).toFixed(1)} · ${cityOf(s.zip) || "ZIP " + s.zip} · ${SKETCH_WORDS[s.danger]}`;
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
    <div class="g-rec-info"><b>${s.name}</b><small>${CAT_META[s.cat].label} · ${cityOf(s.zip) || s.zip}${far}</small><span class="g-stars">${rating ? starStr(rating) + " " + rating.toFixed(1) : "★ new"}</span></div>`;
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
// Detect a place (city / neighborhood / ZIP) mentioned anywhere in the question,
// so "any abandoned places in Plano" or "coffee in 75024" scope to that area.
function detectPlaceInQuery(q) {
  const s = " " + q.toLowerCase().trim() + " ";
  const zip = (s.match(/\b\d{5}\b/) || [])[0];
  if (zip) return zip;
  let found = null;
  ALL_PLACES.forEach(p => { if (!found && saysWord(s, p)) found = p; });
  return found;
}
// Does a spot sit in the requested place (ZIP match, or city/neighborhood match)?
function spotInPlace(s, place) {
  if (!place) return true;
  if (/^\d{5}$/.test(place)) return String(s.zip) === place;
  return placesFor(s.zip).some(p => p.toLowerCase() === place);
}
function guideUnderstand(q) {
  const s = " " + q.toLowerCase().trim() + " ";
  const cat = guideDetectCat(q);
  const craving = Object.entries(CRAVINGS).find(([, ws]) => ws.some(w => saysWord(s, w)));
  const moods = Object.entries(MOODS).filter(([, m]) => m.words.some(w => saysWord(s, w))).map(([k, m]) => ({ key: k, ...m }));
  const near = NEAR_WORDS.some(w => s.includes(w));
  const place = detectPlaceInQuery(q);
  const followUp = /^(what about|how about|and |any |something else|other|more|instead|else)/.test(q.toLowerCase().trim());
  return { cat, craving: craving ? craving[0] : null, cravingWords: craving ? craving[1] : [], moods, near, place, followUp, raw: q };
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
    // A named place (city / neighborhood / ZIP) is a hard scope: reward spots in
    // it, push everything else down.
    if (intent.place) sc += spotInPlace(s, intent.place) ? 6 : -4;
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

  // If they named a place and we have spots there, restrict to it.
  let ranked = scored;
  let placeEmpty = false;
  if (intent.place) {
    const inPlace = scored.filter(x => spotInPlace(x.s, intent.place));
    if (inPlace.length) ranked = inPlace; else placeEmpty = true;
  }
  // Do not hand back a taco question with a nature answer.
  const strong = intent.craving ? ranked.filter(x => intent.cravingWords.some(w =>
    saysWord((x.s.name + " " + x.s.desc + " " + x.s.tags.join(" ")).toLowerCase(), w))) : ranked;
  return { hits: (strong.length ? strong : ranked).slice(0, 3), me,
    fellBack: intent.craving && !strong.length, place: intent.place, placeEmpty };
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

  // Scope the answer to a named place when one was asked for.
  if (intent.place) {
    const nice = /^\d{5}$/.test(intent.place) ? intent.place : intent.place.replace(/\b\w/g, c => c.toUpperCase());
    lead = (r.placeEmpty
      ? `I don't have much saved right in ${nice} yet, but the closest I'd send you: ${lead}`
      : `Around ${nice}: ${lead}`);
  }

  const why = [];
  if (rateOf(top.s)) why.push(`${rateOf(top.s).toFixed(1)}★`);
  why.push(dist(top.mi));
  if (hasVideo(top.s)) why.push("there's a video of it");
  const tip = firstSentence(top.s.desc);
  return `${lead} <span class="g-why">(${why.join(" · ")})</span>.<br>${tip}`
       + (n > 1 ? `<br><br>${n - 1} more below if that's not it.` : "");
}

// TODO (LLM): general "answer anything" questions (e.g. "what's the history of
// Deep Ellum?", trip planning, multi-constraint reasoning) will later route to a
// real LLM via a Supabase Edge Function that holds the API key server-side
// (keep the key OUT of this client). The plan: if the local intent parser finds
// no strong spot match, POST the question + a compact list of nearby spots to
// that function and render its reply here. For now we are deliberately excellent
// at spot-data questions (category, craving, mood, distance, and place/ZIP).
function guideAsk(q) {
  guideAddMsg("user", q);
  const intent = guideUnderstand(q);
  // "what about coffee instead" keeps the mood/place from the previous question
  if (intent.followUp && guideAsk._last) {
    intent.moods = intent.moods.length ? intent.moods : guideAsk._last.moods;
    intent.near = intent.near || guideAsk._last.near;
    intent.place = intent.place || guideAsk._last.place;
  }
  guideAsk._last = intent;

  const r = guideSearch(intent);
  guideTyping(true);
  // If the AI proxy is configured, let a real (free) LLM answer using our spots
  // as grounding — this is the "answer anything" path. Falls back to the local
  // brain on any error or timeout, so the guide always replies.
  if (window.PROWL_AI_URL) { guideAskLLM(q, intent, r); return; }
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

function guideEscape(t) {
  return String(t).replace(/[&<>]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c])).replace(/\n/g, "<br>");
}
function guideLocalFallback(intent, r) {
  const reply = guideReply(intent, r);
  if (reply) { guideAddMsg("bot", reply); r.hits.forEach(h => guideAddRec(h.s, h.mi)); }
  else guideAddMsg("bot", "I don't have anything saved for that yet. Try tacos, coffee to work from, rooftop drinks, somewhere chill, a trail, or an abandoned spot.");
}
async function guideAskLLM(q, intent, r) {
  const spots = (r.hits || []).slice(0, 12).map(h => ({
    name: h.s.name, cat: CAT_META[h.s.cat] ? CAT_META[h.s.cat].label : h.s.cat,
    city: cityOf(h.s.zip) || h.s.zip,
    desc: firstSentence(h.s.desc) || h.s.desc,
    rating: rateOf(h.s) || undefined,
    dist: (typeof h.mi === "number") ? +h.mi.toFixed(1) : undefined,
  }));
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 12000);
  try {
    const res = await fetch(window.PROWL_AI_URL, {
      method: "POST", signal: ctrl.signal,
      headers: { "Content-Type": "application/json",
        ...(window.PROWL_AI_KEY ? { Authorization: "Bearer " + window.PROWL_AI_KEY, apikey: window.PROWL_AI_KEY } : {}) },
      body: JSON.stringify({ question: q, place: intent.place || null, spots }),
    });
    clearTimeout(timer);
    const j = await res.json().catch(() => null);
    guideTyping(false);
    if (res.ok && j && j.answer) {
      guideAddMsg("bot", guideEscape(j.answer));
      (r.hits || []).slice(0, 3).forEach(h => guideAddRec(h.s, h.mi));
    } else {
      guideLocalFallback(intent, r);
    }
  } catch (e) {
    clearTimeout(timer);
    guideTyping(false);
    guideLocalFallback(intent, r);
  }
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
    guideAddMsg("bot", "Hey, I'm your guide 🦉 Tell me what you're feeling and I'll point you at spots. Try something like \"spicy tacos\" or \"rooftop for drinks.\"");
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

// ===== First-run onboarding (shown once) =====
function initOnboarding() {
  const ob = document.getElementById("onboard");
  if (!ob || localStorage.getItem("prowl.onboarded")) return;
  ob.hidden = false;
  const done = () => { localStorage.setItem("prowl.onboarded", "1"); ob.hidden = true; };
  const skip = document.getElementById("obSkip");
  const locate = document.getElementById("obLocate");
  if (skip) skip.onclick = done;
  if (locate) locate.onclick = () => {
    if (navigator.geolocation && window.isSecureContext) {
      locate.textContent = "Locating…"; locate.disabled = true;
      navigator.geolocation.getCurrentPosition(
        (p) => {
          if (typeof showMe === "function") showMe(p.coords.latitude, p.coords.longitude);
          if (typeof startMe === "function") startMe();
          if (typeof map !== "undefined" && map) map.setView([p.coords.latitude, p.coords.longitude], 14);
          done();
          if (typeof toast === "function") toast("Showing spots near you 📍");
        },
        () => { done(); if (typeof toast === "function") toast("No location yet — showing DFW. Turn it on anytime."); },
        { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 }
      );
    } else { done(); if (typeof toast === "function") toast("Open the https link to use your location"); }
  };
}
initOnboarding();

// ===== Push notifications (opt-in) =====
const VAPID_PUBLIC_KEY = "BP127RI2TonhyP2jLJfIbgai_zwty1tuduznu8nxa-6CVk6jzgE4rijw5knzT5QIZQEdAIjPgPvLCMxk4evrdvQ";
function urlB64ToUint8(base64) {
  const pad = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + pad).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64), arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}
async function notifState() {
  if (!("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) return "unsupported";
  if (Notification.permission === "denied") return "denied";
  try { const reg = await navigator.serviceWorker.ready; return (await reg.pushManager.getSubscription()) ? "on" : "off"; }
  catch { return "off"; }
}
async function renderNotif() {
  const btn = document.getElementById("notifEnable"), test = document.getElementById("notifTest"), label = document.getElementById("notifState");
  if (!btn) return;
  const st = await notifState();
  if (st === "unsupported") { btn.hidden = true; if (test) test.hidden = true; if (label) label.textContent = "Not supported on this browser"; return; }
  if (st === "denied") { btn.hidden = true; if (test) test.hidden = true; if (label) label.textContent = "Blocked. Enable notifications in your browser settings."; return; }
  btn.hidden = false;
  if (st === "on") { btn.textContent = "On"; btn.disabled = true; if (test) test.hidden = false; if (label) label.textContent = "You're set. We'll ping you when a friend goes live."; }
  else { btn.textContent = "Turn on"; btn.disabled = false; if (test) test.hidden = true; if (label) label.textContent = "When a friend goes live near you"; }
}
async function enableNotifications() {
  if (!window.currentUser || !currentUser()) { toast("Log in first to get notifications"); if (window.openAuth) openAuth("login"); return; }
  const btn = document.getElementById("notifEnable"); btn.disabled = true; btn.textContent = "…";
  try {
    const perm = await Notification.requestPermission();
    if (perm !== "granted") { toast("Notifications not allowed"); return renderNotif(); }
    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlB64ToUint8(VAPID_PUBLIC_KEY) });
    const j = sub.toJSON(), u = currentUser();
    const { error } = await window.sb.from("push_subscriptions").upsert({
      user_id: u.id, endpoint: sub.endpoint, p256dh: j.keys.p256dh, auth: j.keys.auth,
      crew: (window.live && live.crew) || null,
      lat: state.meAt ? state.meAt[0] : null, lng: state.meAt ? state.meAt[1] : null,
    }, { onConflict: "endpoint" });
    if (error) throw error;
    toast("Notifications on 🔔");
  } catch (e) { console.warn("notif enable", e); toast("Couldn't turn on notifications"); }
  renderNotif();
}
async function sendTestNotif() {
  if (!window.PROWL_PUSH_URL) return;
  try {
    const res = await fetch(window.PROWL_PUSH_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(window.authHeaders ? authHeaders() : {}), apikey: window.PROWL_AI_KEY },
      body: JSON.stringify({ mode: "self", title: "What's the Move?", body: "Test ping. Notifications are working.", url: "./" }),
    });
    const j = await res.json().catch(() => ({}));
    toast(j.sent ? "Sent. Check your notifications." : "No devices registered yet.");
  } catch (e) { toast("Test failed"); }
}
document.getElementById("notifEnable")?.addEventListener("click", enableNotifications);
document.getElementById("notifTest")?.addEventListener("click", sendTestNotif);
renderNotif();
