// Service worker: red primero (revalida con el servidor, 304 si no cambió) con respaldo a caché si no hay red o tarda >2s.
const VERSION='v3';
const CACHE='teslacheck-'+VERSION;
const ASSETS=['./','index.html','styles.css','app.js','theme.js','checklist.json','i18n/es.json','i18n/pt.json','i18n/en.json','manifest.webmanifest','favicon.svg','icons/favicon-32.png','icons/icon-192.png','icons/icon-512.png','icons/maskable-512.png','icons/apple-touch-icon.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS.map(u=>new Request(u,{cache:'reload'})))).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k.startsWith('teslacheck-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
const TMO=2000;
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  const url=new URL(e.request.url);
  if(url.origin!==location.origin)return;
  const fallback=()=>caches.match(e.request,{ignoreSearch:true}).then(h=>h||(e.request.mode==='navigate'?caches.match('index.html'):Response.error()));
  e.respondWith(new Promise(res=>{
    let done=false;const t=setTimeout(()=>{if(!done)fallback().then(r=>{if(!done){done=true;res(r)}})},TMO);
    fetch(e.request,{cache:'no-cache'}).then(r=>{
      if(r.ok){const cp=r.clone();caches.open(CACHE).then(c=>c.put(e.request,cp))}
      if(!done||r.ok){clearTimeout(t);done=true;res(r)}
    }).catch(()=>{clearTimeout(t);if(!done){done=true;fallback().then(res)}});
  }));
});
