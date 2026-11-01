// 0.7l: el estreno de Toisón. Lo pidió Carlos el 31 oct: a todos los que entran (nuevos o no, en el móvil, la app y el
// ordenador), una vez, que GrowFolio tiene los días contados, por algo bueno: pasa a llamarse Toisón (en noviembre, dijo
// Carlos el 1 nov). Con la marca en relieve, los dominios registrados y la marca solicitada en la OEPM.
// 0.7n: la marca sale del fondo y antes se dibuja, partes más juntas, el icono en un móvil y el botón de WhatsApp.
// 0.7o: la historia del nombre en vez de las medidas del logo (Carlos: tantas medidas no venían al caso)
import { test as base, expect } from '@playwright/test';
import { preparar, crearCuenta, meterCartera, quitarCapas, BASE } from './ayuda.js';

const test = base.extend({
  errores: async ({ context }, use) => {
    const errores = await preparar(context);
    await use(errores);
    expect(errores, 'errores de JavaScript en la página').toEqual([]);
  },
});
test.beforeEach(({}, info) => test.skip(info.project.name === 'movil-pequeno', 'en el móvil y en el ordenador'));

test('el estreno de Toisón sale una vez: la marca en relieve y, al bajar, la O áurea, las medidas y el mármol', async ({ page, errores }) => {
  await crearCuenta(page);
  await quitarCapas(page);
  await meterCartera(page);
  await page.evaluate(() => { LS.del('inv-toison-avance'); window.__siguio = 0; avisoToison(() => window.__siguio++); });
  const e = page.locator('.estreno.ts');
  await expect(e).toBeVisible();
  // 0.7m: el foco va al estreno (con el teclado se baja con las flechas y la barra)
  await expect(e).toBeFocused();
  // primero se despide GrowFolio; luego, Toisón
  await expect(e.locator('.ts-adios')).toContainText('tiene los días contados');
  await expect(e.locator('.ts-t')).toHaveText('GrowFolio tiene los días contados');
  await expect(e.locator('.ts-hero')).toContainText('pasa a llamarse Toisón');
  const logo = e.locator('.ts-hero img[alt="Toisón"]');
  await expect.poll(() => logo.evaluate((i) => i.complete && i.naturalWidth)).toBe(1120);
  await expect(e.locator('.ts-baja')).toHaveCSS('opacity', '1', { timeout: 8000 });
  // al bajar, cada sección se dibuja: --p de 0 a 1
  const secs = e.locator('[data-ts-p]');
  await expect(secs).toHaveCount(5);
  expect(await secs.first().evaluate((s) => +s.style.getPropertyValue('--p'))).toBe(0);
  // 0.7m: «Desliza hacia abajo» es un botón que baja a lo siguiente
  await e.locator('.ts-baja').click();
  await expect.poll(() => secs.first().evaluate((s) => +s.style.getPropertyValue('--p'))).toBeGreaterThan(0);
  // 0.7o: primero, de dónde viene el nombre; luego, la O áurea (sin las medidas del logo)
  await expect(secs.first()).toContainText('vellocino de oro');
  await expect(secs.nth(1)).toContainText('Áureo quiere decir «de oro»');
  await expect(e).not.toContainText('Las medidas');
  for (let i = 0; i < 5; i++) {
    await secs.nth(i).evaluate((s) => s.closest('.estreno').scrollTo(0, s.offsetTop));
    await expect.poll(() => secs.nth(i).evaluate((s) => +s.style.getPropertyValue('--p'))).toBe(1);
  }
  const marmol = e.locator('img[src="toison-marmol.webp"]');
  await expect.poll(() => marmol.evaluate((i) => i.complete && i.naturalWidth)).toBe(1120);
  const fin = secs.nth(4);
  // la marca está solicitada, no concedida: nada de «ya es nuestra»
  await expect(fin.locator('.ts-k')).toHaveText('Lo que ya está hecho');
  await expect(fin.locator('.ts-hechos')).toContainText('toison.es');
  await expect(fin.locator('.ts-hechos')).toContainText('toisonapp.com');
  await expect(fin.locator('.ts-hechos')).toContainText('Marca TOISÓN solicitada en la Oficina Española de Patentes y Marcas');
  await expect(e).not.toContainText(/compra|vende/i);
  const ok = fin.getByRole('button', { name: 'Tengo ganas de verlo' });
  await expect(ok).toHaveCSS('opacity', '1');
  expect(await page.evaluate(() => window.__siguio)).toBe(0);
  await ok.click();
  await expect(e).toHaveCount(0);
  expect(await page.evaluate(() => window.__siguio)).toBe(1);
  // la segunda vez, nada
  await page.evaluate(() => avisoToison(() => window.__siguio++));
  expect(await page.evaluate(() => window.__siguio)).toBe(2);
  await expect(page.locator('.estreno.ts')).toHaveCount(0);
});

test('con las animaciones quitadas, el estreno de Toisón sale entero y quieto', async ({ page, errores }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await crearCuenta(page);
  await quitarCapas(page);
  await meterCartera(page);
  await page.evaluate(() => { LS.del('inv-toison-avance'); avisoToison(() => {}); });
  const e = page.locator('.estreno.ts.quieta');
  await expect(e).toBeVisible();
  for (const s of await e.locator('[data-ts-p]').all()) expect(await s.evaluate((x) => x.style.getPropertyValue('--p'))).toBe('1.000');
  await expect(e.getByRole('button', { name: 'Tengo ganas de verlo' })).toHaveCSS('opacity', '1');
  // 0.7n: sin el dibujo en vector; la marca en relieve, ya a la vista; en el móvil, ya el icono de Toisón
  await expect(e.locator('.ts-vec')).toBeHidden();
  await expect(e.locator('.ts-hero img[alt="Toisón"]')).toHaveCSS('opacity', '1');
  await expect(e.locator('.ts-mia img.ts-to')).toHaveCSS('opacity', '1');
});

test('0.7n: la marca sale del fondo, sin recuadro, y antes se dibuja: la O y la T que baja hasta atravesarla', async ({ page, errores }) => {
  await crearCuenta(page);
  await quitarCapas(page);
  await meterCartera(page);
  await page.evaluate(() => { LS.del('inv-toison-avance'); avisoToison(() => {}); });
  const e = page.locator('.estreno.ts');
  await expect(e).toBeVisible();
  const marca = e.locator('.ts-hero .ts-marca');
  // sin recuadro: ni sombra ni borde, y los bordes de la imagen fundidos con una máscara
  const css = await marca.evaluate((m) => { const c = getComputedStyle(m); return { sombra: c.boxShadow, mascara: c.maskImage || c.webkitMaskImage }; });
  expect(css.sombra).toBe('none');
  expect(css.mascara).toContain('radial-gradient');
  // el símbolo en vector, con las mismas formas que el de la tarjeta
  await expect(marca.locator('.ts-vec .ts-vo')).toHaveCount(1);
  await expect(marca.locator('.ts-vec .ts-vt .ts-vtt')).toHaveCount(1);
  // se para el tiempo y se mira la T: a los 2,3 s está arriba, aún bajando; a los 3,2 s, en su sitio y rellena
  await page.evaluate(() => document.getAnimations().forEach((a) => a.pause()));
  const enT = (t) => page.evaluate((t) => {
    document.getAnimations().forEach((a) => { a.currentTime = t; });
    const tt = document.querySelector('.ts-vtt'), o = document.querySelector('.ts-vo'), img = document.querySelector('.ts-hero .ts-marca > img');
    return { t: tt.getBoundingClientRect().top, o: o.getBoundingClientRect().top, rellenoT: +getComputedStyle(tt).fillOpacity, trazoO: +getComputedStyle(o).strokeDashoffset.replace('px', ''), relieve: +getComputedStyle(img).opacity };
  }, t);
  const a = await enT(2300), b = await enT(3400), c = await enT(5000);
  expect(a.t).toBeLessThan(b.t - 20);
  expect(a.relieve).toBe(0);
  expect(b.rellenoT).toBe(1);
  expect(b.trazoO).toBe(0);
  // la barra de la T, por encima de la O (la atraviesa)
  expect(b.t).toBeLessThan(b.o);
  // y al final, el relieve
  expect(c.relieve).toBe(1);
});

test('0.7n: las partes van más juntas y cada dibujo se acaba cuando lo tienes entero delante', async ({ page, errores }) => {
  await crearCuenta(page);
  await quitarCapas(page);
  await meterCartera(page);
  await page.evaluate(() => { LS.del('inv-toison-avance'); avisoToison(() => {}); });
  const e = page.locator('.estreno.ts');
  await expect(e).toBeVisible();
  const vh = await e.evaluate((x) => x.clientHeight);
  const secs = e.locator('[data-ts-p]');
  for (let i = 0; i < 4; i++) {
    const s = secs.nth(i);
    // antes cada parte medía el 88 % de la pantalla aunque tuviera poco dentro: ahora, lo de dentro y un margen
    const hueco = await s.evaluate((x) => x.offsetHeight - (x.lastElementChild.getBoundingClientRect().bottom - x.firstElementChild.getBoundingClientRect().top));
    expect(hueco).toBeLessThan(150);
    // lo de dentro asoma por abajo: aún sin dibujar
    await s.evaluate((x) => { const d = x.closest('.estreno'); d.scrollBy(0, x.firstElementChild.getBoundingClientRect().top - d.clientHeight); });
    await expect.poll(() => s.evaluate((x) => +x.style.getPropertyValue('--p'))).toBe(0);
    // entero a la vista (lo de dentro acaba en el 88 % de la pantalla; si no cabe, arriba del todo): ya dibujado
    const alto = await s.evaluate((x) => { const d = x.closest('.estreno'), a = x.firstElementChild.getBoundingClientRect().top, h = x.lastElementChild.getBoundingClientRect().bottom - a; d.scrollBy(0, a - Math.max(d.clientHeight * 0.04, d.clientHeight * 0.88 - h)); return h; });
    await expect.poll(() => s.evaluate((x) => +x.style.getPropertyValue('--p'))).toBe(1);
    const r = await s.evaluate((x) => [x.firstElementChild.getBoundingClientRect().top, x.lastElementChild.getBoundingClientRect().bottom]);
    expect(r[0]).toBeGreaterThanOrEqual(0);
    if (alto <= vh * 0.84) expect(r[1]).toBeLessThanOrEqual(vh);
  }
});

test('0.7n: el icono de Toisón en la pantalla de inicio de un móvil y lo que falta (noviembre)', async ({ page, errores }) => {
  await crearCuenta(page);
  await quitarCapas(page);
  await meterCartera(page);
  await page.evaluate(() => { LS.del('inv-toison-avance'); avisoToison(() => {}); });
  const e = page.locator('.estreno.ts');
  const m = e.locator('.ts-s.ts-mov');
  await expect(m).toHaveCount(1);
  // apps inventadas alrededor y, en medio, GrowFolio, que pasa a Toisón
  expect(await m.locator('.ts-app:not(.ts-mia)').count()).toBeGreaterThanOrEqual(15);
  const mia = m.locator('.ts-mia');
  await expect(mia.locator('img.ts-gf')).toHaveAttribute('src', 'growfolio-192.png');
  await expect(mia.locator('b.ts-to')).toHaveText('Toisón');
  // lo que falta: sin día fijado, hasta el 1 dic «como mucho»
  const dias = await page.evaluate(() => Math.ceil((Date.parse('2026-12-01T00:00:00+01:00') - Date.now()) / 864e5));
  if (dias > 0) {
    await expect(m.locator('.ts-h')).toHaveText('Llega en noviembre');
    await expect(m.locator('.ts-falta b')).toHaveText(String(dias));
    await expect(m.locator('.ts-falta')).toContainText('como mucho');
  } else await expect(m.locator('.ts-h')).toHaveText('Llega muy pronto');
  await expect(e.locator('.ts-hero')).toContainText('En noviembre cambia de nombre');
  await expect(e).not.toContainText('diciembre');
  // al tenerlo entero a la vista, ya está el icono de Toisón (en relieve, la imagen nueva)
  await m.evaluate((x) => { const d = x.closest('.estreno'), r = x.lastElementChild.getBoundingClientRect(); d.scrollBy(0, r.bottom - d.clientHeight * 0.85); });
  await expect.poll(() => m.evaluate((x) => +x.style.getPropertyValue('--p'))).toBe(1);
  const to = mia.locator('img.ts-to');
  await expect.poll(() => to.evaluate((i) => i.complete && i.naturalWidth)).toBe(256);
  await expect(to).toHaveCSS('opacity', '1');
  await expect(mia.locator('img.ts-gf')).toHaveCSS('opacity', '0');
});

test('0.7n: «Mandarlo por WhatsApp» manda el enlace del estreno, con el menú de compartir o con wa.me', async ({ page, errores }) => {
  await crearCuenta(page);
  await quitarCapas(page);
  await meterCartera(page);
  // con el menú de compartir del móvil
  await page.evaluate(() => {
    window.__comp = null; window.__wa = null;
    Object.defineProperty(navigator, 'share', { configurable: true, value: (d) => { window.__comp = d; return Promise.resolve(); } });
    HTMLAnchorElement.prototype.click = function () { window.__wa = this.href; };
    LS.del('inv-toison-avance'); avisoToison(() => {});
  });
  const e = page.locator('.estreno.ts');
  const wa = e.getByRole('button', { name: 'Mandarlo por WhatsApp' });
  await wa.evaluate((b) => b.click());
  const d = await page.evaluate(() => window.__comp);
  expect(d.url).toMatch(/#toison$/);
  expect(d.text).toContain('en noviembre pasa a llamarse Toisón');
  // sin él (la app de Android no lo tiene): wa.me con la frase y el enlace
  await page.evaluate(() => Object.defineProperty(navigator, 'share', { configurable: true, value: undefined }));
  await wa.evaluate((b) => b.click());
  const href = await page.evaluate(() => window.__wa);
  expect(href.startsWith('https://wa.me/?text=')).toBe(true);
  const txt = decodeURIComponent(href.split('text=')[1]);
  expect(txt).toContain('Toisón');
  expect(txt).toMatch(/#toison$/);
  // el estreno sigue abierto
  await expect(e).toBeVisible();
});

test('0.7n: el enlace del estreno (#toison) lo abre a cualquiera, también sin cuenta, encima de todo', async ({ page, errores }) => {
  await page.goto(BASE + '#toison');
  const e = page.locator('.estreno.ts.ts-enlace');
  await expect(e).toBeVisible({ timeout: 20_000 });
  expect(await page.evaluate(() => location.hash)).toBe('');
  expect(await e.evaluate((x) => +getComputedStyle(x).zIndex)).toBeGreaterThan(9000);
  await page.keyboard.press('Escape');
  await expect(page.locator('.estreno.ts')).toHaveCount(0);
});

test('al entrar, también quien acaba de llegar ve el estreno de Toisón antes que nada', async ({ page, errores }) => {
  await page.addInitScript(() => { if (!sessionStorage.getItem('__ts')) { sessionStorage.setItem('__ts', '1'); localStorage.removeItem('inv-toison-avance'); } });
  await crearCuenta(page);
  await expect(page.locator('.estreno.ts')).toBeVisible({ timeout: 20_000 });
  await page.keyboard.press('Escape');
  await expect(page.locator('.estreno.ts')).toHaveCount(0);
  expect(await page.evaluate(() => !!LS.get('inv-toison-avance'))).toBe(true);
});

test('en Inicio, la tarjeta de Toisón abre el estreno entero aunque ya lo hayas visto; con la × se quita', async ({ page, errores }) => {
  await crearCuenta(page);
  await quitarCapas(page);
  await meterCartera(page);
  await page.evaluate(() => { LS.del('inv-toison-tarjeta'); location.hash = 'cartera'; pintar(); });
  const t = page.locator('.ts-tarjeta');
  await expect(t).toBeVisible();
  await expect(t).toContainText('GrowFolio pasa a llamarse Toisón');
  expect(await page.evaluate(() => !!LS.get('inv-toison-avance'))).toBe(true);
  // sin el ratón: a ratos sale encima la guía de Inicio
  await page.evaluate(() => document.querySelector('.ts-tarjeta [data-accion="toison"]').click());
  const e = page.locator('.estreno.ts');
  await expect(e).toBeVisible();
  await expect(e.locator('.ts-t')).toHaveText('GrowFolio tiene los días contados');
  await page.keyboard.press('Escape');
  await expect(e).toHaveCount(0);
  await page.evaluate(() => document.querySelector('.ts-tarjeta [data-accion="toison-fuera"]').click());
  await expect(page.locator('.ts-tarjeta')).toHaveCount(0);
  await page.evaluate(() => pintar());
  await expect(page.locator('.ts-tarjeta')).toHaveCount(0);
});

test('quitada de Inicio, la tarjeta de Toisón se ve en Ajustes: abre el estreno y se puede devolver a Inicio', async ({ page, errores }) => {
  await crearCuenta(page);
  await quitarCapas(page);
  await meterCartera(page);
  await page.evaluate(() => { LS.del('inv-toison-tarjeta'); location.hash = 'cartera'; pintar(); });
  await expect(page.locator('.car .ts-tarjeta')).toBeVisible();
  // mientras está en Inicio, en Ajustes no sale
  await page.evaluate(() => abrirAjustes());
  const aj = page.locator('.hoja[aria-label="Ajustes"]');
  await expect(aj).toBeVisible();
  await expect(aj.locator('.ts-tarjeta')).toHaveCount(0);
  await page.keyboard.press('Escape');
  await expect(aj).toHaveCount(0);
  // con la ×, fuera de Inicio, y avisa de que está en Ajustes
  await page.evaluate(() => document.querySelector('.ts-tarjeta [data-accion="toison-fuera"]').click());
  await expect(page.locator('.car .ts-tarjeta')).toHaveCount(0);
  await expect(page.locator('#toast')).toContainText('La tienes en Ajustes');
  await page.evaluate(() => abrirAjustes());
  const t = aj.locator('.ts-tarjeta');
  await expect(t).toBeVisible();
  await expect(t).toContainText('GrowFolio pasa a llamarse Toisón');
  // abre el estreno encima de Ajustes; al cerrarlo, sigues en Ajustes
  await page.evaluate(() => document.querySelector('.hoja .ts-tarjeta [data-accion="toison"]').click());
  const e = page.locator('.estreno.ts');
  await expect(e).toBeVisible();
  await expect(e.locator('.ts-t')).toHaveText('GrowFolio tiene los días contados');
  await page.keyboard.press('Escape');
  await expect(e).toHaveCount(0);
  await expect(aj).toBeVisible();
  // y vuelve a Inicio
  await page.evaluate(() => document.querySelector('.hoja .ts-tarjeta [data-accion="toison-inicio"]').click());
  await expect(aj.locator('.ts-tarjeta')).toHaveCount(0);
  await expect(page.locator('#toast')).toContainText('Vuelve a estar en Inicio');
  await page.keyboard.press('Escape');
  await expect(page.locator('.car .ts-tarjeta')).toBeVisible();
});

test('0.7o: cuenta de dónde viene el nombre, en una línea que se dibuja al bajar, y lo une con la O áurea', async ({ page, errores }) => {
  await crearCuenta(page);
  await quitarCapas(page);
  await meterCartera(page);
  await page.evaluate(() => { LS.del('inv-toison-avance'); avisoToison(() => {}); });
  const e = page.locator('.estreno.ts');
  await expect(e).toBeVisible();
  const h = e.locator('[data-ts-p]').first();
  const hitos = h.locator('.ts-hist li');
  await expect(hitos).toHaveCount(4);
  await expect(hitos.nth(0)).toContainText('Jasón y los argonautas');
  await expect(hitos.nth(1)).toContainText('1430');
  await expect(hitos.nth(1)).toContainText('Orden del Toisón de Oro');
  await expect(hitos.nth(2)).toContainText('Carlos I');
  await expect(hitos.nth(3)).toContainText('tu contraseña guarda tu cartera');
  await expect(h.locator('.ts-nota')).toHaveText('Toisón no tiene relación con la Orden del Toisón de Oro.');
  // sin dibujar mientras no se ve; entera al tenerla delante
  expect(await h.evaluate((x) => +x.style.getPropertyValue('--p'))).toBe(0);
  await expect(hitos.last()).toHaveCSS('opacity', '0');
  await h.evaluate((x) => { const d = x.closest('.estreno'), a = x.firstElementChild.getBoundingClientRect().top, alto = x.lastElementChild.getBoundingClientRect().bottom - a; d.scrollBy(0, a - Math.max(d.clientHeight * 0.04, d.clientHeight * 0.88 - alto)); });
  await expect.poll(() => h.evaluate((x) => +x.style.getPropertyValue('--p'))).toBe(1);
  for (const li of await hitos.all()) await expect(li).toHaveCSS('opacity', '1');
  // la O áurea, desde el oro; nada de medidas del logo
  await expect(e.locator('[data-ts-p]').nth(1)).toContainText('Oro en el mito, oro en la orden y oro en la O.');
  await expect(e.locator('.ts-cotas, .ts-med')).toHaveCount(0);
  // el texto de debajo del mármol, con aire (iba pegado a la imagen)
  const m = e.locator('[data-ts-p]').nth(2);
  await m.evaluate((x) => x.closest('.estreno').scrollBy(0, x.getBoundingClientRect().top - 60));
  await expect.poll(() => m.evaluate((x) => x.querySelector('.ts-marmol + .ts-p').getBoundingClientRect().top - x.querySelector('.ts-marmol').getBoundingClientRect().bottom)).toBeGreaterThanOrEqual(14);
  await expect(e).not.toContainText(/\d+,\d u\b/);
});

// 0.7q: desde el estreno, un botón que abre la web de Toisón (toison.es) fuera de la app (lo pidió Carlos el 1 nov)
test('el estreno tiene un botón que lleva a toison.es, en otra pestaña y sin pasar por el cierre', async ({ page, errores }) => {
  await crearCuenta(page);
  await quitarCapas(page);
  await meterCartera(page);
  await page.evaluate(() => { LS.del('inv-toison-avance'); avisoToison(() => {}); });
  const web = page.locator('.estreno.ts a.ts-web');
  await expect(web).toHaveCount(1);
  await expect(web).toHaveAttribute('href', 'https://toison.es');
  await expect(web).toHaveAttribute('target', '_blank');
  await expect(web).toHaveAttribute('rel', /noopener/);
  // pulsarlo no cierra el estreno
  await web.evaluate((a) => a.addEventListener('click', (e) => e.preventDefault(), { once: true }));
  await web.click({ force: true });
  await expect(page.locator('.estreno.ts')).toBeVisible();
});
