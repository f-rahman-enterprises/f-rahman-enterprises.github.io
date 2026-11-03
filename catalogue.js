export function parseCSV(text) {
  const rows=[]; let row=[], value='', quoted=false;
  text=text.replace(/^\uFEFF/,'');
  for(let i=0;i<text.length;i++) {
    const c=text[i];
    if(c==='"') {
      if(quoted && text[i+1]==='"'){value+='"';i++;}
      else if(quoted || value==='') quoted=!quoted;
      else value+=c;
    } else if(c===','&&!quoted){row.push(value);value='';}
    else if((c==='\n'||c==='\r')&&!quoted){
      if(c==='\r'&&text[i+1]==='\n')i++;
      row.push(value);if(row.some(v=>v.trim()))rows.push(row);row=[];value='';
    } else value+=c;
  }
  if(quoted)throw new Error('Unclosed CSV quote');
  row.push(value);if(row.some(v=>v.trim()))rows.push(row);
  const headers=rows.shift()?.map(v=>v.trim().toLowerCase())||[];
  for(const key of ['id','name','category','published'])if(!headers.includes(key))throw new Error(`Missing column: ${key}`);
  if(new Set(headers).size!==headers.length)throw new Error('Duplicate CSV headers');
  return rows.map(r=>Object.fromEntries(headers.map((h,i)=>[h,r[i]??''])));
}
export function safeImage(url) {
  try {const u=new URL(url);return u.protocol==='https:'?u.href:'';}catch{return '';}
}
export function normalizeProducts(rows) {
  const ids=new Set();
  return rows.filter(p=>String(p.published).toLowerCase()==='true').map(p=>{
    if(!String(p.id||'').trim()||!String(p.name||'').trim()||!String(p.category||'').trim())throw new Error('Product missing id, name or category');
    if(ids.has(String(p.id)))throw new Error('Duplicate product id');ids.add(String(p.id));
    const text=k=>String(p[k]??'').trim();
    const numeric=k=>text(k)!==''&&Number.isFinite(Number(p[k]))&&Number(p[k])>=0?Number(p[k]):null;
    return {id:text('id'),name:text('name'),category:text('category'),subcategory:text('subcategory'),brand:text('brand'),model:text('model'),description:text('description'),stock_qty:numeric('stock_qty'),stock_status:text('stock_status')||'Confirm availability',unit:text('unit')||'piece',image_url:safeImage(text('image_url')),featured:String(p.featured).toLowerCase()==='true',updated_at:text('updated_at')};
  });
}
export function filterProducts(products,{query='',category='',brand='',sort='featured'}={}) {
  const terms=query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  const result=products.filter(p=>(!category||p.category===category)&&(!brand||p.brand===brand)&&terms.every(t=>[p.name,p.model,p.description,p.brand,p.category,p.id].join(' ').toLowerCase().includes(t)));
  return result.sort(sort==='name'?(a,b)=>a.name.localeCompare(b.name):sort==='model'?(a,b)=>a.model.localeCompare(b.model):(a,b)=>Number(b.featured)-Number(a.featured));
}
export function whatsappLink(number,items=[]) {
  const message=items.length?'Hello F Rahman Enterprises, please send price and availability for:\n\n'+items.map(p=>`• ${p.name}\n  Model: ${p.model||'Please confirm'} | Ref: ${p.id}\n  Quantity: ${p.quantity} ${p.unit}(s)`).join('\n\n')+'\n\nDelivery location: ':'Hello F Rahman Enterprises, I would like help finding an industrial product.';
  return `https://wa.me/${String(number).replace(/\D/g,'')}?text=${encodeURIComponent(message)}`;
}
