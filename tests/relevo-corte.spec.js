// 0.8.3d · El corte del gasto del relevo (relevo/corte/servidor.mjs), sin navegador: Google de imitación (metadata y
// Cloud Billing) detrás. Se comprueba que con el gasto por debajo del tope no hace nada; que al llegar al tope quita la
// facturación del proyecto (y solo de ese); que si ya no la tenía no la toca; que un aviso ilegible no se repite sin fin;
// y que si no puede quitarla contesta 500 para que Pub/Sub lo vuelva a mandar.
import { test, expect } from '@playwright/test';
import { crearCorte, leerAviso, avisoViejo } from '../relevo/corte/servidor.mjs';

test.beforeEach(({}, info) => test.skip(info.project.name !== 'movil', 'una vez basta'));

const mesActual = () => { const h = new Date(); return new Date(Date.UTC(h.getUTCFullYear(), h.getUTCMonth(), 1)).toISOString(); };
// como lo manda Google: el gasto acumulado del mes, desde el día 1, y la hora de publicación de Pub/Sub
const aviso = (gasto, tope = 5, { publicado = new Date().toISOString(), desde = mesActual() } = {}) => JSON.stringify({ message: { data: Buffer.from(JSON.stringify({ budgetDisplayName: 'relevo', costAmount: gasto, costIntervalStart: desde, budgetAmount: tope, budgetAmountType: 'SPECIFIED_AMOUNT', currencyCode: 'EUR' })).toString('base64'), publishTime: publicado }, subscription: 'x' });

function google({ conFacturacion = true, fallaQuitar = false, leer = 200 } = {}) {
  const visto = [];
  const pedir = async (url, init = {}) => {
    visto.push({ url, metodo: init.method || 'GET', cuerpo: init.body || '', auth: (init.headers || {}).Authorization || '' });
    if (url.startsWith('http://metadata')) return new Response(JSON.stringify({ access_token: 'tok' }), { status: 200 });
    if ((init.method || 'GET') === 'GET') return new Response(JSON.stringify(leer === 200 ? { billingEnabled: conFacturacion } : { error: {} }), { status: leer });
    return new Response('{}', { status: fallaQuitar ? 403 : 200 });
  };
  return { visto, pedir };
}
async function montar(g, opciones = {}) {
  const lineas = [];
  const s = crearCorte({ proyecto: 'toison-relevo', pedir: g.pedir, registrar: (x) => lineas.push(x), ...opciones });
  const url = await new Promise((ok) => s.listen(0, '127.0.0.1', () => ok(`http://127.0.0.1:${s.address().port}`)));
  return { url, lineas, cerrar: () => s.close() };
}
const mandar = (url, cuerpo) => fetch(url, { method: 'POST', body: cuerpo, headers: { 'Content-Type': 'application/json' } });

test('lee el aviso del presupuesto que manda Pub/Sub', () => {
  expect(leerAviso(aviso(1.23))).toMatchObject({ gasto: 1.23, tope: 5, moneda: 'EUR' });
  expect(leerAviso('no es json')).toBeNull();
  expect(leerAviso(JSON.stringify({ message: { data: 'aaaa' } }))).toBeNull();
});

test('por debajo del tope no hace nada; al llegar, quita la facturación de su proyecto', async () => {
  const g = google(), m = await montar(g);
  try {
    expect((await mandar(m.url, aviso(4.99))).status).toBe(204);
    expect(g.visto, 'ni pregunta a Google').toEqual([]);
    expect((await mandar(m.url, aviso(5.01))).status).toBe(204);
    const quitar = g.visto.find((v) => v.metodo === 'PUT');
    expect(quitar.url).toBe('https://cloudbilling.googleapis.com/v1/projects/toison-relevo/billingInfo');
    expect(JSON.parse(quitar.cuerpo)).toEqual({ billingAccountName: '' });
    expect(quitar.auth).toBe('Bearer tok');
    expect(m.lineas.at(-1)).toContain('cortado');
  } finally { m.cerrar(); }
});

test('con TOPE propio manda el TOPE, no el del presupuesto; si ya no tenía facturación, no la toca', async () => {
  const g = google({ conFacturacion: false }), m = await montar(g, { tope: 2 });
  try {
    expect((await mandar(m.url, aviso(1.5))).status).toBe(204);
    expect(g.visto).toEqual([]);
    expect((await mandar(m.url, aviso(2.5))).status).toBe(204);
    expect(g.visto.some((v) => v.metodo === 'PUT')).toBe(false);
    expect(m.lineas.at(-1)).toContain('ya');
  } finally { m.cerrar(); }
});

test('un aviso ilegible no se repite; si no puede quitar la facturación, 500 para que Pub/Sub insista; solo POST', async () => {
  const g = google({ fallaQuitar: true }), m = await montar(g);
  try {
    expect((await mandar(m.url, '{"message":{}}')).status).toBe(204);
    expect((await mandar(m.url, aviso(9))).status).toBe(500);
    expect((await fetch(m.url)).status).toBe(404);
  } finally { m.cerrar(); }
});

test('si no puede leer si tiene facturación (sin el papel de Navegador, 403), la quita igual', async () => {
  const g = google({ leer: 403 }), m = await montar(g);
  try {
    expect((await mandar(m.url, aviso(5))).status).toBe(204);
    expect(g.visto.some((v) => v.metodo === 'PUT')).toBe(true);
    expect(m.lineas.at(-1)).toContain('cortado');
  } finally { m.cerrar(); }
});

test('no hace caso a los avisos viejos ni a los de otro mes (al volver a poner la facturación no la quita otra vez)', async () => {
  const g = google(), m = await montar(g);
  try {
    const hace2h = new Date(Date.now() - 2 * 3600e3).toISOString();
    expect((await mandar(m.url, aviso(7, 5, { publicado: hace2h }))).status).toBe(204);
    expect((await mandar(m.url, aviso(7, 5, { desde: '2020-01-01T08:00:00Z' }))).status).toBe(204);
    expect(g.visto, 'ni pregunta a Google').toEqual([]);
    expect(m.lineas.every((x) => x.includes('viejo'))).toBe(true);
    expect(avisoViejo({ cuando: Date.now() - 60e3, desde: Date.parse(mesActual()) })).toBe(false);
  } finally { m.cerrar(); }
});

test('un TOPE que no es un número no arranca (si no, nunca cortaría)', () => {
  expect(() => crearCorte({ proyecto: 'p', tope: Number('cinco') })).toThrow(/TOPE/);
  expect(() => crearCorte({ proyecto: 'p', tope: 0 })).toThrow(/TOPE/);
});
