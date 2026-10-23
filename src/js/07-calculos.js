/* =====================================================================
   Cálculos
   ===================================================================== */
const histDe = (id) => (S.hist && S.hist.instrumentos && S.hist.instrumentos[id]) || (S.precios && S.precios.instrumentos && S.precios.instrumentos[id] && S.precios.instrumentos[id].historico) || (S.catHist && S.catHist[id]) || (S.histRadar && S.histRadar[id]) || null;

/* Lo que añade cada uno y la Action no sigue (no está en precios.json, como la AstraZeneca de un amigo): si la empresa
   está en el radar, su ficha sale de ahí (analistas, valoración, negocio, tendencia, próximos resultados) y su año,
   de los cierres semanales del radar (radar-hist.json), pasados a euros. Así no sale con todo vacío. */
const BANDAS_RIESGO = [0.5, 2, 5, 10, 15, 25];
let histRadarPedido = false;
function pedirHistRadar() {
  if (histRadarPedido || typeof radarHist !== 'function') return;
  histRadarPedido = true;
  radarHist().then((rh) => {
    if (!rh || !rh.s) return;
    S.histRadar = S.histRadar || {};
    let hay = false;
    const hoy = hoyIso();
    for (const id of Object.keys(S.inst || {})) {
      const i = S.inst[id];
      if (!i || !i.yahoo || (S.precios && S.precios.instrumentos && S.precios.instrumentos[id])) continue;
      const e = rh.s[i.yahoo] || rh.s[String(i.yahoo).toUpperCase()], r = radarPorSim(i.yahoo);
      if (!e || !e.d || !Array.isArray(e.v) || !r || !(r.p > 0) || !(r.pe > 0)) continue;
      const k = r.pe / r.p, d0 = deIso(e.d), paso = rh.paso || 7;
      const serie = e.v.map((v, n) => { const x = new Date(d0); x.setDate(d0.getDate() + n * paso); return [iso(x), +(v * k).toFixed(4)]; }).filter((x) => x[1] > 0 && x[0] <= hoy);
      if (serie.length && serie[serie.length - 1][0] < hoy) serie.push([hoy, +r.pe.toFixed(4)]);
      if (serie.length >= 4) { S.histRadar[id] = serie; hay = true; }
    }
    if (hay && S.cartera) { S.M = null; pintar(); if (S.ficha) refrescarFicha(); }
  }).catch(() => {});
}
function pRadar(inst) {
  const r = inst && inst.yahoo && inst.tipo !== 'Cripto' && !/^Fondo/.test(inst.tipo || '') ? radarPorSim(inst.yahoo) : null;
  if (!r || !(r.pe > 0)) return null;
  const k = r.p > 0 ? r.pe / r.p : 1, eur = (v) => (v != null && isFinite(v) && v > 0 ? +(v * k).toFixed(4) : null);
  const votos = (a) => (Array.isArray(a) && a.length === 5 ? { strongBuy: a[0], buy: a[1], hold: a[2], sell: a[3], strongSell: a[4] } : null);
  const h = S.histRadar && S.histRadar[inst.id];
  const rent = { '1a': r.c1a != null ? +r.c1a : null };
  let volatilidad = null, riesgo = null;
  if (h && h.length > 8) {
    const ult = h[h.length - 1][1], hace = (dias) => { const d = iso(new Date(Date.now() - dias * 864e5)); const x = h.filter((y) => y[0] <= d).pop(); return x ? (ult / x[1] - 1) * 100 : null; };
    rent['1m'] = hace(30); rent['3m'] = hace(91); rent['6m'] = hace(182);
    // lo que va de año, desde el último cierre del año pasado (como precios.py); si no lo hay, desde el primero de este
    const y0 = `${new Date().getFullYear()}-01-01`, ant = h.filter((y) => y[0] < y0).pop(), ene = h.find((y) => y[0] >= y0);
    if (ant) rent.ytd = (ult / ant[1] - 1) * 100; else if (ene) rent.ytd = (ult / ene[1] - 1) * 100;
    const rets = h.slice(1).map((y, n) => Math.log(y[1] / h[n][1])).filter(isFinite);
    if (rets.length > 8) { const m = rets.reduce((a, b) => a + b, 0) / rets.length; volatilidad = Math.sqrt(rets.reduce((a, b) => a + (b - m) ** 2, 0) / (rets.length - 1)) * Math.sqrt(52) * 100; riesgo = 1 + BANDAS_RIESGO.filter((b) => volatilidad >= b).length; }
  }
  const t50 = r.m50, t200 = r.m200;
  return {
    radar: true, simbolo: r.s, moneda: r.m, precio: r.pe, precio_local: r.p, variacion_dia: r.v != null ? +r.v : null,
    cierre_anterior: r.v != null ? r.pe / (1 + r.v / 100) : null, fecha: String(r.f || '').slice(0, 10) || null,
    max52: eur(r.mx), min52: eur(r.mn), rent, volatilidad, riesgo,
    tecnico: { media50: eur(t50), media200: eur(t200), vs_media200: t200 ? (r.p / t200 - 1) * 100 : null, dist_max52: r.mx ? (r.p / r.mx - 1) * 100 : null,
      tendencia: t50 && t200 ? (r.p > t50 && t50 > t200 ? 'alcista' : r.p < t50 && t50 < t200 ? 'bajista' : 'lateral') : null },
    nombre_largo: r.n, sector: r.sector, industria: r.ind,
    analistas: r.na ? { recomendacion: CONSENSO[r.r] || null, clave: r.r, media: r.rm, num: r.na, objetivo: eur(r.obj), objetivo_alto: eur(r.ta), objetivo_bajo: eur(r.tb), votos: { ahora: votos(r.v0), hace3m: votos(r.v3) }, cambios: [] } : null,
    fundamentales: { capitalizacion: r.cap && S.precios && S.precios.fx ? r.cap * (r.m === 'EUR' ? 1 : S.precios.fx[r.m === 'GBp' ? 'GBP' : r.m] || 0) || null : null, per: r.per, per_futuro: r.perf, margen: r.mg, roe: r.roe, crec_ingresos: r.rg, deuda_capital: r.de, beta: r.beta },
    per: r.per, per_futuro: r.perf, dividendo_pct: r.div || null, beta: r.beta, proximos_resultados: r.rd || null, ex_dividendo: r.xd || null,
    estimaciones: r.epsg != null ? { este_anio: { crec: r.epsg } } : {},
  };
}

