/* Service worker de Inversiones: abre al instante con la copia guardada de la web (también sin conexión)
   y por detrás descarga la versión nueva; si ha cambiado, avisa a la página.
   Los datos (precios, cartera cifrada, GitHub, Yahoo, Bitvavo) nunca pasan por aquí: la página los guarda aparte. */
var CACHE = 'inv-v13';
var CORE = ['./', 'index.html', 'manifest.webmanifest', 'favicon.svg', 'icon-192.png', 'icon-512.png', 'icon-maskable-512.png', 'apple-touch-icon.png'];
var DATOS = /(^|\/)(instrumentos\.json|cartera\.enc\.json|analisis-ia\.json|analisis\.enc\.json)$/;
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
  e.respondWith(caches.open(CACHE).then(function (c) {
    return c.match(clave).then(function (hit) {
      var red = fetch(req).then(function (res) {
        if (res && (res.ok || res.type === 'opaque')) {
          if (pagina && hit) {
            var a = hit.headers.get('etag') || hit.headers.get('last-modified'), b = res.headers.get('etag') || res.headers.get('last-modified');
            if (a && b && a !== b) avisar();
          }
          c.put(clave, res.clone());
        }
        return res;
      }).catch(function () { return hit; });
      if (hit) { e.waitUntil(red.catch(function () {})); return hit; }
      return red;
    });
  }));
});
