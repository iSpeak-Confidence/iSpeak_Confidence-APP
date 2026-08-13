const CACHE='ispeak-v18-7-1-revolut-beta-v1';
const CORE=['/','/index.html','/styles.css','/app.js','/curriculum-data.js','/curriculum-expansion-v17-4.js','/ielts-data.js','/language-support-v17-5.js','/khmer-commonvoice-data.js','/manifest.webmanifest','/assets/flags/gb.svg','/assets/flags/kh.svg','/assets/flags/cn.svg','/assets/flags/es.svg','/assets/flags/fr.svg','/assets/flags/jp.svg','/assets/flags/sa.svg','/assets/icons/library-book.svg','/assets/classroom-backgrounds/ispeak-classroom.jpg','/assets/logo.png','/assets/icon-192.png','/assets/icon-512.png','/assets/mascots/jess-v13.png','/assets/mascots/jack-cutout.png','/assets/mascots/pedro-v13-cutout.png','/assets/mascots/loulou-v13-cutout.png','/assets/mascots/yuki-v13-cutout.png','/assets/mascots/dariya-v13-complete-fixed.png','/assets/mascots/zayd-v13-complete-fixed.png','/assets/nathan.jpg','/assets/ounnoun.jpg','/assets/jessica.png','/assets/an-sievly.png'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
 if(e.request.method!=='GET'||new URL(e.request.url).pathname.startsWith('/api/'))return;
 if(e.request.destination==='video')return;
 e.respondWith(fetch(e.request).then(r=>{
   if(r.ok){const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy)).catch(()=>{});}
   return r;
 }).catch(async()=>{
   const cached=await caches.match(e.request);if(cached)return cached;
   if(e.request.mode==='navigate')return (await caches.match('/index.html'))||Response.error();
   return Response.error();
 }));
});
