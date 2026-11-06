// 0.8.2d · todo con Claude, sesión 5: en la app no queda nada de Gemini. Ni sus modelos ni los cupos de Google, la clave
// que cada uno guardaba se borra al abrir la IA, «Cómo va la IA» cuenta lo que gasta la Action con Claude y el aviso de la
// frescura (la IA no ha podido leer la prensa) va con lo que escribe la Action de Claude, sin hablar de GEMINI_API_KEY.
import { test as base, expect } from '@playwright/test';
import { preparar, crearCuenta, meterCartera, quitarCapas } from './ayuda.js';

const test = base.extend({
  errores: async ({ context }, use) => {
    const errores = await preparar(context, { ajustes: { 'stub-dueno': 'lucia@prueba.com' } });
    await use(errores);
    expect(errores, 'errores de JavaScript en la página').toEqual([]);
  },
});
test.beforeEach(({}, info) => test.skip(info.project.name !== 'movil', 'en el móvil'));

test('no queda nada de Gemini en la app y la clave de Google de antes se borra al abrir la IA', async ({ page, errores }) => {
  await crearCuenta(page);
  await meterCartera(page);
  await quitarCapas(page);
  const quedan = await page.evaluate(() => ['MODELOS', 'MODELO_DEF', 'MODELO_RAPIDO', 'CADENA_IA', 'diaGoogle', 'agotadosIA', 'ordenIA', 'modeloVivo', 'marcarAgotado', 'horaRenuevaIA', 'esRapida', 'LS_CLAVE', 'PROV', 'fetchGoogle', 'errorGoogle', 'sumarTokensIA', 'resumenTiemposIA']
    .filter((n) => { try { return typeof eval(n) !== 'undefined'; } catch (e) { return false; } }));
  expect(quedan).toEqual([]);
  // lo que eliges en Ajustes de la IA ya no tiene modelo de Google
  expect(Object.keys(await page.evaluate(() => cfgAsesor())).sort()).toEqual(['auto', 'web', 'webPedida']);
  // una clave y unos cupos de Gemini de antes, en cualquier perfil del dispositivo, se van al abrir la IA
  const fuera = await page.evaluate(async () => {
    for (const p of ['inv-', 'invL-', 'invC-']) { localStorage.setItem(p + 'asesor-clave-g', '"x"'); localStorage.setItem(p + 'ia-uso', '{}'); }
    localStorage.setItem('inv-ia-tiempos', '{}');
    AS.cargada = false; await cargarAsesor();
    return Object.keys(localStorage).filter((k) => /asesor-clave|ia-uso|ia-agotados|ia-tiempos|ia-lento/.test(k));
  });
  expect(fuera).toEqual([]);
  // en la foto que se manda a la IA, lo leído de la prensa ya no dice «gemini»
  expect(await page.evaluate(() => (String(contextoAsesor(S.M || calcular(), 'completo', true)).match(/.{0,60}(?<!cap)gemini.{0,60}/gi) || []))).toEqual([]);
});

test('el aviso de la frescura va con la Action de Claude: sin GEMINI_API_KEY y el porqué solo para el dueño', async ({ page, errores }) => {
  await crearCuenta(page);
  await meterCartera(page);
  await quitarCapas(page);
  const avisos = await page.evaluate(() => {
    const guardado = S.escaneo, dueno = S.esDueno, r = {};
    S.escaneo = { ...(guardado || {}), claude: { activo: true, apagado: false, errores: [] }, gemini: { ok: false, con_clave: false, errores: ['429'] } };
    r.bien = avisoPrensaIA();
    S.escaneo = { ...(guardado || {}), claude: { activo: true, apagado: true, errores: ['HTTP 401 invalid x-api-key'] } };
    S.esDueno = true; r.dueno = avisoPrensaIA();
    S.esDueno = false; S.noDueno = true; r.otro = avisoPrensaIA();
    S.escaneo = { ...(guardado || {}), claude: { activo: false } };
    S.esDueno = true; S.noDueno = false; r.sinClave = avisoPrensaIA();
    S.escaneo = guardado; S.esDueno = dueno; delete S.noDueno;
    return r;
  });
  // que Gemini falle ya no cuenta: manda lo que diga Claude
  expect(avisos.bien).toBe('');
  expect(avisos.dueno).toContain('no ha podido leer la prensa');
  expect(avisos.dueno).toContain('Anthropic no acepta la clave del radar');
  expect(avisos.otro).toContain('no ha podido leer la prensa');
  expect(avisos.otro).not.toContain('Anthropic');
  expect(avisos.sinClave).toContain('ANTHROPIC_RADAR_KEY');
  for (const t of Object.values(avisos)) expect(t).not.toMatch(/GEMINI|Google|cupo/);
});

test('«Cómo va la IA»: lo que gasta la Action se cuenta con las llamadas a Claude de 24 h, una vez cada una', async ({ page, errores }) => {
  await crearCuenta(page);
  await quitarCapas(page);
  const html = await page.evaluate(async () => {
    await cargarTrozo('salud');
    const ahora = new Date().toISOString(), viejo = new Date(Date.now() - 2 * 864e5).toISOString();
    const una = { t: ahora, m: 'claude-haiku-5-5', que: 'lote', in: 1000, out: 200, lote: true };
    const guardado = S.escaneo;
    // la misma llamada en dos campos (mientras la Action cambia de formato) cuenta una vez; las de Gemini y las viejas, no
    S.escaneo = { claude: { uso: [una] }, gemini: { uso: [una, { t: ahora, m: 'gemini-3.8-flash', in: 5, out: 5 }, { ...una, t: viejo }] } };
    const h = htmlGastoAction();
    S.escaneo = guardado;
    return h;
  });
  expect(html).toContain('Haiku 5.5');
  expect(html).toContain('<b>1</b> llamada');
  expect(html).toContain('1 por lotes');
  expect(html).not.toMatch(/Gemini|3\.8|Google/);
});
