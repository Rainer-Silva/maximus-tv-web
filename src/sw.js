var C='mtv-v0.6.3';var F=['./','index.html','app.css','app.js','classify.js','hls.min.js','logo.svg','icon-192.png','icon-512.png','apple-touch-icon.png','manifest.json'];
self.addEventListener('install',function(e){e.waitUntil(caches.open(C).then(function(c){return c.addAll(F);}));self.skipWaiting();});
self.addEventListener('activate',function(e){e.waitUntil(caches.keys().then(function(k){return Promise.all(k.filter(function(x){return x!==C;}).map(function(x){return caches.delete(x);}));}).then(function(){return self.clients.claim();}));});
self.addEventListener('fetch',function(e){var u=new URL(e.request.url);if(u.origin!==location.origin)return;
 e.respondWith(fetch(e.request).then(function(r){var cp=r.clone();caches.open(C).then(function(c){c.put(e.request,cp);});return r;}).catch(function(){return caches.match(e.request);}));});
