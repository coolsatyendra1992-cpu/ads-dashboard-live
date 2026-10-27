const express=require('express'),fs=require('fs'),crypto=require('crypto'),path=require('path');
const app=express();app.use(express.json({limit:'2mb'}));
const PW=process.env.ADMIN_PASSWORD||(fs.existsSync('password.txt')?fs.readFileSync('password.txt','utf8').trim():'change-me');
const DBF=path.join(__dirname,'db.json');let pool=null,db;
const id=()=>crypto.randomBytes(5).toString('hex'),tok=()=>crypto.randomBytes(9).toString('base64url');
const todayIST=()=>new Date(Date.now()+5.5*3600e3).toISOString().slice(0,10);
async function load(){if(process.env.DATABASE_URL){const{Pool}=require('pg');pool=new Pool({connectionString:process.env.DATABASE_URL,ssl:{rejectUnauthorized:false}});
await pool.query('create table if not exists ads_dash(k text primary key,v jsonb)');const r=await pool.query("select v from ads_dash where k='db'");db=migAll(r.rows[0]?r.rows[0].v:{clients:[]});}
else db=migAll(fs.existsSync(DBF)?JSON.parse(fs.readFileSync(DBF)):{clients:[]});}
async function save(){if(pool)await pool.query("insert into ads_dash values('db',$1) on conflict(k) do update set v=$1",[db]);else fs.writeFileSync(DBF,JSON.stringify(db,null,1));}
const auth=(q,s,n)=>q.get('x-admin-key')===PW?n():s.status(401).json({e:'unauthorized'});
const same=(a,b)=>JSON.stringify({reach:+(a||{}).reach||0,leads:+(a||{}).leads||0})===JSON.stringify({reach:+(b||{}).reach||0,leads:+(b||{}).leads||0});
// migrate old campaign shape -> rates[] + pauses[]
function mig(cp){if(!Array.isArray(cp.rates))cp.rates=[{from:cp.start||todayIST(),plan:+cp.plan||0}];
 if(!Array.isArray(cp.pauses)){cp.pauses=[];if(cp.pausedAt)cp.pauses.push({from:cp.pausedAt,to:null})}
 delete cp.pausedAt;delete cp.pausedMs;cp.status=cp.status==='PAUSED'?'PAUSED':'ACTIVE';return cp}
function migAll(d){d.v=3;for(const c of d.clients||[])for(const cp of c.campaigns||[])mig(cp);return d}
// validate + carry server-managed fields (rates history, pause intervals)
function merge(nw){if(!nw||!Array.isArray(nw.clients))throw 'bad body';
const old={};for(const c of db.clients)for(const cp of c.campaigns||[])old[cp.id]=cp;const t=todayIST(),now=Date.now();
for(const c of nw.clients)for(const cp of c.campaigns||[]){const o=old[cp.id];cp.days=cp.days||{};cp.plan=+cp.plan||0;
 const ds=new Set([...Object.keys(cp.days),...Object.keys(o?o.days||{}:{})]);
 for(const d of ds)if(d<t&&!same(cp.days[d],o&&o.days[d]))throw 'Purani date '+d+' locked hai ('+cp.name+')';
 if(!o){delete cp.rates;delete cp.pauses;mig(cp);if(cp.status==='PAUSED')cp.pauses=[{from:now,to:null}];continue}
 cp.rates=JSON.parse(JSON.stringify(o.rates));cp.pauses=JSON.parse(JSON.stringify(o.pauses));
 if(cp.start!==o.start&&cp.rates.length===1)cp.rates[0].from=cp.start;
 if(cp.plan!==o.plan){const f=cp.start>t?cp.start:t;cp.rates=cp.rates.filter(r=>r.from<f);cp.rates.push({from:f,plan:cp.plan})}
 const open=cp.pauses.find(p=>!p.to);
 if(cp.status==='PAUSED'&&!open)cp.pauses.push({from:now,to:null});
 if(cp.status==='ACTIVE'&&open)open.to=now;
 delete cp.pausedAt;delete cp.pausedMs}
nw.v=3;return nw}
app.get('/api/r/:t',(q,s)=>{const c=db.clients.find(c=>c.token===q.params.t&&c.active);if(!c)return s.status(404).json({e:'Link not found or disabled'});
s.json({name:c.name,now:Date.now(),campaigns:(c.campaigns||[]).filter(x=>x.status==='ACTIVE').map(({id,name,plan,start,end,pkg,video,days,rates,pauses})=>({id,name,plan,start,end,pkg,video,days,rates,pauses}))})});
app.get('/api/admin/db',auth,(q,s)=>s.json({...db,today:todayIST()}));
app.put('/api/admin/db',auth,async(q,s)=>{try{const{today,...b}=q.body||{};db=merge(b.v===3?b:migAll(b));await save();s.json({ok:1})}catch(e){s.status(400).json({e:String(e)})}});
app.get('/api/admin/newid',auth,(q,s)=>s.json({id:id(),token:tok()}));
app.use(express.static(path.join(__dirname,'public')));
app.get('/r/:t',(q,s)=>s.sendFile(path.join(__dirname,'public/client.html')));
app.get('/admin',(q,s)=>s.sendFile(path.join(__dirname,'public/admin.html')));
app.get('/',(q,s)=>s.send('Ads Performance Dashboard'));
load().then(()=>app.listen(process.env.PORT||8131,()=>console.log('up')));
