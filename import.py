import csv,json,re,secrets,collections
md=open('/workspace/out/dashboard_shriji_tractor.md').read()
rows=[l.split('|')[1:-1] for l in md.splitlines() if re.match(r'\|\s*\|\s*\S',l)]
vids=[x.split()[-1] for x in re.search(r'Video IDs: (.*)',md).group(1).split(';')]
assert len(vids)==len(rows),(len(vids),len(rows))
daily=collections.defaultdict(dict)
for r in csv.DictReader(open('/workspace/out/dashboard_shriji_tractor.csv')):
  daily[r['ad_id']][r['date']]=dict(spent=float(r['spend']),conv=float(r['conversations']),leads=float(r['leads']),reach=float(r['reach']),impr=float(r['impressions']),clicks=float(r['clicks']))
nid=lambda:secrets.token_hex(5)
cl={k:dict(id=nid(),name=k,token=secrets.token_urlsafe(9),active=True,campaigns=[]) for k in ['Shree Ji','Tractor']}
f=lambda x:float(x) if x.strip() else 0.0
for r,v in zip(rows,vids):
  r=[x.strip() for x in r]; camp,cst,ad,aid,ast,bud=r[1],r[2],r[3],r[4],r[5],r[6]
  c=cl['Shree Ji' if camp.lower().startswith('shri') else 'Tractor']
  page='109882964081935' if camp.startswith('tractor 15') else '105722911596678' if c['name']=='Tractor' else '353635151155410'
  cp=next((x for x in c['campaigns'] if x['name']==camp),None)
  if not cp: cp=dict(id=nid(),name=camp,status='ACTIVE' if cst=='ACTIVE' else 'PAUSED',adsets=[dict(id=nid(),name=camp.replace('Campaign','Ad set'),status='ACTIVE' if cst=='ACTIVE' else 'PAUSED',ads=[])]);c['campaigns'].append(cp)
  st=dict(daily.get(aid,{}))
  life=dict(spent=f(r[7]),reach=f(r[8]),impr=f(r[9]),clicks=f(r[10]),conv=f(r[12]),leads=f(r[13]))
  rem={k:round(life[k]-sum(d[k] for d in st.values()),2) for k in life}
  if any(x>0.5 for x in rem.values()):
    start=r[15].split('→')[0] or '2026-10-24'
    first=min(st) if st else None
    if first and start>=first:
      import datetime;start=str(datetime.date.fromisoformat(first)-datetime.timedelta(days=1))
    st[start]={k:max(0,v) for k,v in rem.items()}
  cp['adsets'][0]['ads'].append(dict(id=nid(),name=ad,adId=aid,status='ACTIVE' if ast=='ACTIVE' and cst=='ACTIVE' else 'PAUSED',video=f'https://www.facebook.com/{page}/videos/{v}',budget=f(bud),budgetType='daily',stats=st))
json.dump(dict(clients=list(cl.values())),open('db.json','w'),indent=1)
for c in cl.values(): print(c['name'],c['token'],len(c['campaigns']))
