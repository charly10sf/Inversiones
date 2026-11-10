// Los diseños de Toisón: data-tema en <html> puesto antes de pintar, los tokens de cada diseño con los nombres de
// GrowFolio apuntando a ellos, las letras de la casa, el color de la barra y el selector. 0.8: sin diseño elegido,
// Mármol; el selector lo ve cualquiera en Tú y ya no hay GrowFolio.
import { test as base, expect } from '@playwright/test';
import { preparar, crearCuenta, meterCartera, quitarCapas } from './ayuda.js';

const test = base.extend({
  ajustes: [{}, { option: true }],
  errores: [async ({ context, ajustes }, use) => {
    const errores = await preparar(context, { ajustes });
    await use(errores);
    expect(errores, 'errores de JavaScript en la página').toEqual([]);
  }, { auto: true }],
});

const FONDO = { marmol: '#000000', marfil: '#ede1cc' }; // Borgoña se quitó el 7 nov
const rgb = (h) => `rgb(${[1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)).join(', ')})`;

async function leer(page) {
  return page.evaluate(async () => {
    await document.fonts.ready;
    const cs = getComputedStyle(document.body), r = getComputedStyle(document.documentElement);
    return {
      tema: document.documentElement.getAttribute('data-tema'),
      fondo: cs.backgroundColor, letra: cs.fontFamily, viejos: ['--bg', '--text', '--accent', '--plane', '--c1'].map((v) => r.getPropertyValue(v).trim()).join(''),
      barra: document.querySelector('meta[name="theme-color"]').getAttribute('content'),
      esquema: [document.querySelector('meta[name="color-scheme"]').getAttribute('content'), r.colorScheme],
      // se bajan de la casa (assets/), no de Google
      inter: (await document.fonts.load('16px Inter')).length > 0, ibarra: (await document.fonts.load('italic 16px "Ibarra Real Nova"')).length > 0,
    };
  });
}

test.describe('sin diseño elegido', () => {
  test('se abre en Mármol, sin nada de GrowFolio', async ({ page }) => {
    await crearCuenta(page); await meterCartera(page); await quitarCapas(page);
    const x = await leer(page);
    expect(x.tema).toBe('marmol');
    expect(x.fondo).toBe(rgb(FONDO.marmol));
    expect(x.barra).toBe(FONDO.marmol);
    expect(x.letra.startsWith('Inter')).toBe(true);
    await expect(page.locator(':is(.top, .riel) .marca-ts svg:visible').first()).toBeVisible();
    expect(await page.evaluate(() => [document.title, document.querySelector('link[rel="manifest"]') && 1, !!document.querySelector('link[href*="fonts.googleapis"]')])).toEqual(['Toisón', 1, false]);
    // ni la tarjeta «Muy pronto» ni el estreno de Toisón
    await expect(page.locator('.ts-tarjeta, .estreno.ts')).toHaveCount(0);
  });
});

for (const t of Object.keys(FONDO)) {
  test.describe(`diseño ${t}`, () => {
    test.use({ ajustes: { 'inv-tema': JSON.stringify(t), 'stub-dueno': 'lucia@prueba.com' } });
    test('se pone antes de pintar, con sus tokens, su letra y su barra', async ({ page }) => {
      // el atributo ya está cuando llega el primer CSS (lo pone el script de index.html)
      await page.addInitScript(() => document.addEventListener('DOMContentLoaded', () => { window.__temaAlEmpezar = document.documentElement.getAttribute('data-tema'); }));
      await crearCuenta(page); await meterCartera(page); await quitarCapas(page);
      expect(await page.evaluate(() => window.__temaAlEmpezar)).toBe(t);
      const x = await leer(page);
      expect(x.tema).toBe(t);
      expect(x.fondo).toBe(rgb(FONDO[t]));
      expect(x.barra).toBe(FONDO[t]);
      // 4 nov: el esquema de color dicho en la <meta> y en el CSS, para que el modo oscuro del móvil no repinte nada
      // 5 nov: Marfil, «light dark» (Samsung Internet no hacía caso de «only light»)
      expect(x.esquema).toEqual(t === 'marfil' ? ['light dark', 'light dark'] : ['dark', 'dark']);
      expect(x.letra.startsWith('Inter')).toBe(true);
      expect(x.inter).toBe(true);
      expect(x.ibarra).toBe(true);
      // 0.8 (5b): los nombres de GrowFolio (--bg, --text, --accent…) ya no existen: todo usa los tokens
      expect(x.viejos).toBe('');
      // la carcasa: el símbolo de Toisón en la cabecera y la cabecera sin cortar (encajarCabecera)
      await expect(page.locator(':is(.top, .riel) .marca-ts svg:visible').first()).toBeVisible();
      expect(await page.evaluate(() => { const f = document.querySelector('.fila-top'); return f.scrollWidth <= f.clientWidth + 1; })).toBe(true);
      await page.screenshot({ path: test.info().outputPath(`inicio-${t}.png`) });
    });
  });
}

test.describe('otra cuenta con un diseño guardado', () => {
  test.use({ ajustes: { 'inv-tema': JSON.stringify('marfil') } });
  test('se queda con el suyo aunque no sea el dueño', async ({ page }, info) => {
    test.skip(info.project.name !== 'movil', 'una vez basta');
    await crearCuenta(page); await meterCartera(page); await quitarCapas(page);
    await page.waitForTimeout(1500);
    expect(await page.evaluate(() => [document.documentElement.getAttribute('data-tema'), localStorage.getItem('inv-tema')])).toEqual(['marfil', '"marfil"']);
  });
});

test('el selector de diseño, en Tú para cualquiera, cambia el diseño al momento', async ({ page }, info) => {
  test.skip(info.project.name !== 'movil', 'una vez basta');
  await crearCuenta(page); await meterCartera(page); await quitarCapas(page);
  await page.evaluate(() => { S.esDueno = false; location.hash = 'tu'; pintar(); });
  // dos botones (ni rastro del de GrowFolio ni de Borgoña), con Mármol marcado
  await expect(page.locator('#vista [data-elige-tema]')).toHaveCount(2);
  await expect(page.locator('#vista [data-elige-tema=""]')).toHaveCount(0);
  await expect(page.locator('#vista [data-elige-tema="marmol"]')).toHaveAttribute('aria-pressed', 'true');
  // 4 nov: la <meta name="color-scheme"> sigue al diseño (Marfil, claro y sin dejarse oscurecer)
  const esquema = () => page.evaluate(() => document.querySelector('meta[name="color-scheme"]').content);
  expect(await esquema()).toBe('dark');
  await page.locator('#vista [data-elige-tema="marfil"]').evaluate((b) => b.click());
  expect(await page.evaluate(() => [document.documentElement.getAttribute('data-tema'), localStorage.getItem('inv-tema'), document.querySelector('meta[name="theme-color"]').content])).toEqual(['marfil', '"marfil"', '#ede1cc']);
  await expect(page.locator('#vista [data-elige-tema="marfil"]')).toHaveAttribute('aria-pressed', 'true');
  expect(await esquema()).toBe('light dark');
  await page.locator('#vista [data-elige-tema="marmol"]').evaluate((b) => b.click());
  expect(await esquema()).toBe('dark');
  // cada muestra lleva los colores de su diseño
  expect(await page.locator('.tema-muestra[data-tema="marfil"]').evaluate((i) => getComputedStyle(i).backgroundColor)).toBe(rgb(FONDO.marfil));
  // en Ajustes, el dueño ya no tiene selector aparte
  await page.evaluate(() => { S.esDueno = true; abrirAjustes(); });
  await expect(page.locator('#aAcceso')).toBeAttached();
  await expect(page.locator('.hoja-fondo [data-elige-tema]')).toHaveCount(0);
});

// 0.8 (paso 4b): la app de Android pinta el widget, los avisos y las barras con el diseño elegido. La web se lo dice
// por el puente (InversionesApp.tema) al abrir y cada vez que cambia; aquí, un puente de imitación apunta lo que recibe
test.describe('la app de Android sabe el diseño', () => {
  test.use({ ajustes: { 'inv-tema': JSON.stringify('marmol'), 'stub-dueno': 'lucia@prueba.com' } });
  test('al abrir y al cambiarlo', async ({ page }, info) => {
    test.skip(info.project.name !== 'movil', 'una vez basta');
    await page.addInitScript(() => { window.__temas = []; window.InversionesApp = { tema: (t) => window.__temas.push(t) }; });
    await crearCuenta(page); await meterCartera(page); await quitarCapas(page);
    expect((await page.evaluate(() => window.__temas))[0]).toBe('marmol');
    await page.evaluate(() => { location.hash = 'tu'; pintar(); });
    await page.locator('#vista [data-elige-tema="marfil"]').evaluate((b) => b.click());
    await page.locator('#vista [data-elige-tema="marmol"]').evaluate((b) => b.click());
    expect((await page.evaluate(() => window.__temas)).slice(-2)).toEqual(['marfil', 'marmol']);
  });
});

// 0.8.1b (5 nov, captura de Carlos): en el móvil, las pestañas de pastilla que se quedan arriba al bajar (Ideas: Lo tuyo ·
// Del radar · Lista de seguimiento) tienen fondo de verdad en cada diseño, para que el texto de debajo no se monte
test('las pestañas de pastilla que se quedan arriba tapan lo que pasa por debajo', async ({ page }, info) => {
  test.skip(info.project.name !== 'movil', 'en el móvil es donde se quedan arriba');
  await crearCuenta(page);
  await quitarCapas(page);
  await meterCartera(page);
  await page.evaluate(() => document.querySelectorAll('.hoja-fondo').forEach((h) => h.remove()));
  for (const tema of ['marmol', 'marfil']) {
    await page.evaluate((t) => { ponerTema(t); S.expTab = 'ideas'; location.hash = '#expertos'; pintar(); }, tema);
    const tabs = page.locator('.exp-tabs');
    await expect(tabs).toBeAttached({ timeout: 15_000 });
    const r = await tabs.evaluate((el) => ({ pos: getComputedStyle(el).position, fondo: getComputedStyle(el).backgroundColor }));
    expect(r.pos).toBe('sticky');
    // opaco: ni transparente ni con alfa
    expect(r.fondo).not.toMatch(/transparent|rgba\(|\/ ?0?\.\d|, 0\)$/);
  }
});

// 0.8.3, Mármol G (Carlos, 6 nov): negro AMOLED con la textura de mármol de verdad, sin las vetas dibujadas de antes, y
// las tablas en losa opaca para que las vetas nunca pasen por detrás de nombres o cifras («opción 1»)
test('Mármol G: textura de mármol en el fondo y tablas opacas; los otros diseños, sin textura', async ({ page }, info) => {
  await crearCuenta(page); await quitarCapas(page); await meterCartera(page);
  await page.evaluate(() => document.querySelectorAll('.hoja-fondo').forEach((h) => h.remove()));
  const fondoCapa = () => page.evaluate(() => {
    const c = document.getElementById('acabadoTema');
    return { img: getComputedStyle(c).backgroundImage, svg: !!c.querySelector('svg') };
  });
  await page.evaluate(() => ponerTema('marmol'));
  let x = await fondoCapa();
  expect(x.svg).toBe(false);
  // en el móvil, la textura alta; en el ordenador, la ancha (la otra no se baja)
  // (el build le pone huella: assets/marmol-g-pc-XXXX.webp)
  if (info.project.name === 'pc') expect(x.img).toContain('marmol-g-pc');
  else { expect(x.img).toContain('marmol-g'); expect(x.img).not.toContain('marmol-g-pc'); }
  // la dirección que de verdad pide la página (con el CSS en assets/, una relativa mal puesta daría 404)
  const url = /url\("?([^")]+)"?\)/.exec(x.img)[1];
  const r = await page.request.get(url);
  expect(r.ok(), url).toBe(true);
  // 0.8.3c: la del ordenador, a 2880 × 1800 para que no se estire en pantallas grandes, pesa unos 30 KB
  expect((await r.body()).length).toBeLessThan(info.project.name === 'pc' ? 40_000 : 25_000);
  // una tabla del radar: con fondo macizo, el de la losa
  await page.evaluate(() => { S.expTab = 'ideas'; location.hash = '#expertos'; pintar(); });
  const tabla = page.locator('.tabla-w').first();
  await expect(tabla).toBeAttached({ timeout: 15_000 });
  // (revisión aparte) con toHaveCSS, que vuelve a mirar si pintar() cambia la tabla por otra a mitad
  const losa = rgb(await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--superficie').trim()));
  await expect(tabla).toHaveCSS('background-color', losa);
  // una tabla suelta es losa y su columna pegajosa se pega al borde de la losa (sin franja por la que asomen cifras);
  // una dentro de una tarjeta no hace loseta sobre loseta
  await page.evaluate(() => {
    const d = document.createElement('div'); d.id = 'prueba-losas';
    d.innerHTML = '<div class="tabla-w" id="pl-suelta"><table><tr><td>a</td><td>b</td></tr></table></div>'
      + '<div class="num-sec"><div class="tabla-w" id="pl-dentro"><table><tr><td>a</td><td>b</td></tr></table></div></div>';
    document.getElementById('app').append(d);
  });
  await expect(page.locator('#pl-suelta')).toHaveCSS('background-color', losa);
  await expect(page.locator('#pl-suelta td').first()).toHaveCSS('left', '-14px');
  await expect(page.locator('#pl-dentro')).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
  await expect(page.locator('#pl-dentro')).toHaveCSS('box-shadow', 'none');
  await expect(page.locator('#pl-dentro td').first()).toHaveCSS('left', '0px');
  for (const tema of ['marfil']) {
    await page.evaluate((tt) => ponerTema(tt), tema);
    x = await fondoCapa();
    expect(x.img).not.toContain('marmol-g');
    expect(x.svg).toBe(false);
    // nada del Mármol se cuela: ni losa en las tablas ni halo en las cabeceras
    await expect(page.locator('#pl-suelta')).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
    await expect(page.locator('#pl-suelta')).toHaveCSS('box-shadow', 'none');
  }
});

// 7 nov (0.8.3b): Borgoña se quitó. Quien lo tenía guardado abre en Marfil (antes de pintar, desde el script de
// index.html) y se le guarda Marfil; ponerTema('borgona') también acaba en Marfil
test.describe('quien tenía Borgoña', () => {
  test.use({ ajustes: { 'inv-tema': JSON.stringify('borgona') } });
  test('pasa a Marfil', async ({ page }, info) => {
    test.skip(info.project.name !== 'movil', 'una vez basta');
    await page.addInitScript(() => document.addEventListener('DOMContentLoaded', () => { window.__temaAlEmpezar = document.documentElement.getAttribute('data-tema'); }));
    await crearCuenta(page); await meterCartera(page); await quitarCapas(page);
    expect(await page.evaluate(() => window.__temaAlEmpezar)).toBe('marfil');
    expect(await page.evaluate(() => [document.documentElement.getAttribute('data-tema'), localStorage.getItem('inv-tema')])).toEqual(['marfil', '"marfil"']);
    expect(await page.evaluate(() => { ponerTema('borgona'); return [document.documentElement.getAttribute('data-tema'), TEMAS.join()]; })).toEqual(['marfil', 'marmol,marfil']);
  });
});

// 7 nov (0.8.3b, Carlos): el Marfil nuevo. Crema en capas, el menú en vino con el oro del logo, las pestañas con fondo vino suave y raya
// de oro, los títulos de sección en vino con su hilo de oro y el sello de la cabecera (0.8.3a: en vino y oro sobre la crema)
test.describe('Marfil (7 nov)', () => {
  test.use({ ajustes: { 'inv-tema': JSON.stringify('marfil') } });
  test('menú en vino, pestañas con fondo suave y raya de oro y títulos con hilo de oro', async ({ page }, info) => {
    test.skip(info.project.name === 'movil-pequeno', 'basta con el móvil y el ordenador');
    await crearCuenta(page); await meterCartera(page); await quitarCapas(page);
    const tok = await page.evaluate(() => { const r = getComputedStyle(document.documentElement); return ['--fondo', '--superficie', '--menu-fondo', '--oro-hilo', '--primario', '--oro-logo'].map((n) => r.getPropertyValue(n).trim()); });
    expect(tok).toEqual(['#ede1cc', '#fdf9f2', '#3c0b16', '#c99a45', '#4e101d', '#e3b45f']);
    // el menú: lateral en el ordenador, barra de abajo en el móvil, los dos en vino
    const menu = info.project.name === 'pc' ? '.riel' : '.navbar';
    // (0.8.3b: en el móvil el vino va en el ::before de la barra, con el filo de cristal)
    const fm = await page.locator(menu).evaluate((e, pc) => getComputedStyle(e, pc ? null : '::before').backgroundColor, info.project.name === 'pc');
    // (0.8.3a: la barra del móvil es de cristal, vino al 74 % que oscurece lo de detrás; el menú del ordenador, vino opaco)
    const n = (fm.match(/[\d.]+/g) || []).map(Number).slice(0, 3);
    expect((fm.startsWith('color(') ? n.map((v) => Math.round(v * 255)) : n), fm).toEqual(info.project.name === 'pc' ? [60, 11, 22] : [52, 9, 19]);
    // el sello de la cabecera: desde la 0.8.3a, el símbolo en vino y oro sobre la crema
    await expect(page.locator('.top .marca-ts i').first()).toHaveCSS('background-color', 'rgb(253, 249, 242)');
    expect(await page.locator('.top .marca-ts').first().evaluate((e) => ['.s-o', '.s-t'].map((s) => getComputedStyle(e.querySelector(s)).fill))).toEqual(['rgb(78, 16, 29)', 'rgb(168, 122, 42)']);
    // las pestañas de Análisis (0.8.3a): en una tira de cristal; la elegida, desde la 0.8.6, plana en el vino suave
    await page.evaluate(() => { location.hash = 'analisis'; });
    // 0.8.3a: en el ordenador las pestañas de Análisis están en la segunda barra de la K2 (su acabado, con la sesión del liquid)
    if (info.project.name === 'pc') await expect(page.locator('.k2-lista a[aria-current="page"]')).toHaveText('La IA explica');
    else {
    const elegida = page.locator('.pest-av a[aria-current="page"]');
    await expect(elegida).toBeVisible({ timeout: 15_000 });
    // 0.8.6 (Carlos, 10 nov: «quitar ese 3D raro»): ya no es la lente blanca con sombra, sino plana, en el vino suave
    await expect(elegida).toHaveCSS('color', 'rgb(78, 16, 29)');
    await expect(elegida).toHaveCSS('box-shadow', 'none');
    await expect(elegida).toHaveCSS('background-image', 'none');
    }
    // un título de sección: en vino, con el hilo de oro debajo
    await page.evaluate(() => { location.hash = 'cartera'; });
    const cab = page.locator('#vista .sec-cab').first();
    await expect(cab).toBeAttached({ timeout: 15_000 });
    await expect(cab.locator('h2').first()).toHaveCSS('color', 'rgb(78, 16, 29)');
    expect(await cab.evaluate((e) => getComputedStyle(e, '::after').backgroundColor)).toBe('rgb(201, 154, 69)');
  });
});
