// 0.9 · El acabado híbrido (maqueta del 15 nov, B4; claude/decisiones-15nov-maqueta-paso-hoy.md): en el ordenador, por
// defecto, el fondo plano del liso con cada bloque en su tarjeta (por tono: sin sombra y con el borde casi invisible); en
// el móvil, las tarjetas de siempre y «más tarjetas» (Lo que viene y las secciones de Tu plan y tus movimientos). El liso
// sigue en Ajustes y en él no hay cajas.
import { test as base, expect } from '@playwright/test';
import { preparar, crearCuenta, meterCartera, quitarCapas } from './ayuda.js';

const test = base.extend({
  errores: [async ({ context }, use) => {
    const errores = await preparar(context);
    await use(errores);
    expect(errores, 'errores de JavaScript en la página').toEqual([]);
  }, { auto: true }],
});

async function hoy(page, acabado) {
  await crearCuenta(page); await meterCartera(page); await quitarCapas(page);
  await page.evaluate((a) => { LS.set('inv-empezar-no', true); LS.set('inv-empezar-fin', true); S.recienCreada = false; ponerAcabado(a); location.hash = 'cartera'; pintar(); }, acabado);
  await quitarCapas(page);
  await expect(page.locator('#vista .ag-card')).toBeVisible();
}
const medir = (page) => page.evaluate(() => {
  const c = (s) => { const e = document.querySelector(s); if (!e) return null; const g = getComputedStyle(e); return { fondo: g.backgroundColor, borde: g.borderTopWidth, sombra: g.boxShadow, radio: g.borderTopLeftRadius }; };
  return {
    acabado: document.documentElement.getAttribute('data-acabado'),
    vetas: getComputedStyle(document.querySelector('#acabadoTema')).backgroundImage,
    hero: c('#vista .hero-panel'), agenda: c('#vista .ag-card'), plan: c('#vista .car-plan .pila > section'), dia: c('#vista .hoy-dia'),
  };
});
const transparente = 'rgba(0, 0, 0, 0)';

test('sin elegir, híbrido en el ordenador y tarjetas en el móvil, con más tarjetas en los dos', async ({ page }, info) => {
  await hoy(page, 'auto');
  const m = await medir(page), pc = info.project.name === 'pc';
  expect(m.acabado).toBe(pc ? 'hibrido' : null);
  // el fondo: plano en el híbrido, con vetas en el de tarjetas
  if (pc) expect(m.vetas).toBe('none'); else expect(m.vetas).toContain('url(');
  // Lo que viene, las secciones de Tu plan y lo del día, en su tarjeta
  for (const k of ['agenda', 'plan', 'dia']) {
    expect(m[k], k).not.toBeNull();
    expect(m[k].fondo, k).not.toBe(transparente);
    expect(m[k].borde, k).toBe('1px');
    expect(m[k].radio, k).not.toBe('0px');
  }
  // en el híbrido, por tono: sin sombra
  if (pc) for (const k of ['hero', 'agenda', 'plan', 'dia']) expect(m[k].sombra, k).toBe('none');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize().width + 1);
});

test('el híbrido se elige en Ajustes, se queda al volver a abrir, y el liso sigue sin cajas', async ({ page }) => {
  await hoy(page, 'hibrido');
  expect((await medir(page)).acabado).toBe('hibrido');
  expect(await page.evaluate(() => { const d = document.createElement('div'); d.innerHTML = htmlSelectorAcabado(); return d.querySelector('[data-acabado-b="hibrido"]').getAttribute('aria-pressed'); })).toBe('true');
  await page.reload(); await quitarCapas(page);
  await expect.poll(() => page.evaluate(() => document.documentElement.getAttribute('data-acabado')), { timeout: 20_000 }).toBe('hibrido');
  await page.evaluate(() => { ponerAcabado('liso'); location.hash = 'cartera'; pintar(); });
  await quitarCapas(page);
  await expect(page.locator('#vista .ag-card')).toBeVisible();
  await expect(page.locator('#vista .hoy-dia')).toBeAttached();
  const l = await medir(page);
  expect(l.acabado).toBe('liso');
  for (const k of ['agenda', 'plan', 'dia']) { expect(l[k].fondo, k).toBe(transparente); expect(l[k].sombra, k).toBe('none'); }
});
