// 0.7m: lo que se anima sin parar solo puede cambiar la opacidad o la posición (transform): eso lo mueve el móvil sin
// volver a pintar. La pastilla de GTA VI de la cabecera animaba text-shadow y box-shadow y se repintaba en cada
// fotograma, en todas las pantallas: con la CPU de un móvil normal, el 95 % de lo que gastaba la app estando quieta.
// También: la pastilla se para con algo encima, y la hoja de GTA y el estreno de Toisón cumplen lo mismo
import { test as base, expect } from '@playwright/test';
import { preparar, crearCuenta, meterCartera, quitarCapas } from './ayuda.js';

const test = base.extend({
  errores: async ({ context }, use) => {
    const errores = await preparar(context, { ajustes: { 'inv-gta-son': false } });
    await use(errores);
    expect(errores, 'errores de JavaScript en la página').toEqual([]);
  },
});
test.beforeEach(({}, info) => test.skip(info.project.name === 'movil-pequeno', 'en 390 y 1440'));

// las animaciones que no acaban nunca y lo que cambian
const sinParar = () => document.getAnimations().filter((a) => a.playState === 'running' && a.effect && a.effect.getComputedTiming().iterations === Infinity).map((a) => {
  const t = a.effect.target;
  const props = [...new Set(a.effect.getKeyframes().flatMap((k) => Object.keys(k)))].filter((x) => !['offset', 'computedOffset', 'easing', 'composite'].includes(x));
  return { nombre: a.animationName, props, en: t ? `${t.tagName.toLowerCase()}.${String(t.className && t.className.baseVal != null ? t.className.baseVal : t.className).trim().replace(/\s+/g, '.')}${a.effect.pseudoElement || ''}` : '' };
});
const queRepintan = (l) => l.filter((x) => x.props.some((p) => !['opacity', 'transform', 'translate', 'scale', 'rotate'].includes(p)));

test('en Inicio, lo que no para solo cambia opacidad y posición; con una hoja encima, la pastilla de GTA se para', async ({ page, errores }) => {
  await crearCuenta(page);
  await quitarCapas(page);
  await meterCartera(page);
  await page.evaluate(() => document.querySelectorAll('.hoja-fondo, .tour').forEach((e) => e.remove()));
  await page.waitForTimeout(1500);
  const l = await page.evaluate(sinParar);
  expect(queRepintan(l), JSON.stringify(l)).toEqual([]);
  if (!(await page.evaluate(() => gtaActivo()))) return;
  const pastilla = () => page.evaluate(() => document.getAnimations().filter((a) => ['gtaNeon', 'gtaPastilla'].includes(a.animationName)).map((a) => a.playState).sort());
  // sin nada encima, en marcha (lo que se abre solo al entrar, como Primeros pasos, puede llegar tarde: se quita cada vez)
  const sinNada = async () => { await page.evaluate(() => document.querySelectorAll('body > .hoja-fondo, body > .tour, body > .estreno').forEach((e) => e.remove())); return pastilla(); };
  await expect.poll(sinNada).toEqual(['running', 'running']);
  await page.evaluate(() => abrirAjustes());
  await expect(page.locator('.hoja[aria-label="Ajustes"]')).toBeVisible();
  expect(await pastilla()).toEqual(['paused', 'paused']);
  await page.keyboard.press('Escape');
  await expect.poll(sinNada).toEqual(['running', 'running']);
});

test('la hoja de GTA VI: lo que no para solo cambia opacidad y posición, y el reloj cambia solo las cifras', async ({ page, errores }) => {
  await crearCuenta(page);
  await quitarCapas(page);
  await meterCartera(page);
  test.skip(!(await page.evaluate(() => gtaActivo())), 'GTA VI ya no sale');
  await page.evaluate(() => document.querySelector('[data-gta]').click());
  const g = page.locator('.gta-marco');
  await expect(g).toBeVisible();
  await expect(g.locator('.gta-tit')).toHaveAttribute('data-t', 'GTA VI');
  await expect(g.locator('.gta-camino')).toContainText('Abren las reservas');
  // el reloj: las mismas cajas, con otra cifra en los segundos
  if (await page.evaluate(() => !!gtaFalta())) {
    await page.evaluate(() => { window.__seg = document.querySelectorAll('#gtaReloj b')[3]; window.__segT = window.__seg.textContent; });
    await expect.poll(() => page.evaluate(() => window.__seg.isConnected && window.__seg.textContent !== window.__segT), { timeout: 4000 }).toBe(true);
  }
  await page.waitForTimeout(2500);
  await page.evaluate(() => { const x = document.querySelector('.gta'); x.scrollTop = x.scrollHeight; });
  await page.waitForTimeout(2500);
  const l = await page.evaluate(sinParar);
  expect(l.length).toBeGreaterThan(2);
  expect(queRepintan(l), JSON.stringify(l)).toEqual([]);
  await page.keyboard.press('Escape');
  await expect(g).toHaveCount(0);
});

test('el estreno de Toisón: lo que no para solo cambia opacidad y posición', async ({ page, errores }) => {
  await crearCuenta(page);
  await quitarCapas(page);
  await meterCartera(page);
  await page.evaluate(() => { LS.del('inv-toison-avance'); avisoToison(() => {}); });
  await expect(page.locator('.estreno.ts')).toBeVisible();
  await page.waitForTimeout(5000);
  const l = await page.evaluate(sinParar);
  expect(queRepintan(l), JSON.stringify(l)).toEqual([]);
});
