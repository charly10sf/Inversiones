// 0.8.2a: «el precio de compra no cuadra» no sale cuando el histórico es semanal (el del radar, para lo que añade cada uno).
// Lo vio Carlos el 6 nov con Western Digital: pagó 332,33 € el 2 nov; el cierre semanal de ese lunes eran 238,53 €,
// pero la semana anterior había cerrado a 326,30 € y la acción se mueve un 40 % por semana.
import { test as base, expect } from '@playwright/test';
import { preparar, crearCuenta, quitarCapas, meterCartera } from './ayuda.js';

const test = base.extend({
  errores: async ({ context }, use) => {
    const errores = await preparar(context);
    await use(errores);
    expect(errores, 'errores de JavaScript en la página').toEqual([]);
  },
});
test.beforeEach(({}, info) => test.skip(info.project.name !== 'movil', 'solo en el móvil'));

test('histórico semanal: no avisa si lo pagado cabe entre los cierres que rodean el día; el diario sigue avisando', async ({ page, errores }) => {
  await crearCuenta(page);
  await quitarCapas(page);
  await meterCartera(page);
  const r = await page.evaluate(() => {
    const semanal = [['2026-10-19', 306.2], ['2026-10-26', 326.3], ['2026-11-02', 238.53], ['2026-11-06', 288.62]];
    const diario = [['2026-10-29', 330.1], ['2026-10-30', 328.4], ['2026-11-02', 238.53], ['2026-11-03', 241.0]];
    const lotes = (pagado) => [{ f: '2026-11-02', u: 1, c: pagado }];
    const antes = lotesDe;
    const prueba = (hist, pagado) => {
      lotesDe = () => lotes(pagado);
      try {
        const f = { estimada: false, hist, uds: 1, coste: pagado, pos: { id: 'p', desde: '2026-11-02' }, inst: { id: 'wdc', corto: 'WDC', clase: 'Acción', nombre: 'Western Digital' } };
        return !!precioCompraRaro(f);
      } finally { lotesDe = antes; }
    };
    return { semanalReal: prueba(semanal, 332.33), semanalLejos: prueba(semanal, 900), diarioReal: prueba(diario, 332.33), rango: rangoPrecioEn(semanal, '2026-11-02') };
  });
  expect(r.semanalReal, 'semanal, pagado dentro del rango').toBe(false);
  expect(r.semanalLejos, 'semanal, pagado muy lejos de todo').toBe(true);
  expect(r.diarioReal, 'diario, el cierre manda').toBe(true);
  expect(r.rango).toMatchObject({ grueso: true, lo: 238.53, hi: 326.3 });
});

test('cierres semanales del radar: la barra de la semana en curso (fecha del lunes, precio de hoy) no cuenta como el lunes', async ({ page, errores }) => {
  await crearCuenta(page);
  await quitarCapas(page);
  const pts = await page.evaluate(() => {
    // generado el jueves 5 nov 2026; la última barra va fechada el lunes 2 nov pero lleva el cierre del jueves
    const rh = { generado: '2026-11-05T21:36:49+00:00', paso: 7 };
    return puntosRadarHist({ d: '2026-10-19', v: [306, 326, 267.63] }, rh);
  });
  expect(pts).toEqual([['2026-10-19', 306], ['2026-10-26', 326]]);
});
