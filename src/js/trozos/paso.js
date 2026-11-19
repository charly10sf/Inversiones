/* =====================================================================
   Trozo «paso» (0.9): la página del Paso a paso del modo fundador, tal y como quedó la maqueta del 15 nov
   (claude/decisiones-15nov-maqueta-paso-hoy.md). El mes en un bloque (cuántos quedan en un aro, lo que se mueve en una
   barra, Hacienda y el estado de los datos); «Haz esto», con cada paso plegado en una fila (tipo, cuándo, la acción, su
   dibujo, la confianza y lo de Hacienda) y lo demás al abrirlo; «Para decidir tú», con lo de confianza baja y las
   opciones; al lado, las fechas, lo que va solo y «Cómo le ha ido»; los otros plazos en filas, cada una con su confianza;
   y la hoja «Qué mira cada mes», con las doce opciones. Los cálculos están en el núcleo (16b-paso-mes.js): aquí solo se
   pinta y se guarda lo que eliges.
   ===================================================================== */
/* ---------- el cálculo del mes (lo llama el núcleo: mesRuta y pasosRuta0, por window) ---------- */
const MES_LARGO = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
/* los pasos que salen de las opciones nuevas (las que ya existían están en pasosRuta0) */
function pasosOpciones(M, add, c) {
  const hoy = c.hoy, mesK = hoy.slice(0, 7);
  const prox = c.act.flatMap(({ a }) => fechasAportacion({ ...a, desde: a.desde > hoy ? a.desde : hoy }, sumarDias(hoy, -1), sumarDias(hoy, 31)).slice(0, 1).map((d) => ({ d, a }))).sort((x, y) => (x.d < y.d ? -1 : 1));
  // A dónde va la aportación: al fondo que más lejos está de su objetivo, sin vender
  const rep = repartoFondos();
  if (rep && prox.length) {
    const { d, a } = prox[0], A = +a.importe || 0;
    const fondos = Object.keys(rep).filter((id) => S.inst[id]).map((id) => ({ id, peso: pesoInst(M, id), obj: +rep[id] || 0 }));
    const lejos = fondos.filter((x) => x.obj - x.peso > 2).sort((x, y) => (y.obj - y.peso) - (x.obj - x.peso))[0];
    const de = fondos.find((x) => x.id === a.instrumento) || { id: a.instrumento, peso: pesoInst(M, a.instrumento), obj: rep[a.instrumento] != null ? +rep[a.instrumento] : null };
    if (lejos && A > 0 && lejos.id !== a.instrumento && M.total) {
      const v = valorInst(M, lejos.id), nuevo = ((v + A) / (M.total + A)) * 100, n = S.inst[lejos.id].corto || S.inst[lejos.id].nombre;
      add('mes', { id: `aportd:${d}:${lejos.id}`, d, cuando: `antes del ${fechaCorta(d)}`, t: `Aportar los ${eur(A, 0)} de ${MES_LARGO[deIso(d).getMonth()]} a ${esc(n)}`,
        pq: `${de.obj != null && de.peso > de.obj ? `${esc(nombreInst(de.id))} se pasa de tu objetivo y a` : 'A'} ${esc(n)} le faltan ${fmtNum(lejos.obj - lejos.peso, 1)} puntos para el suyo. Con la aportación ahí te acercas sin vender nada.`,
        como: `En ${esc(a.plataforma || 'tu bróker')}, en Aportaciones periódicas, cambia el destino de la de ${MES_LARGO[deIso(d).getMonth()]} a ${esc(n)}; o déjala como está y haz una puntual de ${eur(A, 0)}.`,
        imp: 'Nada: aportar no tributa y no vendes nada.', ref: { tipo: 'aport', A, d, a, de, lejos, nuevo, v } });
    }
  }
  // Reinvertir lo cobrado: los dividendos del último mes que se han quedado en efectivo, a la aportación
  if (prox.length) {
    let da = null; try { da = dividendosAnio(M); } catch (e) {}
    const t = tramoAhorro(), de = da ? da.de.filter((x) => x.d >= sumarDias(hoy, -31)) : [], neto = sum(de, (x) => x.bruto) * (1 - t);
    if (neto >= 20) add('mes', { id: `reinv:${mesK}`, d: prox[0].d, cuando: `con la del ${fechaCorta(prox[0].d)}`, t: `Suma a tu aportación los ${eur(neto, 0)} cobrados`,
      pq: `${esc(yLista([...new Set(de.map((x) => x.n))]))} te ${de.length === 1 ? 'ha' : 'han'} pagado unos ${eur(neto, 0)} netos este mes. En efectivo no rinden: súmalos a la aportación.`,
      como: `Haz una aportación puntual de ${eur(neto, 0)} al mismo fondo, el día que entre la periódica.`, imp: 'Nada por reinvertirlos: los dividendos van en la renta los reinviertas o no, y la retención que ya te hicieron cuenta como pago a cuenta.', ref: { tipo: 'reinv', de, neto } });
  }
  // Aportación extra en las caídas: tu fondo principal, más abajo de su máximo que el umbral, con efectivo libre
  const nu = M.filas.filter((f) => f.inst.tipo === 'Fondo indexado' && f.inst.clase === 'Renta variable').sort((x, y) => y.valor - x.valor)[0];
  const efectivo = sum(S.cartera.efectivo || [], (x) => +x.importe || 0);
  if (nu && nu.p && nu.p.max52 > 0 && nu.precio) {
    const caida = (nu.precio / nu.p.max52 - 1) * 100, u = umbralCaida();
    if (caida <= -u && efectivo >= 100) {
      const extra = Math.min(efectivo, Math.max(c.total, 300));
      add('mes', { id: `caida:${mesK}:${u}`, cuando: 'esta semana', t: `Adelanta ${eur(extra, 0)} a ${esc(nu.inst.corto)}: está un ${fmtNum(-caida, 0)} % por debajo de su máximo`,
        pq: `Pusiste que en caídas de más del ${u} % adelantarías aportaciones. Tienes ${eur(efectivo, 0)} en efectivo.`, como: `En ${esc(nu.pos.plataforma || 'tu bróker')}, una aportación puntual de ${eur(extra, 0)} a ${esc(nu.inst.corto)}.`,
        imp: 'Nada: comprar no tributa.', ref: { tipo: 'caida', f: nu, caida, u, efectivo, extra } });
    }
  }
  // Efectivo parado: lo que tienes en la cuenta del bróker más allá de unos cientos de euros
  if (efectivo >= 1000) add('seis', { id: `efectivo:${mesK}`, cuando: 'sin prisa', t: `Tienes ${eur(efectivo, 0)} en efectivo sin invertir`,
    pq: 'Si no los vas a necesitar en unos meses, en un fondo monetario rinden más o menos lo que el tipo del BCE, y los sacas cuando quieras.', como: 'Mira si tu bróker remunera el efectivo; si no, un fondo monetario de bajo coste.', imp: 'Comprar un monetario no tributa; al venderlo, la ganancia sí.', ref: { tipo: 'efectivo', efectivo } });
  // Una noticia grave de algo que tienes: solo con dos medios distintos (la misma nota en tres cuenta como una)
  const vistos = new Set();
  for (const f of M.filas) {
    const sim = f.p && f.p.simbolo; if (!sim || vistos.has(sim)) continue; vistos.add(sim);
    const le = lecturaDe(sim); if (!le || (le.rel || 0) < 3 || le.imp !== 'negativo') continue;
    const medios = new Set((le.fuentes || []).map((x) => String(x.f || '').toLowerCase()).filter(Boolean));
    if (medios.size < 2 || !(Date.now() - new Date(le.d).getTime() <= 7 * 864e5)) continue;
    add('mes', { id: `tesis:${sim}:${String(le.d).slice(0, 10)}`, urgente: true, cuando: 'esta semana', t: `Mira si sigue en pie la razón por la que tienes ${esc(f.inst.corto)}`,
      pq: esc(le.txt || ''), como: `Abre su ficha y lee las noticias. Si la razón por la que la compraste se ha roto, véndela; si no, no hagas nada.`, acc: `<button class="enlace" data-pos="${esc(f.pos.id)}">Abrir su ficha</button>`, ref: { tipo: 'tesis', f, le, medios: medios.size } });
  }
  // Oportunidad tras una caída por una noticia (apagada por defecto; siempre como opción)
  if (opRuta('oport')) {
    const r = (radarVals() || []).filter((x) => x.m50 > 0 && x.p < x.m50 * 0.85 && /buy/.test(x.r || '') && (x.na || 0) >= 5).map((x) => ({ x, le: lecturaDe(x.s) })).filter(({ le }) => le && new Set((le.fuentes || []).map((q) => q.f)).size >= 2)[0];
    if (r) add('mes', { id: `oport:${r.x.s}:${mesK}`, cuando: 'sin prisa', opcion: true, t: `Opción: ${esc(nombreRadar(r.x))} tras su caída`,
      pq: `Cae un ${fmtNum((1 - r.x.p / r.x.m50) * 100, 0)} % por debajo de su media de 50 sesiones por ${esc(r.le.txt || 'una noticia')} ${r.x.na} analistas siguen a favor.`, como: 'Si entras, con poco y con regla de salida.', ref: { tipo: 'oport', top: r.x, le: r.le } });
  }
  // Cripto dentro de su banda (apagada por defecto): por debajo de tu mínimo, completar con la aportación
  const pf = S.cartera.perfil || {}, cmin = +pf.cripto_min;
  if (opRuta('cripto') && cmin > 0 && M.total && prox.length) {
    const pc = (sum(M.filas.filter((f) => f.inst.clase === 'Cripto'), (f) => f.valor) / M.total) * 100;
    if (pc < cmin - 1) add('mes', { id: `cripto:${mesK}`, cuando: `con la del ${fechaCorta(prox[0].d)}`, t: `Tu cripto está en el ${fmtNum(pc, 1)} %, por debajo de tu mínimo del ${fmtNum(cmin, 0)} %`,
      pq: `Para volver a tu banda harían falta unos ${eur(((cmin - pc) / 100) * M.total, 0)}.`, como: 'Una compra puntual en Bitvavo, o parte de la aportación del mes.', ref: { tipo: 'cripto', pc, cmin } });
  }
  // El mismo índice, más barato: un fondo con el mismo índice de referencia y menos comisión (el traspaso no tributa)
  const vistosF = new Set();
  for (const f of M.filas.filter((x) => /^Fondo/.test(x.inst.tipo || '') && x.inst.proxy && x.inst.ter != null)) {
    if (vistosF.has(f.inst.id)) continue; vistosF.add(f.inst.id);
    const otro = Object.values(S.inst || {}).filter((i) => i.id !== f.inst.id && i.proxy === f.inst.proxy && /^Fondo/.test(i.tipo || '') && i.ter != null && i.ter <= f.inst.ter - 0.08).sort((a, b) => a.ter - b.ter)[0];
    if (!otro) continue;
    const v = valorInst(M, f.inst.id), ahorro = (v * (f.inst.ter - otro.ter)) / 100;
    if (ahorro >= 10) add('seis', { id: `costes:${f.inst.id}:${otro.id}`, cuando: 'sin prisa', t: `${esc(otro.corto || otro.nombre)} sigue el mismo índice que ${esc(f.inst.corto)} y cuesta menos`,
      pq: `Un ${fmtNum(otro.ter, 2)} % al año frente a tu ${fmtNum(f.inst.ter, 2)} %: unos ${eur(ahorro, 0)} menos al año con lo que tienes.`, como: `Pide un traspaso de ${esc(f.inst.corto)} a ${esc(otro.corto || otro.nombre)} en tu bróker (si lo tiene).`, imp: 'Nada: el traspaso entre fondos no tributa.', ref: { tipo: 'costes', f, otro, ahorro } });
  }
}

/* ---------- los datos de cada paso ---------- */
// días hábiles entre una fecha y hoy, sin contar ninguna de las dos (precio del viernes, el domingo: 0)
function habilesDesde(s) {
  if (!s) return 99;
  const d = deIso(String(s).slice(0, 10)), h = deIso(hoyIso()); let n = 0;
  for (d.setDate(d.getDate() + 1); d < h && n < 99; d.setDate(d.getDate() + 1)) if (d.getDay() % 6) n++;
  return n;
}
const DIA_C = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
const diaCorto = (s) => { if (!s) return 'sin fecha'; const d = deIso(String(s).slice(0, 10)); return `${DIA_C[d.getDay()]} ${d.getDate()} ${MESES[d.getMonth()]}`; };
// el estado del precio de una posición: los fondos dan su valor un día después
function estadoPrecio(fecha, fondo) {
  if (sinRed()) return 'espera';
  const n = habilesDesde(fecha);
  return n >= (fondo ? 3 : 2) ? 'viejo' : 'ok';
}
const ppEsFondo = (i) => /^Fondo/.test((i && i.tipo) || '');
const datoPrecio = (f) => [`Precio de ${f.inst.corto}`, precioFmt(f.precio), `${ppEsFondo(f.inst) ? 'valor liquidativo' : 'cierre'} del ${diaCorto(f.p && f.p.fecha)}`, estadoPrecio(f.p && f.p.fecha, ppEsFondo(f.inst)), 'precio'];
const radarViejo = () => { const g = S.precios && S.precios.radar_generado; return !g || Date.now() - new Date(g).getTime() > 48 * 3600e3; };
// fiscalSinApuntar está en el núcleo (16b-paso-mes.js): la usan también el paso «Apunta tus datos fiscales» y la IA
// lo de Hacienda de una ganancia: si faltan tus datos fiscales, un rango (si ya pasaras de 6.000 € de ganancias, sube el tipo)
function impuestoRango(g, anio, inst) {
  const lo = Math.max(0, impuestoDeVenta(g, anio, inst).impuesto);
  if (!fiscalSinApuntar(anio) || g <= 0) return { lo, hi: lo };
  // lo de un ETC va con los rendimientos del capital, no con las ganancias (esRCMVenta)
  const r = esRCMVenta(inst), hi = Math.max(lo, fiscalAnio(anio, 6000 + (r ? 0 : g), r ? g : 0).cuota - fiscalAnio(anio, 6000).cuota);
  return { lo, hi: hi - lo >= 1 ? hi : lo };
}
// varias ventas a la vez: el impuesto de todas juntas (la escala sube por tramos: sumar el de cada una por separado se queda
// corto cuando entre todas cruzan un tramo). xs: [{ g, inst }]
function impuestoRangoJuntas(xs, anio) {
  const lo = Math.max(0, impuestoDeVentas(xs, anio).impuesto);
  if (!fiscalSinApuntar(anio)) return { lo, hi: lo };
  const r = sum(xs.filter((x) => esRCMVenta(x.inst)), (x) => x.g), g = sum(xs, (x) => x.g) - r;
  const hi = Math.max(lo, fiscalAnio(anio, 6000 + g, r).cuota - fiscalAnio(anio, 6000).cuota);
  return { lo, hi: hi - lo >= 1 ? hi : lo };
}
const CONF_DE = ['', 'baja', 'media', 'alta'];
// la regla, de código: el tipo de cada dato manda; un dato viejo o que falta, un escalón menos
function confDe(datos, contradice) {
  if (!datos || !datos.length) return null;
  let n = contradice || datos.some((d) => d[3] === 'flojo') ? 1 : datos.some((d) => ['analistas', 'prensa', 'radar', 'ia', 'fuera'].includes(d[4])) ? 2 : 3;
  // lo que falta de Hacienda no cambia el paso, solo su impuesto (que sale como un rango): no baja la confianza
  if (datos.some((d) => (d[3] === 'viejo' || d[3] === 'falta') && d[4] !== 'fiscal')) n = Math.max(1, n - 1);
  return CONF_DE[n];
}
const ppCuadra = (a, b, tol = 0.011) => Math.abs(a - b) <= tol;
// una comprobación que no cuadra aparta el paso entero
function ppComprobar(lista) {
  const mal = lista.find(([, ok]) => !ok);
  if (mal) { const e = new Error(mal[0]); e.compr = mal[0]; throw e; }
  return lista.map(([t]) => t);
}
const ppB = (n, de, a, marca, max, tono, v, m) => ({ n, de, a, marca, max, tono, v, m });

// la ficha de un paso: sus datos, sus cuentas, su confianza y su dibujo. Si una cuenta no cuadra, lanza
function fichaPaso(x, M) {
  const r = x.ref || {}, anio = new Date().getFullYear(), hoy = hoyIso(), sinF = fiscalSinApuntar(anio);
  const fiscalDato = () => (sinF ? [`Tus otras ventas de ${anio}`, 'sin apuntar', 'Hacienda · Datos fiscales · el impuesto sale como un rango', 'falta', 'fiscal'] : [`Escala del ahorro de ${anio}`, `${pctTramo(tramoAhorro())} % en tu tramo`, 'tus datos fiscales, apuntados', 'ok', 'fiscal']);
  const fechaOk = x.d ? [[`la fecha (${fechaCorta(x.d)}) no ha pasado`, x.d >= hoy]] : [];
  const o = { datos: null, compr: [], conf: null, porq: '', cambia: '', hist: 'Sin historial todavía: el registro de aciertos guarda cada mes lo que dijo.', vis: null, hc: null };
  if (/^venta:/.test(x.id) && r.pl) {
    const pl = r.pl, f = pl.f, a = (f.p && f.p.analistas) || {}, k = f.inst.clase === 'Cripto' ? 'cripto' : ['Oro', 'Materias primas'].includes(f.inst.clase) ? 'oro' : 'empresa';
    const pg0 = pesoLim(f, M) || f.peso, ud = pl.accion ? 'acción' : 'participación', medio = pl.fiscal.coste / pl.uds, rg = impuestoRango(pl.computa ?? pl.ganancia, anio, f.inst);
    o.datos = [datoPrecio(f), ['Tu coste', `${precioFmt(medio)} por ${ud}`, 'lo metiste tú', 'ok', 'tuyo']];
    if (a.objetivo) o.datos.push(['Precio objetivo medio', precioFmt(a.objetivo), `${a.num || 'varios'} analistas · Yahoo`, (a.num || 0) >= 3 ? 'ok' : 'flojo', 'analistas']);
    if (pl.nivel === 'reducir' || pg0 > limiteDe(k)) o.datos.push([`Tu límite por ${k === 'empresa' ? 'empresa' : k}`, `${fmtNum(limiteDe(k), 0)} % de la cartera`, 'Objetivos · lo pusiste tú', 'ok', 'tuyo']);
    if (+f.pos.stop) o.datos.push(['Tu precio de salida', precioFmt(+f.pos.stop), 'lo pusiste tú', 'ok', 'tuyo']);
    if (pl.ganancia > 0) o.datos.push(fiscalDato());
    const dias = habilesDesde(f.p && f.p.fecha);
    o.compr = ppComprobar([
      [`${fmtNum(pl.uds, pl.accion ? 0 : 4)} × ${precioFmt(f.precio)} = ${eur(pl.importe, 2)}`, ppCuadra(pl.uds * f.precio, pl.importe)],
      [`ganancia: ${eur(pl.neto, 2)} − ${eur(pl.fiscal.coste, 2)} = ${eurS(pl.ganancia, 2)}`, ppCuadra(pl.neto - pl.fiscal.coste, pl.ganancia)],
      ...(pl.ganancia > 0 ? [[`impuesto: ${eur(pl.impuesto, 2)} con tu escala del ahorro`, ppCuadra(Math.max(0, impuestoDeVenta(pl.computa ?? pl.ganancia, anio, f.inst).impuesto), pl.impuesto, 0.02)]] : []),
      [`no vendes más de las ${fmtNum(f.uds, pl.accion ? (esEntero(f.uds) ? 0 : 2) : 4)} que tienes`, pl.uds <= f.uds + 1e-9],
      ...(pl.accion ? [['acciones enteras', esEntero(pl.uds)]] : []),
      [dias <= 1 ? 'el precio es del último día de bolsa' : `el precio es de hace ${dias} días hábiles`, dias <= 5 || sinRed()],
    ]);
    o.conf = confDe(o.datos);
    o.porq = a.objetivo ? 'Las cuentas son exactas. Que le quede poco o mucho por subir es la opinión de los analistas, no un hecho.' : 'Son cuentas con tus datos y el precio.';
    const pg = pesoLim(f, M) || f.peso, tras = Math.max(0, pg - (pl.importe / M.total) * 100);
    // el dibujo: su peso antes y después, con tu límite (la raya) si lo pasa
    const lim = pg > limiteDe(k) ? limiteDe(k) : null;
    o.vis = [ppB(f.inst.corto, pg, tras, lim, Math.max(10, Math.ceil(pg * 1.25)), 'sale', `${fmtNum(pg, 1)} % → ${fmtNum(tras, 1)} %`, lim != null ? `límite ${fmtNum(lim, 0)} %` : '')];
    o.hc = pl.ganancia > 0 ? [rg.hi > rg.lo ? `${fmtNum(rg.lo, 0)} a ${eur(rg.hi, 0)} a Hacienda` : `${eur(pl.impuesto, 0)} a Hacienda`, ''] : pl.ganancia < 0 ? ['Pérdida: pagas menos', 'bien'] : ['Sin impuestos', 'ok'];
    o.rango = rg.hi > rg.lo ? rg : null;
    o.cambia = pl.nivel === 'reducir' || lim != null ? `Deja de salir si su peso baja del ${fmtNum(limiteDe(k), 0)} %${a.objetivo ? ' o si los analistas suben el objetivo más de un 15 % por encima del precio' : ''}.` : 'Deja de salir si cambia la señal de la posición (el precio, tu salida o lo que dicen los analistas).';
    o.flujo = { sale: [`Vendes ${f.inst.corto}`, pl.importe], hac: pl.ganancia > 0 ? pl.impuesto : 0, mover: pl.mover, g: pl.ganancia, inst: f.inst };
    o.inst = { s: f.inst.id, p: f.precio };
  } else if (r.tipo === 'aport') {
    const fl = M.filas.filter((f) => f.inst.id === r.lejos.id || f.inst.id === r.de.id);
    const est = fl.map((f) => estadoPrecio(f.p && f.p.fecha, true)).find((e) => e !== 'ok') || 'ok';
    const nomL = nombreInst(r.lejos.id), nomD = nombreInst(r.de.id), redondea = est === 'viejo';
    o.datos = [['Valor de tus fondos', `${esc(nomD)}, ${redondea ? 'unos ' : ''}${eur(valorInst(M, r.de.id), 0)} · ${esc(nomL)}, ${redondea ? 'unos ' : ''}${eur(r.v, 0)}`, `valor liquidativo del ${diaCorto(fl[0] && fl[0].p && fl[0].p.fecha)}${est === 'viejo' ? ` · hace ${habilesDesde(fl[0].p.fecha)} días hábiles` : ' (los fondos salen un día después)'}`, est, 'precio'],
      ['Tu reparto objetivo', `${r.de.obj != null ? `${esc(nomD)}, ${fmtNum(r.de.obj, 0)} % · ` : ''}${esc(nomL)}, ${fmtNum(r.lejos.obj, 0)} %`, 'Qué mira cada mes · lo pusiste tú', 'ok', 'tuyo'],
      ['Tu aportación', `${eur(r.A, 0)} el día ${r.a.dia || deIso(r.d).getDate()}`, `${esc(r.a.plataforma || 'tu bróker')} · periódica`, 'ok', 'tuyo']];
    const suma = sum(M.filas, (f) => f.valor) + (M.liquidez || 0);
    o.compr = ppComprobar([[`lo que tienes suma el total: ${eur(suma, 0)} de ${eur(M.total, 0)}`, Math.abs(suma - M.total) < 1], [`con ${eur(r.A, 0)} más: ${eur(r.v + r.A, 0)} de ${eur(M.total + r.A, 0)} = ${fmtNum(r.nuevo, 1)} %`, ppCuadra(((r.v + r.A) / (M.total + r.A)) * 100, r.nuevo, 0.01)], [`no pasa de tu objetivo del ${fmtNum(r.lejos.obj, 0)} %`, r.nuevo <= r.lejos.obj + 0.05], ['la aportación aún no ha salido', r.d >= hoy]]);
    o.conf = confDe(o.datos);
    o.porq = redondea ? 'Son solo cuentas, pero con el valor de tus fondos de hace unos días: los pesos pueden haberse movido unas décimas. El paso vale; la cifra exacta, no.' : 'Son solo cuentas con tus pesos y tu reparto objetivo.';
    const mx = Math.max(10, Math.ceil(Math.max(r.de.peso, r.lejos.obj, r.de.obj || 0) * 1.15 / 5) * 5);
    o.vis = [...(r.de.obj != null ? [ppB(nomD, r.de.peso, r.de.peso, r.de.obj, mx, r.de.peso > r.de.obj ? 'pasa' : 'queda', `${redondea ? 'en torno al ' : ''}${fmtNum(r.de.peso, 1)} %`, `objetivo ${fmtNum(r.de.obj, 0)} %`)] : []), ppB(nomL, r.lejos.peso, r.nuevo, r.lejos.obj, mx, 'entra', `${redondea ? 'cerca del ' : ''}${fmtNum(r.lejos.peso, 1)} % → ${fmtNum(r.nuevo, 1)} %`, `objetivo ${fmtNum(r.lejos.obj, 0)} %`)];
    o.hc = ['Sin impuestos', 'ok'];
    o.cambia = 'Deja de salir cuando ningún fondo se aleje más de 2 puntos de su objetivo.';
    o.hist = 'Sin historial: es una opción nueva.';
    o.flujo = { sale: ['Aportas', r.A], va: [['eur', `A ${nomL}`, r.A]] };
  } else if ((/^compra:/.test(x.id) || /^idea:/.test(x.id) || r.tipo === 'oport') && r.top) {
    const t = r.top, z = t.z === 'España', le = lecturaDe(t.s), medios = new Set(((le && le.fuentes) || []).map((q) => q.f)).size;
    const vsM50 = t.m50 > 0 ? (t.p / t.m50 - 1) * 100 : null, vsMx = t.mx > 0 ? (t.p / t.mx - 1) * 100 : null;
    // las primeras del radar, las mismas que ya ha calculado el plan de venta (o el paso de la idea): sin volver a puntuar
    const top9 = (mejoresIdeas(M, r.pl ? { sector: (r.pl.f.p || {}).sector } : {}) || []).slice(0, 9), tema = top9.filter((y) => y.ind && y.ind === t.ind).length;
    const cayo = (vsM50 != null && vsM50 < -15) || (vsMx != null && vsMx < -50);
    const objViejo = cayo && (t.pot || 0) > 40;
    o.datos = [['Recorrido hasta el objetivo', pctS(t.pot, 0), `${t.na || 'varios'} analistas${objViejo ? ' · objetivos de antes de la caída' : ''}`, objViejo ? 'viejo' : 'ok', 'analistas'],
      ['Tendencia', [vsM50 != null ? `${pctS(vsM50, 0)} frente a su media de 50 sesiones` : '', vsMx != null ? `${pctS(vsMx, 0)} desde su máximo` : ''].filter(Boolean).join(' · ') || 'sin datos', `precios de Yahoo · cierre del ${diaCorto(t.f)}`, estadoPrecio(t.f), 'precio'],
      ['Prensa', le ? `${medios} ${medios === 1 ? 'medio' : 'medios'}` : 'sin titulares leídos', z ? 'Yahoo y prensa en español' : 'Yahoo · de esta empresa no se lee prensa en español', le && medios >= 2 && z ? 'ok' : 'flojo', 'prensa'],
      ['El radar', tema >= 5 ? `${tema} de sus 9 primeras son el mismo tema` : `${(radarVals() || []).length} empresas`, radarViejo() ? `radar del ${diaCorto(S.precios.radar_generado)} · hoy no ha podido repasar` : 'radar de hoy', radarViejo() ? 'viejo' : tema >= 5 ? 'flojo' : 'ok', 'radar']];
    const imp = r.pl ? r.pl.aIdea : null;
    o.compr = ppComprobar([...(r.pl ? [[`el importe sale de lo que queda tras apartar Hacienda: ${eur(r.pl.mover, 0)}`, imp <= r.pl.mover + 0.01]] : []), ['ninguna salida pasa de tu límite de acciones sueltas', true]]);
    o.conf = confDe(o.datos, cayo);
    o.porq = cayo ? `Cotiza ${vsM50 != null ? `un ${fmtNum(-vsM50, 0)} % por debajo de su media de 50 sesiones` : ''}${vsMx != null ? ` y un ${fmtNum(-vsMx, 0)} % por debajo de su máximo` : ''}: los objetivos de los analistas pueden no haberse puesto al día.` : `La mejor contrastada del radar: ${t.ctr ? `${t.ctr.favor} de ${t.ctr.total}` : 'varias'} señales a favor.`;
    o.pist = [[t.ctr ? `${t.ctr.favor} de ${t.ctr.total} señales a favor` : 'del radar', ''], ...(vsM50 != null && vsM50 < -10 ? [[`${pctS(vsM50, 0)} frente a su media de 50 sesiones`, 'mal']] : []), ...(vsMx != null && vsMx < -30 ? [[`${pctS(vsMx, 0)} desde su máximo`, 'mal']] : []), ...(objViejo ? [['objetivos de analistas sin tocar', 'mal']] : [])];
    o.cambia = 'Sube de confianza cuando los analistas actualicen sus objetivos o el precio vuelva por encima de su media de 50 sesiones.';
    o.hist = 'Ideas del radar: el registro de aciertos empezó el 7 nov; se podrá leer en febrero.';
    o.inst = { s: t.s, p: t.p, radar: true };
  } else if (/^perdida:/.test(x.id) && r.f) {
    const f = r.f, cuota = fiscalAnio(anio, r.ganPrevG, r.ganPrevR).cuota;
    // la regla de recompra es la de cada cosa (reglaRecompra: dos meses lo que cotiza en la UE y los ETC, un año los fondos y
    // lo de fuera, ninguna la cripto; antes, dos meses para todo). Este paso vende la posición entera, así que sus propias
    // compras no aplazan nada (se aplaza solo lo recomprado que sigue en tu cartera: perdidaAplazada, 22-impuestos.js). Lo
    // que sí la aplaza: tener lo mismo en otra posición comprada en ese plazo (otro bróker), o recomprar después. Lo que
    // tiene una aportación periódica activa ni llega aquí: restoEnPerdidas no lo propone (revisión del 15 nov)
    const rr = reglaRecompra(f.inst) || {}, mesesR = rr.meses || 0, desdeR = mesesR ? sumarMeses(hoy, -mesesR) : null;
    const otras = !mesesR ? [] : (S.cartera.posiciones || []).filter((p) => p.instrumento === f.inst.id && p.id !== f.pos.id).flatMap((p) => { try { return lotesDe(p); } catch (e) { return []; } }).filter((l) => l.f >= desdeR).sort((a, b) => (a.f < b.f ? 1 : -1));
    const plazoR = mesesR === 12 ? 'un año' : 'dos meses';
    const datoRecompra = !mesesR ? ['Regla de recompra', 'en cripto no se aplica la de los dos meses', 'consultas de Hacienda · hay quien defiende la de un año', 'ok', 'tuyo']
      : otras.length ? [`Regla de recompra: ${plazoR}`, `tienes ${esc(f.inst.corto)} también en otra posición, comprada el ${fechaCorta(otras[0].f)}: esa parte de la pérdida se aplaza`, 'tus posiciones', 'flojo', 'tuyo']
        : [`Regla de recompra: ${plazoR}`, `vendes todo lo que tienes de ${esc(f.inst.corto)}: cuenta entera si no vuelves a comprarlo en ${plazoR}`, 'tus posiciones', 'ok', 'tuyo'];
    o.datos = [datoPrecio(f), ['Tu coste', `${eur(f.coste, 2)} · ${fmtNum(f.uds, f.inst.tipo === 'Acción' ? 2 : 4)} ${f.inst.tipo === 'Acción' ? 'acciones' : 'unidades'}`, 'lo metiste tú', 'ok', 'tuyo'],
      ['Lo que ya llevas este año', r.ganPrevG > 0 ? `${eur(r.ganPrevG, 0)} de ganancia prevista` : 'sin ventas previstas', 'tus ventas y el Paso a paso', 'ok', 'tuyo'], fiscalDato(),
      datoRecompra];
    o.compr = ppComprobar([[`ahorro: ${eur(r.ahorro, 2)} menos en la renta de ${anio}`, r.ahorro > 0 && r.ahorro <= -r.x.g + 0.01], ['la pérdida es de lo que tienes ahora', r.x.g < 0], ...fechaOk]);
    o.conf = confDe(o.datos);
    o.porq = 'Son cuentas con tu coste, el precio y la escala del ahorro. Que te convenga seguir sin ella lo decides tú.';
    // 16 nov: sin la barra (no se entendía qué era cada cifra): la frase entera, y lo que te ahorras en la etiqueta
    o.res = L(`Renta de ${anio}: pagarías ${eur(Math.max(0, cuota - r.ahorro), 0)} en vez de ${eur(cuota, 0)}`, `${anio} tax return: you'd pay ${eur(Math.max(0, cuota - r.ahorro), 0)} instead of ${eur(cuota, 0)}`);
    // lo que te ahorras ya va en el molde («Después») y en esta frase: sin etiqueta aparte
    // si contestas que sí, pasa a «Haz esto» y entra en lo que se mueve el mes (y en su Hacienda, con la pérdida restando)
    o.flujo = { sale: [L(`Vendes ${f.inst.corto}`, `You sell ${f.inst.corto}`), x.valor || 0], g: r.x.g, inst: f.inst, va: [['libre', L(`En efectivo, de ${f.inst.corto}`, `In cash, from ${f.inst.corto}`), x.valor || 0]] };
    o.cambia = 'Deja de salir si vuelve a estar en ganancias o si pasa el 31 de diciembre.';
  } else if (/^stop:/.test(x.id) && r.f) {
    o.datos = [datoPrecio(r.f), ['Tu precio de salida', precioFmt(+r.f.pos.stop), 'lo pusiste tú', 'ok', 'tuyo']];
    o.compr = ppComprobar([['el precio está por encima de tu salida', r.f.precio > +r.f.pos.stop]]);
    o.conf = confDe(o.datos); o.porq = 'Son tu regla y el precio.'; o.cambia = 'Deja de salir si se aleja más de un 6 % de tu salida.';
  } else if (x.fuente === 'ia') {
    const ia = iaActual(), dIA = ia && ia.fecha ? String(ia.fecha).slice(0, 10) : null, viejo = !dIA || diasEntre(dIA, hoy) > 2;
    o.datos = [['Lo propone la IA', esc(x.autor || 'La IA'), dIA ? `su repaso del ${diaCorto(dIA)}` : 'sin fecha', viejo ? 'viejo' : 'ok', 'ia']];
    o.compr = ppComprobar(fechaOk); o.conf = confDe(o.datos);
    o.porq = 'Lo propone la IA tras leer las noticias: es su lectura, no una cuenta.'; o.cambia = 'Cambia con cada repaso de la IA.';
  } else if (/^(fiscal|exactas|perfil|deuda):/.test(x.id)) {
    // completar datos: sin confianza (no es una decisión)
    o.compr = ppComprobar(fechaOk);
  } else {
    // lo que sale de tus números (colchón, núcleo, límites, metas, aportaciones…)
    const fr = r.f || (r.pl && r.pl.f);
    o.datos = [...(fr ? [datoPrecio(fr)] : []), ['Tus posiciones y tus objetivos', 'lo que tienes apuntado', 'Toisón', 'ok', 'tuyo'], ...(r.tipo === 'reinv' ? [['Lo cobrado', `unos ${eur(r.neto, 0)} netos`, 'estimado por lo que pagó cada acción; el dato bueno es el informe del bróker', 'ok', 'fuera']] : [])];
    o.compr = ppComprobar([...fechaOk, ...(r.tipo === 'caida' ? [[`${eur(r.extra, 0)} no pasa de tu efectivo (${eur(r.efectivo, 0)})`, r.extra <= r.efectivo + 0.01]] : [])]);
    o.conf = confDe(o.datos);
    o.porq = 'Son cuentas con tus datos.';
    if (/^colchonv:/.test(x.id) && r.pl) o.flujo = { va: [['col', 'A tu colchón', r.pl.aColchon]] };
    if (/^nucleo:/.test(x.id) && r.pl) o.flujo = { va: [['eur', `A ${nucleo(M).n}`, r.pl.aNucleo]] };
    if (r.tipo === 'caida') o.flujo = { sale: ['Adelantas', r.extra], va: [['eur', `A ${r.f.inst.corto}`, r.extra]] };
  }
  if (/^compra:/.test(x.id) && r.pl) o.flujo = { va: [['idea', `A ${nombreRadar(r.top)}`, r.pl.aIdea]] };
  return o;
}

/* 16 nov · el molde de cada tarjeta: dónde, cuándo (un día concreto) y qué pasa después; el «qué hago» es el título.
   Lo que el paso no trae no sale (una fila de menos antes que una fila que no dice nada) */
const ppLab = (s) => { let d = s; while (deIso(d).getDay() % 6 === 0) d = sumarDias(d, 1); return d; };
// hoy, si hay bolsa; si no, el próximo día que la haya
function ppHoyBolsa(inst) {
  const h = hoyIso(), cripto = inst && inst.clase === 'Cripto' && !esRCMVenta(inst);
  if (cripto) return L(`Hoy, <b>${diaSemCorto(h)}</b>, a cualquier hora`, `Today, <b>${diaSemCorto(h)}</b>, any time`);
  const l = ppLab(h), hor = inst && !ppEsFondo(inst) ? `, ${horarioBolsa(inst)}` : '';
  return l === h ? L(`Hoy, <b>${diaSemCorto(h)}</b>${hor}`, `Today, <b>${diaSemCorto(h)}</b>${hor}`) : L(`El <b>${diaSemCorto(l)}</b>, el próximo día de bolsa${hor}`, `On <b>${diaSemCorto(l)}</b>, the next trading day${hor}`);
}
// la venta en pasos numerados: dónde, cuántas y con qué orden (la del plan de venta), y qué hacer con lo que cobres
function ppPasosVenta(pl, M) {
  const f = pl.f, i = f.inst, nom = esc(i.corto), bro = esc(f.pos.plataforma || L('tu bróker', 'your broker'));
  const n = oc(fmtNum(pl.uds, esEntero(pl.uds) ? 0 : i.clase === 'Cripto' ? 4 : 2)), ud = pl.accion ? L('acciones', 'shares') : i.clase === 'Cripto' || i.tipo === 'ETC' ? L('unidades', 'units') : L('participaciones', 'units');
  const orden = esc(pl.cuando[0].replace(/^(Ya|Now): /, '').replace(/^./, (c) => c.toUpperCase()));
  const dest = [pl.aColchon > 0.5 ? L(`${eur(pl.aColchon, 0)} a tu colchón`, `${eur(pl.aColchon, 0)} to your cushion`) : '', pl.aIdea > 0 && pl.ideas[0] ? `${eur(pl.aIdea, 0)} a ${esc(nombreRadar(pl.ideas[0]))}` : '', pl.aNucleo > 0.5 ? `${eur(pl.aNucleo, 0)} ${esc(nucleo(M).a)}` : ''].filter(Boolean);
  return [
    ppEsFondo(i) ? L(`En ${bro}, abre ${nom} y pide un reembolso.`, `In ${bro}, open ${nom} and ask for a redemption.`) : L(`Abre ${bro}, busca ${nom}${i.isin ? ` (ISIN ${esc(i.isin)})` : ''} y pulsa Vender.`, `Open ${bro}, search for ${nom}${i.isin ? ` (ISIN ${esc(i.isin)})` : ''} and tap Sell.`),
    `<b>${n} ${ud}</b>. ${orden}`,
    ...(pl.ganancia > 0 ? [L(`Deja <b>${eur(pl.impuesto, 0)}</b> en efectivo para la renta de ${new Date().getFullYear()}: se paga entre abril y junio.`, `Keep <b>${eur(pl.impuesto, 0)}</b> in cash for your ${new Date().getFullYear()} tax return: it's paid between April and June.`)] : []),
    dest.length ? L(`Con lo demás: ${yLista(dest)}. Lo tienes en los pasos siguientes.`, `With the rest: ${yLista(dest)}. It's in the next steps.`) : L('Lo demás, déjalo en efectivo hasta decidir.', 'Leave the rest in cash until you decide.'),
  ];
}
const ppComoTarde = (d) => L(`Como tarde el <b>${diaSemCorto(d)}</b>`, `By <b>${diaSemCorto(d)}</b> at the latest`);
// participaciones aproximadas de un fondo por un importe (se compran al valor liquidativo del día siguiente)
const ppPartic = (f, importe) => (f && f.precio > 0 && importe > 0 ? L(`unas ${fmtNum(importe / f.precio, 2)} participaciones a ${precioFmt(f.precio)}`, `about ${fmtNum(importe / f.precio, 2)} units at ${precioFmt(f.precio)}`) : '');
const ppNucleoF = (M) => M.filas.filter((f) => f.inst.tipo === 'Fondo indexado' && f.inst.clase === 'Renta variable').sort((a, b) => b.valor - a.valor)[0];
function moldeDe(x, M) {
  const m = moldeDe0(x, M), c = cuantoDe(x, M);
  return c ? { ...(m || {}), cuanto: c } : m;
}
// 16 nov (Carlos: «que me pusieras cuánto vender y cuánto comprar»): la cantidad, en unidades y en euros
function cuantoDe(x, M) {
  const r = x.ref || {}, id = x.id;
  const uds = (n, i) => oc(fmtNum(n, esEntero(n) ? 0 : i.clase === 'Cripto' ? 4 : 2));
  const udN = (i) => (i.tipo === 'Acción' ? L('acciones', 'shares') : ppEsFondo(i) ? L('participaciones', 'units') : L('unidades', 'units'));
  if (/^venta:/.test(id) && r.pl) { const pl = r.pl, f = pl.f; return L(`<b>${uds(pl.uds, f.inst)} ${udN(f.inst)}</b> de tus ${uds(f.uds, f.inst)} · unos ${eur(pl.importe, 0)} a ${precioFmt(f.precio)}`, `<b>${uds(pl.uds, f.inst)} ${udN(f.inst)}</b> of your ${uds(f.uds, f.inst)} · about ${eur(pl.importe, 0)} at ${precioFmt(f.precio)}`); }
  if (/^perdida:/.test(id) && r.f) { const f = r.f; return L(`<b>${uds(x.uds, f.inst)} ${udN(f.inst)}</b>${r.x && r.x.resto ? '' : ' (todas)'} · unos ${eur(x.valor, 0)} a ${precioFmt(f.precio)}`, `<b>${uds(x.uds, f.inst)} ${udN(f.inst)}</b>${r.x && r.x.resto ? '' : ' (all)'} · about ${eur(x.valor, 0)} at ${precioFmt(f.precio)}`); }
  if (/^compra:/.test(id) && r.pl && r.top) { const n = accionesRadar(r.top, r.pl.aIdea); return `<b>${eur(r.pl.aIdea, 0)}</b>${n ? ` · ${n} ${L('a', 'at')} ${precioR(r.top.p, r.top.m)}` : ''}`; }
  if (/^nucleo:/.test(id) && r.pl) { const p = ppPartic(ppNucleoF(M), r.pl.aNucleo); return `<b>${eur(r.pl.aNucleo, 0)}</b>${p ? ` · ${p}` : ''}`; }
  if (/^colchonv:/.test(id) && r.pl) return `<b>${eur(r.pl.aColchon, 0)}</b>`;
  if (/^libres:/.test(id) && r.pl) return L(`<b>${eur(x.libre, 0)}</b>, por decidir abajo`, `<b>${eur(x.libre, 0)}</b>, to decide below`);
  if (r.tipo === 'aport') { const p = ppPartic(M.filas.find((f) => f.inst.id === r.lejos.id), r.A); return `<b>${eur(r.A, 0)}</b>${p ? ` · ${p}` : ''}`; }
  if (r.tipo === 'caida') { const p = ppPartic(r.f, r.extra); return `<b>${eur(r.extra, 0)}</b>${p ? ` · ${p}` : ''}`; }
  if (r.tipo === 'reinv') return `<b>${eur(r.neto, 0)}</b>`;
  if (/^stop:/.test(id) && r.f) return L(`<b>${uds(r.f.uds, r.f.inst)} ${udN(r.f.inst)}</b> (toda la posición)`, `<b>${uds(r.f.uds, r.f.inst)} ${udN(r.f.inst)}</b> (the whole holding)`);
  return '';
}
function moldeDe0(x, M) {
  const r = x.ref || {}, id = x.id, anio = new Date().getFullYear(), hoy = hoyIso();
  const bro = (f) => esc((f && f.pos && f.pos.plataforma) || L('Tu bróker', 'Your broker'));
  if (/^perdida:/.test(id)) return { donde: x.donde, cuando: L(`Cuando quieras hasta el <b>${diaSemCorto(x.lim)}</b>`, `Any time until <b>${diaSemCorto(x.lim)}</b>`), despues: x.recompra ? L(`${eur(r.ahorro, 0)} menos en la renta; recompras desde el ${fechaLarga(x.recompra)}`, `${eur(r.ahorro, 0)} less tax; you can buy back from ${fechaCortaL(x.recompra)} ${x.recompra.slice(0, 4)}`) : L(`${eur(r.ahorro, 0)} menos en la renta`, `${eur(r.ahorro, 0)} less tax`) };
  if (/^venta:/.test(id) && r.pl) {
    const pl = r.pl, f = pl.f, res = x.d && x.d > hoy ? x.d : null;
    // a dónde va lo demás lo dicen los pasos que cuelgan de esta venta (si la compra es poco fiable, pasa a ser una opción)
    const resto = pl.mover > 0.5 ? L(`los ${eur(pl.mover, 0)} que quedan, en los pasos siguientes`, `the remaining ${eur(pl.mover, 0)}, in the next steps`) : L('lo demás se queda en efectivo', 'the rest stays in cash');
    const hac = pl.ganancia > 0 ? (x.rango ? L(`Entre ${eur(x.rango.lo, 0)} y ${eur(x.rango.hi, 0)} para la renta de ${anio}`, `Between ${eur(x.rango.lo, 0)} and ${eur(x.rango.hi, 0)} for your ${anio} tax return`) : L(`Unos ${eur(pl.impuesto, 0)} para la renta de ${anio}`, `About ${eur(pl.impuesto, 0)} for your ${anio} tax return`)) : pl.ganancia < 0 ? L('Pérdida: pagas menos en la renta', 'A loss: you pay less tax') : L('Sin impuestos', 'No tax');
    return { donde: bro(f), cuando: res ? L(`Como tarde el <b>${diaSemCorto(res)}</b>, antes de sus resultados`, `By <b>${diaSemCorto(res)}</b>, before its results`) : L(`Pon la orden: ${ppHoyBolsa(f.inst).replace(/^./, (c) => c.toLowerCase())}`, `Place the order: ${ppHoyBolsa(f.inst).replace(/^./, (c) => c.toLowerCase())}`), despues: `${hac}; ${resto}` };
  }
  if (/^colchonv:/.test(id) && r.pl) { const falta = faltaColchon(M) - r.pl.aColchon; return { donde: L(`Efectivo remunerado de ${bro(r.pl.f)} o un fondo monetario`, `Interest-bearing cash at ${bro(r.pl.f)} or a money market fund`), cuando: L(`En cuanto se venda ${esc(r.pl.f.inst.corto)}`, `As soon as ${esc(r.pl.f.inst.corto)} is sold`), despues: falta > 1 ? L(`Te faltarán ${eur(falta, 0)} para tu colchón`, `You'll still need ${eur(falta, 0)} for your cushion`) : L('Tu colchón queda completo', 'Your cushion is complete') }; }
  if (/^compra:/.test(id) && r.pl && r.top) return { donde: bro(r.pl.f), cuando: L(`En cuanto se venda ${esc(r.pl.f.inst.corto)}, con la bolsa abierta`, `As soon as ${esc(r.pl.f.inst.corto)} is sold, while the market is open`), despues: L(`Tienes ${esc(nombreRadar(r.top))}: pon su precio de salida en su ficha`, `You own ${esc(nombreRadar(r.top))}: set its exit price on its page`) };
  if (/^nucleo:/.test(id) && r.pl) { const nf = M.filas.filter((f) => f.inst.tipo === 'Fondo indexado' && f.inst.clase === 'Renta variable').sort((a, b) => b.valor - a.valor)[0]; return { donde: nf ? bro(nf) : L('Tu bróker', 'Your broker'), cuando: L(`En cuanto cobres la venta de ${esc(r.pl.f.inst.corto)} (uno o dos días)`, `As soon as the ${esc(r.pl.f.inst.corto)} sale settles (one or two days)`), despues: L('Sin impuestos: en un fondo no pagas nada hasta que vendas', 'No tax: in a fund you pay nothing until you sell') }; }
  if (r.tipo === 'aport') return { donde: L(`${esc(r.a.plataforma || 'Tu bróker')}, en Aportaciones periódicas`, `${esc(r.a.plataforma || 'Your broker')}, in Recurring contributions`), cuando: ppComoTarde(sumarDias(r.d, -1)), despues: L(`${esc(nombreInst(r.lejos.id))} pasa del ${fmtNum(r.lejos.peso, 1)} % al ${fmtNum(r.nuevo, 1)} % (tu objetivo, ${fmtNum(r.lejos.obj, 0)} %); sin impuestos`, `${esc(nombreInst(r.lejos.id))} goes from ${fmtNum(r.lejos.peso, 1)} % to ${fmtNum(r.nuevo, 1)} % (your target, ${fmtNum(r.lejos.obj, 0)} %); no tax`) };
  if (r.tipo === 'reinv') return { donde: L('Donde haces la aportación', 'Where you make the contribution'), cuando: L(`El <b>${diaSemCorto(x.d)}</b>, con la aportación`, `On <b>${diaSemCorto(x.d)}</b>, with the contribution`), despues: L('Sin impuestos por reinvertirlos', 'No tax for reinvesting them') };
  if (r.tipo === 'caida') { const vie = (() => { let d = hoy; while (deIso(d).getDay() !== 5) d = sumarDias(d, 1); return d; })(); return { donde: bro(r.f), cuando: ppComoTarde(vie), despues: L(`Te quedan ${eur(Math.max(0, r.efectivo - r.extra), 0)} en efectivo; sin impuestos`, `${eur(Math.max(0, r.efectivo - r.extra), 0)} left in cash; no tax`) }; }
  if (r.tipo === 'tesis') return { donde: L(`La ficha de ${esc(r.f.inst.corto)}, en Toisón`, `The ${esc(r.f.inst.corto)} page, in Toisón`), cuando: ppHoyBolsa(), despues: L('Si su razón sigue en pie, nada; si se ha roto, venderla', 'If the reason still holds, nothing; if it broke, sell it') };
  if (/^stop:/.test(id) && r.f) return { donde: bro(r.f), cuando: L('Hoy, si no la tienes ya', "Today, if you don't have it yet"), despues: L(`Si baja a ${precioFmt(+r.f.pos.stop)}, se vende sola`, `If it drops to ${precioFmt(+r.f.pos.stop)}, it sells by itself`) };
  if (/^fiscal:/.test(id)) return { donde: L('Toisón, en Análisis › Hacienda › Datos fiscales', 'Toisón, in Analysis › Tax › Tax data'), cuando: L('Hoy: son dos minutos', 'Today: it takes two minutes'), despues: L('El impuesto de cada paso sale exacto, sin rangos', "Each step's tax comes out exact, without ranges") };
  if (/^exactas:/.test(id)) return { donde: L('La app de tu bróker y la ficha de cada posición', "Your broker's app and each holding's page"), cuando: L('Hoy: son dos minutos', 'Today: it takes two minutes'), despues: L('El valor, la ganancia y los impuestos cuadran al céntimo', 'Value, gain and tax match to the cent') };
  if (/^perfil:/.test(id)) return { donde: L('Toisón, en Tú › Objetivos', 'Toisón, in You › Goals'), cuando: L('Hoy: es un minuto', 'Today: it takes a minute'), despues: L('Los pasos, las ideas y la IA se ajustan a ti', 'The steps, the ideas and the AI adapt to you') };
  if (/^libres:/.test(id) && r.pl) return { donde: bro(r.pl.f), cuando: L(`En cuanto se venda ${esc(r.pl.f.inst.corto)}`, `As soon as ${esc(r.pl.f.inst.corto)} is sold`), despues: L('Elige una de las tres salidas de abajo', 'Pick one of the three options below') };
  // el resto (la IA, tu perfil, las metas…): el día si lo hay
  const cuando = x.d && x.d >= hoy ? ppComoTarde(x.d) : x.cuando ? esc(String(x.cuando).replace(/^./, (c) => c.toUpperCase())) : '';
  return cuando ? { cuando } : null;
}
function mesRuta0(M) {
  const P = pasosRuta(M), hoy = hoyIso(), mesK = hoy.slice(0, 7), r = (S.cartera && S.cartera.ruta) || {}, pos = r.pospuestos || {};
  const R = { hacer: [], decidir: [], descartados: [], apartados: [], fechas: [], solos: [], espera: P.mes.find((x) => x.espera) || null, flujo: { sale: [], va: [] }, hac: 0, hacHi: 0, avisos: [], datosN: 0, P };
  // lo de antes del 31 dic que va con fecha («Opción: vender … con pérdidas»), al mes cuando quedan menos de dos meses
  const fin = `${hoy.slice(0, 4)}-12-31`, deSeis = diasEntre(hoy, fin) <= 62 ? P.seis.filter((x) => /^perdida:/.test(x.id)) : [];
  const lista = [...P.mes.filter((x) => !x.espera), ...deSeis];
  let libres = null;
  for (let x of lista) {
    if (pos[x.id] && pos[x.id] > mesK) continue;
    const cl = claseRuta(x);
    if (cl === 'fecha') { R.fechas.push(x); continue; }
    if (cl === 'solo') { R.solos.push(x); continue; }
    let fi;
    try { fi = fichaPaso(x, M); } catch (e) { R.apartados.push({ x, por: e.compr || String(e.message || e) }); continue; }
    x = { ...x, ...fi };
    x.molde = moldeDe(x, M);
    if (/^venta:/.test(x.id) && x.ref && x.ref.pl) x.pasos = ppPasosVenta(x.ref.pl, M);
    R.datosN += (fi.datos || []).length;
    const opcion = x.opcion || /^(perdida|oport):/.test(x.id) || /^Opción/.test(String(x.t));
    if (x.conf === 'baja' && /^compra:/.test(x.id) && x.ref && x.ref.pl) {
      // la compra de confianza baja no dice «compra»: lo que queda libre de la venta, con tres salidas
      const pl = x.ref.pl, libre = pl.aIdea + pl.aNucleo, nu = nucleo(M), ni = nombreRadar(x.ref.top);
      libres = x = Object.assign(x, { id: `libres:${pl.f.pos.id}:${mesK}`, decidirDe: x.id, grupo: 'decidir', libre, t: `Qué hacer con los ${eur(libre, 0)} libres de ${esc(pl.f.inst.corto)}`,
        res: `3 salidas: ${nu.n}, la mitad a ${esc(ni)} o esperar`,
        salidas: (() => { const nf = ppNucleoF(M), pA = ppPartic(nf, libre), nM = accionesRadar(x.ref.top, libre / 2); return [[`A ${esc(nu.n)}`, `${eur(libre, 0)}${pA ? ` (${pA})` : ''} · lo seguro, sin pagar nada al entrar`], [`La mitad a ${esc(ni)}, con regla de salida`, `${eur(libre / 2, 0)}${nM ? ` (${nM})` : ''} · sales si cae un 15 % desde tu compra`], ['Esperar', 'se queda en efectivo y se vuelve a mirar el mes que viene']]; })(),
        pq: `La primera del radar es ${esc(ni)}, pero su señal no es fiable ahora. ${x.porq}`, flujo: { va: [['libre', 'Libres, por decidir', libre]] } });
      x.hecho = !!(r.hechos || {})[x.id]; x.hechoK = x.hecho ? x.id : null;
      x.molde = moldeDe(x, M);
      R.decidir.push(x); continue;
    }
    x.grupo = x.conf === 'baja' || opcion ? 'decidir' : 'hacer';
    // 16 nov: lo que contestas a «¿Lo hago o no?»: sí, pasa a «Haz esto» (y cuenta como pendiente); no, se aparta
    const dec = x.grupo === 'decidir' && (r.decide || {})[x.id];
    if (dec && dec.v === 'no') { R.descartados.push(x); continue; }
    if (dec && dec.v === 'si') { x.grupo = 'hacer'; x.decidido = true; }
    R[x.grupo].push(x);
  }
  // con las salidas, el paso de meterlo en el fondo sobra (es una de ellas)
  if (libres) { const k = `nucleo:${libres.ref.pl.f.pos.id}:`; R.hacer = R.hacer.filter((x) => !x.id.startsWith(k)); }
  // lo que se mueve este mes: de dónde sale y a dónde va
  const ventas = []; let sueltas = 0;
  for (const x of [...R.hacer, ...R.decidir]) {
    const fl = x.flujo; if (!fl || (x.grupo === 'decidir' && !x.libre)) continue;
    if (fl.sale) R.flujo.sale.push(fl.sale);
    if (fl.g != null) { ventas.push({ g: fl.g, inst: fl.inst }); sueltas += fl.hac || 0; }
    for (const q of fl.va || []) R.flujo.va.push(q);
  }
  // Hacienda del mes: el impuesto de las ventas del mes juntas (con una pérdida entre ellas, lo que de verdad pagas)
  // cada paso da su impuesto como si fuera la única venta: cuando juntas no suman lo mismo, el mes lo dice (hacJuntas)
  if (ventas.length) { const rj = impuestoRangoJuntas(ventas, new Date().getFullYear()); R.hac = rj.lo; R.hacHi = rj.hi; R.hacJuntas = ventas.length > 1 && Math.abs(rj.lo - sueltas) >= 1; }
  if (R.hac > 0.5) R.flujo.va.unshift(['hac', 'Hacienda', R.hac]);
  // los avisos de arriba: sin conexión, la IA y el radar sin repasar, un dato viejo, un dato tuyo que falta
  const todos = [...R.hacer, ...R.decidir], datos = todos.flatMap((x) => x.datos || []);
  if (sinRed()) R.avisos.push('sinred');
  if (radarViejo() && (todos.some((x) => (x.datos || []).some((d) => d[4] === 'radar')) || (iaActual() && diasEntre(String(iaActual().fecha || hoy).slice(0, 10), hoy) > 2))) R.avisos.push('iacaida');
  if (datos.some((d) => d[3] === 'viejo' && d[4] === 'precio')) R.avisos.push('viejo');
  if (datos.some((d) => d[3] === 'falta')) R.avisos.push('faltadato');
  return R;
}
window.PASO_MES = mesRuta0;
window.PASO_OPC = pasosOpciones;

/* ---------- la página ---------- */
// su CSS va aquí, en el trozo (lo que necesita el núcleo, el botón y el medidor, en 36-paso.css). Fuente legible: el
// historial de 36-paso.css en git (15 nov)
const PP_CSS = `.pp .pp-cab{display: flex;justify-content: space-between;align-items: flex-end;gap: 16px}.pp .pp-cab p{max-width: 62ch}.pp .pp-b-opc{flex: none;margin-bottom: 14px}.pp .pp-b-opc svg{width: 17px;height: 17px}.pp .ruta-barra-top{margin-bottom: 18px}.pp-aviso{display: flex;gap: 12px;align-items: flex-start;padding: 14px 16px;border-radius: 14px;background: color-mix(in srgb,var(--aviso) 9%,transparent);box-shadow: inset 0 0 0 1px color-mix(in srgb,var(--aviso) 30%,transparent);margin: 0 0 18px}.pp-aviso>div{flex: 1;min-width: 0}.pp-aviso b{font: 650 14.5px/1.3 var(--ui)}.pp-aviso p{margin: 3px 0 0;font: var(--cuerpo-s);color: var(--texto-2);max-width: 86ch}.pp-av-i svg{width: 20px;height: 20px;color: var(--aviso);display: block;margin-top: 1px}.pp-base{margin: 12px 0 0}.pp-conf{display: flex;align-items: center;gap: 9px;width: 100%;padding: 9px 12px;border-radius: 11px;border: 0;background: var(--capa-hueco);box-shadow: inset 0 0 0 1px var(--filo-suave);color: var(--texto);font: 500 13px/1.3 var(--ui);cursor: pointer;text-align: left}.pp-conf:hover{box-shadow: inset 0 0 0 1px var(--filo-claro,var(--borde))}.pp-conf b{font-weight: 650;white-space: nowrap}.pp-conf>span{color: var(--tenue);min-width: 0;overflow: hidden;text-overflow: ellipsis;white-space: nowrap;flex: 1}.pp-conf>svg{width: 16px;height: 16px;color: var(--tenue);flex: none;transition: transform var(--mov-corto,.2s) ease}.pp-conf[aria-expanded="true"]>svg{transform: rotate(180deg)}.pp-base[data-c="baja"] .pp-conf{box-shadow: inset 0 0 0 1px color-mix(in srgb,var(--aviso) 38%,transparent);background: color-mix(in srgb,var(--aviso) 7%,transparent)}.pp-base-d{padding: 14px 2px 2px}.pp-porq{margin: 0;font: var(--cuerpo-s);color: var(--texto);max-width: 78ch}.pp-base-d h4{margin: 16px 0 6px;font: var(--rotulo);letter-spacing: var(--rotulo-espacio);text-transform: uppercase;color: var(--tenue);display: flex;justify-content: space-between;gap: 10px}.pp-base-d h4 span{color: var(--sube);letter-spacing: 0;text-transform: none;white-space: nowrap}.pp-datos{list-style: none;margin: 0;padding: 0}.pp-datos li{display: grid;grid-template-columns: 20px minmax(0,1fr);gap: 10px;padding: 9px 0;border-top: 1px solid var(--filo-suave)}.pp-d-e svg{width: 16px;height: 16px;color: var(--sube);display: block;margin-top: 1px}.pp-datos li:not([data-e="ok"]) .pp-d-e svg{color: var(--aviso)}.pp-d-t{display: grid;grid-template-columns: minmax(0,auto) minmax(0,1fr);gap: 2px 14px}.pp-d-t b{font: 600 13.5px/1.35 var(--ui)}.pp-d-t em{font: 500 13.5px/1.35 var(--ui);font-style: normal;text-align: right;font-variant-numeric: tabular-nums}.pp-d-t small{grid-column: 1 / -1;font: var(--nota-s);color: var(--tenue)}.pp-d-t strong{color: var(--aviso);font-weight: 650}.pp-compr{list-style: none;margin: 0;padding: 0;display: grid;grid-template-columns: repeat(2,minmax(0,1fr));gap: 6px 18px}.pp-compr li{display: flex;gap: 7px;font: var(--nota-s);color: var(--texto-2)}.pp-compr svg{width: 14px;height: 14px;color: var(--sube);flex: none;margin-top: 1px}.pp-nota{margin: 12px 0 0;font: var(--cuerpo-s);color: var(--texto-2);max-width: 78ch}.pp-nota b{color: var(--texto);font-weight: 650}.pp-salidas{display: grid;grid-template-columns: repeat(3,minmax(0,1fr));gap: 8px;margin: 12px 0 0}.pp-salida{text-align: left;padding: 11px 12px;border-radius: 12px;border: 0;background: var(--capa-hueco);box-shadow: inset 0 0 0 1px var(--filo-suave);color: var(--texto);cursor: pointer;display: grid;gap: 3px;align-content: start}.pp-salida b{font: 600 13.5px/1.25 var(--ui)}.pp-salida small{font: var(--nota-s);color: var(--tenue)}.pp-salida[aria-pressed="true"]{box-shadow: inset 0 0 0 1.5px var(--oro-texto);background: color-mix(in srgb,var(--oro-texto) 8%,transparent)}.pp .tarea.pp-decidir .t-check{border-style: dashed}.pp .tarea .t-meta{flex-wrap: wrap;row-gap: 6px}.pp .pp-rh2{margin-top: 30px}.pp .rh .k{font-weight: 400}.pp-fallo{display: flex;gap: 12px;padding: 14px 16px;border-radius: 14px;border: 1px dashed color-mix(in srgb,var(--texto) 24%,transparent);list-style: none}.pp-fallo b{font: 650 14px/1.3 var(--ui)}.pp-fallo p{margin: 4px 0 8px;font: var(--cuerpo-s);color: var(--texto-2)}.pp-vacio{display: grid;justify-items: start;gap: 6px;padding: 24px 0 30px;max-width: 64ch}.pp-vacio svg{width: 26px;height: 26px;color: var(--sube)}.pp-vacio b{font: var(--tit-2)}.pp-vacio p{margin: 0;font: var(--cuerpo-s);color: var(--texto-2)}.pp-reg{display: grid;grid-template-columns: repeat(3,minmax(0,1fr));gap: 8px;margin: 0 0 10px}.pp-reg div{padding: 10px 12px;border-radius: 12px;background: var(--capa-hueco);box-shadow: inset 0 0 0 1px var(--filo-suave)}.pp-reg small{display: block;font: var(--nota-s);color: var(--tenue)}.pp-reg b{display: block;font: var(--cifra-s);color: var(--tenue)}.pp-filas{list-style: none;margin: 0;padding: 0;max-width: 980px}.pp-filas li{display: grid;grid-template-columns: 150px minmax(0,1fr) auto;gap: 18px;padding: 16px 0;border-top: 1px solid var(--filo-suave);align-items: start}.pp-filas li.hecho{opacity: .55}.pp-filas .t-pq{margin: 4px 0 0}.pp-cargando{margin: 24px 0}.pp-mes{margin: 0 0 26px;padding: 20px 22px;border-radius: var(--r-t);background: var(--superficie);border: 1px solid var(--filo-suave);box-shadow: var(--sombra-1)}.pp-mes-cab{display: flex;flex-wrap: wrap;align-items: baseline;gap: 4px 12px;margin: 0 0 6px}.pp-mes-cab h2{margin: 0;font: var(--tit-2);letter-spacing: -.01em}.pp-mes-cab .k{font: var(--nota-s);color: var(--tenue)}.pp-frase{margin: 0 0 20px;font-size: 17px;max-width: 74ch}.pp-mes-g{display: grid;grid-template-columns: auto minmax(0,1.45fr) minmax(0,1fr);align-items: center}.pp-mes-g>div{min-width: 0;padding: 2px 30px;border-left: 1px solid var(--filo-suave)}.pp-mes-g>div:first-child{padding-left: 0;border-left: 0}.pp-mes-g>div:last-child{padding-right: 0}.pp-mes-a{display: flex;align-items: center;gap: 14px}.pp-mes-a>div>b{display: block;font: 650 16px/1.25 var(--ui);white-space: nowrap}.pp-mes-a>div>span{display: block;margin-top: 3px;font: var(--nota-s);color: var(--tenue)}.pp-aro{--p: 0;position: relative;flex: none;width: 60px;height: 60px;border-radius: 50%;display: grid;place-items: center;background: conic-gradient(var(--sube) calc(var(--p) * 1%),color-mix(in srgb,var(--texto) 15%,transparent) 0)}.pp-aro::before{content: '';position: absolute;inset: 5px;border-radius: 50%;background: var(--superficie)}.pp-aro b{position: relative;font: 700 23px/1 var(--ui);font-variant-numeric: tabular-nums}.pp-aro.fin b svg{display: block;width: 26px;height: 26px;color: var(--sube)}.pp-mes-r{display: flex;align-items: baseline;gap: 10px;margin-bottom: 10px}.pp-mes-r b{font: var(--cifra-s);letter-spacing: -.02em;font-variant-numeric: tabular-nums}.pp-fl-or{display: flex;gap: 3px;margin-bottom: 4px}.pp-fl-or>span{min-width: 0;display: flex;flex-direction: column;font: var(--nota-s);color: var(--texto-2)}.pp-fl-or>span>span{white-space: nowrap}.pp-fl-or>span::after{content: '';align-self: stretch;height: 5px;margin-top: 5px;border: 1px solid color-mix(in srgb,var(--texto) 32%,transparent);border-bottom: 0;border-radius: 3px 3px 0 0}.pp-fl-or>span:last-child:not(:first-child){align-items: flex-end}.pp-fl-de{margin: 0 0 8px;font: var(--nota-s);color: var(--texto-2)}.pp-fl-or b,.pp-fl-de b,.pp-fl-ley b{color: var(--texto);font-weight: 650;font-variant-numeric: tabular-nums}.pp-fl-bar{display: flex;gap: 3px;height: 14px}.pp-fl-bar i{min-width: 6px;border-radius: 4px;background: var(--sube)}.pp-fl-bar i[data-k="hac"],.pp-fl-ley li[data-k="hac"] i{background: var(--aviso)}.pp-fl-bar i[data-k="libre"],.pp-fl-ley li[data-k="libre"] i{background: repeating-linear-gradient(135deg,var(--oro-texto) 0 3px,color-mix(in srgb,var(--oro-texto) 34%,transparent) 3px 6px)}.pp-fl-bar i[data-k="col"],.pp-fl-ley li[data-k="col"] i{background: var(--texto-2)}.pp-fl-bar i[data-k="idea"],.pp-fl-ley li[data-k="idea"] i{background: var(--oro-texto)}.pp-fl-ley{list-style: none;margin: 10px 0 0;padding: 0;display: flex;flex-wrap: wrap;gap: 4px 18px;font: var(--nota-s);color: var(--texto-2)}.pp-fl-ley li{display: flex;align-items: center;gap: 6px;white-space: nowrap}.pp-fl-ley i{flex: none;width: 10px;height: 10px;border-radius: 3px;background: var(--sube)}.pp-fl-nada{margin: 0;font: var(--cuerpo-s);color: var(--texto-2)}.pp-mes-c{display: grid;gap: 14px}.pp-mes-c b{display: block;margin: 4px 0 2px;font: var(--cifra-s);letter-spacing: -.02em;font-variant-numeric: tabular-nums;white-space: nowrap}.pp-mes-c span{display: block;font: var(--nota-s);color: var(--tenue)}.pp-r-datos[data-e="ok"] b{color: var(--sube)}.pp-r-datos[data-e="ojo"] b{color: var(--aviso)}.pp-fila{display: grid;grid-template-columns: minmax(0,1fr) auto;gap: 5px 12px;align-items: center;width: 100%;padding: 0;border: 0;background: none;color: inherit;font: inherit;text-align: left;cursor: pointer}.pp-fila:focus-visible{outline: 2px solid var(--oro-texto);outline-offset: 5px;border-radius: 8px}.pp-fila .t-meta{margin: 0}.pp-fila .t-t{grid-column: 1 / -1}.pp-fila-d{display: inline-flex;align-items: center;gap: 10px;align-self: start;min-height: 24px}.pp-chev svg{display: block;width: 18px;height: 18px;color: var(--tenue);transition: transform var(--mov-corto,.2s) ease}.pp-paso.abierto .pp-chev svg{transform: rotate(180deg)}.pp-fila:hover .pp-chev svg{color: var(--texto)}.pp-fila-v{grid-column: 1 / -1;display: flex;flex-wrap: wrap;align-items: flex-end;justify-content: space-between;gap: 10px 18px;margin-top: 7px}.pp-vis{display: grid;grid-template-columns: max-content minmax(90px,190px) max-content;gap: 9px 12px;align-items: center;font: var(--nota-s)}.pp-vf{display: contents}.pp-vf-n{color: var(--texto-2);font-weight: 600}.pp-vf-v{color: var(--texto);font-variant-numeric: tabular-nums;white-space: nowrap}.pp-vf-v em{font-style: normal;color: var(--tenue);margin-left: 8px}.pp-bar{position: relative;display: block;height: 8px;border-radius: 999px;background: color-mix(in srgb,var(--texto) 13%,transparent)}.pp-bar-f,.pp-bar-d{position: absolute;top: 0;bottom: 0}.pp-bar-f{left: 0;border-radius: 999px 0 0 999px;background: color-mix(in srgb,var(--texto) 62%,transparent)}.pp-bar-d{min-width: 3px;border-radius: 0 999px 999px 0}.pp-vf[data-t="sale"] .pp-bar-d{background: repeating-linear-gradient(135deg,var(--baja) 0 3px,color-mix(in srgb,var(--baja) 32%,transparent) 3px 6px)}.pp-vf[data-t="pasa"] .pp-bar-d{background: var(--aviso)}.pp-vf[data-t="entra"] .pp-bar-d{background: var(--sube)}.pp-vf[data-t="ahorra"] .pp-bar-d{background: repeating-linear-gradient(135deg,var(--sube) 0 3px,color-mix(in srgb,var(--sube) 32%,transparent) 3px 6px)}.pp-bar-m{position: absolute;top: -4px;bottom: -4px;width: 2px;margin-left: -1px;border-radius: 1px;background: var(--texto);box-shadow: 0 0 0 1.5px var(--superficie)}.pp-res{font: var(--nota-s);color: var(--texto-2)}.pp-hc{display: inline-flex;align-items: center;gap: 6px;padding: 4px 10px;border-radius: 999px;font: 600 12px/1.25 var(--ui);white-space: nowrap;background: color-mix(in srgb,var(--aviso) 13%,transparent);color: var(--aviso)}.pp-hc svg{width: 13px;height: 13px}.pp-hc.ok{background: color-mix(in srgb,var(--texto) 9%,transparent);color: var(--texto-2)}.pp-hc.bien{background: color-mix(in srgb,var(--sube) 13%,transparent);color: var(--sube)}.pp-det{padding-top: 14px}.pp-det>.t-pq{margin-top: 0;max-width: 78ch}.pp-pist{display: flex;flex-wrap: wrap;gap: 6px;margin: 0 0 10px}.pp-pist .pp-chip{background: color-mix(in srgb,var(--texto) 9%,transparent);color: var(--texto-2)}.pp-pist .pp-chip.mal{background: color-mix(in srgb,var(--baja) 13%,transparent);color: var(--baja)}.pp .tarea.hecho .pp-fila-v,.pp .tarea.hecho .pp-conf-s{display: none}.pp .tarea.pp-paso{padding-top: 14px;padding-bottom: 14px}.pp .tarea.pp-paso .t-primero{margin-left: 0}.pp-opc-cab{margin: 0 0 8px}.pp-opc-cab h2{margin: 16px 0 6px;font: var(--tit-2)}.pp-opc-cab p{margin: 0;font: var(--cuerpo-s);color: var(--texto-2);max-width: 70ch}.pp-opc{max-width: 900px}.pp-opc .rh{margin: 28px 0 4px}.pp-op{display: flex;gap: 18px;align-items: flex-start;justify-content: space-between;padding: 16px;margin-top: 10px;border: 1px solid var(--filo-suave);border-radius: var(--r-t);background: var(--superficie);box-shadow: var(--sombra-1)}.pp-op.off .pp-op-t>:not(.pp-chip){opacity: .45}.pp-op-t b{display: block;font: var(--tit-3);margin: 7px 0 4px}.pp-op-t p{margin: 0;font: var(--cuerpo-s);color: var(--texto-2);max-width: 72ch}.pp-op-t small{display: block;margin-top: 6px;font: var(--nota-s);color: var(--tenue)}.pp-param{margin-top: 10px}.pp-rep{margin-top: 12px;display: grid;gap: 6px;max-width: 440px}.pp-rep-f{display: flex;align-items: center;justify-content: space-between;gap: 12px;font: var(--cuerpo-s)}.pp-rep-f em{font-style: normal;color: var(--tenue);margin-left: 6px;font-size: .9em}.pp-rep-f input{width: 76px;padding: 6px 8px;border-radius: 9px;border: 1px solid var(--filo-suave);background: var(--capa-hueco);color: var(--texto);font: inherit;text-align: right}.pp-cmin{margin-top: 12px;max-width: 440px}.pp-sw{flex: none;width: 46px;height: 28px;margin-top: 4px;border-radius: 999px;border: 0;background: color-mix(in srgb,var(--texto) 16%,transparent);position: relative;cursor: pointer;transition: background-color var(--mov-corto,.2s) ease}.pp-sw i{position: absolute;top: 3px;left: 3px;width: 22px;height: 22px;border-radius: 50%;background: var(--texto);transition: transform var(--mov-corto,.2s) ease}.pp-sw[aria-checked="true"]{background: var(--oro-texto)}.pp-sw[aria-checked="true"] i{transform: translateX(18px);background: var(--sobre-primario)}.pp-sw:focus-visible{outline: 2px solid var(--oro-texto);outline-offset: 2px}html[data-acabado="liso"] :is(.pp-mes,.pp-op){background: none;border: 0;border-radius: 0;box-shadow: none;padding: 0}html[data-acabado="liso"] .pp-op{border-top: 1px solid var(--hilo-liso);padding: 16px 0;margin: 0}html[data-acabado="liso"] .pp-aro::before{background: var(--fondo)}html[data-acabado="liso"] .pp-bar-m{box-shadow: 0 0 0 1.5px var(--fondo)}html[data-acabado="liso"] .pp :is(.tarea,.rfecha){background: none;border: 0;border-top: 1px solid var(--hilo-liso);border-radius: 0;box-shadow: none;padding: 16px 0 17px}html[data-acabado="liso"] .pp :is(.tareas,.rfechas){gap: 0}html[data-acabado="liso"] .pp :is(.tareas,.rfechas)>li:first-child{border-top: 0;padding-top: 6px}html[data-acabado="liso"] .pp .rcol-grid.con-lado{column-gap: 64px}.pp-sino{display: flex;flex-wrap: wrap;align-items: center;gap: 8px;margin: 12px 0 0}.pp-sino>span{font: 650 14px/1.3 var(--ui);margin-right: 4px}.pp-sino .btn[data-v="si"]{box-shadow: inset 0 0 0 1.5px var(--oro-texto);color: var(--oro-texto)}.pp-q{flex: none;width: 32px;height: 32px;border-radius: 50%;border: 1.5px dashed var(--borde);display: grid;place-items: center;font: 650 14px/1 var(--ui);color: var(--tenue)}.pp-dec-nota{margin: -2px 0 10px;font: var(--cuerpo-s);color: var(--texto-2);max-width: 72ch}.pp-desc{margin: 12px 0 0;font: var(--nota-s)}.pp-chip.pp-decid{background: color-mix(in srgb,var(--oro-texto) 14%,transparent);color: var(--oro-texto)}.rf-que{margin: 5px 0 0;font: var(--cuerpo-s);color: var(--texto)}.rf-que b{font-weight: 650}.pp-conf>span{white-space: normal}.pp-molde{grid-column: 1 / -1;display: grid;gap: 5px;margin-top: 9px}.pp-m{display: grid;grid-template-columns: 74px minmax(0,1fr);gap: 10px;font: var(--nota-s);align-items: baseline}.pp-mk{color: var(--tenue);font-weight: 600}.pp-mv{color: var(--texto-2)}.pp-mv b{color: var(--texto);font-weight: 650}.pp-como{margin: 0 0 12px}.pp-como>.t-pasos{margin-top: 8px}.pp-h{display: block;font: var(--rotulo);letter-spacing: var(--rotulo-espacio);text-transform: uppercase;color: var(--tenue);margin: 0 0 4px}.t-pasos{list-style: none;margin: 0;padding: 0;counter-reset: pp}.t-pasos li{counter-increment: pp;display: grid;grid-template-columns: 24px minmax(0,1fr);gap: 10px;padding: 7px 0;border-top: 1px solid var(--filo-suave);font: var(--cuerpo-s);color: var(--texto);max-width: 78ch}.t-pasos li:first-child{border-top: 0}.t-pasos li::before{content: counter(pp);width: 22px;height: 22px;border-radius: 50%;display: grid;place-items: center;font: 650 12px/1 var(--ui);background: color-mix(in srgb,var(--oro-texto) 15%,transparent);color: var(--oro-texto)}.t-pasos b{font-weight: 650}@media (max-width: 759px){.pp .pp-cab{display: block}.pp .pp-cab p{margin-bottom: 10px}.pp-d-t{grid-template-columns: minmax(0,1fr)}.pp-d-t em{text-align: left;color: var(--texto-2)}.pp-compr,.pp-salidas{grid-template-columns: minmax(0,1fr)}.pp-conf{flex-wrap: wrap;row-gap: 3px}.pp-conf>span{flex-basis: 100%;order: 3;white-space: normal;padding-left: 0}.pp-conf b{flex: 1}.pp-filas li{grid-template-columns: minmax(0,1fr);gap: 6px}.pp-mes{padding: 16px}.pp-frase{font-size: 16px;margin-bottom: 16px}.pp-mes-g{grid-template-columns: minmax(0,1fr)}.pp-mes-g>div{padding: 16px 0 0;margin-top: 16px;border-left: 0;border-top: 1px solid var(--filo-suave)}.pp-mes-g>div:first-child{padding-top: 0;margin-top: 0;border-top: 0}.pp-mes-c{grid-template-columns: repeat(2,minmax(0,1fr));gap: 12px}.pp-mes-c b{white-space: normal}.pp-cs-l{display: none}.pp-fila-v{justify-content: flex-start}.pp-vis{flex: 1 1 100%;grid-template-columns: minmax(0,1fr);gap: 10px}.pp-vf{display: grid;grid-template-columns: auto minmax(0,1fr);grid-template-areas: "n v" "bar bar";gap: 5px 10px}.pp-vf-n{grid-area: n}.pp-vf-v{grid-area: v;text-align: right;white-space: normal}.pp-bar{grid-area: bar}.pp-reg{gap: 6px}}`;
if (!$('#ppCss')) { const s = document.createElement('style'); s.id = 'ppCss'; s.textContent = PP_CSS; document.head.appendChild(s); }
const ppSvg = (d) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const PP_ICO = {
  chev: ppSvg('<path d="M6 9l6 6 6-6"/>'), ok: ppSvg('<path d="M5 12.5l4.2 4.2L19 7"/>'), reloj: ppSvg('<circle cx="12" cy="12" r="8.2"/><path d="M12 7.6V12l2.9 1.8"/>'),
  nube: ppSvg('<path d="M7 18.5h9.5a4 4 0 0 0 .6-7.96A5.5 5.5 0 0 0 6.6 9.9 4.3 4.3 0 0 0 7 18.5z"/><path d="M4 4l16 16"/>'), falta: ppSvg('<circle cx="12" cy="12" r="8.2"/><path d="M12 8v4.6M12 15.8v.1"/>'),
  ajuste: ppSvg('<path d="M5 7h9M18 7h1M5 12h2M11 12h8M5 17h7M16 17h3"/><circle cx="16" cy="7" r="1.8"/><circle cx="9" cy="12" r="1.8"/><circle cx="14" cy="17" r="1.8"/>'),
  imp: ppSvg('<path d="M7 4h8l3 3v13H7z"/><path d="M10 12h5M10 16h5"/>'),
};
const PP_CONF = CONF_TXT;
const PP_EST = { ok: ['al día', PP_ICO.ok], viejo: ['viejo', PP_ICO.reloj], flojo: ['flojo', PP_ICO.falta], falta: ['falta', PP_ICO.falta], espera: ['sin actualizar', PP_ICO.nube] };
const ppConfS = (c) => confChip(c);
const ppTxt = (h) => String(h || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
const ppHora = (s) => { try { return new Date(s).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }); } catch (e) { return ''; } };
const ppGuardar = (m) => guardarCarteraCallada(m || 'Paso a paso');
const ppRuta = () => (S.cartera.ruta = S.cartera.ruta || {});

/* la línea de confianza: el medidor, cuántos datos y cuál falla; al abrirla, por qué, cada dato, las cuentas y cuándo cambia */
function ppBase(x) {
  if (!x.conf || !x.datos) return '';
  const peor = x.datos.find((d) => d[3] !== 'ok');
  const pie = peor ? `${x.datos.length} datos · ${peor[0].toLowerCase()}: ${PP_EST[peor[3]][0]}` : `${x.datos.length} datos, todos al día`;
  return `<div class="pp-base" data-c="${x.conf}">
    <button type="button" class="pp-conf" aria-expanded="false" data-pp-abre><b>${PP_CONF[x.conf]}</b><span>${CONF_POR[x.conf]} · ${esc(pie)}</span>${PP_ICO.chev}</button>
    <div class="pp-base-d" hidden>
      <p class="pp-porq">${x.porq}</p>
      <h4>En qué se apoya</h4>
      <ul class="pp-datos">${x.datos.map(([q, v, f, e]) => `<li data-e="${e}"><span class="pp-d-e" title="${PP_EST[e][0]}">${PP_EST[e][1]}</span><span class="pp-d-t"><b>${q}</b><em>${v}</em><small>${f}${e !== 'ok' ? ` · <strong>${PP_EST[e][0]}</strong>` : ''}</small></span></li>`).join('')}</ul>
      <h4>Comprobado antes de enseñártelo <span>${x.compr.length} de ${x.compr.length}</span></h4>
      <ul class="pp-compr">${x.compr.map((c) => `<li>${PP_ICO.ok}<span>${c}</span></li>`).join('')}</ul>
      ${x.cambia ? `<p class="pp-nota"><b>Cuándo cambia.</b> ${x.cambia}</p>` : ''}
      <p class="pp-nota"><b>Cómo le ha ido a pasos así.</b> ${x.hist}</p>
    </div></div>`;
}
// el dibujo: un peso frente a su tope. Lleno, lo que se queda; rayado o de color, lo que sale, entra o sobra; la raya, el tope
function ppBarra(f) {
  const p = (v) => `${Math.max(0, Math.min(100, (v / f.max) * 100)).toFixed(1)}%`;
  const lo = Math.min(f.de, f.a), hi = Math.max(f.de, f.a), base = f.tono === 'pasa' ? Math.min(lo, f.marca) : lo;
  return `<span class="pp-vf" data-t="${f.tono}"><span class="pp-vf-n">${esc(f.n)}</span><span class="pp-bar"><i class="pp-bar-f" style="width:${p(base)}"></i>${hi > base ? `<i class="pp-bar-d" style="left:${p(base)};width:${p(hi - base)}"></i>` : ''}${f.marca != null ? `<i class="pp-bar-m" style="left:${p(f.marca)}"></i>` : ''}</span><span class="pp-vf-v">${f.v}${f.m ? `<em>${f.m}</em>` : ''}</span></span>`;
}
/* 16 nov · el molde de cada tarjeta: qué hago (el título, con verbo y cantidad), dónde, cuándo (un día) y qué pasa después */
function ppMolde(x) {
  const m = x.molde; if (!m) return '';
  const f = (k, v) => (v ? `<span class="pp-m"><span class="pp-mk">${k}</span><span class="pp-mv">${v}</span></span>` : '');
  return `<span class="pp-molde">${f('Cuánto', m.cuanto)}${f('Dónde', m.donde)}${f('Cuándo', m.cuando)}${f('Después', m.despues)}</span>`;
}
// un paso, plegado en una fila; al tocarla sale el porqué, Hacienda, la confianza con sus datos y cómo hacerlo
function ppPaso(x, n, primero) {
  const tp = tipoPaso(x), ab = !!(S.ppAbiertos || {})[x.id] && !x.hecho, decidir = x.grupo === 'decidir', sino = decidir && !x.salidas;
  const dEsp = sinRed() ? (x.datos || []).find((d) => d[3] === 'espera') : null;
  const espera = dEsp ? `<span class="pp-chip pp-espera">${PP_ICO.nube}precio ${esc((String(dEsp[2]).match(/del .*$/) || [''])[0])}, sin actualizar</span>` : '';
  const vis = x.vis ? `<span class="pp-vis">${x.vis.map(ppBarra).join('')}</span>` : x.res ? `<span class="pp-res">${x.res}</span>` : '';
  const hc = x.hc ? `<span class="pp-hc${x.hc[1] ? ' ' + x.hc[1] : ''}">${PP_ICO.imp}${x.hc[0]}</span>` : '';
  const sal = ((ppRuta().salidas || {})[x.id]);
  const imp = x.imp && x.rango ? `+${eur(x.ref.pl.ganancia, 0)} de ganancia: <b>entre ${eur(x.rango.lo, 0)} y ${eur(x.rango.hi, 0)}</b> en la renta. Es un rango porque falta saber si este año ya pasas de 6.000 € de ganancias (ahí el tipo sube). <button type="button" class="enlace acento" data-accion="fiscal">Apuntar mis ventas de este año</button>` : x.imp;
  return `<li class="tarea pp-paso t-${tp.c}${primero ? ' primero' : ''}${x.hecho ? ' hecho' : ''}${ab ? ' abierto' : ''}${decidir ? ' pp-decidir' : ''}" data-id="${esc(x.id)}">
    ${decidir ? '<span class="pp-q" aria-hidden="true">?</span>' : checkRuta(x, n)}
    <div class="t-c">
      <button type="button" class="pp-fila" data-pp-paso="${esc(x.id)}" aria-expanded="${ab}">
        <span class="t-meta"><span class="t-tipo">${ICONO_PASO[tp.i] || ''}${TIPO_ETQ[tp.c] || 'Plan'}</span>${x.cuando && !(x.molde && x.molde.cuando) ? `<span class="t-cuando">${esc(x.cuando)}</span>` : ''}${x.decidido ? '<span class="pp-chip pp-decid">Dijiste que sí</span>' : ''}${/^(aportd|reinv|caida|costes|cripto|oport|tesis|efectivo):/.test(x.id) ? '<span class="pp-chip pp-nuevo">Opción nueva</span>' : ''}${espera}${primero ? '<span class="t-primero">Lo primero</span>' : ''}</span>
        <span class="pp-fila-d">${ppConfS(x.conf)}<span class="pp-chev">${PP_ICO.chev}</span></span>
        <b class="t-t">${x.t.replace(/ €/g, ' €')}</b>
        ${x.hecho ? '' : ppMolde(x)}
        ${(vis || hc) && !x.hecho ? `<span class="pp-fila-v">${vis}${hc}</span>` : ''}
      </button>
      ${sino ? `<div class="pp-sino" role="group" aria-label="¿Lo hago o no?"><span>¿Lo hago?</span><button type="button" class="btn peq" data-pp-dec="${esc(x.id)}" data-v="si">Sí, lo hago</button><button type="button" class="btn peq" data-pp-dec="${esc(x.id)}" data-v="no">No</button></div>` : ''}
      <div class="pp-det"${ab ? '' : ' hidden'}>
        ${x.pist && decidir ? `<div class="pp-pist">${x.pist.map(([t, c]) => `<span class="pp-chip${c ? ' ' + c : ''}">${t}</span>`).join('')}</div>` : ''}
        ${x.pasos ? `<details class="paso-mas pp-como"><summary>Cómo hacerlo, paso a paso</summary><ol class="t-pasos">${x.pasos.map((p) => `<li><span>${p}</span></li>`).join('')}</ol></details>` : ''}
        ${x.pq || x.det ? `<p class="t-pq">${x.pasos ? '<b>Por qué.</b> ' : ''}${[x.pq, x.det].filter(Boolean).join(' ')}</p>` : ''}
        ${x.salidas ? `<div class="pp-salidas" role="group" aria-label="Salidas">${x.salidas.map(([a, b], i) => `<button type="button" class="pp-salida" data-pp-salida="${esc(x.id)}" data-i="${i}" aria-pressed="${sal === i}"><b>${a}</b><small>${b}</small></button>`).join('')}</div>` : ''}
        ${imp ? `<div class="t-imp">${ICONO_PASO.fiscal}<span><b>${/^perdida:/.test(x.id) ? 'Qué cambia en la renta:' : 'Hacienda:'}</b> ${imp}</span></div>` : ''}
        ${ppBase(x)}
        <div class="t-pie">${x.como && !x.pasos ? `<details class="paso-mas"><summary>Cómo hacerlo</summary><div class="t-como">${x.como}</div></details>` : ''}${x.acc ? `<span class="ruta-acc">${x.acc}</span>` : ''}${decidir ? '' : x.decidido ? `<span class="ruta-acc"><button type="button" class="enlace" data-pp-dec="${esc(x.id)}" data-v="">Al final no lo hago</button></span>` : `<span class="ruta-acc"><button type="button" class="enlace" data-pp-posp="${esc(x.id)}">Dejarlo para el mes que viene</button></span>`}${decidir ? '' : `<button type="button" class="t-hecho" data-ruta="${esc(x.id)}" aria-pressed="${x.hecho}">${x.hecho ? 'Hecho. Deshacer' : '✓ Marcar como hecho'}</button>`}</div>
      </div>
    </div>
  </li>`;
}
// los avisos de arriba, con lo que pasa de verdad
function ppAvisos(R, M) {
  const g = S.precios && S.precios.generado, anio = new Date().getFullYear();
  const dv = [...R.hacer, ...R.decidir].flatMap((x) => x.datos || []).find((d) => d[3] === 'viejo' && d[4] === 'precio');
  const nRango = [...R.hacer, ...R.decidir].filter((x) => x.rango).length;
  const A = {
    sinred: [PP_ICO.nube, 'Sin conexión', `Ves lo calculado con los datos del ${diaCorto(g)}${g ? ` a las ${ppHora(g)}` : ''}. Lo que depende de un precio espera; las fechas y los impuestos ya calculados no cambian. Lo que marques se guarda aquí y se sube al volver.`, '<button type="button" class="btn peq" data-pp-reintentar>Reintentar</button>'],
    iacaida: [PP_ICO.reloj, 'La IA y el radar no han podido repasar hoy', `Su último repaso es del ${diaCorto(S.precios && S.precios.radar_generado)}${S.precios && S.precios.radar_generado ? ` a las ${ppHora(S.precios.radar_generado)}` : ''}. Los pasos que salen de tus números no cambian; lo que depende del radar lleva su fecha.`, ''],
    viejo: [PP_ICO.reloj, 'Un dato va con retraso', dv ? `${esc(dv[0])}: ${esc(dv[2])}. El paso que lo usa baja un escalón de confianza y lo dice.` : 'El paso que lo usa baja un escalón de confianza y lo dice.', ''],
    faltadato: [PP_ICO.falta, 'Falta un dato tuyo', `Sin tus ventas de ${anio}, el impuesto de ${nRango === 1 ? 'un paso' : `${nRango} pasos`} sale como un rango. Los pasos siguen; solo cambia esa cifra.`, '<button type="button" class="btn peq" data-accion="fiscal">Apuntarlas</button>'],
  };
  return R.avisos.slice(0, 2).map((k) => { const a = A[k]; return `<div class="pp-aviso" role="status" data-k="${k}"><span class="pp-av-i">${a[0]}</span><div><b>${a[1]}</b><p>${a[2]}</p></div>${a[3]}</div>`; }).join('');
}
// la frase del mes, con lo primero de cada paso
function ppFrase(R) {
  const p = R.hacer.filter((x) => !x.hecho).slice(0, 2).map((x) => {
    const r = x.ref || {};
    if (/^venta:/.test(x.id) && r.pl) return r.pl.nivel === 'reducir' ? `<b>recorta ${esc(r.pl.f.inst.corto)}</b>, que pasa de tu límite` : `<b>vende ${r.pl.nivel === 'vender' ? '' : 'parte de '}${esc(r.pl.f.inst.corto)}</b>`;
    if (r.tipo === 'aport') return `<b>lleva la aportación a ${esc(nombreInst(r.lejos.id))}</b>`;
    const t = ppTxt(x.t).replace(/:.*$/, ''); return `<b>${esc(t.charAt(0).toLowerCase() + t.slice(1))}</b>`;
  });
  if (!p.length) return R.hacer.length ? '<p class="frase pp-frase">Este mes, <b>todo hecho</b>.</p>' : '<p class="frase pp-frase">Este mes, <b>nada</b>: nada con fecha ni fuera de tus límites.</p>';
  const t = p.length === 2 ? `${p[0]}, y ${p[1]}` : p[0];
  return `<p class="frase pp-frase">${t.replace(/^<b>(.)/, (m, c) => `<b>${c.toUpperCase()}`)}.</p>`;
}
function ppMes(R, M) {
  const nH = R.hacer.length, hechos = R.hacer.filter((x) => x.hecho).length, pend = nH - hechos, anio = new Date().getFullYear();
  // la fecha de los precios de bolsa (no la de los fondos, que va un día detrás, ni la de la cripto, que no cierra)
  const fechas = M.filas.filter((f) => !ppEsFondo(f.inst) && f.inst.clase !== 'Cripto' && f.p && f.p.fecha).map((f) => f.p.fecha).sort();
  const fPrecios = fechas[fechas.length - 1];
  const total = sum(R.flujo.sale, (x) => x[1]), va = R.flujo.va.filter((x) => x[2] > 0.5);
  const rango = R.hacHi - R.hac >= 1 ? { lo: R.hac, hi: R.hacHi } : null;
  const flujo = total > 0.5 ? `<div class="pp-flujo" role="img" aria-label="${esc(R.flujo.sale.map(([t, v]) => `${t}, ${eur(v, 0)}`).join('; '))}. ${esc(va.map(([, t, v]) => `${t}, ${eur(v, 0)}`).join('; '))}.">
      ${R.flujo.sale.length > 2 ? `<p class="pp-fl-de">${R.flujo.sale.map(([t, v]) => `${esc(t)} <b>${eur(v, 0)}</b>`).join(' · ')}</p>` : `<div class="pp-fl-or">${R.flujo.sale.map(([t, v]) => `<span style="flex:${v.toFixed(0)}"><span>${esc(t)} <b>${eur(v, 0)}</b></span></span>`).join('')}</div>`}
      <div class="pp-fl-bar">${va.map(([k, , v]) => `<i data-k="${k}" style="flex:${v.toFixed(0)}"></i>`).join('')}</div>
      <ul class="pp-fl-ley">${va.map(([k, t, v]) => `<li data-k="${k}"><i></i>${esc(t)} <b>${k === 'hac' && rango ? `${fmtNum(rango.lo, 0)} a ${eur(rango.hi, 0)}` : eur(v, 0)}</b></li>`).join('')}</ul></div>`
    : `<p class="pp-fl-nada">${R.solos.length ? `Solo entra lo que va solo: ${esc(ppTxt(R.solos[0].t).replace(/^./, (c) => c.toLowerCase()))}.` : 'Este mes no se mueve nada.'}</p>`;
  const perd = R.decidir.find((x) => /^perdida:/.test(x.id));
  const hac = R.hacHi > 0.5 ? [rango ? `+${fmtNum(rango.lo, 0)} a ${eur(rango.hi, 0)}` : `+${eur(R.hac, 0)}`, `renta de ${anio}${R.hacJuntas ? ' · las ventas del mes, juntas (cada paso da la suya por separado)' : ''}${perd ? ` · ${eur(perd.ref.ahorro, 0)} menos si vendes ${esc(perd.ref.f.inst.corto)}` : ''}`] : ['0 €', 'nada que declarar'];
  const av = R.avisos;
  const dat = av.includes('sinred') ? ['Sin actualizar', `del ${diaCorto(S.precios && S.precios.generado)}`] : R.apartados.length ? [`${R.apartados.length === 1 ? '1 paso apartado' : `${R.apartados.length} pasos apartados`}`, 'no pasó sus cuentas'] : av.includes('faltadato') ? ['Falta 1 dato', `tus ventas de ${anio}`] : av.includes('viejo') ? ['1 dato viejo', 'con retraso'] : av.includes('iacaida') ? ['Sin la IA de hoy', `repaso del ${diaCorto(S.precios && S.precios.radar_generado)}`] : ['Al día', `${R.datosN} datos`];
  const ok = !av.length && !R.apartados.length;
  const aro = `<span class="pp-aro${pend ? '' : ' fin'}" style="--p:${nH ? Math.round((hechos / nH) * 100) : 100}" aria-hidden="true"><b>${pend || PP_ICO.ok}</b></span>`;
  return `<section class="pp-mes" aria-label="Este mes">
    <header class="pp-mes-cab"><h2>Este mes</h2><span class="k">hasta el ${fechaCorta(sumarDias(hoyIso(), 31))}${fPrecios ? ` · ${sinRed() ? 'calculado con' : ''} precios del ${diaCorto(fPrecios)}` : ''}</span></header>
    ${ppFrase(R)}
    <div class="pp-mes-g">
      <div class="pp-mes-a">${aro}<div><b>${pend === 1 ? '1 paso por hacer' : pend ? `${pend} pasos por hacer` : nH ? 'Todo hecho' : 'Nada que hacer'}</b><span>${nH ? `${hechos} de ${nH} ${nH === 1 ? 'hecho' : 'hechos'}` : ''}${nH && R.decidir.length ? ' · ' : ''}${R.decidir.length ? `<span>${R.decidir.length === 1 ? 'una opción: ¿lo haces o no?' : `${R.decidir.length} opciones: ¿lo haces o no?`}</span>` : ''}</span></div></div>
      <div class="pp-mes-b"><div class="pp-mes-r"><small class="rotulo">Se mueve</small><b>${eur(total, 0)}</b></div>${flujo}</div>
      <div class="pp-mes-c"><div><small class="rotulo">Hacienda</small><b>${hac[0]}</b><span>${hac[1]}</span></div><div class="pp-r-datos" data-e="${ok ? 'ok' : 'ojo'}"><small class="rotulo">Datos</small><b>${dat[0]}</b><span>${dat[1]}</span></div></div>
    </div></section>`;
}
/* el registro de aciertos: cada mes, lo que dijo el Paso a paso y con qué precio; se compara a 1, 3 y 6 meses */
function ppRegistrar(R) {
  const r = ppRuta(), reg = r.reg = r.reg || {}, mesK = hoyIso().slice(0, 7);
  if (reg[mesK]) return;
  const xs = [...R.hacer, ...R.decidir].filter((x) => x.inst && x.inst.p > 0).slice(0, 10).map((x) => ({ id: x.decidirDe || x.id, t: ppTxt(x.t).slice(0, 90), s: x.inst.s, p: x.inst.p, d: hoyIso(), v: /^venta:/.test(x.id) ? 'venta' : 'compra', radar: !!x.inst.radar }));
  if (!xs.length) return;
  reg[mesK] = xs;
  for (const k of Object.keys(reg).sort().slice(0, -12)) delete reg[k];
  ppGuardar('Paso a paso: registro del mes');
}
function ppComoLeHaIdo() {
  const reg = ppRuta().reg || {}, todos = Object.values(reg).flat(), hoy = hoyIso();
  const precio = (x) => (x.radar ? ((radarVals() || []).find((y) => y.s === x.s) || {}).p : ((S.precios && S.precios.instrumentos && S.precios.instrumentos[x.s]) || {}).precio);
  const celda = (dias, t) => {
    const xs = todos.filter((x) => diasEntre(x.d, hoy) >= dias).map((x) => ({ x, ahora: precio(x) })).filter((y) => y.ahora > 0);
    const ok = xs.filter(({ x, ahora }) => (x.v === 'venta' ? ahora <= x.p * 1.02 : ahora > x.p)).length;
    return `<div><small>${t}</small><b>${xs.length ? `${ok} de ${xs.length}` : '—'}</b></div>`;
  };
  const primero = todos.map((x) => x.d).sort()[0];
  const nota = !primero ? 'El registro empieza este mes: guarda lo que dice cada paso y con qué precio, para compararlo después.'
    : diasEntre(primero, hoy) < 30 ? `Se podrá leer desde el ${fechaLarga(sumarDias(primero, 30))}: el registro empezó el ${fechaLarga(primero)}.`
      : 'Cuántos van a favor hoy de los pasos de hace 1, 3 y 6 meses (una venta, si el precio no ha subido; una compra, si ha subido). Con pocos, no dice mucho.';
  return `<div class="rbloque pp-registro"><h3 class="rh">Cómo le ha ido</h3><div class="pp-reg">${celda(30, 'a 1 mes')}${celda(91, 'a 3 meses')}${celda(182, 'a 6 meses')}</div><p class="t-pq k">${nota}</p></div>`;
}
function ppLado(R) {
  return `<div class="rlado">
    ${R.fechas.length ? `<div class="rbloque"><h3 class="rh">Fechas que vigilar <a class="rh-mas" href="#agenda">Ver el calendario</a></h3><ul class="rfechas">${R.fechas.map(htmlFechaRuta).join('')}</ul></div>` : ''}
    ${R.solos.length ? `<div class="rbloque"><h3 class="rh">Va solo<span class="k">no tienes que hacer nada</span></h3><ul class="rsolos">${R.solos.map(htmlSoloRuta).join('')}</ul></div>` : ''}
    ${ppComoLeHaIdo()}</div>`;
}
function ppHtmlMes(R, M) {
  const nH = R.hacer.length, hechos = R.hacer.filter((x) => x.hecho).length, primero = R.hacer.find((x) => !x.hecho);
  const fallo = R.apartados.map(({ x, por }) => `<li class="pp-fallo"><span class="pp-av-i">${PP_ICO.falta}</span><div><b>Un paso no se enseña: no ha pasado sus comprobaciones</b><p>${esc(ppTxt(x.t))}. Lo demás no depende de él.</p><details class="paso-mas"><summary>Qué falló</summary><div class="t-como">La comprobación «${esc(por)}» no cuadra. Un paso con una cuenta que no cuadra no sale con cifras: se aparta entero.</div></details></div></li>`).join('');
  const sig = R.P.seis.concat(R.P.anio).filter((x) => x.d && !x.auto && !x.espera).sort((a, b) => (a.d < b.d ? -1 : 1))[0];
  const hacer = nH || fallo ? `<h3 class="rh">Haz esto<span class="k">${hechos} de ${nH} ${nH === 1 ? 'hecho' : 'hechos'}</span></h3><ol class="tareas">${R.hacer.map((x, i) => ppPaso(x, i + 1, x === primero)).join('')}${fallo}</ol>`
    : `<div class="pp-vacio">${PP_ICO.ok}<b>Nada que hacer este mes</b><p>${R.espera ? `${esc(ppTxt(R.espera.t))}. ` : ''}Cuando haya algo con fecha o fuera de tus límites, sale aquí y en el botón de arriba.${sig ? ` Lo siguiente: ${esc(ppTxt(sig.t).replace(/^./, (c) => c.toLowerCase()))}, ${esc(sig.cuando || fechaCorta(sig.d))}.` : ''}</p></div>`;
  // 16 nov: las opciones, con una pregunta clara; lo que contestas que no, en una línea que se puede deshacer
  const desc = R.descartados.length ? `<p class="pp-desc k"><span>${R.descartados.length === 1 ? 'Una opción a la que dijiste que no' : `${R.descartados.length} opciones a las que dijiste que no`}</span>: ${R.descartados.map((x) => `<button type="button" class="enlace" data-pp-dec="${esc(x.id)}" data-v="">${L('Recuperar', 'Restore')} «${esc(ppTxt(x.t).replace(/\s*\(.*$/, ''))}»</button>`).join(' · ')}</p>` : '';
  const decidir = R.decidir.length || desc ? `<h3 class="rh pp-rh2">¿Lo hago o no?</h3><p class="pp-dec-nota">${R.decidir.length ? 'Son opciones: decides tú. Si dices que sí, pasan a «Haz esto»; si dices que no, no vuelven a salir. Mientras, no cuentan como pendientes.' : 'Ya has contestado a todas.'}</p>${R.decidir.length ? `<ul class="tareas">${R.decidir.map((x) => ppPaso(x, '')).join('')}</ul>` : ''}${desc}` : '';
  return `<section class="rcol pp-rcol" data-p="mes">${ppAvisos(R, M)}${ppMes(R, M)}
    <div class="rcol-grid con-lado"><div class="rbloque">${hacer}${decidir}</div>${ppLado(R)}</div></section>`;
}
// los otros plazos, en filas, cada una con su confianza (las proyecciones, baja)
function ppHtmlOtro(k, P, M) {
  const filas = P[k].filter((x) => !x.espera).map((x) => {
    let c = 'alta';
    if (/^(proy1|hito):/.test(x.id)) c = 'baja';
    else { try { c = fichaPaso(x, M).conf || 'alta'; } catch (e) { return ''; } }
    return `<li class="${x.hecho ? 'hecho' : ''}"><span class="t-cuando">${esc(x.cuando || '')}</span><div><b class="t-t">${x.t.replace(/ €/g, ' €')}</b>${x.pq || x.det ? `<p class="t-pq">${x.pq || x.det}</p>` : ''}</div>${ppConfS(c)}</li>`;
  }).join('');
  return filas ? `<ul class="pp-filas">${filas}</ul>` : '<div class="ruta-vacio">Nada en este plazo.</div>';
}

/* ---------- la hoja «Qué mira cada mes»: las doce opciones ---------- */
const PP_OPC = [
  ['Cada mes'],
  ['aport', 'Nuevo', 'A dónde va la aportación', 'Mira qué fondo está más lejos de tu reparto objetivo y propone llevar ahí la aportación del mes, sin vender ni pagar impuestos.', 'tus pesos y tu reparto objetivo por fondo', 'alta'],
  ['limite', 'Mejorado', 'Recortar lo que pasa de tu límite', 'Cuando una posición pasa de su límite, dice cuántas acciones vender, lo que supone en la renta y qué hacer con lo que queda libre.', 'precios, tu coste y tus límites', 'alta en las cuentas'],
  ['efectivo', 'Mejorado', 'Efectivo y colchón que rinden poco', 'Si tienes dinero parado o un colchón que rinde menos que un monetario, lo dice y dice a dónde moverlo.', 'tus saldos y lo que ha dado tu colchón', 'alta'],
  ['reinv', 'Nuevo', 'Reinvertir lo cobrado', 'Dividendos que se han quedado en efectivo este mes: los suma a la aportación.', 'lo que pagó cada acción que tienes', 'media'],
  ['Cuando pasa algo'],
  ['caida', 'Nuevo', 'Aportación extra en las caídas', 'Si tu fondo principal cae más que el umbral que elijas desde su máximo, propone adelantar aportaciones con el efectivo que tengas.', 'el precio, su máximo de 52 semanas y tu efectivo', 'alta en el dato; el resultado no se sabe', true],
  ['tesis', 'Mejorado', 'Una noticia grave de algo que tienes', 'Solo sale con dos medios distintos. La misma nota en tres medios cuenta como una.', 'la prensa que lee la IA, con su fecha y su fuente', 'media'],
  ['idea', 'Mejorado', 'Acción nueva si tienes hueco', 'La mejor del radar, con tamaño de entrada y regla de salida. Si la confianza es baja, va a «Para decidir tú».', 'el radar: analistas, tendencia y prensa', 'media o baja'],
  ['oport', 'Nuevo', 'Oportunidad tras una caída por una noticia', 'Una empresa que cae más de un 15 % por debajo de su media por un hecho concreto y a la que los analistas siguen a favor. Siempre como opción.', 'la caída, su causa con dos fuentes y los analistas', 'baja o media'],
  ['cripto', 'Nuevo', 'Cripto dentro de su banda', 'Si la cripto pasa de tu máximo, recortar (va con «Recortar lo que pasa de tu límite»); si baja de tu mínimo, completar con la aportación.', 'el precio de Bitvavo y la banda que pongas', 'alta'],
  ['Con fecha'],
  ['fiscal', 'Mejorado', 'Pagar menos en la renta', 'Pérdidas que compensan ganancias antes del 31 dic, con la regla de recompra de cada cosa (dos meses o un año).', 'tus ventas del año y tus datos fiscales', 'alta si están tus datos fiscales'],
  ['costes', 'Nuevo', 'El mismo índice, más barato', 'Si hay un fondo con el mismo índice y menos comisión, dice cuánto ahorras al año. El traspaso entre fondos no tributa.', 'las comisiones del catálogo', 'alta'],
  ['fechas', 'Ya está', 'Resultados y dividendos de lo tuyo', 'Las fechas que mueven tus acciones, con lo que cobras neto.', 'el calendario de cada empresa', 'alta'],
];
function ppHtmlOpciones(M) {
  const rep = repartoFondos() || {}, fondos = [...new Map(M.filas.filter((f) => ppEsFondo(f.inst)).map((f) => [f.inst.id, f.inst])).values()];
  const pf = S.cartera.perfil || {};
  let h = `<div class="pp-opc-cab"><button type="button" class="btn peq" data-pp-sub="mes">‹ Volver al mes</button><h2>Qué mira cada mes</h2><p>Cada opción es una decisión que el Paso a paso puede proponerte. Apaga las que no quieras: no vuelven a salir.</p></div><div class="pp-opc">`;
  for (const o of PP_OPC) {
    if (o.length === 1) { h += `<h3 class="rh">${o[0]}</h3>`; continue; }
    const [k, etq, t, d, datos, conf, umbral] = o, on = opRuta(k);
    const extra = k === 'aport' ? `<div class="pp-rep"><small>Tu reparto objetivo por fondo (en % de toda la cartera)</small>${fondos.length ? fondos.map((i) => `<label class="pp-rep-f"><span>${esc(i.corto || i.nombre)} <em>hoy ${fmtNum(pesoInst(M, i.id), 1)} %</em></span><input type="number" inputmode="decimal" min="0" max="100" step="1" data-pp-rep="${esc(i.id)}" value="${rep[i.id] != null ? esc(rep[i.id]) : ''}" placeholder="—" aria-label="Objetivo de ${esc(i.corto || i.nombre)}"></label>`).join('') : '<p class="k">No tienes fondos.</p>'}</div>`
      : k === 'cripto' ? `<label class="pp-rep-f pp-cmin"><span>Tu mínimo de cripto (% de la cartera) <em>el máximo es tu límite, ${fmtNum(limiteDe('cripto'), 0)} %</em></span><input type="number" inputmode="decimal" min="0" max="100" step="1" data-pp-cmin value="${pf.cripto_min != null ? esc(pf.cripto_min) : ''}" placeholder="—" aria-label="Mínimo de cripto"></label>` : '';
    h += `<div class="pp-op${on ? '' : ' off'}" data-op="${k}"><div class="pp-op-t"><span class="pp-chip pp-e-${etq === 'Nuevo' ? 'nuevo' : etq === 'Mejorado' ? 'mej' : 'ya'}">${etq}</span><b>${t}</b><p>${d}</p><small>Se apoya en ${datos} · confianza habitual: ${conf}</small>${umbral ? `<div class="seg2 pp-param" role="group" aria-label="Umbral de la caída">${[10, 15, 20].map((p) => `<button type="button" data-pp-caida="${p}" aria-pressed="${umbralCaida() === p}">${p} %</button>`).join('')}</div>` : ''}${extra}</div><button type="button" class="pp-sw" role="switch" aria-checked="${on}" data-pp-op="${k}" aria-label="${esc(t)}"><i></i></button></div>`;
  }
  return h + '</div>';
}

/* ---------- la página ---------- */
function pintarPasoMes() {
  const el = $('#panelPaso'); if (!el || !S.cartera) return;
  const M = S.M || calcular();
  if (!pasoVisible()) { el.innerHTML = ''; return; }
  const R = mesRuta(M), P = R.P, n = pendientesMes(R), plazo = S.rutaPlazo || 'mes';
  const cab = `<div class="vista-cab pp-cab"><div><h1>Paso a paso</h1><p>Qué hacer este mes, en orden. Toca un paso para ver por qué y cómo.</p></div><button type="button" class="btn peq pp-b-opc" data-pp-sub="opciones">${PP_ICO.ajuste}<span>Qué mira cada mes</span></button></div>`;
  if (S.ppSub === 'opciones') { el.innerHTML = cab + ppHtmlOpciones(M); return; }
  const cuenta = (k) => (k === 'mes' ? n : P[k].filter((x) => !x.espera && !x.auto && !x.hecho).length);
  const plazos = `<div class="ruta-barra-top"><div class="plazos" role="group" aria-label="Plazo">${PLAZOS.map(([k]) => `<button data-plazo="${k}" aria-pressed="${plazo === k}">${PLAZO_CORTO[k]}${cuenta(k) ? `<span class="cuenta">${cuenta(k)}</span>` : ''}</button>`).join('')}</div></div>`;
  const hasta = { seis: `hasta ${MESES[new Date(Date.now() + 183 * 864e5).getMonth()]}`, anio: `hasta ${MESES[new Date().getMonth()]} de ${new Date().getFullYear() + 1}`, largo: `hasta ${new Date().getFullYear() + 5}` };
  el.innerHTML = `${cab}${plazos}<div class="ruta ruta2 pp-ruta" data-sel="${esc(plazo)}">${ppHtmlMes(R, M)}${PLAZOS.slice(1).map(([k, t]) => `<section class="rcol" data-p="${k}"><header class="rcol-cab"><h2>${t}</h2><span class="k">${hasta[k]}</span></header>${ppHtmlOtro(k, P, M)}</section>`).join('')}</div>`;
  try { ppRegistrar(R); } catch (e) { console.warn(e); }
}
// lo que se toca en la página (marcar hecho va por data-ruta, como siempre)
document.addEventListener('click', (e) => {
  const t = e.target.closest && e.target.closest('[data-pp-paso],[data-pp-abre],[data-pp-salida],[data-pp-sub],[data-pp-op],[data-pp-caida],[data-pp-posp],[data-pp-reintentar],[data-pp-dec]');
  if (!t || !$('#panelPaso')) return;
  const d = t.dataset, r = ppRuta();
  if (d.ppPaso != null) {
    const li = t.closest('.tarea'), ab = !li.classList.contains('abierto');
    (S.ppAbiertos = S.ppAbiertos || {})[d.ppPaso] = ab; li.classList.toggle('abierto', ab); t.setAttribute('aria-expanded', String(ab)); $('.pp-det', li).hidden = !ab;
  } else if (d.ppAbre != null) {
    const ab = t.getAttribute('aria-expanded') === 'true'; t.setAttribute('aria-expanded', String(!ab)); t.nextElementSibling.hidden = ab;
  } else if (d.ppSalida != null) {
    const s = r.salidas = r.salidas || {}, i = +d.i;
    if (s[d.ppSalida] === i) delete s[d.ppSalida]; else s[d.ppSalida] = i;
    for (const b of $$(`[data-pp-salida="${CSS.escape(d.ppSalida)}"]`)) b.setAttribute('aria-pressed', String(s[d.ppSalida] === +b.dataset.i));
    ppGuardar();
  } else if (d.ppSub != null) {
    S.ppSub = d.ppSub; pintarPasoMes(); scrollTo(0, 0);
  } else if (d.ppOp != null) {
    const o = r.ops = r.ops || {}; o[d.ppOp] = !opRuta(d.ppOp);
    if (S.M) { cacheDe(S.M, '__ruta').delete('r'); cacheDe(S.M, '__mes').delete('m'); }
    pintarPasoMes(); pintarPasoTop(); ppGuardar('Paso a paso: opciones');
  } else if (d.ppCaida != null) {
    r.caida = +d.ppCaida; if (S.M) { cacheDe(S.M, '__ruta').delete('r'); cacheDe(S.M, '__mes').delete('m'); }
    pintarPasoMes(); ppGuardar('Paso a paso: opciones');
  } else if (d.ppPosp != null) {
    const p = r.pospuestos = r.pospuestos || {}; p[d.ppPosp] = sumarMeses(hoyIso().slice(0, 8) + '01', 1).slice(0, 7);
    for (const [k, v] of Object.entries(p)) if (v < hoyIso().slice(0, 7)) delete p[k];
    if (S.M) cacheDe(S.M, '__mes').delete('m');
    toast('Lo verás el mes que viene.'); pintar(); ppGuardar();
  } else if (d.ppDec != null) {
    // «¿Lo hago o no?»: sí, a «Haz esto»; no, apartada; vacío, deshacer. Lo de hace más de un año se borra
    const dc = r.decide = r.decide || {};
    if (d.v) dc[d.ppDec] = { v: d.v, d: hoyIso() }; else delete dc[d.ppDec];
    const lim = sumarDias(hoyIso(), -400); for (const [k, v] of Object.entries(dc)) if (!v || v.d < lim) delete dc[k];
    if (S.M) { cacheDe(S.M, '__ruta').delete('r'); cacheDe(S.M, '__mes').delete('m'); }
    toast(d.v === 'si' ? 'Pasa a «Haz esto».' : d.v === 'no' ? 'Apartada: no vuelve a salir.' : 'Vuelve a «¿Lo hago o no?».'); pintar(); ppGuardar('Paso a paso: decisión');
  } else if (d.ppReintentar != null) {
    if (navigator.onLine !== false) location.reload(); else toast('Sigue sin conexión.');
  }
});
// el reparto objetivo por fondo y el mínimo de cripto: al salir del campo
document.addEventListener('change', (e) => {
  const t = e.target; if (!t || !t.closest || !t.closest('#panelPaso')) return;
  const pf = S.cartera.perfil = S.cartera.perfil || {}, v = t.value.trim() === '' ? null : Math.max(0, Math.min(100, +String(t.value).replace(',', '.') || 0));
  if (t.dataset.ppRep != null) { const r = { ...(pf.reparto_fondos || {}) }; if (v == null) delete r[t.dataset.ppRep]; else r[t.dataset.ppRep] = v; pf.reparto_fondos = r; }
  else if (t.dataset.ppCmin != null) { if (v == null) delete pf.cripto_min; else pf.cripto_min = v; }
  else return;
  if (S.M) { cacheDe(S.M, '__ruta').delete('r'); cacheDe(S.M, '__mes').delete('m'); }
  pintarPasoTop(); ppGuardar('Paso a paso: tu reparto');
});
/* lo de Hacienda va a la vista en cada paso; el cómo, plegado */
function masRuta(x, conHecho) {
  // lo de Hacienda, en una frase; si es largo, el resto plegado
  let impC = x.imp || '', impR = '';
  if (impC.replace(/<[^>]+>/g, '').length > 170) {
    // se corta en la primera frase que acabe después del carácter 40 (con 80, si la primera era corta no se plegaba nada)
    const k = impC.indexOf('. ', 40), c = k > 0 ? impC.slice(0, k + 1) : '';
    const abiertas = (c.match(/<(b|i|a|span)\b/g) || []).length, cerradas = (c.match(/<\/(b|i|a|span)>/g) || []).length;
    if (c && abiertas === cerradas && impC.length - c.length > 30) { impR = impC.slice(k + 2); impC = c; }
  }
  const hac = x.imp && !x.hecho ? `<div class="t-imp">${ICONO_PASO.fiscal}<span><b>Hacienda:</b> ${impC}${impR ? `<details class="imp-mas"><summary>Más sobre Hacienda</summary><span>${impR}</span></details>` : ''}</span></div>` : '';
  const hecho = conHecho ? `<button type="button" class="t-hecho" data-ruta="${esc(x.id)}" aria-pressed="${x.hecho}">${x.hecho ? 'Hecho. Deshacer' : '✓ Marcar como hecho'}</button>` : '';
  if (!x.como && !(x.acc && !x.hecho) && !hecho) return hac;
  return `${hac}<div class="t-pie">${x.como && !x.hecho ? `<details class="paso-mas"><summary>Cómo hacerlo</summary><div class="t-como">${x.como}</div></details>` : ''}${x.acc && !x.hecho ? `<span class="ruta-acc">${x.acc}</span>` : ''}${hecho}</div>`;
}
function htmlFechaRuta(x) {
  const d = x.d ? deIso(x.d) : null;
  return `<li class="rfecha${x.hecho ? ' hecho' : ''}">
    <span class="rf-d">${d ? `<b>${d.getDate()}</b><small>${MESES[d.getMonth()]}</small>` : `<small>${esc(x.cuando || '')}</small>`}</span>
    <div class="t-c"><b class="t-t">${x.t.replace(/ €/g, ' €')}</b>${x.como ? `<p class="rf-que"><b>Qué hacer ese día:</b> ${x.como}</p>` : ''}${x.pq || x.det ? `<p class="t-pq">${x.pq || x.det}</p>` : ''}${masRuta({ ...x, como: '' })}</div>
    ${checkRuta(x, '')}
  </li>`;
}
function htmlSoloRuta(x) {
  return `<li class="rsolo">
    <span class="rs-ico" aria-hidden="true">${ICONO_PASO[tipoPaso(x).i] || ''}</span>
    <div class="t-c">${x.cuando ? `<span class="t-cuando">${esc(x.cuando)}</span>` : ''}<b class="t-t">${x.t.replace(/ €/g, ' €')}</b>${x.det || x.pq ? `<p class="t-pq">${x.det || x.pq}</p>` : ''}${x.como ? `<p class="t-pq k">${x.como}</p>` : ''}${x.acc ? `<span class="ruta-acc">${x.acc}</span>` : ''}</div>
  </li>`;
}
// el reparto objetivo por fondo (va con la cartera, cifrado): { id del fondo: % de la cartera }
const repartoFondos = () => { const r = S.cartera && S.cartera.perfil && S.cartera.perfil.reparto_fondos; return r && typeof r === 'object' && Object.keys(r).length ? r : null; };
const pesoInst = (M, id) => (M.total ? (sum(M.filas.filter((f) => f.inst.id === id), (f) => f.valor) / M.total) * 100 : 0);
const valorInst = (M, id) => sum(M.filas.filter((f) => f.inst.id === id), (f) => f.valor);
