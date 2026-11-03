// 0.8 (paso 5p) · La presentación y el tutorial nuevos (maqueta aprobada el 3 nov: https://claude.ai/artifact/THN75znmPR44S1A94LYbev).
// La presentación: va en su trozo, se cuenta en ocho capítulos, cambia los textos con «Estoy empezando / Llevo años
// invirtiendo», baja solo la imagen del diseño en el que estás y su final lleva a crear la cuenta o a entrar. El tutorial:
// por capítulos, casi todo se toca (lo que pide cuenta como hecho; lo demás no hace nada) y sin posiciones se salta lo que no
// se puede enseñar. Y la guía de lo nuevo de la 0.8 para quien ya la usaba, en seis pasos.
import { test as base, expect } from '@playwright/test';
import { preparar, crearCuenta, meterCartera, quitarCapas } from './ayuda.js';

const conTema = (tema) => base.extend({
  errores: [async ({ context }, use) => {
    const errores = await preparar(context, { ajustes: { 'inv-tema': JSON.stringify(tema), 'stub-dueno': 'lucia@prueba.com' } });
    await use(errores);
    expect(errores, 'errores de JavaScript en la página').toEqual([]);
  }, { auto: true }],
});

conTema('borgona')('la presentación: ocho capítulos, a tu medida, con la imagen de tu diseño y el final a crear la cuenta', async ({ page }, info) => {
  base.skip(info.project.name === 'movil-pequeno', 'basta con el móvil y el ordenador');
  const imgs = [];
  page.on('request', (r) => { if (/toison-(marmol|sello)\.webp/.test(r.url())) imgs.push(r.url().split('/').pop()); });
  await page.goto('/#cuenta');
  await page.waitForSelector('.intro.pres');
  await expect(page.locator('.pr-sec[data-c]')).toHaveCount(8);
  await expect(page.locator('.pr-heroe .pr-medalla img')).toHaveAttribute('src', 'toison-sello.webp');
  await page.waitForTimeout(500);
  expect(imgs).toEqual(['toison-sello.webp']);
  // a tu medida: «Llevo años invirtiendo» cambia el texto de cada capítulo y se recuerda
  const x = page.locator('.pr-sec[data-c="5"] .pr-x');
  await expect(x.locator('.nov')).toBeVisible();
  await page.click('[data-p="exp"]');
  await expect(x.locator('.exp')).toBeVisible();
  await expect(x.locator('.nov')).toBeHidden();
  expect(await page.evaluate(() => LS.get('inv-nivel'))).toBe('exp');
  // ningún capítulo da órdenes (CNMV)
  for (const t of await page.locator('.pr-x').allInnerTexts()) expect(t).not.toMatch(/te dice qué hacer|te dice cuáles/);
  // al llegar a un capítulo, se monta su escena: la de Hacienda calcula lo que pagarías
  await page.evaluate(() => { const s = document.querySelector('.pr-sec[data-c="5"]'); document.querySelector('.pr-sc').scrollTo({ top: s.offsetTop }); });
  await expect(page.locator('.pr-sec[data-c="5"] [data-p]')).not.toHaveText('');
  await expect(page.locator('.pr-rh')).toHaveText('VI · Hacienda');
  // el final: «Crear mi cartera» abre la cuenta en crear
  await page.evaluate(() => { const s = document.querySelector('.pr-fin'); document.querySelector('.pr-sc').scrollTo({ top: s.offsetTop }); });
  await page.click('.pr-fin [data-in="crear"]');
  await page.waitForSelector('#fCorreo');
  await expect(page.locator('.cuenta-modo [data-m="crear"]')).toHaveAttribute('aria-pressed', 'true');
  expect(await page.evaluate(() => LS.get('inv-intro2'))).toBe(true);
});

conTema('marmol')('el tutorial: por capítulos, lo que se pide cuenta y lo demás no hace nada; y la guía de lo nuevo', async ({ page }, info) => {
  base.skip(info.project.name !== 'movil', 'una vez basta');
  await crearCuenta(page); await quitarCapas(page);
  // sin posiciones: fuera la gráfica, los periodos y la ficha
  await page.evaluate(() => iniciarTour(0));
  expect(await page.evaluate(() => TOURE.pasos.length)).toBe(14);
  await expect(page.locator('.tour-k')).toContainText('Hoy');
  await page.evaluate(() => cerrarTour());
  await meterCartera(page); await quitarCapas(page);
  await page.evaluate(() => iniciarTour(0));
  expect(await page.evaluate(() => TOURE.pasos.length)).toBe(17);
  await expect(page.locator('.tour-indice span')).toHaveCount(6);
  // el ojo: tocarlo cuenta («¡Eso es!») y, al pasar de paso, las cifras vuelven
  await page.evaluate(() => irPasoTour(3));
  await expect(page.locator('.tour-caja h3')).toHaveText('El ojo esconde las cifras');
  await expect(page.locator('.tour-foco')).toHaveClass(/pulsa/);
  await page.locator('.hero-ojo').click();
  await expect(page.locator('.tour-prueba')).toHaveText('¡Eso es!');
  expect(await page.evaluate(() => S.oculto)).toBe(true);
  // un toque en otro sitio no hace nada: la barra no cambia de pestaña
  await page.locator('.navbar [data-ir="mercados"]').click();
  expect(await page.evaluate(() => S.vista)).toBe('cartera');
  await page.click('.tour-caja [data-t="sig"]');
  expect(await page.evaluate(() => S.oculto)).toBe(false);
  // tocar el botón de la barra que pide lleva al paso siguiente solo
  await page.evaluate(() => irPasoTour(1));
  await expect(page.locator('.tour-caja h3')).toHaveText('Análisis: tu cartera por dentro');
  await page.locator('.navbar [data-ir="posiciones"]').click();
  await expect(page.locator('.tour-caja h3')).toHaveText('Todo, en pestañas');
  await expect(page.locator('.tour-k')).toContainText('Análisis');
  await expect(page.locator('.tour-n')).toHaveText('2 de 3');
  // el final: los primeros pasos y empezar por el primero que falta
  await page.evaluate(() => irPasoTour(TOURE.pasos.length - 1 - TOURE.i));
  await expect(page.locator('.tour-caja h3')).toHaveText('Ya conoces Toisón');
  await expect(page.locator('.tour-caja [data-emp="perfil"]')).toHaveText('Empezar por el primero');
  await page.evaluate(() => cerrarTour());
  // la guía de lo nuevo de la 0.8: seis pasos, y «Nuevo» en Tú, donde se elige el diseño
  expect(await page.evaluate(() => pasosGuia().map((p) => p.t))).toEqual(['GrowFolio ahora es Toisón', 'Cinco botones, Hoy en el centro', 'GrowIA ahora es «la IA»', 'Tu diseño, en Tú', 'Elige uno', 'Listo']);
  expect(await page.evaluate(() => { LS.set('inv-nov-vista', { v: VERSION, d: hoyIso() }); LS.set('inv-guia', ''); return grupoNuevo(); })).toBe('tu');
  await page.evaluate(() => guiaNuevo());
  await expect(page.locator('.tour-caja h3')).toHaveText('GrowFolio ahora es Toisón');
  await expect(page.locator('.tour-k')).toHaveText('Lo nuevo de la 0.8');
  await page.evaluate(() => irPasoTour(2));
  await expect(page.locator('.tour-caja h3')).toHaveText('GrowIA ahora es «la IA»');
});
