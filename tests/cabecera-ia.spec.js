// 0.8.2d · todo con Claude, sesión 5: la cabecera del panel dice que es una IA («La IA», «The AI» en inglés) y la ve todo el
// mundo, sin ningún aviso nuevo (Carlos, 6 nov: «ya lo pone arriba que es una IA»). Se mira con una cuenta normal (de las
// del nivel reducido, no de la lista del tope alto), con la IA lista y sin poder contestar, en el fundador, en inglés y en
// la cartera de prueba; en los tres anchos. Que se vea quiere decir: a la vista, dentro de la pantalla y sin nada encima.
import { test as base, expect } from '@playwright/test';
import { preparar, crearCuenta, meterCartera, quitarCapas } from './ayuda.js';

const conIdioma = (idioma) => base.extend({
  errores: async ({ context }, use) => {
    const errores = await preparar(context, { idioma });
    await use(errores);
    expect(errores, 'errores de JavaScript en la página').toEqual([]);
  },
});
const test = conIdioma('es'), testEn = conIdioma('en');

async function cabecera(page) {
  const t = page.locator('#asesorFondo #asTit');
  await expect(t).toBeVisible({ timeout: 15_000 });
  return t.evaluate((el) => {
    const b = el.getBoundingClientRect(), x = b.left + Math.min(b.width / 2, 16), y = b.top + b.height / 2, e = document.elementFromPoint(x, y);
    return { txt: el.textContent.trim(), dentro: b.width > 0 && b.top >= 0 && b.left >= 0 && b.right <= innerWidth && b.bottom <= innerHeight, encima: e && !el.contains(e) ? String(e.className || e.tagName) : '' };
  });
}
async function abrir(page) {
  await quitarCapas(page);
  await page.evaluate(() => { document.querySelectorAll('.hoja-fondo, .tour, .ixn, .intro').forEach((x) => x.remove()); abrirAsesor(); });
}
const cerrar = (page) => page.evaluate(() => cerrarAsesor());

test('la cabecera dice que es una IA para cualquiera: con la IA lista o sin poder contestar, en el estándar y en el fundador', async ({ page, errores }) => {
  await crearCuenta(page);
  await meterCartera(page);
  // sin Worker: la IA no puede contestar (pantalla de «la IA no puede contestar»), y la cabecera sigue ahí
  await abrir(page);
  await expect(page.locator('.as-sin-ia, .as-error, #asTexto').first()).toBeAttached({ timeout: 20_000 });
  expect(await cabecera(page)).toEqual({ txt: 'La IA', dentro: true, encima: '' });
  await cerrar(page);
  // con la IA lista, en el chat (y con una conversación ya empezada)
  await page.evaluate(() => { window.iaLista = () => true; AS.vista = 'chat'; });
  await abrir(page);
  await expect(page.locator('#asTexto')).toBeVisible({ timeout: 15_000 });
  expect(await cabecera(page)).toEqual({ txt: 'La IA', dentro: true, encima: '' });
  await page.evaluate(() => { AS.conv.push({ rol: 'yo', texto: '¿Cómo va mi cartera?' }, { rol: 'ia', partes: [{ tipo: 'texto', texto: 'Una respuesta larga. '.repeat(400) }], citas: [], resultados: [], t: Date.now() }); pintarAsesor(true); });
  expect(await cabecera(page)).toEqual({ txt: 'La IA', dentro: true, encima: '' });
  await cerrar(page);
  // en el fundador, igual
  await page.evaluate(() => { S.acceso = 'privado'; AS.conv = []; });
  await abrir(page);
  expect(await cabecera(page)).toEqual({ txt: 'La IA', dentro: true, encima: '' });
  // y no hay ningún aviso nuevo de «es una IA» dentro del panel: solo la cabecera
  expect(await page.locator('#asesorFondo').evaluate((el) => (el.innerText.match(/\bes una IA\b|\bis an AI\b/gi) || []).length)).toBe(0);
});

test('en la cartera de prueba la cabecera también dice que es una IA', async ({ page, errores }) => {
  await crearCuenta(page);
  await meterCartera(page);
  await quitarCapas(page);
  await page.evaluate(() => { entrarDemo(); });
  await expect(page.locator('#pAct')).toBeVisible({ timeout: 10_000 });
  await page.fill('#pAct', 'cartera-123');
  await page.locator('#fPAct button[type=submit]').click();
  await expect(page.locator('#demoBanda')).toBeVisible({ timeout: 30_000 });
  await abrir(page);
  expect(await cabecera(page)).toEqual({ txt: 'La IA', dentro: true, encima: '' });
});

testEn('in English the header says «The AI»', async ({ page, errores }) => {
  await crearCuenta(page);
  await meterCartera(page);
  await abrir(page);
  expect(await cabecera(page)).toEqual({ txt: 'The AI', dentro: true, encima: '' });
});
