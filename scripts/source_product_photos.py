"""Source real catalogue imagery; never substitute generated illustrations.
Source URLs and family-level matching are recorded for review.
"""
from pathlib import Path
from urllib.request import urlopen
from urllib.parse import urljoin
import re, json, csv, shutil, concurrent.futures
ROOT=Path(__file__).resolve().parents[1]
BASE='https://www.janatics.com/'
photos={}
def asset(key,path,page):
    url=urljoin(BASE,path); local='assets/products/'+key+Path(path).suffix
    photos[key]={'path':local,'url':url,'source_page':urljoin(BASE,page),'match':'Product family photo; size and configuration may vary'}
def jan(key,folder,file,page):asset(key,'assets/images/products/fa/pneumatics/'+folder+'/'+file+'.jpg',page)
jan('ds2','valve/compact_valves','ds2','dcv_compact_valves.php')
jan('ds2-double','valve/compact_valves','5_2_double','dcv_compact_valves.php')
jan('ds2-block','valve/compact_valves','blocked_type','dcv_compact_valves.php')
for key,file in [('e-valve','solenoid_valve'),('ef-valve','solenoid_valve_ef'),('manual','manual_mechanical_valves'),('manifold','manifold'),('rotary','rotary_slide_valve'),('coil','solenoid_connectors'),('pulse','pulse_valve')]:jan(key,'valve',file,'dcv_directional_control_valve.php')
for key,file in [('union','union'),('straight','straight_connector'),('elbow','elbow_connector'),('tee','tee_connector'),('y','y_shape_fitting'),('swivel','swivel_fitting'),('gun','air_blow_gun'),('plug','plug'),('quick-coupler','quick_coupler'),('self-sealing','self_sealing_fittings')]:jan(key,'one_touch_fittings',file,'otf_one_touch_fittings.php')
for key,file in [('filter','filter'),('regulator','regulator'),('lubricator','lubricator'),('frl','frlm'),('shutoff','shut_off_valve')]:jan(key,'air_preparation_unit',file,'apu_air_preparation_unit.php')
for key,file in [('flow','flow_control_valve'),('exhaust','quick_exhaust_valve'),('nrv','non_return_valve'),('pilot-nrv','pilot_opt_nrv'),('slide','inline_slide_valve'),('logic','and_valve')]:jan(key,'air_line_valve',file,'av_airline_valve.php')
for key,file in [('tube','polyurethane_tubes'),('coiled-tube','polyurethane_coiled_tubes')]:jan(key,'tubes',file,'tb_tubes.php')
for key,file in [('cylinder','tie_rod_cylinders'),('round-cylinder','miniature_cylinders'),('compact-cylinder','compact_cylinders'),('reed','sensor')]:jan(key,'cylinders',file,'cy_cylinders.php')
# Business-owned photographs supplied in the Facebook clipping. Preserve original bytes.
md=(ROOT/'docs/Facebook Page F Rahman Enterprises.md').read_text(encoding='utf-8')
fb=list(dict.fromkeys(re.findall(r'!\[[^\]]*\]\((https://scontent[^)]+)\)',md)))
for key,i in [('gauge-glass',3),('glass-tube',3),('reflex-glass',5),('shop-valve',7),('steam-trap',11),('level-assembly',14),('nozzle',16),('fusible-plug',20),('gauge',21),('ss-fittings',26),('level-controller',28),('air-break-switch',29)]:
    photos[key]={'path':'assets/products/'+key+'.jpg','url':fb[i],'source_page':'https://www.facebook.com/frahmanenterprises','match':'Business product-family photo; size and configuration may vary'}
# Discover family photos from the actual manufacturer series pages.
uflow_base='https://www.uflowvalve.com/solenoid-valve/series/mcn-series/pr-series'
html=urlopen(uflow_base,timeout=25).read().decode()
links=set(re.findall(r'href=["\']([^"\']+)["\']',html))
families=['mcn','pcn','hcp','pbn','pbu','dac','das','dcc','dcs','ycp','jan']
def discover(family):
    matches=[u for u in links if '/series/'+family+'-series/' in u]
    if not matches:return
    page=sorted(matches)[0]
    try:
        body=urlopen(page,timeout=25).read().decode()
        images=re.findall(r'<img[^>]+src=["\']([^"\']+)["\']',body)
        candidates=[u for u in images if '/Assets/Product/' in u and re.search(r'\.(webp|png|jpg)$',u,re.I)]
        if candidates:
            u=candidates[0];photos['uflow-'+family]={'path':'assets/products/uflow-'+family+Path(u).suffix,'url':u,'source_page':page,'match':family.upper()+' series photo; size and configuration may vary'}
    except Exception as exc:print('Discovery failed',family,str(exc))
with concurrent.futures.ThreadPoolExecutor(6) as pool:list(pool.map(discover,families))
def download(item):
    key,p=item
    try:
        data=urlopen(p['url'],timeout=30).read()
        if len(data)<1500:raise ValueError('Not a usable product image')
        (ROOT/p['path']).write_bytes(data)
        return key
    except Exception as exc:print('Download failed',key,str(exc));return None
(ROOT/'assets/products').mkdir(exist_ok=True)
with concurrent.futures.ThreadPoolExecutor(8) as pool:good=set(pool.map(download,photos.items()))
photos={k:v for k,v in photos.items() if k in good}

def match(p):
    brand=p['brand'];sub=p['subcategory'].lower();desc=p['description'].upper();model=re.sub(r'\s+','',p['model']).upper()
    if brand=='Janatics':
        if 'NORGREN' in desc:return None
        if p['category']=='Cylinders':return 'compact-cylinder' if model.startswith('A12') else 'round-cylinder' if model.startswith('A23') else 'cylinder'
        if p['category']=='Tubes & hoses':return 'coiled-tube' if 'spiral' in sub else 'tube'
        if p['category']=='Flow control':return 'flow'
        if p['category']=='Air preparation':
            return 'frl' if any(x in desc for x in ['FRC','FRL','FILTER REGULATOR']) else 'lubricator' if 'LUBRI' in desc else 'filter' if 'FILTER' in desc else 'regulator' if 'REGULATOR' in desc else None
        if p['category']=='Pneumatic fittings':
            return 'swivel' if 'swivel' in sub else 'elbow' if 'elbow' in sub else 'y' if ' y' in sub or '"y"' in sub else 'tee' if 'tee' in sub or sub=='mbt' else 'union' if 'union' in sub else 'straight'
        if 'COIL' in desc and 'SOLENOID COIL' not in desc:
            return 'ds2-block' if 'BLOCK' in desc else 'ds2-double' if model.startswith('DS2') and ('DOUBLE' in desc or 'SS' in model) else 'ds2' if model.startswith('DS2') else 'ef-valve' if model.startswith('EF') else 'e-valve' if model.startswith('E') else None
        for term,key in [('MANIFOLD','manifold'),('LINE BASE','manifold'),('EXUST','exhaust'),('EXHAUST','exhaust'),('SWIVEL','swivel'),('BLOW GUN','gun'),('PILOT OPERATED NRV','pilot-nrv'),('NON RETURN','nrv'),('NRV','pilot-nrv'),('PRESSURE GAUGE','gauge'),('ROTARY SLIDE','rotary'),('SHUT OFF','shutoff'),('INLINE SLIDE','slide'),('OR VALVE','logic'),('SELF SEALING','self-sealing'),('REED','reed'),('SENSOR FOR CYLINDER','reed'),('MAGNETIC SENSORE','reed'),('END CAP','plug')]:
            if term in desc:return key
        if any(x in desc for x in ['LEVER','PUSH','FOOT VALVE','ROLLER','STEM ACTUATED','POPPET']):return 'manual'
        return None
    if brand=='Uflow':
        for family in families:
            if model.startswith(family.upper()):return 'uflow-'+family if 'uflow-'+family in photos else None
        return None
    if p['category']=='Stainless steel fittings':return 'ss-fittings'
    if 'FUSEABLE' in sub.upper() or 'FUSIBLE' in sub.upper():return 'fusible-plug'
    if p['source_sheet']=='VARIOUS':
        row=int(p['source_row'])
        if row==2:return 'air-break-switch'
        if 8<=row<=13:return 'reflex-glass'
        if 15<=row<=18:return 'glass-tube'
        if 19<=row<=52:return 'nozzle'
    return None

csvpath=ROOT/'outputs/catalogue/products-clean.csv'
with csvpath.open(encoding='utf-8-sig',newline='') as f:reader=csv.DictReader(f);headers=reader.fieldnames;rows=list(reader)
mapping={};missing=[]
for p in rows:
    key=match(p)
    if key in photos:
        mapping[p['id']]={**photos[key],'key':key};p['image_url']=photos[key]['url']
    else:
        p['image_url']='';missing.append({'id':p['id'],'model':p['model'],'name':p['name'],'reason':'No verified matching photo sourced'})
with csvpath.open('w',encoding='utf-8-sig',newline='') as f:w=csv.DictWriter(f,fieldnames=headers);w.writeheader();w.writerows(rows)
public=json.loads((ROOT/'data/products.json').read_text(encoding='utf-8'))
for p in public:p['image_url']=mapping.get(p['id'],{}).get('url','')
(ROOT/'data/products.json').write_text(json.dumps(public,ensure_ascii=False,indent=2),encoding='utf-8')
(ROOT/'data/product-images.js').write_text('export const PRODUCT_IMAGES = '+json.dumps(mapping,ensure_ascii=False,indent=2)+';\n',encoding='utf-8')
(ROOT/'outputs/catalogue/photo-sourcing-report.json').write_text(json.dumps({'sources':photos,'matched_records':len(mapping),'unmatched_records':missing},ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({'assets':len(photos),'matched':len(mapping),'unmatched':len(missing)}))
