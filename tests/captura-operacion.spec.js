// 0.9e · apuntar una compra o una venta con la captura del justificante del bróker. El caso es el de Carlos del 19 nov:
// el reembolso de 4,226 participaciones del Neuberger Berman Short Duration (nb-short) en MyInvestor, a 118,18 €, con
// 3,13 € de retención y un resultado fiscal de 16,45 € según el bróker. La IA (Claude, por el Worker) es de imitación.
import { test as base, expect } from '@playwright/test';
import { preparar, crearCuenta, meterCartera, quitarCapas } from './ayuda.js';

const test = base.extend({
  errores: [async ({ context }, use) => {
    const errores = await preparar(context, { ajustes: { 'stub-verificar': '1' } });
    await use(errores);
    expect(errores, 'errores de JavaScript en la página').toEqual([]);
  }, { auto: true }],
});
test.beforeEach(({}, info) => test.skip(info.project.name !== 'movil', 'solo en el móvil'));

const WORKER = 'https://growfolio.growfolio-web-app.workers.dev/claude';
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Authorization, Content-Type', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS' };
const ev = (tipo, datos) => `event: ${tipo}\ndata: ${JSON.stringify({ type: tipo, ...datos })}\n\n`;
function stream(texto) {
  let s = ev('message_start', { message: { id: 'msg_1', type: 'message', role: 'assistant', content: [], model: 'claude-sonnet-5-5', stop_reason: null, usage: { input_tokens: 900, output_tokens: 1 } } });
  s += ev('content_block_start', { index: 0, content_block: { type: 'text', text: '' } });
  for (const t of texto.match(/.{1,20}/gs)) s += ev('content_block_delta', { index: 0, delta: { type: 'text_delta', text: t } });
  s += ev('content_block_stop', { index: 0 });
  s += ev('message_delta', { delta: { stop_reason: 'end_turn', stop_sequence: null }, usage: { output_tokens: 200 } });
  return s + ev('message_stop', {});
}
async function worker(context, respuesta) {
  const visto = { peticiones: [] };
  await context.route(WORKER, async (r) => {
    const q = r.request();
    if (q.method() === 'OPTIONS') return r.fulfill({ status: 204, headers: CORS });
    const texto = q.postData() || '';
    if (texto === '{}') return r.fulfill({ status: 400, headers: { ...CORS, 'content-type': 'application/json' }, body: JSON.stringify({ error: 'peticion', motivo: 'modelo' }) });
    visto.peticiones.push(JSON.parse(texto));
    return r.fulfill({ status: 200, headers: { ...CORS, 'content-type': 'text/event-stream' }, body: stream(JSON.stringify(respuesta)) });
  });
  return visto;
}
const VENTA_NB = {
  tipo: 'venta', plataforma: null, nombre: 'Neuberger Berman Short Duration Euro Bond Fund Class EUR I Accumulating', isin: 'IE00BFZMJT78', ticker: null, tipoActivo: 'Fondo',
  fecha_orden: '2026-11-18', hora_orden: '06:58', fecha_ejecucion: '2026-11-19', hora_ejecucion: '00:59',
  cantidad: 4.226, precio: 118.18, moneda: 'EUR', bruto: 499.42, comisiones: 0, retencion: 3.13, neto: 496.29, resultado: 16.45, estado: 'ejecutada',
};
// una imagen cualquiera: lo que importa es lo que contesta la IA de imitación
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');

async function preparada(page) {
  page.dialogos = [];
  page.on('dialog', (d) => { page.dialogos.push(d.message()); return d.accept(); });
  await crearCuenta(page);
  await quitarCapas(page);
  await meterCartera(page);
  await page.evaluate(() => { S.acceso = 'publico'; LS.set('inv-acceso', { a: 'publico', uid: FB.user.uid, t: Date.now() }); });
}

test('lo leído se limpia y se comprueba: fecha del valor liquidativo, cifras que cuadran y lo que no', async ({ page }) => {
  await preparada(page);
  const r = await page.evaluate(async (v) => {
    await cargarTrozo('importar');
    const ok = operacionDeLectura(v, '2026-11-19');
    const raras = operacionDeLectura({ ...v, isin: 'IE00BFZMJT79', bruto: 600, neto: 400, moneda: 'usd', fecha_orden: '2026-12-01', fecha_ejecucion: null }, '2026-11-19');
    const traspaso = operacionDeLectura({ ...v, tipo: 'Traspaso entre fondos' }, '2026-11-19');
    const suscripcion = operacionDeLectura({ tipo: 'Suscripción', cantidad: '10,5', precio: 20, comisiones: null, fecha_ejecucion: '2026-11-10' }, '2026-11-19');
    return { ok, raras, traspaso, suscripcion };
  }, VENTA_NB);
  // la orden del 18 se ejecutó a la 1 de la madrugada del 19 con el valor del 18: cuenta el 18
  expect(r.ok).toMatchObject({ tipo: 'venta', fecha: '2026-11-18', isin: 'IE00BFZMJT78', uds: 4.226, precio: 118.18, bruto: 499.42, gastos: 0, retencion: 3.13, neto: 496.29, resultado: 16.45, dudas: [] });
  // ISIN con el dígito de control mal, importes que no cuadran, otra moneda y fecha futura: todo a las dudas
  expect(r.raras.isin).toBeNull();
  expect(r.raras.fecha).toBe('2026-11-19');
  expect(r.raras.dudas.join(' ')).toMatch(/ISIN/);
  expect(r.raras.dudas.join(' ')).toMatch(/no dan el importe/);
  expect(r.raras.dudas.join(' ')).toMatch(/neto no cuadra/);
  expect(r.raras.dudas.join(' ')).toMatch(/USD/);
  expect(r.raras.dudas.join(' ')).toMatch(/futura/);
  expect(r.traspaso.tipo).toBe('traspaso');
  expect(r.traspaso.dudas[0]).toMatch(/traspaso/);
  // una suscripción es una compra; el bruto sale de cuántas por el precio
  expect(r.suscripcion).toMatchObject({ tipo: 'compra', uds: 10.5, bruto: 210, gastos: 0, fecha: '2026-11-10' });
});

test('una venta desde la captura: rellena el formulario, avisa si el resultado no cuadra con el bróker y se apunta con sus céntimos', async ({ page, context }) => {
  await preparada(page);
  const w = await worker(context, VENTA_NB);
  await page.evaluate(() => operacion('compra'));
  await expect(page.locator('#opCap')).toBeVisible();
  await page.locator('#opCapArch').setInputFiles({ name: 'orden.png', mimeType: 'image/png', buffer: PNG });
  // pasa a Venta, con el fondo que ya tenía y las cifras de la captura
  await expect(page.locator('#opLeida')).toContainText('Rellenado con tu captura', { timeout: 20_000 });
  await expect(page.locator('[data-t="venta"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.op-pos[aria-pressed="true"]')).toHaveAttribute('data-pid', 'p4');   // nb-short
  await expect(page.locator('#fOp [name="uds"]')).toHaveValue('4,226');
  await expect(page.locator('#fOp [name="precio"]')).toHaveValue('118,18');
  await expect(page.locator('#fOp [name="importe"]')).toHaveValue('499,42');
  await expect(page.locator('#fOp [name="fecha"]')).toHaveValue('2026-11-18');
  // en la cartera de prueba costaron 125,67 € cada una: Toisón dice pérdida y el bróker ganancia, y se avisa
  await expect(page.locator('#calc')).toContainText('Tu bróker dice');
  await expect(page.locator('#calc')).toContainText('Llega a tu cuenta');
  await expect(page.locator('#calc')).toContainText('496,29');
  // se lee con Claude como tarea «importar», con la imagen y sin pedir cuentas ni DNI
  expect(w.peticiones.length).toBe(1);
  const c = w.peticiones[0];
  expect(c.tarea).toBe('importar');
  expect(JSON.stringify(c.messages)).toContain('image');
  expect(JSON.stringify(c.messages)).toContain('No pongas el número de cuenta');
  expect(page.dialogos.length).toBe(1);
  expect(page.dialogos[0]).toContain('Anthropic');

  const ef0 = await page.evaluate(() => ((S.cartera.efectivo || []).find((e) => e.plataforma === 'MyInvestor') || {}).importe || 0);
  // si el precio se aleja del de ese día, la app pide pulsar otra vez: se pulsa hasta que se apunta (como mucho dos veces)
  for (let k = 0; k < 2; k++) {
    await page.locator('#bOp').click();
    if (await page.evaluate(() => (S.cartera.movimientos || []).some((m) => m.captura))) break;
  }
  const m = await page.evaluate(() => S.cartera.movimientos.find((x) => x.captura));
  expect(m).toMatchObject({ tipo: 'venta', instrumento: 'nb-short', plataforma: 'MyInvestor', fecha: '2026-11-18', uds: 4.226, precio: 118.18, gastos: 0, importe: 499.42, retenido: 3.13 });
  expect(m.coste_vendido).toBeCloseTo(4.226 * (3770 / 30), 1);
  // al efectivo va lo que llegó de verdad: el neto, ya sin la retención
  const ef1 = await page.evaluate(() => ((S.cartera.efectivo || []).find((e) => e.plataforma === 'MyInvestor') || {}).importe || 0);
  expect(+(ef1 - ef0).toFixed(2)).toBe(496.29);
  expect(await page.evaluate(() => S.cartera.posiciones.find((p) => p.instrumento === 'nb-short').cantidad)).toBeCloseTo(30 - 4.226, 6);

  // la misma captura otra vez: avisa de que ya está apuntada
  await page.evaluate(() => operacion('venta'));
  await page.locator('#opCapArch').setInputFiles({ name: 'orden.png', mimeType: 'image/png', buffer: PNG });
  await expect(page.locator('#opLeida')).toContainText('Rellenado con tu captura', { timeout: 20_000 });
  await page.locator('#bOp').click();
  const errTxt = async () => page.locator('#errOp').textContent();
  if (/valía/.test(await errTxt())) await page.locator('#bOp').click();
  await expect(page.locator('#errOp')).toContainText('Ya tienes apuntada esta venta');
});

test('una compra de algo que no se encuentra: lo dice y deja buscarlo; sin cuenta, no se lee nada', async ({ page, context }) => {
  await preparada(page);
  await worker(context, { tipo: 'compra', plataforma: 'Trade Republic', nombre: 'Empresa Inventada Zeta', isin: null, cantidad: 3, precio: 10, bruto: 30, comisiones: 1, neto: 31, fecha_ejecucion: '2026-11-17', estado: 'ejecutada' });
  await page.evaluate(() => operacion('venta'));
  await page.locator('#opCapArch').setInputFiles({ name: 'compra.png', mimeType: 'image/png', buffer: PNG });
  await expect(page.locator('#opLeida')).toContainText('No encuentro «Empresa Inventada Zeta»', { timeout: 20_000 });
  await expect(page.locator('[data-t="compra"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#opQue input')).toBeVisible();
  await expect(page.locator('#fOp [name="gastos"]')).toHaveValue('1');
  await expect(page.locator('#opPlat [aria-pressed="true"]')).toHaveText('Trade Republic');
  // en «Ya la tenías» no sale
  await page.locator('[data-t="tengo"]').click();
  await expect(page.locator('#opCap')).toBeHidden();
  // sin sesión, la IA no lee y lo dice en el formulario
  await page.evaluate(() => document.querySelector('#fOp [data-cerrar]').click());
  await expect(page.locator('#fOp')).toHaveCount(0);
  await page.evaluate(() => { FB.user = null; operacion('compra'); });
  await page.locator('#opCapArch').setInputFiles({ name: 'compra.png', mimeType: 'image/png', buffer: PNG });
  await expect(page.locator('#opCapEst')).toContainText('Con tu cuenta', { timeout: 10_000 });
});
