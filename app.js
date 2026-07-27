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
function starStr(n) {
  const full = Math.round(n);
  return "★".repeat(full) + "☆".repeat(5 - full);
}
const SKETCH_WORDS = ["", "Chill", "Easy", "Moderate", "Sketchy", "Extreme"];

// ===== Theme =====
const savedTheme = localStorage.getItem("haunt.theme") || "night";
document.documentElement.dataset.theme = savedTheme;
document.getElementById("themeBtn").onclick = () => {
  const t = document.documentElement.dataset.theme === "night" ? "day" : "night";
  document.documentElement.dataset.theme = t;
  localStorage.setItem("haunt.theme", t);
  setBasemap(t);
};

// ===== Map =====
const map = L.map("map", { zoomControl: false }).setView([32.79, -96.82], 12);

const TILE_URLS = {
  // Labeled tiles so streets + neighborhoods are readable (like Snap Map)
  day: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
  night: "https://{s}.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}{r}.png",
};
let tileLayer = null;
function setBasemap(theme) {
  if (tileLayer) map.removeLayer(tileLayer);
  tileLayer = L.tileLayer(TILE_URLS[theme], {
    attribution: '&copy; OpenStreetMap &copy; CARTO', maxZoom: 19,
  }).addTo(map);
}
setBasemap(savedTheme);

// Heat glow layer (Snap Map vibe): soft glow under spot clusters
const glowLayer = L.layerGroup().addTo(map);
function renderGlow() {
  glowLayer.clearLayers();
  const byZip = {};
  state.spots.filter(s => spotMode(s.cat) === state.mode)
    .forEach(s => (byZip[s.zip] = byZip[s.zip] || []).push(s));
  Object.values(byZip).forEach(spots => {
    if (spots.length < 2) return;
    const lat = spots.reduce((a, s) => a + s.lat, 0) / spots.length;
    const lng = spots.reduce((a, s) => a + s.lng, 0) / spots.length;
    L.circle([lat, lng], {
      radius: 1400 + spots.length * 350,
      stroke: false, fillColor: state.mode === "urbex" ? "#9b6dff" : "#35bdf7",
      fillOpacity: 0.10 + Math.min(spots.length * 0.02, 0.1),
    }).addTo(glowLayer);
  });
}

const cluster = L.markerClusterGroup({
  showCoverageOnHover: false,
  maxClusterRadius: 52,
  iconCreateFunction: c => L.divIcon({
    className: "",
    html: `<div class="bubble-cluster">${c.getChildCount()}</div>`,
    iconSize: [46, 46], iconAnchor: [23, 23],
  }),
});
map.addLayer(cluster);

// Presence: who's here right now (demo data)
const HERE = { 3: 4, 4: 3, 8: 6, 9: 2, 12: 1 };
function hereCount(s) { return HERE[s.id] || 0; }

function pinFace(s) {
  if (s.photos && s.photos.length) return `style="background-image:url('${s.photos[0]}')"`;
  return `style="background:${CAT_META[s.cat].grad}"`;
}
function renderMarkers() {
  cluster.clearLayers();
  visibleSpots().forEach(s => {
    const hasPhoto = s.photos && s.photos.length;
    const icon = L.divIcon({
      className: "",
      html: `<div class="bubble-pin ${s.sponsored ? "sponsored" : ""} ${s.id === state.openSpotId ? "selected" : ""}" data-sid="${s.id}" ${pinFace(s)}>${hasPhoto ? "" : `<span>${CAT_META[s.cat].emoji}</span>`}${hereCount(s) ? `<span class="here-dot">${hereCount(s)}</span>` : ""}${s.sponsored ? `<span class="sponsor-tag">Featured</span>` : ""}</div>`,
      iconSize: [48, 48], iconAnchor: [24, 24],
    });
    const m = L.marker([s.lat, s.lng], { icon });
    m.on("click", () => openSheet(s.id));
    cluster.addLayer(m);
  });
  document.getElementById("spotCount").textContent = visibleSpots().length;
}
// Lift + ring the selected pin without a full re-render
function highlightSelectedPin() {
  document.querySelectorAll(".bubble-pin").forEach(p => {
    p.classList.toggle("selected", +p.dataset.sid === state.openSpotId);
  });
}

// ===== Story strip =====
function renderStories() {
  // Cool mode leads with what's buzzing; Abandoned leads with the sketchiest.
  const inMode = state.spots.filter(s => spotMode(s.cat) === state.mode);
  inMode.sort((a, b) => state.mode === "urbex"
    ? (b.danger + avgStars(b)) - (a.danger + avgStars(a))
    : (hereCount(b) + avgStars(b)) - (hereCount(a) + avgStars(a)));
  const hot = inMode.slice(0, 8);
  document.getElementById("storyStrip").innerHTML = hot.map(s => {
    const hasPhoto = s.photos && s.photos.length;
    const face = hasPhoto
      ? `style="background-image:url('${s.photos[0]}')"`
      : `style="background:${CAT_META[s.cat].grad}"`;
    const seen = (JSON.parse(localStorage.getItem("moth.seenStories") || "[]")).includes(s.id);
    return `<button class="story ${seen ? "seen" : ""}" data-id="${s.id}">
      <span class="story-ring"><span class="story-face" ${face}>${hasPhoto ? "" : CAT_META[s.cat].emoji}</span></span>
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
  if (!s || !s.photos || !s.photos.length) { openSheet(id); return; }
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
function visibleSpots() {
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

// ===== Inline SVG UI icons (currentColor, matches tab-bar style) =====
const SVG = {
  chill: '<svg class="ico" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M8 14.5s1.5 2 4 2 4-2 4-2"/><path d="M9 9.5h.01M15 9.5h.01"/></svg>',
  sketchy: '<svg class="ico" viewBox="0 0 24 24"><path d="M10.3 4l-8 14a2 2 0 0 0 1.7 3h16a2 2 0 0 0 1.7-3l-8-14a2 2 0 0 0-3.4 0z"/><path d="M12 9.5v4M12 17h.01"/></svg>',
  comment: '<svg class="ico" viewBox="0 0 24 24"><path d="M20.5 12a8 8 0 0 1-11.6 7.1L4 20.5l1.4-4.9A8 8 0 1 1 20.5 12z"/></svg>',
  share: '<svg class="ico" viewBox="0 0 24 24"><path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7"/><path d="M12 15V3.5"/><path d="M8 7l4-4 4 4"/></svg>',
  fox: '<svg class="em-fox" viewBox="0 0 64 64"><path d="M18 12 26 22M46 12 38 22" stroke="currentColor" stroke-width="4" stroke-linecap="round" fill="none"/><path fill="currentColor" d="M32 14C21 14 14 23 14 34 14 47 22 54 32 54 42 54 50 47 50 34 50 23 43 14 32 14Z"/><circle cx="24" cy="32" r="7" fill="#7fdbff"/><circle cx="40" cy="32" r="7" fill="#7fdbff"/><circle cx="24" cy="32" r="2.6" fill="currentColor"/><circle cx="40" cy="32" r="2.6" fill="currentColor"/><path d="M28 40 32 46 36 40Z" fill="#7fdbff"/></svg>',
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
    const hasPhoto = s.photos && s.photos.length;
    const bg = hasPhoto ? `style="background-image:url('${s.photos[0]}')"` : `style="background:${CAT_META[s.cat].grad}"`;
    return `<div class="explore-card ${s.sponsored ? "sponsored" : ""}" data-id="${s.id}" tabindex="0" ${bg}>
      ${hasPhoto ? "" : `<span class="ec-emoji">${CAT_META[s.cat].emoji}</span>`}
      ${s.sponsored ? `<span class="ec-featured">★ Featured</span>` : ""}
      <span class="ec-label">${s.name}<small>${starStr(avgStars(s))} · ZIP ${s.zip} · <span class="sketch-badge sketch-${s.danger}">${SKETCH_WORDS[s.danger]}</span></small></span>
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

// ===== Crew layer (friends on the map) =====
const CREW = [
  { name: "kayla", lat: 32.744, lng: -96.828, hue: "#a78bfa" },
  { name: "leo", lat: 32.783, lng: -96.799, hue: "#f472b6" },
  { name: "sam", lat: 32.758, lng: -96.757, hue: "#34d399" },
  { name: "mena", lat: 32.948, lng: -96.772, hue: "#fbbf24" },
];
const crewLayer = L.layerGroup().addTo(map);
function renderCrew() {
  crewLayer.clearLayers();
  CREW.forEach(f => {
    const icon = L.divIcon({
      className: "",
      html: `<div class="crew-pin" style="--hue:${f.hue}"><span>${f.name[0].toUpperCase()}</span><i>${f.name}</i></div>`,
      iconSize: [40, 52], iconAnchor: [20, 26],
    });
    crewLayer.addLayer(L.marker([f.lat, f.lng], { icon, zIndexOffset: -100 }));
  });
}
renderCrew();

// ===== Recenter on DFW =====
const recenterBtn = document.getElementById("recenterBtn");
if (recenterBtn) recenterBtn.onclick = () => {
  recenterBtn.classList.remove("spin"); void recenterBtn.offsetWidth; recenterBtn.classList.add("spin");
  try { map.flyTo([32.79, -96.82], 12, { duration: 0.9, easeLinearity: 0.25 }); } catch (e) { map.setView([32.79, -96.82], 12); }
  closeSheet();
};

// gentle wander so the map feels alive
setInterval(() => {
  CREW.forEach(f => { f.lat += (Math.random() - 0.5) * 0.002; f.lng += (Math.random() - 0.5) * 0.002; });
  renderCrew();
}, 6000);

// ===== ZIP leaderboard (Explore) =====
function renderZipBoard() {
  const byZip = {};
  state.spots.forEach(s => (byZip[s.zip] = byZip[s.zip] || []).push(s));
  const rows = Object.entries(byZip)
    .map(([zip, spots]) => ({ zip, spots, heat: spots.length + spots.reduce((a, s) => a + hereCount(s), 0) }))
    .sort((a, b) => b.heat - a.heat).slice(0, 6);
  document.getElementById("zipBoard").innerHTML = rows.map((r, i) => {
    const top = r.spots.slice().sort((a, b) => avgStars(b) - avgStars(a))[0];
    const bg = top.photos && top.photos.length ? `style="background-image:url('${top.photos[0]}')"` : `style="background:${CAT_META[top.cat].grad}"`;
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
    const media = spot && spot.photos && spot.photos.length
      ? `style="background-image:url('${spot.photos[0]}')"`
      : spot ? `style="background:${CAT_META[spot.cat].grad}"` : `style="background:var(--bg-3)"`;
    const liked = state.likes["f" + i];
    const likeCount = (f.likes || 0) + (liked ? 1 : 0);
    return `<div class="feed-card">
      <div class="fc-head"><span class="fc-avatar">${f.user[0].toUpperCase()}</span><b>@${f.user}</b><span class="fc-time">${f.time}</span></div>
      ${spot ? `<div class="fc-media" data-id="${spot.id}" data-i="${i}" ${media}>${spot.photos && spot.photos.length ? "" : CAT_META[spot.cat].emoji}<div class="fc-heart-burst"><span>❤️</span></div></div>` : ""}
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
  if (s.photos && s.photos.length) {
    hero.style.background = `url('${s.photos[0]}') center/cover`;
    hero.classList.remove("emoji-hero");
  } else {
    hero.style.background = CAT_META[s.cat].grad;
    hero.classList.add("emoji-hero");
  }
  document.getElementById("heroEmoji").textContent = (s.photos && s.photos.length) ? "" : CAT_META[s.cat].emoji;
  document.getElementById("sheetName").textContent = s.name;
  const rating = avgStars(s);
  document.getElementById("sheetHeroPills").innerHTML =
    `${rating ? `<span class="hero-pill star">★ ${rating.toFixed(1)}</span>` : `<span class="hero-pill">★ new</span>`}` +
    `<span class="hero-pill">${CAT_META[s.cat].emoji} ${CAT_META[s.cat].label}</span>` +
    (hereCount(s) ? `<span class="hero-pill live">🟢 ${hereCount(s)} here now</span>` : "");
  document.getElementById("sheetMeta").innerHTML = `ZIP ${s.zip} · ${s.reviews.length} review${s.reviews.length === 1 ? "" : "s"}`;
  document.getElementById("dirBtn").href = `https://www.google.com/maps/dir/?api=1&destination=${s.lat},${s.lng}`;
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

  const pg = document.getElementById("photoGrid");
  if (s.photos && s.photos.length) {
    pg.innerHTML = s.photos.map(p => `<div class="photo-cell" style="background-image:url('${p}')"></div>`).join("");
  } else {
    pg.innerHTML = [0,1,2].map(() => `<div class="photo-cell" style="background:${CAT_META[s.cat].grad}">📷</div>`).join("");
  }
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

function renderReviews(s) {
  document.getElementById("reviews").innerHTML = s.reviews.map(r => `
    <div class="review">
      <div class="review-head"><b>@${r.user}</b><span class="stars">${starStr(r.stars)}</span></div>
      ${r.text}
    </div>`).join("") || `<div class="empty-state"><span class="em-moth">${SVG.fox}</span><b>No reviews yet</b><small>Nobody has prowled this one yet. Drop the first review.</small></div>`;
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

// ===== Share card =====
document.getElementById("shareBtn").onclick = () => {
  const s = state.spots.find(x => x.id === state.openSpotId);
  if (!s) return;
  const ph = document.getElementById("scPhoto");
  if (s.photos && s.photos.length) { ph.style.background = `url('${s.photos[0]}') center/cover`; ph.textContent = ""; }
  else { ph.style.background = CAT_META[s.cat].grad; ph.textContent = CAT_META[s.cat].emoji; }
  document.getElementById("scName").textContent = s.name;
  document.getElementById("scMeta").textContent = `★ ${avgStars(s).toFixed(1)} · ZIP ${s.zip} · ${SKETCH_WORDS[s.danger]} · prowl.app/s/${s.id}`;
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
  navigator.clipboard && navigator.clipboard.writeText(`prowl.app/s/${s.id}`).catch(() => {});
  closeShare();
  toast("Link copied 🔗");
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
function guideAddRec(s) {
  const el = document.createElement("div");
  el.className = "g-rec";
  const bg = s.photos && s.photos.length ? `style="background-image:url('${s.photos[0]}')"` : `style="background:${CAT_META[s.cat].grad}"`;
  el.innerHTML = `<div class="g-rec-thumb" ${bg}>${s.photos && s.photos.length ? "" : CAT_META[s.cat].emoji}</div>
    <div class="g-rec-info"><b>${s.name}</b><small>${CAT_META[s.cat].label} · ${s.zip}</small><span class="g-stars">${starStr(avgStars(s))} ${avgStars(s).toFixed(1)}</span></div>`;
  el.onclick = () => { if (spotMode(s.cat) !== state.mode) setMode(spotMode(s.cat)); closeGuide(); showView("map"); openSheet(s.id); };
  document.getElementById("guideMsgs").appendChild(el);
  scrollGuide();
}
function scrollGuide() { const m = document.getElementById("guideMsgs"); m.scrollTop = m.scrollHeight; }
function guideAsk(q) {
  guideAddMsg("user", q);
  const { cat, spots } = guideRecommend(q);
  setTimeout(() => {
    if (!spots.length) { guideAddMsg("bot", "I couldn't find a match for that yet. Try tacos, coffee, rooftop drinks, or somewhere abandoned to shoot photos."); return; }
    guideAddMsg("bot", GUIDE_LEAD[cat] + ":");
    spots.forEach(guideAddRec);
  }, 260);
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
const GUIDE_QUICK = ["🌮 Tacos", "☕ Coffee to work", "🍸 Rooftop drinks", "😌 Somewhere chill", "🌲 Get outside", "🏚 Abandoned + photos"];
document.getElementById("guideQuick").innerHTML = GUIDE_QUICK.map(q => `<button class="g-quick">${q}</button>`).join("");
document.querySelectorAll("#guideQuick .g-quick").forEach(b => b.onclick = () => guideAsk(b.textContent.replace(/^[^\w]+/, "").trim()));

// Initialize mode UI (chips + toggle) before the backend load kicks in
document.body.dataset.mode = state.mode;
document.querySelectorAll(".mode-btn").forEach(b => b.classList.toggle("active", b.dataset.mode === state.mode));
applyModeVibe();
renderChips();

// Boot: initMoth() (in pb.js, loaded after this) loads spots from the
// PocketBase backend, or falls back to offline demo mode, then renders.
