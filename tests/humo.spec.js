// Pruebas de humo: lo que tiene que funcionar siempre, en el móvil (390 y 360) y en el ordenador (1440).
import { test as base, expect } from '@playwright/test';
import { preparar, crearCuenta, meterCartera, quitarCapas, tocar } from './ayuda.js';

const VISTAS = ['cartera', 'ruta', 'analisis', 'expertos', 'mercados'];

// cada prueba con GrowFolio sin internet; al final, ningún error de JavaScript
export const test = base.extend({
  ajustes: [{}, { option: true }],
  idioma: ['es', { option: true }],
  errores: async ({ context, ajustes, idioma }, use) => {
    const errores = await preparar(context, { idioma, ajustes });
    await use(errores);
    expect(errores, 'errores de JavaScript en la página').toEqual([]);
  },
  pagina: async ({ page, errores }, use) => { await use(page); },
});

const ancho = (page) => page.evaluate(() => document.documentElement.scrollWidth);

async function recorrerVistas(page, vp) {
  for (const v of VISTAS) {
    await page.evaluate((v) => { location.hash = v; }, v);
    await expect.poll(() => page.evaluate(() => S.vista)).toBe(v);
    await page.waitForTimeout(400);
    await quitarCapas(page);
    expect(await ancho(page), `la vista ${v} no se sale de la pantalla`).toBeLessThanOrEqual(vp.width + 1);
    // y las pestañas de dentro (Expertos, Mercados, Análisis…)
    const n = await page.locator('.subvistas button:visible').count();
    for (let i = 0; i < Math.min(n, 6); i++) {
      await tocar(page, `.subvistas button:visible >> nth=${i}`);   // por si sale un aviso encima al rato
      await page.waitForTimeout(250);
      await quitarCapas(page);
      expect(await ancho(page), `la vista ${v}, pestaña ${i + 1}, no se sale`).toBeLessThanOrEqual(vp.width + 1);
    }
  }
}

test.describe('cuenta nueva (modo estándar)', () => {
  test('crea la cuenta, mete la cartera y abre cada pestaña', async ({ pagina: page, viewport }) => {
    await crearCuenta(page);
    await expect(page.locator('.hero-num')).toBeVisible();
    await quitarCapas(page);
    await meterCartera(page);
    await expect.poll(() => page.evaluate(() => (S.M ? Math.round(S.M.total) : 0))).toBeGreaterThan(50000);
    expect(await page.evaluate(() => S.acceso)).toBe('publico');
    await recorrerVistas(page, viewport);
    // en estándar no hay Paso a paso ni planes de venta
    await page.evaluate(() => { location.hash = 'ruta'; });
    await expect(page.locator('#vista')).toContainText('Tu plan');
    await page.evaluate(() => { location.hash = 'expertos'; });
    await page.waitForTimeout(500);
    expect(await page.locator('.plan-venta').count()).toBe(0);
  });
});

test.describe('modo fundador', () => {
  test.use({ ajustes: { 'stub-dueno': 'lucia@prueba.com' } });
  test('el dueño entra en fundador y ve el Paso a paso', async ({ pagina: page, viewport }) => {
    await crearCuenta(page);
    await quitarCapas(page);
    await meterCartera(page);
    await expect.poll(() => page.evaluate(() => S.acceso)).toBe('privado');
    expect(await page.evaluate(() => S.esDueno)).toBe(true);
    await recorrerVistas(page, viewport);
    await page.evaluate(() => { location.hash = 'ruta'; });
    await expect(page.locator('#vista')).not.toContainText('Llega en la 0.9');
    // Ajustes del dueño: el modo de cada cuenta
    await page.evaluate(() => abrirAjustes());
    await expect(page.locator('#aAcceso')).toBeVisible();
  });
});

test.describe('en inglés', () => {
  test.use({ idioma: 'en' });
  test('la app sale en inglés', async ({ pagina: page, viewport }) => {
    await crearCuenta(page);
    await quitarCapas(page);
    await meterCartera(page);
    await expect(page.locator('body')).toContainText(/Net worth|Home/);
    await recorrerVistas(page, viewport);
    // los botones de abajo, en inglés
    const nav = await page.locator('.navbar, .nav').first().innerText();
    expect(nav).not.toMatch(/Mercados|Expertos|Análisis/);
  });
});

test.describe('seguridad de la cartera', () => {
  test.beforeEach(({}, info) => test.skip(info.project.name !== 'movil', 'solo en el móvil'));

  test('el código de recuperación se ve y se confirma', async ({ pagina: page }) => {
    await crearCuenta(page);
    await quitarCapas(page);
    await page.evaluate(() => abrirAjustes());
    await page.click('#aKit');
    const codigo = await page.evaluate(() => S.cartera.kit && S.cartera.kit.codigo);
    expect(codigo, 'la cartera nueva trae su código').toMatch(/^[A-Z0-9]{24}$|^[A-Z0-9]{4}(-[A-Z0-9]{4}){5}$/);
    // el grupo que pide es uno al azar (el marcado)
    await expect(page.locator('.kit-cod span')).toHaveCount(6);
    await page.fill('#kGrupo', await page.locator('.kit-cod .kit-g').innerText());
    await page.getByRole('button', { name: /Ya lo he guardado/ }).click();
    await expect.poll(() => page.evaluate(() => !!(S.cartera.kit && S.cartera.kit.guardado))).toBe(true);
  });

  test('al recargar entra sola y con la contraseña olvidada se recupera con el código', async ({ pagina: page }) => {
    await crearCuenta(page);
    await quitarCapas(page);
    await meterCartera(page);
    const total = await page.evaluate(() => Math.round(S.M.total));
    const codigo = await page.evaluate(() => S.cartera.kit.codigo);
    await page.reload();
    await expect(page.locator('.hero-num')).toBeVisible({ timeout: 30_000 });
    expect(await page.evaluate(() => Math.round(S.M.total))).toBe(total);
    // olvidar la clave en este dispositivo: pide la contraseña
    // olvidar la clave en este dispositivo (sin cerrar la sesión): al volver pide la contraseña de la cartera
    await page.evaluate(async () => { await IDB.del(IDB_CLAVE); guardarBloqueo(null); LS.del('inv-bloqueo-t'); });
    await page.reload();
    await expect(page.locator('#pass'), 'sin la clave guardada pide la contraseña').toBeVisible({ timeout: 30_000 });
    await page.getByRole('button', { name: /olvidado|olvidé/i }).click();
    await page.fill('#rCod', codigo);
    await page.fill('#rP1', 'otra-clave-99');
    await page.fill('#rP2', 'otra-clave-99');
    await page.click('#bRec');
    await expect(page.locator('.hero-num')).toBeVisible({ timeout: 30_000 });
    expect(await page.evaluate(() => Math.round(S.M.total))).toBe(total);
  });
});

test.describe('importar', () => {
  test.beforeEach(({}, info) => test.skip(info.project.name !== 'movil', 'solo en el móvil'));

  test('una captura del bróker se lee y se guarda', async ({ pagina: page, context }) => {
    // GrowIA (Gemini) de imitación: contesta lo que leería en una captura de Trade Republic
    await context.route('https://generativelanguage.googleapis.com/**', (r) => {
      const leido = { plataforma: 'Trade Republic', posiciones: [
        { nombre: 'Repsol', isin: 'ES0173516115', ticker: 'REP', tipo: 'Acción', cantidad: 100, precio_medio: 12.5, invertido: 1250, valor: 2900 },
        { nombre: 'iShares Core MSCI World UCITS ETF', isin: 'IE00B4L5Y983', tipo: 'ETF', cantidad: 10, precio_medio: 90, invertido: 900, valor: 1100 },
      ], operaciones: [], efectivo: [{ plataforma: 'Trade Republic', importe: 150 }] };
      if (/models\?|\/models$/.test(r.request().url())) return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ models: [] }) });
      return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(leido) }] }, finishReason: 'STOP' }], usageMetadata: {} }) });
    });
    await crearCuenta(page);
    await quitarCapas(page);
    await page.evaluate(() => { AS.clave = 'AQ.prueba-de-growfolio'; });
    await page.evaluate(() => importarCapturas());
    await page.setInputFiles('#impArch', { name: 'captura.png', mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64') });
    await expect(page.locator('#impGuardar')).toBeVisible({ timeout: 30_000 });
    await page.click('#impGuardar');
    await expect.poll(() => page.evaluate(() => S.cartera.posiciones.length)).toBeGreaterThanOrEqual(2);
    expect(await page.evaluate(() => S.cartera.posiciones.some((p) => p.instrumento === 'repsol'))).toBe(true);
  });
});

test.describe('la guía', () => {
  test.beforeEach(({}, info) => test.skip(info.project.name === 'movil-pequeno', 'en 390 y 1440'));

  test('cada paso señala algo que se ve y la tarjeta no lo tapa', async ({ pagina: page }) => {
    await crearCuenta(page);
    await quitarCapas(page);
    await meterCartera(page);
    await page.evaluate(() => iniciarTour(0));
    const pasos = await page.evaluate(() => TOUR.length);
    const medir = () => page.evaluate(() => {
        const p = TOURE && TOURE.pasos[TOURE.i]; if (!p || !p.sel) return { sin: true };
        const el = Array.from(document.querySelectorAll(p.sel)).find((x) => { const r = x.getBoundingClientRect(), cs = getComputedStyle(x); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none'; });
        const caja = document.querySelector('.tour-caja');
        if (!el || !caja) return { sel: p.sel, falta: !el };
        const a = el.getBoundingClientRect(), b = caja.getBoundingClientRect();
        const ix = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)), iy = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
        const tapa = (ix * iy) / Math.max(1, Math.min(a.width * a.height, innerWidth * innerHeight));
        return { sel: p.sel, tapa, dentro: a.bottom > 0 && a.top < innerHeight, donde: [Math.round(a.top), Math.round(b.top)] };
      });
    for (let i = 0; i < pasos; i++) {
      // se mide cuando la tarjeta ya está quieta (si algo aparece encima a mitad del paso, se recoloca)
      await page.waitForTimeout(900);
      let r = await medir();
      for (let k = 0; k < 10; k++) { await page.waitForTimeout(250); const r2 = await medir(); const quieto = JSON.stringify(r2.donde) === JSON.stringify(r.donde); r = r2; if (quieto) break; }
      if (!r.sin) {
        expect(r.falta, `paso ${i + 1}: ${r.sel} existe`).toBeFalsy();
        expect(r.dentro, `paso ${i + 1}: ${r.sel} se ve`).toBe(true);
        expect(r.tapa, `paso ${i + 1}: la tarjeta no tapa ${r.sel}`).toBeLessThan(0.35);
      }
      if (i < pasos - 1) await page.evaluate(() => irPasoTour(1));
    }
  });
});

// 0.6: lo que va en trozos se baja al usarlo (y funciona igual)
test.describe('trozos', () => {
  test.beforeEach(({}, info) => test.skip(info.project.name === 'movil-pequeno', 'en 390 y 1440'));

  test('la hoja de GTA VI se baja al abrirla', async ({ pagina: page }) => {
    await crearCuenta(page);
    await quitarCapas(page);
    await meterCartera(page);
    test.skip(!(await page.evaluate(() => gtaActivo())), 'GTA VI ya ha salido');
    expect(await page.evaluate(() => typeof htmlGTA)).toBe('undefined');
    await tocar(page, '[data-gta]:visible');
    await expect(page.locator('.gta-marco')).toBeVisible();
    expect(await page.evaluate(() => typeof htmlGTA)).toBe('function');
    await page.keyboard.press('Escape');
    await expect(page.locator('.gta-marco')).toHaveCount(0);
  });
});

test.describe('trozos: el asesor', () => {
  test.beforeEach(({}, info) => test.skip(info.project.name === 'movil-pequeno', 'en 390 y 1440'));

  test('GrowIA se baja al abrirla y el recorte de pantalla también funciona', async ({ pagina: page }) => {
    await crearCuenta(page);
    await quitarCapas(page);
    expect(await page.evaluate(() => typeof sugerencias)).toBe('undefined');
    // cerrarla sin haberla abierto no baja nada
    await page.evaluate(() => cerrarAsesor());
    expect(await page.evaluate(() => typeof sugerencias)).toBe('undefined');
    await tocar(page, '#bAsesor');
    await expect(page.locator('#asesorFondo')).toBeVisible();
    expect(await page.evaluate(() => typeof sugerencias)).toBe('function');
    await page.keyboard.press('Escape');
    // falló una vez en pc con toda la tanda a la vez y no se ha vuelto a ver: si vuelve, que diga qué había
    if (await page.locator('#asesorFondo').count()) console.log('GrowIA sigue abierta tras Escape:', await page.evaluate(() => JSON.stringify({ hojas: [...document.querySelectorAll('.hoja-fondo')].map((x) => x.textContent.slice(0, 80)), foco: document.activeElement && (document.activeElement.id || document.activeElement.tagName), pila: ATRAS.pila.length })));
    await expect(page.locator('#asesorFondo')).toHaveCount(0);
  });
});

test.describe('trozos: las novedades', () => {
  test.beforeEach(({}, info) => test.skip(info.project.name !== 'movil', 'en el móvil'));

  test('quien viene de una versión anterior ve las novedades (se bajan al momento)', async ({ pagina: page }) => {
    await crearCuenta(page);
    await quitarCapas(page);
    await meterCartera(page);
    // como si la última vista fuera la 0.4f (después de que la bienvenida de la cuenta nueva apunte la de ahora, que con
    // toda la tanda a la vez puede llegar tarde y pisarla)
    await page.waitForFunction(() => LS.get('inv-version') === VERSION, null, { timeout: 30_000 });
    await page.evaluate(() => { LS.set('inv-version', '0.4f'); LS.set('inv-vnum', 2); LS.set('inv-perfil-pedido', true); });
    await page.reload();
    await page.locator('#entrada').click({ timeout: 20_000 }).catch(() => {});
    await expect(page.locator('.ixn, .estreno, .hoja-fondo').first()).toBeVisible({ timeout: 30_000 });
    expect(await page.evaluate(() => typeof novedadesScroll)).toBe('function');
    expect(await page.locator('body').innerText()).toMatch(/0\.5|contraseña|código/i);
  });
});

test.describe('trozos: el mapa', () => {
  test.beforeEach(({}, info) => test.skip(info.project.name === 'movil-pequeno', 'en 390 y 1440'));

  test('el mapa del mundo se baja al abrir Mercados y se pinta entero', async ({ pagina: page, context }, info) => {
    // las banderas vienen de flagcdn: aquí, una de mentira
    await context.route(/flagcdn\.com\/.*\.svg/, (r) => r.fulfill({ status: 200, contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 3 2"><rect width="3" height="2" fill="#c60b1e"/></svg>' }));
    await crearCuenta(page);
    await quitarCapas(page);
    await meterCartera(page);
    expect(await page.evaluate(() => typeof svgMapa)).toBe('undefined');
    await page.evaluate(() => { location.hash = 'mercados'; });
    await expect(page.locator('#mapaMundo svg')).toBeVisible({ timeout: 20_000 });
    expect(await page.evaluate(() => typeof svgMapa)).toBe('function');
    await expect(page.locator('#mapaLey')).not.toBeEmpty();
    await expect(page.locator('#mapaInfo')).not.toBeEmpty();
    // 0.5d: la bandera en cada país, también en el ordenador (al lado del nombre)
    await expect(page.locator('.mapa-etqs .me img.bandera').first()).toBeVisible();
    if (info.project.name === 'pc') {
      expect(await page.locator('.mapa-etqs .me:not(.compacto):not(.grupo)').count()).toBeGreaterThan(0);
      // y el desplegable de países, con los colores y la letra de la app
      expect(await page.evaluate(() => getComputedStyle(document.querySelector('#mapaPais')).appearance)).toBe('base-select');
    }
    // «Tu dinero»: los países donde tienes algo
    await tocar(page, '[data-mapa-modo="tuyo"]');
    await expect(page.locator('.mapa-w')).toHaveAttribute('data-modo', 'tuyo');
  });
});

test.describe('trozos: si no se pueden bajar', () => {
  test.beforeEach(({}, info) => test.skip(info.project.name !== 'movil', 'en el móvil'));

  test('avisa de la versión nueva y lo que venía detrás sigue', async ({ pagina: page, context }) => {
    await crearCuenta(page);
    await quitarCapas(page);
    await meterCartera(page);
    // como si el trozo de antes ya no estuviera publicado
    await context.route(/\/assets\/gta-[0-9a-f]+\.js$/, (r) => r.fulfill({ status: 404, body: '' }));
    const siguio = await page.evaluate(() => new Promise((ok) => { LS.del('inv-gta'); avisoGTA(() => ok(true)); setTimeout(() => ok(false), 8000); }));
    expect(siguio, 'avisoGTA sigue con lo de después aunque no baje su trozo').toBe(true);
    await expect(page.locator('#avisoWeb')).toBeVisible();
    // 0.5d: el botón dice «Actualizar» (antes «Ponerla»)
    await expect(page.locator('#avisoWeb .btn')).toHaveText('Actualizar');
    await expect(page.locator('#avisoWeb')).toContainText('Se actualiza en un segundo');
  });
});

test.describe('GrowIA te pregunta', () => {
  test.beforeEach(({}, info) => test.skip(info.project.name !== 'movil', 'en el móvil'));

  test('no vuelve a preguntar lo que ya contestaste ni lo que ya viste, aunque venga con otras palabras', async ({ pagina: page }) => {
    await crearCuenta(page); await quitarCapas(page);
    const qs = await page.evaluate(() => {
      S.cartera.perfil = { ...(S.cartera.perfil || {}), respuestas: [{ q: '¿Quieres vender parte de tu cripto para volver a tu límite del 5 %?', a: 'En la renta del 27', f: '2026-10-22' }] };
      S.iaPropio = { json: { publico: true, posiciones: {}, preguntas: [
        { q: '¿Te plantearías realizar algún ajuste en tu criptomoneda para ajustarla al límite del 5 %?', opciones: ['Sí, rebalancear pronto', 'No, dejarlo como está'] },
        { q: '¿Cuándo vas a necesitar el dinero de tu meta de la casa?', opciones: ['En 2 años', 'En 5 años'] },
        { q: '¿Cuándo necesitarás el dinero para la meta de la casa?', opciones: ['Pronto'] },
      ] }, fecha: hoyIso(), modelo: MODELO_RAPIDO };
      return preguntasIA().map((x) => x.q);
    });
    expect(qs).toEqual(['¿Cuándo vas a necesitar el dinero de tu meta de la casa?']);

    // la hoja sale una vez (si sale otra hoja sola al crear la cuenta, espera: se quita y se vuelve a probar)
    for (let k = 0; k < 8 && !(await page.locator('.pregia').count()); k++) { await quitarCapas(page); await page.evaluate(() => mostrarPreguntaIA()); await page.waitForTimeout(400); }
    await expect(page.locator('.pregia h3')).toHaveText('¿Cuándo vas a necesitar el dinero de tu meta de la casa?');
    await page.click('.pregia-luego');
    await expect(page.locator('.pregia')).toHaveCount(0);
    // si la dejas para luego y la revisión siguiente la escribe de otra forma, ya no sale sola…
    await page.evaluate(() => { S.iaPropio.json.preguntas = [{ q: '¿Para cuándo necesitas el dinero de la meta de la casa?', opciones: ['Pronto'] }]; });
    expect(await page.evaluate(() => preguntaNueva())).toBeNull();
    // …pero sigue en Tus objetivos, y la respuesta se guarda con la pregunta que viste aunque la revisión cambie entretanto
    expect(await page.evaluate(() => preguntasIA().length)).toBe(1);
    await page.evaluate(() => { const x = preguntasIA()[0]; S.iaPropio.json.preguntas = [{ q: '¿Tienes hipoteca?' }]; return responderIA(x, 'En 2 años'); });
    expect(await page.evaluate(() => S.cartera.perfil.respuestas.at(-1).q)).toBe('¿Para cuándo necesitas el dinero de la meta de la casa?');
    expect(await page.evaluate(() => preguntasIA().map((x) => x.q))).toEqual(['¿Tienes hipoteca?']);
    // lo contestado hace más de 6 meses ya no cuenta: GrowIA puede volver a preguntarlo
    await page.evaluate(() => { S.cartera.perfil.respuestas.push({ q: '¿Pagas hipoteca ahora?', a: 'No', f: '2026-01-10' }); });
    expect(await page.evaluate(() => preguntasIA().length)).toBe(1);
    await page.evaluate(() => { S.cartera.perfil.respuestas.push({ q: '¿Pagas hipoteca ahora?', a: 'No', f: hoyIso() }); });
    expect(await page.evaluate(() => preguntasIA().length)).toBe(0);
  });
});

test.describe('GrowIA busca en internet', () => {
  test.beforeEach(({}, info) => test.skip(info.project.name !== 'movil', 'en el móvil'));

  test('busca con Flash-Lite y, si se le acaba el cupo, con el modelo de la conversación', async ({ pagina: page, context }) => {
    // Gemini de imitación: la conversación pide buscar y luego contesta; la búsqueda apunta con qué modelo se hizo
    const busquedas = [];
    let liteSinCupo = false;
    const sse = (parts) => `data: ${JSON.stringify({ candidates: [{ content: { role: 'model', parts }, finishReason: 'STOP' }], usageMetadata: {} })}\r\n\r\n`;
    await context.route('https://generativelanguage.googleapis.com/**', (r) => {
      const url = r.request().url(), cuerpo = r.request().postData() || '', modelo = (url.match(/models\/([\w.-]+):/) || [])[1];
      if (/:streamGenerateContent/.test(url)) {
        const parts = /"functionResponse"/.test(cuerpo) ? [{ text: 'Repsol baja un 3 % por el petróleo.' }] : [{ functionCall: { name: 'buscar_en_internet', args: { consulta: 'Repsol hoy' } } }];
        return r.fulfill({ status: 200, contentType: 'text/event-stream', body: sse(parts) });
      }
      if (/:generateContent/.test(url) && /Busca en internet/.test(cuerpo)) {
        busquedas.push(modelo);
        if (liteSinCupo && /flash-lite/.test(modelo)) return r.fulfill({ status: 429, contentType: 'application/json', body: JSON.stringify({ error: { code: 429, status: 'RESOURCE_EXHAUSTED', message: 'Quota exceeded for metric: generate_content_free_tier_requests, limit: 20 (GenerateRequestsPerDayPerProjectPerModel-FreeTier)' } }) });
        return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ candidates: [{ content: { parts: [{ text: 'Repsol cae un 3 % hoy.' }] }, groundingMetadata: { groundingChunks: [{ web: { uri: 'https://ejemplo.es/repsol', title: 'ejemplo.es' } }] } }] }) });
      }
      return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ models: [], candidates: [{ content: { parts: [{ text: '{}' }] } }] }) });
    });
    await crearCuenta(page);
    await quitarCapas(page);
    await meterCartera(page);
    // la revisión diaria, a mano: si no, empezaría sola con la clave puesta y también buscaría
    await page.evaluate(() => { guardarCfgAsesor({ auto: 'manual' }); AS.clave = 'AQ.prueba-de-growfolio'; LS.del('inv-ia-agotados'); });
    let respuestas = 0;
    const preguntar = async (q) => {
      await page.evaluate(() => { if (typeof cerrarAsesor === 'function') cerrarAsesor(); });
      await page.evaluate((x) => abrirAsesor(x, true), q);
      respuestas++;
      await expect.poll(async () => (await page.locator('#asCuerpo').innerText()).split('Repsol baja un 3 %').length - 1, { timeout: 30_000 }).toBe(respuestas);
    };
    await preguntar('¿Qué ha pasado hoy con Repsol?');
    expect(busquedas).toEqual(['gemini-3.5-flash-lite']);

    // sin cupo hoy en Flash-Lite: busca con el de la conversación y se apunta, para no volver a probar con él hoy
    liteSinCupo = true; busquedas.length = 0;
    await preguntar('¿Y mañana?');
    expect(busquedas).toEqual(['gemini-3.5-flash-lite', 'gemini-3.8-flash']);
    expect(await page.evaluate(() => agotadosIA())).toContain('gemini-3.5-flash-lite');
    busquedas.length = 0;
    await preguntar('¿Y la semana que viene?');
    expect(busquedas).toEqual(['gemini-3.8-flash']);
  });
});
