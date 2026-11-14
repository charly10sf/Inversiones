/* =====================================================================
   Cálculos
   ===================================================================== */
// lo de la Action primero; luego el histórico diario largo del Worker (si se ha pedido), el del catálogo y el del radar
const histAction = (id) => (S.hist && S.hist.instrumentos && S.hist.instrumentos[id]) || (S.precios && S.precios.instrumentos && S.precios.instrumentos[id] && S.precios.instrumentos[id].historico) || null;
const histBase = (id) => (S.catHist && S.catHist[id]) || (S.histRadar && S.histRadar[id]) || null;
const histDe = (id) => histAction(id) || (HIST_MAS[id] && HIST_MAS[id].h.length > 1 ? HIST_MAS[id].h : null) || histBase(id);

/* El histórico diario largo de lo que no trae la Action (10 nov). Lo del radar (WDC, cualquier acción de fuera de
   instrumentos.json) solo tenía un año de cierres semanales, y lo del catálogo ampliado, igual: la ficha de WDC en 1M
   enseñaba 4 o 5 puntos, en 3A, 5A y Máx no pasaba de un año, y en la cartera esa posición iba a saltos. Ahora, si lo que
   hay es flojo (nada, o menos de 15 cierres en los últimos 45 días), se pide al Worker (/historico): diario los 2
   últimos años y semanal hasta 10, en euros, como guarda la Action. En memoria 6 horas (5 minutos si falló la red), y
   al llegar se recalcula la cartera y se repinta la ficha. Si el Worker no responde, se queda lo de antes. */
const HIST_MAS = {}, HIST_PEND = new Set(), HIST_COLA = new Map(), HIST_LOTE = 8, HIST_VIDA = 6 * 3600e3;
let histTemp = null;
function histFlojo(h) {
  if (!h || h.length < 2) return true;
  const lim = iso(new Date(deIso(h[h.length - 1][0]).getTime() - 45 * 864e5));
  let n = 0;
  for (let k = h.length - 1; k >= 0 && h[k][0] >= lim; k--) n++;
  return n < 15;
}
function simHist(i) {
  if (!i || i.clase === 'Efectivo') return null;
  const s = String(i.yahoo || (i.clase === 'Cripto' && i.bitvavo) || '').toUpperCase();
  return s && /^[A-Z0-9^][A-Z0-9.\-=^&]{0,24}$/.test(s) ? s : null;
}
// todavía se está pidiendo (la ficha dice «Cargando» en vez de dibujar 4 puntos)
const histLargoPendiente = (id) => HIST_PEND.has(id);
function pedirHistLargo(id) {
  if (!id || HIST_PEND.has(id) || histAction(id)) return;
  if (HIST_MAS[id] && Date.now() - HIST_MAS[id].t < HIST_VIDA) return;
  if (!histFlojo(histBase(id))) return;
  const s = simHist(S.inst && S.inst[id]); if (!s) return;
  HIST_PEND.add(id); HIST_COLA.set(id, s);
  // un momento de espera: así va todo junto y, mientras, puede llegar el histórico del catálogo (que si es diario, basta)
  clearTimeout(histTemp); histTemp = setTimeout(traerHistLargo, 600);
}
async function traerHistLargo() {
  const faltan = new Map();
  for (const [id, s] of HIST_COLA) {
    if (!histFlojo(histBase(id))) { HIST_PEND.delete(id); continue; }
    if (!faltan.has(s)) faltan.set(s, []);
    faltan.get(s).push(id);
  }
  HIST_COLA.clear();
  if (!faltan.size) return;
  const sims = [...faltan.keys()], lotes = [];
  for (let k = 0; k < sims.length; k += HIST_LOTE) lotes.push(sims.slice(k, k + HIST_LOTE));
  let nuevo = false;
  await Promise.all(lotes.map(async (lote) => {
    let d = null;
    try {
      const r = await conTiempo(fetch(`${urlWorker()}/historico?s=${lote.map(encodeURIComponent).join(',')}`), 15000);
      if (r.ok) d = await r.json();
    } catch (e) { console.warn('histórico largo', e); }
    const t = d ? Date.now() : Date.now() - HIST_VIDA + 5 * 60e3;
    for (const s of lote) {
      const h = d && d.h && Array.isArray(d.h[s]) ? d.h[s].filter((x) => Array.isArray(x) && x.length === 2 && /^\d{4}-\d\d-\d\d$/.test(x[0]) && +x[1] > 0) : [];
      for (const id of faltan.get(s)) {
        HIST_PEND.delete(id);
        // lo de antes de lo que trae el Worker se queda (por si el catálogo llega más atrás)
        const viejo = h.length > 1 ? (histBase(id) || []).filter(([f]) => f < h[0][0]) : [];
        HIST_MAS[id] = { t, h: h.length > 1 ? [...viejo, ...h] : [] };
        if (h.length > 1) nuevo = true;
      }
    }
  }));
  // también si no ha llegado nada: la ficha que esperaba tiene que dibujar ya lo que hay
  if (!S.cartera) return;
  if (nuevo) { S.M = null; pintar(); if (S.ficha) refrescarFicha(); return; }
  // sin nada nuevo, solo la gráfica de la ficha que lo esperaba (para que deje de decir «Cargando»)
  const f = S.ficha && typeof filaFicha === 'function' && filaFicha();
  if (f && [...faltan.values()].some((ids) => ids.includes(f.inst.id))) dibujarFicha();
}

/* Lo que añade cada uno y la Action no sigue (no está en precios.json, como la AstraZeneca de un amigo): si la empresa
   está en el radar, su ficha sale de ahí (analistas, valoración, negocio, tendencia, próximos resultados) y su año,
   de los cierres semanales del radar (radar-hist.json), pasados a euros. Así no sale con todo vacío. */
const BANDAS_RIESGO = [0.5, 2, 5, 10, 15, 25];
/* Los cierres semanales de Yahoo (radar-hist.json): la última barra es la semana en curso, con fecha del lunes pero con el
   último precio. Western Digital, 6 nov 2026: el «2 nov» era el cierre del jueves (238,53 €) cuando el lunes valía unos
   335 €, y la gráfica de 1S enseñaba +4 % en una semana en que bajó casi un 29 %. Esa barra se quita (la pone el precio de hoy). */
function puntosRadarHist(e, rh) {
  const d0 = deIso(e.d), paso = rh.paso || 7, gen = String(rh.generado || '').slice(0, 10) || hoyIso();
  const pts = e.v.map((v, n) => { const x = new Date(d0); x.setDate(d0.getDate() + n * paso); return [iso(x), v]; });
  if (pts.length && diasEntre(pts[pts.length - 1][0], gen) < paso) pts.pop();
  return pts;
}
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
      const k = r.pe / r.p;
      const serie = puntosRadarHist(e, rh).map(([f, v]) => [f, +(v * k).toFixed(4)]).filter((x) => x[1] > 0 && x[0] <= hoy);
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
    per: r.per, per_futuro: r.perf, dividendo_pct: r.div || null, beta: r.beta, beta_ref: r.bi || null, proximos_resultados: r.rd || null, ex_dividendo: r.xd || null,
    estimaciones: r.epsg != null ? { este_anio: { crec: r.epsg } } : {},
  };
}

