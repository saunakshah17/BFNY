# Battle for New York — complete setup

This deploys into YOUR Cloudflare account as a **Pages project**. It also uses one small Worker for the backend/live updates, a D1 database and an R2 bucket. No cron, email provider, Google OAuth or separate Google server key is needed.

## 1. Extract the project and add your artwork

Extract the ZIP. Open the `bfny` folder. This must be your repository root — the folder containing `package.json`, `wrangler.jsonc`, `worker`, `public` and `migrations`.

Place files here:

| File | Exact location from project root |
| --- | --- |
| Game logo | `public/branding/logo.png` |
| Challenge card 1 | `public/cards/1.png` |
| Challenge card 2 | `public/cards/2.png` |
| Remaining challenges | Continue through `public/cards/30.png` |
| Curses | `31.png`–`36.png` can remain in the folder; the picker ignores them |

**All 36 PNGs from your ZIP are already included.** You only need to add your logo or replace a card you change. Keep filenames as numbers and lowercase `.png`; Cloudflare paths are case-sensitive. Do not rename images to challenge names. Do not put them in an extra `Copy of BFNY` subfolder.

The logo is optional. Transparent PNG looks best on the dark header. The website falls back to its NY text logo if the file is missing. You can also upload a logo later under **Admin → Game & logo settings**. That upload overrides `logo.png`; use the “project folder” checkbox there to revert.

The mapping is in `worker/challenges.js` and listed in `CARD_INDEX.md`. If you only replace the image with an updated design for the same challenge, no mapping change is necessary. If you change its title, update the mapping and redeploy the Worker.

## 2. Install Node and open a terminal in the project

Install Node.js **24 LTS** from https://nodejs.org/ if you do not have it. Restart the terminal after installing.

On Windows, open the extracted `bfny` folder in File Explorer, right-click empty space and choose **Open in Terminal**. Alternatively, in PowerShell:

```powershell
cd "C:\Users\YOUR-NAME\Downloads\bfny"
node --version
npm --version
```

Use your real extracted path. Every command below is run from this same root folder unless explicitly stated otherwise. If PowerShell says `npm.ps1 cannot be loaded`, use `npm.cmd` / `npx.cmd` instead of `npm` / `npx`.

No `npm install` is required for the application. The `npx` commands download the pinned deployment tool on first use. Accept npm's install prompt if shown.

Sign in to Cloudflare:

```sh
npx wrangler@4.151.1 login
```

Your browser opens. Sign into the Cloudflare account that will host the game and approve Wrangler access. Return to the terminal when it reports success. If you have multiple Cloudflare accounts, choose the same account for every resource below.

## 3. Create the D1 database

Run:

```sh
npx wrangler@4.151.1 d1 create bfny
```

It returns a `database_id`, looking like a long UUID. Copy that value.

Open `worker/wrangler.jsonc` in a text editor. Replace **only** `REPLACE_WITH_D1_DATABASE_ID` with that UUID. Keep the quotation marks. Leave the database name `bfny` and binding `DB` unchanged.

Example of the relevant entry:

```json
"d1_databases": [
  {
    "binding": "DB",
    "database_name": "bfny",
    "database_id": "PASTE-YOUR-ACTUAL-DATABASE-ID-HERE",
    "migrations_dir": "../migrations"
  }
]
```

Now create the tables in the remote database:

```sh
npx wrangler@4.151.1 d1 migrations apply bfny --remote --config worker/wrangler.jsonc
```

Approve applying the migration if prompted. You should see `0001_initial.sql` applied successfully. The game starts in **Setup** mode, with no teams. The migration can be checked/re-run safely; Wrangler tracks which migrations have already been applied.

You can also find the database in Cloudflare → **Storage & databases → D1 → bfny**. If your dashboard groups these differently, search for D1.

## 4. Create the R2 photo bucket

If you have never used R2, activate it in the Cloudflare dashboard first: **Storage & databases → R2 Object Storage**. Cloudflare may require billing details to enable it. Usage charges depend on your account and usage; Google Maps has separate billing.

Then run:

```sh
npx wrangler@4.151.1 r2 bucket create bfny-photos
```

Leave the bucket **private**. Do not enable the public `r2.dev` URL or attach a public custom domain. The backend serves photos only to signed-in users, except the game logo.

The configuration already uses:

```json
"r2_buckets": [{"binding":"PHOTOS","bucket_name":"bfny-photos"}]
```

No R2 access keys need to be generated or pasted into this project. Cloudflare bindings handle that.

## 5. Deploy the backend Worker

Run:

```sh
npx wrangler@4.151.1 deploy --config worker/wrangler.jsonc
```

This deploys **bfny-game** and creates its `GameRoom` Durable Object namespace. The configuration uses SQLite-backed Durable Objects. Workers.dev and public preview URLs are disabled; Pages will talk to the Worker through a service binding.

Next set your admin password as a **Worker runtime secret**:

```sh
npx wrangler@4.151.1 secret put ADMIN_PASSWORD --config worker/wrangler.jsonc
```

At the prompt enter a password of **at least 12 characters**. Save it somewhere safe. There is no default admin password. Do not commit it to GitHub.

Dashboard alternative after the Worker exists:

1. Cloudflare → **Workers & Pages → bfny-game**.
2. **Settings → Variables and Secrets → Add**.
3. Type: **Secret**.
4. Name: `ADMIN_PASSWORD`.
5. Value: your chosen password.
6. Save/deploy the change if the dashboard asks.

This belongs on the **bfny-game Worker at runtime**, not in the Pages build settings, GitHub secrets, or a build variable.

The Google key can stay as a placeholder for this first deployment. We will add it once you know the Pages URL.

## 6. Deploy the Pages website

### Recommended: GitHub-connected Pages

1. Create a GitHub repository, for example `battle-for-new-york`.
2. Upload/push the **contents of the extracted `bfny` folder**. `package.json`, `public`, `worker`, `migrations`, and both configuration files must retain their folder structure. Do not include `.dev.vars`, `.env`, `.wrangler` or `node_modules`.
3. Cloudflare → **Workers & Pages → Create application → Pages → Connect to Git** (the button may say **Import an existing Git repository**).
4. Select the repository and production branch, normally `main`.
5. Project name: `battle-for-new-york`. If unavailable, pick a unique name and change `name` in the root `wrangler.jsonc` to match it, then push that change.
6. Framework preset: **None**.
7. Build command: **leave blank**. If the UI requires a value, use `exit 0`.
8. Build output directory: **public**.
9. Root directory: leave blank when the files are at repository root. If you intentionally nested the project, select that folder.
10. Save and deploy.

The root `wrangler.jsonc` declares the **GAME** service binding to **bfny-game**, so Cloudflare can import it with the deployment. Verify the Pages project has this binding:

| Pages binding type | Binding name | Worker |
| --- | --- | --- |
| Service | `GAME` | `bfny-game` |

If it is missing: Pages project → **Settings → Bindings → Add → Service binding**, enter `GAME`, select `bfny-game`, save, and redeploy the Pages project. If Cloudflare says bindings are managed by Wrangler, edit the root configuration and push; do not create a duplicate dashboard entry.

**The D1 and R2 bindings belong on the Worker**, not Pages. The root Pages project needs only the `GAME` service binding.

Open the production URL shown by Cloudflare, usually `https://YOUR-PROJECT.pages.dev`. You should see the dark login screen. Click **Game admin? Sign in here** and use the password from step 5. Google venue search is configured next.

### Alternative: terminal deployment, no GitHub

From the project root:

```sh
npx wrangler@4.151.1 pages project create battle-for-new-york --production-branch main
npx wrangler@4.151.1 pages deploy public --project-name battle-for-new-york --branch main
```

Use your actual project name if different and update root `wrangler.jsonc` to match. Keep that file in the current directory so the service binding is applied.

Choose Git-connected or direct upload for the initial project; do not assume an existing direct-upload project can later be switched to Git integration. For this app, avoid dashboard drag-and-drop deployment: use Git or Wrangler so the advanced-mode Pages Worker and service binding are configured together.

## 7. Configure Google venue search

The website uses Google's **Place Autocomplete (New)** widget with Place Details through the JavaScript library. It shows venue names/addresses; it links out to Google Maps for directions. The scoreboard also uses a map canvas and Places locations to show claimed bars in team colors. It does not need a Map ID, Directions API, Geocoding API, or device location permission. Map loads and Places lookups may incur Google charges.

In Google Cloud Console, open the project holding your API key:

1. Ensure **billing is enabled** for that project.
2. Go to **APIs & Services → Library**.
3. Find and enable **Maps JavaScript API**.
4. Find and enable **Places API (New)**.
5. Go to **APIs & Services → Credentials** and open your API key.
6. Under application restrictions, select **Websites / HTTP referrers**.
7. Add your production website, for example `https://YOUR-PROJECT.pages.dev/*`.
8. If using a custom domain, add `https://YOUR-DOMAIN/*` too. Add the `www` version separately if you use it.
9. Under API restrictions choose **Restrict key**, selecting **Maps JavaScript API** and **Places API (New)**.
10. Save. Google changes can take a few minutes to propagate. Set usage quotas/budget alerts suitable for your event in Google Cloud.

The browser key is intentionally sent to the browser by the backend. Its protection is the website/API restrictions above; it is not a secret server credential.

In `worker/wrangler.jsonc`, replace `REPLACE_WITH_RESTRICTED_BROWSER_KEY` with that key:

```json
"vars": {
  "GOOGLE_MAPS_BROWSER_KEY": "YOUR-RESTRICTED-GOOGLE-KEY"
}
```

Redeploy:

```sh
npx wrangler@4.151.1 deploy --config worker/wrangler.jsonc
```

A normal deploy preserves the runtime `ADMIN_PASSWORD` secret. Commit this updated configuration if using Git; it contains the restricted browser key, not an unrestricted server key. Alternatively you can manage the browser key as a Worker secret via `wrangler secret put GOOGLE_MAPS_BROWSER_KEY` after removing it from `vars`, but the key will still be visible to signed-in browsers by design.

Refresh the website. Create a team in Admin, sign into that team in a separate private/incognito window, and check that Google search works. Search is biased toward NYC but permits US venues elsewhere. The server uses the selected Google place ID to distinguish venues/branches.

## 8. Create teams, set the logo, start the game

1. Sign in as admin.
2. **Create team** → enter its name, colour and a passcode of at least 6 characters.
3. Repeat for each team. Several teammates can use the same team login at once.
4. **Game & logo settings** → upload your logo if you did not put `logo.png` in the project folder.
5. Keep status **Setup** until ready. Teams may sign in and browse, but cannot submit.
6. Change status to **Live** and save when the game starts.
7. To freeze submissions temporarily choose **Paused**. To finish choose **Ended**. Both preserve the feed and scoreboard, and can be changed back by admin.

Provide teams the production website URL, team name and their passcode. Team passwords are stored as salted PBKDF2 hashes. The admin can replace a passcode but cannot read it back. Changing a team's passcode or disabling its login invalidates that team's current sessions.

No curse UI, automatic challenge draw, timing enforcement or GPS proof is included. Teams physically draw their cards, manage timing, then use the website to report outcomes. The site relies on team honesty and admin correction for venue choice and claiming requirements.

## 9. Corrections during the game

**Admin → Venue corrections → Edit**:

- Fix the display name/address.
- Change the owner.
- **Claimed:** owner can submit a challenge outcome again.
- **Failed/vetoed — open to steals:** owner keeps the point, challengers may attempt a steal.
- **Locked:** protects ownership; choose the completed challenge.
- **Undo claim:** removes ownership, voids all attempts at this venue and permits teams to retry. Use this when someone chose the wrong Google venue, then have the team claim the correct place.
- Enter a reason before applying.

Venue corrections supersede pending competing attempts. Correcting a failed attempt to vetoed (or vice versa), or changing a recorded challenge card without affecting ownership, is available on its **Feed** post. Removing photos is also available there to admins.

**Adjust a score** sets a team's total manual offset; it does not add the entered value repeatedly. Example: entering `-1` means owned bars minus one; returning it to `0` removes the adjustment. A reason is required.

The recent history section shows the last 100 actions/corrections; the database retains the full audit table. Use **Admin → Reset Game** for a clean rehearsal: type `RESET` to clear gameplay and sign everyone out while keeping teams, passcodes, colors and the logo. The audit history remains. **Teams → Remove** can delete an unused team or retire a team with history; see the game management section in README.md.

## 10. Test before the event

Use two or three team logins on separate devices/browser profiles:

1. Admin starts the game. Team A finds a bar and submits a photo claim: A = 1.
2. Team A completes and locks it: A remains 1; others cannot claim it.
3. Use a second venue. A claims then fails/vetoes: A owns it; it is open to steal.
4. B starts a steal: A still has its point.
5. B completes: A loses that venue's point and B gains one. Both scoreboards update.
6. On another open venue, let B fail its steal. Confirm ownership stays with A and B cannot retry.
7. Confirm camera and gallery selection on the actual iPhones/Androids in the group.
8. Confirm the feed, challenge thumbnails, and logo work.
9. Pause/end the game and confirm team submissions are rejected.
10. Rehearse an admin correction and check the scores update.

The app uses live WebSockets plus a 20-second fallback refresh. Mobile browser suspension is normal: returning to the tab refreshes state. It must show a success message before a team treats a claim or lock as recorded. Slow/failed uploads do not reserve a venue. Google setup, live Cloudflare WebSockets, and real device camera behaviour need this account/device smoke test; they cannot be validated without your deployment and credentials.

## 11. Updating later

- **Logo/cards/styles/frontend:** replace files under `public`, then push to GitHub for Pages to redeploy, or run the `pages deploy` command again.
- **Backend/card-name mapping:** edit `worker`, then run `npx wrangler@4.151.1 deploy --config worker/wrangler.jsonc`. GitHub's Pages build does NOT deploy this Worker.
- **Future database migrations:** apply the supplied migration with the step 3 command before deploying backend code that requires it. Do not delete or change migration 0001 on a running installation.
- **Admin password:** run the step 5 `secret put` command again. Existing admin sessions last up to seven days; to revoke them immediately, delete admin-role rows from `sessions` in D1's console and then sign in again. Team passcode resets have built-in revocation.
- Do not bind untrusted preview deployments to the live backend; a preview using the same GAME service points at the same game data.

## Troubleshooting

| Symptom | What to check |
| --- | --- |
| `GAME service binding is missing` | Pages binding is named exactly `GAME`, points to `bfny-game`, and Pages was redeployed after adding it. |
| Server error / missing table | The remote D1 migration was applied to the same database ID in `worker/wrangler.jsonc`. Check bfny-game Worker logs for the exact failure. |
| Admin password not configured | `ADMIN_PASSWORD` is a runtime secret on **bfny-game**, minimum 12 characters. |
| Search not configured | Replace the browser-key placeholder in the Worker config and redeploy the Worker. |
| Google search authorization error | Both APIs enabled, billing active, exact production referrer allowed, correct key project. Browser developer console usually gives a specific Google error name. |
| Images upload but cannot load | `PHOTOS` binding points at the correct private R2 bucket; user is still signed in. |
| HEIC/gallery image fails | Choose a JPEG/PNG or a screenshot, or take a photo with the camera option. Browser HEIC decoding varies; no server-side HEIC converter is included. |
| Team sees old scores | Return to the tab or reload; check connectivity. The header shows Live/Reconnecting. Polling refreshes active tabs every 20 seconds. |
| “Already attempted this bar” | Teams cannot retry. Admin can reopen/correct the venue if this was a mistake. |
| Cards show broken images | Check `public/cards/NUMBER.png`, exact numbering/case, and that files are in Git. |
| Uploaded logo won't change after replacing logo.png | Admin-uploaded logo takes priority. Select the project-folder logo option in Game & logo settings. |
| npm ci / lockfile error in Pages | Remove that build command. This project has no dependency installation or build step. Leave build blank, output `public`. |

## Official reference pages

- Cloudflare Pages configuration: https://developers.cloudflare.com/pages/functions/wrangler-configuration/
- Cloudflare service bindings: https://developers.cloudflare.com/pages/functions/bindings/
- Durable Objects WebSockets: https://developers.cloudflare.com/durable-objects/best-practices/websockets/
- Google Place Autocomplete: https://developers.google.com/maps/documentation/javascript/place-autocomplete-new
