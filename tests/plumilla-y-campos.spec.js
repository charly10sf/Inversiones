// 0.8 (rediseño, paso 2) · Con un diseño de Toisón, los iconos de la barra, de la cabecera y de Tú son los de plumilla del
// Design System (contornos rellenos, sin trazo) y los campos llevan los tokens del diseño: borde de 2 px, radio 12, 48 px de
// alto, borde de oro al escribir y casillas de metal al marcarlas. Con GrowFolio, todo como siempre.
import { test as base, expect } from '@playwright/test';
import { preparar, crearCuenta, meterCartera, quitarCapas } from './ayuda.js';

const test = base.extend({
  errores: [async ({ context }, use) => {
    const errores = await preparar(context, { ajustes: { 'inv-tema': JSON.stringify('marfil'), 'stub-dueno': 'lucia@prueba.com' } });
    await use(errores);
    expect(errores, 'errores de JavaScript en la página').toEqual([]);
  }, { auto: true }],
});
const ir = async (page, h) => { await page.evaluate((x) => { location.hash = x; }, h); await page.waitForTimeout(400); };

// un formulario de prueba dentro de la vista: así se mira el CSS de los campos sin depender de una hoja concreta
const formulario = (page) => page.evaluate(() => {
  document.querySelector('#pruebaCampos')?.remove();
  const f = document.createElement('div'); f.id = 'pruebaCampos';
  f.innerHTML = '<label class="campo">Nombre<input id="pcTexto" placeholder="Escribe"><small>Ayuda</small></label>'
    + '<label class="campo">Tipo<select id="pcSel"><option>Uno</option><option>Dos</option></select></label>'
    + '<label class="check"><input type="checkbox" id="pcCasilla" checked>Marcada</label>'
    + '<label class="check"><input type="radio" id="pcRadio" name="pc" checked>Elegida</label>';
  document.querySelector('#vista').prepend(f);
});
const estilos = (page) => page.evaluate(() => {
  const cs = (s) => getComputedStyle(document.querySelector(s));
  const tok = (v) => { const e = document.createElement('i'); e.style.color = `var(${v})`; document.body.append(e); const c = getComputedStyle(e).color; e.remove(); return c; };
  return { borde: cs('#pcTexto').borderTopWidth, radio: cs('#pcTexto').borderTopLeftRadius, alto: document.querySelector('#pcTexto').getBoundingClientRect().height,
    selBorde: cs('#pcSel').borderTopWidth, casilla: cs('#pcCasilla').backgroundImage, radioFondo: cs('#pcRadio').backgroundImage,
    casillaAncho: cs('#pcCasilla').width, oro: tok('--oro-texto') };
});

test('iconos de plumilla en la barra, la cabecera y Tú', async ({ page }, info) => {
  test.skip(info.project.name !== 'movil', 'una vez basta');
  await crearCuenta(page); await meterCartera(page); await quitarCapas(page);
  await ir(page, 'cartera');
  // los cuatro de la barra (Hoy sigue siendo el medallón con el símbolo) y la IA de la cabecera
  const barra = await page.evaluate(() => [...document.querySelectorAll('.navbar a:not(.nav-centro) svg')].map((s) => s.classList.contains('ic-pl')));
  expect(barra).toEqual([true, true, true, true]);
  await expect(page.locator('.navbar .nav-centro svg.nav-med')).toBeVisible();
  await expect(page.locator('#bAsesor svg.ic-pl')).toBeVisible();
  // rellenos y sin trazo, del color del texto de cada sitio
  const pinta = await page.evaluate(() => { const p = document.querySelector('.navbar svg.ic-pl path'); const c = getComputedStyle(p); return { stroke: c.stroke, fill: c.fill, color: getComputedStyle(p.closest('svg')).color }; });
  expect(pinta.stroke).toBe('none');
  expect(pinta.fill).toBe(pinta.color);
  // Tú: cada fila con el suyo
  await ir(page, 'tu');
  const filas = await page.locator('#vista .aj-fila').count();
  expect(filas).toBeGreaterThanOrEqual(7);
  await expect(page.locator('#vista .aj-fila > svg.ic-pl')).toHaveCount(filas);
});

test('los campos, con los tokens de cada diseño', async ({ page }, info) => {
  test.skip(info.project.name !== 'movil', 'una vez basta');
  await crearCuenta(page); await meterCartera(page); await quitarCapas(page);
  await ir(page, 'cartera');
  for (const t of ['marmol', 'marfil']) {
    await page.evaluate((x) => ponerTema(x), t);
    await formulario(page);
    const e = await estilos(page);
    expect(e.borde, t).toBe('2px');
    expect(e.selBorde, t).toBe('2px');
    expect(e.radio, t).toBe('12px');
    expect(e.alto, t).toBeGreaterThanOrEqual(48);
    expect(e.casillaAncho, t).toBe('20px');
    expect(e.casilla, `${t}: casilla marcada de metal`).toContain('linear-gradient');
    expect(e.radioFondo, `${t}: opción elegida de metal`).toContain('linear-gradient');
    await page.locator('#pcTexto').focus();
    await expect.poll(() => page.evaluate(() => getComputedStyle(document.querySelector('#pcTexto')).borderTopColor), { message: `${t}: borde de oro al escribir` }).toBe(e.oro);
  }
});
