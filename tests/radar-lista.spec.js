// 0.8.2 (Carlos, 6 nov 2026): «Todo el radar» con las 2.864 empresas. Por defecto, por tamaño (capitalización); se ordena
// por nombre, dividendo, PER o 1 año, y NO por «Puede subir», «Te quedas» ni «Señales» (la CNMV avisa de la recomendación
// implícita). La lista sale por páginas (20 y luego 50 más), cambiar de zona, filtro u orden repinta solo la tabla y las
// señales de cada empresa se calculan solo al pintar su fila. Con los datos de verdad (tests/.datos, rama datos).
import { test as base, expect } from '@playwright/test';
import { preparar, crearCuenta, meterCartera, quitarCapas } from './ayuda.js';

const test = base.extend({
  errores: [async ({ context }, use) => {
    const errores = await preparar(context);
    await use(errores);
    expect(errores, 'errores de JavaScript en la página').toEqual([]);
  }, { auto: true }],
});

async function abrirRadar(page) {
  await crearCuenta(page);
  await quitarCapas(page);
  await meterCartera(page);
  // radar.json trae las fijas y las grandes; el resto (radar-mas.json) llega después
  await page.waitForFunction(() => S.radar && S.radar.valores && S.radar.valores.length > 2000, null, { timeout: 45_000 });
  // y que el escaneo (que se pide al rato de abrir) ya esté: si llega después, repinta la vista entera y pisa lo que se mire
  await page.waitForFunction(() => S.escaneo, null, { timeout: 20_000 }).catch(() => {});
  await page.waitForTimeout(800);
  await page.evaluate(() => {
    document.querySelectorAll('.hoja-fondo').forEach((h) => h.remove());
    S.acceso = 'privado'; S.expTab = 'ideas'; S.radarN = 0; S.radarMin = true; S.radarSolidas = false; S.radarZona = 'Todas'; S.radarOrden = 'cap';
    location.hash = '#expertos'; pintar();
  });
  await page.waitForSelector('#radarCuerpo tr[data-consulta]');
}
// lo que enseña la tabla ahora: símbolo, nombre y zona de cada fila, y la capitalización de cada una
const filas = (page) => page.evaluate(() => [...document.querySelectorAll('#radarCuerpo tr[data-consulta]')].map((tr) => {
  const s = tr.dataset.consulta, x = radarVals().find((r) => r.s === s);
  return { s, n: tr.querySelector('.radar-n b').textContent, z: x && x.z, cap: x && x.cap, div: x && x.div };
}));
const estado = (page) => page.locator('#radarPie .radar-cuenta').innerText();

test('por defecto, por tamaño: 20 filas y luego de 50 en 50', async ({ page }) => {
  await abrirRadar(page);
  let f = await filas(page);
  expect(f.length).toBe(20);
  expect(await estado(page)).toMatch(/^Ves 20 de [\d.]+/);
  for (let i = 1; i < f.length; i++) expect(f[i - 1].cap, `${f[i - 1].s} antes que ${f[i].s}`).toBeGreaterThanOrEqual(f[i].cap);
  // con las 2.800 dentro, la más grande va arriba (no una pequeña con un +1.000 % y dos analistas)
  const mayor = await page.evaluate(() => Math.max(...radarVals().filter((x) => x.pot != null && (x.na || 0) >= 5).map((x) => x.cap || 0)));
  expect(f[0].cap).toBe(mayor);

  // el foco pasa a la primera fila nueva (con teclado no se pierde el sitio); se mira en el mismo instante del toque, sin
  // darle tiempo a que un repintado de la vista entera (por una recomendación que cambia) lo pise
  const foco = await page.evaluate(() => { document.querySelector('[data-radar-mas]').click(); return document.activeElement.closest('tr') === document.querySelectorAll('#radarCuerpo tr')[20]; });
  expect(foco).toBe(true);
  f = await filas(page);
  expect(f.length).toBe(70);
  expect(await estado(page)).toMatch(/^Ves 70 de /);
  // la página 2 sigue el orden de la 1: sin repetir ni saltarse empresas
  expect(new Set(f.map((x) => x.s)).size).toBe(70);
  for (let i = 1; i < f.length; i++) expect(f[i - 1].cap).toBeGreaterThanOrEqual(f[i].cap);
});

test('hasta el final de una lista corta no sobra ni falta ninguna', async ({ page }) => {
  await abrirRadar(page);
  await page.locator('[data-zona="España"]').click();
  await page.locator('[data-radar-solidas]').check();
  for (let i = 0; i < 60 && (await page.locator('[data-radar-mas]').count()); i++) await page.locator('[data-radar-mas]').click();
  const f = await filas(page);
  const t = await page.evaluate(() => listaRadar().length);
  expect(f.length).toBe(t);
  expect(await page.locator('[data-radar-mas]').count()).toBe(0);
  expect(f.every((x) => x.z === 'España')).toBe(true);
  if (t) expect(await estado(page)).toContain(`Ves ${t} de ${t}`);
  else expect(await estado(page)).toMatch(/Ninguna empresa/);
});

test('no se ordena por «Puede subir», «Te quedas» ni «Señales»', async ({ page }, info) => {
  await abrirRadar(page);
  const claves = await page.evaluate(() => Object.keys(ORDEN_RADAR));
  expect(claves.sort()).toEqual(['c1a', 'cap', 'div', 'n', 'perf']);
  // un orden guardado de antes (por «Puede subir» o «Señales») vuelve al tamaño
  for (const viejo of ['pot', 'neto', 'ctr']) {
    await page.evaluate((k) => { S.radarOrden = k; pintar(); }, viejo);
    const f = await filas(page);
    for (let i = 1; i < f.length; i++) expect(f[i - 1].cap, `orden guardado «${viejo}»`).toBeGreaterThanOrEqual(f[i].cap);
  }
  if (info.project.name === 'pc') {
    // en el ordenador, los títulos de esas tres columnas no son botones; los de las demás, sí
    const botones = await page.locator('table.ideas thead th button[data-orden]').evaluateAll((bs) => bs.map((b) => b.dataset.orden));
    expect(botones).toEqual(['n', 'cap', 'perf', 'div', 'c1a']);
    for (const t of ['Puede subir', 'Te quedas', 'Señales']) expect(await page.locator('table.ideas thead th', { hasText: t }).locator('button').count()).toBe(0);
  } else {
    // en el móvil esas columnas no caben: el orden se cambia con la pastilla
    const opciones = await page.locator('[data-radar-orden-sel] option').evaluateAll((os) => os.map((o) => o.value));
    expect(opciones.sort()).toEqual(['c1a', 'cap', 'div', 'n', 'perf']);
  }
});

test('ordenar por nombre, dividendo, PER o 1 año', async ({ page }, info) => {
  await abrirRadar(page);
  const ordenar = async (k) => {
    if (info.project.name === 'pc') await page.locator(`table.ideas thead [data-orden="${k}"]`).click();
    else await page.locator('[data-radar-orden-sel]').selectOption(k);
  };
  await ordenar('n');
  let f = await filas(page);
  const col = await page.evaluate((ns) => ns.slice().sort(new Intl.Collator('es', { sensitivity: 'base' }).compare), f.map((x) => x.n));
  expect(f.map((x) => x.n)).toEqual(col);
  await ordenar('div');
  f = await filas(page);
  for (let i = 1; i < f.length; i++) expect(f[i - 1].div ?? -1).toBeGreaterThanOrEqual(f[i].div ?? -1);
  await ordenar('perf');
  expect(await page.evaluate(() => S.radarOrden)).toBe('perf');
  await ordenar('c1a');
  expect(await page.evaluate(() => S.radarOrden)).toBe('c1a');
  expect((await filas(page)).length).toBe(20);
  // y de vuelta al tamaño
  await ordenar('cap');
  f = await filas(page);
  for (let i = 1; i < f.length; i++) expect(f[i - 1].cap).toBeGreaterThanOrEqual(f[i].cap);
});

test('cambiar de zona, orden o filtro repinta solo la tabla, no la vista entera', async ({ page }) => {
  await abrirRadar(page);
  // Cada toque y su comprobación van en una sola tarea: un repintado de la vista entera por otro motivo (una recomendación que
  // cambia, el escaneo que llega) no puede colarse en medio. La marca está en lo de arriba (las ideas): si se repintara toda
  // la vista, se pierde.
  const toca = (selector) => page.evaluate((sel) => {
    const marca = document.querySelector('.ideas-top3, .vacio');
    if (!marca.dataset.marca) { marca.dataset.marca = 'viva'; window.__pintados = 0; const p = window.pintar; window.pintar = (...a) => { window.__pintados++; return p.apply(window, a); }; }
    document.querySelector(sel).click();
    return { marca: !!document.querySelector('[data-marca="viva"]'), pintados: window.__pintados, foco: document.activeElement && document.activeElement.outerHTML.slice(0, 60),
      filas: [...document.querySelectorAll('#radarCuerpo tr[data-consulta]')].map((tr) => (radarVals().find((x) => x.s === tr.dataset.consulta) || {}).z) };
  }, selector);

  let r = await toca('[data-zona="EEUU"]');
  expect(r.marca).toBe(true);
  expect(r.pintados).toBe(0);
  expect(r.filas.length).toBe(20);
  expect(r.filas.every((z) => z === 'EEUU')).toBe(true);
  expect(await page.locator('[data-zona="EEUU"]').getAttribute('aria-pressed')).toBe('true');
  expect(await page.locator('[data-zona="Todas"]').getAttribute('aria-pressed')).toBe('false');

  const antes = await estado(page);
  r = await toca('[data-radar-min]');
  expect(r.marca).toBe(true);
  expect(r.pintados).toBe(0);
  expect(await estado(page)).not.toBe(antes);
  expect(await page.locator('[data-radar-min]').isChecked()).toBe(false);

  r = await toca('[data-radar-mas]');
  expect(r.marca).toBe(true);
  expect(r.pintados).toBe(0);
  expect(r.filas.length).toBe(70);
  // al cambiar de zona se vuelve a la primera página
  r = await toca('[data-zona="Todas"]');
  expect(r.marca).toBe(true);
  expect(r.pintados).toBe(0);
  expect(r.filas.length).toBe(20);
  // el foco sigue en lo que tocaste tras repintar (aquí, programático: la casilla)
  const foco = await page.evaluate(() => { const c = document.querySelector('[data-radar-solidas]'); c.focus(); c.click(); return document.activeElement.matches('[data-radar-solidas]'); });
  expect(foco).toBe(true);
});

test('las señales y lo que te quedas se calculan solo para las filas que se pintan, una vez', async ({ page }) => {
  await abrirRadar(page);
  const r = await page.evaluate(() => {
    const n = { calc: 0, esperada: 0 };
    const c = window.contrasteCalc, e = window.esperadaRadar;
    window.contrasteCalc = (x) => { n.calc++; return c(x); };
    window.esperadaRadar = (...a) => { n.esperada++; return e(...a); };
    const toma = () => { const o = { ...n }; n.calc = 0; n.esperada = 0; return o; };
    // un radar «nuevo» (se vacían las cachés, como cuando llega otro radar.json) y se pinta solo la tabla: sus 20 filas
    S.radarVer++; S.radarN = 0;
    htmlTablaRadar(S.M);
    const tabla = toma();
    // la misma tabla otra vez: no recalcula nada
    htmlTablaRadar(S.M);
    const otraVez = toma();
    // «Solo bien contrastadas» sí necesita las señales de todas las candidatas, pero no lo llento (lo que te quedas)
    S.radarSolidas = true; listaRadar();
    const solidas = toma();
    S.radarSolidas = false;
    window.contrasteCalc = c; window.esperadaRadar = e;
    return { tabla, otraVez, solidas, candidatas: radarVals().filter((x) => x.pot != null && (x.na || 0) >= 5).length };
  });
  // antes eran las 2.379 (con 5 analistas) en cada pintado, y de las dos cosas
  expect(r.tabla.calc, 'la instrumentación funciona').toBeGreaterThan(0);
  expect(r.tabla.calc).toBeLessThanOrEqual(20);
  expect(r.tabla.esperada).toBeLessThanOrEqual(20);
  expect(r.otraVez).toEqual({ calc: 0, esperada: 0 });
  expect(r.solidas.esperada).toBe(0);
  expect(r.solidas.calc).toBeLessThanOrEqual(r.candidatas);
  // y pintar la vista entera dos veces seguidas, sin que cambie el radar, no rehace las señales
  const dos = await page.evaluate(() => {
    let calc = 0; const c = window.contrasteCalc; window.contrasteCalc = (x) => { calc++; return c(x); };
    pintar(); const primera = calc; calc = 0; pintar(); const segunda = calc;
    window.contrasteCalc = c;
    return { primera, segunda };
  });
  expect(dos.segunda).toBe(0);
});
