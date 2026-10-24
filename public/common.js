const IST=5.5*3600e3,DAY=864e5;
const inr=v=>'₹'+(+v).toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2}),inr0=v=>'₹'+Math.round(+v).toLocaleString('en-IN'),num=v=>(+v).toLocaleString('en-IN');
function esc(s){return String(s??'').replace(/[&<>"']/g,c=>'&#'+c.charCodeAt(0)+';')}
const istDate=ms=>new Date(ms+IST).toISOString().slice(0,10);
const istMidnight=d=>Date.parse(d+'T00:00:00Z')-IST;
// plan used: elapsed active time since start 00:00 IST * plan/day, capped by end date and package
function planUsed(c,now){if(!c.plan||!c.start)return 0;let endMs=now;if(c.end)endMs=Math.min(endMs,istMidnight(c.end)+DAY);
let el=Math.max(0,endMs-istMidnight(c.start)-(c.pausedMs||0));let u=c.plan*el/DAY;if(c.pkg)u=Math.min(u,+c.pkg);return u}
function sumDays(c){let r=0,l=0;for(const v of Object.values(c.days||{})){r+=+v.reach||0;l+=+v.leads||0}return{reach:r,leads:l}}
