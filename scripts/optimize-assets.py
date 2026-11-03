"""Optimize local product assets and compact the generated public snapshot."""
from pathlib import Path
from PIL import Image
import json,re,urllib.request
root=Path(__file__).resolve().parents[1]
report=json.loads((root/'outputs/catalogue/photo-sourcing-report.json').read_text(encoding='utf-8'))
sources=report['sources'];before=after=0
for key,p in sources.items():
    original=root/p['path'];out=root/'assets/products'/f'{key}.webp'
    before+=original.stat().st_size
    im=Image.open(original).convert('RGB');im.thumbnail((640,480))
    im.save(out,'WEBP',quality=80,method=6);after+=out.stat().st_size
    p['path']=out.relative_to(root).as_posix()
csvpath=root/'outputs/catalogue/products-clean.csv'
import csv
with csvpath.open(encoding='utf-8-sig',newline='') as f:rows=list(csv.DictReader(f))
urlkey={p['url']:key for key,p in sources.items()}
ids={p['id']:urlkey[p['image_url']] for p in rows if p.get('image_url') in urlkey}
code='const sources='+json.dumps(sources,separators=(',',':'))+';\nconst ids='+json.dumps(ids,separators=(',',':'))+';\nexport const PRODUCT_IMAGES=Object.fromEntries(Object.entries(ids).map(([id,key])=>[id,{...sources[key],key}]));\n'
(root/'data/product-images.js').write_text(code,encoding='utf-8')
public=json.loads((root/'data/products.json').read_text(encoding='utf-8'))
for p in public:
    if p['id'] in ids:p['image_url']='' # Local mapping owns fallback images; Google Sheets retains original URLs.
(root/'data/products.json').write_text(json.dumps(public,separators=(',',':'),ensure_ascii=False),encoding='utf-8')
(root/'assets/fonts').mkdir(exist_ok=True)
request=urllib.request.Request('https://fonts.googleapis.com/css2?family=Manrope:wght@400..800&display=swap',headers={'User-Agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36'})
css=urllib.request.urlopen(request,timeout=20).read().decode()
font=re.findall(r'url\((https://fonts.gstatic.com/[^)]+)\)',css)[-1]
(root/'assets/fonts/manrope.woff2').write_bytes(urllib.request.urlopen(font,timeout=20).read())
(root/'assets/icons').mkdir(exist_ok=True)
for size in [192,512]:
    im=Image.new('RGB',(size,size),'#143a40')
    from PIL import ImageDraw,ImageFont
    d=ImageDraw.Draw(im);pad=int(size*.2);d.rounded_rectangle((pad,pad,size-pad,size-pad),radius=int(size*.12),fill='#ff8650')
    # Geometric F, readable at launcher sizes; no external font dependency.
    x=int(size*.36);y=int(size*.32);w=int(size*.3);t=int(size*.08)
    d.rectangle((x,y,x+t,int(size*.7)),fill='#143a40');d.rectangle((x,y,x+w,y+t),fill='#143a40');d.rectangle((x,int(size*.46),x+int(w*.8),int(size*.46)+t),fill='#143a40')
    im.save(root/f'assets/icons/icon-{size}.png')
print(json.dumps({'source_image_bytes':before,'optimized_image_bytes':after,'image_savings_percent':round((1-after/before)*100),'mapped_records':len(ids)}))
