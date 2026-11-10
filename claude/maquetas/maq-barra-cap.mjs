// Capturas de la maqueta de la barra lateral: node tests/maq-barra-cap.mjs <tema> <ancho> <modo> <variantes> [páginas]
// variantes: actual,A,B,B-abierta,B-fijada,C · páginas: hoy,rentab (las que se abren antes de montar la barra)
// ACABADO=tinte|raya|tinta (variable de entorno): el acabado plano de maq-barra-acabado.css; el nombre lleva -<acabado> al final
import { chromium } from '@playwright/test';
import { readFileSync, mkdirSync } from 'node:fs';
import { preparar, crearCuenta, quitarCapas } from './ayuda.js';
const [,, tema, ancho, modo, lista, paginas = 'hoy,rentab'] = process.argv;
const w = +ancho, dir = '/home/claude/barra/cap/';
mkdirSync(dir, { recursive: true });
const AC = process.env.ACABADO || '';
const VJS = readFileSync('tests/maq-barra.js', 'utf8'), CSS = readFileSync('tests/maq-barra.css', 'utf8') + (AC ? readFileSync('tests/maq-barra-acabado.css', 'utf8') : '');
const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const context = await browser.newContext({ viewport: { width: w, height: 860 }, deviceScaleFactor: 1.5, locale: 'es-ES' });
const errores = await preparar(context, { ajustes: { 'inv-tema': JSON.stringify(tema), 'inv-modo': JSON.stringify(modo), 'inv-empezar-no': true, 'inv-empezar-fin': true } });
const page = await context.newPage();
await crearCuenta(page);
// la cartera de prueba de siempre (23.380 €, cinco posiciones)
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
await page.addStyleTag({ content: CSS + ' #toast,.toast{display:none!important}' });
for (const pg of paginas.split(',')) {
  for (const v of lista.split(',')) {
    await quitarCapas(page);
    await page.evaluate(() => typeof quitarBarra === 'function' && quitarBarra());
    await page.evaluate((pg) => { location.hash = pg === 'hoy' ? '#hoy' : hrefPag(PAG[pg]); }, pg);
    await page.waitForTimeout(1500);
    await quitarCapas(page);
    await page.evaluate(() => { scrollTo(0, 0); pintarK2(); });
    if (!(await page.evaluate(() => typeof montarBarra === 'function'))) await page.addScriptTag({ content: VJS });
    const r = await page.evaluate(([v, ac]) => { const x = montarBarra(v); document.body.classList.remove('mb-ac', 'mb-ac-tinte', 'mb-ac-raya', 'mb-ac-tinta'); if (ac && v !== 'actual') document.body.classList.add('mb-ac', 'mb-ac-' + ac); return x; }, [v, AC]);
    await page.mouse.move(w - 40, 500);
    await page.waitForTimeout(700);
    await page.screenshot({ path: `${dir}${v}-${pg}-${tema}-${modo}-${w}${AC ? '-' + AC : ''}.png` });
    console.log(r, v, pg, tema, modo, w);
  }
}
if (errores.length) console.log('errores', errores.slice(0, 4));
await browser.close();
