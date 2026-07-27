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
// Give each real spot category-matched photos from the existing licensed set.
const CAT_PHOTOS = {
  food: [17, 18, 19], coffee: [15, 16], bar: [13, 14],
  hangout: [3, 8, 12, 20], nature: [6, 10, 21], abandoned: [1, 2, 7, 11],
  rooftop: [4], tunnel: [5, 9],
};
const _catIdx = {};
function photosForCat(cat) {
  const pool = CAT_PHOTOS[cat] || CAT_PHOTOS.hangout;
  const i = (_catIdx[cat] = (_catIdx[cat] || 0) + 1) - 1;
  return spotPhotos(pool[i % pool.length]);
}
const SEED_SPOTS = [
  ...(typeof REAL_SPOTS !== "undefined" ? REAL_SPOTS : []),   // Dallas core (101+)
  ...(typeof PLANO_SPOTS !== "undefined" ? PLANO_SPOTS : []), // Plano 75025 area (201+)
].map(s => ({ ...s, photos: photosForCat(s.cat) }));

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
