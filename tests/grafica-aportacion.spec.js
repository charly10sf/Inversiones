// 0.7e: la aportación automática de hoy (aún sin valor liquidativo, va como «pendiente») no es una subida de la semana.
// Lo vio Carlos el 30 oct: en 1S salían +1.926 € con los 1.250 € de su aportación del día 30 dentro, como un salto al final
import { test as base, expect } from '@playwright/test';
import { preparar, crearCuenta, meterCartera, quitarCapas } from './ayuda.js';

const test = base.extend({
  errores: async ({ context }, use) => {
    const errores = await preparar(context);
    await use(errores);
    expect(errores, 'errores de JavaScript en la página').toEqual([]);
  },
});
test.beforeEach(({}, info) => test.skip(info.project.name !== 'movil', 'solo en el móvil'));

test('la aportación de hoy sin precio no sale como subida en la gráfica ni en la pastilla', async ({ page, errores }) => {
  await crearCuenta(page);
  await quitarCapas(page);
  await meterCartera(page);
  // una aportación grande que toca hoy, en tres fondos (sus valores liquidativos llegan con un día o dos de retraso)
  const pendiente = await page.evaluate(async () => {
    const hoy = hoyIso(), dia = +hoy.slice(8, 10);
    S.cartera.aportaciones = [
      { id: 'a1', instrumento: 'ishares-us', plataforma: 'MyInvestor', importe: 12000, dia, desde: hoy },
      { id: 'a2', instrumento: 'amundi-europe', plataforma: 'MyInvestor', importe: 8000, dia, desde: hoy },
      { id: 'a3', instrumento: 'vanguard-em', plataforma: 'MyInvestor', importe: 5000, dia, desde: hoy },
    ];
    for (const p of S.cartera.posiciones) p.fecha = '2025-01-10';
    await guardarCarteraCallada('prueba');
    S.M = calcular();
    return sum(S.M.filas, (f) => f.pendiente || 0);
  });
  test.skip(pendiente < 20000, 'hoy ya hay valor liquidativo de esos fondos: no queda nada pendiente que probar');

  for (const rango of ['1D', '1S', '1M']) {
    const r = await page.evaluate((rango) => {
      const M = S.M, intra = INTRADIA.has(rango);
      let s = intra ? serieIntradia(M, rango) : serieCartera(M, diasRango(rango));
      if (!intra && s.length) { const extra = M.total - s[s.length - 1].v; s = s.map((x) => ({ d: x.d, v: x.v + extra })); }
      return s.length > 1 ? { ini: s[0].v, penult: s[s.length - 2].v, ult: s[s.length - 1].v, total: M.total } : null;
    }, rango);
    if (!r) continue;
    // la serie acaba en el total de hoy, y el último tramo no lleva dentro los 25.000 € pendientes
    expect(Math.abs(r.ult - r.total), `${rango}: acaba en el total`).toBeLessThan(1);
    expect(Math.abs(r.ult - r.penult), `${rango}: sin salto de la aportación al final`).toBeLessThan(pendiente / 5);
    // ni lo que va de periodo: lo pendiente está igual al principio que al final
    expect(Math.abs(r.ult - r.ini), `${rango}: la variación del periodo no lleva la aportación`).toBeLessThan(pendiente / 2);
  }
});
