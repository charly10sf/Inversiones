// 0.7 · la IA fiable, para el dueño: los fallos que no se arreglan solos se apuntan (sin la pregunta) y se ven, con el banco
// de preguntas, en «Cómo va la IA». 0.8.2b: el chat solo va con Claude (Worker de imitación); las pruebas de los modelos de
// Gemini (3.8, 3.6, Flash-Lite, su cupo y su búsqueda) se han ido con él.
import { test as base, expect } from '@playwright/test';
import { preparar, crearCuenta, meterCartera, quitarCapas } from './ayuda.js';

const WORKER = 'https://growfolio.growfolio-web-app.workers.dev/claude';
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Authorization, Content-Type', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS' };

// el dueño ve en Ajustes cómo va la IA: el banco de cada noche y los fallos que no se arreglaron solos
const testDueno = base.extend({
  errores: async ({ context }, use) => {
    const errores = await preparar(context, { ajustes: { 'stub-dueno': 'lucia@prueba.com', 'stub-verificar': '1' } });
    await use(errores);
    expect(errores, 'errores de JavaScript en la página').toEqual([]);
  },
});
testDueno.beforeEach(({}, info) => testDueno.skip(info.project.name !== 'movil', 'en el móvil'));

testDueno('Cómo va la IA: el banco de preguntas y los fallos, para el dueño', async ({ page, context, errores }) => {
  const banco = { v: 1, generado: new Date().toISOString(), modelo: 'claude-haiku-5-5', total: 40, bien: 38, pct: 95, peticiones_media: 1.9,
    preguntas: [{ id: 'e-vendo-repsol', ok: false, mal: ['sobra «deberías vender»'], q: '¿Vendo Repsol?', respuesta: 'Deberías vender Repsol.' }] };
  await context.route('https://raw.githubusercontent.com/**/datos/banco.json*', (r) => r.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify(banco) }));
  // Claude rechaza la petición: un fallo que no se arregla solo, y se apunta para el dueño (sin la pregunta)
  await context.route(WORKER, (r) => {
    const q = r.request();
    if (q.method() === 'OPTIONS') return r.fulfill({ status: 204, headers: CORS });
    const json = (b, st) => r.fulfill({ status: st, headers: { ...CORS, 'content-type': 'application/json' }, body: JSON.stringify(b) });
    if ((q.postData() || '') === '{}') return json({ error: 'peticion' }, 400);
    return json({ error: 'claude', estado: 400, tipo: 'invalid_request_error', motivo: 'Request contains an invalid argument.' }, 400);
  });
  page.on('dialog', (d) => d.accept());
  await crearCuenta(page);
  await quitarCapas(page);
  await meterCartera(page);
  await page.evaluate(() => { S.acceso = 'publico'; LS.set('inv-acceso', { a: 'publico', uid: FB.user.uid, t: Date.now() }); guardarCfgAsesor({ auto: 'manual' }); });
  await expect.poll(() => page.evaluate(() => S.esDueno)).toBe(true);
  await page.evaluate(() => abrirAsesor('Una pregunta que falla', true));
  await expect(page.locator('#asCuerpo .as-error')).toBeVisible({ timeout: 20_000 });
  await expect.poll(() => page.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith('stub-fs:fallos_ia/')).length)).toBe(1);
  // el id lleva su cuenta y el día (las reglas ponen el tope de 5 al día con él); la hora, la del servidor; y caduca
  const [id, fallo] = await page.evaluate(() => { const k = Object.keys(localStorage).find((x) => x.startsWith('stub-fs:fallos_ia/')); return [k.split('/').pop(), JSON.parse(localStorage.getItem(k))]; });
  const uid = await page.evaluate(() => FB.user.uid);
  expect(id).toBe(`${uid}_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}_0`);
  expect(Object.keys(fallo).sort()).toEqual(['caduca', 'donde', 'estado', 'modelo', 't', 'tipo', 'v']);
  expect(fallo.caduca.__ts - Date.now()).toBeGreaterThan(29 * 864e5);
  expect(JSON.stringify(fallo)).not.toContain('Una pregunta que falla');
  // un 400 sin «API key» es la petición, no la clave; el modelo de Claude no se apunta (las reglas solo aceptan los de Gemini)
  expect([fallo.tipo, fallo.donde, fallo.estado, fallo.modelo]).toEqual(['peticion', 'chat', 400, null]);
  expect(await page.evaluate(() => tipoFalloIA({ estado: 400, msg: 'API key not valid. Please pass a valid API key.' }))).toBe('clave');
  // lo que no es un fallo (el tope del día, el techo) no se apunta
  await page.evaluate(() => { LS.del(LS_CLAUDE_PAUSA); AS.cargando = false; });
  await context.unroute(WORKER);
  await context.route(WORKER, (r) => (r.request().method() === 'OPTIONS' ? r.fulfill({ status: 204, headers: CORS }) : r.fulfill({ status: 429, headers: { ...CORS, 'content-type': 'application/json' }, body: JSON.stringify({ error: 'techo' }) })));
  await page.evaluate(() => preguntarAsesor('Otra'));
  await expect(page.locator('#asCuerpo .as-error')).toHaveCount(2, { timeout: 20_000 });
  // sin conexión es cosa de quien pregunta: no se apunta; lo previsto (sin cupo para la revisión automática), tampoco
  await page.evaluate(() => avisarFalloIA(new Error('Failed to fetch'), 'chat'));
  await page.evaluate(() => avisarFalloIA(Object.assign(new Error('sin cupo'), { estado: 429, diario: true, previsto: true }), 'revision'));
  expect(await page.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith('stub-fs:fallos_ia/')).length)).toBe(1);
  // el segundo del día va al siguiente número; el sexto ya no entra y deja una hora de pausa
  for (let i = 0; i < 6; i++) await page.evaluate(() => avisarFalloIA({ estado: 503, message: 'saturado' }, 'chat'));
  expect(await page.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith('stub-fs:fallos_ia/')).length)).toBe(5);
  expect(await page.evaluate(() => LS.get('inv-fallos-ia', {}).pausa > Date.now())).toBe(true);

  await page.evaluate(() => { if (typeof cerrarAsesor === 'function') cerrarAsesor(); abrirAjustes(); });
  await page.locator('#aSaludIA').click();
  const hoja = page.locator('.salud-ia');
  await expect(hoja).toContainText('38 de 40', { timeout: 15_000 });
  await expect(hoja).toContainText('e-vendo-repsol');
  // 0.8.2d: lo que gasta la Action, solo con Claude (nada de cupos de Google ni de la muestra de los domingos)
  await expect(hoja).toContainText('Lo que ha gastado la Action en 24 h');
  await expect(hoja).toContainText('Muestra de los viernes, con Sonnet');
  await expect(hoja).not.toContainText(/Google|Gemini|(?<![\d.])3\.8(?![\d.])|domingos/);
});

// 0.7k: el TTL de Firestore pide facturación y el proyecto sigue en el plan gratis: los fallos caducados los borra el
// dueño al abrir la app, una vez al día
testDueno('Los fallos de GrowIA caducados los borra el dueño al abrir la app, una vez al día', async ({ page, context, errores }) => {
  await context.addInitScript(() => {
    try {
      if (location.protocol !== 'http:' || sessionStorage.getItem('__sembrado')) return;
      sessionStorage.setItem('__sembrado', '1');
      const doc = (dias) => JSON.stringify({ t: { __ts: Date.now() - 30 * 864e5 }, caduca: { __ts: Date.now() + dias * 864e5 }, tipo: 'google', estado: 503, modelo: null, donde: 'chat', v: '0.7j' });
      localStorage.setItem('stub-fs:fallos_ia/ajena_20260101_0', doc(-2));
      localStorage.setItem('stub-fs:fallos_ia/ajena_20260101_1', doc(-0.5));
      localStorage.setItem('stub-fs:fallos_ia/ajena_20260202_0', doc(10));
    } catch (e) {}
  });
  await crearCuenta(page);
  await quitarCapas(page);
  const quedan = () => page.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith('stub-fs:fallos_ia/')).map((k) => k.split('/').pop()).sort());
  // al entrar, el dueño borra los dos caducados y deja el que aún no
  await expect.poll(() => page.evaluate(() => S.esDueno)).toBe(true);
  await expect.poll(quedan).toEqual(['ajena_20260202_0']);
  expect(await page.evaluate(() => LS.get('inv-fallos-limpio'))).toBe(new Date().toISOString().slice(0, 10));
  // el mismo día no vuelve a mirar: uno que caduque después espera a mañana (o a la próxima apertura sin marca)
  await page.evaluate(() => localStorage.setItem('stub-fs:fallos_ia/ajena_20260203_0', JSON.stringify({ t: { __ts: Date.now() - 31 * 864e5 }, caduca: { __ts: Date.now() - 864e5 }, tipo: 'red', estado: null, modelo: null, donde: 'chat', v: '0.7j' })));
  await page.evaluate(() => limpiarFallosIA());
  expect(await quedan()).toEqual(['ajena_20260202_0', 'ajena_20260203_0']);
  await page.evaluate(() => { LS.del('inv-fallos-limpio'); return limpiarFallosIA(); });
  expect(await quedan()).toEqual(['ajena_20260202_0']);
});
