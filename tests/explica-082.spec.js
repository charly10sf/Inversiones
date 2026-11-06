// 0.8.2 · La IA explica, sesiones 4 y 5: «Copiar para tu IA» en Posiciones y en Análisis (con el aviso de que contesta el
// asistente que elijas), las fichas de idea con lo que pide el Reglamento Delegado 2016/958 (quién, cuándo, igual para
// todos, hechos y opinión, fuentes e intereses), las preguntas de la app con las reglas del estándar cuando contesta Claude
// y, en el estándar, el orden de las posiciones sin «comprar» ni «vender».
import { test as base, expect } from '@playwright/test';
import { preparar, crearCuenta, meterCartera, quitarCapas } from './ayuda.js';

const test = base.extend({
  errores: [async ({ context }, use) => {
    const errores = await preparar(context);
    await use(errores);
    expect(errores, 'errores de JavaScript en la página').toEqual([]);
  }, { auto: true }],
});
test.beforeEach(({}, info) => test.skip(info.project.name !== 'movil', 'solo en el móvil'));

async function dentro(page) {
  await crearCuenta(page);
  await quitarCapas(page);
  await meterCartera(page);
  await page.evaluate(() => document.querySelectorAll('.hoja-fondo').forEach((h) => h.remove()));
}
const clic = (page, selector) => page.locator(selector).first().evaluate((el) => el.click());

test('Copiar para tu IA: en Posiciones y en Análisis, copia la cartera y dice que contesta el asistente que elijas', async ({ page }) => {
  await dentro(page);
  // el portapapeles, de imitación (en el navegador de pruebas no hay permiso)
  await page.evaluate(() => { window.__copiado = null; navigator.clipboard.writeText = async (t) => { window.__copiado = t; }; });
  await page.evaluate(() => { location.hash = '#posiciones'; pintar(); });
  await expect(page.locator('[data-accion="copiar-ia"]').first()).toBeAttached({ timeout: 15_000 });
  await clic(page, '[data-accion="copiar-ia"]');
  const hoja = page.locator('.hoja-fondo').last();
  await expect(hoja).toContainText('Lo que conteste es cosa de ese asistente, no de Toisón', { timeout: 15_000 });
  for (const n of ['ChatGPT', 'Gemini', 'Claude']) await expect(hoja.locator('a.btn', { hasText: n })).toHaveAttribute('target', '_blank');
  const copiado = await page.evaluate(() => window.__copiado);
  expect(copiado).toContain('Mi pregunta:');
  expect(copiado).toContain('Repsol');
  // ya no se abre Gemini por su cuenta
  expect(await page.evaluate(() => document.querySelectorAll('.hoja-fondo').length)).toBeGreaterThan(0);
});

test('las fichas de idea dicen quién las hace y cuándo, que son iguales para todos y los intereses del creador', async ({ page }) => {
  await dentro(page);
  await page.waitForFunction(() => radarVals().length, null, { timeout: 45_000 });
  await page.evaluate(() => { S.acceso = 'publico'; S.expTab = 'ideas'; location.hash = '#expertos'; pintar(); });
  const ficha = page.locator('.ideas-top3 .idea').first();
  await expect(ficha).toBeAttached({ timeout: 30_000 });
  const aviso = ficha.locator('.idea-aviso');
  await expect(aviso.locator('summary')).toContainText('igual para todos: no es una recomendación personalizada');
  await expect(aviso.locator('summary')).toContainText('hecha con IA');
  await expect(aviso.locator('p')).toContainText('No tiene en cuenta tu situación');
  await expect(aviso.locator('p')).toContainText('Hechos:');
  await expect(aviso.locator('p')).toContainText('Opinión');
  await expect(aviso.locator('p')).toContainText('Yahoo Finance');
  // sin declarar (intereses.json viene vacío)
  await expect.poll(() => page.evaluate(() => !!INTERESES), { timeout: 10_000 }).toBe(true);
  await page.evaluate(() => pintar());
  await expect(page.locator('.ideas-top3 .idea .idea-aviso p').first()).toContainText('aún no ha declarado');
  // declarado, con y sin posiciones en esa empresa
  const s = await page.evaluate(() => { const x = ideasJuntas(S.M || calcular(), iaActual(), 9)[0]; const s = (x.r && x.r.s) || x.s; INTERESES = { actualizado: '2026-11-05', valores: [s] }; pintar(); return s; });
  await expect(page.locator('.ideas-top3 .idea .idea-aviso p').first()).toContainText('tiene posiciones');
  await expect(page.locator('.ideas-top3 .idea .idea-aviso p').first()).toContainText('5 nov');
  await page.evaluate(() => { INTERESES = { actualizado: '2026-11-05', valores: ['NADA.XX'] }; pintar(); });
  await expect(page.locator('.ideas-top3 .idea .idea-aviso p').first()).toContainText('no tiene posiciones');
  expect(s).toBeTruthy();
});

test('con Claude, también en el fundador, las preguntas que propone la app son las del estándar', async ({ page }) => {
  await dentro(page);
  await page.waitForFunction(() => radarVals().length, null, { timeout: 45_000 });
  // 0.8.2b: solo contesta Claude, así que en el fundador también son las del estándar
  await page.evaluate(() => { S.acceso = 'privado'; LS.del('inv-claude-sondeo'); });
  expect(await page.evaluate(() => preguntasDelEstandar())).toBe(true);
  await page.evaluate(() => { S.expTab = 'ideas'; location.hash = '#expertos'; pintar(); });
  const b = page.locator('.ideas-top3 .idea [data-accion="asesor"]').first();
  await expect(b).toBeAttached({ timeout: 30_000 });
  const q = await b.getAttribute('data-q');
  expect(q).toContain('¿Qué hace');
  expect(q).not.toContain('cuánto meter');
  // y las sugerencias del panel, sin «¿qué opciones tengo?» de compra
  await page.evaluate(() => abrirAsesor());
  await page.waitForFunction(() => typeof sugerencias === 'function', null, { timeout: 15_000 });
  expect((await page.evaluate(() => sugerencias(S.M || calcular()))).join(' ')).not.toMatch(/me sobran 500|Búscame otra jugada/);
});

test('en el estándar, ordenar las posiciones no dice «comprar» ni «vender»', async ({ page }) => {
  await dentro(page);
  await page.evaluate(() => { S.acceso = 'publico'; S.M = calcular(); location.hash = '#posiciones'; pintar(); });
  const sel = page.locator('[data-orden-pos-sel]');
  await expect(sel).toBeAttached({ timeout: 15_000 });
  const opciones = (await sel.locator('option').allTextContents()).join(' | ');
  expect(opciones).not.toMatch(/comprar primero|vender primero/);
  expect(opciones).toMatch(/más a favor primero/);
});

// 5 nov (captura de Carlos): en el móvil, las pestañas de pastilla que se quedan arriba al bajar (Ideas: Lo tuyo · Del radar ·
// Siguiendo) tienen fondo de verdad, para que el texto de debajo no se monte
test('las pestañas de pastilla que se quedan arriba tapan lo que pasa por debajo', async ({ page }) => {
  await dentro(page);
  for (const tema of ['marmol', 'marfil', 'borgona']) {
    await page.evaluate((t) => { ponerTema(t); S.expTab = 'ideas'; location.hash = '#expertos'; pintar(); }, tema);
    const tabs = page.locator('.exp-tabs');
    await expect(tabs).toBeAttached({ timeout: 15_000 });
    const r = await tabs.evaluate((el) => ({ pos: getComputedStyle(el).position, fondo: getComputedStyle(el).backgroundColor }));
    expect(r.pos).toBe('sticky');
    // opaco: ni transparente ni con alfa
    expect(r.fondo).not.toMatch(/transparent|rgba\(|\/ ?0?\.\d|, 0\)$/);
  }
});

// 0.8.2 (rematar, 5 nov): los botones de abajo del panel de la IA (recortar, dictar, enviar) y la línea del aviso fijo de
// arriba miden menos de 48 px; responden en 48 × 48 alrededor de su centro sin quitarle el toque a otro
test('los botones del panel de la IA se tocan en 48 × 48', async ({ page }) => {
  await dentro(page);
  // 0.8.2b: sin clave de Google; aquí no hay Worker de imitación, así que la IA se da por lista (lo que se mide es el pie)
  await page.evaluate(() => { window.iaLista = () => true; abrirAsesor(); });
  await expect(page.locator('.asesor .as-enviar')).toBeVisible({ timeout: 15_000 });
  await page.waitForTimeout(800);
  const fallos = await page.evaluate(() => {
    const TOC = 'button, a[href], summary, input, select, textarea, label, [role="button"]', out = [];
    for (const el of document.querySelectorAll('.asesor :is(.as-adj, .as-enviar, .as-cab .ib, .as-modo .seg button)')) {
      const b = el.getBoundingClientRect(); if (!b.width || !b.height || b.top < 0 || b.bottom > innerHeight) continue;
      const cx = b.left + b.width / 2, cy = b.top + b.height / 2;
      const c = document.elementFromPoint(cx, cy); if (!c || !el.contains(c)) continue;
      for (const [x, y] of [[cx, cy - 22], [cx, cy + 22], [cx - 22, cy], [cx + 22, cy]]) {
        if (x < 0 || y < 0 || x > innerWidth || y > innerHeight) continue;
        const d = document.elementFromPoint(x, y)?.closest(TOC);
        if (d !== el && !(d && !d.contains(el))) out.push(`${el.className || el.tagName} en ${Math.round(x - cx)},${Math.round(y - cy)}`);
      }
    }
    return out;
  });
  expect(fallos).toEqual([]);
});

// 0.8.2 (rematar, 5 nov): la lista de conversaciones (hasta 20, unos 600 KB) ya no se cifra en cada respuesta: la abierta se
// guarda al momento y pasa a la lista al salir de la app (o 20 s después); si la app se cierra antes, la pasa al cargar
test('la lista de conversaciones no se cifra en cada respuesta y no se pierde nada', async ({ page }) => {
  await dentro(page);
  await page.evaluate(async () => {
    window.__n = 0; const g = guardarConvs; window.guardarConvs = async () => { window.__n++; return g(); };
    AS.conv = [{ rol: 'yo', texto: '¿Qué tal mi cartera?' }, { rol: 'ia', texto: 'Bien.' }]; AS.api = []; AS.convId = null;
    await guardarConv(); await guardarConv(); await guardarConv();
  });
  expect(await page.evaluate(() => window.__n)).toBe(0);
  expect(await page.evaluate(() => !!LS.get('inv-asesor-conv'))).toBe(true);
  // al salir de la app pasa a la lista, una vez
  await page.evaluate(() => { appFuera(true); appFuera(false); });
  await page.waitForFunction(() => window.__n === 1);
  expect(await page.evaluate(async () => (await cargarConvs()).length)).toBe(1);
  // otra pregunta y la app se cierra antes de pasarla: al volver a cargar, la lista la tiene entera
  await page.evaluate(async () => {
    AS.conv.push({ rol: 'yo', texto: '¿Y los costes?' }, { rol: 'ia', texto: 'Bajos.' }); await guardarConv();
    clearTimeout(ARCHIVO_T); ARCHIVO_T = null; AS.cargada = false; AS.convs = null; AS.conv = []; await cargarAsesor();
  });
  expect(await page.evaluate(() => AS.convs.length)).toBe(1);
  expect(await page.evaluate(() => AS.convs[0].n)).toBe(2);
});
