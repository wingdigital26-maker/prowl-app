#!/usr/bin/env python3
"""Turn a researched spot JSON into an app-ready spots file, deduped.

Reads ingest/plano_round3.json, drops anything whose name already exists in any
*-spots.js, renumbers ids from 601, and writes plano-more-spots.js.
"""
import json, re, glob, os
from urllib.parse import quote

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)

def norm(n):
    return re.sub(r"[^a-z0-9]", "", n.lower())

existing = set()
for f in glob.glob(os.path.join(ROOT, "*-spots.js")):
    txt = open(f, encoding="utf-8").read()
    for m in re.finditer(r'name:\s*"([^"]+)"', txt):
        existing.add(norm(m.group(1)))

spots = json.load(open(os.path.join(HERE, "plano_round3.json"), encoding="utf-8"))
keep, drop = [], []
for s in spots:
    (drop if norm(s["name"]) in existing else keep).append(s)

print("dropped as duplicates:", ", ".join(d["name"] for d in drop) or "none")
print("keeping:", len(keep))

def block(s, sid):
    revs = ",\n".join(
        '      { user: "%s", stars: %d, text: "%s" }' % (r["user"], r["stars"], r["text"])
        for r in s["reviews"])
    url = "https://www.google.com/maps/search/?api=1&query=" + quote(s["name"] + " Plano TX")
    return (
        "  {\n"
        '    id: %d, name: "%s", cat: "%s",\n'
        '    reviewUrl: "%s",\n'
        '    lat: %s, lng: %s, zip: "%s",\n'
        '    desc: "%s",\n'
        "    tags: %s, danger: 1, rating: %s,\n"
        "    reviews: [\n%s\n    ]\n  }"
    ) % (sid, s["name"], s["cat"], url, s["lat"], s["lng"], s["zip"],
         s["desc"], json.dumps(s["tags"]), s["rating"], revs)

body = ",\n".join(block(s, 601 + i) for i, s in enumerate(keep))
out = os.path.join(ROOT, "plano-more-spots.js")
open(out, "w", encoding="utf-8").write(
    "// Plano round 3. Independent, highly rated, real social buzz. No chains.\n"
    "// ids namespaced 601+. Deduped against every existing spot file.\n"
    "const PLANO_MORE_SPOTS = [\n" + body + "\n];\n")
print("wrote", out, "with", len(keep), "spots")
