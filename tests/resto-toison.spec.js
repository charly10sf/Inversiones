// 0.8 (rediseño, paso 4) · Lo que quedaba con el aspecto de GrowFolio, con un diseño de Toisón: el tutorial recorre la
// barra nueva y lleva el símbolo; Ajustes, la entrada y Primeros pasos, el símbolo y TOISÓN (sin la tarjeta «Muy
// pronto»); la presentación monta el símbolo y escribe TOISÓN; la cuenta atrás de GTA VI, sin neón y con la letra de la
// casa. Y la regla de la CNMV en el Paso a paso y en las sugerencias de la IA: ni «Vende…» ni «¿Vendo…?».
// (0.8: GrowFolio ya no existe; las pruebas de «con GrowFolio, como siempre» se quitaron.)
import { test as base, expect } from '@playwright/test';
import { readdirSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { preparar, crearCuenta, meterCartera, quitarCapas } from './ayuda.js';

const DIST = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist');

const conTema = (tema) => base.extend({
  errores: [async ({ context }, use) => {
    const errores = await preparar(context, { ajustes: { ...(tema ? { 'inv-tema': JSON.stringify(tema) } : {}), 'stub-dueno': 'lucia@prueba.com' } });
    await use(errores);
    expect(errores, 'errores de JavaScript en la página').toEqual([]);
  }, { auto: true }],
});
const ir = async (page, h) => { await page.evaluate((x) => { location.hash = x; }, h); await page.waitForTimeout(500); };

conTema('borgona')('con Toisón: tutorial, Ajustes, entrada, presentación y GTA con la marca nueva', async ({ page }, info) => {
  base.skip(info.project.name !== 'movil', 'una vez basta');
  // la entrada: el símbolo en su disco
  await page.goto('/#cuenta');
  await page.waitForSelector('.intro, #fCorreo', { timeout: 30000 });
  if (await page.$('.intro')) await page.click('.intro-saltar');
  await expect(page.locator('.caja-cuenta .logo.logo-ts svg.simb-ts')).toHaveCount(1);
  await crearCuenta(page); await meterCartera(page); await quitarCapas(page);
  // el tutorial: por capítulos (Hoy tiene cinco pasos con posiciones), el primero con el símbolo
  await page.evaluate(() => iniciarTour(0));
  await expect(page.locator('.tour-caja svg.simb-ts.tour-logo')).toHaveCount(1);
  await expect(page.locator('.tour-n')).toHaveText('1 de 5');
  await page.evaluate(() => irPasoTour(5));
  await expect(page.locator('.tour-caja h3')).toHaveText('Cartera: lo tuyo, fila a fila');
  await page.evaluate(() => cerrarTour());
  // Ajustes: TOISÓN arriba y sin «Muy pronto: GrowFolio pasa a llamarse Toisón»
  await page.evaluate(() => abrirAjustes());
  await expect(page.locator('.aj-cab .aj-ts')).toHaveText('Toisón');
  await expect(page.locator('.hoja .ts-tarjeta')).toHaveCount(0);
  await expect(page.locator('#aIntro svg.simb-ts')).toHaveCount(1);
  await quitarCapas(page);
  // GTA VI: Ibarra, sin brillos de neón
  await page.evaluate(() => abrirGTA());
  const tit = page.locator('.gta-tit');
  await expect(tit).toBeVisible();
  const est = await tit.evaluate((e) => { const c = getComputedStyle(e); return { f: c.fontFamily, s: c.textShadow, a: getComputedStyle(e, '::after').content }; });
  expect(est.f).toContain('Ibarra');
  expect(est.s).toBe('none');
  expect(est.a).toBe('none');
  expect(await page.locator('.gta-sec > .gta-rotulo').first().evaluate((e) => getComputedStyle(e).textShadow)).toBe('none');
  await page.evaluate(() => document.querySelectorAll('.gta-fondo').forEach((x) => x.remove()));
  // la presentación (0.8, paso 5p): TOISÓN y el símbolo en la medalla del final
  await page.evaluate(() => pantallaIntro(() => {}));
  await expect(page.locator('.pr-palabra')).toHaveAttribute('aria-label', 'Toisón');
  await expect(page.locator('.pr-medalla-fin .simb-ts')).toHaveCount(1);
});

conTema('marfil')('CNMV: el Paso a paso y las sugerencias de la IA, sin órdenes', async ({ page }, info) => {
  base.skip(info.project.name !== 'movil', 'una vez basta');
  await crearCuenta(page); await meterCartera(page); await quitarCapas(page);
  await page.evaluate(() => { S.acceso = 'privado'; pintar(); });
  await ir(page, 'ruta');
  const titulos = await page.locator('#vista .t-t').allInnerTexts();
  expect(titulos.length).toBeGreaterThan(0);
  for (const t of titulos) expect(t, t).not.toMatch(/^(Vende|Compra|Pon|Mete|Aparta|Plantéate) /);
  await expect(page.locator('#vista')).not.toContainText('plantéate vender');
  await expect(page.locator('#vista')).not.toContainText('consejo de GrowFolio');
  // las sugerencias del panel de la IA (salen con la clave puesta): en lo que se publica ya no están las de antes
  const js = readdirSync(join(DIST, 'assets')).filter((f) => f.endsWith('.js')).map((f) => readFileSync(join(DIST, 'assets', f), 'utf8')).join('\n');
  for (const q of ['¿Vendo ya', '¿dónde los meto?', '¿cuánto pierdo y qué hago?', '«¿Vendo Repsol?»', 'Qué vender o recortar']) expect(js, q).not.toContain(q);
});
