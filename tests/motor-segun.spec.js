// Mejorar la IA, parte 3 (19 nov 2026): «Quién contesta» con la opción «segun» (solo en el fundador, apagada por defecto):
// Sonnet para lo que va de vender, traspasar o impuestos y Haiku para lo demás. En el estándar no sale y cuenta como «auto».
// Segunda vuelta (mejorar-ia-2): sin freno va por defecto; en un hilo que ya contestó Sonnet, sigue Sonnet; y el botón
// «Normal» pasa a «Según la pregunta».
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

test('«segun»: Sonnet para vender, traspasar e impuestos; Haiku para lo demás; por defecto sin freno y fuera del estándar', async ({ page }) => {
  await crearCuenta(page); await quitarCapas(page); await meterCartera(page);
  const r = await page.evaluate(() => {
    const m = (q) => modeloClaudeParaIA('pregunta', q);
    AS.aFondo = false;
    S.acceso = 'privado'; LS.set('inv-acceso', { a: 'privado', uid: FB.user.uid, t: Date.now() });
    const out = { defecto: motorElegido(), conDefecto: m('¿Vendo Repsol?') };
    LS.set('inv-ia-motor', 'segun');
    out.elegido = motorElegido();
    out.preguntas = Object.fromEntries(['¿Vendo Repsol?', '¿Traspaso el MSCI Europe al S&P 500?', '¿Cuánto pago a Hacienda si vendo el oro?', 'Should I sell my IAG shares?', '¿Qué pérdidas tengo para compensar?', '¿Qué compro este mes?', '¿y Repsol?', '¿Es buen momento para comprar bitcoin?', '¿Cuánto vale mi fondo de renta fija?'].map((q) => [q, m(q)]));
    AS.aFondo = true; out.aFondo = m('¿Qué compro este mes?'); AS.aFondo = false;
    // el análisis (la revisión) no cambia
    out.analisis = modeloClaudeParaIA('análisis', '¿Vendo Repsol?');
    S.acceso = 'publico'; LS.set('inv-acceso', { a: 'publico', uid: FB.user.uid, t: Date.now() });
    out.publico = { elegido: motorElegido(), vender: m('¿Vendo Repsol?') };
    return out;
  });
  // 19 nov (mejorar-ia-2): sin freno, «segun» es lo que va por defecto (Carlos: «lo mejor entre lo más barato y calidad»)
  expect(r.defecto).toBe('segun');
  expect(r.conDefecto).toBe('claude-sonnet-5-5');
  expect(r.elegido).toBe('segun');
  const S5 = 'claude-sonnet-5-5', H5 = 'claude-haiku-5-5';
  expect(r.preguntas).toEqual({ '¿Vendo Repsol?': S5, '¿Traspaso el MSCI Europe al S&P 500?': S5, '¿Cuánto pago a Hacienda si vendo el oro?': S5, 'Should I sell my IAG shares?': S5, '¿Qué pérdidas tengo para compensar?': S5, '¿Qué compro este mes?': H5, '¿y Repsol?': H5, '¿Es buen momento para comprar bitcoin?': H5, '¿Cuánto vale mi fondo de renta fija?': H5 });
  expect(r.aFondo).toBe(S5);
  expect(r.analisis).toBe(H5);
  expect(r.publico).toEqual({ elegido: 'auto', vender: H5 });
});

test('«segun» por defecto solo sin freno; un «auto» elegido después se respeta; en un hilo de Sonnet sigue Sonnet; el botón lo dice', async ({ page }) => {
  await crearCuenta(page); await quitarCapas(page); await meterCartera(page);
  const S5 = 'claude-sonnet-5-5', H5 = 'claude-haiku-5-5';
  const r = await page.evaluate(() => {
    const m = (q) => modeloClaudeParaIA('pregunta', q);
    AS.aFondo = false; AS.conv = [];
    S.acceso = 'privado'; LS.set('inv-acceso', { a: 'privado', uid: FB.user.uid, t: Date.now() });
    const out = {};
    LS.del('inv-ia-motor'); LS.del('inv-ia-motor-elegido');
    out.sinNada = motorElegido();
    // un «auto» guardado antes de este cambio (sin la marca) no cuenta como elegido
    LS.set('inv-ia-motor', 'auto'); out.autoViejo = motorElegido();
    // el Worker dijo que esta cuenta no tiene las reglas del fundador: como siempre
    LS.set('inv-ia-fundador-no', { uid: FB.user.uid, hasta: Date.now() + 36e5 }); out.conFreno = [iaSinFreno(), motorElegido()]; LS.del('inv-ia-fundador-no');
    // «haiku» y «sonnet» guardados se respetan sin marca
    LS.set('inv-ia-motor', 'haiku'); out.haiku = motorElegido();
    // en un hilo: Haiku contesta la primera; la segunda pide Sonnet y desde ahí sigue Sonnet aunque la tercera no lo pida
    LS.del('inv-ia-motor');
    AS.conv = [{ rol: 'yo', texto: '¿Qué compro este mes?' }, { rol: 'ia', modelo: 'claude-haiku-5-5', partes: [] }];
    out.hilo1 = m('¿y Repsol?');
    out.hilo2 = m('¿Y si la vendo?');
    AS.conv.push({ rol: 'yo', texto: '¿Y si la vendo?' }, { rol: 'ia', modelo: 'claude-sonnet-5-5', partes: [], t: Date.now() - 5 * 60e3 });
    out.hilo3 = m('¿y entonces qué hago con ese dinero?');
    // pasada una hora ya no hay caché que conservar: una conversación que se retoma otro día no se queda en Sonnet
    AS.conv[AS.conv.length - 1].t = Date.now() - 2 * 36e5;
    out.hiloViejo = m('¿y entonces qué hago con ese dinero?');
    // una respuesta de Sonnet que falló no arrastra
    AS.conv = [{ rol: 'yo', texto: 'x' }, { rol: 'ia', modelo: 'claude-sonnet-5-5', error: 'No hay conexión.', partes: [], t: Date.now() }];
    out.hiloFallo = m('¿y Repsol?');
    AS.conv = [];
    pintarAsesor();
    return out;
  });
  expect(r.sinNada).toBe('segun');
  expect(r.autoViejo).toBe('segun');
  expect(r.conFreno).toEqual([false, 'auto']);
  expect(r.haiku).toBe('haiku');
  expect([r.hilo1, r.hilo2, r.hilo3, r.hiloViejo, r.hiloFallo]).toEqual([H5, S5, S5, H5, H5]);
  // el botón: «Según la pregunta» y «A fondo»; en Ajustes, la recomendada es «segun»; elegir «auto» y guardar se respeta
  await page.evaluate(() => abrirAsesor());
  await expect(page.locator('#asModo button[data-m="normal"]')).toHaveText('Según la pregunta');
  await expect(page.locator('#asModo button[data-m="fondo"]')).toHaveText('A fondo');
  await page.evaluate(() => { AS.vista = 'ajustes'; pintarAsesor(); });
  await expect(page.locator('#asMotor')).toHaveValue('segun');
  await expect(page.locator('#asMotor option[value="segun"]')).toContainText('(recomendado)');
  await expect(page.locator('#asMotor option[value="auto"]')).not.toContainText('(recomendado)');
  await page.locator('#asMotor').selectOption('auto');
  await page.locator('[data-as="guardar-ajustes"]').click();
  expect(await page.evaluate(() => [motorElegido(), LS.get('inv-ia-motor-elegido', false), modeloClaudeParaIA('pregunta', '¿Vendo Repsol?')])).toEqual(['auto', true, H5]);
  await page.evaluate(() => { AS.vista = 'chat'; pintarAsesor(); });
  await expect(page.locator('#asModo button[data-m="normal"]')).toHaveText('Normal');
});

test('la foto del chat del fundador va sin los temas de la semana ni los titulares del mercado (con informe); la del estándar, igual que antes', async ({ page }) => {
  await crearCuenta(page); await quitarCapas(page); await meterCartera(page);
  const r = await page.evaluate(async () => {
    await cargarFichas().catch(() => {});
    S.M = calcular();
    const f = contextoAsesor(S.M, 'chat', false), e = contextoAsesor(S.M, 'chat', true), rev = contextoAsesor(S.M, 'revision', false);
    return { f, e, rev, temas: temasGrowIA(5).length, informe: !!informeVisible() };
  });
  expect(r.informe, 'los datos de prueba traen informe de prensa').toBe(true);
  expect(r.temas, 'los datos de prueba traen temas de la semana').toBeGreaterThan(0);
  expect(r.f).not.toContain('## Temas de la semana');
  expect(r.f).not.toMatch(/^Mercado:$/m);
  expect(r.f).toContain('## Informe de prensa de la IA');
  expect(r.e).toContain('## Temas de la semana');
  expect(r.rev).toContain('## Temas de la semana');
  expect(r.e).toContain('## Titulares recientes');
});
