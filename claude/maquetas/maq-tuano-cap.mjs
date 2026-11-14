// Capturas de la maqueta de Tu año: node tests/maq-tuano-cap.mjs <tema> <ancho> <modo>
// Por cada letra (A, B, C): la página entera (solo A) y cada tarjeta suelta. En el móvil, además, dos tarjetas en «una por pantalla».
import { chromium } from '@playwright/test';
import { readFileSync, mkdirSync } from 'node:fs';
import { preparar, crearCuenta, quitarCapas } from './ayuda.js';
const [,, tema, ancho, modo, letras = 'A,B,C'] = process.argv;
const ELEGIDO = { estilo: 'A', aport: 'A', edad: 'B', paises: 'A', costes: 'B', divid: 'D', meses: 'A' };
const w = +ancho, movil = w < 600, dir = '/home/claude/maq-ta/';
mkdirSync(dir, { recursive: true });
const VJS = readFileSync('tests/maq-tuano.js', 'utf8'), CSS = readFileSync('tests/maq.css', 'utf8') + readFileSync('tests/maq-tuano.css', 'utf8');
const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const context = await browser.newContext({ viewport: { width: w, height: movil ? 844 : 900 }, deviceScaleFactor: movil ? 2 : 1.5, isMobile: movil, hasTouch: movil, locale: 'es-ES' });
const errores = await preparar(context, { ajustes: { 'inv-tema': JSON.stringify(tema), 'inv-modo': JSON.stringify(modo), 'inv-empezar-no': true, 'inv-empezar-fin': true } });
const page = await context.newPage();
await crearCuenta(page);
await page.evaluate(async () => {
  const pos = [];
  const add = (i, pl, f) => S.inst[i] && pos.push({ id: 'p' + (pos.length + 1), instrumento: i, plataforma: pl, cantidad: 1, coste: 1, fecha: f });
  add('fidelity-world', 'MyInvestor', '2023-03-06'); add('vanguard-em', 'MyInvestor', '2023-09-04'); add('phau', 'Trade Republic', '2024-02-05'); add('repsol', 'Trade Republic', '2024-05-13'); add('btc', 'Bitvavo', '2024-01-22');
  const eur = [11240, 3180, 2850, 3960, 2150], g = [16, 6, 24, 9, 41];
  pos.forEach((p, i) => { const pr = precioInst(p.instrumento); p.cantidad = Math.round(eur[i] / pr * 1e6) / 1e6; p.coste = Math.round(p.cantidad * pr / (1 + g[i] / 100) * 100) / 100; });
  S.cartera.posiciones.push(...pos); S.cartera.efectivo = [{ plataforma: 'Trade Republic', importe: 240 }];
  await guardarCartera('prueba'); pintar();
});
await page.waitForTimeout(3500);
const montar = async (arg) => {
  await quitarCapas(page);
  await page.evaluate(() => { location.hash = '#hoy'; }); await page.waitForTimeout(300);
  await page.evaluate(() => { location.hash = hrefPag(PAG.rentab); }); await page.waitForTimeout(1500);
  await quitarCapas(page);
  await page.addScriptTag({ content: VJS }); await page.addStyleTag({ content: CSS + ' #toast,.toast{display:none!important}' });
  await page.evaluate((a) => montarTuAno(a), arg);
  await page.waitForTimeout(600);
};
const ops = await page.evaluate(() => null) ;
for (const L of letras.split(',')) {
  const op = {}; for (const k of ['estilo', 'aport', 'edad', 'paises', 'costes', 'divid', 'meses']) op[k] = L === 'E' ? ELEGIDO[k] : L;
  await montar({ op, comp: L === 'B' ? 'c' : 'v' });
  const hh = await page.evaluate(() => Math.max(document.documentElement.scrollHeight, document.body.scrollHeight));
  await page.setViewportSize({ width: w, height: Math.min(hh, 6000) }); await page.waitForTimeout(500);
  if (L === 'A') await page.screenshot({ path: `${dir}pagina-${tema}-${w}.png` });
  if (L === 'E') { await page.screenshot({ path: `${dir}elegido-${tema}-${w}.png` }); await page.setViewportSize({ width: w, height: movil ? 844 : 900 }); continue; }
  const tiene = await page.evaluate(() => TA_OPS);
  for (const k of [...Object.keys(tiene), 'comp']) {
    if (k !== 'comp' && !tiene[k].includes(L)) continue;
    if (k === 'comp' && (L === 'C' || L === 'D')) continue;
    await page.locator(`[data-ta="${k}"]`).screenshot({ path: `${dir}${k}-${L}-${tema}-${w}.png` });
  }
  await page.setViewportSize({ width: w, height: movil ? 844 : 900 });
  console.log('ok', L, tema, w);
}
if (movil && letras.includes('E')) for (const k of ['estilo', 'aport', 'edad', 'paises', 'costes', 'divid', 'meses']) {
  await montar({ op: ELEGIDO, historia: k });
  await page.screenshot({ path: `${dir}hist-el-${k}-${tema}-${w}.png` });
  console.log('ok historia elegida', k);
}
if (movil && letras.includes('A')) for (const k of ['estilo', 'edad']) {
  await montar({ op: {}, historia: k });
  await page.screenshot({ path: `${dir}historia-${k}-${tema}-${w}.png` });
  console.log('ok historia', k);
}
if (errores.length) console.log('errores', errores.slice(0, 4));
await browser.close();
