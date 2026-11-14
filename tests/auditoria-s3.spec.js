// 14 nov 2026 · auditoría, quinta parte (claude/auditoria-tarde-14nov.md): lo de la web. Las «mejores» miran la prensa.
import { test as base, expect } from '@playwright/test';
import { preparar, crearCuenta, meterCartera, quitarCapas } from './ayuda.js';

const test = base.extend({
  errores: async ({ context }, use) => {
    const errores = await preparar(context);
    await use(errores);
    expect(errores, 'errores de JavaScript en la página').toEqual([]);
  },
});

test('las mejores de la web miran la prensa: con una noticia gorda que no es buena, la empresa sale; con una mala, baja', async ({ page, errores }, info) => {
  test.skip(info.project.name !== 'movil', 'una vez basta');
  await crearCuenta(page);
  await meterCartera(page);
  await quitarCapas(page);
  const r = await page.evaluate(async () => {
    await cargarEscaneo().catch(() => {}); await cargarRadarMas().catch(() => {});
    // sin lecturas ni ideas de la IA: las mejores, solo por sus números
    const sinPrensa = { ...S.escaneo, lectura: {}, decision: { ...(S.escaneo.decision || {}), ideas: [], evitar: [] } };
    const con = (lectura, ideas = []) => { S.escaneo = { ...sinPrensa, lectura, decision: { ...sinPrensa.decision, ideas } }; return mejoresIdeas0(calcular()); };
    const lec = (rel, imp, dias = 1) => ({ d: new Date(Date.now() - dias * 864e5).toISOString(), rel, imp, txt: 'x' });
    const antes = con({});
    const x = antes[0], s = x.s, base0 = puntuarBase(radarVals().find((y) => y.s === s)).p;
    const estan = (xs) => xs.some((y) => y.s === s);
    const gorda = con({ [s]: lec(3, 'mixto') });
    const gordaMala = con({ [s]: lec(3, 'negativo') });
    const mala = con({ [s]: lec(2, 'negativo') }), enMala = mala.find((y) => y.s === s);
    const baseMala = puntuarBase(radarVals().find((y) => y.s === s)).p;
    const buena = con({ [s]: lec(3, 'positivo') });
    const vieja = con({ [s]: lec(3, 'negativo', 8) });
    const deLaIA = con({ [s]: lec(3, 'mixto') }, [{ s, n: x.n, tesis: 'x' }]), enIA = deLaIA.find((y) => y.s === s);
    return {
      n: antes.length, s, estaba: estan(antes), gorda: estan(gorda), gordaMala: estan(gordaMala), otras: gorda.length,
      mala: !!enMala, pegaMala: enMala && enMala.pegas[0], resta: base0 - baseMala,
      buena: estan(buena), pegasBuena: (buena.find((y) => y.s === s) || { pegas: [] }).pegas.join(' | '), vieja: estan(vieja),
      deLaIA: !!enIA, pegaIA: enIA && enIA.pegas[0],
      reglas: [prensaEnContra('NO-EXISTE'), PRENSA_DIAS, PRENSA_RESTA],
    };
  });
  expect(r.n).toBeGreaterThan(10);
  expect(r.estaba).toBe(true);
  // relevancia 3 y mixta (Nvidia sin su consejero delegado) o negativa: fuera de las mejores, y solo ella
  expect(r.gorda).toBe(false);
  expect(r.gordaMala).toBe(false);
  expect(r.otras).toBe(r.n - 1);
  // relevancia 2 y negativa: sigue, con menos puntos y la pega delante
  expect(r.mala).toBe(true);
  expect(r.pegaMala).toBe('su prensa de estos días es mala');
  expect(r.resta).toBeCloseTo(0.6, 6);
  // una buena o una lectura de hace más de una semana no le quitan nada
  expect(r.buena).toBe(true);
  expect(r.pegasBuena).not.toContain('prensa');
  expect(r.vieja).toBe(true);
  // si la IA, que sí ha leído esa prensa, la propone, se queda; con el aviso
  expect(r.deLaIA).toBe(true);
  expect(r.pegaIA).toContain('su prensa de estos días trae una noticia que lo cambia todo y no es buena');
  expect(r.reglas).toEqual([null, 7, 0.6]);
});
