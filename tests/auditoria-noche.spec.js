// 14 nov 2026 · auditoría (claude/auditoria-noche-14nov.md): lo de la web.
import { test as base, expect } from '@playwright/test';
import { preparar, crearCuenta, meterCartera, quitarCapas } from './ayuda.js';

const test = base.extend({
  errores: async ({ context }, use) => {
    const errores = await preparar(context);
    await use(errores);
    expect(errores, 'errores de JavaScript en la página').toEqual([]);
  },
});

test('en Mercados, el bitcoin de Bitvavo dice lo de hoy y no lo de las últimas 24 horas', async ({ page, errores }, info) => {
  test.skip(info.project.name !== 'movil', 'una vez basta');
  await crearCuenta(page);
  await meterCartera(page);
  await quitarCapas(page);
  const r = await page.evaluate(() => {
    const m = S.precios.mercados['BTC-EUR'];
    LIVE.mapas();
    const tick = { market: 'BTC-EUR', last: '63000', open: '70000', timestamp: Date.now() };   // 24 horas: −10 %
    // el dato de precios.json es de hoy: se mide desde su cierre anterior
    Object.assign(m, { fecha: hoyIso(), precio: 61000, cierre_anterior: 60000 });
    LIVE.alTickerBitvavo(tick);
    const deHoy = datoMerc('BTC-EUR').var;
    // el dato es de ayer (de madrugada, antes de la primera pasada): desde ese último precio
    Object.assign(m, { fecha: sumarDias(hoyIso(), -1), precio: 61000, cierre_anterior: 60000 });
    LIVE.alTickerBitvavo(tick);
    const deAyer = datoMerc('BTC-EUR').var;
    return { deHoy, deAyer, precio: datoMerc('BTC-EUR').precio, pos: S.live.btc && S.live.btc.precio, ctx: contextoAsesor(S.M, 'revision', true).split('\n').find((l) => /\] Bitcoin:/.test(l)) };
  });
  expect(r.deHoy).toBeCloseTo(5, 5);
  expect(r.deAyer).toBeCloseTo((63000 / 61000 - 1) * 100, 5);
  expect(r.precio).toBe(63000);
  expect(r.pos).toBe(63000);   // la posición sigue recibiendo su precio en directo
  expect(r.ctx).toMatch(/hoy \+3,3/);   // y es lo que lee la IA
});
