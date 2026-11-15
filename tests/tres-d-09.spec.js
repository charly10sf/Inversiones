// 0.9 · El 3D y el movimiento (elegido por Carlos el 15 nov; claude/sesion-3d-15nov.md): la moneda de Hoy y el anillo del
// reparto con volumen (trozo «3d», WebGL a mano), la rueda de dígitos de la cifra, la gráfica de Hoy que se transforma y el
// paso de página con profundidad. Y lo que no puede fallar: el trozo no se baja al abrir, ni con el ahorro de datos; sin
// WebGL (o si falla) se queda lo plano; con «reducir movimiento» no se mueve nada; con los importes ocultos, el anillo no
// enseña cifras. En las pruebas el 3D no se baja ni hay movimiento salvo que se pida (inv-3d-prueba, inv-mov-prueba).
// La máquina de las pruebas puede no tener WebGL: donde hace falta, la prueba mira si lo hay y, si no, espera lo plano.
import { test as base, expect } from '@playwright/test';
import { preparar, crearCuenta, meterCartera, quitarCapas } from './ayuda.js';

// tocar algo de una vez, aunque haya salido una hoja encima o la máquina vaya lenta pintando el 3D sin tarjeta gráfica
const tocar = async (page, selector) => { await quitarCapas(page); await page.evaluate((s) => { const e = document.querySelector(s); if (!e) throw new Error('no está: ' + s); e.click(); }, selector); };

const test = base.extend({
  errores: [async ({ context }, use) => {
    const errores = await preparar(context);
    await use(errores);
    expect(errores, 'errores de JavaScript en la página').toEqual([]);
  }, { auto: true }],
});

async function abrir(page, { tresD = false, mov = false } = {}) {
  await crearCuenta(page); await meterCartera(page); await quitarCapas(page);
  await page.evaluate(([t, m]) => { LS.set('inv-empezar-no', true); LS.set('inv-empezar-fin', true); S.recienCreada = false; if (t) LS.set('inv-3d-prueba', true); if (m) LS.set('inv-mov-prueba', true); location.hash = 'cartera'; pintar(); }, [tresD, mov]);
  await quitarCapas(page);
  await expect(page.locator('#heroNum')).toBeVisible();
}
const bajar3D = async (page) => { await page.evaluate(() => pedir3D(true)); await page.waitForFunction(() => !!window.T3D, null, { timeout: 30_000 }); };
const hayGL = (page) => page.evaluate(() => { try { return !!document.createElement('canvas').getContext('webgl'); } catch (e) { return false; } });
const plana = (page) => page.evaluate(() => { const p = [document.querySelector('.navbar a.nav-centro svg.nav-med'), ...document.querySelectorAll('.riel-nav .k2-marca > i')].find((x) => x && x.getBoundingClientRect().width > 8); return p ? { op: getComputedStyle(p).opacity, r: p.getBoundingClientRect().toJSON() } : null; });
const reparto = async (page) => { await page.evaluate(() => { location.hash = hrefPag(PAG.reparto); }); await expect(page.locator('#panelAv .an3-ley button').first()).toBeVisible({ timeout: 30_000 }); };

test('el trozo del 3D no se baja al abrir en las pruebas, ni con el ahorro de datos; se queda la moneda plana', async ({ page, context }) => {
  const pedidos = []; page.on('request', (r) => { if (/assets\/3d-/.test(r.url())) pedidos.push(r.url()); });
  await context.addInitScript(() => { try { Object.defineProperty(navigator, 'connection', { configurable: true, get: () => ({ saveData: window.__ahorro === true }) }); } catch (e) { /* sin connection */ } });
  await abrir(page);
  expect(await page.evaluate(() => [tresDSi(), typeof window.T3D])).toEqual([false, 'undefined']);
  // con el ahorro de datos del móvil, ni pidiéndolo
  expect(await page.evaluate(() => { LS.set('inv-3d-prueba', true); window.__ahorro = true; pedir3D(true); return tresDSi(); })).toBe(false);
  await page.waitForTimeout(600);
  expect(pedidos).toEqual([]);
  expect((await plana(page)).op).toBe('1');
  await expect(page.locator('.t3-mon')).toHaveCount(0);
  // sin el ahorro, pidiéndolo, sí baja
  await page.evaluate(() => { window.__ahorro = false; });
  await bajar3D(page);
  expect(pedidos.length).toBe(1);
});

test('la moneda de Hoy: con el trozo, va encima del medallón (o del sello) y en su sitio', async ({ page }) => {
  await abrir(page, { tresD: true, mov: true });
  const antes = await plana(page);
  await bajar3D(page);
  await expect(page.locator('.t3-mon')).toHaveCount(1);
  if (await hayGL(page)) {
    await expect(page.locator('.t3-mon.con3d')).toHaveCount(1);
    expect((await plana(page)).op).toBe('0');   // la plana se esconde cuando la de volumen ya está pintada
    const c = await page.evaluate(() => document.querySelector('.t3-mon').getBoundingClientRect().toJSON());
    expect(Math.abs(c.left - antes.r.left) + Math.abs(c.top - antes.r.top)).toBeLessThan(2);
    expect(Math.abs(c.width - antes.r.width)).toBeLessThan(2);
    // tocarla estando en Hoy la hace girar: el cristal de detrás se estrecha con el giro
    await page.evaluate(() => { const a = [document.querySelector('.navbar a.nav-centro'), document.querySelector('.riel-nav .k2-marca')].find((x) => x && x.getBoundingClientRect().width > 8); a.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
    await expect.poll(() => page.evaluate(() => parseFloat(document.querySelector('.t3-mon').style.getPropertyValue('--t3-gx') || '1')), { timeout: 4000, intervals: [50] }).toBeLessThan(0.9);
    // sigue en su sitio después de repintar la página
    await page.evaluate(() => pintar());
    await expect(page.locator('.t3-mon.con3d')).toHaveCount(1);
  } else expect((await plana(page)).op).toBe('1');
});

test('sin WebGL (o si el 3D falla) se queda lo plano: la moneda de siempre y el anillo en SVG, sin errores', async ({ page, context }) => {
  await context.addInitScript(() => { const g = HTMLCanvasElement.prototype.getContext; HTMLCanvasElement.prototype.getContext = function (t, ...a) { return /webgl/.test(t) ? null : g.call(this, t, ...a); }; });
  await abrir(page, { tresD: true, mov: true });
  await bajar3D(page);
  await expect(page.locator('.t3-mon.con3d')).toHaveCount(0);
  expect((await plana(page)).op).toBe('1');
  await reparto(page);
  await page.waitForTimeout(1200);
  await expect(page.locator('.an3-fig.con3d')).toHaveCount(0);
  const n = await page.locator('.an3-ley button').count();
  await expect(page.locator('.an3-plano path')).toHaveCount(n);
  expect(await page.evaluate(() => getComputedStyle(document.querySelector('.an3-plano')).opacity)).toBe('1');
});

test('el anillo del reparto: se elige un trozo, se cambia de reparto y, con los importes ocultos, no enseña cifras', async ({ page }) => {
  await abrir(page, { tresD: true });
  await reparto(page);
  const filas = await page.evaluate(() => window.AN3.filas.map((x) => x.k));
  expect(filas.length).toBeGreaterThan(1);
  await expect(page.locator('.an3-ley button')).toHaveCount(filas.length);
  // los porcentajes del anillo son los de la tarjeta «Por clase de activo»
  expect(await page.evaluate(() => Math.round(window.AN3.filas.reduce((s, x) => s + x.pct, 0)))).toBe(100);
  await expect(page.locator('.an3-centro')).toContainText('Patrimonio');
  // elegir desde la lista: el centro dice cuál y cuánto; otra vez, lo suelta
  await tocar(page, '.an3-ley li:nth-child(2) button');
  await expect(page.locator('.an3-centro small')).toHaveText(filas[1]);
  await expect(page.locator('.an3-centro b')).toContainText('%');
  await expect(page.locator('.an3-ley button').nth(1)).toHaveAttribute('aria-pressed', 'true');
  await tocar(page, '.an3-ley li:nth-child(2) button');
  await expect(page.locator('.an3-centro')).toContainText('Patrimonio');
  // otro reparto: cambian las filas, se guarda, y la página no se repinta entera
  await tocar(page, '[data-an3-dim="plataforma"]');
  await expect(page.locator('[data-an3-dim="plataforma"]')).toHaveAttribute('aria-pressed', 'true');
  expect(await page.evaluate(() => [LS.get('inv-an3-dim'), window.AN3.dim, window.AN3.sel])).toEqual(['plataforma', 'plataforma', -1]);
  expect(await page.evaluate(() => window.AN3.filas.map((x) => x.k))).not.toEqual(filas);
  // el de volumen, si la máquina puede; si no, el plano
  await page.waitForFunction(() => !!window.T3D, null, { timeout: 30_000 });
  if (await hayGL(page)) await expect(page.locator('.an3-fig.con3d')).toHaveCount(1); else await expect(page.locator('.an3-plano path').first()).toBeVisible();
  // importes ocultos: ni en el centro ni al elegir hay una sola cifra; la lista conserva los porcentajes, sin euros
  await page.evaluate(() => { S.oculto = true; pintar(); });
  await expect(page.locator('.an3-ley button').first()).toBeVisible();
  await tocar(page, '.an3-ley li:first-child button');
  expect(await page.locator('.an3-centro').textContent()).not.toMatch(/\d/);
  await tocar(page, '.an3-ley li:first-child button');
  expect(await page.locator('.an3-centro').textContent()).not.toMatch(/\d/);
  await expect(page.locator('.an3-ley em')).toHaveCount(0);
  expect(await page.locator('.an3-ley').textContent()).not.toContain('€');
});

test('la cifra del patrimonio va en rueda de dígitos y sigue leyéndose como texto', async ({ page }) => {
  await abrir(page, { mov: true });
  await page.evaluate(() => { location.hash = 'posiciones'; });
  await expect(page.locator('#heroNum')).toHaveCount(0);
  await page.evaluate(() => { location.hash = 'cartera'; });
  const ent = page.locator('#heroNum [data-b="totalE"]');
  await expect(ent.locator('.rd').first()).toBeVisible();
  const t = await ent.textContent();
  expect(t).toMatch(/^\d{1,3}(\.\d{3})*$/);   // el texto de verdad está dentro: se puede leer y copiar
  expect(await ent.locator('.rd').count()).toBe(t.replace(/\D/g, '').length);
  // con un precio nuevo se quedan las mismas columnas y solo cambia el dígito
  const r = await page.evaluate(() => {
    const el = document.querySelector('#heroNum [data-b="totalE"]'), tx = el.textContent, ult = el.lastElementChild, nuevo = tx.slice(0, -1) + ((+tx.slice(-1) + 3) % 10);
    ruedaCifra(el, nuevo);
    return { mismo: el.lastElementChild === ult, txt: el.textContent, nuevo, d: ult.style.getPropertyValue('--d'), tira: getComputedStyle(ult, '::before').content.length > 10 };
  });
  expect(r.mismo).toBe(true); expect(r.txt).toBe(r.nuevo); expect(r.d).toBe(r.nuevo.slice(-1)); expect(r.tira).toBe(true);
  // con otra forma (un dígito más), se pone sin rodar y sigue siendo el texto
  expect(await page.evaluate(() => { const el = document.querySelector('#heroNum [data-b="totalE"]'); ruedaCifra(el, '1.234.567'); return el.textContent; })).toBe('1.234.567');
});

test('la gráfica de Hoy se transforma al cambiar de periodo y de pestaña, y acaba como la dibuja la app', async ({ page }) => {
  await abrir(page, { tresD: true, mov: true });
  await bajar3D(page);
  await expect(page.locator('#grafEvo svg .gh-trazo').first()).toBeAttached();
  await page.waitForTimeout(1200);
  const cambia = async (sel) => {
    await page.evaluate(() => { window.__vio = false; window.__obs && window.__obs.disconnect(); window.__obs = new MutationObserver((ms) => { for (const m of ms) if (m.target.classList && m.target.classList.contains('t3-cambia')) window.__vio = true; }); window.__obs.observe(document.querySelector('#vista'), { subtree: true, attributes: true, attributeFilter: ['class'] }); });
    await tocar(page, sel);
    await expect.poll(() => page.evaluate(() => window.__vio), { timeout: 5000 }).toBe(true);
    await expect(page.locator('#grafEvo svg.t3-cambia')).toHaveCount(0, { timeout: 5000 });   // al acabar no queda nada a medias
  };
  const rango = await page.evaluate(() => S.rango);
  await cambia(`#vista [data-rango="${rango === '3M' ? '6M' : '3M'}"]`);
  // al terminar, la línea vuelve a ser la que pinta la app (curvas, con comas), no la de viaje (rectas, con espacios)
  await page.waitForTimeout(1200);
  await expect(page.locator('#grafEvo svg.t3-cambia')).toHaveCount(0);
  expect(await page.evaluate(() => document.querySelector('#grafEvo svg .gh-trazo').getAttribute('d'))).not.toMatch(/^M-?[\d.]+ -?[\d.]+L/);
  // de Valor a Rendimiento, la línea viaja de una a otra
  await cambia('#vista [data-hpest="rend"]');
  await expect(page.locator('#grafEvo svg .hg-linea').first()).toBeAttached();
  // a Cobros: no hay línea; las barras crecen
  await tocar(page, '#vista [data-hpest="cobros"]');
  await expect(page.locator('#grafEvo svg.hg')).toBeVisible();
  await page.evaluate(() => { S.hpest = 'valor'; LS.set('inv-hoy-pest', 'valor'); });
});

test('con «reducir movimiento» todo queda quieto: sin rueda, sin giro y con el anillo ya montado', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await abrir(page, { tresD: true, mov: true });
  expect(await page.evaluate(() => conMovimiento())).toBe(false);
  await expect(page.locator('#heroNum [data-b="totalE"] .rd')).toHaveCount(0);
  await bajar3D(page);
  if (await hayGL(page)) {
    await expect(page.locator('.t3-mon.con3d')).toHaveCount(1);
    await page.evaluate(() => { const a = [document.querySelector('.navbar a.nav-centro'), document.querySelector('.riel-nav .k2-marca')].find((x) => x && x.getBoundingClientRect().width > 8); a.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
    await page.waitForTimeout(500);
    expect(await page.evaluate(() => parseFloat(document.querySelector('.t3-mon').style.getPropertyValue('--t3-gx') || '1'))).toBeGreaterThan(0.999);
  }
  // la gráfica cambia sin transformarse
  await page.evaluate(() => { window.__vio = false; new MutationObserver((ms) => { for (const m of ms) if (m.target.classList && m.target.classList.contains('t3-cambia')) window.__vio = true; }).observe(document.querySelector('#vista'), { subtree: true, attributes: true, attributeFilter: ['class'] }); });
  await tocar(page, '#vista [data-rango="3M"], #vista [data-rango="6M"]');
  await page.waitForTimeout(500);
  expect(await page.evaluate(() => window.__vio)).toBe(false);
  // el anillo plano sale entero a la primera
  await reparto(page);
  const n = await page.locator('.an3-ley button').count();
  await expect(page.locator('.an3-plano path')).toHaveCount(n);
});

test('el paso de una página a otra es «con profundidad» y, con el movimiento pedido, no deja nada a medias', async ({ page }) => {
  await abrir(page, { mov: true });
  const reglas = await page.evaluate(() => { const o = {}; for (const h of document.styleSheets) { let r; try { r = h.cssRules; } catch (e) { continue; } const mira = (rs) => { for (const x of rs) { if (x.type === CSSRule.KEYFRAMES_RULE && /^vt(Sale|Entra)$/.test(x.name)) o[x.name] = x.cssText; else if (x.cssRules) mira(x.cssRules); } }; mira(r); } return o; });
  expect(reglas.vtSale).toContain('scale('); expect(reglas.vtEntra).toContain('scale(');
  expect(reglas.vtSale).not.toContain('translateX');
  for (const h of ['av-reparto', 'cartera', 'posiciones', 'cartera']) {
    await page.evaluate((x) => { location.hash = x; }, h);
    await page.waitForTimeout(700);
  }
  await quitarCapas(page);
  await expect(page.locator('#heroNum')).toBeVisible();
  await page.waitForTimeout(800);
  expect(await page.evaluate(() => document.documentElement.classList.contains('vt'))).toBe(false);
});
