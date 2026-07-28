// ===== Haunt seed data =====
// All spots are fictional demo data set around DFW.

const CAT_META = {
  // Abandoned / urbex world
  abandoned: { emoji: "🏚", label: "Abandoned", grad: "linear-gradient(135deg,#2c3e50,#4ca1af)" },
  tunnel:    { emoji: "🕳", label: "Tunnel",    grad: "linear-gradient(135deg,#232526,#414345)" },
  rooftop:   { emoji: "🌆", label: "Rooftop",   grad: "linear-gradient(135deg,#141e30,#243b55)" },
  // Cool-stuff world
  bar:       { emoji: "🍸", label: "Bar",       grad: "linear-gradient(135deg,#5f2c82,#49a09d)" },
  coffee:    { emoji: "☕", label: "Coffee",    grad: "linear-gradient(135deg,#6f4e37,#b98b56)" },
  food:      { emoji: "🍔", label: "Food",      grad: "linear-gradient(135deg,#e65c00,#f9a825)" },
  hangout:   { emoji: "🛋", label: "Hangout",   grad: "linear-gradient(135deg,#134e5e,#71b280)" },
  nature:    { emoji: "🌲", label: "Nature",    grad: "linear-gradient(135deg,#1d976c,#2f3640)" },
};

// Two worlds: which categories belong to each mode
const MODES = {
  cool:  { label: "Cool Stuff", emoji: "🍸", cats: ["bar", "coffee", "food", "hangout", "nature"] },
  urbex: { label: "Abandoned",  emoji: "🏚", cats: ["abandoned", "tunnel", "rooftop"] },
};
function spotMode(cat) {
  return MODES.urbex.cats.includes(cat) ? "urbex" : "cool";
}

// Photos: real licensed stock (Pexels) — credits in img/credits.json
function spotPhotos(id) { return [1, 2, 3].map(j => `img/spot-${id}-${j}.jpg`); }

// ===== Real Dallas spots (from real-spots.js: const REAL_SPOTS) =====
// Deterministic UNIQUE hero assignment: every spot without its own real photos
// gets a stock photo set whose hero (first image) is used by no other spot.
// Candidate heroes are individual images "N-M" (img/spot-N-M.jpg), ordered by
// how well they fit the category; overflow borrows from visually-adjacent pools.
const CAT_HERO_POOL = {
  food:      ["17-1","17-2","17-3","18-1","18-2","18-3","19-1","19-2","19-3","23-1","23-2","23-3","20-1","20-2"],
  coffee:    ["15-1","15-2","15-3","16-1","16-2","16-3","24-1","24-2","24-3","27-1","27-2","27-3"],
  bar:       ["13-1","13-2","13-3","14-1","14-2","14-3","22-1","22-2","22-3","25-1","25-2","26-1","26-2"],
  hangout:   ["20-3","8-1","8-2","8-3","12-1","12-2","12-3","26-3","25-3","3-3"],
  nature:    ["6-1","6-2","6-3","10-1","10-2","10-3","21-1","21-2","21-3"],
  abandoned: ["1-1","1-2","1-3","2-1","2-2","2-3","7-1","7-2","7-3","11-1","11-2","11-3","5-1","9-1"],
  rooftop:   ["4-1","4-2","4-3","3-1","3-2","3-3","14-1","14-2"],
  tunnel:    ["5-1","5-2","5-3","9-1","9-2","9-3","12-1","12-2"],
};
const ALL_STOCK = [];
for (let n = 1; n <= 27; n++) for (let m = 1; m <= 3; m++) ALL_STOCK.push(n + "-" + m);
const _usedHeroes = new Set();
function uniquePhotosForCat(cat) {
  const pool = (CAT_HERO_POOL[cat] || CAT_HERO_POOL.hangout).concat(ALL_STOCK);
  const hero = pool.find(h => !_usedHeroes.has(h)) || pool[0];
  _usedHeroes.add(hero);
  const [n, m] = hero.split("-").map(Number);
  // Hero first, then the other two shots from the same set
  const rest = [1, 2, 3].filter(j => j !== m);
  return [`img/spot-${n}-${m}.jpg`, ...rest.map(j => `img/spot-${n}-${j}.jpg`)];
}
const SEED_SPOTS = [
  ...(typeof REAL_SPOTS !== "undefined" ? REAL_SPOTS : []),            // Dallas core (101+)
  ...(typeof PLANO_SPOTS !== "undefined" ? PLANO_SPOTS : []),          // Plano 75025 area (201+)
  ...(typeof HANGOUT_NATURE_SPOTS !== "undefined" ? HANGOUT_NATURE_SPOTS : []), // hangouts + nature (301+)
  ...(typeof DALLAS_DEPTH_SPOTS !== "undefined" ? DALLAS_DEPTH_SPOTS : []),      // Dallas neighborhoods depth (401+)
].map(s => {
  if (s.photos && s.photos.length) {           // real photos win (Wikimedia Commons, see img/real/credits.md)
    s.photos.forEach(p => _usedHeroes.add(p)); // keep real heroes out of nothing, but mark for clarity
    return { ...s };
  }
  return { ...s, photos: uniquePhotosForCat(s.cat) };
});

// Extras lookup so real photos + review links survive backend records that
// do not carry these fields (pb schema has no photos/reviewUrl columns).
window.SPOT_EXTRAS = {};
SEED_SPOTS.forEach(s => {
  window.SPOT_EXTRAS[s.id] = { photos: s.photos, reviewUrl: s.reviewUrl, rating: s.rating };
});

// Feature one spot for the sponsored / revenue demo
(function () {
  const f = SEED_SPOTS.find(s => s.cat === "coffee");
  if (f) { f.sponsored = true; f.sponsorName = "Neon Owl Roasters";
    f.sponsorBlurb = "Free single-origin pour-over for Prowl explorers who show this spot at the counter.";
    f.sponsorCta = "Show & save"; }
})();

// Feed references real spots by name so ids always line up
const SEED_FEED = (function () {
  const by = n => SEED_SPOTS.find(s => s.name.toLowerCase().includes(n.toLowerCase())) || SEED_SPOTS[0];
  const out = [];
  const add = (n, user, likes, comments, text, time) => {
    const s = by(n); if (!s) return;
    out.push({ user, spotId: s.id, likes, comments, time, text: text.replace("{name}", s.name) });
  };
  add("Pecan",       "smokestackjenny", 61, 12, "the beef rib at <b>{name}</b> is unreal 🔥 got there right at open", "18m ago");
  add("Midnight",    "nightowl.dfw",    44, 7,  "found the door at <b>{name}</b> 🍸 speakeasy vibes all the way", "40m ago");
  add("Houndstooth", "kaylaroams",      33, 5,  "posted up at <b>{name}</b> all afternoon ☕ best patio to work from", "1h ago");
  add("Klyde",       "mena.j",          52, 9,  "whole city is out at <b>{name}</b> 🌳 golden hour hits different", "2h ago");
  add("Fabrication", "lens.leo",        71, 14, "shot a full roll at <b>{name}</b> 🎨 legal graffiti heaven", "3h ago");
  add("Truck Yard",  "grindcity",       28, 4,  "live music + tacos at <b>{name}</b> tonight, pull up", "4h ago");
  return out;
})();
