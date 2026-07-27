#!/bin/bash
S=/c/Users/wjack/.claude/skills/image-generation/scripts/xai.sh
declare -A P=(
[1]="interior of a massive abandoned brick textile mill, second floor, colorful graffiti murals on walls, golden hour light beaming through busted skylights, dusty air, shot on a phone, gritty candid urbex photo, no people"
[2]="rusted old water tower against a dawn sky, catwalk railing in foreground overlooking a river floodplain, moody sunrise colors, candid phone photo, urbex aesthetic, no people"
[3]="grassy ledge overlooking a lit-up city skyline at night, city park over a freeway, string of distant headlights, candid gen-z phone photo vibe, no people"
[4]="top floor of an empty parking garage at night, downtown skyline lights in background, wet concrete reflections, candid phone photo, moody blue tones, no people"
[5]="inside a large concrete storm drain tunnel, walls covered in graffiti, ring of daylight at the far end, phone flash photo aesthetic, urbex, no people"
[6]="hidden creek bend with a rope swing hanging from a big oak tree, small rock beach, dappled summer sunlight, candid phone photo, no people"
[7]="ruins of a collapsed drive-in theater screen at dusk, orange and purple sunset sky, empty gravel lot, nostalgic phone photo, no people"
[8]="inside a semi-abandoned warehouse with a DIY wooden skate mini ramp, sunbeams through high windows, stickers and spray paint, candid phone photo, no people"
[9]="field of tall concrete highway pillars under an overpass, every pillar covered in colorful street art murals, late afternoon light, phone photo, no people"
[10]="grassy hill under tall decommissioned radio antenna towers at night, starry sky, silhouettes of the towers, long exposure phone photo, no people"
[11]="gutted abandoned 8 story hotel interior, ballroom with peeling paint and a hanging chandelier mount, dramatic window light, urbex phone photo, no people"
[12]="shaded concrete area under a rail bridge by a levee trail, small stone fire pit, hammock hooks in steel beams, warm evening light, candid phone photo, no people"
)
for i in $(seq 1 12); do
  out=/c/Users/wjack/creative-tools/haunt/img/spot-$i.png
  [ -f "$out" ] && continue
  bash "$S" --mode generate --prompt "${P[$i]}" --aspect-ratio 1:1 --output "$out" || echo "FAIL $i"
done
echo DONE
