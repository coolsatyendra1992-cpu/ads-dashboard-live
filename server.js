const express=require('express'),fs=require('fs'),crypto=require('crypto'),path=require('path');
const app=express();app.use(express.json({limit:'2mb'}));
const PW=process.env.ADMIN_PASSWORD||(fs.existsSync('password.txt')?fs.readFileSync('password.txt','utf8').trim():'change-me');
const DBF=path.join(__dirname,'db.json');let pool=null,db;
const id=()=>crypto.randomBytes(5).toString('hex'),tok=()=>crypto.randomBytes(9).toString('base64url');
function seed(){const ad={id:id(),name:'harrai 22 oct Video Ad',status:'ACTIVE',video:'',budget:150,budgetType:'daily',stats:{'2026-10-22':{spent:127.82,conv:4,leads:0,reach:1850,impr:2410,clicks:37}}};
return{clients:[{id:id(),name:'Demo Client (demo data)',token:tok(),active:true,demo:true,campaigns:[{id:id(),name:'harrai 22 oct Engagement Campaign',status:'ACTIVE',adsets:[{id:id(),name:'Chhindwara 18-45',status:'ACTIVE',ads:[ad]}]}]}]}}
async function load(){if(process.env.DATABASE_URL){const{Pool}=require('pg');pool=new Pool({connectionString:process.env.DATABASE_URL,ssl:{rejectUnauthorized:false}});
await pool.query('create table if not exists ads_dash(k text primary key,v jsonb)');const r=await pool.query("select v from ads_dash where k='db'");db=r.rows[0]?r.rows[0].v:seed();}
else db=fs.existsSync(DBF)?JSON.parse(fs.readFileSync(DBF)):seed();await save();}
async function save(){if(pool)await pool.query("insert into ads_dash values('db',$1) on conflict(k) do update set v=$1",[db]);else fs.writeFileSync(DBF,JSON.stringify(db,null,1));}
const auth=(q,s,n)=>q.get('x-admin-key')===PW?n():s.status(401).json({e:'unauthorized'});
app.get('/api/r/:t',(q,s)=>{const c=db.clients.find(c=>c.token===q.params.t&&c.active);if(!c)return s.status(404).json({e:'Link not found or disabled'});const{token,...rest}=c;s.json(rest)});
app.get('/api/admin/db',auth,(q,s)=>s.json(db));
app.put('/api/admin/db',auth,async(q,s)=>{if(!q.body||!Array.isArray(q.body.clients))return s.status(400).end();db=q.body;await save();s.json({ok:1})});
app.get('/api/admin/newid',auth,(q,s)=>s.json({id:id(),token:tok()}));
app.use(express.static(path.join(__dirname,'public')));
app.get('/r/:t',(q,s)=>s.sendFile(path.join(__dirname,'public/client.html')));
app.get('/admin',(q,s)=>s.sendFile(path.join(__dirname,'public/admin.html')));
app.get('/',(q,s)=>s.send('Ads Performance Dashboard'));
load().then(()=>app.listen(process.env.PORT||8131,()=>console.log('up')));
