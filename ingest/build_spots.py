#!/usr/bin/env python3
"""Turn a researched spot JSON file into an app-ready spots file.

Usage:
    python build_spots.py <input.json> <OUT_CONST_NAME> <output.js> <start_id> [City ST]

Does three jobs the research agents should not be trusted to do themselves:
  1. Drops any spot whose name already exists in a *-spots.js file.
  2. Renumbers ids from start_id so batches never collide.
  3. Escapes quotes and strips em dashes, which Jack does not want anywhere.

Example:
    python build_spots.py plano_food.json PLANO_FOOD_SPOTS ../plano-food-spots.js 701 "Plano TX"
"""
import json, re, glob, os, sys, html
from urllib.parse import quote

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)


def norm(n):
    return re.sub(r"[^a-z0-9]", "", n.lower())


def plain(t):
    """Strip em dashes and smart quotes. Jack does not want em dashes anywhere.
    Also decodes HTML entities, which the research agents keep emitting."""
    t = html.unescape(t or "")
    for bad, good in [(" — ", ", "), (" – ", ", "), ("—", ", "), ("–", "-"),
                      ("’", "'"), ("‘", "'"), ("“", '"'), ("”", '"')]:
        t = t.replace(bad, good)
    t = re.sub(r"\s{2,}", " ", t)          # no doubled spaces from the swaps
    return re.sub(r"\s+([,.])", r"\1", t).strip()


def clean(t):
    """plain() plus escaping so it is safe inside a double-quoted JS string."""
    return plain(t).replace("\\", "\\\\").replace('"', '\\"')


def existing_names():
    seen = set()
    for f in glob.glob(os.path.join(ROOT, "*-spots.js")):
        for m in re.finditer(r'name:\s*"([^"]+)"', open(f, encoding="utf-8").read()):
            seen.add(norm(m.group(1)))
    return seen


def block(s, sid, place):
    revs = ",\n".join(
        '      { user: "%s", stars: %d, text: "%s" }' % (clean(r["user"]), int(r["stars"]), clean(r["text"]))
        for r in s.get("reviews", []))
    url = "https://www.google.com/maps/search/?api=1&query=" + quote(plain(s["name"]) + " " + place)
    return (
        "  {\n"
        '    id: %d, name: "%s", cat: "%s",\n'
        '    reviewUrl: "%s",\n'
        '    lat: %s, lng: %s, zip: "%s",\n'
        '    desc: "%s",\n'
        "    tags: %s, danger: %d, rating: %s,\n"
        "    reviews: [\n%s\n    ]\n  }"
    ) % (sid, clean(s["name"]), s["cat"], url, s["lat"], s["lng"], s.get("zip", ""),
         clean(s["desc"]), json.dumps([clean(t) for t in s.get("tags", [])]),
         int(s.get("danger", 1)), s.get("rating", "null"), revs)


def main():
    if len(sys.argv) < 5:
        sys.exit(__doc__)
    src, const, out, start = sys.argv[1], sys.argv[2], sys.argv[3], int(sys.argv[4])
    place = sys.argv[5] if len(sys.argv) > 5 else "TX"

    spots = json.load(open(os.path.join(HERE, src) if not os.path.isabs(src) else src, encoding="utf-8"))
    seen = existing_names()
    keep, drop = [], []
    for s in spots:
        key = norm(s["name"])
        if key in seen:
            drop.append(s["name"])
        else:
            seen.add(key)          # also dedupes within this batch
            keep.append(s)

    print("dropped as duplicates (%d): %s" % (len(drop), ", ".join(drop) or "none"))
    print("keeping: %d" % len(keep))

    body = ",\n".join(block(s, start + i, place) for i, s in enumerate(keep))
    path = out if os.path.isabs(out) else os.path.join(ROOT, out)
    open(path, "w", encoding="utf-8").write(
        "// AUTO-BUILT by ingest/build_spots.py. Independent, highly rated, no chains.\n"
        "// ids namespaced %d+. Deduped against every existing spot file.\n"
        "const %s = [\n%s\n];\n" % (start, const, body))
    print("wrote %s with %d spots" % (path, len(keep)))


if __name__ == "__main__":
    main()
