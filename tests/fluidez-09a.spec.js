// 0.9a · La fluidez del cambio de pestañas (Carlos, 15 nov: «la barra de abajo liquid que se quita al cambiar»). En el
// móvil, el paso de página ya no usa la View Transitions API: la barra de cristal sigue viva (sin foto) y solo se anima
// #vista, con opacidad y desplazamiento (compositor) en --mov-pagina; el botón tocado se marca antes de pintar; la rueda
// de la cifra espera a que entre la página; las hojas y la ficha se despiden en vez de desaparecer de golpe. En el
// ordenador sigue el paso «con profundidad». Lo que tarda, con la CPU frenada, se mide en tests/fluidez.spec.js.
import { test as base, expect } from '@playwright/test';
import { preparar, crearCuenta, meterCartera, quitarCapas } from './ayuda.js';

const test = base.extend({
  errores: [async ({ context }, use) => {
    const errores = await preparar(context);
    await use(errores);
    expect(errores, 'errores de JavaScript en la página').toEqual([]);
  }, { auto: true }],
});
const esMovil = (info) => info.project.name !== 'pc';
// los avisos que salen solos (una hoja, el tour) cortan el paso del móvil, como en la app: fuera antes de tocar
const SIN_CAPAS = "document.querySelectorAll('.tour, .hoja-fondo, .estreno, .intro, .nov-scroll, .ixn').forEach((x) => x.remove())";

async function abrir(page, { mov = true } = {}) {
  await crearCuenta(page); await meterCartera(page); await quitarCapas(page);
  await page.evaluate((m) => {
    LS.set('inv-empezar-no', true); LS.set('inv-empezar-fin', true); S.recienCreada = false; if (m) LS.set('inv-mov-prueba', true);
    window.__vt = 0; const vt = document.startViewTransition; if (vt) document.startViewTransition = function () { window.__vt++; return vt.apply(this, arguments); };
    location.hash = 'cartera'; pintar();
  }, mov);
  await quitarCapas(page);
  await expect(page.locator('#heroNum')).toBeVisible();
}
/* toca un botón de la barra (o del riel) y apunta, fotograma a fotograma, cómo están la barra y la página */
const tocarYMirar = (page, k) => page.evaluate(([k, sc]) => new Promise((ok) => {
  (0, eval)(sc);
  const a = [...document.querySelectorAll(`.navbar a[data-ir="${k}"], .riel [data-ir="${k}"]`)].find((x) => x.offsetParent);
  const vista = document.querySelector('#vista'), antes = S.vista, fr = [];
  let marcadoAntes = null;
  const t0 = performance.now();
  const paso = () => {
    const nb = document.querySelector('.navbar'), cs = nb && getComputedStyle(nb);
    const va = vista.getAnimations().map((x) => ({ props: x.effect.getKeyframes().flatMap((f) => Object.keys(f).filter((p) => !['offset', 'easing', 'composite', 'computedOffset'].includes(p))), ms: x.effect.getComputedTiming().duration }));
    fr.push({ vt: document.documentElement.classList.contains('vt') || document.getAnimations().some((x) => /view-transition/.test(x.effect.pseudoElement || '')), cristal: cs ? (cs.backdropFilter || cs.webkitBackdropFilter || 'none') !== 'none' : null, va });
    if (performance.now() - t0 < 900) requestAnimationFrame(paso); else ok({ fr, marcadoAntes, vista: S.vista });
  };
  // justo después de la app, en el mismo hashchange y antes de pintar: el botón ya está marcado
  addEventListener('hashchange', () => { marcadoAntes = S.vista === antes && a.getAttribute('aria-current') === 'page'; }, { once: true });
  a.click();
  requestAnimationFrame(paso);
}), [k, SIN_CAPAS]);

test('en el móvil, la barra de cristal sigue viva al cambiar de pestaña y solo se mueve la página, en el compositor', async ({ page }, info) => {
  test.skip(!esMovil(info), 'la barra de abajo es del móvil');
  await abrir(page); await quitarCapas(page);
  expect(await page.evaluate(() => [pasoMovil(), msToken('--mov-pagina', 0)])).toEqual([true, 200]);
  for (const [k, v] of [['posiciones', 'posiciones'], ['mercados', 'mercados'], ['cartera', 'cartera']]) {
    await quitarCapas(page);
    const r = await tocarYMirar(page, k);
    expect(r.vista).toBe(v);
    expect(r.marcadoAntes, `el botón de ${k} se marca antes de pintar`).toBe(true);
    // ninguna foto de la transición y el cristal puesto en todos los fotogramas
    expect(r.fr.some((f) => f.vt), `sin View Transition hacia ${k}`).toBe(false);
    expect(r.fr.every((f) => f.cristal), `la barra con su backdrop-filter hacia ${k}`).toBe(true);
    // la página se mueve: solo opacidad y transform, y no más de 220 ms
    const va = r.fr.flatMap((f) => f.va);
    expect(va.length, `la página de ${k} entra`).toBeGreaterThan(0);
    expect([...new Set(va.flatMap((x) => x.props))].sort()).toEqual(expect.arrayContaining(['opacity']));
    expect(va.flatMap((x) => x.props).every((p) => p === 'opacity' || p === 'transform')).toBe(true);
    expect(Math.max(...va.map((x) => x.ms))).toBeLessThanOrEqual(220);
  }
  expect(await page.evaluate(() => window.__vt)).toBe(0);
  // y al acabar no queda nada puesto en #vista
  await page.waitForTimeout(400);
  expect(await page.evaluate(() => [document.querySelector('#vista').getAnimations().length, document.querySelector('#vista').getAttribute('style') || ''])).toEqual([0, '']);
});

test('dos toques seguidos en la barra: gana el último y no queda la página a medio apagar', async ({ page }, info) => {
  test.skip(!esMovil(info), 'es el paso del móvil');
  await abrir(page);
  await page.evaluate((sc) => { (0, eval)(sc); document.querySelector('.navbar a[data-ir="posiciones"]').click(); }, SIN_CAPAS);
  await page.evaluate(() => { document.querySelector('.navbar a[data-ir="mercados"]').click(); });
  await expect.poll(() => page.evaluate(() => S.vista)).toBe('mercados');
  await page.waitForTimeout(500);
  expect(await page.evaluate(() => [getComputedStyle(document.querySelector('#vista')).opacity, document.querySelector('#vista').getAnimations().length, pasandoPagina()])).toEqual(['1', 0, false]);
  expect(await page.evaluate(() => document.querySelector('.navbar a[aria-current="page"]').dataset.ir)).toBe('mercados');
});

test('la rueda de la cifra espera a que entre la página para girar', async ({ page }, info) => {
  test.skip(!esMovil(info), 'es el paso del móvil');
  await abrir(page);
  await page.evaluate(() => { location.hash = 'posiciones'; });
  await expect(page.locator('#heroNum')).toHaveCount(0);
  await page.waitForTimeout(400);
  // justo después de pintar Hoy (antes del siguiente fotograma): los dígitos, en el 0; luego, en su sitio
  const r = await page.evaluate((sc) => new Promise((ok) => {
    (0, eval)(sc);
    const mo = new MutationObserver(() => { const d = [...document.querySelectorAll('#heroNum [data-b="totalE"] .rd')]; if (!d.length) return; mo.disconnect(); ok({ pasando: pasandoPagina(), d: d.map((x) => x.style.getPropertyValue('--d')) }); });
    mo.observe(document.querySelector('#vista'), { childList: true, subtree: true });
    document.querySelector('.navbar a[data-ir="cartera"]').click();
  }), SIN_CAPAS);
  expect(r.pasando).toBe(true);
  expect(r.d.every((x) => x === '0')).toBe(true);
  await expect.poll(() => page.evaluate(() => { const e = document.querySelector('#heroNum [data-b="totalE"]'); return [...e.querySelectorAll('.rd')].map((x) => x.style.getPropertyValue('--d')).join('') === e.textContent.replace(/\D/g, ''); })).toBe(true);
});

test('en el ordenador sigue el paso «con profundidad» de la View Transitions API', async ({ page }, info) => {
  test.skip(esMovil(info), 'es el del ordenador');
  await abrir(page);
  expect(await page.evaluate(() => pasoMovil())).toBe(false);
  await page.evaluate((sc) => { (0, eval)(sc); location.hash = 'mercados'; }, SIN_CAPAS);
  await expect.poll(() => page.evaluate(() => window.__vt)).toBeGreaterThan(0);
  await expect.poll(() => page.evaluate(() => document.documentElement.classList.contains('vt')), { timeout: 10_000 }).toBe(false);
});

test('con «reducir movimiento» la página cambia en el acto, sin animar nada', async ({ page }) => {
  await abrir(page);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const r = await page.evaluate((sc) => { (0, eval)(sc); location.hash = 'mercados'; return new Promise((ok) => setTimeout(() => ok({ v: S.vista, a: document.querySelector('#vista').getAnimations().length, vt: window.__vt, paso: pasoMovil() }), 0)); }, SIN_CAPAS);
  expect(r).toEqual({ v: 'mercados', a: 0, vt: 0, paso: false });
});

test('una hoja que se cierra se quita en el acto y deja una copia muda que se despide sola', async ({ page }) => {
  await abrir(page);
  const r = await page.evaluate(() => { const h = hoja('Prueba', '<p>Hola</p>'); h.cerrar(); return { hojas: document.querySelectorAll('.hoja-fondo .hoja[aria-label="Prueba"]').length, copia: !!document.querySelector('.capa-sale[aria-hidden="true"]'), inerte: document.querySelector('.capa-sale') && document.querySelector('.capa-sale').inert }; });
  expect(r).toEqual({ hojas: 0, copia: true, inerte: true });
  await expect(page.locator('.capa-sale')).toHaveCount(0, { timeout: 2000 });
  // sin movimiento, ni copia
  await page.evaluate(() => LS.set('inv-mov-prueba', false));
  expect(await page.evaluate(() => { const h = hoja('Prueba', '<p>Hola</p>'); h.cerrar(); return document.querySelectorAll('.capa-sale, .hoja-fondo .hoja[aria-label="Prueba"]').length; })).toBe(0);
});
