// 0.8.2f: el aviso de límites. limitesPasados() devuelve solo los límites que el usuario escribió en Tú y que su cartera
// pasa de verdad (más allá del margen), con hechos y sin ninguna orden; y la opción sale en Ajustes > Avisos.
import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { preparar, quitarCapas } from './ayuda.js';

const fila = (id, tipo, clase, valor) => ({ inst: { id, corto: id, nombre: id, tipo, clase }, valor, peso: 0 });

test('limitesPasados: solo lo que pasa de tu límite, con el hecho y sin órdenes', async ({ context, page }) => {
  const errores = await preparar(context);
  await page.goto('/');
  await page.waitForFunction(() => typeof limitesPasados === 'function');
  await quitarCapas(page);
  const r = await page.evaluate(() => {
    S.cartera = S.cartera || {};
    S.cartera.limite_acciones = 20;
    S.cartera.perfil = { ...(S.cartera.perfil || {}), limite_cripto: 5, limite_empresa: 10, limite_oro: 10 };
    const f = (id, tipo, clase, valor) => ({ inst: { id, corto: id, nombre: id, tipo, clase }, valor, peso: 0 });
    // 1000 en total: una empresa 150 (15 %), cripto 70 (7 %), oro 40 (4 %), el resto en fondos
    const M = { total: 1000, liquidez: 0, filas: [f('ACME', 'Acción', 'Renta variable', 150), f('BTC', 'Cripto', 'Cripto', 70), f('ORO', 'Fondo', 'Oro', 40), f('MUNDO', 'Fondo', 'Renta variable', 740)] };
    const dentro = { total: 1000, liquidez: 0, filas: [f('ACME', 'Acción', 'Renta variable', 80), f('BTC', 'Cripto', 'Cripto', 40), f('MUNDO', 'Fondo', 'Renta variable', 880)] };
    return { pasa: limitesPasados(M).map((x) => ({ k: x.k, a: +x.actual.toFixed(1), l: x.limite })), dentro: limitesPasados(dentro), vacio: limitesPasados({ total: 0, filas: [] }) };
  });
  expect(r.pasa).toEqual([{ k: 'cripto', a: 7, l: 5 }, { k: 'empresa', a: 15, l: 10 }]);
  expect(r.dentro).toEqual([]);
  expect(r.vacio).toEqual([]);
  expect(errores).toEqual([]);
});

test('la opción de límites sale en Avisos y el texto no da órdenes', async ({ page, context }) => {
  await preparar(context);
  await page.goto('/');
  await page.waitForFunction(() => typeof htmlAjAvisos === 'function');
  const h = await page.evaluate(() => { LS.set('inv-avisos', { on: true }); return htmlAjAvisos(); });
  expect(h).toContain('data-av="lim"');
  expect(h).toContain('Cuando tu cartera pasa uno de los límites que pusiste en Tú');
  // el texto del aviso (del código fuente, que el build minifica): un hecho, nunca «vende», «reduce» ni «deberías»
  const src = readFileSync(new URL('../src/js/10-pintado.js', import.meta.url), 'utf8');
  const ini = src.indexOf('if (c.lim) for'), trozo = src.slice(ini, src.indexOf('\n', ini));
  expect(ini).toBeGreaterThan(0);
  expect(trozo).toContain('de tu límite');
  expect(trozo).not.toMatch(/vende|reduce|deberías|compra|sell |should /i);
});
