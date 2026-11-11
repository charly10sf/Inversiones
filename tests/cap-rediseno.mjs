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
  // con fecha de compra, para que salgan la rentabilidad por tiempo y las gráficas (como en tests/repaso-086.spec.js)
  for (const p of S.cartera.posiciones) p.desde = '2021-03-01';
  await guardarCartera('prueba'); ponerModo(m);
}, modo);
await page.waitForTimeout(2500);
// CAP_VAR=B: la barra plegada. CAP_VAR=C: maqueta de «navegación arriba» (solo CSS encima, para enseñarla como opción)
const VAR = process.env.CAP_VAR || '';
// CAP_ACABADO=liso: el acabado liso (fondo plano y sin cajas)
if (process.env.CAP_ACABADO) await page.evaluate((a) => ponerAcabado(a), process.env.CAP_ACABADO);
if (VAR === 'B') await page.evaluate(() => plegarK2(true));
if (VAR === 'C') { await page.evaluate(() => plegarK2(true)); await page.addStyleTag({ content: `@media (min-width:1180px){
  body.nav-ts{padding-left:0!important;padding-top:118px!important}
  [data-tema] body.nav-ts .riel{flex-direction:row!important;width:auto!important;right:0;bottom:auto!important;height:60px;align-items:center;border-right:0!important;border-bottom:1px solid var(--lado-filo);padding:0 28px;gap:18px}
  [data-tema] body.nav-ts .riel .k2-iconos{flex-direction:row!important;align-items:center!important;flex:1;padding:0!important;gap:2px!important;overflow:visible}
  [data-tema] body.nav-ts.k2-plegada .riel .k2-marca{width:auto!important;height:auto!important;margin:0 18px 0 0!important}
  body.nav-ts.k2-plegada .riel .k2-nom{position:static!important;width:auto!important;height:auto!important;clip:auto!important;overflow:visible!important}
  [data-tema] body.nav-ts.k2-plegada .riel .k2-iconos>a{width:auto!important;height:38px!important;margin:0!important;padding:0 12px!important;gap:8px!important;font-size:13.5px!important}
  [data-tema] body.nav-ts.k2-plegada .riel .k2-iconos>a[aria-current="page"]::before{left:12px!important;right:12px;top:auto!important;bottom:-11px;width:auto!important;height:2px!important;margin:0!important;border-radius:2px!important}
  [data-tema] body.nav-ts.k2-plegada .riel .k2-iconos>a svg{display:none}
  [data-tema] body.nav-ts.k2-plegada .riel .k2-pie{display:none!important}
  [data-tema] body.nav-ts .k2-top{left:0!important;top:60px!important;height:58px!important}
}` }); }
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
    await page.screenshot({ path: `${dir}/${p.id}-${tema}-${modo}-${w}${VAR ? '-' + VAR : ''}.png`, fullPage: !movil ? true : true });
  } catch (e) { info[p.id] = { error: String(e).slice(0, 120) }; }
}
writeFileSync(`${dir}/_${tema}-${modo}-${w}${VAR}.json`, JSON.stringify({ info, errores: [...new Set(errores)].slice(0, 20) }, null, 1));
console.log('ok', tema, modo, w, Object.keys(info).length, 'errores', errores.length);
await browser.close();
