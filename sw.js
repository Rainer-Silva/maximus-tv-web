var C='mtv-v0.5';var F=['./','index.html','app.css','app.js','classify.js','hls.min.js','icon.png','manifest.json'];
self.addEventListener('install',function(e){e.waitUntil(caches.open(C).then(function(c){return c.addAll(F);}));self.skipWaiting();});
self.addEventListener('activate',function(e){e.waitUntil(caches.keys().then(function(k){return Promise.all(k.filter(function(x){return x!==C;}).map(function(x){return caches.delete(x);}));}));});
self.addEventListener('fetch',function(e){var u=new URL(e.request.url);if(u.origin!==location.origin)return;e.respondWith(caches.match(e.request).then(function(r){return r||fetch(e.request);}));});
