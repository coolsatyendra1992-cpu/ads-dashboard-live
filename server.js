const express=require('express'),fs=require('fs'),crypto=require('crypto'),path=require('path');
const app=express();app.use(express.json({limit:'2mb'}));
const PW=process.env.ADMIN_PASSWORD||(fs.existsSync('password.txt')?fs.readFileSync('password.txt','utf8').trim():'change-me');
const DBF=path.join(__dirname,'db.json');let pool=null,db;
const id=()=>crypto.randomBytes(5).toString('hex'),tok=()=>crypto.randomBytes(9).toString('base64url');
const todayIST=()=>new Date(Date.now()+5.5*3600e3).toISOString().slice(0,10);
async function load(){if(process.env.DATABASE_URL){const{Pool}=require('pg');pool=new Pool({connectionString:process.env.DATABASE_URL,ssl:{rejectUnauthorized:false}});
await pool.query('create table if not exists ads_dash(k text primary key,v jsonb)');const r=await pool.query("select v from ads_dash where k='db'");db=r.rows[0]?r.rows[0].v:{v:2,clients:[]};}
else db=fs.existsSync(DBF)?JSON.parse(fs.readFileSync(DBF)):{v:2,clients:[]};}
async function save(){if(pool)await pool.query("insert into ads_dash values('db',$1) on conflict(k) do update set v=$1",[db]);else fs.writeFileSync(DBF,JSON.stringify(db,null,1));}
const auth=(q,s,n)=>q.get('x-admin-key')===PW?n():s.status(401).json({e:'unauthorized'});
const same=(a,b)=>JSON.stringify({reach:+(a||{}).reach||0,leads:+(a||{}).leads||0})===JSON.stringify({reach:+(b||{}).reach||0,leads:+(b||{}).leads||0});
// validate + carry server-managed fields
function merge(nw){if(!nw||!Array.isArray(nw.clients))throw 'bad body';if(db.v!==2)return Object.assign(nw,{v:2});
const old={};for(const c of db.clients)for(const cp of c.campaigns||[])old[cp.id]=cp;const t=todayIST(),now=Date.now();
for(const c of nw.clients)for(const cp of c.campaigns||[]){const o=old[cp.id];cp.days=cp.days||{};
 const ds=new Set([...Object.keys(cp.days),...Object.keys(o?o.days||{}:{})]);
 for(const d of ds)if(d<t&&!same(cp.days[d],o&&o.days[d]))throw 'Past date '+d+' is locked ('+cp.name+')';
 cp.pausedMs=o?o.pausedMs||0:0;cp.pausedAt=o?o.pausedAt||null:null;
 if(cp.status==='PAUSED'&&!cp.pausedAt)cp.pausedAt=now;
 if(cp.status==='ACTIVE'&&cp.pausedAt){cp.pausedMs+=now-cp.pausedAt;cp.pausedAt=null}}
nw.v=2;return nw}
app.get('/api/r/:t',(q,s)=>{const c=db.clients.find(c=>c.token===q.params.t&&c.active);if(!c)return s.status(404).json({e:'Link not found or disabled'});
s.json({name:c.name,now:Date.now(),campaigns:(c.campaigns||[]).filter(x=>x.status==='ACTIVE').map(({id,name,plan,start,end,pkg,video,days,pausedMs})=>({id,name,plan,start,end,pkg,video,days,pausedMs}))})});
app.get('/api/admin/db',auth,(q,s)=>s.json({...db,today:todayIST()}));
app.put('/api/admin/db',auth,async(q,s)=>{try{const{today,...b}=q.body||{};db=merge(b);await save();s.json({ok:1})}catch(e){s.status(400).json({e:String(e)})}});
app.get('/api/admin/newid',auth,(q,s)=>s.json({id:id(),token:tok()}));
app.use(express.static(path.join(__dirname,'public')));
app.get('/r/:t',(q,s)=>s.sendFile(path.join(__dirname,'public/client.html')));
app.get('/admin',(q,s)=>s.sendFile(path.join(__dirname,'public/admin.html')));
app.get('/',(q,s)=>s.send('Ads Performance Dashboard'));
load().then(()=>app.listen(process.env.PORT||8131,()=>console.log('up')));
