// Mejorar la IA, parte 3 (19 nov 2026): «Quién contesta» con la opción «segun» (solo en el fundador, apagada por defecto):
// Sonnet para lo que va de vender, traspasar o impuestos y Haiku para lo demás. En el estándar no sale y cuenta como «auto».
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

test('«segun»: Sonnet para vender, traspasar e impuestos; Haiku para lo demás; apagado por defecto y fuera del estándar', async ({ page }) => {
  await crearCuenta(page); await quitarCapas(page); await meterCartera(page);
  const r = await page.evaluate(() => {
    const m = (q) => modeloClaudeParaIA('pregunta', q);
    AS.aFondo = false;
    S.acceso = 'privado'; LS.set('inv-acceso', { a: 'privado', uid: FB.user.uid, t: Date.now() });
    const out = { defecto: motorElegido(), conDefecto: m('¿Vendo Repsol?') };
    LS.set('inv-ia-motor', 'segun');
    out.elegido = motorElegido();
    out.preguntas = Object.fromEntries(['¿Vendo Repsol?', '¿Traspaso el MSCI Europe al S&P 500?', '¿Cuánto pago a Hacienda si vendo el oro?', 'Should I sell my IAG shares?', '¿Qué pérdidas tengo para compensar?', '¿Qué compro este mes?', '¿y Repsol?', '¿Es buen momento para comprar bitcoin?'].map((q) => [q, m(q)]));
    AS.aFondo = true; out.aFondo = m('¿Qué compro este mes?'); AS.aFondo = false;
    // el análisis (la revisión) no cambia
    out.analisis = modeloClaudeParaIA('análisis', '¿Vendo Repsol?');
    S.acceso = 'publico'; LS.set('inv-acceso', { a: 'publico', uid: FB.user.uid, t: Date.now() });
    out.publico = { elegido: motorElegido(), vender: m('¿Vendo Repsol?') };
    return out;
  });
  expect(r.defecto).toBe('auto');
  expect(r.conDefecto).toBe('claude-haiku-5-5');
  expect(r.elegido).toBe('segun');
  const S5 = 'claude-sonnet-5-5', H5 = 'claude-haiku-5-5';
  expect(r.preguntas).toEqual({ '¿Vendo Repsol?': S5, '¿Traspaso el MSCI Europe al S&P 500?': S5, '¿Cuánto pago a Hacienda si vendo el oro?': S5, 'Should I sell my IAG shares?': S5, '¿Qué pérdidas tengo para compensar?': S5, '¿Qué compro este mes?': H5, '¿y Repsol?': H5, '¿Es buen momento para comprar bitcoin?': H5 });
  expect(r.aFondo).toBe(S5);
  expect(r.analisis).toBe(H5);
  expect(r.publico).toEqual({ elegido: 'auto', vender: H5 });
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
