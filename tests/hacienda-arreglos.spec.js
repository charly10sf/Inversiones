// Arreglos de Hacienda del núcleo (PENDIENTE 49 e, 11 nov 2026):
//  - el ETC no tributa «como una acción»: según la DGT (V0267-25) es rendimiento del capital mobiliario, con recompra de
//    dos meses cotice donde cotice (art. 25.2.b LIRPF);
//  - en Tu renta, los ETF van con los fondos cotizados (no en la 0328) y el ETC en la 0031 (antes, en la Guía);
//  - el 720/721 por bloques y el cierre del año, sin proponer ventas: a «Cómo tributa y calendario» (fase 2, sesión 2);
//  - Interactive Brokers, desde unos 1,25 € con la tarifa escalonada.
import { test as base, expect } from '@playwright/test';
import { preparar, crearCuenta, meterCartera, quitarCapas, hzIrA, conDorado } from './ayuda.js';

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
    // el caso práctico del manual de la AEAT, con las dos clases de pendientes y el tope conjunto del 25 %
    fijar([venta('v1', 'phau', `${a}-03-10`, 5, -800), venta('v2', 'repsol', `${a}-03-11`, 100, 4000)]); S.cartera.fiscal = { [a]: { pendientes: 2800, pendientesRcm: 500 } };
    const fg = fiscalAnio(a); out.fg = { base: fg.base, sobraRCM: fg.sobraRCM, sobra: fg.sobra };
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
  expect(r.fg).toEqual({ base: 200, sobraRCM: 300, sobra: 0 });
  expect(r.deVenta).toEqual({ etc: 500, accion: 500 });
  expect(r.aplazada).toMatchObject({ importe: -200, plazo: 'dos meses' });
  expect(r.rcmConAplazada).toBe(0);
  expect(r.tresMeses).toBeNull();
  expect(r.rcmSinAplazar).toBe(-200);
  expect(r.sede).toContain('rendimiento del capital mobiliario');
  const vista = page.locator('#vista');
  await expect(vista).toContainText('Lo que pagas en la renta');
  await expect(vista).toContainText('ETC (oro, materias primas…)');
  await expect(vista).toContainText('es rendimiento del capital mobiliario');
  await expect(vista).not.toContainText('Como una acción: cada venta paga');
  await expect(vista).not.toContainText('ETF y ETC (oro)');
  // arriba, lo que pagas: la venta del ETC va aparte de las ventas (con los dividendos y los intereses)
  await expect(page.locator('#hzGratis')).toContainText(/Ventas? de ETC/);
});

test('Tu renta: ETF con los fondos cotizados, el ETC en la 0031 y la 0328 solo para bolsas de España y la UE', async ({ page, errores }) => {
  // fecha fija (11 nov 2026): la renta que toca es la de 2026
  await page.clock.setFixedTime(new Date('2026-11-11T12:00:00+01:00'));
  await crearCuenta(page);
  // la guía de primeros pasos de una cuenta recién creada sale una vez, al rato: se espera a que salga y se quita
  await page.waitForSelector('.hoja-guia', { timeout: 10_000 }).catch(() => {});
  await meterCartera(page); await quitarCapas(page);
  await page.evaluate(() => { LS.set('inv-empezar-no', true); LS.set('inv-empezar-fin', true); });
  await conDorado(page);
  await page.evaluate(() => {
    const a = 2026;
    S.inst['etf-prueba'] = { id: 'etf-prueba', tipo: 'ETF', clase: 'Renta variable', nombre: 'ETF Mundo de prueba', corto: 'ETF Mundo de prueba', yahoo: 'VWCE.DE', pais: 'IE' };
    const venta = (id, instrumento, resultado) => ({ id, tipo: 'venta', fecha: `${a}-02-10`, instrumento, plataforma: 'Trade Republic', uds: 3, importe: 1000 + resultado, coste_vendido: 1000, resultado });
    S.cartera.movimientos = [venta('v1', 'etf-prueba', 120), venta('v2', 'repsol', 80), venta('v3', 'phau', 60), venta('v4', 'bat', 30)];
    S.M = calcular();
    location.hash = '#renta';
  });
  const hz = page.locator('#hz');
  await expect(hz.locator('#hzPanel')).toBeVisible();
  const abrir = async (t) => { await hzIrA(page, t); await expect(hz.locator('#hzTit')).toHaveText(t); };
  // 1. los ETF, fuera de la 0328: con los fondos, como fondos cotizados
  await abrir('Fondos cotizados (ETF)');
  await expect(hz.locator('.hz-panel')).toContainText('instituciones de inversión colectiva');
  await expect(hz.locator('.hz-panel')).toContainText('ETF Mundo de prueba');
  await expect(hz.locator('.hz-panel .hz-ey')).not.toContainText('0328');
  // 2. las acciones, en la 0328, sin el ETF ni el oro; y las de Londres, a «otros elementos patrimoniales»
  await abrir('Ventas de acciones');
  await expect(hz.locator('.hz-panel .hz-ey')).toContainText('casilla 0328');
  await expect(hz.locator('.hz-ventas')).toContainText('Repsol');
  await expect(hz.locator('.hz-ventas')).not.toContainText('ETF Mundo de prueba');
  await expect(hz.locator('.hz-ventas')).not.toContainText('Oro');
  await expect(hz.locator('.hz-panel')).toContainText('Las que solo cotizan fuera (en EEUU o en Londres, por ejemplo) van en «otros elementos patrimoniales»');
  // 3. el ETC, con los rendimientos del capital (casilla 0031)
  await hzIrA(page, '0031');
  // en el móvil, el apartado va en corto encima del título
  await expect(hz.locator('.hz-panel .hz-ey')).toContainText(/capital mobiliario · casilla 0031/i);
  await expect(hz.locator('.hz-panel')).toContainText('Un ETC es un título de deuda');
  // 4. sin órdenes, tampoco en fundador
  await page.evaluate(() => { S.acceso = 'privado'; pintar(); });
  await expect(hz).not.toContainText('te compensa vender');
  await expect(hz).not.toContainText('te lo propone');
  // «Para pagar menos» y la nota de «si vendieras hoy»: la regla, sin órdenes ni lista de lo que va en pérdidas
  await page.evaluate(() => { S.fisTab = 'tu'; pintar(); });
  const vista = page.locator('#vista');
  await expect(vista).toContainText('Los traspasos entre fondos no tributan');
  await expect(vista).not.toContainText('Usa traspasos');
  await expect(vista).not.toContainText('Aprovecha tus pérdidas');
  await expect(vista).not.toContainText(/pérdidas sin vender/i);
});

test('Cómo tributa y calendario: lo que pagas arriba, el 720 y el 721 por bloques y el cierre del año, sin proponer ventas', async ({ page, errores }) => {
  // fecha fija (11 nov 2026) para que el cierre del año salga siempre en el calendario
  await page.clock.setFixedTime(new Date('2026-11-11T12:00:00+01:00'));
  await crearCuenta(page);
  await page.waitForSelector('.hoja-guia', { timeout: 10_000 }).catch(() => {});
  await meterCartera(page); await quitarCapas(page);
  await page.evaluate(() => { LS.set('inv-empezar-no', true); LS.set('inv-empezar-fin', true); });
  await page.evaluate(() => {
    const venta = (id, instrumento, resultado) => ({ id, tipo: 'venta', fecha: '2026-02-10', instrumento, plataforma: 'Trade Republic', uds: 3, importe: 1000 + resultado, coste_vendido: 1000, resultado });
    S.cartera.movimientos = [venta('v2', 'repsol', 80), venta('v3', 'phau', 60)];
    S.cartera.fiscal = { 2026: { rcm: 100, retenido: 19 } };
    S.M = calcular();
    location.hash = '#impuestos';
  });
  const vista = page.locator('#vista');
  const g = page.locator('#hzGratis');
  await expect(g).toContainText('Este año, por tus inversiones');
  // base 80 + 100 + 60 = 240 al 19 % = 46 de impuesto, menos 19 retenidos = 27 a pagar
  await expect(g).toContainText('46');
  await expect(g).toContainText('a pagar en la renta');
  await expect(g).toContainText('Venta de ETC');
  await expect(vista).toContainText('Modelos 720 y 721, solo si te tocan');
  await expect(vista).toContainText('más de 50.000 € en alguno de estos bloques, cada uno por separado');
  await expect(vista).toContainText('inmuebles');
  await expect(vista).toContainText('cripto en plataformas extranjeras (el 721)');
  await expect(vista).toContainText('solo si un bloque sube más de 20.000 €');
  await expect(vista).toContainText('El año fiscal se cierra el 31 de diciembre');
  await expect(vista).toContainText('y los ETC coticen donde coticen');
  await expect(vista).not.toContainText('Último día del año para vender con pérdidas');
  await page.evaluate(() => { S.acceso = 'privado'; pintar(); });
  await expect(page.locator('#hzGratis')).toBeVisible();
  await expect(vista).not.toContainText('te compensa vender');
  await expect(vista).not.toContainText('Cierra el año');
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
