/* Cache only the offline screen and public brand assets. Never store API,
   dashboard, account pages, private uploads, or document responses. */
const CACHE='srikandi-shell-10.5.0';
const SHELL=['/offline.html','/icons/icon-192.png','/icons/icon-512.png','/icons/maskable-512.png','/apple-touch-icon.png','/brand/wordmark.webp'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL)))});
self.addEventListener('activate',event=>{event.waitUntil(Promise.all([caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('srikandi-shell-')&&key!==CACHE).map(key=>caches.delete(key)))),self.clients.claim()]))});
self.addEventListener('message',event=>{if(event.data?.type==='SKIP_WAITING')self.skipWaiting()});
self.addEventListener('fetch',event=>{const r=event.request,u=new URL(r.url);if(r.method!=='GET'||u.origin!==self.location.origin)return;
 if(r.mode==='navigate'){event.respondWith(fetch(r).catch(async()=>await caches.match('/offline.html')||new Response('Koneksi internet diperlukan.',{status:503,headers:{'Content-Type':'text/plain;charset=utf-8'}})));return}
 if(SHELL.includes(u.pathname)&&!u.search){event.respondWith(caches.match(r).then(cached=>cached||fetch(r)));}
});
