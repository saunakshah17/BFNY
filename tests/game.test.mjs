import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {GameRoom} from '../worker/index.js';
class D1 {
 constructor(){this.db=new DatabaseSync(':memory:');this.db.exec(readFileSync(new URL('../migrations/0001_initial.sql',import.meta.url),'utf8'));}
 prepare(sql){const db=this.db;let args=[];return {bind(...a){args=a;return this;},async first(){return db.prepare(sql).get(...args)||null;},async all(){return {results:db.prepare(sql).all(...args)};},async run(){const r=db.prepare(sql).run(...args);return {success:true,meta:{changes:Number(r.changes)}};}};}
 async batch(stmts){this.db.exec('BEGIN');try{const results=[];for(const s of stmts)results.push(await s.run());this.db.exec('COMMIT');return results;}catch(e){this.db.exec('ROLLBACK');throw e;}}
}
async function setup(){
 const DB=new D1(),objects=new Map();let tail=Promise.resolve();
 const ctx={blockConcurrencyWhile(fn){const run=tail.then(fn);tail=run.catch(()=>{});return run;},getWebSockets(){return [];}};
 const game=new GameRoom(ctx,{DB,ADMIN_PASSWORD:'Long-admin-secret-2026',GOOGLE_MAPS_BROWSER_KEY:'test',PHOTOS:{async put(id,bytes){objects.set(id,bytes);},async get(id){return objects.has(id)?{body:objects.get(id)}:null;}}});
 const req=async(path,body,cookie,origin='https://game.example')=>{const r=await game.fetch(new Request('https://game.example/api/'+path,{method:body?'POST':'GET',headers:{Origin:origin,...(cookie?{Cookie:cookie}:{}),...(body&&!(body instanceof FormData)?{'Content-Type':'application/json'}:{})},body:body?body instanceof FormData?body:JSON.stringify(body):undefined}));let data;try{data=await r.clone().json();}catch{data=null;}return {status:r.status,data,cookie:r.headers.get('Set-Cookie')?.split(';')[0]};};
 const admin=(await req('login',{admin:true,passcode:'Long-admin-secret-2026'})).cookie;
 const teams=[];for(const name of ['Mets','Queens','Brooklyn']){assert.equal((await req('admin/team',{name,color:'#ffcc00',passcode:'secret123'},admin)).status,200);}
 const st=(await req('state',null,admin)).data;
 for(const t of st.teams){teams.push({...t,cookie:(await req('login',{teamId:t.id,passcode:'secret123'})).cookie});}
 await req('admin/settings',{phase:'live'},admin);
 const upload=async(cookie,kind='photo')=>{const f=new FormData();f.append('file',new Blob([new Uint8Array([137,80,78,71,13,10,26,10])],{type:'image/png'}),'test.png');f.append('kind',kind);return req('upload',f,cookie);};
 const claim=async(t,placeId='bar-1')=>req('claim',{placeId,name:'Test Bar',address:'NYC',photo:(await upload(t.cookie)).data.id},t.cookie);
 return {DB,req,admin,teams,upload,claim};
}
test('claim, fail, competing steals, lock, point transfer, no retry',async()=>{
 const {req,admin,teams:[a,b,c],claim}=await setup();
 const original=await claim(a);assert.equal(original.status,200);assert.equal(original.data.kind,'claim');
 assert.equal((await claim(b)).status,409);
 assert.equal((await req('outcome',{id:original.data.id,status:'completed',challenge:31},a.cookie)).status,400);
 assert.equal((await req('outcome',{id:original.data.id,status:'failed',challenge:1},b.cookie)).status,404);
 assert.equal((await req('outcome',{id:original.data.id,status:'failed',challenge:1},a.cookie)).status,200);
 assert.equal((await claim(a)).status,409);
 const [sb,sc]=await Promise.all([claim(b),claim(c)]);assert.equal(sb.status,200);assert.equal(sc.status,200);
 let st=(await req('state',null,admin)).data;assert.equal(st.teams.find(t=>t.id===a.id).score,1);assert.equal(st.teams.find(t=>t.id===b.id).score,0);
 const results=await Promise.all([req('outcome',{id:sb.data.id,status:'completed',challenge:2},b.cookie),req('outcome',{id:sc.data.id,status:'completed',challenge:3},c.cookie)]);
 assert.deepEqual(results.map(r=>r.status).sort(),[200,409]);
 st=(await req('state',null,admin)).data;assert.equal(st.venues[0].status,'locked');assert.equal(st.teams.find(t=>t.id===a.id).score,0);assert.equal(st.teams.reduce((n,t)=>n+t.score,0),1);
 assert.equal(st.attempts.filter(a=>a.status==='completed').length,1);assert.equal(st.attempts.filter(a=>a.status==='lost').length,1);
 assert.equal((await claim(a)).status,409);
});
test('failed steal preserves owner; veto and pending claim rules',async()=>{
 const {req,admin,teams:[a,b,c],claim}=await setup();const original=await claim(a);
 await req('outcome',{id:original.data.id,status:'vetoed',challenge:5},a.cookie);
 const steal=await claim(b);await req('outcome',{id:steal.data.id,status:'failed',challenge:6},b.cookie);
 assert.equal((await claim(b)).status,409);
 let st=(await req('state',null,admin)).data;assert.equal(st.venues[0].owner,a.id);assert.equal(st.venues[0].status,'open');assert.equal(st.teams.find(t=>t.id===a.id).score,1);
 assert.equal((await claim(c)).status,200);
});
test('normal locking adds no points and duplicate submissions do not score twice',async()=>{
 const {req,admin,teams:[a],claim}=await setup();const c=await claim(a);
 assert.equal((await claim(a)).status,409);
 assert.equal((await req('outcome',{id:c.data.id,status:'completed',challenge:10},a.cookie)).status,200);
 assert.equal((await req('outcome',{id:c.data.id,status:'completed',challenge:10},a.cookie)).status,409);
 const st=(await req('state',null,admin)).data;assert.equal(st.teams.find(t=>t.id===a.id).score,1);
});
test('authentication, private media, admin access, CSRF, passcode reset',async()=>{
 const {req,admin,teams:[a],upload}=await setup();
 assert.equal((await req('state')).status,401);
 assert.equal((await req('admin/settings',{phase:'ended'},a.cookie)).status,403);
 assert.equal((await req('admin/settings',{phase:'ended'},admin,'https://evil.example')).status,403);
 const img=await upload(a.cookie);assert.equal(img.status,200);
 assert.equal((await req('media/'+img.data.id)).status,401);
 assert.equal((await req('media/'+img.data.id,null,a.cookie)).status,200);
 assert.equal((await upload(a.cookie,'logo')).status,403);
 const logo=await upload(admin,'logo');assert.equal((await req('media/'+logo.data.id)).status,200);
 await req('admin/team',{id:a.id,name:a.name,color:'#123456',passcode:'replacement'},admin);
 assert.equal((await req('state',null,a.cookie)).status,401);
});
test('photos cannot be borrowed, unsupported files rejected, paused/end gate writes',async()=>{
 const {req,admin,teams:[a,b],upload,claim}=await setup();const img=await upload(a.cookie);
 assert.equal((await req('claim',{placeId:'a',name:'Bar',address:'NY',photo:img.data.id},b.cookie)).status,400);
 const f=new FormData();f.append('file',new Blob(['<svg onload=alert(1)>'],{type:'image/png'}),'bad.png');assert.equal((await req('upload',f,a.cookie)).status,400);
 const c=await claim(a);
 for(const phase of ['paused','ended']){await req('admin/settings',{phase},admin);assert.equal((await req('outcome',{id:c.data.id,status:'completed',challenge:1},a.cookie)).status,409);assert.equal((await req('upload',f,a.cookie)).status,409);}
});
test('admin corrections, audit, adjustment, photo moderation, undo and retry',async()=>{
 const {req,admin,teams:[a,b],claim}=await setup();const c=await claim(a);await req('outcome',{id:c.data.id,status:'failed',challenge:1},a.cookie);
 await req('admin/attempt',{id:c.data.id,challenge:4,status:'vetoed',reason:'Wrong card'},admin);
 let st=(await req('state',null,admin)).data;assert.equal(st.attempts[0].challenge,4);assert.equal(st.attempts[0].status,'vetoed');
 assert.equal((await req('admin/venue',{id:'bar-1',name:'Fixed',address:'NY',owner:b.id,status:'locked',challenge:7,reason:'Correct winner'},admin)).status,200);
 await req('admin/adjust',{teamId:a.id,adjustment:2,reason:'Bonus correction'},admin);
 st=(await req('state',null,admin)).data;assert.equal(st.teams.find(t=>t.id===a.id).score,2);assert.equal(st.teams.find(t=>t.id===b.id).score,1);
 const img=st.attempts.find(t=>t.id===c.data.id).photo;await req('admin/photo',{id:img,reason:'Wrong photo'},admin);assert.equal((await req('media/'+img,null,a.cookie)).status,404);
 await req('admin/venue',{id:'bar-1',name:'Fixed',address:'NY',status:'available',reason:'Wrong venue'},admin);
 assert.equal((await claim(a)).status,200);st=(await req('state',null,admin)).data;assert.ok(st.audit.some(a=>a.action==='venue correction'));
});
test('simultaneous first claims only create one owner and one attempt',async()=>{
 const {req,admin,teams:[a,b],claim}=await setup();const r=await Promise.all([claim(a),claim(b)]);assert.deepEqual(r.map(x=>x.status).sort(),[200,409]);const st=(await req('state',null,admin)).data;assert.equal(st.attempts.length,1);assert.equal(st.teams.reduce((n,t)=>n+t.score,0),1);
});
