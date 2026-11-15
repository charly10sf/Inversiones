// 0.7m: lo que se anima sin parar solo puede cambiar la opacidad o la posición (transform): eso lo mueve el móvil sin
// volver a pintar. La pastilla de GTA VI de la cabecera (quitada el 15 nov) animaba text-shadow y box-shadow y se
// repintaba en cada fotograma: con la CPU de un móvil normal, el 95 % de lo que gastaba la app estando quieta.
// También: el estreno de Toisón cumple lo mismo
import { test as base, expect } from '@playwright/test';
import { preparar, crearCuenta, meterCartera, quitarCapas } from './ayuda.js';

const test = base.extend({
  errores: async ({ context }, use) => {
    const errores = await preparar(context);
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

test('en Inicio, lo que no para solo cambia opacidad y posición', async ({ page, errores }) => {
  await crearCuenta(page);
  await quitarCapas(page);
  await meterCartera(page);
  await page.evaluate(() => document.querySelectorAll('.hoja-fondo, .tour').forEach((e) => e.remove()));
  await page.waitForTimeout(1500);
  const l = await page.evaluate(sinParar);
  expect(queRepintan(l), JSON.stringify(l)).toEqual([]);
});

