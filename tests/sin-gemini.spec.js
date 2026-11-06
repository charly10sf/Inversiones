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
  const quedan = await page.evaluate(() => ['MODELOS', 'MODELO_DEF', 'MODELO_RAPIDO', 'CADENA_IA', 'diaGoogle', 'agotadosIA', 'ordenIA', 'modeloVivo', 'marcarAgotado', 'horaRenuevaIA', 'esRapida', 'LS_CLAVE', 'PROV', 'fetchGoogle', 'errorGoogle', 'sumarTokensIA', 'resumenTiemposIA', 'contarPeticion', 'apuntarTiempoIA', 'LS_TIEMPOS', 'LS_LENTO', 'CAMPO_CLAVE']
    .filter((n) => { try { return typeof eval(n) !== 'undefined'; } catch (e) { return false; } }));
  expect(quedan).toEqual([]);
  // lo que eliges en Ajustes de la IA ya no tiene modelo de Google
  expect(Object.keys(await page.evaluate(() => cfgAsesor())).sort()).toEqual(['auto', 'web', 'webPedida']);
  // una clave y unos cupos de Gemini de antes, en cualquier perfil del dispositivo, se van al abrir la IA
  const fuera = await page.evaluate(async () => {
    for (const p of ['inv-', 'invL-', 'invC-']) { localStorage.setItem(p + 'asesor-clave-g', '"x"'); localStorage.setItem(p + 'ia-uso', '{}'); }
    localStorage.setItem('inv-ia-tiempos', '{}');
    // lo que sigue en uso se queda
    LS.set('inv-ia-tokens', [{ t: 1, m: {} }]); LS.set('inv-ia-motor', 'haiku');
    AS.cargada = false; await cargarAsesor();
    return [Object.keys(localStorage).filter((k) => /asesor-clave|ia-uso|ia-agotados|ia-tiempos|ia-lento/.test(k)), LS.get('inv-ia-tokens') != null, LS.get('inv-ia-motor')];
  });
  expect(fuera).toEqual([[], true, 'haiku']);
  // en lo que recibe la IA de una empresa del radar, lo leído de su prensa va como prensa_leida_por_la_ia, no «por_gemini»
  await page.waitForFunction(() => radarVals().length, null, { timeout: 45_000 });
  const emp = await page.evaluate(() => { const x = radarVals().find((r) => !(S.M || calcular()).filas.some((f) => f.inst && f.inst.nombre === r.n)) || radarVals()[0]; return JSON.stringify(hBuscarEmpresa({ consulta: x.s })); });
  expect(emp).toContain('prensa_leida_por_la_ia');
  expect(emp).not.toContain('prensa_leida_por_gemini');
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
    // el formato de la sesión 4 (escaneo.ia): un fallo suelto no se avisa; apagada, sí
    S.escaneo = { ...(guardado || {}), ia: { activo: true, ok: false, apagado: false, errores: ['lote 3: 529'] } };
    r.suelto = avisoPrensaIA();
    S.escaneo = { ...(guardado || {}), ia: { activo: true, ok: false, apagado: true, errores: ['saldo'] } };
    r.ia = avisoPrensaIA();
    // mientras la Action tenga a Gemini de reserva: si Claude falla pero Gemini lee, la prensa está leída
    S.escaneo = { ...(guardado || {}), claude: { activo: true, apagado: true, errores: ['401'] }, gemini: { ok: true, con_clave: true } };
    r.reserva = avisoPrensaIA();
    S.escaneo = { ...(guardado || {}), claude: { activo: true, apagado: true, errores: ['HTTP 401 invalid x-api-key'] }, gemini: { ok: false, con_clave: true } };
    S.esDueno = true; r.dueno = avisoPrensaIA();
    S.esDueno = false; S.noDueno = true; r.otro = avisoPrensaIA();
    S.escaneo = { ...(guardado || {}), claude: { activo: false } };
    S.esDueno = true; S.noDueno = false; r.sinClave = avisoPrensaIA();
    S.escaneo = guardado; S.esDueno = dueno; delete S.noDueno;
    return r;
  });
  // con Claude bien, que Gemini falle no cuenta; con Claude mal y Gemini leyendo, tampoco se avisa
  expect(avisos.bien).toBe('');
  expect(avisos.reserva).toBe('');
  expect(avisos.suelto).toBe('');
  expect(avisos.ia).toContain('no ha podido leer la prensa');
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
    S.escaneo = { ia: { uso: [una], coste_24h: 0.0123 }, gemini: { uso: [una, { t: ahora, m: 'gemini-3.8-flash', in: 5, out: 5 }, { ...una, t: viejo }] } };
    const h = htmlGastoAction();
    // dentro del mismo campo, dos respuestas iguales de un lote cuentan las dos
    S.escaneo = { gemini: { uso: [una, una, null, 'x'] } };
    const h2 = htmlGastoAction();
    // un banco de Gemini que quede en la rama datos ya no se enseña
    const b = htmlBancoIA({ modelo: 'gemini-3.5-flash-lite', total: 40, bien: 30, generado: ahora }, 'Banco');
    S.escaneo = guardado;
    return [h, h2, b];
  });
  expect(html[0]).toContain('Haiku 5.5');
  expect(html[0]).toContain('<b>1</b> llamada');
  expect(html[0]).toContain('1 por lotes');
  expect(html[0]).toContain('0,01 US$');
  expect(html[0]).not.toMatch(/Gemini|3\.8|Google/);
  expect(html[1]).toContain('<b>2</b> llamadas');
  expect(html[2]).toContain('de antes de Claude');
  expect(html[2]).not.toContain('30 de 40');
});
