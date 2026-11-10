/* =========================== 0.8.6 · Tu año en Toisón: las siete tarjetas (sesión 8 del plan) ===========================
   Según la maqueta aprobada por Carlos el 10 nov (claude/sesion-maqueta-tu-ano.md del Proyecto). El periodo lo da
   periodoTuAno (43b-navegacion.js): de enero al mes de hoy, como mucho hasta noviembre.

   Los cálculos son funciones puras (ta…), que no miran S: reciben lo que necesitan. tuAnoCartera(M) las llama con lo
   de la cartera (los flujos de Rentabilidad, los lotes, el reparto de países y sectores, los TER y los dividendos).
   - Aportaciones y «Meses sin sacar dinero»: con los flujos de flujosCartera (cada lote, cada aportación, cada venta).
     Una venta y una compra a menos de 7 días se cuentan como un traspaso o un cambio de una posición a otra: ese
     dinero no sale ni entra. Después, mes a mes: si entra más de lo que sale, ese mes aportaste lo que queda; si sale
     más, ese mes salió dinero de tu cartera y el contador vuelve a cero. Las compras supuestas (lo que ya tenías al
     apuntarlo, repartido en el tiempo) no cuentan como aportación.
   - Estilo: cuatro rasgos de 0 a 1 con lo que hiciste, nunca con lo que ganaste, y ninguno sube por operar más. Gana
     el más alto; si empatan, en este orden: Constante, Paciente, Diversificador, Explorador.
   - Edad: por posición, la media de lo que lleva cada participación que tienes (los lotes de hoy); la media de la
     cartera, pesada por lo que vale hoy cada posición.
   - Países y sectores: los de Reparto y X-Ray (exposicionPaises y reparto), mirando dentro de los fondos.
   - Costes: el TER de cada fondo sobre lo que vale hoy, al año, y las comisiones que apuntaste en el periodo.
   - Dividendos: solo lo que pagaron tus acciones y ETF de reparto (con las acciones que tenías ese día) y su retención
     en origen. Lo de dentro de los fondos de acumulación no sale: está en Rendimiento › Dividendos.
   Si falta un dato, la tarjeta lo dice; nada inventado. Sin «compra» ni «vende» en los textos, sin órdenes. */

const TA_ORDEN = ['estilo', 'aport', 'edad', 'paises', 'costes', 'divid', 'meses'];
const TA_TRASPASO = 7, TA_MIN = 0.5, TA_MES = 30.4375;
const taK = (d) => String(d).slice(0, 7);
const taMesesEntre = (a, b) => { const [y1, m1] = a.split('-').map(Number), [y2, m2] = b.split('-').map(Number); return (y2 - y1) * 12 + (m2 - m1); };
const taSumarMes = (k, n) => { const [y, m] = k.split('-').map(Number), d = new Date(y, m - 1 + n, 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; };
const taFinDeMes = (d) => { const x = deIso(d); return new Date(x.getFullYear(), x.getMonth() + 1, 0).getDate() === x.getDate(); };

/* ---------- 1. los flujos, emparejados y mes a mes ---------- */
// cada venta se empareja con las compras más cercanas a 7 días o menos (antes o después): ese dinero se queda dentro.
// Devuelve los flujos con «resto», lo que queda de cada uno sin emparejar.
function taEmparejar(flujos, dias = TA_TRASPASO) {
  const xs = (flujos || []).filter((f) => f && f.d && isFinite(f.imp) && Math.abs(f.imp) > 1e-9).map((f) => ({ ...f, resto: Math.abs(f.imp), cambio: 0 }));
  const ent = xs.filter((x) => x.imp < 0 && !x.mezcla);
  for (const s of xs.filter((x) => x.imp > 0).sort((a, b) => (a.d < b.d ? -1 : a.d > b.d ? 1 : 0))) {
    const cerca = ent.filter((e) => e.resto > 1e-9 && Math.abs(diasEntre(s.d, e.d)) <= dias).sort((a, b) => Math.abs(diasEntre(s.d, a.d)) - Math.abs(diasEntre(s.d, b.d)));
    for (const e of cerca) { const k = Math.min(e.resto, s.resto); e.resto -= k; s.resto -= k; e.cambio += k; s.cambio += k; if (s.resto <= 1e-9) break; }
  }
  return xs;
}
// mes a mes: lo que entra (y lo que entra de verdad, sin las compras supuestas), lo que sale y las ventas
function taPorMes(xs) {
  const m = new Map();
  for (const x of xs) {
    const k = taK(x.d), o = m.get(k) || { entra: 0, real: 0, sale: 0, ventas: 0, cambio: 0 };
    if (x.imp < 0) { o.entra += x.resto; if (!x.mezcla) o.real += x.resto; } else { o.sale += x.resto; o.ventas++; o.cambio += x.cambio; }
    m.set(k, o);
  }
  for (const o of m.values()) { o.neto = o.entra - o.sale; o.aporta = Math.max(0, Math.min(o.real, o.neto)); o.saca = o.sale - o.entra > TA_MIN; }
  return m;
}

/* ---------- 2. lo que aportaste: las 12 casillas del año ---------- */
function taAportaciones(xs, P) {
  const porMes = taPorMes(xs.filter((x) => x.d <= P.hasta));
  const inicio = xs.length ? taK(xs.reduce((a, x) => (x.d < a ? x.d : a), xs[0].d)) : null;
  const meses = [];
  for (let i = 1; i <= 12; i++) {
    const k = `${P.anio}-${String(i).padStart(2, '0')}`, o = porMes.get(k), ap = o ? o.aporta : 0;
    let st;
    if (i > P.mesFin) st = 'pendiente';
    else if (!inicio || k < inicio) st = 'antes';
    else if (ap >= TA_MIN) st = 'si';
    else if (!P.cerrado && i === P.mesFin) st = 'pendiente';
    else st = 'no';
    meses.push({ k, i, st, imp: st === 'si' ? ap : 0 });
  }
  const si = meses.filter((m) => m.st === 'si'), den = meses.filter((m) => m.st === 'si' || m.st === 'no').length;
  const total = sum(si, (m) => m.imp);
  const iguales = si.length > 1 && si.every((m) => Math.abs(m.imp - si[0].imp) < 1);
  // desde el principio: lo que metiste menos lo que sacaste (todo, también las compras supuestas)
  const hasta = xs.filter((x) => x.d <= P.hasta), metido = -sum(hasta, (x) => x.imp), sacado = sum(hasta.filter((x) => x.imp > 0), (x) => x.imp);
  const supuestas = xs.some((x) => x.mezcla && x.d >= P.desde && x.d <= P.hasta);
  return { meses, si: si.length, den, total, cada: iguales ? si[0].imp : null, media: si.length ? total / si.length : 0, inicio, metido, sacado, supuestas };
}

/* ---------- 7. meses sin sacar dinero ---------- */
// el contador: desde el mes siguiente al último en que salió dinero (o desde el primero), en meses ya pasados
function taSinSacar(xs, P) {
  const porMes = taPorMes(xs.filter((x) => x.d <= P.hasta));
  if (!porMes.size) return null;
  const ks = [...porMes.keys()].sort(), inicio = ks[0], kH = taK(P.hasta);
  let ultimo = null; for (const k of ks) if (porMes.get(k).saca) ultimo = k;
  const desde = ultimo ? taSumarMes(ultimo, 1) : inicio;
  const n = Math.max(0, taMesesEntre(desde, kH) + (taFinDeMes(P.hasta) ? 1 : 0));
  const delAno = ks.filter((k) => k >= taK(P.desde)), roturas = delAno.filter((k) => porMes.get(k).saca);
  const cambios = delAno.filter((k) => porMes.get(k).cambio > TA_MIN).length;
  return { n, desde, inicio, ultimo, roturasAno: roturas, cambiosAno: cambios, saca: (k) => !!(porMes.get(k) && porMes.get(k).saca) };
}
// el mes más movido: el que más llegó a bajar tu cartera desde su máximo del año (con la TWR, que no se mueve por
// lo que metes o sacas)
function taMovido(serie, P) {
  const s = (serie || []).filter((x) => x.d >= P.desde && x.d <= P.hasta && x.idx > 0);
  if (s.length < 10) return null;
  let max = s[0].idx, peor = null;
  for (const x of s) {
    if (x.idx > max) max = x.idx;
    const dd = (x.idx / max - 1) * 100;
    if (!peor || dd < peor.dd) peor = { dd, d: x.d, k: taK(x.d) };
  }
  return { ...peor, valores: s.map((x) => ({ d: x.d, v: x.v })) };
}

/* ---------- 3. la edad de tu dinero ---------- */
function taEdad(posiciones, hoy) {
  const filas = [], sinFecha = [];
  for (const p of posiciones || []) {
    const ls = (p.lotes || []).filter((l) => l.u > 0 && l.f);
    const uds = sum(ls, (l) => l.u);
    if (!(uds > 0) || !(p.valor > 0)) { if (p.valor > 0) sinFecha.push(p.n); continue; }
    const meses = sum(ls, (l) => l.u * Math.max(0, diasEntre(l.f, hoy)) / TA_MES) / uds;
    filas.push({ n: p.n, valor: p.valor, meses, aprox: ls.some((l) => l.mezcla) });
  }
  filas.sort((a, b) => b.valor - a.valor);
  const base = sum(filas, (f) => f.valor);
  return { filas, media: base ? sum(filas, (f) => f.valor * f.meses) / base : null, sinFecha, base };
}
const taDurPartes = (m) => { const r = Math.round(m), a = Math.floor(r / 12); return [a, r % 12]; };
function taDur(m) {
  const [a, mm] = taDurPartes(m);
  if (!a && !mm) return L('menos de un mes', 'under a month');
  const ta = a ? L(`${a} ${a === 1 ? 'año' : 'años'}`, `${a} ${a === 1 ? 'year' : 'years'}`) : '', tm = mm ? L(`${mm} ${mm === 1 ? 'mes' : 'meses'}`, `${mm} ${mm === 1 ? 'month' : 'months'}`) : '';
  return ta && tm ? `${ta} ${L('y', 'and')} ${tm}` : ta || tm;
}
const taDurC = (m) => { const [a, mm] = taDurPartes(m); return a ? (mm ? `${a} a ${mm} m` : `${a} a`) : `${mm} m`; };

/* ---------- 1. el estilo de inversor ---------- */
// apo: taAportaciones; ventasMeses: meses del año con alguna venta; pesos: lo que vale cada instrumento; tipos; nuevas
function taEstilo({ apo, ventasMeses = 0, pesos = [], tipos = 0, nuevas = 0 }) {
  if (!apo || !apo.den) return null;
  const tot = sum(pesos), neff = tot ? 1 / sum(pesos, (v) => (v / tot) ** 2) : 0;
  const r = {
    constante: apo.si / apo.den,
    paciente: Math.max(0, 1 - ventasMeses / apo.den),
    diversificador: 0.5 * Math.min(1, Math.max(0, (neff - 1) / 4)) + 0.5 * Math.min(1, Math.max(0, (tipos - 1) / 3)),
    explorador: Math.min(1, nuevas / 3),
  };
  const orden = ['constante', 'paciente', 'diversificador', 'explorador'];
  const k = orden.reduce((a, x) => (r[x] > r[a] + 1e-9 ? x : a), orden[0]);
  return { k, rasgos: r, neff };
}
const TA_ESTILOS = {
  constante: ['Constante', 'Steady'], paciente: ['Paciente', 'Patient'], diversificador: ['Diversificador', 'Diversifier'], explorador: ['Explorador', 'Explorer'],
};

/* ---------- 4. países y sectores: los primeros y el resto ---------- */
function taTop(filas, n, resto, fuera = []) {
  const xs = (filas || []).filter((x) => x.pct > 0.05 && !fuera.includes(x.k)).sort((a, b) => b.pct - a.pct);
  const top = xs.slice(0, n), r = sum(xs.slice(n), (x) => x.pct);
  return r > 0.05 ? [...top, { k: resto, pct: r, resto: true }] : top;
}

/* ---------- 5. lo que te costó ---------- */
// fondos [{n, ter, valor}]; comis lo apuntado en el periodo; total lo que tienes; meses del periodo
function taCostes({ fondos = [], comis = 0, total = 0, meses = 12 }) {
  const fs = fondos.filter((f) => f.ter != null && f.valor > 0).map((f) => ({ ...f, anual: (f.valor * f.ter) / 100 })).sort((a, b) => b.anual - a.anual);
  const anual = sum(fs, (f) => f.anual);
  return { fondos: fs, anual, centimos: total > 0 ? (anual / total) * 10000 : null, gestion: (anual * meses) / 12, comis, periodo: (anual * meses) / 12 + comis };
}

/* ---------- 6. dividendos cobrados ---------- */
// pagos [{n, d, bruto, ret (en %)}]
function taDividendos(pagos, P) {
  const ps = (pagos || []).filter((x) => x.d >= P.desde && x.d <= P.hasta && x.bruto > 0).sort((a, b) => (a.d < b.d ? -1 : 1));
  const meses = Array.from({ length: 12 }, (_, i) => ({ i: i + 1, bruto: 0, neto: 0 }));
  for (const x of ps) { const m = meses[+x.d.slice(5, 7) - 1]; x.retImp = (x.bruto * (x.ret || 0)) / 100; m.bruto += x.bruto; m.neto += x.bruto - x.retImp; }
  const bruto = sum(ps, (x) => x.bruto), ret = sum(ps, (x) => x.retImp);
  const tipos = [...new Set(ps.map((x) => x.ret))];
  return { pagos: ps, meses, bruto, ret, neto: bruto - ret, de: [...new Set(ps.map((x) => x.n))], tipoUnico: tipos.length === 1 ? tipos[0] : null };
}

/* ---------- todo junto ---------- */
function tuAnoCalc({ hoy, flujos = [], serie = null, posiciones = [], paises = [], sinPais = null, sectores = [], fondos = [], comis = 0, pagos = [], total = 0 }) {
  const P = periodoTuAno(hoy);
  const xs = taEmparejar(flujos);
  const apo = taAportaciones(xs, P);
  const delAno = xs.filter((x) => x.d >= P.desde && x.d <= P.hasta);
  const ventas = delAno.filter((x) => x.imp > 0);
  const ventasMeses = new Set(ventas.map((x) => taK(x.d))).size;
  // posiciones nuevas: lo que no tenías antes de enero (su primer flujo es de este año)
  const primero = new Map(); for (const x of xs) if (!primero.has(x.id) || x.d < primero.get(x.id)) primero.set(x.id, x.d);
  const nuevas = [...primero.values()].filter((d) => d >= P.desde && d <= P.hasta).length;
  const tipos = new Set(posiciones.filter((p) => p.valor > 0).map((p) => p.tipo || p.clase || '?')).size;
  const pesos = posiciones.filter((p) => p.valor > 0).map((p) => p.valor);
  const estilo = taEstilo({ apo, ventasMeses, pesos, tipos, nuevas });
  return {
    P, apo, estilo, ventas: ventas.length, ventasMeses, nuevas, tipos, nPos: pesos.length,
    edad: taEdad(posiciones, hoy),
    paises: taTop(paises, 6, L('Resto del mundo', 'Rest of the world')), sinPais,
    sectores: taTop(sectores, 6, L('Resto', 'Other'), ['Sin datos']), sinSector: (sectores.find((x) => x.k === 'Sin datos') || {}).pct || 0,
    costes: taCostes({ fondos, comis, total, meses: P.cerrado ? 11 : Math.max(1, P.mesFin - 1 + diasEntre(`${taK(P.hasta)}-01`, P.hasta) / TA_MES) }),
    divid: taDividendos(pagos, P),
    sinSacar: taSinSacar(xs, P),
    movido: taMovido(serie, P),
  };
}

/* ---------- con la cartera ---------- */
const taNomPais = (c) => (PAISES[c]) || (() => { try { return new Intl.DisplayNames([IDIOMA === 'en' ? 'en' : 'es'], { type: 'region' }).of(c); } catch (e) { return c; } })();
function taRetencion(inst) {
  const fis = fiscalidadSede(inst.pais, inst.tipo);
  return fis.ret == null ? 0 : fis.ret;
}
function tuAnoCartera(M) {
  const hoy = hoyIso(), P = periodoTuAno(hoy);
  let F = { flujos: [], sinFecha: [] }, serie = null;
  try { F = flujosCartera(M); } catch (e) { console.warn(e); }
  try { const R = rentabilidadCartera(M); serie = R.twr && R.twr.serie; } catch (e) { console.warn(e); }
  // las posiciones, juntas por instrumento (lo mismo en dos brókeres cuenta una vez)
  const pos = new Map();
  for (const f of M.filas) {
    if (!(f.valor > 0)) continue;
    let lotes = []; try { lotes = lotesDe(f.pos).map((l) => (l.mezcla ? { ...l, f: f.pos.desde || l.f } : l)); } catch (e) {}
    const x = pos.get(f.inst.id) || { id: f.inst.id, n: f.inst.corto || f.inst.nombre, valor: 0, tipo: f.inst.tipo, clase: f.inst.clase, lotes: [] };
    x.valor += f.valor; x.lotes.push(...lotes); pos.set(f.inst.id, x);
  }
  const ex = exposicionPaises(M), paises = [...ex.entries()].map(([c, e]) => ({ k: taNomPais(c), pct: e.pct }));
  const enPais = sum(paises, (x) => x.pct), sinPaisNom = M.filas.filter((f) => f.valor > 0 && f.inst.clase !== 'Renta variable').map((f) => f.inst.corto || f.inst.nombre);
  const sinPais = M.total > 0 && 100 - enPais > 0.05 ? { pct: 100 - enPais, de: [...new Set(sinPaisNom)], efectivo: M.liquidez > 0 } : null;
  let sectores = []; try { sectores = reparto(M, 'sector').filas.map((x) => ({ k: x.k, pct: x.pct })); } catch (e) {}
  const fondos = M.filas.filter((f) => f.inst.ter != null && f.valor > 0).map((f) => ({ n: f.inst.corto || f.inst.nombre, ter: +f.inst.ter, valor: f.valor }));
  const comis = sum((S.cartera.movimientos || []).filter((m) => m.fecha >= P.desde && m.fecha <= P.hasta), (m) => +m.gastos || +m.comision || 0);
  // los dividendos que pagaron tus acciones con fecha entre enero y el final del periodo, por las que tenías ese día
  const pagos = [];
  for (const f of M.filas) {
    const p = f.p || {};
    if (!Array.isArray(p.dividendos_pagos)) continue;
    let lotes; try { lotes = lotesDe(f.pos); } catch (e) { continue; }
    const aEur = p.precio > 0 && p.precio_local > 0 ? p.precio / p.precio_local : 1, ret = taRetencion(f.inst);
    for (const [d, v] of p.dividendos_pagos) {
      if (d < P.desde || d > P.hasta || !(v > 0)) continue;
      const uds = sum(lotes.filter((l) => (l.mezcla ? !f.pos.desde || f.pos.desde < d : l.f < d)), (l) => l.u);
      if (uds > 0) pagos.push({ n: f.inst.corto || f.inst.nombre, d, bruto: uds * v * aEur, ret, pais: f.inst.pais });
    }
  }
  const T = tuAnoCalc({ hoy, flujos: F.flujos, serie, posiciones: [...pos.values()], paises, sinPais, sectores, fondos, comis, pagos, total: M.total });
  T.sinFecha = F.sinFecha || []; T.aprox = !!F.aprox;
  return T;
}

/* ---------- las tarjetas ---------- */
const TA_OK = '<svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true"><path d="M3.5 8.4l2.9 2.8 6-6.4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const TA_COL = ['var(--reparto-1)', 'var(--reparto-2)', 'var(--reparto-3)', 'var(--reparto-4)', 'var(--reparto-5)', 'var(--reparto-6)', 'var(--tenue)'];
const taMesC = (i) => (IDIOMA === 'en' ? MESES_EN[i - 1].slice(0, 3) : MESES[i - 1]);
const taMesL = (i) => (IDIOMA === 'en' ? MESES_EN[i - 1] : MESES_LARGOS[i - 1]);
const taMesAno = (k) => { const [y, m] = k.split('-').map(Number); return L(`${taMesL(m)} de ${y}`, `${taMesL(m)} ${y}`); };
const taNota = (t) => `<p class="ta-nota">${t}</p>`;
const taGrande = (n, s = '') => `<div class="ta-grande"><b>${n}</b>${s ? `<span>${s}</span>` : ''}</div>`;
const taKpis = (xs) => `<div class="pav-kpis ta-kpis" style="--cols:${xs.length}">${xs.map(([k, v, s = '']) => `<div class="pav-kpi"><small>${k}</small><b>${v}</b>${s ? `<span>${s}</span>` : ''}</div>`).join('')}</div>`;
const taBarras = (filas, max, txt) => `<div class="ta-barras">${filas.map((x, i) => `<div class="ta-bf"><span title="${esc(x.k)}">${esc(x.k)}</span><span class="ta-pista"><i style="width:${Math.max(1, Math.min(100, (x.pct / (max || 1)) * 100)).toFixed(1)}%;background:${x.resto ? 'var(--tenue)' : TA_COL[Math.min(i, 5)]}"></i></span><b>${txt(x)}</b></div>`).join('')}</div>`;
const taPc = (v) => pct(v, v >= 10 ? 0 : 1);

function taCardEstilo(T) {
  const E = T.estilo, a = T.apo;
  if (!E) return taNota(L('Tu estilo sale en cuanto lleves un mes entero con tu cartera en Toisón.', 'Your style shows up once you have had your portfolio in Toisón for a whole month.'));
  const nom = L(...TA_ESTILOS[E.k]), todos = a.si === a.den;
  const vent = T.ventas ? L(`${T.ventas} ${T.ventas === 1 ? 'venta' : 'ventas'}`, `${T.ventas} ${T.ventas === 1 ? 'sale' : 'sales'}`) : L('Ninguna', 'None');
  const frase = {
    constante: todos ? (T.ventas ? L('Aportaste todos los meses.', 'You put money in every month.') : L('Aportaste todos los meses y no vendiste nada.', 'You put money in every month and sold nothing.')) : L(`Aportaste ${a.si} de ${a.den} meses.`, `You put money in ${a.si} of ${a.den} months.`),
    paciente: T.ventas ? L(`Vendiste en ${T.ventasMeses} de ${a.den} meses y dejaste quieto lo demás.`, `You sold in ${T.ventasMeses} of ${a.den} months and left the rest alone.`) : L('No vendiste nada en todo el año.', 'You sold nothing all year.'),
    diversificador: L(`Tu dinero está repartido en ${T.nPos} posiciones de ${T.tipos} tipos.`, `Your money is spread over ${T.nPos} holdings of ${T.tipos} kinds.`),
    explorador: L(`Este año sumaste ${T.nuevas} ${T.nuevas === 1 ? 'posición nueva' : 'posiciones nuevas'} a tu cartera.`, `This year you added ${T.nuevas} new ${T.nuevas === 1 ? 'holding' : 'holdings'} to your portfolio.`),
  }[E.k];
  return `<div class="ta-portada"><div><small class="ta-eyebrow">${L(`Tu año ${T.P.anio}, en una palabra`, `Your ${T.P.anio}, in one word`)}</small><h3 class="ta-nombre">${nom}</h3>
    <p class="ta-frase">${frase} ${L('Es lo que más pesa en tu estilo.', 'It is what weighs most in your style.')}</p></div>
    ${taKpis([[L('Meses aportando', 'Months putting money in'), L(`${a.si} de ${a.den}`, `${a.si} of ${a.den}`)], [L('Ventas', 'Sales'), vent], [L('Posiciones', 'Holdings'), String(T.nPos), L(`de ${T.tipos} ${T.tipos === 1 ? 'tipo' : 'tipos'}`, `of ${T.tipos} ${T.tipos === 1 ? 'kind' : 'kinds'}`)]])}</div>
    ${taNota(L('Sale de lo que hiciste, no de lo que ganaste. Hay cuatro estilos (Constante, Paciente, Diversificador y Explorador) y ninguno es mejor que otro.', 'It comes from what you did, not what you made. There are four styles (Steady, Patient, Diversifier and Explorer) and none is better than another.'))}`;
}
function taCardAport(T) {
  const a = T.apo;
  const cada = a.cada != null ? L(`${eur(a.cada, 0)} cada mes`, `${eur(a.cada, 0)} each month`) : a.si ? L(`de media, ${eur(a.media, 0)} al mes`, `on average ${eur(a.media, 0)} a month`) : '';
  const cab = a.den ? taGrande(L(`${a.si} de ${a.den} ${a.den === 1 ? 'mes' : 'meses'}`, `${a.si} of ${a.den} ${a.den === 1 ? 'month' : 'months'}`), a.si ? L(`${eur(a.total, 0)} este año · ${cada}`, `${eur(a.total, 0)} this year · ${cada}`) : L('Este año no entró dinero nuevo en tu cartera.', 'No new money went into your portfolio this year.'))
    : taGrande(L('Aún sin meses enteros', 'No whole months yet'), L('El mes en curso cuenta cuando termine.', 'This month counts once it ends.'));
  const cal = `<div class="ta-cal">${a.meses.map((m) => `<div class="ta-mes ta-${m.st}"><small>${taMesC(m.i)}</small>${m.st === 'si' ? `<b>${TA_OK}</b><span>${eur(m.imp, 0)}</span>` : `<b>·</b><span>${m.st === 'pendiente' ? L('pendiente', 'pending') : m.st === 'antes' ? '—' : eur(0, 0)}</span>`}</div>`).join('')}</div>`;
  const desde = a.inicio && a.metido > 0 ? L(`Desde que empezaste, en ${taMesAno(a.inicio)}, llevas ${eur(a.metido, 0)} metidos${a.sacado > TA_MIN ? ', con lo que sacaste ya restado' : ''}.`, `Since you started, in ${taMesAno(a.inicio)}, you have put in ${eur(a.metido, 0)}${a.sacado > TA_MIN ? ', net of what you took out' : ''}.`) : '';
  const sup = a.supuestas ? ' ' + L('Lo que ya tenías al apuntarlo en Toisón no cuenta como aportación.', 'What you already had when you added it to Toisón does not count as a contribution.') : '';
  return cab + cal + ((desde || sup) ? taNota(desde + sup) : '');
}
function taCardEdad(T) {
  const E = T.edad;
  if (E.media == null) return taNota(L('Para saberlo hace falta la fecha de lo que tienes: ponla en cada posición (Editar › Desde cuándo la tienes).', 'This needs the dates of what you hold: add them to each holding.'));
  const max = Math.max(12, Math.ceil(Math.max(...E.filas.map((f) => f.meses)) / 6) * 6), g = E.filas[0], pg = (g.valor / E.base) * 100;
  return `${taGrande(taDur(E.media), L('de media, por cada euro', 'on average, for each euro'))}
    <div class="ta-barras ta-edades">${E.filas.map((f, i) => `<div class="ta-bf"><span title="${esc(f.n)}">${esc(f.n)}</span><span class="ta-pista"><i style="width:${Math.max(1, (f.meses / max) * 100).toFixed(1)}%;background:${TA_COL[Math.min(i, 5)]}"></i><u style="left:${((E.media / max) * 100).toFixed(1)}%"></u></span><b>${taDurC(f.meses)}</b></div>`).join('')}</div>
    ${taNota(L(`La raya es tu media. Cuenta más lo que más pesa: ${esc(g.n)} es ${pg >= 45 && pg < 50 ? 'casi la mitad' : `el ${fmtNum(pg, 0)}\u00a0%`} de tu cartera.`, `The line is your average. What weighs more counts more: ${esc(g.n)} is ${fmtNum(pg, 0)} % of your portfolio.`) + (E.sinFecha.length ? ' ' + L(`Sin fecha, no cuenta: ${esc(yLista(E.sinFecha))}.`, `Without a date, not counted: ${esc(yLista(E.sinFecha))}.`) : ''))}`;
}
function taCardPaises(T) {
  const ps = [...T.paises];
  let sinNom = '';
  if (T.sinPais) {
    ps.push({ k: L('Sin país', 'No country'), pct: T.sinPais.pct, resto: true });
    const de = [...T.sinPais.de, ...(T.sinPais.efectivo ? [L('el efectivo', 'cash')] : [])];
    sinNom = de.length ? ' ' + L(`Sin país: ${esc(yLista(de))}.`, `No country: ${esc(yLista(de))}.`) : '';
  }
  const ss = [...T.sectores]; if (T.sinSector > 0.5) ss.push({ k: L('Sin datos', 'No data'), pct: T.sinSector, resto: true });
  if (!ps.length && !ss.length) return taNota(L('Todavía no hay datos de países ni de sectores de lo que tienes.', 'There is no country or sector data yet for what you hold.'));
  const max = Math.max(...ps.map((x) => x.pct), ...ss.map((x) => x.pct), 10);
  return `<div class="ta-dos"><div><h4 class="ta-sub">${L('Por países', 'By country')}</h4>${taBarras(ps, max, (x) => taPc(x.pct))}</div><div><h4 class="ta-sub">${L('Por sectores', 'By sector')}</h4>${taBarras(ss, max, (x) => taPc(x.pct))}</div></div>
    ${taNota(L('Mirando dentro de tus fondos: tu cartera entera, no solo lo que elegiste tú.', 'Looking inside your funds: your whole portfolio, not just what you picked.') + sinNom)}`;
}
function taCardCostes(T) {
  const C = T.costes, periodo = L(`de enero a ${taMesL(T.P.mesFin)}`, `January to ${taMesL(T.P.mesFin)}`);
  if (!C.fondos.length && !(C.comis > 0)) return taNota(L('No tienes fondos con comisión conocida ni has apuntado comisiones en tus movimientos este año.', 'You have no funds with a known fee and no recorded fees this year.'));
  const cts = C.centimos;
  const cab = cts != null && C.fondos.length ? taGrande(cts >= 100 ? L(`${fmtNum(cts / 100, 2)} €`, `€${fmtNum(cts / 100, 2)}`) : L(`${fmtNum(cts, cts < 10 ? 1 : 0)} céntimos`, `${fmtNum(cts, cts < 10 ? 1 : 0)} cents`), L('de cada 100 € que tienes, en un año, por la gestión de tus fondos', 'of every €100 you have, per year, for managing your funds')) : taGrande(eur(C.comis, 0), L(`en comisiones, ${periodo}`, `in fees, ${periodo}`));
  const tops = C.fondos.slice(0, 3), resto = sum(C.fondos.slice(3), (f) => f.anual);
  const partes = [...tops.map((f, i) => [f.n, C.anual ? (f.anual / C.anual) * 100 : 0, TA_COL[i], f.ter]), ...(resto > 0 ? [[L('Otros fondos', 'Other funds'), (resto / C.anual) * 100, 'var(--tenue)', null]] : [])];
  const apil = C.anual > 0 ? `<div class="ta-apil">${partes.map(([n, v, c]) => `<i style="width:${v.toFixed(1)}%;background:${c}" title="${esc(n)}"></i>`).join('')}</div><div class="ta-apil-ley">${partes.map(([n, v, c, t]) => `<span><i style="background:${c}"></i>${esc(n)}${t != null ? ` <small>${pct(t, 2)}</small>` : ''}<b>${fmtNum(v, 0)} %</b></span>`).join('')}</div>` : '';
  const txt = L(`En total, unos ${eur(C.periodo, 0)} ${periodo}${C.comis > TA_MIN && C.gestion > TA_MIN ? `: ${eur(C.gestion, 0)} de gestión y ${eur(C.comis, 0)} de comisiones de tus movimientos` : ''}.`, `In all, about ${eur(C.periodo, 0)} ${periodo}.`)
    + (C.comis > TA_MIN ? '' : ' ' + L('Este año no apuntaste comisiones en tus movimientos.', 'This year you recorded no fees on your transactions.'));
  return `${cab}${apil}<p class="ta-texto">${txt}</p>${taNota(L('La gestión de los fondos no llega como un cargo: se descuenta del precio, día a día. Se calcula con lo que vale hoy cada fondo.', 'Fund management is not charged separately: it comes off the price, day by day. Worked out on what each fund is worth today.'))}`;
}
function taCardDivid(T) {
  const D = T.divid, p = enBas(PAG.div) ? 'rentab' : 'div', ir = `<a href="#av-${p}" data-pest-av="${p}">${L('Rendimiento › Dividendos', 'Performance › Dividends')}</a>`;
  const nota = taNota(L(`Solo lo que llegó a tu cuenta. Lo que reparten las empresas de tus fondos de acumulación se queda dentro: lo tienes en ${ir}.`, `Only what reached your account. What the companies in your accumulating funds pay stays inside: see ${ir}.`));
  if (!D.pagos.length) return taGrande(L('0 € cobrados', '€0 collected'), L('Este año ninguna de tus posiciones ha pagado dividendos.', 'None of your holdings paid a dividend this year.')) + nota;
  const de = D.de.length === 1 ? esc(D.de[0]) : L(`${D.de.length} empresas`, `${D.de.length} companies`);
  const sub = D.ret > TA_MIN ? L(`${eur(D.bruto, 0)} de ${de}, menos ${eur(D.ret, 0)} de retención${D.tipoUnico ? ` (${fmtNumR(D.tipoUnico)} %)` : ''}`, `${eur(D.bruto, 0)} from ${de}, less ${eur(D.ret, 0)} withheld`) : L(`${eur(D.bruto, 0)} de ${de}, sin retención en origen`, `${eur(D.bruto, 0)} from ${de}, no withholding at source`);
  const max = Math.max(...D.meses.map((m) => m.bruto), 1);
  const barras = `<div class="ta-meses" role="img" aria-label="${esc(L('Dividendos de cada mes', 'Dividends each month'))}">${D.meses.map((m) => `<div><span class="ta-mb"><i style="height:${((m.bruto / max) * 100).toFixed(1)}%"></i></span><small>${taMesC(m.i)}</small></div>`).join('')}</div>`;
  const hitos = D.pagos.length <= 6 ? `<div class="ta-hitos">${D.pagos.map((x) => `<span><b>${taMesC(+x.d.slice(5, 7))}${D.de.length > 1 ? ` · ${esc(x.n)}` : ''}</b>${eur(x.bruto, 0)}</span>`).join('')}</div>` : '';
  return taGrande(L(`${eur(D.neto, 0)} cobrados`, `${eur(D.neto, 0)} collected`), sub) + barras + hitos + nota;
}
function taCardMeses(T) {
  const Z = T.sinSacar, Mv = T.movido;
  if (!Z) return taNota(L('Para contarlo hacen falta las fechas de lo que tienes y de tus movimientos.', 'This needs the dates of your holdings and transactions.'));
  const cab = Z.n < 1 && !Z.ultimo ? taGrande(L('Desde este mes', 'Since this month'), L(`Empezaste en ${taMesAno(Z.inicio)}: el contador suma cuando termine el mes.`, `You started in ${taMesAno(Z.inicio)}: the count adds up when the month ends.`)) : Z.n >= 1 ? taGrande(L(`${Z.n} ${Z.n === 1 ? 'mes' : 'meses'}`, `${Z.n} ${Z.n === 1 ? 'month' : 'months'}`), L(`sin sacar dinero de tu cartera, desde ${taMesAno(Z.desde)}`, `without taking money out of your portfolio, since ${taMesAno(Z.desde)}`))
    : taGrande(L('0 meses', '0 months'), L(`En ${taMesL(+Z.ultimo.slice(5, 7))} salió dinero de tu cartera: el contador vuelve a empezar.`, `Money left your portfolio in ${taMesL(+Z.ultimo.slice(5, 7))}: the count starts again.`));
  let mov = '';
  if (Mv) {
    const m = +Mv.k.slice(5, 7), nom = taMesL(m), Nom = nom.charAt(0).toUpperCase() + nom.slice(1);
    const saco = Z.saca(Mv.k) ? L('Ese mes salió dinero de tu cartera.', 'That month money left your portfolio.') : L('No sacaste dinero.', 'You took no money out.');
    mov = Mv.dd > -0.5 ? `<p class="ta-texto">${L('En todo el año, tu cartera no llegó a bajar más de un 0,5 % desde su máximo.', 'All year, your portfolio never fell more than 0.5 % from its high.')}</p>`
      : `<div class="ta-graf" id="taMovido" style="min-height:150px"></div><p class="ta-texto">${L(`${Nom}, tu mes más movido: llegó a bajar un ${fmtNum(-Mv.dd, 1)} % desde su máximo. ${saco}`, `${Nom}, your most volatile month: it fell as much as ${fmtNum(-Mv.dd, 1)} % from its high. ${saco}`)}</p>`;
  }
  return cab + mov + taNota(L('Cambiar de una posición a otra o traspasar un fondo no cuenta: solo el dinero que sale de tu cartera.', 'Switching from one holding to another or transferring a fund does not count: only money that leaves your portfolio.'));
}

// cómo se calcula cada una (va al pie de la tarjeta, plegado)
const TA_COMO = {
  estilo: () => L('Cuatro rasgos de 0 a 1 con tus movimientos del año: Constante, los meses en que aportaste; Paciente, los meses sin ventas; Diversificador, cuántas posiciones (pesadas por lo que vale cada una) y de cuántos tipos; Explorador, las posiciones nuevas (hasta 3). Gana el más alto; si empatan, en ese orden. Operar más no sube ninguno.', 'Four traits from 0 to 1 from your moves this year. The highest wins; trading more raises none.'),
  aport: () => L('Lo que entra en tu cartera cada mes menos lo que sale. Lo que sale de una posición y entra en otra a menos de 7 días cuenta como un cambio, no como dinero nuevo. El mes en curso, cuando termine.', 'What goes into your portfolio each month minus what comes out. A sale and a purchase within 7 days count as a switch, not new money.'),
  edad: () => L('Por posición, cuánto lleva de media cada participación que tienes hoy desde que entró en tu cartera; la media de la cartera, pesada por lo que vale hoy cada posición. Lo que ya tenías al apuntarlo, desde la fecha que pusiste.', 'For each holding, how long each unit you hold today has been invested; the portfolio average is weighted by today\'s value.'),
  paises: () => L('Lo mismo que en Reparto y X-Ray: una acción, en el país de su sede; un fondo, según lo que tiene dentro. El oro, la cripto y el efectivo no están en ningún país.', 'Same as Allocation and X-Ray: a share in its home country; a fund by what it holds.'),
  costes: () => L('La comisión de gestión (TER) de cada fondo sobre lo que vale hoy, en un año y en los meses del periodo, más las comisiones que apuntaste en tus movimientos.', 'Each fund\'s management fee (TER) on today\'s value, plus the fees you recorded.'),
  divid: () => L('Lo que pagó cada empresa o ETF de reparto con fecha entre el 1 de enero y el final del periodo, por las acciones que tenías ese día, y la retención del país de la empresa (en España, el 19 %). Si tu bróker es español, a lo de fuera también le retiene el 19 % de lo que llega. El dato exacto está en el informe de tu bróker.', 'What each company or distributing ETF paid this year, for the shares you held that day, less the withholding of its country. The exact figure is in your broker\'s statement.'),
  meses: () => L('Mes a mes, si sale más dinero de tu cartera del que entra. Lo que sale de una posición y entra en otra a menos de 7 días, o en el mismo mes, no cuenta. El mes más movido es el que más llegó a bajar tu cartera desde su máximo del año, medido sin lo que metes o sacas (TWR).', 'Month by month, whether more money leaves your portfolio than goes in. Sales reinvested within 7 days or in the same month do not count.'),
};
const TA_TARJ = {
  estilo: [1, 'Tu estilo de inversor', 'Your investor style', 'c12', taCardEstilo],
  aport: [2, 'Lo que aportaste', 'What you put in', 'c6', taCardAport],
  edad: [3, 'La edad de tu dinero', 'How old your money is', 'c6', taCardEdad],
  paises: [4, 'Dónde está tu dinero', 'Where your money is', 'c8', taCardPaises],
  costes: [5, 'Lo que te costó', 'What it cost you', 'c4', taCardCostes],
  divid: [6, 'Dividendos', 'Dividends', 'c6', taCardDivid],
  meses: [7, 'Meses sin sacar dinero', 'Months without taking money out', 'c6', taCardMeses],
};

function pavTuAno(M) {
  const T = tuAnoCartera(M); S.taDatos = T;
  const i = Math.max(0, Math.min(TA_ORDEN.length - 1, S.taI || 0));
  const tarj = TA_ORDEN.map((k, j) => {
    const [n, t, en, c, f] = TA_TARJ[k];
    let cuerpo; try { cuerpo = f(T); } catch (e) { console.warn(e); cuerpo = taNota(L('No se ha podido calcular esta tarjeta.', 'This card could not be worked out.')); }
    return `<section class="pav-t pab pav-${c} ta-t${j === i ? ' ta-aqui' : ''}" data-ta="${k}" aria-labelledby="ta-h-${k}"><h2 class="pab-cab" id="ta-h-${k}"><span class="ta-n">${n} / ${TA_ORDEN.length}</span><span>${L(t, en)}</span></h2>${cuerpo}
      <details class="ta-como"><summary>${L('Cómo se calcula', 'How it is worked out')}</summary><p>${TA_COMO[k]()}</p></details></section>`;
  }).join('');
  const cab = `<section class="pav-t pav-c12 ta-cab"><p>${L('Siete tarjetas con lo que hiciste este año. Son tus datos, sin comparar con nadie, y no te dicen qué hacer.', 'Seven cards with what you did this year. Your data, compared with no one, and they do not tell you what to do.')}</p></section>`;
  // en el móvil, una tarjeta por pantalla: las barras de arriba, la cabecera y «Anterior / Siguiente»
  const barra = `<div class="ta-hbarra" aria-hidden="true">${TA_ORDEN.map((_, j) => `<i class="${j < i ? 'si' : j === i ? 'aqui' : ''}"></i>`).join('')}</div>`;
  const hcab = `<div class="ta-hcab"><span>${L('Tu año en Toisón', 'Your year in Toisón')} · <b class="ta-hnum">${i + 1}</b> ${L('de', 'of')} ${TA_ORDEN.length}</span><a href="#hoy" class="ta-cerrar" aria-label="${L('Cerrar Tu año', 'Close Your year')}">✕</a></div>`;
  const pie = `<div class="ta-hpie"><button type="button" class="btn" data-ta-ir="-1"${i === 0 ? ' disabled' : ''}>${L('‹ Anterior', '‹ Previous')}</button><button type="button" class="btn pri" data-ta-ir="1">${i === TA_ORDEN.length - 1 ? L('Volver a Hoy', 'Back to Today') : L('Siguiente ›', 'Next ›')}</button></div>`;
  return `<div class="ta-pag" data-i="${i}">${cab}${barra}${hcab}${tarj}${pie}</div>`;
}

// la gráfica del año (tarjeta 7), con su ancho de verdad
function dibujarTuAno(M) {
  const T = S.taDatos, el = $('#taMovido');
  if (!T || !T.movido || !el) return;
  const v = T.movido.valores, d = (v.find((x) => x.d === T.movido.d) || {}).d;
  grafLinea(el, [{ datos: v, color: 'var(--grafica)', nombre: L('Tu cartera', 'Your portfolio') }], { alto: 150, sinRef: true, titulo: L('Tu cartera este año', 'Your portfolio this year'), fmt: (x) => eur(x, 0), marca: d ? { d, txt: `−${fmtNum(-T.movido.dd, 1)} %` } : null });
}

// pasar de tarjeta en el móvil (sin repintar: solo cambia cuál se ve)
function taIr(n) {
  const pag = $('#panelAv .ta-pag'); if (!pag) return;
  const i = (S.taI || 0) + n;
  if (i >= TA_ORDEN.length) { S.taI = 0; location.hash = 'hoy'; return; }
  if (i < 0) return;
  S.taI = i; pag.dataset.i = i;
  $$('.ta-t', pag).forEach((t, j) => t.classList.toggle('ta-aqui', j === i));
  $$('.ta-hbarra i', pag).forEach((b, j) => { b.className = j < i ? 'si' : j === i ? 'aqui' : ''; });
  const num = $('.ta-hnum', pag); if (num) num.textContent = i + 1;
  const [a, s] = $$('[data-ta-ir]', pag);
  a.disabled = i === 0; s.textContent = i === TA_ORDEN.length - 1 ? L('Volver a Hoy', 'Back to Today') : L('Siguiente ›', 'Next ›');
  const t = $$('.ta-t', pag)[i]; if (t) { t.scrollTop = 0; const h = t.querySelector('h2'); if (h && matchMedia('(max-width: 759px)').matches) { h.tabIndex = -1; h.focus({ preventScroll: true }); } }
  if (TA_ORDEN[i] === 'meses') dibujarTuAno();
}
document.addEventListener('click', (e) => {
  if (e.target.closest && e.target.closest('#panelAv .ta-cerrar')) { S.taI = 0; return; }
  const b = e.target.closest && e.target.closest('#panelAv [data-ta-ir]'); if (!b) return;
  taIr(+b.dataset.taIr); vibrar();
});
document.addEventListener('keydown', (e) => {
  if (!$('#panelAv .ta-pag') || !matchMedia('(max-width: 759px)').matches || e.target.closest('input, textarea, select')) return;
  if (e.key === 'ArrowRight') taIr(1); else if (e.key === 'ArrowLeft') taIr(-1);
});
// deslizar a los lados en el móvil
let taToque = null;
document.addEventListener('touchstart', (e) => { const t = e.target.closest && e.target.closest('#panelAv .ta-pag'); taToque = t && e.touches.length === 1 ? { x: e.touches[0].clientX, y: e.touches[0].clientY } : null; }, { passive: true });
document.addEventListener('touchend', (e) => {
  if (!taToque || !matchMedia('(max-width: 759px)').matches) return;
  const t = e.changedTouches[0], dx = t.clientX - taToque.x, dy = t.clientY - taToque.y; taToque = null;
  if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5 && !e.target.closest('.ta-graf, .chart')) taIr(dx < 0 ? 1 : -1);
}, { passive: true });
