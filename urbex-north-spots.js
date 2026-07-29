// Prowl - NEW legal, publicly-accessible urbex / ghost-town spots across Fort Worth
// and the North Texas ghost-town + historic-ruin belt.
// Schema: { id, name, cat, reviewUrl, lat, lng, zip, desc, tags, danger, rating, reviews:[{user,stars,text}] }
// danger: 1 public/easy, 2-3 rougher or view-only ruins, 4-5 real risk. Honest ratings.
// STRICT: only real, LEGAL, publicly-viewable places. No trespassing spots. Sources + legality in urbex-north-notes.md.
// ids start at 515 (513/514 intentionally skipped).

const URBEX_NORTH_SPOTS = [
  {
    id: 515, name: "Fort Worth Power & Light Plant (Trinity Trails view)", cat: "abandoned",
    reviewUrl: "https://www.google.com/maps/search/?api=1&query=Fort%20Worth%20Power%20and%20Light%20Plant%20North%20Main",
    lat: 32.7602, lng: -97.3352, zip: "76164",
    desc: "A hulking 1912 industrial power station with twin 265 foot smokestacks looming on the bluff over the Trinity River just north of downtown Fort Worth, decommissioned since 2004 and now city-protected as a historic landmark. This is a view-from-public-land spot only, so shoot it through the fence from the Trinity Trails or across the water at Panther Island, never an entry. Go in daylight, bring a friend, and stay on the public trail side of the fence.",
    tags: ["industrial", "view-only", "trinity"], danger: 3, rating: 4.5,
    reviews: [
      { user: "smokestacksam", stars: 5, text: "Those two towers over the river are unreal from the trail. Great decay photos without going in." },
      { user: "trinitytrek", stars: 4, text: "Shot it from the paved trail, all legal and easy. Do not try the fence, it is posted and rough inside." }
    ]
  },
  {
    id: 516, name: "Mineral Wells Fossil Park", cat: "nature",
    reviewUrl: "https://www.google.com/maps/search/?api=1&query=Mineral%20Wells%20Fossil%20Park%20Indian%20Creek%20Road",
    lat: 32.8257, lng: -98.1904, zip: "76067",
    desc: "A free public fossil park carved out of an old borrow pit off Indian Creek Road, a barren eroded moonscape of gray shale where you can dig and keep 300 million year old sea fossils. Genuinely one of the few places in the US where collecting is legal and free, open daily 8am to dusk. Bring water, knee pads, and a bag, and go early in summer before the shale bakes.",
    tags: ["public", "fossils", "free"], danger: 1, rating: 4.6,
    reviews: [
      { user: "shalehound", stars: 5, text: "Alien gray badlands and you get to keep everything you find. Kids and photographers both love it." },
      { user: "diggerdana", stars: 4, text: "Totally free and legal to collect. Zero shade though, so hit it at sunrise or sunset." }
    ]
  },
  {
    id: 517, name: "Famous Mineral Water Company Pavilion", cat: "hangout",
    reviewUrl: "https://www.google.com/maps/search/?api=1&query=Famous%20Mineral%20Water%20Company%20Mineral%20Wells",
    lat: 32.8136, lng: -98.1142, zip: "76067",
    desc: "The last working mineral-water pavilion in downtown Mineral Wells, bottling the famous Crazy Water since 1904 in a room that feels frozen in the early 1900s. Fully public and free to walk into, the staff pour you samples of each water level and tell the town's boom-and-bust story. Pair it with a stroll past the empty historic storefronts and the towering Baker Hotel a few blocks away.",
    tags: ["public", "historic", "downtown"], danger: 1, rating: 4.5,
    reviews: [
      { user: "crazywaterkid", stars: 5, text: "Stepping inside is like time travel to 1910. Free samples and a wild local history." },
      { user: "wellswanderer", stars: 4, text: "Real piece of living history downtown. Easy legal stop before you gawk at the Baker Hotel." }
    ]
  },
  {
    id: 518, name: "Fort Richardson State Park Ruins", cat: "abandoned",
    reviewUrl: "https://www.google.com/maps/search/?api=1&query=Fort%20Richardson%20State%20Park%20Jacksboro",
    lat: 33.2221, lng: -98.1463, zip: "76458",
    desc: "An 1867 frontier army fort preserved inside a state historic park just south of Jacksboro, with seven restored original buildings plus the raw stone ruins of the ones the elements took. Legal, safe, and photogenic, you walk right up to the old morgue, powder magazine, and collapsed foundations. Small state park entry fee applies and the historic buildings open on weekends.",
    tags: ["public", "historic", "ruins"], danger: 1, rating: 4.6,
    reviews: [
      { user: "frontierframe", stars: 5, text: "Real 1860s fort ruins you can legally walk into. The old stone morgue and magazine are haunting." },
      { user: "jackcojen", stars: 4, text: "Inside a state park so it is safe and open. Restored buildings plus honest crumbling ruins." }
    ]
  },
  {
    id: 519, name: "Spanish Fort Ghost Town", cat: "abandoned",
    reviewUrl: "https://www.google.com/maps/search/?api=1&query=Spanish%20Fort%20Texas%20Montague%20County",
    lat: 33.9447, lng: -97.6187, zip: "76255",
    desc: "A near-vanished community at the dead end of FM 103 a mile south of the Red River, once a fortified Taovaya village and later a wild cattle-trail town that faded to almost nothing. Drive the public roads past the weathered old store, church, and scattered remnants for a true edge-of-nowhere ghost-town feel. The buried archaeological site itself is private, so keep to the public road and go in daylight with a friend.",
    tags: ["public", "ghost-town", "roadside"], danger: 2, rating: 4.2,
    reviews: [
      { user: "redriverroamer", stars: 5, text: "End of the road, middle of nowhere, and soaked in history. Perfect lonely ghost-town drive." },
      { user: "fm103fan", stars: 4, text: "Stay on the road, the dig site is private. Still a great weathered stop way up on the Red River." }
    ]
  },
  {
    id: 520, name: "Belcherville Ghost Town", cat: "abandoned",
    reviewUrl: "https://www.google.com/maps/search/?api=1&query=Belcherville%20Texas%20ghost%20town",
    lat: 33.8026, lng: -97.8323, zip: "76251",
    desc: "A collapsed 1880s rail and cotton town on US 82 that once had 1,200 people and 51 businesses, now down to the old post office, the cemetery, and crumbling storefronts glimpsed from the highway. Much of the old downtown is fenced and posted No Trespassing, so view and photograph it from the public road and visit the open cemetery only. Go in daylight, bring a friend, and do not cross any fence line.",
    tags: ["ghost-town", "roadside", "view-only"], danger: 2, rating: 4.1,
    reviews: [
      { user: "us82drifter", stars: 4, text: "Ghost of a whole cotton town right off the highway. Great weathered brick from the roadside." },
      { user: "cemeteryscout", stars: 4, text: "Downtown is fenced and posted so stay on the road. The old cemetery is open and worth a walk." }
    ]
  },
  {
    id: 521, name: "Fort Belknap Historic Site", cat: "abandoned",
    reviewUrl: "https://www.google.com/maps/search/?api=1&query=Fort%20Belknap%20Historic%20Site%20Newcastle%20Texas",
    lat: 33.1508, lng: -98.7412, zip: "76372",
    desc: "An 1851 frontier fort near Newcastle, mostly dismantled over the years and then rebuilt on its original stone foundations, with the surviving powder magazine and corn house standing among reconstructed barracks. Free admission and open most days, you can wander the old stone buildings and grounds legally and at your own pace. It is a quiet, low-traffic site, so bring a friend and go during daytime hours.",
    tags: ["public", "historic", "free"], danger: 1, rating: 4.4,
    reviews: [
      { user: "belknapbound", stars: 5, text: "Free, open, and full of real frontier stonework. The original powder magazine is the highlight." },
      { user: "youngcojo", stars: 4, text: "Quiet little historic fort you can walk right through. Bring someone, it is way out in the country." }
    ]
  }
];

if (typeof module !== "undefined" && module.exports) { module.exports = URBEX_NORTH_SPOTS; }
