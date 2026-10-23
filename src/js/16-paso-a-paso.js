/* =========================== Análisis =========================== */
/* cuatro pestañas: qué hacer, lo que opina la IA, tus números (cinco vistas) y la fiscalidad */
const ANALISIS_P = [['ia', 'GrowIA opina'], ['numeros', 'Tus números']];
const NUM_T = { rent: ['Rentabilidad', 'lo que ha dado cada posición en 1 y 3 meses, en lo que va de año, a 1, 3, 5 y 10 años y año a año'], riesgo: ['Riesgo', 'tu peor caída y cuánto tardó en recuperarse, y cuánto se mueve cada posición'], costes: ['Costes y dividendos', 'gastos de los fondos y lo que cobrarás de dividendos, mes a mes'], dentro: ['Por dentro', 'si se pisan tus fondos y las empresas en las que tienes más dinero'], apuestas: ['Tus acciones frente al índice', 'cada acción comparada con el mismo dinero en el S&P 500'] };
const NUMEROS = ['rent', 'riesgo', 'costes', 'dentro', 'apuestas'];
const ANALISIS = [['ruta', 'Paso a paso'], ['ia', 'GrowIA opina'], ['rent', 'Rentabilidad'], ['riesgo', 'Riesgo'], ['costes', 'Costes y dividendos'], ['dentro', 'Por dentro'], ['apuestas', 'Acciones sueltas'], ['impuestos', 'Hacienda']];
/* =====================================================================
   Paso a paso: qué hacer con la cartera este mes, en 6 meses, en un año y de 1 a 5 años.
   Los pasos de la web salen de sus cálculos (planes de venta, fechas, impuestos, aportaciones y
   proyección) y se recalculan con cada precio; los de la IA salen de su última revisión.
   Lo que marques como hecho se guarda en tu cartera cifrada.
   ===================================================================== */
const PLAZOS = [['mes', 'Este mes'], ['seis', 'Próximos 6 meses'], ['anio', 'Próximo año'], ['largo', 'De 1 a 5 años']];
const PLAZO_CORTO = { mes: 'Este mes', seis: '6 meses', anio: '1 año', largo: '1 a 5 años' };
function plazoDe(d) {
  if (!d) return null;
  const n = diasEntre(hoyIso(), d);
  return n <= 31 ? 'mes' : n <= 183 ? 'seis' : n <= 366 ? 'anio' : 'largo';
}
/* dos pasos dicen lo mismo si hablan de la misma empresa y de lo mismo (resultados, revisar, vender, comprar…), o si
   comparten casi todas sus palabras con sentido */
const PALABRAS_VACIAS = new Set('para con los las del que por una uno unos unas sus tus este esta como cada desde hasta sobre entre antes despues después tienes tiene'.split(' '));
function pasosParecidos(a, b) {
  const pal = (t) => new Set(normTxt(String(t || '').replace(/<[^>]+>/g, ' ')).split(/[^a-z0-9]+/).filter((w) => w.length > 3 && !PALABRAS_VACIAS.has(w)));
  const A = pal(a), B = pal(b);
  if (!A.size || !B.size) return false;
  const comunes = [...A].filter((w) => B.has(w)).length;
  if (comunes / Math.min(A.size, B.size) >= 0.6) return true;
  const temas = [['resultados'], ['revisa', 'repasa'], ['vende', 'vender'], ['compra', 'comprar'], ['dividendo']];
  const nombres = ((S.M && S.M.filas) || []).map((f) => normTxt(f.inst.corto)).filter((n) => n.length > 2);
  const empresa = nombres.find((n) => normTxt(a).includes(n) && normTxt(b).includes(n));
  const revisarAcciones = (S2) => S2.has('revisa') && ['accion', 'acciones', 'apuestas'].some((w) => S2.has(w));
  if (revisarAcciones(A) && revisarAcciones(B)) return true;
  return !!empresa && temas.some((ts) => ts.some((t) => A.has(t)) && ts.some((t) => B.has(t)));
}
function pasosRuta(M) {
  // 0.5: en el modo público no hay Paso a paso (ni nada sacado de él: lo que toca en Inicio, el widget, el resumen del día)
  if (esPublico()) return { mes: [], seis: [], anio: [], largo: [] };
  // un segundo vale: si cambias algo del paso a paso se vuelve a pintar con un cálculo nuevo
  const c = cacheDe(M, '__ruta'), x = c.get('r');
  if (x && performance.now() - x.t < 1000) return x.v;
  const v = pasosRuta0(M); c.set('r', { v, t: performance.now() });
  return v;
}
function pasosRuta0(M) {
  const P = { mes: [], seis: [], anio: [], largo: [] };
  const hoy = hoyIso(), anio = new Date().getFullYear();
  const add = (plazo, o) => P[plazo].push({ fuente: 'web', ...o });
  const planes = M.filas.map((f) => planVenta(f, M)).filter(Boolean);
  // 1. ventas que propone la web
  for (const pl of planes) {
    const f = pl.f, p = f.p || {}, res = p.proximos_resultados && p.proximos_resultados >= hoy && diasEntre(hoy, p.proximos_resultados) <= 31 ? p.proximos_resultados : null;
    const destino = [pl.aColchon > 0.5 ? `${eur(pl.aColchon, 0)} a tu colchón` : '', pl.aIdea > 0 && pl.ideas[0] ? `${eur(pl.aIdea, 0)} a ${esc(nombreRadar(pl.ideas[0]))}` : '', pl.aNucleo > 0.5 ? `${eur(pl.aNucleo, 0)} ${nucleo(M).a}` : ''].filter(Boolean).join(IDIOMA === 'en' ? ' and ' : ' y ');
    add('mes', { id: `venta:${f.pos.id}:${anio}-${new Date().getMonth()}`, urgente: true, d: res ? sumarDias(res, -1) : hoy, cuando: res ? `antes del ${fechaCorta(res)}` : 'ya',
      t: `${pl.nivel === 'vender' ? 'Vende' : 'Vende parte de'} ${esc(f.inst.corto)}: ${oc(fmtNum(pl.uds, pl.accion && esEntero(pl.uds) ? 0 : f.inst.clase === 'Cripto' ? 4 : 2))} ${pl.accion ? 'acciones' : f.inst.clase === 'Cripto' || f.inst.tipo === 'ETC' ? 'unidades' : 'participaciones'}, unos ${eur(pl.importe, 0)}`,
      pq: esc(f.senal.motivos[0] || ''),
      como: `${esc(pl.cuando[0].replace(/^(Ya|Now): /, '').replace(/^./, (c) => c.toUpperCase()))}${destino ? L(` Con lo que cobres: ${destino}.`, ` With what you collect: ${destino}.`) : ''}`,
      imp: `${pl.ganancia > 0 ? L(`Declaras ${eurS(pl.ganancia, 0)} de ganancia: unos ${eur(pl.impuesto, 0)} en la renta de ${anio}, que se paga entre abril y junio de ${anio + 1}. Déjalos en efectivo hasta entonces. Como vendes con ganancia, puedes volver a comprarla cuando quieras.`, `You declare a gain of ${eurS(pl.ganancia, 0)}: about ${eur(pl.impuesto, 0)} in your ${anio} tax return, paid between April and June ${anio + 1}. Keep it in cash until then. Since you're selling at a gain, you can buy it back whenever you like.`) : `${L(`Declaras una pérdida de ${eur(-pl.ganancia, 0)}: resta de tus ganancias del año.`, `You declare a loss of ${eur(-pl.ganancia, 0)}: it reduces this year's gains.`)} ${(() => { const l = libreRecompra(f.inst, res ? sumarDias(res, -1) : hoy); return l ? L(`No la recompres hasta el ${fechaLarga(l)}: ${reglaRecompra(f.inst).corto}`, `Don't buy it back until ${fechaCortaL(l)} ${l.slice(0, 4)}: ${trad(reglaRecompra(f.inst).corto)}`) : reglaRecompra(f.inst).corto; })()}`}`,
      acc: `<a class="enlace" href="#expertos" data-exp="resumen">Ver el plan completo</a>` });
    const top = pl.ideas[0], dVenta = res ? sumarDias(res, -1) : hoy;
    if (pl.aColchon > 0.5) add('mes', { id: `colchonv:${pl.f.pos.id}:${anio}-${new Date().getMonth()}`, urgente: true, d: dVenta, cuando: 'después de vender', t: `Pon ${eur(pl.aColchon, 0)} en tu colchón`,
      pq: `Te faltan ${eur(faltaColchon(M), 0)} para los meses de gastos que te pusiste: va antes que meter más en bolsa.`,
      como: 'Déjalo en el efectivo remunerado de tu bróker o en un fondo monetario: no baja y lo tienes cuando lo necesites.' });
    if (pl.aIdea > 0 && top) {
      const e = esperadaRadar(top), tasa = tasaRadar(top), fis = fiscalidadSede(origenRadar(top).sede);
      add('mes', { id: `compra:${top.s}:${anio}-${new Date().getMonth()}`, urgente: true, d: dVenta, cuando: 'después de vender', t: `Compra ${eur(pl.aIdea, 0)} de ${esc(nombreRadar(top))}`,
        pq: `De las ${radarVals().length} empresas del radar, la mejor contrastada para una acción nueva que no repita lo que ya tienes: ${top.ctr.favor} de ${top.ctr.total} señales a favor. ${e ? planTxt(e) : ''}`,
        como: `En ${esc(pl.f.pos.plataforma || 'Trade Republic')}: busca ${esc(nombreRadar(top))} (${esc(top.s)}), Comprar, orden limitada a ${precioR(top.p, top.m)} (el precio de ahora) por unos ${eur(pl.aIdea, 0)}. Ponle tu regla de salida en su ficha cuando la tengas.`,
        imp: `${tasa ? `Al comprar, ${fmtNum(tasa.tipo * 100, 1)} % de ${esc(tasa.nombre)} (unos ${eur(pl.aIdea * tasa.tipo, 0)}).` : 'Sin tasa al comprar.'} ${esc(fis.txt)}`,
        acc: `<button class="enlace" data-accion="asesor" data-q="${esc(`Voy a comprar ${eur(pl.aIdea, 0)} de ${top.n} (${top.s}) con lo que saque de ${pl.f.inst.corto}. Contrástalo con las noticias de esta semana: ¿lo hago, a qué precio y con qué regla de salida?`)}">Que GrowIA la contraste antes</button>` });
    }
    if (pl.aNucleo > 0.5) add('mes', { id: `nucleo:${pl.f.pos.id}:${anio}-${new Date().getMonth()}`, urgente: true, d: dVenta, cuando: 'después de vender', t: L(`Mete ${eur(pl.aNucleo, 0)} ${nucleo(M).a.replace(/^a /, 'en ')}`, `Put ${eur(pl.aNucleo, 0)} ${nucleo(M).a.replace(/^to /, 'into ')}`),
      pq: pl.nivel === 'reducir' ? L('Bajas riesgo sin dejar de estar invertido.', 'You lower risk without stopping being invested.') : pl.aIdea > 0 ? L('La otra parte, a lo seguro.', 'The other part, somewhere safe.') : L('Tus acciones sueltas no tienen más hueco dentro de tu límite.', 'Your individual stocks have no more room within your limit.'),
      como: (() => { const nf = (S.M && S.M.filas || []).filter((f) => f.inst.tipo === 'Fondo indexado' && f.inst.clase === 'Renta variable').sort((x, y) => y.valor - x.valor)[0]; const de = pl.f.pos.plataforma, a = nf && nf.pos.plataforma; return nf ? (a && de && a !== de ? `Pasa el dinero de ${de} a ${a} y compra participaciones de ${nf.inst.corto}.` : `Compra participaciones de ${nf.inst.corto}${a ? ` en ${a}` : ''}.`) : 'Elige un fondo indexado de todo el mundo con comisión baja (en Mercados puedes buscarlo) y compra participaciones.'; })(), imp: 'Fondo de acumulación: no paga nada hasta que vendas, y entre fondos ni eso (traspaso).' });
  }
  // 2. tus reglas de salida cerca
  for (const f of M.filas) {
    const stop = +f.pos.stop;
    if (stop && f.precio && f.precio > stop && (f.precio / stop - 1) * 100 < 6) add('mes', { id: `stop:${f.pos.id}:${hoy.slice(0, 7)}`, urgente: true, cuando: 'vigila', t: `${esc(f.inst.corto)} está a un ${fmtNum((f.precio / stop - 1) * 100, 1)} % de tu precio de salida`, pq: `Tu regla de salida: si cierra por debajo de ${precioFmt(stop)}, la tesis se ha roto y se vende.`, como: `En ${esc(f.pos.plataforma || 'tu bróker')}: orden stop de venta a ${precioFmt(stop)} para toda la posición, si no la tienes ya.` });
  }
  // 3. fechas de tus empresas: resultados y dividendos
  const vistos = new Set();
  for (const f of M.filas) {
    if (vistos.has(f.inst.id)) continue; vistos.add(f.inst.id);
    const p = f.p || {};
    if (p.proximos_resultados && p.proximos_resultados >= hoy) {
      const pz = plazoDe(p.proximos_resultados);
      if (pz === 'mes' || pz === 'seis') add(pz, { id: `res:${f.inst.id}:${p.proximos_resultados}`, d: p.proximos_resultados, cuando: fechaCorta(p.proximos_resultados), t: `Resultados de ${esc(f.inst.corto)}`, pq: 'Es el día que más se mueve: se ve si la razón por la que la compraste sigue en pie.', como: `Ese día abre su ficha: mira cómo reacciona el precio, si suben o bajan las previsiones y si los analistas cambian el objetivo. Si rompe tu salida${+f.pos.stop ? ` (${precioFmt(+f.pos.stop)})` : ''}, vende.`, acc: `<button class="enlace" data-pos="${esc(f.pos.id)}">Abrir su ficha</button>` });
    }
    if (p.ex_dividendo && p.ex_dividendo >= hoy && p.dividendo_pct) {
      const pz = plazoDe(p.ex_dividendo);
      if (pz === 'mes' || pz === 'seis') add(pz, { id: `div:${f.inst.id}:${p.ex_dividendo}`, d: p.ex_dividendo, cuando: fechaCorta(p.ex_dividendo), t: `Dividendo de ${esc(f.inst.corto)}`, ...(() => { const bruto = (f.valor * p.dividendo_pct) / 100 / (f.inst.pais === 'GB' || f.inst.pais === 'US' ? 4 : 2), fis = fiscalidadSede(f.inst.pais, f.inst.tipo), neto = bruto * (1 - tramoAhorro() - (fis.pierde || 0) / 100); return { pq: `Unos ${eur(bruto, 0)} brutos, ${eur(neto, 0)} netos tras impuestos.`, como: `Nada: si la tienes al cierre del ${fechaLarga(sumarDias(p.ex_dividendo, -1))}, cobras. No compres más solo por el dividendo: ese día el precio baja más o menos lo que paga.`, imp: esc(fis.txt.replace(/^Dividendos: /, '')) }; })() });
    }
  }
  // 4. datos que le faltan a la web
  const fa = fiscalAnio(anio);
  if (!fa.otras && !fa.rcm) add('mes', { id: `fiscal:${anio}`, cuando: 'cuando puedas', t: `Apunta tus datos fiscales de ${anio}`, pq: 'Sin ellos, el impuesto de cada consejo de GrowFolio sale más alto o más bajo de lo que es.', como: 'En Análisis > Hacienda, botón «Datos fiscales»: las ventas que hiciste fuera de GrowFolio (ganancia o pérdida), los dividendos e intereses cobrados y lo que ya te retuvieron. Son dos minutos.', acc: `<button class="enlace" data-accion="fiscal">Apuntarlos</button>` });
  const est = M.filas.filter((f) => f.estimada);
  if (est.length) add('mes', { id: `exactas:${est.map((f) => f.pos.id).join(',')}`, cuando: 'cuando puedas', t: `Pon las participaciones exactas de ${est.length === 1 ? esc(est[0].inst.corto) : `${est.length} posiciones`}`, pq: L(`${esc(yLista(est.map((f) => f.inst.corto)))} están estimadas: con las exactas cuadran al céntimo el valor, la ganancia y los impuestos.`, `${esc(yLista(est.map((f) => f.inst.corto)))} are estimated: with the exact figures the value, the gain and the taxes match to the cent.`), como: 'Mira las participaciones en la app de tu bróker y ponlas en su ficha > Editar > Cantidad.', acc: `<a class="enlace" href="#plan">Ir a Plan y movimientos</a>` });
  // 5. aportaciones automáticas
  const act = aportacionesActivas();
  const total = sum(act, ({ a }) => +a.importe || 0);
  if (total > 0) {
    const prox = act.flatMap(({ a }) => fechasAportacion({ ...a, desde: a.desde > hoy ? a.desde : hoy }, iso(new Date(Date.now() - 86400000)), iso(new Date(Date.now() + 30 * 86400000))).slice(0, 1).map((d) => ({ d, a }))).sort((x, y) => (x.d < y.d ? -1 : 1));
    if (prox.length) add('mes', { id: `aport:${prox[0].d}`, d: prox[0].d, cuando: fechaCorta(prox[0].d), auto: true, t: `Entran ${eur(sum(prox, (x) => +x.a.importe || 0), 0)} de tus aportaciones`, det: `${esc([...new Set(prox.map((x) => IDIOMA === 'en' ? `${nombreInst(x.a.instrumento)} on ${trad(fechaCorta(x.d))}` : `${nombreInst(x.a.instrumento)} el ${fechaCorta(x.d)}`))].join(', '))}.`, como: 'Van solas: solo comprueba el día antes que tienes saldo en la cuenta.' });
    add('seis', { id: `aport6:${hoy.slice(0, 7)}`, cuando: 'cada mes', auto: true, t: `Sigue aportando: ${eur(total * 6, 0)} en 6 meses`, det: `Son ${eur(total, 0)} al mes. No las pares si la bolsa cae: comprar barato en las caídas es lo que más suma a largo plazo.` });
  }
  // 6. fin de año: compensar pérdidas
  // 0.3.9: cuentan todas las ventas que propone GrowFolio, también las que dan pérdida; y si ya propone vender una
  // parte de una posición en pérdidas, lo que se sugiere aquí es el resto (antes salía la pérdida entera dos veces)
  const ganPrevista = sum(planes, (pl) => pl.ganancia);
  const perdidas = restoEnPerdidas(M, planes);
  if (perdidas.length && new Date().getMonth() >= 6) {
    const base = fa.gp + ganPrevista;
    for (const x of perdidas) {
      const ahorro = fiscalAnio(anio, ganPrevista).cuota - fiscalAnio(anio, ganPrevista + x.g).cuota;
      if (ahorro < 15) continue;
      const cripto = x.f.inst.clase === 'Cripto';
      add('seis', { id: `perdida:${x.f.pos.id}:${anio}`, d: `${anio}-12-15`, cuando: `antes del 31 dic`, t: `Plantéate vender ${x.resto ? 'el resto de ' : ''}${esc(x.f.inst.corto)} con pérdidas para pagar menos`, pq: `Pierde ${eur(-x.g, 0)}. Venderlo este año ${base > 0 ? `resta de tus ganancias${ganPrevista ? ` (contando ${planes.length > 1 ? 'las ventas que propone' : 'la venta que propone'} GrowFolio)` : ''}` : (comunidadUsuario() === 'paisvasco' ? 'quedaría para compensar ganancias de los 4 años siguientes' : 'compensa hasta un 25 % de tus dividendos')}.`, como: cripto ? `Véndelo en ${esc(x.f.pos.plataforma || 'tu plataforma')} antes del 31 de diciembre. Si quieres seguir dentro, lo más seguro es comprar otra cripto distinta o esperar.` : `Véndela antes del 31 de diciembre${/^Fondo/.test(x.f.inst.tipo || '') ? '. Si quieres seguir invertido, véndelo (reembolso, no traspaso: con un traspaso la pérdida no cuenta) y compra otro fondo parecido de otra gestora' : ' y, si quieres seguir dentro, compra otra empresa o un ETF parecido, no la misma'}.`, imp: `Unos ${eur(ahorro, 0)} menos en la renta de ${anio}. ${cripto ? reglaRecompra(x.f.inst).corto : `No vuelvas a comprar${/^Fondo/.test(x.f.inst.tipo || '') ? ' ese mismo fondo' : 'la'} hasta pasado ${reglaRecompra(x.f.inst).plazo === 'un año' ? 'un año' : 'dos meses'} de la venta (ni la hayas comprado en ${reglaRecompra(x.f.inst).plazo === 'un año' ? 'el año' : 'los dos meses'} anterior${reglaRecompra(x.f.inst).plazo === 'un año' ? '' : 'es'}). ${reglaRecompra(x.f.inst).corto}`}`, acc: `<button class="enlace" data-accion="asesor" data-q="${esc(`¿Me compensa vender ${x.f.inst.corto} con pérdidas antes de fin de año? Calcúlalo con mis ventas de este año.`)}">Pregúntale a GrowIA</button>` });
    }
  }
  // 7. colchón que rinde poco
  for (const f of M.filas.filter((f) => f.inst.clase === 'Renta fija' && /^Fondo/.test(f.inst.tipo || ''))) {
    const r1 = f.p && f.p.rent && f.p.rent['1a'];
    if (r1 != null && r1 < 2) add('seis', { id: `colchon:${f.pos.id}:${anio}`, cuando: 'sin prisa', t: `Mira si te compensa cambiar ${esc(f.inst.corto)} por un monetario`, pq: `Ha dado un ${fmtNum(r1, 1)} % en un año, menos que un fondo monetario, que va pegado al tipo del BCE.`, como: `En ${esc(f.pos.plataforma || 'tu bróker')}: traspasa desde ${esc(f.inst.corto)} a un fondo monetario. Pregúntale a GrowIA cuál antes.`, imp: 'Entre fondos es un traspaso: no pagas nada.', acc: `<button class="enlace" data-accion="asesor" data-q="${esc(`¿Qué fondo monetario${f.pos.plataforma ? ` de ${f.pos.plataforma}` : ''} me conviene para el colchón en vez de ${f.inst.nombre || f.inst.corto}? Compara rentabilidad y gastos.`)}">Pregúntale a GrowIA</button>` });
  }
  // 8. renta y modelos informativos: de enero a junio, la renta que toca es la del año pasado
  const aR = new Date().getMonth() < 6 ? anio - 1 : anio;
  const informe = `${aR + 1}-02-15`, renta = `${aR + 1}-04-08`;
  add(plazoDe(informe) || 'seis', { id: `informe:${aR}`, d: informe, cuando: 'enero-febrero', t: `Descarga el informe fiscal de ${aR} de tus brókeres`, pq: 'Trae tus ventas, dividendos e intereses del año tal y como los ve Hacienda.', como: `Cada uno lo publica en su app o su web${M.filas.some((f) => f.pos.plataforma === 'Trade Republic') ? ' (en Trade Republic: Perfil, Impuestos)' : ''}. Compáralo con Análisis > Hacienda antes de hacer la renta.` });
  add(plazoDe(renta) || 'seis', { id: `renta:${aR}`, d: renta, cuando: 'abril-junio', t: `Haz la renta de ${aR}`, pq: `Con lo que llevas, unos ${eur(fiscalAnio(aR, aR === anio ? ganPrevista : 0).cuota, 0)} a pagar por tus ganancias${ganPrevista && aR === anio ? ` contando ${planes.length > 1 ? 'las ventas que propone' : 'la venta que propone'} GrowFolio` : ''}${fa.retenido ? `, menos ${eur(fa.retenido, 0)} ya retenidos` : ''}.`, como: 'En Renta Web, revisa que el borrador tenga tus ventas, dividendos e intereses; si falta algo, añádelo con los informes de tus brókeres. Los dividendos extranjeros llevan la deducción por doble imposición.', acc: '<a class="enlace" href="#renta">Ver la guía de la renta</a>' });
  const b720 = bloques720(M), m720 = Math.max(b720.valores, b720.cuentas);
  if (m720 > 40000) add('seis', { id: `m720:${aR}`, d: `${aR + 1}-03-15`, cuando: 'antes del 31 mar', t: m720 > 50000 ? 'Presenta el modelo 720' : 'Vigila el modelo 720', det: `Tienes ${eur(b720.valores, 0)} en valores y ${eur(b720.cuentas, 0)} en efectivo en brókeres de fuera de España. Si a 31 de diciembre cualquiera de los dos pasa de 50.000 €, hay que declararlo entre enero y marzo (modelo 720); los años siguientes, solo si ese bloque sube más de 20.000 €.` });
  // 9. ideas si hay hueco y no hay ya una venta que lo use
  const sueltas = sum(M.filas.filter((f) => f.inst.tipo === 'Acción'), (f) => f.valor);
  const lim = (+(S.cartera.limite_acciones ?? 20) / 100) * M.total;
  const top = mejoresIdeas(M).find((x) => x.ctr.favor >= 4);
  if (!planes.length && top && lim - sueltas >= 500) add('mes', { id: `idea:${top.s}:${hoy.slice(0, 7)}`, cuando: 'sin prisa', t: `Si quieres comprar una acción nueva: ${esc(nombreRadar(top))}`, pq: `Es la mejor contrastada del radar (${top.ctr.favor} de ${top.ctr.total} señales a favor)${(() => { const e = rentaEsperada(top, top.pot, 12); return e ? `: si llega al objetivo en 12 meses, te quedarías un ${pctS(e.netoP, 0)} después de impuestos` : ''; })()}. Te caben ${eur(lim - sueltas, 0)} en acciones sueltas.`, como: 'Antes de comprar, que la IA la contraste con las noticias de la semana y te diga cuánto meter.', acc: `<button class="enlace" data-accion="asesor" data-q="${esc(`¿Compro ${top.n} (${top.s})? Contrástalo con las noticias y dime cuánto meter, desde dónde y con qué impuesto.`)}">Pídele a GrowIA que la contraste</button>` });
  // 10. a un año y más: proyección, hueco que se abre y revisión
  let pr = null; try { pr = proyeccion(M); } catch (e) {}
  if (pr) {
    add('anio', { id: `proy1:${hoy.slice(0, 7)}`, cuando: 'en un año', auto: true, t: `Si sigues así, lo probable es tener ${euCorto(pr.p50[12])}`, det: `Entre ${euCorto(pr.p10[12])} si va mal y ${euCorto(pr.p90[12])} si va bien, ${pr.aportado[12] - pr.aportado[0] > 1 ? `partiendo de lo que tienes y aportando ${euCorto(pr.aportado[12] - pr.aportado[0])} más` : 'partiendo de lo que tienes, sin aportar más'}.`, acc: '<a class="enlace" href="#proyeccion">Ver la proyección</a>' });
    const metas = META_HITOS.map((m) => ({ m, i: pr.p50.findIndex((x) => x >= m) })).filter((x) => x.i > 0 && x.i <= 60);
    for (const x of metas) add('largo', { id: `hito:${x.m}`, d: pr.fechas[x.i], cuando: `${MESES[deIso(pr.fechas[x.i]).getMonth()]} ${pr.fechas[x.i].slice(0, 4)}`, auto: true, t: `Llegas a ${euCorto(x.m)}`, det: `Es lo probable con tus aportaciones de hoy. Si va mal, en ${pr.p10.findIndex((v) => v >= x.m) > 0 ? pr.fechas[pr.p10.findIndex((v) => v >= x.m)].slice(0, 4) : 'más tiempo'}.` });
  }
  if (total > 0 && M.total) {
    const aAcc = sum(act.filter(({ a }) => (S.inst[a.instrumento] || {}).tipo === 'Acción'), ({ a }) => +a.importe || 0);
    const s12 = sueltas + aAcc * 12, pct12 = (s12 / (M.total + total * 12)) * 100, pct0 = M.total ? (sueltas / M.total) * 100 : 0, limP = +(S.cartera.limite_acciones ?? 20);
    if (sueltas && pct12 < pct0 - 0.3) add('anio', { id: `hueco:${hoy.slice(0, 7)}`, cuando: 'en un año', auto: true, t: `Tus acciones sueltas bajarán al ${fmtNum(pct12, 1)} % de la cartera`, det: `Porque casi todo lo que aportas va a fondos${aAcc ? ` (a acciones sueltas solo van ${eur(aAcc, 0)} al mes)` : ''}. Con tu límite del ${fmtNum(limP, 0)} %, tendrás unos ${eur(Math.max(0, (limP / 100) * (M.total + total * 12) - s12), 0)} de hueco para acciones sueltas, sin vender nada.` });
  }
  if (M.filas.some((f) => f.inst.tipo === 'Acción')) add('anio', { id: `revision:${anio}`, cuando: 'una vez al año', t: 'Revisa cada acción frente al S&P 500', det: 'Compara lo que ha hecho cada acción con lo que habría hecho el mismo dinero en tu fondo del S&P 500. Quédate solo con las que ganen o tengan aún su motivo para subir.', acc: '<a class="enlace" href="#analisis" data-calif="apuestas">Ver tus acciones frente al índice</a>' });
  add('largo', { id: 'nucleo', cuando: 'siempre', auto: true, t: 'Deja trabajar a tus fondos indexados', det: `Tus fondos son el ${fmtNum(M.total ? (sum(M.filas.filter((f) => /^Fondo/.test(f.inst.tipo || '') && f.inst.clase === 'Renta variable'), (f) => f.valor) / M.total) * 100 : 0, 0)} % de la cartera. No los vendas en las caídas: si hay que sacar dinero, que salga del colchón o de las acciones sueltas.` });
  if (total > 0) add('largo', { id: 'subir', cuando: 'con cada subida de sueldo', t: 'Sube la aportación cuando suba tu sueldo', det: `Es lo que más mueve el resultado a 10 y 20 años. Pruébalo en Análisis > Tus objetivos > Proyección, con «Subes la aportación cada año».`, acc: '<a class="enlace" href="#proyeccion">Probarlo</a>' });
  // 11. lo que sale de tu perfil y tus metas
  try { pasosPerfil(M, add); } catch (e) { console.warn(e); }
  // los de la IA, de su última revisión
  const ia = iaActual(), hr = ia && ia.hoja_de_ruta;
  if (hr) {
    const v = valoresIA(M), mapa = { mes: 'mes', seis_meses: 'seis', anio: 'anio', largo: 'largo' };
    for (const [k, pz] of Object.entries(mapa)) for (const x of (Array.isArray(hr[k]) ? hr[k] : []).slice(0, 5)) {
      if (!x || !x.t) continue;
      const d = /^\d{4}-\d{2}-\d{2}$/.test(x.d || '') ? x.d : null;
      if (d && d < hoy) continue;
      // «Este mes, nada»: no es una tarea que marcar, es su consejo de esperar (va arriba del plazo, sin botones)
      if (x.esperar === true || ESPERA_IA.test(String(x.t))) { P[pz].push({ fuente: 'ia', id: 'ia:' + normTxt(x.t).slice(0, 60), espera: true, auto: true, t: rellenarIA(x.t, v), pq: x.por_que ? rellenarIA(x.por_que, v) : rellenarIA(x.detalle || x.como || '', v) }); continue; }
      // si GrowFolio ya tiene ese mismo paso (los resultados de IAG, revisar las acciones…), no se repite: se marca
      // que GrowIA coincide en el de la web
      const gemelo = P[pz].concat(...Object.values(P)).find((y) => y.fuente === 'web' && pasosParecidos(y.t, x.t));
      if (gemelo) { gemelo.coincideIA = true; continue; }
      P[pz].push({ fuente: 'ia', id: 'ia:' + normTxt(x.t).slice(0, 60), d, cuando: d ? fechaCorta(d) : '', t: rellenarIA(x.t, v), pq: x.por_que ? rellenarIA(x.por_que, v) : '', como: x.como ? rellenarIA(x.como, v) : '', imp: x.impuestos ? rellenarIA(x.impuestos, v) : '', det: x.por_que || x.como ? '' : rellenarIA(x.detalle || '', v), autor: ia.autor });
    }
  }
  const hechos = (S.cartera.ruta && S.cartera.ruta.hechos) || {};
  for (const k of Object.keys(P)) {
    for (const x of P[k]) { x.hechoK = x.fuente === 'ia' ? hechoIA(x) : hechos[x.id] ? x.id : null; x.hecho = !!x.hechoK; }
    P[k].sort((a, b) => (a.hecho - b.hecho) || ((b.urgente ? 1 : 0) - (a.urgente ? 1 : 0)) || ((a.auto ? 1 : 0) - (b.auto ? 1 : 0)) || String(a.d || '9').localeCompare(String(b.d || '9')));
  }
  return P;
}
const ESPERA_IA = /^\s*(?:(?:este|el) mes|esta semana|este trimestre|de momento|por ahora|ahora mismo|hoy)[,:]?\s+nada\b|^\s*nada que (?:hacer|tocar|mover)\b|^\s*no (?:hagas|toques|muevas) nada\b|^\s*(?:esperar?|aguanta)\b/i;
/* norma antiaplicación (art. 33.5 de la ley del IRPF): si vendes con pérdidas y recompras lo mismo dentro del
   plazo (antes o después de la venta), esa pérdida no resta ese año; se aplaza hasta que vendas lo recomprado */
function reglaRecompra(inst) {
  if (!inst) return null;
  if (inst.clase === 'Cripto') return { dias: 0, corto: 'En cripto no se aplica la regla de los dos meses (no son valores cotizados, según las consultas de Hacienda), pero hay quien defiende que rige la de un año del resto de bienes: si recompras antes, la pérdida podría quedar aplazada hasta que vendas lo recomprado.' };
  // 0.3.9: los dos meses son para lo que cotiza en un mercado regulado de la UE o del EEE (art. 33.5.f LIRPF); lo de
  // fuera (EEUU, Reino Unido desde el Brexit, Suiza…) y los fondos van por la letra g): un año
  const fondo = /^Fondo/.test(inst.tipo || ''), fuera = !fondo && !cotizaEnUE(inst);
  const anual = fondo || fuera, meses = anual ? 12 : 2, dias = anual ? 365 : 61, plazo = anual ? 'un año' : 'dos meses';
  return { meses, dias, plazo, corto: `Es por Hacienda: si vendes con pérdidas y recompras ${fondo ? 'el mismo fondo' : 'la misma acción o ETF'} en ${plazo} (antes o después de vender)${fuera ? ', que es el plazo para lo que cotiza fuera de la UE' : ''}, esa pérdida no resta este año y se aplaza hasta que vendas lo recomprado.` };
}
const libreRecompra = (inst, fecha = hoyIso()) => { const r = reglaRecompra(inst); return r && r.meses ? sumarDias(sumarMeses(fecha, r.meses), 1) : null; };
// ¿cotiza en un mercado regulado de la UE o del EEE? Por el sufijo de Yahoo; sin sufijo es EEUU
const BOLSAS_UE = new Set(['MC', 'PA', 'DE', 'F', 'AS', 'MI', 'BR', 'LS', 'IR', 'HE', 'CO', 'ST', 'VI', 'WA', 'OL', 'AT', 'PR', 'BD', 'IC', 'TL', 'RG', 'VS']);
const PAISES_UE = new Set(['ES', 'FR', 'DE', 'IT', 'NL', 'BE', 'LU', 'PT', 'IE', 'AT', 'FI', 'SE', 'DK', 'PL', 'CZ', 'HU', 'GR', 'SK', 'SI', 'EE', 'LV', 'LT', 'RO', 'BG', 'HR', 'CY', 'MT', 'NO', 'IS', 'LI']);
function cotizaEnUE(inst) {
  const y = String((inst && inst.yahoo) || '');
  if (y.includes('.')) return BOLSAS_UE.has(y.split('.').pop().toUpperCase());
  if (y) return false;
  return PAISES_UE.has(inst && inst.pais);
}

/* el tipo de cada paso, por cómo empieza su id: decide el icono y el color */
const TIPO_PASO = [
  [/^venta:|^perdida:/, 'venta', 'venta'], [/^compra:|^idea:/, 'compra', 'compra'], [/^nucleo|^subir/, 'info', 'fondo'],
  [/^limcripto:/, 'venta', 'venta'], [/^perfil:|^deuda:/, 'dato', 'lapiz'], [/^colchonf:|^metaseg:|^metafalta:|^perfilbolsa:/, 'info', 'futuro'],
  [/^stop:/, 'aviso', 'alerta'], [/^res:|^div:|^aport/, 'fecha', 'calendario'], [/^fiscal:|^informe:|^renta:|^m720:|^colchon:/, 'fiscal', 'fiscal'],
  [/^exactas:/, 'dato', 'lapiz'], [/^ia:/, 'ia', 'growia'],
];
function tipoPaso(x) { for (const [re, c, i] of TIPO_PASO) if (re.test(x.id)) return { c, i }; return { c: 'info', i: 'futuro' }; }
const ICONO_PASO = {
  venta: SVG('<path d="M12 5v14M6 13l6 6 6-6"/>', 2), compra: SVG('<path d="M12 19V5M6 11l6-6 6 6"/>', 2), fondo: SVG('<path d="M4 18l5-6 4 3 7-9"/><path d="M15 6h5v5"/>', 2),
  alerta: SVG('<path d="M12 4l9 16H3z"/><path d="M12 10v4M12 17.5v.5"/>', 2), calendario: SVG('<rect x="4" y="5" width="16" height="15" rx="2.5"/><path d="M4 10h16M9 3v4M15 3v4"/>', 1.8),
  fiscal: SVG('<path d="M6 3h12v18l-3-1.8-3 1.8-3-1.8L6 21z"/><path d="M9 8h6M9 12h6"/>', 1.8), lapiz: SVG('<path d="M4 20h4L19 9l-4-4L4 16z"/>', 1.8),
  get growia() { return iconoIA(); },
  chispa: SVG('<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/>', 1.8), futuro: SVG('<circle cx="12" cy="12" r="8"/><path d="M12 8v4l3 2"/>', 1.8),
};
function htmlPaso(x, n) {
  const tp = tipoPaso(x);
  const detalle = x.como || x.imp;
  return `<li class="paso t-${tp.c}${x.hecho ? ' hecho' : ''}${x.urgente && !x.hecho ? ' urgente' : ''}">
    <span class="paso-ico" aria-hidden="true">${ICONO_PASO[tp.i] || ''}</span>
    <div class="paso-cuerpo">
      ${x.cuando || x.fuente === 'ia' || x.coincideIA || x.auto ? `<div class="ruta-meta">${x.cuando ? `<span class="fecha">${esc(x.cuando)}</span>` : ''}${x.fuente === 'ia' ? `<span class="chip info">${esc(x.autor || 'GrowIA')}</span>` : x.coincideIA ? `<span class="chip info">${L('GrowIA coincide', 'GrowIA agrees')}</span>` : ''}${x.auto ? '<span class="chip">va solo</span>' : ''}</div>` : ''}
      <b class="paso-t">${x.t.replace(/ €/g, ' €')}</b>
      ${x.pq ? `<p class="paso-pq">${x.pq}</p>` : ''}${x.det ? `<p class="paso-pq">${x.det}</p>` : ''}
      ${detalle ? `<details class="paso-mas"><summary>${x.como ? 'Cómo hacerlo' : 'Impuestos'}${x.como && x.imp ? ' y lo que pagas' : ''}</summary><dl class="ruta-dl">${x.como ? `<dt>Cómo</dt><dd>${x.como}</dd>` : ''}${x.imp ? `<dt>Impuestos</dt><dd>${x.imp}</dd>` : ''}</dl></details>` : ''}
      ${x.acc && !x.hecho ? `<div class="ruta-acc">${x.acc}</div>` : ''}
    </div>
    ${x.auto ? '<span class="paso-solo" title="Va solo: no tienes que hacer nada">auto</span>' : `<button class="ruta-check" data-ruta="${esc(x.id)}" aria-pressed="${x.hecho}" aria-label="${x.hecho ? 'Marcar como pendiente' : 'Marcar como hecho'}" title="${x.hecho ? 'Hecho. Pulsa para desmarcar' : 'Marcar como hecho'}"><span>${n}</span></button>`}
  </li>`;
}
/* cada paso, según lo que pide: algo que hacer tú (numerado y con su casilla), una fecha que vigilar o algo que va solo */
const TIPO_ETQ = { venta: 'Vender', compra: 'Comprar', aviso: 'Vigilar', fiscal: 'Hacienda', dato: 'Completa tus datos', ia: 'Lo propone GrowIA', info: 'Plan', fecha: 'Fecha' };
const claseRuta = (x) => (x.auto ? 'solo' : tipoPaso(x).c === 'fecha' ? 'fecha' : 'tarea');
function checkRuta(x, n) {
  return `<button class="t-check" data-ruta="${esc(x.id)}" aria-pressed="${x.hecho}" aria-label="${x.hecho ? 'Hecho. Marcar como pendiente' : 'Marcar como hecho'}" title="${x.hecho ? 'Hecho. Pulsa para desmarcar' : 'Marcar como hecho'}"><span>${n || ''}</span></button>`;
}
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
function htmlTarea(x, n, primero) {
  const tp = tipoPaso(x), txt = [x.pq, x.det].filter(Boolean).join(' ');
  return `<li class="tarea t-${tp.c}${x.hecho ? ' hecho' : ''}${primero ? ' primero' : ''}">
    ${checkRuta(x, n)}
    <div class="t-c">
      <div class="t-meta"><span class="t-tipo">${ICONO_PASO[tp.i] || ''}${TIPO_ETQ[tp.c] || 'Plan'}</span>${x.cuando ? `<span class="t-cuando">${esc(x.cuando)}</span>` : ''}${primero ? '<span class="t-primero">Lo primero</span>' : ''}</div>
      <b class="t-t">${x.t.replace(/ €/g, ' €')}</b>
      ${txt && !x.hecho ? `<p class="t-pq">${txt}</p>` : ''}
      ${masRuta(x, true)}
    </div>
  </li>`;
}
function htmlFechaRuta(x) {
  const d = x.d ? deIso(x.d) : null;
  return `<li class="rfecha${x.hecho ? ' hecho' : ''}">
    <span class="rf-d">${d ? `<b>${d.getDate()}</b><small>${MESES[d.getMonth()]}</small>` : `<small>${esc(x.cuando || '')}</small>`}</span>
    <div class="t-c"><b class="t-t">${x.t.replace(/ €/g, ' €')}</b>${x.pq || x.det ? `<p class="t-pq">${x.pq || x.det}</p>` : ''}${masRuta(x)}</div>
    ${checkRuta(x, '')}
  </li>`;
}
function htmlSoloRuta(x) {
  return `<li class="rsolo">
    <span class="rs-ico" aria-hidden="true">${ICONO_PASO[tipoPaso(x).i] || ''}</span>
    <div class="t-c">${x.cuando ? `<span class="t-cuando">${esc(x.cuando)}</span>` : ''}<b class="t-t">${x.t.replace(/ €/g, ' €')}</b>${x.det || x.pq ? `<p class="t-pq">${x.det || x.pq}</p>` : ''}${x.como ? `<p class="t-pq k">${x.como}</p>` : ''}${x.acc ? `<span class="ruta-acc">${x.acc}</span>` : ''}</div>
  </li>`;
}
function htmlRuta(M) {
  const P = pasosRuta(M);
  const hasta = (dias) => fechaCorta(iso(new Date(Date.now() + dias * 86400000)));
  const sub = { mes: `hasta el ${hasta(31)}`, seis: `hasta ${MESES[new Date(Date.now() + 183 * 86400000).getMonth()]}`, anio: `hasta ${MESES[new Date().getMonth()]} de ${new Date().getFullYear() + 1}`, largo: 'lo que se construye despacio' };
  const ia = iaActual();
  const cuenta = [...P.mes, ...P.seis].filter((x) => !x.auto && claseRuta(x) === 'tarea'), hechas = cuenta.filter((x) => x.hecho).length;
  const primero = P.mes.find((x) => !x.hecho && claseRuta(x) === 'tarea') || (!P.mes.some((x) => claseRuta(x) === 'tarea' && !x.hecho) ? P.seis.find((x) => !x.hecho && claseRuta(x) === 'tarea') : null);
  const columna = ([k, t]) => {
    const tareas = P[k].filter((x) => claseRuta(x) === 'tarea'), fechas = P[k].filter((x) => claseRuta(x) === 'fecha'), solos = P[k].filter((x) => claseRuta(x) === 'solo' && !x.espera);
    const espera = P[k].find((x) => x.espera);
    const ht = tareas.filter((x) => x.hecho).length;
    let n = 0;
    const lado = fechas.length || solos.length;
    return `<section class="rcol" data-p="${k}" aria-labelledby="hRuta-${k}">
      <header class="rcol-cab"><h2 id="hRuta-${k}">${t}</h2><span class="k">${sub[k]}</span></header>
      <div class="rcol-grid${lado ? ' con-lado' : ''}">
        <div class="rbloque">
          ${espera ? `<div class="ruta-espera" role="note"><span class="re-ico ia-av" aria-hidden="true">${AVATAR_IA}</span><div><span class="re-de" data-no-trad>${conIA('GrowIA te dice', 'GrowIA says')}</span><b>${espera.t}</b>${espera.pq ? `<p>${espera.pq}</p>` : ''}</div></div>` : ''}
          <h3 class="rh">Por hacer${tareas.length ? `<span class="k">${ht} de ${tareas.length} hechos</span>` : ''}</h3>
          ${tareas.length ? `<ol class="tareas">${tareas.map((x) => htmlTarea(x, ++n, x === primero)).join('')}</ol>` : `<div class="ruta-vacio">${espera ? 'Nada más.' : `Nada que hacer tú${k === 'mes' ? ' este mes' : ' en este plazo'}.`}</div>`}
        </div>
        ${lado ? `<div class="rlado">
          ${fechas.length ? `<div class="rbloque"><h3 class="rh">Fechas que vigilar <a class="rh-mas" href="#agenda">Ver el calendario</a></h3><ul class="rfechas">${fechas.map(htmlFechaRuta).join('')}</ul></div>` : ''}
          ${solos.length ? `<div class="rbloque"><h3 class="rh">Va solo<span class="k">no tienes que hacer nada</span></h3><ul class="rsolos">${solos.map(htmlSoloRuta).join('')}</ul></div>` : ''}
        </div>` : ''}
      </div>
    </section>`;
  };
  return `<div class="ruta-barra-top">
      <div class="plazos" role="group" aria-label="Plazo">${PLAZOS.map(([k]) => { const n = P[k].filter((x) => !x.hecho && !x.auto && claseRuta(x) === 'tarea').length; return `<button data-plazo="${k}" aria-pressed="${S.rutaPlazo === k}">${PLAZO_CORTO[k]}${n ? `<span class="cuenta">${n}</span>` : ''}</button>`; }).join('')}</div>
      <div class="ruta-res" aria-label="Progreso"><div class="ruta-res-n"><b>${hechas}</b> de ${cuenta.length} hechos <span>en los próximos 6 meses. Cuando hagas uno, márcalo y se queda tachado.</span></div><div class="ruta-barra"><i style="width:${cuenta.length ? ((hechas / cuenta.length) * 100).toFixed(0) : 0}%"></i></div></div>
    </div>
    <div class="ruta ruta2" data-sel="${esc(S.rutaPlazo)}">${PLAZOS.map(columna).join('')}</div>
    <p class="nota ruta-nota">${ia && ia.hoja_de_ruta ? `Los que llevan la etiqueta ${esc(ia.autor || 'GrowIA')} los propone ella tras leer las noticias; el resto salen de tus números.` : 'Salen de tus números; con GrowIA activada, añade los suyos tras leer las noticias.'}</p>`;
}
/* Cómo vas (en Análisis, encima de tus objetivos): lo urgente que queda del Paso a paso, lo del mes y tus objetivos.
   Si no hay nada que hacer, se dice: esperar también vale */
function htmlComoVas(M) {
  if (esPublico()) return '';
  let P; try { P = pasosRuta(M); } catch (e) { return ''; }
  const C = comparaObjetivos(M), tareasMes = P.mes.filter((x) => claseRuta(x) === 'tarea' && !x.auto);
  const urg = tareasMes.filter((x) => x.urgente && !x.hecho).length, pend = tareasMes.filter((x) => !x.hecho).length;
  const est = urg ? 'ojo' : C.fuera ? 'ojo' : 'bien';
  const frase = urg ? L(`Te ${urg === 1 ? 'queda una cosa' : `quedan ${urg} cosas`} del Paso a paso que no deberían esperar.`, `${urg} step${urg === 1 ? '' : 's'} shouldn't wait.`)
    : C.fuera ? L(`Vas bien con lo del mes, pero ${C.fuera === 1 ? 'uno de tus objetivos se sale' : `${C.fuera} de tus objetivos se salen`} de lo que querías: lo tienes justo debajo.`, `On track this month, but ${C.fuera} of your goals ${C.fuera === 1 ? 'is' : 'are'} off: see below.`)
    : pend ? L(`Vas bien: este mes te ${pend === 1 ? 'queda un paso' : `quedan ${pend} pasos`}, ninguno urgente.`, `On track: ${pend} step${pend === 1 ? '' : 's'} left this month, none urgent.`)
    : L('Vas bien. Este mes no hace falta tocar nada: tus aportaciones siguen trabajando. Esperar también es una decisión, y a menudo la mejor.', 'On track. Nothing to touch this month: your contributions keep working. Waiting is a decision too, and often the best one.');
  return `<div class="ruta-estado ${est}"><span class="re-ic">${est === 'bien' ? ICONOS.ok : ICONOS.alerta}</span><div><b>${est === 'bien' ? L('Vas bien', 'On track') : L('Ojo', 'Heads up')}</b><p>${esc(frase)}</p>${urg || pend ? `<a class="re-obj ${urg ? 'fuera' : ''}" href="#ruta">${L('Ir al Paso a paso', 'Go to Steps')}</a>` : ''}</div></div>`;
}
/* 0.5, modo público: en el sitio del Paso a paso, «Tu plan». Completo llega en la 0.9 (tus reglas escritas por ti y lo
   que suponen este mes); mientras, lo que ya sirve: tus aportaciones y tus límites, sin decirte qué comprar o vender */
function vistaTuPlan(M) {
  const ap = aportacionesActivas(), total = sum(ap, ({ a }) => +a.importe || 0);
  const nombreI = (id) => esc((S.inst[id] && (S.inst[id].corto || S.inst[id].nombre)) || id);
  return `<div class="vista-cab"><h1>${L('Tu plan', 'Your plan')}</h1><p>${L('Tus reglas para invertir y lo que suponen cada mes.', 'Your investing rules and what they mean each month.')}</p></div>
    <section class="tp-llega" aria-labelledby="hTpLlega"><span class="re-ico" aria-hidden="true">${ICONOS.ruta}</span><div>
      <h2 id="hTpLlega">${L('Llega en la 0.9', 'Coming in 0.9')}</h2>
      <p>${L('Escribes tus reglas (cuánto aportar cada mes, cada cuánto repartir, cuánto como máximo en cada cosa) y GrowFolio te dice lo que suponen este mes y lo que pagarías a Hacienda. Las reglas las pones tú: GrowFolio no te dice qué comprar ni qué vender.', 'You write your rules (how much to put in each month, how often to rebalance, the most you want in each thing) and GrowFolio tells you what they mean this month and what you would pay in tax. You set the rules: GrowFolio does not tell you what to buy or sell.')}</p>
      <p class="k">${L('Mientras tanto, aquí tienes lo que ya funciona: tus aportaciones y tus límites.', 'Meanwhile, here is what already works: your contributions and your limits.')}</p></div></section>
    <div class="dos tp-dos"><section aria-labelledby="hTpAp">
      <div class="sec-cab"><h2 id="hTpAp">${L('Tus aportaciones', 'Your contributions')}</h2><div class="der"><a class="btn peq" href="#plan">${L('Ver y cambiar', 'See and change')}</a></div></div>
      ${ap.length ? `<p class="plan-sub">${L(`${eur(total, 0)} al mes, ${eur(total * 12, 0)} al año`, `${eur(total, 0)} a month, ${eur(total * 12, 0)} a year`)}</p>
      <ul class="plan-l">${ap.map(({ a }) => { const i = S.inst[a.instrumento] || { corto: a.instrumento }; return `<li>${logo(i.dominio, i.corto || i.nombre || '?')}<div class="pl-t"><b>${nombreI(a.instrumento)}</b><small>${[esc(a.plataforma || ''), L(`el día ${esc(a.dia)}`, `on day ${esc(a.dia)}`)].filter(Boolean).join(' · ')}</small></div><div class="pl-n"><b>${eur(+a.importe, 0)}</b><small>${L('al mes', 'a month')}</small></div></li>`; }).join('')}</ul>`
        : `<div class="vacio">${L('No tienes aportaciones periódicas. Si tienes alguna programada en tu bróker, añádela en Inicio, Plan y movimientos, y GrowFolio la irá sumando sola.', 'You have no regular contributions. If you have one scheduled at your broker, add it in Home, Plan and activity, and GrowFolio will add it up by itself.')}</div>`}
    </section>
    <div>${htmlObjetivosVs(M)}<p class="nota">${L('Tus límites, tu perfil y tus metas se cambian en', 'Your limits, profile and goals are changed in')} <a href="#objetivos">${L('Análisis, Tus objetivos', 'Analysis, Your goals')}</a>.</p></div></div>`;
}
function vistaRuta(M) {
  if (esPublico()) return vistaTuPlan(M);
  return `<div class="vista-cab"><h1>Paso a paso</h1><p>Qué te toca hacer y cuándo: lo urgente primero, con el porqué, el cómo y lo que pagas a Hacienda.</p></div>${htmlRuta(M)}`;
}
/* Los pasos de la IA cambian de texto cada vez que revisa la cartera («Pon un stop en Repsol» un día, «Protege
   lo ganado en Repsol con una orden stop» al siguiente), así que lo hecho no se busca solo por el texto exacto:
   un paso de la IA cuenta como hecho si se parece mucho a uno que ya marcaste (las mismas palabras clave) y lo
   marcaste hace poco, o si es casi igual aunque fuera hace meses. La IA, además, recibe lo que ya has hecho para
   no volver a proponerlo. */
const VACIAS_RUTA = new Set(['para', 'con', 'que', 'los', 'las', 'del', 'una', 'unos', 'unas', 'por', 'tus', 'sus', 'este', 'esta', 'cada', 'como', 'mas', 'antes', 'despues', 'desde', 'hasta', 'sobre', 'entre', 'tienes', 'tiene', 'ahora', 'cuando', 'hazlo', 'haz', 'tu', 'su', 'en', 'el', 'la', 'de', 'y', 'a']);
const clavesRuta = (t) => new Set(normTxt(String(t || '').replace(/<[^>]+>/g, ' ')).split(' ').filter((w) => w.length >= 4 && !VACIAS_RUTA.has(w)));
function parecidoRuta(a, b) { if (!a.size || !b.size) return 0; let c = 0; for (const w of a) if (b.has(w)) c++; return c / (a.size + b.size - c); }
function hechoIA(x) {
  const r = (S.cartera && S.cartera.ruta) || {}, hechos = r.hechos || {}, info = r.hechosIA || {};
  if (hechos[x.id]) return x.id;
  const mias = clavesRuta(x.t), hace45 = iso(new Date(Date.now() - 45 * 86400000));
  let mejor = null, nota = 0;
  for (const [k, d] of Object.entries(hechos)) {
    if (!k.startsWith('ia:')) continue;
    const p = parecidoRuta(mias, clavesRuta((info[k] && info[k].t) || k.slice(3)));
    if ((p >= 0.5 && d >= hace45) || p >= 0.75) if (p > nota) { nota = p; mejor = k; }
  }
  return mejor;
}
async function marcarRuta(id) {
  const r = S.cartera.ruta = S.cartera.ruta || {};
  r.hechos = r.hechos || {};
  const x = (() => { try { const P = pasosRuta(S.M || calcular()); for (const k of Object.keys(P)) { const y = P[k].find((z) => z.id === id); if (y) return y; } } catch (e) {} return null; })();
  if (x && x.hecho) {
    // deshacer: también la marca del paso parecido que lo daba por hecho
    for (const k of new Set([id, x.hechoK])) { delete r.hechos[k]; if (r.hechosIA) delete r.hechosIA[k]; }
  } else if (r.hechos[id]) delete r.hechos[id];
  else {
    r.hechos[id] = hoyIso();
    // de los de la IA se guarda el texto, para reconocerlo aunque mañana lo escriba de otra forma
    if (x && x.fuente === 'ia') { r.hechosIA = r.hechosIA || {}; r.hechosIA[id] = { t: String(x.t || '').replace(/<[^>]+>/g, '').slice(0, 200), d: hoyIso() }; }
  }
  // los hechos de hace más de un año ya no hacen falta
  const limite = iso(new Date(Date.now() - 400 * 86400000));
  for (const [k, d] of Object.entries(r.hechos)) if (d < limite) { delete r.hechos[k]; if (r.hechosIA) delete r.hechosIA[k]; }
  if (r.hechosIA) for (const k of Object.keys(r.hechosIA)) if (!r.hechos[k]) delete r.hechosIA[k];
  if (S.M) cacheDe(S.M, '__ruta').delete('r');
  pintar();
  await guardarCarteraCallada('Paso a paso');
}
function cuerpoNum(k, M) {
  const nombre = (f) => `<b style="font-weight:500">${esc(f.inst.corto || f.inst.nombre)}</b>`;
  let cuerpo = '';
  if (k === 'rent') {
    const anios = [...new Set(M.filas.flatMap((f) => Object.keys((f.p && f.p.anios) || {})))].sort().slice(-8);
    cuerpo = `<div class="tabla-w"><table><thead><tr><th>Posición</th><th class="r">1 mes</th><th class="r">3 meses</th><th class="r">En el año</th><th class="r">1 año</th><th class="r">3 años</th><th class="r">5 años</th><th class="r">10 años</th></tr></thead><tbody>
      ${M.filas.map((f) => { const r = (f.p && f.p.rent) || {}; return `<tr><td>${nombre(f)}</td>${['1m', '3m', 'ytd', '1a'].map((k) => `<td class="r ${cls(r[k])}">${pctS(r[k], 1)}</td>`).join('')}${['3a', '5a', '10a'].map((k) => `<td class="r ${cls(r[k + '_anual'])}">${r[k + '_anual'] == null ? '—' : pctS(r[k + '_anual'], 1)}<small>${r[k] == null ? '' : 'total ' + pctS(r[k], 0)}</small></td>`).join('')}</tr>`; }).join('')}
      </tbody></table></div><p class="nota">Rentabilidad del precio en euros. A 3, 5 y 10 años, arriba lo que da al año y abajo el total. Tu rentabilidad real depende de cuándo compraste y está en cada ficha.</p>
      <div class="sec-cab" style="margin-top:36px"><h2>Año a año</h2></div>
      <div class="tabla-w"><table><thead><tr><th>Posición</th>${anios.map((a) => `<th class="r">${a}</th>`).join('')}</tr></thead><tbody>
      ${M.filas.map((f) => { const a = (f.p && f.p.anios) || {}; return `<tr><td>${nombre(f)}</td>${anios.map((y) => `<td class="r ${a[y] == null ? '' : cls(Math.round(a[y]))}">${a[y] == null ? '—' : pctS(a[y], 0)}</td>`).join('')}</tr>`; }).join('')}
      </tbody></table></div><p class="nota">El año en curso va hasta hoy.</p>`;
  } else if (k === 'riesgo') {
    const serie = serieCartera(M, 366);
    const vol = volatilidadSerie(serie);
    const cr = claseRiesgo(vol);
    cuerpo = `${htmlCaida(M)}${cr ? `<div class="resumen-fila"><div><span class="k">Riesgo de tu cartera</span><span class="v">${cr} de 7</span><small class="k">7 es lo más arriesgado</small></div><div><span class="k">Cuánto se ha movido</span><span class="v">${pct(vol, 1)}</span><small class="k">volatilidad del último año</small></div><div><span class="k">Peor caída del último año</span><span class="v down">${pct(caidaMaxima(serie), 1)}</span></div></div>` : ''}
      <div class="tabla-w"><table class="resp"><thead><tr><th>Posición</th><th>Riesgo</th><th class="r">Volatilidad</th><th class="r">Peor caída 1 año</th><th class="r">Beta</th><th class="r">Peso</th></tr></thead><tbody>
      ${[...M.filas].sort((a, b) => ((b.p && b.p.riesgo) || 0) - ((a.p && a.p.riesgo) || 0)).map((f) => `<tr><td>${nombre(f)}</td><td>${f.p && f.p.riesgo ? `<div class="medidor" style="width:120px;margin-top:6px" role="img" aria-label="${f.p.riesgo} de 7">${[1, 2, 3, 4, 5, 6, 7].map((n) => `<i class="${n <= f.p.riesgo ? 'on' : ''}"></i>`).join('')}</div>` : '—'}</td><td class="r">${f.p ? pct(f.p.volatilidad, 1) : '—'}</td><td class="r down">${f.p && f.p.tecnico ? pct(f.p.tecnico.caida_max_1a, 1) : '—'}</td><td class="r">${f.p && f.p.fundamentales && f.p.fundamentales.beta != null ? fmtNum(f.p.fundamentales.beta, 2) : '—'}</td><td class="r">${pct(f.peso, 1)}</td></tr>`).join('')}
      </tbody></table></div><p class="nota">Riesgo: escala oficial de 1 a 7 según la volatilidad. La beta dice cuánto se mueve una acción cuando se mueve el mercado (1 = igual). El riesgo de tu cartera (arriba) se calcula con tus posiciones de hoy y los precios del último año.</p>`;
  } else if (k === 'costes') {
    const conTer = M.filas.filter((f) => f.inst.ter != null);
    const costeAnual = sum(conTer, (f) => (f.valor * f.inst.ter) / 100);
    const baseTer = sum(conTer, (f) => f.valor);
    cuerpo = `<div class="resumen-fila"><div><span class="k">Gastos de fondos al año</span><span class="v">${eur(costeAnual, 0)}</span></div><div><span class="k">Comisión media de los fondos</span><span class="v">${pct(baseTer ? (costeAnual / baseTer) * 100 : 0, 2)}</span></div><div><span class="k">Dividendos al año</span><span class="v">${eur(M.dividendos, 0)}</span></div><div><span class="k">Tras impuestos (${pctTramo(tramoAhorro())} %)</span><span class="v">${eur(M.dividendos * (1 - tramoAhorro()), 0)}</span></div></div>
      <div class="tabla-w"><table class="resp"><thead><tr><th>Posición</th><th class="r" title="Lo que cobra el fondo cada año (TER), ya descontado de su precio">Comisión</th><th class="r">Gasto al año</th><th class="r">Dividendo</th><th class="r">Cobro al año</th><th class="r">Próximo</th></tr></thead><tbody>
      ${M.filas.map((f) => `<tr><td>${nombre(f)}</td><td class="r">${f.inst.ter != null ? pct(f.inst.ter, 2) : '—'}</td><td class="r">${f.inst.ter != null ? eur((f.valor * f.inst.ter) / 100, 0) : '—'}</td><td class="r">${f.p && f.p.dividendo_pct ? pct(f.p.dividendo_pct, 1) : '—'}</td><td class="r">${f.p && f.p.dividendo_pct ? eur((f.valor * f.p.dividendo_pct) / 100, 0) : '—'}</td><td class="r">${f.p && f.p.ex_dividendo ? fechaCorta(f.p.ex_dividendo) : '—'}</td></tr>`).join('')}
      </tbody></table></div><p class="nota">Dividendos brutos de los últimos 12 meses sobre el precio de hoy. Los de empresas españolas llegan con el 19 % ya retenido; los de fuera pueden traer además la retención de su país; en Hacienda ves cuánto recuperas.</p>`;
  } else if (k === 'dentro') {
    const d = empresasPorDentro(M);
    const top = d.filas.slice(0, 20);
    const max = top.length ? top[0].v : 1;
    cuerpo = `${htmlSolapes(M)}<p class="nota" style="margin:0 0 18px">Las empresas en las que tienes más dinero, sumando las que compras directamente y las que hay dentro de tus fondos indexados (las 10 mayores de cada uno).</p>
      <ul class="barras">${top.map((x) => `<li><span class="n"><span class="n-t" title="${esc(x.n)}">${esc(x.n)}</span>${x.directa ? '<span class="chip info">directa</span>' : ''}</span><span class="b"><i class="${x.directa ? 'dir' : ''}" style="width:${((x.v / max) * 100).toFixed(1)}%"></i></span><span class="r">${eur(x.v, 0)}<small class="k" style="display:block;font-size:12px">${pct(M.total ? (x.v / M.total) * 100 : 0, 1)}</small></span></li>`).join('')}</ul>
      <p class="nota">Pesos de los ETF de referencia (IVV, IEUR, EEM, VB y SCZ) según Yahoo Finance. Estas 20 suman ${eur(sum(top, (x) => x.v), 0)}, un ${pct(M.total ? (sum(top, (x) => x.v) / M.total) * 100 : 0, 1)} de tu patrimonio.</p>`;
  } else if (k === 'apuestas') {
    const ref = S.inst[S.ref];
    const pRef = S.precios && S.precios.instrumentos && S.precios.instrumentos[S.ref];
    const precioRef = (S.live[S.ref] && S.live[S.ref].precio) || (pRef && pRef.precio);
    const apu = M.filas.filter((f) => f.pos.entrada && f.pos.entrada.fecha && f.pos.entrada.precio);
    cuerpo = apu.length ? `<div class="tabla-w"><table class="resp"><thead><tr><th>Acción</th><th class="r">Tuya</th><th class="r">${esc(ref ? ref.corto : 'Índice')}</th><th class="r">Diferencia</th><th class="r">En euros</th></tr></thead><tbody>
      ${apu.map((f) => {
        const e = f.pos.entrada;
        const mia = f.precio ? (f.precio / e.precio - 1) * 100 : null;
        const b0 = precioEn(histDe(S.ref), e.fecha, 'antes');
        const ind = b0 && precioRef ? (precioRef / b0 - 1) * 100 : null;
        const dif = mia != null && ind != null ? mia - ind : null;
        return `<tr><td>${nombre(f)}<small>desde el ${fechaCorta(e.fecha)} a ${precioFmt(+e.precio)}</small></td><td class="r ${cls(mia)}">${pctS(mia, 1)}</td><td class="r ${cls(ind)}">${pctS(ind, 1)}</td><td class="r ${cls(dif)}">${dif == null ? '—' : (dif > 0 ? '+' : '') + fmtNum(dif, 1) + ' puntos'}</td><td class="r ${cls(dif)}">${dif == null ? '—' : eurS((f.coste * dif) / 100, 0)}</td></tr>`;
      }).join('')}</tbody></table></div><p class="nota">Solo el precio, sin dividendos ni comisiones. Para que una acción salga aquí, ponle fecha y precio de entrada en su ficha (Editar).</p>`
      : '<div class="vacio">Ninguna posición tiene fecha y precio de entrada. Añádelos en la ficha de la posición (Editar).</div>';
  }
  return cuerpo;
}
/* ---------- 0.3.11: lo que cobrarás de dividendos cada mes de los próximos 12 ----------
   Cada acción repite lo que pagó en los últimos 12 meses, un año después, con tus acciones de hoy. Va en el mes en
   que se fija el dividendo (la fecha ex-dividendo: hay que tenerla el día antes); el dinero llega unas semanas
   después. Si ya se sabe su próximo ex-dividendo, el que toca va en esa fecha. Neto: menos lo que retiene su país y
   no recuperas y menos tu tramo del ahorro, que es lo que acabas pagando en la renta. */
function dividendosMeses(M) {
  const hoy = hoyIso(), mes0 = hoy.slice(0, 8) + '01', fin = sumarMeses(mes0, 12), hace1a = sumarDias(hoy, -365);
  const meses = Array.from({ length: 12 }, (_, i) => ({ k: sumarMeses(mes0, i).slice(0, 7), bruto: 0, neto: 0, de: [] }));
  const t = tramoAhorro(), sinCal = [];
  for (const f of M.filas) {
    const p = f.p || {};
    if (!(f.uds > 0)) continue;
    const pagos = Array.isArray(p.dividendos_pagos) ? p.dividendos_pagos.filter(([d, v]) => d > hace1a && v > 0) : null;
    if (!pagos || !pagos.length) { if (p.dividendo_pct > 0) sinCal.push({ n: f.inst.corto || f.inst.nombre, anual: (f.valor * p.dividendo_pct) / 100 }); continue; }
    const aEur = p.precio > 0 && p.precio_local > 0 ? p.precio / p.precio_local : 1;
    const fis = fiscalidadSede(f.inst.pais, f.inst.tipo);
    const prox = pagos.map(([d, v]) => [sumarMeses(d, 12), v]).sort((a, b) => (a[0] < b[0] ? -1 : 1));
    if (p.ex_dividendo && p.ex_dividendo >= hoy) {
      const k = prox.reduce((m, x, i) => (Math.abs(diasEntre(x[0], p.ex_dividendo)) < Math.abs(diasEntre(prox[m][0], p.ex_dividendo)) ? i : m), 0);
      if (Math.abs(diasEntre(prox[k][0], p.ex_dividendo)) <= 75) prox[k][0] = p.ex_dividendo;
    }
    for (const [d, v] of prox) {
      if (d < hoy || d >= fin) continue;
      const m = meses.find((x) => x.k === d.slice(0, 7)); if (!m) continue;
      const bruto = f.uds * v * aEur, neto = bruto * (1 - t - (fis.pierde || 0) / 100);
      m.bruto += bruto; m.neto += neto; m.de.push({ n: f.inst.corto || f.inst.nombre, d, bruto, neto });
    }
  }
  return { meses, sinCal, bruto: sum(meses, (m) => m.bruto), neto: sum(meses, (m) => m.neto), t };
}
/* lo que habrás cobrado de dividendos en el año (aprox.): lo que pagó cada acción con fecha ex-dividendo entre el
   1 de enero y hoy, por las acciones que tenías ese día (lo comprado después no cuenta; lo que ya tenías al
   apuntarlo, sí, salvo que dijeras que lo tienes desde más tarde). Para recordarlo en Hacienda: es una pista, el dato
   bueno es el informe del bróker */
function dividendosAnio(M, anio = new Date().getFullYear()) {
  const ini = `${anio}-01-01`, hoy = hoyIso(), de = [];
  for (const f of M.filas) {
    const p = f.p || {};
    if (!Array.isArray(p.dividendos_pagos)) continue;
    let lotes; try { lotes = lotesDe(f.pos); } catch (e) { continue; }
    const aEur = p.precio > 0 && p.precio_local > 0 ? p.precio / p.precio_local : 1;
    for (const [d, v] of p.dividendos_pagos) {
      if (d < ini || d > hoy || !(v > 0)) continue;
      const uds = sum(lotes.filter((l) => (l.mezcla ? !f.pos.desde || f.pos.desde < d : l.f < d)), (l) => l.u);
      if (uds > 0) de.push({ n: f.inst.corto || f.inst.nombre, d, bruto: uds * v * aEur });
    }
  }
  return { bruto: sum(de, (x) => x.bruto), de };
}
function htmlDividendos12(M) {
  const D = dividendosMeses(M);
  if (!D.bruto && !D.sinCal.length) return '';
  const max = Math.max(...D.meses.map((m) => m.bruto), 1);
  const nombreMes = (k) => { const d = deIso(k + '-01'); return IDIOMA === 'en' ? MESES_EN[d.getMonth()].slice(0, 3) : MESES[d.getMonth()]; };
  const barras = D.meses.map((m) => {
    const tip = m.bruto ? `${m.de.map((x) => `${x.n}: ${eur(x.neto, 0)} (${eur(x.bruto, 0)} ${L('brutos', 'gross')})`).join('; ')}` : L('nada', 'nothing');
    const alto = (m.bruto / max) * 100, altoN = (m.neto / max) * 100;
    return `<div class="d12-m" tabindex="0" aria-label="${esc(`${nombreMes(m.k)}: ${m.bruto ? L(`${eur(m.neto, 0)} netos. ${tip}`, `${eur(m.neto, 0)} net. ${tip}`) : L('nada', 'nothing')}`)}"><span class="d12-tip" role="tooltip">${esc(tip)}</span>
      <div class="d12-col">${m.bruto ? `<i class="d12-imp" style="height:${alto.toFixed(1)}%"></i><i class="d12-neto" style="height:${Math.max(0, altoN).toFixed(1)}%"></i>` : ''}</div>
      <span class="d12-v">${m.neto >= 1 ? eur(m.neto, 0) : ''}</span><span class="d12-l">${nombreMes(m.k)}</span></div>`;
  }).join('');
  const lista = D.meses.filter((m) => m.bruto).map((m) => `<tr><td>${nombreMes(m.k)} ${m.k.slice(0, 4)}</td><td>${esc(m.de.map((x) => x.n).join(', '))}</td><td class="r">${eur(m.bruto, 0)}</td><td class="r">${eur(m.neto, 0)}</td></tr>`).join('');
  return `<section class="div12" aria-labelledby="hDiv12">
    <div class="sec-cab"><h3 id="hDiv12">${L('Tus dividendos, mes a mes', 'Your dividends, month by month')}</h3><span class="k">${D.bruto ? L(`próximos 12 meses: ${eur(D.neto, 0)} netos de ${eur(D.bruto, 0)}`, `next 12 months: ${eur(D.neto, 0)} net of ${eur(D.bruto, 0)}`) : L('aún sin las fechas de los pagos', 'payment dates not in yet')}</span></div>
    ${!D.bruto ? `<p>${L(`GrowFolio está bajando cuándo paga cada una y cuánto; en unas horas sale aquí el calendario de los próximos 12 meses. Mientras, lo que reparten al año: ${yLista(D.sinCal.map((x) => `${esc(x.n)} (unos ${eur(x.anual, 0)} brutos)`))}.`, `GrowFolio is fetching when and how much each one pays; within hours the next-12-months calendar shows here. Meanwhile, what they pay a year: ${yLista(D.sinCal.map((x) => `${esc(x.n)} (about ${eur(x.anual, 0)} gross)`))}.`)}</p>` : ''}
    ${D.bruto ? `<div class="d12-barras">${barras}</div>
    <div class="d12-ley"><span><i class="d12-neto"></i>${L('Para ti', 'Yours')}</span><span><i class="d12-imp"></i>${L('Hacienda y la retención de fuera', 'Tax and foreign withholding')}</span></div>
    <details class="mas"><summary>${L('Verlo en una tabla', 'See it as a table')}</summary><div class="tabla-w"><table class="resp"><thead><tr><th>${L('Mes', 'Month')}</th><th>${L('De', 'From')}</th><th class="r">${L('Bruto', 'Gross')}</th><th class="r">${L('Neto', 'Net')}</th></tr></thead><tbody>${lista}</tbody></table></div></details>` : ''}
    ${!D.bruto ? '' : `<p class="nota">${L(`Repite lo que pagó cada empresa en los últimos 12 meses, con tus acciones de hoy. Va en el mes en que se fija (ex-dividendo); el dinero llega unas semanas después. Neto: con tu tramo del ahorro (${pctTramo(D.t)} %) y lo que retiene su país y no recuperas.`, `It repeats what each company paid in the last 12 months, with your shares today. It goes in the month it's set (ex-dividend); the money arrives a few weeks later. Net: with your savings-tax rate (${pctTramo(D.t)} %) and what its country withholds that you don't get back.`)}${D.sinCal.length ? ' ' + L(`Aún sin las fechas de sus pagos (GrowFolio las va bajando; salen en unas horas): ${yLista(D.sinCal.map((x) => `${esc(x.n)}, unos ${eur(x.anual, 0)} al año`))}.`, `Payment dates not in yet (GrowFolio is fetching them; they show within hours): ${yLista(D.sinCal.map((x) => `${esc(x.n)}, about ${eur(x.anual, 0)} a year`))}.`) : ''}</p>`}
  </section>`;
}

/* ---------- 0.3.11: ¿se pisan tus fondos? ----------
   Dos fondos indexados de grandes empresas que invierten en la misma zona llevan casi las mismas empresas (las pesan
   por su tamaño): lo que se pisan es lo que comparten de cada zona. Un fondo de empresas pequeñas no se pisa con
   uno de grandes aunque sean de la misma zona. */
const esPeque = (i) => /small|peque|mid.?cap|russell 2000/i.test(`${i.nombre || ''} ${i.corto || ''}`);
function solapamientos(M) {
  const fondos = [];
  const vistos = new Set();
  for (const f of M.filas) {
    const i = f.inst;
    if (!(f.valor > 0) || i.clase !== 'Renta variable' || !(/^Fondo/.test(i.tipo || '') || i.tipo === 'ETF') || !i.region || vistos.has(i.id)) continue;
    vistos.add(i.id); fondos.push(f);
  }
  const pares = [];
  for (let a = 0; a < fondos.length; a++) for (let b = a + 1; b < fondos.length; b++) {
    const A = fondos[a].inst, B = fondos[b].inst;
    if (esPeque(A) !== esPeque(B)) continue;
    const zonas = Object.keys(A.region).filter((r) => r !== 'Otros' && B.region[r]).map((r) => [r, Math.min(A.region[r], B.region[r])]).filter(([, v]) => v > 0).sort((x, y) => y[1] - x[1]);
    const pct = sum(zonas, ([, v]) => v);
    if (pct >= 15) pares.push({ a: fondos[a], b: fondos[b], pct, zonas });
  }
  return { fondos, pares: pares.sort((x, y) => y.pct - x.pct) };
}
function htmlSolapes(M) {
  const S2 = solapamientos(M);
  if (S2.fondos.length < 2) return '';
  const n = (f) => `<b>${esc(f.inst.corto || f.inst.nombre)}</b>`;
  const cuerpo = S2.pares.length ? `<ul class="solapes">${S2.pares.map((p) => `<li>${L(`${n(p.a)} y ${n(p.b)} se pisan en un <b>${fmtNum(p.pct, 0)} %</b>: los dos llevan las grandes de ${yLista(p.zonas.slice(0, 3).map(([r]) => esc(r)))}.`, `${n(p.a)} and ${n(p.b)} overlap by <b>${fmtNum(p.pct, 0)} %</b>: both hold the large companies of ${yLista(p.zonas.slice(0, 3).map(([r]) => esc(r)))}.`)}</li>`).join('')}</ul>
    <p class="nota">${L('No es malo, pero esa parte la pagas con dos comisiones y pesa más de lo que parece. Si quieres simplificar, uno de los dos puede bastar: un traspaso entre fondos no paga impuestos.', 'It isn’t bad, but you pay two fees for that part and it weighs more than it seems. To simplify, one of them may be enough: switching between funds is tax-free.')}</p>`
    : `<p>${L('Tus fondos no se pisan: cada uno pone el dinero en una zona distinta o en empresas de otro tamaño.', 'Your funds don’t overlap: each one invests in a different region or in companies of a different size.')}</p>`;
  return `<section class="solape" aria-labelledby="hSolape"><h3 id="hSolape">${L('¿Se pisan tus fondos?', 'Do your funds overlap?')}</h3>${cuerpo}</section>`;
}

/* 0.3.10: lo que ha rendido tu dinero de verdad (con tus compras y ventas y sus fechas) y frente a qué índice */
function htmlRentReal(M) {
  const R = rentabilidadCartera(M);
  if (!R.flujos.length && !R.sinFecha.length) return '';
  const chips = `<div class="rr-chips" role="group" aria-label="${L('Comparar con', 'Compare with')}">${BENCH.map((b) => `<button type="button" data-bench="${b.id}" aria-pressed="${S.bench === b.id}">${esc(nombreBench(b))}</button>`).join('')}</div>`;
  const cab = (t, k) => `<div class="sec-cab"><h2 id="hRentReal">${t}</h2>${k ? `<span class="k">${k}</span>` : ''}</div>`;
  if (R.sinFecha.length) {
    return `<section class="rent-real" aria-labelledby="hRentReal">${cab(L('Lo que ha rendido tu dinero', 'What your money has earned'))}
      <p>${L(`Para calcularlo hace falta saber cuándo metiste el dinero. Falta en ${yLista(R.sinFecha.map(esc))}: lo tenías antes de apuntarlo en GrowFolio y no sabemos desde cuándo.`, `To work it out we need to know when you put the money in. It's missing for ${yLista(R.sinFecha.map(esc))}: you had it before logging it in GrowFolio and we don't know since when.`)}</p>
      <div class="fila-btns" style="justify-content:flex-start"><button type="button" class="btn peq pri" data-accion="inicio-inv">${L('Decir cuándo empecé a invertir', 'Say when I started investing')}</button></div>
      <p class="nota">${L('O pon en cada una, en Editar, desde cuándo la tienes: es más exacto.', 'Or set, in Edit, since when you have each one: it’s more accurate.')}</p></section>`;
  }
  const b = benchDe(S.bench), bm = benchMismoDinero(R, b.id);
  const desdeTxt = L(`desde el ${fechaLarga(R.desde)}`, `since ${fechaLarga(R.desde)}`);
  const ganTxt = L(`Metiste ${eur(R.metido, 0)}${R.sacado > 0 ? `, sacaste ${eur(R.sacado, 0)}` : ''} y hoy vale ${eur(R.valor, 0)}.`, `You put in ${eur(R.metido, 0)}${R.sacado > 0 ? `, took out ${eur(R.sacado, 0)}` : ''} and today it’s worth ${eur(R.valor, 0)}.`);
  let cifras;
  if (R.corto) {
    cifras = `<div class="rr-cifras">
      <div><span class="k">${L('Has ganado', 'You’ve made')}</span><b class="${cls(R.ganado)}">${eurS(R.ganado, 0)}</b><small>${ganTxt}</small></div>
      <div><span class="k">${L('Al año', 'Per year')}</span><b>—</b><small>${L(`Llevas ${R.dias} días: pasarlo a «al año» engañaría. Sale a partir de mes y medio.`, `It’s been ${R.dias} days: annualising would mislead. It shows after six weeks.`)}</small></div>
    </div>`;
  } else {
    cifras = `<div class="rr-cifras">
      <div><span class="k">${L('Tu dinero, al año', 'Your money, per year')}</span><b class="${cls(R.tir)}">${R.tir == null ? '—' : pctS(R.tir, 1)}</b><small>${L('La TIR: cuenta cuándo metiste y sacaste cada euro. Es la que se compara con un depósito.', 'The IRR: it counts when you put in and took out each euro. Compare it with a deposit.')}</small></div>
      <div><span class="k">${L('La cartera, sin tus aportaciones', 'The portfolio, net of your deposits')}</span><b class="${cls(R.twr && R.twr.total)}">${R.twr ? pctS(R.twr.total, 1) : '—'}</b><small>${R.twr ? (R.twr.anual != null ? L(`${pctS(R.twr.anual, 1)} al año. La TWR: la que se compara con un índice.`, `${pctS(R.twr.anual, 1)} a year. The TWR: compare it with an index.`) : L('La TWR: la que se compara con un índice.', 'The TWR: compare it with an index.')) : L('No hay precios de todo lo que has tenido.', 'There are no prices for everything you’ve held.')}</small></div>
      <div><span class="k">${L('Has ganado', 'You’ve made')}</span><b class="${cls(R.ganado)}">${eurS(R.ganado, 0)}</b><small>${ganTxt}</small></div>
    </div>`;
  }
  let comp;
  if (bm.sinDatos) comp = `<p class="rr-frase">${L(`No hay precios del ${esc(nombreBench(b))} desde el ${fechaLarga(R.desde)}${bm.desdeDatos ? ` (los hay desde el ${fechaLarga(bm.desdeDatos)})` : ''}: elige otro.`, `There are no ${esc(nombreBench(b))} prices since ${fechaLarga(R.desde)}${bm.desdeDatos ? ` (only since ${fechaLarga(bm.desdeDatos)})` : ''}: pick another.`)}</p>`;
  else {
    const dif = R.valor - bm.valor;
    comp = `<p class="rr-frase">${L(`Con el mismo dinero, los mismos días, en el <b>${esc(nombreBench(b))}</b> tendrías hoy <b>${eur(bm.valor, 0)}</b>: ${Math.abs(dif) < 0.5 ? 'lo mismo que tú' : `<b class="${cls(dif)}">${eur(Math.abs(dif), 0)} ${dif > 0 ? 'menos' : 'más'}</b> que tú`}.`, `With the same money, on the same days, in the <b>${esc(nombreBench(b))}</b> you’d have <b>${eur(bm.valor, 0)}</b> today: ${Math.abs(dif) < 0.5 ? 'the same as you' : `<b class="${cls(dif)}">${eur(Math.abs(dif), 0)} ${dif > 0 ? 'less' : 'more'}</b> than you`}.`)}${!R.corto && bm.tir != null && R.tir != null ? L(` Tu dinero, un ${pctS(R.tir, 1)} al año; ahí, un ${pctS(bm.tir, 1)}.`, ` Your money, ${pctS(R.tir, 1)} a year; there, ${pctS(bm.tir, 1)}.`) : ''}</p>
      <p class="nota">${L(`El ${esc(nombreBench(b))} (${esc(b.x)}) ha hecho un ${pctS(bm.total, 1)} ${desdeTxt}${bm.anual != null ? `, un ${pctS(bm.anual, 1)} al año` : ''}${R.twr && !R.corto ? `; tu cartera, un ${pctS(R.twr.total, 1)}` : ''}.`, `The ${esc(nombreBench(b))} (${esc(b.xe)}) did ${pctS(bm.total, 1)} ${desdeTxt}${bm.anual != null ? `, ${pctS(bm.anual, 1)} a year` : ''}${R.twr && !R.corto ? `; your portfolio, ${pctS(R.twr.total, 1)}` : ''}.`)}</p>`;
  }
  const notas = [L('Sin los dividendos que has cobrado (GrowFolio no los apunta uno a uno): si tienes acciones que reparten, lo tuyo es algo más.', 'Without the dividends you’ve received (GrowFolio doesn’t log them one by one): if you hold dividend stocks, yours is a bit higher.')];
  if (R.mezcla) {
    const poco = R.supuestas.filter((x) => x.como === 'poco').sort((a, b) => (a.d < b.d ? -1 : 1)), golpe = R.supuestas.filter((x) => x.como === 'golpe');
    const lista = (xs) => yLista(xs.map((x) => `${esc(x.n)} ${L('desde', 'since')} ${mesAnio(x.d)}`));
    const pocoTxt = !poco.length ? '' : poco.length <= 3 ? lista(poco) : L(`${poco.length} posiciones; la que antes empieza, ${esc(poco[0].n)}, desde ${mesAnio(poco[0].d)}`, `${poco.length} holdings; the earliest, ${esc(poco[0].n)}, since ${mesAnio(poco[0].d)}`);
    notas.push(L(`Lo que ya tenías al apuntarlo en GrowFolio no tiene fechas, así que cuenta como lo que mejor cuadra con tu precio medio${poco.length ? `: comprado poco a poco, lo mismo cada mes (${pocoTxt})` : ''}${golpe.length ? `${poco.length ? ', o' : ':'} de golpe el día que dijiste (${lista(golpe)})` : ''}. Si pones en Editar desde cuándo tienes cada cosa, sale más exacto.`, `What you had before logging it has no dates, so it counts as whatever best fits your average price${poco.length ? `: bought gradually, the same each month (${pocoTxt})` : ''}${golpe.length ? `${poco.length ? ', or' : ':'} all at once on the date you gave (${lista(golpe)})` : ''}. Setting since when you have each one (Edit) makes it more accurate.`));
  }
  notas.push(L('Sin el efectivo: se mide lo invertido.', 'Cash is left out: this measures what’s invested.'));
  return `<section class="rent-real" aria-labelledby="hRentReal">${cab(L('Lo que ha rendido tu dinero', 'What your money has earned'), desdeTxt)}
    ${cifras}
    <div class="rr-comp"><span class="k">${L('Frente a', 'Against')}</span>${chips}${comp}</div>
    <p class="nota">${notas.join(' ')}</p>
  </section>`;
}
