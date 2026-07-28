// ===== Moth ⇄ PocketBase backend layer =====
// Real backend: spots persist on the server instead of just this browser.
// If the server isn't running, the app falls back to offline demo mode.

const MOTH_PB = "http://127.0.0.1:8090";
const PB_SPOTS = MOTH_PB + "/api/collections/spots/records";
const PB_PRESENCE = MOTH_PB + "/api/collections/presence/records"; // Live 360

function recToSpot(r) {
  return {
    id: r.sid, _pb: r.id,
    name: r.name, cat: r.cat, lat: r.lat, lng: r.lng, zip: r.zip,
    desc: r.desc, tags: r.tags || [], danger: r.danger,
    photos: r.photos || [], reviews: r.reviews || [],
    sponsored: !!r.sponsored, sponsorName: r.sponsorName || "",
    sponsorBlurb: r.sponsorBlurb || "", sponsorCta: r.sponsorCta || "",
  };
}
function spotToBody(s) {
  return {
    sid: s.id, name: s.name, cat: s.cat, lat: s.lat, lng: s.lng, zip: s.zip,
    desc: s.desc, tags: s.tags, danger: s.danger, photos: s.photos, reviews: s.reviews,
    sponsored: !!s.sponsored, sponsorName: s.sponsorName || "",
    sponsorBlurb: s.sponsorBlurb || "", sponsorCta: s.sponsorCta || "",
  };
}

async function pbList() {
  const r = await fetch(PB_SPOTS + "?perPage=200&sort=sid");
  if (!r.ok) throw new Error("pb list " + r.status);
  const j = await r.json();
  return j.items.map(recToSpot);
}
async function pbCreate(s) {
  try {
    const r = await fetch(PB_SPOTS, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(spotToBody(s)),
    });
    if (r.ok) { const rec = await r.json(); s._pb = rec.id; }
  } catch (e) { /* offline: keep local copy */ }
}
async function pbUpdate(pbId, patch) {
  try {
    await fetch(PB_SPOTS + "/" + pbId, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
  } catch (e) { /* offline */ }
}
window.pbCreate = pbCreate;
window.pbUpdate = pbUpdate;

// ===== Auth (sign up / log in) =====
const PB_USERS = MOTH_PB + "/api/collections/users";
const auth = { token: null, user: null };

function loadAuth() {
  try {
    const a = JSON.parse(localStorage.getItem("moth.auth"));
    if (a && a.token) { auth.token = a.token; auth.user = a.user; }
  } catch (e) {}
}
function saveAuth() { localStorage.setItem("moth.auth", JSON.stringify(auth)); }
function clearAuth() { auth.token = null; auth.user = null; localStorage.removeItem("moth.auth"); }
function currentUser() { return auth.user; }
function myName() {
  const u = auth.user;
  return u ? (u.name || u.email.split("@")[0]) : "you";
}
function isMine(review) { return review.user === myName() || review.user === "you"; }
window.myName = myName;
window.isMine = isMine;
function authHeaders() { return auth.token ? { "Authorization": auth.token } : {}; }
window.currentUser = currentUser;
window.authHeaders = authHeaders;

async function pbSignup(name, email, password) {
  const r = await fetch(PB_USERS + "/records", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: name || email.split("@")[0], email, password, passwordConfirm: password }),
  });
  const j = await r.json();
  if (!r.ok) throw new Error(friendlyAuthError(j));
  return pbLogin(email, password); // auto-login after signup
}
async function pbLogin(email, password) {
  const r = await fetch(PB_USERS + "/auth-with-password", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identity: email, password }),
  });
  const j = await r.json();
  if (!r.ok) throw new Error(friendlyAuthError(j));
  auth.token = j.token; auth.user = j.record; saveAuth();
  renderAuthUI();
  return j.record;
}
function pbLogout() { clearAuth(); renderAuthUI(); }
window.pbLogout = pbLogout;

function friendlyAuthError(j) {
  if (j && j.data) {
    if (j.data.email) return "Email: " + j.data.email.message;
    if (j.data.password) return "Password: " + j.data.password.message;
  }
  return (j && j.message) || "Something went wrong.";
}

// ---- Auth UI ----
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
  const initial = (u ? (u.name || u.email)[0] : "?").toUpperCase();
  const topAv = document.getElementById("profileBtn");
  if (topAv) topAv.textContent = initial;
  const pAv = document.getElementById("profileAvatar");
  if (pAv) pAv.textContent = initial;
  const pName = document.getElementById("profileName");
  if (pName) pName.textContent = u ? (u.name || u.email.split("@")[0]) : "Guest";
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
  loadAuth();
  wireAuth();
  renderAuthUI();
  try {
    let spots = await pbList();
    if (spots.length === 0) {
      // First run: seed the backend from the demo data
      for (const seed of SEED_SPOTS) {
        const s = JSON.parse(JSON.stringify(seed));
        await pbCreate(s);
      }
      spots = await pbList();
    } else {
      // Top-up: add any newly-added seed spots not yet in the backend
      const have = new Set(spots.map(s => s.id));
      const missing = SEED_SPOTS.filter(s => !have.has(s.id));
      if (missing.length) {
        for (const seed of missing) await pbCreate(JSON.parse(JSON.stringify(seed)));
        spots = await pbList();
      }
    }
    state.spots = spots.length ? spots : JSON.parse(JSON.stringify(SEED_SPOTS));
    state.online = true;
    setBackendBadge(true);
  } catch (e) {
    // Server not running -> offline demo mode (localStorage + seed)
    state.spots = loadSpots();
    state.online = false;
    setBackendBadge(false);
  }
  renderFeed();
  renderStories();
  renderAll();
  if (window.handleDeepLink) handleDeepLink();  // shared pins: ?s=<id> or ?pin=lat,lng
}

function setBackendBadge(online) {
  const el = document.getElementById("spotCount");
  if (!el) return;
  const badge = el.closest(".badge-live");
  if (badge) badge.title = online ? "Connected to PocketBase backend" : "Offline demo mode";
}

initMoth();
