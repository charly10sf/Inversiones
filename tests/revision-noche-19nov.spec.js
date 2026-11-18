// Revisión de noche del 19 nov (claude/sesion-revision-noche-19nov.md): lo que recibe la IA.
// - simular_venta aplica la regla de recompra (antes daba la pérdida entera aunque hubiera compras en el plazo)
// - la foto dice qué pérdida de una venta apuntada no resta este año por una recompra
// - la foto marca el fondo con el valor liquidativo atascado
// - sin freno (el fundador con sus reglas), el Paso a paso entra con su motivo y sus impuestos
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

async function conCartera(page) {
  await crearCuenta(page);
  await quitarCapas(page);
  await meterCartera(page);
}

test('simular_venta: con aportación automática al fondo, la pérdida de lo recomprado no resta este año', async ({ page }) => {
  await conCartera(page);
  const r = await page.evaluate(() => {
    S.M = calcular();
    const f = buscarFila('ishares-us');
    const v = ejecutarHerramienta('simular_venta', { posicion: f.pos.id, porcentaje: 50 }, false);
    // la cuenta de antes: la pérdida entera
    const ingenua = impuestoDeVenta(v.ganancia_o_perdida, new Date().getFullYear(), f.inst);
    return { v, ingenua: { sobra: ingenua.despues.sobra } };
  });
  expect(r.v.ganancia_o_perdida).toBeLessThan(0);
  expect(r.v.regla_de_recompra).toBeTruthy();
  expect(r.v.regla_de_recompra.plazo).toBe('un año');
  expect(r.v.regla_de_recompra.perdida_que_no_resta_este_anio).toBeLessThan(0);
  expect(r.v.regla_de_recompra.nota).toContain('aportación automática');
  // lo que pasa a años siguientes ya no es la pérdida entera
  expect(r.v.renta.perdidas_para_anios_siguientes).toBeLessThan(r.ingenua.sobra - 1);
  expect(Math.abs(r.v.renta.perdidas_para_anios_siguientes - r.v.regla_de_recompra.perdida_que_no_resta_este_anio - r.ingenua.sobra)).toBeLessThan(0.05);
});

test('simular_venta: una cripto con pérdidas no lleva regla de recompra y una venta con ganancias tampoco', async ({ page }) => {
  await conCartera(page);
  const r = await page.evaluate(() => {
    S.M = calcular();
    const out = {};
    for (const id of ['btc', 'phau']) { const f = buscarFila(id); out[id] = ejecutarHerramienta('simular_venta', { posicion: f.pos.id, porcentaje: 10 }, false); }
    return out;
  });
  expect(r.btc.regla_de_recompra).toBeUndefined();
  if (r.phau.ganancia_o_perdida > 0) expect(r.phau.regla_de_recompra).toBeUndefined();
});

