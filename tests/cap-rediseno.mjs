// Capturas de todas las páginas (rediseño 0.9): node tests/cap-rediseno.mjs <marmol|marfil> <390|1440> <basico|avanzado> <carpeta> [ids,…]
// Con la cartera de prueba de ayuda.js. No es una prueba: es para mirar a ojo el antes y el después.
import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { preparar, crearCuenta, meterCartera, quitarCapas } from './ayuda.js';
const [,, tema = 'marmol', ancho = '1440', modo = 'avanzado', dir = '/home/claude/cap/antes', lista = ''] = process.argv;
const w = +ancho, movil = w < 600;
mkdirSync(dir, { recursive: true });
const browser = await chromium.launch({ args: ['--no-sandbox'] });
const context = await browser.newContext({ viewport: { width: w, height: movil ? 844 : 900 }, deviceScaleFactor: movil ? 2 : 1, isMobile: movil, hasTouch: movil, locale: 'es-ES', reducedMotion: process.env.CAP_MOV ? 'no-preference' : 'reduce' });
const errores = await preparar(context, { ajustes: { 'inv-tema': JSON.stringify(tema), 'inv-empezar-no': true, 'inv-empezar-fin': true } });
const page = await context.newPage();
await crearCuenta(page);
await meterCartera(page);
await quitarCapas(page);
await page.evaluate(async (m) => {
  LS.set('inv-empezar-no', true); LS.set('inv-empezar-fin', true); LS.set('inv-dueno', 0); S.esDueno = false; S.noDueno = true;
  for (const p of S.cartera.posiciones) p.desde = '2021-03-01';
  await guardarCartera('prueba'); ponerModo(m);
}, modo);
await page.waitForTimeout(2500);
const pags = await page.evaluate(() => PAGINAS.filter((p) => enLista(p)).map((p) => ({ id: p.id, h: hrefPag(p) })));
const quiero = lista ? lista.split(',') : null, info = {};
for (const p of pags) {
  if (quiero && !quiero.includes(p.id)) continue;
  try {
    await page.evaluate((h) => { location.hash = h; }, p.h);
    await page.waitForTimeout(p.id === 'hoy' ? 1200 : 2200);
    await quitarCapas(page);
    await page.addStyleTag({ content: '#toast,.toast{display:none!important}' });
    const m = await page.evaluate(() => { const c = document.querySelector('#vista') || document.querySelector('main'); const r = c ? c.getBoundingClientRect() : { left: 0, right: 0 }; return { x0: Math.round(r.left), x1: Math.round(r.right), alto: document.documentElement.scrollHeight, desborde: document.documentElement.scrollWidth > innerWidth + 1 }; });
    info[p.id] = m;
    await page.screenshot({ path: `${dir}/${p.id}-${tema}-${modo}-${w}.png`, fullPage: !movil ? true : true });
  } catch (e) { info[p.id] = { error: String(e).slice(0, 120) }; }
}
writeFileSync(`${dir}/_${tema}-${modo}-${w}.json`, JSON.stringify({ info, errores: [...new Set(errores)].slice(0, 20) }, null, 1));
console.log('ok', tema, modo, w, Object.keys(info).length, 'errores', errores.length);
await browser.close();
