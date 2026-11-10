/* =========================== 0.8.6 · Frente a un indexado: el cálculo (pestaña 2, sesión 4 del plan) ===========================
   Lo que habría pasado con el mismo dinero, en las mismas fechas, en el fondo de la referencia. Una función pura
   (frenteCalc) que no mira S: recibe lo que necesita y devuelve todo lo que enseña la pestaña. frenteCartera(M, id) la
   llama con lo de la cartera.

   - El indexado: cada euro que metiste (cada lote, cada aportación, las compras supuestas de lo que ya tenías), el mismo
     día, en participaciones del fondo de la referencia al último cierre de ese día o anterior; cada venta saca lo mismo
     de ahí. Los fondos de la lista (BENCH) son de acumulación y en euros: su precio ya lleva dentro los dividendos y ya
     tiene descontada su comisión (TER). No se suma ni se resta nada más.
   - La diferencia: lo que valía tu cartera ese día (la serie de twrCartera, con lo que tenías cada día) menos lo que
     valdría el indexado; mes a mes, el último dato de cada mes; hoy, con lo que vale lo tuyo ahora.
   - Año a año: la TWR de tu cartera (quita el efecto de cuándo aportas) y lo que hizo el fondo en esas mismas fechas.
   - Alfa, beta, tracking error, ratio de información y captura, con lo que hace cada uno CADA SEMANA (el último cierre
     del fondo de cada semana): el histórico es semanal hasta 2024 y diario después, y la cripto cotiza en fin de
     semana y los fondos no. Sin tipo sin riesgo: alfa es lo que haces de más o de menos frente al fondo, al año. Hace
     falta medio año de semanas (26) para dar estas cifras: con menos, dicen poco.
   - De dónde sale la diferencia: cada posición contra sus propias aportaciones en el indexado. Suman la diferencia
     total, porque el indexado es el mismo para todas.
   El efectivo no entra (se mide lo invertido, como en Rentabilidad). */

const FRENTE_MIN_SEM = 26, FRENTE_ERR_MAX = 0.3;

// semana de una fecha: el lunes de esa semana
const frenteSemana = (d) => { const x = deIso(d), k = (x.getDay() + 6) % 7; return iso(new Date(x.getFullYear(), x.getMonth(), x.getDate() - k)); };

// recorre una lista ordenada [[fecha, valor]] y da el último valor con fecha <= d (las fechas que se piden, en orden)
function frenteCursor(h) {
  let i = 0, ult = null;
  return (d) => { while (i < h.length && h[i][0] <= d) { ult = h[i][1]; i++; } return ult; };
}

function frenteMedias(xs) {
  const n = xs.length, m = sum(xs) / n;
  return { n, m, sd: n > 1 ? Math.sqrt(sum(xs, (x) => (x - m) ** 2) / (n - 1)) : 0 };
}

/* Las medidas con rentabilidades semanales: rp las tuyas, rb las del fondo (mismas semanas) */
function frenteMedidas(rp, rb) {
  const n = rp.length;
  if (n < FRENTE_MIN_SEM) return { semanas: n, faltan: FRENTE_MIN_SEM - n };
  const P = frenteMedias(rp), B = frenteMedias(rb), act = rp.map((x, i) => x - rb[i]), A = frenteMedias(act);
  const cov = sum(rp.map((x, i) => (x - P.m) * (rb[i] - B.m))) / (n - 1);
  if (!(B.sd > 1e-9)) return { semanas: n, quieto: true };
  const beta = cov / (B.sd * B.sd);
  const alfa = (P.m - beta * B.m) * 52 * 100;
  const te = A.sd * Math.sqrt(52) * 100;
  const ir = A.sd > 1e-12 ? (A.m * Math.sqrt(52)) / A.sd : null;
  const corr = P.sd > 1e-12 ? cov / (P.sd * B.sd) : null;
  // captura: de lo que sube (baja) el fondo en sus semanas de subida (bajada), cuánto subes (bajas) tú
  const cap = (f) => { const ix = rb.map((x, i) => (f(x) ? i : -1)).filter((i) => i >= 0); if (ix.length < 4) return null; const mb = sum(ix, (i) => rb[i]) / ix.length; return Math.abs(mb) > 1e-12 ? ((sum(ix, (i) => rp[i]) / ix.length) / mb) * 100 : null; };
  return { semanas: n, beta, alfa, te, ir, corr, capSube: cap((x) => x > 0), capBaja: cap((x) => x < 0) };
}

/* entrada: flujos [{d, imp, id}] (imp < 0, dinero que entra; > 0, el que sale), ordenados; serie [{d, v, idx}] de
   twrCartera o null; h el histórico del fondo [[d, p]]; pHoy su precio de hoy; valorHoy lo que vale lo tuyo hoy (sin
   efectivo); valores {id: valor de hoy} para repartir la diferencia */
function frenteCalc({ flujos, serie = null, h, pHoy = null, hoy, valorHoy, valores = null }) {
  if (!flujos || !flujos.length) return { sinFlujos: true };
  const desde = flujos[0].d;
  if (!h || h.length < 2 || h[0][0] > desde) return { sinDatos: true, desdeDatos: h && h.length ? h[0][0] : null };
  const precio = (d) => precioEn(h, d, 'antes');
  const pFin = pHoy || h[h.length - 1][1];

  // 1. las participaciones del indexado, flujo a flujo
  const compras = [];
  let uds = 0, metido = 0, sacado = 0, negativo = false;
  for (const x of flujos) {
    const p = precio(x.d);
    if (!(p > 0)) return { sinDatos: true, desdeDatos: h[0][0] };
    const u = -x.imp / p;
    uds += u;
    if (x.imp < 0) metido -= x.imp; else sacado += x.imp;
    if (uds < -1e-9) negativo = true;
    compras.push({ d: x.d, imp: x.imp, p, u, id: x.id });
  }
  const ixHoy = uds * pFin;
  const dias = diasEntre(desde, hoy), corto = dias < 45;

  // 2. día a día: lo tuyo, el indexado y lo metido (cuando hay serie de tu cartera)
  const diario = [];
  const fechas = serie && serie.length ? serie.map((x) => x.d) : [...new Set([...h.map(([d]) => d).filter((d) => d >= desde && d <= hoy), ...flujos.map((x) => x.d), hoy])].sort();
  {
    const pc = frenteCursor(h);
    let k = 0, u = 0, met = 0;
    fechas.forEach((d, i) => {
      while (k < compras.length && compras[k].d <= d) { u += compras[k].u; met -= compras[k].imp; k++; }
      const p = d === hoy && pHoy ? pHoy : pc(d);
      const tu = serie && serie.length ? (d === hoy && valorHoy != null ? valorHoy : serie[i].v) : null;
      const ix = p ? u * p : null;
      diario.push({ d, tu, ix, metido: met, dif: tu != null && ix != null ? tu - ix : null });
    });
    const z = diario[diario.length - 1];
    if (z && z.d < hoy) diario.push({ d: hoy, tu: serie && serie.length ? valorHoy : null, ix: ixHoy, metido: met, dif: serie && serie.length ? valorHoy - ixHoy : null });
  }

  // 3. mes a mes: el último dato de cada mes (el último, hoy)
  const porMes = new Map();
  for (const x of diario) porMes.set(x.d.slice(0, 7), x);
  const mensual = [...porMes.values()];

  // 4. año a año: lo que valía cada cosa al cerrar el año y la TWR de los dos en esas fechas
  const anios = [];
  {
    const a0 = +desde.slice(0, 4), a1 = +hoy.slice(0, 4);
    const idxEn = serie && serie.length ? (d) => { let r = null; for (const x of serie) { if (x.d <= d) r = x; else break; } return r; } : null;
    const enDiario = (d) => { let r = null; for (const x of diario) { if (x.d <= d) r = x; else break; } return r; };
    for (let a = a0; a <= a1; a++) {
      const ini = a === a0 ? desde : `${a - 1}-12-31`, fin = a === a1 ? hoy : `${a}-12-31`;
      const pi = a === a0 ? compras[0].p : precio(ini), pf = a === a1 ? pFin : precio(fin);
      const twrIx = pi > 0 && pf > 0 ? (pf / pi - 1) * 100 : null;
      let twrTu = null;
      if (idxEn) {
        const xi = a === a0 ? { idx: 1 } : idxEn(ini), xf = a === a1 ? serie[serie.length - 1] : idxEn(fin);
        if (xi && xf && xi.idx > 0) twrTu = (xf.idx / xi.idx - 1) * 100;
      }
      const z = enDiario(fin);
      anios.push({ anio: a, parcialIni: a === a0 && desde > `${a}-01-01`, parcialFin: a === a1, desde: ini, hasta: fin, twrTu, twrIx, tu: a === a1 ? (serie && serie.length ? valorHoy : null) : z && z.tu, ix: a === a1 ? ixHoy : z && z.ix });
    }
  }

  // 5. las medidas, con lo que hace cada uno cada semana (las semanas del fondo)
  let medidas = null;
  if (serie && serie.length > 1) {
    const fin = new Map();
    for (const [d, p] of h) if (d >= desde && d <= hoy) fin.set(frenteSemana(d), [d, p]);
    const sems = [...fin.values()];
    const ic = frenteCursor(serie.map((x) => [x.d, x.idx]));
    const rp = [], rb = [];
    let ant = null;
    for (const [d, p] of sems) {
      const i = ic(d);
      if (ant && i > 0 && ant.i > 0 && ant.p > 0) { rp.push(i / ant.i - 1); rb.push(p / ant.p - 1); }
      ant = { i, p };
    }
    medidas = frenteMedidas(rp, rb);
  }

  // 6. las dos TIR: con tus fechas, lo tuyo y el indexado
  const cfs = flujos.map((x) => ({ d: x.d, v: x.imp }));
  const tirTu = !corto && valorHoy != null ? xirr([...cfs, { d: hoy, v: valorHoy }]) : null;
  const tirIx = !corto ? xirr([...cfs, { d: hoy, v: ixHoy }]) : null;

  // 7. de dónde sale la diferencia: cada posición contra sus propias aportaciones en el indexado
  let reparto = null;
  if (valores) {
    const por = new Map();
    for (const c of compras) { const x = por.get(c.id) || { id: c.id, u: 0, metido: 0 }; x.u += c.u; if (c.imp < 0) x.metido -= c.imp; por.set(c.id, x); }
    reparto = [...por.values()].map((x) => ({ id: x.id, metido: x.metido, tu: valores[x.id] || 0, ix: x.u * pFin, dif: (valores[x.id] || 0) - x.u * pFin }));
  }

  // 8. los momentos: el comienzo, cuando más por encima y por debajo, la última vez que cambió de lado, el 1 de enero y hoy
  const momentos = [];
  const conDif = mensual.filter((x) => x.dif != null);
  if (conDif.length) {
    momentos.push({ tipo: 'inicio', d: desde, metido: compras.filter((c) => c.d === desde).reduce((s, c) => s - c.imp, 0) });
    const max = conDif.reduce((a, b) => (b.dif > a.dif ? b : a)), min = conDif.reduce((a, b) => (b.dif < a.dif ? b : a));
    if (max.dif > 0 && max !== conDif[conDif.length - 1]) momentos.push({ tipo: 'max', d: max.d, dif: max.dif });
    if (min.dif < 0 && min !== conDif[conDif.length - 1]) momentos.push({ tipo: 'min', d: min.d, dif: min.dif });
    let cruce = null;
    for (let i = 1; i < conDif.length; i++) if (Math.sign(conDif[i].dif) !== Math.sign(conDif[i - 1].dif) && conDif[i].dif !== 0) cruce = conDif[i];
    if (cruce && cruce !== max && cruce !== min && cruce !== conDif[conDif.length - 1]) momentos.push({ tipo: 'cruce', d: cruce.d, dif: cruce.dif });
    const ene = conDif.filter((x) => x.d < `${hoy.slice(0, 4)}-01-01`).pop();
    if (ene && ene !== max && ene !== min && ene !== cruce && desde < `${hoy.slice(0, 4)}-01-01`) momentos.push({ tipo: 'enero', d: ene.d, dif: ene.dif });
    momentos.sort((a, b) => (a.d < b.d ? -1 : 1));
    momentos.push({ tipo: 'hoy', d: hoy, dif: conDif[conDif.length - 1].dif });
  }

  const tuHoy = valorHoy != null ? valorHoy : null;
  return {
    desde, hoy, dias, corto, metido, sacado, uds, ixHoy, tuHoy, negativo,
    dif: tuHoy != null ? tuHoy - ixHoy : null,
    difPct: tuHoy != null && ixHoy > 0 ? (tuHoy / ixHoy - 1) * 100 : null,
    tirTu, tirIx, diario, mensual, anios, medidas, reparto, momentos, compras,
  };
}

/* Con la cartera: los flujos de Rentabilidad, la serie de su TWR y el fondo que se elija (por defecto, el MSCI World) */
let frenteCache = { k: '', r: null };
function frenteCartera(M, id = 'fidelity-world') {
  const R = rentabilidadCartera(M);
  const k = JSON.stringify([id, R.flujos.length, R.desde, Math.round(R.valor), R.sinFecha, S.hist && S.hist.generado, hoyIso(), precioBenchHoy(id)]);
  if (frenteCache.k === k) return frenteCache.r;
  let r;
  if (!R.flujos.length) r = { sinFlujos: true };
  else if (R.sinFecha.length) r = { sinFecha: R.sinFecha };
  else {
    const valores = {};
    for (const f of M.filas) if (f.valor > 0) valores[f.inst.id] = (valores[f.inst.id] || 0) + f.valor;
    // sin precios pasados de algo de lo tuyo no hay serie de tu cartera: se queda lo de hoy, sin las gráficas
    const sinHist = [...new Set(R.flujos.map((x) => x.id))].filter((x) => { const hh = histDe(x); return !hh || !hh.length; });
    r = frenteCalc({ flujos: R.flujos, serie: R.twr && R.twr.serie, h: histBench(id), pHoy: precioBenchHoy(id), hoy: hoyIso(), valorHoy: R.valor, valores });
    r.sinHist = sinHist.map(nombreInst);
    r.sinSerie = !(R.twr && R.twr.serie && R.twr.serie.length);
    r.efectivo = M.liquidez || 0;
    r.mezcla = R.mezcla; r.aprox = R.aprox;
    // lo que ya tenías al apuntarlo, repartido en compras supuestas: si lo que dijiste que te costó no cuadra con los
    // precios de esas fechas (más de un 35 % arriba o abajo), la comparación depende de esa suposición y se dice
    r.dudosas = (R.supuestas || []).filter((x) => x.err > FRENTE_ERR_MAX).map((x) => x.n);
  }
  r.id = id;
  frenteCache = { k, r };
  return r;
}

