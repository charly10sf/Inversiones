// 0.8.3 · lo que cuestan las «ideas» (mejoresIdeas0, 13-expertos.js): lo que no depende de la cartera se calcula una vez por
// empresa y versión del radar (puntuarBase); la memoria de ideas propuestas se lee una vez por pasada, no una por empresa; y
// solo se puntúan las que pueden quedar por el contraste. El resultado tiene que ser el mismo que calculándolo todo de nuevo.
import { test, expect } from '@playwright/test';
import { preparar, crearCuenta, meterCartera, quitarCapas } from './ayuda.js';

test.beforeEach(({}, info) => test.skip(info.project.name !== 'movil', 'solo en el móvil'));

for (const modo of ['publico', 'privado']) {
  test(`las ideas salen iguales con la caché que calculándolas de nuevo (${modo}), y la memoria no se lee por empresa`, async ({ page, context }) => {
    const errores = await preparar(context);
    await crearCuenta(page); await quitarCapas(page); await meterCartera(page);
    const r = await page.evaluate(async (a) => {
      S.acceso = a; LS.set('inv-acceso', { a, uid: FB.user.uid, t: Date.now() });
      await cargarEscaneo().catch(() => {}); await cargarRadarMas().catch(() => {});
      const foto = (xs) => JSON.stringify(xs.map((x) => [x.s, x.puntos.toFixed(9), x.motivos, x.pegas]));
      const M = calcular();
      const a1 = foto(mejoresIdeas0(M));
      // otra cartera calculada (como con cada precio nuevo): la parte fija sale de la caché
      const a2 = foto(mejoresIdeas0(calcular()));
      // con el radar «nuevo» se recalcula todo (también el contraste)
      S.radarVer = (S.radarVer || 0) + 1;
      const a3 = foto(mejoresIdeas0(calcular()));
      // la memoria de ideas propuestas, leída una vez por pasada
      const orig = Storage.prototype.getItem; let n = 0;
      Storage.prototype.getItem = function (k) { if (k === 'inv-ideas-propuestas') n++; return orig.call(this, k); };
      mejoresIdeas0(calcular());
      Storage.prototype.getItem = orig;
      return { igual: a1 === a2 && a2 === a3, n: JSON.parse(a1).length, lecturas: n, radar: radarVals().length };
    }, modo);
    expect(r.radar).toBeGreaterThan(500);
    expect(r.n).toBeGreaterThan(10);
    expect(r.igual).toBe(true);
    // una para mirar las ya propuestas y otra al apuntar las tres primeras (antes, una por cada empresa del radar)
    expect(r.lecturas).toBeLessThanOrEqual(2);
    expect(errores).toEqual([]);
  });
}

test('las pegas siguen en su orden: lo de tu cartera va antes que el dólar, la tasa y la retención', async ({ page, context }) => {
  await preparar(context);
  await crearCuenta(page); await quitarCapas(page); await meterCartera(page);
  const r = await page.evaluate(() => {
    const x = { s: 'ZZZ', n: 'Prueba', z: 'EEUU', sector: 'Technology', pot: 30, rm: 1.5, na: 20, perf: 35, c1a: -20, div: 0 };
    const ctx = { sectores: { Technology: 40 }, total: 1000, dentro: () => 50, industrias: {} };
    return puntuarIdea(x, ctx).pegas;
  });
  const i = (re) => r.findIndex((t) => re.test(t));
  expect(i(/cara: PER/)).toBe(0);
  expect(i(/ha caído/)).toBe(1);
  expect(i(/ya tienes un 40 %/)).toBeGreaterThan(i(/ha caído/));
  expect(i(/dentro de tus fondos/)).toBeGreaterThan(i(/ya tienes un 40 %/));
  expect(i(/dólares/)).toBeGreaterThan(i(/dentro de tus fondos/));
});
