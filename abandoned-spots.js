// Prowl - abandoned / urbex spots across Dallas-Fort Worth + Plano metroplex.
// Schema: { id, name, cat, lat, lng, zip, desc, tags, danger, rating, reviews:[{user,stars,text}] }
// danger: 1-2 public/easy, 3 moderate, 4-5 private/sketchy (trespassing risk). Honest ratings.
// Sources + PUBLIC vs PRIVATE breakdown in abandoned-notes.md. ids start at 501.

const ABANDONED_SPOTS = [
  {
    id: 501, name: "Baker Hotel (Mineral Wells)", cat: "abandoned",
    reviewUrl: "https://www.google.com/maps/search/?api=1&query=Baker%20Hotel%20Mineral%20Wells",
    lat: 32.8094, lng: -98.1114, zip: "76067",
    desc: "Fourteen story 1929 spa hotel that hosted Clark Gable and Judy Garland, empty since 1972 and looming over tiny Mineral Wells about an hour west of Fort Worth. The interior is fenced, posted, and under active restoration, so shoot the facade from the public sidewalk only. Go in daylight, bring a friend, and respect the fences, do not try to get inside.",
    tags: ["private", "historic", "trespassing-risk"], danger: 4, rating: 4.6,
    reviews: [
      { user: "spahotelsam", stars: 5, text: "Even from the street this thing is jaw dropping. Fourteen stories of old ghosts." },
      { user: "wellsroamer", stars: 4, text: "Fenced off and guarded now with the rebuild, but the outside alone is worth the drive." }
    ]
  },
  {
    id: 502, name: "Kimbell Milling Grain Silos", cat: "abandoned",
    reviewUrl: "https://www.google.com/maps/search/?api=1&query=1930%20S%20Main%20St%20Fort%20Worth%20grain%20silos",
    lat: 32.7250, lng: -97.3305, zip: "76104",
    desc: "Century old concrete grain elevators towering 180 feet over South Main in Fort Worth, art deco skeletons that have sat empty for over a decade and may face demolition. Genuinely dangerous, a man fell into one of these silos, so this is a view it and photograph it from the fence spot, never an enter it spot. Go in daylight, bring a friend, and stay outside the property line.",
    tags: ["private", "industrial", "trespassing-risk"], danger: 5, rating: 4.4,
    reviews: [
      { user: "concretecathedral", stars: 5, text: "The scale is unreal, like a ruined cathedral of concrete over Main Street." },
      { user: "fwrust", stars: 4, text: "Shot it from the road. Do not climb these, people have been badly hurt in there." }
    ]
  },
  {
    id: 503, name: "Swift Meat Packing Ruins", cat: "abandoned",
    reviewUrl: "https://www.google.com/maps/search/?api=1&query=Swift%20packing%20plant%20ruins%20Fort%20Worth%20Stockyards",
    lat: 32.7915, lng: -97.3480, zip: "76164",
    desc: "Crumbling brick and concrete remains of the Swift meatpacking empire that ran the Fort Worth Stockyards from 1902 to 1971, perched on the bluff above Marine Creek. Parts of the district have been redeveloped but the old ruins are raw, gritty, and photogenic. Some sections are posted private, so stick to publicly viewable areas. Go in daylight, bring a friend, and respect the property.",
    tags: ["private", "industrial", "ruins"], danger: 3, rating: 4.5,
    reviews: [
      { user: "stockyardstan", stars: 5, text: "Old packing plant bones right above the creek. Feels like a lost city up there." },
      { user: "bricksandbeef", stars: 4, text: "Great texture for photos. Watch the posted signs, some of it is fenced off." }
    ]
  },
  {
    id: 504, name: "Dallas Underground Pedestrian Tunnels", cat: "tunnel",
    reviewUrl: "https://www.google.com/maps/search/?api=1&query=Thanks-Giving%20Square%20Dallas%20tunnels",
    lat: 32.7830, lng: -96.7980, zip: "75201",
    desc: "A three mile labyrinth of climate controlled tunnels and skybridges threading under 36 downtown blocks, built in 1969 and now eerily half empty with shuttered shops and flickering corridors. Fully legal to wander on weekdays during business hours, enter near Thanks-Giving Square, One Main Place, or Renaissance Tower. Closed evenings and weekends, so go on a weekday.",
    tags: ["public", "underground", "downtown"], danger: 2, rating: 4.2,
    reviews: [
      { user: "tunnelrat_d", stars: 5, text: "A dead mall underground that almost nobody knows about. Wonderfully liminal." },
      { user: "downtowndrift", stars: 4, text: "Half the storefronts are empty which makes it creepier. Go on a weekday or its locked." }
    ]
  },
  {
    id: 505, name: "Old Dallas High School (Crozier Tech)", cat: "abandoned",
    reviewUrl: "https://www.google.com/maps/search/?api=1&query=Old%20Dallas%20High%20School%20Crozier%20Tech",
    lat: 32.7875, lng: -96.7920, zip: "75201",
    desc: "The oldest high school building in Dallas, a 1907 Classical Revival hulk that sat abandoned and rotting downtown for two decades before a recent office renovation. The Dallas High School lettering is still carved over the doors. Fully public to view and photograph from the street and its patio plaza, a legal way to shoot a building with a long decayed history.",
    tags: ["public", "historic", "downtown"], danger: 1, rating: 4.4,
    reviews: [
      { user: "chalkdust", stars: 5, text: "Loved it derelict, still love the old carved lettering over the doors. Real history." },
      { user: "eastwick", stars: 4, text: "Cleaned up now but the bones and the story are all there. Easy legal photo stop." }
    ]
  },
  {
    id: 506, name: "Thurber Ghost Town", cat: "abandoned",
    reviewUrl: "https://www.google.com/maps/search/?api=1&query=Thurber%20Texas%20ghost%20town",
    lat: 32.5054, lng: -98.3878, zip: "76458",
    desc: "A coal and brick company town that peaked near 10,000 people in 1920 and emptied out to almost nothing, about 75 minutes west of Fort Worth off I-20. The 128 foot smokestack still stands and the old cemetery holds around 1,000 graves. Drive through freely, stop at the historic markers and the little museum, all public and roadside.",
    tags: ["public", "ghost-town", "historic"], danger: 1, rating: 4.6,
    reviews: [
      { user: "smokestackscout", stars: 5, text: "That lone smokestack over an empty valley is haunting. Easy drive up off I-20." },
      { user: "graveyardgail", stars: 4, text: "The cemetery on the hill is the real draw. Whole town just vanished." }
    ]
  },
  {
    id: 507, name: "Stony Ghost Town", cat: "abandoned",
    reviewUrl: "https://www.google.com/maps/search/?api=1&query=Stony%20Texas%20ghost%20town%20schoolhouse",
    lat: 33.2200, lng: -97.3500, zip: "76247",
    desc: "A near vanished 1884 settlement in northwest Denton County where the restored Old Stony schoolhouse still stands off US 380. Quiet, rural, and easy to reach, you drive right up to it. All roadside and public, best in low golden hour light with the empty fields around it.",
    tags: ["public", "ghost-town", "roadside"], danger: 1, rating: 4.3,
    reviews: [
      { user: "backroadbecca", stars: 5, text: "The old stone schoolhouse alone in the fields is a perfect North Texas ghost shot." },
      { user: "fm156fan", stars: 4, text: "Blink and you miss it, but the schoolhouse is worth the little detour." }
    ]
  },
  {
    id: 508, name: "Drop Ghost Town", cat: "abandoned",
    reviewUrl: "https://www.google.com/maps/search/?api=1&query=Drop%20Texas%20ghost%20town",
    lat: 33.3000, lng: -97.5300, zip: "76078",
    desc: "A tiny faded farming community on FM 156 north of Fort Worth, marked now by the old Drop school building and a weathered general store at the corner of FM 1384 and Oliver Creek Road. Nothing gated, just a drive through slice of vanished rural Texas. All public roadside, go in daylight and respect the private homes nearby.",
    tags: ["public", "ghost-town", "roadside"], danger: 1, rating: 4.1,
    reviews: [
      { user: "twolane_tom", stars: 4, text: "Barely a dot on the map but the old store and school are great weathered wood." },
      { user: "ruralruins", stars: 4, text: "Fun little back roads stop. Do not bug the folks who still live out there." }
    ]
  },
  {
    id: 509, name: "Ed Young's Petrified Wood Store (Glen Rose)", cat: "abandoned",
    reviewUrl: "https://www.google.com/maps/search/?api=1&query=petrified%20wood%20building%20Glen%20Rose%20Texas",
    lat: 32.2320, lng: -97.7550, zip: "76043",
    desc: "A wild little abandoned building near Glen Rose built entirely from chunks of petrified wood, once a Prohibition era spot to buy moonshine. Weird, textural, and unlike anything else out there. It sits on private land, so view and shoot it from the roadside only. Go in daylight, bring a friend, and do not step onto the property.",
    tags: ["private", "roadside", "historic"], danger: 2, rating: 4.2,
    reviews: [
      { user: "petrifiedpete", stars: 5, text: "A whole building made of petrified wood with a moonshine past. So strange and cool." },
      { user: "dinovalley", stars: 4, text: "Shot it from the road. Odd little roadside relic, worth a stop near Glen Rose." }
    ]
  },
  {
    id: 510, name: "Continental Avenue Bridge", cat: "abandoned",
    reviewUrl: "https://www.google.com/maps/search/?api=1&query=Continental%20Avenue%20Bridge%20Dallas",
    lat: 32.7825, lng: -96.8265, zip: "75212",
    desc: "A 1930s automobile bridge over the Trinity River decommissioned from traffic and reborn as a pedestrian deck, all old concrete arches with the skyline and the wild river bottoms below. Free, open, and fully public. Best at dusk when the empty floodplain and the towers light up together.",
    tags: ["public", "bridge", "trinity"], danger: 1, rating: 4.6,
    reviews: [
      { user: "trinitytread", stars: 5, text: "Old car bridge turned walkway with the best skyline and river bottom view in town." },
      { user: "archangler", stars: 4, text: "Go at sunset. The empty river floodplain under it feels post apocalyptic." }
    ]
  },
  {
    id: 511, name: "Penn Farm (Cedar Hill State Park)", cat: "abandoned",
    reviewUrl: "https://www.google.com/maps/search/?api=1&query=Penn%20Farm%20Cedar%20Hill%20State%20Park",
    lat: 32.6180, lng: -96.9760, zip: "75104",
    desc: "A preserved 1800s homestead inside Cedar Hill State Park, a cluster of weathered gray barns, pens, and rusted farm equipment left standing in the fields by Joe Pool Lake. Legal, safe, and gorgeous, it is one of the best places in the metroplex to shoot decayed wood without any trespassing risk. State park entry fee applies.",
    tags: ["public", "farm", "ruins"], danger: 1, rating: 4.7,
    reviews: [
      { user: "barnlight", stars: 5, text: "Silver weathered barns in the tall grass, totally legal to walk right up. Photo heaven." },
      { user: "joepooljen", stars: 4, text: "Inside a state park so its safe and open. The old equipment is beautifully rusted." }
    ]
  },
  {
    id: 512, name: "Old Alton Bridge (Goatman's Bridge)", cat: "abandoned",
    reviewUrl: "https://www.google.com/maps/search/?api=1&query=Old%20Alton%20Bridge%20Goatmans%20Bridge%20Denton",
    lat: 33.1372, lng: -97.0522, zip: "76226",
    desc: "An 1884 iron truss bridge in the woods south of Denton, decommissioned, rusting, and soaked in the local Goatman legend that makes it one of the most photographed haunted spots in North Texas. Public trail access and free. It is secluded, so go in daylight and bring a friend rather than chasing the ghost story after dark.",
    tags: ["public", "bridge", "haunted"], danger: 2, rating: 4.5,
    reviews: [
      { user: "goatmangone", stars: 5, text: "Rusty old iron bridge deep in the trees. Creepy in the best way, super photogenic." },
      { user: "dentondayhiker", stars: 4, text: "Great in daylight. Gets genuinely eerie and dark out there at night, go with people." }
    ]
  }
];
