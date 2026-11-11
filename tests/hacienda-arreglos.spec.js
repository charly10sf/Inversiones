// Arreglos de Hacienda del núcleo (PENDIENTE 49 e, 11 nov 2026):
//  - el ETC no tributa «como una acción»: según la DGT (V0267-25) es rendimiento del capital mobiliario, con recompra de
//    dos meses cotice donde cotice (art. 25.2.b LIRPF);
//  - en la Guía de la renta, los ETF van con los fondos cotizados (no en la 0328) y el 720/721 va por bloques;
//  - la Guía informa del cierre del año sin proponer ventas, también en fundador;
//  - Interactive Brokers, desde unos 1,25 € con la tarifa escalonada.
import { test as base, expect } from '@playwright/test';
import { preparar, crearCuenta, meterCartera, quitarCapas } from './ayuda.js';

const test = base.extend({
  errores: async ({ context }, use) => {
    const errores = await preparar(context);
    await use(errores);
    expect(errores, 'errores de JavaScript en la página').toEqual([]);
  },
});
test.beforeEach(({}, info) => test.skip(info.project.name !== 'movil', 'solo en el móvil'));

test('el ETC cuenta como rendimiento del capital y su recompra es de dos meses', async ({ page, errores }) => {
  await crearCuenta(page);
  await quitarCapas(page);
  await meterCartera(page);
  const r = await page.evaluate(() => {
    // todo en el año pasado, para que no dependa del día en que corre la prueba
    const a = new Date().getFullYear() - 1, etc = S.inst.phau;
    const venta = (id, instrumento, fecha, uds, resultado) => ({ id, tipo: 'venta', fecha, instrumento, plataforma: 'MyInvestor', uds, importe: 1000 + resultado, coste_vendido: 1000, resultado });
    const fijar = (movs, lotes) => {
      S.cartera.fiscal = {};
      S.cartera.movimientos = movs;
      const p = S.cartera.posiciones.find((x) => x.instrumento === 'phau');
      if (lotes) p.lotes = lotes; else delete p.lotes;
    };
    const out = { tipo: etc.tipo, yahoo: etc.yahoo };
    // la regla: dos meses aunque cotice en Londres (una acción de Londres sigue con un año)
    out.regla = reglaRecompra(etc);
    out.reglaLondres = reglaRecompra({ tipo: 'Acción', clase: 'Renta variable', yahoo: 'BATS.L' }).meses;
    out.reglaEtnCripto = reglaRecompra({ tipo: 'ETC', clase: 'Cripto', yahoo: 'BTCE.DE' }).meses;
    // dónde cuenta: 1.000 € ganados con el ETC y 1.000 € perdidos con una acción ya no se anulan
    fijar([venta('v1', 'phau', `${a}-03-10`, 5, 1000), venta('v2', 'repsol', `${a}-03-11`, 100, -1000)]);
    const fa = fiscalAnio(a);
    out.fa = { gp: fa.gp, rcmVentas: fa.rcmVentas, nRCM: fa.nRCM, rcm: fa.rcm, base: fa.base, cruzado: fa.cruzado, sobra: fa.sobra, cuota: fa.cuota };
    out.cuota750 = irpfAhorro(750);
    // al revés: la pérdida de un ETC resta de dividendos e intereses, y de las ganancias solo hasta el 25 %
    fijar([venta('v1', 'phau', `${a}-03-10`, 5, -1000), venta('v2', 'repsol', `${a}-03-11`, 100, 1000)]);
    const fb = fiscalAnio(a);
    out.fb = { gp: fb.gp, rcmVentas: fb.rcmVentas, base: fb.base, sobra: fb.sobra, sobraRCM: fb.sobraRCM };
    // una venta que se está mirando: la del ETC va al otro montón
    out.deVenta = { etc: impuestoDeVenta(500, a, etc).despues.rcmT - fb.rcmT, accion: impuestoDeVenta(500, a, S.inst.repsol).despues.gp - fb.gp };
    // recompra: a los 41 días, la pérdida se aplaza; a los tres meses, ya no (antes, por cotizar en Londres, era un año)
    fijar([venta('v1', 'phau', `${a}-03-10`, 5, -200)], [{ f: `${a - 1}-06-01`, u: 10, c: 2000 }, { f: `${a}-04-20`, u: 5, c: 900 }]);
    const ap = perdidaAplazada(S.cartera.movimientos[0]);
    out.aplazada = ap && { importe: ap.importe, plazo: ap.r.plazo, fecha: ap.fecha };
    out.rcmConAplazada = fiscalAnio(a).rcmVentas;
    fijar([venta('v1', 'phau', `${a}-03-10`, 5, -200)], [{ f: `${a - 1}-06-01`, u: 10, c: 2000 }, { f: `${a}-06-15`, u: 5, c: 900 }]);
    out.tresMeses = perdidaAplazada(S.cartera.movimientos[0]);
    out.rcmSinAplazar = fiscalAnio(a).rcmVentas;
    // lo que sobró de un ETC otros años (campo aparte): contra rendimientos, entero; contra ganancias, hasta el 25 %
    fijar([venta('v2', 'repsol', `${a}-03-11`, 100, 1000)]); S.cartera.fiscal = { [a]: { pendientesRcm: 1000 } };
    const fc = fiscalAnio(a); out.fc = { base: fc.base, usadasRcm: fc.usadasRcm, sobraRCM: fc.sobraRCM, sobra: fc.sobra };
    fijar([venta('v1', 'phau', `${a}-03-10`, 5, 1000)]); S.cartera.fiscal = { [a]: { pendientesRcm: 1000 } };
    const fd = fiscalAnio(a); out.fd = { base: fd.base, usadasRcm: fd.usadasRcm, sobraRCM: fd.sobraRCM };
    // y las pérdidas patrimoniales de otros años siguen como estaban: enteras contra ganancias
    fijar([venta('v2', 'repsol', `${a}-03-11`, 100, 1000)]); S.cartera.fiscal = { [a]: { pendientes: 1000 } };
    out.fe = fiscalAnio(a).base;
    out.sede = fiscalidadSede(etc.pais, etc.tipo).txt;
    // y una venta de hoy, para la pantalla de Fiscalidad
    fijar([venta('v9', 'phau', hoyIso(), 2, 300)]);
    S.M = calcular();
    location.hash = '#impuestos';
    return out;
  });
  expect(r.tipo).toBe('ETC');
  expect(r.yahoo).toMatch(/\.L$/); // cotiza en Londres: con la regla de las acciones le tocaría un año
  expect(r.regla.meses).toBe(2);
  expect(r.regla.plazo).toBe('dos meses');
  expect(r.reglaLondres).toBe(12);
  expect(r.reglaEtnCripto).toBe(2);
  expect(r.fa).toMatchObject({ gp: -1000, rcmVentas: 1000, nRCM: 1, rcm: 0, cruzado: 250, base: 750, sobra: 750 });
  expect(r.fa.cuota).toBeCloseTo(r.cuota750, 2);
  // lo que sobra de la pérdida del ETC va en su saldo, no con las pérdidas patrimoniales (al año siguiente no compensan igual)
  expect(r.fb).toMatchObject({ gp: 1000, rcmVentas: -1000, base: 750, sobra: 0, sobraRCM: 750 });
  expect(r.fc).toEqual({ base: 750, usadasRcm: 250, sobraRCM: 750, sobra: 0 });
  expect(r.fd).toEqual({ base: 0, usadasRcm: 1000, sobraRCM: 0 });
  expect(r.fe).toBe(0);
  expect(r.deVenta).toEqual({ etc: 500, accion: 500 });
  expect(r.aplazada).toMatchObject({ importe: -200, plazo: 'dos meses' });
  expect(r.rcmConAplazada).toBe(0);
  expect(r.tresMeses).toBeNull();
  expect(r.rcmSinAplazar).toBe(-200);
  expect(r.sede).toContain('rendimiento del capital mobiliario');
  const vista = page.locator('#vista');
  await expect(vista).toContainText('Lo que pagas');
  await expect(vista).toContainText('ETC (oro, materias primas…)');
  await expect(vista).toContainText('es rendimiento del capital mobiliario');
  await expect(vista).not.toContainText('Como una acción: cada venta paga');
  await expect(vista).not.toContainText('ETF y ETC (oro)');
  await expect(vista).toContainText('Ventas de ETC');
  await expect(vista).toContainText('cuentan como rendimiento del capital');
});

test('la Guía de la renta: ETF con los fondos cotizados, 720 por bloques y sin proponer ventas', async ({ page, errores }) => {
  await crearCuenta(page);
  await quitarCapas(page);
  await meterCartera(page);
  await page.evaluate(() => {
    // fecha fija (11 nov 2026) para que el paso del cierre del año salga siempre: solo cambia «new Date()» sin argumentos
    const R = Date;
    window.Date = class extends R { constructor(...x) { if (x.length) super(...x); else super(2026, 10, 11, 12, 0, 0); } };
    const a = 2026;
    S.inst['etf-prueba'] = { id: 'etf-prueba', tipo: 'ETF', clase: 'Renta variable', nombre: 'ETF Mundo de prueba', corto: 'ETF Mundo de prueba', yahoo: 'VWCE.DE', pais: 'IE' };
    const venta = (id, instrumento, resultado) => ({ id, tipo: 'venta', fecha: `${a}-02-10`, instrumento, plataforma: 'Trade Republic', uds: 3, importe: 1000 + resultado, coste_vendido: 1000, resultado });
    S.cartera.movimientos = [venta('v1', 'etf-prueba', 120), venta('v2', 'repsol', 80), venta('v3', 'phau', 60)];
    S.M = calcular();
    location.hash = '#impuestos';
  });
  const vista = page.locator('#vista');
  await expect(vista).toContainText('Lo que pagas');
  await page.evaluate(() => { S.fisTab = 'renta'; pintar(); });
  await expect(vista).toContainText('Revisa cada apartado con lo tuyo');
  const caja = (t) => vista.locator('.rg-c').filter({ has: page.locator('.rg-c-cab b', { hasText: new RegExp(`^${t}$`) }) });
  // 1. los ETF, fuera de la 0328
  await expect(vista).not.toContainText('Ventas de acciones y ETF');
  await expect(caja('Ventas de acciones')).toContainText('casilla 0328');
  await expect(caja('Ventas de acciones')).toContainText('Repsol');
  await expect(caja('Ventas de acciones')).not.toContainText('ETF Mundo de prueba');
  await expect(caja('Ventas de ETF')).toContainText('fondos cotizados');
  await expect(caja('Ventas de ETF')).toContainText('instituciones de inversión colectiva');
  await expect(caja('Ventas de ETF')).toContainText('ETF Mundo de prueba');
  await expect(caja('Ventas de ETF')).not.toContainText('0328');
  // 5. y el ETC, con los rendimientos del capital
  await expect(caja('Ventas de ETC')).toContainText('casilla 0031');
  await expect(caja('Ventas de ETC')).toContainText('Oro');
  await expect(caja('Ventas de acciones')).not.toContainText('Oro');
  // 2. el 720 y el 721, por bloques
  const p720 = vista.locator('.rg-paso', { hasText: 'Modelos 720 y 721' });
  await expect(p720).toContainText('del 1 de enero al 31 de marzo');
  await expect(p720).toContainText('más de 50.000 € en alguno de estos bloques, cada uno por separado');
  await expect(p720).toContainText('cuentas');
  await expect(p720).toContainText('valores y fondos');
  await expect(p720).toContainText('inmuebles');
  await expect(p720).toContainText('cripto en plataformas extranjeras (el 721)');
  await expect(p720).toContainText('solo si un bloque sube más de 20.000 €');
  await expect(p720).not.toContainText('el 720 para valores y cuentas');
  // 3. en fundador tampoco propone vender
  await page.evaluate(() => { S.acceso = 'privado'; pintar(); });
  await expect(vista).toContainText('Guía de la renta');
  await expect(vista).not.toContainText('te compensa vender');
  await expect(vista).not.toContainText('te lo propone');
  await expect(vista).not.toContainText('Cierra el año');
  const cierre = vista.locator('.rg-paso', { hasText: 'El año fiscal se cierra el 31 de diciembre' });
  await expect(cierre).toContainText('cuenta en la renta de este año');
  await expect(cierre).toContainText('y los ETC coticen donde coticen');
  // la 0328, solo para bolsas españolas y de la UE (la cartera de prueba lleva una acción de Londres)
  await expect(caja('Ventas de acciones')).toContainText('las que cotizan fuera (EEUU, Reino Unido…) las lleva a «otros elementos patrimoniales»');
  // «Para pagar menos» y el Calendario: la regla, sin órdenes
  await page.evaluate(() => { S.fisTab = 'tu'; pintar(); });
  await expect(vista).toContainText('Los traspasos entre fondos no tributan');
  await expect(vista).not.toContainText('Usa traspasos');
  await expect(vista).not.toContainText('Aprovecha tus pérdidas');
  await expect(vista).not.toContainText('Tienes pérdidas sin vender');
});

test('la IA lee la comisión de Interactive Brokers y lo del ETC igual que la app', async ({ page, errores }) => {
  await crearCuenta(page);
  await quitarCapas(page);
  await meterCartera(page);
  const r = await page.evaluate(async () => {
    S.cartera.posiciones.find((p) => p.instrumento === 'repsol').plataforma = 'Interactive Brokers';
    S.M = calcular();
    const i = instruccionesAsesor(true);
    await cargarTrozo('avanzado');
    return { i, ent: ENT_COMIS['Interactive Brokers'] };
  });
  expect(r.i).toContain('Interactive Brokers, desde unos 1,25 € por operación en Europa con la tarifa escalonada');
  expect(r.i).not.toContain('desde unos 3 €');
  expect(r.ent).toContain('desde unos 1,25 € por operación en Europa con la tarifa escalonada');
  expect(r.i).toContain('V0267-25');
  expect(r.i).toContain('rendimiento del capital mobiliario, no ganancia patrimonial');
  expect(r.i).toContain('sobre un ETC de petróleo');
  expect(r.i).toContain('en alguno de los bloques, cada uno por separado');
});
