/* =====================================================================
   Impuestos (IRPF de territorio común, residente en España)
   - Ganancias y pérdidas de ventas, dividendos e intereses van a la base del ahorro.
   - Lo vendido se calcula con FIFO (primero salen las acciones más antiguas), como pide Hacienda.
   - Saldos negativos: se compensan entre ganancias y rendimientos hasta el 25 % y el resto en 4 años.
   - Al comprar, algunos países cobran una tasa: España 0,2 % y Francia 0,4 % (empresas de más de
     1.000 M€), Italia 0,1 %, Reino Unido 0,5 %. Los ETF y fondos no la pagan.
   ===================================================================== */
/* Tu comunidad (en tu perfil): cambia la escala del ahorro solo en País Vasco y Navarra, que tienen la suya
   (régimen foral); en las demás es la misma en toda España. Y cambia mucho lo que se paga por una donación de tus
   padres (la entrada de un piso, por ejemplo). Datos de 2026, con la norma de cada una para poder comprobarla. */
const COMUNIDADES = [['andalucia', 'Andalucía'], ['aragon', 'Aragón'], ['asturias', 'Asturias'], ['baleares', 'Illes Balears'], ['canarias', 'Canarias'], ['cantabria', 'Cantabria'], ['clm', 'Castilla-La Mancha'], ['cyl', 'Castilla y León'], ['cataluna', 'Cataluña'], ['ceuta', 'Ceuta'], ['valencia', 'Comunitat Valenciana'], ['extremadura', 'Extremadura'], ['galicia', 'Galicia'], ['madrid', 'Comunidad de Madrid'], ['melilla', 'Melilla'], ['murcia', 'Región de Murcia'], ['navarra', 'Navarra'], ['paisvasco', 'País Vasco'], ['rioja', 'La Rioja']];
const nombreComunidad = (c) => (COMUNIDADES.find(([k]) => k === c) || [])[1] || '';
// para frases: «en la Comunidad de Madrid», «de la Región de Murcia»
const NOMBRE_CCAA_EN = { andalucia: 'Andalusia', aragon: 'Aragon', asturias: 'Asturias', baleares: 'the Balearic Islands', canarias: 'the Canary Islands', cantabria: 'Cantabria', clm: 'Castilla-La Mancha', cyl: 'Castile and León', cataluna: 'Catalonia', ceuta: 'Ceuta', valencia: 'the Valencian Community', extremadura: 'Extremadura', galicia: 'Galicia', madrid: 'the Community of Madrid', melilla: 'Melilla', murcia: 'the Region of Murcia', navarra: 'Navarre', paisvasco: 'the Basque Country', rioja: 'La Rioja' };
const conArticulo = (c) => L(({ madrid: 'la Comunidad de Madrid', valencia: 'la Comunitat Valenciana', murcia: 'la Región de Murcia', baleares: 'Baleares' })[c] || nombreComunidad(c), NOMBRE_CCAA_EN[c] || nombreComunidad(c));
const comunidadUsuario = () => (S.cartera && S.cartera.perfil && S.cartera.perfil.comunidad) || null;
const opcionesComunidad = (sel) => `<option value="">${L('Elige tu comunidad', 'Choose your region')}</option>${COMUNIDADES.map(([k, n]) => `<option value="${k}"${k === sel ? ' selected' : ''} data-no-trad>${esc(n)}</option>`).join('')}`;
const TRAMOS_COMUN = [[6000, 0.19], [50000, 0.21], [200000, 0.23], [300000, 0.27], [Infinity, 0.30]];
const TRAMOS_FORAL = {
  // Álava, Bizkaia y Gipuzkoa, la misma desde 2026 (NF 2/2025 de Bizkaia y las de las otras dos diputaciones)
  paisvasco: [[7500, 0.19], [15000, 0.20], [30000, 0.22], [50000, 0.24], [90000, 0.255], [120000, 0.26], [240000, 0.265], [300000, 0.27], [Infinity, 0.28]],
  // art. 60 del Texto Refundido de la Ley Foral del IRPF (DFL 4/2008)
  navarra: [[6000, 0.20], [10000, 0.22], [15000, 0.24], [200000, 0.26], [300000, 0.27], [Infinity, 0.28]],
};
const tramosAhorro = (c = comunidadUsuario()) => TRAMOS_FORAL[c] || TRAMOS_COMUN;
const pctTramo = (t) => fmtNum(t * 100, Math.round(t * 1000) % 10 ? 1 : 0);
const textoTramos = (c = comunidadUsuario(), en = false) => { const T = tramosAhorro(c); let d = 0; return T.map(([h, t]) => { const x = h === Infinity ? (en ? `${pctTramo(t)} % above ${fmtNum(d, 0)} €` : `${pctTramo(t)} % por encima de ${fmtNum(d, 0)} €`) : (en ? `${pctTramo(t)} % up to ${fmtNum(h, 0)} €` : `${pctTramo(t)} % hasta ${fmtNum(h, 0)} €`); d = h; return x; }).join(', '); };
const tipoMarginal = (base) => { const T = tramosAhorro(); return (T.find(([h]) => base < h) || T[T.length - 1])[1]; };
// donación de dinero de padres a hijos: [lo que se paga, requisitos, norma]
const DONACIONES_EN = {
  andalucia: ['A 99 % rebate on the tax: you pay almost nothing.', 'A public deed and proof of where the money comes from.'],
  aragon: ['Up to 100,000 € is tax-free (once every 5 years), and a 99 % rebate if the taxable base is 500,000 € or less.', 'File on time; property must be in a deed.'],
  asturias: ['A reduced 2 % rate up to 150,000 €.', 'A public deed and prior wealth of up to 402,678 €; otherwise, the general rate.'],
  baleares: ['A 100 % deduction on the tax since July 2025: nothing to pay.', 'A public deed.'],
  canarias: ['A 99.9 % rebate: you pay almost nothing.', 'A public deed.'],
  cantabria: ['A 100 % rebate since 2024: nothing to pay.', 'The formal requirements of the regional law.'],
  clm: ['A 95 % rebate up to 120,000 €, 90 % up to 240,000 € and 85 % above.', 'A public deed, proof of origin and keeping the gift for 5 years.'],
  cyl: ['A 99 % rebate: you pay almost nothing.', 'A public deed and proof of where the money comes from.'],
  cataluna: ['Reduced rates: 5 % up to 200,000 €, 7 % up to 600,000 € and 9 % above.', 'A public deed (or signing one within a month of the handover).'],
  valencia: ['A 100,000 € allowance and a 99 % rebate: you pay almost nothing.', 'A public deed and proof of origin (up to 4,000 € a digitally signed document is enough).'],
  extremadura: ['A 99 % rebate up to a 300,000 € base and 50 % between 300,000 and 600,000 €.', 'A public deed above 10,000 € (adding the previous three years) and proof of origin.'],
  galicia: ['Reduced rates: 5 % up to 200,000 €, 7 % up to 600,000 € and 9 % above.', 'A public deed; without it, the general scale (5 to 18 %).'],
  madrid: ['A 99 % rebate: you pay almost nothing.', 'A public document above 10,000 € (adding the previous three years) and proof of where the money comes from.'],
  murcia: ['A 99 % deduction on the tax: you pay almost nothing.', 'A public deed and proof of where the money comes from.'],
  navarra: ['Its own foral scale: between parents and children, 0.8 % to 8 %.', 'No deed requirement for the reduced rate.'],
  paisvasco: ['A 1.5 % rate between parents and children, in all three provinces.', 'No deed requirement for the reduced rate.'],
  rioja: ['A 99 % deduction on the tax, with no limit: you pay almost nothing.', 'A notarial document.'],
};
const DONACIONES = {
  andalucia: ['Bonificación del 99 % de la cuota: casi no se paga.', 'Escritura pública y que conste de dónde sale el dinero.', 'Ley 5/2021, art. 33 ter'],
  aragon: ['Hasta 100.000 € no se paga (una vez cada 5 años), y bonificación del 99 % si la base no pasa de 500.000 €.', 'Presentarla a tiempo; los inmuebles, en escritura.', 'DLeg 1/2005, arts. 132-2 y 132-6'],
  asturias: ['Tipo reducido del 2 % hasta 150.000 €.', 'Escritura pública y un patrimonio previo de hasta 402.678 €; si no, tarifa general.', 'DLeg 2/2014, art. 21.3'],
  baleares: ['Deducción del 100 % de la cuota desde julio de 2025: no se paga.', 'Escritura pública.', 'Ley 6/2025'],
  canarias: ['Bonificación del 99,9 %: casi no se paga.', 'Escritura pública.', 'DL 5/2023, art. 26 sexies'],
  cantabria: ['Bonificación del 100 % desde 2024: no se paga.', 'Los requisitos formales de la norma autonómica.', 'Ley de Cantabria 3/2023'],
  clm: ['Bonificación del 95 % hasta 120.000 €, del 90 % hasta 240.000 € y del 85 % por encima.', 'Escritura pública, origen del dinero y mantener lo donado 5 años.', 'Ley 8/2013, art. 17 bis'],
  cyl: ['Bonificación del 99 %: casi no se paga.', 'Escritura pública y origen del dinero.', 'Ley 3/2021'],
  cataluna: ['Tipos reducidos: 5 % hasta 200.000 €, 7 % hasta 600.000 € y 9 % por encima.', 'Escritura pública (o hacerla en el mes siguiente a la entrega).', 'Código Tributario de Cataluña, libro sexto (DLeg 1/2024)'],
  valencia: ['Reducción de 100.000 € y bonificación del 99 %: casi no se paga.', 'Escritura pública y origen del dinero (hasta 4.000 € basta un documento con firma digital).', 'Ley 13/1997, arts. 10 bis y 12 bis'],
  extremadura: ['Bonificación del 99 % hasta 300.000 € de base y del 50 % entre 300.000 y 600.000 €.', 'Escritura pública si pasa de 10.000 € (sumando los tres años anteriores) y origen del dinero.', 'Ley 5/2022'],
  galicia: ['Tipos reducidos: 5 % hasta 200.000 €, 7 % hasta 600.000 € y 9 % por encima.', 'Escritura pública; sin ella, tarifa general (del 5 al 18 %).', 'DLeg 1/2011, art. 9'],
  madrid: ['Bonificación del 99 %: casi no se paga.', 'Documento público si pasa de 10.000 € (sumando los tres años anteriores) y que conste de dónde sale el dinero.', 'DLeg 1/2010, arts. 22 bis y 25'],
  murcia: ['Deducción del 99 % de la cuota: casi no se paga.', 'Escritura pública y origen del dinero.', 'DLeg 1/2010 de Murcia, art. 4'],
  navarra: ['Tarifa foral propia: entre padres e hijos, del 0,8 % al 8 %.', 'Sin requisitos de escritura para la rebaja.', 'DFL 250/2002, art. 34'],
  paisvasco: ['Tipo del 1,5 % entre padres e hijos, en las tres diputaciones.', 'Sin requisitos de escritura para la rebaja.', 'NF 4/2015 (Bizkaia), NF 2/2022 (Gipuzkoa), NF 11/2005 (Álava)'],
  rioja: ['Deducción del 99 % de la cuota, sin límite: casi no se paga.', 'Documento notarial.', 'Ley 2/2024'],
};
const TASA_COMPRA = { ES: [0.002, 'impuesto sobre transacciones financieras español'], FR: [0.004, 'tasa francesa sobre transacciones financieras'], IT: [0.001, 'tasa italiana sobre transacciones financieras'], GB: [0.005, 'impuesto de timbre británico'] };
const SUFIJO_PAIS = { MC: 'ES', PA: 'FR', MI: 'IT', L: 'GB' };
function tasaRadar(x) {
  const pais = PAIS_DE_NOMBRE[x.pais], suf = String(x.s || '').split('.')[1];
  return SUFIJO_PAIS[suf] && SUFIJO_PAIS[suf] === pais ? tasaCompra(pais, 'Acción', x.cap) : null;
}
function tasaCompra(pais, tipo, capital) {
  if (tipo && tipo !== 'Acción') return null;
  const t = TASA_COMPRA[pais];
  if (!t) return null;
  if (pais !== 'GB' && pais !== 'IT' && capital != null && capital < 1e9) return null;
  return { tipo: t[0], nombre: t[1] };
}

/* Retención de los dividendos en el país de la sede de la empresa (tipo general para un particular
   residente en España, con el formulario que gestiona el bróker cuando hace falta). En la renta se
   recupera con la deducción por doble imposición hasta el tipo del convenio, casi siempre el 15 %:
   lo que pase de ahí se pierde salvo que se reclame a ese país. Orientativo. */
const RET_DIV = { ES: 19, US: 15, GB: 0, JE: 0, IM: 0, BM: 0, KY: 0, HK: 0, SG: 0, NL: 15, LU: 15, FR: 12.8, DE: 26.375, IT: 26, CH: 35, DK: 27, SE: 30, FI: 35, NO: 25, BE: 30, PT: 25, AT: 27.5, IE: 25, CA: 25, JP: 15.315, AU: 30, GR: 5, IL: 25, MX: 10, BR: 0, IN: 20, ZA: 20, CY: 0, TW: 21, KR: 22, CN: 10 };
function fiscalidadSede(cod, tipo = 'Acción') {
  const nombre = (cod && PAISES[cod]) || 'su país';
  if (tipo && /^Fondo/.test(tipo)) return { ret: 0, pierde: 0, txt: 'Fondos de acumulación: no reparten; pagas solo al vender (y entre fondos, ni eso, con un traspaso).' };
  if (tipo === 'ETF') return { ret: 0, pierde: 0, txt: 'ETF: si es de acumulación no reparte y pagas solo al vender (los traspasos sin impuestos no valen para los ETF). Si reparte, el dividendo tributa en tu renta.' };
  if (tipo === 'ETC') return { ret: 0, pierde: 0, rcm: true, txt: 'ETC: no reparte nada; pagas solo al vender. Como es un título de deuda, lo que ganes o pierdas cuenta como rendimiento del capital mobiliario, no como la venta de una acción (consulta de Tributos V0267-25, sobre un ETC de petróleo); con un bróker español puede llevar una retención del 19 % de la ganancia.' };
  if (tipo && tipo !== 'Acción') return { ret: 0, pierde: 0, txt: 'No reparte nada: pagas solo al vender.' };
  const ret = cod ? RET_DIV[cod] : null;
  if (ret == null) return { ret: null, pierde: 0, txt: `Dividendos: ${nombre} aplica su propia retención; mira el informe de tu bróker.` };
  if (cod === 'ES') return { ret, pierde: 0, txt: 'Dividendos: llegan con el 19 % retenido; en la renta se ajusta a tu tramo.' };
  if (ret === 0) return { ret, pierde: 0, txt: `Dividendos: ${nombre} no retiene nada; tributan en tu renta como los españoles.` };
  const CDI_DIV = { IE: 0, JP: 5 }; // tipo del convenio cuando no es el 15 %
  const tope = CDI_DIV[cod] ?? 15, pierde = Math.max(0, ret - tope);
  if (!pierde) return { ret, pierde: 0, txt: `Dividendos: ${nombre} retiene un ${fmtNumR(ret)} % y lo recuperas entero en la renta.` };
  if (tope === 0) return { ret, pierde, txt: `Dividendos: ${nombre} retiene un ${fmtNumR(ret)} % y en España no se deduce nada (por el convenio, allí estarían exentos): se evita con un formulario en tu bróker o se reclama a ${nombre}.` };
  return { ret, pierde, txt: `Dividendos: ${nombre} retiene un ${fmtNumR(ret)} % y en la renta solo recuperas el ${tope} %: pierdes un ${fmtNumR(pierde)} % de cada dividendo (se puede reclamar a ${nombre}, con papeleo).` };
}
const tramoAhorro = () => { try { return fiscalAnio(new Date().getFullYear()).marginal; } catch (e) { return 0.19; } };

/* ---------- plazo: no es lo mismo ganar un 50 % en 3 meses que en 3 años ----------
   Se compara todo en "al año": (1 + lo que ganas)^(12 / meses) - 1. Neto: con la tasa de compra, la
   retención de los dividendos que no se recupera y tu tramo del ahorro al vender. */
const anualizar = (pct, meses) => (meses > 0 && pct > -100 ? (Math.pow(1 + pct / 100, 12 / meses) - 1) * 100 : null);
const bolsaAnual = () => { try { return cfgProy().bolsa; } catch (e) { return 7; } };
function rentaEsperada(x, subida, meses, fuente) {
  if (subida == null || !(meses > 0)) return null;
  const t = tramoAhorro();
  const o = origenRadar(x);
  const fis = fiscalidadSede(o.sede);
  const tasa = tasaRadar(x);
  const divP = ((x.div || 0) * meses) / 12;
  const ganP = subida > 0 ? subida * (1 - t) : subida;
  const netoP = ganP + divP * (1 - t - fis.pierde / 100) - (tasa ? tasa.tipo * 100 : 0);
  // un subidón en un mes no se puede repetir cada mes: para pasarlo a "al año" se cuentan al menos 3 meses
  const mA = Math.max(meses, 3);
  return { subida, meses, fuente, divP, netoP, netoAnual: anualizar(netoP, mA), brutoAnual: anualizar(subida + divP, mA), t, fis, tasa };
}
const plazoTxt = (m) => (m == null ? '' : m < 1.5 ? L('un mes', 'a month') : m < 12 ? L(`${Math.round(m)} meses`, `${Math.round(m)} months`) : m === 12 ? L('12 meses', '12 months') : m % 12 === 0 ? L(`${m / 12} años`, `${m / 12} years`) : L(`${fmtNum(m / 12, 1)} años`, `${fmtNum(m / 12, 1)} years`));
/* cuánto llevas ganando al año en una posición: con la fecha de cada compra (o "desde cuándo la tienes") */
function tiempoPos(f) {
  const pos = f.pos;
  let lotes; try { lotes = lotesDe(pos); } catch (e) { return null; }
  const ahora = Date.now();
  let c = 0, cd = 0;
  for (const l of lotes) {
    const d = l.mezcla ? pos.desde || (pos.entrada && pos.entrada.fecha && pos.entrada.fecha < (pos.fecha || hoyIso()) ? pos.entrada.fecha : null) : l.f;
    if (!d) return null;
    const dias = Math.max(1, (ahora - deIso(d)) / 864e5);
    c += l.c; cd += l.c * dias;
  }
  if (!c || !(f.coste > 0) || !(f.valor > 0)) return null;
  const dias = cd / c;
  if (dias < 45) return null;
  return { dias, anual: (Math.pow(f.valor / f.coste, 365 / dias) - 1) * 100 };
}
const duracion = (dias) => (dias < 75 ? `${Math.round(dias)} días` : dias < 548 ? `${Math.round(dias / 30.4)} meses` : `${fmtNum(dias / 365, 1)} años`);

function datosFiscales(anio) { return ((S.cartera.fiscal || {})[anio]) || {}; }
/* la renta que toca mirar: de enero a junio, la del año pasado (la que se presenta); después, la del año en curso */
const anioRenta = () => { const h = new Date(); return h.getMonth() < 6 ? h.getFullYear() - 1 : h.getFullYear(); };
/* la regla de recompra de Hacienda (dos meses en lo que cotiza en la UE, un año en fondos y en lo de fuera, nada en cripto): una venta con
   pérdidas con una compra del mismo valor en ese plazo, antes o después (también una aportación automática), no
   resta este año. Devuelve la primera compra que la bloquea, o null si la pérdida cuenta */
function perdidaAplazada(v) {
  // 0.3.9: se aplaza solo la parte de la pérdida que corresponde a lo recomprado (en el plazo, antes o después) que
  // sigue en tu cartera; lo que salió en esa misma venta ya no está (art. 33.5 LIRPF; DGT V0248-18)
  if (!v || !(v.resultado < 0) || !(+v.uds > 0)) return null;
  const r = reglaRecompra(S.inst[v.instrumento]);
  if (!r || !r.meses) return null;
  const desde = sumarMeses(v.fecha, -r.meses), hasta = sumarMeses(v.fecha, r.meses);
  const lotes = (S.cartera.posiciones || []).filter((p) => p.instrumento === v.instrumento).flatMap((p) => { try { return lotesDe(p); } catch (e) { return []; } });
  const dentro = lotes.filter((l) => !l.mezcla && l.f >= desde && l.f <= hasta);
  const parte = Math.min(1, sum(dentro, (l) => +l.u || 0) / +v.uds);
  if (!(parte > 1e-6)) return null;
  const primero = dentro.map((l) => l.f).sort()[0];
  const aporte = (S.cartera.aportaciones || []).some((a) => a.instrumento === v.instrumento) && !(S.cartera.movimientos || []).some((m) => m.tipo === 'compra' && m.instrumento === v.instrumento && m.fecha === primero);
  return { fecha: primero, r, parte, importe: v.resultado * parte, aporte };
}
/* Los ETC (y los ETN, que Toisón guarda como ETC) no son fondos ni acciones: se emiten como títulos de deuda. Según la
   DGT (consulta vinculante V0267-25, de 13 de marzo de 2025, sobre un ETC ligado al petróleo), lo que se gana o se
   pierde al venderlos es rendimiento del capital mobiliario (art. 25.2.b LIRPF), no ganancia patrimonial. En la base
   del ahorro van con los dividendos y los intereses (con las ganancias solo se cruzan hasta el 25 %), la recompra es
   de dos meses coticen donde coticen (último párrafo del 25.2.b) y, con un intermediario español, llevan retención. */
function esRCMVenta(inst) { return !!inst && inst.tipo === 'ETC'; }
/* extra: una ganancia o pérdida patrimonial más (una venta que se está mirando); extraRCM: lo mismo si es de un ETC */
function fiscalAnio(anio, extra = 0, extraRCM = 0) {
  const d = datosFiscales(anio);
  const ventas = (S.cartera.movimientos || []).filter((m) => m.tipo === 'venta' && String(m.fecha).startsWith(String(anio)));
  // las pérdidas bloqueadas por una recompra no restan este año (se aplazan hasta vender lo recomprado)
  const neto = (m) => { const a = perdidaAplazada(m); return (m.resultado || 0) - (a ? a.importe : 0); };
  const deRCM = (m) => esRCMVenta(S.inst[m.instrumento]);
  const gpWeb = sum(ventas.filter((m) => !deRCM(m)), neto);
  // las ventas de ETC no son ganancias: van con los rendimientos (rcm sigue siendo lo apuntado: dividendos e intereses)
  const nRCM = ventas.filter(deRCM).length, rcmVentas = sum(ventas.filter(deRCM), neto);
  const otras = +d.otras || 0;
  const gp = gpWeb + otras + extra;
  const rcm = +d.rcm || 0, rcmT = rcm + rcmVentas + extraRCM;
  const pendientes = Math.max(0, +d.pendientes || 0);
  // los saldos negativos de rendimientos del capital de años anteriores (ventas de ETC con pérdidas) van aparte:
  // compensan primero rendimientos y, lo que sobre, ganancias hasta el 25 % (art. 49.1 LIRPF; ayuda de Renta, 8.1.4)
  const pendientesRcm = Math.max(0, +d.pendientesRcm || 0);
  // 0.3.9: el 25 % se calcula sobre el saldo positivo antes de compensar y es un tope conjunto con las pérdidas de años
  // anteriores (Manual AEAT 8.1.4); en Álava, Bizkaia y Gipuzkoa no hay compensación cruzada en la base del ahorro
  const cruza = comunidadUsuario() !== 'paisvasco';
  let bGP = gp, bRCM = rcmT, cruzado = 0;
  const topeGP = cruza ? 0.25 * Math.max(0, rcmT) : 0, topeRCM = cruza ? 0.25 * Math.max(0, gp) : 0;
  if (bGP < 0 && bRCM > 0) { cruzado = Math.min(-bGP, topeGP); bGP += cruzado; bRCM -= cruzado; }
  else if (bRCM < 0 && bGP > 0) { cruzado = Math.min(-bRCM, topeRCM); bRCM += cruzado; bGP -= cruzado; }
  let usadas = 0, usadasRcm = 0;
  if (pendientes > 0 && bGP > 0) { usadas = Math.min(bGP, pendientes); bGP -= usadas; }
  if (pendientesRcm > 0 && bRCM > 0) { usadasRcm = Math.min(bRCM, pendientesRcm); bRCM -= usadasRcm; }
  const quedaTope = Math.max(0, topeGP - (gp < 0 ? cruzado : 0));
  if (pendientes - usadas > 0 && bRCM > 0 && quedaTope > 0) { const u2 = Math.min(quedaTope, bRCM, pendientes - usadas); bRCM -= u2; usadas += u2; }
  const quedaTopeR = Math.max(0, topeRCM - (rcmT < 0 ? cruzado : 0));
  if (pendientesRcm - usadasRcm > 0 && bGP > 0 && quedaTopeR > 0) { const u3 = Math.min(quedaTopeR, bGP, pendientesRcm - usadasRcm); bGP -= u3; usadasRcm += u3; }
  const base = Math.max(0, bGP) + Math.max(0, bRCM);
  // los rendimientos negativos que sobran también se guardan 4 años (art. 49.1.a LIRPF), pero en su propio saldo: al año
  // siguiente compensan primero rendimientos y solo hasta el 25 % de las ganancias. Por eso no se suman a «sobra»
  const sobraRCM = (bRCM < 0 ? -bRCM : 0) + (pendientesRcm - usadasRcm);
  return { anio, ventas, gpWeb, otras, gp, rcm, rcmVentas, nRCM, rcmT, pendientes, usadas, pendientesRcm, usadasRcm, cruzado, base, cuota: irpfAhorro(base), marginal: tipoMarginal(base), sobra: (bGP < 0 ? -bGP : 0) + (pendientes - usadas), sobraRCM, retenido: (+d.retenido || 0) + (+d.hzRetEtc || 0) };
}
/* lo que añade una venta concreta a la factura de este año (con todo lo demás que ya llevas) */
function impuestoDeVenta(ganancia, anio = new Date().getFullYear(), inst = null) {
  const a = fiscalAnio(anio), b = esRCMVenta(inst) ? fiscalAnio(anio, 0, ganancia) : fiscalAnio(anio, ganancia);
  return { impuesto: b.cuota - a.cuota, antes: a, despues: b };
}
/* lo mismo con varias a la vez, cada una con su instrumento: [{ g, inst }] */
function impuestoDeVentas(lista, anio = new Date().getFullYear()) {
  const r = sum(lista.filter((x) => esRCMVenta(x.inst)), (x) => x.g), g = sum(lista, (x) => x.g) - r;
  const a = fiscalAnio(anio), b = fiscalAnio(anio, g, r);
  return { impuesto: b.cuota - a.cuota, antes: a, despues: b };
}

/* Lotes de compra de una posición: los guardados, o uno de partida con lo que tenías al empezar a
   usar la web, más cada aportación automática ya sumada (fecha, unidades y coste de cada una). */
function lotesDe(pos) {
  const f = calcularPos(pos, hoyIso());
  const apo = f.aportes.filter((a) => a.precio).map((a) => ({ f: a.f, u: a.importe / a.precio, c: a.importe }));
  let base;
  if (pos.lotes && pos.lotes.length) base = pos.lotes.map((l) => ({ ...l }));
  else {
    const u = (f.uds ?? 0) - sum(apo, (a) => a.u);
    base = u > 1e-9 ? [{ f: pos.fecha || hoyIso(), u, c: +pos.coste || 0, mezcla: true }] : [];
  }
  return [...base, ...apo].sort((a, b) => (a.f < b.f ? -1 : a.f > b.f ? 1 : 0));
}
function fifo(lotes, uds) {
  let resto = uds, coste = 0, mezcla = false;
  const usados = [], quedan = [];
  for (const l of lotes) {
    if (resto <= 1e-9) { quedan.push({ ...l }); continue; }
    const u = Math.min(resto, l.u), c = l.c * (u / l.u);
    usados.push({ f: l.f, u, c }); coste += c; resto -= u; mezcla = mezcla || !!l.mezcla;
    if (l.u - u > 1e-9) quedan.push({ ...l, u: l.u - u, c: l.c - c });
  }
  return { coste, usados, quedan, falta: resto > 1e-6 ? resto : 0, mezcla };
}

function editarFiscal(anio = new Date().getFullYear()) {
  const d = datosFiscales(anio);
  const h = hoja(`Datos fiscales de ${anio}`, `<form id="fFis" novalidate>
    <p class="nota" style="margin:0">Lo que Toisón no puede saber solo. Con esto calcula lo que pagarías en la renta de ${anio}, que se presenta entre abril y junio de ${anio + 1}.</p>
    <div class="form-grid">
      <label class="campo">Resultado de ventas no apuntadas (€)<input name="otras" inputmode="decimal" value="${val(d.otras)}" placeholder="0"><small>Ganancia o pérdida neta de lo que vendiste este año sin apuntarlo en Toisón. Las pérdidas, en negativo.</small></label>
      <label class="campo">Dividendos e intereses cobrados (€)<input name="rcm" inputmode="decimal" value="${val(d.rcm)}" placeholder="0"><small>En bruto, antes de retenciones. Incluye los intereses del efectivo remunerado de tus plataformas.</small></label>
      <label class="campo">De ellos, intereses (€)<input name="intereses" inputmode="decimal" value="${val(d.intereses)}" placeholder="0"><small>Lo que te ha pagado el efectivo, en bruto. Van en otra casilla que los dividendos (0027 y 0029); si lo dejas en blanco, Tu renta los enseña juntos.</small></label>
      <label class="campo">Retenciones que ya te han hecho (€)<input name="retenido" inputmode="decimal" value="${val(d.retenido)}" placeholder="0"><small>Sin la de la venta de un ETC, que se pregunta en Tu renta. Las españolas, enteras: se restan de lo que pagas. De lo que te retuvieron fuera, pon como mucho el 15 % de esos dividendos (lo que pasa de ahí no se recupera en la renta).</small></label>
      <label class="campo">Pérdidas de años anteriores sin compensar (€)<input name="pendientes" inputmode="decimal" value="${val(d.pendientes)}" placeholder="0"><small>Las que te queden de los últimos 4 años, en positivo (vienen en tu declaración anterior).</small></label>
      <label class="campo">Rendimientos negativos de años anteriores sin compensar (€)<input name="pendientesRcm" inputmode="decimal" value="${val(d.pendientesRcm)}" placeholder="0"><small>Solo si te quedan saldos negativos de rendimientos del capital (por ejemplo, de vender un ETC con pérdidas), en positivo. Van aparte de las pérdidas de acciones y fondos.</small></label>
    </div>
    <div class="error" id="errFis"></div>
    <div class="fila-btns"><button type="button" class="btn" data-cerrar>Cancelar</button><button type="submit" class="btn pri">Guardar</button></div></form>`);
  $('#fFis', h.el).onsubmit = async (ev) => {
    ev.preventDefault();
    const o = {};
    for (const k of ['otras', 'rcm', 'intereses', 'retenido', 'pendientes', 'pendientesRcm']) {
      const n = numero(ev.target[k].value);
      if (Number.isNaN(n)) { $('#errFis', h.el).textContent = 'Algún importe no es un número.'; return; }
      if (n != null) o[k] = n;
    }
    if (o.intereses != null && o.intereses > (o.rcm || 0) + 0.005) { $('#errFis', h.el).textContent = 'Los intereses no pueden pasar de lo que pones en dividendos e intereses: van dentro.'; return; }
    // lo que guarda Tu renta en el mismo año (las respuestas y las marcas de la hoja) no se pierde al guardar el formulario
    const ant = datosFiscales(anio);
    for (const k of Object.keys(ant)) if (k.startsWith('hz')) o[k] = ant[k];
    S.cartera.fiscal = { ...(S.cartera.fiscal || {}), [anio]: o };
    await guardarYPintar('Datos fiscales', h);
  };
}

/* las posiciones en pérdidas (más de 50 €) que se podrían vender para compensar; si GrowFolio ya propone vender una
   parte, solo cuenta lo que quedaría (resto: true) */
function restoEnPerdidas(M, planes) {
  const conAporte = new Set(aportacionesActivas().map(({ a }) => a.instrumento));
  return M.filas.filter((f) => !conAporte.has(f.inst.id)).map((f) => {
    const g = f.valor - f.coste, pl = (planes || []).find((x) => x.f && x.f.pos && x.f.pos.id === f.pos.id);
    if (!pl) return { f, g };
    const queda = f.uds ? Math.max(0, +pl.queda || 0) / f.uds : 0;
    return { f, g: g * queda, resto: true };
  }).filter((x) => x.g < -50);
}
/* Fiscalidad > En tu comunidad: la escala que te toca, lo que se paga si tus padres te dan dinero y las noticias de
   tu comunidad que tocan tu bolsillo (impuestos, ayudas, vivienda). Sin comunidad, un selector para ponerla. */
const RE_DINERO_CCAA = /impuest|IRPF|tribut|deducci|bonific|rebaja fiscal|rebaja de impuestos|ayudas?\b|subvenci|cheque|\bbono\b|hipotec|avales?\b|sucesiones|donaci|declaraci[oó]n de la renta/i;
const RE_FUERA_CCAA = /acampada|manifestaci|protesta|despacho|pol[eé]mic|oposici[oó]n|\bPSOE\b|\bPP\b|\bVox\b|Podemos|Sumar|juicio|imputad|tribunal|elecciones|encuesta|Asamblea/i;
function noticiasComunidad(c = comunidadUsuario(), max = 3, dias = 10) {
  const R = (S.precios && S.precios.noticias && S.precios.noticias._region) || {}, lim = Date.now() - dias * 864e5;
  return (R[c] || []).filter((n) => n.t && n.u && (!n.d || new Date(n.d).getTime() >= lim) && RE_DINERO_CCAA.test(n.t) && !RE_FUERA_CCAA.test(n.t)).slice(0, max);
}
async function ponerComunidad(c) {
  if (!S.cartera) return;
  S.cartera.perfil = { ...(S.cartera.perfil || {}), comunidad: c || null, actualizado: new Date().toISOString() };
  AS.foto = null;
  await guardarYPintar('Tu comunidad');
  if (c) toast(`Apuntado: ${nombreComunidad(c)}. Hacienda y la IA ya cuentan con ello.`, 3500);
}
function cambiarComunidad() {
  const h = hoja('Tu comunidad', `<form class="pf-form"><label class="campo">Dónde vives<select name="c">${opcionesComunidad(comunidadUsuario())}</select><small>Para tus impuestos y las noticias de tu comunidad que tocan tu dinero. No usa tu ubicación.</small></label>
    <div class="fila-btns"><button type="button" class="btn" data-cerrar>Cancelar</button><button type="submit" class="btn pri">Guardar</button></div></form>`);
  $('form', h.el).onsubmit = async (e) => { e.preventDefault(); h.cerrar(true); await ponerComunidad(e.target.c.value); };
}
document.addEventListener('change', (e) => { const sel = e.target.closest('[data-ccaa]'); if (sel && sel.value) ponerComunidad(sel.value); });
function vistaFiscal(M) {
  const t = S.fisTab === 'tu' ? 'tu' : 'renta';
  return `<div class="vista-cab"><h1>Hacienda</h1><p>${esPublico() ? 'Tu renta casilla a casilla, lo que pagarás y cómo tributa cada cosa.' : 'Tu renta casilla a casilla, lo que pagarás, lo que costaría cada paso de tu plan y cómo tributa cada cosa.'}</p></div>
  <div class="subvistas dos-op" id="fisTabs" role="group" aria-label="Qué ver"><button data-fis="renta" aria-pressed="${t === 'renta'}">${ICONOS.fiscal}Tu renta ${anioRenta()}</button><button data-fis="tu" aria-pressed="${t === 'tu'}">${ICONOS.calc}Cómo tributa</button></div>
  <div class="panel-hz" id="panelHz" data-hz-pag="${t}" aria-busy="true"><div class="pav-esq" role="status" aria-label="${t === 'tu' ? 'Preparando lo que pagas…' : 'Preparando tu renta…'}"><i></i><i></i><i></i></div></div>`;
}
