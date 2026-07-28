// Prowl - curated real Dallas spots. City of Dallas + immediate core neighborhoods only.
// Schema: { id, name, cat, lat, lng, zip, desc, tags, danger, reviews:[{user,stars,text}] }
// danger: 1 = normal. 2-4 = urbex-flavored spots, based on how rough/sketchy access feels.

const REAL_SPOTS = [
  // ---------- FOOD ----------
  {
    id: 101, name: "Pecan Lodge", cat: "food",
    reviewUrl: "https://www.yelp.com/biz/pecan-lodge-dallas-3",
    lat: 32.7842, lng: -96.7838, zip: "75226",
    desc: "The Deep Ellum barbecue that put Dallas on the national map. Get there before it opens, order The Trough or a fatty brisket plate, and do not skip the beef rib.",
    tags: ["bbq", "brisket", "deepellum"], danger: 1, rating: 4.6,
    reviews: [
      { user: "smokestackjenny", stars: 5, text: "Worth the line. That beef rib is the size of my forearm and falls apart." },
      { user: "dfweats", stars: 5, text: "Best brisket in the city, no debate. Come early, they sell out." }
    ]
  },
  {
    id: 102, name: "El Come Taco", cat: "food",
    reviewUrl: "https://www.yelp.com/biz/el-come-taco-dallas",
    lat: 32.8113, lng: -96.7770, zip: "75204",
    desc: "Loud, fast East Dallas taqueria doing proper Mexico City style tacos. Order the al pastor and the campechano, watch the griddle from the counter.",
    tags: ["tacos", "eastdallas", "pastor"], danger: 1, rating: 4.5,
    reviews: [
      { user: "tacotrail", stars: 5, text: "Campechano taco is unreal. Cheap, fast, packed with flavor." },
      { user: "notdaphne", stars: 4, text: "Tiny spot, gets busy, but the tacos are the real deal." }
    ]
  },
  {
    id: 103, name: "Ichigoh Ramen Lounge", cat: "food",
    reviewUrl: "https://www.yelp.com/biz/ichigoh-ramen-lounge-dallas",
    lat: 32.7838, lng: -96.7855, zip: "75226",
    desc: "Deep Ellum ramen bar where every broth, chashu and egg is made from scratch. Dim, moody, great for a rainy night. Get the tonkotsu and a highball.",
    tags: ["ramen", "deepellum", "cozy"], danger: 1, rating: 4.4,
    reviews: [
      { user: "brothhound", stars: 5, text: "Rich tonkotsu, perfect noodles, dark cool vibe. My go to." },
      { user: "kenji_d", stars: 4, text: "Small menu done really well. The egg alone is worth it." }
    ]
  },
  {
    id: 104, name: "Oddfellows", cat: "food",
    reviewUrl: "https://www.yelp.com/biz/oddfellows-dallas",
    lat: 32.7487, lng: -96.8290, zip: "75208",
    desc: "Bishop Arts brunch staple with a big patio and killer biscuits. Come for weekend brunch, order the migas or the fried chicken biscuit, get there early to beat the wait.",
    tags: ["brunch", "bishoparts", "patio"], danger: 1, rating: 4.4,
    reviews: [
      { user: "brunchbina", stars: 5, text: "Patio brunch here is the whole vibe. Biscuits are dangerous." },
      { user: "oakcliffkid", stars: 4, text: "Solid coffee, great migas, cute Bishop Arts corner." }
    ]
  },
  {
    id: 105, name: "Taqueria El Si Hay", cat: "food",
    reviewUrl: "https://www.yelp.com/biz/taqueria-el-si-hay-dallas",
    lat: 32.7497, lng: -96.8318, zip: "75208",
    desc: "Cash only Oak Cliff walk up window with al pastor carved straight off the trompo. A true hole in the wall, some of the best tacos in Dallas. Bring cash.",
    tags: ["tacos", "oakcliff", "cashonly"], danger: 1, rating: 4.5,
    reviews: [
      { user: "trompofiend", stars: 5, text: "Pastor off the spit, lime, onion, done. Perfect every time." },
      { user: "davisstreet", stars: 5, text: "No frills window, incredible tacos. Locals only kind of spot." }
    ]
  },
  {
    id: 106, name: "Revolver Taco Lounge", cat: "food",
    reviewUrl: "https://www.yelp.com/biz/revolver-taco-lounge-dallas",
    lat: 32.7843, lng: -96.7840, zip: "75226",
    desc: "Deep Ellum sit down spot for elevated Mexican and handmade blue corn tortillas. Book the tasting room Purepecha in back for a real occasion. Trendy but genuinely good.",
    tags: ["mexican", "deepellum", "datenight"], danger: 1, rating: 4.5,
    reviews: [
      { user: "masahead", stars: 5, text: "Duck carnitas taco changed me. Handmade tortillas are next level." },
      { user: "reservados", stars: 4, text: "A little pricey but the quality is there. Great date spot." }
    ]
  },
  {
    id: 107, name: "El Tacaso", cat: "food",
    reviewUrl: "https://www.yelp.com/biz/el-tacaso-dallas-5",
    lat: 32.863, lng: -96.856, zip: "75220",
    desc: "Literal 24/7 hole in the wall off Northwest Highway for the late night taco run. Come after the bars, order tacos and a horchata, do not overthink it.",
    tags: ["latenight", "tacos", "247"], danger: 1, rating: 4.3,
    reviews: [
      { user: "3amtaco", stars: 5, text: "Open when nothing else is and still slaps. Post bar hero." },
      { user: "nightowl_tx", stars: 4, text: "Hole in the wall in the best way. Cheap and always open." }
    ]
  },

  // ---------- COFFEE ----------
  {
    id: 108, name: "Houndstooth Coffee", cat: "coffee",
    reviewUrl: "https://www.yelp.com/biz/houndstooth-coffee-dallas",
    lat: 32.8100, lng: -96.7770, zip: "75206",
    desc: "Sleek Knox Henderson third wave shop with sharp baristas and a proper espresso program. Grab a cortado, sit at the window, watch the neighborhood roll by.",
    tags: ["thirdwave", "espresso", "knoxhenderson"], danger: 1, rating: 4.6,
    reviews: [
      { user: "cortadocory", stars: 5, text: "Baristas actually care. Clean design, dialed espresso." },
      { user: "beanqueen", stars: 4, text: "Reliable, cool space, good laptop energy without being sterile." }
    ]
  },
  {
    id: 109, name: "Ascension Coffee", cat: "coffee",
    reviewUrl: "https://www.yelp.com/biz/ascension-coffee-design-district-dallas",
    lat: 32.7960, lng: -96.8190, zip: "75207",
    desc: "Design District cafe with airy industrial interior and its own roasting. Great for a slow morning or a work session, the flat white and avocado toast are the move.",
    tags: ["designdistrict", "roaster", "brunch"], danger: 1, rating: 4.4,
    reviews: [
      { user: "flatwhitefox", stars: 5, text: "Gorgeous space, big windows, roast is dialed. Love it here." },
      { user: "designdork", stars: 4, text: "Perfect Design District stop. Good food, better coffee." }
    ]
  },
  {
    id: 110, name: "La La Land Kind Cafe", cat: "coffee",
    reviewUrl: "https://www.yelp.com/biz/la-la-land-dallas-6",
    lat: 32.8250, lng: -96.7730, zip: "75206",
    desc: "Feel good cafe that hires and trains youth aging out of foster care. Pastel patio, the Iced Kind Latte with rose and honey is the signature. Bright, sweet, popular.",
    tags: ["cozy", "patio", "goodcause"], danger: 1, rating: 4.6,
    reviews: [
      { user: "kindbrew", stars: 5, text: "Cutest patio and the mission is real. That rose latte though." },
      { user: "vickeryvibes", stars: 4, text: "Instagram bait but actually good coffee and a great cause." }
    ]
  },
  {
    id: 111, name: "Weekend Coffee", cat: "coffee",
    reviewUrl: "https://www.yelp.com/biz/weekend-coffee-dallas",
    lat: 32.7810, lng: -96.7970, zip: "75201",
    desc: "Tucked inside The Joule downtown, a tiny jewel box cafe with some of the best pour overs in the city. Quick in and out or a quiet reset between downtown errands.",
    tags: ["downtown", "pourover", "thejoule"], danger: 1, rating: 4.7,
    reviews: [
      { user: "joulejunkie", stars: 5, text: "Hidden little gem in the hotel. Immaculate pour over." },
      { user: "downtowndrip", stars: 4, text: "Small but mighty. Great stop when you are downtown." }
    ]
  },

  // ---------- BAR ----------
  {
    id: 112, name: "Midnight Rambler", cat: "bar",
    reviewUrl: "https://www.yelp.com/biz/midnight-rambler-dallas",
    lat: 32.7808, lng: -96.7975, zip: "75201",
    desc: "Subterranean cocktail den beneath The Joule with a serious drink program and a dark, glam mood. Ask the bartender to riff, or order the Elder Fashion. Best late.",
    tags: ["speakeasy", "cocktails", "downtown"], danger: 1, rating: 4.5,
    reviews: [
      { user: "shakerstir", stars: 5, text: "Basement glamour and the cocktails are legit craft. Sexy room." },
      { user: "nocturnenina", stars: 4, text: "Feels secret and special. Pricey but the drinks earn it." }
    ]
  },
  {
    id: 113, name: "HG Sply Co", cat: "bar",
    reviewUrl: "https://www.yelp.com/biz/hg-sply-dallas-3",
    lat: 32.8120, lng: -96.7690, zip: "75206",
    desc: "Lower Greenville rooftop with a big open air bar and skyline views. Come at golden hour, grab a picnic table up top, order a bourbon and stay for sunset.",
    tags: ["rooftop", "skyline", "greenville"], danger: 1, rating: 4.4,
    reviews: [
      { user: "sunsetsam", stars: 5, text: "The rooftop at sunset is unbeatable. Great crowd, good drinks." },
      { user: "greenvillegal", stars: 4, text: "Get there before dark for a table up top. Views are worth it." }
    ]
  },
  {
    id: 114, name: "Adair's Saloon", cat: "bar",
    reviewUrl: "https://www.yelp.com/biz/adairs-saloon-dallas",
    lat: 32.7845, lng: -96.7845, zip: "75226",
    desc: "Deep Ellum honky tonk dive covered in decades of scrawled graffiti. Cheap beer, live country, greasy burger. Sign the wall, tip the band, embrace the grime.",
    tags: ["dive", "livemusic", "deepellum"], danger: 1, rating: 4.5,
    reviews: [
      { user: "honkytonkhank", stars: 5, text: "Every inch is written on. Cold beer, real country, zero pretense." },
      { user: "dive4life", stars: 4, text: "Grimy in the best way. The burger is secretly great." }
    ]
  },
  {
    id: 115, name: "Bar Eden", cat: "bar",
    reviewUrl: "https://www.yelp.com/biz/bar-eden-lounge-at-paradiso-dallas",
    lat: 32.7500, lng: -96.8290, zip: "75208",
    desc: "Bishop Arts cocktail bar with a botanical garden fever dream vibe. Drinks built around flowers, herbs and smoke. Dress up a little, order whatever looks most alive.",
    tags: ["cocktails", "botanical", "bishoparts"], danger: 1, rating: 4.7,
    reviews: [
      { user: "petalpour", stars: 5, text: "Every cocktail is a tiny garden. Stunning room, stunning drinks." },
      { user: "oakcliffnights", stars: 4, text: "Moody and beautiful. Great for a special night out." }
    ]
  },
  {
    id: 116, name: "Black Swan Saloon", cat: "bar",
    reviewUrl: "https://www.yelp.com/biz/black-swan-saloon-dallas-3",
    lat: 32.7845, lng: -96.7830, zip: "75226",
    desc: "Deep Ellum craft cocktail spot run by a bartender who muddles fresh fruit and jalapeno to order. No menu, tell them what you like and trust the process.",
    tags: ["cocktails", "deepellum", "bartenderschoice"], danger: 1, rating: 4.6,
    reviews: [
      { user: "gunpowdergin", stars: 5, text: "No menu, just tell him what you like. Never missed." },
      { user: "spiceandice", stars: 4, text: "Small, dim, and the drinks are seriously good. Local secret." }
    ]
  },

  // ---------- HANGOUT ----------
  {
    id: 117, name: "Klyde Warren Park", cat: "hangout",
    reviewUrl: "https://www.google.com/maps/search/?api=1&query=Klyde%20Warren%20Park%20Dallas",
    photos: ["img/real/klyde-warren-1.jpg", "img/real/klyde-warren-2.jpg"],
    lat: 32.7894, lng: -96.8016, zip: "75201",
    desc: "The deck park built over a downtown freeway, five acres of lawn, food trucks and skyline. Grab lunch off a truck, lay in the grass, catch a free yoga or games night.",
    tags: ["deckpark", "downtown", "foodtrucks"], danger: 1, rating: 4.8,
    reviews: [
      { user: "lawnlounger", stars: 5, text: "A park built over a highway that actually rules. Food trucks daily." },
      { user: "midcity_m", stars: 4, text: "Great free hangout downtown. Skyline views, always something on." }
    ]
  },
  {
    id: 118, name: "Bishop Arts District", cat: "hangout",
    reviewUrl: "https://www.google.com/maps/search/?api=1&query=Bishop%20Arts%20District%20Dallas",
    photos: ["img/real/bishop-arts-1.jpg", "img/real/bishop-arts-2.jpg"],
    lat: 32.7485, lng: -96.8295, zip: "75208",
    desc: "Walkable Oak Cliff pocket of indie shops, murals, patios and coffee. Park once and wander, best on a weekend afternoon spilling into evening drinks.",
    tags: ["walkable", "oakcliff", "murals"], danger: 1, rating: 4.7,
    reviews: [
      { user: "strollsteph", stars: 5, text: "Best neighborhood to just wander. Murals, shops, patios everywhere." },
      { user: "cliffdweller", stars: 4, text: "Charming and local. Come hungry and plan to stay a while." }
    ]
  },
  {
    id: 119, name: "Truck Yard", cat: "hangout",
    reviewUrl: "https://www.yelp.com/biz/truck-yard-dallas",
    lat: 32.8245, lng: -96.7720, zip: "75206",
    desc: "Ramshackle Lower Greenville beer garden that looks like a junkyard got a liquor license. Rotating food trucks, string lights, a treehouse bar. Loose and fun.",
    tags: ["beergarden", "foodtrucks", "greenville"], danger: 1, rating: 4.4,
    reviews: [
      { user: "junkyardjoy", stars: 5, text: "Treehouse bar, string lights, cheesesteaks. Chaotic and perfect." },
      { user: "patiopatrick", stars: 4, text: "Come with a group. Great vibe, always a food truck worth trying." }
    ]
  },

  // ---------- NATURE ----------
  {
    id: 120, name: "White Rock Lake Trail", cat: "nature",
    reviewUrl: "https://www.google.com/maps/search/?api=1&query=White%20Rock%20Lake%20Trail%20Dallas",
    photos: ["img/real/white-rock-2.jpg", "img/real/white-rock-1.png"],
    lat: 32.8300, lng: -96.7200, zip: "75218",
    desc: "Nine mile loop around the lake with skyline views, herons and spillway. Best at sunrise or golden hour, bring a bike or just walk the east side by the water.",
    tags: ["lake", "trail", "sunset"], danger: 1, rating: 4.8,
    reviews: [
      { user: "spillwaysam", stars: 5, text: "Sunset over the water with the skyline behind it is elite Dallas." },
      { user: "pedalpaige", stars: 4, text: "Full loop by bike is the move. Watch for the herons at the spillway." }
    ]
  },
  {
    id: 121, name: "Cedar Ridge Preserve", cat: "nature",
    reviewUrl: "https://www.google.com/maps/search/?api=1&query=Cedar%20Ridge%20Preserve%20Dallas",
    lat: 32.6360, lng: -96.9540, zip: "75249",
    desc: "A slice of Hill Country 20 minutes from downtown, 600+ acres of limestone bluff trails and a butterfly garden. Hike the Cattail Pond loop, go early, bring water.",
    tags: ["hiking", "bluffs", "escarpment"], danger: 1, rating: 4.7,
    reviews: [
      { user: "bluffbeckett", stars: 5, text: "Feels like the Hill Country but its right here. Real elevation." },
      { user: "trailmixtina", stars: 4, text: "Cattail Pond loop is gorgeous. Go early before it heats up." }
    ]
  },

  // ---------- ABANDONED / URBEX-FLAVORED (all publicly accessible unless noted) ----------
  {
    id: 122, name: "Fabrication Yard", cat: "hangout",
    reviewUrl: "https://www.google.com/maps/search/?api=1&query=Fabrication%20Yard%20Dallas",
    lat: 32.7790, lng: -96.8300, zip: "75212",
    desc: "Dallas first legal free art wall, an old warehouse lot where anyone can spray paint. Constantly changing murals, gritty and photogenic. Legal to paint and shoot, watch broken glass.",
    tags: ["graffiti", "legal", "photography"], danger: 2, rating: 4.5,
    reviews: [
      { user: "aerosolart", stars: 5, text: "Layers on layers of spray paint. Free to paint, best canvas in town." },
      { user: "urbexeddie", stars: 4, text: "Rough around the edges but totally legal and endlessly photogenic." }
    ]
  },
  {
    id: 123, name: "Deep Ellum Blues Alley Murals", cat: "hangout",
    reviewUrl: "https://www.google.com/maps/search/?api=1&query=Deep%20Ellum%20Murals%20Dallas",
    photos: ["img/real/deep-ellum-1.jpg", "img/real/deep-ellum-2.jpg"],
    lat: 32.7840, lng: -96.7810, zip: "75226",
    desc: "Sprawling outdoor mural corridor honoring Dallas blues history, tucked among Deep Ellum alleys. Over 100 murals nearby. Free, public, best light in early morning before crowds.",
    tags: ["murals", "streetart", "free"], danger: 1, rating: 4.7,
    reviews: [
      { user: "muralmaggie", stars: 5, text: "Endless walls of art. Go early and you get the whole alley to yourself." },
      { user: "bluesbryan", stars: 4, text: "Deep Ellum at its coolest. Every corner is a photo." }
    ]
  },
  {
    id: 124, name: "Santa Fe Trestle Trail", cat: "nature",
    reviewUrl: "https://www.google.com/maps/search/?api=1&query=Santa%20Fe%20Trestle%20Trail%20Dallas",
    photos: ["img/real/trestle-1.jpg", "img/real/trestle-2.jpg"],
    lat: 32.7530, lng: -96.8010, zip: "75215",
    desc: "A repurposed rail trestle carrying a walking path across the Trinity River, all rusted steel and river bottom views. Industrial, gritty, legal. Quiet on weekday mornings, watch your footing.",
    tags: ["trestle", "trinity", "industrial"], danger: 2, rating: 4.6,
    reviews: [
      { user: "railsandrust", stars: 5, text: "Old trestle over the river, skyline in the distance. Pure urbex feel, totally legal." },
      { user: "riverbottomrick", stars: 4, text: "Gritty and quiet. Great for photos if you like rust and steel." }
    ]
  },
  {
    id: 125, name: "Trinity Overlook Park", cat: "nature",
    reviewUrl: "https://www.google.com/maps/search/?api=1&query=Trinity%20Overlook%20Park%20Dallas",
    photos: ["img/real/trinity-overlook-1.jpg", "img/real/trinity-overlook-2.jpg"],
    lat: 32.7720, lng: -96.8230, zip: "75207",
    desc: "Small bluff park looking out over the wild Trinity River bottoms and the Margaret Hunt Hill Bridge. Raw, empty floodplain against the skyline. Free, open, eerily quiet at dusk.",
    tags: ["overlook", "trinity", "skyline"], danger: 1, rating: 4.5,
    reviews: [
      { user: "floodplainfern", stars: 5, text: "Weirdly empty view of the river bottoms and the bridge. Feels post apocalyptic at dusk." },
      { user: "bridgewatcher", stars: 4, text: "Underrated overlook. Great skyline and bridge shots, nobody around." }
    ]
  },
  {
    id: 126, name: "Dealey Plaza and the Grassy Knoll", cat: "hangout",
    reviewUrl: "https://www.google.com/maps/search/?api=1&query=Dealey%20Plaza%20Dallas",
    photos: ["img/real/dealey-plaza-2.jpg", "img/real/dealey-plaza-1.jpg"],
    lat: 32.7787, lng: -96.8083, zip: "75202",
    desc: "The historic downtown plaza and grassy knoll of the JFK assassination, frozen in 1963. Free, public, heavy with history. The X on Elm Street marks the spot, mind the traffic.",
    tags: ["historic", "jfk", "downtown"], danger: 1, rating: 4.6,
    reviews: [
      { user: "historyhal", stars: 5, text: "Eerie standing where it happened. The whole plaza looks unchanged since 63." },
      { user: "plazapaula", stars: 4, text: "Sobering and free. Read up first, it hits different in person." }
    ]
  }
];
