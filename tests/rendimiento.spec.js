// Presupuesto de rendimiento (0.6): lo que baja GrowFolio al abrir con la cuenta ya creada y cuánto tarda en estar lista,
// en un móvil medio (la CPU 4 veces más lenta) con 4G (9 Mbit/s y 150 ms de ida y vuelta), sin nada en la caché del
// navegador (como el día que sale una versión nueva). Los datos de las ramas pasan por el mismo servidor, comprimidos
// como los sirve GitHub. Firebase y la letra no cuentan: los sirve Google y no dependen de GrowFolio.
import { test, expect } from '@playwright/test';
import { writeFileSync, mkdirSync } from 'node:fs';
import { preparar, crearCuenta, meterCartera, quitarCapas } from './ayuda.js';

const PRESUPUESTO = { bytes: 800 * 1024, listoMs: 2000 };
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
