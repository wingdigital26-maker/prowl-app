// Plano round 3. Independent, highly rated, real social buzz. No chains.
// ids namespaced 601+. Deduped against every existing spot file.
const PLANO_MORE_SPOTS = [
  {
    id: 601, name: "Rye Craft Food & Drink", cat: "food",
    reviewUrl: "https://www.google.com/maps/search/?api=1&query=Rye%20Craft%20Food%20%26%20Drink%20Plano%20TX",
    lat: 33.0198, lng: -96.6968, zip: "75074",
    desc: "Chef driven New American spot on the brick streets of downtown Plano with an open kitchen and a bar that takes its rye seriously. Get the crispy chicken or whatever the seasonal fish is, and let the bartender pick a cocktail for you. Go on a weeknight around 7 so you can actually sit at the bar.",
    tags: ["chefy", "cocktails", "downtown"], danger: 1, rating: 4.6,
    reviews: [
      { user: "marisolgoes", stars: 5, text: "Sat at the bar alone and left with two new drink obsessions." },
      { user: "deven.eats", stars: 4, text: "Small menu but everything on it is dialed in." }
    ]
  },
  {
    id: 602, name: "Jorgs Cafe Vienna", cat: "food",
    reviewUrl: "https://www.google.com/maps/search/?api=1&query=Jorgs%20Cafe%20Vienna%20Plano%20TX",
    lat: 33.0197, lng: -96.6972, zip: "75074",
    desc: "A genuinely weird and wonderful Austrian house in downtown Plano that has been doing schnitzel and strudel for decades. Order the wiener schnitzel with a Stiegl and finish with apple strudel. Weekend dinner gets loud and packed, so book ahead or come early.",
    tags: ["austrian", "oldschool", "schnitzel"], danger: 1, rating: 4.6,
    reviews: [
      { user: "kbrennan", stars: 5, text: "Feels like a grandmother dining room in the best way." },
      { user: "noodlefiend22", stars: 5, text: "The strudel alone is worth the drive." }
    ]
  },
  {
    id: 603, name: "Mango Thai Cuisine", cat: "food",
    reviewUrl: "https://www.google.com/maps/search/?api=1&query=Mango%20Thai%20Cuisine%20Plano%20TX",
    lat: 33.0247, lng: -96.8043, zip: "75093",
    desc: "Strip mall Thai in West Plano that punches way above the parking lot it sits in. The panang curry and the crispy pad see ew are the moves, and yes you can ask for real Thai spicy. Lunch is fast and cheap, dinner is where the curries shine.",
    tags: ["thai", "stripmall", "curry"], danger: 1, rating: 4.5,
    reviews: [
      { user: "pimchanok.d", stars: 5, text: "Actually tastes like home, not sweetened down." },
      { user: "tyrelll", stars: 4, text: "Ask for Thai hot and mean it." }
    ]
  },
  {
    id: 604, name: "Sushi Marquee", cat: "food",
    reviewUrl: "https://www.google.com/maps/search/?api=1&query=Sushi%20Marquee%20Plano%20TX",
    lat: 33.0199, lng: -96.6963, zip: "75074",
    desc: "Dark, loud, neon sushi room in downtown Plano that leans more party than purist. Specialty rolls and the sashimi platters are the draw, and happy hour is where the value is. Come early evening if you want to hear your friends talk.",
    tags: ["sushi", "neon", "happyhour"], danger: 1, rating: 4.5,
    reviews: [
      { user: "lil.omakase", stars: 5, text: "Happy hour rolls are absurdly good for the price." },
      { user: "rey.torres", stars: 4, text: "Vibe is a whole night out, not just dinner." }
    ]
  },
  {
    id: 605, name: "The Fillmore Pub", cat: "bar",
    reviewUrl: "https://www.google.com/maps/search/?api=1&query=The%20Fillmore%20Pub%20Plano%20TX",
    lat: 33.0198, lng: -96.6976, zip: "75074",
    desc: "Independent Irish style pub that has anchored downtown Plano since 2007, all dark wood and regulars who know the bartender. Craft cocktails are legit but the rotating local drafts are why people stay. Live music nights get shoulder to shoulder, so grab a booth early.",
    tags: ["pub", "livemusic", "drafts"], danger: 1, rating: 4.5,
    reviews: [
      { user: "barstool.bri", stars: 5, text: "The kind of bar where you go for one and leave at close." },
      { user: "connor.mk", stars: 4, text: "Bartenders remember your drink after two visits." }
    ]
  },
  {
    id: 606, name: "Russell Creek Park", cat: "nature",
    reviewUrl: "https://www.google.com/maps/search/?api=1&query=Russell%20Creek%20Park%20Plano%20TX",
    lat: 33.08, lng: -96.766, zip: "75025",
    desc: "North Plano big open green space with shaded creek trail, disc golf, sand volleyball and fields that fill with pickup games on weekends. Bring a disc or a ball and you will find someone to play with. Evenings under the tree line are the best part.",
    tags: ["discgolf", "volleyball", "shaded"], danger: 1, rating: 4.6,
    reviews: [
      { user: "discdad", stars: 5, text: "Disc golf course here is way better than it has any right to be." },
      { user: "jaz.mn", stars: 4, text: "Perfect sunset picnic spot, tons of shade." }
    ]
  },
  {
    id: 607, name: "Heritage Farmstead Museum", cat: "hangout",
    reviewUrl: "https://www.google.com/maps/search/?api=1&query=Heritage%20Farmstead%20Museum%20Plano%20TX",
    photos: ["img/real/spot-607.jpg"],
    photoCredit: "Photo: Carol M. Highsmith, public domain, via Library of Congress",
    lat: 33.0245, lng: -96.716, zip: "75075",
    desc: "An actual 1891 Victorian farmstead sitting in the middle of Plano with goats, sheep, a windmill and the original house. Take the guided house tour, then wander the grounds and meet the animals. Cool mornings and their seasonal evening events are when it is at its best.",
    tags: ["historic", "animals", "weird"], danger: 1, rating: 4.6,
    reviews: [
      { user: "olive.hist", stars: 5, text: "Had no idea this was hiding on 15th Street. Goats included." },
      { user: "pk.reyes", stars: 4, text: "Tour guide clearly loves this place. Charming as hell." }
    ]
  }
];
