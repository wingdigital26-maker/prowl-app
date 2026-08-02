// ===== Prowl ⇄ Supabase backend layer =====
// Drop-in replacement for pb.js. Exposes the same globals app.js expects.
// Real backend: spots + accounts + Live 360 persist in Supabase (hosted, free
// tier). If Supabase isn't configured yet, the app falls back to offline demo.
//
// ── CONFIGURE ME ────────────────────────────────────────────────────────────
// Paste these two values from your Supabase project:
//   Dashboard > Project Settings > API
//   - "Project URL"      -> SB_URL
//   - "anon / public" key -> SB_ANON   (this key is SAFE in client code)
// NEVER paste the "service_role" key here. That one is a secret (server only).
const SB_URL  = "https://klzmpjregrcxumaxfsug.supabase.co";
const SB_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtsem1wanJlZ3JjeHVtYXhmc3VnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU2MTcyMzIsImV4cCI6MjEwMTE5MzIzMn0.N8niZq5a2rPGQl4JHsYIwoDE_UxI21-P31ihkZbhRTA";
// ─────────────────────────────────────────────────────────────────────────────

const SB_CONFIGURED =
  !SB_URL.includes("REPLACE_ME") && !SB_ANON.includes("REPLACE_ME");

let sb = null;
if (SB_CONFIGURED && window.supabase) {
  sb = window.supabase.createClient(SB_URL, SB_ANON, {
    auth: { persistSession: true, autoRefreshToken: true },
  });
}
window.sb = sb;

// Free AI guide proxy (Groq behind a Supabase Edge Function). The guide calls
// this to "answer anything"; it falls back to the local brain if unreachable.
window.PROWL_AI_URL = SB_CONFIGURED ? SB_URL + "/functions/v1/ask" : null;
window.PROWL_AI_KEY = SB_CONFIGURED ? SB_ANON : null;
window.PROWL_PUSH_URL = SB_CONFIGURED ? SB_URL + "/functions/v1/push" : null;

// ---- row <-> spot mapping (DB columns <-> app fields) ----
function recToSpot(r) {
  return {
    id: r.sid, _pb: r.id,
    name: r.name, cat: r.cat, lat: r.lat, lng: r.lng, zip: r.zip,
    desc: r.descr, tags: r.tags || [], danger: r.danger,
    photos: r.photos || [], reviews: r.reviews || [],
    sponsored: !!r.sponsored, sponsorName: r.sponsor_name || "",
    sponsorBlurb: r.sponsor_blurb || "", sponsorCta: r.sponsor_cta || "",
  };
}
function spotToRow(s) {
  return {
    sid: s.id, name: s.name, cat: s.cat, lat: s.lat, lng: s.lng, zip: s.zip,
    descr: s.desc, tags: s.tags, danger: s.danger, photos: s.photos, reviews: s.reviews,
    sponsored: !!s.sponsored, sponsor_name: s.sponsorName || "",
    sponsor_blurb: s.sponsorBlurb || "", sponsor_cta: s.sponsorCta || "",
  };
}
// map a PocketBase-style patch ({desc, reviews, sponsorName, ...}) to DB columns
function patchToRow(patch) {
  const M = { desc: "descr", sponsorName: "sponsor_name",
    sponsorBlurb: "sponsor_blurb", sponsorCta: "sponsor_cta" };
  const out = {};
  for (const k in patch) out[M[k] || k] = patch[k];
  return out;
}

async function pbList() {
  const { data, error } = await sb.from("spots").select("*").order("sid").limit(1000);
  if (error) throw new Error("supa list: " + error.message);
  return (data || []).map(recToSpot);
}
async function pbCreate(s) {
  if (!sb) return;
  try {
    const row = spotToRow(s);
    if (auth.user) row.created_by = auth.user.id;
    const { data, error } = await sb.from("spots").insert(row).select("id").single();
    if (!error && data) s._pb = data.id;
  } catch (e) { /* offline: keep local copy */ }
}
async function pbUpdate(pbId, patch) {
  if (!sb) return;
  try {
    await sb.from("spots").update(patchToRow(patch)).eq("id", pbId);
  } catch (e) { /* offline */ }
}
window.pbCreate = pbCreate;
window.pbUpdate = pbUpdate;

// ===== Auth (sign up / log in) via Supabase Auth =====
const auth = { token: null, user: null };

function normUser(u) {
  if (!u) return null;
  const meta = u.user_metadata || {};
  return { id: u.id, email: u.email, name: meta.name || (u.email || "").split("@")[0] };
}
function currentUser() { return auth.user; }
function myName() {
  const u = auth.user;
  return u ? (u.name || u.email.split("@")[0]) : "you";
}
function isMine(review) { return review.user === myName() || review.user === "you"; }
function authHeaders() { return auth.token ? { Authorization: "Bearer " + auth.token } : {}; }
window.myName = myName;
window.isMine = isMine;
window.currentUser = currentUser;
window.authHeaders = authHeaders;

async function pbSignup(name, email, password) {
  const { data, error } = await sb.auth.signUp({
    email, password, options: { data: { name: name || email.split("@")[0] } },
  });
  if (error) throw new Error(error.message);
  // If email confirmation is OFF, session is returned now. If ON, sign in.
  if (data.session) { setSession(data.session); renderAuthUI(); return auth.user; }
  return pbLogin(email, password);
}
async function pbLogin(email, password) {
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error) throw new Error(error.message);
  setSession(data.session);
  renderAuthUI();
  return auth.user;
}
function setSession(session) {
  auth.token = session ? session.access_token : null;
  auth.user = session ? normUser(session.user) : null;
}
async function pbLogout() {
  try { if (sb) await sb.auth.signOut(); } catch (e) {}
  auth.token = null; auth.user = null;
  renderAuthUI();
}
window.pbLogout = pbLogout;

// ---- Auth UI (same DOM contract as pb.js) ----
let authMode = "signup";
function openAuth(mode) {
  authMode = mode || "signup";
  const signup = authMode === "signup";
  document.getElementById("authTitle").textContent = signup ? "Sign up" : "Log in";
  document.getElementById("authHint").textContent = signup
    ? "Make an account to drop spots and post reviews as you."
    : "Welcome back, explorer.";
  document.getElementById("authSubmit").textContent = signup ? "Sign up" : "Log in";
  document.getElementById("authName").style.display = signup ? "block" : "none";
  document.getElementById("authToggleText").textContent = signup ? "Already have an account?" : "Need an account?";
  document.getElementById("authToggle").textContent = signup ? "Log in" : "Sign up";
  document.getElementById("authError").textContent = "";
  document.getElementById("authModal").classList.add("open");
  document.getElementById("authBackdrop").classList.add("open");
}
function closeAuth() {
  document.getElementById("authModal").classList.remove("open");
  document.getElementById("authBackdrop").classList.remove("open");
}
function renderAuthUI() {
  const u = currentUser();
  const av = (window.appState && window.appState.avatar && window.appState.avatar.emoji) || null;
  const initial = av || (u ? (u.name || u.email)[0] : "?").toUpperCase();
  const topAv = document.getElementById("profileBtn");
  if (topAv) topAv.textContent = initial;
  const pAv = document.getElementById("profileAvatar");
  if (pAv) pAv.textContent = initial;
  const pName = document.getElementById("profileName");
  if (pName) pName.textContent = u ? (u.name || u.email.split("@")[0]) : "Guest";
  // Profile level from REAL activity (saved spots), not an invented number.
  const pLevel = document.getElementById("profileLevel");
  if (pLevel) {
    const saved = (typeof savedIds === "function") ? savedIds().length : 0;
    pLevel.textContent = saved > 0
      ? `Explorer · ${saved} spot${saved === 1 ? "" : "s"} saved`
      : "Explorer";
  }
  const cta = document.getElementById("authCta");
  if (cta) {
    cta.innerHTML = u
      ? `<p class="account-line">${u.email}</p><button class="pill-btn" id="logoutBtn">Log out</button>`
      : `<button class="pill-btn primary" id="loginCta">Sign up / Log in</button>`;
    const lc = document.getElementById("loginCta");
    if (lc) lc.onclick = () => openAuth("signup");
    const lo = document.getElementById("logoutBtn");
    if (lo) lo.onclick = () => { pbLogout(); toast && toast("Logged out"); };
  }
}

function wireAuth() {
  document.getElementById("authBackdrop").onclick = closeAuth;
  document.getElementById("authToggle").onclick = () => openAuth(authMode === "signup" ? "login" : "signup");
  document.getElementById("authForm").onsubmit = async (e) => {
    e.preventDefault();
    const name = document.getElementById("authName").value.trim();
    const email = document.getElementById("authEmail").value.trim();
    const pass = document.getElementById("authPass").value;
    const errEl = document.getElementById("authError");
    const btn = document.getElementById("authSubmit");
    errEl.textContent = ""; btn.disabled = true; btn.textContent = "…";
    try {
      if (!sb) throw new Error("Backend not configured yet.");
      if (authMode === "signup") await pbSignup(name, email, pass);
      else await pbLogin(email, pass);
      closeAuth();
      toast && toast("Welcome, " + (currentUser().name || "explorer") + " 🦋");
      renderAll();
    } catch (err) {
      errEl.textContent = err.message;
    } finally {
      btn.disabled = false; btn.textContent = authMode === "signup" ? "Sign up" : "Log in";
    }
  };
}

// ===== Boot =====
async function initMoth() {
  // restore any existing session first
  if (sb) {
    try {
      const { data } = await sb.auth.getSession();
      if (data && data.session) setSession(data.session);
      sb.auth.onAuthStateChange((_evt, session) => { setSession(session); renderAuthUI(); });
    } catch (e) {}
  }
  wireAuth();
  renderAuthUI();

  if (!sb) {
    // Not configured -> offline demo mode (localStorage + seed)
    state.spots = loadSpots();
    reconcilePhotos();
    state.online = false;
    setBackendBadge(false);
    console.info("[Prowl] Supabase not configured — running offline demo. See SUPABASE-SETUP.md");
  } else {
    try {
      let spots = await pbList();
      // NOTE: the 139 curated spots are pre-seeded server-side by the seeder
      // (see supabase/seed-supabase.mjs). We do NOT seed from the browser: with
      // strict RLS the anon client can't write, and pre-seeding avoids dupes.
      state.spots = spots.length ? spots : JSON.parse(JSON.stringify(SEED_SPOTS));
      reconcilePhotos();
      state.online = spots.length > 0;
      setBackendBadge(state.online);
      if (!spots.length) console.warn("[Prowl] Connected, but spots table is empty. Run the seeder.");
    } catch (e) {
      state.spots = loadSpots();
      reconcilePhotos();
      state.online = false;
      setBackendBadge(false);
      console.warn("[Prowl] Supabase reachable check failed, offline demo:", e.message);
    }
  }
  renderFeed();
  renderStories();
  renderAll();
  if (window.handleDeepLink) handleDeepLink();
}

// Seed data files are the source of truth for a seeded spot's definition;
// overlay authoritative fields + photos/embeds by id (same as pb.js).
function reconcilePhotos() {
  const ex = window.SPOT_EXTRAS || {};
  const seedById = {};
  (typeof SEED_SPOTS !== "undefined" ? SEED_SPOTS : []).forEach(s => { seedById[s.id] = s; });
  const CURATED_MAX_ID = 100000;
  if (Object.keys(seedById).length) {
    state.spots = state.spots.filter(s => s.id >= CURATED_MAX_ID || seedById[s.id]);
  }
  const DEFINITIONAL = ["cat", "name", "desc", "lat", "lng", "zip", "tags", "danger", "rating"];
  for (const s of state.spots) {
    const seed = seedById[s.id];
    if (seed) DEFINITIONAL.forEach(k => { if (seed[k] !== undefined) s[k] = seed[k]; });
    const e = ex[s.id];
    if (e) {
      if (e.photos && e.photos.length) s.photos = e.photos;
      if (e.photoCredit) s.photoCredit = e.photoCredit;
      if (e.embeds && e.embeds.length) s.embeds = e.embeds;
    }
    const vt = window.VIDEO_THUMBS && window.VIDEO_THUMBS[s.id];
    if (vt && vt.video) {
      s.embeds = s.embeds || [];
      if (!s.embeds.some(em => em.url === vt.video)) {
        s.embeds.push({ type: vt.type || "tiktok", url: vt.video });
      }
    }
  }
}

function setBackendBadge(online) {
  const el = document.getElementById("spotCount");
  if (!el) return;
  const badge = el.closest(".badge-live");
  if (badge) badge.title = online ? "Connected to Supabase" : "Offline demo mode";
}

initMoth();
