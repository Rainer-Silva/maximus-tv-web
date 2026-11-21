var C='mtv-v0.6.5';var F=['./','index.html','app.css','app.js','classify.js','hls.min.js','logo.svg','icon-192.png','icon-512.png','apple-touch-icon.png','manifest.json'];
// Network first, bypassing the HTTP cache, so a normal reload always gets the latest deploy. Cache is only an offline fallback.
self.addEventListener('install',function(e){self.skipWaiting();e.waitUntil(caches.open(C).then(function(c){return c.addAll(F.map(function(f){return new Request(f,{cache:'reload'});}));}).catch(function(){}));});
self.addEventListener('activate',function(e){e.waitUntil(caches.keys().then(function(k){return Promise.all(k.filter(function(x){return x!==C;}).map(function(x){return caches.delete(x);}));}).then(function(){return self.clients.claim();}));});
self.addEventListener('fetch',function(e){if(e.request.method!=='GET')return;var u=new URL(e.request.url);if(u.origin!==location.origin)return;
 e.respondWith(fetch(new Request(e.request.url,{cache:'no-store',credentials:'same-origin'})).then(function(r){if(r&&r.ok){var cp=r.clone();caches.open(C).then(function(c){c.put(e.request,cp);});}return r;}).catch(function(){return caches.match(e.request,{ignoreSearch:true});}));});
