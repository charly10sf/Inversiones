// Radar ampliado (Carlos, 5 nov 2026: por tamaño, sin mirar a los analistas, tantas como aguante): radar.json trae las
// fijas y las más grandes y se baja al abrir; radar-mas.json, el resto, se baja después (cargarRadarMas) y se junta
// detrás (juntarRadar). Si una está en los dos, vale la de radar.json; si cambia radar.json, el resto sigue; con el
// mismo radar_mas_id no se vuelve a bajar; y no se guarda en el dispositivo
import { test as base, expect } from '@playwright/test';
import { preparar, crearCuenta, meterCartera, quitarCapas } from './ayuda.js';

const test = base.extend({
  errores: [async ({ context }, use) => {
    const errores = await preparar(context);
    await use(errores);
    expect(errores, 'errores de JavaScript en la página').toEqual([]);
  }, { auto: true }],
});
test.beforeEach(({}, info) => test.skip(info.project.name !== 'movil', 'solo en el móvil'));

const ficha = (s, n, z = 'EEUU') => ({ s, n, z, sector: 'Tecnología', m: 'USD', p: 10, pe: 9.2, v: 1.5, cap: 3e9, f: '2026-11-05T12:00:00+00:00' });

test('el resto del radar llega después y se junta detrás', async ({ page, context }) => {
  let pedidas = 0;
  await context.route('https://raw.githubusercontent.com/**/radar-mas.json*', (r) => {
    if (r.request().url().includes('prueba-1')) pedidas++;
    return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ generado: '2026-11-05T12:00:00+00:00', valores: [ficha('MASUNO', 'Mas Uno Corp'), ficha('MASDOS', 'Mas Dos AG', 'Europa')] }) });
  });
  await crearCuenta(page);
  await quitarCapas(page);
  await meterCartera(page);
  const r = await page.evaluate(async () => {
    const antes = S.radar.valores.length;
    const una = S.radar.valores[0];
    // una que ya está en radar.json también llega en radar-mas.json: vale la de radar.json
    const repe = { ...una, n: 'LA DE RADAR-MAS' };
    const f = window.fetch;
    window.fetch = (u, o) => (String(u).includes('radar-mas.json') ? f(u, o).then(async (x) => { const j = await x.json(); j.valores.push(repe); return new Response(JSON.stringify(j), { status: 200 }); }) : f(u, o));
    S.precios.radar_mas_id = 'prueba-1';
    const llego = await cargarRadarMas();
    const otraVez = await cargarRadarMas();
    window.fetch = f;
    const sims = radarVals().map((x) => x.s);
    const juntas = { llego, otraVez, antes, despues: S.radar.valores.length, uno: sims.includes('MASUNO'), dos: sims.includes('MASDOS'),
      repe: S.radar.valores.filter((x) => x.s === una.s).map((x) => x.n), detras: S.radar.valores.findIndex((x) => x.s === 'MASUNO') >= antes };
    // llega otro radar.json: el resto sigue detrás
    S.radarId = null;
    await cargarRadar();
    juntas.trasRecargar = radarVals().some((x) => x.s === 'MASDOS');
    juntas.guardado = Object.keys(localStorage).some((k) => (localStorage.getItem(k) || '').includes('MASUNO'));
    return juntas;
  });
  expect(r.llego).toBe(true);
  expect(r.otraVez).toBe(false);
  expect(r.despues).toBe(r.antes + 2);
  expect(r.uno && r.dos && r.detras).toBe(true);
  expect(r.repe.length).toBe(1);
  expect(r.repe[0]).not.toBe('LA DE RADAR-MAS');
  expect(r.trasRecargar).toBe(true);
  expect(r.guardado).toBe(false);
  expect(pedidas).toBe(1);
});

test('sin radar_mas_id (los datos de antes) o si no llega, se sigue con radar.json', async ({ page, context }) => {
  await context.route('https://raw.githubusercontent.com/**/radar-mas.json*', (r) => r.fulfill({ status: 404, body: '' }));
  await crearCuenta(page);
  await quitarCapas(page);
  await meterCartera(page);
  const r = await page.evaluate(async () => {
    const n = S.radar.valores.filter((x) => !x.mas).length;
    delete S.precios.radar_mas_id; S.radarMasId = null;
    const sinId = await cargarRadarMas();
    S.precios.radar_mas_id = 'no-llega';
    const noLlega = await cargarRadarMas();
    return { sinId, noLlega, igual: S.radar.valores.filter((x) => !x.mas).length === n, n };
  });
  expect(r).toEqual({ sinId: false, noLlega: false, igual: true, n: r.n });
  expect(r.n).toBeGreaterThan(100);
});
