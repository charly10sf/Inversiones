// 0.8.3: los logos salen de Toisón (rama «logos»: logos.json + logos/<dominio>.webp) y no de Google. Con el índice a mano
// (el de la vez anterior o el que llega al abrir) el logo se pide ahí; lo que no está (un instrumento propio, la web de un
// medio) sigue con el servicio de iconos de Google, y sin logo, las iniciales. Sin la rama todavía, todo como antes.
import { test as base, expect } from '@playwright/test';
import { preparar, crearCuenta, quitarCapas } from './ayuda.js';

const test = base.extend({
  errores: [async ({ context }, use) => {
    const errores = await preparar(context);
    await use(errores);
    expect(errores, 'errores de JavaScript en la página').toEqual([]);
  }, { auto: true }],
});

const WEBP = Buffer.from('UklGRqQBAABXRUJQVlA4IJgBAABQFACdASqAAIAAPm00lkekIyIhKxXYAIANiWcOoC/ANcA4DFg6VONj//w/8f9WA//+RgeoB//+kA//+wJ+37v/7v+UBmgP//xA3//ozO4F8Af4D+Ae4B///QA/gH5//wAKITi9ABesCjzc1JNWP/XTRqMGQtdtQbmufzxuawSwZMFrdp0eiBGoteCLiRdH2ra2KBr7q38r3QvmoWtx7YIAaKufx5j6XHtgf5AA/v4nLv/+J6b//FMv8YqrxmEopV4zCUUq8ZhKKVeMwla//lScd/+XX/WPk1An+ZcW/k787S5xJrurgzmE3MF9apZdfstLXBRirKxcD4oVJzEKyoHBp8yF7k1IFBUArN2cD5fjhle8WEFyNpKAQtt3oRJV7UPJ3tJAPt+OGV7xYQXI2koBC23ehElWPaKIHwCBalrI344ZXvFhBcje0Yov5xIsGxA+AQLUtZG/HDK94sILkb2jFF/OJFg2IHwCBalrI344ZXvFhBcje0Yov5xIsGxA+AQLUtZG/HDK94sILkb2jFF/OJFg2IHwAAA=', 'base64');
const CORS = { 'Access-Control-Allow-Origin': '*' };

async function conLogos(context, { d = ['apple.com', 'grupoacs.com'], hay = true } = {}) {
  const pedidos = [];
  await context.route('https://raw.githubusercontent.com/**/logos/**', (r) => {
    const u = r.request().url();
    pedidos.push(u);
    if (!hay) return r.fulfill({ status: 404, headers: CORS, body: '404' });
    if (u.includes('/logos/logos.json')) return r.fulfill({ status: 200, contentType: 'application/json', headers: CORS, body: JSON.stringify({ v: 1, g: '2026-11-07', d }) });
    if (/\.webp(\?|$)/.test(u)) return r.fulfill({ status: 200, contentType: 'image/webp', headers: CORS, body: WEBP });
    return r.fulfill({ status: 404, headers: CORS, body: '404' });
  });
  return pedidos;
}
async function abrir(page) {
  await crearCuenta(page);
  await quitarCapas(page);
}

test('con el índice, el logo es el de Toisón y a Google no se le pide', async ({ page, context }) => {
  await conLogos(context);
  await abrir(page);
  const html = await page.evaluate(async () => {
    await cargarLogos();
    return [logo('apple.com', 'Apple'), logo('https://www.Apple.com/es', 'Apple'), logo('otra.com', 'Otra'), logo(null, 'Efectivo')];
  });
  for (const h of html.slice(0, 2)) {
    expect(h).toContain('/logos/apple.com.webp');
    expect(h).toContain('data-propio="1"');
    expect(h).not.toContain('google.com');
  }
  expect(html[2]).toContain('google.com/s2/favicons?domain=otra.com');       // no está en el índice: como hasta ahora
  expect(html[2]).not.toContain('data-propio');
  expect(html[3]).not.toContain('<img');                                   // sin dominio, iniciales
});

test('el logo propio se ve (128 px, clase ok) y el índice se guarda para la próxima vez', async ({ page, context }) => {
  await conLogos(context);
  await abrir(page);
  await page.evaluate(async () => {
    await cargarLogos();
    document.body.insertAdjacentHTML('beforeend', '<div id="prueba-logo" style="position:fixed;top:0;left:0;width:60px;height:60px">' + logo('grupoacs.com', 'ACS') + '</div>');
  });
  await expect(page.locator('#prueba-logo .logo-a img.ok')).toHaveCount(1, { timeout: 10_000 });
  expect(await page.locator('#prueba-logo img').evaluate((i) => i.naturalWidth)).toBe(128);
  const guardado = await page.evaluate(() => LS.get('inv-logos'));
  expect(guardado.d).toEqual(['apple.com', 'grupoacs.com']);
  // la siguiente vez ya está en la caché local: se lee sin pedirlo
  const h = await page.evaluate(() => { LOGOS = null; LOGOS = leerLogos(LS.get('inv-logos')); return logo('apple.com', 'Apple'); });
  expect(h).toContain('/logos/apple.com.webp');
});

test('los logos ya pintados con el de Google pasan al de Toisón cuando llega el índice', async ({ page, context }) => {
  await conLogos(context);
  await abrir(page);
  const antes = await page.evaluate(() => {
    LOGOS = null;
    document.body.insertAdjacentHTML('beforeend', '<div id="prueba-logo">' + logo('apple.com', 'Apple') + logo('otra.com', 'Otra') + '</div>');
    return [...document.querySelectorAll('#prueba-logo .logo-a')].map((el) => ({ d: el.dataset.d, propio: !!el.querySelector('img[data-propio]') }));
  });
  expect(antes).toEqual([{ d: 'apple.com', propio: false }, { d: 'otra.com', propio: false }]);
  // (en las pruebas lo de Google se corta y su <img> se quita solo: se mira el atributo, no la imagen)
  const despues = await page.evaluate(async () => {
    await cargarLogos();
    return [...document.querySelectorAll('#prueba-logo .logo-a')].map((el) => ({ d: el.dataset.d, src: (el.querySelector('img[data-propio]') || {}).src || null }));
  });
  expect(despues[0].src).toContain('/logos/apple.com.webp');
  expect(despues[1]).toEqual({ d: 'otra.com', src: null });
});

test('si la rama de logos aún no existe, todo sigue como antes', async ({ page, context }) => {
  const pedidos = await conLogos(context, { hay: false });
  await abrir(page);
  const h = await page.evaluate(async () => { await cargarLogos(); return { logo: logo('apple.com', 'Apple'), hay: LOGOS === null }; });
  expect(h.hay).toBe(true);
  expect(h.logo).toContain('google.com/s2/favicons?domain=apple.com');
  expect(pedidos.some((u) => u.includes('logos.json'))).toBe(true);
});

test('un índice vacío o roto no se guarda', async ({ page, context }) => {
  await conLogos(context, { d: [] });
  await abrir(page);
  const r = await page.evaluate(async () => { await cargarLogos(); return { guardado: LS.get('inv-logos'), nulo: LOGOS === null }; });
  expect(r.guardado).toBeNull();
  expect(r.nulo).toBe(true);
});
