/* =====================================================================
   0.8.6 · Entiende tu cartera (pestaña 11, solo en básico, en Cartera junto a Posiciones)
   Un libro de 20 lecciones en 5 capítulos. Cada lección explica una idea con los números de la cartera del usuario;
   si a su cartera no le aplica (sin fondos, sin dividendos, sin historial), sale la versión general, sin cifras suyas.
   Va en el trozo «avanzado» (src/partes.json): usa sus cálculos (pavCostesBase, pavGanado, pavRiesgoBase, pabCrisis,
   pavKpis) sin pasar por relevos. Ninguna cifra se calcula aquí si la app ya la calcula en otro sitio.
   Las de Hacienda salen del módulo de Fiscalidad (22-impuestos.js: tramosAhorro, fiscalAnio, impuestoDeVenta,
   fiscalidadSede, RET_DIV, TASA_COMPRA; 16-paso-a-paso.js: reglaRecompra; 23-guia-renta.js: fechas y casillas).

   Textos: formación general (CNMV). Sin órdenes ni consejos: nada de «compra», «vende», «mantén», «traspasa»,
   «deberías», «te conviene», «te recomiendo»… (las mismas palabras que se le prohíben a la IA en 55-asesor-contexto.js).
   Comprar y vender, en infinitivo o contando cómo funciona algo, sí. Lo prueba tests/entiende-086.spec.js.

   «Para ti ahora» (entiendeParaTi): la primera regla que se cumple y cuya lección no se ha leído. Orden fijo:
     1. Diciembre, o de abril a junio (la renta abierta)      → La renta, paso a paso
     2. Una posición de más del 40 % del total               → Mucho en un solo sitio
     3. Cripto de más del 10 % del total                     → Volatilidad
     4. Dos o más fondos de inversión (traspasables)          → Traspasar sin pagar impuestos
     5. Dividendos cobrados este año (o apuntados en Hacienda) → Dividendos y retención
     6. Una pérdida aplazada por recompra este año            → La regla de los dos meses
     Si ninguna: «sigue donde lo dejaste» (la siguiente sin leer tras la última leída). Con todo leído, nada.
   Las leídas van con la cartera cifrada, en S.cartera.entiende = { leidas: { id: 'AAAA-MM-DD' }, ultima: id }.
   ===================================================================== */

const ENT_PIE = 'Formación general con tus números: no te dice qué hacer.';
// las comisiones de cada bróker, las mismas que le cuenta a la IA instruccionesAsesor (55-asesor-contexto.js);
// cuando se junten las ramas, que salgan de un solo sitio
const ENT_COMIS = { 'Trade Republic': '1 € por operación', MyInvestor: 'sin comisión en fondos indexados', Bitvavo: 'alrededor del 0,25 % por operación', Revolut: 'según su plan', 'Interactive Brokers': 'desde unos 1,25 € por operación en Europa con la tarifa escalonada (3 € con la fija)' };

/* ---------- ayudas ---------- */
const entPos = (M) => M.filas.filter((f) => f.inst.tipo !== 'Efectivo' && f.valor > 0);
const entPc = (v, M) => (M.total ? (v / M.total) * 100 : 0);
const entNombres = (fs, n = 3) => (fs.length > n ? `${fs.slice(0, n).map(pavNom).join(', ')} y ${fs.length - n === 1 ? 'uno' : entCuantos(fs.length - n)} más` : yLista(fs.map(pavNom)));
// los números pequeños, en letra, como se dicen («tus dos fondos»)
const entCuantos = (n) => ['ninguno', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve', 'diez'][n] || String(n);
const entEsFondo = (f) => /^Fondo/.test(f.inst.tipo || '');
const entTry = (fn, def = null) => { try { return fn(); } catch (e) { console.warn(e); return def; } };
// el desglose por tramos de una base del ahorro, con la escala del usuario: «el 19 % de los primeros 6.000 € y el 21 % de los otros 4.000 €»
function entDesglose(base) {
  const T = tramosAhorro(), partes = [];
  let previo = 0, resto = base;
  for (const [hasta, t] of T) { const x = Math.min(resto, hasta - previo); if (x <= 0) break; partes.push([x, t, previo === 0]); resto -= x; previo = hasta; }
  return yLista(partes.map(([x, t, primero], i) => `el ${pctTramo(t)} % de ${primero ? 'los primeros' : i === partes.length - 1 && partes.length > 1 ? 'los otros' : 'los siguientes'} ${eur(x, 0)}`));
}

/* ---------- los capítulos ---------- */
const ENT_CAPS = [
  { id: 'tienes', rom: 'I', t: 'Lo que tienes', d: 'Fondos, acciones, oro y cripto', ls: ['indexado', 'etc', 'acciones'] },
  { id: 'cuesta', rom: 'II', t: 'Lo que te cuesta', d: 'TER, comisiones y divisa', ls: ['ter', 'broker', 'divisa'] },
  { id: 'ganas', rom: 'III', t: 'Lo que ganas', d: 'TWR, TIR y por qué no coinciden', ls: ['twr', 'ganado', 'dividendos', 'frente'] },
  { id: 'hacienda', rom: 'IV', t: 'Hacienda', d: 'Ventas, dividendos y traspasos', ls: ['tributa', 'traspaso', 'retencion', 'dos-meses', 'renta'] },
  { id: 'riesgo', rom: 'V', t: 'El riesgo', d: 'Vaivenes, caídas y diversificar', ls: ['volatilidad', 'caidas', 'diversificar', 'concentracion', 'colchon'] },
];

/* ---------- las lecciones ----------
   datos(M): lo que la lección necesita de la cartera, o null si no le aplica (entonces, la versión general).
   texto(x): los párrafos (x es null en la general). tus(x): las cifras de «Con tus números» ([nombre, cifra, clase, nota]).
   ejemplo(x): «Un ejemplo». falta: lo que se lee en «Con tus números» en la versión general. */
const ENT_LECCIONES = {
  /* ===== I · Lo que tienes ===== */
  indexado: {
    t: 'Qué es un fondo indexado', min: 2,
    datos(M) {
      const fs = entPos(M).filter((f) => f.inst.tipo === 'Fondo indexado');
      if (!fs.length) return null;
      const v = sum(fs, (f) => f.valor), conTer = fs.filter((f) => f.inst.ter != null), vt = sum(conTer, (f) => f.valor);
      // lo que más pesa dentro del mayor, con las participaciones publicadas del índice (las de la X-Ray)
      const g = fs[0], part = (S.precios && S.precios.participaciones_etf) || {};
      const etf = g.inst.sector_etf ? Object.keys(g.inst.sector_etf)[0] : null, h = etf && part[etf] && part[etf][0];
      return { M, fs, v, ter: vt ? sum(conTer, (f) => f.valor * f.inst.ter) / vt : null, g, top: h && h.w > 0 ? { n: h.n, w: h.w } : null };
    },
    texto: (x) => [
      'Un fondo indexado copia un índice: una lista de empresas fijada de antemano, como las 500 grandes de Estados Unidos (el S&P 500) o más de mil de los países ricos (el MSCI World). El fondo tiene esas empresas (o una muestra muy parecida), cada una con el mismo peso que en el índice, y no intenta adivinar cuáles irán mejor.',
      x ? `Tienes ${entCuantos(x.fs.length)}: ${entNombres(x.fs)}. Por eso cobran poco: nadie cobra por elegir. Y por eso, cuando la bolsa sube o baja, ${x.fs.length === 1 ? 'tu fondo hace' : 'cada uno hace'} casi lo mismo que su índice, ni mucho mejor ni mucho peor.`
        : 'Por eso cobran poco: nadie cobra por elegir. Y por eso, cuando la bolsa sube o baja, el fondo hace casi lo mismo que su índice, ni mucho mejor ni mucho peor.',
      'Dentro de un solo fondo hay cientos de empresas. Si a una le va fatal, en el fondo se nota poco.',
    ],
    tus: (x) => [
      ['Fondos indexados', String(x.fs.length), '', entNombres(x.fs, 2)],
      ['Lo que tienes en ellos', eur(x.v, 0), '', `${pct(entPc(x.v, x.M), 0)} de tu cartera`],
      x.ter != null ? ['Su comisión media', pct(x.ter, 2), '', 'al año'] : null,
      x.top ? [`Lo que más pesa en ${pavNom(x.g)}`, esc(x.top.n), '', `${pct(x.top.w, 1)} del fondo`] : null,
    ],
    ejemplo: (x) => x && x.top
      ? `De cada 100 € que tienes en ${pavNom(x.g)}, unos ${fmtNum(x.top.w, 1)} € están en ${esc(x.top.n)}, la empresa que más pesa dentro. Si ${esc(x.top.n)} cayera a la mitad, ese fondo bajaría alrededor de un ${fmtNum(x.top.w / 2, 1)} % por ella.`
      : 'Si una empresa pesa un 1 % en el índice y cae a la mitad, el fondo baja alrededor de un 0,5 % por ella. Con una acción suelta, esa misma caída sería del 50 %.',
    falta: 'Cuando tengas un fondo indexado, aquí salen cuántos tienes, lo que llevas en ellos y lo que cobran.',
  },
  etc: {
    t: 'Qué es un ETC', min: 2,
    datos(M) {
      const fs = entPos(M).filter((f) => f.inst.tipo === 'ETC');
      if (!fs.length) return null;
      const g = fs[0];
      return { M, fs, g, v: sum(fs, (f) => f.valor), gan: sum(fs, (f) => f.valor - f.coste), coste: sum(fs, (f) => f.coste) };
    },
    texto: (x) => [
      'Un ETC se negocia en bolsa como un ETF, pero no es un fondo: es un título que emite una entidad y que sigue el precio de algo, casi siempre una materia prima. En los de oro físico, cada título va respaldado por oro guardado en una cámara.',
      // DGT V0267-25 (13 mar 2025): un ETC hecho como título de deuda da rendimiento del capital mobiliario, no ganancia
      // patrimonial (art. 25.2 LIRPF), con retención si el bróker es español. El módulo de Fiscalidad aún lo cuenta como una acción.
      'Para Hacienda no es un fondo, y no se puede pasar a otro sin tributar. Lo que ganes tributa el día que lo vendes, en la base del ahorro; pero, según una consulta de Tributos de 2025, como está hecho como un título de deuda cuenta como rendimiento del capital mobiliario, no como la venta de una acción: va en otro apartado de la renta y, con un bróker español, puede llevar una retención del 19 % al vender.',
      x && x.g.inst.clase === 'Oro' || !x ? 'El oro no reparte dividendos ni intereses: lo que ganes con él saldrá solo de que suba su precio.' : 'No reparte dividendos ni intereses: lo que ganes saldrá solo de que suba su precio.',
    ],
    tus: (x) => [
      [pavNom(x.g), eur(x.g.valor, 0), '', `${pct(x.g.peso, 1)} de tu cartera`],
      x.g.inst.ter != null ? ['Su comisión (TER)', pct(x.g.inst.ter, 2), '', `≈ ${eur((x.g.valor * x.g.inst.ter) / 100, 0)} al año`] : null,
      x.coste > 0 ? ['Ganado hasta hoy, sin vender', eurS(x.gan, 0), cls(x.gan), pctS((x.gan / x.coste) * 100, 1)] : null,
    ],
    ejemplo: (x) => x
      ? `Si ${x.g.inst.clase === 'Oro' ? 'el oro' : pavNom(x.g)} subiera un 10 % en euros, tus ${eur(x.g.valor, 0)} pasarían a unos ${eur(x.g.valor * 1.1, 0)}. Esos ${eur(x.g.valor * 0.1, 0)} de más no tributan hasta que lo vendas.`
      : 'Si el oro sube un 10 % en euros, un ETC de oro de 1.000 € pasa a valer unos 1.100 €. Esos 100 € no tributan hasta que lo vendas.',
    falta: 'Cuando tengas un ETC (de oro, por ejemplo), aquí salen lo que vale, lo que cobra y lo que llevas ganado.',
  },
  acciones: {
    t: 'Acciones y cripto', min: 3,
    datos(M) {
      const acc = entPos(M).filter((f) => f.inst.tipo === 'Acción'), cri = entPos(M).filter((f) => f.inst.clase === 'Cripto');
      if (!acc.length && !cri.length) return null;
      return { M, acc, cri, vA: sum(acc, (f) => f.valor), vC: sum(cri, (f) => f.valor), lim: +perfil().limite_empresa || null };
    },
    texto: (x) => [
      'Una acción es un trozo de una empresa. Si a la empresa le va bien, su precio tiende a subir y puede repartirte parte de lo que gana (el dividendo); si le va mal, puede caer mucho, y no hay nada debajo que lo frene.',
      x && x.acc.length ? `Con una acción suelta dependes de una sola empresa; con un fondo indexado, de cientos. Por eso ${x.acc.length === 1 ? pavNom(x.acc[0]) : 'tus acciones'} se ${x.acc.length === 1 ? 'mueve' : 'mueven'} bastante más que un fondo.` : 'Con una acción suelta dependes de una sola empresa; con un fondo indexado, de cientos. Por eso una acción se mueve bastante más que un fondo.',
      'Una cripto, como bitcoin, no es una empresa: no gana dinero ni reparte nada. Su precio es lo que alguien esté dispuesto a pagar por ella, y puede bajar a la mitad en pocos meses.',
    ],
    tus: (x) => [
      x.acc.length ? ['Acciones sueltas', String(x.acc.length), '', `${eur(x.vA, 0)} · ${pct(entPc(x.vA, x.M), 1)}`] : null,
      x.acc.length ? ['La que más pesa', pavNom(x.acc[0]), x.lim && x.acc[0].peso > x.lim ? 'warn' : '', `${pct(x.acc[0].peso, 1)} de tu cartera`] : null,
      x.cri.length ? ['Cripto', eur(x.vC, 0), '', `${pct(entPc(x.vC, x.M), 1)} de tu cartera`] : null,
      ['Entre las dos', pct(entPc(x.vA + x.vC, x.M), 1), '', 'de lo que tienes'],
    ],
    ejemplo: (x) => {
      const f = x && (x.acc[0] || x.cri[0]);
      return f ? `Si ${pavNom(f)} cayera un 30 % mañana, tu cartera perdería unos ${eur(f.valor * 0.3, 0)}, un ${fmtNum(f.peso * 0.3, 1)} % de lo que tienes. Con la misma caída repartida entre cientos de empresas de un fondo, haría falta que se hundieran muchas a la vez.`
        : 'Si tienes 1.000 € en una acción y cae un 30 %, pierdes 300 €. En un fondo indexado, para perder lo mismo tendrían que caer un 30 % cientos de empresas a la vez.';
    },
    falta: 'Cuando tengas acciones sueltas o cripto, aquí sale cuánto pesan en tu cartera.',
  },

  /* ===== II · Lo que te cuesta ===== */
  ter: {
    t: 'Qué es la TER', min: 2,
    datos(M) {
      const C = pavCostesBase(M);
      if (!C.conTer.length) return null;
      const orden = [...C.conTer].sort((a, b) => b.valor * b.inst.ter - a.valor * a.inst.ter);
      const porTer = [...C.conTer].filter((f) => f.inst.ter > 0).sort((a, b) => b.inst.ter - a.inst.ter);
      return { M, C, orden, caro: porTer[0], barato: porTer[porTer.length - 1], mayor: [...C.conTer].sort((a, b) => b.valor - a.valor)[0] };
    },
    texto: (x) => {
      const p = ['Cada fondo se cobra un tanto por ciento al año por gestionarlo: la TER. No llega como un cargo aparte; se descuenta poco a poco del precio del fondo, día a día, y por eso no sale como un cargo en tus movimientos.'];
      if (!x) p.push('Un fondo indexado suele cobrar entre un 0,05 % y un 0,5 % al año; uno de gestión activa, bastante más.');
      else if (x.caro && x.barato && x.caro !== x.barato && x.caro.inst.ter / x.barato.inst.ter >= 1.5) {
        const r = x.caro.inst.ter / x.barato.inst.ter;
        p.push(`Entre lo tuyo, la comisión va del ${fmtNum(x.barato.inst.ter, 2)} % de ${pavNom(x.barato)} al ${fmtNum(x.caro.inst.ter, 2)} % de ${pavNom(x.caro)}: de cada 100 € al año, ${fmtNum(x.barato.inst.ter, 2)} € y ${fmtNum(x.caro.inst.ter, 2)} €. Cada uno sigue un mercado distinto, y eso también cambia lo que cuesta llevarlo.`);
      } else if (x.C.conTer.length === 1) p.push(`Tienes uno con comisión conocida, ${pavNom(x.C.conTer[0])}: un ${fmtNum(x.C.conTer[0].inst.ter, 2)} % al año, ${fmtNum(x.C.conTer[0].inst.ter, 2)} € de cada 100 que tienes en él.`);
      else p.push('Tus fondos cobran parecido entre sí. Lo que más cambia lo que pagas es cuánto tienes en cada uno.');
      p.push('Se cobra todos los años sobre todo lo que tienes, también sobre lo que ya has ganado. Por eso, a 20 años, una diferencia de décimas acaba siendo dinero.');
      return p;
    },
    tus: (x) => [
      ...x.orden.slice(0, 2).map((f) => [pavNom(f), pct(f.inst.ter, 2), '', `≈ ${eur((f.valor * f.inst.ter) / 100, 0)} al año`]),
      ['En total', `≈ ${eur(x.C.anual, 0)}`, '', 'al año'],
      ['En 20 años, con las comisiones de hoy', `≈ ${eur(x.C.total20, 0)}`, '', 'contando lo que dejan de ganar'],
    ],
    ejemplo: (x) => x
      ? `Si ${pavNom(x.mayor)} sube un 8 % en un año, ese 8 % que ves en la app ya lleva quitada su comisión (el ${fmtNum(x.mayor.inst.ter, 2)} %). No tienes que restarla tú.`
      : 'Si un fondo sube un 8 % en un año, ese 8 % que ves ya lleva quitada su comisión. No hay que restarla aparte.',
    falta: 'Cuando tengas fondos o ETC con comisión conocida, aquí sale lo que te cuesta cada uno al año y en 20 años.',
  },
  broker: {
    t: 'Comisiones del bróker', min: 2,
    datos(M) {
      const plats = [...new Set([...entPos(M).map((f) => f.pos.plataforma), ...M.efectivo.map((e) => e.plataforma)].filter(Boolean))];
      if (!plats.length) return null;
      const anio = String(new Date().getFullYear());
      const ops = (S.cartera.movimientos || []).filter((m) => String(m.fecha || '').startsWith(anio) && ['compra', 'venta'].includes(m.tipo)).length;
      const accES = entPos(M).filter((f) => f.inst.tipo === 'Acción' && f.inst.pais === 'ES'), accGB = entPos(M).filter((f) => f.inst.tipo === 'Acción' && f.inst.pais === 'GB');
      return { M, plats, conocidas: plats.filter((p) => ENT_COMIS[p]), comis: pavCostesBase(M).comis, ops, accES, accGB };
    },
    texto: (x) => [
      'La TER la cobra el fondo. El bróker, que es donde tienes la cuenta, cobra aparte: normalmente por cada operación, a veces por tener la cuenta o por cambiar de moneda.',
      'Esta comisión sí la ves, porque sale en cada operación. Y Hacienda la cuenta: lo que pagas al entrar se suma a lo que te costó y lo que pagas al salir se resta de lo que cobras, así que la ganancia que declaras es algo menor.',
      x && x.accES.length
        ? `Con las acciones españolas de empresas de más de 1.000 millones hay además una tasa al comprarlas: el ${fmtNum(TASA_COMPRA.ES[0] * 100, 1)} % de lo que pagas (el impuesto sobre transacciones financieras). Si ${entNombres(x.accES, 2)} ${x.accES.length === 1 ? 'pasa' : 'pasan'} de ese tamaño, la pagaste al entrar.${x.accGB.length ? ` En las británicas (${entNombres(x.accGB, 2)}) se paga un ${fmtNum(TASA_COMPRA.GB[0] * 100, 1)} % de timbre al comprarlas.` : ''} Los fondos y los ETF no la pagan.`
        : `Al comprar acciones de algunos países se paga además una tasa: en España, el ${fmtNum(TASA_COMPRA.ES[0] * 100, 1)} %, y en Francia, el ${fmtNum(TASA_COMPRA.FR[0] * 100, 1)} %, en empresas de más de 1.000 millones; en Reino Unido, el ${fmtNum(TASA_COMPRA.GB[0] * 100, 1)} %. Los fondos y los ETF no la pagan.`,
    ],
    tus: (x) => [
      ['Brókeres que usas', String(x.plats.length), '', esc(yLista(x.plats))],
      ...x.conocidas.slice(0, 2).map((p) => [esc(p), esc(ENT_COMIS[p])]),
      ['Comisiones apuntadas este año', eur(x.comis, 2), '', x.ops ? `en ${x.ops} ${x.ops === 1 ? 'operación' : 'operaciones'}` : 'ninguna operación apuntada'],
    ],
    ejemplo: () => 'En un bróker que cobra 1 € por operación, meter 50 € cada mes cuesta 12 € al año: un 2 % de lo que metes. Con 500 € al mes, los mismos 12 € son un 0,2 %.',
    falta: 'Cuando metas lo que tienes y en qué bróker, aquí salen lo que cobra cada uno y lo que llevas pagado este año.',
  },
  divisa: {
    t: 'La divisa dentro de un fondo', min: 2,
    datos(M) {
      const fs = entPos(M).filter((f) => (entEsFondo(f) || f.inst.tipo === 'ETF') && f.inst.clase === 'Renta variable');
      if (!fs.length) return null;
      // por regiones, como el reparto de la app (inst.region); «Europa» incluye la libra y el franco suizo
      const parte = (f, k) => { const w = f.inst.region || { Global: 100 }, t = sum(Object.values(w)) || 100; return (f.valor * (w[k] || 0)) / t; };
      const v = sum(fs, (f) => f.valor), eu = sum(fs, (f) => parte(f, 'Europa')), us = sum(fs, (f) => parte(f, 'EEUU'));
      const deUS = fs.filter((f) => (f.inst.region || {}).EEUU >= 50);
      return { M, fs, v, eu, us, fuera: v - eu, deUS };
    },
    texto: (x) => [
      'Un fondo puede cotizar en euros y aun así tener casi todo en dólares. El euro es solo la moneda en la que lo ves; lo que hay dentro son empresas de Estados Unidos, Japón o la India, que cotizan en la suya.',
      x && x.deUS.length ? `Por eso, si el dólar baja frente al euro, ${entNombres(x.deUS, 2)} ${x.deUS.length === 1 ? 'baja' : 'bajan'} un poco aunque esas empresas no se hayan movido. Y al revés: si el dólar sube, ganas algo de más. En un año puede notarse varios puntos, para bien o para mal.`
        : 'Por eso, si el dólar baja frente al euro, un fondo de empresas de EEUU baja un poco aunque esas empresas no se hayan movido. Y al revés: si el dólar sube, ganas algo de más. En un año puede notarse varios puntos, para bien o para mal.',
      'Algunos fondos quitan ese efecto («cubren» la divisa; llevan «Hedged» en el nombre), a cambio de un pequeño coste.',
    ],
    tus: (x) => [
      ['En tus fondos de bolsa', eur(x.v, 0), '', `${pct(entPc(x.v, x.M), 0)} de tu cartera`],
      ['Fuera de Europa', eur(x.fuera, 0), '', x.v ? `${pct((x.fuera / x.v) * 100, 0)} de esos fondos` : ''],
      x.us > 0 ? ['Solo en EEUU', eur(x.us, 0), '', 'en dólares por dentro'] : null,
      ['En Europa', eur(x.eu, 0), '', 'en euros, libras, francos suizos y coronas'],
    ],
    ejemplo: (x) => x && x.us > 0
      ? `Si el dólar bajara un 10 % frente al euro y las empresas de EEUU no se movieran, tu parte en EEUU (${eur(x.us, 0)}) perdería unos ${eur(x.us * 0.1, 0)} al pasarla a euros.`
      : 'Si tienes 1.000 € en un fondo de empresas de EEUU y el dólar baja un 10 % frente al euro, sin que las empresas se muevan, tu fondo pasa a valer unos 900 €.',
    falta: 'Cuando tengas fondos de bolsa, aquí sale cuánto va por dentro en otras monedas.',
  },

  /* ===== III · Lo que ganas ===== */
  twr: {
    t: 'TWR y TIR', min: 3,
    datos(M) {
      const R = rentabilidadCartera(M), tw = R.twr, tir = R.tir != null && !R.corto ? R.tir : null;
      if (!tw && tir == null) return null;
      return { M, R, tw, tir };
    },
    texto: (x) => [
      'Hay dos maneras de medir lo que rinde tu dinero, y casi nunca dan lo mismo. La TWR (rentabilidad por tiempo) mira solo cómo lo han hecho tus inversiones, como si hubieras tenido el mismo dinero todo el rato. Es la que sirve para compararte con un índice o con un fondo.',
      'La TIR cuenta también cuándo metiste cada euro. Si aportaste mucho justo antes de una caída, sale peor que la TWR aunque tus fondos sean los mismos; si aportaste en el bache, sale mejor.',
      x && x.tw && x.tw.anual != null && x.tir != null
        ? `En tu caso, la TWR va a un ${pctS(x.tw.anual, 1)} al año y la TIR a un ${pctS(x.tir, 1)}. ${Math.abs(x.tw.anual - x.tir) < 0.5 ? 'Casi lo mismo: tus aportaciones no han caído en momentos muy distintos.' : x.tir > x.tw.anual ? 'Tu dinero ha rendido más que tus inversiones: suele pasar cuando se ha metido más justo antes de buenos momentos.' : 'Tu dinero ha rendido menos que tus inversiones: suele pasar cuando se ha metido más justo antes de momentos peores.'} Ninguna está mal: la TWR dice qué tal tus inversiones; la TIR, qué tal tu dinero.`
        : 'Ninguna está mal: responden a preguntas distintas. La TWR dice qué tal tus inversiones; la TIR, qué tal tu dinero.',
    ],
    tus: (x) => [
      x.tw ? ['Rentabilidad por tiempo (TWR)', pctS(x.tw.total, 1), cls(x.tw.total), x.tw.anual != null ? `${pctS(x.tw.anual, 1)} al año` : 'desde el inicio'] : null,
      x.tir != null ? ['Con tus aportaciones (TIR)', pctS(x.tir, 1), cls(x.tir), 'al año'] : null,
      ['Has metido', eur(x.R.metido || x.M.invertido, 0)],
      ['Vale hoy', eur(x.R.valor != null ? x.R.valor : x.M.total, 0)],
    ],
    ejemplo: () => 'Metes 1.000 € y suben un 10 %. Justo entonces metes otros 10.000 € y todo baja un 5 %. Tus inversiones han ganado un 4,5 % (la TWR: 1,10 × 0,95), pero tienes 10.545 € de 11.000 metidos: tu dinero ha perdido. Las dos cifras son ciertas.',
    falta: 'Para calcularlas hace falta la fecha en que metiste cada cosa. Ponla en la ficha de cada posición o importa tus movimientos.',
  },
  ganado: {
    t: 'Lo ganado y lo cobrado', min: 2,
    datos(M) { return entPos(M).length ? { M, G: pavGanado(M) } : null; },
    texto: () => [
      'Lo que ves que ganas en la app es, casi todo, ganancia en el papel: lo que vale hoy lo que tienes menos lo que te costó. Mientras no lo vendas puede subir o bajar, y Hacienda no lo mira.',
      'Lo cobrado es lo que ya ha pasado a tu cuenta: lo que ganaste (o perdiste) al vender, y los dividendos e intereses. Eso sí va a la renta del año en que ocurre.',
      'Por eso dos personas con la misma ganancia pueden pagar cosas muy distintas: la que no ha vendido nada no paga, aunque haya ganado lo mismo.',
    ],
    tus: (x) => [
      ['En el papel, sin vender', eurS(x.M.pl, 0), cls(x.M.pl)],
      ['Ventas ya hechas', eurS(x.G.ventas, 0), cls(x.G.ventas)],
      x.G.rcm ? ['Dividendos e intereses apuntados', eurS(x.G.rcm, 0), cls(x.G.rcm)] : null,
      ['Total', eurS(x.G.total, 0), cls(x.G.total)],
    ],
    ejemplo: () => 'Algo te costó 1.000 € y hoy vale 1.300 €: has ganado 300 € en el papel. Si mañana baja a 1.100 €, esa ganancia pasa a 100 € sin que hayas hecho nada. Solo al venderlo pasa a ser cobrada, y entonces cuenta para Hacienda.',
    falta: 'Cuando metas lo que tienes, aquí sale cuánto llevas ganado en el papel y cuánto ya cobrado.',
  },
  dividendos: {
    t: 'Dividendos', min: 2,
    datos(M) {
      const con = entPos(M).filter((f) => f.p && f.p.dividendo_pct > 0).sort((a, b) => b.valor * b.p.dividendo_pct - a.valor * a.p.dividendo_pct);
      if (!con.length) return null;
      return { M, con, D: dividendosMeses(M), n: entPos(M).length };
    },
    texto: (x) => [
      'Un dividendo es la parte del beneficio que una empresa reparte entre sus accionistas, normalmente una, dos o cuatro veces al año. Lo decide la empresa cada vez: puede subirlo, bajarlo o quitarlo.',
      'El día en que se descuenta, la acción baja más o menos lo mismo que reparte. No es dinero que aparezca de la nada: sale de la empresa y pasa a tu cuenta, y tributa en la renta de ese año.',
      x && x.con.length < x.n ? 'Los fondos de acumulación, en cambio, no te pagan nada: reinvierten los dividendos dentro, y por eso no tributan hasta que los vendas.' : 'Los fondos de acumulación, en cambio, no pagan nada: reinvierten los dividendos dentro, y por eso no tributan hasta que se venden.',
    ],
    tus: (x) => [
      ['Posiciones que reparten', `${x.con.length} de ${x.n}`, '', entNombres(x.con, 2)],
      ['Al año, con el precio de hoy', eur(x.M.dividendos, 0), '', 'brutos'],
      x.D.bruto ? ['Los próximos 12 meses', `≈ ${eur(x.D.neto, 0)}`, '', 'ya descontado lo de Hacienda'] : null,
      ['Rentabilidad por dividendo', pct(entPc(x.M.dividendos, x.M), 2), '', 'de toda tu cartera'],
    ],
    ejemplo: (x) => {
      const f = x && x.con[0];
      return f ? `${pavNom(f)} ha repartido cerca de un ${fmtNum(f.p.dividendo_pct, 1)} % de su precio en el último año. Con tus ${eur(f.valor, 0)} en ella, serían unos ${eur((f.valor * f.p.dividendo_pct) / 100, 0)} brutos al año, si repite: no está prometido.`
        : 'Una acción de 100 € que reparte un 4 % al año te da 4 € brutos. El día en que se descuenta, la acción baja más o menos esos 4 €.';
    },
    falta: 'Ninguna de tus posiciones reparte dividendo: los fondos de acumulación lo reinvierten dentro.',
  },
  frente: {
    t: 'Frente a un indexado', min: 2,
    datos(M) {
      const R = rentabilidadCartera(M);
      const bm = R.flujos.length && !R.sinFecha.length ? benchMismoDinero(R, 'fidelity-world') : null;
      if (!bm || bm.sinDatos || !(bm.valor > 0)) return null;
      return { M, R, bm, dif: R.valor - bm.valor };
    },
    texto: (x) => [
      'Una referencia habitual para ver cómo va una cartera es compararla con un fondo indexado de la bolsa mundial (un MSCI World), con el mismo dinero y en las mismas fechas, sin tocarlo.',
      x ? `Con tu dinero y tus fechas, ese índice valdría hoy ${eur(x.bm.valor, 0)}; tu cartera, ${eur(x.R.valor, 0)}. Es lo que ha pasado hasta hoy: no dice nada de lo que pasará a partir de ahora.`
        : 'La diferencia, a favor o en contra, cuenta lo que ha pasado hasta hoy: no dice nada de lo que pasará a partir de ahora.',
      'Ojo con comparar cosas distintas: con renta fija, oro o efectivo, es normal ir por detrás en los años buenos de bolsa y por delante en los malos. Se arriesga menos.',
    ],
    tus: (x) => [
      ['Con el indexado tendrías', eur(x.bm.valor, 0)],
      ['Lo tuyo vale', eur(x.R.valor, 0)],
      ['Diferencia', eurS(x.dif, 0), cls(x.dif), 'tu cartera menos el índice'],
    ],
    ejemplo: () => 'Metes 100 € al mes durante tres años. Al final, lo tuyo vale 4.000 € y el indexado con el mismo dinero y los mismos días, 4.200 €: has ido 200 € por detrás. Eso no dice si el año que viene irás por delante o por detrás.',
    falta: 'Para compararlo hace falta la fecha en que metiste cada cosa. Ponla en la ficha de cada posición o importa tus movimientos.',
  },

  /* ===== IV · Hacienda (cifras del módulo de Fiscalidad, con la escala de la comunidad del usuario) ===== */
  tributa: {
    t: 'Cómo tributa lo que ganas', min: 3,
    datos(M) {
      const anio = new Date().getFullYear(), fa = fiscalAnio(anio);
      return { M, fa, imp: M.pl > 0 ? impuestoDeVenta(M.pl, anio).impuesto : 0, hay: entPos(M).length > 0 };
    },
    texto: (x) => [
      `Lo que ganas invirtiendo va a una parte de la renta que se llama base del ahorro. Ahí entran las ventas con ganancia o pérdida, los dividendos y los intereses, y se paga por tramos: ${textoTramos()}.`,
      'De lo que sube de precio, solo pagas cuando lo vendes (en cripto, también cuando la cambias por otra), no por lo que vale lo que tienes. Y solo por la ganancia: si algo te costó 1.000 € y lo vendes por 1.200 €, tributan 200 €. Si compraste lo mismo en varias veces, para Hacienda salen primero las más antiguas.',
      `Las pérdidas restan. Si vendes algo con pérdidas, se resta de lo que ganaste vendiendo otras cosas ese año y, con un límite del 25 %, también de los dividendos e intereses${comunidadUsuario() === 'paisvasco' ? ' (en el País Vasco, este cruce no se hace)' : ''}. Lo que sobre se puede usar en los cuatro años siguientes.`,
    ],
    tus: (x) => [
      ['Ganancia sin vender', eurS(x.M.pl, 0), cls(x.M.pl), 'no tributa mientras no vendas'],
      x.imp > 0 ? ['Si vendieras todo hoy', `≈ ${eur(x.imp, 0)}`, '', 'de impuesto, sumado a lo de este año'] : null,
      ['Ventas de este año', eurS(x.fa.gp, 0), cls(x.fa.gp), 'ganancia o pérdida apuntada'],
      ['Tu tramo este año', `${pctTramo(x.fa.marginal)} %`, '', TRAMOS_FORAL[comunidadUsuario()] ? `escala de ${esc(nombreComunidad(comunidadUsuario()))}` : 'el último euro'],
    ],
    ejemplo: () => `Con 10.000 € de ganancia en un año, y nada más en la base del ahorro, pagarías ${eur(irpfAhorro(10000), 0)}: ${entDesglose(10000)}.`,
    falta: '',
  },
  traspaso: {
    t: 'Traspasar sin pagar impuestos', min: 2,
    datos(M) {
      const fs = entPos(M).filter(entEsFondo);
      if (!fs.length) return null;
      const g = sum(fs, (f) => f.valor - f.coste), plats = [...new Set(fs.map((f) => f.pos.plataforma).filter(Boolean))];
      const mayor = [...fs].sort((a, b) => (b.valor - b.coste) - (a.valor - a.coste))[0];
      return { M, fs, v: sum(fs, (f) => f.valor), g, plats, mayor, imp: g > 0 ? impuestoDeVenta(g).impuesto : 0 };
    },
    texto: (x) => [
      // art. 94.1.a LIRPF: entre IIC españolas, o extranjeras armonizadas inscritas en la CNMV (las sociedades, con 500 socios o más)
      'Con los fondos de inversión españoles, y con los extranjeros registrados en la CNMV para venderse en España, hay una ventaja que no tienen las acciones ni los ETF: puedes pasar el dinero de uno a otro sin tributar en ese momento, si tu bróker o tu gestora lo permite. Se llama traspaso, y no se declara en la renta.',
      'El impuesto no desaparece: se aplaza. El fondo nuevo se queda con lo que te costó el viejo y con su fecha, y la ganancia tributa el día que saques el dinero de verdad (un reembolso). Mientras tanto, ese dinero sigue invertido entero.',
      x && x.fs.length === 1 ? `Tienes uno, ${pavNom(x.fs[0])}: el traspaso sirve el día que quieras pasar ese dinero a otro fondo. No vale para los ETF ni los ETC: para Hacienda, cada cambio entre ellos es una venta. Tampoco sirve para que cuente una pérdida: con un traspaso, ese año no resta.`
        : 'No vale para los ETF ni los ETC: aunque se parezcan a un fondo, para Hacienda cada cambio entre ellos es una venta. Y tampoco sirve para que cuente una pérdida: con un traspaso, ese año no resta; para que reste hay que reembolsar.',
    ],
    tus: (x) => [
      ['Fondos de inversión', String(x.fs.length), '', `${entNombres(x.fs, 2)}: traspasables si están registrados en la CNMV`],
      ['Lo que tienes en ellos', eur(x.v, 0), '', x.plats.length ? `en ${esc(yLista(x.plats))}` : ''],
      ['Su ganancia sin vender', eurS(x.g, 0), cls(x.g)],
      x.imp > 0 ? ['Impuesto si se reembolsaran hoy', `≈ ${eur(x.imp, 0)}`, '', 'con un traspaso, se aplaza'] : null,
    ],
    ejemplo: () => `Un fondo con 3.000 € ganados que se reembolsa para meter el dinero en otro tributa ese año por la ganancia: unos ${eur(irpfAhorro(3000), 0)} si no hay nada más en la base del ahorro. Con un traspaso al otro fondo, nada hasta el día que se saque el dinero.`,
    falta: 'Cuando tengas fondos de inversión, aquí salen cuáles se pueden traspasar y cuánto impuesto se aplaza.',
  },
  retencion: {
    t: 'Dividendos y retención', min: 3,
    datos(M) {
      const con = entPos(M).filter((f) => f.p && f.p.dividendo_pct > 0 && f.inst.tipo === 'Acción').sort((a, b) => b.valor * b.p.dividendo_pct - a.valor * a.p.dividendo_pct);
      if (!con.length) return null;
      const anio = new Date().getFullYear();
      return { M, con: con.map((f) => ({ f, fis: fiscalidadSede(f.inst.pais, f.inst.tipo) })), cobrado: entTry(() => dividendosAnio(M, anio).bruto, 0), rcm: +datosFiscales(anio).rcm || 0 };
    },
    texto: () => [
      `Cuando cobras un dividendo de una empresa española, te llega con el ${RET_DIV.ES} % ya quitado: es la retención, un adelanto de la renta. En la declaración se ajusta a tu tramo y se resta de lo que te toque pagar.`,
      'Si la empresa es de fuera, su país suele quedarse también un trozo. En la renta se descuenta de lo que pagas en España por ese dividendo (la deducción por doble imposición, art. 80 de la ley del IRPF): como mucho lo que marque el convenio con ese país, casi siempre el 15 %, y nunca más de lo que pagarías aquí por él. Lo que pase de ahí se pierde, salvo que lo reclames allí, con papeleo; y si ese año no pagas nada por el ahorro, tampoco se recupera.',
      `Cada país retiene lo suyo: Reino Unido, nada; Estados Unidos, un ${RET_DIV.US} % (con el formulario W-8BEN que gestiona el bróker); Francia, un ${fmtNumR(RET_DIV.FR)} %; Suiza, un ${RET_DIV.CH} %.`,
    ],
    tus: (x) => [
      ...x.con.slice(0, 3).map(({ f, fis }) => [pavNom(f), fis.ret == null ? 'la suya' : `${fmtNumR(fis.ret)} % ${f.inst.pais === 'ES' ? 'en España' : 'allí'}`, fis.pierde > 0 ? 'warn' : '',
        fis.ret == null ? 'mira el informe de tu bróker' : f.inst.pais === 'ES' ? 'se ajusta en la renta' : fis.ret === 0 ? 'no retiene nada' : fis.pierde > 0 ? `pierdes un ${fmtNumR(fis.pierde)} %` : 'lo recuperas en la renta']),
      x.cobrado > 0 || x.rcm > 0 ? ['Cobrado este año', `≈ ${eur(Math.max(x.cobrado, x.rcm), 0)}`, '', x.rcm ? 'apuntado en Hacienda' : 'brutos, aproximado'] : null,
    ],
    ejemplo: () => `De 100 € de dividendo de una empresa de EEUU, allí te retienen ${RET_DIV.US} €. En la renta los descuentas de lo que pagas en España, así que en total pagas lo mismo que con una española, si en España pagas al menos esos 15 € por él. De una suiza te retienen ${RET_DIV.CH} € y solo recuperas 15: los otros ${RET_DIV.CH - 15} se pierden si no los reclamas.`,
    falta: 'Ninguna de tus acciones reparte dividendo: cuando alguna lo haga, aquí sale lo que retiene su país y lo que recuperas.',
  },
  'dos-meses': {
    t: 'La regla de los dos meses', min: 3,
    datos(M) {
      const fs = entPos(M);
      if (!fs.length) return null;
      // los ETC, aparte: si cuentan como rendimiento del capital mobiliario (DGT V0267-25), su regla es la del art. 25.2.b,
      // dos meses coticen donde coticen; reglaRecompra aún les da la de las acciones
      const etc = fs.filter((f) => f.inst.tipo === 'ETC');
      const r = fs.filter((f) => f.inst.tipo !== 'ETC').map((f) => ({ f, r: reglaRecompra(f.inst) })).filter((y) => y.r);
      const dos = r.filter((y) => y.r.meses === 2).map((y) => y.f), anio = r.filter((y) => y.r.meses === 12).map((y) => y.f), cri = r.filter((y) => !y.r.meses).map((y) => y.f);
      const ap = (S.cartera.movimientos || []).filter((m) => m.tipo === 'venta' && String(m.fecha).startsWith(String(new Date().getFullYear()))).map((m) => perdidaAplazada(m)).filter(Boolean);
      return { M, dos, anio, cri, etc, aplazado: sum(ap, (a) => a.importe) };
    },
    texto: (x) => [
      'Si vendes algo con pérdidas y en los dos meses de antes o de después vuelves a comprar lo mismo, Hacienda no te deja restar esa pérdida ese año. No la pierdes: se queda aplazada hasta que vendas lo que recompraste.',
      'Los dos meses son para las acciones y los ETF que cotizan en bolsas de la UE. Para los fondos y para lo que cotiza fuera (EEUU, Reino Unido, Suiza…), el plazo es de un año. Y cuenta también una aportación automática: si tienes una programada en ese fondo, ya es volver a comprar.',
      x && x.cri.length || !x ? 'En cripto, según las consultas de Hacienda, no se aplica la de los dos meses, pero hay quien defiende que rige la de un año.' : 'Solo afecta a las pérdidas: si vendes con ganancia y vuelves a comprar, no pasa nada.',
    ],
    tus: (x) => [
      x.dos.length ? ['Con plazo de dos meses', String(x.dos.length), '', entNombres(x.dos, 2)] : null,
      x.anio.length ? ['Con plazo de un año', String(x.anio.length), '', entNombres(x.anio, 2)] : null,
      x.etc.length ? ['ETC', String(x.etc.length), '', `${entNombres(x.etc, 2)}: dos meses, como rendimiento del capital`] : null,
      x.cri.length ? ['Cripto', String(x.cri.length), '', 'sin la regla de los dos meses'] : null,
      x.aplazado < 0 ? ['Pérdida aplazada este año', eurS(x.aplazado, 0), 'warn', 'por recompras'] : null,
    ],
    ejemplo: () => 'Vendes una acción el 15 de diciembre con 500 € de pérdida y vuelves a comprar la misma el 10 de enero. Esos 500 € no restan en la renta de ese año; restarán el día que vendas las que recompraste.',
    falta: 'Cuando metas lo que tienes, aquí sale qué plazo tiene cada cosa.',
  },
  renta: {
    t: 'La renta, paso a paso', min: 3,
    datos(M) {
      const hoy = new Date(), anio = hoy.getMonth() < 6 ? hoy.getFullYear() - 1 : hoy.getFullYear();
      const fa = fiscalAnio(anio), plats = [...new Set([...entPos(M).map((f) => f.pos.plataforma), ...M.efectivo.map((e) => e.plataforma)].filter(Boolean))];
      return { M, anio, fa, fuera: plats.filter((p) => esDeFuera(p)) };
    },
    texto: (x) => [
      `La renta de un año se presenta entre primeros de abril y el 30 de junio del siguiente${x ? `: la de ${x.anio}, en ${x.anio + 1}` : ''} (las fechas exactas las publica Hacienda). Lo de invertir va en la base del ahorro, y lo de los bancos y brókeres españoles suele llegar ya en el borrador.`,
      `Los pasos: en enero y febrero cada bróker publica su informe fiscal del año; desde abril abres el borrador en Renta Web y revisas ventas, dividendos e intereses. ${x && x.fuera.length ? `Lo de ${esc(yLista(x.fuera))} puede faltar o venir mal colocado: se comprueba con su informe y se mete a mano.` : 'Lo de los brókeres de fuera puede faltar o venir mal colocado: se comprueba con su informe y se mete a mano.'}`,
      'Si sale a pagar, se puede fraccionar sin intereses: 60 % al presentarla y 40 % en noviembre. Los modelos 720 y 721 van aparte, son informativos (no se paga nada) y se presentan de enero a marzo: tocan si a 31 de diciembre tenías fuera de España más de 50.000 € en alguno de sus bloques (cuentas; valores y fondos; inmuebles; cripto en plataformas extranjeras, el 721). Los años siguientes, solo si alguno sube más de 20.000 €.',
    ],
    tus: (x) => [
      ['Renta de', String(x.anio), '', `se presenta en ${x.anio + 1}`],
      ['Base del ahorro', eur(x.fa.base, 0), '', 'con lo apuntado'],
      ['Cuota estimada', eur(x.fa.cuota, 0), '', x.fa.retenido ? `menos ${eur(x.fa.retenido, 0)} ya retenidos` : ''],
      x.fuera.length ? ['Brókeres de fuera', String(x.fuera.length), '', esc(yLista(x.fuera))] : null,
    ],
    // los ETF no van con las acciones: la ayuda de Renta 2025 de la AEAT los pone en las transmisiones de IIC (fondos cotizados)
    ejemplo: () => 'Los dividendos van en la casilla 0029, en bruto, antes de retenciones. Las ventas de acciones, en la 0328, una línea por venta con lo que pagaste y lo que cobraste. Las de ETF van en el apartado de fondos (instituciones de inversión colectiva, «fondos cotizados»), aunque coticen como una acción. Los traspasos entre fondos no se declaran.',
    falta: '',
  },

  /* ===== V · El riesgo ===== */
  volatilidad: {
    t: 'Volatilidad', min: 2,
    datos(M) {
      const B = pavRiesgoBase(M);
      if (!B || B.vol == null) return null;
      const vC = sum(entPos(M).filter((f) => f.inst.clase === 'Cripto'), (f) => f.valor);
      return { M, B, crB: claseRiesgo(B.volB), pctC: entPc(vC, M) };
    },
    texto: (x) => [
      'La volatilidad mide cuánto se mueve algo arriba y abajo. No dice si sube o baja, sino lo brusco que es el camino.',
      // claseRiesgo usa los tramos de la antigua escala SRRI; el KID PRIIPs de hoy trae el SRI, con otros tramos
      `Toisón la cuenta en la escala del 1 al 7 que usaban los fondos según cuánto se movían: un 1 casi no se mueve; un 7 se mueve muchísimo. El documento de datos fundamentales de hoy trae otra escala del 1 al 7 (el SRI), calculada distinto, así que el número puede no coincidir. ${x ? `Tu cartera está en un ${x.B.cr}${x.crB ? `, y la bolsa mundial, en las mismas fechas, en un ${x.crB}` : ''}.` : 'Un fondo monetario está abajo del todo; una cripto, casi siempre en el 7.'}`,
      'Más volatilidad no es peor por sí sola, pero supone pasar a veces meses en rojo; si justo entonces se necesita el dinero, la caída se convierte en pérdida.',
    ],
    tus: (x) => [
      ['Cuánto se mueve tu cartera', `${x.B.cr} de 7`],
      x.crB ? ['La bolsa mundial', `${x.crB} de 7`, '', 'en las mismas fechas'] : null,
      ['Se mueve al año', pct(x.B.vol, 1), '', 'su volatilidad'],
      x.B.var95 != null ? ['En un mes malo', eurS(-x.B.var95, 0), 'down', 'uno de cada veinte, así o peor'] : null,
    ],
    ejemplo: (x) => x && x.pctC >= 1
      ? `Tu cripto es un ${fmtNum(x.pctC, 1)} % de la cartera. Si cayera a la mitad, algo que ya le ha pasado varias veces, tu cartera bajaría un ${fmtNum(x.pctC / 2, 1)} % solo por ella.`
      : x ? `Con una volatilidad del ${fmtNum(x.B.vol, 0)} %, lo normal es que en dos de cada tres años tu cartera acabe entre un ${fmtNum(x.B.vol, 0)} % por encima y un ${fmtNum(x.B.vol, 0)} % por debajo de lo que sube de media. El tercer año puede salirse de ahí.`
        : 'Con una volatilidad del 15 %, lo normal es que en dos de cada tres años la cartera acabe entre un 15 % por encima y un 15 % por debajo de lo que sube de media. El tercer año puede salirse de ahí.',
    falta: 'Faltan precios del último año para calcularla con tu cartera.',
  },
  caidas: {
    t: 'Las caídas', min: 2,
    datos(M) {
      const B = pavRiesgoBase(M);
      if (!B) return null;
      return { M, p: B.c10 && B.c10.peor, cs: PAB_CRISIS.map((c) => ({ c, r: pabCrisis(M, c) })) };
    },
    texto: () => {
      const [c08, cov] = PAB_CRISIS;
      return [
      'Una caída se mide desde el punto más alto hasta el más bajo. Lo que importa no es solo cuánto cae, sino cuánto tarda en volver.',
      `La bolsa mundial llegó a perder un ${Math.abs(c08.cl.rv)} % entre 2007 y 2009, y un ${Math.abs(cov.cl.rv)} % en el covid, en poco más de un mes (de febrero a marzo de 2020). Las dos veces volvió a subir, pero la primera tardó años.`,
      'Con una caída del 50 %, para volver al punto de partida hace falta subir un 100 %. Por eso las caídas grandes pesan tanto.',
      ];
    },
    tus: (x) => [
      x.p ? ['Tu peor caída', pctS(x.p.pct, 1), 'down', `del ${fechaConAnio(x.p.desde)} al ${fechaConAnio(x.p.hasta)}`] : ['Tu peor caída', 'ninguna', '', 'que contar, con lo que tienes'],
      x.p ? ['Volvió a su máximo', x.p.vuelve ? `en ${pabDur(Math.round((tiempoDe(x.p.vuelve) - tiempoDe(x.p.hasta)) / 864e5))}` : 'todavía no', ''] : null,
      ...x.cs.slice(0, 2).map(({ c, r }) => [`Si se repitiera ${c.t === 'Covid' ? 'el covid' : `lo de ${c.c[0]}`}`, eurS(r.cambio, 0), cls(r.cambio), pctS(r.pct, 1)]),
    ],
    ejemplo: (x) => {
      const r = x && x.cs[0].r;
      return r ? `Con tu cartera de hoy (${eur(x.M.total, 0)}), una caída como la de 2007 a 2009 la dejaría en unos ${eur(x.M.total + r.cambio, 0)} durante un tiempo. Para volver a ${eur(x.M.total, 0)} desde ahí haría falta subir un ${fmtNum(x.M.total + r.cambio > 0 ? (-r.cambio / (x.M.total + r.cambio)) * 100 : 0, 0)} %.`
        : 'Si tienes 10.000 € y caen un 50 %, te quedan 5.000. Para volver a 10.000 tienen que subir un 100 %.';
    },
    falta: 'Faltan precios del último año para calcularlas con tu cartera.',
  },
  diversificar: {
    t: 'Diversificar', min: 2,
    datos(M) {
      if (!entPos(M).length) return null;
      const cl = reparto(M, 'clase').filas, rg = reparto(M, 'region').filas, emp = entTry(() => empresasPorDentro(M).filas.length, 0);
      return { M, cl, rg, emp };
    },
    texto: () => {
      const c22 = PAB_CRISIS.find((c) => c.ini.startsWith('2022'));
      return [
        'Diversificar es repartir: que lo que tienes no dependa de una sola empresa, de un solo país o de un solo tipo de inversión. Si una parte va mal, otra puede ir mejor o, al menos, no tan mal.',
        'Un fondo indexado ya reparte por dentro. Dos fondos que copian casi lo mismo (un MSCI World y un S&P 500, por ejemplo) reparten menos de lo que parece: buena parte de las empresas se repiten.',
        `La renta fija, el oro o el efectivo se mueven distinto que la bolsa, y en una caída suelen aguantar mejor. No siempre: en 2022 cayeron a la vez la bolsa (un ${Math.abs(c22.cl.rv)} %) y la renta fija (un ${Math.abs(c22.cl.rf)} %).`,
      ];
    },
    tus: (x) => [
      ['Tipos de inversión', String(x.cl.length), '', x.cl[0] ? `el mayor, ${esc(String(x.cl[0].k).toLowerCase())}: ${pct(x.cl[0].pct, 0)}` : ''],
      ['Regiones', String(x.rg.length), '', x.rg[0] ? `la mayor, ${esc(String(x.rg[0].k))}: ${pct(x.rg[0].pct, 0)}` : ''],
      x.emp ? ['Empresas contadas', String(x.emp), '', 'con las 10 mayores de cada fondo'] : null,
    ],
    ejemplo: (x) => x && x.rg[0]
      ? `Un ${fmtNum(x.rg[0].pct, 0)} % de lo que tienes depende de ${esc(String(x.rg[0].k))}. Si allí la bolsa cayera un 20 % y el resto no se moviera, tu cartera bajaría un ${fmtNum(x.rg[0].pct * 0.2, 1)} %.`
      : 'Con todo en un país, si su bolsa cae un 20 %, tu cartera cae un 20 %. Con la mitad en ese país y la mitad en otros que no se mueven, cae un 10 %.',
    falta: 'Cuando metas lo que tienes, aquí sale cómo está repartido.',
  },
  concentracion: {
    t: 'Mucho en un solo sitio', min: 2,
    datos(M) {
      const fs = entPos(M);
      if (!fs.length) return null;
      const acc = fs.find((f) => f.inst.tipo === 'Acción'), pl = reparto(M, 'plataforma').filas[0];
      return { M, mayor: fs[0], acc, top5: sum(fs.slice(0, 5), (f) => f.peso), pl, lim: +perfil().limite_empresa || null };
    },
    texto: (x) => [
      'Cuanto más pesa una sola cosa, más depende tu cartera de ella. No es lo mismo tener el 40 % en un fondo de la bolsa mundial, que lleva dentro cientos de empresas, que tenerlo en una sola empresa.',
      x ? `Lo que más pesa en tu cartera es ${pavNom(x.mayor)}, un ${pct(x.mayor.peso, 0)}. ${x.mayor.inst.tipo === 'Acción' || x.mayor.inst.clase === 'Cripto' ? 'Es una sola cosa, sin nada dentro que la reparta: lo que le pase se nota en todo.' : entEsFondo(x.mayor) || x.mayor.inst.tipo === 'ETF' ? 'Es un fondo, así que por dentro va repartido; lo que cuenta es qué copia.' : 'Lo que le pase a su precio se nota en todo lo demás.'}`
        : 'Lo que más pesa en una cartera marca casi todo lo que hace: si eso cae, cae casi todo.',
      'En Tú puedes poner tus propios límites: cuánto quieres como mucho en una sola empresa, en cripto o en oro. Toisón te avisa cuando los pasas; lo que hagas con eso lo decides tú.',
    ],
    tus: (x) => [
      ['Lo que más pesa', pct(x.mayor.peso, 1), '', pavNom(x.mayor)],
      x.acc ? ['La mayor empresa suelta', pct(x.acc.peso, 1), x.lim && x.acc.peso > x.lim ? 'warn' : '', `${pavNom(x.acc)}${x.lim ? ` · tu límite, ${fmtNum(x.lim, 0)} %` : ''}`] : null,
      ['Las 5 mayores', pct(x.top5, 1), '', 'de tu cartera'],
      x.pl ? ['En un mismo bróker', pct(x.pl.pct, 0), '', esc(String(x.pl.k))] : null,
    ],
    ejemplo: (x) => x
      ? `Si ${pavNom(x.mayor)} cayera un 20 % y todo lo demás se quedara igual, tu cartera bajaría un ${fmtNum(x.mayor.peso * 0.2, 1)} %, unos ${eur(x.mayor.valor * 0.2, 0)}.`
      : 'Con el 40 % en una sola cosa, una caída suya del 20 % baja tu cartera un 8 %. Con el 10 %, solo un 2 %.',
    falta: 'Cuando metas lo que tienes, aquí sale lo que más pesa.',
  },
  colchon: {
    t: 'El dinero que puedes necesitar', min: 2,
    datos(M) {
      if (!M.total) return null;
      const e = entTry(() => estadoPerfil(M));
      if (!e) return null;
      const pronto = (e.metas || []).filter((m) => m.tipo !== 'llegar' && m.meses && m.meses <= 36);
      return { M, e, pronto, bolsa: entPc(sum(entPos(M).filter((f) => ['Renta variable', 'Cripto'].includes(f.inst.clase)), (f) => f.valor), M) };
    },
    texto: () => {
      const covid = PAB_CRISIS.find((c) => c.t === 'Covid');
      return [
        'El dinero que puedes necesitar pronto (un imprevisto, la entrada de un piso, un coche) casa mal con la bolsa: si llega una caída justo cuando lo necesitas, tendrías que venderlo bastante más barato de lo que valía unas semanas antes.',
        'Las guías de educación financiera suelen explicarlo con dos montones: un colchón de varios meses de gastos en algo que casi no se mueve (una cuenta, un monetario, renta fija a corto plazo) y el resto invertido a largo plazo, para aguantar las caídas sin tocarlo.',
        `Cuanto antes vayas a necesitar un dinero, más daño puede hacerle una caída en ese momento. En el covid, la bolsa mundial cayó un ${Math.abs(covid.cl.rv)} % en poco más de un mes.`,
      ];
    },
    tus: (x) => [
      ['Lo que casi no se mueve', eur(x.e.seguro, 0), '', 'efectivo, monetarios y renta fija'],
      x.e.colchon ? ['El colchón que pusiste en Tú', eur(x.e.colchon, 0), '', `${fmtNum(+x.e.p.colchon_meses || 6, 0)} meses de gastos`] : null,
      x.pronto.length ? ['Metas en menos de 3 años', String(x.pronto.length), '', eur(sum(x.pronto, (m) => +m.importe || 0), 0)] : null,
      ['En bolsa y cripto', pct(x.bolsa, 0), '', 'de tu cartera'],
    ],
    ejemplo: () => {
      const covid = PAB_CRISIS.find((c) => c.t === 'Covid'), r = 10000 * (1 + covid.cl.rv / 100);
      return `Si necesitaras 10.000 € dentro de un año y los tuvieras en bolsa, una caída como la del covid (un ${Math.abs(covid.cl.rv)} %) los dejaría en unos ${eur(r, 0)} justo en ese momento. En una cuenta seguirían siendo 10.000.`;
    },
    falta: 'Cuando metas lo que tienes, aquí sale lo que tienes a mano frente a lo que podrías necesitar.',
  },
};

/* ---------- el libro: dónde está cada lección ---------- */
const ENT_ORDEN = ENT_CAPS.flatMap((c) => c.ls);
const entCapDe = (id) => ENT_CAPS.find((c) => c.ls.includes(id));

/* ---------- leídas, con la cartera cifrada ---------- */
/* saneado (revisión aparte del 10 nov): lo que venga en la cartera (un .json importado, otra versión) se queda en
   { leidas: { id: 'AAAA-MM-DD' }, ultima }, solo con lecciones que existen; un valor raro no tumba la pestaña ni el botón */
const ENT_FECHA = /^\d{4}-\d{2}-\d{2}$/;
function entSano(e) {
  const obj = (x) => !!x && typeof x === 'object' && !Array.isArray(x);
  const de = obj(e) && obj(e.leidas) ? e.leidas : {}, leidas = {};
  for (const id of ENT_ORDEN) if (Object.prototype.hasOwnProperty.call(de, id) && typeof de[id] === 'string' && ENT_FECHA.test(de[id])) leidas[id] = de[id];
  return { leidas, ultima: obj(e) && ENT_ORDEN.includes(e.ultima) ? e.ultima : null };
}
const entEstado = () => entSano(S.cartera && S.cartera.entiende);
const entLeida = (id) => !!entEstado().leidas[id];
async function entiendeMarcar(id, si = true) {
  if (!ENT_ORDEN.includes(id) || !S.cartera) return false;
  const e = S.cartera.entiende = entSano(S.cartera.entiende);
  if (si) { e.leidas[id] = hoyIso(); e.ultima = id; } else delete e.leidas[id];
  return guardarCarteraCallada('Entiende tu cartera');
}
// la siguiente sin leer después de la última leída (dando la vuelta al libro); sin ninguna leída, la primera
function entiendeSigue() {
  const e = entEstado(), i = e.ultima ? ENT_ORDEN.indexOf(e.ultima) : -1;
  for (let k = 1; k <= ENT_ORDEN.length; k++) { const id = ENT_ORDEN[(i + k + ENT_ORDEN.length) % ENT_ORDEN.length]; if (!entLeida(id)) return id; }
  return null;
}
function entiendeAvance() {
  const caps = ENT_CAPS.map((c) => ({ id: c.id, rom: c.rom, t: c.t, d: c.d, total: c.ls.length, leidas: c.ls.filter(entLeida).length }));
  return { caps, total: ENT_ORDEN.length, leidas: sum(caps, (c) => c.leidas), sigue: entiendeSigue() };
}

/* ---------- «Para ti ahora» ---------- */
const ENT_REGLAS = [
  ['renta', (M, d) => (d.getMonth() === 11 ? 'Las ventas cuentan en la renta del año en que se hacen: las de enero, ya en la del siguiente.' : d.getMonth() >= 3 && d.getMonth() <= 5 ? `Está abierta la renta de ${d.getFullYear() - 1}: se presenta hasta el 30 de junio.` : null)],
  ['concentracion', (M) => { const f = entPos(M)[0]; return f && f.peso > 40 ? `${pavNom(f)} es un ${pct(f.peso, 0)} de tu cartera.` : null; }],
  ['volatilidad', (M) => { const p = entPc(sum(entPos(M).filter((f) => f.inst.clase === 'Cripto'), (f) => f.valor), M); return p > 10 ? `Tu cripto es un ${pct(p, 0)} de tu cartera, y es lo que más se mueve.` : null; }],
  ['traspaso', (M) => {
    const fs = entPos(M).filter(entEsFondo); if (fs.length < 2) return null;
    const pl = [...new Set(fs.map((f) => f.pos.plataforma).filter(Boolean))];
    return `Tienes ${entCuantos(fs.length)} fondos de inversión${pl.length === 1 ? ` en ${esc(pl[0])}` : ''}: aquí se explica cómo funciona el traspaso entre fondos.`;
  }],
  ['retencion', (M, d) => {
    const anio = d.getFullYear(), b = entTry(() => dividendosAnio(M, anio).bruto, 0), rcm = +datosFiscales(anio).rcm || 0;
    return b > 0.5 || rcm > 0 ? `Este año has cobrado unos ${eur(Math.max(b, rcm), 0)} en dividendos: aquí se ve qué retiene cada país.` : null;
  }],
  ['dos-meses', (M, d) => {
    const ap = (S.cartera.movimientos || []).filter((m) => m.tipo === 'venta' && String(m.fecha).startsWith(String(d.getFullYear()))).map((m) => perdidaAplazada(m)).filter(Boolean);
    return ap.length ? `Una pérdida tuya de este año no cuenta todavía por una recompra (${eurS(sum(ap, (a) => a.importe), 0)}).` : null;
  }],
];
function entiendeParaTi(M = S.M || calcular(), d = new Date()) {
  for (const [id, regla] of ENT_REGLAS) {
    if (entLeida(id)) continue;
    const porque = entTry(() => regla(M, d));
    if (porque) return { id, t: ENT_LECCIONES[id].t, min: ENT_LECCIONES[id].min, porque, regla: true };
  }
  const id = entiendeSigue();
  return id ? { id, t: ENT_LECCIONES[id].t, min: ENT_LECCIONES[id].min, porque: entLeida(entEstado().ultima || '') ? 'Sigue donde lo dejaste.' : 'Empieza por aquí.', regla: false } : null;
}

/* ---------- una lección, como datos y como HTML (las pantallas, en la sesión 6) ---------- */
function entiendeLeccion(id, M = S.M || calcular()) {
  const L0 = ENT_LECCIONES[id]; if (!L0) return null;
  const cap = entCapDe(id), num = cap.ls.indexOf(id) + 1;
  const x = M.filas.length ? entTry(() => L0.datos(M)) : null;
  const tus = x ? (entTry(() => L0.tus(x), []) || []).filter(Boolean) : [];
  const general = !x || tus.length < 2;
  const xx = general ? null : x;
  const sig = ENT_ORDEN[ENT_ORDEN.indexOf(id) + 1] || null;
  return {
    id, t: L0.t, min: L0.min, cap: cap.id, rom: cap.rom, capT: cap.t, num, de: cap.ls.length, general,
    parrafos: entTry(() => L0.texto(xx), []).filter(Boolean), tus: general ? [] : tus, ejemplo: entTry(() => L0.ejemplo(xx), ''),
    falta: general ? (M.filas.length ? L0.falta : 'Cuando metas lo que tienes, aquí salen tus números.') : '', leida: entLeida(id), siguiente: sig, pie: ENT_PIE,
  };
}
function entiendeLeccionHtml(id, M) {
  const x = entiendeLeccion(id, M); if (!x) return '';
  const [p1, ...resto] = x.parrafos;
  const tus = x.general ? (x.falta ? `<div class="ent-tus ent-sin"><small>Con tus números</small><p>${x.falta}</p></div>` : '') : `<div class="ent-tus"><small>Con tus números</small>${pavKpis(x.tus, Math.min(4, x.tus.length))}</div>`;
  return `<article class="ent-pag" data-leccion="${x.id}"${x.general ? ' data-general' : ''}><div class="ent-pag-cab"><small>${x.rom} · ${x.capT} · ${x.num} de ${x.de}</small><span class="ent-min">${x.min} min</span>${x.leida ? '<span class="ent-leida">Leída</span>' : ''}</div><h3>${x.t}</h3>
    <p>${p1}</p>${tus}${resto.map((p) => `<p>${p}</p>`).join('')}
    ${x.ejemplo ? `<p class="ent-ej"><b>Un ejemplo.</b> ${x.ejemplo}</p>` : ''}
    <p class="ent-pie">${x.pie}</p></article>`;
}
