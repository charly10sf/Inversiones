// 0.9 · El rediseño entero (claude/encargo-rediseno-toison-entero.md): las tres pestañas nuevas (prueba de estrés, tu
// semana y tus cobros, efecto divisa), el sistema de movimiento y los tokens 2.0. La barra nueva del ordenador se prueba
// en navegacion-083a, modo-avanzado y revision-083c.
import { test as base, expect } from '@playwright/test';
import { preparar, crearCuenta, meterCartera, quitarCapas, tocar } from './ayuda.js';

const test = base.extend({
  errores: [async ({ context }, use) => {
    const errores = await preparar(context);
    await use(errores);
    expect(errores, 'errores de JavaScript en la página').toEqual([]);
  }, { auto: true }],
});

async function abrir(page, modo, pest) {
  await crearCuenta(page); await meterCartera(page); await quitarCapas(page);
  await page.evaluate(async ([m, p]) => {
    LS.set('inv-empezar-no', true); LS.set('inv-empezar-fin', true);
    await guardarCartera('prueba'); ponerModo(m); location.hash = 'av-' + p;
  }, [modo, pest]);
  await expect(page.locator(`#panelAv[data-p="${pest}"]:not([aria-busy]) .pav-t`).first()).toBeAttached({ timeout: 20_000 });
  await page.waitForTimeout(300); await quitarCapas(page);
}
// lo de la CNMV: Toisón informa y calcula; ni órdenes ni «compra»/«vende»
async function sinOrdenes(panel) {
  expect(await panel.innerText()).not.toMatch(/\b(compra|vende|comprar|vender|compres|vendas|deberías|debes|te recomendamos|garantiza)\b/i);
}
// una duración de CSS en segundos (el build pasa «180ms» a «.18s»)
const seg = (v) => { const x = String(v).trim(); return x.endsWith('ms') ? parseFloat(x) / 1000 : parseFloat(x); };
const euros = (t) => parseFloat(String(t).replace(/[^\d,−-]/g, '').replace('−', '-').replace(',', '.'));

test('prueba de estrés: las cuentas de cada crisis y de «a tu medida»', async ({ page }) => {
  await abrir(page, 'avanzado', 'estres');
  const r = await page.evaluate(() => {
    const M = S.M, out = {};
    out.total = M.total;
    out.rv = M.filas.filter((f) => f.valor > 0 && pabClase(f) === 'rv').reduce((a, f) => a + f.valor, 0);
    out.crisis = esCrisis().map((c, i) => { S.estres = { k: i, pct: 30 }; const R = estresCalc(M); return { t: c.t, cambio: R.cambio, pct: R.pct, queda: R.queda, n: R.filas.length, reales: R.pctReal, suma: R.filas.reduce((a, x) => a + x.cambio, 0), peor: R.filas[0].cambio, ult: R.filas[R.filas.length - 1].cambio }; });
    S.estres = { k: 'm', pct: 30 }; const m = estresCalc(M); out.medida = { cambio: m.cambio, noRv: m.filas.filter((x) => x.clase !== 'rv').every((x) => x.cambio === 0) };
    // la puntocom queda fuera de los 10 años de precios: todo va por su tipo de inversión
    S.estres = { k: 0, pct: 30 }; out.puntocom = estresCalc(M).filas.map((x) => [x.clase, x.pc, x.real]);
    return out;
  });
  expect(r.crisis.map((c) => c.t)).toEqual(['Burbuja puntocom', 'Crisis financiera', 'Covid', 'Tipos e inflación']);
  for (const c of r.crisis) {
    expect(c.cambio).toBeLessThan(0);
    expect(c.suma).toBeCloseTo(c.cambio, 4);
    expect(c.queda).toBeCloseTo(r.total + c.cambio, 4);
    expect(c.pct).toBeCloseTo((c.cambio / r.total) * 100, 4);
    expect(c.peor).toBeLessThanOrEqual(c.ult);   // ordenadas de la que más cae a la que menos
  }
  expect(r.medida.cambio).toBeCloseTo(-0.3 * r.rv, 4);
  expect(r.medida.noRv).toBe(true);
  for (const [clase, pc, real] of r.puntocom) { expect(real).toBe(false); expect(pc).toBe({ rv: -54, rf: 0, oro: 0, mp: 0, cripto: -70 }[clase] ?? 0); }
});

test('prueba de estrés, en pantalla: se elige la crisis, «a tu medida» y los textos', async ({ page }, info) => {
  await abrir(page, 'avanzado', 'estres');
  const panel = page.locator('#panelAv');
  await expect(panel.locator('.es-seg button')).toHaveText(['Burbuja puntocom', 'Crisis financiera', 'Covid', 'Tipos e inflación', 'A tu medida']);
  await expect(panel.locator('.es-seg button[aria-pressed="true"]')).toHaveText('Crisis financiera');
  await expect(panel.locator('.es-cifra .rotulo')).toContainText('Crisis financiera');
  const c1 = euros(await panel.locator('.es-cifra .cifra-xl').innerText());
  expect(c1).toBeLessThan(0);
  // la cifra es la suma de las filas y cuadra con «te quedaría»
  const total = await page.evaluate(() => S.M.total), datos = await panel.locator('.es-cifra .cifra-datos b').allInnerTexts();
  expect(Math.abs(euros(datos[1]) - (total + c1))).toBeLessThan(40);   // con margen: los precios en directo cambian entre una lectura y otra
  await tocar(page, '[data-estres="2"]');
  await expect(panel.locator('.es-cifra .rotulo')).toContainText('Covid');
  await expect(panel.locator('.es-hechos span')).toHaveText(['5 semanas cayendo', 'Recuperada en 2020']);
  expect(euros(await panel.locator('.es-cifra .cifra-xl').innerText())).not.toBe(c1);
  // a tu medida: sale el segundo mando y cambia la cifra
  await tocar(page, '[data-estres="m"]');
  await expect(panel.locator('[data-estres-pct]')).toHaveCount(5);
  const m30 = euros(await panel.locator('.es-cifra .cifra-xl').innerText());
  await tocar(page, '[data-estres-pct="50"]');
  await expect(panel.locator('.es-cifra .rotulo')).toContainText('50 %');
  expect(euros(await panel.locator('.es-cifra .cifra-xl').innerText())).toBeLessThan(m30);
  // la tabla de las cuatro y lo que dice la app de sí misma
  await expect(panel.locator('.pav-tabla tbody tr')).toHaveCount(4);
  await expect(panel).toContainText('No es una previsión');
  await sinOrdenes(panel);
  // está en Riesgo: en el ordenador cuelga de su sección; en el móvil, un apartado suyo
  if (info.project.name === 'pc') await expect(page.locator('.k2-lista a[aria-current="page"]')).toHaveText('Prueba de estrés');
  else await expect(page.locator('#vista')).toContainText('Prueba de estrés');
  // nada se sale del ancho
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
});

test('prueba de estrés en básico: una cifra, la frase y el «¿Qué es?»', async ({ page }) => {
  await abrir(page, 'basico', 'estres');
  const panel = page.locator('#panelAv');
  await expect(panel.locator('.pab-cab').first()).toHaveText('Si pasara otra vez');
  await expect(panel.locator('.pab-que').first()).toContainText('No es dinero perdido si no vendes');
  await expect(panel.locator('.pav-tabla')).toHaveCount(0);   // sin tablas: eso es del avanzado
  await expect(panel.locator('.pab-preg')).toHaveCount(3);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
});

test('efecto divisa: las monedas suman la cartera y el efecto sale del cambio del año', async ({ page }) => {
  await abrir(page, 'avanzado', 'divisa');
  const r = await page.evaluate(() => { const R = divisaCalc(S.M), u = dvCambio('USD'); return { total: S.M.total, suma: R.mons.reduce((a, x) => a + x.v, 0), mons: R.mons.map((x) => [x.mon, x.v, x.c ? x.c.pct : null, x.efecto]), efecto: R.efecto, usd: u && [u.a, u.b, u.pct], fuera: R.fuera, filas: R.filas.map((x) => [x.f.inst.id, x.mon, x.como]) }; });
  expect(r.suma).toBeCloseTo(r.total, 2);
  // dólares por un euro: si baja, el dólar ha subido
  expect(r.usd[2]).toBeCloseTo((r.usd[0] / r.usd[1] - 1) * 100, 6);
  const usd = r.mons.find((m) => m[0] === 'USD');
  expect(usd[3]).toBeCloseTo(usd[1] - usd[1] / (1 + usd[2] / 100), 4);
  expect(r.efecto).toBeCloseTo(r.mons.reduce((a, m) => a + (m[3] || 0), 0), 4);
  // el euro y la cripto no cuentan como «fuera del euro» ni llevan efecto
  for (const k of ['EUR', 'CRIPTO']) { const m = r.mons.find((x) => x[0] === k); if (m) expect(m[3]).toBeNull(); }
  expect(r.fuera).toBeCloseTo(r.mons.filter((m) => m[0] !== 'EUR' && m[0] !== 'CRIPTO').reduce((a, m) => a + m[1], 0), 4);
  // el S&P 500 en euros lleva el dólar por dentro; el oro que cotiza en dólares, directo
  expect(r.filas).toContainEqual(['ishares-us', 'USD', 'dentro']);
  expect(r.filas).toContainEqual(['phau', 'USD', 'directa']);
  const panel = page.locator('#panelAv');
  await expect(panel.locator('#dvGraf svg .gl-linea')).toBeAttached();
  await expect(panel.locator('.es-cifra .cifra-xl')).toContainText('≈');
  await expect(panel).toContainText('Aproximado');
  await sinOrdenes(panel);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
});

test('tu semana y tus cobros: lo de siete días, los dividendos de 60 y lo que se movió', async ({ page }, info) => {
  await abrir(page, 'avanzado', 'semana');
  const r = await page.evaluate(() => { const R = semanaCalc(S.M), fin = iso(new Date(Date.now() + 7 * 86400000)); return { n: R.semana.length, dentro: R.semana.every((e) => e.d >= R.hoy && e.d <= fin), cobros: R.cobros.map((e) => [e.tipo, e.importe]), bruto: R.bruto, neto: R.neto, ret: R.ret, mov: R.mov.map((m) => m.eur), cambio: R.cambio }; });
  expect(r.dentro).toBe(true);
  expect(r.bruto).toBeCloseTo(r.cobros.reduce((a, c) => a + c[1], 0), 4);
  expect(r.neto).toBeCloseTo(r.bruto * (1 - r.ret / 100), 4);
  expect(r.cambio).toBeCloseTo(r.mov.reduce((a, b) => a + b, 0), 4);
  expect([...r.mov].sort((a, b) => b - a)).toEqual(r.mov);
  const panel = page.locator('#panelAv');
  await expect(panel.locator('.sm-lista').first().locator('.sm-ev')).toHaveCount(r.n || 0);
  await expect(page.locator('#vista h1.ts-tit')).toHaveText('Tu semana y tus cobros');
  await expect(page.locator('#vista .vista-volver')).toHaveAttribute('href', '#hoy');
  await expect(panel).toContainText('Ni prometido ni seguro');
  await sinOrdenes(panel);
  // es una página de Hoy
  if (info.project.name === 'pc') await expect(page.locator('.k2-iconos [data-sec="hoy"]')).toHaveAttribute('aria-current', 'page');
  else await expect(page.locator('.navbar [data-ir="cartera"]')).toHaveAttribute('aria-current', 'page');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
});

test('las pestañas nuevas salen en el buscador y en inglés tienen su nombre', async ({ page }) => {
  await crearCuenta(page); await meterCartera(page); await quitarCapas(page);
  const r = await page.evaluate(() => ['estres', 'divisa', 'semana'].map((id) => [PAG[id].t, PAG[id].en, hrefPag(PAG[id]), PEST_AV.some(([k]) => k === id)]));
  expect(r).toEqual([['Prueba de estrés', 'Stress test', '#av-estres', true], ['Efecto divisa', 'Currency effect', '#av-divisa', true], ['Tu semana y tus cobros', 'Your week and your payments', '#av-semana', true]]);
});

test('movimiento: los tokens con nombre, la gráfica con trazo que se dibuja y todo quieto con «reducir movimiento»', async ({ page, context }) => {
  await abrir(page, 'avanzado', 'divisa');
  const t = await page.evaluate(() => { const cs = getComputedStyle(document.documentElement); return ['--mov-corto', '--mov-medio', '--mov-largo', '--mov-dibujo', '--curva-entrar', '--paso-escalera', '--pagina-max', '--r-t'].map((k) => cs.getPropertyValue(k).trim()); });
  expect(t.every(Boolean)).toBe(true);
  expect(t.slice(0, 4).map(seg)).toEqual([0.18, 0.28, 0.46, 0.9]);
  await expect(page.locator('#dvGraf svg .gl-linea')).toHaveAttribute('pathLength', '1');
  // en las pruebas no hay transiciones entre páginas (salvo que la prueba las pida)
  expect(await page.evaluate(() => [conMovimiento(), conTransicion()])).toEqual([false, false]);
  expect(await page.evaluate(() => { LS.set('inv-mov-prueba', true); return conMovimiento(); })).toBe(true);
  // con «reducir movimiento», las duraciones valen 0 y nada cuenta ni entra
  await page.emulateMedia({ reducedMotion: 'reduce' });
  expect(await page.evaluate(() => { const cs = getComputedStyle(document.documentElement); return [parseFloat(cs.getPropertyValue('--mov-largo')), parseFloat(cs.getPropertyValue('--mov-dibujo')), conMovimiento()]; })).toEqual([0, 0, false]);
  expect(await page.evaluate(() => getComputedStyle(document.querySelector('#dvGraf svg .gl-linea')).animationName)).toBe('none');
});

test('con transiciones pedidas, cambiar de página no deja nada a medias ni errores', async ({ page }) => {
  await abrir(page, 'avanzado', 'rentab');
  await page.evaluate(() => LS.set('inv-mov-prueba', true));
  for (const h of ['av-riesgo', 'cartera', 'av-estres', 'mercados', 'av-divisa']) {
    await page.evaluate((x) => { location.hash = x; }, h);
    await page.waitForTimeout(700);
  }
  await expect(page.locator('#panelAv[data-p="divisa"]:not([aria-busy]) .pav-t').first()).toBeAttached({ timeout: 20_000 });
  await expect.poll(() => page.evaluate(() => document.documentElement.classList.contains('vt')), { timeout: 10_000 }).toBe(false);
});
