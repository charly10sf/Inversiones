// Presupuesto de rendimiento (0.6): lo que baja GrowFolio al abrir con la cuenta ya creada y cuánto tarda en estar lista,
// en un móvil medio (la CPU 4 veces más lenta) con 4G (9 Mbit/s y 150 ms de ida y vuelta), sin nada en la caché del
// navegador (como el día que sale una versión nueva). Los datos de las ramas pasan por el mismo servidor, comprimidos
// como los sirve GitHub. Firebase y la letra no cuentan: los sirve Google y no dependen de GrowFolio.
import { test, expect } from '@playwright/test';
import { writeFileSync, mkdirSync } from 'node:fs';
import { preparar, crearCuenta, meterCartera, quitarCapas } from './ayuda.js';

// 0.8 (Carlos, 3 nov): 830 KB mientras conviven GrowFolio y Toisón; en el paso 5a, ya con las letras de Toisón siempre
// (Inter e Ibarra, ~100 KB), 900 KB (Carlos, 3 nov) hasta el 5b, que quita lo de GrowFolio, aligera las letras y lo vuelve a bajar
// 5b (3 nov): fuera lo de GrowFolio, lo que tapaba el CSS de Toisón, la cursiva al abrir (el «VI» de la cabecera va con
// la recta inclinada) y lo que no usan las letras (fracciones; Inter e Ibarra, solo latín): 827 KB. Tope de 840 KB y no
// de 830 porque unos 340 KB son los datos del día (radar, histórico, precios), que cambian de tamaño
// 0.9 (Carlos, 3 nov, 21:58: «sube a 1000 KB en previsión de más»), para el rehecho de Hoy y Análisis y el acabado
const PRESUPUESTO = { bytes: 1000 * 1024, listoMs: 2000 };
const MOVIL = { cpu: 4, red: { offline: false, latency: 150, downloadThroughput: (9e6 / 8), uploadThroughput: (1.5e6 / 8) } };

test.beforeEach(({}, info) => test.skip(info.project.name !== 'movil', 'se mide en el móvil'));

test('abrir con la cuenta: bytes por la red y tiempo hasta estar lista', async ({ page, context }, info) => {
  const errores = await preparar(context, {});
  // los datos de las ramas, por el servidor de pruebas (así cuentan en la red y en el tiempo)
  await context.addInitScript(() => {
    const f = window.fetch;
    window.fetch = (u, o) => {
      const s = typeof u === 'string' ? u : u && u.url;
      const m = s && s.match(/^https:\/\/raw\.githubusercontent\.com\/[^/]+\/[^/]+\/([^/]+)\/(.*)$/);
      return f.call(window, m ? `/__datos/${m[1]}/${m[2]}` : u, o);
    };
  });
  await crearCuenta(page);
  await quitarCapas(page);
  await meterCartera(page);
  await page.waitForTimeout(1500);

  const cdp = await context.newCDPSession(page);
  await cdp.send('Network.enable');
  await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
  await cdp.send('Network.emulateNetworkConditions', MOVIL.red);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: MOVIL.cpu });
  const pet = new Map();
  cdp.on('Network.requestWillBeSent', (e) => pet.set(e.requestId, { url: e.request.url, t0: e.timestamp }));
  cdp.on('Network.loadingFinished', (e) => { const r = pet.get(e.requestId); if (r) { r.bytes = e.encodedDataLength; r.t1 = e.timestamp; } });

  await page.reload({ waitUntil: 'commit' });
  // tocar la entrada la salta: entra en cuanto está todo cargado
  await page.locator('#entrada').click({ timeout: 20_000 }).catch(() => {});
  await expect(page.locator('.hero-num')).toBeVisible({ timeout: 60_000 });
  const listo = await page.evaluate(() => { const m = performance.getEntriesByName('gf-listo')[0]; return m ? Math.round(m.startTime) : null; });
  const inicio = await page.evaluate(() => Math.round(performance.now()));
  await page.waitForTimeout(1000);

  const propias = [...pet.values()].filter((r) => r.bytes != null && /^http:\/\/localhost/.test(r.url));
  const bytes = propias.reduce((s, r) => s + r.bytes, 0);
  const lista = propias.sort((a, b) => b.bytes - a.bytes).map((r) => `${String(Math.round(r.bytes / 1024)).padStart(5)} KB  ${r.url.replace(/^http:\/\/localhost:\d+\//, '').replace(/\?.*/, '')}`);
  const informe = `Abrir con la cuenta (móvil medio, 4G, sin caché)\n  lista (gf-listo): ${listo} ms · Inicio pintado: ${inicio} ms\n  por la red: ${Math.round(bytes / 1024)} KB en ${propias.length} peticiones\n${lista.slice(0, 20).join('\n')}\n`;
  console.log(informe);
  mkdirSync('test-results', { recursive: true });
  writeFileSync('test-results/rendimiento.txt', informe);
  await info.attach('rendimiento', { body: informe, contentType: 'text/plain' });
  expect(errores).toEqual([]);
  expect(listo, 'el arranque marca gf-listo').not.toBeNull();
  if (process.env.GF_PRESUPUESTO !== 'no') {
    expect(bytes, `por la red, menos de ${PRESUPUESTO.bytes / 1024} KB`).toBeLessThan(PRESUPUESTO.bytes);
    expect(listo, `lista en menos de ${PRESUPUESTO.listoMs} ms`).toBeLessThan(PRESUPUESTO.listoMs);
  }
});

// 0.8.2 (6 nov): el radar con todas las empresas (las 2.864) en un móvil medio. Antes de esto, abrir «Del radar» con 10 filas
// tardaba 604 ms y «Ver las 2.379» 11,5 s (ordenar, 13,5 s; la página medía 422.000 px). Ahora: sale por páginas, ordenar o
// cambiar de zona repinta solo la tabla y las señales se calculan solo para lo que se pinta. Se mide con la CPU 4 veces más
// lenta; cada paso en una sola tarea (sin esperas) con el diseño forzado dentro, y los topes llevan margen
const RADAR = { delRadarMs: 1500, tablaMs: 400, paginaMs: 300, nodos: 14000 };
test('el radar con 2.800 empresas: «Del radar», ordenar, cambiar de zona y «Ver 50 más»', async ({ page, context }, info) => {
  await preparar(context, {});
  await crearCuenta(page);
  await quitarCapas(page);
  await meterCartera(page);
  await page.waitForFunction(() => S.radar && S.radar.valores && S.radar.valores.length > 2000, null, { timeout: 60_000 });
  await page.waitForFunction(() => S.escaneo, null, { timeout: 20_000 }).catch(() => {});
  await page.waitForTimeout(1500);
  const cdp = await context.newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: MOVIL.cpu });
  await page.evaluate(() => {
    document.querySelectorAll('.hoja-fondo').forEach((h) => h.remove());
    S.acceso = 'privado'; S.expTab = 'ideas'; S.radarN = 0; S.radarZona = 'Todas'; S.radarOrden = 'cap'; S.radarMin = true; S.radarSolidas = false;
    location.hash = '#expertos'; pintar();
  });
  await page.waitForSelector('#radarCuerpo tr[data-consulta]');
  await page.waitForTimeout(1500);
  const m = await page.evaluate(() => {
    const medir = (f) => { const t0 = performance.now(); f(); document.body.offsetHeight; return Math.round(performance.now() - t0); };
    const r = { empresas: radarVals().length };
    // la primera vez: con las cachés vacías, como cuando llega un radar nuevo; la segunda, con ellas llenas
    r.delRadarPrimera = medir(() => { S.radarVer++; pintar(); });
    r.delRadar = medir(() => pintar());
    const clic = (sel) => document.querySelector(sel).click();
    r.ordenarNombre = medir(() => clic('thead [data-orden="n"]'));
    r.zona = medir(() => clic('[data-zona="EEUU"]'));
    r.zonaTodas = medir(() => clic('[data-zona="Todas"]'));
    r.paginas = [];
    for (let i = 0; i < 5; i++) r.paginas.push(medir(() => clic('[data-radar-mas]')));
    r.filas = document.querySelectorAll('#radarCuerpo tr').length;
    r.nodos = document.querySelectorAll('#vista *').length;
    r.alto = document.documentElement.scrollHeight;
    r.solidas = medir(() => { document.querySelector('[data-radar-solidas]').click(); });
    return r;
  });
  const informe = `El radar con ${m.empresas} empresas (móvil medio, CPU 4×)\n  «Del radar»: primera vez ${m.delRadarPrimera} ms, repintada ${m.delRadar} ms\n  ordenar por nombre: ${m.ordenarNombre} ms · cambiar de zona: ${m.zona} ms (y vuelta a Todas: ${m.zonaTodas} ms) · «Solo bien contrastadas»: ${m.solidas} ms\n  «Ver 50 más» (5 veces): ${m.paginas.join(', ')} ms\n  tras 5 páginas: ${m.filas} filas, ${m.nodos} nodos, página de ${m.alto} px`;
  console.log(informe);
  await info.attach('radar', { body: informe, contentType: 'text/plain' });
  expect(m.delRadarPrimera, 'abrir «Del radar» la primera vez').toBeLessThan(RADAR.delRadarMs);
  expect(m.delRadar, 'repintar «Del radar»').toBeLessThan(RADAR.delRadarMs);
  expect(m.zona, 'cambiar de zona').toBeLessThan(RADAR.tablaMs);
  expect(m.solidas, '«Solo bien contrastadas»').toBeLessThan(RADAR.tablaMs * 2);
  for (const p of m.paginas) expect(p, '«Ver 50 más»').toBeLessThan(RADAR.paginaMs);
  expect(m.nodos, 'nodos de la vista con 270 filas').toBeLessThan(RADAR.nodos);
});
