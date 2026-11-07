// 0.8.2f: en el modo público (estándar) los textos de los límites solo dicen el hecho frente a lo que el usuario puso:
// nada de «no añadas», «vende una parte» o «lo nuevo, mejor a…» (regla CNMV). El fundador conserva sus textos.
import { test, expect } from '@playwright/test';
import { preparar, quitarCapas } from './ayuda.js';

const ORDENES = /añad|vende|vendas|vender|metas más|meter más|le metas|mejor a |dilu|complétalo|crecer más|don.t add|sell |dilute|before adding/i;

for (const modo of ['publico', 'privado']) {
  test(`límites en modo ${modo}: textos ${modo === 'publico' ? 'sin órdenes' : 'con consejos'}`, async ({ context, page }) => {
    const errores = await preparar(context);
    await page.goto('/');
    await page.waitForFunction(() => typeof comparaObjetivos === 'function');
    await quitarCapas(page);
    const r = await page.evaluate((modo) => {
      S.acceso = modo;
      S.cartera = S.cartera || {};
      S.cartera.limite_acciones = 20;
      S.cartera.perfil = { ...(S.cartera.perfil || {}), limite_cripto: 5, limite_empresa: 10, limite_oro: 10, colchon_meses: 6, gastos_mes: 1000 };
      const f = (id, tipo, clase, valor) => ({ inst: { id, corto: id, nombre: id, tipo, clase }, valor, peso: 0 });
      const mk = (a, b, o, m) => ({ total: 1000, liquidez: 0, filas: [f('ACME', 'Acción', 'Renta variable', a), f('BTC', 'Cripto', 'Cripto', b), f('ORO', 'Fondo', 'Oro', o), f('MUNDO', 'Fondo', 'Renta variable', m)] });
      // 1.ª: sueltas 19 % (cerca), cripto 5,4 % (se pasa poco), oro 9 % (cerca), empresa 19 % (fuera); 2.ª: sueltas 30 % (fuera)
      const t = (M) => comparaObjetivos(M).filas.map((x) => x.txt);
      return { a: t(mk(190, 54, 90, 666)), b: t(mk(300, 0, 0, 700)) };
    }, modo);
    const todos = [...r.a, ...r.b].join(' | ');
    expect(r.a.length).toBeGreaterThan(3);
    if (modo === 'publico') {
      expect(todos).not.toMatch(ORDENES);
      expect(todos).toContain('Te pasas de tu límite.');
      expect(todos).toContain('Cerca de tu límite.');
    } else {
      expect(todos).toMatch(/no añadas/);
      expect(todos).toMatch(/vende una parte/);
    }
    expect(errores).toEqual([]);
  });
}

test('en inglés, el modo público tampoco da órdenes en los límites', async ({ context, page }) => {
  await preparar(context);
  await page.addInitScript(() => { try { localStorage.setItem('inv-idioma', JSON.stringify('en')); } catch (e) {} });
  await page.goto('/');
  await page.waitForFunction(() => typeof comparaObjetivos === 'function');
  await quitarCapas(page);
  const t = await page.evaluate(() => {
    if (IDIOMA !== 'en') throw new Error('el idioma no se fijó en inglés');
    S.acceso = 'publico';
    S.cartera = S.cartera || {};
    S.cartera.limite_acciones = 20;
    const f = (id, tipo, clase, valor) => ({ inst: { id, corto: id, nombre: id, tipo, clase }, valor, peso: 0 });
    return comparaObjetivos({ total: 1000, liquidez: 0, filas: [f('ACME', 'Acción', 'Renta variable', 300), f('MUNDO', 'Fondo', 'Renta variable', 700)] }).filas.map((x) => x.txt).join(' | ');
  });
  expect(t).not.toMatch(/don.t add|sell |dilute|before adding/i);
});
