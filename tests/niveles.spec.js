// Tres niveles de versión desde la 0.8.2 (regla de Carlos del 4 nov; claude/cerrar-version.md): gorda (0.9, 1.0) con lo
// nuevo contado bajando, guía y «Nuevo» en la barra; intermedia (0.8.2, 0.9.1) con una hoja corta y sin guía; letra
// (0.9a, 0.9.1b) con la tarjeta de arreglos. Antes de la 0.8.2 toda versión sin letra era de número: siguen siendo gordas.
// La app va por la 0.8.1d, así que las intermedias se prueban con versiones inventadas metidas en NOVEDADES.
import { test as base, expect } from '@playwright/test';
import { preparar, crearCuenta, meterCartera, quitarCapas } from './ayuda.js';
import { partirNovedades } from '../build/growfolio-vite.js';

const test = base.extend({
  errores: [async ({ context }, use) => {
    const errores = await preparar(context);
    await use(errores);
    expect(errores, 'errores de JavaScript en la página').toEqual([]);
  }, { auto: true }],
});

test.beforeEach(({}, info) => test.skip(info.project.name !== 'movil', 'en el móvil'));

test('qué es cada versión y qué se enseña al abrirla', async ({ page }) => {
  await page.goto('/');
  await crearCuenta(page);
  const r = await page.evaluate(() => ({
    gordas: ['0.3.11', '0.7', '0.8', '0.8.1', '0.9', '1.0', '1.1'].map(esGorda),
    intermedias: ['0.8.2', '0.8.6', '0.9.1', '1.1.3'].map(esIntermedia),
    letras: ['0.8.1a', '0.9a', '0.9.1b'].map((v) => esGorda(v) || esIntermedia(v)),
    gordaDe: ['0.8.1a', '0.8.2', '0.8.3a', '0.9', '0.9a', '0.9.1', '0.9.1b', '1.1.3'].map(gordaDe),
    guia: GUIA_ID(),
    raras: [esGorda(''), esGorda(null), esGorda('0.10'), esIntermedia('0.10.1'), gordaDe('0.10.2a'), caminoNovedades('', '0.9'), caminoNovedades('0.9', '0.9.2'), caminoNovedades('0.9.1', '0.10.1')],
    caminos: [[null, '0.8.2'], ['0.8.1a', '0.8.1a'], ['0.8.1', '0.8.1a'], ['0.8.1a', '0.8.2'], ['0.8a', '0.8.2'], ['0.8.2', '0.8.3'],
      ['0.8.6', '0.9'], ['0.8.6', '0.9.1'], ['0.9', '0.9.1'], ['0.9a', '0.9.1a'], ['0.9.1', '0.9.1a'], ['0.9.1', '0.9.2'], ['0.9.2', '1.0']]
      .map(([a, b]) => caminoNovedades(a, b)),
  }));
  expect(r.gordas).toEqual([true, true, true, true, true, true, true]);
  expect(r.intermedias).toEqual([true, true, true, true]);
  expect(r.letras).toEqual([false, false, false]);
  expect(r.gordaDe).toEqual(['0.8.1', '0.8.1', '0.8.1', '0.9', '0.9', '0.9', '0.9', '1.1']);
  expect(r.guia).toBe('0.8.1');   // en la 0.8.1a, la guía sigue siendo la de la 0.8.1
  expect(r.raras).toEqual([true, true, true, true, '0.10', 'gorda', 'corta', 'gorda']);
  expect(r.caminos).toEqual(['gorda', null, 'letra', 'corta', 'gorda', 'corta', 'gorda', 'gorda', 'corta', 'corta', 'letra', 'corta', 'gorda']);
});

test('una intermedia: hoja corta con «Ir», sin guía, y en el historial cuelga de su gorda', async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto('/');
  await crearCuenta(page);
  await quitarCapas(page);
  await meterCartera(page);
  await page.evaluate(async () => {
    await cargarTrozo('novedades');
    const ir = NOVEDADES.find((n) => n.v === '0.8.1').cosas.find((c) => c.ir).ir;
    NOVEDADES.unshift(
      { v: '0.8.3', t: 'Otra intermedia', f: '2026-11-29', cosas: [{ t: 'Cosa de la 0.8.3', x: 'Texto.' }] },
      { v: '0.8.2a', t: 'Arreglos', f: '2026-11-16', arreglos: ['Un arreglo para todos', { t: 'Un arreglo del dueño', solo: 'dueno' }] },
      { v: '0.8.2', t: 'La IA explica', f: '2026-11-15', cosas: [
        { t: 'Con sitio', x: 'Se puede ir.', ir },
        { t: 'Sin sitio', x: 'Solo se cuenta.' },
        { t: 'Solo del dueño', x: 'No la ve nadie más.', solo: 'dueno' },
      ] });
    document.querySelectorAll('.hoja-fondo, .tour, .ixn').forEach((x) => x.remove());
  });

  // sin guía ni «Nuevo»: las intermedias no tienen pasos aunque sus cosas tengan sitio
  expect(await page.evaluate(() => pasosGuia([NOVEDADES.find((n) => n.v === '0.8.2')]).length)).toBe(0);

  // de la 0.8.1d a la 0.8.2a: la hoja corta con lo de la 0.8.2 y sus arreglos plegados, sin lo del dueño (desde la
  // 0.8.1c saldría también el arreglo para todos de la 0.8.1d)
  await page.evaluate(() => hojaIntermedia('0.8.1d', () => { window.__cerrada = true; }, '0.8.2a'));
  const h = page.locator('.hoja-corta');
  await expect(h).toBeVisible();
  await expect(h.locator('.nov-lista li')).toHaveCount(2);
  await expect(h).toContainText('Con sitio');
  await expect(h).not.toContainText('Solo del dueño');
  await expect(h).not.toContainText('Cosa de la 0.8.3');
  await expect(h.locator('.nov-arr-pleg summary')).toHaveText('1 arreglo');
  await expect(h.locator('[data-corta-ir]')).toHaveCount(1);
  await expect(h.locator('.ixn, [data-nov-todo]')).toHaveCount(0);
  // «Ir» lleva al sitio con el tutorial y vuelve a la hoja corta
  await page.evaluate(() => document.querySelector('.hoja-corta [data-corta-ir]').click());
  await expect(page.locator('.tour')).toBeVisible();
  await page.evaluate(() => cerrarTour(true));
  await expect(page.locator('.hoja-corta')).toBeVisible();
  await page.evaluate(() => document.querySelector('.hoja-corta [data-cerrar]').click());
  await expect(page.locator('.hoja-corta')).toHaveCount(0);
  expect(await page.evaluate(() => window.__cerrada)).toBe(true);

  // si todo es solo del dueño, a los demás no les sale nada y se sigue
  const nada = await page.evaluate(() => {
    const n = NOVEDADES.find((x) => x.v === '0.8.2a'), antes = n.arreglos;
    n.arreglos = [{ t: 'Solo para el dueño', solo: 'dueno' }];
    let seguido = false;
    hojaIntermedia('0.8.2', () => { seguido = true; }, '0.8.2a');
    n.arreglos = antes;
    return { seguido, hoja: !!document.querySelector('.hoja-corta') };
  });
  expect(nada).toEqual({ seguido: true, hoja: false });

  // en «¿Qué se ha mejorado?», la 0.8.2 y la 0.8.2a van dentro de la 0.8.1, no sueltas
  await page.evaluate(() => mostrarNovedades('0.8.3', () => {}, true));
  const antes = page.locator('.hoja-nov .nov-antes');
  await expect(antes).toBeVisible();
  const sueltas = await antes.evaluate((s) => [...s.querySelectorAll(':scope > .nov-ant > summary .nov-num')].map((x) => x.textContent));
  expect(sueltas).not.toContain('0.8.2');
  expect(sueltas).toContain('0.8.1');
  const hijas = await antes.evaluate((s) => [...s.querySelectorAll(':scope > .nov-ant')].find((d) => d.querySelector('summary .nov-num').textContent === '0.8.1')
    .querySelector('.nov-hijas').textContent);
  expect(hijas).toContain('0.8.2');
  expect(hijas).toContain('La IA explica');
});

test('el build deja en el núcleo las novedades hasta la gorda (la misma regla que esGorda)', () => {
  const mk = (vs) => 'const NOVEDADES = [\n' + vs.map((v) => `  { v: '${v}', t: 'x' },\n`).join('') + '];\n';
  const nucleo = (vs) => [...partirNovedades(mk(vs)).nucleo.matchAll(/v: '([^']+)'/g)].map((m) => m[1]);
  expect(nucleo(['0.8.1a', '0.8.1', '0.8a', '0.8'])).toEqual(['0.8.1a', '0.8.1']);
  expect(nucleo(['0.8.3', '0.8.2a', '0.8.2', '0.8.1a', '0.8.1', '0.8'])).toEqual(['0.8.3', '0.8.2a', '0.8.2', '0.8.1a', '0.8.1']);
  expect(nucleo(['0.9.1a', '0.9.1', '0.9a', '0.9', '0.8.6'])).toEqual(['0.9.1a', '0.9.1', '0.9a', '0.9']);
  expect(nucleo(['1.1.3', '1.1', '1.0.2'])).toEqual(['1.1.3', '1.1']);
});

test('«Guíame por lo nuevo» es solo de las gordas; las intermedias guardan su «Enséñamelo»', async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto('/');
  await crearCuenta(page);
  await quitarCapas(page);
  await meterCartera(page);
  const r = await page.evaluate(async () => {
    await cargarTrozo('novedades');
    const ir = NOVEDADES.find((n) => n.v === '0.8.1').cosas.find((c) => c.ir).ir;
    NOVEDADES.unshift({ v: '0.8.2', t: 'Intermedia', f: '2026-11-15', cosas: [{ t: 'Con sitio', x: 'Se puede ir.', ir }] });
    document.querySelectorAll('.hoja-fondo, .tour, .ixn, .aviso-arr').forEach((x) => x.remove());
    // desde la 0.8.1a solo hay una intermedia nueva: «Enséñamelo» sí, la guía no
    mostrarNovedades('0.8.1a', () => {}, true);
    const h = document.querySelector('.hoja-nov');
    const soloIntermedia = { guia: !!h.querySelector('[data-nov-todo]'), ensenar: h.querySelectorAll('[data-nov-ir]').length };
    document.querySelectorAll('.hoja-fondo').forEach((x) => x.remove());
    // desde la 0.8a entran también la 0.8.1 (gorda, con su guía) y la 0.8.2
    mostrarNovedades('0.8a', () => {}, true);
    const h2 = document.querySelector('.hoja-nov');
    const conGorda = { guia: !!h2.querySelector('[data-nov-todo]'), ensenar: h2.querySelectorAll('[data-nov-ir]').length };
    document.querySelectorAll('.hoja-fondo').forEach((x) => x.remove());
    return { soloIntermedia, conGorda, pasosGorda: pasosGuia().length };
  });
  expect(r.soloIntermedia).toEqual({ guia: false, ensenar: 1 });
  expect(r.conGorda.guia).toBe(true);
  expect(r.conGorda.ensenar).toBeGreaterThan(1);
  expect(r.pasosGorda).toBeGreaterThan(0);
});
