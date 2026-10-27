const IST=5.5*3600e3,DAY=864e5;
const inr=v=>'₹'+(+v).toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2}),inr0=v=>'₹'+Math.round(+v).toLocaleString('en-IN'),num=v=>(+v).toLocaleString('en-IN');
function esc(s){return String(s??'').replace(/[&<>"']/g,c=>'&#'+c.charCodeAt(0)+';')}
const istDate=ms=>new Date(ms+IST).toISOString().slice(0,10);
const istMidnight=d=>Date.parse(d+'T00:00:00Z')-IST;
// plan used: per-day rate (rates[] history) x active time, minus pause intervals; capped by end date and package
function rateOn(c,d){let p=+c.plan||0;const rs=(c.rates||[]).slice().sort((a,b)=>a.from<b.from?-1:1);if(rs.length){p=rs[0].plan;for(const r of rs)if(r.from<=d)p=r.plan}return +p||0}
function planUsed(c,now){if(!c.start)return 0;let endMs=now;if(c.end)endMs=Math.min(endMs,istMidnight(c.end)+DAY);
 const ps=(c.pauses||[]).map(p=>[p.from,p.to||Infinity]);let u=0;
 for(let s=istMidnight(c.start);s<endMs;s+=DAY){const e=Math.min(s+DAY,endMs);let act=e-s;
  for(const[a,b]of ps)act-=Math.max(0,Math.min(e,b)-Math.max(s,a));u+=rateOn(c,istDate(s))*Math.max(0,act)/DAY}
 if(c.pkg)u=Math.min(u,+c.pkg);return u}
function sumDays(c){let r=0,l=0;for(const v of Object.values(c.days||{})){r+=+v.reach||0;l+=+v.leads||0}return{reach:r,leads:l}}
