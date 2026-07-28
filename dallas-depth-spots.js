// Prowl - Dallas DEPTH batch. Coolest neighborhoods: Deep Ellum, Bishop Arts,
// Lower Greenville, Uptown, Trinity Groves, Knox-Henderson. Food / coffee / bar.
// Schema: { id, name, cat, lat, lng, zip, desc, tags, danger, rating, reviews:[{user,stars,text}] }
// ids 401+. No duplicates of real-spots (101-126) or plano/hangout batches.

const DALLAS_DEPTH_SPOTS = [
  // ---------- FOOD ----------
  {
    id: 401, name: "Ruins", cat: "food",
    reviewUrl: "https://www.yelp.com/biz/ruins-dallas-3",
    lat: 32.7847, lng: -96.7803, zip: "75226",
    desc: "Oaxacan style Deep Ellum spot with agave cocktails, live music and a patio that spills onto Commerce Street. Get the birria and whatever mezcal drink the bartender is proud of.",
    tags: ["oaxacan", "deepellum", "livemusic"], danger: 1, rating: 4.5,
    reviews: [
      { user: "mezcalmax", stars: 5, text: "Feels like a secret courtyard. Birria and a smoky mezcal cocktail, perfect night." },
      { user: "commercestclara", stars: 4, text: "Cool room, real Oaxacan flavors, and the patio is the move on a warm night." }
    ]
  },
  {
    id: 402, name: "The Free Man Cajun Cafe and Lounge", cat: "food",
    reviewUrl: "https://www.yelp.com/biz/the-free-man-dallas",
    lat: 32.7846, lng: -96.7808, zip: "75226",
    desc: "Deep Ellum Cajun joint with live jazz most nights and a genuinely soulful kitchen. Order the jambalaya and the beignets, grab a seat near the band and stay late.",
    tags: ["cajun", "livejazz", "deepellum"], danger: 1, rating: 4.5,
    reviews: [
      { user: "gumbogail", stars: 5, text: "Jazz in your ear, jambalaya in front of you, beignets to finish. Deep Ellum magic." },
      { user: "brasshouse", stars: 4, text: "Real Cajun cooking and the band is always tight. Loud and fun." }
    ]
  },
  {
    id: 403, name: "Lucia", cat: "food",
    reviewUrl: "https://www.yelp.com/biz/lucia-dallas",
    lat: 32.7490, lng: -96.8290, zip: "75208",
    desc: "Tiny Bishop Arts Italian anchor doing house cured meats and handmade pasta at the top of the city. Reservations open 30 days out at 9am and vanish in minutes, so plan ahead.",
    tags: ["italian", "bishoparts", "datenight"], danger: 1, rating: 4.7,
    reviews: [
      { user: "pastapilgrim", stars: 5, text: "Best pasta in Dallas, full stop. Book the second the window opens or you miss it." },
      { user: "salumista", stars: 5, text: "House cured board and a bottle of red in that little room. Perfect date night." }
    ]
  },
  {
    id: 404, name: "Stock and Barrel", cat: "food",
    reviewUrl: "https://www.yelp.com/biz/stock-and-barrel-dallas",
    lat: 32.7495, lng: -96.8285, zip: "75208",
    desc: "Michelin recognized Bishop Arts bistro built around a massive wood fired grill. Smoky, bold American plates in a warm room. Get the burger or whatever is on the grill and a cocktail.",
    tags: ["woodfired", "bishoparts", "burger"], danger: 1, rating: 4.5,
    reviews: [
      { user: "grillgideon", stars: 5, text: "That wood fired burger is a religious experience. Cozy Bishop Arts spot." },
      { user: "emberella", stars: 4, text: "Everything tastes like smoke and butter in the best way. Great cocktails too." }
    ]
  },
  {
    id: 405, name: "Gemma", cat: "food",
    reviewUrl: "https://www.yelp.com/biz/gemma-dallas",
    lat: 32.8120, lng: -96.7695, zip: "75206",
    desc: "Intimate Lower Greenville New American room that quietly turns out some of the best cooking in Dallas. Menu changes with the season, the pasta and the crispy chicken are staples. Book ahead.",
    tags: ["newamerican", "greenville", "seasonal"], danger: 1, rating: 4.6,
    reviews: [
      { user: "seasonalsy", stars: 5, text: "Small menu, huge cooking. Never had a miss here in five visits." },
      { user: "greenvillegourmand", stars: 5, text: "Quietly one of the best restaurants in the city. That crispy chicken." }
    ]
  },
  {
    id: 406, name: "Beto and Son", cat: "food",
    reviewUrl: "https://www.yelp.com/biz/beto-and-son-dallas",
    lat: 32.7775, lng: -96.8360, zip: "75212",
    desc: "Flashy Trinity Groves modern Mexican from a father and son team, with skyline views and tableside guacamole. Come for the churro tower and the sunset over the bridge.",
    tags: ["mexican", "trinitygroves", "skyline"], danger: 1, rating: 4.5,
    reviews: [
      { user: "churrotower", stars: 5, text: "The churro tower is a whole event and the skyline view seals it." },
      { user: "gulden_g", stars: 4, text: "Loud, fun, great margs. Get a patio table for the bridge at sunset." }
    ]
  },
  {
    id: 407, name: "Niwa Japanese BBQ", cat: "food",
    reviewUrl: "https://www.yelp.com/biz/niwa-japanese-bbq-dallas",
    lat: 32.7838, lng: -96.7790, zip: "75226",
    desc: "Deep Ellum yakiniku where you grill premium cuts over a smokeless flame at your own table. Warm woods, soft light, real occasion energy. Splurge on the wagyu and go all in.",
    tags: ["yakiniku", "deepellum", "datenight"], danger: 1, rating: 4.6,
    reviews: [
      { user: "wagyuwren", stars: 5, text: "Grilling your own wagyu is the most fun dinner in Deep Ellum. Beautiful room." },
      { user: "smokelesssam", stars: 4, text: "Interactive and delicious. Pricey but a genuine special night out." }
    ]
  },

  // ---------- COFFEE ----------
  {
    id: 408, name: "Merit Coffee", cat: "coffee",
    reviewUrl: "https://www.yelp.com/biz/merit-coffee-dallas-2",
    lat: 32.7842, lng: -96.7845, zip: "75226",
    desc: "San Antonio roaster whose bright Deep Ellum shop nails a clean espresso program and a light airy room. Grab a cortado and a seat by the window, good for a work session.",
    tags: ["thirdwave", "espresso", "deepellum"], danger: 1, rating: 4.6,
    reviews: [
      { user: "cortadocaleb", stars: 5, text: "Dialed espresso, bright space, friendly baristas. My Deep Ellum work spot." },
      { user: "meritmaya", stars: 4, text: "Clean design and the roast is genuinely good. Gets busy midmorning." }
    ]
  },
  {
    id: 409, name: "The Wild Detectives", cat: "coffee",
    reviewUrl: "https://www.yelp.com/biz/the-wild-detectives-dallas",
    lat: 32.7490, lng: -96.8288, zip: "75208",
    desc: "Bishop Arts bookstore, cafe and bar in a converted house with a leafy back patio. Coffee by day, wine and events by night. Browse a book, take it to the yard, lose an afternoon.",
    tags: ["bookstore", "patio", "bishoparts"], danger: 1, rating: 4.6,
    reviews: [
      { user: "paperbackpete", stars: 5, text: "Books, coffee, a garden patio and wine later. My favorite hang in Oak Cliff." },
      { user: "backyardbea", stars: 4, text: "Charming little house. Great coffee and the patio is a hidden gem." }
    ]
  },
  {
    id: 410, name: "Cafe Duro", cat: "coffee",
    reviewUrl: "https://www.yelp.com/biz/cafe-duro-dallas",
    lat: 32.8135, lng: -96.7690, zip: "75206",
    desc: "Small European style cafe on Lower Greenville pulling strong espresso and pastries. Tucked into a walkable stretch, good for a quick cortado before wandering the avenue.",
    tags: ["espresso", "greenville", "european"], danger: 1, rating: 4.6,
    reviews: [
      { user: "espressoemi", stars: 5, text: "Proper little European cafe. Strong coffee, great pastries, tucked away." },
      { user: "avenueandy", stars: 4, text: "Cute stop on Greenville. Cortado hits and the vibe is calm." }
    ]
  },
  {
    id: 411, name: "Wayward Coffee Co", cat: "coffee",
    reviewUrl: "https://www.yelp.com/biz/wayward-coffee-dallas",
    lat: 32.7495, lng: -96.8295, zip: "75208",
    desc: "Neighborhood Bishop Arts coffee bar with a warm, unfussy feel and a solid pour over. Friendly, local and easy to linger in. Good for reading or a slow morning off Bishop Ave.",
    tags: ["pourover", "bishoparts", "cozy"], danger: 1, rating: 4.7,
    reviews: [
      { user: "waywardwill", stars: 5, text: "Cozy neighborhood spot, no pretense, really good pour over. Love it." },
      { user: "bishopbrew", stars: 5, text: "Friendliest baristas in Oak Cliff and a genuinely great cup." }
    ]
  },

  // ---------- BAR ----------
  {
    id: 412, name: "Bar Colette", cat: "bar",
    reviewUrl: "https://www.yelp.com/biz/bar-colette-dallas",
    lat: 32.8020, lng: -96.7975, zip: "75204",
    desc: "Stylish West Village cocktail lounge with an intimate European feel, nominated for a James Beard best new bar award. Dress up a touch, sit at the bar, let them steer you.",
    tags: ["cocktails", "uptown", "intimate"], danger: 1, rating: 4.7,
    reviews: [
      { user: "colettecole", stars: 5, text: "Feels like a chic little Paris bar. Every cocktail was flawless." },
      { user: "westvillagevi", stars: 5, text: "Intimate, beautiful, and the drinks earn the hype. Sit at the bar." }
    ]
  },
  {
    id: 413, name: "Bowen House", cat: "bar",
    reviewUrl: "https://www.yelp.com/biz/bowen-house-dallas",
    lat: 32.7975, lng: -96.8010, zip: "75204",
    desc: "Cocktails inside a restored 1874 Uptown farmhouse, all candlelight and old wood, with a hidden bar within a bar in back for the real occasion. Order something imaginative and settle in.",
    tags: ["cocktails", "historic", "uptown"], danger: 1, rating: 4.6,
    reviews: [
      { user: "farmhousefinn", stars: 5, text: "Drinking cocktails in a candlelit 1800s house is unreal. Ask about the back bar." },
      { user: "bollstreetbee", stars: 4, text: "Gorgeous historic room, inventive drinks. Feels special without trying hard." }
    ]
  },
  {
    id: 414, name: "Upside West Village", cat: "bar",
    reviewUrl: "https://www.yelp.com/biz/upside-west-village-dallas",
    lat: 32.8010, lng: -96.7985, zip: "75204",
    desc: "Rooftop atop the Canopy hotel in Uptown with unobstructed skyline views, fire pits and string lights. Come at golden hour, grab a lounge seat, order a seasonal marg and watch the city glow.",
    tags: ["rooftop", "uptown", "skyline"], danger: 1, rating: 4.4,
    reviews: [
      { user: "rooftoprhea", stars: 5, text: "Best skyline view in Uptown. Fire pits and a marg at sunset, done." },
      { user: "canopyclay", stars: 4, text: "Come before dark for a lounge chair. Views are unreal, drinks are solid." }
    ]
  },
  {
    id: 415, name: "Truth and Alibi", cat: "bar",
    reviewUrl: "https://www.yelp.com/biz/truth-and-alibi-dallas",
    lat: 32.7845, lng: -96.7810, zip: "75226",
    desc: "Deep Ellum speakeasy hidden behind a fake candy store front, dim and clubby once you find the door. Look for the password energy, dress sharp, and go later when it gets moody.",
    tags: ["speakeasy", "deepellum", "cocktails"], danger: 1, rating: 4.4,
    reviews: [
      { user: "candyshopcaz", stars: 5, text: "Walk through the candy store into a whole hidden bar. Loved the reveal." },
      { user: "alibiali", stars: 4, text: "Fun speakeasy gimmick that actually delivers. Go late, dress up a little." }
    ]
  },
  {
    id: 416, name: "Twilite Lounge", cat: "bar",
    reviewUrl: "https://www.yelp.com/biz/twilite-lounge-dallas",
    lat: 32.7844, lng: -96.7805, zip: "75226",
    desc: "New Orleans style Deep Ellum bar with free live jazz and blues, a back patio and zero pretense. Order a Sazerac, catch the band, and let the night unwind slow.",
    tags: ["livejazz", "deepellum", "patio"], danger: 1, rating: 4.6,
    reviews: [
      { user: "sazeracsue", stars: 5, text: "Free live jazz and a good Sazerac in a dim NOLA style room. My kind of bar." },
      { user: "twilitetom", stars: 4, text: "No cover, real music, easy patio. One of the most honest bars in Deep Ellum." }
    ]
  },
  {
    id: 417, name: "Parliament", cat: "bar",
    reviewUrl: "https://www.yelp.com/biz/parliament-dallas",
    lat: 32.7968, lng: -96.8025, zip: "75204",
    desc: "Uptown cocktail bar with a famously enormous menu and a serious craft program. Overwhelmed by the list? Tell the bartender two spirits you like and a mood, and trust them.",
    tags: ["cocktails", "uptown", "craft"], danger: 1, rating: 4.6,
    reviews: [
      { user: "menumarlo", stars: 5, text: "The cocktail menu is a novel and every one I tried was excellent." },
      { user: "uptownute", stars: 4, text: "Tell them what you like and let go. Serious craft bartending here." }
    ]
  }
];
