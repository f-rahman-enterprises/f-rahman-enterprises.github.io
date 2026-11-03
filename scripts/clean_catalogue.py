"""Extract source cells without Excel's erroneous date-style conversions.
Writes public catalogue fields only. Original workbook is never modified.
"""
from pathlib import Path
import csv, json, re, zipfile, xml.etree.ElementTree as ET
from collections import Counter
from datetime import datetime, timedelta

ROOT = Path(__file__).resolve().parents[1]
NS = {'m': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
FIELDS = ['id','name','category','subcategory','brand','model','description','stock_qty','stock_status','unit','image_url','featured','published','updated_at','source_sheet','source_row','review_notes']
def number(v):
    try:
        n = float(v)
        return int(n) if n.is_integer() else n
    except (ValueError, TypeError): return ''
def clean(v):
    s = ' '.join(str(v or '').split())
    for a,b in {'SOLENOIYED':'SOLENOID','CONECTORE':'CONNECTOR','CONTROLER':'CONTROLLER','DABOULE':'DOUBLE','REGULATORE':'REGULATOR','LUBRICATORE':'LUBRICATOR','DIAPHROM':'DIAPHRAGM','EXJUST':'EXHAUST','BRANCE':'BRANCH','GUAGE':'GAUGE','SWITC':'SWITCH'}.items():
        s = re.sub(r'\b'+a+r'\b',b,s,flags=re.I)
    return s.strip(' :')
def date(v):
    n = number(v)
    return (datetime(1899,12,30)+timedelta(days=n)).strftime('%Y-%m-%d') if isinstance(n,(int,float)) and 30000<n<60000 else ''

def extract():
    z=zipfile.ZipFile(ROOT/'docs/Copy of STOCK UPDATE.xlsx')
    strings=[''.join(x.itertext()) for x in ET.fromstring(z.read('xl/sharedStrings.xml')).findall('m:si',NS)]
    sheets=ET.fromstring(z.read('xl/workbook.xml')).find('m:sheets',NS)
    products=[]; excluded=[]; counts={}
    for idx,sheet in enumerate(sheets,1):
        title=sheet.get('name'); section=''; subtype=''; before=len(products)
        for row in ET.fromstring(z.read(f'xl/worksheets/sheet{idx}.xml')).findall('m:sheetData/m:row',NS):
            r=int(row.get('r')); cells={}
            for c in row:
                v=c.find('m:v',NS)
                if v is not None:
                    cells[re.sub(r'\d','',c.get('r'))]=' '.join((strings[int(v.text)] if c.get('t')=='s' else v.text or '').split())
            if not any(cells.values()): continue
            a=cells.get('A',''); b=cells.get('B',''); c=cells.get('C','')
            if (idx==1 and r==1) or (idx==2 and r==3) or (idx==3 and r==2) or (idx>3 and r==1): continue
            if any('TOTAL' in x.upper() for x in [a,b,c]):
                excluded.append([title,r,'Total row']); continue
            # Section headings occupy A without an actual item in the model/size columns.
            if a and number(a)=='' and not b and not c:
                section=clean(a); subtype=''; excluded.append([title,r,'Section heading']); continue
            if idx==4 and b in ['F/F :','M/F :','M/M :']:
                subtype=clean(b); excluded.append([title,r,'Connection type heading']); continue
            model=clean(b if idx==1 else cells.get('C','') if idx==3 else '')
            desc=clean(c if idx==1 else cells.get('D','') if idx==3 else b)
            if idx==3 and r==1: continue
            # Rows with prices but no item identity cannot be safely attached to neighbours.
            if not model and not desc:
                excluded.append([title,r,'Unidentified data row; inspect original workbook']); continue
            brand='Janatics' if idx==1 else 'Uflow' if idx==3 else 'Zoloto' if 'ZOLOTO' in desc.upper() else ''
            sec=clean(section).title()
            if idx==1:
                u=section.upper()
                category=('Cylinders' if 'CYLINDER' in u else 'Air preparation' if any(x in u for x in ['REGULATOR','FILTER','LUBRICATOR']) else 'Tubes & hoses' if 'PIPE' in u else 'Flow control' if 'FCV' in u else 'Valves' if 'SOLENOID' in u else 'Accessories' if 'VARIOUS' in u else 'Pneumatic fittings')
                pc,sc,dt='G','K','Q'
            elif idx==2: category='Stainless steel fittings'; pc,sc,dt='F','J','N'
            elif idx==3: category='Valves'; pc,sc,dt='H','M','O'
            elif idx==4: category='Brass fittings'; pc,sc,dt='F','K','Q'
            elif idx==5: category='Boiler & steam'; pc,sc,dt='F','K','Q'
            else: category='Accessories'; pc,sc,dt='F','K','Q'
            price=number(cells.get(pc)); qty=number(cells.get(sc)); notes=[]
            if not desc: notes.append('Missing description')
            if idx==1 and not model: notes.append('Missing model')
            if price=='' or price<=0: price=''; notes.append('Confirm sales price')
            if qty=='' or qty<0: qty=''; notes.append('Confirm stock quantity')
            if category=='Accessories' and not section: notes.append('Confirm product family')
            if idx==3 and cells.get('I'): notes.append('Unlabelled source column I retained only in original; stock uses M')
            name=' '.join(x for x in [sec if sec and sec.lower()!='various' else category,subtype,desc or model] if x)
            products.append(dict(zip(FIELDS,[f'FRE-{idx:02}-{r:04}',name,category,sec,brand,model,desc,qty,'Confirm availability','roll' if category=='Tubes & hoses' else 'piece','',len(products)<8, bool(desc),date(cells.get(dt)),title,r,'; '.join(notes)])))
        counts[title]=len(products)-before
    duplicates=Counter((p['brand'],re.sub(r'\s','',p['model']).upper()) for p in products if p['model'])
    for p in products:
        if p['model'] and duplicates[(p['brand'],re.sub(r'\s','',p['model']).upper())]>1:
            p['review_notes']='; '.join(filter(None,[p['review_notes'],'Repeated model code; verify variant, do not merge automatically']))
    out=ROOT/'outputs/catalogue';out.mkdir(parents=True,exist_ok=True)
    with (out/'products-clean.csv').open('w',encoding='utf-8-sig',newline='') as f:
        w=csv.DictWriter(f,fieldnames=FIELDS);w.writeheader();w.writerows(products)
    # Public fallback omits internal cleanup notes/provenance. Prices are opt-in in config.
    public=[{k:v for k,v in p.items() if k not in ['review_notes','source_sheet','source_row']} for p in products if p['published']]
    (ROOT/'data/products.json').write_text(json.dumps(public,ensure_ascii=False,indent=2),encoding='utf-8')
    (out/'cleaning-report.json').write_text(json.dumps({'source':'docs/Copy of STOCK UPDATE.xlsx','counts':counts,'total_products':len(products),'published':len(public),'review_required':sum(bool(p['review_notes']) for p in products),'excluded_rows':excluded,'policy':'No variants merged. Source numeric identifiers preserved from XML. Costs omitted. Historical stock is not advertised as live availability.'},indent=2),encoding='utf-8')
    print(json.dumps({'counts':counts,'total':len(products),'published':len(public),'review_required':sum(bool(p['review_notes']) for p in products),'excluded':len(excluded)}))
if __name__=='__main__': extract()
