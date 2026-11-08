// 0.8.3a (sesión 3) · El básico con Rentabilidad y Riesgo sencillos (Doc del básico y el avanzado, Lucía): una cifra
// grande por tarjeta, en euros y en frases, sin siglas; Ingresos y costes, como dos tarjetas dentro de Rentabilidad.
// Las cifras, las mismas que en el avanzado (un solo cálculo, dos maneras de contarlo).
import { test as base, expect } from '@playwright/test';
import { preparar, crearCuenta, meterCartera, quitarCapas } from './ayuda.js';

const test = base.extend({
  errores: [async ({ context }, use) => {
    const errores = await preparar(context);
    await use(errores);
    expect(errores, 'errores de JavaScript en la página').toEqual([]);
  }, { auto: true }],
});
test.beforeEach(({}, info) => test.skip(info.project.name === 'movil-pequeno', 'basta con el móvil y el ordenador'));

const abrir = async (page, modo, p) => {
  await page.evaluate(([m, x]) => { ponerModo(m); location.hash = 'av-' + x; }, [modo, p]);
  // el panel nuevo, ya pintado en ese modo (con la máquina cargada, el de antes puede seguir un momento)
  await expect(page.locator(`#panelAv[data-p="${p}"]:not([aria-busy]) ${modo === 'basico' ? '.pab' : '.pav-kpi'}`).first()).toBeAttached({ timeout: 20_000 });
  await page.waitForTimeout(300);
};
const lista = async (page) => {
  await crearCuenta(page); await meterCartera(page); await quitarCapas(page);
  // con la fecha desde la que tienes cada cosa: así salen la gráfica de lo metido y la comparación con un indexado
  await page.evaluate(async () => {
    LS.set('inv-empezar-no', true); LS.set('inv-empezar-fin', true);
    for (const p of S.cartera.posiciones) p.desde = '2021-03-01';
    await guardarCartera('prueba'); location.hash = 'cartera';
  });
  await page.waitForTimeout(500); await quitarCapas(page);
};
const SIGLAS = /\b(TWR|TIR|IRR|VaR|CVaR|Sharpe|Sortino|Beta|volatilidad)\b/;

test('básico: Rentabilidad en frases, con lo que cobras y lo que te cuesta como dos tarjetas', async ({ page }) => {
  await lista(page);
  await abrir(page, 'basico', 'rentab');
  const panel = page.locator('#panelAv');
  await expect(panel.locator('.pab-cab')).toHaveText(['Lo que has ganado', 'Lo que has metido y lo que vale', '¿Y en un indexado?', 'Lo que cobrarás', 'Lo que te cuesta', 'Pregúntale a la IA']);
  await expect(panel.locator('.pab-frase')).toContainText(/Has (ganado|perdido) [\d.]+\s€/);
  await expect(panel.locator('.pab-que').first()).toContainText('¿Qué es?');
  // sin siglas en lo que se lee (la TER solo sale explicada en su «¿Qué es?»)
  const texto = (await panel.innerText()).replace(/\(su TER\)/, '');
  expect(texto).not.toMatch(SIGLAS);
  // seis pestañas y Rentabilidad marcada
  await expect(page.locator('.pest-av a[aria-current="page"]')).toHaveText('Rentabilidad');
  await expect(page.locator('#pabMetido svg')).toBeAttached();
  await expect(panel.locator('.pab-sub').first()).toContainText(/Contando cuándo metiste el dinero, un [−+-]?[\d,]+\s%\sal año/);
  await expect(panel.locator('.pav-c4 .pab-grande')).toContainText('€');
  // las preguntas abren la IA con su texto
  await expect(panel.locator('.pab-preg')).toHaveCount(3);
  await expect(panel.locator('.pab-preg').first()).toHaveAttribute('data-accion', 'asesor');
  // las mismas cifras que el avanzado (los precios en directo cambian: las dos con el mismo cálculo, a la vez)
  const [g1, g2, c1, c2] = await page.evaluate(() => {
    const M = calcular(), d = (html) => { const x = document.createElement('div'); x.innerHTML = html; return x; };
    const kpiDe = (x, t) => [...x.querySelectorAll('.pav-kpi')].find((k) => k.querySelector('small').textContent.startsWith(t)).querySelector('b').textContent;
    const bas = d(pavRentabBas(M)), av = d(pavRentab(M)), co = d(pavCostes(M));
    return [bas.querySelector('.pab-frase b').textContent, kpiDe(av, 'Total'), bas.querySelector('#pab-costes .pab-grande').firstChild.textContent, kpiDe(co, 'Al año, en euros')].map((t) => t.replace(/[^\d]/g, ''));
  });
  expect(g1).toBe(g2);
  expect(c1).toBe(c2);
});

test('básico: Riesgo con cuatro tarjetas, tres crisis y la misma cifra del mes malo que el avanzado', async ({ page }, info) => {
  await lista(page);
  await abrir(page, 'basico', 'riesgo');
  const panel = page.locator('#panelAv');
  await expect(panel.locator('.pab-cab').first()).toHaveText('Cuánto se mueve', { timeout: 15_000 });
  await expect(panel.locator('.pab-cab')).toContainText(['Cuánto se mueve', 'En un mes malo', 'Tu peor caída', 'La empresa que más pesa', 'Si pasara otra vez', 'Pregúntale a la IA']);
  await expect(panel.locator('.pab-escala i')).toHaveCount(7);
  const nivel = await panel.locator('.pab-escala i.on').count();
  await expect(panel.locator('.pav-c3').first().locator('.pab-grande')).toHaveText(`${nivel} de 7`);
  await expect(panel.locator('.pab-cr')).toHaveCount(3);
  await expect(panel.locator('.pab-cr b').first()).toHaveText('Crisis financiera');
  // cada crisis en euros y en %, en rojo si baja
  for (const v of await panel.locator('.pab-cr-v b').allInnerTexts()) expect(v).toMatch(/^[−+-]?[\d.]+\s€$/);
  expect(await panel.innerText()).not.toMatch(SIGLAS);
  // la IA tiene el detalle de estas tarjetas para «explícame esta cifra»
  expect(await page.evaluate(() => S.detAv && S.detAv.riesgo)).toContain('Modo básico');
  // en el móvil, «En un mes malo» y «Tu peor caída» van una al lado de la otra
  if (info.project.name === 'movil') {
    const [a, b] = await Promise.all([1, 2].map((i) => panel.locator('.pav-c3').nth(i).boundingBox()));
    expect(Math.abs(a.y - b.y)).toBeLessThan(2);
    expect(b.x).toBeGreaterThan(a.x + a.width - 1);
  }
  const [m1, m2] = await page.evaluate(() => {
    const M = calcular(), d = (html) => { const x = document.createElement('div'); x.innerHTML = html; return x; };
    const bas = d(pavRiesgoBas(M)), av = d(pavRiesgo(M));
    return [bas.querySelectorAll('.pav-c3')[1].querySelector('.pab-grande').textContent, [...av.querySelectorAll('.pav-kpi')].find((k) => k.querySelector('small').textContent.startsWith('VaR 95 %')).querySelector('b').textContent].map((t) => t.replace(/[^\d]/g, ''));
  });
  expect(m1).toBe(m2);
});

test('básico: Dividendos y Costes llevan a Rentabilidad y no salen sueltos en Más', async ({ page }, info) => {
  test.skip(info.project.name !== 'movil', 'una vez basta');
  await lista(page);
  await page.evaluate(() => { ponerModo('basico'); location.hash = 'av-div'; });
  await expect(page.locator('#panelAv[data-p="rentab"]')).toBeAttached();
  await expect(page.locator('#pab-div')).toBeAttached({ timeout: 15_000 });
  await expect(page.locator('.pest-av a[aria-current="page"]')).toHaveText('Rentabilidad');
  expect(await page.evaluate(() => [hrefPag(PAG.div), hrefPag(PAG.costes), paginasDe('rendimiento').map((p) => p.id).join()])).toEqual(['#av-rentab', '#av-rentab', 'rentab,analisis']);
  // en avanzado, cada una a lo suyo
  expect(await page.evaluate(() => { ponerModo('avanzado'); return [hrefPag(PAG.div), hrefPag(PAG.costes)]; })).toEqual(['#av-div', '#av-costes']);
});
