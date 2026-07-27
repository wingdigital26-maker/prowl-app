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

const SEED_SPOTS = [
  { id: 1, photos: spotPhotos(1), name: "The Old Mill Works", cat: "abandoned", lat: 32.741, lng: -96.83, zip: "75208",
    desc: "Massive brick mill left since the 90s. Graffiti gallery on the second floor, light comes through the busted skylights around golden hour. Bring a flashlight for the basement.",
    tags: ["graffiti", "photo spot", "daytime"], danger: 3,
    reviews: [
      { user: "urbex_tx", stars: 5, text: "Best light in Dallas at 6pm. Second floor is stable, skip the east stairwell." },
      { user: "kaylaroams", stars: 4, text: "So cool but bring boots, glass everywhere." },
    ] },
  { id: 2, photos: spotPhotos(2), name: "Riverside Water Tower", cat: "abandoned", lat: 32.79, lng: -96.87, zip: "75212",
    desc: "Rusted-out water tower with a ladder that still holds. View of the whole Trinity floodplain from the catwalk. Locals say sunrise here hits different.",
    tags: ["climb", "sunrise", "view"], danger: 4,
    reviews: [ { user: "driftkid", stars: 5, text: "Scariest ladder of my life, worth every rung." } ] },
  { id: 3, photos: spotPhotos(3), name: "Deck Park Overlook", cat: "hangout", lat: 32.789, lng: -96.802, zip: "75201",
    desc: "Chill grass ledge over the freeway deck park. Free wifi bleeds over from the cafe, skyline view at night, always somebody with a speaker.",
    tags: ["chill", "night", "skyline"], danger: 1,
    sponsored: true, sponsorName: "Lumen Coffee Bar",
    sponsorBlurb: "Free cold brew for Moth explorers who show this spot. 2 blocks north, open til 2am.",
    sponsorCta: "Show & save",
    reviews: [ { user: "mena.j", stars: 4, text: "Great after 10pm, gets crowded on Fridays." } ] },
  { id: 4, photos: spotPhotos(4), name: "The Blue Garage Roof", cat: "rooftop", lat: 32.782, lng: -96.797, zip: "75202",
    desc: "Top floor of an unlocked parking garage downtown. Nobody checks after 9. Full 360 skyline, great for car meets and time lapses.",
    tags: ["skyline", "night", "cars"], danger: 2,
    reviews: [
      { user: "lens.leo", stars: 5, text: "Shot my whole portfolio up here." },
      { user: "trinityrat", stars: 3, text: "Security kicked us out once, mostly fine tho." },
    ] },
  { id: 5, photos: spotPhotos(5), name: "Echo Tunnel", cat: "tunnel", lat: 32.756, lng: -96.755, zip: "75223",
    desc: "Storm drain tunnel with insane acoustics. People bring guitars. Floods when it rains, DO NOT enter if there's weather.",
    tags: ["acoustics", "flood risk", "graffiti"], danger: 4,
    reviews: [ { user: "sadboy_sam", stars: 5, text: "Recorded a whole EP in here, echo is unreal." } ] },
  { id: 6, photos: spotPhotos(6), name: "Cedar Creek Rope Swing", cat: "nature", lat: 32.703, lng: -96.865, zip: "75233",
    desc: "Hidden creek bend with a rope swing and a little rock beach. Ten minute walk from the trailhead, follow the spray-painted arrows.",
    tags: ["swim", "summer", "daytime"], danger: 2,
    reviews: [ { user: "kaylaroams", stars: 5, text: "Perfect summer spot. Water's deeper than it looks." } ] },
  { id: 7, photos: spotPhotos(7), name: "Sunset Drive-In Ruins", cat: "abandoned", lat: 32.86, lng: -96.94, zip: "75061",
    desc: "Collapsed drive-in theater screen and an empty lot people still park at to watch actual sunsets. The old snack shack is full of 70s junk.",
    tags: ["sunset", "photo spot", "history"], danger: 2,
    reviews: [ { user: "vhs.vera", stars: 4, text: "The screen frame at dusk is straight out of a movie." } ] },
  { id: 8, photos: spotPhotos(8), name: "The Attic (Warehouse Loft)", cat: "hangout", lat: 32.776, lng: -96.826, zip: "75207",
    desc: "Semi-abandoned warehouse where a landlord gave up. Skaters built a mini ramp inside. Unspoken rule: leave it cleaner than you found it.",
    tags: ["skate", "indoor", "community"], danger: 3,
    reviews: [ { user: "grindcity", stars: 5, text: "Best DIY ramp in DFW, respect the spot." } ] },
  { id: 9, photos: spotPhotos(9), name: "Pillar Forest", cat: "tunnel", lat: 32.77, lng: -96.79, zip: "75201",
    desc: "The concrete pillar field under the interstate bridges. Painted pillars for a mile, skaters and photographers all day. Feels like a museum nobody built on purpose.",
    tags: ["graffiti", "skate", "photo spot"], danger: 1,
    reviews: [ { user: "lens.leo", stars: 4, text: "Every pillar is a different artist. Golden hour slaps." } ] },
  { id: 10, photos: spotPhotos(10), name: "Radio Hill Antenna Field", cat: "nature", lat: 32.95, lng: -96.77, zip: "75240",
    desc: "Grass hill under decommissioned radio towers. Zero light pollution pocket somehow. Best stargazing inside the loop, bring a blanket.",
    tags: ["stars", "night", "quiet"], danger: 1,
    reviews: [ { user: "mena.j", stars: 5, text: "Saw the milky way IN DALLAS. unreal." } ] },
  { id: 11, photos: spotPhotos(11), name: "Hotel Marlowe Shell", cat: "abandoned", lat: 32.802, lng: -96.77, zip: "75204",
    desc: "Gutted 8-story hotel, construction stalled for years. The ballroom still has its chandelier mounts. Roof access through the service stairs.",
    tags: ["climb", "photo spot", "roof"], danger: 5,
    reviews: [ { user: "urbex_tx", stars: 5, text: "Crown jewel of Dallas urbex. Floors 6+ are sketchy, watch for holes." } ] },
  { id: 12, photos: spotPhotos(12), name: "Greenline Bridge Underpass", cat: "hangout", lat: 32.813, lng: -96.87, zip: "75212",
    desc: "Shaded concrete beach under the rail bridge along the levee trail. Fire pit somebody built, hammock hooks in the beams.",
    tags: ["chill", "fire pit", "trail"], danger: 2,
    reviews: [ { user: "driftkid", stars: 4, text: "Solid hang, trains overhead are loud but kinda the point." } ] },

  // ===== Cool Stuff world (bars, coffee, food, patios) =====
  { id: 13, photos: spotPhotos(13), name: "The Copper Owl", cat: "bar", lat: 32.784, lng: -96.807, zip: "75201",
    desc: "Dim speakeasy-style cocktail bar down an alley off Main. No sign, just a copper owl on the door. Ask for the off-menu smoked old fashioned.",
    tags: ["cocktails", "date night", "hidden"], danger: 1,
    reviews: [ { user: "mena.j", stars: 5, text: "The vibe is unreal, get there before 9 or you're waiting." } ] },
  { id: 14, photos: spotPhotos(14), name: "Skyline Rooftop Bar", cat: "bar", lat: 32.786, lng: -96.799, zip: "75202",
    desc: "Open-air rooftop bar with the best skyline view downtown. DJ on weekends, firepits in winter. Golden hour here is a whole event.",
    tags: ["rooftop", "views", "weekends"], danger: 1,
    reviews: [ { user: "lens.leo", stars: 4, text: "Pricey drinks but that view pays for itself." } ] },
  { id: 15, photos: spotPhotos(15), name: "Foglight Coffee", cat: "coffee", lat: 32.803, lng: -96.788, zip: "75204",
    desc: "Tiny third-wave coffee bar with the best pour-over in the city. Big windows, plant wall, always someone sketching in the corner.",
    tags: ["study spot", "wifi", "pour-over"], danger: 1,
    reviews: [ { user: "kaylaroams", stars: 5, text: "My go-to work-from-cafe spot. Get the honey lavender latte." } ] },
  { id: 16, photos: spotPhotos(16), name: "Ember & Oak Cafe", cat: "coffee", lat: 32.748, lng: -96.828, zip: "75208",
    desc: "Cozy Bishop Arts cafe in a converted house. Wood everything, back patio, house-roasted beans. Weekend line is worth it.",
    tags: ["patio", "brunch", "cozy"], danger: 1,
    reviews: [ { user: "vhs.vera", stars: 5, text: "Feels like your cool friend's living room. Cinnamon latte slaps." } ] },
  { id: 17, photos: spotPhotos(17), name: "Taco Alley", cat: "food", lat: 32.781, lng: -96.795, zip: "75201",
    desc: "Late-night taco window with a line til 2am. Al pastor off the trompo, homemade salsas, cash only. The move after a night out.",
    tags: ["late night", "cheap eats", "cash only"], danger: 1,
    reviews: [ { user: "grindcity", stars: 5, text: "Best drunk food in Dallas, no notes." } ] },
  { id: 18, photos: spotPhotos(18), name: "The Greasy Spoon", cat: "food", lat: 32.79, lng: -96.77, zip: "75226",
    desc: "24-hour retro diner, chrome booths and bottomless coffee. Been here since the 60s. Chicken fried steak the size of your face.",
    tags: ["24 hour", "diner", "comfort food"], danger: 1,
    reviews: [ { user: "sadboy_sam", stars: 4, text: "3am pancakes hit different. The waitresses run the place." } ] },
  { id: 19, photos: spotPhotos(19), name: "Night Market Eats", cat: "food", lat: 32.813, lng: -96.873, zip: "75212",
    desc: "Weekend night market with 30+ food stalls, string lights, live music. Dumplings, birria, boba, the works. Come hungry.",
    tags: ["market", "live music", "weekends"], danger: 1,
    reviews: [ { user: "driftkid", stars: 5, text: "Every Friday. Bring friends, split everything." } ] },
  { id: 20, photos: spotPhotos(20), name: "Riverside Patio", cat: "hangout", lat: 32.776, lng: -96.83, zip: "75207",
    desc: "Chill outdoor patio bar right on the Trinity, string lights and picnic tables. Dog friendly, food trucks park here Thursdays.",
    tags: ["patio", "dog friendly", "food trucks"], danger: 1,
    reviews: [ { user: "mena.j", stars: 4, text: "Perfect low-key hang. Sunset over the river is chef's kiss." } ] },
  { id: 21, photos: spotPhotos(21), name: "Sunset Rooftop Garden", cat: "nature", lat: 32.788, lng: -96.804, zip: "75201",
    desc: "Public rooftop garden on top of the downtown library. Free, quiet, full skyline. Locals bring picnics and nobody knows it's up here.",
    tags: ["free", "picnic", "quiet"], danger: 1,
    reviews: [ { user: "kaylaroams", stars: 5, text: "Hidden gem. Bring a blanket and watch the sun go down." } ] },
];

const SEED_FEED = [
  { user: "urbex_tx", spotId: 11, likes: 42, comments: 9, text: "just dropped a new spot: <b>Hotel Marlowe Shell</b> 🏚 — roof access confirmed", time: "12m ago" },
  { user: "kaylaroams", spotId: 6, likes: 31, comments: 5, text: "reviewed <b>Cedar Creek Rope Swing</b> ★★★★★ — 'Water's deeper than it looks'", time: "44m ago" },
  { user: "lens.leo", spotId: 4, likes: 87, comments: 14, text: "posted 6 pics at <b>The Blue Garage Roof</b> 🌆", time: "1h ago",
    seedComments: [ { user: "kaylaroams", text: "these go SO hard 🔥" }, { user: "urbex_tx", text: "which level? asking for a friend" } ] },
  { user: "grindcity", spotId: 8, likes: 19, comments: 3, text: "is at <b>The Attic</b> right now 📍 — session til midnight", time: "2h ago" },
  { user: "mena.j", spotId: 10, likes: 64, comments: 11, text: "reviewed <b>Radio Hill Antenna Field</b> ★★★★★ — 'saw the milky way IN DALLAS'", time: "3h ago" },
  { user: "sadboy_sam", spotId: 5, likes: 53, comments: 8, text: "warning on <b>Echo Tunnel</b>: rain forecast tomorrow, stay out ⚠️", time: "5h ago" },
];
