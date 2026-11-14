// 0.8.6 · Lista de seguimiento (Ideas, tercera pestaña; claude/encargo-pestana-1-lista.md). Una prueba por cada cosa:
// el conmutador Tabla | Tarjetas que se recuerda, las 10 empresas como tope sin Toisón Dorado, el panel de la fila marcada,
// el móvil solo con tabla, el tono de cada noticia (Neutral si falta o es mixto), las listas y la columna PER con candado,
// y los textos sin «compra» ni «vende». Con las empresas del radar de verdad (tests/.datos) y la IA con datos de prueba.
import { test as base, expect } from '@playwright/test';
import { preparar, crearCuenta, meterCartera, quitarCapas } from './ayuda.js';

const test = base.extend({
  errores: [async ({ context }, use) => {
    const errores = await preparar(context);
    await use(errores);
    expect(errores, 'errores de JavaScript en la página').toEqual([]);
  }, { auto: true }],
});
const esPc = (info) => info.project.name === 'pc';
const omitirPequeno = (info) => test.skip(info.project.name === 'movil-pequeno', 'basta con el móvil y el ordenador');

/* la cuenta de prueba con n empresas del radar seguidas; la IA, con una lectura de prueba por empresa:
   0 positivo, 1 negativo, 2 neutral, 3 mixto, 4 sin tono, 5 sin lectura */
async function conLista(page, { n = 6, modo = 'avanzado', dueno = false } = {}) {
  await crearCuenta(page); await meterCartera(page); await quitarCapas(page);
  await page.waitForFunction(() => S.radar && S.radar.valores && S.radar.valores.length > 30 && S.escaneo, null, { timeout: 30_000 });
  await page.evaluate(({ n, modo, dueno }) => {
    LS.set('inv-empezar-no', true); LS.set('inv-empezar-fin', true);
    if (dueno) { LS.set('inv-dueno', 1); S.esDueno = true; } else { LS.set('inv-dueno', 0); S.esDueno = false; S.noDueno = true; }
    ponerModo(modo);
    const xs = S.radar.valores.filter((x) => x.pe > 0 && x.p > 0).slice(0, 14);
    S.cartera.siguiendo = xs.slice(0, n).map((x) => ({ s: x.s, n: nombreRadar(x), desde: hoyIso(), p0: +x.pe }));
    delete S.cartera.listasSeg;
    S.informe = null;
    S.escaneo.lectura = S.escaneo.lectura || {};
    const imp = ['positivo', 'negativo', 'neutral', 'mixto', undefined];
    xs.slice(0, 5).forEach((x, i) => { S.escaneo.lectura[x.s] = { d: new Date().toISOString(), imp: imp[i], rel: 3 - (i % 3), txt: `Noticia de prueba ${i} de ${nombreRadar(x)}.`, cat: '', fuentes: [] }; });
    delete S.escaneo.lectura[xs[5].s];
    // lo que viene: resultados dentro de 12 días y un ex-dividendo dentro de 20
    const f = (d) => iso(new Date(Date.now() + d * 864e5));
    xs[0].rd = f(12); xs[1].xd = f(20);
    S.expTab = 'siguiendo'; S.segLista = 'mi'; S.segSel = null; LS.set('inv-lista-vista', 'tabla');
    location.hash = '#expertos'; pintar();
  }, { n, modo, dueno });
  await page.waitForSelector('#segRaiz .ls-lista', { timeout: 15_000 });
  await quitarCapas(page);
}
const textoLista = (page) => page.locator('#segRaiz').innerText();

test('la pestaña se llama Lista de seguimiento y el contador dice cuántas llevas de 10', async ({ page }, info) => {
  omitirPequeno(info);
  await conLista(page, { n: 6 });
  expect((await page.locator('.exp-tabs button').allInnerTexts()).map((t) => t.split('\n')[0])).toEqual(['Lo tuyo', 'Del radar', 'Lista de seguimiento']);
  await expect(page.locator('.ls-cont')).toContainText('6 de 10');
  await expect(page.locator('.ls-cont')).toContainText('sin límite con Dorado');
  await expect(page.locator('.ls-cont .ls-cand')).toHaveCount(1);
});

test('el conmutador Tabla | Tarjetas se recuerda y la fila marcada pasa a ser la tarjeta marcada', async ({ page }, info) => {
  test.skip(!esPc(info), 'el conmutador es del ordenador');
  await conLista(page);
  await expect(page.locator('.ls-conm')).toBeVisible();
  await expect(page.locator('.ls-tabla table')).toBeVisible();
  await expect(page.locator('.ls-rejilla')).toHaveCount(0);
  // marco la tercera fila y paso a tarjetas: la marcada sigue siendo esa
  const filas = page.locator('.ls-tabla tbody tr');
  await filas.nth(2).locator('td').nth(1).click();
  const sim = await page.evaluate(() => S.segSel);
  await page.locator('[data-seg-vista="tarjetas"]').click();
  await expect(page.locator('.ls-rejilla')).toBeVisible();
  await expect(page.locator('.ls-tabla')).toHaveCount(0);
  await expect(page.locator('.ls-tj.ls-sel')).toHaveAttribute('data-seg-sel', sim);
  expect(await page.evaluate(() => LS.get('inv-lista-vista'))).toBe('tarjetas');
  await expect(page.locator('.ls-tj-nueva')).toContainText('Seguir otra');
  // se queda al repintar la página y al volver a entrar en la pestaña
  await page.evaluate(() => { S.expTab = 'ideas'; pintar(); S.expTab = 'siguiendo'; pintar(); });
  await expect(page.locator('.ls-rejilla')).toBeVisible();
  await page.locator('[data-seg-vista="tabla"]').click();
  await expect(page.locator('.ls-tabla table')).toBeVisible();
  expect(await page.evaluate(() => LS.get('inv-lista-vista'))).toBe('tabla');
});

test('«Columnas» elige lo que se ve y el PER lleva candado', async ({ page }, info) => {
  test.skip(!esPc(info), 'las columnas son del ordenador, en avanzado');
  await conLista(page);
  const cab = () => page.locator('.ls-tabla thead th').evaluateAll((els) => els.map((e) => e.textContent));
  expect((await cab()).map((t) => t.trim())).toEqual(['Nombre', 'Precio', 'Hoy', '1 mes', 'PER', 'Volatilidad', 'Del máximo']);
  // sin Dorado el PER sale con candado en cada fila, no con el número
  await expect(page.locator('.ls-per .ls-cand')).toHaveCount(6);
  await page.locator('[data-seg-cols]').click();
  await page.locator('#fCols input[name="vol"]').uncheck();
  await page.locator('#fCols input[name="max"]').uncheck();
  // marcar el PER otra vez sin Dorado no lo activa: abre el candado, y la columna sigue fuera
  await page.locator('#fCols input[name="per"]').uncheck();
  await page.locator('#fCols input[name="per"]').click({ force: true });
  await expect(page.locator('.hoja-fondo').last()).toContainText('Los múltiplos');
  await page.locator('.hoja-escr [data-cerrar]').click();
  await page.locator('#fCols [type="submit"]').click();
  expect((await cab()).map((t) => t.trim())).toEqual(['Nombre', 'Precio', 'Hoy', '1 mes']);
  expect(await page.evaluate(() => LS.get('inv-lista-cols'))).toEqual(['mes']);
});

test('con Toisón Dorado el PER se ve con su número', async ({ page }, info) => {
  test.skip(!esPc(info), 'las columnas son del ordenador, en avanzado');
  await conLista(page, { dueno: true });
  await expect(page.locator('.ls-per .ls-cand')).toHaveCount(0);
  const per = await page.locator('.ls-per').allInnerTexts();
  expect(per.some((t) => /\d/.test(t))).toBe(true);
});

test('sin Toisón Dorado, 10 empresas son el tope; con él, las que quieras', async ({ page }, info) => {
  omitirPequeno(info);
  await conLista(page, { n: 10 });
  await expect(page.locator('.ls-cont')).toContainText('10 de 10');
  const r = await page.evaluate(async () => {
    const x = S.radar.valores.filter((q) => q.pe > 0 && q.p > 0)[10];
    await seguir(x.s, nombreRadar(x));
    return { n: siguiendo().length, hoja: !!document.querySelector('.hoja-fondo .et-dorado-g') };
  });
  expect(r).toEqual({ n: 10, hoja: true });
  await expect(page.locator('.hoja-escr')).toContainText('hasta 10 empresas');
  await page.locator('.hoja-fondo [data-cerrar]').first().click();
  // dejar de seguir sí se puede, y la «Seguir otra» de las tarjetas también avisa
  const q = await page.evaluate(async () => { const s = siguiendo()[0].s; await seguir(s); return siguiendo().length; });
  expect(q).toBe(9);
  // con Dorado: sin tope
  const d = await page.evaluate(async () => {
    LS.set('inv-dueno', 1); S.esDueno = true; S.noDueno = false;
    const xs = S.radar.valores.filter((q) => q.pe > 0 && q.p > 0);
    for (const x of xs.slice(10, 14)) await seguir(x.s, nombreRadar(x));
    return siguiendo().length;
  });
  expect(d).toBe(13);
});

test('el panel «Lo que supondría» sigue a la fila marcada y a la par con el de la IA', async ({ page }, info) => {
  test.skip(!esPc(info), 'a la par es del ordenador');
  await conLista(page);
  const sup = page.locator('[aria-labelledby="hLsSup"]'), ia = page.locator('[aria-labelledby="hLsIA"]');
  await expect(sup).toBeVisible(); await expect(ia).toBeVisible();
  // mitad y mitad, misma altura
  const [a, b] = await Promise.all([sup.boundingBox(), ia.boundingBox()]);
  expect(Math.abs(a.width - b.width)).toBeLessThan(3);
  expect(Math.abs(a.height - b.height)).toBeLessThan(3);
  expect(Math.abs(a.y - b.y)).toBeLessThan(3);
  // por defecto, la primera; al marcar otra, cambia
  const nombres = await page.locator('.ls-tabla tbody .ls-nom b').allInnerTexts();
  await expect(sup).toContainText(`Si metieras 1.000 € en ${nombres[0]}`);
  await page.locator('.ls-tabla tbody tr').nth(3).locator('td').nth(2).click();
  await expect(sup).toContainText(`Si metieras 1.000 € en ${nombres[3]}`);
  await expect(page.locator('.ls-tabla tr.ls-sel')).toHaveCount(1);
  // pesaría = (1.000 + lo que ya tienes de ella) / (tu cartera + 1.000)
  const esperado = await page.evaluate(() => {
    const f = segFilas('mi').find((q) => q.it.s === S.segSel), s = segSupone(S.M, f);
    return { total: S.M.total, pes: s.pesaria, ya: s.dentro + s.suelta };
  });
  expect(esperado.pes).toBeCloseTo(((1000 + esperado.ya) / (esperado.total + 1000)) * 100, 6);
  const kpis = await sup.locator('.ls-kpi').allInnerTexts();
  expect(kpis.map((t) => t.split('\n')[0])).toEqual(['Pesaría', 'Solape', 'País', 'Sector']);
  // el aviso y la ficha salen del panel; dejar de seguir quita la fila y el panel pasa a otra
  await expect(sup.locator('[data-seg-aviso]')).toBeVisible();
  await expect(sup.locator('[data-consulta]')).toBeVisible();
  await sup.locator('[data-seguir]').click();
  await expect(page.locator('.ls-tabla tbody tr')).toHaveCount(5);
  await expect(page.locator('.ls-tabla tr.ls-sel')).toHaveCount(1);
});

test('lo que viene: resultados y dividendos de lo que sigues', async ({ page }, info) => {
  test.skip(!esPc(info), 'el panel de la IA es del ordenador');
  await conLista(page);
  const viene = page.locator('.ls-viene');
  await expect(viene).toContainText('resultados de');
  await expect(viene).toContainText('ex-dividendo de');
});

test('el tono de cada noticia: ▲ Buena, ▼ Negativa, ● Neutral; sin tono o mixto, Neutral', async ({ page }, info) => {
  test.skip(!esPc(info), 'el panel de la IA es del ordenador');
  await conLista(page);
  const ia = page.locator('[aria-labelledby="hLsIA"]');
  const tonos = await ia.locator('.ls-tono').evaluateAll((els) => els.map((e) => [e.dataset.tono, e.textContent.trim()]));
  // las cinco con lectura, de más a menos relevante (rel 3,2,1,3,2 → 0,3,1,4,2); la sexta, sin lectura, no sale
  expect(tonos).toHaveLength(5);
  const porOrden = await page.evaluate(() => segFilas('mi').map((f) => { const i = informeIdea(f.it.s); return i && i.novedades ? [f.it.s, i.impacto || 'neutral'] : null; }).filter(Boolean));
  const esperado = { positivo: ['up', '▲ Buena'], negativo: ['down', '▼ Negativa'], neutral: ['neu', '● Neutral'] };
  const dado = porOrden.map((x) => esperado[x[1]] || esperado.neutral);
  expect([...tonos].sort()).toEqual([...dado].sort());
  // las cuatro formas, una a una
  const r = await page.evaluate(() => ['positivo', 'negativo', 'neutral', 'mixto', undefined, 'raro'].map((i) => { const t = segTono(i); return [t[0], t[1], t[2]]; }));
  expect(r).toEqual([['up', '▲', 'Buena'], ['down', '▼', 'Negativa'], ['neu', '●', 'Neutral'], ['neu', '●', 'Neutral'], ['neu', '●', 'Neutral'], ['neu', '●', 'Neutral']]);
  await expect(ia).toContainText('El tono es el de la noticia, leído por la IA: no dice qué hacer.');
  // el color es el de subir, el de bajar y el gris, por token
  const col = await ia.locator('.ls-tono').evaluateAll((els) => els.map((e) => [e.dataset.tono, getComputedStyle(e).color]));
  const buena = col.find((c) => c[0] === 'up'), mala = col.find((c) => c[0] === 'down'), neu = col.find((c) => c[0] === 'neu');
  expect(new Set([buena[1], mala[1], neu[1]]).size).toBe(3);
});

test('sin lecturas de la IA, el panel lo dice y no inventa tonos', async ({ page }, info) => {
  test.skip(!esPc(info), 'el panel de la IA es del ordenador');
  await conLista(page);
  await page.evaluate(() => { for (const k of Object.keys(S.escaneo.lectura)) delete S.escaneo.lectura[k]; segRepintar(); });
  await expect(page.locator('[aria-labelledby="hLsIA"] .ls-tono')).toHaveCount(0);
  await expect(page.locator('[aria-labelledby="hLsIA"]')).toContainText('La IA aún no ha leído noticias de lo que sigues.');
});

test('en el móvil: solo tabla, sin conmutador ni columnas; debajo, lo que supondría y «Pregúntale a la IA»', async ({ page }, info) => {
  test.skip(info.project.name !== 'movil', 'el móvil de 390');
  await conLista(page);
  await expect(page.locator('.ls-conm')).toHaveCount(0);
  await expect(page.locator('[data-seg-cols]')).toHaveCount(0);
  await expect(page.locator('.ls-rejilla')).toHaveCount(0);
  const cab = (await page.locator('.ls-tabla thead th').evaluateAll((els) => els.map((e) => e.textContent))).map((t) => t.trim());
  expect(cab).toEqual(['Nombre', 'Precio · hoy']);
  // precio con el cambio de hoy debajo
  await expect(page.locator('.ls-tabla tbody tr').first().locator('td').nth(1)).toContainText('%');
  // aunque el ordenador lo tuviera en tarjetas
  await page.evaluate(() => { LS.set('inv-lista-vista', 'tarjetas'); segRepintar(); });
  await expect(page.locator('.ls-rejilla')).toHaveCount(0);
  await expect(page.locator('[aria-labelledby="hLsSup"]')).toBeVisible();
  await expect(page.locator('[aria-labelledby="hLsPreg"]')).toBeVisible();
  await expect(page.locator('[aria-labelledby="hLsIA"]')).toHaveCount(0);
  // sin desbordar a los lados
  const ancho = await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1);
  expect(ancho).toBe(true);
  // marcar otra fila cambia el panel
  const nombres = await page.locator('.ls-tabla tbody .ls-nom b').allInnerTexts();
  await page.locator('.ls-tabla tbody tr').nth(2).locator('td').nth(1).click();
  await expect(page.locator('[aria-labelledby="hLsSup"]')).toContainText(nombres[2]);
});

test('listas: «Mi lista» es de todos; crear otra lleva candado y con Dorado se puede', async ({ page }, info) => {
  omitirPequeno(info);
  await conLista(page);
  await expect(page.locator('.ls-ch[data-seg-lista]')).toHaveCount(1);
  await expect(page.locator('[data-seg-nueva] .ls-cand')).toHaveCount(1);
  await page.locator('[data-seg-nueva]').click();
  await expect(page.locator('.hoja-fondo')).toContainText('Más de una lista');
  await page.locator('.hoja-fondo [data-cerrar]').first().click();
  // con Dorado: la crea, queda activa y vacía; lo que siga después va a ella; Mi lista conserva lo suyo
  await page.evaluate(() => { LS.set('inv-dueno', 1); S.esDueno = true; S.noDueno = false; segRepintar(); });
  await expect(page.locator('[data-seg-nueva] .ls-cand')).toHaveCount(0);
  await page.locator('[data-seg-nueva]').click();
  await page.locator('#fLista input[name="n"]').fill('Dividendos');
  await page.locator('#fLista [type="submit"]').click();
  await expect(page.locator('.ls-ch[data-seg-lista]')).toHaveCount(2);
  await expect(page.locator('.ls-ch[aria-pressed="true"]')).toHaveText('Dividendos');
  await expect(page.locator('.ls-vacia')).toBeVisible();
  const r = await page.evaluate(async () => {
    const x = S.radar.valores.filter((q) => q.pe > 0 && q.p > 0)[8];
    await seguir(x.s, nombreRadar(x));
    return { enNueva: itemsDeLista(S.segLista).length, enMi: itemsDeLista('mi').length, listas: S.cartera.listasSeg.map((l) => l.n) };
  });
  expect(r).toEqual({ enNueva: 1, enMi: 6, listas: ['Dividendos'] });
  // el nombre repetido se rechaza
  await page.locator('[data-seg-nueva]').click();
  await page.locator('#fLista input[name="n"]').fill('dividendos');
  await page.locator('#fLista [type="submit"]').click();
  await expect(page.locator('#errLista')).toContainText('Ya tienes una lista');
});

test('los textos no dicen «compra» ni «vende», y la lista dice que no es una recomendación', async ({ page }, info) => {
  omitirPequeno(info);
  for (const vista of ['tabla', 'tarjetas']) {
    await conLista(page);
    await page.evaluate((v) => { LS.set('inv-lista-vista', v); segRepintar(); }, vista);
    const t = await textoLista(page);
    expect(t).toContain('Lo que sigues no es una recomendación: es tu lista.');
    expect(t).not.toMatch(/\b(compra|compras|comprar|compres|vende|vender|vendas|vendes)\b/i);
    // ni en las preguntas a la IA ni en las hojas de los candados
    const html = await page.locator('#segRaiz').innerHTML();
    expect(html).not.toMatch(/data-q="[^"]*\b(compr|vend)/i);
    break;
  }
  await page.locator('[data-seg-dorado="limite"]').click();
  expect(await page.locator('.hoja-escr').innerText()).not.toMatch(/\b(compra|comprar|vende|vender)\b/i);
});

test('la lista vacía explica qué es y sigue siendo la misma pestaña', async ({ page }, info) => {
  omitirPequeno(info);
  await conLista(page, { n: 1 });
  await page.evaluate(async () => { await seguir(siguiendo()[0].s); });
  await expect(page.locator('.seg-vacio')).toContainText('Sigue empresas sin tenerlas');
  await expect(page.locator('.seg-vacio')).toContainText('Lo que sigues no es una recomendación: es tu lista.');
  await expect(page.locator('.exp-tabs [aria-pressed="true"]')).toContainText('Lista de seguimiento');
});
