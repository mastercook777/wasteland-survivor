self.addEventListener('install',e=>e.waitUntil(self.skipWaiting()));
self.addEventListener('activate',e=>e.waitUntil((async()=>{
  const keys=await caches.keys();
  await Promise.all(keys.filter(k=>k.includes('wasteland-survivor-art-reforge-preview')).map(k=>caches.delete(k)));
  await self.registration.unregister();
  await self.clients.claim();
})()));
self.addEventListener('fetch',e=>{
  if(e.request.method==='GET')e.respondWith(fetch(e.request,{cache:'no-store'}));
});