// 0.7n: la hoja de GTA VI, más vistosa (lo pidió Carlos el 1 nov): palmeras y una ciudad al atardecer arriba, lo que
// habrían sido los 79,99 € del juego desde el primer tráiler y «Mi cartera en GTA VI» como imagen para compartir, con las
// copias solo si lo eliges (dejan adivinar cuánto tienes) y nunca con los importes ocultos
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

async function abrir(page, oculto = false) {
  await crearCuenta(page);
  await quitarCapas(page);
  await meterCartera(page);
  test.skip(!(await page.evaluate(() => gtaActivo())), 'GTA VI ya no sale');
  if (oculto) await page.evaluate(() => { S.oculto = true; });
  await page.evaluate(() => document.querySelector('[data-gta]').click());
  const g = page.locator('.gta-marco');
  await expect(g).toBeVisible();
  return g;
}

test('arriba, palmeras y una ciudad al atardecer, quietas (solo suben una vez al abrir)', async ({ page, errores }) => {
  const g = await abrir(page);
  const p = g.locator('.gta-hero .gta-paisaje');
  await expect(p.locator('svg.gta-ciudad path')).toHaveCount(2);
  await expect(p.locator('svg.gta-palma')).toHaveCount(2);
  // la ciudad, en el horizonte (su base, en la línea del horizonte) y las palmeras, a los lados
  const r = await p.evaluate((x) => {
    const c = x.querySelector('.gta-ciudad').getBoundingClientRect(), h = x.querySelector('.gta-horizonte').getBoundingClientRect(), b = x.getBoundingClientRect();
    const [iz, de] = [...x.querySelectorAll('.gta-palma')].map((e) => e.getBoundingClientRect());
    return { base: c.bottom, hz: h.top, izq: iz.left + iz.width / 2 - b.left, der: de.left + de.width / 2 - b.left, ancho: b.width };
  });
  expect(Math.abs(r.base - r.hz)).toBeLessThan(4);
  expect(r.izq).toBeLessThan(r.ancho * 0.3);
  expect(r.der).toBeGreaterThan(r.ancho * 0.7);
  // ninguna animación sin fin en las palmeras ni en la ciudad
  const sinFin = await page.evaluate(() => document.getAnimations().filter((a) => a.effect && a.effect.target && a.effect.target.closest && a.effect.target.closest('.gta-palma, .gta-ciudad') && a.effect.getComputedTiming().iterations === Infinity).length);
  expect(sinFin).toBe(0);
});

test('mientras esperabas: lo que habrían sido los 79,99 € del juego desde el primer tráiler, también con los importes ocultos', async ({ page, errores }) => {
  const g = await abrir(page);
  const D = await page.evaluate(() => desdeTrailerGTA(S.M || calcular()));
  test.skip(!D, 'sin la serie desde el primer tráiler');
  const j = g.locator('.gta-desde ~ .gta-juego, .gta-juego');
  await expect(j).toHaveCount(1);
  const esperado = (79.99 * D.v1 / D.v0).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  await expect(j.locator('p')).toContainText(`los 79,99 € del juego en lo que tienes hoy, ${D.juego >= 79.99 ? 'habrían sido' : 'se habrían quedado en'} ${esperado} €`);
  await expect(j).not.toContainText(/compra|vende|invierte|deberías/i);
  await page.keyboard.press('Escape');
  await expect(g).toHaveCount(0);
  // con los importes ocultos sigue (no deja ver cuánto tienes)
  await page.evaluate(() => { S.oculto = true; document.querySelector('[data-gta]').click(); });
  await expect(page.locator('.gta-marco .gta-juego p')).toContainText(`${esperado} €`);
});

test('«Mi cartera en GTA VI» como imagen: sin las copias de entrada, con ellas si lo eliges; se comparte como PNG', async ({ page, errores }) => {
  const g = await abrir(page);
  const b = g.locator('[data-gta-img]');
  await b.scrollIntoViewIfNeeded();
  await b.click();
  const p = g.locator('.gta-comp');
  await expect(p).toBeVisible();
  const cv = p.locator('canvas');
  expect(await cv.evaluate((c) => [c.width, c.height])).toEqual([1080, 1350]);
  const sw = p.getByRole('checkbox', { name: 'Enseñar las copias' });
  await expect(sw).not.toBeChecked();
  await expect(sw).toBeEnabled();
  // lo que lleva: sin las copias, el porcentaje y los días; con ellas, las copias
  const sin = await page.evaluate(() => datosImagenGTA(S.M || calcular(), false));
  expect(sin.copias).toBeNull();
  const con = await page.evaluate(() => datosImagenGTA(S.M || calcular(), true));
  expect(con.copias.n).toMatch(/\d/);
  // la imagen cambia al encender el interruptor
  const antes = await cv.evaluate((c) => c.toDataURL());
  await sw.check();
  await expect.poll(() => cv.evaluate((c) => c.toDataURL())).not.toBe(antes);
  // en el móvil: navigator.share con el archivo
  await page.evaluate(() => {
    window.__comp = null;
    Object.defineProperty(navigator, 'canShare', { configurable: true, value: (d) => !!(d && d.files) });
    Object.defineProperty(navigator, 'share', { configurable: true, value: (d) => { window.__comp = { n: d.files.length, tipo: d.files[0].type, nombre: d.files[0].name, peso: d.files[0].size, texto: d.text }; return Promise.resolve(); } });
  });
  await p.getByRole('button', { name: 'Compartir' }).click();
  await expect.poll(() => page.evaluate(() => window.__comp)).not.toBeNull();
  const c = await page.evaluate(() => window.__comp);
  expect(c.n).toBe(1);
  expect(c.tipo).toBe('image/png');
  expect(c.nombre).toBe('mi-cartera-en-gta-vi.png');
  expect(c.peso).toBeGreaterThan(20_000);
  expect(c.texto).toContain('Toisón');
  // en la app de Android nueva: su menú de compartir, con el PNG en base64
  await page.evaluate(() => { window.__app = null; window.InversionesApp = { compartirImagen: (b64, t) => { window.__app = { png: b64.slice(0, 8), t }; } }; });
  await p.getByRole('button', { name: 'Compartir' }).click();
  await expect.poll(() => page.evaluate(() => window.__app && window.__app.png)).toBe('iVBORw0K');
  await page.evaluate(() => { delete window.InversionesApp; });
  // Escape cierra el panel, no la hoja
  await page.keyboard.press('Escape');
  await expect(p).toHaveCount(0);
  await expect(g).toBeVisible();
});

test('con los importes ocultos, la imagen va sin copias y el interruptor no se puede encender', async ({ page, errores }) => {
  const g = await abrir(page, true);
  await g.locator('[data-gta-img]').evaluate((b) => b.click());
  const p = g.locator('.gta-comp');
  await expect(p).toBeVisible();
  await expect(p.getByRole('checkbox', { name: 'Enseñar las copias' })).toBeDisabled();
  await expect(p).toContainText('Tienes los importes ocultos');
  expect(await page.evaluate(() => datosImagenGTA(S.M || calcular(), true).copias)).toBeNull();
});

test('0.8: la cuenta atrás va con las letras de la casa; Passion One (Google Fonts) solo para la imagen de compartir', async ({ page, errores }) => {
  const g = await abrir(page);
  await expect(page.locator('link#fuenteGTA')).toHaveCount(0);
  expect(await g.locator('.gta-tit').first().evaluate((x) => getComputedStyle(x).fontFamily)).not.toMatch(/Passion One/);
  expect(await page.evaluate(() => FUENTE_NEON)).toMatch(/^"Passion One"/);
});
