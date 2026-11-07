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

test('las reglas para la app llevan pesos y límites, nunca importes', async ({ context, page }) => {
  await preparar(context);
  await page.goto('/');
  await page.waitForFunction(() => typeof reglasAvisos === 'function');
  await quitarCapas(page);
  const r = await page.evaluate(() => {
    S.cartera = S.cartera || {};
    S.cartera.limite_acciones = 20;
    S.cartera.perfil = { ...(S.cartera.perfil || {}), limite_cripto: 5, limite_empresa: 10, limite_oro: 10 };
    const f = (id, tipo, clase, valor) => ({ inst: { id, corto: id, nombre: id, tipo, clase }, pos: { stop: 0 }, valor, precio: 10, peso: 0 });
    // dos posiciones de la misma empresa (dos cuentas) suman su peso; 1000 en total, 200 de efectivo
    const M = { total: 1000, liquidez: 200, filas: [f('ACME', 'Acción', 'Renta variable', 60), f('ACME', 'Acción', 'Renta variable', 90), f('BTC', 'Cripto', 'Cripto', 70), f('ORO', 'Fondo', 'Oro', 40), f('MUNDO', 'Fondo', 'Renta variable', 540)] };
    const x = reglasAvisos(M);
    return { reglas: x.reglas.map((q) => ({ id: q.id, w: q.w, a: q.a, g: q.g })), limites: x.limites, json: JSON.stringify(x) };
  });
  expect(r.reglas).toEqual([{ id: 'ACME', w: 0.15, a: 1, g: '' }, { id: 'BTC', w: 0.07, a: 0, g: 'c' }, { id: 'ORO', w: 0.04, a: 0, g: 'o' }, { id: 'MUNDO', w: 0.54, a: 0, g: '' }]);
  expect(r.limites).toEqual({ sue: 20, cri: 5, oro: 10, emp: 10 });
  // ni los 60/90/70/540 de las posiciones ni el total salen en lo que se le pasa a la app
  expect(r.json).not.toMatch(/"valor"|"total"|"importe"/);
});
