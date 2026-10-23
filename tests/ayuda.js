// Lo común de las pruebas: GrowFolio sin salir a internet. Firebase de imitación (tests/stub), los datos de verdad
// de las ramas (tests/.datos, ver traer-datos.sh), la letra desde node_modules y todo lo demás de fuera, cortado.
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const AQUI = dirname(fileURLToPath(import.meta.url));
export const DATOS = join(AQUI, '.datos');
export const BASE = process.env.GF_URL || 'http://localhost:8766/';
const LETRAS = join(AQUI, '..', 'node_modules', '@fontsource-variable', 'plus-jakarta-sans', 'files');

const LETRA = `@font-face { font-family: 'Plus Jakarta Sans'; font-style: normal; font-display: swap; font-weight: 200 800;
  src: url(https://fonts.gstatic.com/pruebas/plus-jakarta-sans-latin-wght-normal.woff2) format('woff2'); }
@font-face { font-family: 'Plus Jakarta Sans'; font-style: normal; font-display: swap; font-weight: 200 800; unicode-range: U+0100-024F;
  src: url(https://fonts.gstatic.com/pruebas/plus-jakarta-sans-latin-ext-wght-normal.woff2) format('woff2'); }`;

const TIPO = (f) => (f.endsWith('.json') ? 'application/json' : f.endsWith('.js') ? 'application/javascript' : 'text/plain');

/** Prepara un contexto de Playwright. Devuelve la lista de errores de la página (se llena sola). */
export async function preparar(context, { idioma = 'es', ajustes = {} } = {}) {
  const errores = [];
  context.__errores = errores;
  // lo de fuera que no se sirve aquí, cortado (Yahoo, Bitvavo, Gemini, el Worker, YouTube…)
  await context.route(/^https?:\/\/(?!localhost|127\.0\.0\.1)/, (r) => r.abort());
  await context.route('https://www.gstatic.com/firebasejs/**', (r) => {
    const f = r.request().url().split('/').pop().split('?')[0];
    const ruta = join(AQUI, 'stub', f);
    if (!existsSync(ruta)) return r.fulfill({ status: 404, body: '' });
    return r.fulfill({ status: 200, contentType: 'application/javascript', headers: { 'Access-Control-Allow-Origin': '*' }, body: readFileSync(ruta) });
  });
  await context.route('https://raw.githubusercontent.com/**', (r) => {
    const u = new URL(r.request().url()), p = u.pathname.split('/').slice(3); // [owner, repo, rama, ...ruta]
    const rama = p.shift(), ruta = join(DATOS, rama, ...p);
    if (!ruta.startsWith(DATOS) || !existsSync(ruta)) return r.fulfill({ status: 404, headers: { 'Access-Control-Allow-Origin': '*' }, body: '404' });
    return r.fulfill({ status: 200, contentType: TIPO(ruta), headers: { 'Access-Control-Allow-Origin': '*' }, body: readFileSync(ruta) });
  });
  await context.route('https://fonts.googleapis.com/**', (r) => r.fulfill({ status: 200, contentType: 'text/css', body: LETRA }));
  await context.route('https://fonts.gstatic.com/pruebas/**', (r) => {
    const f = join(LETRAS, r.request().url().split('/').pop());
    return existsSync(f) ? r.fulfill({ status: 200, contentType: 'font/woff2', headers: { 'Access-Control-Allow-Origin': '*' }, body: readFileSync(f) }) : r.fulfill({ status: 404, body: '' });
  });
  await context.addInitScript(({ idioma, ajustes }) => {
    try {
      if (location.protocol !== 'http:' || sessionStorage.getItem('__prep')) return;
      sessionStorage.setItem('__prep', '1');
      if (idioma === 'en') localStorage.setItem('inv-idioma', JSON.stringify('en'));
      for (const [k, v] of Object.entries(ajustes)) localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v));
    } catch (e) {}
  }, { idioma, ajustes });
  context.on('page', (pg) => vigilar(pg, errores));
  return errores;
}

export function vigilar(page, errores) {
  page.on('pageerror', (e) => errores.push('error: ' + String(e && e.message || e).slice(0, 300) + (e && e.stack ? ' @ ' + e.stack.split('\n').slice(1, 4).map((l) => l.trim()).join(' < ').slice(0, 300) : '')));
  page.on('console', (m) => {
    if (m.type() !== 'error') return;
    const t = m.text();
    // lo que se corta a propósito (red de fuera) no es un fallo de GrowFolio
    if (/net::ERR_FAILED|ERR_BLOCKED|Failed to load resource|ERR_INTERNET_DISCONNECTED|WebSocket/i.test(t)) return;
    errores.push('consola: ' + t.slice(0, 300));
  });
}

/** Quita lo que tapa la pantalla al entrar (presentación, guía, novedades) */
export async function quitarCapas(page) {
  await page.evaluate(() => {
    try { if (typeof cerrarTour === 'function') cerrarTour(); } catch (e) {}
    document.querySelectorAll('.tour, .hoja-fondo, .estreno, .intro, .nov-scroll, .ixn').forEach((x) => x.remove());
  });
}

/** Crea una cuenta de correo nueva y su cartera vacía; acaba en Inicio. */
export async function crearCuenta(page, { nombre = 'Lucía', correo = 'lucia@prueba.com', pass = 'secreta1', cartera = 'cartera-123', ruta = '' } = {}) {
  await page.goto(BASE + ruta + '#cuenta');
  await page.waitForSelector('.intro, #fCorreo', { timeout: 30000 });
  if (await page.$('.intro')) { await page.click('.intro-saltar'); }
  await page.waitForSelector('#fCorreo', { timeout: 15000 });
  if (await page.$('.cuenta-modo [data-m="crear"][aria-pressed="false"]')) await page.click('.cuenta-modo [data-m="crear"]');
  if (await page.$('#cNombre')) await page.fill('#cNombre', nombre);
  await page.fill('#cEmail', correo);
  await page.fill('#cPass', pass);
  await page.click('#bCorreo');
  await page.waitForSelector('#fBien, #fCrear', { timeout: 20000 });
  if (await page.$('#fBien')) { await page.click('#bSeguir'); await page.waitForSelector('#fCrear', { timeout: 15000 }); }
  await page.fill('#p1', cartera);
  await page.fill('#p2', cartera);
  await page.click('#bCrear');
  await page.waitForSelector('.hero-num', { timeout: 30000 });
}

/** Una cartera de ejemplo con fondos, acciones, oro, cripto y efectivo, guardada como si la hubiera metido el usuario */
export async function meterCartera(page) {
  await page.evaluate(async () => {
    const pos = [];
    const add = (instrumento, plataforma, cantidad, coste) => S.inst[instrumento] && pos.push({ id: 'p' + (pos.length + 1), instrumento, plataforma, cantidad, coste, fecha: '2025-01-10' });
    add('ishares-us', 'MyInvestor', 1000, 21800);
    add('amundi-europe', 'MyInvestor', 60, 16900);
    add('vanguard-em', 'MyInvestor', 25, 6100);
    add('nb-short', 'MyInvestor', 30, 3770);
    add('phau', 'MyInvestor', 20, 3890);
    add('repsol', 'Trade Republic', 228.61, 2901);
    add('bat', 'Trade Republic', 89.61, 3602);
    add('iag', 'Trade Republic', 652.53, 3207);
    add('btc', 'Bitvavo', 0.0583, 4870);
    S.cartera.posiciones.push(...pos);
    S.cartera.efectivo = [{ plataforma: 'Trade Republic', importe: 240.8 }];
    S.cartera.aportaciones = [{ id: 'a1', instrumento: 'ishares-us', plataforma: 'MyInvestor', importe: 600, dia: 1 }];
    await guardarCartera('prueba');
    pintar();
  });
}
