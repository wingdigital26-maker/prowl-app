# Prowl spot ingestion pipeline

Auto-builds the spot database from **real Reddit posts** via Reddit's official
API. Nothing is scraped, nothing is copied — each spot links back to the
original post as an embed. Built to scale from Texas to the whole US.

## The flow

```
reddit_ingest.py   Reddit API -> extract place -> geocode -> region gate
                   -> dedupe -> classify -> harvest TikTok/IG links
                   -> candidates.jsonl
        (you review candidates.jsonl — delete junk lines)
promote.py         candidates.jsonl -> ingested-spots.js  (window.INGESTED_SPOTS)
        (we wire that file into the app together — one <script> + one spread)
```

**Social harvest:** Reddit posts often link out to TikTok / Instagram. The
engine pulls those links, validates TikTok ones through the public oEmbed
endpoint (dead/private links are dropped), and attaches them as extra embeds on
the spot — alongside the Reddit post. All legal: public URLs, embedded the
sanctioned way, never scraped or downloaded. Toggle via `HARVEST_SOCIAL` in
`config.py`.

Every auto-collected spot carries `needs_review: true` and
`legal_status: "unverified"`, so nothing pretends to be hand-vetted, and
private/trespassing spots stay flagged just like the hand-curated ones.

## Setup (once)

1. Get a Reddit API key — see `../REDDIT-KEY-GUIDE.md` (10 min, free).
   Puts `REDDIT_CLIENT_ID` / `REDDIT_CLIENT_SECRET` in `C:\Users\wjack\ghl-cli\.env`.
2. `pip install requests` (already present on this machine).

## Run

```bash
python reddit_ingest.py --limit 30     # small test run
python reddit_ingest.py                # full sweep (overnight)
python reddit_ingest.py --dry-run      # search + geocode, write nothing

python promote.py --min-conf 0.9       # publish only exactly-located spots
python promote.py                      # publish everything past the gates
```

## Tuning

Everything lives in `config.py`: which subreddits, which search terms, the
region bounding box (Texas by default; a commented USA box is right there),
quality gates (min upvotes, min title length), and politeness/rate-limit sleeps.

- **Go nationwide:** swap `REGION_BBOX` to the USA box in `config.py` and add
  more city subreddits to `SUBREDDITS`.
- **Location accuracy:** urbex posts often hide exact spots on purpose. Those
  come through at `location_confidence 0.2–0.5` and get a `loc-approx` tag.
  Use `promote.py --min-conf 0.9` to keep only exactly-located ones.

## Cloud runner (the "PC-off" version)

To run overnight without your PC on, this script goes on a small always-on host
(same idea as the OS phone-access setup) on a nightly schedule, writing to the
**hosted** PocketBase instead of a local file. That needs the backend hosted
first — the next infrastructure step. The engine itself is already host-agnostic:
point it at a hosted DB and it just works.

## Files

| file | what |
|------|------|
| `config.py` | all the knobs — subreddits, region, gates |
| `reddit_ingest.py` | the engine: Reddit -> candidates.jsonl |
| `promote.py` | candidates -> publishable ingested-spots.js |
| `candidates.jsonl` | staging output (git-ignored; regenerated each run) |
| `seen_ids.txt` | posts already processed, so reruns skip them |
