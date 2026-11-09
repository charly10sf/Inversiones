// Noticias (9 nov 2026): la página de Noticias (#noticias, trozo «noticias») y la hoja de Buenos días con cada cifra
// de su día. Carlos, 9 nov: «los datos de buenos días son erróneos o algo así». Con GF_CAPTURAS=carpeta, además,
// deja capturas para enseñárselas.
import { test as base, expect } from '@playwright/test';
import { preparar, crearCuenta, meterCartera, quitarCapas, tocar } from './ayuda.js';

const CAP = process.env.GF_CAPTURAS;
const test = base.extend({
  errores: async ({ context }, use) => {
    const errores = await preparar(context);
    await use(errores);
    expect(errores, 'errores de JavaScript en la página').toEqual([]);
  },
});

test('lo que vale y lo que no de un titular, y su tema', async ({ page, errores }, info) => {
  test.skip(info.project.name !== 'movil', 'lógica: una vez basta');
  await crearCuenta(page);
  const r = await page.evaluate(() => {
    S.precios.mercados['^IBEX'] = { ...(S.precios.mercados['^IBEX'] || {}), precio: 19725.5 };
    return {
      ruido: notValida({ t: 'Precio del Crudo Brent Hoy. Cotización en Tiempo Real', u: 'https://x.es', d: new Date().toISOString() }),
      buena: notValida({ t: 'El BCE mantiene los tipos en el 2 %', u: 'https://x.es', d: new Date().toISOString() }),
      vieja: titularCuadra('El Ibex 35 sube más del 1% y supera los 18.600 puntos, aupado por la banca'),
      cerca: titularCuadra('El Ibex 35 conquista los 19.700 puntos'),
      prevision: titularCuadra('El Ibex podría llegar a los 22.000 puntos en 2027'),
      antigua: notValida({ t: 'El BCE sube los tipos', u: 'https://x.es', d: new Date(Date.now() - 5 * 864e5).toISOString() }, 30),
      ibex: temaNoticia({ t: 'El Ibex 35 sube aupado por la banca', z: 'Tipos' }),
      cripto: temaNoticia({ t: 'La venta masiva liderada por Nvidia afecta a las criptomonedas', z: 'EEUU' }),
      fed: temaNoticia({ t: 'La Reserva Federal recorta los tipos', z: 'EEUU' }),
      zona: temaNoticia({ t: 'Las bolsas de la región abren mixtas', z: 'Asia' }),
    };
  });
  expect(r).toEqual({ ruido: false, buena: true, vieja: false, cerca: true, prevision: true, antigua: false, ibex: 'espana', cripto: 'cripto', fed: 'tipos', zona: 'asia' });
});

test('Buenos días: cada cifra dice de qué día es', async ({ page, errores }, info) => {
  test.skip(info.project.name !== 'movil', 'solo en el móvil');
  await crearCuenta(page);
  await quitarCapas(page);
  await meterCartera(page);
  const r = await page.evaluate(() => {
    const M = calcular();
    const viernes = (() => { let d = hoyIso(); do d = sumarDias(d, -1); while ([0, 6].includes(deIso(d).getDay())); return d; })();
    // 1) un lunes a primera hora: nada ha cotizado hoy; lo de «hoy» es del último día de bolsa
    for (const f of M.filas) { f.vivo = false; f.fecha = viernes; if (!f.dia) f.dia = 3; }
    S.precios.mercados['^GSPC'] = { ...S.precios.mercados['^GSPC'], variacion_dia: 0.31, fecha: viernes };
    const d = document.createElement('div');
    d.innerHTML = htmlResumenDia(M);
    const cierre = { k: d.querySelector('.rdia-car .k').textContent, sp: [...d.querySelectorAll('.agp-fichas span')].find((x) => x.textContent.includes('S&P')).textContent };
    // 2) con el bitcoin cotizando hoy y lo demás del viernes: «desde el último cierre», con lo de hoy aparte
    const btc = M.filas.find((f) => f.inst.id === 'btc'); btc.fecha = hoyIso(); btc.dia = 12;
    d.innerHTML = htmlResumenDia(M);
    const mixto = { k: d.querySelector('.rdia-car .k').textContent, nota: [...d.querySelectorAll('.rdia-desg dt')].map((x) => x.textContent).join(' | ') };
    // 3) todo de hoy, menos los fondos (del día anterior): «hoy», y se dice con qué día van los fondos
    for (const f of M.filas) f.fecha = /^Fondo/.test(f.inst.tipo || '') ? viernes : hoyIso();
    d.innerHTML = htmlResumenDia(M);
    const hoy = { k: d.querySelector('.rdia-car .k').textContent, fondos: [...d.querySelectorAll('.rdia-desg dt, .rdia-car .rdia-nota')].map((x) => x.textContent).join(' | ') };
    return { cierre, mixto, hoy, ver: !!d.querySelector('a[href="#noticias"]') };
  });
  expect(r.cierre.k).toContain('último día de bolsa');
  expect(r.cierre.k).not.toContain('hoy');
  expect(r.cierre.sp).toMatch(/S&P 500.*(ayer|lun|mar|mié|jue|vie)/);
  expect(r.mixto.k).toContain('desde el último cierre');
  expect(r.mixto.nota).toContain('Lo que cotiza hoy');
  expect(r.mixto.nota).toMatch(/Del .* \(último cierre\)/);
  expect(r.hoy.k).toBe('Tu cartera hoy');
  expect(r.hoy.fondos).toContain('Tus fondos, con su valor del');
  expect(r.hoy.fondos).toContain('Lo que cotiza hoy');
  expect(r.ver).toBe(true);
  if (CAP) {
    await page.evaluate(() => { LS.set('inv-resumen-dia', ''); resumenDelDia(() => {}, true); });
    await page.waitForSelector('.hoja-rdia .rdia-tot');
    await page.waitForTimeout(600);
    await page.locator('.hoja-rdia .hoja').screenshot({ path: `${CAP}/buenos-dias-movil.png` });
  }
});

test('la página de Noticias: cinta, temas, buscador y lo de cada empresa', async ({ page, errores }, info) => {
  test.skip(info.project.name === 'movil-pequeno', 'en el móvil y en el ordenador');
  await crearCuenta(page);
  await quitarCapas(page);
  await meterCartera(page);
  await page.evaluate(() => { location.hash = '#noticias'; });
  const panel = page.locator('#panelNot');
  await expect(panel.locator('.nt-cinta .nt-ind').first()).toBeVisible();
  await expect(panel.locator('.nt-l .nt-i').first()).toBeVisible();
  // los titulares abren dentro (la hoja con el resumen de la IA)
  await expect(panel.locator('.nt-i a.noti').first()).toHaveAttribute('href', /^https?:/);
  // un tema: solo los de ese tema
  const total = await panel.locator('.nt-i').count();
  const tema = panel.locator('[data-nt-tema]:not([data-nt-tema="todo"])').first();
  const nombre = (await tema.textContent()).replace(/\d+$/, '').trim(), clave = await tema.getAttribute('data-nt-tema');
  await tocar(page, `#panelNot [data-nt-tema="${clave}"]`);
  await expect(tema).toHaveAttribute('aria-pressed', 'true');
  const temas = await panel.locator('.nt-tema').allTextContents();
  expect(temas.length).toBeGreaterThan(0);
  expect(temas.length).toBeLessThanOrEqual(total);
  expect(new Set(temas)).toEqual(new Set([nombre]));
  await tocar(page, '#panelNot [data-nt-tema="todo"]');
  // el buscador filtra sin perder lo escrito
  await quitarCapas(page);
  await page.fill('#ntBusca', 'zzzz-no-existe');
  await expect(panel.locator('#ntLista .vacio')).toBeVisible();
  await expect(page.locator('#ntBusca')).toHaveValue('zzzz-no-existe');
  await page.fill('#ntBusca', '');
  await expect(panel.locator('.nt-i').first()).toBeVisible();
  // las empresas leídas por la IA (el escaneo se baja al entrar)
  await expect(panel.locator('.nt-emp-l li').first()).toBeVisible({ timeout: 30000 });
  await expect(panel.locator('.nt-emp-l .nt-tono').first()).toHaveText(/Buena|Negativa|Neutral|Mixta/);
  // está en las listas de páginas (Más, el buscador y la barra del ordenador)
  expect(await page.evaluate(() => PAG.noticias && PAG.noticias.s)).toBe('hoy');
  if (info.project.name === 'pc') await expect(page.locator('a[href="#noticias"]').first()).toBeAttached();
  if (CAP) {
    await quitarCapas(page);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${CAP}/noticias-${info.project.name}.png`, fullPage: true });
  }
});
