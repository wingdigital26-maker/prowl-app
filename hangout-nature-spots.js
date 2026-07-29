// Hangout + Nature batch. Dallas core + Plano/75025 area (North Dallas suburbs). ids namespaced 301+.
// Curated per prowl-spot-curator taste. No duplicates with real-spots.js or plano-spots.js.
const HANGOUT_NATURE_SPOTS = [
  // ---------- HANGOUT (Dallas) ----------
  {
    id: 301,
    name: "Cidercade Dallas",
    reviewUrl: "https://www.google.com/maps/search/?api=1&query=Cidercade%20Dallas%20Dallas%20TX",
    cat: "hangout",
    lat: 32.8085, lng: -96.8480, zip: "75207",
    desc: "Design District arcade hall with 200 plus games on free play for one flat day pass, plus dozens of house made ciders on tap. Bring your own food or catch a food truck outside. Adults only after 9pm.",
    tags: ["arcade", "cider", "game-hall"],
    danger: 1,
    rating: 4.8,
    reviews: [
      { user: "pinballpete", stars: 5, text: "Twelve bucks and every machine is on free play. Ciders are legit too." },
      { user: "datenightdfw", stars: 5, text: "Best cheap date in Dallas. We closed the place down playing Killer Queen." }
    ]
  },
  {
    id: 302,
    name: "Dallas Farmers Market",
    reviewUrl: "https://www.google.com/maps/search/?api=1&query=Dallas%20Farmers%20Market%20Dallas%20TX",
    cat: "hangout",
    lat: 32.7768, lng: -96.7907, zip: "75201",
    desc: "Historic downtown market with an open air produce shed and The Market food hall packed with local vendors. Go Saturday morning, graze the stalls, grab tamales and kolaches and eat at the long tables.",
    tags: ["market", "food-hall", "weekends"],
    danger: 1,
    rating: 4.4,
    reviews: [
      { user: "marketmorning", stars: 5, text: "Saturday ritual. Peaches from the shed then empanadas inside. Perfect loop." },
      { user: "downtownhang", stars: 4, text: "Great mix of vendors and always something new. Gets busy by noon." }
    ]
  },
  {
    id: 303,
    name: "Katy Trail Ice House",
    reviewUrl: "https://www.google.com/maps/search/?api=1&query=Katy%20Trail%20Ice%20House%20Dallas%20TX",
    cat: "hangout",
    lat: 32.8035, lng: -96.8033, zip: "75201",
    desc: "Massive tree shaded beer garden opening right onto the Katy Trail, all picnic tables and string lights. Walk or bike the trail then roll straight in for a cold beer and a burger. Dogs everywhere, best on a sunny afternoon.",
    tags: ["beer-garden", "patio", "trail-side"],
    danger: 1,
    rating: 4.5,
    reviews: [
      { user: "trailandtap", stars: 5, text: "Finish a run on the Katy and walk straight to a beer. Elite system." },
      { user: "patiodog", stars: 4, text: "Huge shaded patio, every dog in Uptown is here on Saturdays. Love it." }
    ]
  },
  {
    id: 304,
    name: "Free Play Arcade Richardson",
    reviewUrl: "https://www.google.com/maps/search/?api=1&query=Free%20Play%20Arcade%20Richardson%20Richardson%20TX",
    cat: "hangout",
    lat: 32.9535, lng: -96.7108, zip: "75081",
    desc: "The original Free Play, a retro arcade bar with immaculately maintained cabinets from Galaga to modern pinball, all free play with admission. Craft beer and surprisingly good sandwiches. Weeknights are the move for shorter lines.",
    tags: ["arcade", "retro", "craft-beer"],
    danger: 1,
    rating: 4.8,
    reviews: [
      { user: "highscorehank", stars: 5, text: "Every cabinet actually works, which arcade people know is rare. Staff are fanatics." },
      { user: "richardsonnights", stars: 5, text: "The OG location still hits. Beer plus unlimited Galaga is a perfect night." }
    ]
  },

  // ---------- HANGOUT (Plano / North Dallas suburbs) ----------
  {
    id: 305,
    name: "The Boardwalk at Granite Park",
    reviewUrl: "https://www.google.com/maps/search/?api=1&query=The%20Boardwalk%20at%20Granite%20Park%20Plano%20TX",
    cat: "hangout",
    lat: 33.0995, lng: -96.8180, zip: "75024",
    desc: "Restaurant lined boardwalk wrapped around a pond right off 121, with fountains, patios and lawn games. Come at sunset, walk the water loop, then pick a patio for dinner or drinks. Live music most weekends.",
    tags: ["boardwalk", "patio", "waterfront"],
    danger: 1,
    rating: 4.6,
    reviews: [
      { user: "pondsidepatio", stars: 5, text: "Sunset over the pond with the fountains going is way prettier than it has any right to be." },
      { user: "121local", stars: 4, text: "Easy group hang. Everyone picks a different patio and you just float between them." }
    ]
  },
  {
    id: 306,
    name: "McCall Plaza",
    reviewUrl: "https://www.google.com/maps/search/?api=1&query=McCall%20Plaza%20Plano%20TX",
    cat: "hangout",
    lat: 33.0205, lng: -96.6975, zip: "75074",
    desc: "Small stage plaza in the heart of downtown Plano that anchors the historic strip on 15th Street. Free live concerts most weekends, surrounded by walkable bars and restaurants. Grab a drink nearby and post up for a show.",
    tags: ["plaza", "live-music", "downtown"],
    danger: 1,
    rating: 4.6,
    reviews: [
      { user: "15thstreet", stars: 5, text: "Free shows all the time and everything downtown is a two minute walk. Underrated night out." },
      { user: "planoevenings", stars: 4, text: "Cute little plaza. Best when a band is on and the patios around it fill up." }
    ]
  },
  {
    id: 307,
    name: "Pinstack Plano",
    reviewUrl: "https://www.google.com/maps/search/?api=1&query=Pinstack%20Plano%20Plano%20TX",
    cat: "hangout",
    lat: 33.0730, lng: -96.8235, zip: "75024",
    desc: "Upscale bowling and games hall on the Tollway with a full bar, laser tag, high ropes course and a two story arcade. Way nicer than it needs to be. Go with a group on a weeknight for cheaper lanes.",
    tags: ["bowling", "game-hall", "group-hang"],
    danger: 1,
    rating: 4.4,
    reviews: [
      { user: "strikesquad", stars: 4, text: "Bowling plus an actual good kitchen and bar. Group nights here always run long." },
      { user: "planoparty", stars: 5, text: "The ropes course above the arcade is wild. Something for literally everyone." }
    ]
  },

  // ---------- NATURE (Dallas) ----------
  {
    id: 308,
    name: "Trinity River Audubon Center",
    reviewUrl: "https://www.google.com/maps/search/?api=1&query=Trinity%20River%20Audubon%20Center%20Dallas%20TX",
    cat: "nature",
    lat: 32.7071, lng: -96.7176, zip: "75217",
    desc: "Gateway to the 6000 acre Great Trinity Forest, ten minutes from downtown, with boardwalks over wetlands and quiet river trails. Go early on a Saturday for early entry, bring binoculars, watch for otters and herons.",
    tags: ["wetlands", "birding", "boardwalk"],
    danger: 1,
    rating: 4.7,
    reviews: [
      { user: "heronwatcher", stars: 5, text: "Feels like a different planet from downtown. Boardwalk over the wetlands is so peaceful." },
      { user: "trailquiet", stars: 5, text: "Hidden gem for real. Saw an otter and about forty bird species in one morning." }
    ]
  },
  {
    id: 309,
    name: "Dallas Arboretum and Botanical Garden",
    reviewUrl: "https://www.google.com/maps/search/?api=1&query=Dallas%20Arboretum%20and%20Botanical%20Garden%20Dallas%20TX",
    cat: "nature",
    lat: 32.8236, lng: -96.7167, zip: "75218",
    desc: "Sixty six acres of gardens on the east shore of White Rock Lake with skyline views across the water. Spring tulip season and fall pumpkin village are the famous moments, but weekday mornings any season are blissfully empty.",
    tags: ["gardens", "lake-view", "seasonal"],
    danger: 1,
    rating: 4.7,
    reviews: [
      { user: "tuliptime", stars: 5, text: "Dallas Blooms in spring is unreal. Half a million tulips and the lake behind them." },
      { user: "gardenstroll", stars: 4, text: "Go on a weekday morning and you get whole gardens to yourself. Bring a picnic." }
    ]
  },
  {
    id: 310,
    name: "Katy Trail",
    reviewUrl: "https://www.google.com/maps/search/?api=1&query=Katy%20Trail%20Dallas%20TX",
    cat: "nature",
    lat: 32.8080, lng: -96.7990, zip: "75219",
    desc: "A 3.5 mile greenbelt built on an old rail line cutting through Uptown, canopied and separated from every street. Walk, run or bike from American Airlines Center to SMU. Golden hour turns the whole trail glowy.",
    tags: ["trail", "greenbelt", "urban"],
    danger: 1,
    rating: 4.8,
    reviews: [
      { user: "morningmiles", stars: 5, text: "Best running spot in the city, full stop. Shaded, smooth, and no cars ever." },
      { user: "uptownstroll", stars: 5, text: "Evening walks here are my therapy. Hop off at the Ice House for a reward beer." }
    ]
  },
  {
    id: 311,
    name: "Piedmont Ridge Trail",
    reviewUrl: "https://www.google.com/maps/search/?api=1&query=Piedmont%20Ridge%20Trail%20Dallas%20TX",
    cat: "nature",
    lat: 32.7440, lng: -96.6970, zip: "75217",
    desc: "Short rugged ridge trail above the Great Trinity Forest with one of the few real elevation overlooks in Dallas, a bluff view over the treetops toward the skyline. Quiet even on weekends. Wear real shoes, the limestone gets slick.",
    tags: ["overlook", "hiking", "hidden-gem"],
    danger: 1,
    rating: 4.6,
    reviews: [
      { user: "ridgerunner", stars: 5, text: "Actual elevation in Dallas. The bluff view over the forest surprised me." },
      { user: "solitudeseeker", stars: 4, text: "Never crowded. Feels wild for being inside the city limits." }
    ]
  },

  // ---------- NATURE (Plano / North Dallas suburbs) ----------
  {
    id: 312,
    name: "Arbor Hills Nature Preserve",
    reviewUrl: "https://www.google.com/maps/search/?api=1&query=Arbor%20Hills%20Nature%20Preserve%20Plano%20TX",
    cat: "nature",
    lat: 33.0430, lng: -96.8480, zip: "75093",
    desc: "Two hundred acres of prairie, forest and creek in west Plano with paved loops, dirt trails and an observation tower over the treetops. Climb the tower at sunset, then walk the creek on the natural trails. Arrive early on weekends, the lot fills.",
    tags: ["preserve", "trails", "sunset"],
    danger: 1,
    rating: 4.8,
    reviews: [
      { user: "towerclimber", stars: 5, text: "Sunset from the observation tower is the best free view in Plano." },
      { user: "creeksider", stars: 5, text: "The unpaved creek trails feel way wilder than the suburbs around them." }
    ]
  },
  {
    id: 313,
    name: "Oak Point Park and Nature Preserve",
    reviewUrl: "https://www.google.com/maps/search/?api=1&query=Oak%20Point%20Park%20and%20Nature%20Preserve%20Plano%20TX",
    photos: ["img/real/spot-313.jpg"],
    photoCredit: "Photo: Jackilometresan, CC0, via Wikimedia Commons",
    cat: "nature",
    lat: 33.0480, lng: -96.6620, zip: "75074",
    desc: "Plano's biggest park at 800 acres, with miles of paved and dirt trail along Rowlett Creek and a kayak launch on the pond. Rent a kayak in summer or bike the creek trail over to Bob Woodruff Park. Sunrise here is quiet and misty.",
    tags: ["preserve", "kayak", "creek"],
    danger: 1,
    rating: 4.7,
    reviews: [
      { user: "paddleplano", stars: 5, text: "Kayaking the pond at golden hour with egrets everywhere. Did not feel like Plano." },
      { user: "creektrail", stars: 4, text: "Endless trail miles. The dirt paths along Rowlett Creek are my favorite stretch." }
    ]
  },
  {
    id: 314,
    name: "Spring Creek Forest Preserve",
    reviewUrl: "https://www.google.com/maps/search/?api=1&query=Spring%20Creek%20Forest%20Preserve%20Garland%20TX",
    photos: ["img/real/spot-314.jpg"],
    photoCredit: "Photo: Robert Nunnally, CC BY 2.0, via Wikimedia Commons",
    cat: "nature",
    lat: 32.9770, lng: -96.6690, zip: "75044",
    desc: "A rare pocket of old growth forest in Garland with towering oaks along a clear limestone bottom creek, some trees centuries old. Short shaded trails, wildflowers in spring, and almost nobody around. Feels secret because it basically is.",
    tags: ["old-growth", "creek", "hidden-gem"],
    danger: 1,
    rating: 4.7,
    reviews: [
      { user: "oakhunter", stars: 5, text: "Trees this old should not exist inside the metroplex. Total hidden gem." },
      { user: "quietwalks", stars: 5, text: "Clear creek, huge canopy, empty trails. My reset button spot." }
    ]
  }
];

if (typeof module !== "undefined" && module.exports) { module.exports = HANGOUT_NATURE_SPOTS; }
