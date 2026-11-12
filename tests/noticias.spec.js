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

test('«Hoy» es hoy en todas partes: Buenos días, Inicio, el calendario y el widget dan la misma cifra', async ({ page, errores }, info) => {
  // Carlos, 12 nov: «hay un baile de cifras bastante serio con lo de las últimas 24 horas»: el calendario, Buenos días
  // (arriba y dentro), la pastilla verde de 1D y el widget daban cada uno una cifra distinta
  test.skip(info.project.name !== 'movil', 'solo en el móvil');
  await crearCuenta(page);
  await quitarCapas(page);
  await meterCartera(page);
  const r = await page.evaluate(() => {
    const hoy = hoyIso(), ayer = habilAntes(hoy), anteayer = habilAntes(ayer);
    // unos históricos de prueba que acaban ayer (o anteayer, los fondos: publican su valor tarde)
    const serie = (hasta, p0) => { const out = []; let d = sumarDias(hasta, -40), p = p0; while (d <= hasta) { if (![0, 6].includes(deIso(d).getDay())) { out.push([d, Math.round(p * 1e4) / 1e4]); p *= 1.003; } d = sumarDias(d, 1); } return out; };
    S.hist = S.hist || {}; S.hist.instrumentos = { ...(S.hist.instrumentos || {}) };
    const P = S.precios.instrumentos;
    for (const f of calcular().filas) {
      const id = f.inst.id, fondo = /^Fondo/.test(f.inst.tipo || '') && id !== 'phau';
      const fin = id === 'btc' ? sumarDias(hoy, -1) : fondo ? anteayer : ayer;
      const h = id === 'btc' ? (() => { const o = []; for (let k = 40; k >= 1; k--) o.push([sumarDias(hoy, -k), 60000 + k * 10]); return o; })() : serie(fin, f.precio || 10);
      S.hist.instrumentos[id] = h;
      const u = h[h.length - 1], a = h[h.length - 2];
      if (P[id]) P[id] = { ...P[id], precio: u[1], cierre_anterior: a[1], variacion_dia: (u[1] / a[1] - 1) * 100, fecha: u[0] };
    }
    S.live = {};
    // 1) a las 7 de la mañana: nada en directo. «Hoy», cero, y el calendario no tiene casilla de hoy
    let M = calcular();
    const temprano = { dia: M.dia, conHoy: M.filas.filter((f) => f.varDia != null).length, cal: cambiosPorDia(M, 30).filter((x) => x.d === hoy).length };
    // 2) el bitcoin en directo (Bitvavo dice +5 % en 24 h): cuenta desde el cierre de ayer, no las 24 h
    const cBtc = S.hist.instrumentos.btc[S.hist.instrumentos.btc.length - 1][1];
    S.live.btc = { precio: cBtc * 1.01, var: 5, t: Date.now(), fuente: 'Bitvavo' };
    // 3) Repsol en directo, +2 % sobre su cierre de ayer
    const cRep = S.hist.instrumentos.repsol[S.hist.instrumentos.repsol.length - 1][1];
    S.live.repsol = { precio: cRep * 1.02, var: 2, t: Date.now(), fuente: 'en directo' };
    M = calcular(); S.M = M; S.binds = binds(M);
    const fila = (id) => M.filas.find((f) => f.inst.id === id);
    const cal = cambiosPorDia(M, 30), casillaHoy = cal.find((x) => x.d === hoy);
    const d = document.createElement('div'); d.innerHTML = htmlResumenDia(M);
    // la foto del widget
    let foto = null; window.InversionesApp = { guardarWidget: (j) => { foto = JSON.parse(j); } }; enviarWidget(true); delete window.InversionesApp;
    return {
      temprano,
      btc: fila('btc').dia, btcEsperado: fila('btc').uds * cBtc * 0.01,
      rep: fila('repsol').dia, repEsperado: fila('repsol').uds * cRep * 0.02,
      fondos: M.filas.filter((f) => /^Fondo/.test(f.inst.tipo || '')).map((f) => f.dia),
      bat: fila('bat').dia,
      dia: M.dia, casillaHoy: casillaHoy && casillaHoy.e, pctHoy: casillaHoy && casillaHoy.p, diaPct: M.diaPct,
      ayer: (cal.filter((x) => x.d < hoy).pop() || {}),
      bd: { k: d.querySelector('.rdia-car .k').textContent, dia: d.querySelector('.rdia-dia').textContent, desg: d.querySelector('.rdia-desg') ? d.querySelector('.rdia-desg').textContent : '', notas: [...d.querySelectorAll('.rdia-car .rdia-nota')].map((x) => x.textContent).join(' | ') },
      dia0: S.binds.dia0.txt, eurAyer: (() => { const u = cal.filter((x) => x.d < hoy).pop(); return u ? eurS(u.e, 0) : ''; })(),
      foto: foto && { hoy: foto.hoy, dia: foto.dia, suma: sum(foto.pos, (x) => x.dia) },
      hoyIso: hoy,
    };
  });
  expect(r.temprano).toEqual({ dia: 0, conHoy: 0, cal: 0 });
  expect(r.btc).toBeCloseTo(r.btcEsperado, 2);
  expect(r.rep).toBeCloseTo(r.repEsperado, 2);
  expect(r.fondos.every((x) => x === 0)).toBe(true);
  expect(r.bat).toBe(0);
  expect(r.dia).toBeCloseTo(r.btcEsperado + r.repEsperado, 2);
  // la casilla de hoy del calendario es la misma cifra, con el mismo %
  expect(r.casillaHoy).toBe(r.dia);
  expect(r.pctHoy).toBe(r.diaPct);
  // Buenos días: arriba la misma cifra, «hoy», y debajo el último día de bolsa con la cifra de su casilla
  expect(r.bd.k).toBe('Tu cartera hoy');
  expect(r.bd.dia).toBe(r.dia0);
  expect(r.bd.desg).toContain(r.eurAyer);
  expect(r.bd.desg).toMatch(/Ayer|El /);
  expect(r.bd.notas).toContain('Los fondos publican su valor');
  // el widget recibe la misma cifra y la fecha de la foto
  expect(r.foto.hoy).toBe(r.hoyIso);
  expect(r.foto.dia).toBeCloseTo(r.dia, 6);
  expect(r.foto.suma).toBeCloseTo(r.dia, 1);
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
