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

// de punta a punta en el navegador: con la pestaña oculta y el permiso dado, revisarAvisos manda UNA notificación por límite
// pasado, con el hecho y sin órdenes, y no la repite al volver a revisar
test('revisarAvisos manda la notificación del límite una sola vez', async ({ context, page }) => {
  await preparar(context);
  await page.clock.setFixedTime(new Date('2026-11-07T12:00:00'));
  await page.addInitScript(() => {
    window.__noti = [];
    Object.defineProperty(document, 'hidden', { get: () => true, configurable: true });
    class N { constructor(t, o) { window.__noti.push({ t, b: o && o.body }); } static get permission() { return 'granted'; } close() {} }
    window.Notification = N;
    Object.defineProperty(navigator.serviceWorker, 'getRegistration', { value: async () => undefined, configurable: true });
  });
  await page.goto('/');
  await page.waitForFunction(() => typeof revisarAvisos === 'function');
  await quitarCapas(page);
  const r = await page.evaluate(async () => {
    S.demo = false;
    S.cartera = S.cartera || {};
    S.cartera.limite_acciones = 20;
    S.cartera.perfil = { ...(S.cartera.perfil || {}), limite_cripto: 5, limite_empresa: 10, limite_oro: 10 };
    LS.set('inv-avisos', { on: true }); LS.del('inv-avisos-hechos');
    const f = (id, tipo, clase, valor) => ({ inst: { id, corto: id, nombre: id, tipo, clase }, pos: { stop: 0 }, precio: 10, varDia: 0, valor, peso: 0 });
    const M = { total: 1000, liquidez: 0, filas: [f('BTC', 'Cripto', 'Cripto', 70), f('MUNDO', 'Fondo', 'Renta variable', 930)] };
    revisarAvisos(M); await new Promise((r) => setTimeout(r, 100));
    const primera = window.__noti.slice();
    revisarAvisos(M); await new Promise((r) => setTimeout(r, 100));
    return { primera, total: window.__noti.length };
  });
  expect(r.primera.length).toBe(1);
  expect(r.primera[0].t).toContain('Cripto pasa de tu límite');
  expect(r.primera[0].b).toMatch(/7,0 % de tu cartera y tu límite es 5 %/);
  expect(r.primera[0].b + r.primera[0].t).not.toMatch(/vende|reduce|deberías|compra/i);
  expect(r.total).toBe(1);
});

// el límite de caída desde máximos: lo escribe el usuario en Tú (vacío = sin límite) y se mide frente al máximo de 12 meses
// de lo que tiene invertido; el aviso dice el hecho, sin órdenes
const ORDENES_CAIDA = /vende|reduce|deberías|compra|añad|sell |should |buy /i;
const mundoConCaida = () => {
  // 60 días: sube de 80 a 100 en 30 días y baja a 80 en otros 30 (máximo 100, hoy 80: -20 %)
  const hist = [];
  for (let i = 59; i >= 0; i--) {
    const d = iso(new Date(Date.now() - i * 864e5)), k = 59 - i, p = k <= 30 ? 80 + (20 * k) / 30 : 100 - (20 * (k - 30)) / 29;
    hist.push([d, +p.toFixed(4)]);
  }
  return { total: 1000, liquidez: 0, filas: [{ inst: { id: 'MUNDO', corto: 'MUNDO', nombre: 'MUNDO', tipo: 'Fondo', clase: 'Renta variable' }, pos: { stop: 0 }, uds: 12.5, precio: 80, varDia: 0, valor: 1000, peso: 0, hist }] };
};

test('límite de caída: sin límite no avisa; con límite menor que la caída sí, con el hecho y sin órdenes', async ({ context, page }) => {
  await preparar(context);
  await page.goto('/');
  await page.waitForFunction(() => typeof caidaActual === 'function');
  await quitarCapas(page);
  const r = await page.evaluate((src) => {
    const mundo = new Function('iso', `return (${src})()`)(iso);
    S.cartera = S.cartera || {};
    S.cartera.limite_acciones = 20;
    const con = (v) => { S.cartera.perfil = { ...(S.cartera.perfil || {}), limite_caida: v, limite_cripto: 5, limite_empresa: 10, limite_oro: 10 }; return limitesPasados(mundo).filter((x) => x.k === 'caida'); };
    const c = caidaActual(mundo);
    const sin = con(null), vacio = con(''), cero = con(0), alto = con(25), bajo = con(15);
    S.cartera.perfil.limite_caida = 15;
    const fila = comparaObjetivos(mundo).filas.find((x) => x.k === 'caida');
    S.acceso = 'publico';
    const filaPub = comparaObjetivos(mundo).filas.find((x) => x.k === 'caida');
    S.tuLim = null; S.cartera.perfil.limite_caida = 12;
    const form = panelLimites(mundo);
    return { ahora: +c.ahora.toFixed(1), pico: +c.pico.toFixed(3), sin, vacio, cero, alto, bajo: bajo.map((x) => ({ a: +x.actual.toFixed(1), l: x.limite, t: x.titulo, c: x.cuerpo })), fila: fila && { estado: fila.estado, txt: fila.txt }, filaPub: filaPub && filaPub.txt, form };
  }, mundoConCaida.toString());
  expect(r.ahora).toBe(20);
  expect(r.pico).toBe(1.25);
  expect(r.sin).toEqual([]); expect(r.vacio).toEqual([]); expect(r.cero).toEqual([]); expect(r.alto).toEqual([]);
  expect(r.bajo.length).toBe(1);
  expect(r.bajo[0].a).toBe(20); expect(r.bajo[0].l).toBe(15);
  expect(r.bajo[0].c).toMatch(/20,0 % por debajo de su máximo de los últimos 12 meses y tu límite es 15 %/);
  expect(r.bajo[0].t + r.bajo[0].c).not.toMatch(ORDENES_CAIDA);
  expect(r.fila.estado).toBe('fuera');
  expect(r.fila.txt + r.filaPub).not.toMatch(ORDENES_CAIDA);
  // 0.8.3: el límite se cambia en la pantalla Límites de Tú, con − y +
  expect(r.form).toContain('data-tulim="caida:-1"');
  expect(r.form).toContain('12 %');
});

test('límite de caída: las reglas para la app llevan el límite y el máximo, y el aviso del navegador sale una sola vez', async ({ context, page }) => {
  await preparar(context);
  await page.clock.setFixedTime(new Date('2026-11-07T12:00:00'));
  await page.addInitScript(() => {
    window.__noti = [];
    Object.defineProperty(document, 'hidden', { get: () => true, configurable: true });
    class N { constructor(t, o) { window.__noti.push({ t, b: o && o.body }); } static get permission() { return 'granted'; } close() {} }
    window.Notification = N;
    Object.defineProperty(navigator.serviceWorker, 'getRegistration', { value: async () => undefined, configurable: true });
  });
  await page.goto('/');
  await page.waitForFunction(() => typeof reglasAvisos === 'function' && typeof caidaActual === 'function');
  await quitarCapas(page);
  const r = await page.evaluate(async (src) => {
    // con el reloj fijo las fechas relativas a «hoy» siguen siendo coherentes porque Date.now() también está fijo
    const mundo = new Function('iso', `return (${src})()`)(iso);
    S.demo = false;
    S.cartera = S.cartera || {};
    S.cartera.limite_acciones = 20;
    S.cartera.perfil = { ...(S.cartera.perfil || {}), limite_caida: 15, limite_cripto: 5, limite_empresa: 10, limite_oro: 10 };
    LS.set('inv-avisos', { on: true }); LS.del('inv-avisos-hechos');
    const x = reglasAvisos(mundo);
    revisarAvisos(mundo); await new Promise((r) => setTimeout(r, 100));
    const primera = window.__noti.slice();
    revisarAvisos(mundo); await new Promise((r) => setTimeout(r, 100));
    return { cai: x.limites.cai, json: JSON.stringify(x), primera, total: window.__noti.length };
  }, mundoConCaida.toString());
  expect(r.cai).toEqual({ l: 15, pk: 1.25 });
  expect(r.primera.length).toBe(1);
  expect(r.primera[0].t).toContain('pasa de la caída que te pusiste');
  expect(r.primera[0].b).toMatch(/20,0 % por debajo de su máximo de los últimos 12 meses y tu límite es 15 %/);
  expect(r.primera[0].t + r.primera[0].b).not.toMatch(ORDENES_CAIDA);
  expect(r.total).toBe(1);
  expect(r.json).not.toMatch(/"valor"|"total"|"importe"/);
});

test('límite de caída: en Límites va de 1 a 90 % y se puede quitar (la pantalla, en tests/pestana-tu.spec.js)', async ({ context, page }) => {
  await preparar(context);
  await page.goto('/');
  await page.waitForFunction(() => typeof moverLimite === 'function');
  await quitarCapas(page);
  const r = await page.evaluate(() => {
    S.cartera = S.cartera || {}; S.cartera.perfil = { ...(S.cartera.perfil || {}), limite_caida: 90 }; S.tuLim = null;
    moverLimite('caida', 1); const alto = (S.tuLim || limitesGuardados()).caida;
    S.cartera.perfil.limite_caida = 1; S.tuLim = null;
    moverLimite('caida', -1); const bajo = (S.tuLim || limitesGuardados()).caida;
    moverLimite('caida', 'quitar'); const fuera = S.tuLim.caida;
    // un valor guardado absurdo (de antes) no cuenta como límite
    S.cartera.perfil.limite_caida = 150; const absurdo = limiteCaida();
    return { alto, bajo, fuera, absurdo };
  });
  expect(r).toEqual({ alto: 90, bajo: 1, fuera: null, absurdo: null });
});
