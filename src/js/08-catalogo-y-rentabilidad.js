/* =====================================================================
   Catálogo común (rama "catalogo", una vez al día): unos cien fondos, ETF, oro y cripto con su ISIN,
   precio e histórico, para que cualquiera encuentre su fondo exacto aunque no esté en instrumentos.json.
   ===================================================================== */
async function cargarCatalogo() {
  let txt = null;
  try {
    const r = await fetch(CFG.dev ? 'dev/catalogo-precios.json' : GH.raw('catalogo-precios.json', 'catalogo') + '?v=' + Math.floor(Date.now() / 3600000), { cache: 'no-cache' });
    if (r.ok) txt = await r.text();
  } catch (e) { console.warn(e); }
  if (txt) { try { localStorage.setItem('inv-cache-cat', txt); } catch (e) {} } else { try { txt = localStorage.getItem('inv-cache-cat'); } catch (e) {} }
  try { S.cat = txt ? JSON.parse(txt) : null; } catch (e) { S.cat = null; }
  catLocalMezclar();
}
/* lo que se añadió del catálogo se queda con la clase que trae hoy (0.3.5: la plata dejó de ser «renta variable» y
   las mineras de oro, «oro»). Se mira en cada cálculo: son pocas y así vale también para lo que llega con tu cartera */
function alinearConCatalogo() {
  const v = S.cat && S.cat.v; if (!v || !S.inst) return;
  // una posición de algo del catálogo cuyo instrumento no está (no se llegó a guardar): se rehace con su ficha
  for (const p of (S.cartera && S.cartera.posiciones) || []) if (p.instrumento && !S.inst[p.instrumento] && v[p.instrumento]) instDeCatalogo(p.instrumento);
  for (const id of S.instOrden || []) {
    const i = S.inst[id], x = i && i.cat && v[i.cat];
    if (!x || !x.cl || i.clase === x.cl) continue;
    i.clase = x.cl; if (x.t) i.tipo = x.t; if (x.r) i.region = x.r;
    if (['Oro', 'Materias primas', 'Renta fija', 'Monetario'].includes(x.cl)) i.sector_fijo = x.cl; else if (i.sector_fijo && i.sector_fijo !== 'Cripto') delete i.sector_fijo;
  }
}
/* la ficha del catálogo de un instrumento (por ISIN o por símbolo) */
function catDe(inst) {
  const v = S.cat && S.cat.v; if (!v || !inst) return null;
  if (inst.cat && v[inst.cat]) return v[inst.cat];
  const isin = String(inst.isin || '').toUpperCase(), sim = String(inst.yahoo || '').toUpperCase();
  for (const [k, x] of Object.entries(v)) if ((isin && String(x.isin || '').toUpperCase() === isin) || (sim && String(x.s || '').toUpperCase() === sim)) { inst.cat = k; return x; }
  return null;
}
/* da de alta (o devuelve) el instrumento de una ficha del catálogo */
function instDeCatalogo(cid) {
  const x = S.cat && S.cat.v && S.cat.v[cid]; if (!x) return null;
  const ya = S.instOrden.find((id) => S.inst[id].cat === cid || (x.isin && String(S.inst[id].isin || '').toUpperCase() === String(x.isin).toUpperCase()) || (x.s && String(S.inst[id].yahoo || '').toUpperCase() === String(x.s).toUpperCase()));
  if (ya) return ya;
  const i = { id: cid, nombre: x.n, corto: x.c || x.n, tipo: x.t, clase: x.cl, region: x.r || { Global: 100 }, cat: cid };
  if (x.isin) i.isin = x.isin; if (x.s) i.yahoo = x.s; if (x.pais) i.pais = x.pais; if (x.dom) i.dominio = x.dom;
  if (x.cl === 'Cripto') { if (/-EUR$/i.test(x.s || '')) i.bitvavo = x.s; i.sector_fijo = 'Cripto'; } else if (['Oro', 'Materias primas', 'Renta fija', 'Monetario'].includes(x.cl)) i.sector_fijo = x.cl;
  if (x.local && x.h && x.h.length) { S.catHist = S.catHist || {}; S.catHist[cid] = x.h; }
  S.inst[cid] = i; S.instOrden.push(cid); S.instCambiados = true;
  return cid;
}
/* el histórico del catálogo de lo que tienes (solo lo que no trae ya la Action de cada 20 minutos) */
async function cargarHistCatalogo(ids) {
  S.catHist = S.catHist || {};
  // lo añadido con su ISIN que aún no está en el catálogo de todos: su año viene guardado en este dispositivo
  for (const id of S.instOrden || []) { const x = S.inst[id] && S.inst[id].cat && S.cat && S.cat.v && S.cat.v[S.inst[id].cat]; if (x && x.local && x.h && x.h.length && !S.catHist[id]) S.catHist[id] = x.h; }
  const quiero = (ids || [...new Set((S.cartera.posiciones || []).map((p) => p.instrumento))]).filter((id) => !S.catHist[id] && S.inst[id] && !(S.hist && S.hist.instrumentos && S.hist.instrumentos[id]) && catDe(S.inst[id]));
  if (!quiero.length) return false;
  await Promise.all(quiero.map(async (id) => {
    const cid = S.inst[id].cat;
    try { const r = await fetch(CFG.dev ? `dev/cat/${cid}.json` : GH.raw(`cat/${cid}.json`, 'catalogo') + '?v=' + Math.floor(Date.now() / 3600000), { cache: 'no-cache' }); if (r.ok) { const j = await r.json(); if (j && j.h) S.catHist[id] = j.h; } } catch (e) {}
  }));
  return true;
}
const histMercado = (sym) => (S.hist && S.hist.mercados && S.hist.mercados[sym]) || null;

function precioEn(hist, fecha, modo) {
  // modo 'antes': último cierre con fecha <= fecha; 'despues': primer cierre con fecha > fecha
  if (!hist || !hist.length) return null;
  if (modo === 'antes') {
    let r = null;
    for (const [d, p] of hist) { if (d <= fecha) r = p; else break; }
    return r;
  }
  for (const [d, p] of hist) if (d > fecha) return p;
  return null;
}

function fechasAportacion(a, despuesDe, hasta) {
  const out = [];
  const desde = a.desde && a.desde > despuesDe ? a.desde : despuesDe;
  if (!desde) return out;
  let d = deIso(desde); d = new Date(d.getFullYear(), d.getMonth(), 1);
  const fin = deIso(hasta);
  while (d <= fin) {
    const ult = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    const f = iso(new Date(d.getFullYear(), d.getMonth(), Math.min(+a.dia || 1, ult)));
    if (f > despuesDe && (!a.desde || f >= a.desde) && (!a.hasta || f <= a.hasta) && f <= hasta) out.push(f);
    d = new Date(d.getFullYear(), d.getMonth() + 1, 1);
  }
  return out;
}

function instDe(id) {
  return S.inst[id] || { id, nombre: id, corto: id, clase: 'Otros', tipo: 'Otros', region: { Global: 100 } };
}

/* Una posición: unidades (exactas o estimadas), aportaciones automáticas sumadas, valor y ganancia */
function calcularPos(pos, hoy) {
  const P = (S.precios && S.precios.instrumentos) || {};
  const inst = instDe(pos.instrumento);
  const p = P[pos.instrumento] || pRadar(inst) || null;
  if (p && p.radar && !(S.histRadar && S.histRadar[pos.instrumento])) pedirHistRadar();
  const hist = histDe(pos.instrumento);
  let precio = p ? p.precio : null;
  let prev = p ? p.cierre_anterior : null;
  let varDia = p ? p.variacion_dia : null;
  // lo que no está en la lista de la Action: el precio diario del catálogo común
  // de qué día es el precio (los fondos del catálogo y los que salen del histórico también: antes, un valor liquidativo
  // viejo de esos fondos contaba en «Hoy» todos los días)
  let fechaPrecio = p && p.fecha ? p.fecha : null;
  if (precio == null) { const ce = catDe(inst); if (ce && ce.p) { precio = ce.p; prev = ce.pa || null; varDia = prev ? (precio / prev - 1) * 100 : null; fechaPrecio = ce.f || null; } }
  // recién dada de alta: hasta que la Action le busque precio (unos minutos), el último cierre o el del radar
  if (precio == null && hist && hist.length) { precio = hist[hist.length - 1][1]; prev = hist.length > 1 ? hist[hist.length - 2][1] : null; varDia = prev ? (precio / prev - 1) * 100 : null; fechaPrecio = hist[hist.length - 1][0]; }
  if (precio == null && inst.yahoo) { const r = radarPorSim(inst.yahoo); if (r && r.pe) { precio = r.pe; varDia = r.v != null ? r.v : null; prev = varDia != null ? precio / (1 + varDia / 100) : null; } }
  const vivo = S.live[pos.instrumento];
  if (vivo) { precio = vivo.precio; varDia = vivo.var; prev = varDia != null ? precio / (1 + varDia / 100) : prev; }

  let uds = pos.cantidad === '' || pos.cantidad == null ? null : +pos.cantidad;
  let estimada = !!pos.estimada;
  if (uds == null && pos.valor_ref && hist) {
    const pr = precioEn(hist, pos.fecha || hoy, 'antes');
    if (pr) { uds = pos.valor_ref / pr; estimada = true; }
  }
  let coste = +pos.coste || 0, pendiente = 0;
  const aportes = [];
  for (const a of S.cartera.aportaciones || []) {
    if (a.instrumento !== pos.instrumento || (a.plataforma && a.plataforma !== pos.plataforma) || !(+a.importe)) continue;
    for (const f of fechasAportacion(a, pos.fecha || hoy, hoy)) {
      const pr = hist ? precioEn(hist, f, 'despues') : null;
      if (pr && uds != null) { uds += a.importe / pr; aportes.push({ f, importe: +a.importe, precio: pr }); }
      else { pendiente += +a.importe; aportes.push({ f, importe: +a.importe, precio: null }); }
      coste += +a.importe;
    }
  }
  // sin precio todavía (recién añadida, o un valor que no encuentra nadie): vale lo que costó, no cero; si no, saldría
  // como una pérdida del 100 % y GrowFolio propondría venderla
  const sinPrecio = !(uds != null && precio != null) && !(+pos.valor_ref);
  const valorPos = uds != null && precio != null ? uds * precio : (+pos.valor_ref || (+pos.coste || 0));
  const valor = valorPos + pendiente;
  // «Hoy»: lo que se ha movido desde el cierre de ayer, salvo lo comprado hoy (eso, desde su precio de compra)
  let dia = uds != null && precio != null && prev ? uds * (precio - prev) : 0;
  if (dia && uds > 0) {
    const deHoy = (S.cartera.movimientos || []).filter((m) => m.tipo === 'compra' && m.instrumento === pos.instrumento && (!m.plataforma || !pos.plataforma || m.plataforma === pos.plataforma) && m.fecha === hoy && +m.uds > 0 && +m.precio > 0);
    for (const m of deHoy) dia -= Math.min(+m.uds, uds) * (+m.precio - prev);
  }
  // los fondos publican su valor con uno o dos días de retraso: su último cambio cuenta en «Hoy» mientras sea de
  // esas dos últimas sesiones; si es más viejo (un dato atascado), no se repite día tras día
  const diaViejo = !vivo && fechaPrecio && /^Fondo/.test(inst.tipo || '') && fechaPrecio < habilAntes(habilAntes(hoy)) ? fechaPrecio : null;
  if (diaViejo) dia = 0;
  return { pos, inst, p, hist, uds, estimada, precio, varDia, diaViejo, valor, dia, coste, pl: sinPrecio ? 0 : valor - coste, plPct: sinPrecio ? null : coste ? (valor / coste - 1) * 100 : null, aportes, pendiente, vivo: !!vivo, sinPrecio };
}

function calcular() {
  const hoy = hoyIso();
  alinearConCatalogo();
  const filas = (S.cartera.posiciones || []).map((pos) => calcularPos(pos, hoy));
  const efectivo = (S.cartera.efectivo || []).filter((e) => +e.importe).map((e) => ({ plataforma: e.plataforma, importe: +e.importe }));
  const totalPos = sum(filas, (f) => f.valor);
  const liquidez = sum(efectivo, (e) => e.importe);
  const total = totalPos + liquidez;
  const invertido = sum(filas, (f) => f.coste);
  const dia = sum(filas, (f) => f.dia);
  for (const f of filas) f.peso = total ? (f.valor / total) * 100 : 0;
  filas.sort((a, b) => b.valor - a.valor);
  const M = { filas, efectivo, liquidez, total, totalPos, invertido, dia, diaPct: total - dia ? (dia / (total - dia)) * 100 : 0, pl: totalPos - invertido, plPct: invertido ? (totalPos / invertido - 1) * 100 : 0 };
  M.dividendos = sum(filas, (f) => (f.p && f.p.dividendo_pct ? (f.valor * f.p.dividendo_pct) / 100 : 0));
  M.realizado = fiscalAnio(new Date().getFullYear()).gp;
  // 0.3.9: los límites se miran sumando el grupo (como en Objetivos): toda la cripto, oro y materias primas, y la misma
  // empresa en dos brókers. Antes, BTC 4 % + ETH 4 % con un límite del 5 % no saltaba en ninguna señal
  M.pesoLim = {}; M.nLim = {};
  for (const f of filas) { const g = grupoLim(f); M.pesoLim[g] = (M.pesoLim[g] || 0) + f.peso; M.nLim[g] = (M.nLim[g] || 0) + 1; }
  // 0.5, modo estándar: en vez de la señal de GrowFolio (una recomendación para ti), lo que opinan los analistas
  const est = esPublico();
  for (const f of filas) f.senal = est ? senalAnalistas(f) : senal(f, M);
  if (!est) estabilizarSenales(filas);
  return M;
}

/* Resultado de las ventas registradas (lo que va a la declaración de la renta) */
function realizadoAnio(anio) {
  return sum((S.cartera.movimientos || []).filter((m) => m.tipo === 'venta' && String(m.fecha).startsWith(String(anio))), (m) => m.resultado || 0);
}
function irpfAhorro(base) {
  // Escala del ahorro: la estatal más la autonómica (19 % hasta 6.000 €, 21 % hasta 50.000, 23 % hasta 200.000,
  // 27 % hasta 300.000 y 30 % el resto), o la foral si vives en País Vasco o Navarra
  if (!(base > 0)) return 0;
  const tramos = tramosAhorro();
  let resto = base, previo = 0, cuota = 0;
  for (const [hasta, tipo] of tramos) { const t = Math.min(resto, hasta - previo); if (t <= 0) break; cuota += t * tipo; resto -= t; previo = hasta; }
  return cuota;
}

function pesosSector(f) {
  const i = f.inst;
  if (i.sector_fijo) return { [i.sector_fijo]: 100 };
  if (i.sector_etf) {
    const out = {}; let ok = 0;
    for (const [etf, w] of Object.entries(i.sector_etf)) {
      const s = S.precios && S.precios.sectores_etf && S.precios.sectores_etf[etf];
      if (!s) continue;
      const tot = sum(Object.values(s)) || 100;
      for (const [k, v] of Object.entries(s)) out[k] = (out[k] || 0) + (v / tot) * 100 * w;
      ok += w;
    }
    if (ok) { for (const k in out) out[k] /= ok; return out; }
    return { 'Sin datos': 100 };
  }
  if (f.p && f.p.sector) return { [f.p.sector]: 100 };
  return { 'Sin datos': 100 };
}

const RIESGO_TXT = ['', 'Muy bajo', 'Bajo', 'Bajo-medio', 'Medio', 'Medio-alto', 'Alto', 'Muy alto'];

function reparto(M, dim, base) {
  const acc = new Map();
  const add = (k, v) => acc.set(k, (acc.get(k) || 0) + v);
  const soloRV = base === 'rv' && dim !== 'clase';
  for (const f of M.filas) {
    if (soloRV && f.inst.clase !== 'Renta variable') continue;
    const v = f.valor;
    if (dim === 'clase') add(f.inst.clase || 'Otros', v);
    else if (dim === 'producto') add(f.inst.tipo || 'Otros', v);
    else if (dim === 'plataforma') add(f.pos.plataforma || 'Sin plataforma', v);
    else if (dim === 'riesgo') add(f.p && f.p.riesgo ? f.p.riesgo : 0, v);
    else if (dim === 'region' || dim === 'sector') {
      const w = dim === 'region' ? (f.inst.region || { Global: 100 }) : pesosSector(f);
      const t = sum(Object.values(w)) || 100;
      for (const [k, x] of Object.entries(w)) add(k, (v * x) / t);
    }
  }
  // el efectivo en negativo (un descubierto, un dato mal puesto) no se reparte: saldrían porciones negativas
  if (!soloRV) for (const e of M.efectivo) if (e.importe > 0) add(dim === 'plataforma' ? e.plataforma : dim === 'riesgo' ? 1 : 'Efectivo', e.importe);
  const tot = sum([...acc.values()]);
  let out = [...acc.entries()].map(([k, v]) => ({ k, v, pct: tot ? (v / tot) * 100 : 0 }));
  if (dim === 'riesgo') out = out.sort((a, b) => a.k - b.k).map((x) => ({ ...x, k: x.k ? `${x.k}, ${RIESGO_TXT[x.k].toLowerCase()}` : 'Sin datos' }));
  else out.sort((a, b) => b.v - a.v);
  return { filas: out, total: tot };
}

/* Valor de tus posiciones de hoy con los precios de cada día (no cuenta compras ni ventas pasadas).
   El último punto es el valor de ahora mismo, con los precios en directo. */
function serieCartera(M, dias) {
  const desde = iso(new Date(Date.now() - dias * 86400000));
  const items = M.filas.filter((f) => f.uds != null && f.hist && f.hist.length);
  const fechas = new Set();
  for (const f of items) for (const [d] of f.hist) if (d >= desde) fechas.add(d);
  const orden = [...fechas].sort();
  if (orden.length < 2) return [];
  // lo que aún no cotizaba ese día (una salida a bolsa reciente, un fondo nuevo) cuenta a su primer precio: así la
  // gráfica llega tan atrás como lo demás, en vez de empezar el día que salió lo último que compraste
  const idx = items.map(() => 0), ult = items.map((f) => precioEn(f.hist, desde, 'antes') ?? f.hist[0][1]);
  const out = [];
  for (const d of orden) {
    let v = 0, completo = true;
    items.forEach((f, k) => {
      const h = f.hist;
      while (idx[k] < h.length && h[idx[k]][0] <= d) { ult[k] = h[idx[k]][1]; idx[k]++; }
      if (ult[k] == null) completo = false; else v += f.uds * ult[k];
    });
    if (completo) out.push({ d, v });
  }
  if (out.length && items.every((f) => f.precio != null)) {
    const hoy = hoyIso(), ahora = sum(items, (f) => f.uds * f.precio);
    if (out[out.length - 1].d === hoy) out[out.length - 1].v = ahora; else if (out[out.length - 1].d < hoy) out.push({ d: hoy, v: ahora });
  }
  return out;
}

/* Serie de un instrumento escalada para empezar en el mismo valor que otra (para comparar) */
function serieComparada(base, id) {
  const h = histBench(id);
  if (!h || base.length < 2) return [];
  const p0 = precioEn(h, base[0].d, 'antes');
  if (!p0) return [];
  const viva = S.live[id] && S.live[id].precio;
  return base.map((x, i) => {
    const p = i === base.length - 1 && viva ? viva : precioEn(h, x.d, 'antes');
    return { d: x.d, v: p ? (base[0].v * p) / p0 : null };
  }).filter((x) => x.v != null);
}

function volatilidadSerie(serie) {
  if (serie.length < 30) return null;
  const r = [];
  for (let i = 1; i < serie.length; i++) if (serie[i - 1].v > 0) r.push(Math.log(serie[i].v / serie[i - 1].v));
  const m = sum(r) / r.length;
  const sd = Math.sqrt(sum(r, (x) => (x - m) ** 2) / (r.length - 1));
  const diasN = diasEntre(serie[0].d, serie[serie.length - 1].d) || 365;
  return sd * Math.sqrt((r.length * 365) / diasN) * 100;
}
const claseRiesgo = (vol) => (vol == null ? null : 1 + [0.5, 2, 5, 10, 15, 25].filter((b) => vol >= b).length);

/* ---------- 0.3.10: con qué compararte ----------
   Fondos indexados en euros y de acumulación: llevan dentro los dividendos y sus comisiones, como lo tuyo. El Ibex
   es el índice de precios (sin dividendos) y solo tiene el último año. El 60/40 se rehace cada día: 60 % MSCI World
   y 40 % renta fija a corto plazo. */
const BENCH = [
  { id: 'fidelity-world', n: 'MSCI World', en: 'MSCI World', x: 'las grandes empresas de los países ricos', xe: 'large companies in developed countries' },
  { id: 'ishares-us', n: 'S&P 500', en: 'S&P 500', x: 'las 500 mayores de EEUU', xe: 'the 500 largest US companies' },
  { id: 'amundi-europe', n: 'MSCI Europe', en: 'MSCI Europe', x: 'las grandes de Europa', xe: 'large European companies' },
  { id: 'vanguard-em', n: 'Emergentes', en: 'Emerging markets', x: 'China, India, Taiwán, Brasil…', xe: 'China, India, Taiwan, Brazil…' },
  { id: '6040', n: '60/40', en: '60/40', x: '60 % MSCI World y 40 % renta fija a corto', xe: '60 % MSCI World and 40 % short-term bonds', mezcla: [['fidelity-world', 0.6], ['nb-short', 0.4]] },
  { id: '^IBEX', n: 'Ibex 35', en: 'Ibex 35', x: 'sin dividendos y solo el último año', xe: 'without dividends, last year only' },
];
const benchDe = (id) => BENCH.find((b) => b.id === id) || BENCH[0];
const nombreBench = (b) => (IDIOMA === 'en' ? b.en : b.n);
let benchCache = { k: '', h: {} };
function histBench(id) {
  const k = (S.hist && S.hist.generado) || '';
  if (benchCache.k !== k) benchCache = { k, h: {} };
  if (benchCache.h[id] !== undefined) return benchCache.h[id];
  const b = BENCH.find((x) => x.id === id);
  let h = null;
  if (b && b.mezcla) {
    const hs = b.mezcla.map(([i]) => histDe(i));
    if (hs.every((x) => x && x.length > 1)) {
      const ini = hs.map((x) => x[0][0]).sort().pop();
      const fechas = [...new Set(hs.flatMap((x) => x.map(([d]) => d)))].filter((d) => d >= ini).sort();
      const pt = hs.map(() => 0), ult = hs.map(() => null);
      let v = 100;
      h = [];
      for (const d of fechas) {
        const ant = ult.slice();
        hs.forEach((x, j) => { while (pt[j] < x.length && x[pt[j]][0] <= d) { ult[j] = x[pt[j]][1]; pt[j]++; } });
        if (ant.every((p) => p)) v *= sum(b.mezcla.map(([, w], j) => w * (ult[j] / ant[j])));
        if (ult.every((p) => p)) h.push([d, v]);
      }
    }
  } else h = histDe(id) || (S.hist && S.hist.mercados && S.hist.mercados[id]) || null;
  benchCache.h[id] = h && h.length > 1 ? h : null;
  return benchCache.h[id];
}
// el último precio: el de hoy en directo si lo hay (el Ibex, el S&P 500 en bolsa), si no, el último cierre
const precioBenchHoy = (id) => { const h = histBench(id); return (S.live[id] && S.live[id].precio) || (h ? h[h.length - 1][1] : null); };

/* ---------- 0.3.10: la rentabilidad de verdad ----------
   El dinero que has metido y sacado, con su fecha:
   - cada compra (cada lote) entra lo que costó, el día que la hiciste; las aportaciones automáticas, igual;
   - cada venta sale lo que cobraste ese día, y sus lotes entraron en su fecha;
   - hoy, lo que vale lo que tienes (sin el efectivo: se mide lo invertido).
   Lo que ya tenías al apuntarlo en GrowFolio es un lote a tu precio medio, sin fechas. Se reparte en compras supuestas
   que cuadran con lo que tienes: con lo que te costó, ¿de golpe el día que dijiste que lo tienes («desde», en Editar)
   o lo mismo cada mes desde esa fecha hasta que lo apuntaste? Se queda la forma que da las participaciones que tienes
   de verdad. Si no dijiste desde cuándo pero sí cuándo empezaste a invertir, se prueba «cada mes desde» cada mes
   posible a partir de ahí. Sin ninguna de las dos fechas, no hay forma de saberlo.
   Los dividendos cobrados no están: GrowFolio no los apunta uno a uno. */
function comprasSupuestas(pos, id, u, c) {
  const alta = pos.fecha || hoyIso();
  const desde = pos.desde || (pos.entrada && pos.entrada.fecha && pos.entrada.fecha < alta ? pos.entrada.fecha : null);
  const ini = inicioDicho();
  const d0 = desde || (ini && ini < alta ? ini : null);
  if (!d0 || !(u > 0) || !(c > 0)) return null;
  const h = histDe(id);
  if (!h || !h.length || h[0][0] > d0) return { compras: [{ d: d0, c, u }], como: 'golpe', d: d0 };
  // un precio por mes, desde la primera fecha hasta el alta, y la suma de 1/precio desde cada mes hasta el final
  const meses = [];
  for (let d = d0; d < alta; d = sumarMeses(d, 1)) meses.push(d);
  if (!meses.length) meses.push(d0);
  const ps = [];
  let k = 0, ultimo = null;
  for (const d of meses) { while (k < h.length && h[k][0] <= d) { ultimo = h[k][1]; k++; } ps.push(ultimo); }
  if (ps.some((x) => !x)) return { compras: [{ d: d0, c, u }], como: 'golpe', d: d0 };
  const suf = new Array(meses.length + 1).fill(0);
  for (let m = meses.length - 1; m >= 0; m--) suf[m] = suf[m + 1] + 1 / ps[m];
  const opciones = [];
  const poco = (m) => { const n = meses.length - m, uImp = (c / n) * suf[m]; opciones.push({ como: 'poco', m, err: Math.abs(Math.log(uImp / u)), uImp }); };
  if (desde) { opciones.push({ como: 'golpe', m: 0, err: Math.abs(Math.log(c / ps[0] / u)), uImp: c / ps[0] }); poco(0); }
  else for (let m = 0; m < meses.length; m++) poco(m);
  const o = opciones.sort((a, b) => a.err - b.err)[0];
  const ajuste = u / o.uImp;
  if (o.como === 'golpe') return { compras: [{ d: meses[0], c, u }], como: 'golpe', d: meses[0], err: o.err };
  const n = meses.length - o.m, imp = c / n;
  return { compras: meses.slice(o.m).map((d, i) => ({ d, c: imp, u: (ajuste * imp) / ps[o.m + i] })), como: 'poco', d: meses[o.m], err: o.err };
}
function flujosCartera(M) {
  const flujos = [], sinFecha = new Set(), mez = new Map(), supuestas = [];
  let aprox = false;
  const juntar = (pos, id, n, u, c) => { const x = mez.get(pos.id) || { pos, id, n, u: 0, c: 0 }; x.u += u; x.c += c; mez.set(pos.id, x); };
  for (const f of M.filas) {
    if (!(f.valor > 0)) continue;
    let lotes; try { lotes = lotesDe(f.pos); } catch (e) { continue; }
    for (const l of lotes) {
      if (!(l.c > 0)) continue;
      if (l.mezcla) juntar(f.pos, f.inst.id, f.inst.corto || f.inst.nombre, l.u, l.c);
      else flujos.push({ d: l.f, imp: -l.c, id: f.inst.id, u: l.u });
    }
  }
  for (const m of (S.cartera && S.cartera.movimientos) || []) {
    if (m.tipo !== 'venta' || !(m.importe > 0) || !m.fecha) continue;
    if (!Array.isArray(m.fifo) || !m.fifo.length) { aprox = true; continue; }
    const pos = (S.cartera.posiciones || []).find((p) => p.id === m.posicion);
    flujos.push({ d: m.fecha, imp: +m.importe, id: m.instrumento, u: -(+m.uds || 0) });
    for (const l of m.fifo) {
      if (m.mezcla && pos && l.f === pos.fecha) { juntar(pos, m.instrumento, nombreInst(m.instrumento), +l.u || 0, +l.c || 0); continue; }
      if (m.mezcla) aprox = true;
      flujos.push({ d: l.f, imp: -(+l.c || 0), id: m.instrumento, u: +l.u || 0 });
    }
  }
  for (const x of mez.values()) {
    const cs = comprasSupuestas(x.pos, x.id, x.u, x.c);
    if (!cs) { sinFecha.add(x.n); continue; }
    supuestas.push({ n: x.n, como: cs.como, d: cs.d, err: cs.err });
    for (const y of cs.compras) flujos.push({ d: y.d, imp: -y.c, id: x.id, u: y.u, mezcla: true });
  }
  flujos.sort((a, b) => (a.d < b.d ? -1 : a.d > b.d ? 1 : a.imp - b.imp));
  const valor = sum(M.filas.filter((f) => f.valor > 0), (f) => f.valor);
  return { flujos, sinFecha: [...sinFecha], supuestas, mezcla: supuestas.length > 0, aprox, valor, desde: flujos.length ? flujos[0].d : null };
}
// TIR (XIRR): el tipo al año que hace que todo lo que entró y salió, con sus fechas, valga lo de hoy
function xirr(cfs) {
  if (cfs.length < 2 || !cfs.some((c) => c.v > 0) || !cfs.some((c) => c.v < 0)) return null;
  const t0 = deIso(cfs[0].d).getTime();
  const xs = cfs.map((c) => ({ t: (deIso(c.d).getTime() - t0) / (365.25 * 864e5), v: c.v }));
  const vpn = (r) => sum(xs, (x) => x.v / Math.pow(1 + r, x.t));
  let lo = -0.9999, hi = 10, flo = vpn(lo), fhi = vpn(hi);
  if (!isFinite(flo) || !isFinite(fhi) || flo * fhi > 0) return null;
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2, fm = vpn(mid);
    if (Math.abs(fm) < 1e-7 || hi - lo < 1e-10) return mid * 100;
    if (fm * flo < 0) { hi = mid; } else { lo = mid; flo = fm; }
  }
  return ((lo + hi) / 2) * 100;
}
/* TWR: lo que ha hecho la cartera sin contar cuándo metiste o sacaste dinero (la que se compara con un índice).
   Día a día: lo que vale lo que tenías ese día, quitando lo que entró o salió. Lo que ya tenías al apuntarlo entra a
   lo que valía en el mercado ese día (no a tu precio medio, que es de otras fechas). */
function twrCartera(F, M) {
  const fl = F.flujos;
  if (!fl.length) return null;
  const ids = [...new Set(fl.map((x) => x.id))];
  const H = {}, vivo = {};
  for (const id of ids) {
    H[id] = histDe(id);
    if (!H[id] || !H[id].length) return null;
    const fila = M && M.filas.find((f) => f.inst.id === id);
    if (fila && fila.precio) vivo[id] = fila.precio;
  }
  const hoy = hoyIso(), ini = fl[0].d;
  const fechas = [...new Set([...ids.flatMap((id) => H[id].map(([d]) => d)), ...fl.map((x) => x.d), hoy])].filter((d) => d >= ini && d <= hoy).sort();
  const pt = {}, ult = {}, uds = {};
  for (const id of ids) { pt[id] = 0; ult[id] = null; uds[id] = 0; }
  let k = 0, vAnt = null, acum = 1;
  const serie = [];
  for (const d of fechas) {
    for (const id of ids) { const h = H[id]; while (pt[id] < h.length && h[pt[id]][0] <= d) { ult[id] = h[pt[id]][1]; pt[id]++; } }
    if (d === hoy) for (const id of ids) if (vivo[id]) ult[id] = vivo[id];
    let entra = 0;
    while (k < fl.length && fl[k].d <= d) {
      const x = fl[k]; k++;
      uds[x.id] += x.u;
      const p = ult[x.id] || (x.u ? Math.abs(x.imp / x.u) : 0);
      entra += x.mezcla && x.imp < 0 && x.u > 0 ? x.u * p : -x.imp;
    }
    let v = 0;
    for (const id of ids) if (Math.abs(uds[id]) > 1e-9) v += uds[id] * (ult[id] || 0);
    if (vAnt > 0) acum *= (v - entra) / vAnt;
    vAnt = v;
    serie.push({ d, v, idx: acum });
  }
  const dias = diasEntre(ini, hoy);
  const total = (acum - 1) * 100;
  return { total, anual: dias >= 365 ? (Math.pow(acum, 365 / dias) - 1) * 100 : null, dias, serie };
}
/* lo mismo que has hecho tú, pero en un índice: cada euro que metiste, el mismo día, en ese índice; cada venta, lo
   mismo sacado de ahí. Cuánto tendrías hoy, su TIR y lo que ha hecho el índice en ese tiempo */
function benchMismoDinero(F, id) {
  const h = histBench(id);
  if (!h || !F.flujos.length || h[0][0] > F.desde) return { id, sinDatos: true, desdeDatos: h ? h[0][0] : null };
  let u = 0;
  for (const x of F.flujos) { const p = precioEn(h, x.d, 'antes'); if (!p) return { id, sinDatos: true }; u += -x.imp / p; }
  const pHoy = precioBenchHoy(id), p0 = precioEn(h, F.desde, 'antes');
  const valor = u * pHoy;
  const dias = diasEntre(F.desde, hoyIso());
  const tir = xirr([...F.flujos.map((x) => ({ d: x.d, v: x.imp })), { d: hoyIso(), v: valor }]);
  return { id, valor, tir, total: (pHoy / p0 - 1) * 100, anual: dias >= 365 ? (Math.pow(pHoy / p0, 365 / dias) - 1) * 100 : null };
}
let rentCache = { k: '', r: null };
function rentabilidadCartera(M) {
  const F = flujosCartera(M);
  const k = JSON.stringify([F.flujos.length, F.desde, Math.round(F.valor), F.sinFecha, S.hist && S.hist.generado, hoyIso()]);
  if (rentCache.k === k) return rentCache.r;
  const dias = F.desde ? diasEntre(F.desde, hoyIso()) : 0;
  const metido = -sum(F.flujos.filter((x) => x.imp < 0), (x) => x.imp), sacado = sum(F.flujos.filter((x) => x.imp > 0), (x) => x.imp);
  const r = { ...F, dias, metido, sacado, ganado: F.valor + sacado - metido };
  if (F.flujos.length && !F.sinFecha.length) {
    r.tir = xirr([...F.flujos.map((x) => ({ d: x.d, v: x.imp })), { d: hoyIso(), v: F.valor }]);
    try { r.twr = twrCartera(F, M); } catch (e) { console.warn(e); r.twr = null; }
  }
  // con menos de mes y medio, pasarlo a «al año» engaña (un 2 % en dos semanas sería un 60 % al año)
  r.corto = dias < 45;
  rentCache = { k, r };
  return r;
}
function caidaMaxima(serie) {
  let max = -Infinity, peor = 0;
  for (const x of serie) { max = Math.max(max, x.v); peor = Math.min(peor, x.v / max - 1); }
  return peor * 100;
}

