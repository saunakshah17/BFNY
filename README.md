# Battle for New York

Mobile-first, dark-themed game website for Cloudflare Pages, with a Cloudflare Worker, Durable Object, D1 and private R2 photo storage.

**Start with [SETUP.md](SETUP.md).** It walks through the exact resource creation, configuration, deployments, Google API setup, and first game.

## Your assets

- Game logo: `public/branding/logo.png` (optional; a built-in text logo appears until you add yours).
- Cards: `public/cards/1.png` through `public/cards/30.png`.
- The supplied card PNGs are already included. Files `31.png` through `36.png` are retained as original assets but excluded from the game picker.
- Original guides: `public/rules/rules.png` and `public/rules/how-to-play.png`.
- Card names/aliases: `worker/challenges.js`; see `CARD_INDEX.md` for the full mapping.
- Admin can upload/replace the logo after deployment, without editing the repository.

## Rules implemented

- One point per owned venue. Locking does not add points.
- Original owner can lock only after claiming.
- Original failure/veto keeps ownership but opens the venue to steal attempts.
- Stealing is only available after the original owner's failure/veto.
- Multiple challengers may attempt a steal. Only the first completed lock transfers ownership.
- Failed/vetoed challengers cannot retry that venue. Other challengers can still try.
- Losing concurrent attempts become `lost` when someone locks the venue.
- Teams must select a challenge for completed, failed and vetoed attempts.
- Photos required for claims/steal starts, optional for outcomes.
- Curses and timers stay outside the website.
- Scores are calculated from current ownership, plus any explicit admin adjustment.
- A shared rank is displayed for tied scores.

## How it works

Pages serves the website. Its `public/_worker.js` forwards `/api/*` to the private `bfny-game` Worker via a service binding. The Worker routes requests to a single game Durable Object. That object serializes read/check/write operations and writes related D1 changes in atomic batches. It pushes WebSocket invalidations so each signed-in device fetches fresh state. A 20-second fallback refresh and reconnect handling cover interruptions.

This is one game per installation, built for a private group event. It is not a multi-event tournament platform. It requires connectivity to submit; it never pretends an offline claim has succeeded.

D1 stores teams, hashed passcodes, expiring sessions, venue ownership, attempts, media metadata and an audit trail. R2 stores uploaded photos privately. A removed photo is inaccessible through the app; its stored object is retained for recovery. Cards and the logo are public static assets; player uploads and the scoreboard require a team/admin session. An uploaded logo is public so it can appear on the login screen.

## Development and verification

There are no framework/package dependencies and no build step. Do not run `npm ci`; there is intentionally no dependency lockfile. Run with Node.js 24:

```sh
npm run check
npm test
```

The test suite exercises the actual backend handlers and SQL using Node's SQLite adapter and in-memory media storage. It covers claim races, competing steals, failed steals, score conservation, lock idempotency, permissions, CSRF, media access, passcode rotation, paused/ended gates and admin corrections. Wrangler 4.151.1 was used for packaging checks; see `VALIDATION.md` for limits.

Do not edit the database directly during a live game; admin actions maintain the ownership/attempt relationships and emit live updates. The audit log records corrections, including the previous venue state. Use a separate installation for rehearsal if you want to keep a clean game history.

## Scoreboard map and game management

The scoreboard includes a live Google map between the leaderboard and searchable bar list. Pins use the current owner's team color and change when a steal completes. Tap a pin for status and directions; “Show all bars” restores the full view. Google Places resolves coordinates from saved place IDs, including existing bars. Coordinates stay in browser memory for that page session; no database migration is needed. Enable Maps JavaScript API and Places API (New), billing, and website/API restrictions for the browser key. Map loads and place lookups may incur Google charges. If Maps is unavailable, the bar list remains usable.

Admin → Reset Game requires typing `RESET`. It returns the game to Setup and clears ownership, attempts, gameplay photo access, all sessions and manual score adjustments. It keeps teams, passcodes, colors, login-enabled settings, the logo and audit history. Everyone must sign in again. As with photo moderation, R2 photo bytes remain for recovery but are inaccessible through the app after their metadata is removed.

Admin → Teams → Remove offers permanent deletion for teams without attempts, owned venues, uploaded media or score adjustments. Teams with gameplay history can be retired instead: sign-in is disabled and sessions are revoked while scores, bars and feed remain intact. Edit can enable sign-in again. Reset the game first if you need to permanently delete a test team with history.

Deploy both the backend Worker and Pages for these changes; the existing database schema is unchanged.
