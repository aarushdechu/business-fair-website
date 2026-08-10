const CACHE='sketchy-shell-v13';
const SHELL=['/','/styles.css','/app.js','/manifest.webmanifest','/assets/logo.png','/assets/products/origami-eagle-display.png','/assets/products/origami-dragon-v3-display.png','/assets/products/origami-mouse-display.png','/assets/products/origami-kangaroo-display.png','/assets/products/origami-turtle-display.png'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
  const url=new URL(event.request.url);
  if(event.request.method!=='GET'||url.origin!==location.origin||url.pathname.startsWith('/api/'))return;
  event.respondWith(fetch(event.request).then(response=>{ const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(event.request,copy));return response; }).catch(()=>caches.match(event.request).then(response=>response||caches.match('/'))));
});
