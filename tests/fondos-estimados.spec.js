// 23 nov 2026 · los fondos con su valor de hoy estimado con su índice (p.estimado, de estimacion() en scripts/precios.py).
// Carlos: «hay muchos valores que llevan sin actualizarse varios días, entre ellos el del S&P 500».
import { test as base, expect } from '@playwright/test';
import { preparar, crearCuenta, meterCartera, quitarCapas } from './ayuda.js';

const test = base.extend({
  errores: async ({ context }, use) => {
    const errores = await preparar(context);
    await use(errores);
    expect(errores, 'errores de JavaScript en la página').toEqual([]);
  },
});

test('un fondo con estimación cuenta hoy con ella, con «≈», y el valor liquidativo se queda detrás', async ({ page, errores }, info) => {
  test.skip(info.project.name !== 'movil', 'una vez basta');
  await crearCuenta(page);
  await meterCartera(page);
  await quitarCapas(page);
  const r = await page.evaluate(() => {
    const hoy = hoyIso(), ayer = habilAntes(hoy), antier = habilAntes(ayer);
    S.live = {};
    const P = S.precios.instrumentos;
    // el S&P 500: valor liquidativo de hace dos sesiones (10,00) y la estimación de ayer (10,20) y de hoy (10,71)
    Object.assign(P['ishares-us'], { precio: 10, cierre_anterior: 9.8, variacion_dia: 2.04, fecha: antier,
      estimado: { simbolo: '^GSPC', nombre: 'el S&P 500', precio: 10.71, cierre_anterior: 10.2, variacion_dia: 5, fecha: hoy, valor_liquidativo: 10, desde: antier, puntos: [[ayer, 10.2], [hoy, 10.71]] } });
    // el de emergentes: una estimación más vieja que su valor liquidativo no vale
    Object.assign(P['vanguard-em'], { fecha: ayer, estimado: { simbolo: 'EUNM.DE', nombre: 'x', precio: 999, cierre_anterior: 998, fecha: antier, puntos: [[antier, 999]] } });
    // el de renta fija, sin estimación: su valor de ayer
    Object.assign(P['nb-short'], { fecha: ayer });
    delete P['nb-short'].estimado;
    S.M = calcular();
    pintar();
    const f = S.M.filas.find((x) => x.inst.id === 'ishares-us'), em = S.M.filas.find((x) => x.inst.id === 'vanguard-em');
    const piezas = piezasCartera(S.M), sp = piezas.find((x) => x.id === 'ishares-us'), nb = piezas.find((x) => x.id === 'nb-short');
    S.mcModo = 'hoy'; S.mcSel = 'ishares-us';
    const det = htmlDetalleMc(S.M);
    const caja = document.createElement('div'); caja.style.width = '360px'; document.body.appendChild(caja);
    pintarMapaCartera(caja, S.M);
    const tiles = caja.textContent;
    caja.remove();
    // la gráfica: el punto estimado de ayer cae en ayer y en hoy queda solo lo de hoy
    // (solo el fondo, con un histórico que acaba en su valor liquidativo de hace dos sesiones)
    const f2 = { ...f, hist: [[habilAntes(antier), 9.8], [antier, 10]] };
    const serie = serieCartera({ filas: [f2] }, 10), vAnt = serie.find((x) => x.d === antier), vAyer = serie.find((x) => x.d === ayer), vHoy = serie.find((x) => x.d === hoy);
    const ctx = fichaTexto(f);
    const b = binds(S.M);
    return { ayer, hoy, f: { precio: f.precio, varDia: f.varDia, dia: f.dia, uds: f.uds, est: !!f.est, vl: f.est && f.est.vl, fecha: f.fecha, diaViejo: f.diaViejo },
      em: { precio: em.precio, est: !!em.est }, sp: { hoy: sp.hoy }, nbHoy: nb.hoy, det, tiles,
      saltoAyer: vAyer && vHoy ? vHoy.v - vAyer.v : null, saltoAntier: vAnt && vAyer ? vAyer.v - vAnt.v : null, ctx, pp: b['pp:' + f.pos.id].txt, pd: b['pd:' + f.pos.id].txt };
  });
  expect(r.f.est).toBe(true);
  expect(r.f.precio).toBeCloseTo(10.71, 6);
  expect(r.f.vl).toBe(10);
  expect(r.f.varDia).toBeCloseTo(5, 6);              // desde la estimación de ayer, no desde el valor liquidativo
  expect(r.f.dia).toBeCloseTo(r.f.uds * 0.51, 2);
  expect(r.f.fecha).toBe(r.hoy);
  expect(r.f.diaViejo).toBeNull();
  expect(r.em.est).toBe(false);                      // la vieja no cuenta
  expect(r.em.precio).not.toBe(999);
  expect(r.sp.hoy).toBeCloseTo(5, 4);
  expect(r.nbHoy).toBeNull();
  expect(r.det).toContain('hoy ≈ +5,00');
  expect(r.det).toContain('estimado con el S&P 500');
  expect(r.tiles).toContain('≈ +5,00');
  expect(r.tiles).toMatch(/valor del \S{3} \d+/);    // la renta fija dice de qué día es su valor, no «sin precio de hoy»
  expect(r.saltoAyer).toBeCloseTo(r.f.uds * 0.51, 0);   // en hoy, solo lo de hoy
  expect(r.saltoAntier).toBeCloseTo(r.f.uds * 0.2, 0);  // y lo de ayer (estimado), en ayer
  expect(r.ctx).toContain('precio ESTIMADO hoy');
  expect(r.pp.startsWith('≈ ')).toBe(true);
  expect(r.pd.startsWith('≈ ')).toBe(true);
});

test('con la estimación de ayer (el índice aún no ha abierto) el fondo no cuenta en «Hoy» pero vale lo estimado', async ({ page, errores }, info) => {
  test.skip(info.project.name !== 'movil', 'una vez basta');
  await crearCuenta(page);
  await meterCartera(page);
  await quitarCapas(page);
  const r = await page.evaluate(() => {
    const hoy = hoyIso(), ayer = habilAntes(hoy), antier = habilAntes(ayer);
    S.live = {};
    Object.assign(S.precios.instrumentos['ishares-us'], { precio: 10, cierre_anterior: 9.8, fecha: antier,
      estimado: { simbolo: '^GSPC', nombre: 'el S&P 500', precio: 10.2, cierre_anterior: 10, fecha: ayer, valor_liquidativo: 10, desde: antier, puntos: [[ayer, 10.2]] } });
    S.M = calcular();
    const f = S.M.filas.find((x) => x.inst.id === 'ishares-us'), p = piezasCartera(S.M).find((x) => x.id === 'ishares-us');
    S.mcModo = 'hoy'; S.mcSel = 'ishares-us';
    return { precio: f.precio, varDia: f.varDia, dia: f.dia, det: htmlDetalleMc(S.M), est: !!p.est };
  });
  expect(r.precio).toBeCloseTo(10.2, 6);
  expect(r.varDia).toBeNull();
  expect(r.dia).toBe(0);
  expect(r.est).toBe(true);
  expect(r.det).toContain('hoy aún sin cambio: vale lo estimado con el S&P 500');
});
