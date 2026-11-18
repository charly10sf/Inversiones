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
  expect(await panel.innerText()).not.toMatch(/\b(compra|vende|vendes|comprar|vender|compres|vendas|deberías|debes|conviene|te recomendamos|garantiza|should|buy|sell)\b/i);
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
    // la cartera en su peor día nunca cae más que la suma de los peores días de cada posición
    expect(c.cambio).toBeGreaterThanOrEqual(c.suma - 1e-6);
    if (c.reales === 0) expect(c.suma).toBeCloseTo(c.cambio, 4);
    expect(c.queda).toBeCloseTo(r.total + c.cambio, 4);
    expect(c.pct).toBeCloseTo((c.cambio / r.total) * 100, 4);
    expect(c.peor).toBeLessThanOrEqual(c.ult);   // ordenadas de la que más cae a la que menos
  }
  expect(r.medida.cambio).toBeCloseTo(-0.3 * r.rv, 4);
  expect(r.medida.noRv).toBe(true);
  for (const [clase, pc, real] of r.puntocom) { expect(real).toBe(false); expect(pc).toBe({ rv: -54, rf: 0, oro: 0, mp: 0, cripto: -70 }[clase] ?? 0); }
});

test('prueba de estrés: dos posiciones que tocan fondo en días distintos no suman sus mínimos', async ({ page }) => {
  await abrir(page, 'avanzado', 'estres');
  const r = await page.evaluate(() => {
    // dos inversiones de 100 €: una cae a la mitad el 25 feb y vuelve; la otra, el 10 mar. Juntas, lo peor es −50 €, no −100
    HIST_MAS.zz1 = { h: [['2020-02-18', 100], ['2020-02-25', 50], ['2020-03-10', 100], ['2020-03-30', 100]] };
    HIST_MAS.zz2 = { h: [['2020-02-18', 100], ['2020-02-25', 100], ['2020-03-10', 50], ['2020-03-30', 100]] };
    const M = { total: 200, filas: [{ valor: 100, inst: { id: 'zz1', clase: 'Renta variable', tipo: 'Acción', nombre: 'Uno' } }, { valor: 100, inst: { id: 'zz2', clase: 'Renta variable', tipo: 'Acción', nombre: 'Dos' } }] };
    const covid = esCrisis().find((c) => c.t === 'Covid'), fs = estresFilas(M, covid);
    // una tercera sin precios de entonces entra con la caída de su tipo (renta fija en covid: −5 %)
    const M2 = { total: 300, filas: [...M.filas, { valor: 100, inst: { id: 'zz3', clase: 'Renta fija', tipo: 'Fondo', nombre: 'Tres' } }] }, fs2 = estresFilas(M2, covid);
    return { total: fs.total, filas: fs.map((x) => [x.pc, x.real, x.cambio]), total2: fs2.total, rf: covid.cl.rf };
  });
  expect(r.filas).toEqual([[-50, true, -50], [-50, true, -50]]);
  expect(r.total).toBeCloseTo(-50, 6);
  expect(r.total2).toBeCloseTo(-50 + r.rf, 6);
});

test('prueba de estrés, en pantalla: se elige la crisis, «a tu medida» y los textos', async ({ page }, info) => {
  await abrir(page, 'avanzado', 'estres');
  const panel = page.locator('#panelAv');
  await expect(panel.locator('.es-seg button')).toHaveText(['Burbuja puntocom', 'Crisis financiera', 'Covid', 'Tipos e inflación', 'A tu medida']);
  await expect(panel.locator('.es-seg button[aria-pressed="true"]')).toHaveText('Crisis financiera');
  await expect(panel.locator('.es-cifra .rotulo')).toContainText('Crisis financiera');
  // la cifra cuadra con «te quedaría» y va con «≈». 15 nov: las tres cosas en la misma lectura (antes, en tres; si entre
  // medias llegaban precios y la pestaña se repintaba, se comparaban cifras de dos momentos y fallaba de vez en cuando)
  await expect(panel.locator('.es-cifra .cifra-xl')).toContainText('≈');
  const leido = await page.evaluate(() => ({ cifra: document.querySelector('#panelAv .es-cifra .cifra-xl').innerText, datos: [...document.querySelectorAll('#panelAv .es-cifra .cifra-datos b')].map((b) => b.innerText), total: S.M.total }));
  const c1 = euros(leido.cifra);
  expect(c1).toBeLessThan(0);
  expect(Math.abs(euros(leido.datos[1]) - (leido.total + c1))).toBeLessThan(40);   // el redondeo de las cifras cortas
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
  await expect(panel.locator('.pab-que').first()).toContainText('en su peor día, más o menos');
  await expect(panel.locator('.pav-tabla')).toHaveCount(0);   // sin tablas: eso es del avanzado
  await expect(panel.locator('.pab-preg')).toHaveCount(3);
  await sinOrdenes(panel);
  // las tarjetas entran en escalera al abrir la pestaña, no cada vez que se toca un botón
  await tocar(page, '[data-estres="2"]');
  await page.waitForTimeout(1300);
  await tocar(page, '[data-estres="0"]');
  expect(await page.evaluate(() => document.querySelector('#panelAv').classList.contains('entra'))).toBe(false);
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
  // con números a mano: de 1,20 a 1,00 dólares por euro, el dólar ha subido un 20 %; y el oro comprado en euros es dólar
  const m = await page.evaluate(() => {
    const antes = S.hist.mercados['EURUSD=X'];
    S.hist.mercados['EURUSD=X'] = [['2025-11-10', 1.2], ['2026-11-10', 1.0]];
    const M = { total: 300, filas: [{ valor: 100, p: { moneda: 'USD' }, inst: { id: 'q1', clase: 'Renta variable', tipo: 'Acción' } }, { valor: 100, p: { moneda: 'EUR' }, inst: { id: 'q2', clase: 'Oro', tipo: 'ETC', region: { Global: 100 } } }, { valor: 100, p: { moneda: 'EUR' }, inst: { id: 'q3', clase: 'Renta variable', tipo: 'Acción' } }] };
    const R = divisaCalc(M), out = { pct: dvCambio('USD').pct, mons: Object.fromEntries(R.mons.map((x) => [x.mon, [x.v, x.efecto]])), efecto: R.efecto, fuera: R.fuera };
    delete S.hist.mercados['EURUSD=X']; out.sinDato = divisaCalc(M).efecto;
    S.hist.mercados['EURUSD=X'] = antes;
    return out;
  });
  expect(m.pct).toBeCloseTo(20, 6);
  expect(m.mons.USD[0]).toBe(200);
  expect(m.mons.USD[1]).toBeCloseTo(200 - 200 / 1.2, 6);   // +33,33 €: lo que valdría menos si el dólar no hubiera subido
  expect(m.mons.EUR).toEqual([100, null]);
  expect(m.efecto).toBeGreaterThan(0);
  expect(m.sinDato).toBeNull();   // sin precios del cambio no se inventa un «+0 €»
  const panel = page.locator('#panelAv');
  await expect(panel.locator('#dvGraf svg .gl-linea')).toBeAttached();
  await expect(panel.locator('.es-cifra .cifra-xl')).toContainText('≈');
  await expect(panel).toContainText('Aproximado');
  await sinOrdenes(panel);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
});

test('tu semana y tus cobros: lo de siete días, los dividendos de 60 y lo que se movió', async ({ page }, info) => {
  await abrir(page, 'avanzado', 'semana');
  const r = await page.evaluate(() => { const R = semanaCalc(S.M), fin = iso(new Date(Date.now() + 7 * 86400000)); return { n: R.semana.length, dentro: R.semana.every((e) => e.d >= R.hoy && e.d <= fin), cobros: R.cobros.map((e) => [e.tipo, e.importe, e.bruto]), bruto: R.bruto, neto: R.neto, mov: R.mov.map((m) => m.eur), cambio: R.cambio }; });
  expect(r.dentro).toBe(true);
  // el importe de la agenda ya es neto (tras la retención y el tramo): no se le quita la retención otra vez
  expect(r.cobros.length).toBeGreaterThan(0);
  expect(r.neto).toBeCloseTo(r.cobros.reduce((a, c) => a + c[1], 0), 4);
  expect(r.bruto).toBeCloseTo(r.cobros.reduce((a, c) => a + c[2], 0), 4);
  for (const c of r.cobros) expect(c[2]).toBeGreaterThan(c[1]);
  expect(r.bruto).toBeGreaterThan(r.neto);
  expect(r.cambio).toBeCloseTo(r.mov.reduce((a, b) => a + b, 0), 4);
  expect([...r.mov].sort((a, b) => b - a)).toEqual(r.mov);
  const panel = page.locator('#panelAv');
  // 18 nov: con la semana vacía (pasa según el día), la primera lista es la de los cobros: se mira el aviso de semana tranquila
  if (r.n) await expect(panel.locator('.sm-lista').first().locator('.sm-ev')).toHaveCount(r.n);
  else await expect(panel).toContainText('Semana tranquila');
  await expect(page.locator('#vista h1.ts-tit')).toHaveText('Tu semana y tus cobros');
  await expect(page.locator('#vista .vista-volver')).toHaveAttribute('href', '#hoy');
  await expect(panel).toContainText('es una estimación');
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
  expect(await page.evaluate(() => conTransicion())).toBe(true);
  for (const h of ['av-riesgo', 'cartera', 'av-estres']) {
    await page.evaluate((x) => { location.hash = x; }, h);
    await page.waitForTimeout(700);
  }
  // dos seguidas, la segunda a mitad de la primera: la primera se salta sin dejar error ni la clase puesta
  await page.evaluate(() => { location.hash = 'mercados'; });
  await page.waitForTimeout(60);
  await page.evaluate(() => { location.hash = 'av-divisa'; });
  await expect(page.locator('#panelAv[data-p="divisa"]:not([aria-busy]) .pav-t').first()).toBeAttached({ timeout: 20_000 });
  await expect.poll(() => page.evaluate(() => document.documentElement.classList.contains('vt')), { timeout: 10_000 }).toBe(false);
});

test('el acabado liso: fondo plano, sin cajas, se guarda y se vuelve a la piedra', async ({ page }) => {
  await abrir(page, 'avanzado', 'estres');
  const medir = () => page.evaluate(() => {
    const t = getComputedStyle(document.querySelector('#panelAv .pav-t')), f = getComputedStyle(document.querySelector('#acabadoTema'));
    return { acabado: document.documentElement.getAttribute('data-acabado'), fondoTarjeta: t.backgroundColor, borde: t.borderLeftWidth, radio: t.borderTopLeftRadius, sombra: t.boxShadow, vetas: f.backgroundImage, guardado: LS.get('inv-acabado', null) };
  });
  const piedra = await medir();
  expect(piedra.acabado).toBeNull();
  expect(piedra.fondoTarjeta).not.toBe('rgba(0, 0, 0, 0)');
  expect(piedra.vetas).toContain('url(');
  await page.evaluate(() => ponerAcabado('liso'));
  const liso = await medir();
  expect(liso).toMatchObject({ acabado: 'liso', fondoTarjeta: 'rgba(0, 0, 0, 0)', borde: '0px', radio: '0px', sombra: 'none', vetas: 'none', guardado: 'liso' });
  // el título del bloque pasa de rótulo en mayúsculas a título
  expect(await page.evaluate(() => getComputedStyle(document.querySelector('#panelAv .pav-et')).textTransform)).toBe('none');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  // al volver a abrir sigue liso; y se puede volver
  await page.reload(); await quitarCapas(page);
  await expect.poll(() => page.evaluate(() => document.documentElement.getAttribute('data-acabado')), { timeout: 20_000 }).toBe('liso');
  await page.evaluate(() => ponerAcabado('piedra'));
  expect(await page.evaluate(() => [document.documentElement.getAttribute('data-acabado'), LS.get('inv-acabado', null)])).toEqual([null, 'piedra']);
  // el mando está en Ajustes
  expect(await page.evaluate(() => /data-acabado-b="liso"/.test(htmlSelectorAcabado()))).toBe(true);
});

// 15 nov (decidido el 13; desde la maqueta del 15 nov, el híbrido en vez del liso): sin elegir, tarjetas en el móvil e
// híbrido en el ordenador (corte de la K2, 1.180 px); lo pone ya el
// script de index.html, antes del primer pintado; «Según la pantalla» borra lo elegido y vuelve a eso
test('el acabado por defecto va con el ancho: tarjetas en el móvil, híbrido en el ordenador, y se cambia en Ajustes', async ({ page }, info) => {
  await abrir(page, 'avanzado', 'estres');
  // sin elegir (ayuda.js abre las pruebas con la piedra elegida)
  await page.evaluate(() => LS.del('inv-acabado'));
  await page.reload(); await quitarCapas(page);
  const pc = info.project.name === 'pc', porDefecto = pc ? 'hibrido' : null;
  const estado = () => page.evaluate(() => [document.documentElement.getAttribute('data-acabado'), LS.get('inv-acabado', null)]);
  expect(await estado()).toEqual([porDefecto, null]);
  // el primer pintado ya lo trae (sin esperar al JS de la app)
  expect(await page.evaluate(async () => { const h = await (await fetch(location.pathname)).text(); return /inv-acabado/.test(h) && /innerWidth>=1180/.test(h); })).toBe(true);
  // el mando de Ajustes: cuatro botones, y «Según la pantalla» marcado
  expect(await page.evaluate(() => { const d = document.createElement('div'); d.innerHTML = htmlSelectorAcabado(); return [...d.querySelectorAll('[data-acabado-b]')].map((b) => b.dataset.acabadoB + ':' + b.getAttribute('aria-pressed')); })).toEqual(['auto:true', 'piedra:false', 'hibrido:false', 'liso:false']);
  // lo elegido manda sobre el ancho y se queda al volver a abrir
  const otro = pc ? 'piedra' : 'liso';
  await page.evaluate((o) => ponerAcabado(o), otro);
  await page.reload(); await quitarCapas(page);
  await expect.poll(() => estado(), { timeout: 20_000 }).toEqual([otro === 'liso' ? 'liso' : null, otro]);
  // y «Según la pantalla» lo devuelve al de este ancho
  await page.evaluate(() => ponerAcabado('auto'));
  expect(await estado()).toEqual([porDefecto, null]);
  // sin elegir, cambia al cruzar el corte
  await page.setViewportSize(pc ? { width: 1000, height: 800 } : { width: 1300, height: 800 });
  await expect.poll(() => page.evaluate(() => document.documentElement.getAttribute('data-acabado')), { timeout: 5_000 }).toBe(pc ? null : 'hibrido');
});

// 15 nov: la cuenta atrás de GTA VI se quitó entera (su sitio será el del Paso a paso del modo fundador; de momento, nada):
// ni botón en la cabecera o en la barra de la K2, ni bloque en Hoy, ni fecha en el calendario, ni trozo, ni reglas de CSS
test('sin GTA VI: ni botón, ni bloque, ni fecha, ni trozo, ni CSS', async ({ page }) => {
  await abrir(page, 'avanzado', 'estres');
  await page.evaluate(() => { location.hash = 'cartera'; });
  await page.waitForTimeout(500);
  const r = await page.evaluate(() => ({
    dom: document.querySelectorAll('#gtaTop, [data-gta], .gta-top, .gta-chip, .car-gta').length,
    funciones: ['gtaActivo', 'pintarGtaTop', 'chipGTA', 'abrirGTA', 'avisoGTA', 'ubicarGta'].filter((f) => new Function(`return typeof ${f}`)() !== 'undefined'),
    trozo: typeof TROZOS !== 'undefined' && Object.keys(TROZOS).includes('gta'),
    bloque: Object.keys(BLOQUES_CAR).includes('gta'),
    agenda: agendaLista(S.M, 400).filter((e) => /gta/i.test(e.id + ' ' + e.t)).length,
    css: [...document.styleSheets].flatMap((h) => { try { return [...h.cssRules]; } catch (e) { return []; } }).filter((x) => /gta/i.test(x.cssText)).length,
    // lo que vivía en 48-gta.js y no era de GTA sigue
    encajar: [typeof encajarCabecera, typeof encajarMovers, typeof encajarCifra],
  }));
  expect(r).toEqual({ dom: 0, funciones: [], trozo: false, bloque: false, agenda: 0, css: 0, encajar: ['function', 'function', 'function'] });
  // un orden de Hoy guardado de antes, con el bloque de GTA, se abre sin él y sin errores
  expect(await page.evaluate(() => { const antes = S.cartera.inicio; S.cartera.inicio = { ...(antes || {}), bloques: ['patrimonio', 'gta', 'posiciones', 'reparto'] }; const v = bloquesCartera(); S.cartera.inicio = antes; return v.includes('gta'); })).toBe(false);
});

// 15 nov: las tres pestañas nuevas van en su propio trozo («nuevas», tras «avanzado»): otra pestaña del avanzado no lo baja,
// abrir una de las nuevas baja los dos (primero avanzado) y, si no llega, avisa y no se queda a medias
test('las pestañas nuevas, en su trozo: se bajan solo al abrir una, detrás del avanzado', async ({ page, context }, info) => {
  test.skip(info.project.name === 'movil-pequeno', 'en 390 y 1440');
  const pedidos = [];
  page.on('request', (r) => { const m = r.url().match(/\/assets\/(avanzado|nuevas)-[0-9a-f]+\.js$/); if (m) pedidos.push(m[1]); });
  await abrir(page, 'avanzado', 'rentab');
  expect(pedidos).toEqual(['avanzado']);
  expect(await page.evaluate(() => [typeof estresCalc, Object.keys(PAV_DE_FUERA.html).length, !!document.getElementById('nuevasCss')])).toEqual(['undefined', 0, false]);
  await page.evaluate(() => { location.hash = 'av-estres'; });
  await expect(page.locator('#panelAv[data-p="estres"]:not([aria-busy]) .es-cifra')).toBeVisible({ timeout: 20_000 });
  expect(pedidos).toEqual(['avanzado', 'nuevas']);
  expect(await page.evaluate(() => [typeof estresCalc, Object.keys(PAV_DE_FUERA.html).sort(), !!document.getElementById('nuevasCss'), TRAS.nuevas])).toEqual(['function', ['divisa', 'estres', 'semana'], true, 'avanzado']);
  // las otras dos ya no bajan nada más
  await page.evaluate(() => { location.hash = 'av-divisa'; });
  await expect(page.locator('#panelAv[data-p="divisa"]:not([aria-busy]) .pav-t').first()).toBeAttached({ timeout: 20_000 });
  expect(pedidos).toEqual(['avanzado', 'nuevas']);
});

test('si el trozo de las pestañas nuevas no llega: avisa de la versión nueva y la pestaña no se rompe', async ({ page, context }, info) => {
  test.skip(info.project.name !== 'movil', 'en el móvil');
  await context.route(/\/assets\/nuevas-[0-9a-f]+\.js$/, (r) => r.fulfill({ status: 404, body: '' }));
  await abrir(page, 'avanzado', 'rentab');
  await page.evaluate(() => { location.hash = 'av-estres'; });
  await expect(page.locator('#avisoWeb')).toBeVisible({ timeout: 20_000 });
  expect(await page.evaluate(() => [document.querySelector('#panelAv').dataset.p, typeof estresCalc, trozosEnCamino.nuevas])).toEqual(['estres', 'undefined', undefined]);
});
