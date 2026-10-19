import {TRAIN_ROUTES,countdownRemaining} from '../public/game-ui.js';
import { CHALLENGES } from './challenges.js';
const now = () => new Date().toISOString();
const uid = () => crypto.randomUUID();
const json = (data,status=200,headers={}) => Response.json(data,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...headers}});
class Problem extends Error { constructor(message,status=400){ super(message);this.status=status; } }
const check = (condition,message,status=400) => {if(!condition) throw new Problem(message,status);};
const text = (s,max=120) => typeof s==='string' && s.trim().length>0 && s.trim().length<=max;
const hex = b => [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('');
export async function digest(s){return hex(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)));}
export async function passwordHash(s,salt=uid()) {
  const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(s),'PBKDF2',false,['deriveBits']);
  const bits=await crypto.subtle.deriveBits({name:'PBKDF2',salt:new TextEncoder().encode(salt),iterations:100000,hash:'SHA-256'},key,256);
  return salt+':'+hex(bits);
}
async function passwordOK(s,stored){return typeof stored==='string' && (await passwordHash(s,stored.split(':')[0]))===stored;}
export default {fetch(request,env){return env.ROOM.get(env.ROOM.idFromName('bfny-v1')).fetch(request);}};
export class GameRoom {
  constructor(ctx,env){this.ctx=ctx;this.env=env;this.db=env.DB;}
  q(sql,...args){return this.db.prepare(sql).bind(...args);}
  async one(sql,...args){return this.q(sql,...args).first();}
  async all(sql,...args){return (await this.q(sql,...args).all()).results;}
  audit(action,detail){return this.q('INSERT INTO audit VALUES(?,?,?,?)',uid(),action,JSON.stringify(detail),now());}
  async fetch(request){
    // Serializes full read/check/write operations, including asynchronous D1 calls.
    return this.ctx.blockConcurrencyWhile(async()=>{
      try {return await this.route(request);} catch(e){
        if(!(e instanceof Problem)) console.error('Game request failed',e.message);
        return json({error:e instanceof Problem?e.message:'Server error. Check Worker logs and database migrations.'},e.status||500);
      }
    });
  }
  async auth(req){
    const token=req.headers.get('Cookie')?.match(/(?:^|;\s*)bfny_session=([^;]+)/)?.[1];
    check(token,'Please sign in.',401);
    const s=await this.one('SELECT * FROM sessions WHERE token=? AND expires>?',await digest(token),Date.now());
    check(s,'Session expired. Please sign in.',401);
    if(s.role==='team'){const t=await this.one('SELECT * FROM teams WHERE id=? AND active=1',s.team_id);check(t,'Team login disabled.',401);s.team=t;}
    return s;
  }
  async body(req){
    const raw=await req.text(); check(raw.length<20000,'Request too large.',413);
    try{return JSON.parse(raw);}catch{throw new Problem('Invalid JSON.');}
  }
  async route(req){
    const url=new URL(req.url), path=url.pathname, method=req.method;
    if(method!=='GET' || path==='/api/live') check(req.headers.get('Origin')===url.origin,'Request origin not allowed.',403);
    if(path==='/api/bootstrap' && method==='GET'){
      return json({teams:await this.all('SELECT id,name,color FROM teams WHERE active=1 ORDER BY name'),settings:await this.one('SELECT id,phase,logo FROM settings WHERE id=1')});
    }
    if(path==='/api/login' && method==='POST'){
      const b=await this.body(req);check(typeof b.passcode==='string' && b.passcode.length<=256,'Enter your passcode.');
      const ip=req.headers.get('CF-Connecting-IP')||'unknown';
      const rateKey=await digest(ip), limit=await this.one('SELECT * FROM login_limits WHERE key=?',rateKey);
      check(!limit || limit.reset<Date.now() || limit.count<20,'Too many login attempts. Wait 15 minutes.',429);
      await this.q('INSERT INTO login_limits VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=CASE WHEN reset<? THEN 1 ELSE count+1 END,reset=CASE WHEN reset<? THEN excluded.reset ELSE reset END',rateKey,Date.now()+900000,Date.now(),Date.now()).run();
      let role='team',team=null;
      if(b.admin){
        check(this.env.ADMIN_PASSWORD?.length>=12,'Admin password is not configured (minimum 12 characters).',503);
        check(await digest(b.passcode)===await digest(this.env.ADMIN_PASSWORD),'Incorrect login.',401); role='admin';
      } else {team=await this.one('SELECT * FROM teams WHERE id=? AND active=1',b.teamId||'');check(team && await passwordOK(b.passcode,team.password),'Incorrect login.',401);}
      await this.q('DELETE FROM login_limits WHERE key=?',rateKey).run();
      const token=uid()+uid(), expires=Date.now()+7*86400000;
      await this.db.batch([this.q('DELETE FROM sessions WHERE expires<?',Date.now()),this.q('INSERT INTO sessions VALUES(?,?,?,?)',await digest(token),team?.id||null,role,expires)]);
      return json({ok:true},200,{'Set-Cookie':`bfny_session=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=604800`});
    }
    // The game logo is deliberately public so it can be displayed before login.
    if(path.startsWith('/api/media/') && method==='GET'){
      const id=path.slice('/api/media/'.length), m=await this.one('SELECT * FROM media WHERE id=?',id);check(m,'Photo not found.',404);
      if(m.kind!=='logo') await this.auth(req);
      const f=await this.env.PHOTOS.get(id);check(f,'Photo not found.',404);
      return new Response(f.body,{headers:{'Content-Type':m.mime,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
    }
    const s=await this.auth(req);
    if(path==='/api/logout' && method==='POST'){
      await this.q('DELETE FROM sessions WHERE token=?',s.token).run();this.closeSockets(s.token);
      return json({ok:true},200,{'Set-Cookie':'bfny_session=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0'});
    }
    if(path==='/api/live' && method==='GET'){
      check(req.headers.get('Upgrade')?.toLowerCase()==='websocket','WebSocket required.',426);
      const pair=new WebSocketPair();this.ctx.acceptWebSocket(pair[1]);pair[1].serializeAttachment({token:s.token,team:s.team_id,expires:s.expires});
      return new Response(null,{status:101,webSocket:pair[0]});
    }
    if(path==='/api/state' && method==='GET') return json(await this.snapshot(s));
    if(path==='/api/upload' && method==='POST'){
      check(Number(req.headers.get('Content-Length')||0)<=8*1024*1024+2000,'Photo is too large (8 MB maximum).',413);
      const data=await req.formData(), file=data.get('file'), kind=data.get('kind')==='logo'?'logo':'photo';
      check(file && typeof file.arrayBuffer==='function' && file.size>0 && file.size<=8*1024*1024,'Choose a JPEG, PNG or WebP image under 8 MB.');
      if(kind==='logo') check(s.role==='admin','Admin only.',403);
      else check((await this.one('SELECT phase FROM settings WHERE id=1')).phase==='live' || s.role==='admin','The game is not live.',409);
      const bytes=new Uint8Array(await file.arrayBuffer());
      const mime=bytes[0]===255&&bytes[1]===216?'image/jpeg':bytes[0]===137&&bytes[1]===80&&bytes[2]===78&&bytes[3]===71?'image/png':new TextDecoder().decode(bytes.slice(0,4))==='RIFF'&&new TextDecoder().decode(bytes.slice(8,12))==='WEBP'?'image/webp':null;
      check(mime,'Unsupported image. Use JPEG, PNG or WebP.');
      const recent=await this.one('SELECT COUNT(*) AS n FROM media WHERE team_id IS ? AND created>?',s.team_id, new Date(Date.now()-3600000).toISOString());check(recent.n<100,'Upload limit reached. Ask the admin.',429);
      const id=uid(); await this.env.PHOTOS.put(id,bytes,{httpMetadata:{contentType:mime}});
      await this.q('INSERT INTO media VALUES(?,?,?,?,?)',id,s.team_id,kind,mime,now()).run();return json({id});
    }
    if(path.startsWith('/api/admin/') && method==='POST'){
      check(s.role==='admin','Admin only.',403); const b=await this.body(req); await this.admin(path,b);this.broadcast();return json({ok:true});
    }
    check(s.role==='team','Use a team login to play.',403);
    check((await this.one('SELECT phase FROM settings WHERE id=1')).phase==='live','The game is not live. Your submission was not recorded.',409);
    if(path==='/api/claim' && method==='POST'){
      const b=await this.body(req);
      check(text(b.placeId,300)&&text(b.name,200)&&typeof b.address==='string'&&b.address.length<=400,'Select a venue from Google search.');
      await this.photo(b.photo,s.team_id);
      let v=await this.one('SELECT * FROM venues WHERE id=?',b.placeId);
      const old=await this.one('SELECT * FROM attempts WHERE venue_id=? AND team_id=?',b.placeId,s.team_id);
      if(old && old.status!=='void') throw new Problem('Your team already has an attempt at this bar. Open it under Play.',409);
      check(!v||v.status==='available'||v.status==='open',v?.status==='locked'?'This bar is locked.':'This bar is claimed and its challenge is still in progress.',409);
      check(!v||v.owner!==s.team_id,'Your team cannot retry this bar.',409);
      const kind=v?.owner?'steal':'claim', id=uid(), t=now(), ops=[];
      if(!v) ops.push(this.q('INSERT INTO venues VALUES(?,?,?,?,?,?)',b.placeId,b.name.trim(),b.address.trim(),s.team_id,'claimed',t));
      else if(kind==='claim') ops.push(this.q("UPDATE venues SET owner=?,status='claimed',updated=? WHERE id=?",s.team_id,t,b.placeId));
      if(old) ops.push(this.q('DELETE FROM attempts WHERE id=?',old.id));
      ops.push(this.q('INSERT INTO attempts VALUES(?,?,?,?,?,?,?,?,?,?)',id,b.placeId,s.team_id,kind,'pending',null,b.photo,null,t,t));
      ops.push(this.audit(kind,{team:s.team_id,venue:b.placeId,attempt:id}));
      await this.db.batch(ops);this.broadcast();return json({id,kind});
    }
    if(path==='/api/outcome' && method==='POST'){
      const b=await this.body(req);check(['completed','failed','vetoed'].includes(b.status),'Choose an outcome.');
      check(Number.isInteger(b.challenge)&&CHALLENGES.some(c=>c.id===b.challenge),'Select a challenge.');
      const a=await this.one('SELECT * FROM attempts WHERE id=? AND team_id=?',b.id,s.team_id);check(a,'Attempt not found.',404);
      check(a.status==='pending','This attempt has already been resolved.',409);
      const v=await this.one('SELECT * FROM venues WHERE id=?',a.venue_id);
      check((a.kind==='claim'&&v.owner===s.team_id&&v.status==='claimed')||(a.kind==='steal'&&v.status==='open'),'This bar is no longer available for this attempt.',409);
      if(b.photo) await this.photo(b.photo,s.team_id);
      const t=now(), ops=[this.q('UPDATE attempts SET status=?,challenge=?,completion_photo=?,updated=? WHERE id=?',b.status,b.challenge,b.photo||null,t,a.id)];
      if(b.status==='completed'){
        ops.push(this.q("UPDATE venues SET owner=?,status='locked',updated=? WHERE id=?",s.team_id,t,v.id));
        ops.push(this.q("UPDATE attempts SET status='lost',updated=? WHERE venue_id=? AND id<>? AND status='pending'",t,v.id,a.id));
      } else if(a.kind==='claim') ops.push(this.q("UPDATE venues SET status='open',updated=? WHERE id=?",t,v.id));
      ops.push(this.audit(b.status,{team:s.team_id,attempt:a.id,venue:v.id,previousOwner:v.owner}));
      await this.db.batch(ops);this.broadcast();return json({ok:true});
    }
    throw new Problem('Not found.',404);
  }
  async photo(id,team){const m=await this.one("SELECT * FROM media WHERE id=? AND team_id=? AND kind='photo'",id||'',team);check(m,'Upload your team photo first.');}
  async snapshot(s){
    const settings=await this.one('SELECT * FROM settings WHERE id=1');
    const countdown=settings.countdown?JSON.parse(settings.countdown):null;delete settings.countdown;
    const events=await this.all("SELECT * FROM audit WHERE action IN ('claim','steal','completed') AND rowid>COALESCE((SELECT MAX(rowid) FROM audit WHERE action='game reset'),0) ORDER BY rowid DESC LIMIT 20");
    const data={serverTime:Date.now(),countdown,activity:events.map(e=>({id:e.id,action:e.action,...JSON.parse(e.detail)})),me:{role:s.role,id:s.team_id,name:s.team?.name||'Game admin'},settings,challenges:CHALLENGES,
      googleKey:this.env.GOOGLE_MAPS_BROWSER_KEY||'',
      teams:await this.all('SELECT t.id,t.name,t.color,t.active,t.adjustment,COUNT(v.id)+t.adjustment AS score FROM teams t LEFT JOIN venues v ON v.owner=t.id GROUP BY t.id ORDER BY score DESC,t.name'),
      venues:await this.all('SELECT * FROM venues ORDER BY updated DESC'),
      attempts:await this.all("SELECT * FROM attempts WHERE status<>'void' ORDER BY created DESC")};
    if(s.role==='admin') data.audit=await this.all('SELECT * FROM audit ORDER BY created DESC LIMIT 100');
    return data;
  }
  async admin(path,b){
    if(path==='/api/admin/countdown'){
      const row=await this.one('SELECT countdown FROM settings WHERE id=1');
      let timer=row.countdown?JSON.parse(row.countdown):null;
      const time=Date.now();
      if(b.action==='save'||b.action==='start'){
        check(text(b.label,100)&&text(b.address,400)&&Object.hasOwn(TRAIN_ROUTES,b.route),'Enter a destination label, address and train route.');
        check(Number.isInteger(b.seconds)&&b.seconds>0&&b.seconds<=604800,'Choose a duration from 1 second to 7 days.');
        timer={...timer,label:b.label.trim(),address:b.address.trim(),route:b.route,durationMs:b.seconds*1000};
        if(b.action==='start')timer={...timer,status:'running',endsAt:time+b.seconds*1000,remainingMs:b.seconds*1000};
        else if(!timer.status||timer.status==='idle')timer={...timer,status:'idle',remainingMs:b.seconds*1000,endsAt:null};
      }else{
        check(timer,'Configure a countdown first.',409);
        if(b.action==='pause'){
          check(timer.status==='running','The countdown is not running.',409);
          timer={...timer,status:'paused',remainingMs:countdownRemaining(timer,time),endsAt:null};
        }else if(b.action==='resume'){
          check(timer.status==='paused'&&timer.remainingMs>0,'There is no paused time to resume.',409);
          timer={...timer,status:'running',endsAt:time+timer.remainingMs};
        }else if(b.action==='extend'){
          check(timer.status!=='idle','Start the countdown before extending it.',409);
          check(Number.isInteger(b.seconds)&&b.seconds>0&&b.seconds<=604800,'Enter a positive extension up to 7 days.');
          const remaining=countdownRemaining(timer,time)+b.seconds*1000;
          check(remaining<=604800000,'The countdown cannot exceed 7 days.');
          timer={...timer,remainingMs:remaining,endsAt:timer.status==='running'?time+remaining:null};
        }else if(b.action==='cancel')timer={...timer,status:'idle',endsAt:null,remainingMs:timer.durationMs};
        else throw new Problem('Unknown countdown action.');
      }
      await this.db.batch([this.q('UPDATE settings SET countdown=? WHERE id=1',JSON.stringify(timer)),this.audit('countdown '+b.action,{label:timer.label,route:timer.route})]);return;
    }
    if(path==='/api/admin/reset'){
      check(b.confirmation==='RESET','Type RESET to confirm.');
      await this.db.batch([
        this.q('DELETE FROM attempts'),this.q('DELETE FROM venues'),
        this.q("DELETE FROM media WHERE kind<>'logo'"),this.q('DELETE FROM sessions'),
        this.q('DELETE FROM login_limits'),this.q('UPDATE teams SET adjustment=0'),
        this.q("UPDATE settings SET phase='setup',countdown=NULL WHERE id=1"),this.audit('game reset',{keptTeams:true})
      ]);
      for(const ws of this.ctx.getWebSockets())try{ws.close(4001,'Game reset. Sign in again.');}catch{}
      return;
    }
    if(path==='/api/admin/remove-team'){
      const t=await this.one('SELECT * FROM teams WHERE id=?',b.id);check(t,'Team not found.',404);
      check(b.confirmation===t.name,'Type the team name to confirm.');
      check(['delete','retire'].includes(b.action),'Choose delete or retire.');
      if(b.action==='delete'){
        const history=await this.one('SELECT id FROM attempts WHERE team_id=? LIMIT 1',t.id);
        const owned=await this.one('SELECT id FROM venues WHERE owner=? LIMIT 1',t.id);
        const media=await this.one('SELECT id FROM media WHERE team_id=? LIMIT 1',t.id);
        check(!history&&!owned&&!media&&!t.adjustment,'This team has gameplay history. Retire it, or reset the game before deleting it.',409);
      }
      await this.db.batch([this.q('DELETE FROM sessions WHERE team_id=?',t.id),
        b.action==='delete'?this.q('DELETE FROM teams WHERE id=?',t.id):this.q('UPDATE teams SET active=0 WHERE id=?',t.id),
        this.audit(b.action==='delete'?'team deleted':'team retired',{id:t.id,name:t.name})]);
      this.closeTeamSockets(t.id);return;
    }
    if(path==='/api/admin/team'){
      check(text(b.name,60)&&/^#[0-9a-fA-F]{6}$/.test(b.color),'Provide a team name and colour.');
      check(!b.passcode||(typeof b.passcode==='string'&&b.passcode.length>=6&&b.passcode.length<=128),'Team passcodes must be 6–128 characters.');
      const old=b.id?await this.one('SELECT * FROM teams WHERE id=?',b.id):null;
      check(!b.id||old,'Team not found.',404);check(old||b.passcode,'Set a passcode for the new team.');
      const duplicate=await this.one('SELECT id FROM teams WHERE name=? COLLATE NOCASE',b.name.trim());check(!duplicate||duplicate.id===b.id,'That team name is already in use.');
      const id=old?.id||uid(), hash=b.passcode?await passwordHash(b.passcode):old.password;
      const ops=[this.q('INSERT INTO teams(id,name,color,password,active) VALUES(?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,color=excluded.color,password=excluded.password,active=excluded.active',id,b.name.trim(),b.color,hash,b.active===false?0:1),this.audit('team updated',{id,name:b.name})];
      if(old&&(b.passcode||b.active===false)) ops.push(this.q('DELETE FROM sessions WHERE team_id=?',id));
      await this.db.batch(ops);if(old&&(b.passcode||b.active===false))this.closeTeamSockets(id);return;
    }
    if(path==='/api/admin/settings'){
      check(['setup','live','paused','ended'].includes(b.phase),'Invalid game phase.');
      if(b.logo)check(await this.one("SELECT id FROM media WHERE id=? AND kind='logo'",b.logo),'Upload a logo first.');
      await this.db.batch([this.q('UPDATE settings SET phase=?,logo=? WHERE id=1',b.phase,b.logo||null),this.audit('settings updated',{phase:b.phase})]);return;
    }
    if(path==='/api/admin/adjust'){
      check(Number.isInteger(b.adjustment)&&Math.abs(b.adjustment)<=100&&text(b.reason,300),'Enter an adjustment between -100 and 100 and a reason.');
      check(await this.one('SELECT id FROM teams WHERE id=?',b.teamId),'Team not found.');
      await this.db.batch([this.q('UPDATE teams SET adjustment=? WHERE id=?',b.adjustment,b.teamId),this.audit('score adjustment',b)]);return;
    }
    if(path==='/api/admin/venue'){
      const v=await this.one('SELECT * FROM venues WHERE id=?',b.id);check(v,'Venue not found.',404);
      check(text(b.reason,300)&&text(b.name,200)&&typeof b.address==='string'&&b.address.length<=400,'Provide venue details and a reason.');
      check(['available','claimed','open','locked'].includes(b.status),'Invalid venue status.');
      const owner=b.status==='available'?null:b.owner;check(!owner||await this.one('SELECT id FROM teams WHERE id=?',owner),'Team not found.');check(b.status==='available'||owner,'Choose an owner.');
      if(b.status==='locked')check(CHALLENGES.some(c=>c.id===Number(b.challenge)),'Select the completed challenge.');
      const t=now(),ops=[this.audit('venue correction',{before:v,after:b}),this.q('UPDATE venues SET name=?,address=?,owner=?,status=?,updated=? WHERE id=?',b.name.trim(),b.address.trim(),owner,b.status,t,v.id)];
      // Administrative ownership correction supersedes active competing attempts.
      ops.push(this.q("UPDATE attempts SET status='lost',updated=? WHERE venue_id=? AND status='pending'",t,v.id));
      if(owner){
        const a=await this.one('SELECT * FROM attempts WHERE venue_id=? AND team_id=?',v.id,owner);
        const status=b.status==='locked'?'completed':b.status==='open'?'failed':'pending';
        if(a)ops.push(this.q('UPDATE attempts SET status=?,kind=?,challenge=?,updated=? WHERE id=?',status,'claim',b.challenge?Number(b.challenge):null,t,a.id));
        else ops.push(this.q('INSERT INTO attempts VALUES(?,?,?,?,?,?,?,?,?,?)',uid(),v.id,owner,'claim',status,b.challenge?Number(b.challenge):null,null,null,t,t));
      }
      if(b.status==='available') ops.push(this.q("UPDATE attempts SET status='void',updated=? WHERE venue_id=?",t,v.id));
      await this.db.batch(ops);return;
    }
    if(path==='/api/admin/attempt'){
      const a=await this.one('SELECT * FROM attempts WHERE id=?',b.id);check(a,'Attempt not found.',404);check(text(b.reason,300),'Enter a reason.');
      check(CHALLENGES.some(c=>c.id===Number(b.challenge)),'Select a challenge.');
      if(b.status && b.status!==a.status){
        check(['failed','vetoed'].includes(b.status)&&['failed','vetoed'].includes(a.status),'Use venue correction to change ownership or reopen an attempt.');
      }
      await this.db.batch([this.q('UPDATE attempts SET challenge=?,status=?,updated=? WHERE id=?',Number(b.challenge),b.status||a.status,now(),a.id),this.audit('attempt corrected',{before:a,after:b})]);return;
    }
    if(path==='/api/admin/photo'){
      check(text(b.id,100)&&text(b.reason,300),'Choose a photo and enter a reason.');
      await this.db.batch([this.q('UPDATE attempts SET photo=NULL WHERE photo=?',b.id),this.q('UPDATE attempts SET completion_photo=NULL WHERE completion_photo=?',b.id),this.q('DELETE FROM media WHERE id=? AND kind<>?',b.id,'logo'),this.audit('photo removed',{id:b.id,reason:b.reason})]);
      // Leave inaccessible R2 bytes for recovery; no permanent media deletion from admin UI.
      return;
    }
    throw new Problem('Unknown admin action.',404);
  }
  broadcast(){for(const ws of this.ctx.getWebSockets()){try{const a=ws.deserializeAttachment();if(a.expires<Date.now())ws.close(4001,'Session expired');else ws.send('refresh');}catch{}}}
  closeSockets(token){for(const ws of this.ctx.getWebSockets()){if(ws.deserializeAttachment()?.token===token)ws.close(4001,'Signed out');}}
  closeTeamSockets(team){for(const ws of this.ctx.getWebSockets()){if(ws.deserializeAttachment()?.team===team)ws.close(4001,'Sign in again');}}
  webSocketMessage(ws){if(ws.deserializeAttachment()?.expires<Date.now())ws.close(4001,'Session expired');}
  webSocketClose(ws){try{ws.close(1000,'Closed');}catch{}}
  webSocketError(ws){ws.close(1011,'Connection error');}
}
