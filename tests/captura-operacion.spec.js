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
    // revisión aparte: cifras con coma de miles a la inglesa, la tasa aparte en el neto y otra moneda sin precios
    const ingles = operacionDeLectura({ tipo: 'compra', cantidad: '100', precio: '12.505', bruto: '1,250.50', comisiones: 1, tasas: 2.5, neto: 1254, fecha_ejecucion: '2026-11-10' }, '2026-11-19');
    const dolares = operacionDeLectura({ tipo: 'venta', cantidad: 2, precio: 150, bruto: 300, comisiones: 1, retencion: 4, neto: 295, resultado: 20, moneda: 'USD', fecha_ejecucion: '2026-11-10' }, '2026-11-19');
    return { ok, raras, traspaso, suscripcion, ingles, dolares };
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
  expect(r.ingles).toMatchObject({ bruto: 1250.5, gastos: 1, tasas: 2.5, dudas: [] });
  // en dólares solo valen las unidades: nada de precios, comisión, retención ni resultado en las casillas de euros
  expect(r.dolares).toMatchObject({ uds: 2, precio: null, bruto: null, neto: null, resultado: null, gastos: 0, retencion: 0 });
  expect(r.dolares.dudas.join(' ')).toMatch(/USD/);
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
  await worker(context, { tipo: 'compra', plataforma: 'Trade Republic', nombre: 'Empresa Inventada Zeta', isin: null, cantidad: 3, precio: 10, bruto: 30, comisiones: 1, tasas: 0.06, neto: 31.06, fecha_ejecucion: '2026-11-17', estado: 'ejecutada' });
  await page.evaluate(() => operacion('venta'));
  await page.locator('#opCapArch').setInputFiles({ name: 'compra.png', mimeType: 'image/png', buffer: PNG });
  await expect(page.locator('#opLeida')).toContainText('No encuentro «Empresa Inventada Zeta»', { timeout: 20_000 });
  await expect(page.locator('[data-t="compra"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#opQue input')).toBeVisible();
  // sin saber qué es, Toisón no puede poner la tasa: va con la comisión para que cuente en el coste
  await expect(page.locator('#fOp [name="gastos"]')).toHaveValue('1,06');
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

test('revisión aparte: la tasa no se cuenta dos veces y una venta que no se encuentra no se queda en otro fondo', async ({ page, context }) => {
  await preparada(page);
  // una acción con la tasa de compra que Toisón ya suma sola (como la Tobin): la del Reino Unido, que no mira el tamaño
  const acc = await page.evaluate(() => {
    const id = Object.keys(S.inst).find((k) => S.inst[k].tipo === 'Acción' && isinValido(String(S.inst[k].isin || '')));
    S.inst[id].pais = 'GB'; delete S.inst[id].bolsa;
    return { id, isin: S.inst[id].isin, nombre: S.inst[id].nombre };
  });
  await worker(context, { tipo: 'compra', plataforma: 'MyInvestor', nombre: acc.nombre, isin: acc.isin, cantidad: 10, precio: 20, bruto: 200, comisiones: 2, tasas: 1, neto: 203, fecha_ejecucion: '2026-11-17', estado: 'ejecutada' });
  await page.evaluate(() => operacion('compra'));
  await page.locator('#opCapArch').setInputFiles({ name: 'compra.png', mimeType: 'image/png', buffer: PNG });
  await expect(page.locator('#opLeida')).toContainText('Rellenado con tu captura', { timeout: 20_000 });
  await expect(page.locator('#fOp [name="gastos"]')).toHaveValue('2');
  for (let k = 0; k < 3; k++) {
    await page.locator('#bOp').click();
    if (await page.evaluate(() => (S.cartera.movimientos || []).some((m) => m.captura))) break;
  }
  const m = await page.evaluate(() => S.cartera.movimientos.find((x) => x.captura));
  expect(m.gastos).toBe(2);
  expect(m.tasa).toBe(1);
  expect(m.importe).toBe(203);

  // la hoja se abre vendiendo nb-short, pero la captura es de otro fondo que no está: no se queda nb-short
  await page.evaluate(() => document.querySelector('#fOp [data-cerrar]') && document.querySelector('#fOp [data-cerrar]').click());
  await context.unroute('https://growfolio.growfolio-web-app.workers.dev/claude');
  await worker(context, { ...VENTA_NB, nombre: 'Fondo Que No Tengo', isin: 'LU0000000000' });
  await page.evaluate(() => operacion('venta', 'p4'));
  await page.locator('#opCapArch').setInputFiles({ name: 'orden.png', mimeType: 'image/png', buffer: PNG });
  await expect(page.locator('#opLeida')).toContainText('No encuentro «Fondo Que No Tengo»', { timeout: 20_000 });
  await expect(page.locator('.op-pos[aria-pressed="true"]')).toHaveCount(0);
  await expect(page.locator('#calc')).toContainText('Elige primero qué');
});

test('0.9f: varias capturas de la misma orden, a la vez o de una en una, hasta 10, y aviso si falta la otra', async ({ page, context }) => {
  await preparada(page);
  // la primera lectura dice que falta parte (como la primera pantalla de MyInvestor); las siguientes, ya completa
  let n = 0;
  const visto = { peticiones: [] };
  await context.route(WORKER, async (r) => {
    const q = r.request();
    if (q.method() === 'OPTIONS') return r.fulfill({ status: 204, headers: CORS });
    const texto = q.postData() || '';
    if (texto === '{}') return r.fulfill({ status: 400, headers: { ...CORS, 'content-type': 'application/json' }, body: JSON.stringify({ error: 'peticion', motivo: 'modelo' }) });
    visto.peticiones.push(JSON.parse(texto));
    const resp = n++ === 0 ? { ...VENTA_NB, precio: null, retencion: null, neto: null, resultado: null, falta: 'el valor liquidativo y la retención' } : { ...VENTA_NB, falta: null };
    return r.fulfill({ status: 200, headers: { ...CORS, 'content-type': 'text/event-stream' }, body: stream(JSON.stringify(resp)) });
  });
  const imagenes = (k) => (visto.peticiones[k].messages || []).flatMap((m) => (Array.isArray(m.content) ? m.content : [])).filter((b) => b && b.type === 'image').length;
  const png = (i) => ({ name: `orden-${i}.png`, mimeType: 'image/png', buffer: PNG });
  await page.evaluate(() => operacion('venta'));
  await expect(page.locator('#opCap')).toContainText('hasta 10');
  // una sola: lee y avisa de que la orden sigue en otra captura
  await page.locator('#opCapArch').setInputFiles([png(1)]);
  await expect(page.locator('#opLeida')).toContainText('sigue en otra captura', { timeout: 20_000 });
  await expect(page.locator('#opCapEst')).toContainText('1 captura leída');
  // «Añadir otra de esta orden»: se leen las dos juntas y el aviso se va
  await page.locator('#opCapEst [data-cap="mas"]').click();
  await page.locator('#opCapArch').setInputFiles([png(2)]);
  await expect(page.locator('#opLeida')).toContainText('Rellenado con tus 2 capturas', { timeout: 20_000 });
  await expect(page.locator('#opLeida')).not.toContainText('sigue en otra captura');
  expect(imagenes(1)).toBe(2);
  await expect(page.locator('#fOp [name="precio"]')).toHaveValue('118,18');
  // «Empezar de cero» y 11 de golpe: se leen las 10 primeras y lo dice
  await page.locator('#opCapEst [data-cap="cero"]').click();
  await expect(page.locator('#opLeida')).toBeEmpty();
  await page.locator('#opCapArch').setInputFiles(Array.from({ length: 11 }, (_, i) => png(i)));
  await expect(page.locator('#opCapEst')).toContainText('10 capturas leídas', { timeout: 20_000 });
  await expect(page.locator('#opCapEst')).toContainText('Como mucho 10');
  await expect(page.locator('#opCapEst [data-cap="mas"]')).toHaveCount(0);
  expect(imagenes(2)).toBe(10);
  // el botón grande empieza otra tanda (no suma a las de antes)
  const [elegir] = await Promise.all([page.waitForEvent('filechooser'), page.locator('#opCap').click()]);
  expect(elegir.isMultiple()).toBe(true);
  await elegir.setFiles([png(1), png(2)]);
  await expect(page.locator('#opCapEst')).toContainText('2 capturas leídas', { timeout: 20_000 });
});

test('0.9f: diez capturas grandes se encogen hasta caber en lo que admite el Worker', async ({ page }) => {
  await preparada(page);
  const r = await page.evaluate(async () => {
    await cargarTrozo('importar');
    // una captura de móvil «ruidosa» de 1200×2600 (las de verdad pesan menos: es el peor caso)
    const c = document.createElement('canvas'); c.width = 1200; c.height = 2600;
    const x = c.getContext('2d'), d = x.createImageData(1200, 2600);
    for (let i = 0; i < d.data.length; i += 4) { d.data[i] = (i * 13) % 251; d.data[i + 1] = (i * 7) % 241; d.data[i + 2] = (i * 3) % 239; d.data[i + 3] = 255; }
    x.putImageData(d, 0, 0);
    const data = c.toDataURL('image/jpeg', 0.95).split(',')[1];
    const arch = Array.from({ length: 10 }, () => ({ mime: 'image/jpeg', data }));
    const antes = arch.reduce((n, a) => n + a.data.length, 0);
    const despues = (await capturasQueCaben(arch)).reduce((n, a) => n + a.data.length, 0);
    return { antes, despues };
  });
  expect(r.antes).toBeGreaterThan(2.2e6);
  expect(r.despues).toBeLessThanOrEqual(2.2e6);
});
