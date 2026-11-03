import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {parseCSV,normalizeProducts,filterProducts,whatsappLink,safeImage} from '../catalogue.js';
import {PRODUCT_IMAGES} from '../data/product-images.js';
test('CSV handles quoted commas, escaped quotes, multiline fields, BOM and CRLF',()=>{
 const rows=parseCSV('\uFEFFid,name,category,published\r\n1,"Valve, 1/4""",Valves,TRUE\r\n2,"A\nB",Fittings,FALSE');
 assert.equal(rows[0].name,'Valve, 1/4"');assert.equal(rows[1].name,'A\nB');assert.equal(normalizeProducts(rows).length,1);
 assert.throws(()=>parseCSV('id,name,category,published\n1,"bad'),/Unclosed/);
 assert.throws(()=>parseCSV('id,name'),/Missing column/);
});
test('published data validation protects identity and handles missing numeric values',()=>{
 const base={id:'a',name:'Valve',category:'Valves',published:true};
 assert.equal(normalizeProducts([base])[0].stock_qty,null);
 assert.throws(()=>normalizeProducts([base,base]),/Duplicate/);
 assert.throws(()=>normalizeProducts([{...base,name:''}]),/missing/);
 assert.equal(safeImage('javascript:alert(1)'), '');
 assert.equal(safeImage('https://example.com/p.jpg'),'https://example.com/p.jpg');
 assert.deepEqual(normalizeProducts([{...base,published:false}]),[]);
});
test('search combines words, category and brand and preserves variants',()=>{
 const products=normalizeProducts([{id:'1',name:'Single coil valve',model:'DS 254',category:'Valves',brand:'Janatics',published:true},{id:'2',name:'Double coil valve',model:'DS 254',category:'Valves',brand:'Other',published:true}]);
 assert.equal(filterProducts(products,{query:'DS 254',brand:'Janatics',category:'Valves'}).length,1);
 assert.equal(filterProducts(products,{query:'DS 254'}).length,2);
 assert.equal(filterProducts(products,{query:'no match'}).length,0);
});
test('WhatsApp URL preserves specification, quantity and reference safely',()=>{
 const link=new URL(whatsappLink('+880 1715-603598',[{id:'FRE-1',name:'Valve 1/4" & coil',model:'A&B',quantity:2,unit:'piece'}]));
 assert.equal(link.hostname,'wa.me');assert.equal(link.pathname,'/8801715603598');
 assert.match(link.searchParams.get('text'),/A&B/);assert.match(link.searchParams.get('text'),/Quantity: 2/);assert.match(link.searchParams.get('text'),/Ref: FRE-1/);
});
test('bundled public snapshot is valid and excludes purchasing data',async()=>{
 const rows=JSON.parse(await readFile(new URL('../data/products.json',import.meta.url),'utf8'));const products=normalizeProducts(rows);
 assert.equal(products.length,689);assert.equal(new Set(products.map(p=>p.id)).size,689);
 assert.ok(rows.every(p=>!Object.keys(p).some(k=>/price|cost|margin|supplier|source_row|review_notes/i.test(k))));
 const csv=await readFile(new URL('../outputs/catalogue/products-clean.csv',import.meta.url),'utf8');
 assert.ok(!Object.keys(parseCSV(csv)[0]).some(k=>/price|cost|margin/i.test(k)));
 assert.ok(!('price_bdt' in normalizeProducts([{id:'x',name:'x',category:'x',published:true,price_bdt:123}])[0]));
 const report=JSON.parse(await readFile(new URL('../outputs/catalogue/cleaning-report.json',import.meta.url),'utf8'));
 assert.equal(Object.values(report.counts).reduce((a,b)=>a+b,0),701);
});
test('sourced product imagery uses real local image files with traceable origins',async()=>{
 const products=JSON.parse(await readFile(new URL('../data/products.json',import.meta.url),'utf8'));
 const files=new Set();
 for(const p of products){
   const photo=PRODUCT_IMAGES[p.id];
   if(!photo)continue;
   assert.ok(!p.image_url||p.image_url===photo.url);
   assert.match(photo.path,/^assets\/products\/[a-z0-9-]+\.(jpg|png|webp)$/);
   assert.match(photo.source_page,/^https:\/\/(www\.)?(janatics\.com|uflowvalve\.com|facebook\.com)\//);
   files.add(photo.path);
 }
 for(const path of files){const bytes=await readFile(new URL('../'+path,import.meta.url));assert.equal(bytes.toString('ascii',0,4),'RIFF');assert.equal(bytes.toString('ascii',8,12),'WEBP');}
 const source=await readFile(new URL('../app.js',import.meta.url),'utf8');
 assert.ok(!source.includes('assets/valve.svg'));assert.ok(source.includes('Request product photo'));
});
