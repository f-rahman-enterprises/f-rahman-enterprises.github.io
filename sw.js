const VERSION='fre-v1';
// Build replaces this list with the exact public shell and hashed cache version.
const SHELL=['./','./index.html','./styles.css','./app.js','./components.js','./catalogue.js','./config.js','./data/product-images.js','./data/products.json','./manifest.webmanifest','./assets/icons/icon-192.png','./assets/icons/icon-512.png','./assets/fonts/manrope.woff2','./assets/favicon.svg','./assets/products/shop-valve.webp','./assets/products/ds2.webp','./assets/products/ds2-double.webp','./assets/products/ds2-block.webp'];
self.addEventListener('install',event=>event.waitUntil(caches.open(VERSION).then(cache=>cache.addAll(SHELL))));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('fre-')&&k!==VERSION).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
 const request=event.request,url=new URL(request.url);
 if(request.method!=='GET'||url.origin!==self.location.origin)return; // Sheets remains network-only.
 const base=new URL('./',self.location).pathname;
 if(!url.pathname.startsWith(base))return;
 if(request.mode==='navigate'){
  event.respondWith(fetch(request).catch(()=>caches.match(new URL('index.html',self.location).href)));return;
 }
 event.respondWith(caches.open(VERSION).then(async cache=>{
  const cached=await cache.match(request);if(cached)return cached;
  const response=await fetch(request);
  if(response.ok&&response.type==='basic'&&url.pathname.startsWith(base+'assets/')){
   await cache.put(request,response.clone());
   const keys=await cache.keys();const images=keys.filter(r=>r.url.includes('/assets/products/'));
   if(images.length>80)await cache.delete(images[0]);
  }
  return response;
 }));
});
