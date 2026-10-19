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
- Curses and individual challenge timers stay outside the website. The admin can run a separate game countdown.
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

Deploy both the backend Worker and Pages for these changes. The map and reset controls use the existing schema; the game countdown requires migration `0002_countdown.sql`.

## Territory summaries, activity tape and final-stop countdown

Tap a team in the leaderboard to show its owned bars on the map and in the list. The summary counts total owned bars, locked bars, bars open to steals and bars with a pending original challenge. Manual score adjustments do not count as territory. All Teams restores the full view. The scrolling activity tape uses actual claim, steal-start and completion events; a successful steal names the previous owner. Pause/Resume controls, hover/focus pausing and reduced-motion support let players read at their own pace.

Admin → Countdown & final stop lets you enter hours/minutes/seconds, a destination label, an address and a subway route. Save destination prepares these details without starting; Start Countdown starts immediately, independently of game phase. The top of Play shows a subway arrival board with a synchronized HH:MM:SS clock. The address and Google Maps directions link sit underneath, outside the sign. It turns amber for the last ten minutes, stays at zero when finished and never ends the game automatically. Admin can pause, resume, extend, cancel, restart or edit the destination. Saving destination edits during a countdown leaves its current deadline unchanged; use Extend or Restart to change time. Reset Game clears the countdown as well as gameplay.

Before deploying this update, apply the new D1 migration (using your existing Cloudflare account authentication):

```sh
npx wrangler@4.151.1 d1 migrations apply DB --remote --config worker/wrangler.jsonc
npx wrangler@4.151.1 deploy --config worker/wrangler.jsonc
```

Then deploy Pages through your usual Git integration or Wrangler Pages deployment. Both frontend and backend updates are required. Migration 0002 preserves existing game data.
