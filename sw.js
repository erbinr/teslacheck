// Service worker: cache-first con precache completo. Sube VERSION al cambiar cualquier archivo.
const VERSION='v2';
const CACHE='teslacheck-'+VERSION;
const ASSETS=['./','index.html','styles.css','app.js','theme.js','checklist.json','i18n/es.json','i18n/pt.json','i18n/en.json','manifest.webmanifest','favicon.svg','icons/favicon-32.png','icons/icon-192.png','icons/icon-512.png','icons/maskable-512.png','icons/apple-touch-icon.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k.startsWith('teslacheck-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  const url=new URL(e.request.url);
  if(url.origin!==location.origin)return;
  e.respondWith(caches.match(e.request,{ignoreSearch:true}).then(hit=>hit||fetch(e.request).then(r=>{
    if(r.ok){const cp=r.clone();caches.open(CACHE).then(c=>c.put(e.request,cp))}
    return r;
  }).catch(()=>e.request.mode==='navigate'?caches.match('index.html'):Response.error())));
});
