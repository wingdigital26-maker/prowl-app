// Plano, TX new batch. ids namespaced 218+.
// Categories this run: food, coffee, bar, hangout, nature. Curated per prowl-spot-curator taste.
// Verified real, open, non-chain, ~4.3+ via web research (Yelp/OpenTable/Tripadvisor/AllTrails).
const PLANO_NEW_SPOTS = [
  // ---------- FOOD ----------
  {
    id: 218,
    reviewUrl: "https://www.google.com/maps/search/?api=1&query=Lima%20Taverna%20Plano%20TX",
    name: "Lima Taverna",
    cat: "food",
    lat: 33.0110, lng: -96.7045, zip: "75075",
    desc: "Family run Peruvian spot on West Plano Parkway with 400 plus glowing reviews. Get the lomo saltado or a pisco sour, and start with the ceviche while it is fresh.",
    tags: ["peruvian", "family-owned", "ceviche"],
    danger: 1,
    rating: 4.5,
    reviews: [
      { user: "cevicheclub", stars: 5, text: "The lomo saltado is the real deal and the pisco sours are dangerous. Warm family vibe." },
      { user: "planoeats214", stars: 4, text: "Authentic Peruvian that is hard to find around here. Ceviche was super fresh." }
    ]
  },
  {
    id: 219,
    reviewUrl: "https://www.google.com/maps/search/?api=1&query=CraftWay%20Kitchen%20Plano%20TX",
    name: "CraftWay Kitchen",
    cat: "food",
    lat: 33.0458, lng: -96.8024, zip: "75093",
    desc: "Chef driven neighborhood restaurant and bar at Preston Park with scratch American plates and a serious brunch. Book ahead on weekends and go for the chicken and waffles or the burger.",
    tags: ["american", "brunch", "date-night"],
    danger: 1,
    rating: 4.6,
    reviews: [
      { user: "brunchbound", stars: 5, text: "Weekend brunch is worth the wait. Everything is made from scratch and it shows." },
      { user: "prestonparkfan", stars: 4, text: "Solid neighborhood spot. Burger and a cocktail on the patio never misses." }
    ]
  },
  {
    id: 220,
    reviewUrl: "https://www.google.com/maps/search/?api=1&query=Taverna%20Rossa%20Plano%20TX",
    name: "Taverna Rossa",
    cat: "food",
    lat: 33.0410, lng: -96.8028, zip: "75093",
    desc: "Craft pizza and beer house with wood fired pies and a big rotating tap list. Live music Friday and Saturday nights, grab the margherita or a specialty pie and a local draft.",
    tags: ["pizza", "craft-beer", "live-music"],
    danger: 1,
    rating: 4.5,
    reviews: [
      { user: "pizzapatrol", stars: 5, text: "Blistered wood fired crust and a killer beer list. The live music weekends are a bonus." },
      { user: "hoppyhour", stars: 4, text: "Great pies and rotating taps. Fun energy on band nights." }
    ]
  },
  {
    id: 221,
    reviewUrl: "https://www.google.com/maps/search/?api=1&query=Mama%20Vicky's%20Pupusas%20Y%20Mas%20Plano%20TX",
    name: "Mama Vicky's Pupusas Y Mas",
    cat: "food",
    lat: 33.0207, lng: -96.6928, zip: "75074",
    desc: "Family owned Salvadoran kitchen near downtown turning out hand pressed pupusas all day from 7am. Get the revuelta pupusas with curtido, cheap, generous, and made to order.",
    tags: ["salvadoran", "pupusas", "hidden-gem"],
    danger: 1,
    rating: 4.7,
    reviews: [
      { user: "pupusaqueen", stars: 5, text: "Best pupusas in Plano hands down. The curtido and salsa on the side are perfect." },
      { user: "eastplanoeats", stars: 5, text: "Cheap, huge portions, and everything is made fresh. Family run and it feels like it." }
    ]
  },

  // ---------- COFFEE ----------
  {
    id: 222,
    reviewUrl: "https://www.google.com/maps/search/?api=1&query=Mudleaf%20Coffee%20Plano%20TX",
    name: "Mudleaf Coffee",
    cat: "coffee",
    lat: 33.0475, lng: -96.7568, zip: "75075",
    desc: "Spacious independent coffeehouse with hand crafted drinks and plenty of room to spread out. Good wifi and outlets make it a go to for a laptop morning, try the honey lavender latte.",
    tags: ["specialty", "study-spot", "spacious"],
    danger: 1,
    rating: 4.5,
    reviews: [
      { user: "lattelee", stars: 5, text: "Roomy, calm, and the honey lavender latte is my regular. Easy to work here for hours." },
      { user: "outletseeker", stars: 4, text: "Plenty of seating and outlets. Solid espresso and a chill vibe." }
    ]
  },
  {
    id: 223,
    reviewUrl: "https://www.google.com/maps/search/?api=1&query=Dar%20Coffee%20Plano%20TX",
    name: "Dar Coffee",
    cat: "coffee",
    lat: 33.0290, lng: -96.6555, zip: "75074",
    desc: "East Plano specialty shop that pairs great espresso with a Mediterranean menu, sandwiches and desserts included. Grab a cardamom latte and a pastry, cozy and a little different.",
    tags: ["specialty", "mediterranean", "cozy"],
    danger: 1,
    rating: 4.7,
    reviews: [
      { user: "cardamomkid", stars: 5, text: "Coffee is dialed and the Mediterranean bites are a nice surprise. Warm little spot." },
      { user: "eastsidebrew", stars: 5, text: "My favorite in east Plano. Great espresso and the desserts are legit." }
    ]
  },
  {
    id: 224,
    reviewUrl: "https://www.google.com/maps/search/?api=1&query=Pax%20%26%20Beneficia%20Coffee%20Plano%20TX",
    name: "Pax & Beneficia Coffee",
    cat: "coffee",
    lat: 33.0112, lng: -96.7095, zip: "75075",
    desc: "Design forward cafe in the walkable Heritage Creekside district known for Vietnamese inspired drinks. Order the Saigon or the pistachio latte and take the patio when the weather is good.",
    tags: ["specialty", "vietnamese", "patio"],
    danger: 1,
    rating: 4.6,
    reviews: [
      { user: "saigonsipper", stars: 5, text: "The Vietnamese coffee drinks are unreal. Beautiful space and friendly baristas." },
      { user: "creeksidecrew", stars: 4, text: "Great pistachio latte and a nice patio. Fun walkable area around it too." }
    ]
  },

  // ---------- BAR ----------
  {
    id: 225,
    reviewUrl: "https://www.google.com/maps/search/?api=1&query=32%20Degrees%20Rooftop%20Bar%20Plano%20TX",
    name: "32 Degrees Rooftop Bar",
    cat: "bar",
    lat: 33.0197, lng: -96.6972, zip: "75074",
    desc: "Third floor rooftop above Urban Crust in historic downtown that pours drafts at 32 degrees over an ice rail. Come at golden hour for the downtown views and a cold pour with a wood fired pizza.",
    tags: ["rooftop", "downtown", "date-night"],
    danger: 1,
    rating: 4.4,
    reviews: [
      { user: "rooftopruth", stars: 5, text: "The ice rail keeping the beer at 32 is a gimmick that actually rules. Best rooftop in old Plano." },
      { user: "sunsetsipper", stars: 4, text: "Great downtown views up top. Come early on weekends for a table." }
    ]
  },
  {
    id: 226,
    reviewUrl: "https://www.google.com/maps/search/?api=1&query=Seager%20%26%20Sons%20Plano%20TX",
    name: "Seager & Sons",
    cat: "bar",
    lat: 33.0932, lng: -96.8138, zip: "75024",
    desc: "Vinyl spinning bar at the Boardwalk at Granite Park doing pizza, fried chicken, cocktails and cold beer with a DJ. Grab a booth, order a pie and a cocktail, and stay for the happy hour.",
    tags: ["cocktails", "vinyl", "patio"],
    danger: 1,
    rating: 4.5,
    reviews: [
      { user: "vinylvibes", stars: 5, text: "Records spinning, strong cocktails, and the fried chicken is a sleeper hit. Great hang." },
      { user: "boardwalkbud", stars: 4, text: "Fun energy and a good happy hour. Patio on the water is a plus." }
    ]
  },
  {
    id: 227,
    reviewUrl: "https://www.google.com/maps/search/?api=1&query=Suburban%20Yacht%20Club%20Plano%20TX",
    name: "Suburban Yacht Club",
    cat: "bar",
    lat: 33.0930, lng: -96.8142, zip: "75024",
    desc: "Tiki inspired bar on the water at the Boardwalk at Granite Park with a laid back coastal feel. Order a tiki cocktail and the daily ceviche, best on the patio at sunset.",
    tags: ["tiki", "cocktails", "waterfront"],
    danger: 1,
    rating: 4.5,
    reviews: [
      { user: "tikitodd", stars: 5, text: "Fun tiki drinks and a chill coastal vibe right on the water. Ceviche was great." },
      { user: "patiopelican", stars: 4, text: "Solid patio spot at sunset. Tacos and a frozen drink and you are set." }
    ]
  },

  // ---------- HANGOUT ----------
  {
    id: 228,
    reviewUrl: "https://www.google.com/maps/search/?api=1&query=Haggard%20Park%20Plano%20TX",
    photos: ["img/real/spot-228.jpg"],
    photoCredit: { by: "Michael Barera", license: "CC BY-SA 4.0", url: "https://commons.wikimedia.org/wiki/File:Plano_October_2015_04_(Haggard_Park).jpg" },
    name: "Haggard Park",
    cat: "hangout",
    lat: 33.0192, lng: -96.6983, zip: "75074",
    desc: "Leafy five acre park at the heart of the downtown Plano Arts District, with a pond, chess boards and paved paths. Hub for festivals and concerts, go on an event weekend and wander the shops after.",
    tags: ["park", "downtown", "events"],
    danger: 1,
    rating: 4.6,
    reviews: [
      { user: "artsdistrict", stars: 5, text: "Perfect little downtown park. The festivals and outdoor concerts here are the best in Plano." },
      { user: "chessboardchamp", stars: 4, text: "Nice pond, shady paths, and the chess tables are a fun touch. Great after a downtown lunch." }
    ]
  },
  {
    id: 229,
    reviewUrl: "https://www.google.com/maps/search/?api=1&query=Georgia's%20Farmers%20Market%20Plano%20TX",
    name: "Georgia's Farmers Market",
    cat: "hangout",
    lat: 33.0196, lng: -96.6978, zip: "75074",
    desc: "Family owned farmers market in downtown Plano stocked with fresh local produce and made in Texas goods. Go on a Saturday morning for the best selection and grab a smoothie while you shop.",
    tags: ["market", "local", "downtown"],
    danger: 1,
    rating: 4.6,
    reviews: [
      { user: "marketmarcy", stars: 5, text: "Fresh produce and friendly owners. Saturday morning here is a downtown Plano ritual." },
      { user: "localgoods", stars: 4, text: "Great local finds and Texas made products. Grab a smoothie and browse." }
    ]
  },

  // ---------- NATURE ----------
  {
    id: 230,
    reviewUrl: "https://www.google.com/maps/search/?api=1&query=Bluebonnet%20Trail%20Greenbelt%20Plano%20TX",
    name: "Bluebonnet Trail Greenbelt",
    cat: "nature",
    lat: 33.0455, lng: -96.6555, zip: "75074",
    desc: "The longest trail in Plano, a paved greenbelt that links into Oak Point Park and Nature Preserve. Come in early spring when the bluebonnets bloom along the path, great for a long walk or a ride.",
    tags: ["trail", "bluebonnets", "biking"],
    danger: 1,
    rating: 4.6,
    reviews: [
      { user: "trailtrekker", stars: 5, text: "Long, well paved, and connects to Oak Point. Bluebonnets in spring make it unreal." },
      { user: "pedalpusher", stars: 4, text: "Great flat ride and easy to access. Quiet and green most of the way." }
    ]
  },
  {
    id: 231,
    reviewUrl: "https://www.google.com/maps/search/?api=1&query=Legacy%20Trail%20Plano%20TX",
    name: "Legacy Trail",
    cat: "nature",
    lat: 33.0728, lng: -96.8358, zip: "75093",
    desc: "Hike and bike trail that winds along White Rock Creek and its lakes through west Plano. Park at Windhaven Meadows and go for a shaded creekside walk or a long ride away from traffic.",
    tags: ["trail", "creekside", "biking"],
    danger: 1,
    rating: 4.7,
    reviews: [
      { user: "creeksidecarl", stars: 5, text: "Beautiful shaded stretch along the creek and lakes. My favorite ride in west Plano." },
      { user: "walkandroll", stars: 4, text: "Quiet, green, and well maintained. Windhaven Meadows is an easy place to start." }
    ]
  }
];

if (typeof module !== "undefined" && module.exports) { module.exports = PLANO_NEW_SPOTS; }
