# Validation notes

Validated during preparation:

- JavaScript syntax checks for frontend, Pages proxy and backend.
- Twelve tests exercising real backend handlers and the SQL schema through a Node SQLite D1 adapter.
- Successful Worker dry-run compilation using Wrangler 4.151.1.
- Successful Pages advanced-mode Worker compilation using Wrangler 4.151.1.
- Numbered card assets 1–36 present, with titles 1–30 visually checked against the supplied images. Emoji-only titles have text search aliases.

Tests cover: original claim and lock, no extra locking point, failed/vetoed claims, failed steals, simultaneous first claims, simultaneous steal completions, score conservation, one attempt per team/venue, challenge validation, duplicate outcome rejection, authentication, admin-only controls, same-origin request validation, private media, passcode reset, photo ownership, invalid image type, paused/ended games, admin corrections, score offsets, audit logging and photo moderation.

Additional checks for map and game management:

- Reset and team deletion/retirement integration tests cover admin permissions, confirmation, session revocation, preserved teams/logo, protected history and fresh gameplay after reset.
- A mobile Chromium check with simulated Google Maps/Places responses verified coordinate lookup, pin color changes, preserved map view/filter, removed pins, headings, reset and retirement dialogs. This does not validate the real Google key, billing or referrer settings.

Limits:

- This is a prepared deployment package; it has not been deployed into the user's Cloudflare account.
- Tests use an in-process Durable Object serialization adapter and in-memory R2 adapter; they do not replace an account-level Cloudflare smoke test.
- Browser visual QA, real WebSocket reconnects, Google billing/key configuration and iPhone/Android camera integration have not been tested here. Run the rehearsal in SETUP.md after deployment.
- HEIC conversion depends on browser decoding. JPEG/PNG, a screenshot, or the camera option are the supported fallbacks.
- No offline submissions or background mobile notifications. An active browser tab receives live updates and has a 20-second refresh fallback.
- One game per installation. Data is fetched as a small private-event snapshot, not as a large public-platform feed.

Countdown and territory update validation:

- All migrations are applied to the SQLite test adapter, including the additive countdown migration.
- Tests cover timer authorization/CSRF, duration/route validation, save versus start, pause/resume/extend/cancel, independent game phase, zero behavior, reset and actual activity event contents.
- Countdown formatting covers HH:MM:SS, subsecond rounding and paused time. Browser checks simulate a device clock six hours ahead to verify server-time synchronization.
- Mobile Chromium checks exercise territory filtering/counts, activity tape controls/reduced motion, final-stop layout and timer admin forms. Google Maps responses are simulated; real Google account configuration still needs deployment verification.
