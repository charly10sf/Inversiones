// 16 nov 2026 (menos peticiones a Yahoo): con la bolsa cerrada, las velas de 30 minutos de /intradia se guardan más tiempo
// en la caché del Worker (lo mismo que daría Yahoo hasta la sesión siguiente); con la bolsa abierta, 12 minutos como siempre.
import { test, expect } from '@playwright/test';
import worker from '../worker/src/index.js';

test.beforeEach(({}, info) => test.skip(info.project.name !== 'movil', 'una vez basta'));

function cacheConTiempos() {
  const m = new Map(), ttl = new Map();
  return { ttl, default: { match: async (r) => (m.has(r.url) ? new Response(m.get(r.url)) : undefined), put: async (r, res) => { m.set(r.url, await res.text()); ttl.set(r.url, res.headers.get('Cache-Control')); } } };
}
const grafico = (tipo, fin, velas) => ({ chart: { result: [{ meta: { currency: 'EUR', instrumentType: tipo, currentTradingPeriod: { regular: { start: fin - 8.5 * 3600, end: fin } } },
  timestamp: velas.map((x) => x[0]), indicators: { quote: [{ close: velas.map((x) => x[1]) }] } }] } });

test('el Worker guarda más tiempo las velas de una bolsa ya cerrada', async () => {
  const ahora = Math.floor(Date.now() / 1000);
  const cerrada = ahora - 2 * 3600, abierta = ahora + 3600;
  const velas = (fin) => Array.from({ length: 6 }, (_, k) => [Math.min(fin, ahora) - (6 - k) * 1800, 10 + k]);
  const fetchAntes = globalThis.fetch, cachesAntes = globalThis.caches;
  const cache = cacheConTiempos();
  globalThis.caches = cache;
  globalThis.fetch = async (url) => {
    const sim = decodeURIComponent((String(url).match(/chart\/([^?]+)/) || [])[1] || '');
    if (sim === 'SAN.MC') return new Response(JSON.stringify(grafico('EQUITY', cerrada, velas(cerrada))));
    if (sim === 'IBE.MC') return new Response(JSON.stringify(grafico('EQUITY', abierta, velas(abierta))));
    // cerró hace 30 minutos: todavía puede cambiar la última vela
    if (sim === 'ITX.MC') return new Response(JSON.stringify(grafico('EQUITY', ahora - 1800, velas(ahora - 1800))));
    // el oro en futuros: casi todo el día abierto, como siempre
    if (sim === 'GC=F') return new Response(JSON.stringify(grafico('FUTURE', cerrada, velas(cerrada))));
    throw new Error('fuera de la prueba: ' + url);
  };
  try {
    const r = await worker.fetch(new Request('https://w.prueba/intradia?s=SAN.MC,IBE.MC,ITX.MC,GC=F', { headers: { Origin: 'https://charly10sf.github.io' } }), {}, { waitUntil() {} });
    expect(r.status).toBe(200);
    const j = await r.json();
    expect(j.p['SAN.MC'].length).toBe(6);
    const ttl = (s) => +String(cache.ttl.get(`https://growfolio.cache/intra/${encodeURIComponent(s)}`)).replace('max-age=', '');
    expect(ttl('SAN.MC')).toBeGreaterThan(720);
    expect(ttl('SAN.MC')).toBeLessThanOrEqual(3 * 3600);
    expect(ttl('IBE.MC')).toBe(720);
    expect(ttl('ITX.MC')).toBe(720);
    expect(ttl('GC=F')).toBe(720);
  } finally {
    globalThis.fetch = fetchAntes;
    globalThis.caches = cachesAntes;
  }
});
