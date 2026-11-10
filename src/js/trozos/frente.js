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

/* =========================== 0.8.6 · Frente a un indexado: las pantallas (sesión 5) ===========================
   Según la maqueta aprobada (2X, 8 nov). Ordenador, en avanzado: una tarjeta de todo el ancho con las dos líneas (con
   escala) y, al lado, la bolita de la diferencia y las cifras; debajo, filas de la misma altura (la diferencia en el
   tiempo y sus momentos; final de cada año y la TWR), las medidas en una fila y los tres candados de Dorado juntos.
   Móvil, y básico en el ordenador: tres tarjetas («Tu cartera y el indexado», «¿Por encima o por debajo?» y «A final
   de cada año», con la tabla a un toque), todas las gráficas con escala. Textos como pide la CNMV: lo que habría
   pasado, sin «compra» ni «vende», y que lo de antes no es un indicador fiable de lo que pasará. Las referencias, en el
   orden de la lista, nunca por cuál gana. */
const FR_REFS = () => BENCH.filter((b) => b.id !== '^IBEX');
const FR_LS = 'inv-frente-ref';
const frRef = () => { const id = S.frenteRef || LS.get(FR_LS, 'fidelity-world'); return id !== 'fidelity-world' && (!tieneDorado() || !FR_REFS().some((b) => b.id === id)) ? 'fidelity-world' : id; };
const frCompacto = () => modoApp() === 'basico' || innerWidth < 600;
const frAviso = () => L('Es lo que habría pasado con el mismo dinero, en las mismas fechas. Lo de antes no es un indicador fiable de lo que pasará.', 'This is what would have happened with the same money, on the same dates. Past performance is not a reliable indicator of future results.');
const frMes = (d) => (d === hoyIso() ? L('hoy', 'today') : `${IDIOMA === 'en' ? MESES_EN[+d.slice(5, 7) - 1].slice(0, 3) : MESES[+d.slice(5, 7) - 1]} ${d.slice(0, 4)}`);
const frNomRef = (id) => { const b = benchDe(id); return id === 'fidelity-world' ? L('un indexado de la bolsa mundial', 'a world stock index fund') : L(`un indexado del ${nombreBench(b)}`, `an ${nombreBench(b)} index fund`); };
const frCand = () => `<span class="fr-cand" title="${L('Con Toisón Dorado', 'With Toisón Gold')}">${ICONOS_PL.candado || ''}</span>`;
const frSello = () => `<i class="et-dorado">${selloDorado('sd-peq')}Dorado</i>`;
const frDifTxt = (v) => (v >= 0 ? L(`${eur(Math.abs(v), 0)} por encima`, `${eur(Math.abs(v), 0)} above`) : L(`${eur(Math.abs(v), 0)} por debajo`, `${eur(Math.abs(v), 0)} below`));

function frBola(F) {
  return `<div class="fr-bola"><span>${L('Diferencia', 'Difference')}</span><b class="${cls(F.dif)}">${eurS(F.dif, 0)}</b>${F.difPct != null ? `<small>${pctS(F.difPct, 1)}</small>` : ''}</div>`;
}
function frCifras(F, corto) {
  const tir = (v) => (v == null ? '—' : pctS(v, 1));
  const xs = [[L('Has metido', 'Put in'), eur(F.metido, 0)], F.sacado > 0 ? [L('Has sacado', 'Taken out'), eur(F.sacado, 0)] : null, [L('Tu cartera', 'Your portfolio'), eur(F.tuHoy, 0)], [L('Mismo dinero en el indexado', 'Same money in the index fund'), eur(F.ixHoy, 0)]].filter(Boolean);
  if (corto) return `<div class="fr-mini">${xs.map(([k, v]) => `<span><small>${k}</small><b>${v}</b></span>`).join('')}</div>`;
  xs.push([L('Al año, contando cuándo entró cada euro', 'A year, counting when each euro went in'), F.corto ? L('en cuanto lleves mes y medio', 'after six weeks') : `${tir(F.tirTu)} <small>${L('tú', 'you')}</small> · ${tir(F.tirIx)} <small>${L('indexado', 'index')}</small>`]);
  return `<dl class="fr-cifl">${xs.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl>`;
}
const frLey = (xs) => `<p class="pav-ley">${xs.map(([c, t, disc]) => `<span><i style="${disc ? `background:none;border-top:2px dashed ${c};height:0` : `background:${c}`}"></i>${t}</span>`).join('')}</p>`;
const frLeyGraf = (F) => frLey(F.sinSerie ? [['var(--texto)', L('El indexado', 'The index fund')], ['var(--texto-2)', L('Lo que has metido', 'Put in'), 1]] : [['var(--grafica)', L('Tu cartera', 'Your portfolio')], ['var(--texto)', L('El indexado', 'The index fund')], ['var(--texto-2)', L('Lo que has metido', 'Put in'), 1]]);
const frLeyDif = () => frLey([['var(--sube)', L('Por encima del indexado', 'Above the index fund')], ['var(--baja)', L('Por debajo', 'Below')]]);

// los avisos de lo que no cuadra o falta: sin la fecha de algo, sin precios pasados, compras supuestas que no cuadran
function frNotas(F) {
  const xs = [];
  if (F.sinSerie) xs.push(F.sinHist && F.sinHist.length ? L(`Las gráficas salen cuando haya precios pasados de ${esc(yLista(F.sinHist))}. Lo de hoy sí está.`, `The charts show once there are past prices for ${esc(F.sinHist.join(', '))}. Today's figures are in.`) : L('Las gráficas salen en cuanto haya historial suficiente.', 'The charts show once there is enough history.'));
  if (F.dudosas && F.dudosas.length) xs.push(L(`Lo que ya tenías de ${esc(yLista(F.dudosas))} al apuntarlo se ha repartido en compras con fecha, y lo que dijiste que te costó no cuadra con los precios de esas fechas. La comparación depende de eso: revisa el coste y la fecha («desde») en su ficha.`, `What you already held of ${esc(F.dudosas.join(', '))} has been spread into dated purchases, and the cost you entered doesn't match the prices on those dates. Check its cost and date.`));
  if (F.negativo) xs.push(L('Has sacado más de lo que valdría el indexado en algún momento: esa parte cuenta como si se hubiera puesto de más.', 'At some point you took out more than the index fund would have been worth: that part counts as extra money put in.'));
  if (F.efectivo > 1) xs.push(L(`Sin el efectivo (${eur(F.efectivo, 0)}): se compara lo invertido.`, `Without cash (${eur(F.efectivo, 0)}): only what is invested is compared.`));
  return xs.length ? `<div class="fr-notas">${xs.map((t) => `<p class="nota">${t}</p>`).join('')}</div>` : '';
}
function frSinNada(F) {
  const t = F.sinFecha ? L(`Para compararlo hace falta la fecha de compra de ${esc(yLista(F.sinFecha.slice(0, 4)))}${F.sinFecha.length > 4 ? '…' : ''}: ponla en su ficha o importa tus movimientos.`, `It needs the purchase date of ${esc(F.sinFecha.slice(0, 4).join(', '))}. Add it on its page or import your transactions.`)
    : F.sinDatos ? (F.desdeDatos ? L(`El indexado tiene precios desde ${fechaConAnio(F.desdeDatos)}, y tu primera compra es anterior.`, `The index fund has prices from ${fechaConAnio(F.desdeDatos)}; your first purchase is earlier.`) : L('Ahora mismo no hay precios del indexado.', 'There are no index fund prices right now.'))
    : L('Sale en cuanto apuntes lo que te costó lo que tienes.', 'It shows once you enter what you paid for what you hold.');
  return pavT('c12', L('Frente a un indexado', 'Against an index fund'), `<p class="nota" style="margin:0">${t}</p>`);
}

function frMomentos(F) {
  const t = (m) => {
    if (m.tipo === 'inicio') return [L(`Empiezas con ${eur(m.metido, 0)}`, `You start with ${eur(m.metido, 0)}`), ''];
    if (m.tipo === 'max') return [L(`Lo más por encima: ${eur(m.dif, 0)}`, `Furthest above: ${eur(m.dif, 0)}`), 'up'];
    if (m.tipo === 'min') return [L(`Lo más por debajo: ${eur(Math.abs(m.dif), 0)}`, `Furthest below: ${eur(Math.abs(m.dif), 0)}`), 'down'];
    if (m.tipo === 'cruce') return [m.dif >= 0 ? L('Pasas por encima del indexado', 'You move above the index fund') : L('Pasas por debajo del indexado', 'You move below the index fund'), cls(m.dif)];
    if (m.tipo === 'enero') return [L(`Empieza el año ${frDifTxt(m.dif)}`, `The year starts ${frDifTxt(m.dif)}`), cls(m.dif)];
    return [frDifTxt(m.dif), cls(m.dif)];
  };
  return `<ol class="fr-tl">${F.momentos.map((m) => { const [x, c] = t(m); return `<li><time>${m.tipo === 'hoy' ? L('hoy', 'today') : frMes(m.d)}</time><span class="${c}">${x}</span></li>`; }).join('')}</ol>`;
}
function frBarras(F, ultimos = 0) {
  // en el móvil caben cuatro años: los últimos (todos, en la tabla de debajo)
  let xs = F.anios.filter((a) => a.tu != null && a.ix != null); if (ultimos && xs.length > ultimos) xs = xs.slice(-ultimos);
  const max = Math.max(1, ...xs.flatMap((a) => [a.tu, a.ix]));
  const k = (v) => (Math.abs(v) >= 1e4 ? `${fmtNum(v / 1000, 1)}k` : fmtNum(v, 0));
  return `<div class="fr-pares" style="--n:${xs.length}">${xs.map((a) => `<div class="fr-par"><div class="fr-par-b"><i style="height:${Math.max(1, (a.tu / max) * 100).toFixed(1)}%;background:var(--grafica)"><em>${k(a.tu)}</em></i><i style="height:${Math.max(1, (a.ix / max) * 100).toFixed(1)}%;background:var(--texto-2)"><em>${k(a.ix)}</em></i></div><b>${a.parcialFin ? L('Hoy', 'Today') : a.anio}</b><small class="${cls(a.tu - a.ix)}">${eurS(a.tu - a.ix, 0)}</small></div>`).join('')}</div>${frLey([['var(--grafica)', L('Tu cartera', 'Your portfolio')], ['var(--texto-2)', L('El indexado', 'The index fund')]])}`;
}
const frAnioEt = (a) => `${a.anio}${a.parcialIni ? `<small>${L(`desde ${MESES_LARGOS[+a.desde.slice(5, 7) - 1]}`, `from ${MESES_EN[+a.desde.slice(5, 7) - 1]}`)}</small>` : a.parcialFin ? `<small>${L('hasta hoy', 'to date')}</small>` : ''}`;
function frTablaTwr(F) {
  const p = (v) => (v == null ? '—' : `<b class="${cls(v)}">${pctS(v, 1)}</b>`);
  return pavTabla(['', L('Tu cartera', 'Your portfolio'), L('Indexado', 'Index fund'), L('Diferencia, pts', 'Difference, pts')], F.anios.map((a) => [frAnioEt(a), p(a.twrTu), p(a.twrIx), a.twrTu == null || a.twrIx == null ? '—' : `<span class="${cls(a.twrTu - a.twrIx)}">${masSi(a.twrTu - a.twrIx, 1)}${fmtNum(a.twrTu - a.twrIx, 1)}</span>`]));
}
function frTablaEur(F) {
  return pavTabla(['', L('Tú · indexado', 'You · index'), L('Diferencia', 'Difference')], F.anios.filter((a) => a.tu != null).map((a) => [frAnioEt(a), `${eur(a.tu, 0)}<small>${eur(a.ix, 0)}</small>`, `<b class="${cls(a.tu - a.ix)}">${eurS(a.tu - a.ix, 0)}</b>`]));
}
function frMedidas(F, cols = 6) {
  const m = F.medidas, tir = (v) => (v == null ? '—' : pctS(v, 1));
  const sinM = !m || m.faltan || m.quieto;
  const k = [
    [L('Tu cartera (TIR)', 'Your portfolio (IRR)'), tir(F.tirTu), F.tirTu != null ? cls(F.tirTu) : '', L('al año, con tus aportaciones', 'a year, with your contributions')],
    [L('El indexado (TIR)', 'The index fund (IRR)'), tir(F.tirIx), F.tirIx != null ? cls(F.tirIx) : '', L('mismas fechas', 'same dates')],
    [L('Alfa', 'Alpha'), sinM ? '—' : `${masSi(m.alfa, 1)}${fmtNum(m.alfa, 1)} ${L('pts', 'pts')}`, sinM ? '' : cls(m.alfa), sinM ? L('al año, frente a la referencia', 'a year, against the benchmark') : m.beta < 1 ? L('al año, contando que te mueves menos', 'a year, allowing for moving less') : L('al año, contando que te mueves más', 'a year, allowing for moving more')],
    [L('Beta', 'Beta'), sinM ? '—' : fmtNum(m.beta, 2), '', sinM ? '' : m.beta < 1 ? L(`se mueve un ${fmtNum((1 - m.beta) * 100, 0)} % menos`, `moves ${fmtNum((1 - m.beta) * 100, 0)}% less`) : L(`se mueve un ${fmtNum((m.beta - 1) * 100, 0)} % más`, `moves ${fmtNum((m.beta - 1) * 100, 0)}% more`)],
    [L('Tracking error', 'Tracking error'), sinM ? '—' : pct(m.te, 1), '', L('cuánto se separa en un año', 'how far apart in a year')],
    [L('Ratio de información', 'Information ratio'), sinM || m.ir == null ? '—' : `${masSi(m.ir, 2)}${fmtNum(m.ir, 2)}`, sinM || m.ir == null ? '' : cls(m.ir), L('la diferencia, por cada punto que se separa', 'the difference, per point apart')],
  ];
  const falta = m && m.faltan ? `<p class="nota" style="margin:12px 0 0">${L(`Alfa, beta y lo demás salen con medio año de semanas: llevas ${m.semanas}, faltan ${m.faltan}.`, `Alpha, beta and the rest show after half a year of weeks: ${m.semanas} so far, ${m.faltan} to go.`)}</p>` : '';
  return pavKpis(k, cols) + falta;
}
// los tres candados: con Dorado, lo de verdad; sin él, un ejemplo borroso con el botón
const frBloq = (demo) => `<div class="fr-bloq"><div class="fr-bloq-in" aria-hidden="true" inert>${demo}</div><div class="fr-bloq-cta">${selloDorado('sd-peq')}<b>${L('Con Toisón Dorado', 'With Toisón Gold')}</b><button type="button" class="btn" data-fr-dorado>${L('Ver Toisón Dorado', 'See Toisón Gold')}</button></div></div>`;
function frOtras(M, F) {
  if (!tieneDorado()) return frBloq(pavTabla([L('Referencia', 'Benchmark'), L('Con tu dinero', 'With your money'), L('Diferencia', 'Difference')], [['S&P 500', '25.020 €', '−1.640 €'], ['MSCI Europe', '22.310 €', '+1.070 €'], ['60/40', '22.040 €', '+1.340 €']]));
  const filas = FR_REFS().filter((b) => b.id !== F.id).map((b) => {
    const G = frenteCartera(M, b.id);
    return [esc(nombreBench(b)), G.ixHoy != null && !G.sinDatos ? eur(G.ixHoy, 0) : '—', G.dif != null && !G.sinDatos ? `<b class="${cls(G.dif)}">${eurS(G.dif, 0)}</b>` : `<small>${L('sin precios de esas fechas', 'no prices for those dates')}</small>`];
  });
  frenteCartera(M, F.id); // deja en la caché la referencia de la pestaña
  return pavTabla([L('Referencia', 'Benchmark'), L('Con tu dinero', 'With your money'), L('Diferencia', 'Difference')], filas);
}
function frDeDonde(F) {
  if (!tieneDorado()) return frBloq(['MSCI World', 'Emergentes', 'Repsol', 'Bitcoin'].map((n, i) => pavDos(n, [40, -210, -380, -340][i], 400)).join(''));
  const xs = (F.reparto || []).filter((x) => Math.abs(x.dif) >= 1).sort((a, b) => Math.abs(b.dif) - Math.abs(a.dif)).slice(0, 6), max = Math.max(1, ...xs.map((x) => Math.abs(x.dif)));
  return xs.length ? xs.map((x) => pavDos(nombreInst(x.id), x.dif, max)).join('') : `<p class="nota" style="margin:0">${L('Nada que repartir.', 'Nothing to split.')}</p>`;
}
function frCaptura(F) {
  if (!tieneDorado()) return frBloq(pavKpis([[L('En las semanas de subida', 'In up weeks'), '88 %', '', L('de lo que sube', 'of the rise')], [L('En las de bajada', 'In down weeks'), '79 %', '', L('de lo que baja', 'of the fall')]], 2));
  const m = F.medidas, ok = m && !m.faltan && !m.quieto;
  return pavKpis([[L('En las semanas de subida', 'In up weeks'), ok && m.capSube != null ? pct(m.capSube, 0) : '—', '', L('de lo que sube el indexado', 'of the index fund\'s rise')], [L('En las de bajada', 'In down weeks'), ok && m.capBaja != null ? pct(m.capBaja, 0) : '—', '', L('de lo que baja', 'of its fall')]], 2);
}

function pavFrente(M) {
  const F = frenteCartera(M, frRef());
  if (F.sinFlujos || F.sinFecha || F.sinDatos) return frSinNada(F);
  const graf = (h) => `<div class="chart fr-chart" id="frGraf" style="min-height:${h}px"></div>${frLeyGraf(F)}`;
  const difG = (h) => `<div class="fr-difg"><div class="fr-hitos" id="frHitos"></div><div class="chart fr-chart" id="frDif" style="min-height:${h}px"></div></div>${frLeyDif()}`;
  const nombre = nombreBench(benchDe(F.id));
  const debajo = F.dif < 0;
  if (frCompacto()) {
    const peor = F.momentos.find((x) => x.tipo === 'min'), mejor = F.momentos.find((x) => x.tipo === 'max');
    return [
      pabLead(L('¿Te habría dado lo mismo meterlo todo en un indexado? Con tus fechas y tus euros.', 'Would putting it all in an index fund have given you the same? With your dates and your euros.')),
      pabT('c12', L('Tu cartera y el indexado', 'Your portfolio and the index fund'), `<div class="fr-bola-fila">${frBola(F)}${frCifras(F, true)}</div>${F.sinSerie ? '' : graf(innerWidth < 560 ? 190 : 230)}${frNotas(F)}`,
        L(`Cada euro que metiste, el mismo día, en un fondo indexado del ${nombre} en euros, con los dividendos dentro y su comisión descontada. La línea de puntos es lo que has ido metiendo. ${frAviso()}`, `Each euro you put in, on the same day, in an ${nombre} index fund in euros, dividends included and its fee taken off. The dotted line is what you have put in. ${frAviso()}`), 'frTuIx'),
      F.sinSerie ? '' : pabT('c12', L('¿Por encima o por debajo?', 'Above or below?'), difG(innerWidth < 560 ? 170 : 200), L('Cada día, lo que valía lo tuyo menos lo que valdría el mismo dinero en el indexado: verde, por encima; rojo, por debajo.', 'Each day, what yours was worth minus the same money in the index fund: green, above; red, below.'), 'frDifT'),
      F.sinSerie ? '' : pabT('c12', L('A final de cada año', 'At the end of each year'), `${frBarras(F, innerWidth < 600 ? 4 : 0)}<details class="fr-tabla-d"><summary>${F.anios.length > 4 && innerWidth < 600 ? L('Todos los años, en tabla', 'All years, as a table') : L('Verlo en tabla', 'See it as a table')}</summary>${frTablaEur(F)}</details>`, L('Lo que valía cada cosa el 31 de diciembre; el último, hoy.', 'What each was worth on 31 December; the last one, today.'), 'frAnios'),
      // 0.8.6 (Carlos, 10 nov, 21:04; claude/decisiones-086-10nov.md): en el móvil y en avanzado, las medidas como cuarta
      // tarjeta, plegada; en básico, solo las tres
      modoApp() === 'avanzado' ? pabT('c12', L('Medidas frente a la referencia', 'Measures against the benchmark'), `<details class="fr-med-d" id="frMedD"><summary>${L('Ver alfa, beta y las demás', 'See alpha, beta and the rest')}</summary>${frMedidas(F, 2)}</details>`, L('Con lo que hace cada uno cada semana desde la primera aportación. Alfa y beta, por regresión y sin tipo sin riesgo; tracking error, lo que se separan semana a semana, pasado a un año; ratio de información, la diferencia de un año entre el tracking error.', 'With what each does every week since the first contribution. Alpha and beta by regression, without a risk-free rate; tracking error, how far the weekly returns drift apart, annualised; information ratio, the yearly difference over the tracking error.'), 'frMedM') : '',
      pabPreguntas([debajo ? L('¿Por qué mi cartera va por debajo del indexado?', 'Why is my portfolio below the index fund?') : L('¿Por qué mi cartera va por encima del indexado?', 'Why is my portfolio above the index fund?'), (debajo ? peor : mejor) ? L(`¿Qué pasó en ${frMes((debajo ? peor : mejor).d)}?`, `What happened in ${frMes((debajo ? peor : mejor).d)}?`) : L('¿Qué es un indexado?', 'What is an index fund?')], 'c12'),
    ].join('');
  }
  const refs = `<div class="fr-refs" role="group" aria-label="${L('Con qué comparar', 'Compare with')}">${FR_REFS().map((b) => `<button type="button" class="fr-ref" data-fr-ref="${esc(b.id)}" aria-pressed="${b.id === F.id}">${esc(nombreBench(b))}${b.id !== 'fidelity-world' && !tieneDorado() ? frCand() : ''}</button>`).join('')}</div>`;
  const frase = `<p class="fr-frase">${L(`Con tus mismas aportaciones, en las mismas fechas, ${frNomRef(F.id)} valdría hoy <b>${eur(F.ixHoy, 0)}</b>. Lo tuyo vale <b>${eur(F.tuHoy, 0)}</b>: <b class="${cls(F.dif)}">${eur(Math.abs(F.dif), 0)} ${debajo ? 'menos' : 'más'}</b>.`, `With your same contributions, on the same dates, ${frNomRef(F.id)} would be worth <b>${eur(F.ixHoy, 0)}</b> today. Yours is worth <b>${eur(F.tuHoy, 0)}</b>: <b class="${cls(F.dif)}">${eur(Math.abs(F.dif), 0)} ${debajo ? 'less' : 'more'}</b>.`)}</p>`;
  const hoyCab = `<div class="fr-dif-cab"><small>${L('Hoy vas', 'Today you are')}</small><b class="fr-num ${cls(F.dif)}">${eurS(F.dif, 0)}</b><span>${debajo ? L('por debajo del indexado, con el mismo dinero', 'below the index fund, with the same money') : L('por encima del indexado, con el mismo dinero', 'above the index fund, with the same money')}</span></div>`;
  return [
    pavT('c12', L('Frente a un indexado · mismas aportaciones y fechas', 'Against an index fund · same contributions and dates'), `${refs}<div class="fr-hero"><div>${frase}${F.sinSerie ? '' : graf(300)}${frNotas(F)}</div><aside class="fr-hero-lado">${frBola(F)}${frCifras(F, false)}</aside></div>`,
      L(`Cada aportación y cada retirada, con su fecha, en el fondo indexado de la referencia en euros (dividendos dentro y su comisión, la TER, descontada, como la cobra el fondo). ${frAviso()}`, `Each contribution and withdrawal, on its date, in the benchmark index fund in euros (dividends included and its fee, the TER, taken off). ${frAviso()}`)),
    F.sinSerie ? '' : pavT('c8 fr-igual', L('La diferencia en el tiempo', 'The difference over time'), hoyCab + difG(220), L('Cada día, valor de tu cartera menos el de las mismas aportaciones en la referencia.', 'Each day, your portfolio\'s value minus the same contributions in the benchmark.')),
    F.sinSerie ? '' : pavT('c4 fr-igual', L('Los momentos', 'Key moments'), frMomentos(F)),
    F.sinSerie ? '' : pavT('c6 fr-igual', L('A final de cada año', 'At the end of each year'), frBarras(F), L('Lo que valía cada cosa el 31 de diciembre; el último, hoy.', 'What each was worth on 31 December; the last one, today.')),
    F.sinSerie ? '' : pavT('c6 fr-igual', L('Año a año, por tiempo (TWR)', 'Year by year, time-weighted (TWR)'), frTablaTwr(F), L('La TWR quita el efecto de cuándo aportas: es la que se compara entre años. El primero y el último, desde tu primera aportación y hasta hoy.', 'TWR removes the effect of when you invest: it is the one to compare across years.')),
    pavT('c12', L('Medidas frente a la referencia', 'Measures against the benchmark'), frMedidas(F), L('Con lo que hace cada uno cada semana desde la primera aportación (el último precio de cada semana: la cripto cotiza en fin de semana y los fondos no). Alfa y beta, por regresión y sin tipo sin riesgo; tracking error, lo que se separan semana a semana, pasado a un año; ratio de información, la diferencia de un año entre el tracking error.', 'With what each does every week since the first contribution. Alpha and beta by regression, without a risk-free rate; tracking error, how far the weekly returns drift apart, annualised; information ratio, the yearly difference over the tracking error.')),
    pavT('c4 fr-igual', `${L('Otras referencias', 'Other benchmarks')} ${frSello()}`, frOtras(M, F), L('Con tu dinero y tus fechas en cada una. En el orden de la lista, no por cuál gana.', 'Your money and dates in each. In list order, not by which wins.')),
    pavT('c4 fr-igual', `${L('De dónde sale la diferencia', 'Where the difference comes from')} ${frSello()}`, frDeDonde(F), L('Cada posición frente a sus mismas aportaciones en el indexado. Suman la diferencia de arriba.', 'Each holding against its same contributions in the index fund. They add up to the difference above.')),
    pavT('c4 fr-igual', `${L('Captura en subidas y bajadas', 'Up and down capture')} ${frSello()}`, frCaptura(F), L('De lo que sube (o baja) el indexado en sus semanas de subida (o de bajada), cuánto sube (o baja) lo tuyo.', 'Of what the index fund gains (or loses) in its up (or down) weeks, how much yours does.')),
  ].join('');
}

function dibujarFrente(M) {
  const F = frenteCache.r; if (!F || F.sinDatos || F.sinFlujos || F.sinFecha) return;
  const g = $('#frGraf'), dg = $('#frDif'), alto = (el) => parseInt(el.style.minHeight, 10) || 220;
  if (g) {
    const tu = F.diario.filter((x) => x.tu != null).map((x) => ({ d: x.d, v: x.tu })), ix = F.diario.filter((x) => x.ix != null).map((x) => ({ d: x.d, v: x.ix })), met = F.diario.map((x) => ({ d: x.d, v: x.metido }));
    grafLinea(g, [{ datos: tu, color: 'var(--grafica)', nombre: L('Tu cartera', 'Your portfolio') }, { datos: ix, color: 'var(--texto)', nombre: L('El indexado', 'The index fund') }, { datos: met, color: 'var(--texto-2)', nombre: L('Lo que has metido', 'Put in'), disc: true }], { alto: alto(g), sinRef: true, titulo: L('Tu cartera y el indexado', 'Your portfolio and the index fund'), fmt: (v) => eur(v, 0) });
  }
  if (dg) {
    const s = F.diario.filter((x) => x.dif != null).map((x) => ({ d: x.d, v: x.dif }));
    grafLinea(dg, s, { alto: alto(dg), color: 'var(--texto)', rellenoA: 0, dosLados: true, sinRef: true, titulo: L('La diferencia con el indexado', 'The difference with the index fund'), fmt: (v) => eurS(v, 0) });
    // los momentos, encima de la gráfica, en su sitio (lo más arriba, lo más abajo y hoy)
    const hs = $('#frHitos');
    if (hs && s.length > 1) {
      const W = Math.max(240, dg.clientWidth || 600), ml = 4, mr = 54, t0 = tiempoDe(s[0].d), t1 = tiempoDe(s[s.length - 1].d);
      const xDe = (d) => ml + ((tiempoDe(d > s[s.length - 1].d ? s[s.length - 1].d : d) - t0) / Math.max(1, t1 - t0)) * (W - ml - mr);
      // si dos rótulos caen muy cerca (lo más abajo fue hace dos semanas y hoy), se queda el de hoy: no se pisan
      const hz = []; for (const m of F.momentos.filter((y) => y.tipo === 'max' || y.tipo === 'min' || y.tipo === 'hoy').reverse()) if (hz.every((y) => Math.abs(xDe(y.d) - xDe(m.d)) > 120)) hz.unshift(m);
      hs.innerHTML = hz.map((m) => {
        const x = xDe(m.d);
        const t = m.tipo === 'max' ? L('Lo más arriba', 'Highest') : m.tipo === 'min' ? L('Lo más abajo', 'Lowest') : L('Hoy', 'Today');
        return `<span style="left:${((x / W) * 100).toFixed(2)}%"${x / W > 0.8 ? ' class="dcha"' : x / W < 0.12 ? ' class="izq"' : ''}>${t}<br><b class="${cls(m.dif)}">${eurS(m.dif, 0)}</b></span>`;
      }).join('');
    }
  }
}

function hojaDoradoFrente() {
  hoja(L('Más con el indexado', 'More on the index fund'), `<div class="hoja-escr"><p class="et-dorado-g">${selloDorado('sd-peq')}${L('Toisón Dorado', 'Toisón Gold')}</p><p>${L('Compararte con otras referencias (S&P 500, MSCI Europe, emergentes, 60/40), ver de dónde sale la diferencia posición a posición y cuánto capturas de las subidas y de las bajadas son de Toisón Dorado. El MSCI World es de todos.', 'Comparing with other benchmarks, seeing where the difference comes from holding by holding, and up and down capture are part of Toisón Gold. The MSCI World is for everyone.')}</p>
    <p class="nota">${tieneDorado() ? L('Ya tienes Toisón Dorado.', 'You already have Toisón Gold.') : L('Será parte de Toisón Dorado, el plan de pago. Todavía no está disponible.', 'It will be part of Toisón Gold, the paid plan. It isn’t available yet.')}</p>
    <div class="fila-btns"><button type="button" class="btn" data-cerrar>${L('Entendido', 'Got it')}</button></div></div>`);
}
document.addEventListener('click', (e) => {
  const b = e.target.closest && e.target.closest('#panelAv [data-fr-ref], #panelAv [data-fr-dorado]'); if (!b) return;
  if (b.matches('[data-fr-dorado]')) { hojaDoradoFrente(); return; }
  const id = b.dataset.frRef;
  if (id !== 'fidelity-world' && !tieneDorado()) { hojaDoradoFrente(); return; }
  S.frenteRef = id; LS.set(FR_LS, id); repintarAv();
});
// al pasar de móvil a ordenador (o al revés), la otra forma de la pestaña
let frAntes = null;
addEventListener('resize', () => {
  const c = innerWidth < 600; if (frAntes === null) frAntes = c;
  if (c !== frAntes && $('#panelAv[data-p="frente"]')) repintarAv();
  frAntes = c;
});
