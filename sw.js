/* Service worker de GrowFolio. La página (index.html) se pide primero a la red, así siempre abres la
   última versión; si la red no contesta en 3 segundos o no hay conexión, sale la copia guardada.
   El resto (iconos, letras) sale de la copia y se renueva por detrás.
   Los datos (precios, cartera cifrada, GitHub, Yahoo, Bitvavo) nunca pasan por aquí: la página los guarda aparte. */
var CACHE = 'inv-v127';
var CORE = ['./', 'index.html', 'manifest.webmanifest', 'favicon.svg', 'growfolio.svg', 'growfolio-32.png', 'growfolio-192.png', 'growfolio-512.png', 'growfolio-maskable-512.png', 'growfolio-180.png', 'icon-192.png', 'growfolio-nombre.svg', 'growia.svg', 'growfolio-aviso.png'];
var DATOS = /(^|\/)(opinion\.json|instrumentos\.json|cartera\.enc\.json|analisis-ia\.json|analisis\.enc\.json)$/;
self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(CORE); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
function avisar() {
  self.clients.matchAll({ type: 'window' }).then(function (cs) { cs.forEach(function (c) { c.postMessage({ type: 'inv-actualizada' }); }); });
}
self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  var propia = url.origin === location.origin;
  if (propia && DATOS.test(url.pathname)) return;
  var cacheable = propia || /^(fonts\.googleapis\.com|fonts\.gstatic\.com|cdn\.jsdelivr\.net)$/.test(url.hostname);
  if (!cacheable) return;
  var pagina = req.mode === 'navigate' || (propia && /\/(index\.html)?$/.test(url.pathname));
  var clave = pagina ? new URL('index.html', self.registration.scope).href : req;
  if (pagina) {
    var porCopia = false;
    var red = fetch(req.url, { cache: 'no-cache', credentials: 'same-origin' });
    // guarda la versión que llega de la red; si ya se había enseñado la copia y es distinta, avisa
    e.waitUntil(red.then(function (res) {
      if (!res || !res.ok) return;
      var otra = res.clone();
      return caches.open(CACHE).then(function (c) {
        return c.match(clave).then(function (hit) {
          var x = hit && (hit.headers.get('etag') || hit.headers.get('last-modified')), y = otra.headers.get('etag') || otra.headers.get('last-modified');
          if (porCopia && x && y && x !== y) avisar();
          return c.put(clave, otra);
        });
      });
    }).catch(function () {}));
    var copia = function () { return caches.match(clave).then(function (hit) { if (hit) { porCopia = true; return hit; } return red; }); };
    var buena = red.then(function (res) { return res && res.ok ? res : copia(); }, copia);
    var plazo = new Promise(function (ok) { setTimeout(ok, 3000); }).then(function () { return porCopia ? null : copia(); });
    e.respondWith(Promise.race([buena, plazo]));
    return;
  }
  e.respondWith(caches.open(CACHE).then(function (c) {
    return c.match(clave).then(function (hit) {
      var red = fetch(req).then(function (res) {
        if (res && (res.ok || res.type === 'opaque')) c.put(clave, res.clone());
        return res;
      }).catch(function () { return hit; });
      if (hit) { e.waitUntil(red.catch(function () {})); return hit; }
      return red;
    });
  }));
});
// los avisos del navegador: al tocarlos, se abre GrowFolio (o se trae al frente) en lo que dicen
self.addEventListener('notificationclick', function (e) {
  e.notification.close();
  var hash = (e.notification.data && e.notification.data.hash) || '#cartera';
  var url = new URL('./' + hash, self.registration.scope).href;
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (cs) {
    for (var i = 0; i < cs.length; i++) { if ('focus' in cs[i]) { cs[i].postMessage({ type: 'inv-ir', hash: hash }); return cs[i].focus(); } }
    return self.clients.openWindow(url);
  }));
});
