// 0.8.6 · Tu año, sesión 9 del plan: la imagen para compartir (9:16, sin euros por defecto), el modo discreto en toda
// la app y en lo que se manda al widget, la entrada desde Hoy solo en diciembre y enero, y la regla de Hoy
// («celebra el plan, no la operación»: lo que más se mueve, solo de lo tuyo, con el porqué y sin botón).
import { test as base, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { preparar, crearCuenta, quitarCapas, tocar } from './ayuda.js';
import { meterCarteraTuAno } from './tuano-cartera.js';

const test = base.extend({
  errores: [async ({ context }, use) => {
    const errores = await preparar(context);
    await use(errores);
    expect(errores, 'errores de JavaScript en la página').toEqual([]);
  }, { auto: true }],
});
const ORDEN = /\b(compra|vende|comprar|vender|compres|vendas|deberías|te recomendamos|enhorabuena)\b|¡/i;

async function entrar(page) {
  await crearCuenta(page);
  // la guía de primeros pasos de una cuenta recién creada sale una vez, al rato: se espera a que salga y se quita
  await page.waitForSelector('.hoja-guia', { timeout: 10_000 }).catch(() => {});
  await meterCarteraTuAno(page); await quitarCapas(page);
  await page.evaluate(() => { LS.set('inv-empezar-no', true); LS.set('inv-empezar-fin', true); });
}
async function abrirTuAno(page, modo) {
  await page.evaluate((m) => { ponerModo(m); location.hash = 'av-tuano'; }, modo);
  await expect(page.locator('#panelAv[data-p="tuano"]:not([aria-busy]) .ta-t')).toHaveCount(7, { timeout: 20_000 });
  await page.waitForTimeout(300); await quitarCapas(page);
}
// el botón de compartir: en el ordenador, en la cabecera; en el móvil, en la última pantalla
async function abrirCompartir(page, pc) {
  if (!pc) for (let i = 0; i < 6; i++) await tocar(page, '#panelAv [data-ta-ir="1"]');
  const b = pc ? '#panelAv .ta-cab [data-ta-comp]' : '#panelAv .ta-t.ta-aqui [data-ta-comp]';
  await expect(page.locator(b)).toBeVisible();
  await tocar(page, b);
  await expect(page.locator('.ta-comp-hoja canvas')).toBeVisible();
  // las letras y la textura llegan al rato: se repinta
  await page.waitForTimeout(600);
}
// los interruptores, de un solo toque (tocar() repite si algo tapa)
const unToque = async (page, sel) => {
  const b = page.locator(sel).first();
  // primero se comprueba que se puede tocar (si sale una hoja encima, se quita y se vuelve a mirar) y luego un toque
  for (let i = 0; i < 6; i++) { await quitarCapas(page); try { await b.click({ trial: true, timeout: 2000 }); break; } catch (e) { if (i === 5) throw e; } }
  await b.click({ timeout: 5000 });
};
const txt = (page) => page.locator('.ta-comp-hoja canvas').getAttribute('data-txt');

test('compartir: imagen 9:16 hecha en la app, sin euros por defecto, y «Cantidades en euros» siempre apagada al abrir', async ({ page }, info) => {
  const pc = info.project.name === 'pc';
  await entrar(page); await abrirTuAno(page, pc ? 'avanzado' : 'basico');
  if (!pc) await expect(page.locator('#panelAv .ta-t[data-ta="estilo"] [data-ta-comp]')).toBeHidden();
  await abrirCompartir(page, pc);
  const cv = page.locator('.ta-comp-hoja canvas');
  expect(await cv.evaluate((c) => [c.width, c.height])).toEqual([1080, 1920]);
  // las seis casillas; «Cantidades en euros», apagada
  await expect(page.locator('.ta-comp-hoja [data-comp-k]')).toHaveCount(6);
  await expect(page.locator('.ta-comp-hoja [data-comp-k="euros"]')).not.toBeChecked();
  for (const k of ['estilo', 'aport', 'edad', 'donde', 'sinSacar']) await expect(page.locator(`.ta-comp-hoja [data-comp-k="${k}"]`)).toBeChecked();
  let t = await txt(page);
  expect(t).not.toMatch(/€/);
  expect(t).toMatch(/TOISÓN/); expect(t).toMatch(/Tu año \d{4}/); expect(t).toMatch(/Sin cantidades · toison\.es/);
  for (const r of ['MESES APORTANDO', 'EDAD DE TU DINERO', 'DONDE MÁS ESTÁ', 'MESES SIN SACAR DINERO']) expect(t).toContain(r);
  expect(t).toMatch(/Constante|Paciente|Diversificador|Explorador/);
  expect(t).not.toMatch(ORDEN);
  // quitar una casilla la quita de la imagen; con euros, salen y el pie lo dice
  await page.locator('.ta-comp-hoja [data-comp-k="edad"]').click();
  expect(await txt(page)).not.toContain('EDAD DE TU DINERO');
  await page.locator('.ta-comp-hoja [data-comp-k="euros"]').click();
  t = await txt(page);
  expect(t).toMatch(/\d\s?€/); expect(t).toMatch(/Con cantidades/);
  // al volver a abrir: lo demás se recuerda, los euros no
  await page.locator('.ta-comp-hoja [data-cerrar]').first().click();
  await expect(page.locator('.ta-comp-hoja')).toHaveCount(0);
  await tocar(page, pc ? '#panelAv .ta-cab [data-ta-comp]' : '#panelAv .ta-t.ta-aqui [data-ta-comp]');
  await expect(page.locator('.ta-comp-hoja [data-comp-k="euros"]')).not.toBeChecked();
  await expect(page.locator('.ta-comp-hoja [data-comp-k="edad"]')).not.toBeChecked();
  expect(await txt(page)).not.toMatch(/€/);
  // en la web sin navigator.share: se descarga
  const [d] = await Promise.all([page.waitForEvent('download'), page.locator('.ta-comp-hoja [data-comp-ok]').click()]);
  expect(d.suggestedFilename()).toMatch(/^mi-ano-\d{4}-en-toison\.png$/);
  // en la app de Android: con su menú de compartir (Puente.compartirImagen), con la imagen en PNG
  await page.evaluate(() => { window.InversionesApp = { compartirImagen: (b, t) => { window.__comp = { n: b.length, png: atob(b.slice(0, 8)).slice(1, 4), t }; } }; });
  await page.locator('.ta-comp-hoja [data-comp-ok]').click();
  const c = await page.evaluate(() => window.__comp);
  expect(c.png).toBe('PNG'); expect(c.n).toBeGreaterThan(5000); expect(c.t).toMatch(/Mi año \d{4} en Toisón/);
});

test('compartir con el modo discreto: «Cantidades en euros» no se puede encender', async ({ page }, info) => {
  const pc = info.project.name === 'pc';
  await entrar(page);
  await page.evaluate(() => ponerDiscreto(true));
  await abrirTuAno(page, pc ? 'avanzado' : 'basico');
  await abrirCompartir(page, pc);
  await expect(page.locator('.ta-comp-hoja [data-comp-k="euros"]')).toBeDisabled();
  await expect(page.locator('.ta-comp-hoja .ta-nota')).toContainText('modo discreto');
  expect(await txt(page)).not.toMatch(/€/);
});

test('modo discreto: oculta las cantidades en Hoy y en Tu año, se recuerda y está en Ajustes', async ({ page }, info) => {
  const pc = info.project.name === 'pc';
  await entrar(page);
  // los euros de verdad de la cartera, tal como salen
  const cifras = await page.evaluate(() => { const M = S.M; return [...new Set([M.total, M.invertido, ...M.filas.map((f) => f.valor)].filter((v) => v > 50).flatMap((v) => [eur(v, 0), eur(v, 2)]))]; });
  expect(cifras.length).toBeGreaterThan(4);
  const visibles = async () => { const t = await page.locator('body').innerText(); return cifras.filter((c) => t.includes(c)); };
  expect((await visibles()).length).toBeGreaterThan(0);
  // con el ojo de Hoy
  // un solo toque (tocar() vuelve a tocar si algo tapa, y el ojo es un interruptor)
  await unToque(page, '.hero-ojo');
  await expect(page.locator('.hero-ojo')).toHaveAttribute('aria-pressed', 'true');
  await page.waitForTimeout(300);
  expect(await visibles()).toEqual([]);
  await expect(page.locator('#heroNum')).toContainText('••••');
  expect(await page.evaluate(() => LS.get('inv-oculto'))).toBe(true);
  // en Tu año, también; en el ordenador, «Mostrar cantidades» en la cabecera; en el móvil, el ojo de arriba
  await abrirTuAno(page, pc ? 'avanzado' : 'basico');
  expect(await visibles()).toEqual([]);
  if (pc) {
    const b = page.locator('#panelAv .ta-cab [data-accion="ocultar"]');
    await expect(b).toHaveText(/Mostrar cantidades/); await expect(b).toHaveAttribute('aria-pressed', 'true');
    await unToque(page, '#panelAv .ta-cab [data-accion="ocultar"]');
    await expect(page.locator('#panelAv .ta-cab [data-accion="ocultar"]')).toHaveText(/Ocultar cantidades/);
    await expect(page.locator('#panelAv .ta-t[data-ta="aport"]')).not.toContainText('••••');
    await unToque(page, '#panelAv .ta-cab [data-accion="ocultar"]');
    await expect(page.locator('#panelAv .ta-t[data-ta="aport"] .ta-grande')).toContainText('••••');
  } else {
    await unToque(page, '#panelAv .ta-ojo');
    await expect(page.locator('#panelAv .ta-ojo')).toHaveAttribute('aria-pressed', 'false');
    await tocar(page, '#panelAv [data-ta-ir="1"]');
    await expect(page.locator('#panelAv .ta-t.ta-aqui')).not.toContainText('••••');
    await unToque(page, '#panelAv .ta-ojo');
    await expect(page.locator('#panelAv .ta-ojo')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('#panelAv .ta-t.ta-aqui .ta-grande')).toContainText('••••');
  }
  // en Ajustes, «Modo discreto», marcado; al quitarlo, vuelven los euros
  await page.evaluate(() => { location.hash = 'hoy'; });
  await expect(page.locator('#heroNum')).toBeVisible();
  await page.evaluate(() => abrirAjustes());
  const sw = page.locator('#aDiscreto');
  await expect(sw).toBeChecked();
  await sw.uncheck();
  expect(await page.evaluate(() => [S.oculto, LS.get('inv-oculto')])).toEqual([false, false]);
  await page.locator('.hoja [data-cerrar]').first().click();
  await expect(page.locator('#heroNum')).not.toContainText('••••');
});

test('modo discreto en el widget: al teléfono no le llega ningún euro, solo la cartera en base 100', async ({ page }) => {
  await entrar(page);
  const r = await page.evaluate(() => {
    const fotos = []; window.InversionesApp = { guardarWidget: (j) => fotos.push(JSON.parse(j)) };
    // la misma cartera (sin repintar en medio): con euros y en modo discreto
    S.oculto = false; enviarWidget(true); S.oculto = true; enviarWidget(true);
    const [claro, disc] = fotos;
    // y al encenderlo con el ojo o en Ajustes, se manda en el acto
    S.oculto = false; ponerDiscreto(true);
    return { claro, disc, ultima: fotos[fotos.length - 1], n: fotos.length };
  });
  expect(r.n).toBe(3); expect(r.ultima.oculto).toBe(true); expect(r.ultima.total).toBeCloseTo(100, 6);
  expect(r.claro.oculto).toBe(false); expect(r.claro.total).toBeGreaterThan(1000);
  expect(r.disc.oculto).toBe(true); expect(r.disc.base100).toBe(true);
  expect(r.disc.total).toBeCloseTo(100, 6);
  const nums = JSON.stringify(r.disc).match(/\d+(\.\d+)?/g).map(Number);
  for (const x of r.claro.pos) if (x.valor > 1) expect(nums).not.toContain(x.valor);
  expect(nums).not.toContain(Math.round(r.claro.total * 100) / 100);
  // los mismos porcentajes: el peso de cada posición y lo de hoy, igual que con los euros
  const peso = (f, x) => x.valor / f.total;
  r.claro.pos.forEach((x, i) => expect(peso(r.disc, r.disc.pos[i])).toBeCloseTo(peso(r.claro, x), 5));
  expect(r.disc.dia / r.disc.total).toBeCloseTo(r.claro.dia / r.claro.total, 6);
  expect(r.disc.serie.length).toBe(r.claro.serie.length);
  expect(r.disc.toca).not.toMatch(/\d\s?€/);
});

test('la entrada desde Hoy: solo en diciembre y enero, sobria, y lleva a Tu año', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-12-05T11:00:00'));
  await entrar(page);
  const e = page.locator('.ta-entrada');
  await expect(e).toBeVisible();
  await expect(e).toContainText('Tu año 2026 en Toisón');
  expect(await e.innerText()).not.toMatch(ORDEN);
  expect(await e.locator('canvas, .confeti, .et-dorado, .sello-d').count()).toBe(0);
  await expect(e.locator('a')).toHaveAttribute('href', '#av-tuano');
  // los meses, con la fecha fijada: solo diciembre y enero
  const meses = await page.evaluate(() => Array.from({ length: 12 }, (_, i) => entradaTuAnoToca(`2026-${String(i + 1).padStart(2, '0')}-15`)));
  expect(meses).toEqual([true, false, false, false, false, false, false, false, false, false, false, true]);
  // en enero, el año que acaba de terminar; en noviembre, nada
  const html = await page.evaluate(() => [htmlEntradaTuAno(S.M, '2027-01-10'), htmlEntradaTuAno(S.M, '2026-11-20')]);
  expect(html[0]).toContain('Tu año 2026 en Toisón'); expect(html[1]).toBe('');
  await unToque(page, '.ta-entrada-a');
  await expect(page.locator('#panelAv[data-p="tuano"]:not([aria-busy]) .ta-t')).toHaveCount(7, { timeout: 20_000 });
  // se puede quitar: no vuelve hasta el año siguiente
  await page.evaluate(() => { location.hash = 'hoy'; });
  await expect(page.locator('.ta-entrada')).toBeVisible();
  await unToque(page, '.ta-entrada-x');
  await expect(page.locator('.ta-entrada')).toHaveCount(0);
  expect(await page.evaluate(() => [htmlEntradaTuAno(S.M, '2026-12-20'), htmlEntradaTuAno(S.M, '2027-12-02') !== ''])).toEqual(['', true]);
});

test('la entrada no sale en Hoy fuera de diciembre y enero (Tu año sigue en las listas)', async ({ page }, info) => {
  await page.clock.setFixedTime(new Date('2026-11-10T11:00:00'));
  await entrar(page);
  await expect(page.locator('.hero-num')).toBeVisible();
  await expect(page.locator('.ta-entrada')).toHaveCount(0);
  if (info.project.name === 'pc') {
    await page.evaluate(() => ponerModo('avanzado'));
    await expect(page.locator('#k2Pags a', { hasText: /^Tu año 2026$/ })).toHaveCount(1);
  }
});

test('regla de Hoy: «Lo que más se mueve», solo de lo tuyo, con el porqué y sin botón', async ({ page }) => {
  await entrar(page);
  await page.evaluate(async () => { S.cartera.inicio = { ...(S.cartera.inicio || {}), bloques: ['patrimonio', 'movidas', 'posiciones'] }; await guardarCartera('prueba'); montar(); pintar(); });
  const sec = page.locator('#vista .movidas-tuyas');
  await expect(sec).toBeVisible();
  await expect(sec.locator('h2')).toHaveText('Lo que más se mueve');
  // nada del radar ni ningún botón o enlace (solo el «Pregúntale» que llevan todas las tarjetas, que explica y no opera)
  expect(await sec.locator('button:not(.preg-ia), a, [data-consulta], [data-pos]').count()).toBe(0);
  await expect(page.locator('#vista .movidas[open], #vista .mov-cols')).toHaveCount(0);
  const r = await page.evaluate(() => {
    const mias = new Set(S.M.filas.map((f) => f.inst.corto || f.inst.nombre));
    const li = [...document.querySelectorAll('#vista .mvt')].map((x) => ({ n: x.querySelector('.mvt-n b').textContent, p: x.querySelector('.mvt-p').textContent.trim(), ia: !!x.querySelector('.mvt-de') && /Según la IA/.test(x.querySelector('.mvt-de').textContent) }));
    return { li, todas: li.every((x) => mias.has(x.n)) };
  });
  if (r.li.length) {
    expect(r.todas).toBe(true);
    for (const x of r.li) expect(x.p.length).toBeGreaterThan(10);
    // nuestros textos, sin órdenes (lo que escribe la IA lleva su firma)
    for (const x of r.li.filter((y) => !y.ia)) expect(x.p).not.toMatch(ORDEN);
  } else await expect(sec.locator('.nota')).toContainText('Hoy no se ha movido nada');
  await expect(sec.locator('.mvt-nota')).toHaveCount(r.li.length ? 1 : 0);
  // el porqué, con hechos: dividendo de hoy, resultados de estos días, y la bolsa si no hay nada más
  const pq = await page.evaluate(() => {
    const hoy = hoyIso(), ayer = iso(new Date(Date.now() - 864e5));
    const base = (inst, p = {}) => ({ inst: { id: 'x-' + Math.random(), corto: 'X', ...inst }, p });
    const N = S.precios.noticias; S.precios.noticias = {}; const inf = S.informe; S.informe = null;
    try {
      return [porqueMovida(base({ clase: 'Renta variable', pais: 'ES' }, { ex_dividendo: hoy })), porqueMovida(base({ clase: 'Renta variable', pais: 'US' }, { proximos_resultados: ayer })),
        porqueMovida(base({ clase: 'Cripto' })), porqueMovida(base({ clase: 'Renta variable', pais: 'ES', tipo: 'Acción' })), porqueMovida(base({ clase: 'Renta fija', tipo: 'Fondo' }))];
    } finally { S.precios.noticias = N; S.informe = inf; }
  });
  expect(pq[0]).toMatch(/fecha de dividendo/); expect(pq[1]).toMatch(/^Presentó resultados el/);
  expect(pq[2]).toMatch(/No hay una noticia suya de hoy\. El bitcoin va [+−-]?\d/);
  expect(pq[3]).toMatch(/El Ibex 35 va/); expect(pq[4]).toBe('No hay una noticia suya de hoy.');
  for (const t of pq) expect(t).not.toMatch(ORDEN);
  // en Mercados siguen las del radar
  expect(await page.evaluate(() => typeof htmlMovidas === 'function')).toBe(true);
});

test('la regla «celebra el plan, no la operación» está escrita en el repo', async ({}, info) => {
  test.skip(info.project.name !== 'pc', 'basta una vez');
  const m = readFileSync(new URL('../claude/marca.md', import.meta.url), 'utf8');
  expect(m).toContain('## Celebra el plan, no la operación');
  expect(m).toMatch(/solo tus posiciones/); expect(m).toMatch(/sin botón/i); expect(m).toMatch(/base 100/);
});
