function agg(list,from,to){const t={spent:0,conv:0,leads:0,reach:0,impr:0,clicks:0};for(const ad of list)for(const[d,v]of Object.entries(ad.stats||{}))if(d>=from&&d<=to)for(const k in t)t[k]+=+v[k]||0;
t.cpc=t.conv?t.spent/t.conv:0;t.cpm=t.impr?t.spent/t.impr*1000:0;t.ctr=t.impr?t.clicks/t.impr*100:0;t.cpl=t.leads?t.spent/t.leads:0;return t}
const inr=v=>'₹'+(+v).toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2}),num=v=>(+v).toLocaleString('en-IN');
const ds=d=>d.toISOString().slice(0,10);
function esc(s){return String(s??'').replace(/[&<>"']/g,c=>'&#'+c.charCodeAt(0)+';')}
function ytId(u){const m=String(u).match(/(?:youtu\.be\/|v=|shorts\/|embed\/)([\w-]{11})/);return m&&m[1]}
