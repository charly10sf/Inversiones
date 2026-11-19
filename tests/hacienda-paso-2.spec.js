// Mejorar la IA, segunda vuelta, parte B (19 nov 2026, claude/sesion-mejorar-ia-2.md): lo que dejó apuntado la revisión
// aparte de la primera vuelta en el plan de venta y el Paso a paso con la regla de recompra (art. 33.5 LIRPF):
// (a) con compras de antes que aplazan parte de la pérdida, «No vuelvas a comprar X en dos meses (ni antes ni después de
//     vender)» no tenía sentido: ahora, hasta qué día no comprar más;
// (b) «cuentan X» sumaba la pérdida de otra venta que esta libera (podía salir más que la propia pérdida): va aparte;
// (c) una venta con ganancia que libera una pérdida aplazada mayor decía «unos 0 € de impuesto»: ahora, lo que ahorra,
//     y lo mismo que la tabla «Lo que costaría cada paso de tu plan»;
import { test as base, expect } from '@playwright/test';
import { preparar, crearCuenta, meterCartera, quitarCapas } from './ayuda.js';

const test = base.extend({
  errores: [async ({ context }, use) => {
    const errores = await preparar(context);
    await use(errores);
    expect(errores, 'errores de JavaScript en la página').toEqual([]);
  }, { auto: true }],
});
test.beforeEach(({}, info) => test.skip(info.project.name !== 'movil', 'solo en el móvil'));

async function fundador(page) {
  await crearCuenta(page); await meterCartera(page); await quitarCapas(page);
  await page.evaluate(async () => {
    LS.set('inv-empezar-no', true); LS.set('inv-empezar-fin', true); S.recienCreada = false;
    S.acceso = 'privado';
    S.cartera.fiscal = { [String(new Date().getFullYear())]: { otras: 20000, rcm: 0 } };
    await guardarCarteraCallada('prueba');
    S.M = calcular();
  });
}
const num = (s) => +String(s).replace(/\./g, '').replace(',', '.');

test('(a) y (b): la fecha hasta la que no comprar más, y lo que libera de otra venta va aparte de lo que cuenta de esta', async ({ page }) => {
  await fundador(page);
  const r = await page.evaluate(() => {
    const hoy = hoyIso();
    const pos = S.cartera.posiciones.find((x) => x.instrumento === 'iag');
    const pr = S.M.filas.find((x) => x.pos === pos).precio;
    const plan = (lotes, k, ventas) => {
      pos.cantidad = lotes.reduce((a, l) => a + l.u, 0); pos.lotes = lotes; pos.coste = lotes.reduce((a, l) => a + l.c, 0);
      S.cartera.movimientos = (S.cartera.movimientos || []).filter((m) => !m._prueba).concat(ventas || []);
      S.M = calcular();
      const f = S.M.filas.find((x) => x.pos === pos);
      // Recortar vende la fracción k: el límite de empresa a (1 − k) de su peso (+2 de margen)
      S.cartera.perfil = { ...(S.cartera.perfil || {}), limite_empresa: f.peso * (1 - k) + 2 };
      const pl = planVenta0({ ...f, senal: { ...f.senal, nivel: 'reducir' } }, S.M);
      return { uds: pl.uds, ganancia: pl.ganancia, computa: pl.computa, recompra: pl.fiscal.recompra, html: htmlFiscalVenta(pl).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ') };
    };
    // 1) vende la mitad (todo del lote viejo) y se queda una compra de hace 3 semanas: parte de la pérdida se aplaza
    const antes = plan([{ f: '2024-03-01', u: 500, c: 500 * pr * 1.5 }, { f: sumarDias(hoy, -21), u: 100, c: 100 * pr }], 0.5);
    // 2) sin compras en el plazo: la pérdida entera
    const limpia = plan([{ f: '2024-03-01', u: 500, c: 500 * pr * 1.5 }, { f: sumarDias(hoy, -200), u: 100, c: 100 * pr }], 0.5);
    // 3) una venta de hace 30 días con 3.000 € de pérdida, aplazada entera por dos compras posteriores (200 y 100); ahora
    //    vende 450 de 600: las 300 viejas y 150 de las de hace 20 días. Quedan 150 de las del plazo: de la venta vieja
    //    vuelve a restar una cuarta parte (750 €), y de esta se aplaza un tercio (150 de 450)
    const venta = { _prueba: true, tipo: 'venta', instrumento: 'iag', fecha: sumarDias(hoy, -30), uds: 200, resultado: -3000, importe: 200 * pr };
    const libera = plan([{ f: '2024-03-01', u: 300, c: 300 * pr * 1.5 }, { f: sumarDias(hoy, -20), u: 200, c: 200 * pr * 1.2 }, { f: sumarDias(hoy, -10), u: 100, c: 100 * pr }], 0.75, [venta]);
    return { libre: fechaLarga(libreRecompra(S.inst.iag)), antes, limpia, libera };
  });
  // (a) con compras de antes: no compres más hasta el día; nada de «ni antes ni después»
  expect(r.antes.recompra.porAntes).toBeGreaterThan(1);
  expect(r.antes.html).toContain(`No compres más IAG hasta el ${r.libre}`);
  expect(r.antes.html).not.toContain('ni antes ni después');
  expect(r.limpia.recompra).toBeNull();
  expect(r.limpia.html).toContain(`No vuelvas a comprar IAG hasta el ${r.libre}`);
  expect(r.limpia.html).not.toContain('ni antes ni después');
  // (b) lo que cuenta de esta pérdida no lleva lo liberado de la otra
  const l = r.libera;
  expect(l.uds).toBeGreaterThan(440); expect(l.uds).toBeLessThan(460);
  expect(l.recompra.liberada).toBeLessThan(-500);
  const propia = -l.ganancia - l.recompra.aplazada;
  const m = l.html.match(/De esa pérdida, unos ([\d.]+)\s€ no restan este año \(cuentan ([\d.]+)\s€\)/);
  expect(m, l.html).toBeTruthy();
  expect(Math.abs(num(m[2]) - propia)).toBeLessThan(1.01);
  expect(num(m[1]) + num(m[2])).toBeLessThan(-l.ganancia + 1.01); // nunca más que la propia pérdida
  const a = l.html.match(/Aparte, con esta venta salen participaciones que bloqueaban la pérdida de otra venta tuya de este año: unos ([\d.]+)\s€/);
  expect(a, l.html).toBeTruthy();
  expect(Math.abs(num(a[1]) + l.recompra.liberada)).toBeLessThan(1.01);
  const t = l.html.match(/Lo que cuenta este año \(([\d.]+)\s€, con lo de la otra venta\) resta de tus ganancias/);
  expect(t, l.html).toBeTruthy();
  expect(Math.abs(num(t[1]) + l.computa)).toBeLessThan(1.01);
});

test('(c) una venta con ganancia que hace contar una pérdida aplazada mayor: dice lo que ahorra, igual que la tabla de Hacienda', async ({ page }) => {
  await fundador(page);
  const r = await page.evaluate(() => {
    const hoy = hoyIso(), anio = new Date().getFullYear();
    const pos = S.cartera.posiciones.find((x) => x.instrumento === 'iag');
    const pr = S.M.filas.find((x) => x.pos === pos).precio;
    // vendió 200 hace 30 días perdiendo 3.000 € y recompró 200 hace 20 días algo más baratas: esa pérdida está aplazada entera
    pos.cantidad = 200; pos.lotes = [{ f: sumarDias(hoy, -20), u: 200, c: 200 * pr * 0.9 }]; pos.coste = pos.lotes[0].c;
    S.cartera.movimientos = (S.cartera.movimientos || []).concat([{ tipo: 'venta', instrumento: 'iag', fecha: sumarDias(hoy, -30), uds: 200, resultado: -3000, importe: 200 * pr }]);
    S.M = calcular();
    const f = S.M.filas.find((x) => x.pos === pos);
    const aplazadaAntes = perdidaAplazada(S.cartera.movimientos[S.cartera.movimientos.length - 1]);
    const pl = planVenta0({ ...f, senal: { ...f.senal, nivel: 'vender' } }, S.M);
    const sinEsta = fiscalAnio(anio).cuota, conEsta = fiscalAnio(anio, pl.computa).cuota;
    return { aplazadaAntes: aplazadaAntes && aplazadaAntes.importe, ganancia: pl.ganancia, computa: pl.computa, impuesto: pl.impuesto, ahorro: pl.ahorro, baja: sinEsta - conEsta,
      html: htmlFiscalVenta(pl).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ') };
  });
  expect(r.aplazadaAntes).toBeCloseTo(-3000, 0);
  expect(r.ganancia).toBeGreaterThan(0);
  expect(r.computa).toBeCloseTo(r.ganancia - 3000, 0);
  expect(r.impuesto).toBe(0);
  expect(r.ahorro).toBeGreaterThan(100);
  expect(r.ahorro).toBeCloseTo(r.baja, 2);
  expect(r.html).not.toContain('unos 0 € de impuesto');
  const m = r.html.match(/Declaras una ganancia de [\d.]+\s€, pero vuelve a restar una pérdida aplazada de 3\.000\s€: no pagas y te ahorras unos ([\d.]+)\s€/);
  expect(m, r.html).toBeTruthy();
  expect(Math.abs(num(m[1]) - r.ahorro)).toBeLessThan(1.01);
  expect(r.html).toContain('Mover el dinero no te cuesta impuestos');
  expect(r.html).not.toContain('Coste fiscal de mover el dinero');
});
