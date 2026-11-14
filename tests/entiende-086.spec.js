// 0.8.6 (sesión 3 del plan) · Entiende tu cartera: el contenido de las 20 lecciones, «Para ti ahora» y las leídas.
// Sin pantallas todavía (sesión 6): se prueban las funciones del trozo (src/js/trozos/entiende.js) con varias carteras.
import { test as base, expect } from '@playwright/test';
import { preparar, crearCuenta, meterCartera, quitarCapas } from './ayuda.js';

const test = base.extend({
  errores: [async ({ context }, use) => {
    const errores = await preparar(context);
    await use(errores);
    expect(errores, 'errores de JavaScript en la página').toEqual([]);
  }, { auto: true }],
});
// es lógica, no pantalla: basta con un tamaño
test.beforeEach(({}, info) => test.skip(info.project.name !== 'pc', 'basta con el ordenador'));

// las palabras que no puede llevar un texto de formación (las mismas que se le prohíben a la IA en 55-asesor-contexto.js)
const ORDENES = /(?<!\p{L})(compra|vende|mantén|traspasa|deberías|aguanta|aprovecha)(?!\p{L})|te conviene|te recomiendo|lo que toca|es mejor que|es momento de|te encaja|yo que tú|yo vendería/iu;
const MAL = /undefined|NaN|null|\[object|Infinity/;

const entrar = async (page) => {
  await crearCuenta(page); await meterCartera(page); await quitarCapas(page);
  await page.evaluate(async () => {
    LS.set('inv-empezar-no', true); LS.set('inv-empezar-fin', true);
    for (const p of S.cartera.posiciones) p.desde = '2021-03-01';
    await cargarTrozo('avanzado');
    // una cartera a medida: [instrumento, bróker, euros que vale hoy, lo que costó por cada euro de hoy]
    window.__cartera = (lista, extra = {}) => {
      S.cartera.posiciones = lista.map(([inst, plat], i) => ({ id: 'e' + i, instrumento: inst, plataforma: plat, cantidad: 1, coste: 1, fecha: '2025-01-10', desde: '2021-03-01' }));
      S.cartera.efectivo = extra.efectivo || []; S.cartera.aportaciones = []; S.cartera.movimientos = extra.movimientos || []; S.cartera.fiscal = extra.fiscal || {};
      delete S.cartera.entiende;
      S.M = null; let M = calcular();
      lista.forEach(([, , v, c = 0.9], i) => { const p = S.cartera.posiciones[i], f = M.filas.find((x) => x.pos.id === p.id); p.cantidad = v / f.precio; p.coste = v * c; });
      S.M = null; M = calcular(); S.M = M;
      return M;
    };
    window.__todas = (M) => ENT_ORDEN.map((id) => {
      const x = entiendeLeccion(id, M), d = document.createElement('div');
      d.innerHTML = entiendeLeccionHtml(id, M);
      return { id, general: x.general, min: x.min, np: x.parrafos.length, nt: x.tus.length, texto: d.innerText || d.textContent, ej: !!x.ejemplo, pie: x.pie };
    });
  });
};

const comprobar = (ls) => {
  expect(ls.map((l) => l.id)).toHaveLength(20);
  for (const l of ls) {
    expect(l.texto, `${l.id}: sin huecos vacíos`).not.toMatch(MAL);
    expect(l.texto, `${l.id}: sin órdenes`).not.toMatch(ORDENES);
    expect(l.min, `${l.id}: minutos`).toBeGreaterThanOrEqual(2); expect(l.min).toBeLessThanOrEqual(3);
    expect(l.np, `${l.id}: párrafos`).toBeGreaterThanOrEqual(2); expect(l.np).toBeLessThanOrEqual(4);
    expect(l.ej, `${l.id}: un ejemplo`).toBe(true);
    expect(l.texto).toContain('Formación general con tus números: no te dice qué hacer.');
    if (!l.general) { expect(l.nt, `${l.id}: 2–4 cifras`).toBeGreaterThanOrEqual(2); expect(l.nt).toBeLessThanOrEqual(4); expect(l.texto).toContain('Con tus números'); }
  }
};

test('el libro: 5 capítulos, 20 lecciones, cada una rellena con la cartera de prueba', async ({ page }) => {
  await entrar(page);
  const r = await page.evaluate(() => ({ caps: ENT_CAPS.map((c) => [c.rom, c.t, c.ls.length]), ls: __todas(S.M = calcular()) }));
  expect(r.caps).toEqual([['I', 'Lo que tienes', 3], ['II', 'Lo que te cuesta', 3], ['III', 'Lo que ganas', 4], ['IV', 'Hacienda', 5], ['V', 'El riesgo', 5]]);
  comprobar(r.ls);
  // con fondos, oro, acciones, cripto y efectivo, estas salen siempre con sus números
  const conNumeros = ['indexado', 'etc', 'acciones', 'ter', 'broker', 'divisa', 'ganado', 'tributa', 'traspaso', 'dos-meses', 'renta', 'diversificar', 'concentracion', 'colchon'];
  for (const id of conNumeros) expect(r.ls.find((l) => l.id === id).general, `${id} con tus números`).toBe(false);
});

test('cinco posiciones: las cifras salen de los cálculos de la app, no de otros', async ({ page }) => {
  await entrar(page);
  const r = await page.evaluate(() => {
    const M = __cartera([['ishares-us', 'MyInvestor', 4000], ['amundi-europe', 'MyInvestor', 3000], ['phau', 'MyInvestor', 1500], ['repsol', 'Trade Republic', 1000], ['btc', 'Bitvavo', 500, 1.2]]);
    const ter = entiendeLeccion('ter', M), C = pavCostesBase(M), tr = entiendeLeccion('traspaso', M), tri = entiendeLeccion('tributa', M);
    const fa = fiscalAnio(new Date().getFullYear());
    return { ls: __todas(M), terTotal: ter.tus.find((t) => t[0] === 'En total')[1], anual: `≈ ${eur(C.anual, 0)}`, trN: tr.tus[0][1], tramo: tri.tus.find((t) => t[0] === 'Tu tramo este año')[1], marg: `${pctTramo(fa.marginal)} %`,
      tramos: tri.parrafos[0], txtTramos: textoTramos() };
  });
  comprobar(r.ls);
  expect(r.terTotal).toBe(r.anual);
  expect(r.trN).toBe('2');
  expect(r.tramo).toBe(r.marg);
  expect(r.tramos).toContain(r.txtTramos);
});

test('sin fondos: traspasos, TER e indexados en su versión general, sin cifras propias', async ({ page }) => {
  await entrar(page);
  const r = await page.evaluate(() => {
    const M = __cartera([['repsol', 'Trade Republic', 2000], ['iag', 'Trade Republic', 1500], ['btc', 'Bitvavo', 800]]);
    const g = ['traspaso', 'ter', 'indexado', 'etc', 'divisa'].map((id) => { const x = entiendeLeccion(id, M); return { id, general: x.general, tus: x.tus.length, falta: x.falta, html: entiendeLeccionHtml(id, M) }; });
    return { g, ls: __todas(M) };
  });
  comprobar(r.ls);
  for (const x of r.g) {
    expect(x.general, x.id).toBe(true);
    expect(x.tus, x.id).toBe(0);
    expect(x.falta, x.id).toMatch(/^Cuando tengas/);
    expect(x.html, x.id).toContain('data-general');
  }
});

test('sin cartera: las veinte, en su versión general y sin huecos', async ({ page }) => {
  await entrar(page);
  const ls = await page.evaluate(() => { const M = __cartera([]); return __todas(M); });
  comprobar(ls);
  expect(ls.every((l) => l.general)).toBe(true);
});

test('«Para ti ahora» elige la lección que más toca, en su orden fijo', async ({ page }) => {
  await entrar(page);
  const r = await page.evaluate(() => {
    const nov = new Date('2026-11-08T12:00:00'), dic = new Date('2026-12-10T12:00:00'), may = new Date('2026-05-12T12:00:00');
    const out = {};
    const tres = [['ishares-us', 'MyInvestor', 3400], ['amundi-europe', 'MyInvestor', 3300], ['vanguard-em', 'MyInvestor', 3300]];
    let M = __cartera(tres); const a = entiendeParaTi(M, nov); out.traspaso = [a.id, a.porque];
    out.diciembre = entiendeParaTi(M, dic).id;
    out.mayo = entiendeParaTi(M, may).id;
    M = __cartera([['ishares-us', 'MyInvestor', 6000], ['amundi-europe', 'MyInvestor', 2000], ['vanguard-em', 'MyInvestor', 2000]]);
    out.concentracion = entiendeParaTi(M, nov).id;
    M = __cartera([['btc', 'Bitvavo', 2000], ['ishares-us', 'MyInvestor', 3000], ['amundi-europe', 'MyInvestor', 3000], ['vanguard-em', 'MyInvestor', 2000]]);
    out.volatilidad = entiendeParaTi(M, nov).id;
    M = __cartera([['ishares-us', 'MyInvestor', 3500], ['phau', 'MyInvestor', 3500]], { efectivo: [{ plataforma: 'MyInvestor', importe: 3000 }], fiscal: { 2026: { rcm: 120 } } });
    out.retencion = entiendeParaTi(M, nov).id;
    // ya leída la que toca, la siguiente regla; sin ninguna, «sigue donde lo dejaste»
    M = __cartera(tres);
    S.cartera.entiende = { leidas: { traspaso: '2026-11-08' }, ultima: 'traspaso' };
    const b = entiendeParaTi(M, nov); out.trasLeer = [b.id, b.regla];
    S.cartera.entiende = { leidas: { renta: '2026-11-01' }, ultima: 'renta' };
    out.dicLeida = entiendeParaTi(M, dic).id;
    delete S.cartera.entiende;
    out.vacia = entiendeParaTi(__cartera([]), nov).id;
    return out;
  });
  expect(r.traspaso[0]).toBe('traspaso');
  expect(r.traspaso[1]).toBe('Tienes tres fondos de inversión en MyInvestor: aquí se explica cómo funciona el traspaso entre fondos.');
  expect(r.diciembre).toBe('renta');
  expect(r.mayo).toBe('renta');
  expect(r.concentracion).toBe('concentracion');
  expect(r.volatilidad).toBe('volatilidad');
  expect(r.retencion).toBe('retencion');
  expect(r.trasLeer).toEqual(['retencion', false]);
  expect(r.dicLeida).toBe('traspaso');
  expect(r.vacia).toBe('indexado');
});

test('las leídas se guardan con la cartera cifrada y se cuentan por capítulo', async ({ page }) => {
  await entrar(page);
  const r = await page.evaluate(async () => {
    delete S.cartera.entiende;
    const antes = entiendeAvance();
    await entiendeMarcar('ter'); await entiendeMarcar('broker'); await entiendeMarcar('volatilidad');
    const a = entiendeAvance();
    await entiendeMarcar('volatilidad', false);
    const b = entiendeAvance();
    const guardada = await descifrar(S.enc.texto, S.key);
    const html = entiendeLeccionHtml('ter', calcular());
    return { antes: [antes.leidas, antes.total, antes.sigue], a: [a.leidas, a.caps.map((c) => c.leidas), a.sigue], b: [b.leidas, b.sigue], guardada: guardada.entiende, leida: html.includes('ent-leida') };
  });
  expect(r.antes).toEqual([0, 20, 'indexado']);
  expect(r.a).toEqual([3, [0, 2, 0, 0, 1], 'caidas']);
  // desmarcada, ya no cuenta; donde lo dejó sigue siendo ahí, así que «sigue» es la de después
  expect(r.b).toEqual([2, 'caidas']);
  expect(Object.keys(r.guardada.leidas).sort()).toEqual(['broker', 'ter']);
  expect(r.leida).toBe(true);
});

// revisión aparte (10 nov): lo que venga raro en la cartera (un .json importado, otra versión) no tumba la pestaña ni el
// botón, y al marcar se guarda limpio: solo lecciones que existen, con su fecha AAAA-MM-DD
test('un «entiende» raro en la cartera se sanea al leer y al marcar', async ({ page }) => {
  await entrar(page);
  const r = await page.evaluate(async () => {
    const raros = [{}, [], 'texto', 7, { leidas: null }, { leidas: ['ter'] }, { leidas: { ter: 'ayer', broker: '2026-11-01', constructor: '2026-11-01', '<img src=x>': '2026-11-01' }, ultima: 'constructor' }];
    const vistos = [];
    for (const x of raros) {
      S.cartera.entiende = x;
      let ok = true, av = null;
      try { av = entiendeAvance(); entiendeLeccionHtml('ter', calcular()); entiendeSigue(); } catch (e) { ok = false; }
      vistos.push([ok, av && av.leidas]);
    }
    await entiendeMarcar('ter');
    const guardada = (await descifrar(S.enc.texto, S.key)).entiende;
    return { vistos, guardada };
  });
  expect(r.vistos.map((v) => v[0])).toEqual([true, true, true, true, true, true, true]);
  expect(r.vistos.map((v) => v[1])).toEqual([0, 0, 0, 0, 0, 0, 1]);
  expect(r.guardada.ultima).toBe('ter');
  expect(Object.keys(r.guardada.leidas).sort()).toEqual(['broker', 'ter']);
  expect(Object.values(r.guardada.leidas).every((f) => /^\d{4}-\d{2}-\d{2}$/.test(f))).toBe(true);
});
