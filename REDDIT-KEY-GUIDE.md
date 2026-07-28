# Get your Reddit API key (10 minutes, free)

This is the sanctioned door into Reddit's data. Scraping Reddit gets you blocked
(you saw that happen); the official API is reliable, legal, and free for this.
No card required, no password stored — the app reads public posts only.

## Steps

1. Log in to Reddit, then go to **https://www.reddit.com/prefs/apps**
2. Scroll down, click **"are you a developer? create an app…"** (or **Create another app**).
3. Fill it in:
   - **name:** `prowl-spot-ingest`
   - Choose the **"script"** radio button.
   - **description:** anything (e.g. "collects public urbex posts for a map app")
   - **about url:** leave blank or your GitHub Pages URL
   - **redirect uri:** `http://localhost:8080` (required field; we don't actually use it)
4. Click **Create app**.
5. You'll now see the app box. Two values matter:
   - The string **right under the app name** (looks like `a1B2c3...`) — that's your **client ID**.
   - The **secret** field — that's your **client secret**.

## Put them where the tools read them

Open `C:\Users\wjack\ghl-cli\.env` (the local, non-synced secrets file — same
place your other keys live) and add two lines:

```
REDDIT_CLIENT_ID=paste_the_client_id_here
REDDIT_CLIENT_SECRET=paste_the_secret_here
```

That's it. Never put these in the vault (it syncs to the cloud). The .env is
local disk only, which is why it's the right home.

## Then

Tell me it's set, and I'll kick off a test run:

```bash
python ingest/reddit_ingest.py --limit 30
```

It'll pull ~30 real Texas spots with their Reddit posts attached, so we can
eyeball the quality before letting it run the full overnight sweep. If a key
ever leaks, delete the app on that same prefs/apps page and make a new one —
nothing else breaks.

## Rate limits (so you know it won't get us banned)

App-only OAuth allows ~60 requests/minute. The pipeline sleeps ~1.2s between
calls to stay well under that. An overnight run comfortably sweeps every
subreddit + query in the config without tripping anything.
