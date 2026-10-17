var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// challenges.js
var CHALLENGES = [
  {
    "id": 1,
    "name": "Alphabetical Bartender",
    "aliases": "",
    "image": "/cards/1.png"
  },
  {
    "id": 2,
    "name": "Mystery Drink",
    "aliases": "",
    "image": "/cards/2.png"
  },
  {
    "id": 3,
    "name": "Taste of Home",
    "aliases": "",
    "image": "/cards/3.png"
  },
  {
    "id": 4,
    "name": "\u{1F695}\u{1F695}\u{1F695}",
    "aliases": "Taxi taxis cab cabs",
    "image": "/cards/4.png"
  },
  {
    "id": 5,
    "name": "8, 1, 2, 3...",
    "aliases": "",
    "image": "/cards/5.png"
  },
  {
    "id": 6,
    "name": "World Traveler",
    "aliases": "",
    "image": "/cards/6.png"
  },
  {
    "id": 7,
    "name": "I Spy 1+1+1",
    "aliases": "",
    "image": "/cards/7.png"
  },
  {
    "id": 8,
    "name": "Meet the Locals",
    "aliases": "",
    "image": "/cards/8.png"
  },
  {
    "id": 9,
    "name": "Time Master",
    "aliases": "",
    "image": "/cards/9.png"
  },
  {
    "id": 10,
    "name": "\u{1FAA8}\u{1F4C4}\u2702\uFE0F",
    "aliases": "Rock paper scissors",
    "image": "/cards/10.png"
  },
  {
    "id": 11,
    "name": "A New York Slice",
    "aliases": "",
    "image": "/cards/11.png"
  },
  {
    "id": 12,
    "name": "On a Budget",
    "aliases": "",
    "image": "/cards/12.png"
  },
  {
    "id": 13,
    "name": "Scattergories",
    "aliases": "",
    "image": "/cards/13.png"
  },
  {
    "id": 14,
    "name": "A Visit to The Met",
    "aliases": "",
    "image": "/cards/14.png"
  },
  {
    "id": 15,
    "name": "Melting Pot",
    "aliases": "",
    "image": "/cards/15.png"
  },
  {
    "id": 16,
    "name": "Ay, I\u2019m Walking Here",
    "aliases": "",
    "image": "/cards/16.png"
  },
  {
    "id": 17,
    "name": "Wordle in the Wild",
    "aliases": "",
    "image": "/cards/17.png"
  },
  {
    "id": 18,
    "name": "Alphabet City",
    "aliases": "",
    "image": "/cards/18.png"
  },
  {
    "id": 19,
    "name": "The Big \u{1F34E}",
    "aliases": "The Big Apple",
    "image": "/cards/19.png"
  },
  {
    "id": 20,
    "name": "Five Decades",
    "aliases": "Five Boroughs Decades",
    "image": "/cards/20.png"
  },
  {
    "id": 21,
    "name": "City of Champions",
    "aliases": "",
    "image": "/cards/21.png"
  },
  {
    "id": 22,
    "name": "The Price is Right",
    "aliases": "",
    "image": "/cards/22.png"
  },
  {
    "id": 23,
    "name": "Concrete Jungle",
    "aliases": "",
    "image": "/cards/23.png"
  },
  {
    "id": 24,
    "name": "Bentley Student for a Day",
    "aliases": "",
    "image": "/cards/24.png"
  },
  {
    "id": 25,
    "name": "Bodega Relay",
    "aliases": "",
    "image": "/cards/25.png"
  },
  {
    "id": 26,
    "name": "Local vs Express",
    "aliases": "",
    "image": "/cards/26.png"
  },
  {
    "id": 27,
    "name": "Marketing Major",
    "aliases": "",
    "image": "/cards/27.png"
  },
  {
    "id": 28,
    "name": "Mild, Hot, Fire",
    "aliases": "",
    "image": "/cards/28.png"
  },
  {
    "id": 29,
    "name": "Connecting Flights",
    "aliases": "",
    "image": "/cards/29.png"
  },
  {
    "id": 30,
    "name": "The Death Train",
    "aliases": "",
    "image": "/cards/30.png"
  }
];

// index.js
var now = /* @__PURE__ */ __name(() => (/* @__PURE__ */ new Date()).toISOString(), "now");
var uid = /* @__PURE__ */ __name(() => crypto.randomUUID(), "uid");
var json = /* @__PURE__ */ __name((data, status = 200, headers = {}) => Response.json(data, { status, headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", ...headers } }), "json");
var Problem = class extends Error {
  static {
    __name(this, "Problem");
  }
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
};
var check = /* @__PURE__ */ __name((condition, message, status = 400) => {
  if (!condition) throw new Problem(message, status);
}, "check");
var text = /* @__PURE__ */ __name((s, max = 120) => typeof s === "string" && s.trim().length > 0 && s.trim().length <= max, "text");
var hex = /* @__PURE__ */ __name((b) => [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join(""), "hex");
async function digest(s) {
  return hex(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)));
}
__name(digest, "digest");
async function passwordHash(s, salt = uid()) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(s), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt: new TextEncoder().encode(salt), iterations: 1e5, hash: "SHA-256" }, key, 256);
  return salt + ":" + hex(bits);
}
__name(passwordHash, "passwordHash");
async function passwordOK(s, stored) {
  return typeof stored === "string" && await passwordHash(s, stored.split(":")[0]) === stored;
}
__name(passwordOK, "passwordOK");
var index_default = { fetch(request, env) {
  return env.ROOM.get(env.ROOM.idFromName("bfny-v1")).fetch(request);
} };
var GameRoom = class {
  static {
    __name(this, "GameRoom");
  }
  constructor(ctx, env) {
    this.ctx = ctx;
    this.env = env;
    this.db = env.DB;
  }
  q(sql, ...args) {
    return this.db.prepare(sql).bind(...args);
  }
  async one(sql, ...args) {
    return this.q(sql, ...args).first();
  }
  async all(sql, ...args) {
    return (await this.q(sql, ...args).all()).results;
  }
  audit(action, detail) {
    return this.q("INSERT INTO audit VALUES(?,?,?,?)", uid(), action, JSON.stringify(detail), now());
  }
  async fetch(request) {
    return this.ctx.blockConcurrencyWhile(async () => {
      try {
        return await this.route(request);
      } catch (e) {
        if (!(e instanceof Problem)) console.error("Game request failed", e.message);
        return json({ error: e instanceof Problem ? e.message : "Server error. Check Worker logs and database migrations." }, e.status || 500);
      }
    });
  }
  async auth(req) {
    const token = req.headers.get("Cookie")?.match(/(?:^|;\s*)bfny_session=([^;]+)/)?.[1];
    check(token, "Please sign in.", 401);
    const s = await this.one("SELECT * FROM sessions WHERE token=? AND expires>?", await digest(token), Date.now());
    check(s, "Session expired. Please sign in.", 401);
    if (s.role === "team") {
      const t = await this.one("SELECT * FROM teams WHERE id=? AND active=1", s.team_id);
      check(t, "Team login disabled.", 401);
      s.team = t;
    }
    return s;
  }
  async body(req) {
    const raw = await req.text();
    check(raw.length < 2e4, "Request too large.", 413);
    try {
      return JSON.parse(raw);
    } catch {
      throw new Problem("Invalid JSON.");
    }
  }
  async route(req) {
    const url = new URL(req.url), path = url.pathname, method = req.method;
    if (method !== "GET" || path === "/api/live") check(req.headers.get("Origin") === url.origin, "Request origin not allowed.", 403);
    if (path === "/api/bootstrap" && method === "GET") {
      return json({ teams: await this.all("SELECT id,name,color FROM teams WHERE active=1 ORDER BY name"), settings: await this.one("SELECT * FROM settings WHERE id=1") });
    }
    if (path === "/api/login" && method === "POST") {
      const b = await this.body(req);
      check(typeof b.passcode === "string" && b.passcode.length <= 256, "Enter your passcode.");
      const ip = req.headers.get("CF-Connecting-IP") || "unknown";
      const rateKey = await digest(ip), limit = await this.one("SELECT * FROM login_limits WHERE key=?", rateKey);
      check(!limit || limit.reset < Date.now() || limit.count < 20, "Too many login attempts. Wait 15 minutes.", 429);
      await this.q("INSERT INTO login_limits VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=CASE WHEN reset<? THEN 1 ELSE count+1 END,reset=CASE WHEN reset<? THEN excluded.reset ELSE reset END", rateKey, Date.now() + 9e5, Date.now(), Date.now()).run();
      let role = "team", team = null;
      if (b.admin) {
        check(this.env.ADMIN_PASSWORD?.length >= 12, "Admin password is not configured (minimum 12 characters).", 503);
        check(await digest(b.passcode) === await digest(this.env.ADMIN_PASSWORD), "Incorrect login.", 401);
        role = "admin";
      } else {
        team = await this.one("SELECT * FROM teams WHERE id=? AND active=1", b.teamId || "");
        check(team && await passwordOK(b.passcode, team.password), "Incorrect login.", 401);
      }
      await this.q("DELETE FROM login_limits WHERE key=?", rateKey).run();
      const token = uid() + uid(), expires = Date.now() + 7 * 864e5;
      await this.db.batch([this.q("DELETE FROM sessions WHERE expires<?", Date.now()), this.q("INSERT INTO sessions VALUES(?,?,?,?)", await digest(token), team?.id || null, role, expires)]);
      return json({ ok: true }, 200, { "Set-Cookie": `bfny_session=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=604800` });
    }
    if (path.startsWith("/api/media/") && method === "GET") {
      const id = path.slice("/api/media/".length), m = await this.one("SELECT * FROM media WHERE id=?", id);
      check(m, "Photo not found.", 404);
      if (m.kind !== "logo") await this.auth(req);
      const f = await this.env.PHOTOS.get(id);
      check(f, "Photo not found.", 404);
      return new Response(f.body, { headers: { "Content-Type": m.mime, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
    }
    const s = await this.auth(req);
    if (path === "/api/logout" && method === "POST") {
      await this.q("DELETE FROM sessions WHERE token=?", s.token).run();
      this.closeSockets(s.token);
      return json({ ok: true }, 200, { "Set-Cookie": "bfny_session=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0" });
    }
    if (path === "/api/live" && method === "GET") {
      check(req.headers.get("Upgrade")?.toLowerCase() === "websocket", "WebSocket required.", 426);
      const pair = new WebSocketPair();
      this.ctx.acceptWebSocket(pair[1]);
      pair[1].serializeAttachment({ token: s.token, team: s.team_id, expires: s.expires });
      return new Response(null, { status: 101, webSocket: pair[0] });
    }
    if (path === "/api/state" && method === "GET") return json(await this.snapshot(s));
    if (path === "/api/upload" && method === "POST") {
      check(Number(req.headers.get("Content-Length") || 0) <= 8 * 1024 * 1024 + 2e3, "Photo is too large (8 MB maximum).", 413);
      const data = await req.formData(), file = data.get("file"), kind = data.get("kind") === "logo" ? "logo" : "photo";
      check(file && typeof file.arrayBuffer === "function" && file.size > 0 && file.size <= 8 * 1024 * 1024, "Choose a JPEG, PNG or WebP image under 8 MB.");
      if (kind === "logo") check(s.role === "admin", "Admin only.", 403);
      else check((await this.one("SELECT phase FROM settings WHERE id=1")).phase === "live" || s.role === "admin", "The game is not live.", 409);
      const bytes = new Uint8Array(await file.arrayBuffer());
      const mime = bytes[0] === 255 && bytes[1] === 216 ? "image/jpeg" : bytes[0] === 137 && bytes[1] === 80 && bytes[2] === 78 && bytes[3] === 71 ? "image/png" : new TextDecoder().decode(bytes.slice(0, 4)) === "RIFF" && new TextDecoder().decode(bytes.slice(8, 12)) === "WEBP" ? "image/webp" : null;
      check(mime, "Unsupported image. Use JPEG, PNG or WebP.");
      const recent = await this.one("SELECT COUNT(*) AS n FROM media WHERE team_id IS ? AND created>?", s.team_id, new Date(Date.now() - 36e5).toISOString());
      check(recent.n < 100, "Upload limit reached. Ask the admin.", 429);
      const id = uid();
      await this.env.PHOTOS.put(id, bytes, { httpMetadata: { contentType: mime } });
      await this.q("INSERT INTO media VALUES(?,?,?,?,?)", id, s.team_id, kind, mime, now()).run();
      return json({ id });
    }
    if (path.startsWith("/api/admin/") && method === "POST") {
      check(s.role === "admin", "Admin only.", 403);
      const b = await this.body(req);
      await this.admin(path, b);
      this.broadcast();
      return json({ ok: true });
    }
    check(s.role === "team", "Use a team login to play.", 403);
    check((await this.one("SELECT phase FROM settings WHERE id=1")).phase === "live", "The game is not live. Your submission was not recorded.", 409);
    if (path === "/api/claim" && method === "POST") {
      const b = await this.body(req);
      check(text(b.placeId, 300) && text(b.name, 200) && typeof b.address === "string" && b.address.length <= 400, "Select a venue from Google search.");
      await this.photo(b.photo, s.team_id);
      let v = await this.one("SELECT * FROM venues WHERE id=?", b.placeId);
      const old = await this.one("SELECT * FROM attempts WHERE venue_id=? AND team_id=?", b.placeId, s.team_id);
      if (old && old.status !== "void") throw new Problem("Your team already has an attempt at this bar. Open it under Play.", 409);
      check(!v || v.status === "available" || v.status === "open", v?.status === "locked" ? "This bar is locked." : "This bar is claimed and its challenge is still in progress.", 409);
      check(!v || v.owner !== s.team_id, "Your team cannot retry this bar.", 409);
      const kind = v?.owner ? "steal" : "claim", id = uid(), t = now(), ops = [];
      if (!v) ops.push(this.q("INSERT INTO venues VALUES(?,?,?,?,?,?)", b.placeId, b.name.trim(), b.address.trim(), s.team_id, "claimed", t));
      else if (kind === "claim") ops.push(this.q("UPDATE venues SET owner=?,status='claimed',updated=? WHERE id=?", s.team_id, t, b.placeId));
      if (old) ops.push(this.q("DELETE FROM attempts WHERE id=?", old.id));
      ops.push(this.q("INSERT INTO attempts VALUES(?,?,?,?,?,?,?,?,?,?)", id, b.placeId, s.team_id, kind, "pending", null, b.photo, null, t, t));
      ops.push(this.audit(kind, { team: s.team_id, venue: b.placeId, attempt: id }));
      await this.db.batch(ops);
      this.broadcast();
      return json({ id, kind });
    }
    if (path === "/api/outcome" && method === "POST") {
      const b = await this.body(req);
      check(["completed", "failed", "vetoed"].includes(b.status), "Choose an outcome.");
      check(Number.isInteger(b.challenge) && CHALLENGES.some((c) => c.id === b.challenge), "Select a challenge.");
      const a = await this.one("SELECT * FROM attempts WHERE id=? AND team_id=?", b.id, s.team_id);
      check(a, "Attempt not found.", 404);
      check(a.status === "pending", "This attempt has already been resolved.", 409);
      const v = await this.one("SELECT * FROM venues WHERE id=?", a.venue_id);
      check(a.kind === "claim" && v.owner === s.team_id && v.status === "claimed" || a.kind === "steal" && v.status === "open", "This bar is no longer available for this attempt.", 409);
      if (b.photo) await this.photo(b.photo, s.team_id);
      const t = now(), ops = [this.q("UPDATE attempts SET status=?,challenge=?,completion_photo=?,updated=? WHERE id=?", b.status, b.challenge, b.photo || null, t, a.id)];
      if (b.status === "completed") {
        ops.push(this.q("UPDATE venues SET owner=?,status='locked',updated=? WHERE id=?", s.team_id, t, v.id));
        ops.push(this.q("UPDATE attempts SET status='lost',updated=? WHERE venue_id=? AND id<>? AND status='pending'", t, v.id, a.id));
      } else if (a.kind === "claim") ops.push(this.q("UPDATE venues SET status='open',updated=? WHERE id=?", t, v.id));
      ops.push(this.audit(b.status, { team: s.team_id, attempt: a.id, venue: v.id, previousOwner: v.owner }));
      await this.db.batch(ops);
      this.broadcast();
      return json({ ok: true });
    }
    throw new Problem("Not found.", 404);
  }
  async photo(id, team) {
    const m = await this.one("SELECT * FROM media WHERE id=? AND team_id=? AND kind='photo'", id || "", team);
    check(m, "Upload your team photo first.");
  }
  async snapshot(s) {
    const data = {
      me: { role: s.role, id: s.team_id, name: s.team?.name || "Game admin" },
      settings: await this.one("SELECT * FROM settings WHERE id=1"),
      challenges: CHALLENGES,
      googleKey: this.env.GOOGLE_MAPS_BROWSER_KEY || "",
      teams: await this.all("SELECT t.id,t.name,t.color,t.active,t.adjustment,COUNT(v.id)+t.adjustment AS score FROM teams t LEFT JOIN venues v ON v.owner=t.id GROUP BY t.id ORDER BY score DESC,t.name"),
      venues: await this.all("SELECT * FROM venues ORDER BY updated DESC"),
      attempts: await this.all("SELECT * FROM attempts WHERE status<>'void' ORDER BY created DESC")
    };
    if (s.role === "admin") data.audit = await this.all("SELECT * FROM audit ORDER BY created DESC LIMIT 100");
    return data;
  }
  async admin(path, b) {
    if (path === "/api/admin/team") {
      check(text(b.name, 60) && /^#[0-9a-fA-F]{6}$/.test(b.color), "Provide a team name and colour.");
      check(!b.passcode || typeof b.passcode === "string" && b.passcode.length >= 6 && b.passcode.length <= 128, "Team passcodes must be 6\u2013128 characters.");
      const old = b.id ? await this.one("SELECT * FROM teams WHERE id=?", b.id) : null;
      check(!b.id || old, "Team not found.", 404);
      check(old || b.passcode, "Set a passcode for the new team.");
      const duplicate = await this.one("SELECT id FROM teams WHERE name=? COLLATE NOCASE", b.name.trim());
      check(!duplicate || duplicate.id === b.id, "That team name is already in use.");
      const id = old?.id || uid(), hash = b.passcode ? await passwordHash(b.passcode) : old.password;
      const ops = [this.q("INSERT INTO teams(id,name,color,password,active) VALUES(?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,color=excluded.color,password=excluded.password,active=excluded.active", id, b.name.trim(), b.color, hash, b.active === false ? 0 : 1), this.audit("team updated", { id, name: b.name })];
      if (old && (b.passcode || b.active === false)) ops.push(this.q("DELETE FROM sessions WHERE team_id=?", id));
      await this.db.batch(ops);
      if (old && (b.passcode || b.active === false)) this.closeTeamSockets(id);
      return;
    }
    if (path === "/api/admin/settings") {
      check(["setup", "live", "paused", "ended"].includes(b.phase), "Invalid game phase.");
      if (b.logo) check(await this.one("SELECT id FROM media WHERE id=? AND kind='logo'", b.logo), "Upload a logo first.");
      await this.db.batch([this.q("UPDATE settings SET phase=?,logo=? WHERE id=1", b.phase, b.logo || null), this.audit("settings updated", { phase: b.phase })]);
      return;
    }
    if (path === "/api/admin/adjust") {
      check(Number.isInteger(b.adjustment) && Math.abs(b.adjustment) <= 100 && text(b.reason, 300), "Enter an adjustment between -100 and 100 and a reason.");
      check(await this.one("SELECT id FROM teams WHERE id=?", b.teamId), "Team not found.");
      await this.db.batch([this.q("UPDATE teams SET adjustment=? WHERE id=?", b.adjustment, b.teamId), this.audit("score adjustment", b)]);
      return;
    }
    if (path === "/api/admin/venue") {
      const v = await this.one("SELECT * FROM venues WHERE id=?", b.id);
      check(v, "Venue not found.", 404);
      check(text(b.reason, 300) && text(b.name, 200) && typeof b.address === "string" && b.address.length <= 400, "Provide venue details and a reason.");
      check(["available", "claimed", "open", "locked"].includes(b.status), "Invalid venue status.");
      const owner = b.status === "available" ? null : b.owner;
      check(!owner || await this.one("SELECT id FROM teams WHERE id=?", owner), "Team not found.");
      check(b.status === "available" || owner, "Choose an owner.");
      if (b.status === "locked") check(CHALLENGES.some((c) => c.id === Number(b.challenge)), "Select the completed challenge.");
      const t = now(), ops = [this.audit("venue correction", { before: v, after: b }), this.q("UPDATE venues SET name=?,address=?,owner=?,status=?,updated=? WHERE id=?", b.name.trim(), b.address.trim(), owner, b.status, t, v.id)];
      ops.push(this.q("UPDATE attempts SET status='lost',updated=? WHERE venue_id=? AND status='pending'", t, v.id));
      if (owner) {
        const a = await this.one("SELECT * FROM attempts WHERE venue_id=? AND team_id=?", v.id, owner);
        const status = b.status === "locked" ? "completed" : b.status === "open" ? "failed" : "pending";
        if (a) ops.push(this.q("UPDATE attempts SET status=?,kind=?,challenge=?,updated=? WHERE id=?", status, "claim", b.challenge ? Number(b.challenge) : null, t, a.id));
        else ops.push(this.q("INSERT INTO attempts VALUES(?,?,?,?,?,?,?,?,?,?)", uid(), v.id, owner, "claim", status, b.challenge ? Number(b.challenge) : null, null, null, t, t));
      }
      if (b.status === "available") ops.push(this.q("UPDATE attempts SET status='void',updated=? WHERE venue_id=?", t, v.id));
      await this.db.batch(ops);
      return;
    }
    if (path === "/api/admin/attempt") {
      const a = await this.one("SELECT * FROM attempts WHERE id=?", b.id);
      check(a, "Attempt not found.", 404);
      check(text(b.reason, 300), "Enter a reason.");
      check(CHALLENGES.some((c) => c.id === Number(b.challenge)), "Select a challenge.");
      if (b.status && b.status !== a.status) {
        check(["failed", "vetoed"].includes(b.status) && ["failed", "vetoed"].includes(a.status), "Use venue correction to change ownership or reopen an attempt.");
      }
      await this.db.batch([this.q("UPDATE attempts SET challenge=?,status=?,updated=? WHERE id=?", Number(b.challenge), b.status || a.status, now(), a.id), this.audit("attempt corrected", { before: a, after: b })]);
      return;
    }
    if (path === "/api/admin/photo") {
      check(text(b.id, 100) && text(b.reason, 300), "Choose a photo and enter a reason.");
      await this.db.batch([this.q("UPDATE attempts SET photo=NULL WHERE photo=?", b.id), this.q("UPDATE attempts SET completion_photo=NULL WHERE completion_photo=?", b.id), this.q("DELETE FROM media WHERE id=? AND kind<>?", b.id, "logo"), this.audit("photo removed", { id: b.id, reason: b.reason })]);
      return;
    }
    throw new Problem("Unknown admin action.", 404);
  }
  broadcast() {
    for (const ws of this.ctx.getWebSockets()) {
      try {
        const a = ws.deserializeAttachment();
        if (a.expires < Date.now()) ws.close(4001, "Session expired");
        else ws.send("refresh");
      } catch {
      }
    }
  }
  closeSockets(token) {
    for (const ws of this.ctx.getWebSockets()) {
      if (ws.deserializeAttachment()?.token === token) ws.close(4001, "Signed out");
    }
  }
  closeTeamSockets(team) {
    for (const ws of this.ctx.getWebSockets()) {
      if (ws.deserializeAttachment()?.team === team) ws.close(4001, "Sign in again");
    }
  }
  webSocketMessage(ws) {
    if (ws.deserializeAttachment()?.expires < Date.now()) ws.close(4001, "Session expired");
  }
  webSocketClose(ws, code, reason) {
    ws.close(code, reason);
  }
  webSocketError(ws) {
    ws.close(1011, "Connection error");
  }
};
export {
  GameRoom,
  index_default as default,
  digest,
  passwordHash
};
//# sourceMappingURL=index.js.map
