// Plano / ZIP 75025 batch. ids namespaced 201+.
// Categories this run: food, coffee, bar. Curated per prowl-spot-curator taste.
const PLANO_SPOTS = [
  // ---------- FOOD ----------
  {
    id: 201,
    reviewUrl: "https://www.yelp.com/biz/turan-uyghur-kitchen-plano",
    name: "Turan Uyghur Kitchen",
    cat: "food",
    lat: 33.0293, lng: -96.7690, zip: "75075",
    desc: "One of the only Uyghur spots in Texas, tucked in a Coit Road strip mall. Order the big plate chicken, a bone in stew over hand pulled flat noodles loaded with potato and peppers, easily enough for two.",
    tags: ["uyghur", "hidden-gem", "halal"],
    danger: 1,
    rating: 4.7,
    reviews: [
      { user: "noodlehunter", stars: 5, text: "Never had food like this. The big plate chicken is unreal and the noodles are made in house." },
      { user: "planolocal", stars: 5, text: "Hidden gem for real. Bring friends and share, portions are huge." }
    ]
  },
  {
    id: 202,
    reviewUrl: "https://www.yelp.com/biz/sugar-pine-creamery-plano",
    name: "Sugar Pine Creamery",
    cat: "food",
    lat: 33.0455, lng: -96.7692, zip: "75023",
    desc: "Family owned soft serve shop with creative flavors that rotate every couple weeks, made Top 25 ice cream spots in Texas. Not too sweet and always something new. Go on a warm evening.",
    tags: ["ice-cream", "dessert", "hidden-gem"],
    danger: 1,
    rating: 4.9,
    reviews: [
      { user: "sweettooth214", stars: 5, text: "The rotating flavors keep me coming back. Balanced and never too sugary." },
      { user: "coitrdmom", stars: 5, text: "Friendliest staff and the soft serve is the best in Plano." }
    ]
  },
  {
    id: 203,
    reviewUrl: "https://www.yelp.com/biz/bavarian-grill-plano",
    name: "Bavarian Grill",
    cat: "food",
    lat: 33.0455, lng: -96.7025, zip: "75023",
    desc: "A proper German beer hall with an indoor outdoor biergarten and one of the biggest German beer lists in Texas. Get the schnitzel or sausage sampler and a liter, live oompah music some nights.",
    tags: ["german", "biergarten", "live-music"],
    danger: 1,
    rating: 4.5,
    reviews: [
      { user: "steinsandsteins", stars: 5, text: "Feels like a trip to Munich. Schnitzel is huge and the beer list is no joke." },
      { user: "dfwfoodie", stars: 4, text: "Fun patio and the accordion nights are a blast. Come hungry." }
    ]
  },
  {
    id: 204,
    reviewUrl: "https://www.yelp.com/biz/oishii-sushi-and-pan-asian-cuisine-plano-plano",
    name: "Oishii Sushi and Pan-Asian",
    cat: "food",
    lat: 33.0895, lng: -96.8260, zip: "75024",
    desc: "West Plano sushi spot from chef Thanh Nguyen that locals call one of the best in the metroplex. Get the Sensei roll or a bowl of pho, quietly excellent and rarely crowded.",
    tags: ["sushi", "date-night", "hidden-gem"],
    danger: 1,
    rating: 4.4,
    reviews: [
      { user: "rollcall", stars: 5, text: "Sensei roll is my go to. Fresh fish and the chef clearly cares." },
      { user: "westplanoeats", stars: 4, text: "Sushi and pho under one roof and both are great. Underrated." }
    ]
  },
  {
    id: 205,
    reviewUrl: "https://www.yelp.com/biz/legacy-hall-plano-3",
    name: "Legacy Hall",
    cat: "food",
    lat: 33.0793, lng: -96.8270, zip: "75024",
    desc: "Three story European style food hall with 20 plus vendors, five bars and an in house brewery. Great for a group that cannot agree, graze across stalls and catch live music on the Box Garden stage.",
    tags: ["food-hall", "brewery", "live-music"],
    danger: 1,
    rating: 4.4,
    reviews: [
      { user: "grazergang", stars: 4, text: "Something for everyone. We hit three stalls and a beer flight and left happy." },
      { user: "legacywestfan", stars: 5, text: "Love the rooftop brewery and the live music downstairs. Solid hang." }
    ]
  },
  {
    id: 206,
    reviewUrl: "https://www.yelp.com/biz/jashan-indian-fine-dine-plano",
    name: "Jashan Indian Fine Dining",
    cat: "food",
    lat: 33.0835, lng: -96.8240, zip: "75024",
    desc: "Upscale Indian at Legacy North with a 16 course Dil Se tasting menu and wine pairings, one of the more ambitious meals for miles. Book ahead and go for the tasting if you want the full show.",
    tags: ["indian", "upscale", "date-night"],
    danger: 1,
    rating: 4.6,
    reviews: [
      { user: "tastingmenus", stars: 5, text: "The Dil Se tasting was a whole experience. Gorgeous room and thoughtful plates." },
      { user: "spicerouted", stars: 4, text: "Pricey but special occasion worthy. The pairings were spot on." }
    ]
  },

  // ---------- COFFEE ----------
  {
    id: 207,
    reviewUrl: "https://www.yelp.com/biz/coffee-del-rey-plano",
    name: "Coffee Del Rey",
    cat: "coffee",
    lat: 33.0375, lng: -96.6985, zip: "75075",
    desc: "Family owned roastery that roasts and grinds to order, beans sourced from farms in the Dominican and South America. Get the Del Rey latte or the cardamom latte, and grab a bag on the way out.",
    tags: ["roaster", "pour-over", "specialty"],
    danger: 1,
    rating: 4.9,
    reviews: [
      { user: "beanfreak", stars: 5, text: "You can taste the fresh roast. Del Rey latte is my favorite in Plano." },
      { user: "cardamomclub", stars: 5, text: "The cardamom latte is a little different and so good. Made with care." }
    ]
  },
  {
    id: 208,
    reviewUrl: "https://www.yelp.com/biz/local-good-coffee-plano-4",
    name: "Local Good Coffee Co.",
    cat: "coffee",
    lat: 33.0603, lng: -96.7195, zip: "75023",
    desc: "Roaster and community hub right in 75025 with pickleball courts, sand volleyball and green space out back. Good espresso, easy patio, and events most weekends. Great for a laptop morning or a social afternoon.",
    tags: ["roaster", "patio", "community"],
    danger: 1,
    rating: 4.7,
    reviews: [
      { user: "picklecoffee", stars: 5, text: "Coffee then pickleball then more coffee. Best combo in the neighborhood." },
      { user: "remoteworker", stars: 5, text: "Roomy patio and solid wifi. My regular work from anywhere spot." }
    ]
  },
  {
    id: 209,
    reviewUrl: "https://www.yelp.com/biz/lemma-coffee-co-plano",
    name: "Lemma Coffee Co.",
    cat: "coffee",
    lat: 33.0205, lng: -96.6960, zip: "75074",
    desc: "Downtown Plano roaster founded in 2017, known for a perfectly pulled cortado and creative specialty drinks. Cozy and design forward, a good study or meet a friend spot.",
    tags: ["roaster", "study-spot", "downtown"],
    danger: 1,
    rating: 4.6,
    reviews: [
      { user: "cortadolover", stars: 5, text: "Their cortado is dialed in. Beautiful little shop in old downtown." },
      { user: "studygrind", stars: 4, text: "Nice quiet corner to work. Rotating single origins are worth trying." }
    ]
  },
  {
    id: 210,
    reviewUrl: "https://www.yelp.com/biz/1418-coffee-house-plano",
    name: "1418 Coffeehouse",
    cat: "coffee",
    lat: 33.0206, lng: -96.6962, zip: "75074",
    desc: "Beloved cozy coffeehouse in historic downtown Plano with a homey neighborhood feel. Good drip, friendly regulars, easy to lose an afternoon here with a book.",
    tags: ["cozy", "study-spot", "downtown"],
    danger: 1,
    rating: 4.7,
    reviews: [
      { user: "downtownplano", stars: 5, text: "Feels like a friends living room. My favorite quiet spot to read." },
      { user: "dripdreams", stars: 4, text: "Unpretentious and warm. Great people watching on 15th Street." }
    ]
  },
  {
    id: 211,
    reviewUrl: "https://www.yelp.com/biz/little-gus-cafe-plano",
    name: "Little Gus Cafe",
    cat: "coffee",
    lat: 33.0468, lng: -96.7690, zip: "75023",
    desc: "A 21 year old breakfast and coffee institution in The Plaza on Legacy, serving home cooked plates all day starting at 6am. Counter seating, fresh coffee, and a menu locals swear by. Come for a slow morning.",
    tags: ["brunch", "all-day-breakfast", "study-spot"],
    danger: 1,
    rating: 4.3,
    reviews: [
      { user: "morningperson", stars: 4, text: "Been coming for years. Great coffee and the breakfast never misses." },
      { user: "plazaonlegacy", stars: 5, text: "Old school neighborhood cafe vibes. Friendly and consistent." }
    ]
  },

  // ---------- BAR ----------
  {
    id: 212,
    reviewUrl: "https://www.yelp.com/biz/haywire-plano",
    name: "Haywire",
    cat: "bar",
    lat: 33.0770, lng: -96.8265, zip: "75024",
    desc: "Three story Texas restaurant with a rooftop bar and sweeping Legacy West views. The 3rd floor rooftop does cigars and cocktails Friday and Saturday nights, and the whiskey list is deep. Best at golden hour.",
    tags: ["rooftop", "whiskey", "date-night"],
    danger: 1,
    rating: 4.5,
    reviews: [
      { user: "rooftopseeker", stars: 5, text: "Sunset from the third floor patio is unbeatable. Cocktails are strong." },
      { user: "whiskeyneat", stars: 4, text: "Huge allocated whiskey selection. Come early for the rooftop seats." }
    ]
  },
  {
    id: 213,
    reviewUrl: "https://www.yelp.com/biz/the-holy-grail-pub-plano",
    name: "The Holy Grail Pub",
    cat: "bar",
    lat: 33.0735, lng: -96.8030, zip: "75024",
    desc: "English style pub with a scratch kitchen and one of the biggest craft beer lists in the area. Come for the taps and the patio, stay for the fish and chips. Great low key weeknight beer spot.",
    tags: ["pub", "craft-beer", "patio"],
    danger: 1,
    rating: 4.5,
    reviews: [
      { user: "taphopper", stars: 5, text: "The beer list is enormous and the staff actually know it. Solid pub food too." },
      { user: "planopints", stars: 4, text: "Cozy patio and a proper pub feel. My regular for a pint after work." }
    ]
  },
  {
    id: 214,
    reviewUrl: "https://www.yelp.com/biz/union-bear-brewing-company-plano",
    name: "Union Bear Brewing Co.",
    cat: "bar",
    lat: 33.088, lng: -96.803, zip: "75024",
    desc: "Locally owned brewpub with a West Coast feel and chef driven American plates. Grab the West Coast IPA and the picnic platter, and dig into the deep whiskey list. Lively patio scene at Legacy West.",
    tags: ["brewery", "patio", "cocktails"],
    danger: 1,
    rating: 4.5,
    reviews: [
      { user: "hophead121", stars: 5, text: "West Coast IPA is the move. Food is way better than typical brewery grub." },
      { user: "patiopint", stars: 4, text: "Great happy hour and the patio fills up fast. Fun energy." }
    ]
  },
  {
    id: 215,
    reviewUrl: "https://www.yelp.com/biz/whiskey-moon-plano",
    name: "Whiskey Moon",
    cat: "bar",
    lat: 33.0785, lng: -96.8310, zip: "75024",
    desc: "A tucked away lounge inside the Renaissance hotel at Legacy West that most people walk right past. Chic and quiet with a deep whiskey and bourbon list and craft cocktails. Try the brisket flatbread with a pour.",
    tags: ["whiskey", "speakeasy", "hotel-lounge"],
    danger: 1,
    rating: 4.4,
    reviews: [
      { user: "hiddenlounge", stars: 5, text: "Feels like a secret. Calm room, serious whiskey list, great for a quiet date." },
      { user: "bourbonbound", stars: 4, text: "Nobody knows about it which is the appeal. Cocktails are well made." }
    ]
  },
  {
    id: 216,
    reviewUrl: "https://www.yelp.com/biz/rare-books-bar-frisco",
    name: "Rare Books Bar",
    cat: "bar",
    lat: 33.1219, lng: -96.8252, zip: "75034",
    desc: "A hidden speakeasy tucked inside J. Theodore in Frisco, with moody lighting, vintage decor and classic cocktails. Find the door and settle in for a proper Old Fashioned. Best on a slow weeknight.",
    tags: ["speakeasy", "cocktails", "date-night"],
    danger: 1,
    rating: 4.6,
    reviews: [
      { user: "secretdoor", stars: 5, text: "Took a minute to find the entrance and that is the fun. Classic cocktails done right." },
      { user: "oldfashionedguy", stars: 4, text: "Dark, cozy and low key. Great spot to actually hear each other talk." }
    ]
  },
  {
    id: 217,
    reviewUrl: "https://www.yelp.com/biz/ebb-and-flow-plano-2",
    name: "Ebb & Flow",
    cat: "bar",
    lat: 33.0800, lng: -96.8250, zip: "75024",
    desc: "Cocktail lounge at the Shops at Legacy that has won best patio and best brunch in Plano, with rock and roll on the speakers. Come for the patio and unique cocktails, stay for late night bites.",
    tags: ["cocktails", "patio", "late-night"],
    danger: 1,
    rating: 4.3,
    reviews: [
      { user: "patiocrew", stars: 4, text: "Best patio in Plano is a fair claim. Cocktails are creative and the vibe is fun." },
      { user: "brunchandbooze", stars: 5, text: "Great for weekend brunch that rolls into afternoon drinks." }
    ]
  }
];

if (typeof module !== "undefined" && module.exports) { module.exports = PLANO_SPOTS; }
