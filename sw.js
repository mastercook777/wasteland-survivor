const CACHE='wasteland-survivor-art-a32';
const FILES=['./','./index.html','./style.css','./audio.js','./game.js','./manifest.webmanifest','./icon-192.png','./icon-512.png','./assets/music/menu_un_desert.mp3','./assets/music/route_cowboy.mp3','./assets/music/road_battle.ogg','./assets/music/scavenge_battle.ogg','./assets/music/final_battle.mp3','./assets/music/event_tension.mp3','./assets/music/workshop_funk.mp3','./assets/music/victory_theme.ogg','./assets/music/defeat_theme.ogg'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  e.respondWith(
    fetch(e.request).then(res=>{
      const copy=res.clone();
      caches.open(CACHE).then(c=>c.put(e.request,copy));
      return res;
    }).catch(()=>caches.match(e.request).then(r=>r||caches.match('./index.html')))
  );
});
