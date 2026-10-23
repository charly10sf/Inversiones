// 0.7 · Las fichas de GrowIA: «Lo que pesa ahora» en la ficha de una acción (sus factores y los temas de su zona y su
// sector) y cada titular con su marca, lo importante arriba, el relleno abajo y sin repetidos. Con unas fichas de
// prueba hechas con los titulares de verdad de tests/.datos (las de verdad cambian cada 20 minutos).
import { test as base, expect } from '@playwright/test';
import { preparar, crearCuenta, meterCartera, quitarCapas, fichasDePrueba } from './ayuda.js';

const test = base.extend({
  errores: async ({ context }, use) => {
    const errores = await preparar(context);
    await use(errores);
    expect(errores, 'errores de JavaScript en la página').toEqual([]);
  },
});

test('las fichas de GrowIA: lo que pesa ahora y las noticias marcadas', async ({ page, context, errores, viewport }) => {
  const { nots, fichas } = fichasDePrueba();
  await context.route('https://raw.githubusercontent.com/**/datos/fichas.json*', (r) => r.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify(fichas) }));
  await crearCuenta(page);
  await meterCartera(page);
  await quitarCapas(page);

  // la clave de cada titular es la misma que la de la Action (calculada aquí con scripts/fichas.py)
  expect(await page.evaluate(() => ['hola', 'Ibérdrola: ¡beneficio récord! (+8,5 %)', 'Repsol sube un 3% tras el acuerdo con Pemex — 8€', 'Ñandú y señal: «comillas» y 50 €/acción'].map(claveTitular)))
    .toEqual(['b2c65197', '1c8f8911', '2ee274ca', '7cdcdb06']);

  await page.evaluate(() => { const p = S.cartera.posiciones.find((x) => x.instrumento === 'repsol'); abrirFicha(p.id, 'noticias'); });
  const filas = page.locator('.ficha-ia .factores li');
  await expect(filas).toHaveCount(3); // negocio, político y el tema de las energéticas (el de los bancos de EEUU no le toca)
  await expect(filas.nth(0)).toHaveClass(/\bup\b/);
  await expect(filas.nth(0)).toContainText('Negocio');
  await expect(filas.nth(0)).toContainText('Recompra acciones');
  await expect(filas.nth(2)).toContainText('tema');
  await expect(filas.nth(2)).toContainText('Italia');
  // lo que dice la prensa, no un consejo (revisión aparte de la 0.7)
  await expect(page.locator('.ficha-ia')).toContainText('no una recomendación');
  await expect(filas.nth(0)).toContainText('positivo para la empresa');
  // un enlace «javascript:» de la prensa no llega a la página, ni en la ficha ni en las noticias
  const malos = await page.evaluate(() => {
    S.fichas.e['REP.MC'].fa.negocio.fuentes = [{ f: 'Trampa', u: 'javascript:alert(1)' }, { f: 'EFE', u: 'https://efe.com/x' }];
    return [htmlFichaFactores('REP.MC'), htmlNoticias([{ t: 'Repsol, con trampa en el enlace', u: 'javascript:alert(1)', f: 'X', d: '2026-10-23' }])];
  });
  for (const h of malos) expect(h).not.toContain('javascript:');
  expect(malos[0]).toContain('https://efe.com/x');
  await expect(page.locator('.ficha-ia')).not.toContainText('No toca a Repsol');
  await expect(page.locator('.ficha-ia')).not.toContainText('Tampoco toca a Repsol');

  if (nots.length >= 2) {
    const lis = page.locator('.ficha .noticias li');
    // el importante, arriba y con su marca; el relleno, abajo y apagado
    await expect(lis.first().locator('a.noti')).toHaveText(nots[0].t);
    await expect(lis.first().locator('.marca.fuerte.up')).toContainText('Negocio');
    const relleno = page.locator('.ficha .noticias li.relleno');
    if (await relleno.count()) {
      await expect(relleno.last()).toBeVisible();
      expect(await page.evaluate(() => { const li = [...document.querySelectorAll('.ficha .noticias li')]; return li.findIndex((x) => x.classList.contains('relleno')) >= li.length - li.filter((x) => x.classList.contains('relleno')).length; })).toBe(true);
    }
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width + 1);

  // sin repetidos: el mismo titular de tres medios sale una vez; dos recompras con cifras distintas, dos veces
  const orden = await page.evaluate(() => ordenarNoticias([
    { t: 'Repsol dispara su beneficio por la subida del crudo', f: 'Expansión', d: '2026-10-23' },
    { t: 'Repsol dispara su beneficio gracias a la subida del crudo', f: 'Cinco Días', d: '2026-10-23' },
    { t: 'El beneficio de Repsol se dispara por la subida del crudo', f: 'EFE', d: '2026-10-22' },
    { t: 'Repsol compra 1,9 millones de acciones propias', f: 'Bolsamanía', d: '2026-10-20' },
    { t: 'Repsol compra 1,7 millones de acciones propias', f: 'Bolsamanía', d: '2026-10-13' },
  ]).map((o) => [o.n.f, o.mas]));
  expect(orden).toEqual([['Expansión', 2], ['Bolsamanía', 0], ['Bolsamanía', 0]]);
});

// en inglés los titulares llegan traducidos: la marca se busca con el titular en español (t0)
const testEn = base.extend({
  errores: async ({ context }, use) => {
    const errores = await preparar(context, { idioma: 'en' });
    await use(errores);
    expect(errores, 'errores de JavaScript en la página').toEqual([]);
  },
});
const claveTr = (s) => { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h.toString(16).padStart(8, '0') + s.length.toString(16); };
testEn('en inglés, las noticias traducidas siguen marcadas', async ({ page, context, errores }) => {
  const { nots, fichas } = fichasDePrueba();
  test.skip(!nots.length, 'sin titulares de Repsol en los datos');
  const tr = { v: 1, t: { [claveTr(nots[0].t.trim())]: 'Repsol buys back shares (EN)', [claveTr(fichas.e['REP.MC'].fa.negocio.txt)]: 'It buys back shares and pays shareholders more.' } };
  await context.route('https://raw.githubusercontent.com/**/datos/fichas.json*', (r) => r.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify(fichas) }));
  await context.route('https://raw.githubusercontent.com/**/datos/traduccion-en.json*', (r) => r.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify(tr) }));
  await crearCuenta(page);
  await meterCartera(page);
  await quitarCapas(page);
  await page.evaluate(() => cargarFichas());
  await expect.poll(() => page.evaluate(() => (S.precios.noticias.repsol || [])[0] && S.precios.noticias.repsol[0].t)).toBe('Repsol buys back shares (EN)');
  await page.evaluate(() => { const p = S.cartera.posiciones.find((x) => x.instrumento === 'repsol'); abrirFicha(p.id, 'noticias'); });
  const li = page.locator('.ficha .noticias li').filter({ hasText: 'Repsol buys back shares (EN)' });
  await expect(li.locator('.marca')).toContainText('Business');
  await expect(page.locator('.ficha-ia')).toContainText('What matters now');
  await expect(page.locator('.ficha-ia')).toContainText('It buys back shares and pays shareholders more.');
});
