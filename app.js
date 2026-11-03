import {icon} from './components.js';
import {CONFIG} from './config.js';
import {PRODUCT_IMAGES} from './data/product-images.js';
import {parseCSV,normalizeProducts,filterProducts,whatsappLink} from './catalogue.js';
const $=s=>document.querySelector(s);
const state={products:[],query:'',category:'',brand:'',sort:'featured',page:1};
let saved=[];try{saved=JSON.parse(localStorage.getItem('fre-enquiry')||'[]');}catch{}
let quote=Array.isArray(saved)?saved.filter(p=>p&&typeof p.id==='string'&&Number.isInteger(p.quantity)&&p.quantity>0&&p.quantity<=9999).slice(0,30):[];
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const e=escape;
const image=p=>{
 const sourced=PRODUCT_IMAGES[p.id];
 const local=sourced&&(!p.image_url||p.image_url===sourced.url);
 const src=local?sourced.path:p.image_url;
 return src?`<img src="${e(src)}" alt="${e(p.name)}${local?' — product family image':''}" loading="lazy" decoding="async" width="320" height="200">${local?'<span class="photo-caption">PRODUCT FAMILY IMAGE · VARIANTS MAY DIFFER</span>':''}`:'<span class="photo-missing">Request product photo</span>';
};
function imageFallback(parent){parent.querySelectorAll('img').forEach(img=>{img.addEventListener('error',()=>{const box=img.parentElement;img.remove();box.querySelector('.photo-caption')?.remove();const note=document.createElement('span');note.className='photo-missing';note.textContent='Request product photo';box.append(note);},{once:true});});}
function renderFilters(){
 const cats=[...new Set(state.products.map(p=>p.category))].sort();
 $('#categories').innerHTML=[['','All products'],...cats.map(c=>[c,c])].map(([v,label])=>`<button class="category ${state.category===v?'selected':''}" data-category="${e(v)}" aria-pressed="${state.category===v}"><span>${e(label)}</span><small>${state.products.filter(p=>!v||p.category===v).length}</small></button>`).join('');
 $('#brand-filter').options=[{value:'',label:'All brands'},...[...new Set(state.products.map(p=>p.brand).filter(Boolean))].sort().map(b=>({value:b,label:b}))];
 $('#brand-filter').value=state.brand;
 $('#category-sheet-options').innerHTML=$('#categories').innerHTML;
}
function render(){
 const filtered=filterProducts(state.products,state);const pages=Math.max(1,Math.ceil(filtered.length/CONFIG.pageSize));state.page=Math.min(state.page,pages);
 const start=(state.page-1)*CONFIG.pageSize;
 $('#result-count').textContent=filtered.length?`Showing ${start+1}–${Math.min(start+CONFIG.pageSize,filtered.length)} of ${filtered.length} products`:'0 products found';
 $('#products').innerHTML=filtered.slice(start,start+CONFIG.pageSize).map(p=>`<article class="product-card"><button class="product-image" data-details="${e(p.id)}" aria-label="View ${e(p.name)}"><span class="product-brand">${e(p.brand||'INDUSTRIAL')}</span>${image(p)}<span class="image-arrow">${icon('arrow')}</span></button><div class="product-body"><p class="product-category">${e(p.category)}</p><h3><button data-details="${e(p.id)}">${e(p.subcategory&&p.subcategory!=='Various'?p.subcategory:p.category)}</button></h3><p class="spec">${e(p.description||p.name)}</p><p class="model">${e(p.model||p.id)}</p><div class="product-bottom"><span>Enquire on WhatsApp</span><button data-add="${e(p.id)}" aria-label="Add ${e(p.name)} to enquiry">${icon('plus')}</button></div></div></article>`).join('');
 $('#empty').hidden=filtered.length>0;$('.pagination').hidden=filtered.length===0;
 $('#page-info').textContent=`Page ${state.page} of ${pages}`;$('#prev').disabled=state.page<=1;$('#next').disabled=state.page>=pages;
 document.querySelectorAll('[data-category]').forEach(b=>{b.classList.toggle('selected',b.dataset.category===state.category);b.setAttribute('aria-pressed',b.dataset.category===state.category);});
 $('#category-picker-label').textContent=state.category||'All categories';
 imageFallback($('#products'));
}
function notify(text){$('#toast').textContent=text;$('#toast').classList.add('visible');clearTimeout(notify.timer);notify.timer=setTimeout(()=>$('#toast').classList.remove('visible'),2400);}
function saveQuote(){try{localStorage.setItem('fre-enquiry',JSON.stringify(quote));}catch{}$('#quote-count').textContent=quote.length;$('#mobile-quote-count').textContent=quote.length;}
function add(id,quantity=1){const product=state.products.find(p=>p.id===id);if(!product)return;const existing=quote.find(p=>p.id===id);if(existing)existing.quantity=Math.min(9999,existing.quantity+quantity);else{if(quote.length>=30){notify('Please send your current list before adding more items.');return;}quote.push({...product,quantity});}saveQuote();notify('Added to your enquiry list');}
function details(id){
 const p=state.products.find(p=>p.id===id);if(!p)return;
 $('#product-details').innerHTML=`<div class="detail-image">${image(p)}</div><p class="eyebrow">${e(p.brand||p.category)}</p><h2>${e(p.subcategory||p.category)}</h2><p class="detail-spec">${e(p.description||p.name)}</p><dl><div><dt>Model / reference</dt><dd>${e(p.model||p.id)}</dd></div><div><dt>Category</dt><dd>${e(p.category)}</dd></div><div><dt>Availability</dt><dd>${e(p.stock_status)}</dd></div></dl><div class="detail-actions"><label>Quantity <input id="detail-quantity" type="number" value="1" min="1" max="9999" step="1"></label><button class="button orange" id="detail-add">Add to enquiry ${icon('plus')}</button></div><a class="detail-wa" href="${e(whatsappLink(CONFIG.whatsappNumber,[{...p,quantity:1}]))}" target="_blank" rel="noopener noreferrer">Ask about this product on WhatsApp ${icon('arrow')}</a>`;
 const qty=$('#detail-quantity');qty.addEventListener('input',()=>{const q=Number(qty.value);if(Number.isInteger(q)&&q>0&&q<=9999)$('.detail-wa').href=whatsappLink(CONFIG.whatsappNumber,[{...p,quantity:q}]);});
 $('#detail-add').onclick=()=>{if(!qty.reportValidity())return;add(id,Number(qty.value));$('#product-dialog').close();};
 imageFallback($('#product-details'));$('#product-dialog').showModal();
}
function renderQuote(){
 $('#quote-items').innerHTML=quote.length?quote.map(p=>`<div class="quote-item"><div><h3>${e(p.name)}</h3><p>${e(p.model||p.id)} · ${e(p.unit)}</p></div><label>Qty<input type="number" min="1" max="9999" step="1" value="${p.quantity}" data-quantity="${e(p.id)}" aria-label="Quantity for ${e(p.name)}"></label><button data-remove="${e(p.id)}" aria-label="Remove ${e(p.name)}">${icon('close')}</button></div>`).join(''):'<div class="empty"><h3>Your list is empty</h3><p>Add products from the catalogue to get a quote.</p></div>';
 $('#send-quote').hidden=!quote.length;$('#send-quote').href=whatsappLink(CONFIG.whatsappNumber,quote);
}
document.addEventListener('click',ev=>{
 const b=ev.target.closest('button');if(!b)return;
 if(b.dataset.category!==undefined){state.category=b.dataset.category;state.page=1;render();if($('#category-dialog').open)$('#category-dialog').close();}
 if(b.dataset.details)details(b.dataset.details);
 if(b.dataset.add)add(b.dataset.add);
 if(b.dataset.remove){quote=quote.filter(p=>p.id!==b.dataset.remove);saveQuote();renderQuote();}
 if(b.classList.contains('close-dialog'))b.closest('dialog').close();
});
$('#quote-items').addEventListener('input',ev=>{if(!ev.target.dataset.quantity)return;const n=Number(ev.target.value);if(!Number.isInteger(n)||n<1||n>9999){ev.target.setCustomValidity('Enter a whole quantity from 1 to 9999.');$('#send-quote').hidden=true;return;}ev.target.setCustomValidity('');quote.find(p=>p.id===ev.target.dataset.quantity).quantity=n;saveQuote();$('#send-quote').hidden=Boolean($('#quote-items input:invalid'));$('#send-quote').href=whatsappLink(CONFIG.whatsappNumber,quote);});
$('#open-quote').onclick=()=>{renderQuote();$('#quote-dialog').showModal();};
$('#search').addEventListener('input',ev=>{state.query=ev.target.value;state.page=1;render();});
$('#sort').options=[{value:'featured',label:'Featured first'},{value:'name',label:'Product name'},{value:'model',label:'Model number'}];
$('#sort').onchange=ev=>{state.sort=ev.target.value;state.page=1;render();};
$('#brand-filter').onchange=ev=>{state.brand=ev.target.value;state.page=1;render();};
function reset(){Object.assign(state,{query:'',category:'',brand:'',sort:'featured',page:1});$('#search').value='';$('#brand-filter').value='';$('#sort').value='featured';render();}
$('#reset').onclick=reset;$('#empty-reset').onclick=reset;
for(const [selector,delta] of [['#prev',-1],['#next',1]])$(selector).onclick=()=>{state.page+=delta;render();$('#catalogue').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});};
document.addEventListener('keydown',ev=>{if(ev.key==='/'&&!['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName)&&!document.querySelector('dialog[open]')){ev.preventDefault();$('#search').focus();}});
document.querySelectorAll('dialog').forEach(d=>d.addEventListener('click',ev=>{if(ev.target===d){const r=d.getBoundingClientRect();if(ev.clientX<r.left||ev.clientX>r.right||ev.clientY<r.top||ev.clientY>r.bottom)d.close();}}));
document.querySelectorAll('.whatsapp').forEach(a=>{a.href=whatsappLink(CONFIG.whatsappNumber);a.target='_blank';a.rel='noopener noreferrer';});
$('#year').textContent=new Date().getFullYear();saveQuote();
async function load(){
 let hasSnapshot=false;
 const apply=rows=>{state.products=rows;renderFilters();render();};
 try{
  const response=await fetch(new URL('data/products.json',import.meta.url));
  if(!response.ok)throw Error('Catalogue unavailable');
  apply(normalizeProducts(await response.json()));hasSnapshot=true;
  $('#data-status').textContent=CONFIG.googleSheetsCsvUrl?'Showing saved catalogue. Checking for updates…':'Browse our catalogue. Contact us for current availability.';
 }catch{}
 if(CONFIG.googleSheetsCsvUrl){try{
  const url=new URL(CONFIG.googleSheetsCsvUrl);
  if(url.protocol!=='https:'||!['docs.google.com','docs.googleusercontent.com'].includes(url.hostname))throw Error('Use a Google Sheets published CSV URL');
  const response=await fetch(url,{signal:AbortSignal.timeout(CONFIG.fetchTimeoutMs),cache:'no-store'});
  if(!response.ok)throw Error('Sheet unavailable');
  apply(normalizeProducts(parseCSV(await response.text())));
  $('#data-status').textContent='Catalogue updated from our product sheet.';return;
 }catch(error){console.warn('Google Sheets catalogue could not load:',error.message);}}
 if(hasSnapshot){if(CONFIG.googleSheetsCsvUrl)$('#data-status').textContent='Showing our saved catalogue. Live updates are unavailable; please confirm availability.';return;}
 $('#data-status').textContent='The catalogue is unavailable. Please contact our team on WhatsApp.';
 $('#result-count').textContent='Unable to load products';$('.pagination').hidden=true;
}
load();

// Explicit anchor scrolling keeps navigation fluid with a sticky-header offset.
const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
document.addEventListener('click',event=>{
 const link=event.target.closest('a[href^="#"]');if(!link)return;
 const hash=link.getAttribute('href');const target=hash==='#'?document.body:document.getElementById(hash.slice(1));if(!target)return;
 event.preventDefault();const top=hash==='#'?0:target.getBoundingClientRect().top+window.scrollY-105;
 window.scrollTo({top,behavior:reducedMotion.matches?'instant':'smooth'});history.replaceState(null,'',hash);
});

$('#category-picker').onclick=$('#mobile-categories').onclick=()=>$('#category-dialog').showModal();
$('#mobile-enquiry').onclick=()=>{renderQuote();$('#quote-dialog').showModal();};
let marqueeVisible=false,marqueePaused=false;
const marquee=$('.marquee');
const updateMarquee=()=>{marquee.classList.toggle('marquee-visible',marqueeVisible&&!document.hidden);marquee.classList.toggle('marquee-paused',marqueePaused);};
new IntersectionObserver(entries=>{marqueeVisible=entries[0].isIntersecting;updateMarquee();}).observe(marquee);
document.addEventListener('visibilitychange',updateMarquee);
$('#marquee-pause').onclick=()=>{marqueePaused=!marqueePaused;$('#marquee-pause').setAttribute('aria-pressed',marqueePaused);$('#marquee-pause').setAttribute('aria-label',marqueePaused?'Resume brand marquee':'Pause brand marquee');$('#marquee-pause').innerHTML=icon(marqueePaused?'play':'pause');updateMarquee();};
const mobileNavObserver=new IntersectionObserver(entries=>{for(const entry of entries){if(!entry.isIntersecting)continue;document.querySelectorAll('.mobile-nav [data-mobile]').forEach(a=>a.classList.toggle('active',a.dataset.mobile===(entry.target.id==='catalogue'?'products':'home')));}},{rootMargin:'-15% 0px -55% 0px'});
mobileNavObserver.observe($('.hero'));mobileNavObserver.observe($('#catalogue'));
let installPrompt;
window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();installPrompt=event;$('#install-app').hidden=false;});
$('#install-app').onclick=async()=>{if(!installPrompt)return;await installPrompt.prompt();installPrompt=null;$('#install-app').hidden=true;};
window.addEventListener('appinstalled',()=>{$('#install-app').hidden=true;installPrompt=null;});
window.addEventListener('offline',()=>notify('Offline. Browsing your saved catalogue.'));
if('serviceWorker' in navigator&&(!['localhost','127.0.0.1'].includes(location.hostname)||new URLSearchParams(location.search).has('pwa'))){
 window.addEventListener('load',()=>{
  const register=()=>navigator.serviceWorker.register(new URL('sw.js',import.meta.url),{scope:new URL('./',import.meta.url).pathname}).catch(error=>console.warn('Offline setup unavailable:',error.message));
  if('requestIdleCallback' in window)requestIdleCallback(register,{timeout:3000});else setTimeout(register,1000);
 });
}
